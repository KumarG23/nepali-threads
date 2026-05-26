TASK ID: TASK-035
PHASE: Phase 3 — Checkout / accounts
GOAL: Customer-facing UI for the accounts system landed in TASK-034. Sign-up, sign-in, account overview, order history, and Header integration. After this lands, the buy flow has a real account loop: customers can create an account, sign in, and see their orders alongside the existing guest checkout that already works.

CONTEXT:
TASK-034 opened up Payload's customer-auth endpoints for storefront use. The backend pieces:
- `POST /api/customers` — open signup (no auth required)
- `POST /api/customers/login` — sign in, sets an httpOnly cookie
- `POST /api/customers/logout` — sign out, clears the cookie
- `GET /api/customers/me` — returns the current customer or null
- `PATCH /api/customers/:id` — update own record (admin or self)
- `GET /api/orders` — returns orders narrowed to the current customer when authenticated as a customer
- When an Order is persisted via Stripe checkout, persistStripeOrder now links it to an existing Customer record by email match, so signed-in customers see their orders.

This task builds the UI layer on top:
- `/signin` page — email + password form
- `/signup` page — email + password + optional name
- `/account` page — show signed-in customer's info + sign-out button
- `/account/orders` page — list of orders linked to the current customer
- Header link — "Sign in" when signed out, "Account" when signed in (with the dropdown / link to /account)

Use Payload's auto-generated endpoints — no new API routes needed. Submit forms via fetch with `credentials: "include"` so cookies set on the auth response propagate.

Out of scope (queued):
- Password reset flow (Payload auto-emits `forgot-password` and `reset-password` but needs email templates; defer)
- Email verification on signup (skip; we trust the email)
- Address book CRUD UI (the field exists on Customer; UI for editing is a separate polish task)
- Account-driven Stripe Checkout (pass customer email + stripe customer id automatically) — separate task
- Order detail page (`/account/orders/<id>`) — current task lists orders; clicking-through to a detail view is a follow-up
- Guest-order claim on signup (backfill orders by email match) — separate task with its own correctness story
- "Remember me" / extended sessions
- OAuth / social login

FILES TO CREATE OR MODIFY:

**New:**
- `src/app/(frontend)/signin/page.tsx` — server component metadata wrapper
- `src/app/(frontend)/signin/_signin-form.tsx` — `"use client"` form
- `src/app/(frontend)/signup/page.tsx` — server wrapper
- `src/app/(frontend)/signup/_signup-form.tsx` — client form
- `src/app/(frontend)/account/page.tsx` — server component, fetches /me, shows info, has sign-out button
- `src/app/(frontend)/account/_account-content.tsx` — client component, includes sign-out handler (needs `useRouter` for refresh)
- `src/app/(frontend)/account/orders/page.tsx` — server component fetching the customer's orders, renders the list
- `src/components/storefront/_account-link.tsx` — client component that reads /me and renders "Sign in" or "Account" in the Header

**Modify:**
- `src/components/storefront/Header.tsx` — add the `<AccountLink />` next to the cart link (desktop). Mobile drawer also needs the account link.
- `src/components/storefront/_mobile-nav.tsx` — add the same account link in the drawer.

REQUIREMENTS:

**1. The auth helper pattern.**

All auth-modifying form submissions hit Payload's endpoints with `credentials: "include"` so cookies set. Standard shape:

```ts
const response = await fetch("/api/customers/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  credentials: "include",
  body: JSON.stringify({ email, password }),
});
```

After a successful login/signup/logout, call `router.refresh()` (from `next/navigation`) so server components re-fetch with the new auth state. Don't rely on full-page reloads — the layout's `<AccountLink />` should update immediately.

**2. Sign-in page (`src/app/(frontend)/signin/page.tsx` + `_signin-form.tsx`).**

Server wrapper exports metadata + renders the client form.

```tsx
// page.tsx
import type { Metadata } from "next";
import { SignInForm } from "./_signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your account.",
};

export default function SignInPage() {
  return <SignInForm />;
}
```

Client form (`_signin-form.tsx`):
- `"use client";`
- React state: `email`, `password`, `loading`, `error`
- Form submits via fetch to `POST /api/customers/login`
- On success → `router.refresh()` then `router.push("/account")`
- On error → set `error` to a friendly message ("Email or password didn't match." NOT "Authentication failed: 401")
- Use the `Input` and `Button` primitives — no custom form markup
- Layout: centered article max-w-md, gold "WELCOME BACK" eyebrow, serif "Sign in" heading, body "Use your account email and password.", form with Email Input + Password Input + primary Button, link below: "New here? Create an account →" pointing at `/signup`

**3. Sign-up page (same structure).**

Client form fields: name (optional), email (required), password (required, min 8 chars). Submit to `POST /api/customers` with body `{ email, password, name }`.

