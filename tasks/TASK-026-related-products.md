TASK ID: TASK-026
PHASE: Phase 2
GOAL: Add a "Related products" section to the PDP that surfaces other published products in the same category. Renders below the existing description/Add-to-Cart info column on desktop (or at the bottom of the page on mobile). Drives discovery and gives the bottom of the PDP somewhere to land.

CONTEXT:
TASK-025 wrapped the PDP image gallery — the PDP is now feature-complete for a single product. The next discovery-driver is "what else is in this category" — standard e-commerce pattern. The data is already there: every Product has a `category` relationship; the same filter we used on the category browse page (TASK-021) works for related-product fetches.

Decisions baked in:

- **Same category, by recency.** No "frequently bought together" / ML-driven recommendations. Just other published products in the same category, ordered by `-createdAt`. Predictable, no extra schema, no recommendation engine.
- **Exclude the current product.** Obvious, but easy to forget. The query needs to filter out `id !== currentProductId`.
- **Cap at 4.** Enough to fill a row on desktop without scrolling. If there are fewer than 4 siblings, render whatever exists. If there's only the current product in its category (zero siblings), don't render the section at all.
- **No carousel.** A simple 4-up grid on desktop, 2-up on tablet, 1-up on mobile (mobile gets a horizontal scroll if you want — but spec says NO scroll for now, just stack vertically). Same shape as Shop / Category grids.
- **Snapshot the existing query pattern** — same `getPayload({ config })` + `payload.find` + `and` clause filter shape we've used in TASK-016/018/021.

Out of scope:
- Recommendation algorithms (just same-category)
- Cross-category recommendations
- Horizontally-scrolling carousel
- "Recently viewed" — needs client state we don't have
- Hand-curated related lists (would need a schema field; defer)
- Anything blocklisted

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/products/[slug]/page.tsx` — add a second `payload.find` query (related products), render a new `<section>` below the existing two-column grid.
- (No new components. Reuses ProductCard + the Link-wrap pattern. No new utilities.)

REQUIREMENTS:

**1. The related-products query.**

Add this query AFTER the existing product fetch + notFound check, inside the page component. Reuse the same `payload` instance (the one used for `getProductBySlug` — note that helper currently re-initializes payload internally; for this task you can either (a) call `getPayload({ config })` again at the page-body level for the related fetch, or (b) refactor `getProductBySlug` to accept an external payload instance. Pick (a) for minimum churn — the double `getPayload` call is cheap because Payload caches the instance after the first call):

```ts
const payload = await getPayload({ config });

// Only fetch related products when the current product has a populated category
const categoryId =
  typeof product.category === "object" && product.category?.id
    ? product.category.id
    : null;

const relatedProductsResult = categoryId
  ? await payload.find({
      collection: "products",
      where: {
        and: [
          { status: { equals: "published" } },
          { category: { equals: categoryId } },
          { id: { not_equals: product.id } },
        ],
      },
      limit: 4,
      sort: "-createdAt",
    })
  : null;

const relatedProducts = (relatedProductsResult?.docs ?? []) as Product[];

const renderableRelated = relatedProducts.filter((p) => {
  const img = p.images?.[0]?.image;
  return img && typeof img === "object" && img.url;
});
```

Notes:
- The `where.and` clause has three filters. `id: { not_equals: product.id }` is Payload's "not equal" operator and excludes the current product from results.
- If `categoryId` is null (unpopulated relationship — shouldn't happen given default fetch depth, but defensive), skip the query entirely.
- `renderableRelated` filters out products without a usable image — same pattern Shop and Category pages use.

**2. The related-products section markup.**

Render the section ONLY when `renderableRelated.length > 0`. Place it BELOW the existing `<div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">` (the two-column image + info layout) but still INSIDE the outer `<article>`.

