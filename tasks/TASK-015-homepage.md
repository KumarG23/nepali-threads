TASK ID: TASK-015
PHASE: Phase 2
GOAL: Build the storefront homepage at `src/app/(frontend)/page.tsx` — the first real composed storefront page. Replaces the current Next.js-template placeholder. Uses Hero + a featured-products grid of ProductCards. Header and Footer come for free from the (frontend) layout.

CONTEXT:
TASK-005 through TASK-014 landed all primitives, the four compositions (ProductCard, NewsletterSignup, Hero, plus the chrome — Header, Footer), and the (frontend) layout now wraps pages in Header + main + Footer. Everything we need for a real homepage is in place.

The current `src/app/(frontend)/page.tsx` is the default `create-next-app` placeholder — the Next.js logo, the "Get started" boilerplate, all of it. Time to delete that and ship something that looks like a real storefront.

Hardcoded sample data only. The Payload `Products` collection exists with no entries; wiring real product data is a later TASK (probably with a featured-products query helper). The homepage's job here is the **layout and composition** — prove the design system holds up as a real page.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/page.tsx` — overwrite the Next-template placeholder with the real homepage. Server component (the layout default).
- (No other files. No new components. Reuses everything in `src/components/ui/` and `src/components/storefront/`.)

REQUIREMENTS:

**1. Page structure (top to bottom).**
- **Hero section** (full-bleed at the top, sitting flush with the Header).
- **Featured products** section — 4 ProductCards in a responsive grid with a serif section heading above.
- **Mission / brand-story** section — a short text block introducing the artisan story. Plain typography, no Image. This gives the page a moment to breathe between the visual sections.
- That's it. Three sections. No category tiles, no testimonials, no Instagram feed, no second hero. **Three sections beats fifteen.** When the page is real and stocked with real photography, less content reads more confident.

The (frontend) layout already provides the Header above and Footer below — do NOT render them again on this page.

**2. Hero section.**
- Use `<Hero>` with the same brand copy from the design-test demos so the page looks real but doesn't require new copy decisions:
  - `eyebrow="New collection"`
  - `heading="Made by hand in Nepal"`
  - `body="A small studio releasing one collection at a time, woven with the same care our families taught us."`
  - `cta={{ label: "Shop the collection", href: "/shop" }}`
  - `imageSrc` = the existing `PLACEHOLDER_IMAGE` constant — define it at the top of the page file (same path the design-test uses: `"/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg"`).
  - `imageAlt="A handwoven wool cardigan draped over a wooden chair"`
  - `aspectRatio="landscape"` (the default)
- Hero is full-bleed; do NOT wrap it in a max-width container.

**3. Featured products section.**
- Wrap in `<section className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-16 lg:py-24">`. Matches Header/Footer padding rhythm.
- Section heading: `<h2 className="font-serif text-h1 text-neutral-ink mb-2">Recent work</h2>` followed by `<p className="font-sans text-body text-neutral-ink/70 mb-12 max-w-xl">A few pieces from the current collection. Each one is made by hand and there's only ever a small number.</p>`. The heading is `<h2>` because the Hero already provided the page's `<h1>`.
- Below the heading, render a responsive product grid:
  - `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">`
  - Four `<ProductCard>` instances inside. Use the same four product entries from the design-test ProductCard grid for visual consistency:
    1. `name="Wool Cardigan"`, `priceCents={14500}`, no badge, `imageAlt="Handwoven wool cardigan in deep red"`
    2. `name="Silk Scarf"`, `priceCents={6500}`, `badge={{ label: "New", variant: "accent" }}`, `imageAlt="Lightweight silk scarf with gold trim"`
    3. `name="Handwoven Sweater"`, `priceCents={22000}`, `badge={{ label: "Sold out", variant: "muted" }}`, `imageAlt="Thick handwoven sweater in natural cream"`
    4. `name="Cotton Tunic"`, `priceCents={9500}`, `badge={{ label: "Sale", variant: "primary" }}`, `imageAlt="Breathable cotton tunic for warm weather"`
  - All four use `imageSrc={PLACEHOLDER_IMAGE}` for now. Real product photos come when products get entered into Payload.

