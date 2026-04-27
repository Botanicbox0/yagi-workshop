# YAGI Workshop — Phase 1.2.5 Autonomous Build (B-O-E)

> **Scope:** Three atomic extensions to Phase 1.2 that landed after it started:
> (a) video file + video URL references, (b) PDF file references, (c) project intake-type distinction (client-initiated brief vs. "please propose something for me").
> **Prereq:** Phase 1.2 complete.
> **Estimated duration:** 2–3 hours.

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md` and `/ARCHITECTURE.md` §8.3 (storyboards are YAGI-internal) + §8.4 (references extension) before writing code. If the spec below seems to contradict ARCHITECTURE, the architecture decision wins.

Session: `--dangerously-skip-permissions`. Kill-switches below are mandatory.

---

## Goal

By the end of Phase 1.2.5:

1. Clients can upload **video files** (MP4/MOV/WebM, up to 500 MB) as project references, playable inline via HTML5 `<video>` on the project detail page.
2. Clients can paste **video URLs** (YouTube, Vimeo, TikTok, Instagram Reels) and the reference gets a thumbnail + title via oEmbed unfurl.
3. Clients can upload **PDF files** (up to 25 MB) as project references — primarily for pre-written briefs/decks. PDFs render as a thumbnail (first-page preview) with a download link; no inline viewer in this phase.
4. Project creation distinguishes two **intake modes**:
   - `brief` — client already has a plan; uploads references and describes the deliverable they want.
   - `proposal_request` — client wants YAGI to propose something; provides goals/context only.
5. Thread messages support **file and image attachments** (channel-talk style). Internal-visibility toggle from Phase 1.2 continues to work.
6. New-project form adapts its fields based on selected intake mode — different required fields for each.

**Non-goals (explicit):**
- Video transcoding / streaming pipeline (no ffmpeg worker, no Mux/Cloudflare Stream). We store what the client uploads.
- PDF inline viewer / annotator (out of scope; Phase 1.4 Pre-production Board will handle PDF annotation if ever needed).
- Rich text in thread messages (attachments yes; markdown editor no — plain text + attachments is enough).
- A separate "proposals" entity. `proposal_request` is just a flag + a few extra fields on `projects`; YAGI still replies by updating the project's brief.
- Moving reference ordering out of the reference list (drag-reorder stays deferred to Phase 1.4).

---

## Data model

New migration: `YYYYMMDDHHMMSS_phase_1_2_5_video_pdf_intake.sql`

### 1. Extend `project_references` for video + PDF

```sql
-- Phase 1.2 shipped: media_type IS NULL OR 'image'; kind in ('upload','url_unfurl')
-- Phase 1.2.5 expansion:
alter table project_references
  add column if not exists media_type text
    check (media_type in ('image','video','pdf'));

-- Backfill existing rows: infer from mime_type or fall back to 'image'
update project_references
  set media_type = case
    when mime_type like 'video/%' then 'video'
    when mime_type = 'application/pdf' then 'pdf'
    else 'image'
  end
  where media_type is null;

alter table project_references
  alter column media_type set default 'image',
  alter column media_type set not null;

alter table project_references
  add column if not exists duration_seconds integer,         -- videos only
  add column if not exists page_count integer,               -- pdfs only
  add column if not exists thumbnail_path text,              -- storage path for pdf first-page preview OR extracted video poster
  add column if not exists embed_provider text                -- 'youtube' | 'vimeo' | 'tiktok' | 'instagram' for url_unfurl video refs
    check (embed_provider is null or embed_provider in ('youtube','vimeo','tiktok','instagram'));

create index if not exists idx_project_references_media_type
  on project_references(project_id, media_type);
```

### 2. Add intake-mode fields to `projects`

```sql
alter table projects
  add column if not exists intake_mode text not null default 'brief'
    check (intake_mode in ('brief','proposal_request'));

