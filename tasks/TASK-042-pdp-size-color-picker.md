TASK ID: TASK-042
PHASE: Phase 2 — Storefront (variants, two-dimensional)
GOAL: Extend the PDP variant selector to handle BOTH color and size dimensions. A product may have variants distinguished by color, by size, by both, or by neither. The picker renders only the relevant rows: color row + size row, just one, or none. Selecting a (color, size) pair narrows down to a specific ProductVariant and updates gallery / price / Add-to-cart / inventory display accordingly. Size buttons gray out when the matching variant is out of stock for the currently-selected color.

CONTEXT:

Phase B (TASK-041, shipped) wired up color-only variants. The PDP renders a swatch row, clicking a swatch swaps gallery/price/add-to-cart. Phase C (just shipped) made the checkout, Stripe metadata, and Order line items variant-aware. Phase A.5 (just shipped) converted `ProductVariants.size` from a free text field to a `select` with six options: `Small | Medium | Large | XL | XXL | One size fits most`.

What sister actually needs now: products that come in multiple colors AND multiple sizes. The canonical example is the Romper — Teal/Crimson in Small/Medium/Large/XL/XXL. That's 10 ProductVariants per product (one per leaf SKU), each with its own inventory.

The data model is finalized — one ProductVariant per (color, size) leaf SKU. This task is the storefront work that renders the right pickers and resolves a (color, size) pair to the matching variant.

The PDP must also continue to handle the single-dimension cases gracefully:
- **Color only** (current Romper-with-Teal): keep TASK-041 behavior. No size row.
- **Size only** (e.g. a cream tunic in S/M/L/XL with no color variation): render only the size row.
- **Both** (Romper in two colors × five sizes): render both rows.
- **Neither** (no ProductVariants exist): page renders exactly as today, no pickers.

Inventory display rule:
- The "Only N left" / "Sold out" line under the price reflects the currently-resolved variant's `inventoryCount`.
- Size buttons gray out per-color: if no variant matches `(currentColor, thatSize)`, OR the matching variant has `inventoryCount <= 0`, the button is disabled.
- Color swatches gray out only when EVERY variant of that color is out of stock.
- If a `(color, size)` pair has no matching variant, the Add-to-Cart shows "This combination isn't available" and is disabled. That's a safety net — sister might create incomplete variant matrices.

OUT OF SCOPE:
- Any change to `/api/checkout`, `/api/webhooks/**`, `src/lib/orders/**`, or `src/lib/inventory.ts` (blocklisted — Phase C is done, Phase D pending)
- Stripe / payment / order persistence
- Inventory decrement on payment success (Phase D)
- New Payload collections or fields (Phase A.5 covered the size enum)
- Cart store changes (TASK-041 already keys on `(productId, variantId)` — works for size+color combinations as-is since variantId is the leaf SKU)
- Admin matrix builder (sister enters one variant per row, by hand)

FILES TO CREATE OR MODIFY:

**Storefront (Kimi):**

- `src/app/(frontend)/products/[slug]/_pdp-variant-selector.tsx` — the heaviest lift. Refactor selection state from "selected variant id" to "selected (color, size) pair", derive the resolved variant from that pair. Render two pickers conditionally. Update keyboard / aria / sold-out logic to work across both dimensions.
- `src/app/(frontend)/products/[slug]/page.tsx` — no real behavior change. The variant fetch query already pulls every variant for the product. Just confirm the existing branching (`variants.length > 0 ? <Selector> : <plain>`) still works after the selector refactor; pass the variants array through unchanged.

**Reference (do not modify, just read):**

- `src/payload-types.ts` — `ProductVariant.size` is now `'Small' | 'Medium' | 'Large' | 'XL' | 'XXL' | 'One size fits most' | null`. `ProductVariant.color` remains free-text string-or-null. Both can be null on the same variant (means "no color/size distinction").
- `src/store/cart.ts` — `addItem` accepts a CartItem with optional `variantId` and `variantLabel`. Pass `variantLabel = variant.color && variant.size ? "Crimson, Small" : variant.color ?? variant.size ?? undefined` so the cart UI shows the full label for both-dimensional items.
- `src/collections/ProductVariants.ts` — for reference, the field shape. Don't edit.
- The current `_pdp-variant-selector.tsx` is your starting point; the refactor is substantial but the visual / aria / focus patterns established there should carry over.

REQUIREMENTS:

**1. Derive available dimensions from the variants array.**

