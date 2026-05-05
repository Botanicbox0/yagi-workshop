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

## FU-6-B-K06-F3-brief-tab-external-brand-emphasis

- **Trigger**: Read-only "외부 광고주 여부" row in project detail brief
  tab Stage 2 uses `font-medium text-foreground` for "예" — visually
  weaker than the adjacent `field_interested_in_twin` row which applies
  sage `text-[#71D083] font-medium` for the active state. yagi_admin
  scanning Stage 2 may not catch operational signal at first glance.
- **Risk**: LOW. Cosmetic emphasis; no functional impact. yagi_admin
  audience.
- **Action**: Align with twin row recipe — `text-[#71D083] font-semibold`
  when `has_external_brand_party = true`. Or use `font-semibold
  text-foreground` + thin sage left-border on active rows.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave B K06_B finding 3, MED).

## FU-6-B-K06-F4-shadcn-checkbox-migration

- **Trigger**: Step 3 toggle uses native `<input type="checkbox">` per
  twin-toggle precedent. Native checkbox renders with platform chrome
  (Windows blue / macOS blue) breaking the dark-friendly token system.
  Spec called for shadcn `<Checkbox>` (already in repo at
  `src/components/ui/checkbox.tsx`).
- **Risk**: LOW. Visual inconsistency only; no security/data issue.
- **Action**: Migrate BOTH checkboxes (twin + external-brand) to shadcn
  `<Checkbox>` in a single sweep so the form is internally consistent
  and platform-token compliant.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave B K06_B finding 4, MED).

## FU-6-B-K06-F5-ko-helper-brief-loanword

- **Trigger**: KO helper string `"(계약서 / brief 자료가 있다면 첨부 부탁
  드려요)"` embeds English "brief" mid-sentence. Hard Rule #4 forbids
  EN tracking on KO text; "brief" here is loanword usage but flips KO
  typographic register.
- **Risk**: LOW. Cosmetic register break; no functional issue.
- **Action**: Spec amendment first (PRODUCT-MASTER §M update) — replace
  "brief 자료" with "기획안" or "브리프 자료" (Hangul transliteration).
  Then update i18n value.
- **Owner**: yagi (spec-amendment) + builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave B K06_B finding 5, LOW).

## FU-6-B-twin-toggle-emerald-to-sage

- **Trigger**: Pre-existing twin toggle at briefing-canvas-step-3.tsx
  ~line 537 uses `bg-emerald-50 border-emerald-200` — same Hard Rule #1
  violation pattern Wave A K-06 F2 fixed (amber → sage) and Wave B
  K-06 F1 fixed (amber → sage). Surfaced during K-06 LOOP-2 audit but
  pre-existing (Phase 5 territory), so flagged here for follow-up
  rather than expanded Wave B scope.
- **Risk**: LOW. Cosmetic Hard Rule violation; no functional impact.
- **Action**: Replace `bg-emerald-50 border-emerald-200` → `bg-[#71D083]/10
  border-[#71D083]/50` (matching the post-Wave-B external-brand toggle
  recipe). Keep adjacent siblings visually consistent.
- **Owner**: builder.
- **Status**: deferred.
- **Registered**: 2026-05-05 (Phase 6 Wave B K06_B audit — incidental
  finding outside Wave B scope, MED).

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
