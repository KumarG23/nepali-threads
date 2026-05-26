TASK ID: TASK-033
PHASE: Phase 2 polish / launch prep
GOAL: Make the storefront look professional when shared anywhere — iMessage, Slack, family group chat, social media, Google search results. Adds title template, OpenGraph + Twitter card metadata across pages, a programmatic default OG image, robots.txt, and a Payload-aware sitemap.xml. Neal specifically wants this in before sharing the URL with family.

CONTEXT:
Right now most pages export only `title` + `description` metadata. There's no OG image, no Twitter card configuration, no sitemap, no robots.txt. When the URL gets pasted into iMessage / WhatsApp / Slack, the link preview is either blank or shows whatever random thing the client guesses from the page's first image.

What we're fixing in this pass:

1. **Title template.** Each page's `<title>` becomes `<page-title> — Nepali Threads`. The layout sets the template; existing per-page title fields stay as-is. So PDP's `title: "Wool Cardigan"` renders as `Wool Cardigan — Nepali Threads` in browser tabs and in OG titles.

2. **Site-wide OpenGraph + Twitter defaults.** Layout metadata gains `openGraph` and `twitter` blocks with siteName, locale, type, and a default image. Any page without per-page OG overrides inherits these.

3. **Programmatic default OG image.** A 1200×630 PNG generated at request time via Next's `ImageResponse` API. Brand-toned: cream background, lowercase serif wordmark, single accent line in brand-gold. Lives at `src/app/(frontend)/opengraph-image.tsx` — Next auto-applies it to every route in the segment unless a route overrides.

4. **Per-page OG image overrides where it matters.**
   - **PDP** (`/products/[slug]`) — OG image is the product's first image (the actual product photo, way better than the wordmark for product shares).
   - **Category page** (`/categories/[slug]`) — OG image is the category's hero image when set, else default.
   - **CMS Pages** (`/[slug]`) — OG image is the first image block when present, else default.

5. **Dynamic sitemap.xml.** Lists static routes (`/`, `/shop`, `/cart`, `/about` (if exists)) plus dynamically fetches all published Products, all Categories, and all CMS Pages. Updated automatically as content changes.

6. **robots.txt.** Allow all crawlers, point at the sitemap.

Out of scope:
- Custom favicon (needs an actual brand-mark image file Neal would provide)
- JSON-LD structured data (Product, Organization, BreadcrumbList schemas) — separate task, real SEO win but bigger spec
- hreflang / i18n metadata — single language for now
- Canonical URLs per page (defaults are fine — Next adds canonical based on the current URL)
- Per-page Twitter cards with custom imagery — site default + PDP overrides covers 90%
- Generating image variants at multiple sizes
- Disabling crawling on staging deploys (skip; we're past the "indexed accidentally" risk)
- Verification meta tags for Google Search Console, Bing Webmaster Tools — Neal sets up via DNS TXT records or `verification` block when he registers the site there. Easy to add later if needed.

FILES TO CREATE OR MODIFY:

**Layout-level metadata:**
- `src/app/(frontend)/layout.tsx` — extend the `metadata` export with `metadataBase`, `title.template`, `openGraph` site defaults, `twitter` defaults.

**Programmatic default OG image:**
- `src/app/(frontend)/opengraph-image.tsx` — new file. Uses Next 15's `ImageResponse` to render a 1200×630 PNG. Lives in the `(frontend)` route group so it applies to all storefront routes (NOT to `/admin`, which is in `(payload)` — admin doesn't need OG images).

**Per-page OG overrides:**
- `src/app/(frontend)/products/[slug]/page.tsx` — `generateMetadata` already exists; extend the return shape with `openGraph.images` pointing at the first product image.
- `src/app/(frontend)/categories/[slug]/page.tsx` — same pattern, point at category hero image.
- `src/app/(frontend)/[slug]/page.tsx` — same pattern, point at first image block found in `page.blocks` (if any).

**Sitemap + robots:**
- `src/app/sitemap.ts` — new file. Default export an async function returning an array of `{ url, lastModified }` entries. Fetch published Products, all Categories, and all CMS Pages from Payload. Combine with the static routes.
- `src/app/robots.ts` — new file. Default export returning `{ rules: { userAgent: "*", allow: "/" }, sitemap: "https://nepali-threads.com/sitemap.xml" }`.

REQUIREMENTS:

**1. Layout metadata (`src/app/(frontend)/layout.tsx`).**

