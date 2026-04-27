# YAGI Workshop — Phase 1.4 Autonomous Build (B-O-E)

> **Scope:** Pre-production Board — YAGI uploads completed frames (images + video embeds), shares via public link, clients give Fast Feedback (👍/👎 + comment) per frame with versioned revisions.
> **Prereq:** Phase 1.2 complete. Phase 1.2.5 REQUIRED (uses thread attachment infra + video reference rendering).
> **Estimated duration:** 4–5 hours.
> **Design decisions:** ARCHITECTURE.md §8.3 (YAGI-internal authoring), §11 (Fast Feedback Loop). This spec SUPERSEDES the earlier fal.ai-centric Phase 1.4 spec — fal.ai is removed entirely.

---

## Your Identity

Builder per `yagi-agent-design`. Load `/CLAUDE.md`, `/ARCHITECTURE.md` §8.3 + §11, and `.claude/skills/yagi-nextjs-conventions/SKILL.md`.

Session: `--dangerously-skip-permissions`. Kill-switches below.

---

## Goal

By the end of Phase 1.4:

1. YAGI internal team can create a Pre-production Board linked to a client project.
2. YAGI uploads **completed frames** (images from ComfyUI / YAGI VFX Studio / external sources). No in-platform generation.
3. Board is a sequence of frames; each frame has: image OR video (uploaded OR external URL like YouTube/Vimeo), caption, director's note, optional linked reference(s) from Phase 1.2/1.2.5.
4. Board has a shareable public link `/s/[token]`; opening it shows frames without auth.
5. **Fast Feedback:** on the share page, clients tap 👍 / 👎 / needs_change per frame, optionally leave a comment, no account required.
6. **Versioned revisions:** YAGI can upload a v2 of any frame; the share page shows v2 with a v1/v2 toggle or side-by-side.
7. YAGI sees reactions + comments in realtime on the board editor.
8. Board status lifecycle: `draft → shared → approved | archived`.

