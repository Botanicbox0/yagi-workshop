# YAGI Workshop — Cross-Phase Contracts

> **Purpose:** Single source of truth for "what does Phase X publish / consume." Future phases MUST update this doc on every new table, RPC, notification event, storage bucket, or realtime publication addition.
> **Format:** One section per shipped phase, each with sub-tables (per Phase 2.0 SPEC G7 Q2 resolution — mega-table rejected).
> **Scope:** Phase 1.1 → 1.9. Phase 1.0 is bootstrap (stack + design tokens, no runtime coupling) and is omitted.
> **Written:** Phase 2.0 G7, 2026-04-22.

---

## How to read this

Each phase section answers five questions:
1. **Tables created** — what rows does this phase own?
2. **RPCs** — what SQL-level verbs does this phase define?
3. **Notification events emitted** — which `notification_events.kind` rows get produced, from where, and who reads them?
4. **Realtime publication** — which tables this phase adds to `supabase_realtime`.
5. **Storage buckets** — which buckets this phase creates, plus the writer and reader sites.

Plus:
- **Server Actions (public API)** — the main entry points exported by the phase.
- **Cross-phase dependencies** — what this phase READS from earlier phases, and what it PUBLISHES for later phases to consume.

"(none)" = this phase adds nothing of that category.

---

## Phase 1.1 — Auth + Workspaces + Brand + Onboarding + App Shell

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `profiles` | User identity + avatar + `team_chat_last_seen` jsonb | Write: onboarding `completeOnboarding`, Settings profile form. Read: all authenticated routes |
| `workspaces` | Brand definition (name, slug, logo_url, plan) + tax fields (BRN, representative, address, tax_invoice_email) | Write: `bootstrap_workspace` RPC, Settings `updateWorkspace`. Read: workspace switcher, settings, every workspace-scoped query |
| `brands` | Design identity per workspace (typographic + palette overrides) | Write: Settings `updateBrand`. Read: brand selector, theme provider |
| `workspace_members` | Membership + role (`admin`/`member`) | Write: `bootstrap_workspace`, Settings invitation flow. Read: team panel, every RLS predicate |
| `workspace_invitations` | Email-based invite (token + status) | Write: Settings `inviteTeamMember`, `cancelInvitation`. Read: invite landing, onboarding |
| `user_roles` | Global `yagi_admin` role (workspace_id IS NULL) | Write: manually / seed. Read: admin gates, nav filters |

### RPCs

| RPC | Purpose | Caller | Security |
|-----|---------|--------|----------|
| `bootstrap_workspace(name, slug, logo_url)` | Atomic workspace + admin membership + role grant | Onboarding (first-run) | SECURITY DEFINER |
| `is_ws_admin(uid, wsid)` | Predicate: user is admin in workspace | RLS policies + app-side authorization checks | SECURITY DEFINER, STABLE |
| `is_ws_member(uid, wsid)` | Predicate: user is any member in workspace | RLS policies + app-side checks | SECURITY DEFINER, STABLE |
| `is_yagi_admin(uid)` | Predicate: user holds yagi_admin role | Admin gates, nav filters, cross-workspace ops | SECURITY DEFINER, STABLE |
| `is_yagi_internal_ws(wsid)` | Predicate: workspace is the reserved yagi-internal workspace | RLS for team_channels and other yagi-only surfaces | STABLE |

### Notification events emitted

(none — pre-dates Phase 1.8)

### Realtime publication

(none)

### Storage buckets

| Bucket | Public? | Owners (read/write) |
|--------|---------|---------------------|
| `avatars` | private | Write: Settings profile photo. Read: profile cards via signed URLs |
| `workspace-logos` | public | Write: Settings workspace logo. Read: workspace switcher, brand card (unsigned public URLs) |

### Server Actions (public API)

- `src/app/[locale]/app/settings/actions.ts` — `updateProfile`, `updateWorkspace`, `updateBrand`, `inviteTeamMember`, `updateMemberRole`, `cancelInvitation`, `acceptInvitation`
- Onboarding flow actions under `src/app/[locale]/onboarding/**/actions.ts`

