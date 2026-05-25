TASK ID: TASK-014
PHASE: Phase 2
GOAL: Build a `Header` composition at `src/components/storefront/Header.tsx` — the site-wide top bar with brand mark, primary nav, and a cart-button placeholder. Second site-chrome component; pairs with Footer to bracket every real page.

CONTEXT:
TASK-013 landed Footer. Header is the other half of the site-chrome pair. Once Header is in, we have everything we need to build a page-layout shell (Header + main + Footer) and start assembling the homepage, product detail, category, and other pages.

Decisions baked into this spec to keep things small:

- **No mobile-menu drawer in this task.** Implementing a drawer means body scroll lock, focus trap, escape-key handling, transition animation, and aria-modal — that's a separate component on its own. For now, Header uses a responsive layout where nav links sit inline on `md`+ and **stack vertically below the brand mark** on smaller screens. Looks dated but functional. A later TASK-NNN will swap the stacked mobile layout for a hamburger + drawer.
- **Cart icon is a placeholder.** Renders a count-aware cart button that shows `(0)` and doesn't navigate anywhere yet. Cart state + cart page come in Phase 3. The placeholder lets the layout look complete and unblocks page assembly.
- **Nav links use placeholder hrefs** like Footer — `/shop`, `/about`, etc. Most 404 until those pages exist. Copy/links can be updated later.

