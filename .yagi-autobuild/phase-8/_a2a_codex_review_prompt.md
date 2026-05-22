Codex K-05 adversarial review — Phase 8 Wave A.2.a (guest invitation + curated + WRITE).

Target files:
- supabase/migrations/20260522080234_phase_8_a2a_invite_guest_curated_write.sql (applied, MCP version; local file 20260522080120, ~1m drift — will rename G7)
- src/app/[locale]/app/projects/[id]/_actions/send-guest-invitation.ts (new server action)
- src/app/[locale]/auth/accept-guest/_actions/accept-guest-invitation.ts (new server action, RPC wrapper)
- src/app/[locale]/app/projects/_actions/create-curated-project.ts (new server action)

Prereq context (unchanged):
- supabase/migrations/20260521184035_phase_8_q7_guest_role_and_project_guests.sql (Q#7 LOCKED)
- supabase/migrations/20260521192531_phase_8_a1_guest_rls.sql (A.1 main)
- supabase/migrations/20260521193550_phase_8_a1_is_ws_member_role_filter.sql (A.1 hardening — is_ws_member role IN ('admin','member'))

Context — A.2.a delta:
- Schema: workspace_invitations.project_id (nullable FK) + CHECK (role=guest↔project_id NOT NULL) + partial INDEX; projects.project_type extended to include 'curated'; accept_guest_invitation(text) PL/pgSQL SECURITY DEFINER RPC.
- RLS: thread_msgs_guest_insert (author_id=auth.uid() + visibility='shared' + is_project_guest via thread JOIN); deliverables_guest_insert (submitted_by=auth.uid() + is_project_guest direct). Both PERMISSIVE INSERT, TO authenticated. is_project_guest ONLY (kickoff §7 #3: is_ws_member 사용 금지).
- Server actions: send-guest-invitation (workspace_admin OR yagi_admin app-layer auth → service-role INSERT invitation + Resend email with console.log fallback); accept-guest-invitation (thin RPC wrapper, structured error map); create-curated-project (workspace_admin OR yagi_admin app-layer + service-role INSERT projects with project_type='curated').
- Row-level verify (G4): 8/8 PASS. (c) guest INSERT shared msg granted thread → success / (d) internal msg → RLS denial / (e+) deliverable granted → success / (e-) deliverable non-granted → RLS denial / (g) admin regression → success / (f) admin guest-invite INSERT with project_id → success.

Already-deferred block (Codex must NOT re-raise these):

- **FU-A1-001 cross-workspace-grant invariant** — project_guests does not enforce wm.workspace_id = projects.workspace_id. send-guest-invitation server action validates project.workspace_id == workspaceId param as a defense-in-depth check, but the schema-level CHECK trigger remains a Wave B target. Rationale: schema-layer enforcement is the right durable fix and should batch with other invariant checks during Phase 8 Wave B. User pool <100 all-trusted; no exploitable path between now and Wave B.
- **FU-A1-002 briefing_documents Pattern C** — Wave B sweep. Not touched in A.2.a.
- **FU-A1-003 child-table deleted_at IS NULL gate sweep** — Wave B sweep. Not touched in A.2.a.
- **FU-A1-006 preprod_frame_comments / preprod_frame_reactions guest policies** — Wave B sweep.
- **FU-8** — `auth.uid()` → `(select auth.uid())` optimization. System-wide deferred.
- **FU-13** — FORCE ROW LEVEL SECURITY system-wide. System-wide deferred.
- **workspace_invitations.accepted_by audit column** — not in A.2.a scope; accepted_at timestamp only. Wave B audit candidate.
- **A.2.b scope** — all UI (Curated 생성 button, invite form, accept page).
- **A.3 scope** — Creator Hub.
- **Email/Resend integration redesign** — A.2.a reuses existing getResend() helper and EMAIL_FROM env; full template/i18n redesign deferred.
- **Existing token mechanism change** — A.2.a reuses crypto.randomBytes(24).toString('hex') (lib/onboarding/actions.ts:102 pattern).
- **Existing campaigns/projects relationship redesign** — A.2.a doesn't touch campaigns; curated_project uses projects table only.
- **projects_wizard_draft_uniq partial UNIQUE** — pre-existing constraint on (workspace_id, created_by) WHERE status='draft'. createCuratedProject inserts with status='draft' default; per-user-per-workspace single-draft constraint applies. UI (A.2.b) should handle "you already have a draft" UX. Not an A.2.a security issue.
- **Migration filename drift** — local 20260522080120 vs applied 20260522080234. Will rename at G7.

Expected verdicts:
- CLEAN → G6 SKIP → G7 commit
- MEDIUM_ONLY → Builder triage per CODEX_TRIAGE.md (MED-A inline fix, MED-B FU register, MED-C row-lock or escalate)
- HIGH → STOP, max 2 auto-fix loops

Severity / TRIAGE category framework: HIGH-A grant exposure / HIGH-B SECURITY DEFINER leak / HIGH-C data loss / MED-A structured error / MED-B system-wide defer / MED-C race / LOW-A SQLSTATE / LOW-B NULL guard / LOW-C optimizer / LOW-D cosmetic.

Focus areas (A.1 lesson 직접 반영 + A.2.a 신규 surface):

1. **Guest WRITE escalation — every new WRITE surface.** Confirm thread_msgs_guest_insert and deliverables_guest_insert use ONLY is_project_guest, never is_ws_member. Confirm no other policy in the migration touches WRITE paths. Confirm A.1 hardening (is_ws_member role IN ('admin','member')) is NOT reverted anywhere in this migration. Confirm: any path where a workspace_members.role='guest' row could trigger an existing ws_member-gated WRITE policy is closed.

2. **workspace_invitations token validation.** Token = 48-char hex (24 bytes randomBytes). Verify: (a) token column UNIQUE — yes, workspace_invitations_token_key. (b) acceptGuestInvitation RPC takes p_token, SELECT FOR UPDATE prevents concurrent double-accept race. (c) expires_at default 14 days; RPC explicitly checks expires_at < now(). (d) accepted_at non-null check prevents replay after success. (e) email match check (case-insensitive lower()) prevents token-stealing across email accounts. (f) RPC returns table type (workspace_id, project_id) — confirm no sensitive data leak in return.

3. **accept_guest_invitation 3-table transaction atomicity + rollback.** Verify: (a) entire function body is single PL/pgSQL block, RAISE EXCEPTION in any validation causes full rollback. (b) Idempotency: workspace_members INSERT uses ON CONFLICT (workspace_id, user_id) DO NOTHING — if user already has wm row (e.g., as 'admin' or 'member'), existing role PRESERVED (no downgrade to guest). (c) project_guests INSERT uses ON CONFLICT (workspace_member_id, project_id) DO NOTHING — idempotent re-invite. (d) v_wm_id SELECT after ON CONFLICT DO NOTHING correctly retrieves the (possibly pre-existing) wm row. (e) UPDATE accepted_at runs even if both INSERTs no-op'd — confirm semantics (idempotent re-accept marks accepted_at always = now()). (f) SECURITY DEFINER + SET search_path = public, pg_temp present. (g) EXECUTE grant to authenticated only.

4. **createCuratedProject permission boundary.** Server action validates: (i) auth.getUser() succeeds. (ii) user is yagi_admin OR workspace_admin for the workspaceId. (iii) Otherwise returns 'forbidden'. Confirm: no path where a 'member' role (which would pass is_ws_member) creates a curated project — app-layer narrows to 'admin' explicitly. Confirm: service-role INSERT after auth check is appropriate (RLS would allow 'member' to insert via projects_insert, but app-layer gate is tighter).

5. **CHECK constraint bypass scenarios.** workspace_invitations_role_project_id_check enforces (role='guest' ↔ project_id NOT NULL). Confirm: (a) cannot insert role='guest' with NULL project_id. (b) cannot insert role='admin'/'member' with non-NULL project_id. (c) UPDATE that changes role from 'admin' to 'guest' WITHOUT setting project_id should fail — verify behavior. (d) DELETE of the parent project cascades workspace_invitations row (ON DELETE CASCADE).

6. **Cross-workspace grant — A.2.a new surface check.** FU-A1-001 is deferred to Wave B for schema-level enforcement. Verify A.2.a does NOT introduce any NEW surface that widens the cross-workspace grant risk. Specifically: (a) send-guest-invitation validates project.workspace_id == workspaceId param (server-side check) — confirm this is correct defense-in-depth and reachable on every invite. (b) accept_guest_invitation RPC creates workspace_members and project_guests rows in the workspace bound to the invitation — confirm no path where an attacker-supplied token could create a wm/grant in a different workspace.

Additional items on your own initiative:
- Resend email failure path — `try { resend.emails.send(...) } catch { console.error }`. Email failure does NOT roll back the invitation INSERT. Confirm this is acceptable (admin can retrieve invite URL from the workspace_invitations row and share manually).
- projects_wizard_draft_uniq interaction with createCuratedProject — multiple curated drafts by same user per workspace blocked. Acceptable for A.2.a.
- ON CONFLICT DO NOTHING in INSERT INTO workspace_members during accept — if user was 'admin' or 'member', the v_wm_id SELECT retrieves the existing row. project_guests grant is added but is functionally a no-op (admin/member already have full access). No security issue, but check for unexpected UI implications (admin now has stale project_guests row).
- accept_guest_invitation does NOT update workspace_members.joined_at if the row pre-exists. Acceptable — the original join timestamp is more accurate.

Output format:
- Verdict: CLEAN / MEDIUM_ONLY / HIGH
- Findings as numbered list (each: severity prefix + TRIAGE suffix + one-line + evidence + recommended fix)
- End with "Focus area dispositions" block confirming F1-F6 + Additional items.

Do not modify any files. Review only.
