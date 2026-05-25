TASK ID: TASK-020
PHASE: Phase 2
GOAL: Style rich-text body content (the output of `<RichText>` from `@payloadcms/richtext-lexical/react`) so paragraphs, lists, blockquotes, and links look on-brand instead of using browser defaults. Touches the two existing consumers — the CMS Pages renderer (`/[slug]`) and the PDP description (`/products/[slug]`) — and any future page that renders Payload rich text.

CONTEXT:
TASK-016 landed the CMS Pages renderer, with a known follow-up flagged in the merge commit: rich-text body content was unstyled because `@tailwindcss/typography` isn't installed. The same issue affects TASK-018's PDP description. Right now on `/about`, a Lexical-authored paragraph reads in body sans (good — global `font-sans` inheritance), but lists have no bullets visible from a distance, blockquotes have no left border, links look like generic `<a>` tags with default underlines, and paragraph spacing is collapsed.

Two paths considered:

- **Install `@tailwindcss/typography`** — the standard solution, lots of features. Adds a dependency and the default `prose` styles need overriding to use our brand colors (default is grayscale).
- **Hand-roll a custom prose ruleset in `globals.css`** — no dependency, scoped to our brand from day one, simpler since artisan-storefront content is short (descriptions, About, FAQ — not technical docs with tables, code blocks, footnotes).

**Go with the hand-rolled approach.** The plugin's full breadth (code-block syntax highlighting, table styling, etc.) is overkill for the content shape we'll have. A ~50-line CSS block in `globals.css` covers it.

