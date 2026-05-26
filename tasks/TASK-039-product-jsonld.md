TASK ID: TASK-039
PHASE: Phase 3 polish — SEO
GOAL: Add JSON-LD structured data to the storefront so Google (and other search engines) can render rich product cards in search results — price, availability, image, brand. Also light Organization schema site-wide so Google's knowledge panel has something to work with. After this lands, products listed on Google show as proper shopping results, not generic blue links.

CONTEXT:
TASK-033 landed the OpenGraph / Twitter card metadata for link previews. That covers social sharing. This task covers SEARCH ENGINES — specifically the `<script type="application/ld+json">` block that Google reads to build rich shopping results, breadcrumbs, sitelinks.

Three schemas to add, in priority order:

1. **Product schema** on every PDP (`/products/[slug]`). Google's product card requires `name`, `image`, `offers` with price + availability. With this, a search for "wool cardigan nepali threads" can show a card with price + stock status directly in the results.

2. **Organization schema** site-wide (in the (frontend) layout). One block per page is fine for this — Google deduplicates. Drives the brand knowledge panel.

3. **BreadcrumbList schema** on category pages and PDP. Tells Google the navigation path, enabling breadcrumb display in search results.

Out of scope:
- Review / aggregateRating schema (no review system yet)
- VideoObject schema (no videos)
- WebSite / SearchAction schema (we don't have a search page yet)
- ItemList schema on /shop / /categories (the dynamic listing would mean a lot of structured data per page — defer; not high-impact)
- Schema.org validation tooling (rely on Google's Rich Results Test in dev)
- LocalBusiness / PostalAddress for the studio (we don't have a public address yet)
- FAQPage schema on FAQ-style CMS pages — could be a future polish if FAQs land

FILES TO CREATE OR MODIFY:

**New helper (NOT blocklisted):**
- `src/lib/seo/json-ld.tsx` — small server-only helper that renders a JSON-LD `<script>` tag from an object. Just a thin wrapper so consumers don't have to remember to do `JSON.stringify` + `dangerouslySetInnerHTML`.

**Modify:**
- `src/app/(frontend)/layout.tsx` — add the Organization JSON-LD script in the `<body>` (or `<head>` via a Server Component returning the script). Site-wide.
- `src/app/(frontend)/products/[slug]/page.tsx` — add Product schema + BreadcrumbList for the product → category → home path.
- `src/app/(frontend)/categories/[slug]/page.tsx` — add BreadcrumbList for category → home.

REQUIREMENTS:

**1. The JSON-LD render helper (`src/lib/seo/json-ld.tsx`).**

```tsx
// Server component. Renders a JSON-LD <script> tag with the given data.
// Sanitizes by replacing `</script>` sequences in the JSON string —
// otherwise a value containing that text could break out of the tag.
// dangerouslySetInnerHTML is the canonical Next pattern for inline
// JSON-LD per the official Next docs.

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
```

The `</` → `<` escape prevents XSS via product names / descriptions that might contain `</script>`. Stripe-collected names don't typically have that, but defense in depth.

**2. Organization schema in the layout.**

Add to `src/app/(frontend)/layout.tsx` inside the `<body>` (after Header would be the cleanest spot — keeps `<head>` tidy). Or render it inside `<head>` via a script — both are valid per Google. Use the `<body>` placement for simplicity since Next 15 layouts render their body content as children.

```tsx
import { JsonLd } from "@/lib/seo/json-ld";

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Nepali Threads",
  url: "https://nepali-threads.com",
  logo: "https://nepali-threads.com/opengraph-image",
  description: "Handmade clothing from Nepal. A small studio releasing one collection at a time.",
};

// inside the layout return, somewhere inside <body>:
<JsonLd data={ORG_JSONLD} />
```

Notes:
- The `logo` points at our auto-generated OG image. Not strictly a logo (the wordmark IS the brand mark for now), but Google accepts any image URL and renders the wordmark at small size in knowledge panels. Defer "real logo asset" to a future task.
- One Organization block on every page is correct — Google merges duplicates.
- The URL is hardcoded to `https://nepali-threads.com`. Single env, single URL.

**3. Product schema on PDP.**

In `src/app/(frontend)/products/[slug]/page.tsx`, after the data fetch but before the return JSX, build the schema and render it inside the article.

```tsx
// After the product fetch, before return:
const firstImage = (product.images ?? []).find(...)?.image;
const productImageUrl =
  firstImage && typeof firstImage === "object" ? firstImage.url : null;

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: product.name,
  description: product.seoDescription ?? product.name,
  ...(productImageUrl ? { image: productImageUrl } : {}),
  brand: { "@type": "Brand", name: "Nepali Threads" },
  offers: {
    "@type": "Offer",
    url: `https://nepali-threads.com/products/${product.slug}`,
    priceCurrency: "USD",
    price: (product.basePrice / 100).toFixed(2),
    availability:
      product.status === "archived"
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
  },
};

// inside the return, near the top of the article:
<JsonLd data={productSchema} />
```

Notes:
- `description` uses seoDescription with a fallback to the product name. The Lexical-richText `description` field would need converting to plain text — defer that to a separate enhancement. Name as fallback is fine.
- Price is in dollars (not cents) per Schema.org Offer convention. Convert via `(basePrice / 100).toFixed(2)`.
- Availability follows the schema URL convention (`InStock`, `OutOfStock`). When we add real inventory tracking later, also surface `LimitedAvailability`.
- The image is from the first uploaded photo. If a product has no image, omit the field entirely (don't pass empty string).

**4. BreadcrumbList on PDP.**

PDP breadcrumb: Home → Category (if known) → Product.

```tsx
const categoryName =
  typeof product.category === "object" ? product.category?.name : null;
const categorySlug =
  typeof product.category === "object" ? product.category?.slug : null;

const breadcrumbItems = [
  { "@type": "ListItem", position: 1, name: "Home", item: "https://nepali-threads.com/" },
];
if (categoryName && categorySlug) {
  breadcrumbItems.push({
    "@type": "ListItem",
    position: 2,
    name: categoryName,
    item: `https://nepali-threads.com/categories/${categorySlug}`,
  });
}
breadcrumbItems.push({
  "@type": "ListItem",
  position: breadcrumbItems.length + 1,
  name: product.name,
  item: `https://nepali-threads.com/products/${product.slug}`,
});

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: breadcrumbItems,
};

