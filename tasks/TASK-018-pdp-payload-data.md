TASK ID: TASK-018
PHASE: Phase 2
GOAL: Wire the product detail page (PDP) at `src/app/(frontend)/products/[slug]/page.tsx` to real Payload `Products` data. Replaces the hardcoded `SAMPLE_PRODUCT` from TASK-017 with a live `payload.find({ collection: "products" })` fetch using the canonical pattern TASK-016 established. After this lands, every published product has a working `/products/<slug>` route backed by the Payload DB.

CONTEXT:
TASK-017 shipped the PDP layout with hardcoded data. This task swaps the data source — same visual structure, real fetch. The pattern lifts directly from TASK-016 (CMS pages renderer): `getPayload({ config })`, `payload.find` with a where-clause, `notFound()` for misses, `await params` for Next 15, separate `generateMetadata` fetch.

Important differences from TASK-016:
- **Products has more fields** than Pages (name, slug, description as richText, category as relationship, basePrice, images array, featured, status, plus the SEO tab fields).
- **Storefront only shows `status === "published"`** products — drafts and archived are invisible. The where-clause must filter on this.
- **Category is a relationship** — populated by default depth, comes back as a Category document with `name`.
- **Images is an ARRAY** of `{ image: Media }` entries. We use the first image for the PDP main image; multi-image gallery is a polish task.
- **No `inventoryNote` field** on Products — that was a hardcoded charm string in TASK-017. Drop it from the rendered output. (A future ProductVariants-driven "X left in stock" line will replace it eventually.)

The Products collection is **empty** right now. After this task lands, Neal will need to create at least one published Product in the admin (slug `wool-cardigan` to match the test path, or any slug — every other `/products/X` will 404) for visual verification.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/products/[slug]/page.tsx` — overwrite. Replace SAMPLE_PRODUCT + `void slug;` + the generateMetadata stub with real Payload fetches.
- (No new files. `_add-to-cart.tsx` is unchanged. No new components.)

REQUIREMENTS:

**1. Imports at the top.**
Match TASK-016's shape:
```ts
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { RichText } from "@payloadcms/richtext-lexical/react";

import config from "@payload-config";

import Badge from "@/components/ui/Badge";
import Image from "@/components/ui/Image";
import type { Product } from "@/payload-types";

import { AddToCartButton } from "./_add-to-cart";
```

**2. Remove the SAMPLE_PRODUCT constant entirely.** No leftover hardcoded data.

**3. `formatPriceCents` helper.**
- **Keep it inlined.** This is still the second copy (ProductCard + PDP). Don't extract yet. The Category/Search pages will be the third trigger.
- Identical implementation:
  ```ts
  function formatPriceCents(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }
  ```

**4. The fetch helper.**
- Both `generateMetadata` and the page component need to fetch the same product. Extract a small helper at the top of the file (still scoped to this file — do NOT add to a shared util):
  ```ts
  async function getProductBySlug(slug: string): Promise<Product | undefined> {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "products",
      where: {
        and: [
          { slug: { equals: slug } },
          { status: { equals: "published" } },
        ],
      },
      limit: 1,
    });
    return result.docs[0];
  }
  ```
- The `and` clause is required so drafts and archived products 404 on the public route even if they exist in the DB.
- This helper still gets called twice (metadata + page body) — same `cache()` deduplication follow-up flagged in TASK-016 applies here. Do not implement it; flag it in notes again.

**5. generateMetadata.**
- Pattern mirrors TASK-016 but uses the helper:
  ```ts
  export async function generateMetadata({
    params,
  }: {
    params: Promise<{ slug: string }>;
  }): Promise<Metadata> {
    const { slug } = await params;
    const product = await getProductBySlug(slug);
    if (!product) return { title: "Product not found" };
    return {
      title: product.seoTitle ?? product.name,
      description: product.seoDescription ?? undefined,
    };
  }
  ```
- Use the SEO-tab fields (`seoTitle`, `seoDescription`) when set, falling back to the primary fields. Matches the admin UX promise that the SEO tab IS an override, not a separate-but-equal field.

**6. Page component — fetch + notFound.**
```ts
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();
  // ... render
}
```

**7. Rendering — field-by-field mapping.**
The visual structure from TASK-017 stays exactly the same. The field mapping changes:

- **Category eyebrow.** Now reads from the populated relationship:
  ```tsx
  {typeof product.category === "object" && product.category?.name && (
    <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-2">
      {product.category.name}
    </p>
  )}
  ```
  The `typeof` guard handles both populated (Category object) and unpopulated (ID number) cases — same pattern Pages renderer uses for image. Skip the eyebrow entirely if the category isn't populated.

- **Name (h1):** `product.name` — same shape as before.

- **Price + badge row:** `formatPriceCents(product.basePrice)` for the price. For the badge, **omit it for this task** — Products schema doesn't have a badge field. (A later task may map `product.status === "archived"` to a "Sold out" badge, or map low inventory to a "Last few" badge once ProductVariants are wired in; not for this task.)

- **Description (richText):** use `<RichText>`:
  ```tsx
  {product.description && (
    <div className="font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">
      <RichText data={product.description} />
    </div>
  )}
  ```
  Note the description wrapper is now a `<div>` (not `<p>`) because RichText can render block-level elements (lists, blockquotes) and a `<p>` inside another `<p>` is invalid HTML. The body-text styling moves to the wrapper.

- **Inventory note:** **delete entirely.** No field for it in the schema. Don't replace with a hardcoded string.

- **Add-to-Cart button:** `<AddToCartButton />` — unchanged.

- **Image area (left column):**
  ```tsx
  {product.images?.[0]?.image && typeof product.images[0].image === "object" && (
    <Image
      src={product.images[0].image.url ?? ""}
      alt={product.images[0].image.alt ?? product.name}
      aspectRatio="portrait"
      rounded="lg"
      priority
    />
  )}
  ```
  - Take the first image from the array.
  - The `typeof === "object"` guard handles Payload's relationship serialization (populated by default depth 2).
  - **For the image alt:** fall back to `product.name` if the Media doc has no alt set. This is the one case where defaulting to the product name is the right call — the visible product name conveys meaning, so an image of the product with the product name as alt is acceptable. (Contrast with ProductCard's spec, which required separate descriptive alt because there ProductCard had no surrounding context.)
  - If the product has NO images, render a graceful placeholder: a `<div className="aspect-[3/4] rounded-lg bg-neutral-ink/10 flex items-center justify-center text-neutral-ink/40 font-sans text-small">No image yet</div>` or similar. Don't crash; don't render an empty Image with `src=""`.

**8. Layout structure unchanged.**
- Outer `<article className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-12 lg:py-16">`
- Two-column grid (`grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12`)
- Image left, sticky info column right (`lg:sticky lg:top-24 lg:self-start`)
- All the same Tailwind classes from TASK-017

