# YAGI Workshop — Phase 1.3 Summary

**Date:** 2026-04-22
**Status:** Complete (autopilot mode — kill-switches off)
**Build:** clean (24 routes, 0 errors, 0 warnings)
**Codex K-05:** 3 HIGH fixed inline, 4 MEDIUM + 1 LOW deferred to follow-ups (task #24)

## Wave A — i18n + OAuth util + ICS builder (parallel)

- **i18n** (`messages/{ko,en}.json`): 40 keys added in new `meetings` namespace + `nav.meetings`. Both locales balanced.
- **`src/lib/google/auth.ts`**: `OAuth2Client` singleton pattern, `getGoogleClient()` returns null when env vars unset (no throw), `getAccessToken()` refreshes via `google-auth-library@10.6.2`.
- **`src/lib/calendar/ics.ts`**: Hand-rolled RFC 5545 builder. CRLF line endings, `escapeText` (correct order: `\` → `;` → `,` → `\n`), `toIcsUtc` UTC formatter, UTF-8 byte-aware `foldLine` (75-octet boundary with leading-space continuation). Supports METHOD:REQUEST and METHOD:CANCEL.

## Wave B — Calendar wrapper + health route + email helper (parallel)

- **`src/lib/google/calendar.ts`**: `createCalendarEvent` POSTs to `/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all` with `conferenceData.createRequest.hangoutsMeet`, 10s `AbortController` timeout, `randomUUID()` requestId. Extracts meet_link from `hangoutLink` or `entryPoints[]`. `cancelCalendarEvent` DELETE treats 200/204/410 as success.
- **`src/app/api/health/google/route.ts`**: GET-only, `yagi_admin` gate via `user_roles` query (`workspace_id IS NULL AND role='yagi_admin'`). Returns 401/403/200 with `{auth_configured, token_refresh_ok, last_checked_at}`.
- **`src/lib/email/meeting-template.ts`** + **`src/lib/email/send-meeting.ts`**: Bilingual HTML + text renderer with dark theme tokens (#0A0A0A/#111111/#FAFAFA/#C8FF8C/#222222/#666666). `Intl.DateTimeFormat` in `Asia/Seoul`. Inline markdown → HTML with escape-first XSS guard (sanity-checked: `<script>` → `&lt;script&gt;`). Three exports: `sendIcsInvite` (builds ICS internally with method=REQUEST), `sendCancellation` (method=CANCEL), `sendSummary` (no ICS). Reuses Phase 1.2 `getResend()` + `EMAIL_FROM` from `src/lib/resend.ts`.

## Wave C — migration + Server Action (serial)

- **Migration `phase_1_3_meetings_20260422`**: `meetings` table (status enum, calendar_sync_status enum, updated_at trigger via `tg_touch_updated_at()`), `meeting_attendees` table (unique `(meeting_id, email)`). RLS: `is_ws_member(uid, wsid) OR is_yagi_admin(uid)` for select, `is_ws_admin OR is_yagi_admin` for insert/update.
- `database.types.ts` regenerated.
- **`src/app/[locale]/app/meetings/actions.ts`** `createMeeting`: Zod validation → auth → fetch project → is_ws_admin check → insert meeting row (pending) → insert attendees → try Google Calendar → on failure try ICS email → update status to synced/fallback_ics/failed. Never throws. Primary meeting row commit protected.

## Wave D — list/form + admin dashboard (parallel)

- **`/app/meetings`** list page (RLS-scoped, filters by status/project, Intl.DateTimeFormat in Asia/Seoul).
- **`/app/meetings/new`** form (RHF + Zod, date+time → `YYYY-MM-DDTHH:MM:00+09:00`, duration radio 30/45/60/90, workspace-member checkboxes + custom attendee rows, toast variants per syncStatus).
- **`/app/admin`** dashboard Server Component (yagi_admin gated via `notFound()`): Google integration pill, upcoming meetings (next 7d), meetings needing attention (failed OR fallback_ics > 1h).
- **`src/components/admin/google-integration-status.tsx`**: Client Component, fetches `/api/health/google` on mount, renders green/amber/red pill.
- Sidebar nav: `meetings` item added (projects → meetings → storyboards), admin link repointed `/app/admin/projects` → `/app/admin`.
- `messages/{ko,en}.json`: `admin` namespace extended with 14 new keys (merged into existing 7 keys).

## Wave E — meeting detail + summary editor + cancel + retry

- **`/app/meetings/[id]`** detail page: breadcrumb, status + sync badges, `MeetingActionsMenu` (Copy Meet link, Edit summary, Send summary, Mark completed, Retry sync, Cancel), details/attendees two-column layout, cancellation banner when cancelled.
- Five new Server Actions in `actions.ts`: `saveMeetingSummary`, `sendMeetingSummary`, `cancelMeeting` (fire-and-forget Google delete + cancellation email, DB update authoritative), `markMeetingCompleted` (scheduled|in_progress → completed only), `retryCalendarSync`.
- `messages/{ko,en}.json`: `meetings` namespace extended with 26 new keys.

## Wave F — Codex K-05 + final build

- `pnpm build` clean (24 routes, 0 errors, 0 warnings).
- Codex `gpt-5.4 high reasoning` adversarial review against the 6 focus areas in `_codex_review_1_3_prompt.txt`.

### Findings

**HIGH (3) — all fixed inline**

1. **`src/lib/google/auth.ts:24`** — Raw `GaxiosError` logged on refresh failure included refresh_token in the error object's POST body snapshot.
   - **Fix applied:** log only `{code, status, message}` — never the raw error object.

2. **`src/app/[locale]/app/meetings/actions.ts:643` — `retryCalendarSync` could resync cancelled meetings and leak orphan Google events on cancel/retry races.**
   - **Fix applied:** (a) Added `status` to SELECT; reject retry when `status IN ('cancelled', 'completed')`. (b) Three race-guard UPDATEs — `.in('status', ['scheduled', 'in_progress'])` on each sync-status update. (c) On race detection after Google event creation, call `cancelCalendarEvent()` to roll back the orphan and return `not_retryable`.

3. **`src/app/[locale]/app/meetings/actions.ts:150`** — TOCTOU between project read and meeting insert could corrupt `workspace_id` if project was re-parented mid-action.
   - **Fix applied:** migration `phase_1_3_meetings_workspace_derived_20260422` installs BEFORE INSERT/UPDATE OF project_id trigger `meetings_sync_workspace_id` that derives `workspace_id` from the current `projects.workspace_id` in a single atomic DB read. Server-Action-supplied workspace_id is now irrelevant — DB enforces consistency. Combined with RLS insert policy, any re-parenting race is blocked by `is_ws_admin` check against the current workspace. Triggers verified enabled.

**MEDIUM/LOW (5) — deferred to task #24**

- MEDIUM: `actions.ts:196` — attendee insert failures leave orphan meeting rows with `ok:true`. Fix: dedupe emails + wrap in transaction or mark meeting failed.
- MEDIUM: `actions.ts:663` — stale `pending` meetings unrecoverable (retry only accepts failed/fallback_ics).
- MEDIUM: `calendar.ts:112` — retries blindly recreate Google events when first call succeeded but response was lost. Fix: persist `requestId` and reuse on retry for Google-side dedup.
- MEDIUM: `actions.ts:727` — fallback_ics retries resend duplicate ICS invite emails. Fix: record invite-send state.
- LOW: `meeting-template.ts:136` — `>` blockquote dead code because `>` is escaped to `&gt;` before the regex. Fix: parse structural `^>` before HTML-escape.

### Codex no-bug confirmations
- Google 429/403/500 all fall through cleanly to ICS fallback (no throw-through `createMeeting`).
- No refresh-token leakage path found to client bundle, Resend email body, or return value.
- `buildIcs()` CRLF, UTF-8 byte folding, escape order, UTC formatting all correct.
- No email XSS confirmed — markdown links not implemented; `projectName`/`meetingTitle`/`cancelReason` HTML-escaped.

## Deviations from spec

1. **Workspace-member email discovery**: `workspace_members` has two FK relationships to `profiles` (`user_id` and `invited_by`), requiring explicit hint `profiles!workspace_members_user_id_fkey` in Supabase SELECT. Member emails are not RLS-accessible from `auth.users`, so the new-meeting form uses accepted `workspace_invitations` + session `user.email` as fallback.
2. **`sendIcsInvite` signature** differs from spec's guess — it builds ICS internally from `meetingId`, not from a pre-built `icsContent` string. `buildIcs` import was therefore dropped from `actions.ts`.
3. **No RPC + no transactional rollback** (matches Phase 1.2.5 convention) — createMeeting uses separate inserts; attendee insert failure leaves orphan meeting (deferred follow-up).
4. **`workspace_id` derivation moved to DB trigger** (HIGH 3 fix) — the Server Action's `workspace_id` parameter is now discarded by the trigger. The column is still declared NOT NULL but is authoritatively derived from `projects.workspace_id`.

## What's NOT done (intentional)

- OAuth setup runbook `docs/google-oauth-setup.md` — env vars already set per K-01 gate; runbook deferred.
- Automatic transcription / Recall.ai (Phase 2.0).
- Reading clients' Google Calendars for availability (scope creep).
- Recurring meetings (different data model).
- Real-time sync status updates (uses page revalidation).
- Rescheduling (cancel + recreate pattern).

## Files of record

- `.yagi-autobuild/results/1-3_01_i18n.md` (Wave A i18n)
- `.yagi-autobuild/results/1-3_02_auth.md` (Wave A auth util)
- `.yagi-autobuild/results/1-3_05_ics.md` (Wave A ICS builder)
- `.yagi-autobuild/results/1-3_03_calendar.md` (Wave B calendar wrapper)
- `.yagi-autobuild/results/1-3_04_health.md` (Wave B health route)
- `.yagi-autobuild/results/1-3_07_email.md` (Wave B email helper)
- `.yagi-autobuild/results/1-3_06_actions.md` (Wave C Server Action)
- `.yagi-autobuild/results/1-3_08_ui.md` (Wave D list + form)
- `.yagi-autobuild/results/1-3_10_admin.md` (Wave D admin dashboard)
- `.yagi-autobuild/results/1-3_09_detail.md` (Wave E detail page)
- `.yagi-autobuild/_codex_review_1_3_prompt.txt`
- `.yagi-autobuild/_codex_review_1_3_output.txt`

**Next:** Phase 1.4 (Pre-production Board — upload-only, no fal.ai). Autopilot continues.
