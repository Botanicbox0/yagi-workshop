# Phase 1.2.5 / MIG result
status: complete
files_modified: [src/lib/supabase/database.types.ts]
migrations_applied: [
  phase_1_2_5_video_pdf_intake_attachments_20260422,
  thread_attachments_storage_rls_20260422,
  phase_1_2_5_align_with_spec_20260422
]
buckets_created: [thread-attachments (private)]

## Schema delta
- `project_references`: + media_type (NOT NULL, ('image','video','pdf')), + duration_seconds, + page_count, + thumbnail_path, + embed_provider (('youtube','vimeo','tiktok','instagram'))
- `projects`: + intake_mode (NOT NULL, default 'brief', ('brief','proposal_request')), + proposal_goal/_audience/_budget_range/_timeline
- `thread_message_attachments` (new): id, message_id (CASCADE), kind (('image','video','pdf','file')), storage_path, file_name, mime_type, size_bytes (≤500MB), thumbnail_path, created_at + RLS (PERMISSIVE select/insert/delete + RESTRICTIVE hide-internal-from-clients)
- `thread_messages` RLS tightened: insert visibility='internal' restricted to `is_yagi_admin`
- Storage bucket `thread-attachments` (private) + RLS policies on `storage.objects` keyed by `split_part(name,'/',1)::project_id`

## Notes / deviations from spec
- Spec used visibility values `('client','shared')` in policy text but actual repo enum is `('internal','shared')` — used 'shared' verbatim (deviation #5 logged).
- `project_references.mime_type` does not exist in this repo — spec backfill of media_type from mime_type was skipped; default 'image' applied.
- Bucket created via `INSERT INTO storage.buckets` (Supabase MCP `r2_bucket_create` is for Cloudflare). No size cap at the bucket level — enforced via DB CHECK (≤500MB) and client-side validation.
- Required two corrective migrations to align column names + enum (`proposal` → `proposal_request`, `filename` → `file_name`, `byte_size` → `size_bytes`, `media_type` enum tightened, `kind` + `thumbnail_path` added).
- Builder applied directly (autopilot mode, kill-switches off).