Extend the existing `export const metadata` object. KEY pieces to add:

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://nepali-threads.com"),
  title: {
    template: "%s — Nepali Threads",
    default: "Nepali Threads — Handmade clothing from Nepal",
  },
  description:
    "Handmade clothing from Nepal. A small studio releasing one collection at a time.",
  openGraph: {
    siteName: "Nepali Threads",
    locale: "en_US",
    type: "website",
    // Default OG image comes from src/app/(frontend)/opengraph-image.tsx
    // automatically. No need to list it here.
  },
  twitter: {
    card: "summary_large_image",
    // Same — default image comes from opengraph-image.tsx
  },
  other: {
    "format-detection": "telephone=no", // KEEP — already there from TASK-032
  },
};
```

Key decisions:
- `metadataBase` is the site origin. Required when any OG/Twitter image is referenced by a relative URL (which our PDP and Category page overrides will do).
- `title.template` = `"%s — Nepali Threads"`. When a page exports `title: "Cart"`, browsers and OG previewers render `"Cart — Nepali Threads"`. When a page omits title, the `default` kicks in.
- The site-wide `default` includes the tagline to give the homepage a richer title. The homepage's existing `metadata: { title: "Nepali Threads", ... }` should be REMOVED (or changed to just `description` + `openGraph` overrides) so the layout default kicks in. Otherwise the homepage's tab would say "Nepali Threads — Nepali Threads" (the template would apply to the page-specified title).
- DO NOT list `images` in the layout `openGraph` block. Next auto-applies `opengraph-image.tsx` from the route group, and an explicit list overrides that. Leave images empty here.

**Update `src/app/(frontend)/page.tsx`** (homepage): remove the `title` from its `export const metadata` so the layout's `default` template kicks in. Leave `description` if you want a different one for the homepage specifically, otherwise remove that too. End state for homepage metadata:

```ts
export const metadata: Metadata = {
  // Inherits title from layout's default and og image from opengraph-image.tsx
  description: "...", // keep if different from layout, else remove
};
```

If the homepage description IS the same as the layout default, just remove the homepage `metadata` export entirely.

**2. Default OG image (`src/app/(frontend)/opengraph-image.tsx`).**

Next 15's `ImageResponse` renders JSX-like markup into an image. Standard pattern:

```tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Nepali Threads — Handmade clothing from Nepal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FAF7F2",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
          }}
        >
          {/* Brand-gold accent line */}
          <div
            style={{
              width: "80px",
              height: "3px",
              backgroundColor: "#C9A84C",
            }}
          />
          {/* Wordmark */}
          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: "96px",
              color: "#2A2420",
              letterSpacing: "-0.02em",
            }}
          >
            nepali threads
          </div>
          {/* Tagline */}
          <div
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: "28px",
              color: "rgba(42, 36, 32, 0.7)",
              letterSpacing: "0.02em",
            }}
          >
            Handmade clothing from Nepal
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

