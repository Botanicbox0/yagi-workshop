# YAGI Workshop — Phase 1.3 Autonomous Build (B-O-E)

> **Scope:** Meetings — schedule, track, summarize client meetings with automatic Google Calendar + Meet link creation.
> **Prereq:** Phase 1.2 complete (projects exist and have a detail page). Phase 1.2.5 recommended but not required.
> **Estimated duration:** 3–4 hours.
> **Design decisions this phase relies on:** ARCHITECTURE.md §8.1 (single-account OAuth), §8.2 (.ics fallback).

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md` and `/ARCHITECTURE.md` §8.1–8.2 before writing code. `/ARCHITECTURE.md` is authoritative for the OAuth model — if the spec below seems to contradict it, the architecture decision wins.

Session: `--dangerously-skip-permissions`. Kill-switches below are mandatory.

---

## Goal

By the end of Phase 1.3:

1. YAGI admin can schedule a meeting against a project from the project detail page
2. Meeting creation auto-creates a Google Calendar event on YAGI's internal calendar with a Meet link
3. Client receives a calendar invite via Google's native email (no separate email from us)
4. If Google Calendar fails, the system falls back to `.ics` email attachment via Resend
5. Meetings show up in a `/app/meetings` list for workspace members
6. After a meeting, YAGI can enter a manual summary that's emailed to attendees (Resend)
7. Meeting status transitions: `scheduled → in_progress → completed` (or `cancelled` from any state)

**Non-goals (explicit):**
- Automatic transcription or summary generation (that's Phase 2.0 with Recall.ai)
- Reading clients' Google Calendars for availability (stays manual)
- Recurring meetings (single-occurrence only)
- Rescheduling (cancel + recreate for MVP)

---

## Data model

New migration: `YYYYMMDDHHMMSS_phase_1_3_meetings.sql`

```sql
create table meetings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title text not null,
  description text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 30,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  meet_link text,
  google_event_id text,
  calendar_sync_status text not null default 'pending'
    check (calendar_sync_status in ('pending', 'synced', 'fallback_ics', 'failed')),
  calendar_sync_error text,
  summary_md text,
  summary_sent_at timestamptz,
  created_by uuid not null references auth.users(id),
  cancelled_reason text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_meetings_project on meetings(project_id);
create index idx_meetings_workspace on meetings(workspace_id);
create index idx_meetings_scheduled on meetings(scheduled_at);

create table meeting_attendees (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  email text not null,
  display_name text,
  user_id uuid references auth.users(id),  -- null for external attendees
  response_status text default 'needsAction'
    check (response_status in ('needsAction','accepted','declined','tentative')),
  is_organizer boolean default false,
  created_at timestamptz not null default now(),
  unique (meeting_id, email)
);

create index idx_meeting_attendees_meeting on meeting_attendees(meeting_id);

-- trigger for updated_at
create trigger meetings_updated_at before update on meetings
  for each row execute function public.handle_updated_at();

-- RLS
alter table meetings enable row level security;
alter table meeting_attendees enable row level security;

-- meetings: workspace members can see; yagi_admin sees all
create policy meetings_select on meetings for select using (
  is_ws_member(workspace_id) or is_yagi_admin()
);
create policy meetings_insert on meetings for insert with check (
  (is_ws_admin(workspace_id) or is_yagi_admin())
);
create policy meetings_update on meetings for update using (
  is_ws_admin(workspace_id) or is_yagi_admin()
);

-- meeting_attendees: tied to meeting visibility
create policy meeting_attendees_select on meeting_attendees for select using (
  exists (
    select 1 from meetings m
    where m.id = meeting_attendees.meeting_id
      and (is_ws_member(m.workspace_id) or is_yagi_admin())
  )
);
create policy meeting_attendees_insert on meeting_attendees for insert with check (
  exists (
    select 1 from meetings m
    where m.id = meeting_attendees.meeting_id
      and (is_ws_admin(m.workspace_id) or is_yagi_admin())
  )
);
```

Regenerate types after apply.

---

## Google Calendar integration architecture

Per ARCHITECTURE.md §8.1:

- **One YAGI-owned Google account** authenticated once via OAuth (`calendar.events` scope).
- The refresh token is stored in env vars: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`.
- All calendar events are created on **YAGI's calendar**. Clients appear as `attendees[]`.
- Google sends native calendar invites to attendees — we don't send a redundant email about the invite itself (we do send the manual summary email after the meeting).

