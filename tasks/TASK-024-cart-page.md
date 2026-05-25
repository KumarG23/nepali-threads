TASK ID: TASK-024
PHASE: Phase 2 (Phase 3 boundary)
GOAL: Build the `/cart` page — a full-page view of the cart store with line items, per-line quantity controls, per-line remove, subtotal, "Continue shopping" link, and a "Checkout" CTA placeholder. Reads from the zustand cart store landed in TASK-023. Picking full-page over a slide-out drawer for now (simpler, works without focus-trap / scroll-lock concerns; a drawer can be a later polish).

CONTEXT:
TASK-023 wired the cart store, the Add-to-Cart button, and a Header badge. Right now clicking the cart link in the Header takes the user to `/cart`, which 404s (caught by the CMS Pages `/[slug]` renderer, which fails to find a Page with slug "cart"). Adding `src/app/(frontend)/cart/page.tsx` will route `/cart` correctly — Next.js's static-route priority always wins over the dynamic `/[slug]`, so no other route needs to change.

This page is **entirely client-side data.** The cart store lives in localStorage and is read by client components only. The page itself can't be a pure server component because it needs to read `useCart`. Pattern: a thin server-component `page.tsx` that exports metadata + renders a client `<CartPageContent />` component. Same shape Footer used to embed NewsletterSignup, same shape design-test uses for the demo wrappers.

Snapshot semantics from TASK-023 carry through: items in the cart hold full product data (name, price, image), so the cart page renders without needing to refetch from Payload. Image URLs use the same R2-via-Payload-proxy path that's already in next.config remotePatterns.

Out of scope:
- Drawer slide-out (deferred — full page is the primary surface for now)
- Real checkout (Phase 3, blocklisted — Stripe checkout session creation, etc.)
- Promo / discount code input
- Shipping calculator
- Save-for-later / wishlist
- Stock validation (blocklisted; happens at checkout-time)
- Variant-aware line items (no variant UX yet)

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/cart/page.tsx` — new server-component wrapper exporting metadata + rendering the client content.
- `src/app/(frontend)/cart/_cart-content.tsx` — new client component reading from the cart store and rendering the line items + summary.
- (No modifications to existing files. The Header's cart link already navigates to `/cart`; once this route exists, the link works.)

REQUIREMENTS:

**1. The page wrapper (`src/app/(frontend)/cart/page.tsx`).**

Server component. Exports static metadata + renders the client content component.

```tsx
import type { Metadata } from "next";

import { CartPageContent } from "./_cart-content";

export const metadata: Metadata = {
  title: "Cart",
  description: "Your selected pieces.",
};

export default function CartPage() {
  return <CartPageContent />;
}
```

That's the entire file. The (frontend) layout wraps this in Header + main + Footer automatically.

**2. The client content (`src/app/(frontend)/cart/_cart-content.tsx`).**

First line: `"use client";`. Reads `useCart` directly to get items + the action methods. Renders either an empty state or the populated cart layout.

Imports:
```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Image from "@/components/ui/Image";
import {
  selectItemCount,
  selectSubtotalCents,
  useCart,
} from "@/store/cart";
```

**Hydration handling.** Same pattern as the Header CartCount — render a stable shell on the server AND on initial client render, swap to the real data after `useEffect` flips a `hydrated` flag. Without this, the cart page would visibly flash from "empty" (server render with no localStorage) to "populated" (after hydration). For a more disruptive page than a single span, we want a brief loading shell instead of a flash.

```tsx
export function CartPageContent() {
  const [hydrated, setHydrated] = useState(false);
  const items = useCart((state) => state.items);
  const removeItem = useCart((state) => state.removeItem);
  const updateQuantity = useCart((state) => state.updateQuantity);
  const itemCount = useCart(selectItemCount);
  const subtotalCents = useCart(selectSubtotalCents);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    // Stable shell. Matches server render. Brief while persist rehydrates.
    return (
      <article className="mx-auto max-w-4xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
        <h1 className="font-serif text-display text-neutral-ink mb-8">Cart</h1>
        <p className="font-sans text-body text-neutral-ink/60">Loading…</p>
      </article>
    );
  }

  // ... empty state OR populated layout
}
```

**3. Empty state.**

When `items.length === 0`, render a quiet artisan-toned empty:
```tsx
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
```

(Same Button-primary-lg class string used by Hero CTA + 404 page — fourth consumer of this string. **Flag in output notes.** The threshold for refactoring is clearer now.)

**4. Populated layout.**

Two-column on desktop (lg+): line items on the left (taking ~2/3), summary on the right (~1/3, sticky). Single column on mobile.

```tsx
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
            // line-item markup — see below
          ))}
        </ul>
      </div>

      {/* Summary — 1/3 width, sticky on desktop */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {/* summary markup — see below */}
      </aside>
    </div>
  </article>
);
```

**5. Line-item markup.**

Each item is a flex row: image (small, square thumbnail) | name + per-unit price + qty controls + line subtotal | remove button. On mobile, the image stays inline with the text but quantity controls stack underneath cleanly.

```tsx
<li key={item.productId} className="flex gap-4 py-6">
  <Link
    href={`/products/${item.productSlug}`}
    className="block w-20 shrink-0 sm:w-24 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
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

    <div className="flex flex-wrap items-center justify-between gap-3 mt-auto">
      {/* Quantity controls */}
      <div className="inline-flex items-center rounded border border-neutral-ink/15 overflow-hidden">
        <button
          type="button"
          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
          aria-label={`Decrease quantity of ${item.name}`}
          className="px-3 py-1.5 font-sans text-body text-neutral-ink hover:bg-neutral-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-inset"
        >
          −
        </button>
        <span
          aria-live="polite"
          className="px-3 py-1.5 min-w-[2.5rem] text-center font-sans text-body tabular-nums"
        >
          {item.quantity}
        </span>
        <button
          type="button"
          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
          aria-label={`Increase quantity of ${item.name}`}
          className="px-3 py-1.5 font-sans text-body text-neutral-ink hover:bg-neutral-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-inset"
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
          onClick={() => removeItem(item.productId)}
          aria-label={`Remove ${item.name} from cart`}
          className="font-sans text-small text-neutral-ink/60 hover:text-brand-red-700 underline underline-offset-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded"
        >
          Remove
        </button>
      </div>
    </div>
  </div>
