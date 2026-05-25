TASK ID: TASK-022
PHASE: Phase 2
GOAL: Close two small deferred polish items in one sweep: (1) brand-toned 404 page for the storefront, (2) consistent gold focus rings on Header + Footer text links. Both improve perceived quality without changing functionality. After this lands, Phase 2's last-mile polish is done before we start the bigger Cart work.

CONTEXT:
Two follow-ups have been queued across earlier merges:

- **404 polish.** TASK-016 documented that we deferred a custom `not-found.tsx` for the (frontend) — every unknown storefront URL currently hits Next's default 404 ("404 | This page could not be found" in plain black text on white). It works but looks like a developer mistake, not an artisan brand.
- **Focus ring consistency.** TASK-014 documented that Header and Footer `<Link>` elements rely on browser-default outline for keyboard focus, while Button/Input/Hero CTA all use the gold-400 ring. Inconsistent treatment. Keyboard users see a different focus style depending on which element they're tabbing through.

Both are pure CSS/markup work. No data fetching, no new components, no dependencies.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/not-found.tsx` — new file. The (frontend) layout will wrap this in Header + main + Footer automatically. Server component.
- `src/components/storefront/Header.tsx` — add focus-visible classes to the brand-mark Link, the three nav Links, and the cart Link.
- `src/components/storefront/Footer.tsx` — add focus-visible classes to all `<Link>` instances (the brand-cell "Read our story →", every column link, and the Privacy/Terms small-print links).

REQUIREMENTS:

**1. The 404 page (`not-found.tsx`).**

Next App Router convention: a `not-found.tsx` file in any route segment provides the UI rendered when `notFound()` is called from within that segment OR when the URL doesn't match any route in the segment. The (frontend) layout (Header + main + Footer) wraps `not-found.tsx` exports automatically, so the page sits inside the normal site chrome.

Path: `src/app/(frontend)/not-found.tsx`. Server component, default-export.

Markup:
```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <article className="mx-auto max-w-2xl px-6 py-24 sm:px-8 lg:px-12 lg:py-32 text-center">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        404
      </p>
      <h1 className="font-serif text-display text-neutral-ink mb-4">
        We can't find that page.
      </h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        The link might have moved, or the page might never have existed. Either way, the shop's still here.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded font-sans font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 bg-brand-red-600 text-neutral-cream hover:bg-brand-red-700 active:bg-brand-red-800 px-6 py-3 text-h3 min-h-[48px]"
      >
        Back to the shop
      </Link>
    </article>
  );
}
```

Notes on the CTA: same primary-Button class string used by the Hero CTA (TASK-012) — Button-styled Link, NOT `<Button>` inside `<Link>` (invalid HTML). The duplication of the Button class string in a third place (Hero, now 404) is the trigger we'd watch for to extract into a shared constant or refactor Button to support `as="a"` — but doing that refactor in this polish task would balloon scope. Flag the third-consumer duplication in output notes; a future task makes the call.

Tone: artisan, warm, not-overly-clever. Don't write "Whoops, we got lost in the loom!" Don't write "Oops!" or "Sorry!" Match the homepage and product copy voice — confident, not cute, with a soft turn back toward action.

**2. Focus rings on Header links.**

Edit `src/components/storefront/Header.tsx`. The file currently has:
- The brand mark Link
- Three nav Links (Shop / New / Story) — they all share a `navLinkClasses` string
- One cart Link

Add the standard project focus-visible classes to all four spots. The class string is:
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded
```

Apply to:
- The brand mark Link's className — append the focus-visible classes
- The `navLinkClasses` shared string — append the focus-visible classes (one update covers all three nav links)
- The cart Link's className — append the focus-visible classes

The `rounded` (4px) on the end gives the focus ring a slight rounded corner so it doesn't render as a hard rectangle. Visual minor but matches the Button/Input style.

**3. Focus rings on Footer links.**

Edit `src/components/storefront/Footer.tsx`. There are multiple `<Link>` instances:
- The brand cell's "Read our story →" Link
- Every link inside the four column `<ul>`s — same class string used for all of them
- The Privacy and Terms small-print Links in the bottom row

Same focus-visible class string as Header. Add it everywhere a `<Link>` appears. Where multiple Links share a class string, update the shared definition once.

**4. Verification — manual.**

After implementing, tab through the storefront with the keyboard:
- Tab into the Header → brand mark, then each nav link, then cart should each show a visible gold ring when focused
- Continue tabbing through the page content → existing Button/Input/Hero CTA focus rings already show
- Tab into the Footer → "Read our story →", then each column link, then Privacy and Terms should each show the ring

Visit any unknown URL like `/foobar` to confirm the new not-found page renders inside the site chrome with the brand styling.

OUT OF SCOPE:
- Do NOT add a search bar, "recent products" carousel, or any active content on the 404 page. It's a small dead-end with one clear next action.
- Do NOT redesign Header or Footer beyond adding focus-visible classes.
- Do NOT extract the Button primary-lg class string to a shared constant (the polish-sweep is small; the refactor lives in a separate task once we agree the duplication is worth solving).
- Do NOT refactor Button to support polymorphic rendering (`as="a"`). Same reason.
- Do NOT add focus rings to elements that already have them (Button, Input).
- Do NOT add a global `*:focus-visible { ... }` rule. Per-element styling matches the rest of the project.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy:
  - Visiting `/foobar` (or any unknown URL not handled by a static or dynamic route) shows the new 404 page wrapped in Header + Footer chrome, with the gold "404" eyebrow, serif heading "We can't find that page.", body copy, and a primary-Button-styled "Back to the shop" Link.
  - Tabbing through the Header reveals a visible gold focus ring on each link (brand mark, Shop, New, Story, Cart).
  - Tabbing through the Footer reveals the same ring on every link.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `not-found.tsx` is in `src/app/(frontend)/` (so the (frontend) layout wraps it), not the project root.
- Confirm the 404 page is a server component.
- Flag the third-consumer duplication of the Button primary-lg class string (Hero → now 404 → ?). Note whether you considered extracting it and why you didn't (per the spec, don't do it in this task).
- Confirm focus-visible classes added to the brand-mark, navLinkClasses, AND cart Link in Header. Confirm same on every Link in Footer.
- Confirm you tested the tab order manually (or note that you couldn't and reviewer should verify in browser).
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`not-found.tsx` is in `src/app/(frontend)/`** — wrapped by the (frontend) layout's Header + main + Footer automatically. Server component, default export.
- **404 page is a server component** — no `"use client"`.
- **Button primary-lg class string duplication:** This is now the third consumer (Hero CTA → 404 CTA → ?). I did not extract it — the spec explicitly says defer the refactor to a separate task. A future task should either add an `as` prop to Button or extract the class string to a shared constant.
- **Focus-visible classes added to all Header Links:**
  - Brand mark Link: appended `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 rounded`
  - `navLinkClasses` shared string: appended the same focus-visible classes (covers Shop, New, Story)
  - Cart Link: appended the same focus-visible classes
- **Focus-visible classes added to all Footer Links:**
  - "Read our story →" Link: appended focus-visible classes
  - Column links shared class string: appended focus-visible classes (covers all 10 column links)
  - Privacy and Terms Links: appended focus-visible classes
- **Manual tab-order testing:** I could not run a browser to verify the focus rings visually. The reviewer should tab through Header → page → Footer in a browser to confirm gold rings appear on every link.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
