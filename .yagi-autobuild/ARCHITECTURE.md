# ARCHITECTURE.md
Version: 1.0
Owner: B-O-E (Builder / Orchestrator / Executor)
Scope: YAGI Workshop end-to-end build pipeline
Companion docs: `design-system/*.md`, `reviews/*.md`, `skills/*.md`
Reference framework: gstack (https://github.com/garrytan/gstack)

---

## 0. Purpose

This document is the **single source of truth** for how YAGI Workshop is built.
It defines:

- the directory layout that holds the system
- the three layers of authority (Judgment / Code / Review)
- the workflow gates each Phase passes through
- the artifact each gate must emit before the next gate begins
- which skill (YAGI custom or gstack) handles each step
- where each rule lives so nothing drifts

If this document and another document disagree about workflow, **this document wins** until updated.

---

## 1. Mental model — three layers

Every artifact in this system belongs to exactly one layer.

### L1 — Judgment (markdown)
Rules a human or AI must read and apply with discretion.
Lives in `.yagi-autobuild/design-system/*.md` and `.yagi-autobuild/reviews/*.md`.
Hand-edited. Source of truth for all downstream artifacts.

### L2 — Code (TypeScript)
Mechanical translation of L1 into runtime values.
Lives in `src/design-tokens/*.ts` and `src/lib/design/*.ts`.
**Generated from L1.** Hand-editing L2 is forbidden — see §4.

### L3 — Review (executable check)
Verification that L2 matches L1, and that built UI matches both.
Lives in `.yagi-autobuild/reviews/*.md` (rules) and `.yagi-autobuild/skills/qa-smoke-test.md` (execution).
Run automatically by gates.

A change that crosses layers must touch them in order: **L1 → L2 → L3**, never sideways.

---

## 2. Directory structure (final)

```
C:\Users\yout4\yagi-studio\yagi-workshop\
│
├── .yagi-autobuild/
│   ├── ARCHITECTURE.md              ← this file (workflow contract)
│   ├── HANDOFF.md                   ← session continuity
│   ├── AUTOPILOT.md                 ← autopilot chain config
│   │
│   ├── design-system/               ← L1 Judgment
│   │   ├── PRINCIPLES.md
│   │   ├── UI_FRAMES.md
│   │   ├── COMPONENT_CONTRACTS.md
│   │   ├── TYPOGRAPHY_SPEC.md
│   │   ├── INTERACTION_SPEC.md
│   │   ├── REFERENCES.md
│   │   ├── ANTI_PATTERNS.md         ← cross-cutting only (§9)
│   │   └── CHANGELOG.md             ← token diffs across versions
│   │
│   ├── reviews/                     ← L3 Review rules
│   │   ├── CEO_REVIEW.md
│   │   ├── DESIGN_REVIEW.md         ← post-build checkpoint
│   │   ├── PLAN_DESIGN_REVIEW.md    ← pre-build checkpoint
│   │   └── ENGINEERING_REVIEW.md    ← Codex K-05 protocol
│   │
│   ├── skills/                      ← reusable instructions
│   │   ├── office-hours.md
│   │   ├── design-consultation.md
│   │   ├── frame-selection.md       ← replaces frame-picker.ts (§7.3)
│   │   ├── design-shotgun.md
│   │   ├── qa-smoke-test.md
│   │   └── token-sync.md            ← md → ts generation (§4)
│   │
│   ├── gates/                       ← gate artifacts accumulate here
│   │   └── phase-{N}/
│   │       ├── CEO_APPROVED.md
│   │       ├── DESIGN.md
│   │       ├── PLAN_DESIGN_REVIEW.md
│   │       ├── ENGINEERING_APPROVED.md
│   │       ├── DESIGN_REVIEW.md
│   │       └── QA_SMOKE.md
│   │
│   └── phase-{N}/
│       └── SPEC.md                  ← per-phase spec
│
├── src/
│   ├── design-tokens/               ← L2 Code (generated)
│   │   ├── colors.ts                ← from PRINCIPLES.md
│   │   ├── typography.ts            ← from TYPOGRAPHY_SPEC.md
│   │   ├── spacing.ts               ← from PRINCIPLES.md
│   │   ├── motion.ts                ← from INTERACTION_SPEC.md
│   │   ├── index.ts
│   │   └── .generated               ← marker file (§4)
│   │
│   ├── components/
│   │   └── ui/                      ← shadcn forked, contract-aware
│   │
│   └── lib/
│       └── design/                  ← runtime helpers
│           ├── locale-aware.ts      ← KR/EN typography correction
│           └── density.ts           ← compact / comfortable / relaxed
│
├── docs/design/                     ← human-readable, NOT for AI
│   ├── STORYBOOK.md
│   └── DECISIONS.md                 ← ADR log (§11)
│
└── figma/
    └── FILES.md                     ← Figma file keys + roles
```

Files **deleted** from earlier proposal:

- `src/lib/design/frame-picker.ts` — judgment cannot be hardcoded; replaced by `skills/frame-selection.md` (see §7.3).

---

## 3. Audience separation

A document is written for one audience. Mixing them produces drift.

| Path | Reader | Tone |
|---|---|---|
| `.yagi-autobuild/design-system/*` | Builder / Orchestrator (AI) | Imperative rules. No background. |
| `.yagi-autobuild/reviews/*` | Reviewer (AI or human) | Pass/fail criteria. No prose. |
| `.yagi-autobuild/skills/*` | AI invoked mid-task | Procedure. Prompt-shaped. |
| `docs/design/STORYBOOK.md` | Human contributor | Examples, screenshots, narrative. |
| `docs/design/DECISIONS.md` | Human contributor + future YAGI | ADR — context, decision, consequences. |
| `figma/FILES.md` | Designer | File keys + scope per file. |

Rule: if you find yourself writing background or rationale inside `.yagi-autobuild/`, that text belongs in `docs/design/DECISIONS.md` instead.

---

## 4. Source-of-truth rule

`.md` is authoritative. `.ts` is generated.

### 4.1 Generation pipeline
- Source: `.yagi-autobuild/design-system/*.md`
- Generator: `.yagi-autobuild/skills/token-sync.md` (invoked by AI; not a build script — yet)
- Output: `src/design-tokens/*.ts`
- Marker: `src/design-tokens/.generated` is touched on every regen with timestamp + source commit SHA.

### 4.2 Hand-editing `.ts` is forbidden
Each generated file carries this header:

```ts
// =====================================================================
//  AUTO-GENERATED FROM .yagi-autobuild/design-system/{SOURCE}.md
//  DO NOT EDIT BY HAND. Run skills/token-sync.md to regenerate.
//  Last sync: 2026-04-23T..  source SHA: ......
// =====================================================================
```

Pre-commit hook scans `src/design-tokens/*.ts` for absence of this header → reject.

### 4.3 When `.md` and `.ts` disagree
`.md` wins. Always. Run token-sync to regenerate.

### 4.4 Why not the reverse direction
Two reasons humans (and AI reading documentation) reason about typography in semantic terms ("Title-md should be 24/32"), and reviewers verify against text-readable spec. Generating text from code requires a separate doc-generator and re-introduces the same drift.

### 4.5 Open: when to automate
Today, `token-sync.md` is run on demand. When token churn slows after Phase 3.0, promote it to a CI check (`pnpm tokens:verify` fails if `.ts` doesn't match `.md`).

---

## 5. The build pipeline

A Phase moves through gates. Each gate consumes an artifact and emits one. No gate may begin until its predecessor's artifact exists.

```
[Phase Spec drafted]
       │
       ▼
┌─────────────────────────┐
│  GATE 1: CEO Review     │  in:  phase-{N}/SPEC.md (draft)
│  skill: office-hours    │  out: gates/phase-{N}/CEO_APPROVED.md
└─────────────────────────┘
       │ pass
       ▼
┌─────────────────────────┐
│  GATE 2: Design         │  in:  CEO_APPROVED.md
│         Consultation    │  out: gates/phase-{N}/DESIGN.md
│  skill: design-         │       + low-fi wireframe link
│         consultation    │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  GATE 3: Plan Design    │  in:  DESIGN.md + wireframe
│         Review          │  out: gates/phase-{N}/PLAN_DESIGN_REVIEW.md
│  rules: PLAN_DESIGN_    │
│         REVIEW.md       │
└─────────────────────────┘
       │ pass
       ▼
┌─────────────────────────┐
│  GATE 4: Engineering    │  in:  SPEC.md + DESIGN.md
│         Review          │  out: gates/phase-{N}/ENGINEERING_APPROVED.md
│  protocol: K-05         │       + Codex output appended
│  skill: codex-review    │
└─────────────────────────┘
       │ pass
       ▼
┌─────────────────────────┐
│  BUILD                  │  per screen:
│  by Builder + Executor  │   1. invoke skills/frame-selection.md
│                         │   2. respect COMPONENT_CONTRACTS
│                         │   3. respect TYPOGRAPHY_SPEC
│                         │   4. use locale-aware helper
│                         │   5. define all 6 states
│                         │  on first screen complete:
│                         │   → mid-build Design Review (light, see §5.6)
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│  GATE 5: Design Review  │  in:  live screens + DESIGN.md
│  rules: DESIGN_REVIEW.md│  out: gates/phase-{N}/DESIGN_REVIEW.md
│  skill: design-review   │       8 checkpoints, screenshots embedded
│         (gstack-style)  │
└─────────────────────────┘
       │ pass
       ▼
┌─────────────────────────┐
│  GATE 6: QA Smoke       │  in:  live URL
│  skill: qa-smoke-test   │  out: gates/phase-{N}/QA_SMOKE.md
│  tool:  Kapture MCP     │       browser screenshots + log
└─────────────────────────┘
       │ pass
       ▼
[Commit + PR + push]
```

### 5.1 Gate input/output contract

Every gate file is a Markdown document with this header:

```markdown
# {GATE_NAME} — Phase {N}
Status: PASS | FAIL | REVISE
Reviewer: {model or human}
Timestamp: {ISO 8601}
Inputs: {list of file paths consumed}
```

Body sections vary by gate (defined in the corresponding `reviews/*.md`).

### 5.2 Failure routing
A failed gate routes to a specific upstream node:

| Failed gate | Routes back to | Reason |
|---|---|---|
| CEO Review | Spec author | Business case unclear |
| Design Consultation | (no upstream) | Iterate within gate |
| Plan Design Review | Design Consultation | Frame or token plan wrong |
| Engineering Review | Design Consultation OR Spec author | Architecture conflict |
| Design Review (post-build) | Builder | Implementation diverged from DESIGN.md |
| QA Smoke | Builder | Functional defect |

Failure routing is **not optional** — it is the only legal way to retry a gate.

### 5.3 Halt conditions
The pipeline halts (no auto-routing, asks human) when:

- Same gate fails 2× consecutively → halt for manual triage
- Engineering Review surfaces HIGH/CRITICAL severity finding → halt for `/codex` adversarial mode
- Design Review surfaces "frame mismatch" (wrong UI_FRAMES selection) → halt; this means earlier gates were lying to themselves

### 5.4 Autopilot interaction
Per `.yagi-autobuild/AUTOPILOT.md`, autopilot is allowed to traverse gates 1–6 without human intervention **only if**:

- All gates report PASS
- No HIGH/CRITICAL Codex finding
- No frame-mismatch flag
- Telegram notification per Phase boundary, not per gate

A halt condition (§5.3) breaks autopilot regardless of config.

### 5.5 Gate artifacts are sacred
Once written, a gate artifact is never edited in-place. A retry produces a new artifact with a numeric suffix:

```
gates/phase-2-5/DESIGN_REVIEW.md       ← first attempt
gates/phase-2-5/DESIGN_REVIEW.v2.md    ← retry
gates/phase-2-5/DESIGN_REVIEW.v3.md    ← second retry
```

This preserves audit trail. The latest version with `Status: PASS` is the canonical pass.

### 5.6 Mid-build Design Review (lightweight)
On first screen complete, the Builder runs a 3-checkpoint check (not the full 8) before continuing to remaining screens:

1. Frame selected matches DESIGN.md?
2. Typography roles applied (no raw sizes)?
3. All 6 states (default/hover/focus/loading/empty/error) present?

Failure here routes back to Builder before more screens are built. This is the cheapest place to catch frame mismatch.

---

## 6. Reviews — three axes

Each review answers a different question. Mixing them produces useless reviews.

| Review | Question | Reviewer | Run when |
|---|---|---|---|
| **CEO Review** | Should we build this at all? | Senior/AI in CEO mode | Once per Phase, before design |
| **Design Review** | Does it look and feel right? | Designer/AI in Design mode | Pre-build (plan) + Post-build (visual) |
| **Engineering Review** | Will it survive production? | Codex (adversarial) | Once per Phase, after design, before build |

The three axes are **orthogonal**. A Phase that passes all three is shippable. A Phase that passes two of three is not.

---

## 7. Skill inventory

YAGI uses a hybrid: custom skills for YAGI-specific work, gstack skills where they fit cleanly.

### 7.1 YAGI custom skills (in `.yagi-autobuild/skills/`)

| Skill | Purpose | Replaces gstack? |
|---|---|---|
| `office-hours.md` | CEO review, Phase scoping | adapts `/office-hours` |
| `design-consultation.md` | Frame + token + ref selection | adapts `/design-consultation` |
| `frame-selection.md` | Per-screen frame picker | (no gstack equivalent) |
| `design-shotgun.md` | 3-variant generator for new screens | adapts `/design-shotgun` |
| `qa-smoke-test.md` | Browser smoke via Kapture MCP | partial overlap with `/qa` |
| `token-sync.md` | md → ts generation | (YAGI-specific) |

### 7.2 gstack skills used as-is (when invoked explicitly)

| gstack skill | Use in YAGI |
|---|---|
| `/codex` | Engineering Review (Gate 4) — `gpt-5.4` + high reasoning, K-05 protocol |
| `/codex --adversarial` | Halt-mode escalation when HIGH finding appears |
| `/plan-design-review` | Gate 3 — pre-build check |
| `/design-review` | Gate 5 — post-build visual audit with screenshot iteration |
| `/investigate` | Outside the build pipeline — bug triage |
| `/freeze` / `/guard` | Outside the build pipeline — destructive command safety |

### 7.3 Why `frame-picker.ts` was deleted
"Which frame fits this screen?" is L1 Judgment, not L2 Code.
A `.ts` function would either:

- hardcode current frames (and break on the next addition), or
- become a thin wrapper around an LLM call (which is what a skill already is).

The skill `frame-selection.md` is invoked per screen, takes the screen's purpose + data shape as input, returns `{ recommended, alternatives, rationale }`, and is editable in plain text without a deploy.

### 7.4 When to add a new skill
A new skill is justified when **the same procedure is invoked across ≥3 Phases**. Until then, the procedure lives inline in the Phase SPEC and gets promoted to a skill on the third use.

---

## 8. Build conventions (per-phase)

These bind during Gate 5 (Build).

### 8.1 Per-screen checklist (Builder must satisfy all)
1. Frame selected via `skills/frame-selection.md` — recorded in PR description
2. Hierarchy first, styling later — match `PRINCIPLES.md` L1–L5 ordering
3. Components used satisfy their `COMPONENT_CONTRACTS.md` contract (no ad-hoc variants)
4. Typography references roles only, not raw sizes — see `TYPOGRAPHY_SPEC.md`
5. Locale-aware helper used for any KR/EN-mixed text node
6. All six states present and tested: `default / hover / focus / loading / empty / error`
7. No layout shift on data load (skeleton or reserved space)
8. Korean copy fits without truncation in the Korean version (not just the English one)

### 8.2 Forbidden during build
- Importing tokens from `src/design-tokens/*` directly into a screen (use Tailwind classes that consume them)
- Hardcoding any color, size, or radius value
- Adding a new component variant without updating `COMPONENT_CONTRACTS.md` first (L1 → L2 ordering)
- Modifying generated `.ts` files (see §4.2)
- Using `clamp()` for typography outside marketing surfaces

---

## 9. Anti-pattern routing

There are two homes for anti-patterns. Putting one in the wrong home creates duplication.

### 9.1 Spec-specific anti-patterns
Live inside the relevant spec. Examples:

- "All-caps Korean text" → `TYPOGRAPHY_SPEC.md §15`
- "blue-button class naming" → `COMPONENT_CONTRACTS.md §4.1`
- "Decorative serifs in product UI" → `TYPOGRAPHY_SPEC.md §3.2`

### 9.2 Cross-cutting anti-patterns
Live in `ANTI_PATTERNS.md`. Examples:

- "Generic AI-gradient purple/blue"
- "Stock SaaS hero illustration"
- "Floating glassy cards without context"
- "Emoji-heavy UI"
- "Treating product UI as a landing page (or vice versa)"
- "Mixing tabular and proportional numerals in the same column"
- "Pre-checked consent checkboxes"
- "Spinner-only loading states for >800ms operations"

`ANTI_PATTERNS.md` opens with this rule:

> This file is for anti-patterns that span ≥2 specs.
> If an anti-pattern belongs to one spec, put it there instead.
> If you can't decide, put it in the spec — moving it later is cheap.

---

## 10. Token sync (md → ts)

### 10.1 What gets generated
- `colors.ts` — from `PRINCIPLES.md §color`
- `typography.ts` — from `TYPOGRAPHY_SPEC.md §4 + §5 + §6 + §7 + §8`
- `spacing.ts` — from `PRINCIPLES.md §spacing`
- `motion.ts` — from `INTERACTION_SPEC.md §timing + §easing`

### 10.2 What does NOT get generated
- `index.ts` — hand-curated barrel export
- `tailwind.config.ts` — references generated tokens but is hand-written
- Component-level styling — lives in components, not tokens

### 10.3 Sync triggers
- After any merge to a `design-system/*.md` file
- Before opening a Build gate for a Phase that introduces new screens
- On demand via `claude run skills/token-sync.md`

### 10.4 Sync verification
After sync, the generator emits a diff summary:

```
TOKEN SYNC — 2026-04-23T..
source SHA: a1b2c3d
diff:
  + typography.body.lg (added: 18/28/400)
  ~ typography.title.md.tracking (changed: -0.005em → -0.01em)
  - typography.display.xs (removed)
verify: pnpm tokens:verify → PASS
```

This summary is appended to `design-system/CHANGELOG.md`.

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
- Choosing source-of-truth direction (md vs ts)
- Adopting Pretendard as single font for KR+EN
- Deleting `frame-picker.ts` in favor of skill
- Adopting gstack `/plan-design-review` instead of in-house pre-build check
- Choosing modular ratio 1.125 over 1.2

### 11.3 What does NOT deserve an ADR
- Adding a new component variant (lives in COMPONENT_CONTRACTS)
- Changing a single token value (lives in CHANGELOG)
- Renaming a class (lives in PR description)

---

## 12. Continuity & handoff

### 12.1 Session continuity
- `.yagi-autobuild/HANDOFF.md` is updated at the end of every working session.
- Format defined elsewhere (existing convention).

### 12.2 ARCHITECTURE.md vs HANDOFF.md
- ARCHITECTURE.md = invariant. Changes require an ADR.
- HANDOFF.md = volatile. Updated continuously.

### 12.3 Bootstrapping a new contributor (or new Claude session)
Read order:
1. `ARCHITECTURE.md` (this file) — what the system is
2. `HANDOFF.md` — what state the system is in
3. `design-system/PRINCIPLES.md` — the aesthetic spine
4. `docs/design/DECISIONS.md` — why things are the way they are
5. The current Phase's `SPEC.md` — what's being built right now

A contributor who reads all five can act safely. A contributor who skips (1) will guess. A contributor who skips (4) will re-litigate settled questions.

---

## 13. Versioning

This document is versioned at the top. Bumps:

- **Patch** (1.0 → 1.1): typo fix, clarification with no semantic change.
- **Minor** (1.0 → 1.1.0 wait — we use 1.x): new gate, new skill, new directory.
- **Major** (1.x → 2.0): workflow restructure (e.g., adding a 7th gate, removing the L1/L2/L3 model).

Major bumps require an ADR.

---

## 14. Glossary

| Term | Meaning |
|---|---|
| Phase | A unit of work tracked by `.yagi-autobuild/phase-{N}/` |
| Gate | A required checkpoint between Phase stages |
| Artifact | The file a gate emits as its output |
| L1 / L2 / L3 | Judgment / Code / Review layers (§1) |
| Frame | One of the 5 UI patterns in `UI_FRAMES.md` |
| Role | Semantic typography category (Display, Title, etc.) |
| Token | A named atomic design value (color, size, etc.) |
| Spec | A `.md` document defining behavior of a system slice |
| Skill | A reusable instruction template the AI invokes |
| K-05 | Engineering review protocol — Codex with high reasoning |
| Halt | Pipeline state requiring human intervention |
| ADR | Architecture Decision Record (`DECISIONS.md`) |
| gstack | External skill collection by Garry Tan, partially adopted |

---

## 15. What this document does NOT cover

- How individual specs (TYPOGRAPHY, COMPONENT, etc.) are written → see those specs
- How code is structured beyond the design system → see project README
- How CI/CD runs → see deploy config
- How the Anthropic API is called from inside artifacts → see Anthropic docs
- Business strategy → see `docs/design/DECISIONS.md` and CEO review notes

If you're looking for one of these, you're in the wrong file.

---

## 16. Open questions (to resolve before Phase 2.5)

These are deliberately deferred. Document the answer as an ADR when resolved.

1. **token-sync automation timing** — manual now, CI later. When is "later"?
2. **Storybook setup** — `docs/design/STORYBOOK.md` is a placeholder. Real Storybook or hand-curated catalog?
3. **Figma round-trip** — DESIGN.md references Figma file keys, but no automated sync exists. Acceptable for now?
4. **Phase 2.5 vs Phase 3.0 boundary** — Challenge MVP scope cutoff needs explicit definition before Build gate.

---

## 17. Authority

This document supersedes any conflicting workflow instruction in:

- previous `.yagi-autobuild/SPEC.md` files
- `HANDOFF.md` workflow notes
- inline instructions in skill files

If a skill file says "skip Gate N for Phase X", and this document does not allow skipping, the skill is wrong.
Open an ADR. Update this document. Then update the skill.
