TASK ID: TASK-023
PHASE: Phase 2 (Phase 3 boundary)
GOAL: Land the cart state layer — a zustand store with localStorage persistence — and wire the two minimum consumers needed to verify it end-to-end: the PDP's Add-to-Cart button (writes), and a new Header cart-count badge (reads). After this, clicking "Add to cart" on a PDP increments the count in the Header, and the count survives page reloads. Drawer UI and full cart page are separate later tasks.

CONTEXT:
The cart is the first piece of stateful client-side infrastructure. CLAUDE.md "Tech stack ground rules" explicitly names **zustand for cart (with localStorage persistence)** — so adding the `zustand` dependency counts as pre-approved (the only new dep allowed in this task).

Three things to get right that don't show up on visual review:

1. **Server/client hydration.** Cart state lives in localStorage, which doesn't exist on the server. If a server-component renders a count and the client renders a different count after hydration, React throws a hydration mismatch warning AND visually flashes the wrong value. The fix is to render a stable shell on the server (no count), then "upgrade" to the real count after the client has hydrated. Pattern: small client component with a `useEffect`-set `hydrated` flag.

2. **Snapshot product data at add-time.** When a user adds a product to the cart, snapshot the fields the cart needs (id, slug, name, price, image). DO NOT store just an ID and re-fetch — products change, get archived, get deleted, and the cart should reflect what the user *thought* they were buying. Stripe checkout will trust the snapshot. (Phase 3 inventory validation happens at checkout-create time, in blocklisted code.)

3. **Header stays a server component.** The cart count is a small client-rendered fragment INSIDE the Header's server-rendered shell, not the other way around. Same pattern as Footer + NewsletterSignup from TASK-013. Wrapping the whole Header in `"use client"` would force every nav Link onto the client bundle for no reason.

Out of scope here: cart drawer (TASK-024), `/cart` page (TASK-025), checkout, real inventory checks (blocklisted), variant-level cart items (we don't have variant UX yet anyway).

FILES TO CREATE OR MODIFY:

**Create:**
- `src/store/cart.ts` — zustand store + types + selector hooks.
- `src/components/storefront/_cart-count.tsx` — tiny client component that reads cart count from the store and renders the cart button label. Will be rendered INSIDE Header's existing cart Link.

**Modify:**
- `package.json` — add `zustand` to `dependencies`.
- `src/components/storefront/Header.tsx` — remove the `cartCount` prop from `HeaderProps` and the function signature; replace the cart Link's text content with `<CartCount />` from the new helper file.
- `src/app/(frontend)/products/[slug]/_add-to-cart.tsx` — accept product-data props, call `useCart().addItem(...)` on click, drop the `window.alert` placeholder.
- `src/app/(frontend)/products/[slug]/page.tsx` — pass the product-data props down to `<AddToCartButton>`.
- `src/app/(frontend)/design-test/page.tsx` — the `<Header cartCount={3} />` demo no longer accepts that prop. Replace with just `<Header />` (or delete the second Header demo entirely since count is now globally subscribed and the demo doesn't add real meaning).

REQUIREMENTS:

**1. Install zustand.**
```
npm install zustand
```
Verify after install: `npm ls zustand` should show `zustand@5.x.x` (latest stable). No other deps should change. Commit the lockfile update with the rest of the work.

**2. The cart store (`src/store/cart.ts`).**

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: number;       // Payload Product.id
  productSlug: string;     // for /products/<slug> links from the cart
  name: string;            // snapshotted at add-time
  priceCents: number;      // snapshotted at add-time (integer cents per CLAUDE.md money rules)
  imageSrc: string;        // snapshotted at add-time; may be "" if product had no image
  imageAlt: string;        // snapshotted at add-time
  quantity: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        }),
      removeItem: (productId) =>
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        })),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.productId !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.productId === productId ? { ...i, quantity } : i
            ),
          };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "nepali-threads-cart",
      version: 1,
    }
  )
);

// Selector helpers — components subscribe to these so they don't re-render
// on unrelated state changes.
export const selectItemCount = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.quantity, 0);

export const selectSubtotalCents = (state: CartState): number =>
  state.items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
