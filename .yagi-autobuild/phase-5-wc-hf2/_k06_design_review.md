# K-06 Design Review — Wave 5/wc-hf2

Reviewer: fresh Opus 4 subagent (no builder context).
Run: parallel with K-05 (independent).
Diff scope: `git diff main..HEAD` ≈ 1082 lines across 8 files.

## Summary

- **Overall: NEEDS_FIXES**
- One-sentence verdict: The 12-col consolidation is editorially correct
  and the ⋯ dropdown weight is right, but four polish-level issues
  (status-pill / timeline redundancy, in_review status-card collapse,
  InfoRail double-aside + width fight, gap-rhythm inconsistency) and
  two LOW items (⋯ trigger discoverability, sticky-rail empty band)
  push the surface below "협업 surface" tone.

## Findings (parsed)

| # | DIM | SEVERITY | File | Issue | Disposition |
|---|---|---|---|---|---|
| F1 | 1 (Hierarchy) | MED | `status-tab.tsx:151–172` | Top status pill duplicates timeline current-step (sage label + halo dot). Pill = vestigial Phase 4.x chrome. | **FU-Phase5-27** |
| F2 | 2 (Visual weight) | MED | `status-card.tsx:283–296` (in_review branch) | in_review collapses to single-row CTA + ⋯ in a card sized for the rich submitted layout — reads "broken / missing content". | **FU-Phase5-28** (status × content matrix per non-submitted status — extends FU-Phase5-18 from HF1) |
| F3 | 3 (Layout) | MED | `info-rail.tsx:71–87` + `status-tab.tsx:186–198` | Double `<aside>` nesting + `md:w-[360px] md:shrink-0` fights the col-span-3 grid allocation. Enterprise-sidebar tone vs 협업. | **FU-Phase5-29** |
| F4 | 3 (Spacing) | LOW | `status-tab.tsx:165` (gap-6) + `:202` (gap-4) | Top/bottom gap mismatch reads as inconsistent rhythm. | **FU-Phase5-30** |
| F5 | 4 (UX flow) | LOW | `status-card.tsx:120–155` (MoreActionsDropdown) | ⋯ trigger icon-only; recall demoted from labeled outline to icon — discoverability cost for stressed users. | **FU-Phase5-31** |
| F6 | 3 (Layout) | LOW | `status-tab.tsx:168–172` + `:186–198` | Timeline + InfoRail both sticky; short timeline pins above an empty col-2 band when scrolling to bottom 3-card row. | **FU-Phase5-32** |

## Strengths (verbatim from K-06 reviewer)

1. **Layout consolidation is editorially correct.** Removing L2/L3 above the tab bar and folding timeline + InfoRail into the 현황 tab is the right structural call — eliminates the Phase 4.x duplication and lets the tab bar do its job. The 12-col proportions (2/7/3) feel deliberate.
2. **Mobile order overrides are well-considered.** `order-1 md:order-2` on the status card so mobile sees the primary action first is a thoughtful detail many redesigns miss.
3. **Destructive token discipline.** `bg-destructive text-destructive-foreground` (post-merge i18n swap commit) + `border-0 shadow-none` brings delete confirm in line with yagi-design-system v1.0 hard rules. Recall AlertDialog correctly stays sage. Semantic split (sage = forward, destructive = irreversible) is clean.

## Disposition rationale (Builder)

Per state machine §1: "K05+K06 | K05 MED-B/C or K06 MED | REVIEW with FU |
scale-aware: <100 user → FU register".

- All 6 K-06 findings are MED or LOW (no HIGH / BLOCK). State machine
  routes to REVIEW with FU register.
- Hotfix-2 budget (1.5d wall-clock) is exhausted; F1–F6 fixes total
  ~2-3d additional work (especially F2 which requires status × content
  matrix authoring). Not feasible inside the hotfix.
- Inline fix candidates considered but skipped:
  - F1 (drop top pill) — 1-line change, but editorial taste call
    (page-identity anchor when scrolling). Defer to next visual
    review with yagi.
  - F3 (drop double aside + width fight) — small change but
    InfoRail's `md:w-[360px]` was intentional in Phase 4.x for the
    fixed-width sidebar pattern; loosening it changes other surfaces
    where InfoRail might be reused. Audit needed before flipping.
- F5 (⋯ tooltip) is legitimately small (~10 lines with
  `<TooltipProvider>` wrap); deferred only because the 6-FU batch
  reads cleaner as a single Phase 5 visual-cleanup wave (FU-Phase5-27
  through FU-Phase5-32).

All 6 land as new FUs. None block ff-merge per state machine.
