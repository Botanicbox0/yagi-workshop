Phase 5 Wave B hotfix-6 sub_2 — K-05 Tier 3 low LOOP 2. Narrow verify of LOOP 1 finding closure only.

LOOP 1 was NEEDS-ATTENTION with 1 HIGH finding:

- F1 HIGH: transition_project_status RPC matched callers as workspace_admin before checking creator ownership; bootstrap_workspace grants creators workspace_admin role; is_valid_transition's workspace_admin matrix omits draft → submitted; result = every client who created their own workspace got 23514 / wrong_status on submit.

## File in scope (1 — verify only)

- supabase/migrations/20260504200001_phase_5_transition_project_status_creator_role.sql
  • CREATE OR REPLACE FUNCTION public.transition_project_status preserved (matches LOOP 1 reading: `(uuid, text, text DEFAULT NULL) → uuid SECURITY DEFINER SET search_path TO 'public'`).
  • Role-resolution block changed:
      OLD:
        IF v_is_yagi_admin THEN role := 'yagi_admin'
        ELSIF v_is_ws_admin THEN role := 'workspace_admin'
        ELSE role := 'client'
      NEW:
        IF v_actor_id = v_created_by THEN role := 'client'   -- new
        ELSIF v_is_yagi_admin THEN role := 'yagi_admin'
        ELSIF v_is_ws_admin THEN role := 'workspace_admin'
        ELSE role := 'client'
  • Everything else verbatim from the previous body (auth check, FOR UPDATE, comment-required check, is_valid_transition gate, status UPDATE, project_status_history INSERT, transition_rpc_active local config).
  • The redundant `client AND actor_id <> v_created_by` forbidden check below is preserved as defense-in-depth.
  • Per yagi simplification: no DO-block verify, no explicit ALTER OWNER, no explicit GRANT EXECUTE — relying on CREATE OR REPLACE preserving owner (postgres) + grants (authenticated/service_role/anon).

## Scope NOT for LOOP 2 (already-decided context — do NOT review)

- supabase/migrations/20260504200000_phase_5_wizard_draft_uniq_with_deleted_at.sql (LOOP 1 already CLEAN on this scope, no changes since)
- supabase/migrations/20260504200002_phase_5_cleanup_test_brief_drafts.sql (yagi-authorized DELETE on test-only prod state — out of LOOP scope)
- src/app/[locale]/app/projects/new/briefing-actions.ts (simplified per yagi authorization to single defensive soft-delete + fresh INSERT — no review)
- src/app/[locale]/app/projects/new/briefing-step3-actions.ts (RPC error mapping path — already CLEAN at LOOP 1)
- src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx, briefing-canvas.tsx, briefing-canvas-step-2*, briefing-step2-actions.ts (no changes since LOOP 1)
- All i18n keys

## Two narrow verify points

1. **Creator-first branch correctness.**
   - The new branch must be the FIRST condition in the IF-ELSIF chain (precedes is_yagi_admin AND is_ws_admin checks).
   - The branch predicate is `v_actor_id = v_created_by` (the right-hand variable is the loaded value from the FOR UPDATE SELECT, not p_project_id).
   - Branch sets `v_actor_role := 'client'`.
   - Side-effect on yagi_admin acting on own project: yagi_admin loses elevated powers when actor IS creator. yagi accepted this trade-off as rare-to-nonexistent (yagi internal staff would not author client-style brief drafts). Verify nothing else in the function body assumes yagi_admin role for self-projects.

2. **Owner + grant preservation under CREATE OR REPLACE.**
   - CREATE OR REPLACE preserves owner + EXECUTE grants by default in Postgres. The migration relies on that default and does not include explicit ALTER OWNER / GRANT EXECUTE. Verify that's correct (it is — pg docs are explicit on this; CREATE OR REPLACE replaces only the body / language / volatility / etc., not ownership or ACLs).
   - Reference state pre-apply (verified by Builder via mcp): owner=postgres, EXECUTE=true for authenticated, anon, service_role.

## Already-deferred (do NOT flag again)

- FU-Phase5-3 / FU-Phase5-4 / FU-Phase5-5
- DO-block verify omission (yagi explicit simplification — over-engineering for test-only prod)
- assertProjectMutationAuth duplication between step2 and step3 actions (LOOP 1 of task_06 v3 noted as intentional)
- has_plan / projects.purpose column drops (yagi opted to keep)
- Cleanup migration data-destruction safety (yagi authorized)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION | PARTIAL>

CLEAN = creator-first branch landed correctly + owner/grant preservation logic is sound; no NEW HIGH/MED introduced.

PARTIAL = closure but residual single-line miss (Builder closes inline + commits without LOOP 3).

NEEDS-ATTENTION = closure regressed OR new HIGH/MED → STOP + escalate.

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

End with one-line summary suitable for the run log.
