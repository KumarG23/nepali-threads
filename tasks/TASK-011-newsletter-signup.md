TASK ID: TASK-011
PHASE: Phase 2
GOAL: Build a `NewsletterSignup` composition at `src/components/storefront/NewsletterSignup.tsx` — a self-contained email-subscription form that composes Input + Button with client-side form state (idle / submitting / success / error). This is the first composition that exercises client-side state and async submission patterns, and will be reused in the Footer and possibly other CTA sections.

CONTEXT:
TASK-010 landed ProductCard — the first composition over the primitives. NewsletterSignup is the second composition, exercising a different pattern: a client component that owns form state and handles async submission. The pattern this lands (controlled form, loading state, error/success swap) will be reused by every later form in Phase 2 (contact, account signup, address book).

This task does NOT wire to a real email backend yet. Resend (the eventual mail provider — see CLAUDE.md "Stack") integration is a later, security-sensitive task that Claude Code will handle. NewsletterSignup accepts a consumer-provided `onSubscribe(email)` async function and only renders the form / loading / success / error states around whatever the consumer passes. The design-test page passes a fake stub that resolves after a delay.

FILES TO CREATE OR MODIFY:
- `src/components/storefront/NewsletterSignup.tsx` — new file. Sibling of `ProductCard.tsx` in the `storefront/` folder. **Add `"use client";` as the first line** — this is a client component (`useState`, form event handling, async submission).
- `src/app/(frontend)/design-test/page.tsx` — extend the existing smoke-test page with a "NewsletterSignup" section below the ProductCard sections. Same rule as before: do not rewrite earlier sections.

REQUIREMENTS:

**1. NewsletterSignup component.**
- File: `src/components/storefront/NewsletterSignup.tsx`. First line: `"use client";`. Default-export the component, also export named.
- Inline `cx` helper at the top of the file. **No new dependencies.**
- Compose `<Input>` (the TASK-007 primitive) + `<Button>` (the TASK-005 primitive). Do NOT reimplement form-field markup.

**2. Props (curated).**
- `onSubscribe: (email: string) => Promise<void>` — required. Async function the consumer provides. NewsletterSignup awaits this; if it resolves, success state is shown; if it rejects, the rejection's message (or a generic fallback) is shown as the error.
- `heading?: string` — optional. Default `"Stay in the loop"`. Rendered above the form as a `font-serif text-h2`.
- `description?: string` — optional. Default `"Get occasional updates on new arrivals, restocks, and the story behind the work."`. Rendered between the heading and the form as a `font-sans text-body text-neutral-ink/70`.
- `successMessage?: string` — optional. Default `"Thanks — you'll hear from us soon."`. Shown in place of the form after a successful submission.
- `submitLabel?: string` — optional. Default `"Subscribe"`. Used as the Button label.
- `className?: string` — applied to the outer wrapping `<section>` element.

The defaults are intentionally artisan / mission-forward per CLAUDE.md tone rules: warm but confident, never corporate. Don't write "Sign up for our newsletter" or "Join our mailing list" anywhere — those are placeholder strings the design-test demonstrates can be overridden, not the defaults this component ships.

**3. State machine (use `React.useState`).**
- `status: "idle" | "submitting" | "success" | "error"` — single state field tracking which view to render.
- `email: string` — controlled value of the Input.
- `errorMessage: string | undefined` — error text when `status === "error"`. Otherwise undefined.

