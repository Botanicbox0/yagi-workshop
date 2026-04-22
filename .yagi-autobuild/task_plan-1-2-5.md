# YAGI Workshop — Phase 1.2.5 Task Plan (Autopilot)

**Started:** 2026-04-22
**Builder:** Claude Opus 4.7 (autopilot chain)
**Goal:** Video + PDF references + intake mode + thread attachments
**Source spec:** `.yagi-autobuild/phase-1-2-5-spec.md` (verbatim — never paraphrased to Executors)
**Max Evaluator loops per subtask:** 2 (Karpathy mode, AUTOBUILD_MAX_EVAL_LOOPS=2)

## Modified rules (autopilot chain)

- All within-phase kill-switches DISABLED (bug fix sweep, migration apply, pnpm add, bucket create, build — all proceed without Telegram halt).
- Codex K-05 adversarial review at phase end (gpt-5.4 high) — only HIGH/CRITICAL findings halt; others go to a follow-up TodoWrite.
- On error: 2 retries → skip subtask + Telegram one-line summary + continue.
- Phase completion Telegram is one line: "Phase 1.2.5 complete, next 1.3 starting".

## Subtasks (7)

| # | Name | Depends on | Parallel group | Executor model |
|---|------|------------|----------------|----------------|
| 01 | i18n: intake mode + video/pdf + attachment keys | — | A | Haiku 4.5 |
| MIG | Apply phase_1_2_5 migration (project_references cols, projects intake_mode, thread_message_attachments table + RLS, thread-attachments bucket) | — | A (parallel with 01) | Builder direct (MCP) |
| 02 | Video file upload (reference uploader extension + signed-URL flow) | MIG, 01 | B | Sonnet 4.6 |
| 03 | Video URL unfurl (YouTube/Vimeo/TikTok/Instagram) | 01 | B | Sonnet 4.6 |
| 07 | Intake mode picker + Zod discriminated union | MIG, 01 | B | Sonnet 4.6 |
| 04 | Video player component (uploaded + embed dialog + external link) | 02 | C | Sonnet 4.6 |
| 05 | PDF reference (pdfjs-dist install + thumbnail extraction) | MIG, 01 | C | Sonnet 4.6 |
| 06 | Thread message attachments (composer + bubble + RLS-aware) | MIG, 01 | D | Sonnet 4.6 (originally Opus 4.7 in spec — using Sonnet for budget) |

## Parallelism plan

```
Wave A: 01 (i18n) ‖ MIG (migration + bucket) — both independent
   ↓
Wave B: 02 (video upload) ‖ 03 (video URL unfurl) ‖ 07 (intake mode UI)
   ↓
Wave C: 04 (video player) ‖ 05 (PDF reference)
   ↓
Wave D: 06 (thread attachments)
   ↓
Wave E: build → Codex K-05 → summary → Telegram → next phase
```

## Codex review focus (K-05)

Per `codex-review-protocol.md` §"Phase 1.2.5":
- RLS visibility leaks where a client-role user could SELECT an internal-visibility thread attachment
- signed URL expiry edge cases on large video uploads
- intake_mode Zod discriminated union allowing a brief-mode project to bypass proposal field validation
- pdfjs-dist worker source verification (CDN integrity)