**4. Mission section.**
- Wrap in `<section className="bg-neutral-ink/5 py-16 lg:py-24">`. Subtle warm-gray tint distinguishes this section from the cream above and below — gives the page a vertical rhythm without screaming for attention.
- Inside: `<div className="mx-auto max-w-3xl px-6 sm:px-8 lg:px-12 text-center">`.
- Content: a short eyebrow + a short heading + 1–2 sentences of body.
  - `<p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">Why we make this</p>`
  - `<h2 className="font-serif text-h1 text-neutral-ink mb-6">A small studio, on purpose.</h2>`
  - `<p className="font-sans text-body text-neutral-ink/80 leading-relaxed">Our pieces are made one collection at a time by the same hands that have been weaving cloth in Nepal for generations. Working small means we can keep that craft alive and pay the people who do the work properly.</p>`
- This copy is meant to evoke the brand's voice — artisan, confident, mission-forward. Override the copy strings yourself if any phrasing feels off — flag it in output notes so Neal can sign off.

**5. Page metadata.**
- At the top of the file, export the Next.js page metadata for the homepage:
  ```ts
  import type { Metadata } from "next";
  export const metadata: Metadata = {
    title: "Nepali Threads",
    description: "Handmade clothing from Nepal. A small studio releasing one collection at a time.",
  };
  ```
- The body of the `<title>` will become "Nepali Threads — Nepali Threads" because the layout already sets the same string. That's fine for now; we'll add a proper title-template (`%s — Nepali Threads`) in a metadata-polish task later.

**6. Other rules.**
- Server component (no `"use client"`).
- No new imports beyond what's already in `src/components/`.
- Do NOT render Header or Footer here — those come from the layout.
- Do NOT add a hero overlay video, a popup modal, an Instagram embed, or any other "fancy" homepage decoration. Three sections, all from existing primitives.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy, the homepage at `/` shows: Header (from layout) → Hero → Featured products grid → Mission section → Footer (from layout). No Next.js template content remains.
- The Hero fills the viewport width and reads cleanly under the Header.
- The product grid is 4-up on `lg`+, 2-up on `sm`/`md`, 1-up on mobile.
- The mission section has a subtle warm tint distinguishing it from cream above/below.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm the Next.js template placeholder is fully removed (no `import Image from "next/image"` lifted over, no `Geist` references, no template JSX).
- Confirm page is a server component.
- State the copy you shipped for the mission section if you changed any of the suggested strings (and why).
- Flag any place where the layout felt off (e.g. Hero against Header, padding rhythm, mission section vertical balance) — these are real design judgment calls that benefit from a second eye.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Next.js template placeholder fully removed.** The old `page.tsx` had `import Image from "next/image"`, `Geist` references (in layout, not page), Next/Vercel logos, "Get started" boilerplate, and template footer links. All deleted. The new file starts fresh with only the homepage sections.
- **Page is a server component** — no `"use client"`.
- **Mission section copy:** I used the suggested strings exactly as written in the spec. They felt right for the brand voice — "A small studio, on purpose." is confident without being corporate, and the body copy connects craft to fair pay directly. No changes made.
- **Layout notes:** The Hero sits flush under the Header since the layout renders `<Header />` then `<main>{children}</main>` with no gap. The Hero's `rounded="none"` and full-width behavior reads correctly. The `bg-neutral-ink/5` mission section provides subtle visual separation from the cream background without competing with the Hero or product grid. Padding rhythm (`py-16 lg:py-24`) matches the featured products section for vertical consistency.
- **No second `<h1>`** — the page's only `<h1>` is inside Hero. Featured products and mission section both use `<h2>`.
- **No `<Link>` wrapping ProductCard** — each ProductCard renders as a `Card` (flat variant, no padding) containing an Image + text. The spec's instruction to not wrap in Link is followed; click-through to product detail is a future task.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
