# Design Review — YAGI Workshop

> **Role:** Structured design review to run BEFORE any phase ships and BEFORE any PR that introduces new UI surfaces merges. Catches generic-AI-looking output, hierarchy violations, and accessibility drift.
> **When to run:** 
> - Phase spec review: after Engineering Review (Codex K-05), before Builder implementation.
> - Per-PR review: manually by Yagi or with Codex assistance, before merge.
> - Pre-launch audit: whole-product pass before major external milestones.
> **Who runs it:** Codex `gpt-5.4` high reasoning as first pass (catches structural issues), then Yagi as final pass (catches taste-level issues — the part only a human can judge).
> **Output:** `.yagi-autobuild/reviews/design-review-<phase-or-pr-id>.md` with findings + verdict.

---

## Pre-flight — does this design review apply?

Skip the design review if:
- Phase has no user-facing UI changes (pure backend, infra, data migration).
- PR is a bug fix with no layout change.

Always run the design review if:
- Any new page, modal, drawer, or major section is introduced.
- Typography scale, color palette, or spacing is touched.
- A component is added to the shared library.
- Email templates change.
- The showcase public page changes (highest visibility surface).

---

## Part 1 — Machine-checkable (Codex K-05 first pass)

Codex runs these as a structural review. Each check returns PASS / FAIL / N/A with evidence.

### 1.1 Frame declaration
- [ ] Spec or PR identifies the frame (Overview / Browse / Detail / Create-Edit / Workflow) for every new screen.
- [ ] Frame rules from `UI_FRAMES.md` are followed (anatomy, section count, CTA placement).

### 1.2 Information hierarchy
- [ ] Every new screen defines L1–L5 in spec or in a code comment block.
- [ ] Exactly one primary action (L3) per frame. If two, second is explicitly justified.
- [ ] Heading describes state, not decoration. ("3 active invoices" > "Invoices").

### 1.3 Typography
- [ ] Type tokens come from the defined scale (no ad-hoc `font-size: 17.5px`).
- [ ] Max 2 font families across the change.
- [ ] Korean line-height is higher than English where both coexist.
- [ ] CTA / tab / nav labels have space for 30% Korean expansion.

### 1.4 Color
- [ ] No new color values introduced without adding to the palette and a comment explaining why.
- [ ] Semantic colors (success/warning/error) used only for state, not decoration.
- [ ] Primary actions are solid black on white (or white on black for inverse contexts).
- [ ] No gradient backgrounds, except permitted showcase OG image.
- [ ] Contrast ratios ≥ WCAG AA for body text. ≥ AA for large text.

### 1.5 Spacing
- [ ] 8pt base unit respected. No `padding: 11px`.
- [ ] Density mode honored — values read from the density variable, not hardcoded.
- [ ] Consistent spacing between equivalent elements across frames.

### 1.6 Components
- [ ] No new button, input, modal variant introduced without a component contract entry.
- [ ] No inline styles overriding component defaults without a `DECISIONS.md` note.
- [ ] Cards not used where a table or list would serve better (see `UI_FRAMES.md §Browse`).

### 1.7 Motion
- [ ] All transitions 150–250ms.
- [ ] No motion without state change behind it.
- [ ] `prefers-reduced-motion` respected.

### 1.8 Accessibility
- [ ] Every interactive element has a visible focus ring.
- [ ] Color is never the only state signal.
- [ ] Error messages include cause + remediation, not just "invalid."
- [ ] Form fields have associated labels (not placeholder-as-label).
- [ ] Keyboard-only navigation passes for the main happy path.

### 1.9 Localization
- [ ] Strings externalized to `messages/ko.json` and `messages/en.json`.
- [ ] Dates, numbers, currency formatted per locale.
- [ ] Screenshots or descriptions provided for both ko and en renderings.
- [ ] No hardcoded English placeholder text ("enter text" style).

### 1.10 Empty and error states
- [ ] Every list / table / detail defines its empty state.
- [ ] Empty state explains + suggests next action (not just "no items").
- [ ] Error states define: inline validation, form submission failure, page-level error.
- [ ] Loading state: skeleton matching final layout, not generic spinner.


---

## Part 2 — Taste-checkable (Yagi final pass)

These require human visual judgment. Codex can surface concerns, but Yagi's eye is the decision.

### 2.1 The generic-AI test
Look at the screen for 3 seconds. Could this be a screenshot from a generic ChatGPT-generated SaaS tutorial?

Red flags:
- **Feature grid with three identical icon+title+description blocks** across the viewport.
- **Hero section with gradient headline and a generic CTA like "Get started free"**.
- **Stock abstract SVG shapes** in place of content.
- **Bento grid dashboard** where it doesn't serve content.
- **Colorful pill tags** everywhere, especially without semantic meaning.
- **Three competing primary buttons** in the same viewport.
- **Avatar cluster showing 5 gray circles** without purpose.
- **Generic icon library** (Heroicons outlined, all same stroke, decorative not functional).