### Cross-phase dependencies

**Publishes for later phases:**
- `profiles`, `workspaces`, `workspace_members`, `user_roles` tables — authentication + multi-tenancy backbone used by every downstream phase.
- `is_yagi_admin`, `is_ws_admin`, `is_ws_member`, `is_yagi_internal_ws` RPCs — authorization primitives in almost every RLS policy 1.2+.
- Auth middleware + `createSupabaseServer()` SSR pattern.
- Design system tokens (Phase 1.0.6) — inherited by every UI phase.

**Reads:** (foundation — no prior phases)

---

## Phase 1.2 — Projects, References, Threads, Messaging, Settings

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `projects` | Client commission (workspace_id, brand_id, title, brief, status enum, intake_mode, proposal fields) | Write: `createProject`, `transitionStatus`, `updateProject`. Read: project list/detail, admin view, every phase that scopes to a project |
| `project_references` | Media intake (URLs, OG metadata, `media_type`, `duration_seconds`, `page_count`, `thumbnail_path`, `embed_provider`) | Write: `addReference`, `addReferenceFromUrl`, `deleteReference`. Read: reference grid + detail |
| `project_threads` | Conversation container per project (`is_internal` visibility toggle) | Write: `getOrCreateThread`. Read: thread panel |
| `thread_messages` | Messages (body nullable when attachments-only; `visibility='internal'` restricted to yagi_admin after Phase 1.2.5 tightening) | Write: `sendMessage`, `sendMessageWithAttachments`. Read: thread panel + Phase 1.8 retrofit emit |
| `thread_message_attachments` | File storage metadata (file_name, size_bytes, kind, storage_path, thumbnail_path) | Write: `sendMessageWithAttachments`. Read: thread panel + signed URL generation |

### RPCs

(none net-new — reuses Phase 1.1 authorization helpers)

### Notification events emitted

(Phase 1.8 retrofits `thread_message_new` into `thread-actions.ts`; see Phase 1.8 below)

### Realtime publication

(none — thread updates use page revalidation, not websocket streaming)

### Storage buckets

| Bucket | Public? | Owners (read/write) |
|--------|---------|---------------------|
| `project-references` | private | Write: `addReference`, `addReferenceFromUrl`. Read: RSC reference grid via signed URLs |
| `thread-attachments` | private | Write: `sendMessageWithAttachments`. Read: thread panel server-fetch with signed URLs |

### Server Actions (public API)

- `src/app/[locale]/app/projects/new/actions.ts` — `createProject`
- `src/app/[locale]/app/projects/[id]/actions.ts` — `transitionStatus`, `updateProject`
- `src/app/[locale]/app/projects/[id]/ref-actions.ts` — `addReference`, `addReferenceFromUrl`, `deleteReference`
- `src/app/[locale]/app/projects/[id]/thread-actions.ts` — `sendMessage`, `sendMessageWithAttachments`

### Cross-phase dependencies

**Reads:** Phase 1.1 — `workspaces`, `profiles`, `user_roles`, all authorization RPCs.

**Publishes:**
- `projects` — consumed by 1.3 (meetings), 1.4 (preprod boards), 1.5 (invoice line-item suggestions), 1.9 (showcases created from boards).
- `project_references` — read by 1.4 preprod boards for reference embedding.
- `project_threads`, `thread_messages` — consumed by 1.8 notification retrofit (`thread_message_new`).
- `src/lib/og-unfurl.ts` (SSRF-hardened fetch) — reused by 1.2.5 and 1.9 for URL metadata preview.

---

## Phase 1.2.5 — Realtime + Unfurl Improvements (sub-phase)

### Tables created

(schema modifications only — no new tables)

Columns added:
- `project_references`: `media_type` ('image'|'video'|'pdf'), `duration_seconds`, `page_count`, `thumbnail_path`, `embed_provider`
- `projects`: `intake_mode` enum, `proposal_request`, `proposal_brief`, `proposal_timeline`, `proposal_deliverables`

