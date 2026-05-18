TASK ID: TASK-004
PHASE: Phase 1
GOAL: Create the `Pages` Payload collection for content pages (About, Our Story, FAQ, policies).

CONTEXT: Phase 1 schema scaffolding. The schema reference says `Pages: slug, title, blocks (array of rich content)`. "blocks" means a Payload `blocks` field with a small set of block types — NOT a single rich text field, and NOT every block type ever invented. Keep it minimal; we can extend later.

FILES TO CREATE OR MODIFY:
- src/collections/Pages.ts — new file.

REQUIREMENTS:
- Fields: `title`, `slug`, `blocks`. (Note: `slug` is in the schema but the field order in the admin should be `title` first.)
- `title`: text, required.
- `slug`: text, required, unique, index. Auto-fill from `title` via a `beforeChange` hook (inline `slugify` helper, same shape as Categories/Products). Description "Auto-fills from the title. Used in the URL."
- `blocks`: `type: 'blocks'`, required, `minRows: 1`. Define exactly TWO block types in the same file:
    1. `richText` block: slug `'richText'`, label "Rich text", single field `content` of type `richText` using `lexicalEditor()` from `@payloadcms/richtext-lexical`.
    2. `image` block: slug `'image'`, label "Image", fields:
       - `image` (upload, relationTo 'media', required)
       - `caption` (text, optional)
       - `alignment` (select: `left` / `center` / `full-width`, default `center`)
  Both block slugs in `kebabCase` or `camelCase` — pick one and use consistently. Document choice in the output notes.
- `admin.useAsTitle: 'title'`. `defaultColumns: ['title', 'slug']`.
- Access: public read, admin-only write.
- No `LOCAL-LLM: DO NOT EDIT` header.

OUT OF SCOPE:
- Do NOT add hero blocks, CTA blocks, product-grid blocks, or any block type beyond `richText` and `image`. We'll add those when there's a real need.
- Do NOT add page status (draft/published) — the whole `Pages` collection is admin-only and changes go live immediately. (If you think this is wrong, flag it in output notes, don't add it.)
- Do NOT edit `src/payload.config.ts`.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- Exactly two block types defined, both with sensible field labels and at least one `admin.description` between them.

OUTPUT NOTES FOR REVIEWER:
- Confirm your block-slug naming choice (`kebab-case` vs `camelCase`).
- Flag any place you considered adding a status field.
