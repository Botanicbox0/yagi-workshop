# Phase 5 Wave C — Hotfix-1 Result

**Status**: SHIPPED on `g-b-10-phase-5`. Awaiting 야기 ff-merge GO + browser smoke.

## Diffs summary

### Commits (per gate, in merge order)

| Commit | Gate | Subject |
|---|---|---|
| `54bd8d6` | HF1_0 | tab UX foundation — scroll-to-top + skeleton |
| `69c6da1` | HF1_6 | 보드 tab 회귀 fix — hypothesis B (source IN check too narrow) |
| (merge) | — | merge HF1_5 (date format helper) |
| `facf735` | HF1_5 | date format helper — formatKoreanDateTime |
| (merge) | — | merge HF1_4 (card CTA wording) |
| `04d157d` | HF1_4 | 카드별 CTA 워딩 차별 (브리프/첨부/코멘트) |
| (merge) | — | merge HF1_1 (status card redesign) |
| `0260924` | HF1_1 | status 카드 콘텐츠 redesign (submitted) + dual CTA hierarchy |
| (TBD) | HF1_2 + HF1_3 + design log | inline visual-lift hand-merge (HF1_2 stale base) + page.tsx RecallButton cleanup (HF1_3) + design self-review log |

HF1_2 was hand-merged inline because the parallel agent's worktree
branched from a stale Phase 4.x base (ac628c3) — its full-file
status-timeline.tsx rewrite was incompatible with Wave C C_2's
vertical-stepper prop contract. The visual-lift intent (current dot
ring, gradient half-fill connector, weight bumps) was preserved by
hand-applying to the existing vertical stepper.

HF1_3 was so small (1 import + 1 conditional block removal) it was
inlined rather than spawning a wave-2 agent.

### File count

- New: `_skeleton/skeleton.tsx`, `loading.tsx`, `status-card.tsx`,
  `format-korean-date-time.ts`, `scripts/test-korean-date-time.mjs`
- Modified: `tabs.tsx`, `status-timeline.tsx`, `status-tab.tsx`,
  `board-tab.tsx`, `info-rail.tsx`, `progress-tab.tsx`,
  `brief-summary-card.tsx`, `attachment-summary.tsx`, `page.tsx`,
  `messages/ko.json`, `messages/en.json`

Total: ~13 files.

## Verify log summary

| Range | Steps | Result |
|---|---|---|
| Pre-apply | 1 / 2 / 3 (tsc / lint / build on merged barrier) | **PASS** |
| UI render | 4 / 5 / 6 / 7 / 8 / 9 (status card / timeline / RecallButton / brief CTA / attachment CTA / comments CTA) | ⏳ pending 야기 browser smoke |
| Static format | 10 (datetime "오전/오후") | ✓ helper test 13/13 PASS (scripts/test-korean-date-time.mjs) |
| Board mount | 11 | ⏳ pending 야기 browser smoke (HF1_6 hypothesis-B fix verified by code review) |
| Static design | 12 (yagi-design-system v1.0) | **PASS** — sage-only confirmed via grep |

Detail in `_design_review_log.md`.

## HF1_6 진단 결과

**Hypothesis B**: `board-tab.tsx` had `hasNewSystemBoard = boardRow.source IN ('wizard_seed', 'admin_init')` which excluded `'migrated'`. Phase 4.x code gap inherited by Wave C; the source restriction was never tested with `source='migrated'` boards. Fix: `hasBoardRow = !!boardRow` (any row passes; legacy banner preserved for projects with no board row).

**Regression origin**: Phase 4.x-internal code gap (NOT a Wave B.5 merge conflict). The 5-tab structure didn't cause the bug; it just exposed it by surfacing the board tab as a named tab rather than the default.

## Open questions

- None for security / state-machine.
- 2 design polish FUs registered (FU-Phase5-21 minimum-display-time
  for skeleton flash mitigation, FU-Phase5-22 explicit
  focus-visible rings on Tab Link / status-card primary / summary
  CTAs).

## FU 등록 (Phase5-18 ~ -22)

| FU | Trigger | Action | Status |
|---|---|---|---|
| FU-Phase5-18 | submitted-only status card content (HF1.1 ship scope) | Differentiate status card per status (in_review / in_progress / in_revision / delivered / approved). Each gets its own meta rows + CTA appropriate to that lifecycle moment | Deferred |
| FU-Phase5-19 | Cancelled / archived banner spec review | yagi visual review missed this surface. Re-audit copy + interaction (does clicking banner do anything?) in next visual sweep | Deferred |
| FU-Phase5-20 | Status timeline future-step helper text | Hover tooltip showing "what happens at this step" — UX polish, Phase 6+ | Deferred |
| FU-Phase5-21 | Skeleton minimum-display-time | Wrap loading.tsx in client-side useEffect + setTimeout(setShow(false), 200) IF browser smoke flags sub-100ms flash. ~20 line patch | Deferred (conditional) |
| FU-Phase5-22 | Explicit keyboard focus rings | Add `focus-visible:ring-2 focus-visible:ring-foreground/20` to Tab Link / Button (status-card primary) / summary CTA Links | Deferred |

## Ready-to-merge: **YES**

- HF1_0 (lead solo) + HF1_1/2/4/5/6 (parallel agents) + HF1_3 (inlined) all shipped to `g-b-10-phase-5`
- HF1_2 hand-merge required due to stale agent worktree base; visual-lift intent preserved
- tsc / lint / build all clean on merged phase branch
- Design self-review across 5 axes: PASS (with 2 polish FUs)
- 5 FUs documented; none blockers

ff-merge gate = 야기 chat GO + browser smoke pass (steps 4–11).
