# Phase 2.5 Launchpad — Codex K-05 (GO-B verification)

**Date:** 2026-04-23
**Scope:** 5 Phase 2.5 revision commits since Phase 2.1 SHIPPED — `5440954` / `f2815f1` / `c6040bc` / `8121538` / `ade027f`.
**Verdict:** ❌ **HIGH** — Phase 2.5 G1 NOT safe to start until HIGH-1 closed.

---

## Verdict breakdown

| Focus area | Score |
|---|---|
| [1] Semantic token usage consistency | HIGH (2 findings) |
| [2] Status-pill helper retrofit pattern unity | ✅ CLEAN |
| [3] Share retrofit completeness (regex audit) | HIGH (1 finding, 11 locations) |
| [4] SPEC v2 X2 4 CRITICAL alignment with G1-G7 | MEDIUM (1 finding) |

---

## [HIGH-1] `s/[token]/page.tsx` retoken is incomplete

**File:** `src/app/s/[token]/page.tsx`

11 active className hardcodes remain after commit `8121538`:

| Line | Hardcode | Classification |
|------|----------|----------------|
| 53   | `bg-white`              | header backdrop |
| 55   | `text-black`            | header copy |
| 239  | `text-black`            | comment author |
| 246  | `text-black`            | comment author |
| 250  | `bg-green-100` `text-green-700` | approved status pill (file-local, bypasses `statusPillClass`) |
| 322  | `bg-white`              | sticky header panel |
| 326  | `text-black`            | header label |
| 331  | `text-black`            | header locale |
| 343  | `text-black`            | welcome title |
| 403  | `text-black`            | frame meta |
| 441  | `text-green-700`        | approved footer badge |
| 452  | `hover:underline`       | — (MED-1 scope) |
| 470  | `text-muted-foreground hover:text-foreground transition-colors` | — (MED-1 scope; foreground hover OK but no focus-visible ring) |

### Root cause

My initial retoken regex caught `bg-black` and `text-white` but missed their inverses (`bg-white`, `text-black`). Also missed `bg-green-*` / `text-green-*` status badges — the page has a file-local "approved" badge that should now route through `statusPillClass('preprod_board', 'approved')` or equivalent (currently using `green-100/700` direct, mirroring Phase 2.0 G4_TRIAGE pattern drift).

### Recommended fix

Two replace_all passes + one targeted edit:
```
bg-white          → bg-background
text-black        → text-foreground
```
Plus rewrite the two `bg-green-100 text-green-700` status badges to use the centralized helper (e.g. `statusPillClass('preprod_board', 'approved')` after adding a `preprod_board` kind to `src/lib/ui/status-pill.ts`, OR use `bg-success text-success-foreground` directly since we now have the tokens).

Estimated fix time: 10-15 min including tsc + Codex re-verification.

---

## [MED-1] Share-page anchors miss `focus-visible:ring-ring`

**File:** `src/app/s/[token]/page.tsx` — lines 142, 452, 470

Three anchor / clickable elements lack the `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` trio that the revised share Buttons and Inputs now have. WCAG keyboard-navigation parity gap.

Recommended fix: append the focus-visible trio to each `<a>` / `<button>` className, or route through an existing primitive. 5 min.

---

## [MED-2] SPEC v2 internal inconsistency — `handle_changed_at`

**File:** `.yagi-autobuild/phase-2-5/SPEC.md`

- §159 (G1 Task 1 ALTER profiles): adds `role`, `handle`, `instagram_handle`, `bio`, `avatar_url`, `role_switched_at`. **Missing: `handle_changed_at`.**
- §269 (G2 Task 6 handle validation): "Handle change: allowed once per 90 days".
- §624 (Q7 proposal): "Tracked via `profiles.handle_changed_at`".

Two ways to resolve:
1. Add `handle_changed_at timestamptz` to G1 Task 1 ALTER (preferred — matches Q7's stated source-of-truth).
2. Revise Q7 to use `role_switched_at`-style separate column or derive from audit table. Larger SPEC surgery.

Recommended: option 1. 2-line SPEC edit + matching G1 migration column.

---

## What passed (for morning context)

Per Codex summary:

- **Status-pill landed cleanly.** `src/app/[locale]/app/projects/page.tsx:38` correctly delegates to `statusPillClass("project", status)`; no stray blue/green hardcodes remain. `src/lib/ui/status-pill.ts:67-71` `challenge` kind matches SPEC v2 state enum exactly (`draft/open/closed_judging/closed_announced/archived`).
- **Tailwind + globals wiring verified.** `tailwind.config.ts:49-59` + `src/app/globals.css:36-41` correctly expose `success`/`warning`/`info` with DEFAULT + foreground sub-keys.
- **Share components retoken'd cleanly.** No stray `bg-primary`/`text-primary-foreground` dialect introduced; both modal overlay sites use `bg-foreground/50` consistently; border tokens (`border-border` on panels, `border-input` on inputs) used correctly; every Button goes through the `<Button>` primitive.
- **SPEC v2 C1/C2/C3/C4 + H7/H8/H9 all aligned.** Junction table `showcase_challenge_winners` has `UNIQUE(submission_id)` as required; slug CHECK regex matches admin routes; pg_cron reminder job has `reminder_sent_at IS NULL` + `FOR UPDATE SKIP LOCKED` idempotency.
- **Regex audit 3 of 4 returned ZERO hits** (`rounded-xl/2xl/3xl`, `focus:outline-none focus:ring` legacy pattern, raw `<input>`/`<textarea>` with className). Only the `bg-|text-|border-` color scales grep found residuals.

---

## STOP action (per야기 kickoff rule)

> Codex CLEAN → G1 진입. Codex MEDIUM → in-place fix 후 G1. **Codex HIGH → STOP + Telegram + WIP commit.**

HIGH-1 is substantively a 15-min completion gap in the same file I was editing 30 min before the Codex review. It's arguably borderline (completion drift vs. architectural issue), but the rule is the rule — stopping.

## Resume options for 야기

**GO fix-all (15-20 min):** apply HIGH-1 replace_all + fix MED-1 focus-visible + MED-2 SPEC amendment, re-run Codex, on CLEAN proceed to G1. Total time-to-G1-start: ~25 min.

**GO fix-HIGH-only:** patch HIGH-1, re-Codex. On CLEAN (MED-1/MED-2 demoted), proceed to G1. MED-1/MED-2 roll to Phase 2.5 G8 Codex pass.

**GO G1 anyway:** overrule Codex on HIGH-1 grounds (G1 is DB migration + auth, does not touch UI). Risk: Phase 2.5 G3 still has the residual hardcodes to clean when G3 starts, and the SPEC-v2 `[BLOCKS 2.5]` precondition is formally unmet.

**Builder recommendation:** GO fix-all — 15-20 min of mechanical work closes the gap cleanly + demonstrates a proper "revise-until-Codex-CLEAN" cycle that the rest of Phase 2.5 will benefit from.