-- proposal_request-specific fields (null-safe for brief mode)
alter table projects
  add column if not exists proposal_goal text,              -- "무엇을 이루고 싶은가"
  add column if not exists proposal_audience text,          -- target audience / fandom description
  add column if not exists proposal_budget_range text       -- free-form, e.g. "500만-1000만", "미정"
    check (proposal_budget_range is null or length(proposal_budget_range) <= 200),
  add column if not exists proposal_timeline text;          -- free-form, e.g. "6월 중순 공개 목표"

-- backfill: all existing Phase 1.2 projects are 'brief' by default (correct)
```

No RLS changes — new columns inherit existing policies on `projects`.

### 3. Thread message attachments

```sql
create table thread_message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references thread_messages(id) on delete cascade,
  kind text not null check (kind in ('image','video','pdf','file')),
  storage_path text not null,          -- inside private bucket `thread-attachments`
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  thumbnail_path text,                 -- optional preview for image/video/pdf
  created_at timestamptz not null default now()
);

create index idx_thread_attachments_message on thread_message_attachments(message_id);

alter table thread_message_attachments enable row level security;

-- Visibility = visibility of the parent message (RESTRICTIVE reuse pattern)
create policy thread_attachments_select on thread_message_attachments for select using (
  exists (
    select 1 from thread_messages m
    join project_threads t on t.id = m.thread_id
    join projects p on p.id = t.project_id
    where m.id = thread_message_attachments.message_id
      and (is_ws_member(p.workspace_id) or is_yagi_admin())
  )
);

create policy thread_attachments_insert on thread_message_attachments for insert with check (
  exists (
    select 1 from thread_messages m
    where m.id = thread_message_attachments.message_id
      and m.author_id = auth.uid()
  )
);
```

```sql
-- RESTRICTIVE: client-role users never see attachments on internal-only messages
-- (mirrors the Phase 1.2 thread_msgs_hide_internal_from_clients pattern)
create policy thread_attachments_hide_internal_from_clients on thread_message_attachments
  as restrictive for select using (
    is_yagi_admin()
    or not exists (
      select 1 from thread_messages m
      where m.id = thread_message_attachments.message_id
        and m.visibility = 'internal'
    )
  );
