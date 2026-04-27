# Gate 1 — CEO Approval (Phase 2.1)

**Protocol**: ADR-005 Expedited — pre-filled by Builder, CEO responds with approval or targeted edits.
**Phase**: 2.1 — Operational Tail
**Date**: 2026-04-23

---

## Decisions requiring CEO confirmation

### D1. Scope — 7 groups (G1–G7) + closeout (G8)
Per SPEC §1. Six operational items + Codex K-05 + closeout. No new features, no UI.

### D2. Duration — 1 working day (2026-04-23)
Expedited per ADR-005 (condition 1 satisfied). Slip → halt and re-classify as full phase, not extend.

### D3. POPBILL scope reduction
Full SDK real-implementation deferred to Phase 2.2. Phase 2.1 only hardens the guard (501 instead of 500, structured error type). Rationale: implementation unknown-scope; guard hardening is 90 minutes and closes the production-risk vector.

### D4. DEFER_TO_2_1 target ≤ 5 FIX_NOW
15 items triaged; no more than 5 taken into this phase. Rest split between `DEFER_TO_2_2` and `WONTFIX`. Prevents triage-scope-creep from pulling the phase past 1 day.

### D5. Gates skipped (per ADR-005)
Gate 2 (Design Consultation), Gate 3 (Plan Design Review), Gate 5 (Design Review post-build) — all skipped because this phase produces no new UI or design tokens. Gate 1, 4 (Codex K-05), 6 (QA Smoke) retained.

### D6. Supabase project ID lock
All migrations / queries target `jvamvbpxnztynsccvcmr` (yagi-workshop, ap-southeast-1). Explicit guard: do not touch `vvsyqcbplxjiqomxrrew` (legacy YAGI STUDIO).

### D7. Forbidden triggers → halt
Per ADR-005. If during G5 FIX_NOW or any group any of the following fire, halt and re-classify:
- A new component variant required.
- A hardcoded color/size/radius would be introduced.
- A new `UI_FRAMES.md` frame is needed.
- Codex K-05 returns a HIGH finding requiring design rework.

### D8. Success criteria (SPEC §2) are binary
All 7 boxes must pass or be explicitly deferred with a Phase 2.2 ticket.

---

## CEO Response

```
APPROVED — 야기 — 2026-04-23
```

All 8 decisions (D1–D8) accepted as pre-filled. No edits requested.
Approval recorded per ADR-005 pre-filled pattern.

---

## Pre-conditions verified by Builder before this gate opened

- Phase 2.0 SHIPPED (`3be2a4a` on `origin/main`).
- ADR-005 Accepted in `docs/design/DECISIONS.md` (same commit as this SPEC).
- `contracts.md` lists all 4 operational facts this SPEC closes out.
- Supabase MCP is reachable against `jvamvbpxnztynsccvcmr`.

---

## On approval, Builder will

1. Commit this file as `gates/phase-2-1/CEO_APPROVED.md`.
2. Start G1 (Resend verify check) immediately.
3. Telegram: "Phase 2.1 Gate 1 approved, G1–G8 running."
4. Open an atomic commit stream for each group.
