TASK ID: TASK-029
PHASE: Phase 3 — Checkout
GOAL: Add a Stripe webhook endpoint at `/api/webhooks/stripe` that signature-verifies incoming events and creates Orders for `checkout.session.completed` events. This closes the durability gap in TASK-028: today, if a customer pays but closes the browser tab before `/cart/success` server-renders, the Order never gets created in Payload. After this lands, Order creation is bulletproof — Stripe retries failed webhook deliveries automatically until our endpoint returns 200.

CONTEXT:
TASK-028 created the cart → Stripe Checkout → /success → Order persistence flow. It works for the happy path. The flaw: Order creation happens server-side on /cart/success render. Three scenarios where that fails:
1. Customer pays, closes the tab before Stripe redirects back
2. Customer pays, the redirect succeeds but our server-render errors out on the Payload write (DB blip, etc.)
3. Async payment methods (bank transfer, BNPL) — payment status is "pending" at redirect time; the page renders "payment incomplete" but the payment later succeeds

All three are rare in test mode but real failure modes in production. The webhook fixes all of them — Stripe sends `checkout.session.completed` events server-to-server, and Stripe retries with exponential backoff for ~3 days if our endpoint fails to return 200.

The pattern: extract the Order-creation logic from `/cart/success/page.tsx` into a shared helper `src/lib/orders/persist-stripe-order.ts`. Both `/cart/success` and the webhook call it. Idempotency holds (existing-Order check by `stripePaymentIntentId`) — whichever fires first wins; the other no-ops.

FILES TO CREATE OR MODIFY:

**Blocklisted (Claude Code only):**
- `src/app/api/webhooks/stripe/route.ts` — new file. POST endpoint that signature-verifies and dispatches events
- `.localllm-blocklist` — add `src/lib/orders/**` to keep order-persistence logic in Claude Code's lane (touches money-sensitive Order writes)
- `CLAUDE.md` — document the new `src/lib/orders/**` blocklist entry in the Blocklist section

**New shared helper (Claude Code, new blocklist):**
- `src/lib/orders/persist-stripe-order.ts` — pure helper. Takes a fully-expanded Stripe Checkout Session, performs the idempotency check, builds the Order data shape, calls `payload.create({ collection: "orders", ... })`. Returns `{ created: true, orderId }` on creation, `{ created: false, orderId }` on idempotent skip, or `{ created: false, reason: "..." }` on bail (missing data).

**Refactor (Claude Code):**
- `src/app/(frontend)/cart/success/page.tsx` — replace the inline Order-creation block with a call to `persistStripeOrder(session)`. Same behavior; cleaner code.

REQUIREMENTS:

**1. Shared helper (`src/lib/orders/persist-stripe-order.ts`).**

Signature:
```ts
export type PersistStripeOrderResult =
  | { created: true; orderId: number | string }
  | { created: false; orderId: number | string; reason: "already_exists" }
  | { created: false; reason: "missing_payment_intent" | "missing_snapshot" | "missing_address" | "payload_error" };

export async function persistStripeOrder(
  session: Stripe.Checkout.Session
): Promise<PersistStripeOrderResult>;
```

Behavior:
1. Extract `stripePaymentIntentId` from `session.payment_intent` (string or expanded object). If missing → `{ created: false, reason: "missing_payment_intent" }`
2. Check Payload for an existing Order with that `stripePaymentIntentId`. If found → `{ created: false, orderId, reason: "already_exists" }`
3. Parse `session.metadata.productSnapshot` as `ProductSnapshot[]`. If empty/invalid → `{ created: false, reason: "missing_snapshot" }`
4. Map `session.collected_information?.shipping_details` to the Order address shape. If missing → `{ created: false, reason: "missing_address" }`
5. Build the Order create payload:
   - status: "paid" (only call this helper for paid sessions; the caller checks payment_status first)
   - fulfillmentStatus: "unfulfilled"
   - guestEmail: from session.customer_details
   - lineItems: from productSnapshot
   - subtotal/tax/shipping/giftCardDiscount: derived (subtotal from snapshot, others 0)
   - total: session.amount_total ?? subtotal
   - shippingAddress, billingAddress: mapped from session
   - stripePaymentIntentId
6. Call `payload.create`. On success → `{ created: true, orderId }`. On exception → log + `{ created: false, reason: "payload_error" }`

The helper should NEVER throw to the caller — both /cart/success and the webhook need clean handling without try/catch wrappers (webhook needs to always return 200 to Stripe to prevent retry storms, success page needs to render confirmation regardless).

