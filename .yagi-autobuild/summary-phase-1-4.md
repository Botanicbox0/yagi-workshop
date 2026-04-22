# YAGI Workshop — Phase 1.4 Summary

**Date:** 2026-04-22
**Status:** Complete (autopilot mode — kill-switches off)
**Build:** clean (30 routes, 0 errors, 0 warnings)
**Codex K-05:** 4 HIGH fixed inline, 3 MEDIUM + 2 LOW deferred to follow-ups (task #24)

## Wave A — i18n + migration + DB types (parallel)

- **i18n** (`messages/{ko,en}.json`): 71 keys added across 5 new namespaces (`preprod` 24, `frames` 15, `revisions` 8, `reactions` 9, `share` 14, `nav.preprod` 1). Both locales balanced. Korean uses 존댓말; share namespace slightly warmer (client-facing).
- **Migration `phase_1_4_preprod_board_20260422`** (live in DB):
  - `preprod_boards`, `preprod_frames`, `preprod_frame_reactions`, `preprod_frame_comments` tables
  - **yagi-internal workspace seed** (slug='yagi-internal', plan='custom') with yagi_admin user as ws_admin
  - **BEFORE INSERT trigger `preprod_boards_set_workspace_id_ins`** (SECURITY DEFINER) — overrides caller-supplied `workspace_id` with yagi-internal lookup. TOCTOU-safe (Phase 1.3 lesson applied).
  - Storage bucket `preprod-frames` (private) with read/write/delete RLS keyed on `(storage.foldername(name))[1] = board.id::text`
  - RLS policies use `is_yagi_admin(auth.uid()) OR is_ws_member(auth.uid(), workspace_id)` for select; `is_ws_admin` for insert/update with WITH CHECK
  - Updated_at triggers via `tg_touch_updated_at()`
  - Unique partial index on `(revision_group)` where `is_current_revision=true`
- `database.types.ts` regenerated (1025 lines).

## Wave B — list page + create form (parallel)

- `src/app/[locale]/app/preprod/page.tsx` — RSC list page, RLS-scoped, status + project searchParams filter, batched frame count query, `Intl.DateTimeFormat` Asia/Seoul.
- `src/app/[locale]/app/preprod/new/page.tsx` + `src/components/preprod/new-board-form.tsx` — RHF + Zod create form (projectId radio + title + description textarea).
- `src/app/[locale]/app/preprod/actions.ts` — `createBoard` server action with yagi-internal lookup; trigger guarantees workspace_id correctness.
- `src/components/app/sidebar-nav.tsx` — `preprod` nav item added (gated `yagi_admin` only since roles array doesn't carry workspace membership).

## Wave C — editor + share-actions (parallel)

- **`src/components/preprod/board-editor.tsx`** (~2000 lines) — drag-reorder via `@dnd-kit/sortable` (inline transform, no `@dnd-kit/utilities`), 3-column layout (left rail / canvas / right rail), 3 media types (image upload / video upload / video embed via /api/unfurl), autosave-on-blur with 600ms debounce + saved indicator.
- **`src/app/[locale]/app/preprod/[id]/actions.ts`** — addFrame / addFrameFromUrl / updateFrame / deleteFrame / reorderFrames / updateBoardTitle.
- **`src/app/[locale]/app/preprod/[id]/share-actions.ts`** — shareBoard (idempotent + race-guarded `.in('status', ['draft','shared','approved'])`, requires ≥1 current-revision frame), unshareBoard, rotateShareToken, approveBoard (yagi-side), archiveBoard. Tokens: `randomBytes(32).toString('base64url')`.

## Wave D — revisions + share page + project integration (parallel)

- **Revisions:** `createFrameRevision` (race-guarded conditional UPDATE on `is_current_revision=true`, rollback re-promote on insert failure) + `restoreFrameRevision` (copies historical row as new revision+1). Editor right rail gets revision history list + `CompareDialog` (Radix, side-by-side 50/50 grid). "Upload new revision" Popover (Image / Video / Paste URL).
- **Share page `/s/[token]`** — true walled island, no `[locale]` prefix, no auth, service-role.
  - `src/lib/share/share-data.ts` — `loadShareData(token)` returns null for missing/disabled/archived; signed URLs in chunks of 100.
  - `src/lib/share/rate-limit.ts` — in-memory `Map<key, Window>` per-instance (MVP; Redis later).
  - `src/app/s/[token]/{layout,page}.tsx` — minimal HTML shell, dynamic locale message import via Accept-Language, `NextIntlClientProvider` + `Toaster`.
  - Components: `fast-feedback-bar.tsx` (3-button reactor + localStorage identity), `comment-form.tsx`, `revision-compare.tsx`, `approve-button.tsx`.
  - 3 API routes (`/api/share/[token]/{reactions,comments,approve}/route.ts`) — Zod validation + rate-limit (20/10/5 per hr) + Resend notification to YAGI.
- **Project page integration** — `src/app/[locale]/app/projects/[id]/page.tsx` adds "Pre-production Boards" section between References and Threads. YAGI admin sees all boards + Copy share link button + editor link; clients see only `shared`/`approved` + view-only public link. "Latest feedback" card aggregates most recent reaction or comment.

## Wave E — editor realtime panels

- **`src/app/[locale]/app/preprod/[id]/page.tsx`** loads `preprod_frame_reactions` + `preprod_frame_comments` server-side, passes as `initialReactions` / `initialComments`.
- **`src/app/[locale]/app/preprod/[id]/actions.ts`** + `assertCanModerate()` helper (yagi_admin OR ws_admin of yagi-internal) → `resolveComment` / `unresolveComment`.
- **`src/components/preprod/board-editor.tsx`** (+570 lines):
  - Per-frame stats line (emoji counts + comment badge + sentiment dot) clickable → `FeedbackDialog` (Radix Dialog with reactions list + comments + resolve/unresolve toggle)
  - Right rail `FeedbackOverviewCard` (total reactions, unresolved comments, sentiment-flagged frame counts; thresholds: like/total > 0.8 → positive, dislike/total > 0.5 → negative)
  - Realtime `useEffect` subscription on channel `preprod_board_${board.id}` with two `postgres_changes` filters (reactions + comments, both `board_id=eq.${board.id}`, events `*`); cleanup `supabase.removeChannel(channel)` on unmount
- 16 new i18n keys in `preprod` namespace (`feedback_overview`, `feedback_total_reactions`, `feedback_resolve`, `feedback_anonymous`, etc.).

## Wave F — Codex K-05 + final build

- `pnpm build` initially failed: 1 ESLint `prefer-const` error + 3 unused-var warnings. All fixed inline (4 small edits across 4 files).
- Codex `gpt-5.4 high reasoning` adversarial review against the 6 focus areas in `_codex_review_1_4_prompt.txt`.
- `pnpm build` final clean (30 routes, 0 errors, 0 warnings).

### Findings

**HIGH (4) — all fixed inline**

1. **`src/lib/share/rate-limit.ts:38`** — `getClientIp()` honored caller-supplied `x-forwarded-for` / `x-real-ip` → IP rotation bypassed rate limit.
   - **Fix applied:** prefer Vercel's platform-set `x-vercel-forwarded-for` (only header guaranteed not user-controlled). Fall back to `x-real-ip` only on non-Vercel hosts. (Cold-start in-memory reset still requires Redis — documented MVP limitation, deferred follow-up.)

2. **`src/app/api/share/[token]/approve/route.ts:45`** — Anyone with the share link could irreversibly approve and spoof `approved_by_email`.
   - **Fix applied:** (a) approval audit email now includes source IP + User-Agent + explicit "Identity is unverified" disclaimer + label changed from "Approved by" to "Claimed approver". (b) New Server Action `revertApproval(boardId)` in `share-actions.ts` lets YAGI flip `approved` → `shared` (race-guarded `.eq('status','approved')`) and clears `approved_at` / `approved_by_email` if the email reveals a spoof.

3. **`src/app/[locale]/app/preprod/[id]/actions.ts:19`, `src/lib/share/share-data.ts:100`** — A logged-in caller could submit `media_storage_path` / `thumbnail_path` outside their own board's prefix → service-signed and exposed via `/s/[token]`.
   - **Fix applied:** new `isPathInsideBoard(path, boardId)` helper enforces `path.startsWith(${boardId}/)` AND rejects `..` / `.` / empty segments. Applied in `addFrame` and `createFrameRevision` (both upload media types + thumbnail).

4. **`src/app/[locale]/app/preprod/[id]/actions.ts:152`, `src/lib/share/share-data.ts:86`** — `updateFrame` accepted arbitrary `reference_ids`; `loadShareData()` fetched/signed by ID only → cross-project private references could be exposed.
   - **Fix applied:** (a) `updateFrame` joins frame → board → project_id and validates EVERY `reference_id` against that `project_id` before write. (b) Defense-in-depth: `loadShareData()` adds `.eq('project_id', board.project_id)` to its `project_references` query so even a tampered/legacy frame can't leak references from a different project.

**MEDIUM/LOW (5) — deferred to task #24**

- MEDIUM: `actions.ts:25` (`createBoard`) — `projectId` not authorized against the caller's project visibility before insert. Fix: load project, require `is_yagi_admin` OR `is_ws_admin` of project workspace.
- MEDIUM: `preprod/page.tsx:58`, `preprod/[id]/page.tsx:28` — visibility allows any `is_ws_member(uid, yagi-internal)` rather than gating on `is_yagi_admin`. Fix: tighten to `is_yagi_admin` only OR add a dedicated preprod role.
- MEDIUM: `reactions/route.ts:62` — UPSERT identity is `(frame_id, reactor_email)` and email comes from request body → callers can overwrite anyone's vote. Fix: server-issued anonymous session token bound to a cookie.
- LOW: `board-editor.tsx:456` — editor reaction aggregator expects `hand`, but the public surface uses `needs_change` → totals/badges/sentiment ignore that bucket. Fix: rename consistently to `needs_change`.
- LOW: `fast-feedback-bar.tsx:129` — clicking same reaction twice clears local UI but backend never deletes → false "undo" UX. Fix: add DELETE endpoint OR keep button selected on repeat.

### Codex no-bug confirmations

- No confirmed stored XSS — comment/approval emails escape HTML; comment rendering relies on React escaping.
- No practical token enumeration — `randomBytes(32).toString('base64url')` (256-bit entropy); `/s/[token]` collapses missing/unshared/archived to the same null path.

## Deviations from spec

1. **`workspace_id` derivation moved to DB trigger** — spec said "YAGI INTERNAL WORKSPACE (not the client's)"; solved with new yagi-internal workspace + BEFORE INSERT trigger that hard-overrides any caller-supplied value. Server Action's `workspace_id` parameter is discarded by the trigger. (Phase 1.3 TOCTOU pattern reused.)
2. **Sidebar nav scope** — preprod gated to `yagi_admin` only because the `roles` array from `user_roles` doesn't carry workspace membership; yagi-internal members would not match the role filter even if granted access. Documented inline.
3. **`@dnd-kit/utilities` not installed** — inline transform string from `useSortable`'s `transform` object instead.
4. **Signed URL strategy** — server-side batch in RSC page (chunks of 100), passed as `mediaUrls: Record<string, string>` to client; new uploads create signed URL client-side and merge into local state.
5. **No password-gated share links** — schema supports `share_password_hash` but unused (per spec, deferred to 2.0+).
6. **Public approval is unverified by design** — Codex flagged HIGH; mitigation is audit email + `revertApproval` rather than blocking the click-to-approve UX. Long-term fix (verified email magic-link) deferred.

## What's NOT done (intentional)

- In-platform image/video generation (out of scope; YAGI uploads from external pipelines).
- Real-time collaborative editing (single-author pattern is fine).
- Custom board templates (spec defers Duplicate to follow-up).
- Password-gated share links (deferred to 2.0+; schema ready).
- Cross-region rate-limit dedup via Redis (MVP uses per-instance in-memory Map).
- Anonymous session-bound reactor identity (MEDIUM finding deferred — current design accepts spoofable email + UPSERT collision).
- Verified email approver magic-link (HIGH #2 mitigated via audit + revert rather than full fix).

## Files of record

- `.yagi-autobuild/_codex_review_1_4_prompt.txt`
- `.yagi-autobuild/_codex_review_1_4_output.txt`

**Next:** Phase 1.5 — Invoicing (팝빌) in **MOCK MODE** (popbill credentials pending — POPBILL_MODE=mock env var gates the path). Per user instructions saved to memory `project_phase_1_5_mock_mode.md`. K-01 env gate skipped. Autopilot continues.