// render both schemas as an array — JsonLd takes object | object[]:
<JsonLd data={[productSchema, breadcrumbSchema]} />
```

Two schemas, one script tag (an array is valid JSON-LD per spec).

**5. BreadcrumbList on Category page.**

Category breadcrumb: Home → Category. Two items.

```tsx
const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://nepali-threads.com/" },
    { "@type": "ListItem", position: 2, name: category.name, item: `https://nepali-threads.com/categories/${category.slug}` },
  ],
};

<JsonLd data={breadcrumbSchema} />
```

**6. Where the `<JsonLd>` element goes within each page.**

Doesn't matter for SEO — JSON-LD parsers find script tags anywhere in the document. Place it inside the page's outer `<article>` near the top, right after the opening tag, so the rendered HTML reads naturally when read top-to-bottom.

For the layout, place it inside `<body>` after `<Header />` — explicit position so future devs see it.

**7. Don't touch.**

- Blocklisted paths
- The opengraph-image.tsx wordmark renderer (separate concern)
- Sitemap / robots (separate concern)
- The richText description rendering — JSON-LD uses seoDescription / product name only

ACCEPTANCE:
- `npm run check` exits 0
- After deploy, view the page source on:
  - `/` → contains the Organization JSON-LD
  - `/products/test-romper` (or whatever slug exists) → contains Organization + Product + BreadcrumbList JSON-LD
  - `/categories/test-category` → contains Organization + BreadcrumbList JSON-LD
- Use Google's Rich Results Test (https://search.google.com/test/rich-results) on a deployed product URL → reports a valid Product result with no errors
- View-source shows the JSON-LD as a `<script type="application/ld+json">` block with properly escaped content (no raw `</script>` substrings inside the JSON)
- No new entries in `package.json` `dependencies` or `devDependencies`

OUTPUT NOTES FOR REVIEWER:
- Confirm `<JsonLd>` escapes `</` sequences in the JSON string (XSS defense)
- Confirm the Product schema only includes `image` when there's a real image (not empty string)
- Confirm availability flips to OutOfStock for archived products
- Confirm the BreadcrumbList builds the right path (Home → Category → Product) even when category isn't populated
- Confirm you did not touch any blocklisted paths and did not add new npm deps

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

1. **XSS escape in `<JsonLd>`:** Confirmed. The helper does `JSON.stringify(data).replace(/</g, "\\u003c")` which escapes any `</` sequence (including `</script>`) to its Unicode escape form. This is the canonical Next.js pattern for inline JSON-LD.

2. **Product schema `image` field:** Conditionally included via `...(productImageUrl ? { image: productImageUrl } : {})`. If the product has no images, the field is omitted entirely — no empty string.

3. **Availability mapping:** Confirmed. `product.status === "archived"` → `"https://schema.org/OutOfStock"`, everything else → `"https://schema.org/InStock"`. This matches the existing ProductCard "Sold out" badge logic.

4. **BreadcrumbList paths:**
   - **PDP:** Starts with Home (position 1). If category is populated, adds Category (position 2). Always ends with Product (last position). When category is missing, it's just Home → Product (2 items).
   - **Category page:** Home → Category (2 items).

5. **Build note:** `npm run build` fails due to a pre-existing type error in `src/lib/email/payload-email-adapter.ts` (blocklisted file, present on main). My changes do not cause this failure.

6. **No blocklist touches, no new deps:** Only `src/lib/seo/json-ld.tsx` (new helper) and three storefront files were modified. No blocklisted paths. No new npm dependencies.
