# Design System Changelog

All notable changes to the YAGI Design System.

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
Versioning: [SemVer 2.0](https://semver.org/)

Source of truth: `.md` files under `.yagi-autobuild/design-system/`. Generated `.ts` under `src/design-tokens/` carry a header marker (ARCHITECTURE §4.2) — changes there without a matching `.md` change are bugs.

---

## [Unreleased]

---

## [0.1.0] — 2026-04-23

First tagged set of design-system and governance documents. No prior version; no breaking changes.

### Added — design-system (L1 Judgment)
- `PRINCIPLES.md` — aesthetic spine, palette, spacing scale. (pre-session)
- `UI_FRAMES.md` — 5 UI patterns for product + editorial surfaces. (pre-session)
- `REFERENCES.md` — Webflow / Linear / Stripe / Height / Read.cv reference set. (pre-session)
- `TYPOGRAPHY_SPEC.md` — Pretendard Variable, modular 1.125, KR/EN dual locale.
- `COMPONENT_CONTRACTS.md` v1.1 — 22 primitives, dependency map, loading convention.
- `INTERACTION_SPEC.md` — motion tokens, 22-primitive transition table, reduced motion.
- `ANTI_PATTERNS.md` — cross-cutting only; spec-specific anti-patterns live in their own spec (ARCH §9).
- `CHANGELOG.md` (this file).

### Added — reviews (L3 Review rules)
- `CEO_REVIEW.md` — CEO review rubric. (pre-session)
- `DESIGN_REVIEW.md` — post-build design-review rubric. (pre-session)

### Added — governance
- `.yagi-autobuild/ARCHITECTURE.md` v1.0 — 3-layer model (L1/L2/L3), 6-gate pipeline, directory contract.
- `docs/design/DECISIONS.md` with 5 ADRs:
  - ADR-001 — source of truth = `.md`; `.ts` generated.
  - ADR-002 — Pretendard Variable single font for KR + EN.
  - ADR-003 — delete `frame-picker.ts`; replace with `skills/frame-selection.md`.
  - ADR-004 — modular typographic scale 1.125 (Major Second).
  - ADR-005 — **Expedited Phase Protocol** for 1–2 day operational/MVP sprints.

### Removed
- `src/lib/design/frame-picker.ts` — judgment moved to skill (ADR-003).

---

## Format template

```md
## [vX.Y.Z] — YYYY-MM-DD

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Accessibility
```

## Versioning

- **MAJOR** — breaking contract change in `COMPONENT_CONTRACTS.md`, or breaking token rename.
- **MINOR** — new primitive / token / spec section / ADR / skill.
- **PATCH** — typos, redirects, clarifications.

Tag: `design-system-vX.Y.Z`.
