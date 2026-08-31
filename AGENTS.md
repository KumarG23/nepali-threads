# AGENTS.md — Nepali Threads

This is the canonical repository operating manual. Read it before changing code, schema, migrations, dependencies, checkout, authentication, inventory, or deployment behavior.

`CLAUDE.md` is only a compatibility pointer to this file. Historical task files under `tasks/` preserve the old Kimi/Claude workflow as project history; they do not define current practice.

## Mission

Build and operate `nepali-threads.com`, a small family-run shop for handmade Nepali clothing.

The product is not a generic ecommerce demo. It must be usable by nontechnical family members, safe around customer/payment data, and simple enough that Neal and Jarvis can operate it without a miniature bureaucracy.

## Stack

- Next.js 16 App Router, TypeScript, React 19
- Payload CMS 3
- Neon Postgres
- Cloudflare R2 through Payload's S3 adapter
- Stripe Checkout and webhooks
- Resend transactional email
- Tailwind CSS 4
- Zustand for the persisted cart
- Vercel deployment

## Current operating model

- Neal owns business decisions, product truth, pricing, photography selection, and launch approval.
- Jarvis / GPT-5.6 Sol owns architecture, implementation, review, tests, migrations, and release gating.
- Do not route new work to Kimi, Claude Code, Qwen, Terra, or the retired local-LLM workflow.
- If work is delegated, the delegate must use GPT-5.6 Sol at high effort, work on a branch, and return a diff for Jarvis to inspect and verify.
- Use short-lived branches such as `jarvis/inventory-workspace`; never let several stale feature branches become a second project-management system.
- Important changes use the builder/reviewer pattern even when Jarvis fills both roles at different passes: implement, inspect the complete diff, run the real checks, then merge.

## Work discipline

1. Read the relevant code before editing it.
2. Make the smallest coherent change. Do not refactor unrelated areas.
3. Use migrations for schema changes. Never rely on `push: true` in production.
4. Never hand-edit `src/payload-types.ts`, `src/app/(payload)/admin/importMap.js`, or generated migration JSON.
5. Run `npx payload generate:types` after schema changes.
6. Run `npx payload generate:importmap` after adding or changing admin components, views, collections, or Payload plugins.
7. Run `npm run check` before calling application work complete.
8. Run `npm run audit:production` for dependency changes and release gates. High or critical production findings fail the gate; lower findings require a documented reachability and mitigation decision.
9. For checkout, auth, orders, inventory, or email, add focused tests or an executable smoke check. A green build alone is not enough.
10. Do not put customer data, credentials, Stripe payloads, or private business details in prompts, logs, fixtures, screenshots, or committed files.
11. Do not push, deploy, migrate production, or mutate live catalog data unless Neal explicitly scopes that action.

## High-risk paths

Treat these as load-bearing. Changes require a deliberate review pass and focused verification:

- `src/app/api/webhooks/**`
- `src/app/api/auth/**`
- `src/app/api/checkout/**`
- `src/lib/stripe/**`
- `src/lib/inventory.ts`
- `src/lib/orders/**`
- `src/lib/email/**`
- `src/collections/Users.ts`
- `src/collections/Customers.ts`
- `src/collections/Orders.ts`
- `src/collections/GiftCards.ts`
- `src/collections/GiftCardRedemptions.ts`
- `src/components/admin/MoneyField.tsx`
- `src/payload.config.ts`
- `migrations/**`
- `patches/**`
- `.env*`

Some files still begin with `LOCAL-LLM: DO NOT EDIT`. That is a historical marker from the retired workflow. Read it now as `SECURITY-SENSITIVE: REVIEW CAREFULLY`, not as active model routing.

## Architecture rules

- TypeScript in `src/`; avoid `any` unless the reason is documented locally.
- Server Components by default. Add `"use client"` only for state, effects, browser APIs, or event handlers.
- Double quotes for strings.
- Import order: external packages, `@/` imports, relative imports, with blank lines between groups.
- `@/` maps to `src/`. `src/payload.config.ts` intentionally uses relative collection imports because Payload CLI execution does not resolve the alias reliably.
- Async code uses `async` / `await`.
- Surface plain-English errors to users; do not expose raw exceptions.
- Every interactive control needs an accessible name, keyboard behavior, and visible focus state.
- Avoid new dependencies when a small local implementation is sufficient. For a real dependency, explain why and inspect its maintenance/security cost.

## Payload conventions

