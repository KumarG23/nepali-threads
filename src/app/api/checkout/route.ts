// LOCAL-LLM: DO NOT EDIT
//
// POST /api/checkout — creates a Stripe Checkout Session from a cart payload
// and returns the hosted-checkout URL. The cart page redirects the browser
// to this URL. Stripe handles card collection + shipping address; on
// success it redirects to /cart/success?session_id={CHECKOUT_SESSION_ID}
// which retrieves the session, verifies payment, and creates the Order in
// Payload (idempotent on stripePaymentIntentId).

import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

type CheckoutItem = {
  productId: number;
  productSlug: string;
  name: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
};

type CheckoutBody = {
  items: CheckoutItem[];
};

function isCheckoutItem(value: unknown): value is CheckoutItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.productId === "number" &&
    typeof v.productSlug === "string" &&
    typeof v.name === "string" &&
    typeof v.priceCents === "number" &&
    typeof v.imageSrc === "string" &&
    typeof v.imageAlt === "string" &&
    typeof v.quantity === "number" &&
    v.quantity > 0
  );
}

export async function POST(request: Request) {
  let body: CheckoutBody;
  try {
    body = (await request.json()) as CheckoutBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : null;
  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "Cart is empty." },
      { status: 400 }
    );
  }

  if (!items.every(isCheckoutItem)) {
    return NextResponse.json(
      { error: "Cart contains invalid items." },
      { status: 400 }
    );
  }

  const origin = request.headers.get("origin") ?? "";

  // Stripe's metadata fields cap at 500 chars per value. Keep the snapshot
  // small: only the fields the /success page needs to rebuild Order
  // lineItems (productId / name / quantity / priceCents). For a typical
  // 3-item cart, this fits comfortably.
  const productSnapshot = JSON.stringify(
    items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      priceCents: item.priceCents,
    }))
  );

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: items.map((item) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.name,
            // Stripe requires absolute URLs in product_data.images. Our
            // imageSrc is the relative /api/media/file/... path; the origin
            // header gives us the storefront's absolute URL at request time.
            images:
              item.imageSrc && origin
                ? [`${origin}${item.imageSrc}`]
                : undefined,
          },
          unit_amount: item.priceCents,
        },
        quantity: item.quantity,
      })),
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      metadata: {
        productSnapshot,
      },
      success_url: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    if (!session.url) {
      throw new Error("Stripe returned no checkout URL");
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error", err);
    return NextResponse.json(
      { error: "Could not create checkout session. Please try again." },
      { status: 500 }
    );
  }
}