On success: Payload returns the new customer + an auth token in a cookie. Call `router.refresh()` then `router.push("/account")`.

On error: catch HTTP 400 / 409 (email already exists). Friendly messages:
- "That email is already in use — try signing in." (409 or similar)
- "Please enter a valid email." (400 on email validation)
- "Password needs at least 8 characters." (400 on password validation)
- Fallback: "Couldn't create your account. Please try again."

Brand tone: "Create an account" heading, "Stay in the loop on new collections and track your orders." body, form with Name + Email + Password Inputs + primary Button, link below: "Already have an account? Sign in →" pointing at `/signin`.

**4. Account page (`/account/page.tsx`).**

Server component. Fetches `/api/customers/me` via the Payload server-side API. If the user is not signed in (null response), redirect to `/signin` via `redirect()` from `next/navigation`.

The server-fetch shape:
```ts
import { getPayload } from "payload";
import { headers as nextHeaders } from "next/headers";
import config from "@payload-config";

const payload = await getPayload({ config });
const headers = await nextHeaders();
const { user } = await payload.auth({ headers });
// user is the Customer doc or null
if (!user || user.collection !== "customers") {
  redirect("/signin");
}
```

Notes:
- `payload.auth({ headers })` reads the cookie from the incoming request and resolves the user. This is the canonical Payload server-side pattern.
- `user.collection` discriminates between admin Users and Customers. We want customers here.

Once we have the customer, render:
- Eyebrow "ACCOUNT" in gold
- Heading `Hello, ${customer.name ?? customer.email}.`
- Body: a couple of summary lines (email, member-since date)
- Link block: "View your orders →" pointing at `/account/orders`
- The sign-out button lives in a separate client component (`_account-content.tsx` or similar) — server can't manage the click handler.

Sign-out client component:
- Single button "Sign out"
- onClick: `fetch("/api/customers/logout", { method: "POST", credentials: "include" })`, then `router.refresh()` and `router.push("/")`

**5. Order history (`/account/orders/page.tsx`).**

Server component. Auth check via `payload.auth({ headers })`; redirect to `/signin` if not logged in.

Fetch orders narrowed to the customer:
```ts
const result = await payload.find({
  collection: "orders",
  where: { customer: { equals: user.id } },
  sort: "-createdAt",
  limit: 100,
  user, // pass the user so access rules work correctly
});
```

(Note: when you call payload.find server-side without a `user`, the access rules might not narrow the result set the way you expect — pass user explicitly.)

Render:
- Eyebrow "ORDER HISTORY"
- Heading "Your orders."
- Body: "All your past orders, newest first."
- If `result.docs.length === 0`: empty-state copy "You haven't placed an order yet. Head to the shop to find something."
- Otherwise: vertical list of orders. Each item is a card showing:
  - Order ID + date (formatted as "May 26, 2026")
  - Status badge (use the existing Badge primitive — paid → accent, refunded → muted, etc. — but make sure the badge variant pick is sensible; flag the mapping)
  - Fulfillment status (separate line, plain text "Shipped — tracking: 9400…" or "Unfulfilled" or "Processing")
  - Line items summarized: "3 pieces · $145.00"

Don't bother rendering full line item details on this list page — defer to a future order-detail page. The summary is enough.

**6. Header account link (`_account-link.tsx`).**

`"use client";` component that fetches `/api/customers/me` on mount and renders one of:
- Loading (transient, render empty span)
- Signed in → `<Link href="/account">Account</Link>` styled like the Cart link
- Signed out → `<Link href="/signin">Sign in</Link>` styled like the nav links

Same hydration-safe pattern as `_cart-count.tsx` — `useEffect` flips a `hydrated` flag, render "Sign in" pre-hydration as the default (most users are not logged in). After mount, fetch /me. If response includes a user → render "Account."

Don't subscribe to anything client-side beyond the initial fetch. If the user signs in/out via the forms, those forms call `router.refresh()` which re-runs server components, but the AccountLink is client. To make the link update without a manual refresh: maybe expose a state via context, or just have the forms also do a window.location.href on success. For now: just do `router.refresh()`; the AccountLink will refetch on next mount (page navigation) OR can be hooked to refresh on Next router events. **Easiest acceptable v1: AccountLink fetches /me once on mount, and the sign-in/sign-out flows navigate (`router.push`) which remounts the AccountLink. Flag in output notes if you find a cleaner pattern.**

**7. Header integration.**

In `Header.tsx`, add `<AccountLink />` next to the cart Link in the desktop layout. The display order from left to right at md+: brand mark | nav | account | cart.

Mobile drawer (`_mobile-nav.tsx`): same account link inside the drawer, between the nav links and the Cart link. Drawer copy: "Account" when signed in (links to /account), "Sign in" when signed out (links to /signin). Use a tiny inline version of the same /me fetch — or extract the auth-state read into a shared client hook in `_account-link.tsx` and reuse.

