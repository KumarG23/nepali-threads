TASK ID: TASK-006
PHASE: Phase 2
GOAL: Establish the brand design tokens (colors, typography, spacing) in the Tailwind v4 CSS theme, then build a `Button` primitive that uses them. This is the foundation every other Phase 2 storefront component will sit on, so the choices made here propagate.

CONTEXT:
Brand decisions from Phase 0 set the tone as artisan / mission-forward with a Red + Gold palette. Reasoning: the source product photos (`public/migrated-product-images/store photos/`) read warmer and more handmade against deep red and antique gold than against a navy-based palette. Neal can override the palette in implementation if he disagrees — flag it in your output notes if so.

Target feel:
- **Primary:** warm deep red — oxblood / brick-leaning, not fire-engine red. Should feel like something dyed by hand, not extruded plastic.
- **Accent:** muted antique gold — matte and aged, not metallic, not neon. Think old book gilding, not Vegas.
- **Neutrals:** warm off-whites (cream-leaning, not cool gray-white) and soft charcoals (slightly warm, not pure black).
- **UI copy tone everywhere:** confident but warm. Never corporate.

Important stack note: this project uses **Tailwind v4**, which has **no `tailwind.config.ts`**. All theme tokens live in CSS via the `@theme` directive in `src/app/(frontend)/globals.css`. The existing file already has an `@theme inline { ... }` block scaffolded with Geist fonts — extend that block, don't create a JS/TS config file.

FILES TO CREATE OR MODIFY:
- `src/app/(frontend)/globals.css` — extend the existing `@theme inline { ... }` block with brand color scales, typography tokens, and any custom spacing. Remove the placeholder dark-mode `@media` block and the hardcoded `font-family: Arial, Helvetica, sans-serif;` on `body` — both are Next scaffolding leftovers. Phase 2 is light-mode only.
- `src/app/(frontend)/layout.tsx` — replace `Geist` / `Geist_Mono` from `next/font/google` with the chosen serif + sans pairing. Expose them as CSS variables (`--font-serif`, `--font-sans`) so the `@theme` block can wire them to `--font-display` / `--font-body` or similar. Update the `body` className accordingly. Keep `lang="en"` and the metadata.
- `src/components/ui/Button.tsx` — new file, new folder. The `ui/` namespace is reserved for storefront primitives (distinct from `src/components/admin/`, which is admin-only).
- `src/app/(frontend)/design-test/page.tsx` — new file. Renders all variants × sizes × states for visual eyeball review. This page will be deleted once the design system stabilizes — leave a comment at the top: `// TEMP: design-system smoke test page, delete once primitives are stable.`

REQUIREMENTS:

**1. Color tokens.**
- Define two custom color scales in `@theme inline { ... }`: `--color-brand-red-50` through `--color-brand-red-900` and `--color-brand-gold-50` through `--color-brand-gold-900`. Nine stops each (50, 100, 200, 300, 400, 500, 600, 700, 800, 900) so utility classes like `bg-brand-red-600` / `text-brand-gold-400` Just Work.
- Also define warm neutrals: `--color-neutral-cream` (the off-white background) and `--color-neutral-ink` (the warm dark text color). One value each, not full scales — these are anchors, not ramps.
- Pick the exact hex values yourself. They should feel artisan and intentional, not "default Tailwind blue" generic. The 600 stop on each scale is the canonical brand color (used for primary buttons, accents). Use the 50–200 range for backgrounds/tints and the 700–900 range for hover/active darkening.
- Add a brief CSS comment above the color block explaining the rationale for the 600-stop values — what each one is *meant* to evoke. One sentence per scale is enough.

**2. Typography.**
- One serif for display/headings: **Fraunces** is the recommended default — it has artisan character without being twee. If you pick something else (e.g. Cormorant, Lora, Playfair), justify it in output notes.
- One sans for body/UI: **Inter** is the recommended default — neutral and reliable. If you pick something else, justify it in output notes.
- Wire both via `next/font/google` in `layout.tsx`. Use `subsets: ["latin"]`. Expose each as a CSS custom property via the `variable` option, and reference those variables in the `@theme` block.
- Define a small type scale in `@theme inline { ... }`: `--text-display`, `--text-h1`, `--text-h2`, `--text-h3`, `--text-body` (default), `--text-small`. Pick sensible sizes — fluid sizing via `clamp()` is welcome but not required. Keep it minimal; we'll extend later.
- Body text should use the sans by default. Headings should use the serif. Wire this through the `body` element and a global `h1, h2, h3 { font-family: var(--font-serif); }` rule (or equivalent Tailwind-v4 idiom).