### One-time OAuth setup (manual, done by Yagi once)

Document in `docs/google-oauth-setup.md` (this file is the runbook, not automated):

1. In Google Cloud Console, create an OAuth 2.0 Client ID (type: Web application).
2. Authorized redirect URIs: `http://localhost:3003/api/auth/google/callback` (dev only).
3. Enable Google Calendar API for the project.
4. OAuth consent screen: "Testing" mode. Add YAGI's own Google account as a test user. **Do not submit for verification yet** — staying in testing mode with one test user is fine for a single-account setup.
5. Run the local OAuth consent flow (a throwaway Node script or a one-off `/auth/google/consent` route in dev) to obtain a refresh token.
6. Copy the refresh token into `.env.local` as `GOOGLE_OAUTH_REFRESH_TOKEN`.
7. Verify by running the health check endpoint (see subtask 04).

---

## Subtasks (10)

### 01 — i18n: `meetings` namespace

Add to both `messages/ko.json` and `messages/en.json`:

**`meetings` keys:**
- `list_title`, `list_empty`, `list_empty_sub`
- `new`, `new_title`, `new_description`
- `title_label`, `title_ph`
- `description_label`, `description_ph`
- `scheduled_at_label`, `duration_label`, `duration_30`, `duration_45`, `duration_60`, `duration_90`
- `attendees_label`, `attendees_add`, `attendees_ph`, `attendees_remove`
- `status_scheduled`, `status_in_progress`, `status_completed`, `status_cancelled`
- `cancel_confirm`, `cancel_reason_ph`
- `meet_link_label`, `meet_link_copy`, `meet_link_missing`
- `sync_pending`, `sync_synced`, `sync_fallback_ics`, `sync_failed`, `sync_retry`
- `summary_title`, `summary_ph`, `summary_save`, `summary_send`, `summary_sent_at`
- `calendar_native_note` — "Google Calendar 초대장이 참가자 이메일로 자동 전송됩니다." / "A Google Calendar invite is sent to attendees automatically."

Korean 존댓말, editorial English. Acceptance: both JSON files valid and all keys present in both locales.

---

### 02 — Google OAuth refresh-token → access-token utility

File: `src/lib/google/auth.ts`

```typescript
import { OAuth2Client } from 'google-auth-library'

let client: OAuth2Client | null = null

export function getGoogleClient(): OAuth2Client | null {
  const { GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN } = process.env
  if (!GOOGLE_OAUTH_CLIENT_ID || !GOOGLE_OAUTH_CLIENT_SECRET || !GOOGLE_OAUTH_REFRESH_TOKEN) {
    return null
  }
  if (!client) {
    client = new OAuth2Client(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET)
    client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN })
  }
  return client
}

export async function getAccessToken(): Promise<string | null> {
  const c = getGoogleClient()
  if (!c) return null
  try {
    const { token } = await c.getAccessToken()
    return token ?? null
  } catch (e) {
    console.error('[google] refresh token failed', e)
    return null
  }
}
```

🛑 **KILL-SWITCH before `pnpm add google-auth-library`.**

Acceptance:
- Module exports compile without error
- With env vars unset, `getGoogleClient()` returns null (no throw)
- Type check passes

---

### 03 — Calendar API wrapper: create event + cancel event

File: `src/lib/google/calendar.ts`

```typescript
type CreateEventArgs = {
  title: string
  description?: string
  scheduledAt: Date
  durationMinutes: number
  attendeeEmails: string[]
  organizerEmail: string   // YAGI account — displayed as the event creator
  timezone?: string        // default 'Asia/Seoul'
}

type CreateEventResult =
  | { ok: true; event_id: string; meet_link: string | null }
  | { ok: false; reason: 'no_auth' | 'api_error'; detail?: string }

export async function createCalendarEvent(args: CreateEventArgs): Promise<CreateEventResult>
export async function cancelCalendarEvent(eventId: string): Promise<{ ok: boolean }>
```

Implementation:

- Use `https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all` for creation
- Request body:
  ```json
  {
    "summary": "<title>",
    "description": "<description>",
    "start": { "dateTime": "<ISO>", "timeZone": "Asia/Seoul" },
    "end":   { "dateTime": "<ISO>", "timeZone": "Asia/Seoul" },
    "attendees": [ { "email": "..." } ],
    "conferenceData": {
      "createRequest": {
        "requestId": "<uuid>",
        "conferenceSolutionKey": { "type": "hangoutsMeet" }
      }
    },
    "reminders": { "useDefault": true }
  }
  ```