</li>
```

Notes:
- The decrement button uses the unicode minus `−` (U+2212), not the hyphen `-`. Visually identical at most font sizes, but the proper minus character is what reads as a minus to screen readers and matches the visual weight of `+`.
- `tabular-nums` on the prices and the quantity so digits don't jiggle when values change (e.g. "9 → 10" with proportional digits looks janky).
- `aria-live="polite"` on the quantity span so screen-reader users hear the new value after pressing +/−.
- Decrement at qty 1 sends `updateQuantity(productId, 0)` which the store maps to a remove. That matches typical e-commerce UX — clicking minus past 1 deletes the line. The aria-label on the minus button still reads "Decrease quantity" (not "Remove") because users see the behavior visually; a different label per state would confuse SR users tabbing through.
- The remove button uses `underline underline-offset-2` to differentiate from regular nav links — it's a destructive-ish action so the visual treatment is "text link, distinguishable."
- Each Link has a focus-visible ring (gold-400 + offset-2 + rounded) matching the project standard.

**6. Summary aside.**

Right column on desktop, full-width on mobile. Sticky position uses the same `lg:top-24` offset the PDP uses.

```tsx
<aside className="lg:sticky lg:top-24 lg:self-start">
  <div className="rounded-lg border border-neutral-ink/10 bg-neutral-ink/5 p-6">
    <h2 className="font-serif text-h2 text-neutral-ink mb-6">Summary</h2>
    <dl className="space-y-3 mb-6">
      <div className="flex items-baseline justify-between">
        <dt className="font-sans text-body text-neutral-ink/70">Subtotal</dt>
        <dd className="font-sans text-body font-medium text-neutral-ink tabular-nums">
          {formatPriceCents(subtotalCents)}
        </dd>
      </div>
      <div className="flex items-baseline justify-between">
        <dt className="font-sans text-small text-neutral-ink/60">Shipping</dt>
        <dd className="font-sans text-small text-neutral-ink/60">
          Calculated at checkout
        </dd>
      </div>
    </dl>

    <button
      type="button"
      onClick={() => window.alert("Checkout isn't wired up yet — Phase 3.")}
      className="w-full inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px] mb-3"
    >
      Checkout
    </button>

    <Link
      href="/shop"
      className="block w-full text-center font-sans text-small text-neutral-ink/70 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded py-2"
    >
      Continue shopping
    </Link>
  </div>
