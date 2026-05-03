Reading additional input from stdin...
OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: medium
reasoning summaries: none
session id: 019def03-0c3e-76a2-a267-3f39107c5508
--------
user
Wave D task_D1 — Codex K-05 final review for Phase 4.x branch g-b-9-phase-4 vs main. The branch has 14 commits in Wave C.5d alone closing prior K-05 findings; LOOP 4 of sub_03f_5 returned CLEAN at 49k tokens. This is the BRANCH-WIDE final pass before ff-merge.

Scope: do NOT re-audit anything in `.yagi-autobuild/phase-4-x/_wave_c5d_sub03f_5_codex_review_loop4.md`. That set (F1-F5) is already CLOSED + applied to prod. Look for NEW findings outside that envelope.

Builder grep audit results (do not redo):
- Pattern 1 (workspace_members `created_at asc limit 1` first-membership fallback): 0 hits across src/ ✓
- Pattern 2 (`workspaces[0]` / `memberships[0]` array index): 4 hits, all accounted for —
   - `src/lib/workspace/active.ts:121` → resolver's intended fallback (return memberships[0] when no cookie)
   - `src/app/[locale]/app/preprod/new/page.tsx:57` → JOIN result on a project row (not user-membership)
   - 2 references inside comments/docs
- Pattern 3 (`REVOKE UPDATE (col,...)` column-level only): 1 hit at `supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399`. This is the Phase 3.1 hotfix-3 line that sub_03f_2's `20260504004536` migration explicitly supersedes by REVOKE'ing table-level UPDATE and re-GRANTing only (document, updated_at). Confirm the supersession is effective (the new migration runs after the old one and does not get re-overridden).

Files in scope (30, listed in `.yagi-autobuild/phase-4-x/_phase_4_x_review_targets.log`):
- 14 SQL migrations (Phase 3.1 + Phase 4.x including the 3 sub_03f_5 ones applied to prod 2026-05-04)
- 5 auth routes (`src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts`, locale auth UI)
- 5 server actions (`projects/new/actions.ts`, `projects/[id]/board-actions.ts`, `projects/[id]/ref-actions.ts`, `settings/actions.ts`, `onboarding/profile/actions.ts`)
- 7 active-workspace cascade files (`lib/workspace/active.ts`, `lib/app/context.ts`, `app/layout.tsx`, `projects/page.tsx`, `dashboard/page.tsx`, `projects/new/page.tsx`, `new-project-wizard.tsx`)
- 3 Supabase email templates (PKCE wiring)
- 3 auth UI pages (signin / signup / forgot-password)

Six focus areas — adversarial:

1. RLS scope (cross-tenant leak) — every `.from(table).select()` chain in the listed files: does it filter on `workspace_id` or rely on RLS only? sub_03e cascade audit cleared the obvious project-list surfaces; check the rest.

2. SECURITY DEFINER RPC caller-bound validation — every CREATE FUNCTION ... SECURITY DEFINER in the migration set: does it explicitly verify the caller, validate inputs, and refuse to write server-managed columns from caller-supplied values? `add_project_board_pdf`, `seed_project_board_from_wizard`, `add_project_board_url`, `remove_project_board_attachment`, `update_project_board_url_note`, `toggle_project_board_lock`, `handle_new_user`, anything in the workspace_kind / project_licenses migration.

3. R2 storage_key user-id binding (sub_03f_5 F2 pattern) — does the binding generalise across every code path that writes a storage_key? Check `getBoardAssetPutUrlAction`, `getWizardAssetPutUrlAction`, anything in board-actions.ts that generates keys, the asset upload helpers in `lib/r2/`.

4. Effective UPDATE state on every migration-touched table — beyond `project_boards` (sub_03f_2 closed): does any other Phase 4.x migration leave a table with table-level UPDATE granted to authenticated while server-managed columns rely on column-level REVOKE? Check `workspaces`, `projects`, `project_licenses`, `profiles`, `user_roles`, anything else the migrations touch.

5. Server action user-input trust boundary — every action that takes `unknown` input: zod schema present? client-supplied IDs (workspaceId, projectId, boardId, brand_id) re-verified server-side against caller's membership before any write?

6. Email template + auth route coherence — `src/app/auth/confirm/route.ts` vs the three Supabase templates. PKCE intermediate page — GET renders without consuming OTP, POST calls verifyOtp with same-origin guard, locale + next sanitisation, recovery type forces `/reset-password`. Is the dashboard paste guide (`_wave_c5d_dashboard_paste_guide.md`) consistent with the route handler's allowlist?

Do NOT re-flag findings already closed in prior loops:
- F1 (PdfAttachmentSchema regex) — closed
- F2 (RPC caller-bound prefix) — closed
- F3 (seed RPC validation + asset_index server-recompute + 3-arg overload drop) — closed
- F4 (updateProjectBoardAction owner check) — closed
- F5 (has_*_privilege denied-column assertions including created_at) — closed
- sub_03 / sub_03e cascade (8 active-workspace surfaces) — closed
- sub_01 (PKCE template wiring) — closed

Output format (strict):

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (not in prior loops):
[FINDING N] CLASS (HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW): file:line — short description — recommended fix

If 0 NEW HIGH/MED findings, declare:
"VERDICT: CLEAN — Phase 4.x branch ready for ff-merge to main."

If any NEW HIGH/MED:
"VERDICT: NEEDS-ATTENTION — block ff-merge until findings addressed."

End with one-line summary suitable for run log.
codex
I’ll run this as a branch-wide review pass, using the provided exclusions as constraints. I’ll first identify the branch diff and target files, then inspect the SQL/function grants and server-action trust boundaries without re-opening the closed F1-F5 envelope.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content .yagi-autobuild/phase-4-x/_phase_4_x_review_targets.log' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short; git branch --show-current; git merge-base HEAD main' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_5_codex_review_loop4.md' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 432ms:
Reading additional input from stdin...
OpenAI Codex v0.125.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019deeb1-60e0-7e70-a432-f201970b114e
--------
user
LOOP 4 of the Wave C.5d sub_03f_5 K-05 review ??protocol-exception cycle authorised by yagi (chat 2026-05-02) because LOOP 3 left exactly one residual: F5's denied-column assertion list omitted project_boards.created_at.

Builder commit 35d56f3 adds a single line:
  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.created_at';
  END IF;

inside the DO block of supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql, alongside the existing denials for id, project_id, schema_version, source.

Verify ONLY F5 closure. Do NOT re-review the previously-CLOSED items (F1, F2, F3a, F3b, F4).

Three checks:
1. created_at deny assertion is present in the DO block of 20260504004536_*.sql
2. All five server-managed-only columns now have a has_column_privilege deny assertion: id, project_id, schema_version, source, created_at
3. The single-line addition does NOT introduce any new HIGH-A / HIGH-B / MED-A / MED-C finding

Output format (strict):

## VERDICT: <CLEAN | NEEDS-ATTENTION>

F5: CLOSED / PARTIAL with one-line justification.

If CLEAN, declare:
"VERDICT: CLEAN ??sub_03 + sub_03f ready for ff-merge after yagi prod migration apply (3 migrations: 20260504004349, 20260504004536, 20260504010151)."

If anything still open or new finding introduced:
"VERDICT: NEEDS-ATTENTION ??protocol-exception cycle did not close the residual; escalate."

End with a one-line summary suitable for the run log.
codex
I?셪l verify only the targeted migration assertion block and check whether the added `created_at` denial changes the scoped finding surface.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git show --stat --oneline --decorate 35d56f3 -- supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git diff -- supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"has_column_privilege\\('authenticated', 'public\\.project_boards', '(id|project_id|schema_version|source|created_at)', 'UPDATE'\\)|sub_03f_2 assert failed|project_boards\" supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 452ms:
1:-- Wave C.5d sub_03f_2 ??close the project_boards UPDATE bypass.
4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
23:-- client can UPDATE on project_boards are `document` (the user's own
38:REVOKE UPDATE ON project_boards FROM authenticated;
39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
53:  IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
54:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';
59:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
60:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.document';
62:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
63:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.updated_at';
70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
71:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
74:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
77:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
79:  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
80:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
82:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
83:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_by';
85:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
86:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
94:  IF has_column_privilege('authenticated', 'public.project_boards', 'id', 'UPDATE') THEN
95:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.id';
97:  IF has_column_privilege('authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
98:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.project_id';
100:  IF has_column_privilege('authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
101:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.schema_version';
103:  IF has_column_privilege('authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
104:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.source';
109:  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
110:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.created_at';

 succeeded in 486ms:
35d56f3 (HEAD -> g-b-9-phase-4) fix(phase-4-x): wave-c5d sub_03f_5 LOOP 3 F5 final closure ??created_at deny assertion
 ...260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql | 6 ++++++
 1 file changed, 6 insertions(+)

 succeeded in 485ms:
codex
The targeted file has the `created_at` assertion at the expected location, and the current worktree shows no uncommitted diff for that migration. I?셫 reading the surrounding block now to confirm it is inside the same `DO` block and not a stray assertion.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$path='"'supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql'; "'$lines=Get-Content -LiteralPath $path; for($i=45; $i -le 116; $i++){ if($i -le $lines.Length){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git show --unified=20 --format=medium 35d56f3 -- supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 367ms:
commit 35d56f3b0ce13a643c8c40edab992879decb6911
Author: Byeongsam Yun <yagi@yagiworkshop.xyz>
Date:   Mon May 4 01:34:33 2026 +0900

    fix(phase-4-x): wave-c5d sub_03f_5 LOOP 3 F5 final closure ??created_at deny assertion
    
    Codex K-05 LOOP 3 verdict (codex exec) closed F3a + F3b but flagged F5
    as PARTIAL with one remaining gap: project_boards.created_at was the
    sole server-managed column missing from the has_column_privilege deny
    assertion list. Fix is a single line in the existing DO block.
    
    created_at risk if writable: a client can forge audit timestamps for
    rows within their own RLS scope (no cross-tenant leak; RLS still
    gates row visibility). Low security impact, but the K-05 protocol
    demands strict closure of the enumeration.
    
    This is the third auto-fix cycle on the sub_03f_5 finding set. Per
    CODEX_TRIAGE.md the second consecutive auto-fix cycle should
    escalate, but yagi authorised one extra cycle (chat 2026-05-02)
    because the residual was a literal one-column omission, not a
    structural depth issue. Logged as a protocol exception in _run.log.
    
    Migration still unapplied to prod ??Codex K-05 LOOP 4 (the protocol-
    exception cycle) runs next; if LOOP 4 returns CLEAN, yagi GO required
    before mcp apply_migration on the three sub_03f migrations.
    
    Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>

diff --git a/supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql b/supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql
index c4459e0..0140aea 100644
--- a/supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql
+++ b/supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql
@@ -86,21 +86,27 @@ BEGIN
     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
   END IF;
 
   -- sub_03f_5 LOOP 2 F5: extend denied-column coverage to the remaining
   -- server-managed columns the prior assertion only mentioned in
   -- comments. id / project_id are unique-key columns that should never
   -- be UPDATEd from PostgREST; schema_version and source are
   -- server-set-once during INSERT.
   IF has_column_privilege('authenticated', 'public.project_boards', 'id', 'UPDATE') THEN
     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.id';
   END IF;
   IF has_column_privilege('authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.project_id';
   END IF;
   IF has_column_privilege('authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.schema_version';
   END IF;
   IF has_column_privilege('authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.source';
   END IF;
+  -- sub_03f_5 LOOP 3 F5 final closure: created_at is also server-managed
+  -- (set by INSERT default, never reissued); a writable created_at would
+  -- let clients forge audit timestamps within their own RLS row scope.
+  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
+    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.created_at';
+  END IF;
 END $$;

 succeeded in 368ms:
45:-- column_privileges only see direct grants to the named role; they do
46:-- not surface privileges inherited via PUBLIC or via role membership.
47:-- Use has_table_privilege() / has_column_privilege() instead ??those
48:-- check effective privileges (the same path PostgREST evaluates) so
49:-- the assertion catches drift through any inheritance chain.
50:DO $$
51:BEGIN
52:  -- Effective table-level UPDATE must be denied to authenticated.
53:  IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
54:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';
55:  END IF;
56:
57:  -- Effective column-level UPDATE must remain on the explicitly granted
58:  -- columns the action layer relies on.
59:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
60:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.document';
61:  END IF;
62:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
63:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.updated_at';
64:  END IF;
65:
66:  -- Effective column-level UPDATE must be denied on every server-managed
67:  -- column. asset_index, attached_pdfs, attached_urls, is_locked,
68:  -- locked_by, locked_at, schema_version, source, project_id, id flow
69:  -- through SECURITY DEFINER RPCs or the service-role client.
70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
71:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
72:  END IF;
73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
74:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
75:  END IF;
76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
77:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
78:  END IF;
79:  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
80:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
81:  END IF;
82:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
83:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_by';
84:  END IF;
85:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
86:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
87:  END IF;
88:
89:  -- sub_03f_5 LOOP 2 F5: extend denied-column coverage to the remaining
90:  -- server-managed columns the prior assertion only mentioned in
91:  -- comments. id / project_id are unique-key columns that should never
92:  -- be UPDATEd from PostgREST; schema_version and source are
93:  -- server-set-once during INSERT.
94:  IF has_column_privilege('authenticated', 'public.project_boards', 'id', 'UPDATE') THEN
95:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.id';
96:  END IF;
97:  IF has_column_privilege('authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
98:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.project_id';
99:  END IF;
100:  IF has_column_privilege('authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
101:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.schema_version';
102:  END IF;
103:  IF has_column_privilege('authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
104:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.source';
105:  END IF;
106:  -- sub_03f_5 LOOP 3 F5 final closure: created_at is also server-managed
107:  -- (set by INSERT default, never reissued); a writable created_at would
108:  -- let clients forge audit timestamps within their own RLS row scope.
109:  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
110:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.created_at';
111:  END IF;
112:END $$;

codex
## VERDICT: CLEAN

F5: CLOSED ??`created_at` is asserted inside the `DO` block, all five columns are covered (`id`, `project_id`, `schema_version`, `source`, `created_at`), and no new scoped finding was introduced.

VERDICT: CLEAN ??sub_03 + sub_03f ready for ff-merge after yagi prod migration apply (3 migrations: 20260504004349, 20260504004536, 20260504010151).

Run log: LOOP 4 F5 closure verified CLEAN for `20260504004536`; residual `created_at` deny assertion gap is closed.
2026-05-03T16:35:14.509810Z ERROR codex_core::session: failed to record rollout items: thread 019deeb1-60e0-7e70-a432-f201970b114e not found
tokens used
49,274
## VERDICT: CLEAN

F5: CLOSED ??`created_at` is asserted inside the `DO` block, all five columns are covered (`id`, `project_id`, `schema_version`, `source`, `created_at`), and no new scoped finding was introduced.

VERDICT: CLEAN ??sub_03 + sub_03f ready for ff-merge after yagi prod migration apply (3 migrations: 20260504004349, 20260504004536, 20260504010151).

Run log: LOOP 4 F5 closure verified CLEAN for `20260504004536`; residual `created_at` deny assertion gap is closed.

 succeeded in 436ms:
# Wave D task_D1 K-05 final review targets ??Phase 4.x branch (main..HEAD = 189 files)
# Filtered to security-critical surfaces only (lesson from sub_03f_3 LOOP 1 = 628k tokens).

# === DB migrations (14 ??all security-critical) ===
supabase/migrations/20260429113853_phase_3_1_project_board.sql
supabase/migrations/20260429124343_phase_3_1_k05_loop_1_fixes.sql
supabase/migrations/20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql
supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql
supabase/migrations/20260430075826_phase_3_1_hotfix_3_meeting_preferred_at.sql
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql
supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql
supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql
supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql
supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql

# === Auth routes (5) ===
src/app/auth/confirm/route.ts
src/app/auth/callback/route.ts
src/app/[locale]/auth/expired/page.tsx
src/app/[locale]/auth/layout.tsx
src/app/[locale]/auth/verify/page.tsx

# === Server actions + RLS-adjacent (high-impact) ===
src/app/[locale]/app/projects/new/actions.ts
src/app/[locale]/app/projects/[id]/board-actions.ts
src/app/[locale]/app/projects/[id]/ref-actions.ts
src/app/[locale]/app/settings/actions.ts
src/app/[locale]/onboarding/profile/actions.ts

# === Active-workspace cascade (sub_03 + sub_03f) ===
src/lib/workspace/active.ts
src/lib/app/context.ts
src/app/[locale]/app/layout.tsx
src/app/[locale]/app/projects/page.tsx
src/app/[locale]/app/dashboard/page.tsx
src/app/[locale]/app/projects/new/page.tsx
src/app/[locale]/app/projects/new/new-project-wizard.tsx

# === Email templates (PKCE wiring) ===
supabase/templates/email/confirm.html
supabase/templates/email/magic_link.html
supabase/templates/email/recovery.html

# === Auth UI ===
src/app/[locale]/(auth)/signin/page.tsx
src/app/[locale]/(auth)/signup/page.tsx
src/app/[locale]/(auth)/forgot-password/page.tsx

 succeeded in 568ms:
 M .yagi-autobuild/phase-4-x/_followups.md
?? .yagi-autobuild/PRODUCT-MASTER.md
?? .yagi-autobuild/phase-4-x/_phase4_changed_files.log
?? .yagi-autobuild/phase-4-x/_phase4_review_targets.log
?? .yagi-autobuild/phase-4-x/_phase_4_x_codex_final_loop1.md
?? .yagi-autobuild/phase-4-x/_phase_4_x_review_targets.log
?? .yagi-autobuild/phase-4-x/_wave-c5b-amendments-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5b-codex-amendments-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5b-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5c-prompt-v2.md
?? .yagi-autobuild/phase-4-x/_wave-c5c-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5d-prompt.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03_codex_review_loop1.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03e_codex_review_loop1.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_3_codex_exec_loop1.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_5_codex_review_loop2.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_5_codex_review_loop3.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_5_codex_review_loop4.md
?? .yagi-autobuild/phase-4-x/_wave_d_codex_final_loop1.md
?? .yagi-autobuild/phase-5/
g-b-9-phase-4
5bfca60c20e165ed884019525962ca108ed4b5f0

codex
The target list and prior-loop file are loaded. I see unrelated/autobuild workspace dirt, so I’ll avoid touching files and keep this to read-only review commands. Next I’m extracting the branch-side security-relevant code paths from the 30 listed targets.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "CREATE (OR REPLACE )?FUNCTION|SECURITY DEFINER|GRANT UPDATE|REVOKE UPDATE|ALTER TABLE|CREATE TABLE|CREATE POLICY|DROP FUNCTION|has_(table|column)_privilege" supabase/migrations/20260429113853_phase_3_1_project_board.sql supabase/migrations/20260429124343_phase_3_1_k05_loop_1_fixes.sql supabase/migrations/20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql supabase/migrations/20260430075826_phase_3_1_hotfix_3_meeting_preferred_at.sql supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content .yagi-autobuild/phase-4-x/_wave_c5d_dashboard_paste_guide.md -ErrorAction SilentlyContinue; Get-Content supabase/templates/email/confirm.html; Get-Content supabase/templates/email/magic_link.html; Get-Content supabase/templates/email/recovery.html' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "storage_key|storageKey|board-assets|wizard|PutUrl|presign|R2|key" src/lib/r2 src/app/[locale]/app/projects/[id]/board-actions.ts src/app/[locale]/app/projects/new/actions.ts' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"\\.from\\(|\\.rpc\\(|\\.insert\\(|\\.update\\(|\\.upsert\\(|\\.delete\\(|z\\.object|safeParse|parse\\(|FormData|unknown|workspaceId|projectId|boardId|brand_id|storage_key|storageKey|create(Board|Wizard)|get(Board|Wizard).*PutUrl|r2|verifyOtp|token_hash|same-origin|next|locale\" src/app/auth/confirm/route.ts src/app/auth/callback/route.ts src/app/[locale]/auth/expired/page.tsx src/app/[locale]/auth/layout.tsx src/app/[locale]/auth/verify/page.tsx src/app/[locale]/app/projects/new/actions.ts src/app/[locale]/app/projects/[id]/board-actions.ts src/app/[locale]/app/projects/[id]/ref-actions.ts src/app/[locale]/app/settings/actions.ts src/app/[locale]/onboarding/profile/actions.ts src/lib/workspace/active.ts src/lib/app/context.ts src/app/[locale]/app/layout.tsx src/app/[locale]/app/projects/page.tsx src/app/[locale]/app/dashboard/page.tsx src/app/[locale]/app/projects/new/page.tsx src/app/[locale]/app/projects/new/new-project-wizard.tsx src/app/[locale]/(auth)/signin/page.tsx src/app/[locale]/(auth)/signup/page.tsx src/app/[locale]/(auth)/forgot-password/page.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 868ms:
supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:30:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:37:SECURITY DEFINER
supabase/migrations/20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
supabase/migrations/20260429113853_phase_3_1_project_board.sql:25:CREATE TABLE IF NOT EXISTS project_board_versions (
supabase/migrations/20260429113853_phase_3_1_project_board.sql:42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase/migrations/20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase/migrations/20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations/20260429113853_phase_3_1_project_board.sql:90:ALTER TABLE project_board_versions ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260429113853_phase_3_1_project_board.sql:92:CREATE POLICY project_board_versions_select ON project_board_versions
supabase/migrations/20260429113853_phase_3_1_project_board.sql:107:CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
supabase/migrations/20260429113853_phase_3_1_project_board.sql:114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations/20260429113853_phase_3_1_project_board.sql:120:SECURITY DEFINER
supabase/migrations/20260429113853_phase_3_1_project_board.sql:155:CREATE OR REPLACE FUNCTION init_project_board(
supabase/migrations/20260429113853_phase_3_1_project_board.sql:160:SECURITY DEFINER
supabase/migrations/20260429113853_phase_3_1_project_board.sql:183:CREATE OR REPLACE FUNCTION toggle_project_board_lock(
supabase/migrations/20260429113853_phase_3_1_project_board.sql:189:SECURITY DEFINER
supabase/migrations/20260429124343_phase_3_1_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations/20260429124343_phase_3_1_k05_loop_1_fixes.sql:17:SECURITY DEFINER
supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:21:ALTER TABLE public.profiles
supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:24:ALTER TABLE public.profiles
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:4:-- function from migration 20260429151821 is `SECURITY DEFINER` and is
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:8:-- table-level UPDATE revoke does NOT cover SECURITY DEFINER paths, so
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:47:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb, jsonb);
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:53:CREATE OR REPLACE FUNCTION assert_caller_bound_pdf_storage_key(
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:76:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:85:SECURITY DEFINER
supabase/migrations/20260430075826_phase_3_1_hotfix_3_meeting_preferred_at.sql:8:ALTER TABLE projects
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:26:--   - add_project_board_pdf       (SECURITY DEFINER RPC)
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:27:--   - add_project_board_url       (SECURITY DEFINER RPC)
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:28:--   - toggle_project_board_lock   (SECURITY DEFINER RPC)
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:47:-- Use has_table_privilege() / has_column_privilege() instead — those
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:53:  IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:59:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:62:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:69:  -- through SECURITY DEFINER RPCs or the service-role client.
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:79:  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:82:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:85:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:94:  IF has_column_privilege('authenticated', 'public.project_boards', 'id', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:97:  IF has_column_privilege('authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:100:  IF has_column_privilege('authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:103:  IF has_column_privilege('authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:109:  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql:19:CREATE OR REPLACE FUNCTION public.handle_new_user()
supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql:22:SECURITY DEFINER
supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql:78:-- Defense in depth: SECURITY DEFINER functions don't need EXECUTE granted
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:17:SECURITY DEFINER
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:91:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:100:SECURITY DEFINER
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:174:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:180:SECURITY DEFINER
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:241:CREATE OR REPLACE FUNCTION update_project_board_url_note(
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:247:SECURITY DEFINER
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:314:SECURITY DEFINER
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:6:ALTER TABLE workspaces
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:19:ALTER TABLE projects
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:26:ALTER TABLE projects
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:29:ALTER TABLE projects
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:44:CREATE TABLE project_licenses (
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:67:ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:70:CREATE POLICY "project_licenses_select_admin" ON project_licenses
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:2:-- Execution: additive only -- ALTER TABLE ADD COLUMN IF NOT EXISTS with safe defaults
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:8:ALTER TABLE project_boards
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:17:-- SECURITY DEFINER, search_path locked to public, pg_temp.
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:27:SECURITY DEFINER
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:113:-- SECURITY DEFINER, search_path locked to public, pg_temp.
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:115:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:124:SECURITY DEFINER
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:208:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:214:SECURITY DEFINER
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:285:CREATE OR REPLACE FUNCTION update_project_board_url_note(
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:291:SECURITY DEFINER
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql:359:SECURITY DEFINER
supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:4:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:13:SECURITY DEFINER
supabase/migrations/20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
supabase/migrations/20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:11:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);

 succeeded in 770ms:
src/app/[locale]/app/projects/[id]/board-actions.ts:30:  createBriefAssetPutUrl,
src/app/[locale]/app/projects/[id]/board-actions.ts:38:// K-05 LOOP 1 MEDIUM F6 fix: same validator as wizard's submitProjectAction
src/app/[locale]/app/projects/[id]/board-actions.ts:40:// in initial state). Otherwise document MUST contain a `store` object key.
src/app/[locale]/app/projects/[id]/board-actions.ts:43:  if (Object.keys(doc).length === 0) return true;
src/app/[locale]/app/projects/[id]/board-actions.ts:546:  // Upload to R2 first (server-generated key for this board)
src/app/[locale]/app/projects/[id]/board-actions.ts:549:  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
src/app/[locale]/app/projects/[id]/board-actions.ts:552:    const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
src/app/[locale]/app/projects/[id]/board-actions.ts:563:    console.error("[addPdfAttachmentAction] R2 upload error:", err);
src/app/[locale]/app/projects/[id]/board-actions.ts:573:      p_storage_key: storageKey,
src/app/[locale]/app/projects/new/actions.ts:15:// The wizard now creates the projects row early (status='draft') so Step 2
src/app/[locale]/app/projects/new/actions.ts:22://                           backwards compatibility; wizard no longer calls
src/app/[locale]/app/projects/new/actions.ts:24://   - ensureDraftProject  : find-or-create the user's wizard draft. Returns
src/app/[locale]/app/projects/new/actions.ts:27://                           wizard fields and (optionally) flip to 'submitted'.
src/app/[locale]/app/projects/new/actions.ts:85:  // backwards compatibility; the wizard goes through ensureDraftProject +
src/app/[locale]/app/projects/new/actions.ts:175:// Phase 2.8.1 G_B1-B — wizard draft mode
src/app/[locale]/app/projects/new/actions.ts:178:const wizardDraftFields = z.object({
src/app/[locale]/app/projects/new/actions.ts:196:  initial: wizardDraftFields,
src/app/[locale]/app/projects/new/actions.ts:201:  fields: wizardDraftFields,
src/app/[locale]/app/projects/new/actions.ts:205:export type WizardDraftFields = z.infer<typeof wizardDraftFields>;
src/app/[locale]/app/projects/new/actions.ts:286:  //    projects_wizard_draft_uniq partial index.
src/app/[locale]/app/projects/new/actions.ts:309:  //    double-mounted wizard converge — one wins, the other catches 23505
src/app/[locale]/app/projects/new/actions.ts:356:  //    role so the wizard can retry without an orphan blocking the unique
src/app/[locale]/app/projects/new/actions.ts:412:  // this guard the wizard's submit path becomes a backdoor that demotes
src/app/[locale]/app/projects/new/actions.ts:452:// Phase 3.0 hotfix-2 — getWizardAssetPutUrlAction
src/app/[locale]/app/projects/new/actions.ts:454:// Server action that generates a presigned R2 PUT URL + the public URL for a
src/app/[locale]/app/projects/new/actions.ts:455:// wizard reference asset. Moved server-side because createBriefAssetPutUrl
src/app/[locale]/app/projects/new/actions.ts:464:  createBriefAssetPutUrl,
src/app/[locale]/app/projects/new/actions.ts:469:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
src/app/[locale]/app/projects/new/actions.ts:470:// client, which let any authenticated caller overwrite known/guessable R2
src/app/[locale]/app/projects/new/actions.ts:471:// objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
src/app/[locale]/app/projects/new/actions.ts:472:// storage key server-side using a UUID and validates content type against a
src/app/[locale]/app/projects/new/actions.ts:496:// Phase 3.0/legacy schema — accepts a client-supplied key but now restricts
src/app/[locale]/app/projects/new/actions.ts:498:// getBoardAssetPutUrlAction below.
src/app/[locale]/app/projects/new/actions.ts:499:const wizardAssetPutUrlSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:500:  storageKey: z
src/app/[locale]/app/projects/new/actions.ts:504:    // Restrict to known prefixes to prevent overwriting unrelated R2 objects.
src/app/[locale]/app/projects/new/actions.ts:505:    // Must start with a recognized board/wizard asset prefix.
src/app/[locale]/app/projects/new/actions.ts:508:        k.startsWith("board-assets/") ||
src/app/[locale]/app/projects/new/actions.ts:509:        k.startsWith("wizard-references/") ||
src/app/[locale]/app/projects/new/actions.ts:511:      { message: "storageKey prefix not allowed" }
src/app/[locale]/app/projects/new/actions.ts:516:      { message: "storageKey contains forbidden characters" }
src/app/[locale]/app/projects/new/actions.ts:521:export type WizardAssetPutUrlResult =
src/app/[locale]/app/projects/new/actions.ts:525:export async function getWizardAssetPutUrlAction(
src/app/[locale]/app/projects/new/actions.ts:526:  storageKey: unknown,
src/app/[locale]/app/projects/new/actions.ts:528:): Promise<WizardAssetPutUrlResult> {
src/app/[locale]/app/projects/new/actions.ts:529:  const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
src/app/[locale]/app/projects/new/actions.ts:545:  // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
src/app/[locale]/app/projects/new/actions.ts:546:  // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
src/app/[locale]/app/projects/new/actions.ts:547:  // project-briefs/) was insufficient because keys within those namespaces
src/app/[locale]/app/projects/new/actions.ts:548:  // could overwrite OTHER users' assets. Now require keys to start with
src/app/[locale]/app/projects/new/actions.ts:551:    `board-assets/${user.id}/`,
src/app/[locale]/app/projects/new/actions.ts:552:    `wizard-references/${user.id}/`,
src/app/[locale]/app/projects/new/actions.ts:555:  if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
src/app/[locale]/app/projects/new/actions.ts:556:    return { ok: false, error: "storage_key_not_owned" };
src/app/[locale]/app/projects/new/actions.ts:560:    const putUrl = await createBriefAssetPutUrl(
src/app/[locale]/app/projects/new/actions.ts:561:      parsed.data.storageKey,
src/app/[locale]/app/projects/new/actions.ts:568:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
src/app/[locale]/app/projects/new/actions.ts:571:    console.error("[getWizardAssetPutUrlAction] presign failed:", err);
src/app/[locale]/app/projects/new/actions.ts:572:    return { ok: false, error: "presign_failed" };
src/app/[locale]/app/projects/new/actions.ts:576:// Phase 3.1 — server-generated key + strict content-type validation.
src/app/[locale]/app/projects/new/actions.ts:578:// getWizardAssetPutUrlAction is preserved for back-compat with already-
src/app/[locale]/app/projects/new/actions.ts:580:const boardAssetPutUrlSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:584:export async function getBoardAssetPutUrlAction(
src/app/[locale]/app/projects/new/actions.ts:586:): Promise<WizardAssetPutUrlResult> {
src/app/[locale]/app/projects/new/actions.ts:587:  const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
src/app/[locale]/app/projects/new/actions.ts:600:  // Server-generated key: UUID + safe extension. NO client filename trust.
src/app/[locale]/app/projects/new/actions.ts:603:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
src/app/[locale]/app/projects/new/actions.ts:606:    const putUrl = await createBriefAssetPutUrl(
src/app/[locale]/app/projects/new/actions.ts:607:      storageKey,
src/app/[locale]/app/projects/new/actions.ts:612:    const pubUrl = briefObjectPublicUrl(storageKey);
src/app/[locale]/app/projects/new/actions.ts:615:    console.error("[getBoardAssetPutUrlAction] presign failed:", err);
src/app/[locale]/app/projects/new/actions.ts:616:    return { ok: false, error: "presign_failed" };
src/app/[locale]/app/projects/new/actions.ts:643:// Atomically submits the wizard's draft as a new project with status='in_review'
src/app/[locale]/app/projects/new/actions.ts:654://   3. RPC seed_project_board_from_wizard(project_id, board_document) —
src/app/[locale]/app/projects/new/actions.ts:657://   4. DELETE wizard_drafts row (user-scoped client)
src/app/[locale]/app/projects/new/actions.ts:671:// K-05 trust boundary: the wizard's boardDocument is client-controlled JSON.
src/app/[locale]/app/projects/new/actions.ts:679:  if (Object.keys(doc).length === 0) return true; // empty board OK
src/app/[locale]/app/projects/new/actions.ts:687:// client-side wizard state types and task_02 PdfAttachment/UrlAttachment types).
src/app/[locale]/app/projects/new/actions.ts:688:// Wave C.5d sub_03f_5 F1: extend storage_key prefix allowlist to include
src/app/[locale]/app/projects/new/actions.ts:689:// `board-assets/` so wizard PDFs uploaded via getBoardAssetPutUrlAction (which
src/app/[locale]/app/projects/new/actions.ts:690:// generates `board-assets/<user>/<uuid>.pdf` server-side) pass the SubmitInputSchema
src/app/[locale]/app/projects/new/actions.ts:692:// `board-assets/` keys, so this client-trust schema is intentionally permissive.
src/app/[locale]/app/projects/new/actions.ts:695:  storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//),
src/app/[locale]/app/projects/new/actions.ts:728:  // hotfix-2: max reduced to 500 to match client wizardSchema (L-026 — keep in sync)
src/app/[locale]/app/projects/new/actions.ts:760:  // Server validates shape/size/scheme (L-026 — synced with client wizard state)
src/app/[locale]/app/projects/new/actions.ts:774:  // draftProjectId: the wizard's autosave-created draft project. When
src/app/[locale]/app/projects/new/actions.ts:810:  //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
src/app/[locale]/app/projects/new/actions.ts:946:    "seed_project_board_from_wizard",
src/app/[locale]/app/projects/new/actions.ts:956:    console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
src/app/[locale]/app/projects/new/actions.ts:961:  // 4. Delete wizard_drafts row. wizard_drafts may not be a real table — silently
src/app/[locale]/app/projects/new/actions.ts:966:    await (supabase as any).from("wizard_drafts").delete().eq("user_id", user.id);
src/lib/r2\client.ts:3:import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
src/lib/r2\client.ts:12:  process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "yagi-challenge-submissions";
src/lib/r2\client.ts:21:    endpoint: requireEnv("CLOUDFLARE_R2_ENDPOINT"),
src/lib/r2\client.ts:23:      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
src/lib/r2\client.ts:24:      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
src/lib/r2\client.ts:28:    // PUT operations. When those land in a presigned URL, the browser-side
src/lib/r2\client.ts:29:    // PUT signature mismatches what R2 verifies. Current SDK at 3.1035 + this
src/lib/r2\client.ts:51:        for (const k of Object.keys(req.headers)) {
src/lib/r2\client.ts:62:        for (const k of Object.keys(req.query)) {
src/lib/r2\client.ts:81: * Generate a presigned PUT URL for uploading an object.
src/lib/r2\client.ts:87:export async function createPresignedPutUrl(
src/lib/r2\client.ts:88:  key: string,
src/lib/r2\client.ts:94:    Key: key,
src/lib/r2\client.ts:102: * Uses the R2 endpoint directly. If CLOUDFLARE_R2_PUBLIC_BASE is set
src/lib/r2\client.ts:105:export function objectPublicUrl(key: string): string {
src/lib/r2\client.ts:107:    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
src/lib/r2\client.ts:108:    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BUCKET}`;
src/lib/r2\client.ts:109:  return `${base}/${key}`;
src/lib/r2\client.ts:117:export { getClient as getR2Client };
src/lib/r2\client.ts:122:// Per SPEC §3.3 brief assets live in an existing R2 bucket under a new
src/lib/r2\client.ts:128:// Note: presigned URLs are generated server-side; the client uploads the
src/lib/r2\client.ts:129:// blob directly to R2 via the returned URL. Direct browser → R2 PUT keeps
src/lib/r2\client.ts:133:  process.env.CLOUDFLARE_R2_BRIEF_BUCKET ?? "yagi-commission-files";
src/lib/r2\client.ts:139: * `CLOUDFLARE_R2_PUBLIC_BASE` is set (the Phase 3.1 prereq), it overrides
src/lib/r2\client.ts:141: * unset, this helper at least targets the correct bucket via the R2 endpoint.
src/lib/r2\client.ts:143:export function briefObjectPublicUrl(key: string): string {
src/lib/r2\client.ts:145:    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
src/lib/r2\client.ts:146:    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BRIEF_BUCKET}`;
src/lib/r2\client.ts:147:  return `${base}/${key}`;
src/lib/r2\client.ts:151: * Generate a presigned PUT URL for a brief asset upload.
src/lib/r2\client.ts:154:export async function createBriefAssetPutUrl(
src/lib/r2\client.ts:155:  storageKey: string,
src/lib/r2\client.ts:161:    Key: storageKey,
src/lib/r2\client.ts:168: * Generate a presigned GET URL for a brief asset download / inline render.
src/lib/r2\client.ts:173:  storageKey: string,
src/lib/r2\client.ts:178:    Key: storageKey,

 succeeded in 804ms:
# Wave C.5d sub_02 ??Supabase Dashboard Paste-Ready Guide

> Purpose: yagi pastes the 4 email templates below into Supabase Studio
> after Wave C.5d sub_01 ships, so production stops emitting
> `{{ .ConfirmationURL }}` direct links (HIGH-B from Codex K-05 final
> review LOOP 1).
>
> Production Supabase **does not** read `supabase/templates/email/*.html`
> from the repo ??those files are dev-local only. The hosted dashboard is
> the source of truth, and the only way to update it is by hand here.

## Workflow

1. Open Supabase Studio ??**Authentication ??Email Templates**.
2. For each section below, paste the body HTML, set the subject, click
   **Save changes**. Order: Magic Link ??Reset Password ??(optional)
   Change Email Address. Confirm signup is verify-only (already pasted).
3. After all paste operations, open **Authentication ??URL Configuration**
   and confirm the redirect URL allowlist (last section of this guide).
4. Smoke test (last section).

## Repo / dashboard divergence ??intentional

- **Repo templates** use `next={{ .RedirectTo }}` so the signUp /
  signInWithOtp / resetPasswordForEmail server actions can drive the
  destination via `emailRedirectTo`.
- **Dashboard templates** use static `next=...` paths below. The route
  handler at `src/app/auth/confirm/route.ts` sanitizes the `next` value
  the same way regardless of source: allowlist-checks for non-recovery,
  hardcodes `/reset-password` for recovery. Static paths in production
  are simply more predictable for ops monitoring.
- Either approach is safe. Don't mix within a single template.

---

## 1) Confirm signup (VERIFY ONLY ??already pasted)

**Action**: Open Authentication ??Email Templates ??"Confirm signup"
and confirm the body's CTA `<a>` is in PKCE form. If it still uses
`{{ .ConfirmationURL }}`, replace with the body from
`supabase/templates/email/confirm.html` and the URL pattern below.

Required URL pattern in CTA + fallback span:

```
{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/onboarding/workspace
```

Subject (existing): `YAGI Studio 쨌 ?대찓???몄쬆???꾨즺??二쇱꽭??

---

## 2) Magic Link (PASTE)

**Subject**: `YAGI Studio 쨌 濡쒓렇??留곹겕`

**Body**: paste the entire HTML below.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio 쨌 濡쒓렇??留곹겕</title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding-bottom: 64px;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #71D083; margin-bottom: 8px;">
                YAGI WORKSHOP
              </div>
              <div style="font-size: 12px; letter-spacing: 0.05em; color: #7B7B7B;">
                AI NATIVE ENTERTAINMENT STUDIO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: #EEEEEE;">
                濡쒓렇??留곹겕媛 ?꾩갑?덉뼱??              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                ?꾨옒 踰꾪듉???뚮윭 YAGI Studio ??濡쒓렇?명빐 二쇱꽭??<br>
                蹂댁븞???꾪빐 留곹겕???쇱젙 ?쒓컙 ??留뚮즺?⑸땲??
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/app/dashboard" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                濡쒓렇?명븯湲?              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                踰꾪듉???숈옉?섏? ?딆쑝硫??꾨옒 留곹겕瑜?蹂듭궗??二쇱꽭??<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next=/app/dashboard</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                蹂몄씤???붿껌?섏? ?딆? 寃쎌슦 ???대찓?쇱쓣 臾댁떆??二쇱꽭??<br>
                怨꾩젙? ?덉쟾?섍쾶 蹂댄샇?⑸땲??
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Server destination**: `next=/app/dashboard` matches the route's
non-recovery allowlist (`/app` prefix), so users land on the locale-
prefixed dashboard `/${locale}/app/dashboard`.

---

## 3) Reset Password (PASTE)

**Subject**: `YAGI Studio 쨌 鍮꾨?踰덊샇 ?ъ꽕??留곹겕`

**Body**: paste the entire HTML below.

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio 쨌 鍮꾨?踰덊샇 ?ъ꽕??/title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding-bottom: 64px;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #71D083; margin-bottom: 8px;">
                YAGI WORKSHOP
              </div>
              <div style="font-size: 12px; letter-spacing: 0.05em; color: #7B7B7B;">
                AI NATIVE ENTERTAINMENT STUDIO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: #EEEEEE;">
                鍮꾨?踰덊샇 ?ъ꽕??留곹겕
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                YAGI Studio 鍮꾨?踰덊샇 ?ъ꽕???붿껌??諛쏆븯?듬땲??<br>
                ?꾨옒 踰꾪듉???뚮윭 ??鍮꾨?踰덊샇瑜??ㅼ젙??二쇱꽭??
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                鍮꾨?踰덊샇 ?ъ꽕?뺥븯湲?              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                踰꾪듉???숈옉?섏? ?딆쑝硫??꾨옒 留곹겕瑜?蹂듭궗??二쇱꽭??<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                ?ъ꽕?뺤쓣 ?붿껌?섏? ?딆쑝?⑤떎硫????대찓?쇱쓣 臾댁떆??二쇱꽭??<br>
                怨꾩젙? 蹂寃쎈릺吏 ?딆뒿?덈떎.
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Note on `next=/reset-password`**: the spec draft mentioned
`/auth/reset-password`, but the actual route in the codebase is
`src/app/[locale]/(auth)/reset-password/page.tsx` ??`/reset-password`.
The route handler hardcodes recovery to `/reset-password` regardless of
what `next` says, so even if you paste the wrong path it still works ??the static path here just keeps the email link readable.

---

## 4) Change Email Address (DEFER ??not yet supported)

**Status**: do **not** paste this template yet.

**Reason**: there is no `/account/settings` route in the codebase
today. The route handler's allowlist does not include `/account`, so
even with `next=/account/settings` Supabase emits, our intermediate
page will redirect post-confirmation to the default
`/onboarding/workspace` ??which is the wrong destination for an
already-onboarded user changing their email.

Recommended path: ship the `/account/settings` (or equivalent) route
first, add `/account` to `NEXT_ALLOWLIST_PREFIXES` in
`src/app/auth/confirm/route.ts`, then add a `change_email.html` to
`supabase/templates/email/` and a corresponding paste section to this
guide. Until then, leave Supabase's default Change Email Address
template in place (Supabase still serves a working
`{{ .ConfirmationURL }}` link, which is functional but not on-brand).

If yagi wants the on-brand template paste *anyway* (with the redirect
falling back to `/onboarding/workspace`), use the body below ??but
expect users to be confused by the destination:

```
Subject: YAGI Studio 쨌 ?대찓??二쇱냼 蹂寃??뺤씤
Body: copy structure from confirm.html, replace H1 with "?대찓??二쇱냼
蹂寃??뺤씤", subtitle with "???대찓??二쇱냼瑜??몄쬆??二쇱꽭?? ?꾨옒
踰꾪듉???꾨Ⅴ硫?蹂寃쎌씠 ?꾨즺?⑸땲??", CTA copy with "?대찓??蹂寃쏀븯湲?,
href with {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email_change&amp;next=/onboarding/workspace
```

---

## Redirect URL allowlist (Authentication ??URL Configuration)

The Supabase URL allowlist controls which absolute URLs Supabase will
accept as `emailRedirectTo` and where it will redirect after auth flows.
Confirm the following entries exist (production + local dev):

**Production**:
- `https://studio.yagiworkshop.xyz/auth/confirm`
- `https://studio.yagiworkshop.xyz/onboarding/**`
- `https://studio.yagiworkshop.xyz/app/**`
- `https://studio.yagiworkshop.xyz/reset-password`

**Local dev (3001 and 3003)**:
- `http://localhost:3001/auth/confirm`
- `http://localhost:3001/onboarding/**`
- `http://localhost:3001/app/**`
- `http://localhost:3001/reset-password`
- (same set with port 3003)

If any are missing, click **Add URL**, paste, save. Without these,
`signUp({ options: { emailRedirectTo } })` will silently 422 and the
email won't be sent.

---

## Smoke test (after all paste operations)

1. **Signup**: open `https://studio.yagiworkshop.xyz/ko/signup`, enter
   a fresh email, submit. Email arrives. CTA URL must start with
   `studio.yagiworkshop.xyz/auth/confirm?token_hash=` (NOT
   `studio.yagiworkshop.xyz/auth/v1/verify?token=`).
   Click ??intermediate page renders ??click "怨꾩냽?섍린 / Continue" ??   land on `/ko/onboarding/workspace`.
2. **Magic Link**: from the signin form, click "Send magic link".
   Same shape: `/auth/confirm?...&type=magiclink`. Click ??intermediate
   ??continue ??`/ko/app/dashboard`.
3. **Reset Password**: from the forgot-password form, request reset.
   Email URL: `/auth/confirm?...&type=recovery`. Click ??intermediate
   ??continue ??`/ko/reset-password`.
4. **Crawler probe**: open the email in Gmail web (which previews
   links). Click ??token must still be valid (not consumed by
   preview). If "link expired" appears immediately on first click,
   the dashboard paste did not take.

After all four pass, report SHIPPED in chat. Wave D retry can resume.

---

## What changed at the repo layer (sub_01)

For your reference when comparing dashboard vs repo:

- `supabase/templates/email/confirm.html` line 42 + 51 ??PKCE form,
  `next={{ .RedirectTo }}`
- `supabase/templates/email/magic_link.html` same
- `supabase/templates/email/recovery.html` same
- `supabase/templates/email/README.md` rewritten with PKCE rationale
  and type mapping

Repo uses `{{ .RedirectTo }}` because the `signUp` action passes
`emailRedirectTo: '/onboarding/workspace'` (or equivalent) and the
template should reflect the server's authoritative intent. Dashboard
uses static paths because production stability + ops simplicity
outweighs flexibility there. Both forms route through `/auth/confirm`
and are sanitized server-side, so the security property is identical.
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio 쨌 ?대찓???몄쬆???꾨즺??二쇱꽭??/title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding-bottom: 64px;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #71D083; margin-bottom: 8px;">
                YAGI WORKSHOP
              </div>
              <div style="font-size: 12px; letter-spacing: 0.05em; color: #7B7B7B;">
                AI NATIVE ENTERTAINMENT STUDIO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: #EEEEEE;">
                ?대찓???몄쬆???꾨즺??二쇱꽭??              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                YAGI Studio 媛?낆쓣 ?쒖옉??二쇱뀛??媛먯궗?⑸땲??<br>
                ?꾨옒 踰꾪듉???뚮윭 ?대찓?쇱쓣 ?몄쬆??二쇱꽭??
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup&amp;next={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                ?대찓???몄쬆?섍린
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                踰꾪듉???숈옉?섏? ?딆쑝硫??꾨옒 留곹겕瑜?蹂듭궗??二쇱꽭??<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=signup&amp;next={{ .RedirectTo }}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                ???대찓?쇱? YAGI Studio 媛???붿껌???곕씪 諛쒖넚?섏뿀?듬땲??<br>
                蹂몄씤???붿껌?섏? ?딆? 寃쎌슦 臾댁떆?섏뀛???⑸땲??
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio 쨌 濡쒓렇??留곹겕</title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding-bottom: 64px;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #71D083; margin-bottom: 8px;">
                YAGI WORKSHOP
              </div>
              <div style="font-size: 12px; letter-spacing: 0.05em; color: #7B7B7B;">
                AI NATIVE ENTERTAINMENT STUDIO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: #EEEEEE;">
                濡쒓렇??留곹겕媛 ?꾩갑?덉뼱??              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                ?꾨옒 踰꾪듉???뚮윭 YAGI Studio ??濡쒓렇?명빐 二쇱꽭??<br>
                蹂댁븞???꾪빐 留곹겕???쇱젙 ?쒓컙 ??留뚮즺?⑸땲??
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                濡쒓렇?명븯湲?              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                踰꾪듉???숈옉?섏? ?딆쑝硫??꾨옒 留곹겕瑜?蹂듭궗??二쇱꽭??<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=magiclink&amp;next={{ .RedirectTo }}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                蹂몄씤???붿껌?섏? ?딆? 寃쎌슦 ???대찓?쇱쓣 臾댁떆??二쇱꽭??<br>
                怨꾩젙? ?덉쟾?섍쾶 蹂댄샇?⑸땲??
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>YAGI Studio 쨌 鍮꾨?踰덊샇 ?ъ꽕??/title>
</head>
<body style="margin: 0; padding: 0; background: #000000; color: #EEEEEE; font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: #000000; padding: 80px 24px;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width: 480px;">
          <tr>
            <td style="padding-bottom: 64px;">
              <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.18em; color: #71D083; margin-bottom: 8px;">
                YAGI WORKSHOP
              </div>
              <div style="font-size: 12px; letter-spacing: 0.05em; color: #7B7B7B;">
                AI NATIVE ENTERTAINMENT STUDIO
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 16px;">
              <h1 style="margin: 0; font-size: 30px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; color: #EEEEEE;">
                鍮꾨?踰덊샇 ?ъ꽕??留곹겕
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 16px; line-height: 1.5; color: #B4B4B4;">
                YAGI Studio 鍮꾨?踰덊샇 ?ъ꽕???붿껌??諛쏆븯?듬땲??<br>
                ?꾨옒 踰꾪듉???뚮윭 ??鍮꾨?踰덊샇瑜??ㅼ젙??二쇱꽭??
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next={{ .RedirectTo }}" style="display: inline-block; padding: 14px 32px; background: #71D083; color: #000000; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 12px;">
                鍮꾨?踰덊샇 ?ъ꽕?뺥븯湲?              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom: 40px;">
              <p style="margin: 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                踰꾪듉???숈옉?섏? ?딆쑝硫??꾨옒 留곹겕瑜?蹂듭궗??二쇱꽭??<br>
                <span style="color: #B4B4B4; word-break: break-all;">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next={{ .RedirectTo }}</span>
              </p>
            </td>
          </tr>
          <tr>
            <td style="border-top: 1px solid rgba(255,255,255,0.11); padding-top: 24px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #7B7B7B; line-height: 1.5;">
                ?ъ꽕?뺤쓣 ?붿껌?섏? ?딆쑝?⑤떎硫????대찓?쇱쓣 臾댁떆??二쇱꽭??<br>
                怨꾩젙? 蹂寃쎈릺吏 ?딆뒿?덈떎.
              </p>
              <p style="margin: 0; font-size: 11px; color: #7B7B7B;">
                &copy; YAGI Workshop &middot; studio.yagiworkshop.xyz
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>

2026-05-03T18:04:27.730597Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 1 seconds
Output:
auth : The term 'auth' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the
 spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:2 char:958
+ ... pp/projects/new/new-project-wizard.tsx src/app/[locale]/(auth)/signin ...
+                                                              ~~~~
    + CategoryInfo          : ObjectNotFound: (auth:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 

 exited 1 in 1045ms:
auth : The term 'auth' is not recognized as the name of a cmdlet, function, script file, or operable program. Check the
 spelling of the name, or if a path was included, verify that the path is correct and try again.
At line:2 char:958
+ ... pp/projects/new/new-project-wizard.tsx src/app/[locale]/(auth)/signin ...
+                                                              ~~~~
    + CategoryInfo          : ObjectNotFound: (auth:String) [], CommandNotFoundException
    + FullyQualifiedErrorId : CommandNotFoundException
 

codex
The first pass hit the expected SQL functions and grant changes. One shell glob stumbled on the `(auth)` directory syntax in PowerShell, so I’ll rerun that with literal file paths and then drill into the final effective definitions rather than earlier superseded versions.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"\\.from\\(|\\.rpc\\(|\\.insert\\(|\\.update\\(|\\.upsert\\(|\\.delete\\(|z\\.object|safeParse|parse\\(|FormData|unknown|workspaceId|projectId|boardId|brand_id|storage_key|storageKey|verifyOtp|token_hash|same-origin|next|locale\" -- \"src/app/auth/confirm/route.ts\" \"src/app/auth/callback/route.ts\" \"src/app/[locale]/auth/expired/page.tsx\" \"src/app/[locale]/auth/layout.tsx\" \"src/app/[locale]/auth/verify/page.tsx\" \"src/app/[locale]/app/projects/new/actions.ts\" \"src/app/[locale]/app/projects/[id]/board-actions.ts\" \"src/app/[locale]/app/projects/[id]/ref-actions.ts\" \"src/app/[locale]/app/settings/actions.ts\" \"src/app/[locale]/onboarding/profile/actions.ts\" \"src/lib/workspace/active.ts\" \"src/lib/app/context.ts\" \"src/app/[locale]/app/layout.tsx\" \"src/app/[locale]/app/projects/page.tsx\" \"src/app/[locale]/app/dashboard/page.tsx\" \"src/app/[locale]/app/projects/new/page.tsx\" \"src/app/[locale]/app/projects/new/new-project-wizard.tsx\" \"src/app/[locale]/(auth)/signin/page.tsx\" \"src/app/[locale]/(auth)/signup/page.tsx\" \"src/app/[locale]/(auth)/forgot-password/page.tsx\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content -LiteralPath "src/app/auth/confirm/route.ts"; Get-Content -LiteralPath "src/app/auth/callback/route.ts"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content -LiteralPath "supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql"; Get-Content -LiteralPath "supabase/migrations/20260501095935_phase_4_x_auto_profile_on_signup.sql"; Get-Content -LiteralPath "supabase/migrations/20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql"' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-Content -LiteralPath "supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql"; Get-Content -LiteralPath "supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql"; Get-Content -LiteralPath "supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql"' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T18:04:35.624421Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Total output lines: 469
Output:
src/app/[locale]/app/projects/new/actions.ts:4:import { revalidatePath } from "next/cache";
src/app/[locale]/app/projects/new/actions.ts:33:  brand_id: z.string().uuid().nullable().optional(),
src/app/[locale]/app/projects/new/actions.ts:55:const createProjectSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:70:export async function createProject(input: unknown): Promise<ActionResult> {
src/app/[locale]/app/projects/new/actions.ts:71:  const parsed = createProjectSchema.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:106:    brand_id: data.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:114:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:115:    .insert(insertPayload)
src/app/[locale]/app/projects/new/actions.ts:136:    .from("project_briefs")
src/app/[locale]/app/projects/new/actions.ts:137:    .insert({
src/app/[locale]/app/projects/new/actions.ts:158:      .from("projects")
src/app/[locale]/app/projects/new/actions.ts:159:      .delete()
src/app/[locale]/app/projects/new/actions.ts:170:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:178:const wizardDraftFields = z.object({
src/app/[locale]/app/projects/new/actions.ts:181:  brand_id: z.string().uuid().nullable().optional(),
src/app/[locale]/app/projects/new/actions.ts:195:const ensureDraftInput = z.object({
src/app/[locale]/app/projects/new/actions.ts:199:const submitDraftInput = z.object({
src/app/[locale]/app/projects/new/actions.ts:200:  projectId: z.string().uuid(),
src/app/[locale]/app/projects/new/actions.ts:208:  projectId: string;
src/app/[locale]/app/projects/new/actions.ts:236:  projectId: string,
src/app/[locale]/app/projects/new/actions.ts:239:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:241:    .eq("id", projectId)
src/app/[locale]/app/projects/new/actions.ts:246:    .from("project_briefs")
src/app/[locale]/app/projects/new/actions.ts:248:    .eq("project_id", projectId)
src/app/[locale]/app/projects/new/actions.ts:253:    projectId: project.id,
src/app/[locale]/app/projects/new/actions.ts:264:  input: unknown,
src/app/[locale]/app/projects/new/actions.ts:266:  const parsed = ensureDraftInput.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:288:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:305:    await service.from("projects").delete().eq("id", existing.id);
src/app/[locale]/app/projects/new/actions.ts:320:    brand_id: fields.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:327:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:328:    .insert(insertPayload)
src/app/[locale]/app/projects/new/actions.ts:337:        .from("projects")
src/app/[locale]/app/projects/new/actions.ts:359:    .from("project_briefs")
src/app/[locale]/app/projects/new/actions.ts:360:    .insert({
src/app/[locale]/app/projects/new/actions.ts:370:    await service.from("projects").delete().eq("id", project.id);
src/app/[locale]/app/projects/new/actions.ts:382:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:387:  input: unknown,
src/app/[locale]/app/projects/new/actions.ts:389:  const parsed = submitDraftInput.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:393:  const { projectId, fields, intent } = parsed.data;
src/app/[locale]/app/projects/new/actions.ts:404:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:406:    .eq("id", projectId)
src/app/[locale]/app/projects/new/actions.ts:421:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:422:    .update({
src/app/[locale]/app/projects/new/actions.ts:425:      brand_id: fields.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:431:    .eq("id", projectId)
src/app/[locale]/app/projects/new/actions.ts:442:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:443:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/new/actions.ts:469:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
src/app/[locale]/app/projects/new/actions.ts:499:const wizardAssetPutUrlSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:500:  storageKey: z
src/app/[locale]/app/projects/new/actions.ts:511:      { message: "storageKey prefix not allowed" }
src/app/[locale]/app/projects/new/actions.ts:516:      { message: "storageKey contains forbidden characters" }
src/app/[locale]/app/projects/new/actions.ts:526:  storageKey: unknown,
src/app/[locale]/app/projects/new/actions.ts:527:  contentType: unknown
src/app/[locale]/app/projects/new/actions.ts:529:  const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
src/app/[locale]/app/projects/new/actions.ts:545:  // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
src/app/[locale]/app/projects/new/actions.ts:555:  if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
src/app/[locale]/app/projects/new/actions.ts:556:    return { ok: false, error: "storage_key_not_owned" };
src/app/[locale]/app/projects/new/actions.ts:561:      parsed.data.storageKey,
src/app/[locale]/app/projects/new/actions.ts:568:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
src/app/[locale]/app/projects/new/actions.ts:580:const boardAssetPutUrlSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:585:  contentType: unknown
src/app/[locale]/app/projects/new/actions.ts:587:  const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
src/app/[locale]/app/projects/new/actions.ts:603:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
src/app/[locale]/app/projects/new/actions.ts:607:      storageKey,
src/app/[locale]/app/projects/new/actions.ts:612:    const pubUrl = briefObjectPublicUrl(storageKey);
src/app/[locale]/app/projects/new/actions.ts:633:  url: unknown,
src/app/[locale]/app/projects/new/actions.ts:635:  const parsed = videoUrlSchema.safeParse(url);
src/app/[locale]/app/projects/new/actions.ts:662:// Returns { ok: true, projectId, redirect } on success.
src/app/[locale]/app/projects/new/actions.ts:677:function validateTldrawStore(doc: Record<string, unknown>): boolean {
src/app/[locale]/app/projects/new/actions.ts:681:  const store = (doc as { store: unknown }).store;
src/app/[locale]/app/projects/new/actions.ts:688:// Wave C.5d sub_03f_5 F1: extend storage_key prefix allowlist to include
src/app/[locale]/app/projects/new/actions.ts:693:const PdfAttachmentSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:695:  storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//),
src/app/[locale]/app/projects/new/actions.ts:702:const UrlAttachmentSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:726:const SubmitInputSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:743:    .record(z.string(), z.unknown())
src/app/[locale]/app/projects/new/actions.ts:770:  // workspaceId is optional when draftProjectId is provided — the action
src/app/[locale]/app/projects/new/actions.ts:773:  workspaceId: z.string().uuid().optional(),
src/app/[locale]/app/projects/new/actions.ts:783:  | { ok: true; projectId: string; redirect: string }
src/app/[locale]/app/projects/new/actions.ts:787:  input: unknown
src/app/[locale]/app/projects/new/actions.ts:790:  const parsed = SubmitInputSchema.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:804:  // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
src/app/[locale]/app/projects/new/actions.ts:810:  //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
src/app/[locale]/app/projects/new/actions.ts:817:    .from("workspace_members")
src/app/[locale]/app/projects/new/actions.ts:824:  if (data.workspaceId && memberSet.has(data.workspaceId)) {
src/app/[locale]/app/projects/new/actions.ts:825:    resolvedWorkspaceId = data.workspaceId;
src/app/[locale]/app/projects/new/actions.ts:830:      .from("projects")
src/app/[locale]/app/projects/new/actions.ts:851:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
src/app/[locale]/app/projects/new/actions.ts:859:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:860:    .insert({
src/app/[locale]/app/projects/new/actions.ts:902:  // eslint-disable-next-line @typescript-eslint/no-explicit-any
src/app/[locale]/app/projects/new/actions.ts:905:    .from("project_status_history")
src/app/[locale]/app/projects/new/actions.ts:906:    .insert({
src/app/[locale]/app/projects/new/actions.ts:938:    seedDocument as Record<string, unknown>,
src/app/[locale]/app/projects/new/actions.ts:939:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
src/app/[locale]/app/projects/new/actions.ts:941:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
src/app/[locale]/app/projects/new/actions.ts:944:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/new/actions.ts:945:  const { error: seedErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/new/actions.ts:965:    // eslint-disable-next-line @typescript-eslint/no-explicit-any
src/app/[locale]/app/projects/new/actions.ts:966:    await (supabase as any).from("wizard_drafts").delete().eq("user_id", user.id);
src/app/[locale]/app/projects/new/actions.ts:973:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:974:    .delete()
src/app/[locale]/app/projects/new/actions.ts:987:  // Resolve caller's locale and email for the client confirmation
src/app/[locale]/app/projects/new/actions.ts:998:      service.from("profiles").select("display_name, locale").eq("id", user.id).maybeSingle(),
src/app/[locale]/app/projects/new/actions.ts:999:      service.from("workspaces").select("name").eq("id", resolvedWorkspaceId).maybeSingle(),
src/app/[locale]/app/projects/new/actions.ts:1003:    if (profile?.locale === "en") clientLocale = "en";
src/app/[locale]/app/projects/new/actions.ts:1016:      projectId: project.id,
src/app/[locale]/app/projects/new/actions.ts:1017:      locale: clientLocale,
src/app/[locale]/app/projects/new/actions.ts:1034:        projectId: project.id,
src/app/[locale]/app/projects/new/actions.ts:1035:        locale: clientLocale,
src/app/[locale]/app/projects/new/actions.ts:1057:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:1058:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src/app/[locale]/app/projects/new/actions.ts:1062:    projectId: project.id,
src/app/[locale]/app/projects/[id]/board-actions.ts:8: *   - updateProjectBoardAction(projectId, document)
src/app/[locale]/app/projects/[id]/board-actions.ts:14: *   - toggleLockAction(boardId, locked)
src/app/[locale]/app/projects/[id]/board-actions.ts:17: *   - restoreVersionAction(boardId, version)
src/app/[locale]/app/projects/[id]/board-actions.ts:25:import { revalidatePath } from "next/cache";
src/app/[locale]/app/projects/[id]/board-actions.ts:41:function validateTldrawStore(doc: Record<string, unknown>): boolean {
src/app/[locale]/app/projects/[id]/board-actions.ts:45:  const store = (doc as { store: unknown }).store;
src/app/[locale]/app/projects/[id]/board-actions.ts:54:const UpdateBoardSchema = z.object({
src/app/[locale]/app/projects/[id]/board-actions.ts:55:  projectId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/board-actions.ts:57:    .record(z.string(), z.unknown())
src/app/[locale]/app/projects/[id]/board-actions.ts:64:  | { ok: true; boardId: string }
src/app/[locale]/app/projects/[id]/board-actions.ts:78:  input: unknown
src/app/[locale]/app/projects/[id]/board-actions.ts:80:  const parsed = UpdateBoardSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/board-actions.ts:100:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:109:    .from("projects")
src/app/[locale]/app/projects/[id]/board-actions.ts:111:    .eq("id", parsed.data.projectId)
src/app/[locale]/app/projects/[id]/board-actions.ts:118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app/projects/[id]/board-actions.ts:125:        .from("workspace_members")
src/app/[locale]/app/projects/[id]/board-actions.ts:140:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:142:    .eq("project_id", parsed.data.projectId)
src/app/[locale]/app/projects/[id]/board-actions.ts:151:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:157:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:159:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:176:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:179:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:180:    .update({
src/app/[locale]/app/projects/[id]/board-actions.ts:200:    .from("project_board_versions")
src/app/[locale]/app/projects/[id]/board-actions.ts:213:    const nextVersion = ((lastVersion?.version as number | undefined) ?? 0) + 1;
src/app/[locale]/app/projects/[id]/board-actions.ts:217:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:218:    await (svc as any).from("project_board_versions").insert({
src/app/[locale]/app/projects/[id]/board-actions.ts:220:      version: nextVersion,
src/app/[locale]/app/projects/[id]/board-actions.ts:227:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src/app/[locale]/app/projects/[id]/board-actions.ts:228:  return { ok: true, boardId: board.id };
src/app/[locale]/app/projects/[id]/board-actions.ts:235:const ToggleLockSchema = z.object({
src/app/[locale]/app/projects/[id]/board-actions.ts:236:  boardId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/board-actions.ts:249:  input: unknown
src/app/[locale]/app/projects/[id]/board-actions.ts:251:  const parsed = ToggleLockSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/board-actions.ts:261:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:262:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
src/app/[locale]/app/projects/[id]/board-actions.ts:263:    p_board_id: parsed.data.boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:287:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:290:  if (!boardId || typeof boardId !== "string") {
src/app/[locale]/app/projects/[id]/board-actions.ts:305:    .from("user_roles")
src/app/[locale]/app/projects/[id]/board-actions.ts:313:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:314:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
src/app/[locale]/app/projects/[id]/board-actions.ts:315:    p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:324:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:326:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:328:    .eq("id", boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:333:      `/[locale]/app/projects/${boardLookup.project_id}`,
src/app/[locale]/app/projects/[id]/board-actions.ts:345:const RestoreVersionSchema = z.object({
src/app/[locale]/app/projects/[id]/board-actions.ts:346:  boardId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/board-actions.ts:366:  input: unknown
src/app/[locale]/app/projects/[id]/board-actions.ts:368:  const parsed = RestoreVersionSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/board-actions.ts:379:    .from("user_roles")
src/app/[locale]/app/projects/[id]/board-actions.ts:387:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:390:    .from("project_board_versions")
src/app/[locale]/app/projects/[id]/board-actions.ts:392:    .eq("board_id", parsed.data.boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:397:  const restoredDoc = snap.document as Record<string, unknown>;
src/app/[locale]/app/projects/[id]/board-actions.ts:405:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:407:    .eq("id", parsed.data.boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:411:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:413:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:419:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:421:    .eq("id", parsed.data.boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:429:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:432:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:433:    .update({
src/app/[locale]/app/projects/[id]/board-actions.ts:438:    .eq("id", parsed.data.boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:448:      `/[locale]/app/projects/${boardLookup.project_id}`,
src/app/[locale]/app/projects/[id]/board-actions.ts:470:  // eslint-disable-next-line @typescript-eslint/no-explicit-any
src/app/[locale]/app/projects/[id]/board-actions.ts:472:  boardId: string
src/app/[locale]/app/projects/[id]/board-actions.ts:475:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:477:    .eq("id", boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:482:    board.document as Record<string, unknown>,
src/app/[locale]/app/projects/[id]/board-actions.ts:483:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:485:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:490:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:493:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:494:    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
src/app/[locale]/app/projects/[id]/board-actions.ts:495:    .eq("id", boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:498:    revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
src/app/[locale]/app/projects/[id]/board-actions.ts:522:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:525:  if (!boardId || typeof boardId !== "string") {
src/app/[locale]/app/projects/[id]/board-actions.ts:549:  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
src/app/[locale]/app/projects/[id]/boar…1609 tokens truncated…;
src/app/[locale]/app/layout.tsx:50:    .from("notification_events")
src/app/[locale]/app/layout.tsx:55:  const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";
src/app/[locale]/app/layout.tsx:89:              locale={bellLocale}
src/app/[locale]/app/layout.tsx:100:            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
src/app/[locale]/app/layout.tsx:105:          workspaceId={activeWorkspace?.id ?? null}
src/app/[locale]/auth/verify/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/auth/verify/page.tsx:5:import { useSearchParams } from "next/navigation";
src/app/[locale]/(auth)/signup/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/(auth)/signup/page.tsx:9:import { useSearchParams } from "next/navigation";
src/app/[locale]/(auth)/signup/page.tsx:16:// Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
src/app/[locale]/(auth)/signup/page.tsx:58:  const next = sanitizeNext(searchParams.get("next"));
src/app/[locale]/(auth)/signup/page.tsx:70:  // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
src/app/[locale]/(auth)/signup/page.tsx:71:  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
src/app/[locale]/(auth)/signup/page.tsx:72:  // succeeds, embedded as `?next=` inside that template URL via the
src/app/[locale]/(auth)/signup/page.tsx:77:    return next ? `${siteUrl}${next}` : base;
src/app/[locale]/(auth)/signup/page.tsx:96:      // Honor `next` here too so the in-product redirect mirrors the
src/app/[locale]/(auth)/signup/page.tsx:99:      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
src/app/[locale]/(auth)/forgot-password/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/(auth)/forgot-password/page.tsx:15:const schema = z.object({
src/app/[locale]/(auth)/forgot-password/page.tsx:36:    // destination after verifyOtp succeeds at /auth/confirm. The
src/lib/workspace/active.ts:21:import { cookies } from "next/headers";
src/lib/workspace/active.ts:37:function narrowKind(value: unknown): WorkspaceKind {
src/lib/workspace/active.ts:58:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
src/lib/workspace/active.ts:61:    .from("workspace_members")
src/lib/workspace/active.ts:115:    // (cookies() in next/headers is read in server components). The
src/lib/app/context.ts:41:    locale: "ko" | "en";
src/lib/app/context.ts:57:    .from("profiles")
src/lib/app/context.ts:58:    .select("id, handle, display_name, avatar_url, locale, role")
src/lib/app/context.ts:65:    .from("user_roles")
src/lib/app/context.ts:74:    .from("workspace_members")
src/lib/app/context.ts:100:      locale: profile.locale as "ko" | "en",
src/app/[locale]/app/projects/new/new-project-wizard.tsx:34:import { useTranslations } from "next-intl";
src/app/[locale]/app/projects/new/new-project-wizard.tsx:95:const wizardSchema = z.object({
src/app/[locale]/app/projects/new/new-project-wizard.tsx:124:type WizardFormData = z.infer<typeof wizardSchema>;
src/app/[locale]/app/projects/new/new-project-wizard.tsx:249:  onChange: (next: string[]) => void;
src/app/[locale]/app/projects/new/new-project-wizard.tsx:296:  const [boardDocument, setBoardDocument] = useState<Record<string, unknown>>({});
src/app/[locale]/app/projects/new/new-project-wizard.tsx:312:  } = useForm<WizardFormData>({
src/app/[locale]/app/projects/new/new-project-wizard.tsx:334:      brand_id: null,
src/app/[locale]/app/projects/new/new-project-wizard.tsx:352:            setDraftProjectId(res.data.projectId);
src/app/[locale]/app/projects/new/new-project-wizard.tsx:398:    // Defer scroll to next frame so the target step renders before scrolling.
src/app/[locale]/app/projects/new/new-project-wizard.tsx:433:    // storage_key for wizard PDFs uses the board-assets prefix that
src/app/[locale]/app/projects/new/new-project-wizard.tsx:442:    let storageKey = result.publicUrl;
src/app/[locale]/app/projects/new/new-project-wizard.tsx:445:      storageKey = urlObj.pathname.replace(/^\//, "");
src/app/[locale]/app/projects/new/new-project-wizard.tsx:451:      storage_key: storageKey,
src/app/[locale]/app/projects/new/new-project-wizard.tsx:607:        boardId={null}
src/app/[locale]/app/projects/new/new-project-wizard.tsx:868:                workspaceId: activeWorkspaceId ?? undefined,
src/app/auth/confirm/route.ts:2:import { NextRequest, NextResponse } from "next/server";
src/app/auth/confirm/route.ts:12://   `verifyOtp({ token_hash, type })` would single-use-consume the
src/app/auth/confirm/route.ts:14:// - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
src/app/auth/confirm/route.ts:19://   `verifyOtp`. Crawler GETs see HTML, no token consumption.
src/app/auth/confirm/route.ts:22://   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
src/app/auth/confirm/route.ts:25:// ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------
src/app/auth/confirm/route.ts:40:  // Accept either a relative path or a same-origin absolute URL — Supabase
src/app/auth/confirm/route.ts:56:  // Strip leading locale so the post-confirm redirect re-prefixes with the
src/app/auth/confirm/route.ts:57:  // verified user's profile.locale.
src/app/auth/confirm/route.ts:106:  const tokenHash = searchParams.get("token_hash");
src/app/auth/confirm/route.ts:108:  const rawNext = searchParams.get("next");
src/app/auth/confirm/route.ts:111:    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
src/app/auth/confirm/route.ts:115:  const next = sanitizeNext(rawNext, origin, type);
src/app/auth/confirm/route.ts:117:  // Codex F2 LOOP 2 N2 fix — no external stylesheet. The token_hash sits
src/app/auth/confirm/route.ts:145:    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
src/app/auth/confirm/route.ts:147:    <input type="hidden" name="next" value="${escapeHtml(next)}" />
src/app/auth/confirm/route.ts:165:      // Codex LOOP 2 N2 fix — keep the token_hash out of any Referer.
src/app/auth/confirm/route.ts:171:// ---------- POST — actual verifyOtp consume ----------
src/app/auth/confirm/route.ts:176:  // Codex LOOP 2 N1 fix — login-CSRF defense. The token_hash itself is
src/app/auth/confirm/route.ts:194:  const tokenHash = form.get("token_hash");
src/app/auth/confirm/route.ts:196:  const nextRaw = form.get("next");
src/app/auth/confirm/route.ts:199:    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`, 303);
src/app/auth/confirm/route.ts:205:  const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);
src/app/auth/confirm/route.ts:208:  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
src/app/auth/confirm/route.ts:211:    // verifyOtp failure modes: expired / invalid / consumed. All map to
src/app/auth/confirm/route.ts:224:    .from("profiles")
src/app/auth/confirm/route.ts:225:    .select("locale")
src/app/auth/confirm/route.ts:228:  const locale = profile?.locale === "en" ? "en" : "ko";
src/app/auth/confirm/route.ts:231:    return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`, 303);
src/app/auth/confirm/route.ts:234:  return NextResponse.redirect(`${origin}/${locale}${next}`, 303);
src/app/[locale]/app/settings/actions.ts:4:import { revalidatePath } from "next/cache";
src/app/[locale]/app/settings/actions.ts:17:const profileSchema = z.object({
src/app/[locale]/app/settings/actions.ts:26:  locale: z.enum(["ko", "en"]),
src/app/[locale]/app/settings/actions.ts:45:export async function updateProfile(input: unknown) {
src/app/[locale]/app/settings/actions.ts:46:  const parsed = profileSchema.safeParse(input);
src/app/[locale]/app/settings/actions.ts:61:      .from("profiles")
src/app/[locale]/app/settings/actions.ts:68:      const { error: rpcErr } = await (supabase.rpc as unknown as (
src/app/[locale]/app/settings/actions.ts:71:      ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
src/app/[locale]/app/settings/actions.ts:82:    .from("profiles")
src/app/[locale]/app/settings/actions.ts:83:    .update({
src/app/[locale]/app/settings/actions.ts:85:      locale: parsed.data.locale,
src/app/[locale]/app/settings/actions.ts:92:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/settings/actions.ts:96:const avatarSchema = z.object({
src/app/[locale]/app/settings/actions.ts:100:export async function updateAvatarUrl(input: unknown) {
src/app/[locale]/app/settings/actions.ts:101:  const parsed = avatarSchema.safeParse(input);
src/app/[locale]/app/settings/actions.ts:111:    .from("profiles")
src/app/[locale]/app/settings/actions.ts:112:    .update({ avatar_url: parsed.data.avatar_url })
src/app/[locale]/app/settings/actions.ts:116:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/settings/actions.ts:120:const workspaceSchema = z.object({
src/app/[locale]/app/settings/actions.ts:121:  workspaceId: z.string().uuid(),
src/app/[locale]/app/settings/actions.ts:127:export async function updateWorkspace(input: unknown) {
src/app/[locale]/app/settings/actions.ts:128:  const parsed = workspaceSchema.safeParse(input);
src/app/[locale]/app/settings/actions.ts:139:    .from("workspaces")
src/app/[locale]/app/settings/actions.ts:140:    .update({
src/app/[locale]/app/settings/actions.ts:145:    .eq("id", parsed.data.workspaceId);
src/app/[locale]/app/settings/actions.ts:148:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/settings/actions.ts:152:const inviteSchema = z.object({
src/app/[locale]/app/settings/actions.ts:153:  workspaceId: z.string().uuid(),
src/app/[locale]/app/settings/actions.ts:158:export async function inviteMember(formData: FormData) {
src/app/[locale]/app/settings/actions.ts:159:  const parsed = inviteSchema.safeParse({
src/app/[locale]/app/settings/actions.ts:160:    workspaceId: formData.get("workspaceId"),
src/app/[locale]/app/settings/actions.ts:169:export async function removeMember(formData: FormData) {
src/app/[locale]/app/settings/actions.ts:170:  const workspaceId = formData.get("workspaceId");
src/app/[locale]/app/settings/actions.ts:172:  if (typeof workspaceId !== "string" || typeof userId !== "string") {
src/app/[locale]/app/settings/actions.ts:184:    .from("workspace_members")
src/app/[locale]/app/settings/actions.ts:185:    .delete()
src/app/[locale]/app/settings/actions.ts:186:    .eq("workspace_id", workspaceId)
src/app/[locale]/app/settings/actions.ts:190:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:4:import { revalidatePath } from "next/cache";
src/app/[locale]/app/projects/[id]/ref-actions.ts:19:    projectId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/ref-actions.ts:59: * Prevents `otherProjectId/file.jpg` AND `${projectId}/../escape.jpg`
src/app/[locale]/app/projects/[id]/ref-actions.ts:64:  projectId: string
src/app/[locale]/app/projects/[id]/ref-actions.ts:67:  if (!path.startsWith(`${projectId}/`)) return false;
src/app/[locale]/app/projects/[id]/ref-actions.ts:71:export async function addReference(input: unknown) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:72:  const parsed = addSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/ref-actions.ts:77:  // Path-safety guard: uploaded paths must live under {projectId}/...
src/app/[locale]/app/projects/[id]/ref-actions.ts:78:  if (!pathBelongsToProject(d.storage_path, d.projectId)) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:81:  if (!pathBelongsToProject(d.thumbnail_path, d.projectId)) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:96:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen; kind not part of this action's schema
src/app/[locale]/app/projects/[id]/ref-actions.ts:97:  const { error } = await (supabase as any).from("project_references").insert({
src/app/[locale]/app/projects/[id]/ref-actions.ts:98:    project_id: d.projectId,
src/app/[locale]/app/projects/[id]/ref-actions.ts:114:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:118:const fromUrlSchema = z.object({
src/app/[locale]/app/projects/[id]/ref-actions.ts:119:  projectId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/ref-actions.ts:131:  projectId: string;
src/app/[locale]/app/projects/[id]/ref-actions.ts:134:  const parsed = fromUrlSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/ref-actions.ts:137:  const { projectId, url } = parsed.data;
src/app/[locale]/app/projects/[id]/ref-actions.ts:148:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen
src/app/[locale]/app/projects/[id]/ref-actions.ts:149:    const { error } = await (supabase as any).from("project_references").insert({
src/app/[locale]/app/projects/[id]/ref-actions.ts:150:      project_id: projectId,
src/app/[locale]/app/projects/[id]/ref-actions.ts:161:    revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:168:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen
src/app/[locale]/app/projects/[id]/ref-actions.ts:169:  const { error } = await (supabase as any).from("project_references").insert({
src/app/[locale]/app/projects/[id]/ref-actions.ts:170:    project_id: projectId,
src/app/[locale]/app/projects/[id]/ref-actions.ts:181:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:185:export async function removeReference(formData: FormData) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:197:    .from("project_references")
src/app/[locale]/app/projects/[id]/ref-actions.ts:209:    await supabase.storage.from("project-references").remove(toRemove);
src/app/[locale]/app/projects/[id]/ref-actions.ts:213:    .from("project_references")
src/app/[locale]/app/projects/[id]/ref-actions.ts:214:    .delete()
src/app/[locale]/app/projects/[id]/ref-actions.ts:219:  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:226:export async function removeReferenceFormAction(formData: FormData): Promise<void> {
src/app/[locale]/app/projects/new/page.tsx:1:import { getTranslations } from "next-intl/server";
src/app/[locale]/app/projects/new/page.tsx:8:  params: Promise<{ locale: string }>;
src/app/[locale]/app/projects/new/page.tsx:12:  const { locale } = await params;
src/app/[locale]/app/projects/new/page.tsx:14:  const t = await getTranslations({ locale, namespace: "projects" });
src/app/[locale]/app/projects/new/page.tsx:23:    redirect({ href: "/signin", locale });
src/app/[locale]/app/projects/new/page.tsx:32:  const workspaceId = active?.id ?? null;
src/app/[locale]/app/projects/new/page.tsx:36:  if (workspaceId) {
src/app/[locale]/app/projects/new/page.tsx:38:      .from("brands")
src/app/[locale]/app/projects/new/page.tsx:40:      .eq("workspace_id", workspaceId)
src/app/[locale]/app/projects/new/page.tsx:54:      <NewProjectWizard brands={brands} activeWorkspaceId={workspaceId} />
src/app/[locale]/(auth)/signin/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/(auth)/signin/page.tsx:15:const schema = z.object({
src/app/[locale]/app/projects/page.tsx:1:import { getTranslations } from "next-intl/server";
src/app/[locale]/app/projects/page.tsx:12:  params: Promise<{ locale: string }>;
src/app/[locale]/app/projects/page.tsx:13:  searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
src/app/[locale]/app/projects/page.tsx:28:  const { locale } = await params;
src/app/[locale]/app/projects/page.tsx:52:    redirect({ href: "/signin", locale });
src/app/[locale]/app/projects/page.tsx:57:    redirect({ href: "/onboarding", locale });
src/app/[locale]/app/projects/page.tsx:63:    .from("projects")
src/app/[locale]/app/projects/page.tsx:81:  if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);
src/app/[locale]/app/projects/page.tsx:92:  // Resolve brand name for active brand_id filter chip
src/app/[locale]/app/projects/page.tsx:94:    sp.brand_id && projects.length > 0
src/app/[locale]/app/projects/page.tsx:95:      ? (projects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
src/app/[locale]/app/projects/page.tsx:99:  const removeFilter = (key: "status" | "brand_id") => {
src/app/[locale]/app/projects/page.tsx:102:    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
src/app/[locale]/app/projects/page.tsx:130:      {(sp.status || (sp.brand_id && activeBrand)) && (
src/app/[locale]/app/projects/page.tsx:141:          {sp.brand_id && activeBrand && (
src/app/[locale]/app/projects/page.tsx:143:              href={removeFilter("brand_id")}
src/app/[locale]/app/projects/page.tsx:159:      {projects.length === 0 && <ProjectsHubHero locale={locale} />}
src/app/[locale]/app/projects/page.tsx:166:      <MeetingRequestCard workspaceId={primaryWorkspaceId} />
src/app/[locale]/app/projects/page.tsx:182:              dateLabel={new Intl.DateTimeFormat(locale, {
src/app/[locale]/app/projects/page.tsx:195:      <ProjectsHubWorkflowStrip locale={locale} />
src/app/[locale]/app/projects/page.tsx:196:      <ProjectsHubCtaBanner locale={locale} />
src/app/[locale]/app/dashboard/page.tsx:22:import Link from "next/link";
src/app/[locale]/app/dashboard/page.tsx:23:import { redirect } from "next/navigation";
src/app/[locale]/app/dashboard/page.tsx:24:import { notFound } from "next/navigation";
src/app/[locale]/app/dashboard/page.tsx:25:import { getTranslations } from "next-intl/server";
src/app/[locale]/app/dashboard/page.tsx:32:  params: Promise<{ locale: string }>;
src/app/[locale]/app/dashboard/page.tsx:61:  const { locale } = await params;
src/app/[locale]/app/dashboard/page.tsx:62:  const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
src/app/[locale]/app/dashboard/page.tsx:63:  const t = await getTranslations({ locale, namespace: "dashboard_v4" });
src/app/[locale]/app/dashboard/page.tsx:69:  if (!user) redirect(`/${locale}/signin`);
src/app/[locale]/app/dashboard/page.tsx:78:    redirect(`/${locale}/onboarding`);
src/app/[locale]/app/dashboard/page.tsx:80:  const workspaceId = active!.id;
src/app/[locale]/app/dashboard/page.tsx:83:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not in generated types
src/app/[locale]/app/dashboard/page.tsx:90:        .from("projects")
src/app/[locale]/app/dashboard/page.tsx:92:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:95:        .from("projects")
src/app/[locale]/app/dashboard/page.tsx:97:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:100:        .from("projects")
src/app/[locale]/app/dashboard/page.tsx:102:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:112:    .from("projects")
src/app/[locale]/app/dashboard/page.tsx:116:    .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:124:  const fmt = new Intl.DateTimeFormat(localeNarrow === "ko" ? "ko-KR" : "en-US", {
src/app/[locale]/app/dashboard/page.tsx:126:    month: localeNarrow === "ko" ? "long" : "short",
src/app/[locale]/app/dashboard/page.tsx:167:          href={`/${locale}/app/projects/new`}
src/app/[locale]/app/dashboard/page.tsx:207:              href={`/${locale}/app/projects/new`}
src/app/[locale]/app/dashboard/page.tsx:227:                    href={`/${locale}/app/projects/${p.id}`}
src/app/[locale]/app/dashboard/page.tsx:245:              href={`/${locale}/app/projects`}
rg: src/app/[locale]/onboarding/profile/actions.ts: 지정된 파일을 찾을 수 없습니다. (os error 2)

 exited 1 in 641ms:
src/app/[locale]/app/projects/new/actions.ts:4:import { revalidatePath } from "next/cache";
src/app/[locale]/app/projects/new/actions.ts:33:  brand_id: z.string().uuid().nullable().optional(),
src/app/[locale]/app/projects/new/actions.ts:55:const createProjectSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:70:export async function createProject(input: unknown): Promise<ActionResult> {
src/app/[locale]/app/projects/new/actions.ts:71:  const parsed = createProjectSchema.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:106:    brand_id: data.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:114:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:115:    .insert(insertPayload)
src/app/[locale]/app/projects/new/actions.ts:136:    .from("project_briefs")
src/app/[locale]/app/projects/new/actions.ts:137:    .insert({
src/app/[locale]/app/projects/new/actions.ts:158:      .from("projects")
src/app/[locale]/app/projects/new/actions.ts:159:      .delete()
src/app/[locale]/app/projects/new/actions.ts:170:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:178:const wizardDraftFields = z.object({
src/app/[locale]/app/projects/new/actions.ts:181:  brand_id: z.string().uuid().nullable().optional(),
src/app/[locale]/app/projects/new/actions.ts:195:const ensureDraftInput = z.object({
src/app/[locale]/app/projects/new/actions.ts:199:const submitDraftInput = z.object({
src/app/[locale]/app/projects/new/actions.ts:200:  projectId: z.string().uuid(),
src/app/[locale]/app/projects/new/actions.ts:208:  projectId: string;
src/app/[locale]/app/projects/new/actions.ts:236:  projectId: string,
src/app/[locale]/app/projects/new/actions.ts:239:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:241:    .eq("id", projectId)
src/app/[locale]/app/projects/new/actions.ts:246:    .from("project_briefs")
src/app/[locale]/app/projects/new/actions.ts:248:    .eq("project_id", projectId)
src/app/[locale]/app/projects/new/actions.ts:253:    projectId: project.id,
src/app/[locale]/app/projects/new/actions.ts:264:  input: unknown,
src/app/[locale]/app/projects/new/actions.ts:266:  const parsed = ensureDraftInput.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:288:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:305:    await service.from("projects").delete().eq("id", existing.id);
src/app/[locale]/app/projects/new/actions.ts:320:    brand_id: fields.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:327:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:328:    .insert(insertPayload)
src/app/[locale]/app/projects/new/actions.ts:337:        .from("projects")
src/app/[locale]/app/projects/new/actions.ts:359:    .from("project_briefs")
src/app/[locale]/app/projects/new/actions.ts:360:    .insert({
src/app/[locale]/app/projects/new/actions.ts:370:    await service.from("projects").delete().eq("id", project.id);
src/app/[locale]/app/projects/new/actions.ts:382:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:387:  input: unknown,
src/app/[locale]/app/projects/new/actions.ts:389:  const parsed = submitDraftInput.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:393:  const { projectId, fields, intent } = parsed.data;
src/app/[locale]/app/projects/new/actions.ts:404:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:406:    .eq("id", projectId)
src/app/[locale]/app/projects/new/actions.ts:421:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:422:    .update({
src/app/[locale]/app/projects/new/actions.ts:425:      brand_id: fields.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:431:    .eq("id", projectId)
src/app/[locale]/app/projects/new/actions.ts:442:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:443:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/new/actions.ts:469:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
src/app/[locale]/app/projects/new/actions.ts:499:const wizardAssetPutUrlSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:500:  storageKey: z
src/app/[locale]/app/projects/new/actions.ts:511:      { message: "storageKey prefix not allowed" }
src/app/[locale]/app/projects/new/actions.ts:516:      { message: "storageKey contains forbidden characters" }
src/app/[locale]/app/projects/new/actions.ts:526:  storageKey: unknown,
src/app/[locale]/app/projects/new/actions.ts:527:  contentType: unknown
src/app/[locale]/app/projects/new/actions.ts:529:  const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
src/app/[locale]/app/projects/new/actions.ts:545:  // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
src/app/[locale]/app/projects/new/actions.ts:555:  if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
src/app/[locale]/app/projects/new/actions.ts:556:    return { ok: false, error: "storage_key_not_owned" };
src/app/[locale]/app/projects/new/actions.ts:561:      parsed.data.storageKey,
src/app/[locale]/app/projects/new/actions.ts:568:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
src/app/[locale]/app/projects/new/actions.ts:580:const boardAssetPutUrlSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:585:  contentType: unknown
src/app/[locale]/app/projects/new/actions.ts:587:  const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
src/app/[locale]/app/projects/new/actions.ts:603:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
src/app/[locale]/app/projects/new/actions.ts:607:      storageKey,
src/app/[locale]/app/projects/new/actions.ts:612:    const pubUrl = briefObjectPublicUrl(storageKey);
src/app/[locale]/app/projects/new/actions.ts:633:  url: unknown,
src/app/[locale]/app/projects/new/actions.ts:635:  const parsed = videoUrlSchema.safeParse(url);
src/app/[locale]/app/projects/new/actions.ts:662:// Returns { ok: true, projectId, redirect } on success.
src/app/[locale]/app/projects/new/actions.ts:677:function validateTldrawStore(doc: Record<string, unknown>): boolean {
src/app/[locale]/app/projects/new/actions.ts:681:  const store = (doc as { store: unknown }).store;
src/app/[locale]/app/projects/new/actions.ts:688:// Wave C.5d sub_03f_5 F1: extend storage_key prefix allowlist to include
src/app/[locale]/app/projects/new/actions.ts:693:const PdfAttachmentSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:695:  storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//),
src/app/[locale]/app/projects/new/actions.ts:702:const UrlAttachmentSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:726:const SubmitInputSchema = z.object({
src/app/[locale]/app/projects/new/actions.ts:743:    .record(z.string(), z.unknown())
src/app/[locale]/app/projects/new/actions.ts:770:  // workspaceId is optional when draftProjectId is provided — the action
src/app/[locale]/app/projects/new/actions.ts:773:  workspaceId: z.string().uuid().optional(),
src/app/[locale]/app/projects/new/actions.ts:783:  | { ok: true; projectId: string; redirect: string }
src/app/[locale]/app/projects/new/actions.ts:787:  input: unknown
src/app/[locale]/app/projects/new/actions.ts:790:  const parsed = SubmitInputSchema.safeParse(input);
src/app/[locale]/app/projects/new/actions.ts:804:  // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
src/app/[locale]/app/projects/new/actions.ts:810:  //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
src/app/[locale]/app/projects/new/actions.ts:817:    .from("workspace_members")
src/app/[locale]/app/projects/new/actions.ts:824:  if (data.workspaceId && memberSet.has(data.workspaceId)) {
src/app/[locale]/app/projects/new/actions.ts:825:    resolvedWorkspaceId = data.workspaceId;
src/app/[locale]/app/projects/new/actions.ts:830:      .from("projects")
src/app/[locale]/app/projects/new/actions.ts:851:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
src/app/[locale]/app/projects/new/actions.ts:859:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:860:    .insert({
src/app/[locale]/app/projects/new/actions.ts:902:  // eslint-disable-next-line @typescript-eslint/no-explicit-any
src/app/[locale]/app/projects/new/actions.ts:905:    .from("project_status_history")
src/app/[locale]/app/projects/new/actions.ts:906:    .insert({
src/app/[locale]/app/projects/new/actions.ts:938:    seedDocument as Record<string, unknown>,
src/app/[locale]/app/projects/new/actions.ts:939:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
src/app/[locale]/app/projects/new/actions.ts:941:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
src/app/[locale]/app/projects/new/actions.ts:944:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/new/actions.ts:945:  const { error: seedErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/new/actions.ts:965:    // eslint-disable-next-line @typescript-eslint/no-explicit-any
src/app/[locale]/app/projects/new/actions.ts:966:    await (supabase as any).from("wizard_drafts").delete().eq("user_id", user.id);
src/app/[locale]/app/projects/new/actions.ts:973:    .from("projects")
src/app/[locale]/app/projects/new/actions.ts:974:    .delete()
src/app/[locale]/app/projects/new/actions.ts:987:  // Resolve caller's locale and email for the client confirmation
src/app/[locale]/app/projects/new/actions.ts:998:      service.from("profiles").select("display_name, locale").eq("id", user.id).maybeSingle(),
src/app/[locale]/app/projects/new/actions.ts:999:      service.from("workspaces").select("name").eq("id", resolvedWorkspaceId).maybeSingle(),
src/app/[locale]/app/projects/new/actions.ts:1003:    if (profile?.locale === "en") clientLocale = "en";
src/app/[locale]/app/projects/new/actions.ts:1016:      projectId: project.id,
src/app/[locale]/app/projects/new/actions.ts:1017:      locale: clientLocale,
src/app/[locale]/app/projects/new/actions.ts:1034:        projectId: project.id,
src/app/[locale]/app/projects/new/actions.ts:1035:        locale: clientLocale,
src/app/[locale]/app/projects/new/actions.ts:1057:  revalidatePath("/[locale]/app/projects", "page");
src/app/[locale]/app/projects/new/actions.ts:1058:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
src/app/[locale]/app/projects/new/actions.ts:1062:    projectId: project.id,
src/app/[locale]/app/projects/[id]/board-actions.ts:8: *   - updateProjectBoardAction(projectId, document)
src/app/[locale]/app/projects/[id]/board-actions.ts:14: *   - toggleLockAction(boardId, locked)
src/app/[locale]/app/projects/[id]/board-actions.ts:17: *   - restoreVersionAction(boardId, version)
src/app/[locale]/app/projects/[id]/board-actions.ts:25:import { revalidatePath } from "next/cache";
src/app/[locale]/app/projects/[id]/board-actions.ts:41:function validateTldrawStore(doc: Record<string, unknown>): boolean {
src/app/[locale]/app/projects/[id]/board-actions.ts:45:  const store = (doc as { store: unknown }).store;
src/app/[locale]/app/projects/[id]/board-actions.ts:54:const UpdateBoardSchema = z.object({
src/app/[locale]/app/projects/[id]/board-actions.ts:55:  projectId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/board-actions.ts:57:    .record(z.string(), z.unknown())
src/app/[locale]/app/projects/[id]/board-actions.ts:64:  | { ok: true; boardId: string }
src/app/[locale]/app/projects/[id]/board-actions.ts:78:  input: unknown
src/app/[locale]/app/projects/[id]/board-actions.ts:80:  const parsed = UpdateBoardSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/board-actions.ts:100:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:109:    .from("projects")
src/app/[locale]/app/projects/[id]/board-actions.ts:111:    .eq("id", parsed.data.projectId)
src/app/[locale]/app/projects/[id]/board-actions.ts:118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src/app/[locale]/app/projects/[id]/board-actions.ts:125:        .from("workspace_members")
src/app/[locale]/app/projects/[id]/board-actions.ts:140:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:142:    .eq("project_id", parsed.data.projectId)
src/app/[locale]/app/projects/[id]/board-actions.ts:151:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:157:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:159:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:176:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:179:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:180:    .update({
src/app/[locale]/app/projects/[id]/board-actions.ts:200:    .from("project_board_versions")
src/app/[locale]/app/projects/[id]/board-actions.ts:213:    const nextVersion = ((lastVersion?.version as number | undefined) ?? 0) + 1;
src/app/[locale]/app/projects/[id]/board-actions.ts:217:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:218:    await (svc as any).from("project_board_versions").insert({
src/app/[locale]/app/projects/[id]/board-actions.ts:220:      version: nextVersion,
src/app/[locale]/app/projects/[id]/board-actions.ts:227:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
src/app/[locale]/app/projects/[id]/board-actions.ts:228:  return { ok: true, boardId: board.id };
src/app/[locale]/app/projects/[id]/board-actions.ts:235:const ToggleLockSchema = z.object({
src/app/[locale]/app/projects/[id]/board-actions.ts:236:  boardId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/board-actions.ts:249:  input: unknown
src/app/[locale]/app/projects/[id]/board-actions.ts:251:  const parsed = ToggleLockSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/board-actions.ts:261:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:262:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
src/app/[locale]/app/projects/[id]/board-actions.ts:263:    p_board_id: parsed.data.boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:287:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:290:  if (!boardId || typeof boardId !== "string") {
src/app/[locale]/app/projects/[id]/board-actions.ts:305:    .from("user_roles")
src/app/[locale]/app/projects/[id]/board-actions.ts:313:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:314:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
src/app/[locale]/app/projects/[id]/board-actions.ts:315:    p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:324:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:326:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:328:    .eq("id", boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:333:      `/[locale]/app/projects/${boardLookup.project_id}`,
src/app/[locale]/app/projects/[id]/board-actions.ts:345:const RestoreVersionSchema = z.object({
src/app/[locale]/app/projects/[id]/board-actions.ts:346:  boardId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/board-actions.ts:366:  input: unknown
src/app/[locale]/app/projects/[id]/board-actions.ts:368:  const parsed = RestoreVersionSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/board-actions.ts:379:    .from("user_roles")
src/app/[locale]/app/projects/[id]/board-actions.ts:387:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:390:    .from("project_board_versions")
src/app/[locale]/app/projects/[id]/board-actions.ts:392:    .eq("board_id", parsed.data.boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:397:  const restoredDoc = snap.document as Record<string, unknown>;
src/app/[locale]/app/projects/[id]/board-actions.ts:405:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:407:    .eq("id", parsed.data.boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:411:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:413:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:419:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:421:    .eq("id", parsed.data.boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:429:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:432:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:433:    .update({
src/app/[locale]/app/projects/[id]/board-actions.ts:438:    .eq("id", parsed.data.boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:448:      `/[locale]/app/projects/${boardLookup.project_id}`,
src/app/[locale]/app/projects/[id]/board-actions.ts:470:  // eslint-disable-next-line @typescript-eslint/no-explicit-any
src/app/[locale]/app/projects/[id]/board-actions.ts:472:  boardId: string
src/app/[locale]/app/projects/[id]/board-actions.ts:475:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:477:    .eq("id", boardId)
src/app/[locale]/app/projects/[id]/board-actions.ts:482:    board.document as Record<string, unknown>,
src/app/[locale]/app/projects/[id]/board-actions.ts:483:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:485:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:490:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:493:    .from("project_boards")
src/app/[locale]/app/projects/[id]/board-actions.ts:494:    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
src/app/[locale]/app/projects/[id]/board-actions.ts:495:    .eq("id", boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:498:    revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
src/app/[locale]/app/projects/[id]/board-actions.ts:522:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:525:  if (!boardId || typeof boardId !== "string") {
src/app/[locale]/app/projects/[id]/board-actions.ts:549:  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
src/app/[locale]/app/projects/[id]/board-actions.ts:552:    const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
src/app/[locale]/app/projects/[id]/board-actions.ts:568:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:569:  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/[id]/board-actions.ts:572:      p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:573:      p_storage_key: storageKey,
src/app/[locale]/app/projects/[id]/board-actions.ts:584:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:585:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:597:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:600:  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
src/app/[locale]/app/projects/[id]/board-actions.ts:608:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:609:  const { error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/[id]/board-actions.ts:612:      p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:622:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:623:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:636:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:640:  if (!boardId) return { ok: false, error: "invalid_board_id" };
src/app/[locale]/app/projects/[id]/board-actions.ts:682:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:683:  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/[id]/board-actions.ts:686:      p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:699:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:700:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:711:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:715:  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
src/app/[locale]/app/projects/[id]/board-actions.ts:724:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:725:  const { error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/[id]/board-actions.ts:728:      p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:739:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:740:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
src/app/[locale]/app/projects/[id]/board-actions.ts:751:  boardId: string,
src/app/[locale]/app/projects/[id]/board-actions.ts:754:  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
src/app/[locale]/app/projects/[id]/board-actions.ts:762:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:763:  const { error: rpcErr } = await (supabase as any).rpc(
src/app/[locale]/app/projects/[id]/board-actions.ts:766:      p_board_id: boardId,
src/app/[locale]/app/projects/[id]/board-actions.ts:776:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
src/app/[locale]/app/projects/[id]/board-actions.ts:777:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
src/app/[locale]/auth/layout.tsx:1:import Image from "next/image";
src/app/[locale]/auth/layout.tsx:4:// Phase 4.x Wave C.5b sub_04 — chrome for the locale-prefixed /auth/*
src/app/auth/callback/route.ts:1:import { NextRequest, NextResponse } from "next/server";
src/app/auth/callback/route.ts:17:  const next = searchParams.get("next");
src/app/auth/callback/route.ts:44:  // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
src/app/auth/callback/route.ts:74:    .from("profiles")
src/app/auth/callback/route.ts:75:    .select("id, locale")
src/app/auth/callback/route.ts:79:  const locale = profile?.locale ?? "ko";
src/app/auth/callback/route.ts:83:    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
src/app/auth/callback/route.ts:89:    next && next.startsWith("/") && !next.startsWith("//")
src/app/auth/callback/route.ts:90:      ? next
src/app/auth/callback/route.ts:94:    .from("workspace_members")
src/app/auth/callback/route.ts:99:    .from("user_roles")
src/app/auth/callback/route.ts:110:      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
src/app/auth/callback/route.ts:111:      : `${origin}/${locale}/onboarding/workspace`;
src/app/auth/callback/route.ts:119:  return NextResponse.redirect(`${origin}/${locale}/app`);
src/app/[locale]/auth/expired/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/auth/expired/page.tsx:5:import { useSearchParams } from "next/navigation";
src/app/[locale]/auth/expired/page.tsx:28:const schema = z.object({
src/app/[locale]/auth/expired/page.tsx:74:      const next = Date.now();
src/app/[locale]/auth/expired/page.tsx:75:      setNow(next);
src/app/[locale]/auth/expired/page.tsx:76:      if (next >= cooldownEndsAt) {
src/app/[locale]/app/layout.tsx:21:  params: Promise<{ locale: string }>;
src/app/[locale]/app/layout.tsx:23:  const { locale } = await params;
src/app/[locale]/app/layout.tsx:29:  if (!user) redirect({ href: "/signin", locale });
src/app/[locale]/app/layout.tsx:33:    redirect({ href: "/onboarding", locale });
src/app/[locale]/app/layout.tsx:44:    redirect({ href: "/onboarding/workspace", locale });
src/app/[locale]/app/layout.tsx:50:    .from("notification_events")
src/app/[locale]/app/layout.tsx:55:  const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";
src/app/[locale]/app/layout.tsx:89:              locale={bellLocale}
src/app/[locale]/app/layout.tsx:100:            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
src/app/[locale]/app/layout.tsx:105:          workspaceId={activeWorkspace?.id ?? null}
src/app/[locale]/auth/verify/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/auth/verify/page.tsx:5:import { useSearchParams } from "next/navigation";
src/app/[locale]/(auth)/signup/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/(auth)/signup/page.tsx:9:import { useSearchParams } from "next/navigation";
src/app/[locale]/(auth)/signup/page.tsx:16:// Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
src/app/[locale]/(auth)/signup/page.tsx:58:  const next = sanitizeNext(searchParams.get("next"));
src/app/[locale]/(auth)/signup/page.tsx:70:  // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
src/app/[locale]/(auth)/signup/page.tsx:71:  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
src/app/[locale]/(auth)/signup/page.tsx:72:  // succeeds, embedded as `?next=` inside that template URL via the
src/app/[locale]/(auth)/signup/page.tsx:77:    return next ? `${siteUrl}${next}` : base;
src/app/[locale]/(auth)/signup/page.tsx:96:      // Honor `next` here too so the in-product redirect mirrors the
src/app/[locale]/(auth)/signup/page.tsx:99:      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
src/app/[locale]/(auth)/forgot-password/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/(auth)/forgot-password/page.tsx:15:const schema = z.object({
src/app/[locale]/(auth)/forgot-password/page.tsx:36:    // destination after verifyOtp succeeds at /auth/confirm. The
src/lib/workspace/active.ts:21:import { cookies } from "next/headers";
src/lib/workspace/active.ts:37:function narrowKind(value: unknown): WorkspaceKind {
src/lib/workspace/active.ts:58:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
src/lib/workspace/active.ts:61:    .from("workspace_members")
src/lib/workspace/active.ts:115:    // (cookies() in next/headers is read in server components). The
src/lib/app/context.ts:41:    locale: "ko" | "en";
src/lib/app/context.ts:57:    .from("profiles")
src/lib/app/context.ts:58:    .select("id, handle, display_name, avatar_url, locale, role")
src/lib/app/context.ts:65:    .from("user_roles")
src/lib/app/context.ts:74:    .from("workspace_members")
src/lib/app/context.ts:100:      locale: profile.locale as "ko" | "en",
src/app/[locale]/app/projects/new/new-project-wizard.tsx:34:import { useTranslations } from "next-intl";
src/app/[locale]/app/projects/new/new-project-wizard.tsx:95:const wizardSchema = z.object({
src/app/[locale]/app/projects/new/new-project-wizard.tsx:124:type WizardFormData = z.infer<typeof wizardSchema>;
src/app/[locale]/app/projects/new/new-project-wizard.tsx:249:  onChange: (next: string[]) => void;
src/app/[locale]/app/projects/new/new-project-wizard.tsx:296:  const [boardDocument, setBoardDocument] = useState<Record<string, unknown>>({});
src/app/[locale]/app/projects/new/new-project-wizard.tsx:312:  } = useForm<WizardFormData>({
src/app/[locale]/app/projects/new/new-project-wizard.tsx:334:      brand_id: null,
src/app/[locale]/app/projects/new/new-project-wizard.tsx:352:            setDraftProjectId(res.data.projectId);
src/app/[locale]/app/projects/new/new-project-wizard.tsx:398:    // Defer scroll to next frame so the target step renders before scrolling.
src/app/[locale]/app/projects/new/new-project-wizard.tsx:433:    // storage_key for wizard PDFs uses the board-assets prefix that
src/app/[locale]/app/projects/new/new-project-wizard.tsx:442:    let storageKey = result.publicUrl;
src/app/[locale]/app/projects/new/new-project-wizard.tsx:445:      storageKey = urlObj.pathname.replace(/^\//, "");
src/app/[locale]/app/projects/new/new-project-wizard.tsx:451:      storage_key: storageKey,
src/app/[locale]/app/projects/new/new-project-wizard.tsx:607:        boardId={null}
src/app/[locale]/app/projects/new/new-project-wizard.tsx:868:                workspaceId: activeWorkspaceId ?? undefined,
src/app/auth/confirm/route.ts:2:import { NextRequest, NextResponse } from "next/server";
src/app/auth/confirm/route.ts:12://   `verifyOtp({ token_hash, type })` would single-use-consume the
src/app/auth/confirm/route.ts:14:// - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
src/app/auth/confirm/route.ts:19://   `verifyOtp`. Crawler GETs see HTML, no token consumption.
src/app/auth/confirm/route.ts:22://   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
src/app/auth/confirm/route.ts:25:// ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------
src/app/auth/confirm/route.ts:40:  // Accept either a relative path or a same-origin absolute URL — Supabase
src/app/auth/confirm/route.ts:56:  // Strip leading locale so the post-confirm redirect re-prefixes with the
src/app/auth/confirm/route.ts:57:  // verified user's profile.locale.
src/app/auth/confirm/route.ts:106:  const tokenHash = searchParams.get("token_hash");
src/app/auth/confirm/route.ts:108:  const rawNext = searchParams.get("next");
src/app/auth/confirm/route.ts:111:    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
src/app/auth/confirm/route.ts:115:  const next = sanitizeNext(rawNext, origin, type);
src/app/auth/confirm/route.ts:117:  // Codex F2 LOOP 2 N2 fix — no external stylesheet. The token_hash sits
src/app/auth/confirm/route.ts:145:    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
src/app/auth/confirm/route.ts:147:    <input type="hidden" name="next" value="${escapeHtml(next)}" />
src/app/auth/confirm/route.ts:165:      // Codex LOOP 2 N2 fix — keep the token_hash out of any Referer.
src/app/auth/confirm/route.ts:171:// ---------- POST — actual verifyOtp consume ----------
src/app/auth/confirm/route.ts:176:  // Codex LOOP 2 N1 fix — login-CSRF defense. The token_hash itself is
src/app/auth/confirm/route.ts:194:  const tokenHash = form.get("token_hash");
src/app/auth/confirm/route.ts:196:  const nextRaw = form.get("next");
src/app/auth/confirm/route.ts:199:    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`, 303);
src/app/auth/confirm/route.ts:205:  const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);
src/app/auth/confirm/route.ts:208:  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
src/app/auth/confirm/route.ts:211:    // verifyOtp failure modes: expired / invalid / consumed. All map to
src/app/auth/confirm/route.ts:224:    .from("profiles")
src/app/auth/confirm/route.ts:225:    .select("locale")
src/app/auth/confirm/route.ts:228:  const locale = profile?.locale === "en" ? "en" : "ko";
src/app/auth/confirm/route.ts:231:    return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`, 303);
src/app/auth/confirm/route.ts:234:  return NextResponse.redirect(`${origin}/${locale}${next}`, 303);
src/app/[locale]/app/settings/actions.ts:4:import { revalidatePath } from "next/cache";
src/app/[locale]/app/settings/actions.ts:17:const profileSchema = z.object({
src/app/[locale]/app/settings/actions.ts:26:  locale: z.enum(["ko", "en"]),
src/app/[locale]/app/settings/actions.ts:45:export async function updateProfile(input: unknown) {
src/app/[locale]/app/settings/actions.ts:46:  const parsed = profileSchema.safeParse(input);
src/app/[locale]/app/settings/actions.ts:61:      .from("profiles")
src/app/[locale]/app/settings/actions.ts:68:      const { error: rpcErr } = await (supabase.rpc as unknown as (
src/app/[locale]/app/settings/actions.ts:71:      ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
src/app/[locale]/app/settings/actions.ts:82:    .from("profiles")
src/app/[locale]/app/settings/actions.ts:83:    .update({
src/app/[locale]/app/settings/actions.ts:85:      locale: parsed.data.locale,
src/app/[locale]/app/settings/actions.ts:92:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/settings/actions.ts:96:const avatarSchema = z.object({
src/app/[locale]/app/settings/actions.ts:100:export async function updateAvatarUrl(input: unknown) {
src/app/[locale]/app/settings/actions.ts:101:  const parsed = avatarSchema.safeParse(input);
src/app/[locale]/app/settings/actions.ts:111:    .from("profiles")
src/app/[locale]/app/settings/actions.ts:112:    .update({ avatar_url: parsed.data.avatar_url })
src/app/[locale]/app/settings/actions.ts:116:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/settings/actions.ts:120:const workspaceSchema = z.object({
src/app/[locale]/app/settings/actions.ts:121:  workspaceId: z.string().uuid(),
src/app/[locale]/app/settings/actions.ts:127:export async function updateWorkspace(input: unknown) {
src/app/[locale]/app/settings/actions.ts:128:  const parsed = workspaceSchema.safeParse(input);
src/app/[locale]/app/settings/actions.ts:139:    .from("workspaces")
src/app/[locale]/app/settings/actions.ts:140:    .update({
src/app/[locale]/app/settings/actions.ts:145:    .eq("id", parsed.data.workspaceId);
src/app/[locale]/app/settings/actions.ts:148:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/settings/actions.ts:152:const inviteSchema = z.object({
src/app/[locale]/app/settings/actions.ts:153:  workspaceId: z.string().uuid(),
src/app/[locale]/app/settings/actions.ts:158:export async function inviteMember(formData: FormData) {
src/app/[locale]/app/settings/actions.ts:159:  const parsed = inviteSchema.safeParse({
src/app/[locale]/app/settings/actions.ts:160:    workspaceId: formData.get("workspaceId"),
src/app/[locale]/app/settings/actions.ts:169:export async function removeMember(formData: FormData) {
src/app/[locale]/app/settings/actions.ts:170:  const workspaceId = formData.get("workspaceId");
src/app/[locale]/app/settings/actions.ts:172:  if (typeof workspaceId !== "string" || typeof userId !== "string") {
src/app/[locale]/app/settings/actions.ts:184:    .from("workspace_members")
src/app/[locale]/app/settings/actions.ts:185:    .delete()
src/app/[locale]/app/settings/actions.ts:186:    .eq("workspace_id", workspaceId)
src/app/[locale]/app/settings/actions.ts:190:  revalidatePath(`/[locale]/app/settings`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:4:import { revalidatePath } from "next/cache";
src/app/[locale]/app/projects/[id]/ref-actions.ts:19:    projectId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/ref-actions.ts:59: * Prevents `otherProjectId/file.jpg` AND `${projectId}/../escape.jpg`
src/app/[locale]/app/projects/[id]/ref-actions.ts:64:  projectId: string
src/app/[locale]/app/projects/[id]/ref-actions.ts:67:  if (!path.startsWith(`${projectId}/`)) return false;
src/app/[locale]/app/projects/[id]/ref-actions.ts:71:export async function addReference(input: unknown) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:72:  const parsed = addSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/ref-actions.ts:77:  // Path-safety guard: uploaded paths must live under {projectId}/...
src/app/[locale]/app/projects/[id]/ref-actions.ts:78:  if (!pathBelongsToProject(d.storage_path, d.projectId)) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:81:  if (!pathBelongsToProject(d.thumbnail_path, d.projectId)) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:96:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen; kind not part of this action's schema
src/app/[locale]/app/projects/[id]/ref-actions.ts:97:  const { error } = await (supabase as any).from("project_references").insert({
src/app/[locale]/app/projects/[id]/ref-actions.ts:98:    project_id: d.projectId,
src/app/[locale]/app/projects/[id]/ref-actions.ts:114:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:118:const fromUrlSchema = z.object({
src/app/[locale]/app/projects/[id]/ref-actions.ts:119:  projectId: z.string().uuid(),
src/app/[locale]/app/projects/[id]/ref-actions.ts:131:  projectId: string;
src/app/[locale]/app/projects/[id]/ref-actions.ts:134:  const parsed = fromUrlSchema.safeParse(input);
src/app/[locale]/app/projects/[id]/ref-actions.ts:137:  const { projectId, url } = parsed.data;
src/app/[locale]/app/projects/[id]/ref-actions.ts:148:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen
src/app/[locale]/app/projects/[id]/ref-actions.ts:149:    const { error } = await (supabase as any).from("project_references").insert({
src/app/[locale]/app/projects/[id]/ref-actions.ts:150:      project_id: projectId,
src/app/[locale]/app/projects/[id]/ref-actions.ts:161:    revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:168:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen
src/app/[locale]/app/projects/[id]/ref-actions.ts:169:  const { error } = await (supabase as any).from("project_references").insert({
src/app/[locale]/app/projects/[id]/ref-actions.ts:170:    project_id: projectId,
src/app/[locale]/app/projects/[id]/ref-actions.ts:181:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:185:export async function removeReference(formData: FormData) {
src/app/[locale]/app/projects/[id]/ref-actions.ts:197:    .from("project_references")
src/app/[locale]/app/projects/[id]/ref-actions.ts:209:    await supabase.storage.from("project-references").remove(toRemove);
src/app/[locale]/app/projects/[id]/ref-actions.ts:213:    .from("project_references")
src/app/[locale]/app/projects/[id]/ref-actions.ts:214:    .delete()
src/app/[locale]/app/projects/[id]/ref-actions.ts:219:  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
src/app/[locale]/app/projects/[id]/ref-actions.ts:226:export async function removeReferenceFormAction(formData: FormData): Promise<void> {
src/app/[locale]/app/projects/new/page.tsx:1:import { getTranslations } from "next-intl/server";
src/app/[locale]/app/projects/new/page.tsx:8:  params: Promise<{ locale: string }>;
src/app/[locale]/app/projects/new/page.tsx:12:  const { locale } = await params;
src/app/[locale]/app/projects/new/page.tsx:14:  const t = await getTranslations({ locale, namespace: "projects" });
src/app/[locale]/app/projects/new/page.tsx:23:    redirect({ href: "/signin", locale });
src/app/[locale]/app/projects/new/page.tsx:32:  const workspaceId = active?.id ?? null;
src/app/[locale]/app/projects/new/page.tsx:36:  if (workspaceId) {
src/app/[locale]/app/projects/new/page.tsx:38:      .from("brands")
src/app/[locale]/app/projects/new/page.tsx:40:      .eq("workspace_id", workspaceId)
src/app/[locale]/app/projects/new/page.tsx:54:      <NewProjectWizard brands={brands} activeWorkspaceId={workspaceId} />
src/app/[locale]/(auth)/signin/page.tsx:4:import { useTranslations } from "next-intl";
src/app/[locale]/(auth)/signin/page.tsx:15:const schema = z.object({
src/app/[locale]/app/projects/page.tsx:1:import { getTranslations } from "next-intl/server";
src/app/[locale]/app/projects/page.tsx:12:  params: Promise<{ locale: string }>;
src/app/[locale]/app/projects/page.tsx:13:  searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
src/app/[locale]/app/projects/page.tsx:28:  const { locale } = await params;
src/app/[locale]/app/projects/page.tsx:52:    redirect({ href: "/signin", locale });
src/app/[locale]/app/projects/page.tsx:57:    redirect({ href: "/onboarding", locale });
src/app/[locale]/app/projects/page.tsx:63:    .from("projects")
src/app/[locale]/app/projects/page.tsx:81:  if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);
src/app/[locale]/app/projects/page.tsx:92:  // Resolve brand name for active brand_id filter chip
src/app/[locale]/app/projects/page.tsx:94:    sp.brand_id && projects.length > 0
src/app/[locale]/app/projects/page.tsx:95:      ? (projects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
src/app/[locale]/app/projects/page.tsx:99:  const removeFilter = (key: "status" | "brand_id") => {
src/app/[locale]/app/projects/page.tsx:102:    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
src/app/[locale]/app/projects/page.tsx:130:      {(sp.status || (sp.brand_id && activeBrand)) && (
src/app/[locale]/app/projects/page.tsx:141:          {sp.brand_id && activeBrand && (
src/app/[locale]/app/projects/page.tsx:143:              href={removeFilter("brand_id")}
src/app/[locale]/app/projects/page.tsx:159:      {projects.length === 0 && <ProjectsHubHero locale={locale} />}
src/app/[locale]/app/projects/page.tsx:166:      <MeetingRequestCard workspaceId={primaryWorkspaceId} />
src/app/[locale]/app/projects/page.tsx:182:              dateLabel={new Intl.DateTimeFormat(locale, {
src/app/[locale]/app/projects/page.tsx:195:      <ProjectsHubWorkflowStrip locale={locale} />
src/app/[locale]/app/projects/page.tsx:196:      <ProjectsHubCtaBanner locale={locale} />
src/app/[locale]/app/dashboard/page.tsx:22:import Link from "next/link";
src/app/[locale]/app/dashboard/page.tsx:23:import { redirect } from "next/navigation";
src/app/[locale]/app/dashboard/page.tsx:24:import { notFound } from "next/navigation";
src/app/[locale]/app/dashboard/page.tsx:25:import { getTranslations } from "next-intl/server";
src/app/[locale]/app/dashboard/page.tsx:32:  params: Promise<{ locale: string }>;
src/app/[locale]/app/dashboard/page.tsx:61:  const { locale } = await params;
src/app/[locale]/app/dashboard/page.tsx:62:  const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
src/app/[locale]/app/dashboard/page.tsx:63:  const t = await getTranslations({ locale, namespace: "dashboard_v4" });
src/app/[locale]/app/dashboard/page.tsx:69:  if (!user) redirect(`/${locale}/signin`);
src/app/[locale]/app/dashboard/page.tsx:78:    redirect(`/${locale}/onboarding`);
src/app/[locale]/app/dashboard/page.tsx:80:  const workspaceId = active!.id;
src/app/[locale]/app/dashboard/page.tsx:83:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not in generated types
src/app/[locale]/app/dashboard/page.tsx:90:        .from("projects")
src/app/[locale]/app/dashboard/page.tsx:92:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:95:        .from("projects")
src/app/[locale]/app/dashboard/page.tsx:97:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:100:        .from("projects")
src/app/[locale]/app/dashboard/page.tsx:102:        .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:112:    .from("projects")
src/app/[locale]/app/dashboard/page.tsx:116:    .eq("workspace_id", workspaceId)
src/app/[locale]/app/dashboard/page.tsx:124:  const fmt = new Intl.DateTimeFormat(localeNarrow === "ko" ? "ko-KR" : "en-US", {
src/app/[locale]/app/dashboard/page.tsx:126:    month: localeNarrow === "ko" ? "long" : "short",
src/app/[locale]/app/dashboard/page.tsx:167:          href={`/${locale}/app/projects/new`}
src/app/[locale]/app/dashboard/page.tsx:207:              href={`/${locale}/app/projects/new`}
src/app/[locale]/app/dashboard/page.tsx:227:                    href={`/${locale}/app/projects/${p.id}`}
src/app/[locale]/app/dashboard/page.tsx:245:              href={`/${locale}/app/projects`}
rg: src/app/[locale]/onboarding/profile/actions.ts: 지정된 파일을 찾을 수 없습니다. (os error 2)

 succeeded in 735ms:
-- Phase 4.x -- task_01 -- workspace.kind + projects.twin_intent + projects.kind enum + project_licenses

-- ============================================================
-- 1. workspaces.kind
-- ============================================================
ALTER TABLE workspaces
  ADD COLUMN kind text NOT NULL DEFAULT 'brand'
    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));

-- Existing rows = 'brand' (rational default at this stage)
-- yagi_admin workspace requires a MANUAL UPDATE after verify
UPDATE workspaces SET kind = 'brand' WHERE kind IS NULL;

CREATE INDEX idx_workspaces_kind ON workspaces(kind);

-- ============================================================
-- 2. projects.twin_intent
-- ============================================================
ALTER TABLE projects
  ADD COLUMN twin_intent text NOT NULL DEFAULT 'undecided'
    CHECK (twin_intent IN ('undecided', 'specific_in_mind', 'no_twin'));

-- ============================================================
-- 3. projects.kind enum expansion
-- ============================================================
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_kind_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_kind_check CHECK (kind IN (
    'direct',
    'inbound_brand_to_artist',
    'talent_initiated_creative',
    'talent_initiated_self_ad',
    'talent_initiated_brand_passthrough',
    'talent_initiated_footage_upgrade'
  ));

-- Existing data stays 'direct' (NOT NULL, no backfill needed)

-- ============================================================
-- 4. project_licenses (Phase 6 fills in; Phase 4 = schema + RLS only)
-- ============================================================
CREATE TABLE project_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  region text NOT NULL DEFAULT 'KR'
    CHECK (region IN ('KR', 'JP', 'US', 'EU', 'ASIA', 'GLOBAL')),
  start_date date NOT NULL,
  end_date date,  -- NULL allowed (perpetual; explicit end is the default)
  fee_amount_krw bigint NOT NULL DEFAULT 0,
  fee_currency text NOT NULL DEFAULT 'KRW',
  artist_share_percent integer NOT NULL DEFAULT 0
    CHECK (artist_share_percent BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_project_licenses_project ON project_licenses(project_id);
CREATE INDEX idx_project_licenses_status ON project_licenses(status);

-- RLS
ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;

-- SELECT: yagi_admin (all rows) + project owner client (own rows)
CREATE POLICY "project_licenses_select_admin" ON project_licenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- Phase 4.x BLOCKER 1 fix (2026-05-01): KICKOFF spec referenced
-- projects.owner_id but the actual ownership column is created_by.
-- yagi confirmed option B: amend the policy to match the schema.
CREATE POLICY "project_licenses_select_owner" ON project_licenses
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
CREATE POLICY "project_licenses_write_admin" ON project_licenses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- updated_at trigger
-- NOTE: KICKOFF spec references update_updated_at_column() but that function
-- only exists in the storage schema. The public equivalent in this codebase
-- is public.tg_touch_updated_at() -- using that here.
CREATE TRIGGER project_licenses_updated_at_trigger
  BEFORE UPDATE ON project_licenses
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_touch_updated_at();
-- Phase 4.x Wave C.5b amend_01 ??auto-create profiles row on auth.users INSERT.
--
-- Background: Wave C.5b sub_01 retired the `/onboarding/role` selection page
-- as part of the persona-A lock (DECISIONS Q-094, Brand-only). The legacy
-- profile-creation step lived inside `completeProfileAction` driven by that
-- page; deleting it left signup flow with no profile creation. Result:
-- new users land on `/onboarding/workspace` and the bootstrap_workspace RPC
-- raises `profile_required`. Manual SQL was used as a stop-gap once.
--
-- This migration moves profile creation to a database trigger so the
-- application surface no longer carries the responsibility. New auth.users
-- INSERT ??profiles row materialises in the same transaction.
--
-- Default role = 'client' since persona A = Brand-only active persona.
-- Phase 5 entry will revisit when the Artist intake surface comes online
-- (DECISIONS Q-094); the artist demo account in amend_02 is created via
-- the service-role admin path which can override the default role.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_handle citext;
  v_display_name text;
  v_locale text;
  v_attempt int := 0;
BEGIN
  -- handle: c_<8-char-md5> (matches profiles_handle_check ^[a-z0-9_-]{3,30}$).
  -- md5() returns lowercase hex, so the result is always [a-f0-9] ??no
  -- escaping needed and no SQL injection vector despite the concatenation
  -- of NEW.email (md5 of any input is sanitised hex).
  -- Retry on collision: the handle UNIQUE constraint has its own backstop,
  -- but pre-checking lets us surface a clear error before INSERT.
  LOOP
    v_handle := ('c_' || substr(md5(NEW.id::text || COALESCE(NEW.email, '') || v_attempt::text), 1, 8))::citext;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE handle = v_handle);
    v_attempt := v_attempt + 1;
    IF v_attempt > 5 THEN
      RAISE EXCEPTION 'profile handle generation failed after 6 attempts for user_id=%', NEW.id;
    END IF;
  END LOOP;

  -- display_name: email local part fallback. Guard against empty local part
  -- (an email like "@example.com" ??invalid but defensible on insert path)
  -- and against a NULL email entirely.
  v_display_name := NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), '');
  IF v_display_name IS NULL THEN
    v_display_name := 'user';
  END IF;

  -- locale: prefer raw_user_meta_data (signup may set this), fall back to 'ko'.
  -- profiles.locale CHECK only allows 'ko' or 'en'; coerce anything else.
  v_locale := COALESCE(NEW.raw_user_meta_data->>'locale', 'ko');
  IF v_locale NOT IN ('ko', 'en') THEN
    v_locale := 'ko';
  END IF;

  -- Idempotent on profiles.id (the PK). Handle collision is guarded by the
  -- retry loop above; the application layer (sub_13 admin-create path)
  -- separately upserts and can override role on conflict.
  INSERT INTO public.profiles (id, handle, display_name, role, locale)
  VALUES (NEW.id, v_handle, v_display_name, 'client', v_locale)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Defense in depth: SECURITY DEFINER functions don't need EXECUTE granted
-- to be called by the trigger system, but blocking direct invocation by
-- authenticated/anon roles closes a privilege-escalation surface where a
-- user could call `SELECT public.handle_new_user(forged_record)` and try
-- to create a profile for an arbitrary uuid.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
-- Phase 4.x Wave C.5b amend_01 hardening (Codex K-05 LOOP 1 F1).
-- Tighten search_path to follow the repo's stronger convention used by
-- transition_project_status / is_valid_transition / validate_profile_role_transition
-- (search_path = public, pg_temp). Defense vs pg_temp shadowing per
-- https://www.postgresql.org/docs/current/sql-createfunction.html.
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;

 succeeded in 735ms:
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5c sub_01 ??PKCE intermediate confirm endpoint
// (Codex K-05 LOOP 1 fix for F1 + F7).
//
// Why an intermediate route ??and why GET renders HTML instead of
// verifying immediately:
// - Gmail / Outlook / corporate-mail link-preview crawlers GET email
//   links before users can click. If GET verified directly,
//   `verifyOtp({ token_hash, type })` would single-use-consume the
//   OTP and the user's real click would land on /auth/expired.
// - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
//   cookie (only `exchangeCodeForSession` does). The only reliable
//   way to keep crawlers from draining the token is to require a
//   user-initiated POST: GET renders an HTML "Continue" button, the
//   button POSTs the same payload, and only then do we call
//   `verifyOtp`. Crawler GETs see HTML, no token consumption.
//
// Email-template change is a yagi MANUAL action (FU-C5c-01):
//   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
// Same change for Magic Link + Reset Password templates.

// ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------

const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  "/onboarding/workspace",
  "/onboarding/brand",
  "/onboarding/invite",
  "/app",
];
const RECOVERY_NEXT = "/reset-password";
const DEFAULT_NEXT = "/onboarding/workspace";

function sanitizeNext(raw: string | null, origin: string, type: EmailOtpType): string {
  if (!raw) return type === "recovery" ? RECOVERY_NEXT : DEFAULT_NEXT;
  if (raw.length > 500) return DEFAULT_NEXT;

  // Accept either a relative path or a same-origin absolute URL ??Supabase
  // emits `{{ .RedirectTo }}` as an absolute URL when `emailRedirectTo` is
  // absolute (Codex F2: the prior version dropped these silently).
  let candidate: string;
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      candidate = raw;
    } else {
      const parsed = new URL(raw, origin);
      if (parsed.origin !== origin) return DEFAULT_NEXT;
      candidate = parsed.pathname + parsed.search;
    }
  } catch {
    return DEFAULT_NEXT;
  }

  // Strip leading locale so the post-confirm redirect re-prefixes with the
  // verified user's profile.locale.
  const stripped = candidate.replace(/^\/(ko|en)(?=\/|$)/, "");
  const path = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  const pathOnly = path.split("?")[0];

  // Recovery flow has its own allowlist (Codex F9: don't let a forged
  // signup link land an authenticated user on the password-reset form).
  if (type === "recovery") {
    return pathOnly === RECOVERY_NEXT || pathOnly.startsWith(`${RECOVERY_NEXT}/`)
      ? path
      : RECOVERY_NEXT;
  }

  for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return path;
    }
  }
  return DEFAULT_NEXT;
}

const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
];
function asOtpType(value: string | null): EmailOtpType | null {
  if (value === null) return null;
  return (SUPPORTED_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

// ---------- GET ??render intermediate HTML (no OTP consume) ----------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = asOtpType(searchParams.get("type"));
  const rawNext = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  }

  // Pre-sanitise so the form can carry a clean value forward.
  const next = sanitizeNext(rawNext, origin, type);

  // Codex F2 LOOP 2 N2 fix ??no external stylesheet. The token_hash sits
  // in the URL; loading a third-party CDN would risk a Referer leak even
  // with strict-origin-when-cross-origin defaulted (older browsers can
  // diverge). Inline-only styling + system-ui fallback.
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="no-referrer" />
<title>YAGI 쨌 ?대찓???몄쬆</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Pretendard, sans-serif; }
  main { width: 100%; max-width: 420px; padding: 32px 24px; text-align: center; }
  h1 { margin: 0 0 12px; font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
  p { margin: 0 0 28px; font-size: 14px; line-height: 1.5; color: #5C5C5C; }
  button { width: 100%; padding: 14px 24px; border: 0; border-radius: 12px; background: #71D083; color: #0A0A0A; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
  button:hover { filter: brightness(1.05); }
</style>
</head>
<body>
<main>
  <h1>?대찓???몄쬆???꾨즺??二쇱꽭??/h1>
  <p>?꾨옒 踰꾪듉???꾨Ⅴ硫?媛?낆씠 ?꾨즺?섍퀬 ?뚰겕?ㅽ럹?댁뒪 留뚮뱾湲곕줈 ?대룞?⑸땲??<br>
  Press the button below to confirm your email and continue.</p>
  <form method="POST" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
    <input type="hidden" name="type" value="${escapeHtml(type)}" />
    <input type="hidden" name="next" value="${escapeHtml(next)}" />
    <button type="submit">怨꾩냽?섍린 / Continue</button>
  </form>
</main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Defense vs accidental cache by intermediate proxies.
      "Cache-Control": "no-store",
      // Email-link surface; deny indexing.
      "X-Robots-Tag": "noindex,nofollow",
      // Codex LOOP 2 N1 fix ??clickjacking + form-action lockdown.
      "Content-Security-Policy":
        "default-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
      // Codex LOOP 2 N2 fix ??keep the token_hash out of any Referer.
      "Referrer-Policy": "no-referrer",
    },
  });
}

// ---------- POST ??actual verifyOtp consume ----------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);

  // Codex LOOP 2 N1 fix ??login-CSRF defense. The token_hash itself is
  // already a bearer credential, but rejecting cross-origin POSTs blocks
  // session-fixation attacks where an attacker submits their own token to
  // the victim's browser. Same-origin form submits set Origin (modern
  // browsers); when Origin is absent we fall back to Referer.
  const reqOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const sameOriginByOrigin = reqOrigin === origin;
  const sameOriginByReferer = referer ? referer.startsWith(`${origin}/`) : false;
  // Codex LOOP 3 N4 fix ??explicit 303 on every POST-side redirect.
  // The default NextResponse.redirect status (307) preserves the request
  // method, so the browser would re-POST the form body to /onboarding/...
  // which has no POST handler. 303 forces the follow-up to GET.
  if (!sameOriginByOrigin && !sameOriginByReferer) {
    return NextResponse.redirect(`${origin}/ko/signin?error=cross_origin_confirm`, 303);
  }

  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const typeRaw = form.get("type");
  const nextRaw = form.get("next");

  if (typeof tokenHash !== "string" || typeof typeRaw !== "string") {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`, 303);
  }
  const type = asOtpType(typeRaw);
  if (!type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=invalid_otp_type`, 303);
  }
  const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // verifyOtp failure modes: expired / invalid / consumed. All map to
    // the user-facing "link expired, request a new one" surface.
    return NextResponse.redirect(`${origin}/ko/auth/expired`, 303);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`, 303);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = profile?.locale === "en" ? "en" : "ko";

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`, 303);
  }

  return NextResponse.redirect(`${origin}/${locale}${next}`, 303);
}
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5b sub_04 ??expired-OTP detection. Supabase reports
// expiry via either the `error_description` query param on the redirect
// (PKCE error path) or as `exchangeCodeForSession` failure with a
// message containing one of these markers.
const EXPIRY_MARKERS = ["otp_expired", "otp expired", "code expired", "expired", "invalid_grant"];
function isExpiryError(message: string): boolean {
  const lower = message.toLowerCase();
  return EXPIRY_MARKERS.some((marker) => lower.includes(marker));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCodeParam = searchParams.get("error_code");
  const errorDescParam = searchParams.get("error_description");

  // Supabase Auth redirects expired/invalid links here with the failure
  // surfaced as query params instead of a `code`. Bounce to /auth/expired
  // before doing any other work.
  if (errorParam || errorCodeParam) {
    const blob = `${errorParam ?? ""} ${errorCodeParam ?? ""} ${errorDescParam ?? ""}`;
    if (isExpiryError(blob)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(errorDescParam ?? errorCodeParam ?? errorParam ?? "auth_failed")}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  // Phase 4.x Wave C.5b sub_05 ??exchangeCodeForSession persists the
  // authenticated session via the @supabase/ssr cookie adapter wired in
  // createSupabaseServer (server.ts setAll ??cookieStore.set). Inside a
  // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
  // entries land on the eventual NextResponse.redirect below ??meaning
  // the user arrives at /onboarding/workspace already authenticated.
  // No follow-up signIn() / refresh() call is required.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    if (isExpiryError(exchangeError.message)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  }

  // Phase 4.x Wave C.5b amend_01 LOOP 1 fix (Codex F12): the
  // handle_new_user DB trigger now guarantees a profiles row materialises
  // in the same transaction as auth.users INSERT, so `!profile` is no
  // longer the right onboarding gate. Use workspace membership + global
  // role instead ??the actual constraint that decides whether the user
  // can land on /app surfaces.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const locale = profile?.locale ?? "ko";

  // Password recovery flow: send to reset-password regardless of state.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  }

  // Phase 2.8.1 G_B1-H (F-PUX-003): preserve the commission intent across
  // the entire signup ??confirm ??onboarding chain.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : null;

  const { count: workspaceMembershipCount } = await supabase
    .from("workspace_members")
    .select("workspace_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: globalRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .in("role", ["creator", "yagi_admin"]);

  const hasWorkspace = (workspaceMembershipCount ?? 0) > 0;
  const hasGlobalRole = (globalRoles?.length ?? 0) > 0;

  if (!hasWorkspace && !hasGlobalRole) {
    const onboardingUrl = safeNext
      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
      : `${origin}/${locale}/onboarding/workspace`;
    return NextResponse.redirect(onboardingUrl);
  }

  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}

 succeeded in 766ms:
-- Wave C.5d sub_03f_5 F3 ??seed_project_board_from_wizard hardening.
--
-- Codex K-05 (codex exec, 2026-05-04) HIGH-B finding: the existing seed
-- function from migration 20260429151821 is `SECURITY DEFINER` and is
-- granted to `authenticated`. It writes the three server-managed
-- columns on project_boards (attached_pdfs, attached_urls, asset_index)
-- using values supplied by the caller. The Wave C.5d sub_03f_2
-- table-level UPDATE revoke does NOT cover SECURITY DEFINER paths, so
-- a malicious client could invoke this RPC directly (bypassing
-- submitProjectAction's server-side asset_index recomputation and
-- caller-bound storage_key checks) and persist arbitrary R2 keys.
--
-- This migration replaces the function with a hardened version that:
--
--   1. Validates every storage_key in `p_initial_attached_pdfs` is
--      caller-bound. The accepted prefixes match
--      `add_project_board_pdf` (sub_03f_5 F2):
--        - `board-assets/<auth.uid()>/...`
--        - `project-wizard/<auth.uid()>/...`
--        - `project-board/<v_board_id>/...` (board belongs to project)
--      Anything else is rejected.
--
--   2. Validates every URL in `p_initial_attached_urls` is http or
--      https only. (Defense in depth ??add_project_board_url already
--      enforces this, but the seed path predates that gate.)
--
--   3. Server-recomputes `asset_index` from the validated
--      attached_pdfs + attached_urls arrays. The `p_initial_asset_index`
--      parameter is retained for caller backwards compatibility but
--      its value is IGNORED. Canvas-derived entries are not built here
--      (parsing tldraw store snapshots in plpgsql is not supported);
--      the first saveBoardDocumentAction call after seed will rebuild
--      asset_index including canvas entries via the user-action's
--      TypeScript extractAssetIndex helper. Empty/near-empty documents
--      at wizard submit are the common case, so the gap is bounded.
--
--   4. Keeps the existing auth + project status gates (yagi_admin OR
--      project.created_by == caller, project.status == 'in_review').

-- LOOP 2 F3a: drop the older 3-arg overload from migration
-- 20260429124343 so an authenticated client can never reach the
-- legacy seed path that accepts an unvalidated caller-supplied
-- asset_index. PostgREST resolves overloads by argument set; with
-- this DROP, only the 5-arg hardened overload remains. The
-- TypeScript caller in submitProjectAction already passes 5 args,
-- so removing the 3-arg version does not affect any in-tree caller.
DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb, jsonb);

-- Helper function ??caller-bound storage_key check used by the seed
-- function for every entry in p_initial_attached_pdfs. Mirrored on
-- add_project_board_pdf inside migration 20260504004349 so the two
-- write paths stay in sync.
CREATE OR REPLACE FUNCTION assert_caller_bound_pdf_storage_key(
  p_storage_key text,
  p_caller_id   uuid,
  p_board_id    uuid
) RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
    RAISE EXCEPTION 'caller-bound check: invalid storage_key (null/traversal/leading slash)';
  END IF;
  IF NOT (
    p_storage_key LIKE 'board-assets/' || p_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-wizard/' || p_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
  ) THEN
    RAISE EXCEPTION 'caller-bound check: storage_key % not bound to caller % or board %',
      p_storage_key, p_caller_id, p_board_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  p_project_id            uuid,
  p_initial_document      jsonb,
  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_board_id          uuid;
  v_existing_board_id uuid;
  v_project_status    text;
  v_caller_id         uuid := auth.uid();
  v_pdf               jsonb;
  v_url               jsonb;
  v_url_text          text;
  v_pdf_entries       jsonb := '[]'::jsonb;
  v_url_entries       jsonb := '[]'::jsonb;
  v_asset_index       jsonb;
BEGIN
  -- Auth gate (unchanged from prior migration).
  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = p_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
  END IF;

  SELECT status INTO v_project_status
  FROM projects
  WHERE id = p_project_id;

  IF v_project_status IS NULL THEN
    RAISE EXCEPTION 'project not found: %', p_project_id;
  END IF;

  IF v_project_status != 'in_review' THEN
    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
      p_project_id, v_project_status;
  END IF;

  -- Resolve / pre-create the board id so caller-bound checks for
  -- `project-board/<v_board_id>/...` storage_keys can run before we
  -- accept any client-supplied attachments.
  SELECT id INTO v_existing_board_id
  FROM project_boards WHERE project_id = p_project_id;
  v_board_id := COALESCE(v_existing_board_id, gen_random_uuid());

  -- ---------- LOOP 2 F3b: reject non-array attachment payloads ----------
  -- The original validation skipped non-array values, but the upsert
  -- below still wrote `COALESCE(p_initial_attached_pdfs, '[]'::jsonb)`
  -- which would have persisted a malformed scalar/object as-is.
  -- Reject early so the upsert only ever sees a NULL or a real array.
  IF p_initial_attached_pdfs IS NOT NULL
     AND jsonb_typeof(p_initial_attached_pdfs) != 'array' THEN
    RAISE EXCEPTION
      'seed_project_board_from_wizard: p_initial_attached_pdfs must be a jsonb array or null (got %)',
      jsonb_typeof(p_initial_attached_pdfs);
  END IF;
  IF p_initial_attached_urls IS NOT NULL
     AND jsonb_typeof(p_initial_attached_urls) != 'array' THEN
    RAISE EXCEPTION
      'seed_project_board_from_wizard: p_initial_attached_urls must be a jsonb array or null (got %)',
      jsonb_typeof(p_initial_attached_urls);
  END IF;

  -- ---------- Validate attached_pdfs ----------
  IF p_initial_attached_pdfs IS NOT NULL THEN
    FOR v_pdf IN SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
    LOOP
      PERFORM assert_caller_bound_pdf_storage_key(
        v_pdf->>'storage_key',
        v_caller_id,
        v_board_id
      );
    END LOOP;
  END IF;

  -- ---------- Validate attached_urls (http/https only) ----------
  IF p_initial_attached_urls IS NOT NULL THEN
    FOR v_url IN SELECT * FROM jsonb_array_elements(p_initial_attached_urls)
    LOOP
      v_url_text := v_url->>'url';
      IF v_url_text IS NULL
         OR length(v_url_text) = 0
         OR length(v_url_text) > 2000
         OR NOT (v_url_text ~* '^https?://') THEN
        RAISE EXCEPTION 'seed_project_board_from_wizard: attached_url scheme must be http or https (got %)',
          coalesce(left(v_url_text, 80), '<null>');
      END IF;
    END LOOP;
  END IF;

  -- ---------- Server-recompute asset_index from arrays ----------
  -- (sub_03f_5 F3 option A) Canvas-derived entries are not built here;
  -- the first saveBoardDocumentAction call rebuilds asset_index from
  -- the document via the TypeScript extractAssetIndex helper.
  -- p_initial_asset_index is intentionally ignored.
  IF p_initial_attached_pdfs IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           pdf->>'id',
        'source',       'attached_pdf',
        'kind',         'pdf',
        'url',          pdf->>'storage_key',
        'title',        pdf->>'filename',
        'thumbnail_url', NULL,
        'filename',     pdf->>'filename',
        'size_bytes',   (pdf->>'size_bytes')::bigint,
        'note',         NULL,
        'added_at',     pdf->>'uploaded_at'
      )
      ORDER BY pdf->>'uploaded_at'
    ), '[]'::jsonb)
    INTO v_pdf_entries
    FROM jsonb_array_elements(p_initial_attached_pdfs) AS pdf;
  END IF;

  IF p_initial_attached_urls IS NOT NULL THEN
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id',           u->>'id',
        'source',       'attached_url',
        'kind',         'url',
        'url',          u->>'url',
        'title',        u->>'title',
        'thumbnail_url', u->>'thumbnail_url',
        'provider',     u->>'provider',
        'note',         u->>'note',
        'added_at',     u->>'added_at'
      )
      ORDER BY u->>'added_at'
    ), '[]'::jsonb)
    INTO v_url_entries
    FROM jsonb_array_elements(p_initial_attached_urls) AS u;
  END IF;

  v_asset_index := v_pdf_entries || v_url_entries;

  -- ---------- Upsert ----------
  INSERT INTO project_boards (
    id, project_id, document, attached_pdfs, attached_urls, asset_index, source
  )
  VALUES (
    v_board_id,
    p_project_id,
    p_initial_document,
    COALESCE(p_initial_attached_pdfs, '[]'::jsonb),
    COALESCE(p_initial_attached_urls, '[]'::jsonb),
    v_asset_index,
    'wizard_seed'
  )
  ON CONFLICT (project_id) DO UPDATE
    SET document      = EXCLUDED.document,
        attached_pdfs = EXCLUDED.attached_pdfs,
        attached_urls = EXCLUDED.attached_urls,
        asset_index   = EXCLUDED.asset_index,
        source        = 'wizard_seed',
        updated_at    = now()
  RETURNING id INTO v_board_id;

  RETURN v_board_id;
END;
$$;

COMMENT ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb, jsonb, jsonb) IS
  'Wave C.5d sub_03f_5 F3: caller-bound storage_key validation on every '
  'attached_pdf entry, http/https-only attached_url, server-recomputed '
  'asset_index from arrays (canvas entries added on first save). '
  'p_initial_asset_index parameter retained for caller compat but ignored.';
-- Wave C.5d sub_03f_1 + sub_03f_5 F2 ??allow `board-assets/` prefix on
-- add_project_board_pdf with caller-bound prefix checks.
--
-- Background: getBoardAssetPutUrlAction (Phase 3.0) generates a
-- server-side R2 upload key shaped like `board-assets/<user>/<uuid>.<ext>`
-- and presigns a PUT URL against that key. The earlier
-- add_project_board_pdf RPC validation only accepted `project-wizard/%`
-- and `project-board/%` prefixes, which forced the wizard client to
-- prepend a literal "project-wizard" segment in front of the real key
-- before persisting it through the RPC. The persisted key
-- (`project-wizard/board-assets/<user>/<uuid>.<ext>`) did not exist in
-- R2 and broke PDF retrieval from both the project board and the admin
-- asset-list panel.
--
-- This migration:
--   1. Extends the validation allowlist to include `board-assets/%`,
--      so the wizard can write the bare R2 key.
--   2. (sub_03f_5 F2) Binds every accepted prefix to the caller's own
--      identity so a malicious authenticated user cannot persist another
--      user's R2 key (or another board's project-board/ key) via this
--      RPC. Prefix-to-binding map:
--        - `board-assets/<auth.uid()>/...`
--        - `project-wizard/<auth.uid()>/...`
--        - `project-board/<p_board_id>/...`
--      Anything else under those prefixes is rejected.
--
-- Production audit at sub_03f_1 apply time: 0 broken-prefix entries
-- persisted in attached_pdfs, so no backfill is required.

CREATE OR REPLACE FUNCTION add_project_board_pdf(
  p_board_id    uuid,
  p_storage_key text,
  p_filename    text,
  p_size_bytes  bigint
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id  uuid := auth.uid();
  v_project_id uuid;
  v_is_locked  boolean;
  v_is_admin   boolean;
  v_new_id     uuid := gen_random_uuid();
  v_pdf_count  int;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
  END IF;

  SELECT pb.project_id, pb.is_locked
  INTO v_project_id, v_is_locked
  FROM project_boards pb
  WHERE pb.id = p_board_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'add_project_board_pdf: board not found';
  END IF;

  v_is_admin := is_yagi_admin(v_caller_id);
  IF NOT v_is_admin AND NOT EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = v_project_id AND p.created_by = v_caller_id
  ) THEN
    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  END IF;

  IF v_is_locked AND NOT v_is_admin THEN
    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  END IF;

  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  FROM project_boards WHERE id = p_board_id;
  IF v_pdf_count >= 30 THEN
    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  END IF;

  IF p_size_bytes > 20 * 1024 * 1024 THEN
    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  END IF;

  IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  END IF;

  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (null/traversal/leading slash)';
  END IF;

  -- sub_03f_5 F2: every accepted prefix is caller-bound. The role-bound
  -- prefixes use auth.uid() to prevent persisting another authenticated
  -- user's R2 key; the project-board prefix is bound to p_board_id so it
  -- cannot be cross-board persisted. Anything else is rejected.
  IF NOT (
    p_storage_key LIKE 'board-assets/' || v_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-wizard/' || v_caller_id::text || '/%'
    OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
  ) THEN
    RAISE EXCEPTION 'add_project_board_pdf: storage_key prefix must be caller-bound (board-assets/<caller>/, project-wizard/<caller>/, or project-board/<p_board_id>/)';
  END IF;

  UPDATE project_boards
  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
    'id', v_new_id::text,
    'storage_key', p_storage_key,
    'filename', p_filename,
    'size_bytes', p_size_bytes,
    'uploaded_at', now()::text,
    'uploaded_by', v_caller_id::text
  )), updated_at = now()
  WHERE id = p_board_id;

  RETURN v_new_id;
END;
$$;
-- Wave C.5d sub_03f_2 ??close the project_boards UPDATE bypass.
--
-- Phase 3.1 hotfix-3 (migration 20260429151821) tried to seal the three
-- server-managed columns on project_boards (attached_pdfs, attached_urls,
-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
-- role still holds table-level UPDATE: Postgres column privileges
-- evaluate as max(table-grant, column-grant). The default Supabase
-- bootstrap grants table-level UPDATE to `authenticated` on every public
-- table, so PostgREST clients have been able to UPDATE attached_pdfs /
-- attached_urls / asset_index directly, bypassing
-- add_project_board_pdf / add_project_board_url RPC validation
-- (count cap, URL scheme allowlist, lock state) and the asset_index
-- trust boundary (server-recomputed from document + attached_*).
--
-- Codex generic K-05 review (Phase 4.x branch, 2026-05-03) flagged this
-- as P1.
--
-- Lockdown:
--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
--   2. GRANT  UPDATE (document, updated_at) TO authenticated
--
-- After this migration, the only columns an authenticated PostgREST
-- client can UPDATE on project_boards are `document` (the user's own
-- tldraw store snapshot) and `updated_at` (timestamp the user can
-- trigger via document edits). All other columns flow through:
--   - add_project_board_pdf       (SECURITY DEFINER RPC)
--   - add_project_board_url       (SECURITY DEFINER RPC)
--   - toggle_project_board_lock   (SECURITY DEFINER RPC)
--   - service-role client inside board-actions.ts (asset_index updates
--     in saveBoardDocumentAction, restoreVersionAction, and the
--     recomputeAndUpdateAssetIndex helper)
--
-- The companion source-code refactor in
-- src/app/[locale]/app/projects/[id]/board-actions.ts is shipped in the
-- same Wave C.5d sub_03f_2 commit so the autosave / restore / repair
-- paths keep working under the new grant.

REVOKE UPDATE ON project_boards FROM authenticated;
GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;

-- Sanity assertions ??fail the migration if the privilege state is not
-- what we expect, so we never silently ship a half-applied lockdown.
--
-- Wave C.5d sub_03f_5 F5: information_schema.role_table_grants /
-- column_privileges only see direct grants to the named role; they do
-- not surface privileges inherited via PUBLIC or via role membership.
-- Use has_table_privilege() / has_column_privilege() instead ??those
-- check effective privileges (the same path PostgREST evaluates) so
-- the assertion catches drift through any inheritance chain.
DO $$
BEGIN
  -- Effective table-level UPDATE must be denied to authenticated.
  IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';
  END IF;

  -- Effective column-level UPDATE must remain on the explicitly granted
  -- columns the action layer relies on.
  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.document';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.updated_at';
  END IF;

  -- Effective column-level UPDATE must be denied on every server-managed
  -- column. asset_index, attached_pdfs, attached_urls, is_locked,
  -- locked_by, locked_at, schema_version, source, project_id, id flow
  -- through SECURITY DEFINER RPCs or the service-role client.
  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_by';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
  END IF;

  -- sub_03f_5 LOOP 2 F5: extend denied-column coverage to the remaining
  -- server-managed columns the prior assertion only mentioned in
  -- comments. id / project_id are unique-key columns that should never
  -- be UPDATEd from PostgREST; schema_version and source are
  -- server-set-once during INSERT.
  IF has_column_privilege('authenticated', 'public.project_boards', 'id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.id';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'project_id', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.project_id';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'schema_version', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.schema_version';
  END IF;
  IF has_column_privilege('authenticated', 'public.project_boards', 'source', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.source';
  END IF;
  -- sub_03f_5 LOOP 3 F5 final closure: created_at is also server-managed
  -- (set by INSERT default, never reissued); a writable created_at would
  -- let clients forge audit timestamps within their own RLS row scope.
  IF has_column_privilege('authenticated', 'public.project_boards', 'created_at', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.created_at';
  END IF;
END $$;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/[id]/ref-actions.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/[id]/board-actions.ts'; "'$lines=Get-Content -LiteralPath $p; foreach($range in @(@(1,230),@(230,340),@(340,520),@(520,640),@(640,760))){ for($i=$range[0]; $i -le [Math]::Min($range[1],$lines.Length); $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/settings/actions.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -Recurse -Filter actions.ts src/app | Select-Object -ExpandProperty FullName | Select-String -Pattern 'onboarding\\\\profile|onboarding/profile' -Quiet; rg --files src/app | rg \"onboarding.*/profile|profile/actions\"" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 395ms:
1:"use server";
2:
3:import { z } from "zod";
4:import { revalidatePath } from "next/cache";
5:import { createSupabaseServer } from "@/lib/supabase/server";
6:import { unfurlVideoUrl } from "@/lib/og-video-unfurl";
7:import { unfurl } from "@/lib/og-unfurl";
8:
9:const embedProviderSchema = z.enum(["youtube", "vimeo", "tiktok", "instagram"]);
10:
11:// Phase 2.1 G5 FIX_NOW #3 (Phase 1.2.5 L3) ??`media_type` is no longer
12:// accepted from the caller. Zod's default `.strip()` silently drops any
13:// client-supplied `media_type` key; the server derives the real value
14:// from server-owned signals (embed_provider, storage path / external URL
15:// extension). Prevents a class of caller-lie bugs where the client
16:// declares an incorrect media_type and the UI renders the wrong shape.
17:const addSchema = z
18:  .object({
19:    projectId: z.string().uuid(),
20:    storage_path: z.string().optional().nullable(),
21:    external_url: z.string().url().optional().nullable(),
22:    og_title: z.string().optional().nullable(),
23:    og_description: z.string().optional().nullable(),
24:    og_image_url: z.string().url().optional().nullable(),
25:    duration_seconds: z.number().finite().nonnegative().optional().nullable(),
26:    thumbnail_path: z.string().optional().nullable(),
27:    embed_provider: embedProviderSchema.optional().nullable(),
28:    page_count: z.number().int().nonnegative().optional().nullable(),
29:  })
30:  .refine((d) => !!d.storage_path || !!d.external_url, {
31:    message: "Either storage_path or external_url is required",
32:  });
33:
34:/**
35: * Server-side media_type derivation. Preference order:
36: *   1. embed_provider present ??`video` (platform embed ??always a video)
37: *   2. path/URL file extension ?? *        `.pdf` ??"pdf"
38: *        `.mp4` / `.mov` / `.webm` / `.m4v` ??"video"
39: *        anything else ??"image" (default for storage uploads + og unfurls)
40: * Querystring + hash fragments are stripped before the extension lookup.
41: */
42:function deriveMediaType(d: {
43:  storage_path?: string | null;
44:  external_url?: string | null;
45:  embed_provider?: "youtube" | "vimeo" | "tiktok" | "instagram" | null;
46:}): "image" | "video" | "pdf" {
47:  if (d.embed_provider) return "video";
48:  const raw = d.storage_path ?? d.external_url ?? "";
49:  const cleaned = raw.toLowerCase().split("?")[0].split("#")[0];
50:  const ext = cleaned.includes(".") ? cleaned.split(".").pop() : "";
51:  if (ext === "pdf") return "pdf";
52:  if (ext && ["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
53:  return "image";
54:}
55:
56:/**
57: * Ensures a supplied storage path is scoped to the given project.
58: * Prevents `otherProjectId/file.jpg` AND `${projectId}/../escape.jpg`
59: * ??Phase 2.0 G4 #10 hardened the prefix check against `..` traversal.
60: */
61:function pathBelongsToProject(
62:  path: string | null | undefined,
63:  projectId: string
64:): boolean {
65:  if (!path) return true;
66:  if (!path.startsWith(`${projectId}/`)) return false;
67:  return !path.split("/").includes("..");
68:}
69:
70:export async function addReference(input: unknown) {
71:  const parsed = addSchema.safeParse(input);
72:  if (!parsed.success) return { error: "validation" as const };
73:
74:  const d = parsed.data;
75:
76:  // Path-safety guard: uploaded paths must live under {projectId}/...
77:  if (!pathBelongsToProject(d.storage_path, d.projectId)) {
78:    return { error: "validation" as const };
79:  }
80:  if (!pathBelongsToProject(d.thumbnail_path, d.projectId)) {
81:    return { error: "validation" as const };
82:  }
83:
84:  // Phase 2.1 G5 FIX_NOW #3 ??derive media_type server-side, ignore any
85:  // caller-supplied value (Zod strips the field; the function only trusts
86:  // server-owned signals).
87:  const mediaType = deriveMediaType(d);
88:
89:  const supabase = await createSupabaseServer();
90:  const {
91:    data: { user },
92:  } = await supabase.auth.getUser();
93:  if (!user) return { error: "unauthenticated" as const };
94:
95:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen; kind not part of this action's schema
96:  const { error } = await (supabase as any).from("project_references").insert({
97:    project_id: d.projectId,
98:    added_by: user.id,
99:    storage_path: d.storage_path ?? null,
100:    external_url: d.external_url ?? null,
101:    og_title: d.og_title ?? null,
102:    og_description: d.og_description ?? null,
103:    og_image_url: d.og_image_url ?? null,
104:    media_type: mediaType,
105:    duration_seconds: d.duration_seconds ?? null,
106:    thumbnail_path: d.thumbnail_path ?? null,
107:    embed_provider: d.embed_provider ?? null,
108:    page_count: d.page_count ?? null,
109:  });
110:
111:  if (error) return { error: "db" as const, message: error.message };
112:
113:  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
114:  return { ok: true as const };
115:}
116:
117:const fromUrlSchema = z.object({
118:  projectId: z.string().uuid(),
119:  url: z.string().url(),
120:});
121:
122:/**
123: * Adds a reference from a pasted URL.
124: * Tries the video-platform oEmbed resolver first; on null, falls back
125: * to the generic OG unfurl used by the Phase 1.2 image-URL flow.
126: *
127: * RLS on project_references enforces membership ??no extra check here.
128: */
129:export async function addReferenceFromUrl(input: {
130:  projectId: string;
131:  url: string;
132:}): Promise<{ ok: true } | { error: string }> {
133:  const parsed = fromUrlSchema.safeParse(input);
134:  if (!parsed.success) return { error: "validation" };
135:
136:  const { projectId, url } = parsed.data;
137:
138:  const supabase = await createSupabaseServer();
139:  const {
140:    data: { user },
141:  } = await supabase.auth.getUser();
142:  if (!user) return { error: "unauthenticated" };
143:
144:  const video = await unfurlVideoUrl(url);
145:
146:  if (video) {
147:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen
148:    const { error } = await (supabase as any).from("project_references").insert({
149:      project_id: projectId,
150:      added_by: user.id,
151:      external_url: video.canonical_url,
152:      og_title: video.title,
153:      og_image_url: video.thumbnail_url,
154:      media_type: "video",
155:      embed_provider: video.provider,
156:      duration_seconds: video.duration_seconds,
157:    });
158:
159:    if (error) return { error: "db" };
160:    revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
161:    return { ok: true };
162:  }
163:
164:  // Fall back to generic OG unfurl (never throws).
165:  const og = await unfurl(url);
166:
167:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 kind column added; ref-actions predates regen
168:  const { error } = await (supabase as any).from("project_references").insert({
169:    project_id: projectId,
170:    added_by: user.id,
171:    external_url: url,
172:    og_title: og.og_title ?? null,
173:    og_description: og.og_description ?? null,
174:    og_image_url: og.og_image_url ?? null,
175:    media_type: "image",
176:    embed_provider: null,
177:  });
178:
179:  if (error) return { error: "db" };
180:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
181:  return { ok: true };
182:}
183:
184:export async function removeReference(formData: FormData) {
185:  const referenceId = formData.get("referenceId");
186:  if (typeof referenceId !== "string") return { error: "validation" as const };
187:
188:  const supabase = await createSupabaseServer();
189:  const {
190:    data: { user },
191:  } = await supabase.auth.getUser();
192:  if (!user) return { error: "unauthenticated" as const };
193:
194:  // Fetch the ref to know which project to revalidate + get storage_path
195:  const { data: ref } = await supabase
196:    .from("project_references")
197:    .select("project_id, storage_path, thumbnail_path")
198:    .eq("id", referenceId)
199:    .maybeSingle();
200:
201:  if (!ref) return { error: "not_found" as const };
202:
203:  // Delete the storage objects if any
204:  const toRemove: string[] = [];
205:  if (ref.storage_path) toRemove.push(ref.storage_path);
206:  if (ref.thumbnail_path) toRemove.push(ref.thumbnail_path);
207:  if (toRemove.length > 0) {
208:    await supabase.storage.from("project-references").remove(toRemove);
209:  }
210:
211:  const { error } = await supabase
212:    .from("project_references")
213:    .delete()
214:    .eq("id", referenceId);
215:
216:  if (error) return { error: "db" as const, message: error.message };
217:
218:  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
219:  return { ok: true as const };
220:}
221:
222:// Form-action-compatible wrapper (Promise<void>). Server Components pass
223:// this directly to <form action={...}> which requires void return per
224:// React 19 / Next.js 15 RSC type rules.
225:export async function removeReferenceFormAction(formData: FormData): Promise<void> {
226:  await removeReference(formData);
227:}

 succeeded in 446ms:
1:"use server";
2:
3:/**
4: * board-actions.ts
5: * Phase 3.1 task_05 ??server actions for ProjectBoard brief mode.
6: *
7: * Three actions:
8: *   - updateProjectBoardAction(projectId, document)
9: *       Validates auth + lock state; recomputes asset_index server-side
10: *       (K-05 trust boundary ??never trust client-supplied asset_index);
11: *       inserts a project_board_versions snapshot if >30s since last;
12: *       updates project_boards.{document, asset_index, updated_at}.
13: *
14: *   - toggleLockAction(boardId, locked)
15: *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
16: *
17: *   - restoreVersionAction(boardId, version)
18: *       Admin-only; copies project_board_versions.document back into
19: *       project_boards.document and recomputes asset_index.
20: *
21: * All anti-DoS: 5MB serialized cap on document.
22: */
23:
24:import { z } from "zod";
25:import { revalidatePath } from "next/cache";
26:import { createSupabaseServer } from "@/lib/supabase/server";
27:import { createSupabaseService } from "@/lib/supabase/service";
28:import { extractAssetIndex } from "@/lib/board/asset-index";
29:import {
30:  createBriefAssetPutUrl,
31:  briefObjectPublicUrl,
32:} from "@/lib/r2/client";
33:import { fetchVideoMetadata } from "@/lib/oembed";
34:
35:const VERSION_DEBOUNCE_MS = 30_000;
36:const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
37:
38:// K-05 LOOP 1 MEDIUM F6 fix: same validator as wizard's submitProjectAction
39:// to reject malformed tldraw store snapshots. Empty {} is permitted (a brief
40:// in initial state). Otherwise document MUST contain a `store` object key.
41:function validateTldrawStore(doc: Record<string, unknown>): boolean {
42:  if (!doc || typeof doc !== "object") return false;
43:  if (Object.keys(doc).length === 0) return true;
44:  if (!("store" in doc)) return false;
45:  const store = (doc as { store: unknown }).store;
46:  if (typeof store !== "object" || store === null) return false;
47:  return true;
48:}
49:
50:// ============================================================
51:// updateProjectBoardAction
52:// ============================================================
53:
54:const UpdateBoardSchema = z.object({
55:  projectId: z.string().uuid(),
56:  document: z
57:    .record(z.string(), z.unknown())
58:    .refine(validateTldrawStore, {
59:      message: "document is not a valid tldraw store snapshot",
60:    }),
61:});
62:
63:export type UpdateBoardResult =
64:  | { ok: true; boardId: string }
65:  | {
66:      ok: false;
67:      error:
68:        | "unauthenticated"
69:        | "validation"
70:        | "locked"
71:        | "not_found"
72:        | "forbidden"
73:        | "db";
74:      message?: string;
75:    };
76:
77:export async function updateProjectBoardAction(
78:  input: unknown
79:): Promise<UpdateBoardResult> {
80:  const parsed = UpdateBoardSchema.safeParse(input);
81:  if (!parsed.success) return { ok: false, error: "validation" };
82:
83:  // Anti-DoS
84:  let serialized: string;
85:  try {
86:    serialized = JSON.stringify(parsed.data.document);
87:  } catch {
88:    return { ok: false, error: "validation" };
89:  }
90:  if (serialized.length > DOCUMENT_MAX_BYTES) {
91:    return { ok: false, error: "validation", message: "document_too_large" };
92:  }
93:
94:  const supabase = await createSupabaseServer();
95:  const {
96:    data: { user },
97:  } = await supabase.auth.getUser();
98:  if (!user) return { ok: false, error: "unauthenticated" };
99:
100:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
101:  const sb = supabase as any;
102:
103:  // Wave C.5d sub_03f_5 F4: project_boards_update_client RLS scopes by
104:  // workspace membership, but a workspace member who is NOT the project
105:  // creator (and not yagi/workspace admin) must not be able to autosave
106:  // a teammate's brief. Re-verify ownership in the action layer before
107:  // the service-role UPDATE bypasses RLS.
108:  const { data: project, error: pErr } = await sb
109:    .from("projects")
110:    .select("created_by, workspace_id")
111:    .eq("id", parsed.data.projectId)
112:    .maybeSingle();
113:  if (pErr || !project) return { ok: false, error: "not_found" };
114:
115:  const isCreator = project.created_by === user.id;
116:  let isAuthorized = isCreator;
117:  if (!isAuthorized) {
118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
119:      uid: user.id,
120:    });
121:    if (yagiAdmin) {
122:      isAuthorized = true;
123:    } else {
124:      const { data: member } = await sb
125:        .from("workspace_members")
126:        .select("role")
127:        .eq("workspace_id", project.workspace_id)
128:        .eq("user_id", user.id)
129:        .maybeSingle();
130:      const memberRole = (member as { role: string } | null)?.role;
131:      if (memberRole === "owner" || memberRole === "admin") {
132:        isAuthorized = true;
133:      }
134:    }
135:  }
136:  if (!isAuthorized) return { ok: false, error: "forbidden" };
137:
138:  // Fetch the board (RLS gates SELECT ??non-owner non-admin gets nothing)
139:  const { data: board, error: bErr } = await sb
140:    .from("project_boards")
141:    .select("id, is_locked")
142:    .eq("project_id", parsed.data.projectId)
143:    .maybeSingle();
144:  if (bErr || !board) return { ok: false, error: "not_found" };
145:  if (board.is_locked) return { ok: false, error: "locked" };
146:
147:  // K-05 trust boundary: server-recompute asset_index. Never trust client.
148:  // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
149:  // For canvas-only update, fetch current attachment state from DB to merge.
150:  const { data: currentBoard } = await sb
151:    .from("project_boards")
152:    .select("attached_pdfs, attached_urls")
153:    .eq("id", board.id)
154:    .maybeSingle();
155:  const assetIndex = extractAssetIndex(
156:    parsed.data.document,
157:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
158:    ((currentBoard as any)?.attached_pdfs ?? []) as any,
159:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
160:    ((currentBoard as any)?.attached_urls ?? []) as any,
161:  );
162:
163:  // K-05 LOOP 1 HIGH-B F3 fix: atomic update guarded by is_locked=false to
164:  // close the lock race window. If admin locks between our SELECT and UPDATE,
165:  // the WHERE clause filters it out and `updated` returns empty rows; we then
166:  // return error:locked WITHOUT having inserted a version snapshot.
167:  //
168:  // Wave C.5d sub_03f_2: the migration locks `authenticated` out of
169:  // table-level UPDATE on project_boards and only re-grants
170:  // (document, updated_at), so PostgREST cannot UPDATE asset_index
171:  // anymore. Use the service-role client here to write asset_index in
172:  // the same atomic statement; authorization (workspace + lock) was
173:  // already enforced by the user-scoped SELECT above. Race guard
174:  // (eq is_locked=false) is preserved through the service client.
175:  const service = createSupabaseService();
176:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
177:  const svc = service as any;
178:  const { data: updated, error: uErr } = await svc
179:    .from("project_boards")
180:    .update({
181:      document: parsed.data.document,
182:      asset_index: assetIndex,
183:      updated_at: new Date().toISOString(),
184:    })
185:    .eq("id", board.id)
186:    .eq("is_locked", false)
187:    .select("id");
188:  if (uErr) {
189:    console.error("[updateProjectBoardAction] update error:", uErr);
190:    return { ok: false, error: "db", message: uErr.message };
191:  }
192:  if (!Array.isArray(updated) || updated.length === 0) {
193:    // Lock was acquired between SELECT and UPDATE ??no rows updated, no snapshot.
194:    return { ok: false, error: "locked" };
195:  }
196:
197:  // Versioning: snapshot AFTER successful update (K-05 LOOP 1 HIGH-B F3 fix ??  // never insert a version row for a write that did not land).
198:  const { data: lastVersion } = await sb
199:    .from("project_board_versions")
200:    .select("created_at, version")
201:    .eq("board_id", board.id)
202:    .order("version", { ascending: false })
203:    .limit(1)
204:    .maybeSingle();
205:
206:  const shouldSnapshot =
207:    !lastVersion ||
208:    Date.now() - new Date(lastVersion.created_at as string).getTime() >
209:      VERSION_DEBOUNCE_MS;
210:
211:  if (shouldSnapshot) {
212:    const nextVersion = ((lastVersion?.version as number | undefined) ?? 0) + 1;
213:    // INSERT bypasses RLS via service role (project_board_versions_insert_trigger
214:    // has WITH CHECK false, so user-scoped client cannot INSERT directly).
215:    const svc = createSupabaseService();
216:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
217:    await (svc as any).from("project_board_versions").insert({
218:      board_id: board.id,
219:      version: nextVersion,
220:      document: parsed.data.document,
221:      created_by: user.id,
222:      label: null,
223:    });
224:  }
225:
226:  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
227:  return { ok: true, boardId: board.id };
228:}
229:
230:// ============================================================
230:// ============================================================
231:// toggleLockAction
232:// ============================================================
233:
234:const ToggleLockSchema = z.object({
235:  boardId: z.string().uuid(),
236:  locked: z.boolean(),
237:});
238:
239:export type ToggleLockResult =
240:  | { ok: true }
241:  | {
242:      ok: false;
243:      error: "unauthenticated" | "validation" | "db" | "forbidden";
244:      message?: string;
245:    };
246:
247:export async function toggleLockAction(
248:  input: unknown
249:): Promise<ToggleLockResult> {
250:  const parsed = ToggleLockSchema.safeParse(input);
251:  if (!parsed.success) return { ok: false, error: "validation" };
252:
253:  const supabase = await createSupabaseServer();
254:  const {
255:    data: { user },
256:  } = await supabase.auth.getUser();
257:  if (!user) return { ok: false, error: "unauthenticated" };
258:
259:  // RPC enforces yagi_admin internally (RAISE EXCEPTION if not admin).
260:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
261:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
262:    p_board_id: parsed.data.boardId,
263:    p_locked: parsed.data.locked,
264:  });
265:  if (error) {
266:    console.error("[toggleLockAction] rpc error:", error);
267:    return { ok: false, error: "db", message: error.message };
268:  }
269:  return { ok: true };
270:}
271:
272:// ============================================================
273:// toggleBoardLockAction (Phase 3.1 hotfix-3 task_04)
274:// Defense-in-depth: action verifies yagi_admin role + RPC verifies.
275:// ============================================================
276:
277:export type ToggleBoardLockResult =
278:  | { ok: true; isLocked: boolean }
279:  | {
280:      ok: false;
281:      error: "unauthenticated" | "forbidden" | "validation" | "db";
282:      message?: string;
283:    };
284:
285:export async function toggleBoardLockAction(
286:  boardId: string,
287:  locked: boolean
288:): Promise<ToggleBoardLockResult> {
289:  if (!boardId || typeof boardId !== "string") {
290:    return { ok: false, error: "validation" };
291:  }
292:  if (typeof locked !== "boolean") {
293:    return { ok: false, error: "validation" };
294:  }
295:
296:  const supabase = await createSupabaseServer();
297:  const {
298:    data: { user },
299:  } = await supabase.auth.getUser();
300:  if (!user) return { ok: false, error: "unauthenticated" };
301:
302:  // Action-layer role check (defense-in-depth over RPC-only check)
303:  const { data: roles } = await supabase
304:    .from("user_roles")
305:    .select("role")
306:    .eq("user_id", user.id);
307:  const isYagiAdmin = (roles ?? []).some(
308:    (r) => (r as { role: string }).role === "yagi_admin"
309:  );
310:  if (!isYagiAdmin) return { ok: false, error: "forbidden" };
311:
312:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
313:  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
314:    p_board_id: boardId,
315:    p_locked: locked,
316:  });
317:  if (error) {
318:    console.error("[toggleBoardLockAction] rpc error:", error);
319:    return { ok: false, error: "db", message: error.message };
320:  }
321:
322:  // Resolve project_id for revalidation
323:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
324:  const { data: boardLookup } = await (supabase as any)
325:    .from("project_boards")
326:    .select("project_id")
327:    .eq("id", boardId)
328:    .maybeSingle();
329:
330:  if (boardLookup?.project_id) {
331:    revalidatePath(
332:      `/[locale]/app/projects/${boardLookup.project_id}`,
333:      "page"
334:    );
335:  }
336:
337:  return { ok: true, isLocked: locked };
338:}
339:
340:// ============================================================
340:// ============================================================
341:// restoreVersionAction
342:// ============================================================
343:
344:const RestoreVersionSchema = z.object({
345:  boardId: z.string().uuid(),
346:  version: z.number().int().positive(),
347:});
348:
349:export type RestoreVersionResult =
350:  | { ok: true }
351:  | {
352:      ok: false;
353:      error:
354:        | "unauthenticated"
355:        | "validation"
356:        | "forbidden"
357:        | "not_found"
358:        | "db";
359:      message?: string;
360:    };
361:
362:
363:
364:export async function restoreVersionAction(
365:  input: unknown
366:): Promise<RestoreVersionResult> {
367:  const parsed = RestoreVersionSchema.safeParse(input);
368:  if (!parsed.success) return { ok: false, error: "validation" };
369:
370:  const supabase = await createSupabaseServer();
371:  const {
372:    data: { user },
373:  } = await supabase.auth.getUser();
374:  if (!user) return { ok: false, error: "unauthenticated" };
375:
376:  // Admin-only check ??restore is destructive and bypasses lock state.
377:  const { data: roles } = await supabase
378:    .from("user_roles")
379:    .select("role")
380:    .eq("user_id", user.id);
381:  const isAdmin = (roles ?? []).some(
382:    (r) => (r as { role: string }).role === "yagi_admin"
383:  );
384:  if (!isAdmin) return { ok: false, error: "forbidden" };
385:
386:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
387:  const sb = supabase as any;
388:  const { data: snap, error: sErr } = await sb
389:    .from("project_board_versions")
390:    .select("document")
391:    .eq("board_id", parsed.data.boardId)
392:    .eq("version", parsed.data.version)
393:    .maybeSingle();
394:  if (sErr || !snap) return { ok: false, error: "not_found" };
395:
396:  const restoredDoc = snap.document as Record<string, unknown>;
397:  // K-05 LOOP 1 MEDIUM F6: validate snapshot is structurally a tldraw store
398:  // before restoring (defense against historical bad data).
399:  if (!validateTldrawStore(restoredDoc)) {
400:    return { ok: false, error: "validation", message: "snapshot_malformed" };
401:  }
402:  // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
403:  const { data: boardForRestore } = await sb
404:    .from("project_boards")
405:    .select("attached_pdfs, attached_urls")
406:    .eq("id", parsed.data.boardId)
407:    .maybeSingle();
408:  const assetIndex = extractAssetIndex(
409:    restoredDoc,
410:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
411:    ((boardForRestore as any)?.attached_pdfs ?? []) as any,
412:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
413:    ((boardForRestore as any)?.attached_urls ?? []) as any,
414:  );
415:
416:  // Resolve project_id for revalidation ??board ??project_id lookup
417:  const { data: boardLookup } = await sb
418:    .from("project_boards")
419:    .select("project_id")
420:    .eq("id", parsed.data.boardId)
421:    .maybeSingle();
422:
423:  // Wave C.5d sub_03f_2: same column-grant lockdown applies ??write
424:  // asset_index via service role. Admin-only action (yagi_admin gate
425:  // checked above) so authorization is well-established before this
426:  // UPDATE runs.
427:  const restoreService = createSupabaseService();
428:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
429:  const restoreSvc = restoreService as any;
430:  const { error: uErr } = await restoreSvc
431:    .from("project_boards")
432:    .update({
433:      document: restoredDoc,
434:      asset_index: assetIndex,
435:      updated_at: new Date().toISOString(),
436:    })
437:    .eq("id", parsed.data.boardId);
438:  if (uErr) {
439:    console.error("[restoreVersionAction] update error:", uErr);
440:    return { ok: false, error: "db", message: uErr.message };
441:  }
442:
443:  // K-05 LOOP 1 MEDIUM fix: revalidate the project page after restore so the
444:  // canvas re-renders with the restored snapshot.
445:  if (boardLookup?.project_id) {
446:    revalidatePath(
447:      `/[locale]/app/projects/${boardLookup.project_id}`,
448:      "page"
449:    );
450:  }
451:  return { ok: true };
452:}
453:
454:// ============================================================
455:// Phase 3.1 hotfix-3 ??Attachment server actions
456:// ============================================================
457:// All actions: validate input, call RPC, recompute asset_index server-side,
458:// revalidate page. Trust boundary: client never supplies asset_index (L-041).
459:
460:// Helper: recompute asset_index from current board state and UPDATE.
461:// Wave C.5d sub_03f_2: asset_index is now revoked from authenticated at
462:// the table level. The helper still accepts a user-scoped client for the
463:// pre-fetch SELECT so RLS gates row visibility, but the UPDATE switches
464:// to the service-role client because column grants no longer let
465:// authenticated write asset_index. Callers (add_project_board_pdf /
466:// add_project_board_url action wrappers) have already validated auth
467:// via their RPC + RLS pre-check before invoking this helper.
468:async function recomputeAndUpdateAssetIndex(
469:  // eslint-disable-next-line @typescript-eslint/no-explicit-any
470:  sb: any,
471:  boardId: string
472:): Promise<void> {
473:  const { data: board } = await sb
474:    .from("project_boards")
475:    .select("document, attached_pdfs, attached_urls, project_id")
476:    .eq("id", boardId)
477:    .maybeSingle();
478:  if (!board) return;
479:
480:  const newIndex = extractAssetIndex(
481:    board.document as Record<string, unknown>,
482:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
483:    (board.attached_pdfs ?? []) as any,
484:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
485:    (board.attached_urls ?? []) as any,
486:  );
487:
488:  const service = createSupabaseService();
489:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
490:  const svc = service as any;
491:  await svc
492:    .from("project_boards")
493:    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
494:    .eq("id", boardId);
495:
496:  if (board.project_id) {
497:    revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
498:  }
499:}
500:
501:// URL validation ??only http/https allowed (L-042 server layer)
502:const SAFE_URL_SCHEMES = ["http:", "https:"];
503:function validateUrlScheme(url: string): boolean {
504:  try {
505:    const parsed = new URL(url);
506:    return SAFE_URL_SCHEMES.includes(parsed.protocol);
507:  } catch {
508:    return false;
509:  }
510:}
511:
512:// ============================================================
513:// addPdfAttachmentAction
514:// ============================================================
515:
516:export type AddPdfResult =
517:  | { ok: true; attachmentId: string }
518:  | { ok: false; error: string };
519:
520:export async function addPdfAttachmentAction(
520:export async function addPdfAttachmentAction(
521:  boardId: string,
522:  file: File
523:): Promise<AddPdfResult> {
524:  if (!boardId || typeof boardId !== "string") {
525:    return { ok: false, error: "invalid_board_id" };
526:  }
527:
528:  // Validate file
529:  if (file.type !== "application/pdf") {
530:    return { ok: false, error: "not_pdf" };
531:  }
532:  if (file.size > 20 * 1024 * 1024) {
533:    return { ok: false, error: "file_too_large" };
534:  }
535:  if (file.name.length > 200) {
536:    return { ok: false, error: "filename_too_long" };
537:  }
538:
539:  const supabase = await createSupabaseServer();
540:  const {
541:    data: { user },
542:  } = await supabase.auth.getUser();
543:  if (!user) return { ok: false, error: "unauthenticated" };
544:
545:  // Upload to R2 first (server-generated key for this board)
546:  const ext = "pdf";
547:  const uuid = crypto.randomUUID();
548:  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
549:
550:  try {
551:    const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
552:    const arrayBuffer = await file.arrayBuffer();
553:    const putResp = await fetch(putUrl, {
554:      method: "PUT",
555:      body: arrayBuffer,
556:      headers: { "Content-Type": file.type },
557:    });
558:    if (!putResp.ok) {
559:      return { ok: false, error: "r2_put_failed" };
560:    }
561:  } catch (err) {
562:    console.error("[addPdfAttachmentAction] R2 upload error:", err);
563:    return { ok: false, error: "r2_upload_error" };
564:  }
565:
566:  // Call add_project_board_pdf RPC
567:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
568:  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
569:    "add_project_board_pdf",
570:    {
571:      p_board_id: boardId,
572:      p_storage_key: storageKey,
573:      p_filename: file.name,
574:      p_size_bytes: file.size,
575:    }
576:  );
577:  if (rpcErr) {
578:    console.error("[addPdfAttachmentAction] RPC error:", rpcErr);
579:    return { ok: false, error: rpcErr.message };
580:  }
581:
582:  // Recompute asset_index server-side (trust boundary L-041)
583:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
584:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
585:
586:  return { ok: true, attachmentId: attachmentId as string };
587:}
588:
589:// ============================================================
590:// removePdfAttachmentAction
591:// ============================================================
592:
593:export type RemovePdfResult = { ok: true } | { ok: false; error: string };
594:
595:export async function removePdfAttachmentAction(
596:  boardId: string,
597:  attachmentId: string
598:): Promise<RemovePdfResult> {
599:  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
600:
601:  const supabase = await createSupabaseServer();
602:  const {
603:    data: { user },
604:  } = await supabase.auth.getUser();
605:  if (!user) return { ok: false, error: "unauthenticated" };
606:
607:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
608:  const { error: rpcErr } = await (supabase as any).rpc(
609:    "remove_project_board_attachment",
610:    {
611:      p_board_id: boardId,
612:      p_kind: "pdf",
613:      p_attachment_id: attachmentId,
614:    }
615:  );
616:  if (rpcErr) {
617:    console.error("[removePdfAttachmentAction] RPC error:", rpcErr);
618:    return { ok: false, error: rpcErr.message };
619:  }
620:
621:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
622:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
623:  return { ok: true };
624:}
625:
626:// ============================================================
627:// addUrlAttachmentAction
628:// ============================================================
629:
630:export type AddUrlResult =
631:  | { ok: true; attachmentId: string }
632:  | { ok: false; error: string };
633:
634:export async function addUrlAttachmentAction(
635:  boardId: string,
636:  url: string,
637:  note: string | null
638:): Promise<AddUrlResult> {
639:  if (!boardId) return { ok: false, error: "invalid_board_id" };
640:
640:
641:  // Server-side URL validation (L-042 ??only http/https)
642:  if (!validateUrlScheme(url)) {
643:    return { ok: false, error: "invalid_url_scheme" };
644:  }
645:  if (url.length > 2000) return { ok: false, error: "url_too_long" };
646:  if (note && note.length > 500) return { ok: false, error: "note_too_long" };
647:
648:  const supabase = await createSupabaseServer();
649:  const {
650:    data: { user },
651:  } = await supabase.auth.getUser();
652:  if (!user) return { ok: false, error: "unauthenticated" };
653:
654:  // Detect provider and fetch metadata
655:  let provider: "youtube" | "vimeo" | "generic" = "generic";
656:  let title: string | null = null;
657:  let thumbnail_url: string | null = null;
658:
659:  try {
660:    const parsedUrl = new URL(url);
661:    const host = parsedUrl.hostname.replace(/^www\./, "");
662:    if (host === "youtube.com" || host === "youtu.be") provider = "youtube";
663:    else if (host === "vimeo.com") provider = "vimeo";
664:    else title = host;
665:  } catch {
666:    // ignore parse error ??URL already validated above
667:  }
668:
669:  if (provider !== "generic") {
670:    try {
671:      const meta = await fetchVideoMetadata(url);
672:      if (meta) {
673:        title = meta.title ?? null;
674:        thumbnail_url = meta.thumbnailUrl ?? null;
675:      }
676:    } catch {
677:      // best-effort ??fall back to no metadata
678:    }
679:  }
680:
681:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
682:  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
683:    "add_project_board_url",
684:    {
685:      p_board_id: boardId,
686:      p_url: url,
687:      p_title: title,
688:      p_thumbnail_url: thumbnail_url,
689:      p_provider: provider,
690:      p_note: note,
691:    }
692:  );
693:  if (rpcErr) {
694:    console.error("[addUrlAttachmentAction] RPC error:", rpcErr);
695:    return { ok: false, error: rpcErr.message };
696:  }
697:
698:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
699:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
700:  return { ok: true, attachmentId: attachmentId as string };
701:}
702:
703:// ============================================================
704:// updateUrlNoteAction
705:// ============================================================
706:
707:export type UpdateUrlNoteResult = { ok: true } | { ok: false; error: string };
708:
709:export async function updateUrlNoteAction(
710:  boardId: string,
711:  attachmentId: string,
712:  note: string
713:): Promise<UpdateUrlNoteResult> {
714:  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
715:  if (note && note.length > 500) return { ok: false, error: "note_too_long" };
716:
717:  const supabase = await createSupabaseServer();
718:  const {
719:    data: { user },
720:  } = await supabase.auth.getUser();
721:  if (!user) return { ok: false, error: "unauthenticated" };
722:
723:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
724:  const { error: rpcErr } = await (supabase as any).rpc(
725:    "update_project_board_url_note",
726:    {
727:      p_board_id: boardId,
728:      p_attachment_id: attachmentId,
729:      p_note: note,
730:    }
731:  );
732:  if (rpcErr) {
733:    console.error("[updateUrlNoteAction] RPC error:", rpcErr);
734:    return { ok: false, error: rpcErr.message };
735:  }
736:
737:  // Note is in asset_index entries ??must recompute (L-041)
738:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
739:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
740:  return { ok: true };
741:}
742:
743:// ============================================================
744:// removeUrlAttachmentAction
745:// ============================================================
746:
747:export type RemoveUrlResult = { ok: true } | { ok: false; error: string };
748:
749:export async function removeUrlAttachmentAction(
750:  boardId: string,
751:  attachmentId: string
752:): Promise<RemoveUrlResult> {
753:  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
754:
755:  const supabase = await createSupabaseServer();
756:  const {
757:    data: { user },
758:  } = await supabase.auth.getUser();
759:  if (!user) return { ok: false, error: "unauthenticated" };
760:

 succeeded in 395ms:
1:"use server";
2:
3:import { z } from "zod";
4:import { revalidatePath } from "next/cache";
5:import { createSupabaseServer } from "@/lib/supabase/server";
6:import {
7:  validateHandle,
8:  HANDLE_MIN_LENGTH,
9:  HANDLE_MAX_LENGTH,
10:} from "@/lib/handles/validate";
11:
12:// Phase 4.x Wave C.5a sub_04 ??handle is no longer surfaced in /app/settings.
13:// The field stays optional on the action so any future admin/internal
14:// surface that wants to drive change_handle through this entry point can
15:// continue to do so. Client form omits it; server skips the RPC path
16:// when absent.
17:const profileSchema = z.object({
18:  display_name: z.string().trim().min(1).max(80),
19:  handle: z
20:    .string()
21:    .trim()
22:    .toLowerCase()
23:    .min(HANDLE_MIN_LENGTH)
24:    .max(HANDLE_MAX_LENGTH)
25:    .optional(),
26:  locale: z.enum(["ko", "en"]),
27:  // G6 additions
28:  bio: z
29:    .string()
30:    .trim()
31:    .max(200, "bio_too_long")
32:    .nullable()
33:    .optional()
34:    .transform((v) => (v === "" ? null : v ?? null)),
35:  instagram_handle: z
36:    .string()
37:    .trim()
38:    .max(50)
39:    .regex(/^[a-zA-Z0-9._]*$/, "instagram_invalid")
40:    .nullable()
41:    .optional()
42:    .transform((v) => (v === "" ? null : v ?? null)),
43:});
44:
45:export async function updateProfile(input: unknown) {
46:  const parsed = profileSchema.safeParse(input);
47:  if (!parsed.success) return { error: "validation" as const };
48:
49:  const supabase = await createSupabaseServer();
50:  const {
51:    data: { user },
52:  } = await supabase.auth.getUser();
53:  if (!user) return { error: "unauthenticated" as const };
54:
55:  // Optional handle change path ??only entered when caller supplied one.
56:  if (parsed.data.handle) {
57:    const handleErr = validateHandle(parsed.data.handle);
58:    if (handleErr) return { error: "handle" as const, kind: handleErr };
59:
60:    const { data: currentProfile } = await supabase
61:      .from("profiles")
62:      .select("handle")
63:      .eq("id", user.id)
64:      .maybeSingle();
65:    const currentHandle = currentProfile?.handle ?? null;
66:
67:    if (currentHandle && currentHandle !== parsed.data.handle) {
68:      const { error: rpcErr } = await (supabase.rpc as unknown as (
69:        fn: "change_handle",
70:        args: { new_handle_input: string }
71:      ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>)(
72:        "change_handle",
73:        { new_handle_input: parsed.data.handle }
74:      );
75:      if (rpcErr) {
76:        return { error: "handle_change" as const, message: rpcErr.message };
77:      }
78:    }
79:  }
80:
81:  const { error } = await supabase
82:    .from("profiles")
83:    .update({
84:      display_name: parsed.data.display_name,
85:      locale: parsed.data.locale,
86:      bio: parsed.data.bio ?? null,
87:      instagram_handle: parsed.data.instagram_handle ?? null,
88:    })
89:    .eq("id", user.id);
90:
91:  if (error) return { error: "db" as const, message: error.message };
92:  revalidatePath(`/[locale]/app/settings`, "page");
93:  return { ok: true as const };
94:}
95:
96:const avatarSchema = z.object({
97:  avatar_url: z.string().min(1),
98:});
99:
100:export async function updateAvatarUrl(input: unknown) {
101:  const parsed = avatarSchema.safeParse(input);
102:  if (!parsed.success) return { error: "validation" as const };
103:
104:  const supabase = await createSupabaseServer();
105:  const {
106:    data: { user },
107:  } = await supabase.auth.getUser();
108:  if (!user) return { error: "unauthenticated" as const };
109:
110:  const { error } = await supabase
111:    .from("profiles")
112:    .update({ avatar_url: parsed.data.avatar_url })
113:    .eq("id", user.id);
114:
115:  if (error) return { error: "db" as const, message: error.message };
116:  revalidatePath(`/[locale]/app/settings`, "page");
117:  return { ok: true as const };
118:}
119:
120:const workspaceSchema = z.object({
121:  workspaceId: z.string().uuid(),
122:  name: z.string().trim().min(1).max(120),
123:  tax_id: z.string().trim().optional().nullable(),
124:  tax_invoice_email: z.string().email().optional().nullable(),
125:});
126:
127:export async function updateWorkspace(input: unknown) {
128:  const parsed = workspaceSchema.safeParse(input);
129:  if (!parsed.success) return { error: "validation" as const };
130:
131:  const supabase = await createSupabaseServer();
132:  const {
133:    data: { user },
134:  } = await supabase.auth.getUser();
135:  if (!user) return { error: "unauthenticated" as const };
136:
137:  // RLS enforces workspace_admin ??no explicit role check here.
138:  const { error } = await supabase
139:    .from("workspaces")
140:    .update({
141:      name: parsed.data.name,
142:      tax_id: parsed.data.tax_id ?? null,
143:      tax_invoice_email: parsed.data.tax_invoice_email ?? null,
144:    })
145:    .eq("id", parsed.data.workspaceId);
146:
147:  if (error) return { error: "db" as const, message: error.message };
148:  revalidatePath(`/[locale]/app/settings`, "page");
149:  return { ok: true as const };
150:}
151:
152:const inviteSchema = z.object({
153:  workspaceId: z.string().uuid(),
154:  email: z.string().email(),
155:  role: z.enum(["workspace_admin", "workspace_member"]),
156:});
157:
158:export async function inviteMember(formData: FormData) {
159:  const parsed = inviteSchema.safeParse({
160:    workspaceId: formData.get("workspaceId"),
161:    email: formData.get("email"),
162:    role: formData.get("role"),
163:  });
164:  if (!parsed.success) return { error: "validation" as const };
165:  // workspace_invites table absent in database.types ??Phase 1.3 will wire email invites.
166:  return { error: "not_implemented" as const };
167:}
168:
169:export async function removeMember(formData: FormData) {
170:  const workspaceId = formData.get("workspaceId");
171:  const userId = formData.get("userId");
172:  if (typeof workspaceId !== "string" || typeof userId !== "string") {
173:    return { error: "validation" as const };
174:  }
175:
176:  const supabase = await createSupabaseServer();
177:  const {
178:    data: { user },
179:  } = await supabase.auth.getUser();
180:  if (!user) return { error: "unauthenticated" as const };
181:  if (user.id === userId) return { error: "self_remove" as const };
182:
183:  const { error } = await supabase
184:    .from("workspace_members")
185:    .delete()
186:    .eq("workspace_id", workspaceId)
187:    .eq("user_id", userId);
188:
189:  if (error) return { error: "db" as const, message: error.message };
190:  revalidatePath(`/[locale]/app/settings`, "page");
191:  return { ok: true as const };
192:}

2026-05-03T18:04:47.657847Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:

 exited 1 in 489ms:
codex
The server-action review is now at the attachment paths. One noteworthy edge is that `addPdfAttachmentAction` performs the R2 PUT before the RPC authorization gate; I’m checking whether that is a new merge-blocking issue under the requested HIGH/MED scope or a low cleanup item.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/[id]/board-actions.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=760; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/new/actions.ts'; "'$lines=Get-Content -LiteralPath $p; foreach($range in @(@(1,180),@(180,460),@(460,630),@(630,860),@(860,1070))){ for($i=$range[0]; $i -le [Math]::Min($range[1],$lines.Length); $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "GRANT UPDATE|REVOKE UPDATE|GRANT ALL|GRANT INSERT|GRANT DELETE|GRANT SELECT|authenticated" supabase/migrations/*.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/lib/workspace/active.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }; $p='"'src/lib/app/context.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 396ms:
760:
761:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
762:  const { error: rpcErr } = await (supabase as any).rpc(
763:    "remove_project_board_attachment",
764:    {
765:      p_board_id: boardId,
766:      p_kind: "url",
767:      p_attachment_id: attachmentId,
768:    }
769:  );
770:  if (rpcErr) {
771:    console.error("[removeUrlAttachmentAction] RPC error:", rpcErr);
772:    return { ok: false, error: rpcErr.message };
773:  }
774:
775:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
776:  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
777:  return { ok: true };
778:}

2026-05-03T18:04:53.737930Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: supabase/migrations/*.sql: IO error for operation on supabase/migrations/*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 404ms:
rg: supabase/migrations/*.sql: IO error for operation on supabase/migrations/*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 succeeded in 464ms:
1:// Phase 4.x task_06 ??Active workspace resolver.
2://
3:// Decision lock-in (_decisions_locked.md section 2): cookie-based.
4:// The cookie 'yagi_active_workspace' carries a uuid. Every server-side
5:// page render that needs the active workspace must validate the
6:// cookie's uuid against workspace_members for the current user, then
7:// fall back to the first membership if invalid or absent.
8://
9:// Cookie tampering is fully defended:
10://   1. The cookie value is not trusted -- we always re-check
11://      workspace_members membership on the server.
12://   2. If the cookie's uuid is not a valid membership for this user,
13://      we ignore it and use first-member fallback. (We do NOT trust
14://      the cookie even for read-only display.)
15://
16:// Phase 4 caveat: workspaces.kind column is added by task_01 migration
17:// (Wave D D.1 apply). Until apply, the SELECT returns undefined for
18:// kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
19:// existing row to 'brand'). Post-apply, kind is one of 3 enum values.
20:
21:import { cookies } from "next/headers";
22:import { createSupabaseServer } from "@/lib/supabase/server";
23:
24:export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
25:
26:export type ActiveWorkspaceMembership = {
27:  id: string;
28:  name: string;
29:  kind: WorkspaceKind;
30:};
31:
32:export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";
33:
34:const UUID_RE =
35:  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
36:
37:function narrowKind(value: unknown): WorkspaceKind {
38:  if (value === "brand" || value === "artist" || value === "yagi_admin") {
39:    return value;
40:  }
41:  return "brand";
42:}
43:
44:/**
45: * Returns the user's workspace memberships, joined with workspace name + kind.
46: * Used by the workspace switcher dropdown to render full lists. The active
47: * one is found by `id === activeWorkspaceId`.
48: *
49: * Cross-tenant guard: the SELECT joins through workspace_members for the
50: * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
51: * SELECT to members.
52: */
53:export async function listOwnWorkspaces(
54:  userId: string,
55:): Promise<ActiveWorkspaceMembership[]> {
56:  const supabase = await createSupabaseServer();
57:  // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
58:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
59:  const sb = supabase as any;
60:  const { data: rows } = (await sb
61:    .from("workspace_members")
62:    .select(
63:      `
64:      workspace_id,
65:      created_at,
66:      workspace:workspaces ( id, name, kind )
67:    `,
68:    )
69:    .eq("user_id", userId)
70:    .order("created_at", { ascending: true })) as {
71:    data:
72:      | {
73:          workspace_id: string;
74:          workspace: { id: string; name: string; kind?: string } | null;
75:        }[]
76:      | null;
77:  };
78:
79:  const list: ActiveWorkspaceMembership[] = [];
80:  for (const r of rows ?? []) {
81:    if (!r.workspace) continue;
82:    list.push({
83:      id: r.workspace.id,
84:      name: r.workspace.name,
85:      kind: narrowKind(r.workspace.kind),
86:    });
87:  }
88:  return list;
89:}
90:
91:/**
92: * Resolve the user's currently-active workspace. Reads the
93: * 'yagi_active_workspace' cookie, validates membership against
94: * workspace_members, and falls back to the first membership when
95: * the cookie is absent, malformed, or doesn't correspond to a
96: * valid membership for this user.
97: *
98: * Returns null when the user has no workspace memberships at all
99: * (caller should redirect to /onboarding).
100: */
101:export async function resolveActiveWorkspace(
102:  userId: string,
103:): Promise<ActiveWorkspaceMembership | null> {
104:  const memberships = await listOwnWorkspaces(userId);
105:  if (memberships.length === 0) return null;
106:
107:  const cookieStore = await cookies();
108:  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
109:
110:  if (cookieValue && UUID_RE.test(cookieValue)) {
111:    const match = memberships.find((m) => m.id === cookieValue);
112:    if (match) return match;
113:    // Fall through to first-membership fallback. We deliberately do NOT
114:    // attempt to clear the cookie here -- this resolver is read-only
115:    // (cookies() in next/headers is read in server components). The
116:    // setActiveWorkspace server action is the only writer; if a stale
117:    // cookie keeps arriving here, the resolver silently falls back
118:    // without leaking which workspace_id the user does NOT belong to.
119:  }
120:
121:  return memberships[0];
122:}
1:import { createSupabaseServer } from "@/lib/supabase/server";
2:import { resolveActiveWorkspace } from "@/lib/workspace/active";
3:
4:// Phase 1.1 workspace permission system ??unchanged literals, renamed type.
5:// Per ADR-009 (docs/design/DECISIONS.md).
6:export type WorkspaceRole =
7:  | "creator"
8:  | "workspace_admin"
9:  | "workspace_member"
10:  | "yagi_admin";
11:
12:// Phase 2.5 challenge persona system ??distinct namespace.
13:// NEVER compare against a bare "creator" literal without prefixing with
14:// `profile.role ===` ??see ADR-009 naming rule.
15:// Phase 2.7 added "client" for the commission-intake persona (ADR-011).
16:// Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 짠4 of
17:// PRODUCT-MASTER persona model. The Artist intake surface itself is a
18:// Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
19:// the demo account row created in Wave C.5b sub_13/amend_02.
20:export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
21:
22:export type AppContext = {
23:  userId: string;
24:  profile: {
25:    id: string;
26:    /**
27:     * Internal-only DB identifier (Phase 4.x Wave C.5b sub_08).
28:     *
29:     * `profiles.handle` is auto-generated server-side as `c_<8 hex chars>`
30:     * and exposed only to internal code paths (auth callback resolver,
31:     * RLS policies that key off the unique-handle column, future admin
32:     * tools). It MUST NOT appear in any user-facing surface ??sidebar,
33:     * settings, chat, profile pages, exports, or emails. If you find
34:     * yourself reaching for `profile.handle` in a JSX/email template,
35:     * fall back to `display_name` then `id.slice(0, 8)` instead.
36:     */
37:    handle: string;
38:    display_name: string;
39:    email: string | null;
40:    avatar_url: string | null;
41:    locale: "ko" | "en";
42:    role: ProfileRole | null;
43:  };
44:  workspaceRoles: WorkspaceRole[];
45:  workspaces: { id: string; name: string; slug: string }[];
46:  currentWorkspaceId: string | null;
47:};
48:
49:export async function fetchAppContext(): Promise<AppContext | null> {
50:  const supabase = await createSupabaseServer();
51:  const {
52:    data: { user },
53:  } = await supabase.auth.getUser();
54:  if (!user) return null;
55:
56:  const { data: profile } = await supabase
57:    .from("profiles")
58:    .select("id, handle, display_name, avatar_url, locale, role")
59:    .eq("id", user.id)
60:    .maybeSingle();
61:
62:  if (!profile) return null;
63:
64:  const { data: rolesRows } = await supabase
65:    .from("user_roles")
66:    .select("role")
67:    .eq("user_id", user.id);
68:
69:  const workspaceRoles = (rolesRows ?? []).map(
70:    (r) => r.role as WorkspaceRole
71:  );
72:
73:  const { data: memberRows } = await supabase
74:    .from("workspace_members")
75:    .select("workspace_id, workspaces(id, name, slug)")
76:    .eq("user_id", user.id);
77:
78:  const workspaces =
79:    (memberRows ?? [])
80:      .map((row) => row.workspaces)
81:      .filter((ws): ws is { id: string; name: string; slug: string } => !!ws);
82:
83:  // Wave C.5d sub_03e_2 ??Codex K-05 sub_03 LOOP 1 MED-C Finding 2.
84:  // currentWorkspaceId previously took workspaces[0] (oldest membership),
85:  // which silently bypassed the workspace switcher cookie for every
86:  // ctx.currentWorkspaceId consumer (settings/page.tsx, etc.). Source it
87:  // from resolveActiveWorkspace so the cookie's selection is honoured;
88:  // resolver still falls back to the first membership when the cookie is
89:  // absent or stale, so behaviour for fresh signups is unchanged.
90:  const active = await resolveActiveWorkspace(user.id);
91:
92:  return {
93:    userId: user.id,
94:    profile: {
95:      id: profile.id,
96:      handle: profile.handle,
97:      display_name: profile.display_name,
98:      email: user.email ?? null,
99:      avatar_url: profile.avatar_url,
100:      locale: profile.locale as "ko" | "en",
101:      role: (profile.role as ProfileRole | null) ?? null,
102:    },
103:    workspaceRoles,
104:    workspaces,
105:    currentWorkspaceId: active?.id ?? null,
106:  };
107:}

 succeeded in 480ms:
1:"use server";
2:
3:import { z } from "zod";
4:import { revalidatePath } from "next/cache";
5:import { createSupabaseServer } from "@/lib/supabase/server";
6:import { createSupabaseService } from "@/lib/supabase/service";
7:import type { Json } from "@/lib/supabase/database.types";
8:import { fetchVideoMetadata, type OEmbedResult } from "@/lib/oembed";
9:import { extractAssetIndex } from "@/lib/board/asset-index";
10:import { resolveActiveWorkspace } from "@/lib/workspace/active";
11:
12:// -----------------------------------------------------------------------------
13:// Phase 2.8.1 G_B1-B ??Wizard draft mode
14:// -----------------------------------------------------------------------------
15:// The wizard now creates the projects row early (status='draft') so Step 2
16:// can mount BriefBoardEditor against a real project_id and the user can
17:// drop images / paste embeds before "submit". Submit flips the status from
18:// 'draft' to 'submitted' rather than INSERTing a fresh row.
19://
20:// Server actions exposed:
21://   - createProject       : pre-2.8.1 single-shot INSERT path (kept for
22://                           backwards compatibility; wizard no longer calls
23://                           it but tests / direct callers still do)
24://   - ensureDraftProject  : find-or-create the user's wizard draft. Returns
25://                           project + brief bootstrap for the editor.
26://   - submitDraftProject  : UPDATE the existing draft with the latest
27://                           wizard fields and (optionally) flip to 'submitted'.
28:// -----------------------------------------------------------------------------
29:
30:const sharedFields = {
31:  title: z.string().trim().min(1).max(200),
32:  description: z.string().max(4000).optional().nullable(),
33:  brand_id: z.string().uuid().nullable().optional(),
34:  tone: z.string().max(500).optional().nullable(),
35:  // Phase 2.7.2: free-text tag list (was a closed enum). Maps to the
36:  // existing `deliverable_types text[]` Postgres column ??no migration
37:  // needed; the meaning shifts from "format" to "intended use".
38:  deliverable_types: z
39:    .array(z.string().trim().min(1).max(60))
40:    .max(10)
41:    .default([]),
42:  estimated_budget_range: z.string().max(100).optional().nullable(),
43:  target_delivery_at: z
44:    .string()
45:    .regex(/^\d{4}-\d{2}-\d{2}$/)
46:    .nullable()
47:    .optional(),
48:  intent: z.enum(["draft", "submit"]).default("draft"),
49:};
50:
51:// Phase 2.8.1 G_B1-E: proposalSchema + discriminatedUnion deleted ??// proposal_request intake mode is no longer authored. The legacy
52:// `projects.intake_mode` column stays; existing rows still render via
53:// the read-only banner on /app/projects/[id].
54:const createProjectSchema = z.object({
55:  ...sharedFields,
56:  intake_mode: z.literal("brief"),
57:});
58:
59:type ActionResult =
60:  | { ok: true; id: string; status: string }
61:  | {
62:      error: "validation";
63:      issues: z.ZodFormattedError<z.infer<typeof createProjectSchema>>;
64:    }
65:  | { error: "unauthenticated" }
66:  | { error: "no_workspace" }
67:  | { error: "db"; message: string };
68:
69:export async function createProject(input: unknown): Promise<ActionResult> {
70:  const parsed = createProjectSchema.safeParse(input);
71:  if (!parsed.success) {
72:    return { error: "validation", issues: parsed.error.format() };
73:  }
74:
75:  const supabase = await createSupabaseServer();
76:  const {
77:    data: { user },
78:  } = await supabase.auth.getUser();
79:  if (!user) return { error: "unauthenticated" };
80:
81:  // Wave C.5d sub_03c ??replace first-membership fallback with the
82:  // cookie-based active workspace resolver (Codex K-05 final review LOOP 1
83:  // MED-C). createProject is the legacy direct-INSERT path retained for
84:  // backwards compatibility; the wizard goes through ensureDraftProject +
85:  // submitProjectAction. Same misroute risk regardless, same fix.
86:  const active = await resolveActiveWorkspace(user.id);
87:  if (!active) return { error: "no_workspace" };
88:  const membership = { workspace_id: active.id };
89:
90:  const status = parsed.data.intent === "submit" ? "submitted" : "draft";
91:
92:  // Column mapping notes:
93:  // - spec field `description` ??DB column `brief` (no standalone `description` col)
94:  // - spec field `tone` ??NO matching column on `projects`; omitted from insert
95:  // - `estimated_budget_range` matches exactly
96:  const data = parsed.data;
97:
98:  const insertPayload = {
99:    workspace_id: membership.workspace_id,
100:    created_by: user.id,
101:    project_type: "direct_commission" as const,
102:    status,
103:    title: data.title,
104:    brief: data.description ?? null,
105:    brand_id: data.brand_id ?? null,
106:    deliverable_types: data.deliverable_types,
107:    estimated_budget_range: data.estimated_budget_range ?? null,
108:    target_delivery_at: data.target_delivery_at ?? null,
109:    intake_mode: data.intake_mode,
110:  };
111:
112:  const { data: project, error } = await supabase
113:    .from("projects")
114:    .insert(insertPayload)
115:    .select("id")
116:    .single();
117:
118:  if (error || !project) {
119:    console.error("[createProject] Supabase error:", error);
120:    return { error: "db", message: error?.message ?? "insert failed" };
121:  }
122:
123:  // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
124:  // with empty content, so the Brief tab on /app/projects/[id] can mount
125:  // the editor immediately. RLS allows this INSERT because the caller
126:  // is the project's workspace member (just created the project above).
127:  //
128:  // K05-PHASE-2-8-04 fix: brief INSERT failure is now FATAL. If the
129:  // sibling row can't be created we roll back the project to avoid
130:  // leaving an orphan project that the Brief tab cannot edit (saveBrief
131:  // returns not_found when the row is missing ??there is no lazy-create
132:  // path). Atomicity-via-RPC lands in Phase 2.8.1 (FU-2.8-saveversion-rollback
133:  // covers a related two-write atomicity gap).
134:  const { error: briefErr } = await supabase
135:    .from("project_briefs")
136:    .insert({
137:      project_id: project.id,
138:      // status / current_version / tiptap_schema_version use column defaults
139:      // (editing / 0 / 1) ??required by validate_project_brief_change for
140:      // non-yagi_admin INSERT.
141:      updated_by: user.id,
142:    });
143:  if (briefErr) {
144:    console.error(
145:      "[createProject] project_briefs sibling insert failed (rolling back project):",
146:      briefErr
147:    );
148:    // K05-PHASE-2-8-LOOP2-03 fix: rollback DELETE must use the
149:    // service-role client. The user-scoped supabase client honors
150:    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
151:    // a non-yagi workspace_admin's rollback would be silently denied
152:    // and leave an orphan project. Service role bypasses RLS so the
153:    // rollback succeeds for all caller roles. Atomicity-via-RPC is
154:    // still the cleaner long-term fix (FU-2.8-saveversion-rollback).
155:    const service = createSupabaseService();
156:    const { error: rollbackErr } = await service
157:      .from("projects")
158:      .delete()
159:      .eq("id", project.id);
160:    if (rollbackErr) {
161:      console.error("[createProject] rollback DELETE failed:", rollbackErr);
162:    }
163:    return {
164:      error: "db",
165:      message: `brief insert failed: ${briefErr.message}`,
166:    };
167:  }
168:
169:  revalidatePath("/[locale]/app/projects", "page");
170:  return { ok: true, id: project.id, status };
171:}
172:
173:// =============================================================================
174:// Phase 2.8.1 G_B1-B ??wizard draft mode
175:// =============================================================================
176:
177:const wizardDraftFields = z.object({
178:  title: z.string().trim().min(1).max(200),
179:  description: z.string().max(4000).optional().nullable(),
180:  brand_id: z.string().uuid().nullable().optional(),
180:  brand_id: z.string().uuid().nullable().optional(),
181:  tone: z.string().max(500).optional().nullable(),
182:  deliverable_types: z
183:    .array(z.string().trim().min(1).max(60))
184:    .max(10)
185:    .default([]),
186:  estimated_budget_range: z.string().max(100).optional().nullable(),
187:  target_delivery_at: z
188:    .string()
189:    .regex(/^\d{4}-\d{2}-\d{2}$/)
190:    .nullable()
191:    .optional(),
192:});
193:
194:const ensureDraftInput = z.object({
195:  initial: wizardDraftFields,
196:});
197:
198:const submitDraftInput = z.object({
199:  projectId: z.string().uuid(),
200:  fields: wizardDraftFields,
201:  intent: z.enum(["draft", "submit"]),
202:});
203:
204:export type WizardDraftFields = z.infer<typeof wizardDraftFields>;
205:
206:type DraftBootstrap = {
207:  projectId: string;
208:  status: "draft" | "submitted" | string;
209:  brief: {
210:    contentJson: Json;
211:    updatedAt: string;
212:    status: "editing" | "locked";
213:  };
214:};
215:
216:export type EnsureDraftResult =
217:  | { ok: true; data: DraftBootstrap }
218:  | { error: "validation"; issues: z.ZodIssue[] }
219:  | { error: "unauthenticated" }
220:  | { error: "no_workspace" }
221:  | { error: "db"; message: string };
222:
223:export type SubmitDraftResult =
224:  | { ok: true; id: string; status: "draft" | "submitted" }
225:  | { error: "validation"; issues: z.ZodIssue[] }
226:  | { error: "unauthenticated" }
227:  | { error: "not_found" }
228:  | { error: "forbidden" }
229:  | { error: "db"; message: string };
230:
231:const PG_UNIQUE_VIOLATION = "23505";
232:
233:async function fetchDraftBootstrap(
234:  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
235:  projectId: string,
236:): Promise<DraftBootstrap | null> {
237:  const { data: project, error: projectErr } = await supabase
238:    .from("projects")
239:    .select("id, status")
240:    .eq("id", projectId)
241:    .maybeSingle();
242:  if (projectErr || !project) return null;
243:
244:  const { data: brief, error: briefErr } = await supabase
245:    .from("project_briefs")
246:    .select("content_json, updated_at, status")
247:    .eq("project_id", projectId)
248:    .maybeSingle();
249:  if (briefErr || !brief) return null;
250:
251:  return {
252:    projectId: project.id,
253:    status: project.status,
254:    brief: {
255:      contentJson: brief.content_json,
256:      updatedAt: brief.updated_at,
257:      status: brief.status as "editing" | "locked",
258:    },
259:  };
260:}
261:
262:export async function ensureDraftProject(
263:  input: unknown,
264:): Promise<EnsureDraftResult> {
265:  const parsed = ensureDraftInput.safeParse(input);
266:  if (!parsed.success) {
267:    return { error: "validation", issues: parsed.error.issues };
268:  }
269:
270:  const supabase = await createSupabaseServer();
271:  const {
272:    data: { user },
273:  } = await supabase.auth.getUser();
274:  if (!user) return { error: "unauthenticated" };
275:
276:  // Wave C.5d sub_03c ??same MED-C fix: ensureDraftProject must scope to
277:  // the workspace the user has selected in the switcher, not their
278:  // oldest membership.
279:  const active = await resolveActiveWorkspace(user.id);
280:  if (!active) return { error: "no_workspace" };
281:  const membership = { workspace_id: active.id };
282:
283:  // 1. SELECT existing draft (intake_mode='brief'). Phase 2.8.1 migration
284:  //    guarantees at most one row matches per (workspace, user) via the
285:  //    projects_wizard_draft_uniq partial index.
286:  const { data: existing } = await supabase
287:    .from("projects")
288:    .select("id")
289:    .eq("workspace_id", membership.workspace_id)
290:    .eq("created_by", user.id)
291:    .eq("status", "draft")
292:    .eq("intake_mode", "brief")
293:    .order("created_at", { ascending: false })
294:    .limit(1)
295:    .maybeSingle();
296:
297:  if (existing?.id) {
298:    const bootstrap = await fetchDraftBootstrap(supabase, existing.id);
299:    if (bootstrap) return { ok: true, data: bootstrap };
300:    // If brief row is missing for an existing draft project we treat it as
301:    // corrupt ??fall through and create a fresh draft. (DELETE the orphan
302:    // first so the unique index does not block the new INSERT.)
303:    const service = createSupabaseService();
304:    await service.from("projects").delete().eq("id", existing.id);
305:  }
306:
307:  // 2. INSERT new draft. The unique index makes concurrent INSERTs from a
308:  //    double-mounted wizard converge ??one wins, the other catches 23505
309:  //    and re-SELECTs.
310:  const fields = parsed.data.initial;
311:  const insertPayload = {
312:    workspace_id: membership.workspace_id,
313:    created_by: user.id,
314:    project_type: "direct_commission" as const,
315:    status: "draft" as const,
316:    intake_mode: "brief" as const,
317:    title: fields.title,
318:    brief: fields.description ?? null,
319:    brand_id: fields.brand_id ?? null,
320:    deliverable_types: fields.deliverable_types,
321:    estimated_budget_range: fields.estimated_budget_range ?? null,
322:    target_delivery_at: fields.target_delivery_at ?? null,
323:  };
324:
325:  const { data: project, error } = await supabase
326:    .from("projects")
327:    .insert(insertPayload)
328:    .select("id, status")
329:    .single();
330:
331:  if (error || !project) {
332:    if (error?.code === PG_UNIQUE_VIOLATION) {
333:      // A concurrent ensureDraftProject won the race. Re-SELECT and return
334:      // the surviving row.
335:      const { data: winner } = await supabase
336:        .from("projects")
337:        .select("id")
338:        .eq("workspace_id", membership.workspace_id)
339:        .eq("created_by", user.id)
340:        .eq("status", "draft")
341:        .eq("intake_mode", "brief")
342:        .limit(1)
343:        .maybeSingle();
344:      if (winner?.id) {
345:        const bootstrap = await fetchDraftBootstrap(supabase, winner.id);
346:        if (bootstrap) return { ok: true, data: bootstrap };
347:      }
348:    }
349:    console.error("[ensureDraftProject] insert error:", error);
350:    return { error: "db", message: error?.message ?? "insert failed" };
351:  }
352:
353:  // 3. Sibling project_briefs row. Same atomic-rollback pattern as
354:  //    createProject ??if the sibling INSERT fails we roll back via service
355:  //    role so the wizard can retry without an orphan blocking the unique
356:  //    index.
357:  const { error: briefErr } = await supabase
358:    .from("project_briefs")
359:    .insert({
360:      project_id: project.id,
361:      updated_by: user.id,
362:    });
363:  if (briefErr) {
364:    console.error(
365:      "[ensureDraftProject] brief insert failed (rolling back project):",
366:      briefErr,
367:    );
368:    const service = createSupabaseService();
369:    await service.from("projects").delete().eq("id", project.id);
370:    return {
371:      error: "db",
372:      message: `brief insert failed: ${briefErr.message}`,
373:    };
374:  }
375:
376:  const bootstrap = await fetchDraftBootstrap(supabase, project.id);
377:  if (!bootstrap) {
378:    return { error: "db", message: "bootstrap fetch after insert failed" };
379:  }
380:
381:  revalidatePath("/[locale]/app/projects", "page");
382:  return { ok: true, data: bootstrap };
383:}
384:
385:export async function submitDraftProject(
386:  input: unknown,
387:): Promise<SubmitDraftResult> {
388:  const parsed = submitDraftInput.safeParse(input);
389:  if (!parsed.success) {
390:    return { error: "validation", issues: parsed.error.issues };
391:  }
392:  const { projectId, fields, intent } = parsed.data;
393:
394:  const supabase = await createSupabaseServer();
395:  const {
396:    data: { user },
397:  } = await supabase.auth.getUser();
398:  if (!user) return { error: "unauthenticated" };
399:
400:  // Confirm draft exists and is owned by caller. RLS already filters but
401:  // an explicit check lets us return `forbidden` distinct from `not_found`.
402:  const { data: target } = await supabase
403:    .from("projects")
404:    .select("id, status, created_by")
405:    .eq("id", projectId)
406:    .maybeSingle();
407:  if (!target) return { error: "not_found" };
408:  if (target.created_by !== user.id) return { error: "forbidden" };
409:
410:  // Codex K-05 finding 2 (HIGH-B) ??restrict to status='draft'. Without
411:  // this guard the wizard's submit path becomes a backdoor that demotes
412:  // any project owned by the caller (submitted / in_production /
413:  // delivered etc.) back to 'draft' or stomps on its fields, bypassing
414:  // the transition matrix in projects/[id]/actions.ts.
415:  if (target.status !== "draft") return { error: "forbidden" };
416:
417:  const status = intent === "submit" ? "submitted" : "draft";
418:
419:  const { data: updated, error } = await supabase
420:    .from("projects")
421:    .update({
422:      title: fields.title,
423:      brief: fields.description ?? null,
424:      brand_id: fields.brand_id ?? null,
425:      deliverable_types: fields.deliverable_types,
426:      estimated_budget_range: fields.estimated_budget_range ?? null,
427:      target_delivery_at: fields.target_delivery_at ?? null,
428:      status,
429:    })
430:    .eq("id", projectId)
431:    .eq("created_by", user.id)
432:    .eq("status", "draft")
433:    .select("id, status")
434:    .single();
435:
436:  if (error || !updated) {
437:    console.error("[submitDraftProject] update error:", error);
438:    return { error: "db", message: error?.message ?? "update failed" };
439:  }
440:
441:  revalidatePath("/[locale]/app/projects", "page");
442:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
443:  return {
444:    ok: true,
445:    id: updated.id,
446:    status: updated.status as "draft" | "submitted",
447:  };
448:}
449:
450:// =============================================================================
451:// Phase 3.0 hotfix-2 ??getWizardAssetPutUrlAction
452:// =============================================================================
453:// Server action that generates a presigned R2 PUT URL + the public URL for a
454:// wizard reference asset. Moved server-side because createBriefAssetPutUrl
455:// uses S3Client with process.env credentials ??it cannot run in the browser.
456:// Previously reference-board.tsx (a "use client" component) called these
457:// r2/client functions directly, causing silent failures on every upload attempt.
458:// Root cause: H2 ??r2/client imports are server-only; client components must
459:// call server actions instead.
460:// =============================================================================
460:// =============================================================================
461:
462:import {
463:  createBriefAssetPutUrl,
464:  briefObjectPublicUrl,
465:} from "@/lib/r2/client";
466:
467:// Phase 3.1 K-05 LOOP 1 HIGH-A F7 fix:
468:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
469:// client, which let any authenticated caller overwrite known/guessable R2
470:// objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
471:// storage key server-side using a UUID and validates content type against a
472:// strict allow-list. The legacy action is kept for backward-compat but now
473:// applies the same allow-list and a more restrictive prefix policy.
474:
475:const ALLOWED_CONTENT_TYPES = new Set([
476:  "image/jpeg",
477:  "image/png",
478:  "image/webp",
479:  "image/gif",
480:  "image/svg+xml",
481:  "image/avif",
482:  "application/pdf",
483:]);
484:
485:const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
486:  "image/jpeg": "jpg",
487:  "image/png": "png",
488:  "image/webp": "webp",
489:  "image/gif": "gif",
490:  "image/svg+xml": "svg",
491:  "image/avif": "avif",
492:  "application/pdf": "pdf",
493:};
494:
495:// Phase 3.0/legacy schema ??accepts a client-supplied key but now restricts
496:// the prefix to a known-safe namespace. Existing callers should migrate to
497:// getBoardAssetPutUrlAction below.
498:const wizardAssetPutUrlSchema = z.object({
499:  storageKey: z
500:    .string()
501:    .min(1)
502:    .max(500)
503:    // Restrict to known prefixes to prevent overwriting unrelated R2 objects.
504:    // Must start with a recognized board/wizard asset prefix.
505:    .refine(
506:      (k) =>
507:        k.startsWith("board-assets/") ||
508:        k.startsWith("wizard-references/") ||
509:        k.startsWith("project-briefs/"),
510:      { message: "storageKey prefix not allowed" }
511:    )
512:    // No traversal / parent-dir / null bytes
513:    .refine(
514:      (k) => !k.includes("..") && !k.includes("\0") && !k.includes("//"),
515:      { message: "storageKey contains forbidden characters" }
516:    ),
517:  contentType: z.string().min(1).max(200),
518:});
519:
520:export type WizardAssetPutUrlResult =
521:  | { ok: true; putUrl: string; publicUrl: string }
522:  | { ok: false; error: string };
523:
524:export async function getWizardAssetPutUrlAction(
525:  storageKey: unknown,
526:  contentType: unknown
527:): Promise<WizardAssetPutUrlResult> {
528:  const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
529:  if (!parsed.success) {
530:    return { ok: false, error: "invalid_input" };
531:  }
532:
533:  // Strict content-type allow-list (HIGH-A F7)
534:  if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
535:    return { ok: false, error: "content_type_not_allowed" };
536:  }
537:
538:  const supabase = await createSupabaseServer();
539:  const {
540:    data: { user },
541:  } = await supabase.auth.getUser();
542:  if (!user) return { ok: false, error: "unauthenticated" };
543:
544:  // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
545:  // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
546:  // project-briefs/) was insufficient because keys within those namespaces
547:  // could overwrite OTHER users' assets. Now require keys to start with
548:  // <prefix>/<user.id>/ so a caller can only write under their own subspace.
549:  const allowedPrefixes = [
550:    `board-assets/${user.id}/`,
551:    `wizard-references/${user.id}/`,
552:    `project-briefs/${user.id}/`,
553:  ];
554:  if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
555:    return { ok: false, error: "storage_key_not_owned" };
556:  }
557:
558:  try {
559:    const putUrl = await createBriefAssetPutUrl(
560:      parsed.data.storageKey,
561:      parsed.data.contentType,
562:      600
563:    );
564:    // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
565:    // targets BRIEF_BUCKET (where the PUT lands), not BUCKET (the challenges
566:    // submissions bucket).
567:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
568:    return { ok: true, putUrl, publicUrl: pubUrl };
569:  } catch (err) {
570:    console.error("[getWizardAssetPutUrlAction] presign failed:", err);
571:    return { ok: false, error: "presign_failed" };
572:  }
573:}
574:
575:// Phase 3.1 ??server-generated key + strict content-type validation.
576:// Use this for board asset uploads going forward. Legacy
577:// getWizardAssetPutUrlAction is preserved for back-compat with already-
578:// shipped client code paths.
579:const boardAssetPutUrlSchema = z.object({
580:  contentType: z.string().min(1).max(200),
581:});
582:
583:export async function getBoardAssetPutUrlAction(
584:  contentType: unknown
585:): Promise<WizardAssetPutUrlResult> {
586:  const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
587:  if (!parsed.success) return { ok: false, error: "invalid_input" };
588:
589:  if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
590:    return { ok: false, error: "content_type_not_allowed" };
591:  }
592:
593:  const supabase = await createSupabaseServer();
594:  const {
595:    data: { user },
596:  } = await supabase.auth.getUser();
597:  if (!user) return { ok: false, error: "unauthenticated" };
598:
599:  // Server-generated key: UUID + safe extension. NO client filename trust.
600:  const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
601:  const uuid = crypto.randomUUID();
602:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
603:
604:  try {
605:    const putUrl = await createBriefAssetPutUrl(
606:      storageKey,
607:      parsed.data.contentType,
608:      600
609:    );
610:    // K-05 LOOP 1 HIGH-B F7: BRIEF_BUCKET-targeted public URL.
611:    const pubUrl = briefObjectPublicUrl(storageKey);
612:    return { ok: true, putUrl, publicUrl: pubUrl };
613:  } catch (err) {
614:    console.error("[getBoardAssetPutUrlAction] presign failed:", err);
615:    return { ok: false, error: "presign_failed" };
616:  }
617:}
618:
619:// =============================================================================
620:// Phase 3.0 task_03 ??fetchVideoMetadataAction
621:// =============================================================================
622:// Server action wrapper around the oEmbed lib. Validates the URL with Zod,
623:// calls fetchVideoMetadata, and returns the result (or null on any error).
624:// The "use server" directive at the top of this file covers this action.
625:// =============================================================================
626:
627:const videoUrlSchema = z.string().url().max(2000);
628:
629:export type VideoMetadataResult = OEmbedResult | null;
630:
630:
631:export async function fetchVideoMetadataAction(
632:  url: unknown,
633:): Promise<VideoMetadataResult> {
634:  const parsed = videoUrlSchema.safeParse(url);
635:  if (!parsed.success) return null;
636:  return fetchVideoMetadata(parsed.data);
637:}
638:
639:// =============================================================================
640:// Phase 3.0 task_04 ??submitProjectAction (Phase 3.1 task_04 update)
641:// =============================================================================
642:// Atomically submits the wizard's draft as a new project with status='in_review'
643:// (the L-015 auto-transition shortcut ??never writes 'submitted' to projects).
644://
645:// Sequence (Phase 3.1):
646://   1. INSERT projects with status='in_review' (user-scoped client; RLS
647://      INSERT policy allows it since we own the workspace)
648://   2. INSERT project_status_history with actor_role='system' ??MUST bypass
649://      RLS which denies INSERT on this table for all authenticated callers.
650://      Resolution: Option A ??service-role client scoped to this single INSERT.
651://      Service-role usage is strictly scoped; other reads/writes stay on user
652://      client.
653://   3. RPC seed_project_board_from_wizard(project_id, board_document) ??//      Phase 3.1 replaces the project_references INSERT path.
654://      The RPC is SECURITY DEFINER + asserts project.status='in_review'.
655://   4. DELETE wizard_drafts row (user-scoped client)
656://   5. Send Resend admin + client emails (best-effort, not blocking)
657://   6. Emit in-app notification to the submitting user (best-effort, not
658://      blocking)
659://
660:// Returns { ok: true, projectId, redirect } on success.
661:// =============================================================================
662:
663:import { sendProjectSubmittedAdmin, sendProjectSubmittedClient } from "@/lib/email/project";
664:import { emitNotification } from "@/lib/notifications/emit";
665:
666:// =============================================================================
667:// Phase 3.1 ??server-side tldraw store validator (anti-DoS + structural sanity)
668:// =============================================================================
669:// K-05 trust boundary: the wizard's boardDocument is client-controlled JSON.
670:// Server enforces a max serialized size (5MB) AND a minimum structural shape
671:// (must be either {} or contain a "store" object). Detailed validation of
672:// every shape's props is impractical for tldraw store snapshots; we trust the
673:// schema migration version + tldraw's runtime to reject malformed shapes on
674:// load. Server prevents oversized/wrong-shape payloads only.
675:function validateTldrawStore(doc: Record<string, unknown>): boolean {
676:  if (!doc || typeof doc !== "object") return false;
677:  if (Object.keys(doc).length === 0) return true; // empty board OK
678:  if (!("store" in doc)) return false;
679:  const store = (doc as { store: unknown }).store;
680:  if (typeof store !== "object" || store === null) return false;
681:  return true;
682:}
683:
684:// Phase 3.1 hotfix-3: attachment sub-schemas (L-026 ??must stay in sync with
685:// client-side wizard state types and task_02 PdfAttachment/UrlAttachment types).
686:// Wave C.5d sub_03f_5 F1: extend storage_key prefix allowlist to include
687:// `board-assets/` so wizard PDFs uploaded via getBoardAssetPutUrlAction (which
688:// generates `board-assets/<user>/<uuid>.pdf` server-side) pass the SubmitInputSchema
689:// gate. The companion seed RPC (sub_03f_5 F3) enforces caller-bound prefix on
690:// `board-assets/` keys, so this client-trust schema is intentionally permissive.
691:const PdfAttachmentSchema = z.object({
692:  id: z.string().uuid(),
693:  storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//),
694:  filename: z.string().min(1).max(200),
695:  size_bytes: z.number().int().positive().max(20 * 1024 * 1024),
696:  uploaded_at: z.string(),
697:  uploaded_by: z.string(),
698:});
699:
700:const UrlAttachmentSchema = z.object({
701:  id: z.string().uuid(),
702:  url: z.string()
703:    .min(1)
704:    .max(2000)
705:    .refine(
706:      (u) => {
707:        try {
708:          const p = new URL(u);
709:          return p.protocol === "http:" || p.protocol === "https:";
710:        } catch {
711:          return false;
712:        }
713:      },
714:      { message: "URL must be http:// or https://" }
715:    ),
716:  title: z.string().max(200).nullable(),
717:  thumbnail_url: z.string().max(2000).nullable(),
718:  provider: z.enum(["youtube", "vimeo", "generic"]),
719:  note: z.string().max(500).nullable(),
720:  added_at: z.string(),
721:  added_by: z.string(),
722:});
723:
724:const SubmitInputSchema = z.object({
725:  name: z.string().min(1).max(80),
726:  // hotfix-2: max reduced to 500 to match client wizardSchema (L-026 ??keep in sync)
727:  description: z.string().min(1).max(500),
728:  deliverable_types: z.array(z.string()).min(1),
729:  budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
730:  delivery_date: z.string().nullable().optional(),
731:  // Phase 3.1 hotfix-3 addendum (yagi smoke v1 FAIL-5): optional 誘명똿 ?щ쭩 ?쇱옄.
732:  // Client emits ISO 8601 with Z (converted from <input type="datetime-local">
733:  // via new Date(local).toISOString()). Server accepts ISO datetime; null/undefined
734:  // both treated as "not specified". Past datetimes are NOT rejected server-side
735:  // (UI blocks via min attr; server keeps client-trust minimal ??client may set
736:  // any future datetime; explicit decision logged in _run.log).
737:  meeting_preferred_at: z.string().datetime().nullable().optional(),
738:  // Phase 3.1: replaces references[] with a tldraw store snapshot.
739:  // Server-side validation: 5MB serialized cap (anti-DoS) + structural sanity.
740:  boardDocument: z
741:    .record(z.string(), z.unknown())
742:    .refine(
743:      (doc) => {
744:        try {
745:          const serialized = JSON.stringify(doc);
746:          return serialized.length <= 5 * 1024 * 1024;
747:        } catch {
748:          return false;
749:        }
750:      },
751:      { message: "boardDocument exceeds 5MB or is not serializable" }
752:    )
753:    .refine(validateTldrawStore, {
754:      message: "boardDocument is not a valid tldraw store snapshot",
755:    })
756:    .default({}),
757:  // Phase 3.1 hotfix-3: structured attachment columns (Q-AA)
758:  // Server validates shape/size/scheme (L-026 ??synced with client wizard state)
759:  attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().default([]),
760:  attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().default([]),
761:  // Phase 4.x task_03 ??Digital Twin intent. Defense-in-depth: client-supplied
762:  // value, validated here and again by the projects.twin_intent CHECK constraint
763:  // added in task_01 migration. Default 'undecided' matches the column default.
764:  twin_intent: z
765:    .enum(["undecided", "specific_in_mind", "no_twin"])
766:    .optional()
767:    .default("undecided"),
768:  // workspaceId is optional when draftProjectId is provided ??the action
769:  // resolves it from the draft project row in that case. One of the two
770:  // must be present for workspace resolution to succeed.
771:  workspaceId: z.string().uuid().optional(),
772:  // draftProjectId: the wizard's autosave-created draft project. When
773:  // present, workspace is resolved from it. The draft row is deleted after
774:  // the real project INSERT succeeds.
775:  draftProjectId: z.string().uuid().nullable().optional(),
776:});
777:
778:export type SubmitProjectInput = z.infer<typeof SubmitInputSchema>;
779:
780:export type SubmitProjectResult =
781:  | { ok: true; projectId: string; redirect: string }
782:  | { ok: false; error: "unauthenticated" | "validation" | "db"; message?: string };
783:
784:export async function submitProjectAction(
785:  input: unknown
786:): Promise<SubmitProjectResult> {
787:  // Parse + validate input
788:  const parsed = SubmitInputSchema.safeParse(input);
789:  if (!parsed.success) {
790:    return { ok: false, error: "validation", message: parsed.error.message };
791:  }
792:  const data = parsed.data;
793:
794:  // Auth check
795:  const supabase = await createSupabaseServer();
796:  const {
797:    data: { user },
798:    error: authError,
799:  } = await supabase.auth.getUser();
800:  if (authError || !user) return { ok: false, error: "unauthenticated" };
801:
802:  // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
803:  // MED-C fix): the prior `created_at asc + limit 1` first-membership
804:  // fallback could misroute a project to the user's oldest workspace
805:  // instead of the workspace they had selected in the switcher. Replace
806:  // with three explicit paths, all gated on a single membership lookup so
807:  // every accepted workspace_id is one the caller actually belongs to:
808:  //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
809:  //   B. draft project row's workspace_id  (autosave path)
810:  //   C. resolveActiveWorkspace cookie-based resolver  (final fallback)
811:  // RLS already gates projects.INSERT to workspace members; this is
812:  // defense-in-depth that returns a clean error path and prevents silent
813:  // misrouting through the old fallback.
814:  const { data: memRows } = await supabase
815:    .from("workspace_members")
816:    .select("workspace_id")
817:    .eq("user_id", user.id);
818:  const memberSet = new Set((memRows ?? []).map((r) => r.workspace_id));
819:
820:  let resolvedWorkspaceId: string | null = null;
821:
822:  if (data.workspaceId && memberSet.has(data.workspaceId)) {
823:    resolvedWorkspaceId = data.workspaceId;
824:  }
825:
826:  if (!resolvedWorkspaceId && data.draftProjectId) {
827:    const { data: draftRow } = await supabase
828:      .from("projects")
829:      .select("workspace_id")
830:      .eq("id", data.draftProjectId)
831:      .maybeSingle();
832:    if (draftRow?.workspace_id && memberSet.has(draftRow.workspace_id)) {
833:      resolvedWorkspaceId = draftRow.workspace_id;
834:    }
835:  }
836:
837:  if (!resolvedWorkspaceId) {
838:    const active = await resolveActiveWorkspace(user.id);
839:    if (active) resolvedWorkspaceId = active.id;
840:  }
841:
842:  if (!resolvedWorkspaceId) {
843:    return { ok: false, error: "db", message: "workspace not found for user" };
844:  }
845:
846:  // Phase 3.0 columns (budget_band, submitted_at, kind) are not in the
847:  // generated database.types.ts yet ??use any cast for this INSERT only.
848:  // Same pattern as task_05 used in page.tsx.
849:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
850:  const supabaseAny = supabase as any;
851:
852:  // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
853:  //    is allowed by projects_insert RLS policy for authenticated callers who
854:  //    are workspace members. Direct UPDATE to status is forbidden by trigger
855:  //    guard but INSERT with the target status is the allowed L-015 path.)
856:  const { data: project, error: projErr } = await supabaseAny
857:    .from("projects")
858:    .insert({
859:      // 'name' column does not exist on projects ??map to 'title' (existing column)
860:      title: data.name,
860:      title: data.name,
861:      // 'description' maps to 'brief' on the projects table
862:      brief: data.description,
863:      deliverable_types: data.deliverable_types,
864:      budget_band: data.budget_band,
865:      // delivery_date maps to target_delivery_at
866:      target_delivery_at: data.delivery_date ?? null,
867:      // Phase 3.1 hotfix-3 addendum: 誘명똿 ?щ쭩 ?쇱옄 (optional)
868:      meeting_preferred_at: data.meeting_preferred_at ?? null,
869:      // Phase 4.x task_03: Digital Twin intent (3-radio, default 'undecided').
870:      // Persistence requires task_01 migration applied (Wave D D.1) ??until
871:      // then prod DB has no twin_intent column and this field is ignored.
872:      twin_intent: data.twin_intent,
873:      workspace_id: resolvedWorkspaceId,
874:      created_by: user.id,
875:      status: "in_review",
876:      submitted_at: new Date().toISOString(),
877:      kind: "direct",
878:      // project_type stays as 'direct_commission' for backward compat
879:      project_type: "direct_commission",
880:      intake_mode: "brief",
881:    })
882:    .select("id")
883:    .single() as { data: { id: string } | null; error: { message: string } | null };
884:
885:  if (projErr || !project) {
886:    console.error("[submitProjectAction] projects INSERT error:", projErr);
887:    return {
888:      ok: false,
889:      error: "db",
890:      message: projErr?.message ?? "project insert failed",
891:    };
892:  }
893:
894:  // 2. INSERT project_status_history with actor_role='system'.
895:  //    Option A: service-role client for this single statement only (bypasses
896:  //    the psh_insert_deny RLS policy which blocks all authenticated users).
897:  //    The service-role client is NOT used for any other read/write in this action.
898:  //    project_status_history is a Phase 3.0 table ??not in generated types yet.
899:  const service = createSupabaseService();
900:  // eslint-disable-next-line @typescript-eslint/no-explicit-any
901:  const serviceAny = service as any;
902:  const { error: histErr } = await serviceAny
903:    .from("project_status_history")
904:    .insert({
905:      project_id: project.id,
906:      from_status: "submitted",   // logical from-state (L-015: submitted?뭝n_review)
907:      to_status: "in_review",
908:      actor_id: user.id,
909:      actor_role: "system",
910:      comment: null,
911:    }) as { error: { message: string } | null };
912:
913:  if (histErr) {
914:    console.error("[submitProjectAction] history INSERT error:", histErr);
915:    // History failure is non-fatal in prod but should alert ??do not roll back
916:    // the project, log and continue. K-05 review can decide if we want to roll
917:    // back on history failure.
918:    console.error("[submitProjectAction] WARN: history row missing for project", project.id);
919:  }
920:
921:  // 3. Phase 3.1 ??Seed the project_boards row via RPC.
922:  //    Replaces the old project_references[] INSERT path. The RPC is
923:  //    SECURITY DEFINER + asserts caller owns the project (K-05 LOOP 1 F1 fix)
924:  //    AND project.status='in_review'. ON CONFLICT (project_id) DO UPDATE so
925:  //    re-submits are idempotent.
926:  //    K-05 HIGH-B F5 fix: server-recompute asset_index from the board document
927:  //    so admin queue/detail counts are accurate immediately after submit
928:  //    (K-05 trust boundary ??never trust client-supplied asset_index).
929:  const seedDocument = data.boardDocument ?? {};
930:  const seedAttachedPdfs = data.attachedPdfs ?? [];
931:  const seedAttachedUrls = data.attachedUrls ?? [];
932:  // Phase 3.1 hotfix-3: compute unified asset_index from all three sources
933:  // (canvas shapes + attached PDFs + attached URLs). Trust boundary: server
934:  // always recomputes ??never accepts client-supplied asset_index (L-041).
935:  const seedAssetIndex = extractAssetIndex(
936:    seedDocument as Record<string, unknown>,
937:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
938:    seedAttachedPdfs as any,
939:    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
940:    seedAttachedUrls as any,
941:  );
942:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
943:  const { error: seedErr } = await (supabase as any).rpc(
944:    "seed_project_board_from_wizard",
945:    {
946:      p_project_id: project.id,
947:      p_initial_document: seedDocument,
948:      p_initial_attached_pdfs: seedAttachedPdfs,
949:      p_initial_attached_urls: seedAttachedUrls,
950:      p_initial_asset_index: seedAssetIndex,
951:    }
952:  );
953:  if (seedErr) {
954:    console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
955:    // Non-fatal ??the project exists; admin can manually init via init_project_board.
956:    // K-05 reviewer can decide if hard rollback is needed; default = continue.
957:  }
958:
959:  // 4. Delete wizard_drafts row. wizard_drafts may not be a real table ??silently
960:  //    ignore errors (it's only a cleanup step). If the table doesn't exist the
961:  //    error is swallowed. Use any cast since it may not be in generated types.
962:  try {
963:    // eslint-disable-next-line @typescript-eslint/no-explicit-any
964:    await (supabase as any).from("wizard_drafts").delete().eq("user_id", user.id);
965:  } catch {
966:    // best-effort ??ignore
967:  }
968:  // Also clean up any lingering draft project rows in status='draft' for this
969:  // user in this workspace, since the real project is now submitted.
970:  await supabase
971:    .from("projects")
972:    .delete()
973:    .eq("workspace_id", resolvedWorkspaceId)
974:    .eq("created_by", user.id)
975:    .eq("status", "draft")
976:    .eq("intake_mode", "brief")
977:    .neq("id", project.id);
978:
979:  // 5. Resend emails (best-effort ??must not block or throw)
980:  const baseUrl =
981:    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
982:  const adminQueueUrl = `${baseUrl}/app/admin/projects`;
983:  const projectUrl = `${baseUrl}/app/projects/${project.id}`;
984:
985:  // Resolve caller's locale and email for the client confirmation
986:  let clientEmail: string | null = null;
987:  let clientLocale: "ko" | "en" = "ko";
988:  let clientName = "Client";
989:  let workspaceName = "Workspace";
990:  try {
991:    const [emailRes, profileRes, workspaceRes] = await Promise.all([
992:      service.auth.admin.getUserById(user.id),
993:      // Phase 4.x Wave C.5b sub_08 ??drop handle from select; client name
994:      // falls back to display_name and then literal "Client", never to the
995:      // internal c_<random> handle.
996:      service.from("profiles").select("display_name, locale").eq("id", user.id).maybeSingle(),
997:      service.from("workspaces").select("name").eq("id", resolvedWorkspaceId).maybeSingle(),
998:    ]);
999:    clientEmail = emailRes.data?.user?.email ?? null;
1000:    const profile = profileRes.data;
1001:    if (profile?.locale === "en") clientLocale = "en";
1002:    clientName = profile?.display_name ?? "Client";
1003:    workspaceName = workspaceRes.data?.name ?? "Workspace";
1004:  } catch (e) {
1005:    console.error("[submitProjectAction] profile/email lookup failed", e);
1006:  }
1007:
1008:  // Admin notification
1009:  const adminEmail = process.env.YAGI_ADMIN_EMAIL ?? "yagi@yagiworkshop.xyz";
1010:  try {
1011:    await sendProjectSubmittedAdmin({
1012:      to: adminEmail,
1013:      projectName: data.name,
1014:      projectId: project.id,
1015:      locale: clientLocale,
1016:      dashboardUrl: adminQueueUrl,
1017:      clientName,
1018:      workspaceName,
1019:      budgetBand: data.budget_band,
1020:      deliveryDate: data.delivery_date ?? undefined,
1021:    });
1022:  } catch (e) {
1023:    console.error("[submitProjectAction] admin email send failed", e);
1024:  }
1025:
1026:  // Client confirmation
1027:  if (clientEmail) {
1028:    try {
1029:      await sendProjectSubmittedClient({
1030:        to: clientEmail,
1031:        projectName: data.name,
1032:        projectId: project.id,
1033:        locale: clientLocale,
1034:        dashboardUrl: projectUrl,
1035:      });
1036:    } catch (e) {
1037:      console.error("[submitProjectAction] client email send failed", e);
1038:    }
1039:  }
1040:
1041:  // 6. In-app notification (best-effort)
1042:  try {
1043:    await emitNotification({
1044:      user_id: user.id,
1045:      kind: "project_submitted",
1046:      project_id: project.id,
1047:      workspace_id: resolvedWorkspaceId,
1048:      payload: { project_name: data.name },
1049:      url_path: `/app/projects/${project.id}`,
1050:    });
1051:  } catch (e) {
1052:    console.error("[submitProjectAction] in-app notification failed", e);
1053:  }
1054:
1055:  revalidatePath("/[locale]/app/projects", "page");
1056:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
1057:
1058:  return {
1059:    ok: true,
1060:    projectId: project.id,
1061:    redirect: `/app/projects/${project.id}`,
1062:  };
1063:}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/projects/new/actions.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=460; $i -le 630; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"GRANT UPDATE|REVOKE UPDATE|GRANT ALL|GRANT INSERT|GRANT DELETE|GRANT SELECT|TO authenticated|FROM authenticated\" (rg --files supabase/migrations | rg \"\\.sql"'$")' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260429113853_phase_3_1_project_board.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql'; "'$lines=Get-Content -LiteralPath $p; foreach($range in @(@(1,90),@(91,173),@(174,240),@(241,304),@(305,410))){ for($i=$range[0]; $i -le [Math]::Min($range[1],$lines.Length); $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 406ms:
460:// =============================================================================
461:
462:import {
463:  createBriefAssetPutUrl,
464:  briefObjectPublicUrl,
465:} from "@/lib/r2/client";
466:
467:// Phase 3.1 K-05 LOOP 1 HIGH-A F7 fix:
468:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
469:// client, which let any authenticated caller overwrite known/guessable R2
470:// objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
471:// storage key server-side using a UUID and validates content type against a
472:// strict allow-list. The legacy action is kept for backward-compat but now
473:// applies the same allow-list and a more restrictive prefix policy.
474:
475:const ALLOWED_CONTENT_TYPES = new Set([
476:  "image/jpeg",
477:  "image/png",
478:  "image/webp",
479:  "image/gif",
480:  "image/svg+xml",
481:  "image/avif",
482:  "application/pdf",
483:]);
484:
485:const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
486:  "image/jpeg": "jpg",
487:  "image/png": "png",
488:  "image/webp": "webp",
489:  "image/gif": "gif",
490:  "image/svg+xml": "svg",
491:  "image/avif": "avif",
492:  "application/pdf": "pdf",
493:};
494:
495:// Phase 3.0/legacy schema ??accepts a client-supplied key but now restricts
496:// the prefix to a known-safe namespace. Existing callers should migrate to
497:// getBoardAssetPutUrlAction below.
498:const wizardAssetPutUrlSchema = z.object({
499:  storageKey: z
500:    .string()
501:    .min(1)
502:    .max(500)
503:    // Restrict to known prefixes to prevent overwriting unrelated R2 objects.
504:    // Must start with a recognized board/wizard asset prefix.
505:    .refine(
506:      (k) =>
507:        k.startsWith("board-assets/") ||
508:        k.startsWith("wizard-references/") ||
509:        k.startsWith("project-briefs/"),
510:      { message: "storageKey prefix not allowed" }
511:    )
512:    // No traversal / parent-dir / null bytes
513:    .refine(
514:      (k) => !k.includes("..") && !k.includes("\0") && !k.includes("//"),
515:      { message: "storageKey contains forbidden characters" }
516:    ),
517:  contentType: z.string().min(1).max(200),
518:});
519:
520:export type WizardAssetPutUrlResult =
521:  | { ok: true; putUrl: string; publicUrl: string }
522:  | { ok: false; error: string };
523:
524:export async function getWizardAssetPutUrlAction(
525:  storageKey: unknown,
526:  contentType: unknown
527:): Promise<WizardAssetPutUrlResult> {
528:  const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
529:  if (!parsed.success) {
530:    return { ok: false, error: "invalid_input" };
531:  }
532:
533:  // Strict content-type allow-list (HIGH-A F7)
534:  if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
535:    return { ok: false, error: "content_type_not_allowed" };
536:  }
537:
538:  const supabase = await createSupabaseServer();
539:  const {
540:    data: { user },
541:  } = await supabase.auth.getUser();
542:  if (!user) return { ok: false, error: "unauthenticated" };
543:
544:  // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
545:  // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
546:  // project-briefs/) was insufficient because keys within those namespaces
547:  // could overwrite OTHER users' assets. Now require keys to start with
548:  // <prefix>/<user.id>/ so a caller can only write under their own subspace.
549:  const allowedPrefixes = [
550:    `board-assets/${user.id}/`,
551:    `wizard-references/${user.id}/`,
552:    `project-briefs/${user.id}/`,
553:  ];
554:  if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
555:    return { ok: false, error: "storage_key_not_owned" };
556:  }
557:
558:  try {
559:    const putUrl = await createBriefAssetPutUrl(
560:      parsed.data.storageKey,
561:      parsed.data.contentType,
562:      600
563:    );
564:    // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
565:    // targets BRIEF_BUCKET (where the PUT lands), not BUCKET (the challenges
566:    // submissions bucket).
567:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
568:    return { ok: true, putUrl, publicUrl: pubUrl };
569:  } catch (err) {
570:    console.error("[getWizardAssetPutUrlAction] presign failed:", err);
571:    return { ok: false, error: "presign_failed" };
572:  }
573:}
574:
575:// Phase 3.1 ??server-generated key + strict content-type validation.
576:// Use this for board asset uploads going forward. Legacy
577:// getWizardAssetPutUrlAction is preserved for back-compat with already-
578:// shipped client code paths.
579:const boardAssetPutUrlSchema = z.object({
580:  contentType: z.string().min(1).max(200),
581:});
582:
583:export async function getBoardAssetPutUrlAction(
584:  contentType: unknown
585:): Promise<WizardAssetPutUrlResult> {
586:  const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
587:  if (!parsed.success) return { ok: false, error: "invalid_input" };
588:
589:  if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
590:    return { ok: false, error: "content_type_not_allowed" };
591:  }
592:
593:  const supabase = await createSupabaseServer();
594:  const {
595:    data: { user },
596:  } = await supabase.auth.getUser();
597:  if (!user) return { ok: false, error: "unauthenticated" };
598:
599:  // Server-generated key: UUID + safe extension. NO client filename trust.
600:  const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
601:  const uuid = crypto.randomUUID();
602:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
603:
604:  try {
605:    const putUrl = await createBriefAssetPutUrl(
606:      storageKey,
607:      parsed.data.contentType,
608:      600
609:    );
610:    // K-05 LOOP 1 HIGH-B F7: BRIEF_BUCKET-targeted public URL.
611:    const pubUrl = briefObjectPublicUrl(storageKey);
612:    return { ok: true, putUrl, publicUrl: pubUrl };
613:  } catch (err) {
614:    console.error("[getBoardAssetPutUrlAction] presign failed:", err);
615:    return { ok: false, error: "presign_failed" };
616:  }
617:}
618:
619:// =============================================================================
620:// Phase 3.0 task_03 ??fetchVideoMetadataAction
621:// =============================================================================
622:// Server action wrapper around the oEmbed lib. Validates the URL with Zod,
623:// calls fetchVideoMetadata, and returns the result (or null on any error).
624:// The "use server" directive at the top of this file covers this action.
625:// =============================================================================
626:
627:const videoUrlSchema = z.string().url().max(2000);
628:
629:export type VideoMetadataResult = OEmbedResult | null;
630:

 succeeded in 581ms:
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:37:  FOR UPDATE TO authenticated
supabase\migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:132:  TO authenticated, service_role;
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:78:GRANT EXECUTE ON FUNCTION public.is_handle_available(citext) TO authenticated, anon;
supabase\migrations\20260424000000_phase_2_5_g2_handle_history.sql:156:GRANT EXECUTE ON FUNCTION public.change_handle(citext) TO authenticated;
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:268:  TO authenticated, service_role;
supabase\migrations\20260428070000_phase_2_8_6_review_loop_2.sql:32:  FOR UPDATE TO authenticated
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:115:  TO authenticated, service_role;
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:86:  FOR UPDATE TO authenticated
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:111:  FOR INSERT TO authenticated
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:127:  FOR INSERT TO authenticated
supabase\migrations\20260428060000_phase_2_8_6_review_loop_1.sql:149:  FOR UPDATE TO authenticated
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:52:  FOR SELECT TO authenticated
supabase\migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:66:  FOR UPDATE TO authenticated
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:85:  FOR SELECT TO authenticated
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:94:  FOR INSERT TO authenticated
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:106:  FOR UPDATE TO authenticated
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:120:  FOR SELECT TO authenticated
supabase\migrations\20260428050000_phase_2_8_6_support_chat.sql:135:  FOR INSERT TO authenticated
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:20:--   2. GRANT  UPDATE (document, updated_at) TO authenticated
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:188:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:204:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:226:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:247:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:258:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:278:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:300:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:316:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:334:  TO authenticated
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:347:  TO authenticated
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:29:  FOR INSERT TO authenticated
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:78:  FOR INSERT TO authenticated
supabase\migrations\20260428040000_phase_2_8_6_meetings_extend.sql:94:  FOR UPDATE TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:142:  TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:152:  TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:165:  TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:185:  TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:201:  TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:219:  TO authenticated
supabase\migrations\20260425000000_phase_2_7_commission_soft_launch.sql:234:  TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:161:GRANT SELECT ON public.project_status_history TO authenticated, anon;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:339:  TO authenticated, service_role;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:495:  TO authenticated;
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:571:  FOR SELECT TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:583:  FOR SELECT TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:590:  FOR INSERT TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:596:  FOR UPDATE TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:602:  FOR DELETE TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:621:  FOR SELECT TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:634:  FOR INSERT TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:646:  FOR UPDATE TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:665:  FOR DELETE TO authenticated
supabase\migrations\20260427164421_phase_3_0_projects_lifecycle.sql:692:  FOR UPDATE TO authenticated
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3729:CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3854:CREATE POLICY milestones_rw ON public.project_milestones TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4064:CREATE POLICY proj_refs_rw ON public.project_references TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4075:CREATE POLICY proj_threads_rw ON public.project_threads TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4353:CREATE POLICY thread_message_attachments_delete ON public.thread_message_attachments FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4362:CREATE POLICY thread_message_attachments_insert ON public.thread_message_attachments FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4373:CREATE POLICY thread_message_attachments_select ON public.thread_message_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4390:CREATE POLICY thread_messages_insert ON public.thread_messages FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4407:CREATE POLICY thread_msgs_rw ON public.thread_messages TO authenticated USING ((EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4479:CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4551:CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4558:CREATE POLICY avatars_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4572:CREATE POLICY brand_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'brand-logos'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4597:CREATE POLICY deliverables_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'project-deliverables'::text));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4604:CREATE POLICY deliverables_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-deliverables'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4653:CREATE POLICY refs_insert_authorized ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4662:CREATE POLICY refs_read ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'project-references'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4750:CREATE POLICY thread_attachments_delete ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4759:CREATE POLICY thread_attachments_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4778:CREATE POLICY thread_attachments_select ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'thread-attachments'::text) AND (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4800:CREATE POLICY ws_logos_write ON storage.objects FOR INSERT TO authenticated WITH CHECK ((bucket_id = 'workspace-logos'::text));
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:71:  FOR SELECT TO authenticated
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:83:  FOR SELECT TO authenticated
supabase\migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:92:  FOR ALL TO authenticated
supabase\migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:84:REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;

 succeeded in 452ms:
1:-- Phase 3.1: project_boards + project_board_versions + 3 RPCs + RLS
2:-- Execution: additive only -- no existing tables modified
3:-- Recorded version: 20260429113853 (per L-021 MCP timestamp rename)
4:
5:-- ============================================================
6:-- Table: project_boards
7:-- ============================================================
8:CREATE TABLE IF NOT EXISTS project_boards (
9:  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
10:  project_id      uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
11:  document        jsonb NOT NULL DEFAULT '{}'::jsonb,
12:  schema_version  int  NOT NULL DEFAULT 1,
13:  asset_index     jsonb NOT NULL DEFAULT '[]'::jsonb,
14:  source          text NOT NULL CHECK (source IN ('wizard_seed', 'admin_init', 'migrated')),
15:  is_locked       boolean NOT NULL DEFAULT false,
16:  locked_by       uuid REFERENCES profiles(id),
17:  locked_at       timestamptz,
18:  created_at      timestamptz NOT NULL DEFAULT now(),
19:  updated_at      timestamptz NOT NULL DEFAULT now()
20:);
21:
22:-- ============================================================
23:-- Table: project_board_versions
24:-- ============================================================
25:CREATE TABLE IF NOT EXISTS project_board_versions (
26:  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
27:  board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
28:  version     int  NOT NULL,
29:  document    jsonb NOT NULL,
30:  created_by  uuid REFERENCES profiles(id),
31:  created_at  timestamptz NOT NULL DEFAULT now(),
32:  label       text,
33:  UNIQUE (board_id, version)
34:);
35:
36:CREATE INDEX IF NOT EXISTS idx_project_board_versions_board_version
37:  ON project_board_versions (board_id, version DESC);
38:
39:-- ============================================================
40:-- RLS: project_boards
41:-- ============================================================
42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
43:
44:CREATE POLICY project_boards_select_client ON project_boards
45:  FOR SELECT
46:  USING (
47:    is_yagi_admin(auth.uid())
48:    OR project_id IN (
49:      SELECT p.id FROM projects p
50:      WHERE p.workspace_id IN (
51:        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
52:      )
53:    )
54:  );
55:
56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
57:  FOR INSERT
58:  WITH CHECK (false);
59:
60:CREATE POLICY project_boards_update_client ON project_boards
61:  FOR UPDATE
62:  USING (
63:    is_yagi_admin(auth.uid())
64:    OR (
65:      is_locked = false
66:      AND project_id IN (
67:        SELECT p.id FROM projects p
68:        WHERE p.workspace_id IN (
69:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
70:        )
71:      )
72:    )
73:  )
74:  WITH CHECK (
75:    is_yagi_admin(auth.uid())
76:    OR (
77:      is_locked = false
78:      AND project_id IN (
79:        SELECT p.id FROM projects p
80:        WHERE p.workspace_id IN (
81:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
82:        )
83:      )
84:    )
85:  );
86:
87:-- ============================================================
88:-- RLS: project_board_versions
89:-- ============================================================
90:ALTER TABLE project_board_versions ENABLE ROW LEVEL SECURITY;
91:
92:CREATE POLICY project_board_versions_select ON project_board_versions
93:  FOR SELECT
94:  USING (
95:    is_yagi_admin(auth.uid())
96:    OR board_id IN (
97:      SELECT pb.id FROM project_boards pb
98:      WHERE pb.project_id IN (
99:        SELECT p.id FROM projects p
100:        WHERE p.workspace_id IN (
101:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
102:        )
103:      )
104:    )
105:  );
106:
107:CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
108:  FOR INSERT
109:  WITH CHECK (false);
110:
111:-- ============================================================
112:-- RPC: seed_project_board_from_wizard
113:-- ============================================================
114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
115:  p_project_id      uuid,
116:  p_initial_document jsonb
117:)
118:RETURNS uuid
119:LANGUAGE plpgsql
120:SECURITY DEFINER
121:SET search_path = public
122:AS $$
123:DECLARE
124:  v_board_id uuid;
125:  v_project_status text;
126:BEGIN
127:  SELECT status INTO v_project_status
128:  FROM projects
129:  WHERE id = p_project_id;
130:
131:  IF v_project_status IS NULL THEN
132:    RAISE EXCEPTION 'project not found: %', p_project_id;
133:  END IF;
134:
135:  IF v_project_status != 'in_review' THEN
136:    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
137:      p_project_id, v_project_status;
138:  END IF;
139:
140:  INSERT INTO project_boards (project_id, document, source)
141:  VALUES (p_project_id, p_initial_document, 'wizard_seed')
142:  ON CONFLICT (project_id) DO UPDATE
143:    SET document   = EXCLUDED.document,
144:        source     = 'wizard_seed',
145:        updated_at = now()
146:  RETURNING id INTO v_board_id;
147:
148:  RETURN v_board_id;
149:END;
150:$$;
151:
152:-- ============================================================
153:-- RPC: init_project_board
154:-- ============================================================
155:CREATE OR REPLACE FUNCTION init_project_board(
156:  p_project_id uuid
157:)
158:RETURNS uuid
159:LANGUAGE plpgsql
160:SECURITY DEFINER
161:SET search_path = public
162:AS $$
163:DECLARE
164:  v_board_id uuid;
165:BEGIN
166:  IF NOT is_yagi_admin(auth.uid()) THEN
167:    RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
168:  END IF;
169:
170:  INSERT INTO project_boards (project_id, document, source)
171:  VALUES (p_project_id, '{}'::jsonb, 'admin_init')
172:  ON CONFLICT (project_id) DO UPDATE
173:    SET updated_at = now()
174:  RETURNING id INTO v_board_id;
175:
176:  RETURN v_board_id;
177:END;
178:$$;
179:
180:-- ============================================================
181:-- RPC: toggle_project_board_lock
182:-- ============================================================
183:CREATE OR REPLACE FUNCTION toggle_project_board_lock(
184:  p_board_id uuid,
185:  p_locked   boolean
186:)
187:RETURNS void
188:LANGUAGE plpgsql
189:SECURITY DEFINER
190:SET search_path = public
191:AS $$
192:BEGIN
193:  IF NOT is_yagi_admin(auth.uid()) THEN
194:    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
195:  END IF;
196:
197:  UPDATE project_boards
198:  SET
199:    is_locked  = p_locked,
200:    locked_by  = CASE WHEN p_locked THEN auth.uid() ELSE NULL END,
201:    locked_at  = CASE WHEN p_locked THEN now() ELSE NULL END,
202:    updated_at = now()
203:  WHERE id = p_board_id;
204:
205:  IF NOT FOUND THEN
206:    RAISE EXCEPTION 'project_board not found: %', p_board_id;
207:  END IF;
208:END;
209:$$;
210:
211:-- ============================================================
212:-- One-time back-fill: every existing project gets a board row
213:-- ============================================================
214:INSERT INTO project_boards (project_id, document, source)
215:SELECT id, '{}'::jsonb, 'migrated'
216:FROM projects
217:WHERE id NOT IN (SELECT project_id FROM project_boards)
218:ON CONFLICT (project_id) DO NOTHING;

 succeeded in 463ms:
1:-- Phase 3.1 hotfix-3 K-05 Loop 1 fixes
2:-- HIGH-A #1: Fix owner_id -> created_by in all 4 new attachment RPCs
3:--            AND add auth gate to seed_project_board_from_wizard 5-arg overload
4:-- HIGH-A #2: Restrict project_boards_update_client policy to exclude
5:--            attached_pdfs, attached_urls, asset_index (attachment writes via RPC only)
6:
7:-- ============================================================
8:-- FIX HIGH-A #1a: add_project_board_pdf ??owner_id -> created_by
9:-- ============================================================
10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
11:  p_board_id    uuid,
12:  p_storage_key text,
13:  p_filename    text,
14:  p_size_bytes  bigint
15:) RETURNS uuid
16:LANGUAGE plpgsql
17:SECURITY DEFINER
18:SET search_path = public, pg_temp
19:AS $$
20:DECLARE
21:  v_caller_id  uuid := auth.uid();
22:  v_project_id uuid;
23:  v_is_locked  boolean;
24:  v_is_admin   boolean;
25:  v_new_id     uuid := gen_random_uuid();
26:  v_pdf_count  int;
27:BEGIN
28:  IF v_caller_id IS NULL THEN
29:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
30:  END IF;
31:
32:  SELECT pb.project_id, pb.is_locked
33:  INTO v_project_id, v_is_locked
34:  FROM project_boards pb
35:  WHERE pb.id = p_board_id;
36:
37:  IF NOT FOUND THEN
38:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
39:  END IF;
40:
41:  v_is_admin := is_yagi_admin(v_caller_id);
42:  IF NOT v_is_admin AND NOT EXISTS (
43:    SELECT 1 FROM projects p
44:    WHERE p.id = v_project_id AND p.created_by = v_caller_id
45:  ) THEN
46:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
47:  END IF;
48:
49:  IF v_is_locked AND NOT v_is_admin THEN
50:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
51:  END IF;
52:
53:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
54:  FROM project_boards WHERE id = p_board_id;
55:  IF v_pdf_count >= 30 THEN
56:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
57:  END IF;
58:
59:  IF p_size_bytes > 20 * 1024 * 1024 THEN
60:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
61:  END IF;
62:
63:  IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
64:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
65:  END IF;
66:
67:  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
68:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
69:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
70:  END IF;
71:
72:  UPDATE project_boards
73:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
74:    'id', v_new_id::text,
75:    'storage_key', p_storage_key,
76:    'filename', p_filename,
77:    'size_bytes', p_size_bytes,
78:    'uploaded_at', now()::text,
79:    'uploaded_by', v_caller_id::text
80:  )), updated_at = now()
81:  WHERE id = p_board_id;
82:
83:  RETURN v_new_id;
84:END;
85:$$;
86:
87:-- ============================================================
88:-- FIX HIGH-A #1b: add_project_board_url ??owner_id -> created_by
89:-- (jsonb fix in subsequent migration 20260429151910)
90:-- ============================================================
91:CREATE OR REPLACE FUNCTION add_project_board_url(
92:  p_board_id      uuid,
93:  p_url           text,
94:  p_title         text,
95:  p_thumbnail_url text,
96:  p_provider      text,
97:  p_note          text
98:) RETURNS uuid
99:LANGUAGE plpgsql
100:SECURITY DEFINER
101:SET search_path = public, pg_temp
102:AS $$
103:DECLARE
104:  v_caller_id  uuid := auth.uid();
105:  v_project_id uuid;
106:  v_is_locked  boolean;
107:  v_is_admin   boolean;
108:  v_new_id     uuid := gen_random_uuid();
109:  v_url_count  int;
110:BEGIN
111:  IF v_caller_id IS NULL THEN
112:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
113:  END IF;
114:
115:  SELECT pb.project_id, pb.is_locked
116:  INTO v_project_id, v_is_locked
117:  FROM project_boards pb
118:  WHERE pb.id = p_board_id;
119:
120:  IF NOT FOUND THEN
121:    RAISE EXCEPTION 'add_project_board_url: board not found';
122:  END IF;
123:
124:  v_is_admin := is_yagi_admin(v_caller_id);
125:  IF NOT v_is_admin AND NOT EXISTS (
126:    SELECT 1 FROM projects p
127:    WHERE p.id = v_project_id AND p.created_by = v_caller_id
128:  ) THEN
129:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
130:  END IF;
131:
132:  IF v_is_locked AND NOT v_is_admin THEN
133:    RAISE EXCEPTION 'add_project_board_url: board is locked';
134:  END IF;
135:
136:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
137:  FROM project_boards WHERE id = p_board_id;
138:  IF v_url_count >= 50 THEN
139:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
140:  END IF;
141:
142:  IF p_url IS NULL OR length(p_url) = 0 OR length(p_url) > 2000 THEN
143:    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
144:  END IF;
145:
146:  IF p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%' THEN
147:    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
148:  END IF;
149:
150:  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
151:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
152:  END IF;
153:
154:  UPDATE project_boards
155:  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
156:    'id',            v_new_id::text,
157:    'url',           p_url,
158:    'title',         to_jsonb(p_title),
159:    'thumbnail_url', to_jsonb(p_thumbnail_url),
160:    'provider',      COALESCE(p_provider, 'generic'),
161:    'note',          to_jsonb(p_note),
162:    'added_at',      now()::text,
163:    'added_by',      v_caller_id::text
164:  )), updated_at = now()
165:  WHERE id = p_board_id;
166:
167:  RETURN v_new_id;
168:END;
169:$$;
170:
171:-- ============================================================
172:-- FIX HIGH-A #1c: remove_project_board_attachment ??owner_id -> created_by
173:-- ============================================================
174:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
175:  p_board_id      uuid,
176:  p_kind          text,
177:  p_attachment_id uuid
178:) RETURNS boolean
179:LANGUAGE plpgsql
180:SECURITY DEFINER
181:SET search_path = public, pg_temp
182:AS $$
183:DECLARE
184:  v_caller_id  uuid := auth.uid();
185:  v_project_id uuid;
186:  v_is_locked  boolean;
187:  v_is_admin   boolean;
188:BEGIN
189:  IF v_caller_id IS NULL THEN
190:    RAISE EXCEPTION 'remove_project_board_attachment: unauthenticated';
191:  END IF;
192:
193:  SELECT pb.project_id, pb.is_locked
194:  INTO v_project_id, v_is_locked
195:  FROM project_boards pb
196:  WHERE pb.id = p_board_id;
197:
198:  IF NOT FOUND THEN
199:    RAISE EXCEPTION 'remove_project_board_attachment: board not found';
200:  END IF;
201:
202:  v_is_admin := is_yagi_admin(v_caller_id);
203:  IF NOT v_is_admin AND NOT EXISTS (
204:    SELECT 1 FROM projects p
205:    WHERE p.id = v_project_id AND p.created_by = v_caller_id
206:  ) THEN
207:    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
208:  END IF;
209:
210:  IF v_is_locked AND NOT v_is_admin THEN
211:    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
212:  END IF;
213:
214:  IF p_kind = 'pdf' THEN
215:    UPDATE project_boards
216:    SET attached_pdfs = (
217:      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
218:      FROM jsonb_array_elements(attached_pdfs) elem
219:      WHERE (elem->>'id') != p_attachment_id::text
220:    ), updated_at = now()
221:    WHERE id = p_board_id;
222:  ELSIF p_kind = 'url' THEN
223:    UPDATE project_boards
224:    SET attached_urls = (
225:      SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
226:      FROM jsonb_array_elements(attached_urls) elem
227:      WHERE (elem->>'id') != p_attachment_id::text
228:    ), updated_at = now()
229:    WHERE id = p_board_id;
230:  ELSE
231:    RAISE EXCEPTION 'remove_project_board_attachment: invalid kind (must be pdf or url)';
232:  END IF;
233:
234:  RETURN true;
235:END;
236:$$;
237:
238:-- ============================================================
239:-- FIX HIGH-A #1d: update_project_board_url_note ??owner_id -> created_by
240:-- ============================================================
241:CREATE OR REPLACE FUNCTION update_project_board_url_note(
242:  p_board_id      uuid,
243:  p_attachment_id uuid,
244:  p_note          text
245:) RETURNS boolean
246:LANGUAGE plpgsql
247:SECURITY DEFINER
248:SET search_path = public, pg_temp
249:AS $$
250:DECLARE
251:  v_caller_id  uuid := auth.uid();
252:  v_project_id uuid;
253:  v_is_locked  boolean;
254:  v_is_admin   boolean;
255:BEGIN
256:  IF v_caller_id IS NULL THEN
257:    RAISE EXCEPTION 'update_project_board_url_note: unauthenticated';
258:  END IF;
259:
260:  SELECT pb.project_id, pb.is_locked
261:  INTO v_project_id, v_is_locked
262:  FROM project_boards pb
263:  WHERE pb.id = p_board_id;
264:
265:  IF NOT FOUND THEN
266:    RAISE EXCEPTION 'update_project_board_url_note: board not found';
267:  END IF;
268:
269:  v_is_admin := is_yagi_admin(v_caller_id);
270:  IF NOT v_is_admin AND NOT EXISTS (
271:    SELECT 1 FROM projects p
272:    WHERE p.id = v_project_id AND p.created_by = v_caller_id
273:  ) THEN
274:    RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
275:  END IF;
276:
277:  IF v_is_locked AND NOT v_is_admin THEN
278:    RAISE EXCEPTION 'update_project_board_url_note: board is locked';
279:  END IF;
280:
281:  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
282:    RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
283:  END IF;
284:
285:  UPDATE project_boards
286:  SET attached_urls = (
287:    SELECT jsonb_agg(
288:      CASE
289:        WHEN (elem->>'id') = p_attachment_id::text
290:        THEN jsonb_set(elem, '{note}', COALESCE(to_jsonb(p_note), 'null'::jsonb))
291:        ELSE elem
292:      END
293:    )
294:    FROM jsonb_array_elements(attached_urls) elem
295:  ), updated_at = now()
296:  WHERE id = p_board_id;
297:
298:  RETURN true;
299:END;
300:$$;
301:
302:-- ============================================================
303:-- FIX HIGH-A #1e: seed_project_board_from_wizard (5-arg) ??add auth gate
304:-- ============================================================
305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
306:  p_project_id            uuid,
307:  p_initial_document      jsonb,
308:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
309:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
310:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
311:)
312:RETURNS uuid
313:LANGUAGE plpgsql
314:SECURITY DEFINER
315:SET search_path = public, pg_temp
316:AS $$
317:DECLARE
318:  v_board_id       uuid;
319:  v_project_status text;
320:  v_caller_id      uuid := auth.uid();
321:BEGIN
322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
323:    SELECT 1 FROM projects p
324:    WHERE p.id = p_project_id AND p.created_by = v_caller_id
325:  ) THEN
326:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
327:  END IF;
328:
329:  SELECT status INTO v_project_status
330:  FROM projects
331:  WHERE id = p_project_id;
332:
333:  IF v_project_status IS NULL THEN
334:    RAISE EXCEPTION 'project not found: %', p_project_id;
335:  END IF;
336:
337:  IF v_project_status != 'in_review' THEN
338:    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
339:      p_project_id, v_project_status;
340:  END IF;
341:
342:  INSERT INTO project_boards (
343:    project_id, document, attached_pdfs, attached_urls, asset_index, source
344:  )
345:  VALUES (
346:    p_project_id, p_initial_document, p_initial_attached_pdfs,
347:    p_initial_attached_urls, p_initial_asset_index, 'wizard_seed'
348:  )
349:  ON CONFLICT (project_id) DO UPDATE
350:    SET document      = EXCLUDED.document,
351:        attached_pdfs = EXCLUDED.attached_pdfs,
352:        attached_urls = EXCLUDED.attached_urls,
353:        asset_index   = EXCLUDED.asset_index,
354:        source        = 'wizard_seed',
355:        updated_at    = now()
356:  RETURNING id INTO v_board_id;
357:
358:  RETURN v_board_id;
359:END;
360:$$;
361:
362:-- ============================================================
363:-- FIX HIGH-A #2: Restrict project_boards_update_client policy +
364:--                REVOKE direct column UPDATE on attachment/index columns
365:-- ============================================================
366:DROP POLICY IF EXISTS project_boards_update_client ON project_boards;
367:
368:CREATE POLICY project_boards_update_client ON project_boards
369:  FOR UPDATE
370:  USING (
371:    is_yagi_admin(auth.uid())
372:    OR (
373:      is_locked = false
374:      AND project_id IN (
375:        SELECT p.id FROM projects p
376:        WHERE p.workspace_id IN (
377:          SELECT workspace_members.workspace_id
378:          FROM workspace_members
379:          WHERE workspace_members.user_id = auth.uid()
380:        )
381:      )
382:    )
383:  )
384:  WITH CHECK (
385:    is_yagi_admin(auth.uid())
386:    OR (
387:      is_locked = false
388:      AND project_id IN (
389:        SELECT p.id FROM projects p
390:        WHERE p.workspace_id IN (
391:          SELECT workspace_members.workspace_id
392:          FROM workspace_members
393:          WHERE workspace_members.user_id = auth.uid()
394:        )
395:      )
396:    )
397:  );
398:
399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;

codex
I’m seeing one candidate outside the closed envelope: the project creation/update actions accept `brand_id` from client input and map it directly into `projects.brand_id`. I’m checking the database constraints and RLS to determine whether cross-workspace brand binding is actually impossible at DB level or needs to be treated as a new finding.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"brand_id|brands\\(|CREATE TABLE public\\.brands|CREATE TABLE IF NOT EXISTS brands|REFERENCES brands|projects.*brand\" supabase/migrations src/lib/supabase/database.types.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "brand_id.*workspace|workspace.*brand_id|projects_brand|FOREIGN KEY.*brand|brand.*constraint|CONSTRAINT.*brand" supabase/migrations' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "brand_id|workspace_id: string|brands" src/app/[locale]/app/projects/new/actions.ts src/app/[locale]/app/projects/new/page.tsx src/app/[locale]/app/projects/page.tsx src/app/[locale]/app/projects/new/new-project-wizard.tsx' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$lines=Get-Content -LiteralPath $p; foreach($range in @(@(790,850),@(1170,1235),@(3710,3740),@(4118,4145))){ for($i=$range[0]; $i -le [Math]::Min($range[1],$lines.Length); $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 344ms:
src/lib/supabase/database.types.ts:1712:          brand_id: string | null
src/lib/supabase/database.types.ts:1737:          brand_id?: string | null
src/lib/supabase/database.types.ts:1762:          brand_id?: string | null
src/lib/supabase/database.types.ts:1788:            foreignKeyName: "projects_brand_id_fkey"
src/lib/supabase/database.types.ts:1789:            columns: ["brand_id"]
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1223:CREATE TABLE public.brands (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1591:    brand_id uuid,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2920:-- Name: projects_brand_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2923:CREATE INDEX projects_brand_idx ON public.projects USING btree (brand_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3474:-- Name: projects projects_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3478:    ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

 succeeded in 360ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1234:    CONSTRAINT brands_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$'::text))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2232:    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2240:    ADD CONSTRAINT brands_workspace_id_slug_key UNIQUE (workspace_id, slug);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2920:-- Name: projects_brand_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2923:CREATE INDEX projects_brand_idx ON public.projects USING btree (brand_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3190:    ADD CONSTRAINT brands_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3474:-- Name: projects projects_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3478:    ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;

 succeeded in 376ms:
src/app/[locale]/app/projects/page.tsx:13:  searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
src/app/[locale]/app/projects/page.tsx:23:  workspace_id: string;
src/app/[locale]/app/projects/page.tsx:73:      brand:brands(id, name, logo_url)
src/app/[locale]/app/projects/page.tsx:81:  if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);
src/app/[locale]/app/projects/page.tsx:92:  // Resolve brand name for active brand_id filter chip
src/app/[locale]/app/projects/page.tsx:94:    sp.brand_id && projects.length > 0
src/app/[locale]/app/projects/page.tsx:95:      ? (projects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
src/app/[locale]/app/projects/page.tsx:99:  const removeFilter = (key: "status" | "brand_id") => {
src/app/[locale]/app/projects/page.tsx:102:    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
src/app/[locale]/app/projects/page.tsx:130:      {(sp.status || (sp.brand_id && activeBrand)) && (
src/app/[locale]/app/projects/page.tsx:141:          {sp.brand_id && activeBrand && (
src/app/[locale]/app/projects/page.tsx:143:              href={removeFilter("brand_id")}
src/app/[locale]/app/projects/new/page.tsx:34:  // Fetch brands for the workspace (empty list is fine — wizard shows "None" option)
src/app/[locale]/app/projects/new/page.tsx:35:  const brands: { id: string; name: string }[] = [];
src/app/[locale]/app/projects/new/page.tsx:37:    const { data: brandsData } = await supabase
src/app/[locale]/app/projects/new/page.tsx:38:      .from("brands")
src/app/[locale]/app/projects/new/page.tsx:42:    brands.push(...(brandsData ?? []));
src/app/[locale]/app/projects/new/page.tsx:54:      <NewProjectWizard brands={brands} activeWorkspaceId={workspaceId} />
src/app/[locale]/app/projects/new/new-project-wizard.tsx:133:  brands?: { id: string; name: string }[];
src/app/[locale]/app/projects/new/new-project-wizard.tsx:288:  brands: _brands = [],
src/app/[locale]/app/projects/new/new-project-wizard.tsx:334:      brand_id: null,
src/app/[locale]/app/projects/new/actions.ts:33:  brand_id: z.string().uuid().nullable().optional(),
src/app/[locale]/app/projects/new/actions.ts:106:    brand_id: data.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:181:  brand_id: z.string().uuid().nullable().optional(),
src/app/[locale]/app/projects/new/actions.ts:320:    brand_id: fields.brand_id ?? null,
src/app/[locale]/app/projects/new/actions.ts:425:      brand_id: fields.brand_id ?? null,

 succeeded in 421ms:
790:    v_common_prefix TEXT;
791:    v_delimiter CONSTANT TEXT := '/';
792:
793:    -- Configuration
794:    v_limit INT;
795:    v_prefix TEXT;
796:    v_prefix_lower TEXT;
797:    v_is_asc BOOLEAN;
798:    v_order_by TEXT;
799:    v_sort_order TEXT;
800:    v_upper_bound TEXT;
801:    v_file_batch_size INT;
802:
803:    -- Dynamic SQL for batch query only
804:    v_batch_query TEXT;
805:
806:    -- Seek state
807:    v_next_seek TEXT;
808:    v_count INT := 0;
809:    v_skipped INT := 0;
810:BEGIN
811:    -- ========================================================================
812:    -- INITIALIZATION
813:    -- ========================================================================
814:    v_limit := LEAST(coalesce(limits, 100), 1500);
815:    v_prefix := coalesce(prefix, '') || coalesce(search, '');
816:    v_prefix_lower := lower(v_prefix);
817:    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
818:    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);
819:
820:    -- Validate sort column
821:    CASE lower(coalesce(sortcolumn, 'name'))
822:        WHEN 'name' THEN v_order_by := 'name';
823:        WHEN 'updated_at' THEN v_order_by := 'updated_at';
824:        WHEN 'created_at' THEN v_order_by := 'created_at';
825:        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
826:        ELSE v_order_by := 'name';
827:    END CASE;
828:
829:    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;
830:
831:    -- ========================================================================
832:    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
833:    -- ========================================================================
834:    IF v_order_by != 'name' THEN
835:        RETURN QUERY EXECUTE format(
836:            $sql$
837:            WITH folders AS (
838:                SELECT path_tokens[$1] AS folder
839:                FROM storage.objects
840:                WHERE objects.name ILIKE $2 || '%%'
841:                  AND bucket_id = $3
842:                  AND array_length(objects.path_tokens, 1) <> $1
843:                GROUP BY folder
844:                ORDER BY folder %s
845:            )
846:            (SELECT folder AS "name",
847:                   NULL::uuid AS id,
848:                   NULL::timestamptz AS updated_at,
849:                   NULL::timestamptz AS created_at,
850:                   NULL::timestamptz AS last_accessed_at,
1170:        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
1171:        RETURN QUERY
1172:        SELECT
1173:            split_part(l.name, '/', levels) AS key,
1174:            l.name AS name,
1175:            l.id,
1176:            l.updated_at,
1177:            l.created_at,
1178:            l.last_accessed_at,
1179:            l.metadata
1180:        FROM storage.list_objects_with_delimiter(
1181:            bucket_name,
1182:            coalesce(prefix, ''),
1183:            '/',
1184:            v_limit,
1185:            start_after,
1186:            '',
1187:            v_sort_ord
1188:        ) l;
1189:    ELSE
1190:        -- Use aggregation approach for timestamp sorting
1191:        -- Not efficient for large datasets but supports correct pagination
1192:        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
1193:            prefix, bucket_name, v_limit, levels, start_after,
1194:            v_sort_ord, v_sort_col, sort_column_after
1195:        );
1196:    END IF;
1197:END;
1198:$$;
1199:
1200:
1201:--
1202:-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
1203:--
1204:
1205:CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
1206:    LANGUAGE plpgsql
1207:    AS $$
1208:BEGIN
1209:    NEW.updated_at = now();
1210:    RETURN NEW; 
1211:END;
1212:$$;
1213:
1214:
1215:SET default_tablespace = '';
1216:
1217:SET default_table_access_method = heap;
1218:
1219:--
1220:-- Name: brands; Type: TABLE; Schema: public; Owner: -
1221:--
1222:
1223:CREATE TABLE public.brands (
1224:    id uuid DEFAULT gen_random_uuid() NOT NULL,
1225:    workspace_id uuid NOT NULL,
1226:    name text NOT NULL,
1227:    slug text NOT NULL,
1228:    logo_url text,
1229:    industry text,
1230:    description text,
1231:    brand_guide jsonb DEFAULT '{}'::jsonb NOT NULL,
1232:    created_at timestamp with time zone DEFAULT now() NOT NULL,
1233:    updated_at timestamp with time zone DEFAULT now() NOT NULL,
1234:    CONSTRAINT brands_slug_check CHECK ((slug ~ '^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]?$'::text))
1235:);
3710:
3711:--
3712:-- Name: brands brands_read; Type: POLICY; Schema: public; Owner: -
3713:--
3714:
3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
3716:
3717:
3718:--
3719:-- Name: brands brands_write_admin; Type: POLICY; Schema: public; Owner: -
3720:--
3721:
3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
3723:
3724:
3725:--
3726:-- Name: project_deliverables deliverables_rw; Type: POLICY; Schema: public; Owner: -
3727:--
3728:
3729:CREATE POLICY deliverables_rw ON public.project_deliverables TO authenticated USING ((EXISTS ( SELECT 1
3730:   FROM public.projects p
3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
3732:   FROM public.projects p
3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
3734:
3735:
3736:--
3737:-- Name: invoice_line_items invoice_items_modify; Type: POLICY; Schema: public; Owner: -
3738:--
3739:
3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
4118:
4119:--
4120:-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
4121:--
4122:
4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4124:
4125:
4126:--
4127:-- Name: projects projects_read; Type: POLICY; Schema: public; Owner: -
4128:--
4129:
4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4131:
4132:
4133:--
4134:-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
4135:--
4136:
4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4138:
4139:
4140:--
4141:-- Name: showcase_media; Type: ROW SECURITY; Schema: public; Owner: -
4142:--
4143:
4144:ALTER TABLE public.showcase_media ENABLE ROW LEVEL SECURITY;
4145:

codex
A second candidate is stronger: `workspaces.kind` is added as an enum-like column, but the existing workspace-admin UPDATE policy remains table-wide. I’m checking how `kind` is consumed so the severity reflects whether this is privilege-affecting or just metadata corruption.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "kind.*yagi_admin|yagi_admin.*kind|workspace.*kind|kind ===|kind:|WorkspaceKind" src supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=4474; $i -le 4540; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$lines=Get-Content -LiteralPath $p; foreach($range in @(@(1578,1625),@(3468,3482))){ for($i=$range[0]; $i -le $range[1]; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 443ms:
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:1:-- Phase 4.x -- task_01 -- workspace.kind + projects.twin_intent + projects.kind enum + project_licenses
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:4:-- 1. workspaces.kind
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:12:UPDATE workspaces SET kind = 'brand' WHERE kind IS NULL;
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:14:CREATE INDEX idx_workspaces_kind ON workspaces(kind);
src\lib\board\asset-index.test.ts:113:    const imgEntry = result.find((e) => e.kind === "image");
src\lib\board\asset-index.test.ts:117:    const urlEntry = result.find((e) => e.kind === "url");
src\lib\board\asset-index.test.ts:135:    const pdfEntry = result.find((e) => e.kind === "pdf");
src\lib\board\asset-index.test.ts:140:    const urlEntry = result.find((e) => e.kind === "url");
src\emails\notification-digest.tsx:19:  kind: string;
src\emails\notification-digest.tsx:250:      kind: "frame_uploaded_batch",
src\emails\notification-digest.tsx:257:      kind: "feedback_received",
src\emails\notification-immediate.tsx:19:  kind: string;
src\emails\notification-immediate.tsx:186:    kind: "meeting_scheduled",
src\lib\board\asset-index.ts:45:  kind: "image" | "pdf" | "url";
src\lib\board\asset-index.ts:124:                kind: "image",
src\lib\board\asset-index.ts:142:                kind: "pdf",
src\lib\board\asset-index.ts:165:                kind: "url",
src\lib\board\asset-index.ts:187:      kind: "pdf",
src\lib\board\asset-index.ts:203:      kind: "url",
src\lib\app\scopes.ts:11:  | { kind: "workspace"; id: string; name: string; href: string; active: boolean }
src\lib\app\scopes.ts:12:  | { kind: "admin"; name: string; href: string; active: boolean };
src\lib\app\scopes.ts:19:      kind: "workspace",
src\lib\app\scopes.ts:32:      kind: "admin",
src\components\admin\asset-list-panel.tsx:90:                {a.kind === "image" ? (
src\components\admin\asset-list-panel.tsx:97:                ) : a.kind === "pdf" ? (
src\components\admin\asset-list-panel.tsx:172:                {(a.kind === "image" || a.kind === "pdf") && (
src\lib\email\send-meeting.ts:35:      kind: "invite",
src\lib\email\send-meeting.ts:103:      kind: "cancel",
src\lib\email\send-meeting.ts:166:      kind: "summary",
src\lib\email\meeting-template.ts:18:  kind: MeetingEmailKind;
src\lib\og-video-unfurl.ts:68:  | { kind: "redirect"; location: string }
src\lib\og-video-unfurl.ts:69:  | { kind: "ok"; body: unknown }
src\lib\og-video-unfurl.ts:70:  | { kind: "skip" }
src\lib\og-video-unfurl.ts:81:    if (!location) return { kind: "skip" };
src\lib\og-video-unfurl.ts:84:      return { kind: "redirect", location: next };
src\lib\og-video-unfurl.ts:86:      return { kind: "skip" };
src\lib\og-video-unfurl.ts:90:  if (!res.ok) return { kind: "skip" };
src\lib\og-video-unfurl.ts:92:  if (!ctype.includes("json")) return { kind: "skip" };
src\lib\og-video-unfurl.ts:94:  if (!res.body) return { kind: "skip" };
src\lib\og-video-unfurl.ts:124:    return { kind: "ok", body: JSON.parse(text) };
src\lib\og-video-unfurl.ts:126:    return { kind: "skip" };
src\lib\og-video-unfurl.ts:136:    if (result.kind === "skip") return null;
src\lib\og-video-unfurl.ts:137:    if (result.kind === "redirect") {
src\lib\og-unfurl.ts:44:  | { kind: "redirect"; location: string }
src\lib\og-unfurl.ts:45:  | { kind: "ok"; body: string; finalUrl: string }
src\lib\og-unfurl.ts:46:  | { kind: "skip" }
src\lib\og-unfurl.ts:57:    if (!location) return { kind: "skip" };
src\lib\og-unfurl.ts:60:      return { kind: "redirect", location: next };
src\lib\og-unfurl.ts:62:      return { kind: "skip" };
src\lib\og-unfurl.ts:66:  if (!res.ok) return { kind: "skip" };
src\lib\og-unfurl.ts:70:    return { kind: "skip" };
src\lib\og-unfurl.ts:75:  if (declared > MAX_BODY_BYTES * 4) return { kind: "skip" };
src\lib\og-unfurl.ts:78:  if (!res.body) return { kind: "skip" };
src\lib\og-unfurl.ts:110:  return { kind: "ok", body, finalUrl: res.url || url };
src\lib\og-unfurl.ts:133:        if (result.kind === "skip") return {};
src\lib\og-unfurl.ts:134:        if (result.kind === "redirect") {
src\lib\notifications\emit.ts:16:  kind: NotificationKind;
src\lib\notifications\emit.ts:93:    kind: args.kind,
src\lib\notifications\kinds.ts:64:export function severityOf(kind: NotificationKind): NotificationSeverity {
src\lib\notifications\debounce.ts:33:  kind: DebouncedKind;
src\lib\notifications\debounce.ts:154:        kind: args.kind,
src\lib\notifications\debounce.ts:253:  kind: DebouncedKind,
src\lib\supabase\database.types.ts:801:          kind: string
src\lib\supabase\database.types.ts:817:          kind: string
src\lib\supabase\database.types.ts:1549:          kind: string
src\lib\supabase\database.types.ts:1573:          kind: string
src\lib\supabase\database.types.ts:1722:          kind: string
src\lib\supabase\database.types.ts:2184:          kind: string
src\lib\supabase\database.types.ts:2195:          kind: string
src\lib\supabase\database.types.ts:2307:          kind: string
src\lib\supabase\database.types.ts:2318:          kind: string
src\lib\supabase\database.types.ts:2669:        Args: { p_attachment_id: string; p_board_id: string; p_kind: string }
src\lib\thread-attachments.ts:39:  | { ok: true; kind: AttachmentKind }
src\lib\thread-attachments.ts:124:  kind: AttachmentKind;
src\lib\thread-attachments.ts:169:    if (kind === "image") {
src\lib\thread-attachments.ts:181:    } else if (kind === "video") {
src\lib\team-channels\attachment-caps.ts:61:  | { ok: true; kind: AttachmentKind }
src\lib\team-channels\attachments.ts:51:  kind: AttachmentKind;
src\lib\team-channels\attachments.ts:180:      kind: p.kind,
src\lib\workspace\active.ts:16:// Phase 4 caveat: workspaces.kind column is added by task_01 migration
src\lib\workspace\active.ts:24:export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\lib\workspace\active.ts:29:  kind: WorkspaceKind;
src\lib\workspace\active.ts:37:function narrowKind(value: unknown): WorkspaceKind {
src\lib\workspace\active.ts:45: * Returns the user's workspace memberships, joined with workspace name + kind.
src\lib\workspace\active.ts:57:  // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
src\lib\workspace\active.ts:58:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
src\lib\workspace\active.ts:66:      workspace:workspaces ( id, name, kind )
src\lib\workspace\active.ts:74:          workspace: { id: string; name: string; kind?: string } | null;
src\lib\workspace\active.ts:85:      kind: narrowKind(r.workspace.kind),
src\lib\ui\status-pill.ts:13:// helper (see `kind: 'challenge'` below) — avoids the "5th dialect"
src\lib\ui\status-pill.ts:93:export function statusPillClass(kind: StatusKind, status: string): string {
src\lib\validation\youtube.ts:4:  kind: YouTubeUrlKind;
src\lib\validation\youtube.ts:13:    kind: "watch" as const,
src\lib\validation\youtube.ts:18:    kind: "watch" as const,
src\lib\validation\youtube.ts:23:    kind: "youtu.be" as const,
src\lib\validation\youtube.ts:28:    kind: "shorts" as const,
src\lib\validation\youtube.ts:33:    kind: "embed" as const,
src\lib\validation\youtube.ts:51:          kind: pattern.kind,
src\lib\ui\status-labels.ts:74:export function statusLabel(kind: StatusKind, status: string): string {
src\lib\ui\status-labels.ts:81:export function statusDescription(kind: StatusKind, status: string): string | undefined {
src\lib\validation\youtube.spec.mjs:9:    kind: "watch",
src\lib\validation\youtube.spec.mjs:13:    kind: "watch",
src\lib\validation\youtube.spec.mjs:17:    kind: "youtu.be",
src\lib\validation\youtube.spec.mjs:21:    kind: "shorts",
src\lib\validation\youtube.spec.mjs:25:    kind: "embed",
src\lib\validation\youtube.spec.mjs:43:          kind: pattern.kind,
src\components\team\message-composer.tsx:46:  kind: AttachmentKind;
src\components\team\message-composer.tsx:205:          kind: v.kind,
src\components\team\message-composer.tsx:281:                      kind: urlInfo.kind,
src\components\team\message-composer.tsx:353:        kind: a.kind,
src\components\team\message-composer.tsx:526:        ) : kind === "video" ? (
src\components\team\message-composer.tsx:528:        ) : kind === "pdf" ? (
src\components\team\message-composer.tsx:530:        ) : kind === "image" ? (
src\components\brief-board\editor.tsx:69:  | { kind: "idle" }
src\components\brief-board\editor.tsx:70:  | { kind: "saving" }
src\components\brief-board\editor.tsx:71:  | { kind: "saved" }
src\components\brief-board\editor.tsx:72:  | { kind: "conflict"; latestUpdatedAt: string }
src\components\brief-board\editor.tsx:73:  | { kind: "failed"; reason: string };
src\components\brief-board\editor.tsx:147:  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
src\components\brief-board\editor.tsx:232:      setSaveState({ kind: "idle" }); // dirty
src\components\brief-board\editor.tsx:253:      setSaveState({ kind: "saving" });
src\components\brief-board\editor.tsx:268:          setSaveState({ kind: "failed", reason });
src\components\brief-board\editor.tsx:275:          setSaveState({ kind: "saved" });
src\components\brief-board\editor.tsx:283:                kind: "conflict",
src\components\brief-board\editor.tsx:296:              setSaveState({ kind: "failed", reason: "locked" });
src\components\brief-board\editor.tsx:300:              setSaveState({ kind: "failed", reason: "unauthenticated" });
src\components\brief-board\editor.tsx:304:              setSaveState({ kind: "failed", reason: "validation" });
src\components\brief-board\editor.tsx:317:              setSaveState({ kind: "failed", reason: String(result.error) });
src\components\team\channel-view.tsx:660:  if (kind === "image") {
src\components\team\channel-view.tsx:681:  if (kind === "video") {
src\components\team\channel-view.tsx:696:  if (kind === "pdf") {
src\components\brief-board\blocks\image-block.tsx:71:    | { kind: "loading" }
src\components\brief-board\blocks\image-block.tsx:72:    | { kind: "ok"; url: string }
src\components\brief-board\blocks\image-block.tsx:73:    | { kind: "error" }
src\components\brief-board\blocks\image-block.tsx:74:  >({ kind: "loading" });
src\components\brief-board\blocks\image-block.tsx:82:      setState({ kind: "error" });
src\components\brief-board\blocks\image-block.tsx:85:    setState({ kind: "loading" });
src\components\brief-board\blocks\image-block.tsx:90:        setState({ kind: "ok", url: r.data.url });
src\components\brief-board\blocks\image-block.tsx:92:        setState({ kind: "error" });
src\components\brief-board\blocks\image-block.tsx:106:      {state.kind === "loading" && (
src\components\brief-board\blocks\image-block.tsx:111:      {state.kind === "ok" && (
src\components\brief-board\blocks\image-block.tsx:120:      {state.kind === "error" && (
src\components\projects\wizard\summary-card.tsx:93:      ) : item.kind === "image" ? (
src\components\projects\wizard\summary-card.tsx:95:      ) : item.kind === "pdf" ? (
src\components\challenges\submission-form.tsx:37:  kind: UploadSlot["kind"];
src\components\challenges\submission-form.tsx:138:        kind: "native_video",
src\components\challenges\submission-form.tsx:146:        kind: "image",
src\components\challenges\submission-form.tsx:154:        kind: "pdf",
src\components\challenges\submission-form.tsx:181:        kind: pendingSlots[i].kind,
src\components\challenges\submission-form.tsx:203:        ? urlResult.issued.find((_: IssuedUpload, i: number) => pendingSlots[i].kind === "native_video")
src\components\challenges\submission-form.tsx:218:      const imageIssued = urlResult.issued.filter((_: IssuedUpload, i: number) => pendingSlots[i].kind === "image");
src\components\challenges\submission-form.tsx:221:        ? urlResult.issued.find((_: IssuedUpload, i: number) => pendingSlots[i].kind === "pdf")
src\components\challenges\submission-form.tsx:350:            .filter((u) => u.kind === "native_video")
src\components\challenges\submission-form.tsx:401:            .filter((u) => u.kind === "image")
src\components\challenges\submission-form.tsx:445:            .filter((u) => u.kind === "pdf")
src\components\projects\wizard\reference-board.tsx:34:  kind: "url" | "image" | "pdf" | "video";
src\components\projects\wizard\reference-board.tsx:93:        ) : item.kind === "image" ? (
src\components\projects\wizard\reference-board.tsx:95:        ) : item.kind === "pdf" ? (
src\components\projects\wizard\reference-board.tsx:199:        kind: "url",
src\components\projects\wizard\reference-board.tsx:215:                    kind: "video" as const,
src\components\projects\wizard\reference-board.tsx:268:      const kind: "image" | "pdf" = isImage ? "image" : "pdf";
src\components\project\video-player.tsx:14:      kind: "upload";
src\components\project\video-player.tsx:20:      kind: "embed";
src\components\project\video-player.tsx:27:      kind: "external";
src\components\project\video-player.tsx:50:  if (props.kind === "upload") {
src\components\project\video-player.tsx:53:  if (props.kind === "embed") {
src\components\project\thread-panel.tsx:87:type Run = { kind: "text"; value: string } | { kind: "mention"; target: string };
src\components\project\thread-panel.tsx:94:      runs.push({ kind: "text", value: body.slice(lastIndex, m.index) });
src\components\project\thread-panel.tsx:96:    runs.push({ kind: "mention", target: m[1].toLowerCase() });
src\components\project\thread-panel.tsx:100:    runs.push({ kind: "text", value: body.slice(lastIndex) });
src\components\project\thread-panel.tsx:108:  kind: AttachmentKind;
src\components\project\thread-panel.tsx:387:          kind: att.kind as AttachmentKind,
src\components\project\thread-panel.tsx:443:          kind: r.kind,
src\components\project\thread-panel.tsx:627:                        run.kind === "text" ? (
src\components\project\thread-panel.tsx:892:  if (kind === "image") {
src\components\project\thread-panel.tsx:921:  if (kind === "video") {
src\components\project\thread-panel.tsx:943:  const Icon = kind === "pdf" ? FileText : FileIcon;
src\components\project\thread-panel-server.tsx:132:              kind: att.kind as ThreadAttachment["kind"],
src\components\sidebar\workspace-switcher.tsx:37:type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\components\sidebar\workspace-switcher.tsx:42:  kind: WorkspaceKind;
src\components\sidebar\workspace-switcher.tsx:58:  const brands = workspaces.filter((w) => w.kind === "brand");
src\components\sidebar\workspace-switcher.tsx:59:  const artists = workspaces.filter((w) => w.kind === "artist");
src\components\sidebar\workspace-switcher.tsx:60:  const admins = workspaces.filter((w) => w.kind === "yagi_admin");
src\components\app\sidebar-scope-switcher.tsx:30:  kind: Scope["kind"];
src\components\app\sidebar-scope-switcher.tsx:33:  const Icon = kind === "workspace" ? Briefcase : ShieldCheck;
src\components\app\sidebar-scope-switcher.tsx:126:  const workspaceScopes = scopes.filter((s) => s.kind === "workspace");
src\components\app\sidebar-scope-switcher.tsx:127:  const adminScopes = scopes.filter((s) => s.kind === "admin");
src\components\app\sidebar-scope-switcher.tsx:130:    return scope.kind === "workspace" ? `workspace:${scope.id}` : "admin";
src\app\[locale]\app\layout.tsx:62:  // returns every workspace the user belongs to (with workspaces.kind, which
src\components\app\notification-panel.tsx:33:function iconForKind(kind: string) {
src\app\challenges\[slug]\submit\actions.ts:22:  kind: "native_video" | "image" | "pdf";
src\app\challenges\[slug]\submit\actions.ts:87:    const imageSlots = slots.filter((s) => s.kind === "image");
src\app\challenges\[slug]\submit\actions.ts:95:    if (slot.kind === "native_video") {
src\app\challenges\[slug]\submit\actions.ts:102:    } else if (slot.kind === "image") {
src\app\challenges\[slug]\submit\actions.ts:109:    } else if (slot.kind === "pdf") {
src\app\challenges\[slug]\submit\actions.ts:287:      kind: "challenge_submission_confirmed",
src\app\[locale]\app\preprod\[id]\share-actions.ts:271:          kind: "board_shared",
src\app\[locale]\app\preprod\[id]\share-actions.ts:311:          kind: "board_approved",
src\app\[locale]\app\team\[slug]\actions.ts:30:  kind: z.enum(["image", "video", "pdf", "file"]),
src\app\[locale]\app\team\[slug]\actions.ts:140:        kind: att.kind,
src\app\[locale]\app\team\[slug]\actions.ts:261:          kind: "team_channel_mention",
src\app\[locale]\app\preprod\[id]\actions.ts:550:          kind: "revision_uploaded",
src\app\[locale]\app\preprod\[id]\actions.ts:590:          kind: "frame_uploaded_batch",
src\app\api\share\[token]\reactions\route.ts:113:            kind: "feedback_received",
src\app\[locale]\app\invoices\[id]\actions.ts:182:            kind: "invoice_issued",
src\app\[locale]\app\support\actions.ts:208:              kind: "support_message_new",
src\app\[locale]\app\support\actions.ts:219:      kind: "support_message_new",
src\app\api\share\[token]\comments\route.ts:147:            kind: "feedback_received",
src\app\[locale]\app\settings\actions.ts:58:    if (handleErr) return { error: "handle" as const, kind: handleErr };
src\app\[locale]\app\notifications\actions.ts:12:  kind: string;
src\app\[locale]\app\showcases\actions.ts:393:          kind: "showcase_published",
src\app\[locale]\app\meetings\actions.ts:539:          kind: "meeting_scheduled",
src\app\[locale]\app\meetings\actions.ts:573:          kind: "meeting_summary_sent",
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:135:      kind: isWinner ? "challenge_announced_winner" : "challenge_announced_participant",
src\app\[locale]\app\meetings\request-actions.ts:364:            kind: "meeting_requested",
src\app\[locale]\app\meetings\request-actions.ts:421:    kind: "meeting_confirmed",
src\app\[locale]\app\meetings\request-actions.ts:465:      kind: "meeting_cancelled",
src\app\[locale]\app\meetings\request-actions.ts:481:            kind: "meeting_cancelled",
src\app\[locale]\app\projects\new\actions.ts:879:      kind: "direct",
src\app\[locale]\app\projects\new\actions.ts:1047:      kind: "project_submitted",
src\app\[locale]\auth\expired\page.tsx:112:      if (kind === "rate_limit") {
src\app\[locale]\auth\expired\page.tsx:115:      } else if (kind === "invalid_email") {
src\app\[locale]\app\projects\[id]\board-actions.ts:613:      p_kind: "pdf",
src\app\[locale]\app\projects\[id]\board-actions.ts:767:      p_kind: "url",
src\app\[locale]\app\projects\[id]\thread-actions.ts:123:  kind: z.enum(["image", "video", "pdf", "file"]),
src\app\[locale]\app\projects\[id]\thread-actions.ts:246:      kind: att.kind,
src\app\[locale]\app\projects\[id]\thread-actions.ts:340:        kind: "thread_message_new",
src\app\[locale]\app\projects\[id]\thread-actions.ts:447:        kind: "thread_mention",
src\app\[locale]\app\projects\[id]\brief\actions.ts:1013:    kind: "project_brief_yagi_request",

 succeeded in 487ms:
1:-- Phase 4.x -- task_01 -- workspace.kind + projects.twin_intent + projects.kind enum + project_licenses
2:
3:-- ============================================================
4:-- 1. workspaces.kind
5:-- ============================================================
6:ALTER TABLE workspaces
7:  ADD COLUMN kind text NOT NULL DEFAULT 'brand'
8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
9:
10:-- Existing rows = 'brand' (rational default at this stage)
11:-- yagi_admin workspace requires a MANUAL UPDATE after verify
12:UPDATE workspaces SET kind = 'brand' WHERE kind IS NULL;
13:
14:CREATE INDEX idx_workspaces_kind ON workspaces(kind);
15:
16:-- ============================================================
17:-- 2. projects.twin_intent
18:-- ============================================================
19:ALTER TABLE projects
20:  ADD COLUMN twin_intent text NOT NULL DEFAULT 'undecided'
21:    CHECK (twin_intent IN ('undecided', 'specific_in_mind', 'no_twin'));
22:
23:-- ============================================================
24:-- 3. projects.kind enum expansion
25:-- ============================================================
26:ALTER TABLE projects
27:  DROP CONSTRAINT IF EXISTS projects_kind_check;
28:
29:ALTER TABLE projects
30:  ADD CONSTRAINT projects_kind_check CHECK (kind IN (
31:    'direct',
32:    'inbound_brand_to_artist',
33:    'talent_initiated_creative',
34:    'talent_initiated_self_ad',
35:    'talent_initiated_brand_passthrough',
36:    'talent_initiated_footage_upgrade'
37:  ));
38:
39:-- Existing data stays 'direct' (NOT NULL, no backfill needed)
40:
41:-- ============================================================
42:-- 4. project_licenses (Phase 6 fills in; Phase 4 = schema + RLS only)
43:-- ============================================================
44:CREATE TABLE project_licenses (
45:  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
46:  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
47:  campaign_name text NOT NULL,
48:  region text NOT NULL DEFAULT 'KR'
49:    CHECK (region IN ('KR', 'JP', 'US', 'EU', 'ASIA', 'GLOBAL')),
50:  start_date date NOT NULL,
51:  end_date date,  -- NULL allowed (perpetual; explicit end is the default)
52:  fee_amount_krw bigint NOT NULL DEFAULT 0,
53:  fee_currency text NOT NULL DEFAULT 'KRW',
54:  artist_share_percent integer NOT NULL DEFAULT 0
55:    CHECK (artist_share_percent BETWEEN 0 AND 100),
56:  status text NOT NULL DEFAULT 'draft'
57:    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
58:  created_at timestamptz NOT NULL DEFAULT now(),
59:  updated_at timestamptz NOT NULL DEFAULT now(),
60:  created_by uuid NOT NULL REFERENCES profiles(id)
61:);
62:
63:CREATE INDEX idx_project_licenses_project ON project_licenses(project_id);
64:CREATE INDEX idx_project_licenses_status ON project_licenses(status);
65:
66:-- RLS
67:ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;
68:
69:-- SELECT: yagi_admin (all rows) + project owner client (own rows)
70:CREATE POLICY "project_licenses_select_admin" ON project_licenses
71:  FOR SELECT TO authenticated
72:  USING (
73:    EXISTS (
74:      SELECT 1 FROM profiles
75:      WHERE id = auth.uid() AND role = 'yagi_admin'
76:    )
77:  );
78:
79:-- Phase 4.x BLOCKER 1 fix (2026-05-01): KICKOFF spec referenced
80:-- projects.owner_id but the actual ownership column is created_by.
81:-- yagi confirmed option B: amend the policy to match the schema.
82:CREATE POLICY "project_licenses_select_owner" ON project_licenses
83:  FOR SELECT TO authenticated
84:  USING (
85:    project_id IN (
86:      SELECT id FROM projects WHERE created_by = auth.uid()
87:    )
88:  );
89:
90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
91:CREATE POLICY "project_licenses_write_admin" ON project_licenses
92:  FOR ALL TO authenticated
93:  USING (
94:    EXISTS (
95:      SELECT 1 FROM profiles
96:      WHERE id = auth.uid() AND role = 'yagi_admin'
97:    )
98:  )
99:  WITH CHECK (
100:    EXISTS (
101:      SELECT 1 FROM profiles
102:      WHERE id = auth.uid() AND role = 'yagi_admin'
103:    )
104:  );
105:
106:-- updated_at trigger
107:-- NOTE: KICKOFF spec references update_updated_at_column() but that function
108:-- only exists in the storage schema. The public equivalent in this codebase
109:-- is public.tg_touch_updated_at() -- using that here.
110:CREATE TRIGGER project_licenses_updated_at_trigger
111:  BEFORE UPDATE ON project_licenses
112:  FOR EACH ROW
113:  EXECUTE FUNCTION public.tg_touch_updated_at();

 succeeded in 541ms:
4474:
4475:--
4476:-- Name: workspaces ws_create_any_auth; Type: POLICY; Schema: public; Owner: -
4477:--
4478:
4479:CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
4480:
4481:
4482:--
4483:-- Name: workspaces ws_delete_yagi; Type: POLICY; Schema: public; Owner: -
4484:--
4485:
4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
4487:
4488:
4489:--
4490:-- Name: workspace_invitations ws_inv_read_admin; Type: POLICY; Schema: public; Owner: -
4491:--
4492:
4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4494:
4495:
4496:--
4497:-- Name: workspace_invitations ws_inv_write_admin; Type: POLICY; Schema: public; Owner: -
4498:--
4499:
4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4501:
4502:
4503:--
4504:-- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
4505:--
4506:
4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4508:
4509:
4510:--
4511:-- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
4512:--
4513:
4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4515:
4516:
4517:--
4518:-- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
4519:--
4520:
4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
4522:   FROM public.workspace_members m
4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4524:
4525:
4526:--
4527:-- Name: workspaces ws_read_members; Type: POLICY; Schema: public; Owner: -
4528:--
4529:
4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
4531:
4532:
4533:--
4534:-- Name: workspaces ws_update_admin; Type: POLICY; Schema: public; Owner: -
4535:--
4536:
4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
4538:
4539:
4540:--

 succeeded in 557ms:
1578:    title text,
1579:    created_by uuid NOT NULL,
1580:    created_at timestamp with time zone DEFAULT now() NOT NULL
1581:);
1582:
1583:
1584:--
1585:-- Name: projects; Type: TABLE; Schema: public; Owner: -
1586:--
1587:
1588:CREATE TABLE public.projects (
1589:    id uuid DEFAULT gen_random_uuid() NOT NULL,
1590:    workspace_id uuid NOT NULL,
1591:    brand_id uuid,
1592:    project_type text DEFAULT 'direct_commission'::text NOT NULL,
1593:    created_by uuid NOT NULL,
1594:    title text NOT NULL,
1595:    brief text,
1596:    deliverable_types text[] DEFAULT '{}'::text[] NOT NULL,
1597:    estimated_budget_range text,
1598:    target_delivery_at timestamp with time zone,
1599:    status text DEFAULT 'draft'::text NOT NULL,
1600:    created_at timestamp with time zone DEFAULT now() NOT NULL,
1601:    updated_at timestamp with time zone DEFAULT now() NOT NULL,
1602:    intake_mode text DEFAULT 'brief'::text NOT NULL,
1603:    proposal_goal text,
1604:    proposal_audience text,
1605:    proposal_budget_range text,
1606:    proposal_timeline text,
1607:    CONSTRAINT projects_intake_mode_check CHECK ((intake_mode = ANY (ARRAY['brief'::text, 'proposal_request'::text]))),
1608:    CONSTRAINT projects_project_type_check CHECK ((project_type = ANY (ARRAY['direct_commission'::text, 'contest_brief'::text]))),
1609:    CONSTRAINT projects_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_discovery'::text, 'in_production'::text, 'in_revision'::text, 'delivered'::text, 'approved'::text, 'archived'::text])))
1610:);
1611:
1612:
1613:--
1614:-- Name: showcase_media; Type: TABLE; Schema: public; Owner: -
1615:--
1616:
1617:CREATE TABLE public.showcase_media (
1618:    id uuid DEFAULT gen_random_uuid() NOT NULL,
1619:    showcase_id uuid NOT NULL,
1620:    sort_order integer NOT NULL,
1621:    media_type text NOT NULL,
1622:    storage_path text,
1623:    external_url text,
1624:    embed_provider text,
1625:    caption text,
3468:
3469:ALTER TABLE ONLY public.project_threads
3470:    ADD CONSTRAINT project_threads_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
3471:
3472:
3473:--
3474:-- Name: projects projects_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
3475:--
3476:
3477:ALTER TABLE ONLY public.projects
3478:    ADD CONSTRAINT projects_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;
3479:
3480:
3481:--
3482:-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260429124343_phase_3_1_k05_loop_1_fixes.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/app/[locale]/app/layout.tsx'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 412ms:
1:-- Phase 3.1 hotfix-3 K-05 Loop 1 fix ??add_project_board_url jsonb correction
2:-- Use to_jsonb() for nullable text fields (title, thumbnail_url, note)
3:-- COALESCE with ::jsonb cast was broken for non-null string values.
4:CREATE OR REPLACE FUNCTION add_project_board_url(
5:  p_board_id      uuid,
6:  p_url           text,
7:  p_title         text,
8:  p_thumbnail_url text,
9:  p_provider      text,
10:  p_note          text
11:) RETURNS uuid
12:LANGUAGE plpgsql
13:SECURITY DEFINER
14:SET search_path = public, pg_temp
15:AS $$
16:DECLARE
17:  v_caller_id  uuid := auth.uid();
18:  v_project_id uuid;
19:  v_is_locked  boolean;
20:  v_is_admin   boolean;
21:  v_new_id     uuid := gen_random_uuid();
22:  v_url_count  int;
23:BEGIN
24:  IF v_caller_id IS NULL THEN
25:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
26:  END IF;
27:
28:  SELECT pb.project_id, pb.is_locked
29:  INTO v_project_id, v_is_locked
30:  FROM project_boards pb
31:  WHERE pb.id = p_board_id;
32:
33:  IF NOT FOUND THEN
34:    RAISE EXCEPTION 'add_project_board_url: board not found';
35:  END IF;
36:
37:  v_is_admin := is_yagi_admin(v_caller_id);
38:  IF NOT v_is_admin AND NOT EXISTS (
39:    SELECT 1 FROM projects p
40:    WHERE p.id = v_project_id AND p.created_by = v_caller_id
41:  ) THEN
42:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
43:  END IF;
44:
45:  IF v_is_locked AND NOT v_is_admin THEN
46:    RAISE EXCEPTION 'add_project_board_url: board is locked';
47:  END IF;
48:
49:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
50:  FROM project_boards WHERE id = p_board_id;
51:  IF v_url_count >= 50 THEN
52:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
53:  END IF;
54:
55:  IF p_url IS NULL OR length(p_url) = 0 OR length(p_url) > 2000 THEN
56:    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
57:  END IF;
58:
59:  IF p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%' THEN
60:    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
61:  END IF;
62:
63:  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
64:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
65:  END IF;
66:
67:  UPDATE project_boards
68:  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
69:    'id',            v_new_id::text,
70:    'url',           p_url,
71:    'title',         to_jsonb(p_title),
72:    'thumbnail_url', to_jsonb(p_thumbnail_url),
73:    'provider',      COALESCE(p_provider, 'generic'),
74:    'note',          to_jsonb(p_note),
75:    'added_at',      now()::text,
76:    'added_by',      v_caller_id::text
77:  )), updated_at = now()
78:  WHERE id = p_board_id;
79:
80:  RETURN v_new_id;
81:END;
82:$$;

 succeeded in 436ms:
1:-- ============================================================
2:-- Phase 3.1 K-05 LOOP 1 fixes
3:-- HIGH-A F1: seed_project_board_from_wizard cross-tenant write prevention
4:--   - Reject anon callers (auth.uid() IS NULL)
5:--   - Require projects.created_by = auth.uid()
6:-- HIGH-B F5: support pre-computed asset_index seed (server-computed at submit)
7:-- ============================================================
8:
9:-- Drop and recreate seed_project_board_from_wizard with auth gate + asset_index param
10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
11:  p_project_id      uuid,
12:  p_initial_document jsonb,
13:  p_initial_asset_index jsonb DEFAULT '[]'::jsonb
14:)
15:RETURNS uuid
16:LANGUAGE plpgsql
17:SECURITY DEFINER
18:SET search_path = public
19:AS $$
20:DECLARE
21:  v_board_id uuid;
22:  v_project_status text;
23:  v_project_owner uuid;
24:  v_caller uuid;
25:BEGIN
26:  -- K-05 HIGH-A F1: reject anon callers and non-owners
27:  v_caller := auth.uid();
28:  IF v_caller IS NULL THEN
29:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
30:  END IF;
31:
32:  SELECT status, created_by INTO v_project_status, v_project_owner
33:  FROM projects
34:  WHERE id = p_project_id;
35:
36:  IF v_project_status IS NULL THEN
37:    RAISE EXCEPTION 'project not found: %', p_project_id;
38:  END IF;
39:
40:  -- K-05 HIGH-A F1: caller must own the project (cross-tenant write prevention)
41:  IF v_project_owner IS DISTINCT FROM v_caller THEN
42:    RAISE EXCEPTION 'seed_project_board_from_wizard: caller % does not own project %', v_caller, p_project_id;
43:  END IF;
44:
45:  IF v_project_status != 'in_review' THEN
46:    RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
47:      p_project_id, v_project_status;
48:  END IF;
49:
50:  INSERT INTO project_boards (project_id, document, asset_index, source)
51:  VALUES (p_project_id, p_initial_document, COALESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
52:  ON CONFLICT (project_id) DO UPDATE
53:    SET document     = EXCLUDED.document,
54:        asset_index  = EXCLUDED.asset_index,
55:        source       = 'wizard_seed',
56:        updated_at   = now()
57:  RETURNING id INTO v_board_id;
58:
59:  RETURN v_board_id;
60:END;
61:$$;
62:
63:REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;

 succeeded in 382ms:
1:-- ============================================================
2:-- Phase 3.1 K-05 LOOP 2 fix
3:-- HIGH-A residual: Postgres function overloading.
4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
5:-- in 20260429113853 was NOT replaced by the 3-arg version in 20260429124343.
6:-- Both signatures coexisted; the 2-arg version still lacked the auth.uid()/owner gate.
7:-- Fix: explicitly DROP the unsafe 2-arg signature so only the auth-gated 3-arg
8:-- version remains callable.
9:-- ============================================================
10:
11:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);

 succeeded in 415ms:
1:import { redirect } from "@/i18n/routing";
2:import { fetchAppContext } from "@/lib/app/context";
3:import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
4:import {
5:  resolveActiveWorkspace,
6:  listOwnWorkspaces,
7:} from "@/lib/workspace/active";
8:import { NotificationBell } from "@/components/app/notification-bell";
9:import { PageHelpLink } from "@/components/app/page-help-link";
10:import { LanguageSwitcher } from "@/components/app/language-switcher";
11:import { createSupabaseServer } from "@/lib/supabase/server";
12:import { getUserScopes } from "@/lib/app/scopes";
13:import { UserScopesProvider } from "@/lib/app/use-user-scopes";
14:import { SupportWidget } from "@/components/support/support-widget";
15:
16:export default async function AppLayout({
17:  children,
18:  params,
19:}: {
20:  children: React.ReactNode;
21:  params: Promise<{ locale: string }>;
22:}) {
23:  const { locale } = await params;
24:
25:  const supabase = await createSupabaseServer();
26:  const {
27:    data: { user },
28:  } = await supabase.auth.getUser();
29:  if (!user) redirect({ href: "/signin", locale });
30:
31:  const ctx = await fetchAppContext();
32:  if (!ctx) {
33:    redirect({ href: "/onboarding", locale });
34:    return null;
35:  }
36:
37:  const hasPrivilegedGlobalRole =
38:    ctx.workspaceRoles.includes("yagi_admin") ||
39:    ctx.workspaceRoles.includes("creator");
40:  // Phase 2.7: client persona doesn't need a workspace; their primary
41:  // surface is /app/commission.
42:  const isClient = ctx.profile.role === "client";
43:  if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
44:    redirect({ href: "/onboarding/workspace", locale });
45:    return null;
46:  }
47:
48:  // Seed the bell with the current unread count. Realtime takes over from here.
49:  const { count: initialUnreadCount } = await supabase
50:    .from("notification_events")
51:    .select("id", { count: "exact", head: true })
52:    .eq("user_id", ctx.userId)
53:    .is("in_app_seen_at", null);
54:
55:  const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";
56:
57:  const scopes = getUserScopes(ctx);
58:
59:  // Phase 4.x task_06 ??resolve active workspace + full membership list
60:  // for the sidebar workspace switcher. resolveActiveWorkspace reads the
61:  // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
62:  // returns every workspace the user belongs to (with workspaces.kind, which
63:  // null-safe-defaults to 'brand' until task_01 migration applies at Wave D).
64:  const [activeWorkspace, allWorkspaces] = await Promise.all([
65:    resolveActiveWorkspace(ctx.userId),
66:    listOwnWorkspaces(ctx.userId),
67:  ]);
68:
69:  return (
70:    <UserScopesProvider value={scopes}>
71:      <div className="min-h-dvh flex">
72:        <Sidebar
73:          context={ctx}
74:          activeWorkspace={activeWorkspace}
75:          workspaces={allWorkspaces}
76:        />
77:        <div className="flex-1 min-w-0 flex flex-col">
78:          <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
79:            <MobileSidebarSheet
80:              context={ctx}
81:              activeWorkspace={activeWorkspace}
82:              workspaces={allWorkspaces}
83:            />
84:            <div className="flex-1" />
85:            <PageHelpLink />
86:            <LanguageSwitcher />
87:            <NotificationBell
88:              initialUnreadCount={initialUnreadCount ?? 0}
89:              locale={bellLocale}
90:            />
91:          </header>
92:          <main className="flex-1 min-w-0">
93:            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
94:              {children}
95:            </div>
96:          </main>
97:        </div>
98:        {/* Phase 2.8.6 ??workspace-scoped support chat. Hidden when
99:            the user has no workspace (mid-onboarding edge case).
100:            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
101:            backed active workspace (resolved above for the sidebar)
102:            instead of ctx.workspaces[0], so admins with multiple
103:            memberships chat against the workspace they actually selected. */}
104:        <SupportWidget
105:          workspaceId={activeWorkspace?.id ?? null}
106:          currentUserId={ctx.userId}
107:          currentUserName={ctx.profile.display_name ?? ""}
108:        />
109:      </div>
110:    </UserScopesProvider>
111:  );
112:}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"GRANT .* ON TABLE public\\.(workspaces|projects|profiles|user_roles|project_licenses)|GRANT .* ON ALL TABLES|ALTER DEFAULT PRIVILEGES.*TABLES|REVOKE UPDATE ON (workspaces|projects|profiles|user_roles)|GRANT UPDATE \\(\" supabase/migrations" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "CREATE POLICY .*profiles|profiles_update_self|user_roles.*UPDATE|CREATE POLICY .*user_roles|workspaces.*UPDATE|projects_update|FOR UPDATE TO authenticated" supabase/migrations/20260422120000_phase_2_0_baseline.sql supabase/migrations/20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql supabase/migrations/20260428070000_phase_2_8_6_review_loop_2.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "CREATE POLICY .*projects|projects_update|DROP POLICY.*projects_update|FOR UPDATE.*projects|validate_project|transition_project|status" supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql supabase/migrations/20260428070000_phase_2_8_6_review_loop_2.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 390ms:
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;

 succeeded in 462ms:
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:61:-- 3. RLS — replace projects_update ------------------------------------
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:63:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:66:  FOR UPDATE TO authenticated
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:8:-- Finding 1 — projects_update WITH CHECK gap
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:32:-- 1. projects_update — tighten WITH CHECK ----------------------------
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:34:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:37:  FOR UPDATE TO authenticated
supabase/migrations/20260428070000_phase_2_8_6_review_loop_2.sql:32:  FOR UPDATE TO authenticated
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:86:  FOR UPDATE TO authenticated
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:149:  FOR UPDATE TO authenticated
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3154:CREATE TRIGGER workspaces_touch BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4047:-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4134:-- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4440:CREATE POLICY user_roles_self_insert_creator ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'creator'::text) AND (workspace_id IS NULL)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4551:CREATE POLICY avatars_update ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'avatars'::text) AND (owner = auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));

 succeeded in 392ms:
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:8:--   only `created_by = auth.uid()` and request-window status without
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:34:--   support_threads_update RLS allowed the client to flip status to
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:36:--   client-owner UPDATE permitted but NOT for status changes
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:37:--   (enforced via WITH CHECK that pins status to its current value
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:39:--   the policy so the client lane allows updates only when status
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:93:      AND status IN ('requested', 'rescheduled')
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:102:      AND status IN ('requested', 'rescheduled', 'cancelled')
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:118:      AND status = 'open'
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:133:        AND t.status = 'open'
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:144:-- 5. support_threads_update — only yagi_admin may flip status ------
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:158:      -- Client lane: status MUST remain its current value. Postgres
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:160:      -- OLD here; the status pin is enforced via the trigger below.
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:166:-- from changing status when they pass through the client lane, install
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:168:-- and the status column changed.
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:170:CREATE OR REPLACE FUNCTION public.support_threads_pin_status_for_client()
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:177:  IF NEW.status IS DISTINCT FROM OLD.status
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:180:    RAISE EXCEPTION 'support thread status is admin-only'
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:186:REVOKE ALL ON FUNCTION public.support_threads_pin_status_for_client() FROM PUBLIC;
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:188:DROP TRIGGER IF EXISTS support_threads_pin_status_for_client ON public.support_threads;
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:189:CREATE TRIGGER support_threads_pin_status_for_client
supabase/migrations/20260428060000_phase_2_8_6_review_loop_1.sql:192:  EXECUTE FUNCTION public.support_threads_pin_status_for_client();
supabase/migrations/20260428070000_phase_2_8_6_review_loop_2.sql:11:-- The status-pin trigger only guarded `status`; it did not block
supabase/migrations/20260428070000_phase_2_8_6_review_loop_2.sql:21:-- The status-pin trigger from LOOP 1 is now redundant (no client lane
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:6:--   unexpected_status_count = 0  (1 row, status='submitted' — valid in both old/new)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:9:--   project_status_history table does not exist yet
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:24:--                       via transition_project_status RPC. Only used by direct
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:25:--                       DB write from server action (status='in_review' set
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:28:-- Realtime decision: ENABLED on project_status_history per task recommendation.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:32:--   NEW.status IS DISTINCT FROM OLD.status AND the caller is not the SECURITY
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:37:--   policy while still blocking any direct status mutation.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:41:--   L-020: both ALTER PUBLICATION + GRANT for project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:53:-- A-1. Replace status CHECK constraint with the new 9-state set.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:54:--      The existing constraint name is projects_status_check (confirmed via
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:58:  DROP CONSTRAINT IF EXISTS projects_status_check;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:61:  ADD CONSTRAINT projects_status_check
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:62:    CHECK (status = ANY (ARRAY[
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:74:COMMENT ON COLUMN public.projects.status IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:78:  'transition_project_status() RPC or submitProjectAction server action '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:125:  'Set by transition_project_status() RPC or submitProjectAction server action. '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:129:-- SECTION B: CREATE TABLE project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:131:-- from_status is NULL only for an initial-creation sentinel row (if ever
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:132:-- inserted). All RPC-driven transitions insert a non-null from_status.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:135:CREATE TABLE IF NOT EXISTS public.project_status_history (
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:139:  from_status      text        NULL,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:140:  to_status        text        NOT NULL,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:151:CREATE INDEX IF NOT EXISTS project_status_history_project_id_idx
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:152:  ON public.project_status_history (project_id, transitioned_at DESC);
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:154:COMMENT ON TABLE public.project_status_history IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:156:  'Written exclusively by transition_project_status() RPC (SECURITY DEFINER). '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:160:ALTER PUBLICATION supabase_realtime ADD TABLE public.project_status_history;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:161:GRANT SELECT ON public.project_status_history TO authenticated, anon;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:276:  from_status text,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:277:  to_status   text,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:292:        WHEN from_status = 'draft'        AND to_status = 'submitted'   THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:294:        WHEN from_status = 'in_progress'  AND to_status = 'in_revision' THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:296:        WHEN from_status = 'delivered'    AND to_status = 'in_revision' THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:298:        WHEN from_status = 'delivered'    AND to_status = 'approved'    THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:300:        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:309:        WHEN from_status = 'in_review'    AND to_status = 'in_progress' THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:310:        WHEN from_status = 'in_revision'  AND to_status = 'in_progress' THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:311:        WHEN from_status = 'in_progress'  AND to_status = 'delivered'   THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:312:        WHEN from_status = 'approved'     AND to_status = 'archived'    THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:314:        WHEN to_status = 'cancelled' AND from_status = ANY (ARRAY[
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:324:        WHEN from_status = 'submitted' AND to_status = 'in_review' THEN true
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:334:  'Called by transition_project_status() before any write. '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:342:-- SECTION E: FUNCTION transition_project_status
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:344:-- SECURITY DEFINER RPC — the sole legal path for client/admin status changes.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:346:-- guard (Section F) knows to allow the status column write.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:365:CREATE OR REPLACE FUNCTION public.transition_project_status(
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:367:  p_to_status  text,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:378:  v_from_status text;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:397:  SELECT status, created_by, workspace_id
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:398:    INTO v_from_status, v_created_by, v_workspace_id
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:434:  IF p_to_status = 'in_revision' THEN
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:442:  IF NOT public.is_valid_transition(v_from_status, p_to_status, v_actor_role) THEN
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:444:      v_from_status, p_to_status, v_actor_role
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:448:  -- 9. Signal trigger guard to allow status column write
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:453:     SET status       = p_to_status,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:456:                          WHEN p_to_status = 'submitted' THEN now()
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:462:  INSERT INTO public.project_status_history (
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:464:    from_status,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:465:    to_status,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:471:    v_from_status,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:472:    p_to_status,
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:486:COMMENT ON FUNCTION public.transition_project_status(uuid, text, text) IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:488:  'project status transitions. Validates via is_valid_transition(), enforces '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:489:  'comment requirement for in_revision, writes project_status_history row, '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:493:REVOKE ALL ON FUNCTION public.transition_project_status(uuid, text, text) FROM PUBLIC;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:494:GRANT EXECUTE ON FUNCTION public.transition_project_status(uuid, text, text)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:498:-- SECTION F: Trigger guard — block direct status mutation on projects
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:501:--   NEW.status IS DISTINCT FROM OLD.status
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:506:--   - wizard autosave (draft edits) — status unchanged → trigger no-ops
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:507:--   - transition_project_status() RPC — sets the session flag → passes
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:512:--     call transition_project_status() for submitted→in_review.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:517:-- would block ALL updates from clients, including wizard autosave of non-status
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:519:-- is more surgical — it fires only on status column change.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:521:CREATE OR REPLACE FUNCTION public.guard_projects_status_direct_update()
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:528:  -- Only intervene when status is being changed
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:529:  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:543:  -- Block all other direct status mutations
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:545:    'direct_status_update_forbidden: use transition_project_status() RPC'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:549:DROP TRIGGER IF EXISTS trg_guard_projects_status ON public.projects;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:551:CREATE TRIGGER trg_guard_projects_status
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:554:  EXECUTE FUNCTION public.guard_projects_status_direct_update();
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:556:COMMENT ON FUNCTION public.guard_projects_status_direct_update() IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:558:  'caller attempts a direct status column change outside the '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:559:  'transition_project_status() RPC. Exceptions: (1) transition RPC sets '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:563:-- SECTION G: RLS — project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:566:ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:569:DROP POLICY IF EXISTS psh_select_client ON public.project_status_history;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:570:CREATE POLICY psh_select_client ON public.project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:575:       WHERE p.id = project_status_history.project_id
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:581:DROP POLICY IF EXISTS psh_select_admin ON public.project_status_history;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:582:CREATE POLICY psh_select_admin ON public.project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:588:DROP POLICY IF EXISTS psh_insert_deny ON public.project_status_history;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:589:CREATE POLICY psh_insert_deny ON public.project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:594:DROP POLICY IF EXISTS psh_update_deny ON public.project_status_history;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:595:CREATE POLICY psh_update_deny ON public.project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:600:DROP POLICY IF EXISTS psh_delete_deny ON public.project_status_history;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:601:CREATE POLICY psh_delete_deny ON public.project_status_history
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:675:-- SECTION I: RLS — projects UPDATE policy (tighten for status guard)
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:677:-- The existing projects_update policy (from Phase 2.8.2 hardening) allows
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:679:-- Section F handles the status-column-specific blocking. The RLS policy
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:681:-- their own draft-status project (for wizard autosave), while keeping the
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:684:-- Note: the trigger guard is the enforcement layer for status column changes.
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:686:-- We tighten: client (created_by) may UPDATE own rows where status='draft'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:689:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:697:      AND status = 'draft'
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:723:COMMENT ON POLICY projects_update ON public.projects IS
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:727:  'trg_guard_projects_status trigger — only transition_project_status() RPC '
supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql:728:  'or yagi_admin may change projects.status.';
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:61:-- 3. RLS — replace projects_update ------------------------------------
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:63:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:8:-- Finding 1 — projects_update WITH CHECK gap
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:32:-- 1. projects_update — tighten WITH CHECK ----------------------------
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:34:DROP POLICY IF EXISTS projects_update ON public.projects;
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:68:  v_status text;
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:78:  SELECT pb.status, pb.current_version, pb.content_json
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:79:    INTO v_status, v_current_version, v_content
supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql:107:  IF v_status = 'locked' THEN

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=686; $i -le 722; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=61; $i -le 95; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "DROP POLICY IF EXISTS projects_update|CREATE POLICY projects_update|FOR UPDATE TO authenticated" supabase/migrations/20260428*.sql supabase/migrations/20260429*.sql supabase/migrations/202605*.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=32; $i -le 55; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 487ms:
686:    -- yagi_admin: unrestricted (including trashed project restore)
687:    OR public.is_yagi_admin(auth.uid())
688:  )
689:  WITH CHECK (
690:    -- Client: own project, non-deleted only (no writing deleted_at)
691:    (
692:      auth.uid() = created_by
693:      AND deleted_at IS NULL
694:    )
695:    -- ws_admin: non-deleted only (cannot self-trash via update)
696:    OR (
697:      public.is_ws_admin(auth.uid(), workspace_id)
698:      AND deleted_at IS NULL
699:    )
700:    -- yagi_admin: unrestricted
701:    OR public.is_yagi_admin(auth.uid())
702:  );
703:
704:COMMENT ON POLICY projects_update ON public.projects IS
705:  'Phase 3.0 ??client may UPDATE own draft rows (wizard autosave). '
706:  'ws_admin may UPDATE any non-deleted project in workspace. '
707:  'yagi_admin unrestricted. Status column changes are additionally gated by '
708:  'trg_guard_projects_status trigger ??only transition_project_status() RPC '
709:  'or yagi_admin may change projects.status.';
710:
711:COMMIT;
712:
713:
714:
715:
716:
717:
718:
719:
720:
721:
722:

 succeeded in 521ms:
61:-- 3. RLS ??replace projects_update ------------------------------------
62:
63:DROP POLICY IF EXISTS projects_update ON public.projects;
64:
65:CREATE POLICY projects_update ON public.projects
66:  FOR UPDATE TO authenticated
67:  USING (
68:    (
69:      public.is_ws_admin(auth.uid(), workspace_id)
70:      AND deleted_at IS NULL
71:    )
72:    OR public.is_yagi_admin(auth.uid())
73:  )
74:  WITH CHECK (
75:    public.is_ws_admin(auth.uid(), workspace_id)
76:    OR public.is_yagi_admin(auth.uid())
77:  );
78:
79:-- 4. cron ??hard-delete trash older than 3 days ----------------------
80:
81:DO $$
82:BEGIN
83:  IF EXISTS (
84:    SELECT 1 FROM cron.job WHERE jobname = 'projects-hard-delete-trash'
85:  ) THEN
86:    PERFORM cron.unschedule('projects-hard-delete-trash');
87:  END IF;
88:END
89:$$;
90:
91:SELECT cron.schedule(
92:  'projects-hard-delete-trash',
93:  '13 */6 * * *',
94:  $cron$
95:  DELETE FROM public.projects p

2026-05-03T18:06:01.447679Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: supabase/migrations/20260428*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: supabase/migrations/20260429*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: supabase/migrations/202605*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 423ms:
rg: supabase/migrations/20260428*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: supabase/migrations/20260429*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: supabase/migrations/202605*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 succeeded in 503ms:
32:-- 1. projects_update ??tighten WITH CHECK ----------------------------
33:
34:DROP POLICY IF EXISTS projects_update ON public.projects;
35:
36:CREATE POLICY projects_update ON public.projects
37:  FOR UPDATE TO authenticated
38:  USING (
39:    (
40:      public.is_ws_admin(auth.uid(), workspace_id)
41:      AND deleted_at IS NULL
42:    )
43:    OR public.is_yagi_admin(auth.uid())
44:  )
45:  WITH CHECK (
46:    (
47:      public.is_ws_admin(auth.uid(), workspace_id)
48:      AND deleted_at IS NULL
49:    )
50:    OR public.is_yagi_admin(auth.uid())
51:  );
52:
53:-- 2. save_brief_version ??refuse trashed projects -------------------
54:
55:CREATE OR REPLACE FUNCTION public.save_brief_version(

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$files=@('"'src/app/[locale]/app/projects/page.tsx','src/app/[locale]/app/dashboard/page.tsx','src/app/[locale]/app/projects/new/page.tsx','src/app/[locale]/auth/verify/page.tsx','src/app/[locale]/auth/expired/page.tsx','src/app/[locale]/auth/layout.tsx','src/app/[locale]/(auth)/signin/page.tsx','src/app/[locale]/(auth)/signup/page.tsx','src/app/[locale]/(auth)/forgot-password/page.tsx'); foreach("'$p in $files){ Write-Output "--- $p"; $lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'src/lib/r2/client.ts'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "function setActiveWorkspace|ACTIVE_WORKSPACE_COOKIE|workspaceId" src | rg "workspace|active"' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 544ms:
1:import { S3Client } from "@aws-sdk/client-s3";
2:import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
3:import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
4:
5:function requireEnv(name: string): string {
6:  const v = process.env[name];
7:  if (!v) throw new Error(`[r2] missing env ${name}`);
8:  return v;
9:}
10:
11:export const BUCKET =
12:  process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "yagi-challenge-submissions";
13:
14:// Lazy singleton ??instantiated on first real use. Non-upload paths
15:// (e.g., sitemap.ts) don't need this and shouldn't crash if creds missing.
16:let _client: S3Client | null = null;
17:function getClient(): S3Client {
18:  if (_client) return _client;
19:  _client = new S3Client({
20:    region: "auto",
21:    endpoint: requireEnv("CLOUDFLARE_R2_ENDPOINT"),
22:    credentials: {
23:      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
24:      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
25:    },
26:    // Defensive against AWS SDK v3 (>=3.729.0) auto-injecting
27:    // x-amz-checksum-crc32 + x-amz-sdk-checksum-algorithm headers/query on
28:    // PUT operations. When those land in a presigned URL, the browser-side
29:    // PUT signature mismatches what R2 verifies. Current SDK at 3.1035 + this
30:    // flag together emit a clean URL (verified: SignedHeaders=host only, no
31:    // checksum bits). The middleware below is belt-and-suspenders for future
32:    // SDK bumps.
33:    // Refs:
34:    //   https://github.com/aws/aws-sdk-js-v3/issues/6810
35:    //   https://github.com/aws/aws-sdk-js-v3/issues/6920
36:    requestChecksumCalculation: "WHEN_REQUIRED",
37:    responseChecksumValidation: "WHEN_REQUIRED",
38:  });
39:
40:  // Belt-and-suspenders: strip any flexible-checksum artifacts at the build
41:  // stage BEFORE getSignedUrl signs the request. Currently a no-op at SDK
42:  // 3.1035 with the config above, but protects against SDK upgrades that
43:  // re-introduce auto-injection.
44:  _client.middlewareStack.add(
45:    (next) => async (args) => {
46:      const req = args.request as {
47:        headers?: Record<string, string>;
48:        query?: Record<string, string | string[]>;
49:      };
50:      if (req.headers) {
51:        for (const k of Object.keys(req.headers)) {
52:          const lk = k.toLowerCase();
53:          if (
54:            lk === "x-amz-sdk-checksum-algorithm" ||
55:            lk.startsWith("x-amz-checksum-")
56:          ) {
57:            delete req.headers[k];
58:          }
59:        }
60:      }
61:      if (req.query) {
62:        for (const k of Object.keys(req.query)) {
63:          const lk = k.toLowerCase();
64:          if (
65:            lk === "x-amz-sdk-checksum-algorithm" ||
66:            lk.startsWith("x-amz-checksum-")
67:          ) {
68:            delete req.query[k];
69:          }
70:        }
71:      }
72:      return next(args);
73:    },
74:    { step: "build", name: "stripChecksumHeaders", priority: "high" }
75:  );
76:
77:  return _client;
78:}
79:
80:/**
81: * Generate a presigned PUT URL for uploading an object.
82: * Default expiry 3600s (1h) ??enough for large video uploads.
83: * Path convention (caller's responsibility):
84: *   tmp/<challenge_id>/<client_uuid>/<filename>   (pre-confirm)
85: *   submissions/<challenge_id>/<submission_id>/<filename>  (post-atomic move)
86: */
87:export async function createPresignedPutUrl(
88:  key: string,
89:  contentType: string,
90:  expiresSeconds = 3600
91:): Promise<string> {
92:  const cmd = new PutObjectCommand({
93:    Bucket: BUCKET,
94:    Key: key,
95:    ContentType: contentType,
96:  });
97:  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
98:}
99:
100:/**
101: * Public URL for serving an uploaded object.
102: * Uses the R2 endpoint directly. If CLOUDFLARE_R2_PUBLIC_BASE is set
103: * in the future, prefer that for custom-domain serving.
104: */
105:export function objectPublicUrl(key: string): string {
106:  const base =
107:    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
108:    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BUCKET}`;
109:  return `${base}/${key}`;
110:}
111:
112:/**
113: * Re-export the SDK client getter for advanced ops (CopyObject, HeadObject, DeleteObject).
114: * Server actions in src/app/challenges/[slug]/submit/actions.ts will use this for the
115: * tmp/ ??submissions/ atomic move + upload verification.
116: */
117:export { getClient as getR2Client };
118:
119:// =============================================================================
120:// Phase 2.8 ??Brief Board asset bucket helpers
121:// =============================================================================
122:// Per SPEC 짠3.3 brief assets live in an existing R2 bucket under a new
123:// `project-briefs/<project_id>/<uuid>.<ext>` prefix. SPEC says zero new
124:// dependencies and reuse Phase 1.x SDK integration ??the BRIEF_BUCKET
125:// constant defaults to `yagi-commission-files` (the per-Q-059 commission/
126:// project-files bucket) and is overridable via env for future separation.
127://
128:// Note: presigned URLs are generated server-side; the client uploads the
129:// blob directly to R2 via the returned URL. Direct browser ??R2 PUT keeps
130:// large files off our server.
131:
132:export const BRIEF_BUCKET =
133:  process.env.CLOUDFLARE_R2_BRIEF_BUCKET ?? "yagi-commission-files";
134:
135:/**
136: * Public URL for a BRIEF_BUCKET object. Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix:
137: * the legacy `objectPublicUrl` builds a URL based on `BUCKET` (the challenge
138: * submissions bucket), but brief assets are written to `BRIEF_BUCKET`. When
139: * `CLOUDFLARE_R2_PUBLIC_BASE` is set (the Phase 3.1 prereq), it overrides
140: * regardless and is expected to point at the brief bucket's public URL. When
141: * unset, this helper at least targets the correct bucket via the R2 endpoint.
142: */
143:export function briefObjectPublicUrl(key: string): string {
144:  const base =
145:    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
146:    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BRIEF_BUCKET}`;
147:  return `${base}/${key}`;
148:}
149:
150:/**
151: * Generate a presigned PUT URL for a brief asset upload.
152: * Default expiry 600s ??uploads are debounced one-shot, not long-lived.
153: */
154:export async function createBriefAssetPutUrl(
155:  storageKey: string,
156:  contentType: string,
157:  expiresSeconds = 600
158:): Promise<string> {
159:  const cmd = new PutObjectCommand({
160:    Bucket: BRIEF_BUCKET,
161:    Key: storageKey,
162:    ContentType: contentType,
163:  });
164:  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
165:}
166:
167:/**
168: * Generate a presigned GET URL for a brief asset download / inline render.
169: * 1h expiry covers a typical edit session; the editor refreshes URLs lazily
170: * on remount, so users with very long sessions just refetch on next mount.
171: */
172:export async function createBriefAssetGetUrl(
173:  storageKey: string,
174:  expiresSeconds = 3600
175:): Promise<string> {
176:  const cmd = new GetObjectCommand({
177:    Bucket: BRIEF_BUCKET,
178:    Key: storageKey,
179:  });
180:  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
181:}

 succeeded in 700ms:
--- src/app/[locale]/app/projects/page.tsx
1:import { getTranslations } from "next-intl/server";
2:import { Link, redirect } from "@/i18n/routing";
3:import { createSupabaseServer } from "@/lib/supabase/server";
4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
5:import { ProjectsHubHero } from "@/components/projects/projects-hub-hero";
6:import { ProjectsHubWorkflowStrip } from "@/components/projects/projects-hub-workflow-strip";
7:import { ProjectsHubCtaBanner } from "@/components/projects/projects-hub-cta-banner";
8:import { ProjectListCard } from "@/components/projects/project-list-card";
9:import { MeetingRequestCard } from "@/components/meetings/meeting-request-card";
10:
11:type Props = {
12:  params: Promise<{ locale: string }>;
13:  searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
14:};
15:
16:type ProjectRow = {
17:  id: string;
18:  title: string;
19:  status: string;
20:  project_type: string;
21:  updated_at: string;
22:  created_at: string;
23:  workspace_id: string;
24:  brand: { id: string; name: string; logo_url: string | null } | null;
25:};
26:
27:export default async function ProjectsPage({ params, searchParams }: Props) {
28:  const { locale } = await params;
29:  const sp = await searchParams;
30:
31:  const t = await getTranslations("projects");
32:
33:  // Phase 2.8.1 G_B1-I (F-PUX-007): Contest tab removed from the projects
34:  // hub. Workshop and Contest are separate products (DECISIONS_CACHE
35:  // Q-085); contest management lives in admin/challenges until Phase 3.0+.
36:  // Legacy ?tab=contest bookmarks now resolve to the direct-commission
37:  // list rather than 404.
38:
39:  const supabase = await createSupabaseServer();
40:
41:  // Wave C.5d sub_03e_1 ??Codex K-05 LOOP 1 MED-C (Finding 1): the
42:  // projects hub query previously had no workspace_id filter and relied
43:  // entirely on RLS, which lets a multi-workspace user see projects from
44:  // every membership while the switcher claims one workspace is active.
45:  // Resolve the active workspace up front, then pass it through both the
46:  // hub list query and the MeetingRequestCard card. The same id replaces
47:  // the duplicate primaryWorkspaceId fetch sub_03c added.
48:  const {
49:    data: { user },
50:  } = await supabase.auth.getUser();
51:  if (!user) {
52:    redirect({ href: "/signin", locale });
53:    return null;
54:  }
55:  const active = await resolveActiveWorkspace(user.id);
56:  if (!active) {
57:    redirect({ href: "/onboarding", locale });
58:    return null;
59:  }
60:  const activeWorkspaceId = active.id;
61:
62:  let query = supabase
63:    .from("projects")
64:    .select(
65:      `
66:      id,
67:      title,
68:      status,
69:      project_type,
70:      updated_at,
71:      created_at,
72:      workspace_id,
73:      brand:brands(id, name, logo_url)
74:    `
75:    )
76:    .eq("workspace_id", activeWorkspaceId)
77:    .eq("project_type", "direct_commission")
78:    .order("updated_at", { ascending: false });
79:
80:  if (sp.status) query = query.eq("status", sp.status);
81:  if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);
82:
83:  const { data, error } = await query;
84:  if (error) {
85:    console.error("[ProjectsPage] Supabase error:", error);
86:  }
87:
88:  const projects = (data ?? []) as ProjectRow[];
89:
90:  const primaryWorkspaceId: string | null = activeWorkspaceId;
91:
92:  // Resolve brand name for active brand_id filter chip
93:  const activeBrand =
94:    sp.brand_id && projects.length > 0
95:      ? (projects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
96:      : null;
97:
98:  // Build URL helper for filter removal
99:  const removeFilter = (key: "status" | "brand_id") => {
100:    const params = new URLSearchParams();
101:    if (key !== "status" && sp.status) params.set("status", sp.status);
102:    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
103:    const qs = params.toString();
104:    return `/app/projects${qs ? `?${qs}` : ""}`;
105:  };
106:
107:  return (
108:    <div className="px-10 py-10 max-w-5xl">
109:      {/* Header ??Phase 2.9 hotfix-2 Task 1: SUIT bold, larger size,
110:          tighter tracking. Reads as a real section title rather than a
111:          tab label. CTA pairing with "?꾨줈?앺듃 ?섎ː?섍린" preserved. */}
112:      <div className="flex items-center justify-between mb-6">
113:        <h1 className="font-suit text-3xl md:text-4xl font-bold tracking-tight text-foreground">
114:          {t("list_title")}
115:        </h1>
116:        <Link
117:          href="/app/projects/new"
118:          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
119:        >
120:          {t("new")}
121:        </Link>
122:      </div>
123:
124:      {/* Phase 2.8.1 G_B1-I: tab nav collapsed to a single (default) view ??          Contest is no longer surfaced from the projects hub. The
125:          contest_tab i18n key is preserved for the Phase 3.0+
126:          re-introduction (per DECISIONS_CACHE Q-086). */}
127:
128:      {/* Active filter chips */}
129:      {(sp.status || (sp.brand_id && activeBrand)) && (
130:        <div className="flex flex-wrap gap-2 mb-4">
131:          {sp.status && (
132:            <Link
133:              href={removeFilter("status")}
134:              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
135:            >
136:              {t(`status_${sp.status}` as Parameters<typeof t>[0])}
137:              <span aria-hidden>횞</span>
138:            </Link>
139:          )}
140:          {sp.brand_id && activeBrand && (
141:            <Link
142:              href={removeFilter("brand_id")}
143:              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
144:            >
145:              {activeBrand.name}
146:              <span aria-hidden>횞</span>
147:            </Link>
148:          )}
149:        </div>
150:      )}
151:
152:      {/* Phase 2.8.2 G_B2_A ??empty-state hero replaces the dashed-border
153:          placeholder. Hero shows 3 value props + primary CTA + 4-step
154:          workflow flow. The legacy empty_direct / empty_direct_sub keys
155:          are preserved for the dashboard's compact empty state and any
156:          future re-introduction; key names are non-negotiable per the
157:          phase kickoff 짠7. */}
158:      {projects.length === 0 && <ProjectsHubHero locale={locale} />}
159:
160:      {/* Phase 2.8.6 ??meeting request card is permanent (yagi: "泥?          ?꾨줈?앺듃 吏꾪뻾 ?댄썑?먮룄 ?⑥븘?덉쑝硫?醫뗭쓣??). Renders below the
161:          hero on empty state and below the grid header on populated
162:          state. The card disables itself if the user has no workspace
163:          yet (edge case during onboarding). */}
164:      <MeetingRequestCard workspaceId={primaryWorkspaceId} />
165:
166:      {/* Direct tab ??project grid (Wave C.5a sub_06: vertical card v1.0).
167:          Title top-left + status pill top-right + date bottom-right.
168:          Sage accent gated to in_review only. Brand chip moved out of
169:          this surface ??Phase 4 has no real brand-mixed list view yet,
170:          and the v1.0 grammar wants the title to carry the card. */}
171:      {projects.length > 0 && (
172:        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
173:          {projects.map((project) => (
174:            <ProjectListCard
175:              key={project.id}
176:              href={`/app/projects/${project.id}`}
177:              title={project.title}
178:              status={project.status}
179:              statusLabel={t(`status_${project.status}` as Parameters<typeof t>[0])}
180:              dateLabel={new Intl.DateTimeFormat(locale, {
181:                month: "short",
182:                day: "numeric",
183:              }).format(new Date(project.updated_at))}
184:            />
185:          ))}
186:        </div>
187:      )}
188:
189:      {/* Phase 2.9 G_B9_E + G_B9_F ??workflow strip + bottom CTA banner.
190:          Both render unconditionally so the hub feels editorial even
191:          for users with active projects. The hero block above is still
192:          empty-state-only (kickoff 짠6). */}
193:      <ProjectsHubWorkflowStrip locale={locale} />
194:      <ProjectsHubCtaBanner locale={locale} />
195:    </div>
196:  );
197:}
--- src/app/[locale]/app/dashboard/page.tsx
1:// Phase 4.x task_05 ??Brand workspace dashboard (/app/dashboard).
2://
3:// Renders 3 count cards (total / in-progress / delivered) + 5 most
4:// recent RFPs scoped to the active workspace via workspace_members
5:// RLS. Server-only data fetch.
6://
7:// Authorization: any workspace member can view their own workspace's
8:// dashboard. Cross-workspace SELECT is blocked by projects RLS (the
9:// SELECT policy already enforces workspace_member). The workspace_id
10:// comes from the user's first workspace membership (Phase 4 has
11:// single active workspace via cookie in task_06; for now Phase 4
12:// uses first-membership as the implicit active).
13://
14:// Design v1.0: 1280 max-width, achromatic + sage single accent (only
15:// on in-flight status pills inside RfpRowCard), Pretendard, radius 24
16:// cards, zero shadow.
17://
18:// Empty state surfaces a calm "no RFPs yet" + a CTA to start a new
19:// project. Critical: empty state must not leak counts or names from
20:// other workspaces.
21:
22:import Link from "next/link";
23:import { redirect } from "next/navigation";
24:import { notFound } from "next/navigation";
25:import { getTranslations } from "next-intl/server";
26:import { createSupabaseServer } from "@/lib/supabase/server";
27:import { resolveActiveWorkspace } from "@/lib/workspace/active";
28:import { CountCards } from "@/components/dashboard/count-cards";
29:import { RfpRowCard } from "@/components/dashboard/rfp-row-card";
30:
31:type Props = {
32:  params: Promise<{ locale: string }>;
33:};
34:
35:type RecentProjectRow = {
36:  id: string;
37:  title: string;
38:  brief: string | null;
39:  status: string;
40:  budget_band: string | null;
41:  twin_intent: string | null;
42:  created_at: string;
43:};
44:
45:const IN_PROGRESS_STATUSES = [
46:  "in_review",
47:  "submitted",
48:  "in_progress",
49:  "in_revision",
50:];
51:
52:function narrowTwinIntentLabel(
53:  value: string | null,
54:  map: Record<string, string>,
55:): string | null {
56:  if (!value) return null;
57:  return map[value] ?? null;
58:}
59:
60:export default async function DashboardPage({ params }: Props) {
61:  const { locale } = await params;
62:  const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
63:  const t = await getTranslations({ locale, namespace: "dashboard_v4" });
64:
65:  const supabase = await createSupabaseServer();
66:  const {
67:    data: { user },
68:  } = await supabase.auth.getUser();
69:  if (!user) redirect(`/${locale}/signin`);
70:
71:  // Wave C.5d sub_03c ??task_06 cookie resolver is now wired here so the
72:  // dashboard reflects the workspace the user actually selected in the
73:  // switcher (Codex K-05 final review LOOP 1 MED-C). resolveActiveWorkspace
74:  // validates the cookie's uuid against workspace_members and falls back
75:  // to the first membership only when the cookie is absent or stale.
76:  const active = await resolveActiveWorkspace(user.id);
77:  if (!active) {
78:    redirect(`/${locale}/onboarding`);
79:  }
80:  const workspaceId = active!.id;
81:
82:  // Phase 3.0/4.x columns not in generated types -> any-cast (consistent with detail page).
83:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not in generated types
84:  const sb = supabase as any;
85:
86:  // Counts: total, in-progress, delivered
87:  const [{ count: totalCount }, { count: inProgressCount }, { count: deliveredCount }] =
88:    await Promise.all([
89:      sb
90:        .from("projects")
91:        .select("id", { count: "exact", head: true })
92:        .eq("workspace_id", workspaceId)
93:        .neq("status", "archived"),
94:      sb
95:        .from("projects")
96:        .select("id", { count: "exact", head: true })
97:        .eq("workspace_id", workspaceId)
98:        .in("status", IN_PROGRESS_STATUSES),
99:      sb
100:        .from("projects")
101:        .select("id", { count: "exact", head: true })
102:        .eq("workspace_id", workspaceId)
103:        .eq("status", "delivered"),
104:    ]);
105:
106:  const total = totalCount ?? 0;
107:  const inProgress = inProgressCount ?? 0;
108:  const delivered = deliveredCount ?? 0;
109:
110:  // Recent 5 RFPs (created_at DESC).
111:  const { data: recentRaw } = (await sb
112:    .from("projects")
113:    .select(
114:      "id, title, brief, status, budget_band, twin_intent, created_at"
115:    )
116:    .eq("workspace_id", workspaceId)
117:    .neq("status", "archived")
118:    .order("created_at", { ascending: false })
119:    .limit(5)) as { data: RecentProjectRow[] | null };
120:
121:  const recent: RecentProjectRow[] = recentRaw ?? [];
122:  if (!recent && totalCount === null) notFound();
123:
124:  const fmt = new Intl.DateTimeFormat(localeNarrow === "ko" ? "ko-KR" : "en-US", {
125:    year: "numeric",
126:    month: localeNarrow === "ko" ? "long" : "short",
127:    day: "numeric",
128:  });
129:
130:  const statusMap: Record<string, string> = {
131:    draft: t("status.draft"),
132:    submitted: t("status.submitted"),
133:    in_review: t("status.in_review"),
134:    in_progress: t("status.in_progress"),
135:    in_revision: t("status.in_revision"),
136:    delivered: t("status.delivered"),
137:    approved: t("status.approved"),
138:    cancelled: t("status.cancelled"),
139:    archived: t("status.archived"),
140:  };
141:  const budgetMap: Record<string, string> = {
142:    under_1m: t("budget.under_1m"),
143:    "1m_to_5m": t("budget.1m_to_5m"),
144:    "5m_to_10m": t("budget.5m_to_10m"),
145:    negotiable: t("budget.negotiable"),
146:  };
147:  const twinIntentMap: Record<string, string> = {
148:    undecided: t("twin_intent.undecided"),
149:    specific_in_mind: t("twin_intent.specific_in_mind"),
150:    no_twin: t("twin_intent.no_twin"),
151:  };
152:  const separator = "쨌";
153:
154:  return (
155:    <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
156:      {/* L1 Page header */}
157:      <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
158:        <div>
159:          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground keep-all mb-2">
160:            {t("eyebrow")}
161:          </p>
162:          <h1 className="text-3xl md:text-4xl font-semibold text-foreground keep-all" style={{ letterSpacing: "-0.01em" }}>
163:            {t("title")}
164:          </h1>
165:        </div>
166:        <Link
167:          href={`/${locale}/app/projects/new`}
168:          className="inline-flex items-center rounded-full border border-border/40 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.04] transition-colors"
169:        >
170:          {t("cta_new")}
171:        </Link>
172:      </div>
173:
174:      {/* L2 Count cards */}
175:      <div className="mb-12">
176:        <CountCards
177:          total={total}
178:          inProgress={inProgress}
179:          delivered={delivered}
180:          labels={{
181:            total: t("count.total"),
182:            inProgress: t("count.in_progress"),
183:            delivered: t("count.delivered"),
184:          }}
185:        />
186:      </div>
187:
188:      {/* L3 Recent projects */}
189:      <div className="mb-10">
190:        <div className="flex items-center justify-between mb-5">
191:          <h2 className="text-sm uppercase tracking-[0.10em] text-muted-foreground keep-all">
192:            {t("recent_projects.title")}
193:          </h2>
194:        </div>
195:        {recent.length === 0 ? (
196:          <div className="rounded-3xl border border-border/40 px-8 py-16 flex flex-col items-center text-center">
197:            <p
198:              className="text-[22px] font-semibold text-foreground keep-all"
199:              style={{ letterSpacing: "-0.01em", lineHeight: 1.2 }}
200:            >
201:              {t("recent_projects.empty_headline")}
202:            </p>
203:            <p className="mt-2 text-sm text-muted-foreground keep-all">
204:              {t("recent_projects.empty_subtitle")}
205:            </p>
206:            <Link
207:              href={`/${locale}/app/projects/new`}
208:              className="mt-6 inline-flex items-center rounded-full border border-border/40 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.04] transition-colors"
209:            >
210:              {t("recent_projects.empty_cta")}
211:            </Link>
212:          </div>
213:        ) : (
214:          <ul className="flex flex-col gap-3" role="list">
215:            {recent.map((p) => {
216:              const budgetLabel = p.budget_band
217:                ? budgetMap[p.budget_band] ?? p.budget_band
218:                : t("not_set");
219:              const statusLabel = statusMap[p.status] ?? p.status;
220:              const twinIntentLabel = narrowTwinIntentLabel(
221:                p.twin_intent,
222:                twinIntentMap,
223:              );
224:              return (
225:                <li key={p.id}>
226:                  <RfpRowCard
227:                    href={`/${locale}/app/projects/${p.id}`}
228:                    title={p.title}
229:                    description={p.brief}
230:                    status={p.status}
231:                    statusLabel={statusLabel}
232:                    createdAtFormatted={fmt.format(new Date(p.created_at))}
233:                    budgetLabel={budgetLabel}
234:                    twinIntentLabel={twinIntentLabel}
235:                    separator={separator}
236:                  />
237:                </li>
238:              );
239:            })}
240:          </ul>
241:        )}
242:        {recent.length > 0 && (
243:          <div className="mt-6 text-right">
244:            <Link
245:              href={`/${locale}/app/projects`}
246:              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground keep-all"
247:            >
248:              {t("view_all")} ??            </Link>
249:          </div>
250:        )}
251:      </div>
252:    </div>
253:  );
254:}
--- src/app/[locale]/app/projects/new/page.tsx
1:import { getTranslations } from "next-intl/server";
2:import { redirect } from "@/i18n/routing";
3:import { createSupabaseServer } from "@/lib/supabase/server";
4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
5:import { NewProjectWizard } from "./new-project-wizard";
6:
7:type Props = {
8:  params: Promise<{ locale: string }>;
9:};
10:
11:export default async function NewProjectPage({ params }: Props) {
12:  const { locale } = await params;
13:
14:  const t = await getTranslations({ locale, namespace: "projects" });
15:
16:  const supabase = await createSupabaseServer();
17:
18:  // Auth guard ??layout handles it but be explicit
19:  const {
20:    data: { user },
21:  } = await supabase.auth.getUser();
22:  if (!user) {
23:    redirect({ href: "/signin", locale });
24:    return null;
25:  }
26:
27:  // Wave C.5d sub_03b ??replace first-membership fallback with the
28:  // cookie-based active workspace resolver so brand list + downstream
29:  // wizard payload reflect the workspace the user actually selected in
30:  // the switcher (Codex K-05 final review LOOP 1 MED-C).
31:  const active = await resolveActiveWorkspace(user.id);
32:  const workspaceId = active?.id ?? null;
33:
34:  // Fetch brands for the workspace (empty list is fine ??wizard shows "None" option)
35:  const brands: { id: string; name: string }[] = [];
36:  if (workspaceId) {
37:    const { data: brandsData } = await supabase
38:      .from("brands")
39:      .select("id, name")
40:      .eq("workspace_id", workspaceId)
41:      .order("name", { ascending: true });
42:    brands.push(...(brandsData ?? []));
43:  }
44:
45:  return (
46:    <div className="min-h-dvh bg-background">
47:      {/* Page header */}
48:      <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
49:        <h1 className="font-display text-3xl tracking-tight mb-1">
50:          {t("new")}
51:        </h1>
52:      </div>
53:
54:      <NewProjectWizard brands={brands} activeWorkspaceId={workspaceId} />
55:    </div>
56:  );
57:}
--- src/app/[locale]/auth/verify/page.tsx
1:"use client";
2:
3:import { useState } from "react";
4:import { useTranslations } from "next-intl";
5:import { useSearchParams } from "next/navigation";
6:import { toast } from "sonner";
7:import { Button } from "@/components/ui/button";
8:import { Link } from "@/i18n/routing";
9:import { createSupabaseBrowser } from "@/lib/supabase/client";
10:
11:// Phase 4.x Wave C.5b sub_07 ??standalone "check your email" landing.
12:// The post-signup path renders an inline version of this content from
13:// inside (auth)/signup/page.tsx (after a successful signUp() that
14:// requires email confirmation). This /auth/verify route is the same
15:// surface accessible via a direct URL ??used when the user closes
16:// the signup tab and later wants the recipient view back, or when
17:// a future email-flow lands them here directly with ?email=<addr>.
18:
19:export default function AuthVerifyPage() {
20:  const t = useTranslations("auth");
21:  const c = useTranslations("common");
22:  const params = useSearchParams();
23:  const presetEmail = params.get("email") ?? "";
24:  const [resending, setResending] = useState(false);
25:
26:  async function onResend() {
27:    if (!presetEmail) {
28:      toast.error(t("email_placeholder"));
29:      return;
30:    }
31:    setResending(true);
32:    const supabase = createSupabaseBrowser();
33:    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
34:    const { error } = await supabase.auth.resend({
35:      type: "signup",
36:      email: presetEmail,
37:      // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
38:      // post-verify landing; email link itself is the dashboard's
39:      // /auth/confirm template URL.
40:      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
41:    });
42:    setResending(false);
43:    if (error) {
44:      toast.error(error.message);
45:      return;
46:    }
47:    toast.success(t("signup_email_sent"));
48:  }
49:
50:  return (
51:    <div className="space-y-8">
52:      <div className="space-y-3 text-center">
53:        <h1 className="font-display text-3xl tracking-tight keep-all">
54:          {t("check_your_email_title")}
55:        </h1>
56:        <p className="text-base ink-secondary leading-body keep-all">
57:          {t("check_your_email_sub")}
58:        </p>
59:      </div>
60:
61:      {presetEmail && (
62:        <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
63:          <p className="ink-primary">
64:            <span className="ink-tertiary">{t("sent_to_label")}: </span>
65:            <span className="font-medium break-all">{presetEmail}</span>
66:          </p>
67:          <ul className="text-sm ink-secondary space-y-2 leading-body">
68:            <li className="flex gap-2 keep-all">
69:              <span className="ink-tertiary">쨌</span>
70:              <span>{t("check_email_hint_inbox")}</span>
71:            </li>
72:            <li className="flex gap-2 keep-all">
73:              <span className="ink-tertiary">쨌</span>
74:              <span>{t("check_email_hint_spam")}</span>
75:            </li>
76:            <li className="flex gap-2 keep-all">
77:              <span className="ink-tertiary">쨌</span>
78:              <span>{t("check_email_hint_link")}</span>
79:            </li>
80:          </ul>
81:        </div>
82:      )}
83:
84:      <div className="space-y-3">
85:        {presetEmail && (
86:          <Button
87:            type="button"
88:            className="w-full bg-sage hover:brightness-105"
89:            size="lg"
90:            onClick={onResend}
91:            disabled={resending}
92:          >
93:            {resending ? t("sending") : t("resend_email")}
94:          </Button>
95:        )}
96:        <Button asChild type="button" variant="ghost" className="w-full" size="lg">
97:          <Link href="/signin">{c("signin")}</Link>
98:        </Button>
99:      </div>
100:
101:      <p className="text-center text-sm ink-tertiary">
102:        {t("no_account")}{" "}
103:        <Link href="/signup" className="ink-primary hover:accent-sage transition-colors">
104:          {c("signup")}
105:        </Link>
106:      </p>
107:    </div>
108:  );
109:}
--- src/app/[locale]/auth/expired/page.tsx
1:"use client";
2:
3:import { useEffect, useState } from "react";
4:import { useTranslations } from "next-intl";
5:import { useSearchParams } from "next/navigation";
6:import { useForm } from "react-hook-form";
7:import { zodResolver } from "@hookform/resolvers/zod";
8:import { z } from "zod";
9:import { toast } from "sonner";
10:import { Button } from "@/components/ui/button";
11:import { Input } from "@/components/ui/input";
12:import { Label } from "@/components/ui/label";
13:import { Link } from "@/i18n/routing";
14:import { createSupabaseBrowser } from "@/lib/supabase/client";
15:
16:// Phase 4.x Wave C.5b sub_04 ??dedicated landing for expired-OTP /
17:// expired-link auth callbacks. The callback route detects the expiry
18:// and bounces here with `?email=<address>` (when the original signup
19:// email is recoverable) so the resend flow doesn't ask the user to
20:// retype it. The form falls back to a free email input otherwise.
21://
22:// Phase 4.x Wave C.5c sub_02 ??explicit error branches + 60s cooldown
23:// UI. Supabase's resend rate limit is 60s; without a visible countdown,
24:// users mash the button and get a confusing toast on the second click.
25:
26:const COOLDOWN_SECONDS = 60;
27:
28:const schema = z.object({
29:  email: z.string().email(),
30:});
31:
32:type FormValues = z.infer<typeof schema>;
33:
34:function classifyResendError(message: string): "rate_limit" | "invalid_email" | "generic" {
35:  const lower = message.toLowerCase();
36:  if (
37:    lower.includes("once every") ||
38:    lower.includes("rate limit") ||
39:    lower.includes("for security purposes") ||
40:    lower.includes("too many requests") ||
41:    lower.includes("60 seconds")
42:  ) {
43:    return "rate_limit";
44:  }
45:  if (lower.includes("email") && (lower.includes("invalid") || lower.includes("format"))) {
46:    return "invalid_email";
47:  }
48:  return "generic";
49:}
50:
51:export default function AuthExpiredPage() {
52:  const t = useTranslations("auth");
53:  const params = useSearchParams();
54:  const presetEmail = params.get("email") ?? "";
55:  const [resending, setResending] = useState(false);
56:  const [sent, setSent] = useState(false);
57:  const [cooldownEndsAt, setCooldownEndsAt] = useState<number | null>(null);
58:  const [now, setNow] = useState<number>(() => Date.now());
59:
60:  const {
61:    register,
62:    handleSubmit,
63:    formState: { errors },
64:  } = useForm<FormValues>({
65:    resolver: zodResolver(schema),
66:    defaultValues: { email: presetEmail },
67:  });
68:
69:  // Tick once a second whenever a cooldown is active so the countdown
70:  // copy refreshes. Stops as soon as the cooldown clears.
71:  useEffect(() => {
72:    if (cooldownEndsAt === null) return;
73:    const interval = window.setInterval(() => {
74:      const next = Date.now();
75:      setNow(next);
76:      if (next >= cooldownEndsAt) {
77:        setCooldownEndsAt(null);
78:        window.clearInterval(interval);
79:      }
80:    }, 1000);
81:    return () => window.clearInterval(interval);
82:  }, [cooldownEndsAt]);
83:
84:  const cooldownRemaining =
85:    cooldownEndsAt !== null ? Math.max(0, Math.ceil((cooldownEndsAt - now) / 1000)) : 0;
86:  const inCooldown = cooldownRemaining > 0;
87:
88:  function startCooldown(): void {
89:    setCooldownEndsAt(Date.now() + COOLDOWN_SECONDS * 1000);
90:    setNow(Date.now());
91:  }
92:
93:  async function onResend(values: FormValues) {
94:    if (resending || inCooldown) return;
95:    setResending(true);
96:    const supabase = createSupabaseBrowser();
97:    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
98:    const { error } = await supabase.auth.resend({
99:      type: "signup",
100:      email: values.email,
101:      // Phase 4.x Wave C.5c sub_01 ??PKCE: emailRedirectTo is the FINAL
102:      // post-verify landing; the email link itself is the dashboard's
103:      // /auth/confirm template URL.
104:      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
105:    });
106:    setResending(false);
107:
108:    if (error) {
109:      const kind = classifyResendError(error.message);
110:      // Rate limits should still arm the cooldown UI so the user has a
111:      // visible countdown instead of guessing.
112:      if (kind === "rate_limit") {
113:        startCooldown();
114:        toast.error(t("expired_resend_rate_limited"));
115:      } else if (kind === "invalid_email") {
116:        toast.error(t("expired_resend_invalid_email"));
117:      } else {
118:        toast.error(t("expired_resend_generic_error"));
119:      }
120:      return;
121:    }
122:
123:    setSent(true);
124:    startCooldown();
125:    toast.success(t("expired_resend_success"));
126:  }
127:
128:  const buttonLabel = (() => {
129:    if (resending) return t("sending");
130:    if (inCooldown) return t("expired_resend_cooldown", { seconds: cooldownRemaining });
131:    return t("expired_resend_send");
132:  })();
133:
134:  return (
135:    <div className="space-y-8">
136:      <div className="space-y-3 text-center">
137:        <h1 className="font-display text-3xl tracking-tight keep-all">
138:          {t("expired_headline")}
139:        </h1>
140:        <p className="text-sm text-muted-foreground keep-all">
141:          {t("expired_subtitle")}
142:        </p>
143:      </div>
144:
145:      {sent ? (
146:        <div className="space-y-4">
147:          <div className="rounded-card bg-card-deep border-subtle border px-5 py-4 text-sm">
148:            <p className="ink-secondary keep-all">{t("expired_resend_success")}</p>
149:          </div>
150:          <form onSubmit={handleSubmit(onResend)} className="space-y-2">
151:            <Button
152:              type="submit"
153:              size="lg"
154:              className="w-full"
155:              disabled={resending || inCooldown}
156:              aria-disabled={resending || inCooldown}
157:            >
158:              {buttonLabel}
159:            </Button>
160:          </form>
161:        </div>
162:      ) : (
163:        <form onSubmit={handleSubmit(onResend)} className="space-y-4">
164:          <p className="text-xs text-muted-foreground keep-all">
165:            {t("expired_resend_hint")}
166:          </p>
167:          <div className="space-y-2">
168:            <Label htmlFor="email">{t("expired_resend_email_label")}</Label>
169:            <Input
170:              id="email"
171:              type="email"
172:              autoComplete="email"
173:              placeholder={t("email_placeholder")}
174:              {...register("email")}
175:            />
176:            {errors.email && (
177:              <p className="text-xs text-destructive">{errors.email.message}</p>
178:            )}
179:          </div>
180:          <Button
181:            type="submit"
182:            size="lg"
183:            className="w-full"
184:            disabled={resending || inCooldown}
185:            aria-disabled={resending || inCooldown}
186:          >
187:            {buttonLabel}
188:          </Button>
189:        </form>
190:      )}
191:
192:      <p className="text-center text-sm text-muted-foreground">
193:        <Link href="/signin" className="text-foreground hover:underline">
194:          {t("expired_back_to_signin")}
195:        </Link>
196:      </p>
197:    </div>
198:  );
199:}
--- src/app/[locale]/auth/layout.tsx
1:import Image from "next/image";
2:import { Link } from "@/i18n/routing";
3:
4:// Phase 4.x Wave C.5b sub_04 ??chrome for the locale-prefixed /auth/*
5:// surfaces (currently /auth/expired). Mirrors (auth)/layout.tsx so the
6:// expired-link landing reads as part of the same auth flow even though
7:// it lives outside the (auth) route group.
8:export default function AuthChromeLayout({
9:  children,
10:}: {
11:  children: React.ReactNode;
12:}) {
13:  return (
14:    <div className="min-h-dvh flex flex-col px-6 md:px-12">
15:      <header className="py-6">
16:        <Link href="/" className="inline-flex items-center" aria-label="YAGI Workshop">
17:          <Image
18:            src="/brand/yagi-wordmark.png"
19:            alt="YAGI Workshop"
20:            width={140}
21:            height={26}
22:            priority
23:            className="h-[26px] w-auto"
24:          />
25:        </Link>
26:      </header>
27:      <main className="flex-1 flex items-center justify-center">
28:        <div className="w-full max-w-sm">{children}</div>
29:      </main>
30:    </div>
31:  );
32:}
--- src/app/[locale]/(auth)/signin/page.tsx
1:"use client";
2:
3:import { useEffect, useState } from "react";
4:import { useTranslations } from "next-intl";
5:import { useForm } from "react-hook-form";
6:import { zodResolver } from "@hookform/resolvers/zod";
7:import { z } from "zod";
8:import { toast } from "sonner";
9:import { Button } from "@/components/ui/button";
10:import { Input } from "@/components/ui/input";
11:import { Label } from "@/components/ui/label";
12:import { Link, useRouter } from "@/i18n/routing";
13:import { createSupabaseBrowser } from "@/lib/supabase/client";
14:
15:const schema = z.object({
16:  email: z.string().email(),
17:  password: z.string().min(8),
18:});
19:
20:type FormValues = z.infer<typeof schema>;
21:
22:// Phase 4.x Wave C.5b sub_04 ??Supabase Auth occasionally surfaces
23:// expiry/error states via the URL fragment (e.g. when the email-link
24:// callback bounces to the signin page directly with
25:// `#error_code=otp_expired&...`). Detect on mount and route to the
26:// dedicated expired surface; clear the fragment so the page state
27:// stops being driven by stale URL noise.
28:function readHashError(): { code: string; description: string } | null {
29:  if (typeof window === "undefined") return null;
30:  const raw = window.location.hash.replace(/^#/, "");
31:  if (!raw) return null;
32:  const params = new URLSearchParams(raw);
33:  const code = params.get("error_code") ?? params.get("error") ?? "";
34:  const description = params.get("error_description") ?? "";
35:  if (!code && !description) return null;
36:  return { code, description };
37:}
38:
39:function isOtpExpired(error: { code: string; description: string }): boolean {
40:  const blob = `${error.code} ${error.description}`.toLowerCase();
41:  return blob.includes("otp_expired") || blob.includes("expired");
42:}
43:
44:export default function SignInPage() {
45:  const t = useTranslations("auth");
46:  const c = useTranslations("common");
47:  const router = useRouter();
48:  const [submitting, setSubmitting] = useState(false);
49:  const {
50:    register,
51:    handleSubmit,
52:    formState: { errors },
53:  } = useForm<FormValues>({ resolver: zodResolver(schema) });
54:
55:  useEffect(() => {
56:    const error = readHashError();
57:    if (!error) return;
58:    // Strip the fragment so a refresh doesn't re-trigger.
59:    window.history.replaceState(null, "", window.location.pathname + window.location.search);
60:    if (isOtpExpired(error)) {
61:      router.push("/auth/expired" as const);
62:      return;
63:    }
64:    toast.error(error.description || error.code);
65:  }, [router]);
66:
67:  async function onSubmit(values: FormValues) {
68:    setSubmitting(true);
69:    const supabase = createSupabaseBrowser();
70:    const { error } = await supabase.auth.signInWithPassword({
71:      email: values.email,
72:      password: values.password,
73:    });
74:    setSubmitting(false);
75:    if (error) {
76:      toast.error(error.message);
77:      return;
78:    }
79:    router.push("/onboarding");
80:  }
81:
82:  return (
83:    <div className="space-y-8">
84:      <div className="space-y-2 text-center">
85:        <h1 className="font-display text-3xl tracking-tight">
86:          {t("signin_title")}
87:        </h1>
88:        <p className="text-sm text-muted-foreground">{t("signin_sub")}</p>
89:      </div>
90:
91:      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
92:        <div className="space-y-2">
93:          <Label htmlFor="email">{t("email")}</Label>
94:          <Input
95:            id="email"
96:            type="email"
97:            placeholder={t("email_placeholder")}
98:            autoComplete="email"
99:            {...register("email")}
100:          />
101:          {errors.email && (
102:            <p className="text-xs text-destructive">{errors.email.message}</p>
103:          )}
104:        </div>
105:        <div className="space-y-2">
106:          <Label htmlFor="password">{t("password_label")}</Label>
107:          <Input
108:            id="password"
109:            type="password"
110:            placeholder={t("password_ph")}
111:            autoComplete="current-password"
112:            {...register("password")}
113:          />
114:          {errors.password && (
115:            <p className="text-xs text-destructive">{errors.password.message}</p>
116:          )}
117:        </div>
118:        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
119:          {submitting ? t("sending") : c("signin")}
120:        </Button>
121:      </form>
122:
123:      <div className="text-center text-sm text-muted-foreground space-y-2">
124:        <p>
125:          <Link href="/forgot-password" className="text-foreground hover:underline">
126:            {t("forgot_password")}
127:          </Link>
128:        </p>
129:        <p>
130:          {t("no_account")}{" "}
131:          <Link href="/signup" className="text-foreground hover:underline">
132:            {c("signup")}
133:          </Link>
134:        </p>
135:      </div>
136:    </div>
137:  );
138:}
--- src/app/[locale]/(auth)/signup/page.tsx
1:"use client";
2:
3:import { useState } from "react";
4:import { useTranslations } from "next-intl";
5:import { useForm } from "react-hook-form";
6:import { zodResolver } from "@hookform/resolvers/zod";
7:import { z } from "zod";
8:import { toast } from "sonner";
9:import { useSearchParams } from "next/navigation";
10:import { Button } from "@/components/ui/button";
11:import { Input } from "@/components/ui/input";
12:import { Label } from "@/components/ui/label";
13:import { Link, useRouter } from "@/i18n/routing";
14:import { createSupabaseBrowser } from "@/lib/supabase/client";
15:
16:// Phase 2.8.1 G_B1-H (F-PUX-003): commission flow uses `?next=` to bring
17:// the user back to /app/commission/new after the email-confirm round-trip.
18:// Phase 4.x Wave C.5c sub_01 (Codex F8 fix): bound the accepted paths to
19:// the same allowlist used by /auth/confirm so the Supabase Dashboard
20:// "Redirect URLs" allowlist scope stays small + auditable.
21:const SIGNUP_NEXT_ALLOWLIST: readonly string[] = [
22:  "/onboarding/workspace",
23:  "/onboarding/brand",
24:  "/onboarding/invite",
25:  "/app",
26:];
27:function sanitizeNext(raw: string | null): string | null {
28:  if (!raw) return null;
29:  if (!raw.startsWith("/")) return null;
30:  if (raw.startsWith("//")) return null; // protocol-relative
31:  if (raw.startsWith("/auth/")) return null;
32:  if (raw.length > 500) return null;
33:  const pathOnly = raw.split("?")[0];
34:  for (const prefix of SIGNUP_NEXT_ALLOWLIST) {
35:    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) return raw;
36:  }
37:  return null;
38:}
39:
40:const schema = z
41:  .object({
42:    email: z.string().email(),
43:    password: z.string().min(8),
44:    passwordConfirm: z.string(),
45:  })
46:  .refine((data) => data.password === data.passwordConfirm, {
47:    path: ["passwordConfirm"],
48:    message: "password_mismatch",
49:  });
50:
51:type FormValues = z.infer<typeof schema>;
52:
53:export default function SignUpPage() {
54:  const t = useTranslations("auth");
55:  const c = useTranslations("common");
56:  const router = useRouter();
57:  const searchParams = useSearchParams();
58:  const next = sanitizeNext(searchParams.get("next"));
59:  const [submitting, setSubmitting] = useState(false);
60:  const [sentToEmail, setSentToEmail] = useState<string | null>(null);
61:  const [resending, setResending] = useState(false);
62:  const {
63:    register,
64:    handleSubmit,
65:    formState: { errors },
66:  } = useForm<FormValues>({ resolver: zodResolver(schema) });
67:
68:  // Phase 4.x Wave C.5c sub_01 ??Under PKCE, the actual email-link path
69:  // is hard-coded in the Supabase Dashboard email template
70:  // (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&...`).
71:  // `emailRedirectTo` becomes the FINAL destination after verifyOtp
72:  // succeeds, embedded as `?next=` inside that template URL via the
73:  // `{{ .RedirectTo }}` template variable. So this URL is the
74:  // post-confirm landing, NOT the click target.
75:  function buildEmailRedirect(siteUrl: string): string {
76:    const base = `${siteUrl}/onboarding/workspace`;
77:    return next ? `${siteUrl}${next}` : base;
78:  }
79:
80:  async function onSubmit(values: FormValues) {
81:    setSubmitting(true);
82:    const supabase = createSupabaseBrowser();
83:    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
84:    const { error, data } = await supabase.auth.signUp({
85:      email: values.email,
86:      password: values.password,
87:      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
88:    });
89:    setSubmitting(false);
90:    if (error) {
91:      toast.error(error.message);
92:      return;
93:    }
94:    if (data.session) {
95:      // Email confirmation disabled in Supabase auth settings ??auto-login path.
96:      // Honor `next` here too so the in-product redirect mirrors the
97:      // email-confirm path.
98:      // Phase 4.x Wave C.5b sub_01: persona A ??direct to workspace creation.
99:      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
100:    } else {
101:      // Email confirmation enabled ??switch the page over to the sent-state view
102:      // instead of leaving the user on the form with only a toast.
103:      setSentToEmail(values.email);
104:    }
105:  }
106:
107:  async function onResend() {
108:    if (!sentToEmail) return;
109:    setResending(true);
110:    const supabase = createSupabaseBrowser();
111:    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
112:    const { error } = await supabase.auth.resend({
113:      type: "signup",
114:      email: sentToEmail,
115:      options: { emailRedirectTo: buildEmailRedirect(siteUrl) },
116:    });
117:    setResending(false);
118:    if (error) {
119:      toast.error(error.message);
120:      return;
121:    }
122:    toast.success(t("signup_email_sent"));
123:  }
124:
125:  // ---- Sent state ??shown after successful signUp() when email confirmation
126:  // is required by the project. The user stays on this view and follows the
127:  // mailbox link. This replaces the "toast-only and the form stays put"
128:  // behavior that read as a dead-end.
129:  // Phase 4.x Wave C.5b sub_07 ??verify-email screen on the v1.0 dark
130:  // editorial foundation. Headline + subtitle land on the editorial type
131:  // scale; the recipient block is a card-deep / border-subtle surface;
132:  // primary CTA is the sage "resend" beat, secondary is a calm ghost
133:  // button to switch addresses.
134:  if (sentToEmail) {
135:    return (
136:      <div className="space-y-8">
137:        <div className="space-y-3 text-center">
138:          <h1 className="font-display text-3xl tracking-tight keep-all">
139:            {t("check_your_email_title")}
140:          </h1>
141:          <p className="text-base ink-secondary leading-body keep-all">
142:            {t("check_your_email_sub")}
143:          </p>
144:        </div>
145:
146:        <div className="rounded-card bg-card-deep border-subtle border p-6 text-sm space-y-4">
147:          <p className="ink-primary">
148:            <span className="ink-tertiary">{t("sent_to_label")}: </span>
149:            <span className="font-medium break-all">{sentToEmail}</span>
150:          </p>
151:          <ul className="text-sm ink-secondary space-y-2 leading-body">
152:            <li className="flex gap-2 keep-all">
153:              <span className="ink-tertiary">쨌</span>
154:              <span>{t("check_email_hint_inbox")}</span>
155:            </li>
156:            <li className="flex gap-2 keep-all">
157:              <span className="ink-tertiary">쨌</span>
158:              <span>{t("check_email_hint_spam")}</span>
159:            </li>
160:            <li className="flex gap-2 keep-all">
161:              <span className="ink-tertiary">쨌</span>
162:              <span>{t("check_email_hint_link")}</span>
163:            </li>
164:          </ul>
165:        </div>
166:
167:        <div className="space-y-3">
168:          <Button
169:            type="button"
170:            className="w-full bg-sage hover:brightness-105"
171:            size="lg"
172:            onClick={onResend}
173:            disabled={resending}
174:          >
175:            {resending ? t("sending") : t("resend_email")}
176:          </Button>
177:          <Button
178:            type="button"
179:            variant="ghost"
180:            className="w-full"
181:            size="lg"
182:            onClick={() => setSentToEmail(null)}
183:          >
184:            {t("use_different_email")}
185:          </Button>
186:        </div>
187:
188:        <p className="text-center text-sm ink-tertiary">
189:          {t("have_account")}{" "}
190:          <Link href="/signin" className="ink-primary hover:accent-sage transition-colors">
191:            {c("signin")}
192:          </Link>
193:        </p>
194:      </div>
195:    );
196:  }
197:
198:  // ---- Default state ??signup form.
199:  return (
200:    <div className="space-y-8">
201:      <div className="space-y-2 text-center">
202:        <h1 className="font-display text-3xl tracking-tight">
203:          {t("signup_title")}
204:        </h1>
205:        <p className="text-sm text-muted-foreground">{t("signup_sub")}</p>
206:      </div>
207:
208:      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
209:        <div className="space-y-2">
210:          <Label htmlFor="email">{t("email")}</Label>
211:          <Input
212:            id="email"
213:            type="email"
214:            placeholder={t("email_placeholder")}
215:            autoComplete="email"
216:            {...register("email")}
217:          />
218:          {errors.email && (
219:            <p className="text-xs text-destructive">{errors.email.message}</p>
220:          )}
221:        </div>
222:        <div className="space-y-2">
223:          <Label htmlFor="password">{t("password_label")}</Label>
224:          <Input
225:            id="password"
226:            type="password"
227:            placeholder={t("password_ph")}
228:            autoComplete="new-password"
229:            {...register("password")}
230:          />
231:          {errors.password && (
232:            <p className="text-xs text-destructive">{errors.password.message}</p>
233:          )}
234:        </div>
235:        <div className="space-y-2">
236:          <Label htmlFor="passwordConfirm">{t("password_confirm_label")}</Label>
237:          <Input
238:            id="passwordConfirm"
239:            type="password"
240:            autoComplete="new-password"
241:            {...register("passwordConfirm")}
242:          />
243:          {errors.passwordConfirm && (
244:            <p className="text-xs text-destructive">
245:              {errors.passwordConfirm.message === "password_mismatch"
246:                ? t("password_mismatch")
247:                : errors.passwordConfirm.message}
248:            </p>
249:          )}
250:        </div>
251:        <Button type="submit" className="w-full" size="lg" disabled={submitting}>
252:          {submitting ? t("sending") : c("signup")}
253:        </Button>
254:      </form>
255:
256:      <p className="text-center text-sm text-muted-foreground">
257:        {t("have_account")}{" "}
258:        <Link href="/signin" className="text-foreground hover:underline">
259:          {c("signin")}
260:        </Link>
261:      </p>
262:    </div>
263:  );
264:}
--- src/app/[locale]/(auth)/forgot-password/page.tsx
1:"use client";
2:
3:import { useState } from "react";
4:import { useTranslations } from "next-intl";
5:import { useForm } from "react-hook-form";
6:import { zodResolver } from "@hookform/resolvers/zod";
7:import { z } from "zod";
8:import { toast } from "sonner";
9:import { Button } from "@/components/ui/button";
10:import { Input } from "@/components/ui/input";
11:import { Label } from "@/components/ui/label";
12:import { Link } from "@/i18n/routing";
13:import { createSupabaseBrowser } from "@/lib/supabase/client";
14:
15:const schema = z.object({
16:  email: z.string().email(),
17:});
18:
19:type FormValues = z.infer<typeof schema>;
20:
21:export default function ForgotPasswordPage() {
22:  const t = useTranslations("auth");
23:  const [submitting, setSubmitting] = useState(false);
24:  const [sent, setSent] = useState(false);
25:  const {
26:    register,
27:    handleSubmit,
28:    formState: { errors },
29:  } = useForm<FormValues>({ resolver: zodResolver(schema) });
30:
31:  async function onSubmit(values: FormValues) {
32:    setSubmitting(true);
33:    const supabase = createSupabaseBrowser();
34:    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;
35:    // Phase 4.x Wave C.5c sub_01 ??PKCE: redirectTo is the FINAL
36:    // destination after verifyOtp succeeds at /auth/confirm. The
37:    // email link itself is hard-coded in the Supabase Dashboard
38:    // recovery template to /auth/confirm?type=recovery&...
39:    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
40:      redirectTo: `${siteUrl}/reset-password`,
41:    });
42:    setSubmitting(false);
43:    if (error) {
44:      toast.error(error.message);
45:      return;
46:    }
47:    setSent(true);
48:    toast.success(t("reset_link_sent"));
49:  }
50:
51:  return (
52:    <div className="space-y-8">
53:      <div className="space-y-2 text-center">
54:        <h1 className="font-display text-3xl tracking-tight">
55:          {t("reset_password_title")}
56:        </h1>
57:        <p className="text-sm text-muted-foreground">{t("reset_password_sub")}</p>
58:      </div>
59:
60:      {sent ? (
61:        <div className="rounded-lg border border-border bg-muted/40 px-5 py-4 text-sm">
62:          {t("reset_link_sent")}
63:        </div>
64:      ) : (
65:        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
66:          <div className="space-y-2">
67:            <Label htmlFor="email">{t("email")}</Label>
68:            <Input
69:              id="email"
70:              type="email"
71:              placeholder={t("email_placeholder")}
72:              autoComplete="email"
73:              {...register("email")}
74:            />
75:            {errors.email && (
76:              <p className="text-xs text-destructive">{errors.email.message}</p>
77:            )}
78:          </div>
79:          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
80:            {submitting ? t("sending") : t("send_link")}
81:          </Button>
82:        </form>
83:      )}
84:
85:      <p className="text-center text-sm text-muted-foreground">
86:        <Link href="/signin" className="text-foreground hover:underline">
87:          {t("back_to_signin")}
88:        </Link>
89:      </p>
90:    </div>
91:  );
92:}

 succeeded in 591ms:
src\lib\invoices\issue-email.ts:73:      workspaceId: invoice.workspace_id,
src\lib\workspace\active.ts:32:export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";
src\lib\workspace\active.ts:108:  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
src\lib\workspace\actions.ts:18:import { ACTIVE_WORKSPACE_COOKIE } from "./active";
src\lib\workspace\actions.ts:27:export async function setActiveWorkspaceAction(
src\lib\workspace\actions.ts:28:  workspaceId: string,
src\lib\workspace\actions.ts:30:  if (!UUID_RE.test(workspaceId)) {
src\lib\workspace\actions.ts:47:    .eq("workspace_id", workspaceId)
src\lib\workspace\actions.ts:53:  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
src\lib\onboarding\actions.ts:43:}): Promise<Result & { workspaceId?: string }> {
src\lib\onboarding\actions.ts:68:  return { workspaceId: data };
src\lib\onboarding\actions.ts:72:  workspaceId: string;
src\lib\onboarding\actions.ts:78:    workspace_id: formData.workspaceId,
src\lib\onboarding\actions.ts:87:  workspaceId: string;
src\lib\onboarding\actions.ts:99:    workspace_id: formData.workspaceId,
src\lib\team-channels\attachments.ts:75:  workspaceId: string;
src\lib\team-channels\attachments.ts:83:    typeof input.workspaceId !== "string" ||
src\lib\team-channels\attachments.ts:91:    !UUID_RE.test(input.workspaceId) ||
src\lib\team-channels\attachments.ts:116:  if (channel.workspace_id !== input.workspaceId) {
src\lib\team-channels\attachments.ts:143:    const storagePath = `${input.workspaceId}/${input.channelId}/${input.messageId}/${uuid}__${cleanName}`;
src\app\[locale]\onboarding\workspace\page.tsx:72:    if (res.error || !res.workspaceId) {
src\app\[locale]\onboarding\workspace\page.tsx:76:    router.push(`/${locale}/onboarding/brand?ws=${res.workspaceId}`);
src\app\[locale]\onboarding\invite\page.tsx:20:  const workspaceId = search.get("ws");
src\app\[locale]\onboarding\invite\page.tsx:42:    if (!workspaceId) {
src\app\[locale]\onboarding\invite\page.tsx:47:    const res = await sendInvitationsAction({ workspaceId, emails, role: "member" });
src\app\[locale]\onboarding\brand\page.tsx:32:  const workspaceId = search.get("ws");
src\app\[locale]\onboarding\brand\page.tsx:48:    if (!workspaceId) {
src\app\[locale]\onboarding\brand\page.tsx:53:    const res = await createBrandAction({ workspaceId, name: values.name, slug: values.slug });
src\app\[locale]\onboarding\brand\page.tsx:59:    router.push(`/${locale}/onboarding/invite?ws=${workspaceId}`);
src\app\[locale]\onboarding\brand\page.tsx:76:            onClick={() => router.push(`/${locale}/onboarding/invite?ws=${workspaceId ?? ""}`)}
src\app\[locale]\app\team\[slug]\actions.ts:166:      workspaceId: channel.workspace_id,
src\app\[locale]\app\team\[slug]\actions.ts:190:  workspaceId: string;
src\app\[locale]\app\team\[slug]\actions.ts:262:          workspace_id: args.workspaceId,
src\components\team\message-composer.tsx:220:        workspaceId: YAGI_INTERNAL_WORKSPACE_ID,
src\app\[locale]\app\support\actions.ts:39:  workspaceId: string,
src\app\[locale]\app\support\actions.ts:53:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\support\actions.ts:61:      workspace_id: workspaceId,
src\app\[locale]\app\support\actions.ts:72:      .eq("workspace_id", workspaceId)
src\app\[locale]\app\meetings\request-actions.ts:45:    workspaceId: z.string().uuid(),
src\app\[locale]\app\meetings\request-actions.ts:160:      workspace_id: parsed.data.workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:181:    parsed.data.workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:267:    workspaceId: meeting.workspace_id,
src\app\[locale]\app\meetings\request-actions.ts:337:  workspaceId: string,
src\app\[locale]\app\meetings\request-actions.ts:365:            workspace_id: workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:412:  workspaceId: string;
src\app\[locale]\app\meetings\request-actions.ts:422:    workspace_id: args.workspaceId,
src\components\support\support-widget.tsx:44:  workspaceId: string | null;
src\components\support\support-widget.tsx:50:  workspaceId,
src\components\support\support-widget.tsx:66:    if (!open || threadId || !workspaceId) return;
src\components\support\support-widget.tsx:68:      const res = await getOrCreateSupportThread(workspaceId);
src\components\support\support-widget.tsx:71:  }, [open, threadId, workspaceId]);
src\components\support\support-widget.tsx:165:  if (!workspaceId) return null;
src\components\meetings\meeting-request-card.tsx:43:  workspaceId: string | null;
src\components\meetings\meeting-request-card.tsx:46:export function MeetingRequestCard({ workspaceId }: Props) {
src\components\meetings\meeting-request-card.tsx:64:            disabled={!workspaceId}
src\components\meetings\meeting-request-card.tsx:73:        {workspaceId ? (
src\components\meetings\meeting-request-card.tsx:74:          <RequestForm workspaceId={workspaceId} onClose={() => setOpen(false)} />
src\components\meetings\meeting-request-card.tsx:89:  workspaceId,
src\components\meetings\meeting-request-card.tsx:92:  workspaceId: string;
src\components\meetings\meeting-request-card.tsx:143:        workspaceId,
src\app\[locale]\app\meetings\new\page.tsx:46:  const workspaceIds = (memberRows ?? []).map((r) => r.workspace_id);
src\app\[locale]\app\meetings\new\page.tsx:65:      ? workspaceIds
src\app\[locale]\app\meetings\new\page.tsx:66:      : workspaceIds.filter((id) => adminWorkspaceIds.has(id));
src\components\sidebar\workspace-switcher.tsx:62:  function handleSelect(workspaceId: string) {
src\components\sidebar\workspace-switcher.tsx:63:    if (workspaceId === current.id) return;
src\components\sidebar\workspace-switcher.tsx:65:      const result = await setActiveWorkspaceAction(workspaceId);
src\app\[locale]\app\meetings\actions.ts:134:  const workspaceId = project.workspace_id;
src\app\[locale]\app\meetings\actions.ts:139:    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
src\app\[locale]\app\meetings\actions.ts:165:      p_workspace_id: workspaceId,
src\app\[locale]\app\meetings\actions.ts:200:      workspaceId,
src\app\[locale]\app\meetings\actions.ts:471:      workspaceId: meeting.workspace_id ?? undefined,
src\app\[locale]\app\meetings\actions.ts:523:  workspaceId: string;
src\app\[locale]\app\meetings\actions.ts:541:          workspace_id: args.workspaceId,
src\app\[locale]\app\meetings\actions.ts:559:  workspaceId?: string;
src\app\[locale]\app\meetings\actions.ts:575:          workspace_id: args.workspaceId,
src\app\[locale]\app\layout.tsx:100:            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
src\app\[locale]\app\layout.tsx:105:          workspaceId={activeWorkspace?.id ?? null}
src\app\[locale]\app\dashboard\page.tsx:80:  const workspaceId = active!.id;
src\app\[locale]\app\dashboard\page.tsx:92:        .eq("workspace_id", workspaceId)
src\app\[locale]\app\dashboard\page.tsx:97:        .eq("workspace_id", workspaceId)
src\app\[locale]\app\dashboard\page.tsx:102:        .eq("workspace_id", workspaceId)
src\app\[locale]\app\dashboard\page.tsx:116:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\settings\invite-form.tsx:13:  workspaceId: string;
src\app\[locale]\app\settings\invite-form.tsx:16:export function InviteForm({ workspaceId }: InviteFormProps) {
src\app\[locale]\app\settings\invite-form.tsx:41:      <input type="hidden" name="workspaceId" value={workspaceId} />
src\app\[locale]\app\settings\workspace-form.tsx:53:      workspaceId: workspace.id,
src\app\[locale]\app\projects\page.tsx:166:      <MeetingRequestCard workspaceId={primaryWorkspaceId} />
src\app\[locale]\app\settings\page.tsx:54:  const workspaceId = ctx!.currentWorkspaceId;
src\app\[locale]\app\settings\page.tsx:55:  if (!workspaceId) redirect({ href: "/app", locale });
src\app\[locale]\app\settings\page.tsx:62:      .eq("id", workspaceId!)
src\app\[locale]\app\settings\page.tsx:69:  return <TeamPanel workspaceId={workspaceId!} />;
src\app\[locale]\app\settings\team-panel.tsx:11:type TeamPanelProps = { workspaceId: string };
src\app\[locale]\app\settings\team-panel.tsx:13:export async function TeamPanel({ workspaceId }: TeamPanelProps) {
src\app\[locale]\app\settings\team-panel.tsx:25:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\settings\team-panel.tsx:30:      <InviteForm workspaceId={workspaceId} />
src\app\[locale]\app\settings\team-panel.tsx:48:                  <input type="hidden" name="workspaceId" value={workspaceId} />
src\app\[locale]\app\settings\actions.ts:121:  workspaceId: z.string().uuid(),
src\app\[locale]\app\settings\actions.ts:145:    .eq("id", parsed.data.workspaceId);
src\app\[locale]\app\settings\actions.ts:153:  workspaceId: z.string().uuid(),
src\app\[locale]\app\settings\actions.ts:160:    workspaceId: formData.get("workspaceId"),
src\app\[locale]\app\settings\actions.ts:170:  const workspaceId = formData.get("workspaceId");
src\app\[locale]\app\settings\actions.ts:172:  if (typeof workspaceId !== "string" || typeof userId !== "string") {
src\app\[locale]\app\settings\actions.ts:186:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\preprod\[id]\share-actions.ts:98:      workspaceId: board.workspace_id,
src\app\[locale]\app\preprod\[id]\share-actions.ts:191:      workspaceId: updated[0].workspace_id,
src\app\[locale]\app\preprod\[id]\share-actions.ts:245:  workspaceId: string
src\app\[locale]\app\preprod\[id]\share-actions.ts:253:      .eq("workspace_id", args.workspaceId),
src\app\[locale]\app\preprod\[id]\share-actions.ts:257:      .eq("id", args.workspaceId)
src\app\[locale]\app\preprod\[id]\share-actions.ts:273:          workspace_id: args.workspaceId,
src\app\[locale]\app\preprod\[id]\share-actions.ts:290:  workspaceId: string
src\app\[locale]\app\preprod\[id]\share-actions.ts:313:          workspace_id: args.workspaceId,
src\app\[locale]\app\projects\new\actions.ts:770:  // workspaceId is optional when draftProjectId is provided ? the action
src\app\[locale]\app\projects\new\actions.ts:773:  workspaceId: z.string().uuid().optional(),
src\app\[locale]\app\projects\new\actions.ts:804:  // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
src\app\[locale]\app\projects\new\actions.ts:810:  //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
src\app\[locale]\app\projects\new\actions.ts:824:  if (data.workspaceId && memberSet.has(data.workspaceId)) {
src\app\[locale]\app\projects\new\actions.ts:825:    resolvedWorkspaceId = data.workspaceId;
src\app\[locale]\app\projects\new\new-project-wizard.tsx:868:                workspaceId: activeWorkspaceId ?? undefined,
src\app\[locale]\app\projects\new\page.tsx:32:  const workspaceId = active?.id ?? null;
src\app\[locale]\app\projects\new\page.tsx:36:  if (workspaceId) {
src\app\[locale]\app\projects\new\page.tsx:40:      .eq("workspace_id", workspaceId)
src\app\[locale]\app\projects\new\page.tsx:54:      <NewProjectWizard brands={brands} activeWorkspaceId={workspaceId} />

codex
I found a more concrete effective-UPDATE case in `profiles`: Phase 4 widens the role enum, and the existing self-update RLS policy only pins `id = auth.uid()`. I’m checking whether direct PostgREST UPDATE can change `profiles.role`, because that would be higher severity than the workspace-kind metadata issue.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$lines=Get-Content -LiteralPath $p; foreach($range in @(@(1430,1475),@(4038,4062))){ for($i=$range[0]; $i -le $range[1]; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profile\\.role|role === \\\"yagi_admin\\\"|profiles\\).*role|\\.from\\(\\\"profiles\\\"\\).*role|is_yagi_admin|role = 'yagi_admin'|role.*artist|role.*client\" src supabase/migrations/202605*.sql" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=1; $i -le $lines.Length; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles.*role|role.*profiles|validate_profile_role|profile_role|REVOKE UPDATE.*profiles|GRANT UPDATE.*profiles|ALTER TABLE public\\.profiles\" supabase/migrations src" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 560ms:
1430:    CONSTRAINT preprod_frame_comments_check CHECK (((author_user_id IS NOT NULL) OR (author_email IS NOT NULL)))
1431:);
1432:
1433:
1434:--
1435:-- Name: preprod_frame_reactions; Type: TABLE; Schema: public; Owner: -
1436:--
1437:
1438:CREATE TABLE public.preprod_frame_reactions (
1439:    id uuid DEFAULT gen_random_uuid() NOT NULL,
1440:    frame_id uuid NOT NULL,
1441:    board_id uuid NOT NULL,
1442:    reactor_email text NOT NULL,
1443:    reactor_name text,
1444:    reaction text NOT NULL,
1445:    created_at timestamp with time zone DEFAULT now() NOT NULL,
1446:    updated_at timestamp with time zone DEFAULT now() NOT NULL,
1447:    CONSTRAINT preprod_frame_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'dislike'::text, 'needs_change'::text])))
1448:);
1449:
1450:
1451:--
1452:-- Name: preprod_frames; Type: TABLE; Schema: public; Owner: -
1453:--
1454:
1455:CREATE TABLE public.preprod_frames (
1456:    id uuid DEFAULT gen_random_uuid() NOT NULL,
1457:    board_id uuid NOT NULL,
1458:    frame_order integer NOT NULL,
1459:    revision integer DEFAULT 1 NOT NULL,
1460:    revision_group uuid NOT NULL,
1461:    is_current_revision boolean DEFAULT true NOT NULL,
1462:    media_type text NOT NULL,
1463:    media_storage_path text,
1464:    media_external_url text,
1465:    media_embed_provider text,
1466:    thumbnail_path text,
1467:    caption text,
1468:    director_note text,
1469:    reference_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
1470:    created_at timestamp with time zone DEFAULT now() NOT NULL,
1471:    updated_at timestamp with time zone DEFAULT now() NOT NULL,
1472:    CONSTRAINT preprod_frames_check CHECK ((((media_type = 'image'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_upload'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_embed'::text) AND (media_external_url IS NOT NULL) AND (media_embed_provider IS NOT NULL)))),
1473:    CONSTRAINT preprod_frames_media_embed_provider_check CHECK (((media_embed_provider IS NULL) OR (media_embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text])))),
1474:    CONSTRAINT preprod_frames_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])))
1475:);
4038:
4039:--
4040:-- Name: profiles profiles_read; Type: POLICY; Schema: public; Owner: -
4041:--
4042:
4043:CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated USING (true);
4044:
4045:
4046:--
4047:-- Name: profiles profiles_update_self; Type: POLICY; Schema: public; Owner: -
4048:--
4049:
4050:CREATE POLICY profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));
4051:
4052:
4053:--
4054:-- Name: profiles profiles_upsert_self; Type: POLICY; Schema: public; Owner: -
4055:--
4056:
4057:CREATE POLICY profiles_upsert_self ON public.profiles FOR INSERT TO authenticated WITH CHECK ((id = auth.uid()));
4058:
4059:
4060:--
4061:-- Name: project_references proj_refs_rw; Type: POLICY; Schema: public; Owner: -
4062:--

2026-05-03T18:06:22.773616Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
rg: regex parse error:
    (?:profile\.role|role === " yagi_admin\|profiles\).*role|\.from\(\profiles\\).*role|is_yagi_admin|role)
                                                                                                          ^
error: unopened group

 exited 1 in 529ms:
rg: regex parse error:
    (?:profile\.role|role === " yagi_admin\|profiles\).*role|\.from\(\profiles\\).*role|is_yagi_admin|role)
                                                                                                          ^
error: unopened group

 succeeded in 591ms:
1:-- Phase 4.x Wave C.5b amend_02 ??widen profiles_role_check to include 'artist'.
2:--
3:-- Background: PRODUCT-MASTER 짠4 / DECISIONS Q-094 lock the persona model
4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
5:-- still only allowed creator/studio/observer/client. yagi visual review
6:-- (post-sub_00 ROLLBACK) needs the artist demo account live for review,
7:-- which requires this enum widening ??originally deferred to Phase 5
8:-- entry (sub_13 HALT log) but now pulled into Phase 4.x because the
9:-- widening is purely additive and the only blocker for the demo account.
10:--
11:-- Scope: additive only. Existing rows (creator/studio/observer/client/NULL)
12:-- all continue to pass the constraint. No application-layer code path
13:-- assumes a closed-world enum ??challenges-CTA + app/layout role guards
14:-- already fall through to the else branch for unknown roles, which is
15:-- a safe default.
16:--
17:-- Phase 5 entry will introduce the Artist Roster intake surface; this
18:-- migration unblocks the demo account ahead of that surface design and
19:-- does NOT lock-in any artist-specific RLS / RPC shape.
20:
21:ALTER TABLE public.profiles
22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
23:
24:ALTER TABLE public.profiles
25:  ADD CONSTRAINT profiles_role_check CHECK (
26:    (role IS NULL) OR
27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))
28:  );

 succeeded in 649ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3614:    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4037:ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260501140308_phase_4_x_handle_new_user_search_path_hardening.sql:3:-- transition_project_status / is_valid_transition / validate_profile_role_transition
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:1:-- Phase 4.x Wave C.5b amend_02 — widen profiles_role_check to include 'artist'.
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:4:-- as Brand + Artist + YAGI Admin. The profiles_role_check CHECK constraint
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:21:ALTER TABLE public.profiles
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:22:  DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:24:ALTER TABLE public.profiles
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:25:  ADD CONSTRAINT profiles_role_check CHECK (
supabase/migrations\20260501095935_phase_4_x_auto_profile_on_signup.sql:64:  INSERT INTO public.profiles (id, handle, display_name, role, locale)
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:11:--   1. profiles.role enum extension ('client')
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:22:-- 1. profiles role enum — add 'client'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:26:-- (auto-named profiles_role_check). Drop+recreate keeps the NULL-allowed
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:28:ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:29:ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:54:  'Phase 2.7 — company info for users with profiles.role = ''client''. 1:1 FK to profiles. '
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:176:-- profiles/auth.users deletion only. Manual delete via DB role for support cases.
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:191:-- INSERT: only the client themselves, and only after their profiles.role is
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:195:-- validate_profile_role_transition trigger (§9) which prevents self-flipping
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:196:-- profiles.role to 'client' from any prior non-null role.
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:307:-- 6b. profiles.role transition guard (K05-001 Finding 1, HIGH-A)
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:313:--   1. UPDATE profiles SET role = 'client'
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:322:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:378:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:380:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:383:CREATE TRIGGER validate_profile_role_transition_trigger
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:386:  EXECUTE FUNCTION public.validate_profile_role_transition();
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:10:--   N-L2 (LOW) — tg_profiles_role_flip_cleanup scaffold body was RETURN NEW
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:23:--   §3 — tg_profiles_role_flip_cleanup scaffold body changed from RETURN NEW
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:120:-- 3. N-L2 — scaffold guard: tg_profiles_role_flip_cleanup raises loudly
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:123:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:136:  RAISE EXCEPTION 'tg_profiles_role_flip_cleanup scaffold — implement policy body before attaching trigger'
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:22:--        queries in G3/G6 must join profiles.role to surface only active
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:211:-- role-match policies. G3/G6 read queries must join profiles.role to
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:216:CREATE OR REPLACE FUNCTION public.tg_profiles_role_flip_cleanup()
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:229:-- current profiles.role.
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:232:  'read queries must filter by current profiles.role.';
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:236:  'queries must filter by current profiles.role.';
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:24:--       and orphan showcase winner display. profiles.role flip is the canonical
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:62:ALTER TABLE public.profiles
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:66:ALTER TABLE public.profiles
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:73:ALTER TABLE public.profiles
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:91:COMMENT ON TABLE public.creators IS 'Phase 2.5 — AI creator persona (role=creator). 1:1 with profiles.';
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:103:COMMENT ON TABLE public.studios IS 'Phase 2.5 — AI studio org (role=studio). 1:1 with profiles.';
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:105:-- Observer: no child table. profiles.role='observer' alone signals the role.
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:224:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:233:-- their `profiles.role`. Prevents role=studio users from inserting a
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:248:-- Note: no DELETE policy. Soft-delete via profiles.role change (set to NULL
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:257:-- their `profiles.role`. Prevents role=creator users from inserting a

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260425000000_phase_2_7_commission_soft_launch.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=307; $i -le 388; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"profiles\\.role|profile\\.role|role = 'yagi_admin'|role='yagi_admin'|role.*artist|role.*client|is_yagi_admin\" src supabase/migrations/202605*.sql" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 396ms:
307:-- =============================================================================
308:-- Phase 2.7 specifically calls out "signup role 'client' bypass" as
309:-- a no-downgrade vigilance area. Existing Phase 2.5 RLS allows users to
310:-- self-UPDATE their profile, including the `role` column. Without this
311:-- trigger an authenticated creator/studio/observer could:
312:--   1. UPDATE profiles SET role = 'client'
313:--   2. INSERT a clients row (passes clients_insert_self because role='client')
314:--   3. INSERT commission_intakes (passes self-client gate)
315:-- effectively spoofing the client persona to access the commission surface.
316:--
317:-- This trigger blocks any role transition involving 'client' from a
318:-- non-NULL prior role for non-admin callers. Admin-driven role changes
319:-- (yagi_admin) and service-role direct writes bypass.
320:
321:CREATE OR REPLACE FUNCTION public.validate_profile_role_transition()
322:RETURNS TRIGGER
323:LANGUAGE plpgsql
324:SECURITY DEFINER
325:SET search_path = public, pg_temp
326:AS $$
327:DECLARE
328:  v_caller uuid := auth.uid();
329:BEGIN
330:  -- service_role / direct DB sessions bypass ??trusted contexts.
331:  IF v_caller IS NULL THEN
332:    RETURN NEW;
333:  END IF;
334:
335:  -- yagi_admin can change roles freely (e.g., support migrations).
336:  IF public.is_yagi_admin(v_caller) THEN
337:    RETURN NEW;
338:  END IF;
339:
340:  IF TG_OP = 'UPDATE' AND OLD.role IS DISTINCT FROM NEW.role THEN
341:    -- Cannot self-assign 'client' from a prior non-null role. Fresh signup
342:    -- writes profiles via INSERT (which this trigger does not fire on), so
343:    -- the only legitimate UPDATE path to 'client' is admin-driven.
344:    IF NEW.role = 'client' AND OLD.role IS NOT NULL THEN
345:      RAISE EXCEPTION
346:        'cannot self-assign client role from existing role: %',
347:        OLD.role
348:        USING ERRCODE = '42501';
349:    END IF;
350:
351:    -- K05-002 hardening v2 (Loop 2 finding): also block non-NULL -> NULL
352:    -- transitions for non-admin callers. Without this, an attacker could
353:    -- two-step their way around the previous check:
354:    --   creator -> NULL (allowed before)  -> client (allowed because OLD IS NULL).
355:    -- Self-clearing role serves no legitimate user-driven flow today;
356:    -- soft-retirement / role removal is admin-only via the bypass branch.
357:    IF NEW.role IS NULL AND OLD.role IS NOT NULL THEN
358:      RAISE EXCEPTION
359:        'cannot self-clear role from existing role: %',
360:        OLD.role
361:        USING ERRCODE = '42501';
362:    END IF;
363:
364:    -- Once a client, cannot self-change to another role. Admin migration
365:    -- is required (and goes through the bypass branch above).
366:    IF OLD.role = 'client' AND NEW.role IS DISTINCT FROM 'client' THEN
367:      RAISE EXCEPTION
368:        'cannot self-change client role to: %',
369:        NEW.role
370:        USING ERRCODE = '42501';
371:    END IF;
372:  END IF;
373:
374:  RETURN NEW;
375:END $$;
376:
377:REVOKE ALL ON FUNCTION public.validate_profile_role_transition() FROM PUBLIC;
378:
379:DROP TRIGGER IF EXISTS validate_profile_role_transition_trigger
380:  ON public.profiles;
381:
382:CREATE TRIGGER validate_profile_role_transition_trigger
383:  BEFORE UPDATE ON public.profiles
384:  FOR EACH ROW
385:  EXECUTE FUNCTION public.validate_profile_role_transition();
386:
387:
388:-- =============================================================================

2026-05-03T18:06:26.501095Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
src\lib\app\context.ts:14:// `profile.role ===` — see ADR-009 naming rule.
src\lib\app\context.ts:101:      role: (profile.role as ProfileRole | null) ?? null,
src\app\showcase\[slug]\actions.ts:6: * All actions here run against the service-role client because the viewer
src\app\unsubscribe\[token]\actions.ts:5:// This runs with the service-role client because the user isn't necessarily
src\lib\commission\actions.ts:42:  if (!profile || profile.role !== "client") {
src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\commission\queries.ts:46: * use the service-role client for a narrowly-scoped single-column lookup.
src\app\[locale]\app\commission\page.tsx:29:  if (!profile || profile.role !== "client") {
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src\lib\onboarding\role-redirects.ts:28:  if (profile.role === null) {
src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\onboarding\actions.ts:13:  role: "client" | "creator";
src\lib\notifications\emit.ts:5:// Uses the service-role Supabase client so that Server Actions can emit
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\layout.tsx:42:  const isClient = ctx.profile.role === "client";
src\lib\supabase\database.types.ts:2666:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src\app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src\components\project\thread-panel.tsx:804:    client: "role_badge_client",
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\components\project\thread-panel-server.tsx:78:        // Promote to highest-priority role (yagi > admin > client > member).
src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
src\app\[locale]\app\projects\new\actions.ts:150:    // service-role client. The user-scoped supabase client honors
src\app\[locale]\app\projects\new\actions.ts:651://      Resolution: Option A — service-role client scoped to this single INSERT.
src\app\[locale]\app\projects\new\actions.ts:897:  //    Option A: service-role client for this single statement only (bypasses
src\app\[locale]\app\projects\new\actions.ts:899:  //    The service-role client is NOT used for any other read/write in this action.
src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\components\app\sidebar-nav.tsx:40:  /** Visible if user's `profile.role` matches one of these. See ADR-009 for why
src\app\[locale]\app\projects\[id]\board-actions.ts:118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\board-actions.ts:171:  // anymore. Use the service-role client here to write asset_index in
src\app\[locale]\app\projects\[id]\board-actions.ts:465:// to the service-role client because column grants no longer let
src\components\app\sidebar-user-menu.tsx:41:  // Workspace roles take precedence over profile.role for the badge —
src\components\app\sidebar-user-menu.tsx:46:  switch (profile.role) {
src\components\app\sidebar.tsx:70:          profileRole={context.profile.role}
rg: supabase/migrations/202605*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 434ms:
src\lib\app\context.ts:14:// `profile.role ===` — see ADR-009 naming rule.
src\lib\app\context.ts:101:      role: (profile.role as ProfileRole | null) ?? null,
src\app\showcase\[slug]\actions.ts:6: * All actions here run against the service-role client because the viewer
src\app\unsubscribe\[token]\actions.ts:5:// This runs with the service-role client because the user isn't necessarily
src\lib\commission\actions.ts:42:  if (!profile || profile.role !== "client") {
src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\commission\queries.ts:46: * use the service-role client for a narrowly-scoped single-column lookup.
src\app\[locale]\app\commission\page.tsx:29:  if (!profile || profile.role !== "client") {
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src\lib\onboarding\role-redirects.ts:28:  if (profile.role === null) {
src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\onboarding\actions.ts:13:  role: "client" | "creator";
src\lib\notifications\emit.ts:5:// Uses the service-role Supabase client so that Server Actions can emit
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\layout.tsx:42:  const isClient = ctx.profile.role === "client";
src\lib\supabase\database.types.ts:2666:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src\app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src\components\project\thread-panel.tsx:804:    client: "role_badge_client",
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\components\project\thread-panel-server.tsx:78:        // Promote to highest-priority role (yagi > admin > client > member).
src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
src\app\[locale]\app\projects\new\actions.ts:150:    // service-role client. The user-scoped supabase client honors
src\app\[locale]\app\projects\new\actions.ts:651://      Resolution: Option A — service-role client scoped to this single INSERT.
src\app\[locale]\app\projects\new\actions.ts:897:  //    Option A: service-role client for this single statement only (bypasses
src\app\[locale]\app\projects\new\actions.ts:899:  //    The service-role client is NOT used for any other read/write in this action.
src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\components\app\sidebar-nav.tsx:40:  /** Visible if user's `profile.role` matches one of these. See ADR-009 for why
src\app\[locale]\app\projects\[id]\board-actions.ts:118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\board-actions.ts:171:  // anymore. Use the service-role client here to write asset_index in
src\app\[locale]\app\projects\[id]\board-actions.ts:465:// to the service-role client because column grants no longer let
src\components\app\sidebar-user-menu.tsx:41:  // Workspace roles take precedence over profile.role for the badge —
src\components\app\sidebar-user-menu.tsx:46:  switch (profile.role) {
src\components\app\sidebar.tsx:70:          profileRole={context.profile.role}
rg: supabase/migrations/202605*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE (OR REPLACE )?FUNCTION public\\.is_yagi_admin|is_yagi_admin\\(\" supabase/migrations/20260422120000_phase_2_0_baseline.sql supabase/migrations/*.sql" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"role = 'yagi_admin'|role='yagi_admin'|is_yagi_admin\\(\" supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql src/app/[locale]/app/**/*.ts src/lib/**/*.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=278; $i -le 312; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T18:06:44.798058Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
rg: supabase/migrations/*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 439ms:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
rg: supabase/migrations/*.sql: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

2026-05-03T18:06:44.912599Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
rg: src/app/[locale]/app/**/*.ts: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: src/lib/**/*.ts: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 388ms:
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
rg: src/app/[locale]/app/**/*.ts: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)
rg: src/lib/**/*.ts: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 succeeded in 479ms:
278:    SET search_path TO 'public', 'auth'
279:    AS $$
280:  select u.email::text, u.id
281:  from auth.users u
282:  where lower(u.email) = any (select lower(e) from unnest(p_emails) as e)
283:$$;
284:
285:
286:--
287:-- Name: tg_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
288:--
289:
290:CREATE FUNCTION public.tg_set_updated_at() RETURNS trigger
291:    LANGUAGE plpgsql
292:    AS $$
293:begin
294:  new.updated_at := now();
295:  return new;
296:end;
297:$$;
298:
299:
300:--
301:-- Name: tg_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
302:--
303:
304:CREATE FUNCTION public.tg_touch_updated_at() RETURNS trigger
305:    LANGUAGE plpgsql
306:    AS $$
307:begin new.updated_at = now(); return new; end;
308:$$;
309:
310:
311:--
312:-- Name: allow_any_operation(text[]); Type: FUNCTION; Schema: storage; Owner: -

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$p='"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$lines=Get-Content -LiteralPath $p; for($i=174; $i -le 190; $i++){ '"'{0}:{1}' -f "'$i,$lines[$i-1] }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 437ms:
174:$$;
175:
176:
177:--
178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
179:--
180:
181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
182:    LANGUAGE sql STABLE SECURITY DEFINER
183:    SET search_path TO 'public'
184:    AS $$
185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
186:$$;
187:
188:
189:--
190:-- Name: is_yagi_internal_ws(uuid); Type: FUNCTION; Schema: public; Owner: -

codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED-B: `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91` — `project_licenses` admin write/read policies check `profiles.role = 'yagi_admin'`, but YAGI admin authority elsewhere is `public.is_yagi_admin()` / `user_roles`, and `profiles_role_check` does not allow `yagi_admin`; this makes the admin policy effectively unreachable — replace the profile-role subqueries with `public.is_yagi_admin(auth.uid())`.

[FINDING 2] MED-B: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:24` — widening `profiles.role` to include `artist` leaves existing self-update RLS/trigger coverage incomplete, so eligible direct PostgREST callers can self-assign newly added profile roles not blocked by the client-specific transition guard — make `profiles.role` admin/RPC-managed only, or extend `validate_profile_role_transition()` to reject all non-admin role changes.

[FINDING 3] MED-C: `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:6` — `workspaces.kind` is introduced as classification metadata, but existing workspace-admin table-wide UPDATE remains effective, so workspace admins can directly mutate `kind` to `artist` / `yagi_admin` — revoke table-level UPDATE on `workspaces` and re-grant only user-editable columns, or enforce kind immutability in a trigger/RPC.

[FINDING 4] MED-C: `src/app/[locale]/app/projects/new/actions.ts:106` — project creation/update paths accept client-supplied `brand_id` without verifying the brand belongs to the resolved workspace; same pattern appears in draft create/update at lines 320 and 424 — before writing, require `brand_id IS NULL` or SELECT `brands.id` with `workspace_id = resolvedWorkspaceId`, ideally backed by a DB constraint.

VERDICT: NEEDS-ATTENTION — block ff-merge until findings addressed.

Run log: Wave D K-05 final pass found 4 new MED findings outside closed F1-F5; project_boards UPDATE supersession is effective via later `20260504004536` table-level revoke.
2026-05-03T18:07:14.987423Z ERROR codex_core::session: failed to record rollout items: thread 019def03-0c3e-76a2-a267-3f39107c5508 not found
tokens used
699,456
## VERDICT: NEEDS-ATTENTION

[FINDING 1] MED-B: `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:91` — `project_licenses` admin write/read policies check `profiles.role = 'yagi_admin'`, but YAGI admin authority elsewhere is `public.is_yagi_admin()` / `user_roles`, and `profiles_role_check` does not allow `yagi_admin`; this makes the admin policy effectively unreachable — replace the profile-role subqueries with `public.is_yagi_admin(auth.uid())`.

[FINDING 2] MED-B: `supabase/migrations/20260501100806_phase_4_x_widen_profile_role_enum.sql:24` — widening `profiles.role` to include `artist` leaves existing self-update RLS/trigger coverage incomplete, so eligible direct PostgREST callers can self-assign newly added profile roles not blocked by the client-specific transition guard — make `profiles.role` admin/RPC-managed only, or extend `validate_profile_role_transition()` to reject all non-admin role changes.

[FINDING 3] MED-C: `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql:6` — `workspaces.kind` is introduced as classification metadata, but existing workspace-admin table-wide UPDATE remains effective, so workspace admins can directly mutate `kind` to `artist` / `yagi_admin` — revoke table-level UPDATE on `workspaces` and re-grant only user-editable columns, or enforce kind immutability in a trigger/RPC.

[FINDING 4] MED-C: `src/app/[locale]/app/projects/new/actions.ts:106` — project creation/update paths accept client-supplied `brand_id` without verifying the brand belongs to the resolved workspace; same pattern appears in draft create/update at lines 320 and 424 — before writing, require `brand_id IS NULL` or SELECT `brands.id` with `workspace_id = resolvedWorkspaceId`, ideally backed by a DB constraint.

VERDICT: NEEDS-ATTENTION — block ff-merge until findings addressed.

Run log: Wave D K-05 final pass found 4 new MED findings outside closed F1-F5; project_boards UPDATE supersession is effective via later `20260504004536` table-level revoke.