Policies tightened:
- `thread_messages.visibility='internal'` — SELECT restricted to `is_yagi_admin(auth.uid())`.

### RPCs

(none)

### Notification events emitted

(none)

### Realtime publication

(none net-new — see Phase 1.4 for first realtime tables)

### Storage buckets

(reuses Phase 1.2 `thread-attachments`; no new buckets)

### Server Actions (public API)

- `src/app/[locale]/app/projects/[id]/ref-actions.ts` — `addReference` (enhanced for video/PDF), `addReferenceFromUrl` (new)

### Cross-phase dependencies

**Reads:** Phase 1.2 (references table + og-unfurl.ts).

**Publishes:**
- Enhanced `project_references` schema (media_type / thumbnail_path) — used by 1.4 preprod board reference embedding and 1.9 showcase media migration.

---

## Phase 1.3 — Meetings (Google Calendar + ICS email)

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `meetings` | Calendar event (project_id, workspace_id via `meetings_sync_workspace_id` trigger, title, scheduled_at, duration_minutes, status enum, calendar_sync_status, google_event_id, meet_link, summary_md, summary_sent_at, cancelled_reason) | Write: `createMeeting`, `saveMeetingSummary`, `sendMeetingSummary`, `cancelMeeting`, `markMeetingCompleted`, `retryCalendarSync`. Read: meeting list/detail, admin view |
| `meeting_attendees` | Email list (unique per `(meeting_id, email)`, `display_name`, `user_id` nullable, `is_organizer`) | Write: populated by `createMeeting`. Read: detail attendee list |

### RPCs

(reuses Phase 1.1 authorization helpers)

Triggers added:
- `meetings_sync_workspace_id_ins` / `..._upd` — copy `workspace_id` from parent project on INSERT/UPDATE so clients can't forge it (TOCTOU-safe vs. app-side derivation).

### Notification events emitted

(Phase 1.8 retrofits `meeting_scheduled`, `meeting_summary_sent` — see Phase 1.8)

### Realtime publication

(none)

### Storage buckets

(none — meeting data is metadata-only; no attachments)

### Server Actions (public API)

- `src/app/[locale]/app/meetings/actions.ts` — `createMeeting`, `saveMeetingSummary`, `sendMeetingSummary`, `cancelMeeting`, `markMeetingCompleted`, `retryCalendarSync`

### Cross-phase dependencies

**Reads:**
- Phase 1.2 `projects` — meeting scoped to a project.
- Phase 1.1 `profiles` — attendee name resolution.
- External: Google OAuth (`GOOGLE_OAUTH_*` env), Resend (ICS email fallback).

**Publishes:**
- `meetings` — consumed by 1.5 `suggestLineItems` (completed meetings surface as invoice line-item suggestions) and by 1.8 notification retrofit.
- `src/lib/email/send-meeting.ts` — transactional email pattern re-used by later phases.
- `src/lib/google/calendar.ts` — external-API wrapper establishing the "try primary, fallback on failure, record sync_status" pattern.

---

## Phase 1.4 — Preprod (Storyboards / Boards / Frames / Approval)

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `preprod_boards` | Design board (project_id, workspace_id locked to yagi-internal via `preprod_boards_set_workspace_id` trigger, title, description, status enum: draft/shared/approved/archived, share_token, share_token_rotated_at) | Write: `createBoard`, `updateBoardTitle`, `shareBoard`, `unshareBoard`, `rotateShareToken`, `approveBoard`, `revertApproval`, `archiveBoard`. Read: board list, editor, public `/s/[token]` share page |
| `preprod_frames` | Media frame per board (board_id, frame_order, media_type, media_storage_path, thumbnail_path, media_external_url, media_embed_provider, caption, is_current_revision) | Write: `addFrame`, `addFrameFromUrl`, `updateFrame`, `deleteFrame`, `reorderFrames`, `createFrameRevision`, `restoreFrameRevision`. Read: editor canvas, revision history, share page |
| `preprod_frame_reactions` | Feedback emoji (frame_id, reactor_email, bucket enum) | Write: `/api/share/[token]/reactions/route.ts` upsert. Read: editor feedback stats + realtime subscription |
| `preprod_frame_comments` | Structured feedback (frame_id, author_email, body, is_resolved) | Write: `/api/share/[token]/comments/route.ts` insert + `resolveComment`/`unresolveComment`. Read: editor comments + realtime |

