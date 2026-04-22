# Phase 1.3 Subtask 09 — Meeting detail page + summary editor + cancel dialog + retry sync

## Status
COMPLETE

## Files Created
- `src/app/[locale]/app/meetings/[id]/page.tsx` — Server Component meeting detail page
- `src/components/meetings/attendees-list.tsx` — Async Server Component, attendee rows with response_status + organizer badge
- `src/components/meetings/summary-editor.tsx` — Client Component, markdown textarea + char count + save/send + autosave on blur
- `src/components/meetings/cancel-dialog.tsx` — Client Component, Dialog with reason textarea, calls cancelMeeting
- `src/components/meetings/meeting-actions-menu.tsx` — Client Component, DropdownMenu with all gated actions

## Files Modified
- `src/app/[locale]/app/meetings/actions.ts` — Added 5 new exports, removed unused `buildIcs` import, added `cancelCalendarEvent`/`sendSummary`/`sendCancellation` imports
- `messages/ko.json` — Added 26 keys to meetings namespace
- `messages/en.json` — Added 26 keys to meetings namespace

## New Server Action Exports in actions.ts
1. `saveMeetingSummary(meetingId, summaryMd)` — uuid validation + 20000 char limit, ws_admin|yagi_admin gate, UPDATE meetings SET summary_md, revalidates meeting detail
2. `sendMeetingSummary(meetingId)` — loads meeting + attendees, calls `sendSummary(...)`, UPDATE summary_sent_at on success
3. `cancelMeeting(meetingId, reason)` — reason min 3/max 500 chars, UPDATE status=cancelled, fire-and-forget `cancelCalendarEvent` + `sendCancellation`
4. `markMeetingCompleted(meetingId)` — only allows if status in {scheduled,in_progress}, UPDATE status=completed
5. `retryCalendarSync(meetingId)` — guards on failed|fallback_ics, re-runs Google Calendar → ICS email cascade, returns new syncStatus; returns {ok:false,error:'already_synced'} if already synced

## send-meeting.ts Signature Discoveries
- `sendSummary(args)` — accepts `{to, projectName, meetingTitle, scheduledAt, durationMinutes, summaryMd}` (no ICS attachment)
- `sendCancellation(args)` — accepts `{to, projectName, meetingTitle, meetingId, scheduledAt, endsAt, durationMinutes, organizerEmail, organizerName?, cancelReason?}` (METHOD:CANCEL ICS attached)
- Both return `{ok: boolean; error?: string}`, never throw

## i18n Keys Added (both ko.json and en.json)
`attendees_empty`, `attendee_organizer`, `response_accepted`, `response_declined`, `response_tentative`, `response_needsAction`, `summary_saved`, `summary_save_error`, `summary_send_success`, `summary_send_error`, `cancel_success`, `cancel_error`, `cancel_dialog_desc`, `cancel_reason_label`, `cancel_confirm_btn`, `cancel_meeting`, `meet_link_copied`, `copy_failed`, `copy_meet_link`, `edit_summary`, `mark_completed`, `mark_completed_success`, `mark_completed_error`, `sync_retry_success`, `sync_retry_error`, `sync_retry_hint`, `actions_menu_label`

## Implementation Notes
- SummaryEditor autosaves on textarea blur if content changed and non-empty (300ms debounce)
- cancelMeeting: Google Calendar cancel + cancellation email are both fire-and-forget (don't block the DB update)
- retryCalendarSync: if both Google and email fail on retry, returns `{ok: true, syncStatus: 'failed'}` (matching createMeeting behavior)
- AttendeesList is an async Server Component (no "use client") using `getTranslations` from `next-intl/server`
- Detail page disabled/muted summary editor for cancelled meetings via `pointer-events-none opacity-60`
- MeetingActionsMenu passes locale-aware `router.refresh()` after mutations

## Upstream Issues
- None. The `buildIcs` import in the original `actions.ts` was unused (only used inside `send-meeting.ts`); removed it to prevent TS `noUnusedLocals` error.
