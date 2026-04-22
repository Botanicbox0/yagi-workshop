# YAGI Workshop — Phase 1.8 Autonomous Build (B-O-E)

> **Scope:** Notifications — email (via Resend) + in-app realtime badges. Digest-based batching to prevent inbox fatigue. Per-user preferences.
> **Prereq:** Phase 1.2 (email + threads), 1.3 (meetings), 1.4 (pre-prod board + reactions), 1.5 (invoices), 1.7 (team chat).
> **Estimated duration:** 2–3 hours.
> **Design decision:** ARCHITECTURE.md §12.

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md`, `/ARCHITECTURE.md` §12.

Session: `--dangerously-skip-permissions`. Kill-switches below.

---

## Goal

By the end of Phase 1.8:

1. Central event emission: every notable product event writes a row to `notification_events`.
2. Severity classification: high / medium / low.
3. Channel routing: high = immediate email, medium = hourly digest, low = daily digest. All severities show an in-app badge.
4. Supabase Edge Function cron dispatches pending notifications every 10 minutes.
5. Per-user `notification_preferences` (email on/off, digest time, quiet hours).
6. In-app realtime badge bell with unread count; click opens notifications panel.
7. Every email has an unsubscribe link; single-click disables all non-critical email.
8. Quiet hours (22:00–08:00 local) suppress outbound email; queued to morning.

**Non-goals (explicit):**
- No SMS, no Kakao 알림톡 in this phase (ARCHITECTURE §12 — deferred to 2.0+).
- No push notifications / service worker.
- No per-event preferences (user toggles all-medium or all-low, not per-event type).

---

## Data model

Migration: `YYYYMMDDHHMMSS_phase_1_8_notifications.sql`

```sql
create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_immediate_enabled boolean not null default true,
  email_digest_enabled boolean not null default true,
  digest_time_local time not null default '09:00',
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  timezone text not null default 'Asia/Seoul',
  updated_at timestamptz not null default now()
);

create table notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  kind text not null,
  severity text not null check (severity in ('high','medium','low')),
  title text not null,                 -- pre-rendered, bilingual, short
  body text,                           -- pre-rendered body
  url_path text,                       -- deep-link path to the relevant page
  payload jsonb,                       -- original structured data for re-render if needed
  email_sent_at timestamptz,
  email_batch_id uuid,                 -- for digest grouping
  in_app_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notif_events_user_unsent on notification_events(user_id, severity, created_at)
  where email_sent_at is null;
create index idx_notif_events_user_unseen on notification_events(user_id, created_at desc)
  where in_app_seen_at is null;

alter table notification_preferences enable row level security;
alter table notification_events enable row level security;

-- User sees only own prefs/events
create policy prefs_select_own on notification_preferences for select using (user_id = auth.uid());
create policy prefs_upsert_own on notification_preferences for insert with check (user_id = auth.uid());
create policy prefs_update_own on notification_preferences for update using (user_id = auth.uid());

create policy notif_events_select_own on notification_events for select using (user_id = auth.uid());
-- No user-side insert; all inserts via service role from Server Actions
create policy notif_events_update_own on notification_events for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- user can only update in_app_seen_at (not email_sent_at etc.) — enforced in app layer

