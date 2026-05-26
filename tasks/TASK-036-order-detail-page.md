TASK ID: TASK-036
PHASE: Phase 3 — Checkout / accounts
GOAL: Customer-facing order detail page at `/account/orders/[id]`. Click an order from the list at `/account/orders` and see the full breakdown: line items with product images, shipping address, tracking info as a clickable link, totals, dates. After this lands, the customer's account experience is round-trip complete — they can find any past order and see everything they'd need.

CONTEXT:
TASK-035 landed the order LIST at `/account/orders`. Each order renders as a compact Card with status badge, fulfillment line, count + total. Good for scanning. Not enough for "where's my order" / "what did I buy."

This task adds the detail page. The list page also gets a small change: each Card becomes a `<Link>` to the detail page.

Auth + authorization story:
- Anyone hitting `/account/orders/<id>` while signed out → redirect to `/signin`.
- Signed-in customer hitting `/account/orders/<id>` for an order that doesn't belong to them → 404. The Orders.read access rule from TASK-034 (`customer === req.user.id`) narrows the result set, so a foreign order ID looks like "doesn't exist" to the access layer. We catch that and call `notFound()`. Don't show a generic error message; just 404 — leaks no information about whether the order ID exists at all.
- Signed-in customer hitting their own order → render the detail page.

