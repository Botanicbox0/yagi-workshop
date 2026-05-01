# ARCHITECTURE.md
Version: 2.0
Owner: B-O-E (Builder / Orchestrator / Executor)
Scope: YAGI Workshop end-to-end build pipeline
Reference framework: gstack (https://github.com/garrytan/gstack) — partial adoption

---

## 0. Purpose

This document is the **single source of truth** for how YAGI Workshop is built.
It defines:

- the directory layout that holds the system
- the three layers of authority (Judgment / Code / Review)
- the pipeline every Phase passes through (§5)
- the parallel execution model (§7)
- which skill or doc handles each step
- where each rule lives so nothing drifts

If this document and another document disagree about workflow, **this document wins** until updated.

### What changed in v2.0 (2026-04-23)

- **Removed aspirational L2 token-sync pipeline** (never implemented). `src/design-tokens/` and `src/lib/design/` do not exist and the md→ts generator was never built. Design tokens live in Tailwind config + component CSS.
- **Removed references to non-existent skill files**: `skills/frame-selection.md`, `skills/qa-smoke-test.md`, `skills/token-sync.md`, `skills/design-shotgun.md`. The `skills/` directory does not exist.
- **Renamed pipeline-stage "gate" → "review step"** (§5) to eliminate collision with Phase-2.5-style intra-phase gates (G1–G8). Two different meanings was a constant source of confusion.
- **Lowered SECURITY DEFINER emphasis** in Engineering Review notes — yagi is not at the security-maturity stage where this is the top risk. Prioritize shipping.
- **Added §7 — Parallel execution.** Agent Teams + git worktrees now the default. See `PARALLEL_WORKTREES.md` for mechanics.
- **Cross-references added** for `AUTOPILOT.md`, `GATE_AUTOPILOT.md`, `PARALLEL_WORKTREES.md`, `CODEX_TRIAGE.md`, `CODEX_PROMPT_TEMPLATE.md`, `DECISIONS_CACHE.md`. These were written after v1.0 and this doc never caught up.

---

## 1. Mental model — three layers

Every artifact in this system belongs to exactly one layer.

### L1 — Judgment (markdown)
Rules a human or AI must read and apply with discretion.
Lives in `.yagi-autobuild/design-system/*.md` and `.yagi-autobuild/reviews/*.md`.
Hand-edited. Source of truth for all downstream artifacts.

### L2 — Code (TypeScript / React / SQL)
Implementation of L1 judgments in runnable form.
Lives in `src/` alongside feature code.
Written by teammates or Executors under Builder/Orchestrator direction.

### L3 — Review (executable check)
Verification that L2 matches L1.
Lives in `.yagi-autobuild/reviews/*.md` (rules) + Codex K-05 runs (automated external review) + `/qa`-equivalent runs (browser, once that skill ships).

A change that crosses layers must touch them in order: **L1 → L2 → L3**, never sideways.

**Historical note:** Earlier drafts described an automated md→ts token-sync pipeline for L2. That pipeline was never built. If token churn justifies generation later, it gets its own ADR.

---

## 2. Directory structure (actual as of 2026-04-23)

```
C:\Users\yout4\yagi-studio\yagi-workshop\
│
├── .yagi-autobuild/
│   ├── ARCHITECTURE.md                 ← this file (workflow contract)
│   ├── AUTOPILOT.md                    ← Phase-level autopilot chain
│   ├── GATE_AUTOPILOT.md               ← Gate-level autopilot (intra-phase)
│   ├── PARALLEL_WORKTREES.md           ← multi-agent parallelism (§7)
│   ├── CODEX_TRIAGE.md                 ← Codex finding classification
│   ├── CODEX_PROMPT_TEMPLATE.md        ← Codex prompt shape
│   ├── DECISIONS_CACHE.md              ← Q&A cache to cut yagi round-trips
│   ├── HANDOFF.md                      ← session continuity
│   ├── codex-review-protocol.md        ← Codex install + modes (legacy Phase 1.x prompts; stale)
│   ├── ROADMAP.md
│   ├── contracts.md                    ← cross-phase published surfaces
│   │
│   ├── design-system/                  ← L1 Judgment (actual, populated)
│   │   ├── PRINCIPLES.md
│   │   ├── UI_FRAMES.md
│   │   ├── COMPONENT_CONTRACTS.md
│   │   ├── TYPOGRAPHY_SPEC.md
│   │   ├── INTERACTION_SPEC.md
│   │   ├── REFERENCES.md
│   │   ├── ANTI_PATTERNS.md
│   │   └── CHANGELOG.md
│   │
│   ├── reviews/                        ← L3 Review rules (partially populated)
│   │   ├── CEO_REVIEW.md
│   │   └── DESIGN_REVIEW.md
│   │
│   ├── gates/                          ← review-step artifacts per Phase
│   │   └── phase-{N}/…
│   │
│   └── phase-{N}/                      ← per-Phase specs + intra-phase gate work
│       ├── SPEC.md
│       ├── FOLLOWUPS.md
│       ├── G{K}-ENTRY-DECISION-PACKAGE.md
│       └── G{K}_SUMMARY.md
│
├── src/                                ← L2 Code (feature code)
│   ├── app/                            ← Next.js 14 App Router
│   ├── components/                     ← React components
│   ├── lib/                            ← domain utilities
│   └── database.types.ts               ← generated from Supabase
│
├── .claude/
│   ├── settings.json                   ← Claude Code settings (incl. CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)
│   ├── agents/                         ← subagent definitions (optional, create as needed)
│   └── worktrees/                      ← git worktrees spawned by `claude -w` (gitignored)
│
├── supabase/
│   └── migrations/                     ← SQL migration files
│
├── docs/
│   └── design/
│       ├── STORYBOOK.md
│       └── DECISIONS.md                ← ADR log (§11)
│
└── figma/
    └── FILES.md                        ← Figma file keys + roles
```

**`.claude/worktrees/` must be in `.gitignore`.** Verify before first use of `claude -w`.

---

## 3. Audience separation

A document is written for one audience. Mixing them produces drift.

| Path | Reader | Tone |
|---|---|---|
| `.yagi-autobuild/design-system/*` | Builder / Orchestrator / teammate (AI) | Imperative rules. No background. |
| `.yagi-autobuild/reviews/*` | Reviewer (AI or human) | Pass/fail criteria. No prose. |
| `.yagi-autobuild/PARALLEL_WORKTREES.md` | Builder / Orchestrator / yagi | Mechanics + commands. |
| `.yagi-autobuild/CODEX_TRIAGE.md` | Builder post-Codex | Taxonomy table. |
| `.yagi-autobuild/DECISIONS_CACHE.md` | Orchestrator on Gate entry | Q&A lookup. |
| `docs/design/STORYBOOK.md` | Human contributor | Examples, screenshots, narrative. |
| `docs/design/DECISIONS.md` | Human contributor + future YAGI | ADR — context, decision, consequences. |
| `figma/FILES.md` | Designer | File keys + scope per file. |

Rule: if you find yourself writing background or rationale inside `.yagi-autobuild/`, that text belongs in `docs/design/DECISIONS.md` instead.

---

## 4. Source-of-truth rule

`.md` is authoritative. Feature code in `src/` implements the rules from `.md` but is not auto-generated from it.

**Exception: `src/database.types.ts`** — auto-generated from Supabase via `supabase gen types`. Do not hand-edit.

Design tokens (colors, spacing, typography scales) currently live in:
- `tailwind.config.ts` — hand-curated, references `design-system/PRINCIPLES.md` by convention
- Component-level CSS / className — hand-written

If/when token churn justifies an automated md→ts generator, it gets its own ADR. No generator exists today. Do not pretend one does.

---

## 5. The review pipeline

A Phase moves through **review steps**. Each step consumes an artifact and emits one. A review step failing routes back upstream per §5.2.

**Terminology:** In this document, "review step" = pipeline stage (CEO review, Design review, etc.). Not to be confused with "Gate" in a Phase's SPEC (G1, G2, G3 = subtask groupings in expedited phases). Phase 2.5 has 8 intra-phase Gates; the pipeline below has 6 review steps that apply to any Phase.

```
[Phase Spec drafted]
       │
       ▼
┌──────────────────────────┐
│  STEP 1: CEO Review      │  in:  phase-{N}/SPEC.md (draft)
│  source: reviews/CEO_    │  out: gates/phase-{N}/CEO_APPROVED.md
│          REVIEW.md       │
└──────────────────────────┘
       │ pass
       ▼
┌──────────────────────────┐
│  STEP 2: Design          │  in:  CEO_APPROVED.md
│         Consultation     │  out: gates/phase-{N}/DESIGN.md
│  source: design-system/  │       + low-fi wireframe link
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  STEP 3: Plan Design     │  in:  DESIGN.md + wireframe
│         Review           │  out: gates/phase-{N}/PLAN_DESIGN_REVIEW.md
│  source: design-system/  │
│          ANTI_PATTERNS.md│
└──────────────────────────┘
       │ pass
       ▼
┌──────────────────────────┐
│  STEP 4: Engineering     │  in:  SPEC.md + DESIGN.md
│         Review           │  out: gates/phase-{N}/ENGINEERING_APPROVED.md
│  source: CODEX_TRIAGE.md │       + Codex output appended
│          CODEX_PROMPT_   │
│          TEMPLATE.md     │
└──────────────────────────┘
       │ pass
       ▼
┌──────────────────────────┐
│  BUILD                   │  per Phase 2.5+ intra-phase Gate (G1, G2, ...):
│                          │   1. Builder writes task_plan.md (parallel_group annotated)
│                          │   2. Orchestrator spawns Agent Team (§7)
│                          │   3. Teammates execute tasks within their group
│                          │   4. Codex K-05 per DB-write Gate (per CODEX_TRIAGE.md)
│                          │   5. Gate ship → next Gate per GATE_AUTOPILOT.md
└──────────────────────────┘
       │
       ▼
┌──────────────────────────┐
│  STEP 5: Design Review   │  in:  live screens + DESIGN.md
│  source: reviews/DESIGN_ │  out: gates/phase-{N}/DESIGN_REVIEW.md
│          REVIEW.md       │       before/after screenshots embedded
└──────────────────────────┘
       │ pass
       ▼
┌──────────────────────────┐
│  STEP 6: QA Smoke        │  in:  live URL
│  source: /qa (planned,   │  out: gates/phase-{N}/QA_SMOKE.md
│  not yet built; see      │       browser screenshots + log
│  followup)               │
└──────────────────────────┘
       │ pass
       ▼
[Commit + PR + push]
```

### 5.1 Review step artifact contract

Every artifact file is a Markdown document with this header:

```markdown
# {STEP_NAME} — Phase {N}
Status: PASS | FAIL | REVISE
Reviewer: {model or human}
Timestamp: {ISO 8601}
Inputs: {list of file paths consumed}
```

Body sections vary by step (defined in the corresponding `reviews/*.md`).

### 5.2 Failure routing

A failed review step routes to a specific upstream node:

| Failed step | Routes back to | Reason |
|---|---|---|
| CEO Review | Spec author | Business case unclear |
| Design Consultation | (no upstream) | Iterate within step |
| Plan Design Review | Design Consultation | Frame or token plan wrong |
| Engineering Review | Design Consultation OR Spec author | Architecture conflict |
| Design Review (post-build) | Builder | Implementation diverged from DESIGN.md |
| QA Smoke | Builder | Functional defect |

### 5.3 Halt conditions

The pipeline halts (no auto-routing, asks yagi) when:
- Same step fails 2× consecutively → halt for manual triage
- Engineering Review surfaces HIGH severity finding outside the TRIAGE taxonomy → halt per CODEX_TRIAGE.md
- SPEC drift discovered mid-Build → amend SPEC first, resume after

### 5.4 Autopilot interaction

`AUTOPILOT.md` governs Phase-to-Phase transitions. `GATE_AUTOPILOT.md` governs Gate-to-Gate transitions within a Phase. Review steps in this document are **orthogonal** to Gate semantics — they are sequential stages every Phase passes through before and after Build.

Expedited phases (like Phase 2.5) compress Steps 1–4 into a single Phase-entry decision package and run Steps 5–6 at Phase closeout. Each intra-phase Gate still gets its own Codex K-05 per CODEX_TRIAGE.md.

### 5.5 Review step artifacts are sacred

Once written, an artifact is never edited in-place. A retry produces a new artifact with a numeric suffix:

```
gates/phase-2-5/DESIGN_REVIEW.md       ← first attempt
gates/phase-2-5/DESIGN_REVIEW.v2.md    ← retry
```

The latest version with `Status: PASS` is canonical.

---

## 6. Reviews — three axes

Each review answers a different question. Mixing them produces useless reviews.

| Review | Question | Reviewer | Run when |
|---|---|---|---|
| **CEO Review** | Should we build this at all? | Senior / AI in CEO mode | Once per Phase, before design |
| **Design Review** | Does it look and feel right? | Designer / AI in Design mode | Pre-build (plan) + Post-build (visual) |
| **Engineering Review** | Will it survive production? | Codex K-05 (adversarial, external model) | Once per Phase + per DB-write Gate |

The three axes are **orthogonal**. A Phase that passes all three is shippable.

Security posture note: SECURITY DEFINER audit and RLS hardening are part of Engineering Review but not the top priority bar today. yagi is pre-revenue, pre-compliance-audit, and prioritizes ship speed. Codex K-05 catches what it catches; yagi triages per CODEX_TRIAGE.md without over-weighting HIGH-B / HIGH-C findings that are defense-in-depth only. Phase 2.6 will have a dedicated security sweep (FU-13 FORCE RLS, FU-8 auth.uid optimization, etc.). Until then, the bar is "exploitable today? fix. theoretical? defer to follow-up."

---

## 7. Parallel execution (Agent Teams + git worktrees)

**Source of truth:** `.yagi-autobuild/PARALLEL_WORKTREES.md`

Summary (do not duplicate detail here — if these disagree, PARALLEL_WORKTREES.md wins):

- Single Gate with multiple independent subtasks → **Agent Team, in-process mode, main worktree**
- Multiple Gates genuinely independent → **Multiple `claude -w` sessions in separate Warp tabs**
- Adversarial investigation → **Agent Team with competing-hypothesis prompts**

Primary primitive: `claude --teammate-mode in-process`. Warp Windows does not support split-pane mode — in-process only.

`task_plan.md` schema now requires `parallel_group` field per subtask. Orchestrator groups by letter, spawns Agent Team per letter, waits for group completion before advancing.

3-5 teammates per group is the sweet spot. Beyond 5, coordination overhead exceeds parallelism benefit.

---

## 8. Build conventions (per-phase, during STEP: BUILD)

These bind during the Build step.

### 8.1 Per-screen checklist (teammate must satisfy all)
1. Frame selected per `design-system/UI_FRAMES.md`
2. Hierarchy first, styling later — match `PRINCIPLES.md` L1–L5 ordering
3. Components used satisfy their `COMPONENT_CONTRACTS.md` contract (no ad-hoc variants)
4. Typography references roles only, not raw sizes — see `TYPOGRAPHY_SPEC.md`
5. Locale-aware helper used for any KR/EN-mixed text node
6. All six states present and tested: `default / hover / focus / loading / empty / error`
7. No layout shift on data load (skeleton or reserved space)
8. Korean copy fits without truncation in the Korean version (not just the English one)

### 8.2 Forbidden during build
- Hardcoding any color, size, or radius value outside `tailwind.config.ts`
- Adding a new component variant without updating `COMPONENT_CONTRACTS.md` first (L1 → L2 ordering)
- Using `clamp()` for typography outside marketing surfaces

---

## 9. Anti-pattern routing

There are two homes for anti-patterns. Putting one in the wrong home creates duplication.

### 9.1 Spec-specific anti-patterns
Live inside the relevant spec.

### 9.2 Cross-cutting anti-patterns
Live in `design-system/ANTI_PATTERNS.md`.

`ANTI_PATTERNS.md` opens with this rule:
> This file is for anti-patterns that span ≥2 specs.
> If an anti-pattern belongs to one spec, put it there instead.

---

## 10. (Reserved — previously "Token sync md→ts". Removed in v2.0. See §4 note.)

---

## 11. Decisions log (ADR)

`docs/design/DECISIONS.md` records decisions that shaped the system. One ADR per decision, append-only.

### 11.1 ADR format

```markdown
## ADR-{NNN}: {Title}
Date: {YYYY-MM-DD}
Status: Accepted | Superseded by ADR-{NNN} | Deprecated

### Context
What forced this decision? What constraints existed?

### Decision
What we chose. One paragraph.

### Consequences
- Positive: ...
- Negative: ...
- Followups: ...

### Alternatives considered
- Option A: rejected because ...
- Option B: rejected because ...
```

### 11.2 What deserves an ADR
- Choosing a reference framework (gstack partial adoption)
- Adopting Pretendard as single font for KR+EN
- Introducing Agent Teams as default parallel model
- Removing the L2 token-sync pipeline (ADR for v2.0)

### 11.3 What does NOT deserve an ADR
- Adding a new component variant (lives in COMPONENT_CONTRACTS)
- Changing a single token value (lives in Tailwind config diff)
- Renaming a class (lives in PR description)

---

## 12. Continuity & handoff

### 12.1 Session continuity
- `.yagi-autobuild/HANDOFF.md` is updated at the end of every working session
- `.yagi-autobuild/DECISIONS_CACHE.md` accumulates Q&A to prevent repeat questions across sessions

### 12.2 ARCHITECTURE.md vs HANDOFF.md
- ARCHITECTURE.md = invariant. Changes require an ADR.
- HANDOFF.md = volatile. Updated continuously.

### 12.3 Bootstrapping a new contributor (or new Claude session)
Read order:
1. `ARCHITECTURE.md` (this file) — what the system is
2. `HANDOFF.md` — what state the system is in
3. `PARALLEL_WORKTREES.md` — how we run agents in parallel
4. `design-system/PRINCIPLES.md` — the aesthetic spine
5. `docs/design/DECISIONS.md` — why things are the way they are
6. The current Phase's `SPEC.md` — what's being built right now
7. The current Gate's `G{K}-ENTRY-DECISION-PACKAGE.md` if within an expedited phase

Skipping step 1 → will guess. Skipping step 5 → will re-litigate settled questions.

---

## 13. Versioning

This document is versioned at the top.

- **Patch** (2.0 → 2.0.1): typo fix, clarification with no semantic change.
- **Minor** (2.0 → 2.1): new review step, new directory, new skill listed.
- **Major** (2.x → 3.0): workflow restructure.

Major bumps require an ADR.

---

## 14. Glossary

| Term | Meaning |
|---|---|
| Phase | A unit of work tracked by `.yagi-autobuild/phase-{N}/` |
| Gate (intra-phase) | One of G1, G2, ... — a subtask grouping in expedited phases |
| Review step | A stage in the pipeline (§5) — CEO, Design, Eng, etc. |
| Artifact | The file a review step emits |
| L1 / L2 / L3 | Judgment / Code / Review layers (§1) |
| Frame | One of the UI patterns in `UI_FRAMES.md` |
| Role (typography) | Semantic typography category (Display, Title, etc.) |
| Token | A named atomic design value (color, size, etc.) |
| Spec | A `.md` document defining behavior of a system slice |
| Skill | A reusable instruction template the AI invokes |
| K-05 | Engineering review protocol — Codex with high reasoning |
| Halt | Pipeline state requiring human intervention |
| ADR | Architecture Decision Record (`DECISIONS.md`) |
| Agent Team | Claude Code's official multi-session primitive (§7) |
| Teammate | A Claude Code session spawned by a team lead |
| parallel_group | Task field marking which tasks run simultaneously |
| gstack | Garry Tan's Claude Code skill collection; partial adoption reference |

---

## 15. What this document does NOT cover

- How individual specs (TYPOGRAPHY, COMPONENT, etc.) are written → see those specs
- How code is structured beyond the design system → see project README
- How CI/CD runs → see deploy config
- How the Anthropic API is called from inside artifacts → see Anthropic docs
- Business strategy → see `docs/design/DECISIONS.md` and CEO review notes
- Codex install / usage → see `codex-review-protocol.md` (legacy but install section still valid)
- Parallel agent mechanics → see `PARALLEL_WORKTREES.md`

If you're looking for one of these, you're in the wrong file.

---

## 16. Open questions (to resolve over Phase 2.5 → 2.6)

These are deliberately deferred. Document the answer as an ADR when resolved.

1. **Storybook setup** — `docs/design/STORYBOOK.md` is a placeholder. Real Storybook or hand-curated catalog?
2. **Figma round-trip** — DESIGN.md references Figma file keys, but no automated sync exists. Acceptable for now?
3. **`/qa` equivalent skill** — §5 STEP 6 references a QA skill that is not yet built. Target: mid-Phase-2.5 or Phase 2.6 entry.
4. **Subagent definition library** — `.claude/agents/*.md` currently empty. Populate as recurring roles emerge across 3+ Gates.

---

## 17. Authority

This document supersedes any conflicting workflow instruction in:

- previous `.yagi-autobuild/SPEC.md` files
- `HANDOFF.md` workflow notes
- inline instructions in skill files

If a skill file or decision package says "skip Step N for Phase X", and this document does not allow skipping, the skill/package is wrong.
Open an ADR. Update this document. Then update the skill.

Exception: `PARALLEL_WORKTREES.md` wins on parallel execution mechanics. `CODEX_TRIAGE.md` wins on Codex finding triage. `GATE_AUTOPILOT.md` wins on Gate-to-Gate transitions. `AUTOPILOT.md` wins on Phase-to-Phase transitions. This document covers the overall shape and the review pipeline; the specialized docs cover their domains.

---

## 18. Phase 4.x Wave C.5b amendments (2026-05-01)

Two cross-cutting decisions land here so future Phases inherit them
verbatim. Full reasoning lives in `DECISIONS_CACHE.md` Q-094 and
Q-095; this section is the architectural anchor.

### 18.1 Persona model: Brand-only for Phase 4–9

The 3-persona model (Brand / Artist / YAGI Admin) introduced by the
PRODUCT-MASTER concept holds, but with **Brand only** wired to a
live UI through Phase 9. Artist Roster intake is curated yagi-direct
(Phase 5 entry, not self-registration). Independent creators are
permanently deferred.

Concrete deletions executed in Wave C.5b sub_01..02:

- `src/app/[locale]/onboarding/role/`
- `src/app/[locale]/onboarding/profile/{client,creator,observer,studio}/`
- `src/app/[locale]/onboarding/profile/actions.ts`
- `src/app/u/` (full tree — `[handle]/`, `layout.tsx`)
- `src/lib/profile/` (queries.ts)
- `src/lib/email/send-onboarding.ts` + `templates/{signup-welcome,role-confirmation,index}.ts`
- The `kind: "profile"` branch of `Scope` union in `src/lib/app/scopes.ts`
- The `User` icon usage + profile-section render in
  `src/components/app/sidebar-scope-switcher.tsx`

The `profiles.role` enum still carries `creator|studio|observer|client`
for legacy DB rows. Code reads `client` (active) and will read
`artist` (Phase 5 entry, after enum extension migration). All other
values are inert.

### 18.2 Design system v1.0 — editorial dark

`src/app/globals.css` `:root` now carries v1.0 dark editorial tokens
directly — Phase 2.7.1 P12 light P12 retired. `.dark` is a no-op
alias; `.light` is **opt-in** for special contexts only (admin /
inverse sections / future special-purpose surfaces).

Source of truth: `~/.claude/skills/yagi-design-system` (SKILL.md +
references/{tokens.json, globals.css, tailwind.preset.cjs,
DESIGN-flora.md}).

Token namespaces in this repo:

| Layer | Namespace | Purpose |
|---|---|---|
| shadcn HSL channel | `--background`, `--foreground`, `--accent`, ... | shadcn-component compat |
| v1.0 raw | `--ds-bg-base`, `--ds-ink-primary`, `--ds-sage`, ... | rgba-aware utilities |

Tailwind config extends with non-overlapping families: `sage`, `ink`,
`surface`, `edge`, `inverse`, type scale 11..80, motion (400ms /
cubic-bezier(0.45, 0, 0, 1) defaults), radius scale (pill / card /
button), maxWidth (narrow / content / cinema).

**Hard rules** (yagi-design-system v1.0 SKILL.md §"Hard Rules"):

1. No additional accent colors. Sage `#71D083` is sole.
2. No shadows by default. Border + backdrop blur for elevation.
3. No legacy `#C8FF8C` lime — fully retired; replace with sage.
4. No EN tracking on KO text. KO body `0`, KO display `-0.01em`.
5. No lh 1.0 on KO display. Minimum 1.15 to avoid jamo clipping.
6. No Mona12 / Redaction Italic for body (accent-only, max 2 words).
7. No uniform grids for media (mixed-size asymmetric is the language).
8. No bold (700+) in body (Pretendard/Geist body 400–600).

Wave C.5c is reserved for the visual-breakage sweep flagged by
`_sub00_breakage_log.md` after yagi review.

### 18.3 sub_00 ROLLBACK amendment (2026-05-01)

§18.2 above describes the dark editorial flip that landed in Wave
C.5b sub_00. yagi's visual review of that flip returned a verdict
of "too heavy on light pages, roll back." The amendment:

- `:root` returned to Phase 2.7.1 P12 light tokens (off-white
  background, near-black ink). `next-themes` `defaultTheme="light"`
  + `enableSystem` restored.
- v1.0 vocabulary **kept**: sage sole accent, ink hierarchy,
  surface ramp, border ramp, type scale, motion, radius,
  Pretendard fonts. Values are now light-bg-adapted (the `--ds-*`
  namespace in globals.css carries the light variants under
  `:root`, the dark variants under `.dark` for opt-in inverse
  sections).
- New token `--ds-sage-ink: #2D7A3F` introduced for text-on-light
  sage — saturated `#71D083` only reaches ~1.6:1 contrast on white
  (fails WCAG AA). `.accent-sage` and `.bg-sage-soft` (text uses)
  route to the darker variant; `.bg-sage` (fill use) keeps the
  saturated value.

The deletion list and persona-A model under §18.1 are unaffected —
those decisions stand.
