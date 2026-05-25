TASK ID: TASK-010
PHASE: Phase 2
GOAL: Build a `ProductCard` composition at `src/components/storefront/ProductCard.tsx` — the first real composition over the design-system primitives (Card + Image + Badge + heading + price text). This is what product grids on the homepage, category pages, and search results will render.

CONTEXT:
TASK-005 through TASK-009 landed all five foundational primitives (tokens + Button + Card + Input + Badge + Image). ProductCard is the first composition that proves the primitives work together end-to-end. It also establishes the pattern for `src/components/storefront/` — composed components live there, distinct from `src/components/ui/` (primitives) and `src/components/admin/` (Payload admin).

This task uses hardcoded sample data — no Payload wiring yet. The Payload `Products` collection exists but has no real entries, and Phase 2 storefront composition should be testable independently of the data layer. A later task will swap hardcoded props for real `Product` documents fetched from Payload.

Keep ProductCard intentionally generic: it's a presentational component that receives product data as props and renders. No data fetching inside ProductCard. No `next/link` wrapping inside ProductCard either — consumers decide whether the whole tile is a link, just the image, just the title, etc.

FILES TO CREATE OR MODIFY:
- `src/components/storefront/ProductCard.tsx` — new file in a new folder. Establishes `src/components/storefront/` as the home for composed presentational components.
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with a "ProductCard" section below the Images section. As before: do not rewrite earlier sections.

REQUIREMENTS:

