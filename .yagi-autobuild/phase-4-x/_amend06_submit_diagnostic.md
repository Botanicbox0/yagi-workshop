# Wave C.5b amend_06 — Submit broken root cause + diagnostic

**Status**: Provisional auto-resolution by amend_05; awaiting yagi retest
to confirm.

## Original report

yagi: "Step 3 의 '의뢰 보내기' 클릭 → 제출 안 됨." Wave A task_02 closed
the same surface as fixed; the bug resurfaced for at least one test
attempt against the post-rollback build.

## Static analysis (Builder, post-amend_05)

The submit handler lives at
`src/app/[locale]/app/projects/new/new-project-wizard.tsx:820-866`.
Its full chain:

1. `startSubmit(async () => { ... })` — wraps the handler in
   `useTransition` so `isSubmitting` flips while running.
2. `validateStep3Fields()` → `trigger(["deliverable_types",
   "budget_band"])` — returns a boolean. On `false` the handler
   silently `return`s. RHF DOES populate `errors.deliverable_types`
   / `errors.budget_band`, and the inline error text renders next to
   each field; but no toast fires, and there is no scroll-to-error.
3. `getValues()` → `submitProjectAction(payload)`.
4. `result.ok` → `router.push(result.redirect)`. Else
   `console.error("[wizard.submit] failed:", result)` and a localised
   toast (`unauthenticated` / `submit_validation` / `submit_failed`).

Server zod (`actions.ts:724-776`) accepts the wizard's payload
shape directly. The fields the wizard emits map 1:1 with the
schema; nothing in the schema would always reject.

## Most likely root cause (provisional)

Step 3's `Label` text was rendering as raw i18n keys
(`projects.wizard.step3.twin_intent.label` etc) — see amend_05.
Three plausible side-effects:

1. **Misread**: yagi clicked Submit thinking the form was broken
   without realising the radio LABELS themselves were keys, so they
   may not have actually picked a `twin_intent` (default 'undecided'
   is set, so this wouldn't block, but UX confusion is real). More
   importantly, the missing key's `tooltip_aria` rendered into the
   `<button aria-label>` slot — visible-but-cryptic accessibility
   string near the Submit button.
2. **Missed validation feedback**: if yagi didn't fill
   `deliverable_types` or `budget_band`, `validateStep3Fields`
   returned false, RHF rendered red inline errors above the Submit
   button. With the page already noisy from raw keys, the inline
   errors may have been overlooked.
3. **No actual server-side throw**: `next-intl` returns the literal
   key when a path doesn't resolve; it does NOT throw. So the React
   tree did not crash, just rendered ugly strings.

After amend_05, the keys resolve to localised copy — the surface is
clean, the radio labels are readable, and the inline-error path is
the main remaining failure mode.

## Decision

amend_06 = **no-op** (pending yagi retest).

If yagi retests on the post-amend_05 build and the submit still
fails, we have two priors to investigate (in order):

A. **Silent validation failure** — `validateStep3Fields` returns
   false because `deliverable_types` is empty or `budget_band` is
   undefined. Inline errors are rendered but the user clicked
   Submit at the bottom of the step and didn't scroll up.
   - Fix sketch: add a toast `t("wizard.errors.submit_validation")`
     when `isValid === false` AND scroll the form to the first
     `errors.*` field.
B. **Server zod / RPC rejection** — surfaced as
   `result.error === "validation"` or `"db"`. yagi can copy the
   `console.error("[wizard.submit] failed:", result)` line from
   DevTools so we can see the actual `result.message`.

Both are small surgical fixes; neither requires a Codex K-05 review
(no schema or RLS change involved unless we discover the rejection
is coming from `bootstrap_workspace` or another RPC).

## What yagi needs to retest

1. Build is up via `pnpm dev` on the post-amend_05 commit
   (HEAD = the amend_05 commit SHA in the wave result doc).
2. Open `/ko/app/projects/new`. Confirm Step 3 labels read in
   Korean (no raw `wizard.step3.*` keys).
3. Walk Step 1 → 2 → 3 with a real payload: name, description,
   pick at least one deliverable type, pick a budget band, leave
   delivery_date / meeting_preferred_at empty if you like, and
   click 의뢰 보내기.
4. Either:
   - **Success path**: redirect to the project detail page —
     amend_06 stays no-op, this file becomes the historical record.
   - **Failure path**: open DevTools Console + Network. Capture:
     - the `[wizard.submit] failed:` console line (it includes the
       full `result` object from `submitProjectAction`)
     - the request status code on the server-action POST (or the
       fetch URL if it's an `_action` invocation)
     and post here.
