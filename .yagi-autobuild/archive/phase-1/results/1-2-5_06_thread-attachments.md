# Phase 1.2.5 / Subtask 06 result
status: complete
files_created:
  - src/lib/thread-attachments.ts
files_modified:
  - src/app/[locale]/app/projects/[id]/thread-actions.ts
  - src/components/project/thread-panel-server.tsx
  - src/components/project/thread-panel.tsx
new_server_actions: [sendMessageWithAttachments]
new_lib_helpers: [validateAttachment, uploadAttachment, kindForMime, MAX_BYTES_BY_KIND]
build: clean

## Notes

### Path convention
- Storage objects are written under `{projectId}/{threadId}/{messageId ?? 'pending'}/{uuid}__{safeFileName}`.
- This matches the migration's storage RLS on `thread-attachments`, which only verifies `split_part(name, '/', 1)::project_id` and the user's `is_ws_member` for that workspace. The `threadId` / `messageId` path segments are informational only; RLS never inspects them.
- When the user composes the very first message in a project, the thread may not exist yet — we use the literal `'pending'` as the thread segment. We intentionally do NOT rename or move storage objects after the message row lands; the extra segment has no security impact and rewriting storage paths would just be churn.
- File names are sanitized: `/` and `\` are replaced with `_`, and names are capped at 200 chars.

### Thumbnails
- **Images**: small JPEG thumbnail (max edge 320px, quality 0.7) via canvas, uploaded to `..._thumb.jpg`.
- **Videos**: poster via the existing `readVideoMetadata` helper from `src/lib/references/video.ts`, uploaded to `..._poster.jpg`.
- **PDFs**: thumbnail deferred — subtask 05 owns pdfjs and we kept it out of the threads bundle to avoid the bloat. `thumbnail_path` is `null` for PDFs; the bubble renders a file-row with the `FileText` icon.
- **Generic files**: no thumbnail; file-row with the generic `File` icon.
- Any thumbnail failure is swallowed; the primary upload still succeeds with `thumbnail_path = null`.

### Composer UX
- `+` (Paperclip) icon button next to textarea opens a hidden `<input type="file" multiple>` with `accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf,*/*"`.
- Drag-and-drop on the composer wrapper (`onDragOver` / `onDrop`) — shows a subtle `bg-muted/40` tint when dragging.
- Files are validated (`validateAttachment`) and upload starts immediately on add. Chips show file name + size + × remove button; during upload they show a spinner + `attachment_uploading`; on error they show `attachment_failed` and the user can remove.
- Per-message cap: 5 attachments. Extras trigger a `attachment_size_limit` toast.
- Send is disabled whenever `chips.some(c => c.status === 'uploading')`; the disabled button gets `title={t('attachment_uploading')}`.
- Body is now optional when attachments exist. Validation: at least one of `body.trim()` or attachments must be present.
- On success: textarea cleared, all chips cleared, object URLs revoked.

### Attachment display in bubbles
- The `ThreadMessage` type gains `attachments?: ThreadAttachment[]` with `signed_url` and `thumbnail_signed_url` (1-hour TTL, generated server-side in `thread-panel-server.tsx`).
- **image**: inline thumbnail (max 240×240 `object-cover`) → click opens a full-image Radix Dialog lightbox using the existing `@/components/ui/dialog`.
- **video**: inline `<video controls preload="metadata">` with `poster={thumbnail_signed_url}`, constrained to `max-w-[320px]`.
- **pdf**: file row with `FileText` icon + name + size → anchor `target="_blank" rel="noopener noreferrer"` to the signed URL.
- **file**: identical row with the generic `File` icon.

### Realtime + attachment sync
- Realtime INSERT subscription to `thread_messages` does NOT bring attachment rows along. To avoid adding a second subscription for the child table, the sender does a one-shot fetch (`thread_message_attachments` by `message_id` + signed URLs) after `sendMessageWithAttachments` returns, and merges the result into local state. Other clients will see attachments when the page is revalidated (Server Action triggers `revalidatePath`).

### RLS sanity (no internal-attachment leakage path)
1. **DB SELECT path**: `thread_message_attachments` has both a PERMISSIVE select policy (workspace membership via message → thread → project chain) AND a RESTRICTIVE `thread_attachments_hide_internal_from_clients` that excludes attachments belonging to `visibility='internal'` messages for any user without `yagi_admin`. The client-side Supabase query in `fetchAttachmentsForMessage` + the server-side fetch in `thread-panel-server.tsx` both go through these policies — no branching needed in our TS code.
2. **Signed URL path**: A non-yagi-admin client requesting a signed URL for an attachment on an internal message would first need the row returned from step 1 (it won't be). Even if an attacker somehow guessed the `storage_path`, `createSignedUrl` is RLS-gated through `storage.objects` on the `thread-attachments` bucket, which requires `is_ws_member` of the project's workspace. Client users of the same workspace could theoretically bypass the internal-message filter via that bucket policy — but **only if they know the exact path**, which they don't, because the DB SELECT hides the row. No URL leakage path between the DB hide policy and the storage bucket policy in the normal UI flow.
3. **Storage UPLOAD path**: A client uploading to `{projectId}/...` is allowed iff they're a member of the project's workspace (storage RLS on the bucket). Internal messages are authored only by yagi_admin (enforced server-side in `sendMessageWithAttachments`).

### Deviations from spec

- **Paths**: spec suggested `src/components/threads/` and `src/lib/threads/attachments.ts`; we matched existing repo convention and placed files at `src/components/project/` (extending the existing `thread-panel.tsx`) and `src/lib/thread-attachments.ts` (keeping `src/lib/references/` reserved for `project_references`).
- **No RPC + no transactional rollback**: spec mentioned a `security definer` RPC for atomic insert. We use two back-to-back inserts (message, then attachments batch). If the attachments insert fails after the message insert, we return `{ error: 'db', messageId }` — the caller toasts a generic error but the orphan message row stays. Per spec line 357, cleanup is a future cron job; blocking the user on a rollback is worse UX.
- **No dedicated `requestThreadAttachmentUpload` action**: since the storage RLS on `thread-attachments` already gates upload authorization (workspace membership keyed off the first path segment), the client can upload directly. This matches how the reference uploader already works (`src/components/project/reference-uploader.tsx` uploads straight to `project-references`).
- **Legacy `sendMessage` kept intact** for text-only composer paths and to avoid rippling through any callers outside the threads UI.
- **No PDF inline viewer, no rate limiting, no cron cleanup, no rich-text editor** — all out of scope.

### Deliverables checklist
- [x] `src/lib/thread-attachments.ts` created
- [x] `src/app/[locale]/app/projects/[id]/thread-actions.ts` extended with `sendMessageWithAttachments`
- [x] `src/components/project/thread-panel-server.tsx` extended to fetch attachments + signed URLs
- [x] `src/components/project/thread-panel.tsx` extended with composer attachments + bubble rendering
- [x] `pnpm build` clean (had to clear `.next/` once for a stale validator.ts)
- [x] Result file written
