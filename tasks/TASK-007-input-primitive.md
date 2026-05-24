TASK ID: TASK-007
PHASE: Phase 2
GOAL: Build an `Input` primitive at `src/components/ui/Input.tsx` — the third storefront component on top of the design tokens. Input is the first form primitive; the patterns it establishes (label association, error state, hint text, focus ring) will be reused by Textarea, Select, and other form components later.

CONTEXT:
TASK-005 landed tokens + Button. TASK-006 landed Card. Both are on `main` and `/design-test` shows them rendering. Input is next because the homepage will need a search field soon and any future form (newsletter signup, account, contact) reuses the same label/hint/error pattern.

Keep Input focused on a single `<input>` element with a label, hint, and error story. Do NOT generalize this into a generic "FormField" or build Textarea/Select inside the same task. Each form primitive gets its own file and its own task.

FILES TO CREATE OR MODIFY:
- `src/components/ui/Input.tsx` — new file. Sibling of `Button.tsx` and `Card.tsx`. **Add `"use client";` as the first line** — Input handles `onChange`, `onFocus`, `onBlur` and is intended to receive client-side handlers from consumers (search, forms).
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with an "Inputs" section. Do not rewrite the existing Button or Card sections; add Input content below them.

REQUIREMENTS:

**1. Input component.**
- File: `src/components/ui/Input.tsx`. Render a real `<input>` element. Default-export the component, also export named.
- Extend `React.ComponentPropsWithoutRef<"input">` and spread all native `<input>` props (`type`, `placeholder`, `value`, `defaultValue`, `name`, `onChange`, `onFocus`, `onBlur`, `required`, `disabled`, etc.). Consumers should be able to pass any native HTML input attribute.
- Accept React 19 `ref` as a regular prop (`ref?: React.Ref<HTMLInputElement>`) — same idiom as Button and Card. Do NOT use `React.forwardRef`.
- Inline `cx` helper at the top of the file (same shape as Button/Card). **No new dependencies.**

**2. Component props (in addition to spread native props).**
- `label?: string` — visible label rendered as a `<label>` element above the input. When omitted, no label is rendered (rare but supported for tightly-styled inline uses like search bars).
- `hint?: string` — small help text rendered below the input. Replaced visually by the error message when an error is present.
- `error?: string` — error message. When set: switches the input border + label color to `brand-red-700`, renders the error message below the input in `brand-red-700`, and sets `aria-invalid="true"` on the input.
- `inputSize?: "sm" | "md" | "lg"` — default `"md"`. **Note the name: `inputSize`, not `size`.** Native `<input>` has a numeric `size` HTML attribute (which controls character-width for text inputs). Reusing the name would collide. Use `inputSize` to disambiguate and document the choice in output notes.

**3. Label / id association (accessibility — read carefully).**
- Use `React.useId()` from React 19 to generate a stable id when the consumer hasn't passed one via the `id` prop. Pattern: `const generatedId = React.useId(); const inputId = id ?? generatedId;`.
- The `<label>` element uses `htmlFor={inputId}`.
- The `<input>` element uses `id={inputId}`.
- When `hint` is set, render it in a `<p id="${inputId}-hint">` and add `aria-describedby="${inputId}-hint"` on the input.
- When `error` is set, render it in a `<p id="${inputId}-error">` (replacing hint visually) and add `aria-describedby="${inputId}-error"` on the input (taking precedence over hint).
- When `required` is set AND `label` is provided, append a visible `*` to the label (e.g. `<span aria-hidden="true" className="text-brand-red-600 ml-0.5">*</span>`). The `required` attribute on the input itself communicates required-ness to AT — the `*` is purely visual.

**4. Sizes (`inputSize` prop).**
- `"sm"`: smaller padding + font, `min-h-[32px]`, `text-small` for input text.
- `"md"` (default): standard padding, `min-h-[40px]`, `text-body`.
- `"lg"`: hero size for prominent search bars, `min-h-[48px]`, `text-body` (or `text-h3` if it reads better — your call, flag in notes).
- Padding values should feel consistent with Button's size scale.

**5. Visual styling.**
- Border: `border border-neutral-ink/15` default. On focus: `focus:border-brand-red-600` and `focus-visible:ring-2 focus-visible:ring-brand-gold-400 focus-visible:ring-offset-2` (same focus ring as Button — consistency).
- Error border: `border-brand-red-700` (overrides default and focus border colors when error is set).
- Background: transparent or `bg-neutral-cream` — your call. Either looks intentional on the cream page bg. Flag the choice in notes.
- Text color: `text-neutral-ink`. Placeholder: `placeholder:text-neutral-ink/40`.
- Rounded: `rounded` (4px) — slightly tighter than Card's `rounded-lg`, more appropriate for form fields. (Flag if you disagree and pick something else.)
- Disabled: `opacity-50 cursor-not-allowed`, and the consumer's native `disabled` attribute handles the semantics/click-blocking for free. Don't layer `aria-disabled`.

