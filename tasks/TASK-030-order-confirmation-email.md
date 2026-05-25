TASK ID: TASK-030
PHASE: Phase 3 — Checkout
GOAL: Send an order confirmation email to the customer immediately after a successful Order is persisted in Payload. Uses Resend (the email provider named in CLAUDE.md Tech stack ground rules). Triggered from inside `persistStripeOrder` so both the `/cart/success` path AND the webhook path send exactly one email per order (idempotency holds — the helper only fires the email on actual creation, not on idempotent skips).

CONTEXT:
TASK-028 + TASK-029 land the durable cart → Stripe → Order flow. Today the customer pays, sees the on-page confirmation, but never gets an email. For a real launch they need a receipt with the order ID, what they bought, the total, and where it's shipping.

Why hook the email inside `persistStripeOrder` instead of inside the webhook + /success page separately:
- Single source of truth — same call site means exactly one email per order
- Idempotency of order creation extends to email — the helper already returns `created: true` only on actual creation. We send the email only on that branch, so refresh on /success or duplicate webhook delivery doesn't double-send.

Failure mode: if Resend errors (rate limit, invalid recipient, API down), the order is already created in Payload. The email send is fire-and-forget from the caller's perspective; we log the failure and continue. Admin can manually resend from the Resend dashboard or the Stripe dashboard's receipt email.

Out of scope (queued):
- Shipping notification email (when admin marks order as shipped — separate task that fires on Order update)
- Newsletter signup emails (the NewsletterSignup form just shows success; backend wiring is later)
- Password reset / account emails (customer auth not yet built)
- Plain-text fallback (Resend handles this automatically when only `html` is provided)
- React Email template framework (overkill for one transactional email; revisit at three+ emails)
- Admin notification ("you got an order!") — separate task; could fire from the same hook

FILES TO CREATE OR MODIFY:

**Blocklisted (Claude Code only):**
- `package.json` — add `resend` to dependencies
- `src/lib/email/send-order-confirmation.ts` — new file. Renders the HTML template inline + calls Resend
- `src/lib/orders/persist-stripe-order.ts` — call `sendOrderConfirmation(...)` after a successful order create. Don't await aggressively in a way that blocks the response; we don't need to wait for delivery, only the API enqueue
- `.localllm-blocklist` — add `src/lib/email/**` to the blocklist
- `CLAUDE.md` — document the new `src/lib/email/**` blocklist entry in the Blocklist section

REQUIREMENTS:

**1. Install the Resend SDK.**
```
npm install resend
```
Verify with `npm ls resend`. No other deps should land alongside it.

**2. Email-send module (`src/lib/email/send-order-confirmation.ts`).**

The module exports `sendOrderConfirmation(input)` where `input` is the shape needed to render the email. The shape mirrors what `persistStripeOrder` has in scope right after creation, so the call site is trivial.

```ts
type LineItemInput = {
  name: string;
  quantity: number;
  priceCents: number; // price per unit
};

type ShippingAddressInput = {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type OrderConfirmationInput = {
  orderId: number | string;
  customerEmail: string;
  customerName?: string;
  lineItems: LineItemInput[];
  subtotalCents: number;
  totalCents: number;
  shippingAddress: ShippingAddressInput;
};

export async function sendOrderConfirmation(
  input: OrderConfirmationInput
): Promise<{ sent: boolean; reason?: string }>;
```

