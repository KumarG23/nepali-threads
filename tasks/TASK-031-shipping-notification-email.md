TASK ID: TASK-031
PHASE: Phase 3 — Checkout
GOAL: Send a shipping notification email to the customer the moment an admin marks an Order as Shipped + fills in the tracking info. Closes the customer-communication loop (order placed → shipped → delivered) that TASK-030 started. After this lands, dad/sister mark an order Shipped in /admin and the customer gets the tracking email automatically — no manual emailing required.

CONTEXT:
TASK-030 wired up the order-confirmation email at order-creation time. The mirror need is the shipping email at order-shipment time. The trigger isn't a Stripe event this time — it's an admin action in Payload. The natural Payload pattern is an `afterChange` hook on the Orders collection that fires when `fulfillmentStatus` transitions to "shipped."

The schema has the fields we need: `fulfillmentStatus` (enum: unfulfilled / processing / shipped / delivered / cancelled), `trackingNumber` (text), and `carrier` (text). The admin already enters these when marking shipped — we just need to detect the state transition and fire the email.

Idempotency strategy:
- Compare `previousDoc.fulfillmentStatus` to `doc.fulfillmentStatus` inside the hook
- Only fire on the transition where previous was NOT "shipped" AND new IS "shipped"
- If admin later edits the tracking number on an already-shipped order, the hook fires again but the comparison sees previous=shipped → skip (no double-send)
- Edge case (delivered → shipped typo) is rare and acceptable to not handle in v1

Failure mode: same as TASK-030. If Resend errors, log it; don't throw to the hook. The Order update itself must succeed regardless — admin shouldn't see a save fail because email had a hiccup.

Out of scope (queued):
- "Order delivered" email (admin marks delivered → customer gets confirmation)
- Refund-confirmation email (admin processes refund → customer gets receipt)
- Tracking-link generation for non-US carriers
- Admin notification ("you have a new order") — separate task

FILES TO CREATE OR MODIFY:

**Blocklisted (Claude Code only):**
- `src/lib/email/send-shipping-notification.ts` — new file. Email template + Resend send, mirrors the structure of `send-order-confirmation.ts`
- `src/collections/Orders.ts` — add an `afterChange` hook that detects the unshipped→shipped transition and fires the email
- (`src/payload-types.ts` will auto-regenerate via `npx payload generate:types` if Orders schema changes — no migration needed since we're not adding fields, only a hook)

REQUIREMENTS:

**1. The send-shipping-notification module (`src/lib/email/send-shipping-notification.ts`).**

Shape mirrors `send-order-confirmation.ts` for consistency. The function never throws to the caller.

```ts
type ShippingAddressInput = {
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type ShippingNotificationInput = {
  orderId: number | string;
  customerEmail: string;
  customerName?: string;
  trackingNumber: string;
  carrier?: string;
  shippingAddress: ShippingAddressInput;
};

export type SendShippingNotificationResult =
  | { sent: true }
  | { sent: false; reason: "not_configured" | "resend_error" };

export async function sendShippingNotification(
  input: ShippingNotificationInput
): Promise<SendShippingNotificationResult>;
```

**2. Carrier tracking-URL helper (inline in same file).**

```ts
function buildTrackingUrl(carrier: string | undefined, trackingNumber: string): string | null {
  if (!carrier || !trackingNumber) return null;
  const normalized = carrier.trim().toLowerCase();
  if (normalized.includes("usps")) {
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`;
  }
  if (normalized === "ups" || normalized.includes("ups ")) {
    return `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`;
  }
  if (normalized.includes("fedex")) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`;
  }
  if (normalized.includes("dhl")) {
    return `https://www.dhl.com/en/express/tracking.html?AWB=${encodeURIComponent(trackingNumber)}`;
  }
  return null;
}
```

If the carrier is unknown or missing, the email shows the tracking number as text only (no link). Admins set the carrier from a small list in /admin, so this should usually have a match.

**3. Email template (inline HTML in the same file).**

Subject: `"Your order is on its way — Nepali Threads"`

Brand-toned, mirrors `send-order-confirmation.ts` styling exactly:
- Cream background (`#FAF7F2`)
- Inline styles for client compat
- Table-based layout
- Georgia for serif, system-ui for sans
- Same color palette

Sections:
- Brand mark ("nepali threads", lowercase Georgia serif, 24px)
- Eyebrow: "ORDER SHIPPED" in gold-700
- Heading: `"Your order is on its way, ${firstName}."` if customerName is set, else `"Your order is on its way."`
- Body: "We just packed it up. Tracking info below — it should land in 3–7 business days."
- Tracking box (rounded box, neutral-ink/5 bg, neutral-ink/10 border):
  - "ORDER #${orderId}" eyebrow
  - If carrier is set: "${carrier}" label + tracking number
  - If trackingUrl is set: a `<a>` styled as a brand-red link that opens the tracking page
  - If trackingUrl is null (unknown carrier or missing carrier): tracking number rendered as `<strong>` text, no link