- Extract `meet_link` from `response.hangoutLink` (preferred) or `response.conferenceData.entryPoints[].uri`
- Cancel: `DELETE /calendars/primary/events/{eventId}?sendUpdates=all`
- All calls include `Authorization: Bearer <access_token>` obtained via `getAccessToken()`
- 10-second timeout per call; on failure return `{ ok: false, reason: 'api_error', detail }` — never throw
- Log success/failure with endpoint + status code (no PII beyond email addresses already in the request)

Acceptance:
- Unit-testable against the real API with a temp test event (cleanup in teardown)
- No network calls happen at module load; calls only when `createCalendarEvent` is invoked

---

### 04 — Health check route

File: `src/app/api/health/google/route.ts` (GET, yagi_admin only)

Returns:
```json
{
  "auth_configured": true | false,
  "token_refresh_ok": true | false,
  "last_checked_at": "<ISO>"
}
```

Purpose: a one-click way for Yagi to verify Google integration is live after setup. Called from the admin dashboard (subtask 10).

Acceptance:
- Route exists, requires yagi_admin (returns 403 otherwise)
- With env vars set, returns `auth_configured: true, token_refresh_ok: true`
- With env vars unset, returns `auth_configured: false`

---

### 05 — `.ics` fallback utility

File: `src/lib/calendar/ics.ts`

Pure function — no dependencies, hand-written RFC 5545.

```typescript
type IcsEventArgs = {
  uid: string           // stable UID (e.g., `meeting-${meeting.id}@yagiworkshop.xyz`)
  title: string
  description?: string
  startsAt: Date
  endsAt: Date
  organizerEmail: string
  organizerName?: string
  attendeeEmails: string[]
  location?: string     // optional "Google Meet TBD" or a URL
  method?: 'REQUEST' | 'CANCEL'  // default REQUEST
}

export function buildIcs(args: IcsEventArgs): string
```

Output an `ICS` string with proper CRLF line endings, VEVENT with DTSTART/DTEND in UTC, SUMMARY, DESCRIPTION (escaped — commas, semicolons, backslashes, newlines), ORGANIZER (mailto), ATTENDEE (mailto + RSVP=TRUE + PARTSTAT=NEEDS-ACTION), METHOD, UID, DTSTAMP, SEQUENCE=0.

No external library. RFC 5545 is small enough to hand-write and pinning to a library for one file isn't worth it.

Acceptance:
- Generated `.ics` file opens in Google Calendar, Apple Calendar, Outlook
- Special characters in description (Korean, commas, newlines) don't break parsing
- `METHOD:CANCEL` produces a file that cancels the event when opened

---

### 06 — Meeting create Server Action (with fallback cascade)

File: `src/app/[locale]/app/meetings/actions.ts`

```typescript
export async function createMeeting(input: CreateMeetingInput): Promise<CreateMeetingResult>
```

Sequence:

1. **Zod validation.** Required: title, scheduledAt, durationMinutes, projectId, attendeeEmails (at least one). Max 10 attendees.
2. **Auth check.** Require `is_ws_admin(project.workspace_id)` OR `is_yagi_admin()`. Fetch project to get workspace_id.
3. **Insert meeting row** with `calendar_sync_status='pending'` + `meet_link=null`. Insert attendee rows.
4. **Try Google Calendar create** (subtask 03). On success: update meeting row with `google_event_id`, `meet_link`, `calendar_sync_status='synced'`. Google sends the invite via `sendUpdates=all`. We're done.
5. **On Google failure:** generate `.ics` (subtask 05) and email attendees via Resend (subtask 07 — or reuse Phase 1.2's email module). Update meeting row: `calendar_sync_status='fallback_ics'`, `calendar_sync_error=<reason>`.
6. **If Resend also fails:** `calendar_sync_status='failed'`, `calendar_sync_error=<reason>`. The meeting still exists in our DB — user can manually share the Meet link.
7. `revalidatePath` for the meeting list and the project detail page.
8. Return the meeting id + sync status for UI to show appropriate toast.

The primary commit (steps 2–3) must never be undone by later step failures. A meeting row always exists if the user saw "meeting created" toast.

Acceptance:
- Happy path: meeting created, Google event visible in YAGI's calendar, attendee receives invite email from Google
- Google API down (simulate by setting wrong credentials): meeting created, `.ics` email sent, status = 'fallback_ics'
- Both fail: meeting created, status = 'failed', UI shows warning with retry button

---

### 07 — Email helper for `.ics` attachment + summary email

File: `src/lib/email/send-meeting.ts`

Two exported functions:
- `sendIcsInvite(args)` — attaches `.ics` with `method=REQUEST`, subject `[YAGI] {project} · 미팅 초대 / Meeting invite`
- `sendSummary(args)` — sends the manual summary after the meeting, subject `[YAGI] {project} · 미팅 요약 / Meeting summary`

Both use the Resend client singleton from Phase 1.2. `.ics` attachment: Resend supports `attachments: [{ filename, content }]` with content as a Buffer or base64 string.

Bilingual email templates: body has both Korean and English versions stacked (Korean first). Use a shared minimal React Email component — or inline HTML string if `@react-email/components` isn't already installed (don't add it just for this).

