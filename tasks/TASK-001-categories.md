TASK ID: TASK-001
PHASE: Phase 1
GOAL: Create the `Categories` Payload collection per the schema reference, with admin-friendly UX.

CONTEXT: Phase 1 schema scaffolding. `Categories` is referenced by `Products.category` and must exist before TASK-002 can compile. There is no existing Categories.ts.

FILES TO CREATE OR MODIFY:
- src/collections/Categories.ts — new file, default export, matches the pattern in src/collections/Media.ts

REQUIREMENTS:
- Slug: `categories`. Type `CollectionConfig` from `payload`.
- Fields per schema reference (LLM_PROJECT_CONTEXT.md): `name`, `slug`, `description`, `image`, `parent`. No other fields.
- `name`: text, required.
- `slug`: text, required, unique, index. Auto-fill from `name` on save via a `beforeChange` hook in the same file: `if (!data.slug && data.name) data.slug = slugify(data.name)`. Implement a small `slugify` helper inside this file: lowercase, replace non-`a-z0-9` runs with `-`, trim leading/trailing `-`. Admin: `readOnly: false`, description: `"Auto-fills from the name. Only edit if you know what you're doing."`
- `description`: textarea (NOT rich text — keep it simple for category copy).
- `image`: upload field, `relationTo: 'media'`, label "Hero image", optional, description `"Shown at the top of the category page."`
- `parent`: relationship to `categories` (self), optional, description `"Leave blank for top-level categories. Pick a parent to nest this one under it."`
- `admin.useAsTitle: 'name'`. `defaultColumns: ['name','slug','parent']`.
- Apply admin UX conventions from LLM_PROJECT_CONTEXT.md: plain-English labels (e.g. label `image` as `"Hero image"`), `admin.description` help text on every field.
- Access: public read (so the storefront can list categories without auth), admin-only create/update/delete. Use `req.user?.collection === 'users'` for admin checks.

OUT OF SCOPE:
- Do NOT edit `src/payload.config.ts` — Claude Code wires the collection in post-review.
- Do NOT add fields beyond what's listed in the schema reference.
- Do NOT add a `LOCAL-LLM: DO NOT EDIT` header — this is a content collection.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- The file matches the conventions in `LLM_PROJECT_CONTEXT.md` (TypeScript, default export, named export, no `any` without justification).
- Schema fields match the reference exactly; no inventions.

OUTPUT NOTES FOR REVIEWER:
- If you weren't sure whether to use `textarea` vs `richText` for `description`, you picked `textarea`.
- If you weren't sure about the slugify edge cases (unicode, leading numbers), flag the assumption.
