TASK ID: TASK-006
PHASE: Phase 2
GOAL: Build a `Card` primitive at `src/components/ui/Card.tsx` — the second storefront component on top of the design tokens established in TASK-005. Card is a styled container; later tasks will compose it into ProductCard, content blocks, etc.

CONTEXT:
TASK-005 landed brand color tokens, type scale, Fraunces + Inter typography, and a Button primitive. Card is next because the homepage and product grid will both need it before anything else — product tiles are Card + image + text, mission/story sections are Card + heading + body.

Keep Card opinion-light. It is a styled container, nothing more. Consumers compose it with `<Link>`, `<Image>`, headings, and text as needed. Card does not handle click events, navigation, or content layout beyond providing padding. If you find yourself adding `onClick`, a heading prop, or compound subcomponents (`Card.Header` etc.), stop — that's out of scope for this task.

FILES TO CREATE OR MODIFY:
- `src/components/ui/Card.tsx` — new file. Sibling of `Button.tsx`. Server component (no `"use client"` directive needed; Card has no event handlers and no client state).
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with a "Cards" section. Do not rewrite the existing Button sections; add Card content below them.

REQUIREMENTS:

**1. Card component.**
- File: `src/components/ui/Card.tsx`. Render as a `<div>`. Default-export the component, also export named.
- **Do NOT add `"use client";`.** Card is a server-renderable container. Consumers can wrap it in client components or use it inside server pages — both work. Adding `"use client"` would unnecessarily push Card into client bundles and force every importer to also be client.
- Extend `React.ComponentPropsWithoutRef<"div">` and spread all native `<div>` props. Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLDivElement>`) — same idiom as Button, do NOT use `React.forwardRef`.
- Inline `cx` helper at the top of the file (same shape as Button.tsx). **No new dependencies.**

**2. Variants (`variant` prop).**
- `"elevated"` (default): warm subtle shadow, no border, background = `bg-neutral-cream` (same as page background; the shadow alone creates lift — feels warm and intentional, not floating). Shadow should use a warm tint derived from `--color-neutral-ink` at low opacity, not a cool gray. An inline Tailwind shadow like `shadow-[0_4px_12px_rgba(42,36,32,0.08)]` is fine, or define a `--shadow-card` token in `@theme` and use `shadow-card` — your call, flag the choice in output notes.
- `"bordered"`: `1px` border using a soft warm tone (e.g. `border-neutral-ink/15` or a brand-gold tint at low opacity), no shadow, background = `bg-neutral-cream` or transparent — pick one and justify in notes.
- `"flat"`: no border, no shadow, transparent background. Used when the parent already provides framing (e.g. nested cards, or grid items that just need rounded corners + padding).
- All three variants share: `rounded-lg` corners (or `rounded-xl` if you think it feels more artisan — your call, flag in notes).

**3. Padding (`padding` prop).**
- `"none"` → `p-0`
- `"sm"` → `p-4` (16px)
- `"md"` (default) → `p-6` (24px)
- `"lg"` → `p-8` (32px)

Padding applies uniformly to all sides. If a consumer needs asymmetric padding (e.g. product card with full-bleed image at top), they pass `padding="none"` and apply padding themselves to the content children.

**4. Accessibility.**
- Card itself has no special a11y requirements — it's a generic container. Do NOT add `role="..."`, `aria-label`, etc. by default. Consumers add semantics when they need them (e.g. wrapping content in an `<article>` or adding `role="region" aria-labelledby="..."` for landmark cards).

**5. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing Button sections, titled "Cards" (use the same `font-serif text-h2 mb-6` heading style as the existing sections for consistency).
- Within the Cards section, render two sub-groups:
  1. **Variants × padding grid:** all three variants (`elevated`, `bordered`, `flat`) at `md` padding, each containing a short paragraph of placeholder content (a heading and a line of body text) so the rendering shows real text inside the card. Lay them out in a 3-column grid on `md`+ screens, stacked on mobile.
  2. **Padding scale:** one elevated card per padding size (`none`, `sm`, `md`, `lg`), each labeled with its padding prop value. This makes it easy to eyeball whether the padding scale feels right.
- Use the brand fonts (`font-serif` for headings inside the test cards, `font-sans text-body` for body) so the test cards look like the design system, not unstyled HTML.

OUT OF SCOPE:
- Do not build other primitives (Input, Badge, Link, etc.).
- Do not build a `ProductCard` component. That's a later task that will compose Card + Image + headings + price formatting.
- Do not add interactive props to Card (`onClick`, `href`, `as`, `interactive`, hover-lift, etc.). Card is a container, not a button.
- Do not add compound subcomponents (`Card.Header`, `Card.Body`, `Card.Footer`). YAGNI for this task.
- Do not touch any blocklisted paths (see CLAUDE.md "Blocklist" section).
- Do not install new npm dependencies.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- After deploy, `/design-test` shows the existing Button content unchanged, plus a new "Cards" section with the variants grid and the padding scale.
- The three card variants are visually distinguishable (elevated has lift, bordered has outline, flat has neither).
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm Card stayed a server component (no `"use client"`).
- State the shadow approach you shipped for `elevated`: inline arbitrary value, custom `--shadow-card` token, or Tailwind default. Briefly justify.
- State the background choice for `bordered` (cream vs. transparent) and why.
- State the corner radius you settled on (`rounded-lg` vs. `rounded-xl`) and why.
- Flag any place you were uncertain about the variant or padding API.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

**Server component confirmation:**
- Card is a server component — no `"use client"` directive. It extends `React.ComponentPropsWithoutRef<"div">`, accepts `ref` as a regular prop (React 19 idiom), and renders a plain `<div>`. No event handlers, no state, no client-only APIs.

**Shadow approach for `elevated`:**
- Shipped an inline Tailwind arbitrary value: `shadow-[0_4px_12px_rgba(42,36,32,0.08)]`. Uses the warm `neutral-ink` base (#2A2420) at low opacity instead of a cool gray. Chose inline over a custom `@theme` token because the shadow is Card-specific and self-contained; defining a global token felt premature for a single primitive. Easy to promote to `@theme` later if other components need the same shadow.

**Background choice for `bordered`:**
- `bg-neutral-cream`. Chose cream over transparent so that `bordered` and `elevated` feel like siblings in the same family — both are framed cards with visible surfaces. Transparent would risk looking broken or unfinished if the parent background differs from cream (e.g. a tinted section background). Consumers can always override via `className` if they need transparent.

**Corner radius:**
- `rounded-lg` (0.5rem / 8px). Chose over `rounded-xl` because the padding values (16px–32px) already provide plenty of breathing room, and a tighter radius feels more restrained and artisan — less bubbly, more like craft paper or hand-cut edges. `rounded-xl` felt too app-like.

**Variant / padding API uncertainty:**
- No major uncertainty. The flat prop pattern (`variant` + `padding`) felt obvious after Button set the precedent. One minor call: considered whether `padding` should be called `pad` for brevity, but `padding` matches the CSS property name and is clearer for consumers. Stuck with `padding`.

**Blocklist and deps confirmation:**
- Did not touch any blocklisted paths. Work stayed within `src/components/ui/Card.tsx` and `src/app/(frontend)/design-test/page.tsx`. No new npm dependencies.

**Build verification:**
- `npx tsc --noEmit` clean.
- `npm run build` exit 0, `/design-test` statically generated.