- Shipping address section: same shape as the confirmation email
- Footer: "Made by hand in Nepal.<br>Replies to this email go straight to the studio."

Reuse the same `escape()` helper pattern from `send-order-confirmation.ts` for any user-provided string.

**4. Order hook (`src/collections/Orders.ts`).**

Add an `afterChange` hook to the existing `hooks: { ... }` object (or create the hooks block if it doesn't exist — check the file first). The hook:

```ts
hooks: {
  afterChange: [
    async ({ doc, previousDoc, req }) => {
      // Only on the unshipped → shipped transition.
      const wasShipped = previousDoc?.fulfillmentStatus === "shipped";
      const isShipped = doc.fulfillmentStatus === "shipped";
      if (wasShipped || !isShipped) return;

      // Need tracking + a customer email to send anything useful.
      const trackingNumber = (doc.trackingNumber ?? "").trim();
      const customerEmail = doc.guestEmail; // accounts come later; for now guest checkout only
      if (!trackingNumber || !customerEmail) {
        req.payload.logger.warn(
          { orderId: doc.id, hasTracking: !!trackingNumber, hasEmail: !!customerEmail },
          "[shipping-email] Skipped — missing tracking number or customer email"
        );
        return;
      }

      const shippingAddress = doc.shippingAddress;
      if (!shippingAddress?.line1) {
        req.payload.logger.warn(
          { orderId: doc.id },
          "[shipping-email] Skipped — missing shipping address"
        );
        return;
      }

      // Fire-and-forget. The send fn logs its own failures and never throws.
      await sendShippingNotification({
        orderId: doc.id,
        customerEmail,
        customerName: shippingAddress.recipientName || undefined,
        trackingNumber,
        carrier: doc.carrier || undefined,
        shippingAddress: {
          recipientName: shippingAddress.recipientName,
          line1: shippingAddress.line1,
          line2: shippingAddress.line2 || undefined,
          city: shippingAddress.city,
          region: shippingAddress.region,
          postalCode: shippingAddress.postalCode,
          country: shippingAddress.country,
        },
      });
    },
  ],
},
```

Notes:
- Use `req.payload.logger` for logs (Payload's structured logger, shows up in Vercel logs same as console)
- The hook is `async` but it's OK to await — Payload's `afterChange` runs after the save commits, so blocking the response briefly on email send is acceptable. The customer-facing impact is admin sees a slight save delay (~500ms for the Resend round-trip), which is fine.
- IMPORTANT: also keep the existing access block / fields / other hooks if any. Read the file and only add to the hooks block.

**5. The send module never throws.**

Same pattern as `send-order-confirmation.ts` — if Resend errors, log + return `{ sent: false, reason: "..." }`. The hook awaits but doesn't try/catch — if the helper somehow does throw (it shouldn't but defensive), Payload will log and the admin save still completes (the hook runs after the write).

Actually, wait — `afterChange` hooks DO get their errors propagated up by default in Payload. To be safe, wrap the helper call in try/catch inside the hook so the save isn't blocked.

Revised hook end:
```ts
try {
  await sendShippingNotification({ /* ... */ });
} catch (err) {
  req.payload.logger.error({ orderId: doc.id, err }, "[shipping-email] Unexpected throw");
}
```

OUT OF SCOPE:
- Order-delivered email (when fulfillmentStatus → "delivered")
- Refund-confirmation email
- Admin "you got an order" notification
- Tracking-link support for non-US carriers (DHL is included; others are text-only)
- SMS notifications
- Customer-side order-tracking page (the email link goes to the carrier's site)
- Sending shipping emails for orders WITHOUT a customer email (e.g. if guestEmail is null — currently impossible since Stripe requires email, but defensive)

ACCEPTANCE:
- `npm run check` exits 0
- After deploy:
  - Place a test order in test mode (TASK-028 flow)
  - Open the new Order in /admin
  - Change fulfillmentStatus to "Shipped"
  - Fill in `trackingNumber` (e.g. `9400111202555555555555` — sample USPS format) and `carrier` (e.g. `USPS`)
  - Save
  - Customer email (your own, used for the test order) receives the shipping notification within seconds
  - Email body has the correct order ID, tracking number, a clickable USPS tracking link, and the shipping address
  - Open the same Order again, edit the tracking number, save → no second email (previous fulfillmentStatus is already "shipped")
- Without a tracking number filled in: order saves fine but no email sends; log line explains why

OUTPUT NOTES (Claude Code — for the record):
- This is the first Payload collection-hook-driven email. Pattern: `afterChange` on Orders detects state transitions. Future Order emails (delivered, refunded, etc.) layer on the same hook with additional transition checks.
- Both blocklisted edits (`src/collections/Orders.ts` + `src/lib/email/**`) stay in Claude Code's lane.
- Idempotency is implicit in the previous-state comparison — no extra DB field needed. If we later need bulletproof idempotency (e.g. for retried hooks), add a `shippingEmailSentAt` field to the Order schema. Not needed today.
