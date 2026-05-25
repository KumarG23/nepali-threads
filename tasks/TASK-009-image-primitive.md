TASK ID: TASK-009
PHASE: Phase 2
GOAL: Build an `Image` primitive at `src/components/ui/Image.tsx` — a brand-opinionated wrapper around Next.js's `next/image` with aspect-ratio framing, brand corner radius, and required alt text. This is the last foundational primitive before we start composing real storefront sections (ProductCard, hero, mission, etc.).

CONTEXT:
Storefront imagery (product photos, lifestyle shots, mission imagery) is the next thing the homepage and product pages need. `next/image` does the heavy lifting (optimization, lazy loading, responsive variants) but its API is general-purpose and unopinionated. We want a wrapper that bakes in our defaults — aspect-ratio frames, brand corner radius, `object-cover` cropping, sensible responsive sizes — so consumers can drop in `<Image src="..." alt="..." />` without having to remember the next/image quirks every time.

Keep the wrapper opinionated and small. Do NOT expose every next/image prop. We curate the surface area; later tasks can add more if needed.

FILES TO CREATE OR MODIFY:
- `src/components/ui/Image.tsx` — new file. Sibling of `Button.tsx`, `Card.tsx`, `Input.tsx`, `Badge.tsx`. **Server component (no `"use client"`)** — next/image's Image works in server components, and our wrapper has no event handlers / no client state.
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with an "Images" section. Do not rewrite earlier sections; add Image content below the Badges section.

REQUIREMENTS:

**1. Image component.**
- File: `src/components/ui/Image.tsx`. Wraps next/image (`import NextImage from "next/image"`). Default-export the component, also export named.
- **No `"use client";`.** Server-renderable.
- **Do NOT** extend `ComponentPropsWithoutRef` here — next/image has its own complex prop types. Define a curated `ImageProps` type listing only the props we expose. Anything we don't list is intentionally not part of the API surface.
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLImageElement>`) — same idiom as other primitives. Pass it through to the underlying `<NextImage>` element.
- Inline `cx` helper at the top of the file. **No new dependencies** (next/image is already in use via Next.js itself).

**2. Required props (TypeScript-enforced).**
- `src: string` — required. The image URL or imported asset.
- `alt: string` — **required.** Type signature must NOT make this optional. Decorative images pass `alt=""` (HTML-standard for decorative); intentionally-empty alt is fine, intentionally-omitted alt is a bug. This is the single most important accessibility decision in the wrapper.

**3. Optional props.**
- `aspectRatio?: "square" | "portrait" | "landscape" | "tall"` — default `"square"`. Maps to:
  - `"square"` → `aspect-square` (1:1)
  - `"portrait"` → `aspect-[3/4]` (3:4 — taller than wide; default for clothing)
  - `"landscape"` → `aspect-[4/3]` (4:3 — wider than tall; for lifestyle)
  - `"tall"` → `aspect-[2/3]` (2:3 — hero/feature imagery)
- `rounded?: "none" | "sm" | "md" | "lg" | "xl"` — default `"lg"` (matches Card's `rounded-lg`). Maps to Tailwind's rounded utilities.
- `objectFit?: "cover" | "contain"` — default `"cover"`. `cover` crops to fill the frame (standard for product grids). `contain` letterboxes (for logos, illustrations).
- `priority?: boolean` — default `false`. Passes through to next/image; set `true` for above-the-fold hero images so they preload.
- `sizes?: string` — default `"(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`. This default assumes product-grid usage (3 columns on desktop, 2 on tablet, 1 on mobile). Hero/standalone images should override.
- `className?: string` — applied to the outer container `<div>`, NOT the inner `<NextImage>`. Use this to add margin/positioning around the framed image.

**4. Rendering structure.**
- Outer `<div>` with: `relative` (required for next/image fill mode), `overflow-hidden`, the aspect-ratio class, the rounded class, and any consumer `className`. The `relative` + aspect-ratio combination creates the framed box that next/image fills.
- Inside: `<NextImage src={src} alt={alt} fill sizes={sizes} priority={priority} className={objectFit === "cover" ? "object-cover" : "object-contain"} ref={ref} />`.
- Do NOT pass `width` / `height` props to NextImage. We're using `fill` mode exclusively, which requires the parent to define dimensions (our aspect-ratio container does this).

**5. Defaults rationale (must appear as a brief comment in the file, above the component).**
- `fill` mode + aspect-ratio container chosen over intrinsic `width`/`height`: storefront grids need consistent frame dimensions regardless of source image dimensions. `fill` + `object-cover` guarantees every product tile is the same shape.
- Default `aspectRatio="square"` because square is the safest universal default — works for product tiles, avatars, lifestyle thumbnails. Consumers explicitly pick portrait/landscape/tall when they want it.

**6. Accessibility.**
- `alt` enforced at the type level (above). Decorative images use `alt=""`.
- No `role` attribute on the outer div. The image element carries the semantics.
- No `aria-*` attributes added by the wrapper.

