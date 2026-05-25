TASK ID: TASK-016
PHASE: Phase 2
GOAL: Build the dynamic CMS pages renderer at `src/app/(frontend)/[slug]/page.tsx` — a Next dynamic route that fetches Payload `Page` documents by slug and renders their title + blocks. This is the first storefront page that pulls real data from the Payload DB, and it establishes the pattern every later data-backed page (Product detail, Category) will reuse.

CONTEXT:
The Payload `Pages` collection exists (TASK-004) with two block types: `richText` (Lexical) and `image`. Right now the collection has zero documents — Neal will create at least one Page via the admin (probably `/about` to match the Footer's "Our story →" link) once this renderer is live so we can verify the rendering visually.

This is the first task that fetches from Payload in a storefront route. The pattern this lands matters — later tasks will reuse this exact `getPayload({ config })` + `payload.find(...)` shape. Get it right once, copy it everywhere.

The route uses `[slug]` (catch-all single-segment dynamic route) at the (frontend) layout root, so a Page with slug `"about"` is reachable at `/about`. Static routes always win over dynamic in Next App Router, so the homepage (`/`), future `/shop`, `/cart` etc. will continue to take precedence. The dynamic route is the fallback for anything Payload knows about.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/[slug]/page.tsx` — new dynamic route file. Server component (fetches data).
- (No other files. No new components. Uses Hero is NOT involved — Page docs are content pages, not landing pages.)

REQUIREMENTS:

**1. The route file.**
- Path: `src/app/(frontend)/[slug]/page.tsx`. Next picks this up as a dynamic route matching any single URL segment (e.g. `/about`, `/faq`, `/sustainability`).
- Default-export the page component (the Next convention). Server component — no `"use client"`.
- The page receives `params` as a prop. **In Next 15, `params` is a `Promise`** that must be `await`-ed:
  ```ts
  export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // ...
  }
  ```
  This is a Next 15 API change — older patterns where params is a plain object will not type-check.

**2. Payload data fetching.**
- Import pattern (this is the canonical shape for ALL future data-fetching server components):
  ```ts
  import { getPayload } from "payload";
  import config from "@payload-config";
  ```
  The `@payload-config` alias is set up in tsconfig.json and resolves to `src/payload.config.ts`. **Do not** rewrite this import to be relative — the alias is intentional and matches what the admin routes already use.
- Initialize Payload + query:
  ```ts
  const payload = await getPayload({ config });
  const result = await payload.find({
    collection: "pages",
    where: { slug: { equals: slug } },
    limit: 1,
  });
  const page = result.docs[0];
  ```
- **Handle "not found" via Next's `notFound()`** — do NOT render a custom 404 component on this page. Importing pattern:
  ```ts
  import { notFound } from "next/navigation";
  if (!page) notFound();
  ```
  `notFound()` throws a special error that Next catches and renders the nearest `not-found.tsx` (we don't have a custom one for the frontend yet — Next's default fires, which is acceptable for now).

**3. generateMetadata (SEO).**
- Export an `async generateMetadata` that fetches the page the same way and returns title + description metadata:
  ```ts
  export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: "pages",
      where: { slug: { equals: slug } },
      limit: 1,
    });
    const page = result.docs[0];
    if (!page) return { title: "Page not found" };
    return { title: page.title };
  }
  ```
- The double-fetch (one in `generateMetadata`, one in the page component) is unfortunate but standard — Next runs them independently. React/Payload deduplication via React's `cache()` is a polish-task improvement; skip it for now and flag it in output notes as a known follow-up.

**4. Render structure.**
- Outer: `<article className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12 py-16 lg:py-24">` — narrower max-width than product pages because content pages are reading-comfortable at ~640–768px. Same horizontal-padding rhythm as Header/Footer.
- Title: `<h1 className="font-serif text-display text-neutral-ink mb-12">{page.title}</h1>`. The Hero on the homepage owns the page-level h1 there; here on a content page, the Page title is the h1 (each page has its own document outline).
- Blocks: render the page's `blocks` array, one block at a time. Each block has `blockType` discriminating between `richText` and `image`. Block component pattern:
  ```tsx
  <div className="space-y-8">
    {page.blocks?.map((block, i) => {
      if (block.blockType === "richText") {
        return <RichText key={i} data={block.content} className="prose-base ..." />;
      }
      if (block.blockType === "image") {
        return (
          <figure key={i}>
            <Image
              src={typeof block.image === "object" ? block.image.url ?? "" : ""}
              alt={typeof block.image === "object" ? block.image.alt ?? "" : ""}
              aspectRatio={
                block.alignment === "full-width" ? "landscape" : "square"
              }
              rounded="lg"
            />
            {block.caption && (
              <figcaption className="font-sans text-small text-neutral-ink/60 mt-2 text-center">
                {block.caption}
              </figcaption>
            )}
          </figure>
        );
      }
      return null;
    })}
  </div>
  ```