Behavior:
- Read `RESEND_API_KEY` and `RESEND_FROM_EMAIL` from env. If either is missing → log + return `{ sent: false, reason: "not_configured" }`. NEVER throw.
- Build the HTML body via `renderOrderConfirmationHtml(input)` (inline-defined in the same file for now; one email doesn't justify its own renderer module).
- Send via `resend.emails.send({ from, to: customerEmail, subject, html })`.
- On Resend API error → log + return `{ sent: false, reason: "resend_error" }`.
- On success → return `{ sent: true }`.

The function NEVER throws to the caller. Email failures must not break order persistence.

**3. HTML template (inline in the same file).**

Inline-styled HTML for email-client compatibility. Brand tone: artisan / warm, never marketing-corporate. No "Whoops, you ordered something!" — match the storefront copy.

Subject: `"Order confirmed — Nepali Threads"`

Sections in order:
- Brand mark ("nepali threads", lowercase serif)
- Eyebrow: "ORDER CONFIRMED" (gold-700)
- Heading: `"Thank you, ${firstName}."` if customerName is set, else `"Thank you."` Use Georgia-stack serif for the heading.
- Body: "Your order has been received. We'll send another email when it ships."
- Order summary box (rounded box, neutral-ink/5 bg, neutral-ink/10 border):
  - "ORDER #${orderId}" eyebrow
  - Line items: one row per item, `${name} × ${quantity}` on the left, `${formattedLineTotal}` on the right (price × quantity, formatted as `$XX.XX`)
  - Divider (1px neutral-ink/10)
  - "Total" row with the grand total
- Shipping address section:
  - Eyebrow "SHIPPING TO"
  - Address block, one line per: recipientName / line1 / line2 (if present) / city, region postalCode / country (if not "US")
- Footer note: "Made by hand in Nepal. Replies to this email go straight to the studio." (sets up customer support via reply)

Inline styles per element (no `<style>` blocks — many email clients strip them). Use HTML tables for layout (Outlook compat). Use web-safe font stacks: Georgia for serif, system-ui sans for body.

Brand colors (from globals.css `@theme`, hardcoded here since CSS doesn't reach email):
- `#FAF7F2` — cream background
- `#2A2420` — ink text
- `#A88A3D` — gold accent
- `#9B2C2C` — brand red (sparingly — accent only)
- `rgba(42, 36, 32, 0.7)` — dim body text
- `rgba(42, 36, 32, 0.1)` — borders

**4. Format the line totals.**

Reuse `formatPriceCents` from `@/lib/format` — same helper the storefront uses. Currency formatting stays consistent across web and email.

**5. Customer first-name extraction.**

If `customerName` is provided, take the first whitespace-delimited token:
```ts
const firstName = customerName?.split(/\s+/)[0]?.trim();
```
Defensive on empty strings and missing values — fallback to "Thank you." with no name.

**6. Wire into `persistStripeOrder`.**

After the successful `payload.create(...)` call but before the function returns `{ created: true, orderId }`, build the `OrderConfirmationInput` from data already in scope and call `sendOrderConfirmation`. Fire-and-forget pattern:

```ts
// Email is fire-and-forget — don't block the order persistence on Resend.
// We do still await so any synchronous errors get caught by the helper's
// try/catch, but Resend's call is fast and any failure has been logged
// inside sendOrderConfirmation.
if (session.customer_details?.email) {
  await sendOrderConfirmation({
    orderId: order.id,
    customerEmail: session.customer_details.email,
    customerName: shippingAddress.recipientName || undefined,
    lineItems: snapshot.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      priceCents: item.priceCents,
    })),
    subtotalCents,
    totalCents,
    shippingAddress,
  });
}
```

Skip the email entirely when there's no customer email (shouldn't happen — Stripe always collects email — but defensive). The helper itself also tolerates missing config and returns clean.

**7. Blocklist + CLAUDE.md update.**

Add `src/lib/email/**` to `.localllm-blocklist` (right after `src/lib/orders/**`). Email content touches PII (customer name, address, email). Keep in Claude Code's lane.

In CLAUDE.md "Blocklist" section, add the line right after `src/lib/orders/**`:
```
- `src/lib/email/**` — transactional email send + templates (PII, customer-facing copy)
```

OUT OF SCOPE:
- Plain-text fallback (Resend generates from HTML automatically)
- Email previews / dev rendering route
- Localization (USD / English only)
- Variant pickup in email templates (no variant UX yet)
- Image-rich emails (no product photos in this template — keep it light + fast)
- Multi-email transactional series (shipping, delivered, etc.)
- Admin notification on order
- Newsletter / marketing
- React Email components
- Any blocklist-adjacent file outside the email module + persistStripeOrder

ACCEPTANCE:
- `npm run check` exits 0
- `npm install` adds only `resend`
- After deploy AND after Neal configures Resend + env vars:
  - Place a real test order with a real email address (your own)
  - The /cart/success page renders the on-page confirmation as before
  - Within seconds, the customer receives an email with the right order ID, line items, total, and shipping address
  - Refresh /cart/success → no duplicate email (idempotency)
  - Use Stripe Dashboard → Send test event → checkout.session.completed → no duplicate email either (idempotency on the webhook path)
- Without Resend env vars set: order creation still succeeds, no email is sent, a clear log line explains why

Setup Neal needs to do (one-time):
1. Sign up for Resend at https://resend.com
2. Either verify a custom domain (nepali-threads.com or similar) under Domains, OR use Resend's onboarding domain for initial testing (`onboarding@resend.dev`)
3. Generate an API key under API Keys
4. Vercel → Settings → Environment Variables:
   - `RESEND_API_KEY` = the key from step 3
   - `RESEND_FROM_EMAIL` = e.g. `orders@nepali-threads.com` once a domain is verified, OR `onboarding@resend.dev` for initial testing
5. Trigger a redeploy

OUTPUT NOTES (Claude Code — for the record):
- This is the second blocklist addition since project setup. `src/lib/email/**` joins `src/lib/orders/**` (added in TASK-029).
- Email is fire-and-forget from the order-persistence perspective. Resend failures are logged, never block.
- We start with inline HTML (one email). Refactor to React Email if/when we hit ~3 email templates.
