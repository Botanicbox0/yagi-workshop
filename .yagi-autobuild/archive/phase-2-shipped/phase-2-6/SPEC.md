# Phase 2.6 — IA Revision

**Status:** SPEC v3 (supersedes v1 2026-04-23 + v2 DRAFT 2026-04-24)
**Date:** 2026-04-24
**Duration target:** 1-1.5 day sprint (UI-only, no schema change)

> **This is a policy document.** Implementation detail (file paths, task
> breakdown, code patterns) lives in `IMPLEMENTATION.md`. Cross-references
> and ADR links live in `REFERENCES.md`.

---

## §0 Why

Phase 2.5 adds 3 public + 1 admin surface. The existing app sidebar
(operations tier) is a flat 11+ item list with heterogeneous categories
— past Miller 7±2, no visual grouping, no scope switching beyond
workspaces, no page-level help.

Phase 2.6 fixes three things only:

1. **Sidebar** — flat list → 4 grouped categories (작업/소통/결제/시스템)
   with 2-depth indent support.
2. **Scope selector** — workspace switcher → multi-scope switcher
   (workspace / profile / admin).
3. **Contextual help** — add top-right page-scoped help link, wired
   to existing journal infrastructure.

No new routes. No schema change. No new design tokens.


---

## §1 Sidebar IA

### Tier model (unchanged structure, enhanced operations tier)

Sidebar is already structurally 3-tier (Context / Operations / System).
Phase 2.6 preserves tiers; only the Operations tier changes.

### Operations tier — 4 groups

Flat list becomes 4 categorical groups:

- **작업** — projects, preprod, showcases, challenges, disabled placeholders
- **소통** — meetings, notifications, team channel
- **결제** — invoices (received + issued, unified)
- **시스템** — settings, admin

Each group has a quiet uppercase section label. Labels auto-hide when
the group has fewer than 2 visible items for the current user role
(role-dynamic hiding).

### 2-depth indent

Parent items with no `href` act as non-clickable section headers.
Children render one indent level deeper. Parent auto-expands when the
current pathname matches any child route.

Used by:
- `challenges ▾` (yagi_admin only — 3 admin children)
- `결제 ▾` (yagi_admin with both invoices + admin_invoices visible)

### Route mapping

See `IMPLEMENTATION.md §1` for complete role-gated mapping.

### Retired from sidebar

- `billing` (Phase 1.x aspirational Soon slot, no roadmap) — see ADR-010.

### Consolidated

- `invoices` + `admin_invoices` → unified under `결제` group. See ADR-010.

### Public routes explicitly absent

`/challenges`, `/u/[handle]`, `/showcase/[slug]` are public surfaces with
their own chrome. Never appear in sidebar.


---

## §2 Scope selector

### Behavior contract

The top-of-sidebar selector exposes **3 scope kinds**:

- **workspace** — a workspace the user is a member of. Icon: briefcase.
- **profile** — the user's public `/u/<handle>` profile surface.
  Icon: user.
- **admin** — YAGI admin area (yagi_admin role only). Icon: shield.

A user may have any combination. Examples:
- Pure client (workspace_admin only) → 1 workspace scope
- Creator + workspace_admin + yagi_admin → 1 workspace + 1 profile + 1 admin

### Visibility rules

| Scope count | Rendering |
|---|---|
| 0 | Selector hidden (should not happen given auth guard) |
| 1 | Static label (non-interactive) |
| ≥2 | Dropdown with selection |

### Profile scope — role-gated

Profile scope appears in the list only when `profile.role ∈ {creator, studio}`.

- Observer → no profile scope (profile exists but minimal, not worth top-slot)
- `profile.role === null` → no profile scope (user is mid-onboarding;
  layout middleware should redirect to role selection anyway)

### Selection behavior

Selecting a scope navigates to its canonical href. Active scope shows
in trigger. Single-scope fallback preserves existing read-only pattern.


---

## §3 Contextual help

### Behavior contract

Each `/[locale]/app/*` route optionally has a corresponding help slug.
When the current route matches a help entry AND the entry is published,
a small help link renders in the top-right of the app header (left of
the notification bell). Clicking it navigates to the journal guide.

