# G4 Pre-Audit — Submission flow

> Source: src/ survey (2026-04-23). Accompanied by sibling doc `G4-storage-decision.md`.

---

## 1. 현존 인프라 inventory

### Signed-URL upload (Phase 1.7+ canonical pattern)
**Primary reference:** `src/lib/team-channels/attachments.ts:70-79`

```typescript
export async function requestUploadUrls(input: {
  workspaceId: string;
  channelId: string;
  messageId: string;
  files: RequestUploadInputFile[];
}): Promise<RequestUploadResponse>
```

Flow:
1. Client pre-generates `messageId` (UUID)
2. Server Action (`requestUploadUrls`) issues signed URLs via `createSupabaseService().storage.from(bucket).createSignedUploadUrl(path)`
3. Client uploads directly to Supabase Storage using signed URL (bypasses Vercel 4MB body limit)
4. Path convention: `{workspace_id}/{channel_id}/{message_id}/{uuid}__{filename}`
5. Storage RLS scopes on first path segment

**Secondary reference:** `src/app/[locale]/app/showcases/actions.ts:200-230+` — `requestShowcaseMediaUpload` bucket: `showcase-media`, path: `{showcaseId}/{uuid}__{cleanName}`.

**Older pattern (do NOT copy):** `src/lib/thread-attachments.ts` — direct browser upload, Phase 1.2, bypassed for Phase 1.7+.

### Video primitives
- `src/lib/references/video.ts` exists with:
  - Accepted MIME: `video/mp4`, `video/quicktime`, `video/webm`
  - Max size: 500 MB
  - Duration extraction (reads `<video>` element `loadedmetadata`)
  - Poster generation (640px max width JPEG @ 82%)
  - 15s timeout, graceful fallback
- **Reusable for G4 submissions.**

### Rate-limit primitive
- `src/lib/share/rate-limit.ts` — in-memory sliding window, keyed by `${ip}:${action}`. Horizontally scaled deployments need Redis.
- For G4 challenge submissions: SPEC says "1 submission per user per challenge (DB constraint)" — that's `UNIQUE (challenge_id, submitter_id)` already in G1 migration (commit 58dbf6e). **No new rate-limit primitive required.**

### Sanitization
- **No DOMPurify / markdown sanitization lib in codebase.**
- `text_description` (SPEC §1, 50-2000 chars) requires server-side XSS sanitization per SPEC §3 G4 Task 2.
- Same pipeline decision as G3 (markdown renderer) affects G4.

### shadcn primitives available
All required for multi-step submit form present (Input, Textarea, Button, Label, Form, Select, Radio-group, Checkbox, Dialog, Sonner).

---

## 2. 새로 만들어야 할 것

### New route
- `src/app/[locale]/app/challenges/[slug]/submit/page.tsx` — **locale-prefixed AND auth-gated** (requires Creator/Studio role). Lives inside `(app)` layout (uses Sidebar). SPEC §3 G4 Task 1.
- Alternative: `src/app/challenges/[slug]/submit/page.tsx` (locale-free public, role-gated at handler) — depends on G3 locale-prefix decision; pick once and mirror.

### New lib
- `src/lib/challenges/submissions.ts` — server-side validation + upload URL issuance
  - Accepts: challenge_id, submission shape (JSONB per challenge config)
  - Issues signed upload URLs for declared media types
  - Validates against `challenges.submission_requirements` JSONB
- `src/lib/challenges/content-schema.ts` — Zod schema factory: reads `submission_requirements` JSONB and returns a Zod schema for the specific challenge (dynamic form validation)

### New Server Actions
- `submitChallengeAction(challenge_id, content)` — validates role + challenge state + shape; INSERTs `challenge_submissions` row; emits `challenge_submission_confirmed` notification event
- `requestSubmissionUploadUrlAction(challenge_id, file_manifest)` — mirrors team-channel pattern

### New client components
- `submission-form.tsx` — dynamically renders fields based on challenge's `submission_requirements` JSONB (video? checkboxes for image count? pdf? text area?)
- `submission-upload-progress.tsx` — per-file upload progress bar (reuses team-channel client hook if present)

### Post-submit redirect
- `/challenges/[slug]/gallery#submission-<id>` — scroll-to-anchor on new submission (SPEC §3 G4 Task 4)

---

## 3. SPEC vs 현실 drift (의심점)

### Bucket choice still open (see G4-storage-decision.md)
SPEC §3 G1 Task 9 + §6 Q2: R2 vs Supabase Storage fallback. **Decision at G4 time based on bucket provisioning status.** This audit's sibling doc provides the comparison; yagi picks.

### Role gate for `/challenges/[slug]/submit`
- Requires `profiles.role IN ('creator','studio')`.
- Given PRE-1 (Role type collision), G4 role gate must read **`profiles.role`** (NOT `user_roles.role`). If PRE-1 resolution Option A is adopted: read `AppContext.persona` (new field) not `AppContext.roles`. **Document in G4 gate:** which field is source of truth for submit-eligibility.

