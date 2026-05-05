# Phase 6 Wave B.1 — Briefing Canvas Artist Regression Smoke

**Date:** 2026-05-05
**Branch:** g-b-9-phase-4 (worktree for agent-a9674d1a9a28e79ab)
**Base SHA verified:** `ba1672bf1af62d07c6389067e19f1f0b865a539a`
(matches origin/g-b-10-phase-6 HEAD: "fix(phase-6/A): wave-a K-05/K-06 hardening (LOOP-1 → LOOP-3 CLEAN)")

---

## 1. Base Alignment

`git reset --hard origin/g-b-10-phase-6` succeeded.
HEAD = `ba1672bf1af62d07c6389067e19f1f0b865a539a`. L-051 check PASS.

---

## 2. Code Reading Findings

### 2a. Active workspace resolver (`src/lib/workspace/active.ts`)

Wave A.2 wiring confirmed. `resolveActiveWorkspace()` contains:
- Phase 6/A.2 Artist sign-in default block: iterates memberships in reverse
  (most-recent-first) and returns the first `kind === 'artist'` workspace
  when no valid cookie is present.
- Fallback: `memberships[0]` (first-joined) if no Artist workspace found.
- WorkspaceKind type includes `'brand' | 'artist' | 'yagi_admin'`.

**VERDICT:** Artist users will correctly land in their Artist workspace
by default (cookie absent or stale). PASS.

### 2b. Project insert flow (`actions.ts`)

Three server actions: `createProject`, `ensureDraftProject`, `submitProjectAction`.

All three resolve workspace via `resolveActiveWorkspace(user.id)` (or via
draft project row + membership validation in `submitProjectAction`).
None of them branch on `workspace.kind`.

Key invariants confirmed:
- `project_type: "direct_commission"` — hardcoded, not conditioned on workspace.kind.
- `intake_mode: "brief"` — hardcoded, not conditioned on workspace.kind.
- `kind: "direct"` — hardcoded in `submitProjectAction` insert payload.
- `workspace_id: resolvedWorkspaceId` — resolves from active workspace cookie/artist fallback.
- `created_by: user.id` — always auth.uid().

**VERDICT:** All five correctness invariants from KICKOFF §B.1 EXIT pass. PASS.

### 2c. Wizard UI components

Checked all files in `src/app/[locale]/app/projects/new/`:
- `briefing-canvas.tsx`, `briefing-canvas-step-1.tsx`,
  `briefing-canvas-step-2.tsx`, `briefing-canvas-step-2-brief.tsx`,
  `briefing-canvas-step-2-reference.tsx`, `briefing-canvas-step-2-sidebar.tsx`,
  `briefing-canvas-step-3.tsx`, `new-project-wizard.tsx`

Zero `workspace.kind === 'brand'` or `workspaceKind` branch checks found
in any wizard page. The wizard renders identically regardless of caller's
workspace kind.

**VERDICT:** No Artist-breaking branch exists. PASS.

---

## 3. Wording Cross-Check (briefing.step1.*, step2.*, step3.*)

Scanned all KO and EN values under `projects.briefing.step1`, `step2`,
`step3`, and `projects.wizard.*` for forbidden internal terms.

Forbidden terms checked (KO):
Routing, Inbound, RFP, D2C, Self-Sponsored Ad, Footage Upgrade,
Approval Gate, Bypass, Auto-decline, License fee, Curation note,
Type 1-4, Direct Track, Talent-Initiated, Roster

Forbidden terms checked (EN, minus Roster):
same list minus Roster

**Result: 0 violations.**

Note on `projects.wizard.status.*` keys:
- `routing` key value = "Matching director" (KO: not inspected separately
  but the key is in `wizard.status` not `briefing.step*` scope; EN value
  does NOT use the internal term "Routing"). CLEAN.
- `approval_pending` key value = "Reviewing draft" (EN). Does NOT use
  "Approval Gate". CLEAN.

**VERDICT:** Wording rules fully compliant. No fixes needed.

---

## 4. tsc Status

`node_modules/.bin/tsc --noEmit` exits with code 2, but ALL errors are
pre-existing `content-collections` module-not-found issues in:
- `src/app/[locale]/journal/**`
- `src/app/api/og/route.tsx`
- `src/app/journal/feed.xml/route.ts`
- `src/app/sitemap.ts`
- `src/components/home/journal-preview.tsx`
- `src/components/home/selected-work.tsx`

These require the Next.js build pipeline to generate the `content-collections`
types artifact — they are unrelated to Phase 6 or Briefing Canvas.

**Zero errors in `src/app/[locale]/app/projects/new/**`.**
**Zero errors in `src/lib/workspace/active.ts`.**

**VERDICT:** tsc CLEAN for B.1 scope.

---

## 5. lint Status

`pnpm lint` exits with 0 errors, 21 warnings only.
All warnings are pre-existing (unused vars in email templates, `<img>`
tag in a non-wizard component).
Zero warnings in `src/app/[locale]/app/projects/new/**`.

**VERDICT:** lint CLEAN.

---

## 6. Files Changed

**0 code changes.** No i18n fixes were needed; no wording violations found.
Only this result document was created.

---

## 7. Verdict

**PASS — No regressions. Artist Briefing Canvas smoke complete.**

The Briefing Canvas (`/projects/new`) is safe for Artist workspace callers:
- Active workspace resolver correctly prefers Artist workspace on sign-in.
- All three project insert paths resolve workspace from cookie/artist-fallback,
  never branch on workspace.kind, and always write `intake_mode='brief'`,
  `kind='direct'`, `project_type='direct_commission'`, `created_by=auth.uid()`.
- Zero internal-term leakage in briefing.step1/2/3 i18n keys (KO + EN).
- tsc and lint clean within B.1 scope.

B.2 scope (has_external_brand_party migration + Step 3 toggle) remains
entirely untouched by this sub-task.
