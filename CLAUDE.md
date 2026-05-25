# CLAUDE.md — Nepali Threads Project

> Canonical operational doc for the Nepali Threads e-commerce rebuild. Auto-loaded by Claude Code at the start of every session. Kimi and Gemini should read this first when given a task.

This file is the single source of truth for project conventions, schema, blocklist, and workflow. It supersedes `LLM_PROJECT_CONTEXT.md` (deleted; this file absorbed its content).

---

## What this project is

E-commerce rebuild of nepali-threads.com — a family business selling Nepali clothing run by Neal, his dad, and his sister.

**Stack:** Next.js 15 (App Router) + Payload CMS 3 + Postgres (Neon) + Cloudflare R2 + Stripe + Resend, deployed on Vercel.

**Status (Phase 1 done):** Admin deployed at `nepali-threads-one.vercel.app/admin`. Schema migrated to Neon, all 10 collections (including Pages) live. Direct-to-R2 image uploads working. No real product data entered yet. Phase 2 (storefront) is the active phase.

**Primary admin users:** Neal's dad and sister — non-technical. Admin UX matters more than developer ergonomics. Plain-English field labels, helpful descriptions, draft-by-default, no surprises.

---

## The three-tier coding workflow

Three AI coding tools share work on this project. The roles split by capability and cost, not capability alone.

### Tier 1 — Kimi K2.6 (primary worker)

Lives in: VS Code extension on Neal's MacBook.

Use Kimi for the **majority** of coding work. Kimi K2.6 is an open-weights frontier coding model that benchmarks competitively with GPT-5.5 and Claude Opus 4.6 on SWE-Bench Pro, at ~1/5 the per-token cost. It handles framework-shaped work (Payload collections, React composition, multi-file context) competently.

**Calibration to date:** TASK-004 (Pages collection) executed cleanly — spec adherence tight, conventions followed, blocklist respected, restraint correct. One process miss (Notes for Reviewer not surfaced in the right place — fixed by clarifying placement in this doc). Treat as a capable junior.

Drain Kimi budget first when delegating. Neal will tell us when limits are hit.

### Tier 2 — Gemini 3.1 Pro (fallback worker)

Lives in: terminal via Gemini CLI on Neal's MacBook (or web UI — pick whichever surface is convenient for the task at hand).