Notes:
- `runtime = "edge"` is the standard ImageResponse choice — fast cold start, low overhead. Required for `ImageResponse` API in some Next versions; safe default.
- ImageResponse only accepts inline styles (NO Tailwind classes, NO className).
- Font: uses Georgia system serif for the wordmark — close enough to Fraunces for the OG image. Loading the real Fraunces font binary at request time is extra complexity for marginal aesthetic gain. Defer to a future polish task if the system Georgia looks off.
- Brand colors hardcoded as hex literals (CSS variables don't reach ImageResponse).
- Aspect ratio 1200×630 is the OpenGraph standard. Twitter, iMessage, Slack all accept it.

**3. PDP OG image override.**

In `src/app/(frontend)/products/[slug]/page.tsx`, extend `generateMetadata`'s return. After deriving the firstImage URL, add it to openGraph:

```ts
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const firstImage =
    product.images?.[0]?.image && typeof product.images[0].image === "object"
      ? product.images[0].image
      : null;

  return {
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? undefined,
    openGraph: firstImage?.url
      ? { images: [{ url: firstImage.url, alt: firstImage.alt ?? product.name }] }
      : undefined,
  };
}
```

When the product has at least one image, the OG card preview shows the actual product photo — way better than the wordmark for product link shares. When the product has no image, openGraph is omitted from the return, which makes the layout's default (the opengraph-image.tsx wordmark) take over.

**4. Category OG image override.**

Same pattern in `src/app/(frontend)/categories/[slug]/page.tsx`'s `generateMetadata`. Use `category.image` (the hero image, optional in the schema):

```ts
const heroImage =
  category.image && typeof category.image === "object" ? category.image : null;

return {
  title: category.name,
  description: category.description ?? undefined,
  openGraph: heroImage?.url
    ? { images: [{ url: heroImage.url, alt: heroImage.alt ?? category.name }] }
    : undefined,
};
```

**5. CMS Pages OG image override.**

In `src/app/(frontend)/[slug]/page.tsx`'s `generateMetadata`, look at `page.blocks` for the first block of type `"image"`. The Pages schema's image block has shape `{ blockType: "image", image: <Media relation>, caption?, alignment }`.

```ts
const firstImageBlock = page.blocks?.find(
  (b) => b.blockType === "image"
);
const imageDoc =
  firstImageBlock?.blockType === "image" &&
  typeof firstImageBlock.image === "object"
    ? firstImageBlock.image
    : null;

return {
  title: page.title,
  openGraph: imageDoc?.url
    ? { images: [{ url: imageDoc.url, alt: imageDoc.alt ?? page.title }] }
    : undefined,
};
```

When a page has no image block, the layout default (opengraph-image.tsx) kicks in.

**6. Sitemap (`src/app/sitemap.ts`).**

Lives at the **app root**, NOT inside `(frontend)`. Next 15 generates `/sitemap.xml` from this file regardless of route groups.

```ts
import type { MetadataRoute } from "next";
import { getPayload } from "payload";

import config from "@payload-config";

const BASE_URL = "https://nepali-threads.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static routes that always exist.
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
  ];

  const payload = await getPayload({ config });

  // Published products.
  const products = await payload.find({
    collection: "products",
    where: { status: { equals: "published" } },
    limit: 1000,
    depth: 0, // don't populate relationships — we only need slug + updatedAt
  });
  const productRoutes: MetadataRoute.Sitemap = products.docs.map((p) => ({
    url: `${BASE_URL}/products/${p.slug}`,
    lastModified: p.updatedAt ? new Date(p.updatedAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  // All categories.
  const categories = await payload.find({
    collection: "categories",
    limit: 1000,
    depth: 0,
  });
  const categoryRoutes: MetadataRoute.Sitemap = categories.docs.map((c) => ({
    url: `${BASE_URL}/categories/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : now,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // All CMS pages.
  const pages = await payload.find({
    collection: "pages",
    limit: 1000,
    depth: 0,
  });
  const pageRoutes: MetadataRoute.Sitemap = pages.docs.map((page) => ({
    url: `${BASE_URL}/${page.slug}`,
    lastModified: page.updatedAt ? new Date(page.updatedAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...productRoutes, ...categoryRoutes, ...pageRoutes];
}
```

Notes:
- `depth: 0` keeps the query light — we don't need relationships, just slug + updatedAt.
- Cart-related routes (`/cart`, `/cart/success`) are intentionally EXCLUDED. They're user-specific or transactional, not indexable content.
- 404 is excluded (obviously).
- The sitemap is dynamic — Next regenerates it on each request. For a small catalog (under a few thousand items) this is fine.

**7. Robots (`src/app/robots.ts`).**

Also at app root.

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/cart"],
    },
    sitemap: "https://nepali-threads.com/sitemap.xml",
  };
}
```

Disallow:
- `/admin` — Payload admin UI; no point indexing
- `/api` — API routes; not user-visible content
- `/cart` — user state; no canonical content

Allow everything else (`/`, `/shop`, `/products/...`, `/categories/...`, `/<cms-slug>`).

**8. Don't touch anything else.**

The polish pass touches:
- `src/app/(frontend)/layout.tsx` (extend metadata)
- `src/app/(frontend)/page.tsx` (trim metadata to let layout default apply)
- `src/app/(frontend)/opengraph-image.tsx` (new)
- `src/app/(frontend)/products/[slug]/page.tsx` (extend generateMetadata)
- `src/app/(frontend)/categories/[slug]/page.tsx` (extend generateMetadata)
- `src/app/(frontend)/[slug]/page.tsx` (extend generateMetadata)
- `src/app/sitemap.ts` (new)
- `src/app/robots.ts` (new)

Don't refactor unrelated code. No new components. No new dependencies.

ACCEPTANCE:
- `npm run check` exits 0
- After deploy:
  - Visit `https://nepali-threads.com/sitemap.xml` → returns XML with the homepage + /shop + every published product + every category + every CMS page
  - Visit `https://nepali-threads.com/robots.txt` → returns text with the rules + sitemap reference
  - Visit `https://nepali-threads.com/opengraph-image` → returns the brand-toned 1200×630 PNG (cream bg, gold line, "nepali threads" serif wordmark, "Handmade clothing from Nepal" tagline)
  - Browser tabs show `<page-title> — Nepali Threads`:
    - `/cart` → "Cart — Nepali Threads"
    - `/products/<slug>` → `<product-name> — Nepali Threads`
    - `/` → "Nepali Threads — Handmade clothing from Nepal" (the layout default — no template prefix because the homepage doesn't export its own title)
  - Paste `https://nepali-threads.com` into iMessage / Slack → preview card with the brand image and tagline
  - Paste a product URL into iMessage → preview card with the actual product image
  - Paste a category URL → preview card with the category hero image if set, else the brand image
- No new entries in `package.json` `dependencies` or `devDependencies`

OUTPUT NOTES FOR REVIEWER:
- Confirm the homepage metadata no longer specifies `title` (so layout default applies). If you kept a title on the homepage, explain why.
- Confirm `metadataBase` is set in the layout so relative image URLs in per-page OG overrides work.
- Confirm the default OG image renders the brand wordmark + tagline.
- State the runtime you used for `opengraph-image.tsx` (`edge` vs `nodejs`).
- Confirm sitemap.ts and robots.ts are at the APP ROOT (`src/app/sitemap.ts`, `src/app/robots.ts`), NOT inside `(frontend)`.
- Flag any place where the metadata return shape felt off — Next 15's Metadata type can be picky.
- Confirm you tested the OG image manually (visit `/opengraph-image` directly to see the rendered PNG).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".