**1. ProductCard component.**
- File: `src/components/storefront/ProductCard.tsx`. Render as a `<Card>` with `variant="flat"`, `padding="none"` (the image goes full-bleed at the top; padding is applied to the text area below it).
- **Server component (no `"use client"`)** — ProductCard is purely presentational. Consumers wrap it in `<Link>` or add `onClick` handlers themselves; ProductCard doesn't take interactive props.
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLDivElement>`).
- Inline `cx` helper at the top of the file. **No new dependencies.**

**2. Props (curated, not spread).**
- `name: string` — required. Product name. Rendered as an `<h3>` in `font-serif text-h3` below the image.
- `priceCents: number` — required. Integer cents (matches Payload schema and the `MoneyField` convention — see CLAUDE.md "Money fields"). The component formats this for display as `$XX.XX` USD.
- `imageSrc: string` — required. The product image URL. Forwarded to `<Image src={...}>`.
- `imageAlt: string` — required. Forwarded to `<Image alt={...}>`. **Do not default to the product name** — the image alt should describe the image, not duplicate the visible name underneath. Consumers pass meaningful alt text (or `""` if the image is decorative because the name conveys everything).
- `badge?: { label: string; variant: "neutral" | "primary" | "accent" | "muted" }` — optional. When set, renders a `<Badge>` overlaid on the top-left of the image (absolutely positioned with a small inset). When omitted, no badge renders. Examples of consumer mappings: `{ label: "Sold out", variant: "muted" }`, `{ label: "Sale", variant: "primary" }`, `{ label: "New", variant: "accent" }`. ProductCard does not have its own semantic understanding of these — consumers decide.
- `className?: string` — applied to the outer Card.

**3. Layout structure.**
- Outer: `<Card variant="flat" padding="none" className={cx("group", className)} ref={ref}>` (the `group` utility lets future tasks add hover effects scoped to the whole card).
- Image area: `<div className="relative">` containing `<Image src={imageSrc} alt={imageAlt} aspectRatio="portrait" rounded="none" />`. The portrait ratio (3:4) fits clothing photography best.
  - Use `rounded="none"` on the Image because the parent Card's corners do the rounding (when we eventually add `rounded` to flat Card). Right now flat Card is also `rounded-lg`, so we want the image to not double-up.
  - Wait — Card currently always applies `rounded-lg` regardless of variant. So the Image inside needs `rounded="none"` to avoid the inner rounded corners clipping weirdly with the outer rounded corners. The Card's `overflow-hidden` (when we add it) would clip the image, but Card doesn't have `overflow-hidden` today. Address this: **add `overflow-hidden` to the outer Card via the `className` prop** (`className={cx("group overflow-hidden", className)}`). This ensures the image's square top corners get clipped by Card's rounded corners.
  - If `badge` is set: render `<Badge variant={badge.variant} size="sm" className="absolute top-2 left-2 z-10">{badge.label}</Badge>` inside the image's relative wrapper.
- Text area: `<div className="p-4">` (matches Card's `sm` padding scale). Inside:
  - `<h3 className="font-serif text-h3 mb-1">{name}</h3>`
  - `<p className="font-sans text-body text-neutral-ink/80">{formatPriceCents(priceCents)}</p>`

**4. Price formatting helper.**
- Inline in the same file (do NOT extract to a shared utility yet — there's no second consumer and CLAUDE.md says we'll consolidate once a pattern is settled).
- Function: `function formatPriceCents(cents: number): string`.
- Implementation:
  ```ts
  function formatPriceCents(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }
  ```
- Edge cases not worth handling here: cents being negative, NaN, or non-integer. Assume valid input from the schema.

**5. Accessibility.**
- The `<h3>` carries the product name into the document outline naturally.
- The badge's `top-2 left-2 absolute z-10` overlay sits on top of the image. The badge is purely visual context — the product name communicates the same information textually below. Do NOT add `aria-label` or `role="status"`.
- No special semantics on the outer Card. When consumers wrap ProductCard in a `<Link>` to the product detail page, Link provides the interactive semantics.

**6. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing Image sections, titled "ProductCard" (same `font-serif text-h2 mb-6` heading style).
- Within the ProductCard section, render two sub-groups:
  1. **Grid (typical product grid):** four ProductCards in a 4-column grid on `lg`+, 2-column on `sm`+, 1-column on mobile. Each with `name`, `priceCents`, `imageSrc` (reuse the same local migrated image used in the Images section — pull the constant up if needed), and meaningful `imageAlt`. Use placeholder names and varied prices, e.g.:
     - "Wool Cardigan", `priceCents: 14500`, no badge
     - "Silk Scarf", `priceCents: 6500`, `badge: { label: "New", variant: "accent" }`
     - "Handwoven Sweater", `priceCents: 22000`, `badge: { label: "Sold out", variant: "muted" }`
     - "Cotton Tunic", `priceCents: 9500`, `badge: { label: "Sale", variant: "primary" }`
  2. **Single, larger:** one ProductCard at a wider max-width (`max-w-sm` say) so we can eyeball the typography and spacing at a larger scale. Any of the above four is fine.
- Use the design-system tokens for any wrapper labels.

OUT OF SCOPE:
- Do NOT wrap ProductCard in `<Link>` or `<a>`. Linking is the consumer's responsibility — the homepage will likely wrap whole cards in `<Link>`, but a search-results page may want only the image and title linked. Don't bake in a choice.
- Do NOT add hover effects (scale, shadow, image zoom). That's a polish task for later — the `group` class is added so future tasks can add `group-hover:*` utilities.
- Do NOT add quick-add-to-cart buttons, wishlist hearts, or any interactive controls. Those are separate compositions.
- Do NOT add variant pickers (size/color). Most products are variant-less; the ones with variants are handled on the product detail page, not the tile.
- Do NOT fetch any data. ProductCard receives props; the parent is responsible for fetching.
- Do NOT extract `formatPriceCents` to a shared utility yet — keep it file-local.
- Do NOT touch any blocklisted paths (see CLAUDE.md "Blocklist"). In particular: no MoneyField interaction, no Orders/Stripe/checkout.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- After deploy, `/design-test` shows the existing primitives unchanged, plus a new "ProductCard" section with the 4-card grid and the single larger card. Prices render as `$XX.XX` USD. The badge sits absolutely positioned at the top-left of the image for the cards that have one. The image fills the top portion of the card via portrait aspect ratio + object-cover, with no awkward gap between image and card edge.
- TypeScript blocks `<ProductCard name="..." />` (missing required props) at compile time.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm ProductCard is a server component (no `"use client"`).
- Confirm `formatPriceCents` is file-local (not extracted to a shared util).
- Confirm you added `overflow-hidden` to the outer Card so the image's square corners get clipped by Card's rounded ones.
- Flag any place you were uncertain about the prop API or the badge overlay positioning.
- Confirm `priceCents` is documented as integer cents (matching Payload schema), not decimal dollars.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

**Server component confirmation:**
- ProductCard is a server component — no `"use client"` directive. It composes Card, Image, and Badge (all server components) into a presentational tile. No state, no effects, no event handlers.

**`formatPriceCents` location:**
- File-local in `src/components/storefront/ProductCard.tsx`. Not extracted to a shared utility. Uses `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })` with `cents / 100`. Ready for consolidation in Phase 4 once a second consumer appears.

**`overflow-hidden` on outer Card:**
- Added via `className={cx("group overflow-hidden", className)}` on the Card wrapper. This clips the Image's `rounded="none"` square corners to match Card's `rounded-lg`, avoiding a double-corner effect where the image sticks out past the card boundary.

**Badge overlay positioning:**
- Badge is rendered inside the image's `relative` wrapper with `absolute top-2 left-2 z-10`. The `z-10` ensures it sits above the Image component. `top-2 left-2` provides a 0.5rem inset that feels intentional without crowding the corner. Considered `top-3 left-3` for more breathing room, but `top-2` matches the density of typical e-commerce product tiles.

**Prop API uncertainty:**
- No major uncertainty. The curated prop pattern (no spread) felt right for a composition component — ProductCard shouldn't silently accept arbitrary div props and pass them to Card, since that creates an unclear contract. One call: `imageAlt` is separate from `name` and not defaulted. This is intentional per the spec — the image alt describes the visual, not the product name.

**`priceCents` documentation:**
- Documented as integer cents, matching the Payload schema (`Products.basePrice` stores integer cents). `$145.00` is passed as `14500`, `$65.00` as `6500`, etc. Consumers are responsible for passing cents, not dollars.

**Blocklist and deps confirmation:**
- Did not touch any blocklisted paths. Work stayed within `src/components/storefront/ProductCard.tsx` and `src/app/(frontend)/design-test/page.tsx`. No new npm dependencies.

**Build verification:**
- `npx tsc --noEmit` clean.
- `npm run build` exit 0, `/design-test` statically generated.