```ts
const colors = [...new Set(variants
  .map((v) => v.color)
  .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
)];
const sizes: ProductVariant["size"][] = [...new Set(variants
  .map((v) => v.size)
  .filter((s): s is NonNullable<ProductVariant["size"]> => Boolean(s))
)];
```

Render the color row iff `colors.length > 0`. Render the size row iff `sizes.length > 0`. Order sizes by their canonical small-to-large order (Small, Medium, Large, XL, XXL, One size fits most) — don't rely on creation order, which would put "One size fits most" between sizes if sister created it second.

Suggested canonical sort:
```ts
const SIZE_ORDER: ProductVariant["size"][] = ["Small", "Medium", "Large", "XL", "XXL", "One size fits most"];
const sortedSizes = sizes.slice().sort((a, b) =>
  SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)
);
```

For colors, keep creation order (`sort: "createdAt"` is already applied in page.tsx) — sister picks the visual order by the order she creates variants.

**2. Selection state shape.**

Move from `selectedId: number` to:

```ts
const [selectedColor, setSelectedColor] = useState<string | null>(/* default */);
const [selectedSize, setSelectedSize] = useState<string | null>(/* default */);
```

Initial values:
- `selectedColor` = first color that has at least one in-stock variant; else first color; else `null` if no colors exist.
- `selectedSize` = first in-stock size for `selectedColor` (or for the product overall if no colors exist); else first size; else `null`.

When color changes:
- If the new color doesn't have any variant matching the current `selectedSize`, reset `selectedSize` to the first in-stock size for that color (or the first size).

When size changes:
- Color stays the same. If no matching variant exists for `(currentColor, newSize)`, the resolved variant becomes null and Add-to-cart disables.

**3. Resolve the selected variant.**

```ts
function resolveVariant(
  variants: ProductVariant[],
  color: string | null,
  size: string | null
): ProductVariant | null {
  return variants.find((v) => {
    const vColor = (v.color ?? null) || null;
    const vSize = (v.size ?? null) || null;
    return vColor === color && vSize === size;
  }) ?? null;
}
```

Treat empty-string color/size as null. The resolved variant drives:
- Gallery images: variant's own images if non-empty, else product.images
- Price: variant.price ?? product.basePrice
- Add-to-cart: variantId = resolved.id, variantLabel = formatted label (see below)
- Inventory line: based on resolved variant's inventoryCount
- Disabled add-to-cart when resolved is null OR resolved.inventoryCount <= 0

