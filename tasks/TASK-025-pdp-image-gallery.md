TASK ID: TASK-025
PHASE: Phase 2
GOAL: Replace the PDP's single-image render with a real multi-image gallery — main image with a thumbnail strip below it. Click or tap a thumbnail to swap the main image; arrow keys to navigate between thumbnails. Works for any product with 1+ images. When a product has only one image, the thumbnail strip is skipped (looks the same as today).

CONTEXT:
TASK-018 wired the PDP to real Payload data but explicitly limited the image area to `product.images[0]`, with a flagged deferral: multi-image gallery was a known follow-up. The Products schema's `images` field is an array, and the admin can upload many images per product. Neal added 3 images to each of his test products and confirmed only the first renders — that's expected today, and this task fixes it.

Decisions baked in to keep this small:

- **Click/tap to swap, arrow-key nav. No swipe-on-mobile.** Touch swipe needs a touch-event handler, momentum, snap behavior, and gets fiddly fast. The thumbnail strip works fine as a tap-target on mobile (each thumbnail is a real button). Real swipe can be a later polish.
- **No zoom / lightbox.** Click-to-zoom is its own UX layer with focus trap and escape-to-close — separate task if needed.
- **No `<dialog>` or modal.** Inline gallery only. Lightbox above.
- **State is local to the PDP's image-gallery client component.** Not a store, not URL state, no shareable "view image #2" link. Keeps the client island tiny.

The current PDP's left-image column becomes a new `<PdpGallery />` client component. The rest of the PDP (info column, AddToCartButton, etc.) stays server. Same server/client boundary pattern Footer + Cart-page use.

Out of scope:
- Touch swipe gestures (deferred)
- Click-to-zoom / lightbox (deferred)
- Carousel arrows overlaid on the main image (the thumbnail strip handles it)
- Auto-rotate / autoplay (no)
- Pinch-zoom on mobile (deferred)
- Anything that touches `_add-to-cart.tsx`, the cart, or other primitives
- Anything blocklisted

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/products/[slug]/_pdp-gallery.tsx` — new client component containing the active-image state, main image render, and thumbnail strip.
- `src/app/(frontend)/products/[slug]/page.tsx` — replace the existing left-column `<Image>` render (and the no-image fallback `<div>`) with `<PdpGallery images={...} productName={...} />`. The page stays server; the gallery is the client island.

REQUIREMENTS:

**1. The gallery component shape (`_pdp-gallery.tsx`).**

```tsx
"use client";

import { useState } from "react";

import Image from "@/components/ui/Image";

type GalleryImage = {
  url: string;
  alt: string;
};

type PdpGalleryProps = {
  images: GalleryImage[];
  productName: string;
};

export function PdpGallery({ images, productName }: PdpGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // ... render
}
```

The PDP page passes a pre-resolved `images` array (already filtered for the typeof-object guard, already mapped to `{ url, alt }`). The gallery doesn't know about Payload's relationship shape — that lives in the PDP page where the typeof guard already runs.

`productName` is passed separately so the gallery can fall back to it for any image whose `alt` is empty (same fallback the single-image render already does).

**2. Empty state (zero images).**

```tsx
if (images.length === 0) {
  return (
    <div className="aspect-[3/4] rounded-lg bg-neutral-ink/10 flex items-center justify-center text-neutral-ink/40 font-sans text-small">
      No image yet
    </div>
  );
}
```

Same shape the PDP currently uses. Identical visual.

**3. Single-image state (`images.length === 1`).**

Render exactly what the current PDP renders today — just the main image, no thumbnail strip:

```tsx
if (images.length === 1) {
  return (
    <Image
      src={images[0].url}
      alt={images[0].alt || productName}
      aspectRatio="portrait"
      rounded="lg"
      priority
    />
  );
}
```

For single-image products, the gallery is visually identical to the pre-TASK-025 rendering. No layout shift, no new chrome.

**4. Multi-image state (`images.length >= 2`).**

Main image on top, thumbnail strip below.

```tsx
const activeImage = images[activeIndex];