```

Notes:
- The `addItem` arg is `Omit<CartItem, "quantity">` because quantity is always 1 on add (you can't "add 3" from the PDP — quantity edit lives on the cart page later). Adding a second time increments the existing line.
- `updateQuantity` with `quantity <= 0` removes the line, matching common cart UX. Used by the future cart page; not exercised today.
- `persist` middleware uses `name` as the localStorage key. `version: 1` allows future migrations if the shape changes.
- Selector helpers (`selectItemCount`, `selectSubtotalCents`) are exported for components to subscribe to derived values. **Components should use selectors** rather than reading `state.items` directly when they only need a derived number — selectors prevent re-renders when unrelated cart fields change. Pattern: `const count = useCart(selectItemCount);`.

**3. The Header cart-count badge (`src/components/storefront/_cart-count.tsx`).**

This is a small client component that:
- Reads `useCart(selectItemCount)` from the store
- Renders "Cart" when count is 0 OR before hydration
- Renders "Cart (N)" when count > 0 after hydration
- Avoids hydration mismatch via a `hydrated` flag set in `useEffect`

```tsx
"use client";

import { useEffect, useState } from "react";
import { selectItemCount, useCart } from "@/store/cart";

export function CartCount() {
  const [hydrated, setHydrated] = useState(false);
  const itemCount = useCart(selectItemCount);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Pre-hydration: render the no-count label so SSR HTML matches the
  // initial client render. After hydration, swap to the real count.
  if (!hydrated || itemCount === 0) {
    return <span>Cart</span>;
  }
  return <span>Cart ({itemCount})</span>;
}
```

Why this works: SSR renders "Cart" (no count, because `hydrated` defaults false and server has no localStorage). Client initial render also returns "Cart" for the same reason — `hydrated` is false on first client render. After `useEffect` fires, `setHydrated(true)` triggers a re-render and the real count appears. No mismatch.

**4. Update Header (`src/components/storefront/Header.tsx`).**

- Remove `cartCount?: number` from `HeaderProps`.
- Remove `cartCount = 0` from the function signature.
- Replace the cart Link's text content (currently `{cartCount > 0 ? \`Cart (${cartCount})\` : "Cart"}`) with `<CartCount />`.
- Add `import { CartCount } from "./_cart-count";` at the top.

Header itself stays a server component. The CartCount client component sits inside the cart Link's children, and React 19 handles the server→client boundary cleanly (same pattern Footer uses to embed NewsletterSignup).

**5. Update AddToCartButton (`src/app/(frontend)/products/[slug]/_add-to-cart.tsx`).**

Replace the entire file:

```tsx
"use client";

import Button from "@/components/ui/Button";
import { useCart } from "@/store/cart";

type AddToCartButtonProps = {
  productId: number;
  productSlug: string;
  name: string;
  priceCents: number;
  imageSrc: string;
  imageAlt: string;
};

export function AddToCartButton(props: AddToCartButtonProps) {
  const addItem = useCart((state) => state.addItem);

  return (
    <Button
      variant="primary"
      size="lg"
      className="w-full sm:w-auto"
      onClick={() => addItem(props)}
    >
      Add to cart
    </Button>
  );
}
```

