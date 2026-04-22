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
| `workspace_invitations` | Email-based invite (token + status) | Write: Settings `inviteMember`, onboarding `sendInvitationsAction`. Read: invite landing, onboarding, Phase 1.3 meetings/new attendee email fallback |
| `user_roles` | Role grants. Values: `creator` / `workspace_admin` / `workspace_member` (workspace-scoped) and `yagi_admin` (global, `workspace_id IS NULL`) | Write: `bootstrap_workspace`, manual / seed. Read: admin gates, nav filters |

### RPCs

| RPC | Purpose | Caller | Security |
|-----|---------|--------|----------|
| `bootstrap_workspace(name, slug, logo_url)` | Atomic workspace + admin membership + role grant | Onboarding (first-run) | SECURITY DEFINER |
| `is_ws_admin(uid, wsid)` | Predicate: user is admin in workspace | RLS policies + app-side authorization checks | SECURITY DEFINER, STABLE |
| `is_ws_member(uid, wsid)` | Predicate: user is any member in workspace | RLS policies + app-side checks | SECURITY DEFINER, STABLE |
| `is_yagi_admin(uid)` | Predicate: user holds yagi_admin role | Admin gates, nav filters, cross-workspace ops | SECURITY DEFINER, STABLE |
| `is_yagi_internal_ws(wsid)` | Predicate: workspace is the reserved yagi-internal workspace | RLS for team_channels and other yagi-only surfaces | SECURITY DEFINER, STABLE |

### Notification events emitted

(none — pre-dates Phase 1.8)

### Realtime publication

(none)

### Storage buckets

| Bucket | Public? | Owners (read/write) |
|--------|---------|---------------------|
| `avatars` | private | Write: Settings profile photo. Read: profile cards via signed URLs |
| `workspace-logos` | public | Write: Settings workspace logo. Read: workspace switcher, brand card (unsigned public URLs) |
| `brand-logos` | public | Write: onboarding `createBrandAction`, Settings brand logo. Read: brand selector, theme provider (unsigned public URLs) |

### Server Actions (public API)

- `src/app/[locale]/app/settings/actions.ts` — `updateProfile`, `updateAvatarUrl`, `updateWorkspace`, `inviteMember`, `removeMember`
- `src/lib/onboarding/actions.ts` — `createProfileAction`, `createWorkspaceAction`, `createBrandAction`, `sendInvitationsAction`

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
| `projects` | Client commission (workspace_id, brand_id, title, brief, status enum, intake_mode, proposal fields) | Write: `createProject`, `transitionStatus`. Read: project list/detail, admin view, every phase that scopes to a project |
| `project_milestones` | Timeline markers (project_id, title, description, due_at, status enum: pending/in_progress/completed/skipped, position) | Write: project detail milestones editor. Read: project detail timeline view |
| `project_deliverables` | Submitted deliverables (project_id, version, submitted_by, storage_paths text[], external_urls text[], note, status enum: submitted/changes_requested/approved, reviewed_by, review_note) | Write: project deliverables form. Read: project detail deliverables tab, admin review |
| `project_references` | Media intake (URLs, OG metadata, `media_type`, `duration_seconds`, `page_count`, `thumbnail_path`, `embed_provider`) | Write: `addReference`, `addReferenceFromUrl`, `removeReference`. Read: reference grid + detail |
| `project_threads` | Conversation container per project (id, project_id, title, created_by, created_at) | Write: thread-actions on first message. Read: thread panel |
| `thread_messages` | Messages (body nullable when attachments-only; `visibility` enum `shared`/`internal`; a RESTRICTIVE SELECT policy hides `internal` from non-authors who are not `yagi_admin`) | Write: `sendMessage`, `sendMessageWithAttachments`. Read: thread panel + Phase 1.8 retrofit emit |
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
| `project-deliverables` | private | Write: deliverables form (`deliverables_insert` storage policy authenticates writers). Read: project detail deliverables tab via `deliverables_read` (joins `project_deliverables` → `projects` → workspace membership) |
| `thread-attachments` | private | Write: `sendMessageWithAttachments`. Read: thread panel server-fetch with signed URLs |

### Server Actions (public API)

- `src/app/[locale]/app/projects/new/actions.ts` — `createProject`
- `src/app/[locale]/app/projects/[id]/actions.ts` — `transitionStatus`
- `src/app/[locale]/app/projects/[id]/ref-actions.ts` — `addReference`, `addReferenceFromUrl`, `removeReference`
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
- `thread_messages.visibility='internal'` — RESTRICTIVE SELECT policy `thread_msgs_hide_internal_from_clients` hides internal messages from non-privileged workspace members. Specifically: reads are allowed when `visibility='shared' OR is_yagi_admin(auth.uid()) OR author_id = auth.uid()`. Authors can still read their own internal drafts; other workspace members cannot.

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
- Phase 1.1 `workspace_invitations` — `meetings/new/page.tsx` reads accepted-invite rows as an email fallback when a workspace member has no profile email exposed via RLS.
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

