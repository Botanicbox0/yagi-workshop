# Phase 2.5 G4 — Closeout

**Date:** 2026-04-24
**Status:** SHIPPED (code complete; Telegram sent; push authorized via overnight autopilot)
**Branch:** `worktree-g3-challenges`

## Summary

G4 ships the `/challenges/[slug]/submit` flow: authenticated creator/studio upload pipeline with R2-backed signed-URL upload, atomic post-upload INSERT, per-challenge dynamic Zod validation, YouTube URL strict regex, and a 9-assertion node smoke. Reuses G3 `<PublicChrome>` + primary CTA redirects. 3 sub-groups (A/B/C), 6 teammates, ~3h wall clock.

## Groups

| Group | Purpose | File count | Models |
|---|---|---:|---|
| A | Libs (R2 client, YouTube validator, Zod schema) | 5 | 2×Haiku + 1×Sonnet |
| B | Server actions + submit page + form + progress | 4 | 2×Sonnet |
| C | Smoke + FU-18 + QA queue entry | 3 files touched | 1×Haiku + lead fix |

## Files shipped (10 new + 3 modified)

```
src/lib/r2/client.ts                              (A1 NEW)
src/lib/validation/youtube.ts                     (A2 NEW)
src/lib/validation/youtube.spec.mjs               (A2 NEW)
src/lib/challenges/content-schema.ts              (A3 NEW)
src/lib/challenges/submissions.ts                 (A3 NEW)
src/app/challenges/[slug]/submit/actions.ts       (B1 NEW)
src/app/challenges/[slug]/submit/page.tsx         (B2 NEW)
src/components/challenges/submission-form.tsx     (B2 NEW)
src/components/challenges/submission-upload-progress.tsx (B2 NEW)
tests/e2e/challenges-submit.smoke.mjs             (C1 NEW + lead fix)

.yagi-autobuild/phase-2-5/FOLLOWUPS.md            (C1 EDIT — FU-18 appended)
.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md           (C1 EDIT — Q-G4-C1 appended)
.yagi-autobuild/phase-2-5/G4-TASK-PLAN.md         (lead authored pre-spawn)
.env.local                                        (lead — R2 creds synced from main)
package.json + pnpm-lock.yaml                     (lead — @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner)
```

## Barriers (final)

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | EXIT=0 |
| `pnpm lint` | EXIT=0 |
| `pnpm build` | EXIT=0 |
| `node tests/e2e/challenges-submit.smoke.mjs` | 6/6 + youtube 23/23 nested |
| §J vocabulary audit | clean (1 lead fix: page.tsx:147 "갤러리에 공개돼요" → "바로 공개돼요") |
| Design-system audit | clean |

## Lead inline fixes

1. **§J violation:** `submit/page.tsx:147` `"갤러리"` → `"바로 공개돼요"` (rewrite to avoid ban word without losing semantic)
2. **Smoke script bug:** `tests/e2e/challenges-submit.smoke.mjs` — added `{ redirect: "manual" }` to fetch call so 307 redirect is observed instead of followed; the script was reporting 200 on auth-gated route that actually returned 307

## R2 infra (bucket + policies)

- Bucket `yagi-challenge-submissions` at ENAM (yagi accepted per DP Q1-2; read edge-served, write ~100ms slower — acceptable)
- **CORS applied via Cloudflare HTTP API** (lead curl; verified via GET): origins `[http://localhost:3003, https://yagiworkshop.xyz]`, methods `[GET, PUT, POST, HEAD]`, ExposeHeaders `[ETag]`, MaxAge 3600
- **Lifecycle applied** (lead curl; verified via GET): rule `tmp-expire-24h`, prefix `tmp/`, Delete at 24h
- `CLOUDFLARE_API_TOKEN` used for PUTs, then deleted from main `.env.local` (TTL 1h would have auto-expired anyway)
- Runtime creds (4 env vars) synced to worktree `.env.local`; Vercel sync deferred to yagi's separate Warp session

## Follow-ups registered (open)

| ID | Scope | Risk |
|---|---|---|
| FU-18 | Submission form inline toast map → `useTranslations` (6 keys) | LOW — maintainability only |
| Q-G4-C1 (manual QA) | 400MB+ video upload resilience smoke (browser, real file) | MED — large-file OOM + CORS 403 risk |

Existing (from G3):
- FU-16 (LOW) header-cta-resolver literals → useTranslations
- FU-17 (LOW) B1 inline empty-state → `<EmptyState>` consolidation

## Codex K-05

NOT triggered at G4 per ADR-005 expedited. Phase 2.5 G8 runs one consolidated K-05 over the full phase diff. G4 introduced no DB writes (schema unchanged since G1; only app-layer). No pre-apply review cadence applies.

## Parallelism retrospective (Agent Teams continuing)

**What worked (continuing G3 patterns):**
- Interface contracts locked in G4-TASK-PLAN before spawn — B1+B2 soft-dep on action signatures resolved without blocking
- A3 soft-dep on A2's `isValidYouTubeUrl` — resolved cleanly (A2 landed first)
- File-set disjointness maintained — zero conflicts across 6 teammates

**What surfaced:**
- C1 smoke script defaulted `fetch()` to follow-redirects → 307 miscompared as 200. Fixed by lead (`{ redirect: "manual" }`). Worth noting for future node-based smokes — always set redirect:"manual" on status-assert tests
- C1 teammate did not mark task completed in shared task list (file work done + QA entry + FU-18 entry present, but TaskUpdate missed). Lead marked completed after barrier verified. Minor coordination gap.

## Commit

Single commit on `worktree-g3-challenges`. Autopilot overnight authorization covers push + G5-G8 chain.

## Next (autopilot)

yagi overnight authorization:
1. ✅ G4 closeout (this doc + commit + push + Telegram)
2. → G5 entry (admin challenge management) — DP pre-authored with Q1-6=yes, Q6=0-10
3. → G6 entry (profile surface /u/<handle>) — DP pre-authored with Q1=yes, Q2=yes, Q3=no, Q4-7=yes
4. → G7 entry (notifications + pg_cron reminder) — DP pre-authored, all yes
5. → G8 entry (Phase 2.5 closeout + Codex K-05 single pass) — DP pre-authored, all yes

Stop triggers (Telegram halt):
- Codex HIGH-A finding (exploitable today, TRIAGE 밖)
- SPEC drift
- build/tsc/lint fail 2회 연속
- R2 access / Supabase migration 실패
- 배치 답변 파싱 실패

Phase 2.5 G8 완료 후 STOP. Phase 2.6은 야기 morning review 후 별도 kickoff.
