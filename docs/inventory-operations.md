# Inventory operations plan

## Recommendation

Use Payload as the system of record, but stop making people operate inventory one Payload document at a time.

The practical model is:

1. Neal or family captures rough product facts and photos in a shared intake sheet.
2. Jarvis validates, normalizes, assigns SKUs, flags missing facts, and imports/updates Payload in batches.
3. A purpose-built Payload **Inventory Workspace** becomes the daily tool for counts, low-stock review, and labels.
4. Product storytelling remains in the normal Product editor; inventory work happens in rows.

Payload is the database/admin framework. It does not need to be the workflow.

## What we can do together immediately

Use `docs/inventory-intake-template.csv` as the handoff format. One row represents one sellable SKU.

Neal can provide any combination of:

- the completed sheet,
- phone photos of items/tags,
- a folder of product photos,
- voice/text notes such as “three blue mushroom pants, two medium and one XL, $75,”
- a physical count by category.

Jarvis can then:

- turn rough notes into structured rows,
- normalize names, categories, colors, sizes, prices, and quantities,
- detect duplicate/missing SKUs,
- identify products that need better photos or descriptions,
- produce a review diff before any live write,
- import approved rows through Payload's Local/REST API,
- read the records back and reconcile counts.

No one should manually create 40 variant documents unless they enjoy administrative punishment.

## Data model recommendation

### Product = the listing/story

A Product holds:

- public name and slug,
- description/story,
- category and future facets/tags,
- base price,
- product-level photos,
- featured/published state,
- SEO fields.

### Variant = the sellable stock unit

Every purchasable item should have a Variant, including a one-size product with only one choice.

A Variant holds:

- immutable SKU,
- product relation,
- size/color,
- optional price override,
- on-hand quantity,
- optional variant photos,
- future barcode/QR label metadata.

This removes the current split where some inventory lives on Products and some on ProductVariants. Checkout, labels, counts, low-stock alerts, and reporting can all operate on one table.

Migration path:

1. Add a default variant for each product that currently has no variants.
2. Copy product-level inventory into the default variant.
3. Require a variant on every cart/checkout line.
4. Gate and decrement only variant inventory.
5. Keep the old Product inventory field read-only during transition, then remove it in a later migration.

Do not make this schema change directly in production. Build and verify the migration against a development snapshot first.

## SKU strategy

Use boring, stable identifiers. Product names, categories, prices, colors, and locations change; the SKU must not.

Recommended shape:

```text
NT-0001
NT-0002
NT-0003
```

The SKU is an immutable sequential identifier for the sellable variant. Human-readable product/color/size details print next to it on the label; they do not need to be encoded into the identifier.

Why not `DRESS-RED-OS`? Because renaming “red” to “crimson,” moving a product to a new category, or correcting a size should not rename the stock unit and break historical references.

## Intake sheet

Template columns:

- `product_key` — temporary grouping key such as `romper-crimson`; repeated for multiple variants of the same listing
- `product_name`
- `category`
- `base_price_usd`
- `description`
- `material`
- `care`
- `tags` — comma-separated intake metadata; not written until the final tag schema is approved
- `sku` — blank for new items; Jarvis assigns it
- `size`
- `color`
- `swatch_hex`
- `quantity`
- `photo_paths` — semicolon-separated filenames/paths or shared URLs
- `featured`
- `status` — normally `draft` during intake
- `notes`

The sheet is an intake queue, not the source of truth. After import, Payload owns the live count.

## Tagging: two different jobs

### Digital tags/facets

Categories should remain clean storefront navigation: Dresses, Tops, Bottoms, Rompers.

Future tags/facets should be controlled values, not free-text chaos. Likely groups:

- Material: cotton, silk, wool
- Technique: patchwork, handwoven, printed
- Fit: one-size, relaxed, fitted
- Occasion: everyday, festival, formal
- Collection: seasonal/drop name
- Origin/maker: only if there is accurate, useful customer-facing detail

Start with the actual catalog. Do not invent a taxonomy before seeing the inventory; that creates an elegant empty filing cabinet.

### Physical tags/labels

Generate a printable label for each SKU containing:

- Nepali Threads name/logo,
- product name,
- size/color,
- price,
- SKU in text,
- Code 128 barcode or QR code,
- optional QR deep-link into the Inventory Workspace.

A phone camera can scan the label, open the row, and apply `+1`, `-1`, or “set count” without hunting through collections.

## Inventory Workspace MVP

Add a custom Payload root view at `/admin/inventory`. Payload 3 supports custom root/collection views and list-view components.

MVP capabilities:

- one row per SKU,
- search by SKU, product, color, or size,
- filters for category, published/draft, zero stock, and low stock,
- columns for photo, product, SKU, size, color, on-hand, and status,
- inline `+1`, `-1`, and exact-count controls,
- bulk set category/status/tags where safe,
- low-stock threshold and warning,
- “print labels” for selected rows,
- CSV export and previewed import,
- audit note for every manual adjustment.

Do not replace the normal Product editor. Link from each inventory row to the Product and Variant editors for full content work.

## Import/export choice

Payload's official import/export plugin can provide CSV/JSON import/export, preview, update/upsert modes, and admin controls. It is useful for batch catalog loading and backups.

Use it as a controlled data-transfer tool, not the daily counting interface. The Inventory Workspace should remain the simple daily surface.

For this catalog size, synchronous imports are probably sufficient initially; queued jobs add operational complexity. Confirm plugin compatibility with the installed Payload version before adding it.

Payload implementation references:

- [Custom views](https://payloadcms.com/docs/custom-components/custom-views)
- [Collection list views and bulk operations](https://payloadcms.com/docs/custom-components/list-view)
- [Official import/export plugin](https://payloadcms.com/docs/plugins/import-export)

## Reconciliation workflow

For every inventory session:

1. Export or snapshot the current SKU/count table.
2. Enter physical counts in the intake/reconciliation sheet.
3. Jarvis compares expected vs counted and produces a discrepancy report.
4. Neal approves the adjustments.
5. Jarvis applies the batch to Payload.
6. Jarvis reads back every changed SKU and confirms the final totals.
7. Keep an adjustment log with reason: `initial count`, `sale`, `return`, `damage`, `correction`, or `restock`.

Sales decrement automatically. Refunds, returns, damaged items, and manual corrections must never be silently folded together.

## Sister involvement without making her the critical path

Give her a bounded role that takes minutes:

- photograph new items,
- count by labeled SKU,
- flag sold/damaged/restocked pieces,
- approve product names/colors if she wants to participate.

Do not make the project depend on her learning Payload, writing descriptions, or managing variants. If she participates more, good. If not, the operating system still works.

## Build sequence

1. Clean and reconcile the existing live catalog.
2. Build an idempotent CSV validator/importer with dry-run and read-back.
3. Normalize all sellable stock to variants/SKUs.
4. Build the Inventory Workspace MVP.
5. Add printable barcode/QR labels.
6. Add low-stock and discrepancy reporting.
7. Add a controlled digital tag/facet model based on real catalog needs.
