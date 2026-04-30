# task_01 -- DB schema migration result

**Status**: completed (pending Wave D apply)
**Commit SHA**: 02f0628e7f54844aef4d732ff26a44ca73087e1e
**Files**:
- supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql (NEW, 110 lines)

## SQL summary

1. **workspaces.kind**: ADD COLUMN text NOT NULL DEFAULT 'brand' CHECK IN ('brand','artist','yagi_admin') + UPDATE backfill + idx_workspaces_kind index
2. **projects.twin_intent**: ADD COLUMN text NOT NULL DEFAULT 'undecided' CHECK IN ('undecided','specific_in_mind','no_twin')
3. **projects.kind enum expansion**: DROP CONSTRAINT IF EXISTS projects_kind_check + ADD CONSTRAINT with 6-value CHECK
4. **project_licenses**: new table (13 columns), 2 indexes, RLS ENABLE, 3 policies (select_admin, select_owner, write_admin), updated_at trigger

## Dependencies verified

- **profiles.role column**: EXISTS -- confirmed in database.types.ts line 1170 (`role: string | null`)
- **update_updated_at_column() function (public schema)**: DOES NOT EXIST in public schema. The public equivalent used across this codebase is `public.tg_touch_updated_at()` (defined in baseline at line 304). KICKOFF spec references `update_updated_at_column()` but this is a spec error -- the migration file uses `public.tg_touch_updated_at()` instead. This deviation is intentional and safe; noted here for Codex K-05 review.
- **projects.kind column existence**: EXISTS -- confirmed in database.types.ts line 1722 (`kind: string`). DROP CONSTRAINT IF EXISTS + ADD CONSTRAINT is safe.
- **workspaces.kind column**: DOES NOT EXIST in current schema (not in database.types.ts Row at lines 2550-2565). ADD COLUMN is correct.

## Self-verify

- DROP CONSTRAINT IF EXISTS is idempotent: no error if constraint absent.
- idx_workspaces_kind, idx_project_licenses_project, idx_project_licenses_status -- no name conflicts with existing migrations (grepped all .sql files).
- profiles.role = 'yagi_admin' check in RLS policies aligns with is_yagi_admin helper pattern used in prior migrations.
- NOT NULL DEFAULT columns (kind, twin_intent) on ALTER TABLE backfill all existing rows automatically; explicit UPDATE on workspaces.kind is a no-op after ADD COLUMN but matches KICKOFF spec exactly.

## Issues / blockers

### BLOCKER (potential -- Wave D apply): projects.owner_id does not exist

The KICKOFF spec `project_licenses_select_owner` policy references `projects.owner_id`:
```sql
SELECT id FROM projects WHERE owner_id = auth.uid()
```
But `projects` table has NO `owner_id` column. Current ownership columns are `created_by` (uuid) and `workspace_id`.

**Impact**: the migration file copies the spec verbatim as instructed. At Wave D apply time, this policy will FAIL unless:
- (a) `owner_id` column is added to `projects` before this migration, OR
- (b) the policy is updated to use `created_by = auth.uid()` or a workspace membership check

**Recommendation for Builder / yagi**: decide correct ownership semantic (project creator vs. workspace member). Most likely fix is `WHERE created_by = auth.uid()`. Update KICKOFF spec before Wave D apply.

### NOTE: update_updated_at_column() -- resolved inline

KICKOFF spec trigger uses `update_updated_at_column()` (matches Supabase boilerplate docs) but this codebase uses `public.tg_touch_updated_at()`. Migration file uses the correct codebase function. Not a blocker.

## Acceptance (KICKOFF §task_01) mapping

- [x] workspaces.kind column + 'brand' default
- [x] CHECK constraint (3 values)
- [x] INDEX idx_workspaces_kind
- [x] projects.twin_intent column + 'undecided' default
- [x] CHECK constraint (3 values)
- [x] projects.kind 6-value CHECK
- [x] project_licenses table + 13 columns
- [x] 2 indexes
- [x] 3 RLS policies
- [x] updated_at trigger

## Wave D apply verify (reference -- not applied in this task)

- supabase db push --linked
- psql: \d workspaces (confirm kind column + constraint + index)
- psql: \d projects (confirm twin_intent + updated projects_kind_check)
- psql: \d project_licenses (confirm all 13 columns + indexes + trigger)
- psql: SELECT policyname FROM pg_policies WHERE tablename='project_licenses';
- Smoke test: anon SELECT on project_licenses (expect RLS block), yagi_admin SELECT (expect rows)
- MANUAL: UPDATE workspaces SET kind='yagi_admin' WHERE id='<yagi_internal_workspace_id>' if yagi_admin workspace exists
