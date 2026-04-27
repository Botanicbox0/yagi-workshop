# Phase 2.5 G4 — Task Plan (Agent Team / parallel_group)

**Worktree:** reuse `.claude/worktrees/g3-challenges/` (branch `worktree-g3-challenges`) — Phase 2.5 gates continue on same branch until G8 closeout
**Base:** `33b319c` (post-G3 ship)
**Authority:** SPEC v2 §3 G4 + `G2-G8-PRE-AUDIT/G4-submission-flow.md` + `G2-G8-PRE-AUDIT/G4-storage-decision.md`
**Adopted yagi decisions (2026-04-24):**
- Storage backend: **R2** (decisive — public gallery egress zero-cost)
- R2 bucket location: **ENAM accepted** (reads edge-served, writes ~100ms slower for Korean users — acceptable)
- Upload timing: **atomic INSERT post-upload** (client uploads to `tmp/`, server moves + INSERTs `status='ready'` atomically; R2 lifecycle cleans orphans at 24h)
- Video size cap: **500MB**
- YouTube URL validation: **strict regex** (covers `watch?v=`, `youtu.be/`, `shorts/`, `embed/`)
- Submission edit window: **frozen at `closed_judging`** (G1 RLS already enforces; G4 UI rejects gracefully via Sonner toast)

**Route decision:** `/challenges/[slug]/submit` — locale-free, matches G3 routing and the CTA href in `primary-cta-button.tsx`. Auth + Creator/Studio role gate is page-level (`createSupabaseServer` + redirect branches), not middleware. Chrome reuses `<PublicChrome>` from G3.

---

## Group A — Libs + infra (3 teammates, parallel)

File-set disjoint. No cross-deps within group. Pure server-side pieces.

```yaml
- id: A1
  goal: R2 client lib + presigned URL helpers
  files:
    - src/lib/r2/client.ts                (NEW)
  parallel_group: A
  depends_on: []
  complexity: simple    # mechanical SDK wrapping; Haiku OK
  notes: |
    - Export singleton `r2Client` (S3Client configured with R2 endpoint + creds from env).
    - Export `createPresignedPutUrl(key: string, contentType: string, expiresSeconds?: number): Promise<string>`.
    - Export `objectPublicUrl(key: string): string` (for serving uploaded media; uses ENDPOINT + bucket).
    - Bucket name hardcoded to `process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "yagi-challenge-submissions"`.
    - Defensive: throw in dev if any required env var missing, silently skip in server runtime (so sitemap/other non-upload paths don't crash).
    - Path convention documented in file comment: `tmp/<challenge_id>/<client_uuid>/<filename>` for presigned PUT, `submissions/<challenge_id>/<submission_id>/<filename>` for post-atomic.

- id: A2
  goal: YouTube URL strict validator
  files:
    - src/lib/validation/youtube.ts       (NEW)
    - src/lib/validation/youtube.spec.mjs (NEW — .mjs mirror-test pattern from Phase 2.1 G7)
  parallel_group: A
  depends_on: []
  complexity: simple
  notes: |
    - Export `parseYouTubeUrl(raw: string): { kind: "watch" | "shorts" | "embed" | "youtu.be"; videoId: string } | null`.
    - Export `isValidYouTubeUrl(raw: string): boolean` (thin wrapper over parseYouTubeUrl).
    - Regex must cover:
        youtube.com/watch?v=<11chars>            (with optional &t=, &list=, etc.)
        youtu.be/<11chars>                        (with optional ?t=)
        youtube.com/shorts/<11chars>
        youtube.com/embed/<11chars>
        www.youtube.com/... and m.youtube.com/... variants
    - Reject: timestamps alone, playlist URLs without videoId, channel URLs, search URLs.
    - Test file: ~15-20 cases covering valid/invalid. Run via `node src/lib/validation/youtube.spec.mjs`. Exit 0 all pass, 1 any fail.

- id: A3
  goal: Submission content Zod schema factory + helpers
  files:
    - src/lib/challenges/submissions.ts   (NEW)
    - src/lib/challenges/content-schema.ts (NEW)
  parallel_group: A
  depends_on: []
  complexity: complex   # Zod dynamic schema + JSONB-driven validation
  notes: |
    - content-schema.ts exports `buildSubmissionSchema(requirements: SubmissionRequirements): z.ZodType`.
      Given a challenge's submission_requirements JSONB, return a Zod schema that matches the declared shape:
        - text_description: always required, min/max chars from requirements
        - native_video: if present, require { url, poster_url?, duration_sec? }; if required=true, cannot be omitted
        - youtube_url: if present, validate via isValidYouTubeUrl; required-flag respected
        - image: array of { url }, min 0, max requirements.image.max_count
        - pdf: { url } if present; required-flag respected
      Return a z.discriminatedUnion if needed, or a z.object with conditional optional().
    - submissions.ts exports:
        - `getExistingSubmission(challengeId: string, userId: string)` — helper for UI to detect prior submission
        - Type `ValidatedSubmission` — inferred from buildSubmissionSchema output, used across server actions
    - Do NOT author server actions here — that's Group B's scope.
```

