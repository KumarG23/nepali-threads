# TASK-040 — Homepage Featured Products

## Owner

Kimi K2.6

## Branch

`local/TASK-040-homepage-featured-products`

## Goal

Replace the hardcoded homepage “Recent work” product cards with real Payload-backed featured products.

The homepage currently renders four sample cards in `src/app/(frontend)/page.tsx`, all linking to `/products/test-romper`. That was fine for scaffolding. It is not acceptable for launch.

Use the existing Products collection field `showOnHomepage` to decide which published products appear on the homepage.

## Required reading

Before editing, read:

1. `CLAUDE.md`
2. `.localllm-blocklist`
3. Existing storefront data-fetching examples:
   - `src/app/(frontend)/shop/page.tsx`
   - `src/app/(frontend)/categories/[slug]/page.tsx`
   - `src/app/(frontend)/products/[slug]/page.tsx`

## Scope

Allowed files:

- `src/app/(frontend)/page.tsx`
- `tasks/TASK-040-homepage-featured-products.md`

Do not edit anything else unless absolutely necessary. If you believe another file must change, stop and explain why in Notes for Reviewer instead of making the change.

## Hard stop / do not touch

Do not touch:

- checkout code
- Stripe code
- auth/customer-account code
- orders/order-persistence code
- email/webhook code
- Payload collection access rules
- `src/payload.config.ts`
- `migrations/`
- `package.json`
- `package-lock.json`
- env/config files
- files marked `LOCAL-LLM: DO NOT EDIT`

Specifically do not edit:

- `src/app/api/checkout/route.ts`
- `src/lib/stripe/client.ts`
- `src/lib/orders/persist-stripe-order.ts`
- `src/collections/Customers.ts`
- `src/collections/Orders.ts`

This is a homepage storefront rendering task only.

## Implementation requirements

### 1. Fetch featured products from Payload

In `src/app/(frontend)/page.tsx`, after the existing homepage hero fetch, fetch Products where:

- `status` equals `published`
- `showOnHomepage` equals `true`

Use:

- `limit: 4`
- newest first sorting
- enough `depth` to access the first product image URL and alt text

Follow the query style already used by `/shop`, category pages, and PDP related products.

Do not create a new API route.

### 2. Render real product cards

Replace the four hardcoded sample cards with mapped real products.

Each rendered product card must:

- link to `/products/${product.slug}`
- render the existing `ProductCard`
- pass `product.name`
- pass `product.basePrice`
- use the first valid product image URL
- use the media alt text if present, otherwise the product name
- preserve the current responsive grid classes
- preserve focus-visible and `active:opacity-90` link behavior

### 3. Skip invalid cards gracefully

Only render products with a usable first image URL.

If a product is featured but has no valid image object / URL, skip it. Do not render broken image cards.

Be defensive around Payload relationship fields: image relationships may be IDs or populated objects depending on depth and generated types.

### 4. Empty state

If no valid featured products are available, render a small polished empty state inside the section.

Suggested copy:

> Featured pieces are coming soon.

Do not render fake products.

### 5. Copy

Keep the existing section heading and body unless a tiny wording adjustment is needed:

- Heading: `Recent work`
- Body begins: `A few pieces from the current collection...`

Do not invent a new marketing section.

### 6. Type safety

Avoid `any`.

Use generated Payload types where helpful:

- `Product`
- `Media`

Add a small local helper if useful for narrowing the first image relationship.

## Acceptance criteria

- `src/app/(frontend)/page.tsx` no longer contains hardcoded sample product card data.
- `src/app/(frontend)/page.tsx` no longer links homepage product cards to `/products/test-romper`.
- Homepage featured products come from Payload.
- Only published products with `showOnHomepage: true` are queried.
- Products without usable images are skipped gracefully.
- Empty state renders when there are no valid featured products.
- Existing homepage hero behavior remains unchanged.
- No dependencies added.
- No blocklisted/security/payment/auth files touched.
- `npm run typecheck` passes.
- If possible in your environment, `npm run build` passes. If build fails because env vars or database are missing, report that clearly.

## Verification

Run:

```bash
npm run typecheck
```

Then, if your environment has the required secrets/database access:

```bash
npm run build
```

If build fails due to missing local env vars or missing database access, do not attempt broad fixes. Record the exact limitation in Notes for Reviewer.

## Output notes for reviewer

Append this section at the bottom of this file when complete:

```md
## Notes for Reviewer (Kimi)

- Files changed:
- Query shape used:
- How image relationship narrowing is handled:
- Empty-state behavior:
- Verification run:
- Any build/typecheck limitations:
```

## Commit

Commit with:

```bash
git add src/app/'(frontend)'/page.tsx tasks/TASK-040-homepage-featured-products.md
git commit -m "[kimi] feat: render featured products on homepage"
```

If your shell dislikes the quoted path, escape the parentheses instead:

```bash
git add src/app/\(frontend\)/page.tsx tasks/TASK-040-homepage-featured-products.md
```
