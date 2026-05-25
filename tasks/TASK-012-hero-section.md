TASK ID: TASK-012
PHASE: Phase 2
GOAL: Build a `Hero` composition at `src/components/storefront/Hero.tsx` — the homepage above-the-fold block. Full-width background Image with overlaid eyebrow / heading / body / optional CTA. This is what the homepage hero, category page banners, and editorial landing pages will render.

CONTEXT:
TASK-010 (ProductCard) and TASK-011 (NewsletterSignup) landed the first two compositions over the design-system primitives. Hero is the third composition and the first one that exercises Image at large scale with text overlay. It's the visual centerpiece for the homepage we'll build next.

Hero is intentionally one variant for now — the standard "full-width background image with overlaid text" pattern that's both common and brand-flexible. If we later need a side-by-side "split" variant (image on one half, text on the other) or a compact text-only variant, those are separate components. Don't add `variant` prop branching.

FILES TO CREATE OR MODIFY:
- `src/components/storefront/Hero.tsx` — new file. Sibling of `ProductCard.tsx` and `NewsletterSignup.tsx`. **Server component (no `"use client"`)** — Hero is purely presentational.
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with a "Hero" section below the NewsletterSignup section. Same rule: do not rewrite earlier sections.

REQUIREMENTS:

**1. Hero component.**
- File: `src/components/storefront/Hero.tsx`. Render the outermost element as a `<section>`. Default-export the component, also export named.
- **No `"use client";`** — server-renderable.
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLElement>`).
- Inline `cx` helper at the top of the file. **No new dependencies.**

**2. Props (curated, not spread).**
- `imageSrc: string` — required. The background image URL.
- `imageAlt: string` — required. The Image primitive enforces this at the type level (TASK-009).
- `heading: string` — required. The main headline. Rendered as `<h1>` in display-sized serif.
- `eyebrow?: string` — optional. Small uppercased text above the heading (e.g. "New collection", "Featured"). Renders only when provided.
- `body?: string` — optional. Short subhead under the heading (one or two sentences max — Hero is not a place for long copy).
- `cta?: { label: string; href: string }` — optional. When provided, renders as a styled link (NOT a `<Button>` — see note below). When omitted, no CTA renders.
- `aspectRatio?: "landscape" | "tall"` — optional, default `"landscape"`. Forwarded to the underlying Image. `"landscape"` (4:3) for standard hero banners, `"tall"` (2:3) when the image deserves more vertical real estate.
- `className?: string` — applied to the outer `<section>` per the compound-primitive convention in CLAUDE.md.

**3. CTA rendering — important.**
- The CTA is a `<Link>` from `next/link`, not a `<Button>`. Reason: `<Button>` renders as `<button>`, and a `<button>` inside an `<a>` is invalid HTML; the cleanest semantics for "looks like a button, behaves like a link" is a styled `<a>`.
- Apply the same visual treatment as `Button` `variant="primary"` `size="lg"` — copy the Tailwind class string by hand into Hero. **Flag the duplication in output notes.** A future task may refactor `Button` to support `as` / polymorphic rendering, which would eliminate this; for now we accept the small duplication for visual consistency.
- The class string to apply (lifted from `src/components/ui/Button.tsx`):
  ```
  inline-flex items-center justify-center rounded font-sans font-medium
  transition-colors focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2
  bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700
  active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]
  ```
- Use `next/link`: `import Link from "next/link"` and render `<Link href={cta.href} className="...">{cta.label}</Link>`.

**4. Layout structure.**
- Outer `<section>` wraps everything. `relative` so the absolutely-positioned overlay text container can position against it.
- Inside, in order:
  1. The `<Image>` primitive: `<Image src={imageSrc} alt={imageAlt} aspectRatio={aspectRatio} rounded="none" priority />`. `rounded="none"` because Hero is full-bleed — corners would look wrong. `priority` because Hero is above-the-fold and should preload.
  2. A gradient overlay div: `<div className="absolute inset-0 bg-gradient-to-t from-neutral-ink/70 via-neutral-ink/30 to-transparent" aria-hidden="true" />`. This darkens the bottom of the image so the text on top is readable regardless of the source image's contrast.
  3. A text container: `<div className="absolute inset-0 flex flex-col justify-end p-8 sm:p-12 lg:p-16">`. Bottom-left aligned by default. Use `max-w-2xl` on the inner text wrapper so long headlines wrap nicely instead of running edge-to-edge.
- Text wrapper structure:
  ```
  <div className="max-w-2xl">
    {eyebrow && <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-cream/80 mb-3">{eyebrow}</p>}
    <h1 className="font-serif text-display text-neutral-cream">{heading}</h1>
    {body && <p className="font-sans text-body text-neutral-cream/90 mt-4 max-w-xl">{body}</p>}
    {cta && <Link href={cta.href} className="...button-classes...">{cta.label}</Link>} {/* mt-6 inline-flex etc */}
  </div>
  ```
  Use `text-neutral-cream` for the headline (high contrast against the darkened image bottom). Use lower-opacity variants (`/90`, `/80`) for the body and eyebrow so they recede slightly relative to the heading.
- Make sure the CTA `<Link>` has `mt-6` or similar margin-top spacing so it doesn't crowd the body text.

**5. Accessibility.**
- The image's `alt` is required by the underlying Image primitive (TASK-009). For decorative hero images where the heading conveys all the meaning, consumers pass `alt=""`.
- The gradient overlay div has `aria-hidden="true"` because it's purely decorative.
- The `<h1>` provides the document landmark — Hero is intended for use as the page's top section, so `<h1>` is the correct heading level. **Do NOT use `<h2>` "to be safe"** — that creates a document outline with no h1, which is worse than picking a level. Consumers will render at most one Hero per page (this is conventional and not enforced by the component).
- The CTA `<Link>` carries its own native a11y as an interactive element.

**6. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing NewsletterSignup section, titled "Hero" (use the same `font-serif text-h2 mb-6` heading style).
- Within that section, render **three** Hero examples, stacked vertically with generous spacing (`space-y-12` or similar):
  1. **Full default:** all four optional props provided (eyebrow, body, CTA, landscape aspect). Realistic-feeling brand copy:
     - eyebrow: `"New collection"`
     - heading: `"Made by hand in Nepal"`
     - body: `"A small studio releasing one collection at a time, woven with the same care our families taught us."`
     - cta: `{ label: "Shop the collection", href: "/shop" }`
     - imageSrc: reuse the existing `PLACEHOLDER_IMAGE` constant.
     - imageAlt: `"A handwoven wool cardigan draped over a wooden chair"`
  2. **Minimal:** only required props (no eyebrow, no body, no CTA). Just the imageSrc/Alt + heading. Tests that the layout still looks intentional when the text content is sparse.
     - heading: `"The autumn line is here."`
  3. **Tall aspect:** uses `aspectRatio="tall"` to show how the layout adapts to a more vertical frame. Include eyebrow + heading + body + cta as in the full example.
- Constrain each Hero to a reasonable max-width (e.g. wrap in `<div className="max-w-5xl mx-auto">`) so they don't stretch full-bleed on the design-test page, which is itself constrained.

OUT OF SCOPE:
- Do NOT add variant props like `"split"`, `"compact"`, `"text-only"`. One variant for now.
- Do NOT add multiple CTAs or secondary actions. One CTA max.
- Do NOT add a video background option, parallax, animation, or any motion. Static image only.
- Do NOT touch the Button primitive to add `as` / polymorphic support — that's a separate decision, not in this task's scope. Accept the style-string duplication for now.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run typecheck` is clean (the new script — `tsc --noEmit`).
- `npm run check` succeeds with exit 0 (typecheck + build).
- After deploy, `/design-test` shows the existing primitives, ProductCard, and NewsletterSignup sections unchanged, plus a new "Hero" section with all three example heroes rendering.
- Each Hero: full-width image fills the frame, gradient darkens the bottom for text legibility, heading is readable, optional eyebrow / body / CTA render only when provided.
- The CTA link is keyboard-focusable, shows the gold focus ring, and navigates to its `href` (no need to test the destination — `/shop` will 404 for now).
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm Hero is a server component (no `"use client"`).
- Confirm the CTA is rendered as `<Link>` styled like Button-primary-lg, NOT as `<Button>` inside a `<Link>`.
- Flag the Tailwind class duplication between Hero's CTA and Button's primary-lg classes. Briefly note whether you considered any cleaner alternative (e.g. extracting to a shared constant) and why you didn't take it.
- State the text-overlay positioning approach (bottom-left absolute, with the gradient overlay on top of the image).
- Flag any place you were uncertain about the layout, the prop API, or the a11y choices (especially the `<h1>` decision).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".