```

### 4. New storage bucket for thread attachments

```sql
-- Run via Supabase MCP create_bucket, not the SQL above — kept here as reference
-- Bucket: thread-attachments (private)
-- Path convention: {workspace_id}/{thread_id}/{message_id}/{uuid}__{file_name}
-- Size cap: 500 MB per object (matches video upload spec)
```

Storage RLS: SELECT/INSERT require `is_ws_member(workspace_id)` parsed from the first path segment. Same pattern as `project-references` bucket from Phase 1.1.

### 5. Regenerate types

After all migrations apply, regenerate Supabase TypeScript types. `src/lib/supabase/types.ts` must include the new columns and `thread_message_attachments` table.

---

## Subtasks (7)

### 01 — i18n: `projects` intake-mode keys + `references` video/pdf keys + `threads` attachment keys

Add to both `messages/ko.json` and `messages/en.json`:

**`projects` intake mode:**
- `intake_mode_label`
- `intake_mode_brief_title`, `intake_mode_brief_desc`  — "기획안을 이미 갖고 있어요" / "I already have a brief"
- `intake_mode_proposal_title`, `intake_mode_proposal_desc` — "YAGI가 제안해주길 원해요" / "I want YAGI to propose"
- `proposal_goal_label`, `proposal_goal_ph`
- `proposal_audience_label`, `proposal_audience_ph`
- `proposal_budget_range_label`, `proposal_budget_range_ph`
- `proposal_timeline_label`, `proposal_timeline_ph`

**`references` video/pdf keys:**
- `ref_type_video`, `ref_type_pdf`
- `ref_video_upload_ph` — "비디오 파일 드래그 또는 클릭 (MP4 · MOV · WebM · 최대 500MB)"
- `ref_pdf_upload_ph` — "PDF 드래그 또는 클릭 (최대 25MB)"
- `ref_video_url_ph` — "YouTube · Vimeo · TikTok · Instagram URL 붙여넣기"
- `ref_video_unsupported_format` — "이 브라우저에서 재생되지 않을 수 있습니다 (MP4 권장)"
- `ref_size_too_large_video`, `ref_size_too_large_pdf`
- `ref_duration_label`, `ref_pages_label`

**`threads` attachment keys:**
- `attachment_add`, `attachment_remove`
- `attachment_uploading`, `attachment_failed`
- `attachment_size_limit` — "파일은 하나당 최대 500MB"

Korean 존댓말, editorial English. Acceptance: both JSON files valid; no key present in one locale but missing from the other.

---

### 02 — Video file upload (reference uploader extension)

Files:
- `src/lib/references/video.ts` — client-side file validation + upload helper
- Update `src/components/references/reference-uploader.tsx` (from Phase 1.2) to accept video MIME types

Validation rules (fail early, before upload):
- MIME: `video/mp4`, `video/quicktime`, `video/webm`
- Size: ≤ 500 MB
- Duration read: attempt via `<video>.duration` after `loadedmetadata`. If unreadable (some MOV variants), allow upload but store `duration_seconds = null`.

Upload flow:
1. Request a signed upload URL via a Server Action `requestReferenceUpload(projectId, fileMeta)` — returns `{ storagePath, signedUrl }`. Server verifies the user can insert into the project's references.
2. Client PUTs the file directly to Supabase Storage via the signed URL (no Server Action body size issues).
3. On success, client calls `createReferenceRow(projectId, {storagePath, kind:'upload', media_type:'video', ...})`.
4. Server generates a poster frame asynchronously: since we don't have ffmpeg, we use a **client-provided poster** — the uploader captures a frame at `video.currentTime = 1.0` via canvas, uploads it as a companion image to `thumbnail_path`. Fail silently if capture fails; the reference still displays with a generic play-button placeholder.

Acceptance:
- User selects a 200 MB MP4 → uploads, appears as playable card on project detail
- MOV file uploads but may show "preview unavailable" placeholder if browser can't render
- Attempting a 600 MB file fails client-side before any upload starts (toast error)
- A 10-second MP4 shows duration "0:10" on the reference card

---

### 03 — Video URL unfurl (YouTube / Vimeo / TikTok / Instagram)

File: extend `src/lib/og-unfurl.ts` (created in Phase 1.2) with `unfurlVideoUrl(url: string)`.

Detection: regex-based dispatch on the URL hostname.

```typescript
type VideoUnfurlResult = {
  provider: 'youtube' | 'vimeo' | 'tiktok' | 'instagram'
  video_id?: string
  title: string
  thumbnail_url: string
  duration_seconds?: number
  canonical_url: string
}
```

Per-provider strategy:

| Provider | Endpoint | Auth | Notes |
|---|---|---|---|
| YouTube | `https://www.youtube.com/oembed?url=<url>&format=json` | none | Free, no key. `title`, `thumbnail_url` reliable. Duration NOT returned by oEmbed — leave null. |
| Vimeo | `https://vimeo.com/api/oembed.json?url=<url>` | none | Returns `duration` in seconds. |
| TikTok | `https://www.tiktok.com/oembed?url=<url>` | none | Returns `title`, `thumbnail_url`. No duration. |
| Instagram | `https://graph.facebook.com/v19.0/instagram_oembed?url=<url>&access_token=...` | **requires Instagram Basic Display or FB Graph token** | **Skip this phase if no token configured** — fallback to generic URL unfurl. Add `INSTAGRAM_OEMBED_TOKEN` as optional env. |

Rules:
- 8-second timeout per call
- On any provider failure, fall back to the generic OG unfurl from Phase 1.2 (kind stays `url_unfurl` but `media_type='image'` and `embed_provider=null`)
- Cache: reuse Phase 1.2's unfurl cache keyed on canonical URL
- Log warnings with provider + status; never throw to the caller

