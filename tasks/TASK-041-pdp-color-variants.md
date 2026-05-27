TASK ID: TASK-041
PHASE: Phase 2 — Storefront (variants)
GOAL: Wire the PDP and cart to support color variants. When a product has one or more `ProductVariants`, the PDP shows a swatch row under the price; clicking a swatch updates the gallery, price, and "Add to cart" target to that variant. Cart line items key on `(productId, variantId)` so two colors of the same product are separate lines.

CONTEXT:

Phase A (just landed) added two schema fields: `Products.inventoryCount` (optional number) and `ProductVariants.swatchHex` (optional hex string). The storefront does not yet read variants at all — the PDP shows a single price + single gallery + single "Add to cart" button driven entirely by Product fields. This task is the storefront half of the variant story.

Behavior we're after — close to Amazon's color picker:

- Product with **zero variants**: PDP renders exactly as today. Don't introduce a swatch row, don't change anything visible. Selectors only appear when variants exist. This preserves the "one size, fits everyone" brand pillar for the products that don't need a color choice.
- Product with **one or more variants**: PDP renders a "Color: <name>" row directly under the price, with one swatch per variant. First in-stock variant is selected on initial render. Clicking a swatch swaps the gallery, the displayed price, and the variant the "Add to cart" button targets. Sold-out variants stay visible but grayed with a "Sold out" label — shoppers should still see colors that exist, just know they're unavailable.

The cart also has to learn about variants in this task. Two Crimson Rompers in the cart consolidate to qty=2 on a single line; one Crimson + one Indigo are two separate lines. Variant info displays in the cart UI ("Color: Crimson") so shoppers know what they're buying.

The `/api/checkout` server-side change to honor `variantId` is **Phase C**, not this task. For now the cart should send `variantId` in its outgoing checkout payload (server will ignore unknown fields). That way when Phase C lands, no client change is needed.

Inventory **display** (the "Only N left" / "Sold out" badges) is in scope. Inventory **enforcement** at checkout is Phase D.

