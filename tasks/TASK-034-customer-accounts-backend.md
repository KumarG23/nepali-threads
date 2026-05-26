TASK ID: TASK-034
PHASE: Phase 3 — Checkout / accounts
GOAL: Wire up the backend half of customer accounts so the storefront UI in TASK-035 has something to consume. Three concrete things: (1) open up customer signup so the storefront can register new accounts, (2) let customers read/update their own Customer record and read their own Orders, (3) link a paid Order to an existing Customer record when one matches the checkout email — so customers see real history when they sign in.

CONTEXT:
Payload's Customers collection already has `auth: true`, which auto-emits:
- `POST /api/customers/login` — sets a cookie, returns the user
- `POST /api/customers/logout` — clears the cookie
- `GET /api/customers/me` — returns the current customer or null
- `POST /api/customers` — creates a new customer (signup), but the current access rules block this for non-admins
- `PATCH /api/customers/:id` — updates a customer (blocked for non-admins today)
- `GET /api/customers/:id` — reads a customer (blocked for non-admins today)

The existing access block is admin-only:
```ts
read: ({ req }) => req.user?.collection === "users",
create: ({ req }) => req.user?.collection === "users",
update: ({ req }) => req.user?.collection === "users",
delete: ({ req }) => req.user?.collection === "users",
```

