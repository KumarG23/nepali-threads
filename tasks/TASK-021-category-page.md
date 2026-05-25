TASK ID: TASK-021
PHASE: Phase 2
GOAL: Build the category browse page at `src/app/(frontend)/categories/[slug]/page.tsx` — lists all published products in a given Category, using the same ProductCard-grid pattern as `/shop`. Also: make the PDP's category eyebrow a `<Link>` to the category page so users can navigate from a product into its broader category context.

CONTEXT:
TASK-019 landed `/shop` (the broad catch-all browse surface) and TASK-018 wired the PDP to real Payload data with a category eyebrow. The category page is the natural narrowing layer: Header "Shop" → all products; click a product's category eyebrow on the PDP → that category's products. Categories are also linked from elsewhere in the future (Footer nav, breadcrumbs, related-products), so the URL needs to exist now even if today's only entry point is the PDP eyebrow.

The Categories collection has been scaffolded since TASK-001 with fields: `name`, `slug`, `description`, `image` (hero), `parent` (self-relation). For this task, render `name`, `description` (when present), and `image` (when present) as the category-page header, then the products grid below.

Hero image rendering: when a Category has an `image`, use it as a small page banner — NOT a full-bleed Hero like the homepage. Categories are mid-funnel; they need to feel browseable, not magazine-feature. A constrained landscape image sitting at the top of the page is the right scale.

Route choice: `/categories/[slug]` (plural). Using `/[slug]` alone would conflict with the existing CMS Pages renderer — both would catch the same URL, and Next would resolve to whichever route is closer in the tree, leaving the other unreachable. The plural prefix avoids that collision cleanly and matches e-commerce URL conventions.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/categories/[slug]/page.tsx` — new dynamic route. Server component (data fetch).
- `src/app/(frontend)/products/[slug]/page.tsx` — wrap the category eyebrow in a `<Link>` to `/categories/{categorySlug}`. Small modification, one line of JSX change.

REQUIREMENTS:

**1. The category route file — imports.**
Match the shape established by `/shop` and the PDP:
```ts
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayload } from "payload";

import config from "@payload-config";

import Image from "@/components/ui/Image";
import ProductCard from "@/components/storefront/ProductCard";
import type { Category, Product } from "@/payload-types";
```

**2. Mark the page dynamic.**
Same reason as `/shop` — static path that fetches Payload data at request time:
```ts
export const dynamic = "force-dynamic";
```

**3. The fetch helper.**
Both `generateMetadata` and the page body fetch the same Category. Extract a file-local helper (same pattern as the PDP):
```ts
async function getCategoryBySlug(slug: string): Promise<Category | undefined> {
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "categories",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  return result.docs[0];
}
```

Note there is no `status` filter on Categories — the Categories collection doesn't have a `status` field. A Category exists or doesn't.

**4. `generateMetadata`.**
```ts
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description: category.description ?? undefined,
  };
}
```

**5. The page body — fetch Category, then fetch products in that category.**
```ts
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const payload = await getPayload({ config });
  const productsResult = await payload.find({
    collection: "products",
    where: {
      and: [
        { status: { equals: "published" } },
        { category: { equals: category.id } },
      ],
    },
    limit: 100,
    sort: "-createdAt",
  });
  const products = productsResult.docs as Product[];

  const renderableProducts = products.filter((product) => {
    const img = product.images?.[0]?.image;
    return img && typeof img === "object" && img.url;
  });

  // ... render
}
```

The product fetch uses an `and` clause combining the published-status filter (same as Shop and PDP) with the category-relation filter. The category-relation filter uses `{ equals: category.id }` — Payload accepts the numeric ID when querying a relationship field, and we already have the resolved Category from the first fetch.

**6. Render structure — header + products grid.**

Outer:
```tsx
<article className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12 lg:py-16">
  {/* Header */}
  {/* Products grid */}
</article>
```

Header structure depends on whether the Category has an `image`. If yes, render the image first at a constrained landscape aspect; then the text block. If no, just the text block.

The Image rendering uses the same typeof guard pattern as the PDP:
```tsx
{(() => {
  const heroImage =
    category.image && typeof category.image === "object" ? category.image : null;
  return heroImage ? (
    <div className="mb-8 lg:mb-12 max-w-4xl mx-auto">
      <Image
        src={heroImage.url ?? ""}
        alt={heroImage.alt ?? category.name}
        aspectRatio="landscape"
        rounded="lg"
        priority
      />
    </div>
  ) : null;
})()}
```

Text block (always renders):
```tsx
<div className="mb-12 max-w-2xl">
  <h1 className="font-serif text-display text-neutral-ink mb-2">
    {category.name}
  </h1>
  {category.description && (
    <p className="font-sans text-body text-neutral-ink/70">
      {category.description}
    </p>
  )}
