# Phase 2.5 G5 — Closeout (overnight autopilot)

**Date:** 2026-04-24
**Status:** SHIPPED
**Branch:** `worktree-g3-challenges`

## Summary

G5 ships admin challenge management — 5 routes + CRUD/judge/announce Server Actions. No DB writes (schema unchanged). 6 teammates across 2 groups (A: 3 parallel; B: 3 parallel). Batch decisions Q-020~025 pre-authored by yagi; no Builder round-trip.

## Groups

| Group | Teammates | Output |
|---|---|---|
| A | state-machine-author (Haiku), admin-list-author (Haiku), builder-author (Sonnet) | state-machine.ts, form builders × 2 |
| B | crud-author (Sonnet), judge-author (Sonnet), announce-author (Sonnet) | 4 pages + 4 actions + 2 islands + 4 notification kinds |

## Files shipped

```
src/lib/challenges/state-machine.ts                            (A1 NEW)
src/components/admin/challenges/submission-requirements-builder.tsx  (A3 NEW)
src/components/admin/challenges/judging-config-builder.tsx     (A3 NEW)
src/lib/notifications/kinds.ts                                 (B3 EDIT — 4 Phase 2.5 kinds pre-registered)
src/app/[locale]/app/admin/challenges/page.tsx                 (A2 → lead fix NEW — teammate marked completed without file)
src/app/[locale]/app/admin/challenges/actions.ts               (B1 NEW)
src/app/[locale]/app/admin/challenges/new/page.tsx             (B1 NEW)
src/app/[locale]/app/admin/challenges/[slug]/edit/page.tsx     (B1 NEW)
src/app/[locale]/app/admin/challenges/[slug]/edit/challenge-edit-form.tsx  (B1 NEW — client island)
src/app/[locale]/app/admin/challenges/[slug]/judge/page.tsx    (B2 NEW)
src/app/[locale]/app/admin/challenges/[slug]/judge/actions.ts  (B2 NEW)
src/app/[locale]/app/admin/challenges/[slug]/judge/submission-judge-card.tsx (B2 NEW — client island)
src/app/[locale]/app/admin/challenges/[slug]/announce/page.tsx (B3 NEW)
src/app/[locale]/app/admin/challenges/[slug]/announce/actions.ts (B3 NEW)
src/app/[locale]/app/admin/challenges/[slug]/announce/announce-island.tsx (B3 NEW — client island)
```

## Barriers

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | EXIT=0 |
| `pnpm lint` | EXIT=0 |
| `pnpm build` | EXIT=0 |
| §J audit | clean (post lead fixes — see below) |
| Design-system audit | clean |

## Lead inline fixes (4 files)

1. **A2 false-completion recovery:** admin-list-author marked task completed but did NOT write `/admin/challenges/page.tsx`. Lead authored the list page from scratch (table + state filter + action links per row), matching admin/invoices chrome pattern.
2. **§J sweep post-B:** three admin files used ban-words:
   - `announce-island.tsx`: "제출물" × N → "작품"; "투표 수" → "응원 수"
   - `judge/page.tsx`: "제출물" × 2 → "작품"
   - `submission-judge-card.tsx`: "제출자" → "창작자"
   Admin UI is internal but §J vocabulary rule applies everywhere (no admin exception in the spec).

## Decisions registered

DECISIONS_CACHE.md Q-020 through Q-025 appended at G5 entry:
- Q-020 admin submission-requirements form UX (static fold/unfold)
- Q-021 judging-config UX (radio + slider)
- Q-022 sync fan-out for notification emits (up to 100 submitters)
- Q-023 slug lock after state != draft
- Q-024 closed_judging → open reopen allowed
- Q-025 score scale 0-10

## Known limitations

- announceWinnersAction fan-out is best-effort (no atomic tx across winner INSERTs + state UPDATE + notification_events). Safe to retry due to UPSERT + state guard. Future Phase 2.6+ could wrap in plpgsql function for true atomicity.
- Admin pages use semantic admin-chrome (invoices pattern) — no sidebar/header reuse customization. Visual polish deferred to post-MVP.
- Admin-only judgment scale hardcoded to 0-10 (Q-025). Per-challenge override possible via schema extension in Phase 3+.

## Notification kinds pre-registered (B3)

announce-author added 4 Phase 2.5 kinds to `src/lib/notifications/kinds.ts` preemptively to compile:
- `challenge_submission_confirmed` (G4 scope nominal, still emitted via G7 dispatch)
- `challenge_closing_soon` (G7 pg_cron emit)
- `challenge_announced_winner` (G5 announce emit)
- `challenge_announced_participant` (G5 announce emit)

G7 will extend if needed but these 4 cover SPEC §3 G7 Task 1 entirely. Headstart.

## Codex K-05

Not triggered at G5 per ADR-005 expedited. Phase 2.5 G8 runs consolidated K-05.

## Next

Autopilot continues → G6 (profile surface `/u/<handle>` + §0 pre-work verify for scopes.ts + UserScopesProvider).
