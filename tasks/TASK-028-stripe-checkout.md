TASK ID: TASK-028
PHASE: Phase 3 — Checkout
GOAL: Wire the cart Checkout button to a real Stripe Checkout Session. Customer clicks Checkout, lands on Stripe's hosted checkout (Stripe collects card + shipping address), completes payment, and is redirected to a `/cart/success` page that creates a paid Order in Payload, clears the cart, and shows a confirmation. After this lands, the site can actually take orders.

CONTEXT:
The cart store + cart page work, but the Checkout button has been a `window.alert` placeholder since TASK-024. The Orders collection schema is already in place (TASK-001-era scaffold), Stripe API keys are already in `.env.local`, and `Orders.stripePaymentIntentId` is indexed for fast idempotency lookups. This task is the first storefront → Payload WRITE (everything before this was either localStorage state or Payload READs).

Scope: minimum-viable buy flow, end to end, with Order persistence.

**Three things explicitly deferred to follow-up tasks** (not in this one):
- **Stripe webhook handler** for bulletproof order recovery (TASK-029). Without webhooks, if a customer pays but closes the tab before `/cart/success` loads, the Order is never created in Payload. That's a real gap to close — but rare enough in test usage that we ship without it now and fix in TASK-029.
- **Order confirmation email** (Resend integration). Currently the customer's only confirmation is the `/cart/success` page. Email is a fast-follow.
- **Inventory checks at checkout time.** `src/lib/inventory.ts` is blocklisted for good reason — checkout-time inventory validation belongs in the webhook (server-authoritative). Today's flow trusts cart contents.

Files this task creates / modifies:

**Blocklisted (Claude Code only):**
- `package.json` — add `stripe` to dependencies
- `src/lib/stripe/client.ts` — new file. Initialized Stripe SDK instance with secret key from env
- `src/app/api/checkout/route.ts` — new file. POST endpoint that takes cart items + creates a Stripe Checkout Session

**Not blocklisted but touches Order data:**
- `src/app/(frontend)/cart/success/page.tsx` — new server component. Retrieves the Stripe session, verifies payment, creates an Order in Payload (idempotent), renders the confirmation page
- `src/app/(frontend)/cart/success/_clear-cart.tsx` — new client component. Clears the cart store on mount via useEffect

**Not blocklisted:**
- `src/app/(frontend)/cart/_cart-content.tsx` — Checkout button posts to `/api/checkout`, parses the `{url}` response, redirects to the Stripe URL via `window.location.href`. Drops the `window.alert` placeholder.

REQUIREMENTS:

**1. Install the Stripe SDK.**
```
npm install stripe
```
Verify: `npm ls stripe` reports `stripe@<latest>`. No other deps should change. Commit the lockfile update with the rest of the work.

**2. Stripe client (`src/lib/stripe/client.ts`).**
```ts
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error(
    "STRIPE_SECRET_KEY is not set. Add it to .env.local and Vercel env."
  );
}

export const stripe = new Stripe(secretKey);
```
Don't pin `apiVersion` — let the SDK use the account's current version (set in Stripe Dashboard). Cleaner than guessing a date and getting it wrong.

**3. Checkout API route (`src/app/api/checkout/route.ts`).**

POST endpoint. Body shape:
```ts
type CheckoutBody = {
  items: Array<{
    productId: number;
    productSlug: string;
    name: string;
    priceCents: number;
    imageSrc: string;
    imageAlt: string;
    quantity: number;
  }>;
};
```

Behavior:
- Parse body; reject 400 on invalid JSON or empty items
- Map cart items to `line_items` for Stripe Checkout Session
- `mode: "payment"` (one-time payment, not subscription)
- `payment_method_types: ["card"]` for now
- `shipping_address_collection.allowed_countries: ["US"]` (Stripe collects shipping address on its hosted page)
- `metadata.productSnapshot`: JSON.stringify of an array of `{ productId, quantity, priceCents }` — preserves which products this session covers, so the success page can reconstruct Order line items even though Stripe's `line_items` don't contain our productIds
- `success_url`: `${origin}/cart/success?session_id={CHECKOUT_SESSION_ID}` (Stripe substitutes the session ID at redirect time)
- `cancel_url`: `${origin}/cart`
- Image URLs in `product_data.images` need to be absolute. Prepend `origin` to the relative `/api/media/file/...` paths
- Return `{ url: session.url }` on success
- Return `{ error: "..." }` with 500 on any Stripe error; log the error server-side

