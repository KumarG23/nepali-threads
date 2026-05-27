"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Image from "@/components/ui/Image";
import { formatPriceCents } from "@/lib/format";
import {
  selectItemCount,
  selectSubtotalCents,
  useCart,
} from "@/store/cart";

export function CartPageContent() {
  const [hydrated, setHydrated] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const items = useCart((state) => state.items);
  const removeItem = useCart((state) => state.removeItem);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const itemCount = useCart(selectItemCount);
  const subtotalCents = useCart(selectSubtotalCents);

  useEffect(() => {
    setHydrated(true);
  }, []);

  async function handleCheckout() {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Checkout failed.");
      }
      const data = (await response.json()) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again."
      );
      setCheckoutLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <article className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <h1 className="font-serif text-display text-neutral-ink mb-8">Cart</h1>
        <p className="font-sans text-body text-neutral-ink/60">Loading…</p>
      </article>
    );
  }

  if (items.length === 0) {
    return (
      <article className="mx-auto max-w-2xl px-6 py-24 text-center sm:px-8 lg:px-12 lg:py-32">
        <h1 className="font-serif text-display text-neutral-ink mb-4">
          Your cart is empty.
        </h1>
        <p className="font-sans text-body text-neutral-ink/70 mb-8">
          Nothing in here yet — head back to the shop to find something.
        </p>
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]"
        >
          Shop the collection
        </Link>
      </article>
    );
  }

  return (
    <article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
      <h1 className="font-serif text-display text-neutral-ink mb-8">Cart</h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        {itemCount === 1 ? "1 piece" : `${itemCount} pieces`} in your cart.
      </p>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
        {/* Line items — 2/3 width on desktop */}
        <div className="lg:col-span-2">
          <ul className="divide-y divide-neutral-ink/10">
            {items.map((item) => (
              <li
                key={`${item.productId}-${item.variantId ?? "base"}`}
                className="flex gap-4 py-6"
              >
                <Link
                  href={`/products/${item.productSlug}`}
                  className="block w-20 shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 sm:w-24"
                >
                  {item.imageSrc ? (
                    <Image
                      src={item.imageSrc}
                      alt={item.imageAlt}
                      aspectRatio="square"
                      rounded="lg"
                    />
                  ) : (
                    <div className="aspect-square rounded-lg bg-neutral-ink/10" />
                  )}
                </Link>

                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link
                      href={`/products/${item.productSlug}`}
                      className="font-serif text-h3 text-neutral-ink hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
                    >
                      {item.name}
                    </Link>
                    <p className="font-sans text-body text-neutral-ink/70">
                      {formatPriceCents(item.priceCents)} each
                    </p>
                  </div>

                  {item.variantLabel && (
                    <p className="font-sans text-small text-neutral-ink/60">
                      Color: {item.variantLabel}
                    </p>
                  )}

                  <div className="mt-auto flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    {/* Quantity controls */}
                    <div className="inline-flex items-center overflow-hidden rounded border border-neutral-ink/15">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity - 1
                          )
                        }
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="min-h-[44px] px-3 py-2 font-sans text-body text-neutral-ink hover:bg-neutral-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-inset"
                      >
                        −
                      </button>
                      <span
                        aria-live="polite"
                        className="min-w-[2.5rem] px-3 py-1.5 text-center font-sans text-body tabular-nums"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.variantId,
                            item.quantity + 1
                          )
                        }
                        aria-label={`Increase quantity of ${item.name}`}
                        className="min-h-[44px] px-3 py-2 font-sans text-body text-neutral-ink hover:bg-neutral-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-inset"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <p className="font-sans text-body font-medium text-neutral-ink tabular-nums">
                        {formatPriceCents(item.priceCents * item.quantity)}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          removeItem(item.productId, item.variantId)
                        }
                        aria-label={`Remove ${item.name} from cart`}
                        className="font-sans text-small text-neutral-ink/60 hover:text-brand-red-700 underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Summary — 1/3 width, sticky on desktop */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-neutral-ink/10 bg-neutral-ink/5 p-6">
            <h2 className="font-serif text-h2 text-neutral-ink mb-6">
              Summary
            </h2>
            <dl className="mb-6 space-y-3">
              <div className="flex items-baseline justify-between">
                <dt className="font-sans text-body text-neutral-ink/70">
                  Subtotal
                </dt>
                <dd className="font-sans text-body font-medium text-neutral-ink tabular-nums">
                  {formatPriceCents(subtotalCents)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="font-sans text-small text-neutral-ink/60">
                  Shipping
                </dt>
                <dd className="font-sans text-small text-neutral-ink/60">
                  Calculated at checkout
                </dd>
              </div>
            </dl>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="mb-3 w-full inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 disabled:opacity-60 disabled:cursor-not-allowed px-6 py-3 text-h3 min-h-[48px]"
            >
              {checkoutLoading ? "Redirecting…" : "Checkout"}
            </button>
            {checkoutError && (
              <p
                className="mb-3 font-sans text-small text-brand-red-700"
                role="alert"
              >
                {checkoutError}
              </p>
            )}

            <Link
              href="/shop"
              className="block w-full rounded py-2 text-center font-sans text-small text-neutral-ink/70 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </article>
  );
}