### RPCs

(authorization helpers only)

### Notification events emitted

(Phase 1.8 retrofits — see Phase 1.8)

### Realtime publication

| Table | Since |
|-------|-------|
| `preprod_frame_reactions` | Phase 1.4 |
| `preprod_frame_comments` | Phase 1.4 |

### Storage buckets

| Bucket | Public? | Owners (read/write) |
|--------|---------|---------------------|
| `preprod-frames` | private | Write: `addFrame`, `addFrameFromUrl`, `createFrameRevision`. Read: editor canvas (signed URLs) + `/s/[token]` share page (service-role signed URLs) |

### Server Actions (public API)

- `src/app/[locale]/app/preprod/actions.ts` — `createBoard`
- `src/app/[locale]/app/preprod/[id]/actions.ts` — `addFrame`, `addFrameFromUrl`, `updateFrame`, `deleteFrame`, `reorderFrames`, `updateBoardTitle`, `createFrameRevision`, `restoreFrameRevision`, `resolveComment`, `unresolveComment`
- `src/app/[locale]/app/preprod/[id]/share-actions.ts` — `shareBoard`, `unshareBoard`, `rotateShareToken`, `approveBoard`, `archiveBoard`, `revertApproval`

### Cross-phase dependencies

**Reads:**
- Phase 1.2 `projects` + `project_references` (embedded in share page).
- Phase 1.1 `is_yagi_admin` for board creation; seed-data-created `yagi-internal` workspace for trigger-locked workspace_id.

**Publishes:**
- `preprod_boards`, `preprod_frames` — read by 1.5 `suggestLineItems` (approved boards) and by 1.9 `createShowcaseFromBoard`.
- Realtime reactions/comments — consumed by 1.8 `feedback_received` debounced event.
- Share-token + service-role walled-island pattern (`/s/[token]`) — reused by 1.9 `/showcase/[slug]`.

---

## Phase 1.5 — Invoicing (Popbill integration, line items, print page)

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `invoices` | Tax invoice header (workspace_id, project_id nullable, supplier_id, status enum: draft/issued/paid/void, subtotal_krw / vat_krw / total_krw via `recalc_invoice_totals` trigger, popbill_mgt_key UNIQUE, popbill_response jsonb, is_mock, nts_approval_number, invoice_number, issue_date, supply_date, memo) | Write: `createInvoice`, `issueInvoice`, `markPaid`, `voidInvoice`. Read: invoice list/detail, admin dashboard, print page |
| `invoice_line_items` | Rows (invoice_id, item_name, specification, quantity, unit_price_krw, supply_krw, vat_krw, display_order, source_type enum: meeting/board/manual, source_id) | Write: `addLineItem`, `updateLineItem`, `deleteLineItem`, `reorderLineItems`, `bulkAddFromSuggestions`. Read: invoice editor, suggest dialog, print page |
| `supplier_profile` | Single-row YAGI org metadata (BRN, corporate_name, representative_name, address, business_type, business_item, tax_invoice_email) | Seeded at migration. Read: invoice issuance + print page |

### RPCs

Trigger function:
- `recalc_invoice_totals()` — SECURITY DEFINER, fires AFTER INSERT/DELETE/UPDATE on `invoice_line_items`; recalculates parent invoice totals. Phase 2.0 G5 #1 pinned `search_path = public, pg_temp`.

### Notification events emitted

(Phase 1.8 retrofits `invoice_issued` — see Phase 1.8)

### Realtime publication

(none)

### Storage buckets