Server Action integration: the existing `addReferenceFromUrl` Server Action routes the URL through `unfurlVideoUrl` first; if it returns a video result, the row is inserted with `media_type='video', embed_provider=<provider>, kind='url_unfurl'`. Thumbnail stays as the external URL (we don't re-host thumbnails).

Rendering: reference card for a video URL shows the thumbnail with a play overlay. Click opens a Radix Dialog with an embedded iframe player (YouTube / Vimeo standard embed URL; TikTok/Instagram: open in new tab — their embed flows are brittle).

Acceptance:
- Paste a YouTube URL → card shows thumbnail + title, click opens in-app player dialog
- Paste a Vimeo URL → card shows thumbnail + title + duration
- Paste a TikTok URL → card shows thumbnail + title, click opens tiktok.com in new tab
- Paste a random website → falls back to Phase 1.2 OG unfurl (no regression)

---

### 04 — Video playback on reference detail

File: `src/components/references/video-player.tsx` (Client Component)

Three render paths based on `reference.kind` + `reference.embed_provider`:

1. **Uploaded video** (`kind='upload'`, `media_type='video'`):
   - `<video>` tag with `controls`, `preload="metadata"`, `poster={thumbnail_url ?? placeholder}`
   - `src` is a signed URL generated on the server (expires in 1 hour). Because the reference list is a Server Component, embed the signed URL at render time.
   - Graceful fallback: if browser can't play (MOV + Chrome), show download link.

2. **Embeddable URL** (`embed_provider in ('youtube','vimeo')`):
   - Card click → Radix Dialog → iframe with the provider's standard embed URL (`https://www.youtube.com/embed/{id}`, `https://player.vimeo.com/video/{id}`)
   - Dialog has a generous max-width (900px) and fixed 16:9 aspect.

3. **External-only URL** (`embed_provider in ('tiktok','instagram')`):
   - Card is a link that opens the canonical URL in a new tab (`target="_blank" rel="noopener noreferrer"`).

Accessibility: video element has captions slot (no captions in phase), keyboard controls enabled, focus ring on the card.

Acceptance:
- Uploaded video plays inline without page reload
- YouTube embed opens in dialog, closes on Esc
- TikTok link opens in new tab
- Card keyboard-focusable, enter opens the appropriate action

---

### 05 — PDF reference support

Files:
- `src/lib/references/pdf.ts` — client-side validation + optional thumbnail extraction
- Update `reference-uploader.tsx` to accept `application/pdf`

Validation:
- MIME: `application/pdf`
- Size: ≤ 25 MB (a typical brief deck is < 10 MB; 25 is generous)

Thumbnail extraction (progressive enhancement):
- Use `pdfjs-dist` on the client to render page 1 to a canvas → capture as JPEG blob (quality 0.7) → upload as companion to `thumbnail_path`.
- `pdfjs-dist` worker is loaded from a CDN path (`cdn.jsdelivr.net/npm/pdfjs-dist@...`) to avoid Next.js bundling headaches. Versioned.
- Also extract `page_count` and store it on the reference row.
- If pdfjs fails to load (offline, blocked CDN, corrupted PDF): upload succeeds without thumbnail; card shows a generic PDF icon.

Rendering on project detail:
- Reference card shows thumbnail (or PDF icon), filename, `N pages`, file size.
- Click → opens the signed Storage URL in a new tab (browser handles PDF rendering natively).
- No in-app PDF viewer in this phase.

Acceptance:
- Upload a 5 MB PDF → card shows first-page thumbnail + "12 pages" + filename
- Upload a 30 MB PDF → client-side rejection before upload
- Upload a corrupted PDF → upload succeeds, thumbnail missing, no error toast (graceful)
- Click card → PDF opens in a new browser tab

Dependency:
```powershell
pnpm add pdfjs-dist
```

🛑 **KILL-SWITCH before this install.**

---

### 06 — Thread message attachments (channel-talk style)

Files:
- Update `src/components/threads/message-composer.tsx` (Phase 1.2) to support file + image attachment
- Update `src/components/threads/message-bubble.tsx` to render attachments
- `src/lib/threads/attachments.ts` — upload helper (signed URL + Storage + DB row)

Composer behavior:
- Plus (+) icon button next to the text input opens a file picker
- Accepted: images (`image/*`), videos (`video/mp4,video/quicktime,video/webm`), PDFs (`application/pdf`), generic files (catch-all fallback kind `'file'`)
- Multi-attach: user can add up to **5 attachments** per message
- Drag-and-drop also works on the composer area
- Before send: attachments appear as chips with thumbnail + filename + remove (×). Upload starts immediately on add; chip shows progress.
- Send is blocked while any attachment is still uploading.

Size caps:
- Images: 10 MB
- Videos: 500 MB (matches reference video cap — we reuse the same storage pattern)
- PDFs: 25 MB
- Generic files: 50 MB

Upload flow (mirrors Subtask 02):
1. `requestThreadAttachmentUpload(messageContext, fileMeta)` Server Action — verifies workspace membership, returns signed URL + storage path
2. Client PUTs to Storage
3. On message send: Server Action `sendMessageWithAttachments(threadId, body, visibility, attachments[])` inserts the message AND the attachment rows in a single transaction (RPC with `security definer` function if needed for atomicity)

If upload succeeds but message send fails → the orphan Storage objects are cleaned by a weekly cron later. Do not block the user on cleanup.

Bubble rendering:
- Image attachments: inline thumbnail, click → Radix Dialog lightbox
- Video attachments: inline `<video>` with controls (reuse Subtask 04 component)
- PDF attachments: filename + page count chip, click → signed URL in new tab
- Generic files: filename + size chip, click → download

Visibility toggle preserved: if the message is `visibility='internal'`, the attachments inherit the hiding policy (RESTRICTIVE RLS added in the migration). Client users never see internal attachments in SELECT results.

Acceptance:
- YAGI admin can attach 3 images + 1 PDF to one internal message → client does not see the message OR the attachments
- Client can attach a video to a public message → YAGI admin sees the video inline
- Trying to attach a 600 MB video fails client-side with a clear toast
- Sending a message while an attachment is still uploading is blocked with inline notice

---

### 07 — Project intake mode: `brief` vs `proposal_request`

Files:
- Update `src/app/[locale]/app/projects/new/page.tsx` — new-project form
- `src/components/projects/intake-mode-picker.tsx` — radio card selector (Client Component)
- `src/components/projects/proposal-fields.tsx` — conditional field group (Client Component)
- Update `src/app/[locale]/app/projects/actions.ts` — `createProject` Server Action with branched Zod schema

Form structure:

**Step 1 (always):** Intake mode picker — two large radio cards side-by-side, default to `brief`.
- Left card: "기획안을 이미 갖고 있어요" · icon, short description.
- Right card: "YAGI가 제안해주길 원해요" · icon, short description.

**Step 2 (shared fields, both modes):**
- Project title (required)
- Workspace / Brand (required if user is in multiple)
- Target deliverable — free-form description (required)

**Step 3 (branches on intake_mode):**

For `brief`:
- Nothing extra at form submit; user proceeds to references uploader on the project detail page (post-create redirect).

For `proposal_request`:
- `proposal_goal` (textarea, required, 800 char soft cap) — "무엇을 이루고 싶은가요?"
- `proposal_audience` (textarea, optional, 400 char) — "타겟 청중 / 팬덤"
- `proposal_budget_range` (short text, optional, 100 char) — "예산 범위" (free-form, KRW)
- `proposal_timeline` (short text, optional, 200 char) — "희망 일정"

**Zod schema branching:**

```typescript
const shared = z.object({
  title: z.string().min(1).max(200),
  workspace_id: z.string().uuid(),
  brand_id: z.string().uuid().optional(),
  target_deliverable: z.string().min(1).max(2000),
})

const brief = shared.extend({
  intake_mode: z.literal('brief'),
})

const proposalRequest = shared.extend({
  intake_mode: z.literal('proposal_request'),
  proposal_goal: z.string().min(1).max(800),
  proposal_audience: z.string().max(400).optional().nullable(),
  proposal_budget_range: z.string().max(100).optional().nullable(),
  proposal_timeline: z.string().max(200).optional().nullable(),
})

const createProjectSchema = z.discriminatedUnion('intake_mode', [brief, proposalRequest])
```

Server Action inserts project with all fields set. For `brief` projects, proposal_* columns stay null.

Project detail page adaptation (in `src/app/[locale]/app/projects/[id]/page.tsx`):
- Show a badge next to title: "Brief" (neutral) or "Proposal request" (lime accent)
- For `proposal_request` projects, a new "Client context" card shows `proposal_goal / audience / budget / timeline` at the top of the detail page, above references.
- For `brief` projects, this card is hidden.

Acceptance:
- Creating a `brief` project works exactly as Phase 1.2 did (no regression)
- Creating a `proposal_request` without `proposal_goal` fails server-side validation (client validation catches first)
- Detail page renders the "Client context" card only for proposal_request projects
- Existing Phase 1.2 projects all show as `brief` (backfill correct)

---

## Dependencies

```powershell
pnpm add pdfjs-dist
```

Only one new package this phase. `pdfjs-dist` is ~1.5 MB added to bundle but code-split: only loads when a user actually adds a PDF. Worker loaded from CDN.

🛑 **KILL-SWITCH before this install** (subtask 05).

No other new deps. Video handling uses native `<video>` element + canvas API. oEmbed calls use `fetch`. Storage upload uses signed URLs (Supabase JS client already present).

---

## Parallelism plan

```
Wave A: 01 (i18n — isolated, safe first step)
        ‖ migration apply (before any subtask touches the new columns/tables)
   ↓
Wave B: 02 (video upload)  ‖  03 (video URL unfurl)  ‖  07 (intake mode UI)
        — all three touch independent modules and can proceed in parallel.
        07 DB fields exist post-migration; 02/03 use existing `project_references` shape.
   ↓
Wave C: 04 (video player component) ‖ 05 (PDF reference)
        — 04 depends on 02 (data shape). 05 independent.
   ↓
Wave D: 06 (thread attachments) — depends on migration's new table but independent of refs.
        Can actually start in parallel with Wave C if Executor count allows.
   ↓
Wave E: Evaluator sweep → build → smoke test
```

## Context-reset checkpoints

After Waves B and D — write `checkpoint.md` with: state of each subtask, any deviations from spec, open questions for Yagi.

---

## Kill-switch triggers (6)

1. **Before migration apply** — Builder must paste the full SQL to Telegram, wait for `continue` before `apply_migration`.
2. **Before `pnpm add pdfjs-dist`** (subtask 05 start).
3. **Before creating the `thread-attachments` Storage bucket** — Builder posts the bucket config (name, privacy, size cap) to Telegram and waits for `continue`.
4. **Before touching any file in `src/components/references/reference-uploader.tsx`** — this is the highest-risk file this phase (shared across subtasks 02/03/05). Builder pauses and posts the planned change surface.
5. **Before final `pnpm build`**.
6. **Before declaring Phase 1.2.5 complete** — post a summary of what changed to Telegram.

Each kill-switch follows the protocol reminder Yagi sent to Claude Code:
1. Telegram `sendMessage` with the pause reason
2. Terminal: `🛑 Kill-switch N. Telegram sent. Waiting for reply...`
3. Block until `continue` or `abort` arrives in chat
4. Claude Code permission prompts do NOT substitute for this protocol

---

## Success criteria

1. `pnpm build` clean, zero TS/ESLint errors/warnings
2. Migration applies; types regenerated; `thread_message_attachments` + new `projects` + `project_references` columns visible in `src/lib/supabase/types.ts`
3. **Video upload end-to-end:** Upload a 200 MB MP4 to a project → plays inline on project detail → RLS blocks anon access → thumbnail present
4. **Video URL unfurl:** YouTube + Vimeo URLs show thumbnail + title; click opens embedded player. TikTok opens external. Random URL falls back to Phase 1.2 OG unfurl.
5. **PDF reference:** 5 MB PDF uploads with first-page thumbnail + page count. 30 MB PDF rejected client-side.
6. **Intake mode:** creating a `brief` project works exactly as Phase 1.2 (no regression). Creating a `proposal_request` without `proposal_goal` is rejected. Detail page shows "Client context" card only for proposal_request.
7. **Thread attachments:** 3-image + 1-PDF message sends successfully. Internal-visibility message + attachments are invisible to client-role users (RLS test via anon client).
8. **Backfill correctness:** all Phase 1.2 projects have `intake_mode='brief'`, all Phase 1.2 references have `media_type='image'`.
9. **RLS sanity:** anon `/rest/v1/thread_message_attachments?select=*` returns 0 rows. Same for proposal_* columns via a client-role user on another workspace's project.
10. Telegram kill-switch log shows all 6 mandatory pauses observed.
11. `summary-phase-1-2-5.md` written with subtask status + any deviations.

---

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.7
- Executor 01 (i18n — config only): Haiku 4.5
- Executor 02 (video upload — media + storage edge cases): Sonnet 4.7
- Executor 03 (URL unfurl — multi-provider branching): Sonnet 4.7
- Executor 04 (video player — UI component): Sonnet 4.7
- Executor 05 (PDF — pdfjs integration, CDN worker): Sonnet 4.7
- Executor 06 (thread attachments — highest blast radius, touches RLS + composer + bubble): Opus 4.7
- Executor 07 (intake mode — Zod discriminated union + conditional UI): Sonnet 4.7
- Evaluator: Sonnet 4.7 fresh context, runs after Wave D

---

## Forbidden

- Adding ffmpeg / video transcoding in any form. Store what the client uploads.
- Adding an in-app PDF viewer / annotator. Browser native tab is enough.
- Moving video playback to a third-party host (Mux, Cloudflare Stream). Supabase Storage serves signed URLs.
- Adding drag-to-reorder to the reference list in this phase (defer).
- Making `proposal_request` a separate entity / table. It's a mode flag + nullable fields on `projects`.
- Rich text editor in thread messages. Plain text + attachments only.
- Eager loading `pdfjs-dist` on app startup. It must be dynamically imported only when a PDF is selected.
- Storing client-provided file names as storage paths without UUID prefixes (name collisions + injection surface).
- Writing attachments to a public storage bucket. `thread-attachments` is private; all access is via signed URL.

---

## Notes for Yagi

Before kicking this off:
1. **No env vars to set up for this phase.** `INSTAGRAM_OEMBED_TOKEN` is optional; without it, Instagram URLs fall back to generic OG unfurl.
2. `pdfjs-dist` worker is loaded from `cdn.jsdelivr.net`. If Yagi ever goes air-gapped, move the worker file into `/public/pdfjs/` and update the worker path.
3. Phase 1.4 (Pre-production Board) will reuse much of subtask 06's attachment infrastructure — keep the attachment helper in `src/lib/threads/attachments.ts` generic enough that Phase 1.4 can import it for board comments.
4. If video playback issues surface with MOV files in Chrome (common), the escape hatch is asking clients to upload MP4. Don't try to transcode server-side; that's a rabbit hole.

---

**End of Phase 1.2.5 spec.**