Use Gemini when Kimi is exhausted, rate-limited, or specifically a better fit (very-long-context reads across many files, multimodal work involving screenshots / mockups / product photography, tasks where Gemini's reasoning depth shines). Gemini 3.1 Pro is Google's frontier coding-capable model with a ~2M token context window and benchmarks roughly comparable to Kimi K2.6 on SWE-Bench Pro. Strengths: long context, multimodal, careful reasoning. Treat as a capable junior, same as Kimi — same review rules, same blocklist, same commit prefix conventions (`[gemini]` instead of `[kimi]`).

Replaced Codex (GPT-5.5 / ChatGPT Plus) as the Tier 2 worker on 2026-05-24 after Kimi usage tracking confirmed we have ample weekly Kimi budget; the second-tier slot is now better-spent on Gemini's distinct strengths (long context, multimodal) than on a near-Kimi-equivalent fallback.

### Tier 3 — Claude Code (senior reviewer & architect)

You, when reading this. Use sparingly — Claude API tokens are the most expensive line item. Earn your keep by being indispensable on:

- Code review of Kimi/Gemini output before merge
- Security-sensitive work (see Blocklist below) — never delegated
- Architecture and schema decisions
- Debugging tricky problems that Kimi/Gemini got stuck on
- Cross-cutting changes that need multi-file coordination
- Direct work on small tasks where writing a spec would cost more than doing the work yourself
- Wiring junior-produced collections into `payload.config.ts` (which is blocklisted — Kimi/Gemini correctly stop short of it)
- Generating database migrations (`migrations/` is blocklisted)
- Updates to this file (CLAUDE.md is the canonical doc; updates flow through review)

When in doubt about whether to do something directly or hand it off: if the task is in the blocklist, you do it. If the spec would be longer than the code, you do it. Otherwise, write a spec for Kimi.

### Retired — Qwen 2.5-Coder 14B (local, do not revive)

We ran a Phase 1 calibration test with Qwen 14B as a local junior dev. It failed across three Payload collection scaffolds (Categories, Products, ProductVariants) by confidently inventing wrong Payload API shapes (tabs.fields as string arrays, admin.description at the wrong nesting, components passed as React objects instead of string paths). The failure mode was structural reasoning about framework config trees — not fixable by tightening the prompt. Retired May 2026. **Do not suggest reviving it for this project.** It still has uses for ad-hoc questions via Continue.dev, but not as a project workflow contributor.

---

## How to delegate work to Kimi or Gemini

1. **Claude Code writes the task spec** to `tasks/TASK-NNN-<short-name>.md` using the template at the bottom of this doc. Include schema references, conventions, acceptance criteria, and an `OUTPUT NOTES FOR REVIEWER` stanza listing specific decisions you want the worker to surface.

2. **Neal pastes the spec into Kimi (VS Code) or Gemini (terminal / web UI)** along with the instruction to read `CLAUDE.md` first.

3. **Kimi/Gemini produces code** on a `local/TASK-NNN-<short-name>` branch. The `local/` prefix is preserved from the Qwen era for hook compatibility and applies regardless of which worker produced the code.

4. **Kimi/Gemini appends a `## Notes for Reviewer (Kimi)` or `## Notes for Reviewer (Gemini)` section to the bottom of the task spec file** — NOT in the commit message. The spec file is the canonical record of "what was asked, what was decided, what got built." Burying decisions in commit history loses them.

5. **Neal returns to Claude Code** to review the diff.

6. **Claude Code reviews against the spec and this file**: schema adherence, type correctness, conventions, no blocklist violations, admin UX rules. Either approve and merge with a regular merge commit (`--no-ff`), or fix the issues directly (commit as `fix: corrections to <tool> output for <task>`) before merging.

7. **Commit messages** use a worker-prefix that survives review:
   - `[kimi] feat: ...` when Kimi produced the code
   - `[gemini] feat: ...` when Gemini produced the code
   - `[local] feat: ...` is preserved from the Qwen era — don't reuse, but old commits stay
   - Regular `feat:` / `fix:` / `chore:` when Claude Code or Neal worked directly

Don't queue multiple tasks for the same worker in parallel. Review-and-merge one before sending the next.

---

## Blocklist — Claude Code only, never Kimi or Gemini

These files contain payment, auth, or money-math logic. The cost of a confidently-wrong AI output here is real customer money or real security holes. Claude Code does all of this work directly, every time.

- `src/app/api/webhooks/**` — Stripe webhook handlers
- `src/app/api/auth/**` — auth endpoints
- `src/app/api/checkout/**` — Stripe checkout session creation
- `src/lib/stripe/**` — anything Stripe-related
- `src/lib/gift-cards/**` — gift card balance/redemption math
- `src/lib/inventory.ts` — inventory decrement logic
- `src/collections/Users.ts` — admin auth config
- `src/collections/Customers.ts` — customer auth config
- `src/collections/Orders.ts` — order state machine
- `src/collections/GiftCards.ts` — sensitive balance fields
- `src/collections/GiftCardRedemptions.ts` — system-only writes
- `src/components/admin/MoneyField.tsx` — dollars/cents conversion
- `src/payload.config.ts` — Payload root config + uses relative imports for CLI compatibility (see Phase 1 lessons)
- `migrations/**` — database migrations (regenerate via Payload CLI only)
- `patches/**` — patch-package patches to upstream dependencies
- `.env*` — secrets

The canonical machine-readable copy is `.localllm-blocklist` in the repo root. The git `commit-msg` hook blocks any `[kimi]`, `[gemini]`, or `[local]` commit that touches these paths. Note: the hook only fires for commits using one of those prefixes — staying out of these files is the worker's responsibility regardless of commit message.

When a task asks for work that would touch a blocklist file, the worker should output:

```
REFUSED: [one-line reason citing the blocklist or schema lock]
This task should go to the senior reviewer (Claude Code).
```

---

## Tech stack ground rules

- **TypeScript everywhere.** No `.js` files in `src/`. Strict mode on. No `any` without a `// eslint-disable-next-line` comment explaining why.
- **Next.js 15 App Router.** Server Components by default. `'use client'` only when needed (state, effects, browser APIs).
- **Tailwind CSS.** No inline styles. No CSS modules unless explicitly requested.
- **Payload 3.** Collections in `src/collections/`, one file per collection, named + default export, `CollectionConfig` type.
- **Forms:** `react-hook-form` + `zod` for validation. No uncontrolled forms.
- **State:** Zustand for cart (with localStorage persistence). No Redux. No Context for global state unless trivial.
- **Database:** Always through Payload. The only direct-SQL exception is read-only analytics queries.
- **Images:** Next.js `<Image>` for R2-hosted URLs. Upload through Payload admin (direct-to-R2 via signed URLs — Vercel function body limit bypassed).
- **Money:** Stored as integer cents. `MoneyField` component handles dollar↔cents conversion in admin. Stripe webhook receives cents directly, no conversion needed there.

## Code conventions

- **Quotes:** Double quotes for all strings — `"foo"`, not `'foo'`. Applies to imports, string literals, JSX attribute values. Don't mix.
- **Imports order:** (1) external packages, (2) `@/` aliased internal imports, (3) relative imports. Blank line between groups.
- **Path alias:** `@/` maps to `src/`. Exception: `src/payload.config.ts` uses relative imports — see Phase 1 lessons.
- **Naming:**
  - Components: `PascalCase.tsx`
  - Hooks: `useThing.ts`
  - Utilities: `kebab-case.ts`
  - Payload collections: `PascalCase.ts` matching the slug
- **Exports:**
  - Utilities: named exports only.
  - React components and Payload collections: export BOTH a named `const` AND a default. The named export is what other modules import; the default keeps Payload/Next happy. Example:
    ```ts
    export const Categories: CollectionConfig = { ... };
    export default Categories;
    ```
- **Comments:** JSDoc on exported functions. Inline comments only when the *why* isn't obvious.
- **Error handling:** Server-side: throw typed errors, let Next.js error boundaries catch. Client-side: surface plain-English messages, never raw exception text.
- **Async:** `async/await` only. No `.then()` chains.
- **Accessibility:** Every interactive element has an accessible name. `<button>` not `<div onClick>`. Forms have associated labels. Focus-visible rings on all interactive elements.

---

## Payload-specific conventions

This project runs Payload 3.x. Several APIs changed from Payload 2 — follow these explicitly to avoid generating outdated code from training data.

- **Type imports come from `"payload"`, not `"payload/types"`.** The `"payload/types"` path is Payload 2 and is not resolvable in this project. Always:
  ```ts
  import type { CollectionConfig, Field } from "payload";
  ```
- **Single-target relations use a string `relationTo`:**
  ```ts
  { name: "parent", type: "relationship", relationTo: "categories" }
  ```
  The array form (`relationTo: ["categories"]`) is the polymorphic syntax — it's only for fields that can point at multiple different collections, and it changes the on-disk storage to `{ value, relationTo }` objects. If you only target one collection, use the string. Getting this wrong silently breaks downstream queries.
- **Upload fields:** `type: "upload"`, `relationTo: "media"` (string — same rule).
- **Lexical rich text:** `import { lexicalEditor } from "@payloadcms/richtext-lexical"` and set `editor: lexicalEditor()` on the rich-text field config.
- **Tabs layout:** `tabs[].fields` is `Field[]` (full field configs nested inside the tab) — NOT an array of field-name strings referencing fields defined elsewhere. Define the fields directly inside the tab.
- **Custom admin components:** reference by import-path string with optional `#exportName` suffix (e.g. `"@/components/admin/MoneyField"` or `"@/components/admin/MoneyField#MoneyCell"`). The string must also appear as a key in `src/app/(payload)/admin/importMap.js`. Run `npx payload generate:importmap` after adding any new component reference, plugin, or collection.

---

## Storefront UI conventions

These apply to any work building public-facing storefront UI (Phase 2 and beyond). They do NOT apply to Payload admin UI, which has its own rules above.

- **Tailwind v4, CSS-based config.** This project does NOT have a `tailwind.config.ts` / `.js` file. All theme tokens live in CSS via the `@theme` directive in `src/app/(frontend)/globals.css`. Do not create a JS/TS Tailwind config — Tailwind v4 reads tokens from CSS.
- **`@theme` vs `@theme inline`.** Use plain `@theme { ... }` for static values (hex colors, font sizes). Use `@theme inline { ... }` only when the token references a runtime CSS variable (e.g. a `next/font` variable like `var(--font-fraunces)`) — `inline` tells Tailwind to bake the resolved value into utility output instead of emitting a `var()` chain.
- **Token-prefix → utility-class mapping** (Tailwind v4 understands these automatically): `--color-X` → `bg-X` / `text-X` / `border-X`; `--text-X` → `text-X` (font size); `--font-X` → `font-X` (font family); `--spacing-X` → `p-X` / `m-X` / `gap-X`. Use these exact prefixes or the utilities won't generate.
- **Component folder split.** `src/components/ui/` holds storefront primitives (Button, Card, Input, etc.). `src/components/admin/` holds Payload admin-only components (MoneyField, etc.). Don't mix the two — admin components import Payload internals that shouldn't ship to the storefront bundle.
- **No new npm dependencies without approval.** UI primitive work doesn't need `clsx`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, Radix, etc. Write a 5-line inline `cx` helper if you need one, and use inline `<svg>` for icons/spinners. If a task genuinely needs a new dep, flag it in your output notes — don't add it unilaterally.
- **Light mode only through Phase 2.** No `prefers-color-scheme: dark` blocks, no `dark:` utility classes. The Next default scaffolding included a dark-mode media query in `globals.css` — remove it when you first touch that file.
- **React 19 ref idiom.** This project is on React 19 (`react: 19.1.0`). Pass `ref` as a regular prop (`ref?: React.Ref<HTMLElement>`) — do NOT use `React.forwardRef`, which is being phased out. New components should follow the React 19 pattern from day one.
- **Server Components by default.** Add `"use client"` only when a file genuinely needs it: state hooks, effects, event handlers from consumers, or browser-only APIs. A primitive that accepts `onClick` from a consumer needs `"use client"` at the top.
- **Tone in UI copy.** Confident but warm. Never corporate. "Add to cart" not "Submit purchase." "Sold out" not "Inventory exhausted." Match the artisan/mission-forward brand voice across labels, empty states, and error messages.
- **`className` on compound primitives applies to the OUTER wrapper.** Primitives that render a single element (Button → `<button>`, Card → `<div>`, Badge → `<span>`, Image → outer `<div>`) take `className` on that element. Primitives that render a wrapper + nested element(s) — currently just Input (wrapper + label + input + hint/error) — take `className` on the outer wrapper, because that's what consumers usually want to control (flex/grid layout, margin, max-width). For styling the inner element on a compound primitive, add an explicit `inner...ClassName` escape hatch (e.g. Input's `inputClassName`). Do not silently route `className` to the inner element when the wrapper exists — that breaks layout expectations.

