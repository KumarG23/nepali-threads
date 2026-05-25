TASK ID: TASK-008
PHASE: Phase 2
GOAL: Build a `Badge` primitive at `src/components/ui/Badge.tsx` — small inline label component used for product status (sold out, new, sale), category tags, and other compact indicators. The fourth and likely last "small primitive" before we start composing real storefront sections.

CONTEXT:
TASK-005 / 006 / 007 landed Button, Card, and Input. Next foundational need: a Badge for product tiles. Product tiles will compose Card + Image + headings + Badge + price formatting; we already have Card, and Image/composition come next. Badge unblocks that workflow.

Keep Badge intentionally aesthetic-only — variants name colors/emphasis, not semantic meaning. Consumers map "sold out" → which-variant themselves. This keeps the primitive reusable across categories, tags, status labels, etc. without baking in product-specific vocabulary.

FILES TO CREATE OR MODIFY:
- `src/components/ui/Badge.tsx` — new file. Sibling of `Button.tsx`, `Card.tsx`, `Input.tsx`. **Server component (no `"use client"`)** — Badge is a static styled `<span>`, no event handlers, no state.
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with a "Badges" section. Do not rewrite the existing Button, Card, or Input sections; add Badge content below them.

REQUIREMENTS:

**1. Badge component.**
- File: `src/components/ui/Badge.tsx`. Render as a `<span>` (inline by default — Badges are meant to sit next to other content, not break flow). Default-export the component, also export named.
- **No `"use client";`** — server-renderable.
- Extend `React.ComponentPropsWithoutRef<"span">` and spread all native span props (`onClick` is technically possible from a consumer, but Badge itself doesn't add it — if a consumer passes one, the span receives it as a normal DOM event).
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLSpanElement>`) — same idiom as the other primitives.
- Inline `cx` helper at the top of the file (same shape as the other primitives). **No new dependencies.**

**2. Variants (`variant` prop).**
- `"neutral"` (default): subtle ink-tinted background + ink text. Use `bg-neutral-ink/10 text-neutral-ink`. Reads as a quiet label — good for category tags, secondary info.
- `"primary"`: filled brand-red background + cream text. Use `bg-brand-red-600 text-neutral-cream`. High emphasis — good for "Sale" or critical callouts. Same red as primary Button so the brand reads consistently.
- `"accent"`: filled brand-gold background + ink text. Use `bg-brand-gold-600 text-neutral-ink`. Mid-emphasis warm callout — good for "New" or featured.
- `"muted"`: transparent background, neutral-ink/60 text, with a 1px `border border-neutral-ink/20`. Reads as deemphasized — good for "Sold out" or archived states where you want to *show* the label but not draw attention.

Avoid semantic-named variants like `"soldOut"` or `"new"`. Consumers decide which aesthetic variant maps to which semantic case.

**3. Sizes (`size` prop).**
- `"sm"` (default): `px-2 py-0.5 text-[0.6875rem]` (~11px text). Used for in-corner badges on product tiles, inline tags next to product names.
- `"md"`: `px-2.5 py-1 text-small`. Used when the badge is standalone or needs more presence.

Two sizes are enough. If a third comes up later, add it then.

**4. Shape.**
- Pill-shaped: `rounded-full`. Pills read as "label" more clearly than rectangles, which read as "button."
- All variants share: `inline-flex items-center font-sans font-medium leading-none` so the badge is vertically centered and doesn't inherit weird line-height from surrounding text.

**5. Accessibility.**
- No special a11y attributes on Badge itself. It's a styled inline label — the surrounding context (e.g. `<article aria-label="Product: ... — Sold out">` or visible heading text) provides the semantics. Do NOT add `role="status"` by default (that announces changes to screen readers, which is wrong for a static label).
- One exception: when a consumer uses a Badge purely as visual decoration (e.g. a colored dot with no text), they should add `aria-hidden="true"` themselves. The primitive doesn't enforce this.

**6. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing Input sections, titled "Badges" (use the same `font-serif text-h2 mb-6` heading style).
- Within the Badges section, render two sub-groups:
  1. **Variants × Sizes:** a 4 × 2 grid (or two rows of four) showing each variant at each size. Label each cell with the variant + size. Make sure all eight badges are visible and visually distinct.
  2. **In context:** one example showing badges next to surrounding text — e.g. a heading line `<h3 className="font-serif text-h2">Wool Cardigan <Badge variant="accent">New</Badge></h3>` and a paragraph line `<p>Sweater <Badge variant="muted">Sold out</Badge></p>`. Two or three examples are enough — the point is to show the badge sits inline correctly and doesn't break line height.

OUT OF SCOPE:
- Do not add semantic-named variants (`"soldOut"`, `"new"`, `"sale"`, `"featured"`, etc.). Aesthetic variants only.
- Do not add icon support, dot/dot-only badges, dismiss buttons, or close affordances. These are Tag/Chip concerns, not Badge.
- Do not build a `Tag` component or any interactive filter-chip primitive.
- Do not modify Button, Card, or Input.
- Do not touch any blocklisted paths (see CLAUDE.md "Blocklist").
- Do not install new npm dependencies.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- After deploy, `/design-test` shows the existing Button, Card, and Input sections unchanged, plus a new "Badges" section with the variants × sizes grid and the in-context examples.
- All four variants are visually distinct from one another.
- The in-context examples show the badge sitting inline next to text without breaking the line.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm Badge is a server component (no `"use client"`).
- Confirm the variants are aesthetic, not semantic (no `"soldOut"` etc.).
- State whether you needed any custom Tailwind arbitrary values (like the `text-[0.6875rem]` for sm) or if Tailwind defaults covered it.
- Flag any place you were uncertain about the variant aesthetics or API.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

**Server component confirmation:**
- Badge is a server component — no `"use client"` directive. It renders a plain `<span>` with Tailwind utility classes, accepts `ref` as a regular prop (React 19 idiom), and spreads native span props. No state, no effects, no event handlers.

**Variant naming:**
- All four variants are aesthetic, not semantic: `neutral`, `primary`, `accent`, `muted`. No `soldOut`, `new`, `sale`, or `featured`. Consumers map semantic meaning to aesthetic variant themselves (e.g. `<Badge variant="accent">New</Badge>`).

**Custom Tailwind arbitrary values:**
- One arbitrary value used: `text-[0.6875rem]` for the `sm` size (~11px). Tailwind v4's default text scale jumps from `text-xs` (0.75rem / 12px) to `text-sm` (0.875rem / 14px), with nothing in between. 11px is a common compact badge size that sits between the two defaults, so the arbitrary value was necessary. The `md` size uses the standard `text-small` token.

**Variant aesthetics uncertainty:**
- No major uncertainty. The spec gave exact Tailwind classes for each variant, so the implementation was straightforward. One minor consideration: the `muted` variant uses `border-neutral-ink/20` with transparent background. Considered using `bg-neutral-ink/5` for a very subtle fill, but the transparent + border approach reads more clearly as "deemphasized" and matches the spec exactly.

**API uncertainty:**
- None. The flat prop pattern (`variant` + `size`) is consistent with Button and Card. Two sizes felt right — `sm` for inline/product tiles, `md` for standalone labels.

**Blocklist and deps confirmation:**
- Did not touch any blocklisted paths. Work stayed within `src/components/ui/Badge.tsx` and `src/app/(frontend)/design-test/page.tsx`. No new npm dependencies.

**Build verification:**
- `npx tsc --noEmit` clean.
- `npm run build` exit 0, `/design-test` statically generated.