FILES TO CREATE OR MODIFY:
- `src/components/storefront/Header.tsx` — new file. Sibling of `Footer.tsx` etc. **Server component (no `"use client"`)** — Header has no interactive state in this task. (The future cart-count badge will be reactive and may need client wrapping; we'll address that in the cart task.)
- `src/app/(frontend)/design-test/page.tsx` — extend with a "Header" section above the existing Footer section (or anywhere that makes visual sense — Header at the top of the design-test makes the page feel real; alternatively keep them adjacent at the bottom for review-by-pair convenience).

REQUIREMENTS:

**1. Header component.**
- File: `src/components/storefront/Header.tsx`. Render the outermost element as a `<header>`. Default-export the component, also export named.
- **No `"use client";`.** Server-renderable.
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLElement>`).
- Inline `cx` helper at the top of the file. **No new dependencies.**

**2. Props (curated).**
- `cartCount?: number` — optional, default `0`. When > 0, renders the cart button label as `Cart (N)`. When 0, just `Cart`. (Real cart state will be threaded through later; for now this is just a presentation prop.)
- `className?: string` — applied to the outer `<header>`.

That's the entire props surface. No `navLinks` prop, no `brandHref` override, no `transparent` variant. Hardcode the nav structure — opinionated and small.

**3. Layout structure.**
- Outer `<header className={cx("bg-neutral-cream border-b border-neutral-ink/10", className)} ref={ref}>`. Cream background matches the page (Header sits flush with content), with a subtle bottom border to separate it from the page body when scrolled.
- Inner container: `<div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-4 lg:py-5">`. Same horizontal-padding rhythm as Footer for visual consistency.
- Inside, in flex layout:
  - **Brand mark** on the left: `<Link href="/" className="font-serif text-h2 text-neutral-ink hover:text-brand-red-700 transition-colors">nepali threads</Link>`. Lowercase, serif, links to home.
  - **Nav links** in the middle (or right; see below).
  - **Cart button** on the right.

  Responsive layout:
  - On `md`+ screens: brand + nav + cart all on one horizontal row. Flexbox `flex items-center justify-between` for the row; nav links sit in their own flex group between brand and cart, OR nav on the right with cart inline at the far end. Pick one and flag the choice in output notes.
  - On screens below `md`: stack vertically. Brand on top (centered or left-aligned — your call), then nav links in a horizontal row below (centered, can wrap if needed), then cart at the bottom (full-width or inline-right — your call). Lots of valid layouts here; pick the one that reads cleanest at typical mobile widths (~375px).

**4. Nav links — hardcode these.**
- Render each as a `<Link>` from `next/link`.
- Use a shared class string for visual consistency:
  ```
  font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors
  ```
- Links:
  1. `Shop` → `/shop`
  2. `New` → `/shop?filter=new` (matches the "New arrivals" Footer link)
  3. `Story` → `/about`

Three links is plenty for a small artisan storefront. The Footer covers the long-tail destinations.

**5. Cart button.**
- Render as a `<Link href="/cart">`. (Will 404 until cart exists. That's fine.)
- Styling: small button-like treatment, NOT the full primary-button styling — Header buttons should feel lighter than CTAs. Suggested class string (derived from Button's ghost variant but tighter):
  ```
  inline-flex items-center gap-2 rounded font-sans text-body font-medium text-neutral-ink/80 hover:text-brand-red-700 transition-colors
  ```
- Label: `{cartCount > 0 ? \`Cart (${cartCount})\` : "Cart"}`. Render the count inline, not as a separate badge — keeps the markup simple, no positioning concerns.
- Optional: inline `<svg>` cart icon to the left of the label. **Pick one of:**
  - Skip the icon entirely (text-only "Cart" / "Cart (3)") — simplest, totally fine for this task
  - Add a minimal inline `<svg>` cart icon (24px or smaller, `fill="none" stroke="currentColor"`) — looks more professional but adds ~10 lines of SVG path data
  - Flag your choice in output notes.

**6. Accessibility.**
- `<header>` is a landmark element — no extra `role` needed.
- Nav links should sit inside a `<nav aria-label="Primary">` element so SR users can jump to the nav landmark. **Important:** use `aria-label="Primary"` (not `aria-label="Navigation"` — the word "navigation" is implicit in the role and would be announced twice).
- Brand mark's `<Link href="/">` carries enough semantics on its own; no `aria-label` needed (the text content "nepali threads" is the accessible name).
- Cart button: when `cartCount > 0`, the visible label "Cart (3)" is the accessible name. SR users hear "Cart 3 link" — clear. No extra aria needed.
- Focus-visible rings: all links pick up the project's default focus styling. If you find any link without a visible focus ring, flag in output notes — we'll address focus styling project-wide in a separate task if needed.

**7. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` somewhere sensible — recommend **just above the Footer section at the bottom**, titled "Header".
- Within that section, render **two** Header examples:
  1. Default (cartCount = 0): just `<Header />`. Label reads "Cart".
  2. With items: `<Header cartCount={3} />`. Label reads "Cart (3)".
- Wrap both in `<div className="-mx-8">` (same trick Footer uses) so the cream-on-cream header reads full-width within the design-test container.
- Caption above: `<p className="font-sans text-small text-neutral-ink/60 mb-4">Full-width on real pages; here showing both the default and the with-items state.</p>`

OUT OF SCOPE:
- Do NOT implement the mobile drawer / hamburger menu. The responsive layout for this task is stacked-on-mobile. A separate task will swap in a drawer.
- Do NOT implement real cart state. `cartCount` is a presentation prop; the cart store is Phase 3.
- Do NOT implement search input in the header. Search comes later; if it's wanted, it goes on its own dedicated row or under a search-button affordance.
- Do NOT add a sticky / fixed header. Sticky-on-scroll is a polish task with its own concerns (animation, body padding compensation).
- Do NOT add an account / sign-in button. Customer auth UI is later.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` succeeds with exit 0.
- After deploy, `/design-test` shows the existing primitives + ProductCard + NewsletterSignup + Hero + Footer sections unchanged, plus a new "Header" section rendering both states (default + cartCount=3).
- Default Header: brand mark left, three nav links, cart button right reading "Cart".
- cartCount=3 Header: same layout, cart button reads "Cart (3)".
- On a mobile-width viewport (~375px), the Header stacks: brand on top, nav row below, cart at bottom (or wherever you placed it). No horizontal overflow, no clipped text.
- All Header links are keyboard-focusable and show a visible focus ring.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm Header is a server component (no `"use client"`).
- State the desktop layout you chose (nav in the middle vs. nav-right-with-cart-after-it) and briefly justify.
- State the mobile layout you chose for nav + cart placement.
- State your icon decision for the cart button (text-only vs. inline SVG).
- Flag any place you were uncertain about visual layout or copy.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Header is a server component** — no `"use client"` on `Header.tsx`.
- **Desktop nav placement:** Brand on the left, nav in the middle, cart on the right, using `md:flex-row md:items-center md:justify-between`. The nav sits between brand and cart via flexbox distribution. This is the classic e-commerce header pattern and pairs cleanly with the Footer's centered-container layout.
- **Mobile layout:** Brand centered on top, nav links in a centered horizontal row below (with `flex-wrap` so they don't clip at ~375px), cart centered at the bottom. I chose centered over left-aligned because it feels more balanced for a small artisan brand on narrow viewports. The three links (Shop, New, Story) are short enough that they fit comfortably side by side even at 375px.
- **Cart icon decision:** Text-only — no inline SVG. The spec explicitly calls this "simplest, totally fine for this task" and it keeps the markup minimal. When cart state lands in Phase 3, an icon can be added then without changing the prop API.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