(none — invoice print is a server-rendered HTML page, no PDF storage)

### Server Actions (public API)

- `src/app/[locale]/app/invoices/actions.ts` — `createInvoice`
- `src/app/[locale]/app/invoices/[id]/actions.ts` — `issueInvoice`, `markPaid`, `voidInvoice`
- `src/app/[locale]/app/invoices/[id]/line-item-actions.ts` — `addLineItem`, `updateLineItem`, `deleteLineItem`, `reorderLineItems`, `bulkAddFromSuggestions`, `fetchSuggestions`

### Cross-phase dependencies

**Reads:**
- Phase 1.2 `projects` — buyer context, line-item source lookup.
- Phase 1.3 `meetings` — completed meetings surface as line-item suggestions.
- Phase 1.4 `preprod_boards`, `preprod_frames` — approved boards surface as line-item suggestions.
- Phase 1.1 `workspaces` (buyer BRN, business address).
- External: Popbill SDK (`POPBILL_MODE=mock|test|production` — currently `mock` end-to-end; test/production paths wired but `issueTaxInvoice` NOT_IMPLEMENTED, see `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md`).

**Publishes:**
- `invoices` + `invoice_line_items` + `recalc_invoice_totals` trigger — canonical billing state.
- Mock-mode-gate pattern (`src/lib/popbill/client.ts`) — template for "production-dangerous features that run in mock until flipped".

---

## Phase 1.6 — Public Landing + MDX Journal

### Tables created

(none — pure content + marketing)

### RPCs

(none)

### Notification events emitted

(none)

### Realtime publication

(none)

### Storage buckets

(none)

### Server Actions (public API)

(none — Server Components + SSG only)

### Cross-phase dependencies

**Reads:**
- Content Collections (`content/journal/*.mdx`).
- Phase 1.0.6 design tokens.

**Publishes:**
- OG image endpoint pattern (`/api/og/route.tsx`) — reused by Phase 1.9 (`/api/showcases/[id]/og`).
- `sitemap.ts` — extended by Phase 1.9 with showcase entries.
- `site-footer.tsx` locale toggle — Phase 2.0 G4 #7 hardened to fall back to `/journal` index when on a journal article with no locale twin.

---

## Phase 1.7 — Team Chat (team_channels + messages + attachments)

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `team_channels` | YAGI-internal conversation channel (workspace_id locked to yagi-internal, name, slug UNIQUE, topic, is_archived, created_by) | Write: `createChannel`, `updateChannel`, `archiveChannel`, `unarchiveChannel` (yagi_admin or ws_admin). Read: channel sidebar + view |
| `team_channel_messages` | Message text (channel_id, author_id, body CHECK 1..5000, edited_at) | Write: `sendMessage`, `editMessage`, `deleteMessage`. Read: channel view, realtime subscription, unread-dot via `profiles.team_chat_last_seen` jsonb |
| `team_channel_message_attachments` | File metadata (message_id, file_name, mime_type, size_bytes CHECK ≤ 500MB, kind enum: image/video/pdf/file, storage_path, thumbnail_path) | Write: `sendMessage` (metadata row; bytes go directly to Storage via signed upload URL). Read: message bubble rendering |

### RPCs

(none net-new — authorization helpers reused)

### Notification events emitted

(Phase 1.8 retrofits `team_channel_mention` — see Phase 1.8; mention resolution is workspace-scoped via `workspace_members` intersection after Phase 1.8 H8 fix)

### Realtime publication

| Table | Since |
|-------|-------|
| `team_channel_messages` | Phase 1.7 |
| `team_channel_message_attachments` | Phase 1.7 |

### Storage buckets