The `ProductSnapshot` type and the address-mapping helper move into this file too (they're not re-used elsewhere).

**2. Update `/cart/success/page.tsx` to use the helper.**

Replace the inline Order-creation block (currently ~80 lines from the `paymentIntentId` check through the try/catch) with:

```ts
const result = await persistStripeOrder(session);
const orderCreated = result.created || (
  result.reason === "already_exists" ? true : false
);
```

Both `created: true` (new order) and `reason: "already_exists"` (idempotent hit) count as "the order exists, render confirmation normally." Other failure reasons render with the subtle "if you don't hear from us..." note (already in the existing page UI).

**3. Webhook endpoint (`src/app/api/webhooks/stripe/route.ts`).**

```ts
import type Stripe from "stripe";
import { NextResponse } from "next/server";

import { persistStripeOrder } from "@/lib/orders/persist-stripe-order";
import { stripe } from "@/lib/stripe/client";

export const dynamic = "force-dynamic";

// Stripe needs the RAW request body for signature verification.
// Next.js's default JSON parsing breaks the signature. Read text() directly.
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 500 }
    );
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Invalid signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Dispatch — only one event type matters today. Add more as needed.
  if (event.type === "checkout.session.completed") {
    const sessionStub = event.data.object as Stripe.Checkout.Session;
    // The webhook payload's session doesn't have line_items expanded.
    // Re-fetch with expansion to get the data persistStripeOrder needs.
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionStub.id, {
        expand: ["line_items", "payment_intent"],
      });
      if (session.payment_status === "paid") {
        const result = await persistStripeOrder(session);
        console.log("[stripe-webhook] checkout.session.completed", {
          sessionId: session.id,
          result,
        });
      } else {
        console.log("[stripe-webhook] session not paid, skipping", {
          sessionId: session.id,
          payment_status: session.payment_status,
        });
      }
    } catch (err) {
      console.error("[stripe-webhook] Error handling completed session", err);
      // Return 500 so Stripe retries — likely transient (DB blip, etc.)
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  } else {
    // Other event types: ack with 200 so Stripe doesn't retry indefinitely.
    // We can add handlers for charge.refunded, etc. in future tasks.
    console.log("[stripe-webhook] unhandled event type", event.type);
  }

  return NextResponse.json({ received: true });
}
```

Key Next.js detail: App Router POST handlers can read raw body via `request.text()` — no need for the `bodyParser: false` config that Pages Router required.

**4. Blocklist + CLAUDE.md update.**

Add `src/lib/orders/**` to `.localllm-blocklist`. Order-persistence logic touches money-sensitive Order writes; keep it in Claude Code's lane.

In CLAUDE.md "Blocklist" section, add the line right after `src/lib/inventory.ts`:
```
- `src/lib/orders/**` — order-persistence + Stripe→Payload mapping
```

OUT OF SCOPE:
- Other event types (`charge.refunded`, `payment_intent.payment_failed`, etc.) — defer to future tasks as needed
- Webhook signing-key rotation
- Replay protection beyond what Stripe's signature provides
- Order confirmation email (TASK-030)
- Inventory decrement at order time (would belong in this webhook eventually, but `src/lib/inventory.ts` is blocklisted for its own reason — separate task)
- Customer-account creation at checkout (later)

ACCEPTANCE:
- `npm run check` exits 0
- The webhook endpoint registers as a dynamic route at `/api/webhooks/stripe`
- `/cart/success` continues to work as before (refactor is behavior-preserving)
- Existing Order is found and skipped on retry (idempotency on `stripePaymentIntentId`)
- `.localllm-blocklist` + CLAUDE.md reflect the new `src/lib/orders/**` entry

Setup Neal needs to do (one-time):
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://nepali-threads-one.vercel.app/api/webhooks/stripe`
3. Events to send: at minimum `checkout.session.completed`
4. After creating, click "Reveal" on the Signing secret → copy the `whsec_...` value
5. Vercel → Settings → Environment Variables → add `STRIPE_WEBHOOK_SECRET` = `whsec_...`
6. Redeploy (Vercel auto-rebuilds on env var change; if not, manually trigger)
7. Test: in Stripe Dashboard → Developers → Webhooks → click the endpoint → "Send test webhook" → pick `checkout.session.completed` → "Send test webhook." Check Vercel logs for the receipt
8. (Optional) Local dev: `brew install stripe/stripe-cli/stripe`, `stripe login`, then `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. The CLI prints a separate webhook secret for local; put it in `.env.local` temporarily for local testing

OUTPUT NOTES (Claude Code — for the record):
- This is the first blocklisted addition since project setup. New entry: `src/lib/orders/**`. Update CLAUDE.md + `.localllm-blocklist` together.
- The webhook is the SECOND consumer of the order-creation logic. Extracted into `src/lib/orders/persist-stripe-order.ts` — two consumers, identical needs, clear extraction trigger.
