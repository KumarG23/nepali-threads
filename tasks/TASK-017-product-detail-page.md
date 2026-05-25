TASK ID: TASK-017
PHASE: Phase 2
GOAL: Build the product detail page (PDP) at `src/app/(frontend)/products/[slug]/page.tsx` — the page behind every ProductCard. For this task it renders **hardcoded sample data** so we can validate the layout end-to-end; a follow-up task wires it to the Payload `Products` collection.

CONTEXT:
TASK-015 landed the homepage. TASK-016 landed the dynamic CMS pages renderer at `/[slug]` (and established the Payload data-fetching pattern). The natural next page is the PDP — the most important page in any e-commerce site after the homepage.

Two-phase ship is intentional:
- **This task** (TASK-017): build the PDP layout + composition with hardcoded data. Lock in the visual structure: image area, name, price, description, Add-to-Cart placeholder, brand-context micro-copy. The route lives at `/products/[slug]` but every slug returns the same hardcoded product for now.
- **Next task** (TASK-018, separate): swap the hardcoded sample for a real Payload `Products.find({ slug })` fetch using the pattern from TASK-016. notFound() for unknown slugs. Real `<Image>` URLs from the Media collection.

Splitting reduces risk: PDP has a lot of visual layout decisions (image gallery? single image? variant picker? price formatting? add-to-cart UX?), and the data layer has its own concerns (typed products, Media populate-depth, variants). Land the visual layer first, then the data layer.