### Published-flag gating

Help routes have a `published` flag. When false, no link renders for
that route. This prevents broken links before guide content exists.

### Minimum viable content requirement (Phase 2.6 G3 closeout)

Phase 2.6 ships the mechanism AND at least one published guide. Shipping
mechanism-only would make the feature invisible on day one (dead
feature). The minimum:

- **1 guide page authored + published** by 야기 or Dana, for one of the
  4 pre-registered routes.
- **Recommended target:** `challenge-creation` (`/app/admin/challenges/new`)
  — Phase 2.5 G5 just shipped this surface; context is fresh.
- Guide page lives at `/journal/guide/<slug>` via existing journal
  infrastructure.

Remaining 3 routes may ship `published: false` and flip later via
single-line PRs as content catches up.

### Route-to-slug map

The static map of {pathname pattern, slug, i18n key, published flag}
lives in a single TypeScript file. Adding a new help entry is adding
one line. Pathname pattern supports dynamic segments (e.g. `:id` for
`[id]` routes). See `IMPLEMENTATION.md §3`.


---

## §4 IA governance (growth strategy)

Phase 2.6 establishes 4 groups, max 2-depth indent, max 5 items per
group (soft target). This is not a permanent ceiling; it's a snapshot
for current route volume.

### Growth triggers

Any one of these triggers an IA review:

- Any single group has >5 visible items for a default-role user
- Total groups >5
- 3-depth indent feels warranted for any group
- User feedback "I can't find X" repeats ≥2 times from distinct users

### Expansion hierarchy (apply in order)

When a trigger fires, expand in this order (cheapest first):

1. **Sub-group within existing group** — e.g., `작업 ▾` splits into
   `진행 중` / `아카이브` sub-sections (still 2-depth).
2. **Split group** — e.g., `작업` splits into `프로젝트` + `콘텐츠`.
3. **Add 5th top-level group** — only if category genuinely doesn't
   fit existing four.
4. **Per-user sidebar customization** — pinned items, recent items.
   Phase 3+ scale change.

Each expansion requires a new ADR appended to `docs/design/DECISIONS.md`.


---

## §5 Success criteria

All must pass for Phase 2.6 closeout:

1. Sidebar renders in 3 visually-distinct tiers on every `/[locale]/app/*`
   route.
2. Operations tier renders 4 groups with quiet section labels.
   Groups with <2 visible items for current user hide their label.
3. 2-depth indent works: `challenges ▾` and `결제 ▾` parents expand
   when pathname matches a child, collapse otherwise, manual toggle works.
4. Scope selector lists all valid scope kinds for the user. Selection
   navigates correctly. Single-scope fallback preserved.
5. Profile scope follows visibility rules: shown for creator/studio,
   hidden for observer and null-role.
6. Active scope and active nav item visually marked with brand accent
   (Webflow blue from Phase 2.4 G1).
7. Contextual help link renders **only** when the route matches a
   published help entry. No broken links.
8. **At least 1 guide page published** (minimum viable content) — one
   `HELP_ROUTES` entry flipped to `published: true` with a live journal
   post. Default target: `challenge-creation`.
9. Full keyboard accessibility: Tab order complete, Enter/Arrow/Esc
   behave per §2 / §3 expectations, focus-visible ring on all interactive.
10. All existing `/[locale]/app/*` routes still navigate correctly (no
    regression). Manual smoke: visit every current sidebar entry.
11. Mobile drawer (<768px) reuses existing `Sheet` primitive. 3-tier +
    4-group structure visible inside drawer.
12. No schema change. No new API routes. No new design tokens. Verified
    by empty diff on schema/api paths.
13. `useUserScopes` hook shared across Phase 2.6 scope selector AND
    Phase 2.5 G6 `/u/[handle]` edit-affordance gating. (Proves the G0
    pre-work landed correctly.)


---

## §6 Gate flow

