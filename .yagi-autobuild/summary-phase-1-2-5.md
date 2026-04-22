# YAGI Workshop — Phase 1.2.5 Summary

**Date:** 2026-04-22
**Status:** Complete (autopilot mode — kill-switches off)
**Build:** clean (20 routes, 0 errors, 0 warnings)
**Codex K-05:** 1 HIGH fixed, 5 MEDIUM/LOW deferred to follow-ups (task #24)

## Wave A — i18n + migrations (Builder direct)

- **i18n** (`messages/{ko,en}.json`): 28 keys added across `projects`, `refs`, `threads` namespaces. Both locales balanced.
- **Migrations applied** (live in DB; not in `supabase/migrations/` locally):
  - `phase_1_2_5_video_pdf_intake_attachments_20260422` — `project_references` cols (`media_type`, `duration_seconds`, `page_count`, `thumbnail_path`, `embed_provider`); `projects.intake_mode` + 4 proposal fields; `thread_message_attachments` table + RLS; `thread_messages` insert RLS tightened (visibility='internal' restricted to `is_yagi_admin`).
  - `thread_attachments_storage_rls_20260422` — storage bucket `thread-attachments` (private) + RLS on `storage.objects` keyed by `split_part(name,'/',1)::project_id`.
  - `phase_1_2_5_align_with_spec_20260422` — column alignment fixes (renamed `proposal` → `proposal_request`, `filename` → `file_name`, `byte_size` → `size_bytes`; tightened `media_type` enum to `('image','video','pdf')`; added `kind` + `thumbnail_path` to attachments).
- `database.types.ts` regenerated.

## Wave B — parallel agents

- **Subtasks 02+03 (video file + URL unfurl):** `src/lib/references/video.ts`, `src/lib/og-video-unfurl.ts`, extended `ref-actions.ts` (`addReference` + new `addReferenceFromUrl`), extended `reference-uploader.tsx` (video tab + branched onDrop).
- **Subtask 07 (intake mode):** `intake-mode-picker.tsx`, `proposal-fields.tsx`; 4-step wizard (`intake-mode → brief → refs → review`); `z.discriminatedUnion('intake_mode', [briefSchema, proposalSchema])` in `actions.ts`; `intake_mode` badge + Client Context card on detail page.

## Wave C — parallel agents

- **Subtasks 04+05 combined (video player + PDF):** `src/components/project/video-player.tsx` (3 render paths: upload `<video>`, YouTube/Vimeo Dialog iframe, TikTok/Instagram external link); `src/lib/references/pdf.ts` (dynamic pdfjs-dist import + CDN worker + canvas thumbnail); `pdfjs-dist@5.6.205` installed; `reference-uploader.tsx` PDF branch wires thumbnail + page_count; `reference-grid.tsx` extended with `media_type` dispatch + dual signed URLs.

## Wave D — parallel agent

- **Subtask 06 (thread attachments):** `src/lib/thread-attachments.ts` (`validateAttachment`, `uploadAttachment`, `kindForMime`); `sendMessageWithAttachments` Server Action (Zod max 5, path-safety guard, body optional when attachments present); `thread-panel-server.tsx` extended to fetch attachments + signed URLs server-side; `thread-panel.tsx` extended with composer Paperclip + drag-drop + chips + bubble rendering (image lightbox, inline `<video>`, PDF/file rows).

## Wave E — Codex K-05 + final build

- `pnpm build` clean (20 routes, 0 errors, 0 warnings).
- Codex `gpt-5.4 high reasoning` adversarial review against the 12 focus areas in `_codex_review_1_2_5_prompt.txt`.

### Findings

**HIGH (1) — fixed**
- `src/lib/thread-attachments.ts:10` / `src/components/project/thread-panel.tsx:301` — Internal attachment storage access weaker than message visibility. The row-RLS hides internal attachment rows from non-admins, but `storage.objects` RLS only checked workspace membership. A non-admin who learned a storage_path could call `createSignedUrl()` directly and download.
- **Fix applied:** migration `phase_1_2_5_thread_attachments_storage_internal_hide_20260422` adds RESTRICTIVE policy `thread_attachments_objects_hide_internal` on `storage.objects`. AND-combined with the existing PERMISSIVE select: bypass requires either `is_yagi_admin` or no matching internal-visibility row for that path. Verified policy active.

**MEDIUM/LOW (5) — deferred to task #24**
- MEDIUM: `og-video-unfurl.ts:121` — `redirect:'follow'` has no per-hop SSRF revalidation (port the og-unfurl.ts manual walker).
- MEDIUM: `thread-panel.tsx:146/392` — realtime INSERTs from other clients show messages without attachments until reload (refetch on insert).
- LOW: 1-hour attachment signed URLs expire mid-stream on slow networks (onError re-sign).
- LOW: pdfjs worker loaded from jsDelivr without SRI (self-host).
- LOW: `addReference` trusts caller-supplied `media_type` (derive server-side).

### Codex no-bug confirmations
- Discriminated-union bypass (focus 3): brief branch explicitly nulls `proposal_*` in insert payload — no leakage.
- Storage path injection (focus 4): `sendMessageWithAttachments` rejects path/project mismatches.
- `project_references` insert RLS (focus 5): membership-gated.
- Attachment cap (focus 9): Zod rejects whole request when count > 5.
- Iframe XSS (focus 11): video_id extracted then composed against fixed origins; thumbnail_url only feeds `<img src>`.
- Body nullable (focus 12): DB column allows null — attachments-only inserts compatible.

## Deviations from spec

1. Storage path: `{projectId}/{threadId}/{messageId ?? 'pending'}/{uuid}__{file_name}` instead of spec's `{workspace_id}/...` — driven by storage RLS keying on first segment.
2. No `requestThreadAttachmentUpload` action — direct client upload through bucket RLS, mirrors existing `project-references` pattern.
3. PDF thumbnails NOT generated for thread attachments — kept pdfjs out of threads bundle. PDF refs in project sidebar still get thumbnails via Subtask 05.
4. Component paths use `src/components/project/` (existing repo convention) instead of spec's `src/components/{references,threads}/`.
5. No transactional rollback on attachment insert failure — orphan message left, future cron cleanup (per spec line 357).

## What's NOT done (intentional)

- Drag-reorder of references (deferred to Phase 1.4).
- ffmpeg / video transcoding.
- In-app PDF viewer / annotator.
- Rich-text editor in thread messages.
- Rate limiting on `/api/unfurl` (deferred from Phase 1.2).
- Cron cleanup of orphan attachments.

## Files of record

- `.yagi-autobuild/results/1-2-5_01_i18n.md`
- `.yagi-autobuild/results/1-2-5_MIG_migration.md`
- `.yagi-autobuild/results/1-2-5_02-03_video.md`
- `.yagi-autobuild/results/1-2-5_07_intake.md`
- `.yagi-autobuild/results/1-2-5_04-05_video-player-pdf.md`
- `.yagi-autobuild/results/1-2-5_06_thread-attachments.md`
- `.yagi-autobuild/_codex_review_1_2_5_prompt.txt`
- `.yagi-autobuild/_codex_review_1_2_5_output.txt`

**Next:** Phase 1.3 (Meetings — Google Calendar + AI summary). Env gate clear (`GOOGLE_OAUTH_*` set). Autopilot continues.
