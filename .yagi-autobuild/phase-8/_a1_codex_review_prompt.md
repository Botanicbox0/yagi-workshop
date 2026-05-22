Codex K-05 adversarial review — Phase 8 Wave A.1 RLS migration.

Target files:
- supabase/migrations/20260521192144_phase_8_a1_guest_rls.sql (new — applied as 20260521192531 via Supabase MCP; both files identical content)
- supabase/migrations/20260521184035_phase_8_q7_guest_role_and_project_guests.sql (unchanged — prereq context for is_project_guest helper and project_guests schema)

Context:
Phase 8 Wave A.1 = guest scope RLS layer for §AJ Q#7 (PRODUCT-MASTER v1.11). Q#7 migration (20260521184035) already shipped `workspace_members.role='guest'` CHECK extension, `project_guests` N:M table, and `is_project_guest(project_id, user_id)` SECURITY DEFINER helper. A.1 adds:
- 4 policies on project_guests (SELECT-guest-self + SELECT-admin + INSERT-admin + DELETE-admin)
- 6 SELECT OR-branch policies on child tables (projects / project_threads / thread_messages / project_deliverables / preprod_boards / briefing_documents)

All policies PERMISSIVE except existing thread_messages.thread_msgs_hide_internal_from_clients (RESTRICTIVE, untouched). 기존 admin/member RLS 일체 비변경.

Row-level verify already passed: guest user with grant → 1 row visible from projects, ws_admin user → 1 row (regression), random user → 0 rows.

Already-deferred block (Codex must NOT re-raise these):

- **Wave B candidate** — thread_messages WRITE permission for guests. Reason: requires per-grant write-vs-read distinction in project_guests schema OR a separate permission column. Out of A.1 scope per kickoff §2.
- **Wave B candidate** — project_deliverables INSERT for guests. Same rationale.
- **Wave B candidate** — preprod_frame_comments / preprod_frame_reactions guest policies. Out of A.1's 6-table scope.
- **Wave B candidate** — briefing_documents Pattern C (legacy inline workspace_members JOIN + raw profiles.role check) → helper-style migration sweep. A.1 only adds a new helper-style guest_select policy alongside the existing legacy ones; the legacy policies stay untouched per kickoff §7 #1 forbid.
- **Wave B candidate** — child-table `deleted_at IS NULL` gate sweep. Existing ws_member behavior on child tables (project_threads / thread_messages / project_deliverables / preprod_boards / briefing_documents) does NOT check `projects.deleted_at`. Guest branches mirror this for consistency. Sweep deferred so it can be rolled out atomically across child tables.
- **A.2 scope** — `workspace_invitations.role='guest'` branch + invite UI flow.
- **A.2 scope** — Curated Project server action + UI surface.
- **A.3 scope** — Creator Hub.
- **FU-8** — `auth.uid()` → `(select auth.uid())` optimization. Phase 2.6 security sweep target; never globally applied. Codex skip.
- **FU-13** — FORCE ROW LEVEL SECURITY system-wide rollout. Phase 2.6 security sweep target; never globally applied. Codex skip.
- **Migration filename vs schema_migrations version drift** — local file `20260521192144_phase_8_a1_guest_rls.sql` applied as `20260521192531_phase_8_a1_guest_rls` (6m43s drift caused by Supabase MCP apply_migration regenerating timestamp at apply time). NOT a security issue; will be reconciled at G7 commit time. Codex skip.