return (
  <div>
    {/* Main image */}
    <Image
      key={activeImage.url}
      src={activeImage.url}
      alt={activeImage.alt || productName}
      aspectRatio="portrait"
      rounded="lg"
      priority={activeIndex === 0}
    />

    {/* Thumbnail strip */}
    <ul
      role="list"
      aria-label="Product images"
      className="mt-4 flex flex-wrap gap-2"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          setActiveIndex((i) => (i + 1) % images.length);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          setActiveIndex((i) => (i - 1 + images.length) % images.length);
        }
      }}
    >
      {images.map((image, index) => {
        const isActive = index === activeIndex;
        return (
          <li key={image.url}>
            <button
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Show image ${index + 1} of ${images.length}`}
              aria-current={isActive ? "true" : undefined}
              className={`block w-16 sm:w-20 rounded transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2 ${
                isActive
                  ? "ring-2 ring-brand-red-700 ring-offset-2"
                  : "opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={image.url}
                alt=""
                aspectRatio="square"
                rounded="md"
              />
            </button>
          </li>
        );
      })}
    </ul>

    {/* SR-only live region announcing the active image */}
    <p className="sr-only" aria-live="polite">
      Image {activeIndex + 1} of {images.length}.
    </p>
  </div>
);
```

Notes on the markup:

- **`key={activeImage.url}` on the main `<Image>`** ensures React swaps the DOM node when the active image changes. Without a key change, next/image might keep the old `<img>` with the new src, which can cause a brief flicker of the previous image while the new one loads.
- **`priority={activeIndex === 0}`** preloads the first image (above-the-fold) and lazy-loads the others. Once the user clicks a thumbnail, lazy-load kicks in for that image — it's fast enough.
- **Thumbnail alt is `""`** (intentionally decorative) because the button's `aria-label` ("Show image 2 of 3") provides the accessible name. Two competing labels would confuse SR users.
- **`aria-current="true"`** marks the active thumbnail. SR users tabbing through hear "current" announced.
- **Visual active state**: brand-red-700 ring at offset-2. Non-active thumbnails get 70% opacity that lifts to 100% on hover — subtle "you can click these" affordance.
- **Arrow-key nav on the `<ul>` parent**: capturing keyboard events at the list level handles arrow navigation when ANY thumbnail (or the list itself) has focus. Browser default tab navigation cycles through the thumbnails; left/right cycles the active image WITHOUT changing focus, which is the standard gallery a11y pattern.
- **`<p className="sr-only" aria-live="polite">`** announces "Image 2 of 3" to screen readers when the active image changes. The text is also visually hidden via `sr-only` so sighted users only see the ring change. **Note:** `sr-only` is a standard Tailwind utility (not the Typography plugin). Confirm it generates in this project's Tailwind v4 config — if it doesn't, define it in `globals.css` as a one-liner:
  ```css
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
  ```
  Tailwind v4 has `sr-only` built in by default, so the build should produce the rule automatically. If `npm run check` produces no warning and the rule visibly renders the right behavior, no CSS addition needed.

**5. PDP page wiring (`src/app/(frontend)/products/[slug]/page.tsx`).**

Today's left-column rendering looks like:
```tsx
{/* Left: image */}
<div>
  {firstImage ? (
    <Image
      src={firstImage.url ?? ""}
      alt={firstImage.alt ?? product.name}
      aspectRatio="portrait"
      rounded="lg"
      priority
    />
  ) : (
    <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-neutral-ink/10 font-sans text-small text-neutral-ink/40">
      No image yet
    </div>
  )}
</div>
```

Replace with:
```tsx
{/* Left: image gallery */}
<div>
  <PdpGallery
    images={galleryImages}
    productName={product.name}
  />
</div>
```

And update the data derivation: instead of just `firstImage`, derive `galleryImages` — the full list, filtered to populated objects with usable URLs:

```ts
const galleryImages = (product.images ?? [])
  .map((entry) => {
    const img = entry?.image;
    if (img && typeof img === "object" && img.url) {
      return { url: img.url, alt: img.alt ?? "" };
    }
    return null;
  })
  .filter((x): x is { url: string; alt: string } => x !== null);