For this task, the Add-to-Cart button is a stylized `<Button>` that does nothing on click (or shows a brief "cart not implemented yet" alert via inline `onClick`). Cart state lands in Phase 3.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/products/[slug]/page.tsx` — new dynamic route file. Server component (no data fetch yet, but server-renderable).
- (No other files. No new components. Reuses Image, Badge, Button. **Note:** because Add-to-Cart needs `onClick`, the Add-to-Cart button needs `"use client"`, but the rest of the page should stay server-rendered. Wrap just the button in a tiny `_add-to-cart.tsx` client helper — same pattern Kimi used for `_footer-newsletter.tsx`.)

FILES IN THIS TASK'S SCOPE:
- `src/app/(frontend)/products/[slug]/page.tsx` (server, the page)
- `src/app/(frontend)/products/[slug]/_add-to-cart.tsx` (client, the placeholder button wrapper)

REQUIREMENTS:

**1. The page file.**
- Path: `src/app/(frontend)/products/[slug]/page.tsx`. Server component.
- `params: Promise<{ slug: string }>` — Next 15 pattern. The slug is captured but ignored for now (all slugs return the same product). Use it in the page so it's referenced (e.g. include it in a comment or a small "rendering /products/X" line that we'll delete in TASK-018).
- Default-export an async page function.

**2. Sample product data.**
- Define a constant at the top of the page file (NOT a separate file — we'll delete it in TASK-018):
  ```ts
  const SAMPLE_PRODUCT = {
    name: "Wool Cardigan",
    priceCents: 14500,
    imageSrc: "/migrated-product-images/Facetune_11-06-2024-18-51-27.jpeg",
    imageAlt: "Handwoven wool cardigan in deep red, draped over a wooden chair",
    description:
      "A heavyweight handwoven cardigan in slow-dyed wool. Made one at a time in a small studio outside Kathmandu. Loose, warm, and made to last decades.",
    badge: null as { label: string; variant: "neutral" | "primary" | "accent" | "muted" } | null,
    category: "Cardigans",
    inventoryNote: "Only a few made — once they're gone, they're gone for the season.",
  };
  ```

**3. Page metadata.**
- Export `generateMetadata` that returns title + description from the sample data:
  ```ts
  export async function generateMetadata(): Promise<Metadata> {
    return {
      title: SAMPLE_PRODUCT.name,
      description: SAMPLE_PRODUCT.description,
    };
  }
  ```

**4. Layout structure (desktop, lg+).**
Two-column layout:
- **Left column (image area):** 1/2 of the width. Renders the product image at `aspectRatio="portrait"` (3:4, the standard clothing photography ratio). Uses the Image primitive, `priority` set true (this is the page's main visual).
- **Right column (info area):** 1/2 of the width. Sticky-aligned to the top of the viewport (`lg:sticky lg:top-24`). Vertical stack of:
  - Category eyebrow (small uppercased tracking-wide)
  - Product name (h1, font-serif text-display)
  - Price (h2-equivalent visual, but as a `<p>` — semantic h2 conflicts with the eyebrow / page structure)
  - Optional badge inline (when product has one)
  - Description body (font-sans text-body with comfortable line-height)
  - Inventory note (small italic-ish, brand-gold tint)
  - Add-to-Cart button (full-width within the column on mobile, comfortable size desktop)

**5. Layout structure (mobile, <lg).**
Single column, top to bottom:
1. Image (same portrait aspect, fills width)
2. Info area below (same vertical stack, but full-width)

**6. Exact markup pattern.**
Top of file:
```tsx
import type { Metadata } from "next";
import Image from "@/components/ui/Image";
import Badge from "@/components/ui/Badge";
import { AddToCartButton } from "./_add-to-cart";
```

Outer page structure:
```tsx
<article className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12 py-12 lg:py-16">
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
    {/* Left: image */}
    <div>
      <Image
        src={SAMPLE_PRODUCT.imageSrc}
        alt={SAMPLE_PRODUCT.imageAlt}
        aspectRatio="portrait"
        rounded="lg"
        priority
      />
    </div>
    {/* Right: info, sticky on desktop */}
    <div className="lg:sticky lg:top-24 lg:self-start">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-neutral-ink/60 mb-2">
        {SAMPLE_PRODUCT.category}
      </p>
      <h1 className="font-serif text-display text-neutral-ink mb-4">
        {SAMPLE_PRODUCT.name}
      </h1>
      <div className="flex items-center gap-3 mb-6">
        <p className="font-serif text-h1 text-neutral-ink">
          {formatPriceCents(SAMPLE_PRODUCT.priceCents)}
        </p>
        {SAMPLE_PRODUCT.badge && (
          <Badge variant={SAMPLE_PRODUCT.badge.variant} size="md">
            {SAMPLE_PRODUCT.badge.label}
          </Badge>
        )}
      </div>
      <p className="font-sans text-body text-neutral-ink/80 leading-relaxed mb-6">
        {SAMPLE_PRODUCT.description}
      </p>
      <p className="font-sans text-small text-brand-gold-700 italic mb-8">
        {SAMPLE_PRODUCT.inventoryNote}
      </p>
      <AddToCartButton />
    </div>
  </div>