**E-05 — Email rendering specification (mandatory):**

All meeting emails use a shared renderer at `src/lib/email/meeting-template.ts`:

```typescript
type MeetingEmailArgs = {
  kind: 'invite' | 'cancel' | 'summary'
  projectName: string
  meetingTitle: string
  scheduledAt: Date
  durationMinutes: number
  meetLink?: string
  organizerName: string   // 'YAGI Workshop' by default
  summaryMd?: string      // required when kind='summary'
  cancelReason?: string   // optional when kind='cancel'
}

export function renderMeetingEmailHtml(args: MeetingEmailArgs): string
export function renderMeetingEmailText(args: MeetingEmailArgs): string  // plain-text fallback
```

**Structure per email type:**

| Kind | Subject (ko) | Subject (en) | Body sections (in order) |
|------|--------------|--------------|--------------------------|
| `invite` | `[YAGI] {project} · 미팅 초대` | `[YAGI] {project} · Meeting invite` | 1. Greeting · 2. Meeting details (title, date/time in Asia/Seoul, duration) · 3. Meet link (if present) · 4. ICS attachment note · 5. Footer |
| `cancel` | `[YAGI] {project} · 미팅 취소` | `[YAGI] {project} · Meeting cancelled` | 1. Cancellation notice · 2. Original meeting details · 3. Cancel reason (if provided) · 4. Footer |
| `summary` | `[YAGI] {project} · 미팅 요약` | `[YAGI] {project} · Meeting summary` | 1. Greeting · 2. Meeting header (title, date) · 3. Summary body (Markdown → HTML via minimal renderer, see below) · 4. Footer |

**HTML structure (all kinds):**

```html
<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Pretendard Variable','Apple SD Gothic Neo',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;">
    <tr><td align="center" style="padding:40px 20px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#111111;border-radius:8px;overflow:hidden;">
        <!-- Header: YAGI wordmark -->
        <tr><td style="padding:32px 40px 16px;">
          <div style="font-size:14px;letter-spacing:0.2em;color:#C8FF8C;">YAGI WORKSHOP</div>
        </td></tr>
        <!-- Korean section -->
        <tr><td style="padding:16px 40px;color:#FAFAFA;">
          <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">{한국어 제목}</h1>
          <div style="font-size:14px;line-height:1.6;color:#D0D0D0;">{한국어 본문}</div>
        </td></tr>
        <!-- Divider -->
        <tr><td style="padding:24px 40px;">
          <div style="height:1px;background:#222222;"></div>
        </td></tr>
        <!-- English section -->
        <tr><td style="padding:0 40px 32px;color:#FAFAFA;">
          <h1 style="font-size:20px;font-weight:600;margin:0 0 16px;">{English title}</h1>
          <div style="font-size:14px;line-height:1.6;color:#D0D0D0;">{English body}</div>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px;background:#0A0A0A;text-align:center;">
          <div style="font-size:11px;color:#666666;">
            YAGI Workshop · <a href="https://yagiworkshop.xyz" style="color:#C8FF8C;text-decoration:none;">yagiworkshop.xyz</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
```