Class name choice: `.prose`. Standard convention, what developers expect. No conflict with the plugin since we don't have it installed. If we ever install `@tailwindcss/typography` later, we'd either rename or replace this.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/globals.css` — add a `.prose` ruleset covering the elements `<RichText>` actually emits.
- `src/app/(frontend)/[slug]/page.tsx` — wrap the `<RichText>` in a `.prose` div.
- `src/app/(frontend)/products/[slug]/page.tsx` — wrap the `<RichText>` in a `.prose` div. (The existing `<div className="font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">` wrapper around RichText is the natural place to add the `prose` class — combine them, don't add a nested wrapper.)

REQUIREMENTS:

**1. The `.prose` ruleset in `globals.css`.**
Add it in a new CSS block, **outside** the `@theme { ... }` blocks (these are component-style rules, not theme tokens). Place it below the existing `body` and `h1, h2, h3, h4, h5, h6` rules.

Target descendant selectors so the rules cascade to whatever Lexical emits. Spec:

- **Paragraph spacing.** `.prose p` gets `margin-top: 1em; margin-bottom: 1em;`. Consecutive paragraphs get visible vertical separation. The first paragraph's `margin-top` should be zeroed (`.prose > p:first-child { margin-top: 0; }`) so it sits flush with whatever heading or wrapper precedes the prose.

- **Headings inside prose.** Lexical's editor allows authoring `<h1>`–`<h4>`. Inside `.prose`, treat:
  - `.prose h1` → `font-family: var(--font-serif); font-size: var(--text-h1); margin-top: 2em; margin-bottom: 0.75em;`
  - `.prose h2` → `font-family: var(--font-serif); font-size: var(--text-h2); margin-top: 1.75em; margin-bottom: 0.5em;`
  - `.prose h3` → `font-family: var(--font-serif); font-size: var(--text-h3); margin-top: 1.5em; margin-bottom: 0.5em;`
  - `.prose h4` → `font-family: var(--font-serif); font-size: 1.125rem; margin-top: 1.25em; margin-bottom: 0.5em;`
  - `.prose > h1:first-child, .prose > h2:first-child, .prose > h3:first-child, .prose > h4:first-child { margin-top: 0; }` so a content page that opens with a Lexical heading doesn't get a huge gap.

- **Lists.** Standard styled bullets and numbers, padding-left for hang:
  - `.prose ul` → `list-style: disc; padding-left: 1.5em; margin-top: 1em; margin-bottom: 1em;`
  - `.prose ol` → `list-style: decimal; padding-left: 1.5em; margin-top: 1em; margin-bottom: 1em;`
  - `.prose li` → `margin-top: 0.25em; margin-bottom: 0.25em;` (slight space between items, not full-paragraph)
  - `.prose li::marker` → `color: var(--color-brand-gold-600);` — the bullet/number gets the brand-gold accent. Subtle but on-brand.

- **Blockquotes.** Left border + italic + indentation:
  - `.prose blockquote` →
    - `border-left: 3px solid var(--color-brand-gold-400);`
    - `padding-left: 1.25em;`
    - `font-style: italic;`
    - `color: var(--color-neutral-ink);` (NOT the dimmed `/70` body color — blockquotes are emphasized, not de-emphasized)
    - `margin-top: 1.25em; margin-bottom: 1.25em;`
  - `.prose blockquote p` should not get extra top/bottom margin inside the quote (since the blockquote already provides its own spacing). Set `.prose blockquote p { margin: 0; }`.

- **Links.** Brand-red, underlined by default (signals link-ness), darker on hover:
  - `.prose a` → `color: var(--color-brand-red-700); text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px;`
  - `.prose a:hover` → `color: var(--color-brand-red-800);`
  - `.prose a:focus-visible` → matches the rest of the site's focus story. Add the same gold ring: `outline: 2px solid var(--color-brand-gold-400); outline-offset: 2px; border-radius: 2px;`

- **Inline emphasis** (Lexical's bold/italic):
  - `.prose strong, .prose b` → `font-weight: 600;` (matches our `font-medium` Tailwind utility — the brand doesn't lean very heavy)
  - `.prose em, .prose i` → `font-style: italic;` (browser default is fine; this just ensures it's set)

- **Horizontal rule** (Lexical's `<hr>`):
  - `.prose hr` → `border: 0; border-top: 1px solid var(--color-neutral-ink); opacity: 0.15; margin-top: 2em; margin-bottom: 2em;`

- **Inline code** (in case the admin uses code formatting — rare but Lexical supports it):
  - `.prose code` → `font-family: ui-monospace, monospace; font-size: 0.95em; background-color: var(--color-neutral-ink); color: var(--color-neutral-cream); padding: 0.1em 0.35em; border-radius: 3px; opacity: 0.85;` — subtle dark pill, readable.
  - **Do NOT** add styles for `<pre>` code blocks. The Lexical editor in our config doesn't enable the code-block feature; we'd be styling something that never renders. Add this later when/if code blocks are needed.

- **Images inside rich text** (Lexical can embed images via uploads — though our schema currently keeps images as a separate `image` block in Pages, not inline):
  - **Do NOT add `.prose img` rules.** Rich-text inline images aren't part of our content model yet. If they ever appear, deal with them then.

**2. Wrap consumers in `.prose`.**

`src/app/(frontend)/[slug]/page.tsx` — find the existing rich-text block render:
```tsx
if (block.blockType === "richText") {
  return <RichText key={i} data={block.content} />;
}
```
Wrap it:
```tsx
if (block.blockType === "richText") {
  return (
    <div key={i} className="prose">
      <RichText data={block.content} />
    </div>
  );
}
```

`src/app/(frontend)/products/[slug]/page.tsx` — the description wrapper currently is:
```tsx
{product.description && (
  <div className="font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">
    <RichText data={product.description} />
  </div>
)}
```
Add `prose` to the same wrapper (don't nest a second div):
```tsx
{product.description && (
  <div className="prose font-sans text-body text-neutral-ink/80 leading-relaxed mb-8">
    <RichText data={product.description} />
  </div>
)}
```
The Tailwind utilities (`font-sans`, `text-body`, `text-neutral-ink/80`, `leading-relaxed`) provide the BASE typography for body text; `.prose` adds the rich-text-specific rules layered on top. The PDP-specific `text-neutral-ink/80` will color paragraphs slightly dimmer than the CMS pages context (which uses the page's default `neutral-ink`) — that's intentional, the PDP description is supporting copy, the CMS page is the main copy.

**3. Don't touch anything else.**
- Do NOT modify `<RichText>` — it's a Payload primitive.
- Do NOT add a `Prose` React component wrapper. A CSS class is simpler.
- Do NOT install `@tailwindcss/typography`.

OUT OF SCOPE:
- Code blocks (`<pre>`) — Lexical config doesn't emit these.
- Tables — same reason.
- Inline images inside rich text.
- Footnotes, definitions, citations — overkill.
- Light/dark variants of prose styling. Site is light-mode only.
- A `prose-sm` / `prose-lg` size scale. One size only for now.
- Touching anything outside the three files listed.
- New npm dependencies.
- Touching blocklisted paths.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy, the `/about` Page (assuming Neal has authored at least one rich-text block with at least a paragraph plus either a list, a blockquote, or a link):
  - Paragraphs have visible vertical spacing between them.
  - Lists show disc/decimal markers in the brand-gold tone.
  - Blockquotes have a left gold border and italic body.
  - Links are brand-red-700 with an underline; hover darkens them.
  - Headings (if any inside rich text) are serif at h1/h2/h3/h4 sizes.
- `/products/test-romper` description (currently just "This is a test product" — short paragraph) renders with the same `.prose` styling — paragraph spacing applies, the dim `text-neutral-ink/80` from the existing wrapper holds.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `.prose` is defined as descendant selectors in `globals.css` (NOT as a Tailwind utility via `@layer` or `@theme`).
- Confirm both consumers (CMS Pages renderer + PDP) wrap RichText in a `.prose` element (and that the PDP combines `.prose` with the existing utility classes rather than nesting wrappers).
- State whether you needed to add anything beyond the spec's rule list to make it look right (e.g., extra padding, different bullet color). Flag any judgment calls.
- Confirm you tested visually that `/about` and `/products/test-romper` look better after the change. (If you can't deploy, just `npm run check` is acceptable but flag that visual verification is reviewer's job.)
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`.prose` is defined as descendant selectors in `globals.css`** — outside the `@theme` and `@theme inline` blocks, below the existing `body` and `h1-h6` rules. No `@layer` or `@theme` utility involved.
- **Both consumers wrap `<RichText>` in a `.prose` element:**
  - CMS Pages renderer (`/[slug]/page.tsx`): `<div className="prose"><RichText ... /></div>` — new wrapper added.
  - PDP (`/products/[slug]/page.tsx`): `.prose` combined with existing utility classes on the same `<div>`: `className="prose font-sans text-body text-neutral-ink/80 leading-relaxed mb-8"`. No nested wrapper.
- **No extra rules added beyond the spec's list.** The rule set covers paragraphs, headings h1-h4, lists (ul/ol/li), blockquotes, links, inline emphasis (strong/em), horizontal rule, and inline code. Judgment calls all followed the spec exactly.
- **Visual verification:** I did not deploy to verify `/about` and `/products/test-romper` visually; `npm run check` passes and the CSS rules are straightforward descendant selectors. Visual verification is the reviewer's job.
- **No blocklisted paths touched.**
- **No new npm dependencies added.** `@tailwindcss/typography` was deliberately not installed.
- **`npm run check` passes with exit 0.**