Transitions:
- idle → submitting: when the user submits the form with a non-empty email.
- submitting → success: when `onSubscribe(email)` resolves.
- submitting → error: when `onSubscribe(email)` rejects. The error message is `err instanceof Error ? err.message : "Something went wrong. Please try again."`.
- error → submitting: when the user re-submits after seeing an error. The previous error clears.
- success: terminal. The form is replaced with the success message. Do NOT auto-reset to idle. (If the user wants to subscribe a different email later, they'll refresh — keeps the component simple.)

**4. Render structure.**
- Outer: `<section className={cx("max-w-md", className)}>`.
- Inside, conditional on status:
  - `status === "success"`: render the heading (`font-serif text-h2 mb-3`), description (kept visible for context), then the `successMessage` in a quiet but clearly-positive style: `font-sans text-body text-brand-red-700` or similar warm tone. No checkmark icon, no celebration — calm, confident.
  - All other statuses: render the heading, description, then the form.
- Form structure (when not success):
  - `<form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">` — stacks on mobile, side-by-side on `sm`+.
  - `<Input>` with:
    - `type="email"`
    - `name="email"`
    - `required`
    - `value={email}`
    - `onChange={(e) => setEmail(e.target.value)}`
    - `placeholder="you@example.com"`
    - `label="Email"` — visible label per a11y; the size + label-on-top means it stacks above the input.
    - `disabled={status === "submitting"}`
    - `error={status === "error" ? errorMessage : undefined}`
    - `className="flex-1"` so it grows to fill width on desktop.
  - `<Button>` with:
    - `type="submit"`
    - `variant="primary"`
    - `size="md"`
    - `loading={status === "submitting"}`
    - `disabled={status === "submitting"}`
    - Child: `{submitLabel}`.
    - The button label position: since the Input has a label above it, the Button would visually sit lower than the Input. To compensate, wrap the Button in `<div className="sm:mt-[1.625rem]">` (or `pt-7`, whatever matches the Input's label height + margin so the Button aligns with the Input's box on `sm`+ screens). **This is fiddly — flag in output notes if you find a cleaner alignment approach.**

**5. Submit handler.**
- `async function handleSubmit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); ... }`.
- Validate email is non-empty (HTML5 `required` on the Input does the visible job; this is just a defensive guard).
- Set status to `"submitting"`, clear any prior error.
- Wrap `await onSubscribe(email)` in try/catch:
  - On success: setStatus("success").
  - On error: setStatus("error"), setErrorMessage(err.message ?? fallback).

**6. Accessibility.**
- The form's heading and description provide context — no additional ARIA needed.
- `Input`'s built-in label/error/aria-invalid story handles the field's a11y (TASK-007).
- The submit button uses `aria-busy` automatically via its `loading` prop (TASK-005).
- The success message is rendered in place of the form. Add `role="status"` to the success container so screen readers announce the change when the user successfully subscribes. **(Note: this is one of the rare legitimate uses of `role="status"` — a dynamic update the user needs to be informed of. Static labels like Badge correctly do NOT use this, but a state transition like form-submit-success does.)**

**7. Design-test page extension.**
- Open the existing `src/app/(frontend)/design-test/page.tsx`. Add a new `<section>` below the existing ProductCard sections, titled "NewsletterSignup" (same `font-serif text-h2 mb-6` heading style).
- Within that section, render three side-by-side or stacked examples (whichever fits the page) demonstrating different scenarios:
  1. **Default:** uses all default copy. Pass a stub `onSubscribe` that resolves after 1.5 seconds (use `await new Promise((resolve) => setTimeout(resolve, 1500))`). Lets you click Subscribe and watch the loading → success transition.
  2. **Custom copy:** override heading (`"Join the studio list"`) and description (`"Behind-the-scenes notes from the workshop, twice a month."`) to demonstrate the props. Use the same resolving stub.
  3. **Error case:** pass an `onSubscribe` that always rejects with `new Error("This email is already subscribed.")` after 1 second. Lets you eyeball the error state. Override the heading (`"Error demo"`) to make it clear this one's meant to fail.

Because the design-test page is currently a server component, and the three example stubs need to be passed as props from the page, you'll need to add `"use client";` to the design-test page OR wrap each demo in its own small client component (`<NewsletterSignupDemo onSubscribe={...} />`). **Prefer the second approach** — wrap each demo in a tiny named client component (defined inside the design-test page file, or as a sibling helper, your call) so the design-test page itself stays a server component. The wrappers can be tiny, like:

```tsx
"use client";
function DemoDefault() {
  const handler = async (email: string) => {
    await new Promise((r) => setTimeout(r, 1500));
  };
  return <NewsletterSignup onSubscribe={handler} />;
}
```

Then the server-component design-test page renders `<DemoDefault />`. Flag in output notes if you take a different approach.

OUT OF SCOPE:
- Do NOT wire to Resend, send real emails, hit any API, or implement a server action. The consumer's `onSubscribe` is the only side effect — design-test uses stubs.
- Do NOT add captcha, honeypot fields, double-opt-in flow, or any anti-spam infrastructure. Resend integration (later, by Claude Code) handles those concerns.
- Do NOT persist the email anywhere (localStorage, cookies, etc.). The component is stateless across page loads.
- Do NOT extract the email-input pattern into a `<FormField>` wrapper. Use Input directly.
- Do NOT extract `cx` to a shared utility yet.
- Do NOT touch any blocklisted paths.
- Do NOT install new npm dependencies.

ACCEPTANCE:
- `npx tsc --noEmit` is clean.
- `npm run build` succeeds with exit 0.
- After deploy, `/design-test` shows the existing primitives and ProductCard sections unchanged, plus a new "NewsletterSignup" section with all three demos rendering.
- **Manually verify in a browser:**
  - Default demo: typing an email + clicking Subscribe → button shows loading spinner for ~1.5s → form is replaced by success message.
  - Custom copy demo: same flow, different headline/body text.
  - Error demo: same flow but ends in red error message under the Input ("This email is already subscribed."), form remains visible, user can retry.
  - Tab order through the form is sensible (Input → Button).
- No new entries in `package.json` `dependencies` or `devDependencies`.

OUTPUT NOTES FOR REVIEWER:
- Confirm `"use client";` is present at the top of `NewsletterSignup.tsx`.
- State the alignment approach you used for the Button vs Input on `sm`+ (the `sm:mt-[1.625rem]` trick from the spec, or something else). Flag if you found a cleaner solution.
- Confirm the design-test page itself stayed a server component (with client-component demo wrappers), or note if you took a different approach.
- Confirm `role="status"` is on the success container — and only the success container, not the form.
- Flag any place you were uncertain about the state machine, the prop API, or the visual layout.
- Confirm you did not touch any blocklisted paths and did not add new npm deps.

When the task is finished, append your answers to the bottom of this same file under `## Notes for Reviewer (Kimi)` — see CLAUDE.md "Output format".

## Notes for Reviewer (Kimi)

**`"use client"` confirmation:**
- Present at the top of `NewsletterSignup.tsx` as the first line. The component uses `React.useState`, form event handlers, and async submission — all client-only concerns.

**Button vs Input alignment on `sm`+:**
- Used the spec's exact `sm:mt-[1.625rem]` value. The math checks out: Input's label is `text-small` (0.875rem, line-height ~1.25rem = 20px) plus `mb-1.5` (0.375rem = 6px), totaling ~26px = 1.625rem. This aligns the Button's top edge with the Input field's top edge on desktop. The wrapper div (`<div className="sm:mt-[1.625rem]">`) around the Button keeps the markup clean. No cleaner solution found — this is the standard approach for label+input / button side-by-side layouts.

**Design-test page architecture:**
- The design-test page itself (`page.tsx`) stayed a server component — no `"use client"` directive. The three demo wrappers (`DemoDefault`, `DemoCustomCopy`, `DemoError`) live in a separate file `_newsletter-demos.tsx` with `"use client"` at the top. The server page imports and renders them. This keeps the page file server-renderable while the demo stubs (which use `setTimeout` and closures) run on the client.

**`role="status"` placement:**
- Only on the success message container (`<p role="status" className="...">{successMessage}</p>`). Not on the form, not on the error message, not on the heading. The success state replaces the form entirely, so the role announcement tells screen-reader users that the submission completed.

**State machine uncertainty:**
- No major uncertainty. The four-state machine (`idle` → `submitting` → `success`/`error`) is straightforward. One call: success is terminal — no auto-reset to idle. This is intentional per the spec (keeps the component simple; users refresh if they want to re-subscribe).

**Prop API uncertainty:**
- None. The curated prop pattern (no spread) felt right — NewsletterSignup has a clear contract and shouldn't silently accept arbitrary section props. `onSubscribe` is required and typed as `Promise<void>`, giving consumers full control over the side effect.

**Visual layout uncertainty:**
- The three demos are arranged in a `lg:grid-cols-3` grid. On smaller screens they stack vertically. Each demo has its own `max-w-md` constraint from the component, so the grid cells don't stretch uncomfortably wide.

**Blocklist and deps confirmation:**
- Did not touch any blocklisted paths. Work stayed within `src/components/storefront/NewsletterSignup.tsx`, `src/app/(frontend)/design-test/_newsletter-demos.tsx`, and `src/app/(frontend)/design-test/page.tsx`. No new npm dependencies.

**Build verification:**
- `npx tsc --noEmit` clean.
- `npm run build` exit 0, `/design-test` statically generated.