---

## Reference implementation — `Categories` collection

This is what a finished, post-review collection looks like in this repo. **Match this shape exactly** when scaffolding new collections — copy the structure, swap the field list. Patterns to mimic: import path, label block, access block, slug helper + `beforeChange` hook, named-and-default export, plain-English `admin.description` on every non-obvious field.

```ts
// src/collections/Categories.ts

import type { CollectionConfig } from "payload";
// ↑ Import from "payload". The path "payload/types" is Payload 2 and does NOT resolve in this project.

const slugify = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
// ↑ File-local helper. Duplicate per collection for now — do NOT extract to a shared utility.
//   Phase 4 will consolidate once the pattern is settled.

export const Categories: CollectionConfig = {
  slug: "categories",
  labels: {
    singular: "Category",
    plural: "Categories",
  },
  // ↑ Always set labels explicitly. Payload's default pluralization produces things like "Categorys".
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "parent"],
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.collection === "users",
    update: ({ req }) => req.user?.collection === "users",
    delete: ({ req }) => req.user?.collection === "users",
  },
  // ↑ Public read so the storefront can list without auth.
  //   Writes gated on the admin Users collection (NOT Customers — req.user?.collection === "users").
  hooks: {
    beforeChange: [
      ({ data }) => {
        if (!data.slug && data.name) {
          data.slug = slugify(data.name);
        }
        return data;
      },
    ],
  },
  // ↑ Auto-fill slug only when missing. Never overwrite a slug the admin has explicitly set.
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      index: true,
      admin: {
        description:
          "Auto-fills from the name. Only edit if you know what you're doing.",
      },
    },
    // ↑ admin.description is plain-English help text for dad/sister, NOT a developer comment.
    {
      name: "description",
      type: "textarea",
      admin: {
        description: "Short blurb shown on the category page.",
      },
    },
    // ↑ textarea, NOT richText — category copy is short and doesn't need lexical.
    {
      name: "image",
      type: "upload",
      relationTo: "media",
      label: "Hero image",
      admin: {
        description: "Shown at the top of the category page.",
      },
    },
    // ↑ relationTo is a STRING for single-target uploads. The array form is polymorphic
    //   and changes on-disk storage — getting this wrong silently breaks queries.
    {
      name: "parent",
      type: "relationship",
      relationTo: "categories",
      admin: {
        description:
          "Leave blank for top-level categories. Pick a parent to nest this one under it.",
      },
    },
    // ↑ Self-referential relation — relationTo points back at this collection's own slug.
  ],
};

export default Categories;
// ↑ Both named AND default export. Other modules import the named one;
//   Payload/Next pick up the default.
```