**Markdown-to-HTML (summary emails only):**
- Minimal inline renderer — no external library
- Support: `#`/`##`/`###` headings, `**bold**`, `*italic*`, unordered lists (`- `), ordered lists (`1. `), `> blockquote`, paragraph breaks
- Do NOT support: code blocks, tables, images, HTML passthrough (security)
- Escape all user input (`<`, `>`, `&`) before applying Markdown rules

**Styling rules:**
- Inline styles only (no `<style>` blocks — Gmail/Outlook strip them)
- Dark theme: `#0A0A0A` bg, `#111111` card, `#FAFAFA` text, `#C8FF8C` accent (YAGI design tokens)
- Max width 600px, responsive via `max-width` (email clients mostly ignore media queries anyway)
- No images except for optional header logo (defer to Phase 1.8 when we have asset CDN)
- Links: `#C8FF8C` color, no underline

**Date/time rendering:**
- Use `Intl.DateTimeFormat` with `timeZone: 'Asia/Seoul'` for both ko and en output
- Korean: `2026년 4월 25일 (토) 오후 2:00` · English: `Saturday, April 25, 2026 · 2:00 PM KST`

Acceptance:
- ICS attachment opens correctly on major clients
- Summary email renders cleanly in Gmail + Apple Mail + Outlook (test via [mail-tester.com](https://mail-tester.com) if in doubt)
- All three email kinds (invite / cancel / summary) use the shared renderer — no duplicated HTML
- Markdown special characters in summary don't break HTML (`<script>` tags are escaped, not executed)
- Plain-text fallback is human-readable (for clients that block HTML)

---

### 08 — Meetings list + new-meeting form

Files:
- `src/app/[locale]/app/meetings/page.tsx` — Server Component, lists meetings the user can see (RLS-scoped)
- `src/app/[locale]/app/meetings/new/page.tsx` — the form
- `src/components/meetings/new-meeting-form.tsx` — Client Component with RHF + Zod

List page:
- Columns: title, project, scheduled_at, duration, status badge, sync status badge
- Filters: status (all/scheduled/completed/cancelled), project
- "New meeting" button top-right → `/ko/app/meetings/new`
- Empty state per design system

New-meeting form:
- Project selector (filtered to projects the user can admin)
- Title
- Description (optional)
- Date/time picker (use `react-day-picker` already installed + a simple time input)
- Duration radio: 30 / 45 / 60 / 90 min
- Attendees: list of `{ email, displayName? }`. "Add attendee" button. Pre-populate with the project's workspace members (unchecked by default; user checks who to invite).
- Submit → calls `createMeeting` Server Action → redirect to meeting detail on success

Sidebar nav: enable `Meetings` item.

Acceptance:
- Form validates inline (email format, required fields, max 10 attendees)
- Successful submit redirects to `/ko/app/meetings/[id]`
- On `calendar_sync_status='fallback_ics'`, toast shows "invite sent via email, Meet link pending"
- On `calendar_sync_status='failed'`, toast shows warning + retry link

---

### 09 — Meeting detail page + summary editor + cancel

File: `src/app/[locale]/app/meetings/[id]/page.tsx` (Server Component)

Layout:
- Top: breadcrumb, status badge, actions dropdown (Copy Meet link / Edit summary / Send summary email / Cancel meeting)
- Left: details — title, description, scheduled_at, duration, Meet link (or fallback message)
- Right: attendees list with response_status badges, sync status pill (with retry button if 'failed')
- Bottom: summary section — Markdown textarea (simple; no rich editor), "Save draft" + "Send to attendees"

Sub-components (Client):
- `src/components/meetings/summary-editor.tsx` — textarea with character count, autosave-on-blur via Server Action
- `src/components/meetings/attendees-list.tsx` — renders attendee rows with response status
- `src/components/meetings/cancel-dialog.tsx` — Radix Dialog, captures `cancelled_reason`, calls Server Action that (a) updates meeting row to `cancelled`, (b) calls Google `cancelCalendarEvent` if `google_event_id` exists, (c) emails attendees with `METHOD:CANCEL` ICS

Server Actions (same `actions.ts` as subtask 06):
- `saveMeetingSummary(meetingId, summaryMd)`
- `sendMeetingSummary(meetingId)` — loads summary, calls `sendSummary`, sets `summary_sent_at`
- `cancelMeeting(meetingId, reason)`
- `retryCalendarSync(meetingId)` — re-runs the create cascade for a meeting currently in `failed` state

Status transition rules:
- `scheduled → in_progress`: automatic when current time >= `scheduled_at - 5 min` (computed client-side for display; the DB column only changes when `in_progress → completed` is set by user)
- `in_progress → completed`: manual, triggered by clicking "Mark completed" button
- Any → `cancelled`: via cancel dialog

Acceptance:
- Write a summary, save → reload → summary persists
- Send summary → attendees receive email, `summary_sent_at` populated
- Cancel meeting with reason → meeting row marked cancelled, Google event deleted, attendees get cancellation email
- Retry sync on a failed meeting recovers it (if Google back up)

---

### 10 — Admin dashboard card + health status

Files:
- Extend `src/app/[locale]/app/admin/page.tsx` (create if not present from Phase 1.2) with a "Integrations" section
- `src/components/admin/google-integration-status.tsx` — Client Component, fetches `/api/health/google` on mount, shows pill: 🟢 synced / 🟡 not configured / 🔴 token refresh failing

Also show on this dashboard (static rollup, not real-time):
- Upcoming meetings (next 7 days)
- Meetings with `calendar_sync_status='failed'` (if any)

Acceptance:
- As yagi_admin, dashboard shows Google health pill
- If env vars unset: pill shows "not configured" with a link to `docs/google-oauth-setup.md`
- If token refresh failing: pill shows "attention required" with error message

---

## Dependencies

```powershell
pnpm add google-auth-library
```

No other new deps. The ICS builder is hand-rolled; Resend is already present from Phase 1.2.

🛑 **KILL-SWITCH** before this install.

---

## Parallelism plan

Dependency graph (subtask → depends on):
- `01` (i18n) — no deps
- `02` (google auth util) — no deps (needs `pnpm add google-auth-library`)
- `05` (ICS util) — no deps
- `03` (calendar wrapper) — depends on `02`
- `07` (email helper) — depends on `05`, reuses Phase 1.2 Resend client
- `04` (health route) — depends on `02`
- `06` (create action) — depends on `03`, `05`, `07`, migration
- `08` (form UI) — depends on `06`
- `09` (detail page) — depends on `08` routes + `07`
- `10` (admin dashboard) — depends on `04`, `06`

**Wave execution (Orchestrator assigns Executors per wave):**

```
Wave A [parallel]:     01 · 02 · 05           # 3 Executors in parallel, zero cross-deps
   ↓
Wave B [parallel]:     03 · 04 · 07           # all depend only on Wave A outputs
   ↓
Wave C [serial]:       migration → 06         # migration must apply before action can compile against new types
   ↓
Wave D [parallel]:     08 · 10                # 08 and 10 read meeting data but don't touch each other
   ↓
Wave E [serial]:       09                     # 09 embeds components that 08 registered
```

**Rationale:**
- Wave A parallelizes all no-dep subtasks — maximum concurrency at start.
- Wave B safe to parallelize because `04`/`07` touch different files than `03`.
- Wave C **must be serial** — types regenerate after migration, and `06` imports those types.
- Wave D `08` and `10` both render meeting data but operate on separate routes (`/app/meetings/*` vs `/app/admin`).
- Wave E alone — `09` is the most surface-area Client Component work; one Executor full-focus.

**Orchestrator rule:** within a wave, if any Executor fails, abort the wave and restart only that subtask with fresh context. Do not roll back completed subtasks.

## Context-reset checkpoints

After Waves B, D, and E — write `checkpoint.md`.

## Kill-switch triggers

**AUTOPILOT MODE NOTE:** When executed under AUTOPILOT.md chain with kill-switches disabled, only K-01 (env gate) remains active. K-02–K-05 become **inline checkpoints** — Builder logs decision + proceeds without waiting for user input.

| ID | Trigger | Autopilot behavior | Manual behavior |
|----|---------|-------------------|-----------------|
| K-01 | Before Phase start: check `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN` in `.env.local` | If any missing → Telegram halt: "Phase 1.3 needs Google OAuth env vars. Set per docs/google-oauth-setup.md and continue." | Same as autopilot |
| K-02 | Before `pnpm add google-auth-library` (subtask 02) | Log + proceed (trusted dep) | Ask user |
| K-03 | Before migration apply | Log migration SQL to console + proceed | Ask user |
| K-04 | Before final `pnpm build` | Proceed; if build fails, retry once; if still fails → halt for human | Ask user |
| K-05 | Before declaring Phase 1.3 complete | Run Codex adversarial review (see Codex section below), include findings in completion Telegram, proceed to Phase 1.4 | Ask user |

**K-01 is non-negotiable** — the Phase is unbuildable without those env vars. All others are informational under Autopilot.

---

## Success criteria

1. `pnpm build` clean, zero TS/ESLint errors
2. Migration applies; types regenerate
3. End-to-end happy path: YAGI admin creates meeting with one YAGI + one client attendee → Google event appears on YAGI calendar → client receives Google invite email → click Meet link works
4. Fallback path: set `GOOGLE_OAUTH_REFRESH_TOKEN=invalid`, create meeting → `.ics` email sent, meeting stored with `calendar_sync_status='fallback_ics'`
5. Cancel: cancel a synced meeting → Google event deleted, attendees get cancellation ICS
6. Summary: write + send → email delivered, `summary_sent_at` set
7. Admin dashboard shows green health pill when configured, red/yellow when not
8. Client non-admin cannot create meetings (403 on Server Action)
9. Anon cannot read meetings via `/rest/v1/meetings` (RLS)
10. **Codex adversarial review pass** — all HIGH/CRITICAL findings addressed or explicitly deferred with justification in `ARCHITECTURE.md`
11. **Email rendering verified** — invite/cancel/summary emails all render correctly in Gmail (dark mode + light mode), Apple Mail, Outlook web

---

## Codex adversarial review (K-05)

Run via `/codex:adversarial-review` with this Phase 1.3 focus prompt (from `.yagi-autobuild/codex-review-protocol.md`):

```
Phase 1.3 adversarial review. Focus exclusively on:

1. OAuth refresh token handling — is the token ever logged, leaked to error messages, or exposed to the client bundle? Is the singleton pattern in src/lib/google/auth.ts thread-safe for Next.js serverless runtime?

2. Calendar API error paths — if Google returns 403 (permission), 429 (rate limit), or 500, does the fallback cascade in createMeeting work correctly? Does the meeting row stay consistent (no orphan rows, no double-sends)?

3. ICS generation — are CRLF line endings correct? Are Korean characters, commas, newlines, backslashes in title/description properly escaped per RFC 5545? Does METHOD:CANCEL actually cancel on Google/Apple/Outlook?

4. RLS bypass — can a non-yagi-admin client-workspace member see meetings from other workspaces via the /rest/v1/meetings endpoint? Can they insert meeting_attendees rows for meetings they don't own?

5. Email template XSS — is Markdown-to-HTML conversion in summary emails safe against injected <script>, <img onerror>, or <a href="javascript:">? Is user input escaped before OR after Markdown parsing?

6. Autopilot chain hazards — if Phase 1.3 fails mid-wave, what state does the DB end up in? Does the retry path in subtask 09 recover cleanly, or can it double-create Google events?

Ignore: style nits, naming bikeshedding, "should we use a library instead" suggestions. Report only concrete bugs, security issues, or protocol violations.
```

Builder runs Codex review, filters output with validation ruleset from `codex-review-protocol.md`, and posts summary to Telegram. If any HIGH/CRITICAL finding remains unresolved after one follow-up fix pass, Autopilot halts for human review.

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.6
- Executor 01, 04, 05, 07 (config / simple routes / utility): Haiku 4.5
- Executor 02, 03, 06, 08, 09, 10 (integrations + UI logic): Sonnet 4.6
- Evaluator: Sonnet 4.6 fresh context

---

## Forbidden

- Adding a real-time transcription path (that's Phase 2.0 Recall.ai)
- Using the standard `calendar` OAuth scope (restricted — see §8.1)
- Reading clients' calendars for availability (scope creep + UX scope creep)
- Storing refresh tokens anywhere except env vars
- Retrying Google API more than once inline (if first call fails, fall through to ICS — don't block the user)
- Running a background worker for retries (out of scope; user-triggered retry is good enough)
- Recurring meetings (different data model; defer)

## Notes for Yagi

Before kicking this off:
1. Do the one-time OAuth setup per `docs/google-oauth-setup.md` (Builder will create this file as part of subtask 02).
2. Have the refresh token ready in `.env.local`.
3. If you don't want to do OAuth setup yet, start Phase 1.3 anyway — Builder will build everything and stop at kill-switch 3, waiting for you to set up the env vars before enabling Google integration. The `.ics` fallback path will be tested in the meantime.
