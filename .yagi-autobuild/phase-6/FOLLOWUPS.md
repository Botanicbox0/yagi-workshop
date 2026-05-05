# Phase 6 — Follow-ups

Deferred items registered during Phase 6 Wave A K-05 LOOP-1 + K-06
review. Inline-fixed items (K-05 F1-F4 HIGH-B/MED-A + K-06 F1-F3 HIGH)
are NOT in this list — they shipped with the hardening migration.

Format mirrors Phase 2.8.1 FOLLOWUPS.md (Trigger / Risk / Action /
Owner / Status / Registered).

---

## FU-6-A-K06-F4-add-new-workspace-disabled-affordance

- **Trigger**: Workspace switcher's `+ 새 워크스페이스 만들기` item is
  rendered with `disabled` + `opacity-60`. Looks interactive but does
  nothing on click. yagi_admin discovers it once, gets no feedback,
  loses trust in the dropdown.
- **Risk**: LOW. Affects only yagi_admin (1-2 humans). No security
  surface. Cosmetic UX.
- **Action**: Either (a) wire to `/admin/workspaces/new` route once
  Phase 7 lands the admin-create-workspace flow, or (b) replace
  `DropdownMenuItem` with a non-interactive `DropdownMenuLabel` styled
  as a footer hint with "곧 제공" copy until Phase 7.
- **Owner**: builder (Phase 7 candidate).
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 4, MED).

## FU-6-A-K06-F5-onboarding-already-complete-toast

- **Trigger**: `/[locale]/onboarding/artist/page.tsx` silently
  redirects to `/app/projects` when `instagram_handle` is already set.
  An Artist who clicks a stale invite link or revisits the page sees
  no narration; the page just disappears.
- **Risk**: LOW. Edge case (re-visit after onboarding). No security
  impact.
- **Action**: Add a Sonner toast `"이미 온보딩을 완료하셨어요. 프로젝트로
  이동합니다."` (KO) / `"You're already onboarded — heading to projects."`
  (EN) before the `redirect()` in page.tsx. Cookie/flash on next page
  load.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 5, MED).

## FU-6-A-K06-F6-admin-table-tonality

- **Trigger**: `/admin/artists` table uses `rounded-lg` (8px) wrapper
  + `bg-muted/30` thead. yagi-design-system v1.0 specifies 24px card
  radius and rejects generic shadcn defaults that don't map to the
  binding tokens.
- **Risk**: LOW. Cosmetic. yagi_admin only.
- **Action**: Lift wrapper to `rounded-3xl` (24px); replace
  `bg-muted/30` thead with no background; let typography do the work.
  Borderless list pattern with `border-white/[0.06]` row dividers also
  acceptable.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 6, MED).

## FU-6-A-K06-F7-instagram-input-localize

- **Trigger**: Onboarding form Instagram input has English placeholder
  `"@your_handle"` in the KO-default Artist surface. The leading `@` in
  the placeholder is also ambiguous — Artist may include the @ in
  input, schema strips it server-side, but UX-wise an Input prefix
  slot would be clearer.
- **Risk**: LOW. UX polish; no security or data integrity issue.
- **Action**: (a) Localize placeholder via t function: KO `"예:
  yagi_workshop"`, EN `"e.g. yagi_workshop"`. (b) Render `@` as a
  non-editable Input prefix slot using shadcn Input + leading addon.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 7, MED).

## FU-6-A-K06-F8-admin-invite-confirmation-highlight

- **Trigger**: After successful invite, the admin section calls
  `router.refresh()` and closes the form. Only feedback is a Sonner
  toast — no scroll-to-new-row, no row highlight. For an admin tool
  where confirmation matters (an invite email was sent to a real
  human), the new row should be visually called out for ~2s.
- **Risk**: LOW. Cosmetic confirmation polish.
- **Action**: Pass new artist's workspace_id back through the action
  result; store in local state on `InviteArtistSection`; apply
  `bg-accent/5` ring to matching `<tr>` for 2-3s after refresh.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 8, MED).

## FU-6-A-K06-F9-no-workspace-typo

- **Trigger**: EN `workspace.no_workspace = "No workshop"` (pre-
  existing typo, surfaced by Wave A switcher's increased prominence).
- **Risk**: LOW. Cosmetic typo.
- **Action**: Change EN value to `"No workspace"` in messages/en.json.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 9, LOW).

## FU-6-A-K06-F10-admin-page-max-width

- **Trigger**: `/admin/artists` page wrapper caps at `max-w-5xl`
  (~1024px). 5-column table reads OK on 1280px monitors but feels
  narrow on 1440+. yagi-design-system favors editorial whitespace,
  but admin tools can stretch wider.
- **Risk**: LOW. Cosmetic only.
- **Action**: `max-w-6xl` or `max-w-screen-xl`, or remove the cap
  and let `px-10` handle gutters.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-06 finding 10, LOW).

## FU-6-B2-K05-F4-projects-update-rls-client-branch

- **Trigger**: Phase 3.0 migration (20260427164421) added a client
  creator branch to `projects_update` policy (client: `auth.uid() =
  created_by AND status = 'draft' AND deleted_at IS NULL`). This branch
  was subsequently overwritten by Phase 2.8.2 soft-delete migration
  (20260428000000) and hardening (20260428030000). The effective policy
  has only `ws_admin` and `yagi_admin` branches.
- **Risk**: LOW in practice. All project creators are `ws_admin` of
  their own workspace (bootstrap_workspace grants workspace_admin on
  creation). The practical client autosave path is unaffected because
  creators are ws_admins. Risk surfaces only if a ws_member (not admin)
  creates a project — currently blocked by projects_insert RLS anyway.
- **Action**: Re-add client creator branch in next projects RLS
  migration to make the intent explicit and future-proof for
  Member-created projects. Pattern: `(auth.uid() = created_by AND
  status = 'draft' AND deleted_at IS NULL)`.
- **Owner**: builder (Phase 7 candidate, pre-Member-role expansion).
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave B.2 K-05 LOOP-1 finding 4,
  MED-B).

## FU-6-A-orphan-artist-workspace-gc

- **Trigger**: After auth user delete (now ON DELETE CASCADE on
  artist_profile.owner_user_id per K-05 LOOP-2 F1 fix), the parent
  `workspaces` row with kind='artist' persists with 0 members and 0
  artist_profile. Tombstone row that no one can access.
- **Risk**: LOW. Edge case (Artist account deletion is rare). No
  security exposure (RLS denies all reads on a workspace with 0
  members + 0 profile). Storage waste only.
- **Action**: Phase 7+ admin tooling — sweep `workspaces WHERE
  kind='artist' AND NOT EXISTS (workspace_members) AND NOT EXISTS
  (artist_profile)` and soft-delete or hard-delete depending on
  audit retention policy.
- **Owner**: builder (Phase 7 candidate).
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave A K-05 LOOP-2 F1
  hardening — surfaced during cascade decision).