If `resolveVariant` returns `null` (combination doesn't exist), render:
- Disabled Add-to-cart with copy "This combination isn't available"
- No inventory line
- Fall back to product.images for the gallery
- Fall back to product.basePrice for the displayed price (since we can't say what this hypothetical variant would cost)

**4. Variant label formatter.**

```ts
function formatVariantLabel(color: string | null, size: string | null): string | undefined {
  if (color && size) return `${color}, ${size}`;
  if (color) return color;
  if (size) return size;
  return undefined;
}
```

Pass this into `AddToCartButton` as `variantLabel`. The cart row already reads `variantLabel` and displays "Color: Crimson, Small" — accept that header even though it's mixing color and size. (Improving the cart label semantics is out of scope; the "Color:" prefix is already shipped and not worth a rewrite for this task.)

**5. Size row UI.**

Sizes are text buttons — no swatch dot equivalent. Match the structure of the color row but with bigger rectangular pill buttons:

- Rounded rectangle button, `min-h-[40px]` tap target, `px-4` padding
- Body text: the size label ("Small", "XL", "One size fits most")
- Selected: 2px brand-red-600 ring
- Unselected: 1px neutral-ink/20 ring, hover ring-neutral-ink/40
- Out of stock for current color: 50% opacity, `aria-disabled="true"`, click is no-op
- Below or inside the button when disabled: small "Sold out" text (same style as color row)

Row label: `Size: <selected size or "—">` in `font-sans text-small font-medium text-neutral-ink/80 mb-3`. Same typographic pattern as the color row.

Wrap the row in `role="radiogroup"` with `aria-label="Size"`. Each button is `role="radio"` with `aria-checked={isSelected}`. Roving tabindex like the color row. Arrow keys cycle horizontally.

**6. Color row UI (mostly unchanged).**

Keep the existing TASK-041 swatch row. Sold-out semantics tighten:

A color is "all sold out" when every variant of that color has `inventoryCount <= 0`. Visualize the same way as TASK-041 — 50% opacity, "Sold out" below.

A color is sold-out *for the currently-selected size* when the `(color, currentSize)` variant has 0 inventory or doesn't exist. We do NOT gray the color swatch in this case — only the size button — because the customer might want to switch to that color and a different size. Grey-out a color only when no size at all is available in it.

**7. Inventory line under the price.**

Same rules as TASK-041, but driven by the resolved variant:

- Resolved variant is null: render no line (we already disable add-to-cart with the "combination not available" copy)
- Resolved.inventoryCount = 0: "Sold out" in `text-small text-neutral-ink/60`
- Resolved.inventoryCount 1..3: "Only N left" in `text-small text-brand-red-700`
- Resolved.inventoryCount > 3: no line

**8. Price.**

Resolved variant's `price` override if set, else `product.basePrice`. Re-format with `formatPriceCents` on each render.

**9. Gallery.**

If the resolved variant has its own non-empty `images` array (any entry with `image.url`), use those. Otherwise fall back to the existing `productGalleryImages` prop. Same logic as TASK-041 — extend it to use the resolved variant rather than the previous `selectedVariant`.

**10. Edge cases the spec covers explicitly:**

- A product has variants where one has only color (e.g. "Teal" with no size set) and others have color + size. Treat the "color-only" variant as `(color="Teal", size=null)`. The picker will offer the regular sizes plus needs to be selectable when `selectedSize === null`. Easiest: if a color has at least one no-size variant, the size picker still appears for that color (showing real sizes greyed unless they exist for that color), and a "—" or "Default" sentinel may need to appear in the size set. Simpler alternative: if `sizes.length === 0`, don't render the size row at all even if some variants have null size. Pick the simpler path and document the choice in your notes.

- A variant has both color = null and size = null. Skip it for selector purposes (it's effectively the product's basePrice variant — same as zero-variant case, no picker needed). The page.tsx branching will still render the selector since `variants.length > 0`; just don't include the all-null variant in the colors or sizes lists.

- All variants of a single color are out of stock: color is greyed, but stays selectable (so the customer can see "Crimson — Sold out across all sizes" by clicking it). Actually let's not — keep it as "selectable but greyed" per TASK-041's pattern: tapping a sold-out swatch is a no-op in TASK-041 too. Be consistent.

- Pre-launch carts in localStorage (version 2 already drops them). No special handling needed here.

ACCEPTANCE:

- `npm run check` exits 0
- **Romper with 1 Teal/Small variant** (current state on prod): renders color picker (one Teal swatch) + size picker (one Small button). Both selected by default. Add-to-cart shows price + active.
- **Add a Crimson/Medium variant in admin**: PDP renders 2 colors × 2 sizes. Default is first-in-stock-combo. Clicking Crimson should also auto-select Medium (or stay on Small if Crimson has Small). Same for clicking Large — if Crimson doesn't have Large but Teal does, Crimson's Large button is greyed.
- **Color-only product** (no size on any variant): no size row. Behaves identically to TASK-041.
- **Size-only product** (no color on any variant): no color row. Size row alone drives the variant resolution.
- **Combination that doesn't exist** (e.g. Crimson/XXL when sister didn't create that variant): Add-to-cart copy switches to "This combination isn't available" and is disabled.
- **All sizes sold out for one color**: color swatch is selectable but greyed; size buttons all disabled with "Sold out" labels.
- **Cart UI** still shows "Color: Crimson, Small" via the existing variantLabel mechanism (no rewrite of cart UI).
- **Keyboard nav**: arrow keys move inside each radiogroup independently. Tab moves between the color radiogroup and the size radiogroup. Focus rings visible.
- **Hydration**: initial server render matches client render — the `selectedColor` / `selectedSize` defaults are deterministic from the variants prop, so `useState` initial values match between SSR and hydration. No flash.

OUTPUT NOTES FOR REVIEWER:

- Document which approach you took for the "variant has null size in a product that otherwise has sized variants" edge case
- Confirm the size pill min-h-[40px] meets the 44px tap-target rule on small screens (or document the deliberate downscale)
- If you found yourself wanting a shared `VariantPicker<Dimension>` component that handles both color and size with different render bodies — flag it but DO NOT extract yet. The two pickers are similar enough to consider DRYing later, but two specific components for now beats a premature abstraction.
- If the cart "Color:" label feels wrong for size-only items, note your concern — we'll fix the cart UI in a follow-up, NOT in this task.
- Mention any place where the resolver felt fragile (null/empty-string coalescing, in particular).
