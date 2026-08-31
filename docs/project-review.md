# Nepali Threads project review

Original audit snapshot: 2026-08-31 09:22 EDT. Current remediation status is folded into the sections below so historical findings are not mistaken for open work.

## Executive read

The repo is a functioning deployed ecommerce application, not a scaffold.

It is not launch-ready.

The fastest path is not “finish every planned feature.” It is:

1. replace manual catalog entry with a controlled intake/import workflow,
2. normalize inventory around SKUs,
3. clean test content and dead links,
4. close checkout/inventory correctness gaps,
5. add tests around money/auth/inventory paths,
6. launch a small, real catalog.

## Verified repository state

- Stack after dependency remediation: Next.js 16.3.3, Payload 3.88.0, React 19.2.8, Sharp 0.35.4, Neon, R2, Stripe, Resend.
- Application code is roughly 3,862 TS/TSX lines plus generated/migration JSON and 50 Markdown files after this review.
- `npm ls next payload @payloadcms/next --depth=0` resolves the expected versions.
- `npm run check` passes with 36 focused tests, TypeScript compilation, and a Next.js production build.
- `npm audit --omit=dev` is reduced from 19 high / 7 moderate to 0 high / 0 critical / 6 moderate / 1 low. The residual findings are vendor-owned Payload/Drizzle CLI tooling and Monaco's bundled DOMPurify; reachability and follow-up are documented in `docs/dependency-security.md`.
- GitHub Actions performs a clean install, high/critical production dependency audit, tests, typecheck, and production build.
- `README.md` is project-specific and `AGENTS.md` is canonical; `CLAUDE.md` is only a compatibility pointer.
- There is one old stash containing package-file churn and several stale remote branches. Most named fix/task branches are already ancestors of `main`; `local/TASK-038-039-account-polish` still has three unique old commits and needs a deliberate salvage-or-delete decision.

### Remediation delivered after the original snapshot

- a tested, no-write CSV inventory validator and grouped dry-run planner,
- product-level stock gating plus server-side variant selection enforcement while the variant-only migration is pending,
- removal of unavailable footer links and the fake newsletter success path,
- a Node test script included in `npm run check`,
- GitHub Actions CI for clean install, tests, typecheck, and build.

These changes do not mutate production catalog data.

## Verified live state

Public API snapshot:

- 7 Product records total.
- 5 published products and 2 archived test products.
- 4 ProductVariant records.
- 1 category: `Test Category`.
- Several public products are named `Test-Shorts` or `Test Romper`.
- The homepage and shop are live and show test/catalog-in-progress content.
- `/about` returns 200.
- `/gift-cards`, `/shipping`, `/returns`, `/contact`, `/sustainability`, `/press`, `/privacy`, and `/terms` return 404 while the footer links to them.
- The footer newsletter submits to a local fake-success stub; it does not persist a subscription.

Historical migration material already describes 15 products across 4 categories, with local/source image references in `product-migration-reference.md`. The current production catalog has not absorbed that catalog cleanly.

## P0 — launch blockers

### 1. Inventory has two competing sources

`Products.inventoryCount` remains optional while `ProductVariants.inventoryCount` is required. Checkout now gates both paths and requires a variant whenever variants exist, closing the immediate bypass. The two-source model remains transitional debt.

Recommendation: normalize every sellable stock unit to a variant/SKU, then gate and decrement one inventory source.

### 2. Manual inventory operations do not fit the business

Variants are separate Payload documents. A family member must jump between Products and Product Variants and manually maintain SKU/count records. There is no bulk intake, reconciliation, low-stock view, adjustment history, or label workflow.

Recommendation: build the dry-run CSV importer first, then a row-oriented `/admin/inventory` custom view. See `docs/inventory-operations.md`.

### 3. Production contains test content

The live catalog uses `Test Category`; public products include test-named items. This is customer-visible.

Recommendation: load/reconcile the real catalog as drafts, review it, then unpublish/archive/delete test content as appropriate before launch.

### 4. Public navigation is mostly dead

Unavailable footer routes were removed, so the storefront no longer advertises dead pages. Required policy/contact content still does not exist.

Recommendation: create the minimum real pages or remove the links. Privacy, terms, shipping, returns, and contact are launch requirements; press and sustainability can wait.

### 5. Newsletter claims success without doing anything

Resolved: the footer no longer renders or reports a newsletter subscription when no real handler exists.

Recommendation: connect a real double-opt-in or remove/disable the form until it exists. Fake success is worse than no form.

### 6. Checkout/order idempotency is not database-enforced

Order persistence does a find-then-create lookup on `stripePaymentIntentId`, but the field is indexed, not unique. The success-page and webhook paths can race and create duplicate orders.