**Barrier A→B:** `pnpm exec tsc --noEmit` EXIT=0; `pnpm lint` EXIT=0; `node src/lib/validation/youtube.spec.mjs` exits 0.

---

## Group B — Submit page + server actions (2 teammates, parallel, depends on A)

Interface contract locked up-front (both teammates rely):

```typescript
// Server action signatures (B1 authors; B2 imports to call)
// src/app/challenges/[slug]/submit/actions.ts

export type UploadSlot = {
  kind: "native_video" | "image" | "pdf";
  filename: string;
  contentType: string;
  size: number;  // bytes, for client-side pre-check only; server re-validates via HEAD
};

export type IssuedUpload = {
  slotKey: string;   // client generates uuid, server returns same key
  uploadUrl: string; // presigned PUT URL (3600s TTL)
  objectKey: string; // tmp/<challenge_id>/<uuid>/<filename>
};

export async function requestUploadUrlsAction(
  challengeId: string,
  slots: UploadSlot[]
): Promise<{ ok: true; issued: IssuedUpload[] } | { ok: false; error: string }>;

export async function submitChallengeAction(
  challengeId: string,
  content: {
    text_description: string;
    native_video?: { objectKey: string; poster_url?: string; duration_sec?: number };
    youtube_url?: string;
    images?: { objectKey: string }[];
    pdf?: { objectKey: string };
  }
): Promise<
  | { ok: true; submissionId: string; redirectTo: string }
  | { ok: false; error: "unauthenticated" | "wrong_role" | "not_open" | "already_submitted" | "validation_failed" | "upload_missing"; detail?: string }
>;
```

```yaml
- id: B1
  goal: Server actions — upload URL issuance + atomic submit
  files:
    - src/app/challenges/[slug]/submit/actions.ts  (NEW)
  parallel_group: B
  depends_on: [A1, A2, A3]
  complexity: complex
  notes: |
    - requestUploadUrlsAction:
        * auth check → unauthenticated error
        * role check (profiles.role IN creator/studio) → wrong_role error
        * challenge state='open' → not_open error (soft — client shouldn't even land here, but defend)
        * No prior submission: SELECT 1 FROM challenge_submissions WHERE challenge_id=$1 AND submitter_id=auth.uid() LIMIT 1 → already_submitted error
        * For each slot: generate uuid, build objectKey `tmp/<challengeId>/<uuid>/<filename>`, call r2Client.createPresignedPutUrl, return IssuedUpload[]
        * Rate limit via existing UNIQUE (challenge_id, submitter_id) at DB; no extra in-memory limiter needed for this path
    - submitChallengeAction:
        * All the same auth/role/state checks + rerun "already_submitted" defensively
        * Validate content shape via buildSubmissionSchema(challenge.submission_requirements)
        * For each referenced objectKey: HEAD the R2 object to confirm upload succeeded (HeadObjectCommand). If 404 → upload_missing error.
        * Move tmp/ → submissions/ via R2 CopyObject + DeleteObject. New key: `submissions/<challengeId>/<submissionId>/<filename>`.
        * Derive submissionId first via gen_random_uuid() server-side, use for move key.
        * INSERT challenge_submissions row with status='ready', content JSONB containing the final submissions/ URLs (use objectPublicUrl() for reads).
        * revalidatePath(`/challenges/<slug>/gallery`).
        * Return submissionId + redirectTo `/challenges/<slug>/gallery#submission-<id>`.
    - Errors returned as `{ ok: false, error: <enum> }` — client translates via ko.json.

- id: B2
  goal: Submit page + dynamic form + upload progress
  files:
    - src/app/challenges/[slug]/submit/page.tsx                 (NEW — RSC guard + render)
    - src/components/challenges/submission-form.tsx             (NEW — "use client", RHF + Zod)
    - src/components/challenges/submission-upload-progress.tsx  (NEW — per-file progress)
  parallel_group: B
  depends_on: [A3]   # needs content-schema exports for form
  # soft dep on B1 action signatures (interface above) — can stub call during dev, real import once B1 lands
  complexity: complex
  notes: |
    - page.tsx (server component):
        * Fetch challenge via getChallengeBySlug. notFound() if null.
        * If state !== 'open': redirect to `/challenges/<slug>` with toast-via-query-param (or inline notice).
        * Auth check: if no user → redirect to /signin?next=/challenges/<slug>/submit
        * Role check: if role=observer → redirect /onboarding/role?next=/challenges/<slug>/submit
        * If role not in (creator,studio) → redirect / (no profile)
        * If already submitted: render "이미 작품 올렸어요 — <gallery link>" instead of form (query challenge_submissions for existing).
        * Otherwise: render <SubmissionForm challenge={c}/>
        * Wrapped in <PublicChrome>.
    - submission-form.tsx ("use client"):
        * RHF + Zod schema from buildSubmissionSchema(challenge.submission_requirements)
        * Multi-section form rendered per declared types (video section, image section, pdf section, youtube section, text section)
        * Upload flow:
            1. onSubmit → collect files → call requestUploadUrlsAction → get IssuedUpload[]
            2. For each file: parallel fetch(uploadUrl, { method: 'PUT', body: File, headers: {Content-Type} }) → track per-file progress via fetch's Progress API (or XMLHttpRequest wrapper for real progress)
            3. Once all uploads complete: call submitChallengeAction with objectKey references
            4. On success: router.push(redirectTo) + toast "작품 올렸어요"
            5. On failure per error code: map to ko.json toast (already_submitted, not_open, upload_missing, validation_failed, wrong_role, unauthenticated)
        * Validation: client-side Zod validation BEFORE requestUploadUrlsAction (no wasted signed URLs)
        * File-size pre-check: abort submit if any file exceeds its slot's max (500MB video, 10MB image, 20MB pdf)
    - submission-upload-progress.tsx ("use client"):
        * Small component: filename + progress bar + % + cancel button
        * Progress via XHR wrapper (fetch's ReadableStream doesn't give reliable upload progress in all browsers for file PUT)
