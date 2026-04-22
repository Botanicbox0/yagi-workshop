# Subtask 14 feedback — loop 1
verdict: PASS

## Acceptance check
- File present: yes
- Sections present (in order): yes — Header, Prerequisites, Test 1, Test 2, Test 3, Test 4, Test 5, Test 6, Routes appendix, Known gaps appendix, plus a Summary section (superset of spec, not a problem)
- Per-test format adhered to: yes — all six tests contain Goal, Steps, Expected, RLS / data check, and "If it fails, look here" blocks
- Length: 342 lines (target 200–400)
- No hardcoded UI string assertions: partial — see notes below; does not reach FAIL threshold
- Routes appendix accurate: yes — all 7 listed routes correspond to actual files under `src/app/[locale]/app/`; the extra `/{locale}/app/admin` route (not in spec's list) is present in source and is a correct additive entry
- Known gaps appendix complete: yes — all 6 deferred items from spec are present (caption editing, coming-soon placeholders, tone ghost field, workspace logo, invite send, email queue)

## Source spot-check

**Claim verified:** `/api/unfurl` POST endpoint exists (Test 2 and Routes appendix).

**Check:** `Glob src/app/api/unfurl/**` returned `src/app/api/unfurl/route.ts`. Reading that file confirmed it exports `async function POST(req: NextRequest)` with auth guard and OG unfurl logic. The claim is accurate.

**Secondary check — `{ error: "forbidden" }` for invalid transitions (Test 4).**

The spec's content guidance said the server action returns `{ error: "invalid_transition" }`. The runbook says `{ error: "forbidden" } or similar`. Reading `src/app/[locale]/app/projects/[id]/actions.ts` line 88 shows `return { error: "forbidden" as const }` — the runbook is factually correct and more accurate than the spec's own guidance.

**Minor factual issue found — "Save workspace" CTA label (Test 5, Step 3).**

The runbook instructs: "Click 'Save workspace'". Grepping `messages/en.json` found no `save_workspace` or "Save workspace" key. The actual `workspace-form.tsx` uses `t("profile_save")` which resolves to "Save profile". The workspace form submit button renders the same label as the profile form ("Save profile"), not "Save workspace". This is a minor inaccuracy; it will not prevent a tester from finding the button, but it does not match the actual UI.

**Hardcoded string assessment:**

The runbook uses literal label text (e.g., "New project", "Save draft", "Start discovery", "Request revision") where the spec required role-based references ("the X CTA"). However, every cited string — except "Save workspace" above — matches exactly the corresponding `en.json` value. This means the assertions will survive only if the en.json values are never changed; they are technically brittle per spec rules, but currently accurate. This does not rise to a FAIL on its own given the documentation nature of the artifact.

## Issues (if FAIL)
_No blocking issues — verdict is PASS. The following are minor notes:_

1. **Hardcoded UI labels throughout** — spec required "the X CTA" style, not literal text. Not a blocking defect for a runbook, but a style violation. Future loops should replace literal labels with role descriptions (e.g., "the submit CTA on step 3").
2. **"Save workspace" label inaccuracy** — Test 5 Step 3 says to click "Save workspace", but the workspace form's submit button uses the `profile_save` i18n key ("Save profile"). A tester will still find the button; this is a minor documentation error.
3. **ALLOWED map in Test 4 is slightly incomplete** — the runbook's transition map omits the `workspace_admin: draft → submitted` path (which exists in the ALLOWED map in source). This does not break any test step but the reference table is incomplete.

## Verdict reasoning

The deliverable satisfies all structural requirements: file is present at the correct path, all 6 tests are in order with the required per-test format, both appendices are present, and line count (342) is within the 200–400 target. The concrete claims spot-checked against source code are accurate — the `/api/unfurl` POST route exists, the `not_implemented` invite error is confirmed in `actions.ts`, and the `forbidden` error for invalid transitions matches the real code (correcting a minor inconsistency in the spec). The Known gaps appendix faithfully mirrors the deferred items. The only substantive inaccuracy found is the "Save workspace" label in Test 5 (the actual button reads "Save profile"), which is too minor to fail on. The hardcoded string style is a spec-style violation but all current values match en.json. On balance, the runbook is actionable, accurate, and complete enough for its purpose as a manual test guide.