-- Unsubscribe tokens (secure, single-use-ish)
create table notification_unsubscribe_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  used_at timestamptz
);
create index idx_unsub_tokens_user on notification_unsubscribe_tokens(user_id);
```

### Event kinds enumerated

| kind | severity | trigger source |
|---|---|---|
| `meeting_scheduled` | high | Phase 1.3 createMeeting |
| `meeting_summary_sent` | high | Phase 1.3 sendSummary |
| `invoice_issued` | high | Phase 1.5 issueInvoice |
| `board_shared` | high | Phase 1.4 shareBoard |
| `board_approved` | high | Phase 1.4 approveBoard (client or YAGI) |
| `showcase_published` | high | Phase 1.9 publishShowcase |
| `frame_uploaded_batch` | medium | Phase 1.4 (debounced — 10 min window) |
| `revision_uploaded` | medium | Phase 1.4 createFrameRevision |
| `feedback_received` | medium | Phase 1.4 reaction or comment (debounced) |
| `thread_message_new` | low | Phase 1.2 sendMessage (only if not author) |
| `team_channel_mention` | low | Phase 1.7 (if message body contains `@name` — simple regex) |

---

## Subtasks (5)

### 01 — i18n: `notifications` namespace + email templates

Keys for bell tooltip, panel title, empty state, preferences page (all toggles + labels), unsubscribe confirmation, each event kind's short-form title + body template.

Email templates: one shared bilingual React Email component `src/emails/notification-digest.tsx` that renders a list of events. Single immediate-email template `src/emails/notification-immediate.tsx`. Both include footer with unsubscribe link.

### 02 — Migration + event emission helper

🛑 **KILL-SWITCH before migration apply.**

File: `src/lib/notifications/emit.ts`

```typescript
export async function emitNotification(args: {
  user_id: string
  kind: NotificationKind
  project_id?: string
  workspace_id?: string
  payload?: Record<string, any>
}): Promise<void>
```

- Looks up severity from the `kind` mapping table
- Pre-renders `title` and `body` using i18n template for the user's locale (from `profiles.locale`)
- Inserts row via service role
- Does NOT send email — that's the cron's job

Retrofit existing Server Actions to call `emitNotification` at appropriate points:
- `createMeeting` → emit to each attendee user (if they have an account)
- `sendSummary` → emit to attendees
- `issueInvoice` → emit to workspace admins
- `shareBoard` → emit to project workspace members
- `approveBoard` → emit to YAGI admins
- `publishShowcase` → emit to project workspace members
- `createFrameRevision` → emit to project workspace (debounced — see subtask 03)
- `reactToFrame` / `commentOnFrame` (public API) → emit to YAGI admins (debounced)
- `sendMessage` (Phase 1.2 threads) → emit to all thread participants except author (low severity)
- Team channel mention (Phase 1.7) → emit to mentioned user

### 03 — Debounce logic for batch events

File: `src/lib/notifications/debounce.ts`

For `frame_uploaded_batch` and `feedback_received`: before inserting a new event, check if an event of the same kind + same recipient + same project was created in the last 10 minutes. If yes, UPDATE that event's payload to aggregate counts instead of inserting a new one.

Example payload shape:
```json
{ "frames": [{"id": "...", "title": "..."}, ...], "count": 3 }
```

Email renderer shows "3 frames uploaded to Board X" instead of 3 separate emails.

### 04 — Edge Function cron + dispatch logic

File: `supabase/functions/notify-dispatch/index.ts`

Schedule: every 10 minutes via Supabase Scheduled Functions.

Logic per invocation:
1. Load all `notification_events WHERE email_sent_at IS NULL`, ordered by created_at
2. Group by user_id
3. For each user, load `notification_preferences` (create defaults if none exist)
4. Check current time vs quiet hours in user's timezone — if in quiet hours, skip unless high severity AND it's been >1 hour past event creation (grace)
5. **High severity:** send individual email immediately; set `email_sent_at`
6. **Medium severity:** if latest medium email to this user was >1 hour ago, batch all pending mediums into one digest email; set `email_sent_at` on all
7. **Low severity:** only send during user's `digest_time_local` window (±15 min); batch all pending lows; set `email_sent_at`
8. If `email_immediate_enabled=false`, still send highs; if `email_digest_enabled=false`, skip all mediums/lows (but keep in-app badges)
9. Log errors to `console.error`; retry next run for transient failures (don't set `email_sent_at` on failure)

🛑 **KILL-SWITCH before deploying the Edge Function.**

### 05 — In-app bell + preferences page + E2E

Files:
- `src/components/app/notification-bell.tsx` — top-right bell icon with unread count
- `src/components/app/notification-panel.tsx` — Radix Popover showing recent events grouped by day
- `src/app/[locale]/app/settings/notifications/page.tsx` — preferences page
- `src/app/unsubscribe/[token]/page.tsx` — unsubscribe landing (outside locale, no auth)

Bell:
- Subscribes to Realtime on `notification_events` filtered by `user_id=auth.uid() AND in_app_seen_at IS NULL`
- Badge shows unread count (max "9+")
- Click → opens panel

Panel:
- List of recent events (last 30 days, max 50)
- Each item: icon, title, timestamp, deep-link arrow
- Click item → marks `in_app_seen_at`, navigates to `url_path`
- "Mark all as read" button
- "Settings" link → preferences page

Unsubscribe:
- Email footer link: `{SITE_URL}/unsubscribe/{token}`
- Page shows user's email + "Confirm unsubscribe" button
- On confirm: set `email_immediate_enabled=false` and `email_digest_enabled=false`, mark token `used_at`
- Do NOT auto-unsubscribe on link click (confirmation required — prevents prefetch bots from accidentally unsubscribing)

E2E runbook:
1. Create a meeting → YAGI user gets immediate email + bell badge
2. Upload 3 frames within 10 min → one digest email (not 3)
3. Set quiet hours 22:00–08:00; create an event at 23:00 → no email sent until 08:00 the next morning
4. Set `email_digest_enabled=false` → mediums/lows stop emailing but still appear in bell
5. Click unsubscribe link in an email → confirmation page → confirm → both toggles set to false

Final actions:
1. 🛑 Codex adversarial review (focus from `codex-review-protocol.md` Phase 1.8)
2. `pnpm build`
3. `summary-1-8.md`
4. Telegram: `✅ Phase 1.8 complete`
5. Autopilot: read `phase-1-9-spec.md`; no env prereqs; kick off B-O-E for 1.9.

---

## Dependencies

```powershell
pnpm add @react-email/components @react-email/render
```

🛑 KILL-SWITCH before install. These render the bilingual email templates.

---

## Kill-switch triggers (4)

1. Before migration apply
2. Before `pnpm add @react-email/*`
3. Before deploying the Edge Function
4. Before `/codex:adversarial-review`

---

## Success criteria

1. `pnpm build` clean
2. Migration clean
3. E2E all 5 scenarios pass
4. Quiet hours respected; digest emails batch correctly
5. Unsubscribe works + requires confirmation
6. RLS: user cannot read others' notification_events or preferences
7. Edge Function deploys and runs on schedule
8. Codex review clean

---

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.7
- Executor 01, 05 (i18n + UI): Sonnet 4.7
- Executor 02, 03 (emit helper + debounce — touches many files): Opus 4.7
- Executor 04 (Edge Function — money-adjacent logic with cron idempotency): Opus 4.7
- Evaluator: Sonnet 4.7 fresh context

---

## Forbidden

- Sending SMS, Kakao 알림톡, or push notifications in this phase (ARCHITECTURE §12 defers to 2.0+)
- Sending email without checking `notification_preferences` and quiet hours
- Duplicating an email on Edge Function retry — dispatch must be idempotent (set `email_sent_at` BEFORE `resend.emails.send` in a transaction if possible; if not, at least track in-flight state)
- Putting plaintext user emails in unsubscribe URLs — always use the opaque token
- Firing an event for a user's own action (e.g., if YAGI uploads a frame, YAGI doesn't get notified about it)
- Bypassing debounce on feedback events — clients can react 10 times in a minute; you don't email YAGI 10 times

---

## Notes for Yagi

- Event kinds are a **closed set** defined in this spec. Don't add new kinds without updating the i18n templates AND the severity map AND documenting it here.
- Timezone default is `Asia/Seoul`. Non-Korean clients should set their own via the preferences page.
- After Phase 1.8 ships, monitor `notification_events` table size. If it grows faster than expected, add a retention job in 2.0 (e.g., delete events older than 90 days that have `email_sent_at IS NOT NULL AND in_app_seen_at IS NOT NULL`).

**End of Phase 1.8 spec.**
