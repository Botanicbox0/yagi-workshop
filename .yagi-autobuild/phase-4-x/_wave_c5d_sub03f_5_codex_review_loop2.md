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
session id: 019deea2-2f3a-72b1-b215-cd8c3743c45b
--------
user
LOOP 2 of the Wave C.5d sub_03 + sub_03f K-05 review. LOOP 1 (codex exec, same prompt format, output at .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_3_codex_exec_loop1.md) returned VERDICT: NEEDS-ATTENTION with 4 HIGH-B + 1 MED-B findings. The Builder's sub_03f_5 fix commit (d40eb7d) addresses each of them — your task is to confirm closure or reopen.

Findings + fixes to verify:

F1 (HIGH-B → resolved by editing src/app/[locale]/app/projects/new/actions.ts:690):
  Before: storage_key: z.string().regex(/^project-(wizard|board)\//)
  After:  storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//)
  Verify the regex matches what the wizard now writes (board-assets/<user>/<uuid>.pdf) and rejects unrelated prefixes.

F2 (HIGH-B → resolved by editing supabase/migrations/20260504004349_*.sql):
  Before: add_project_board_pdf accepted any board-assets/% prefix
  After:  Three caller-bound prefixes only —
    - board-assets/<v_caller_id>/...
    - project-wizard/<v_caller_id>/...
    - project-board/<p_board_id>/...
  Verify the LIKE patterns are tight (no wildcard at the wrong position), v_caller_id sanitization is sufficient (auth.uid() returns the JWT claim, treat as trusted), and edge cases like null v_caller_id, p_board_id, or malformed text don't open a hole.

F3 (HIGH-B → resolved by NEW migration 20260504010151_*.sql):
  CREATE OR REPLACE FUNCTION seed_project_board_from_wizard
    + assert_caller_bound_pdf_storage_key helper that mirrors F2's prefix logic
    + validation loop over p_initial_attached_pdfs (every storage_key checked)
    + validation loop over p_initial_attached_urls (http/https only, length cap)
    + server-recomputes asset_index from arrays via jsonb_agg (canvas entries skipped — first saveBoardDocumentAction picks them up)
    + p_initial_asset_index parameter retained but ignored
  Verify the validation runs BEFORE any board write (so a malformed attachment array fails the whole seed atomically), the jsonb_agg shape matches the AssetIndexEntry contract (id, source, kind, url, title, thumbnail_url, filename, size_bytes, note, added_at, plus provider for url entries), and v_board_id pre-creation via gen_random_uuid() is safe vs the ON CONFLICT path. Confirm no remaining caller-supplied path can write attached_pdfs / attached_urls / asset_index without going through this function or add_project_board_pdf / add_project_board_url.

F4 (HIGH-B → resolved by editing src/app/[locale]/app/projects/[id]/board-actions.ts:88-128 in updateProjectBoardAction):
  Three-rung owner check before the service-role UPDATE —
    isCreator = project.created_by === user.id
    isYagiAdmin = supabase.rpc('is_yagi_admin', { uid: user.id })
    isWsAdmin = workspace_members.role IN ('owner', 'admin') for project.workspace_id
  If none, return { ok: false, error: 'forbidden' }.
  Verify the SELECT order (project before board) catches an unauthorized caller before the board-existence check, the role string check matches the actual workspace_members.role enum (compare against the schema), and there is no path where the service-role UPDATE runs with isAuthorized still false.

F5 (MED-B → resolved by editing supabase/migrations/20260504004536_*.sql DO block):
  Replaced information_schema.role_table_grants / column_privileges checks with has_table_privilege() / has_column_privilege() calls.
  Coverage now: project_boards table-level UPDATE denied; column UPDATE granted on (document, updated_at); column UPDATE denied on (asset_index, attached_pdfs, attached_urls, is_locked, locked_by, locked_at).
  Verify has_*_privilege() correctly reports effective privileges (including PUBLIC inheritance), the assertion would catch the original Phase 3.1 hotfix-3 bug if re-introduced, and there is no narrow column the assertion still misses (e.g., schema_version, source, project_id, id).

Files in scope (priority order):
- supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql (NEW — F3 the largest fix)
- supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql (F2 in-place edit)
- supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql (F5 in-place edit)
- src/app/[locale]/app/projects/[id]/board-actions.ts (F4)
- src/app/[locale]/app/projects/new/actions.ts (F1)
- src/lib/workspace/active.ts (existing helper, NOT modified — re-check)
- src/app/[locale]/app/projects/new/page.tsx (sub_03b)
- src/app/[locale]/app/projects/new/new-project-wizard.tsx (sub_03b + sub_03f_1)
- src/app/[locale]/app/dashboard/page.tsx (sub_03c)
- src/app/[locale]/app/projects/page.tsx (sub_03e_1)
- src/lib/app/context.ts (sub_03e_2)
- src/app/[locale]/app/layout.tsx (sub_03e_3)

Output format (strict):

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each LOOP 1 finding, declare CLOSED / REOPENED / PARTIAL with one-line justification.
For any new finding (not in LOOP 1):
[FINDING N] CLASS (HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW): file:line — short description — recommended fix.

If 0 reopens and 0 new HIGH/MED findings, declare:
"VERDICT: CLEAN — sub_03 + sub_03f ready for ff-merge after yagi prod migration apply."

Otherwise:
"VERDICT: NEEDS-ATTENTION — do not apply migrations until findings are addressed."

End with a one-line summary suitable for the run log.
codex
I’ll verify the cited fixes against the repo, starting with the migration/function paths and then checking the TypeScript authorization and schema assumptions. After that I’ll produce the strict review verdict with any reopens or new findings.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath '.yagi-autobuild/phase-4-x/_wave_c5d_sub03f_3_codex_exec_loop1.md'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short; git rev-parse --show-toplevel; git log --oneline -5' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "seed_project_board_from_wizard|assert_caller_bound_pdf_storage_key|add_project_board_pdf|updateProjectBoardAction|storage_key|workspace_members|schema_version|asset_index|attached_pdfs|attached_urls" supabase src -S' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 462ms:
src\app\auth\callback\route.ts:94:    .from("workspace_members")
src\components\admin\asset-list-panel.tsx:6: * project_boards.asset_index (server-side computed via extractAssetIndex).
src\components\dashboard\count-cards.tsx:4:// queries scoped to active workspace via workspace_members RLS).
src\lib\workspace\active.ts:6:// cookie's uuid against workspace_members for the current user, then
src\lib\workspace\active.ts:11://      workspace_members membership on the server.
src\lib\workspace\active.ts:49: * Cross-tenant guard: the SELECT joins through workspace_members for the
src\lib\workspace\active.ts:61:    .from("workspace_members")
src\lib\workspace\active.ts:94: * workspace_members, and falls back to the first membership when
src\lib\workspace\actions.ts:44:    .from("workspace_members")
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:1:-- Wave C.5d sub_03f_5 F3 — seed_project_board_from_wizard hardening.
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:6:-- columns on project_boards (attached_pdfs, attached_urls, asset_index)
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:10:-- submitProjectAction's server-side asset_index recomputation and
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:11:-- caller-bound storage_key checks) and persist arbitrary R2 keys.
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:15:--   1. Validates every storage_key in `p_initial_attached_pdfs` is
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:17:--      `add_project_board_pdf` (sub_03f_5 F2):
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:23:--   2. Validates every URL in `p_initial_attached_urls` is http or
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:27:--   3. Server-recomputes `asset_index` from the validated
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:28:--      attached_pdfs + attached_urls arrays. The `p_initial_asset_index`
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:33:--      asset_index including canvas entries via the user-action's
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:40:-- Helper function — caller-bound storage_key check used by the seed
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:41:-- function for every entry in p_initial_attached_pdfs. Mirrored on
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:42:-- add_project_board_pdf inside migration 20260504004349 so the two
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:44:CREATE OR REPLACE FUNCTION assert_caller_bound_pdf_storage_key(
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:45:  p_storage_key text,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:53:  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:54:    RAISE EXCEPTION 'caller-bound check: invalid storage_key (null/traversal/leading slash)';
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:57:    p_storage_key LIKE 'board-assets/' || p_caller_id::text || '/%'
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:58:    OR p_storage_key LIKE 'project-wizard/' || p_caller_id::text || '/%'
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:59:    OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:61:    RAISE EXCEPTION 'caller-bound check: storage_key % not bound to caller % or board %',
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:62:      p_storage_key, p_caller_id, p_board_id;
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:67:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:70:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:71:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:72:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:89:  v_asset_index       jsonb;
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:96:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:113:  -- `project-board/<v_board_id>/...` storage_keys can run before we
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:119:  -- ---------- Validate attached_pdfs ----------
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:120:  IF p_initial_attached_pdfs IS NOT NULL AND jsonb_typeof(p_initial_attached_pdfs) = 'array' THEN
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:121:    FOR v_pdf IN SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:123:      PERFORM assert_caller_bound_pdf_storage_key(
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:124:        v_pdf->>'storage_key',
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:131:  -- ---------- Validate attached_urls (http/https only) ----------
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:132:  IF p_initial_attached_urls IS NOT NULL AND jsonb_typeof(p_initial_attached_urls) = 'array' THEN
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:133:    FOR v_url IN SELECT * FROM jsonb_array_elements(p_initial_attached_urls)
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:140:        RAISE EXCEPTION 'seed_project_board_from_wizard: attached_url scheme must be http or https (got %)',
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:146:  -- ---------- Server-recompute asset_index from arrays ----------
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:148:  -- the first saveBoardDocumentAction call rebuilds asset_index from
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:150:  -- p_initial_asset_index is intentionally ignored.
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:151:  IF p_initial_attached_pdfs IS NOT NULL AND jsonb_typeof(p_initial_attached_pdfs) = 'array' THEN
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:157:        'url',          pdf->>'storage_key',
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:168:    FROM jsonb_array_elements(p_initial_attached_pdfs) AS pdf;
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:171:  IF p_initial_attached_urls IS NOT NULL AND jsonb_typeof(p_initial_attached_urls) = 'array' THEN
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:187:    FROM jsonb_array_elements(p_initial_attached_urls) AS u;
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:190:  v_asset_index := v_pdf_entries || v_url_entries;
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:194:    id, project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:200:    COALESCE(p_initial_attached_pdfs, '[]'::jsonb),
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:201:    COALESCE(p_initial_attached_urls, '[]'::jsonb),
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:202:    v_asset_index,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:207:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:208:        attached_urls = EXCLUDED.attached_urls,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:209:        asset_index   = EXCLUDED.asset_index,
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:218:COMMENT ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb, jsonb, jsonb) IS
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:219:  'Wave C.5d sub_03f_5 F3: caller-bound storage_key validation on every '
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:221:  'asset_index from arrays (canvas entries added on first save). '
supabase\migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:222:  'p_initial_asset_index parameter retained for caller compat but ignored.';
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:9:-- table, so PostgREST clients have been able to UPDATE attached_pdfs /
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:10:-- attached_urls / asset_index directly, bypassing
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:11:-- add_project_board_pdf / add_project_board_url RPC validation
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:12:-- (count cap, URL scheme allowlist, lock state) and the asset_index
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:26:--   - add_project_board_pdf       (SECURITY DEFINER RPC)
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:29:--   - service-role client inside board-actions.ts (asset_index updates
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:67:  -- column. asset_index, attached_pdfs, attached_urls, is_locked,
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:68:  -- locked_by, locked_at, schema_version, source, project_id, id flow
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:71:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:74:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:77:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
src\app\api\share\[token]\comments\route.ts:96:  // than querying workspace_members+auth.users. This keeps the API route
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:2:-- add_project_board_pdf with caller-bound prefix checks.
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:7:-- add_project_board_pdf RPC validation only accepted `project-wizard/%`
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:28:-- persisted in attached_pdfs, so no backfill is required.
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:30:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:32:  p_storage_key text,
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:49:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:58:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:70:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:73:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:80:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:87:  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:88:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (null/traversal/leading slash)';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:96:    p_storage_key LIKE 'board-assets/' || v_caller_id::text || '/%'
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:97:    OR p_storage_key LIKE 'project-wizard/' || v_caller_id::text || '/%'
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:98:    OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:100:    RAISE EXCEPTION 'add_project_board_pdf: storage_key prefix must be caller-bound (board-assets/<caller>/, project-wizard/<caller>/, or project-board/<p_board_id>/)';
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:104:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
supabase\migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:106:    'storage_key', p_storage_key,
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:49:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:68:  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
src\app\[locale]\app\team\[slug]\actions.ts:205:  // with the YAGI Internal workspace_members list. Done as two queries because
src\app\[locale]\app\team\[slug]\actions.ts:234:    .from("workspace_members")
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:3:--            AND add auth gate to seed_project_board_from_wizard 5-arg overload
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:5:--            attached_pdfs, attached_urls, asset_index (attachment writes via RPC only)
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:8:-- FIX HIGH-A #1a: add_project_board_pdf — owner_id -> created_by
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:12:  p_storage_key text,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:38:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:46:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:50:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:53:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:56:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:60:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:64:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:67:  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:68:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:69:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:73:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:75:    'storage_key', p_storage_key,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:136:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:155:  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:216:    SET attached_pdfs = (
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:218:      FROM jsonb_array_elements(attached_pdfs) elem
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:224:    SET attached_urls = (
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:226:      FROM jsonb_array_elements(attached_urls) elem
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:286:  SET attached_urls = (
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:294:    FROM jsonb_array_elements(attached_urls) elem
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:303:-- FIX HIGH-A #1e: seed_project_board_from_wizard (5-arg) — add auth gate
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:308:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:309:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:310:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:326:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:343:    project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:346:    p_project_id, p_initial_document, p_initial_attached_pdfs,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:347:    p_initial_attached_urls, p_initial_asset_index, 'wizard_seed'
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:351:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:352:        attached_urls = EXCLUDED.attached_urls,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:353:        asset_index   = EXCLUDED.asset_index,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:377:          SELECT workspace_members.workspace_id
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:378:          FROM workspace_members
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:379:          WHERE workspace_members.user_id = auth.uid()
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:391:          SELECT workspace_members.workspace_id
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:392:          FROM workspace_members
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:393:          WHERE workspace_members.user_id = auth.uid()
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:1:-- Phase 3.1 hotfix-3: attached_pdfs + attached_urls columns + 4 attachment RPCs + extend seed RPC
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:9:  ADD COLUMN IF NOT EXISTS attached_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:10:  ADD COLUMN IF NOT EXISTS attached_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:13:-- RPC: add_project_board_pdf
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:14:-- Appends a PDF attachment entry to project_boards.attached_pdfs.
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:16:-- size cap (20MB), filename length (200), storage_key prefix.
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:18:-- Does NOT update asset_index (that is server action layer responsibility).
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:22:  p_storage_key text,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:45:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:54:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:59:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:63:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:80:  IF p_storage_key IS NULL
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:81:    OR p_storage_key LIKE '%..%'
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:82:    OR left(p_storage_key, 1) = '/'
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:83:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:90:    attached_pdfs = attached_pdfs || jsonb_build_array(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:93:        'storage_key', p_storage_key,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:109:-- Appends a URL attachment entry to project_boards.attached_urls.
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:156:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:182:    attached_urls = attached_urls || jsonb_build_array(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:203:-- Removes an attachment by id from attached_pdfs or attached_urls.
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:251:      attached_pdfs = COALESCE(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:254:          FROM jsonb_array_elements(attached_pdfs) elem
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:264:      attached_urls = COALESCE(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:267:          FROM jsonb_array_elements(attached_urls) elem
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:327:    attached_urls = (
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:335:      FROM jsonb_array_elements(attached_urls) elem
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:345:-- RPC: seed_project_board_from_wizard (EXTEND signature)
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:346:-- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:353:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:354:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:355:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:382:    attached_pdfs,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:383:    attached_urls,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:384:    asset_index,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:390:    p_initial_attached_pdfs,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:391:    p_initial_attached_urls,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:392:    p_initial_asset_index,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:397:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:398:        attached_urls = EXCLUDED.attached_urls,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:399:        asset_index   = EXCLUDED.asset_index,
supabase\migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
supabase\migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:11:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:3:-- HIGH-A F1: seed_project_board_from_wizard cross-tenant write prevention
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:6:-- HIGH-B F5: support pre-computed asset_index seed (server-computed at submit)
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:9:-- Drop and recreate seed_project_board_from_wizard with auth gate + asset_index param
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:13:  p_initial_asset_index jsonb DEFAULT '[]'::jsonb
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:42:    RAISE EXCEPTION 'seed_project_board_from_wizard: caller % does not own project %', v_caller, p_project_id;
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, document, asset_index, source)
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:51:  VALUES (p_project_id, p_initial_document, COALESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:54:        asset_index  = EXCLUDED.asset_index,
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:63:REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
supabase\migrations\20260429113853_phase_3_1_project_board.sql:12:  schema_version  int  NOT NULL DEFAULT 1,
supabase\migrations\20260429113853_phase_3_1_project_board.sql:13:  asset_index     jsonb NOT NULL DEFAULT '[]'::jsonb,
supabase\migrations\20260429113853_phase_3_1_project_board.sql:51:        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase\migrations\20260429113853_phase_3_1_project_board.sql:69:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase\migrations\20260429113853_phase_3_1_project_board.sql:81:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase\migrations\20260429113853_phase_3_1_project_board.sql:101:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase\migrations\20260429113853_phase_3_1_project_board.sql:112:-- RPC: seed_project_board_from_wizard
supabase\migrations\20260429113853_phase_3_1_project_board.sql:114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
src\lib\team-channels\queries.ts:182:    .from("workspace_members")
src\lib\team-channels\queries.ts:277:    .from("workspace_members")
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:6:-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:15:-- In prod today (2026-04-28) workspace_members only has role='admin' rows
supabase\migrations\20260427020000_phase_2_8_1_commission_convert.sql:148:    FROM public.workspace_members wm
supabase\migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:23:-- and re-validates: non-admin must not change status / tiptap_schema_version,
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:51:  tiptap_schema_version int NOT NULL DEFAULT 1
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:52:                  CHECK (tiptap_schema_version >= 1),
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:108:-- embed). storage_key shape: project-briefs/{project_id}/{uuid}.{ext} —
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:116:  storage_key   text NOT NULL CHECK (char_length(storage_key) BETWEEN 1 AND 500),
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:367:--     3. tiptap_schema_version must be 1 (current schema)
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:370:--     2. tiptap_schema_version frozen
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:416:    IF NEW.tiptap_schema_version <> 1 THEN
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:418:        'non-admin must create project_brief with tiptap_schema_version=1 (got %)',
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:419:        NEW.tiptap_schema_version
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:432:  IF NEW.tiptap_schema_version IS DISTINCT FROM OLD.tiptap_schema_version THEN
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:434:      'only yagi_admin may change tiptap_schema_version'
supabase\migrations\20260426000000_phase_2_8_brief_board.sql:569:-- project_brief_assets is metadata-immutable post-INSERT (storage_key etc.
src\lib\onboarding\state.ts:25:    .from("workspace_members")
src\app\[locale]\app\showcases\page.tsx:72:      .from("workspace_members")
src\app\[locale]\app\showcases\page.tsx:97:      .from("workspace_members")
src\app\[locale]\app\showcases\actions.ts:374:      .from("workspace_members")
src\lib\supabase\database.types.ts:1254:          asset_index: Json
src\lib\supabase\database.types.ts:1255:          attached_pdfs: Json
src\lib\supabase\database.types.ts:1256:          attached_urls: Json
src\lib\supabase\database.types.ts:1264:          schema_version: number
src\lib\supabase\database.types.ts:1269:          asset_index?: Json
src\lib\supabase\database.types.ts:1270:          attached_pdfs?: Json
src\lib\supabase\database.types.ts:1271:          attached_urls?: Json
src\lib\supabase\database.types.ts:1279:          schema_version?: number
src\lib\supabase\database.types.ts:1284:          asset_index?: Json
src\lib\supabase\database.types.ts:1285:          attached_pdfs?: Json
src\lib\supabase\database.types.ts:1286:          attached_urls?: Json
src\lib\supabase\database.types.ts:1294:          schema_version?: number
src\lib\supabase\database.types.ts:1322:          storage_key: string
src\lib\supabase\database.types.ts:1332:          storage_key: string
src\lib\supabase\database.types.ts:1342:          storage_key?: string
src\lib\supabase\database.types.ts:1400:          tiptap_schema_version: number
src\lib\supabase\database.types.ts:1409:          tiptap_schema_version?: number
src\lib\supabase\database.types.ts:1418:          tiptap_schema_version?: number
src\lib\supabase\database.types.ts:2494:      workspace_members: {
src\lib\supabase\database.types.ts:2527:            foreignKeyName: "workspace_members_invited_by_fkey"
src\lib\supabase\database.types.ts:2534:            foreignKeyName: "workspace_members_user_id_fkey"
src\lib\supabase\database.types.ts:2541:            foreignKeyName: "workspace_members_workspace_id_fkey"
src\lib\supabase\database.types.ts:2608:      add_project_board_pdf: {
src\lib\supabase\database.types.ts:2613:          p_storage_key: string
src\lib\supabase\database.types.ts:2683:      seed_project_board_from_wizard:
src\lib\supabase\database.types.ts:2686:              p_initial_asset_index?: Json
src\lib\supabase\database.types.ts:2694:              p_initial_asset_index?: Json
src\lib\supabase\database.types.ts:2695:              p_initial_attached_pdfs?: Json
src\lib\supabase\database.types.ts:2696:              p_initial_attached_urls?: Json
supabase\migrations\20260423020100_seed_yagi_internal_workspace.sql:21:-- row exactly so downstream joins (workspace_members.workspace_id,
src\lib\board\asset-index.ts:5: *   2. attached_pdfs jsonb column entries
src\lib\board\asset-index.ts:6: *   3. attached_urls jsonb column entries
src\lib\board\asset-index.ts:8: * Trust boundary: server actions ALWAYS recompute asset_index server-side.
src\lib\board\asset-index.ts:9: * Client NEVER supplies asset_index (K-05 + L-041).
src\lib\board\asset-index.ts:20:  storage_key: string;
src\lib\board\asset-index.ts:47:  url: string; // for canvas: R2 public URL; for url-attachment: the URL itself; for pdf-attachment: storage_key
src\lib\board\asset-index.ts:60:  // Set when same URL appears in both canvas url-card shapes AND attached_urls
src\lib\board\asset-index.ts:66:// Merges canvas shapes + attached_pdfs + attached_urls into a unified
src\lib\board\asset-index.ts:73:// attached_urls, keep both entries — mark the canvas entry with duplicate:true
src\lib\board\asset-index.ts:82:  attached_pdfs: PdfAttachment[] = [],
src\lib\board\asset-index.ts:83:  attached_urls: UrlAttachment[] = []
src\lib\board\asset-index.ts:88:  // --- Build set of URLs in attached_urls for dedup check ---
src\lib\board\asset-index.ts:90:    attached_urls.map((u) => u.url.toLowerCase().trim())
src\lib\board\asset-index.ts:182:  // --- Map attached_pdfs ---
src\lib\board\asset-index.ts:183:  for (const pdf of attached_pdfs) {
src\lib\board\asset-index.ts:188:      url: pdf.storage_key, // storage_key is the canonical reference; public URL built in display layer
src\lib\board\asset-index.ts:198:  // --- Map attached_urls ---
src\lib\board\asset-index.ts:199:  for (const urlEntry of attached_urls) {
src\lib\board\asset-index.test.ts:58:    storage_key: "project-wizard/abc.pdf",
src\lib\board\asset-index.test.ts:171:  it("keeps both entries when same URL in canvas + attached_urls, canvas entry gets duplicate:true", () => {
src\lib\board\asset-index.test.ts:209:      makePdfAttachment({ id: "pdf-2", uploaded_at: "2026-04-29T08:00:00Z", filename: "second.pdf", storage_key: "project-wizard/b.pdf" }),
src\lib\board\asset-index.test.ts:210:      makePdfAttachment({ id: "pdf-1", uploaded_at: "2026-04-29T07:00:00Z", filename: "first.pdf", storage_key: "project-wizard/a.pdf" }),
supabase\migrations\20260422120000_phase_2_0_baseline.sql:115:  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
supabase\migrations\20260422120000_phase_2_0_baseline.sql:159:    select 1 from workspace_members
supabase\migrations\20260422120000_phase_2_0_baseline.sql:173:  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1813:-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1816:CREATE TABLE public.workspace_members (
supabase\migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2168:-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2564:-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2567:ALTER TABLE ONLY public.workspace_members
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2568:    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2572:-- Name: workspace_members workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2575:ALTER TABLE ONLY public.workspace_members
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2576:    ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2972:CREATE INDEX ws_members_user_idx ON public.workspace_members USING btree (user_id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:2979:CREATE INDEX ws_members_ws_idx ON public.workspace_members USING btree (workspace_id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3642:-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3645:ALTER TABLE ONLY public.workspace_members
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3646:    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3650:-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3653:ALTER TABLE ONLY public.workspace_members
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3654:    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3658:-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3661:ALTER TABLE ONLY public.workspace_members
supabase\migrations\20260422120000_phase_2_0_baseline.sql:3662:    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4464:-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4467:ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4504:-- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4511:-- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4518:-- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4522:   FROM public.workspace_members m
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
src\app\[locale]\app\settings\team-panel.tsx:18:    .from("workspace_members")
src\app\[locale]\app\settings\team-panel.tsx:22:      profile:profiles!workspace_members_user_id_fkey(id, display_name, handle, avatar_url)
src\app\[locale]\app\dashboard\page.tsx:4:// recent RFPs scoped to the active workspace via workspace_members
src\app\[locale]\app\dashboard\page.tsx:74:  // validates the cookie's uuid against workspace_members and falls back
src\lib\app\context.ts:74:    .from("workspace_members")
src\app\[locale]\app\settings\actions.ts:184:    .from("workspace_members")
src\lib\email\new-message.ts:88:        .from("workspace_members")
src\components\project-board\version-history-panel.tsx:50:      // revalidatePath in updateProjectBoardAction's chain (or explicit
src\components\project-detail\board-tab.tsx:36:  attached_pdfs: PdfAttachment[] | null;
src\components\project-detail\board-tab.tsx:37:  attached_urls: UrlAttachment[] | null;
src\components\project-detail\board-tab.tsx:53:    .select("id, document, source, is_locked, attached_pdfs, attached_urls")
src\components\project-detail\board-tab.tsx:100:        initialPdfs={boardRow.attached_pdfs ?? []}
src\components\project-detail\board-tab.tsx:101:        initialUrls={boardRow.attached_urls ?? []}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:433:    // storage_key for wizard PDFs uses the board-assets prefix that
src\app\[locale]\app\projects\new\new-project-wizard.tsx:438:    // satisfy the add_project_board_pdf RPC validation, which left a key
src\app\[locale]\app\projects\new\new-project-wizard.tsx:451:      storage_key: storageKey,
src\components\project-board\brief-board-client.tsx:6: * that debounces autosave calls to updateProjectBoardAction.
src\components\project-board\brief-board-client.tsx:15:import { updateProjectBoardAction } from "@/app/[locale]/app/projects/[id]/board-actions";
src\components\project-board\brief-board-client.tsx:50:            const result = await updateProjectBoardAction({
src\components\project-board\brief-board-client.tsx:56:                "[BriefBoardClient] updateProjectBoardAction failed:",
src\app\[locale]\app\projects\new\actions.ts:139:      // status / current_version / tiptap_schema_version use column defaults
src\app\[locale]\app\projects\new\actions.ts:556:    return { ok: false, error: "storage_key_not_owned" };
src\app\[locale]\app\projects\new\actions.ts:654://   3. RPC seed_project_board_from_wizard(project_id, board_document) —
src\app\[locale]\app\projects\new\actions.ts:688:// Wave C.5d sub_03f_5 F1: extend storage_key prefix allowlist to include
src\app\[locale]\app\projects\new\actions.ts:695:  storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//),
src\app\[locale]\app\projects\new\actions.ts:817:    .from("workspace_members")
src\app\[locale]\app\projects\new\actions.ts:928:  //    K-05 HIGH-B F5 fix: server-recompute asset_index from the board document
src\app\[locale]\app\projects\new\actions.ts:930:  //    (K-05 trust boundary — never trust client-supplied asset_index).
src\app\[locale]\app\projects\new\actions.ts:934:  // Phase 3.1 hotfix-3: compute unified asset_index from all three sources
src\app\[locale]\app\projects\new\actions.ts:936:  // always recomputes — never accepts client-supplied asset_index (L-041).
src\app\[locale]\app\projects\new\actions.ts:946:    "seed_project_board_from_wizard",
src\app\[locale]\app\projects\new\actions.ts:950:      p_initial_attached_pdfs: seedAttachedPdfs,
src\app\[locale]\app\projects\new\actions.ts:951:      p_initial_attached_urls: seedAttachedUrls,
src\app\[locale]\app\projects\new\actions.ts:952:      p_initial_asset_index: seedAssetIndex,
src\app\[locale]\app\projects\new\actions.ts:956:    console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
src\components\project-board\brief-board-attachments-client.tsx:20: *         supplies asset_index.
src\components\project-board\brief-board-attachments-client.tsx:72:        storage_key: "",
src\app\[locale]\app\projects\[id]\thread-actions.ts:312:  // need notifications for a given workspace must be added as workspace_members
src\app\[locale]\app\projects\[id]\thread-actions.ts:316:      .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:358:// query workspace_members (project participants) so non-members never
src\app\[locale]\app\projects\[id]\thread-actions.ts:386:    .from("workspace_members")
src\app\[locale]\app\admin\projects\page.tsx:16:  // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
src\app\[locale]\app\admin\projects\page.tsx:33:      boards:project_boards(asset_index)
src\app\[locale]\app\admin\projects\page.tsx:45:    // Resolve asset count from project_boards.asset_index (preferred);
src\app\[locale]\app\admin\projects\page.tsx:49:      boardRow && Array.isArray(boardRow.asset_index)
src\app\[locale]\app\admin\projects\page.tsx:50:        ? boardRow.asset_index.length
src\app\[locale]\app\preprod\[id]\actions.ts:531:      .from("workspace_members")
src\app\[locale]\app\preprod\[id]\actions.ts:578:    .from("workspace_members")
src\app\[locale]\app\preprod\[id]\share-actions.ts:251:      .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:42:    .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:84:      .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:89:        profile:profiles!workspace_members_user_id_fkey(display_name, id)
src\app\[locale]\app\projects\[id]\board-actions.ts:8: *   - updateProjectBoardAction(projectId, document)
src\app\[locale]\app\projects\[id]\board-actions.ts:9: *       Validates auth + lock state; recomputes asset_index server-side
src\app\[locale]\app\projects\[id]\board-actions.ts:10: *       (K-05 trust boundary — never trust client-supplied asset_index);
src\app\[locale]\app\projects\[id]\board-actions.ts:12: *       updates project_boards.{document, asset_index, updated_at}.
src\app\[locale]\app\projects\[id]\board-actions.ts:19: *       project_boards.document and recomputes asset_index.
src\app\[locale]\app\projects\[id]\board-actions.ts:51:// updateProjectBoardAction
src\app\[locale]\app\projects\[id]\board-actions.ts:77:export async function updateProjectBoardAction(
src\app\[locale]\app\projects\[id]\board-actions.ts:125:        .from("workspace_members")
src\app\[locale]\app\projects\[id]\board-actions.ts:147:  // K-05 trust boundary: server-recompute asset_index. Never trust client.
src\app\[locale]\app\projects\[id]\board-actions.ts:148:  // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
src\app\[locale]\app\projects\[id]\board-actions.ts:152:    .select("attached_pdfs, attached_urls")
src\app\[locale]\app\projects\[id]\board-actions.ts:158:    ((currentBoard as any)?.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:160:    ((currentBoard as any)?.attached_urls ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:170:  // (document, updated_at), so PostgREST cannot UPDATE asset_index
src\app\[locale]\app\projects\[id]\board-actions.ts:171:  // anymore. Use the service-role client here to write asset_index in
src\app\[locale]\app\projects\[id]\board-actions.ts:182:      asset_index: assetIndex,
src\app\[locale]\app\projects\[id]\board-actions.ts:189:    console.error("[updateProjectBoardAction] update error:", uErr);
src\app\[locale]\app\projects\[id]\board-actions.ts:403:  // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
src\app\[locale]\app\projects\[id]\board-actions.ts:406:    .select("attached_pdfs, attached_urls")
src\app\[locale]\app\projects\[id]\board-actions.ts:412:    ((boardForRestore as any)?.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:414:    ((boardForRestore as any)?.attached_urls ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:425:  // asset_index via service role. Admin-only action (yagi_admin gate
src\app\[locale]\app\projects\[id]\board-actions.ts:435:      asset_index: assetIndex,
src\app\[locale]\app\projects\[id]\board-actions.ts:458:// All actions: validate input, call RPC, recompute asset_index server-side,
src\app\[locale]\app\projects\[id]\board-actions.ts:459:// revalidate page. Trust boundary: client never supplies asset_index (L-041).
src\app\[locale]\app\projects\[id]\board-actions.ts:461:// Helper: recompute asset_index from current board state and UPDATE.
src\app\[locale]\app\projects\[id]\board-actions.ts:462:// Wave C.5d sub_03f_2: asset_index is now revoked from authenticated at
src\app\[locale]\app\projects\[id]\board-actions.ts:466:// authenticated write asset_index. Callers (add_project_board_pdf /
src\app\[locale]\app\projects\[id]\board-actions.ts:476:    .select("document, attached_pdfs, attached_urls, project_id")
src\app\[locale]\app\projects\[id]\board-actions.ts:484:    (board.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:486:    (board.attached_urls ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:494:    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
src\app\[locale]\app\projects\[id]\board-actions.ts:567:  // Call add_project_board_pdf RPC
src\app\[locale]\app\projects\[id]\board-actions.ts:570:    "add_project_board_pdf",
src\app\[locale]\app\projects\[id]\board-actions.ts:573:      p_storage_key: storageKey,
src\app\[locale]\app\projects\[id]\board-actions.ts:583:  // Recompute asset_index server-side (trust boundary L-041)
src\app\[locale]\app\projects\[id]\board-actions.ts:738:  // Note is in asset_index entries — must recompute (L-041)
src\app\[locale]\app\admin\projects\[id]\page.tsx:3:// Reads project_boards.asset_index server-side and renders AssetListPanel.
src\app\[locale]\app\admin\projects\[id]\page.tsx:64:  // Fetch project_boards.asset_index (Phase 3.1)
src\app\[locale]\app\admin\projects\[id]\page.tsx:67:    .select("id, asset_index, is_locked")
src\app\[locale]\app\admin\projects\[id]\page.tsx:71:  const assetIndex: AssetIndexEntry[] = Array.isArray(boardRow?.asset_index)
src\app\[locale]\app\admin\projects\[id]\page.tsx:72:    ? (boardRow.asset_index as AssetIndexEntry[])
src\app\[locale]\app\projects\[id]\brief\actions.ts:472:// Flow: validate → derive storage_key → INSERT asset row (RLS gates project
src\app\[locale]\app\projects\[id]\brief\actions.ts:516:      storage_key: storageKey,
src\app\[locale]\app\projects\[id]\brief\actions.ts:579:    .select("storage_key, mime_type, original_name")
src\app\[locale]\app\projects\[id]\brief\actions.ts:591:    url = await createBriefAssetGetUrl(asset.storage_key);

 succeeded in 500ms:
?? .yagi-autobuild/PRODUCT-MASTER.md
?? .yagi-autobuild/phase-4-x/_phase4_changed_files.log
?? .yagi-autobuild/phase-4-x/_phase4_review_targets.log
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
?? .yagi-autobuild/phase-4-x/_wave_d_codex_final_loop1.md
?? .yagi-autobuild/phase-5/
C:/Users/yout4/yagi-studio/yagi-workshop
d40eb7d fix(phase-4-x): wave-c5d sub_03f_5 — Codex K-05 LOOP 1 closure (5 findings, F1-F5)
c891da2 fix(phase-4-x): wave-c5d sub_03f_2 — REVOKE table-level UPDATE + service-role split (P1 RLS bypass)
931703b fix(phase-4-x): wave-c5d sub_03f_1 — wizard PDF storage key + RPC prefix allowlist (P1 data loss)
1c24da5 fix(phase-4-x): wave-c5d sub_03e_3 — SupportWidget workspaceId from active resolver + cascade scope doc
56afb29 fix(phase-4-x): wave-c5d sub_03e_2 — fetchAppContext currentWorkspaceId from active resolver

 succeeded in 938ms:
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
session id: 019dee86-4f7f-7d10-b621-5c04c7c96773
--------
user
You are an adversarial security reviewer for YAGI Studio, a multi-tenant SaaS platform on Next.js 15 + Supabase. The branch g-b-9-phase-4 has 8 commits in Wave C.5d that:

A) Make active workspace authoritative across 8 surfaces (sub_03a/b/c + sub_03e_1/2/3):
   - submitProjectAction (3-path memberSet defense + resolveActiveWorkspace fallback)
   - new-project page brand fetch + activeWorkspaceId prop plumbing
   - new-project-wizard.tsx submit payload includes workspaceId from prop
   - createProject + ensureDraftProject (use resolveActiveWorkspace)
   - dashboard/page.tsx, projects/page.tsx primaryWorkspaceId
   - projects/page.tsx hub query adds .eq("workspace_id", activeWorkspaceId)
   - lib/app/context.ts currentWorkspaceId via resolveActiveWorkspace
   - layout.tsx SupportWidget workspaceId from already-resolved activeWorkspace

B) Close two P1 findings from a generic Codex review (sub_03f_1 + sub_03f_2):
   - sub_03f_1: new-project-wizard.tsx PDF storageKey was prepending "project-wizard" in front of /board-assets/<user>/<uuid>.pdf, persisting a key that did not exist in R2. Fixed by stripping the leading slash so the persisted key matches the R2 key. New migration extends add_project_board_pdf RPC validation to accept board-assets/% prefix in addition to project-wizard/% and project-board/%.
   - sub_03f_2: Phase 3.1 hotfix-3 attempted column-level REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) on project_boards. That is a no-op while the role still holds table-level UPDATE. New migration REVOKEs table-level UPDATE on project_boards from authenticated, then GRANTs UPDATE (document, updated_at) only. Three actions in board-actions.ts (saveBoardDocumentAction = updateProjectBoardAction at line ~88, restoreVersionAction, recomputeAndUpdateAssetIndex helper) switch to a service-role Supabase client for the actual UPDATE while keeping the user-scoped SELECT for RLS authorization. Atomic is_locked=false race guard preserved through service client.

Files to review (most-changed first):
- src/app/[locale]/app/projects/[id]/board-actions.ts (sub_03f_2 service-role split)
- supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql
- supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql
- src/app/[locale]/app/projects/new/new-project-wizard.tsx (sub_03f_1 + sub_03b)
- src/lib/workspace/active.ts (existing helper, NOT modified ??verify logic still safe)
- src/app/[locale]/app/projects/new/actions.ts (sub_03a + sub_03c)
- src/app/[locale]/app/projects/new/page.tsx (sub_03b)
- src/app/[locale]/app/projects/page.tsx (sub_03e_1)
- src/lib/app/context.ts (sub_03e_2)
- src/app/[locale]/app/layout.tsx (sub_03e_3)
- src/app/[locale]/app/dashboard/page.tsx (sub_03c)

You have read access to the repo. Run rg / read files as needed.

Eight focus areas ??be ADVERSARIAL, assume developer is competent but missed an edge case:

1. resolveActiveWorkspace internals ??UUID_RE rejects non-uuid input pre-membership? listOwnWorkspaces RLS-scopes correctly? narrowKind enum fallback for SQL-injection-ish input? cookie-tampering trust boundary? fresh-signup fallback safe?

2. Cascade completeness ??any remaining .from("projects").select() list query without workspace_id filter outside the 3 yagi_admin pages (preprod, preprod/new, invoices/new)? any remaining workspaces[0] / memberships[0] / ctx.workspaces[0] direct array access outside src/lib/workspace/active.ts itself?

3. Defense-in-depth wizard payload ??activeWorkspaceId is client-supplied React state; is it re-verified server-side via memberSet.has() in submitProjectAction Path A? Is there any path that skips memberSet?

4. Race conditions ??between memberSet load and projects.INSERT in submitProjectAction, between user-scoped SELECT and service-role UPDATE in saveBoardDocumentAction (sub_03f_2): is the window meaningfully exploitable?

5. sub_03f_2 migration assertions ??DO block at the bottom of 20260504004536_*.sql checks that authenticated has lost table-level UPDATE and column-level UPDATE on asset_index/attached_pdfs/attached_urls. Are the assertions tight enough? Could the role re-acquire UPDATE through a different grant path (e.g., a role inherited via a chain)?

6. sub_03f_2 service-role split ??do the three actions still authorize correctly before the service-role UPDATE? saveBoardDocumentAction: user-scoped SELECT for is_locked+ownership, then service-role UPDATE ??auth fully checked? restoreVersionAction: yagi_admin gate, service-role UPDATE ??auth fully checked? recomputeAndUpdateAssetIndex helper: caller-side auth (RPC) trusted ??is that enough?

7. sub_03f_1 RPC + wizard mismatch tail ??the new RPC accepts board-assets/% in addition to project-wizard/% and project-board/%. Could a malicious client persist a key like board-assets/<other-user-uuid>/<random>.pdf to read another user's R2 object via PDF download? The R2 layer enforces nothing; storage_key is purely a string the server hands to R2.

8. yagi_admin / yagi-internal admin pages (preprod, preprod/new, invoices/new) ??verify the role gates actually preclude regular users from reaching the cross-workspace project queries. preprod/page.tsx:58-75, preprod/new/page.tsx:27-44, invoices/new/page.tsx:21-27.

Output format (strict):

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each finding:
[FINDING N] CLASS (HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW): file:line ??short description ??recommended fix

Where:
- HIGH-A / MED-A / LOW-A = auto-fixable (single-line code edit)
- HIGH-B / MED-B / LOW-B = structural (multi-file refactor or migration)
- HIGH-C / MED-C / LOW-C = non-auto / requires architectural decision

If you find 0 HIGH or MED findings, declare: "VERDICT: CLEAN ??sub_03 cascade + sub_03f P1 closure ready for ff-merge after yagi prod migration apply."

If you find ANY HIGH or MED finding, declare: "VERDICT: NEEDS-ATTENTION ??do not apply migrations until findings are addressed."

Be thorough. Don't be lenient. Don't accept implicit passes ??verify each focus area explicitly. End with a one-line summary suitable for the run log.
codex
I?셪l review this as a security/code-review pass, not modify files. I?셪l first map the changed surfaces and relevant query patterns, then drill into auth/RLS boundaries and the two migrations.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short; git branch --show-current; git log --oneline -8' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"\\.from\\(\\\"projects\\\"\\)|\\.from\\('projects'\\)|workspaces\\[0\\]|memberships\\[0\\]|ctx\\.workspaces\\[0\\]|resolveActiveWorkspace|listOwnWorkspaces|UUID_RE|narrowKind\" src supabase" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "preprod|invoices/new|yagi_admin|yagi-internal|is_yagi_admin|project_boards|add_project_board_pdf|board-assets|project-wizard|project-board" src supabase/migrations' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 793ms:
?? .yagi-autobuild/PRODUCT-MASTER.md
?? .yagi-autobuild/phase-4-x/_phase4_changed_files.log
?? .yagi-autobuild/phase-4-x/_phase4_review_targets.log
?? .yagi-autobuild/phase-4-x/_wave-c5b-amendments-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5b-codex-amendments-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5b-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5c-prompt-v2.md
?? .yagi-autobuild/phase-4-x/_wave-c5c-prompt.md
?? .yagi-autobuild/phase-4-x/_wave-c5d-prompt.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03_codex_review_loop1.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03e_codex_review_loop1.md
?? .yagi-autobuild/phase-4-x/_wave_c5d_sub03f_3_codex_exec_loop1.md
?? .yagi-autobuild/phase-4-x/_wave_d_codex_final_loop1.md
?? .yagi-autobuild/phase-5/
g-b-9-phase-4
c891da2 fix(phase-4-x): wave-c5d sub_03f_2 ??REVOKE table-level UPDATE + service-role split (P1 RLS bypass)
931703b fix(phase-4-x): wave-c5d sub_03f_1 ??wizard PDF storage key + RPC prefix allowlist (P1 data loss)
1c24da5 fix(phase-4-x): wave-c5d sub_03e_3 ??SupportWidget workspaceId from active resolver + cascade scope doc
56afb29 fix(phase-4-x): wave-c5d sub_03e_2 ??fetchAppContext currentWorkspaceId from active resolver
49c50d8 fix(phase-4-x): wave-c5d sub_03e_1 ??projects list scopes to active workspace
7236ba7 chore(phase-4-x): wave-c5d sub_03c ??sweep first-membership fallback in remaining surfaces
2ba8bd4 feat(phase-4-x): wave-c5d sub_03b ??wizard payload includes workspaceId from active resolver
7f94965 feat(phase-4-x): wave-c5d sub_03a ??submitProjectAction uses active workspace authoritative

2026-05-03T15:48:00.983273Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 1 seconds
Output:
rg: regex parse error:
    (?:\.from\(\)
    ^
error: unclosed group

 exited 1 in 1030ms:
rg: regex parse error:
    (?:\.from\(\)
    ^
error: unclosed group

 succeeded in 1146ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations\20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase/migrations\20260422120000_phase_2_0_baseline.sql:199:    where id = ws_id and slug = 'yagi-internal'
supabase/migrations\20260422120000_phase_2_0_baseline.sql:226:-- Name: preprod_boards_set_workspace_id(); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:229:CREATE FUNCTION public.preprod_boards_set_workspace_id() RETURNS trigger
supabase/migrations\20260422120000_phase_2_0_baseline.sql:236:  select id into yagi_ws_id from public.workspaces where slug = 'yagi-internal';
supabase/migrations\20260422120000_phase_2_0_baseline.sql:238:    raise exception 'yagi-internal workspace not found' using errcode = 'P0001';
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1391:-- Name: preprod_boards; Type: TABLE; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1394:CREATE TABLE public.preprod_boards (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1410:    CONSTRAINT preprod_boards_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'shared'::text, 'approved'::text, 'archived'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1415:-- Name: preprod_frame_comments; Type: TABLE; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1418:CREATE TABLE public.preprod_frame_comments (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1429:    CONSTRAINT preprod_frame_comments_body_check CHECK ((length(body) <= 2000)),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1430:    CONSTRAINT preprod_frame_comments_check CHECK (((author_user_id IS NOT NULL) OR (author_email IS NOT NULL)))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1435:-- Name: preprod_frame_reactions; Type: TABLE; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1438:CREATE TABLE public.preprod_frame_reactions (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1447:    CONSTRAINT preprod_frame_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['like'::text, 'dislike'::text, 'needs_change'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1452:-- Name: preprod_frames; Type: TABLE; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1455:CREATE TABLE public.preprod_frames (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1472:    CONSTRAINT preprod_frames_check CHECK ((((media_type = 'image'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_upload'::text) AND (media_storage_path IS NOT NULL)) OR ((media_type = 'video_embed'::text) AND (media_external_url IS NOT NULL) AND (media_embed_provider IS NOT NULL)))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1473:    CONSTRAINT preprod_frames_media_embed_provider_check CHECK (((media_embed_provider IS NULL) OR (media_embed_provider = ANY (ARRAY['youtube'::text, 'vimeo'::text, 'tiktok'::text, 'instagram'::text])))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1474:    CONSTRAINT preprod_frames_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video_upload'::text, 'video_embed'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2048:-- Data for Name: preprod_boards; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2054:-- Data for Name: preprod_frame_comments; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2060:-- Data for Name: preprod_frame_reactions; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2066:-- Data for Name: preprod_frames; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2316:-- Name: preprod_boards preprod_boards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2319:ALTER TABLE ONLY public.preprod_boards
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2320:    ADD CONSTRAINT preprod_boards_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2324:-- Name: preprod_boards preprod_boards_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2327:ALTER TABLE ONLY public.preprod_boards
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2328:    ADD CONSTRAINT preprod_boards_share_token_key UNIQUE (share_token);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2332:-- Name: preprod_frame_comments preprod_frame_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2335:ALTER TABLE ONLY public.preprod_frame_comments
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2336:    ADD CONSTRAINT preprod_frame_comments_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2340:-- Name: preprod_frame_reactions preprod_frame_reactions_frame_id_reactor_email_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2343:ALTER TABLE ONLY public.preprod_frame_reactions
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2344:    ADD CONSTRAINT preprod_frame_reactions_frame_id_reactor_email_key UNIQUE (frame_id, reactor_email);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2348:-- Name: preprod_frame_reactions preprod_frame_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2351:ALTER TABLE ONLY public.preprod_frame_reactions
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2352:    ADD CONSTRAINT preprod_frame_reactions_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2356:-- Name: preprod_frames preprod_frames_board_id_revision_group_revision_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2359:ALTER TABLE ONLY public.preprod_frames
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2360:    ADD CONSTRAINT preprod_frames_board_id_revision_group_revision_key UNIQUE (board_id, revision_group, revision);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2364:-- Name: preprod_frames preprod_frames_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2367:ALTER TABLE ONLY public.preprod_frames
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2368:    ADD CONSTRAINT preprod_frames_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2759:-- Name: idx_preprod_boards_project; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2762:CREATE INDEX idx_preprod_boards_project ON public.preprod_boards USING btree (project_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2766:-- Name: idx_preprod_boards_share_token; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2769:CREATE UNIQUE INDEX idx_preprod_boards_share_token ON public.preprod_boards USING btree (share_token) WHERE (share_token IS NOT NULL);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2773:-- Name: idx_preprod_comments_board; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2776:CREATE INDEX idx_preprod_comments_board ON public.preprod_frame_comments USING btree (board_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2780:-- Name: idx_preprod_comments_frame; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2783:CREATE INDEX idx_preprod_comments_frame ON public.preprod_frame_comments USING btree (frame_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2787:-- Name: idx_preprod_frames_board; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2790:CREATE INDEX idx_preprod_frames_board ON public.preprod_frames USING btree (board_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2794:-- Name: idx_preprod_frames_one_current; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2797:CREATE UNIQUE INDEX idx_preprod_frames_one_current ON public.preprod_frames USING btree (revision_group) WHERE (is_current_revision = true);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2801:-- Name: idx_preprod_frames_revision_group; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2804:CREATE INDEX idx_preprod_frames_revision_group ON public.preprod_frames USING btree (revision_group, is_current_revision);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2808:-- Name: idx_preprod_reactions_board; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2811:CREATE INDEX idx_preprod_reactions_board ON public.preprod_frame_reactions USING btree (board_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2815:-- Name: idx_preprod_reactions_frame; Type: INDEX; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2818:CREATE INDEX idx_preprod_reactions_frame ON public.preprod_frame_reactions USING btree (frame_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3081:-- Name: preprod_boards preprod_boards_set_workspace_id_ins; Type: TRIGGER; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3084:CREATE TRIGGER preprod_boards_set_workspace_id_ins BEFORE INSERT ON public.preprod_boards FOR EACH ROW EXECUTE FUNCTION public.preprod_boards_set_workspace_id();
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3088:-- Name: preprod_boards preprod_boards_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3091:CREATE TRIGGER preprod_boards_touch_updated_at BEFORE UPDATE ON public.preprod_boards FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3095:-- Name: preprod_frames preprod_frames_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3098:CREATE TRIGGER preprod_frames_touch_updated_at BEFORE UPDATE ON public.preprod_frames FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3102:-- Name: preprod_frame_reactions preprod_reactions_touch_updated_at; Type: TRIGGER; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3105:CREATE TRIGGER preprod_reactions_touch_updated_at BEFORE UPDATE ON public.preprod_frame_reactions FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3314:-- Name: preprod_boards preprod_boards_cover_frame_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3317:ALTER TABLE ONLY public.preprod_boards
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3318:    ADD CONSTRAINT preprod_boards_cover_frame_fk FOREIGN KEY (cover_frame_id) REFERENCES public.preprod_frames(id) ON DELETE SET NULL;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3322:-- Name: preprod_boards preprod_boards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3325:ALTER TABLE ONLY public.preprod_boards
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3326:    ADD CONSTRAINT preprod_boards_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3330:-- Name: preprod_boards preprod_boards_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3333:ALTER TABLE ONLY public.preprod_boards
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3334:    ADD CONSTRAINT preprod_boards_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3338:-- Name: preprod_boards preprod_boards_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3341:ALTER TABLE ONLY public.preprod_boards
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3342:    ADD CONSTRAINT preprod_boards_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3346:-- Name: preprod_frame_comments preprod_frame_comments_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3349:ALTER TABLE ONLY public.preprod_frame_comments
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3350:    ADD CONSTRAINT preprod_frame_comments_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3354:-- Name: preprod_frame_comments preprod_frame_comments_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3357:ALTER TABLE ONLY public.preprod_frame_comments
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3358:    ADD CONSTRAINT preprod_frame_comments_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3362:-- Name: preprod_frame_comments preprod_frame_comments_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3365:ALTER TABLE ONLY public.preprod_frame_comments
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3366:    ADD CONSTRAINT preprod_frame_comments_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3370:-- Name: preprod_frame_comments preprod_frame_comments_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3373:ALTER TABLE ONLY public.preprod_frame_comments
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3374:    ADD CONSTRAINT preprod_frame_comments_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES auth.users(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3378:-- Name: preprod_frame_reactions preprod_frame_reactions_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3381:ALTER TABLE ONLY public.preprod_frame_reactions
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3382:    ADD CONSTRAINT preprod_frame_reactions_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3386:-- Name: preprod_frame_reactions preprod_frame_reactions_frame_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3389:ALTER TABLE ONLY public.preprod_frame_reactions
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3390:    ADD CONSTRAINT preprod_frame_reactions_frame_id_fkey FOREIGN KEY (frame_id) REFERENCES public.preprod_frames(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3394:-- Name: preprod_frames preprod_frames_board_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3397:ALTER TABLE ONLY public.preprod_frames
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3398:    ADD CONSTRAINT preprod_frames_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3518:    ADD CONSTRAINT showcases_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.preprod_boards(id);
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
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3915:-- Name: preprod_boards; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3918:ALTER TABLE public.preprod_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3921:-- Name: preprod_boards preprod_boards_delete; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3928:-- Name: preprod_boards preprod_boards_insert; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3935:-- Name: preprod_boards preprod_boards_select; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3942:-- Name: preprod_boards preprod_boards_update; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3949:-- Name: preprod_frame_comments preprod_comments_select; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3952:CREATE POLICY preprod_comments_select ON public.preprod_frame_comments FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3953:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3958:-- Name: preprod_frame_comments preprod_comments_update; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3961:CREATE POLICY preprod_comments_update ON public.preprod_frame_comments FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3962:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3964:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3969:-- Name: preprod_frame_comments; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3972:ALTER TABLE public.preprod_frame_comments ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3975:-- Name: preprod_frame_reactions; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3978:ALTER TABLE public.preprod_frame_reactions ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3981:-- Name: preprod_frames; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3984:ALTER TABLE public.preprod_frames ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3987:-- Name: preprod_frames preprod_frames_delete; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3990:CREATE POLICY preprod_frames_delete ON public.preprod_frames FOR DELETE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3991:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3996:-- Name: preprod_frames preprod_frames_insert; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3999:CREATE POLICY preprod_frames_insert ON public.preprod_frames FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4000:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4005:-- Name: preprod_frames preprod_frames_select; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4008:CREATE POLICY preprod_frames_select ON public.preprod_frames FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4009:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4014:-- Name: preprod_frames preprod_frames_update; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4017:CREATE POLICY preprod_frames_update ON public.preprod_frames FOR UPDATE USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4018:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4020:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4025:-- Name: preprod_frame_reactions preprod_reactions_select; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4028:CREATE POLICY preprod_reactions_select ON public.preprod_frame_reactions FOR SELECT USING ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4029:   FROM public.preprod_boards b
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
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4623:-- Name: objects preprod-frames delete internal; Type: POLICY; Schema: storage; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4627:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4632:-- Name: objects preprod-frames read internal; Type: POLICY; Schema: storage; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4636:   FROM public.preprod_boards b
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4641:-- Name: objects preprod-frames write internal; Type: POLICY; Schema: storage; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4645:   FROM public.preprod_boards b
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
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4814:  ('preprod-frames',           'preprod-frames',           false),
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:38:-- Same shape as #2: USING limits WHICH rows a yagi_admin can UPDATE, but
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:55:-- could be UPDATE'd out of the yagi-internal workspace (workspace_id flipped
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:79:-- Same class of gap: a yagi_admin authorized to UPDATE a showcase-media
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260423020000_h1_preprod_realtime_publication.sql:3:-- Add preprod feedback tables to the supabase_realtime publication.
supabase/migrations\20260423020000_h1_preprod_realtime_publication.sql:5:-- src/components/preprod/board-editor.tsx (postgres_changes on reactions +
supabase/migrations\20260423020000_h1_preprod_realtime_publication.sql:27:      AND tablename = 'preprod_frame_reactions'
supabase/migrations\20260423020000_h1_preprod_realtime_publication.sql:29:    ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_reactions;
supabase/migrations\20260423020000_h1_preprod_realtime_publication.sql:39:      AND tablename = 'preprod_frame_comments'
supabase/migrations\20260423020000_h1_preprod_realtime_publication.sql:41:    ALTER PUBLICATION supabase_realtime ADD TABLE public.preprod_frame_comments;
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:1:-- Phase 2.1 G3 ??seed yagi-internal workspace row.
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:4:--   - preprod_boards_set_workspace_id trigger does a hard lookup of
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:5:--     `slug='yagi-internal'` and raises "yagi-internal workspace not found"
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:8:--     compares workspace_id against the yagi-internal id at query time ??supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:9:--     no row means no yagi-internal authorization surface exists.
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:14:-- preprod/team-chat paths until operator hand-ran an INSERT. This migration
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:33:  'yagi-internal',
src\emails\notification-digest.tsx:253:      url_path: "/en/app/preprod/preview-board",
src\emails\notification-digest.tsx:260:      url_path: "/en/app/preprod/preview-board",
supabase/migrations\20260423020200_create_meeting_with_attendees_rpc.sql:15:-- inserts to ws_admin / yagi_admin, and the caller has already been
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
src\lib\app\scopes.ts:30:  if (ctx.workspaceRoles.includes("yagi_admin")) {
src\lib\app\context.ts:10:  | "yagi_admin";
src\components\brief-board\yagi-request-modal.tsx:8:// `project_brief_yagi_request` notification to every yagi_admin via the
src\components\app\sidebar.tsx:22:  return context.workspaces.some((w) => w.slug === "yagi-internal");
src\components\app\sidebar.tsx:52:          SidebarScopeSwitcher at the sidebar top. yagi_admin / profile
src\components\app\sidebar-user-menu.tsx:44:  if (workspaceRoles.includes("yagi_admin")) return "YAGI Admin";
src\components\brief-board\lock-button.tsx:4:// Phase 2.8 G_B-6 ??Lock / Unlock button (yagi_admin-only)
src\components\brief-board\lock-button.tsx:8:// trigger. Server actions lockBrief / unlockBrief enforce yagi_admin via
src\components\app\sidebar-nav.tsx:84:        // Phase 2.5 admin challenge console ??yagi_admin only.
src\components\app\sidebar-nav.tsx:87:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:94:      // Phase 2.7.1: preprod / showcases / storyboards / brands removed
src\components\app\sidebar-nav.tsx:114:      // `team` is injected at render time when the user is a yagi-internal member.
src\components\app\sidebar-nav.tsx:127:            roles: ["yagi_admin", "workspace_admin"],
src\components\app\sidebar-nav.tsx:129:          { key: "admin_invoices", href: "/app/admin/invoices", roles: ["yagi_admin"] },
src\components\app\sidebar-nav.tsx:138:      { key: "admin", href: "/app/admin", icon: ShieldCheck, roles: ["yagi_admin"] },
src\components\app\sidebar-nav.tsx:144:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:147:        // Phase 2.8.2 G_B2_A ??yagi_admin trash console for soft-deleted
src\components\app\sidebar-nav.tsx:151:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:154:        // Phase 2.8.6 ??yagi_admin support chat reply surface.
src\components\app\sidebar-nav.tsx:157:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:264:  // Runtime-injected `team` item (yagi-internal member only).
src\components\brief-board\editor.tsx:109:   * by the detail page (task_05) when no `project_boards` row of the new system
src\components\admin\asset-list-panel.tsx:6: * project_boards.asset_index (server-side computed via extractAssetIndex).
src\lib\invoices\suggest-line-items.ts:27: *   - preprod_boards with status IN ('shared','approved') AND updated_at within [from, to]
src\lib\invoices\suggest-line-items.ts:68:  // 3. Fetch shared/approved preprod_boards in range (use updated_at as the proxy for "delivered")
src\lib\invoices\suggest-line-items.ts:70:    .from("preprod_boards")
src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
src\components\challenges\header-cta-resolver.tsx:34:    .eq("role", "yagi_admin")
src\lib\workspace\active.ts:24:export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\lib\workspace\active.ts:38:  if (value === "brand" || value === "artist" || value === "yagi_admin") {
src\app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
src\app\api\health\google\route.ts:20:    .eq('role', 'yagi_admin')
src\lib\handles\reserved.ts:25:  "team", "teams", "preprod", "brands", "brand", "billing", "storyboards",
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:1:-- Wave C.5d sub_03f_2 ??close the project_boards UPDATE bypass.
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:11:-- add_project_board_pdf / add_project_board_url RPC validation
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:23:-- client can UPDATE on project_boards are `document` (the user's own
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:26:--   - add_project_board_pdf       (SECURITY DEFINER RPC)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:53:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:57:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has table-level UPDATE on project_boards';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:62:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:66:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost UPDATE on project_boards.document';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:71:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:75:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.asset_index';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:80:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:84:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_pdfs';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:89:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:93:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_urls';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:1:-- Wave C.5d sub_03f_1 ??allow `board-assets/` prefix on
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:2:-- add_project_board_pdf so wizard PDFs can be persisted with their
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:6:-- server-side R2 upload key shaped like `board-assets/<user>/<uuid>.<ext>`
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:8:-- add_project_board_pdf RPC validation only accepted `project-wizard/%`
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:9:-- and `project-board/%` prefixes, which forced the wizard client to
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:10:-- prepend a literal "project-wizard" segment in front of the real key
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:12:-- (`project-wizard/board-assets/<user>/<uuid>.<ext>`) did not exist in
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:17:-- `board-assets/%`, and the wizard now writes the bare R2 key.
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:21:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:40:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:45:  FROM project_boards pb
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:49:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:52:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:57:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:65:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:67:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:75:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:80:      p_storage_key NOT LIKE 'project-wizard/%'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:81:      AND p_storage_key NOT LIKE 'project-board/%'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:82:      AND p_storage_key NOT LIKE 'board-assets/%'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/, project-board/, or board-assets/)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:87:  UPDATE project_boards
src\app\api\share\[token]\reactions\route.ts:41:    .from("preprod_boards")
src\app\api\share\[token]\reactions\route.ts:53:    .from("preprod_frames")
src\app\api\share\[token]\reactions\route.ts:65:    .from("preprod_frame_reactions")
src\app\api\share\[token]\reactions\route.ts:85:    .from("preprod_frame_reactions")
src\app\api\share\[token]\reactions\route.ts:103:      .eq("role", "yagi_admin")
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:8:    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:11:-- yagi_admin workspace requires a MANUAL UPDATE after verify
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:69:-- SELECT: yagi_admin (all rows) + project owner client (own rows)
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:75:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:90:-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 stage)
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:96:      WHERE id = auth.uid() AND role = 'yagi_admin'
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:102:      WHERE id = auth.uid() AND role = 'yagi_admin'
src\app\auth\callback\route.ts:103:    .in("role", ["creator", "yagi_admin"]);
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:30:  FROM project_boards pb
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:50:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:67:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:4:-- HIGH-A #2: Restrict project_boards_update_client policy to exclude
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:8:-- FIX HIGH-A #1a: add_project_board_pdf ??owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:34:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:38:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:46:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:50:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:54:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:56:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:60:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:64:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:68:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:69:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:72:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:117:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:137:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:154:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:195:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:202:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:215:    UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:223:    UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:262:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:269:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:285:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342:  INSERT INTO project_boards (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:363:-- FIX HIGH-A #2: Restrict project_boards_update_client policy +
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:366:DROP POLICY IF EXISTS project_boards_update_client ON project_boards;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:385:    is_yagi_admin(auth.uid())
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
src\app\api\share\[token]\comments\route.ts:52:    .from("preprod_boards")
src\app\api\share\[token]\comments\route.ts:64:    .from("preprod_frames")
src\app\api\share\[token]\comments\route.ts:76:    .from("preprod_frame_comments")
src\app\api\share\[token]\comments\route.ts:99:  // enhancement can fan out to all yagi_admin emails via a DB query.
src\app\api\share\[token]\comments\route.ts:102:  const editorUrl = `${siteUrl}/app/preprod/${board.id}`;
src\app\api\share\[token]\comments\route.ts:136:      .eq("role", "yagi_admin")
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:6:-- Schema changes: add attachment columns to project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:8:ALTER TABLE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:13:-- RPC: add_project_board_pdf
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:14:-- Appends a PDF attachment entry to project_boards.attached_pdfs.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:15:-- Validates: caller ownership OR yagi_admin, lock state, count cap (30),
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:41:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:45:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:48:  -- Role check: owner OR yagi_admin
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:54:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:59:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:64:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:83:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:88:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:109:-- Appends a URL attachment entry to project_boards.attached_urls.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:110:-- Validates: caller ownership OR yagi_admin, lock state, count cap (50),
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:137:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:157:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:180:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:205:-- Validates: caller ownership OR yagi_admin, lock state.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:225:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:249:    UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:262:    UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:283:-- Validates: caller ownership OR yagi_admin, lock state, note length (500).
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:302:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:325:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:379:  INSERT INTO project_boards (
src\lib\team-channels\queries.ts:36:const YAGI_INTERNAL_SLUG = "yagi-internal";
src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src\components\projects\admin-delete-button.tsx:27:// Phase 2.8.2 G_B2_A ??yagi_admin-only project soft-delete trigger.
src\components\projects\wizard\reference-board.tsx:284:        const storageKey = `project-wizard/${id}.${ext}`;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, document, asset_index, source)
src\lib\email\new-message.ts:95:        .eq("role", "yagi_admin"),
supabase/migrations\20260429113853_phase_3_1_project_board.sql:1:-- Phase 3.1: project_boards + project_board_versions + 3 RPCs + RLS
supabase/migrations\20260429113853_phase_3_1_project_board.sql:6:-- Table: project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
supabase/migrations\20260429113853_phase_3_1_project_board.sql:27:  board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:40:-- RLS: project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:97:      SELECT pb.id FROM project_boards pb
supabase/migrations\20260429113853_phase_3_1_project_board.sql:140:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260429113853_phase_3_1_project_board.sql:167:    RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
supabase/migrations\20260429113853_phase_3_1_project_board.sql:170:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260429113853_phase_3_1_project_board.sql:194:    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
supabase/migrations\20260429113853_phase_3_1_project_board.sql:197:  UPDATE project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:214:INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:217:WHERE id NOT IN (SELECT project_id FROM project_boards)
src\components\projects\status-timeline.tsx:168:                      : row.actor_role === 'yagi_admin'
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:14:-- Fix: support_threads_update is now yagi_admin-only. The application
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:18:-- SECURITY DEFINER trigger. yagi_admin retains full UPDATE access for
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
src\app\api\share\[token]\approve\route.ts:47:    .from("preprod_boards")
src\app\api\share\[token]\approve\route.ts:66:    .from("preprod_boards")
src\app\api\share\[token]\approve\route.ts:95:  const editorUrl = `${siteUrl}/app/preprod/${board.id}`;
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:16:--   update. yagi_admin and ws_admin lanes are unchanged.
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:35:--   'closed'. Intent: only yagi_admin can close/reopen. Tighten:
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:144:-- 5. support_threads_update ??only yagi_admin may flip status ------
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:167:-- a BEFORE UPDATE trigger that raises if the caller is NOT a yagi_admin
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
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
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:32:--        - ws_admin / yagi_admin keep their existing full-access lanes.
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:11:--   6. Lock state-transition + column-guard trigger (yagi_admin-only flip)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:59:  'status: editing (default) or locked (production frozen, yagi_admin-only flip).';
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:172:--     OR yagi_admin. Brief Board is collaborative (Y3: admin can fill draft).
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:175:--   - status flip ('editing' ??'locked'): yagi_admin only ??enforced by
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:221:-- columns. yagi_admin bypasses the editing check via the second policy.
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:270:-- INSERT: workspace member or yagi_admin. created_by must equal auth.uid()
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:329:-- DELETE: own uploads or yagi_admin (SPEC 짠3.6).
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:363:-- Guards (non-yagi_admin caller):
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:369:--     1. status frozen (lock/unlock is yagi_admin only ??SPEC 짠5.4)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:379:-- yagi_admin bypasses all column guards (lock/unlock requires it; admin
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:428:      'only yagi_admin may change project_brief status'
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:434:      'only yagi_admin may change tiptap_schema_version'
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:506:-- must unlock first (yagi_admin only). Defense-in-depth alongside
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:519:  -- a yagi_admin lock arriving while we're snapshotting). Without this,
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:25:--   gate (yagi_admin bypasses, matching the read-side pattern).
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:89:  -- trashed projects. yagi_admin bypasses (so a yagi-side restore +
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
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
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:12:--        - yagi_admin only
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:176:  --    INSERTs; this RPC is yagi_admin so the bypass branch applies.
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:232:  --    yagi_admin.
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:264:  'converted, and notify the client. yagi_admin only. Idempotent on re-call.';
supabase/migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:4:-- yagi_admin needs to remove erroneous projects (test data, accidental
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:7:-- automatically; yagi_admin reads see everything so the trash console
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:12:--   2. RLS read         ??ws_member sees deleted_at IS NULL; yagi_admin sees all
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:13:--   3. RLS update       ??ws_admin can only update non-deleted rows; yagi_admin
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:24:-- Cascade on hard delete: meetings, notification_events, preprod_boards,
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:65:  -- Authorize: workspace member of the owning project, or yagi_admin.
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:37:  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
supabase/migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
src\components\project\thread-panel.tsx:48:   *  yagi  = yagi_admin (service-provider side)
src\components\project\thread-panel.tsx:678:        {/* Visibility toggle ??only for yagi_admin */}
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
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
src\components\project\thread-panel-server.tsx:56:      // workspace_member roles correctly; yagi_admin is global so its
src\components\project\thread-panel-server.tsx:80:          r.role === "yagi_admin"
src\components\project\thread-panel-server.tsx:170:  // Determine if the current user is yagi_admin.
src\components\project\thread-panel-server.tsx:176:    .eq("role", "yagi_admin");
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:21:--   'yagi_admin'      ??user_roles.role = 'yagi_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:145:                                   'client', 'yagi_admin', 'workspace_admin', 'system'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:258:-- actor_role IN ('yagi_admin','workspace_admin'):
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:306:    -- ---- admin transitions (yagi_admin OR workspace_admin) ----
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:307:    WHEN actor_role IN ('yagi_admin','workspace_admin') THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:350:--   yagi_admin  ??actor_role = 'yagi_admin'
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:359:--   admin path:  caller must have yagi_admin or workspace_admin role for project's workspace
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:417:    v_actor_role := 'yagi_admin';
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:431:  -- on any project in the workspace (or any project for yagi_admin).
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:538:  -- Allow yagi_admin for emergency console fixes
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:560:  'local.transition_rpc_active=true, (2) yagi_admin bypass for emergencies.';
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:580:-- SELECT: yagi_admin can read all history
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:609:-- yagi_admin). Phase 3.0 replaces it with split CRUD policies:
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:611:--   - yagi_admin: SELECT only (admins read references but client owns them)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:618:-- SELECT: client (own projects) + yagi_admin (all)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:678:-- ws_admin or yagi_admin to update non-deleted rows. The trigger guard in
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:705:    -- yagi_admin: unrestricted (including trashed project restore)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:719:    -- yagi_admin: unrestricted
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:726:  'yagi_admin unrestricted. Status column changes are additionally gated by '
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:728:  'or yagi_admin may change projects.status.';
src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\supabase\database.types.ts:916:      preprod_boards: {
src\lib\supabase\database.types.ts:970:            foreignKeyName: "preprod_boards_cover_frame_fk"
src\lib\supabase\database.types.ts:973:            referencedRelation: "preprod_frames"
src\lib\supabase\database.types.ts:977:            foreignKeyName: "preprod_boards_project_id_fkey"
src\lib\supabase\database.types.ts:984:            foreignKeyName: "preprod_boards_workspace_id_fkey"
src\lib\supabase\database.types.ts:992:      preprod_frame_comments: {
src\lib\supabase\database.types.ts:1031:            foreignKeyName: "preprod_frame_comments_board_id_fkey"
src\lib\supabase\database.types.ts:1034:            referencedRelation: "preprod_boards"
src\lib\supabase\database.types.ts:1038:            foreignKeyName: "preprod_frame_comments_frame_id_fkey"
src\lib\supabase\database.types.ts:1041:            referencedRelation: "preprod_frames"
src\lib\supabase\database.types.ts:1046:      preprod_frame_reactions: {
src\lib\supabase\database.types.ts:1079:            foreignKeyName: "preprod_frame_reactions_board_id_fkey"
src\lib\supabase\database.types.ts:1082:            referencedRelation: "preprod_boards"
src\lib\supabase\database.types.ts:1086:            foreignKeyName: "preprod_frame_reactions_frame_id_fkey"
src\lib\supabase\database.types.ts:1089:            referencedRelation: "preprod_frames"
src\lib\supabase\database.types.ts:1094:      preprod_frames: {
src\lib\supabase\database.types.ts:1151:            foreignKeyName: "preprod_frames_board_id_fkey"
src\lib\supabase\database.types.ts:1154:            referencedRelation: "preprod_boards"
src\lib\supabase\database.types.ts:1240:            referencedRelation: "project_boards"
src\lib\supabase\database.types.ts:1252:      project_boards: {
src\lib\supabase\database.types.ts:1300:            foreignKeyName: "project_boards_locked_by_fkey"
src\lib\supabase\database.types.ts:1307:            foreignKeyName: "project_boards_project_id_fkey"
src\lib\supabase\database.types.ts:2000:            referencedRelation: "preprod_boards"
src\lib\supabase\database.types.ts:2608:      add_project_board_pdf: {
src\lib\supabase\database.types.ts:2666:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
src\lib\board\asset-index.test.ts:58:    storage_key: "project-wizard/abc.pdf",
src\lib\board\asset-index.test.ts:209:      makePdfAttachment({ id: "pdf-2", uploaded_at: "2026-04-29T08:00:00Z", filename: "second.pdf", storage_key: "project-wizard/b.pdf" }),
src\lib\board\asset-index.test.ts:210:      makePdfAttachment({ id: "pdf-1", uploaded_at: "2026-04-29T07:00:00Z", filename: "first.pdf", storage_key: "project-wizard/a.pdf" }),
src\lib\share\share-data.ts:5:export type BoardRow = Tables<"preprod_boards">;
src\lib\share\share-data.ts:6:export type FrameRow = Tables<"preprod_frames">;
src\lib\share\share-data.ts:7:export type ReactionRow = Tables<"preprod_frame_reactions">;
src\lib\share\share-data.ts:8:export type CommentRow = Tables<"preprod_frame_comments">;
src\lib\share\share-data.ts:32:    .from("preprod_boards")
src\lib\share\share-data.ts:52:    .from("preprod_frames")
src\lib\share\share-data.ts:62:    .from("preprod_frames")
src\lib\share\share-data.ts:73:      .from("preprod_frame_reactions")
src\lib\share\share-data.ts:77:      .from("preprod_frame_comments")
src\lib\share\share-data.ts:137:        .from("preprod-frames")
src\components\preprod\new-board-form.tsx:11:import { createBoard } from "@/app/[locale]/app/preprod/actions";
src\components\preprod\new-board-form.tsx:30:  const t = useTranslations("preprod");
src\components\preprod\new-board-form.tsx:60:      router.push(`/app/preprod/${result.id}` as `/app/preprod/${string}`);
src\components\preprod\board-editor.tsx:80:} from "@/app/[locale]/app/preprod/[id]/actions";
src\components\preprod\board-editor.tsx:528:  const tPreprod = useTranslations("preprod");
src\components\preprod\board-editor.tsx:836:  const tPreprod = useTranslations("preprod");
src\components\preprod\board-editor.tsx:1007:      .channel(`preprod_board_${board.id}`)
src\components\preprod\board-editor.tsx:1013:          table: "preprod_frame_reactions",
src\components\preprod\board-editor.tsx:1040:          table: "preprod_frame_comments",
src\components\preprod\board-editor.tsx:1295:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1320:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1378:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1391:          .from("preprod-frames")
src\components\preprod\board-editor.tsx:1416:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1524:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1548:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1629:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1642:          .from("preprod-frames")
src\components\preprod\board-editor.tsx:1664:        .from("preprod-frames")
src\components\preprod\board-editor.tsx:1838:          .from("preprod-frames")
src\components\preprod\board-editor.tsx:1845:            .from("preprod-frames")
src\components\preprod\board-editor.tsx:2042:          href={backHref as "/app/preprod"}
src\components\project-detail\progress-tab.tsx:6:// - Authorization is page.tsx's job (BLOCKER 1 created_by + yagi_admin).
src\components\project-detail\board-tab.tsx:9://   (BLOCKER 1: project.created_by === auth.uid() OR yagi_admin).
src\components\project-detail\board-tab.tsx:11:// - The board RLS itself enforces row-scope (project_boards policy).
src\components\project-detail\board-tab.tsx:20:import { BriefBoardShellClient } from "@/components/project-board/brief-board-shell-client";
src\components\project-detail\board-tab.tsx:21:import type { VersionEntry } from "@/components/project-board/version-history-panel";
src\components\project-detail\board-tab.tsx:52:    .from("project_boards")
src\components\project-detail\board-tab.tsx:99:        viewerRole={isYagiAdmin ? "yagi_admin" : "client"}
src\components\project-detail\board-tab.tsx:125:  // (every wizard submit seeds a project_boards row). If it happens,
src\lib\onboarding\state.ts:34:    .in("role", ["creator", "yagi_admin"]);
src\components\support\support-widget.tsx:100:          // ensures cross-thread inserts visible to a yagi_admin do
src\components\sidebar\workspace-switcher.tsx:37:type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\components\sidebar\workspace-switcher.tsx:60:  const admins = workspaces.filter((w) => w.kind === "yagi_admin");
src\app\[locale]\app\layout.tsx:38:    ctx.workspaceRoles.includes("yagi_admin") ||
src\components\project-board\brief-board-shell-client.tsx:8: *   - LockButton (yagi_admin only)
src\components\project-board\brief-board-shell-client.tsx:41:  viewerRole: "client" | "yagi_admin";
src\components\project-board\brief-board-shell-client.tsx:70:  const isClientView = viewerRole !== "yagi_admin";
src\components\project-board\brief-board-shell-client.tsx:101:        {/* Lock button ??yagi_admin only, brief mode only */}
src\components\project-board\brief-board-shell-client.tsx:102:        {viewerRole === "yagi_admin" && (
src\components\project-board\brief-board-shell-client.tsx:126:      {/* L-033: canvas-internal PDF/URL drop preserved separately in project-board.tsx */}
src\components\project-board\version-history-panel.tsx:25:  viewerRole: "client" | "yagi_admin";
src\components\project-board\version-history-panel.tsx:38:  const isAdmin = viewerRole === "yagi_admin";
src\components\project-board\brief-board-client.tsx:14:import { ProjectBoard } from "./project-board";
src\components\project-board\brief-board-client.tsx:23:  viewerRole: "client" | "yagi_admin";
src\components\project-board\brief-board-client.tsx:42:      if (locked && viewerRole !== "yagi_admin") return;
src\components\project-board\brief-board-attachments-client.tsx:17: * L-033: Canvas-internal PDF/URL drop is separate (handled in project-board.tsx).
src\components\project-board\project-board.tsx:4: * project-board.tsx
src\components\project-board\project-board.tsx:141:  viewerRole?: "client" | "yagi_admin";
src\components\project-board\project-board.tsx:181:    (locked && viewerRole !== "yagi_admin");
src\components\project-board\project-board.tsx:447:      // === TASK_05_STUB: lock/unlock action (brief mode, yagi_admin only) ===
src\components\project-board\project-board.tsx:543:      {locked && viewerRole !== "yagi_admin" && (
src\components\project-board\lock-button.tsx:5: * Phase 3.1 hotfix-3 task_04 ??yagi_admin-only lock/unlock button for brief mode.
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\page.tsx:51:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\layout.tsx:13:  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\new\page.tsx:4:import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";
src\app\[locale]\app\invoices\new\page.tsx:20:  // yagi_admin only
src\app\[locale]\app\invoices\new\page.tsx:26:    .eq("role", "yagi_admin");
src\app\[locale]\app\invoices\actions.ts:30:  // yagi_admin gate
src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\actions.ts:14:// RLS: RPC is yagi_admin only. Authorization is double-checked at the
src\app\[locale]\app\admin\commissions\[id]\actions.ts:54:  // Double-check yagi_admin so the action path doesn't leak the RPC
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\invoices\page.tsx:112:    .eq("role", "yagi_admin");
src\app\[locale]\app\invoices\page.tsx:70:  // Detect yagi_admin (controls "+ New invoice" button)
src\app\[locale]\app\invoices\page.tsx:76:    .eq("role", "yagi_admin");
src\app\[locale]\app\invoices\page.tsx:168:            href="/app/invoices/new"
src\app\[locale]\app\invoices\page.tsx:233:              href="/app/invoices/new"
src\app\[locale]\app\preprod\[id]\share-actions.ts:35:  revalidatePath("/app/preprod")
src\app\[locale]\app\preprod\[id]\share-actions.ts:36:  revalidatePath(`/app/preprod/${boardId}`)
src\app\[locale]\app\preprod\[id]\share-actions.ts:51:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\share-actions.ts:61:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\share-actions.ts:81:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\share-actions.ts:119:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\share-actions.ts:145:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\share-actions.ts:170:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\share-actions.ts:215:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\share-actions.ts:298:      .eq("role", "yagi_admin")
src\app\[locale]\app\preprod\[id]\share-actions.ts:335:    .from("preprod_boards")
src\app\[locale]\app\invoices\[id]\page.tsx:60:  // yagi_admin detection (matches list page pattern)
src\app\[locale]\app\invoices\[id]\page.tsx:66:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\preprod\[id]\page.tsx:5:import { BoardEditor } from "@/components/preprod/board-editor";
src\app\[locale]\app\preprod\[id]\page.tsx:14:  const t = await getTranslations({ locale, namespace: "preprod" });
src\app\[locale]\app\preprod\[id]\page.tsx:28:  // Visibility: yagi_admin OR member of yagi-internal workspace
src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\[id]\page.tsx:34:      .eq("slug", "yagi-internal")
src\app\[locale]\app\preprod\[id]\page.tsx:49:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\page.tsx:69:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\page.tsx:105:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\page.tsx:157:      .from("preprod-frames")
src\app\[locale]\app\preprod\[id]\page.tsx:185:    .from("preprod_frame_reactions")
src\app\[locale]\app\preprod\[id]\page.tsx:196:    .from("preprod_frame_comments")
src\app\[locale]\app\preprod\[id]\page.tsx:214:      backHref="/app/preprod"
src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src\app\[locale]\app\team\[slug]\actions.ts:369:// createChannel ??yagi_admin OR ws_admin only
src\app\[locale]\app\team\[slug]\actions.ts:434:// updateChannel ??yagi_admin OR ws_admin only
src\app\[locale]\app\team\[slug]\actions.ts:528:// deleteMessage ??author OR yagi_admin only
src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\meetings\request-actions.ts:11://   confirmMeetingAction()    ??yagi_admin picks a time ??status='scheduled'
src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src\app\[locale]\app\meetings\request-actions.ts:129:    .eq("role", "yagi_admin");
src\app\[locale]\app\meetings\request-actions.ts:176:  // Fan-out to yagi_admins. Fire-and-forget ??caller does not wait.
src\app\[locale]\app\meetings\request-actions.ts:225:// confirmMeetingAction (yagi_admin only)
src\app\[locale]\app\meetings\request-actions.ts:348:  // notification_events for every yagi_admin user (excluding the actor
src\app\[locale]\app\meetings\request-actions.ts:350:  // hold yagi_admin globally, in which case they would self-ping).
src\app\[locale]\app\meetings\request-actions.ts:355:    .eq("role", "yagi_admin");
src\app\[locale]\app\meetings\request-actions.ts:460:  // notification_events to the counterparty (client or yagi_admin)
src\app\[locale]\app\meetings\request-actions.ts:475:      .eq("role", "yagi_admin");
src\app\[locale]\app\preprod\[id]\actions.ts:15:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\preprod\[id]\actions.ts:16:    revalidatePath(`/${locale}/app/preprod/${boardId}`);
src\app\[locale]\app\preprod\[id]\actions.ts:74:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:86:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:101:    console.error("[preprod] addFrame insert", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:115:    console.error("[preprod] addFrame notif emit failed:", err);
src\app\[locale]\app\preprod\[id]\actions.ts:148:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:160:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:178:    console.error("[preprod] addFrameFromUrl insert", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:190:    console.error("[preprod] addFrameFromUrl notif emit failed:", err);
src\app\[locale]\app\preprod\[id]\actions.ts:226:      .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:227:      .select("preprod_boards!inner(project_id)")
src\app\[locale]\app\preprod\[id]\actions.ts:232:      frameForProject as { preprod_boards: { project_id: string } } | null
src\app\[locale]\app\preprod\[id]\actions.ts:233:    )?.preprod_boards?.project_id;
src\app\[locale]\app\preprod\[id]\actions.ts:267:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:272:    console.error("[preprod] updateFrame", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:278:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\preprod\[id]\actions.ts:300:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:306:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:311:    console.error("[preprod] deleteFrame", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:346:      .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:352:      console.error("[preprod] reorderFrames update", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:404:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:431:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:448:        .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:454:      .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:472:      .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:490:    console.error("[preprod] createFrameRevision insert", insertError?.message);
src\app\[locale]\app\preprod\[id]\actions.ts:493:      .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:507:    console.error("[preprod] createFrameRevision notif emit failed:", err);
src\app\[locale]\app\preprod\[id]\actions.ts:523:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\actions.ts:571:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\actions.ts:620:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:631:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:644:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:653:    .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:673:    console.error("[preprod] restoreFrameRevision insert", insertError?.message);
src\app\[locale]\app\preprod\[id]\actions.ts:676:      .from("preprod_frames")
src\app\[locale]\app\preprod\[id]\actions.ts:708:    .from("preprod_boards")
src\app\[locale]\app\preprod\[id]\actions.ts:713:    console.error("[preprod] updateBoardTitle", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\[id]\actions.ts:739:  // Fall back to ws_admin of yagi-internal workspace
src\app\[locale]\app\preprod\[id]\actions.ts:743:    .eq("slug", "yagi-internal")
src\app\[locale]\app\preprod\[id]\actions.ts:769:    .from("preprod_frame_comments")
src\app\[locale]\app\preprod\[id]\actions.ts:777:    .from("preprod_frame_comments")
src\app\[locale]\app\preprod\[id]\actions.ts:785:    console.error("[preprod] resolveComment", error.message);
src\app\[locale]\app\preprod\[id]\actions.ts:805:    .from("preprod_frame_comments")
src\app\[locale]\app\preprod\[id]\actions.ts:813:    .from("preprod_frame_comments")
src\app\[locale]\app\preprod\[id]\actions.ts:821:    console.error("[preprod] unresolveComment", error.message);
src\app\[locale]\app\preprod\actions.ts:35:  // Look up yagi-internal workspace id
src\app\[locale]\app\preprod\actions.ts:39:    .eq("slug", "yagi-internal")
src\app\[locale]\app\preprod\actions.ts:45:    .from("preprod_boards")
src\app\[locale]\app\preprod\actions.ts:58:    console.error("[preprod] createBoard insert", error.message);
src\app\[locale]\app\preprod\actions.ts:63:    revalidatePath(`/${locale}/app/preprod`);
src\app\[locale]\app\page.tsx:8:// yagi_admin / creator / etc. can navigate to their persona-specific
src\app\[locale]\app\preprod\page.tsx:44:  const t = await getTranslations({ locale, namespace: "preprod" });
src\app\[locale]\app\preprod\page.tsx:58:  // Visibility: yagi_admin OR member of yagi-internal workspace
src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\page.tsx:64:      .eq("slug", "yagi-internal")
src\app\[locale]\app\preprod\page.tsx:79:    .from("preprod_boards")
src\app\[locale]\app\preprod\page.tsx:114:      .from("preprod_frames")
src\app\[locale]\app\preprod\page.tsx:151:          href="/app/preprod/new"
src\app\[locale]\app\preprod\page.tsx:199:            href="/app/preprod/new"
src\app\[locale]\app\preprod\page.tsx:239:                        `/app/preprod/${board.id}` as `/app/preprod/${string}`
src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\meetings\new\page.tsx:48:  // Check which workspaces the user is an admin of (or is yagi_admin)
src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\new\page.tsx:62:  // If yagi_admin, all workspaces are accessible
src\app\[locale]\app\admin\projects\page.tsx:16:  // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
src\app\[locale]\app\admin\projects\page.tsx:18:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
src\app\[locale]\app\admin\projects\page.tsx:33:      boards:project_boards(asset_index)
src\app\[locale]\app\admin\projects\page.tsx:45:    // Resolve asset count from project_boards.asset_index (preferred);
src\app\[locale]\app\preprod\new\page.tsx:5:import { NewBoardForm } from "@/components/preprod/new-board-form";
src\app\[locale]\app\preprod\new\page.tsx:13:  const t = await getTranslations({ locale, namespace: "preprod" });
src\app\[locale]\app\preprod\new\page.tsx:27:  // Visibility: yagi_admin OR member of yagi-internal workspace
src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\new\page.tsx:33:      .eq("slug", "yagi-internal")
src\app\[locale]\app\support\actions.ts:13://   - yagi_admin reads + replies anywhere
src\app\[locale]\app\support\actions.ts:140:  // Phase 2.8.6 K-05 LOOP 1 ??yagi_admin gate. The DB trigger
src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\support\actions.ts:189:  // Counterparty: if the actor is the client, notify yagi_admins; if
src\app\[locale]\app\support\actions.ts:190:  // actor is a yagi_admin, notify the client. (Workspace admins are
src\app\[locale]\app\support\actions.ts:198:      .eq("role", "yagi_admin");
src\app\[locale]\app\support\actions.ts:201:      // are also a global yagi_admin (would self-ping otherwise).
src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\showcases\actions.ts:159:    .from("preprod_boards")
src\app\[locale]\app\showcases\actions.ts:167:    .from("preprod_frames")
src\app\[locale]\app\showcases\actions.ts:479:  // retention is acceptable for this surface (infrequent yagi_admin /
src\app\[locale]\app\showcases\actions.ts:658:  // workspace_admin cannot toggle made_with_yagi; only yagi_admin can.
src\app\[locale]\app\showcases\page.tsx:64:  // Access control: yagi_admin OR any workspace admin.
src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\page.tsx:85:  // Scope showcases: yagi_admin sees all; workspace admin sees only their
src\app\[locale]\app\showcases\page.tsx:170:  // Candidate boards for "Create from Board" dialog (yagi_admin only).
src\app\[locale]\app\showcases\page.tsx:174:      .from("preprod_boards")
src\app\[locale]\app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin ??notFound).
src\app\[locale]\app\admin\projects\[id]\page.tsx:3:// Reads project_boards.asset_index server-side and renders AssetListPanel.
src\app\[locale]\app\admin\projects\[id]\page.tsx:30:  // yagi_admin role check
src\app\[locale]\app\admin\projects\[id]\page.tsx:35:  const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");
src\app\[locale]\app\admin\projects\[id]\page.tsx:64:  // Fetch project_boards.asset_index (Phase 3.1)
src\app\[locale]\app\admin\projects\[id]\page.tsx:66:    .from("project_boards")
src\app\[locale]\app\projects\new\new-project-wizard.tsx:56:import { ProjectBoard } from "@/components/project-board/project-board";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:57:import { AttachmentsSection } from "@/components/project-board/attachments-section";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:192:// See src/components/project-board/project-board.tsx
src\app\[locale]\app\projects\new\new-project-wizard.tsx:433:    // storage_key for wizard PDFs uses the board-assets prefix that
src\app\[locale]\app\projects\new\new-project-wizard.tsx:436:    // matches the actual R2 object key ??board-assets/<user>/<uuid>.pdf.
src\app\[locale]\app\projects\new\new-project-wizard.tsx:437:    // Wave C.5d sub_03f_1: previously this prepended "project-wizard" to
src\app\[locale]\app\projects\new\new-project-wizard.tsx:438:    // satisfy the add_project_board_pdf RPC validation, which left a key
src\app\[locale]\app\projects\new\new-project-wizard.tsx:440:    // Companion sub_03f_1 migration adds `board-assets/` to the RPC
src\app\[locale]\app\projects\new\actions.ts:141:      // non-yagi_admin INSERT.
src\app\[locale]\app\projects\new\actions.ts:151:    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
src\app\[locale]\app\projects\new\actions.ts:508:        k.startsWith("board-assets/") ||
src\app\[locale]\app\projects\new\actions.ts:546:  // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
src\app\[locale]\app\projects\new\actions.ts:551:    `board-assets/${user.id}/`,
src\app\[locale]\app\projects\new\actions.ts:603:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
src\app\[locale]\app\projects\new\actions.ts:918:  // 3. Phase 3.1 ??Seed the project_boards row via RPC.
src\app\[locale]\app\projects\new\page.tsx:5:import { NewProjectWizard } from "./new-project-wizard";
src\app\[locale]\app\projects\[id]\actions.ts:25:  "workspace_admin" | "yagi_admin",
src\app\[locale]\app\projects\[id]\actions.ts:32:  yagi_admin: {
src\app\[locale]\app\projects\[id]\actions.ts:85:    roles.has("yagi_admin") &&
src\app\[locale]\app\projects\[id]\actions.ts:86:    (ALLOWED.yagi_admin[project.status] ?? []).includes(parsed.data.newStatus);
src\app\[locale]\app\projects\[id]\actions.ts:114:// row from ws_member reads automatically (yagi_admin still sees it for the
src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\[id]\page.tsx:45:  // Access: yagi_admin OR workspace_admin of the showcase's workspace.
src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\board-actions.ts:12: *       updates project_boards.{document, asset_index, updated_at}.
src\app\[locale]\app\projects\[id]\board-actions.ts:15: *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
src\app\[locale]\app\projects\[id]\board-actions.ts:19: *       project_boards.document and recomputes asset_index.
src\app\[locale]\app\projects\[id]\board-actions.ts:99:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:110:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:128:  // table-level UPDATE on project_boards and only re-grants
src\app\[locale]\app\projects\[id]\board-actions.ts:138:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:219:  // RPC enforces yagi_admin internally (RAISE EXCEPTION if not admin).
src\app\[locale]\app\projects\[id]\board-actions.ts:234:// Defense-in-depth: action verifies yagi_admin role + RPC verifies.
src\app\[locale]\app\projects\[id]\board-actions.ts:268:    (r) => (r as { role: string }).role === "yagi_admin"
src\app\[locale]\app\projects\[id]\board-actions.ts:285:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:342:    (r) => (r as { role: string }).role === "yagi_admin"
src\app\[locale]\app\projects\[id]\board-actions.ts:364:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:378:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:384:  // asset_index via service role. Admin-only action (yagi_admin gate
src\app\[locale]\app\projects\[id]\board-actions.ts:391:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:425:// authenticated write asset_index. Callers (add_project_board_pdf /
src\app\[locale]\app\projects\[id]\board-actions.ts:434:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:452:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:508:  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
src\app\[locale]\app\projects\[id]\board-actions.ts:526:  // Call add_project_board_pdf RPC
src\app\[locale]\app\projects\[id]\board-actions.ts:529:    "add_project_board_pdf",
src\app\[locale]\app\projects\[id]\page.tsx:9://   6. Admin actions row (yagi_admin only)
src\app\[locale]\app\projects\[id]\page.tsx:12://   - viewer must be project.created_by OR yagi_admin
src\app\[locale]\app\projects\[id]\page.tsx:165:  const isYagiAdmin = roles.has("yagi_admin");
src\app\[locale]\app\projects\[id]\page.tsx:322:                yagi_admin: tDetail("actor.yagi_admin"),
src\app\[locale]\app\projects\[id]\thread-actions.ts:26:  // If visibility=internal, enforce server-side that the user has yagi_admin role.
src\app\[locale]\app\projects\[id]\thread-actions.ts:34:      .eq("role", "yagi_admin");
src\app\[locale]\app\projects\[id]\thread-actions.ts:187:      .eq("role", "yagi_admin");
src\app\[locale]\app\projects\[id]\thread-actions.ts:309:  // Phase 2.0 G4 #2 ??drop the global yagi_admin fan-out. Previously every
src\app\[locale]\app\projects\[id]\thread-actions.ts:310:  // yagi_admin received notifications for every workspace's thread messages,
src\app\[locale]\app\projects\[id]\thread-actions.ts:394:  // Fetch role rows scoped to this workspace (or null = global yagi_admin)
src\app\[locale]\app\projects\[id]\thread-actions.ts:407:    if (r.role === "yagi_admin") isYagi.add(r.user_id);
src\app\[locale]\app\projects\[id]\thread-actions.ts:414:    // @client = members who are NOT yagi-internal (the client side of the
src\app\[locale]\app\projects\[id]\brief\actions.ts:386:// 4. lockBrief ??yagi_admin-only, status='editing' ??'locked'
src\app\[locale]\app\projects\[id]\brief\actions.ts:401:  // also enforces yagi_admin-only status flips).
src\app\[locale]\app\projects\[id]\brief\actions.ts:406:    .eq("role", "yagi_admin")
src\app\[locale]\app\projects\[id]\brief\actions.ts:410:    return { error: "forbidden", reason: "yagi_admin required" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:429:// 5. unlockBrief ??yagi_admin-only, status='locked' ??'editing' (no snapshot)
src\app\[locale]\app\projects\[id]\brief\actions.ts:447:    .eq("role", "yagi_admin")
src\app\[locale]\app\projects\[id]\brief\actions.ts:451:    return { error: "forbidden", reason: "yagi_admin required" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:558:// RLS (caller must be a project member or yagi_admin). On success the
src\app\[locale]\app\projects\[id]\brief\actions.ts:935:// notification to every yagi_admin so they can pick up the request.
src\app\[locale]\app\projects\[id]\brief\actions.ts:978:  // Enumerate yagi_admin recipients via service role (user_roles SELECT
src\app\[locale]\app\projects\[id]\brief\actions.ts:986:    .eq("role", "yagi_admin");

codex
The initial repo check confirms the branch and last 8 commits match the Wave C.5d set. One search had a PowerShell quoting issue, so I?셫 rerunning the codebase-wide scans with simpler patterns and then I?셪l inspect the target files directly.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n --fixed-strings '.from(\"projects\")' src" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n --fixed-strings \".from('projects')\" src" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"resolveActiveWorkspace|listOwnWorkspaces|UUID_RE|narrowKind\" src\\lib\\workspace src\\app" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"workspaces\\[0\\]|memberships\\[0\\]|ctx\\.workspaces\\[0\\]\" src" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T15:48:06.131460Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:

 exited 1 in 567ms:
 succeeded in 551ms:
src\app\[locale]\app\admin\projects\page.tsx:21:    .from('projects')

 succeeded in 579ms:
src\lib\workspace\actions.ts:24:const UUID_RE =
src\lib\workspace\actions.ts:30:  if (!UUID_RE.test(workspaceId)) {
src\lib\workspace\active.ts:34:const UUID_RE =
src\lib\workspace\active.ts:37:function narrowKind(value: unknown): WorkspaceKind {
src\lib\workspace\active.ts:53:export async function listOwnWorkspaces(
src\lib\workspace\active.ts:85:      kind: narrowKind(r.workspace.kind),
src\lib\workspace\active.ts:101:export async function resolveActiveWorkspace(
src\lib\workspace\active.ts:104:  const memberships = await listOwnWorkspaces(userId);
src\lib\workspace\active.ts:110:  if (cookieValue && UUID_RE.test(cookieValue)) {
src\app\showcase\[slug]\actions.ts:16:const UUID_RE =
src\app\showcase\[slug]\actions.ts:43:  if (!UUID_RE.test(showcaseId)) {
src\app\showcase\[slug]\actions.ts:121:    if (!UUID_RE.test(showcaseId)) return;
src\app\[locale]\app\layout.tsx:5:  resolveActiveWorkspace,
src\app\[locale]\app\layout.tsx:6:  listOwnWorkspaces,
src\app\[locale]\app\layout.tsx:60:  // for the sidebar workspace switcher. resolveActiveWorkspace reads the
src\app\[locale]\app\layout.tsx:61:  // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
src\app\[locale]\app\layout.tsx:65:    resolveActiveWorkspace(ctx.userId),
src\app\[locale]\app\layout.tsx:66:    listOwnWorkspaces(ctx.userId),
src\app\[locale]\app\dashboard\page.tsx:27:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\dashboard\page.tsx:73:  // switcher (Codex K-05 final review LOOP 1 MED-C). resolveActiveWorkspace
src\app\[locale]\app\dashboard\page.tsx:76:  const active = await resolveActiveWorkspace(user.id);
src\app\[locale]\app\invoices\[id]\page.tsx:19:const UUID_REGEX =
src\app\[locale]\app\invoices\[id]\page.tsx:42:  if (!UUID_REGEX.test(id)) {
src\app\[locale]\app\showcases\actions.ts:28:const UUID_RE =
src\app\[locale]\app\showcases\actions.ts:146:  if (!UUID_RE.test(boardId)) return { ok: false, error: "invalid_input" };
src\app\[locale]\app\showcases\actions.ts:259:  if (!UUID_RE.test(showcaseId))
src\app\[locale]\app\showcases\actions.ts:411:  if (!UUID_RE.test(showcaseId))
src\app\[locale]\app\showcases\actions.ts:506:  if (!UUID_RE.test(showcaseId))
src\app\[locale]\app\showcases\actions.ts:546:  if (!UUID_RE.test(showcaseId))
src\app\[locale]\app\showcases\actions.ts:806:  if (!UUID_RE.test(mediaId))
src\app\[locale]\app\projects\page.tsx:4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\page.tsx:55:  const active = await resolveActiveWorkspace(user.id);
src\app\[locale]\app\projects\new\actions.ts:10:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\actions.ts:87:  const active = await resolveActiveWorkspace(user.id);
src\app\[locale]\app\projects\new\actions.ts:280:  const active = await resolveActiveWorkspace(user.id);
src\app\[locale]\app\projects\new\actions.ts:807:  //   C. resolveActiveWorkspace cookie-based resolver  (final fallback)
src\app\[locale]\app\projects\new\actions.ts:835:    const active = await resolveActiveWorkspace(user.id);
src\app\[locale]\app\projects\new\new-project-wizard.tsx:135:  // new/page.tsx via resolveActiveWorkspace and passed down explicitly,
src\app\[locale]\app\projects\new\page.tsx:4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\page.tsx:31:  const active = await resolveActiveWorkspace(user.id);

 succeeded in 639ms:
src\lib\app\context.ts:84:  // currentWorkspaceId previously took workspaces[0] (oldest membership),
src\lib\workspace\active.ts:121:  return memberships[0];
src\app\[locale]\app\layout.tsx:102:            instead of ctx.workspaces[0], so admins with multiple
src\app\[locale]\app\preprod\new\page.tsx:57:      ? (p.workspaces[0] as { name: string } | undefined) ?? null

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\[id]\\board-actions.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\lib\\workspace\\active.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 507ms:
   1: // Phase 4.x task_06 ??Active workspace resolver.
   2: //
   3: // Decision lock-in (_decisions_locked.md section 2): cookie-based.
   4: // The cookie 'yagi_active_workspace' carries a uuid. Every server-side
   5: // page render that needs the active workspace must validate the
   6: // cookie's uuid against workspace_members for the current user, then
   7: // fall back to the first membership if invalid or absent.
   8: //
   9: // Cookie tampering is fully defended:
  10: //   1. The cookie value is not trusted -- we always re-check
  11: //      workspace_members membership on the server.
  12: //   2. If the cookie's uuid is not a valid membership for this user,
  13: //      we ignore it and use first-member fallback. (We do NOT trust
  14: //      the cookie even for read-only display.)
  15: //
  16: // Phase 4 caveat: workspaces.kind column is added by task_01 migration
  17: // (Wave D D.1 apply). Until apply, the SELECT returns undefined for
  18: // kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
  19: // existing row to 'brand'). Post-apply, kind is one of 3 enum values.
  20: 
  21: import { cookies } from "next/headers";
  22: import { createSupabaseServer } from "@/lib/supabase/server";
  23: 
  24: export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
  25: 
  26: export type ActiveWorkspaceMembership = {
  27:   id: string;
  28:   name: string;
  29:   kind: WorkspaceKind;
  30: };
  31: 
  32: export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";
  33: 
  34: const UUID_RE =
  35:   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  36: 
  37: function narrowKind(value: unknown): WorkspaceKind {
  38:   if (value === "brand" || value === "artist" || value === "yagi_admin") {
  39:     return value;
  40:   }
  41:   return "brand";
  42: }
  43: 
  44: /**
  45:  * Returns the user's workspace memberships, joined with workspace name + kind.
  46:  * Used by the workspace switcher dropdown to render full lists. The active
  47:  * one is found by `id === activeWorkspaceId`.
  48:  *
  49:  * Cross-tenant guard: the SELECT joins through workspace_members for the
  50:  * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
  51:  * SELECT to members.
  52:  */
  53: export async function listOwnWorkspaces(
  54:   userId: string,
  55: ): Promise<ActiveWorkspaceMembership[]> {
  56:   const supabase = await createSupabaseServer();
  57:   // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
  58:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
  59:   const sb = supabase as any;
  60:   const { data: rows } = (await sb
  61:     .from("workspace_members")
  62:     .select(
  63:       `
  64:       workspace_id,
  65:       created_at,
  66:       workspace:workspaces ( id, name, kind )
  67:     `,
  68:     )
  69:     .eq("user_id", userId)
  70:     .order("created_at", { ascending: true })) as {
  71:     data:
  72:       | {
  73:           workspace_id: string;
  74:           workspace: { id: string; name: string; kind?: string } | null;
  75:         }[]
  76:       | null;
  77:   };
  78: 
  79:   const list: ActiveWorkspaceMembership[] = [];
  80:   for (const r of rows ?? []) {
  81:     if (!r.workspace) continue;
  82:     list.push({
  83:       id: r.workspace.id,
  84:       name: r.workspace.name,
  85:       kind: narrowKind(r.workspace.kind),
  86:     });
  87:   }
  88:   return list;
  89: }
  90: 
  91: /**
  92:  * Resolve the user's currently-active workspace. Reads the
  93:  * 'yagi_active_workspace' cookie, validates membership against
  94:  * workspace_members, and falls back to the first membership when
  95:  * the cookie is absent, malformed, or doesn't correspond to a
  96:  * valid membership for this user.
  97:  *
  98:  * Returns null when the user has no workspace memberships at all
  99:  * (caller should redirect to /onboarding).
 100:  */
 101: export async function resolveActiveWorkspace(
 102:   userId: string,
 103: ): Promise<ActiveWorkspaceMembership | null> {
 104:   const memberships = await listOwnWorkspaces(userId);
 105:   if (memberships.length === 0) return null;
 106: 
 107:   const cookieStore = await cookies();
 108:   const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
 109: 
 110:   if (cookieValue && UUID_RE.test(cookieValue)) {
 111:     const match = memberships.find((m) => m.id === cookieValue);
 112:     if (match) return match;
 113:     // Fall through to first-membership fallback. We deliberately do NOT
 114:     // attempt to clear the cookie here -- this resolver is read-only
 115:     // (cookies() in next/headers is read in server components). The
 116:     // setActiveWorkspace server action is the only writer; if a stale
 117:     // cookie keeps arriving here, the resolver silently falls back
 118:     // without leaking which workspace_id the user does NOT belong to.
 119:   }
 120: 
 121:   return memberships[0];
 122: }

 succeeded in 560ms:
   1: "use server";
   2: 
   3: /**
   4:  * board-actions.ts
   5:  * Phase 3.1 task_05 ??server actions for ProjectBoard brief mode.
   6:  *
   7:  * Three actions:
   8:  *   - updateProjectBoardAction(projectId, document)
   9:  *       Validates auth + lock state; recomputes asset_index server-side
  10:  *       (K-05 trust boundary ??never trust client-supplied asset_index);
  11:  *       inserts a project_board_versions snapshot if >30s since last;
  12:  *       updates project_boards.{document, asset_index, updated_at}.
  13:  *
  14:  *   - toggleLockAction(boardId, locked)
  15:  *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
  16:  *
  17:  *   - restoreVersionAction(boardId, version)
  18:  *       Admin-only; copies project_board_versions.document back into
  19:  *       project_boards.document and recomputes asset_index.
  20:  *
  21:  * All anti-DoS: 5MB serialized cap on document.
  22:  */
  23: 
  24: import { z } from "zod";
  25: import { revalidatePath } from "next/cache";
  26: import { createSupabaseServer } from "@/lib/supabase/server";
  27: import { createSupabaseService } from "@/lib/supabase/service";
  28: import { extractAssetIndex } from "@/lib/board/asset-index";
  29: import {
  30:   createBriefAssetPutUrl,
  31:   briefObjectPublicUrl,
  32: } from "@/lib/r2/client";
  33: import { fetchVideoMetadata } from "@/lib/oembed";
  34: 
  35: const VERSION_DEBOUNCE_MS = 30_000;
  36: const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
  37: 
  38: // K-05 LOOP 1 MEDIUM F6 fix: same validator as wizard's submitProjectAction
  39: // to reject malformed tldraw store snapshots. Empty {} is permitted (a brief
  40: // in initial state). Otherwise document MUST contain a `store` object key.
  41: function validateTldrawStore(doc: Record<string, unknown>): boolean {
  42:   if (!doc || typeof doc !== "object") return false;
  43:   if (Object.keys(doc).length === 0) return true;
  44:   if (!("store" in doc)) return false;
  45:   const store = (doc as { store: unknown }).store;
  46:   if (typeof store !== "object" || store === null) return false;
  47:   return true;
  48: }
  49: 
  50: // ============================================================
  51: // updateProjectBoardAction
  52: // ============================================================
  53: 
  54: const UpdateBoardSchema = z.object({
  55:   projectId: z.string().uuid(),
  56:   document: z
  57:     .record(z.string(), z.unknown())
  58:     .refine(validateTldrawStore, {
  59:       message: "document is not a valid tldraw store snapshot",
  60:     }),
  61: });
  62: 
  63: export type UpdateBoardResult =
  64:   | { ok: true; boardId: string }
  65:   | {
  66:       ok: false;
  67:       error: "unauthenticated" | "validation" | "locked" | "not_found" | "db";
  68:       message?: string;
  69:     };
  70: 
  71: export async function updateProjectBoardAction(
  72:   input: unknown
  73: ): Promise<UpdateBoardResult> {
  74:   const parsed = UpdateBoardSchema.safeParse(input);
  75:   if (!parsed.success) return { ok: false, error: "validation" };
  76: 
  77:   // Anti-DoS
  78:   let serialized: string;
  79:   try {
  80:     serialized = JSON.stringify(parsed.data.document);
  81:   } catch {
  82:     return { ok: false, error: "validation" };
  83:   }
  84:   if (serialized.length > DOCUMENT_MAX_BYTES) {
  85:     return { ok: false, error: "validation", message: "document_too_large" };
  86:   }
  87: 
  88:   const supabase = await createSupabaseServer();
  89:   const {
  90:     data: { user },
  91:   } = await supabase.auth.getUser();
  92:   if (!user) return { ok: false, error: "unauthenticated" };
  93: 
  94:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  95:   const sb = supabase as any;
  96: 
  97:   // Fetch the board (RLS gates SELECT ??non-owner non-admin gets nothing)
  98:   const { data: board, error: bErr } = await sb
  99:     .from("project_boards")
 100:     .select("id, is_locked")
 101:     .eq("project_id", parsed.data.projectId)
 102:     .maybeSingle();
 103:   if (bErr || !board) return { ok: false, error: "not_found" };
 104:   if (board.is_locked) return { ok: false, error: "locked" };
 105: 
 106:   // K-05 trust boundary: server-recompute asset_index. Never trust client.
 107:   // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
 108:   // For canvas-only update, fetch current attachment state from DB to merge.
 109:   const { data: currentBoard } = await sb
 110:     .from("project_boards")
 111:     .select("attached_pdfs, attached_urls")
 112:     .eq("id", board.id)
 113:     .maybeSingle();
 114:   const assetIndex = extractAssetIndex(
 115:     parsed.data.document,
 116:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 117:     ((currentBoard as any)?.attached_pdfs ?? []) as any,
 118:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 119:     ((currentBoard as any)?.attached_urls ?? []) as any,
 120:   );
 121: 
 122:   // K-05 LOOP 1 HIGH-B F3 fix: atomic update guarded by is_locked=false to
 123:   // close the lock race window. If admin locks between our SELECT and UPDATE,
 124:   // the WHERE clause filters it out and `updated` returns empty rows; we then
 125:   // return error:locked WITHOUT having inserted a version snapshot.
 126:   //
 127:   // Wave C.5d sub_03f_2: the migration locks `authenticated` out of
 128:   // table-level UPDATE on project_boards and only re-grants
 129:   // (document, updated_at), so PostgREST cannot UPDATE asset_index
 130:   // anymore. Use the service-role client here to write asset_index in
 131:   // the same atomic statement; authorization (workspace + lock) was
 132:   // already enforced by the user-scoped SELECT above. Race guard
 133:   // (eq is_locked=false) is preserved through the service client.
 134:   const service = createSupabaseService();
 135:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 136:   const svc = service as any;
 137:   const { data: updated, error: uErr } = await svc
 138:     .from("project_boards")
 139:     .update({
 140:       document: parsed.data.document,
 141:       asset_index: assetIndex,
 142:       updated_at: new Date().toISOString(),
 143:     })
 144:     .eq("id", board.id)
 145:     .eq("is_locked", false)
 146:     .select("id");
 147:   if (uErr) {
 148:     console.error("[updateProjectBoardAction] update error:", uErr);
 149:     return { ok: false, error: "db", message: uErr.message };
 150:   }
 151:   if (!Array.isArray(updated) || updated.length === 0) {
 152:     // Lock was acquired between SELECT and UPDATE ??no rows updated, no snapshot.
 153:     return { ok: false, error: "locked" };
 154:   }
 155: 
 156:   // Versioning: snapshot AFTER successful update (K-05 LOOP 1 HIGH-B F3 fix ??  // never insert a version row for a write that did not land).
 157:   const { data: lastVersion } = await sb
 158:     .from("project_board_versions")
 159:     .select("created_at, version")
 160:     .eq("board_id", board.id)
 161:     .order("version", { ascending: false })
 162:     .limit(1)
 163:     .maybeSingle();
 164: 
 165:   const shouldSnapshot =
 166:     !lastVersion ||
 167:     Date.now() - new Date(lastVersion.created_at as string).getTime() >
 168:       VERSION_DEBOUNCE_MS;
 169: 
 170:   if (shouldSnapshot) {
 171:     const nextVersion = ((lastVersion?.version as number | undefined) ?? 0) + 1;
 172:     // INSERT bypasses RLS via service role (project_board_versions_insert_trigger
 173:     // has WITH CHECK false, so user-scoped client cannot INSERT directly).
 174:     const svc = createSupabaseService();
 175:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 176:     await (svc as any).from("project_board_versions").insert({
 177:       board_id: board.id,
 178:       version: nextVersion,
 179:       document: parsed.data.document,
 180:       created_by: user.id,
 181:       label: null,
 182:     });
 183:   }
 184: 
 185:   revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
 186:   return { ok: true, boardId: board.id };
 187: }
 188: 
 189: // ============================================================
 190: // toggleLockAction
 191: // ============================================================
 192: 
 193: const ToggleLockSchema = z.object({
 194:   boardId: z.string().uuid(),
 195:   locked: z.boolean(),
 196: });
 197: 
 198: export type ToggleLockResult =
 199:   | { ok: true }
 200:   | {
 201:       ok: false;
 202:       error: "unauthenticated" | "validation" | "db" | "forbidden";
 203:       message?: string;
 204:     };
 205: 
 206: export async function toggleLockAction(
 207:   input: unknown
 208: ): Promise<ToggleLockResult> {
 209:   const parsed = ToggleLockSchema.safeParse(input);
 210:   if (!parsed.success) return { ok: false, error: "validation" };
 211: 
 212:   const supabase = await createSupabaseServer();
 213:   const {
 214:     data: { user },
 215:   } = await supabase.auth.getUser();
 216:   if (!user) return { ok: false, error: "unauthenticated" };
 217: 
 218:   // RPC enforces yagi_admin internally (RAISE EXCEPTION if not admin).
 219:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 220:   const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
 221:     p_board_id: parsed.data.boardId,
 222:     p_locked: parsed.data.locked,
 223:   });
 224:   if (error) {
 225:     console.error("[toggleLockAction] rpc error:", error);
 226:     return { ok: false, error: "db", message: error.message };
 227:   }
 228:   return { ok: true };
 229: }
 230: 
 231: // ============================================================
 232: // toggleBoardLockAction (Phase 3.1 hotfix-3 task_04)
 233: // Defense-in-depth: action verifies yagi_admin role + RPC verifies.
 234: // ============================================================
 235: 
 236: export type ToggleBoardLockResult =
 237:   | { ok: true; isLocked: boolean }
 238:   | {
 239:       ok: false;
 240:       error: "unauthenticated" | "forbidden" | "validation" | "db";
 241:       message?: string;
 242:     };
 243: 
 244: export async function toggleBoardLockAction(
 245:   boardId: string,
 246:   locked: boolean
 247: ): Promise<ToggleBoardLockResult> {
 248:   if (!boardId || typeof boardId !== "string") {
 249:     return { ok: false, error: "validation" };
 250:   }
 251:   if (typeof locked !== "boolean") {
 252:     return { ok: false, error: "validation" };
 253:   }
 254: 
 255:   const supabase = await createSupabaseServer();
 256:   const {
 257:     data: { user },
 258:   } = await supabase.auth.getUser();
 259:   if (!user) return { ok: false, error: "unauthenticated" };
 260: 
 261:   // Action-layer role check (defense-in-depth over RPC-only check)
 262:   const { data: roles } = await supabase
 263:     .from("user_roles")
 264:     .select("role")
 265:     .eq("user_id", user.id);
 266:   const isYagiAdmin = (roles ?? []).some(
 267:     (r) => (r as { role: string }).role === "yagi_admin"
 268:   );
 269:   if (!isYagiAdmin) return { ok: false, error: "forbidden" };
 270: 
 271:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 272:   const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
 273:     p_board_id: boardId,
 274:     p_locked: locked,
 275:   });
 276:   if (error) {
 277:     console.error("[toggleBoardLockAction] rpc error:", error);
 278:     return { ok: false, error: "db", message: error.message };
 279:   }
 280: 
 281:   // Resolve project_id for revalidation
 282:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 283:   const { data: boardLookup } = await (supabase as any)
 284:     .from("project_boards")
 285:     .select("project_id")
 286:     .eq("id", boardId)
 287:     .maybeSingle();
 288: 
 289:   if (boardLookup?.project_id) {
 290:     revalidatePath(
 291:       `/[locale]/app/projects/${boardLookup.project_id}`,
 292:       "page"
 293:     );
 294:   }
 295: 
 296:   return { ok: true, isLocked: locked };
 297: }
 298: 
 299: // ============================================================
 300: // restoreVersionAction
 301: // ============================================================
 302: 
 303: const RestoreVersionSchema = z.object({
 304:   boardId: z.string().uuid(),
 305:   version: z.number().int().positive(),
 306: });
 307: 
 308: export type RestoreVersionResult =
 309:   | { ok: true }
 310:   | {
 311:       ok: false;
 312:       error:
 313:         | "unauthenticated"
 314:         | "validation"
 315:         | "forbidden"
 316:         | "not_found"
 317:         | "db";
 318:       message?: string;
 319:     };
 320: 
 321: 
 322: 
 323: export async function restoreVersionAction(
 324:   input: unknown
 325: ): Promise<RestoreVersionResult> {
 326:   const parsed = RestoreVersionSchema.safeParse(input);
 327:   if (!parsed.success) return { ok: false, error: "validation" };
 328: 
 329:   const supabase = await createSupabaseServer();
 330:   const {
 331:     data: { user },
 332:   } = await supabase.auth.getUser();
 333:   if (!user) return { ok: false, error: "unauthenticated" };
 334: 
 335:   // Admin-only check ??restore is destructive and bypasses lock state.
 336:   const { data: roles } = await supabase
 337:     .from("user_roles")
 338:     .select("role")
 339:     .eq("user_id", user.id);
 340:   const isAdmin = (roles ?? []).some(
 341:     (r) => (r as { role: string }).role === "yagi_admin"
 342:   );
 343:   if (!isAdmin) return { ok: false, error: "forbidden" };
 344: 
 345:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 346:   const sb = supabase as any;
 347:   const { data: snap, error: sErr } = await sb
 348:     .from("project_board_versions")
 349:     .select("document")
 350:     .eq("board_id", parsed.data.boardId)
 351:     .eq("version", parsed.data.version)
 352:     .maybeSingle();
 353:   if (sErr || !snap) return { ok: false, error: "not_found" };
 354: 
 355:   const restoredDoc = snap.document as Record<string, unknown>;
 356:   // K-05 LOOP 1 MEDIUM F6: validate snapshot is structurally a tldraw store
 357:   // before restoring (defense against historical bad data).
 358:   if (!validateTldrawStore(restoredDoc)) {
 359:     return { ok: false, error: "validation", message: "snapshot_malformed" };
 360:   }
 361:   // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
 362:   const { data: boardForRestore } = await sb
 363:     .from("project_boards")
 364:     .select("attached_pdfs, attached_urls")
 365:     .eq("id", parsed.data.boardId)
 366:     .maybeSingle();
 367:   const assetIndex = extractAssetIndex(
 368:     restoredDoc,
 369:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 370:     ((boardForRestore as any)?.attached_pdfs ?? []) as any,
 371:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 372:     ((boardForRestore as any)?.attached_urls ?? []) as any,
 373:   );
 374: 
 375:   // Resolve project_id for revalidation ??board ??project_id lookup
 376:   const { data: boardLookup } = await sb
 377:     .from("project_boards")
 378:     .select("project_id")
 379:     .eq("id", parsed.data.boardId)
 380:     .maybeSingle();
 381: 
 382:   // Wave C.5d sub_03f_2: same column-grant lockdown applies ??write
 383:   // asset_index via service role. Admin-only action (yagi_admin gate
 384:   // checked above) so authorization is well-established before this
 385:   // UPDATE runs.
 386:   const restoreService = createSupabaseService();
 387:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 388:   const restoreSvc = restoreService as any;
 389:   const { error: uErr } = await restoreSvc
 390:     .from("project_boards")
 391:     .update({
 392:       document: restoredDoc,
 393:       asset_index: assetIndex,
 394:       updated_at: new Date().toISOString(),
 395:     })
 396:     .eq("id", parsed.data.boardId);
 397:   if (uErr) {
 398:     console.error("[restoreVersionAction] update error:", uErr);
 399:     return { ok: false, error: "db", message: uErr.message };
 400:   }
 401: 
 402:   // K-05 LOOP 1 MEDIUM fix: revalidate the project page after restore so the
 403:   // canvas re-renders with the restored snapshot.
 404:   if (boardLookup?.project_id) {
 405:     revalidatePath(
 406:       `/[locale]/app/projects/${boardLookup.project_id}`,
 407:       "page"
 408:     );
 409:   }
 410:   return { ok: true };
 411: }
 412: 
 413: // ============================================================
 414: // Phase 3.1 hotfix-3 ??Attachment server actions
 415: // ============================================================
 416: // All actions: validate input, call RPC, recompute asset_index server-side,
 417: // revalidate page. Trust boundary: client never supplies asset_index (L-041).
 418: 
 419: // Helper: recompute asset_index from current board state and UPDATE.
 420: // Wave C.5d sub_03f_2: asset_index is now revoked from authenticated at
 421: // the table level. The helper still accepts a user-scoped client for the
 422: // pre-fetch SELECT so RLS gates row visibility, but the UPDATE switches
 423: // to the service-role client because column grants no longer let
 424: // authenticated write asset_index. Callers (add_project_board_pdf /
 425: // add_project_board_url action wrappers) have already validated auth
 426: // via their RPC + RLS pre-check before invoking this helper.
 427: async function recomputeAndUpdateAssetIndex(
 428:   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 429:   sb: any,
 430:   boardId: string
 431: ): Promise<void> {
 432:   const { data: board } = await sb
 433:     .from("project_boards")
 434:     .select("document, attached_pdfs, attached_urls, project_id")
 435:     .eq("id", boardId)
 436:     .maybeSingle();
 437:   if (!board) return;
 438: 
 439:   const newIndex = extractAssetIndex(
 440:     board.document as Record<string, unknown>,
 441:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 442:     (board.attached_pdfs ?? []) as any,
 443:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 444:     (board.attached_urls ?? []) as any,
 445:   );
 446: 
 447:   const service = createSupabaseService();
 448:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 449:   const svc = service as any;
 450:   await svc
 451:     .from("project_boards")
 452:     .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
 453:     .eq("id", boardId);
 454: 
 455:   if (board.project_id) {
 456:     revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
 457:   }
 458: }
 459: 
 460: // URL validation ??only http/https allowed (L-042 server layer)
 461: const SAFE_URL_SCHEMES = ["http:", "https:"];
 462: function validateUrlScheme(url: string): boolean {
 463:   try {
 464:     const parsed = new URL(url);
 465:     return SAFE_URL_SCHEMES.includes(parsed.protocol);
 466:   } catch {
 467:     return false;
 468:   }
 469: }
 470: 
 471: // ============================================================
 472: // addPdfAttachmentAction
 473: // ============================================================
 474: 
 475: export type AddPdfResult =
 476:   | { ok: true; attachmentId: string }
 477:   | { ok: false; error: string };
 478: 
 479: export async function addPdfAttachmentAction(
 480:   boardId: string,
 481:   file: File
 482: ): Promise<AddPdfResult> {
 483:   if (!boardId || typeof boardId !== "string") {
 484:     return { ok: false, error: "invalid_board_id" };
 485:   }
 486: 
 487:   // Validate file
 488:   if (file.type !== "application/pdf") {
 489:     return { ok: false, error: "not_pdf" };
 490:   }
 491:   if (file.size > 20 * 1024 * 1024) {
 492:     return { ok: false, error: "file_too_large" };
 493:   }
 494:   if (file.name.length > 200) {
 495:     return { ok: false, error: "filename_too_long" };
 496:   }
 497: 
 498:   const supabase = await createSupabaseServer();
 499:   const {
 500:     data: { user },
 501:   } = await supabase.auth.getUser();
 502:   if (!user) return { ok: false, error: "unauthenticated" };
 503: 
 504:   // Upload to R2 first (server-generated key for this board)
 505:   const ext = "pdf";
 506:   const uuid = crypto.randomUUID();
 507:   const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
 508: 
 509:   try {
 510:     const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
 511:     const arrayBuffer = await file.arrayBuffer();
 512:     const putResp = await fetch(putUrl, {
 513:       method: "PUT",
 514:       body: arrayBuffer,
 515:       headers: { "Content-Type": file.type },
 516:     });
 517:     if (!putResp.ok) {
 518:       return { ok: false, error: "r2_put_failed" };
 519:     }
 520:   } catch (err) {
 521:     console.error("[addPdfAttachmentAction] R2 upload error:", err);
 522:     return { ok: false, error: "r2_upload_error" };
 523:   }
 524: 
 525:   // Call add_project_board_pdf RPC
 526:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 527:   const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
 528:     "add_project_board_pdf",
 529:     {
 530:       p_board_id: boardId,
 531:       p_storage_key: storageKey,
 532:       p_filename: file.name,
 533:       p_size_bytes: file.size,
 534:     }
 535:   );
 536:   if (rpcErr) {
 537:     console.error("[addPdfAttachmentAction] RPC error:", rpcErr);
 538:     return { ok: false, error: rpcErr.message };
 539:   }
 540: 
 541:   // Recompute asset_index server-side (trust boundary L-041)
 542:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 543:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 544: 
 545:   return { ok: true, attachmentId: attachmentId as string };
 546: }
 547: 
 548: // ============================================================
 549: // removePdfAttachmentAction
 550: // ============================================================
 551: 
 552: export type RemovePdfResult = { ok: true } | { ok: false; error: string };
 553: 
 554: export async function removePdfAttachmentAction(
 555:   boardId: string,
 556:   attachmentId: string
 557: ): Promise<RemovePdfResult> {
 558:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 559: 
 560:   const supabase = await createSupabaseServer();
 561:   const {
 562:     data: { user },
 563:   } = await supabase.auth.getUser();
 564:   if (!user) return { ok: false, error: "unauthenticated" };
 565: 
 566:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 567:   const { error: rpcErr } = await (supabase as any).rpc(
 568:     "remove_project_board_attachment",
 569:     {
 570:       p_board_id: boardId,
 571:       p_kind: "pdf",
 572:       p_attachment_id: attachmentId,
 573:     }
 574:   );
 575:   if (rpcErr) {
 576:     console.error("[removePdfAttachmentAction] RPC error:", rpcErr);
 577:     return { ok: false, error: rpcErr.message };
 578:   }
 579: 
 580:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 581:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 582:   return { ok: true };
 583: }
 584: 
 585: // ============================================================
 586: // addUrlAttachmentAction
 587: // ============================================================
 588: 
 589: export type AddUrlResult =
 590:   | { ok: true; attachmentId: string }
 591:   | { ok: false; error: string };
 592: 
 593: export async function addUrlAttachmentAction(
 594:   boardId: string,
 595:   url: string,
 596:   note: string | null
 597: ): Promise<AddUrlResult> {
 598:   if (!boardId) return { ok: false, error: "invalid_board_id" };
 599: 
 600:   // Server-side URL validation (L-042 ??only http/https)
 601:   if (!validateUrlScheme(url)) {
 602:     return { ok: false, error: "invalid_url_scheme" };
 603:   }
 604:   if (url.length > 2000) return { ok: false, error: "url_too_long" };
 605:   if (note && note.length > 500) return { ok: false, error: "note_too_long" };
 606: 
 607:   const supabase = await createSupabaseServer();
 608:   const {
 609:     data: { user },
 610:   } = await supabase.auth.getUser();
 611:   if (!user) return { ok: false, error: "unauthenticated" };
 612: 
 613:   // Detect provider and fetch metadata
 614:   let provider: "youtube" | "vimeo" | "generic" = "generic";
 615:   let title: string | null = null;
 616:   let thumbnail_url: string | null = null;
 617: 
 618:   try {
 619:     const parsedUrl = new URL(url);
 620:     const host = parsedUrl.hostname.replace(/^www\./, "");
 621:     if (host === "youtube.com" || host === "youtu.be") provider = "youtube";
 622:     else if (host === "vimeo.com") provider = "vimeo";
 623:     else title = host;
 624:   } catch {
 625:     // ignore parse error ??URL already validated above
 626:   }
 627: 
 628:   if (provider !== "generic") {
 629:     try {
 630:       const meta = await fetchVideoMetadata(url);
 631:       if (meta) {
 632:         title = meta.title ?? null;
 633:         thumbnail_url = meta.thumbnailUrl ?? null;
 634:       }
 635:     } catch {
 636:       // best-effort ??fall back to no metadata
 637:     }
 638:   }
 639: 
 640:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 641:   const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
 642:     "add_project_board_url",
 643:     {
 644:       p_board_id: boardId,
 645:       p_url: url,
 646:       p_title: title,
 647:       p_thumbnail_url: thumbnail_url,
 648:       p_provider: provider,
 649:       p_note: note,
 650:     }
 651:   );
 652:   if (rpcErr) {
 653:     console.error("[addUrlAttachmentAction] RPC error:", rpcErr);
 654:     return { ok: false, error: rpcErr.message };
 655:   }
 656: 
 657:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 658:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 659:   return { ok: true, attachmentId: attachmentId as string };
 660: }
 661: 
 662: // ============================================================
 663: // updateUrlNoteAction
 664: // ============================================================
 665: 
 666: export type UpdateUrlNoteResult = { ok: true } | { ok: false; error: string };
 667: 
 668: export async function updateUrlNoteAction(
 669:   boardId: string,
 670:   attachmentId: string,
 671:   note: string
 672: ): Promise<UpdateUrlNoteResult> {
 673:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 674:   if (note && note.length > 500) return { ok: false, error: "note_too_long" };
 675: 
 676:   const supabase = await createSupabaseServer();
 677:   const {
 678:     data: { user },
 679:   } = await supabase.auth.getUser();
 680:   if (!user) return { ok: false, error: "unauthenticated" };
 681: 
 682:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 683:   const { error: rpcErr } = await (supabase as any).rpc(
 684:     "update_project_board_url_note",
 685:     {
 686:       p_board_id: boardId,
 687:       p_attachment_id: attachmentId,
 688:       p_note: note,
 689:     }
 690:   );
 691:   if (rpcErr) {
 692:     console.error("[updateUrlNoteAction] RPC error:", rpcErr);
 693:     return { ok: false, error: rpcErr.message };
 694:   }
 695: 
 696:   // Note is in asset_index entries ??must recompute (L-041)
 697:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 698:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 699:   return { ok: true };
 700: }
 701: 
 702: // ============================================================
 703: // removeUrlAttachmentAction
 704: // ============================================================
 705: 
 706: export type RemoveUrlResult = { ok: true } | { ok: false; error: string };
 707: 
 708: export async function removeUrlAttachmentAction(
 709:   boardId: string,
 710:   attachmentId: string
 711: ): Promise<RemoveUrlResult> {
 712:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 713: 
 714:   const supabase = await createSupabaseServer();
 715:   const {
 716:     data: { user },
 717:   } = await supabase.auth.getUser();
 718:   if (!user) return { ok: false, error: "unauthenticated" };
 719: 
 720:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 721:   const { error: rpcErr } = await (supabase as any).rpc(
 722:     "remove_project_board_attachment",
 723:     {
 724:       p_board_id: boardId,
 725:       p_kind: "url",
 726:       p_attachment_id: attachmentId,
 727:     }
 728:   );
 729:   if (rpcErr) {
 730:     console.error("[removeUrlAttachmentAction] RPC error:", rpcErr);
 731:     return { ok: false, error: rpcErr.message };
 732:   }
 733: 
 734:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 735:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 736:   return { ok: true };
 737: }

 succeeded in 447ms:
   1: -- Wave C.5d sub_03f_2 ??close the project_boards UPDATE bypass.
   2: --
   3: -- Phase 3.1 hotfix-3 (migration 20260429151821) tried to seal the three
   4: -- server-managed columns on project_boards (attached_pdfs, attached_urls,
   5: -- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
   6: -- role still holds table-level UPDATE: Postgres column privileges
   7: -- evaluate as max(table-grant, column-grant). The default Supabase
   8: -- bootstrap grants table-level UPDATE to `authenticated` on every public
   9: -- table, so PostgREST clients have been able to UPDATE attached_pdfs /
  10: -- attached_urls / asset_index directly, bypassing
  11: -- add_project_board_pdf / add_project_board_url RPC validation
  12: -- (count cap, URL scheme allowlist, lock state) and the asset_index
  13: -- trust boundary (server-recomputed from document + attached_*).
  14: --
  15: -- Codex generic K-05 review (Phase 4.x branch, 2026-05-03) flagged this
  16: -- as P1.
  17: --
  18: -- Lockdown:
  19: --   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
  20: --   2. GRANT  UPDATE (document, updated_at) TO authenticated
  21: --
  22: -- After this migration, the only columns an authenticated PostgREST
  23: -- client can UPDATE on project_boards are `document` (the user's own
  24: -- tldraw store snapshot) and `updated_at` (timestamp the user can
  25: -- trigger via document edits). All other columns flow through:
  26: --   - add_project_board_pdf       (SECURITY DEFINER RPC)
  27: --   - add_project_board_url       (SECURITY DEFINER RPC)
  28: --   - toggle_project_board_lock   (SECURITY DEFINER RPC)
  29: --   - service-role client inside board-actions.ts (asset_index updates
  30: --     in saveBoardDocumentAction, restoreVersionAction, and the
  31: --     recomputeAndUpdateAssetIndex helper)
  32: --
  33: -- The companion source-code refactor in
  34: -- src/app/[locale]/app/projects/[id]/board-actions.ts is shipped in the
  35: -- same Wave C.5d sub_03f_2 commit so the autosave / restore / repair
  36: -- paths keep working under the new grant.
  37: 
  38: REVOKE UPDATE ON project_boards FROM authenticated;
  39: GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
  40: 
  41: -- Sanity assertions ??fail the migration if the privilege state is not
  42: -- what we expect, so we never silently ship a half-applied lockdown.
  43: DO $$
  44: DECLARE
  45:   v_table_update boolean;
  46:   v_doc_update   boolean;
  47:   v_asset_update boolean;
  48:   v_pdfs_update  boolean;
  49:   v_urls_update  boolean;
  50: BEGIN
  51:   SELECT EXISTS (
  52:     SELECT 1 FROM information_schema.role_table_grants
  53:     WHERE table_schema = 'public' AND table_name = 'project_boards'
  54:       AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  55:   ) INTO v_table_update;
  56:   IF v_table_update THEN
  57:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has table-level UPDATE on project_boards';
  58:   END IF;
  59: 
  60:   SELECT EXISTS (
  61:     SELECT 1 FROM information_schema.column_privileges
  62:     WHERE table_schema = 'public' AND table_name = 'project_boards'
  63:       AND column_name = 'document' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  64:   ) INTO v_doc_update;
  65:   IF NOT v_doc_update THEN
  66:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost UPDATE on project_boards.document';
  67:   END IF;
  68: 
  69:   SELECT EXISTS (
  70:     SELECT 1 FROM information_schema.column_privileges
  71:     WHERE table_schema = 'public' AND table_name = 'project_boards'
  72:       AND column_name = 'asset_index' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  73:   ) INTO v_asset_update;
  74:   IF v_asset_update THEN
  75:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.asset_index';
  76:   END IF;
  77: 
  78:   SELECT EXISTS (
  79:     SELECT 1 FROM information_schema.column_privileges
  80:     WHERE table_schema = 'public' AND table_name = 'project_boards'
  81:       AND column_name = 'attached_pdfs' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  82:   ) INTO v_pdfs_update;
  83:   IF v_pdfs_update THEN
  84:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_pdfs';
  85:   END IF;
  86: 
  87:   SELECT EXISTS (
  88:     SELECT 1 FROM information_schema.column_privileges
  89:     WHERE table_schema = 'public' AND table_name = 'project_boards'
  90:       AND column_name = 'attached_urls' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
  91:   ) INTO v_urls_update;
  92:   IF v_urls_update THEN
  93:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_urls';
  94:   END IF;
  95: END $$;

 succeeded in 478ms:
   1: -- Wave C.5d sub_03f_1 ??allow `board-assets/` prefix on
   2: -- add_project_board_pdf so wizard PDFs can be persisted with their
   3: -- actual R2 storage key.
   4: --
   5: -- Background: getBoardAssetPutUrlAction (Phase 3.0) generates a
   6: -- server-side R2 upload key shaped like `board-assets/<user>/<uuid>.<ext>`
   7: -- and presigns a PUT URL against that key. The earlier
   8: -- add_project_board_pdf RPC validation only accepted `project-wizard/%`
   9: -- and `project-board/%` prefixes, which forced the wizard client to
  10: -- prepend a literal "project-wizard" segment in front of the real key
  11: -- before persisting it through the RPC. The persisted key
  12: -- (`project-wizard/board-assets/<user>/<uuid>.<ext>`) did not exist in
  13: -- R2 and broke PDF retrieval from both the project board and the admin
  14: -- asset-list panel.
  15: --
  16: -- This migration extends the validation allowlist to include
  17: -- `board-assets/%`, and the wizard now writes the bare R2 key.
  18: -- Production audit at apply time: 0 broken-prefix entries persisted in
  19: -- attached_pdfs, so no backfill is required.
  20: 
  21: CREATE OR REPLACE FUNCTION add_project_board_pdf(
  22:   p_board_id    uuid,
  23:   p_storage_key text,
  24:   p_filename    text,
  25:   p_size_bytes  bigint
  26: ) RETURNS uuid
  27: LANGUAGE plpgsql
  28: SECURITY DEFINER
  29: SET search_path = public, pg_temp
  30: AS $$
  31: DECLARE
  32:   v_caller_id  uuid := auth.uid();
  33:   v_project_id uuid;
  34:   v_is_locked  boolean;
  35:   v_is_admin   boolean;
  36:   v_new_id     uuid := gen_random_uuid();
  37:   v_pdf_count  int;
  38: BEGIN
  39:   IF v_caller_id IS NULL THEN
  40:     RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
  41:   END IF;
  42: 
  43:   SELECT pb.project_id, pb.is_locked
  44:   INTO v_project_id, v_is_locked
  45:   FROM project_boards pb
  46:   WHERE pb.id = p_board_id;
  47: 
  48:   IF NOT FOUND THEN
  49:     RAISE EXCEPTION 'add_project_board_pdf: board not found';
  50:   END IF;
  51: 
  52:   v_is_admin := is_yagi_admin(v_caller_id);
  53:   IF NOT v_is_admin AND NOT EXISTS (
  54:     SELECT 1 FROM projects p
  55:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
  56:   ) THEN
  57:     RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  58:   END IF;
  59: 
  60:   IF v_is_locked AND NOT v_is_admin THEN
  61:     RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  62:   END IF;
  63: 
  64:   SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  65:   FROM project_boards WHERE id = p_board_id;
  66:   IF v_pdf_count >= 30 THEN
  67:     RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  68:   END IF;
  69: 
  70:   IF p_size_bytes > 20 * 1024 * 1024 THEN
  71:     RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  72:   END IF;
  73: 
  74:   IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
  75:     RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  76:   END IF;
  77: 
  78:   IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
  79:     OR (
  80:       p_storage_key NOT LIKE 'project-wizard/%'
  81:       AND p_storage_key NOT LIKE 'project-board/%'
  82:       AND p_storage_key NOT LIKE 'board-assets/%'
  83:     ) THEN
  84:     RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/, project-board/, or board-assets/)';
  85:   END IF;
  86: 
  87:   UPDATE project_boards
  88:   SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
  89:     'id', v_new_id::text,
  90:     'storage_key', p_storage_key,
  91:     'filename', p_filename,
  92:     'size_bytes', p_size_bytes,
  93:     'uploaded_at', now()::text,
  94:     'uploaded_by', v_caller_id::text
  95:   )), updated_at = now()
  96:   WHERE id = p_board_id;
  97: 
  98:   RETURN v_new_id;
  99: END;
 100: $$;

codex
The first direct reads show the intended service-role split exists, but there are a few spots that deserve closer scrutiny: the RPC only checks a broad `board-assets/%` prefix, and one preprod page still has `workspaces[0]` inside the explicitly excluded admin surface. I?셫 checking whether either is actually reachable/exploitable and whether any non-admin project query remains unscoped.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\actions.ts' | ForEach-Object { "'$i++; if ($i -le 260 -or ($i -ge 260 -and $i -le 360) -or ($i -ge 760 -and $i -le 950)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\page.tsx' | ForEach-Object { "'$i++; if ($i -le 190) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\new-project-wizard.tsx' | ForEach-Object { "'$i++; if ($i -le 170 -or ($i -ge 420 -and $i -le 470) -or ($i -ge 1550 -and $i -le 1650)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\page.tsx' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 500ms:
   1: "use server";
   2: 
   3: import { z } from "zod";
   4: import { revalidatePath } from "next/cache";
   5: import { createSupabaseServer } from "@/lib/supabase/server";
   6: import { createSupabaseService } from "@/lib/supabase/service";
   7: import type { Json } from "@/lib/supabase/database.types";
   8: import { fetchVideoMetadata, type OEmbedResult } from "@/lib/oembed";
   9: import { extractAssetIndex } from "@/lib/board/asset-index";
  10: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  11: 
  12: // -----------------------------------------------------------------------------
  13: // Phase 2.8.1 G_B1-B ??Wizard draft mode
  14: // -----------------------------------------------------------------------------
  15: // The wizard now creates the projects row early (status='draft') so Step 2
  16: // can mount BriefBoardEditor against a real project_id and the user can
  17: // drop images / paste embeds before "submit". Submit flips the status from
  18: // 'draft' to 'submitted' rather than INSERTing a fresh row.
  19: //
  20: // Server actions exposed:
  21: //   - createProject       : pre-2.8.1 single-shot INSERT path (kept for
  22: //                           backwards compatibility; wizard no longer calls
  23: //                           it but tests / direct callers still do)
  24: //   - ensureDraftProject  : find-or-create the user's wizard draft. Returns
  25: //                           project + brief bootstrap for the editor.
  26: //   - submitDraftProject  : UPDATE the existing draft with the latest
  27: //                           wizard fields and (optionally) flip to 'submitted'.
  28: // -----------------------------------------------------------------------------
  29: 
  30: const sharedFields = {
  31:   title: z.string().trim().min(1).max(200),
  32:   description: z.string().max(4000).optional().nullable(),
  33:   brand_id: z.string().uuid().nullable().optional(),
  34:   tone: z.string().max(500).optional().nullable(),
  35:   // Phase 2.7.2: free-text tag list (was a closed enum). Maps to the
  36:   // existing `deliverable_types text[]` Postgres column ??no migration
  37:   // needed; the meaning shifts from "format" to "intended use".
  38:   deliverable_types: z
  39:     .array(z.string().trim().min(1).max(60))
  40:     .max(10)
  41:     .default([]),
  42:   estimated_budget_range: z.string().max(100).optional().nullable(),
  43:   target_delivery_at: z
  44:     .string()
  45:     .regex(/^\d{4}-\d{2}-\d{2}$/)
  46:     .nullable()
  47:     .optional(),
  48:   intent: z.enum(["draft", "submit"]).default("draft"),
  49: };
  50: 
  51: // Phase 2.8.1 G_B1-E: proposalSchema + discriminatedUnion deleted ??// proposal_request intake mode is no longer authored. The legacy
  52: // `projects.intake_mode` column stays; existing rows still render via
  53: // the read-only banner on /app/projects/[id].
  54: const createProjectSchema = z.object({
  55:   ...sharedFields,
  56:   intake_mode: z.literal("brief"),
  57: });
  58: 
  59: type ActionResult =
  60:   | { ok: true; id: string; status: string }
  61:   | {
  62:       error: "validation";
  63:       issues: z.ZodFormattedError<z.infer<typeof createProjectSchema>>;
  64:     }
  65:   | { error: "unauthenticated" }
  66:   | { error: "no_workspace" }
  67:   | { error: "db"; message: string };
  68: 
  69: export async function createProject(input: unknown): Promise<ActionResult> {
  70:   const parsed = createProjectSchema.safeParse(input);
  71:   if (!parsed.success) {
  72:     return { error: "validation", issues: parsed.error.format() };
  73:   }
  74: 
  75:   const supabase = await createSupabaseServer();
  76:   const {
  77:     data: { user },
  78:   } = await supabase.auth.getUser();
  79:   if (!user) return { error: "unauthenticated" };
  80: 
  81:   // Wave C.5d sub_03c ??replace first-membership fallback with the
  82:   // cookie-based active workspace resolver (Codex K-05 final review LOOP 1
  83:   // MED-C). createProject is the legacy direct-INSERT path retained for
  84:   // backwards compatibility; the wizard goes through ensureDraftProject +
  85:   // submitProjectAction. Same misroute risk regardless, same fix.
  86:   const active = await resolveActiveWorkspace(user.id);
  87:   if (!active) return { error: "no_workspace" };
  88:   const membership = { workspace_id: active.id };
  89: 
  90:   const status = parsed.data.intent === "submit" ? "submitted" : "draft";
  91: 
  92:   // Column mapping notes:
  93:   // - spec field `description` ??DB column `brief` (no standalone `description` col)
  94:   // - spec field `tone` ??NO matching column on `projects`; omitted from insert
  95:   // - `estimated_budget_range` matches exactly
  96:   const data = parsed.data;
  97: 
  98:   const insertPayload = {
  99:     workspace_id: membership.workspace_id,
 100:     created_by: user.id,
 101:     project_type: "direct_commission" as const,
 102:     status,
 103:     title: data.title,
 104:     brief: data.description ?? null,
 105:     brand_id: data.brand_id ?? null,
 106:     deliverable_types: data.deliverable_types,
 107:     estimated_budget_range: data.estimated_budget_range ?? null,
 108:     target_delivery_at: data.target_delivery_at ?? null,
 109:     intake_mode: data.intake_mode,
 110:   };
 111: 
 112:   const { data: project, error } = await supabase
 113:     .from("projects")
 114:     .insert(insertPayload)
 115:     .select("id")
 116:     .single();
 117: 
 118:   if (error || !project) {
 119:     console.error("[createProject] Supabase error:", error);
 120:     return { error: "db", message: error?.message ?? "insert failed" };
 121:   }
 122: 
 123:   // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
 124:   // with empty content, so the Brief tab on /app/projects/[id] can mount
 125:   // the editor immediately. RLS allows this INSERT because the caller
 126:   // is the project's workspace member (just created the project above).
 127:   //
 128:   // K05-PHASE-2-8-04 fix: brief INSERT failure is now FATAL. If the
 129:   // sibling row can't be created we roll back the project to avoid
 130:   // leaving an orphan project that the Brief tab cannot edit (saveBrief
 131:   // returns not_found when the row is missing ??there is no lazy-create
 132:   // path). Atomicity-via-RPC lands in Phase 2.8.1 (FU-2.8-saveversion-rollback
 133:   // covers a related two-write atomicity gap).
 134:   const { error: briefErr } = await supabase
 135:     .from("project_briefs")
 136:     .insert({
 137:       project_id: project.id,
 138:       // status / current_version / tiptap_schema_version use column defaults
 139:       // (editing / 0 / 1) ??required by validate_project_brief_change for
 140:       // non-yagi_admin INSERT.
 141:       updated_by: user.id,
 142:     });
 143:   if (briefErr) {
 144:     console.error(
 145:       "[createProject] project_briefs sibling insert failed (rolling back project):",
 146:       briefErr
 147:     );
 148:     // K05-PHASE-2-8-LOOP2-03 fix: rollback DELETE must use the
 149:     // service-role client. The user-scoped supabase client honors
 150:     // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
 151:     // a non-yagi workspace_admin's rollback would be silently denied
 152:     // and leave an orphan project. Service role bypasses RLS so the
 153:     // rollback succeeds for all caller roles. Atomicity-via-RPC is
 154:     // still the cleaner long-term fix (FU-2.8-saveversion-rollback).
 155:     const service = createSupabaseService();
 156:     const { error: rollbackErr } = await service
 157:       .from("projects")
 158:       .delete()
 159:       .eq("id", project.id);
 160:     if (rollbackErr) {
 161:       console.error("[createProject] rollback DELETE failed:", rollbackErr);
 162:     }
 163:     return {
 164:       error: "db",
 165:       message: `brief insert failed: ${briefErr.message}`,
 166:     };
 167:   }
 168: 
 169:   revalidatePath("/[locale]/app/projects", "page");
 170:   return { ok: true, id: project.id, status };
 171: }
 172: 
 173: // =============================================================================
 174: // Phase 2.8.1 G_B1-B ??wizard draft mode
 175: // =============================================================================
 176: 
 177: const wizardDraftFields = z.object({
 178:   title: z.string().trim().min(1).max(200),
 179:   description: z.string().max(4000).optional().nullable(),
 180:   brand_id: z.string().uuid().nullable().optional(),
 181:   tone: z.string().max(500).optional().nullable(),
 182:   deliverable_types: z
 183:     .array(z.string().trim().min(1).max(60))
 184:     .max(10)
 185:     .default([]),
 186:   estimated_budget_range: z.string().max(100).optional().nullable(),
 187:   target_delivery_at: z
 188:     .string()
 189:     .regex(/^\d{4}-\d{2}-\d{2}$/)
 190:     .nullable()
 191:     .optional(),
 192: });
 193: 
 194: const ensureDraftInput = z.object({
 195:   initial: wizardDraftFields,
 196: });
 197: 
 198: const submitDraftInput = z.object({
 199:   projectId: z.string().uuid(),
 200:   fields: wizardDraftFields,
 201:   intent: z.enum(["draft", "submit"]),
 202: });
 203: 
 204: export type WizardDraftFields = z.infer<typeof wizardDraftFields>;
 205: 
 206: type DraftBootstrap = {
 207:   projectId: string;
 208:   status: "draft" | "submitted" | string;
 209:   brief: {
 210:     contentJson: Json;
 211:     updatedAt: string;
 212:     status: "editing" | "locked";
 213:   };
 214: };
 215: 
 216: export type EnsureDraftResult =
 217:   | { ok: true; data: DraftBootstrap }
 218:   | { error: "validation"; issues: z.ZodIssue[] }
 219:   | { error: "unauthenticated" }
 220:   | { error: "no_workspace" }
 221:   | { error: "db"; message: string };
 222: 
 223: export type SubmitDraftResult =
 224:   | { ok: true; id: string; status: "draft" | "submitted" }
 225:   | { error: "validation"; issues: z.ZodIssue[] }
 226:   | { error: "unauthenticated" }
 227:   | { error: "not_found" }
 228:   | { error: "forbidden" }
 229:   | { error: "db"; message: string };
 230: 
 231: const PG_UNIQUE_VIOLATION = "23505";
 232: 
 233: async function fetchDraftBootstrap(
 234:   supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
 235:   projectId: string,
 236: ): Promise<DraftBootstrap | null> {
 237:   const { data: project, error: projectErr } = await supabase
 238:     .from("projects")
 239:     .select("id, status")
 240:     .eq("id", projectId)
 241:     .maybeSingle();
 242:   if (projectErr || !project) return null;
 243: 
 244:   const { data: brief, error: briefErr } = await supabase
 245:     .from("project_briefs")
 246:     .select("content_json, updated_at, status")
 247:     .eq("project_id", projectId)
 248:     .maybeSingle();
 249:   if (briefErr || !brief) return null;
 250: 
 251:   return {
 252:     projectId: project.id,
 253:     status: project.status,
 254:     brief: {
 255:       contentJson: brief.content_json,
 256:       updatedAt: brief.updated_at,
 257:       status: brief.status as "editing" | "locked",
 258:     },
 259:   };
 260: }
 261: 
 262: export async function ensureDraftProject(
 263:   input: unknown,
 264: ): Promise<EnsureDraftResult> {
 265:   const parsed = ensureDraftInput.safeParse(input);
 266:   if (!parsed.success) {
 267:     return { error: "validation", issues: parsed.error.issues };
 268:   }
 269: 
 270:   const supabase = await createSupabaseServer();
 271:   const {
 272:     data: { user },
 273:   } = await supabase.auth.getUser();
 274:   if (!user) return { error: "unauthenticated" };
 275: 
 276:   // Wave C.5d sub_03c ??same MED-C fix: ensureDraftProject must scope to
 277:   // the workspace the user has selected in the switcher, not their
 278:   // oldest membership.
 279:   const active = await resolveActiveWorkspace(user.id);
 280:   if (!active) return { error: "no_workspace" };
 281:   const membership = { workspace_id: active.id };
 282: 
 283:   // 1. SELECT existing draft (intake_mode='brief'). Phase 2.8.1 migration
 284:   //    guarantees at most one row matches per (workspace, user) via the
 285:   //    projects_wizard_draft_uniq partial index.
 286:   const { data: existing } = await supabase
 287:     .from("projects")
 288:     .select("id")
 289:     .eq("workspace_id", membership.workspace_id)
 290:     .eq("created_by", user.id)
 291:     .eq("status", "draft")
 292:     .eq("intake_mode", "brief")
 293:     .order("created_at", { ascending: false })
 294:     .limit(1)
 295:     .maybeSingle();
 296: 
 297:   if (existing?.id) {
 298:     const bootstrap = await fetchDraftBootstrap(supabase, existing.id);
 299:     if (bootstrap) return { ok: true, data: bootstrap };
 300:     // If brief row is missing for an existing draft project we treat it as
 301:     // corrupt ??fall through and create a fresh draft. (DELETE the orphan
 302:     // first so the unique index does not block the new INSERT.)
 303:     const service = createSupabaseService();
 304:     await service.from("projects").delete().eq("id", existing.id);
 305:   }
 306: 
 307:   // 2. INSERT new draft. The unique index makes concurrent INSERTs from a
 308:   //    double-mounted wizard converge ??one wins, the other catches 23505
 309:   //    and re-SELECTs.
 310:   const fields = parsed.data.initial;
 311:   const insertPayload = {
 312:     workspace_id: membership.workspace_id,
 313:     created_by: user.id,
 314:     project_type: "direct_commission" as const,
 315:     status: "draft" as const,
 316:     intake_mode: "brief" as const,
 317:     title: fields.title,
 318:     brief: fields.description ?? null,
 319:     brand_id: fields.brand_id ?? null,
 320:     deliverable_types: fields.deliverable_types,
 321:     estimated_budget_range: fields.estimated_budget_range ?? null,
 322:     target_delivery_at: fields.target_delivery_at ?? null,
 323:   };
 324: 
 325:   const { data: project, error } = await supabase
 326:     .from("projects")
 327:     .insert(insertPayload)
 328:     .select("id, status")
 329:     .single();
 330: 
 331:   if (error || !project) {
 332:     if (error?.code === PG_UNIQUE_VIOLATION) {
 333:       // A concurrent ensureDraftProject won the race. Re-SELECT and return
 334:       // the surviving row.
 335:       const { data: winner } = await supabase
 336:         .from("projects")
 337:         .select("id")
 338:         .eq("workspace_id", membership.workspace_id)
 339:         .eq("created_by", user.id)
 340:         .eq("status", "draft")
 341:         .eq("intake_mode", "brief")
 342:         .limit(1)
 343:         .maybeSingle();
 344:       if (winner?.id) {
 345:         const bootstrap = await fetchDraftBootstrap(supabase, winner.id);
 346:         if (bootstrap) return { ok: true, data: bootstrap };
 347:       }
 348:     }
 349:     console.error("[ensureDraftProject] insert error:", error);
 350:     return { error: "db", message: error?.message ?? "insert failed" };
 351:   }
 352: 
 353:   // 3. Sibling project_briefs row. Same atomic-rollback pattern as
 354:   //    createProject ??if the sibling INSERT fails we roll back via service
 355:   //    role so the wizard can retry without an orphan blocking the unique
 356:   //    index.
 357:   const { error: briefErr } = await supabase
 358:     .from("project_briefs")
 359:     .insert({
 360:       project_id: project.id,
 760:     .enum(["undecided", "specific_in_mind", "no_twin"])
 761:     .optional()
 762:     .default("undecided"),
 763:   // workspaceId is optional when draftProjectId is provided ??the action
 764:   // resolves it from the draft project row in that case. One of the two
 765:   // must be present for workspace resolution to succeed.
 766:   workspaceId: z.string().uuid().optional(),
 767:   // draftProjectId: the wizard's autosave-created draft project. When
 768:   // present, workspace is resolved from it. The draft row is deleted after
 769:   // the real project INSERT succeeds.
 770:   draftProjectId: z.string().uuid().nullable().optional(),
 771: });
 772: 
 773: export type SubmitProjectInput = z.infer<typeof SubmitInputSchema>;
 774: 
 775: export type SubmitProjectResult =
 776:   | { ok: true; projectId: string; redirect: string }
 777:   | { ok: false; error: "unauthenticated" | "validation" | "db"; message?: string };
 778: 
 779: export async function submitProjectAction(
 780:   input: unknown
 781: ): Promise<SubmitProjectResult> {
 782:   // Parse + validate input
 783:   const parsed = SubmitInputSchema.safeParse(input);
 784:   if (!parsed.success) {
 785:     return { ok: false, error: "validation", message: parsed.error.message };
 786:   }
 787:   const data = parsed.data;
 788: 
 789:   // Auth check
 790:   const supabase = await createSupabaseServer();
 791:   const {
 792:     data: { user },
 793:     error: authError,
 794:   } = await supabase.auth.getUser();
 795:   if (authError || !user) return { ok: false, error: "unauthenticated" };
 796: 
 797:   // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
 798:   // MED-C fix): the prior `created_at asc + limit 1` first-membership
 799:   // fallback could misroute a project to the user's oldest workspace
 800:   // instead of the workspace they had selected in the switcher. Replace
 801:   // with three explicit paths, all gated on a single membership lookup so
 802:   // every accepted workspace_id is one the caller actually belongs to:
 803:   //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
 804:   //   B. draft project row's workspace_id  (autosave path)
 805:   //   C. resolveActiveWorkspace cookie-based resolver  (final fallback)
 806:   // RLS already gates projects.INSERT to workspace members; this is
 807:   // defense-in-depth that returns a clean error path and prevents silent
 808:   // misrouting through the old fallback.
 809:   const { data: memRows } = await supabase
 810:     .from("workspace_members")
 811:     .select("workspace_id")
 812:     .eq("user_id", user.id);
 813:   const memberSet = new Set((memRows ?? []).map((r) => r.workspace_id));
 814: 
 815:   let resolvedWorkspaceId: string | null = null;
 816: 
 817:   if (data.workspaceId && memberSet.has(data.workspaceId)) {
 818:     resolvedWorkspaceId = data.workspaceId;
 819:   }
 820: 
 821:   if (!resolvedWorkspaceId && data.draftProjectId) {
 822:     const { data: draftRow } = await supabase
 823:       .from("projects")
 824:       .select("workspace_id")
 825:       .eq("id", data.draftProjectId)
 826:       .maybeSingle();
 827:     if (draftRow?.workspace_id && memberSet.has(draftRow.workspace_id)) {
 828:       resolvedWorkspaceId = draftRow.workspace_id;
 829:     }
 830:   }
 831: 
 832:   if (!resolvedWorkspaceId) {
 833:     const active = await resolveActiveWorkspace(user.id);
 834:     if (active) resolvedWorkspaceId = active.id;
 835:   }
 836: 
 837:   if (!resolvedWorkspaceId) {
 838:     return { ok: false, error: "db", message: "workspace not found for user" };
 839:   }
 840: 
 841:   // Phase 3.0 columns (budget_band, submitted_at, kind) are not in the
 842:   // generated database.types.ts yet ??use any cast for this INSERT only.
 843:   // Same pattern as task_05 used in page.tsx.
 844:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
 845:   const supabaseAny = supabase as any;
 846: 
 847:   // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
 848:   //    is allowed by projects_insert RLS policy for authenticated callers who
 849:   //    are workspace members. Direct UPDATE to status is forbidden by trigger
 850:   //    guard but INSERT with the target status is the allowed L-015 path.)
 851:   const { data: project, error: projErr } = await supabaseAny
 852:     .from("projects")
 853:     .insert({
 854:       // 'name' column does not exist on projects ??map to 'title' (existing column)
 855:       title: data.name,
 856:       // 'description' maps to 'brief' on the projects table
 857:       brief: data.description,
 858:       deliverable_types: data.deliverable_types,
 859:       budget_band: data.budget_band,
 860:       // delivery_date maps to target_delivery_at
 861:       target_delivery_at: data.delivery_date ?? null,
 862:       // Phase 3.1 hotfix-3 addendum: 沃섎챸????彛???깆쁽 (optional)
 863:       meeting_preferred_at: data.meeting_preferred_at ?? null,
 864:       // Phase 4.x task_03: Digital Twin intent (3-radio, default 'undecided').
 865:       // Persistence requires task_01 migration applied (Wave D D.1) ??until
 866:       // then prod DB has no twin_intent column and this field is ignored.
 867:       twin_intent: data.twin_intent,
 868:       workspace_id: resolvedWorkspaceId,
 869:       created_by: user.id,
 870:       status: "in_review",
 871:       submitted_at: new Date().toISOString(),
 872:       kind: "direct",
 873:       // project_type stays as 'direct_commission' for backward compat
 874:       project_type: "direct_commission",
 875:       intake_mode: "brief",
 876:     })
 877:     .select("id")
 878:     .single() as { data: { id: string } | null; error: { message: string } | null };
 879: 
 880:   if (projErr || !project) {
 881:     console.error("[submitProjectAction] projects INSERT error:", projErr);
 882:     return {
 883:       ok: false,
 884:       error: "db",
 885:       message: projErr?.message ?? "project insert failed",
 886:     };
 887:   }
 888: 
 889:   // 2. INSERT project_status_history with actor_role='system'.
 890:   //    Option A: service-role client for this single statement only (bypasses
 891:   //    the psh_insert_deny RLS policy which blocks all authenticated users).
 892:   //    The service-role client is NOT used for any other read/write in this action.
 893:   //    project_status_history is a Phase 3.0 table ??not in generated types yet.
 894:   const service = createSupabaseService();
 895:   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 896:   const serviceAny = service as any;
 897:   const { error: histErr } = await serviceAny
 898:     .from("project_status_history")
 899:     .insert({
 900:       project_id: project.id,
 901:       from_status: "submitted",   // logical from-state (L-015: submitted?萸쓓_review)
 902:       to_status: "in_review",
 903:       actor_id: user.id,
 904:       actor_role: "system",
 905:       comment: null,
 906:     }) as { error: { message: string } | null };
 907: 
 908:   if (histErr) {
 909:     console.error("[submitProjectAction] history INSERT error:", histErr);
 910:     // History failure is non-fatal in prod but should alert ??do not roll back
 911:     // the project, log and continue. K-05 review can decide if we want to roll
 912:     // back on history failure.
 913:     console.error("[submitProjectAction] WARN: history row missing for project", project.id);
 914:   }
 915: 
 916:   // 3. Phase 3.1 ??Seed the project_boards row via RPC.
 917:   //    Replaces the old project_references[] INSERT path. The RPC is
 918:   //    SECURITY DEFINER + asserts caller owns the project (K-05 LOOP 1 F1 fix)
 919:   //    AND project.status='in_review'. ON CONFLICT (project_id) DO UPDATE so
 920:   //    re-submits are idempotent.
 921:   //    K-05 HIGH-B F5 fix: server-recompute asset_index from the board document
 922:   //    so admin queue/detail counts are accurate immediately after submit
 923:   //    (K-05 trust boundary ??never trust client-supplied asset_index).
 924:   const seedDocument = data.boardDocument ?? {};
 925:   const seedAttachedPdfs = data.attachedPdfs ?? [];
 926:   const seedAttachedUrls = data.attachedUrls ?? [];
 927:   // Phase 3.1 hotfix-3: compute unified asset_index from all three sources
 928:   // (canvas shapes + attached PDFs + attached URLs). Trust boundary: server
 929:   // always recomputes ??never accepts client-supplied asset_index (L-041).
 930:   const seedAssetIndex = extractAssetIndex(
 931:     seedDocument as Record<string, unknown>,
 932:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
 933:     seedAttachedPdfs as any,
 934:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
 935:     seedAttachedUrls as any,
 936:   );
 937:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 938:   const { error: seedErr } = await (supabase as any).rpc(
 939:     "seed_project_board_from_wizard",
 940:     {
 941:       p_project_id: project.id,
 942:       p_initial_document: seedDocument,
 943:       p_initial_attached_pdfs: seedAttachedPdfs,
 944:       p_initial_attached_urls: seedAttachedUrls,
 945:       p_initial_asset_index: seedAssetIndex,
 946:     }
 947:   );
 948:   if (seedErr) {
 949:     console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
 950:     // Non-fatal ??the project exists; admin can manually init via init_project_board.

 succeeded in 460ms:
   1: import { getTranslations } from "next-intl/server";
   2: import { Link, redirect } from "@/i18n/routing";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: import { resolveActiveWorkspace } from "@/lib/workspace/active";
   5: import { ProjectsHubHero } from "@/components/projects/projects-hub-hero";
   6: import { ProjectsHubWorkflowStrip } from "@/components/projects/projects-hub-workflow-strip";
   7: import { ProjectsHubCtaBanner } from "@/components/projects/projects-hub-cta-banner";
   8: import { ProjectListCard } from "@/components/projects/project-list-card";
   9: import { MeetingRequestCard } from "@/components/meetings/meeting-request-card";
  10: 
  11: type Props = {
  12:   params: Promise<{ locale: string }>;
  13:   searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
  14: };
  15: 
  16: type ProjectRow = {
  17:   id: string;
  18:   title: string;
  19:   status: string;
  20:   project_type: string;
  21:   updated_at: string;
  22:   created_at: string;
  23:   workspace_id: string;
  24:   brand: { id: string; name: string; logo_url: string | null } | null;
  25: };
  26: 
  27: export default async function ProjectsPage({ params, searchParams }: Props) {
  28:   const { locale } = await params;
  29:   const sp = await searchParams;
  30: 
  31:   const t = await getTranslations("projects");
  32: 
  33:   // Phase 2.8.1 G_B1-I (F-PUX-007): Contest tab removed from the projects
  34:   // hub. Workshop and Contest are separate products (DECISIONS_CACHE
  35:   // Q-085); contest management lives in admin/challenges until Phase 3.0+.
  36:   // Legacy ?tab=contest bookmarks now resolve to the direct-commission
  37:   // list rather than 404.
  38: 
  39:   const supabase = await createSupabaseServer();
  40: 
  41:   // Wave C.5d sub_03e_1 ??Codex K-05 LOOP 1 MED-C (Finding 1): the
  42:   // projects hub query previously had no workspace_id filter and relied
  43:   // entirely on RLS, which lets a multi-workspace user see projects from
  44:   // every membership while the switcher claims one workspace is active.
  45:   // Resolve the active workspace up front, then pass it through both the
  46:   // hub list query and the MeetingRequestCard card. The same id replaces
  47:   // the duplicate primaryWorkspaceId fetch sub_03c added.
  48:   const {
  49:     data: { user },
  50:   } = await supabase.auth.getUser();
  51:   if (!user) {
  52:     redirect({ href: "/signin", locale });
  53:     return null;
  54:   }
  55:   const active = await resolveActiveWorkspace(user.id);
  56:   if (!active) {
  57:     redirect({ href: "/onboarding", locale });
  58:     return null;
  59:   }
  60:   const activeWorkspaceId = active.id;
  61: 
  62:   let query = supabase
  63:     .from("projects")
  64:     .select(
  65:       `
  66:       id,
  67:       title,
  68:       status,
  69:       project_type,
  70:       updated_at,
  71:       created_at,
  72:       workspace_id,
  73:       brand:brands(id, name, logo_url)
  74:     `
  75:     )
  76:     .eq("workspace_id", activeWorkspaceId)
  77:     .eq("project_type", "direct_commission")
  78:     .order("updated_at", { ascending: false });
  79: 
  80:   if (sp.status) query = query.eq("status", sp.status);
  81:   if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);
  82: 
  83:   const { data, error } = await query;
  84:   if (error) {
  85:     console.error("[ProjectsPage] Supabase error:", error);
  86:   }
  87: 
  88:   const projects = (data ?? []) as ProjectRow[];
  89: 
  90:   const primaryWorkspaceId: string | null = activeWorkspaceId;
  91: 
  92:   // Resolve brand name for active brand_id filter chip
  93:   const activeBrand =
  94:     sp.brand_id && projects.length > 0
  95:       ? (projects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
  96:       : null;
  97: 
  98:   // Build URL helper for filter removal
  99:   const removeFilter = (key: "status" | "brand_id") => {
 100:     const params = new URLSearchParams();
 101:     if (key !== "status" && sp.status) params.set("status", sp.status);
 102:     if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
 103:     const qs = params.toString();
 104:     return `/app/projects${qs ? `?${qs}` : ""}`;
 105:   };
 106: 
 107:   return (
 108:     <div className="px-10 py-10 max-w-5xl">
 109:       {/* Header ??Phase 2.9 hotfix-2 Task 1: SUIT bold, larger size,
 110:           tighter tracking. Reads as a real section title rather than a
 111:           tab label. CTA pairing with "?袁⑥쨮??븍뱜 ??롅??띾┛" preserved. */}
 112:       <div className="flex items-center justify-between mb-6">
 113:         <h1 className="font-suit text-3xl md:text-4xl font-bold tracking-tight text-foreground">
 114:           {t("list_title")}
 115:         </h1>
 116:         <Link
 117:           href="/app/projects/new"
 118:           className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
 119:         >
 120:           {t("new")}
 121:         </Link>
 122:       </div>
 123: 
 124:       {/* Phase 2.8.1 G_B1-I: tab nav collapsed to a single (default) view ??          Contest is no longer surfaced from the projects hub. The
 125:           contest_tab i18n key is preserved for the Phase 3.0+
 126:           re-introduction (per DECISIONS_CACHE Q-086). */}
 127: 
 128:       {/* Active filter chips */}
 129:       {(sp.status || (sp.brand_id && activeBrand)) && (
 130:         <div className="flex flex-wrap gap-2 mb-4">
 131:           {sp.status && (
 132:             <Link
 133:               href={removeFilter("status")}
 134:               className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
 135:             >
 136:               {t(`status_${sp.status}` as Parameters<typeof t>[0])}
 137:               <span aria-hidden>??/span>
 138:             </Link>
 139:           )}
 140:           {sp.brand_id && activeBrand && (
 141:             <Link
 142:               href={removeFilter("brand_id")}
 143:               className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
 144:             >
 145:               {activeBrand.name}
 146:               <span aria-hidden>??/span>
 147:             </Link>
 148:           )}
 149:         </div>
 150:       )}
 151: 
 152:       {/* Phase 2.8.2 G_B2_A ??empty-state hero replaces the dashed-border
 153:           placeholder. Hero shows 3 value props + primary CTA + 4-step
 154:           workflow flow. The legacy empty_direct / empty_direct_sub keys
 155:           are preserved for the dashboard's compact empty state and any
 156:           future re-introduction; key names are non-negotiable per the
 157:           phase kickoff 吏?. */}
 158:       {projects.length === 0 && <ProjectsHubHero locale={locale} />}
 159: 
 160:       {/* Phase 2.8.6 ??meeting request card is permanent (yagi: "筌?          ?袁⑥쨮??븍뱜 筌욊쑵六???꾩뜎?癒?즲 ??λ툡??됱몵筌??ル뿭???). Renders below the
 161:           hero on empty state and below the grid header on populated
 162:           state. The card disables itself if the user has no workspace
 163:           yet (edge case during onboarding). */}
 164:       <MeetingRequestCard workspaceId={primaryWorkspaceId} />
 165: 
 166:       {/* Direct tab ??project grid (Wave C.5a sub_06: vertical card v1.0).
 167:           Title top-left + status pill top-right + date bottom-right.
 168:           Sage accent gated to in_review only. Brand chip moved out of
 169:           this surface ??Phase 4 has no real brand-mixed list view yet,
 170:           and the v1.0 grammar wants the title to carry the card. */}
 171:       {projects.length > 0 && (
 172:         <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
 173:           {projects.map((project) => (
 174:             <ProjectListCard
 175:               key={project.id}
 176:               href={`/app/projects/${project.id}`}
 177:               title={project.title}
 178:               status={project.status}
 179:               statusLabel={t(`status_${project.status}` as Parameters<typeof t>[0])}
 180:               dateLabel={new Intl.DateTimeFormat(locale, {
 181:                 month: "short",
 182:                 day: "numeric",
 183:               }).format(new Date(project.updated_at))}
 184:             />
 185:           ))}
 186:         </div>
 187:       )}
 188: 
 189:       {/* Phase 2.9 G_B9_E + G_B9_F ??workflow strip + bottom CTA banner.
 190:           Both render unconditionally so the hub feels editorial even

 succeeded in 494ms:
   1: import { getTranslations } from "next-intl/server";
   2: import { redirect } from "@/i18n/routing";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: import { resolveActiveWorkspace } from "@/lib/workspace/active";
   5: import { NewProjectWizard } from "./new-project-wizard";
   6: 
   7: type Props = {
   8:   params: Promise<{ locale: string }>;
   9: };
  10: 
  11: export default async function NewProjectPage({ params }: Props) {
  12:   const { locale } = await params;
  13: 
  14:   const t = await getTranslations({ locale, namespace: "projects" });
  15: 
  16:   const supabase = await createSupabaseServer();
  17: 
  18:   // Auth guard ??layout handles it but be explicit
  19:   const {
  20:     data: { user },
  21:   } = await supabase.auth.getUser();
  22:   if (!user) {
  23:     redirect({ href: "/signin", locale });
  24:     return null;
  25:   }
  26: 
  27:   // Wave C.5d sub_03b ??replace first-membership fallback with the
  28:   // cookie-based active workspace resolver so brand list + downstream
  29:   // wizard payload reflect the workspace the user actually selected in
  30:   // the switcher (Codex K-05 final review LOOP 1 MED-C).
  31:   const active = await resolveActiveWorkspace(user.id);
  32:   const workspaceId = active?.id ?? null;
  33: 
  34:   // Fetch brands for the workspace (empty list is fine ??wizard shows "None" option)
  35:   const brands: { id: string; name: string }[] = [];
  36:   if (workspaceId) {
  37:     const { data: brandsData } = await supabase
  38:       .from("brands")
  39:       .select("id, name")
  40:       .eq("workspace_id", workspaceId)
  41:       .order("name", { ascending: true });
  42:     brands.push(...(brandsData ?? []));
  43:   }
  44: 
  45:   return (
  46:     <div className="min-h-dvh bg-background">
  47:       {/* Page header */}
  48:       <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
  49:         <h1 className="font-display text-3xl tracking-tight mb-1">
  50:           {t("new")}
  51:         </h1>
  52:       </div>
  53: 
  54:       <NewProjectWizard brands={brands} activeWorkspaceId={workspaceId} />
  55:     </div>
  56:   );
  57: }

 succeeded in 502ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 3.0 task_03 ??New Project Wizard (3-step rewrite)
   5: //
   6: // Steps:
   7: //   1. ?袁⑥쨮??븍뱜 ?遺용튋 (Project Summary) ??name + description + references
   8: //   2. 鈺곌퀗援?(Conditions)               ??deliverable_types + budget_band + delivery_date
   9: //   3. 筌ㅼ뮇伊??類ㅼ뵥 (Final review)         ??summary card, re-editable refs, submit
  10: //
  11: // Design rules applied:
  12: //   - font-suit for step titles (L-010, PRINCIPLES 吏?.1)
  13: //   - Achromatic only (L-011, PRINCIPLES 吏?.2)
  14: //   - No border-b between header + form (L-012, ANTI_PATTERNS 吏?0.1)
  15: //   - Soft layered shadow on cards (L-013, PRINCIPLES 吏?.3)
  16: //   - No <em>/<i> (L-014)
  17: //
  18: // oEmbed: paste a YouTube/Vimeo URL ??fetchVideoMetadataAction ??thumbnail card
  19: // File uploads: R2 presigned PUT via existing uploadAsset pattern (image + PDF)
  20: // Autosave: debounced 500ms, reuses ensureDraftProject find-or-create pattern
  21: // Submit placeholder: TODO(task_04) comment ??submitProjectAction not wired here
  22: // =============================================================================
  23: 
  24: import {
  25:   useState,
  26:   useEffect,
  27:   useRef,
  28:   useCallback,
  29:   useTransition,
  30: } from "react";
  31: import { useForm, Controller } from "react-hook-form";
  32: import { zodResolver } from "@hookform/resolvers/zod";
  33: import { z } from "zod";
  34: import { useTranslations } from "next-intl";
  35: import { useRouter } from "@/i18n/routing";
  36: import { toast } from "sonner";
  37: import { Loader2 } from "lucide-react";
  38: import {
  39:   ensureDraftProject,
  40:   submitProjectAction,
  41:   type WizardDraftFields,
  42: } from "./actions";
  43: import { Button } from "@/components/ui/button";
  44: import { Input } from "@/components/ui/input";
  45: import { Label } from "@/components/ui/label";
  46: import { Textarea } from "@/components/ui/textarea";
  47: import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
  48: import {
  49:   Tooltip,
  50:   TooltipContent,
  51:   TooltipProvider,
  52:   TooltipTrigger,
  53: } from "@/components/ui/tooltip";
  54: import { Info } from "lucide-react";
  55: import { cn } from "@/lib/utils";
  56: import { ProjectBoard } from "@/components/project-board/project-board";
  57: import { AttachmentsSection } from "@/components/project-board/attachments-section";
  58: import { SummaryCard } from "@/components/projects/wizard/summary-card";
  59: import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";
  60: import { getBoardAssetPutUrlAction, fetchVideoMetadataAction } from "./actions";
  61: 
  62: // ---------------------------------------------------------------------------
  63: // Types
  64: // ---------------------------------------------------------------------------
  65: 
  66: // WizardReference type is defined and exported from reference-board.tsx (Phase 3.0 hotfix-1)
  67: 
  68: type BudgetBand =
  69:   | "under_1m"
  70:   | "1m_to_5m"
  71:   | "5m_to_10m"
  72:   | "negotiable";
  73: 
  74: const BUDGET_BANDS: BudgetBand[] = [
  75:   "under_1m",
  76:   "1m_to_5m",
  77:   "5m_to_10m",
  78:   "negotiable",
  79: ];
  80: 
  81: const DELIVERABLE_OPTIONS = [
  82:   "video",
  83:   "image",
  84:   "motion_graphics",
  85:   "illustration",
  86:   "vfx",
  87:   "branding",
  88:   "other",
  89: ] as const;
  90: 
  91: // ---------------------------------------------------------------------------
  92: // Form schema (step 1 + step 2 fields)
  93: // ---------------------------------------------------------------------------
  94: 
  95: const wizardSchema = z.object({
  96:   name: z.string().trim().min(1).max(80),
  97:   // hotfix-2: description max reduced to 500 (Step 1 is "??餓?); synced with
  98:   // server SubmitInputSchema (L-026 ??client + server schemas must stay in sync)
  99:   description: z.string().trim().min(1).max(500),
 100:   deliverable_types: z.array(z.string().trim().min(1)).min(1),
 101:   budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
 102:   delivery_date: z
 103:     .string()
 104:     .regex(/^\d{4}-\d{2}-\d{2}$/)
 105:     .optional()
 106:     .or(z.literal("")),
 107:   // Phase 3.1 hotfix-3 addendum (yagi smoke v1 FAIL-5 ask): optional 沃섎챸????彛???깆쁽.
 108:   // Native <input type="datetime-local"> emits "YYYY-MM-DDTHH:MM" (no seconds, no TZ).
 109:   // Server zod accepts ISO-with-Z; client emits local datetime; submit handler converts
 110:   // local?臾쾄O via new Date(...).toISOString(). Empty ??null.
 111:   meeting_preferred_at: z
 112:     .string()
 113:     .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/)
 114:     .optional()
 115:     .or(z.literal("")),
 116:   // Phase 4.x task_03 ??Digital Twin intent.
 117:   // Locked option A (3-radio per _decisions_locked.md 吏?). Maps 1:1 to the
 118:   // projects.twin_intent CHECK constraint added by task_01 migration.
 119:   // No .default() here so the Zod input and output types stay symmetric;
 120:   // RHF's Resolver requires both to match. defaultValues sets 'undecided'.
 121:   twin_intent: z.enum(["undecided", "specific_in_mind", "no_twin"]),
 122: });
 123: 
 124: type WizardFormData = z.infer<typeof wizardSchema>;
 125: 
 126: type Step = 1 | 2 | 3;
 127: 
 128: // ---------------------------------------------------------------------------
 129: // Props
 130: // ---------------------------------------------------------------------------
 131: 
 132: interface NewProjectWizardProps {
 133:   brands?: { id: string; name: string }[];
 134:   // Wave C.5d sub_03b ??active workspace resolved server-side in
 135:   // new/page.tsx via resolveActiveWorkspace and passed down explicitly,
 136:   // so submitProjectAction Path A trusts a value the user-bound server
 137:   // verified instead of guessing from membership creation order.
 138:   activeWorkspaceId?: string | null;
 139: }
 140: 
 141: // ---------------------------------------------------------------------------
 142: // Eyebrow label component
 143: // ---------------------------------------------------------------------------
 144: 
 145: function Eyebrow({ children }: { children: string }) {
 146:   return (
 147:     <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
 148:       {children}
 149:     </p>
 150:   );
 151: }
 152: 
 153: // ---------------------------------------------------------------------------
 154: // Step indicator
 155: // ---------------------------------------------------------------------------
 156: 
 157: function StepIndicator({ current }: { current: Step }) {
 158:   return (
 159:     <ol className="flex items-center gap-3 mb-10" aria-label="wizard progress">
 160:       {([1, 2, 3] as Step[]).map((s, i) => {
 161:         const isCompleted = s < current;
 162:         const isActive = s === current;
 163:         return (
 164:           <li key={s} className="flex items-center gap-3">
 165:             {i > 0 && (
 166:               <span className="w-8 h-px bg-border" aria-hidden />
 167:             )}
 168:             <span
 169:               className={cn(
 170:                 "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors",
 420:       toast.error("???뵬 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄. ??쇰뻻 ??뺣즲??곻폒?紐꾩뒄.");
 421:       return;
 422:     }
 423:     // Upload to R2
 424:     const putResp = await fetch(result.putUrl, {
 425:       method: "PUT",
 426:       body: file,
 427:       headers: { "Content-Type": file.type },
 428:     });
 429:     if (!putResp.ok) {
 430:       toast.error("???뵬 ??낆쨮??뽯퓠 ??쎈솭??됰뮸??덈뼄. ??쇰뻻 ??뺣즲??곻폒?紐꾩뒄.");
 431:       return;
 432:     }
 433:     // storage_key for wizard PDFs uses the board-assets prefix that
 434:     // getBoardAssetPutUrlAction generated server-side. Extract the path
 435:     // portion of the public URL and strip the leading slash so the key
 436:     // matches the actual R2 object key ??board-assets/<user>/<uuid>.pdf.
 437:     // Wave C.5d sub_03f_1: previously this prepended "project-wizard" to
 438:     // satisfy the add_project_board_pdf RPC validation, which left a key
 439:     // that did not exist in R2 and made submitted PDFs unrecoverable.
 440:     // Companion sub_03f_1 migration adds `board-assets/` to the RPC
 441:     // allowlist so the bare key passes validation.
 442:     let storageKey = result.publicUrl;
 443:     try {
 444:       const urlObj = new URL(result.publicUrl);
 445:       storageKey = urlObj.pathname.replace(/^\//, "");
 446:     } catch {
 447:       // fall back to publicUrl
 448:     }
 449:     const newPdf: PdfAttachment = {
 450:       id: crypto.randomUUID(),
 451:       storage_key: storageKey,
 452:       filename: file.name,
 453:       size_bytes: file.size,
 454:       uploaded_at: new Date().toISOString(),
 455:       uploaded_by: "wizard",
 456:     };
 457:     setAttachedPdfs((prev) => [...prev, newPdf]);
 458:   }
 459: 
 460:   function handlePdfRemoveWizard(id: string): Promise<void> {
 461:     setAttachedPdfs((prev) => prev.filter((p) => p.id !== id));
 462:     return Promise.resolve();
 463:   }
 464: 
 465:   async function handleUrlAddWizard(url: string, note: string | null): Promise<void> {
 466:     let provider: UrlAttachment["provider"] = "generic";
 467:     let title: string | null = null;
 468:     let thumbnail_url: string | null = null;
 469: 
 470:     try {

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\lib\\app\\context.ts' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\layout.tsx' | ForEach-Object { "'$i++; if ($i -le 150) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\dashboard\\page.tsx' | ForEach-Object { "'$i++; if ($i -le 170) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\admin\\projects\\page.tsx' | ForEach-Object { "'$i++; if ($i -le 90) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 431ms:
   1: import { createSupabaseServer } from "@/lib/supabase/server";
   2: import { resolveActiveWorkspace } from "@/lib/workspace/active";
   3: 
   4: // Phase 1.1 workspace permission system ??unchanged literals, renamed type.
   5: // Per ADR-009 (docs/design/DECISIONS.md).
   6: export type WorkspaceRole =
   7:   | "creator"
   8:   | "workspace_admin"
   9:   | "workspace_member"
  10:   | "yagi_admin";
  11: 
  12: // Phase 2.5 challenge persona system ??distinct namespace.
  13: // NEVER compare against a bare "creator" literal without prefixing with
  14: // `profile.role ===` ??see ADR-009 naming rule.
  15: // Phase 2.7 added "client" for the commission-intake persona (ADR-011).
  16: // Phase 4.x Wave C.5b amend_02 added "artist" ??DECISIONS Q-094 / 吏? of
  17: // PRODUCT-MASTER persona model. The Artist intake surface itself is a
  18: // Phase 5 entry deliverable (FU-C5b-01); the type extension here covers
  19: // the demo account row created in Wave C.5b sub_13/amend_02.
  20: export type ProfileRole = "creator" | "studio" | "observer" | "client" | "artist";
  21: 
  22: export type AppContext = {
  23:   userId: string;
  24:   profile: {
  25:     id: string;
  26:     /**
  27:      * Internal-only DB identifier (Phase 4.x Wave C.5b sub_08).
  28:      *
  29:      * `profiles.handle` is auto-generated server-side as `c_<8 hex chars>`
  30:      * and exposed only to internal code paths (auth callback resolver,
  31:      * RLS policies that key off the unique-handle column, future admin
  32:      * tools). It MUST NOT appear in any user-facing surface ??sidebar,
  33:      * settings, chat, profile pages, exports, or emails. If you find
  34:      * yourself reaching for `profile.handle` in a JSX/email template,
  35:      * fall back to `display_name` then `id.slice(0, 8)` instead.
  36:      */
  37:     handle: string;
  38:     display_name: string;
  39:     email: string | null;
  40:     avatar_url: string | null;
  41:     locale: "ko" | "en";
  42:     role: ProfileRole | null;
  43:   };
  44:   workspaceRoles: WorkspaceRole[];
  45:   workspaces: { id: string; name: string; slug: string }[];
  46:   currentWorkspaceId: string | null;
  47: };
  48: 
  49: export async function fetchAppContext(): Promise<AppContext | null> {
  50:   const supabase = await createSupabaseServer();
  51:   const {
  52:     data: { user },
  53:   } = await supabase.auth.getUser();
  54:   if (!user) return null;
  55: 
  56:   const { data: profile } = await supabase
  57:     .from("profiles")
  58:     .select("id, handle, display_name, avatar_url, locale, role")
  59:     .eq("id", user.id)
  60:     .maybeSingle();
  61: 
  62:   if (!profile) return null;
  63: 
  64:   const { data: rolesRows } = await supabase
  65:     .from("user_roles")
  66:     .select("role")
  67:     .eq("user_id", user.id);
  68: 
  69:   const workspaceRoles = (rolesRows ?? []).map(
  70:     (r) => r.role as WorkspaceRole
  71:   );
  72: 
  73:   const { data: memberRows } = await supabase
  74:     .from("workspace_members")
  75:     .select("workspace_id, workspaces(id, name, slug)")
  76:     .eq("user_id", user.id);
  77: 
  78:   const workspaces =
  79:     (memberRows ?? [])
  80:       .map((row) => row.workspaces)
  81:       .filter((ws): ws is { id: string; name: string; slug: string } => !!ws);
  82: 
  83:   // Wave C.5d sub_03e_2 ??Codex K-05 sub_03 LOOP 1 MED-C Finding 2.
  84:   // currentWorkspaceId previously took workspaces[0] (oldest membership),
  85:   // which silently bypassed the workspace switcher cookie for every
  86:   // ctx.currentWorkspaceId consumer (settings/page.tsx, etc.). Source it
  87:   // from resolveActiveWorkspace so the cookie's selection is honoured;
  88:   // resolver still falls back to the first membership when the cookie is
  89:   // absent or stale, so behaviour for fresh signups is unchanged.
  90:   const active = await resolveActiveWorkspace(user.id);
  91: 
  92:   return {
  93:     userId: user.id,
  94:     profile: {
  95:       id: profile.id,
  96:       handle: profile.handle,
  97:       display_name: profile.display_name,
  98:       email: user.email ?? null,
  99:       avatar_url: profile.avatar_url,
 100:       locale: profile.locale as "ko" | "en",
 101:       role: (profile.role as ProfileRole | null) ?? null,
 102:     },
 103:     workspaceRoles,
 104:     workspaces,
 105:     currentWorkspaceId: active?.id ?? null,
 106:   };
 107: }

 succeeded in 462ms:
   1: import { redirect } from "@/i18n/routing";
   2: import { fetchAppContext } from "@/lib/app/context";
   3: import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
   4: import {
   5:   resolveActiveWorkspace,
   6:   listOwnWorkspaces,
   7: } from "@/lib/workspace/active";
   8: import { NotificationBell } from "@/components/app/notification-bell";
   9: import { PageHelpLink } from "@/components/app/page-help-link";
  10: import { LanguageSwitcher } from "@/components/app/language-switcher";
  11: import { createSupabaseServer } from "@/lib/supabase/server";
  12: import { getUserScopes } from "@/lib/app/scopes";
  13: import { UserScopesProvider } from "@/lib/app/use-user-scopes";
  14: import { SupportWidget } from "@/components/support/support-widget";
  15: 
  16: export default async function AppLayout({
  17:   children,
  18:   params,
  19: }: {
  20:   children: React.ReactNode;
  21:   params: Promise<{ locale: string }>;
  22: }) {
  23:   const { locale } = await params;
  24: 
  25:   const supabase = await createSupabaseServer();
  26:   const {
  27:     data: { user },
  28:   } = await supabase.auth.getUser();
  29:   if (!user) redirect({ href: "/signin", locale });
  30: 
  31:   const ctx = await fetchAppContext();
  32:   if (!ctx) {
  33:     redirect({ href: "/onboarding", locale });
  34:     return null;
  35:   }
  36: 
  37:   const hasPrivilegedGlobalRole =
  38:     ctx.workspaceRoles.includes("yagi_admin") ||
  39:     ctx.workspaceRoles.includes("creator");
  40:   // Phase 2.7: client persona doesn't need a workspace; their primary
  41:   // surface is /app/commission.
  42:   const isClient = ctx.profile.role === "client";
  43:   if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
  44:     redirect({ href: "/onboarding/workspace", locale });
  45:     return null;
  46:   }
  47: 
  48:   // Seed the bell with the current unread count. Realtime takes over from here.
  49:   const { count: initialUnreadCount } = await supabase
  50:     .from("notification_events")
  51:     .select("id", { count: "exact", head: true })
  52:     .eq("user_id", ctx.userId)
  53:     .is("in_app_seen_at", null);
  54: 
  55:   const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";
  56: 
  57:   const scopes = getUserScopes(ctx);
  58: 
  59:   // Phase 4.x task_06 ??resolve active workspace + full membership list
  60:   // for the sidebar workspace switcher. resolveActiveWorkspace reads the
  61:   // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
  62:   // returns every workspace the user belongs to (with workspaces.kind, which
  63:   // null-safe-defaults to 'brand' until task_01 migration applies at Wave D).
  64:   const [activeWorkspace, allWorkspaces] = await Promise.all([
  65:     resolveActiveWorkspace(ctx.userId),
  66:     listOwnWorkspaces(ctx.userId),
  67:   ]);
  68: 
  69:   return (
  70:     <UserScopesProvider value={scopes}>
  71:       <div className="min-h-dvh flex">
  72:         <Sidebar
  73:           context={ctx}
  74:           activeWorkspace={activeWorkspace}
  75:           workspaces={allWorkspaces}
  76:         />
  77:         <div className="flex-1 min-w-0 flex flex-col">
  78:           <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
  79:             <MobileSidebarSheet
  80:               context={ctx}
  81:               activeWorkspace={activeWorkspace}
  82:               workspaces={allWorkspaces}
  83:             />
  84:             <div className="flex-1" />
  85:             <PageHelpLink />
  86:             <LanguageSwitcher />
  87:             <NotificationBell
  88:               initialUnreadCount={initialUnreadCount ?? 0}
  89:               locale={bellLocale}
  90:             />
  91:           </header>
  92:           <main className="flex-1 min-w-0">
  93:             <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
  94:               {children}
  95:             </div>
  96:           </main>
  97:         </div>
  98:         {/* Phase 2.8.6 ??workspace-scoped support chat. Hidden when
  99:             the user has no workspace (mid-onboarding edge case).
 100:             Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
 101:             backed active workspace (resolved above for the sidebar)
 102:             instead of ctx.workspaces[0], so admins with multiple
 103:             memberships chat against the workspace they actually selected. */}
 104:         <SupportWidget
 105:           workspaceId={activeWorkspace?.id ?? null}
 106:           currentUserId={ctx.userId}
 107:           currentUserName={ctx.profile.display_name ?? ""}
 108:         />
 109:       </div>
 110:     </UserScopesProvider>
 111:   );
 112: }

 succeeded in 462ms:
   1: // Phase 4.x task_05 ??Brand workspace dashboard (/app/dashboard).
   2: //
   3: // Renders 3 count cards (total / in-progress / delivered) + 5 most
   4: // recent RFPs scoped to the active workspace via workspace_members
   5: // RLS. Server-only data fetch.
   6: //
   7: // Authorization: any workspace member can view their own workspace's
   8: // dashboard. Cross-workspace SELECT is blocked by projects RLS (the
   9: // SELECT policy already enforces workspace_member). The workspace_id
  10: // comes from the user's first workspace membership (Phase 4 has
  11: // single active workspace via cookie in task_06; for now Phase 4
  12: // uses first-membership as the implicit active).
  13: //
  14: // Design v1.0: 1280 max-width, achromatic + sage single accent (only
  15: // on in-flight status pills inside RfpRowCard), Pretendard, radius 24
  16: // cards, zero shadow.
  17: //
  18: // Empty state surfaces a calm "no RFPs yet" + a CTA to start a new
  19: // project. Critical: empty state must not leak counts or names from
  20: // other workspaces.
  21: 
  22: import Link from "next/link";
  23: import { redirect } from "next/navigation";
  24: import { notFound } from "next/navigation";
  25: import { getTranslations } from "next-intl/server";
  26: import { createSupabaseServer } from "@/lib/supabase/server";
  27: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  28: import { CountCards } from "@/components/dashboard/count-cards";
  29: import { RfpRowCard } from "@/components/dashboard/rfp-row-card";
  30: 
  31: type Props = {
  32:   params: Promise<{ locale: string }>;
  33: };
  34: 
  35: type RecentProjectRow = {
  36:   id: string;
  37:   title: string;
  38:   brief: string | null;
  39:   status: string;
  40:   budget_band: string | null;
  41:   twin_intent: string | null;
  42:   created_at: string;
  43: };
  44: 
  45: const IN_PROGRESS_STATUSES = [
  46:   "in_review",
  47:   "submitted",
  48:   "in_progress",
  49:   "in_revision",
  50: ];
  51: 
  52: function narrowTwinIntentLabel(
  53:   value: string | null,
  54:   map: Record<string, string>,
  55: ): string | null {
  56:   if (!value) return null;
  57:   return map[value] ?? null;
  58: }
  59: 
  60: export default async function DashboardPage({ params }: Props) {
  61:   const { locale } = await params;
  62:   const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
  63:   const t = await getTranslations({ locale, namespace: "dashboard_v4" });
  64: 
  65:   const supabase = await createSupabaseServer();
  66:   const {
  67:     data: { user },
  68:   } = await supabase.auth.getUser();
  69:   if (!user) redirect(`/${locale}/signin`);
  70: 
  71:   // Wave C.5d sub_03c ??task_06 cookie resolver is now wired here so the
  72:   // dashboard reflects the workspace the user actually selected in the
  73:   // switcher (Codex K-05 final review LOOP 1 MED-C). resolveActiveWorkspace
  74:   // validates the cookie's uuid against workspace_members and falls back
  75:   // to the first membership only when the cookie is absent or stale.
  76:   const active = await resolveActiveWorkspace(user.id);
  77:   if (!active) {
  78:     redirect(`/${locale}/onboarding`);
  79:   }
  80:   const workspaceId = active!.id;
  81: 
  82:   // Phase 3.0/4.x columns not in generated types -> any-cast (consistent with detail page).
  83:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not in generated types
  84:   const sb = supabase as any;
  85: 
  86:   // Counts: total, in-progress, delivered
  87:   const [{ count: totalCount }, { count: inProgressCount }, { count: deliveredCount }] =
  88:     await Promise.all([
  89:       sb
  90:         .from("projects")
  91:         .select("id", { count: "exact", head: true })
  92:         .eq("workspace_id", workspaceId)
  93:         .neq("status", "archived"),
  94:       sb
  95:         .from("projects")
  96:         .select("id", { count: "exact", head: true })
  97:         .eq("workspace_id", workspaceId)
  98:         .in("status", IN_PROGRESS_STATUSES),
  99:       sb
 100:         .from("projects")
 101:         .select("id", { count: "exact", head: true })
 102:         .eq("workspace_id", workspaceId)
 103:         .eq("status", "delivered"),
 104:     ]);
 105: 
 106:   const total = totalCount ?? 0;
 107:   const inProgress = inProgressCount ?? 0;
 108:   const delivered = deliveredCount ?? 0;
 109: 
 110:   // Recent 5 RFPs (created_at DESC).
 111:   const { data: recentRaw } = (await sb
 112:     .from("projects")
 113:     .select(
 114:       "id, title, brief, status, budget_band, twin_intent, created_at"
 115:     )
 116:     .eq("workspace_id", workspaceId)
 117:     .neq("status", "archived")
 118:     .order("created_at", { ascending: false })
 119:     .limit(5)) as { data: RecentProjectRow[] | null };
 120: 
 121:   const recent: RecentProjectRow[] = recentRaw ?? [];
 122:   if (!recent && totalCount === null) notFound();
 123: 
 124:   const fmt = new Intl.DateTimeFormat(localeNarrow === "ko" ? "ko-KR" : "en-US", {
 125:     year: "numeric",
 126:     month: localeNarrow === "ko" ? "long" : "short",
 127:     day: "numeric",
 128:   });
 129: 
 130:   const statusMap: Record<string, string> = {
 131:     draft: t("status.draft"),
 132:     submitted: t("status.submitted"),
 133:     in_review: t("status.in_review"),
 134:     in_progress: t("status.in_progress"),
 135:     in_revision: t("status.in_revision"),
 136:     delivered: t("status.delivered"),
 137:     approved: t("status.approved"),
 138:     cancelled: t("status.cancelled"),
 139:     archived: t("status.archived"),
 140:   };
 141:   const budgetMap: Record<string, string> = {
 142:     under_1m: t("budget.under_1m"),
 143:     "1m_to_5m": t("budget.1m_to_5m"),
 144:     "5m_to_10m": t("budget.5m_to_10m"),
 145:     negotiable: t("budget.negotiable"),
 146:   };
 147:   const twinIntentMap: Record<string, string> = {
 148:     undecided: t("twin_intent.undecided"),
 149:     specific_in_mind: t("twin_intent.specific_in_mind"),
 150:     no_twin: t("twin_intent.no_twin"),
 151:   };
 152:   const separator = "夷?;
 153: 
 154:   return (
 155:     <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
 156:       {/* L1 Page header */}
 157:       <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
 158:         <div>
 159:           <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground keep-all mb-2">
 160:             {t("eyebrow")}
 161:           </p>
 162:           <h1 className="text-3xl md:text-4xl font-semibold text-foreground keep-all" style={{ letterSpacing: "-0.01em" }}>
 163:             {t("title")}
 164:           </h1>
 165:         </div>
 166:         <Link
 167:           href={`/${locale}/app/projects/new`}
 168:           className="inline-flex items-center rounded-full border border-border/40 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.04] transition-colors"
 169:         >
 170:           {t("cta_new")}

 succeeded in 470ms:
   1: import { getTranslations } from 'next-intl/server';
   2: import { createSupabaseServer } from '@/lib/supabase/server';
   3: import { ProjectsQueue } from '@/components/admin/projects-queue';
   4: 
   5: type Props = {
   6:   params: Promise<{ locale: string }>;
   7: };
   8: 
   9: export default async function AdminProjectsPage({ params }: Props) {
  10:   await params; // params required by Next.js route convention
  11:   const tAdmin = await getTranslations('admin');
  12: 
  13:   const supabase = await createSupabaseServer();
  14: 
  15:   // Fetch all projects with their related data.
  16:   // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
  17:   // for the asset-count indicator. Field is JSONB array; length used as count.
  18:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
  19:   const sb = supabase as any;
  20:   const { data: projects, error } = await sb
  21:     .from('projects')
  22:     .select(
  23:       `
  24:       id,
  25:       title,
  26:       status,
  27:       submitted_at,
  28:       created_at,
  29:       created_by,
  30:       client:profiles!projects_created_by_fkey(id, name),
  31:       workspace:workspaces(id, name),
  32:       ref_count:project_references(count),
  33:       boards:project_boards(asset_index)
  34:     `
  35:     )
  36:     .in('status', ['in_review', 'in_progress', 'in_revision', 'delivered', 'approved'])
  37:     .order('submitted_at', { ascending: false, nullsFirst: false });
  38: 
  39:   if (error) {
  40:     console.error('[AdminProjectsPage] Supabase error:', error);
  41:   }
  42: 
  43:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Database query result typing
  44:   const projectRows = (projects ?? []).map((p: any) => {
  45:     // Resolve asset count from project_boards.asset_index (preferred);
  46:     // fall back to legacy project_references count if board is empty/missing.
  47:     const boardRow = Array.isArray(p.boards) ? p.boards[0] : p.boards;
  48:     const boardAssetCount =
  49:       boardRow && Array.isArray(boardRow.asset_index)
  50:         ? boardRow.asset_index.length
  51:         : 0;
  52:     const legacyRefCount = Array.isArray(p.ref_count) ? p.ref_count.length : 0;
  53:     const ref_count = boardAssetCount > 0 ? boardAssetCount : legacyRefCount;
  54:     return {
  55:       id: p.id,
  56:       title: p.title,
  57:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic status type from database
  58:       status: p.status as any,
  59:       submitted_at: p.submitted_at,
  60:       created_at: p.created_at,
  61:       client: p.client ? { id: p.client.id, name: p.client.name } : null,
  62:       workspace: p.workspace ? { id: p.workspace.id, name: p.workspace.name } : null,
  63:       ref_count,
  64:     };
  65:   });
  66: 
  67:   return (
  68:     <div className="px-10 py-12 max-w-6xl">
  69:       {/* Header with eyebrow */}
  70:       <div className="mb-12">
  71:         <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">
  72:           {tAdmin('label')}
  73:         </p>
  74:         <h1 className="font-suit text-3xl font-bold tracking-tight">
  75:           ?袁⑥쨮??븍뱜 ?온??        </h1>
  76:       </div>
  77: 
  78:       {/* Queue component */}
  79:       <ProjectsQueue projects={projectRows} initialTab="in_review" />
  80:     </div>
  81:   );
  82: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\actions.ts' | ForEach-Object { "'$i++; if ($i -ge 360 -and $i -le 640) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\new-project-wizard.tsx' | ForEach-Object { "'$i++; if ($i -ge 1500 -and $i -le 1635) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"from\\(["'`'"'\\\"]projects["'`'"'\\\"]\\)|from<.*projects|\\.from\\s*\\(\\s*['\\\"]projects\" src" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n --fixed-strings 'from(\"projects\")' src; rg -n --fixed-strings \"from('projects')\" src" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 707ms:
 360:       project_id: project.id,
 361:       updated_by: user.id,
 362:     });
 363:   if (briefErr) {
 364:     console.error(
 365:       "[ensureDraftProject] brief insert failed (rolling back project):",
 366:       briefErr,
 367:     );
 368:     const service = createSupabaseService();
 369:     await service.from("projects").delete().eq("id", project.id);
 370:     return {
 371:       error: "db",
 372:       message: `brief insert failed: ${briefErr.message}`,
 373:     };
 374:   }
 375: 
 376:   const bootstrap = await fetchDraftBootstrap(supabase, project.id);
 377:   if (!bootstrap) {
 378:     return { error: "db", message: "bootstrap fetch after insert failed" };
 379:   }
 380: 
 381:   revalidatePath("/[locale]/app/projects", "page");
 382:   return { ok: true, data: bootstrap };
 383: }
 384: 
 385: export async function submitDraftProject(
 386:   input: unknown,
 387: ): Promise<SubmitDraftResult> {
 388:   const parsed = submitDraftInput.safeParse(input);
 389:   if (!parsed.success) {
 390:     return { error: "validation", issues: parsed.error.issues };
 391:   }
 392:   const { projectId, fields, intent } = parsed.data;
 393: 
 394:   const supabase = await createSupabaseServer();
 395:   const {
 396:     data: { user },
 397:   } = await supabase.auth.getUser();
 398:   if (!user) return { error: "unauthenticated" };
 399: 
 400:   // Confirm draft exists and is owned by caller. RLS already filters but
 401:   // an explicit check lets us return `forbidden` distinct from `not_found`.
 402:   const { data: target } = await supabase
 403:     .from("projects")
 404:     .select("id, status, created_by")
 405:     .eq("id", projectId)
 406:     .maybeSingle();
 407:   if (!target) return { error: "not_found" };
 408:   if (target.created_by !== user.id) return { error: "forbidden" };
 409: 
 410:   // Codex K-05 finding 2 (HIGH-B) ??restrict to status='draft'. Without
 411:   // this guard the wizard's submit path becomes a backdoor that demotes
 412:   // any project owned by the caller (submitted / in_production /
 413:   // delivered etc.) back to 'draft' or stomps on its fields, bypassing
 414:   // the transition matrix in projects/[id]/actions.ts.
 415:   if (target.status !== "draft") return { error: "forbidden" };
 416: 
 417:   const status = intent === "submit" ? "submitted" : "draft";
 418: 
 419:   const { data: updated, error } = await supabase
 420:     .from("projects")
 421:     .update({
 422:       title: fields.title,
 423:       brief: fields.description ?? null,
 424:       brand_id: fields.brand_id ?? null,
 425:       deliverable_types: fields.deliverable_types,
 426:       estimated_budget_range: fields.estimated_budget_range ?? null,
 427:       target_delivery_at: fields.target_delivery_at ?? null,
 428:       status,
 429:     })
 430:     .eq("id", projectId)
 431:     .eq("created_by", user.id)
 432:     .eq("status", "draft")
 433:     .select("id, status")
 434:     .single();
 435: 
 436:   if (error || !updated) {
 437:     console.error("[submitDraftProject] update error:", error);
 438:     return { error: "db", message: error?.message ?? "update failed" };
 439:   }
 440: 
 441:   revalidatePath("/[locale]/app/projects", "page");
 442:   revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
 443:   return {
 444:     ok: true,
 445:     id: updated.id,
 446:     status: updated.status as "draft" | "submitted",
 447:   };
 448: }
 449: 
 450: // =============================================================================
 451: // Phase 3.0 hotfix-2 ??getWizardAssetPutUrlAction
 452: // =============================================================================
 453: // Server action that generates a presigned R2 PUT URL + the public URL for a
 454: // wizard reference asset. Moved server-side because createBriefAssetPutUrl
 455: // uses S3Client with process.env credentials ??it cannot run in the browser.
 456: // Previously reference-board.tsx (a "use client" component) called these
 457: // r2/client functions directly, causing silent failures on every upload attempt.
 458: // Root cause: H2 ??r2/client imports are server-only; client components must
 459: // call server actions instead.
 460: // =============================================================================
 461: 
 462: import {
 463:   createBriefAssetPutUrl,
 464:   briefObjectPublicUrl,
 465: } from "@/lib/r2/client";
 466: 
 467: // Phase 3.1 K-05 LOOP 1 HIGH-A F7 fix:
 468: // The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
 469: // client, which let any authenticated caller overwrite known/guessable R2
 470: // objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
 471: // storage key server-side using a UUID and validates content type against a
 472: // strict allow-list. The legacy action is kept for backward-compat but now
 473: // applies the same allow-list and a more restrictive prefix policy.
 474: 
 475: const ALLOWED_CONTENT_TYPES = new Set([
 476:   "image/jpeg",
 477:   "image/png",
 478:   "image/webp",
 479:   "image/gif",
 480:   "image/svg+xml",
 481:   "image/avif",
 482:   "application/pdf",
 483: ]);
 484: 
 485: const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
 486:   "image/jpeg": "jpg",
 487:   "image/png": "png",
 488:   "image/webp": "webp",
 489:   "image/gif": "gif",
 490:   "image/svg+xml": "svg",
 491:   "image/avif": "avif",
 492:   "application/pdf": "pdf",
 493: };
 494: 
 495: // Phase 3.0/legacy schema ??accepts a client-supplied key but now restricts
 496: // the prefix to a known-safe namespace. Existing callers should migrate to
 497: // getBoardAssetPutUrlAction below.
 498: const wizardAssetPutUrlSchema = z.object({
 499:   storageKey: z
 500:     .string()
 501:     .min(1)
 502:     .max(500)
 503:     // Restrict to known prefixes to prevent overwriting unrelated R2 objects.
 504:     // Must start with a recognized board/wizard asset prefix.
 505:     .refine(
 506:       (k) =>
 507:         k.startsWith("board-assets/") ||
 508:         k.startsWith("wizard-references/") ||
 509:         k.startsWith("project-briefs/"),
 510:       { message: "storageKey prefix not allowed" }
 511:     )
 512:     // No traversal / parent-dir / null bytes
 513:     .refine(
 514:       (k) => !k.includes("..") && !k.includes("\0") && !k.includes("//"),
 515:       { message: "storageKey contains forbidden characters" }
 516:     ),
 517:   contentType: z.string().min(1).max(200),
 518: });
 519: 
 520: export type WizardAssetPutUrlResult =
 521:   | { ok: true; putUrl: string; publicUrl: string }
 522:   | { ok: false; error: string };
 523: 
 524: export async function getWizardAssetPutUrlAction(
 525:   storageKey: unknown,
 526:   contentType: unknown
 527: ): Promise<WizardAssetPutUrlResult> {
 528:   const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
 529:   if (!parsed.success) {
 530:     return { ok: false, error: "invalid_input" };
 531:   }
 532: 
 533:   // Strict content-type allow-list (HIGH-A F7)
 534:   if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
 535:     return { ok: false, error: "content_type_not_allowed" };
 536:   }
 537: 
 538:   const supabase = await createSupabaseServer();
 539:   const {
 540:     data: { user },
 541:   } = await supabase.auth.getUser();
 542:   if (!user) return { ok: false, error: "unauthenticated" };
 543: 
 544:   // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
 545:   // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
 546:   // project-briefs/) was insufficient because keys within those namespaces
 547:   // could overwrite OTHER users' assets. Now require keys to start with
 548:   // <prefix>/<user.id>/ so a caller can only write under their own subspace.
 549:   const allowedPrefixes = [
 550:     `board-assets/${user.id}/`,
 551:     `wizard-references/${user.id}/`,
 552:     `project-briefs/${user.id}/`,
 553:   ];
 554:   if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
 555:     return { ok: false, error: "storage_key_not_owned" };
 556:   }
 557: 
 558:   try {
 559:     const putUrl = await createBriefAssetPutUrl(
 560:       parsed.data.storageKey,
 561:       parsed.data.contentType,
 562:       600
 563:     );
 564:     // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
 565:     // targets BRIEF_BUCKET (where the PUT lands), not BUCKET (the challenges
 566:     // submissions bucket).
 567:     const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
 568:     return { ok: true, putUrl, publicUrl: pubUrl };
 569:   } catch (err) {
 570:     console.error("[getWizardAssetPutUrlAction] presign failed:", err);
 571:     return { ok: false, error: "presign_failed" };
 572:   }
 573: }
 574: 
 575: // Phase 3.1 ??server-generated key + strict content-type validation.
 576: // Use this for board asset uploads going forward. Legacy
 577: // getWizardAssetPutUrlAction is preserved for back-compat with already-
 578: // shipped client code paths.
 579: const boardAssetPutUrlSchema = z.object({
 580:   contentType: z.string().min(1).max(200),
 581: });
 582: 
 583: export async function getBoardAssetPutUrlAction(
 584:   contentType: unknown
 585: ): Promise<WizardAssetPutUrlResult> {
 586:   const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
 587:   if (!parsed.success) return { ok: false, error: "invalid_input" };
 588: 
 589:   if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
 590:     return { ok: false, error: "content_type_not_allowed" };
 591:   }
 592: 
 593:   const supabase = await createSupabaseServer();
 594:   const {
 595:     data: { user },
 596:   } = await supabase.auth.getUser();
 597:   if (!user) return { ok: false, error: "unauthenticated" };
 598: 
 599:   // Server-generated key: UUID + safe extension. NO client filename trust.
 600:   const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
 601:   const uuid = crypto.randomUUID();
 602:   const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
 603: 
 604:   try {
 605:     const putUrl = await createBriefAssetPutUrl(
 606:       storageKey,
 607:       parsed.data.contentType,
 608:       600
 609:     );
 610:     // K-05 LOOP 1 HIGH-B F7: BRIEF_BUCKET-targeted public URL.
 611:     const pubUrl = briefObjectPublicUrl(storageKey);
 612:     return { ok: true, putUrl, publicUrl: pubUrl };
 613:   } catch (err) {
 614:     console.error("[getBoardAssetPutUrlAction] presign failed:", err);
 615:     return { ok: false, error: "presign_failed" };
 616:   }
 617: }
 618: 
 619: // =============================================================================
 620: // Phase 3.0 task_03 ??fetchVideoMetadataAction
 621: // =============================================================================
 622: // Server action wrapper around the oEmbed lib. Validates the URL with Zod,
 623: // calls fetchVideoMetadata, and returns the result (or null on any error).
 624: // The "use server" directive at the top of this file covers this action.
 625: // =============================================================================
 626: 
 627: const videoUrlSchema = z.string().url().max(2000);
 628: 
 629: export type VideoMetadataResult = OEmbedResult | null;
 630: 
 631: export async function fetchVideoMetadataAction(
 632:   url: unknown,
 633: ): Promise<VideoMetadataResult> {
 634:   const parsed = videoUrlSchema.safeParse(url);
 635:   if (!parsed.success) return null;
 636:   return fetchVideoMetadata(parsed.data);
 637: }
 638: 
 639: // =============================================================================
 640: // Phase 3.0 task_04 ??submitProjectAction (Phase 3.1 task_04 update)

 succeeded in 717ms:
2026-05-03T15:48:31.458743Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.6 seconds
Output:
The string is missing the terminator: ".
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 exited 1 in 589ms:
The string is missing the terminator: ".
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : TerminatorExpectedAtEndOfString
 

 succeeded in 779ms:
src\app\[locale]\app\admin\projects\page.tsx:21:    .from('projects')

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"submitProjectAction|activeWorkspaceId|attachedPdfs|boardDocument|workspaceId\" 'src\\app\\[locale]\\app\\projects\\new\\new-project-wizard.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "seed_project_board_from_wizard|add_project_board_pdf|project_boards|attached_pdfs|storage_key|briefObjectPublicUrl|createBriefAssetGetUrl|get.*Url|presign|download" src supabase/migrations' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "is_ws_member|is_ws_admin|workspace_members|user_roles|CREATE FUNCTION public.is_yagi_admin|CREATE FUNCTION public.is_ws_member|projects_insert|project_boards" supabase/migrations/20260422120000_phase_2_0_baseline.sql supabase/migrations/*.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "CREATE (OR REPLACE )?FUNCTION seed_project_board_from_wizard|CREATE (OR REPLACE )?FUNCTION add_project_board_pdf|CREATE POLICY .*project_boards|GRANT UPDATE.*project_boards|REVOKE UPDATE.*project_boards|ALTER DEFAULT PRIVILEGES|GRANT .* TO authenticated|GRANT .* TO anon|GRANT .* TO service_role" supabase/migrations' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 404ms:
21:// Submit placeholder: TODO(task_04) comment ??submitProjectAction not wired here
40:  submitProjectAction,
136:  // so submitProjectAction Path A trusts a value the user-bound server
138:  activeWorkspaceId?: string | null;
289:  activeWorkspaceId = null,
296:  const [boardDocument, setBoardDocument] = useState<Record<string, unknown>>({});
298:  const [attachedPdfs, setAttachedPdfs] = useState<PdfAttachment[]>([]);
369:  }, [watchedValues, boardDocument, triggerAutosave]);
598:        document={boardDocument}
608:        pdfs={attachedPdfs}
847:              const result = await submitProjectAction({
860:                boardDocument,
862:                attachedPdfs,
868:                workspaceId: activeWorkspaceId ?? undefined,

 succeeded in 501ms:
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:108:-- embed). storage_key shape: project-briefs/{project_id}/{uuid}.{ext} ??supabase/migrations\20260426000000_phase_2_8_brief_board.sql:116:  storage_key   text NOT NULL CHECK (char_length(storage_key) BETWEEN 1 AND 500),
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:569:-- project_brief_assets is metadata-immutable post-INSERT (storage_key etc.
src\app\api\showcases\[id]\og\route.tsx:239:      .getPublicUrl(`${showcase.id}.png`);
supabase/migrations\20260429113853_phase_3_1_project_board.sql:1:-- Phase 3.1: project_boards + project_board_versions + 3 RPCs + RLS
supabase/migrations\20260429113853_phase_3_1_project_board.sql:6:-- Table: project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
supabase/migrations\20260429113853_phase_3_1_project_board.sql:27:  board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:40:-- RLS: project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:97:      SELECT pb.id FROM project_boards pb
supabase/migrations\20260429113853_phase_3_1_project_board.sql:112:-- RPC: seed_project_board_from_wizard
supabase/migrations\20260429113853_phase_3_1_project_board.sql:114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429113853_phase_3_1_project_board.sql:140:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:170:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:197:  UPDATE project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:214:INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:217:WHERE id NOT IN (SELECT project_id FROM project_boards)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:3:-- HIGH-A F1: seed_project_board_from_wizard cross-tenant write prevention
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:9:-- Drop and recreate seed_project_board_from_wizard with auth gate + asset_index param
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:42:    RAISE EXCEPTION 'seed_project_board_from_wizard: caller % does not own project %', v_caller, p_project_id;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, document, asset_index, source)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:63:REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:11:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:1:-- Phase 3.1 hotfix-3: attached_pdfs + attached_urls columns + 4 attachment RPCs + extend seed RPC
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:6:-- Schema changes: add attachment columns to project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:8:ALTER TABLE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:9:  ADD COLUMN IF NOT EXISTS attached_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:13:-- RPC: add_project_board_pdf
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:14:-- Appends a PDF attachment entry to project_boards.attached_pdfs.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:16:-- size cap (20MB), filename length (200), storage_key prefix.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:22:  p_storage_key text,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:41:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:45:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:54:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:59:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:63:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:64:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:80:  IF p_storage_key IS NULL
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:81:    OR p_storage_key LIKE '%..%'
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:82:    OR left(p_storage_key, 1) = '/'
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:83:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:88:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:90:    attached_pdfs = attached_pdfs || jsonb_build_array(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:93:        'storage_key', p_storage_key,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:109:-- Appends a URL attachment entry to project_boards.attached_urls.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:137:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:157:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:180:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:203:-- Removes an attachment by id from attached_pdfs or attached_urls.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:225:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:249:    UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:251:      attached_pdfs = COALESCE(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:254:          FROM jsonb_array_elements(attached_pdfs) elem
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:262:    UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:302:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:325:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:345:-- RPC: seed_project_board_from_wizard (EXTEND signature)
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:346:-- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:353:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:379:  INSERT INTO project_boards (
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:382:    attached_pdfs,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:390:    p_initial_attached_pdfs,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:397:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:3:--            AND add auth gate to seed_project_board_from_wizard 5-arg overload
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:4:-- HIGH-A #2: Restrict project_boards_update_client policy to exclude
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:5:--            attached_pdfs, attached_urls, asset_index (attachment writes via RPC only)
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:8:-- FIX HIGH-A #1a: add_project_board_pdf ??owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:12:  p_storage_key text,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:34:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:38:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:46:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:50:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:53:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:54:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:56:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:60:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:64:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:67:  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:68:    OR (p_storage_key NOT LIKE 'project-wizard/%' AND p_storage_key NOT LIKE 'project-board/%') THEN
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:69:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:72:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:73:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:75:    'storage_key', p_storage_key,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:117:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:137:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:154:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:195:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:215:    UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:216:    SET attached_pdfs = (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:218:      FROM jsonb_array_elements(attached_pdfs) elem
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:223:    UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:262:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:285:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:303:-- FIX HIGH-A #1e: seed_project_board_from_wizard (5-arg) ??add auth gate
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:308:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:326:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342:  INSERT INTO project_boards (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:343:    project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:346:    p_project_id, p_initial_document, p_initial_attached_pdfs,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:351:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:363:-- FIX HIGH-A #2: Restrict project_boards_update_client policy +
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:366:DROP POLICY IF EXISTS project_boards_update_client ON project_boards;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:30:  FROM project_boards pb
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:50:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:67:  UPDATE project_boards
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:1:-- Wave C.5d sub_03f_2 ??close the project_boards UPDATE bypass.
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:9:-- table, so PostgREST clients have been able to UPDATE attached_pdfs /
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:11:-- add_project_board_pdf / add_project_board_url RPC validation
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:23:-- client can UPDATE on project_boards are `document` (the user's own
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:26:--   - add_project_board_pdf       (SECURITY DEFINER RPC)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:53:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:57:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has table-level UPDATE on project_boards';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:62:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:66:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost UPDATE on project_boards.document';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:71:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:75:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.asset_index';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:80:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:81:      AND column_name = 'attached_pdfs' AND grantee = 'authenticated' AND privilege_type = 'UPDATE'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:84:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_pdfs';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:89:    WHERE table_schema = 'public' AND table_name = 'project_boards'
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:93:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has UPDATE on project_boards.attached_urls';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:2:-- add_project_board_pdf so wizard PDFs can be persisted with their
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:5:-- Background: getBoardAssetPutUrlAction (Phase 3.0) generates a
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:7:-- and presigns a PUT URL against that key. The earlier
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:8:-- add_project_board_pdf RPC validation only accepted `project-wizard/%`
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:19:-- attached_pdfs, so no backfill is required.
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:21:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:23:  p_storage_key text,
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:40:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:45:  FROM project_boards pb
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:49:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:57:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:64:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:65:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:67:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:75:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:78:  IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:80:      p_storage_key NOT LIKE 'project-wizard/%'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:81:      AND p_storage_key NOT LIKE 'project-board/%'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:82:      AND p_storage_key NOT LIKE 'board-assets/%'
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/, project-board/, or board-assets/)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:87:  UPDATE project_boards
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:88:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:90:    'storage_key', p_storage_key,
src\lib\board\asset-index.test.ts:58:    storage_key: "project-wizard/abc.pdf",
src\lib\board\asset-index.test.ts:209:      makePdfAttachment({ id: "pdf-2", uploaded_at: "2026-04-29T08:00:00Z", filename: "second.pdf", storage_key: "project-wizard/b.pdf" }),
src\lib\board\asset-index.test.ts:210:      makePdfAttachment({ id: "pdf-1", uploaded_at: "2026-04-29T07:00:00Z", filename: "first.pdf", storage_key: "project-wizard/a.pdf" }),
src\lib\board\asset-index.ts:5: *   2. attached_pdfs jsonb column entries
src\lib\board\asset-index.ts:20:  storage_key: string;
src\lib\board\asset-index.ts:47:  url: string; // for canvas: R2 public URL; for url-attachment: the URL itself; for pdf-attachment: storage_key
src\lib\board\asset-index.ts:66:// Merges canvas shapes + attached_pdfs + attached_urls into a unified
src\lib\board\asset-index.ts:82:  attached_pdfs: PdfAttachment[] = [],
src\lib\board\asset-index.ts:182:  // --- Map attached_pdfs ---
src\lib\board\asset-index.ts:183:  for (const pdf of attached_pdfs) {
src\lib\board\asset-index.ts:188:      url: pdf.storage_key, // storage_key is the canonical reference; public URL built in display layer
src\lib\r2\client.ts:3:import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
src\lib\r2\client.ts:28:    // PUT operations. When those land in a presigned URL, the browser-side
src\lib\r2\client.ts:41:  // stage BEFORE getSignedUrl signs the request. Currently a no-op at SDK
src\lib\r2\client.ts:81: * Generate a presigned PUT URL for uploading an object.
src\lib\r2\client.ts:97:  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
src\lib\r2\client.ts:128:// Note: presigned URLs are generated server-side; the client uploads the
src\lib\r2\client.ts:143:export function briefObjectPublicUrl(key: string): string {
src\lib\r2\client.ts:151: * Generate a presigned PUT URL for a brief asset upload.
src\lib\r2\client.ts:164:  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
src\lib\r2\client.ts:168: * Generate a presigned GET URL for a brief asset download / inline render.
src\lib\r2\client.ts:172:export async function createBriefAssetGetUrl(
src\lib\r2\client.ts:180:  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
src\lib\supabase\database.types.ts:1240:            referencedRelation: "project_boards"
src\lib\supabase\database.types.ts:1252:      project_boards: {
src\lib\supabase\database.types.ts:1255:          attached_pdfs: Json
src\lib\supabase\database.types.ts:1270:          attached_pdfs?: Json
src\lib\supabase\database.types.ts:1285:          attached_pdfs?: Json
src\lib\supabase\database.types.ts:1300:            foreignKeyName: "project_boards_locked_by_fkey"
src\lib\supabase\database.types.ts:1307:            foreignKeyName: "project_boards_project_id_fkey"
src\lib\supabase\database.types.ts:1322:          storage_key: string
src\lib\supabase\database.types.ts:1332:          storage_key: string
src\lib\supabase\database.types.ts:1342:          storage_key?: string
src\lib\supabase\database.types.ts:2608:      add_project_board_pdf: {
src\lib\supabase\database.types.ts:2613:          p_storage_key: string
src\lib\supabase\database.types.ts:2683:      seed_project_board_from_wizard:
src\lib\supabase\database.types.ts:2695:              p_initial_attached_pdfs?: Json
src\components\brief-board\editor.tsx:109:   * by the detail page (task_05) when no `project_boards` row of the new system
src\components\brief-board\editor.tsx:455:          const putResp = await fetch(upload.data.presignedPutUrl, {
src\components\brief-board\editor.tsx:469:        // Insert node. The NodeView fetches a presigned GET URL on mount.
src\components\admin\asset-list-panel.tsx:6: * project_boards.asset_index (server-side computed via extractAssetIndex).
src\components\admin\asset-list-panel.tsx:43:    a.download = filename ?? src.split("/").pop() ?? "download";
src\components\admin\asset-list-panel.tsx:178:                    {t("download")}
src\app\[locale]\app\admin\projects\[id]\page.tsx:3:// Reads project_boards.asset_index server-side and renders AssetListPanel.
src\app\[locale]\app\admin\projects\[id]\page.tsx:64:  // Fetch project_boards.asset_index (Phase 3.1)
src\app\[locale]\app\admin\projects\[id]\page.tsx:66:    .from("project_boards")
src\app\[locale]\app\admin\projects\page.tsx:16:  // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
src\app\[locale]\app\admin\projects\page.tsx:18:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
src\app\[locale]\app\admin\projects\page.tsx:33:      boards:project_boards(asset_index)
src\app\[locale]\app\admin\projects\page.tsx:45:    // Resolve asset count from project_boards.asset_index (preferred);
src\components\project-detail\board-tab.tsx:11:// - The board RLS itself enforces row-scope (project_boards policy).
src\components\project-detail\board-tab.tsx:36:  attached_pdfs: PdfAttachment[] | null;
src\components\project-detail\board-tab.tsx:52:    .from("project_boards")
src\components\project-detail\board-tab.tsx:53:    .select("id, document, source, is_locked, attached_pdfs, attached_urls")
src\components\project-detail\board-tab.tsx:100:        initialPdfs={boardRow.attached_pdfs ?? []}
src\components\project-detail\board-tab.tsx:125:  // (every wizard submit seeds a project_boards row). If it happens,
src\components\brief-board\blocks\file-block.tsx:7:// mime_type, byte_size } }. Rendered as a downloadable card with icon +
src\components\brief-board\blocks\file-block.tsx:8:// filename + size; click opens a presigned GET URL.
src\components\brief-board\blocks\file-block.tsx:19:import { getAssetUrl } from "@/app/[locale]/app/projects/[id]/brief/actions";
src\components\brief-board\blocks\file-block.tsx:95:      const r = await getAssetUrl({ assetId });
src\components\brief-board\blocks\file-block.tsx:97:        // Open in a new tab; browser handles MIME-aware display vs download.
src\components\brief-board\blocks\file-block.tsx:134:        {t("block_file_download")}
src\components\brief-board\blocks\image-block.tsx:7:// Rendering: NodeView fetches a presigned GET URL via getAssetUrl on mount.
src\components\brief-board\blocks\image-block.tsx:18:import { getAssetUrl } from "@/app/[locale]/app/projects/[id]/brief/actions";
src\components\brief-board\blocks\image-block.tsx:87:      const r = await getAssetUrl({ assetId });
src\components\project\thread-panel.tsx:337:      if (target?.previewUrl) {
src\components\project\thread-panel.tsx:339:          URL.revokeObjectURL(target.previewUrl);
src\components\team\message-composer.tsx:148:      if (target?.previewUrl) {
src\components\team\message-composer.tsx:150:          URL.revokeObjectURL(target.previewUrl);
src\components\challenges\submission-form.tsx:163:    // Request presigned URLs
src\components\project-board\asset-action-menu.tsx:19:  src: string; // URL to copy/download
src\components\project-board\asset-action-menu.tsx:54:    a.download = src.split("/").pop() ?? "download";
src\components\project-board\asset-action-menu.tsx:162:            {t("assetMenu.download")}
src\components\settings\avatar-upload.tsx:119:      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
src\components\project-board\brief-board-attachments-client.tsx:72:        storage_key: "",
src\components\project-board\project-board.tsx:37:  getBoardAssetPutUrlAction,
src\components\project-board\project-board.tsx:74:// Upload helper ??calls server action for presigned PUT, then fetches R2.
src\components\project-board\project-board.tsx:80:  const result = await getBoardAssetPutUrlAction(file.type);
src\components\project-board\project-board.tsx:82:    console.error("[ProjectBoard] presign failed:", result.error);
src\components\projects\wizard\reference-board.tsx:25:  getWizardAssetPutUrlAction,
src\components\projects\wizard\reference-board.tsx:289:        // server action getWizardAssetPutUrlAction to generate both URLs server-side.
src\components\projects\wizard\reference-board.tsx:290:        const urlResult = await getWizardAssetPutUrlAction(storageKey, file.type);
src\components\projects\wizard\reference-board.tsx:291:        if (!urlResult.ok) throw new Error(`presign failed: ${urlResult.error}`);
src\components\project-board\shapes\url-card-shape.ts:51:  override getDefaultProps(): UrlCardShapeProps {
src\components\project-board\shapes\url-card-shape.ts:80:  override getGeometry(shape: UrlCardShape) {
src\app\[locale]\app\projects\[id]\board-actions.ts:12: *       updates project_boards.{document, asset_index, updated_at}.
src\app\[locale]\app\projects\[id]\board-actions.ts:19: *       project_boards.document and recomputes asset_index.
src\app\[locale]\app\projects\[id]\board-actions.ts:31:  briefObjectPublicUrl,
src\app\[locale]\app\projects\[id]\board-actions.ts:99:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:107:  // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
src\app\[locale]\app\projects\[id]\board-actions.ts:110:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:111:    .select("attached_pdfs, attached_urls")
src\app\[locale]\app\projects\[id]\board-actions.ts:117:    ((currentBoard as any)?.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:128:  // table-level UPDATE on project_boards and only re-grants
src\app\[locale]\app\projects\[id]\board-actions.ts:138:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:285:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:362:  // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
src\app\[locale]\app\projects\[id]\board-actions.ts:364:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:365:    .select("attached_pdfs, attached_urls")
src\app\[locale]\app\projects\[id]\board-actions.ts:371:    ((boardForRestore as any)?.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:378:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:391:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:425:// authenticated write asset_index. Callers (add_project_board_pdf /
src\app\[locale]\app\projects\[id]\board-actions.ts:434:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:435:    .select("document, attached_pdfs, attached_urls, project_id")
src\app\[locale]\app\projects\[id]\board-actions.ts:443:    (board.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:452:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:526:  // Call add_project_board_pdf RPC
src\app\[locale]\app\projects\[id]\board-actions.ts:529:    "add_project_board_pdf",
src\app\[locale]\app\projects\[id]\board-actions.ts:532:      p_storage_key: storageKey,
src\app\[locale]\app\projects\new\actions.ts:452:// Phase 3.0 hotfix-2 ??getWizardAssetPutUrlAction
src\app\[locale]\app\projects\new\actions.ts:454:// Server action that generates a presigned R2 PUT URL + the public URL for a
src\app\[locale]\app\projects\new\actions.ts:465:  briefObjectPublicUrl,
src\app\[locale]\app\projects\new\actions.ts:469:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
src\app\[locale]\app\projects\new\actions.ts:471:// objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
src\app\[locale]\app\projects\new\actions.ts:498:// getBoardAssetPutUrlAction below.
src\app\[locale]\app\projects\new\actions.ts:525:export async function getWizardAssetPutUrlAction(
src\app\[locale]\app\projects\new\actions.ts:556:    return { ok: false, error: "storage_key_not_owned" };
src\app\[locale]\app\projects\new\actions.ts:565:    // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
src\app\[locale]\app\projects\new\actions.ts:568:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
src\app\[locale]\app\projects\new\actions.ts:571:    console.error("[getWizardAssetPutUrlAction] presign failed:", err);
src\app\[locale]\app\projects\new\actions.ts:572:    return { ok: false, error: "presign_failed" };
src\app\[locale]\app\projects\new\actions.ts:578:// getWizardAssetPutUrlAction is preserved for back-compat with already-
src\app\[locale]\app\projects\new\actions.ts:584:export async function getBoardAssetPutUrlAction(
src\app\[locale]\app\projects\new\actions.ts:612:    const pubUrl = briefObjectPublicUrl(storageKey);
src\app\[locale]\app\projects\new\actions.ts:615:    console.error("[getBoardAssetPutUrlAction] presign failed:", err);
src\app\[locale]\app\projects\new\actions.ts:616:    return { ok: false, error: "presign_failed" };
src\app\[locale]\app\projects\new\actions.ts:654://   3. RPC seed_project_board_from_wizard(project_id, board_document) ??src\app\[locale]\app\projects\new\actions.ts:690:  storage_key: z.string().regex(/^project-(wizard|board)\//),
src\app\[locale]\app\projects\new\actions.ts:918:  // 3. Phase 3.1 ??Seed the project_boards row via RPC.
src\app\[locale]\app\projects\new\actions.ts:941:    "seed_project_board_from_wizard",
src\app\[locale]\app\projects\new\actions.ts:945:      p_initial_attached_pdfs: seedAttachedPdfs,
src\app\[locale]\app\projects\new\actions.ts:951:    console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
src\app\[locale]\app\projects\[id]\brief\actions.ts:12://                                                 G_B-3 fills with R2 presign
src\app\[locale]\app\projects\[id]\brief\actions.ts:15:// getAssetUrl (G_B-3) is colocated with uploadAsset and lands at G_B-3.
src\app\[locale]\app\projects\[id]\brief\actions.ts:26:  createBriefAssetGetUrl,
src\app\[locale]\app\projects\[id]\brief\actions.ts:470:// 6. uploadAsset ??full impl (G_B-3): presigned PUT URL + project_brief_assets row
src\app\[locale]\app\projects\[id]\brief\actions.ts:472:// Flow: validate ??derive storage_key ??INSERT asset row (RLS gates project
src\app\[locale]\app\projects\[id]\brief\actions.ts:473:// membership + binds uploaded_by to caller) ??presign PUT URL ??return.
src\app\[locale]\app\projects\[id]\brief\actions.ts:494:    presignedPutUrl: string;
src\app\[locale]\app\projects\[id]\brief\actions.ts:510:  // If this fails with RLS denial, we never expose a presigned URL.
src\app\[locale]\app\projects\[id]\brief\actions.ts:516:      storage_key: storageKey,
src\app\[locale]\app\projects\[id]\brief\actions.ts:534:  let presignedPutUrl: string;
src\app\[locale]\app\projects\[id]\brief\actions.ts:536:    presignedPutUrl = await createBriefAssetPutUrl(
src\app\[locale]\app\projects\[id]\brief\actions.ts:543:    console.error("[uploadAsset] presign error", err);
src\app\[locale]\app\projects\[id]\brief\actions.ts:545:    return { error: "db", message: err instanceof Error ? err.message : "presign failed" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:550:    data: { assetId, storageKey, presignedPutUrl },
src\app\[locale]\app\projects\[id]\brief\actions.ts:555:// 7. getAssetUrl ??presigned GET URL for inline render / download
src\app\[locale]\app\projects\[id]\brief\actions.ts:559:// presigned URL is returned; the asset itself is fetched from R2 by the
src\app\[locale]\app\projects\[id]\brief\actions.ts:566:export async function getAssetUrl(
src\app\[locale]\app\projects\[id]\brief\actions.ts:579:    .select("storage_key, mime_type, original_name")
src\app\[locale]\app\projects\[id]\brief\actions.ts:584:    console.error("[getAssetUrl] select error", selErr);
src\app\[locale]\app\projects\[id]\brief\actions.ts:591:    url = await createBriefAssetGetUrl(asset.storage_key);
src\app\[locale]\app\projects\[id]\brief\actions.ts:593:    console.error("[getAssetUrl] presign error", err);
src\app\[locale]\app\projects\[id]\brief\actions.ts:594:    return { error: "db", message: err instanceof Error ? err.message : "presign failed" };
src\app\[locale]\app\projects\new\new-project-wizard.tsx:19:// File uploads: R2 presigned PUT via existing uploadAsset pattern (image + PDF)
src\app\[locale]\app\projects\new\new-project-wizard.tsx:60:import { getBoardAssetPutUrlAction, fetchVideoMetadataAction } from "./actions";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:417:    // Get presigned PUT URL from server action (server generates storage key)
src\app\[locale]\app\projects\new\new-project-wizard.tsx:418:    const result = await getBoardAssetPutUrlAction(file.type);
src\app\[locale]\app\projects\new\new-project-wizard.tsx:433:    // storage_key for wizard PDFs uses the board-assets prefix that
src\app\[locale]\app\projects\new\new-project-wizard.tsx:434:    // getBoardAssetPutUrlAction generated server-side. Extract the path
src\app\[locale]\app\projects\new\new-project-wizard.tsx:438:    // satisfy the add_project_board_pdf RPC validation, which left a key
src\app\[locale]\app\projects\new\new-project-wizard.tsx:451:      storage_key: storageKey,

2026-05-03T15:48:37.247256Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:115:  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
supabase/migrations/20260422120000_phase_2_0_baseline.sql:119:  insert into public.user_roles (user_id, role, workspace_id)
supabase/migrations/20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:159:    select 1 from workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:166:-- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:169:CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:173:  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1780:-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1783:CREATE TABLE public.user_roles (
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1813:-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1816:CREATE TABLE public.workspace_members (
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2156:-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2168:-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2524:-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2527:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2528:    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2532:-- Name: user_roles user_roles_user_id_role_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2535:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2536:    ADD CONSTRAINT user_roles_user_id_role_workspace_id_key UNIQUE (user_id, role, workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2564:-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2567:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2568:    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2572:-- Name: workspace_members workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2575:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2576:    ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2948:-- Name: user_roles_user_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2951:CREATE INDEX user_roles_user_idx ON public.user_roles USING btree (user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2955:-- Name: user_roles_ws_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2958:CREATE INDEX user_roles_ws_idx ON public.user_roles USING btree (workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2972:CREATE INDEX ws_members_user_idx ON public.workspace_members USING btree (user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2979:CREATE INDEX ws_members_ws_idx ON public.workspace_members USING btree (workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3610:-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3613:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3614:    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3618:-- Name: user_roles user_roles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3621:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3622:    ADD CONSTRAINT user_roles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3642:-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3645:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3646:    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3650:-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3653:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3654:    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3658:-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3661:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3662:    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
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
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4120:-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4172:          WHERE ((p.id = s.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4210:  WHERE ((p.id = showcases.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4288:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND public.is_ws_member(auth.uid(), c.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4366:  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND public.is_ws_member(auth.uid(), p.workspace_id)))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
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
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4464:-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4467:ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4504:-- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4511:-- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4518:-- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4522:   FROM public.workspace_members m
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4628:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4637:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_member(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4646:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4694:  WHERE ((s.id = ((storage.foldername(objects.name))[1])::uuid) AND public.is_ws_member(auth.uid(), p.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4761:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4780:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
rg: supabase/migrations/*.sql: ?뚯씪 ?대쫫, ?붾젆?곕━ ?대쫫 ?먮뒗 蹂쇰ⅷ ?덉씠釉?援щЦ???섎せ?섏뿀?듬땲?? (os error 123)

 exited 1 in 410ms:
supabase/migrations/20260422120000_phase_2_0_baseline.sql:115:  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
supabase/migrations/20260422120000_phase_2_0_baseline.sql:119:  insert into public.user_roles (user_id, role, workspace_id)
supabase/migrations/20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:159:    select 1 from workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:166:-- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:169:CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:173:  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations/20260422120000_phase_2_0_baseline.sql:185:  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1780:-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1783:CREATE TABLE public.user_roles (
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1813:-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1816:CREATE TABLE public.workspace_members (
supabase/migrations/20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2156:-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2168:-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2524:-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2527:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2528:    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2532:-- Name: user_roles user_roles_user_id_role_workspace_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2535:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2536:    ADD CONSTRAINT user_roles_user_id_role_workspace_id_key UNIQUE (user_id, role, workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2564:-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2567:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2568:    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2572:-- Name: workspace_members workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2575:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2576:    ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2948:-- Name: user_roles_user_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2951:CREATE INDEX user_roles_user_idx ON public.user_roles USING btree (user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2955:-- Name: user_roles_ws_idx; Type: INDEX; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2958:CREATE INDEX user_roles_ws_idx ON public.user_roles USING btree (workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2972:CREATE INDEX ws_members_user_idx ON public.workspace_members USING btree (user_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:2979:CREATE INDEX ws_members_ws_idx ON public.workspace_members USING btree (workspace_id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3610:-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3613:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3614:    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3618:-- Name: user_roles user_roles_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3621:ALTER TABLE ONLY public.user_roles
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3622:    ADD CONSTRAINT user_roles_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3642:-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3645:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3646:    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3650:-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3653:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3654:    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3658:-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3661:ALTER TABLE ONLY public.workspace_members
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3662:    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
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
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4120:-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4172:          WHERE ((p.id = s.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4210:  WHERE ((p.id = showcases.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4288:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND public.is_ws_member(auth.uid(), c.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4366:  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND public.is_ws_member(auth.uid(), p.workspace_id)))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
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
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4464:-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4467:ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4504:-- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4511:-- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4518:-- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4522:   FROM public.workspace_members m
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4628:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4637:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_member(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4646:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4694:  WHERE ((s.id = ((storage.foldername(objects.name))[1])::uuid) AND public.is_ws_member(auth.uid(), p.workspace_id)))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4761:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations/20260422120000_phase_2_0_baseline.sql:4780:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
rg: supabase/migrations/*.sql: ?뚯씪 ?대쫫, ?붾젆?곕━ ?대쫫 ?먮뒗 蹂쇰ⅷ ?덉씠釉?援щЦ???섎せ?섏뿀?듬땲?? (os error 123)

 succeeded in 456ms:
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:78:GRANT EXECUTE ON FUNCTION public.is_handle_available(citext) TO authenticated, anon;
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:156:GRANT EXECUTE ON FUNCTION public.change_handle(citext) TO authenticated;
supabase/migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:4:--   H1 (HIGH) ??is_handle_available GRANT EXECUTE TO anon exposed
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:77:GRANT EXECUTE ON FUNCTION public.get_submission_vote_counts(uuid) TO anon, authenticated;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:161:GRANT SELECT ON public.project_status_history TO authenticated, anon;
supabase/migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:20:--   2. GRANT  UPDATE (document, updated_at) TO authenticated
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:21:CREATE OR REPLACE FUNCTION add_project_board_pdf(

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\actions.ts' | ForEach-Object { "'$i++; if ($i -ge 640 -and $i -le 760) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\new\\new-project-wizard.tsx' | ForEach-Object { "'$i++; if ($i -ge 280 -and $i -le 380 -or $i -ge 830 -and $i -le 885) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\lib\\r2\\client.ts' | ForEach-Object { "'$i++; if ($i -le 210) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\components\\admin\\asset-list-panel.tsx' | ForEach-Object { "'$i++; if ($i -le 230) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 433ms:
 640: // Phase 3.0 task_04 ??submitProjectAction (Phase 3.1 task_04 update)
 641: // =============================================================================
 642: // Atomically submits the wizard's draft as a new project with status='in_review'
 643: // (the L-015 auto-transition shortcut ??never writes 'submitted' to projects).
 644: //
 645: // Sequence (Phase 3.1):
 646: //   1. INSERT projects with status='in_review' (user-scoped client; RLS
 647: //      INSERT policy allows it since we own the workspace)
 648: //   2. INSERT project_status_history with actor_role='system' ??MUST bypass
 649: //      RLS which denies INSERT on this table for all authenticated callers.
 650: //      Resolution: Option A ??service-role client scoped to this single INSERT.
 651: //      Service-role usage is strictly scoped; other reads/writes stay on user
 652: //      client.
 653: //   3. RPC seed_project_board_from_wizard(project_id, board_document) ??//      Phase 3.1 replaces the project_references INSERT path.
 654: //      The RPC is SECURITY DEFINER + asserts project.status='in_review'.
 655: //   4. DELETE wizard_drafts row (user-scoped client)
 656: //   5. Send Resend admin + client emails (best-effort, not blocking)
 657: //   6. Emit in-app notification to the submitting user (best-effort, not
 658: //      blocking)
 659: //
 660: // Returns { ok: true, projectId, redirect } on success.
 661: // =============================================================================
 662: 
 663: import { sendProjectSubmittedAdmin, sendProjectSubmittedClient } from "@/lib/email/project";
 664: import { emitNotification } from "@/lib/notifications/emit";
 665: 
 666: // =============================================================================
 667: // Phase 3.1 ??server-side tldraw store validator (anti-DoS + structural sanity)
 668: // =============================================================================
 669: // K-05 trust boundary: the wizard's boardDocument is client-controlled JSON.
 670: // Server enforces a max serialized size (5MB) AND a minimum structural shape
 671: // (must be either {} or contain a "store" object). Detailed validation of
 672: // every shape's props is impractical for tldraw store snapshots; we trust the
 673: // schema migration version + tldraw's runtime to reject malformed shapes on
 674: // load. Server prevents oversized/wrong-shape payloads only.
 675: function validateTldrawStore(doc: Record<string, unknown>): boolean {
 676:   if (!doc || typeof doc !== "object") return false;
 677:   if (Object.keys(doc).length === 0) return true; // empty board OK
 678:   if (!("store" in doc)) return false;
 679:   const store = (doc as { store: unknown }).store;
 680:   if (typeof store !== "object" || store === null) return false;
 681:   return true;
 682: }
 683: 
 684: // Phase 3.1 hotfix-3: attachment sub-schemas (L-026 ??must stay in sync with
 685: // client-side wizard state types and task_02 PdfAttachment/UrlAttachment types).
 686: const PdfAttachmentSchema = z.object({
 687:   id: z.string().uuid(),
 688:   storage_key: z.string().regex(/^project-(wizard|board)\//),
 689:   filename: z.string().min(1).max(200),
 690:   size_bytes: z.number().int().positive().max(20 * 1024 * 1024),
 691:   uploaded_at: z.string(),
 692:   uploaded_by: z.string(),
 693: });
 694: 
 695: const UrlAttachmentSchema = z.object({
 696:   id: z.string().uuid(),
 697:   url: z.string()
 698:     .min(1)
 699:     .max(2000)
 700:     .refine(
 701:       (u) => {
 702:         try {
 703:           const p = new URL(u);
 704:           return p.protocol === "http:" || p.protocol === "https:";
 705:         } catch {
 706:           return false;
 707:         }
 708:       },
 709:       { message: "URL must be http:// or https://" }
 710:     ),
 711:   title: z.string().max(200).nullable(),
 712:   thumbnail_url: z.string().max(2000).nullable(),
 713:   provider: z.enum(["youtube", "vimeo", "generic"]),
 714:   note: z.string().max(500).nullable(),
 715:   added_at: z.string(),
 716:   added_by: z.string(),
 717: });
 718: 
 719: const SubmitInputSchema = z.object({
 720:   name: z.string().min(1).max(80),
 721:   // hotfix-2: max reduced to 500 to match client wizardSchema (L-026 ??keep in sync)
 722:   description: z.string().min(1).max(500),
 723:   deliverable_types: z.array(z.string()).min(1),
 724:   budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
 725:   delivery_date: z.string().nullable().optional(),
 726:   // Phase 3.1 hotfix-3 addendum (yagi smoke v1 FAIL-5): optional 沃섎챸????彛???깆쁽.
 727:   // Client emits ISO 8601 with Z (converted from <input type="datetime-local">
 728:   // via new Date(local).toISOString()). Server accepts ISO datetime; null/undefined
 729:   // both treated as "not specified". Past datetimes are NOT rejected server-side
 730:   // (UI blocks via min attr; server keeps client-trust minimal ??client may set
 731:   // any future datetime; explicit decision logged in _run.log).
 732:   meeting_preferred_at: z.string().datetime().nullable().optional(),
 733:   // Phase 3.1: replaces references[] with a tldraw store snapshot.
 734:   // Server-side validation: 5MB serialized cap (anti-DoS) + structural sanity.
 735:   boardDocument: z
 736:     .record(z.string(), z.unknown())
 737:     .refine(
 738:       (doc) => {
 739:         try {
 740:           const serialized = JSON.stringify(doc);
 741:           return serialized.length <= 5 * 1024 * 1024;
 742:         } catch {
 743:           return false;
 744:         }
 745:       },
 746:       { message: "boardDocument exceeds 5MB or is not serializable" }
 747:     )
 748:     .refine(validateTldrawStore, {
 749:       message: "boardDocument is not a valid tldraw store snapshot",
 750:     })
 751:     .default({}),
 752:   // Phase 3.1 hotfix-3: structured attachment columns (Q-AA)
 753:   // Server validates shape/size/scheme (L-026 ??synced with client wizard state)
 754:   attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().default([]),
 755:   attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().default([]),
 756:   // Phase 4.x task_03 ??Digital Twin intent. Defense-in-depth: client-supplied
 757:   // value, validated here and again by the projects.twin_intent CHECK constraint
 758:   // added in task_01 migration. Default 'undecided' matches the column default.
 759:   twin_intent: z
 760:     .enum(["undecided", "specific_in_mind", "no_twin"])

 succeeded in 461ms:
 280:   );
 281: }
 282: 
 283: // ---------------------------------------------------------------------------
 284: // Main wizard component
 285: // ---------------------------------------------------------------------------
 286: 
 287: export function NewProjectWizard({
 288:   brands: _brands = [],
 289:   activeWorkspaceId = null,
 290: }: NewProjectWizardProps) {
 291:   const t = useTranslations("projects");
 292:   const router = useRouter();
 293: 
 294:   const [step, setStep] = useState<Step>(1);
 295:   // Phase 3.1: replaces refs[] with a tldraw store snapshot.
 296:   const [boardDocument, setBoardDocument] = useState<Record<string, unknown>>({});
 297:   // Phase 3.1 hotfix-3: structured attachment state (Q-AA)
 298:   const [attachedPdfs, setAttachedPdfs] = useState<PdfAttachment[]>([]);
 299:   const [attachedUrls, setAttachedUrls] = useState<UrlAttachment[]>([]);
 300:   const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
 301:   const [isSubmitting, startSubmit] = useTransition();
 302:   const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
 303:   const isFirstRender = useRef(true);
 304: 
 305:   const {
 306:     register,
 307:     control,
 308:     getValues,
 309:     watch,
 310:     trigger,
 311:     formState: { errors },
 312:   } = useForm<WizardFormData>({
 313:     resolver: zodResolver(wizardSchema),
 314:     defaultValues: {
 315:       name: "",
 316:       description: "",
 317:       deliverable_types: [],
 318:       budget_band: undefined,
 319:       delivery_date: "",
 320:       meeting_preferred_at: "",
 321:       twin_intent: "undecided",
 322:     },
 323:   });
 324: 
 325:   // -------------------------------------------------------------------------
 326:   // Autosave helpers
 327:   // -------------------------------------------------------------------------
 328: 
 329:   function buildDraftFields(): WizardDraftFields {
 330:     const v = getValues();
 331:     return {
 332:       title: v.name.trim(),
 333:       description: v.description || null,
 334:       brand_id: null,
 335:       tone: null,
 336:       deliverable_types: v.deliverable_types ?? [],
 337:       estimated_budget_range: v.budget_band || null,
 338:       target_delivery_at:
 339:         v.delivery_date && v.delivery_date !== "" ? v.delivery_date : null,
 340:     };
 341:   }
 342: 
 343:   const triggerAutosave = useCallback(() => {
 344:     if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
 345:     autosaveTimer.current = setTimeout(() => {
 346:       void (async () => {
 347:         const fields = buildDraftFields();
 348:         if (!fields.title) return;
 349:         try {
 350:           const res = await ensureDraftProject({ initial: fields });
 351:           if ("ok" in res && res.ok) {
 352:             setDraftProjectId(res.data.projectId);
 353:           }
 354:         } catch {
 355:           // autosave failures are silent
 356:         }
 357:       })();
 358:     }, 500);
 359:   }, []); // eslint-disable-line react-hooks/exhaustive-deps
 360: 
 361:   // Watch form fields for autosave + live summary card re-render
 362:   const watchedValues = watch();
 363:   useEffect(() => {
 364:     if (isFirstRender.current) {
 365:       isFirstRender.current = false;
 366:       return;
 367:     }
 368:     triggerAutosave();
 369:   }, [watchedValues, boardDocument, triggerAutosave]);
 370: 
 371:   // Cleanup timer on unmount
 372:   useEffect(() => {
 373:     return () => {
 374:       if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
 375:     };
 376:   }, []);
 377: 
 378:   // -------------------------------------------------------------------------
 379:   // Step navigation
 380:   // -------------------------------------------------------------------------
 830:           type="button"
 831:           className="rounded-full uppercase tracking-[0.10em] text-sm"
 832:           disabled={isSubmitting}
 833:           onClick={() => {
 834:             startSubmit(async () => {
 835:               // Validate admin fields before submitting
 836:               const isValid = await validateStep3Fields();
 837:               if (!isValid) return;
 838: 
 839:               const formVals = getValues();
 840:               // Phase 3.1 hotfix-3 addendum: convert datetime-local "YYYY-MM-DDTHH:MM"
 841:               // (no TZ) to ISO 8601 with Z so server zod's z.string().datetime()
 842:               // accepts it. Empty string ??null.
 843:               const meetingPreferredAt =
 844:                 formVals.meeting_preferred_at && formVals.meeting_preferred_at !== ""
 845:                   ? new Date(formVals.meeting_preferred_at).toISOString()
 846:                   : null;
 847:               const result = await submitProjectAction({
 848:                 name: formVals.name,
 849:                 description: formVals.description,
 850:                 deliverable_types: formVals.deliverable_types,
 851:                 budget_band: formVals.budget_band,
 852:                 delivery_date:
 853:                   formVals.delivery_date && formVals.delivery_date !== ""
 854:                     ? formVals.delivery_date
 855:                     : null,
 856:                 meeting_preferred_at: meetingPreferredAt,
 857:                 // Phase 4.x task_03: Digital Twin intent (3-radio).
 858:                 twin_intent: formVals.twin_intent,
 859:                 // Phase 3.1: tldraw store snapshot replaces references[]
 860:                 boardDocument,
 861:                 // Phase 3.1 hotfix-3: pass structured attachments (Q-AA)
 862:                 attachedPdfs,
 863:                 attachedUrls,
 864:                 draftProjectId,
 865:                 // Wave C.5d sub_03b: explicit active workspace from server-
 866:                 // resolved cookie (page.tsx). Server still re-verifies via
 867:                 // memberSet, and falls through to its own resolver if null.
 868:                 workspaceId: activeWorkspaceId ?? undefined,
 869:               });
 870:               if (result.ok) {
 871:                 router.push(result.redirect);
 872:               } else {
 873:                 console.error("[wizard.submit] failed:", result);
 874:                 const errorKey =
 875:                   result.error === "unauthenticated"
 876:                     ? "wizard.errors.unauthenticated"
 877:                     : result.error === "validation"
 878:                     ? "wizard.errors.submit_validation"
 879:                     : "wizard.errors.submit_failed";
 880:                 toast.error(t(errorKey));
 881:               }
 882:             });
 883:           }}
 884:         >
 885:           {isSubmitting ? (

 succeeded in 420ms:
   1: import { S3Client } from "@aws-sdk/client-s3";
   2: import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
   3: import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
   4: 
   5: function requireEnv(name: string): string {
   6:   const v = process.env[name];
   7:   if (!v) throw new Error(`[r2] missing env ${name}`);
   8:   return v;
   9: }
  10: 
  11: export const BUCKET =
  12:   process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "yagi-challenge-submissions";
  13: 
  14: // Lazy singleton ??instantiated on first real use. Non-upload paths
  15: // (e.g., sitemap.ts) don't need this and shouldn't crash if creds missing.
  16: let _client: S3Client | null = null;
  17: function getClient(): S3Client {
  18:   if (_client) return _client;
  19:   _client = new S3Client({
  20:     region: "auto",
  21:     endpoint: requireEnv("CLOUDFLARE_R2_ENDPOINT"),
  22:     credentials: {
  23:       accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
  24:       secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
  25:     },
  26:     // Defensive against AWS SDK v3 (>=3.729.0) auto-injecting
  27:     // x-amz-checksum-crc32 + x-amz-sdk-checksum-algorithm headers/query on
  28:     // PUT operations. When those land in a presigned URL, the browser-side
  29:     // PUT signature mismatches what R2 verifies. Current SDK at 3.1035 + this
  30:     // flag together emit a clean URL (verified: SignedHeaders=host only, no
  31:     // checksum bits). The middleware below is belt-and-suspenders for future
  32:     // SDK bumps.
  33:     // Refs:
  34:     //   https://github.com/aws/aws-sdk-js-v3/issues/6810
  35:     //   https://github.com/aws/aws-sdk-js-v3/issues/6920
  36:     requestChecksumCalculation: "WHEN_REQUIRED",
  37:     responseChecksumValidation: "WHEN_REQUIRED",
  38:   });
  39: 
  40:   // Belt-and-suspenders: strip any flexible-checksum artifacts at the build
  41:   // stage BEFORE getSignedUrl signs the request. Currently a no-op at SDK
  42:   // 3.1035 with the config above, but protects against SDK upgrades that
  43:   // re-introduce auto-injection.
  44:   _client.middlewareStack.add(
  45:     (next) => async (args) => {
  46:       const req = args.request as {
  47:         headers?: Record<string, string>;
  48:         query?: Record<string, string | string[]>;
  49:       };
  50:       if (req.headers) {
  51:         for (const k of Object.keys(req.headers)) {
  52:           const lk = k.toLowerCase();
  53:           if (
  54:             lk === "x-amz-sdk-checksum-algorithm" ||
  55:             lk.startsWith("x-amz-checksum-")
  56:           ) {
  57:             delete req.headers[k];
  58:           }
  59:         }
  60:       }
  61:       if (req.query) {
  62:         for (const k of Object.keys(req.query)) {
  63:           const lk = k.toLowerCase();
  64:           if (
  65:             lk === "x-amz-sdk-checksum-algorithm" ||
  66:             lk.startsWith("x-amz-checksum-")
  67:           ) {
  68:             delete req.query[k];
  69:           }
  70:         }
  71:       }
  72:       return next(args);
  73:     },
  74:     { step: "build", name: "stripChecksumHeaders", priority: "high" }
  75:   );
  76: 
  77:   return _client;
  78: }
  79: 
  80: /**
  81:  * Generate a presigned PUT URL for uploading an object.
  82:  * Default expiry 3600s (1h) ??enough for large video uploads.
  83:  * Path convention (caller's responsibility):
  84:  *   tmp/<challenge_id>/<client_uuid>/<filename>   (pre-confirm)
  85:  *   submissions/<challenge_id>/<submission_id>/<filename>  (post-atomic move)
  86:  */
  87: export async function createPresignedPutUrl(
  88:   key: string,
  89:   contentType: string,
  90:   expiresSeconds = 3600
  91: ): Promise<string> {
  92:   const cmd = new PutObjectCommand({
  93:     Bucket: BUCKET,
  94:     Key: key,
  95:     ContentType: contentType,
  96:   });
  97:   return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
  98: }
  99: 
 100: /**
 101:  * Public URL for serving an uploaded object.
 102:  * Uses the R2 endpoint directly. If CLOUDFLARE_R2_PUBLIC_BASE is set
 103:  * in the future, prefer that for custom-domain serving.
 104:  */
 105: export function objectPublicUrl(key: string): string {
 106:   const base =
 107:     process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
 108:     `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BUCKET}`;
 109:   return `${base}/${key}`;
 110: }
 111: 
 112: /**
 113:  * Re-export the SDK client getter for advanced ops (CopyObject, HeadObject, DeleteObject).
 114:  * Server actions in src/app/challenges/[slug]/submit/actions.ts will use this for the
 115:  * tmp/ ??submissions/ atomic move + upload verification.
 116:  */
 117: export { getClient as getR2Client };
 118: 
 119: // =============================================================================
 120: // Phase 2.8 ??Brief Board asset bucket helpers
 121: // =============================================================================
 122: // Per SPEC 吏?.3 brief assets live in an existing R2 bucket under a new
 123: // `project-briefs/<project_id>/<uuid>.<ext>` prefix. SPEC says zero new
 124: // dependencies and reuse Phase 1.x SDK integration ??the BRIEF_BUCKET
 125: // constant defaults to `yagi-commission-files` (the per-Q-059 commission/
 126: // project-files bucket) and is overridable via env for future separation.
 127: //
 128: // Note: presigned URLs are generated server-side; the client uploads the
 129: // blob directly to R2 via the returned URL. Direct browser ??R2 PUT keeps
 130: // large files off our server.
 131: 
 132: export const BRIEF_BUCKET =
 133:   process.env.CLOUDFLARE_R2_BRIEF_BUCKET ?? "yagi-commission-files";
 134: 
 135: /**
 136:  * Public URL for a BRIEF_BUCKET object. Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix:
 137:  * the legacy `objectPublicUrl` builds a URL based on `BUCKET` (the challenge
 138:  * submissions bucket), but brief assets are written to `BRIEF_BUCKET`. When
 139:  * `CLOUDFLARE_R2_PUBLIC_BASE` is set (the Phase 3.1 prereq), it overrides
 140:  * regardless and is expected to point at the brief bucket's public URL. When
 141:  * unset, this helper at least targets the correct bucket via the R2 endpoint.
 142:  */
 143: export function briefObjectPublicUrl(key: string): string {
 144:   const base =
 145:     process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
 146:     `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BRIEF_BUCKET}`;
 147:   return `${base}/${key}`;
 148: }
 149: 
 150: /**
 151:  * Generate a presigned PUT URL for a brief asset upload.
 152:  * Default expiry 600s ??uploads are debounced one-shot, not long-lived.
 153:  */
 154: export async function createBriefAssetPutUrl(
 155:   storageKey: string,
 156:   contentType: string,
 157:   expiresSeconds = 600
 158: ): Promise<string> {
 159:   const cmd = new PutObjectCommand({
 160:     Bucket: BRIEF_BUCKET,
 161:     Key: storageKey,
 162:     ContentType: contentType,
 163:   });
 164:   return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
 165: }
 166: 
 167: /**
 168:  * Generate a presigned GET URL for a brief asset download / inline render.
 169:  * 1h expiry covers a typical edit session; the editor refreshes URLs lazily
 170:  * on remount, so users with very long sessions just refetch on next mount.
 171:  */
 172: export async function createBriefAssetGetUrl(
 173:   storageKey: string,
 174:   expiresSeconds = 3600
 175: ): Promise<string> {
 176:   const cmd = new GetObjectCommand({
 177:     Bucket: BRIEF_BUCKET,
 178:     Key: storageKey,
 179:   });
 180:   return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
 181: }

 succeeded in 444ms:
   1: "use client";
   2: 
   3: /**
   4:  * asset-list-panel.tsx
   5:  * Phase 3.1 task_07 ??admin right-rail panel listing all images/PDFs/URLs from
   6:  * project_boards.asset_index (server-side computed via extractAssetIndex).
   7:  * Achromatic (L-011), soft shadow (L-013), font-suit (L-010), no internal seams (L-012).
   8:  *
   9:  * Phase 3.1 hotfix-3 update: AssetIndexEntry shape changed.
  10:  *   - shapeId ??shape_id (optional)
  11:  *   - type ??kind  ('image' | 'pdf' | 'url')
  12:  *   - src ??url
  13:  *   - domain field removed (derive from url)
  14:  */
  15: 
  16: import { useCallback } from "react";
  17: import { useTranslations } from "next-intl";
  18: import type { AssetIndexEntry } from "@/lib/board/asset-index";
  19: 
  20: export interface AssetListPanelProps {
  21:   assets: AssetIndexEntry[];
  22: }
  23: 
  24: export function AssetListPanel({ assets }: AssetListPanelProps) {
  25:   const t = useTranslations("admin.projects.references");
  26: 
  27:   const handleCopy = useCallback(async (src: string) => {
  28:     try {
  29:       await navigator.clipboard.writeText(src);
  30:     } catch {
  31:       const input = document.createElement("input");
  32:       input.value = src;
  33:       document.body.appendChild(input);
  34:       input.select();
  35:       document.execCommand("copy");
  36:       document.body.removeChild(input);
  37:     }
  38:   }, []);
  39: 
  40:   const handleDownload = useCallback((src: string, filename?: string) => {
  41:     const a = document.createElement("a");
  42:     a.href = src;
  43:     a.download = filename ?? src.split("/").pop() ?? "download";
  44:     a.target = "_blank";
  45:     a.rel = "noopener noreferrer";
  46:     document.body.appendChild(a);
  47:     a.click();
  48:     document.body.removeChild(a);
  49:   }, []);
  50: 
  51:   if (assets.length === 0) {
  52:     return (
  53:       <div className="space-y-3">
  54:         <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
  55:           {t("title")}
  56:         </h3>
  57:         <p className="text-sm text-muted-foreground keep-all">{t("empty")}</p>
  58:       </div>
  59:     );
  60:   }
  61: 
  62:   return (
  63:     <div className="space-y-3">
  64:       <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
  65:         {t("title")}
  66:       </h3>
  67:       <ul className="space-y-2">
  68:         {assets.map((a, idx) => {
  69:           // Derive a display label from available fields
  70:           const displayLabel =
  71:             a.filename ?? a.title ?? (() => {
  72:               try {
  73:                 return new URL(a.url).hostname;
  74:               } catch {
  75:                 return a.url;
  76:               }
  77:             })();
  78: 
  79:           return (
  80:             <li
  81:               key={a.shape_id ?? `${a.source}-${idx}`}
  82:               className="rounded-lg p-3 bg-background"
  83:               style={{
  84:                 boxShadow:
  85:                   "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
  86:               }}
  87:             >
  88:               <div className="flex items-start gap-3">
  89:                 {/* Thumbnail / icon */}
  90:                 {a.kind === "image" ? (
  91:                   // eslint-disable-next-line @next/next/no-img-element -- R2 public URL not in next/image domains
  92:                   <img
  93:                     src={a.thumbnail_url ?? a.url}
  94:                     alt={a.filename ?? "asset"}
  95:                     className="w-12 h-12 rounded object-cover flex-shrink-0"
  96:                   />
  97:                 ) : a.kind === "pdf" ? (
  98:                   <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
  99:                     <svg
 100:                       width="20"
 101:                       height="20"
 102:                       viewBox="0 0 20 20"
 103:                       fill="none"
 104:                       aria-hidden="true"
 105:                     >
 106:                       <path
 107:                         d="M5 2h7l4 4v12H5V2z"
 108:                         stroke="#555"
 109:                         strokeWidth="1.4"
 110:                         strokeLinejoin="round"
 111:                       />
 112:                       <path d="M12 2v4h4" stroke="#555" strokeWidth="1.4" />
 113:                     </svg>
 114:                   </div>
 115:                 ) : (
 116:                   <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
 117:                     {a.thumbnail_url ? (
 118:                       // eslint-disable-next-line @next/next/no-img-element -- external thumbnail
 119:                       <img
 120:                         src={a.thumbnail_url}
 121:                         alt={a.title ?? "link"}
 122:                         className="w-full h-full rounded object-cover"
 123:                       />
 124:                     ) : (
 125:                       <svg
 126:                         width="18"
 127:                         height="18"
 128:                         viewBox="0 0 18 18"
 129:                         fill="none"
 130:                         aria-hidden="true"
 131:                       >
 132:                         <circle
 133:                           cx="9"
 134:                           cy="9"
 135:                           r="6.5"
 136:                           stroke="#555"
 137:                           strokeWidth="1.4"
 138:                         />
 139:                         <path
 140:                           d="M2.5 9h13M9 2.5c2 2 2 11 0 13M9 2.5c-2 2-2 11 0 13"
 141:                           stroke="#555"
 142:                           strokeWidth="1.2"
 143:                         />
 144:                       </svg>
 145:                     )}
 146:                   </div>
 147:                 )}
 148: 
 149:                 <div className="min-w-0 flex-1">
 150:                   <p className="text-sm font-medium text-foreground truncate keep-all">
 151:                     {displayLabel}
 152:                   </p>
 153:                   <p className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
 154:                     {a.kind}
 155:                     {a.provider && a.provider !== "generic" && (
 156:                       <span className="ml-1 text-muted-foreground/60">
 157:                         夷?{a.provider}
 158:                       </span>
 159:                     )}
 160:                   </p>
 161:                 </div>
 162:               </div>
 163: 
 164:               <div className="flex items-center gap-2 mt-3">
 165:                 <button
 166:                   type="button"
 167:                   onClick={() => void handleCopy(a.url)}
 168:                   className="rounded-full border border-border/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.10em] hover:bg-muted transition-colors"
 169:                 >
 170:                   {t("copyUrl")}
 171:                 </button>
 172:                 {(a.kind === "image" || a.kind === "pdf") && (
 173:                   <button
 174:                     type="button"
 175:                     onClick={() => handleDownload(a.url, a.filename)}
 176:                     className="rounded-full border border-border/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.10em] hover:bg-muted transition-colors"
 177:                   >
 178:                     {t("download")}
 179:                   </button>
 180:                 )}
 181:               </div>
 182:             </li>
 183:           );
 184:         })}
 185:       </ul>
 186:     </div>
 187:   );
 188: }
 189: 
 190: export default AssetListPanel;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql' | ForEach-Object { "'$i++; if ($i -ge 300 -and $i -le 380) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260429144523_phase_3_1_hotfix_3_attachments.sql' | ForEach-Object { "'$i++; if ($i -ge 345 -and $i -le 410) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\lib\\board\\asset-index.ts' | ForEach-Object { "'$i++; if ($i -le 230) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260429113853_phase_3_1_project_board.sql' | ForEach-Object { "'$i++; if ($i -ge 40 -and $i -le 82 -or $i -ge 112 -and $i -le 156) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 438ms:
 300: $$;
 301: 
 302: -- ============================================================
 303: -- FIX HIGH-A #1e: seed_project_board_from_wizard (5-arg) ??add auth gate
 304: -- ============================================================
 305: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
 306:   p_project_id            uuid,
 307:   p_initial_document      jsonb,
 308:   p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
 309:   p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
 310:   p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
 311: )
 312: RETURNS uuid
 313: LANGUAGE plpgsql
 314: SECURITY DEFINER
 315: SET search_path = public, pg_temp
 316: AS $$
 317: DECLARE
 318:   v_board_id       uuid;
 319:   v_project_status text;
 320:   v_caller_id      uuid := auth.uid();
 321: BEGIN
 322:   IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
 323:     SELECT 1 FROM projects p
 324:     WHERE p.id = p_project_id AND p.created_by = v_caller_id
 325:   ) THEN
 326:     RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
 327:   END IF;
 328: 
 329:   SELECT status INTO v_project_status
 330:   FROM projects
 331:   WHERE id = p_project_id;
 332: 
 333:   IF v_project_status IS NULL THEN
 334:     RAISE EXCEPTION 'project not found: %', p_project_id;
 335:   END IF;
 336: 
 337:   IF v_project_status != 'in_review' THEN
 338:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
 339:       p_project_id, v_project_status;
 340:   END IF;
 341: 
 342:   INSERT INTO project_boards (
 343:     project_id, document, attached_pdfs, attached_urls, asset_index, source
 344:   )
 345:   VALUES (
 346:     p_project_id, p_initial_document, p_initial_attached_pdfs,
 347:     p_initial_attached_urls, p_initial_asset_index, 'wizard_seed'
 348:   )
 349:   ON CONFLICT (project_id) DO UPDATE
 350:     SET document      = EXCLUDED.document,
 351:         attached_pdfs = EXCLUDED.attached_pdfs,
 352:         attached_urls = EXCLUDED.attached_urls,
 353:         asset_index   = EXCLUDED.asset_index,
 354:         source        = 'wizard_seed',
 355:         updated_at    = now()
 356:   RETURNING id INTO v_board_id;
 357: 
 358:   RETURN v_board_id;
 359: END;
 360: $$;
 361: 
 362: -- ============================================================
 363: -- FIX HIGH-A #2: Restrict project_boards_update_client policy +
 364: --                REVOKE direct column UPDATE on attachment/index columns
 365: -- ============================================================
 366: DROP POLICY IF EXISTS project_boards_update_client ON project_boards;
 367: 
 368: CREATE POLICY project_boards_update_client ON project_boards
 369:   FOR UPDATE
 370:   USING (
 371:     is_yagi_admin(auth.uid())
 372:     OR (
 373:       is_locked = false
 374:       AND project_id IN (
 375:         SELECT p.id FROM projects p
 376:         WHERE p.workspace_id IN (
 377:           SELECT workspace_members.workspace_id
 378:           FROM workspace_members
 379:           WHERE workspace_members.user_id = auth.uid()
 380:         )

 succeeded in 454ms:
 345: -- RPC: seed_project_board_from_wizard (EXTEND signature)
 346: -- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
 347: -- with DEFAULT empty array for backward compatibility with Phase 3.1 callers.
 348: -- Existing logic preserved (project must be in_review, UPSERT on project_id).
 349: -- ============================================================
 350: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
 351:   p_project_id           uuid,
 352:   p_initial_document     jsonb,
 353:   p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
 354:   p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
 355:   p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
 356: )
 357: RETURNS uuid
 358: LANGUAGE plpgsql
 359: SECURITY DEFINER
 360: SET search_path = public, pg_temp
 361: AS $$
 362: DECLARE
 363:   v_board_id       uuid;
 364:   v_project_status text;
 365: BEGIN
 366:   SELECT status INTO v_project_status
 367:   FROM projects
 368:   WHERE id = p_project_id;
 369: 
 370:   IF v_project_status IS NULL THEN
 371:     RAISE EXCEPTION 'project not found: %', p_project_id;
 372:   END IF;
 373: 
 374:   IF v_project_status != 'in_review' THEN
 375:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
 376:       p_project_id, v_project_status;
 377:   END IF;
 378: 
 379:   INSERT INTO project_boards (
 380:     project_id,
 381:     document,
 382:     attached_pdfs,
 383:     attached_urls,
 384:     asset_index,
 385:     source
 386:   )
 387:   VALUES (
 388:     p_project_id,
 389:     p_initial_document,
 390:     p_initial_attached_pdfs,
 391:     p_initial_attached_urls,
 392:     p_initial_asset_index,
 393:     'wizard_seed'
 394:   )
 395:   ON CONFLICT (project_id) DO UPDATE
 396:     SET document      = EXCLUDED.document,
 397:         attached_pdfs = EXCLUDED.attached_pdfs,
 398:         attached_urls = EXCLUDED.attached_urls,
 399:         asset_index   = EXCLUDED.asset_index,
 400:         source        = 'wizard_seed',
 401:         updated_at    = now()
 402:   RETURNING id INTO v_board_id;
 403: 
 404:   RETURN v_board_id;
 405: END;
 406: $$;

 succeeded in 432ms:
   1: /**
   2:  * asset-index.ts
   3:  * Phase 3.1 hotfix-3 ??Unified asset index normalizer merging three attachment sources:
   4:  *   1. Canvas shapes (yagi-image, yagi-pdf, yagi-url-card) from tldraw snapshot
   5:  *   2. attached_pdfs jsonb column entries
   6:  *   3. attached_urls jsonb column entries
   7:  *
   8:  * Trust boundary: server actions ALWAYS recompute asset_index server-side.
   9:  * Client NEVER supplies asset_index (K-05 + L-041).
  10:  *
  11:  * Pure function ??no I/O, no side effects, easily unit-testable.
  12:  */
  13: 
  14: // ============================================================
  15: // Attachment types (mirrors DB jsonb shape contracts)
  16: // ============================================================
  17: 
  18: export type PdfAttachment = {
  19:   id: string;
  20:   storage_key: string;
  21:   filename: string;
  22:   size_bytes: number;
  23:   uploaded_at: string; // ISO string
  24:   uploaded_by: string; // profile_id
  25: };
  26: 
  27: export type UrlAttachment = {
  28:   id: string;
  29:   url: string;
  30:   title: string | null;
  31:   thumbnail_url: string | null;
  32:   provider: "youtube" | "vimeo" | "generic";
  33:   note: string | null;
  34:   added_at: string; // ISO string
  35:   added_by: string; // profile_id
  36: };
  37: 
  38: // ============================================================
  39: // Unified asset index entry
  40: // ============================================================
  41: 
  42: export type AssetIndexEntry = {
  43:   id: string;
  44:   source: "canvas" | "attached_pdf" | "attached_url";
  45:   kind: "image" | "pdf" | "url";
  46:   // Common
  47:   url: string; // for canvas: R2 public URL; for url-attachment: the URL itself; for pdf-attachment: storage_key
  48:   title: string | null;
  49:   thumbnail_url: string | null;
  50:   // Canvas-only
  51:   shape_id?: string;
  52:   // PDF-only
  53:   filename?: string;
  54:   size_bytes?: number;
  55:   // URL-only (attached or canvas url-card)
  56:   provider?: "youtube" | "vimeo" | "generic";
  57:   // Memo (URL-attachment) or caption (canvas image-shape)
  58:   note: string | null;
  59:   added_at: string; // ISO string
  60:   // Set when same URL appears in both canvas url-card shapes AND attached_urls
  61:   duplicate?: boolean;
  62: };
  63: 
  64: // ============================================================
  65: // extractAssetIndex
  66: // Merges canvas shapes + attached_pdfs + attached_urls into a unified
  67: // flat AssetIndexEntry[].
  68: //
  69: // Sort order: attached items first (source !== 'canvas'), then canvas items,
  70: // within each group sorted by added_at ascending.
  71: //
  72: // Deduplication: if the same URL exists in both canvas url-card shapes AND
  73: // attached_urls, keep both entries ??mark the canvas entry with duplicate:true
  74: // (the attached_url entry has the explicit note and is preferred for display).
  75: //
  76: // Default params preserve backward compat with Phase 3.1 callers that only
  77: // pass the document argument.
  78: // ============================================================
  79: 
  80: export function extractAssetIndex(
  81:   document: Record<string, unknown> | null | undefined,
  82:   attached_pdfs: PdfAttachment[] = [],
  83:   attached_urls: UrlAttachment[] = []
  84: ): AssetIndexEntry[] {
  85:   const canvasEntries: AssetIndexEntry[] = [];
  86:   const attachedEntries: AssetIndexEntry[] = [];
  87: 
  88:   // --- Build set of URLs in attached_urls for dedup check ---
  89:   const attachedUrlSet = new Set<string>(
  90:     attached_urls.map((u) => u.url.toLowerCase().trim())
  91:   );
  92: 
  93:   // --- Extract canvas shapes ---
  94:   if (document && typeof document === "object") {
  95:     const store = document.store as Record<string, unknown> | undefined;
  96:     if (store && typeof store === "object") {
  97:       for (const [key, record] of Object.entries(store)) {
  98:         if (!key.startsWith("shape:")) continue;
  99:         if (typeof record !== "object" || record === null) continue;
 100: 
 101:         const shape = record as {
 102:           type?: string;
 103:           id?: string;
 104:           props?: Record<string, unknown>;
 105:           meta?: Record<string, unknown>;
 106:         };
 107: 
 108:         if (!shape.type || !shape.props) continue;
 109: 
 110:         const addedAt =
 111:           typeof shape.meta?.createdAt === "string"
 112:             ? shape.meta.createdAt
 113:             : typeof shape.meta?.addedAt === "string"
 114:               ? shape.meta.addedAt
 115:               : new Date(0).toISOString();
 116: 
 117:         switch (shape.type) {
 118:           case "yagi-image": {
 119:             const src = shape.props.src as string | undefined;
 120:             if (src) {
 121:               canvasEntries.push({
 122:                 id: shape.id ?? key,
 123:                 source: "canvas",
 124:                 kind: "image",
 125:                 url: src,
 126:                 title: (shape.props.alt as string) || null,
 127:                 thumbnail_url: null,
 128:                 shape_id: shape.id ?? key,
 129:                 note: null,
 130:                 added_at: addedAt,
 131:               });
 132:             }
 133:             break;
 134:           }
 135:           case "yagi-pdf": {
 136:             const src = shape.props.src as string | undefined;
 137:             const filename = shape.props.filename as string | undefined;
 138:             if (src) {
 139:               canvasEntries.push({
 140:                 id: shape.id ?? key,
 141:                 source: "canvas",
 142:                 kind: "pdf",
 143:                 url: src,
 144:                 title: filename ?? null,
 145:                 thumbnail_url: null,
 146:                 shape_id: shape.id ?? key,
 147:                 filename,
 148:                 note: null,
 149:                 added_at: addedAt,
 150:               });
 151:             }
 152:             break;
 153:           }
 154:           case "yagi-url-card": {
 155:             const src = shape.props.url as string | undefined;
 156:             const title = shape.props.title as string | undefined;
 157:             const domain = shape.props.domain as string | undefined;
 158:             if (src) {
 159:               const isDuplicate = attachedUrlSet.has(
 160:                 src.toLowerCase().trim()
 161:               );
 162:               canvasEntries.push({
 163:                 id: shape.id ?? key,
 164:                 source: "canvas",
 165:                 kind: "url",
 166:                 url: src,
 167:                 title: title ?? domain ?? null,
 168:                 thumbnail_url: null,
 169:                 shape_id: shape.id ?? key,
 170:                 note: null,
 171:                 added_at: addedAt,
 172:                 ...(isDuplicate ? { duplicate: true } : {}),
 173:               });
 174:             }
 175:             break;
 176:           }
 177:         }
 178:       }
 179:     }
 180:   }
 181: 
 182:   // --- Map attached_pdfs ---
 183:   for (const pdf of attached_pdfs) {
 184:     attachedEntries.push({
 185:       id: pdf.id,
 186:       source: "attached_pdf",
 187:       kind: "pdf",
 188:       url: pdf.storage_key, // storage_key is the canonical reference; public URL built in display layer
 189:       title: pdf.filename,
 190:       thumbnail_url: null,
 191:       filename: pdf.filename,
 192:       size_bytes: pdf.size_bytes,
 193:       note: null,
 194:       added_at: pdf.uploaded_at,
 195:     });
 196:   }
 197: 
 198:   // --- Map attached_urls ---
 199:   for (const urlEntry of attached_urls) {
 200:     attachedEntries.push({
 201:       id: urlEntry.id,
 202:       source: "attached_url",
 203:       kind: "url",
 204:       url: urlEntry.url,
 205:       title: urlEntry.title,
 206:       thumbnail_url: urlEntry.thumbnail_url,
 207:       provider: urlEntry.provider,
 208:       note: urlEntry.note,
 209:       added_at: urlEntry.added_at,
 210:     });
 211:   }
 212: 
 213:   // --- Sort each group by added_at ascending ---
 214:   const sortByAddedAt = (a: AssetIndexEntry, b: AssetIndexEntry) =>
 215:     a.added_at.localeCompare(b.added_at);
 216: 
 217:   attachedEntries.sort(sortByAddedAt);
 218:   canvasEntries.sort(sortByAddedAt);
 219: 
 220:   // --- Result: attached first, then canvas ---
 221:   return [...attachedEntries, ...canvasEntries];
 222: }

 succeeded in 460ms:
  40: -- RLS: project_boards
  41: -- ============================================================
  42: ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
  43: 
  44: CREATE POLICY project_boards_select_client ON project_boards
  45:   FOR SELECT
  46:   USING (
  47:     is_yagi_admin(auth.uid())
  48:     OR project_id IN (
  49:       SELECT p.id FROM projects p
  50:       WHERE p.workspace_id IN (
  51:         SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  52:       )
  53:     )
  54:   );
  55: 
  56: CREATE POLICY project_boards_insert_via_rpc ON project_boards
  57:   FOR INSERT
  58:   WITH CHECK (false);
  59: 
  60: CREATE POLICY project_boards_update_client ON project_boards
  61:   FOR UPDATE
  62:   USING (
  63:     is_yagi_admin(auth.uid())
  64:     OR (
  65:       is_locked = false
  66:       AND project_id IN (
  67:         SELECT p.id FROM projects p
  68:         WHERE p.workspace_id IN (
  69:           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  70:         )
  71:       )
  72:     )
  73:   )
  74:   WITH CHECK (
  75:     is_yagi_admin(auth.uid())
  76:     OR (
  77:       is_locked = false
  78:       AND project_id IN (
  79:         SELECT p.id FROM projects p
  80:         WHERE p.workspace_id IN (
  81:           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  82:         )
 112: -- RPC: seed_project_board_from_wizard
 113: -- ============================================================
 114: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
 115:   p_project_id      uuid,
 116:   p_initial_document jsonb
 117: )
 118: RETURNS uuid
 119: LANGUAGE plpgsql
 120: SECURITY DEFINER
 121: SET search_path = public
 122: AS $$
 123: DECLARE
 124:   v_board_id uuid;
 125:   v_project_status text;
 126: BEGIN
 127:   SELECT status INTO v_project_status
 128:   FROM projects
 129:   WHERE id = p_project_id;
 130: 
 131:   IF v_project_status IS NULL THEN
 132:     RAISE EXCEPTION 'project not found: %', p_project_id;
 133:   END IF;
 134: 
 135:   IF v_project_status != 'in_review' THEN
 136:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
 137:       p_project_id, v_project_status;
 138:   END IF;
 139: 
 140:   INSERT INTO project_boards (project_id, document, source)
 141:   VALUES (p_project_id, p_initial_document, 'wizard_seed')
 142:   ON CONFLICT (project_id) DO UPDATE
 143:     SET document   = EXCLUDED.document,
 144:         source     = 'wizard_seed',
 145:         updated_at = now()
 146:   RETURNING id INTO v_board_id;
 147: 
 148:   RETURN v_board_id;
 149: END;
 150: $$;
 151: 
 152: -- ============================================================
 153: -- RPC: init_project_board
 154: -- ============================================================
 155: CREATE OR REPLACE FUNCTION init_project_board(
 156:   p_project_id uuid

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\components\\project-board\\attachments-section.tsx' | ForEach-Object { "'$i++; if ($i -le 260) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\admin\\projects\\[id]\\page.tsx' | ForEach-Object { "'$i++; if ($i -le 120) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"storage_key|createBriefAssetGetUrl|briefObjectPublicUrl|attached_pdfs|AssetIndexEntry|kind === \\\"pdf\\\"|kind === 'pdf'|source === \\\"attached_pdf\\\"|source === 'attached_pdf'\" src\\components src\\app\\[locale]\\app\\projects" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"get.*Board.*Asset|BoardAsset.*Get|createBriefAssetGetUrl|briefObjectPublicUrl|project-board|board-assets\" src\\app src\\components src\\lib" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 544ms:
   1: "use client";
   2: 
   3: /**
   4:  * attachments-section.tsx
   5:  * Phase 3.1 hotfix-3 ??Shared AttachmentsSection component.
   6:  * Used in wizard Step 2 (boardId=null, mode=wizard) and project detail brief mode.
   7:  *
   8:  * Design system v0.2.0 compliance (L-018 read before coding):
   9:  *   - L-010: font-suit eyebrows (text-xs uppercase tracking-wider)
  10:  *   - L-011: achromatic only (no color accents)
  11:  *   - L-012: no internal page seams ??section dividers are hairline borders
  12:  *   - L-013: soft shadow + border-border/40 on cards (no harsh 1px)
  13:  *   - L-014: no italic em
  14:  *
  15:  * URL security (L-042 candidate):
  16:  *   - Rejects javascript:, data:, file:, chrome: schemes at client layer
  17:  *   - Only http:// and https:// allowed
  18:  */
  19: 
  20: import { useRef, useState } from "react";
  21: import { useTranslations } from "next-intl";
  22: import { PdfCard } from "./attachments/pdf-card";
  23: import { UrlCard } from "./attachments/url-card";
  24: import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";
  25: 
  26: // ============================================================
  27: // Props
  28: // ============================================================
  29: 
  30: type Props = {
  31:   mode: "wizard" | "brief";
  32:   boardId: string | null; // null in wizard (board doesn't exist yet)
  33:   pdfs: PdfAttachment[];
  34:   urls: UrlAttachment[];
  35:   onPdfAdd: (file: File) => Promise<void>;
  36:   onPdfRemove: (id: string) => Promise<void>;
  37:   onUrlAdd: (url: string, note: string | null) => Promise<void>;
  38:   onUrlNoteUpdate: (id: string, note: string) => Promise<void>;
  39:   onUrlRemove: (id: string) => Promise<void>;
  40:   isLocked: boolean;
  41:   isReadOnly: boolean; // mobile read-only OR legacy state
  42: };
  43: 
  44: // ============================================================
  45: // URL validation helpers (client-side, L-042)
  46: // ============================================================
  47: 
  48: const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "chrome:", "blob:", "vbscript:"];
  49: 
  50: function isValidUrl(raw: string): { valid: boolean; reason?: string } {
  51:   let parsed: URL;
  52:   try {
  53:     parsed = new URL(raw);
  54:   } catch {
  55:     return { valid: false, reason: "parse_error" };
  56:   }
  57: 
  58:   // Only http/https allowed
  59:   if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
  60:     return { valid: false, reason: "scheme" };
  61:   }
  62: 
  63:   // Belt-and-suspenders: explicitly reject dangerous schemes even if above passes
  64:   const lower = raw.toLowerCase().trim();
  65:   for (const blocked of BLOCKED_SCHEMES) {
  66:     if (lower.startsWith(blocked)) {
  67:       return { valid: false, reason: "scheme" };
  68:     }
  69:   }
  70: 
  71:   return { valid: true };
  72: }
  73: 
  74: function detectProvider(url: string): UrlAttachment["provider"] {
  75:   try {
  76:     const parsed = new URL(url);
  77:     const host = parsed.hostname.replace(/^www\./, "");
  78:     if (host === "youtube.com" || host === "youtu.be") return "youtube";
  79:     if (host === "vimeo.com") return "vimeo";
  80:   } catch {
  81:     // ignore
  82:   }
  83:   return "generic";
  84: }
  85: 
  86: // ============================================================
  87: // Component
  88: // ============================================================
  89: 
  90: export function AttachmentsSection({
  91:   pdfs,
  92:   urls,
  93:   onPdfAdd,
  94:   onPdfRemove,
  95:   onUrlAdd,
  96:   onUrlNoteUpdate,
  97:   onUrlRemove,
  98:   isLocked,
  99:   isReadOnly,
 100: }: Props) {
 101:   const t = useTranslations("attachments");
 102:   const fileInputRef = useRef<HTMLInputElement>(null);
 103: 
 104:   // URL form state
 105:   const [urlInput, setUrlInput] = useState("");
 106:   const [noteInput, setNoteInput] = useState("");
 107:   const [urlError, setUrlError] = useState("");
 108:   const [urlSubmitting, setUrlSubmitting] = useState(false);
 109: 
 110:   // PDF drag state
 111:   const [pdfDragActive, setPdfDragActive] = useState(false);
 112:   const [pdfError, setPdfError] = useState("");
 113:   const [pdfUploading, setPdfUploading] = useState(false);
 114: 
 115:   const mutationsDisabled = isLocked || isReadOnly;
 116: 
 117:   // ============================================================
 118:   // PDF handlers
 119:   // ============================================================
 120: 
 121:   const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20MB (L-042: per task_01 RPC)
 122:   const PDF_MAX_COUNT = 30;
 123: 
 124:   async function handlePdfFile(file: File) {
 125:     setPdfError("");
 126: 
 127:     if (file.type !== "application/pdf") {
 128:       setPdfError("PDF ???뵬筌???낆쨮??揶쎛?館鍮??덈뼄.");
 129:       return;
 130:     }
 131: 
 132:     if (file.size > PDF_MAX_BYTES) {
 133:       setPdfError(t("pdf.size_too_large"));
 134:       return;
 135:     }
 136: 
 137:     if (pdfs.length >= PDF_MAX_COUNT) {
 138:       setPdfError(t("pdf.count_exceeded"));
 139:       return;
 140:     }
 141: 
 142:     setPdfUploading(true);
 143:     try {
 144:       await onPdfAdd(file);
 145:     } catch (err) {
 146:       console.error("[AttachmentsSection] PDF add failed:", err);
 147:       setPdfError("??낆쨮??餓???살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄. ??쇰뻻 ??뺣즲??곻폒?紐꾩뒄.");
 148:     } finally {
 149:       setPdfUploading(false);
 150:     }
 151:   }
 152: 
 153:   function handleFilePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
 154:     const file = e.target.files?.[0];
 155:     if (file) handlePdfFile(file);
 156:     // Reset input so the same file can be re-selected
 157:     e.target.value = "";
 158:   }
 159: 
 160:   function handlePdfDragOver(e: React.DragEvent<HTMLDivElement>) {
 161:     e.preventDefault();
 162:     if (!mutationsDisabled) setPdfDragActive(true);
 163:   }
 164: 
 165:   function handlePdfDragLeave() {
 166:     setPdfDragActive(false);
 167:   }
 168: 
 169:   async function handlePdfDrop(e: React.DragEvent<HTMLDivElement>) {
 170:     e.preventDefault();
 171:     setPdfDragActive(false);
 172:     if (mutationsDisabled) return;
 173: 
 174:     const file = Array.from(e.dataTransfer.files).find(
 175:       (f) => f.type === "application/pdf"
 176:     );
 177:     if (file) await handlePdfFile(file);
 178:   }
 179: 
 180:   // ============================================================
 181:   // URL handlers
 182:   // ============================================================
 183: 
 184:   const URL_MAX_COUNT = 50;
 185: 
 186:   async function handleUrlSubmit(e: React.FormEvent) {
 187:     e.preventDefault();
 188:     setUrlError("");
 189: 
 190:     const trimmed = urlInput.trim();
 191:     const { valid } = isValidUrl(trimmed);
 192: 
 193:     if (!valid) {
 194:       setUrlError(t("url.invalid"));
 195:       return;
 196:     }
 197: 
 198:     if (urls.length >= URL_MAX_COUNT) {
 199:       setUrlError(t("url.count_exceeded"));
 200:       return;
 201:     }
 202: 
 203:     setUrlSubmitting(true);
 204:     try {
 205:       await onUrlAdd(trimmed, noteInput.trim() || null);
 206:       setUrlInput("");
 207:       setNoteInput("");
 208:     } catch (err) {
 209:       console.error("[AttachmentsSection] URL add failed:", err);
 210:       setUrlError("筌띻낱寃??곕떽? 餓???살첒揶쎛 獄쏆뮇源??됰뮸??덈뼄.");
 211:     } finally {
 212:       setUrlSubmitting(false);
 213:     }
 214:   }
 215: 
 216:   function handleUrlNoteUpdate(id: string, note: string) {
 217:     onUrlNoteUpdate(id, note).catch((err) => {
 218:       console.error("[AttachmentsSection] URL note update failed:", err);
 219:     });
 220:   }
 221: 
 222:   // ============================================================
 223:   // Render
 224:   // ============================================================
 225: 
 226:   return (
 227:     <div className="space-y-0">
 228:       {/* ?????????????????????????????????????? PDF SECTION ?????????????????????????????????????? */}
 229:       <section
 230:         onDragOver={handlePdfDragOver}
 231:         onDragLeave={handlePdfDragLeave}
 232:         onDrop={handlePdfDrop}
 233:         className={[
 234:           "py-6 rounded-md transition-colors",
 235:           pdfDragActive ? "bg-muted/40" : "",
 236:         ]
 237:           .filter(Boolean)
 238:           .join(" ")}
 239:         aria-label="PDF attachments"
 240:       >
 241:         {/* Eyebrow ??L-010: font-suit text-xs uppercase tracking-wider */}
 242:         <p className="font-suit text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/70 mb-1">
 243:           {t("pdf.eyebrow")}
 244:         </p>
 245:         <p className="font-suit text-sm text-muted-foreground mb-4">
 246:           {t("pdf.sub")}
 247:         </p>
 248: 
 249:         {/* Add button */}
 250:         {!mutationsDisabled && (
 251:           <div className="mb-4">
 252:             <button
 253:               type="button"
 254:               onClick={() => fileInputRef.current?.click()}
 255:               disabled={pdfUploading}
 256:               className="font-suit text-sm rounded-md px-4 py-2 border border-border/40 text-foreground hover:bg-muted transition-colors disabled:opacity-50"
 257:               style={{
 258:                 boxShadow:
 259:                   "0 1px 2px rgba(0,0,0,0.04)",
 260:               }}

 succeeded in 547ms:
   1: // Phase 3.1 task_07 ??Admin project detail page with right-rail asset panel.
   2: // Auth: yagi_admin only (user_roles check; non-admin ??notFound).
   3: // Reads project_boards.asset_index server-side and renders AssetListPanel.
   4: // Design: achromatic (L-011), soft shadow (L-013), font-suit (L-010), no seams (L-012).
   5: 
   6: import { notFound } from "next/navigation";
   7: import Link from "next/link";
   8: import { getTranslations } from "next-intl/server";
   9: import { createSupabaseServer } from "@/lib/supabase/server";
  10: import { AssetListPanel } from "@/components/admin/asset-list-panel";
  11: import { StatusBadge } from "@/components/projects/status-badge";
  12: import type { Status } from "@/components/projects/status-badge";
  13: import type { AssetIndexEntry } from "@/lib/board/asset-index";
  14: 
  15: type Props = {
  16:   params: Promise<{ locale: string; id: string }>;
  17: };
  18: 
  19: export default async function AdminProjectDetailPage({ params }: Props) {
  20:   const { locale, id } = await params;
  21:   const tAdmin = await getTranslations("admin");
  22:   const tDetail = await getTranslations("admin.projects.detail");
  23: 
  24:   const supabase = await createSupabaseServer();
  25:   const {
  26:     data: { user },
  27:   } = await supabase.auth.getUser();
  28:   if (!user) notFound();
  29: 
  30:   // yagi_admin role check
  31:   const { data: roleRows } = await supabase
  32:     .from("user_roles")
  33:     .select("role")
  34:     .eq("user_id", user.id);
  35:   const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");
  36:   if (!isYagiAdmin) notFound();
  37: 
  38:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/3.1 columns not in generated types
  39:   const sb = supabase as any;
  40: 
  41:   const { data: projectRaw, error: projectErr } = await sb
  42:     .from("projects")
  43:     .select(
  44:       `
  45:       id, title, brief, status,
  46:       deliverable_types, estimated_budget_range,
  47:       target_delivery_at, meeting_preferred_at, submitted_at, created_at,
  48:       created_by,
  49:       brand:brands(id, name),
  50:       workspace:workspaces(id, name)
  51:     `
  52:     )
  53:     .eq("id", id)
  54:     .maybeSingle();
  55: 
  56:   if (projectErr || !projectRaw) notFound();
  57: 
  58:   const { data: creatorProfile } = await supabase
  59:     .from("profiles")
  60:     .select("display_name, handle")
  61:     .eq("id", projectRaw.created_by as string)
  62:     .maybeSingle();
  63: 
  64:   // Fetch project_boards.asset_index (Phase 3.1)
  65:   const { data: boardRow } = await sb
  66:     .from("project_boards")
  67:     .select("id, asset_index, is_locked")
  68:     .eq("project_id", id)
  69:     .maybeSingle();
  70: 
  71:   const assetIndex: AssetIndexEntry[] = Array.isArray(boardRow?.asset_index)
  72:     ? (boardRow.asset_index as AssetIndexEntry[])
  73:     : [];
  74: 
  75:   const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  76:   const fmtDateTime = new Intl.DateTimeFormat(locale, {
  77:     dateStyle: "medium",
  78:     timeStyle: "short",
  79:   });
  80:   const submittedAt = projectRaw.submitted_at
  81:     ? fmt.format(new Date(projectRaw.submitted_at as string))
  82:     : null;
  83:   const targetDelivery = projectRaw.target_delivery_at
  84:     ? fmt.format(new Date(projectRaw.target_delivery_at as string))
  85:     : null;
  86:   // Phase 3.1 hotfix-3 addendum: optional preferred meeting datetime
  87:   // (cast: meeting_preferred_at column added in 20260430075826 ??types regen in task_10)
  88:   const meetingPreferredAtRaw = (projectRaw as { meeting_preferred_at?: string | null })
  89:     .meeting_preferred_at;
  90:   const meetingPreferredAt = meetingPreferredAtRaw
  91:     ? fmtDateTime.format(new Date(meetingPreferredAtRaw))
  92:     : null;
  93: 
  94:   const brand = Array.isArray(projectRaw.brand)
  95:     ? projectRaw.brand[0]
  96:     : projectRaw.brand;
  97:   const workspace = Array.isArray(projectRaw.workspace)
  98:     ? projectRaw.workspace[0]
  99:     : projectRaw.workspace;
 100:   const workspaceName = workspace?.name ?? "??;
 101:   const brandName = brand?.name ?? null;
 102:   const clientName =
 103:     creatorProfile?.display_name ?? creatorProfile?.handle ?? "??;
 104: 
 105:   return (
 106:     <div className="px-6 md:px-10 py-10 max-w-6xl">
 107:       {/* Breadcrumb */}
 108:       <nav
 109:         aria-label="breadcrumb"
 110:         className="mb-6 text-sm text-muted-foreground"
 111:       >
 112:         <Link
 113:           href={`/${locale}/app/admin/projects`}
 114:           className="hover:text-foreground transition-colors"
 115:         >
 116:           {tAdmin("projects_tab")}
 117:         </Link>
 118:         <span className="mx-1.5 text-muted-foreground/60">??/span>
 119:         <span className="font-semibold text-foreground keep-all">
 120:           {projectRaw.title as string}

2026-05-03T15:49:00.604284Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
rg: ===: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: 'pdf'|source: ?뚯씪 ?대쫫, ?붾젆?곕━ ?대쫫 ?먮뒗 蹂쇰ⅷ ?덉씠釉?援щЦ???섎せ?섏뿀?듬땲?? (os error 123)
rg: ===: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: \attached_pdf\|source: 吏?뺣맂 寃쎈줈瑜?李얠쓣 ???놁뒿?덈떎. (os error 3)
rg: ===: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: 'attached_pdf' src\components src\app\[locale]\app\projects: 吏?뺣맂 寃쎈줈瑜?李얠쓣 ???놁뒿?덈떎. (os error 3)

 exited 1 in 485ms:
rg: ===: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: 'pdf'|source: ?뚯씪 ?대쫫, ?붾젆?곕━ ?대쫫 ?먮뒗 蹂쇰ⅷ ?덉씠釉?援щЦ???섎せ?섏뿀?듬땲?? (os error 123)
rg: ===: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: \attached_pdf\|source: 吏?뺣맂 寃쎈줈瑜?李얠쓣 ???놁뒿?덈떎. (os error 3)
rg: ===: 吏?뺣맂 ?뚯씪??李얠쓣 ???놁뒿?덈떎. (os error 2)
rg: 'attached_pdf' src\components src\app\[locale]\app\projects: 吏?뺣맂 寃쎈줈瑜?李얠쓣 ???놁뒿?덈떎. (os error 3)

 succeeded in 625ms:
src\lib\r2\client.ts:143:export function briefObjectPublicUrl(key: string): string {
src\lib\r2\client.ts:172:export async function createBriefAssetGetUrl(
src\components\project-detail\board-tab.tsx:20:import { BriefBoardShellClient } from "@/components/project-board/brief-board-shell-client";
src\components\project-detail\board-tab.tsx:21:import type { VersionEntry } from "@/components/project-board/version-history-panel";
src\components\project-board\brief-board-shell-client.tsx:126:      {/* L-033: canvas-internal PDF/URL drop preserved separately in project-board.tsx */}
src\components\project-board\brief-board-client.tsx:14:import { ProjectBoard } from "./project-board";
src\components\project-board\brief-board-attachments-client.tsx:17: * L-033: Canvas-internal PDF/URL drop is separate (handled in project-board.tsx).
src\components\project-board\project-board.tsx:4: * project-board.tsx
src\components\project-board\project-board.tsx:37:  getBoardAssetPutUrlAction,
src\components\project-board\project-board.tsx:80:  const result = await getBoardAssetPutUrlAction(file.type);
src\app\[locale]\app\projects\new\new-project-wizard.tsx:56:import { ProjectBoard } from "@/components/project-board/project-board";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:57:import { AttachmentsSection } from "@/components/project-board/attachments-section";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:60:import { getBoardAssetPutUrlAction, fetchVideoMetadataAction } from "./actions";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:192:// See src/components/project-board/project-board.tsx
src\app\[locale]\app\projects\new\new-project-wizard.tsx:418:    const result = await getBoardAssetPutUrlAction(file.type);
src\app\[locale]\app\projects\new\new-project-wizard.tsx:433:    // storage_key for wizard PDFs uses the board-assets prefix that
src\app\[locale]\app\projects\new\new-project-wizard.tsx:434:    // getBoardAssetPutUrlAction generated server-side. Extract the path
src\app\[locale]\app\projects\new\new-project-wizard.tsx:436:    // matches the actual R2 object key ??board-assets/<user>/<uuid>.pdf.
src\app\[locale]\app\projects\new\new-project-wizard.tsx:440:    // Companion sub_03f_1 migration adds `board-assets/` to the RPC
src\app\[locale]\app\projects\new\actions.ts:465:  briefObjectPublicUrl,
src\app\[locale]\app\projects\new\actions.ts:471:// objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
src\app\[locale]\app\projects\new\actions.ts:498:// getBoardAssetPutUrlAction below.
src\app\[locale]\app\projects\new\actions.ts:508:        k.startsWith("board-assets/") ||
src\app\[locale]\app\projects\new\actions.ts:546:  // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
src\app\[locale]\app\projects\new\actions.ts:551:    `board-assets/${user.id}/`,
src\app\[locale]\app\projects\new\actions.ts:565:    // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
src\app\[locale]\app\projects\new\actions.ts:568:    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
src\app\[locale]\app\projects\new\actions.ts:584:export async function getBoardAssetPutUrlAction(
src\app\[locale]\app\projects\new\actions.ts:603:  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
src\app\[locale]\app\projects\new\actions.ts:612:    const pubUrl = briefObjectPublicUrl(storageKey);
src\app\[locale]\app\projects\new\actions.ts:615:    console.error("[getBoardAssetPutUrlAction] presign failed:", err);
src\app\[locale]\app\projects\[id]\board-actions.ts:31:  briefObjectPublicUrl,
src\app\[locale]\app\projects\[id]\board-actions.ts:508:  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
src\app\[locale]\app\projects\[id]\brief\actions.ts:26:  createBriefAssetGetUrl,
src\app\[locale]\app\projects\[id]\brief\actions.ts:591:    url = await createBriefAssetGetUrl(asset.storage_key);

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\components\\project-board\\attachments\\pdf-card.tsx' | ForEach-Object { "'$i++; if ($i -le 220) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\components\\project-board\\project-board.tsx' | ForEach-Object { "'$i++; if ($i -le 140 -or ($i -ge 250 -and $i -le 380)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\components\\project-board\\brief-board-attachments-client.tsx' | ForEach-Object { "'$i++; if ($i -le 200) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\components\\project-board\\asset-action-menu.tsx' | ForEach-Object { "'$i++; if ($i -le 220) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 463ms:
   1: "use client";
   2: 
   3: /**
   4:  * pdf-card.tsx
   5:  * Phase 3.1 hotfix-3 ??PDF attachment card for AttachmentsSection.
   6:  * Design system v0.2.0 compliance:
   7:  *   - L-013: soft shadow OR border-border/40 (no harsh 1px)
   8:  *   - L-011: achromatic only (no color accents)
   9:  *   - L-014: no italic em
  10:  */
  11: 
  12: import { useState } from "react";
  13: import { useTranslations } from "next-intl";
  14: import type { PdfAttachment } from "@/lib/board/asset-index";
  15: 
  16: type Props = {
  17:   pdf: PdfAttachment;
  18:   onRemove: (id: string) => void;
  19:   disabled: boolean;
  20: };
  21: 
  22: function formatBytes(bytes: number): string {
  23:   if (bytes < 1024) return `${bytes} B`;
  24:   if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  25:   return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  26: }
  27: 
  28: function formatDate(isoString: string): string {
  29:   try {
  30:     return new Date(isoString).toLocaleDateString(undefined, {
  31:       year: "numeric",
  32:       month: "short",
  33:       day: "numeric",
  34:     });
  35:   } catch {
  36:     return isoString;
  37:   }
  38: }
  39: 
  40: export function PdfCard({ pdf, onRemove, disabled }: Props) {
  41:   const t = useTranslations("attachments.pdf");
  42:   const [hovered, setHovered] = useState(false);
  43: 
  44:   return (
  45:     <div
  46:       onMouseEnter={() => setHovered(true)}
  47:       onMouseLeave={() => setHovered(false)}
  48:       className="relative flex items-start gap-3 rounded-md p-3 border border-border/40"
  49:       style={{
  50:         boxShadow:
  51:           "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
  52:         background: "#ffffff",
  53:       }}
  54:     >
  55:       {/* PDF icon */}
  56:       <span
  57:         className="text-lg shrink-0 mt-0.5"
  58:         aria-hidden="true"
  59:         style={{ lineHeight: 1 }}
  60:       >
  61:         ?諭?
  62:       </span>
  63: 
  64:       {/* Content */}
  65:       <div className="flex-1 min-w-0">
  66:         <p className="font-suit text-sm font-medium text-foreground truncate">
  67:           {pdf.filename}
  68:         </p>
  69:         <p className="font-suit text-xs text-muted-foreground mt-0.5">
  70:           {formatBytes(pdf.size_bytes)} &middot;{" "}
  71:           {t("uploaded_at", { date: formatDate(pdf.uploaded_at) })}
  72:         </p>
  73:       </div>
  74: 
  75:       {/* Remove button ??hover-only, disabled when locked/readonly */}
  76:       {!disabled && hovered && (
  77:         <button
  78:           type="button"
  79:           onClick={() => onRemove(pdf.id)}
  80:           aria-label="Remove PDF attachment"
  81:           className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
  82:           style={{ lineHeight: 1 }}
  83:         >
  84:           ??
  85:         </button>
  86:       )}
  87:     </div>
  88:   );
  89: }

 succeeded in 497ms:
   1: "use client";
   2: 
   3: /**
   4:  * project-board.tsx
   5:  * Phase 3.1 ??Unified ProjectBoard component (tldraw infinite canvas)
   6:  *
   7:  * Decision Q4: Wizard board + Brief Board = same component, mode prop differentiates.
   8:  * Decision Q-C: URL-bound shapes only ??NO tldraw internal asset store.
   9:  * Decision Q-D: Empty canvas overlay fades when first shape placed.
  10:  * Decision Q2: Infinite canvas + pan/zoom. Mobile = read-only.
  11:  *
  12:  * REGION OWNERSHIP:
  13:  *   task_02 (this file): shell + shape registration + theme + mobile detection + empty overlay
  14:  *   task_03: fills TASK_03_STUB regions ??drop handlers + asset menu wiring (DONE)
  15:  *   task_05: fills TASK_05_STUB regions ??brief mode features (version history, lock)
  16:  */
  17: 
  18: import "./tldraw-theme.css";
  19: // Note: ./shapes/yagi-shape-types.d.ts contains module augmentation declarations
  20: // for TLGlobalShapePropsMap. It is type-only (.d.ts) so cannot be imported as a
  21: // runtime module (webpack rejects). TS auto-includes .d.ts files in the project,
  22: // so the augmentation is in scope without explicit import.
  23: 
  24: import React from "react";
  25: import {
  26:   Tldraw,
  27:   Editor,
  28:   TLAnyShapeUtilConstructor,
  29:   createShapeId,
  30: } from "@tldraw/tldraw";
  31: import "@tldraw/tldraw/tldraw.css";
  32: import { useCallback, useEffect, useRef, useState } from "react";
  33: import { useTranslations } from "next-intl";
  34: 
  35: import { AssetActionMenu } from "./asset-action-menu";
  36: import {
  37:   getBoardAssetPutUrlAction,
  38:   fetchVideoMetadataAction,
  39: } from "@/app/[locale]/app/projects/new/actions";
  40: 
  41: import { ImageShapeUtil } from "./shapes/image-shape";
  42: import { UrlCardShapeUtil } from "./shapes/url-card-shape";
  43: import { PdfShapeUtil } from "./shapes/pdf-shape";
  44: import { EmptyOverlay } from "./empty-overlay";
  45: 
  46: // ============================================================
  47: // Custom shape utils ??registered with tldraw
  48: // ============================================================
  49: 
  50: const CUSTOM_SHAPE_UTILS: TLAnyShapeUtilConstructor[] = [
  51:   ImageShapeUtil,
  52:   UrlCardShapeUtil,
  53:   PdfShapeUtil,
  54: ];
  55: 
  56: // ============================================================
  57: // Image/PDF size limits (client-side validation ??server validates again)
  58: // ============================================================
  59: 
  60: const IMAGE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
  61: const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB
  62: 
  63: // ============================================================
  64: // Asset action menu state type
  65: // ============================================================
  66: 
  67: type AssetMenuState = {
  68:   shapeType: "yagi-image" | "yagi-pdf" | "yagi-url-card";
  69:   src: string;
  70:   position: { x: number; y: number };
  71: } | null;
  72: 
  73: // ============================================================
  74: // Upload helper ??calls server action for presigned PUT, then fetches R2.
  75: // K-05 LOOP 1 HIGH-A F7 fix: server generates the storage key (UUID-based),
  76: // the client only forwards the file's content type. Filename is NOT trusted.
  77: // ============================================================
  78: 
  79: async function uploadFileToR2(file: File): Promise<string | null> {
  80:   const result = await getBoardAssetPutUrlAction(file.type);
  81:   if (!result.ok) {
  82:     console.error("[ProjectBoard] presign failed:", result.error);
  83:     return null;
  84:   }
  85: 
  86:   const putResponse = await fetch(result.putUrl, {
  87:     method: "PUT",
  88:     body: file,
  89:     headers: { "Content-Type": file.type },
  90:   });
  91: 
  92:   if (!putResponse.ok) {
  93:     console.error("[ProjectBoard] R2 PUT failed:", putResponse.status);
  94:     return null;
  95:   }
  96: 
  97:   return result.publicUrl;
  98: }
  99: 
 100: // ============================================================
 101: // Mobile detection hook
 102: // ============================================================
 103: 
 104: function useIsMobileReadOnly(): boolean {
 105:   const [isMobile, setIsMobile] = useState(false);
 106: 
 107:   useEffect(() => {
 108:     if (typeof window === "undefined") return;
 109: 
 110:     const mql = window.matchMedia("(hover: none) and (max-width: 768px)");
 111: 
 112:     const handleChange = (e: MediaQueryListEvent) => {
 113:       setIsMobile(e.matches);
 114:     };
 115: 
 116:     setIsMobile(mql.matches);
 117:     mql.addEventListener("change", handleChange);
 118: 
 119:     return () => mql.removeEventListener("change", handleChange);
 120:   }, []);
 121: 
 122:   return isMobile;
 123: }
 124: 
 125: // ============================================================
 126: // Props
 127: // ============================================================
 128: 
 129: export interface ProjectBoardProps {
 130:   /** Mode differentiates wizard step 2 vs project detail brief board */
 131:   mode: "wizard" | "brief";
 132:   /** Persisted tldraw store snapshot (JSON). Loaded on mount. */
 133:   document?: Record<string, unknown>;
 134:   /** Called (debounced) on any store change for autosave */
 135:   onDocumentChange?: (snapshot: Record<string, unknown>) => void;
 136:   /** Force read-only (regardless of mobile detection) */
 137:   readOnly?: boolean;
 138:   /** Admin lock state ??locked board blocks client edits */
 139:   locked?: boolean;
 140:   /** Viewer role ??controls lock button + version panel visibility */
 250:       // tldraw default image asset). preventDefault/stopPropagation on the DOM event
 251:       // does NOT block tldraw's internal handler since it registers separately.
 252:       // FIX: replace native DOM listeners with editor.registerExternalContentHandler
 253:       // which OVERRIDES tldraw's default external-content handling for the given
 254:       // type. Single registered handler routes all image/PDF/URL processing.
 255:       // Canvas-internal PDF/URL drop preservation continues (yagi hard constraint
 256:       // L-033 + L-040) ??this only deduplicates, no surface removed.
 257:       // Reference: https://tldraw.dev/reference/editor/Editor#registerExternalContentHandler
 258:       // (canonical override hook in tldraw v4)
 259: 
 260:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 registerExternalContentHandler typing
 261:       const editorAny = editor as any;
 262: 
 263:       // ----- 'files' handler: image + PDF drop (replaces tldraw default file drop) -----
 264:       // Receives all dropped files at a given page point. preventDefault + insertion
 265:       // happens implicitly ??tldraw won't run its default handler when we register one.
 266:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tldraw v4 file handler info type
 267:       const filesHandler = async (info: any) => {
 268:         if (isReadOnly) return;
 269:         const point = info?.point ?? { x: 0, y: 0 };
 270:         const files: File[] = Array.from(info?.files ?? []);
 271: 
 272:         for (const file of files) {
 273:           const mime = file.type;
 274: 
 275:           if (mime.startsWith("image/")) {
 276:             if (file.size > IMAGE_MAX_BYTES) {
 277:               console.warn(`[ProjectBoard] Image too large (max 20MB): ${file.name}`);
 278:               continue;
 279:             }
 280: 
 281:             const publicUrl = await uploadFileToR2(file);
 282:             if (!publicUrl) continue;
 283: 
 284:             editor.createShape({
 285:               id: createShapeId(),
 286:               type: "yagi-image" as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1: custom shape type not in TLGlobalShapePropsMap
 287:               x: point.x,
 288:               y: point.y,
 289:               props: {
 290:                 src: publicUrl,
 291:                 w: 320,
 292:                 h: 240,
 293:                 alt: file.name,
 294:               },
 295:             } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1
 296:           } else if (mime === "application/pdf") {
 297:             if (file.size > PDF_MAX_BYTES) {
 298:               console.warn(`[ProjectBoard] PDF too large (max 10MB): ${file.name}`);
 299:               continue;
 300:             }
 301: 
 302:             const publicUrl = await uploadFileToR2(file);
 303:             if (!publicUrl) continue;
 304: 
 305:             editor.createShape({
 306:               id: createShapeId(),
 307:               type: "yagi-pdf" as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1: custom shape type not in TLGlobalShapePropsMap
 308:               x: point.x,
 309:               y: point.y,
 310:               props: {
 311:                 src: publicUrl,
 312:                 filename: file.name,
 313:                 pageCount: 0,
 314:                 w: 200,
 315:                 h: 160,
 316:               },
 317:             } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1
 318:           }
 319:         }
 320:       };
 321: 
 322:       // ----- 'url' / 'text' handlers: paste/drop URL ??yagi-url-card -----
 323:       // tldraw v4 fires 'url' for explicit URL drops, 'text' for raw text drops/paste
 324:       // that may contain a URL. We accept both; insertUrlCard validates.
 325:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tldraw v4 text/url handler info type
 326:       const urlHandler = async (info: any) => {
 327:         if (isReadOnly) return;
 328:         const point = info?.point ?? null;
 329:         const text: string = (info?.url ?? info?.text ?? "").toString();
 330:         if (!text) return;
 331: 
 332:         let url: URL;
 333:         try {
 334:           url = new URL(text);
 335:         } catch {
 336:           return; // not a URL ??silently ignore
 337:         }
 338:         if (url.protocol !== "http:" && url.protocol !== "https:") return;
 339: 
 340:         const fallback = (() => {
 341:           const c = editor.getViewportScreenCenter();
 342:           return editor.screenToPage(c);
 343:         })();
 344:         const insertAt = point ?? fallback;
 345:         await insertUrlCard(editor, text, { x: insertAt.x, y: insertAt.y });
 346:       };
 347: 
 348:       // Register handlers ??these OVERRIDE tldraw's default external-content
 349:       // handling, eliminating the duplicate-shape race condition.
 350:       const unregisterFiles =
 351:         editorAny.registerExternalContentHandler?.("files", filesHandler) ??
 352:         (() => {});
 353:       const unregisterUrl =
 354:         editorAny.registerExternalContentHandler?.("url", urlHandler) ??
 355:         (() => {});
 356:       const unregisterText =
 357:         editorAny.registerExternalContentHandler?.("text", urlHandler) ??
 358:         (() => {});
 359: 
 360:       // === TASK_03_STUB filled: asset action menu ??pointer move hover wiring ===
 361:       // tldraw v4: editor.on('pointerMove') fires with the hovered shape ID.
 362:       // We track hover with a 300ms delay to avoid flicker.
 363: 
 364:       // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 event types
 365:       const unsubscribePointerMove = (editor as any).on?.("pointerMove", () => {
 366:         // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 hoveredShapeId
 367:         const hoveredId = (editor as any).getHoveredShapeId?.() as string | null;
 368:         if (!hoveredId) {
 369:           if (hoverTimeoutRef.current) {
 370:             clearTimeout(hoverTimeoutRef.current);
 371:             hoverTimeoutRef.current = null;
 372:           }
 373:           setAssetMenu(null);
 374:           return;
 375:         }
 376: 
 377:         const shape = editor.getShape(hoveredId as Parameters<typeof editor.getShape>[0]);
 378:         if (!shape) return;
 379: 
 380:         const YAGI_TYPES = ["yagi-image", "yagi-pdf", "yagi-url-card"] as const;

 succeeded in 439ms:
   1: "use client";
   2: 
   3: /**
   4:  * brief-board-attachments-client.tsx
   5:  * Phase 3.1 hotfix-3 ??Client wrapper that wires server-action callbacks
   6:  * to <AttachmentsSection> in brief mode (project detail page).
   7:  *
   8:  * Why a wrapper?
   9:  *   - page.tsx is a Server Component and cannot pass server actions directly
  10:  *     as props to "use client" children. Instead, the server component renders
  11:  *     this wrapper with boardId + initial data, and this wrapper calls the
  12:  *     server actions via their imported references (which Next.js serialises
  13:  *     as RPC stubs on the client).
  14:  *   - AttachmentsSection performs optimistic state updates internally, but
  15:  *     actual persistence is delegated to the server actions here.
  16:  *
  17:  * L-033: Canvas-internal PDF/URL drop is separate (handled in project-board.tsx).
  18:  *         This section is for explicit attachment management below the canvas.
  19:  * L-041: Trust boundary enforced server-side in each action ??client never
  20:  *         supplies asset_index.
  21:  */
  22: 
  23: import { useState, useCallback } from "react";
  24: import { AttachmentsSection } from "./attachments-section";
  25: import {
  26:   addPdfAttachmentAction,
  27:   removePdfAttachmentAction,
  28:   addUrlAttachmentAction,
  29:   updateUrlNoteAction,
  30:   removeUrlAttachmentAction,
  31: } from "@/app/[locale]/app/projects/[id]/board-actions";
  32: import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";
  33: 
  34: // ============================================================
  35: // Props
  36: // ============================================================
  37: 
  38: interface BriefBoardAttachmentsClientProps {
  39:   boardId: string;
  40:   initialPdfs: PdfAttachment[];
  41:   initialUrls: UrlAttachment[];
  42:   isLocked: boolean;
  43:   isReadOnly: boolean;
  44: }
  45: 
  46: // ============================================================
  47: // Component
  48: // ============================================================
  49: 
  50: export function BriefBoardAttachmentsClient({
  51:   boardId,
  52:   initialPdfs,
  53:   initialUrls,
  54:   isLocked,
  55:   isReadOnly,
  56: }: BriefBoardAttachmentsClientProps) {
  57:   // Local optimistic state ??server is source of truth but we update locally
  58:   // so the UI feels responsive without waiting for server round-trip.
  59:   const [pdfs, setPdfs] = useState<PdfAttachment[]>(initialPdfs);
  60:   const [urls, setUrls] = useState<UrlAttachment[]>(initialUrls);
  61: 
  62:   // ============================================================
  63:   // PDF handlers
  64:   // ============================================================
  65: 
  66:   const handlePdfAdd = useCallback(
  67:     async (file: File): Promise<void> => {
  68:       // Optimistic: add a placeholder entry while uploading
  69:       const tempId = `temp-${crypto.randomUUID()}`;
  70:       const optimistic: PdfAttachment = {
  71:         id: tempId,
  72:         storage_key: "",
  73:         filename: file.name,
  74:         size_bytes: file.size,
  75:         uploaded_at: new Date().toISOString(),
  76:         uploaded_by: "",
  77:       };
  78:       setPdfs((prev) => [...prev, optimistic]);
  79: 
  80:       const result = await addPdfAttachmentAction(boardId, file);
  81:       if (result.ok) {
  82:         // Replace temp entry with real entry (real id from RPC)
  83:         setPdfs((prev) =>
  84:           prev.map((p) =>
  85:             p.id === tempId ? { ...optimistic, id: result.attachmentId } : p
  86:           )
  87:         );
  88:       } else {
  89:         // Roll back optimistic update
  90:         setPdfs((prev) => prev.filter((p) => p.id !== tempId));
  91:         throw new Error(result.error);
  92:       }
  93:     },
  94:     [boardId]
  95:   );
  96: 
  97:   const handlePdfRemove = useCallback(
  98:     async (id: string): Promise<void> => {
  99:       // Optimistic: remove immediately
 100:       setPdfs((prev) => prev.filter((p) => p.id !== id));
 101: 
 102:       const result = await removePdfAttachmentAction(boardId, id);
 103:       if (!result.ok) {
 104:         // Server failed ??we cannot easily restore the item without re-fetching.
 105:         // Log and surface via console; full refresh will correct state.
 106:         console.error("[BriefBoardAttachmentsClient] PDF remove failed:", result.error);
 107:       }
 108:     },
 109:     [boardId]
 110:   );
 111: 
 112:   // ============================================================
 113:   // URL handlers
 114:   // ============================================================
 115: 
 116:   const handleUrlAdd = useCallback(
 117:     async (url: string, note: string | null): Promise<void> => {
 118:       const tempId = `temp-${crypto.randomUUID()}`;
 119:       const optimistic: UrlAttachment = {
 120:         id: tempId,
 121:         url,
 122:         title: null,
 123:         thumbnail_url: null,
 124:         provider: "generic",
 125:         note: note,
 126:         added_at: new Date().toISOString(),
 127:         added_by: "",
 128:       };
 129:       setUrls((prev) => [...prev, optimistic]);
 130: 
 131:       const result = await addUrlAttachmentAction(boardId, url, note);
 132:       if (result.ok) {
 133:         setUrls((prev) =>
 134:           prev.map((u) =>
 135:             u.id === tempId ? { ...optimistic, id: result.attachmentId } : u
 136:           )
 137:         );
 138:       } else {
 139:         setUrls((prev) => prev.filter((u) => u.id !== tempId));
 140:         throw new Error(result.error);
 141:       }
 142:     },
 143:     [boardId]
 144:   );
 145: 
 146:   const handleUrlNoteUpdate = useCallback(
 147:     async (id: string, note: string): Promise<void> => {
 148:       // Optimistic update
 149:       setUrls((prev) =>
 150:         prev.map((u) => (u.id === id ? { ...u, note } : u))
 151:       );
 152: 
 153:       const result = await updateUrlNoteAction(boardId, id, note);
 154:       if (!result.ok) {
 155:         console.error("[BriefBoardAttachmentsClient] URL note update failed:", result.error);
 156:       }
 157:     },
 158:     [boardId]
 159:   );
 160: 
 161:   const handleUrlRemove = useCallback(
 162:     async (id: string): Promise<void> => {
 163:       setUrls((prev) => prev.filter((u) => u.id !== id));
 164: 
 165:       const result = await removeUrlAttachmentAction(boardId, id);
 166:       if (!result.ok) {
 167:         console.error("[BriefBoardAttachmentsClient] URL remove failed:", result.error);
 168:       }
 169:     },
 170:     [boardId]
 171:   );
 172: 
 173:   // ============================================================
 174:   // Render
 175:   // ============================================================
 176: 
 177:   return (
 178:     <AttachmentsSection
 179:       mode="brief"
 180:       boardId={boardId}
 181:       pdfs={pdfs}
 182:       urls={urls}
 183:       onPdfAdd={handlePdfAdd}
 184:       onPdfRemove={handlePdfRemove}
 185:       onUrlAdd={handleUrlAdd}
 186:       onUrlNoteUpdate={handleUrlNoteUpdate}
 187:       onUrlRemove={handleUrlRemove}
 188:       isLocked={isLocked}
 189:       isReadOnly={isReadOnly}
 190:     />
 191:   );
 192: }

 succeeded in 438ms:
   1: "use client";
   2: 
   3: /**
   4:  * asset-action-menu.tsx
   5:  * Phase 3.1 ??Contextual asset action menu for yagi-image, yagi-pdf, yagi-url-card shapes.
   6:  * Shown on hover (300ms delay) or right-click over a matching shape.
   7:  * Achromatic styling (L-011), soft shadow (L-013), font-suit (L-010).
   8:  */
   9: 
  10: import { useCallback } from "react";
  11: import { useTranslations } from "next-intl";
  12: 
  13: // ============================================================
  14: // Props
  15: // ============================================================
  16: 
  17: interface AssetActionMenuProps {
  18:   shapeType: "yagi-image" | "yagi-pdf" | "yagi-url-card";
  19:   src: string; // URL to copy/download
  20:   position: { x: number; y: number }; // absolute position in viewport
  21:   onClose: () => void;
  22: }
  23: 
  24: // ============================================================
  25: // Component
  26: // ============================================================
  27: 
  28: export function AssetActionMenu({
  29:   shapeType,
  30:   src,
  31:   position,
  32:   onClose,
  33: }: AssetActionMenuProps) {
  34:   const t = useTranslations("projectBoard");
  35: 
  36:   const handleCopyUrl = useCallback(async () => {
  37:     try {
  38:       await navigator.clipboard.writeText(src);
  39:     } catch {
  40:       // Fallback: create a temporary input element for browsers that block clipboard API
  41:       const input = document.createElement("input");
  42:       input.value = src;
  43:       document.body.appendChild(input);
  44:       input.select();
  45:       document.execCommand("copy");
  46:       document.body.removeChild(input);
  47:     }
  48:     onClose();
  49:   }, [src, onClose]);
  50: 
  51:   const handleDownload = useCallback(() => {
  52:     const a = document.createElement("a");
  53:     a.href = src;
  54:     a.download = src.split("/").pop() ?? "download";
  55:     a.target = "_blank";
  56:     a.rel = "noopener noreferrer";
  57:     document.body.appendChild(a);
  58:     a.click();
  59:     document.body.removeChild(a);
  60:     onClose();
  61:   }, [src, onClose]);
  62: 
  63:   const canDownload = shapeType === "yagi-image" || shapeType === "yagi-pdf";
  64: 
  65:   return (
  66:     <>
  67:       {/* Invisible backdrop to close menu on outside click */}
  68:       <div
  69:         aria-hidden="true"
  70:         style={{
  71:           position: "fixed",
  72:           inset: 0,
  73:           zIndex: 9998,
  74:         }}
  75:         onClick={onClose}
  76:       />
  77: 
  78:       {/* Menu panel */}
  79:       <div
  80:         role="menu"
  81:         aria-label="Asset actions"
  82:         style={{
  83:           position: "fixed",
  84:           left: position.x,
  85:           top: position.y,
  86:           zIndex: 9999,
  87:           background: "#ffffff",
  88:           // L-013: soft shadow, no hard border
  89:           boxShadow:
  90:             "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
  91:           borderRadius: "8px",
  92:           // border-border/40 equivalent (not hard)
  93:           border: "1px solid rgba(0,0,0,0.08)",
  94:           overflow: "hidden",
  95:           minWidth: "148px",
  96:           padding: "4px",
  97:         }}
  98:       >
  99:         <button
 100:           role="menuitem"
 101:           onClick={handleCopyUrl}
 102:           style={{
 103:             display: "flex",
 104:             alignItems: "center",
 105:             width: "100%",
 106:             padding: "7px 12px",
 107:             background: "transparent",
 108:             border: "none",
 109:             borderRadius: "5px",
 110:             cursor: "pointer",
 111:             fontFamily: "var(--font-suit, sans-serif)",
 112:             fontSize: "13px",
 113:             fontWeight: 400,
 114:             color: "#0a0a0a",
 115:             textAlign: "left",
 116:             gap: "8px",
 117:             transition: "background 80ms",
 118:           }}
 119:           onMouseEnter={(e) => {
 120:             (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
 121:           }}
 122:           onMouseLeave={(e) => {
 123:             (e.currentTarget as HTMLButtonElement).style.background =
 124:               "transparent";
 125:           }}
 126:         >
 127:           <CopyIcon />
 128:           {t("assetMenu.copyUrl")}
 129:         </button>
 130: 
 131:         {canDownload && (
 132:           <button
 133:             role="menuitem"
 134:             onClick={handleDownload}
 135:             style={{
 136:               display: "flex",
 137:               alignItems: "center",
 138:               width: "100%",
 139:               padding: "7px 12px",
 140:               background: "transparent",
 141:               border: "none",
 142:               borderRadius: "5px",
 143:               cursor: "pointer",
 144:               fontFamily: "var(--font-suit, sans-serif)",
 145:               fontSize: "13px",
 146:               fontWeight: 400,
 147:               color: "#0a0a0a",
 148:               textAlign: "left",
 149:               gap: "8px",
 150:               transition: "background 80ms",
 151:             }}
 152:             onMouseEnter={(e) => {
 153:               (e.currentTarget as HTMLButtonElement).style.background =
 154:                 "#f5f5f5";
 155:             }}
 156:             onMouseLeave={(e) => {
 157:               (e.currentTarget as HTMLButtonElement).style.background =
 158:                 "transparent";
 159:             }}
 160:           >
 161:             <DownloadIcon />
 162:             {t("assetMenu.download")}
 163:           </button>
 164:         )}
 165:       </div>
 166:     </>
 167:   );
 168: }
 169: 
 170: // ============================================================
 171: // Inline SVG icons (achromatic, L-011)
 172: // ============================================================
 173: 
 174: function CopyIcon() {
 175:   return (
 176:     <svg
 177:       width="14"
 178:       height="14"
 179:       viewBox="0 0 14 14"
 180:       fill="none"
 181:       aria-hidden="true"
 182:       style={{ flexShrink: 0 }}
 183:     >
 184:       <rect
 185:         x="4"
 186:         y="4"
 187:         width="8"
 188:         height="9"
 189:         rx="1.5"
 190:         stroke="#555555"
 191:         strokeWidth="1.2"
 192:       />
 193:       <path
 194:         d="M2 10V2.5A1.5 1.5 0 0 1 3.5 1H9"
 195:         stroke="#555555"
 196:         strokeWidth="1.2"
 197:         strokeLinecap="round"
 198:       />
 199:     </svg>
 200:   );
 201: }
 202: 
 203: function DownloadIcon() {
 204:   return (
 205:     <svg
 206:       width="14"
 207:       height="14"
 208:       viewBox="0 0 14 14"
 209:       fill="none"
 210:       aria-hidden="true"
 211:       style={{ flexShrink: 0 }}
 212:     >
 213:       <path
 214:         d="M7 1v8M4 6l3 3 3-3"
 215:         stroke="#555555"
 216:         strokeWidth="1.2"
 217:         strokeLinecap="round"
 218:         strokeLinejoin="round"
 219:       />
 220:       <path

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\preprod\\page.tsx' | ForEach-Object { "'$i++; if ($i -ge 45 -and $i -le 95) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\preprod\\new\\page.tsx' | ForEach-Object { "'$i++; if ($i -ge 20 -and $i -le 85) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n --fixed-strings '.from(\"projects\")' src\\app; rg -n --fixed-strings \".from('projects')\" src\\app" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\invoices\\new\\page.tsx' | ForEach-Object { "'$i++; if ($i -le 80) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 440ms:
  45: 
  46:   const supabase = await createSupabaseServer();
  47:   const {
  48:     data: { user },
  49:   } = await supabase.auth.getUser();
  50: 
  51:   if (!user) {
  52:     redirect({ href: "/signin", locale });
  53:     return null;
  54:   }
  55: 
  56:   const uid = user.id;
  57: 
  58:   // Visibility: yagi_admin OR member of yagi-internal workspace
  59:   const [{ data: isYagiAdmin }, { data: yagiWs }] = await Promise.all([
  60:     supabase.rpc("is_yagi_admin", { uid }),
  61:     supabase
  62:       .from("workspaces")
  63:       .select("id")
  64:       .eq("slug", "yagi-internal")
  65:       .maybeSingle(),
  66:   ]);
  67: 
  68:   if (!isYagiAdmin) {
  69:     if (!yagiWs) notFound();
  70:     const { data: isMember } = await supabase.rpc("is_ws_member", {
  71:       uid,
  72:       wsid: yagiWs.id,
  73:     });
  74:     if (!isMember) notFound();
  75:   }
  76: 
  77:   // Fetch boards with project info
  78:   let query = supabase
  79:     .from("preprod_boards")
  80:     .select(
  81:       `
  82:       id,
  83:       title,
  84:       status,
  85:       updated_at,
  86:       project:projects(title)
  87:     `
  88:     )
  89:     .order("updated_at", { ascending: false })
  90:     .limit(100);
  91: 
  92:   if (sp.status) query = query.eq("status", sp.status);
  93:   if (sp.project) query = query.eq("project_id", sp.project);
  94: 
  95:   const { data: boardsData, error } = await query;

 succeeded in 459ms:
  20:   if (!user) {
  21:     redirect({ href: "/signin", locale });
  22:     return null;
  23:   }
  24: 
  25:   const uid = user.id;
  26: 
  27:   // Visibility: yagi_admin OR member of yagi-internal workspace
  28:   const [{ data: isYagiAdmin }, { data: yagiWs }] = await Promise.all([
  29:     supabase.rpc("is_yagi_admin", { uid }),
  30:     supabase
  31:       .from("workspaces")
  32:       .select("id")
  33:       .eq("slug", "yagi-internal")
  34:       .maybeSingle(),
  35:   ]);
  36: 
  37:   if (!isYagiAdmin) {
  38:     if (!yagiWs) notFound();
  39:     const { data: isMember } = await supabase.rpc("is_ws_member", {
  40:       uid,
  41:       wsid: yagiWs.id,
  42:     });
  43:     if (!isMember) notFound();
  44:   }
  45: 
  46:   // Projects accessible via RLS ??let Supabase enforce row visibility
  47:   const { data: projectsData } = await supabase
  48:     .from("projects")
  49:     .select("id, title, workspace_id, workspaces(name)")
  50:     .order("updated_at", { ascending: false })
  51:     .limit(50);
  52: 
  53:   const projects = (projectsData ?? []).map((p) => ({
  54:     id: p.id,
  55:     title: p.title,
  56:     workspace: Array.isArray(p.workspaces)
  57:       ? (p.workspaces[0] as { name: string } | undefined) ?? null
  58:       : (p.workspaces as { name: string } | null),
  59:   }));
  60: 
  61:   return (
  62:     <div className="min-h-dvh bg-background">
  63:       <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
  64:         <h1 className="font-display text-3xl tracking-tight mb-1">
  65:           {t("board_new_title")}
  66:         </h1>
  67:         <p className="text-sm text-muted-foreground mt-2 mb-8 keep-all">
  68:           {t("description_ph")}
  69:         </p>
  70:       </div>
  71:       <NewBoardForm projects={projects} />
  72:     </div>
  73:   );
  74: }

 succeeded in 513ms:
   1: import { getTranslations } from "next-intl/server";
   2: import { notFound } from "next/navigation";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: import { NewInvoiceForm } from "@/components/invoices/new-invoice-form";
   5: 
   6: type Props = {
   7:   params: Promise<{ locale: string }>;
   8: };
   9: 
  10: export default async function NewInvoicePage({ params }: Props) {
  11:   const { locale } = await params;
  12:   const t = await getTranslations({ locale, namespace: "invoices" });
  13: 
  14:   const supabase = await createSupabaseServer();
  15:   const {
  16:     data: { user },
  17:   } = await supabase.auth.getUser();
  18:   if (!user) notFound();
  19: 
  20:   // yagi_admin only
  21:   const { data: yagiAdminRows } = await supabase
  22:     .from("user_roles")
  23:     .select("role")
  24:     .eq("user_id", user.id)
  25:     .is("workspace_id", null)
  26:     .eq("role", "yagi_admin");
  27:   if (!yagiAdminRows || yagiAdminRows.length === 0) notFound();
  28: 
  29:   // Projects accessible via RLS + their workspace info
  30:   const { data: projectsData } = await supabase
  31:     .from("projects")
  32:     .select(
  33:       "id, title, workspace_id, workspace:workspaces(id, name, business_registration_number)"
  34:     )
  35:     .order("created_at", { ascending: false });
  36: 
  37:   const projects = (projectsData ?? []).map((p) => {
  38:     const ws = p.workspace as
  39:       | { id: string; name: string; business_registration_number: string | null }
  40:       | { id: string; name: string; business_registration_number: string | null }[]
  41:       | null
  42:       | undefined;
  43:     const workspace = Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null);
  44:     return {
  45:       id: p.id,
  46:       title: p.title,
  47:       workspace_id: p.workspace_id,
  48:       workspace,
  49:     };
  50:   });
  51: 
  52:   return (
  53:     <div className="min-h-dvh bg-background">
  54:       <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
  55:         <h1 className="font-display text-3xl tracking-tight mb-1">
  56:           {t("new_title")}
  57:         </h1>
  58:       </div>
  59:       <NewInvoiceForm projects={projects} />
  60:     </div>
  61:   );
  62: }

 succeeded in 533ms:
src\app\[locale]\app\admin\projects\page.tsx:21:    .from('projects')

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'from\\(\"projects\"\\)' src\\app" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"from\\('projects'\\)\" src\\app" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"from\\('projects'\\)\" src\\components src\\lib" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'from\\(\"projects\"\\)' src\\components src\\lib" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T15:49:26.901078Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:

 exited 1 in 444ms:
 succeeded in 484ms:
src\app\[locale]\app\admin\projects\page.tsx:21:    .from('projects')

2026-05-03T15:49:27.095161Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:

 exited 1 in 475ms:
2026-05-03T15:49:27.141064Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:

 exited 1 in 521ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'from\\(\"projects\"\\)' src\\app\\[locale]\\app\\projects\\new\\actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'from\\(\"projects\"' src\\app\\[locale]\\app\\projects\\new\\actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'projects' src\\app\\[locale]\\app\\projects\\new\\actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Select-String -LiteralPath 'src\\app\\[locale]\\app\\projects\\new\\actions.ts' -Pattern '.from(\"projects\")'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T15:49:32.258240Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:

 exited 1 in 476ms:
2026-05-03T15:49:32.303014Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:

 exited 1 in 520ms:
 succeeded in 454ms:
15:// The wizard now creates the projects row early (status='draft') so Step 2
53:// `projects.intake_mode` column stays; existing rows still render via
54:// the read-only banner on /app/projects/[id].
95:  // - spec field `tone` ??NO matching column on `projects`; omitted from insert
114:    .from("projects")
125:  // with empty content, so the Brief tab on /app/projects/[id] can mount
151:    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
158:      .from("projects")
170:  revalidatePath("/[locale]/app/projects", "page");
239:    .from("projects")
286:  //    projects_wizard_draft_uniq partial index.
288:    .from("projects")
305:    await service.from("projects").delete().eq("id", existing.id);
327:    .from("projects")
337:        .from("projects")
370:    await service.from("projects").delete().eq("id", project.id);
382:  revalidatePath("/[locale]/app/projects", "page");
404:    .from("projects")
415:  // the transition matrix in projects/[id]/actions.ts.
421:    .from("projects")
442:  revalidatePath("/[locale]/app/projects", "page");
443:  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
644:// (the L-015 auto-transition shortcut ??never writes 'submitted' to projects).
647://   1. INSERT projects with status='in_review' (user-scoped client; RLS
759:  // value, validated here and again by the projects.twin_intent CHECK constraint
808:  // RLS already gates projects.INSERT to workspace members; this is
825:      .from("projects")
849:  // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
850:  //    is allowed by projects_insert RLS policy for authenticated callers who
854:    .from("projects")
856:      // 'name' column does not exist on projects ??map to 'title' (existing column)
858:      // 'description' maps to 'brief' on the projects table
883:    console.error("[submitProjectAction] projects INSERT error:", projErr);
968:    .from("projects")
979:  const adminQueueUrl = `${baseUrl}/app/admin/projects`;
980:  const projectUrl = `${baseUrl}/app/projects/${project.id}`;
1046:      url_path: `/app/projects/${project.id}`,
1052:  revalidatePath("/[locale]/app/projects", "page");
1053:  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
1058:    redirect: `/app/projects/${project.id}`,

 succeeded in 527ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'from' src | Select-String -Pattern 'projects'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 810ms:

src\components\admin\projects-queue.tsx:3:import { useTranslations } from 'next-intl';
src\components\admin\projects-queue.tsx:4:import { useCallback, useState } from 'react';
src\components\admin\projects-queue.tsx:5:import { Link } from '@/i18n/routing';
src\components\admin\projects-queue.tsx:6:import { cn } from '@/lib/utils';
src\components\admin\projects-queue.tsx:7:import { StatusBadge } from '@/components/projects/status-badge';
src\components\admin\projects-queue.tsx:13:} from '@/components/projects/project-actions';
src\components\admin\projects-queue.tsx:14:import { useRouter } from 'next/navigation';
src\emails\projects\project_submitted_client.tsx:11:} from "@react-email/components";
src\emails\projects\project_submitted_client.tsx:12:import * as React from "react";
src\emails\projects\project_submitted_admin.tsx:12:} from "@react-email/components";
src\emails\projects\project_submitted_admin.tsx:13:import * as React from "react";
src\emails\projects\project_revision_requested.tsx:11:} from "@react-email/components";
src\emails\projects\project_revision_requested.tsx:12:import * as React from "react";
src\emails\projects\project_in_progress.tsx:11:} from "@react-email/components";
src\emails\projects\project_in_progress.tsx:12:import * as React from "react";
src\emails\projects\project_delivered.tsx:12:} from "@react-email/components";
src\emails\projects\project_delivered.tsx:13:import * as React from "react";
src\emails\projects\project_cancelled.tsx:11:} from "@react-email/components";
src\emails\projects\project_cancelled.tsx:12:import * as React from "react";
src\emails\projects\project_approved.tsx:11:} from "@react-email/components";
src\emails\projects\project_approved.tsx:12:import * as React from "react";
src\components\project\thread-panel.tsx:27:} from "@/app/[locale]/app/projects/[id]/thread-actions";
src\components\project\thread-panel-server.tsx:59:        .from("projects")
src\components\project\reference-uploader.tsx:15:} from "@/app/[locale]/app/projects/[id]/ref-actions";
src\components\project\reference-grid.tsx:4:import { removeReferenceFormAction } from "@/app/[locale]/app/projects/[id]
/ref-actions";
src\lib\invoices\issue-email.ts:50:      .from("projects")
src\lib\email\project.ts:14:import { ProjectSubmittedAdmin } from "@/emails/projects/project_submitted_admin";
src\lib\email\project.ts:15:import { ProjectSubmittedClient } from "@/emails/projects/project_submitted_client";
src\lib\email\project.ts:16:import type { ProjectSubmittedAdminProps } from "@/emails/projects/project_submitted_admin"
;
src\lib\email\project.ts:17:import type { ProjectSubmittedClientProps } from "@/emails/projects/project_submitted_clien
t";
src\components\brief-board\yagi-request-modal.tsx:28:import { requestYagiProposal } from "@/app/[locale]/app/projects/[
id]/brief/actions";
src\components\brief-board\version-history.tsx:39:} from "@/app/[locale]/app/projects/[id]/brief/actions";
src\components\brief-board\lock-button.tsx:24:} from "@/app/[locale]/app/projects/[id]/brief/actions";
src\components\brief-board\editor.tsx:36:} from "@/app/[locale]/app/projects/[id]/brief/actions";
src\components\brief-board\blocks\image-block.tsx:18:import { getAssetUrl } from "@/app/[locale]/app/projects/[id]/brie
f/actions";
src\components\brief-board\blocks\file-block.tsx:19:import { getAssetUrl } from "@/app/[locale]/app/projects/[id]/brief
/actions";
src\app\[locale]\app\showcases\page.tsx:113:      .from("projects")
src\app\[locale]\app\showcases\actions.ts:90:    .from("projects")
src\app\[locale]\app\showcases\actions.ts:366:    .from("projects")
src\lib\share\share-data.ts:43:    .from("projects")
src\components\projects\admin-delete-button.tsx:3:import { useTransition, useState } from "react";
src\components\projects\admin-delete-button.tsx:4:import { useTranslations } from "next-intl";
src\components\projects\admin-delete-button.tsx:5:import { useRouter } from "@/i18n/routing";
src\components\projects\admin-delete-button.tsx:6:import { toast } from "sonner";
src\components\projects\admin-delete-button.tsx:17:} from "@/components/ui/alert-dialog";
src\components\projects\admin-delete-button.tsx:23:} from "@/components/ui/dropdown-menu";
src\components\projects\admin-delete-button.tsx:24:import { Button } from "@/components/ui/button";
src\components\projects\admin-delete-button.tsx:25:import { softDeleteProject } from "@/app/[locale]/app/projects/[id]/
actions";
src\components\project-board\version-history-panel.tsx:12:import { restoreVersionAction } from "@/app/[locale]/app/proj
ects/[id]/board-actions";
src\components\projects\wizard\summary-card.tsx:19:import { useTranslations } from "next-intl";
src\components\projects\wizard\summary-card.tsx:20:import { Pencil, ImageIcon, FileText, Link2 } from "lucide-react";
src\components\projects\wizard\summary-card.tsx:21:import { cn } from "@/lib/utils";
src\components\projects\wizard\summary-card.tsx:22:import type { WizardReference } from "@/components/projects/wizard/r
eference-board";
src\components\project-board\project-board.tsx:39:} from "@/app/[locale]/app/projects/new/actions";
src\components\projects\wizard\reference-board.tsx:17:import { useState, useRef, useCallback, type ChangeEvent, type Dr
agEvent } from "react";
src\components\projects\wizard\reference-board.tsx:18:import { useTranslations } from "next-intl";
src\components\projects\wizard\reference-board.tsx:19:import { ImageIcon, FileText, Link2, X, Loader2, Plus } from "luc
ide-react";
src\components\projects\wizard\reference-board.tsx:20:import { toast } from "sonner";
src\components\projects\wizard\reference-board.tsx:21:import { cn } from "@/lib/utils";
src\components\projects\wizard\reference-board.tsx:22:import { Button } from "@/components/ui/button";
src\components\projects\wizard\reference-board.tsx:26:} from "@/app/[locale]/app/projects/new/actions";
src\components\projects\wizard\reference-board.tsx:345:    const files = Array.from(e.dataTransfer.files);
src\components\projects\wizard\reference-board.tsx:369:    const files = Array.from(e.target.files ?? []);
src\components\projects\action-modals\revision-request-modal.tsx:8:import { useState, useTransition } from 'react';
src\components\projects\action-modals\revision-request-modal.tsx:9:import { requestRevisionAction } from '@/components/
projects/project-actions';
src\components\projects\action-modals\revision-request-modal.tsx:10:import { toast } from 'sonner';
src\components\project-board\brief-board-client.tsx:15:import { updateProjectBoardAction } from "@/app/[locale]/app/pro
jects/[id]/board-actions";
src\components\project-board\brief-board-shell-client.tsx:29:import { toggleBoardLockAction } from "@/app/[locale]/app/
projects/[id]/board-actions";
src\components\project-board\brief-board-attachments-client.tsx:31:} from "@/app/[locale]/app/projects/[id]/board-actio
ns";
src\components\projects\status-timeline.tsx:9:import { useEffect, useState } from 'react';
src\components\projects\status-timeline.tsx:10:import { createSupabaseBrowser } from '@/lib/supabase/client';
src\components\projects\status-timeline.tsx:11:import { useTranslations } from 'next-intl';
src\components\projects\status-timeline.tsx:16:  from_status: string | null;
src\components\projects\status-timeline.tsx:67:    // Re-fetch fresh data on mount (initial rows come from SSR snapshot
)
src\components\projects\status-timeline.tsx:72:        .from('project_status_history')
src\components\projects\status-timeline.tsx:74:          'id, project_id, from_status, to_status, actor_id, actor_role,
 comment, transitioned_at'
src\components\projects\action-modals\cancel-modal.tsx:7:import { useState, useTransition } from 'react';
src\components\projects\action-modals\cancel-modal.tsx:8:import { cancelProjectAction } from '@/components/projects/pro
ject-actions';
src\components\projects\action-modals\cancel-modal.tsx:9:import { toast } from 'sonner';
src\components\projects\project-list-card.tsx:3:// Distinct grammar from dashboard's RfpRowCard (horizontal row). This
src\components\projects\project-list-card.tsx:21:import Link from "next/link";
src\components\projects\action-modals\approval-modal.tsx:7:import { useState, useTransition } from 'react';
src\components\projects\action-modals\approval-modal.tsx:8:import { approveProjectAction } from '@/components/projects/
project-actions';
src\components\projects\action-modals\approval-modal.tsx:9:import { toast } from 'sonner';
src\components\projects\project-actions.ts:3:import { createSupabaseServer } from '@/lib/supabase/server';
src\components\projects\project-actions.ts:4:import { revalidatePath } from 'next/cache';
src\components\projects\projects-hub-hero.tsx:1:import { getTranslations } from "next-intl/server";
src\components\projects\projects-hub-hero.tsx:2:import { Link } from "@/i18n/routing";
src\components\projects\projects-hub-hero.tsx:3:import { ArrowUpRight, ArrowRight, MessageSquare, Users } from "lucide-
react";
src\components\projects\projects-hub-hero.tsx:4:import { InteractiveVisualStack } from "./interactive-visual-stack";
src\components\projects\projects-hub-hero.tsx:15:// Design signature (DECISIONS_CACHE Q-092 spec extracted from yagi
src\components\projects\projects-hub-hero.tsx:27:    // from py-16/24 (64-96px) to py-8/12 (32-48px) so the page-header
src\components\projects\projects-hub-hero.tsx:107:// from the Phase 2.9 placeholder is dropped ??on dark, ring=bg and t
he ring
src\components\projects\projects-hub-hero.tsx:115:      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
src\components\projects\projects-hub-workflow-strip.tsx:1:import { getTranslations } from "next-intl/server";
src\components\projects\projects-hub-workflow-strip.tsx:2:import { Pencil, Users, MessageSquare, CheckCheck } from "luc
ide-react";
src\components\projects\status-badge.tsx:1:import { cn } from '@/lib/utils';
src\components\projects\status-badge.tsx:2:import { useTranslations } from 'next-intl';
src\components\projects\project-action-buttons.tsx:9:import { useState, useTransition } from 'react';
src\components\projects\project-action-buttons.tsx:10:import { ApprovalModal } from '@/components/projects/action-modal
s/approval-modal';
src\components\projects\project-action-buttons.tsx:11:import { RevisionRequestModal } from '@/components/projects/actio
n-modals/revision-request-modal';
src\components\projects\project-action-buttons.tsx:12:import { CancelModal } from '@/components/projects/action-modals/
cancel-modal';
src\components\projects\project-action-buttons.tsx:17:} from '@/components/projects/project-actions';
src\components\projects\project-action-buttons.tsx:18:import { toast } from 'sonner';
src\components\projects\projects-hub-cta-banner.tsx:1:import { getTranslations } from "next-intl/server";
src\components\projects\projects-hub-cta-banner.tsx:2:import { Link } from "@/i18n/routing";
src\components\projects\projects-hub-cta-banner.tsx:3:import { ArrowUpRight } from "lucide-react";
src\components\projects\projects-hub-cta-banner.tsx:19:    <section className="rounded-3xl px-8 py-16 lg:px-16 lg:py-20
 mt-16 lg:mt-20 bg-gradient-to-br from-zinc-950 to-zinc-900 text-background">
src\components\projects\interactive-visual-stack.tsx:20:import { useState } from "react";
src\components\projects\interactive-visual-stack.tsx:21:import Image from "next/image";
src\components\projects\interactive-visual-stack.tsx:22:import { motion, LayoutGroup } from "framer-motion";
src\components\projects\interactive-visual-stack.tsx:23:import { ArrowUpRight } from "lucide-react";
src\components\projects\interactive-visual-stack.tsx:71:          <div className="absolute inset-0 bg-gradient-to-t fro
m-black/65 via-black/0 to-transparent" />
src\components\projects\interactive-visual-stack.tsx:132:          <div className="absolute inset-0 bg-gradient-to-t fr
om-black/65 via-black/0 to-transparent" />
src\app\[locale]\app\projects\[id]\thread-actions.ts:3:import { z } from "zod";
src\app\[locale]\app\projects\[id]\thread-actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\thread-actions.ts:5:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\[id]\thread-actions.ts:6:import { createSupabaseService } from "@/lib/supabase/service";
src\app\[locale]\app\projects\[id]\thread-actions.ts:7:import { emitNotification } from "@/lib/notifications/emit";
src\app\[locale]\app\projects\[id]\thread-actions.ts:8:import { notifyNewMessage } from "@/lib/email/new-message";
src\app\[locale]\app\projects\[id]\thread-actions.ts:30:      .from("user_roles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:45:    .from("project_threads")
src\app\[locale]\app\projects\[id]\thread-actions.ts:55:      .from("project_threads")
src\app\[locale]\app\projects\[id]\thread-actions.ts:68:    .from("thread_messages")
src\app\[locale]\app\projects\[id]\thread-actions.ts:180:  // Internal-visibility yagi-admin gate (verbatim from sendMe
ssage).
src\app\[locale]\app\projects\[id]\thread-actions.ts:183:      .from("user_roles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:196:    .from("project_threads")
src\app\[locale]\app\projects\[id]\thread-actions.ts:206:      .from("project_threads")
src\app\[locale]\app\projects\[id]\thread-actions.ts:224:    .from("thread_messages")
src\app\[locale]\app\projects\[id]\thread-actions.ts:250:      .from("thread_message_attachments")
src\app\[locale]\app\projects\[id]\thread-actions.ts:303:    .from("projects")
src\app\[locale]\app\projects\[id]\thread-actions.ts:316:      .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:320:      .from("profiles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:337:    Array.from(recipients).map((userId) =>
src\app\[locale]\app\projects\[id]\thread-actions.ts:378:    .from("projects")
src\app\[locale]\app\projects\[id]\thread-actions.ts:386:    .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:397:    .from("user_roles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:420:    .from("profiles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:444:    Array.from(recipientTokens.entries()).map(([userId, hitTok
ens]) =>
src\app\[locale]\app\admin\trash\page.tsx:8:} from "../../projects/[id]/actions";
src\app\[locale]\app\admin\trash\page.tsx:47:    .from("projects")
src\app\[locale]\app\invoices\[id]\print\page.tsx:80:      .from("projects")
src\app\[locale]\app\meetings\actions.ts:123:    .from("projects")
src\app\[locale]\app\meetings\new\page.tsx:72:      .from("projects")
src\app\[locale]\app\projects\[id]\ref-actions.ts:3:import { z } from "zod";
src\app\[locale]\app\projects\[id]\ref-actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\ref-actions.ts:5:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\[id]\ref-actions.ts:6:import { unfurlVideoUrl } from "@/lib/og-video-unfurl";
src\app\[locale]\app\projects\[id]\ref-actions.ts:7:import { unfurl } from "@/lib/og-unfurl";
src\app\[locale]\app\projects\[id]\ref-actions.ts:12:// accepted from the caller. Zod's default `.strip()` silently dro
ps any
src\app\[locale]\app\projects\[id]\ref-actions.ts:14:// from server-owned signals (embed_provider, storage path / exter
nal URL
src\app\[locale]\app\projects\[id]\ref-actions.ts:97:  const { error } = await (supabase as any).from("project_referenc
es").insert({
src\app\[locale]\app\projects\[id]\ref-actions.ts:118:const fromUrlSchema = z.object({
src\app\[locale]\app\projects\[id]\ref-actions.ts:124: * Adds a reference from a pasted URL.
src\app\[locale]\app\projects\[id]\ref-actions.ts:134:  const parsed = fromUrlSchema.safeParse(input);
src\app\[locale]\app\projects\[id]\ref-actions.ts:149:    const { error } = await (supabase as any).from("project_refer
ences").insert({
src\app\[locale]\app\projects\[id]\ref-actions.ts:169:  const { error } = await (supabase as any).from("project_referen
ces").insert({
src\app\[locale]\app\projects\[id]\ref-actions.ts:197:    .from("project_references")
src\app\[locale]\app\projects\[id]\ref-actions.ts:209:    await supabase.storage.from("project-references").remove(toRe
move);
src\app\[locale]\app\projects\[id]\ref-actions.ts:213:    .from("project_references")
src\app\[locale]\app\projects\page.tsx:1:import { getTranslations } from "next-intl/server";
src\app\[locale]\app\projects\page.tsx:2:import { Link, redirect } from "@/i18n/routing";
src\app\[locale]\app\projects\page.tsx:3:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\page.tsx:4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\page.tsx:5:import { ProjectsHubHero } from "@/components/projects/projects-hub-hero";
src\app\[locale]\app\projects\page.tsx:6:import { ProjectsHubWorkflowStrip } from "@/components/projects/projects-hub-w
orkflow-strip";
src\app\[locale]\app\projects\page.tsx:7:import { ProjectsHubCtaBanner } from "@/components/projects/projects-hub-cta-b
anner";
src\app\[locale]\app\projects\page.tsx:8:import { ProjectListCard } from "@/components/projects/project-list-card";
src\app\[locale]\app\projects\page.tsx:9:import { MeetingRequestCard } from "@/components/meetings/meeting-request-card
";
src\app\[locale]\app\projects\page.tsx:33:  // Phase 2.8.1 G_B1-I (F-PUX-007): Contest tab removed from the projects
src\app\[locale]\app\projects\page.tsx:43:  // entirely on RLS, which lets a multi-workspace user see projects from
src\app\[locale]\app\projects\page.tsx:63:    .from("projects")
src\app\[locale]\app\projects\page.tsx:125:          Contest is no longer surfaced from the projects hub. The
src\app\[locale]\app\projects\[id]\board-actions.ts:24:import { z } from "zod";
src\app\[locale]\app\projects\[id]\board-actions.ts:25:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\board-actions.ts:26:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\[id]\board-actions.ts:27:import { createSupabaseService } from "@/lib/supabase/service";
src\app\[locale]\app\projects\[id]\board-actions.ts:28:import { extractAssetIndex } from "@/lib/board/asset-index";
src\app\[locale]\app\projects\[id]\board-actions.ts:32:} from "@/lib/r2/client";
src\app\[locale]\app\projects\[id]\board-actions.ts:33:import { fetchVideoMetadata } from "@/lib/oembed";
src\app\[locale]\app\projects\[id]\board-actions.ts:99:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:107:  // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_ur
ls (read from DB).
src\app\[locale]\app\projects\[id]\board-actions.ts:108:  // For canvas-only update, fetch current attachment state fro
m DB to merge.
src\app\[locale]\app\projects\[id]\board-actions.ts:110:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:138:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:159:    .from("project_board_versions")
src\app\[locale]\app\projects\[id]\board-actions.ts:177:    await (svc as any).from("project_board_versions").insert({
src\app\[locale]\app\projects\[id]\board-actions.ts:264:    .from("user_roles")
src\app\[locale]\app\projects\[id]\board-actions.ts:285:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:338:    .from("user_roles")
src\app\[locale]\app\projects\[id]\board-actions.ts:349:    .from("project_board_versions")
src\app\[locale]\app\projects\[id]\board-actions.ts:364:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:378:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:391:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:420:// Helper: recompute asset_index from current board state and U
PDATE.
src\app\[locale]\app\projects\[id]\board-actions.ts:421:// Wave C.5d sub_03f_2: asset_index is now revoked from authent
icated at
src\app\[locale]\app\projects\[id]\board-actions.ts:434:    .from("project_boards")
src\app\[locale]\app\projects\[id]\board-actions.ts:452:    .from("project_boards")
src\app\[locale]\app\projects\[id]\page.tsx:13://   - workspace_admin from same workspace also allowed for backwards co
mpat
src\app\[locale]\app\projects\[id]\page.tsx:23:import { notFound } from "next/navigation";
src\app\[locale]\app\projects\[id]\page.tsx:24:import Link from "next/link";
src\app\[locale]\app\projects\[id]\page.tsx:25:import { getTranslations } from "next-intl/server";
src\app\[locale]\app\projects\[id]\page.tsx:26:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\[id]\page.tsx:27:import { AdminDeleteButton } from "@/components/projects/admin-delete-bu
tton";
src\app\[locale]\app\projects\[id]\page.tsx:28:import { ProjectActionButtons } from "@/components/projects/project-acti
on-buttons";
src\app\[locale]\app\projects\[id]\page.tsx:29:import { StatusTimeline } from "@/components/project-detail/status-timel
ine";
src\app\[locale]\app\projects\[id]\page.tsx:30:import { HeroCard } from "@/components/project-detail/hero-card";
src\app\[locale]\app\projects\[id]\page.tsx:31:import { InfoRail, type TwinIntent } from "@/components/project-detail/i
nfo-rail";
src\app\[locale]\app\projects\[id]\page.tsx:32:import { DetailTabs, type TabKey } from "@/components/project-detail/tab
s";
src\app\[locale]\app\projects\[id]\page.tsx:33:import { BoardTab } from "@/components/project-detail/board-tab";
src\app\[locale]\app\projects\[id]\page.tsx:34:import { ProgressTab } from "@/components/project-detail/progress-tab";
src\app\[locale]\app\projects\[id]\page.tsx:35:import { PlaceholderTab } from "@/components/project-detail/placeholder-
tab";
src\app\[locale]\app\projects\[id]\page.tsx:102:    .from("projects")
src\app\[locale]\app\projects\[id]\page.tsx:152:    .from("user_roles")
src\app\[locale]\app\projects\[id]\page.tsx:307:              fromTo: (from, to) =>
src\app\[locale]\app\projects\[id]\page.tsx:308:                tDetail("progress_tab.from_to", { from, to }),
src\app\[locale]\app\admin\projects\[id]\page.tsx:6:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\projects\[id]\page.tsx:7:import Link from "next/link";
src\app\[locale]\app\admin\projects\[id]\page.tsx:8:import { getTranslations } from "next-intl/server";
src\app\[locale]\app\admin\projects\[id]\page.tsx:9:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\admin\projects\[id]\page.tsx:10:import { AssetListPanel } from "@/components/admin/asset-list-pane
l";
src\app\[locale]\app\admin\projects\[id]\page.tsx:11:import { StatusBadge } from "@/components/projects/status-badge";
src\app\[locale]\app\admin\projects\[id]\page.tsx:12:import type { Status } from "@/components/projects/status-badge";
src\app\[locale]\app\admin\projects\[id]\page.tsx:13:import type { AssetIndexEntry } from "@/lib/board/asset-index";
src\app\[locale]\app\admin\projects\[id]\page.tsx:32:    .from("user_roles")
src\app\[locale]\app\admin\projects\[id]\page.tsx:42:    .from("projects")
src\app\[locale]\app\admin\projects\[id]\page.tsx:59:    .from("profiles")
src\app\[locale]\app\admin\projects\[id]\page.tsx:66:    .from("project_boards")
src\app\[locale]\app\projects\[id]\brief\actions.ts:18:import { randomUUID } from "node:crypto";
src\app\[locale]\app\projects\[id]\brief\actions.ts:19:import { z } from "zod";
src\app\[locale]\app\projects\[id]\brief\actions.ts:20:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\brief\actions.ts:21:import * as cheerio from "cheerio";
src\app\[locale]\app\projects\[id]\brief\actions.ts:22:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\[id]\brief\actions.ts:23:import { createSupabaseService } from "@/lib/supabase/service";
src\app\[locale]\app\projects\[id]\brief\actions.ts:24:import type { Json } from "@/lib/supabase/database.types";
src\app\[locale]\app\projects\[id]\brief\actions.ts:28:} from "@/lib/r2/client";
src\app\[locale]\app\projects\[id]\brief\actions.ts:29:import { validateHost } from "@/lib/ip-classify";
src\app\[locale]\app\projects\[id]\brief\actions.ts:214:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:230:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:339:    .from("project_brief_versions")
src\app\[locale]\app\projects\[id]\brief\actions.ts:354:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:367:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:403:    .from("user_roles")
src\app\[locale]\app\projects\[id]\brief\actions.ts:414:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:444:    .from("user_roles")
src\app\[locale]\app\projects\[id]\brief\actions.ts:455:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:512:    .from("project_brief_assets")
src\app\[locale]\app\projects\[id]\brief\actions.ts:544:    await supabase.from("project_brief_assets").delete().eq("id
", assetId);
src\app\[locale]\app\projects\[id]\brief\actions.ts:559:// presigned URL is returned; the asset itself is fetched from 
R2 by the
src\app\[locale]\app\projects\[id]\brief\actions.ts:578:    .from("project_brief_assets")
src\app\[locale]\app\projects\[id]\brief\actions.ts:859:    .from("embed_cache")
src\app\[locale]\app\projects\[id]\brief\actions.ts:916:  await service.from("embed_cache").upsert(
src\app\[locale]\app\projects\[id]\brief\actions.ts:961:    .from("project_briefs")
src\app\[locale]\app\projects\[id]\brief\actions.ts:973:    .from("projects")
src\app\[locale]\app\projects\[id]\brief\actions.ts:984:    .from("user_roles")
src\app\[locale]\app\projects\[id]\brief\actions.ts:1023:  const { error: nErr } = await service.from("notification_eve
nts").insert(rows);
src\app\[locale]\app\projects\[id]\actions.ts:3:import { z } from "zod";
src\app\[locale]\app\projects\[id]\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\[id]\actions.ts:5:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\[id]\actions.ts:57:    .from("projects")
src\app\[locale]\app\projects\[id]\actions.ts:65:    .from("user_roles")
src\app\[locale]\app\projects\[id]\actions.ts:91:    .from("projects")
src\app\[locale]\app\projects\[id]\actions.ts:114:// row from ws_member reads automatically (yagi_admin still sees it f
or the
src\app\[locale]\app\projects\[id]\actions.ts:142:    .from("projects")
src\app\[locale]\app\projects\[id]\actions.ts:163:    .from("projects")
src\app\[locale]\app\projects\[id]\actions.ts:186:    .from("invoices")
src\app\[locale]\app\projects\[id]\actions.ts:195:    .from("projects")
src\app\[locale]\app\admin\projects\page.tsx:1:import { getTranslations } from 'next-intl/server';
src\app\[locale]\app\admin\projects\page.tsx:2:import { createSupabaseServer } from '@/lib/supabase/server';
src\app\[locale]\app\admin\projects\page.tsx:3:import { ProjectsQueue } from '@/components/admin/projects-queue';
src\app\[locale]\app\admin\projects\page.tsx:21:    .from('projects')
src\app\[locale]\app\admin\projects\page.tsx:45:    // Resolve asset count from project_boards.asset_index (preferred);
src\app\[locale]\app\admin\projects\page.tsx:57:      // eslint-disable-next-line @typescript-eslint/no-explicit-any --
 Dynamic status type from database
src\app\[locale]\app\invoices\actions.ts:38:    .from("projects")
src\app\[locale]\app\projects\new\page.tsx:1:import { getTranslations } from "next-intl/server";
src\app\[locale]\app\projects\new\page.tsx:2:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\projects\new\page.tsx:3:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\new\page.tsx:4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\page.tsx:5:import { NewProjectWizard } from "./new-project-wizard";
src\app\[locale]\app\projects\new\page.tsx:38:      .from("brands")
src\app\[locale]\app\dashboard\page.tsx:90:        .from("projects")
src\app\[locale]\app\dashboard\page.tsx:95:        .from("projects")
src\app\[locale]\app\dashboard\page.tsx:100:        .from("projects")
src\app\[locale]\app\dashboard\page.tsx:112:    .from("projects")
src\app\[locale]\app\invoices\new\page.tsx:31:    .from("projects")
src\app\[locale]\app\projects\new\new-project-wizard.tsx:30:} from "react";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:31:import { useForm, Controller } from "react-hook-form";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:32:import { zodResolver } from "@hookform/resolvers/zod";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:33:import { z } from "zod";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:34:import { useTranslations } from "next-intl";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:35:import { useRouter } from "@/i18n/routing";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:36:import { toast } from "sonner";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:37:import { Loader2 } from "lucide-react";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:42:} from "./actions";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:43:import { Button } from "@/components/ui/button";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:44:import { Input } from "@/components/ui/input";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:45:import { Label } from "@/components/ui/label";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:46:import { Textarea } from "@/components/ui/textarea";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:47:import { RadioGroup, RadioGroupItem } from "@/components/ui
/radio-group";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:53:} from "@/components/ui/tooltip";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:54:import { Info } from "lucide-react";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:55:import { cn } from "@/lib/utils";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:56:import { ProjectBoard } from "@/components/project-board/pr
oject-board";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:57:import { AttachmentsSection } from "@/components/project-bo
ard/attachments-section";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:58:import { SummaryCard } from "@/components/projects/wizard/s
ummary-card";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:59:import type { PdfAttachment, UrlAttachment } from "@/lib/bo
ard/asset-index";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:60:import { getBoardAssetPutUrlAction, fetchVideoMetadataActio
n } from "./actions";
src\app\[locale]\app\projects\new\new-project-wizard.tsx:66:// WizardReference type is defined and exported from refere
nce-board.tsx (Phase 3.0 hotfix-1)
src\app\[locale]\app\projects\new\new-project-wizard.tsx:137:  // verified instead of guessing from membership creation
 order.
src\app\[locale]\app\projects\new\new-project-wizard.tsx:406:  // Validate admin fields before submitting from Step 3
src\app\[locale]\app\projects\new\new-project-wizard.tsx:417:    // Get presigned PUT URL from server action (server ge
nerates storage key)
src\app\[locale]\app\projects\new\new-project-wizard.tsx:647:      {/* (relocated from old Step 2) */}
src\app\[locale]\app\projects\new\new-project-wizard.tsx:792:      {/* Live summary card ??separated from admin form vi
a hairline + spacing
src\app\[locale]\app\projects\new\new-project-wizard.tsx:865:                // Wave C.5d sub_03b: explicit active work
space from server-
src\app\[locale]\app\projects\new\actions.ts:3:import { z } from "zod";
src\app\[locale]\app\projects\new\actions.ts:4:import { revalidatePath } from "next/cache";
src\app\[locale]\app\projects\new\actions.ts:5:import { createSupabaseServer } from "@/lib/supabase/server";
src\app\[locale]\app\projects\new\actions.ts:6:import { createSupabaseService } from "@/lib/supabase/service";
src\app\[locale]\app\projects\new\actions.ts:7:import type { Json } from "@/lib/supabase/database.types";
src\app\[locale]\app\projects\new\actions.ts:8:import { fetchVideoMetadata, type OEmbedResult } from "@/lib/oembed";
src\app\[locale]\app\projects\new\actions.ts:9:import { extractAssetIndex } from "@/lib/board/asset-index";
src\app\[locale]\app\projects\new\actions.ts:10:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\actions.ts:17:// drop images / paste embeds before "submit". Submit flips the status 
from
src\app\[locale]\app\projects\new\actions.ts:37:  // needed; the meaning shifts from "format" to "intended use".
src\app\[locale]\app\projects\new\actions.ts:95:  // - spec field `tone` ??NO matching column on `projects`; omitted fr
om insert
src\app\[locale]\app\projects\new\actions.ts:114:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:136:    .from("project_briefs")
src\app\[locale]\app\projects\new\actions.ts:158:      .from("projects")
src\app\[locale]\app\projects\new\actions.ts:239:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:246:    .from("project_briefs")
src\app\[locale]\app\projects\new\actions.ts:288:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:305:    await service.from("projects").delete().eq("id", existing.id);
src\app\[locale]\app\projects\new\actions.ts:308:  // 2. INSERT new draft. The unique index makes concurrent INSERTs fr
om a
src\app\[locale]\app\projects\new\actions.ts:327:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:337:        .from("projects")
src\app\[locale]\app\projects\new\actions.ts:359:    .from("project_briefs")
src\app\[locale]\app\projects\new\actions.ts:370:    await service.from("projects").delete().eq("id", project.id);
src\app\[locale]\app\projects\new\actions.ts:402:  // an explicit check lets us return `forbidden` distinct from `not_f
ound`.
src\app\[locale]\app\projects\new\actions.ts:404:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:421:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:466:} from "@/lib/r2/client";
src\app\[locale]\app\projects\new\actions.ts:469:// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey
 from the
src\app\[locale]\app\projects\new\actions.ts:654://   3. RPC seed_project_board_from_wizard(project_id, board_document)
 ??
src\app\[locale]\app\projects\new\actions.ts:665:import { sendProjectSubmittedAdmin, sendProjectSubmittedClient } from 
"@/lib/email/project";
src\app\[locale]\app\projects\new\actions.ts:666:import { emitNotification } from "@/lib/notifications/emit";
src\app\[locale]\app\projects\new\actions.ts:729:  // Client emits ISO 8601 with Z (converted from <input type="datetim
e-local">
src\app\[locale]\app\projects\new\actions.ts:766:  // resolves it from the draft project row in that case. One of the t
wo
src\app\[locale]\app\projects\new\actions.ts:770:  // present, workspace is resolved from it. The draft row is deleted 
after
src\app\[locale]\app\projects\new\actions.ts:812:    .from("workspace_members")
src\app\[locale]\app\projects\new\actions.ts:825:      .from("projects")
src\app\[locale]\app\projects\new\actions.ts:854:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:900:    .from("project_status_history")
src\app\[locale]\app\projects\new\actions.ts:903:      from_status: "submitted",   // logical from-state (L-015: submit
ted?뭝n_review)
src\app\[locale]\app\projects\new\actions.ts:923:  //    K-05 HIGH-B F5 fix: server-recompute asset_index from the boar
d document
src\app\[locale]\app\projects\new\actions.ts:929:  // Phase 3.1 hotfix-3: compute unified asset_index from all three so
urces
src\app\[locale]\app\projects\new\actions.ts:941:    "seed_project_board_from_wizard",
src\app\[locale]\app\projects\new\actions.ts:951:    console.error("[submitProjectAction] seed_project_board_from_wizar
d error:", seedErr);
src\app\[locale]\app\projects\new\actions.ts:961:    await (supabase as any).from("wizard_drafts").delete().eq("user_id
", user.id);
src\app\[locale]\app\projects\new\actions.ts:968:    .from("projects")
src\app\[locale]\app\projects\new\actions.ts:990:      // Phase 4.x Wave C.5b sub_08 ??drop handle from select; client 
name
src\app\[locale]\app\projects\new\actions.ts:993:      service.from("profiles").select("display_name, locale").eq("id",
 user.id).maybeSingle(),
src\app\[locale]\app\projects\new\actions.ts:994:      service.from("workspaces").select("name").eq("id", resolvedWorks
paceId).maybeSingle(),
src\app\[locale]\app\preprod\page.tsx:131:    .from("projects")
src\app\[locale]\app\preprod\actions.ts:29:    .from("projects")
src\app\[locale]\app\preprod\[id]\actions.ts:222:  // a logged-in caller could attach private references from other pro
jects
src\app\[locale]\app\preprod\new\page.tsx:48:    .from("projects")



codex
The cascade scan found many `projects` references, but most are single-row lookups by `id` or admin/internal paths. I?셫 extracting the remaining call sites with surrounding predicates now so the final verdict can separate real active-workspace leaks from benign RLS-scoped detail reads.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$matches = rg -n '"'\\.from\\(\"projects\"\\)|\\.from\\(''projects''\\)' src | ForEach-Object { "'$parts = $_ -split '"':',3; [pscustomobject]@{ Path="'$parts[0]; Line=[int]$parts[1]; Text=$parts[2] } }; foreach ($m in $matches) { Write-Output ("--- {0}:{1}" -f $m.Path,$m.Line); $start=[Math]::Max(1,$m.Line-3); $end=$m.Line+12; $i=0; Get-Content -LiteralPath $m.Path | ForEach-Object { $i++; if ($i -ge $start -and $i -le $end) { '"'{0,4}: {1}' -f "'$i, $_ } } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 555ms:
--- src\app\[locale]\app\admin\projects\page.tsx:21
  18:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
  19:   const sb = supabase as any;
  20:   const { data: projects, error } = await sb
  21:     .from('projects')
  22:     .select(
  23:       `
  24:       id,
  25:       title,
  26:       status,
  27:       submitted_at,
  28:       created_at,
  29:       created_by,
  30:       client:profiles!projects_created_by_fkey(id, name),
  31:       workspace:workspaces(id, name),
  32:       ref_count:project_references(count),
  33:       boards:project_boards(asset_index)

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$files = Get-ChildItem -Path src -Recurse -Include *.ts,*.tsx; $matches = $files | Select-String -SimpleMatch '"'.from(\"projects\")','.from(''projects'')'; foreach ("'$m in $matches) { Write-Output ("--- {0}:{1}" -f $m.Path,$m.LineNumber); $start=[Math]::Max(1,$m.LineNumber-3); $end=$m.LineNumber+12; $i=0; Get-Content -LiteralPath $m.Path | ForEach-Object { $i++; if ($i -ge $start -and $i -le $end) { '"'{0,4}: {1}' -f "'$i, $_ } } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 884ms:
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\admin\projects\[id]\page.tsx:42
  39:   const sb = supabase as any;
  40: 
  41:   const { data: projectRaw, error: projectErr } = await sb
  42:     .from("projects")
  43:     .select(
  44:       `
  45:       id, title, brief, status,
  46:       deliverable_types, estimated_budget_range,
  47:       target_delivery_at, meeting_preferred_at, submitted_at, created_at,
  48:       created_by,
  49:       brand:brands(id, name),
  50:       workspace:workspaces(id, name)
  51:     `
  52:     )
  53:     .eq("id", id)
  54:     .maybeSingle();
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\admin\projects\page.tsx:21
  18:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
  19:   const sb = supabase as any;
  20:   const { data: projects, error } = await sb
  21:     .from('projects')
  22:     .select(
  23:       `
  24:       id,
  25:       title,
  26:       status,
  27:       submitted_at,
  28:       created_at,
  29:       created_by,
  30:       client:profiles!projects_created_by_fkey(id, name),
  31:       workspace:workspaces(id, name),
  32:       ref_count:project_references(count),
  33:       boards:project_boards(asset_index)
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\admin\trash\page.tsx:47
  44:   const t = await getTranslations({ locale, namespace: "admin_trash" });
  45: 
  46:   const { data, error } = await supabase
  47:     .from("projects")
  48:     .select("id, title, status, workspace_id, deleted_at, brand:brands(id, name)")
  49:     .not("deleted_at", "is", null)
  50:     .order("deleted_at", { ascending: false });
  51: 
  52:   if (error) {
  53:     console.error("[AdminTrashPage] Supabase error:", error);
  54:   }
  55: 
  56:   const rows = (data ?? []) as DeletedProject[];
  57: 
  58:   const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
  59:     year: "numeric",
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\dashboard\page.tsx:90
  87:   const [{ count: totalCount }, { count: inProgressCount }, { count: deliveredCount }] =
  88:     await Promise.all([
  89:       sb
  90:         .from("projects")
  91:         .select("id", { count: "exact", head: true })
  92:         .eq("workspace_id", workspaceId)
  93:         .neq("status", "archived"),
  94:       sb
  95:         .from("projects")
  96:         .select("id", { count: "exact", head: true })
  97:         .eq("workspace_id", workspaceId)
  98:         .in("status", IN_PROGRESS_STATUSES),
  99:       sb
 100:         .from("projects")
 101:         .select("id", { count: "exact", head: true })
 102:         .eq("workspace_id", workspaceId)
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\dashboard\page.tsx:95
  92:         .eq("workspace_id", workspaceId)
  93:         .neq("status", "archived"),
  94:       sb
  95:         .from("projects")
  96:         .select("id", { count: "exact", head: true })
  97:         .eq("workspace_id", workspaceId)
  98:         .in("status", IN_PROGRESS_STATUSES),
  99:       sb
 100:         .from("projects")
 101:         .select("id", { count: "exact", head: true })
 102:         .eq("workspace_id", workspaceId)
 103:         .eq("status", "delivered"),
 104:     ]);
 105: 
 106:   const total = totalCount ?? 0;
 107:   const inProgress = inProgressCount ?? 0;
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\dashboard\page.tsx:100
  97:         .eq("workspace_id", workspaceId)
  98:         .in("status", IN_PROGRESS_STATUSES),
  99:       sb
 100:         .from("projects")
 101:         .select("id", { count: "exact", head: true })
 102:         .eq("workspace_id", workspaceId)
 103:         .eq("status", "delivered"),
 104:     ]);
 105: 
 106:   const total = totalCount ?? 0;
 107:   const inProgress = inProgressCount ?? 0;
 108:   const delivered = deliveredCount ?? 0;
 109: 
 110:   // Recent 5 RFPs (created_at DESC).
 111:   const { data: recentRaw } = (await sb
 112:     .from("projects")
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\dashboard\page.tsx:112
 109: 
 110:   // Recent 5 RFPs (created_at DESC).
 111:   const { data: recentRaw } = (await sb
 112:     .from("projects")
 113:     .select(
 114:       "id, title, brief, status, budget_band, twin_intent, created_at"
 115:     )
 116:     .eq("workspace_id", workspaceId)
 117:     .neq("status", "archived")
 118:     .order("created_at", { ascending: false })
 119:     .limit(5)) as { data: RecentProjectRow[] | null };
 120: 
 121:   const recent: RecentProjectRow[] = recentRaw ?? [];
 122:   if (!recent && totalCount === null) notFound();
 123: 
 124:   const fmt = new Intl.DateTimeFormat(localeNarrow === "ko" ? "ko-KR" : "en-US", {
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\invoices\new\page.tsx:31
  28: 
  29:   // Projects accessible via RLS + their workspace info
  30:   const { data: projectsData } = await supabase
  31:     .from("projects")
  32:     .select(
  33:       "id, title, workspace_id, workspace:workspaces(id, name, business_registration_number)"
  34:     )
  35:     .order("created_at", { ascending: false });
  36: 
  37:   const projects = (projectsData ?? []).map((p) => {
  38:     const ws = p.workspace as
  39:       | { id: string; name: string; business_registration_number: string | null }
  40:       | { id: string; name: string; business_registration_number: string | null }[]
  41:       | null
  42:       | undefined;
  43:     const workspace = Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null);
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\invoices\[id]\print\page.tsx:80
  77:   // Parallel loads for the related rows (RLS-scoped).
  78:   const [projectRes, buyerRes, supplierRes, lineItemsRes] = await Promise.all([
  79:     supabase
  80:       .from("projects")
  81:       .select("id, title")
  82:       .eq("id", invoice.project_id)
  83:       .maybeSingle(),
  84:     supabase
  85:       .from("workspaces")
  86:       .select(
  87:         "id, name, business_registration_number, representative_name, business_address, business_type, business_item, tax_invoice_email"
  88:       )
  89:       .eq("id", invoice.workspace_id)
  90:       .maybeSingle(),
  91:     supabase
  92:       .from("supplier_profile")
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\invoices\actions.ts:38
  35: 
  36:   // Load project + its workspace_id
  37:   const { data: project } = await supabase
  38:     .from("projects")
  39:     .select("id, workspace_id")
  40:     .eq("id", parsed.data.projectId)
  41:     .maybeSingle();
  42:   if (!project) return { ok: false, error: "project_not_found" };
  43: 
  44:   // Load supplier (single-row, must exist; seeded in migration)
  45:   const { data: supplier } = await supabase
  46:     .from("supplier_profile")
  47:     .select("id")
  48:     .limit(1)
  49:     .maybeSingle();
  50:   if (!supplier) return { ok: false, error: "no_supplier_profile" };
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\meetings\new\page.tsx:72
  69:   let projects: MeetingProject[] = [];
  70:   if (accessibleWorkspaceIds.length > 0) {
  71:     const { data: projectsData } = await supabase
  72:       .from("projects")
  73:       .select("id, title, workspace_id")
  74:       .in("workspace_id", accessibleWorkspaceIds)
  75:       .order("title", { ascending: true });
  76:     projects = (projectsData ?? []) as MeetingProject[];
  77:   }
  78: 
  79:   // Fetch workspace members for each accessible workspace, joining profiles for email
  80:   const membersByWorkspace: Record<string, WorkspaceMember[]> = {};
  81: 
  82:   if (accessibleWorkspaceIds.length > 0) {
  83:     const { data: membersData } = await supabase
  84:       .from("workspace_members")
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\meetings\actions.ts:123
 120: 
 121:   // 3. Fetch project
 122:   const { data: project, error: projectError } = await supabase
 123:     .from("projects")
 124:     .select("id, workspace_id, title")
 125:     .eq("id", projectId)
 126:     .maybeSingle();
 127: 
 128:   if (projectError) {
 129:     console.error("[createMeeting] project fetch error:", projectError.message);
 130:     return { ok: false, error: "db", detail: projectError.message };
 131:   }
 132:   if (!project) return { ok: false, error: "not_found" };
 133: 
 134:   const workspaceId = project.workspace_id;
 135:   const projectName = project.title;
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\preprod\new\page.tsx:48
  45: 
  46:   // Projects accessible via RLS ??let Supabase enforce row visibility
  47:   const { data: projectsData } = await supabase
  48:     .from("projects")
  49:     .select("id, title, workspace_id, workspaces(name)")
  50:     .order("updated_at", { ascending: false })
  51:     .limit(50);
  52: 
  53:   const projects = (projectsData ?? []).map((p) => ({
  54:     id: p.id,
  55:     title: p.title,
  56:     workspace: Array.isArray(p.workspaces)
  57:       ? (p.workspaces[0] as { name: string } | undefined) ?? null
  58:       : (p.workspaces as { name: string } | null),
  59:   }));
  60: 
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\preprod\actions.ts:29
  26:   // creating a board against it. RLS on `projects` gates the SELECT,
  27:   // so a hidden / nonexistent / cross-workspace project returns null.
  28:   const { data: project } = await supabase
  29:     .from("projects")
  30:     .select("id")
  31:     .eq("id", parsed.data.projectId)
  32:     .maybeSingle();
  33:   if (!project) return { ok: false, error: "project_not_found" };
  34: 
  35:   // Look up yagi-internal workspace id
  36:   const { data: yagiWs } = await supabase
  37:     .from("workspaces")
  38:     .select("id")
  39:     .eq("slug", "yagi-internal")
  40:     .maybeSingle();
  41:   if (!yagiWs) return { ok: false, error: "yagi_internal_workspace_missing" };
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\preprod\page.tsx:131
 128: 
 129:   // Projects for filter dropdown (same RLS visibility)
 130:   const { data: filterProjects } = await supabase
 131:     .from("projects")
 132:     .select("id, title")
 133:     .order("title", { ascending: true })
 134:     .limit(100);
 135: 
 136:   const fmt = new Intl.DateTimeFormat(locale, {
 137:     dateStyle: "medium",
 138:     timeZone: "Asia/Seoul",
 139:   });
 140: 
 141:   const statuses = ["draft", "shared", "approved", "archived"] as const;
 142: 
 143:   return (
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:114
 111: 
 112:   const { data: project, error } = await supabase
 113:     .from("projects")
 114:     .insert(insertPayload)
 115:     .select("id")
 116:     .single();
 117: 
 118:   if (error || !project) {
 119:     console.error("[createProject] Supabase error:", error);
 120:     return { error: "db", message: error?.message ?? "insert failed" };
 121:   }
 122: 
 123:   // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
 124:   // with empty content, so the Brief tab on /app/projects/[id] can mount
 125:   // the editor immediately. RLS allows this INSERT because the caller
 126:   // is the project's workspace member (just created the project above).
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:158
 155:     const service = createSupabaseService();
 156:     const { error: rollbackErr } = await service
 157:       .from("projects")
 158:       .delete()
 159:       .eq("id", project.id);
 160:     if (rollbackErr) {
 161:       console.error("[createProject] rollback DELETE failed:", rollbackErr);
 162:     }
 163:     return {
 164:       error: "db",
 165:       message: `brief insert failed: ${briefErr.message}`,
 166:     };
 167:   }
 168: 
 169:   revalidatePath("/[locale]/app/projects", "page");
 170:   return { ok: true, id: project.id, status };
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:239
 236: ): Promise<DraftBootstrap | null> {
 237:   const { data: project, error: projectErr } = await supabase
 238:     .from("projects")
 239:     .select("id, status")
 240:     .eq("id", projectId)
 241:     .maybeSingle();
 242:   if (projectErr || !project) return null;
 243: 
 244:   const { data: brief, error: briefErr } = await supabase
 245:     .from("project_briefs")
 246:     .select("content_json, updated_at, status")
 247:     .eq("project_id", projectId)
 248:     .maybeSingle();
 249:   if (briefErr || !brief) return null;
 250: 
 251:   return {
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:288
 285:   //    projects_wizard_draft_uniq partial index.
 286:   const { data: existing } = await supabase
 287:     .from("projects")
 288:     .select("id")
 289:     .eq("workspace_id", membership.workspace_id)
 290:     .eq("created_by", user.id)
 291:     .eq("status", "draft")
 292:     .eq("intake_mode", "brief")
 293:     .order("created_at", { ascending: false })
 294:     .limit(1)
 295:     .maybeSingle();
 296: 
 297:   if (existing?.id) {
 298:     const bootstrap = await fetchDraftBootstrap(supabase, existing.id);
 299:     if (bootstrap) return { ok: true, data: bootstrap };
 300:     // If brief row is missing for an existing draft project we treat it as
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:305
 302:     // first so the unique index does not block the new INSERT.)
 303:     const service = createSupabaseService();
 304:     await service.from("projects").delete().eq("id", existing.id);
 305:   }
 306: 
 307:   // 2. INSERT new draft. The unique index makes concurrent INSERTs from a
 308:   //    double-mounted wizard converge ??one wins, the other catches 23505
 309:   //    and re-SELECTs.
 310:   const fields = parsed.data.initial;
 311:   const insertPayload = {
 312:     workspace_id: membership.workspace_id,
 313:     created_by: user.id,
 314:     project_type: "direct_commission" as const,
 315:     status: "draft" as const,
 316:     intake_mode: "brief" as const,
 317:     title: fields.title,
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:327
 324: 
 325:   const { data: project, error } = await supabase
 326:     .from("projects")
 327:     .insert(insertPayload)
 328:     .select("id, status")
 329:     .single();
 330: 
 331:   if (error || !project) {
 332:     if (error?.code === PG_UNIQUE_VIOLATION) {
 333:       // A concurrent ensureDraftProject won the race. Re-SELECT and return
 334:       // the surviving row.
 335:       const { data: winner } = await supabase
 336:         .from("projects")
 337:         .select("id")
 338:         .eq("workspace_id", membership.workspace_id)
 339:         .eq("created_by", user.id)
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:337
 334:       // the surviving row.
 335:       const { data: winner } = await supabase
 336:         .from("projects")
 337:         .select("id")
 338:         .eq("workspace_id", membership.workspace_id)
 339:         .eq("created_by", user.id)
 340:         .eq("status", "draft")
 341:         .eq("intake_mode", "brief")
 342:         .limit(1)
 343:         .maybeSingle();
 344:       if (winner?.id) {
 345:         const bootstrap = await fetchDraftBootstrap(supabase, winner.id);
 346:         if (bootstrap) return { ok: true, data: bootstrap };
 347:       }
 348:     }
 349:     console.error("[ensureDraftProject] insert error:", error);
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:370
 367:     );
 368:     const service = createSupabaseService();
 369:     await service.from("projects").delete().eq("id", project.id);
 370:     return {
 371:       error: "db",
 372:       message: `brief insert failed: ${briefErr.message}`,
 373:     };
 374:   }
 375: 
 376:   const bootstrap = await fetchDraftBootstrap(supabase, project.id);
 377:   if (!bootstrap) {
 378:     return { error: "db", message: "bootstrap fetch after insert failed" };
 379:   }
 380: 
 381:   revalidatePath("/[locale]/app/projects", "page");
 382:   return { ok: true, data: bootstrap };
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:404
 401:   // an explicit check lets us return `forbidden` distinct from `not_found`.
 402:   const { data: target } = await supabase
 403:     .from("projects")
 404:     .select("id, status, created_by")
 405:     .eq("id", projectId)
 406:     .maybeSingle();
 407:   if (!target) return { error: "not_found" };
 408:   if (target.created_by !== user.id) return { error: "forbidden" };
 409: 
 410:   // Codex K-05 finding 2 (HIGH-B) ??restrict to status='draft'. Without
 411:   // this guard the wizard's submit path becomes a backdoor that demotes
 412:   // any project owned by the caller (submitted / in_production /
 413:   // delivered etc.) back to 'draft' or stomps on its fields, bypassing
 414:   // the transition matrix in projects/[id]/actions.ts.
 415:   if (target.status !== "draft") return { error: "forbidden" };
 416: 
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:421
 418: 
 419:   const { data: updated, error } = await supabase
 420:     .from("projects")
 421:     .update({
 422:       title: fields.title,
 423:       brief: fields.description ?? null,
 424:       brand_id: fields.brand_id ?? null,
 425:       deliverable_types: fields.deliverable_types,
 426:       estimated_budget_range: fields.estimated_budget_range ?? null,
 427:       target_delivery_at: fields.target_delivery_at ?? null,
 428:       status,
 429:     })
 430:     .eq("id", projectId)
 431:     .eq("created_by", user.id)
 432:     .eq("status", "draft")
 433:     .select("id, status")
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:825
 822:     const { data: draftRow } = await supabase
 823:       .from("projects")
 824:       .select("workspace_id")
 825:       .eq("id", data.draftProjectId)
 826:       .maybeSingle();
 827:     if (draftRow?.workspace_id && memberSet.has(draftRow.workspace_id)) {
 828:       resolvedWorkspaceId = draftRow.workspace_id;
 829:     }
 830:   }
 831: 
 832:   if (!resolvedWorkspaceId) {
 833:     const active = await resolveActiveWorkspace(user.id);
 834:     if (active) resolvedWorkspaceId = active.id;
 835:   }
 836: 
 837:   if (!resolvedWorkspaceId) {
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:854
 851:   const { data: project, error: projErr } = await supabaseAny
 852:     .from("projects")
 853:     .insert({
 854:       // 'name' column does not exist on projects ??map to 'title' (existing column)
 855:       title: data.name,
 856:       // 'description' maps to 'brief' on the projects table
 857:       brief: data.description,
 858:       deliverable_types: data.deliverable_types,
 859:       budget_band: data.budget_band,
 860:       // delivery_date maps to target_delivery_at
 861:       target_delivery_at: data.delivery_date ?? null,
 862:       // Phase 3.1 hotfix-3 addendum: 沃섎챸????彛???깆쁽 (optional)
 863:       meeting_preferred_at: data.meeting_preferred_at ?? null,
 864:       // Phase 4.x task_03: Digital Twin intent (3-radio, default 'undecided').
 865:       // Persistence requires task_01 migration applied (Wave D D.1) ??until
 866:       // then prod DB has no twin_intent column and this field is ignored.
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\new\actions.ts:968
 965:   await supabase
 966:     .from("projects")
 967:     .delete()
 968:     .eq("workspace_id", resolvedWorkspaceId)
 969:     .eq("created_by", user.id)
 970:     .eq("status", "draft")
 971:     .eq("intake_mode", "brief")
 972:     .neq("id", project.id);
 973: 
 974:   // 5. Resend emails (best-effort ??must not block or throw)
 975:   const baseUrl =
 976:     process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
 977:   const adminQueueUrl = `${baseUrl}/app/admin/projects`;
 978:   const projectUrl = `${baseUrl}/app/projects/${project.id}`;
 979: 
 980:   // Resolve caller's locale and email for the client confirmation
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\brief\actions.ts:973
 970:   // Resolve project workspace for notification context.
 971:   const { data: project } = await supabase
 972:     .from("projects")
 973:     .select("workspace_id, title")
 974:     .eq("id", parsed.data.projectId)
 975:     .maybeSingle();
 976: 
 977:   // Enumerate yagi_admin recipients via service role (user_roles SELECT
 978:   // requires admin; SSR client may not have permission depending on
 979:   // policy. Service role bypasses RLS for fan-out ??caller already
 980:   // validated as a project member.)
 981:   const service = createSupabaseService();
 982:   const { data: admins, error: admErr } = await service
 983:     .from("user_roles")
 984:     .select("user_id")
 985:     .eq("role", "yagi_admin");
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\actions.ts:57
  54: 
  55:   // Fetch project to know its workspace + current status
  56:   const { data: project, error: fetchErr } = await supabase
  57:     .from("projects")
  58:     .select("id, status, workspace_id")
  59:     .eq("id", parsed.data.projectId)
  60:     .maybeSingle();
  61:   if (fetchErr || !project) return { error: "not_found" as const };
  62: 
  63:   // Resolve user's roles (global + workspace-scoped)
  64:   const { data: roleRows } = await supabase
  65:     .from("user_roles")
  66:     .select("role, workspace_id")
  67:     .eq("user_id", user.id);
  68: 
  69:   const roles = new Set(
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\actions.ts:91
  88:   if (!wsAdminCan && !yagiCan) return { error: "forbidden" as const };
  89: 
  90:   const { error: updateErr } = await supabase
  91:     .from("projects")
  92:     .update({ status: parsed.data.newStatus })
  93:     .eq("id", project.id);
  94: 
  95:   if (updateErr) return { error: "db" as const, message: updateErr.message };
  96: 
  97:   revalidatePath(`/[locale]/app/projects/${project.id}`, "page");
  98:   revalidatePath(`/[locale]/app/projects`, "page");
  99:   return { ok: true as const };
 100: }
 101: 
 102: // Form-action-compatible wrapper (Promise<void>). Server Components pass
 103: // this directly to <form action={...}> which requires void return per
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\actions.ts:142
 139:   if (!auth.ok) return { error: auth.error };
 140: 
 141:   const { error: updateErr } = await auth.supabase
 142:     .from("projects")
 143:     .update({ deleted_at: new Date().toISOString() })
 144:     .eq("id", parsed.data.projectId)
 145:     .is("deleted_at", null);
 146: 
 147:   if (updateErr) return { error: "db" as const, message: updateErr.message };
 148: 
 149:   revalidatePath(`/[locale]/app/projects`, "page");
 150:   revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
 151:   revalidatePath(`/[locale]/app/admin/trash`, "page");
 152:   return { ok: true as const };
 153: }
 154: 
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\actions.ts:163
 160:   if (!auth.ok) return { error: auth.error };
 161: 
 162:   const { error: updateErr } = await auth.supabase
 163:     .from("projects")
 164:     .update({ deleted_at: null })
 165:     .eq("id", parsed.data.projectId);
 166: 
 167:   if (updateErr) return { error: "db" as const, message: updateErr.message };
 168: 
 169:   revalidatePath(`/[locale]/app/projects`, "page");
 170:   revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
 171:   revalidatePath(`/[locale]/app/admin/trash`, "page");
 172:   return { ok: true as const };
 173: }
 174: 
 175: export async function hardDeleteProject(formData: FormData) {
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\actions.ts:195
 192:   }
 193: 
 194:   const { error: deleteErr } = await auth.supabase
 195:     .from("projects")
 196:     .delete()
 197:     .eq("id", parsed.data.projectId)
 198:     .not("deleted_at", "is", null);
 199: 
 200:   if (deleteErr) return { error: "db" as const, message: deleteErr.message };
 201: 
 202:   revalidatePath(`/[locale]/app/admin/trash`, "page");
 203:   return { ok: true as const };
 204: }
 205: 
 206: export async function softDeleteProjectFormAction(formData: FormData): Promise<void> {
 207:   await softDeleteProject(formData);
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\page.tsx:102
  99:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/4.x columns not in generated types
 100:   const sb = supabase as any;
 101:   const { data: projectRaw, error: projectErr } = (await sb
 102:     .from("projects")
 103:     .select(
 104:       `
 105:       id, title, brief, status,
 106:       workspace_id, created_by,
 107:       budget_band, target_delivery_at,
 108:       meeting_preferred_at, twin_intent, created_at,
 109:       brand:brands(id, name),
 110:       workspace:workspaces(id, name)
 111:     `
 112:     )
 113:     .eq("id", id)
 114:     .maybeSingle()) as {
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\thread-actions.ts:303
 300: 
 301:   // Look up project ??workspace_id, then workspace members + YAGI admins.
 302:   const { data: project } = await svc
 303:     .from("projects")
 304:     .select("workspace_id")
 305:     .eq("id", args.projectId)
 306:     .maybeSingle();
 307:   if (!project) return;
 308: 
 309:   // Phase 2.0 G4 #2 ??drop the global yagi_admin fan-out. Previously every
 310:   // yagi_admin received notifications for every workspace's thread messages,
 311:   // which leaked client metadata across workspace boundaries. Yagi staff who
 312:   // need notifications for a given workspace must be added as workspace_members
 313:   // explicitly.
 314:   const [{ data: members }, { data: actorProfile }] = await Promise.all([
 315:     svc
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\[id]\thread-actions.ts:378
 375:   const svc = createSupabaseService();
 376: 
 377:   const { data: project } = await svc
 378:     .from("projects")
 379:     .select("workspace_id")
 380:     .eq("id", args.projectId)
 381:     .maybeSingle();
 382:   if (!project) return;
 383: 
 384:   // Members of this workspace (project participants set).
 385:   const { data: members } = await svc
 386:     .from("workspace_members")
 387:     .select("user_id")
 388:     .eq("workspace_id", project.workspace_id);
 389:   const memberIds = (members ?? [])
 390:     .map((m) => m.user_id)
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\projects\page.tsx:63
  60:   const activeWorkspaceId = active.id;
  61: 
  62:   let query = supabase
  63:     .from("projects")
  64:     .select(
  65:       `
  66:       id,
  67:       title,
  68:       status,
  69:       project_type,
  70:       updated_at,
  71:       created_at,
  72:       workspace_id,
  73:       brand:brands(id, name, logo_url)
  74:     `
  75:     )
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\showcases\actions.ts:90
  87:   if (!showcase) return false;
  88: 
  89:   const { data: project } = await svc
  90:     .from("projects")
  91:     .select("workspace_id")
  92:     .eq("id", showcase.project_id)
  93:     .maybeSingle();
  94:   if (!project) return false;
  95: 
  96:   const { data } = await supabase.rpc("is_ws_admin", {
  97:     uid: userId,
  98:     wsid: project.workspace_id,
  99:   });
 100:   return Boolean(data);
 101: }
 102: 
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\showcases\actions.ts:366
 363: 
 364:   const { data: project } = await svc
 365:     .from("projects")
 366:     .select("workspace_id, title")
 367:     .eq("id", args.projectId)
 368:     .maybeSingle();
 369:   if (!project) return;
 370: 
 371:   const [{ data: members }, { data: actorProfile }] = await Promise.all([
 372:     svc
 373:       .from("workspace_members")
 374:       .select("user_id")
 375:       .eq("workspace_id", project.workspace_id),
 376:     svc
 377:       .from("profiles")
 378:       .select("display_name")
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\app\[locale]\app\showcases\page.tsx:113
 110:       });
 111:     }
 112:     const { data: projectRows } = await svc
 113:       .from("projects")
 114:       .select("id")
 115:       .in("workspace_id", wsIds);
 116:     const projectIds = (projectRows ?? []).map((p) => p.id);
 117:     if (projectIds.length === 0) {
 118:       return renderEmpty({
 119:         t,
 120:         boards: [],
 121:         isYagiAdmin: false,
 122:       });
 123:     }
 124:     showcaseQuery = showcaseQuery.in("project_id", projectIds);
 125:   }
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\components\project\thread-panel-server.tsx:59
  56:       // workspace_member roles correctly; yagi_admin is global so its
  57:       // workspace_id is NULL. One bulk query covers all authors.
  58:       const { data: projectRow } = await supabase
  59:         .from("projects")
  60:         .select("workspace_id")
  61:         .eq("id", projectId)
  62:         .maybeSingle();
  63:       const projectWorkspaceId = projectRow?.workspace_id ?? null;
  64: 
  65:       const { data: roleRows } = await supabase
  66:         .from("user_roles")
  67:         .select("user_id, role, workspace_id")
  68:         .in("user_id", authorIds);
  69: 
  70:       const roleMap = new Map<string, ThreadAuthorRole>();
  71:       for (const id of authorIds) roleMap.set(id, "member");
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\lib\invoices\issue-email.ts:50
  47: 
  48:   const [projectRes, buyerRes, supplierRes] = await Promise.all([
  49:     svc
  50:       .from("projects")
  51:       .select("id, title")
  52:       .eq("id", invoice.project_id)
  53:       .maybeSingle(),
  54:     svc
  55:       .from("workspaces")
  56:       .select("id, name, tax_invoice_email")
  57:       .eq("id", invoice.workspace_id)
  58:       .maybeSingle(),
  59:     svc
  60:       .from("supplier_profile")
  61:       .select("id, corporate_name, contact_email")
  62:       .eq("id", invoice.supplier_id)
--- C:\Users\yout4\yagi-studio\yagi-workshop\src\lib\share\share-data.ts:43
  40: 
  41:   // 2. Load project title
  42:   const { data: project } = await svc
  43:     .from("projects")
  44:     .select("title")
  45:     .eq("id", board.project_id)
  46:     .maybeSingle();
  47: 
  48:   const projectTitle = project?.title ?? "";
  49: 
  50:   // 3. Current-revision frames ordered by frame_order
  51:   const { data: framesData } = await svc
  52:     .from("preprod_frames")
  53:     .select("*")
  54:     .eq("board_id", board.id)
  55:     .eq("is_current_revision", true)

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-ChildItem -LiteralPath 'src\\app\\[locale]\\app\\admin' -Force | Select-Object Name,Mode" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"admin.*layout|is_yagi_admin|yagi_admin|notFound|redirect|user_roles\" src\\app\\[locale]\\app\\admin src\\components\\admin src\\lib\\app" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\admin\\trash\\page.tsx' | ForEach-Object { "'$i++; if ($i -le 100) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; if (Test-Path -LiteralPath '"'src\\app\\[locale]\\app\\admin\\layout.tsx') { Get-Content -LiteralPath 'src\\app\\[locale]\\app\\admin\\layout.tsx' | ForEach-Object { "'$i++; if ($i -le 120) { '"'{0,4}: {1}' -f "'$i, $_ } } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 418ms:
src\lib\app\context.ts:10:  | "yagi_admin";
src\lib\app\context.ts:65:    .from("user_roles")
src\lib\app\scopes.ts:30:  if (ctx.workspaceRoles.includes("yagi_admin")) {
src\lib\app\signout-action.ts:4:import { redirect } from "next/navigation";
src\lib\app\signout-action.ts:9:  redirect("/");
src\app\[locale]\app\admin\layout.tsx:1:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\admin\layout.tsx:12:  if (!ctx) redirect({ href: "/", locale });
src\app\[locale]\app\admin\layout.tsx:13:  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
src\app\[locale]\app\admin\page.tsx:2:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\page.tsx:44:  if (!user) notFound();
src\app\[locale]\app\admin\page.tsx:47:    .from("user_roles")
src\app\[locale]\app\admin\page.tsx:51:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\page.tsx:53:  if (!roles || roles.length === 0) notFound();
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\admin\commissions\page.tsx:1:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\admin\commissions\page.tsx:36:    redirect({ href: "/signin", locale });
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\page.tsx:43:    redirect({ href: "/app", locale });
src\app\[locale]\app\admin\invoices\page.tsx:2:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\invoices\page.tsx:105:  if (!user) notFound();
src\app\[locale]\app\admin\invoices\page.tsx:108:    .from("user_roles")
src\app\[locale]\app\admin\invoices\page.tsx:112:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\invoices\page.tsx:114:  if (!roles || roles.length === 0) notFound();
src\app\[locale]\app\admin\support\page.tsx:1:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\admin\support\page.tsx:32:    redirect({ href: "/signin", locale });
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\admin\support\page.tsx:37:    redirect({ href: "/app", locale });
src\app\[locale]\app\admin\trash\page.tsx:1:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\admin\trash\page.tsx:33:    redirect({ href: "/signin", locale });
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\trash\page.tsx:40:    redirect({ href: "/app", locale });
src\app\[locale]\app\admin\commissions\[id]\actions.ts:14:// RLS: RPC is yagi_admin only. Authorization is double-checked at the
src\app\[locale]\app\admin\commissions\[id]\actions.ts:15:// server-action layer so the redirect target reflects the caller's role
src\app\[locale]\app\admin\commissions\[id]\actions.ts:54:  // Double-check yagi_admin so the action path doesn't leak the RPC
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin ??notFound).
src\app\[locale]\app\admin\projects\[id]\page.tsx:6:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\projects\[id]\page.tsx:28:  if (!user) notFound();
src\app\[locale]\app\admin\projects\[id]\page.tsx:30:  // yagi_admin role check
src\app\[locale]\app\admin\projects\[id]\page.tsx:32:    .from("user_roles")
src\app\[locale]\app\admin\projects\[id]\page.tsx:35:  const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");
src\app\[locale]\app\admin\projects\[id]\page.tsx:36:  if (!isYagiAdmin) notFound();
src\app\[locale]\app\admin\projects\[id]\page.tsx:56:  if (projectErr || !projectRaw) notFound();
src\app\[locale]\app\admin\commissions\[id]\convert-button.tsx:4:// Calls convertCommissionToProject server action and redirects to the
src\app\[locale]\app\admin\commissions\[id]\page.tsx:1:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\admin\commissions\[id]\page.tsx:2:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\commissions\[id]\page.tsx:26:    redirect({ href: "/signin", locale });
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\page.tsx:33:    redirect({ href: "/app", locale });
src\app\[locale]\app\admin\commissions\[id]\page.tsx:45:  if (!data) notFound();
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\challenges\[slug]\judge\page.tsx:1:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\challenges\[slug]\judge\page.tsx:14:  if (!challenge) notFound();
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\admin\challenges\[slug]\announce\page.tsx:1:import { redirect } from "@/i18n/routing";
src\app\[locale]\app\admin\challenges\[slug]\announce\page.tsx:26:    redirect({ href: "/app/admin/challenges", locale });
src\app\[locale]\app\admin\challenges\[slug]\announce\page.tsx:32:    redirect({ href: `/app/admin/challenges/${slug}/judge`, locale });
src\app\[locale]\app\admin\challenges\[slug]\edit\page.tsx:1:import { notFound } from "next/navigation";
src\app\[locale]\app\admin\challenges\[slug]\edit\page.tsx:13:  if (!challenge) notFound();

 succeeded in 438ms:

Name        Mode  
----        ----  
challenges  d-----
commissions d-----
invoices    d-----
projects    d-----
support     d-----
trash       d-----
layout.tsx  -a----
page.tsx    -a----



 succeeded in 426ms:
   1: import { redirect } from "@/i18n/routing";
   2: import { getTranslations } from "next-intl/server";
   3: import { createSupabaseServer } from "@/lib/supabase/server";
   4: import { Button } from "@/components/ui/button";
   5: import {
   6:   restoreProjectFormAction,
   7:   hardDeleteProjectFormAction,
   8: } from "../../projects/[id]/actions";
   9: 
  10: type Props = {
  11:   params: Promise<{ locale: string }>;
  12: };
  13: 
  14: type DeletedProject = {
  15:   id: string;
  16:   title: string;
  17:   status: string;
  18:   workspace_id: string;
  19:   deleted_at: string;
  20:   brand: { id: string; name: string } | null;
  21: };
  22: 
  23: const HARD_DELETE_AFTER_DAYS = 3;
  24: 
  25: export default async function AdminTrashPage({ params }: Props) {
  26:   const { locale } = await params;
  27: 
  28:   const supabase = await createSupabaseServer();
  29:   const {
  30:     data: { user },
  31:   } = await supabase.auth.getUser();
  32:   if (!user) {
  33:     redirect({ href: "/signin", locale });
  34:     return null;
  35:   }
  36:   const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
  37:     uid: user.id,
  38:   });
  39:   if (!isAdmin) {
  40:     redirect({ href: "/app", locale });
  41:     return null;
  42:   }
  43: 
  44:   const t = await getTranslations({ locale, namespace: "admin_trash" });
  45: 
  46:   const { data, error } = await supabase
  47:     .from("projects")
  48:     .select("id, title, status, workspace_id, deleted_at, brand:brands(id, name)")
  49:     .not("deleted_at", "is", null)
  50:     .order("deleted_at", { ascending: false });
  51: 
  52:   if (error) {
  53:     console.error("[AdminTrashPage] Supabase error:", error);
  54:   }
  55: 
  56:   const rows = (data ?? []) as DeletedProject[];
  57: 
  58:   const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
  59:     year: "numeric",
  60:     month: "short",
  61:     day: "numeric",
  62:     hour: "2-digit",
  63:     minute: "2-digit",
  64:   });
  65: 
  66:   function daysRemaining(deletedAt: string): number {
  67:     const purgeAt =
  68:       new Date(deletedAt).getTime() + HARD_DELETE_AFTER_DAYS * 86400000;
  69:     return Math.max(
  70:       0,
  71:       Math.ceil((purgeAt - Date.now()) / 86400000),
  72:     );
  73:   }
  74: 
  75:   return (
  76:     <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
  77:       <header className="space-y-2 mb-8">
  78:         <h1 className="font-display text-3xl tracking-tight">
  79:           {t("title")}
  80:         </h1>
  81:         <p className="text-sm text-muted-foreground keep-all">{t("sub")}</p>
  82:       </header>
  83: 
  84:       {rows.length === 0 && (
  85:         <div className="border border-dashed border-border rounded-lg py-16 text-center">
  86:           <p className="text-sm text-muted-foreground keep-all">{t("empty")}</p>
  87:         </div>
  88:       )}
  89: 
  90:       {rows.length > 0 && (
  91:         <div className="border border-border rounded-lg overflow-hidden">
  92:           <table className="w-full text-sm">
  93:             <thead className="bg-muted/30 text-left">
  94:               <tr>
  95:                 <th className="px-4 py-3 font-medium text-xs uppercase tracking-[0.1em] text-muted-foreground">
  96:                   {t("col_title")}
  97:                 </th>
  98:                 <th className="px-4 py-3 font-medium text-xs uppercase tracking-[0.1em] text-muted-foreground">
  99:                   {t("col_deleted_at")}
 100:                 </th>

 succeeded in 451ms:
   1: import { redirect } from "@/i18n/routing";
   2: import { getLocale } from "next-intl/server";
   3: import { fetchAppContext } from "@/lib/app/context";
   4: 
   5: export default async function AdminLayout({
   6:   children,
   7: }: {
   8:   children: React.ReactNode;
   9: }) {
  10:   const locale = await getLocale();
  11:   const ctx = await fetchAppContext();
  12:   if (!ctx) redirect({ href: "/", locale });
  13:   if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
  14:   return <>{children}</>;
  15: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src\\app\\[locale]\\app\\projects\\[id]\\page.tsx' | ForEach-Object { "'$i++; if ($i -ge 1 -and $i -le 190) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 340ms:
   1: // Phase 4.x task_04 ??Post-submit detail page redesign.
   2: //
   3: // Layout (1280 max-width):
   4: //   1. Breadcrumb (workspace -> brand -> project)
   5: //   2. Status timeline (5-stage horizontal pipeline, sage active)
   6: //   3. Hero card 1:1 (720x720) + Info rail (360 wide)  [responsive grid]
   7: //   4. Detail tabs (4 tabs: 癰귣?諭?/ 筌욊쑵六?/ ?꾨뗀李??disabled / 野껉퀗?듣눧?disabled)
   8: //   5. Tab content panel
   9: //   6. Admin actions row (yagi_admin only)
  10: //
  11: // Authorization (BLOCKER 1 consistency):
  12: //   - viewer must be project.created_by OR yagi_admin
  13: //   - workspace_admin from same workspace also allowed for backwards compat
  14: //   - everyone else -> notFound()
  15: //
  16: // Phase 4.x DOES NOT add new statuses. The 5-stage timeline maps to the
  17: // existing 9-state CHECK; ??깆뒭??/ ??뽯툧 are reserved visual slots.
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
  36: 
  37: type Props = {
  38:   params: Promise<{ locale: string; id: string }>;
  39:   searchParams: Promise<{ tab?: string }>;
  40: };
  41: 
  42: type ProjectDetail = {
  43:   id: string;
  44:   title: string;
  45:   brief: string | null;
  46:   status: string;
  47:   workspace_id: string;
  48:   created_by: string;
  49:   budget_band: string | null;
  50:   target_delivery_at: string | null;
  51:   meeting_preferred_at: string | null;
  52:   twin_intent: string | null;
  53:   created_at: string;
  54:   workspace: { id: string; name: string } | null;
  55:   brand: { id: string; name: string } | null;
  56: };
  57: 
  58: function parseTab(value: string | undefined): TabKey {
  59:   if (value === "progress" || value === "comment" || value === "deliverable") {
  60:     return value;
  61:   }
  62:   return "board";
  63: }
  64: 
  65: function narrowTwinIntent(value: string | null): TwinIntent | null {
  66:   if (
  67:     value === "undecided" ||
  68:     value === "specific_in_mind" ||
  69:     value === "no_twin"
  70:   ) {
  71:     return value;
  72:   }
  73:   return null;
  74: }
  75: 
  76: export default async function ProjectDetailPage({
  77:   params,
  78:   searchParams,
  79: }: Props) {
  80:   const { locale, id } = await params;
  81:   const sp = await searchParams;
  82:   const activeTab = parseTab(sp.tab);
  83: 
  84:   const t = await getTranslations({ locale, namespace: "projects" });
  85:   const tDetail = await getTranslations({
  86:     locale,
  87:     namespace: "project_detail",
  88:   });
  89: 
  90:   const supabase = await createSupabaseServer();
  91:   const {
  92:     data: { user },
  93:   } = await supabase.auth.getUser();
  94:   if (!user) notFound();
  95: 
  96:   // Fetch project. budget_band / submitted_at / twin_intent / kind columns
  97:   // are not in generated database.types.ts (Phase 3.0 + Phase 4.x); use
  98:   // the same any-cast pattern the existing detail page used.
  99:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/4.x columns not in generated types
 100:   const sb = supabase as any;
 101:   const { data: projectRaw, error: projectErr } = (await sb
 102:     .from("projects")
 103:     .select(
 104:       `
 105:       id, title, brief, status,
 106:       workspace_id, created_by,
 107:       budget_band, target_delivery_at,
 108:       meeting_preferred_at, twin_intent, created_at,
 109:       brand:brands(id, name),
 110:       workspace:workspaces(id, name)
 111:     `
 112:     )
 113:     .eq("id", id)
 114:     .maybeSingle()) as {
 115:     data: Record<string, unknown> | null;
 116:     error: unknown;
 117:   };
 118: 
 119:   if (projectErr || !projectRaw) notFound();
 120: 
 121:   const brandRaw = projectRaw.brand;
 122:   const workspaceRaw = projectRaw.workspace;
 123: 
 124:   const project: ProjectDetail = {
 125:     id: projectRaw.id as string,
 126:     title: projectRaw.title as string,
 127:     brief: projectRaw.brief as string | null,
 128:     status: projectRaw.status as string,
 129:     workspace_id: projectRaw.workspace_id as string,
 130:     created_by: projectRaw.created_by as string,
 131:     budget_band: (projectRaw.budget_band as string | null) ?? null,
 132:     target_delivery_at:
 133:       (projectRaw.target_delivery_at as string | null) ?? null,
 134:     meeting_preferred_at:
 135:       (projectRaw.meeting_preferred_at as string | null) ?? null,
 136:     // twin_intent column added by task_01 migration (Wave D D.1 apply).
 137:     // Until apply, the SELECT returns undefined -> coerce to null. After
 138:     // apply, the value is one of the 3 enum members.
 139:     twin_intent:
 140:       (projectRaw.twin_intent as string | undefined | null) ?? null,
 141:     created_at: projectRaw.created_at as string,
 142:     brand: Array.isArray(brandRaw)
 143:       ? ((brandRaw[0] as ProjectDetail["brand"]) ?? null)
 144:       : (brandRaw as ProjectDetail["brand"]),
 145:     workspace: Array.isArray(workspaceRaw)
 146:       ? ((workspaceRaw[0] as ProjectDetail["workspace"]) ?? null)
 147:       : (workspaceRaw as ProjectDetail["workspace"]),
 148:   };
 149: 
 150:   // Authorization (BLOCKER 1 consistency: use created_by, NOT owner_id).
 151:   const { data: roleRows } = await supabase
 152:     .from("user_roles")
 153:     .select("role, workspace_id")
 154:     .eq("user_id", user.id);
 155: 
 156:   const roles = new Set(
 157:     (roleRows ?? [])
 158:       .filter(
 159:         (r) =>
 160:           r.workspace_id === null || r.workspace_id === project.workspace_id
 161:       )
 162:       .map((r) => r.role as string)
 163:   );
 164: 
 165:   const isYagiAdmin = roles.has("yagi_admin");
 166:   const isWsAdmin = roles.has("workspace_admin");
 167:   const isOwner = project.created_by === user.id;
 168: 
 169:   if (!isYagiAdmin && !isWsAdmin && !isOwner) notFound();
 170: 
 171:   const viewerRole: "admin" | "client" = isYagiAdmin || isWsAdmin
 172:     ? "admin"
 173:     : "client";
 174: 
 175:   const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
 176:   const workspaceName = project.workspace?.name ?? "??;
 177:   const brandName = project.brand?.name ?? null;
 178: 
 179:   // Status pill label (uses existing translations namespace -- same map
 180:   // already powers StatusBadge elsewhere).
 181:   const tStatus = await getTranslations({ locale, namespace: "projects" });
 182:   const statusLabel =
 183:     tStatus.has(`status_${project.status}` as never)
 184:       ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
 185:         (tStatus as any)(`status_${project.status}`)
 186:       : project.status;
 187: 
 188:   return (
 189:     <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
 190:       {/* L1 Breadcrumb */}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql' | ForEach-Object { "'$i++; if ($i -ge 90 -and $i -le 170 -or $i -ge 180 -and $i -le 300 -or $i -ge 368 -and $i -le 398) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"createSupabaseService\\(|service.*from\\(\\\"projects\\\"\\)|svc.*from\\(\\\"projects\\\"\\)|serviceAny.*from\\(\\\"projects\\\"\\)\" src\\app src\\components src\\lib" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"add_project_board_url|update_project_board_url_note|remove_project_board_attachment|toggle_project_board_lock\" supabase\\migrations" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"createSupabaseService|service.*from\\(\\\"project_boards\\\"\\)|svc.*from\\(\\\"project_boards\\\"\\)|restoreSvc|recomputeAndUpdateAssetIndex|updateProjectBoardAction\" src\\app\\[locale]\\app\\projects\\[id]\\board-actions.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 342ms:
  90: -- ============================================================
  91: CREATE OR REPLACE FUNCTION add_project_board_url(
  92:   p_board_id      uuid,
  93:   p_url           text,
  94:   p_title         text,
  95:   p_thumbnail_url text,
  96:   p_provider      text,
  97:   p_note          text
  98: ) RETURNS uuid
  99: LANGUAGE plpgsql
 100: SECURITY DEFINER
 101: SET search_path = public, pg_temp
 102: AS $$
 103: DECLARE
 104:   v_caller_id  uuid := auth.uid();
 105:   v_project_id uuid;
 106:   v_is_locked  boolean;
 107:   v_is_admin   boolean;
 108:   v_new_id     uuid := gen_random_uuid();
 109:   v_url_count  int;
 110: BEGIN
 111:   IF v_caller_id IS NULL THEN
 112:     RAISE EXCEPTION 'add_project_board_url: unauthenticated';
 113:   END IF;
 114: 
 115:   SELECT pb.project_id, pb.is_locked
 116:   INTO v_project_id, v_is_locked
 117:   FROM project_boards pb
 118:   WHERE pb.id = p_board_id;
 119: 
 120:   IF NOT FOUND THEN
 121:     RAISE EXCEPTION 'add_project_board_url: board not found';
 122:   END IF;
 123: 
 124:   v_is_admin := is_yagi_admin(v_caller_id);
 125:   IF NOT v_is_admin AND NOT EXISTS (
 126:     SELECT 1 FROM projects p
 127:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
 128:   ) THEN
 129:     RAISE EXCEPTION 'add_project_board_url: unauthorized';
 130:   END IF;
 131: 
 132:   IF v_is_locked AND NOT v_is_admin THEN
 133:     RAISE EXCEPTION 'add_project_board_url: board is locked';
 134:   END IF;
 135: 
 136:   SELECT jsonb_array_length(attached_urls) INTO v_url_count
 137:   FROM project_boards WHERE id = p_board_id;
 138:   IF v_url_count >= 50 THEN
 139:     RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
 140:   END IF;
 141: 
 142:   IF p_url IS NULL OR length(p_url) = 0 OR length(p_url) > 2000 THEN
 143:     RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
 144:   END IF;
 145: 
 146:   IF p_url NOT LIKE 'http://%' AND p_url NOT LIKE 'https://%' THEN
 147:     RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
 148:   END IF;
 149: 
 150:   IF p_note IS NOT NULL AND length(p_note) > 500 THEN
 151:     RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
 152:   END IF;
 153: 
 154:   UPDATE project_boards
 155:   SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
 156:     'id',            v_new_id::text,
 157:     'url',           p_url,
 158:     'title',         to_jsonb(p_title),
 159:     'thumbnail_url', to_jsonb(p_thumbnail_url),
 160:     'provider',      COALESCE(p_provider, 'generic'),
 161:     'note',          to_jsonb(p_note),
 162:     'added_at',      now()::text,
 163:     'added_by',      v_caller_id::text
 164:   )), updated_at = now()
 165:   WHERE id = p_board_id;
 166: 
 167:   RETURN v_new_id;
 168: END;
 169: $$;
 170: 
 180: SECURITY DEFINER
 181: SET search_path = public, pg_temp
 182: AS $$
 183: DECLARE
 184:   v_caller_id  uuid := auth.uid();
 185:   v_project_id uuid;
 186:   v_is_locked  boolean;
 187:   v_is_admin   boolean;
 188: BEGIN
 189:   IF v_caller_id IS NULL THEN
 190:     RAISE EXCEPTION 'remove_project_board_attachment: unauthenticated';
 191:   END IF;
 192: 
 193:   SELECT pb.project_id, pb.is_locked
 194:   INTO v_project_id, v_is_locked
 195:   FROM project_boards pb
 196:   WHERE pb.id = p_board_id;
 197: 
 198:   IF NOT FOUND THEN
 199:     RAISE EXCEPTION 'remove_project_board_attachment: board not found';
 200:   END IF;
 201: 
 202:   v_is_admin := is_yagi_admin(v_caller_id);
 203:   IF NOT v_is_admin AND NOT EXISTS (
 204:     SELECT 1 FROM projects p
 205:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
 206:   ) THEN
 207:     RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
 208:   END IF;
 209: 
 210:   IF v_is_locked AND NOT v_is_admin THEN
 211:     RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
 212:   END IF;
 213: 
 214:   IF p_kind = 'pdf' THEN
 215:     UPDATE project_boards
 216:     SET attached_pdfs = (
 217:       SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
 218:       FROM jsonb_array_elements(attached_pdfs) elem
 219:       WHERE (elem->>'id') != p_attachment_id::text
 220:     ), updated_at = now()
 221:     WHERE id = p_board_id;
 222:   ELSIF p_kind = 'url' THEN
 223:     UPDATE project_boards
 224:     SET attached_urls = (
 225:       SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
 226:       FROM jsonb_array_elements(attached_urls) elem
 227:       WHERE (elem->>'id') != p_attachment_id::text
 228:     ), updated_at = now()
 229:     WHERE id = p_board_id;
 230:   ELSE
 231:     RAISE EXCEPTION 'remove_project_board_attachment: invalid kind (must be pdf or url)';
 232:   END IF;
 233: 
 234:   RETURN true;
 235: END;
 236: $$;
 237: 
 238: -- ============================================================
 239: -- FIX HIGH-A #1d: update_project_board_url_note ??owner_id -> created_by
 240: -- ============================================================
 241: CREATE OR REPLACE FUNCTION update_project_board_url_note(
 242:   p_board_id      uuid,
 243:   p_attachment_id uuid,
 244:   p_note          text
 245: ) RETURNS boolean
 246: LANGUAGE plpgsql
 247: SECURITY DEFINER
 248: SET search_path = public, pg_temp
 249: AS $$
 250: DECLARE
 251:   v_caller_id  uuid := auth.uid();
 252:   v_project_id uuid;
 253:   v_is_locked  boolean;
 254:   v_is_admin   boolean;
 255: BEGIN
 256:   IF v_caller_id IS NULL THEN
 257:     RAISE EXCEPTION 'update_project_board_url_note: unauthenticated';
 258:   END IF;
 259: 
 260:   SELECT pb.project_id, pb.is_locked
 261:   INTO v_project_id, v_is_locked
 262:   FROM project_boards pb
 263:   WHERE pb.id = p_board_id;
 264: 
 265:   IF NOT FOUND THEN
 266:     RAISE EXCEPTION 'update_project_board_url_note: board not found';
 267:   END IF;
 268: 
 269:   v_is_admin := is_yagi_admin(v_caller_id);
 270:   IF NOT v_is_admin AND NOT EXISTS (
 271:     SELECT 1 FROM projects p
 272:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
 273:   ) THEN
 274:     RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
 275:   END IF;
 276: 
 277:   IF v_is_locked AND NOT v_is_admin THEN
 278:     RAISE EXCEPTION 'update_project_board_url_note: board is locked';
 279:   END IF;
 280: 
 281:   IF p_note IS NOT NULL AND length(p_note) > 500 THEN
 282:     RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
 283:   END IF;
 284: 
 285:   UPDATE project_boards
 286:   SET attached_urls = (
 287:     SELECT jsonb_agg(
 288:       CASE
 289:         WHEN (elem->>'id') = p_attachment_id::text
 290:         THEN jsonb_set(elem, '{note}', COALESCE(to_jsonb(p_note), 'null'::jsonb))
 291:         ELSE elem
 292:       END
 293:     )
 294:     FROM jsonb_array_elements(attached_urls) elem
 295:   ), updated_at = now()
 296:   WHERE id = p_board_id;
 297: 
 298:   RETURN true;
 299: END;
 300: $$;
 368: CREATE POLICY project_boards_update_client ON project_boards
 369:   FOR UPDATE
 370:   USING (
 371:     is_yagi_admin(auth.uid())
 372:     OR (
 373:       is_locked = false
 374:       AND project_id IN (
 375:         SELECT p.id FROM projects p
 376:         WHERE p.workspace_id IN (
 377:           SELECT workspace_members.workspace_id
 378:           FROM workspace_members
 379:           WHERE workspace_members.user_id = auth.uid()
 380:         )
 381:       )
 382:     )
 383:   )
 384:   WITH CHECK (
 385:     is_yagi_admin(auth.uid())
 386:     OR (
 387:       is_locked = false
 388:       AND project_id IN (
 389:         SELECT p.id FROM projects p
 390:         WHERE p.workspace_id IN (
 391:           SELECT workspace_members.workspace_id
 392:           FROM workspace_members
 393:           WHERE workspace_members.user_id = auth.uid()
 394:         )
 395:       )
 396:     )
 397:   );
 398: 

2026-05-03T15:50:38.694871Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: regex parse error:
    (?:createSupabaseService\(|service.*from\(\)
    ^
error: unclosed group

 exited 1 in 352ms:
rg: regex parse error:
    (?:createSupabaseService\(|service.*from\(\)
    ^
error: unclosed group

 succeeded in 371ms:
supabase\migrations\20260429113853_phase_3_1_project_board.sql:181:-- RPC: toggle_project_board_lock
supabase\migrations\20260429113853_phase_3_1_project_board.sql:183:CREATE OR REPLACE FUNCTION toggle_project_board_lock(
supabase\migrations\20260429113853_phase_3_1_project_board.sql:194:    RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:108:-- RPC: add_project_board_url
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:115:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:141:    RAISE EXCEPTION 'add_project_board_url: board not found';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:149:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:153:    RAISE EXCEPTION 'add_project_board_url: board is locked';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:159:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:167:    RAISE EXCEPTION 'add_project_board_url: invalid URL (must be http:// or https://, max 2000 chars)';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:172:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:177:    RAISE EXCEPTION 'add_project_board_url: provider must be youtube, vimeo, or generic';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:202:-- RPC: remove_project_board_attachment
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:208:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:229:    RAISE EXCEPTION 'remove_project_board_attachment: board not found';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:237:    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:241:    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:245:    RAISE EXCEPTION 'remove_project_board_attachment: kind must be pdf or url';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:281:-- RPC: update_project_board_url_note
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:285:CREATE OR REPLACE FUNCTION update_project_board_url_note(
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:306:    RAISE EXCEPTION 'update_project_board_url_note: board not found';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:314:    RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:318:    RAISE EXCEPTION 'update_project_board_url_note: board is locked';
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:322:    RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:88:-- FIX HIGH-A #1b: add_project_board_url ??owner_id -> created_by
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:91:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:112:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:121:    RAISE EXCEPTION 'add_project_board_url: board not found';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:129:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:133:    RAISE EXCEPTION 'add_project_board_url: board is locked';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:139:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:143:    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:147:    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:151:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:172:-- FIX HIGH-A #1c: remove_project_board_attachment ??owner_id -> created_by
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:174:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:190:    RAISE EXCEPTION 'remove_project_board_attachment: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:199:    RAISE EXCEPTION 'remove_project_board_attachment: board not found';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:207:    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:211:    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:231:    RAISE EXCEPTION 'remove_project_board_attachment: invalid kind (must be pdf or url)';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:239:-- FIX HIGH-A #1d: update_project_board_url_note ??owner_id -> created_by
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:241:CREATE OR REPLACE FUNCTION update_project_board_url_note(
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:257:    RAISE EXCEPTION 'update_project_board_url_note: unauthenticated';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:266:    RAISE EXCEPTION 'update_project_board_url_note: board not found';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:274:    RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:278:    RAISE EXCEPTION 'update_project_board_url_note: board is locked';
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:282:    RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:1:-- Phase 3.1 hotfix-3 K-05 Loop 1 fix ??add_project_board_url jsonb correction
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:4:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:25:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:34:    RAISE EXCEPTION 'add_project_board_url: board not found';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:42:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:46:    RAISE EXCEPTION 'add_project_board_url: board is locked';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:52:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:56:    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:60:    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
supabase\migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:64:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:11:-- add_project_board_pdf / add_project_board_url RPC validation
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:27:--   - add_project_board_url       (SECURITY DEFINER RPC)
supabase\migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:28:--   - toggle_project_board_lock   (SECURITY DEFINER RPC)

2026-05-03T15:50:38.735035Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: regex parse error:
    (?:createSupabaseService|service.*from\(\)
    ^
error: unclosed group

 exited 1 in 392ms:
rg: regex parse error:
    (?:createSupabaseService|service.*from\(\)
    ^
error: unclosed group

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"seed_project_board_from_wizard\" supabase\\migrations\\*.sql src\\lib\\supabase\\database.types.ts" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE POLICY projects_insert|DROP POLICY IF EXISTS projects_insert|ALTER POLICY projects_insert|projects_insert\" supabase\\migrations" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"p_initial_asset_index|p_initial_attached_pdfs|attached_pdfs = EXCLUDED|asset_index   = EXCLUDED|asset_index = EXCLUDED\" supabase\\migrations src" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard|REVOKE ALL ON FUNCTION seed_project_board_from_wizard|REVOKE EXECUTE ON FUNCTION seed_project_board_from_wizard|ALTER DEFAULT PRIVILEGES.*FUNCTION\" supabase\\migrations" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T15:51:23.477862Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
src\lib\supabase\database.types.ts:2683:      seed_project_board_from_wizard:
rg: supabase\migrations\*.sql: ?뚯씪 ?대쫫, ?붾젆?곕━ ?대쫫 ?먮뒗 蹂쇰ⅷ ?덉씠釉?援щЦ???섎せ?섏뿀?듬땲?? (os error 123)

 exited 1 in 446ms:
src\lib\supabase\database.types.ts:2683:      seed_project_board_from_wizard:
rg: supabase\migrations\*.sql: ?뚯씪 ?대쫫, ?붾젆?곕━ ?대쫫 ?먮뒗 蹂쇰ⅷ ?덉씠釉?援щЦ???섎せ?섏뿀?듬땲?? (os error 123)

 succeeded in 464ms:
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4120:-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
supabase\migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:2:-- Phase 3.0 K-05 LOOP 1 fix ??HIGH-A: projects_insert RLS too restrictive
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:26:DROP POLICY IF EXISTS projects_insert ON public.projects;
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
supabase\migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:35:COMMENT ON POLICY projects_insert ON public.projects IS

 succeeded in 542ms:
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:308:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:310:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:346:    p_project_id, p_initial_document, p_initial_attached_pdfs,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:347:    p_initial_attached_urls, p_initial_asset_index, 'wizard_seed'
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:351:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase\migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:353:        asset_index   = EXCLUDED.asset_index,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:346:-- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:353:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:355:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:390:    p_initial_attached_pdfs,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:392:    p_initial_asset_index,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:397:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase\migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:399:        asset_index   = EXCLUDED.asset_index,
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:13:  p_initial_asset_index jsonb DEFAULT '[]'::jsonb
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:51:  VALUES (p_project_id, p_initial_document, COALESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
src\lib\supabase\database.types.ts:2686:              p_initial_asset_index?: Json
src\lib\supabase\database.types.ts:2694:              p_initial_asset_index?: Json
src\lib\supabase\database.types.ts:2695:              p_initial_attached_pdfs?: Json
src\app\[locale]\app\projects\new\actions.ts:945:      p_initial_attached_pdfs: seedAttachedPdfs,
src\app\[locale]\app\projects\new\actions.ts:947:      p_initial_asset_index: seedAssetIndex,

 succeeded in 541ms:
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:63:REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
supabase\migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase\\migrations\\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql' | ForEach-Object { "'$i++; if ($i -le 60) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 367ms:
   1: -- =============================================================================
   2: -- Phase 3.0 K-05 LOOP 1 fix ??HIGH-A: projects_insert RLS too restrictive
   3: -- =============================================================================
   4: -- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
   5: -- since Phase 2.0 baseline. A regular workspace member (client with
   6: -- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
   7: -- authenticated client. This blocks all project submissions from non-admin
   8: -- workspace members ??the primary user class for project submission.
   9: --
  10: -- Root cause: Phase 2.0 baseline wrote the policy for the admin-only project
  11: -- creation path (commission intake). Phase 3.0 submitProjectAction added a
  12: -- client-facing path using the user-scoped client without catching that the
  13: -- INSERT policy would reject non-admin clients.
  14: --
  15: -- In prod today (2026-04-28) workspace_members only has role='admin' rows
  16: -- (2 rows, both Yagi internal), so the bug was masked during all Phase 2.x
  17: -- development. A real client (role='member' or 'viewer') would hit RLS
  18: -- rejection on every project submit.
  19: --
  20: -- Fix: extend WITH CHECK to is_ws_member (any workspace member), matching
  21: -- the read policy (projects_read uses is_ws_member). The trigger guard
  22: -- (trg_guard_projects_status) and is_valid_transition() continue to gate
  23: -- all status transitions independently.
  24: -- =============================================================================
  25: 
  26: DROP POLICY IF EXISTS projects_insert ON public.projects;
  27: 
  28: CREATE POLICY projects_insert ON public.projects
  29:   FOR INSERT TO authenticated
  30:   WITH CHECK (
  31:     public.is_ws_member(auth.uid(), workspace_id)
  32:     OR public.is_yagi_admin(auth.uid())
  33:   );
  34: 
  35: COMMENT ON POLICY projects_insert ON public.projects IS
  36:   'K-05 LOOP 1 fix (20260427182456): any workspace member may INSERT projects. '
  37:   'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
  38:   'project submissions. is_yagi_admin path preserved for admin console creates.';

codex
## VERDICT: NEEDS-ATTENTION

VERDICT: NEEDS-ATTENTION ??do not apply migrations until findings are addressed.

[FINDING 1] HIGH-B: src/app/[locale]/app/projects/new/actions.ts:688 ??wizard now stores `board-assets/<user>/<uuid>.pdf`, but server validation still only accepts `project-wizard/` or `project-board/`, so any wizard submit with PDFs fails before the migration?셲 new prefix can help ??fix by accepting `board-assets/` only with a server-side owner prefix check after auth, e.g. `board-assets/${user.id}/`.

[FINDING 2] HIGH-B: supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:78 ??`add_project_board_pdf` accepts broad `board-assets/%`, allowing a caller who can mutate their own board to persist another user?셲 R2 key if known ??fix the RPC to bind prefixes, at minimum `board-assets/<v_caller_id>/...` and preferably `project-board/<p_board_id>/...`.

[FINDING 3] HIGH-B: supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342 ??`seed_project_board_from_wizard` remains a SECURITY DEFINER path that accepts caller-supplied `attached_pdfs`, `attached_urls`, and `asset_index`, then upserts server-managed board columns; this bypasses the table-level UPDATE revoke entirely if the RPC is callable ??fix by revoking direct execute and moving seed to a service-role server action after validation, or make the RPC validate owner-bound storage keys and compute/ignore `p_initial_asset_index`.

[FINDING 4] HIGH-B: src/app/[locale]/app/projects/[id]/board-actions.ts:98 ??`updateProjectBoardAction` authorizes the service-role UPDATE with only a user-scoped `project_boards` SELECT, but that RLS allows workspace members, not the project owner/admin policy enforced by the detail page and attachment RPCs ??fix by selecting the parent project and explicitly requiring `created_by = user.id` or yagi/workspace admin before the service-role UPDATE.

[FINDING 5] MED-B: supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:51 ??migration assertions check direct `information_schema` grants for `authenticated`, not effective privileges through `PUBLIC` or inherited roles ??add `has_table_privilege('authenticated', 'public.project_boards', 'UPDATE')` and `has_column_privilege(...)` assertions for the denied columns.

Run log summary: sub_03 active-workspace cascade mostly verifies, but sub_03f remains blocked by PDF prefix mismatch, broad R2 key trust, an RPC asset-index bypass, and insufficient service-role authorization.
2026-05-03T15:52:00.851318Z ERROR codex_core::session: failed to record rollout items: thread 019dee86-4f7f-7d10-b621-5c04c7c96773 not found
tokens used
628,414
## VERDICT: NEEDS-ATTENTION

VERDICT: NEEDS-ATTENTION ??do not apply migrations until findings are addressed.

[FINDING 1] HIGH-B: src/app/[locale]/app/projects/new/actions.ts:688 ??wizard now stores `board-assets/<user>/<uuid>.pdf`, but server validation still only accepts `project-wizard/` or `project-board/`, so any wizard submit with PDFs fails before the migration?셲 new prefix can help ??fix by accepting `board-assets/` only with a server-side owner prefix check after auth, e.g. `board-assets/${user.id}/`.

[FINDING 2] HIGH-B: supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:78 ??`add_project_board_pdf` accepts broad `board-assets/%`, allowing a caller who can mutate their own board to persist another user?셲 R2 key if known ??fix the RPC to bind prefixes, at minimum `board-assets/<v_caller_id>/...` and preferably `project-board/<p_board_id>/...`.

[FINDING 3] HIGH-B: supabase/migrations/20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342 ??`seed_project_board_from_wizard` remains a SECURITY DEFINER path that accepts caller-supplied `attached_pdfs`, `attached_urls`, and `asset_index`, then upserts server-managed board columns; this bypasses the table-level UPDATE revoke entirely if the RPC is callable ??fix by revoking direct execute and moving seed to a service-role server action after validation, or make the RPC validate owner-bound storage keys and compute/ignore `p_initial_asset_index`.

[FINDING 4] HIGH-B: src/app/[locale]/app/projects/[id]/board-actions.ts:98 ??`updateProjectBoardAction` authorizes the service-role UPDATE with only a user-scoped `project_boards` SELECT, but that RLS allows workspace members, not the project owner/admin policy enforced by the detail page and attachment RPCs ??fix by selecting the parent project and explicitly requiring `created_by = user.id` or yagi/workspace admin before the service-role UPDATE.

[FINDING 5] MED-B: supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:51 ??migration assertions check direct `information_schema` grants for `authenticated`, not effective privileges through `PUBLIC` or inherited roles ??add `has_table_privilege('authenticated', 'public.project_boards', 'UPDATE')` and `has_column_privilege(...)` assertions for the denied columns.

Run log summary: sub_03 active-workspace cascade mostly verifies, but sub_03f remains blocked by PDF prefix mismatch, broad R2 key trust, an RPC asset-index bypass, and insufficient service-role authorization.

codex
The loop 1 report is confirmed: those five issues are the baseline. I’ve also confirmed the new commit is present, so I’m now reading the exact replacement function bodies and the surrounding schema/RLS details instead of relying on the commit message.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/board-actions.ts' | ForEach-Object { "'$i++; if ($i -le 230 -or ($i -ge 380 -and $i -le 520) -or ($i -ge 540 -and $i -le 760)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/actions.ts' | ForEach-Object { "'$i++; if (($i -ge 520 -and $i -le 980) -or ($i -ge 1 -and $i -le 170)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql' | ForEach-Object { "'$i++; '"'{0,4}: {1}' -f "'$i, $_ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 416ms:
   1: -- Wave C.5d sub_03f_5 F3 ??seed_project_board_from_wizard hardening.
   2: --
   3: -- Codex K-05 (codex exec, 2026-05-04) HIGH-B finding: the existing seed
   4: -- function from migration 20260429151821 is `SECURITY DEFINER` and is
   5: -- granted to `authenticated`. It writes the three server-managed
   6: -- columns on project_boards (attached_pdfs, attached_urls, asset_index)
   7: -- using values supplied by the caller. The Wave C.5d sub_03f_2
   8: -- table-level UPDATE revoke does NOT cover SECURITY DEFINER paths, so
   9: -- a malicious client could invoke this RPC directly (bypassing
  10: -- submitProjectAction's server-side asset_index recomputation and
  11: -- caller-bound storage_key checks) and persist arbitrary R2 keys.
  12: --
  13: -- This migration replaces the function with a hardened version that:
  14: --
  15: --   1. Validates every storage_key in `p_initial_attached_pdfs` is
  16: --      caller-bound. The accepted prefixes match
  17: --      `add_project_board_pdf` (sub_03f_5 F2):
  18: --        - `board-assets/<auth.uid()>/...`
  19: --        - `project-wizard/<auth.uid()>/...`
  20: --        - `project-board/<v_board_id>/...` (board belongs to project)
  21: --      Anything else is rejected.
  22: --
  23: --   2. Validates every URL in `p_initial_attached_urls` is http or
  24: --      https only. (Defense in depth ??add_project_board_url already
  25: --      enforces this, but the seed path predates that gate.)
  26: --
  27: --   3. Server-recomputes `asset_index` from the validated
  28: --      attached_pdfs + attached_urls arrays. The `p_initial_asset_index`
  29: --      parameter is retained for caller backwards compatibility but
  30: --      its value is IGNORED. Canvas-derived entries are not built here
  31: --      (parsing tldraw store snapshots in plpgsql is not supported);
  32: --      the first saveBoardDocumentAction call after seed will rebuild
  33: --      asset_index including canvas entries via the user-action's
  34: --      TypeScript extractAssetIndex helper. Empty/near-empty documents
  35: --      at wizard submit are the common case, so the gap is bounded.
  36: --
  37: --   4. Keeps the existing auth + project status gates (yagi_admin OR
  38: --      project.created_by == caller, project.status == 'in_review').
  39: 
  40: -- Helper function ??caller-bound storage_key check used by the seed
  41: -- function for every entry in p_initial_attached_pdfs. Mirrored on
  42: -- add_project_board_pdf inside migration 20260504004349 so the two
  43: -- write paths stay in sync.
  44: CREATE OR REPLACE FUNCTION assert_caller_bound_pdf_storage_key(
  45:   p_storage_key text,
  46:   p_caller_id   uuid,
  47:   p_board_id    uuid
  48: ) RETURNS void
  49: LANGUAGE plpgsql
  50: IMMUTABLE
  51: AS $$
  52: BEGIN
  53:   IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
  54:     RAISE EXCEPTION 'caller-bound check: invalid storage_key (null/traversal/leading slash)';
  55:   END IF;
  56:   IF NOT (
  57:     p_storage_key LIKE 'board-assets/' || p_caller_id::text || '/%'
  58:     OR p_storage_key LIKE 'project-wizard/' || p_caller_id::text || '/%'
  59:     OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
  60:   ) THEN
  61:     RAISE EXCEPTION 'caller-bound check: storage_key % not bound to caller % or board %',
  62:       p_storage_key, p_caller_id, p_board_id;
  63:   END IF;
  64: END;
  65: $$;
  66: 
  67: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  68:   p_project_id            uuid,
  69:   p_initial_document      jsonb,
  70:   p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
  71:   p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
  72:   p_initial_asset_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
  73: )
  74: RETURNS uuid
  75: LANGUAGE plpgsql
  76: SECURITY DEFINER
  77: SET search_path = public, pg_temp
  78: AS $$
  79: DECLARE
  80:   v_board_id          uuid;
  81:   v_existing_board_id uuid;
  82:   v_project_status    text;
  83:   v_caller_id         uuid := auth.uid();
  84:   v_pdf               jsonb;
  85:   v_url               jsonb;
  86:   v_url_text          text;
  87:   v_pdf_entries       jsonb := '[]'::jsonb;
  88:   v_url_entries       jsonb := '[]'::jsonb;
  89:   v_asset_index       jsonb;
  90: BEGIN
  91:   -- Auth gate (unchanged from prior migration).
  92:   IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
  93:     SELECT 1 FROM projects p
  94:     WHERE p.id = p_project_id AND p.created_by = v_caller_id
  95:   ) THEN
  96:     RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
  97:   END IF;
  98: 
  99:   SELECT status INTO v_project_status
 100:   FROM projects
 101:   WHERE id = p_project_id;
 102: 
 103:   IF v_project_status IS NULL THEN
 104:     RAISE EXCEPTION 'project not found: %', p_project_id;
 105:   END IF;
 106: 
 107:   IF v_project_status != 'in_review' THEN
 108:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
 109:       p_project_id, v_project_status;
 110:   END IF;
 111: 
 112:   -- Resolve / pre-create the board id so caller-bound checks for
 113:   -- `project-board/<v_board_id>/...` storage_keys can run before we
 114:   -- accept any client-supplied attachments.
 115:   SELECT id INTO v_existing_board_id
 116:   FROM project_boards WHERE project_id = p_project_id;
 117:   v_board_id := COALESCE(v_existing_board_id, gen_random_uuid());
 118: 
 119:   -- ---------- Validate attached_pdfs ----------
 120:   IF p_initial_attached_pdfs IS NOT NULL AND jsonb_typeof(p_initial_attached_pdfs) = 'array' THEN
 121:     FOR v_pdf IN SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
 122:     LOOP
 123:       PERFORM assert_caller_bound_pdf_storage_key(
 124:         v_pdf->>'storage_key',
 125:         v_caller_id,
 126:         v_board_id
 127:       );
 128:     END LOOP;
 129:   END IF;
 130: 
 131:   -- ---------- Validate attached_urls (http/https only) ----------
 132:   IF p_initial_attached_urls IS NOT NULL AND jsonb_typeof(p_initial_attached_urls) = 'array' THEN
 133:     FOR v_url IN SELECT * FROM jsonb_array_elements(p_initial_attached_urls)
 134:     LOOP
 135:       v_url_text := v_url->>'url';
 136:       IF v_url_text IS NULL
 137:          OR length(v_url_text) = 0
 138:          OR length(v_url_text) > 2000
 139:          OR NOT (v_url_text ~* '^https?://') THEN
 140:         RAISE EXCEPTION 'seed_project_board_from_wizard: attached_url scheme must be http or https (got %)',
 141:           coalesce(left(v_url_text, 80), '<null>');
 142:       END IF;
 143:     END LOOP;
 144:   END IF;
 145: 
 146:   -- ---------- Server-recompute asset_index from arrays ----------
 147:   -- (sub_03f_5 F3 option A) Canvas-derived entries are not built here;
 148:   -- the first saveBoardDocumentAction call rebuilds asset_index from
 149:   -- the document via the TypeScript extractAssetIndex helper.
 150:   -- p_initial_asset_index is intentionally ignored.
 151:   IF p_initial_attached_pdfs IS NOT NULL AND jsonb_typeof(p_initial_attached_pdfs) = 'array' THEN
 152:     SELECT COALESCE(jsonb_agg(
 153:       jsonb_build_object(
 154:         'id',           pdf->>'id',
 155:         'source',       'attached_pdf',
 156:         'kind',         'pdf',
 157:         'url',          pdf->>'storage_key',
 158:         'title',        pdf->>'filename',
 159:         'thumbnail_url', NULL,
 160:         'filename',     pdf->>'filename',
 161:         'size_bytes',   (pdf->>'size_bytes')::bigint,
 162:         'note',         NULL,
 163:         'added_at',     pdf->>'uploaded_at'
 164:       )
 165:       ORDER BY pdf->>'uploaded_at'
 166:     ), '[]'::jsonb)
 167:     INTO v_pdf_entries
 168:     FROM jsonb_array_elements(p_initial_attached_pdfs) AS pdf;
 169:   END IF;
 170: 
 171:   IF p_initial_attached_urls IS NOT NULL AND jsonb_typeof(p_initial_attached_urls) = 'array' THEN
 172:     SELECT COALESCE(jsonb_agg(
 173:       jsonb_build_object(
 174:         'id',           u->>'id',
 175:         'source',       'attached_url',
 176:         'kind',         'url',
 177:         'url',          u->>'url',
 178:         'title',        u->>'title',
 179:         'thumbnail_url', u->>'thumbnail_url',
 180:         'provider',     u->>'provider',
 181:         'note',         u->>'note',
 182:         'added_at',     u->>'added_at'
 183:       )
 184:       ORDER BY u->>'added_at'
 185:     ), '[]'::jsonb)
 186:     INTO v_url_entries
 187:     FROM jsonb_array_elements(p_initial_attached_urls) AS u;
 188:   END IF;
 189: 
 190:   v_asset_index := v_pdf_entries || v_url_entries;
 191: 
 192:   -- ---------- Upsert ----------
 193:   INSERT INTO project_boards (
 194:     id, project_id, document, attached_pdfs, attached_urls, asset_index, source
 195:   )
 196:   VALUES (
 197:     v_board_id,
 198:     p_project_id,
 199:     p_initial_document,
 200:     COALESCE(p_initial_attached_pdfs, '[]'::jsonb),
 201:     COALESCE(p_initial_attached_urls, '[]'::jsonb),
 202:     v_asset_index,
 203:     'wizard_seed'
 204:   )
 205:   ON CONFLICT (project_id) DO UPDATE
 206:     SET document      = EXCLUDED.document,
 207:         attached_pdfs = EXCLUDED.attached_pdfs,
 208:         attached_urls = EXCLUDED.attached_urls,
 209:         asset_index   = EXCLUDED.asset_index,
 210:         source        = 'wizard_seed',
 211:         updated_at    = now()
 212:   RETURNING id INTO v_board_id;
 213: 
 214:   RETURN v_board_id;
 215: END;
 216: $$;
 217: 
 218: COMMENT ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb, jsonb, jsonb) IS
 219:   'Wave C.5d sub_03f_5 F3: caller-bound storage_key validation on every '
 220:   'attached_pdf entry, http/https-only attached_url, server-recomputed '
 221:   'asset_index from arrays (canvas entries added on first save). '
 222:   'p_initial_asset_index parameter retained for caller compat but ignored.';

 succeeded in 390ms:
   1: -- Wave C.5d sub_03f_2 ??close the project_boards UPDATE bypass.
   2: --
   3: -- Phase 3.1 hotfix-3 (migration 20260429151821) tried to seal the three
   4: -- server-managed columns on project_boards (attached_pdfs, attached_urls,
   5: -- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
   6: -- role still holds table-level UPDATE: Postgres column privileges
   7: -- evaluate as max(table-grant, column-grant). The default Supabase
   8: -- bootstrap grants table-level UPDATE to `authenticated` on every public
   9: -- table, so PostgREST clients have been able to UPDATE attached_pdfs /
  10: -- attached_urls / asset_index directly, bypassing
  11: -- add_project_board_pdf / add_project_board_url RPC validation
  12: -- (count cap, URL scheme allowlist, lock state) and the asset_index
  13: -- trust boundary (server-recomputed from document + attached_*).
  14: --
  15: -- Codex generic K-05 review (Phase 4.x branch, 2026-05-03) flagged this
  16: -- as P1.
  17: --
  18: -- Lockdown:
  19: --   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
  20: --   2. GRANT  UPDATE (document, updated_at) TO authenticated
  21: --
  22: -- After this migration, the only columns an authenticated PostgREST
  23: -- client can UPDATE on project_boards are `document` (the user's own
  24: -- tldraw store snapshot) and `updated_at` (timestamp the user can
  25: -- trigger via document edits). All other columns flow through:
  26: --   - add_project_board_pdf       (SECURITY DEFINER RPC)
  27: --   - add_project_board_url       (SECURITY DEFINER RPC)
  28: --   - toggle_project_board_lock   (SECURITY DEFINER RPC)
  29: --   - service-role client inside board-actions.ts (asset_index updates
  30: --     in saveBoardDocumentAction, restoreVersionAction, and the
  31: --     recomputeAndUpdateAssetIndex helper)
  32: --
  33: -- The companion source-code refactor in
  34: -- src/app/[locale]/app/projects/[id]/board-actions.ts is shipped in the
  35: -- same Wave C.5d sub_03f_2 commit so the autosave / restore / repair
  36: -- paths keep working under the new grant.
  37: 
  38: REVOKE UPDATE ON project_boards FROM authenticated;
  39: GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
  40: 
  41: -- Sanity assertions ??fail the migration if the privilege state is not
  42: -- what we expect, so we never silently ship a half-applied lockdown.
  43: --
  44: -- Wave C.5d sub_03f_5 F5: information_schema.role_table_grants /
  45: -- column_privileges only see direct grants to the named role; they do
  46: -- not surface privileges inherited via PUBLIC or via role membership.
  47: -- Use has_table_privilege() / has_column_privilege() instead ??those
  48: -- check effective privileges (the same path PostgREST evaluates) so
  49: -- the assertion catches drift through any inheritance chain.
  50: DO $$
  51: BEGIN
  52:   -- Effective table-level UPDATE must be denied to authenticated.
  53:   IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
  54:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';
  55:   END IF;
  56: 
  57:   -- Effective column-level UPDATE must remain on the explicitly granted
  58:   -- columns the action layer relies on.
  59:   IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
  60:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.document';
  61:   END IF;
  62:   IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
  63:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.updated_at';
  64:   END IF;
  65: 
  66:   -- Effective column-level UPDATE must be denied on every server-managed
  67:   -- column. asset_index, attached_pdfs, attached_urls, is_locked,
  68:   -- locked_by, locked_at, schema_version, source, project_id, id flow
  69:   -- through SECURITY DEFINER RPCs or the service-role client.
  70:   IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
  71:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
  72:   END IF;
  73:   IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
  74:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
  75:   END IF;
  76:   IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
  77:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
  78:   END IF;
  79:   IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
  80:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
  81:   END IF;
  82:   IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
  83:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_by';
  84:   END IF;
  85:   IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
  86:     RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
  87:   END IF;
  88: END $$;

 succeeded in 416ms:
   1: -- Wave C.5d sub_03f_1 + sub_03f_5 F2 ??allow `board-assets/` prefix on
   2: -- add_project_board_pdf with caller-bound prefix checks.
   3: --
   4: -- Background: getBoardAssetPutUrlAction (Phase 3.0) generates a
   5: -- server-side R2 upload key shaped like `board-assets/<user>/<uuid>.<ext>`
   6: -- and presigns a PUT URL against that key. The earlier
   7: -- add_project_board_pdf RPC validation only accepted `project-wizard/%`
   8: -- and `project-board/%` prefixes, which forced the wizard client to
   9: -- prepend a literal "project-wizard" segment in front of the real key
  10: -- before persisting it through the RPC. The persisted key
  11: -- (`project-wizard/board-assets/<user>/<uuid>.<ext>`) did not exist in
  12: -- R2 and broke PDF retrieval from both the project board and the admin
  13: -- asset-list panel.
  14: --
  15: -- This migration:
  16: --   1. Extends the validation allowlist to include `board-assets/%`,
  17: --      so the wizard can write the bare R2 key.
  18: --   2. (sub_03f_5 F2) Binds every accepted prefix to the caller's own
  19: --      identity so a malicious authenticated user cannot persist another
  20: --      user's R2 key (or another board's project-board/ key) via this
  21: --      RPC. Prefix-to-binding map:
  22: --        - `board-assets/<auth.uid()>/...`
  23: --        - `project-wizard/<auth.uid()>/...`
  24: --        - `project-board/<p_board_id>/...`
  25: --      Anything else under those prefixes is rejected.
  26: --
  27: -- Production audit at sub_03f_1 apply time: 0 broken-prefix entries
  28: -- persisted in attached_pdfs, so no backfill is required.
  29: 
  30: CREATE OR REPLACE FUNCTION add_project_board_pdf(
  31:   p_board_id    uuid,
  32:   p_storage_key text,
  33:   p_filename    text,
  34:   p_size_bytes  bigint
  35: ) RETURNS uuid
  36: LANGUAGE plpgsql
  37: SECURITY DEFINER
  38: SET search_path = public, pg_temp
  39: AS $$
  40: DECLARE
  41:   v_caller_id  uuid := auth.uid();
  42:   v_project_id uuid;
  43:   v_is_locked  boolean;
  44:   v_is_admin   boolean;
  45:   v_new_id     uuid := gen_random_uuid();
  46:   v_pdf_count  int;
  47: BEGIN
  48:   IF v_caller_id IS NULL THEN
  49:     RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
  50:   END IF;
  51: 
  52:   SELECT pb.project_id, pb.is_locked
  53:   INTO v_project_id, v_is_locked
  54:   FROM project_boards pb
  55:   WHERE pb.id = p_board_id;
  56: 
  57:   IF NOT FOUND THEN
  58:     RAISE EXCEPTION 'add_project_board_pdf: board not found';
  59:   END IF;
  60: 
  61:   v_is_admin := is_yagi_admin(v_caller_id);
  62:   IF NOT v_is_admin AND NOT EXISTS (
  63:     SELECT 1 FROM projects p
  64:     WHERE p.id = v_project_id AND p.created_by = v_caller_id
  65:   ) THEN
  66:     RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
  67:   END IF;
  68: 
  69:   IF v_is_locked AND NOT v_is_admin THEN
  70:     RAISE EXCEPTION 'add_project_board_pdf: board is locked';
  71:   END IF;
  72: 
  73:   SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
  74:   FROM project_boards WHERE id = p_board_id;
  75:   IF v_pdf_count >= 30 THEN
  76:     RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
  77:   END IF;
  78: 
  79:   IF p_size_bytes > 20 * 1024 * 1024 THEN
  80:     RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
  81:   END IF;
  82: 
  83:   IF p_filename IS NULL OR length(p_filename) = 0 OR length(p_filename) > 200 THEN
  84:     RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
  85:   END IF;
  86: 
  87:   IF p_storage_key IS NULL OR p_storage_key LIKE '%..%' OR left(p_storage_key, 1) = '/' THEN
  88:     RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (null/traversal/leading slash)';
  89:   END IF;
  90: 
  91:   -- sub_03f_5 F2: every accepted prefix is caller-bound. The role-bound
  92:   -- prefixes use auth.uid() to prevent persisting another authenticated
  93:   -- user's R2 key; the project-board prefix is bound to p_board_id so it
  94:   -- cannot be cross-board persisted. Anything else is rejected.
  95:   IF NOT (
  96:     p_storage_key LIKE 'board-assets/' || v_caller_id::text || '/%'
  97:     OR p_storage_key LIKE 'project-wizard/' || v_caller_id::text || '/%'
  98:     OR p_storage_key LIKE 'project-board/' || p_board_id::text || '/%'
  99:   ) THEN
 100:     RAISE EXCEPTION 'add_project_board_pdf: storage_key prefix must be caller-bound (board-assets/<caller>/, project-wizard/<caller>/, or project-board/<p_board_id>/)';
 101:   END IF;
 102: 
 103:   UPDATE project_boards
 104:   SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
 105:     'id', v_new_id::text,
 106:     'storage_key', p_storage_key,
 107:     'filename', p_filename,
 108:     'size_bytes', p_size_bytes,
 109:     'uploaded_at', now()::text,
 110:     'uploaded_by', v_caller_id::text
 111:   )), updated_at = now()
 112:   WHERE id = p_board_id;
 113: 
 114:   RETURN v_new_id;
 115: END;
 116: $$;

 succeeded in 463ms:
   1: "use server";
   2: 
   3: /**
   4:  * board-actions.ts
   5:  * Phase 3.1 task_05 ??server actions for ProjectBoard brief mode.
   6:  *
   7:  * Three actions:
   8:  *   - updateProjectBoardAction(projectId, document)
   9:  *       Validates auth + lock state; recomputes asset_index server-side
  10:  *       (K-05 trust boundary ??never trust client-supplied asset_index);
  11:  *       inserts a project_board_versions snapshot if >30s since last;
  12:  *       updates project_boards.{document, asset_index, updated_at}.
  13:  *
  14:  *   - toggleLockAction(boardId, locked)
  15:  *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
  16:  *
  17:  *   - restoreVersionAction(boardId, version)
  18:  *       Admin-only; copies project_board_versions.document back into
  19:  *       project_boards.document and recomputes asset_index.
  20:  *
  21:  * All anti-DoS: 5MB serialized cap on document.
  22:  */
  23: 
  24: import { z } from "zod";
  25: import { revalidatePath } from "next/cache";
  26: import { createSupabaseServer } from "@/lib/supabase/server";
  27: import { createSupabaseService } from "@/lib/supabase/service";
  28: import { extractAssetIndex } from "@/lib/board/asset-index";
  29: import {
  30:   createBriefAssetPutUrl,
  31:   briefObjectPublicUrl,
  32: } from "@/lib/r2/client";
  33: import { fetchVideoMetadata } from "@/lib/oembed";
  34: 
  35: const VERSION_DEBOUNCE_MS = 30_000;
  36: const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
  37: 
  38: // K-05 LOOP 1 MEDIUM F6 fix: same validator as wizard's submitProjectAction
  39: // to reject malformed tldraw store snapshots. Empty {} is permitted (a brief
  40: // in initial state). Otherwise document MUST contain a `store` object key.
  41: function validateTldrawStore(doc: Record<string, unknown>): boolean {
  42:   if (!doc || typeof doc !== "object") return false;
  43:   if (Object.keys(doc).length === 0) return true;
  44:   if (!("store" in doc)) return false;
  45:   const store = (doc as { store: unknown }).store;
  46:   if (typeof store !== "object" || store === null) return false;
  47:   return true;
  48: }
  49: 
  50: // ============================================================
  51: // updateProjectBoardAction
  52: // ============================================================
  53: 
  54: const UpdateBoardSchema = z.object({
  55:   projectId: z.string().uuid(),
  56:   document: z
  57:     .record(z.string(), z.unknown())
  58:     .refine(validateTldrawStore, {
  59:       message: "document is not a valid tldraw store snapshot",
  60:     }),
  61: });
  62: 
  63: export type UpdateBoardResult =
  64:   | { ok: true; boardId: string }
  65:   | {
  66:       ok: false;
  67:       error:
  68:         | "unauthenticated"
  69:         | "validation"
  70:         | "locked"
  71:         | "not_found"
  72:         | "forbidden"
  73:         | "db";
  74:       message?: string;
  75:     };
  76: 
  77: export async function updateProjectBoardAction(
  78:   input: unknown
  79: ): Promise<UpdateBoardResult> {
  80:   const parsed = UpdateBoardSchema.safeParse(input);
  81:   if (!parsed.success) return { ok: false, error: "validation" };
  82: 
  83:   // Anti-DoS
  84:   let serialized: string;
  85:   try {
  86:     serialized = JSON.stringify(parsed.data.document);
  87:   } catch {
  88:     return { ok: false, error: "validation" };
  89:   }
  90:   if (serialized.length > DOCUMENT_MAX_BYTES) {
  91:     return { ok: false, error: "validation", message: "document_too_large" };
  92:   }
  93: 
  94:   const supabase = await createSupabaseServer();
  95:   const {
  96:     data: { user },
  97:   } = await supabase.auth.getUser();
  98:   if (!user) return { ok: false, error: "unauthenticated" };
  99: 
 100:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 101:   const sb = supabase as any;
 102: 
 103:   // Wave C.5d sub_03f_5 F4: project_boards_update_client RLS scopes by
 104:   // workspace membership, but a workspace member who is NOT the project
 105:   // creator (and not yagi/workspace admin) must not be able to autosave
 106:   // a teammate's brief. Re-verify ownership in the action layer before
 107:   // the service-role UPDATE bypasses RLS.
 108:   const { data: project, error: pErr } = await sb
 109:     .from("projects")
 110:     .select("created_by, workspace_id")
 111:     .eq("id", parsed.data.projectId)
 112:     .maybeSingle();
 113:   if (pErr || !project) return { ok: false, error: "not_found" };
 114: 
 115:   const isCreator = project.created_by === user.id;
 116:   let isAuthorized = isCreator;
 117:   if (!isAuthorized) {
 118:     const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
 119:       uid: user.id,
 120:     });
 121:     if (yagiAdmin) {
 122:       isAuthorized = true;
 123:     } else {
 124:       const { data: member } = await sb
 125:         .from("workspace_members")
 126:         .select("role")
 127:         .eq("workspace_id", project.workspace_id)
 128:         .eq("user_id", user.id)
 129:         .maybeSingle();
 130:       const memberRole = (member as { role: string } | null)?.role;
 131:       if (memberRole === "owner" || memberRole === "admin") {
 132:         isAuthorized = true;
 133:       }
 134:     }
 135:   }
 136:   if (!isAuthorized) return { ok: false, error: "forbidden" };
 137: 
 138:   // Fetch the board (RLS gates SELECT ??non-owner non-admin gets nothing)
 139:   const { data: board, error: bErr } = await sb
 140:     .from("project_boards")
 141:     .select("id, is_locked")
 142:     .eq("project_id", parsed.data.projectId)
 143:     .maybeSingle();
 144:   if (bErr || !board) return { ok: false, error: "not_found" };
 145:   if (board.is_locked) return { ok: false, error: "locked" };
 146: 
 147:   // K-05 trust boundary: server-recompute asset_index. Never trust client.
 148:   // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
 149:   // For canvas-only update, fetch current attachment state from DB to merge.
 150:   const { data: currentBoard } = await sb
 151:     .from("project_boards")
 152:     .select("attached_pdfs, attached_urls")
 153:     .eq("id", board.id)
 154:     .maybeSingle();
 155:   const assetIndex = extractAssetIndex(
 156:     parsed.data.document,
 157:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 158:     ((currentBoard as any)?.attached_pdfs ?? []) as any,
 159:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 160:     ((currentBoard as any)?.attached_urls ?? []) as any,
 161:   );
 162: 
 163:   // K-05 LOOP 1 HIGH-B F3 fix: atomic update guarded by is_locked=false to
 164:   // close the lock race window. If admin locks between our SELECT and UPDATE,
 165:   // the WHERE clause filters it out and `updated` returns empty rows; we then
 166:   // return error:locked WITHOUT having inserted a version snapshot.
 167:   //
 168:   // Wave C.5d sub_03f_2: the migration locks `authenticated` out of
 169:   // table-level UPDATE on project_boards and only re-grants
 170:   // (document, updated_at), so PostgREST cannot UPDATE asset_index
 171:   // anymore. Use the service-role client here to write asset_index in
 172:   // the same atomic statement; authorization (workspace + lock) was
 173:   // already enforced by the user-scoped SELECT above. Race guard
 174:   // (eq is_locked=false) is preserved through the service client.
 175:   const service = createSupabaseService();
 176:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 177:   const svc = service as any;
 178:   const { data: updated, error: uErr } = await svc
 179:     .from("project_boards")
 180:     .update({
 181:       document: parsed.data.document,
 182:       asset_index: assetIndex,
 183:       updated_at: new Date().toISOString(),
 184:     })
 185:     .eq("id", board.id)
 186:     .eq("is_locked", false)
 187:     .select("id");
 188:   if (uErr) {
 189:     console.error("[updateProjectBoardAction] update error:", uErr);
 190:     return { ok: false, error: "db", message: uErr.message };
 191:   }
 192:   if (!Array.isArray(updated) || updated.length === 0) {
 193:     // Lock was acquired between SELECT and UPDATE ??no rows updated, no snapshot.
 194:     return { ok: false, error: "locked" };
 195:   }
 196: 
 197:   // Versioning: snapshot AFTER successful update (K-05 LOOP 1 HIGH-B F3 fix ??  // never insert a version row for a write that did not land).
 198:   const { data: lastVersion } = await sb
 199:     .from("project_board_versions")
 200:     .select("created_at, version")
 201:     .eq("board_id", board.id)
 202:     .order("version", { ascending: false })
 203:     .limit(1)
 204:     .maybeSingle();
 205: 
 206:   const shouldSnapshot =
 207:     !lastVersion ||
 208:     Date.now() - new Date(lastVersion.created_at as string).getTime() >
 209:       VERSION_DEBOUNCE_MS;
 210: 
 211:   if (shouldSnapshot) {
 212:     const nextVersion = ((lastVersion?.version as number | undefined) ?? 0) + 1;
 213:     // INSERT bypasses RLS via service role (project_board_versions_insert_trigger
 214:     // has WITH CHECK false, so user-scoped client cannot INSERT directly).
 215:     const svc = createSupabaseService();
 216:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 217:     await (svc as any).from("project_board_versions").insert({
 218:       board_id: board.id,
 219:       version: nextVersion,
 220:       document: parsed.data.document,
 221:       created_by: user.id,
 222:       label: null,
 223:     });
 224:   }
 225: 
 226:   revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
 227:   return { ok: true, boardId: board.id };
 228: }
 229: 
 230: // ============================================================
 380:     .eq("user_id", user.id);
 381:   const isAdmin = (roles ?? []).some(
 382:     (r) => (r as { role: string }).role === "yagi_admin"
 383:   );
 384:   if (!isAdmin) return { ok: false, error: "forbidden" };
 385: 
 386:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 387:   const sb = supabase as any;
 388:   const { data: snap, error: sErr } = await sb
 389:     .from("project_board_versions")
 390:     .select("document")
 391:     .eq("board_id", parsed.data.boardId)
 392:     .eq("version", parsed.data.version)
 393:     .maybeSingle();
 394:   if (sErr || !snap) return { ok: false, error: "not_found" };
 395: 
 396:   const restoredDoc = snap.document as Record<string, unknown>;
 397:   // K-05 LOOP 1 MEDIUM F6: validate snapshot is structurally a tldraw store
 398:   // before restoring (defense against historical bad data).
 399:   if (!validateTldrawStore(restoredDoc)) {
 400:     return { ok: false, error: "validation", message: "snapshot_malformed" };
 401:   }
 402:   // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
 403:   const { data: boardForRestore } = await sb
 404:     .from("project_boards")
 405:     .select("attached_pdfs, attached_urls")
 406:     .eq("id", parsed.data.boardId)
 407:     .maybeSingle();
 408:   const assetIndex = extractAssetIndex(
 409:     restoredDoc,
 410:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 411:     ((boardForRestore as any)?.attached_pdfs ?? []) as any,
 412:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 413:     ((boardForRestore as any)?.attached_urls ?? []) as any,
 414:   );
 415: 
 416:   // Resolve project_id for revalidation ??board ??project_id lookup
 417:   const { data: boardLookup } = await sb
 418:     .from("project_boards")
 419:     .select("project_id")
 420:     .eq("id", parsed.data.boardId)
 421:     .maybeSingle();
 422: 
 423:   // Wave C.5d sub_03f_2: same column-grant lockdown applies ??write
 424:   // asset_index via service role. Admin-only action (yagi_admin gate
 425:   // checked above) so authorization is well-established before this
 426:   // UPDATE runs.
 427:   const restoreService = createSupabaseService();
 428:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 429:   const restoreSvc = restoreService as any;
 430:   const { error: uErr } = await restoreSvc
 431:     .from("project_boards")
 432:     .update({
 433:       document: restoredDoc,
 434:       asset_index: assetIndex,
 435:       updated_at: new Date().toISOString(),
 436:     })
 437:     .eq("id", parsed.data.boardId);
 438:   if (uErr) {
 439:     console.error("[restoreVersionAction] update error:", uErr);
 440:     return { ok: false, error: "db", message: uErr.message };
 441:   }
 442: 
 443:   // K-05 LOOP 1 MEDIUM fix: revalidate the project page after restore so the
 444:   // canvas re-renders with the restored snapshot.
 445:   if (boardLookup?.project_id) {
 446:     revalidatePath(
 447:       `/[locale]/app/projects/${boardLookup.project_id}`,
 448:       "page"
 449:     );
 450:   }
 451:   return { ok: true };
 452: }
 453: 
 454: // ============================================================
 455: // Phase 3.1 hotfix-3 ??Attachment server actions
 456: // ============================================================
 457: // All actions: validate input, call RPC, recompute asset_index server-side,
 458: // revalidate page. Trust boundary: client never supplies asset_index (L-041).
 459: 
 460: // Helper: recompute asset_index from current board state and UPDATE.
 461: // Wave C.5d sub_03f_2: asset_index is now revoked from authenticated at
 462: // the table level. The helper still accepts a user-scoped client for the
 463: // pre-fetch SELECT so RLS gates row visibility, but the UPDATE switches
 464: // to the service-role client because column grants no longer let
 465: // authenticated write asset_index. Callers (add_project_board_pdf /
 466: // add_project_board_url action wrappers) have already validated auth
 467: // via their RPC + RLS pre-check before invoking this helper.
 468: async function recomputeAndUpdateAssetIndex(
 469:   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 470:   sb: any,
 471:   boardId: string
 472: ): Promise<void> {
 473:   const { data: board } = await sb
 474:     .from("project_boards")
 475:     .select("document, attached_pdfs, attached_urls, project_id")
 476:     .eq("id", boardId)
 477:     .maybeSingle();
 478:   if (!board) return;
 479: 
 480:   const newIndex = extractAssetIndex(
 481:     board.document as Record<string, unknown>,
 482:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 483:     (board.attached_pdfs ?? []) as any,
 484:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
 485:     (board.attached_urls ?? []) as any,
 486:   );
 487: 
 488:   const service = createSupabaseService();
 489:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 490:   const svc = service as any;
 491:   await svc
 492:     .from("project_boards")
 493:     .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
 494:     .eq("id", boardId);
 495: 
 496:   if (board.project_id) {
 497:     revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
 498:   }
 499: }
 500: 
 501: // URL validation ??only http/https allowed (L-042 server layer)
 502: const SAFE_URL_SCHEMES = ["http:", "https:"];
 503: function validateUrlScheme(url: string): boolean {
 504:   try {
 505:     const parsed = new URL(url);
 506:     return SAFE_URL_SCHEMES.includes(parsed.protocol);
 507:   } catch {
 508:     return false;
 509:   }
 510: }
 511: 
 512: // ============================================================
 513: // addPdfAttachmentAction
 514: // ============================================================
 515: 
 516: export type AddPdfResult =
 517:   | { ok: true; attachmentId: string }
 518:   | { ok: false; error: string };
 519: 
 520: export async function addPdfAttachmentAction(
 540:   const {
 541:     data: { user },
 542:   } = await supabase.auth.getUser();
 543:   if (!user) return { ok: false, error: "unauthenticated" };
 544: 
 545:   // Upload to R2 first (server-generated key for this board)
 546:   const ext = "pdf";
 547:   const uuid = crypto.randomUUID();
 548:   const storageKey = `project-board/${boardId}/${uuid}.${ext}`;
 549: 
 550:   try {
 551:     const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
 552:     const arrayBuffer = await file.arrayBuffer();
 553:     const putResp = await fetch(putUrl, {
 554:       method: "PUT",
 555:       body: arrayBuffer,
 556:       headers: { "Content-Type": file.type },
 557:     });
 558:     if (!putResp.ok) {
 559:       return { ok: false, error: "r2_put_failed" };
 560:     }
 561:   } catch (err) {
 562:     console.error("[addPdfAttachmentAction] R2 upload error:", err);
 563:     return { ok: false, error: "r2_upload_error" };
 564:   }
 565: 
 566:   // Call add_project_board_pdf RPC
 567:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 568:   const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
 569:     "add_project_board_pdf",
 570:     {
 571:       p_board_id: boardId,
 572:       p_storage_key: storageKey,
 573:       p_filename: file.name,
 574:       p_size_bytes: file.size,
 575:     }
 576:   );
 577:   if (rpcErr) {
 578:     console.error("[addPdfAttachmentAction] RPC error:", rpcErr);
 579:     return { ok: false, error: rpcErr.message };
 580:   }
 581: 
 582:   // Recompute asset_index server-side (trust boundary L-041)
 583:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 584:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 585: 
 586:   return { ok: true, attachmentId: attachmentId as string };
 587: }
 588: 
 589: // ============================================================
 590: // removePdfAttachmentAction
 591: // ============================================================
 592: 
 593: export type RemovePdfResult = { ok: true } | { ok: false; error: string };
 594: 
 595: export async function removePdfAttachmentAction(
 596:   boardId: string,
 597:   attachmentId: string
 598: ): Promise<RemovePdfResult> {
 599:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 600: 
 601:   const supabase = await createSupabaseServer();
 602:   const {
 603:     data: { user },
 604:   } = await supabase.auth.getUser();
 605:   if (!user) return { ok: false, error: "unauthenticated" };
 606: 
 607:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 608:   const { error: rpcErr } = await (supabase as any).rpc(
 609:     "remove_project_board_attachment",
 610:     {
 611:       p_board_id: boardId,
 612:       p_kind: "pdf",
 613:       p_attachment_id: attachmentId,
 614:     }
 615:   );
 616:   if (rpcErr) {
 617:     console.error("[removePdfAttachmentAction] RPC error:", rpcErr);
 618:     return { ok: false, error: rpcErr.message };
 619:   }
 620: 
 621:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 622:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 623:   return { ok: true };
 624: }
 625: 
 626: // ============================================================
 627: // addUrlAttachmentAction
 628: // ============================================================
 629: 
 630: export type AddUrlResult =
 631:   | { ok: true; attachmentId: string }
 632:   | { ok: false; error: string };
 633: 
 634: export async function addUrlAttachmentAction(
 635:   boardId: string,
 636:   url: string,
 637:   note: string | null
 638: ): Promise<AddUrlResult> {
 639:   if (!boardId) return { ok: false, error: "invalid_board_id" };
 640: 
 641:   // Server-side URL validation (L-042 ??only http/https)
 642:   if (!validateUrlScheme(url)) {
 643:     return { ok: false, error: "invalid_url_scheme" };
 644:   }
 645:   if (url.length > 2000) return { ok: false, error: "url_too_long" };
 646:   if (note && note.length > 500) return { ok: false, error: "note_too_long" };
 647: 
 648:   const supabase = await createSupabaseServer();
 649:   const {
 650:     data: { user },
 651:   } = await supabase.auth.getUser();
 652:   if (!user) return { ok: false, error: "unauthenticated" };
 653: 
 654:   // Detect provider and fetch metadata
 655:   let provider: "youtube" | "vimeo" | "generic" = "generic";
 656:   let title: string | null = null;
 657:   let thumbnail_url: string | null = null;
 658: 
 659:   try {
 660:     const parsedUrl = new URL(url);
 661:     const host = parsedUrl.hostname.replace(/^www\./, "");
 662:     if (host === "youtube.com" || host === "youtu.be") provider = "youtube";
 663:     else if (host === "vimeo.com") provider = "vimeo";
 664:     else title = host;
 665:   } catch {
 666:     // ignore parse error ??URL already validated above
 667:   }
 668: 
 669:   if (provider !== "generic") {
 670:     try {
 671:       const meta = await fetchVideoMetadata(url);
 672:       if (meta) {
 673:         title = meta.title ?? null;
 674:         thumbnail_url = meta.thumbnailUrl ?? null;
 675:       }
 676:     } catch {
 677:       // best-effort ??fall back to no metadata
 678:     }
 679:   }
 680: 
 681:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 682:   const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
 683:     "add_project_board_url",
 684:     {
 685:       p_board_id: boardId,
 686:       p_url: url,
 687:       p_title: title,
 688:       p_thumbnail_url: thumbnail_url,
 689:       p_provider: provider,
 690:       p_note: note,
 691:     }
 692:   );
 693:   if (rpcErr) {
 694:     console.error("[addUrlAttachmentAction] RPC error:", rpcErr);
 695:     return { ok: false, error: rpcErr.message };
 696:   }
 697: 
 698:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 699:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 700:   return { ok: true, attachmentId: attachmentId as string };
 701: }
 702: 
 703: // ============================================================
 704: // updateUrlNoteAction
 705: // ============================================================
 706: 
 707: export type UpdateUrlNoteResult = { ok: true } | { ok: false; error: string };
 708: 
 709: export async function updateUrlNoteAction(
 710:   boardId: string,
 711:   attachmentId: string,
 712:   note: string
 713: ): Promise<UpdateUrlNoteResult> {
 714:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 715:   if (note && note.length > 500) return { ok: false, error: "note_too_long" };
 716: 
 717:   const supabase = await createSupabaseServer();
 718:   const {
 719:     data: { user },
 720:   } = await supabase.auth.getUser();
 721:   if (!user) return { ok: false, error: "unauthenticated" };
 722: 
 723:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 724:   const { error: rpcErr } = await (supabase as any).rpc(
 725:     "update_project_board_url_note",
 726:     {
 727:       p_board_id: boardId,
 728:       p_attachment_id: attachmentId,
 729:       p_note: note,
 730:     }
 731:   );
 732:   if (rpcErr) {
 733:     console.error("[updateUrlNoteAction] RPC error:", rpcErr);
 734:     return { ok: false, error: rpcErr.message };
 735:   }
 736: 
 737:   // Note is in asset_index entries ??must recompute (L-041)
 738:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 739:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 740:   return { ok: true };
 741: }
 742: 
 743: // ============================================================
 744: // removeUrlAttachmentAction
 745: // ============================================================
 746: 
 747: export type RemoveUrlResult = { ok: true } | { ok: false; error: string };
 748: 
 749: export async function removeUrlAttachmentAction(
 750:   boardId: string,
 751:   attachmentId: string
 752: ): Promise<RemoveUrlResult> {
 753:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 754: 
 755:   const supabase = await createSupabaseServer();
 756:   const {
 757:     data: { user },
 758:   } = await supabase.auth.getUser();
 759:   if (!user) return { ok: false, error: "unauthenticated" };
 760: 

 succeeded in 463ms:
   1: "use server";
   2: 
   3: import { z } from "zod";
   4: import { revalidatePath } from "next/cache";
   5: import { createSupabaseServer } from "@/lib/supabase/server";
   6: import { createSupabaseService } from "@/lib/supabase/service";
   7: import type { Json } from "@/lib/supabase/database.types";
   8: import { fetchVideoMetadata, type OEmbedResult } from "@/lib/oembed";
   9: import { extractAssetIndex } from "@/lib/board/asset-index";
  10: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  11: 
  12: // -----------------------------------------------------------------------------
  13: // Phase 2.8.1 G_B1-B ??Wizard draft mode
  14: // -----------------------------------------------------------------------------
  15: // The wizard now creates the projects row early (status='draft') so Step 2
  16: // can mount BriefBoardEditor against a real project_id and the user can
  17: // drop images / paste embeds before "submit". Submit flips the status from
  18: // 'draft' to 'submitted' rather than INSERTing a fresh row.
  19: //
  20: // Server actions exposed:
  21: //   - createProject       : pre-2.8.1 single-shot INSERT path (kept for
  22: //                           backwards compatibility; wizard no longer calls
  23: //                           it but tests / direct callers still do)
  24: //   - ensureDraftProject  : find-or-create the user's wizard draft. Returns
  25: //                           project + brief bootstrap for the editor.
  26: //   - submitDraftProject  : UPDATE the existing draft with the latest
  27: //                           wizard fields and (optionally) flip to 'submitted'.
  28: // -----------------------------------------------------------------------------
  29: 
  30: const sharedFields = {
  31:   title: z.string().trim().min(1).max(200),
  32:   description: z.string().max(4000).optional().nullable(),
  33:   brand_id: z.string().uuid().nullable().optional(),
  34:   tone: z.string().max(500).optional().nullable(),
  35:   // Phase 2.7.2: free-text tag list (was a closed enum). Maps to the
  36:   // existing `deliverable_types text[]` Postgres column ??no migration
  37:   // needed; the meaning shifts from "format" to "intended use".
  38:   deliverable_types: z
  39:     .array(z.string().trim().min(1).max(60))
  40:     .max(10)
  41:     .default([]),
  42:   estimated_budget_range: z.string().max(100).optional().nullable(),
  43:   target_delivery_at: z
  44:     .string()
  45:     .regex(/^\d{4}-\d{2}-\d{2}$/)
  46:     .nullable()
  47:     .optional(),
  48:   intent: z.enum(["draft", "submit"]).default("draft"),
  49: };
  50: 
  51: // Phase 2.8.1 G_B1-E: proposalSchema + discriminatedUnion deleted ??// proposal_request intake mode is no longer authored. The legacy
  52: // `projects.intake_mode` column stays; existing rows still render via
  53: // the read-only banner on /app/projects/[id].
  54: const createProjectSchema = z.object({
  55:   ...sharedFields,
  56:   intake_mode: z.literal("brief"),
  57: });
  58: 
  59: type ActionResult =
  60:   | { ok: true; id: string; status: string }
  61:   | {
  62:       error: "validation";
  63:       issues: z.ZodFormattedError<z.infer<typeof createProjectSchema>>;
  64:     }
  65:   | { error: "unauthenticated" }
  66:   | { error: "no_workspace" }
  67:   | { error: "db"; message: string };
  68: 
  69: export async function createProject(input: unknown): Promise<ActionResult> {
  70:   const parsed = createProjectSchema.safeParse(input);
  71:   if (!parsed.success) {
  72:     return { error: "validation", issues: parsed.error.format() };
  73:   }
  74: 
  75:   const supabase = await createSupabaseServer();
  76:   const {
  77:     data: { user },
  78:   } = await supabase.auth.getUser();
  79:   if (!user) return { error: "unauthenticated" };
  80: 
  81:   // Wave C.5d sub_03c ??replace first-membership fallback with the
  82:   // cookie-based active workspace resolver (Codex K-05 final review LOOP 1
  83:   // MED-C). createProject is the legacy direct-INSERT path retained for
  84:   // backwards compatibility; the wizard goes through ensureDraftProject +
  85:   // submitProjectAction. Same misroute risk regardless, same fix.
  86:   const active = await resolveActiveWorkspace(user.id);
  87:   if (!active) return { error: "no_workspace" };
  88:   const membership = { workspace_id: active.id };
  89: 
  90:   const status = parsed.data.intent === "submit" ? "submitted" : "draft";
  91: 
  92:   // Column mapping notes:
  93:   // - spec field `description` ??DB column `brief` (no standalone `description` col)
  94:   // - spec field `tone` ??NO matching column on `projects`; omitted from insert
  95:   // - `estimated_budget_range` matches exactly
  96:   const data = parsed.data;
  97: 
  98:   const insertPayload = {
  99:     workspace_id: membership.workspace_id,
 100:     created_by: user.id,
 101:     project_type: "direct_commission" as const,
 102:     status,
 103:     title: data.title,
 104:     brief: data.description ?? null,
 105:     brand_id: data.brand_id ?? null,
 106:     deliverable_types: data.deliverable_types,
 107:     estimated_budget_range: data.estimated_budget_range ?? null,
 108:     target_delivery_at: data.target_delivery_at ?? null,
 109:     intake_mode: data.intake_mode,
 110:   };
 111: 
 112:   const { data: project, error } = await supabase
 113:     .from("projects")
 114:     .insert(insertPayload)
 115:     .select("id")
 116:     .single();
 117: 
 118:   if (error || !project) {
 119:     console.error("[createProject] Supabase error:", error);
 120:     return { error: "db", message: error?.message ?? "insert failed" };
 121:   }
 122: 
 123:   // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
 124:   // with empty content, so the Brief tab on /app/projects/[id] can mount
 125:   // the editor immediately. RLS allows this INSERT because the caller
 126:   // is the project's workspace member (just created the project above).
 127:   //
 128:   // K05-PHASE-2-8-04 fix: brief INSERT failure is now FATAL. If the
 129:   // sibling row can't be created we roll back the project to avoid
 130:   // leaving an orphan project that the Brief tab cannot edit (saveBrief
 131:   // returns not_found when the row is missing ??there is no lazy-create
 132:   // path). Atomicity-via-RPC lands in Phase 2.8.1 (FU-2.8-saveversion-rollback
 133:   // covers a related two-write atomicity gap).
 134:   const { error: briefErr } = await supabase
 135:     .from("project_briefs")
 136:     .insert({
 137:       project_id: project.id,
 138:       // status / current_version / tiptap_schema_version use column defaults
 139:       // (editing / 0 / 1) ??required by validate_project_brief_change for
 140:       // non-yagi_admin INSERT.
 141:       updated_by: user.id,
 142:     });
 143:   if (briefErr) {
 144:     console.error(
 145:       "[createProject] project_briefs sibling insert failed (rolling back project):",
 146:       briefErr
 147:     );
 148:     // K05-PHASE-2-8-LOOP2-03 fix: rollback DELETE must use the
 149:     // service-role client. The user-scoped supabase client honors
 150:     // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
 151:     // a non-yagi workspace_admin's rollback would be silently denied
 152:     // and leave an orphan project. Service role bypasses RLS so the
 153:     // rollback succeeds for all caller roles. Atomicity-via-RPC is
 154:     // still the cleaner long-term fix (FU-2.8-saveversion-rollback).
 155:     const service = createSupabaseService();
 156:     const { error: rollbackErr } = await service
 157:       .from("projects")
 158:       .delete()
 159:       .eq("id", project.id);
 160:     if (rollbackErr) {
 161:       console.error("[createProject] rollback DELETE failed:", rollbackErr);
 162:     }
 163:     return {
 164:       error: "db",
 165:       message: `brief insert failed: ${briefErr.message}`,
 166:     };
 167:   }
 168: 
 169:   revalidatePath("/[locale]/app/projects", "page");
 170:   return { ok: true, id: project.id, status };
 520: export type WizardAssetPutUrlResult =
 521:   | { ok: true; putUrl: string; publicUrl: string }
 522:   | { ok: false; error: string };
 523: 
 524: export async function getWizardAssetPutUrlAction(
 525:   storageKey: unknown,
 526:   contentType: unknown
 527: ): Promise<WizardAssetPutUrlResult> {
 528:   const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
 529:   if (!parsed.success) {
 530:     return { ok: false, error: "invalid_input" };
 531:   }
 532: 
 533:   // Strict content-type allow-list (HIGH-A F7)
 534:   if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
 535:     return { ok: false, error: "content_type_not_allowed" };
 536:   }
 537: 
 538:   const supabase = await createSupabaseServer();
 539:   const {
 540:     data: { user },
 541:   } = await supabase.auth.getUser();
 542:   if (!user) return { ok: false, error: "unauthenticated" };
 543: 
 544:   // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
 545:   // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
 546:   // project-briefs/) was insufficient because keys within those namespaces
 547:   // could overwrite OTHER users' assets. Now require keys to start with
 548:   // <prefix>/<user.id>/ so a caller can only write under their own subspace.
 549:   const allowedPrefixes = [
 550:     `board-assets/${user.id}/`,
 551:     `wizard-references/${user.id}/`,
 552:     `project-briefs/${user.id}/`,
 553:   ];
 554:   if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
 555:     return { ok: false, error: "storage_key_not_owned" };
 556:   }
 557: 
 558:   try {
 559:     const putUrl = await createBriefAssetPutUrl(
 560:       parsed.data.storageKey,
 561:       parsed.data.contentType,
 562:       600
 563:     );
 564:     // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
 565:     // targets BRIEF_BUCKET (where the PUT lands), not BUCKET (the challenges
 566:     // submissions bucket).
 567:     const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
 568:     return { ok: true, putUrl, publicUrl: pubUrl };
 569:   } catch (err) {
 570:     console.error("[getWizardAssetPutUrlAction] presign failed:", err);
 571:     return { ok: false, error: "presign_failed" };
 572:   }
 573: }
 574: 
 575: // Phase 3.1 ??server-generated key + strict content-type validation.
 576: // Use this for board asset uploads going forward. Legacy
 577: // getWizardAssetPutUrlAction is preserved for back-compat with already-
 578: // shipped client code paths.
 579: const boardAssetPutUrlSchema = z.object({
 580:   contentType: z.string().min(1).max(200),
 581: });
 582: 
 583: export async function getBoardAssetPutUrlAction(
 584:   contentType: unknown
 585: ): Promise<WizardAssetPutUrlResult> {
 586:   const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
 587:   if (!parsed.success) return { ok: false, error: "invalid_input" };
 588: 
 589:   if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
 590:     return { ok: false, error: "content_type_not_allowed" };
 591:   }
 592: 
 593:   const supabase = await createSupabaseServer();
 594:   const {
 595:     data: { user },
 596:   } = await supabase.auth.getUser();
 597:   if (!user) return { ok: false, error: "unauthenticated" };
 598: 
 599:   // Server-generated key: UUID + safe extension. NO client filename trust.
 600:   const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
 601:   const uuid = crypto.randomUUID();
 602:   const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;
 603: 
 604:   try {
 605:     const putUrl = await createBriefAssetPutUrl(
 606:       storageKey,
 607:       parsed.data.contentType,
 608:       600
 609:     );
 610:     // K-05 LOOP 1 HIGH-B F7: BRIEF_BUCKET-targeted public URL.
 611:     const pubUrl = briefObjectPublicUrl(storageKey);
 612:     return { ok: true, putUrl, publicUrl: pubUrl };
 613:   } catch (err) {
 614:     console.error("[getBoardAssetPutUrlAction] presign failed:", err);
 615:     return { ok: false, error: "presign_failed" };
 616:   }
 617: }
 618: 
 619: // =============================================================================
 620: // Phase 3.0 task_03 ??fetchVideoMetadataAction
 621: // =============================================================================
 622: // Server action wrapper around the oEmbed lib. Validates the URL with Zod,
 623: // calls fetchVideoMetadata, and returns the result (or null on any error).
 624: // The "use server" directive at the top of this file covers this action.
 625: // =============================================================================
 626: 
 627: const videoUrlSchema = z.string().url().max(2000);
 628: 
 629: export type VideoMetadataResult = OEmbedResult | null;
 630: 
 631: export async function fetchVideoMetadataAction(
 632:   url: unknown,
 633: ): Promise<VideoMetadataResult> {
 634:   const parsed = videoUrlSchema.safeParse(url);
 635:   if (!parsed.success) return null;
 636:   return fetchVideoMetadata(parsed.data);
 637: }
 638: 
 639: // =============================================================================
 640: // Phase 3.0 task_04 ??submitProjectAction (Phase 3.1 task_04 update)
 641: // =============================================================================
 642: // Atomically submits the wizard's draft as a new project with status='in_review'
 643: // (the L-015 auto-transition shortcut ??never writes 'submitted' to projects).
 644: //
 645: // Sequence (Phase 3.1):
 646: //   1. INSERT projects with status='in_review' (user-scoped client; RLS
 647: //      INSERT policy allows it since we own the workspace)
 648: //   2. INSERT project_status_history with actor_role='system' ??MUST bypass
 649: //      RLS which denies INSERT on this table for all authenticated callers.
 650: //      Resolution: Option A ??service-role client scoped to this single INSERT.
 651: //      Service-role usage is strictly scoped; other reads/writes stay on user
 652: //      client.
 653: //   3. RPC seed_project_board_from_wizard(project_id, board_document) ??//      Phase 3.1 replaces the project_references INSERT path.
 654: //      The RPC is SECURITY DEFINER + asserts project.status='in_review'.
 655: //   4. DELETE wizard_drafts row (user-scoped client)
 656: //   5. Send Resend admin + client emails (best-effort, not blocking)
 657: //   6. Emit in-app notification to the submitting user (best-effort, not
 658: //      blocking)
 659: //
 660: // Returns { ok: true, projectId, redirect } on success.
 661: // =============================================================================
 662: 
 663: import { sendProjectSubmittedAdmin, sendProjectSubmittedClient } from "@/lib/email/project";
 664: import { emitNotification } from "@/lib/notifications/emit";
 665: 
 666: // =============================================================================
 667: // Phase 3.1 ??server-side tldraw store validator (anti-DoS + structural sanity)
 668: // =============================================================================
 669: // K-05 trust boundary: the wizard's boardDocument is client-controlled JSON.
 670: // Server enforces a max serialized size (5MB) AND a minimum structural shape
 671: // (must be either {} or contain a "store" object). Detailed validation of
 672: // every shape's props is impractical for tldraw store snapshots; we trust the
 673: // schema migration version + tldraw's runtime to reject malformed shapes on
 674: // load. Server prevents oversized/wrong-shape payloads only.
 675: function validateTldrawStore(doc: Record<string, unknown>): boolean {
 676:   if (!doc || typeof doc !== "object") return false;
 677:   if (Object.keys(doc).length === 0) return true; // empty board OK
 678:   if (!("store" in doc)) return false;
 679:   const store = (doc as { store: unknown }).store;
 680:   if (typeof store !== "object" || store === null) return false;
 681:   return true;
 682: }
 683: 
 684: // Phase 3.1 hotfix-3: attachment sub-schemas (L-026 ??must stay in sync with
 685: // client-side wizard state types and task_02 PdfAttachment/UrlAttachment types).
 686: // Wave C.5d sub_03f_5 F1: extend storage_key prefix allowlist to include
 687: // `board-assets/` so wizard PDFs uploaded via getBoardAssetPutUrlAction (which
 688: // generates `board-assets/<user>/<uuid>.pdf` server-side) pass the SubmitInputSchema
 689: // gate. The companion seed RPC (sub_03f_5 F3) enforces caller-bound prefix on
 690: // `board-assets/` keys, so this client-trust schema is intentionally permissive.
 691: const PdfAttachmentSchema = z.object({
 692:   id: z.string().uuid(),
 693:   storage_key: z.string().regex(/^(project-(wizard|board)|board-assets)\//),
 694:   filename: z.string().min(1).max(200),
 695:   size_bytes: z.number().int().positive().max(20 * 1024 * 1024),
 696:   uploaded_at: z.string(),
 697:   uploaded_by: z.string(),
 698: });
 699: 
 700: const UrlAttachmentSchema = z.object({
 701:   id: z.string().uuid(),
 702:   url: z.string()
 703:     .min(1)
 704:     .max(2000)
 705:     .refine(
 706:       (u) => {
 707:         try {
 708:           const p = new URL(u);
 709:           return p.protocol === "http:" || p.protocol === "https:";
 710:         } catch {
 711:           return false;
 712:         }
 713:       },
 714:       { message: "URL must be http:// or https://" }
 715:     ),
 716:   title: z.string().max(200).nullable(),
 717:   thumbnail_url: z.string().max(2000).nullable(),
 718:   provider: z.enum(["youtube", "vimeo", "generic"]),
 719:   note: z.string().max(500).nullable(),
 720:   added_at: z.string(),
 721:   added_by: z.string(),
 722: });
 723: 
 724: const SubmitInputSchema = z.object({
 725:   name: z.string().min(1).max(80),
 726:   // hotfix-2: max reduced to 500 to match client wizardSchema (L-026 ??keep in sync)
 727:   description: z.string().min(1).max(500),
 728:   deliverable_types: z.array(z.string()).min(1),
 729:   budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
 730:   delivery_date: z.string().nullable().optional(),
 731:   // Phase 3.1 hotfix-3 addendum (yagi smoke v1 FAIL-5): optional 誘명똿 ?щ쭩 ?쇱옄.
 732:   // Client emits ISO 8601 with Z (converted from <input type="datetime-local">
 733:   // via new Date(local).toISOString()). Server accepts ISO datetime; null/undefined
 734:   // both treated as "not specified". Past datetimes are NOT rejected server-side
 735:   // (UI blocks via min attr; server keeps client-trust minimal ??client may set
 736:   // any future datetime; explicit decision logged in _run.log).
 737:   meeting_preferred_at: z.string().datetime().nullable().optional(),
 738:   // Phase 3.1: replaces references[] with a tldraw store snapshot.
 739:   // Server-side validation: 5MB serialized cap (anti-DoS) + structural sanity.
 740:   boardDocument: z
 741:     .record(z.string(), z.unknown())
 742:     .refine(
 743:       (doc) => {
 744:         try {
 745:           const serialized = JSON.stringify(doc);
 746:           return serialized.length <= 5 * 1024 * 1024;
 747:         } catch {
 748:           return false;
 749:         }
 750:       },
 751:       { message: "boardDocument exceeds 5MB or is not serializable" }
 752:     )
 753:     .refine(validateTldrawStore, {
 754:       message: "boardDocument is not a valid tldraw store snapshot",
 755:     })
 756:     .default({}),
 757:   // Phase 3.1 hotfix-3: structured attachment columns (Q-AA)
 758:   // Server validates shape/size/scheme (L-026 ??synced with client wizard state)
 759:   attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().default([]),
 760:   attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().default([]),
 761:   // Phase 4.x task_03 ??Digital Twin intent. Defense-in-depth: client-supplied
 762:   // value, validated here and again by the projects.twin_intent CHECK constraint
 763:   // added in task_01 migration. Default 'undecided' matches the column default.
 764:   twin_intent: z
 765:     .enum(["undecided", "specific_in_mind", "no_twin"])
 766:     .optional()
 767:     .default("undecided"),
 768:   // workspaceId is optional when draftProjectId is provided ??the action
 769:   // resolves it from the draft project row in that case. One of the two
 770:   // must be present for workspace resolution to succeed.
 771:   workspaceId: z.string().uuid().optional(),
 772:   // draftProjectId: the wizard's autosave-created draft project. When
 773:   // present, workspace is resolved from it. The draft row is deleted after
 774:   // the real project INSERT succeeds.
 775:   draftProjectId: z.string().uuid().nullable().optional(),
 776: });
 777: 
 778: export type SubmitProjectInput = z.infer<typeof SubmitInputSchema>;
 779: 
 780: export type SubmitProjectResult =
 781:   | { ok: true; projectId: string; redirect: string }
 782:   | { ok: false; error: "unauthenticated" | "validation" | "db"; message?: string };
 783: 
 784: export async function submitProjectAction(
 785:   input: unknown
 786: ): Promise<SubmitProjectResult> {
 787:   // Parse + validate input
 788:   const parsed = SubmitInputSchema.safeParse(input);
 789:   if (!parsed.success) {
 790:     return { ok: false, error: "validation", message: parsed.error.message };
 791:   }
 792:   const data = parsed.data;
 793: 
 794:   // Auth check
 795:   const supabase = await createSupabaseServer();
 796:   const {
 797:     data: { user },
 798:     error: authError,
 799:   } = await supabase.auth.getUser();
 800:   if (authError || !user) return { ok: false, error: "unauthenticated" };
 801: 
 802:   // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
 803:   // MED-C fix): the prior `created_at asc + limit 1` first-membership
 804:   // fallback could misroute a project to the user's oldest workspace
 805:   // instead of the workspace they had selected in the switcher. Replace
 806:   // with three explicit paths, all gated on a single membership lookup so
 807:   // every accepted workspace_id is one the caller actually belongs to:
 808:   //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
 809:   //   B. draft project row's workspace_id  (autosave path)
 810:   //   C. resolveActiveWorkspace cookie-based resolver  (final fallback)
 811:   // RLS already gates projects.INSERT to workspace members; this is
 812:   // defense-in-depth that returns a clean error path and prevents silent
 813:   // misrouting through the old fallback.
 814:   const { data: memRows } = await supabase
 815:     .from("workspace_members")
 816:     .select("workspace_id")
 817:     .eq("user_id", user.id);
 818:   const memberSet = new Set((memRows ?? []).map((r) => r.workspace_id));
 819: 
 820:   let resolvedWorkspaceId: string | null = null;
 821: 
 822:   if (data.workspaceId && memberSet.has(data.workspaceId)) {
 823:     resolvedWorkspaceId = data.workspaceId;
 824:   }
 825: 
 826:   if (!resolvedWorkspaceId && data.draftProjectId) {
 827:     const { data: draftRow } = await supabase
 828:       .from("projects")
 829:       .select("workspace_id")
 830:       .eq("id", data.draftProjectId)
 831:       .maybeSingle();
 832:     if (draftRow?.workspace_id && memberSet.has(draftRow.workspace_id)) {
 833:       resolvedWorkspaceId = draftRow.workspace_id;
 834:     }
 835:   }
 836: 
 837:   if (!resolvedWorkspaceId) {
 838:     const active = await resolveActiveWorkspace(user.id);
 839:     if (active) resolvedWorkspaceId = active.id;
 840:   }
 841: 
 842:   if (!resolvedWorkspaceId) {
 843:     return { ok: false, error: "db", message: "workspace not found for user" };
 844:   }
 845: 
 846:   // Phase 3.0 columns (budget_band, submitted_at, kind) are not in the
 847:   // generated database.types.ts yet ??use any cast for this INSERT only.
 848:   // Same pattern as task_05 used in page.tsx.
 849:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
 850:   const supabaseAny = supabase as any;
 851: 
 852:   // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
 853:   //    is allowed by projects_insert RLS policy for authenticated callers who
 854:   //    are workspace members. Direct UPDATE to status is forbidden by trigger
 855:   //    guard but INSERT with the target status is the allowed L-015 path.)
 856:   const { data: project, error: projErr } = await supabaseAny
 857:     .from("projects")
 858:     .insert({
 859:       // 'name' column does not exist on projects ??map to 'title' (existing column)
 860:       title: data.name,
 861:       // 'description' maps to 'brief' on the projects table
 862:       brief: data.description,
 863:       deliverable_types: data.deliverable_types,
 864:       budget_band: data.budget_band,
 865:       // delivery_date maps to target_delivery_at
 866:       target_delivery_at: data.delivery_date ?? null,
 867:       // Phase 3.1 hotfix-3 addendum: 誘명똿 ?щ쭩 ?쇱옄 (optional)
 868:       meeting_preferred_at: data.meeting_preferred_at ?? null,
 869:       // Phase 4.x task_03: Digital Twin intent (3-radio, default 'undecided').
 870:       // Persistence requires task_01 migration applied (Wave D D.1) ??until
 871:       // then prod DB has no twin_intent column and this field is ignored.
 872:       twin_intent: data.twin_intent,
 873:       workspace_id: resolvedWorkspaceId,
 874:       created_by: user.id,
 875:       status: "in_review",
 876:       submitted_at: new Date().toISOString(),
 877:       kind: "direct",
 878:       // project_type stays as 'direct_commission' for backward compat
 879:       project_type: "direct_commission",
 880:       intake_mode: "brief",
 881:     })
 882:     .select("id")
 883:     .single() as { data: { id: string } | null; error: { message: string } | null };
 884: 
 885:   if (projErr || !project) {
 886:     console.error("[submitProjectAction] projects INSERT error:", projErr);
 887:     return {
 888:       ok: false,
 889:       error: "db",
 890:       message: projErr?.message ?? "project insert failed",
 891:     };
 892:   }
 893: 
 894:   // 2. INSERT project_status_history with actor_role='system'.
 895:   //    Option A: service-role client for this single statement only (bypasses
 896:   //    the psh_insert_deny RLS policy which blocks all authenticated users).
 897:   //    The service-role client is NOT used for any other read/write in this action.
 898:   //    project_status_history is a Phase 3.0 table ??not in generated types yet.
 899:   const service = createSupabaseService();
 900:   // eslint-disable-next-line @typescript-eslint/no-explicit-any
 901:   const serviceAny = service as any;
 902:   const { error: histErr } = await serviceAny
 903:     .from("project_status_history")
 904:     .insert({
 905:       project_id: project.id,
 906:       from_status: "submitted",   // logical from-state (L-015: submitted?뭝n_review)
 907:       to_status: "in_review",
 908:       actor_id: user.id,
 909:       actor_role: "system",
 910:       comment: null,
 911:     }) as { error: { message: string } | null };
 912: 
 913:   if (histErr) {
 914:     console.error("[submitProjectAction] history INSERT error:", histErr);
 915:     // History failure is non-fatal in prod but should alert ??do not roll back
 916:     // the project, log and continue. K-05 review can decide if we want to roll
 917:     // back on history failure.
 918:     console.error("[submitProjectAction] WARN: history row missing for project", project.id);
 919:   }
 920: 
 921:   // 3. Phase 3.1 ??Seed the project_boards row via RPC.
 922:   //    Replaces the old project_references[] INSERT path. The RPC is
 923:   //    SECURITY DEFINER + asserts caller owns the project (K-05 LOOP 1 F1 fix)
 924:   //    AND project.status='in_review'. ON CONFLICT (project_id) DO UPDATE so
 925:   //    re-submits are idempotent.
 926:   //    K-05 HIGH-B F5 fix: server-recompute asset_index from the board document
 927:   //    so admin queue/detail counts are accurate immediately after submit
 928:   //    (K-05 trust boundary ??never trust client-supplied asset_index).
 929:   const seedDocument = data.boardDocument ?? {};
 930:   const seedAttachedPdfs = data.attachedPdfs ?? [];
 931:   const seedAttachedUrls = data.attachedUrls ?? [];
 932:   // Phase 3.1 hotfix-3: compute unified asset_index from all three sources
 933:   // (canvas shapes + attached PDFs + attached URLs). Trust boundary: server
 934:   // always recomputes ??never accepts client-supplied asset_index (L-041).
 935:   const seedAssetIndex = extractAssetIndex(
 936:     seedDocument as Record<string, unknown>,
 937:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
 938:     seedAttachedPdfs as any,
 939:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
 940:     seedAttachedUrls as any,
 941:   );
 942:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 943:   const { error: seedErr } = await (supabase as any).rpc(
 944:     "seed_project_board_from_wizard",
 945:     {
 946:       p_project_id: project.id,
 947:       p_initial_document: seedDocument,
 948:       p_initial_attached_pdfs: seedAttachedPdfs,
 949:       p_initial_attached_urls: seedAttachedUrls,
 950:       p_initial_asset_index: seedAssetIndex,
 951:     }
 952:   );
 953:   if (seedErr) {
 954:     console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
 955:     // Non-fatal ??the project exists; admin can manually init via init_project_board.
 956:     // K-05 reviewer can decide if hard rollback is needed; default = continue.
 957:   }
 958: 
 959:   // 4. Delete wizard_drafts row. wizard_drafts may not be a real table ??silently
 960:   //    ignore errors (it's only a cleanup step). If the table doesn't exist the
 961:   //    error is swallowed. Use any cast since it may not be in generated types.
 962:   try {
 963:     // eslint-disable-next-line @typescript-eslint/no-explicit-any
 964:     await (supabase as any).from("wizard_drafts").delete().eq("user_id", user.id);
 965:   } catch {
 966:     // best-effort ??ignore
 967:   }
 968:   // Also clean up any lingering draft project rows in status='draft' for this
 969:   // user in this workspace, since the real project is now submitted.
 970:   await supabase
 971:     .from("projects")
 972:     .delete()
 973:     .eq("workspace_id", resolvedWorkspaceId)
 974:     .eq("created_by", user.id)
 975:     .eq("status", "draft")
 976:     .eq("intake_mode", "brief")
 977:     .neq("id", project.id);
 978: 
 979:   // 5. Resend emails (best-effort ??must not block or throw)
 980:   const baseUrl =

codex
The main closures mostly match the claimed edits. One thing I’m checking more carefully now is whether the privilege assertion is only proving the originally vulnerable columns, or whether it also catches accidental direct grants on other immutable board columns.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "GRANT UPDATE|REVOKE UPDATE|project_boards|schema_version|source|locked_by|locked_at|is_locked" supabase/migrations -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "CREATE TYPE|workspace_members_role_check|role = ANY|workspace_members.*role" supabase/migrations src/lib/supabase/database.types.ts -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260422120000_phase_2_0_baseline.sql' | ForEach-Object { "'$i++; if (($i -ge 1250 -and $i -le 1335) -or ($i -ge 1810 -and $i -le 1830) -or ($i -ge 4100 -and $i -le 4165) -or ($i -ge 4460 -and $i -le 4530)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "seed_project_board_from_wizard|add_project_board_pdf|add_project_board_url|remove_project_board_attachment|update_project_board_url_note|attached_pdfs|attached_urls|asset_index" src supabase/migrations -S' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 351ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2:-- Phase 2.0 baseline — imperfect source-of-truth acknowledged
supabase/migrations\20260422120000_phase_2_0_baseline.sql:24:-- Forensic + future fresh-clone reproducer; live DB is canonical source of truth.
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1253:    source_type text,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1254:    source_id uuid,
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1256:    CONSTRAINT invoice_line_items_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'meeting'::text, 'storyboard'::text, 'deliverable'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1567:    CONSTRAINT ref_has_source CHECK (((storage_path IS NOT NULL) OR (external_url IS NOT NULL)))
supabase/migrations\20260424000001_phase_2_5_g2_handle_history_hardening.sql:131:  -- so change_handle has no source to rename from (should use claim flow).
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:279:  -- the trigger is the source of truth on legal transitions).
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:51:  tiptap_schema_version int NOT NULL DEFAULT 1
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:52:                  CHECK (tiptap_schema_version >= 1),
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:219:-- the UPDATE no-ops without raising. The trigger (§6) is the source of
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:367:--     3. tiptap_schema_version must be 1 (current schema)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:370:--     2. tiptap_schema_version frozen
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:416:    IF NEW.tiptap_schema_version <> 1 THEN
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:418:        'non-admin must create project_brief with tiptap_schema_version=1 (got %)',
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:419:        NEW.tiptap_schema_version
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:432:  IF NEW.tiptap_schema_version IS DISTINCT FROM OLD.tiptap_schema_version THEN
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:434:      'only yagi_admin may change tiptap_schema_version'
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:23:-- and re-validates: non-admin must not change status / tiptap_schema_version,
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:21:-- SPEC §8.5 (G_B1-H) source.
supabase/migrations\20260429113853_phase_3_1_project_board.sql:1:-- Phase 3.1: project_boards + project_board_versions + 3 RPCs + RLS
supabase/migrations\20260429113853_phase_3_1_project_board.sql:6:-- Table: project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
supabase/migrations\20260429113853_phase_3_1_project_board.sql:12:  schema_version  int  NOT NULL DEFAULT 1,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:14:  source          text NOT NULL CHECK (source IN ('wizard_seed', 'admin_init', 'migrated')),
supabase/migrations\20260429113853_phase_3_1_project_board.sql:15:  is_locked       boolean NOT NULL DEFAULT false,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:16:  locked_by       uuid REFERENCES profiles(id),
supabase/migrations\20260429113853_phase_3_1_project_board.sql:17:  locked_at       timestamptz,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:27:  board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:40:-- RLS: project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260429113853_phase_3_1_project_board.sql:44:CREATE POLICY project_boards_select_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:56:CREATE POLICY project_boards_insert_via_rpc ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:60:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:65:      is_locked = false
supabase/migrations\20260429113853_phase_3_1_project_board.sql:77:      is_locked = false
supabase/migrations\20260429113853_phase_3_1_project_board.sql:97:      SELECT pb.id FROM project_boards pb
supabase/migrations\20260429113853_phase_3_1_project_board.sql:140:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:144:        source     = 'wizard_seed',
supabase/migrations\20260429113853_phase_3_1_project_board.sql:170:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:197:  UPDATE project_boards
supabase/migrations\20260429113853_phase_3_1_project_board.sql:199:    is_locked  = p_locked,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:200:    locked_by  = CASE WHEN p_locked THEN auth.uid() ELSE NULL END,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:201:    locked_at  = CASE WHEN p_locked THEN now() ELSE NULL END,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:214:INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:217:WHERE id NOT IN (SELECT project_id FROM project_boards)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, document, asset_index, source)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:55:        source       = 'wizard_seed',
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:6:-- Schema changes: add attachment columns to project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:8:ALTER TABLE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:14:-- Appends a PDF attachment entry to project_boards.attached_pdfs.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:33:  v_is_locked  boolean;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:39:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:40:  INTO v_project_id, v_is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:41:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:58:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:64:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:88:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:109:-- Appends a URL attachment entry to project_boards.attached_urls.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:130:  v_is_locked  boolean;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:135:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:136:  INTO v_project_id, v_is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:137:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:152:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:157:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:180:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:220:  v_is_locked  boolean;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:223:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:224:  INTO v_project_id, v_is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:225:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:240:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:249:    UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:262:    UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:297:  v_is_locked  boolean;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:300:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:301:  INTO v_project_id, v_is_locked
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:302:  FROM project_boards pb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:317:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:325:  UPDATE project_boards
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:379:  INSERT INTO project_boards (
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:385:    source
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:400:        source        = 'wizard_seed',
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:4:-- HIGH-A #2: Restrict project_boards_update_client policy to exclude
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:23:  v_is_locked  boolean;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:32:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:33:  INTO v_project_id, v_is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:34:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:49:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:54:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:72:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:106:  v_is_locked  boolean;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:115:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:116:  INTO v_project_id, v_is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:117:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:132:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:137:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:154:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:186:  v_is_locked  boolean;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:193:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:194:  INTO v_project_id, v_is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:195:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:210:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:215:    UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:223:    UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:253:  v_is_locked  boolean;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:260:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:261:  INTO v_project_id, v_is_locked
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:262:  FROM project_boards pb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:277:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:285:  UPDATE project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342:  INSERT INTO project_boards (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:343:    project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:354:        source        = 'wizard_seed',
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:363:-- FIX HIGH-A #2: Restrict project_boards_update_client policy +
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:366:DROP POLICY IF EXISTS project_boards_update_client ON project_boards;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:368:CREATE POLICY project_boards_update_client ON project_boards
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:373:      is_locked = false
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:387:      is_locked = false
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:19:  v_is_locked  boolean;
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:28:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:29:  INTO v_project_id, v_is_locked
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:30:  FROM project_boards pb
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:45:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:50:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:67:  UPDATE project_boards
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:6:-- columns on project_boards (attached_pdfs, attached_urls, asset_index)
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:116:  FROM project_boards WHERE project_id = p_project_id;
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:155:        'source',       'attached_pdf',
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:175:        'source',       'attached_url',
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:193:  INSERT INTO project_boards (
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:194:    id, project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:210:        source        = 'wizard_seed',
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:1:-- Wave C.5d sub_03f_2 — close the project_boards UPDATE bypass.
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:23:-- client can UPDATE on project_boards are `document` (the user's own
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:33:-- The companion source-code refactor in
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:53:  IF has_table_privilege('authenticated', 'public.project_boards', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:54:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:59:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'document', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:60:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.document';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:62:  IF NOT has_column_privilege('authenticated', 'public.project_boards', 'updated_at', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:63:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated lost effective UPDATE on project_boards.updated_at';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:67:  -- column. asset_index, attached_pdfs, attached_urls, is_locked,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:68:  -- locked_by, locked_at, schema_version, source, project_id, id flow
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:71:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:74:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:77:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:79:  IF has_column_privilege('authenticated', 'public.project_boards', 'is_locked', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:80:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.is_locked';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:82:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_by', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:83:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_by';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:85:  IF has_column_privilege('authenticated', 'public.project_boards', 'locked_at', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:86:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.locked_at';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:43:  v_is_locked  boolean;
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:52:  SELECT pb.project_id, pb.is_locked
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:53:  INTO v_project_id, v_is_locked
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:54:  FROM project_boards pb
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:69:  IF v_is_locked AND NOT v_is_admin THEN
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:74:  FROM project_boards WHERE id = p_board_id;
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:103:  UPDATE project_boards

 succeeded in 376ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:81:CREATE TYPE storage.buckettype AS ENUM (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:115:  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1789:    CONSTRAINT user_roles_role_check CHECK ((role = ANY (ARRAY['creator'::text, 'workspace_admin'::text, 'workspace_member'::text, 'yagi_admin'::text]))),
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1808:    CONSTRAINT workspace_invitations_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:6:-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:15:-- In prod today (2026-04-28) workspace_members only has role='admin' rows
supabase/migrations\20260501100806_phase_4_x_widen_profile_role_enum.sql:27:    (role = ANY (ARRAY['creator', 'studio', 'observer', 'client', 'artist']))

 succeeded in 424ms:
supabase/migrations\20260429113853_phase_3_1_project_board.sql:13:  asset_index     jsonb NOT NULL DEFAULT '[]'::jsonb,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:112:-- RPC: seed_project_board_from_wizard
supabase/migrations\20260429113853_phase_3_1_project_board.sql:114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:3:-- HIGH-A F1: seed_project_board_from_wizard cross-tenant write prevention
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:6:-- HIGH-B F5: support pre-computed asset_index seed (server-computed at submit)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:9:-- Drop and recreate seed_project_board_from_wizard with auth gate + asset_index param
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:13:  p_initial_asset_index jsonb DEFAULT '[]'::jsonb
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:42:    RAISE EXCEPTION 'seed_project_board_from_wizard: caller % does not own project %', v_caller, p_project_id;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, document, asset_index, source)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:51:  VALUES (p_project_id, p_initial_document, COALESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:54:        asset_index  = EXCLUDED.asset_index,
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:63:REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:11:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);
src\components\admin\asset-list-panel.tsx:6: * project_boards.asset_index (server-side computed via extractAssetIndex).
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:1:-- Phase 3.1 hotfix-3: attached_pdfs + attached_urls columns + 4 attachment RPCs + extend seed RPC
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:9:  ADD COLUMN IF NOT EXISTS attached_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:10:  ADD COLUMN IF NOT EXISTS attached_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:13:-- RPC: add_project_board_pdf
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:14:-- Appends a PDF attachment entry to project_boards.attached_pdfs.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:18:-- Does NOT update asset_index (that is server action layer responsibility).
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:20:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:45:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:54:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:59:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:63:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:71:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:90:    attached_pdfs = attached_pdfs || jsonb_build_array(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:108:-- RPC: add_project_board_url
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:109:-- Appends a URL attachment entry to project_boards.attached_urls.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:115:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:141:    RAISE EXCEPTION 'add_project_board_url: board not found';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:149:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:153:    RAISE EXCEPTION 'add_project_board_url: board is locked';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:156:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:159:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:167:    RAISE EXCEPTION 'add_project_board_url: invalid URL (must be http:// or https://, max 2000 chars)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:172:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:177:    RAISE EXCEPTION 'add_project_board_url: provider must be youtube, vimeo, or generic';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:182:    attached_urls = attached_urls || jsonb_build_array(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:202:-- RPC: remove_project_board_attachment
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:203:-- Removes an attachment by id from attached_pdfs or attached_urls.
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:208:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:229:    RAISE EXCEPTION 'remove_project_board_attachment: board not found';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:237:    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:241:    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:245:    RAISE EXCEPTION 'remove_project_board_attachment: kind must be pdf or url';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:251:      attached_pdfs = COALESCE(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:254:          FROM jsonb_array_elements(attached_pdfs) elem
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:264:      attached_urls = COALESCE(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:267:          FROM jsonb_array_elements(attached_urls) elem
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:281:-- RPC: update_project_board_url_note
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:285:CREATE OR REPLACE FUNCTION update_project_board_url_note(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:306:    RAISE EXCEPTION 'update_project_board_url_note: board not found';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:314:    RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:318:    RAISE EXCEPTION 'update_project_board_url_note: board is locked';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:322:    RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:327:    attached_urls = (
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:335:      FROM jsonb_array_elements(attached_urls) elem
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:345:-- RPC: seed_project_board_from_wizard (EXTEND signature)
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:346:-- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:353:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:354:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:355:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:382:    attached_pdfs,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:383:    attached_urls,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:384:    asset_index,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:390:    p_initial_attached_pdfs,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:391:    p_initial_attached_urls,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:392:    p_initial_asset_index,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:397:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:398:        attached_urls = EXCLUDED.attached_urls,
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:399:        asset_index   = EXCLUDED.asset_index,
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:1:-- Phase 3.1 hotfix-3 K-05 Loop 1 fix — add_project_board_url jsonb correction
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:4:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:25:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:34:    RAISE EXCEPTION 'add_project_board_url: board not found';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:42:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:46:    RAISE EXCEPTION 'add_project_board_url: board is locked';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:49:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:52:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:56:    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:60:    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:64:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:68:  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:3:--            AND add auth gate to seed_project_board_from_wizard 5-arg overload
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:5:--            attached_pdfs, attached_urls, asset_index (attachment writes via RPC only)
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:8:-- FIX HIGH-A #1a: add_project_board_pdf — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:29:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:38:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:46:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:50:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:53:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:56:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:60:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:64:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:69:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (must start with project-wizard/ or project-board/)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:73:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:88:-- FIX HIGH-A #1b: add_project_board_url — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:91:CREATE OR REPLACE FUNCTION add_project_board_url(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:112:    RAISE EXCEPTION 'add_project_board_url: unauthenticated';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:121:    RAISE EXCEPTION 'add_project_board_url: board not found';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:129:    RAISE EXCEPTION 'add_project_board_url: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:133:    RAISE EXCEPTION 'add_project_board_url: board is locked';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:136:  SELECT jsonb_array_length(attached_urls) INTO v_url_count
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:139:    RAISE EXCEPTION 'add_project_board_url: URL count limit reached (max 50)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:143:    RAISE EXCEPTION 'add_project_board_url: url must be 1-2000 chars';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:147:    RAISE EXCEPTION 'add_project_board_url: only http/https URLs allowed';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:151:    RAISE EXCEPTION 'add_project_board_url: note too long (max 500 chars)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:155:  SET attached_urls = attached_urls || jsonb_build_array(jsonb_build_object(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:172:-- FIX HIGH-A #1c: remove_project_board_attachment — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:174:CREATE OR REPLACE FUNCTION remove_project_board_attachment(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:190:    RAISE EXCEPTION 'remove_project_board_attachment: unauthenticated';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:199:    RAISE EXCEPTION 'remove_project_board_attachment: board not found';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:207:    RAISE EXCEPTION 'remove_project_board_attachment: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:211:    RAISE EXCEPTION 'remove_project_board_attachment: board is locked';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:216:    SET attached_pdfs = (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:218:      FROM jsonb_array_elements(attached_pdfs) elem
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:224:    SET attached_urls = (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:226:      FROM jsonb_array_elements(attached_urls) elem
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:231:    RAISE EXCEPTION 'remove_project_board_attachment: invalid kind (must be pdf or url)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:239:-- FIX HIGH-A #1d: update_project_board_url_note — owner_id -> created_by
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:241:CREATE OR REPLACE FUNCTION update_project_board_url_note(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:257:    RAISE EXCEPTION 'update_project_board_url_note: unauthenticated';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:266:    RAISE EXCEPTION 'update_project_board_url_note: board not found';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:274:    RAISE EXCEPTION 'update_project_board_url_note: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:278:    RAISE EXCEPTION 'update_project_board_url_note: board is locked';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:282:    RAISE EXCEPTION 'update_project_board_url_note: note too long (max 500 chars)';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:286:  SET attached_urls = (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:294:    FROM jsonb_array_elements(attached_urls) elem
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:303:-- FIX HIGH-A #1e: seed_project_board_from_wizard (5-arg) — add auth gate
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:308:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:309:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:310:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:326:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:343:    project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:346:    p_project_id, p_initial_document, p_initial_attached_pdfs,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:347:    p_initial_attached_urls, p_initial_asset_index, 'wizard_seed'
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:351:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:352:        attached_urls = EXCLUDED.attached_urls,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:353:        asset_index   = EXCLUDED.asset_index,
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:2:-- add_project_board_pdf with caller-bound prefix checks.
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:7:-- add_project_board_pdf RPC validation only accepted `project-wizard/%`
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:28:-- persisted in attached_pdfs, so no backfill is required.
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:30:CREATE OR REPLACE FUNCTION add_project_board_pdf(
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:49:    RAISE EXCEPTION 'add_project_board_pdf: unauthenticated';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:58:    RAISE EXCEPTION 'add_project_board_pdf: board not found';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:66:    RAISE EXCEPTION 'add_project_board_pdf: unauthorized';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:70:    RAISE EXCEPTION 'add_project_board_pdf: board is locked';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:73:  SELECT jsonb_array_length(attached_pdfs) INTO v_pdf_count
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:76:    RAISE EXCEPTION 'add_project_board_pdf: PDF count limit reached (max 30)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:80:    RAISE EXCEPTION 'add_project_board_pdf: file too large (max 20MB)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:84:    RAISE EXCEPTION 'add_project_board_pdf: filename must be 1-200 chars';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:88:    RAISE EXCEPTION 'add_project_board_pdf: invalid storage_key (null/traversal/leading slash)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:100:    RAISE EXCEPTION 'add_project_board_pdf: storage_key prefix must be caller-bound (board-assets/<caller>/, project-wizard/<caller>/, or project-board/<p_board_id>/)';
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:104:  SET attached_pdfs = attached_pdfs || jsonb_build_array(jsonb_build_object(
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:1:-- Wave C.5d sub_03f_5 F3 — seed_project_board_from_wizard hardening.
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:6:-- columns on project_boards (attached_pdfs, attached_urls, asset_index)
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:10:-- submitProjectAction's server-side asset_index recomputation and
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:15:--   1. Validates every storage_key in `p_initial_attached_pdfs` is
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:17:--      `add_project_board_pdf` (sub_03f_5 F2):
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:23:--   2. Validates every URL in `p_initial_attached_urls` is http or
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:24:--      https only. (Defense in depth — add_project_board_url already
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:27:--   3. Server-recomputes `asset_index` from the validated
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:28:--      attached_pdfs + attached_urls arrays. The `p_initial_asset_index`
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:33:--      asset_index including canvas entries via the user-action's
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:41:-- function for every entry in p_initial_attached_pdfs. Mirrored on
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:42:-- add_project_board_pdf inside migration 20260504004349 so the two
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:67:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:70:  p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:71:  p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:72:  p_initial_asset_index   jsonb DEFAULT '[]'::jsonb  -- ignored; kept for backwards compat
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:89:  v_asset_index       jsonb;
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:96:    RAISE EXCEPTION 'seed_project_board_from_wizard: unauthorized';
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:119:  -- ---------- Validate attached_pdfs ----------
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:120:  IF p_initial_attached_pdfs IS NOT NULL AND jsonb_typeof(p_initial_attached_pdfs) = 'array' THEN
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:121:    FOR v_pdf IN SELECT * FROM jsonb_array_elements(p_initial_attached_pdfs)
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:131:  -- ---------- Validate attached_urls (http/https only) ----------
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:132:  IF p_initial_attached_urls IS NOT NULL AND jsonb_typeof(p_initial_attached_urls) = 'array' THEN
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:133:    FOR v_url IN SELECT * FROM jsonb_array_elements(p_initial_attached_urls)
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:140:        RAISE EXCEPTION 'seed_project_board_from_wizard: attached_url scheme must be http or https (got %)',
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:146:  -- ---------- Server-recompute asset_index from arrays ----------
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:148:  -- the first saveBoardDocumentAction call rebuilds asset_index from
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:150:  -- p_initial_asset_index is intentionally ignored.
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:151:  IF p_initial_attached_pdfs IS NOT NULL AND jsonb_typeof(p_initial_attached_pdfs) = 'array' THEN
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:168:    FROM jsonb_array_elements(p_initial_attached_pdfs) AS pdf;
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:171:  IF p_initial_attached_urls IS NOT NULL AND jsonb_typeof(p_initial_attached_urls) = 'array' THEN
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:187:    FROM jsonb_array_elements(p_initial_attached_urls) AS u;
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:190:  v_asset_index := v_pdf_entries || v_url_entries;
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:194:    id, project_id, document, attached_pdfs, attached_urls, asset_index, source
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:200:    COALESCE(p_initial_attached_pdfs, '[]'::jsonb),
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:201:    COALESCE(p_initial_attached_urls, '[]'::jsonb),
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:202:    v_asset_index,
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:207:        attached_pdfs = EXCLUDED.attached_pdfs,
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:208:        attached_urls = EXCLUDED.attached_urls,
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:209:        asset_index   = EXCLUDED.asset_index,
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:218:COMMENT ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb, jsonb, jsonb) IS
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:221:  'asset_index from arrays (canvas entries added on first save). '
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:222:  'p_initial_asset_index parameter retained for caller compat but ignored.';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:9:-- table, so PostgREST clients have been able to UPDATE attached_pdfs /
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:10:-- attached_urls / asset_index directly, bypassing
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:11:-- add_project_board_pdf / add_project_board_url RPC validation
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:12:-- (count cap, URL scheme allowlist, lock state) and the asset_index
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:26:--   - add_project_board_pdf       (SECURITY DEFINER RPC)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:27:--   - add_project_board_url       (SECURITY DEFINER RPC)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:29:--   - service-role client inside board-actions.ts (asset_index updates
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:67:  -- column. asset_index, attached_pdfs, attached_urls, is_locked,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:70:  IF has_column_privilege('authenticated', 'public.project_boards', 'asset_index', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:71:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.asset_index';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:73:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_pdfs', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:74:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_pdfs';
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:76:  IF has_column_privilege('authenticated', 'public.project_boards', 'attached_urls', 'UPDATE') THEN
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:77:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards.attached_urls';
src\components\project-detail\board-tab.tsx:36:  attached_pdfs: PdfAttachment[] | null;
src\components\project-detail\board-tab.tsx:37:  attached_urls: UrlAttachment[] | null;
src\components\project-detail\board-tab.tsx:53:    .select("id, document, source, is_locked, attached_pdfs, attached_urls")
src\components\project-detail\board-tab.tsx:100:        initialPdfs={boardRow.attached_pdfs ?? []}
src\components\project-detail\board-tab.tsx:101:        initialUrls={boardRow.attached_urls ?? []}
src\components\project-board\brief-board-attachments-client.tsx:20: *         supplies asset_index.
src\lib\supabase\database.types.ts:1254:          asset_index: Json
src\lib\supabase\database.types.ts:1255:          attached_pdfs: Json
src\lib\supabase\database.types.ts:1256:          attached_urls: Json
src\lib\supabase\database.types.ts:1269:          asset_index?: Json
src\lib\supabase\database.types.ts:1270:          attached_pdfs?: Json
src\lib\supabase\database.types.ts:1271:          attached_urls?: Json
src\lib\supabase\database.types.ts:1284:          asset_index?: Json
src\lib\supabase\database.types.ts:1285:          attached_pdfs?: Json
src\lib\supabase\database.types.ts:1286:          attached_urls?: Json
src\lib\supabase\database.types.ts:2608:      add_project_board_pdf: {
src\lib\supabase\database.types.ts:2617:      add_project_board_url: {
src\lib\supabase\database.types.ts:2668:      remove_project_board_attachment: {
src\lib\supabase\database.types.ts:2683:      seed_project_board_from_wizard:
src\lib\supabase\database.types.ts:2686:              p_initial_asset_index?: Json
src\lib\supabase\database.types.ts:2694:              p_initial_asset_index?: Json
src\lib\supabase\database.types.ts:2695:              p_initial_attached_pdfs?: Json
src\lib\supabase\database.types.ts:2696:              p_initial_attached_urls?: Json
src\lib\supabase\database.types.ts:2710:      update_project_board_url_note: {
src\lib\board\asset-index.ts:5: *   2. attached_pdfs jsonb column entries
src\lib\board\asset-index.ts:6: *   3. attached_urls jsonb column entries
src\lib\board\asset-index.ts:8: * Trust boundary: server actions ALWAYS recompute asset_index server-side.
src\lib\board\asset-index.ts:9: * Client NEVER supplies asset_index (K-05 + L-041).
src\lib\board\asset-index.ts:60:  // Set when same URL appears in both canvas url-card shapes AND attached_urls
src\lib\board\asset-index.ts:66:// Merges canvas shapes + attached_pdfs + attached_urls into a unified
src\lib\board\asset-index.ts:73:// attached_urls, keep both entries — mark the canvas entry with duplicate:true
src\lib\board\asset-index.ts:82:  attached_pdfs: PdfAttachment[] = [],
src\lib\board\asset-index.ts:83:  attached_urls: UrlAttachment[] = []
src\lib\board\asset-index.ts:88:  // --- Build set of URLs in attached_urls for dedup check ---
src\lib\board\asset-index.ts:90:    attached_urls.map((u) => u.url.toLowerCase().trim())
src\lib\board\asset-index.ts:182:  // --- Map attached_pdfs ---
src\lib\board\asset-index.ts:183:  for (const pdf of attached_pdfs) {
src\lib\board\asset-index.ts:198:  // --- Map attached_urls ---
src\lib\board\asset-index.ts:199:  for (const urlEntry of attached_urls) {
src\lib\board\asset-index.test.ts:171:  it("keeps both entries when same URL in canvas + attached_urls, canvas entry gets duplicate:true", () => {
src\app\[locale]\app\projects\new\new-project-wizard.tsx:438:    // satisfy the add_project_board_pdf RPC validation, which left a key
src\app\[locale]\app\projects\new\actions.ts:654://   3. RPC seed_project_board_from_wizard(project_id, board_document) —
src\app\[locale]\app\projects\new\actions.ts:928:  //    K-05 HIGH-B F5 fix: server-recompute asset_index from the board document
src\app\[locale]\app\projects\new\actions.ts:930:  //    (K-05 trust boundary — never trust client-supplied asset_index).
src\app\[locale]\app\projects\new\actions.ts:934:  // Phase 3.1 hotfix-3: compute unified asset_index from all three sources
src\app\[locale]\app\projects\new\actions.ts:936:  // always recomputes — never accepts client-supplied asset_index (L-041).
src\app\[locale]\app\projects\new\actions.ts:946:    "seed_project_board_from_wizard",
src\app\[locale]\app\projects\new\actions.ts:950:      p_initial_attached_pdfs: seedAttachedPdfs,
src\app\[locale]\app\projects\new\actions.ts:951:      p_initial_attached_urls: seedAttachedUrls,
src\app\[locale]\app\projects\new\actions.ts:952:      p_initial_asset_index: seedAssetIndex,
src\app\[locale]\app\projects\new\actions.ts:956:    console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
src\app\[locale]\app\projects\[id]\board-actions.ts:9: *       Validates auth + lock state; recomputes asset_index server-side
src\app\[locale]\app\projects\[id]\board-actions.ts:10: *       (K-05 trust boundary — never trust client-supplied asset_index);
src\app\[locale]\app\projects\[id]\board-actions.ts:12: *       updates project_boards.{document, asset_index, updated_at}.
src\app\[locale]\app\projects\[id]\board-actions.ts:19: *       project_boards.document and recomputes asset_index.
src\app\[locale]\app\projects\[id]\board-actions.ts:147:  // K-05 trust boundary: server-recompute asset_index. Never trust client.
src\app\[locale]\app\projects\[id]\board-actions.ts:148:  // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
src\app\[locale]\app\projects\[id]\board-actions.ts:152:    .select("attached_pdfs, attached_urls")
src\app\[locale]\app\projects\[id]\board-actions.ts:158:    ((currentBoard as any)?.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:160:    ((currentBoard as any)?.attached_urls ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:170:  // (document, updated_at), so PostgREST cannot UPDATE asset_index
src\app\[locale]\app\projects\[id]\board-actions.ts:171:  // anymore. Use the service-role client here to write asset_index in
src\app\[locale]\app\projects\[id]\board-actions.ts:182:      asset_index: assetIndex,
src\app\[locale]\app\projects\[id]\board-actions.ts:403:  // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
src\app\[locale]\app\projects\[id]\board-actions.ts:406:    .select("attached_pdfs, attached_urls")
src\app\[locale]\app\projects\[id]\board-actions.ts:412:    ((boardForRestore as any)?.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:414:    ((boardForRestore as any)?.attached_urls ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:425:  // asset_index via service role. Admin-only action (yagi_admin gate
src\app\[locale]\app\projects\[id]\board-actions.ts:435:      asset_index: assetIndex,
src\app\[locale]\app\projects\[id]\board-actions.ts:458:// All actions: validate input, call RPC, recompute asset_index server-side,
src\app\[locale]\app\projects\[id]\board-actions.ts:459:// revalidate page. Trust boundary: client never supplies asset_index (L-041).
src\app\[locale]\app\projects\[id]\board-actions.ts:461:// Helper: recompute asset_index from current board state and UPDATE.
src\app\[locale]\app\projects\[id]\board-actions.ts:462:// Wave C.5d sub_03f_2: asset_index is now revoked from authenticated at
src\app\[locale]\app\projects\[id]\board-actions.ts:466:// authenticated write asset_index. Callers (add_project_board_pdf /
src\app\[locale]\app\projects\[id]\board-actions.ts:467:// add_project_board_url action wrappers) have already validated auth
src\app\[locale]\app\projects\[id]\board-actions.ts:476:    .select("document, attached_pdfs, attached_urls, project_id")
src\app\[locale]\app\projects\[id]\board-actions.ts:484:    (board.attached_pdfs ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:486:    (board.attached_urls ?? []) as any,
src\app\[locale]\app\projects\[id]\board-actions.ts:494:    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
src\app\[locale]\app\projects\[id]\board-actions.ts:567:  // Call add_project_board_pdf RPC
src\app\[locale]\app\projects\[id]\board-actions.ts:570:    "add_project_board_pdf",
src\app\[locale]\app\projects\[id]\board-actions.ts:583:  // Recompute asset_index server-side (trust boundary L-041)
src\app\[locale]\app\projects\[id]\board-actions.ts:610:    "remove_project_board_attachment",
src\app\[locale]\app\projects\[id]\board-actions.ts:684:    "add_project_board_url",
src\app\[locale]\app\projects\[id]\board-actions.ts:726:    "update_project_board_url_note",
src\app\[locale]\app\projects\[id]\board-actions.ts:738:  // Note is in asset_index entries — must recompute (L-041)
src\app\[locale]\app\projects\[id]\board-actions.ts:764:    "remove_project_board_attachment",
src\app\[locale]\app\admin\projects\page.tsx:16:  // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
src\app\[locale]\app\admin\projects\page.tsx:33:      boards:project_boards(asset_index)
src\app\[locale]\app\admin\projects\page.tsx:45:    // Resolve asset count from project_boards.asset_index (preferred);
src\app\[locale]\app\admin\projects\page.tsx:49:      boardRow && Array.isArray(boardRow.asset_index)
src\app\[locale]\app\admin\projects\page.tsx:50:        ? boardRow.asset_index.length
src\app\[locale]\app\admin\projects\[id]\page.tsx:3:// Reads project_boards.asset_index server-side and renders AssetListPanel.
src\app\[locale]\app\admin\projects\[id]\page.tsx:64:  // Fetch project_boards.asset_index (Phase 3.1)
src\app\[locale]\app\admin\projects\[id]\page.tsx:67:    .select("id, asset_index, is_locked")
src\app\[locale]\app\admin\projects\[id]\page.tsx:71:  const assetIndex: AssetIndexEntry[] = Array.isArray(boardRow?.asset_index)
src\app\[locale]\app\admin\projects\[id]\page.tsx:72:    ? (boardRow.asset_index as AssetIndexEntry[])

 succeeded in 468ms:
1250:     supply_krw integer NOT NULL,
1251:     vat_krw integer NOT NULL,
1252:     note text,
1253:     source_type text,
1254:     source_id uuid,
1255:     created_at timestamp with time zone DEFAULT now() NOT NULL,
1256:     CONSTRAINT invoice_line_items_source_type_check CHECK ((source_type = ANY (ARRAY['manual'::text, 'meeting'::text, 'storyboard'::text, 'deliverable'::text])))
1257: );
1258: 
1259: 
1260: --
1261: -- Name: invoices; Type: TABLE; Schema: public; Owner: -
1262: --
1263: 
1264: CREATE TABLE public.invoices (
1265:     id uuid DEFAULT gen_random_uuid() NOT NULL,
1266:     project_id uuid NOT NULL,
1267:     workspace_id uuid NOT NULL,
1268:     supplier_id uuid NOT NULL,
1269:     invoice_number text,
1270:     nts_approval_number text,
1271:     status text DEFAULT 'draft'::text NOT NULL,
1272:     supply_date date NOT NULL,
1273:     issue_date date,
1274:     due_date date,
1275:     subtotal_krw integer DEFAULT 0 NOT NULL,
1276:     vat_krw integer DEFAULT 0 NOT NULL,
1277:     total_krw integer DEFAULT 0 NOT NULL,
1278:     memo text,
1279:     popbill_mgt_key text,
1280:     popbill_response jsonb,
1281:     filed_at timestamp with time zone,
1282:     paid_at timestamp with time zone,
1283:     void_reason text,
1284:     void_at timestamp with time zone,
1285:     is_mock boolean DEFAULT false NOT NULL,
1286:     created_by uuid NOT NULL,
1287:     created_at timestamp with time zone DEFAULT now() NOT NULL,
1288:     updated_at timestamp with time zone DEFAULT now() NOT NULL,
1289:     CONSTRAINT invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'issued'::text, 'paid'::text, 'void'::text])))
1290: );
1291: 
1292: 
1293: --
1294: -- Name: meeting_attendees; Type: TABLE; Schema: public; Owner: -
1295: --
1296: 
1297: CREATE TABLE public.meeting_attendees (
1298:     id uuid DEFAULT gen_random_uuid() NOT NULL,
1299:     meeting_id uuid NOT NULL,
1300:     email text NOT NULL,
1301:     display_name text,
1302:     user_id uuid,
1303:     response_status text DEFAULT 'needsAction'::text,
1304:     is_organizer boolean DEFAULT false,
1305:     created_at timestamp with time zone DEFAULT now() NOT NULL,
1306:     CONSTRAINT meeting_attendees_response_status_check CHECK ((response_status = ANY (ARRAY['needsAction'::text, 'accepted'::text, 'declined'::text, 'tentative'::text])))
1307: );
1308: 
1309: 
1310: --
1311: -- Name: meetings; Type: TABLE; Schema: public; Owner: -
1312: --
1313: 
1314: CREATE TABLE public.meetings (
1315:     id uuid DEFAULT gen_random_uuid() NOT NULL,
1316:     project_id uuid NOT NULL,
1317:     workspace_id uuid NOT NULL,
1318:     title text NOT NULL,
1319:     description text,
1320:     scheduled_at timestamp with time zone NOT NULL,
1321:     duration_minutes integer DEFAULT 30 NOT NULL,
1322:     status text DEFAULT 'scheduled'::text NOT NULL,
1323:     meet_link text,
1324:     google_event_id text,
1325:     calendar_sync_status text DEFAULT 'pending'::text NOT NULL,
1326:     calendar_sync_error text,
1327:     summary_md text,
1328:     summary_sent_at timestamp with time zone,
1329:     created_by uuid NOT NULL,
1330:     cancelled_reason text,
1331:     cancelled_at timestamp with time zone,
1332:     created_at timestamp with time zone DEFAULT now() NOT NULL,
1333:     updated_at timestamp with time zone DEFAULT now() NOT NULL,
1334:     CONSTRAINT meetings_calendar_sync_status_check CHECK ((calendar_sync_status = ANY (ARRAY['pending'::text, 'synced'::text, 'fallback_ics'::text, 'failed'::text]))),
1335:     CONSTRAINT meetings_status_check CHECK ((status = ANY (ARRAY['scheduled'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
1810: 
1811: 
1812: --
1813: -- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
1814: --
1815: 
1816: CREATE TABLE public.workspace_members (
1817:     id uuid DEFAULT gen_random_uuid() NOT NULL,
1818:     workspace_id uuid NOT NULL,
1819:     user_id uuid NOT NULL,
1820:     role text NOT NULL,
1821:     invited_by uuid,
1822:     invited_at timestamp with time zone,
1823:     joined_at timestamp with time zone,
1824:     created_at timestamp with time zone DEFAULT now() NOT NULL,
1825:     CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
1826: );
1827: 
1828: 
1829: --
1830: -- Name: workspaces; Type: TABLE; Schema: public; Owner: -
4100: --
4101: -- Name: project_threads; Type: ROW SECURITY; Schema: public; Owner: -
4102: --
4103: 
4104: ALTER TABLE public.project_threads ENABLE ROW LEVEL SECURITY;
4105: 
4106: --
4107: -- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
4108: --
4109: 
4110: ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
4111: 
4112: --
4113: -- Name: projects projects_delete_yagi; Type: POLICY; Schema: public; Owner: -
4114: --
4115: 
4116: CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
4117: 
4118: 
4119: --
4120: -- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
4121: --
4122: 
4123: CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4124: 
4125: 
4126: --
4127: -- Name: projects projects_read; Type: POLICY; Schema: public; Owner: -
4128: --
4129: 
4130: CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4131: 
4132: 
4133: --
4134: -- Name: projects projects_update; Type: POLICY; Schema: public; Owner: -
4135: --
4136: 
4137: CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4138: 
4139: 
4140: --
4141: -- Name: showcase_media; Type: ROW SECURITY; Schema: public; Owner: -
4142: --
4143: 
4144: ALTER TABLE public.showcase_media ENABLE ROW LEVEL SECURITY;
4145: 
4146: --
4147: -- Name: showcase_media showcase_media_delete; Type: POLICY; Schema: public; Owner: -
4148: --
4149: 
4150: CREATE POLICY showcase_media_delete ON public.showcase_media FOR DELETE USING ((EXISTS ( SELECT 1
4151:    FROM public.showcases s
4152:   WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
4153: 
4154: 
4155: --
4156: -- Name: showcase_media showcase_media_insert; Type: POLICY; Schema: public; Owner: -
4157: --
4158: 
4159: CREATE POLICY showcase_media_insert ON public.showcase_media FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
4160:    FROM public.showcases s
4161:   WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
4162: 
4163: 
4164: --
4165: -- Name: showcase_media showcase_media_select; Type: POLICY; Schema: public; Owner: -
4460: 
4461: ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
4462: 
4463: --
4464: -- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
4465: --
4466: 
4467: ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
4468: 
4469: --
4470: -- Name: workspaces; Type: ROW SECURITY; Schema: public; Owner: -
4471: --
4472: 
4473: ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
4474: 
4475: --
4476: -- Name: workspaces ws_create_any_auth; Type: POLICY; Schema: public; Owner: -
4477: --
4478: 
4479: CREATE POLICY ws_create_any_auth ON public.workspaces FOR INSERT TO authenticated WITH CHECK (true);
4480: 
4481: 
4482: --
4483: -- Name: workspaces ws_delete_yagi; Type: POLICY; Schema: public; Owner: -
4484: --
4485: 
4486: CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
4487: 
4488: 
4489: --
4490: -- Name: workspace_invitations ws_inv_read_admin; Type: POLICY; Schema: public; Owner: -
4491: --
4492: 
4493: CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4494: 
4495: 
4496: --
4497: -- Name: workspace_invitations ws_inv_write_admin; Type: POLICY; Schema: public; Owner: -
4498: --
4499: 
4500: CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4501: 
4502: 
4503: --
4504: -- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
4505: --
4506: 
4507: CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4508: 
4509: 
4510: --
4511: -- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
4512: --
4513: 
4514: CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4515: 
4516: 
4517: --
4518: -- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
4519: --
4520: 
4521: CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
4522:    FROM public.workspace_members m
4523:   WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
4524: 
4525: 
4526: --
4527: -- Name: workspaces ws_read_members; Type: POLICY; Schema: public; Owner: -
4528: --
4529: 
4530: CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"GRANT .*project_boards|REVOKE .*project_boards|GRANT .*ON ALL TABLES|ALTER DEFAULT PRIVILEGES|project_boards\\s*\\(\" supabase/migrations -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429113853_phase_3_1_project_board.sql' | ForEach-Object { "'$i++; if ($i -le 230) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/new-project-wizard.tsx' | ForEach-Object { "'$i++; if (($i -ge 410 -and $i -le 470) -or ($i -ge 850 -and $i -le 930)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/board/asset-index.ts' | ForEach-Object { "'$i++; if ($i -le 235) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 357ms:
supabase/migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
supabase/migrations\20260429113853_phase_3_1_project_board.sql:27:  board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
supabase/migrations\20260429113853_phase_3_1_project_board.sql:140:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:170:  INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429113853_phase_3_1_project_board.sql:214:INSERT INTO project_boards (project_id, document, source)
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:50:  INSERT INTO project_boards (project_id, document, asset_index, source)
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:379:  INSERT INTO project_boards (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:342:  INSERT INTO project_boards (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:6:-- columns on project_boards (attached_pdfs, attached_urls, asset_index)
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:193:  INSERT INTO project_boards (
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:4:-- server-managed columns on project_boards (attached_pdfs, attached_urls,
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:54:    RAISE EXCEPTION 'sub_03f_2 assert failed: authenticated still has effective UPDATE on project_boards (check PUBLIC + inherited grants)';

 succeeded in 402ms:
   1: -- Phase 3.1: project_boards + project_board_versions + 3 RPCs + RLS
   2: -- Execution: additive only -- no existing tables modified
   3: -- Recorded version: 20260429113853 (per L-021 MCP timestamp rename)
   4: 
   5: -- ============================================================
   6: -- Table: project_boards
   7: -- ============================================================
   8: CREATE TABLE IF NOT EXISTS project_boards (
   9:   id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  10:   project_id      uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  11:   document        jsonb NOT NULL DEFAULT '{}'::jsonb,
  12:   schema_version  int  NOT NULL DEFAULT 1,
  13:   asset_index     jsonb NOT NULL DEFAULT '[]'::jsonb,
  14:   source          text NOT NULL CHECK (source IN ('wizard_seed', 'admin_init', 'migrated')),
  15:   is_locked       boolean NOT NULL DEFAULT false,
  16:   locked_by       uuid REFERENCES profiles(id),
  17:   locked_at       timestamptz,
  18:   created_at      timestamptz NOT NULL DEFAULT now(),
  19:   updated_at      timestamptz NOT NULL DEFAULT now()
  20: );
  21: 
  22: -- ============================================================
  23: -- Table: project_board_versions
  24: -- ============================================================
  25: CREATE TABLE IF NOT EXISTS project_board_versions (
  26:   id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  27:   board_id    uuid NOT NULL REFERENCES project_boards(id) ON DELETE CASCADE,
  28:   version     int  NOT NULL,
  29:   document    jsonb NOT NULL,
  30:   created_by  uuid REFERENCES profiles(id),
  31:   created_at  timestamptz NOT NULL DEFAULT now(),
  32:   label       text,
  33:   UNIQUE (board_id, version)
  34: );
  35: 
  36: CREATE INDEX IF NOT EXISTS idx_project_board_versions_board_version
  37:   ON project_board_versions (board_id, version DESC);
  38: 
  39: -- ============================================================
  40: -- RLS: project_boards
  41: -- ============================================================
  42: ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
  43: 
  44: CREATE POLICY project_boards_select_client ON project_boards
  45:   FOR SELECT
  46:   USING (
  47:     is_yagi_admin(auth.uid())
  48:     OR project_id IN (
  49:       SELECT p.id FROM projects p
  50:       WHERE p.workspace_id IN (
  51:         SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  52:       )
  53:     )
  54:   );
  55: 
  56: CREATE POLICY project_boards_insert_via_rpc ON project_boards
  57:   FOR INSERT
  58:   WITH CHECK (false);
  59: 
  60: CREATE POLICY project_boards_update_client ON project_boards
  61:   FOR UPDATE
  62:   USING (
  63:     is_yagi_admin(auth.uid())
  64:     OR (
  65:       is_locked = false
  66:       AND project_id IN (
  67:         SELECT p.id FROM projects p
  68:         WHERE p.workspace_id IN (
  69:           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  70:         )
  71:       )
  72:     )
  73:   )
  74:   WITH CHECK (
  75:     is_yagi_admin(auth.uid())
  76:     OR (
  77:       is_locked = false
  78:       AND project_id IN (
  79:         SELECT p.id FROM projects p
  80:         WHERE p.workspace_id IN (
  81:           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  82:         )
  83:       )
  84:     )
  85:   );
  86: 
  87: -- ============================================================
  88: -- RLS: project_board_versions
  89: -- ============================================================
  90: ALTER TABLE project_board_versions ENABLE ROW LEVEL SECURITY;
  91: 
  92: CREATE POLICY project_board_versions_select ON project_board_versions
  93:   FOR SELECT
  94:   USING (
  95:     is_yagi_admin(auth.uid())
  96:     OR board_id IN (
  97:       SELECT pb.id FROM project_boards pb
  98:       WHERE pb.project_id IN (
  99:         SELECT p.id FROM projects p
 100:         WHERE p.workspace_id IN (
 101:           SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
 102:         )
 103:       )
 104:     )
 105:   );
 106: 
 107: CREATE POLICY project_board_versions_insert_trigger ON project_board_versions
 108:   FOR INSERT
 109:   WITH CHECK (false);
 110: 
 111: -- ============================================================
 112: -- RPC: seed_project_board_from_wizard
 113: -- ============================================================
 114: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
 115:   p_project_id      uuid,
 116:   p_initial_document jsonb
 117: )
 118: RETURNS uuid
 119: LANGUAGE plpgsql
 120: SECURITY DEFINER
 121: SET search_path = public
 122: AS $$
 123: DECLARE
 124:   v_board_id uuid;
 125:   v_project_status text;
 126: BEGIN
 127:   SELECT status INTO v_project_status
 128:   FROM projects
 129:   WHERE id = p_project_id;
 130: 
 131:   IF v_project_status IS NULL THEN
 132:     RAISE EXCEPTION 'project not found: %', p_project_id;
 133:   END IF;
 134: 
 135:   IF v_project_status != 'in_review' THEN
 136:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
 137:       p_project_id, v_project_status;
 138:   END IF;
 139: 
 140:   INSERT INTO project_boards (project_id, document, source)
 141:   VALUES (p_project_id, p_initial_document, 'wizard_seed')
 142:   ON CONFLICT (project_id) DO UPDATE
 143:     SET document   = EXCLUDED.document,
 144:         source     = 'wizard_seed',
 145:         updated_at = now()
 146:   RETURNING id INTO v_board_id;
 147: 
 148:   RETURN v_board_id;
 149: END;
 150: $$;
 151: 
 152: -- ============================================================
 153: -- RPC: init_project_board
 154: -- ============================================================
 155: CREATE OR REPLACE FUNCTION init_project_board(
 156:   p_project_id uuid
 157: )
 158: RETURNS uuid
 159: LANGUAGE plpgsql
 160: SECURITY DEFINER
 161: SET search_path = public
 162: AS $$
 163: DECLARE
 164:   v_board_id uuid;
 165: BEGIN
 166:   IF NOT is_yagi_admin(auth.uid()) THEN
 167:     RAISE EXCEPTION 'init_project_board: caller must be yagi_admin';
 168:   END IF;
 169: 
 170:   INSERT INTO project_boards (project_id, document, source)
 171:   VALUES (p_project_id, '{}'::jsonb, 'admin_init')
 172:   ON CONFLICT (project_id) DO UPDATE
 173:     SET updated_at = now()
 174:   RETURNING id INTO v_board_id;
 175: 
 176:   RETURN v_board_id;
 177: END;
 178: $$;
 179: 
 180: -- ============================================================
 181: -- RPC: toggle_project_board_lock
 182: -- ============================================================
 183: CREATE OR REPLACE FUNCTION toggle_project_board_lock(
 184:   p_board_id uuid,
 185:   p_locked   boolean
 186: )
 187: RETURNS void
 188: LANGUAGE plpgsql
 189: SECURITY DEFINER
 190: SET search_path = public
 191: AS $$
 192: BEGIN
 193:   IF NOT is_yagi_admin(auth.uid()) THEN
 194:     RAISE EXCEPTION 'toggle_project_board_lock: caller must be yagi_admin';
 195:   END IF;
 196: 
 197:   UPDATE project_boards
 198:   SET
 199:     is_locked  = p_locked,
 200:     locked_by  = CASE WHEN p_locked THEN auth.uid() ELSE NULL END,
 201:     locked_at  = CASE WHEN p_locked THEN now() ELSE NULL END,
 202:     updated_at = now()
 203:   WHERE id = p_board_id;
 204: 
 205:   IF NOT FOUND THEN
 206:     RAISE EXCEPTION 'project_board not found: %', p_board_id;
 207:   END IF;
 208: END;
 209: $$;
 210: 
 211: -- ============================================================
 212: -- One-time back-fill: every existing project gets a board row
 213: -- ============================================================
 214: INSERT INTO project_boards (project_id, document, source)
 215: SELECT id, '{}'::jsonb, 'migrated'
 216: FROM projects
 217: WHERE id NOT IN (SELECT project_id FROM project_boards)
 218: ON CONFLICT (project_id) DO NOTHING;

 succeeded in 405ms:
 410: 
 411:   // -------------------------------------------------------------------------
 412:   // Phase 3.1 hotfix-3 ??Wizard attachment handlers (local state, no RPC)
 413:   // Brief mode calls server actions directly; wizard builds local state until submit.
 414:   // -------------------------------------------------------------------------
 415: 
 416:   async function handlePdfAddWizard(file: File): Promise<void> {
 417:     // Get presigned PUT URL from server action (server generates storage key)
 418:     const result = await getBoardAssetPutUrlAction(file.type);
 419:     if (!result.ok) {
 420:       toast.error("?뚯씪 ?낅줈?쒖뿉 ?ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄?댁＜?몄슂.");
 421:       return;
 422:     }
 423:     // Upload to R2
 424:     const putResp = await fetch(result.putUrl, {
 425:       method: "PUT",
 426:       body: file,
 427:       headers: { "Content-Type": file.type },
 428:     });
 429:     if (!putResp.ok) {
 430:       toast.error("?뚯씪 ?낅줈?쒖뿉 ?ㅽ뙣?덉뒿?덈떎. ?ㅼ떆 ?쒕룄?댁＜?몄슂.");
 431:       return;
 432:     }
 433:     // storage_key for wizard PDFs uses the board-assets prefix that
 434:     // getBoardAssetPutUrlAction generated server-side. Extract the path
 435:     // portion of the public URL and strip the leading slash so the key
 436:     // matches the actual R2 object key ??board-assets/<user>/<uuid>.pdf.
 437:     // Wave C.5d sub_03f_1: previously this prepended "project-wizard" to
 438:     // satisfy the add_project_board_pdf RPC validation, which left a key
 439:     // that did not exist in R2 and made submitted PDFs unrecoverable.
 440:     // Companion sub_03f_1 migration adds `board-assets/` to the RPC
 441:     // allowlist so the bare key passes validation.
 442:     let storageKey = result.publicUrl;
 443:     try {
 444:       const urlObj = new URL(result.publicUrl);
 445:       storageKey = urlObj.pathname.replace(/^\//, "");
 446:     } catch {
 447:       // fall back to publicUrl
 448:     }
 449:     const newPdf: PdfAttachment = {
 450:       id: crypto.randomUUID(),
 451:       storage_key: storageKey,
 452:       filename: file.name,
 453:       size_bytes: file.size,
 454:       uploaded_at: new Date().toISOString(),
 455:       uploaded_by: "wizard",
 456:     };
 457:     setAttachedPdfs((prev) => [...prev, newPdf]);
 458:   }
 459: 
 460:   function handlePdfRemoveWizard(id: string): Promise<void> {
 461:     setAttachedPdfs((prev) => prev.filter((p) => p.id !== id));
 462:     return Promise.resolve();
 463:   }
 464: 
 465:   async function handleUrlAddWizard(url: string, note: string | null): Promise<void> {
 466:     let provider: UrlAttachment["provider"] = "generic";
 467:     let title: string | null = null;
 468:     let thumbnail_url: string | null = null;
 469: 
 470:     try {
 850:                 deliverable_types: formVals.deliverable_types,
 851:                 budget_band: formVals.budget_band,
 852:                 delivery_date:
 853:                   formVals.delivery_date && formVals.delivery_date !== ""
 854:                     ? formVals.delivery_date
 855:                     : null,
 856:                 meeting_preferred_at: meetingPreferredAt,
 857:                 // Phase 4.x task_03: Digital Twin intent (3-radio).
 858:                 twin_intent: formVals.twin_intent,
 859:                 // Phase 3.1: tldraw store snapshot replaces references[]
 860:                 boardDocument,
 861:                 // Phase 3.1 hotfix-3: pass structured attachments (Q-AA)
 862:                 attachedPdfs,
 863:                 attachedUrls,
 864:                 draftProjectId,
 865:                 // Wave C.5d sub_03b: explicit active workspace from server-
 866:                 // resolved cookie (page.tsx). Server still re-verifies via
 867:                 // memberSet, and falls through to its own resolver if null.
 868:                 workspaceId: activeWorkspaceId ?? undefined,
 869:               });
 870:               if (result.ok) {
 871:                 router.push(result.redirect);
 872:               } else {
 873:                 console.error("[wizard.submit] failed:", result);
 874:                 const errorKey =
 875:                   result.error === "unauthenticated"
 876:                     ? "wizard.errors.unauthenticated"
 877:                     : result.error === "validation"
 878:                     ? "wizard.errors.submit_validation"
 879:                     : "wizard.errors.submit_failed";
 880:                 toast.error(t(errorKey));
 881:               }
 882:             });
 883:           }}
 884:         >
 885:           {isSubmitting ? (
 886:             <Loader2 className="w-4 h-4 animate-spin" />
 887:           ) : (
 888:             t("wizard.actions.submit")
 889:           )}
 890:         </Button>
 891:       </div>
 892:     </div>
 893:   );
 894: 
 895:   // -------------------------------------------------------------------------
 896:   // Render
 897:   // -------------------------------------------------------------------------
 898: 
 899:   const stepTitleKey = (
 900:     {
 901:       1: "wizard.step1.title",
 902:       2: "wizard.step2.title",
 903:       3: "wizard.step3.title",
 904:     } as const
 905:   )[step];
 906: 
 907:   const stepEyebrowKey = (
 908:     {
 909:       1: "wizard.step1.eyebrow",
 910:       2: "wizard.step2.eyebrow",
 911:       3: "wizard.step3.eyebrow",
 912:     } as const
 913:   )[step];
 914: 
 915:   return (
 916:     // Step 2 breakout to max-w-6xl (Q-AC, Q-AF); Steps 1+3 unchanged at max-w-2xl.
 917:     // Tailwind transition-[max-width] ~300ms ease-out sells the width change (L-039).
 918:     <div
 919:       className={cn(
 920:         "px-6 py-8 mx-auto w-full transition-[max-width] duration-300 ease-out",
 921:         step === 2 ? "max-w-6xl" : "max-w-2xl"
 922:       )}
 923:     >
 924:       <StepIndicator current={step} />
 925: 
 926:       {/* Step header ??no border-b below (L-012) */}
 927:       <div className="mb-8">
 928:         <Eyebrow>{t(stepEyebrowKey)}</Eyebrow>
 929:         <h2 className="font-suit text-3xl font-bold tracking-tight mt-1 keep-all">
 930:           {t(stepTitleKey)}

 succeeded in 404ms:
   1: /**
   2:  * asset-index.ts
   3:  * Phase 3.1 hotfix-3 ??Unified asset index normalizer merging three attachment sources:
   4:  *   1. Canvas shapes (yagi-image, yagi-pdf, yagi-url-card) from tldraw snapshot
   5:  *   2. attached_pdfs jsonb column entries
   6:  *   3. attached_urls jsonb column entries
   7:  *
   8:  * Trust boundary: server actions ALWAYS recompute asset_index server-side.
   9:  * Client NEVER supplies asset_index (K-05 + L-041).
  10:  *
  11:  * Pure function ??no I/O, no side effects, easily unit-testable.
  12:  */
  13: 
  14: // ============================================================
  15: // Attachment types (mirrors DB jsonb shape contracts)
  16: // ============================================================
  17: 
  18: export type PdfAttachment = {
  19:   id: string;
  20:   storage_key: string;
  21:   filename: string;
  22:   size_bytes: number;
  23:   uploaded_at: string; // ISO string
  24:   uploaded_by: string; // profile_id
  25: };
  26: 
  27: export type UrlAttachment = {
  28:   id: string;
  29:   url: string;
  30:   title: string | null;
  31:   thumbnail_url: string | null;
  32:   provider: "youtube" | "vimeo" | "generic";
  33:   note: string | null;
  34:   added_at: string; // ISO string
  35:   added_by: string; // profile_id
  36: };
  37: 
  38: // ============================================================
  39: // Unified asset index entry
  40: // ============================================================
  41: 
  42: export type AssetIndexEntry = {
  43:   id: string;
  44:   source: "canvas" | "attached_pdf" | "attached_url";
  45:   kind: "image" | "pdf" | "url";
  46:   // Common
  47:   url: string; // for canvas: R2 public URL; for url-attachment: the URL itself; for pdf-attachment: storage_key
  48:   title: string | null;
  49:   thumbnail_url: string | null;
  50:   // Canvas-only
  51:   shape_id?: string;
  52:   // PDF-only
  53:   filename?: string;
  54:   size_bytes?: number;
  55:   // URL-only (attached or canvas url-card)
  56:   provider?: "youtube" | "vimeo" | "generic";
  57:   // Memo (URL-attachment) or caption (canvas image-shape)
  58:   note: string | null;
  59:   added_at: string; // ISO string
  60:   // Set when same URL appears in both canvas url-card shapes AND attached_urls
  61:   duplicate?: boolean;
  62: };
  63: 
  64: // ============================================================
  65: // extractAssetIndex
  66: // Merges canvas shapes + attached_pdfs + attached_urls into a unified
  67: // flat AssetIndexEntry[].
  68: //
  69: // Sort order: attached items first (source !== 'canvas'), then canvas items,
  70: // within each group sorted by added_at ascending.
  71: //
  72: // Deduplication: if the same URL exists in both canvas url-card shapes AND
  73: // attached_urls, keep both entries ??mark the canvas entry with duplicate:true
  74: // (the attached_url entry has the explicit note and is preferred for display).
  75: //
  76: // Default params preserve backward compat with Phase 3.1 callers that only
  77: // pass the document argument.
  78: // ============================================================
  79: 
  80: export function extractAssetIndex(
  81:   document: Record<string, unknown> | null | undefined,
  82:   attached_pdfs: PdfAttachment[] = [],
  83:   attached_urls: UrlAttachment[] = []
  84: ): AssetIndexEntry[] {
  85:   const canvasEntries: AssetIndexEntry[] = [];
  86:   const attachedEntries: AssetIndexEntry[] = [];
  87: 
  88:   // --- Build set of URLs in attached_urls for dedup check ---
  89:   const attachedUrlSet = new Set<string>(
  90:     attached_urls.map((u) => u.url.toLowerCase().trim())
  91:   );
  92: 
  93:   // --- Extract canvas shapes ---
  94:   if (document && typeof document === "object") {
  95:     const store = document.store as Record<string, unknown> | undefined;
  96:     if (store && typeof store === "object") {
  97:       for (const [key, record] of Object.entries(store)) {
  98:         if (!key.startsWith("shape:")) continue;
  99:         if (typeof record !== "object" || record === null) continue;
 100: 
 101:         const shape = record as {
 102:           type?: string;
 103:           id?: string;
 104:           props?: Record<string, unknown>;
 105:           meta?: Record<string, unknown>;
 106:         };
 107: 
 108:         if (!shape.type || !shape.props) continue;
 109: 
 110:         const addedAt =
 111:           typeof shape.meta?.createdAt === "string"
 112:             ? shape.meta.createdAt
 113:             : typeof shape.meta?.addedAt === "string"
 114:               ? shape.meta.addedAt
 115:               : new Date(0).toISOString();
 116: 
 117:         switch (shape.type) {
 118:           case "yagi-image": {
 119:             const src = shape.props.src as string | undefined;
 120:             if (src) {
 121:               canvasEntries.push({
 122:                 id: shape.id ?? key,
 123:                 source: "canvas",
 124:                 kind: "image",
 125:                 url: src,
 126:                 title: (shape.props.alt as string) || null,
 127:                 thumbnail_url: null,
 128:                 shape_id: shape.id ?? key,
 129:                 note: null,
 130:                 added_at: addedAt,
 131:               });
 132:             }
 133:             break;
 134:           }
 135:           case "yagi-pdf": {
 136:             const src = shape.props.src as string | undefined;
 137:             const filename = shape.props.filename as string | undefined;
 138:             if (src) {
 139:               canvasEntries.push({
 140:                 id: shape.id ?? key,
 141:                 source: "canvas",
 142:                 kind: "pdf",
 143:                 url: src,
 144:                 title: filename ?? null,
 145:                 thumbnail_url: null,
 146:                 shape_id: shape.id ?? key,
 147:                 filename,
 148:                 note: null,
 149:                 added_at: addedAt,
 150:               });
 151:             }
 152:             break;
 153:           }
 154:           case "yagi-url-card": {
 155:             const src = shape.props.url as string | undefined;
 156:             const title = shape.props.title as string | undefined;
 157:             const domain = shape.props.domain as string | undefined;
 158:             if (src) {
 159:               const isDuplicate = attachedUrlSet.has(
 160:                 src.toLowerCase().trim()
 161:               );
 162:               canvasEntries.push({
 163:                 id: shape.id ?? key,
 164:                 source: "canvas",
 165:                 kind: "url",
 166:                 url: src,
 167:                 title: title ?? domain ?? null,
 168:                 thumbnail_url: null,
 169:                 shape_id: shape.id ?? key,
 170:                 note: null,
 171:                 added_at: addedAt,
 172:                 ...(isDuplicate ? { duplicate: true } : {}),
 173:               });
 174:             }
 175:             break;
 176:           }
 177:         }
 178:       }
 179:     }
 180:   }
 181: 
 182:   // --- Map attached_pdfs ---
 183:   for (const pdf of attached_pdfs) {
 184:     attachedEntries.push({
 185:       id: pdf.id,
 186:       source: "attached_pdf",
 187:       kind: "pdf",
 188:       url: pdf.storage_key, // storage_key is the canonical reference; public URL built in display layer
 189:       title: pdf.filename,
 190:       thumbnail_url: null,
 191:       filename: pdf.filename,
 192:       size_bytes: pdf.size_bytes,
 193:       note: null,
 194:       added_at: pdf.uploaded_at,
 195:     });
 196:   }
 197: 
 198:   // --- Map attached_urls ---
 199:   for (const urlEntry of attached_urls) {
 200:     attachedEntries.push({
 201:       id: urlEntry.id,
 202:       source: "attached_url",
 203:       kind: "url",
 204:       url: urlEntry.url,
 205:       title: urlEntry.title,
 206:       thumbnail_url: urlEntry.thumbnail_url,
 207:       provider: urlEntry.provider,
 208:       note: urlEntry.note,
 209:       added_at: urlEntry.added_at,
 210:     });
 211:   }
 212: 
 213:   // --- Sort each group by added_at ascending ---
 214:   const sortByAddedAt = (a: AssetIndexEntry, b: AssetIndexEntry) =>
 215:     a.added_at.localeCompare(b.added_at);
 216: 
 217:   attachedEntries.sort(sortByAddedAt);
 218:   canvasEntries.sort(sortByAddedAt);
 219: 
 220:   // --- Result: attached first, then canvas ---
 221:   return [...attachedEntries, ...canvasEntries];
 222: }

codex
A notable detail surfaced: the new migration replaces the five-argument seed function, but the older three-argument overload still appears in the migration history and was explicitly granted to `authenticated`. I’m checking whether that overload remains live and can still write `asset_index` from caller input.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429124343_phase_3_1_k05_loop_1_fixes.sql' | ForEach-Object { "'$i++; if ($i -le 75) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "DROP FUNCTION IF EXISTS seed_project_board_from_wizard|REVOKE .*seed_project_board_from_wizard|GRANT .*seed_project_board_from_wizard|CREATE OR REPLACE FUNCTION seed_project_board_from_wizard" supabase/migrations -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'supabase/migrations/20260429144523_phase_3_1_hotfix_3_attachments.sql' | ForEach-Object { "'$i++; if (($i -ge 345 -and $i -le 410) -or ($i -ge 1 -and $i -le 15)) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/lib/supabase/database.types.ts' | ForEach-Object { "'$i++; if ($i -ge 2676 -and $i -le 2705) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 454ms:
   1: -- ============================================================
   2: -- Phase 3.1 K-05 LOOP 1 fixes
   3: -- HIGH-A F1: seed_project_board_from_wizard cross-tenant write prevention
   4: --   - Reject anon callers (auth.uid() IS NULL)
   5: --   - Require projects.created_by = auth.uid()
   6: -- HIGH-B F5: support pre-computed asset_index seed (server-computed at submit)
   7: -- ============================================================
   8: 
   9: -- Drop and recreate seed_project_board_from_wizard with auth gate + asset_index param
  10: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
  11:   p_project_id      uuid,
  12:   p_initial_document jsonb,
  13:   p_initial_asset_index jsonb DEFAULT '[]'::jsonb
  14: )
  15: RETURNS uuid
  16: LANGUAGE plpgsql
  17: SECURITY DEFINER
  18: SET search_path = public
  19: AS $$
  20: DECLARE
  21:   v_board_id uuid;
  22:   v_project_status text;
  23:   v_project_owner uuid;
  24:   v_caller uuid;
  25: BEGIN
  26:   -- K-05 HIGH-A F1: reject anon callers and non-owners
  27:   v_caller := auth.uid();
  28:   IF v_caller IS NULL THEN
  29:     RAISE EXCEPTION 'seed_project_board_from_wizard: unauthenticated';
  30:   END IF;
  31: 
  32:   SELECT status, created_by INTO v_project_status, v_project_owner
  33:   FROM projects
  34:   WHERE id = p_project_id;
  35: 
  36:   IF v_project_status IS NULL THEN
  37:     RAISE EXCEPTION 'project not found: %', p_project_id;
  38:   END IF;
  39: 
  40:   -- K-05 HIGH-A F1: caller must own the project (cross-tenant write prevention)
  41:   IF v_project_owner IS DISTINCT FROM v_caller THEN
  42:     RAISE EXCEPTION 'seed_project_board_from_wizard: caller % does not own project %', v_caller, p_project_id;
  43:   END IF;
  44: 
  45:   IF v_project_status != 'in_review' THEN
  46:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
  47:       p_project_id, v_project_status;
  48:   END IF;
  49: 
  50:   INSERT INTO project_boards (project_id, document, asset_index, source)
  51:   VALUES (p_project_id, p_initial_document, COALESCE(p_initial_asset_index, '[]'::jsonb), 'wizard_seed')
  52:   ON CONFLICT (project_id) DO UPDATE
  53:     SET document     = EXCLUDED.document,
  54:         asset_index  = EXCLUDED.asset_index,
  55:         source       = 'wizard_seed',
  56:         updated_at   = now()
  57:   RETURNING id INTO v_board_id;
  58: 
  59:   RETURN v_board_id;
  60: END;
  61: $$;
  62: 
  63: REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
  64: GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;

 succeeded in 473ms:
supabase/migrations\20260429113853_phase_3_1_project_board.sql:114:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:10:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:63:REVOKE ALL ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) FROM PUBLIC;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:4:-- The original CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(uuid, jsonb)
supabase/migrations\20260429125246_phase_3_1_k05_loop_2_drop_unsafe_seed_overload.sql:11:DROP FUNCTION IF EXISTS seed_project_board_from_wizard(uuid, jsonb);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:305:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:350:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:67:CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(

 succeeded in 527ms:
   1: -- Phase 3.1 hotfix-3: attached_pdfs + attached_urls columns + 4 attachment RPCs + extend seed RPC
   2: -- Execution: additive only -- ALTER TABLE ADD COLUMN IF NOT EXISTS with safe defaults
   3: -- Recorded version: to be confirmed via L-021 after MCP apply_migration
   4: 
   5: -- ============================================================
   6: -- Schema changes: add attachment columns to project_boards
   7: -- ============================================================
   8: ALTER TABLE project_boards
   9:   ADD COLUMN IF NOT EXISTS attached_pdfs jsonb NOT NULL DEFAULT '[]'::jsonb,
  10:   ADD COLUMN IF NOT EXISTS attached_urls jsonb NOT NULL DEFAULT '[]'::jsonb;
  11: 
  12: -- ============================================================
  13: -- RPC: add_project_board_pdf
  14: -- Appends a PDF attachment entry to project_boards.attached_pdfs.
  15: -- Validates: caller ownership OR yagi_admin, lock state, count cap (30),
 345: -- RPC: seed_project_board_from_wizard (EXTEND signature)
 346: -- Adds p_initial_attached_pdfs, p_initial_attached_urls, p_initial_asset_index
 347: -- with DEFAULT empty array for backward compatibility with Phase 3.1 callers.
 348: -- Existing logic preserved (project must be in_review, UPSERT on project_id).
 349: -- ============================================================
 350: CREATE OR REPLACE FUNCTION seed_project_board_from_wizard(
 351:   p_project_id           uuid,
 352:   p_initial_document     jsonb,
 353:   p_initial_attached_pdfs jsonb DEFAULT '[]'::jsonb,
 354:   p_initial_attached_urls jsonb DEFAULT '[]'::jsonb,
 355:   p_initial_asset_index   jsonb DEFAULT '[]'::jsonb
 356: )
 357: RETURNS uuid
 358: LANGUAGE plpgsql
 359: SECURITY DEFINER
 360: SET search_path = public, pg_temp
 361: AS $$
 362: DECLARE
 363:   v_board_id       uuid;
 364:   v_project_status text;
 365: BEGIN
 366:   SELECT status INTO v_project_status
 367:   FROM projects
 368:   WHERE id = p_project_id;
 369: 
 370:   IF v_project_status IS NULL THEN
 371:     RAISE EXCEPTION 'project not found: %', p_project_id;
 372:   END IF;
 373: 
 374:   IF v_project_status != 'in_review' THEN
 375:     RAISE EXCEPTION 'project % must be in_review to seed board; current status: %',
 376:       p_project_id, v_project_status;
 377:   END IF;
 378: 
 379:   INSERT INTO project_boards (
 380:     project_id,
 381:     document,
 382:     attached_pdfs,
 383:     attached_urls,
 384:     asset_index,
 385:     source
 386:   )
 387:   VALUES (
 388:     p_project_id,
 389:     p_initial_document,
 390:     p_initial_attached_pdfs,
 391:     p_initial_attached_urls,
 392:     p_initial_asset_index,
 393:     'wizard_seed'
 394:   )
 395:   ON CONFLICT (project_id) DO UPDATE
 396:     SET document      = EXCLUDED.document,
 397:         attached_pdfs = EXCLUDED.attached_pdfs,
 398:         attached_urls = EXCLUDED.attached_urls,
 399:         asset_index   = EXCLUDED.asset_index,
 400:         source        = 'wizard_seed',
 401:         updated_at    = now()
 402:   RETURNING id INTO v_board_id;
 403: 
 404:   RETURN v_board_id;
 405: END;
 406: $$;

 succeeded in 548ms:
2676:           user_id: string
2677:         }[]
2678:       }
2679:       save_brief_version: {
2680:         Args: { p_label?: string; p_project_id: string }
2681:         Returns: Json
2682:       }
2683:       seed_project_board_from_wizard:
2684:         | {
2685:             Args: {
2686:               p_initial_asset_index?: Json
2687:               p_initial_document: Json
2688:               p_project_id: string
2689:             }
2690:             Returns: string
2691:           }
2692:         | {
2693:             Args: {
2694:               p_initial_asset_index?: Json
2695:               p_initial_attached_pdfs?: Json
2696:               p_initial_attached_urls?: Json
2697:               p_initial_document: Json
2698:               p_project_id: string
2699:             }
2700:             Returns: string
2701:           }
2702:       toggle_project_board_lock: {
2703:         Args: { p_board_id: string; p_locked: boolean }
2704:         Returns: undefined
2705:       }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"\\.update\\(|\\.upsert\\(|\\.insert\\(\" src/app/[locale]/app/projects/[id]/board-actions.ts src/app/[locale]/app/projects/new/actions.ts -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"\\.from\\(\\\"project_boards\\\"\\)|\\.from\\('project_boards'\\)|project_boards\" src/app src/lib src/components -S" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/[id]/board-actions.ts' | ForEach-Object { "'$i++; if ($i -ge 750 -and $i -le 790) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-03T16:19:47.896975Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: regex parse error:
    (?:\.from\(\)
    ^
error: unclosed group

 exited 1 in 367ms:
rg: regex parse error:
    (?:\.from\(\)
    ^
error: unclosed group

 succeeded in 375ms:
src/app/[locale]/app/projects/[id]/board-actions.ts:180:    .update({
src/app/[locale]/app/projects/[id]/board-actions.ts:218:    await (svc as any).from("project_board_versions").insert({
src/app/[locale]/app/projects/[id]/board-actions.ts:433:    .update({
src/app/[locale]/app/projects/[id]/board-actions.ts:494:    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
src/app/[locale]/app/projects/new/actions.ts:115:    .insert(insertPayload)
src/app/[locale]/app/projects/new/actions.ts:137:    .insert({
src/app/[locale]/app/projects/new/actions.ts:328:    .insert(insertPayload)
src/app/[locale]/app/projects/new/actions.ts:360:    .insert({
src/app/[locale]/app/projects/new/actions.ts:422:    .update({
src/app/[locale]/app/projects/new/actions.ts:860:    .insert({
src/app/[locale]/app/projects/new/actions.ts:906:    .insert({

 succeeded in 416ms:
 750:   boardId: string,
 751:   attachmentId: string
 752: ): Promise<RemoveUrlResult> {
 753:   if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
 754: 
 755:   const supabase = await createSupabaseServer();
 756:   const {
 757:     data: { user },
 758:   } = await supabase.auth.getUser();
 759:   if (!user) return { ok: false, error: "unauthenticated" };
 760: 
 761:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
 762:   const { error: rpcErr } = await (supabase as any).rpc(
 763:     "remove_project_board_attachment",
 764:     {
 765:       p_board_id: boardId,
 766:       p_kind: "url",
 767:       p_attachment_id: attachmentId,
 768:     }
 769:   );
 770:   if (rpcErr) {
 771:     console.error("[removeUrlAttachmentAction] RPC error:", rpcErr);
 772:     return { ok: false, error: rpcErr.message };
 773:   }
 774: 
 775:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
 776:   await recomputeAndUpdateAssetIndex(supabase as any, boardId);
 777:   return { ok: true };
 778: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n -F '.from(\"project_boards\")' src; rg -n -F \".from('project_boards')\" src; rg -n -F 'project_boards' src/app src/lib src/components" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=0; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/actions.ts' | ForEach-Object { "'$i++; if ($i -ge 300 -and $i -le 450) { '"'{0,4}: {1}' -f "'$i, $_ } }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 421ms:
 300:     // If brief row is missing for an existing draft project we treat it as
 301:     // corrupt ??fall through and create a fresh draft. (DELETE the orphan
 302:     // first so the unique index does not block the new INSERT.)
 303:     const service = createSupabaseService();
 304:     await service.from("projects").delete().eq("id", existing.id);
 305:   }
 306: 
 307:   // 2. INSERT new draft. The unique index makes concurrent INSERTs from a
 308:   //    double-mounted wizard converge ??one wins, the other catches 23505
 309:   //    and re-SELECTs.
 310:   const fields = parsed.data.initial;
 311:   const insertPayload = {
 312:     workspace_id: membership.workspace_id,
 313:     created_by: user.id,
 314:     project_type: "direct_commission" as const,
 315:     status: "draft" as const,
 316:     intake_mode: "brief" as const,
 317:     title: fields.title,
 318:     brief: fields.description ?? null,
 319:     brand_id: fields.brand_id ?? null,
 320:     deliverable_types: fields.deliverable_types,
 321:     estimated_budget_range: fields.estimated_budget_range ?? null,
 322:     target_delivery_at: fields.target_delivery_at ?? null,
 323:   };
 324: 
 325:   const { data: project, error } = await supabase
 326:     .from("projects")
 327:     .insert(insertPayload)
 328:     .select("id, status")
 329:     .single();
 330: 
 331:   if (error || !project) {
 332:     if (error?.code === PG_UNIQUE_VIOLATION) {
 333:       // A concurrent ensureDraftProject won the race. Re-SELECT and return
 334:       // the surviving row.
 335:       const { data: winner } = await supabase
 336:         .from("projects")
 337:         .select("id")
 338:         .eq("workspace_id", membership.workspace_id)
 339:         .eq("created_by", user.id)
 340:         .eq("status", "draft")
 341:         .eq("intake_mode", "brief")
 342:         .limit(1)
 343:         .maybeSingle();
 344:       if (winner?.id) {
 345:         const bootstrap = await fetchDraftBootstrap(supabase, winner.id);
 346:         if (bootstrap) return { ok: true, data: bootstrap };
 347:       }
 348:     }
 349:     console.error("[ensureDraftProject] insert error:", error);
 350:     return { error: "db", message: error?.message ?? "insert failed" };
 351:   }
 352: 
 353:   // 3. Sibling project_briefs row. Same atomic-rollback pattern as
 354:   //    createProject ??if the sibling INSERT fails we roll back via service
 355:   //    role so the wizard can retry without an orphan blocking the unique
 356:   //    index.
 357:   const { error: briefErr } = await supabase
 358:     .from("project_briefs")
 359:     .insert({
 360:       project_id: project.id,
 361:       updated_by: user.id,
 362:     });
 363:   if (briefErr) {
 364:     console.error(
 365:       "[ensureDraftProject] brief insert failed (rolling back project):",
 366:       briefErr,
 367:     );
 368:     const service = createSupabaseService();
 369:     await service.from("projects").delete().eq("id", project.id);
 370:     return {
 371:       error: "db",
 372:       message: `brief insert failed: ${briefErr.message}`,
 373:     };
 374:   }
 375: 
 376:   const bootstrap = await fetchDraftBootstrap(supabase, project.id);
 377:   if (!bootstrap) {
 378:     return { error: "db", message: "bootstrap fetch after insert failed" };
 379:   }
 380: 
 381:   revalidatePath("/[locale]/app/projects", "page");
 382:   return { ok: true, data: bootstrap };
 383: }
 384: 
 385: export async function submitDraftProject(
 386:   input: unknown,
 387: ): Promise<SubmitDraftResult> {
 388:   const parsed = submitDraftInput.safeParse(input);
 389:   if (!parsed.success) {
 390:     return { error: "validation", issues: parsed.error.issues };
 391:   }
 392:   const { projectId, fields, intent } = parsed.data;
 393: 
 394:   const supabase = await createSupabaseServer();
 395:   const {
 396:     data: { user },
 397:   } = await supabase.auth.getUser();
 398:   if (!user) return { error: "unauthenticated" };
 399: 
 400:   // Confirm draft exists and is owned by caller. RLS already filters but
 401:   // an explicit check lets us return `forbidden` distinct from `not_found`.
 402:   const { data: target } = await supabase
 403:     .from("projects")
 404:     .select("id, status, created_by")
 405:     .eq("id", projectId)
 406:     .maybeSingle();
 407:   if (!target) return { error: "not_found" };
 408:   if (target.created_by !== user.id) return { error: "forbidden" };
 409: 
 410:   // Codex K-05 finding 2 (HIGH-B) ??restrict to status='draft'. Without
 411:   // this guard the wizard's submit path becomes a backdoor that demotes
 412:   // any project owned by the caller (submitted / in_production /
 413:   // delivered etc.) back to 'draft' or stomps on its fields, bypassing
 414:   // the transition matrix in projects/[id]/actions.ts.
 415:   if (target.status !== "draft") return { error: "forbidden" };
 416: 
 417:   const status = intent === "submit" ? "submitted" : "draft";
 418: 
 419:   const { data: updated, error } = await supabase
 420:     .from("projects")
 421:     .update({
 422:       title: fields.title,
 423:       brief: fields.description ?? null,
 424:       brand_id: fields.brand_id ?? null,
 425:       deliverable_types: fields.deliverable_types,
 426:       estimated_budget_range: fields.estimated_budget_range ?? null,
 427:       target_delivery_at: fields.target_delivery_at ?? null,
 428:       status,
 429:     })
 430:     .eq("id", projectId)
 431:     .eq("created_by", user.id)
 432:     .eq("status", "draft")
 433:     .select("id, status")
 434:     .single();
 435: 
 436:   if (error || !updated) {
 437:     console.error("[submitDraftProject] update error:", error);
 438:     return { error: "db", message: error?.message ?? "update failed" };
 439:   }
 440: 
 441:   revalidatePath("/[locale]/app/projects", "page");
 442:   revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
 443:   return {
 444:     ok: true,
 445:     id: updated.id,
 446:     status: updated.status as "draft" | "submitted",
 447:   };
 448: }
 449: 
 450: // =============================================================================

 succeeded in 543ms:
src/components\brief-board\editor.tsx:109:   * by the detail page (task_05) when no `project_boards` row of the new system
src/components\admin\asset-list-panel.tsx:6: * project_boards.asset_index (server-side computed via extractAssetIndex).
src/components\project-detail\board-tab.tsx:11:// - The board RLS itself enforces row-scope (project_boards policy).
src/components\project-detail\board-tab.tsx:52:    .from("project_boards")
src/components\project-detail\board-tab.tsx:125:  // (every wizard submit seeds a project_boards row). If it happens,
src/lib\supabase\database.types.ts:1240:            referencedRelation: "project_boards"
src/lib\supabase\database.types.ts:1252:      project_boards: {
src/lib\supabase\database.types.ts:1300:            foreignKeyName: "project_boards_locked_by_fkey"
src/lib\supabase\database.types.ts:1307:            foreignKeyName: "project_boards_project_id_fkey"
src/app\[locale]\app\projects\new\actions.ts:923:  // 3. Phase 3.1 — Seed the project_boards row via RPC.
src/app\[locale]\app\projects\[id]\board-actions.ts:12: *       updates project_boards.{document, asset_index, updated_at}.
src/app\[locale]\app\projects\[id]\board-actions.ts:19: *       project_boards.document and recomputes asset_index.
src/app\[locale]\app\projects\[id]\board-actions.ts:103:  // Wave C.5d sub_03f_5 F4: project_boards_update_client RLS scopes by
src/app\[locale]\app\projects\[id]\board-actions.ts:140:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:151:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:169:  // table-level UPDATE on project_boards and only re-grants
src/app\[locale]\app\projects\[id]\board-actions.ts:179:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:326:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:405:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:419:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:432:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:475:    .from("project_boards")
src/app\[locale]\app\projects\[id]\board-actions.ts:493:    .from("project_boards")
src/app\[locale]\app\admin\projects\page.tsx:16:  // Phase 3.1 task_07: extend SELECT to also pull project_boards.asset_index
src/app\[locale]\app\admin\projects\page.tsx:18:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
src/app\[locale]\app\admin\projects\page.tsx:33:      boards:project_boards(asset_index)
src/app\[locale]\app\admin\projects\page.tsx:45:    // Resolve asset count from project_boards.asset_index (preferred);
src/app\[locale]\app\admin\projects\[id]\page.tsx:3:// Reads project_boards.asset_index server-side and renders AssetListPanel.
src/app\[locale]\app\admin\projects\[id]\page.tsx:64:  // Fetch project_boards.asset_index (Phase 3.1)
src/app\[locale]\app\admin\projects\[id]\page.tsx:66:    .from("project_boards")

codex
## VERDICT: NEEDS-ATTENTION

F1: CLOSED — `actions.ts:693` now accepts `board-assets/`, matching wizard writes of `board-assets/<user>/<uuid>.pdf`, while unrelated prefixes still fail the schema regex.

F2: CLOSED — `add_project_board_pdf` now binds accepted prefixes to `board-assets/<auth.uid()>/`, `project-wizard/<auth.uid()>/`, or `project-board/<p_board_id>/`; null caller is rejected before prefix checks and UUID inputs do not introduce LIKE wildcards.

F3: REOPENED — `20260429124343_phase_3_1_k05_loop_1_fixes.sql:50` still leaves the older 3-arg `seed_project_board_from_wizard(uuid,jsonb,jsonb)` granted to `authenticated`, allowing caller-supplied `asset_index`; additionally `20260504010151...sql:120`/`:132` only validates arrays, but `:200`/`:201` will persist non-array `attached_pdfs`/`attached_urls` JSONB unvalidated. Drop/revoke the old overload and reject non-null non-array attachment JSON before the upsert.

F4: CLOSED — `board-actions.ts:108` selects the project before board lookup, `:136` returns `forbidden` before the service-role update when owner/yagi-admin/workspace-admin checks fail, and schema role values include `admin`/`member`, so the `admin` check matches.

F5: PARTIAL — `has_table_privilege`/`has_column_privilege` now catch effective grants and would catch the original table-level UPDATE bug, but the assertion comments mention `schema_version`, `source`, `project_id`, and `id` while not checking them. Add denied-column assertions for those columns too.

VERDICT: NEEDS-ATTENTION — do not apply migrations until findings are addressed.

Run log summary: F1/F2/F4 are closed, but F3 remains open via the old seed overload and non-array attachment bypass; F5 still has incomplete denied-column assertion coverage.
2026-05-03T16:20:23.636830Z ERROR codex_core::session: failed to record rollout items: thread 019deea2-2f3a-72b1-b215-cd8c3743c45b not found
tokens used
315,469
## VERDICT: NEEDS-ATTENTION

F1: CLOSED — `actions.ts:693` now accepts `board-assets/`, matching wizard writes of `board-assets/<user>/<uuid>.pdf`, while unrelated prefixes still fail the schema regex.

F2: CLOSED — `add_project_board_pdf` now binds accepted prefixes to `board-assets/<auth.uid()>/`, `project-wizard/<auth.uid()>/`, or `project-board/<p_board_id>/`; null caller is rejected before prefix checks and UUID inputs do not introduce LIKE wildcards.

F3: REOPENED — `20260429124343_phase_3_1_k05_loop_1_fixes.sql:50` still leaves the older 3-arg `seed_project_board_from_wizard(uuid,jsonb,jsonb)` granted to `authenticated`, allowing caller-supplied `asset_index`; additionally `20260504010151...sql:120`/`:132` only validates arrays, but `:200`/`:201` will persist non-array `attached_pdfs`/`attached_urls` JSONB unvalidated. Drop/revoke the old overload and reject non-null non-array attachment JSON before the upsert.

F4: CLOSED — `board-actions.ts:108` selects the project before board lookup, `:136` returns `forbidden` before the service-role update when owner/yagi-admin/workspace-admin checks fail, and schema role values include `admin`/`member`, so the `admin` check matches.

F5: PARTIAL — `has_table_privilege`/`has_column_privilege` now catch effective grants and would catch the original table-level UPDATE bug, but the assertion comments mention `schema_version`, `source`, `project_id`, and `id` while not checking them. Add denied-column assertions for those columns too.

VERDICT: NEEDS-ATTENTION — do not apply migrations until findings are addressed.

Run log summary: F1/F2/F4 are closed, but F3 remains open via the old seed overload and non-array attachment bypass; F5 still has incomplete denied-column assertion coverage.