`export const dynamic = "force-dynamic";` at the top so Next doesn't try to cache this route.

**4. Cart checkout wiring (`src/app/(frontend)/cart/_cart-content.tsx`).**

Replace the existing Checkout button onClick handler. The button should:
- Show a loading state while the API call is in flight (disable + briefly different label)
- Show an error message inline if the API returns non-200 (don't lose the user's cart)
- Redirect to the returned Stripe URL on success via `window.location.href = url`

Implementation:
```ts
const [checkoutLoading, setCheckoutLoading] = useState(false);
const [checkoutError, setCheckoutError] = useState<string | null>(null);

async function handleCheckout() {
  setCheckoutLoading(true);
  setCheckoutError(null);
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? "Checkout failed");
    }
    const { url } = await response.json();
    window.location.href = url;
  } catch (err) {
    setCheckoutError(
      err instanceof Error ? err.message : "Checkout failed. Please try again."
    );
    setCheckoutLoading(false);
  }
}
```

Update the Checkout button to call `handleCheckout`, set `disabled={checkoutLoading}`, and render the error below the button when `checkoutError` is set.

**5. Success page (`src/app/(frontend)/cart/success/page.tsx`).**

Server component. Reads `session_id` from search params (Next 15 Promise pattern). Fetches the session from Stripe, verifies `payment_status === "paid"`. Creates an Order in Payload if not already present (idempotent on `stripePaymentIntentId`).