If any red flag, the screen fails this check regardless of what Codex said.

### 2.2 The "would I pay for this?" test
Imagine the client is paying ₩2M/month for the workspace. Does this screen feel worth that? 

Sub-checks:
- Is the type set with care, or is it Tailwind defaults?
- Does the spacing feel composed, or auto-generated?
- Do the controls feel like they were chosen for this task, or dragged from a component library?
- Is there one detail that makes a user smile when they use it? (Not decoration — a functional detail done well.)

### 2.3 The restraint test
Walk through the screen and ask, for each visual element: **what is this teaching the user?**
- Every border: does it carry information (separation, grouping)?
- Every color: does it carry information (state, meaning, brand)?
- Every shadow: does it indicate elevation meaningfully?
- Every icon: does it aid recognition or just decorate?
- Every animation: does it show a state change?

If anything fails "what does this teach?" — remove it.

### 2.4 Korean + English side-by-side
Literally open the screen in both locales. Questions:
- Does the Korean version feel cramped?
- Does the English version feel sparse?
- Do any CTAs wrap to two lines in Korean?
- Are any Korean labels truncated?
- Do dates, numbers, currency look natural in both?

Screenshots of both required for the review artifact.

### 2.5 The reference calibration check
Open the 1–2 references cited in the phase spec side by side with our screen.
- Is our hierarchy as clear as theirs?
- Is our type as well-set as theirs?
- Is our density right for the job?
- Where are we visibly worse? Can we close that gap this PR, or log it as follow-up?

---

## Verdict and output

After the two parts:

```markdown
# Design Review — <phase or PR>

**Reviewed by:** Codex K-05 + Yagi
**Date:** YYYY-MM-DD
**Artifacts:** links to screenshots (ko + en), Figma, Storybook if applicable

## Part 1 — Machine checks
- 10 sections, each PASS / FAIL / N/A with evidence

## Part 2 — Taste checks
- 5 tests, each PASS / CONCERN / FAIL with notes

## Verdict
- [ ] approve — ready to merge / ship
- [ ] request_changes — specific issues listed below, fix before merge
- [ ] reject — fundamental direction issue, needs rework before re-review

## Required changes before merge
1. ...
2. ...

## Follow-ups (non-blocking, tracked for later phase)
1. ...

## Notable decisions for DECISIONS.md
1. ...
```

---

## Decision rules

Rules that promote a `concern` to `fail`:
- 2+ FAILs in Part 1 machine checks → verdict must be `request_changes`.
- Any FAIL on accessibility (1.8) or localization (1.9) → `request_changes` regardless of other results.
- Red flag in "generic AI test" (2.1) → `request_changes`.
- `concern` on both restraint (2.3) and "would I pay" (2.2) → `request_changes`.

Rules that promote to `reject`:
- Wrong frame chosen for the screen (Browse shipped where Detail was right).
- Primary brand/aesthetic direction violated (dark background, gradient buttons, decorative motion).

---

## Special scenarios

### Public showcase page
Stricter bar. This is the most visible surface. Every new showcase template goes through a full design review including:
- External review: show 3 people outside the team and note their first reaction.
- Mobile + desktop + tablet screenshots required.
- Both locales.
- Print / PDF view if invoices link to it.

### Email templates
Review against the real render in Gmail + Apple Mail + Outlook web. Screenshots in at least 2 clients.
Review for:
- Renders without CSS (fallback plain text)
- Dark mode handling (Gmail auto-inverts — verify it doesn't break)
- Link tracking pixel doesn't make the email ugly on slow load

### Marketing / landing pages
Extra checks:
- Lighthouse performance ≥ 90
- OG image renders correctly
- No decorative motion that hurts Core Web Vitals

---

## Speed: how long does this take?

- Machine checks (Codex K-05 design pass): ~5 minutes of automated output for a typical phase.
- Taste checks (Yagi): ~15 minutes per phase for a normal scope. 30 min for major phases.
- Total overhead per phase: ~20–30 minutes.

If this feels expensive, remember: the alternative is generic-looking output that requires a larger rework later. Spending 20 minutes now saves hours of redesign.

---

## Related files
- `PRINCIPLES.md` — the philosophy being enforced.
- `UI_FRAMES.md` — the frame definitions.
- `REFERENCES.md` — the calibration set.
- `TYPOGRAPHY_SPEC.md` — type scale details.
- `COMPONENT_CONTRACTS.md` — component rules.
- `.yagi-autobuild/reviews/CEO_REVIEW.md` — business review (runs before this).
- `.yagi-autobuild/design-system/DECISIONS.md` — where exceptions get logged.

Last updated: 2026-04-22 (initial draft).
