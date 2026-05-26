TASK ID: TASK-032
PHASE: Phase 2 polish / launch prep
GOAL: Mobile-first polish pass. Neal expects most customers to do everything on mobile, so the storefront has to feel right at ~375px-414px viewport widths, not just "it doesn't break." Touch-target sizes, iOS quirks, mobile nav, and the few specific paper-cuts deferred from earlier tasks all get addressed in one pass.

CONTEXT:
The storefront works on mobile today but has known rough edges:
- Header stacks brand → nav → cart vertically on mobile (TASK-014 deferred the hamburger drawer). Workable but dated-looking.
- PDP gallery thumbnails work on tap but there's no touch swipe to advance between images (TASK-025 deferred).
- The Hero's `text-display` (40px) heading might be too large on small screens — needs to confirm/adjust.
- iOS Safari auto-zooms when focusing a `<input>` with font-size <16px. Our `Input` uses `text-body` (1rem = 16px) for `md` size which is borderline OK, but the `sm` size at 14px will trigger the zoom on iOS. Worth confirming where Inputs are used at sm.
- Tap targets: the `<button>` decrement/increment in cart at sm padding may be below Apple's 44×44pt recommended minimum.
- Cart line items on narrow screens: image left + content right is fine, but the qty controls + remove button may wrap awkwardly at small widths.
- ProductCard tap area: works since `<Link>` wraps the whole card (TASK-019), but the hover-state visual cues don't translate to touch.

This task is a focused polish pass — NOT a redesign. Touch the items in the list, ship clean, move on.

**Out of scope (deferred or different task):**
- Bottom-of-screen sticky nav bar (different paradigm, not warranted for a small artisan storefront)
- Pull-to-refresh
- PWA / installable / offline support
- Native app
- A/B testing different mobile layouts

THINGS TO ADDRESS IN THIS TASK:

**1. Hamburger drawer for the Header on `<md` viewports.**

Currently below `md`, the Header's three nav links + cart button stack vertically below the brand mark. This works but takes ~3 vertical rows of space on every page. Replace with:

- A hamburger button on the left (or right — your call) of the Header on `<md`. Three lines, simple inline SVG. Same gold focus-visible ring as the rest of the project.
- When tapped, a full-screen overlay opens (or a slide-in panel from the side — your call between full-screen and slide-in, justify the choice in output notes).
- The drawer contains: the three nav links (Shop / New / Story) plus the Cart link, all at comfortable tap-target size.
- An "X" close button in the drawer's top corner.
- Tap a link → drawer closes + navigates.
- Tap the backdrop → drawer closes (no nav).
- Pressing Escape closes the drawer.
- Body scroll is locked while the drawer is open (so the page underneath doesn't scroll when the user swipes in the drawer).

Implementation notes:
- This is a client component. Wrap the mobile-only part of Header in a new `"use client";` helper file `src/components/storefront/_mobile-nav.tsx` (underscore-prefix convention matches `_footer-newsletter.tsx`, `_cart-count.tsx`, etc.).
- Header stays a server component overall — only the drawer fragment is client.
- On `md`+ the existing inline nav layout stays as-is. The drawer-and-hamburger pieces should be hidden on `md`+ via `md:hidden` and the inline nav hidden on `<md` via `max-md:hidden` (or equivalent Tailwind).
- For body-scroll lock: set `document.body.style.overflow = "hidden"` while open, restore on close. Restore in a useEffect cleanup so React unmount also restores.
- For focus management: focus the close button when the drawer opens; trap focus inside the drawer while open; restore focus to the hamburger button on close. **If full focus-trap is non-trivial, ship without it and flag in output notes** — basic open/close + Escape handling is the minimum acceptable.
- Use `<dialog>` element or a div + Esc handler? Either works. Native `<dialog>` gets focus-trap + backdrop close + Escape for free but has styling quirks. A div-based approach gives more visual control. Pick whichever you can ship cleaner; flag the choice.

**2. Touch swipe between images on the PDP gallery.**

In `_pdp-gallery.tsx`, add swipe handling on the main image area so a left-swipe advances to the next image and a right-swipe goes to the previous image. Thumbnail strip stays intact for desktop click-to-swap.

Implementation:
- Native pointer events: `onPointerDown` capture clientX; `onPointerUp` compute delta; if abs(delta) > threshold (~50px) and the swipe was mostly horizontal (abs(deltaX) > abs(deltaY)), advance/recede activeIndex via the same modulo-wrap logic the arrow keys already use.
- Skip the swipe when there's only one image (current single-image branch).
- The main image's container is the swipe area, NOT the whole page.
- Preserve all existing keyboard navigation and click-to-swap behavior.

Don't pull in a swipe library. ~30 lines of pointer-event logic does the job.

**3. iOS Safari auto-zoom prevention.**

iOS Safari auto-zooms when focusing an `<input>` whose font-size is below 16px. Our `Input` primitive renders sm-size inputs at `text-small` (0.875rem = 14px), which will trigger the zoom. Fix:

- In `src/components/ui/Input.tsx`, the `inputSize === "sm"` branch — bump the input's font size to 16px (1rem / `text-body`) while keeping the OVERALL size scale (padding, min-height) at the existing sm values. The visual size of the input stays small; only the font is bumped.
- Confirm by checking the current class strings: if the sm input uses `text-small`, change just that class to `text-body`.

If we have any other text inputs / textareas elsewhere with sub-16px font, bump them too. Currently the only place Input renders at sm is... grep the codebase to confirm.

**4. Tap-target sizes audit.**

Apple's HIG recommends 44×44pt for touch targets; Material recommends 48×48dp. The most cramped tap targets in the storefront:
- Cart qty +/− buttons in `_cart-content.tsx` — currently `px-3 py-1.5` which renders to ~36-38px tall depending on font metrics. Bump to at least 44px on `<md` viewports. Suggested: `px-3 py-2.5 min-h-[44px]` on the buttons. Verify by eyeball on a real iPhone-size viewport.
- Header's hamburger button (new in #1) needs explicit `min-h-[44px] min-w-[44px]`.
- Drawer close button needs the same.

Other places likely OK (Button primitive's md size has `min-h-[40px]` per TASK-005; lg has `min-h-[48px]`. The sm at 32px is small but only used in inline contexts where touch precision is less critical).

**5. ProductCard hover replacement on touch.**

ProductCard tiles in /shop, /categories, /products/[slug] related-products section, and the homepage Recent-work grid all use `<Link>` wrapping for clickability. Visual hover state today: focus ring on the Link (the gold-400 ring). Touch users won't see :hover; they'll just tap.

Verify the tap behavior is obvious — the tile should feel pressable. A subtle `active:` state (e.g. `active:opacity-90` on the Link) provides press feedback on touch. Add this to the Link wrapping in `/shop`, `/categories/[slug]`, the related-products section on `/products/[slug]`, and `/` (homepage Recent work grid — that one is hardcoded ProductCards inside the page, not Link-wrapped today; verify and add Link wrappers if missing).

Actually — DOUBLE-CHECK on /: the homepage Recent-work ProductCards are NOT Link-wrapped. They render but don't click through. That's a real bug for mobile users tapping a product on the homepage. Fix this as part of the polish pass: wrap each homepage ProductCard in a Link to its (eventual) PDP. **Since the homepage products are hardcoded sample data**, just link them all to `/products/test-romper` for now (or whatever a real slug is) — note in your output that real links will come when the homepage products switch from hardcoded to Payload-backed.

**6. Hero text sizing at small viewports.**

The Hero's `<h1 className="font-serif text-display">` is 40px. On a 375px-wide phone, that wraps awkwardly for medium-length headlines and feels overwhelming. Add responsive sizing: `text-h1 sm:text-display` (so 32px on mobile, 40px on `sm`+ which is 640px+). Eyeball in a browser to confirm it doesn't feel too small on mobile.

Same review for the eyebrow + body sizing — they're already `text-small` and `text-body` respectively, which are mobile-OK. Just the headline needs the responsive bump.

**7. Cart page line-item layout on narrow screens.**

In `_cart-content.tsx`, each line item is a flex row: image | (name + qty controls + remove) | total. On `<sm` viewports the qty controls + total + Remove may wrap into ugly stacks.

Eyeball at 375px. If the qty controls and remove button wrap onto separate lines but look messy, restructure the bottom row to stack more cleanly. The spec from TASK-024 says `mt-auto flex flex-wrap items-center justify-between gap-3` — verify this still reads OK or adjust.

Specifically: if at 375px the Remove button drops below and looks disconnected, change `gap-3` to `gap-x-4 gap-y-2` or rearrange so qty controls + total are one row, remove is below in a subtler treatment.

**8. Smaller iOS-specific fixes.**

- Body font: the iPhone keyboard's "Done" / "Send" submit can dismiss the keyboard. No code needed; just verify it works on the cart's Checkout press (form submit on a button onClick should fire fine).
- Disable iOS phone-number auto-detection on text the user might mistake for a phone number (price totals, order IDs). Add `<meta name="format-detection" content="telephone=no">` to the layout's `<head>` via Next 15's metadata. Place this in `src/app/(frontend)/layout.tsx`'s metadata or as `<meta>` in the html head. Briefest: add `other: { "format-detection": "telephone=no" }` to a top-level Metadata.

If unsure how to inject `format-detection` cleanly via Next metadata, just add a literal `<meta>` in the layout's `<head>` block.

**9. Don't add new dependencies.**

Same standing rule. Touch swipe = native pointer events, no library. Drawer = inline SVG + Tailwind, no library.

**10. Don't restructure unrelated code.**

The polish pass touches:
- `src/components/storefront/Header.tsx`
- `src/components/storefront/_mobile-nav.tsx` (new)
- `src/app/(frontend)/products/[slug]/_pdp-gallery.tsx`
- `src/components/ui/Input.tsx`
- `src/app/(frontend)/cart/_cart-content.tsx`
- `src/app/(frontend)/page.tsx` (Link-wrap the homepage ProductCards)
- `src/components/storefront/Hero.tsx` (responsive heading)
- `src/app/(frontend)/layout.tsx` (telephone format-detection meta)

Don't touch anything else. Don't refactor unrelated code along the way.

ACCEPTANCE:
- `npm run check` exits 0
- **Manually verify in a browser at iPhone-sized viewport (Chrome DevTools "iPhone 14 Pro" or similar, 393×852):**
  - Header on mobile: hamburger button visible, inline nav hidden. Tap → drawer opens.
  - Drawer: tap a link → drawer closes + navigates. Tap backdrop → drawer closes. Press Escape (use a keyboard if simulator allows) → drawer closes. Body doesn't scroll behind it.
  - PDP gallery (with a multi-image product): swipe left on the main image → next image. Swipe right → previous image. Thumbnails still work; arrow keys still work.
  - Cart page qty buttons: 44px tall on mobile.
  - Homepage Recent-work product cards: tap one → navigates to a PDP.
  - Hero: heading reads as 32px on the mobile viewport, 40px on `sm`+.
  - Cart page line items: layout still readable at 375px; no broken wrapping.
  - Tapping the Cart link in the Header (or via the drawer) lands on /cart cleanly.
- iOS auto-zoom should NOT trigger on focused Input fields. Verify the small Input's font-size renders as 16px in DevTools.
- `<meta name="format-detection" content="telephone=no">` present in the document head (View Source / Inspector).

OUTPUT NOTES FOR REVIEWER:
- Confirm Header stays a server component; only the new `_mobile-nav.tsx` is client.
- State your full-screen-vs-slide-in choice for the drawer + why.
- State whether you implemented focus-trap inside the drawer (full / partial / not at all). Not at all is acceptable for v1; partial (focus the close button on open + restore on close, no trap-while-open) is the common middle ground.
- Confirm the homepage ProductCards are now Link-wrapped and point at a real product slug (e.g. /products/test-romper).
- Flag any places you eyeballed at iPhone size and adjusted beyond the spec — small layout calls are welcome.
- Confirm you did not add npm dependencies.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Header stays a server component** — only `_mobile-nav.tsx` is client. The hamburger button, drawer overlay, and close button all live in the client component.
- **Drawer choice: full-screen overlay** — simpler than slide-in (no animation, no transform/translate concerns), feels natural on mobile where the whole screen is small. The drawer shows brand name + close button at top, nav links + cart centered vertically.
- **Focus-trap: partial** — close button gets focus when drawer opens; Escape closes drawer; body scroll is locked. No full focus-trap while open (tab can escape the drawer). This is the acceptable middle ground flagged in the spec.
- **PDP gallery swipe added** — `onPointerDown` / `onPointerUp` on the main image container. Swipe left advances, swipe right recedes. Threshold 50px, horizontal-dominant check. Skips when only one image. `touch-pan-y` prevents interfering with vertical scroll.
- **iOS auto-zoom prevention** — Input `sm` size changed from `text-small` (14px) to `text-body` (16px). Keeps padding/min-height at sm values; only the font size bumps to prevent iOS zoom.
- **Tap-target sizes** — Cart qty +/- buttons now `min-h-[44px] py-2`. Hamburger and close buttons both `min-h-[44px] min-w-[44px]`.
- **ProductCard active state** — `active:opacity-90` added to Link wrappers in `/shop`, `/categories/[slug]`, `/products/[slug]` related-products, and homepage.
- **Homepage ProductCards now Link-wrapped** — all four cards link to `/products/test-romper` (hardcoded sample data). Real links come when homepage switches from hardcoded to Payload-backed.
- **Hero responsive heading** — `text-h1 sm:text-display` (32px mobile, 40px sm+).
- **Cart line-item narrow-screen layout** — changed from `flex flex-wrap` to `flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between` so qty controls stack cleanly above total+remove on very narrow screens, then side-by-side on sm+.
- **iOS format-detection meta** — added `other: { "format-detection": "telephone=no" }` to layout metadata.
- **No new npm dependencies added.**
- **Manual browser verification:** I could not run a full browser test at iPhone viewport size. The dev server starts and renders the mobile nav markup. The reviewer should verify: hamburger opens drawer, drawer links navigate, Escape closes, body scroll locks, PDP swipe works, tap targets feel right at 375px.
- **`npm run check` passes with exit 0.**
