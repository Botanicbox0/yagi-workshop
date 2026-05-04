Phase 5 Wave B task_06 v3 + task_05 v3 hotfix-5 K-05 Tier 2 medium LOOP 1.

This pass covers (a) Step 2 slim-down (6 fields removed from
updateProjectMetadataAction + sidebar UI) and (b) Step 3 net-new server
actions and UI for commit + atomic submit.

## Files in scope (6 total)

NEW:
- src/app/[locale]/app/projects/new/briefing-step3-actions.ts
  • updateProjectCommitAction (autosave 5 fields)
  • submitBriefingAction (atomic 'draft' → 'in_review' status flip)
  • assertProjectMutationAuth helper (duplicated from briefing-step2-actions.ts to avoid leaking it as a server action export)
- src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
  • Step 3 UI: summary card + commit form + final notes + sticky CTA + AlertDialog confirm
  • 5s debounced autosave with single-flight queue (inFlightRef + pendingRef pattern from sub_5)
  • Submit handler flushes pending autosave before status flip

MODIFIED:
- src/app/[locale]/app/projects/new/briefing-step2-actions.ts
  • metadataInput zod: 12 → 6 fields (removed has_plan, additional_notes, budget_band, target_delivery_at, meeting_preferred_at, interested_in_twin)
  • payload field list: 12 → 6
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx
  • SidebarFormData type: 12 → 6 fields
  • runSave payload: 12 → 6
  • JSX: removed has_plan/additional_notes/budget/delivery/meeting/twin blocks
  • imports: dropped RadioGroup/RadioGroupItem
- src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx
  • ProjectMetadata type / EMPTY_SIDEBAR / sidebarInitial seed: 12 → 6 fields
  • SELECT projection trimmed
- src/app/[locale]/app/projects/new/briefing-canvas.tsx
  • Stage 3 mount: StagePlaceholder → BriefingCanvasStep3 (with projectId / onBack / onJumpToStep)

## Out of scope (do NOT review)

- briefing-actions.ts (Step 1 — already CLEAN at task_04 v3)
- briefing-canvas-step-1.tsx (already CLEAN)
- briefing-canvas-step-2-brief.tsx + briefing-canvas-step-2-reference.tsx (no changes)
- /api/oembed/route.ts (already CLEAN at sub_5)
- i18n keys (data-only)
- All migrations (no new migration this pass)

## Builder grep audit (do NOT redo — verify)

- assertProjectMutationAuth in briefing-step3-actions.ts adds a `created_by !== user.id` rejection that the briefing-step2-actions.ts copy lacks. The Step 2 helper relies on the policies + the project SELECT's RLS scope to enforce creator-bound writes. The Step 3 copy makes the creator check explicit because submitBriefingAction's blast radius is project-wide (status flip), not row-narrow.
- updateProjectCommitAction's UPDATE includes `.eq('status', 'draft')` for TOCTOU defense even though assertProjectMutationAuth already verified status. submitBriefingAction's UPDATE includes `.eq('created_by', auth.userId).eq('status', 'draft')` with `.select('id').maybeSingle()` so 0-row results are distinguishable from a successful flip and surface as wrong_status.
- Phase 5 Wave A sub_5 RLS migration (20260504180000) added `p.status='draft'` to briefing_documents INSERT/UPDATE policies. After submitBriefingAction flips status, every subsequent commit-write from the user-scoped client returns 0 rows at the RLS layer regardless of action-layer guards.
- projects RLS UPDATE policy (verified via SQL on 2026-05-03): `((auth.uid() = created_by) AND (status = 'draft') AND (deleted_at IS NULL)) OR is_ws_admin OR is_yagi_admin`. The status='draft' branch denies any creator-bound UPDATE after status flips to 'in_review'.

## Six focus areas

1. **submitBriefingAction atomicity.** The action does
   `assertProjectMutationAuth → UPDATE ... WHERE id=projectId AND created_by=auth.uid() AND status='draft' RETURNING id`.
   Verify:
   - Concurrent double-click from the same tab (button has `disabled={submitting}` via useTransition) cannot fire two parallel UPDATEs that both succeed.
   - Cross-tab double-submit (two tabs both still showing the draft) — the second UPDATE returns 0 rows because status is no longer 'draft' on re-evaluation. Verify the action layer correctly maps 0-row to `wrong_status` (not silent success).
   - submitted_at is set in the same UPDATE statement as the status flip, so they cannot diverge.
   - revalidatePath('/[locale]/app/projects', 'page') is called only on success path. Verify the locale param string `/[locale]/...` is the correct pattern for next/cache (Next.js 15 App Router) — confirm by grep against an established pattern in the repo.