**8. Styling.**

All new components use the existing primitives. No new visual primitives.

- Forms: Input primitive (`label`, `hint`, `error`) + Button primary md/lg
- Layout: same `mx-auto max-w-md/max-w-2xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24` container shape used by /404, /cart empty state, etc.
- Account / order list: use Card primitive for each order summary
- Order status: use Badge primitive

**9. Things to NOT touch.**

- Payload config (blocklisted) — no new collections, no schema changes
- The admin Users collection — unchanged
- Stripe / checkout flow — unchanged (sign-in doesn't gate checkout; guest checkout still works)
- Cart store / cart page (`/cart`) — unchanged; cart state is localStorage-only regardless of auth

ACCEPTANCE:
- `npm run check` exits 0
- After deploy:
  - Visit `/signup` → form renders, submit creates a new customer. Redirects to `/account`.
  - On `/account`, see the customer name + email + "View your orders" link + Sign out button.
  - Click Sign out → back to a signed-out state, Header shows "Sign in".
  - Visit `/signin` → form renders, submit with the previously-created credentials → lands on `/account`.
  - From `/account`, click "View your orders" → `/account/orders` renders. With no orders → empty state.
  - Place a Stripe test order using the same email as the account → after webhook, `/account/orders` shows the new order with date + total + status.
  - Try `/account` while signed out → redirect to `/signin`. Same for `/account/orders`.
- Header on desktop shows "Account" or "Sign in" appropriately, no hydration-mismatch warnings in console.
- Mobile drawer shows the same.
- No new entries in `package.json` `dependencies` or `devDependencies`

OUTPUT NOTES FOR REVIEWER:
- Confirm sign-in / sign-up / sign-out flows work end-to-end via real cookie session (not just /me returning the user — the COOKIE has to set).
- Confirm `/account` and `/account/orders` redirect to `/signin` when not authenticated.
- Confirm Header AccountLink renders "Sign in" pre-hydration and BEFORE the /me fetch completes (no flash of "Account" then back to "Sign in").
- State your strategy for keeping the Header AccountLink in sync after sign-in/out (router.refresh fall-through, full reload, context, etc.). Flag if you found a cleaner approach.
- State your Badge mapping for Order.status (paid → ?, refunded → ?, etc.).
- Confirm you used the existing primitives (Input, Button, Card, Badge) — no new visual primitives.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

1. **Sign-in / sign-up / sign-out flows:** All three forms submit to Payload's auto-generated endpoints with `credentials: "include"`. On success they dispatch a custom `nt:auth` window event, call `router.refresh()`, then `router.push()` to the destination page. The cookie is set by Payload's login/signup responses (httpOnly, same-site). Logout hits `POST /api/customers/logout` which clears the server-side session.

2. **`/account` and `/account/orders` redirect to `/signin` when not authenticated:** Both server components call `payload.auth({ headers })` and check `user?.collection === "customers"`. Unauthenticated requests redirect via `redirect("/signin")` from `next/navigation`. Both pages export `dynamic = "force-dynamic"` since they call `getPayload({ config })` at request time.

3. **AccountLink hydration safety:** The component initializes `user` state to `undefined`. Both the server render and the client's initial hydration render the "Sign in" branch (since `undefined !== null`). Only after `useEffect` mounts does the `/api/customers/me` fetch fire. If the user is signed in, the state flips to the Customer object and "Account" renders. If not, it flips to `null` and "Sign in" stays. No flash of "Account" → "Sign in" is possible because the default is already "Sign in".

4. **AccountLink sync strategy:** The spec's "easiest acceptable v1" (refetch on next mount) doesn't work well because `AccountLink` lives in the root layout, which persists across `router.push()` navigations. I added a lightweight custom event pattern: sign-in, sign-up, and sign-out forms all dispatch `window.dispatchEvent(new Event("nt:auth"))` on success. `AccountLink` listens for this event and re-fetches `/api/customers/me` immediately. This keeps the Header in sync without a full page reload, context provider, or extra dependencies. A cleaner v2 might use a tiny Zustand store (we already have Zustand for cart) or Next.js's `useRouter` events, but the custom event is zero-overhead and sufficient.

5. **Badge mapping for Order.status:**
   - `paid` → `accent` (gold background — positive, completed state)
   - `pending` → `neutral` (subtle, in-progress)
   - `failed` → `muted` (dimmed, error state)
   - `refunded` → `muted` (dimmed, terminal non-success state)

6. **Primitives used:** All forms use `Input` and `Button`. Order cards use `Card` (bordered variant). Order status uses `Badge`. No new visual primitives were created. `formatPriceCents` from `@/lib/format` is used for order totals.

7. **Blocklist and deps:** No blocklisted files were touched. No new npm dependencies added. `npm run check` (typecheck + build) exits 0.
