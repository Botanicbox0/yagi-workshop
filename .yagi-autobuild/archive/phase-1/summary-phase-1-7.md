# Phase 1.7 — YAGI internal team chat — SUMMARY

**Status:** ✅ Shipped clean (Codex K-05 0 CRITICAL + 3 HIGH all addressed)
**Date:** 2026-04-22
**Build:** `pnpm build` exit 0; team route 15.2 kB / first-load 228 kB

## What shipped

A YAGI-internal-only Slack-style team chat at `/[locale]/app/team` with
channel sidebar, channel view, threaded message composer, attachments
(image/video/PDF/file with caps), Realtime updates, admin channel CRUD,
unread indicators, and full RLS gating that ensures non-YAGI workspace
members cannot see, send, or even subscribe to channel data.

### Wave inventory

- **Wave A — i18n + migration + types**
  - 53 base `team_chat.*` keys (ko + en), expanded to 74 keys by Wave D
  - Migration `20260422010000_phase_1_7_team_channels.sql`:
    - 3 tables (`team_channels`, `team_channel_messages`,
      `team_channel_message_attachments`)
    - RLS gates on `is_yagi_internal_ws(workspace_id)` + member checks
      using **explicit `auth.uid()`** form (not parameterless helpers)
    - `tg_set_updated_at()` trigger
    - `team-channel-attachments` storage bucket + path-prefix RLS via
      `(storage.foldername(name))[1]::uuid`
    - 3 seed channels with Korean names: 일반 / 아이디어 / 비즈니스
  - `database.types.ts` regenerated

- **Wave B — channel sidebar + view shells (parallel)**
  - `src/components/team/team-chat-layout.tsx` — 2-column server layout
  - `src/components/team/channel-sidebar.tsx` — Client; channel list,
    selected highlight, unread dot, archived section
  - `src/components/team/channel-view.tsx` — Client; message list with
    grouped consecutive-author rendering, near-bottom auto-scroll
  - `src/app/[locale]/app/team/page.tsx` — Server; redirect to
    `/team/general`
  - `src/app/[locale]/app/team/[slug]/page.tsx` — Server; channel page

- **Wave C — composer + attachments**
  - `src/components/team/message-composer.tsx` — Client; textarea
    auto-grow, drag-drop overlay, IME-safe Enter
    (`e.nativeEvent.isComposing`), 5-attachment cap, signed-URL upload
  - `src/lib/team-channels/attachment-caps.ts` — pure constants:
    image 10 MB, video 500 MB, pdf 25 MB, file 50 MB; mime allow-list
  - `src/lib/team-channels/attachments.ts` — `requestUploadUrls`
    Server Action using service-role client, validates supplied
    `workspaceId` matches the channel's real `workspace_id` (read under
    user RLS, so non-YAGI channels return `channel_not_found`)
  - `sendMessage` action with path-prefix verification

- **Wave D — Realtime + admin CRUD + edit/delete + E2E**
  - Channel-list subscription with `channel_id=in.(<csv>)` filter
  - Per-channel subscription with `channel_id=eq.<uuid>` for
    INSERT / UPDATE / DELETE events
  - `tg_set_updated_at` migration for `team_channel_messages`
  - `profiles.team_chat_last_seen jsonb` for unread tracking
  - `markChannelSeen`, `createChannel`, `updateChannel`,
    `archiveChannel`, `unarchiveChannel`, `deleteMessage`,
    `editMessage`, `getMessage` Server Actions
  - `new-channel-dialog.tsx`, `edit-channel-dialog.tsx`,
    `channel-members-dialog.tsx`
  - `.yagi-autobuild/e2e-phase-1-7.md` runbook
  - **Realtime publication migration** —
    `20260422060500_phase_1_7_team_chat_realtime.sql` adds
    `team_channel_messages` + `team_channel_message_attachments` to
    `supabase_realtime`. Without this the postgres_changes
    subscriptions would have silently received zero events. Caught
    by Wave D agent.

- **Wave E — Codex K-05 review + HIGH fixups**

### Codex K-05 findings + resolutions

**0 CRITICAL.** **3 HIGH** — all addressed in this wave:

| # | Issue | Fix |
|---|---|---|
| HIGH-1 | `deleteMessage` was a silent no-op because no DELETE policy existed on `team_channel_messages` — RLS denied all deletes; UI showed success toast but row remained | Added `team_channel_messages_delete` policy (`author_id = auth.uid() OR is_yagi_admin(auth.uid())`) in `20260422070000_phase_1_7_team_chat_fixups.sql` |
| HIGH-2 | `team_channel_messages_update` had no `WITH CHECK` — author could browser-call `.update({ author_id: '<victim>', channel_id: '<other>' })` to impersonate / move messages | Re-created policy with `with check (author_id = auth.uid())` to lock author identity on update |
| HIGH-3 | Archived channels were clickable in sidebar but `getChannelBySlug` filtered `is_archived = false`, so target page 404'd | Removed `is_archived = false` filter from `getChannelBySlug` (queries.ts); archived banner + composer hide were already wired in `channel-view.tsx` |

**6 MEDIUM** + **8 LOW** noted but do NOT block ship per autopilot rules.
See deferred follow-ups below.

### CRITICAL — none. RLS leak surface clean

