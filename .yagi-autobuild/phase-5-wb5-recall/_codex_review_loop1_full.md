Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: low
reasoning summaries: none
session id: 019df2cb-25c3-7b91-88ec-69833b5bf7b4
--------
user
Phase 5 Wave B.5 — Client Recall — K-05 LOOP 1 (LOW tier, adversarial framing).

Tier: LOW per SPEC §"Codex K-05". Justification: 2-row matrix add to is_valid_transition; existing transition_project_status RPC body unchanged; no RLS / payment / auth surface change; SECURITY DEFINER + creator-first role resolution from Wave B reused as-is.

## Files in scope (4 total)

NEW:
- supabase/migrations/20260504220000_phase_5_wb5_client_recall_to_draft.sql
  • CREATE OR REPLACE FUNCTION public.is_valid_transition with 2 added client rows: submitted -> draft and in_review -> draft. All other rows verbatim from Phase 3.0 baseline (20260427164421). LANGUAGE sql, IMMUTABLE, SECURITY DEFINER, SET search_path = public — preserved. No GRANT changes.
- src/app/[locale]/app/projects/[id]/recall-actions.ts
  • recallProjectAction(input) — 'use server'. zod validates {projectId: uuid}. createSupabaseServer + sb.rpc('transition_project_status', { p_project_id, p_to_status: 'draft', p_comment: null implicit }). Error map: 42501 -> 'forbidden', 23514 -> 'invalid_transition', P0002 -> 'forbidden' (folded), other -> 'unknown'. revalidatePath on success.