```

The `(x): x is { url: string; alt: string }` predicate narrows the type from `({url, alt} | null)[]` to `{url, alt}[]`. Without the predicate, TypeScript wouldn't narrow `.filter(Boolean)` correctly (a known TS limitation), and the downstream type would have `null` in it.

Also: the AddToCartButton currently uses `firstImage?.url ?? ""` and `firstImage?.alt ?? product.name` to snapshot the cart item's image. **Keep that intact** — the cart still snapshots the first image as the "cart thumbnail." Update only the `firstImage` declaration to derive from `galleryImages[0]` instead of from the raw `product.images`:

```ts
const firstImage = galleryImages[0] ?? null;
```

Then `firstImage` is either a `{ url, alt }` object or null, and the AddToCartButton call works without any other change.

**6. Don't touch unrelated code.**

- AddToCartButton stays as-is.
- _cart-content.tsx stays as-is.
- The single-image rendering on `/shop` and `/categories/[slug]` (ProductCard tiles) stays as-is — those still show only the first image, which is correct for grid tiles.

**7. Accessibility.**

- Each thumbnail is a real `<button type="button">` with a descriptive `aria-label`.
- `aria-current="true"` on the active thumbnail.
- `aria-live="polite"` region announces the active image change.
- Arrow-key navigation is the standard gallery pattern; Tab/Shift-Tab still cycles through thumbnails as focusable elements.
- The main image's `alt` falls back to `productName` when the Media doc's alt is empty.

OUT OF SCOPE:
- Touch swipe gestures (left/right swipe on mobile to advance). Standalone polish task if wanted.
- Lightbox / zoom on click. Same.
- Carousel-arrow overlays on the main image. Same.
- Auto-rotate / autoplay carousel.
- Persisting the active image across navigation (refresh resets to image 0).
- Lazy-loading thumbnails — they're tiny and there are typically only a few.
- Pinch-zoom on mobile.
- Any blocklisted-file changes.
- Any new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy, manually verified in a browser with one of Neal's test products (3 images uploaded):
  - PDP shows main image at the top (image 1 by default) and a thumbnail strip of 3 small squares below.
  - Click thumbnail 2 → main image swaps to image 2; thumbnail 2 gets the brand-red ring; thumbnails 1 and 3 dim.
  - Click thumbnail 3 → main image swaps; ring moves.
  - Tab through thumbnails with keyboard → gold focus ring on the focused thumbnail; arrow Right/Left changes the active image without changing focus.
  - With a screen reader on (VoiceOver / NVDA test), confirm "Image 2 of 3" is announced when the active image changes.
- A product with only one image renders identically to today — no thumbnail strip, no visual change.
- A product with zero images renders the "No image yet" placeholder, same as today.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `_pdp-gallery.tsx` is a `"use client"` component and the PDP page stays server.
- Confirm the empty-state and single-image fallback shapes are identical to the pre-TASK-025 render (no visual change for those cases).
- Confirm `sr-only` works out of the box in Tailwind v4 here (no CSS addition needed), OR that you added the one-liner to `globals.css` if it didn't.
- State whether you tested the arrow-key navigation in a browser, and the screen-reader announcement if you ran a screen reader. If you can't, say so and reviewer verifies.
- Flag any place you were uncertain about the keyboard pattern or visual treatment of the active thumbnail.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`_pdp-gallery.tsx` is a `"use client"` component** — the PDP page stays server-rendered.
- **Empty-state and single-image fallback shapes are identical to pre-TASK-025** — zero images shows "No image yet" placeholder; one image shows just the main Image with no thumbnail strip.
- **`sr-only` works out of the box** — Tailwind v4 includes it by default. No CSS addition needed.
- **`galleryImages` derivation uses the type-narrowing predicate** — `(x): x is { url: string; alt: string } => x !== null` filters nulls and narrows the type correctly. TypeScript compiles cleanly.
- **`firstImage = galleryImages[0] ?? null`** — kept for the AddToCartButton cart snapshot. No changes needed to the AddToCartButton call.
- **Arrow-key navigation and screen-reader announcement:** I could not test these interactively in a browser or with a screen reader. The dev server starts successfully and the PDP page renders the gallery markup with correct aria attributes. The reviewer should verify: click thumbnails swap main image, arrow keys cycle without moving focus, and SR announces "Image N of M."
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