| Gate | What | Duration | Stop point |
|---|---|---|---|
| **G0** (pre-work) | `useUserScopes` hook + scope resolver landing. Runs during Phase 2.5, between G5 and G6. See FRAGILITY GUARD below. | 1-1.5h | None (internal infra) |
| **G1** | Sidebar 3-tier refactor + 4-group mapping + scope resolver wiring | 3-4h | 야기 visual review @ localhost:3003 |
| **G2** | Scope selector (rename + multi-kind + keyboard nav) | 3-4h | None |
| **G3** | Help link mechanism + 1 guide page published | 2-3h + ~30min content | None |
| **G4** | A11y + mobile drawer + Codex K-05 | 2-3h | Codex review |

Total: 10-13h Phase 2.6 proper + 1-1.5h G0 pre-work inside Phase 2.5.

Detailed task breakdowns: see `IMPLEMENTATION.md §4`.


---

## §7 G0 fragility guard (multi-layer)

G0 is executed inside Phase 2.5 (between G5 and G6), not in Phase 2.6
proper. This is intentional — Phase 2.5 G6 (`/u/[handle]` surface) needs
the `useUserScopes` hook, and landing the hook post-hoc would force
a refactor.

Risk: Builder skips G0 and ships G6 with ad-hoc role-checking code.
Phase 2.6 then requires retrofitting.

Mitigation — three layers:

**Layer 1 — Explicit blocker in Phase 2.5 FOLLOWUPS.**
`.yagi-autobuild/phase-2-5/FOLLOWUPS.md` contains entry
`FU-SCOPES-1 (BLOCKER for G6 entry)` with file existence verification
(`src/lib/app/use-user-scopes.ts`).

**Layer 2 — Gate entry pre-flight check.**
`.yagi-autobuild/GATE_AUTOPILOT.md` G6 entry step includes:
`[ ] Verify FU-SCOPES-1: file exists, useUserScopes export present.`
If missing → halt, run FU-SCOPES-1 first.

**Layer 3 — Phase 2.6 SPEC warning.**
Phase 2.6 G1 prerequisite note: "G0 missing at this point → G2 requires
+3-4h to retrofit G6. Do not proceed until G0 verified."

These three layers together make it unlikely a Builder misses G0 without
detecting the gap before damage propagates.


---

## §8 Out of scope

Explicitly deferred (most to Phase 2.7 or Phase 3+):

- Mobile-first sidebar redesign (bottom-tab, Phase 2.7)
- Notification badge on sidebar items (Phase 2.7)
- Collapsible groups with persisted state (Phase 3+, ADR-010 Option Z)
- Sidebar customization per user — pinned items, recent items (Phase 3+)
- Search-in-sidebar (Phase 3+)
- Multi-workspace switching for non-admin users (permanent deferral)
- Breadcrumbs (permanent deferral, ADR-008)
- Public surface navigation overhaul (not this phase's scope)
- Help center / generic guide search (Phase 3+)
- Meeting workflow inversion (client-initiated requests, slot proposals,
  counter-propose, agenda_md, action_items) — see `FOLLOWUPS.md`
  **FU-MTG-1**, Phase 3+ scale
- Billing reintroduction (requires new ADR + mapping amendment)
- Journal guide authoring beyond the 1 minimum guide (content work,
  ongoing)

---

## §9 ADRs referenced

- **ADR-008** No breadcrumbs (v1, carried forward)
- **ADR-009** Role type reconciliation (Accepted 2026-04-23, see
  `docs/design/DECISIONS.md`)
- **ADR-010** Sidebar IA grouping + billing retirement + invoice
  consolidation — authored by this phase, lives in
  `docs/design/DECISIONS.md` (not inline here)

See `REFERENCES.md` for full ADR context and cross-references.

---

## §10 Changelog

- **2026-04-23** — v1 authored (single-file, 417 lines)
- **2026-04-24 morning** — v2 DRAFT (single-file, expanded to ~600 lines)
  with 야기 decisions applied. Discarded before commit per 야기 feedback;
  see v3 rationale below.
- **2026-04-24 afternoon** — v3 rewrite per 야기 feedback. Split into
  3 files (SPEC / IMPLEMENTATION / REFERENCES). Policy/implementation
  cleanly separated. G0 fragility guard upgraded to 3-layer. IA
  governance (growth strategy) added. Minimum viable content
  requirement added.

---

**END OF SPEC v3**
