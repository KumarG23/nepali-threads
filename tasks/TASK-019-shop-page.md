TASK ID: TASK-019
PHASE: Phase 2
GOAL: Build the shop page at `src/app/(frontend)/shop/page.tsx` — a flat list of all published Products rendered as a ProductCard grid. This is the destination of the Header's "Shop" link, the Hero's "Shop the collection" CTA, and the Footer's "All products" link. After this lands, the storefront has a working main browse surface.

CONTEXT:
TASK-018 wired the PDP to real Payload data. The natural next page is the shop landing — same data-fetching pattern (`payload.find` with the `status: "published"` filter), but listing many products instead of fetching one by slug. The output is a ProductCard grid that links each card through to its PDP.

This task is intentionally minimal:
- **No filtering.** Footer's `/shop?filter=new` link will 404 the search-param meaning silently — the page ignores `?filter=new` for now. A real category/featured filter is a separate task.
- **No pagination.** Just `limit: 100` and render whatever comes back. Pagination polish later.
- **No category facets, no sort dropdown, no search input.** Real shop UX is a polish task once content exists.
- **One layout:** page title + caption + grid. Same brand voice as the homepage's "Recent work" section, but covers the whole catalog.

This task is also where ProductCard finally gets a `<Link>` wrapper around it (TASK-010 deliberately left ProductCard non-clickable; consumers wrap). The shop is the first place every card needs to be clickable.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/shop/page.tsx` — new server-component page. Fetches products, renders the grid.
- (No new components. Reuses ProductCard. No new utilities.)

REQUIREMENTS:

**1. Imports + structure.**
- Path: `src/app/(frontend)/shop/page.tsx`. Server component (default for App Router).
- Imports match the PDP's shape:
  ```ts
  import type { Metadata } from "next";
  import Link from "next/link";
  import { getPayload } from "payload";

  import config from "@payload-config";

  import ProductCard from "@/components/storefront/ProductCard";
  import type { Media, Product } from "@/payload-types";
  ```
  The `Media` import is for the typeof guard on `product.images[0].image` (same pattern as PDP).

**2. Page metadata.**
```ts
export const metadata: Metadata = {
  title: "Shop",
  description: "Every piece in the current collection.",
};
```

**3. Data fetch.**
```ts
export default async function ShopPage() {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "products",
    where: { status: { equals: "published" } },
    limit: 100,
    sort: "-createdAt",
  });
  const products = result.docs;
  // ... render
}
```

- `status: { equals: "published" }` — same filter as PDP. Drafts and archived stay invisible.
- `limit: 100` — generous ceiling. Until we have more than 100 published products, no pagination needed.
- `sort: "-createdAt"` — newest products first. The `-` prefix is Payload's descending-sort syntax.
- Do NOT define a `getProducts` helper at the top of the file the way the PDP did. The PDP needed the helper because metadata + body both fetched; here, only the page body fetches (metadata is static).

**4. Empty state.**
- When `products.length === 0` (e.g. the shop has no published products yet), render a graceful empty state INSTEAD of an empty grid:
  ```tsx
  if (products.length === 0) {
    return (
      <article className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12 py-16 lg:py-24 text-center">
        <h1 className="font-serif text-display text-neutral-ink mb-4">
          The shop is quiet for the moment.
        </h1>
        <p className="font-sans text-body text-neutral-ink/70">
          We're between collections. Check back soon — or sign up below to be the first to know when new pieces land.
        </p>
      </article>
    );
  }
  ```
  The empty-state copy is intentionally artisan and non-corporate (matches CLAUDE.md tone rules). No newsletter signup embedded — the Footer's already covers that.

**5. Populated state — layout.**
- Outer: `<article className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16 lg:py-24">` (same padding rhythm as the homepage's "Recent work" section).
- Heading block:
  ```tsx
  <h1 className="font-serif text-display text-neutral-ink mb-2">Shop</h1>
  <p className="font-sans text-body text-neutral-ink/70 mb-12 max-w-xl">
    {products.length === 1
      ? "One piece, made by hand."
      : `${products.length} pieces, each made by hand.`}
  </p>
  ```
  The conditional copy keeps the page from saying "1 pieces" when there's only one product. Small detail; matters.
