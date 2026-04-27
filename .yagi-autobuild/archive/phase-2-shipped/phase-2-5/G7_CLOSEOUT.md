# Phase 2.5 G7 — Closeout (overnight autopilot)

**Date:** 2026-04-24
**Status:** SHIPPED — migration applied + Edge Function deployed

## Summary

G7 ships notification integration layer: 4 new challenge notification kinds wired into i18n + notify-dispatch Edge Function + pg_cron `challenges-closing-reminder` job (every 15min). Also adds `challenge_updates_enabled` email gating (in-app row stays, email skips when pref=off). 3 teammates parallel. **First Phase 2.5 DB write** (pg_cron schedule migration) — allowed per ULTRA-CHAIN D rule. Codex K-05 deferred to G8 consolidated pass per ADR-005.

## Pre-flight findings (lead inline fixes before Group A)

- kinds.ts already had 4 challenge kinds registered (G5 B3 announce-author preemptive). §A no-op.
- G4 `submitChallengeAction` was missing `challenge_submission_confirmed` emit → lead inline fix (INSERT notification_events post-submission with blank title/body + payload.challenge_title; notify-dispatch renders localized).
- G4 `fetchChallenge` helper `.select()` missing `title` → added.

## Groups

| Task | Author | Deliverable |
|---|---|---|
| A1 | notif-i18n-author (Haiku) | 8 i18n entries (ko+en × 4 kinds) |
| A2 | dispatch-author (Sonnet) | 4 renderers + isChallengeKind helper + pref gate in HIGH/MEDIUM paths |
| A3 | cron-migration-author (Sonnet) | Migration SQL (locale-aware: blank body, notify-dispatch renders) |

Lead operations:
- Pre-flight G4 emit fix
- MCP apply_migration → cron job scheduled (jobid=3, schedule `*/15 * * * *`)
- MCP get_advisors(security) → 0 new WARNs attributable (9 pre-existing unchanged)
- `supabase functions deploy notify-dispatch` → deployed
- QA queue entry appended for 2-browser realtime smoke

## Files shipped

```
messages/ko.json                                                            (A1 EDIT — 4 new event keys)
messages/en.json                                                            (A1 EDIT)
supabase/functions/notify-dispatch/index.ts                                 (A2 EDIT — templates + pref gate; deployed)
supabase/migrations/20260424010000_phase_2_5_challenges_closing_reminder_cron.sql (A3 NEW — applied via MCP)
src/app/challenges/[slug]/submit/actions.ts                                 (lead inline — emit + title select)
.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md                                     (lead — Q-G7-C1 entry)
```

## Barriers (final)

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | EXIT=0 |
| `pnpm lint` | EXIT=0 |
| `pnpm build` | EXIT=0 |
| cron.job entry | jobid=3 scheduled `*/15 * * * *` |
| get_advisors(security) | 0 new WARNs attributable to G7 migration |
| notify-dispatch deploy | success (dashboard URL recorded) |
| §J audit | clean (no new ban-words in challenge kinds copy) |

## Decisions adopted (Q-033 through Q-039)

- Q-033 4 new kinds + severity (Q1=yes)
- Q-034 ko+en copy (Q2=yes)
- Q-035 inline Deno templates (Q3=yes)
- Q-036 pg_cron via migration (Q4=yes)
- Q-037 locale-aware: cron inserts blank body (Q5=yes)
- Q-038 challenge_updates_enabled gates email only (Q6=yes)
- Q-039 2-browser smoke in YAGI-MANUAL-QA-QUEUE (Q7=yes)

## Codex K-05

Per ADR-005 expedited + SPEC §7, Phase 2.5 runs Codex K-05 once at G8 over the full phase diff — this includes the G7 cron migration. **No pre-apply K-05 was run.** If K-05 flags the cron SQL at G8, hardening migration addresses.

## Next

G8 entry — Codex K-05 consolidated pass + full Phase 2.5 closeout.

Autopilot continues.
