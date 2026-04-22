# Phase 1.7 E2E Runbook — YAGI Internal Team Chat

Scope: verify the Slack-like internal team chat at `/app/team/*` end-to-end,
including realtime, admin flows, RLS, and the composer guardrails.

## Prerequisites

- **User A** — YAGI internal workspace member + yagi_admin (e.g. yagi@yagiworkshop.xyz).
- **User B** — a second YAGI internal workspace member in a different browser
  session (or a different browser profile / incognito). `ws_member` role.
- **User C** — a NON-YAGI user: any client workspace member who is NOT
  part of the YAGI internal workspace.
- Three browser sessions (or tabs with distinct auth contexts) lined up.
- `pnpm dev` running (or deployed Vercel preview). Default port: `:3001`.

## Smoke

1. **Redirect** — User A: navigate to `/app/team` — expect redirect to
   `/app/team/general`.
2. **404 for non-members** — User C: navigate to `/app/team` — expect 404.
   Also verify the sidebar/app-shell nav does NOT show the "Team chat"
   link for User C.
3. **Text message** — User A: type "hello team" in #general composer, press
   Enter — message appears immediately in the list with avatar + display
   name + timestamp.
4. **Image attachment** — User A: drag a JPG/PNG onto the composer — staged
   chip with preview thumbnail appears, status progresses
   `pending → uploading → done`, Send becomes enabled. Press Send — the
   image renders inline in the channel (signed-URL thumbnail).
5. **Realtime — other user** — User B has #general open in another browser
   session. User A posts a new message — User B sees it appear within
   ~5 seconds WITHOUT refreshing (Realtime INSERT).
6. **No scroll yank** — User A: scroll up in the message list by ~300px.
   User B posts a new message. Verify User A's scroll position is NOT
   forced back to the bottom. Scroll back to the bottom manually to
   re-enable auto-stick.
7. **New channel (admin)** — User A: click the `+` next to "Channels" in
   the sidebar. Type "design reviews" — the slug input auto-fills
   `design-reviews`. Click Create. Expect navigation to
   `/app/team/design-reviews` and a "Channel created" toast.
8. **Edit channel (admin)** — User A: click the gear icon in the
   #design-reviews header. Change the topic to "Review frames here".
   Save. The header topic updates; the channel name + slug are unchanged.
9. **Archive channel (admin)** — User A: open Edit channel dialog again,
   click "Archive channel", confirm in the AlertDialog. Expect:
   a. #design-reviews moves to the "Archived" section of the sidebar.
   b. The dialog closes; navigation still succeeds to the archived URL.
   c. The composer is hidden; a red "This channel is archived" banner
      appears beneath the header.
10. **Composer hidden when archived** — Confirm the message composer
    component is absent. (This is the UX replacement for an
    `error_send_failed` toast — the send path isn't reachable because the
    composer doesn't render for archived channels.)
11. **Members dialog** — User A: click the people icon in the channel
    header. Dialog shows both User A and User B with their avatars,
    display names, roles, and join dates. Read-only list.
12. **Unread indicator** — User A: viewing #general. User B posts a
    message in #ideas (in a different browser). User A's sidebar shows
    an unread dot next to #ideas within ~5s. Click #ideas — dot clears
    after navigation + `markChannelSeen`.
13. **Delete own message** — User A: post a throwaway message. Hover
    over it — Edit + Delete icons appear. Click Delete, confirm in the
    AlertDialog. The message disappears for User A immediately and for
    User B within ~5s (Realtime DELETE).
14. **Cannot delete others' messages (non-admin)** — User B (non-admin):
    hover over User A's message. Verify the Delete icon is NOT
    rendered. (Edit is also hidden — only the author sees Edit.)
15. **Admin can delete any message** — User A (yagi_admin): hover over
    one of User B's messages. Delete icon IS visible; Edit is NOT (only
    author can edit). Delete confirms and removes the row.
