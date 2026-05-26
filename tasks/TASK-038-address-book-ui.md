TASK ID: TASK-038
PHASE: Phase 3 polish — accounts
GOAL: Customer-facing UI to manage saved addresses at `/account/addresses`. List existing addresses, add new ones, edit, delete, and mark one as default. Backed entirely by the existing `Customers.addresses` array field — no schema changes, no new endpoints.

CONTEXT:
The Customers collection already has an `addresses` array field (label, recipientName, line1, line2, city, region, postalCode, country, phone, isDefault, type). TASK-034 opened up `update` access for customers to PATCH their own record. So the full CRUD loop is server-supported today — this task just builds the UI.

Use Payload's auto-generated PATCH endpoint:
```
PATCH /api/customers/<own-id>
Body: { addresses: [...the full updated array...] }
```

Payload validates the array against the field schema and replaces the entire list on save. So adding / editing / deleting an address means computing the new array client-side and PATCHing the whole thing.

Out of scope (queued):
- Address-picker UI at Stripe Checkout time (Stripe Checkout collects shipping address on its hosted page — we don't pass our saved addresses to it). Defer until Stripe Customer linking lands (Claude task TASK-041) which lets Stripe surface saved addresses via the customer object.
- Address validation (USPS / Smarty / etc.) — defer
- Address auto-complete (Google Places etc.) — defer; would add a dep
- International countries beyond US — keep the country field as `defaultValue: "US"` per schema; UI shows it but doesn't offer a dropdown
- Bulk operations (multi-select, batch delete)
- Confirmation modal before delete — use a simple Confirm-style flow inline ("Are you sure?" → button changes label or just a `confirm()` prompt)

FILES TO CREATE OR MODIFY:

**New:**
- `src/app/(frontend)/account/addresses/page.tsx` — server component, auth check, fetches the current customer, renders the client form
- `src/app/(frontend)/account/addresses/_addresses-content.tsx` — `"use client"` component with the list + add/edit/delete forms

**Modify:**
- `src/app/(frontend)/account/page.tsx` — add a "Manage your addresses →" link next to the "View your orders →" link

REQUIREMENTS:

**1. Server wrapper (`/account/addresses/page.tsx`).**

Same shape as `/account/page.tsx` from TASK-035 — server component, fetches the user via `payload.auth({ headers })`, redirects to `/signin` if not signed in as a customer, passes the customer's addresses array down to the client component.

```tsx
import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import type { Metadata } from "next";

import config from "@payload-config";

import { AddressesContent } from "./_addresses-content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your addresses",
};

export default async function AddressesPage() {
  const payload = await getPayload({ config });
  const headers = await nextHeaders();
  const { user } = await payload.auth({ headers });

  if (!user || user.collection !== "customers") {
    redirect("/signin");
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-16 sm:px-8 lg:px-12 lg:py-24">
      <p className="font-sans text-small font-medium uppercase tracking-wide text-brand-gold-700 mb-3">
        Account
      </p>
      <h1 className="font-serif text-h1 text-neutral-ink mb-2">Your addresses</h1>
      <p className="font-sans text-body text-neutral-ink/70 mb-8">
        Saved shipping and billing addresses. The default address is used at checkout.
      </p>
      <AddressesContent
        customerId={typeof user.id === "number" ? user.id : -1}
        initialAddresses={user.addresses ?? []}
      />
    </article>
  );
}
```

The `customerId` and `initialAddresses` get passed down as props. The client component takes it from there.

**2. Client component (`_addresses-content.tsx`).**

`"use client";`. Holds the list in React state (initialized from the prop). All mutations go through a single `saveAddresses(updatedArray)` function that PATCHes the customer and updates local state on success.

Component state:
- `addresses` — the current local copy of the array
- `editingId` — string | null — when editing, the local id of the address being edited (or "new" when adding)
- `loading` — boolean, true during a PATCH
- `error` — string | null, surface API errors

Each address in the array has a stable local `id` for React keys + edit targeting. Payload assigns one automatically when saving, but new (unsaved) entries need one too. Use crypto.randomUUID() to assign on add.

Wait — there's a subtle wrinkle. Payload's array items DO get ids assigned by Payload, but only after a save. So if you PATCH a new address with `id: <uuid>`, Payload might either accept it or overwrite it. **Test this:** the cleanest pattern is to NOT pass the id when creating a new address (let Payload assign), and only use the id field on existing addresses for updates. If unsure, just leave id off when sending and use React's array index for the local key during the unsaved-in-progress state.

Simpler approach: never include id in the PATCH payload. Just always send the full updated array. Payload will treat each entry as new and re-assign ids. **Verify this doesn't cause ordering churn.** If it does, fall back to including the existing ids.

**Render structure:**

```tsx
<div className="space-y-6">
  {addresses.length === 0 && !editingId ? (
    <p className="font-sans text-body text-neutral-ink/60">
      No saved addresses yet.
    </p>
  ) : (
    <ul className="space-y-4">
      {addresses.map((addr, i) => (
        <li key={addr.id ?? `idx-${i}`}>
          {editingId === (addr.id ?? `idx-${i}`) ? (
            <AddressForm
              initial={addr}
              onSave={(updated) => handleEdit(i, updated)}
              onCancel={() => setEditingId(null)}
              loading={loading}
            />
          ) : (
            <AddressCard
              address={addr}
              onEdit={() => setEditingId(addr.id ?? `idx-${i}`)}
              onDelete={() => handleDelete(i)}
              onMakeDefault={() => handleMakeDefault(i)}
              loading={loading}
            />
          )}
        </li>
      ))}
    </ul>
  )}

  {editingId === "new" ? (
    <AddressForm
      initial={null}
      onSave={(newAddress) => handleAdd(newAddress)}
      onCancel={() => setEditingId(null)}
      loading={loading}
    />
  ) : (
    <Button
      variant="secondary"
      onClick={() => setEditingId("new")}
      disabled={loading}
    >
      + Add address
    </Button>
  )}

  {error && (
    <p className="font-sans text-small text-brand-red-700" role="alert">
      {error}
    </p>
  )}
</div>
```

**AddressCard (display) layout** — flex row with the address text on the left + action buttons on the right.

Label (if set) bold, then recipient name, then a two-line address block (`line1`, `line2`, `city, region postalCode`, `country` if not US), type badge ("Shipping" / "Billing" / "Both" — use the Badge primitive at sm), "Default" badge with `variant="accent"` if isDefault, phone if set.

Three action buttons stacked or inline on the right:
- "Edit" (secondary Button sm)
- "Delete" (small text link, subtle)
- "Make default" (small text link — hidden if isDefault is true)

**AddressForm** — same fields as the Customers.addresses schema, using the Input primitive:
- Label (text, optional, hint "e.g. Home, Office")
- Recipient name (text, required)
- Address line 1 (text, required)
- Address line 2 (text, optional)
- City (text, required)
- State / Region (text, required)
- ZIP / Postal code (text, required)
- Country (text, default "US")
- Phone (text, optional)
- Type (radio: Shipping / Billing / Both, default Both)
- "Make this my default address" (checkbox)

Two buttons at the bottom: "Save" (primary) and "Cancel" (secondary).

**3. The save function.**

When any mutation handler fires (handleEdit, handleAdd, handleDelete, handleMakeDefault), build the new array locally, then call:

```ts
async function saveAddresses(updated: Address[]) {
  setLoading(true);
  setError(null);
  try {
    const response = await fetch(`/api/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ addresses: updated }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.message ?? "Couldn't save your changes.");
    }
    const data = await response.json();
    // Payload returns the updated doc; sync local state to its
    // addresses array so any server-side mutations (id assignment,
    // ordering) are reflected.
    setAddresses(data.doc?.addresses ?? updated);
    setEditingId(null);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Couldn't save your changes.");
  } finally {
    setLoading(false);
  }
}
```

Key detail: after a successful save, take the server's response (`data.doc.addresses`) as the source of truth — that gives us the Payload-assigned ids on new entries, plus any normalization Payload did. Falls back to the local `updated` array if the response shape doesn't include addresses (shouldn't happen, defensive).

**4. Make-default rule.**

When the user clicks "Make default" on address index `i`, build the new array with `isDefault: true` on index `i` and `isDefault: false` on every other address. The schema doesn't enforce mutual exclusion server-side, but the UI does — users expect "default" to mean "one and only one default."

```ts
function handleMakeDefault(idx: number) {
  const updated = addresses.map((addr, i) => ({
    ...addr,
    isDefault: i === idx,
  }));
  saveAddresses(updated);
}
```

**5. Delete.**

Inline confirmation — change the Delete button to "Tap again to confirm" for ~3 seconds after first tap, then back to "Delete." If they tap during the confirm window, fire the deletion. No modal.

Implementation: a per-address `confirmDeleteId` state on the AddressCard or hoisted; clear after 3 seconds via setTimeout. Standard pattern — keeps things modal-free.

```ts
const [confirmingDelete, setConfirmingDelete] = useState(false);

