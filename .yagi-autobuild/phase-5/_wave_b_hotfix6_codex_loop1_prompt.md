Phase 5 Wave B hotfix-6 — K-05 Tier 2 medium LOOP 1.

Two paired fixes after yagi visual review of submit + dangling draft behavior.

## Fix #1 — submitBriefingAction transitions via RPC, not direct UPDATE

Root cause: BEFORE-UPDATE trigger trg_guard_projects_status raises
'direct_status_update_forbidden' when status is mutated outside the
SECURITY DEFINER `transition_project_status` RPC. Phase 4.x state
machine also requires client transitions to use 'submitted' (not
'in_review' — in_review is system / yagi_admin only). The RPC
auto-fills submitted_at when p_to_status='submitted' and writes a
project_status_history audit row in the same transaction.

After fix:
- submitBriefingAction → createSupabaseServer → getUser →
  resolveActiveWorkspace (kept for clean no_workspace surface) →
  sb.rpc('transition_project_status', { p_project_id, p_to_status: 'submitted' })
- assertProjectMutationAuth NOT called for submit (RPC's SECURITY
  DEFINER does the auth + ownership + transition validity itself,
  with FOR UPDATE row lock for concurrent serialization).
- Error mapping:
  - 42501 + msg.includes('unauthenticated') → unauthenticated
  - 42501 + msg.includes('forbidden')      → not_owner
  - P0002                                  → not_owner
  - 23514                                  → wrong_status
  - else                                   → db
