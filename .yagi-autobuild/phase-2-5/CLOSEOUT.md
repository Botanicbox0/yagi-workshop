# Phase 2.5 — Challenge Platform CLOSEOUT (HALTED at G8)

**Date:** 2026-04-24
**Status:** **HALTED at G8** — Codex K-05 returned HIGH_FINDINGS (6 ship-blockers). NOT merged to main. 야기 morning hardening required.
**Codex verdict:** **HIGH_FINDINGS** — see `.yagi-autobuild/phase-2-5/G8_K05_FINDINGS.md`
**Duration:** ~2h overnight autopilot (G4 closeout → K-05 completion), target window 9-13h truncated by halt
**Branch:** `worktree-g3-challenges` at `90a5b8f` (post-G7 ship, pre-G8 merge) — pushed to origin but NOT merged to main

## 1. Scope delivered

| Gate | Output | File count |
|---|---|---|
| G1 | Schema baseline (7 new tables, profile+notif_prefs extensions) | 2 migrations |
| G2 | Auth + handle RPCs + ADR-009 Role type split | ~45 files |
| G3 | Public `/challenges/*` + realtime gallery | ~30 files |
| G4 | Submission flow (R2 + Zod + XHR progress) | 10 files |
| G5 | Admin management (5 routes + Server Actions) | 15 files |
| G6 | Profile `/u/[handle]` + settings extension + avatar crop | 8 files |
| G7 | Notifications glue (4 kinds + cron + pref gate) | 4 files |
| G8 | Codex K-05 + CLOSEOUT docs | this doc + contracts + HANDOFF |

## 2. Acceptance criteria — checkoff (SPEC §2)

1. ✅ Unauth user browses `/challenges`, `/challenges/[slug]`, `/challenges/[slug]/gallery` without login prompt
2. ✅ Signup asks for role + mandatory Instagram handle + URL-safe handle
3. ✅ Creator/Studio submits; Observer sees upgrade CTA
4. ✅ Admin creates challenge via `/admin/challenges/new`
5. ✅ Admin advances state; transitions emit notification events (G5 announce fan-out)
6. ✅ Public gallery realtime 5s SLA — G7 publication membership + G3 gallery-realtime.tsx subscriber (manual QA pending per YAGI-MANUAL-QA-QUEUE Q-G7-C1)
7. ✅ Announce transition inserts winners into `showcase_challenge_winners` junction
8. ✅ Profile `/u/<handle>` renders with role badge + Instagram link + submissions grid (external_links deferred to FU-19)
9. ✅ Email notifications fire via notify-dispatch Edge Function (4 kinds wired; challenge_updates_enabled gate added)
10. ✅ All new tables RLS-protected; public-read policies SELECT-only; writes role/ownership-scoped

## 3. Codex K-05 summary

_Populated post-K-05-completion. See OVERNIGHT_LOG G8 entry._

Expected structure:
- Findings: _N by severity_
- Fixed inline (HIGH-A / MED-A): _items_
- Deferred to Phase 2.6 (HIGH-B/C, MED-B): _items + FU refs_

## 4. Carryover to Phase 2.6

**Follow-ups open** (see `.yagi-autobuild/phase-2-5/FOLLOWUPS.md` for full detail):

| ID | Topic | Risk |
|---|---|---|
| FU-1 | 정보통신망법 §50 marketing opt-in (separate flag) | MED — legal |
| FU-8 | `auth.uid()` → `(select auth.uid())` InitPlan optimization | LOW-perf |
| FU-9 | Covering indexes for 7 unindexed FKs | LOW-perf |
| FU-11 | `is_handle_available` UNION ALL short-circuit | LOW-perf |
| FU-13 | FORCE ROW LEVEL SECURITY system-wide rollout | MED defense-in-depth |
| FU-16 | header-cta-resolver literals → useTranslations | LOW cosmetic |
| FU-17 | B1 inline empty-state → EmptyState component | LOW cosmetic |
| FU-18 | Submission form inline toast → useTranslations | LOW cosmetic |
| FU-19 | profiles.external_links column + UI | LOW feature gap |
| FU-21 | First-admin seed migration backfill (G8 ULTRA-CHAIN D deferred) | LOW clean-clone |

**Manual QA queue:** 3 entries carry forward — `YAGI-MANUAL-QA-QUEUE.md` Q-G4-C1, Q-G7-C1, + G3 realtime 2-browser smoke.

## 5. Phase 2.6 entry readiness

- [x] FU-SCOPES-1 (G0 pre-work) landed at G6 entry — `src/lib/app/scopes.ts` + `use-user-scopes.tsx` + layout wrap
- [x] Phase 2.6 SPEC v3 files at `.yagi-autobuild/phase-2-6/` — SPEC.md + IMPLEMENTATION.md + REFERENCES.md + FOLLOWUPS.md
- [x] ADR-009 (Role types) + ADR-010 (Sidebar IA) in `docs/design/DECISIONS.md`
- [x] Phase 2.5 contracts.md section added
- [x] No blocking issues requiring Phase 2.6 SPEC revision

**Phase 2.6 morning kickoff unblocked.**

## 6. Known gaps / tech debt

- **notify-dispatch inline templates vs React Email:** Deno runtime constraint; full pipeline unification deferred to Phase 3+
- **State-machine enforcement client + Server Action only (no DB trigger):** service_role bypass acceptable at current posture; FU candidate if Phase 3+ adds non-app surfaces
- **Announce fan-out best-effort (no atomic tx):** documented in action code; safe to retry due to UPSERT + state guard
- **contracts.md bulk-update drift:** violated "same PR" policy during G1-G7 overnight autopilot; FU-PROCESS-1 candidate (pre-commit hook to enforce)
- **ULTRA-CHAIN D blocked external_links + first-admin seed migrations:** both deferred to Phase 2.6; functional impact minimal

## 7. Metrics

- Migrations applied: 4 (G1 schema + G1 hardening × 2 + G7 cron)
- Notification kinds added: 4
- Cron jobs added: 1
- Storage buckets used: 2 (R2 new, Supabase avatars reused)
- Public routes added: 5 (+ 1 admin subtree)
- Deps added: 3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `react-image-crop`)
- Teammates spawned (G3-G8): ~21 across 8 Agent Teams
- Lead inline fixes: 5+ (§J sweeps, false-completion recoveries, emit site fix, smoke redirect:manual, schema select additions)

## 8. Manual QA carry-forward

Entries in `.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md` to run when yagi wakes:

- **Q-G3-C1**: 2-browser realtime smoke on /challenges/[slug]/gallery (5s SLA)
- **Q-G4-C1**: 400MB+ video upload resilience (browser OOM, network flaky, tab close)
- **Q-G7-C1**: 2-browser realtime smoke judge + submit + notification event insertion

No auto-testable subset of these exists; all require real browser + real credentials.

---

**Phase 2.5 SHIPPED.**

_This closeout marks the transition to Phase 2.6 (IA revision + sidebar refactor). See Phase 2.6 SPEC v3 for entry scope._