```

**Barrier B→stop:**
- `pnpm exec tsc --noEmit` EXIT=0
- `pnpm lint` EXIT=0
- `pnpm build` EXIT=0 (catches RSC/client boundary issues)
- Smoke: `curl -sI localhost:3003/challenges/<test-slug>/submit` → 200 (auth/role check may redirect, but 200 OR 307 is acceptable; 500 is not)
- i18n ko.json entries added (submit.*, submit.errors.*, submit.toast.*) — either by B2 inline or by C1

**STOP POINT:** yagi visual review of submit flow — form rendering, role-gate redirects, upload UI, error paths. No Group C spawn until GO.

---

## Group C — Polish + smoke + closeout prep (1-2 teammates, depends on B)

```yaml
- id: C1
  goal: Smoke tests + edge-case coverage + i18n completion
  files:
    - tests/e2e/challenges-submit.smoke.mjs     (NEW — node smoke pattern from G3 D1)
    - messages/ko.json                          (EDIT — only new submit.* keys if B2 didn't land them)
    - .yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md   (EDIT — append 500MB upload smoke entry)
  parallel_group: C
  depends_on: [A1, A2, A3, B1, B2]
  complexity: medium
  notes: |
    - Smoke script: 6 assertions
        GET /challenges/test-open-1/submit              → 200 or 307 (auth redirect)
        GET /challenges/test-judging-1/submit           → 307 or 302 (not-open redirect)
        GET /challenges/does-not-exist/submit           → 404
        POST /api/... (if we expose any) — skip, actions are server-only
        Verify schema: node src/lib/validation/youtube.spec.mjs → exits 0
        Verify schema: node <content-schema tiny test> → exits 0 (optional; if complex, skip)
    - Manual QA queue entry: 400+MB video upload resilience (network flaky, tab close, retry) — requires real browser + real file, yagi-run not Builder-run
    - i18n ko.json gap-fill only. If B2 inlined everything, this task is a no-op confirmation.
```

**Barrier C→G4 CLOSEOUT:** `pnpm build` EXIT=0, smoke 6/6 pass, yagi-manual-QA entry recorded.

---

## Pre-spawn blockers (yagi-side, non-blocking for Group A start)

These must be resolved BEFORE end-to-end test (Group C smoke + yagi visual review), NOT before Group A/B spawn:

1. **R2 CORS policy** — apply via Dashboard (1-min manual, see `G4-storage-decision.md` §CORS) or wrangler CLI. Without this, browser PUT to signed URL fails with CORS error at upload time. Group A/B code compiles and type-checks without it.

2. **R2 Lifecycle rule** — `tmp/` prefix 24h expiry via Dashboard (1-min manual, see `G4-storage-decision.md` §Lifecycle). Without this, orphaned failed uploads accumulate. Cosmetic for MVP launch, operational debt.

3. **Vercel env vars sync** — copy the 4 `CLOUDFLARE_R2_*` keys into Vercel project settings for prod deploy. Not required for local dev.

Builder will remind yagi of these at Group B completion / stop point.

---

## Files NOT in this task plan (already present or explicitly out-of-scope)

- `src/lib/references/video.ts` — Phase 1.x primitive, reused as-is for duration/poster extraction client-side
- `src/lib/challenges/types.ts` — G3 output, imported as-is
- `src/lib/supabase/server.ts` — existing, used for auth/role lookup
- `src/components/challenges/public-chrome.tsx` — G3 output, wraps submit page
- Admin submission moderation (reject/approve) — G5 scope, not G4
- Notification emission (`challenge_submission_confirmed` event) — G7 scope per SPEC §3 G7

---

## Estimated timing

| Group | Teammates | Wall time |
|---|---|---:|
| A | 3 parallel (Haiku × 2 + Sonnet × 1) | 30-45min |
| B | 2 parallel (Sonnet × 2) | 60-90min |
| **Stop** | — | yagi visual review |
| C | 1 (Sonnet) | 30-45min |

Builder wall clock: ~2-3h excl. yagi review. SPEC §3 G4 target was "4-5 hours" — parallelism headroom.