Notes:
- `useCart((state) => state.addItem)` selects the `addItem` action only — this won't cause re-renders when `items` changes (which is good, since the button doesn't need to know about other items).
- No `window.alert` anymore. The user feedback is the Header badge counting up. (When the drawer lands in TASK-024, that'll provide richer feedback — for now, the badge is the signal.)

**6. Update PDP (`src/app/(frontend)/products/[slug]/page.tsx`).**

Find the `<AddToCartButton />` render at the bottom of the right-info column. Pass the product data:

```tsx
<AddToCartButton
  productId={product.id}
  productSlug={product.slug}
  name={product.name}
  priceCents={product.basePrice}
  imageSrc={firstImage?.url ?? ""}
  imageAlt={firstImage?.alt ?? product.name}
/>
```

`firstImage` is already derived earlier in the page for the left-column Image render. Reuse it for the AddToCartButton image snapshot.

**7. Update the design-test page (`src/app/(frontend)/design-test/page.tsx`).**

The current design-test renders `<Header cartCount={3} />` as one of the demos. That prop no longer exists. Two options:
- (a) Remove the second Header demo entirely — leave just the default `<Header />` instance. Simplest.
- (b) Keep both Headers but with no prop on either (which is identical and pointless).

**Go with (a):** delete the `<Header cartCount={3} />` block and its space-y-6 wrapper now wraps a single Header (or just drop the space-y-6 since one item doesn't need vertical spacing). Update the caption accordingly: drop "and the with-items state" — just say "Full-width on real pages; here showing the default state."

**8. Accessibility.**

- The CartCount-rendered text inside the cart Link is the link's accessible name. SR users hear "Cart link" (count = 0) or "Cart 3 link" (count = 3). Clear enough; no aria-label needed.
- The hydration shell ("Cart" before hydration) matches the post-hydration label when count is 0, so SR users don't get a jarring re-announcement on hydration in the common case.

OUT OF SCOPE:
- Cart drawer / slide-out panel (TASK-024).
- Full `/cart` page with line-item editing (TASK-025).
- Quantity selector on the PDP (defer; PDP can add multiple by clicking multiple times for now).
- Variant-level cart items (we don't have variant UX in PDP yet).
- Real inventory validation at add-time (blocklisted; checkout-time validation lives in Stripe-adjacent code).
- Cart abandonment, save-for-later, wishlists, gift-message, anything else.
- A `clearCart` UI affordance anywhere.
- Migration logic for cart shape changes. Version 1, fresh starts. Future migration story lives with the version bump.
- Anything that touches blocklisted files.

ACCEPTANCE:
- `npm run check` exits 0.
- `npm install` completes; `npm ls zustand` reports `zustand@5.x.x`.
- After deploy, **manually verified in a browser** (this matters — the SSR/hydration story can't be confirmed from build output alone):
  - First visit to any page shows the Header cart link as "Cart" with no count.
  - Visit `/products/test-romper` (Test Romper still published?), click "Add to cart". Header link updates to "Cart (1)".
  - Click again → "Cart (2)".
  - Reload the page. Header still says "Cart (2)" — persistence works.
  - Open the browser console: no hydration-mismatch warnings.
  - Open localStorage in DevTools: key `nepali-threads-cart` exists with the items array serialized.
- No new entries in `package.json` `dependencies` BEYOND zustand.

OUTPUT NOTES FOR REVIEWER:
- Confirm `zustand` is the only new dependency.
- Confirm the cart store is at `src/store/cart.ts` and exports `useCart`, `selectItemCount`, `selectSubtotalCents`, plus the `CartItem` and `CartState` types if referenced externally.
- Confirm the `_cart-count.tsx` helper uses the `useEffect`-set-hydrated pattern (not `skipHydration` zustand option) and renders "Cart" both pre-hydration AND when count is 0.
- Confirm Header stays a server component and only the CartCount fragment is client.
- Confirm AddToCartButton no longer has a `window.alert`; clicking just adds to the store.
- Confirm the design-test page no longer references the removed `cartCount` prop.
- Manually verify the browser flow (Add → badge updates → reload persists → no console warnings). If you can't run a browser, explicitly say "I could not verify in browser; reviewer should confirm."
- Confirm you did not touch any blocklisted paths.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

- **`zustand` is the only new dependency** — `zustand@5.0.13` installed. No other deps changed.
- **Cart store is at `src/store/cart.ts`** — exports `useCart`, `selectItemCount`, `selectSubtotalCents`, `CartItem` type, `CartState` type. Uses zustand's `persist` middleware with `name: "nepali-threads-cart"`, `version: 1`.
- **`_cart-count.tsx` uses the `useEffect`-set-hydrated pattern** — `hydrated` flag defaults to `false`, set to `true` in `useEffect`. Renders "Cart" both pre-hydration AND when count is 0. Does NOT use zustand's `skipHydration` option.
- **Header stays a server component** — no `"use client"`. Only `_cart-count.tsx` is client. The `CartCount` component is rendered inside the cart `<Link>` as children.
- **`cartCount` prop removed from Header** — `HeaderProps` no longer has `cartCount`. The cart Link renders `<CartCount />` instead of the old ternary.
- **AddToCartButton no longer has `window.alert`** — accepts product-data props and calls `useCart((state) => state.addItem)` on click. Selects only the `addItem` action to avoid re-renders.
- **PDP passes product data to AddToCartButton** — `productId`, `productSlug`, `name`, `priceCents`, `imageSrc`, `imageAlt` all passed. Reuses the existing `firstImage` derivation.
- **Design-test page updated** — removed the `<Header cartCount={3} />` demo. Caption updated to remove "with-items state" reference. Single `<Header />` in a plain wrapper.
- **Manual browser verification:** I could not verify the full browser flow (Add → badge updates → reload persists → no console warnings) because I don't have a headless browser available in this environment. The dev server starts successfully and the PDP page renders. The reviewer should confirm in a browser.
- **No blocklisted paths touched.**
- **`npm run check` passes with exit 0.**
