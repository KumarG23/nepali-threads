TASK ID: TASK-002
PHASE: Phase 1
GOAL: Replace the placeholder `Products` collection with the full schema-locked definition, with admin UX optimised for dad and sister.

CONTEXT: Phase 1 schema scaffolding. The current `src/collections/Products.ts` is a one-field placeholder kept only so `Orders.lineItems.product` had a valid target. This task replaces it. Categories must already exist (TASK-001). Money is stored as integer cents — use the `MoneyField` admin component pattern documented in LLM_PROJECT_CONTEXT.md "Money fields".

FILES TO CREATE OR MODIFY:
- src/collections/Products.ts — replace contents entirely.

REQUIREMENTS:
- Fields per schema reference: `name`, `slug`, `description` (rich text), `category` (relation), `basePrice`, `featured`, `status`, `images` (array, REQUIRED on the product itself), `seoTitle`, `seoDescription`, `seoImage`. No other fields.
- `name`: text, required.
- `slug`: text, required, unique, index. Auto-fill from `name` via a `beforeChange` hook (you may copy the `slugify` helper from `Categories.ts` — same shape, but DON'T export a shared helper, just duplicate it inline for now).
- `description`: rich text using `lexicalEditor()` from `@payloadcms/richtext-lexical`.
- `category`: `type: 'relationship'`, `relationTo: 'categories'`, required.
- `basePrice`: integer cents stored in DB. Label "Price (USD)". REQUIRED. `min: 0`. Wire `MoneyField` + `MoneyCell` exactly as shown in LLM_PROJECT_CONTEXT.md "Money fields" section. Description: "Stored as integer cents."
- `featured`: checkbox. Label "Show on homepage". Default false.
- `status`: select with options Draft / Published / Archived (values `draft`, `published`, `archived`). Required, default `draft`.
- `images`: array of `image` uploads (`type: 'upload'`, `relationTo: 'media'`). `minRows: 1`, required. Description: "Drag to reorder. First photo is the main image."
- SEO fields (`seoTitle`, `seoDescription`, `seoImage`) MUST live inside a `type: 'tabs'` layout with a second tab labelled "SEO" that has `description: "Optional — leave blank if you're not sure"`. The PRIMARY tab (labelled "Content") holds, IN THIS ORDER: name, description, basePrice, category, images, featured, status.
- `admin.useAsTitle: 'name'`. `defaultColumns: ['name', 'category', 'basePrice', 'status', 'featured']`.
- Access: public read, admin-only write (`req.user?.collection === 'users'`).
- No `LOCAL-LLM: DO NOT EDIT` header — this is a content collection.

OUT OF SCOPE:
- Do NOT add `ProductVariants` to this file — that's TASK-003.
- Do NOT edit `src/payload.config.ts`.
- Do NOT add inventory, pricing tiers, attributes, tags, or any field not in the schema reference.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0 and prints no `invalid relationship` warnings.
- All 10 schema fields are present, none extra.
- SEO tab is collapsed by default (separate tab, not inline).

OUTPUT NOTES FOR REVIEWER:
- Confirm where you put the slugify helper (inline copy vs shared).
- Flag any decision you made about default values that weren't specified.