16. **Edit own message** — User A: hover, click Edit. Textarea replaces
    body. Type additional text, press Enter (or Save). Message body
    updates; an "(edited)" label appears next to it.
17. **Unarchive channel (admin)** — User A: open the archived
    #design-reviews channel via sidebar → Archived → click. In the
    archived channel, click the gear icon → "Unarchive channel" →
    confirm. Composer reappears; channel moves back to Active list in
    the sidebar.

## Guardrails

- **RLS — non-YAGI cannot SELECT channels**

  As User C (client workspace), run this in the browser DevTools
  against the deployed Supabase URL:
  ```js
  const { data, error } = await supabase.from("team_channels").select("*");
  // data === []  (or 0 rows visible)
  ```
  Expect `data` to be empty (RLS scopes channels to YAGI internal
  members + yagi_admin only).

- **RLS — non-YAGI cannot INSERT messages**

  Same user, attempt an insert targeting a known channel id (sniffed
  from admin-side). Expect 403 / empty / RLS policy denial.

- **Storage — cross-workspace path is blocked**

  Attempt to PUT a file to
  `team-channel-attachments/<some-client-workspace-id>/<random>/<random>/x.jpg`
  using any signed URL you can craft. Expect 403 — the storage RLS
  policies require `is_yagi_internal_ws(first-path-segment)` AND
  `is_ws_member(auth.uid(), first-path-segment)`.

- **Slug format (client + server)**

  Try creating a channel with:
  - Name "Test"
  - Slug `ABC123` (uppercase)

  Expect:
  - Client-side: Create button disabled AND the hint text turns red /
    shows `new_channel_slug_invalid`.
  - If you bypass the client (devtools): the `createChannel` Server
    Action rejects with `{ ok: false, error: "validation" }` because
    the Zod schema pins `^[a-z0-9][a-z0-9-]*[a-z0-9]$`.
  - The DB CHECK constraint (`team_channels.slug ~ '...'`) is the last
    line of defence.

- **Name collision**

  Create a channel with a slug that already exists (e.g. `general`).
  Expect a "Channel with this name already exists" toast —
  `unique_violation` (code 23505) is caught and mapped to
  `{ ok: false, error: "name_taken" }`.

- **Composer max attachments**

  Drag 6 files onto the composer at once. Expect: the first 5 attach
  and the 6th is rejected with a `composer_max_attachments` toast.

- **IME + Enter**

  Focus the composer. Switch the OS IME to Korean. Type "안녕" with
  composition in progress. Press Enter BEFORE committing composition.
  Expect: composition commits (no send). Press Enter AGAIN — message
  sends. This is because the composer checks
  `e.nativeEvent.isComposing` before firing submit.

## Realtime reconnect UX

- With the channel open, kill the browser's network via DevTools
  ("Offline"). Within ~10s, the channel header should display a
  yellow "Reconnecting..." or red "Disconnected" badge.
- Re-enable network — the badge should clear and new messages should
  start flowing again.

## Known limitations (explicitly out of scope)

- No threading (replies within a message)
- No DMs (1:1 / group DM)
- No reactions
- No mentions or notifications (no `@` menu, no email/push)
- No message search
- Edits don't bump message order or reset unread state

## Troubleshooting

- **Sidebar nav missing "Team chat"** — user isn't a YAGI internal
  workspace member. Add them via `workspace_members` with role
  `ws_member` AND `workspace_id = 320c1564-b0e7-481a-871c-be8d9bb605a8`.
- **Realtime badge stuck on "Reconnecting"** — check the Supabase
  project's Realtime status; also verify RLS grants SELECT on
  `team_channel_messages` to the current user (Realtime piggy-backs on
  SELECT policy for payload delivery).
- **Unread dot doesn't clear** — `markChannelSeen` requires auth; if the
  user is in a partial session state the server action silently
  succeeds but doesn't actually write. Reload and check
  `profiles.team_chat_last_seen` for that user.