**Non-goals (explicit):**
- No in-platform image or video generation. YAGI uploads from external pipelines.
- No real-time collaborative editing (single-author pattern is fine).
- No AI-generated director notes (the point is YAGI's creative direction).
- No custom board templates in this phase (copy existing board with "Duplicate" is enough).
- No password-gated share links in this phase (deferred to 2.0+; schema supports it).

---

## Data model

Migration: `YYYYMMDDHHMMSS_phase_1_4_preprod_board.sql`

### Core tables

```sql
create table preprod_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  -- workspace_id = YAGI INTERNAL WORKSPACE (not the client's). See §8.3.
  title text not null,
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'shared', 'approved', 'archived')),
  share_token text unique,
  share_enabled boolean not null default false,
  share_password_hash text,                -- reserved for 2.0+; null in 1.4
  approved_at timestamptz,
  approved_by_email text,
  cover_frame_id uuid,                     -- set in trigger; frames table below
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_preprod_boards_project on preprod_boards(project_id);
create index idx_preprod_boards_share_token on preprod_boards(share_token) where share_token is not null;

create table preprod_frames (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references preprod_boards(id) on delete cascade,
  frame_order integer not null,            -- 1-indexed within (board_id, revision_group)
  -- versioning
  revision integer not null default 1,     -- 1 = v1, 2 = v2, ...
  revision_group uuid not null,            -- groups v1, v2, v3 of the SAME slot
  is_current_revision boolean not null default true,
  -- media
  media_type text not null check (media_type in ('image','video_upload','video_embed')),
  media_storage_path text,                 -- for upload types
  media_external_url text,                 -- for video_embed (YouTube/Vimeo)
  media_embed_provider text check (media_embed_provider is null or media_embed_provider in ('youtube','vimeo','tiktok','instagram')),
  thumbnail_path text,
  -- metadata
  caption text,
  director_note text,
  reference_ids uuid[] default '{}',       -- soft FK to project_references
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, revision_group, revision),
  check (
    (media_type = 'image' and media_storage_path is not null) or
    (media_type = 'video_upload' and media_storage_path is not null) or
    (media_type = 'video_embed' and media_external_url is not null and media_embed_provider is not null)
  )
);

create index idx_preprod_frames_board on preprod_frames(board_id);
create index idx_preprod_frames_revision_group on preprod_frames(revision_group, is_current_revision);
-- Only ONE current revision per revision_group
create unique index idx_preprod_frames_one_current on preprod_frames(revision_group)
  where is_current_revision = true;
```

### Reactions + comments

```sql
-- Frame reactions: upsert per (frame, email) — one current reaction per client per frame
create table preprod_frame_reactions (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null references preprod_frames(id) on delete cascade,
  board_id uuid not null references preprod_boards(id) on delete cascade,
  reactor_email text not null,
  reactor_name text,
  reaction text not null check (reaction in ('like','dislike','needs_change')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (frame_id, reactor_email)
);

create index idx_preprod_reactions_frame on preprod_frame_reactions(frame_id);
create index idx_preprod_reactions_board on preprod_frame_reactions(board_id);

-- Comments: same pattern as storyboard_frame_comments (from original 1.4 spec, preserved)
create table preprod_frame_comments (
  id uuid primary key default gen_random_uuid(),
  frame_id uuid not null references preprod_frames(id) on delete cascade,
  board_id uuid not null references preprod_boards(id) on delete cascade,
  author_user_id uuid references auth.users(id),
  author_email text,
  author_display_name text not null,
  body text not null check (length(body) <= 2000),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (author_user_id is not null or author_email is not null)
);

create index idx_preprod_comments_frame on preprod_frame_comments(frame_id);
create index idx_preprod_comments_board on preprod_frame_comments(board_id);

-- RLS
alter table preprod_boards enable row level security;
alter table preprod_frames enable row level security;
alter table preprod_frame_reactions enable row level security;
alter table preprod_frame_comments enable row level security;

-- Boards: YAGI team only (clients access via /s/[token] using service role)
create policy preprod_boards_select_internal on preprod_boards for select using (
  is_yagi_admin() or is_ws_member(workspace_id)
);
create policy preprod_boards_insert_internal on preprod_boards for insert with check (
  is_yagi_admin() or is_ws_admin(workspace_id)
);
create policy preprod_boards_update_internal on preprod_boards for update using (
  is_yagi_admin() or is_ws_admin(workspace_id)
);

-- Frames: inherit from board
create policy preprod_frames_select on preprod_frames for select using (
  exists (select 1 from preprod_boards b where b.id = board_id
          and (is_yagi_admin() or is_ws_member(b.workspace_id)))
);
create policy preprod_frames_insert on preprod_frames for insert with check (
  exists (select 1 from preprod_boards b where b.id = board_id
          and (is_yagi_admin() or is_ws_admin(b.workspace_id)))
);
create policy preprod_frames_update on preprod_frames for update using (
  exists (select 1 from preprod_boards b where b.id = board_id
          and (is_yagi_admin() or is_ws_admin(b.workspace_id)))
);
```

```sql
-- Reactions + comments: YAGI team sees; anonymous insert via service role only
create policy preprod_reactions_select on preprod_frame_reactions for select using (
  exists (select 1 from preprod_boards b where b.id = board_id
          and (is_yagi_admin() or is_ws_member(b.workspace_id)))
);
create policy preprod_comments_select on preprod_frame_comments for select using (
  exists (select 1 from preprod_boards b where b.id = board_id
          and (is_yagi_admin() or is_ws_member(b.workspace_id)))
);
-- NO anonymous insert policies — the /s/ route uses service role

-- Storage bucket
insert into storage.buckets (id, name, public) values ('preprod-frames', 'preprod-frames', false)
  on conflict (id) do nothing;

create policy "preprod-frames read internal" on storage.objects for select
  to authenticated using (
    bucket_id = 'preprod-frames' and
    (is_yagi_admin() or exists (
      select 1 from preprod_boards b where b.id::text = (storage.foldername(name))[1]
        and is_ws_member(b.workspace_id)
    ))
  );

create policy "preprod-frames write internal" on storage.objects for insert
  to authenticated with check (
    bucket_id = 'preprod-frames' and
    (is_yagi_admin() or exists (
      select 1 from preprod_boards b where b.id::text = (storage.foldername(name))[1]
        and is_ws_admin(b.workspace_id)
    ))
  );
```

Regenerate types after apply.

### Notes on versioning data model

- **`revision_group`** groups all revisions of the SAME logical frame slot. Creating a new frame = new `revision_group` UUID. Uploading v2 of an existing frame = same `revision_group`, increment `revision`, set previous to `is_current_revision=false`.
- **`frame_order`** is the slot position. Preserved across revisions — v2 of frame 3 stays at position 3.
- When the share page renders, it queries `WHERE is_current_revision = true ORDER BY frame_order`. The v1→v2 toggle fetches the full revision group on demand.

---

## Subtasks (10)

### 01 — i18n: `preprod_board` + `reactions` + `revisions` namespaces

Add to both `messages/ko.json` and `messages/en.json`.

**`preprod`:**
- board_list_title, board_list_empty, board_new, board_new_title
- title_label, title_ph, description_label, description_ph, project_label
- status_draft, status_shared, status_approved, status_archived
- share_enable, share_disable, share_link_copy, share_copied, share_rotate
- approve_confirm, approved_by, approved_at
- duplicate, archive, archive_confirm

**`frames`:**
- add_frame, remove_frame, frame_n, reorder_hint
- media_upload_image, media_upload_video, media_paste_url
- caption_label, caption_ph, director_note_label, director_note_ph
- reference_link, reference_none
- upload_in_progress, upload_failed
- unsupported_format

**`revisions`:**
- new_revision, revision_n, revision_current, revision_diff
- toggle_v1_v2, compare_side_by_side

**`reactions`:**
- reaction_like (👍 좋아요 / Looks good)
- reaction_dislike (👎 아니에요 / Not quite)
- reaction_needs_change (✋ 수정 필요 / Needs change)
- reaction_count_n
- reaction_submitted, reaction_updated

**`share`:**
- welcome_title, welcome_sub, project_name
- comment_ph, comment_submit, comment_email_ph, comment_name_ph
- comments_title, comments_empty, resolved_badge
- reaction_name_required, reaction_email_required
- no_longer_shared

Korean 존댓말 for YAGI internal UI; share page Korean slightly warmer (client touchpoint). Acceptance: both JSON valid and every key exists in both locales.

---

### 02 — Schema migration + regenerate types

🛑 **KILL-SWITCH before `supabase db push`** — Builder posts the full SQL to Telegram and waits for `continue`.

Apply the migration. Verify:
- 4 new tables created with correct CHECK constraints
- `preprod-frames` storage bucket exists and is private
- Storage RLS policies installed
- Regenerated `src/lib/supabase/types.ts` includes all new tables + Enum-like string unions

Acceptance:
- `pnpm tsc --noEmit` passes
- Anonymous REST query to each new table returns 0 rows
- Direct anon fetch to `preprod-frames/{any}` returns 401

---

### 03 — Board list page + create-board form (YAGI internal)

Files:
- `src/app/[locale]/app/preprod/page.tsx` — list (Server Component; yagi_admin OR YAGI-internal workspace member; else redirect to `/app`)
- `src/app/[locale]/app/preprod/new/page.tsx` — create form
- `src/app/[locale]/app/preprod/actions.ts` — Server Actions

List columns: title, project (client name), status, frame count, reactions summary (`5 👍 · 2 👎`), unresolved comments badge, last edited.

Filter: status, project. "New board" button top-right.

Create form: project dropdown (all projects user has access to), title, description. Submit → create with `status='draft'`, 0 frames → redirect to editor.

Sidebar nav: add `Pre-production` item in the YAGI Studio section (visible only to yagi_admin or YAGI internal workspace members).

Acceptance:
- Client-role user gets 404/redirect on `/preprod`
- YAGI user sees list, can create, lands on empty editor

---

### 04 — Board editor (upload frames, edit metadata, reorder)

File: `src/app/[locale]/app/preprod/[id]/page.tsx` (Server Component shell)
File: `src/components/preprod/board-editor.tsx` (Client Component)

Layout:
- Top bar: title (inline editable), status pill, "Share" button, actions menu (Duplicate / Archive / Approve)
- Left rail: frame list with small thumbnails + revision badge ("v2"); drag-to-reorder
- Main canvas: currently selected frame — large media preview
- Right rail: frame metadata — caption, director note, linked references, revision history
- Bottom of frame list: "Add frame" button with media-type picker

**Add frame flow (3 options via dropdown):**
1. **Upload image** — file picker (PNG/JPEG/WebP, max 20 MB). Upload to `preprod-frames/{board_id}/{frame_id}.{ext}` → insert row with `media_type='image'`, new `revision_group`, `revision=1`.
2. **Upload video** — file picker (MP4/MOV/WebM, max 500 MB). Reuses the Phase 1.2.5 signed-URL upload flow. `media_type='video_upload'`. Auto-captures a poster frame (client-side canvas, same as 1.2.5 subtask 02).
3. **Paste video URL** — text input (YouTube / Vimeo / TikTok / Instagram). Runs `unfurlVideoUrl` from Phase 1.2.5 to get thumbnail + title. `media_type='video_embed'`, `media_embed_provider` set.

Reorder: drag-and-drop via `@dnd-kit/sortable`. 🛑 **KILL-SWITCH before `pnpm add @dnd-kit/core @dnd-kit/sortable`.**

Reference linking: multi-select from this project's `project_references` (both images and videos). Store IDs in `reference_ids[]`. Render as small thumbnails in the frame metadata panel.

Autosave-on-blur for text fields. Small "저장됨 / Saved" indicator.

Acceptance:
- Add 5 frames mixing all 3 media types → all display correctly
- Drag to reorder → order persists after reload
- Link 2 refs to frame 3 → display in right rail
- Refresh mid-edit → no data loss

---

### 05 — Revision management (v1 → v2 → v3)

New action on a frame in the editor: "Upload new revision" (opens same media-type picker as new frame).

Server Action: `createFrameRevision(frameId, newMediaArgs)`:
1. Fetch current frame; capture its `revision_group` and `frame_order`
2. Insert new frame row with same `revision_group`, incremented `revision`, same `frame_order`, new media
3. Update the previous row: `is_current_revision = false`
4. Update new row: `is_current_revision = true`
5. Revalidate board and share page (if shared)

Editor UI:
- Right rail shows revision history list: "v1 (2 days ago) · v2 (current)"
- Clicking v1 shows a compare dialog: side-by-side v1 vs v2 with "Restore v1" button
- "Restore v1" creates v3 using v1's media (not a DB UPDATE; we never mutate historical revisions)

Share page behavior for revisioned frames: show current revision by default, with a small "변경사항 보기 / See changes" link that opens the same v1/v2 compare dialog in read-only mode.

Acceptance:
- Upload v2 of frame 3 → editor shows v2, v1 accessible via history
- Share page shows v2; clicking "변경사항 보기" shows v1/v2 side-by-side
- Reactions on v1 are preserved (see subtask 07) but displayed on the v2 card

---

### 06 — Share action + token generation

File: `src/app/[locale]/app/preprod/[id]/actions.ts`

```typescript
export async function shareBoard(boardId: string): Promise<ShareResult>
export async function unshareBoard(boardId: string): Promise<void>
export async function rotateShareToken(boardId: string): Promise<{ newUrl: string }>
export async function approveBoard(boardId: string): Promise<void>  // YAGI-side trigger
export async function archiveBoard(boardId: string): Promise<void>
```

Share action:
1. Auth check: yagi_admin or YAGI workspace admin
2. Validate: board has at least 1 current-revision frame with valid media
3. Generate `share_token` (32-byte URL-safe random, base64url)
4. Update: `status='shared'`, `share_enabled=true`, `share_token=<token>`
5. Set `cover_frame_id` to the first frame (ordered) if null
6. Return URL: `{NEXT_PUBLIC_SITE_URL}/s/{token}`

Rotate: generates a new token (invalidates old link). Useful if a share link was leaked.

Acceptance:
- Share a board with 5 frames → URL returned → opens in incognito successfully
- Rotate token → old URL returns 404 / "link expired"
- Unshare → shared URL returns "link no longer active"

---

### 07 — Public share page + Fast Feedback UI

File: `src/app/s/[token]/page.tsx`
File: `src/components/share/fast-feedback-bar.tsx` (Client Component)
File: `src/app/api/share/[token]/reactions/route.ts`
File: `src/app/api/share/[token]/comments/route.ts`

**Public route:** no locale prefix, no auth, uses service-role Supabase client. Loads board by `share_token` where `share_enabled=true`.

Layout:
- Minimal header: YAGI logo + project name + "Pre-production Preview"
- Vertical scroll, one frame per viewport section on desktop (sticky frame index on the right)
- For each frame:
  - Media (image / inline video / embedded YouTube/Vimeo player)
  - Caption + director's note
  - Linked reference thumbnails ("Inspired by / 참고")
  - **Fast Feedback bar** (subtask core UX)
  - Comment thread

**Fast Feedback bar per frame:**
- Three big tap targets: 👍 Looks good · 👎 Not quite · ✋ Needs change
- On first click: small inline form asks for name + email (both required, one-time per share session, stored in localStorage after first submit)
- On subsequent clicks: reaction updates immediately without re-prompting
- Visual state: selected reaction highlighted; muted others
- Optional comment textarea below reactions ("Anything specific? / 구체적으로 어떤 부분?")
- Comment submit separate from reaction — user can react without commenting, or comment without reacting

API `/api/share/[token]/reactions`:
- POST body: `{ frame_id, reaction, reactor_name, reactor_email }`
- Rate limit: 20 reactions per IP per hour (in-memory Map for MVP; replace with Redis in 2.0)
- Upsert on `(frame_id, reactor_email)` — updating an existing reaction overwrites
- Returns updated reaction counts for the frame

API `/api/share/[token]/comments`:
- POST body: `{ frame_id, body, author_name, author_email }`
- Rate limit: 10 comments per IP per hour
- Insert row; trigger notification to YAGI admins (email via Resend)

**Revision toggle:** for frames where `revision > 1`, show "변경사항 보기 / See changes" link → opens a modal with v1/v2 side-by-side (desktop) or stacked (mobile).

**Approve flow (client-side):** if the client wants to formally approve the whole board, a footer "Approve this board / 승인합니다" button opens a confirm dialog → posts to `/api/share/[token]/approve` → updates `preprod_boards.status='approved'`, `approved_at=now()`, `approved_by_email=<client email>` → sends congrats email to YAGI.

Locale detection: `Accept-Language` header. Korean by default (primary client base); English if detected.

OG image: the board's `cover_frame_id` media used as OG image.

Acceptance:
- Open share URL in incognito → all frames render, no auth required
- Tap 👍 on frame 2 → form asks for name/email → submit → reaction counted
- Tap 👎 on frame 2 (same session) → reaction updates without re-asking
- Comment on frame 3 → appears in YAGI editor within 5 seconds (Realtime)
- Revisioned frame shows v2 with "변경사항 보기" link working
- Approve from share page → YAGI gets email, status flips to 'approved'
- Rate limits work (21st reaction from same IP in an hour gets 429)
- Anon direct query to reactions/comments tables returns 0

---

### 08 — Editor-side reaction & comment panels (realtime)

Extend `board-editor.tsx`:

**Per-frame reaction summary:** below each frame in the left rail, a compact stats line: `5 👍 · 2 👎 · 1 ✋` + comment count badge. Clicking opens a dialog with:
- List of individual reactions (reactor name/email, reaction, timestamp)
- Comments list with resolve/unresolve toggle

**Board-level "Feedback overview" card:** right rail pinnable card that aggregates across all frames:
- Total reactions
- Unresolved comments count
- Sentiment signal: frames with >50% 👎 are flagged red; >80% 👍 are flagged green

**Realtime subscription:**
- One Supabase Realtime channel per board: `preprod_board_{board_id}`
- Subscribes to `preprod_frame_reactions` and `preprod_frame_comments` inserts/updates where `board_id` matches
- On event: optimistically update the local count; no full refetch needed

Do NOT over-subscribe — one channel per open board editor window. Unsubscribe on unmount.

Acceptance:
- Open editor; in another tab, open share URL and submit a reaction
- Editor shows the new reaction within 5 seconds without refresh
- Resolve a comment → share page reflects the resolution on next load (don't need realtime both ways; one-way editor ← share is enough)

---

### 09 — Project detail integration + client-visible shared boards

Extend `src/app/[locale]/app/projects/[id]/page.tsx` (from Phase 1.2):

Add section "Pre-production Boards":
- **YAGI admin view:** all boards (draft + shared + approved + archived), with "Open editor" / "Copy share link" buttons
- **Client view:** only boards with `status IN ('shared', 'approved')`, with "View board / 보드 보기" button that opens `/s/{token}` in new tab
- Clients never see drafts

Project detail also shows a small "Latest feedback" card if the project has any recent reactions/comments — "Frame 3 on Storyboard A got 3 👎 · 2 hours ago".

Acceptance:
- YAGI admin sees all board statuses on project page
- Client sees only shared/approved; share links work; cannot access editor routes
- Latest feedback card appears when reactions exist

---

### 10 — E2E runbook + summary

File: `.yagi-autobuild/phase-1-4-e2e.md`

Runbook:
1. Create board from a project → opens empty editor
2. Add 3 frames: 1 image upload, 1 video upload, 1 YouTube embed
3. Reorder via drag-drop
4. Link 2 project references to frame 2
5. Share the board → get URL
6. In incognito: open URL, submit 👍 on frame 1 + 👎 on frame 2 + comment
7. In YAGI editor: verify reactions + comment appeared in realtime
8. Upload v2 of frame 2 (new image)
9. In incognito: refresh share URL → see v2, click "변경사항 보기" → see v1/v2 compare
10. From share URL: click "Approve" → confirm → YAGI gets email, status='approved'
11. Verify RLS: anon query to `preprod_frame_reactions` returns 0

Final Builder actions:
1. 🛑 **KILL-SWITCH: Codex adversarial review** — run `/codex:adversarial-review --base main --background` with the Phase 1.4 focus prompt from `codex-review-protocol.md`. Wait for result. Apply validation filter. Fix surviving findings. Confirm Telegram "Codex review clean".
2. `pnpm build` (🛑 kill-switch)
3. Write `.yagi-autobuild/summary-1-4.md`
4. Telegram: `✅ Phase 1.4 complete — Pre-production Board live with Fast Feedback.`
5. **Autopilot:** read `phase-1-5-spec.md` + check env prereq (`POPBILL_*`). If env present: kick off B-O-E for 1.5. If absent: Telegram "Phase 1.5 paused — POPBILL env vars needed" and halt.

---

## Dependencies

```powershell
pnpm add @dnd-kit/core @dnd-kit/sortable
```

🛑 **KILL-SWITCH** before this install. Only ONE new dep this phase — revision diff UI uses plain React state; no diff library needed.

NO fal.ai, NO image generation libraries. Reuses Phase 1.2.5 video/oembed infrastructure as-is.

---

## Parallelism plan

```
Wave A: 01 ‖ 02 (i18n ‖ migration — independent)
   ↓
Wave B: 03 (list + create form) — depends on migration
   ↓
Wave C: 04 (editor — the biggest task)
         06 (share action Server Actions)
        [parallel possible — different files]
   ↓
Wave D: 05 (revision UI in editor) — needs 04 stable
         07 (share page + Fast Feedback API) — needs 06
         09 (project page integration) — needs 06
        [three parallel streams]
   ↓
Wave E: 08 (editor realtime panels) — needs 04 + 07 live
   ↓
Wave F: 10 (E2E + Codex review + summary)
```

Context-reset checkpoints after Waves B, D, and E.

---

## Kill-switch triggers (7)

1. Before `pnpm add @dnd-kit/core @dnd-kit/sortable` (subtask 04)
2. Before migration apply (subtask 02) — full SQL posted to Telegram
3. Before creating the `preprod-frames` Storage bucket (included in migration but flagged separately)
4. Before touching `src/components/references/reference-uploader.tsx` if Phase 1.2.5 infra is reused for video upload (should NOT be needed in 1.4 — we should call the existing helper, not modify the uploader; Builder flags if modification seems required)
5. Before running `/codex:adversarial-review` (subtask 10 step 1) — Builder posts the focus prompt to Telegram for Yagi to confirm
6. Before final `pnpm build`
7. Before Autopilot transition to Phase 1.5 — Builder checks `POPBILL_*` env vars; if missing, halts with Telegram notice instead of kicking off 1.5

Each kill-switch follows Yagi's Telegram protocol: `sendMessage` → terminal pause → wait for `continue` or `abort` in chat.

---

## Success criteria

1. `pnpm build` clean, zero TS/ESLint errors
2. Migration clean, types regenerated
3. **End-to-end happy path:** YAGI uploads 3-frame board (mixed media types) → shares → client reacts + comments → YAGI sees in realtime → YAGI uploads v2 of a frame → client approves via share page
4. **Revision integrity:** v1 and v2 both retrievable; only v2 shown by default; side-by-side compare works
5. **Fast Feedback UX:** client submits reaction in ≤ 2 taps after initial name/email prompt (1 tap for subsequent reactions)
6. **Client cannot reach editor:** direct navigation to `/app/preprod/[id]` as client-role user returns 404/redirect
7. **RLS sanity:** anon queries to all 4 new tables return 0
8. **Storage:** anon fetch of `preprod-frames/{any}` returns 401
9. **Rate limits:** reactions 20/hr/IP, comments 10/hr/IP — 21st and 11th respectively return 429
10. **Codex adversarial review passes** — all surviving findings fixed; review output + filter decisions archived to `.yagi-autobuild/codex-review-1-4.md`
11. Telegram kill-switch log shows all 7 pauses observed
12. `summary-phase-1-4.md` written

---

## Model routing

- Builder: Opus 4.7
- Orchestrator: Sonnet 4.7
- Executor 01, 02, 03, 09 (config / list page / project integration): Haiku 4.5
- Executor 04, 05, 07, 08 (editor / revisions / share page / realtime): Sonnet 4.7
- Executor 06 (Server Actions + share token rotation — security-adjacent): Sonnet 4.7
- Executor 10 (Codex review orchestration + summary): Sonnet 4.7
- Evaluator: Sonnet 4.7 fresh context, runs after Wave D and Wave F

Exception: if Executor 04 fails Evaluator, escalate the retry to Opus 4.7.

---

## Forbidden

- Adding in-platform image/video generation. YAGI uploads completed media only. The `fal.ai` module, `@fal-ai/client` dependency, and any `ai_generation_*` code patterns from the earlier 1.4 spec are permanently removed. Do not reintroduce.
- Client-side write access to any `preprod_*` table. All writes go through Server Actions (internal) or the service-role API routes (share page).
- Real-time collaborative editing (two YAGI users editing the same board simultaneously). Single-author model. Last-write-wins with the autosave-on-blur pattern from Phase 1.2.
- Letting clients navigate from `/s/{token}` to the authenticated app via any link. The share page is a walled island.
- Hard-deleting frames with reactions/comments. Archive the frame (add a `deleted_at` column if needed) but preserve feedback history.
- Reusing `share_token` across rotated versions — rotation MUST generate a new token unrelated to the old one.
- Auto-approving a board when all frames get 👍. Approval is explicit — either via YAGI admin action or the client-side "Approve" button with a confirm dialog.
- Sending reactions/comments to YAGI's personal Kakao (this is Phase 2.0+). Use email for notifications.
- Collapsing the v1/v2 compare to a simple "replace" — the revision history IS the feature.

---

## Notes for Yagi

- **No new env vars this phase.** Reuses everything.
- **"YAGI internal workspace" lookup:** same pattern as original 1.4 — Builder looks up `workspaces` row by handle (e.g., `handle = 'yagi-internal'`). Include a migration-time INSERT if row doesn't exist.
- **Fast Feedback rollout to existing clients:** when you enable 1.4 for a client who already signed their first `brief` project under 1.2, simply share them a board URL — no retraining needed. The 👍/👎 UX is intentionally self-evident.
- **Badge / "Made with YAGI" on the share page:** not in 1.4 — that belongs to Phase 1.9 Showcase. Keep the share page minimal in 1.4 so Phase 1.9 can add the badge without collision.
- **Phase 1.9 Showcase reuses `preprod_frames` structure:** when you ship 1.9, a "Publish as Showcase" button on an approved board will create a `showcases` row pointing to the same media. No duplication.

---

**End of Phase 1.4 spec.**
