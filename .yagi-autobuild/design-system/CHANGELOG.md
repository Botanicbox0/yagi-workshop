# Design System Changelog

All notable changes to the YAGI Design System.

Format: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/)
Versioning: [SemVer 2.0](https://semver.org/)

Source of truth: `.md` files under `.yagi-autobuild/design-system/`. Generated `.ts` under `src/design-tokens/` carry a header marker (ARCHITECTURE §4.2) — changes there without a matching `.md` change are bugs.

---

## [Unreleased]

### Changed — v1.2 Dark Brand UI (2026-05-28) — supersedes v1.1

- **Dark is now the main canvas and the default.** `globals.css` `:root` **and** `.dark` carry the v1.2 dark palette; `.light` becomes a tidied opt-in secondary palette. `layout.tsx` `next-themes` flipped to `defaultTheme="dark"` (system preference disabled).
- **3-tier color system (60-30-10), repointed:**
  - **Neutral (60%)** — near-black canvas `#0A0A0A`, surface `#161616`, light ink `#F0F0F0`, muted ink `#888888`, hairline border `#2A2A2A`. Pure-black `#000000` void / light main canvas forbidden.
  - **Red `#ED1E1E` primary (~10%)** — CTAs, primary actions, active states, brand mark; on-fill text `#FFFFFF`; on-dark text variant `#FF453A`; hover `#FF3B30`.
  - **Gold `#FAD204` secondary (~5–15%)** — small highlights/tags; on-fill text `#0A0A0A`; hover `#FFDE2E`.
- **Token rename**: `--ds-vermillion*` → `--ds-red*`; Tailwind family `vermillion` → `brand` (`bg-brand` / `text-brand-on` / `bg-brand-soft` / `text-brand-ink` / `accent-brand`). New raw tokens `--ds-surface` (`#161616`), `--ds-border` (`#2A2A2A`). Gold family keeps its name; values repointed `#F3D174`→`#FAD204`.
- **Typography**: Display = **Editorial New** (EN) with Pretendard fallback (font face not yet in repo — config-only stack). Body = Pretendard Variable (KO) / Geist (EN/tech). Tailwind `display` family + `--ds-font-display-en` updated.
- **Docs**: PRINCIPLES.md §3 / §4.2 / §8 rewritten to dark v1.2. ARCHITECTURE.md §18.4 added (supersedes §18.2/§18.3 color + theme). `CLAUDE.md` rule #10 updated. `yagi-design-system` SKILL.md §2/§9 synced. Decision: PRODUCT-MASTER §AO (commit d1d4fd1).
- **Migration scope**: token-based components swept (`vermillion`→`brand`, 8 files incl. `status-pill.ts` tone keys). **v1.1 hardcoded literals** (`#9A361F`/`#FBEAE6`, cool-neutral `text-black`/`bg-white`) sweep deferred to a separate dispatch pending visual smoke test.
- **Preserved**: Tailwind semantic state colors (`amber-500`/`red-500`/`green-500`, success/warning/info/destructive) — not brand colors. Note: semantic destructive red and brand Red coexist by design.

### Changed — v1.1 color system (2026-05-27) — superseded by v1.2

- **3-tier color system (60-30-10)** replaces the v1.0 sage sole-accent rule:
  - **Neutral (60%)** — warm-ivory canvas `#FAF7F2`, pure-white surfaces, warm near-black ink `#1F1A15`, warm border `#E8E0D4`. Pure-white bg / pure-black body text forbidden.
  - **Vermillion `#9A361F` primary (~10%)** — CTAs, primary actions, active states; on-fill text `#FBEAE6`; hover `#B8412A`.
  - **Gold `#F3D174` secondary (~5–15%)** — small highlights/tags; on-fill text `#3D2E0E`; text-on-neutral `#6B5618`; hover `#E8C158`.
- **Retired**: amber `#C8A96E` (prose remnant), sage `#71D083` (live token + hex literals).
- **PRINCIPLES.md** §3 / §4.2 (was "Achromatic only" → "Neutral-dominant (60-30-10)") / §8 rewritten. **ARCHITECTURE.md §18.3** superseded. Decision recorded in PRODUCT-MASTER §AM.
- App layer: `globals.css` (light + dark tokens repointed warm + `--ds-neutral-*`/`--ds-vermillion-*`/`--ds-gold-*`), `tailwind.config.ts` (neutral/vermillion/gold families), ~14 components, auth email template, `CLAUDE.md` rule #10. All on-fill contrasts WCAG AA verified.
- **Preserved**: Tailwind semantic state colors (`amber-500`/`red-500`/`green-500`, success/warning/info) — not brand colors.

---

## [0.2.0] — 2026-04-28

Editorial integration release. Absorbs Phase 2.9's (Projects hub editorial redesign) and Phase 2.9 hotfix-1/-2's empirical findings into the canonical specs, calibrated against isomeet.com. Source for all changes: Phase 2.10 (`.yagi-autobuild/phase-2-10/KICKOFF_PROMPT.md`), Q-092 in DECISIONS_CACHE, and the live `g-b-10-design-system-v2` branch.

### Added — design-system

- **PRINCIPLES.md §4 — Editorial integration patterns** (new section, 9 patterns):
  - 4.1 Two-font system (Pretendard body + SUIT headline)
  - 4.2 Achromatic only on product surfaces (amber scoped to landing/marketing)
  - 4.3 Hairline borders + soft layered shadows replace 1px hard borders
  - 4.4 Editorial labels — eyebrow pattern as section header
  - 4.5 Asymmetric visual weight (decision zone + emotional zone)
  - 4.6 Photography as content (not illustration / icons / 3D)
  - 4.7 Spring physics for layout-changing transitions
  - 4.8 Inverted CTA pill (`bg-foreground text-background`)
  - 4.9 Seamless composition (no border-b/-t between sections)
- **PRINCIPLES.md** — original §4–§14 renumbered to §5–§15 to accommodate new §4.
- **PRINCIPLES.md §3** — clarified that amber accent is scoped to "marketing / landing surfaces only".
- **ANTI_PATTERNS.md §10 — Composition anti-patterns** (new section, 5 sub-patterns):
  - 10.1 Visible internal seams (`border-b`/`border-t` between sections)
  - 10.2 Heavy section headers (`<h2>` instead of small uppercase eyebrow)
  - 10.3 Equal-weight card grids for value props
  - 10.4 Hard 1px black-ish borders on cards
  - 10.5 Flat black CTA banner without depth
- **TYPOGRAPHY_SPEC.md §2.1** — replaced "One font, two languages" with **"Two-font system"** documenting Pretendard (body) + SUIT (headlines) + Fraunces (legacy/landing). Original framing preserved as §2.1.x legacy note.
- **TYPOGRAPHY_SPEC.md §3.1** — expanded font-family specification with full loading table (Body/UI, Editorial headline, Landing display, Mono) + headline-type decision rule.
- **TYPOGRAPHY_SPEC.md §3.2 — Editorial-headline scale (SUIT Variable)** (new section):
  - hero h1 spec: `font-suit text-4xl md:text-5xl lg:text-[56px] leading-[1.1] tracking-[-0.02em] font-bold`
  - section h2 spec
  - step-number spec (`tabular-nums`)
  - canonical eyebrow pattern: `text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground`
- **INTERACTION_SPEC.md §3.2** — added `spring-natural` token (`{stiffness: 80, damping: 22, mass: 0.9}`) for layout-changing transitions.
- **INTERACTION_SPEC.md §10 — Layout-changing transitions** (new section, 8 sub-sections):
  - 10.1 When this applies
  - 10.2 Implementation pattern (`<motion.div layout>`)
  - 10.3 When to use spring vs duration-based easing
  - 10.4 Image cross-fade with `AnimatePresence`
  - 10.5 Reduced motion behavior
  - 10.6 Hover gating (`@media (hover: hover)`)
  - 10.7 Performance budget (max 1 spring layout transition per viewport)
  - 10.8 Component contract registration requirement
- **INTERACTION_SPEC.md** — original §10–§13 renumbered to §11–§14.
- **COMPONENT_CONTRACTS.md §5.11–§5.16** — 5 new component contracts + loading convention:
  - §5.11 SidebarBrand (no-seam workspace identity slot)
  - §5.12 InteractiveVisualStack (canonical layout-changing transition)
  - §5.13 ProjectsHubHero (editorial two-zone hero)
  - §5.14 ProjectsHubWorkflowStrip (soft-shadow card strip)
  - §5.15 ProjectsHubCtaBanner (inverted panel with depth)
  - §5.16 Loading convention for client-only components (Framer Motion → Client Component, hydration-safe skeletons)
- **UI_FRAMES.md** — promoted from "Five frame blueprints" to **six** with the addition of:
  - **Frame 6 — Editorial Hub** (canonical instance: Projects hub, Phase 2.9). Composition rules: seamless (no border-b/-t), asymmetric weight, SUIT headline, achromatic, soft layered shadow on cards, depth-treated inverted CTA banner, photography as content, exactly one spring-driven layout transition per viewport.
  - Quick picker table now includes the Editorial Hub row.
- **REFERENCES.md** — added **isomeet (`isomeet.com`)** to the Core calibration set as reference #6 (primary anchor for Frame 6). Added a new "For Editorial Hub frames" subsection under Secondary references. Updated header from "five products" → "six products". `Last updated: 2026-04-28`.

### Changed
- **PRINCIPLES.md** — colour discipline strengthened (amber explicitly scoped to marketing/landing only; product surfaces are fully achromatic).
- **TYPOGRAPHY_SPEC.md** — section numbering revised (3.2 reused for editorial-headline scale; original §3.2 → §3.3, original §3.3 → §3.4).
- **INTERACTION_SPEC.md** — anti-patterns line for "Bounce-in on every appearance" updated to cross-reference §10 (layout-changing transitions allow controlled spring overshoot).
- **INTERACTION_SPEC.md §12.1, §12.2** — Webflow implementation note clarifies that `spring-natural` and layout-changing transitions are JS-only (Next.js side), with no Webflow representation.
- **INTERACTION_SPEC.md §13 QA checklist** — added "At most one spring-driven layout transition visible per viewport" line; updated cross-refs to §10 / §10.5.

### Notes
- This is a docs-only release. No `.ts` token changes; the `src/design-tokens/` headers under ARCHITECTURE §4.2 do not need regeneration this round.
- Codex K-05 review skipped per Phase 2.10 Q4=a (internal docs work, no app-layer code, no DB changes).
- `yagi-design-system` skill at `.claude/skills/yagi-design-system/SKILL.md` synced to enforce the v0.2.0 patterns ("any UI surface" trigger).

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