</div>
```

Products section:
```tsx
{renderableProducts.length === 0 ? (
  <p className="font-sans text-body text-neutral-ink/60">
    No pieces in this category yet. Check back soon.
  </p>
) : (
  <>
    <p className="font-sans text-body text-neutral-ink/70 mb-8">
      {renderableProducts.length === 1
        ? "One piece in this category."
        : `${renderableProducts.length} pieces in this category.`}
    </p>
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {renderableProducts.map((product) => {
        const firstImage =
          product.images?.[0]?.image &&
          typeof product.images[0].image === "object"
            ? product.images[0].image
            : null;

        return (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2"
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
    </div>
  </>
)}
```

The empty-state-when-no-products renders an inline note below the category header instead of replacing the whole page — the category itself exists and the user should still see its name and description. Only the products region swaps to the empty note.

**7. PDP — wrap the category eyebrow in a `<Link>`.**

In `src/app/(frontend)/products/[slug]/page.tsx`, find this block:
```tsx
{typeof product.category === "object" &&
  product.category?.name && (
    <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-2">
      {product.category.name}
    </p>
  )}
```

Replace with a Link-wrapped version. Use `category.slug` for the href:
```tsx
{typeof product.category === "object" &&
  product.category?.name &&
  product.category?.slug && (
    <Link
      href={`/categories/${product.category.slug}`}
      className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 hover:text-brand-red-700 transition-colors mb-2 inline-block"
    >
      {product.category.name}
    </Link>
  )}
```

Notes:
- The element changes from `<p>` to `<Link>` (which renders `<a>`). `<a>` is inline by default, so `inline-block` keeps it from collapsing.
- The `hover:text-brand-red-700` gives it the same hover treatment as the Header nav links — signals interactivity.
- The condition is extended to also check `product.category?.slug` — a Category could in theory exist without a slug (shouldn't, given the schema's `required: true`, but defensive guard against any odd legacy data).
- Add `import Link from "next/link"` at the top of the PDP file if it's not already there. (Spot-check: TASK-018's PDP doesn't import Link — this task adds it.)

**8. Don't touch anything else.**

OUT OF SCOPE:
- Do NOT add a `/categories` index page listing all categories. Defer until needed; today's entry point is the PDP eyebrow.
- Do NOT implement category parent/child rendering. The schema supports nested categories but no UX needs it yet.
- Do NOT add a sort dropdown, filter sidebar, or pagination.
- Do NOT add breadcrumbs ("Home > Cardigans") — separate task if desired.
- Do NOT add a "related categories" or "siblings of this category" section.
- Do NOT extract a shared `ProductCardLink` component from the duplicate `<Link>` wrapping in Shop + Category. Two consumers is right on the edge of premature extraction; if a third arrives, then extract.
- Do NOT touch `formatPriceCents` (still inlined in ProductCard + PDP; Category page doesn't call it directly, so the duplication count stays at 2).
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy AND with the existing Test Category having Test Romper inside it:
  - `/categories/test-category` shows: category header (with hero image if uploaded, else just text) → product count caption → 3-col grid containing the Test Romper card.
  - `/categories/no-such-category` returns Next's default 404.
  - On `/products/test-romper`, the "Test Category" eyebrow above the product name is now a clickable link; clicking it navigates to `/categories/test-category`.
- HTML `<title>` on the category page is the category name.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm the route is `/categories/[slug]/page.tsx` (plural).
- Confirm the product fetch uses both `status: published` AND `category: { equals: category.id }`.
- Confirm `notFound()` fires for unknown category slugs.
- Confirm the PDP eyebrow change wraps in `<Link>` (not nested inside `<p>`) and the `inline-block` keeps the layout sane.
- Confirm `Link` is imported in the PDP if it wasn't already.
- State whether you needed to add anything beyond the spec for the category-with-no-products case (the inline note below the header).
- Flag any place you were uncertain about visual layout or copy.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Route is `/categories/[slug]/page.tsx`** (plural) — avoids collision with the existing CMS Pages renderer at `/[slug]`.
- **Product fetch uses both `status: published` AND `category: { equals: category.id }`** in an `and` clause. The category ID comes from the already-resolved Category fetch.
- **`notFound()` fires for unknown category slugs** — `getCategoryBySlug` returns `undefined`, the page calls `notFound()`.
- **PDP eyebrow wrapped in `<Link>`** — changed from `<p>` to `<Link href={`/categories/${product.category.slug}`}>` with `inline-block` and `hover:text-brand-red-700`. Also guards on `product.category?.slug` for defensive typing.
- **`Link` imported in the PDP** — added `import Link from "next/link"` at the top of the PDP file (wasn't there before).
- **Category-with-no-products case** — renders an inline note below the category header: "No pieces in this category yet. Check back soon." The category name and description still show. Followed the spec exactly.
- **`export const dynamic = "force-dynamic"`** on the category page — same reason as `/shop`, fetches Payload at request time.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
