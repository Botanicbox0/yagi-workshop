Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: medium
reasoning summaries: none
session id: 019df293-2e47-7413-bd76-7b02f9f2bfec
--------
user
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

codex
I’ll review only the four scoped files plus the new migration, and I’ll keep this in a findings-first review posture. I’ll also verify the specific transition and wipe-path assumptions against the code rather than redoing the broader audit.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "submitBriefingAction|updateProjectCommitAction|transition_project_status|submit_not_owner|ensureBriefingDraftProject|projects_wizard_draft_uniq|FU-Phase5-5|briefing_documents|deleted_at" src/app/[locale]/app/projects/new/briefing-step3-actions.ts src/app/[locale]/app/projects/new/briefing-actions.ts src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "submit_not_owner" src messages public . -g "*.json" -g "*.ts" -g "*.tsx"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 383ms:
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:7://   - updateProjectCommitAction(input)  — autosave 5 commit fields
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:12://   - submitBriefingAction(input)       — atomic status transition
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:24:// briefing_documents policies; projects RLS already requires
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:26:// member-creator branch). After submitBriefingAction flips status, every
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:101:// 1. updateProjectCommitAction — Step 3 autosave for 5 commit fields
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:132:export async function updateProjectCommitAction(
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:175:    console.error("[updateProjectCommitAction] UPDATE error:", updErr);
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:186:// 2. submitBriefingAction — atomic status flip 'draft' → 'in_review'
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:207:export async function submitBriefingAction(
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:218:  // through the SECURITY DEFINER `transition_project_status` RPC, which:
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:250:    "transition_project_status",
src/app/[locale]/app/projects/new/briefing-step3-actions.ts:260:    console.error("[submitBriefingAction] RPC error:", rpcErr);
src/app/[locale]/app/projects/new/briefing-actions.ts:7://   - ensureBriefingDraftProject(input) — INSERT new draft OR UPDATE
src/app/[locale]/app/projects/new/briefing-actions.ts:13://   - addBriefingDocumentAction(input)              — INSERT briefing_documents
src/app/[locale]/app/projects/new/briefing-actions.ts:14://   - removeBriefingDocumentAction(input)           — DELETE briefing_documents
src/app/[locale]/app/projects/new/briefing-actions.ts:68:export async function ensureBriefingDraftProject(
src/app/[locale]/app/projects/new/briefing-actions.ts:100:  // hotfix-6: SELECT now also reads deleted_at. If the projectId points to
src/app/[locale]/app/projects/new/briefing-actions.ts:109:      .select("id, status, created_by, workspace_id, deleted_at")
src/app/[locale]/app/projects/new/briefing-actions.ts:113:      console.error("[ensureBriefingDraftProject] SELECT error:", selErr);
src/app/[locale]/app/projects/new/briefing-actions.ts:117:    if (existing && !existing.deleted_at) {
src/app/[locale]/app/projects/new/briefing-actions.ts:148:        console.error("[ensureBriefingDraftProject] UPDATE error:", updErr);
src/app/[locale]/app/projects/new/briefing-actions.ts:155:    // existing missing OR existing.deleted_at set → fall through.
src/app/[locale]/app/projects/new/briefing-actions.ts:166:  // So instead of reuse: hard-delete the prior briefing_documents AND
src/app/[locale]/app/projects/new/briefing-actions.ts:170:  // The unique index `projects_wizard_draft_uniq` was extended (migration
src/app/[locale]/app/projects/new/briefing-actions.ts:171:  // 20260504200000) to include `deleted_at IS NULL` in its WHERE predicate,
src/app/[locale]/app/projects/new/briefing-actions.ts:176:  // briefing_documents hard-delete (FU-Phase5-5 — periodic cleanup job
src/app/[locale]/app/projects/new/briefing-actions.ts:186:    .is("deleted_at", null);
src/app/[locale]/app/projects/new/briefing-actions.ts:189:      "[ensureBriefingDraftProject] dangling SELECT error:",
src/app/[locale]/app/projects/new/briefing-actions.ts:200:    // 1. briefing_documents hard delete. RLS DELETE policy already gates
src/app/[locale]/app/projects/new/briefing-actions.ts:204:      .from("briefing_documents")
src/app/[locale]/app/projects/new/briefing-actions.ts:209:        "[ensureBriefingDraftProject] docs delete error:",
src/app/[locale]/app/projects/new/briefing-actions.ts:216:    //    only deleted_at — so the unique index (now including
src/app/[locale]/app/projects/new/briefing-actions.ts:217:    //    deleted_at IS NULL) frees the slot for the fresh INSERT.
src/app/[locale]/app/projects/new/briefing-actions.ts:222:      .update({ deleted_at: new Date().toISOString() })
src/app/[locale]/app/projects/new/briefing-actions.ts:228:        "[ensureBriefingDraftProject] project soft-delete error:",
src/app/[locale]/app/projects/new/briefing-actions.ts:253:      "[ensureBriefingDraftProject] INSERT error:",
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:12://   3. [의뢰하기 →] CTA → AlertDialog confirm → submitBriefingAction
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:17:// for inFlightRef to drain before calling submitBriefingAction. Even if a
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:53:  updateProjectCommitAction,
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:54:  submitBriefingAction,
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:157:  // Initial fetch: projects row + briefing_documents counts.
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:173:          .from("briefing_documents")
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:234:      const res = await updateProjectCommitAction({
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:305:      const result = await submitBriefingAction({ projectId });
src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:313:                ? "briefing.step3.toast.submit_not_owner"
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:1:-- Phase 5 Wave B hotfix-6 — projects_wizard_draft_uniq lockdown to honor
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:4:-- Symptom: ensureBriefingDraftProject's dangling-draft wipe path
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:6:-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:9:-- ignores deleted_at, so the fresh INSERT collides with 23505.
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:12:-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:14:-- side is unchanged: a live draft with NULL deleted_at still blocks
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:21:DROP INDEX IF EXISTS public.projects_wizard_draft_uniq;
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:22:CREATE UNIQUE INDEX projects_wizard_draft_uniq
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:26:    AND deleted_at IS NULL;
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:35:      AND indexname = 'projects_wizard_draft_uniq';
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:37:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq missing after migration';
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:39:  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:40:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;

 succeeded in 392ms:
 M messages/en.json
 M messages/ko.json
 M src/app/[locale]/app/projects/new/briefing-actions.ts
 M src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx
 M src/app/[locale]/app/projects/new/briefing-step3-actions.ts
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop1.md
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop2.md
?? .yagi-autobuild/phase-5/_wave_a_task_01_result.md
?? .yagi-autobuild/phase-5/_wave_b_hotfix6_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_hotfix6_codex_loop1_prompt.md
?? .yagi-autobuild/phase-5/_wave_b_sub_5_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_04v3_codex_review.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop2_full.md
?? supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql

 succeeded in 843ms:
messages\ko.json:877:          "submit_not_owner": "이 프로젝트를 의뢰할 권한이 없습니다."
messages\en.json:877:          "submit_not_owner": "You do not have permission to submit this project."
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:313:                ? "briefing.step3.toast.submit_not_owner"
.\messages\ko.json:877:          "submit_not_owner": "이 프로젝트를 의뢰할 권한이 없습니다."
.\messages\en.json:877:          "submit_not_owner": "You do not have permission to submit this project."
.\src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:313:                ? "briefing.step3.toast.submit_not_owner"

codex
The scoped diff is present, and the new toast key exists in both locale files. I’m going deeper on the action bodies now, especially the stale-project fall-through and RPC result handling.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-step3-actions.ts' | Select-Object -Skip 190 -First 100" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-actions.ts' | Select-Object -Skip 60 -First 220" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx' | Select-Object -Skip 295 -First 35" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 406ms:
-- Phase 5 Wave B hotfix-6 ??projects_wizard_draft_uniq lockdown to honor
-- soft-delete.
--
-- Symptom: ensureBriefingDraftProject's dangling-draft wipe path
-- (?듭뀡 A ??yagi visual review hotfix-6) soft-deletes existing drafts
-- (deleted_at = now()) then INSERTs a fresh draft. Without this index
-- amendment, the soft-deleted row's (workspace_id, created_by) pair
-- still occupies the unique slot because the existing index predicate
-- ignores deleted_at, so the fresh INSERT collides with 23505.
--
-- Fix: extend the partial-index WHERE clause to require
-- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
-- and the fresh INSERT lands cleanly. Behavior on the active draft
-- side is unchanged: a live draft with NULL deleted_at still blocks
-- a second concurrent draft for the same (workspace_id, created_by).
--
-- This is non-destructive: no rows change, no policies change, no
-- grants change. The DROP + CREATE pair locks the table briefly for
-- index rebuild (Phase 5 < 100 user, traffic minimal).

DROP INDEX IF EXISTS public.projects_wizard_draft_uniq;
CREATE UNIQUE INDEX projects_wizard_draft_uniq
  ON public.projects (workspace_id, created_by)
  WHERE status = 'draft'
    AND intake_mode = 'brief'
    AND deleted_at IS NULL;

DO $$
DECLARE
  v_indexdef text;
BEGIN
  SELECT indexdef INTO v_indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'projects_wizard_draft_uniq';
  IF v_indexdef IS NULL THEN
    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq missing after migration';
  END IF;
  IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL ??got: %', v_indexdef;
  END IF;
END $$;

 succeeded in 443ms:
      const serialized = JSON.stringify(form);
      if (serialized !== lastCommittedRef.current) {
        await runSave(form);
      }
      // Drain any queued save.
      while (inFlightRef.current) {
        await new Promise((r) => setTimeout(r, 50));
      }

      const result = await submitBriefingAction({ projectId });
      if (!result.ok) {
        const key =
          result.error === "unauthenticated"
            ? "briefing.step3.toast.submit_unauthorized"
            : result.error === "wrong_status"
              ? "briefing.step3.toast.submit_wrong_status"
              : result.error === "not_owner"
                ? "briefing.step3.toast.submit_not_owner"
                : "briefing.step3.toast.submit_failed";
        toast.error(t(key));
        return;
      }
      try {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // sessionStorage failure shouldn't block the redirect
      }
      toast.success(t("briefing.step3.toast.submit_success"));
      router.push("/app/projects");
    });
  };

  if (loading || !summary) {
    return (
      <div className="min-h-dvh flex items-center justify-center">

 succeeded in 448ms:
        | "no_workspace"
        | "forbidden"
        | "not_found"
        | "db";
      message?: string;
    };

export async function ensureBriefingDraftProject(
  input: unknown,
): Promise<EnsureBriefingDraftResult> {
  const parsed = ensureBriefingDraftInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    return { ok: false, error: "no_workspace" };
  }

  // The `purpose` text[] column is added by migration 20260504162550 and is
  // not in the auto-generated database.types.ts yet. Cast to any for the
  // INSERT/UPDATE call sites only ??same pattern Phase 3.0+ uses for
  // newly-added columns awaiting the supabase gen types refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new Phase 5 columns not in generated types
  const sb = supabase as any;

  // ---------- UPDATE path (only when caller passes an alive draft id) ----------
  //
  // hotfix-6: SELECT now also reads deleted_at. If the projectId points to
  // a wiped or hard-deleted row (sessionStorage stale after a prior wipe,
  // or a different tab triggered a wipe), we do NOT surface 'not_found' ??  // we silently fall through to the wipe-then-INSERT path below so the
  // user gets a fresh canvas. The "new project" mental model wins over
  // the "resume your draft" mental model per yagi visual review.
  if (data.projectId) {
    const { data: existing, error: selErr } = await sb
      .from("projects")
      .select("id, status, created_by, workspace_id, deleted_at")
      .eq("id", data.projectId)
      .maybeSingle();
    if (selErr) {
      console.error("[ensureBriefingDraftProject] SELECT error:", selErr);
      return { ok: false, error: "db", message: selErr.message };
    }

    if (existing && !existing.deleted_at) {
      // Alive row ??validate and UPDATE.
      if (existing.created_by !== user.id) {
        return { ok: false, error: "forbidden" };
      }
      if (existing.status !== "draft") {
        return {
          ok: false,
          error: "forbidden",
          message: "project is no longer draft",
        };
      }
      if (existing.workspace_id !== active.id) {
        return {
          ok: false,
          error: "forbidden",
          message: "workspace mismatch",
        };
      }

      const { error: updErr } = await sb
        .from("projects")
        .update({
          title: data.name,
          deliverable_types: data.deliverable_types,
          brief: data.description ?? null,
        })
        .eq("id", data.projectId)
        .eq("created_by", user.id)
        .eq("status", "draft");
      if (updErr) {
        console.error("[ensureBriefingDraftProject] UPDATE error:", updErr);
        return { ok: false, error: "db", message: updErr.message };
      }

      revalidatePath("/[locale]/app/projects", "page");
      return { ok: true, projectId: data.projectId };
    }
    // existing missing OR existing.deleted_at set ??fall through.
  }

  // ---------- Wipe-then-INSERT path (?듭뀡 A ??yagi visual review hotfix-6) ----------
  //
  // Earlier hotfix-3 added a SELECT-then-reuse step that would resume the
  // existing draft if one was open for (workspace, user, intake='brief').
  // yagi visual feedback: the "???꾨줈?앺듃" mental model wins ??re-entering
  // /projects/new should always open a fresh canvas, even at the cost of
  // discarding the previous draft's references and metadata.
  //
  // So instead of reuse: hard-delete the prior briefing_documents AND
  // soft-delete the prior projects rows for this (workspace, user, brief,
  // alive draft) tuple, then fall through to the fresh INSERT below.
  //
  // The unique index `projects_wizard_draft_uniq` was extended (migration
  // 20260504200000) to include `deleted_at IS NULL` in its WHERE predicate,
  // so soft-deleted drafts no longer occupy the unique slot ??the fresh
  // INSERT is collision-free.
  //
  // R2 objects under briefing-docs/<user-id>/... remain after the
  // briefing_documents hard-delete (FU-Phase5-5 ??periodic cleanup job
  // or per-wipe DELETE). The objects' prefix is bound to the user's id,
  // so external exposure is zero; the worst-case is storage cost growth.
  const { data: existingDrafts, error: selDraftErr } = await sb
    .from("projects")
    .select("id")
    .eq("workspace_id", active.id)
    .eq("created_by", user.id)
    .eq("status", "draft")
    .eq("intake_mode", "brief")
    .is("deleted_at", null);
  if (selDraftErr) {
    console.error(
      "[ensureBriefingDraftProject] dangling SELECT error:",
      selDraftErr,
    );
    return { ok: false, error: "db", message: selDraftErr.message };
  }

  if (existingDrafts && existingDrafts.length > 0) {
    const draftIds = (existingDrafts as Array<{ id: string }>).map(
      (d) => d.id,
    );

    // 1. briefing_documents hard delete. RLS DELETE policy already gates
    //    by workspace_member + status='draft' + created_by ??passes for
    //    our dangling drafts since they're still status='draft' here.
    const { error: docsDelErr } = await sb
      .from("briefing_documents")
      .delete()
      .in("project_id", draftIds);
    if (docsDelErr) {
      console.error(
        "[ensureBriefingDraftProject] docs delete error:",
        docsDelErr,
      );
      return { ok: false, error: "db", message: docsDelErr.message };
    }

    // 2. project soft-delete. We deliberately do NOT change status ??    //    only deleted_at ??so the unique index (now including
    //    deleted_at IS NULL) frees the slot for the fresh INSERT.
    //    eq filters mirror the SELECT above as defense-in-depth against
    //    a status flip racing with this step.
    const { error: projDelErr } = await sb
      .from("projects")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", draftIds)
      .eq("created_by", user.id)
      .eq("status", "draft");
    if (projDelErr) {
      console.error(
        "[ensureBriefingDraftProject] project soft-delete error:",
        projDelErr,
      );
      return { ok: false, error: "db", message: projDelErr.message };
    }
  }

  // Fresh INSERT ??guaranteed unique-slot-free by the wipe above.
  const { data: project, error: insErr } = await sb
    .from("projects")
    .insert({
      workspace_id: active.id,
      created_by: user.id,
      project_type: "direct_commission" as const,
      kind: "direct" as const,
      status: "draft" as const,
      intake_mode: "brief" as const,
      title: data.name,
      deliverable_types: data.deliverable_types,
      brief: data.description ?? null,
    })
    .select("id")
    .single();
  if (insErr || !project) {
    console.error(
      "[ensureBriefingDraftProject] INSERT error:",
      insErr,
    );
    return {
      ok: false,
      error: "db",
      message: insErr?.message ?? "insert failed",
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, projectId: project.id };
}

 succeeded in 483ms:
});

export type SubmitBriefingResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_owner"
        | "wrong_status"
        | "db";
      message?: string;
    };

export async function submitBriefingAction(
  input: unknown,
): Promise<SubmitBriefingResult> {
  const parsed = submitInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  // hotfix-6: direct UPDATE of projects.status is rejected by the
  // BEFORE-UPDATE trigger trg_guard_projects_status (raises
  // 'direct_status_update_forbidden'). Every status transition must go
  // through the SECURITY DEFINER `transition_project_status` RPC, which:
  //   - validates auth.uid() (client may only transition own projects)
  //   - takes a row-level FOR UPDATE lock so concurrent submits serialize
  //   - validates the transition against the state-machine matrix
  //     (client: draft ??submitted is allowed; draft ??in_review is NOT ??  //     in_review is reserved for system / yagi_admin)
  //   - sets submitted_at when p_to_status='submitted'
  //   - inserts a project_status_history audit row inside the same
  //     transaction
  //   - returns the new history id
  //
  // Auth helper is not needed ??the RPC verifies auth.uid() and ownership
  // via SECURITY DEFINER. We still call createSupabaseServer to ensure the
  // RPC sees the caller's auth.uid() (anon-key client would NULL it).
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  // resolveActiveWorkspace is intentionally called before the RPC even
  // though the RPC does not consult workspace context ??it surfaces a
  // clean no_workspace error to the client (mid-onboarding edge) before
  // round-tripping to Postgres.
  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;

  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "submitted",
      // p_comment defaults to NULL; only required for in_revision
      // transitions (which the client cannot trigger).
    },
  );

  if (rpcErr) {
    console.error("[submitBriefingAction] RPC error:", rpcErr);
    // Map RPC RAISE EXCEPTION codes to client-facing error union.
    const code = rpcErr.code as string | undefined;
    const msg = (rpcErr.message ?? "") as string;
    if (code === "42501" && msg.includes("unauthenticated")) {
      return { ok: false, error: "unauthenticated" };
    }
    if (code === "42501" && msg.includes("forbidden")) {
      return { ok: false, error: "not_owner" };
    }
    if (code === "P0002") {
      // project_not_found ??RLS scope or hard delete
      return { ok: false, error: "not_owner" };
    }
    if (code === "23514") {
      // invalid_transition ??already submitted, or status no longer draft
      return { ok: false, error: "wrong_status" };
    }
    return { ok: false, error: "db", message: msg };
  }

  if (!historyId) {
    return { ok: false, error: "db", message: "RPC returned null history id" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, projectId: parsed.data.projectId };
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-actions.ts' | Select-Object -First 80" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-step3-actions.ts' | Select-Object -First 190" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'messages/en.json','messages/ko.json' -Pattern 'submit_not_owner' -Context 4,4" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 435ms:
"use server";

// =============================================================================
// Phase 5 Wave B briefing-canvas server actions
//
// task_04 v3 (Step 1 ??Step 2 transition):
//   - ensureBriefingDraftProject(input) ??INSERT new draft OR UPDATE
//     existing draft with Step 1's 4 fields (name + deliverable_types
//     + purpose + description?).
//
// task_05 v3 (Step 2 ??workspace 3-column + autosave):
//   - getBriefingDocumentPutUrlAction(input)        ??R2 presigned PUT
//   - addBriefingDocumentAction(input)              ??INSERT briefing_documents
//   - removeBriefingDocumentAction(input)           ??DELETE briefing_documents
//   - updateBriefingDocumentNoteAction(input)       ??UPDATE note/category only
//   - updateProjectMetadataAction(input)            ??autosave 7+ sidebar fields
//
// Authorization model ??Phase 4.x sub_03f_5 F4 pattern reused:
//   - createSupabaseServer (user-scoped)
//   - resolveActiveWorkspace for active workspace id
//   - explicit project ownership / workspace-membership re-verify before
//     any write, even though RLS already gates row scope
//   - status='draft' guard on every Step 2 write (no metadata changes
//     after the project transitions to in_review)
//   - storage_key prefix bound to auth.uid() in the upload presign +
//     re-validated on INSERT (sub_03f_5 F2 pattern)
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Step 1 input schema
//
// Matches stage1Schema in briefing-canvas.tsx but trimmed to the v3 minimal
// 3-field set + name. Optional projectId allows back-and-forward navigation
// to UPDATE an existing draft instead of orphaning it.
// ---------------------------------------------------------------------------

const ensureBriefingDraftInput = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(15),
  description: z.string().trim().max(500).optional().nullable(),
});