Out of scope (queued):
- Cancel-order button (would write to the Order — customers shouldn't be able to cancel via API today; this would need a server action + admin notification)
- Re-order button (re-add line items to the cart)
- Print-friendly view
- Download receipt PDF
- Live shipment tracking via carrier API
- Customer-side returns flow

FILES TO CREATE OR MODIFY:

**New:**
- `src/app/(frontend)/account/orders/[id]/page.tsx` — the detail page. Server component, async, fetches one order via `payload.findByID`.

**Modify:**
- `src/app/(frontend)/account/orders/page.tsx` — wrap each order Card in a `<Link>` to `/account/orders/${id}`. Same focus-ring + active-opacity treatment as ProductCard wrappers elsewhere.

REQUIREMENTS:

**1. The detail page (`src/app/(frontend)/account/orders/[id]/page.tsx`).**

Server component. Reads the param (Promise per Next 15 convention), auth-checks, fetches the order, renders.

```tsx
import { headers as nextHeaders } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";
import type { Metadata } from "next";
import Link from "next/link";

import Image from "@/components/ui/Image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatPriceCents } from "@/lib/format";
import config from "@payload-config";
import type { Order, Product, Media } from "@/payload-types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order #${id}` };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const { user } = await payload.auth({ headers });

  if (!user || user.collection !== "customers") {
    redirect("/signin");
  }

  // payload.findByID respects access rules. When the order doesn't
  // belong to this customer, the rule's where filter excludes it and
  // payload throws a "not found" error. notFound() renders the 404.
  // Same outcome as a genuinely-missing id — by design, we don't tell
  // the user whether some-other-id exists.
  let order: Order;
  try {
    order = (await payload.findByID({
      collection: "orders",
      id,
      user,
      depth: 2, // populate line item products + their images
    })) as Order;
  } catch {
    notFound();
  }

  // ... render
}
```

Important: `depth: 2` populates the line item product relationship AND its images relationship. That lets us show product images in the line items. Default depth is 2 already (per Payload defaults) but be explicit so future Payload version changes don't accidentally undermine us.

**2. Render layout — three sections.**

After the auth + fetch, render:

```tsx
return (
  <article className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
    {/* Header */}
    <div className="mb-12">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1 font-sans text-small text-neutral-ink/70 hover:text-brand-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded mb-4"
      >
        ← All orders
      </Link>
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-2">
        Order #{order.id}
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-2">
        {formatOrderDate(order.createdAt)}
      </h1>
      <div className="flex items-center gap-3">
        <Badge variant={orderStatusVariant(order.status)} size="sm">
          {order.status}
        </Badge>
        <p className="font-sans text-small text-neutral-ink/70">
          {fulfillmentLine(order)}
        </p>
      </div>
    </div>

    {/* Line items */}
    <section className="mb-12">
      <h2 className="font-serif text-h2 text-neutral-ink mb-6">Items</h2>
      <ul className="divide-y divide-neutral-ink/10">
        {order.lineItems?.map((item, i) => (
          <li key={i} className="flex gap-4 py-4">
            {/* Image (when available) */}
            {/* ... see step 3 */}
            {/* Content */}
            <div className="flex flex-1 flex-col gap-1">
              <p className="font-serif text-h3 text-neutral-ink">
                {item.nameSnapshot}
              </p>
              <p className="font-sans text-small text-neutral-ink/70">
                Quantity: {item.quantity}
              </p>
              <p className="font-sans text-body font-medium text-neutral-ink tabular-nums mt-auto">
                {formatPriceCents(item.priceAtPurchase * item.quantity)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>

    {/* Totals + shipping side-by-side on lg+, stacked on smaller */}
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 mb-12">
      {/* Totals */}
      <Card variant="bordered" padding="md">
        <h2 className="font-serif text-h3 text-neutral-ink mb-4">Totals</h2>
        <dl className="space-y-2 font-sans text-body">
          <div className="flex justify-between">
            <dt className="text-neutral-ink/70">Subtotal</dt>
            <dd className="text-neutral-ink tabular-nums">{formatPriceCents(order.subtotal)}</dd>
          </div>
          {order.shipping > 0 && (
            <div className="flex justify-between">
              <dt className="text-neutral-ink/70">Shipping</dt>
              <dd className="text-neutral-ink tabular-nums">{formatPriceCents(order.shipping)}</dd>
            </div>
          )}
          {order.tax > 0 && (
            <div className="flex justify-between">
              <dt className="text-neutral-ink/70">Tax</dt>
              <dd className="text-neutral-ink tabular-nums">{formatPriceCents(order.tax)}</dd>
            </div>
          )}
          {order.giftCardDiscount > 0 && (
            <div className="flex justify-between">
              <dt className="text-neutral-ink/70">Gift card</dt>
              <dd className="text-neutral-ink tabular-nums">−{formatPriceCents(order.giftCardDiscount)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-neutral-ink/10 pt-2 mt-2 font-medium">
            <dt className="text-neutral-ink">Total</dt>
            <dd className="text-neutral-ink tabular-nums">{formatPriceCents(order.total)}</dd>
          </div>
        </dl>
      </Card>

      {/* Shipping address + tracking */}
      <Card variant="bordered" padding="md">
        <h2 className="font-serif text-h3 text-neutral-ink mb-4">Shipping</h2>
        {order.shippingAddress ? (
          <address className="not-italic font-sans text-body text-neutral-ink leading-relaxed mb-4">
            {order.shippingAddress.recipientName}<br />
            {order.shippingAddress.line1}<br />
            {order.shippingAddress.line2 && <>{order.shippingAddress.line2}<br /></>}
            {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}<br />
            {order.shippingAddress.country !== "US" && order.shippingAddress.country}
          </address>
        ) : (
          <p className="font-sans text-body text-neutral-ink/60 mb-4">No address on file.</p>
        )}

        {order.fulfillmentStatus === "shipped" && order.trackingNumber && (
          <div>
            <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-1">
              {order.carrier ?? "Tracking"}
            </p>
            {buildTrackingUrl(order.carrier, order.trackingNumber) ? (
              <a
                href={buildTrackingUrl(order.carrier, order.trackingNumber)!}
                target="_blank"
                rel="noopener noreferrer"
                className="font-sans text-body text-brand-red-700 underline underline-offset-2 hover:text-brand-red-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded tabular-nums"
              >
                {order.trackingNumber} ↗
              </a>
            ) : (
              <p className="font-sans text-body text-neutral-ink tabular-nums">
                <strong>{order.trackingNumber}</strong>
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  </article>
);
```

**3. Line item image rendering.**

For each `lineItem`, the `product` relationship is populated (via `depth: 2`). Get the first image from that product. Same `typeof` guard pattern used elsewhere:

```tsx
function getLineItemImage(item: Order["lineItems"][number]):
  | { url: string; alt: string }
  | null {
  if (!item.product || typeof item.product !== "object") return null;
  const product = item.product as Product;
  const firstImage = product.images?.[0]?.image;
  if (!firstImage || typeof firstImage !== "object") return null;
  const media = firstImage as Media;
  if (!media.url) return null;
  return { url: media.url, alt: media.alt ?? product.name };
}
```

Then in the `<li>`:

```tsx
const image = getLineItemImage(item);
{image ? (
  <div className="w-20 shrink-0 sm:w-24">
    <Image
      src={image.url}
      alt={image.alt}
      aspectRatio="square"
      rounded="lg"
    />
  </div>
) : (
  <div className="aspect-square w-20 shrink-0 rounded-lg bg-neutral-ink/10 sm:w-24" />
)}
```

Skip the image rendering when the product is gone (deleted) or has no images — fall back to the neutral-ink/10 placeholder block.

**4. Reused helpers from the list page.**

The list page (`/account/orders/page.tsx`) has these local functions:
- `formatOrderDate(dateString: string): string`
- `orderStatusVariant(status): Badge variant`
- `fulfillmentLine(order): string`

Both pages need the same. Either:
- (a) Copy them inline into the detail page too (small, fine for now, matches the "consolidate after 3 consumers" rule from CLAUDE.md — we're at 2 consumers)
- (b) Extract to a shared `src/lib/orders/format.ts` or similar

**Go with (a) — copy inline.** Two copies is the boundary, not the trigger. Comment in the detail page noting the duplication: `// Mirrors the helper in ../page.tsx — extract to src/lib/orders/format.ts if a third consumer appears.`

**5. The tracking URL builder.**

The `send-shipping-notification.ts` module has a `buildTrackingUrl` helper but it's in a blocklisted location and NOT exported. The detail page needs the same logic. Two options:

- (a) Copy the function inline into the detail page (small, the function is ~15 lines).
- (b) Extract from `send-shipping-notification.ts` into a shared util, export it, import in both.

The function is in a blocklisted file (`src/lib/email/**`), and the detail page is NOT blocklisted. To share the function, it would need to live in a NON-blocklisted location — extraction is a small refactor but means another file change.

**Go with (a) — copy inline.** Mirrors the same "consolidate at 3 consumers" rule. Comment noting the duplication, same as the date/status helpers:

```ts
// Mirrors src/lib/email/send-shipping-notification.ts buildTrackingUrl —
// kept in sync manually until a third consumer triggers extraction.
function buildTrackingUrl(
  carrier: string | undefined | null,
  trackingNumber: string | undefined | null
): string | null {
  if (!carrier || !trackingNumber) return null;
  const normalized = carrier.trim().toLowerCase();
  if (normalized.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
  if (normalized === "ups" || normalized.includes("ups ")) return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  if (normalized.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  if (normalized.includes("dhl")) return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackingNumber)}`;
  return null;
}
```

**6. Update the list page to link each order.**

In `src/app/(frontend)/account/orders/page.tsx`, wrap each Card in a Link to `/account/orders/${order.id}`. Match the focus + active pattern used by ProductCard wrappers elsewhere:

```tsx
<Link
  key={order.id}
  href={`/account/orders/${order.id}`}
  className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 active:opacity-90"
>
  <Card variant="bordered" padding="md">
    {/* ... existing card content unchanged ... */}
  </Card>
</Link>
```

The list page still renders Cards exactly as before — just wrapped in a Link.

**7. Don't touch.**

- Any blocklisted file
- The Orders schema (no new fields)
- The shipping email or hook logic
- Anything outside the two files listed above

ACCEPTANCE:
- `npm run check` exits 0
- After deploy:
  - Sign in as a customer with at least one order.
  - Visit `/account/orders` → list shows. Each row hovers + clicks through.
  - Click an order → land on `/account/orders/<id>` with the detail layout:
    - Back-to-orders link, "ORDER #<id>" eyebrow, date heading, status badge + fulfillment line
    - Line items section: image (when available) + name + qty + line total
    - Totals card: subtotal + (conditional) shipping/tax/gift card + bold total
    - Shipping card: full address; if shipped, the carrier label + clickable tracking link (USPS / UPS / FedEx / DHL recognized) opens in a new tab
  - Visit `/account/orders/<other-customer-id>` (e.g. an order ID that isn't yours) → 404, not "permission denied" — leaks no info
  - Visit `/account/orders/<id>` while signed out → redirect to `/signin`
  - Visit `/account/orders/999999` (non-existent id) → 404
- No new entries in `package.json` `dependencies` or `devDependencies`

OUTPUT NOTES FOR REVIEWER:
- Confirm the detail page is a server component (no `"use client"`).
- Confirm the auth check uses `payload.auth({ headers })` and redirects to `/signin` when not authenticated as a customer.
- Confirm foreign-order-id access returns 404 (not 403 or error message).
- State which helpers you copied inline vs whether you extracted any (per the spec's "go with (a)" decision — should be inline copies with explanatory comments).
- Confirm the line item image gracefully degrades to a neutral block when the product or its image is missing.
- Confirm the list page Link wrapping doesn't break the existing Card layout (margin/padding consistent with the pre-link version).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

1. **Detail page is a server component:** Confirmed — no `"use client"` directive. It uses `payload.auth({ headers })`, `payload.findByID`, and renders synchronously.

2. **Auth check:** Uses the same pattern as `/account` and `/account/orders` — `payload.auth({ headers })` with `headers` from `next/headers`. Unauthenticated visitors redirect to `/signin`. Non-customer users (e.g. admin Users) are also redirected.

3. **Foreign order ID → 404:** `payload.findByID({ collection: "orders", id, user, depth: 2 })` is wrapped in a `try/catch`. The Orders.read access rule from TASK-034 (`customer === req.user.id`) means a foreign order ID throws a "not found" error from Payload. The catch block calls `notFound()`, rendering the same 404 page as a genuinely missing ID. No info leak.

4. **Inline helpers (copied, not extracted):**
   - `formatOrderDate` — copied from `../page.tsx` with comment noting duplication
   - `orderStatusVariant` — copied from `../page.tsx` with comment noting duplication
   - `fulfillmentLine` — copied from `../page.tsx` with comment noting duplication
   - `buildTrackingUrl` — copied from `src/lib/email/send-shipping-notification.ts` with comment noting duplication
   All four comments note the extraction trigger: "extract when a third consumer appears."

5. **Line item image degradation:** `getLineItemImage` guards with `typeof === "object"` at each relationship level (product → images[0] → image). If any level is missing, it returns `null`. The JSX then renders a `<div className="aspect-square ... bg-neutral-ink/10" />` placeholder instead of the Image component.

6. **List page Link wrapping:** Each Card is wrapped in `<Link href={`/account/orders/${order.id}`} className="block rounded-lg focus-visible:... active:opacity-90">`. The Card inside is unchanged — margin, padding, and internal layout are identical to the pre-link version. The `block` class on the Link makes it a block-level wrapper, and `active:opacity-90` gives press feedback.

7. **No blocklist touches, no new deps:** Only two files changed — the new detail page and the list page modification. No blocklisted paths. `npm run check` exits 0.