2. **updateProjectCommitAction status guard chain.**
   - assertProjectMutationAuth checks `project.status !== 'draft'` and rejects.
   - The UPDATE adds `.eq('status', 'draft')` redundantly.
   - RLS projects_update policy enforces `(created_by AND status='draft') OR ws_admin OR yagi_admin`.
   Verify all three layers agree on the same invariant; verify there is no path where one layer accepts and another rejects (e.g., a yagi_admin caller using the regular updateProjectCommitAction — the action's `created_by !== user.id` rejection in assertProjectMutationAuth would block yagi_admin from using this surface, which is the intended behavior since admin support paths use service-role tooling).

3. **Autosave / submit race in briefing-canvas-step-3.tsx handleSubmit.**
   The handler does:
   ```
   clearTimeout(debounceRef)
   if (form !== lastCommitted) await runSave(form)
   while (inFlightRef.current) await sleep(50)
   await submitBriefingAction({ projectId })
   ```
   Verify:
   - A keystroke that fires AFTER handleSubmit reads `form` snapshot but BEFORE the await runSave completes — the post-handler keystroke's debounced runSave will queue at pendingRef, drain after the inFlightRef polling exits, but submitBriefingAction has already started or finished. If submit succeeds first, the post-keystroke commit-write runs against status='in_review' and silently fails (RLS + .eq('status','draft')). The user's last keystroke is lost. Is this acceptable? (Recommend: disabling form inputs during submitting=true, or accept the loss with the rationale that submit ends Step 3.)
   - The useTransition `submitting` state guards the button itself (`disabled={submitting}`). Verify it is the same boolean that gates the AlertDialog cancel/proceed sequence.
   - The polling loop `while (inFlightRef.current) sleep(50)` has no upper bound. If runSave hangs (network error → action returns error but inFlightRef is still true via the finally block? — verify that the finally block always sets inFlightRef.current = false even on action-error returns; the runSave try/finally pattern should handle this).

4. **assertProjectMutationAuth duplication risk.** The Step 3 copy and Step 2 copy diverge by one line (Step 3 adds `created_by !== user.id` rejection). Verify that future drift is documented, OR that the Step 2 copy is actually safe without the explicit creator check (RLS + .eq('id', projectId) on subsequent UPDATEs implicitly scope to creator via RLS). Recommend: extract to shared internal helper file (no 'use server'). NOT a blocker if the divergence is captured in a comment.

5. **AlertDialog re-entrancy.** The dialog's "확인" button onClick calls handleSubmit, which calls setConfirmOpen(false) before startSubmit. Verify:
   - The dialog cannot be re-opened during submitting=true.
   - Cancel during in-flight submit is impossible because Cancel is inside the dialog which is closed.
   - If submitBriefingAction returns wrong_status, the toast appears but the dialog stays closed; the button is no longer disabled (useTransition resolves) and clicking again re-opens the dialog → calls submit again → wrong_status again. Verify this is acceptable UX (or recommend a one-shot guard).

6. **SessionStorage cleanup.** sessionStorage.removeItem(SESSION_STORAGE_KEY) only runs on success. On wrong_status / unauthorized / db error, the key persists. Verify:
   - On wrong_status (already submitted), should the key be cleared anyway? (Recommend: yes — the user can't recover from this state by re-submitting.)
   - The try/catch around removeItem swallows errors silently. Verify nothing downstream depends on the cleanup actually completing (the redirect happens after).

## Already-deferred (do NOT flag again)

- FU-Phase5-3: generic OG scrape with undici dispatcher (sub_5 closed F1)
- FU-Phase5-4: projects table column-grant lockdown for the 11 commit/metadata fields (Phase 5 ff-merge batch sweep candidate)
- FU-Phase5-1: data migration FK risk (Wave A LOOP 1 MED-C)
- has_plan column drop / projects.purpose column drop — yagi explicitly opted to keep both columns

## Scale-aware rule reminder

Phase 5 < 100 user, all-trusted. MED-B/C with no direct user input + no external < 30d delivery + not 3rd-repeat → defer. MED-B/C otherwise → inline fix. HIGH always inline.

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — task_06 v3 + hotfix-5 ready for yagi visual review and Wave B → Wave C transition."

End with one-line summary suitable for the run log.
