// LOCAL-LLM: DO NOT EDIT
//
// Idempotent Order persistence from a Stripe Checkout Session. Called by
// /cart/success on redirect (TASK-028) and by the Stripe webhook
// /api/webhooks/stripe (TASK-029). Whichever fires first wins; the other
// no-ops via the stripePaymentIntentId idempotency check.
//
// This function NEVER throws to the caller — it returns a discriminated
// result object instead. The webhook needs to always return 200 to Stripe
// even when persistence fails, to avoid retry storms on permanent errors;
// the /cart/success page needs to render confirmation regardless.

import type Stripe from "stripe";
import { getPayload } from "payload";

import config from "@payload-config";

import { sendOrderConfirmation } from "@/lib/email/send-order-confirmation";

export type PersistStripeOrderResult =
  | { created: true; orderId: number | string }
  | { created: false; orderId: number | string; reason: "already_exists" }
  | {
      created: false;
      reason:
        | "missing_payment_intent"
        | "missing_snapshot"
        | "missing_address"
        | "payload_error";
    };

type ProductSnapshot = {
  productId: number;
  name: string;
  quantity: number;
  priceCents: number;
};

type CompactProductSnapshot = {
  p: number;
  n: string;
  q: number;
  c: number;
};

// Derive the Stripe PaymentIntent id from a session. The payment_intent
// field is either a string id or an expanded object, depending on how the
// session was retrieved. Handle both shapes defensively.
function getPaymentIntentId(
  session: Stripe.Checkout.Session
): string | null {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

// Map the Stripe shipping address to the Order schema's address group.
// Stripe SDK v22+ moved shipping_details under collected_information
// (was top-level on the Session before).
function mapShippingAddress(
  session: Stripe.Checkout.Session
): {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
} | null {
  const details = session.collected_information?.shipping_details;
  if (!details?.address) return null;
  return {
    recipientName: details.name ?? "",
    line1: details.address.line1 ?? "",
    line2: details.address.line2 ?? undefined,
    city: details.address.city ?? "",
    region: details.address.state ?? "",
    postalCode: details.address.postal_code ?? "",
    country: details.address.country ?? "US",
    phone: session.customer_details?.phone ?? undefined,
  };
}

function isCompactSnapshot(value: unknown): value is CompactProductSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.p === "number" &&
    typeof v.n === "string" &&
    typeof v.q === "number" &&
    typeof v.c === "number"
  );
}

function isLegacySnapshot(value: unknown): value is ProductSnapshot {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.productId === "number" &&
    typeof v.name === "string" &&
    typeof v.quantity === "number" &&
    typeof v.priceCents === "number"
  );
}

function parseSnapshot(session: Stripe.Checkout.Session): ProductSnapshot[] {
  try {
    const parsed = JSON.parse(session.metadata?.productSnapshot ?? "[]") as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): ProductSnapshot[] => {
      if (isCompactSnapshot(item)) {
        return [
          {
            productId: item.p,
            name: item.n,
            quantity: item.q,
            priceCents: item.c,
          },
        ];
      }
      if (isLegacySnapshot(item)) return [item];
      return [];
    });
  } catch {
    return [];
  }
}

export async function persistStripeOrder(
  session: Stripe.Checkout.Session
): Promise<PersistStripeOrderResult> {
  const paymentIntentId = getPaymentIntentId(session);
  if (!paymentIntentId) {
    return { created: false, reason: "missing_payment_intent" };
  }

  const payload = await getPayload({ config });

  // Idempotency: if an Order with this PaymentIntent already exists, skip.
  // Handles refresh on /cart/success AND races between the success-page
  // server render and the webhook handler.
  const existing = await payload.find({
    collection: "orders",
    where: { stripePaymentIntentId: { equals: paymentIntentId } },
    limit: 1,
  });

  if (existing.docs.length > 0) {
    return {
      created: false,
      orderId: existing.docs[0].id,
      reason: "already_exists",
    };
  }

  const snapshot = parseSnapshot(session);
  if (snapshot.length === 0) {
    return { created: false, reason: "missing_snapshot" };
  }

  const shippingAddress = mapShippingAddress(session);
  if (!shippingAddress) {
    return { created: false, reason: "missing_address" };
  }

  const subtotalCents = snapshot.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );
  const totalCents = session.amount_total ?? subtotalCents;

  // If a Customer record exists matching the Stripe-collected email,
  // link the Order to that Customer so it shows up in /account/orders
  // when they sign in. Guest checkouts (no matching Customer) get
  // customer: undefined and the email is preserved in guestEmail.
  const checkoutEmail = session.customer_details?.email ?? undefined;
  let linkedCustomerId: number | undefined;
  if (checkoutEmail) {
    const customerResult = await payload.find({
      collection: "customers",
      where: {
        and: [
          { email: { equals: checkoutEmail } },
          { emailVerifiedAt: { exists: true } },
        ],
      },
      limit: 1,
      depth: 0,
    });
    if (customerResult.docs.length > 0) {
      // Payload's generated types declare id as `number | string` to
      // cover both Postgres-int and Mongo-objectid backends. We're on
      // Postgres, so it's always a number — narrow defensively.
      const id = customerResult.docs[0].id;
      if (typeof id === "number") {
        linkedCustomerId = id;
      }
    }
  }

  try {
    const order = await payload.create({
      collection: "orders",
      data: {
        status: "paid",
        fulfillmentStatus: "unfulfilled",
        customer: linkedCustomerId,
        guestEmail: checkoutEmail,
        lineItems: snapshot.map((item) => ({
          product: item.productId,
          nameSnapshot: item.name,
          quantity: item.quantity,
          priceAtPurchase: item.priceCents,
        })),
        subtotal: subtotalCents,
        tax: 0,
        shipping: 0,
        giftCardDiscount: 0,
        total: totalCents,
        shippingAddress,
        billingAddress: shippingAddress,
        stripePaymentIntentId: paymentIntentId,
      },
    });

    // Fire the confirmation email. sendOrderConfirmation never throws —
    // if Resend errors, it logs and returns a structured result. We do
    // not block order creation success on email delivery.
    const customerEmail = session.customer_details?.email;
    if (customerEmail) {
      await sendOrderConfirmation({
        orderId: order.id,
        customerEmail,
        customerName: shippingAddress.recipientName || undefined,
        lineItems: snapshot.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          priceCents: item.priceCents,
        })),
        subtotalCents,
        totalCents,
        shippingAddress,
      });
    }

    return { created: true, orderId: order.id };
  } catch (err) {
    console.error(
      "[persistStripeOrder] payload.create failed",
      { sessionId: session.id, paymentIntentId },
      err
    );
    return { created: false, reason: "payload_error" };
  }
}
