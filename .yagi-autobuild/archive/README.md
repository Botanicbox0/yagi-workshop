# `.yagi-autobuild/archive/` — Frozen history

This directory holds intentionally-preserved artifacts from prior phases. Active
work lives in the parent `.yagi-autobuild/` directory; everything here is closed
and reference-only.

## Layout

### `phase-1/`
Phase 1.x specs, summaries, codex review captures, and the early Phase 1.2.5
task plan. Ships 1.2 → 1.9 fully shipped before Phase 2.0 began.

Also contains:
- `results/` — per-subtask outcome dumps (39 files, 01_conventions through later subtasks)
- `subtasks/` — per-subtask specs that paired with results/ (24 files)
- `feedback/` — per-subtask review feedback that paired with results/ (22 files)

These three directories were the Phase 1.x parallel-subtask coordination
format — superseded by the per-phase KICKOFF_PROMPT.md + _run.log pattern
used since Phase 2.0.

### `phase-2-shipped/`
Phase 2.0 through 2.8 — every phase folder for SHIPPED phases up to (and
including) the original Phase 2.8 G_B Brief Board work.

Also contains:
- `snapshots/` — Phase 1.9 era rollback snapshots (env-local sha, schema-snapshot, seed-data, ROLLBACK.md)
- `gates/` — Phase 2.1 + 2.5 era CEO_APPROVED.md + QA_SMOKE.md gate captures

The active Phase 2.8.x sub-phases (2.8.1, 2.8.1-followup-1, 2.8.2, 2.8.3,
2.8.4, 2.8.5, 2.8.6, ...) stay in the parent directory because they are still
referenced by current decisions cache entries (Q-088 through Q-091) and recent
Builder runs.

### `transient/`
One-off artifacts that supported a single moment in time and are no longer
load-bearing:
- Old AUTOPILOT.md / GATE_AUTOPILOT.md — predecessors to the current
  Phase-level KICKOFF_PROMPT.md per-phase pattern.
- HANDOFF.md / MORNING-BRIEF.md — replaced by per-phase _run.log + commit
  messages.
- hotfix-onboarding-guard.md — Phase 2.4-era hotfix capture, no longer
  referenced.
- Telegram bot kickoff/killswitch dumps — deprecated comm channel.
- task_plan.md / summary.md / spec-template.md / codex-phase-1-5.md /
  CODEX_PROMPT_TEMPLATE.md / CODEX_TRIAGE.md / contracts.md / checkpoint.md —
  ad-hoc planning files from earlier phases.

### `migrations-pre-2-0/`
Pre-existing folder. Migration history before Phase 2.0 baseline.

## Why archive instead of delete

These files document how the product got here. Decisions, mistakes, and the
reasoning around them are useful when:
- A future phase rediscovers an old constraint and wants to know why
- An auditor asks how a particular surface was built
- We need to reconstruct the timeline for a postmortem or investor update

Cost: a few MB of git history. Benefit: institutional memory.

## Active reference points (DO NOT move into archive)

- `DECISIONS_CACHE.md` — Q-001 through current; lookup table for every
  Builder
- `ROADMAP.md` — current and upcoming phases
- `ARCHITECTURE.md` — append-only architectural log
- `PARALLEL_WORKTREES.md` — Builder worktree conventions
- `YAGI-MANUAL-QA-QUEUE.md` — open QA items
- `codex-review-protocol.md` — Codex K-05 / K-PUX invocation protocol
- `design-system/` — design tokens, component contracts, anti-patterns
  (referenced by Builders via the `yagi-design-system` skill)
- `design-audit/` — Phase 2.7-2.8 era design review (CRITICAL.md,
  IMPROVEMENTS.md, COMPLIANT.md) — still actionable in Phase 2.10
- `reviews/` — CEO_REVIEW.md + DESIGN_REVIEW.md from Phase 2.x — yagi's
  living review surface
- Active phase folders: `phase-2-8-1/`, `phase-2-8-1-followup-1/`,
  `phase-2-8-2/`, `phase-2-8-3/`, `phase-2-8-4/`, `phase-2-8-5/`,
  `phase-2-8-6/` (and successors)
- `mvp-polish/` — out-of-band yagi notes, kept untracked