This task opens it up correctly:
- **create**: anyone (so signup works without being logged in)
- **read / update**: admins, OR a customer reading/updating their OWN record
- **delete**: admins only (still — we don't want random API calls deleting accounts)

Same shape for Orders:
- **read**: admins, OR a customer reading their own orders (filter by `customer === req.user.id`)
- **create / update**: admins only (orders are created server-side via the Stripe checkout flow / webhook; customers never create orders directly via API)
- **delete**: already `() => false`, stays that way

Third concern: TODAY when persistStripeOrder creates an Order, `customer` is left blank (`guestEmail` is filled in instead). That means even if a Customer record exists matching the checkout email, the Order isn't linked to them — so when the customer later signs in, /account/orders shows nothing.

Fix: in persistStripeOrder, after extracting the customer email from the Stripe session, look up a Customer by that email. If one exists, set `customer` on the Order. If not, leave it null (guest order). The customer email goes in `guestEmail` regardless, as a fallback identifier.

Out of scope (queued):
- Password reset flow (`POST /api/customers/forgot-password` — Payload auto-emits, but needs an email template; defer)
- Email verification on signup (defer; we trust the Stripe-collected email)
- Stripe Customer object linking (`stripeCustomerId` field exists on Customer; could create a Stripe Customer at signup or first checkout and store the ID — defer to its own task)
- Account-driven Stripe Checkout (passing customer email + Stripe customer ID to Checkout so cards-on-file work) — defer
- Address book CRUD (the Customers.addresses field exists; UI for editing is a TASK-035 / future concern)

FILES TO CREATE OR MODIFY:

**Blocklisted (Claude Code only):**
- `src/collections/Customers.ts` — relax access for `create` (open signup), `read` (admin or self), `update` (admin or self). Keep `delete` admin-only. Field-level access: hide `stripeCustomerId` from non-admin writes (defensive — admin metadata, not customer-editable).
- `src/collections/Orders.ts` — relax `read` so a logged-in customer can read orders where `customer === req.user.id`. Keep create/update admin-only. Delete stays `() => false`.
- `src/lib/orders/persist-stripe-order.ts` — after we have the Stripe session's customer email, look up the Customer by email. If found, set `customer` on the Order create payload.

REQUIREMENTS:

**1. Customers.ts access changes.**

Replace the existing `access` block:

```ts
access: {
  // Anyone can create a customer (signup is open). Honeypot / rate
  // limit / captcha would go on the storefront sign-up form layer
  // when we have one — for now we trust the form.
  create: () => true,

  // Admins can read all customers. Logged-in customers can read their
  // own record (the /me endpoint and any GET /api/customers/:id where
  // :id === their own id). Other customers are filtered out.
  read: ({ req }) => {
    if (req.user?.collection === "users") return true;
    if (req.user?.collection === "customers") {
      return { id: { equals: req.user.id } };
    }
    return false;
  },

  // Same pattern — admins or self.
  update: ({ req }) => {
    if (req.user?.collection === "users") return true;
    if (req.user?.collection === "customers") {
      return { id: { equals: req.user.id } };
    }
    return false;
  },

  // Delete stays admin-only.
  delete: ({ req }) => req.user?.collection === "users",
},
```

Pattern note: returning a `where` filter from `read` / `update` access means Payload only allows the operation for docs matching the filter. So a customer trying `GET /api/customers/<otherId>` returns 403/empty, but `GET /api/customers/<ownId>` returns their record.

**Field-level access on `stripeCustomerId`:**

The Stripe-customer-id field is set by future server-side flows (when we create a Stripe Customer at signup or first checkout). It shouldn't be editable by customers via PATCH /api/customers/:id. Add field-level access:

```ts
{
  name: "stripeCustomerId",
  type: "text",
  index: true,
  access: {
    update: ({ req }) => req.user?.collection === "users",
  },
  admin: {
    readOnly: true,
    description:
      "Set automatically when the customer first checks out. Don't edit.",
  },
},
```

Reading is fine — customer can see their own Stripe ID. Writing is admin-only.

**2. Orders.ts access changes.**

Update the `read` access rule:

```ts
access: {
  read: ({ req }) => {
    if (req.user?.collection === "users") return true;
    if (req.user?.collection === "customers") {
      // Customer can read orders where the customer relationship
      // points at their own id. Guest orders (customer === null) are
      // NOT visible to the customer even if guestEmail matches — by
      // design, account history requires a linked Customer doc.
      return { customer: { equals: req.user.id } };
    }
    return false;
  },
  create: ({ req }) => req.user?.collection === "users",
  update: ({ req }) => req.user?.collection === "users",
  delete: () => false,
},
```

Note on guest orders: a customer signs in with email `foo@bar.com`. Their account was created today. They placed two orders last week as a guest using the same email. Those guest orders have `customer: null` and `guestEmail: "foo@bar.com"`. By the rule above, the customer doesn't see those guest orders in their history.

We could enhance the read rule to also include guest orders matching guestEmail to the customer's email — but that's a security-sensitive bit (email match isn't auth), and the cleaner UX is: on signup, the server backfills the customer relation on any guest orders that match their email. That's a separate task. For TASK-034, customers see orders explicitly linked to them.

**3. persistStripeOrder — link Order.customer when a matching Customer exists.**

In `src/lib/orders/persist-stripe-order.ts`, after the snapshot/address validation block, look up the Customer by email:

```ts
const customerEmail = session.customer_details?.email;
let linkedCustomerId: number | null = null;
if (customerEmail) {
  const customerResult = await payload.find({
    collection: "customers",
    where: { email: { equals: customerEmail } },
    limit: 1,
    depth: 0,
  });
  if (customerResult.docs.length > 0) {
    linkedCustomerId = customerResult.docs[0].id;
  }
}
```

Then in the `payload.create` Order body, conditionally include the customer field:

```ts
const order = await payload.create({
  collection: "orders",
  data: {
    status: "paid",
    fulfillmentStatus: "unfulfilled",
    customer: linkedCustomerId ?? undefined,
    guestEmail: customerEmail,  // always set as fallback identifier
    lineItems: snapshot.map(...),
    // ... rest unchanged
  },
});
```

The order has BOTH `customer` (when found) AND `guestEmail` (always). When `customer` is null, the order is a guest order. Admin /admin/orders view shows either the linked customer or the guest email (the Customers.ts admin column config already handles this).

Confirmation/shipping emails still go to `session.customer_details.email` — they don't care whether a Customer record exists.

**4. Don't touch.**

- Payload's auto-generated endpoints (no changes needed)
- The Orders hook for shipping emails (TASK-031) — its logic is fine
- Any storefront UI (that's TASK-035)

ACCEPTANCE:
- `npm run check` exits 0
- Existing admin functionality preserved: admins still see all customers + all orders in /admin
- After deploy, with the customer-accounts UI from TASK-035 not yet shipped, the new access rules can be tested via curl:
  - `POST /api/customers` with `{ email, password, name }` body → returns the new customer (signup works without auth)
  - `POST /api/customers/login` with email + password → sets a cookie, returns the user
  - With the cookie: `GET /api/customers/me` → returns the customer record
  - With the cookie: `GET /api/orders` → returns only orders linked to that customer (empty unless they have linked orders)
- Place a new test Stripe order using an email that matches an existing Customer record. After the webhook fires:
  - `/admin/orders` shows the Order with the Customer relationship populated (not just guestEmail)
  - With the customer logged in via curl + cookie: `GET /api/orders` returns the new order
- Without a matching Customer record (guest checkout): order created with `customer: null`, `guestEmail: <email>`. Visible to admin only.

OUTPUT NOTES (Claude Code — for the record):
- Three blocklisted files changed: `src/collections/Customers.ts`, `src/collections/Orders.ts`, `src/lib/orders/persist-stripe-order.ts`. No new files, no migrations (only access rules + an extra fetch — no schema fields added).
- Defensive choice: stripeCustomerId field-level access is admin-only for writes. Customer can read their own Stripe id (useful for client-side display) but not change it.
- Guest-order-claim flow (when an existing guest's email later signs up) is intentionally deferred. It's a separate task because it touches the signup hook and has its own correctness story.
