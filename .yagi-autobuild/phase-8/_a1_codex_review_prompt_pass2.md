Codex K-05 adversarial review — Phase 8 Wave A.1 RLS migration, pass 2 (post-hardening).

Target files:
- supabase/migrations/20260521192144_phase_8_a1_guest_rls.sql (unchanged from pass 1 — 10 policies for project_guests + 6 child tables)
- supabase/migrations/20260521195000_phase_8_a1_is_ws_member_role_filter.sql (new — hardening loop 1, tightens is_ws_member to exclude 'guest')
- supabase/migrations/20260521184035_phase_8_q7_guest_role_and_project_guests.sql (unchanged — prereq context)

Context — pass 1 → pass 2 delta:
- Pass 1 verdict: HIGH (1 HIGH-A + 1 MED-C).
- HIGH-A: is_ws_member had no role filter, so workspace_members.role='guest' bypassed A.1's read-only scope via legacy ALL-command policies (proj_threads_rw / deliverables_rw / thread_msgs_rw, all ws_member-gated).
- Loop 1 fix applied: 20260521195000 tightens is_ws_member to role IN ('admin', 'member'). Verified post-apply: is_ws_member(guest_user, their_ws) returns FALSE; is_ws_member(admin_user, their_ws) returns TRUE; is_ws_admin unchanged (already role='admin' only).
- MED-C: cross-workspace grant invariant not enforced — registered as FU per CODEX_TRIAGE.md MED-B/C cost rule (user pool <100 all-trusted → FU register + Phase 8 Wave B sweep). DO NOT re-raise.

Already-deferred block (Codex must NOT re-raise these):

- **Wave B sweep candidate (FU-A1-001 cross-workspace-grant-invariant)** — `project_guests` does not enforce `workspace_member.workspace_id = projects.workspace_id`. Helper `is_project_guest()` lacks this check; INSERT WITH CHECK only validates admin against the project's workspace. Rationale for deferral: schema-layer enforcement (CHECK trigger) is the right fix and should batch with other invariant checks during Phase 8 Wave B; piecemeal helper-only tightening is brittle. User pool currently <100 all-trusted; no exploitable path between now and Wave B.
- Wave B candidate — thread_messages WRITE permission for guests. Reason: requires per-grant write-vs-read distinction.
- Wave B candidate — project_deliverables INSERT for guests. Same rationale.
- Wave B candidate — preprod_frame_comments / preprod_frame_reactions guest policies.
- Wave B candidate — briefing_documents Pattern C → helper-style migration sweep.
- Wave B candidate — child-table `deleted_at IS NULL` gate sweep.
- A.2 scope — workspace_invitations.role='guest' branch + invite UI flow.
- A.2 scope — Curated Project server action + UI.
- A.3 scope — Creator Hub.
- FU-8 — `auth.uid()` → `(select auth.uid())` optimization. Phase 2.6 security sweep target.
- FU-13 — FORCE ROW LEVEL SECURITY system-wide rollout. Phase 2.6 security sweep target.
- Migration filename vs schema_migrations version drift — A.1 local file `20260521192144_phase_8_a1_guest_rls.sql` applied as `20260521192531_phase_8_a1_guest_rls` (6m43s MCP timestamp regen). Reconciled at G7 commit.

Expected verdicts:
- CLEAN → G6 SKIP → G7 commit
- MEDIUM_ONLY → Builder triage per CODEX_TRIAGE.md
- HIGH → STOP, max 1 more auto-fix loop remaining (loop 2 of 2)

Severity / TRIAGE framework identical to pass 1.

Focus areas — pass 2 (post-hardening verification):

1. **is_ws_member role-filter completeness.** New definition: `role IN ('admin', 'member')`. Confirm: (a) no role string in workspace_members.role CHECK constraint (currently 'admin' / 'member' / 'guest') leaks past this filter; (b) future role additions would need explicit inclusion; (c) the SECURITY DEFINER + SET search_path = public preserved correctly across CREATE OR REPLACE; (d) the function comment accurately reflects the new behavior.
2. **Net effect on legacy policies.** Existing policies calling is_ws_member: projects_read, projects_insert, projects_update, proj_threads_rw, thread_msgs_rw, thread_messages_insert, deliverables_rw, preprod_boards (4 policies), briefing_documents (none — Pattern C inline). Confirm: every admin/member access path still works as before; only guest's accidental escalation is closed.
3. **Guest read path still works post-hardening.** A.1's project_guests_select / projects_guest_select / proj_threads_guest_select / etc. use is_project_guest (unchanged), not is_ws_member. Confirm: guests can still SELECT granted projects/threads/messages/deliverables/preprod_boards/briefing_documents. Hardening did not accidentally close A.1's intended read paths.
4. **Combined RLS path for guest INSERT on project_threads.** Before hardening: is_ws_member(guest_user, ws) = true → proj_threads_rw permissive ALL grants INSERT. After hardening: is_ws_member returns false → proj_threads_rw denies. A.1 added no guest INSERT policy. Net: guest INSERT on project_threads = DENIED. Same logic for thread_messages, project_deliverables. Confirm.
5. **WITH CHECK policy semantics for legacy admin/member operations.** projects_insert WITH CHECK uses is_ws_member OR is_yagi_admin. Post-hardening: admin/member still pass; guest cannot create project (was accidentally permitted before). Confirm no regression for legitimate admin/member project creation.
6. **Idempotency of the CREATE OR REPLACE.** Re-running the hardening migration should produce no privilege drift. The function uses SECURITY DEFINER + SET search_path = public. Confirm grants on the function (typically to public or authenticated) are preserved through CREATE OR REPLACE per Postgres semantics.
7. **No new HIGH path introduced by tightening.** Tightening is by definition narrower. Confirm no admin/member loses legitimate access. Confirm no path where a previously-blocked operation now becomes permitted.

Additional items on your own initiative:
- Comment/documentation drift — confirm the new is_ws_member comment matches behavior.
- Any other helper functions in public.* that should similarly exclude 'guest' (e.g., a hypothetical is_ws_authoring, is_ws_writer) — flag if present.

Output format:
- Verdict: CLEAN / MEDIUM_ONLY / HIGH
- Findings as numbered list (each: severity prefix + TRIAGE suffix + one-line + evidence + fix)
- End with "Focus area dispositions" block confirming F1-F7 + A1-A2.

Do not modify any files. Review only.
