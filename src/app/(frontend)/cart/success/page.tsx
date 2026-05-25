import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type Stripe from "stripe";

import { formatPriceCents } from "@/lib/format";
import { persistStripeOrder } from "@/lib/orders/persist-stripe-order";
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

  // Persist via the shared helper (also used by the webhook). Idempotent
  // on stripePaymentIntentId, so refresh or race with the webhook is
  // handled. The helper never throws — it returns a discriminated result.
  const result = await persistStripeOrder(session);
  const orderExists =
    result.created ||
    (result.created === false && result.reason === "already_exists");

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
        {!orderExists && (
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