export type EnsureBriefingDraftInput = z.input<typeof ensureBriefingDraftInput>;

export type EnsureBriefingDraftResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "forbidden"
        | "not_found"
        | "db";
      message?: string;
    };

export async function ensureBriefingDraftProject(
  input: unknown,
): Promise<EnsureBriefingDraftResult> {
  const parsed = ensureBriefingDraftInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,

 succeeded in 429ms:
"use server";

// =============================================================================
// Phase 5 Wave B task_06 v3 ??Step 3 commit + submit server actions
//
// Two actions:
//   - updateProjectCommitAction(input)  ??autosave 5 commit fields
//                                          (budget_band, target_delivery_at,
//                                           meeting_preferred_at,
//                                           interested_in_twin,
//                                           additional_notes)
//   - submitBriefingAction(input)       ??atomic status transition
//                                          'draft' ??'in_review'
//
// Authorization:
//   Same assertProjectMutationAuth pattern as briefing-step2-actions:
//     1. createSupabaseServer (user-scoped)
//     2. resolveActiveWorkspace
//     3. SELECT project + verify workspace + status='draft' + creator
//     4. UPDATE with explicit eq('status', 'draft') for TOCTOU defense
//
// status='draft' enforcement on commit-field UPDATE is doubled at the RLS
// layer (sub_5 migration adds parent-status='draft' predicate to the
// briefing_documents policies; projects RLS already requires
// (created_by AND status='draft') OR ws_admin OR yagi_admin for the
// member-creator branch). After submitBriefingAction flips status, every
// subsequent commit-field UPDATE from the user-scoped client returns 0
// rows ??no separate revoke needed.
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Auth helper ??duplicated from briefing-step2-actions to keep that file's
// "use server" surface minimal (every export from a "use server" file is a
// server action; we don't want this helper exposed as one).
// ---------------------------------------------------------------------------

async function assertProjectMutationAuth(projectId: string): Promise<
  | {
      ok: true;
      userId: string;
      workspaceId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      sb: any;
    }
  | {
      ok: false;
      error: "unauthenticated" | "no_workspace" | "not_found" | "forbidden";
      message?: string;
    }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, workspace_id, status, created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (selErr) {
    console.error("[step3 assertProjectMutationAuth] SELECT error:", selErr);
    return { ok: false, error: "forbidden", message: selErr.message };
  }
  if (!project) return { ok: false, error: "not_found" };
  if (project.workspace_id !== active.id) {
    return { ok: false, error: "forbidden", message: "workspace mismatch" };
  }
  if (project.created_by !== user.id) {
    return { ok: false, error: "forbidden", message: "not creator" };
  }
  if (project.status !== "draft") {
    return {
      ok: false,
      error: "forbidden",
      message: "project is no longer draft",
    };
  }
  return {
    ok: true,
    userId: user.id,
    workspaceId: active.id,
    sb,
  };
}

// ===========================================================================
// 1. updateProjectCommitAction ??Step 3 autosave for 5 commit fields
// ===========================================================================

const commitInput = z.object({
  projectId: z.string().uuid(),
  // All 5 fields optional. undefined = "don't change", null = "clear".
  budget_band: z
    .enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"])
    .optional()
    .nullable(),
  target_delivery_at: z.string().nullable().optional(),
  meeting_preferred_at: z.string().datetime().nullable().optional(),
  interested_in_twin: z.boolean().optional(),
  additional_notes: z.string().trim().max(2000).optional().nullable(),
});

export type UpdateProjectCommitResult =
  | { ok: true; savedAt: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "wrong_status"
        | "db";
      message?: string;
    };

export async function updateProjectCommitAction(
  input: unknown,
): Promise<UpdateProjectCommitResult> {
  const parsed = commitInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const auth = await assertProjectMutationAuth(parsed.data.projectId);
  if (!auth.ok) return auth;

  const payload: Record<string, unknown> = {};
  const fields = [
    "budget_band",
    "target_delivery_at",
    "meeting_preferred_at",
    "interested_in_twin",
    "additional_notes",
  ] as const;
  for (const f of fields) {
    const v = parsed.data[f];
    if (v !== undefined) payload[f] = v;
  }
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "validation", message: "no field to update" };
  }

  // Defense-in-depth: WHERE status='draft' inside the UPDATE itself, so a
  // status flip between assertProjectMutationAuth and this UPDATE is
  // caught at the row layer. RLS would also reject it.
  //
  // F2 fix (K-05 LOOP 1 MED): .select('id') + length check distinguishes
  // "0 rows matched" (status flipped between auth and UPDATE ??caller
  // should see wrong_status, not the lying ok:true that the previous
  // code returned and that was being rendered as "saved" on the autosave
  // indicator). RLS-denied UPDATEs return [] without an error too ??same
  // wrong_status surface.
  const { data: updatedRows, error: updErr } = await auth.sb
    .from("projects")
    .update(payload)
    .eq("id", parsed.data.projectId)
    .eq("status", "draft")
    .select("id");
  if (updErr) {
    console.error("[updateProjectCommitAction] UPDATE error:", updErr);
    return { ok: false, error: "db", message: updErr.message };
  }
  if (!updatedRows || updatedRows.length === 0) {
    return { ok: false, error: "wrong_status" };
  }

  return { ok: true, savedAt: new Date().toISOString() };
}