**7. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing Badges sections, titled "Images" (use the same `font-serif text-h2 mb-6` heading style).
- Within the Images section, render two sub-groups:
  1. **Aspect ratios:** four Images side-by-side (in a 4-col grid on `md`+, 2-col on mobile), one per aspectRatio (`square`, `portrait`, `landscape`, `tall`). Each labeled with the ratio name underneath in `font-sans text-small text-neutral-ink/60`. Use a placeholder image URL — `https://placehold.co/800x800/9B2C2C/FAF7F2?text=square` and equivalents (just vary the dimensions in the URL to match each ratio so the placeholder looks correct; the hex colors are brand-red-600 background with cream text). Set `priority={false}` and use the default sizes.
  2. **Rounded scale:** four `square` Images in a 4-col grid showing each `rounded` value (`none`, `sm`, `md`, `lg`). Skip `xl` to keep the row tidy. Each labeled.
- Use a `max-w-xs` or similar constraint on each individual image's container so the design-test page doesn't have giant images stretching the layout.

OUT OF SCOPE:
- Do not add blur placeholder support (`placeholder="blur"` / `blurDataURL`). Will come later when we wire Payload Media to provide blur hashes.
- Do not add intrinsic-sizing mode (width + height props instead of fill). Aspect-ratio + fill is the only mode this wrapper supports for now.
- Do not add zoom-on-hover, lightbox, gallery, or any interactive image behavior. Those are separate components.
- Do not support video, SVG-specific handling, or animated formats beyond what next/image handles by default.
- Do not add an `Image.Caption` subcomponent or compound API. Captions belong to consumers.
- Do not touch any blocklisted paths (see CLAUDE.md "Blocklist").
- Do not install new npm dependencies.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- TypeScript blocks `<Image src="..." />` (missing alt) at compile time. Confirm by attempting to render Image without alt in design-test temporarily, observing the TS error, then restoring valid usage before committing.
- After deploy, `/design-test` shows the existing primitives unchanged, plus a new "Images" section with aspect-ratio and rounded-scale examples rendering.
- Each rendered image fills its frame via `object-cover` (no letterboxing on the cover examples).
- `next.config` may need a `remotePatterns` entry for `placehold.co` so the placeholder URLs work. If so, **STOP and add it to your output notes as a flag** — do not edit `next.config` yourself without surfacing it. (If you can use a different placeholder strategy that doesn't require config changes — e.g. a local placeholder asset under `public/` — prefer that.)
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `alt` is required at the TypeScript level (the type signature should not allow `alt?: string`).
- Confirm Image is a server component (no `"use client"`).
- State the placeholder strategy you used for the design-test (placehold.co + remotePatterns, or local public asset, or something else) and why.
- State whether you needed to edit `next.config.ts` / `.js` / `.mjs`. If yes, flag it explicitly — Claude Code wants to know.
- Flag any place you were uncertain about the prop API or next/image integration.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

**`alt` required at TypeScript level:**
- Confirmed. `ImageProps` defines `alt: string` (not `alt?: string`). TypeScript rejects `<Image src="/test.jpg" />` with `Property 'alt' is missing in type '{ src: string; }' but required in type 'ImageProps'`. Verified by temporarily adding a missing-alt line to design-test, observing the TS error, then removing it before commit.

**Server component confirmation:**
- Image is a server component — no `"use client"` directive. It wraps `next/image` which itself works in server components. No state, no effects, no client-only APIs.

**Placeholder strategy:**
- Used a local migrated product image: `/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg`. Chose this over `placehold.co` because it avoids any `next.config.ts` changes (no `remotePatterns` entry needed). The image is a real product photo from the old store, so the design-test page looks authentic rather than placeholder-y. The same image is reused across all aspect-ratio and rounded demos since the CSS frame controls the cropping, not the source dimensions.

**`next.config.ts` edits:**
- None. Did not touch `next.config.ts`. Using local images from `public/` bypasses the remotePatterns requirement entirely.

**Prop API / next/image uncertainty:**
- One minor call: the `ref` prop is passed through to `NextImage`. Next.js 15's Image component accepts refs in React 19, but the exact typing can be finicky depending on Next's internal forwardRef implementation. The current code compiles cleanly and `ref` is typed as `React.Ref<HTMLImageElement>`, so it appears to work. Flagging in case Claude Code wants to verify runtime ref behavior in a browser.
- Another call: the `sizes` default assumes product-grid usage (`33vw` desktop / `50vw` tablet / `100vw` mobile). This is a reasonable default for the storefront, but hero images will need explicit overrides. Documented in the prop default.

**Blocklist and deps confirmation:**
- Did not touch any blocklisted paths. Work stayed within `src/components/ui/Image.tsx` and `src/app/(frontend)/design-test/page.tsx`. No new npm dependencies.

**Build verification:**
- `npx tsc --noEmit` clean.
- `npm run build` exit 0, `/design-test` statically generated.
