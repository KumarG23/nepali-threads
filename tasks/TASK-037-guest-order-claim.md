TASK ID: TASK-037
PHASE: Phase 3 — Checkout / accounts
GOAL: When a new Customer is created, look for any past guest orders matching their email and link them to the new Customer record. After this lands, a buyer who placed orders as a guest and later signs up sees their full history in /account/orders — not just orders placed after signup.

CONTEXT:
TASK-034 / 035 / 036 built the customer-accounts loop, but TASK-034 explicitly deferred this piece. Today:
- A customer places an order as a guest with email `foo@bar.com` → Order created with `customer: null`, `guestEmail: "foo@bar.com"`.
- Same customer later signs up at /signup with `foo@bar.com` → new Customer record. The Order still has `customer: null` — it doesn't appear in /account/orders for the new Customer.

This task closes that gap. Pattern: a Payload `afterChange` hook on Customers fires when a Customer doc is created (not on every update — only on create). The hook queries Orders for unlinked guest orders matching the new customer's email, updates each to set `customer: newCustomer.id`. After this, /account/orders includes the backfilled orders.

Security / privacy story:
- The hook uses **email match** to find guest orders. Email isn't auth — anyone who knows another person's email could in theory create an account at that address and claim their orders. But this is the same level of protection guest-checkout has implicitly already: Stripe collects whatever email the buyer types, and confirmation emails go to that address. If someone can sign up with `foo@bar.com`, they could also have placed the original guest order with that email. The actual integrity boundary is the Stripe payment + the email inbox — both work the same whether you're a guest or a signed-up customer.
- That said: the hook only fires on Customer CREATE, not on email updates. A bad actor can't sign up with email A, then change their email to B to absorb someone else's orders. The Customer.update access only lets a logged-in customer update their own record, and the hook gates on create.

Out of scope (queued):
- Email verification on signup (would make the email-match assumption stronger; defer)
- Surface the backfill count to the customer ("We found 3 past orders and linked them to your account") — could be a nice UX touch via a query param flag on the post-signup redirect; defer
- Backfilling from soft-deleted / archived orders (Orders are never deleted today; non-issue)
- Per-line-item product/variant validation
- Anything that touches blocklisted Stripe / inventory paths

FILES TO CREATE OR MODIFY:

**Blocklisted (Claude Code only):**
- `src/collections/Customers.ts` — add a `hooks: { afterChange: [...] }` block with the backfill hook.

That's it. One file, one hook. No new helpers in `src/lib/orders/` because the logic is small enough to live inline in the hook, and extracting would add an import chain across blocklisted files.

REQUIREMENTS:

**1. The hook shape.**

`afterChange` fires after every Customer save (create OR update). We gate on `operation === "create"` so it only runs on signup:

```ts
hooks: {
  afterChange: [
    async ({ doc, operation, req }) => {
      // Only on signup. Customer updates (name change, address tweak)
      // shouldn't re-trigger the claim.
      if (operation !== "create") return;

      const email = doc.email;
      if (!email) return;

      // Find guest orders matching this email (customer is null AND
      // guestEmail equals the new customer's email).
      const result = await req.payload.find({
        collection: "orders",
        where: {
          and: [
            { customer: { equals: null } },
            { guestEmail: { equals: email } },
          ],
        },
        limit: 100,
        depth: 0,
      });

      if (result.docs.length === 0) {
        return;
      }

      const newCustomerId = doc.id;
      if (typeof newCustomerId !== "number") {
        req.payload.logger.warn(
          { customerId: doc.id },
          "[guest-order-claim] Skipping: customer id is not a number (unexpected on Postgres)"
        );
        return;
      }

      // Update each matching order to link it to the new customer.
      // Sequential — order count is small (a single customer's history)
      // and Payload's update is fast enough that parallelism isn't worth
      // the complexity.
      let claimed = 0;
      for (const order of result.docs) {
        try {
          await req.payload.update({
            collection: "orders",
            id: order.id,
            data: { customer: newCustomerId },
            // Bypass the Orders.update access rule (admin-only) — this
            // server-side hook is the system, not the customer. Without
            // overrideAccess Payload would 403 here.
            overrideAccess: true,
          });
          claimed += 1;
        } catch (err) {
          req.payload.logger.error(
            { orderId: order.id, customerId: newCustomerId, err },
            "[guest-order-claim] Failed to claim guest order"
          );
        }
      }

      req.payload.logger.info(
        { customerId: newCustomerId, email, claimed },
        "[guest-order-claim] Backfilled guest orders on signup"
      );
    },
  ],
},
```

Key bits:
- **`operation !== "create"` early return** ensures this only fires on signup, not on subsequent profile updates.
- **`overrideAccess: true`** on the `payload.update` call. Orders.update access is admin-only (TASK-034 kept it that way — customers shouldn't directly mutate orders). The hook is system code, not a customer call, so overriding access is correct. Without this, the update would 403 and silently leave orders unlinked.
- **Per-order try/catch** so one bad order doesn't break the whole claim. Each failure logs; the hook keeps going.
- **`depth: 0` on the find** — we only need the order ids, no need to populate relationships.
- **`limit: 100`** — a single customer is extremely unlikely to have more than 100 past guest orders. If they do, the extras get missed on signup; could re-trigger via a future "claim my orders" button. Defer.
- **Type guard on `doc.id`** — Payload's generated types use `number | string` for ids generically; Postgres always returns `number`. Defensive narrowing.

**2. Where to place the hook in Customers.ts.**

Add a `hooks: {...}` block between `access` and `fields`. Match the structure of Orders.ts's hooks block (TASK-031 pattern). Import nothing new — `payload.find` and `payload.update` are on `req.payload` so we use that.

**3. The Customer record itself.**

No schema change. The hook only writes to Orders. Customers.ts gets ~50 new lines (the hook + comments).

OUT OF SCOPE:
- Reverse direction (when a customer email changes to match guest orders) — defer, also adds an email-update vector worth a separate threat model
- Notifying the customer via UI that orders were claimed
- Notifying admin / dad / sister when a claim happens
- Backfilling Stripe Customer ID at the same time (could create a Stripe Customer at signup; separate task)
- Any UI changes — /account/orders already filters by `customer === req.user.id`, so claimed orders just appear after signup-and-reload

ACCEPTANCE:
- `npm run check` exits 0
- Build behavior: the hook fires on Customer create, doesn't fire on Customer update (verify by editing a customer in /admin → no log line about backfill)
- End-to-end test:
  1. Place a Stripe test order as a guest with email `test-claim@example.com` (use a real email you can sign in with later)
  2. Check `/admin/orders` → order has `customer: <empty>`, `guestEmail: test-claim@example.com`
  3. Sign up at /signup with the SAME email + a password
  4. Sign in
  5. Visit `/account/orders` → the previously-guest order appears in the list
  6. Open the order detail → renders normally
- A signup with an email that doesn't match any guest orders → hook fires, finds zero, exits cleanly. No errors.
- Editing an existing customer's profile (name change) → no backfill log line; hook gates on operation === "create".

OUTPUT NOTES (Claude Code — for the record):
- Single blocklisted file changed: `src/collections/Customers.ts`.
- `overrideAccess: true` is the canonical Payload pattern for system-side writes that need to bypass the per-request access rules. Used here because Orders.update is admin-only by design (customers shouldn't mutate orders directly) but the hook is server-side system code.
- Email-match is the same trust boundary guest-checkout already implicitly uses (Stripe collects email, confirmation goes to that inbox). Not a new security concern compared to the existing guest flow.
