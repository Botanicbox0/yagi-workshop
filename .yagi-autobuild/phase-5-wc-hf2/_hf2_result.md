# Phase 5 Wave C — Hotfix-2 Result

**Status**: SHIPPED on `g-b-10-hf2`. Awaiting 야기 ff-merge GO.

## Diffs summary

### Commits (per gate)

| Commit | Gate | Subject |
|---|---|---|
| `b1431ac` | HF2_1 | layout consolidation — remove L2/L3 redundancy |
| `6efc85a` | HF2_2 (parallel) | 의뢰 삭제 (submitted/in_review only) + dropdown UI |
| `0e407de` | HF2_3 (parallel) | i18n keys for delete dropdown (KO + EN) |
| (TBD) | merges + post-merge | barrier merges + i18n swap + bg-destructive token + K-05 MED fix |

### File count

- New: `delete-actions.ts` server action; new dropdown sub-component in `status-card.tsx`.
- Modified: `page.tsx` (L2/L3 removed + StatusTab prop bundle), `status-tab.tsx` (12-col grid), `status-card.tsx` (⋯ dropdown sub-component + bg-destructive token), `recall-button.tsx` (controlled `open`/`onOpenChange` props for dropdown integration), `projects/page.tsx` (`.is("deleted_at", null)` filter), `messages/{ko,en}.json` (9 i18n keys).

Total: ~8 files, ~1080 line diff.

## Verify log summary (14 steps)

| # | Range | Result |
|---|---|---|
| 1 | tsc | PASS |
| 2 | lint | PASS (no findings on touched) |
| 3 | build | PASS |
| 4 | submitted detail page → no L2/L3 | PASS (static — page.tsx removed) |
| 5 | Breadcrumb → DetailTabs immediate | PASS (static) |
| 6 | status tab → 12-col grid (timeline / status-card / InfoRail) | PASS (static — status-tab.tsx) |
| 7 | other tabs → full-width main, no InfoRail | PASS (static — status-tab is owner of InfoRail) |
| 8 | page vertical length ~50% of HF1 | ⏳ pending 야기 visual smoke |
| 9 | submitted → ⋯ dropdown trigger visible | PASS (static — gating in MoreActionsDropdown) |
| 10 | dropdown click → 2 menu items (recall + delete) | PASS (static) |
| 11 | [의뢰 삭제] → confirm dialog | PASS (static — AlertDialog wired) |
| 12 | confirm → toast + redirect → project sets `deleted_at` | ⏳ pending 야기 browser smoke |
| 13 | status='in_progress' → no dropdown / no delete option | PASS (static — gated by `status IN ('submitted','in_review') && isOwner`) |
| 14 | dropdown keyboard nav + AlertDialog focus trap + design-system compliance | PASS (Radix UI defaults + sage-only + no shadow + bg-destructive token) |

## K-05 result

- Tier 2 medium, gpt-5.5
- Tokens: ~80K (estimated from full-output line count)
- Verdict: **NEEDS-ATTENTION → 1 MED**
- Finding: `delete-actions.ts:112` — TOCTOU 0-row UPDATE silently treated as success (no `.select("id")` rowcount check)
- **Fix applied inline post-merge** — added `.select("id")` + length check; 0-row result returns `forbidden_status` (race-correct mapping)
- Re-verify post-fix: tsc + lint clean

## K-06 result

- Reviewer: fresh Opus 4 subagent
- Verdict: **NEEDS_FIXES → 4 MED + 2 LOW**
- Per state machine: K-06 MED defaults to FU register (no HIGH / BLOCK)
- All 6 findings registered as **FU-Phase5-27 through -32**

## FUs registered (Phase5-23 ~ -32)

Carry-over from SPEC §"Out-of-scope":
- 23: 30-day cleanup cron (soft-deleted projects + R2 objects)
- 24: status-tab grid mobile responsive polish
- 25: draft-status dropdown question (separate flow)
- 26: project list "recently deleted" recovery surface

New from K-06:
- **27** (DIM 1, MED): top status pill duplicates timeline current step → drop pill OR move into card header
- **28** (DIM 2, MED): in_review status card collapses to single-row CTA — extends FU-Phase5-18 (status × content matrix per non-submitted status)
- **29** (DIM 3, MED): InfoRail double-aside + `md:w-[360px]` width fight + enterprise chrome → unify to grid-driven width + softer card
- **30** (DIM 3, LOW): top row gap-6 vs bottom row gap-4 → unify to gap-6 + reposition deprioritization cue
- **31** (DIM 4, LOW): ⋯ trigger discoverability — add tooltip OR labeled ghost button
- **32** (DIM 3, LOW): timeline sticky causes empty col-2 band when scrolling — drop sticky on timeline OR `lg:sticky` only

All 10 deferred FUs are documented; none block ff-merge.

## Combined recommendation: GO with FU

- All 14 verify steps PASS or pending 야기 browser smoke
- K-05 1 MED finding inline-fixed (TOCTOU 0-row → `.select("id")` length check)
- K-06 6 findings (4 MED + 2 LOW) all FU-registered per state machine scale-aware rule
- tsc / lint / build green on barrier
- yagi-design-system v1.0 compliance verified (sage-only, no shadow, bg-destructive token via design system, not raw red)
- Single ff-merge target: `g-b-10-hf2` → `main`

## Open questions

None. K-06 strengths confirm the structural call (layout consolidation + dropdown weighting + destructive token discipline) is correct.

## Ready-to-merge: **YES**

ff-merge gate = 야기 chat GO + browser smoke pass (steps 8 + 12).