| Bucket | Public? | Owners (read/write) |
|--------|---------|---------------------|
| `team-channel-attachments` | private | Write: browser-direct upload via signed URL issued by `requestUploadUrls`; server metadata insert by `sendMessage`. Read: composer preview + message bubble, signed URLs. Path-safety: must live under `{workspace_id}/{channel_id}/{messageId}/...` (Phase 2.0 G4 #4 added `..` traversal rejection) |

### Server Actions (public API)

- `src/app/[locale]/app/team/[slug]/actions.ts` — `sendMessage`, `editMessage`, `deleteMessage`, `createChannel`, `updateChannel`, `archiveChannel`, `unarchiveChannel`, `markChannelSeen` (Phase 2.0 G4 #5 now surfaces real errors), `getMessage`

### Cross-phase dependencies

**Reads:**
- Phase 1.1 `workspaces` (yagi-internal lookup), `profiles` (author + unread map), `is_yagi_internal_ws` / `is_ws_admin` / `is_yagi_admin`.
- Phase 1.4 realtime pattern (same `postgres_changes` shape).

**Publishes:**
- `team_channel_messages` realtime table — consumed by Phase 1.8 mention-detection retrofit.
- Browser-direct-upload-via-signed-URL pattern — reused by Phase 1.9 showcase media uploads.
- Storage path-prefix authorization pattern (`{workspace_id}/{channel_id}/{messageId}/`) — template for future attachment buckets.

---

## Phase 1.8 — Notifications (events + preferences + Edge Function dispatch + Resend + cron)

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `notification_events` | Event log (kind enum, severity enum: high/medium/low, user_id, workspace_id, project_id nullable, payload jsonb, url_path, read_at, email_batch_id nullable, email_sent_at nullable, created_at) | Write: `emitNotification`, `emitDebouncedNotification` (service-role). Read: bell panel (per-user Realtime), Edge Function `notify-dispatch`, admin |
| `notification_preferences` | User settings (user_id, email_immediate_enabled, email_digest_enabled, digest_time_local, quiet_hours_start/end, timezone CHECK against `src/lib/notifications/timezones.ts` allowlist after Phase 2.0 G4 #3) | Write: `updateNotificationPreferences`. Read: Edge Function path selection |
| `notification_unsubscribe_tokens` | One-time unsubscribe links (token UNIQUE, user_id, used_at, created_at) | Write: generated at `emitNotification`; `confirmUnsubscribe` atomic-claims via `used_at IS NULL` guard (Phase 2.0 G4 #1). Read: `/unsubscribe/[token]` service-role page |

### RPCs

| RPC | Purpose | Caller | Security |
|-----|---------|--------|----------|
| `resolve_user_ids_by_emails(p_emails text[])` | Batch email → user_id lookup returning `TABLE(email, user_id)` | Phase 1.3 / 1.7 notification helpers for attendee/mention resolution | SECURITY DEFINER |

### Notification events emitted

Phase 1.8 defines the event types; individual `emitNotification(...)` call sites are distributed across every prior feature phase.

| Kind | Severity | Triggered by | Subscribers |
|------|----------|--------------|-------------|
| `meeting_scheduled` | high | Phase 1.3 `createMeeting` | Attendees resolved to YAGI user_ids (email + in-app bell) |
| `meeting_summary_sent` | medium | Phase 1.3 `sendMeetingSummary` | Attendees |
| `board_shared` | medium | Phase 1.4 `shareBoard` | Project workspace_members |
| `board_approved` | high | Phase 1.4 `approveBoard` | Project workspace_members |
| `revision_uploaded` | medium | Phase 1.4 `createFrameRevision` | Board feedback recipients |
| `frame_uploaded_batch` (debounced) | low | Phase 1.4 `addFrame` / `addFrameFromUrl` | Board feedback recipients |
| `feedback_received` (debounced) | medium | Phase 1.4 `/api/share/[token]/reactions` + `/comments` | Board owner |
| `invoice_issued` | high | Phase 1.5 `issueInvoice` | Project workspace admins |
| `thread_message_new` | medium | Phase 1.2 `sendMessage` (retrofit in `thread-actions.ts`; Phase 2.0 G4 #2 removed cross-workspace yagi-admin fan-out) | `workspace_members` of the project's workspace |
| `team_channel_mention` | high | Phase 1.7 `sendMessage` when `@name` detected (workspace-scoped via yagi-internal `workspace_members` intersection) | Mentioned YAGI-internal members (email + in-app) |
| `showcase_published` | medium | Phase 1.9 `publishShowcase` | Project workspace_members |

### Realtime publication

| Table | Since |
|-------|-------|
| `notification_events` | Phase 1.8 |

### Storage buckets

(none — dispatch is metadata-only)

### Server Actions (public API)

- `src/lib/notifications/emit.ts` — `emitNotification`, `emitDebouncedNotification` (library; called from feature-phase actions)
- `src/app/[locale]/app/settings/notifications/actions.ts` — `updateNotificationPreferences`
- `src/app/[locale]/app/notifications/actions.ts` — bell panel read/mark actions
- `src/app/unsubscribe/[token]/actions.ts` — `confirmUnsubscribe`

**Edge Function:**
- `supabase/functions/notify-dispatch/index.ts` — invoked by pg_cron (`*/10 * * * *`); reads pending events, respects prefs + quiet hours + timezone, sends via Resend, stamps `email_sent_at`.

### Cross-phase dependencies

**Reads:**
- Every prior phase's actions — 11 event kinds wired into 1.2 / 1.3 / 1.4 / 1.5 / 1.7 / 1.9.
- Phase 1.1 `profiles` — email + display_name.
- `notification_preferences` — per-user opt-out.
- External: Resend (`RESEND_API_KEY` secret in Edge runtime).

**Publishes:**
- `emitNotification` / `emitDebouncedNotification` — the canonical notification entrypoint for all future phases.
- Debounce pattern (10-min aggregation + partial unique index race guard) — template for batched events.
- Edge Function + pg_cron dispatch — template for background jobs (next use-case: digest email).
- React Email bilingual rendering (`notification-immediate.tsx`, `notification-digest.tsx`).
- Unsubscribe flow (token → landing → atomic confirm) — reusable for future opt-out surfaces.

---

## Phase 1.9 — Public Showcase Viewer (showcases + showcase_media + share flow)

### Tables created

| Table | Purpose | Owners (read/write) |
|-------|---------|---------------------|
| `showcases` | Portfolio piece (project_id, workspace_id, slug UNIQUE, title, narrative_md, cover_media_type/path/external_url, status enum: draft/published/archived, made_with_yagi boolean, view_count, password_hash bcrypt, badge_removal_requested/approved_at/by/denied_at/reason, og_image_path / og_image_regenerated_at, published_at) | Write: `createShowcaseFromBoard` (Phase 2.0 G6 L1 now retries on 23505 slug collisions), `publishShowcase`, `unpublishShowcase`, `updateShowcase`, `setShowcaseCover`, `setShowcasePassword`, `requestBadgeRemoval`, `approveBadgeRemoval`, `denyBadgeRemoval`. Read: admin list + editor, public viewer, OG endpoint |
| `showcase_media` | Frames or uploaded media (showcase_id, media_type enum: image/video/video_embed, storage_path for image/video, external_url + embed_provider for video_embed, thumbnail_path, caption, sort_order UNIQUE per showcase) | Write: `addShowcaseMedia`, `removeShowcaseMedia`, `reorderShowcaseMedia`, `requestShowcaseUploadUrls`. Read: admin editor, public viewer, OG image render |

### RPCs

| RPC | Purpose | Caller | Security |
|-----|---------|--------|----------|
| `increment_showcase_view(sid uuid)` | Atomic `view_count` increment; predicate gates `status='published'` | Public viewer `/showcase/[slug]` | SECURITY DEFINER — race-safe single call |

### Notification events emitted

(`showcase_published` wired directly in this phase — see Phase 1.8 table for subscriber resolution)

### Realtime publication

(none — showcase viewing is read-only with eventual-consistent view count)

### Storage buckets

| Bucket | Public? | Owners (read/write) |
|--------|---------|---------------------|
| `showcase-media` | private | Write: `addShowcaseMedia` + `requestShowcaseUploadUrls`. Read: admin editor + public viewer via service-role signed URLs |
| `showcase-og` | public | Write: `/api/showcases/[id]/og` lazy render on first viewer fetch post-publish. Read: social crawlers via unsigned public URLs |

### Server Actions (public API)

- `src/app/[locale]/app/showcases/actions.ts` — `createShowcaseFromBoard`, `publishShowcase`, `unpublishShowcase`, `updateShowcase`, `addShowcaseMedia`, `removeShowcaseMedia`, `reorderShowcaseMedia`, `setShowcaseCover`, `setShowcasePassword`, `requestBadgeRemoval`, `approveBadgeRemoval`, `denyBadgeRemoval`, `requestShowcaseUploadUrls`

### Cross-phase dependencies

**Reads:**
- Phase 1.2 `projects` (project context).
- Phase 1.4 `preprod_boards` + `preprod_frames` — `createShowcaseFromBoard` copies current-revision frames into `showcase_media`.
- Phase 1.2.5 media-type enrichment — inherited by `showcase_media.media_type`.
- Phase 1.6 infrastructure — landing `/work` list + sitemap + OG endpoint pattern.
- Phase 1.8 — emits `showcase_published`.

**Publishes:**
- `/showcase/[slug]` public viewer — reusable public walled-island pattern (service-role lookup + optional password gate + view-count RPC).
- OG image endpoint + lazy regen flow — template for dynamic OG per entity.
- `increment_showcase_view` — atomic counter template for future viral metrics.
- Badge-removal request-approve-deny workflow — community-trust template.

---

## Open verification questions (for Codex K-05)

Items surfaced during contracts authoring that could not be verified inside this session. Flagged here so Codex's independent audit validates or files a finding:

1. **Phase 1.1 `workspace_admin` role materialization.** `is_ws_admin(uid, wsid)` — does it consult `user_roles` (role='workspace_admin', workspace_id=wsid) or only `workspace_members.role='admin'`? Confirm which one the baseline function body actually checks.

2. **Phase 1.2 / 1.2.5 `thread_messages` visibility RLS.** Confirm the tightening ("`visibility='internal'` SELECT requires `is_yagi_admin`") is applied in the baseline via a RESTRICTIVE policy, not just claimed in the summary.

3. **Phase 1.3 `meetings_sync_workspace_id` trigger body.** Confirm the BEFORE INSERT/UPDATE trigger actually copies `workspace_id` from the parent `projects` row (not from `NEW.workspace_id`). Important for the HIGH #3 TOCTOU fix claim.

4. **Phase 1.4 yagi-internal workspace seed.** Confirm the baseline contains an INSERT / DO-block that creates `workspaces (slug='yagi-internal')` — the preprod board trigger depends on this row existing.

5. **Phase 1.5 popbill mock-mode production safety guard.** Confirm `src/lib/popbill/client.ts` actually throws at module load (not just at `issueTaxInvoice` call) when `POPBILL_MODE=mock && VERCEL_ENV='production'`. Phase 2.0 G3 CLAUDE.md note claims this; verify.

6. **Phase 1.8 realtime publication members.** Confirm the baseline `alter publication supabase_realtime add table` block includes all three of `notification_events`, `team_channel_messages`, `team_channel_message_attachments` (plus Phase 1.4's reactions/comments). G2 summary says these are in the "manual supplement" section.

7. **Phase 1.8 `thread_message_new` retrofit site.** Confirm `src/app/[locale]/app/projects/[id]/thread-actions.ts` actually calls `emitNotification({ kind: 'thread_message_new', ... })` — Phase 2.0 G4 #2 removed the cross-workspace fan-out, so the remaining fan-out should be workspace_members only.

8. **Phase 1.9 `increment_showcase_view` predicate.** Confirm the RPC body includes `WHERE id = sid AND status = 'published'` (not just `WHERE id = sid`). Draft showcases must not be able to accumulate views.

---

**End of contracts.md. Update policy: every new table / RPC / notification event / storage bucket / realtime publication member MUST add its entry here in the same PR.**