// ===========================================================================
// 2. submitBriefingAction ??atomic status flip 'draft' ??'in_review'
// ===========================================================================

const submitInput = z.object({
  projectId: z.string().uuid(),

 succeeded in 449ms:

  messages\en.json:873:          "submit_success": "Submitted. The YAGI team will start the review shortly.",
  messages\en.json:874:          "submit_failed": "Submission failed. Please try again.",
  messages\en.json:875:          "submit_unauthorized": "Not authorized. Please sign in again.",
  messages\en.json:876:          "submit_wrong_status": "This project has already been submitted.",
> messages\en.json:877:          "submit_not_owner": "You do not have permission to submit this project."
  messages\en.json:878:        },
  messages\en.json:879:        "placeholder": {
  messages\en.json:880:          "eyebrow": "STEP 3 / 3 — CONFIRM",
  messages\en.json:881:          "title": "Please go back to Step 1",
  messages\ko.json:873:          "submit_success": "의뢰가 접수됐어요. 야기 팀이 곧 검토를 시작합니다.",
  messages\ko.json:874:          "submit_failed": "의뢰에 실패했습니다. 다시 시도해주세요.",
  messages\ko.json:875:          "submit_unauthorized": "권한이 없습니다. 다시 로그인해주세요.",
  messages\ko.json:876:          "submit_wrong_status": "이미 의뢰된 프로젝트입니다.",
> messages\ko.json:877:          "submit_not_owner": "이 프로젝트를 의뢰할 권한이 없습니다."
  messages\ko.json:878:        },
  messages\ko.json:879:        "placeholder": {
  messages\ko.json:880:          "eyebrow": "STEP 3 / 3 — 확인",
  messages\ko.json:881:          "title": "Step 1 으로 돌아가 주세요",



codex
The implementation matches the requested shape at a high level: submit no longer calls the local auth helper, and the wipe path no longer reuses an alive wizard draft. I’m checking the underlying SQL definitions now for exact error-message casing and any trigger/index details that could affect the review.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "transition_project_status|direct_status_update_forbidden|trg_guard_projects_status|projects_wizard_draft_uniq|project_not_found|invalid_transition|unauthenticated|forbidden" supabase src -g "*.sql" -g "*.ts" -g "*.tsx"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-step3-actions.ts' | ForEach-Object { "'$i++; if ($i -ge 207 -and $i -le 282) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-actions.ts' | ForEach-Object { "'$i++; if ($i -ge 96 -and $i -le 262) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 423ms:
 207: export async function submitBriefingAction(
 208:   input: unknown,
 209: ): Promise<SubmitBriefingResult> {
 210:   const parsed = submitInput.safeParse(input);
 211:   if (!parsed.success) {
 212:     return { ok: false, error: "validation", message: parsed.error.message };
 213:   }
 214: 
 215:   // hotfix-6: direct UPDATE of projects.status is rejected by the
 216:   // BEFORE-UPDATE trigger trg_guard_projects_status (raises
 217:   // 'direct_status_update_forbidden'). Every status transition must go
 218:   // through the SECURITY DEFINER `transition_project_status` RPC, which:
 219:   //   - validates auth.uid() (client may only transition own projects)
 220:   //   - takes a row-level FOR UPDATE lock so concurrent submits serialize
 221:   //   - validates the transition against the state-machine matrix
 222:   //     (client: draft ??submitted is allowed; draft ??in_review is NOT ??  //     in_review is reserved for system / yagi_admin)
 223:   //   - sets submitted_at when p_to_status='submitted'
 224:   //   - inserts a project_status_history audit row inside the same
 225:   //     transaction
 226:   //   - returns the new history id
 227:   //
 228:   // Auth helper is not needed ??the RPC verifies auth.uid() and ownership
 229:   // via SECURITY DEFINER. We still call createSupabaseServer to ensure the
 230:   // RPC sees the caller's auth.uid() (anon-key client would NULL it).
 231:   const supabase = await createSupabaseServer();
 232:   const {
 233:     data: { user },
 234:     error: authErr,
 235:   } = await supabase.auth.getUser();
 236:   if (authErr || !user) return { ok: false, error: "unauthenticated" };
 237: 
 238:   // resolveActiveWorkspace is intentionally called before the RPC even
 239:   // though the RPC does not consult workspace context ??it surfaces a
 240:   // clean no_workspace error to the client (mid-onboarding edge) before
 241:   // round-tripping to Postgres.
 242:   const active = await resolveActiveWorkspace(user.id);
 243:   if (!active) return { ok: false, error: "no_workspace" };
 244: 
 245:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
 246:   const sb = supabase as any;
 247: 
 248:   const { data: historyId, error: rpcErr } = await sb.rpc(
 249:     "transition_project_status",
 250:     {
 251:       p_project_id: parsed.data.projectId,
 252:       p_to_status: "submitted",
 253:       // p_comment defaults to NULL; only required for in_revision
 254:       // transitions (which the client cannot trigger).
 255:     },
 256:   );
 257: 
 258:   if (rpcErr) {
 259:     console.error("[submitBriefingAction] RPC error:", rpcErr);
 260:     // Map RPC RAISE EXCEPTION codes to client-facing error union.
 261:     const code = rpcErr.code as string | undefined;
 262:     const msg = (rpcErr.message ?? "") as string;
 263:     if (code === "42501" && msg.includes("unauthenticated")) {
 264:       return { ok: false, error: "unauthenticated" };
 265:     }
 266:     if (code === "42501" && msg.includes("forbidden")) {
 267:       return { ok: false, error: "not_owner" };
 268:     }
 269:     if (code === "P0002") {
 270:       // project_not_found ??RLS scope or hard delete
 271:       return { ok: false, error: "not_owner" };
 272:     }
 273:     if (code === "23514") {
 274:       // invalid_transition ??already submitted, or status no longer draft
 275:       return { ok: false, error: "wrong_status" };
 276:     }
 277:     return { ok: false, error: "db", message: msg };
 278:   }
 279: 
 280:   if (!historyId) {
 281:     return { ok: false, error: "db", message: "RPC returned null history id" };
 282:   }

 succeeded in 434ms:
   1: -- Phase 5 Wave B hotfix-6 ??projects_wizard_draft_uniq lockdown to honor
   2: -- soft-delete.
   3: --
   4: -- Symptom: ensureBriefingDraftProject's dangling-draft wipe path
   5: -- (?듭뀡 A ??yagi visual review hotfix-6) soft-deletes existing drafts
   6: -- (deleted_at = now()) then INSERTs a fresh draft. Without this index
   7: -- amendment, the soft-deleted row's (workspace_id, created_by) pair
   8: -- still occupies the unique slot because the existing index predicate
   9: -- ignores deleted_at, so the fresh INSERT collides with 23505.
  10: --
  11: -- Fix: extend the partial-index WHERE clause to require
  12: -- deleted_at IS NULL. Soft-deleted drafts no longer occupy the slot
  13: -- and the fresh INSERT lands cleanly. Behavior on the active draft
  14: -- side is unchanged: a live draft with NULL deleted_at still blocks
  15: -- a second concurrent draft for the same (workspace_id, created_by).
  16: --
  17: -- This is non-destructive: no rows change, no policies change, no
  18: -- grants change. The DROP + CREATE pair locks the table briefly for
  19: -- index rebuild (Phase 5 < 100 user, traffic minimal).
  20: 
  21: DROP INDEX IF EXISTS public.projects_wizard_draft_uniq;
  22: CREATE UNIQUE INDEX projects_wizard_draft_uniq
  23:   ON public.projects (workspace_id, created_by)
  24:   WHERE status = 'draft'
  25:     AND intake_mode = 'brief'
  26:     AND deleted_at IS NULL;
  27: 
  28: DO $$
  29: DECLARE
  30:   v_indexdef text;
  31: BEGIN
  32:   SELECT indexdef INTO v_indexdef
  33:     FROM pg_indexes
  34:     WHERE schemaname = 'public'
  35:       AND indexname = 'projects_wizard_draft_uniq';
  36:   IF v_indexdef IS NULL THEN
  37:     RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq missing after migration';
  38:   END IF;
  39:   IF v_indexdef NOT LIKE '%deleted_at IS NULL%' THEN
  40:     RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL ??got: %', v_indexdef;
  41:   END IF;
  42: END $$;

 succeeded in 450ms:
  96:   const sb = supabase as any;
  97: 
  98:   // ---------- UPDATE path (only when caller passes an alive draft id) ----------
  99:   //
 100:   // hotfix-6: SELECT now also reads deleted_at. If the projectId points to
 101:   // a wiped or hard-deleted row (sessionStorage stale after a prior wipe,
 102:   // or a different tab triggered a wipe), we do NOT surface 'not_found' ??  // we silently fall through to the wipe-then-INSERT path below so the
 103:   // user gets a fresh canvas. The "new project" mental model wins over
 104:   // the "resume your draft" mental model per yagi visual review.
 105:   if (data.projectId) {
 106:     const { data: existing, error: selErr } = await sb
 107:       .from("projects")
 108:       .select("id, status, created_by, workspace_id, deleted_at")
 109:       .eq("id", data.projectId)
 110:       .maybeSingle();
 111:     if (selErr) {
 112:       console.error("[ensureBriefingDraftProject] SELECT error:", selErr);
 113:       return { ok: false, error: "db", message: selErr.message };
 114:     }
 115: 
 116:     if (existing && !existing.deleted_at) {
 117:       // Alive row ??validate and UPDATE.
 118:       if (existing.created_by !== user.id) {
 119:         return { ok: false, error: "forbidden" };
 120:       }
 121:       if (existing.status !== "draft") {
 122:         return {
 123:           ok: false,
 124:           error: "forbidden",
 125:           message: "project is no longer draft",
 126:         };
 127:       }
 128:       if (existing.workspace_id !== active.id) {
 129:         return {
 130:           ok: false,
 131:           error: "forbidden",
 132:           message: "workspace mismatch",
 133:         };
 134:       }
 135: 
 136:       const { error: updErr } = await sb
 137:         .from("projects")
 138:         .update({
 139:           title: data.name,
 140:           deliverable_types: data.deliverable_types,
 141:           brief: data.description ?? null,
 142:         })
 143:         .eq("id", data.projectId)
 144:         .eq("created_by", user.id)
 145:         .eq("status", "draft");
 146:       if (updErr) {
 147:         console.error("[ensureBriefingDraftProject] UPDATE error:", updErr);
 148:         return { ok: false, error: "db", message: updErr.message };
 149:       }
 150: 
 151:       revalidatePath("/[locale]/app/projects", "page");
 152:       return { ok: true, projectId: data.projectId };
 153:     }
 154:     // existing missing OR existing.deleted_at set ??fall through.
 155:   }
 156: 
 157:   // ---------- Wipe-then-INSERT path (?듭뀡 A ??yagi visual review hotfix-6) ----------
 158:   //
 159:   // Earlier hotfix-3 added a SELECT-then-reuse step that would resume the
 160:   // existing draft if one was open for (workspace, user, intake='brief').
 161:   // yagi visual feedback: the "???꾨줈?앺듃" mental model wins ??re-entering
 162:   // /projects/new should always open a fresh canvas, even at the cost of
 163:   // discarding the previous draft's references and metadata.
 164:   //
 165:   // So instead of reuse: hard-delete the prior briefing_documents AND
 166:   // soft-delete the prior projects rows for this (workspace, user, brief,
 167:   // alive draft) tuple, then fall through to the fresh INSERT below.
 168:   //
 169:   // The unique index `projects_wizard_draft_uniq` was extended (migration
 170:   // 20260504200000) to include `deleted_at IS NULL` in its WHERE predicate,
 171:   // so soft-deleted drafts no longer occupy the unique slot ??the fresh
 172:   // INSERT is collision-free.
 173:   //
 174:   // R2 objects under briefing-docs/<user-id>/... remain after the
 175:   // briefing_documents hard-delete (FU-Phase5-5 ??periodic cleanup job
 176:   // or per-wipe DELETE). The objects' prefix is bound to the user's id,
 177:   // so external exposure is zero; the worst-case is storage cost growth.
 178:   const { data: existingDrafts, error: selDraftErr } = await sb
 179:     .from("projects")
 180:     .select("id")
 181:     .eq("workspace_id", active.id)
 182:     .eq("created_by", user.id)
 183:     .eq("status", "draft")
 184:     .eq("intake_mode", "brief")
 185:     .is("deleted_at", null);
 186:   if (selDraftErr) {
 187:     console.error(
 188:       "[ensureBriefingDraftProject] dangling SELECT error:",
 189:       selDraftErr,
 190:     );
 191:     return { ok: false, error: "db", message: selDraftErr.message };
 192:   }
 193: 
 194:   if (existingDrafts && existingDrafts.length > 0) {
 195:     const draftIds = (existingDrafts as Array<{ id: string }>).map(
 196:       (d) => d.id,
 197:     );
 198: 
 199:     // 1. briefing_documents hard delete. RLS DELETE policy already gates
 200:     //    by workspace_member + status='draft' + created_by ??passes for
 201:     //    our dangling drafts since they're still status='draft' here.
 202:     const { error: docsDelErr } = await sb
 203:       .from("briefing_documents")
 204:       .delete()
 205:       .in("project_id", draftIds);
 206:     if (docsDelErr) {
 207:       console.error(
 208:         "[ensureBriefingDraftProject] docs delete error:",
 209:         docsDelErr,
 210:       );
 211:       return { ok: false, error: "db", message: docsDelErr.message };
 212:     }
 213: 
 214:     // 2. project soft-delete. We deliberately do NOT change status ??    //    only deleted_at ??so the unique index (now including
 215:     //    deleted_at IS NULL) frees the slot for the fresh INSERT.
 216:     //    eq filters mirror the SELECT above as defense-in-depth against
 217:     //    a status flip racing with this step.
 218:     const { error: projDelErr } = await sb
 219:       .from("projects")
 220:       .update({ deleted_at: new Date().toISOString() })
 221:       .in("id", draftIds)
 222:       .eq("created_by", user.id)
 223:       .eq("status", "draft");
 224:     if (projDelErr) {
 225:       console.error(
 226:         "[ensureBriefingDraftProject] project soft-delete error:",
 227:         projDelErr,
 228:       );
 229:       return { ok: false, error: "db", message: projDelErr.message };
 230:     }
 231:   }
 232: 
 233:   // Fresh INSERT ??guaranteed unique-slot-free by the wipe above.
 234:   const { data: project, error: insErr } = await sb
 235:     .from("projects")
 236:     .insert({
 237:       workspace_id: active.id,
 238:       created_by: user.id,
 239:       project_type: "direct_commission" as const,
 240:       kind: "direct" as const,
 241:       status: "draft" as const,
 242:       intake_mode: "brief" as const,
 243:       title: data.name,
 244:       deliverable_types: data.deliverable_types,
 245:       brief: data.description ?? null,
 246:     })
 247:     .select("id")
 248:     .single();
 249:   if (insErr || !project) {
 250:     console.error(
 251:       "[ensureBriefingDraftProject] INSERT error:",
 252:       insErr,
 253:     );
 254:     return {
 255:       ok: false,
 256:       error: "db",
 257:       message: insErr?.message ?? "insert failed",
 258:     };
 259:   }
 260: 
 261:   revalidatePath("/[locale]/app/projects", "page");
 262:   return { ok: true, projectId: project.id };

 succeeded in 839ms:
supabase\functions\notify-dispatch\index.ts:464:    return new Response(JSON.stringify({ error: "forbidden" }), {
src\components\brief-board\editor.tsx:299:            case "unauthenticated":
src\components\brief-board\editor.tsx:300:              setSaveState({ kind: "failed", reason: "unauthenticated" });
src\components\brief-board\editor.tsx:301:              toast.error(t("save_unauthenticated"));
src\components\brief-board\editor.tsx:313:            case "forbidden":
src\app\api\health\google\route.ts:11:    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
src\app\api\health\google\route.ts:22:    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
src\app\challenges\[slug]\submit\actions.ts:72:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\challenges\[slug]\submit\actions.ts:145:        | "unauthenticated"
src\app\challenges\[slug]\submit\actions.ts:158:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\challenges\[slug]\gallery\actions.ts:18:    return { ok: false, error: "unauthenticated" };
src\lib\workspace\actions.ts:22:  | { ok: false; error: "unauthenticated" | "not_a_member" | "invalid" };
src\lib\workspace\actions.ts:38:  if (!user) return { ok: false, error: "unauthenticated" };
src\components\meetings\new-meeting-form.tsx:177:        } else if (result.error === "forbidden") {
src\lib\popbill\client.ts:11:    "POPBILL_MODE=mock is forbidden in production. Set POPBILL_MODE=production with real credentials."
src\components\sidebar\workspace-switcher.tsx:73:          result.error === "unauthenticated"
src\components\sidebar\workspace-switcher.tsx:74:            ? "errors.unauthenticated"
src\app\[locale]\app\team\[slug]\actions.ts:49:        | "forbidden"
src\app\[locale]\app\team\[slug]\actions.ts:280:  | { ok: false; error: "auth_required" | "forbidden" };
src\app\[locale]\app\team\[slug]\actions.ts:300:  return { ok: false, error: "forbidden" };
src\app\[locale]\app\team\[slug]\actions.ts:393:      error: "auth_required" | "forbidden" | "validation" | "name_taken" | "db";
src\app\[locale]\app\team\[slug]\actions.ts:445:  | { ok: false; error: "auth_required" | "forbidden" | "validation" | "db" };
src\app\[locale]\app\team\[slug]\actions.ts:484:  | { ok: false; error: "auth_required" | "forbidden" | "validation" | "db" };
src\app\[locale]\app\team\[slug]\actions.ts:537:      error: "auth_required" | "forbidden" | "validation" | "not_found" | "db";
src\app\[locale]\app\team\[slug]\actions.ts:566:    if (!allowed) return { ok: false, error: "forbidden" };
src\app\[locale]\app\team\[slug]\actions.ts:595:        | "forbidden"
src\app\[locale]\app\team\[slug]\actions.ts:619:    if (msg.author_id !== user.id) return { ok: false, error: "forbidden" };
src\lib\team-channels\attachments.ts:60:        | "forbidden"
src\lib\team-channels\attachments.ts:107:  if (!isMember) return { ok: false, error: "forbidden" };
src\app\[locale]\app\support\actions.ts:45:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\support\actions.ts:96:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\support\actions.ts:138:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\support\actions.ts:147:  if (!isAdmin) return { ok: false, error: "forbidden" };
src\components\team\new-channel-dialog.tsx:89:        } else if (res.error === "forbidden" || res.error === "auth_required") {
src\lib\supabase\database.types.ts:2706:      transition_project_status: {
src\app\[locale]\app\notifications\actions.ts:62:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\notifications\actions.ts:85:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\showcases\actions.ts:153:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:267:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:419:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:465:  if (!yagiAdmin && !wsAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:514:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:554:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:595:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:654:  if (!yagiAdmin && !wsAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:660:    return { ok: false, error: "forbidden_badge_toggle" };
src\app\[locale]\app\showcases\actions.ts:738:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:742:  // iframe targets (phase-1-9-spec.md line 316 forbidden).
src\app\[locale]\app\showcases\actions.ts:814:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:862:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:934:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\showcases\actions.ts:1015:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\invoices\actions.ts:34:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\invoices\actions.ts:42:  if (!project) return { ok: false, error: "project_not_found" };
src\app\[locale]\app\invoices\[id]\actions.ts:45:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\invoices\[id]\actions.ts:216:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\invoices\[id]\actions.ts:257:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\request-actions.ts:154:  if (!auth) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\meetings\request-actions.ts:202:  if (!auth) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\meetings\request-actions.ts:237:  if (!auth) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\meetings\request-actions.ts:241:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\request-actions.ts:294:  if (!auth) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:49:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\actions.ts:34:      error: "unauthorized" | "forbidden" | "not_found" | "validation" | "db";
src\app\[locale]\app\meetings\actions.ts:144:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\actions.ts:353:  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\actions.ts:414:  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\actions.ts:634:  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\actions.ts:738:  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\meetings\actions.ts:810:  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\settings\actions.ts:53:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\settings\actions.ts:108:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\settings\actions.ts:135:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\settings\actions.ts:180:  if (!user) return { error: "unauthenticated" as const };
src\components\projects\project-actions.ts:13:  const { data, error } = await (supabase.rpc as any)('transition_project_status', {
src\app\[locale]\app\settings\notifications\actions.ts:34:  if (!user) return { error: "unauthenticated" };
src\components\projects\project-action-buttons.tsx:5:// which calls transition_project_status RPC — never direct UPDATE.
src\app\[locale]\app\admin\challenges\actions.ts:208:    return { ok: false, error: "invalid_transition" };
src\components\challenges\submission-form.tsx:26:  unauthenticated: "로그인이 필요해요. 다시 시도해주세요.",
src\app\[locale]\app\projects\[id]\thread-actions.ts:24:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\projects\[id]\thread-actions.ts:36:      return { error: "forbidden" as const };
src\app\[locale]\app\projects\[id]\thread-actions.ts:178:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\projects\[id]\thread-actions.ts:189:      return { error: "forbidden" as const };
src\app\[locale]\app\projects\[id]\ref-actions.ts:94:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\projects\[id]\ref-actions.ts:143:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\ref-actions.ts:193:  if (!user) return { error: "unauthenticated" as const };
src\app\showcase\[slug]\actions.ts:7: * is unauthenticated by design (public brand surface). Slugs act as the
src\app\[locale]\app\projects\[id]\actions.ts:53:  if (!user) return { error: "unauthenticated" as const };
src\app\[locale]\app\projects\[id]\actions.ts:88:  if (!wsAdminCan && !yagiCan) return { error: "forbidden" as const };
src\app\[locale]\app\projects\[id]\actions.ts:126:  if (!user) return { ok: false as const, error: "unauthenticated" as const };
src\app\[locale]\app\projects\[id]\actions.ts:130:  if (!isAdmin) return { ok: false as const, error: "forbidden" as const };
src\app\[locale]\app\projects\[id]\brief\actions.ts:38:  | { error: "unauthenticated" }
src\app\[locale]\app\projects\[id]\brief\actions.ts:41:  | { error: "forbidden"; reason: string }
src\app\[locale]\app\projects\[id]\brief\actions.ts:208:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:274:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:296:    // PG raises with custom messages: 'unauthenticated', 'forbidden',
src\app\[locale]\app\projects\[id]\brief\actions.ts:300:    if (msg.includes("unauthenticated")) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:301:    if (msg.includes("forbidden")) return { error: "forbidden", reason: "non_member" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:336:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:350:    return { error: "forbidden", reason: "version belongs to a different project" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:398:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:410:    return { error: "forbidden", reason: "yagi_admin required" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:441:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:451:    return { error: "forbidden", reason: "yagi_admin required" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:503:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:528:      return { error: "forbidden", reason: "not a project member" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:532:  if (!row) return { error: "forbidden", reason: "RLS denied" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:575:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:852:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:956:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:68:        | "unauthenticated"
src\app\[locale]\app\projects\[id]\board-actions.ts:72:        | "forbidden"
src\app\[locale]\app\projects\[id]\board-actions.ts:98:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:136:  if (!isAuthorized) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\[id]\board-actions.ts:244:      error: "unauthenticated" | "validation" | "db" | "forbidden";
src\app\[locale]\app\projects\[id]\board-actions.ts:258:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:282:      error: "unauthenticated" | "forbidden" | "validation" | "db";
src\app\[locale]\app\projects\[id]\board-actions.ts:301:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:311:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\[id]\board-actions.ts:355:        | "unauthenticated"
src\app\[locale]\app\projects\[id]\board-actions.ts:357:        | "forbidden"
src\app\[locale]\app\projects\[id]\board-actions.ts:375:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:385:  if (!isAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\[id]\board-actions.ts:544:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:606:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:653:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:722:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\[id]\board-actions.ts:760:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\admin\challenges\[slug]\announce\announce-island.tsx:109:          forbidden: "권한이 없어요.",
src\app\[locale]\app\admin\challenges\[slug]\edit\challenge-edit-form.tsx:97:        toast.error(result.error === "invalid_transition"
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:33:  if (!isAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\new\actions.ts:66:  | { error: "unauthenticated" }
src\app\[locale]\app\projects\new\actions.ts:80:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\new\actions.ts:241:  | { error: "unauthenticated" }
src\app\[locale]\app\projects\new\actions.ts:248:  | { error: "unauthenticated" }
src\app\[locale]\app\projects\new\actions.ts:250:  | { error: "forbidden" }
src\app\[locale]\app\projects\new\actions.ts:296:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\new\actions.ts:307:  //    projects_wizard_draft_uniq partial index.
src\app\[locale]\app\projects\new\actions.ts:440:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\projects\new\actions.ts:443:  // an explicit check lets us return `forbidden` distinct from `not_found`.
src\app\[locale]\app\projects\new\actions.ts:450:  if (target.created_by !== user.id) return { error: "forbidden" };
src\app\[locale]\app\projects\new\actions.ts:457:  if (target.status !== "draft") return { error: "forbidden" };
src\app\[locale]\app\projects\new\actions.ts:583:      { message: "storageKey contains forbidden characters" }
src\app\[locale]\app\projects\new\actions.ts:610:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\actions.ts:665:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\actions.ts:855:  | { ok: false; error: "unauthenticated" | "validation" | "db"; message?: string };
src\app\[locale]\app\projects\new\actions.ts:873:  if (authError || !user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\actions.ts:927:  //    are workspace members. Direct UPDATE to status is forbidden by trigger
src\app\[locale]\app\preprod\actions.ts:33:  if (!project) return { ok: false, error: "project_not_found" };
src\app\[locale]\app\projects\new\briefing-actions.ts:60:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-actions.ts:62:        | "forbidden"
src\app\[locale]\app\projects\new\briefing-actions.ts:83:    return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-actions.ts:120:        return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\new\briefing-actions.ts:125:          error: "forbidden",
src\app\[locale]\app\projects\new\briefing-actions.ts:132:          error: "forbidden",
src\app\[locale]\app\projects\new\briefing-actions.ts:170:  // The unique index `projects_wizard_draft_uniq` was extended (migration
src\app\[locale]\app\admin\commissions\[id]\actions.ts:34:  | { error: "unauthenticated" }
src\app\[locale]\app\admin\commissions\[id]\actions.ts:35:  | { error: "forbidden" }
src\app\[locale]\app\admin\commissions\[id]\actions.ts:52:  if (!user) return { error: "unauthenticated" };
src\app\[locale]\app\admin\commissions\[id]\actions.ts:59:  if (!isAdmin) return { error: "forbidden" };
src\app\[locale]\app\admin\commissions\[id]\actions.ts:74:    if (msg.includes("unauthenticated")) return { error: "unauthenticated" };
src\app\[locale]\app\admin\commissions\[id]\actions.ts:75:    if (msg.includes("forbidden")) return { error: "forbidden" };
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:46:    return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:308:          result.error === "unauthenticated"
src\app\[locale]\app\projects\new\briefing-canvas.tsx:156:            result.error === "unauthenticated"
src\app\[locale]\app\projects\new\briefing-canvas.tsx:157:              ? "briefing.step1.toast.unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:94:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:97:        | "forbidden";
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:106:  if (authErr || !user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:121:    return { ok: false, error: "forbidden", message: selErr.message };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:125:    return { ok: false, error: "forbidden", message: "workspace mismatch" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:130:      error: "forbidden",
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:142:    return { ok: false, error: "forbidden", message: "not a workspace member" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:165:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:168:        | "forbidden"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:281:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:284:        | "forbidden"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:306:        error: "forbidden",
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:313:        error: "forbidden",
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:314:        message: "storage_key contains forbidden characters",
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:394:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:396:        | "forbidden"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:413:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:424:  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:457:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:459:        | "forbidden"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:476:  if (!user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:487:  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:548:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:551:        | "forbidden"
src\app\[locale]\app\preprod\[id]\actions.ts:746:  if (!yagiWs) return { ok: false, error: "forbidden" };
src\app\[locale]\app\preprod\[id]\actions.ts:753:  if (!isAdmin) return { ok: false, error: "forbidden" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:52:      error: "unauthenticated" | "no_workspace" | "not_found" | "forbidden";
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:61:  if (authErr || !user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:76:    return { ok: false, error: "forbidden", message: selErr.message };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:80:    return { ok: false, error: "forbidden", message: "workspace mismatch" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:83:    return { ok: false, error: "forbidden", message: "not creator" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:88:      error: "forbidden",
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:123:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:126:        | "forbidden"
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:199:        | "unauthenticated"
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:216:  // BEFORE-UPDATE trigger trg_guard_projects_status (raises
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:217:  // 'direct_status_update_forbidden'). Every status transition must go
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:218:  // through the SECURITY DEFINER `transition_project_status` RPC, which:
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:237:  if (authErr || !user) return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:250:    "transition_project_status",
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:264:    if (code === "42501" && msg.includes("unauthenticated")) {
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:265:      return { ok: false, error: "unauthenticated" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:267:    if (code === "42501" && msg.includes("forbidden")) {
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:271:      // project_not_found — RLS scope or hard delete
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:275:      // invalid_transition — already submitted, or status no longer draft
src\app\[locale]\app\projects\new\new-project-wizard.tsx:875:                  result.error === "unauthenticated"
src\app\[locale]\app\projects\new\new-project-wizard.tsx:876:                    ? "wizard.errors.unauthenticated"
src\components\project\thread-panel.tsx:423:          if (result.error === "forbidden") {
src\components\project\thread-panel.tsx:455:        if (result.error === "forbidden") {
supabase\migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:5:--     handle_history audit content (retired handles) to unauthenticated
supabase\migrations\20260427000000_phase_2_8_1_wizard_draft.sql:21:--   - DROP INDEX projects_wizard_draft_uniq;
supabase\migrations\20260427000000_phase_2_8_1_wizard_draft.sql:48:CREATE UNIQUE INDEX IF NOT EXISTS projects_wizard_draft_uniq
supabase\migrations\20260427000000_phase_2_8_1_wizard_draft.sql:52:COMMENT ON INDEX public.projects_wizard_draft_uniq IS
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:49:    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:75:    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:118:    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:121:    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:24:--                       via transition_project_status RPC. Only used by direct
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:78:  'transition_project_status() RPC or submitProjectAction server action '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:125:  'Set by transition_project_status() RPC or submitProjectAction server action. '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:156:  'Written exclusively by transition_project_status() RPC (SECURITY DEFINER). '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:334:  'Called by transition_project_status() before any write. '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:342:-- SECTION E: FUNCTION transition_project_status
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:365:CREATE OR REPLACE FUNCTION public.transition_project_status(
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:389:    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:404:    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:427:    RAISE EXCEPTION 'forbidden: client may only transition own projects'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:443:    RAISE EXCEPTION 'invalid_transition: % -> % for role %',
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:486:COMMENT ON FUNCTION public.transition_project_status(uuid, text, text) IS
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:493:REVOKE ALL ON FUNCTION public.transition_project_status(uuid, text, text) FROM PUBLIC;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:494:GRANT EXECUTE ON FUNCTION public.transition_project_status(uuid, text, text)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:507:--   - transition_project_status() RPC — sets the session flag → passes
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:512:--     call transition_project_status() for submitted→in_review.
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:545:    'direct_status_update_forbidden: use transition_project_status() RPC'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:549:DROP TRIGGER IF EXISTS trg_guard_projects_status ON public.projects;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:551:CREATE TRIGGER trg_guard_projects_status
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:559:  'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:727:  'trg_guard_projects_status trigger — only transition_project_status() RPC '
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:22:-- (trg_guard_projects_status) and is_valid_transition() continue to gate
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:75:    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:100:    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:112:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:190:    RAISE EXCEPTION 'remove_project_board_attachment: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:257:    RAISE EXCEPTION 'update_project_board_url_note: unauthenticated';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:25:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
supabase\migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:3:-- transition_project_status / is_valid_transition / validate_profile_role_transition
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:49:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:1:-- Phase 5 Wave B hotfix-6 — projects_wizard_draft_uniq lockdown to honor
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:21:DROP INDEX IF EXISTS public.projects_wizard_draft_uniq;
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:22:CREATE UNIQUE INDEX projects_wizard_draft_uniq
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:35:      AND indexname = 'projects_wizard_draft_uniq';
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:37:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq missing after migration';
supabase\migrations\20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql:40:    RAISE EXCEPTION 'hotfix-6 verify failed: projects_wizard_draft_uniq predicate does not include deleted_at IS NULL — got: %', v_indexdef;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 360 -First 105" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 532 -First 25" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427000000_phase_2_8_1_wizard_draft.sql' | Select-Object -Skip 44 -First 14" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/projects/project-actions.ts' | Select-Object -First 80" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 417ms:
-- 2. Partial unique index so the wizard can resume a single draft per
--    (workspace, user) without a race window between SELECT-then-INSERT.
--    The server action catches 23505 (UNIQUE_VIOLATION) and re-SELECTs.
CREATE UNIQUE INDEX IF NOT EXISTS projects_wizard_draft_uniq
  ON public.projects (workspace_id, created_by)
  WHERE status = 'draft' AND intake_mode = 'brief';

COMMENT ON INDEX public.projects_wizard_draft_uniq IS
  'Phase 2.8.1 G_B1-B ??at most one in-progress wizard draft per (workspace, '
  'user). Wizard ensureDraftProject() relies on this for find-or-create.';

COMMIT;

 succeeded in 445ms:
  v_workspace_id uuid;
  v_new_id      uuid;
  v_is_yagi_admin      boolean;
  v_is_ws_admin        boolean;
BEGIN

  -- 1. Authenticate
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  -- 2. Resolve actor_role from user_roles table.
  --    'system' is NEVER assignable via this RPC (server action bypasses it).
  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);

  -- 3. Lock and read current project state
  SELECT status, created_by, workspace_id
    INTO v_from_status, v_created_by, v_workspace_id
    FROM public.projects
   WHERE id = p_project_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;

  -- 4. Resolve workspace-scoped admin role now that we have workspace_id
  v_is_ws_admin := EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_actor_id
       AND role = 'workspace_admin'
       AND workspace_id = v_workspace_id
  );

  -- 5. Assign actor_role string
  IF v_is_yagi_admin THEN
    v_actor_role := 'yagi_admin';
  ELSIF v_is_ws_admin THEN
    v_actor_role := 'workspace_admin';
  ELSE
    -- Default to client; authorization gate below ensures they own the project
    v_actor_role := 'client';
  END IF;

  -- 6. Authorization gate
  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
    RAISE EXCEPTION 'forbidden: client may only transition own projects'
      USING ERRCODE = '42501';
  END IF;
  -- Admin roles have no per-project ownership restriction; they operate
  -- on any project in the workspace (or any project for yagi_admin).

  -- 7. Comment requirement: in_revision transitions need ??10 non-whitespace chars
  IF p_to_status = 'in_revision' THEN
    IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
      RAISE EXCEPTION 'comment_required_min_10_chars'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  -- 8. Validate transition via truth table
  IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
    RAISE EXCEPTION 'invalid_transition: % -> % for role %',
      v_from_status, p_to_status, v_actor_role
      USING ERRCODE = '23514';
  END IF;

  -- 9. Signal trigger guard to allow status column write
  PERFORM set_config('local.transition_rpc_active', 'true', true);

  -- 10. UPDATE projects
  UPDATE public.projects
     SET status       = p_to_status,
         updated_at   = now(),
         submitted_at = CASE
                          WHEN p_to_status = 'submitted' THEN now()
                          ELSE submitted_at
                        END
   WHERE id = p_project_id;

  -- 11. INSERT history row
  INSERT INTO public.project_status_history (
    project_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    comment
  ) VALUES (
    p_project_id,
    v_from_status,
    p_to_status,
    v_actor_id,
    v_actor_role,
    p_comment
  )
  RETURNING id INTO v_new_id;

  -- 12. Clear the session flag (belt-and-suspenders ??local already resets at txn end)
  PERFORM set_config('local.transition_rpc_active', 'false', true);

  RETURN v_new_id;

END $$;

 succeeded in 418ms:
'use server';

import { createSupabaseServer } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function callTransition(
  projectId: string,
  toStatus: string,
  comment: string | null
) {
  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC types not yet generated for new migration
  const { data, error } = await (supabase.rpc as any)('transition_project_status', {
    p_project_id: projectId,
    p_to_status: toStatus,
    p_comment: comment,
  });
  if (error) throw error;
  return data;
}

function revalidateProjectPaths(id: string) {
  // Revalidate for all locales via the dynamic [locale] segment
  revalidatePath('/[locale]/app/admin/projects', 'page');
  revalidatePath(`/[locale]/app/projects/${id}`, 'page');
}

export async function startProjectAction(id: string) {
  const result = await callTransition(id, 'in_progress', null);
  revalidateProjectPaths(id);
  return result;
}

export async function deliverProjectAction(id: string) {
  const result = await callTransition(id, 'delivered', null);
  revalidateProjectPaths(id);
  return result;
}

export async function approveProjectAction(id: string, comment: string | null) {
  const result = await callTransition(id, 'approved', comment);
  revalidateProjectPaths(id);
  return result;
}

export async function requestRevisionAction(id: string, comment: string) {
  const result = await callTransition(id, 'in_revision', comment);
  revalidateProjectPaths(id);
  return result;
}

export async function cancelProjectAction(id: string, comment: string | null) {
  const result = await callTransition(id, 'cancelled', comment);
  revalidateProjectPaths(id);
  return result;
}

export async function archiveProjectAction(id: string) {
  const result = await callTransition(id, 'archived', null);
  revalidateProjectPaths(id);
  return result;
}

 succeeded in 447ms:
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_projects_status_direct_update();

COMMENT ON FUNCTION public.guard_projects_status_direct_update() IS
  'Phase 3.0 ??BEFORE UPDATE trigger guard on projects. Raises 42501 if any '
  'caller attempts a direct status column change outside the '
  'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';

-- =============================================================================
-- SECTION G: RLS ??project_status_history
-- =============================================================================

ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;

-- SELECT: client can read history for own projects
DROP POLICY IF EXISTS psh_select_client ON public.project_status_history;
CREATE POLICY psh_select_client ON public.project_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
       WHERE p.id = project_status_history.project_id
         AND p.created_by = auth.uid()

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 515 -First 28" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 380ms:
    RETURN NEW;
  END IF;

  -- Allow yagi_admin for emergency console fixes
  IF public.is_yagi_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Block all other direct status mutations
  RAISE EXCEPTION
    'direct_status_update_forbidden: use transition_project_status() RPC'
    USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS trg_guard_projects_status ON public.projects;

CREATE TRIGGER trg_guard_projects_status
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_projects_status_direct_update();

COMMENT ON FUNCTION public.guard_projects_status_direct_update() IS
  'Phase 3.0 ??BEFORE UPDATE trigger guard on projects. Raises 42501 if any '
  'caller attempts a direct status column change outside the '
  'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';

-- =============================================================================

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 493 -First 25" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 380ms:
--     The 'system' path is reserved for that server action's direct write.
--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
--
-- Justification for trigger over USING(false): the USING(false) approach
-- would block ALL updates from clients, including wizard autosave of non-status
-- columns (title, brief, budget_band, etc.) on draft projects. The trigger
-- is more surgical ??it fires only on status column change.

CREATE OR REPLACE FUNCTION public.guard_projects_status_direct_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only intervene when status is being changed
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Allow if the SECURITY DEFINER RPC set the session flag
  IF current_setting('local.transition_rpc_active', true) = 'true' THEN
    RETURN NEW;
  END IF;


exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "FU-Phase5-5|R2 orphan|orphan cleanup|briefing-docs" .yagi-autobuild src supabase docs -g "*.md" -g "*.ts" -g "*.tsx" -g "*.sql"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "project_status_history|transition_project_status" src/lib/supabase/database.types.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/supabase/database.types.ts' | Select-Object -Skip 2698 -First 24" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 361ms:
1630:      project_status_history: {
1663:            foreignKeyName: "project_status_history_project_id_fkey"
2706:      transition_project_status: {

 succeeded in 469ms:
            }
            Returns: string
          }
      toggle_project_board_lock: {
        Args: { p_board_id: string; p_locked: boolean }
        Returns: undefined
      }
      transition_project_status: {
        Args: { p_comment?: string; p_project_id: string; p_to_status: string }
        Returns: string
      }
      update_project_board_url_note: {
        Args: { p_attachment_id: string; p_board_id: string; p_note: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

 succeeded in 2019ms:
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:190:  const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:302:    const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
src\app\[locale]\app\projects\new\briefing-actions.ts:175:  // R2 objects under briefing-docs/<user-id>/... remain after the
src\app\[locale]\app\projects\new\briefing-actions.ts:176:  // briefing_documents hard-delete (FU-Phase5-5 — periodic cleanup job
.yagi-autobuild\phase-5\KICKOFF.md:740:- 기획서: `briefing-docs/${user.id}/brief/<uuid>.<ext>`
.yagi-autobuild\phase-5\KICKOFF.md:741:- 레퍼런스: `briefing-docs/${user.id}/reference/<uuid>.<ext>`
.yagi-autobuild\phase-5\task_plan.md:212:- R2 prefix: `briefing-docs/${user.id}/{brief|reference}/<uuid>.<ext>`
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_prompt.md:50:- R2 objects under briefing-docs/<user-id>/... remain after the
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_prompt.md:51:  briefing_documents hard-delete (FU-Phase5-5 — periodic cleanup).
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_prompt.md:134:6. **R2 orphan growth (FU-Phase5-5).**
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_prompt.md:135:   - Wipe hard-deletes briefing_documents but leaves R2 objects. Storage cost is bounded by user-id-prefixed objects per wipe cycle. yagi explicitly accepted this as deferred. Verify the comment in briefing-actions.ts captures the trade-off accurately and FU-Phase5-5 is registered (it should be, since yagi's spec mentions it).
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_prompt.md:140:- FU-Phase5-5: R2 orphan cleanup job (registered in this hotfix)
.yagi-autobuild\phase-5\_wave_b_task_05v3_codex_review_loop1.md:37:3. R2 prefix bind on getBriefingDocumentPutUrlAction + addBriefingDocumentAction — presign generates `briefing-docs/${auth.userId}/${kind}/<uuid>.<ext>`; addBriefingDocumentAction re-validates `data.storage_key.startsWith(briefing-docs/${auth.userId}/${kind}/)` AND rejects `..` / leading `/`. Verify no path lets a malicious client INSERT a row with another user's storage_key.
.yagi-autobuild\phase-5\_wave_b_task_05v3_codex_review_loop1.md:874:  const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;
.yagi-autobuild\phase-5\_wave_b_task_05v3_codex_review_loop1.md:986:    const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
.yagi-autobuild\phase-5\_wave_b_task_05v3_codex_review_loop1.md:3552: 184:   const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;
.yagi-autobuild\phase-5\_wave_b_task_05v3_codex_review_loop1.md:3664: 296:     const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:63:- R2 objects under briefing-docs/<user-id>/... remain after the
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:64:  briefing_documents hard-delete (FU-Phase5-5 — periodic cleanup).
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:147:6. **R2 orphan growth (FU-Phase5-5).**
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:148:   - Wipe hard-deletes briefing_documents but leaves R2 objects. Storage cost is bounded by user-id-prefixed objects per wipe cycle. yagi explicitly accepted this as deferred. Verify the comment in briefing-actions.ts captures the trade-off accurately and FU-Phase5-5 is registered (it should be, since yagi's spec mentions it).
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:153:- FU-Phase5-5: R2 orphan cleanup job (registered in this hotfix)
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:175:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "submitBriefingAction|updateProjectCommitAction|transition_project_status|submit_not_owner|ensureBriefingDraftProject|projects_wizard_draft_uniq|FU-Phase5-5|briefing_documents|deleted_at" src/app/[locale]/app/projects/new/briefing-step3-actions.ts src/app/[locale]/app/projects/new/briefing-actions.ts src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:206:src/app/[locale]/app/projects/new/briefing-actions.ts:176:  // briefing_documents hard-delete (FU-Phase5-5 — periodic cleanup job
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:470:  // R2 objects under briefing-docs/<user-id>/... remain after the
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:471:  // briefing_documents hard-delete (FU-Phase5-5 ??periodic cleanup job
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:1173: 174:   // R2 objects under briefing-docs/<user-id>/... remain after the
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:1174: 175:   // briefing_documents hard-delete (FU-Phase5-5 ??periodic cleanup job
.yagi-autobuild\phase-5\_wave_b_hotfix6_codex_loop1_full.md:1808:"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "FU-Phase5-5|R2 orphan|orphan cleanup|briefing-docs" .yagi-autobuild src supabase docs -g "*.md" -g "*.ts" -g "*.tsx" -g "*.sql"' in C:\Users\yout4\yagi-studio\yagi-workshop

codex
One important nuance I’m validating: the RPC itself is not strictly “creator only” for every actor role; it also recognizes workspace_admin/yagi_admin. I’m checking whether that changes the submit action’s ownership guarantee in this client-facing path.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "is_valid_transition|workspace_admin|draft.*submitted|submitted" supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql src/app/[locale]/app/projects/new -g "*.sql" -g "*.ts" -g "*.tsx"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 300 -First 55" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "workspace_admin|yagi_admin|created_by.*auth.uid|projects.*select|CREATE POLICY.*projects" supabase/migrations -g "*.sql"' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 359ms:
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:6:--   unexpected_status_count = 0  (1 row, status='submitted' — valid in both old/new)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:11:--     Old CHECK (8 states: draft/submitted/in_discovery/in_production/in_revision/
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:14:-- State machine (7 observable states + submitted + archived = 9 total):
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:15:--   draft → submitted → in_review → in_progress ⇄ in_revision
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:64:      'submitted',
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:75:  'Phase 3.0 — 9-state lifecycle: draft → submitted → in_review → in_progress '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:79:  '(submitted→in_review auto-transition, system actor, L-015). '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:119:-- A-4. Add submitted_at column.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:121:  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:123:COMMENT ON COLUMN public.projects.submitted_at IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:124:  'Phase 3.0 — timestamp when project transitioned to submitted state. '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 'yagi_admin', 'workspace_admin', 'system'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:242:-- SECTION D: FUNCTION is_valid_transition
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:247:--   draft       → submitted          ✓
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:252:--   submitted   → cancelled          ✓
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:263:--   submitted   → cancelled          ✓
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:271:--   submitted   → in_review          ✓  (the ONLY system transition — L-015)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:275:CREATE OR REPLACE FUNCTION public.is_valid_transition(
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:291:        -- draft → submitted
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:292:        WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:301:          'draft','submitted','in_review','in_progress','in_revision','delivered'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:315:          'draft','submitted','in_review','in_progress','in_revision','delivered'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:322:      -- The ONLY system transition: submitted → in_review (L-015 auto-transition)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:324:        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:332:COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:337:REVOKE ALL ON FUNCTION public.is_valid_transition(text, text, text) FROM PUBLIC;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:338:GRANT EXECUTE ON FUNCTION public.is_valid_transition(text, text, text)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:351:--   workspace_admin (for the same workspace as the project) → 'workspace_admin'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:355:--             auto submitted→in_review transition (L-015).
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:359:--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:411:       AND role = 'workspace_admin'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:419:    v_actor_role := 'workspace_admin';
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:442:  IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:455:         submitted_at = CASE
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:456:                          WHEN p_to_status = 'submitted' THEN now()
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:457:                          ELSE submitted_at
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:488:  'project status transitions. Validates via is_valid_transition(), enforces '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:490:  'returns new history row id. System actor (submitted→in_review) is handled '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:512:--     call transition_project_status() for submitted→in_review.
src/app/[locale]/app/projects/new\actions.ts:18:// 'draft' to 'submitted' rather than INSERTing a fresh row.
src/app/[locale]/app/projects/new\actions.ts:27://                           wizard fields and (optionally) flip to 'submitted'.
src/app/[locale]/app/projects/new\actions.ts:91:  const status = parsed.data.intent === "submit" ? "submitted" : "draft";
src/app/[locale]/app/projects/new\actions.ts:173:    // a non-yagi workspace_admin's rollback would be silently denied
src/app/[locale]/app/projects/new\actions.ts:230:  status: "draft" | "submitted" | string;
src/app/[locale]/app/projects/new\actions.ts:246:  | { ok: true; id: string; status: "draft" | "submitted" }
src/app/[locale]/app/projects/new\actions.ts:454:  // any project owned by the caller (submitted / in_production /
src/app/[locale]/app/projects/new\actions.ts:461:  // and verify any submitted brand_id belongs to it.
src/app/[locale]/app/projects/new\actions.ts:485:  const status = intent === "submit" ? "submitted" : "draft";
src/app/[locale]/app/projects/new\actions.ts:514:    status: updated.status as "draft" | "submitted",
src/app/[locale]/app/projects/new\actions.ts:711:// (the L-015 auto-transition shortcut — never writes 'submitted' to projects).
src/app/[locale]/app/projects/new\actions.ts:919:  // Phase 3.0 columns (budget_band, submitted_at, kind) are not in the
src/app/[locale]/app/projects/new\actions.ts:952:      submitted_at: new Date().toISOString(),
src/app/[locale]/app/projects/new\actions.ts:982:      from_status: "submitted",   // logical from-state (L-015: submitted→in_review)
src/app/[locale]/app/projects/new\actions.ts:1045:  // user in this workspace, since the real project is now submitted.
src/app/[locale]/app/projects/new\actions.ts:1121:      kind: "project_submitted",
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:222:  //     (client: draft → submitted is allowed; draft → in_review is NOT —
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:224:  //   - sets submitted_at when p_to_status='submitted'
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:253:      p_to_status: "submitted",
src/app/[locale]/app/projects/new\briefing-step3-actions.ts:275:      // invalid_transition — already submitted, or status no longer draft
src/app/[locale]/app/projects/new\new-project-wizard.tsx:439:    // that did not exist in R2 and made submitted PDFs unrecoverable.

 succeeded in 377ms:
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:38:-- Same shape as #2: USING limits WHICH rows a yagi_admin can UPDATE, but
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:79:-- Same class of gap: a yagi_admin authorized to UPDATE a showcase-media
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:264:    AND created_by = auth.uid()
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423020200_create_meeting_with_attendees_rpc.sql:15:-- inserts to ws_admin / yagi_admin, and the caller has already been
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:288:-- owner UPDATE until closed; admin read/update via is_yagi_admin.
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
supabase/migrations\20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4451:-- Name: user_roles user_roles_yagi_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:55:  'verified_at stamped manually by yagi_admin after sales-ops verification of company identity.';
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:320:-- (yagi_admin) and service-role direct writes bypass.
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:336:  -- yagi_admin can change roles freely (e.g., support migrations).
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:11:--   6. Lock state-transition + column-guard trigger (yagi_admin-only flip)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:59:  'status: editing (default) or locked (production frozen, yagi_admin-only flip).';
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:172:--     OR yagi_admin. Brief Board is collaborative (Y3: admin can fill draft).
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:175:--   - status flip ('editing' ↔ 'locked'): yagi_admin only — enforced by
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:221:-- columns. yagi_admin bypasses the editing check via the second policy.
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:270:-- INSERT: workspace member or yagi_admin. created_by must equal auth.uid()
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:280:    created_by = (select auth.uid())
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:329:-- DELETE: own uploads or yagi_admin (SPEC §3.6).
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:363:-- Guards (non-yagi_admin caller):
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:369:--     1. status frozen (lock/unlock is yagi_admin only — SPEC §5.4)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:379:-- yagi_admin bypasses all column guards (lock/unlock requires it; admin
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:428:      'only yagi_admin may change project_brief status'
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:434:      'only yagi_admin may change tiptap_schema_version'
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:506:-- must unlock first (yagi_admin only). Defense-in-depth alongside
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:519:  -- a yagi_admin lock arriving while we're snapshotting). Without this,
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:12:--        - yagi_admin only
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:176:  --    INSERTs; this RPC is yagi_admin so the bypass branch applies.
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:232:  --    yagi_admin.
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:264:  'converted, and notify the client. yagi_admin only. Idempotent on re-call.';
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:65:  -- Authorize: workspace member of the owning project, or yagi_admin.
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      — user_roles.role = 'yagi_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 'yagi_admin', 'workspace_admin', 'system'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:350:--   yagi_admin  → actor_role = 'yagi_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:351:--   workspace_admin (for the same workspace as the project) → 'workspace_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:359:--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:411:       AND role = 'workspace_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:417:    v_actor_role := 'yagi_admin';
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:419:    v_actor_role := 'workspace_admin';
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:431:  -- on any project in the workspace (or any project for yagi_admin).
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:538:  -- Allow yagi_admin for emergency console fixes
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:560:  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:576:         AND p.created_by = auth.uid()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:580:-- SELECT: yagi_admin can read all history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:609:-- yagi_admin). Phase 3.0 replaces it with split CRUD policies:
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:611:--   - yagi_admin: SELECT only (admins read references but client owns them)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:618:-- SELECT: client (own projects) + yagi_admin (all)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:626:         AND p.created_by = auth.uid()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:639:         AND p.created_by = auth.uid()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:651:         AND p.created_by = auth.uid()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:658:         AND p.created_by = auth.uid()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:670:         AND p.created_by = auth.uid()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:678:-- ws_admin or yagi_admin to update non-deleted rows. The trigger guard in
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:705:    -- yagi_admin: unrestricted (including trashed project restore)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:719:    -- yagi_admin: unrestricted
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:726:  'yagi_admin unrestricted. Status column changes are additionally gated by '
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:728:  'or yagi_admin may change projects.status.';
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:4:-- yagi_admin needs to remove erroneous projects (test data, accidental
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:7:-- automatically; yagi_admin reads see everything so the trash console
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:12:--   2. RLS read         — ws_member sees deleted_at IS NULL; yagi_admin sees all
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:13:--   3. RLS update       — ws_admin can only update non-deleted rows; yagi_admin
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:8:--   only `created_by = auth.uid()` and request-window status without
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:16:--   update. yagi_admin and ws_admin lanes are unchanged.
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:35:--   'closed'. Intent: only yagi_admin can close/reopen. Tighten:
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:91:      created_by = auth.uid()
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:100:      created_by = auth.uid()
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:144:-- 5. support_threads_update — only yagi_admin may flip status ------
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:167:-- a BEFORE UPDATE trigger that raises if the caller is NOT a yagi_admin
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:26:--          AND created_by = auth.uid() (cannot impersonate or seed
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:32:--        - ws_admin / yagi_admin keep their existing full-access lanes.
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:84:      AND created_by = auth.uid()
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:99:      created_by = auth.uid()
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:107:      created_by = auth.uid()
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:14:--     or a yagi_admin. Body up to 4000 chars; image_url is the public
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:21:--   yagi_admin: full access.
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:150:-- read-only audit access. Only the client-owner and yagi_admin can post.
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:163:  -- the inserting author to UPDATE, but yagi_admin replies should
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:7:-- another workspace, after which the workspace_admin SELECT lane in
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:14:-- Fix: support_threads_update is now yagi_admin-only. The application
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:18:-- SECURITY DEFINER trigger. yagi_admin retains full UPDATE access for
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:37:  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:11:--   which permits a non-yagi workspace_admin to write deleted_at = now()
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:25:--   gate (yagi_admin bypasses, matching the read-side pattern).
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:89:  -- trashed projects. yagi_admin bypasses (so a yagi-side restore +
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:5:--   - Require projects.created_by = auth.uid()
supabase/migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260429113853_phase_3_1_project_board.sql:167:    RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
supabase/migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260429113853_phase_3_1_project_board.sql:194:    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:15:-- Validates: caller ownership OR yagi_admin, lock state, count cap (30),
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:48:  -- Role check: owner OR yagi_admin
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:110:-- Validates: caller ownership OR yagi_admin, lock state, count cap (50),
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:205:-- Validates: caller ownership OR yagi_admin, lock state.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:283:-- Validates: caller ownership OR yagi_admin, lock state, note length (500).
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:202:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:269:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:385:    is_yagi_admin(auth.uid())
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:11:-- yagi_admin workspace requires a MANUAL UPDATE after verify
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:69:-- SELECT: yagi_admin (all rows) + project owner client (own rows)
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:86:      SELECT id FROM projects WHERE created_by = auth.uid()
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:37:--   4. Keeps the existing auth + project status gates (yagi_admin OR
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:101:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase/migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:23:--   2. yagi_admin: bypass (admin-driven role changes via support tools).
supabase/migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:54:  -- yagi_admin can change roles freely (e.g., support migrations,
supabase/migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:56:  IF public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:97:  '(artist, future yagi_admin) and forbids non-NULL -> non-NULL role '
supabase/migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:98:  'transitions for non-admin callers. service_role + yagi_admin bypass.';
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:5:-- {brand, artist, yagi_admin}. The `ws_update_admin` RLS policy
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:7:-- and the column-set is unconstrained — so a workspace_admin (who
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:9:-- 'yagi_admin' and any code path that branches on workspaces.kind
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:26:-- OR is_yagi_admin), so workspace admins can edit their own row's
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:27:-- editable columns. yagi_admin can also use the service-role client
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:9:--       created_by equals auth.uid() — both via WITH CHECK.
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:65:-- SELECT: project 의 workspace member 또는 yagi_admin
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:76:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:81:-- workspace AND created_by MUST equal auth.uid() (no spoof). yagi_admin
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:89:      created_by = auth.uid()
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:98:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:104:-- yagi_admin bypass.
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:114:      created_by = auth.uid()
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:124:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:129:      created_by = auth.uid()
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:138:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:144:-- yagi_admin not granted DELETE here (admin destructive action goes
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:150:    created_by = auth.uid()
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:24:-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:44:      created_by = auth.uid()
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:54:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:68:      created_by = auth.uid()
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:79:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:84:      created_by = auth.uid()
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:94:      WHERE id = auth.uid() AND role = 'yagi_admin'

 succeeded in 417ms:
    -- ---- system transition ----
    WHEN actor_role = 'system' THEN
      -- The ONLY system transition: submitted ??in_review (L-015 auto-transition)
      CASE
        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
        ELSE false
      END

    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
  'Phase 3.0 ??pure truth-table guard for project state machine. IMMUTABLE. '
  'Called by transition_project_status() before any write. '
  'See migration header for full allowed-transition table.';

REVOKE ALL ON FUNCTION public.is_valid_transition(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_transition(text, text, text)
  TO authenticated, service_role;

-- =============================================================================
-- SECTION E: FUNCTION transition_project_status
-- =============================================================================
-- SECURITY DEFINER RPC ??the sole legal path for client/admin status changes.
-- Sets session variable local.transition_rpc_active = 'true' so the trigger
-- guard (Section F) knows to allow the status column write.
--
-- Actor resolution:
--   auth.uid() ??user_roles table
--   yagi_admin  ??actor_role = 'yagi_admin'
--   workspace_admin (for the same workspace as the project) ??'workspace_admin'
--   else ??'client'
--   system ??NEVER reachable through this RPC; submitProjectAction uses a
--             direct server-side UPDATE (service role / RLS bypass) for the
--             auto submitted?뭝n_review transition (L-015).
--
-- Authorization:
--   client path: caller must be projects.created_by
--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
--
-- Comment requirement:
--   in_revision transitions require comment of ??10 non-whitespace chars
--   (enforced so admin/client must explain the revision request).

CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id uuid,
  p_to_status  text,
  p_comment    text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 275 -First 45" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 371ms:
        -- delivered ??in_revision
        WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
        -- delivered ??approved  (client-ONLY; this pair intentionally absent from admin block)
        WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
        -- [pre-approved states] ??cancelled
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
      CASE
        WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
        WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
        WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
        -- NOTE: admin may NOT set delivered?뭓pproved (that is client-only above)
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- system transition ----
    WHEN actor_role = 'system' THEN
      -- The ONLY system transition: submitted ??in_review (L-015 auto-transition)
      CASE
        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
        ELSE false
      END

    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
  'Phase 3.0 ??pure truth-table guard for project state machine. IMMUTABLE. '
  'Called by transition_project_status() before any write. '
  'See migration header for full allowed-transition table.';

REVOKE ALL ON FUNCTION public.is_valid_transition(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_valid_transition(text, text, text)
  TO authenticated, service_role;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 242 -First 38" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 455ms:
-- =============================================================================
-- Truth table:
--
-- actor_role='client':
--   draft       ??submitted          ??--   in_progress ??in_revision        ??--   delivered   ??in_revision        ??--   delivered   ??approved           ?? (client-only; admins may NOT approve)
--   draft       ??cancelled          ??--   submitted   ??cancelled          ??--   in_review   ??cancelled          ??--   in_progress ??cancelled          ??--   in_revision ??cancelled          ??--   delivered   ??cancelled          ??--
-- actor_role IN ('yagi_admin','workspace_admin'):
--   in_review   ??in_progress        ??--   in_revision ??in_progress        ??--   in_progress ??delivered          ??--   draft       ??cancelled          ??--   submitted   ??cancelled          ??--   in_review   ??cancelled          ??--   in_progress ??cancelled          ??--   in_revision ??cancelled          ??--   delivered   ??cancelled          ??--   approved    ??archived           ??--
-- actor_role='system':
--   submitted   ??in_review          ?? (the ONLY system transition ??L-015)
--
-- All other combinations ??FALSE.

CREATE OR REPLACE FUNCTION public.is_valid_transition(
  from_status text,
  to_status   text,
  actor_role  text
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE

    -- ---- client transitions ----
    WHEN actor_role = 'client' THEN
      CASE
        -- draft ??submitted
        WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
        -- in_progress ??in_revision
        WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
        -- delivered ??in_revision
        WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
        -- delivered ??approved  (client-ONLY; this pair intentionally absent from admin block)
        WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
        -- [pre-approved states] ??cancelled

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "create_workspace|workspace_admin|user_roles" supabase/migrations/20260422120000_phase_2_0_baseline.sql supabase/migrations src/lib src/app/[locale]/app -g "*.sql" -g "*.ts" -g "*.tsx"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260422120000_phase_2_0_baseline.sql' | Select-Object -Skip 95 -First 40" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 457ms:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
supabase/migrations/20260422120000_phase_2_0_baseline.sql:119:  insert into public.user_roles (user_id, role, workspace_id)
supabase/migrations/20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1780:-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1783:CREATE TABLE public.user_roles (
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2156:-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2524:-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2527:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2528:    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2532:-- Name: user_roles user_roles_user_id_role_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2535:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2536:    ADD CONSTRAINT user_roles_user_id_role_workspace_id_key UNIQUE (user_id, role, workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2948:-- Name: user_roles_user_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2951:CREATE INDEX user_roles_user_idx ON public.user_roles USING btree (user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2955:-- Name: user_roles_ws_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2958:CREATE INDEX user_roles_ws_idx ON public.user_roles USING btree (workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3610:-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3613:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3614:    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3618:-- Name: user_roles user_roles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3621:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3622:    ADD CONSTRAINT user_roles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4424:-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4427:ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4430:-- Name: user_roles user_roles_read_self; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4437:-- Name: user_roles user_roles_self_insert_creator; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4444:-- Name: user_roles user_roles_self_insert_ws_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4451:-- Name: user_roles user_roles_yagi_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:118:  -- Grant workspace_admin role
supabase/migrations\20260422120000_phase_2_0_baseline.sql:119:  insert into public.user_roles (user_id, role, workspace_id)
supabase/migrations\20260422120000_phase_2_0_baseline.sql:120:  values (v_user_id, 'workspace_admin', v_workspace_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1780:-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1783:CREATE TABLE public.user_roles (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2156:-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2524:-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2527:ALTER TABLE ONLY public.user_roles
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2528:    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2532:-- Name: user_roles user_roles_user_id_role_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2535:ALTER TABLE ONLY public.user_roles
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2536:    ADD CONSTRAINT user_roles_user_id_role_workspace_id_key UNIQUE (user_id, role, workspace_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2948:-- Name: user_roles_user_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2951:CREATE INDEX user_roles_user_idx ON public.user_roles USING btree (user_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2955:-- Name: user_roles_ws_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2958:CREATE INDEX user_roles_ws_idx ON public.user_roles USING btree (workspace_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3610:-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3613:ALTER TABLE ONLY public.user_roles
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3614:    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3618:-- Name: user_roles user_roles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3621:ALTER TABLE ONLY public.user_roles
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3622:    ADD CONSTRAINT user_roles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4424:-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4427:ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4430:-- Name: user_roles user_roles_read_self; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4437:-- Name: user_roles user_roles_self_insert_creator; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4444:-- Name: user_roles user_roles_self_insert_ws_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4451:-- Name: user_roles user_roles_yagi_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
src/lib\app\context.ts:8:  | "workspace_admin"
src/lib\app\context.ts:65:    .from("user_roles")
src/app/[locale]/app\meetings\request-actions.ts:126:    .from("user_roles")
src/app/[locale]/app\meetings\request-actions.ts:352:    .from("user_roles")
src/app/[locale]/app\meetings\request-actions.ts:472:      .from("user_roles")
src/app/[locale]/app\admin\invoices\page.tsx:108:    .from("user_roles")
src/app/[locale]/app\invoices\[id]\actions.ts:168:      .from("user_roles")
src/app/[locale]/app\invoices\[id]\actions.ts:171:      .eq("role", "workspace_admin");
src/app/[locale]/app\invoices\[id]\page.tsx:62:    .from("user_roles")
src/app/[locale]/app\invoices\page.tsx:72:    .from("user_roles")
src/app/[locale]/app\meetings\new\page.tsx:51:      .from("user_roles")
src/app/[locale]/app\meetings\new\page.tsx:54:      .eq("role", "workspace_admin"),
src/app/[locale]/app\invoices\new\page.tsx:22:    .from("user_roles")
src/app/[locale]/app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin → notFound).
src/app/[locale]/app\admin\projects\[id]\page.tsx:32:    .from("user_roles")
src/app/[locale]/app\projects\[id]\actions.ts:25:  "workspace_admin" | "yagi_admin",
src/app/[locale]/app\projects\[id]\actions.ts:28:  workspace_admin: {
src/app/[locale]/app\projects\[id]\actions.ts:65:    .from("user_roles")
src/app/[locale]/app\projects\[id]\actions.ts:80:    roles.has("workspace_admin") &&
src/app/[locale]/app\projects\[id]\actions.ts:81:    (ALLOWED.workspace_admin[project.status] ?? []).includes(
src/app/[locale]/app\admin\page.tsx:47:    .from("user_roles")
src/app/[locale]/app\projects\[id]\board-actions.ts:305:    .from("user_roles")
src/app/[locale]/app\projects\[id]\board-actions.ts:379:    .from("user_roles")
src/app/[locale]/app\support\actions.ts:12://   - workspace_admins read but cannot reply
src/app/[locale]/app\support\actions.ts:195:      .from("user_roles")
src/app/[locale]/app\projects\new\actions.ts:173:    // a non-yagi workspace_admin's rollback would be silently denied
src/app/[locale]/app\projects\[id]\thread-actions.ts:30:      .from("user_roles")
src/app/[locale]/app\projects\[id]\thread-actions.ts:183:      .from("user_roles")
src/app/[locale]/app\projects\[id]\thread-actions.ts:397:    .from("user_roles")
src/app/[locale]/app\projects\[id]\thread-actions.ts:408:    if (r.role === "workspace_admin") isAdmin.add(r.user_id);
src/app/[locale]/app\projects\[id]\page.tsx:13://   - workspace_admin from same workspace also allowed for backwards compat
src/app/[locale]/app\projects\[id]\page.tsx:152:    .from("user_roles")
src/app/[locale]/app\projects\[id]\page.tsx:166:  const isWsAdmin = roles.has("workspace_admin");
src/app/[locale]/app\projects\[id]\page.tsx:323:                workspace_admin: tDetail("actor.workspace_admin"),
src/app/[locale]/app\projects\[id]\brief\actions.ts:403:    .from("user_roles")
src/app/[locale]/app\projects\[id]\brief\actions.ts:444:    .from("user_roles")
src/app/[locale]/app\projects\[id]\brief\actions.ts:978:  // Enumerate yagi_admin recipients via service role (user_roles SELECT
src/app/[locale]/app\projects\[id]\brief\actions.ts:984:    .from("user_roles")
src/app/[locale]/app\settings\layout.tsx:18:  const isWsAdmin = ctx!.workspaceRoles.includes("workspace_admin");
src/app/[locale]/app\settings\invite-form.tsx:67:          <option value="workspace_admin">{t("team_role_admin")}</option>
src/app/[locale]/app\showcases\actions.ts:658:  // workspace_admin cannot toggle made_with_yagi; only yagi_admin can.
src/app/[locale]/app\settings\actions.ts:137:  // RLS enforces workspace_admin — no explicit role check here.
src/app/[locale]/app\settings\actions.ts:155:  role: z.enum(["workspace_admin", "workspace_member"]),
src/app/[locale]/app\settings\page.tsx:49:  // workspace + team tabs require workspace_admin
src/app/[locale]/app\settings\page.tsx:50:  if (!ctx!.workspaceRoles.includes("workspace_admin")) {
src/app/[locale]/app\settings\team-panel.tsx:43:                  {m.role === "workspace_admin"
src/app/[locale]/app\showcases\[id]\page.tsx:45:  // Access: yagi_admin OR workspace_admin of the showcase's workspace.
src/lib\email\new-message.ts:92:        .from("user_roles")
src/app/[locale]/app\preprod\[id]\share-actions.ts:296:      .from("user_roles")
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:11:--   which permits a non-yagi workspace_admin to write deleted_at = now()
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      — user_roles.role = 'yagi_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:22:--   'workspace_admin' — user_roles.role = 'workspace_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 'yagi_admin', 'workspace_admin', 'system'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:349:--   auth.uid() → user_roles table
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:351:--   workspace_admin (for the same workspace as the project) → 'workspace_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:359:--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:392:  -- 2. Resolve actor_role from user_roles table.
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:409:    SELECT 1 FROM public.user_roles
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:411:       AND role = 'workspace_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:419:    v_actor_role := 'workspace_admin';
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:7:-- another workspace, after which the workspace_admin SELECT lane in
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:7:-- and the column-set is unconstrained — so a workspace_admin (who
src/lib\supabase\database.types.ts:2404:      user_roles: {
src/lib\supabase\database.types.ts:2428:            foreignKeyName: "user_roles_user_id_fkey"
src/lib\supabase\database.types.ts:2435:            foreignKeyName: "user_roles_workspace_id_fkey"
src/lib\onboarding\state.ts:30:    .from("user_roles")
src/lib\onboarding\actions.ts:32:      .from("user_roles")

 succeeded in 465ms:
-- =============================================================================
-- Phase 3.0 K-05 LOOP 1 fix ??HIGH-A: projects_insert RLS too restrictive
-- =============================================================================
-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
-- since Phase 2.0 baseline. A regular workspace member (client with
-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
-- authenticated client. This blocks all project submissions from non-admin
-- workspace members ??the primary user class for project submission.
--
-- Root cause: Phase 2.0 baseline wrote the policy for the admin-only project
-- creation path (commission intake). Phase 3.0 submitProjectAction added a
-- client-facing path using the user-scoped client without catching that the
-- INSERT policy would reject non-admin clients.
--
-- In prod today (2026-04-28) workspace_members only has role='admin' rows
-- (2 rows, both Yagi internal), so the bug was masked during all Phase 2.x
-- development. A real client (role='member' or 'viewer') would hit RLS
-- rejection on every project submit.
--
-- Fix: extend WITH CHECK to is_ws_member (any workspace member), matching
-- the read policy (projects_read uses is_ws_member). The trigger guard
-- (trg_guard_projects_status) and is_valid_transition() continue to gate
-- all status transitions independently.
-- =============================================================================

DROP POLICY IF EXISTS projects_insert ON public.projects;

CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ws_member(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

COMMENT ON POLICY projects_insert ON public.projects IS
  'K-05 LOOP 1 fix (20260427182456): any workspace member may INSERT projects. '
  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
  'project submissions. is_yagi_admin path preserved for admin console creates.';

 succeeded in 512ms:
declare
  v_user_id uuid := auth.uid();
  v_workspace_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  -- Must have a profile first
  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile_required';
  end if;

  -- Create workspace
  insert into public.workspaces (name, slug, logo_url)
  values (p_name, p_slug, p_logo_url)
  returning id into v_workspace_id;

  -- Add creator as admin member
  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
  values (v_workspace_id, v_user_id, 'admin', now());

  -- Grant workspace_admin role
  insert into public.user_roles (user_id, role, workspace_id)
  values (v_user_id, 'workspace_admin', v_workspace_id);

  return v_workspace_id;
end;
$$;


--
-- Name: FUNCTION bootstrap_workspace(p_name text, p_slug text, p_logo_url text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.bootstrap_workspace(p_name text, p_slug text, p_logo_url text) IS 'Atomically bootstraps a new workspace with the caller as admin. Bypasses RLS via security definer; enforces auth.uid() check internally.';


--
-- Name: increment_showcase_view(uuid); Type: FUNCTION; Schema: public; Owner: -

codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH: src/app/[locale]/app/projects/new/briefing-step3-actions.ts:248 — `submitBriefingAction` now relies on `transition_project_status`, but that RPC classifies callers with `workspace_admin` / `yagi_admin` roles as admin actors before checking creator ownership. The current `is_valid_transition` admin matrix does not allow `draft -> submitted`, so workspace owners/admins submitting their own draft will get `23514` and see the wrong-status toast. Since `bootstrap_workspace` grants creators `workspace_admin`, this can block the primary submit path. Recommended fix: add a DB migration that makes the RPC treat `draft -> submitted` by `projects.created_by = auth.uid()` as the client/owner transition, or otherwise explicitly allows owner-admin `draft -> submitted` without opening non-owner admin submit.

Run log summary: hotfix-6 is structurally correct, but submit via RPC needs an owner-admin role fix before migration apply + visual review.
tokens used
56,997
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH: src/app/[locale]/app/projects/new/briefing-step3-actions.ts:248 — `submitBriefingAction` now relies on `transition_project_status`, but that RPC classifies callers with `workspace_admin` / `yagi_admin` roles as admin actors before checking creator ownership. The current `is_valid_transition` admin matrix does not allow `draft -> submitted`, so workspace owners/admins submitting their own draft will get `23514` and see the wrong-status toast. Since `bootstrap_workspace` grants creators `workspace_admin`, this can block the primary submit path. Recommended fix: add a DB migration that makes the RPC treat `draft -> submitted` by `projects.created_by = auth.uid()` as the client/owner transition, or otherwise explicitly allows owner-admin `draft -> submitted` without opening non-owner admin submit.

Run log summary: hotfix-6 is structurally correct, but submit via RPC needs an owner-admin role fix before migration apply + visual review.