</aside>
```

Notes:
- `<dl>` + `<dt>` + `<dd>` for the subtotal/shipping pairs — semantic markup for key-value pairs. Slight overhead in markup but reads well to SR.
- "Shipping" line is visible but says "Calculated at checkout" — sets expectations without claiming a number we don't have.
- The Checkout button is a real `<button>` (not a `<Link>`), because clicking it triggers a `window.alert` placeholder for now. When the real checkout lands (Phase 3, Claude Code work), this becomes a navigation OR a form submit. Either way the alert disappears.
- This is the **fifth consumer** of the Button-primary-lg class string (Hero CTA, 404 CTA, /cart Empty-state CTA in this same file, /cart Checkout button). Flag this in output notes — the case for extraction is now strong, but the refactor still lives in its own follow-up task.

**7. The `formatPriceCents` helper.**

Inline at the top of `_cart-content.tsx`:
```ts
function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
```

**This is now the third consumer** of the formatter (ProductCard, PDP, cart). Per CLAUDE.md "consolidate once the pattern is settled" and our earlier note about the third consumer being the natural trigger — **extract it to a shared utility in this task**. Create `src/lib/format.ts`:

```ts
export function formatPriceCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
```

Then update:
- `src/components/storefront/ProductCard.tsx` — remove the inline helper, import from `@/lib/format`.
- `src/app/(frontend)/products/[slug]/page.tsx` — remove the inline helper, import from `@/lib/format`.
- `src/app/(frontend)/cart/_cart-content.tsx` — import from `@/lib/format` (don't define inline).

Three consumers, one shared helper. Don't extract anything else in this task — `formatPriceCents` is the only function ready.

**8. Accessibility.**

- The `<h1>` is "Cart" on the populated state, "Your cart is empty." on the empty state.
- Quantity buttons have `aria-label` like "Increase quantity of Wool Cardigan" — so an SR user tabbing through hears WHICH item the button affects.
- The quantity span has `aria-live="polite"` so changes get announced.
- Remove buttons have `aria-label` "Remove [name] from cart."
- All interactive elements get the gold focus ring.

OUT OF SCOPE:
- Cart drawer / slide-out panel (deferred or skip; full page IS the cart UI).
- Real checkout (Phase 3 blocklisted).
- Promo code input.
- Shipping calculator.
- Save for later, wishlists.
- Live inventory checks at the cart line (blocklisted).
- Bulk actions (select multiple, remove all).
- Quantity input as a typed number field (the +/- pattern is enough).
- Refactoring Button to support `as="a"` polymorphic rendering (the duplicate class string story).
- Any blocklisted file touches.
- Any new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy, manually verified:
  - With an empty cart: `/cart` shows the empty state with the "Shop the collection" CTA. No console errors.
  - Add a product from `/products/test-romper`, navigate to `/cart`. The product appears as a line item with image, name, per-unit price, qty 1, line subtotal equal to per-unit price, and a Remove button.
  - Click the quantity `+` button → qty becomes 2, line subtotal doubles, summary subtotal updates.
  - Click `−` → qty becomes 1, totals back down.
  - Click `−` again (at qty 1) → the line is removed. If it was the only line, the empty state replaces the populated layout.
  - Click Remove on a line → the line disappears.
  - Click Checkout → JS alert about Phase 3.
  - Click "Continue shopping" → navigates to `/shop`.
  - Reload while cart is populated → state persists, no hydration flash beyond the brief "Loading…" shell.
  - No console hydration-mismatch warnings.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `page.tsx` is server (exports metadata) and `_cart-content.tsx` is client (uses the store).
- Confirm the hydration-shell pattern matches the spec (renders the "Loading…" view pre-hydration, NOT the empty state or the populated state).
- Confirm `formatPriceCents` was extracted to `src/lib/format.ts` AND that ProductCard + PDP were updated to import from there (no inline copies remain).
- Confirm the decrement-at-qty-1 → remove behavior works as specified.
- Flag the **fifth** consumer of the Button primary-lg class string (Hero, 404, /cart empty-state CTA, /cart Checkout, and now also /cart Continue-shopping uses a different style so only the first four count). Note whether you'd recommend the next polish task be the Button polymorphic refactor.
- Confirm you tested the cart-page flow manually in a browser (qty +/−, remove, persist across reload). If you can't, say so.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`page.tsx` is a server component** — exports metadata, renders `<CartPageContent />`.
- **`_cart-content.tsx` is a client component** — reads from zustand store, handles hydration with `useEffect`-set flag.
- **Hydration shell renders "Loading…"** — not the empty state or populated state. The server and initial client render match (both show "Loading…"), then after `useEffect` fires, the real state appears. No flash.
- **`formatPriceCents` extracted to `src/lib/format.ts`** — ProductCard and PDP both updated to import from `@/lib/format`. No inline copies remain. The cart content imports from the shared helper.
- **Decrement-at-qty-1 → remove** — the `updateQuantity` call with `item.quantity - 1` (which is 0) triggers the store's remove behavior. Works as specified.
- **Button primary-lg class string duplication** — this is now the fifth consumer (Hero CTA, 404 CTA, /cart empty-state CTA, /cart Checkout button). The case for refactoring Button to support `as="a"` polymorphic rendering is now strong. I recommend the next polish task be exactly that refactor.
- **Manual browser verification:** I could not run a full browser to test the interactive flow (qty +/-, remove, persist across reload). The dev server starts successfully and `/cart` renders the "Loading…" shell. The reviewer should confirm in a browser: add product → qty changes → remove works → reload persists → no console warnings.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
