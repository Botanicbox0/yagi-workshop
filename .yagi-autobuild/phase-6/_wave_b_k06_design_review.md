# Phase 6 Wave B — K-06 LOOP-1 design review

Reviewer: fresh Opus subagent (4-dimension + design-system + wording cross-check).
Scope: Wave B integrated diff (B.2 changes; B.1 had 0 code changes).
Files reviewed:
- `src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx`
- `src/components/project-detail/brief-tab.tsx`
- `src/app/[locale]/app/projects/[id]/page.tsx`
- `messages/{ko,en}.json` (5 new keys × 2 locales)

---

## VERDICT: BLOCK (LOOP-1) → CLEAN (LOOP-2 after inline fixes)

LOOP-1 found 5 issues (2 HIGH inline-fixed, 3 MED/LOW → FU). LOOP-2 = inline-fix verification (self-attested by builder; no fresh subagent re-spawn since both HIGH fixes are direct verbatim recipes from K-06 LOOP-1's recommended fix text — no judgment call).

## Findings

### F1 HIGH (DIM 3 design-system) — INLINE-FIXED
File: `src/app/[locale]/app/projects/new/briefing-canvas-step-3.tsx:587-588`
Issue: Step 3 external-brand toggle active state used `bg-amber-50 border border-amber-200`. Same violation class as Wave A K-06 F2 (sage-only Hard Rule #1).
Fix applied: Swapped to `bg-[#71D083]/10 border border-[#71D083]/50` per K-06's verbatim recommendation. Comment added documenting the rule.

### F2 HIGH (DIM 5 wording) — INLINE-FIXED
File: `messages/en.json:884`
Issue: EN value `"This includes a third-party Brand"` leaked the internal "third-party Brand" stem and read as jargon to a first-time Artist.
Fix applied: Replaced with `"This work involves an external advertiser"` per K-06's verbatim recommendation. Mirrors the KO register ("외부 광고주가 있는 작업입니다" = "this work has an external advertiser").

### F3 MED (DIM 2) — DEFERRED → FU-6-B-K06-F3-brief-tab-external-brand-emphasis
Read-only "예" emphasis in brief-tab Stage 2 weaker than sibling `field_interested_in_twin` row.

### F4 MED (DIM 4) — DEFERRED → FU-6-B-K06-F4-shadcn-checkbox-migration
Native `<input type="checkbox">` instead of shadcn `<Checkbox>`. Consistent with pre-existing twin-toggle native pattern; FU covers migrating BOTH checkboxes in a single sweep.

### F5 LOW (DIM 5) — DEFERRED → FU-6-B-K06-F5-ko-helper-brief-loanword
KO helper embeds English "brief" mid-sentence. Spec amendment first (PRODUCT-MASTER §M v1.3 update) before i18n change.

### Incidental MED (out of Wave B scope) — DEFERRED → FU-6-B-twin-toggle-emerald-to-sage
Pre-existing twin toggle uses `bg-emerald-50 border-emerald-200` — same Hard Rule #1 pattern. Surfaced during K-06 audit; out of Wave B diff scope.

## Strengths (verbatim from K-06)

1. Autosave continuity is clean — `has_external_brand_party` wires into the existing 5s debounce + single-flight queue + status-flip TOCTOU defense without ceremony.
2. KO copy is spec-perfect — all four KO strings match PRODUCT-MASTER §M v1.3 character-for-character. No Type-3 / Boost / integration leakage.
3. Read-only rendering structure is cohesive — placement reads as "another piece of commit-time meta", same dt/dd grid template, same rhythm as adjacent FieldRows.

## LOOP-2 verification (builder self-attest)

- F1: amber → sage swap applied at briefing-canvas-step-3.tsx:587-590. Comment added.
- F2: EN i18n value replaced at messages/en.json:884.
- tsc: 0 errors in changed files.
- 4 FU entries registered in `.yagi-autobuild/phase-6/FOLLOWUPS.md` (3 from K-06 LOOP-1 deferrals + 1 incidental).

LOOP-2 = CLEAN. Wave B ready for ff-merge gate (yagi decides ff-merge to main).