**3. Spacing.**
- Tailwind v4's default spacing scale is already good. **Do not** override it unless you have a specific brand-driven reason. If you add custom spacing tokens, justify them in output notes — otherwise leave defaults alone. (The "boring choice" applies here.)

**4. Button component.**
- File: `src/components/ui/Button.tsx`. Default export a `Button` React component.
- Render a real `<button>` element. Forward `ref` via `React.forwardRef`. Accept and spread all native `<button>` props.
- Variants (`variant` prop): `"primary"` (filled red — `bg-brand-red-600 text-neutral-cream`, darkens on hover), `"secondary"` (transparent background, `border` + `text-brand-red-600`, fills on hover), `"ghost"` (no border, transparent background, hover applies a subtle tinted background like `bg-brand-red-50`). Default: `"primary"`.
- Sizes (`size` prop): `"sm"`, `"md"`, `"lg"`. Default: `"md"`. Each size controls padding, font size (use the type scale tokens), and minimum height. The `md` size should feel like a comfortable touch target (~40px min-height); `sm` is for inline/compact uses; `lg` is for hero CTAs.
- States to implement:
  - **default / hover / active:** covered via Tailwind utility classes.
  - **disabled:** when the `disabled` prop is `true`, apply `aria-disabled` semantics + visual dim (reduced opacity, `cursor-not-allowed`). Don't fight the native HTML — let `<button disabled>` do its job.
  - **loading:** new `loading?: boolean` prop. When `true`: render a spinner alongside (or replacing) the label, set `aria-busy="true"`, and behave as disabled (don't fire `onClick`). Children stay visible but dimmed, with the spinner inline. Use an inline `<svg>` spinner — **do not add a spinner library or dependency.**
- Accessibility:
  - `focus-visible:` ring using `--color-brand-gold-400` or similar — visible against both light and tinted backgrounds.
  - Keyboard navigable (real `<button>` handles this for free).
  - `aria-busy` when loading; `aria-disabled` when disabled.
- Prop API style: **single variant prop pattern** (`variant: "primary" | "secondary" | "ghost"`, `size: "sm" | "md" | "lg"`). Don't reach for a discriminated union here — a button with 3 variants × 3 sizes × a couple of boolean states doesn't need one. Keep it boring.
- **No new dependencies.** If you need a className-join utility, write a 5-line `cx` helper inline at the top of the file (`function cx(...args: (string | false | undefined)[])`). Do not install `clsx`, `class-variance-authority`, `tailwind-merge`, etc.

**5. Design test page.**
- File: `src/app/(frontend)/design-test/page.tsx`. Server component. Renders a grid showing every (`variant` × `size`) combination, plus rows demonstrating disabled and loading states for each variant at `md` size.
- Use brand-cream background, brand-ink text, and the new serif/sans fonts — this page should *look* like the design system, not look like an unstyled test fixture.
- Include a short heading at the top (display-size serif) and a one-line caption under it (`text-small` sans).
- Lead the file with the deletion comment: `// TEMP: design-system smoke test page, delete once primitives are stable.`

OUT OF SCOPE:
- Do not build other primitives (Card, Input, Link, Badge, etc.). Those are separate tasks.
- Do not add any actual storefront page content (homepage, product cards, etc.) beyond `/design-test`.
- Do not touch any blocklisted files. In particular: `src/payload.config.ts`, anything under `src/app/api/`, anything under `migrations/`. (Full list in CLAUDE.md.) None of this task's work should go near them.
- Do not add a dark-mode variant. Phase 2 is light-only.
- Do not install new npm dependencies.
- Do not create a `tailwind.config.ts` file. Tailwind v4 does not use one in this project.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- After deploy, visiting `/design-test` shows: a heading in the chosen serif, a caption in the chosen sans, and a grid where all three variants × three sizes render with visible color/typography differences. Disabled and loading states are visually distinct from default.
- Colors look intentionally artisan (warm deep red, muted antique gold, warm neutrals) — not "I picked the first hex codes from Tailwind defaults."
- Typography pairing reads as artisan / mission-forward — not corporate, not cute.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- List the exact hex values you chose for `brand-red-600`, `brand-gold-600`, `neutral-cream`, and `neutral-ink`. Briefly explain why those four anchor values feel artisan to you. (The 50/100/.../900 stops can be summarized — "ramped from the 600 anchor by adjusting lightness in OKLCH" or similar.)
- State the font pairing you shipped. If you considered alternatives and rejected them, name one or two and why.
- Flag any place you were uncertain about the variant naming or prop API — anything you'd want a second opinion on.
- Note whether you ended up adding any custom spacing tokens (and why), or left Tailwind defaults intact.
- Confirm you did not touch any blocklisted paths.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".
