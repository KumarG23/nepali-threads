TASK ID: TASK-013
PHASE: Phase 2
GOAL: Build a `Footer` composition at `src/components/storefront/Footer.tsx` — the site-wide page footer with link columns, embedded NewsletterSignup, and brand sign-off. First site-chrome component; pages will compose `<Header>` + `<main>{children}</main>` + `<Footer>` once Header lands.

CONTEXT:
TASK-010 / 011 / 012 landed the first three compositions (ProductCard, NewsletterSignup, Hero). Footer is the first site-chrome component — it appears on every page and stays visually consistent across the site. The columns of links + newsletter + brand block is a settled e-commerce footer pattern; the shape doesn't need to be invented.

This task uses placeholder link destinations (`/shop`, `/about`, `/contact`, etc.) — most will 404 until those pages exist. That's fine. Real link URLs and column copy can be updated as content lands. The job here is the layout, the composition, and the visual treatment.

Footer is the first real consumer of `<NewsletterSignup>` outside the smoke-test page. It also passes a stub `onSubscribe` for now — Resend integration is later, security-sensitive Claude Code work.

FILES TO CREATE OR MODIFY:
- `src/components/storefront/Footer.tsx` — new file. Sibling of `ProductCard.tsx`, `NewsletterSignup.tsx`, `Hero.tsx`. **Server component (no `"use client"`)** for the Footer shell itself.
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with a "Footer" section below the Hero section. Same rule: do not rewrite earlier sections.

REQUIREMENTS:

**1. Footer component.**
- File: `src/components/storefront/Footer.tsx`. Render the outermost element as a `<footer>`. Default-export the component, also export named.
- **No `"use client";`** on Footer itself — server-renderable. (NewsletterSignup inside it is a client component already; React 19 handles the boundary cleanly.)
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLElement>`).
- Inline `cx` helper at the top of the file. **No new dependencies.**

**2. Props (curated, not spread).**
- `onSubscribe?: (email: string) => Promise<void>` — optional. When provided, the embedded NewsletterSignup uses this handler. When omitted, Footer passes a no-op stub that resolves after a 1.5s delay (so the form still shows the loading→success transition during development). **Defaulting to a working stub is intentional** — it lets pages drop a `<Footer />` in without thinking about the email backend before Resend wires up.
- `className?: string` — applied to the outer `<footer>` per the compound-primitive convention.

That's the entire props surface. Footer is opinionated — no `columns` prop for consumer-controlled link sections, no `socialLinks` prop, no `copyright` override. If those become needed, they get added explicitly; not preempted.

**3. Layout structure.**
- Outer `<footer className={cx("bg-neutral-ink text-neutral-cream", className)} ref={ref}>` — dark warm background (the warm charcoal `--color-neutral-ink`) with cream text. Inverts the page palette for visual separation between content and site chrome.
- Inner container: `<div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">`. Centered, generous padding.
- Top row (newsletter + branding):
  - On `lg`+: 2-column grid, NewsletterSignup on the left, brand block on the right
  - On smaller screens: stacks vertically, newsletter first
  - Use `grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16`
- Newsletter cell: `<NewsletterSignup onSubscribe={onSubscribe ?? defaultStub} />`. **Override the heading and description** via NewsletterSignup props so they fit the footer context (smaller, less promotional than a standalone CTA). Suggested:
  - heading: `"Stay in the loop"` (the default is fine, lighter heading reads OK in footer)
  - description: `"Occasional updates on new arrivals and the story behind the work."`
- Brand cell: simple text block with:
  - Brand mark: `<p className="font-serif text-h2">nepali threads</p>` (lowercase — feels artisan)
  - One-line tagline: `<p className="font-sans text-body text-neutral-cream/70 mt-2">Handmade in Nepal. Worn anywhere.</p>` — flag in output notes if you want to suggest different copy.
  - Link to about/story (use `next/link`): `<Link href="/about" className="text-brand-gold-400 hover:text-brand-gold-300 mt-4 inline-block">Read our story →</Link>`

- Middle row (link columns):
  - 4-column grid on `md`+, 2-column on `sm`, 1-column on mobile
  - Use `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-16 border-t border-neutral-cream/10 pt-12`
  - Each column: a heading + a `<ul>` of links
  - **Heading style:** `<h3 className="font-sans text-small font-semibold uppercase tracking-wide text-neutral-cream/90 mb-4">{title}</h3>`
  - **Link style:** `<Link href={href} className="block py-1 text-body text-neutral-cream/70 hover:text-neutral-cream transition-colors">{label}</Link>`

  **Columns (hardcode these — placeholder hrefs are fine):**
  - **Shop:** New arrivals (`/shop?filter=new`), All products (`/shop`), Gift cards (`/gift-cards`)
  - **Customer:** Shipping (`/shipping`), Returns (`/returns`), Contact (`/contact`)
  - **About:** Our story (`/about`), Sustainability (`/sustainability`), Press (`/press`)
  - **Connect:** Instagram (`https://instagram.com/nepalithreads` — flag this URL in output notes if it should be confirmed), Email (`mailto:hello@nepali-threads.com`)

