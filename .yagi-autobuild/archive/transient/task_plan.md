# YAGI Workshop — Phase 1.2 Task Plan

**Started:** 2026-04-21
**Builder:** Claude Opus 4.7 (B-O-E autonomous)
**Goal:** Projects + References + Threads + Email + Admin + Settings (single pass)
**Source spec:** `.yagi-autobuild/phase-1-2-spec.md` (verbatim — never paraphrased to Executors)
**Max Evaluator loops per subtask:** 5

---

## Pre-flight verified

- Next.js 15.5.0 ✅
- Phase 1.1 summary present ✅
- `RESEND_API_KEY` filled (`re_YEBHnSs8…`) ✅
- yagi user (`5428a5b9-e320-434f-8bf0-ffdae40f280f`) has BOTH `workspace_admin` (workspace `c79781fa…`) AND `yagi_admin` (global) ✅
- Hotfix Fix 1+2+3 applied (onboarding guards + password auth) ✅
- `CLAUDE.md` not yet at project root (subtask 01 creates) ✅

## Subtasks (14)

| # | Name | Depends on | Parallel group | Executor model | Kill-switch |
|---|------|------------|---------------|----------------|-------------|
| 01 | Conventions: `/CLAUDE.md` + `yagi-nextjs-conventions` skill | — | A | Haiku 4.5 | — |
| 02 | i18n: 6 new namespaces (projects/refs/threads/settings/admin/errors) | 01 | **B** | Haiku 4.5 | — |
| 03 | Install deps: `resend`, `react-dropzone`, `@types/react-dropzone` | 01 | **B** | Haiku 4.5 | 🛑 **before `pnpm add`** |
| 04 | OG unfurl util `src/lib/og-unfurl.ts` + `/api/unfurl` route | 01 | **B** | Haiku 4.5 | — |
| 05 | Projects list `/[locale]/app/projects/page.tsx` + sidebar nav enable | 02, 03 | C | Sonnet 4.6 | — |
| 06 | New project flow `/[locale]/app/projects/new/*` (3-step) + `createProject` action | 05 | C | Sonnet 4.6 | — |
| 07 | Project detail `/[locale]/app/projects/[id]/page.tsx` + `transitionStatus` action | 06 | C | Sonnet 4.6 | — |
| 08 | Reference collector (uploader + grid + actions) | 04, 07 | **D** | Sonnet 4.6 | — |
| 09 | Thread messaging + visibility + Realtime | 07 | **D** | Sonnet 4.6 | — |
| 10 | Email notifications via Resend | 09 | **D** (after 09) | Sonnet 4.6 | — |
| 11 | YAGI admin view `/[locale]/app/admin/projects/page.tsx` + sidebar admin section | 07 | **E** | Sonnet 4.6 | — |
| 12 | Settings pages (profile / workspace / team) + avatar uploader | 02, 07 | **E** | Sonnet 4.6 | — |
| 13 | Storage bucket policy review (migration only if missing) | 08, 12 | **E** | Haiku 4.5 | 🛑 conditional (only if migration needed) |
| 14 | E2E runbook `phase-1-2-e2e.md` + final `pnpm build` + `summary.md` + Telegram | all 1–13 | F | Haiku 4.5 | 🛑 **before `pnpm build`** + 🛑 **before Phase complete declaration** |

## Parallelism plan

```
Wave A: 01 (serial — produces conventions everyone reads)
   ↓
Wave B: 02 ‖ 03 ‖ 04   (parallel after 01; Telegram 🛑 inside 03 before pnpm add)
   ↓
Wave C: 05 → 06 → 07   (serial chain, builds projects feature)
   ↓
Wave D: 08 ‖ 09        (parallel after 07; both touch project detail)
        10 (after 09)   (depends on sendMessage shape)
   ↓
Wave E: 11 ‖ 12 ‖ 13   (parallel after 07/08/12 satisfied; 13 may add migration → 🛑)
   ↓
Wave F: 14             (final build + summary + Telegram, two 🛑 inside)
```

Context-reset checkpoints:
- After Wave B (3 done)  — write `checkpoint.md`
- After Wave C (6 done)  — write `checkpoint.md`, evaluate fresh-Orchestrator handoff
- After Wave D (9 done)  — write `checkpoint.md`
- After Wave E (13 done) — write `checkpoint.md`

## B-O-E protocol (per subtask)

1. **Builder writes** `subtasks/NN_name.md` — verbatim copy of the relevant spec section + acceptance criteria + Executor preamble (load CLAUDE.md + yagi-nextjs-conventions skill, do NOT read other subtask files or `task_plan.md`).
2. **Orchestrator spawns Executor** (Task tool) with subtask file path only — no other context.
3. Executor writes `results/NN_name.md` (summary of files touched + acceptance check).
4. **Orchestrator spawns Evaluator** (Task tool, fresh context) with: subtask path + result path. Evaluator must run a user-flow simulation (test SQL / actual fetch / RLS query as anon, etc.).
5. Evaluator writes `feedback/NN_name.md` with verdict `pass` | `fail` + specifics.
6. If `fail`: Builder appends feedback into the subtask file and re-spawns Executor. Hard cap 5 loops → halt + Telegram.
7. If `pass`: move to next subtask per Wave plan.

## Kill-switch protocol (6 points)

Each kill-switch:
1. Telegram message via `/sendMessage` with `🛑 YAGI Builder | Kill-switch …` header
2. Include action description + exact command preview
3. Halt and wait for user reply (`continue` | `abort`) — no autonomous progression
4. Record decision in subtask result file

**Triggers:**
1. Subtask 03 → before `pnpm add resend react-dropzone …`
2. Any unexpected schema migration (Phase 1.2 should not need one — verify first)
3. `.env.local` modifications (e.g., `RESEND_FROM` if needed)
4. Subtask 13 → if storage policy migration required
5. Subtask 14 → before final `pnpm build`
6. Subtask 14 → before "✅ Phase 1.2 complete" Telegram

## Success criteria (Phase 1.2 done)

1. `pnpm build` clean, zero TS errors, zero ESLint warnings
2. Client can create draft → submit project; YAGI admin sees in admin view
3. Reference collector: 2 image uploads + 1 Instagram URL with OG parse
4. Thread: shared message visible to both; internal message hidden from client (RLS RESTRICTIVE policy enforced)
5. Resend email arrives for shared message; not for internal
6. Settings: avatar/workspace logo upload reflected in sidebar immediately
7. RLS sanity: anon `GET /rest/v1/projects` returns 0
8. `summary.md` + `phase-1-2-e2e.md` written; Telegram final notification delivered

## Forbidden

- Modifying `phase-1-2-spec.md` content when crafting subtask files (verbatim quote only)
- `pnpm dlx shadcn@latest …` — must use `@2.1.8`
- Inline Supabase clients (must go through `lib/supabase/server.ts` or `client.ts`)
- Hardcoded user-facing strings — every string in both `messages/ko.json` AND `messages/en.json`
- Unauthorized `.env.local` edits
- Spawning Executor before this `task_plan.md` is approved by Yagi (`go`)