Logic:
1. Read `session_id` from `searchParams` Promise
2. If missing → notFound()
3. `stripe.checkout.sessions.retrieve(session_id, { expand: ["line_items", "payment_intent"] })`. If Stripe throws → notFound()
4. If `session.payment_status !== "paid"` → render a "payment incomplete" message instead of the success view
5. Derive `stripePaymentIntentId` from the session (it's a relationship — could be a string ID or an expanded object; handle both)
6. Check for existing Order with this PaymentIntent ID. If found → skip create (idempotency)
7. If not found → create Order with:
   - `status: "paid"`
   - `guestEmail: session.customer_details?.email ?? undefined`
   - `lineItems`: rebuild from `metadata.productSnapshot` JSON. Each item needs `product` (relationship by productId), `nameSnapshot`, `quantity`, `priceAtPurchase`
   - `subtotal`: sum of (priceCents × quantity) from snapshot
   - `tax`: 0 (Stripe didn't collect tax — defer)
   - `shipping`: 0 (Stripe didn't collect shipping — defer)
   - `giftCardDiscount`: 0
   - `total`: `session.amount_total ?? subtotal`
   - `shippingAddress`: from `session.shipping_details.address` + `session.shipping_details.name`, mapped to the Order schema's `recipientName`/`line1`/etc shape
   - `billingAddress`: same as shipping (Stripe doesn't separately collect billing in this flow)
   - `stripePaymentIntentId`: derived above
8. Render the confirmation page

Confirmation page UI (when payment succeeded):
- `<ClearCart />` (client component that clears the cart store on mount)
- Gold "Order confirmed" eyebrow
- Serif heading with the order ID or "Thank you, [name]"
- Body copy: "We'll send a confirmation email shortly. [Note: emails are TASK-030 — for now copy reads 'Your order has been received and we'll be in touch.']"
- A grid summary: count of items, total amount
- Two CTAs: "Continue shopping" → `/shop`, plus a small "back to home" link

Confirmation page UI (when payment incomplete):
- Heading "Payment didn't complete"
- Body: "Something went wrong with the payment. Your cart is still here — head back and try again."
- CTA: "Back to cart" → `/cart`

**6. Clear-cart helper (`src/app/(frontend)/cart/success/_clear-cart.tsx`).**

Tiny client component. `"use client";`. Uses `useEffect` to call `useCart.getState().clear()` once on mount. Renders nothing visible.

```tsx
"use client";

import { useEffect } from "react";

import { useCart } from "@/store/cart";

export function ClearCart() {
  useEffect(() => {
    useCart.getState().clear();
  }, []);
  return null;
}
```

Using `useCart.getState().clear()` (the imperative API) instead of subscribing avoids unnecessary re-renders. The cart is cleared exactly once when the success page mounts.

**7. Order line item reconstruction.**

The `metadata.productSnapshot` is the source of truth on the success page (Stripe's `line_items` only have product names + prices, not our productIds). Parse it:
```ts
const snapshot = JSON.parse(session.metadata?.productSnapshot ?? "[]") as Array<{
  productId: number;
  quantity: number;
  priceCents: number;
}>;
```
For each snapshot entry, fetch the product name from Payload (via `payload.findByID`) to populate `nameSnapshot`. Or simpler: rely on the line item's name in Stripe's expanded `line_items.data[i].description` (Stripe stores the product_data.name we passed). Match by order — snapshot index === line_item index.

Cleanest: include `nameSnapshot` directly in the productSnapshot metadata payload at session creation time. Then the success page doesn't need a Payload roundtrip to get names. Update step 3 (checkout API) to include `name` in each snapshot entry.

Revised snapshot shape:
```ts
metadata: {
  productSnapshot: JSON.stringify(items.map(i => ({
    productId: i.productId,
    name: i.name,
    quantity: i.quantity,
    priceCents: i.priceCents,
  }))),
}
```

(Note: Stripe metadata has a 500-character limit per field. With a typical 3-item cart and short product names, this fits comfortably. If we ever hit it, switch to a smaller schema or use a different storage strategy.)

OUT OF SCOPE:
- Webhook handler (TASK-029)
- Order confirmation email (TASK-030)
- Inventory checks (depends on webhook)
- Customer accounts / sign-in at checkout (Phase 3 follow-up)
- Variants in cart / checkout (no variant UX yet)
- Tax (Stripe Tax integration is a separate setup)
- Shipping rate calculation (could be added later via Stripe Shipping Rates)
- Currency switching (USD only)
- Discount codes / promo codes
- Saved payment methods
- Apple Pay / Google Pay direct integration (Stripe Checkout handles these automatically when the card form is shown)

ACCEPTANCE:
- `npm run check` exits 0
- `npm install` succeeds with `stripe` added
- After deploy:
  - Cart with items → click Checkout → redirects to Stripe Checkout (the real Stripe-hosted page)
  - Use Stripe test card `4242 4242 4242 4242` with any future expiry / any CVC / any zip → payment succeeds
  - Redirects to `/cart/success?session_id=cs_test_...`
  - Success page shows "Order confirmed", brief loading-then-cleared cart
  - Open `/admin/orders` → a new Order exists with status: paid, line items snapshotted, shipping address populated, stripePaymentIntentId set
  - Open `/cart` after success → empty state (cart was cleared on success page mount)
- Refreshing `/cart/success?session_id=...` does NOT create a duplicate Order (idempotency holds)
- Visiting `/cart/success` with no session_id → 404
- Cancelling on Stripe's hosted page → returns to `/cart` with items intact

Setup Neal needs to do BEFORE this works end-to-end (one-time):
1. Confirm `STRIPE_SECRET_KEY` is set in Vercel's environment variables (it's already in local `.env.local`). Production deploy needs it too.
2. In Stripe Dashboard → Developers → Webhooks: NOT NEEDED YET (TASK-029 will set up the webhook).
3. Make sure at least one test card is allowed in Stripe Dashboard → Settings → Payments. Test cards are enabled by default in test mode.

OUTPUT NOTES (Claude Code — for the record):
- This is the first storefront-side Payload WRITE (Order creation). All prior tasks were either reads or localStorage. Per CLAUDE.md "stricter scrutiny for first-of-kind data-backed patterns" — review carefully for idempotency, error handling, address-mapping correctness.
- Order persistence happens on the success page server render, NOT in a webhook. This is fragile (closed-tab payments don't create Orders) but ships fast. The webhook in TASK-029 is the production-correct version.