Expected verdicts (per user's protocol):
- CLEAN → proceed to G7 commit
- MEDIUM_ONLY → Builder triage per CODEX_TRIAGE.md (MED-A inline fix, MED-B FU register, MED-C row-lock or escalate)
- HIGH → STOP, max 2 auto-fix loops

Severity framework:
- HIGH = exploitable, data loss, auth/RLS bypass — blocks apply
- MEDIUM = race, edge case, missing defense-in-depth — fix inline or defer per TRIAGE
- LOW = cosmetic, portability, style, SQLSTATE polish — batch fix

TRIAGE category hint (use suffix when applicable):
- HIGH-A grant exposure
- HIGH-B SECURITY DEFINER leak
- HIGH-C data loss
- MED-A structured error contract
- MED-B system-wide hardening defer
- MED-C race / concurrency edge
- LOW-A SQLSTATE semantics
- LOW-B NULL guard
- LOW-C optimizer polish
- LOW-D cosmetic

Focus areas (RLS-specific, 8 items):

1. **`is_project_guest` arg-order correctness.** Helper signature is `is_project_guest(p_project_id uuid, p_user_id uuid)`. Every USING clause must pass project_id first, user_id second. Confirm in all 10 new policies (especially the EXISTS-join policies on project_threads / thread_messages / project_deliverables which derive project_id from a parent table).
2. **Permissive OR chaining safety.** Existing `projects_read` is `(is_ws_member(uid, workspace_id) AND deleted_at IS NULL) OR is_yagi_admin(uid)`. New `projects_guest_select` adds permissive OR-branch `is_project_guest(id, uid) AND deleted_at IS NULL`. Confirm net effect = (ws_member AND not-deleted) OR yagi_admin OR (guest AND not-deleted) — no accidental widening of ws_member's deleted-row visibility, and no path that lets a guest see a project where they don't have a project_guests row.
3. **thread_messages RESTRICTIVE inheritance.** Existing restrictive policy `thread_msgs_hide_internal_from_clients` qual = `(visibility='shared' OR is_yagi_admin(uid) OR author_id=auth.uid())`. New permissive `thread_msgs_guest_select` adds project_guest-gated branch. Confirm: a guest with grant + non-author of an internal message → restrictive policy still blocks the row. A guest who somehow becomes author_id of an internal message (edge case) would see it via the restrictive's `author_id=self` branch — confirm whether this is acceptable given A.1 grants no INSERT to guests.
4. **project_guests admin policies — workspace_id derivation.** SELECT-admin / INSERT-admin / DELETE-admin all derive workspace_id via `EXISTS (SELECT 1 FROM projects p WHERE p.id = project_guests.project_id AND is_ws_admin(auth.uid(), p.workspace_id))`. Confirm: this correctly scopes to the workspace that *owns the project*, not the workspace of the guest's workspace_member (which could in principle differ if there's a future cross-workspace grant — though current schema doesn't allow it).
5. **project_guests_select_guest_self leak surface.** USING = `EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.id = workspace_member_id AND wm.user_id = auth.uid())`. Confirm: a user can only see their own grant rows, not other guests' grants. The check is on `wm.user_id = auth.uid()` AND `wm.id = workspace_member_id` (the FK target). No path for a guest to see other guests' grants on the same project.
6. **preprod_boards roles `{public}` safety.** New `preprod_boards_guest_select` uses `TO public` to match the existing 4 policies' convention. `auth.uid()` returns NULL for anon, so `is_project_guest(project_id, NULL)` should return false (the underlying function's WHERE wm.user_id = p_user_id would not match). Confirm no anon-leak path.
7. **WITH CHECK on `project_guests_insert_admin` matches USING semantics.** The INSERT policy uses WITH CHECK (USING is null for INSERT). Verify the WITH CHECK clause prevents an admin in workspace A from inserting a project_guests row whose project_id belongs to workspace B. The clause requires `is_ws_admin(auth.uid(), p.workspace_id)` where `p.id = project_guests.project_id` — this binds to the target project's workspace, so cross-workspace INSERT is blocked. Confirm.
8. **CASCADE side effects.** Q#7 migration defines `project_guests.workspace_member_id REFERENCES workspace_members(id) ON DELETE CASCADE` and `project_guests.project_id REFERENCES projects(id) ON DELETE CASCADE`. Confirm A.1 does not introduce any policy that would allow a guest to DELETE a workspace_members row (none — guests have no policies on workspace_members) or DELETE a project (covered by `projects_delete_yagi` which is yagi_admin only). Net: guests cannot trigger cascade revocation of other guests.

Additional items on your own initiative:
- `project_guests` lacks UPDATE policy entirely. Confirm this is intentional (granted_at/granted_by immutable per Q#7 schema comment) and PostgreSQL default-deny on UPDATE is sufficient (no UPDATE policy on RLS-enabled table → all UPDATE denied).
- `auth.uid()` direct usage vs `(select auth.uid())` — FU-8 already deferred system-wide. Codex skip per Already-deferred.
- All 10 new policies use `DROP POLICY IF EXISTS x; CREATE POLICY x ...` defensive pattern. Confirm idempotent re-application produces no privilege drift.
- Policy naming uniqueness — confirm none of the 10 new policy names collide with any existing public.* policy name (pg_policies pre-apply baseline already captured by Builder in G1: 17 policies on 6 child tables, none using `*_guest_select` or `project_guests_*` prefix).

Output format:
- Verdict: CLEAN / MEDIUM_ONLY / HIGH
- Findings as numbered list
- Each finding: severity prefix + TRIAGE suffix + one-line summary + evidence (file + line) + recommended fix
- End with "Focus area dispositions" block confirming each F1-F8 + A1-A4 was examined

Do not modify any files. Review only.