- The `typeof block.image === "object"` guard handles Payload's relationship serialization. When the relationship is "populated" (eager-loaded by depth), `block.image` is the full Media document. When unpopulated (deeper-than-default-depth), it's just an ID. Payload's default depth (2) populates one level of relationships, which is enough for our case — `block.image` will be the Media object — but the type guard keeps TypeScript happy.

**5. Rich-text rendering.**
- Use the React renderer from `@payloadcms/richtext-lexical/react`:
  ```ts
  import { RichText } from "@payloadcms/richtext-lexical/react";
  ```
- `<RichText>` takes `data={block.content}` and renders the Lexical document as JSX. It comes with default converters for paragraphs, headings (h1–h6), lists, links, blockquotes, etc.
- For typography, the RichText output will inherit the page's `font-sans` from the body. Headings inside rich text WILL pick up the global `h1, h2, h3 { font-family: var(--font-serif); }` rule from `globals.css`. So out-of-the-box rendering should look on-brand.
- **Note on heading levels:** the RichText content may contain `<h1>` headings authored in the admin's Lexical editor. The page already has its own `<h1>` (the page title). The admin should use `<h2>` and below inside content — but this is a content-policy concern, not something the renderer enforces. Flag in output notes if you want to suggest a content-author guideline, but don't try to programmatically shift heading levels in the renderer.

**6. Image block — alignment.**
- The Pages schema has `alignment: "left" | "center" | "full-width"` on image blocks.
- For now, render all image blocks the same way (landscape or square aspect, rounded-lg) and **ignore the `alignment` value visually**. Implementing left/right text-wrap is a deferred polish concern. Flag in output notes.
- The `aspectRatio` mapping in the spec snippet above (full-width → landscape, others → square) is just one defensible default. Pick what looks best when you eyeball it; flag the choice.

**7. Generated types.**
- Payload's generated types live at `src/payload-types.ts`. Import the `Page` type to type your query result:
  ```ts
  import type { Page } from "@/payload-types";
  ```
- The `Page` type will have `blocks: (RichTextBlock | ImageBlock)[]` or similar — TypeScript's discriminated union narrowing handles the `blockType` check inside the block renderer.

**8. Layout / chrome.**
- The (frontend) layout already wraps the page in Header + `<main>` + Footer. Do NOT render those.
- Just render the `<article>` directly from your page component.

OUT OF SCOPE:
- Do NOT add a custom `not-found.tsx` for the frontend. Default Next 404 page is fine for now; brand-toned 404 is a polish task.
- Do NOT add static-params generation (`generateStaticParams`). Pages are admin-edited and we want them to update on the next request, not at build time.
- Do NOT add caching, revalidation tags, or `revalidate` exports. We'll add these once we have a sense of how often Pages get edited.
- Do NOT implement image alignment visual logic (left-wrap, right-wrap). Skip it; flag in notes.
- Do NOT implement breadcrumbs.
- Do NOT touch `src/payload.config.ts`, the Pages collection definition, or any blocklisted files.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy AND after Neal creates an `/about` Page in the admin with at least one richText block and one image block:
  - Visiting `/about` shows: Header (from layout) → page title (h1) → the two blocks rendered → Footer (from layout).
  - Visiting `/this-slug-does-not-exist` shows Next's default 404.
  - The HTML `<title>` reads `"<page title>"` (or `"<page title> — Nepali Threads"` once we add the title template, separate task).
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `params` is awaited via the Next 15 Promise pattern (no plain-object destructuring).
- Confirm the data fetch uses `getPayload({ config })` with the `@payload-config` alias.
- Confirm `notFound()` from `next/navigation` handles missing pages.
- Confirm the `Page` type is imported from `@/payload-types` and used to type the query result.
- State your `aspectRatio` mapping choice for image blocks (and why), since the spec leaves this to your judgment.
- Flag that image-block `alignment` is unimplemented visually, as a known deferred polish concern.
- Flag the `generateMetadata` + page-body double-fetch as a known follow-up (would use React `cache()` to dedupe).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".