When scaffolding a new collection, the diff from this file should be small and obvious: collection slug, label strings, field list. The boilerplate (imports, slugify helper, labels block, access block, beforeChange hook, export shape) stays identical.

---

## Formatting and post-processing

Worker output is run through Prettier before review. Don't burn cycles getting whitespace, line wrapping, or trailing commas exactly right — formatting drift is corrected automatically. Focus attention on:

- **Correctness** — types compile, fields match the schema reference, imports resolve.
- **Convention** — file structure mirrors the reference implementation above.
- **Quote style** — Prettier in this project is configured for double quotes. Emit double quotes if you can — it makes the pre-format diff easier to read.

Do NOT spend output tokens on a self-formatted "pretty" version. Compact-but-correct beats hand-wrapped-but-wrong.

---

## Schema reference (locked Phase 1)

Source of truth. Don't invent fields. If a field is needed that isn't here, output a TODO comment and surface it in the Notes for Reviewer section.

**Categories:** name, slug, description, image, parent (self-relation, optional)

**Products:** name, slug, description (rich text), category (relation), basePrice (cents), featured (boolean, labelled "Show on homepage"), status (enum: draft/published/archived), images (array, optional), seoTitle, seoDescription, seoImage. SEO fields live in a collapsed second tab.

**ProductVariants:** *(OPTIONAL — most products are one-size-fits-all and have zero variants)* product (relation), size, color, sku (unique), price (optional cents override), inventoryCount, images (array, optional — falls back to product images).