function handleDeleteClick() {
  if (confirmingDelete) {
    onDelete();
  } else {
    setConfirmingDelete(true);
    setTimeout(() => setConfirmingDelete(false), 3000);
  }
}
```

Button label flips: "Delete" → "Tap again to confirm" → back to "Delete" after 3 sec.

**6. Add the link from /account/page.tsx.**

In `src/app/(frontend)/account/page.tsx`, right under the "View your orders →" Link, add a parallel "Manage your addresses →" Link pointing at `/account/addresses`. Same styling.

**7. Accessibility + styling.**

- Form elements use the existing Input + Button primitives — no custom form markup
- Section uses the same article + container shape as /account, /account/orders
- Each AddressCard uses the Card primitive with `variant="bordered" padding="md"`
- All interactive elements get the project's gold focus ring (inherited via primitives)
- Use the project's existing `formatPriceCents`-style imports / patterns (no new helpers needed for this task)

**8. Don't touch.**

- Anything blocklisted (Customers.ts, Orders, payload.config.ts)
- The Customer schema (addresses field already exists)
- Cart store / cart page (addresses are checkout-time today, separate from saved-addresses UX)
- Stripe Checkout flow (saved addresses don't auto-populate yet — separate Claude task)

ACCEPTANCE:
- `npm run check` exits 0
- After deploy, signed in:
  - Visit `/account/addresses` → renders, shows existing addresses (or empty state)
  - Tap "+ Add address" → form appears with all fields
  - Fill in a complete address (label, recipient, line1, city, region, zip, country=US, type=Both, isDefault=true) → Save → form closes, address appears in the list
  - Tap "Edit" on that address → form reopens with current values → tweak → Save → list updates
  - Tap "Make default" on a different address → both update (the new one shows Default badge, the old one doesn't)
  - Tap "Delete" → button flips to "Tap again to confirm" → tap again within 3s → address disappears from the list
  - Wait > 3s after first tap → button reverts; nothing deleted
  - Signed-out visit to `/account/addresses` → redirect to `/signin`
- No new entries in `package.json` `dependencies` or `devDependencies`

OUTPUT NOTES FOR REVIEWER:
- Confirm the page is a server component + client content component split (same pattern as /account)
- State whether you decided to include or omit Payload-assigned ids in the PATCH body and why
- Confirm the "Make default" rule clears `isDefault: false` on all other addresses in the same save
- Confirm tap-again-to-confirm delete (no native confirm modal)
- Flag any place where Payload's PATCH response shape was different from expected
- Confirm you did not touch any blocklisted paths and did not add new npm deps

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

1. **Server + client split:** Confirmed. `/account/addresses/page.tsx` is a server component with `payload.auth({ headers })` → redirect to `/signin` for unauthenticated users. It passes `customerId` and `initialAddresses` to the client component `_addresses-content.tsx` which holds all React state and handles mutations.

2. **Payload ids in PATCH body:** I include the `id` field when it exists (`id: initial?.id` in the form state) and omit it when undefined (new addresses). The PATCH sends the full array. Payload updates existing items in place when ids are present and creates new items when ids are absent. After a successful save, the local state is synced from `data.doc.addresses` so Payload-assigned ids on new entries are reflected.

3. **Make default clears all others:** Confirmed. `handleMakeDefault` maps the array setting `isDefault: i === index` — only the selected address gets `true`, all others get `false`. This is enforced client-side on every save.

4. **Tap-again-to-confirm delete:** Confirmed. `AddressCard` holds a `confirmingDelete` local state. First tap sets it to `true` and starts a 3-second timeout that reverts it. Second tap within the window fires `onDelete()`. Button label flips from "Delete" to "Tap again to confirm". No modal.

5. **Payload PATCH response shape:** As expected — `{ doc: { addresses: [...] } }`. The defensive fallback `data.doc?.addresses ?? updated` handles any unexpected shape.

6. **Build note:** `npm run build` fails on this branch due to a pre-existing type error in `src/lib/email/payload-email-adapter.ts` (blocklisted file, present on main too — verified by checking `main` branch). My changes do not cause this failure. The email adapter uses `payload.logger.warn(string, object)` but Payload's logger types don't accept an object as the second arg.

7. **No blocklist touches, no new deps:** Only storefront files were modified. No blocklisted paths. No new npm dependencies.
