Phase 5 Wave B task_06 v3 sub_2 patch — K-05 Tier 3 low LOOP 2. Narrow verify of LOOP 1 finding closures only.

LOOP 1 was NEEDS-ATTENTION with 3 MED findings:

- F1 MED: submitBriefingAction's cross-tab "already submitted" path returned generic forbidden via assertProjectMutationAuth's pre-reject of non-draft, instead of the explicit wrong_status the toast layer expects.
- F2 MED: updateProjectCommitAction returned ok:true on a 0-row UPDATE after a status flip — the .eq('status','draft') guard prevented the write but the action couldn't tell, so the autosave indicator showed "saved" when nothing was saved.
- F3 MED: Step 3 form inputs remained editable while submitting=true, so edits between [의뢰하기 →] and the status flip would queue behind the flush and silently drop after status='in_review'.

Files in scope (2 total — verify only):

- src/app/[locale]/app/projects/new/briefing-step3-actions.ts
  • F1: submitBriefingAction no longer calls assertProjectMutationAuth. Inline auth flow: getUser → resolveActiveWorkspace → SELECT id, status, created_by → if (!project || created_by !== user.id) return not_owner → if (status !== 'draft') return wrong_status → atomic UPDATE WHERE status='draft' AND created_by=user.id → if no row return wrong_status → revalidatePath. SubmitBriefingResult error union: 'validation' | 'unauthenticated' | 'no_workspace' | 'not_owner' | 'wrong_status' | 'db' (dropped 'not_found' + 'forbidden').
  • F2: updateProjectCommitAction's UPDATE chain now ends with `.select('id')`. Result type adds 'wrong_status'. If updatedRows is empty, returns wrong_status. The action still uses assertProjectMutationAuth for pre-check (cross-tab where status is already in_review at SELECT time → forbidden, that's fine — the F2 case is the race window where status was draft at the SELECT but flips before UPDATE).

- src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
  • F3: <fieldset disabled={submitting || autosave === "stale"} className="contents"> wraps both the commit form section and the final-notes section. className="contents" so layout is unchanged; disabled propagates to all input/button/textarea descendants and blocks IME composition + chip clicks.
  • F2 client side: staleRef + new "stale" autosave state. When updateProjectCommitAction returns wrong_status, runSave sets staleRef.current=true, clears pendingRef, sets autosave="stale". Subsequent runSave invocations early-return on staleRef. New i18n key briefing.step3.autosave.stale ("이미 의뢰된 프로젝트" / "Already submitted") rendered in amber-600 in the sticky CTA bar.
  • Pending autosave flush in handleSubmit unchanged (already correct in LOOP 1 review): clearTimeout debounceRef → if dirty await runSave(form) → drain inFlightRef → submitBriefingAction → on success clear sessionStorage + redirect.

Out of scope (do NOT review): briefing-canvas-step-2-sidebar.tsx, briefing-canvas-step-2.tsx, briefing-canvas.tsx, briefing-step2-actions.ts, briefing-actions.ts, briefing-canvas-step-1.tsx, all i18n keys (data-only verify), all migrations.

LOOP 2 verify only:

1. F1 closure — confirm submitBriefingAction does NOT call assertProjectMutationAuth; confirm the inline auth flow returns not_owner on missing-row OR creator-mismatch and wrong_status on non-draft; confirm the atomic UPDATE WHERE status='draft' is still present as the race net; confirm 0-row UPDATE result returns wrong_status; confirm SubmitBriefingResult type union accurately reflects the new returns; confirm the client toast switch in briefing-canvas-step-3.tsx handles wrong_status correctly (it was already handling wrong_status before LOOP 1 — verify it still routes to submit_wrong_status).

2. F2 closure — confirm updateProjectCommitAction's UPDATE includes `.select('id')` and returns wrong_status when updatedRows is empty; confirm UpdateProjectCommitResult adds 'wrong_status'; confirm runSave sets staleRef + autosave="stale" on wrong_status; confirm the autosave UI renders the new stale state with the new i18n key.

3. F3 closure — confirm the fieldset wraps both the commit form section AND the final-notes section (not just one); confirm className="contents" preserves the existing flex layout; confirm `disabled={submitting || autosave === "stale"}` triggers on both submit-in-flight and post-stale. Note: the [← 이전] back button + AlertDialog cancel/proceed buttons are intentionally outside the fieldset (yagi spec narrows scope to "조건 form + notes textarea") — verify this is the case.

Already-deferred (do NOT flag again):
- FU-Phase5-3 / FU-Phase5-4 (sub_5 carry-overs)
- assertProjectMutationAuth duplication between briefing-step2-actions and briefing-step3-actions (LOOP 1 already noted as intentional divergence)
- has_plan / projects.purpose column drops (yagi opted to keep)

Scale-aware rule reminder: Phase 5 < 100 user, all-trusted. MED-B/C 3 conditions check before fix vs FU.

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION | PARTIAL>

CLEAN = all 3 LOOP 1 findings (F1 / F2 / F3) closed by sub_2; no NEW HIGH/MED introduced.

PARTIAL = some closure but a residual gap on the same axis (single-line miss → Builder closes inline + commits without LOOP 3).

NEEDS-ATTENTION = a closure regressed OR a new HIGH/MED introduced → STOP + escalate.

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

End with one-line summary suitable for the run log.