OUT OF SCOPE for this task:
- Any change to `/api/checkout`, `/api/webhooks/**`, or `src/lib/orders/**` (blocklisted; Phase C/D)
- Adding new Payload collections or fields (Phase A is done)
- Stripe / payment changes
- Inventory decrement on order success (Phase D)
- Size variants (we're not using size — color only)

FILES TO CREATE OR MODIFY:

**Storefront (Kimi):**

- `src/app/(frontend)/products/[slug]/page.tsx` — fetch variants for the product server-side. Pass the variant list down to the client variant picker (which replaces / wraps the current AddToCart and Gallery sections).
- `src/app/(frontend)/products/[slug]/_pdp-variant-selector.tsx` — **NEW** client component. Owns the selected-variant state. Renders the swatch row + the gallery (PdpGallery) + price + AddToCart. Lifts what was previously composed inline in page.tsx so this component can coordinate the three sub-pieces from a single source of truth.
- `src/app/(frontend)/products/[slug]/_add-to-cart.tsx` — extend props with optional `variantId`, `variantLabel` (e.g. "Crimson") so it forwards them to the cart on click.
- `src/store/cart.ts` — cart items gain an optional `variantId?: number` and optional `variantLabel?: string`. `addItem` / `removeItem` / `updateQuantity` now key on `(productId, variantId)` — change all three. Bump persist `version` from 1 to 2 with a migration that drops the persisted state (legacy carts may have items without variantId — easiest to discard rather than try to backfill). `selectItemCount` and `selectSubtotalCents` keep working unchanged since they reduce over `items`.
- `src/app/(frontend)/cart/page.tsx` and any cart-row component it uses — display the variant label under the product name when present (e.g. "Color: Crimson"). Quantity +/- and remove buttons need to pass both `productId` and `variantId` to the cart-store methods.
- The site cart-count badge in the header reads `selectItemCount` which is unaffected — no change needed there.
- `src/app/(frontend)/cart/page.tsx` (checkout button site): include `variantId` in the array sent to `/api/checkout`. Existing call site sends `[{ productId, quantity }]` — extend to `[{ productId, variantId?, quantity }]`. Server will ignore the extra field until Phase C wires it.
- `src/app/(frontend)/cart/success/page.tsx`: no change required, but if you display product names on the success page, the variant label should be appended ("Romper — Crimson") if available. The snapshot in Stripe metadata is read-only here; you can append the variant label from the cart state if it's still in localStorage (the ClearCart effect runs *after* render).

**Reference (do not modify, just read):**

- `src/collections/ProductVariants.ts` — variant schema. Note `inventoryCount` is required + has default 0; `price` is the optional override.
- `src/components/storefront/ProductCard.tsx` — for visual conventions (rounded corners, ring focus, etc.)
- `src/payload-types.ts` — generated `ProductVariant` type. Variant identity is `id: number`.

REQUIREMENTS:

**1. Variant fetch on PDP.**

In `page.tsx`'s `getProductBySlug` (or a sibling query after it), fetch variants for the product:

```ts
const variantResult = await payload.find({
  collection: "product-variants",
  where: { product: { equals: product.id } },
  sort: "createdAt",
  limit: 100,
  depth: 1,
});
const variants = variantResult.docs as ProductVariant[];
```

Pass `variants` to the new `<PdpVariantSelector>` client component. If the array is empty, render the page exactly as today (single gallery, single price, plain AddToCart) — do not render the new selector at all. This branching avoids destabilizing the no-variant path.

**2. Swatch row UI.**

For each variant:
- If `swatchHex` is set (matches `/^#[0-9a-fA-F]{6}$/`): render a circular swatch with `background-color: ${swatchHex}` and a 1px neutral-ink/20 ring (or 2px brand-red-600 ring when selected). ~40px diameter on mobile, ~44px on desktop — comfortable tap target.
- If `swatchHex` is blank or invalid: render a rounded text-button showing the color name. Same selection ring rules.
- Sold-out variants (`inventoryCount <= 0`): 50% opacity, `aria-disabled="true"`, click is a no-op (don't change selection). Below or inside the swatch, render "Sold out" text in `text-small text-neutral-ink/60`.
- Label above the row: `Color: <selected variant's color name>` in `font-sans text-small font-medium text-neutral-ink/80`.

Accessibility: wrap the row in `role="radiogroup"` with `aria-label="Color"`. Each swatch is `<button role="radio" aria-checked={isSelected}>` with arrow-key navigation (Left/Right or Up/Down to move; Enter/Space to select). If lift-and-shift is too much, an `aria-pressed` button group is acceptable, but document the trade-off in your notes. Tooltip / `aria-label` on each swatch should announce the color name even when it's a hex-only dot.

**3. Selection state + side effects.**

Selected variant ID lives in `useState` inside `PdpVariantSelector`. Initial value: the first variant with `inventoryCount > 0`. If all are sold out, the first variant in the list (so the shopper sees the color name + "Sold out" badge).

When selection changes:
- Gallery images update. If selected variant has its own `images` array with at least one entry, use those; otherwise fall back to the product's `images`.
- Displayed price updates. If selected variant has a non-null `price` (override), format that; else format the product's `basePrice`.
- AddToCart's `productId` stays the same, `variantId` is the selected variant's id, `variantLabel` is the selected variant's color name, `priceCents` is the active price (override or base), `imageSrc`/`imageAlt` reflect the active gallery's first image.
- Inventory display under the price:
  - `0`: "Sold out" — disable Add to cart entirely
  - `1..3`: "Only N left" in `text-small text-brand-red-700`
  - `> 3`: no line shown

**4. Cart store changes.**

`CartItem` type:

```ts
export type CartItem = {
  productId: number;
  variantId?: number;
  productSlug: string;
  name: string;
  variantLabel?: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  quantity: number;
};
```

Identity helper:

```ts
const sameLine = (a: { productId: number; variantId?: number }, b: { productId: number; variantId?: number }) =>
  a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null);
```

Use `sameLine` in `addItem`, `removeItem`, `updateQuantity`. Signatures for the latter two become `(productId, variantId | undefined, ...)`.

`persist` config: bump `version` from 1 to 2, add `migrate: (_state, fromVersion) => fromVersion < 2 ? { items: [] } : _state` to drop legacy carts. Bumping version + dropping is acceptable because at-launch we don't yet have any real carts to preserve.

**5. AddToCart props.**

```ts
type AddToCartButtonProps = {
  productId: number;
  variantId?: number;
  productSlug: string;
  name: string;
  variantLabel?: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
  disabled?: boolean;
};
```

When `disabled` is true (sold out): render the Button with `disabled` and copy "Sold out" instead of "Add to cart".

**6. Cart UI.**

In the cart page row, below the product name show `Color: {variantLabel}` in `text-small text-neutral-ink/60` when `variantLabel` is present. The remove and quantity controls should call the store methods with the row's `productId` and `variantId`.

OUT OF SCOPE:
- (repeated above; do not change checkout, webhooks, orders, or inventory mutation logic)

ACCEPTANCE:
- `npm run check` exits 0
- Product with zero variants: PDP renders identically to today (no swatch row, no inventory line, AddToCart unchanged)
- Product with two color variants:
  - Both swatches visible under "Color: <selected>"
  - Default selection is the first in-stock variant
  - Clicking a swatch updates gallery (when variant has images), price (when variant has price override), and AddToCart target
  - Sold-out variant shows as grayed with "Sold out" label, clicking it does nothing
  - "Only N left" badge appears when selected variant's inventoryCount is 1..3
- Adding two different color variants to the cart creates two distinct cart rows
- Adding the same color variant twice consolidates to quantity 2 on one row
- Cart row shows the variant label under the product name
- Refreshing the page does not lose the cart (zustand persist still works); legacy carts (no variantId) are dropped cleanly via the v2 migration
- Cart's checkout call to `/api/checkout` includes `variantId` per item (verify in browser devtools network tab — server will ignore the field until Phase C)
- Keyboard: arrow keys move between swatches, Enter/Space selects, focus ring is visible (brand-gold-400)

OUTPUT NOTES FOR REVIEWER:
- Confirm your swatch sizing on mobile vs desktop (tap-target check) and which radiogroup ARIA pattern you chose
- Flag any place where the variant `price` override / `images` override felt ambiguous in spec — fallback logic is "if non-empty/non-null, use variant; else use product"
- If you considered consolidating product+variant fetching into a single request (e.g. depth: 2 on the product query): we want them separate so a product with 50 variants doesn't blow up the depth=1 product fetch. Mention if you saw any other reason to combine.
- Note any concern about hydration: the selector is a client component, but the initial markup (first in-stock variant's gallery + price) should render server-side from the same defaults so there's no flash.
- If `swatchHex` is set but invalid (e.g. "red" instead of "#9B2C2C"), document how you handled it — preferred: silently fall back to text-button mode for that variant, do not throw.