</article>
```

**7. The `formatPriceCents` helper.**
- ProductCard already has this helper inline. **For this task, copy the same function inline at the top of `page.tsx`**. Do NOT extract to a shared utility yet — CLAUDE.md "consolidate once the pattern is settled" applies, and a third consumer (Product list page) is the natural trigger for extraction.
- Identical implementation to ProductCard's:
  ```ts
  function formatPriceCents(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  }
  ```
- Flag in output notes that we now have two copies of this helper. The third consumer triggers extraction to `src/lib/format.ts` or similar.

**8. The Add-to-Cart button (`_add-to-cart.tsx`).**
- Path: `src/app/(frontend)/products/[slug]/_add-to-cart.tsx`. First line: `"use client";`.
- Wraps the `<Button>` primitive. When clicked, shows a brief acknowledgment using `window.alert("Cart isn't wired up yet — Phase 3.")` or similar inline behavior. Do NOT add state, toast libraries, or any cart-store concerns.
- Component shape:
  ```tsx
  "use client";
  import Button from "@/components/ui/Button";
  export function AddToCartButton() {
    return (
      <Button
        variant="primary"
        size="lg"
        className="w-full sm:w-auto"
        onClick={() => {
          window.alert("Cart isn't wired up yet — Phase 3.");
        }}
      >
        Add to cart
      </Button>
    );
  }
  ```
- `className="w-full sm:w-auto"` — full-width on mobile (touch-friendly CTA), natural width on larger screens.

**9. Accessibility.**
- `<h1>` is the product name (page-level heading).
- The image's `alt` is the descriptive prop on Image (TASK-009 enforced at the type level).
- The Add-to-Cart button is a real `<button>` (via the Button primitive) — keyboard-focusable, gold focus ring inherited.
- The category eyebrow is purely visual context; no special semantics needed.

**10. Other rules.**
- Server component for the page (`page.tsx`). Client component only for `_add-to-cart.tsx`.
- No `<Link>` wrapping anywhere on this page (the page is the destination, not the source).
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

OUT OF SCOPE:
- Do NOT add an image gallery (multiple thumbnails, lightbox, zoom). Single image only for this task.
- Do NOT add a variant picker (size, color). Most products are one-size; the few with variants are a later TASK.
- Do NOT add a quantity selector. Defer.
- Do NOT add "related products" / "you might also like" / cross-sell sections.
- Do NOT add product reviews or ratings.
- Do NOT add breadcrumbs (Home > Cardigans > Wool Cardigan).
- Do NOT add structured-data JSON-LD for SEO. Polish task.
- Do NOT fetch from Payload — that's TASK-018.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npm run check` exits 0.
- After deploy, visiting ANY URL matching `/products/<anything>` shows the same hardcoded Wool Cardigan PDP.
- Desktop: image left, sticky info column right, side-by-side at `lg`+ breakpoint.
- Mobile: image on top, info stacked below.
- Add-to-Cart button shows a JS alert when clicked.
- HTML `<title>` reads "Wool Cardigan".
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm the page is a server component and the AddToCartButton is in a sibling `_add-to-cart.tsx` client file.
- Confirm `formatPriceCents` is inlined in the page file (not extracted yet) — flag that we now have two copies and a third consumer should trigger extraction.
- State your sticky-positioning offset (`lg:top-24` is the spec suggestion — adjust if you find a better value that accounts for the Header height).
- Flag any place you were uncertain about visual layout, copy tone, or the brand-gold inventory note treatment.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **Page is a server component** — no `"use client"` on `page.tsx`. The `AddToCartButton` lives in a sibling `_add-to-cart.tsx` client file, following the same wrapper pattern as `_footer-newsletter.tsx`.
- **`formatPriceCents` is inlined** in the page file (not extracted). This is now the second copy (ProductCard has the first). A third consumer should trigger extraction to `src/lib/format.ts` or similar per CLAUDE.md "consolidate once the pattern is settled."
- **Sticky positioning offset:** `lg:top-24` — the Header's inner container has `py-4 lg:py-5` plus the border, so the Header is roughly `~4.5rem` tall. `top-24` (6rem) gives comfortable breathing room without the info column sticking too low. `lg:self-start` prevents the sticky column from stretching to match the image column height.
- **Brand-gold inventory note:** `text-brand-gold-700 italic` — the gold tint warms the scarcity message without making it feel alarmist. The italic softens the tone to match the artisan brand voice.
- **Price rendered as `<p className="font-serif text-h1">`** — the spec calls it "h2-equivalent visual, but as a `<p>`" to avoid semantic heading conflicts. I used `text-h1` for visual prominence since it's the most important info after the product name, but kept it as a `<p>` tag.
- **Badge is null in sample data** — the render guard (`SAMPLE_PRODUCT.badge &&`) handles this cleanly; when TASK-018 wires real data, badges will render automatically.
- **No blocklisted paths touched.**
- **No new npm dependencies added.**
- **`npm run check` passes with exit 0.**