Recommendation: add a unique constraint/migration or redesign idempotent persistence around an atomic database guarantee; test the concurrent/retry case.

### 7. Dependency high/critical audit is resolved

The coordinated Next/Payload/React/Sharp upgrade removes all high and critical production advisories. The remaining 6 moderate and 1 low findings are documented vendor debt, not silently ignored.

Recommendation: keep `npm run audit:production` in CI, review the complete audit during dependency work, and remove the accepted exceptions when Payload/Drizzle/Monaco publish safe upgrades.

## P1 — required before taking real orders

### Automated coverage

CI now runs a clean install, high/critical production audit, 36 focused tests, typecheck, and production build. Coverage is still thin on the integration paths below.

Add focused tests for:

- checkout input validation and authoritative price lookup,
- product and variant stock gating,
- webhook signature/retry handling,
- duplicate order prevention,
- inventory decrement and oversell behavior,
- customer self-access boundaries,
- email verification/order claiming,
- shipping notification idempotency.

Expand the existing route-level and integration coverage as each high-risk path changes.

### Refund and reconciliation behavior

The webhook only handles `checkout.session.completed`. Refund/payment-failure events are acknowledged but ignored. Inventory is not automatically restored on refunds or returns, and no adjustment ledger exists.

Define the business rule first. For a tiny shop, manual restock on physical return may be correct, but it must be explicit and auditable.

### Shipping/tax truth

Checkout collects a US shipping address but configures no shipping rate or automatic tax. Orders persist `tax: 0` and `shipping: 0` while `total` comes from Stripe.

Decide and test the actual shipping/tax model before launch. Do not let the schema imply amounts that are not collected.

### Environment contract

Before this review, `.env.example` omitted variables used in code (`NEXT_PUBLIC_SITE_URL`, `STRIPE_WEBHOOK_SECRET`) and included retired Ollama variables plus an unused Stripe publishable key.

Keep `.env.example`, Vercel production variables, and code usage synchronized.

## P2 — useful after the launch path is stable

- Inventory Workspace with inline adjustments, low-stock filters, CSV import/export, labels, and adjustment ledger.
- Controlled tags/facets based on real catalog needs.
- Product/account polish from the stale `TASK-038-039` branch only after rebasing and reviewing each piece; do not merge the branch wholesale.
- Gift cards.
- Better analytics, structured logging, and operational alerts.
- Expanded SEO and merchandising.

## Two-person operating model

### Neal

- Supplies product truth, photos, physical counts, price decisions, policy copy, and final approvals.
- Can send rough text, voice notes, photos, or a partial sheet; perfect data entry is not his job.
- Approves import diffs and live changes.

### Jarvis

- Converts rough inputs into normalized inventory rows.
- Assigns and validates SKUs.
- Produces dry-run import reports and discrepancy reports.
- Implements and verifies code, migrations, imports, and releases.
- Reads live records back after every write.
- Maintains the launch checklist and surfaces decisions that genuinely require Neal.

### Sister/dad

- Optional operators, not critical-path project managers.
- Best bounded jobs: photograph, count labeled SKUs, flag restock/damage, mark orders shipped.
- They should not need to understand Payload's collection model.

## Recommended execution order

### Sprint 1 — catalog intake and trust surface

- Finalize SKU/inventory model.
- Build CSV validator/importer with dry-run and read-back.
- Load the real catalog as drafts.
- Create minimum shipping, returns, contact, privacy, and terms pages.
- Remove or disable the fake newsletter.
- Remove public test content.

### Sprint 2 — correctness gate

- Fix plain-product stock gating.
- Enforce order idempotency at the database layer.
- Add checkout/webhook/inventory tests and CI.
- Decide shipping, tax, refund, and restock rules.
- Run Stripe test-mode purchase-to-shipment smoke tests.
- Upgrade vulnerable dependencies safely.

### Sprint 3 — operator UX

- Normalize inventory to one variant/SKU path.
- Build `/admin/inventory`.
- Add labels/barcodes and adjustment history.
- Train family with the updated admin guide.

### Sprint 4 — launch

- Full catalog/photo/content review.
- Mobile/desktop storefront QA.
- Test order, email, fulfillment, refund, and reconciliation.
- Production backup/migration/deploy plan.
- Launch with a small real catalog, then iterate.

## Review artifacts created

- Canonical `AGENTS.md` replacing stale model-routing instructions.
- Compatibility-only `CLAUDE.md` pointer.
- Project-specific `README.md`.
- `docs/inventory-operations.md`.
- `docs/inventory-intake-template.csv`.
- Updated environment and admin documentation should remain synchronized with implementation.
