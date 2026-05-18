TASK ID: TASK-003
PHASE: Phase 1
GOAL: Replace the placeholder `ProductVariants` collection with the full schema. Variants are OPTIONAL — most products have zero variants.

CONTEXT: Phase 1 schema scaffolding. Variants exist for the rare future product that comes in multiple sizes or colours. The current `src/collections/ProductVariants.ts` is a placeholder. Products (TASK-002) must already be fleshed out. Read the "ProductVariants" entry and rendering rules in `LLM_PROJECT_CONTEXT.md` — "no variant selector when zero variants" is a brand pillar.

FILES TO CREATE OR MODIFY:
- src/collections/ProductVariants.ts — replace contents entirely.

REQUIREMENTS:
- Fields per schema reference: `product`, `size`, `color`, `sku`, `price` (optional), `inventoryCount`, `images` (array, optional). No other fields.
- `product`: `type: 'relationship'`, `relationTo: 'products'`, required.
- `size`: text, optional, label "Size", description "e.g. S, M, L, XL — leave blank if this variant isn't size-specific."
- `color`: text, optional, label "Color".
- `sku`: text, required, unique, index. Label "SKU". Description "Inventory code for this specific variant."
- `price`: integer cents, OPTIONAL. Label "Price override (USD)". `min: 0`. Wire `MoneyField` + `MoneyCell` per LLM_PROJECT_CONTEXT.md "Money fields". Description: "Optional. If set, this overrides the product's base price for this variant. Stored as integer cents."
- `inventoryCount`: number, required, `min: 0`, defaultValue 0. Label "Inventory". Description "How many of this variant we have on hand."
- `images`: array of `upload` to `media`, OPTIONAL (no `minRows`, no `required`). Description: "Optional. Falls back to the product's main photos if blank."
- `admin.useAsTitle: 'sku'`. `defaultColumns: ['sku', 'product', 'size', 'color', 'inventoryCount', 'price']`.
- Access: public read, admin-only write.
- No `LOCAL-LLM: DO NOT EDIT` header.

OUT OF SCOPE:
- Do NOT add validation that says "a product must have at least one variant." The whole point of this schema is that zero variants is the common case.
- Do NOT edit `Products.ts` to add a variants relation back — Payload finds the relation automatically via the `product` field.
- Do NOT edit `src/payload.config.ts`.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- Schema fields match the reference exactly.
- The collection works when a product has zero variants of it (no `minRows` on variant arrays, no required-anywhere-back-reference).

OUTPUT NOTES FOR REVIEWER:
- Note any field where you weren't sure if "optional" meant `required: false` (the default) or something stronger.