Rendering rules:
- Zero variants → show `basePrice` + "Add to cart" button, no size/variant selector. "One size, fits everyone" is a brand pillar.
- One or more variants → render variant selector, use chosen variant's price/SKU/inventory.

**Customers** *(auth-enabled — blocklisted)*: email, name, addresses (array), stripeCustomerId, newsletterOptIn, createdAt

**Orders** *(blocklisted)*: customer (relation, nullable), guestEmail, lineItems (array with snapshotted name/SKU/price), subtotal/tax/shipping/giftCardDiscount/total (all cents), shippingAddress, billingAddress, stripePaymentIntentId, status, trackingNumber, carrier, fulfillmentStatus. Orders are never deleted; `delete: () => false`.

**GiftCards** *(blocklisted)*: code (unique), initialValue, currentBalance (read-only in admin), purchaser (relation, nullable), recipientEmail, recipientName, message, deliveryDate, expiresAt, status

**GiftCardRedemptions** *(blocklisted, system-only)*: giftCard (relation), order (relation), amountUsed, timestamp. Hidden from non-super-admins.

**Pages:** title, slug, blocks (array of `richText` + `image` block types). Block slugs use camelCase. No status field — pages go live on save.

**Users** *(blocklisted)*: email, name, role (enum: super-admin/admin/viewer)