```tsx
{renderableRelated.length > 0 && (
  <section className="mt-16 lg:mt-24 border-t border-neutral-ink/10 pt-12 lg:pt-16">
    <h2 className="font-serif text-h1 text-neutral-ink mb-2">
      You may also like
    </h2>
    <p className="font-sans text-body text-neutral-ink/70 mb-8 max-w-xl">
      More from this category.
    </p>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
      {renderableRelated.map((related) => {
        const firstImage =
          related.images?.[0]?.image &&
          typeof related.images[0].image === "object"
            ? related.images[0].image
            : null;

        return (
          <Link
            key={related.id}
            href={`/products/${related.slug}`}
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
          >
            <ProductCard
              name={related.name}
              priceCents={related.basePrice}
              imageSrc={firstImage?.url ?? ""}
              imageAlt={firstImage?.alt ?? related.name}
              badge={
                related.status === "archived"
                  ? { label: "Sold out", variant: "muted" }
                  : undefined
              }
            />
          </Link>
        );
      })}
    </div>
  </section>
)}
```

Notes:
- The 4-column grid breakpoint is `lg:` — same as the homepage's "Recent work" 4-up grid. This matches the curated-feature tone.
- The visual separation from the product info above is `mt-16 lg:mt-24` (top margin) + `border-t border-neutral-ink/10 pt-12 lg:pt-16` (border with top padding). Clear horizontal rule effect without an actual `<hr>`.
- The heading is `<h2>` — the product page already has `<h1>` (the product name). Same level pattern as the homepage's "Recent work" section.
- Heading uses `text-h1` size for visual prominence (same as homepage's "Recent work"); body sub-line uses `text-body`.
- Each `<Link>` wrapping a ProductCard gets the same focus-visible ring used by Shop and Category pages.

**3. Update imports in the PDP page.**

The PDP page currently imports:
```ts
import type { Product } from "@/payload-types";
```
That stays — `Product` is already imported for the existing query.

Add:
```ts
import Link from "next/link";
import ProductCard from "@/components/storefront/ProductCard";
```

(Link was added in TASK-021 for the category eyebrow; verify it's already in imports. ProductCard is new to this file.)

**4. Don't restructure the existing PDP code.**

- The image gallery, info column, AddToCartButton — all stay exactly where they are.
- The `firstImage` derivation, the existing `<article>` wrapper, the two-column grid — all stay.
- The new related-products section is ADDITIVE — a new `<section>` inside the same `<article>`, after the existing 2-col grid closes.

OUT OF SCOPE:
- Algorithmic recommendations (collaborative filtering, "frequently bought together", etc.).
- Cross-category recommendations (e.g. "Customers who viewed cardigans also viewed scarves").
- Curated/hand-picked related products (would need a `relatedProducts` field on the Product schema; defer).
- Horizontal-scroll carousel with arrows. The 1/2/4-col responsive grid is enough.
- "Recently viewed" / "Last seen" — needs client state.
- A "View all in category" link below the grid (we'd link to `/categories/<slug>`; this could be a nice add but keep the section minimal for now).
- Anything that touches blocklisted paths.
- Any new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy, manually verified with the existing test products (Test Romper and the second test product Neal added, both in Test Category):
  - `/products/test-romper` shows the existing PDP layout, AND a new "You may also like" section below with the OTHER test product (since they're in the same category).
  - `/products/<other-test-product>` shows the same pattern, with Test Romper appearing in the related section.
  - Clicking a related ProductCard navigates to its PDP.
  - If a product is alone in its category (no other published products), the "You may also like" section is omitted entirely.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm the related-products query uses the `and` clause with all three filters (status: published, category: equals, id: not_equals).
- Confirm `renderableRelated.length === 0` means the section is omitted entirely (no empty grid, no empty heading).
- Confirm Link import is present and ProductCard import was added.
- State whether you ran a browser test to verify cross-navigation works (related card → PDP of that related product).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Related-products query uses the `and` clause with all three filters:** `status: { equals: "published" }`, `category: { equals: categoryId }`, `id: { not_equals: product.id }`.
- **Section omitted when `renderableRelated.length === 0`** — no empty grid, no empty heading. The section only renders when there are related products with usable images.
- **Link import already present** (added in TASK-021). **ProductCard import added**.
- **Existing PDP code untouched** — the image gallery, info column, AddToCartButton all stay exactly as they were. The new section is additive, placed after the 2-col grid inside the same `<article>`.
- **Browser test:** I could not run a full browser to test cross-navigation (clicking a related card → its PDP). The dev server confirms the section renders with "You may also like" and "More from this category." The reviewer should verify clicking related ProductCards navigates correctly.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