Cross-workspace leak vectors traced and all blocked:
- `team_channels.SELECT` requires `is_yagi_internal_ws(workspace_id)`
  AND member check — non-YAGI clients get 0 rows
- `team_channel_messages.SELECT` same path — 0 rows
- Storage `tc-attachments read`/`write` policies gate on
  `is_yagi_internal_ws((storage.foldername(name))[1]::uuid)` AND
  `is_ws_member(auth.uid(), that uuid)` — a client crafting a path
  prefixed with the YAGI workspace id still fails because they are
  not a member
- `requestUploadUrls` validates supplied `workspaceId` against the
  channel's real `workspace_id` (read under user RLS)
- Realtime `postgres_changes` respects RLS via the SELECT policy

## Routes registered (Phase 1.7 contribution)

- `ƒ /[locale]/app/team` — redirect-to-general
- `ƒ /[locale]/app/team/[slug]` — channel page (15.2 kB)

## File-level deltas

**Created:**
- `supabase/migrations/20260422010000_phase_1_7_team_channels.sql`
- `supabase/migrations/20260422060000_phase_1_7_team_chat_last_seen.sql`
- `supabase/migrations/20260422060500_phase_1_7_team_chat_realtime.sql`
- `supabase/migrations/20260422070000_phase_1_7_team_chat_fixups.sql`
- `src/lib/team-channels/queries.ts`
- `src/lib/team-channels/attachment-caps.ts`
- `src/lib/team-channels/attachments.ts`
- `src/app/[locale]/app/team/page.tsx`
- `src/app/[locale]/app/team/[slug]/page.tsx`
- `src/app/[locale]/app/team/[slug]/actions.ts`
- `src/components/team/team-chat-layout.tsx`
- `src/components/team/channel-sidebar.tsx`
- `src/components/team/channel-view.tsx`
- `src/components/team/message-composer.tsx`
- `src/components/team/new-channel-dialog.tsx`
- `src/components/team/edit-channel-dialog.tsx`
- `src/components/team/channel-members-dialog.tsx`
- `.yagi-autobuild/e2e-phase-1-7.md`

**Modified:**
- `src/components/app/sidebar-nav.tsx` — added Team Chat nav item
  (gated by `isYagiInternalMember` prop)
- `src/components/app/sidebar.tsx` — derives `isYagiInternalMember`
  from `context.workspaces.slug === 'yagi-internal'`
- `messages/{ko,en}.json` — +74 keys under `team_chat.*` plus dialog
  strings
- `src/lib/supabase/database.types.ts` — regenerated

## Deferred follow-ups (Phase 1.7 MEDIUM/LOW)

These are noted in Codex K-05 output but did NOT block ship:

1. **Sidebar Realtime cross-tab** — if user creates a channel in another
   tab, this tab's subscription doesn't pick it up until refresh.
   Acceptable for v1.
2. **`success_channel_unarchived` toast key missing** — currently reuses
   `success_channel_created`. Add dedicated key.
3. **`markChannelSeen` returns `{ ok: true }` even on auth failure** —
   silent no-op pattern is a foot-gun if signature reused.
4. **Orphan uploads** — bytes in storage with no DB row if user uploads
   then navigates away. No cleanup job.
5. **Unused i18n keys** — `team_chat.message_load_more`,
   `error_load_failed`, `nav_label`. Dead strings.
6. **`channel-view.tsx:169` ref-based dedupe** — `messagesRef` declared
   after the subscription effect; first-render fast-path is dead. Inner
   `prev.some(...)` dedupe still prevents duplicates.
7. **Realtime status badge** — color-only, no `aria-live`.
8. **Composer textarea** — `placeholder` only, no `aria-label`.
9. **`<video>` `aria-label`** — could include filename.
10. **Signed URL TTL inconsistency** — 1h here vs 2h elsewhere.
11. **`sendMessage` path-prefix check** — uses `startsWith()` without
    rejecting `..` segments (Supabase `createSignedUploadUrl`
    normalizes, but defense-in-depth).
12. **`new-channel-dialog` toast collapse** — `forbidden` /
    `auth_required` show same generic message.
13. **`team_channels` UPDATE policy** — also lacks WITH CHECK
    (lower-impact than HIGH #2).
14. **`getLatestMessageAtByChannel` per-channel queries** — fine at
    N=3, scales poorly.

## Mock-mode / production flip

N/A. Phase 1.7 is YAGI-internal only and not mock-gated.

## What's next

- **Phase 1.8** — Notifications (digest + badges) — starting now
- **Phase 1.9** — Deliverable Showcase Mode

## Cross-phase deferred items NOT addressed in 1.7

Tracked in task #24:
- Phase 1.2.5 + 1.3 + 1.4 deferred Codex K-05 items
- Phase 1.5 deferred items
- Phase 1.6 deferred items (OG cache, Content Collections deprecation,
  robots metadata, dead i18n keys, year-heading contrast, Atom feed
  discoverability, MDX external links, OG quote-theme split, OG
  fallback locale, locale toggle 404 on missing twin,
  `translation_slug` unwired, dev-port drift, MDX code highlighting)
- **CRITICAL:** missing migrations for Phases 1.1 / 1.2 / 1.2.5 / 1.3 /
  1.4 in `supabase/migrations/` (only Phase 1.0 + 1.5 + 1.6 + 1.7 exist
  on disk; the rest are applied to the project but not in repo)