- updateProjectCommitAction unchanged (status untouched, trigger
  doesn't fire on those columns).

## Fix #2 — Dangling draft wipe (옵션 A)

Root cause: ensureBriefingDraftProject's hotfix-3 reuse-or-INSERT
behavior carried prior briefing_documents into a fresh /projects/new
visit. yagi visual review: "새 프로젝트" mental model wins. Always
fresh-start.

After fix:
- (data.projectId provided AND alive draft found) → UPDATE path,
  validate creator/status/workspace, UPDATE 4 fields, return ok.
- (data.projectId provided BUT row missing OR deleted_at set) →
  silently fall through to wipe path (was 'not_found' before; that
  surfaced as toast.draft_failed, not user-friendly).
- Wipe path (no projectId OR fall-through):
  - SELECT alive drafts for (workspace, user, brief, deleted_at IS NULL)
  - For each found: hard-DELETE briefing_documents WHERE project_id IN (...);
    then UPDATE projects SET deleted_at=now() WHERE id IN (...) AND
    created_by=auth.uid() AND status='draft'
  - Then fresh INSERT.
- R2 objects under briefing-docs/<user-id>/... remain after the
  briefing_documents hard-delete (FU-Phase5-5 — periodic cleanup).
  user-id-bound prefix means external exposure = 0.

## DB migration (1 — needs prod apply after Codex CLEAN)

supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql

Reason: existing `projects_wizard_draft_uniq` partial unique index
WHERE clause was `(status='draft' AND intake_mode='brief')` — no
deleted_at filter. Soft-deleted drafts still occupy the unique slot,
so the wipe-then-INSERT path collides with 23505. Migration:

DROP INDEX IF EXISTS public.projects_wizard_draft_uniq;
CREATE UNIQUE INDEX projects_wizard_draft_uniq
  ON public.projects (workspace_id, created_by)
  WHERE status='draft'
    AND intake_mode='brief'
    AND deleted_at IS NULL;

DO block at the bottom asserts the new indexdef contains the
'deleted_at IS NULL' predicate. Non-destructive: no rows change,
no policies change, no grants change.

## Files in scope (4 total)

MODIFIED:
- src/app/[locale]/app/projects/new/briefing-step3-actions.ts
  • submitBriefingAction body replaced (RPC call + error mapping)
  • SubmitBriefingResult union unchanged from sub_2
  • updateProjectCommitAction unchanged
- src/app/[locale]/app/projects/new/briefing-actions.ts
  • UPDATE path: SELECT now includes deleted_at; fall-through if
    existing missing OR deleted_at set
  • Reuse-or-INSERT replaced by Wipe-then-INSERT
- src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
  • handleSubmit toast switch adds not_owner → submit_not_owner

NEW:
- supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql

i18n KO + EN: briefing.step3.toast.submit_not_owner added.

## Out of scope (do NOT review)

- briefing-canvas.tsx, briefing-canvas-step-1.tsx, briefing-canvas-step-2*, briefing-step2-actions.ts
- All other migrations, all i18n outside the 1 new key
- Wave A migrations + sub_5 migration (already CLEAN)

## Builder grep audit (do NOT redo — verify)

- transition_project_status RPC signature (verified via mcp): `(p_project_id uuid, p_to_status text, p_comment text DEFAULT NULL) → uuid SECURITY DEFINER`. Error codes: 42501 (unauthenticated/forbidden), P0002 (project_not_found), 23514 (invalid_transition).
- RPC's SQL body uses FOR UPDATE row lock + is_valid_transition() matrix check. Client role can transition draft → submitted; cannot transition draft → in_review.
- Existing `projects_wizard_draft_uniq` indexdef (verified via mcp): `(workspace_id, created_by) WHERE status='draft' AND intake_mode='brief'` — missing deleted_at filter. Migration is required, not optional.
- briefing_documents DELETE RLS policy: `(created_by = auth.uid()) AND (project_id IN (SELECT p.id FROM projects p JOIN workspace_members wm ON ... WHERE wm.user_id = auth.uid() AND p.status = 'draft'))`. The wipe path's hard-delete of briefing_documents passes only if all dangling drafts are still status='draft' AND created_by=auth.uid() AND in an active workspace_member workspace. Defense-in-depth at the action layer is unnecessary because RLS will filter; verify there is no scenario where the wipe SELECT finds a row but the wipe DELETE silently misses some (length-mismatch detection is not implemented).
- projects RLS UPDATE policy includes `(deleted_at IS NULL)` in the creator branch, so the wipe path's UPDATE deleted_at=now() must succeed via the creator+status='draft' branch BEFORE soft-delete (which is the moment UPDATE runs — deleted_at is still NULL at predicate eval time).

## Six focus areas

1. **submitBriefingAction RPC error mapping correctness.**
   - Verify 42501 + 'unauthenticated' message correctly catches the RPC's first guard. Verify 42501 + 'forbidden' message catches the client-not-creator branch. Verify P0002 maps to not_owner (project_not_found is functionally equivalent to "row missing under RLS scope" from caller's POV). Verify 23514 maps to wrong_status (invalid_transition covers both already-submitted and other-status cases).
   - Verify there's no scenario where the RPC succeeds but `historyId` is null/falsy that would incorrectly path to the db error branch. The RPC always RETURNs the new history id on success (RETURNING id INTO v_new_id at the bottom).
   - Verify `revalidatePath('/[locale]/app/projects', 'page')` is the correct pattern. (Note: yagi's stack has used this pattern in other Phase 5 actions; it's NOT a literal locale string but Next.js App Router's path-template form.)

2. **submitBriefingAction concurrency posture under RPC.**
   - The RPC takes FOR UPDATE on the projects row, so two concurrent submits serialize at Postgres lock layer. T1 wins, T2 waits, T2 retries the validation against post-T1 state, T2 fails is_valid_transition because status='submitted' now → 23514 → wrong_status toast. Correct.
   - Cross-tab same-session double-submit: same lock serialization. T1 ok, T2 wrong_status. Correct.
   - Verify the previous code's race-net (.eq('status','draft') in UPDATE) is no longer needed because the RPC's FOR UPDATE + matrix check supersedes it.

3. **Wipe path race conditions.**
   - SELECT dangling drafts (3 rows). T2 simultaneously calls submitBriefingAction on draft #2 (transitions draft #2 to submitted). T1 wipe path tries to DELETE briefing_documents for draft #2 — RLS policy requires p.status='draft', but draft #2 just flipped to 'submitted'. The DELETE returns 0 rows for #2 (not an error, just no match). Then T1 UPDATEs deleted_at=now() WHERE id IN (#1,#2,#3) AND status='draft' — draft #2 is filtered out by .eq('status','draft'). Result: drafts #1 and #3 are wiped, draft #2 remains as submitted. Then fresh INSERT — but wait, draft #2 is still occupying the unique slot? No — draft #2 is now status='submitted', so the partial-unique index (which still requires status='draft') no longer includes it. Fresh INSERT lands cleanly. Verify this reasoning.
   - SELECT finds drafts. Between SELECT and DELETE, an admin support tool deletes one of them via service-role hard-DELETE. The .in() DELETE returns one fewer row but no error. Then UPDATE for the deleted draft is also a no-op. Fresh INSERT proceeds. Acceptable.
   - The wipe DOES NOT go through the RPC because deleted_at write is not a status transition. The trg_guard_projects_status trigger only fires on status changes (verify by reading the trigger definition, which is out of scope here but assumed from yagi spec).

4. **UPDATE path fall-through correctness.**
   - With hotfix-6, an existing.deleted_at=set or existing missing case falls through to the wipe path. Verify the wipe path's SELECT (no-projectId branch) is reached cleanly when projectId WAS provided but proved stale. The wipe path uses (workspace_id, created_by, status='draft', intake_mode='brief', deleted_at IS NULL) — independent of the stale projectId, so it correctly enumerates currently-alive drafts for the same user+workspace.
   - Edge case: stale projectId points to a DIFFERENT user's row that's still alive. existing.created_by !== user.id branch triggers a forbidden return — but only inside the `if (existing && !existing.deleted_at)` block. Correct.

5. **Migration safety.**
   - DROP INDEX without CONCURRENTLY locks the projects table briefly. Phase 5 traffic minimal. Acceptable.
   - CREATE UNIQUE INDEX without CONCURRENTLY also takes a strong lock. Same trade. The DO-block assertion at the end fails the migration if the new indexdef lacks deleted_at IS NULL — this catches a typo'd CREATE silently leaving the old index in place.
   - The DROP/CREATE pair is not wrapped in a transaction here — Supabase's apply_migration wraps the whole script. Verify the wrap is sufficient. If apply_migration uses a single transaction, both DROP and CREATE land atomically; if it doesn't, there's a brief window where no unique index exists. Phase 5 < 100 user, < 5 in-flight drafts — acceptable.
   - 2 in-flight drafts in prod (verified via mcp earlier). Both have deleted_at IS NULL. Both pass the new constraint. No data conflicts.

6. **R2 orphan growth (FU-Phase5-5).**
   - Wipe hard-deletes briefing_documents but leaves R2 objects. Storage cost is bounded by user-id-prefixed objects per wipe cycle. yagi explicitly accepted this as deferred. Verify the comment in briefing-actions.ts captures the trade-off accurately and FU-Phase5-5 is registered (it should be, since yagi's spec mentions it).

## Already-deferred (do NOT flag again)

- FU-Phase5-3, FU-Phase5-4 (sub_5 carry-overs)
- FU-Phase5-5: R2 orphan cleanup job (registered in this hotfix)
- assertProjectMutationAuth duplication between step2 and step3 actions (LOOP 1 of task_06 v3 noted as intentional)
- has_plan column drop, projects.purpose column drop (yagi opted to keep)

## Scale-aware rule reminder

Phase 5 < 100 user, all-trusted. MED-B/C 3 conditions check before fix vs FU.

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — hotfix-6 ready for migration apply + yagi visual review."

End with one-line summary suitable for the run log.
