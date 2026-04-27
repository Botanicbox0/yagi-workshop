# Phase 1.3 Subtask 06 — createMeeting Server Action

## status
complete

## files_created
- `src/app/[locale]/app/meetings/actions.ts`

## files_modified
none

## key implementation details

### sendIcsInvite signature deviation
The spec guessed `sendIcsInvite` took `{ attendeeEmails, icsContent, ... }` but the actual signature (subtask 07) takes `{ to: string[], ..., endsAt: Date, organizerEmail: string, organizerName?: string }` and builds its own ICS internally via `buildIcs`. **Adjusted accordingly**: `buildIcs` is still imported but only used conceptually — the actual call to `sendIcsInvite` passes `to`, `endsAt`, and organizer fields; `sendIcsInvite` builds the ICS itself. Since `send-meeting.ts` does `import { buildIcs }` internally, the `buildIcs` import in `actions.ts` was removed (it is not needed — `sendIcsInvite` handles it). The final implementation removed the separate `buildIcs` call and the `buildIcs` import entirely since `sendIcsInvite` handles ICS construction internally.

### attendee_insert failure path
Per spec: if attendee insert fails, meeting row remains but we return `{ ok: true, meetingId, syncStatus: 'failed' }` and skip calendar/email steps. `meetLink: null` added for completeness.

### revalidation
`_revalidateMeetingPaths(projectId)` iterates `["ko", "en"]` locales and calls `revalidatePath` for both `/[locale]/app/meetings` and `/[locale]/app/projects/[projectId]`. Called on every `ok: true` return after attendees are inserted (not on attendee insert failure since the meeting is an orphan).

### RPC calls
`is_ws_admin` and `is_yagi_admin` are called in `Promise.all` for parallelism. Both RPCs match the DB types exactly (`{ uid, wsid }` and `{ uid }`).

### TypeScript
`parsed.error.issues` used (not `.errors` which doesn't exist on ZodError). `pnpm exec tsc --noEmit` passes clean.

## discovered issues in upstream files

- **`send-meeting.ts`**: Builds ICS itself from `meetingId`; callers do NOT need to pre-build ICS or pass `icsContent`. The spec's guess for `sendIcsInvite` args was partially wrong — the actual required args are `{ to, projectName, meetingTitle, meetingId, scheduledAt, endsAt, durationMinutes, meetLink?, organizerEmail, organizerName? }`.
- **`calendar.ts`**: No issues found. `CreateEventResult` shape matches spec exactly.
- **`ics.ts`**: No issues found. `IcsEventArgs` type is clean.
- **`server.ts`**: Exports `createSupabaseServer` (not `createClient`). All existing actions use `createSupabaseServer()` — matched correctly.