**9. Accessibility unchanged.**
- `<h1>` is the product name
- Image alt fallback to product.name (acceptable when product name is visible in the same view)

OUT OF SCOPE:
- Do NOT add multi-image gallery / thumbnails. First image only.
- Do NOT implement variant pickers (ProductVariants is a separate collection — wiring it is a later task).
- Do NOT add `generateStaticParams` / ISR / `revalidate`. Products can be edited; we want fresh fetches.
- Do NOT add structured-data JSON-LD.
- Do NOT add breadcrumbs.
- Do NOT add related-products section.
- Do NOT extract `formatPriceCents` to a shared util. Still waiting for the third consumer.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.
- Do NOT modify `_add-to-cart.tsx`.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy AND after Neal creates a published Product in the admin (e.g. name "Wool Cardigan", slug auto-fills to "wool-cardigan", basePrice 14500, with at least one image and a category):
  - `/products/wool-cardigan` shows the real product data: image, category, name, price, rich-text description, Add-to-Cart button.
  - `/products/missing-slug` returns Next's default 404.
  - `/products/<slug-of-a-DRAFT-product>` returns 404 (because the `status: published` filter excludes it).
- HTML `<title>` is the product's `seoTitle` (if set) or `name`.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm the `SAMPLE_PRODUCT` constant is fully removed.
- Confirm the where-clause includes the `status: { equals: "published" }` filter.
- Confirm `formatPriceCents` is still inlined (not extracted) — count of duplicates is now still two (ProductCard + here).
- Confirm the typeof guards for category and image cover both populated and unpopulated cases.
- State the placeholder you used for products with no images (or confirm you used the spec's "No image yet" shape).
- Flag the `generateMetadata` + page-body double-fetch dedup as a known follow-up (same as TASK-016).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`SAMPLE_PRODUCT` constant fully removed.** The page now fetches live data via `getProductBySlug`.
- **Where-clause includes `status: { equals: "published" }` filter.** Draft and archived products 404 on the public route. The `and` array wraps both `slug` and `status` conditions.
- **`formatPriceCents` is still inlined** — second copy (ProductCard + PDP). Third consumer (category/search pages) should trigger extraction.
- **`typeof` guards cover both populated and unpopulated cases:**
  - `product.category`: `typeof product.category === "object" && product.category?.name` — skips the eyebrow if the category relationship isn't populated.
  - `product.images[0].image`: `typeof product.images[0].image === "object"` — accesses `.url` and `.alt` only when populated.
- **Image placeholder for products with no images:** A `<div>` with `aspect-[3/4]`, `rounded-lg`, `bg-neutral-ink/10`, centered "No image yet" text in `text-neutral-ink/40`. Keeps layout stable and doesn't crash.
- **Description wrapper is `<div>`** (not `<p>`) because `<RichText>` renders block-level children (paragraphs, lists). The body-text styling lives on the wrapper.
- **`generateMetadata` + page-body double-fetch** flagged as known follow-up — same `cache()` deduplication opportunity as TASK-016.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