The UI (`src/components/preprod/board-editor.tsx`) subscribes via Supabase Realtime `postgres_changes` to both `preprod_frame_reactions` and `preprod_frame_comments`. **Publication membership for these tables is unverified in the Phase 2.0 G2 baseline dump** — the dump only explicitly adds `notification_events`, `team_channel_messages`, and `team_channel_message_attachments` to `supabase_realtime`. This is filed as an open investigation at `.yagi-autobuild/phase-2-1/INVESTIGATION-H1-realtime-live.md`. Depending on resolution, either the baseline is incomplete (safe — just backfill the supplement) or preprod feedback realtime is silently broken in production (needs a migration to add the tables to the publication).

| Table | Status |
|-------|--------|
| `preprod_frame_reactions` | UI subscribes; publication membership UNVERIFIED — see investigation file |
| `preprod_frame_comments` | UI subscribes; publication membership UNVERIFIED — see investigation file |

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
- Phase 1.1 `is_yagi_admin` for board creation; the `preprod_boards_set_workspace_id` trigger looks up `workspaces` by `slug='yagi-internal'`. That row is seeded by migration `20260423020100_seed_yagi_internal_workspace` (Phase 2.1 G3) — `id='320c1564-b0e7-481a-871c-be8d9bb605a8'`, `name='YAGI Internal'`, `plan='custom'`, `brand_guide={}`. Insert is idempotent (`ON CONFLICT DO NOTHING`) so clean-clone `supabase db reset` creates the row; live DB (where the row already existed from a Phase 1.1 manual bootstrap) silently no-ops.

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
| `invoice_line_items` | Rows (invoice_id, item_name, specification, quantity, unit_price_krw, supply_krw, vat_krw, display_order, source_type enum: `manual`/`meeting`/`storyboard`/`deliverable`, source_id) | Write: `addLineItem`, `updateLineItem`, `deleteLineItem`, `reorderLineItems`, `bulkAddFromSuggestions`. Read: invoice editor, suggest dialog, print page |
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
- External: Popbill SDK (`POPBILL_MODE=mock|test|production`, default `test`; currently set to `test` in `.env.local`). Test and production paths are guarded: `issueTaxInvoice()` returns a structured `{error_code: "NOT_IMPLEMENTED", details: {phase: "2.2", mode, intent: "issueTaxInvoice"}}` result (not a bare error), which the `issueInvoice` server action maps to a dedicated `popbill_not_implemented` return code, and the UI renders via the bilingual `invoices.error_popbill_not_implemented` i18n key. Only the `mock` path is end-to-end until Phase 2.2 wires the real SDK. Production-safety guard in `src/lib/popbill/client.ts:9` throws at module load when `POPBILL_MODE=mock && NEXT_PUBLIC_VERCEL_ENV === 'production'`. See `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md` for the flip procedure and `.yagi-autobuild/phase-2-1/G4_POPBILL_GUARDED.md` for the guard-hardening diff summary.

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
| `notification_events` | Event log. Columns: `id`, `user_id`, `project_id` (nullable), `workspace_id` (nullable), `kind` text, `severity` enum check (`high`/`medium`/`low`), `title` text, `body` text nullable, `url_path` text nullable, `payload` jsonb nullable, `email_sent_at` timestamptz nullable, `email_batch_id` uuid nullable, `in_app_seen_at` timestamptz nullable, `created_at`. | Write: `emitNotification`, `emitDebouncedNotification` (service-role). Read: bell panel (per-user Realtime + mark-seen sets `in_app_seen_at`), Edge Function `notify-dispatch` (stamps `email_sent_at`), admin |
| `notification_preferences` | User settings (user_id, email_immediate_enabled, email_digest_enabled, digest_time_local, quiet_hours_start/end, timezone CHECK against `src/lib/notifications/timezones.ts` allowlist after Phase 2.0 G4 #3) | Write: `updateNotificationPreferences`. Read: Edge Function path selection |
| `notification_unsubscribe_tokens` | One-time unsubscribe links (token UNIQUE, user_id, used_at, created_at) | Write: generated at `emitNotification`; `confirmUnsubscribe` atomic-claims via `used_at IS NULL` guard (Phase 2.0 G4 #1). Read: `/unsubscribe/[token]` service-role page |

### RPCs

| RPC | Purpose | Caller | Security |
|-----|---------|--------|----------|
| `resolve_user_ids_by_emails(p_emails text[])` | Batch email → user_id lookup returning `TABLE(email, user_id)` | Phase 1.3 / 1.7 notification helpers for attendee/mention resolution | SECURITY DEFINER |

### Notification events emitted

Phase 1.8 defines the event types; individual `emitNotification(...)` call sites are distributed across every prior feature phase.

Severity values below come from `src/lib/notifications/kinds.ts:22-34` (authoritative `SEVERITY_BY_KIND` registry); fan-out comes from the `_emit*Notifications` helpers next to each emitter.

| Kind | Severity | Triggered by | Fan-out (subscribers) |
|------|----------|--------------|-----------------------|
| `meeting_scheduled` | high | Phase 1.3 `createMeeting` | Attendees resolved via `resolve_user_ids_by_emails` (email + in-app bell) |
| `meeting_summary_sent` | high | Phase 1.3 `sendMeetingSummary` | Attendees resolved via `resolve_user_ids_by_emails` |
| `board_shared` | high | Phase 1.4 `shareBoard` | `workspace_members` of the board's workspace |
| `board_approved` | high | Phase 1.4 `approveBoard` | Global `yagi_admin`s (NOT workspace_members — approval is a YAGI-internal milestone) |
| `revision_uploaded` | medium | Phase 1.4 `createFrameRevision` | Board feedback recipients (share-token reviewers) |
| `frame_uploaded_batch` (debounced) | medium | Phase 1.4 `addFrame` / `addFrameFromUrl` | Board feedback recipients |
| `feedback_received` (debounced) | medium | Phase 1.4 `/api/share/[token]/reactions` + `/comments` | All `yagi_admin`s (debounced per user × board × 10 min window) |
| `invoice_issued` | high | Phase 1.5 `issueInvoice` | Project workspace admins |
| `thread_message_new` | low | Phase 1.2 `sendMessage` (retrofit in `thread-actions.ts`; Phase 2.0 G4 #2 removed cross-workspace yagi-admin fan-out) | `workspace_members` of the project's workspace |
| `team_channel_mention` | low | Phase 1.7 `sendMessage` when `@name` detected (workspace-scoped via yagi-internal `workspace_members` intersection) | Mentioned YAGI-internal members (email + in-app) |
| `showcase_published` | high | Phase 1.9 `publishShowcase` | `workspace_members` of the project's workspace |

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
| `showcase_media` | Frames or uploaded media (showcase_id, media_type enum: `image`/`video_upload`/`video_embed`, storage_path for image/video_upload, external_url + embed_provider for video_embed, thumbnail_path, caption, sort_order UNIQUE per showcase) | Write: `addShowcaseMedia`, `removeShowcaseMedia`, `reorderShowcaseMedia`, `requestShowcaseUploadUrls`. Read: admin editor, public viewer, OG image render |

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

## Known gaps and P2.1 investigations

Resolutions from Phase 2.0 G7 Codex K-05 independent audit, plus items explicitly deferred to Phase 2.1. The 8 open questions that were authored into the initial draft have all been resolved against the baseline + code; the record below is their terminal state.

### Resolved (in-doc)

1. **`is_ws_admin` source.** CONFIRMED — checks only `workspace_members.role='admin'`, not `user_roles`. The `workspace_admin` value in `user_roles` is separately materialized but not consulted by this predicate. (baseline.sql:158-160)
2. **`thread_messages` internal visibility.** CORRECTED — policy `thread_msgs_hide_internal_from_clients` allows `visibility='shared' OR is_yagi_admin OR author_id=auth.uid()`. Message authors can read their own internal messages. Documented above in Phase 1.2 / 1.2.5 sections.
3. **`meetings_sync_workspace_id` trigger body.** CONFIRMED — trigger selects `p.workspace_id` from `public.projects p WHERE p.id = NEW.project_id` and assigns to `NEW.workspace_id`. TOCTOU-safe by design.
4. **Phase 1.3 `workspace_invitations` read dependency.** CORRECTED — added to Phase 1.3 reads section.
5. **Popbill module-load guard.** CORRECTED — the guard checks `NEXT_PUBLIC_VERCEL_ENV`, not `VERCEL_ENV`. Documented in Phase 1.5 cross-phase dependencies.
6. **`thread_message_new` retrofit fan-out.** CONFIRMED — post-G4 emitter fans to `workspace_members` of the project's workspace only; no cross-workspace yagi-admin leak. Documented in Phase 1.8 notification matrix.
7. **`increment_showcase_view` predicate.** CONFIRMED — RPC body filters `WHERE id = sid AND status = 'published'`. Draft showcases cannot accumulate views.

### Deferred to Phase 2.1 (investigation files)

8. **Preprod feedback realtime publication membership.** DEFERRED — unverified in this session. The UI subscribes via `postgres_changes` to `preprod_frame_reactions` and `preprod_frame_comments`, but the G2 baseline dump does not add either table to `supabase_realtime`. Two hypotheses (live DB missing publication rows vs. baseline capture gap) are recorded in `.yagi-autobuild/phase-2-1/INVESTIGATION-H1-realtime-live.md` with a verification SQL query and fix paths for each outcome. This is the only Codex HIGH finding carried forward.

### External prerequisites (not seeded by authoritative migrations)

- **(resolved 2026-04-23 Phase 2.1 G3)** ~~`workspaces` row with `slug='yagi-internal'`.~~ Now seeded by `supabase/migrations/20260423020100_seed_yagi_internal_workspace.sql` with the exact id (`320c1564-b0e7-481a-871c-be8d9bb605a8`) and values captured from the live row, idempotent via `ON CONFLICT DO NOTHING`. Clean-clone `supabase db reset` now bootstraps preprod and team-chat paths without manual operator intervention. See Phase 1.4 "Reads" above for the new canonical description.

---

**End of contracts.md. Update policy: every new table / RPC / notification event / storage bucket / realtime publication member MUST add its entry here in the same PR.**