- Import types from `payload`, never `payload/types`.
- Single-target `relationship` and `upload` fields use a string `relationTo`.
- Rich text uses `lexicalEditor()` from `@payloadcms/richtext-lexical`.
- Custom admin components are referenced by component-path strings, optionally with `#NamedExport`.
- Collections export both a named constant and a default.
- Public storefront collections may allow public reads; writes remain admin-only.
- Admin labels and descriptions are written for a family member, not a database engineer.
- New products default to draft. Publishing must be intentional.
- Money is stored as integer cents everywhere. `MoneyField` is an admin-only dollars↔cents adapter.
- Orders are never deleted; they are cancelled or refunded while preserving the record.

## Current catalog model

- `Products` holds merchandising content, category, base price, optional product-level inventory, images, featured state, publication status, and SEO fields.
- `ProductVariants` holds the purchasable size/color combination, SKU, optional price override, and inventory.
- The current optional-variant model creates two inventory paths. Do not deepen that split casually.
- The proposed target is one inventory row per sellable SKU, including one-size products. See `docs/inventory-operations.md` before changing the catalog schema.
- Categories are navigation. Tags/facets are not yet modeled. Do not overload category names as ad-hoc tags.

## Admin UX standard

Dad and sister are primary admin users. Optimize for the job they are doing:

- Plain-English labels and one-sentence help on non-obvious fields.
- Minimal required fields so a draft can be saved early.
- Frequent actions should take one screen, not repeated collection hopping.
- Inventory work should be row-oriented and bulk-friendly.
- Use safe defaults and confirmation for destructive or high-impact actions.
- Hide system-managed fields when possible; otherwise make them read-only and explain them.
- Prefer a purpose-built inventory workspace over teaching family members Payload internals.

## Storefront standard

- Tailwind 4 tokens live in `src/app/(frontend)/globals.css`; do not create a Tailwind config file.
- Storefront primitives live in `src/components/ui/`; Payload-only components live in `src/components/admin/`.
- React 19 refs are regular props; do not introduce `forwardRef` without a concrete compatibility need.
- Brand copy is warm and direct: `Add to cart`, `Sold out`, `Made by hand in Nepal`.
- Never publish fake products, test categories, dead footer links, or forms that claim success without storing or sending anything.

## Launch gates

A production launch requires all of these:

- Real catalog loaded, photographed, categorized, counted, and reviewed.
- Test products/categories removed or unpublished.
- Every public navigation/footer route either works or is removed.
- Newsletter form is connected or removed; no fake-success stub.
- Product and variant inventory is enforced at checkout and decremented reliably.
- Stripe webhook secret and production URLs are configured.
- Checkout, order persistence, inventory decrement, confirmation email, and admin notification are smoke-tested in Stripe test mode.
- Refund/cancellation behavior and inventory reconciliation are documented.
- Dependency audit reviewed; critical/high production-relevant issues resolved or explicitly accepted.
- `npm run check` passes from a clean dependency install.
- Mobile and desktop storefront smoke tests pass.

## Commands

After pulling dependency changes or switching branches with a different lockfile:

```bash
npm install
npm ls next payload @payloadcms/next --depth=0
npm run audit:production
npm run check
```

Schema/admin generation:

```bash
npx payload generate:types
npx payload generate:importmap
npm run migrate
```

Do not run production migrations merely to see whether they work. Use the intended environment and a backup/recovery plan.

## Intentional oddities

- `patches/payload+3.88.0.patch` fixes Payload CLI environment loading on modern Node when `@next/env` ESM interop fails. It applies through `postinstall`. Remove only after verifying the upstream bug is fixed.
- `"type": "module"` in `package.json` is load-bearing for the Payload/Lexical import graph.
- `src/payload.config.ts` uses relative imports for Payload CLI compatibility.
- `src/app/(payload)/admin/importMap.js` is generated.
- Next 16.3.3, Payload 3.88.0, React 19.2.8, and Sharp 0.35.4 are pinned as one reviewed compatibility/security set. Upgrade them together unless upstream peer ranges prove otherwise.
- `docs/dependency-security.md` records the production audit gate and accepted vendor-owned moderate findings.
- Direct-to-R2 uploads avoid Vercel's request-body size limit.

## Project records

- `README.md` — setup and architecture entry point.
- `docs/project-review.md` — current audit and prioritized roadmap.
- `docs/inventory-operations.md` — collaborative intake, SKU, label, and inventory plan.
- `docs/admin-guide.md` — family-facing operating guide.
- `product-migration-reference.md` — historical 15-product migration source.
- `tasks/` — historical implementation records. Do not use their retired model-routing instructions for new work.

Update this file when architecture, operating roles, verification commands, or launch gates change. Keep transient task status in issues/roadmaps, not here.