**Media:** Standard Payload upload collection. Uses S3 storage plugin pointing at R2 with `clientUploads: true` (signed URL direct uploads bypass Vercel's 4.5MB function body limit).

---

## Admin UX requirements

Dad and sister are the primary admin users. Optimize for them, not for developer ergonomics.

When scaffolding a collection, apply these rules unless the task says otherwise:

- **Plain-English `label`s.** Field labels read like a form a human would fill out, not a database column. `"Price (USD)"` not `"Base Price"`. `"Photos"` not `"Images Array"`. `"Show on homepage"` not `"Featured"`.
- **`admin.description` help text** on any field whose purpose isn't obvious from its label. Keep it to one sentence.
- **Group SEO fields into a collapsed tab** (`type: "tabs"`, with the SEO tab `description: "Optional — leave blank if you're not sure"`). Don't put SEO fields inline with primary content.
- **Sensible defaults.** `status` defaults to `"draft"`. New products are never published by accident.
- **Auto-slug from name** via a `beforeChange` hook. The slug field is editable so admins can override for SEO purposes.
- **Field order** on the primary tab: Name → Description → Price → Category → Photos → toggles → Status. Most-frequently-edited fields at the top.
- **Required fields minimal.** Name, category, price, status only. Description and Photos optional so drafts can save with as little as a name.
- **Capitalize option labels, lowercase stored values.** `status` options: `"Draft"`, `"Published"`, `"Archived"` in the dropdown; `"draft"`, `"published"`, `"archived"` in the DB.
- **For photo arrays**, set `admin.description: "Drag to reorder. First photo is the main image."`

These rules apply to content collections (Products, Categories, Pages, GiftCards admin view, ProductVariants). They do NOT apply to Users or Customers (auth-only) or internal system collections.

---

## Money fields

All monetary values are stored as **integer cents** (e.g. $25.00 → `2500`). Matches Stripe's API and avoids floating-point precision bugs.

For any `type: "number"` field representing money, attach the `MoneyField` admin component so admins see and enter dollars while the DB stores cents:

```ts
{
  name: "basePrice",
  type: "number",
  required: true,
  min: 0,
  label: "Price (USD)",
  admin: {
    description: "Stored as integer cents.",
    components: {
      Field: "@/components/admin/MoneyField",
      Cell: "@/components/admin/MoneyField#MoneyCell",
    },
  },
}
```

Fields that must use this pattern: `Products.basePrice`, `ProductVariants.price`, `Orders.subtotal` / `tax` / `shipping` / `giftCardDiscount` / `total`, `Orders.lineItems.priceAtPurchase`, `GiftCards.initialValue` / `currentBalance`, `GiftCardRedemptions.amountUsed`.

API consumers (storefront, webhooks) see cents directly — no conversion on the wire. The MoneyField component is admin-UI-only and is in the blocklist; don't reimplement the conversion math elsewhere.

---

## Task input format

Tasks come in this shape:

```
TASK ID: TASK-NNN
PHASE: Phase 2
GOAL: One sentence describing the outcome.

CONTEXT: Why this task exists in 1-2 sentences.

FILES TO CREATE OR MODIFY:
- src/path/to/file.tsx — purpose
- src/path/to/other.ts — purpose

REQUIREMENTS:
- Bullet points, concrete and testable.
- Reference existing files or patterns when applicable.

OUT OF SCOPE:
- Things not to touch.

ACCEPTANCE:
- What "done" looks like.

OUTPUT NOTES FOR REVIEWER:
- Specific decisions or trade-offs the reviewer should hear about.
```

---

## Output format

For every task, produce:

1. **A one-line summary** at the top: what you did, in plain English.
2. **The code**, one fenced block per file, with the file path as a comment on the first line:
   ```tsx
   // src/components/ProductCard.tsx
   ...code...
   ```
3. **Notes for the reviewer** — these do NOT go in your response body or commit message. Instead, append a section to the bottom of the task spec file (`tasks/TASK-NNN-*.md`) on the same branch as your code changes, under a heading that names you:

   ```markdown
   ## Notes for Reviewer (Kimi)
   ```

   or

   ```markdown
   ## Notes for Reviewer (Gemini)
   ```

   The spec file is the canonical record of "what was asked, what was decided, what got built." Putting notes there keeps decisions alongside the spec they relate to, instead of buried in commit history. Cover:
   - Anything you weren't sure about (with the line number)
   - Any blocklist files this task came close to (and why you stayed out)
   - Any test cases the reviewer should run
   - Answers to the prompts from the spec's `OUTPUT NOTES FOR REVIEWER` stanza

Do not include preamble, apologies, or "Sure, here's...". Start with the summary line.

---

## Task template (copy this for each new task)

```
TASK ID: TASK-NNN
PHASE: [0/1/2/3/4/5]
GOAL: 

CONTEXT: 

FILES TO CREATE OR MODIFY:
- 

REQUIREMENTS:
- 

OUT OF SCOPE:
- 

ACCEPTANCE:
- 

OUTPUT NOTES FOR REVIEWER:
- List specific decisions or trade-offs the reviewer should hear about
  (e.g. "confirm your block-slug naming choice", "flag any place you
  considered adding X"). When the task is finished, append your answers
  to the bottom of this same file under `## Notes for Reviewer (Kimi)`
  or `## Notes for Reviewer (Gemini)` — see CLAUDE.md "Output format".
```

---

## Phase 1 lessons (preserve forever, do not "fix")

Things that look weird but are intentional. Future sessions should not "improve" these without reading the explanation first.

### `patches/payload+3.84.1.patch`

Payload's `node_modules/payload/dist/bin/loadEnv.js` has a CJS interop bug that breaks the CLI on Node 24+. The patch swaps `import nextEnvImport from '@next/env'; const { loadEnvConfig } = nextEnvImport;` for `const { loadEnvConfig } = createRequire(import.meta.url)('@next/env');`. Auto-applies via `postinstall` script. Don't remove until Payload upstream ships the fix.

### `src/payload.config.ts` uses relative imports

Every other file in `src/` uses `@/collections/...`. This one uses `./collections/...`. Reason: the Payload CLI (`npx payload migrate`, `npx payload generate:importmap`) runs outside Next.js's bundler and can't resolve the `@/*` alias. Don't change this back without first solving the CLI alias resolution problem.

### `"type": "module"` in package.json is load-bearing

Without it, Node treats `.ts` files as CJS, sync-requires the import graph, and chokes on top-level await in `@lexical/headless/html/table`. Keep it.

### `src/app/(payload)/admin/importMap.js` is auto-generated

Run `npx payload generate:importmap` after adding any new collection, custom admin component, or Payload plugin. Don't hand-edit. The file has a header comment saying so.

### Next overridden to 15.5.18 despite Payload's <15.5.0 peer

`@payloadcms/next@3.84.1` (latest stable) peers on `>=15.4.11 <15.5.0`,
so the original pin was `~15.4` (memory: nextjs-version-pin). In May 2026
that resolved to 15.4.11. By then, eight high-severity advisories had
accumulated against Next (CVSS 7.5–8.6 — App Router middleware bypass,
Server Component DoS, SSRF via WebSocket upgrades, segment-prefetch
bypass, dynamic-route-param injection, etc.), all requiring 15.5.16+ to
fix. No 15.4.x patch was ever released — 15.4.11 is the final 15.4.

We chose to override Next to 15.5.18 via `package.json` `overrides`,
bumping the direct dep to `~15.5.18` and forcing transitive resolution
to the same version. Payload's peer-dep warning fires on install but is
advisory — actual API compatibility between Payload 3.84.1 and Next
15.5.x is intact (build clean, /admin renders at expected bundle size).
If Payload-admin runtime behavior changes after deploy, this override
is the first thing to suspect.

Bump path going forward:
- Continue to update Next within 15.5.x as patches drop (the `~15.5.18`
  spec auto-takes patch-level updates).
- When Payload 4.x ships stable with a Next 15.5/16 peer range, switch
  back to a Payload-blessed Next and remove the override.

### `push: true` was removed from postgresAdapter

It was a workaround for migrations not working from CLI. Now that migrations work (via the patches/ fix above), push is off. Migrations are how schema changes happen going forward.

### Money is stored as integer cents everywhere

`MoneyField` component handles dollars↔cents conversion in admin. Don't switch back to decimal/float. Stripe webhook receives cents directly.

### `delete: () => false` on Orders

Orders are never deleted, only refunded or cancelled. Permanent audit trail.

### Direct-to-R2 image uploads via signed URLs

Vercel functions have a 4.5MB body limit. Big images would fail to upload through Vercel. Solution: `clientUploads: true` on the S3 storage plugin, CORS configured on the R2 bucket to allow PUTs from the production origin and localhost. Dad and sister upload full-res photos without thinking about it.

### Block slugs in Pages collection use camelCase

Pages uses `blocks` field type with two block slugs: `richText` and `image`. Picked camelCase over kebab-case to match Payload's internal convention. Stay consistent if adding new block types.

### Qwen experiment retrospective

We tried Qwen 2.5-Coder 14B as a local junior dev for Phase 1 collection scaffolding. It failed: confidently invented wrong Payload API shapes on three out of three tries. Cost more time to review and fix than to write from scratch. Calibrated learning, not wasted: bigger lesson is that small open code models (≤14B) in 2026 still can't handle framework-shaped config-tree composition. Documented in the git log under TASK-001 through TASK-003. Don't revive without significant hardware change (e.g., the 32B class via 24GB+ VRAM).

### TASK-004 (Pages) calibration

First Kimi task on the new workflow. Output was clean: spec adherence tight, conventions followed, blocklist respected (correctly refused to touch `payload.config.ts`). One process miss — Notes for Reviewer landed in the chat response rather than in the task spec file. Fixed by clarifying placement in the "Output format" section of this doc. Treat Kimi as a capable junior worker for framework-shaped tasks going forward.

---

## Project state at this moment

- **Phase 0:** Done — accounts, infrastructure setup
- **Phase 1:** Done — repo, schema (all 10 collections), Vercel deployment, R2 working, direct-upload pipeline
- **Phase 2:** Active — storefront (design tokens → primitives → layouts → pages → cart → customer auth)
- **Phase 3:** Not started — checkout, Stripe webhooks, gift cards
- **Phase 4:** Not started — polish, custom domain cutover, launch prep
- **Phase 5:** Not started — post-launch

Strategic plan and per-phase execution docs live in Obsidian at `~/Neal Brain/05 Coding Projects/Nepali-Threads Rebuild/`. The local LLM workflow doc in that folder describes the now-retired Qwen workflow and is stale; flag for archive or update next time Neal asks about workflow docs.

---

## Default behaviour when given a task

1. **Read this file** if you haven't this session.
2. **Determine if it's blocklisted.** If yes, you (Claude Code) do it directly. No delegation.
3. **Determine if it's small.** If a one-file, ≤30-line change where the spec would be as long as the code, you do it directly.
4. **Determine if it's architecture/security-shaped.** If yes, you do it directly.
5. **Otherwise, write a task spec for Kimi.** Place in `tasks/TASK-NNN-<short-name>.md`. Tell Neal you've written a spec, give him the path, and let him decide whether to send it to Kimi or Gemini (or do it directly if he prefers).
6. **When Neal returns with worker output for review,** review against the spec and this file's conventions. Approve and merge, fix and merge, or reject with notes.

Bias toward doing work yourself for small things. The overhead of writing a spec, reviewing output, and possibly fixing it can easily exceed the cost of just writing the code directly. The orchestration workflow shines on volume (lots of similar components, repetitive transformations, bulk scaffolding) — not on one-offs.

---

## When this file should be updated

After every phase completes, or whenever something is learned that future sessions need to know but won't infer from the codebase alone. Don't bury new lessons in commit messages — they belong here. Updates flow through Claude Code (this file is effectively blocklisted from worker edits since it's the source of truth they read).