**6. Label styling.**
- `<label>` rendered above the input with `mb-1.5` spacing. Font: `font-sans text-small font-medium text-neutral-ink`. When error is set, the label color switches to `text-brand-red-700` to reinforce the error state.

**7. Hint / error styling.**
- Both rendered below the input with `mt-1.5` spacing. Font: `font-sans text-small`.
- Hint color: `text-neutral-ink/60`.
- Error color: `text-brand-red-700`.
- Only one of hint/error renders at a time — error wins when set.

**8. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing Card sections, titled "Inputs" (use the same `font-serif text-h2 mb-6` heading style as the existing sections).
- Within the Inputs section, render two sub-groups:
  1. **States:** five inputs in a single column, max-width `max-w-md`, demonstrating: (a) default with label + placeholder, (b) with label + hint, (c) with label + error, (d) required field (showing the `*`), (e) disabled. Each labeled clearly.
  2. **Sizes:** three inputs in a single column, max-width `max-w-md`, one per `inputSize` (`sm`, `md`, `lg`), each with a label that names the size and a placeholder demonstrating the input height.
- Use brand fonts and tokens for any surrounding labels/text, consistent with the existing test sections.

OUT OF SCOPE:
- Do not build Textarea, Select, Checkbox, Radio, or any other form primitive in this task. Each gets its own task.
- Do not build a `Form` wrapper, validation helpers, or schema-integration (`react-hook-form`, `zod`, etc.). Consumers wire validation themselves; Input only visualizes the error string.
- Do not add icon / prefix / suffix slots (e.g. search icon inside the input). Future task.
- Do not add input masks (phone, credit card, etc.).
- Do not touch any blocklisted paths (see CLAUDE.md "Blocklist" section). In particular: no checkout, no auth endpoints, no MoneyField interactions.
- Do not install new npm dependencies.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- After deploy, `/design-test` shows the existing Button and Card sections unchanged, plus a new "Inputs" section with the states and sizes sub-groups.
- Each rendered input has a properly associated label (clicking the label focuses the input — verify in browser before claiming done).
- The error state shows: red border, red label color, red message text. `aria-invalid="true"` on the input.
- The required state shows a `*` next to the label.
- The hint and error never both render at the same time.
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `"use client";` is present at the top of `Input.tsx`.
- Confirm the prop is named `inputSize`, not `size`, and briefly note why (native `<input>` `size` attribute collision).
- State the auto-id strategy you used (`useId()` with fallback to consumer-provided `id`).
- State the background choice for the input (transparent vs. `bg-neutral-cream`) and why.
- State the rounded corner you chose (`rounded` vs. something else) and why.
- Flag any place you were uncertain about a11y patterns or the API.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

**`"use client"` confirmation:**
- Present at the top of `Input.tsx` as the first line. Input handles `onChange`, `onFocus`, `onBlur` from consumers and uses `React.useId()`, all of which require a client boundary.

**Prop naming (`inputSize`):**
- Named `inputSize` instead of `size` to avoid collision with the native HTML `<input>` `size` attribute, which controls character-width for text inputs. A consumer passing `size={20}` would expect the HTML attribute behavior, not a component size variant. `inputSize` disambiguates without breaking native prop spreading.

**Auto-id strategy:**
- `const generatedId = React.useId(); const inputId = id ?? generatedId;`. The consumer can override via the `id` prop for server-rendered forms or testing. When omitted, React 19's `useId()` provides a stable, hydration-safe id. The same `inputId` seeds `htmlFor`, `id`, `aria-describedby`, and the hint/error element ids.

**Background choice:**
- `bg-neutral-cream`. Chose over transparent because it gives the input a subtle surface even when placed on non-cream backgrounds (e.g. inside a Card with a different bg, or a tinted section). Transparent would risk looking like missing styling. Consumers can override via `className` on the wrapper if needed.

**Rounded corner:**
- `rounded` (4px / 0.25rem). Chose over `rounded-lg` because form fields benefit from slightly tighter corners — they feel more precise and editable, whereas `rounded-lg` reads more like a container/card. Matches the slightly tighter radius common in form UIs.

**A11y / API uncertainty:**
- One minor call: when both `hint` and `error` are present, error wins visually and in `aria-describedby`. This is the standard pattern (errors are more urgent than hints), but flagging in case you prefer concatenating both ids (`aria-describedby="errorId hintId"`) so screen readers announce both. Current implementation only references the error id when error is set.
- Another call: `aria-invalid` is set to `true` when error is present, and omitted entirely (not `false`) when there's no error. This follows the ARIA spec more closely — absence of `aria-invalid` implies no invalid state, while `aria-invalid="false"` is redundant.

**Blocklist and deps confirmation:**
- Did not touch any blocklisted paths. Work stayed within `src/components/ui/Input.tsx` and `src/app/(frontend)/design-test/page.tsx`. No new npm dependencies.

**Build verification:**
- `npx tsc --noEmit` clean.
- `npm run build` exit 0, `/design-test` statically generated.