- Bottom row (sign-off):
  - `<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-neutral-cream/10 pt-8">`
  - Left: `<p className="font-sans text-small text-neutral-cream/60">© {new Date().getFullYear()} Nepali Threads. All rights reserved.</p>`
  - Right: small print links — Privacy (`/privacy`), Terms (`/terms`). Use the same link styling as the columns but `text-small`.

**4. NewsletterSignup integration — important.**
- Import `NewsletterSignup` directly: `import NewsletterSignup from "@/components/storefront/NewsletterSignup"`.
- Footer is server, NewsletterSignup is client — React 19 handles the boundary automatically; you do NOT need to add `"use client"` to Footer.
- The `defaultStub` for `onSubscribe`: define it as a module-level `async` function in `Footer.tsx` (NOT inline in JSX — inline closures would be re-created every render and break NewsletterSignup's prop stability):
  ```ts
  async function defaultStub(_email: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  ```
- **Critical:** because the default stub is a regular module-level function (no React state), it's safe to pass into a client-component prop from a server component. If you instead defined it inside the Footer function body using e.g. `useCallback`, that would require Footer to be a client component — which we don't want.

**5. Accessibility.**
- `<footer>` is a landmark element — no extra `role` needed.
- Link columns use `<ul>` / `<li>` for semantics. Headings (`<h3>`) provide column structure for SR users navigating by heading.
- The dark background + cream text gets passable contrast at the body level (`text-neutral-cream/70` on `bg-neutral-ink` ≈ 4.6:1 — borderline, accept for now). Headings at `text-neutral-cream/90` are well above.
- The "Read our story →" arrow is a Unicode character, not an SVG. It's part of the link text, so SR users will hear "Read our story right arrow" — acceptable. If we ever want to suppress the arrow announcement, we'd wrap it in `<span aria-hidden="true">→</span>`. Not required now.

**6. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing Hero section, titled "Footer" (use the same `font-serif text-h2 mb-6` heading style).
- Within that section, render **one** `<Footer />` instance with no `onSubscribe` prop (uses the built-in stub). Wrap it in `<div className="-mx-8">` or similar to break out of the design-test's `p-8` container so the dark footer reads full-bleed visually — Footer is meant to be edge-to-edge.
- Add a small caption above the Footer: `<p className="font-sans text-small text-neutral-ink/60 mb-4">Full-width on real pages; clipped to the design-test container here.</p>` so the demo doesn't look broken.

OUT OF SCOPE:
- Do NOT add a back-to-top button.
- Do NOT add language/currency switchers, region selectors, cookie-preference modals, or any localization controls. We're USD-only / en-US-only for Phase 2.
- Do NOT add social media icons (SVG). The text "Instagram" link is enough for now. An icon-aware redesign is a polish task.
- Do NOT add payment method icons (Visa/Mastercard/etc). Same rationale.
- Do NOT make the Footer collapse into accordions on mobile. The columns stack vertically — that's the responsive behavior. Accordions are over-engineering for four short columns.
- Do NOT wire to Resend or any email backend. The default stub stays a stub.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` succeeds with exit 0.
- After deploy, `/design-test` shows the existing primitives + ProductCard + NewsletterSignup + Hero sections unchanged, plus a new "Footer" section rendering the Footer once.
- The Footer renders four link columns on desktop, two on `sm`-width tablets, one on mobile.
- The embedded NewsletterSignup works: typing an email + submitting triggers the 1.5s stub and shows the success message.
- All link colors are readable on the dark background (no near-black-on-black bugs).
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm Footer is a server component (no `"use client"`) and that NewsletterSignup inside it works without you adding `"use client"` to Footer.
- Confirm `defaultStub` is a module-level async function, NOT defined inside the Footer component body.
- State the Instagram URL you used. Flag if you want Neal to confirm the handle before launch.
- State the tagline you settled on. Flag if you want to suggest different copy.
- Flag any place you were uncertain about layout, link column copy, or the responsive breakpoints.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Footer is a server component** — no `"use client"` on `Footer.tsx`.
- **NewsletterSignup integration required a small workaround.** The spec states: "Critical: because the default stub is a regular module-level function (no React state), it's safe to pass into a client-component prop from a server component." This is incorrect — Next.js (React Server Components) cannot serialize functions across the server/client boundary, and `npm run build` fails with: `Error: Event handlers cannot be passed to Client Component props.` To fix this while keeping Footer server-rendered, I extracted the NewsletterSignup + `defaultStub` into a tiny client-component wrapper: `src/components/storefront/_footer-newsletter.tsx`. Footer imports and renders `<FooterNewsletter onSubscribe={onSubscribe} />`. The wrapper is the client boundary; Footer remains a server component.
- **`defaultStub` is a module-level async function** inside `_footer-newsletter.tsx` (not inline in JSX).
- **Instagram URL used:** `https://instagram.com/nepalithreads` — please confirm this handle before launch.
- **Tagline used:** "Handmade in Nepal. Worn anywhere." — flag for copy review if you'd prefer something different.
- **Responsive breakpoints:** `grid-cols-1` mobile → `sm:grid-cols-2` tablet → `md:grid-cols-4` desktop for link columns. `lg:grid-cols-2` for the top newsletter+brand row.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
