# Nepali Threads

Family-run ecommerce storefront for handmade Nepali clothing.

Production: <https://nepali-threads.com>

Admin: <https://nepali-threads.com/admin>

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- Payload CMS 3 with Neon Postgres
- Cloudflare R2 media storage
- Stripe Checkout and webhooks
- Resend transactional email
- Vercel hosting

## Local setup

Requirements:

- Node.js 20.18.1 or newer
- npm
- A development Postgres database
- Development credentials for Payload, R2, Stripe, and Resend as needed

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

- Storefront: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>

Never commit `.env.local` or production data.

## Verification

```bash
npm ls next payload @payloadcms/next --depth=0
npm run audit:production
npm test
npm run typecheck
npm run build
# equivalent combined gate
npm run check
```

Focused tests cover the inventory intake planner, product-level inventory availability, variant-required checkout behavior, footer route honesty, the empty-shop state, and the no-fake-newsletter fallback. Checkout still needs broader integration coverage; webhook, order, auth, and email paths remain largely untested beyond typechecking and the production build.

The production dependency gate fails on high or critical advisories. Lower vendor-owned findings and their reachability decisions are tracked in [`docs/dependency-security.md`](./docs/dependency-security.md); do not use `npm audit fix --force` as a substitute for reviewing the framework compatibility set.

## Inventory intake dry run

Fill or copy `docs/inventory-intake-template.csv`, then validate and group it without touching Payload:

```bash
npm run inventory:plan -- docs/inventory-intake-template.csv
```

The command rejects empty batches, malformed CSV structure, malformed prices/counts, missing required metadata, ambiguous featured values, duplicate provided SKUs, unsupported statuses, and conflicting parent-product values under one `product_key`. Prices are capped at $100,000.00 per item and quantities at 1,000,000 units per row. It prints a JSON plan with product, SKU, and quantity totals. Blank SKUs are reported for later assignment; no live records are created or updated.

See [`docs/inventory-operations.md`](./docs/inventory-operations.md) for the Neal + Jarvis handoff and the guarded import/read-back roadmap.

## Payload schema changes

Create schema changes in collection/global config, then regenerate artifacts:

```bash
npx payload generate:types
npx payload generate:importmap
npm run migrate
```

`npm run migrate` targets the database in `DATABASE_URL`. Confirm the environment before running it. Production migrations require an explicit deployment plan and recovery path.

Do not hand-edit:

- `src/payload-types.ts`
- `src/app/(payload)/admin/importMap.js`
- generated migration JSON

## Repository map

```text
src/app/(frontend)/     Public storefront
src/app/(payload)/      Payload admin and API shell
src/app/api/            Checkout and Stripe webhooks
src/collections/        Payload collections
src/components/admin/   Payload-only UI
src/components/storefront/ Storefront compositions
src/components/ui/      Storefront primitives
src/lib/                Orders, inventory, Stripe, email, formatting
migrations/             Payload/Postgres migrations
docs/                   Operator docs and project review
tasks/                  Historical implementation records
```

## Operating model

`AGENTS.md` is the canonical engineering manual. Jarvis / GPT-5.6 Sol owns implementation, review, testing, migrations, and release gating; Neal owns business truth and launch approval. The former Kimi/Claude/local-LLM workflow is retired.

Start here:

- [`AGENTS.md`](./AGENTS.md)
- [`docs/project-review.md`](./docs/project-review.md)
- [`docs/inventory-operations.md`](./docs/inventory-operations.md)
- [`docs/admin-guide.md`](./docs/admin-guide.md)

## Current status

The storefront, Payload admin, product/variant catalog, cart, Stripe checkout, order persistence, inventory decrement, customer accounts, and transactional emails exist. The site is deployed, but it is not launch-ready: the live catalog still contains test data, required policy content does not exist yet, inventory has two competing paths, and high-risk integration coverage remains thin. The footer hides unavailable routes and no longer presents a fake newsletter success path when no real subscriber handler exists.

See `docs/project-review.md` for the evidence and prioritized path to launch.