### Size cap ambiguity
- SPEC §1: 500MB video cap
- SPEC §6 Q3: "if Supabase Storage fallback is used, cap at 50MB (Free-plan limit)"
- **10× difference** — UI copy, client-side validation, and server validation ALL depend on final choice. G4 cannot start without this pinned. Surface in yagi decision block.

### YouTube URL validation
- SPEC §3 G4 Task 2: "validation (URL format + channel ownership check deferred to Phase 2.6; MVP accepts any valid YouTube URL)"
- No existing YouTube-URL-parse helper. Need: `src/lib/validation/youtube.ts` (regex for various YouTube URL formats including `youtu.be/`, `youtube.com/watch?v=`, `youtube.com/shorts/`).

### PDF upload MIME + size
- SPEC §1: "pdf: up to 1 file, up to 20MB"
- No existing PDF-handling code. New territory. Signed-URL pattern should work identically to video/image.

### Submission edit window
- SPEC §6 Q5 proposal: "closed_judging freezes submissions completely"
- G1 RLS policy enforces this (UPDATE gated on challenge.state='open').
- G4 UI must handle the edit → "too late" error path gracefully (Sonner toast).

### Realtime INSERT → gallery propagation
- G3 gallery subscribes to INSERT on `challenge_submissions`.
- G4 submit flow triggers the INSERT.
- These must integrate seamlessly. Test at G4 close: submit → gallery updates in <5s without reload (SPEC §2 #6).

### Concurrent upload coordination
- Large video (500MB) upload can take minutes. Meanwhile user might navigate away.
- Design decision: is INSERT made upfront (status='created') with upload following, or INSERT only after all uploads confirmed?
- SPEC §3 G4 Task 3: "CREATED → PROCESSING (media validation) → READY" implies upfront row INSERT with state progression.
- Server needs a webhook/cron to transition CREATED→READY after media upload completes. OR client reports back with signed URL confirmation. **Design decision for G4 entry.**

---

## 4. 외부 의존 / ENV prereq

### If R2 chosen (see storage decision doc):
- `CLOUDFLARE_R2_ACCOUNT_ID` (= `d1ca941ed081f237dcdfac514dc9a98f` per user ctx)
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET_NAME` = `yagi-challenge-submissions`
- `CLOUDFLARE_R2_ENDPOINT` = `https://<account_id>.r2.cloudflarestorage.com`
- `CLOUDFLARE_R2_PUBLIC_BASE` (if using custom domain for object serving)
- HANDOFF.md currently has no R2 keys — yagi must provision + add to `.env.local` + Vault.

### If Supabase Storage chosen:
- No new ENV vars (reuse existing `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`)
- Just new bucket `challenge-submissions` + RLS policies.

---

## 5. 테스트 전략 권고

| Layer | Scope | Pattern |
|---|---|---|
| Unit | Dynamic Zod schema from `submission_requirements` JSONB | `.mjs` or vitest |
| Unit | YouTube URL regex | `.mjs` — many edge cases (short links, embedded, timestamps) |
| Integration | RLS INSERT policy on `challenge_submissions` — role IN (creator,studio) + challenge state='open' + own submitter_id | Direct supabase anon/authed clients |
| Integration | Signed-URL issuance flow — generate, upload to bucket, verify object exists | Full round-trip with test bucket |
| E2E | Creator + Studio can submit; Observer sees upgrade CTA | Manual + curl-based API |
| E2E | Rate limit: 2nd submission returns DB unique violation gracefully | Attempt duplicate, expect error surface |
| Manual QA | Large video (400+MB) upload resilience | YAGI-MANUAL-QA-QUEUE entry |
| Visual | Form re-audit vs X1 compliance (primitives, tokens, radii) | Agent re-audit |

---

## 6. 잠재 야기 결정 항목

1. **Storage backend** (→ G4-storage-decision.md — pick R2 or Supabase)
2. **Size cap final** (500MB R2 vs 50MB Supabase-Free). UI copy hinges on this.
3. **Upload timing model** — upfront INSERT (status='created') + async media upload + webhook READY transition? OR INSERT only post-upload?
4. **Markdown renderer + sanitizer** pick (shared with G3) — `react-markdown+rehype-sanitize` vs `marked+DOMPurify`
5. **Role-gate source of truth** — if PRE-1 Option A: `AppContext.persona` or `profiles.role` direct read? If Option B/C: different
6. **Observer CTA destination** — SPEC says "Upgrade to submit" CTA redirects to role upgrade page. That page does not exist yet. G4 scope includes creating it, or deferred to G6 (role-switching under settings)?
7. **Concurrent edit policy** — user starts editing submission, challenge transitions to `closed_judging` mid-edit. UX behavior?

---

**Cross-ref:** G4-storage-decision.md for bucket pick. PRE-1 for role-gate source of truth.