- src/app/[locale]/app/projects/[id]/recall-button.tsx
  • 'use client'. AlertDialog confirm (radix). On confirm runs recallProjectAction; success -> router.push('/app/projects/new?project={projectId}&step=commit'); error -> sonner toast.error with t('error.<code>'). Sage accent on AlertDialogAction (#71D083).

MODIFIED:
- src/app/[locale]/app/projects/[id]/page.tsx
  • Added import { RecallButton } from "./recall-button" (single line)
  • Added single conditional render block between hero/info-rail row and L4 Tabs:
      {(project.status === 'submitted' || project.status === 'in_review') && isOwner && (
        <div className="mb-6 flex justify-end"><RecallButton projectId={project.id} /></div>
      )}
  • No other detail-page surfaces touched (Wave C scope).

i18n:
- messages/ko.json + messages/en.json — added project_detail.recall block (cta + confirm.{title,body,action,cancel} + error.{invalid_transition,forbidden,unknown}). 8 keys per locale per SPEC table.

## Out of scope (do NOT review)

- transition_project_status RPC body (Wave B creator-first patch already CLEAN; this Wave does not touch it).
- briefing-step3-actions.ts, briefing-canvas-step-3.tsx, all Wave B Briefing Canvas files (no changes).
- Existing actions.ts (transitionStatus form-data action — separate code path, not invoked by Recall).
- Existing detail page surfaces (StatusTimeline, HeroCard, InfoRail, DetailTabs, board-tab, progress-tab) — Wave C scope.

## Adversarial focus areas

Per SPEC §"Risk surface" + §"Verification" step 14:

1. **Role escalation via matrix bug.** Verify the 2 added rows are inside the `actor_role = 'client'` CASE block ONLY. yagi_admin / workspace_admin / system blocks must remain status-quo: no `* -> draft` paths added for them. Any path that would let a non-client role flip submitted/in_review to draft is a HIGH finding.

2. **RLS bypass via direct UPDATE.** The action uses sb.rpc(...), which is a stored-function call — it does NOT touch projects table directly via PostgREST UPDATE, so trg_guard_projects_status (which raises 'direct_status_update_forbidden' on direct UPDATE) is not triggered (RPC is the legal path). Verify the action does NOT also do a direct UPDATE elsewhere that would bypass the guard.

3. **trg_guard_projects_status interaction.** transition_project_status sets `local.transition_rpc_active=true` before the UPDATE inside its body, then `false` after. The guard trigger checks this flag. Verify the new matrix rows do not introduce any code path where the flag is left dangling (the Wave B body is unchanged, so this should be inherent — but cross-check).

4. **Creator-first role resolution edge case.** Wave B's 20260504200001 migration resolves caller as 'client' when actor_id = created_by, even if caller has yagi_admin or workspace_admin elsewhere. So a yagi_admin acting on their own draft is treated as 'client' and CAN recall. Verify this is the intended behavior (per SPEC §"State machine 변경" creator-first composes naturally — yes, intended). Then verify the inverse: a yagi_admin acting on someone ELSE's submitted project gets resolved to 'yagi_admin' role, which has no submitted -> draft path -> 23514 -> blocked. Verify this from the matrix structure.

5. **UI-side gate divergence from RPC gate.** The page.tsx gate is `(status === 'submitted' || status === 'in_review') && isOwner`. The RPC gate is the matrix + creator-first role resolution. These should be equivalent for a normal client viewer. Verify there's no scenario where:
   - UI shows the button but RPC rejects (would surface as toast but no UX-breaking)
   - UI hides the button but RPC would allow (the fundamental concern — if matrix lets yagi_admin recall their own project but UI never shows it for admin viewers, that's a "feature exists but invisible" issue, NOT a security finding; document as low-priority UX note if found)

6. **Race between recall and admin transition.** SPEC §"Race / concurrency" says transition_project_status takes `SELECT ... FOR UPDATE` row lock before status check. T1 = client recall, T2 = admin moves in_review -> in_progress. Whoever commits first wins; the loser sees 23514 with the right new from_status. Verify the action layer correctly maps 23514 to invalid_transition (yes — case 23514 -> 'invalid_transition' in recallProjectAction). Verify there's no double-click / double-submit window where T1 = recall, T1' = recall (same client) both succeed. The transition is idempotent in the sense that T1' would see status='draft' from T1 and 23514. Acceptable.

7. **Redirect target safety.** RecallButton on success calls `router.push('/app/projects/new?project={projectId}&step=commit')`. Verify the briefing canvas Wave B can hydrate this projectId without 23505 (the wipe path now uses `deleted_at IS NULL` partial index from hotfix-6 migration 20260504200000; the recalled draft is now status='draft' AND deleted_at IS NULL, so it matches the unique constraint of any existing live draft for the same user+workspace). Hotfix-6 also simplified ensureBriefingDraftProject to defensive-soft-delete-then-INSERT — but only when projectId is NOT provided. If projectId IS provided (which is our case here via ?project=...), the UPDATE path runs against the alive row. Verify the briefing-canvas wrapper actually reads ?project= query param and seeds session storage — Builder did not modify briefing-canvas.tsx in this Wave; it's the existing Wave B behavior. If it does NOT read ?project=, the redirect lands on a fresh canvas (and the recalled draft gets soft-deleted by the defensive guard) — that's an FU candidate for Wave C, NOT a HIGH for this Wave.

## Already-deferred (do NOT flag again)

- FU-Phase5-7: dangling-draft auto-wipe interaction with recall (registered in SPEC §"Out-of-scope")
- FU-Phase5-8: admin telegram on recall (over-engineering at <100 user)
- Versioning / submission diff (Phase 5 scope-out)
- All Wave A/B/sub_5/hotfix-6 deferred FUs (FU-Phase5-1 .. FU-Phase5-5)

## Already-verified (do NOT redo)

- pnpm exec tsc --noEmit clean
- pnpm exec next lint clean on touched files
- pnpm build clean
- mcp apply_migration success on jvamvbpxnztynsccvcmr
- mcp execute_sql 5 verify queries (steps 4-8) all match expected boolean

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave B.5 ready for 야기 visual smoke + ff-merge."

End with one-line summary suitable for the run log.

codex
I’ll review this as a targeted code review, staying within the four-file scope plus only the referenced existing migration/canvas paths needed to validate the redirect assumptions. I’ll avoid re-running the already-verified build/test steps.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE OR REPLACE FUNCTION public\\.is_valid_transition|actor_role = 'client'|submitted.*draft|in_review.*draft|transition_project_status|local\\.transition_rpc_active|project=|sessionStorage|RecallButton|recallProjectAction|project_detail.*recall|\\\"recall\\\"\" supabase src messages -S" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 360ms:
 M messages/en.json
 M messages/ko.json
 M src/app/[locale]/app/projects/[id]/page.tsx
?? .yagi-autobuild/phase-5-wb5-recall/
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop1.md
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop2.md
?? .yagi-autobuild/phase-5/_wave_a_task_01_result.md
?? .yagi-autobuild/phase-5/_wave_b_hotfix6_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_hotfix6_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_sub_5_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_04v3_codex_review.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop1_full.md
?? .yagi-autobuild/phase-5/_wave_b_task_06v3_codex_loop2_full.md
?? src/app/[locale]/app/projects/[id]/recall-actions.ts
?? src/app/[locale]/app/projects/[id]/recall-button.tsx
?? supabase/migrations/20260504220000_phase_5_wb5_client_recall_to_draft.sql

 succeeded in 1503ms:
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:24:--                       via transition_project_status RPC. Only used by direct
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:34:--   session-local variable `local.transition_rpc_active` which the RPC sets
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:78:  'transition_project_status() RPC or submitProjectAction server action '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:125:  'Set by transition_project_status() RPC or submitProjectAction server action. '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:156:  'Written exclusively by transition_project_status() RPC (SECURITY DEFINER). '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:275:CREATE OR REPLACE FUNCTION public.is_valid_transition(
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:289:    WHEN actor_role = 'client' THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:334:  'Called by transition_project_status() before any write. '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:342:-- SECTION E: FUNCTION transition_project_status
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:345:-- Sets session variable local.transition_rpc_active = 'true' so the trigger
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:365:CREATE OR REPLACE FUNCTION public.transition_project_status(
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:426:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:449:  PERFORM set_config('local.transition_rpc_active', 'true', true);
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:480:  PERFORM set_config('local.transition_rpc_active', 'false', true);
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:486:COMMENT ON FUNCTION public.transition_project_status(uuid, text, text) IS
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:493:REVOKE ALL ON FUNCTION public.transition_project_status(uuid, text, text) FROM PUBLIC;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:494:GRANT EXECUTE ON FUNCTION public.transition_project_status(uuid, text, text)
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:502:--   AND current_setting('local.transition_rpc_active', true) <> 'true'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:507:--   - transition_project_status() RPC — sets the session flag → passes
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:512:--     call transition_project_status() for submitted→in_review.
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:534:  IF current_setting('local.transition_rpc_active', true) = 'true' THEN
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:545:    'direct_status_update_forbidden: use transition_project_status() RPC'
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:559:  'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:560:  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:727:  'trg_guard_projects_status trigger — only transition_project_status() RPC '
src\lib\supabase\database.types.ts:2706:      transition_project_status: {
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:1:-- Phase 5 Wave B.5 — client recall (submitted/in_review -> draft).
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:6:-- RecallButton + AlertDialog on the detail page.
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:11:--     submitted   -> draft   (creator changes their mind / fixes typo
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:13:--     in_review   -> draft   (creator pulls back during the brief
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:16:--                              transition_project_status's row lock)
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:32:-- (20260504200001_phase_5_transition_project_status_creator_role.sql):
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:34:-- to 'client' by transition_project_status when acting on their own
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:42:CREATE OR REPLACE FUNCTION public.is_valid_transition(
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:56:    WHEN actor_role = 'client' THEN
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:66:        -- Wave B.5 NEW: submitted -> draft (recall before YAGI picks up the queue)
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:67:        WHEN from_status = 'submitted'    AND to_status = 'draft'       THEN true
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:68:        -- Wave B.5 NEW: in_review -> draft (recall during YAGI review window)
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:69:        WHEN from_status = 'in_review'    AND to_status = 'draft'       THEN true
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:85:        -- NOTE: admin may NOT set submitted->draft or in_review->draft
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:108:  'IMMUTABLE. Called by transition_project_status() before any write. '
supabase\migrations\20260504220000_phase_5_wb5_client_recall_to_draft.sql:109:  'Wave B.5 added client recall: submitted -> draft and in_review -> draft. '
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:1:-- Phase 5 Wave B hotfix-6 sub_2 — transition_project_status creator-first role.
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:5:-- transition_project_status RPC matched the actor as 'workspace_admin'
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:45:CREATE OR REPLACE FUNCTION public.transition_project_status(
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:103:  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:121:  PERFORM set_config('local.transition_rpc_active', 'true', true);
supabase\migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:139:  PERFORM set_config('local.transition_rpc_active', 'false', true);
supabase\migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:3:-- transition_project_status / is_valid_transition / validate_profile_role_transition
src\components\projects\project-actions.ts:13:  const { data, error } = await (supabase.rpc as any)('transition_project_status', {
src\components\projects\project-action-buttons.tsx:5:// which calls transition_project_status RPC — never direct UPDATE.
src\app\[locale]\app\projects\[id]\recall-button.tsx:4:// Phase 5 Wave B.5 — RecallButton
src\app\[locale]\app\projects\[id]\recall-button.tsx:7:// recallProjectAction (which delegates to transition_project_status RPC
src\app\[locale]\app\projects\[id]\recall-button.tsx:34:import { recallProjectAction } from "./recall-actions";
src\app\[locale]\app\projects\[id]\recall-button.tsx:36:export function RecallButton({
src\app\[locale]\app\projects\[id]\recall-button.tsx:46:  const t = useTranslations("project_detail.recall");
src\app\[locale]\app\projects\[id]\recall-button.tsx:54:      const result = await recallProjectAction({ projectId });
src\app\[locale]\app\projects\[id]\recall-button.tsx:69:      router.push(`/app/projects/new?project=${projectId}&step=commit`);
src\app\[locale]\app\projects\[id]\recall-actions.ts:4:// Phase 5 Wave B.5 — recallProjectAction
src\app\[locale]\app\projects\[id]\recall-actions.ts:6:// Thin wrapper over transition_project_status RPC. The RPC handles all
src\app\[locale]\app\projects\[id]\recall-actions.ts:46:export async function recallProjectAction(
src\app\[locale]\app\projects\[id]\recall-actions.ts:59:    "transition_project_status",
src\app\[locale]\app\projects\[id]\recall-actions.ts:64:      // Wave B.5 client recall rows (submitted->draft, in_review->draft).
src\app\[locale]\app\projects\[id]\recall-actions.ts:69:    console.error("[recallProjectAction] RPC error:", rpcErr);
src\app\[locale]\app\projects\[id]\page.tsx:36:import { RecallButton } from "./recall-button";
src\app\[locale]\app\projects\[id]\page.tsx:279:      {/* Wave B.5 — Client recall (submitted/in_review -> draft).
src\app\[locale]\app\projects\[id]\page.tsx:287:            <RecallButton projectId={project.id} />
src\components\project-detail\hero-card.tsx:38:  return status === "in_review" || status === "submitted" || status === "draft";
src\app\[locale]\app\projects\new\actions.ts:91:  const status = parsed.data.intent === "submit" ? "submitted" : "draft";
src\app\[locale]\app\projects\new\actions.ts:485:  const status = intent === "submit" ? "submitted" : "draft";
src\app\[locale]\app\projects\new\briefing-actions.ts:101:  // a wiped or hard-deleted row (sessionStorage stale after a prior wipe,
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:14://      sessionStorage, toast, redirect to /app/projects.
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:319:        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
src\app\[locale]\app\projects\new\briefing-canvas-step-3.tsx:321:        // sessionStorage failure shouldn't block the redirect
src\app\[locale]\app\projects\new\briefing-canvas.tsx:18://   - sessionStorage key "briefing_canvas_v3_state" holds:
src\app\[locale]\app\projects\new\briefing-canvas.tsx:89:  // Hydrate Step 1 form + projectId from sessionStorage if present.
src\app\[locale]\app\projects\new\briefing-canvas.tsx:93:      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
src\app\[locale]\app\projects\new\briefing-canvas.tsx:135:      window.sessionStorage.setItem(
src\app\[locale]\app\projects\new\briefing-canvas.tsx:140:      // Swallow — sessionStorage failure shouldn't block flow.
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:218:  // through the SECURITY DEFINER `transition_project_status` RPC, which:
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:222:  //     (client: draft → submitted is allowed; draft → in_review is NOT —
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:250:    "transition_project_status",
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:275:      // invalid_transition — already submitted, or status no longer draft

codex
The initial scan shows the new migration and action/button are present, with the recall rows apparently under the client branch. I’m going line-level now for the matrix, RPC flag handling, page gate, and redirect hydration path.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504220000_phase_5_wb5_client_recall_to_draft.sql' | Select-Object -First 140" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504200001_phase_5_transition_project_status_creator_role.sql' | Select-Object -First 180" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/[id]/recall-actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/[id]/recall-button.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/[id]/page.tsx' | Select-Object -Skip 250 -First 55" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 487ms:
"use server";

// =============================================================================
// Phase 5 Wave B.5 ??recallProjectAction
//
// Thin wrapper over transition_project_status RPC. The RPC handles all
// authorization (auth.uid() check + creator-first role resolution from
// Wave B's 20260504200001 migration) and validity (is_valid_transition
// matrix from this Wave's 20260504220000 migration). The action itself
// only:
//   1. Validates the input shape (uuid).
//   2. Calls the RPC with p_to_status='draft', p_comment=NULL.
//   3. Maps PostgrestError codes to a small discriminated-union return.
//   4. revalidatePath on success so the detail page + list update.
//
// Error mapping (per SPEC.md):
//   42501  -> 'forbidden'           (unauthenticated or not creator)
//   23514  -> 'invalid_transition'  (status outside recall window)
//   else   -> 'unknown'
//
// The RPC also raises P0002 (project_not_found) when the row is missing
// or hidden under RLS scope. SPEC names only the three codes above; we
// fold P0002 into 'forbidden' since the user-facing semantics are
// identical to "you can't act on this project". Logging preserves the
// distinction for debugging.
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

const recallInput = z.object({
  projectId: z.string().uuid(),
});

export type RecallProjectInput = z.input<typeof recallInput>;

export type RecallProjectResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "forbidden" | "invalid_transition" | "unknown";
      message?: string;
    };

export async function recallProjectAction(
  input: unknown,
): Promise<RecallProjectResult> {
  const parsed = recallInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  const sb = supabase as any;

  const { data: historyId, error: rpcErr } = await sb.rpc(
    "transition_project_status",
    {
      p_project_id: parsed.data.projectId,
      p_to_status: "draft",
      // p_comment NULL ??matrix marks comment_required=NO for both
      // Wave B.5 client recall rows (submitted->draft, in_review->draft).
    },
  );

  if (rpcErr) {
    console.error("[recallProjectAction] RPC error:", rpcErr);
    const code = (rpcErr.code ?? "") as string;
    const message = (rpcErr.message ?? "") as string;
    if (code === "42501") {
      return { ok: false, error: "forbidden", message };
    }
    if (code === "P0002") {
      // project_not_found ??RLS scope or hard delete. Same UX as forbidden.
      return { ok: false, error: "forbidden", message };
    }
    if (code === "23514") {
      // invalid_transition ??admin already moved the project past the
      // recall window (e.g., in_review -> in_progress).
      return { ok: false, error: "invalid_transition", message };
    }
    return { ok: false, error: "unknown", message };
  }

  if (!historyId) {
    return { ok: false, error: "unknown", message: "RPC returned null" };
  }

  // Detail page + list need to re-render against the new 'draft' status.
  revalidatePath("/[locale]/app/projects/[id]", "page");
  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true };
}

 succeeded in 486ms:
"use client";

// =============================================================================
// Phase 5 Wave B.5 ??RecallButton
//
// Outline button + AlertDialog confirm. On confirm, calls
// recallProjectAction (which delegates to transition_project_status RPC
// with p_to_status='draft'). On success, redirects to the Briefing
// Canvas commit step so the user can edit + resubmit. On error, shows
// a sonner toast with the matching projectDetail.recall.error.* copy.
//
// Conditional render lives in the parent (page.tsx); this component
// assumes the caller has already gated on (status === 'submitted' ||
// status === 'in_review') AND viewer.id === project.created_by.
// =============================================================================

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { recallProjectAction } from "./recall-actions";

export function RecallButton({
  projectId,
}: {
  projectId: string;
  // status + locale props are documented by SPEC for future-proofing
  // (Wave C may key UI variants on them) but are not used by the
  // current minimal-patch render ??the action layer + RPC re-validate
  // status, and locale is read from the next-intl context. Keeping
  // them off the prop surface for now avoids dead-code warnings.
}) {
  const t = useTranslations("project_detail.recall");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const handleConfirm = () => {
    setOpen(false);
    startTransition(async () => {
      const result = await recallProjectAction({ projectId });
      if (!result.ok) {
        const key =
          result.error === "invalid_transition"
            ? "error.invalid_transition"
            : result.error === "forbidden"
              ? "error.forbidden"
              : "error.unknown";
        toast.error(t(key));
        return;
      }
      // Briefing Canvas commit step (Wave B Step 3). The route uses the
      // existing /projects/new entry; Wave B's wipe-then-INSERT path
      // resumes the recalled draft via session-storage hydration of
      // projectId (sub_5 hotfix).
      router.push(`/app/projects/new?project=${projectId}&step=commit`);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          className="text-sm"
        >
          {pending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("cta")
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirm.title")}</AlertDialogTitle>
          <AlertDialogDescription className="keep-all leading-relaxed">
            {t("confirm.body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
          {/* Sage accent on the destructive-ish confirm. yagi-design-system
              v1.0: #71D083 is the only accent color. */}
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-[#71D083] text-black hover:bg-[#71D083]/90 focus-visible:ring-[#71D083]/40"
          >
            {t("confirm.action")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

 succeeded in 532ms:
          twinIntent={narrowTwinIntent(project.twin_intent)}
          meetingPreferredAt={project.meeting_preferred_at}
          locale={localeNarrow}
          labels={{
            section: tDetail("info_rail.section"),
            submittedOn: tDetail("info_rail.submitted_on"),
            budget: tDetail("info_rail.budget"),
            delivery: tDetail("info_rail.delivery"),
            deliveryNegotiable: tDetail("info_rail.delivery_negotiable"),
            twinIntent: tDetail("info_rail.twin_intent"),
            meeting: tDetail("info_rail.meeting"),
            meetingNone: tDetail("info_rail.meeting_none"),
            notSet: tDetail("info_rail.not_set"),
            budgetMap: {
              under_1m: tDetail("budget.under_1m"),
              "1m_to_5m": tDetail("budget.1m_to_5m"),
              "5m_to_10m": tDetail("budget.5m_to_10m"),
              negotiable: tDetail("budget.negotiable"),
            },
            twinIntentMap: {
              undecided: tDetail("twin_intent.undecided"),
              specific_in_mind: tDetail("twin_intent.specific_in_mind"),
              no_twin: tDetail("twin_intent.no_twin"),
            },
          }}
        />
      </div>

      {/* Wave B.5 ??Client recall (submitted/in_review -> draft).
          Conditional on creator viewer + recall-window status. The
          RPC re-checks both, this UI gate just hides the button when
          it would be useless. Wave C will absorb this into the
          "?꾪솴" tab next-action CTA matrix (PRODUCT-MASTER 짠C.4). */}
      {(project.status === "submitted" || project.status === "in_review") &&
        isOwner && (
          <div className="mb-6 flex justify-end">
            <RecallButton projectId={project.id} />
          </div>
        )}

      {/* L4 Tabs */}
      <div className="mb-6">
        <DetailTabs
          active={activeTab}
          labels={{
            board: tDetail("tabs.board"),
            progress: tDetail("tabs.progress"),
            comment: tDetail("tabs.comment"),
            deliverable: tDetail("tabs.deliverable"),
          }}
        />
      </div>

      {/* L5 Tab content panel */}
      <div className="mb-10">

 succeeded in 535ms:
-- Phase 5 Wave B hotfix-6 sub_2 ??transition_project_status creator-first role.
--
-- K-05 LOOP 1 (Tier 2 medium) HIGH finding: bootstrap_workspace grants
-- the workspace creator the 'workspace_admin' role. The original
-- transition_project_status RPC matched the actor as 'workspace_admin'
-- before checking creator ownership, and is_valid_transition's
-- workspace_admin matrix does NOT include `draft ??submitted`. Result:
-- every client who created their own workspace got 23514 / wrong_status
-- when pressing [?섎ː?섍린 ?? on Step 3 ??the primary submit path was
-- unreachable for the entire ?섎ː??cohort.
--
-- Fix: creator-bound transitions act as 'client' regardless of admin
-- privileges. Admin powers re-engage only when the actor is acting on
-- someone else's project (actor_id <> v_created_by branch).
--
--   IF v_actor_id = v_created_by THEN
--     v_actor_role := 'client';   -- own project = client lifecycle
--   ELSIF v_is_yagi_admin THEN
--     v_actor_role := 'yagi_admin';
--   ELSIF v_is_ws_admin THEN
--     v_actor_role := 'workspace_admin';
--   ELSE
--     v_actor_role := 'client';
--   END IF;
--
-- Side effect: a yagi_admin acting on a project they themselves created
-- now goes through the client matrix (no admin powers on own project).
-- yagi_admin is internal staff role; the "yagi staff member also creates
-- a client-style brief draft" path is rare-to-nonexistent. If we ever
-- need it, the workaround is to use a service-role tool or add a
-- yagi_admin draft ??submitted entry to is_valid_transition's matrix.
--
-- The redundant `client AND actor_id <> created_by` forbidden check
-- below the role assignment stays as defense-in-depth; under the new
-- assignment it can only fire if a non-admin non-creator caller hits
-- the function (i.e., a workspace member who is neither the creator
-- nor a workspace_admin for the project's workspace).
--
-- CREATE OR REPLACE preserves owner + EXECUTE grants by default
-- (postgres / authenticated / service_role / anon ??verified via mcp
-- pre-apply). yagi authorized skipping the DO-block verify since prod
-- is test-only at this stage; Builder verifies post-apply via SQL
-- (pg_get_functiondef + pg_proc.proowner + has_function_privilege).

CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id uuid,
  p_to_status text,
  p_comment text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor_id    uuid;
  v_actor_role  text;
  v_from_status text;
  v_created_by  uuid;
  v_workspace_id uuid;
  v_new_id      uuid;
  v_is_yagi_admin      boolean;
  v_is_ws_admin        boolean;
BEGIN

  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  END IF;

  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);

  SELECT status, created_by, workspace_id
    INTO v_from_status, v_created_by, v_workspace_id
    FROM public.projects
   WHERE id = p_project_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_is_ws_admin := EXISTS (
    SELECT 1 FROM public.user_roles
     WHERE user_id = v_actor_id
       AND role = 'workspace_admin'
       AND workspace_id = v_workspace_id
  );

  -- hotfix-6 sub_2: creator-first role resolution. Own project always
  -- flows through the client matrix even if the caller has elevated
  -- workspace_admin / yagi_admin privileges.
  IF v_actor_id = v_created_by THEN
    v_actor_role := 'client';
  ELSIF v_is_yagi_admin THEN
    v_actor_role := 'yagi_admin';
  ELSIF v_is_ws_admin THEN
    v_actor_role := 'workspace_admin';
  ELSE
    v_actor_role := 'client';
  END IF;

  IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
    RAISE EXCEPTION 'forbidden: client may only transition own projects'
      USING ERRCODE = '42501';
  END IF;

  IF p_to_status = 'in_revision' THEN
    IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
      RAISE EXCEPTION 'comment_required_min_10_chars'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
    RAISE EXCEPTION 'invalid_transition: % -> % for role %',
      v_from_status, p_to_status, v_actor_role
      USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('local.transition_rpc_active', 'true', true);

  UPDATE public.projects
     SET status       = p_to_status,
         updated_at   = now(),
         submitted_at = CASE
                          WHEN p_to_status = 'submitted' THEN now()
                          ELSE submitted_at
                        END
   WHERE id = p_project_id;

  INSERT INTO public.project_status_history (
    project_id, from_status, to_status, actor_id, actor_role, comment
  ) VALUES (
    p_project_id, v_from_status, p_to_status, v_actor_id, v_actor_role, p_comment
  )
  RETURNING id INTO v_new_id;

  PERFORM set_config('local.transition_rpc_active', 'false', true);

  RETURN v_new_id;

END $function$;

-- CREATE OR REPLACE preserves owner (postgres) + EXECUTE grants
-- (authenticated/service_role/anon) by default. Builder verifies the
-- creator-first branch landed via `pg_get_functiondef` SQL after apply
-- (yagi spec: DO-block over-engineering for test-only prod, simplified).

 succeeded in 552ms:
-- Phase 5 Wave B.5 ??client recall (submitted/in_review -> draft).
--
-- Adds exactly two new rows to is_valid_transition's `client` CASE
-- block so a project creator can pull a project back into 'draft'
-- before YAGI starts work on it. Wave C will surface this via
-- RecallButton + AlertDialog on the detail page.
--
-- New transitions:
--
--   actor_role='client':
--     submitted   -> draft   (creator changes their mind / fixes typo
--                              before YAGI takes the queue)
--     in_review   -> draft   (creator pulls back during the brief
--                              YAGI-side review window ??race-safe
--                              against trg_guard_projects_status +
--                              transition_project_status's row lock)
--
-- Forbidden (verified via SPEC verify steps 6-8):
--
--   actor_role='yagi_admin'      -> NO * -> draft
--   actor_role='workspace_admin' -> NO * -> draft
--   actor_role='client'          -> NO in_progress / in_revision /
--                                       delivered / approved -> draft
--   actor_role='system'          -> NO transitions other than
--                                       submitted -> in_review
--
-- The recall is therefore a one-way escape valve only available to
-- the creator while the project is still in the pre-work window
-- (submitted or in_review).
--
-- Composes with Wave B's creator-first role resolution patch
-- (20260504200001_phase_5_transition_project_status_creator_role.sql):
-- a workspace creator who also holds workspace_admin will be resolved
-- to 'client' by transition_project_status when acting on their own
-- project, so the new client rows trigger as intended.
--
-- All other rows of is_valid_transition's truth table are copied
-- verbatim from Phase 3.0 (20260427164421_phase_3_0_projects_lifecycle.sql,
-- section D). Function signature, language, immutability, security
-- definer, search_path, and grants are preserved by CREATE OR REPLACE.

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
        -- draft -> submitted
        WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
        -- in_progress -> in_revision
        WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
        -- delivered -> in_revision
        WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
        -- delivered -> approved (client-ONLY; this pair intentionally absent from admin block)
        WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
        -- Wave B.5 NEW: submitted -> draft (recall before YAGI picks up the queue)
        WHEN from_status = 'submitted'    AND to_status = 'draft'       THEN true
        -- Wave B.5 NEW: in_review -> draft (recall during YAGI review window)
        WHEN from_status = 'in_review'    AND to_status = 'draft'       THEN true
        -- [pre-approved states] -> cancelled
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
        -- NOTE: admin may NOT set delivered->approved (that is client-only above).
        -- NOTE: admin may NOT set submitted->draft or in_review->draft
        --       (recall is client-only, Wave B.5).
        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
          'draft','submitted','in_review','in_progress','in_revision','delivered'
        ]) THEN true
        ELSE false
      END

    -- ---- system transition ----
    WHEN actor_role = 'system' THEN
      -- The ONLY system transition: submitted -> in_review (L-015 auto-transition).
      -- system is NOT permitted to recall (Wave B.5 client-only).
      CASE
        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
        ELSE false
      END

    ELSE false
  END;
$$;

COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
  'Phase 3.0 + Wave B.5 ??pure truth-table guard for project state machine. '
  'IMMUTABLE. Called by transition_project_status() before any write. '
  'Wave B.5 added client recall: submitted -> draft and in_review -> draft. '
  'See migration headers for full allowed-transition table.';

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas.tsx' | Select-Object -First 170" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-actions.ts' | Select-Object -First 160" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n '\"recall\"|project_detail' messages/en.json messages/ko.json -C 2" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"\\.update\\(|from\\(['\\\"]projects['\\\"]\\).*update|transition_project_status\" 'src/app/[locale]/app/projects/[id]/recall-actions.ts' 'src/app/[locale]/app/projects/[id]/recall-button.tsx' 'src/app/[locale]/app/projects/[id]/page.tsx' -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260504220000_phase_5_wb5_client_recall_to_draft.sql' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ } | Select-Object -First 120' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 408ms:
messages/en.json-1647-    }
messages/en.json-1648-  },
messages/en.json:1649:  "project_detail": {
messages/en.json-1650-    "timeline": {
messages/en.json-1651-      "review": "Review",
--
messages/en.json-1714-      "deliverable_description": "Visible after delivery."
messages/en.json-1715-    },
messages/en.json:1716:    "recall": {
messages/en.json-1717-      "cta": "Recall and edit",
messages/en.json-1718-      "confirm": {
--
messages/en.json-1724-      "error": {
messages/en.json-1725-        "invalid_transition": "YAGI has already started reviewing. Refresh and try again.",
messages/en.json:1726:        "forbidden": "You don't have permission to recall this project.",
messages/en.json:1727:        "unknown": "Failed to recall. Please try again."
messages/en.json-1728-      }
messages/en.json-1729-    }
--
messages/ko.json-1712-    }
messages/ko.json-1713-  },
messages/ko.json:1714:  "project_detail": {
messages/ko.json-1715-    "timeline": {
messages/ko.json-1716-      "review": "검토",
--
messages/ko.json-1779-      "deliverable_description": "납품 후 표시됩니다."
messages/ko.json-1780-    },
messages/ko.json:1781:    "recall": {
messages/ko.json-1782-      "cta": "의뢰 회수 후 수정",
messages/ko.json-1783-      "confirm": {

2026-05-04T11:41:59.739276Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
The string is missing the terminator: '.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 exited 1 in 433ms:
The string is missing the terminator: '.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 succeeded in 483ms:
"use client";

// =============================================================================
// Phase 5 Wave B task_04 v3 ??Briefing Canvas wrapper
//
// 3-step paradigm ??"?꾨줈?앺듃 ?앹븷二쇨린???쒖옉 3?④퀎":
//   Step 1 ??Brief Start. Minimal intent: name + deliverable_types +
//            optional description. (purpose was removed in hotfix-4 ??//            it duplicated Step 2's "?쒖슜 梨꾨꼸" sidebar field.)
//   Step 2 ??Workspace. 2-row layout: top row = 蹂댁쑀 ?먮즺 + ?덊띁?곗뒪
//            (2-col on lg+); bottom row = full-width ?뷀뀒??with its
//            own internal 2-col form grid. Autosave + expandable
//            whiteboard.
//   Step 3 ??Confirm. Minimal summary + ?섎ː?섍린. (placeholder; lands
//            in task_06 v3.)
//
// State machine:
//   - sessionStorage key "briefing_canvas_v3_state" holds:
//       { name, deliverable_types, description, projectId? }
//   - Step 1 ??2: handleNext runs zod validation ??ensureBriefingDraftProject
//                 ??on success persists projectId + transitions stage state
//   - Step 2 ??3: stage state only (Step 2 autosaves to DB directly)
//   - Step 3 ??submit (in task_06 v3)
//
// "?꾩떆 ??? button is REMOVED in v3. Step 1 has only "[?ㅼ쓬 ??"; Step 2
// uses autosave (5s debounce + visible "?먮룞 ??λ맖 쨌 {ts}" cue).
// =============================================================================

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { ensureBriefingDraftProject } from "./briefing-actions";
import { BriefingCanvasStep1 } from "./briefing-canvas-step-1";
import { BriefingCanvasStep2 } from "./briefing-canvas-step-2";
import { BriefingCanvasStep3 } from "./briefing-canvas-step-3";

// ---------------------------------------------------------------------------
// Step 1 form schema ??v3 minimal (3 fields after hotfix-4 purpose removal)
// ---------------------------------------------------------------------------

export const step1Schema = z.object({
  name: z.string().trim().min(1).max(200),
  deliverable_types: z.array(z.string()).min(1),
  description: z.string().trim().max(500).optional(),
});

export type Step1FormData = z.input<typeof step1Schema>;

// ---------------------------------------------------------------------------
// Canvas state
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";

type CanvasState = Step1FormData & {
  projectId?: string;
};

const EMPTY_STATE: CanvasState = {
  name: "",
  deliverable_types: [],
  description: "",
};

type Stage = 1 | 2 | 3;

type Props = {
  brands?: { id: string; name: string }[];
  activeWorkspaceId?: string | null;
};

export function BriefingCanvas({
  brands: _brands = [],
  activeWorkspaceId: _activeWorkspaceId = null,
}: Props) {
  void _brands;
  void _activeWorkspaceId;

  const t = useTranslations("projects");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(1);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate Step 1 form + projectId from sessionStorage if present.
  const initialState = useMemo<CanvasState>(() => {
    if (typeof window === "undefined") return EMPTY_STATE;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return EMPTY_STATE;
      const parsed = JSON.parse(raw) as Partial<CanvasState>;
      return {
        name: parsed.name ?? "",
        deliverable_types: parsed.deliverable_types ?? [],
        description: parsed.description ?? "",
        projectId: parsed.projectId,
      };
    } catch {
      return EMPTY_STATE;
    }
  }, []);

  // Restore projectId on mount (canvas state persists across reloads).
  useMemo(() => {
    if (initialState.projectId) {
      setProjectId(initialState.projectId);
    }
  }, [initialState.projectId]);

  const methods = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: initialState.name,
      deliverable_types: initialState.deliverable_types,
      description: initialState.description,
    },
    // Hotfix: was 'onBlur'. Korean IME composition fired blur mid-compose
    // and let zod's resolver silently reject the form, so [?ㅼ쓬 ?? looked
    // like a no-op. 'onSubmit' triggers a single full validation on click.
    mode: "onSubmit",
    shouldFocusError: true,
  });

  const persistSession = (next: Partial<CanvasState>) => {
    try {
      const merged: CanvasState = {
        ...initialState,
        ...methods.getValues(),
        ...next,
      };
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(merged),
      );
    } catch {
      // Swallow ??sessionStorage failure shouldn't block flow.
    }
  };

  const handleNextFromStep1 = methods.handleSubmit(
    async (values) => {
      setSubmitting(true);
      try {
        const result = await ensureBriefingDraftProject({
          projectId,
          name: values.name,
          deliverable_types: values.deliverable_types ?? [],
          description: values.description ?? null,
        });
        if (!result.ok) {
          const errorKey =
            result.error === "unauthenticated"
              ? "briefing.step1.toast.unauthenticated"
              : result.error === "no_workspace"
                ? "briefing.step1.toast.no_workspace"
                : "briefing.step1.toast.draft_failed";
          toast.error(t(errorKey));
          return;
        }
        setProjectId(result.projectId);
        persistSession({ ...values, projectId: result.projectId });
        setStage(2);
      } catch (e) {
        console.error("[BriefingCanvas] ensureBriefingDraftProject threw:", e);
        toast.error(t("briefing.step1.toast.draft_failed"));
      } finally {
        setSubmitting(false);

 succeeded in 492ms:
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

  // ---------- Fresh INSERT (with defensive soft-delete) ----------
  //
  // hotfix-6 sub_2 simplification (yagi authorized after test-data
  // cleanup migration 20260504200002 wiped all in-flight brief drafts):

 succeeded in 474ms:
   1: -- Phase 5 Wave B.5 ??client recall (submitted/in_review -> draft).
   2: --
   3: -- Adds exactly two new rows to is_valid_transition's `client` CASE
   4: -- block so a project creator can pull a project back into 'draft'
   5: -- before YAGI starts work on it. Wave C will surface this via
   6: -- RecallButton + AlertDialog on the detail page.
   7: --
   8: -- New transitions:
   9: --
  10: --   actor_role='client':
  11: --     submitted   -> draft   (creator changes their mind / fixes typo
  12: --                              before YAGI takes the queue)
  13: --     in_review   -> draft   (creator pulls back during the brief
  14: --                              YAGI-side review window ??race-safe
  15: --                              against trg_guard_projects_status +
  16: --                              transition_project_status's row lock)
  17: --
  18: -- Forbidden (verified via SPEC verify steps 6-8):
  19: --
  20: --   actor_role='yagi_admin'      -> NO * -> draft
  21: --   actor_role='workspace_admin' -> NO * -> draft
  22: --   actor_role='client'          -> NO in_progress / in_revision /
  23: --                                       delivered / approved -> draft
  24: --   actor_role='system'          -> NO transitions other than
  25: --                                       submitted -> in_review
  26: --
  27: -- The recall is therefore a one-way escape valve only available to
  28: -- the creator while the project is still in the pre-work window
  29: -- (submitted or in_review).
  30: --
  31: -- Composes with Wave B's creator-first role resolution patch
  32: -- (20260504200001_phase_5_transition_project_status_creator_role.sql):
  33: -- a workspace creator who also holds workspace_admin will be resolved
  34: -- to 'client' by transition_project_status when acting on their own
  35: -- project, so the new client rows trigger as intended.
  36: --
  37: -- All other rows of is_valid_transition's truth table are copied
  38: -- verbatim from Phase 3.0 (20260427164421_phase_3_0_projects_lifecycle.sql,
  39: -- section D). Function signature, language, immutability, security
  40: -- definer, search_path, and grants are preserved by CREATE OR REPLACE.
  41: 
  42: CREATE OR REPLACE FUNCTION public.is_valid_transition(
  43:   from_status text,
  44:   to_status   text,
  45:   actor_role  text
  46: )
  47: RETURNS boolean
  48: LANGUAGE sql
  49: IMMUTABLE
  50: SECURITY DEFINER
  51: SET search_path = public
  52: AS $$
  53:   SELECT CASE
  54: 
  55:     -- ---- client transitions ----
  56:     WHEN actor_role = 'client' THEN
  57:       CASE
  58:         -- draft -> submitted
  59:         WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
  60:         -- in_progress -> in_revision
  61:         WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
  62:         -- delivered -> in_revision
  63:         WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
  64:         -- delivered -> approved (client-ONLY; this pair intentionally absent from admin block)
  65:         WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
  66:         -- Wave B.5 NEW: submitted -> draft (recall before YAGI picks up the queue)
  67:         WHEN from_status = 'submitted'    AND to_status = 'draft'       THEN true
  68:         -- Wave B.5 NEW: in_review -> draft (recall during YAGI review window)
  69:         WHEN from_status = 'in_review'    AND to_status = 'draft'       THEN true
  70:         -- [pre-approved states] -> cancelled
  71:         WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
  72:           'draft','submitted','in_review','in_progress','in_revision','delivered'
  73:         ]) THEN true
  74:         ELSE false
  75:       END
  76: 
  77:     -- ---- admin transitions (yagi_admin OR workspace_admin) ----
  78:     WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
  79:       CASE
  80:         WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
  81:         WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
  82:         WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
  83:         WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
  84:         -- NOTE: admin may NOT set delivered->approved (that is client-only above).
  85:         -- NOTE: admin may NOT set submitted->draft or in_review->draft
  86:         --       (recall is client-only, Wave B.5).
  87:         WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
  88:           'draft','submitted','in_review','in_progress','in_revision','delivered'
  89:         ]) THEN true
  90:         ELSE false
  91:       END
  92: 
  93:     -- ---- system transition ----
  94:     WHEN actor_role = 'system' THEN
  95:       -- The ONLY system transition: submitted -> in_review (L-015 auto-transition).
  96:       -- system is NOT permitted to recall (Wave B.5 client-only).
  97:       CASE
  98:         WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
  99:         ELSE false
 100:       END
 101: 
 102:     ELSE false
 103:   END;
 104: $$;
 105: 
 106: COMMENT ON FUNCTION public.is_valid_transition(text, text, text) IS
 107:   'Phase 3.0 + Wave B.5 ??pure truth-table guard for project state machine. '
 108:   'IMMUTABLE. Called by transition_project_status() before any write. '
 109:   'Wave B.5 added client recall: submitted -> draft and in_review -> draft. '
 110:   'See migration headers for full allowed-transition table.';

codex
The redirect check found an existing mismatch: `briefing-canvas.tsx` hydrates only from `sessionStorage`; it does not read `?project=`. That matches your FU-candidate framing, so I’m treating it as a low-priority UX/integration note, not a security finding.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/recall-actions.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/recall-button.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ } | Select-Object -Skip 80 -First 70' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260504200001_phase_5_transition_project_status_creator_role.sql' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ } | Select-Object -Skip 60 -First 90' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/page.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ } | Select-Object -First 310' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 457ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B.5 ??recallProjectAction
   5: //
   6: // Thin wrapper over transition_project_status RPC. The RPC handles all
   7: // authorization (auth.uid() check + creator-first role resolution from
   8: // Wave B's 20260504200001 migration) and validity (is_valid_transition
   9: // matrix from this Wave's 20260504220000 migration). The action itself
  10: // only:
  11: //   1. Validates the input shape (uuid).
  12: //   2. Calls the RPC with p_to_status='draft', p_comment=NULL.
  13: //   3. Maps PostgrestError codes to a small discriminated-union return.
  14: //   4. revalidatePath on success so the detail page + list update.
  15: //
  16: // Error mapping (per SPEC.md):
  17: //   42501  -> 'forbidden'           (unauthenticated or not creator)
  18: //   23514  -> 'invalid_transition'  (status outside recall window)
  19: //   else   -> 'unknown'
  20: //
  21: // The RPC also raises P0002 (project_not_found) when the row is missing
  22: // or hidden under RLS scope. SPEC names only the three codes above; we
  23: // fold P0002 into 'forbidden' since the user-facing semantics are
  24: // identical to "you can't act on this project". Logging preserves the
  25: // distinction for debugging.
  26: // =============================================================================
  27: 
  28: import { z } from "zod";
  29: import { revalidatePath } from "next/cache";
  30: import { createSupabaseServer } from "@/lib/supabase/server";
  31: 
  32: const recallInput = z.object({
  33:   projectId: z.string().uuid(),
  34: });
  35: 
  36: export type RecallProjectInput = z.input<typeof recallInput>;
  37: 
  38: export type RecallProjectResult =
  39:   | { ok: true }
  40:   | {
  41:       ok: false;
  42:       error: "validation" | "forbidden" | "invalid_transition" | "unknown";
  43:       message?: string;
  44:     };
  45: 
  46: export async function recallProjectAction(
  47:   input: unknown,
  48: ): Promise<RecallProjectResult> {
  49:   const parsed = recallInput.safeParse(input);
  50:   if (!parsed.success) {
  51:     return { ok: false, error: "validation", message: parsed.error.message };
  52:   }
  53: 
  54:   const supabase = await createSupabaseServer();
  55:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC name not in generated types
  56:   const sb = supabase as any;
  57: 
  58:   const { data: historyId, error: rpcErr } = await sb.rpc(
  59:     "transition_project_status",
  60:     {
  61:       p_project_id: parsed.data.projectId,
  62:       p_to_status: "draft",
  63:       // p_comment NULL ??matrix marks comment_required=NO for both
  64:       // Wave B.5 client recall rows (submitted->draft, in_review->draft).
  65:     },
  66:   );
  67: 
  68:   if (rpcErr) {
  69:     console.error("[recallProjectAction] RPC error:", rpcErr);
  70:     const code = (rpcErr.code ?? "") as string;
  71:     const message = (rpcErr.message ?? "") as string;
  72:     if (code === "42501") {
  73:       return { ok: false, error: "forbidden", message };
  74:     }
  75:     if (code === "P0002") {
  76:       // project_not_found ??RLS scope or hard delete. Same UX as forbidden.
  77:       return { ok: false, error: "forbidden", message };
  78:     }
  79:     if (code === "23514") {
  80:       // invalid_transition ??admin already moved the project past the
  81:       // recall window (e.g., in_review -> in_progress).
  82:       return { ok: false, error: "invalid_transition", message };
  83:     }
  84:     return { ok: false, error: "unknown", message };
  85:   }
  86: 
  87:   if (!historyId) {
  88:     return { ok: false, error: "unknown", message: "RPC returned null" };
  89:   }
  90: 
  91:   // Detail page + list need to re-render against the new 'draft' status.
  92:   revalidatePath("/[locale]/app/projects/[id]", "page");
  93:   revalidatePath("/[locale]/app/projects", "page");
  94:   return { ok: true };
  95: }

 succeeded in 435ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B.5 ??RecallButton
   5: //
   6: // Outline button + AlertDialog confirm. On confirm, calls
   7: // recallProjectAction (which delegates to transition_project_status RPC
   8: // with p_to_status='draft'). On success, redirects to the Briefing
   9: // Canvas commit step so the user can edit + resubmit. On error, shows
  10: // a sonner toast with the matching projectDetail.recall.error.* copy.
  11: //
  12: // Conditional render lives in the parent (page.tsx); this component
  13: // assumes the caller has already gated on (status === 'submitted' ||
  14: // status === 'in_review') AND viewer.id === project.created_by.
  15: // =============================================================================
  16: 
  17: import { useState, useTransition } from "react";
  18: import { useTranslations } from "next-intl";
  19: import { useRouter } from "@/i18n/routing";
  20: import { Loader2 } from "lucide-react";
  21: import { toast } from "sonner";
  22: import { Button } from "@/components/ui/button";
  23: import {
  24:   AlertDialog,
  25:   AlertDialogAction,
  26:   AlertDialogCancel,
  27:   AlertDialogContent,
  28:   AlertDialogDescription,
  29:   AlertDialogFooter,
  30:   AlertDialogHeader,
  31:   AlertDialogTitle,
  32:   AlertDialogTrigger,
  33: } from "@/components/ui/alert-dialog";
  34: import { recallProjectAction } from "./recall-actions";
  35: 
  36: export function RecallButton({
  37:   projectId,
  38: }: {
  39:   projectId: string;
  40:   // status + locale props are documented by SPEC for future-proofing
  41:   // (Wave C may key UI variants on them) but are not used by the
  42:   // current minimal-patch render ??the action layer + RPC re-validate
  43:   // status, and locale is read from the next-intl context. Keeping
  44:   // them off the prop surface for now avoids dead-code warnings.
  45: }) {
  46:   const t = useTranslations("project_detail.recall");
  47:   const router = useRouter();
  48:   const [open, setOpen] = useState(false);
  49:   const [pending, startTransition] = useTransition();
  50: 
  51:   const handleConfirm = () => {
  52:     setOpen(false);
  53:     startTransition(async () => {
  54:       const result = await recallProjectAction({ projectId });
  55:       if (!result.ok) {
  56:         const key =
  57:           result.error === "invalid_transition"
  58:             ? "error.invalid_transition"
  59:             : result.error === "forbidden"
  60:               ? "error.forbidden"
  61:               : "error.unknown";
  62:         toast.error(t(key));
  63:         return;
  64:       }
  65:       // Briefing Canvas commit step (Wave B Step 3). The route uses the
  66:       // existing /projects/new entry; Wave B's wipe-then-INSERT path
  67:       // resumes the recalled draft via session-storage hydration of
  68:       // projectId (sub_5 hotfix).
  69:       router.push(`/app/projects/new?project=${projectId}&step=commit`);
  70:     });
  71:   };
  72: 
  73:   return (
  74:     <AlertDialog open={open} onOpenChange={setOpen}>
  75:       <AlertDialogTrigger asChild>
  76:         <Button
  77:           type="button"
  78:           variant="outline"
  79:           size="sm"
  80:           disabled={pending}
  81:           className="text-sm"
  82:         >
  83:           {pending ? (
  84:             <Loader2 className="w-4 h-4 animate-spin" />
  85:           ) : (
  86:             t("cta")
  87:           )}
  88:         </Button>
  89:       </AlertDialogTrigger>
  90:       <AlertDialogContent>
  91:         <AlertDialogHeader>
  92:           <AlertDialogTitle>{t("confirm.title")}</AlertDialogTitle>
  93:           <AlertDialogDescription className="keep-all leading-relaxed">
  94:             {t("confirm.body")}
  95:           </AlertDialogDescription>
  96:         </AlertDialogHeader>
  97:         <AlertDialogFooter>
  98:           <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
  99:           {/* Sage accent on the destructive-ish confirm. yagi-design-system
 100:               v1.0: #71D083 is the only accent color. */}
 101:           <AlertDialogAction
 102:             onClick={handleConfirm}
 103:             className="bg-[#71D083] text-black hover:bg-[#71D083]/90 focus-visible:ring-[#71D083]/40"
 104:           >
 105:             {t("confirm.action")}
 106:           </AlertDialogAction>
 107:         </AlertDialogFooter>
 108:       </AlertDialogContent>
 109:     </AlertDialog>
 110:   );
 111: }

 succeeded in 480ms:
  61:   v_new_id      uuid;
  62:   v_is_yagi_admin      boolean;
  63:   v_is_ws_admin        boolean;
  64: BEGIN
  65: 
  66:   v_actor_id := auth.uid();
  67:   IF v_actor_id IS NULL THEN
  68:     RAISE EXCEPTION 'unauthenticated' USING ERRCODE = '42501';
  69:   END IF;
  70: 
  71:   v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
  72: 
  73:   SELECT status, created_by, workspace_id
  74:     INTO v_from_status, v_created_by, v_workspace_id
  75:     FROM public.projects
  76:    WHERE id = p_project_id
  77:    FOR UPDATE;
  78: 
  79:   IF NOT FOUND THEN
  80:     RAISE EXCEPTION 'project_not_found' USING ERRCODE = 'P0002';
  81:   END IF;
  82: 
  83:   v_is_ws_admin := EXISTS (
  84:     SELECT 1 FROM public.user_roles
  85:      WHERE user_id = v_actor_id
  86:        AND role = 'workspace_admin'
  87:        AND workspace_id = v_workspace_id
  88:   );
  89: 
  90:   -- hotfix-6 sub_2: creator-first role resolution. Own project always
  91:   -- flows through the client matrix even if the caller has elevated
  92:   -- workspace_admin / yagi_admin privileges.
  93:   IF v_actor_id = v_created_by THEN
  94:     v_actor_role := 'client';
  95:   ELSIF v_is_yagi_admin THEN
  96:     v_actor_role := 'yagi_admin';
  97:   ELSIF v_is_ws_admin THEN
  98:     v_actor_role := 'workspace_admin';
  99:   ELSE
 100:     v_actor_role := 'client';
 101:   END IF;
 102: 
 103:   IF v_actor_role = 'client' AND v_actor_id <> v_created_by THEN
 104:     RAISE EXCEPTION 'forbidden: client may only transition own projects'
 105:       USING ERRCODE = '42501';
 106:   END IF;
 107: 
 108:   IF p_to_status = 'in_revision' THEN
 109:     IF p_comment IS NULL OR length(trim(p_comment)) < 10 THEN
 110:       RAISE EXCEPTION 'comment_required_min_10_chars'
 111:         USING ERRCODE = '22023';
 112:     END IF;
 113:   END IF;
 114: 
 115:   IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
 116:     RAISE EXCEPTION 'invalid_transition: % -> % for role %',
 117:       v_from_status, p_to_status, v_actor_role
 118:       USING ERRCODE = '23514';
 119:   END IF;
 120: 
 121:   PERFORM set_config('local.transition_rpc_active', 'true', true);
 122: 
 123:   UPDATE public.projects
 124:      SET status       = p_to_status,
 125:          updated_at   = now(),
 126:          submitted_at = CASE
 127:                           WHEN p_to_status = 'submitted' THEN now()
 128:                           ELSE submitted_at
 129:                         END
 130:    WHERE id = p_project_id;
 131: 
 132:   INSERT INTO public.project_status_history (
 133:     project_id, from_status, to_status, actor_id, actor_role, comment
 134:   ) VALUES (
 135:     p_project_id, v_from_status, p_to_status, v_actor_id, v_actor_role, p_comment
 136:   )
 137:   RETURNING id INTO v_new_id;
 138: 
 139:   PERFORM set_config('local.transition_rpc_active', 'false', true);
 140: 
 141:   RETURN v_new_id;
 142: 
 143: END $function$;
 144: 
 145: -- CREATE OR REPLACE preserves owner (postgres) + EXECUTE grants
 146: -- (authenticated/service_role/anon) by default. Builder verifies the
 147: -- creator-first branch landed via `pg_get_functiondef` SQL after apply
 148: -- (yagi spec: DO-block over-engineering for test-only prod, simplified).

 succeeded in 482ms:
  81: 
  82:   const t = useTranslations("projects");
  83:   const router = useRouter();
  84:   const [stage, setStage] = useState<Stage>(1);
  85:   const [projectId, setProjectId] = useState<string | undefined>(undefined);
  86:   const [submitting, setSubmitting] = useState(false);
  87: 
  88:   // Hydrate Step 1 form + projectId from sessionStorage if present.
  89:   const initialState = useMemo<CanvasState>(() => {
  90:     if (typeof window === "undefined") return EMPTY_STATE;
  91:     try {
  92:       const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  93:       if (!raw) return EMPTY_STATE;
  94:       const parsed = JSON.parse(raw) as Partial<CanvasState>;
  95:       return {
  96:         name: parsed.name ?? "",
  97:         deliverable_types: parsed.deliverable_types ?? [],
  98:         description: parsed.description ?? "",
  99:         projectId: parsed.projectId,
 100:       };
 101:     } catch {
 102:       return EMPTY_STATE;
 103:     }
 104:   }, []);
 105: 
 106:   // Restore projectId on mount (canvas state persists across reloads).
 107:   useMemo(() => {
 108:     if (initialState.projectId) {
 109:       setProjectId(initialState.projectId);
 110:     }
 111:   }, [initialState.projectId]);
 112: 
 113:   const methods = useForm<Step1FormData>({
 114:     resolver: zodResolver(step1Schema),
 115:     defaultValues: {
 116:       name: initialState.name,
 117:       deliverable_types: initialState.deliverable_types,
 118:       description: initialState.description,
 119:     },
 120:     // Hotfix: was 'onBlur'. Korean IME composition fired blur mid-compose
 121:     // and let zod's resolver silently reject the form, so [?ㅼ쓬 ?? looked
 122:     // like a no-op. 'onSubmit' triggers a single full validation on click.
 123:     mode: "onSubmit",
 124:     shouldFocusError: true,
 125:   });
 126: 
 127:   const persistSession = (next: Partial<CanvasState>) => {
 128:     try {
 129:       const merged: CanvasState = {
 130:         ...initialState,
 131:         ...methods.getValues(),
 132:         ...next,
 133:       };
 134:       window.sessionStorage.setItem(
 135:         SESSION_STORAGE_KEY,
 136:         JSON.stringify(merged),
 137:       );
 138:     } catch {
 139:       // Swallow ??sessionStorage failure shouldn't block flow.
 140:     }
 141:   };
 142: 
 143:   const handleNextFromStep1 = methods.handleSubmit(
 144:     async (values) => {
 145:       setSubmitting(true);
 146:       try {
 147:         const result = await ensureBriefingDraftProject({
 148:           projectId,
 149:           name: values.name,
 150:           deliverable_types: values.deliverable_types ?? [],

 succeeded in 512ms:
   1: // Phase 4.x task_04 ??Post-submit detail page redesign.
   2: //
   3: // Layout (1280 max-width):
   4: //   1. Breadcrumb (workspace -> brand -> project)
   5: //   2. Status timeline (5-stage horizontal pipeline, sage active)
   6: //   3. Hero card 1:1 (720x720) + Info rail (360 wide)  [responsive grid]
   7: //   4. Detail tabs (4 tabs: 蹂대뱶 / 吏꾪뻾 / 肄붾찘??disabled / 寃곌낵臾?disabled)
   8: //   5. Tab content panel
   9: //   6. Admin actions row (yagi_admin only)
  10: //
  11: // Authorization (BLOCKER 1 consistency):
  12: //   - viewer must be project.created_by OR yagi_admin
  13: //   - workspace_admin from same workspace also allowed for backwards compat
  14: //   - everyone else -> notFound()
  15: //
  16: // Phase 4.x DOES NOT add new statuses. The 5-stage timeline maps to the
  17: // existing 9-state CHECK; ?쇱슦??/ ?쒖븞 are reserved visual slots.
  18: //
  19: // Server-only data fetch; tabs are conditionally rendered based on
  20: // ?tab= query param. Disabled tabs route to PlaceholderTab and never
  21: // trigger any DB read.
  22: 
  23: import { notFound } from "next/navigation";
  24: import Link from "next/link";
  25: import { getTranslations } from "next-intl/server";
  26: import { createSupabaseServer } from "@/lib/supabase/server";
  27: import { AdminDeleteButton } from "@/components/projects/admin-delete-button";
  28: import { ProjectActionButtons } from "@/components/projects/project-action-buttons";
  29: import { StatusTimeline } from "@/components/project-detail/status-timeline";
  30: import { HeroCard } from "@/components/project-detail/hero-card";
  31: import { InfoRail, type TwinIntent } from "@/components/project-detail/info-rail";
  32: import { DetailTabs, type TabKey } from "@/components/project-detail/tabs";
  33: import { BoardTab } from "@/components/project-detail/board-tab";
  34: import { ProgressTab } from "@/components/project-detail/progress-tab";
  35: import { PlaceholderTab } from "@/components/project-detail/placeholder-tab";
  36: import { RecallButton } from "./recall-button";
  37: 
  38: type Props = {
  39:   params: Promise<{ locale: string; id: string }>;
  40:   searchParams: Promise<{ tab?: string }>;
  41: };
  42: 
  43: type ProjectDetail = {
  44:   id: string;
  45:   title: string;
  46:   brief: string | null;
  47:   status: string;
  48:   workspace_id: string;
  49:   created_by: string;
  50:   budget_band: string | null;
  51:   target_delivery_at: string | null;
  52:   meeting_preferred_at: string | null;
  53:   twin_intent: string | null;
  54:   created_at: string;
  55:   workspace: { id: string; name: string } | null;
  56:   brand: { id: string; name: string } | null;
  57: };
  58: 
  59: function parseTab(value: string | undefined): TabKey {
  60:   if (value === "progress" || value === "comment" || value === "deliverable") {
  61:     return value;
  62:   }
  63:   return "board";
  64: }
  65: 
  66: function narrowTwinIntent(value: string | null): TwinIntent | null {
  67:   if (
  68:     value === "undecided" ||
  69:     value === "specific_in_mind" ||
  70:     value === "no_twin"
  71:   ) {
  72:     return value;
  73:   }
  74:   return null;
  75: }
  76: 
  77: export default async function ProjectDetailPage({
  78:   params,
  79:   searchParams,
  80: }: Props) {
  81:   const { locale, id } = await params;
  82:   const sp = await searchParams;
  83:   const activeTab = parseTab(sp.tab);
  84: 
  85:   const t = await getTranslations({ locale, namespace: "projects" });
  86:   const tDetail = await getTranslations({
  87:     locale,
  88:     namespace: "project_detail",
  89:   });
  90: 
  91:   const supabase = await createSupabaseServer();
  92:   const {
  93:     data: { user },
  94:   } = await supabase.auth.getUser();
  95:   if (!user) notFound();
  96: 
  97:   // Fetch project. budget_band / submitted_at / twin_intent / kind columns
  98:   // are not in generated database.types.ts (Phase 3.0 + Phase 4.x); use
  99:   // the same any-cast pattern the existing detail page used.
 100:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/4.x columns not in generated types
 101:   const sb = supabase as any;
 102:   const { data: projectRaw, error: projectErr } = (await sb
 103:     .from("projects")
 104:     .select(
 105:       `
 106:       id, title, brief, status,
 107:       workspace_id, created_by,
 108:       budget_band, target_delivery_at,
 109:       meeting_preferred_at, twin_intent, created_at,
 110:       brand:brands(id, name),
 111:       workspace:workspaces(id, name)
 112:     `
 113:     )
 114:     .eq("id", id)
 115:     .maybeSingle()) as {
 116:     data: Record<string, unknown> | null;
 117:     error: unknown;
 118:   };
 119: 
 120:   if (projectErr || !projectRaw) notFound();
 121: 
 122:   const brandRaw = projectRaw.brand;
 123:   const workspaceRaw = projectRaw.workspace;
 124: 
 125:   const project: ProjectDetail = {
 126:     id: projectRaw.id as string,
 127:     title: projectRaw.title as string,
 128:     brief: projectRaw.brief as string | null,
 129:     status: projectRaw.status as string,
 130:     workspace_id: projectRaw.workspace_id as string,
 131:     created_by: projectRaw.created_by as string,
 132:     budget_band: (projectRaw.budget_band as string | null) ?? null,
 133:     target_delivery_at:
 134:       (projectRaw.target_delivery_at as string | null) ?? null,
 135:     meeting_preferred_at:
 136:       (projectRaw.meeting_preferred_at as string | null) ?? null,
 137:     // twin_intent column added by task_01 migration (Wave D D.1 apply).
 138:     // Until apply, the SELECT returns undefined -> coerce to null. After
 139:     // apply, the value is one of the 3 enum members.
 140:     twin_intent:
 141:       (projectRaw.twin_intent as string | undefined | null) ?? null,
 142:     created_at: projectRaw.created_at as string,
 143:     brand: Array.isArray(brandRaw)
 144:       ? ((brandRaw[0] as ProjectDetail["brand"]) ?? null)
 145:       : (brandRaw as ProjectDetail["brand"]),
 146:     workspace: Array.isArray(workspaceRaw)
 147:       ? ((workspaceRaw[0] as ProjectDetail["workspace"]) ?? null)
 148:       : (workspaceRaw as ProjectDetail["workspace"]),
 149:   };
 150: 
 151:   // Authorization (BLOCKER 1 consistency: use created_by, NOT owner_id).
 152:   const { data: roleRows } = await supabase
 153:     .from("user_roles")
 154:     .select("role, workspace_id")
 155:     .eq("user_id", user.id);
 156: 
 157:   const roles = new Set(
 158:     (roleRows ?? [])
 159:       .filter(
 160:         (r) =>
 161:           r.workspace_id === null || r.workspace_id === project.workspace_id
 162:       )
 163:       .map((r) => r.role as string)
 164:   );
 165: 
 166:   const isYagiAdmin = roles.has("yagi_admin");
 167:   const isWsAdmin = roles.has("workspace_admin");
 168:   const isOwner = project.created_by === user.id;
 169: 
 170:   if (!isYagiAdmin && !isWsAdmin && !isOwner) notFound();
 171: 
 172:   const viewerRole: "admin" | "client" = isYagiAdmin || isWsAdmin
 173:     ? "admin"
 174:     : "client";
 175: 
 176:   const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
 177:   const workspaceName = project.workspace?.name ?? "??;
 178:   const brandName = project.brand?.name ?? null;
 179: 
 180:   // Status pill label (uses existing translations namespace -- same map
 181:   // already powers StatusBadge elsewhere).
 182:   const tStatus = await getTranslations({ locale, namespace: "projects" });
 183:   const statusLabel =
 184:     tStatus.has(`status_${project.status}` as never)
 185:       ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
 186:         (tStatus as any)(`status_${project.status}`)
 187:       : project.status;
 188: 
 189:   return (
 190:     <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
 191:       {/* L1 Breadcrumb */}
 192:       <nav
 193:         aria-label="breadcrumb"
 194:         className="mb-6 text-sm text-muted-foreground"
 195:       >
 196:         <Link
 197:           href={`/${locale}/app/projects`}
 198:           className="hover:text-foreground transition-colors"
 199:         >
 200:           {t("list_title")}
 201:         </Link>
 202:         <span className="mx-1.5 text-muted-foreground/60">??/span>
 203:         <span>{workspaceName}</span>
 204:         {brandName && (
 205:           <>
 206:             <span className="mx-1.5 text-muted-foreground/60">??/span>
 207:             <span>{brandName}</span>
 208:           </>
 209:         )}
 210:         <span className="mx-1.5 text-muted-foreground/60">??/span>
 211:         <span className="font-medium text-foreground keep-all">
 212:           {project.title}
 213:         </span>
 214:       </nav>
 215: 
 216:       {/* L2 Status timeline */}
 217:       <div className="mb-8">
 218:         <StatusTimeline
 219:           status={project.status}
 220:           labels={{
 221:             review: tDetail("timeline.review"),
 222:             routing: tDetail("timeline.routing"),
 223:             progress: tDetail("timeline.progress"),
 224:             proposal: tDetail("timeline.proposal"),
 225:             delivered: tDetail("timeline.delivered"),
 226:           }}
 227:         />
 228:       </div>
 229: 
 230:       {/* L3 Hero card + Info rail */}
 231:       <div className="mb-10 flex flex-col md:flex-row gap-6">
 232:         <div className="flex-1 min-w-0">
 233:           <HeroCard
 234:             title={project.title}
 235:             description={project.brief}
 236:             status={project.status}
 237:             statusLabel={statusLabel}
 238:             bannerLine={
 239:               project.status === "in_review" ||
 240:               project.status === "submitted" ||
 241:               project.status === "draft"
 242:                 ? tDetail("hero.banner_in_review")
 243:                 : null
 244:             }
 245:           />
 246:         </div>
 247:         <InfoRail
 248:           createdAt={project.created_at}
 249:           budgetBand={project.budget_band}
 250:           targetDeliveryAt={project.target_delivery_at}
 251:           twinIntent={narrowTwinIntent(project.twin_intent)}
 252:           meetingPreferredAt={project.meeting_preferred_at}
 253:           locale={localeNarrow}
 254:           labels={{
 255:             section: tDetail("info_rail.section"),
 256:             submittedOn: tDetail("info_rail.submitted_on"),
 257:             budget: tDetail("info_rail.budget"),
 258:             delivery: tDetail("info_rail.delivery"),
 259:             deliveryNegotiable: tDetail("info_rail.delivery_negotiable"),
 260:             twinIntent: tDetail("info_rail.twin_intent"),
 261:             meeting: tDetail("info_rail.meeting"),
 262:             meetingNone: tDetail("info_rail.meeting_none"),
 263:             notSet: tDetail("info_rail.not_set"),
 264:             budgetMap: {
 265:               under_1m: tDetail("budget.under_1m"),
 266:               "1m_to_5m": tDetail("budget.1m_to_5m"),
 267:               "5m_to_10m": tDetail("budget.5m_to_10m"),
 268:               negotiable: tDetail("budget.negotiable"),
 269:             },
 270:             twinIntentMap: {
 271:               undecided: tDetail("twin_intent.undecided"),
 272:               specific_in_mind: tDetail("twin_intent.specific_in_mind"),
 273:               no_twin: tDetail("twin_intent.no_twin"),
 274:             },
 275:           }}
 276:         />
 277:       </div>
 278: 
 279:       {/* Wave B.5 ??Client recall (submitted/in_review -> draft).
 280:           Conditional on creator viewer + recall-window status. The
 281:           RPC re-checks both, this UI gate just hides the button when
 282:           it would be useless. Wave C will absorb this into the
 283:           "?꾪솴" tab next-action CTA matrix (PRODUCT-MASTER 짠C.4). */}
 284:       {(project.status === "submitted" || project.status === "in_review") &&
 285:         isOwner && (
 286:           <div className="mb-6 flex justify-end">
 287:             <RecallButton projectId={project.id} />
 288:           </div>
 289:         )}
 290: 
 291:       {/* L4 Tabs */}
 292:       <div className="mb-6">
 293:         <DetailTabs
 294:           active={activeTab}
 295:           labels={{
 296:             board: tDetail("tabs.board"),
 297:             progress: tDetail("tabs.progress"),
 298:             comment: tDetail("tabs.comment"),
 299:             deliverable: tDetail("tabs.deliverable"),
 300:           }}
 301:         />
 302:       </div>
 303: 
 304:       {/* L5 Tab content panel */}
 305:       <div className="mb-10">
 306:         {activeTab === "board" && (
 307:           <BoardTab
 308:             projectId={project.id}
 309:             isYagiAdmin={isYagiAdmin}
 310:             locale={localeNarrow}

codex
## VERDICT: CLEAN

No NEW HIGH/MED findings.

Checked targeted risk areas:
- Recall rows are client-only in `is_valid_transition`; admin/system blocks do not gain `* -> draft`.
- `recallProjectAction` calls only `transition_project_status` RPC; no direct `projects.update`.
- RPC still uses `SELECT ... FOR UPDATE`, validates matrix before update, and maps race losers to `23514`.
- Creator-first behavior composes as intended: own project resolves to `client`; someone else’s project resolves to admin/client role and blocks recall unless matrix permits.
- UI gate matches normal client RPC allowance.
- Low-priority UX note only: `/app/projects/new?project=...` is pushed, but the existing canvas hydrates `projectId` from `sessionStorage`, not the query param. Per your framing, that is Wave C/FU territory, not a security finding.

VERDICT: CLEAN — Wave B.5 ready for 야기 visual smoke + ff-merge.

Run log summary: K-05 LOOP 1 review clean; no new HIGH/MED issues, only deferred query-param hydration UX note.
tokens used
34,705
## VERDICT: CLEAN

No NEW HIGH/MED findings.

Checked targeted risk areas:
- Recall rows are client-only in `is_valid_transition`; admin/system blocks do not gain `* -> draft`.
- `recallProjectAction` calls only `transition_project_status` RPC; no direct `projects.update`.
- RPC still uses `SELECT ... FOR UPDATE`, validates matrix before update, and maps race losers to `23514`.
- Creator-first behavior composes as intended: own project resolves to `client`; someone else’s project resolves to admin/client role and blocks recall unless matrix permits.
- UI gate matches normal client RPC allowance.
- Low-priority UX note only: `/app/projects/new?project=...` is pushed, but the existing canvas hydrates `projectId` from `sessionStorage`, not the query param. Per your framing, that is Wave C/FU territory, not a security finding.

VERDICT: CLEAN — Wave B.5 ready for 야기 visual smoke + ff-merge.

Run log summary: K-05 LOOP 1 review clean; no new HIGH/MED issues, only deferred query-param hydration UX note.