- Grid wrapper: `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">`. **Three columns on lg+, not four** (compared to the homepage's 4-col grid). The homepage's 4-col is a tight curated feature; the shop's 3-col lets each card breathe more.

**6. Product → ProductCard mapping.**
For each product, render a `<Link>` wrapping a ProductCard:
```tsx
{products.map((product) => {
  const firstImage =
    product.images?.[0]?.image &&
    typeof product.images[0].image === "object"
      ? product.images[0].image
      : null;

  return (
    <Link
      key={product.id}
      href={`/products/${product.slug}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded-lg"
    >
      <ProductCard
        name={product.name}
        priceCents={product.basePrice}
        imageSrc={firstImage?.url ?? ""}
        imageAlt={firstImage?.alt ?? product.name}
        badge={
          product.status === "archived"
            ? { label: "Sold out", variant: "muted" }
            : undefined
        }
      />
    </Link>
  );
})}
```
- The **Link wraps the entire card** so the whole tile is clickable. This is the first place ProductCard gets a `<Link>` wrapper around it — TASK-010 explicitly deferred this decision to consumers.
- `className="block"` because `<Link>` renders an `<a>` which is inline by default; `block` makes it fill the grid cell.
- Focus ring on the `<Link>` itself (matching the project's gold focus ring), with `rounded-lg` so the ring follows the card's corners.
- Badge logic: archived products get a "Sold out" muted badge. Published products get no badge by default. (Sale / New badges are content-driven and require a schema change we don't have yet — a later task can add a `badge` field on Products or auto-derive from createdAt.)
- Image fallback to product.name for alt — same rule as the PDP. The product name in the card text below provides context, so reusing it for alt is acceptable.
- Image `src` fallback to `""` is intentionally minimal — if a product has no image, the underlying Image's next/image will emit a broken image (the design-test page showed no broken-image placeholder for empty src). **For products without images, we accept the broken-image fallback for now and flag in output notes.** A proper "No image" tile is a polish task.

Wait — re-read the spec carefully here. The PDP gracefully handled missing images with a "No image yet" placeholder. For consistency, the Shop should too. Let me reconsider.

Actually the right call: **skip the broken-image-fallback warning and add a small placeholder for the no-image case** that matches the PDP's tone. Inside the map, before the Link, derive an `imageSrcSafe` and an `imageAltSafe`:
```ts
const imageSrc = firstImage?.url ?? "/placeholder-no-image.svg"; // OR handle inline
```
But we don't have a placeholder SVG asset. Simplest path: skip products without images entirely (filter them out before rendering) OR show a gray block. **Simpler still: assume the admin uploads at least one image per product** — that's the realistic case. The PDP's placeholder handles dev-time missing-image; the shop never realistically renders products without images because they wouldn't be `status: published` without a hero photo.

**Decision (bake into spec):** Filter out products that have no usable image from the rendered grid. Don't try to render them with placeholders — they shouldn't be `published` without an image, and skipping silently is cleaner than showing broken tiles.
```ts
const renderableProducts = products.filter((product) => {
  const img = product.images?.[0]?.image;
  return img && typeof img === "object" && img.url;
});
```
Use `renderableProducts.length === 0` in the empty-state check too. If all the published products lack images, treat as empty.

**7. Accessibility.**
- `<h1>` is "Shop" — the page-level heading.
- Each `<Link>` is keyboard-focusable; the gold focus ring shows on `:focus-visible`.
- The product name inside the card serves as the accessible name for the link (SR users hear "Wool Cardigan link" when tabbing).
- ProductCard's existing badge stays on the image area; no extra ARIA needed.

OUT OF SCOPE:
- Do NOT add URL-param filters (e.g. `?filter=new`, `?category=cardigans`). Footer's `/shop?filter=new` link will silently land here without the filter applied — acceptable for now.
- Do NOT add pagination, infinite scroll, or "Load more" UI.
- Do NOT add sort dropdowns or category facets in a sidebar.
- Do NOT add a search input — search has its own dedicated page later.
- Do NOT modify ProductCard.
- Do NOT extract `formatPriceCents` (still inlined in ProductCard + PDP; Shop doesn't use it directly).
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy AND with the Test Romper product set to Published (and an image uploaded):
  - `/shop` renders an h1 "Shop", the conditional caption, and a 3-col grid containing one ProductCard for Test Romper.
  - Clicking the card navigates to `/products/test-romper` (which TASK-018's PDP handles).
  - Tabbing through reveals a gold focus ring around the clickable card.
- With all published products deleted or status=Draft: `/shop` shows the artisan empty state, NOT an empty grid.
- The product count caption says "1 piece" when there's one, "N pieces" when there's more.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `status: { equals: "published" }` is the only where-clause (no `featured: { equals: true }` or similar).
- Confirm the empty-state copy is artisan/non-corporate and renders only when `renderableProducts.length === 0`.
- Confirm the product-count caption handles the singular/plural case correctly.
- Confirm the `<Link>` wraps the whole ProductCard, with a brand-gold focus-visible ring.
- Confirm products without a usable image are filtered out (not rendered with broken tiles).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`status: { equals: "published" }` is the only where-clause.** No featured filter, no category filter. `limit: 100`, `sort: "-createdAt"` (newest first).
- **Empty-state renders when `renderableProducts.length === 0`.** Covers both "no published products" and "published products exist but none have usable images." Copy is artisan/non-corporate: "The shop is quiet for the moment."
- **Product-count caption handles singular/plural:** "One piece, made by hand." vs "N pieces, each made by hand."
- **`<Link>` wraps the whole ProductCard** with `block` display, `rounded-lg`, and `focus-visible:ring-brand-gold-400 focus-visible:ring-2 focus-visible:ring-offset-2`. The product name inside the card serves as the link's accessible name.
- **Products without a usable image are filtered out** via `renderableProducts` — checks that `images[0].image` is an object with a `url`. Prevents broken-image tiles in the grid.
- **`export const dynamic = "force-dynamic"`** added because the page fetches from Payload at render time; static prerendering at build time fails without a live DB connection. This matches the dynamic behavior of `/[slug]` and `/products/[slug]`.
- **Badge logic included** (`product.status === "archived" ? { label: "Sold out", variant: "muted" } : undefined`) — currently a no-op since we only fetch published products, but future-proofs if the filter changes.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
