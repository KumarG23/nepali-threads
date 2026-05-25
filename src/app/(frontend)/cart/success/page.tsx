import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import type Stripe from "stripe";

import config from "@payload-config";

import { formatPriceCents } from "@/lib/format";
import { stripe } from "@/lib/stripe/client";

import { ClearCart } from "./_clear-cart";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order confirmed",
};

type ProductSnapshot = {
  productId: number;
  name: string;
  quantity: number;
  priceCents: number;
};

// Helper: derive the Stripe PaymentIntent id from a session. The
// payment_intent field is either a string ID or an expanded object,
// depending on how the session was retrieved. We expand it on
// retrieval, but handle both shapes defensively.
function getPaymentIntentId(
  session: Stripe.Checkout.Session
): string | null {
  if (!session.payment_intent) return null;
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent.id;
}

// Helper: map a Stripe address to the Order schema's address group.
// Returns null if Stripe didn't collect the address (e.g. customer
// canceled before completing).
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
  // Stripe SDK v22+ moved shipping_details under collected_information
  // (was top-level on the Session before).
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

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  if (!session_id) notFound();

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ["line_items", "payment_intent"],
    });
  } catch {
    notFound();
  }

  // Defensive: if Stripe says the payment didn't complete (async
  // payment, declined card after the redirect, etc.), don't create
  // an Order — render a "payment incomplete" view instead.
  if (session.payment_status !== "paid") {
    return (
      <article className="mx-auto max-w-2xl px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
        <h1 className="font-serif text-display text-neutral-ink mb-4">
          Payment didn&apos;t complete.
        </h1>
        <p className="font-sans text-body text-neutral-ink/70 mb-8">
          Something went wrong with the payment. Your cart is still here —
          head back and try again.
        </p>
        <Link
          href="/cart"
          className="inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]"
        >
          Back to cart
        </Link>
      </article>
    );
  }

  const paymentIntentId = getPaymentIntentId(session);
  const payload = await getPayload({ config });

  // Idempotency: if an Order with this Stripe PaymentIntent already
  // exists, skip creation. Handles page refreshes on /success and
  // (eventually) any overlap with the webhook in TASK-029.
  let orderCreated = false;
  if (paymentIntentId) {
    const existing = await payload.find({
      collection: "orders",
      where: { stripePaymentIntentId: { equals: paymentIntentId } },
      limit: 1,
    });

    if (existing.docs.length === 0) {
      let snapshot: ProductSnapshot[] = [];
      try {
        snapshot = JSON.parse(
          session.metadata?.productSnapshot ?? "[]"
        ) as ProductSnapshot[];
      } catch {
        snapshot = [];
      }

      const subtotalCents = snapshot.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0
      );
      const totalCents = session.amount_total ?? subtotalCents;
      const shippingAddress = mapShippingAddress(session);

      // Order.lineItems requires at least one row (minRows: 1 on the
      // schema). Skip Order creation entirely if snapshot is empty —
      // logs a server-side warning and renders confirmation without
      // a persisted order. The TASK-029 webhook will be the durable
      // backstop for this edge case.
      if (snapshot.length > 0 && shippingAddress) {
        try {
          await payload.create({
            collection: "orders",
            data: {
              status: "paid",
              fulfillmentStatus: "unfulfilled",
              guestEmail:
                session.customer_details?.email ?? undefined,
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
          orderCreated = true;
        } catch (err) {
          console.error(
            "[cart/success] Order creation failed",
            { sessionId: session.id, paymentIntentId },
            err
          );
          // Don't throw — the customer's payment already succeeded.
          // The webhook in TASK-029 will be the durable backstop.
        }
      }
    } else {
      // Existing Order found — idempotent success. Treat as created.
      orderCreated = true;
    }
  }

  const itemCount = (() => {
    try {
      const snapshot = JSON.parse(
        session.metadata?.productSnapshot ?? "[]"
      ) as ProductSnapshot[];
      return snapshot.reduce((sum, item) => sum + item.quantity, 0);
    } catch {
      return 0;
    }
  })();

  const customerName =
    session.collected_information?.shipping_details?.name ??
    session.customer_details?.name ??
    "";

  return (
    <article className="mx-auto max-w-2xl px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
      <ClearCart />
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Order confirmed
      </p>
      <h1 className="font-serif text-display text-neutral-ink mb-4">
        {customerName ? `Thank you, ${customerName}.` : "Thank you."}
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Your order has been received and we&apos;ll be in touch soon.
        {!orderCreated && (
          <>
            <br />
            <span className="text-small text-neutral-ink/50">
              (If you don&apos;t hear from us within a few hours, please reach
              out.)
            </span>
          </>
        )}
      </p>

      {itemCount > 0 && session.amount_total !== null && (
        <div className="rounded-lg border border-neutral-ink/10 bg-neutral-ink/5 p-6 mb-8 text-left">
          <dl className="space-y-3">
            <div className="flex items-baseline justify-between">
              <dt className="font-sans text-body text-neutral-ink/70">
                Items
              </dt>
              <dd className="font-sans text-body font-medium text-neutral-ink tabular-nums">
                {itemCount}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="font-sans text-body text-neutral-ink/70">
                Total
              </dt>
              <dd className="font-sans text-body font-medium text-neutral-ink tabular-nums">
                {formatPriceCents(session.amount_total)}
              </dd>
            </div>
          </dl>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 px-6 py-3 text-h3 min-h-[48px] text-neutral-ink/70 hover:text-brand-red-700"
        >
          Back home
        </Link>
      </div>
    </article>
  );
}
