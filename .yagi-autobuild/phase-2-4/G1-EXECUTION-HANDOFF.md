# Phase 2.4 G1 — Execution Handoff

Audience: Claude Code (Builder/Executor) at Phase 2.4 G1 invocation
Pre-requisite: Phase 2.5 G1 complete OR Phase 2.5 G2 not yet started

## Mission
Apply 6 staging artifacts in .yagi-autobuild/phase-2-4/ to actual project locations.
Order matters. Each step has acceptance criteria.

## Pre-flight
1. cd C:\Users\yout4\yagi-studio\yagi-workshop
2. ls .yagi-autobuild/phase-2-4/  (verify 7 files present)
3. ls public/fonts/WFVisualSansVF.woff2  (verify present, 367KB)
4. git status  (working tree should be clean)

## Step 1 — ADR-007 append
Read: .yagi-autobuild/phase-2-4/ADR-007-staging.md
Apply: docs/design/DECISIONS.md
- Add Index row at end of §Index table
- Append ADR-007 body block at end of file

## Step 2 — PRINCIPLES.md amend
Read: .yagi-autobuild/phase-2-4/PRINCIPLES-amend-staging.md
Apply: .yagi-autobuild/design-system/PRINCIPLES.md
- Replace entire §3 with [§3 NEW] block
- Replace first bullet of §6 with [§6 amend] block

## Step 3 — TYPOGRAPHY_SPEC.md amend
Read: .yagi-autobuild/phase-2-4/TYPOGRAPHY-amend-staging.md
Apply: .yagi-autobuild/design-system/TYPOGRAPHY_SPEC.md
- Replace §3.1 with [§3.1 NEW] block
- Replace §3.2 with [§3.2 RENAMED + REWRITTEN] block (note title change)
- Replace §5.1 role table with new table that has Family column + add rules
- Append [§10 additions] to §10
- Insert [§15 NEW] after §14

## Step 4 — REFERENCES.md amend
Read: .yagi-autobuild/phase-2-4/REFERENCES-amend-staging.md
Apply: .yagi-autobuild/design-system/REFERENCES.md
- Delete existing §1.2 Webflow entry
- Insert two new entries (Webflow product + Webflow brand)
- Renumber subsequent entries (Stripe → §1.4, Height → §1.5, Read.cv → §1.6)
- Bump "Last updated" line

## Step 5 — globals.css replace
Backup: cp src/app/globals.css src/app/globals.css.bak
Apply: cp .yagi-autobuild/phase-2-4/globals-proposed.css src/app/globals.css
Verify: diff src/app/globals.css.bak src/app/globals.css (significant diff expected)
Cleanup: rm src/app/globals.css.bak

## Step 6 — fonts.ts merge
Read: .yagi-autobuild/phase-2-4/fonts-proposed.ts
Apply: merge wfVisualSans export into src/app/fonts.ts (do not delete existing)
Apply: src/app/layout.tsx — add wfVisualSans.variable to <html className>

## Step 7 — tailwind.config.ts extend
Edit theme.extend:

fontFamily:
  display: ['var(--font-display)', 'Pretendard Variable', 'sans-serif']

colors:
  accent:
    DEFAULT: 'hsl(var(--accent))'
    foreground: 'hsl(var(--accent-foreground))'
    soft: 'hsl(var(--accent-soft))'
    'soft-foreground': 'hsl(var(--accent-soft-foreground))'
  gray:
    100: 'hsl(var(--gray-100))'
    200~900 동일 패턴

borderRadius:
  sm: 'var(--radius-sm)'
  md: 'var(--radius-md)'

boxShadow:
  'elevation-1': 'var(--elevation-1)'

## Step 8 — CHANGELOG.md bump

Add to .yagi-autobuild/design-system/CHANGELOG.md:

## [0.2.0] — 2026-04-23

### Added
- WF Visual Sans display font registered via next/font/local
- Webflow blue dual accent token: --accent (#146EF5) + --accent-soft (#4353FF)
- 9-step gray scale Webflow-aligned
- --radius-sm + --radius-md split tokens
- --elevation-1 shadow token
- ADR-007 — WF Visual Sans display font (ADR-002 partial supersede)
- TYPOGRAPHY_SPEC.md §15 — Font role table
- REFERENCES.md — Webflow product/brand split

### Changed
- Black anchor color: #0A0A0A → #080808 (Webflow primary black)
- PRINCIPLES.md §3 Aesthetic direction — accent shifted from amber to Webflow blue dual
- PRINCIPLES.md §6 Typography — single-font rule replaced with role-separated dual-font rule
- TYPOGRAPHY_SPEC.md §3.2 renamed and rewritten

### Removed
- .dark mode CSS block from src/app/globals.css — light-only confirmed
- Fraunces font declaration (was unused per ADR-007 direction)

## Step 9 — Build verification
pnpm install
pnpm tsc --noEmit
pnpm lint
pnpm build
All four MUST pass exit 0. Failure → STOP, report.

## Step 10 — Visual sanity (yagi)
pnpm dev (port 3003)
야기 5분 visual check:
- Background pure white?
- Body text near-black?
- Accent blue feel right?
- No dark mode artifacts?
- WF Visual Sans loaded? (DevTools Network filter "woff2")

야기 confirm "G1 visual OK" → proceed to G2.
색감 어색 → adjust --accent HSL components (try L=48% darker or L=58% lighter).

## Step 11 — Cleanup staging
After all pass + yagi confirm:
rm .yagi-autobuild/phase-2-4/ADR-007-staging.md
rm .yagi-autobuild/phase-2-4/PRINCIPLES-amend-staging.md
rm .yagi-autobuild/phase-2-4/TYPOGRAPHY-amend-staging.md
rm .yagi-autobuild/phase-2-4/REFERENCES-amend-staging.md
rm .yagi-autobuild/phase-2-4/globals-proposed.css
rm .yagi-autobuild/phase-2-4/fonts-proposed.ts
Keep: SPEC.md, G1-EXECUTION-HANDOFF.md (audit trail)

## Step 12 — Commit + Telegram
git add -A
git commit -m "Phase 2.4 G1 — Foundation patches

- ADR-007: WF Visual Sans display font (ADR-002 partial supersede)
- globals.css: dark mode removed, Webflow blue dual accent, 9-step gray, WF Visual Sans @font-face
- fonts.ts: WF Visual Sans local font
- tailwind.config.ts: font-display, accent, gray, elevation-1 tokens
- PRINCIPLES.md amend: §3 §6
- TYPOGRAPHY_SPEC.md amend: §3.1 §3.2 §5.1 §10 §15
- REFERENCES.md amend: Webflow product/brand split
- CHANGELOG.md: [0.2.0]

Build PASS. Visual sanity yagi confirmed."

git push origin main
Telegram: "Phase 2.4 G1 done. Foundation patches in main. G2 audit next."

## Failure modes
| Failure | Recovery |
|---|---|
| Font 404 | verify public/fonts/WFVisualSansVF.woff2 exists |
| Font flash | font-display: swap working as expected |
| Accent too saturated | adjust --accent HSL L=48% or 58% |
| tsc fail on fonts.ts | verify wfVisualSans export keyword |
| build fail | tailwind class font-display missing → check tailwind.config.ts |

## G2 entry
Do NOT auto-proceed to G2 without yagi explicit "GO G2" command.
