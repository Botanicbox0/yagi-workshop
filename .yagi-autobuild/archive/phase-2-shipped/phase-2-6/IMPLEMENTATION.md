# Phase 2.6 — Implementation Guide

**Companion to** `SPEC.md` **v3**
**Status:** v3 DRAFT, 2026-04-24

> This document is the **how**. Policy (what and why) lives in `SPEC.md`.
> Cross-references live in `REFERENCES.md`.

---

## §1 Sidebar mapping — complete route table

Each route is annotated with its group, role gate, and parent-child
relationship.

### 작업 group

| Route | Role gate | Parent | Notes |
|---|---|---|---|
| `/[locale]/app/projects` | workspace_admin, workspace_member | — | — |
| `/[locale]/app/preprod` | yagi_admin | — | Phase 2.1 team-chat infra |
| `/[locale]/app/showcases` | workspace_admin, workspace_member | — | — |
| `/[locale]/app/admin/challenges` | yagi_admin | `챌린지 ▾` | child 1 of 3 |
| `/[locale]/app/admin/challenges/new` | yagi_admin | `챌린지 ▾` | child 2 of 3 |
| `/[locale]/app/admin/challenges?state=open` | yagi_admin | `챌린지 ▾` | child 3 of 3 |
| `/[locale]/app/storyboards` | workspace_admin, workspace_member | — | Soon / disabled |
| `/[locale]/app/brands` | workspace_admin | — | Soon / disabled |

### 소통 group

| Route | Role gate | Notes |
|---|---|---|
| `/[locale]/app/meetings` | workspace_admin, workspace_member | — |
| `/[locale]/app/notifications` | all authenticated | Confirm role gate at G1 audit |
| `/[locale]/app/team` | yagi-internal workspace member | Existing gate, unchanged |

### 결제 group

| Route | Role gate | Parent | Notes |
|---|---|---|---|
| `/[locale]/app/invoices` | yagi_admin, workspace_admin | `결제 ▾` (if child count ≥ 2) | Received invoices |
| `/[locale]/app/admin/invoices` | yagi_admin | `결제 ▾` | Issued invoices, moved from admin divider |

Auto-hide rule: when a user sees only 1 of the 2 children (e.g.
workspace_admin sees only `/app/invoices`), the `결제 ▾` parent collapses
into a bare link without group label.

### 시스템 group

| Route | Role gate | Notes |
|---|---|---|
| `/[locale]/app/settings` | all app users | — |
| `/[locale]/app/admin` | yagi_admin | Catch-all admin landing |

Auto-hide rule: non-yagi_admin users see only `/app/settings` → group
label hides, `설정` renders bare.

### Retired from sidebar

- `billing` — previously at `/[locale]/app/billing` with `disabled: true`.
  Entry removed from `items` array. Translation keys `nav.billing` +
  any tooltip strings removed from `messages/ko.json` + `messages/en.json`.


---

## §2 Scope resolver — how it's wired

Scope resolution is split between server and client:

- **Server resolver** `getUserScopes(ctx)` — pure function, lives in
  `src/lib/app/scopes.ts`. Consumes `ctx.profile.role` +
  `ctx.workspaceRoles` + `ctx.workspaces` from the existing `AppContext`
  (Phase 2.5). Returns array of tagged scopes.

- **Client hook** `useUserScopes()` — lives in
  `src/lib/app/use-user-scopes.ts`. Reads scopes from a React Context
  wrapped around app layout children. Throws in dev mode if Context not
  provided (defensive error for misuse).

- **Provider** — app layout (`src/app/[locale]/app/layout.tsx`) calls
  `getUserScopes(ctx)` server-side, passes to `<UserScopesProvider>`
  that wraps children.

### Why both server and client?

- Sidebar root renders on server — uses `getUserScopes` directly, no
  hydration needed for the scope list itself.
- Client surfaces that need the same scope list (Phase 2.5 G6
  `/u/[handle]` edit-affordance gating, future consumers) use
  `useUserScopes` for consistency.
- Both share the same resolver logic — changes to role-to-scope mapping
  happen in one place.

### Type shape

Discriminated union with three kinds: `workspace`, `profile`, `admin`.
Each kind carries kind-specific fields (workspace id+slug, profile
handle, admin name) plus shared `href` + `active` boolean.

Full type definition lives in `src/lib/app/scopes.ts`. SPEC §2 covers
the behavior contract; consult the TypeScript file for the authoritative
shape.

---

## §3 Help route map — data structure

Static TypeScript file at `src/lib/app/help-routes.ts` exports:

- `HELP_ROUTES` — readonly array of `HelpRoute` entries
- `resolveHelpRoute(pathname)` — returns matching entry or null

Each entry has 4 fields: `pattern`, `slug`, `i18nKey`, `published`.

### Pattern matching

`pattern` uses `:param` notation for dynamic segments (e.g.
`/app/admin/challenges/:id`). The resolver converts `:param` to regex
`[^/]+` and tests for exact match.

### Locale stripping

Before matching, the resolver strips a leading `/ko` or `/en` segment
from the pathname. This handles next-intl routes.

### Published flag

Entries with `published: false` are skipped by the resolver. They
remain in the array as structural reservations (we know the route will
eventually have a guide) but don't surface in UI.

### i18n

Labels live under `messages.app.help.routes.<i18nKey>` in each locale
file. Adding a new help entry requires one line in `help-routes.ts` +
one label per supported locale.

### Initial entries (all ship at `published: false` except one)

Per SPEC §3 minimum viable content requirement:

| i18nKey | Pattern | published at G3 closeout |
|---|---|---|
| `challengeCreation` | `/app/admin/challenges/new` | **true** (minimum viable content target) |
| `challengeManagement` | `/app/admin/challenges/:id` | false |
| `projectSetup` | `/app/projects/new` | false |
| `showcasePublishing` | `/app/showcases/new` | false |

### Guide content authoring

The single minimum-viable guide for `challengeCreation` is written by
야기 or Dana before G3 closeout. Target length: ~300-500 words. Covers:
- How to define challenge title + description
- `submission_requirements` field reference (what each checkbox does)
- Judging mode decision (admin / public vote / hybrid)
- Timeline setting guidance (open_at / close_at / announce_at)

Published to `/journal/guide/challenge-creation` via existing journal
post creation flow. After live, flip the `published` flag in
`help-routes.ts`, land PR, verify link appears at
`/app/admin/challenges/new`.


---

## §4 Gate task breakdowns

### G0 — Pre-work: scope resolver + hook (inside Phase 2.5)

**Where:** Phase 2.5 worktree, between G5 closeout and G6 entry
**Files:** `src/lib/app/scopes.ts` (new), `src/lib/app/use-user-scopes.ts` (new)
**Duration:** 1-1.5h

Tasks:

1. Write `getUserScopes(ctx: AppContext): Scope[]` server resolver.
   Pure function over the existing AppContext shape. Maps:
   - Each entry in `ctx.workspaces` → one `workspace` scope
   - `ctx.profile.role === 'creator' | 'studio'` → one `profile` scope
   - `ctx.workspaceRoles.includes('yagi_admin')` → one `admin` scope
2. Write `useUserScopes()` client hook. Reads from React Context;
   throws in dev if Context missing.
3. Wrap app layout children with `<UserScopesProvider value={scopes}>`.
4. Verify by grep that both Phase 2.6 G2 and Phase 2.5 G6 can import
   from these paths without modification.

Acceptance: `pnpm exec tsc --noEmit` and `pnpm lint` both EXIT=0.
No other behavior changes.

### G1 — Sidebar 3-tier refactor + grouping

**Files:** `src/components/app/sidebar.tsx`,
`src/components/app/sidebar-nav.tsx`,
`src/components/app/sidebar-group-label.tsx` (new)
**Duration:** 3-4h

Tasks:

1. Change `sidebar-nav.tsx` `items: Item[]` flat array → `groups:
   NavGroup[]`. Each group carries `key`, `i18nLabelKey`, `items`.
   Children inside `items` use nested `children?: NavItem[]` for 2-depth.
2. Build `<SidebarGroupLabel>` component for the quiet uppercase label.
   Auto-hides when fewer than 2 items visible for current user.
3. Extend `NavLink` with `indent: 0 | 1` prop. Parents with `children`
   and no `href` render as non-clickable toggles.
4. Insert Phase 2.5 routes: `challenges ▾` parent + 3 children, in
   `작업` group. Role-gated by yagi_admin.
5. Insert `결제 ▾` parent with `invoices` + `admin_invoices` children.
   Auto-expand when pathname matches child.
6. Remove `billing` entry + translation key.
7. Move `admin_invoices` from bottom admin divider into `결제` group.
8. Wire scope resolver: `Sidebar` calls `getUserScopes(ctx)` server-side,
   passes to child components.
9. Visual check: visit each route at localhost:3003, confirm rendering.

Stop: 야기 visual review before G2.


### G2 — Scope selector component

**Files:** `src/components/app/sidebar-scope-switcher.tsx`
(renamed from `sidebar-workspace-switcher.tsx`)
**Duration:** 3-4h

Tasks:

1. Rename file + component + update `Sidebar` import.
2. Replace workspace-only logic with scope-kind-aware rendering:
   - Leading icon per kind (briefcase / user / shield)
   - Trigger shows active scope's display name
   - Dropdown items ordered: workspaces first, profile, admin
3. Single-scope fallback (≥2 scopes → dropdown, 1 → static label,
   0 → hidden).
4. Null profile.role case: scope list simply won't include profile kind
   — no special handling needed.
5. Keyboard nav: Enter opens, Arrow navigates, Esc closes, Enter selects.
6. `router.push(scope.href)` on selection.

Stop: none (internal UI).

### G3 — Help link mechanism + 1 guide published

**Files:** `src/components/app/page-help-link.tsx` (new),
`src/lib/app/help-routes.ts` (new),
`messages/ko.json` (extended),
`messages/en.json` (extended with empty strings or Korean fallback),
`src/app/[locale]/app/layout.tsx` (modified header slot)
**Duration:** 2-3h + ~30min guide authoring (야기/Dana)

Tasks:

1. Write `help-routes.ts` per §3.
2. Build `<PageHelpLink>` client component. Uses `usePathname()`,
   calls `resolveHelpRoute`, renders link or null.
3. Add i18n labels under `messages.app.help.routes.*`.
4. Wire into app layout header, left of notification bell.
5. **Minimum viable content**: 야기 or Dana writes
   `challenge-creation` journal guide (~300-500 words). Publish at
   `/journal/guide/challenge-creation`. Flip
   `HELP_ROUTES.challengeCreation.published` to `true`.
6. Verify link appears at `/app/admin/challenges/new` and nowhere else.

Stop: none.

### G4 — A11y + mobile drawer + Codex K-05

**Files:** sidebar components, layout, use existing
`src/components/ui/sheet.tsx`
**Duration:** 2-3h

Tasks:

1. Keyboard full-pass: Tab through sidebar, scope selector, help link.
   All interactive elements focusable with visible ring.
2. Screen reader: use `aria-label` on each tier (Workspace context /
   Operations / User account) and `role="group"` +
   `aria-labelledby` on each operations-tier group.
3. Mobile drawer: reuse `<Sheet>` primitive from existing UI library.
   Sidebar content (3 tiers + 4 groups) renders inside drawer at <768px.
   No new drawer primitives authored.
4. Run Codex K-05 on full Phase 2.6 diff. Target: CLEAN or MEDIUM_ONLY.
   HIGH findings halt per ADR-005 expedited triage.

Stop: Codex review outcome.


---

## §5 Pre-conditions (non-negotiable)

Before G1 starts, verify:

- **Phase 2.5 fully closed out** (G8 done). Phase 2.5 G5 adds admin
  challenge routes that G1 consumes.
- **Phase 2.4 G1 shipped** (Webflow design tokens + fonts). Sidebar
  active-state color depends on `--accent` token. If Phase 2.4 G1
  isn't ready, G1 can proceed with temporary fallback documented
  in commit message.
- **G0 verified** (see SPEC §7 fragility guard). Grep for
  `useUserScopes` export in `src/lib/app/use-user-scopes.ts`. If
  missing, halt G1 and run G0 first.

---

## §6 File inventory

New files created by Phase 2.6:

```
src/lib/app/scopes.ts                       (G0)
src/lib/app/use-user-scopes.ts              (G0)
src/lib/app/help-routes.ts                  (G3)
src/components/app/sidebar-group-label.tsx  (G1)
src/components/app/sidebar-scope-switcher.tsx (G2, renamed from workspace-switcher)
src/components/app/page-help-link.tsx       (G3)
```

Modified files:

```
src/components/app/sidebar.tsx              (G1)
src/components/app/sidebar-nav.tsx          (G1)
src/app/[locale]/app/layout.tsx             (G0 provider + G3 header slot)
messages/ko.json                            (G1 group labels + G3 help labels)
messages/en.json                            (G1 + G3 stubs)
```

Deleted files: none.

Renamed files:

```
src/components/app/sidebar-workspace-switcher.tsx
  → src/components/app/sidebar-scope-switcher.tsx
```

---

## §7 Verification — closeout smoke test

Before declaring Phase 2.6 shipped:

1. As yagi_admin, visit every route in §1. Confirm sidebar renders with
   correct group labels + active state.
2. As a workspace_admin (non-yagi_admin), repeat. Confirm `시스템` and
   `결제` group labels hide (only 1 item each visible).
3. As a Creator (profile.role = 'creator'), open scope selector.
   Confirm workspace + profile scopes listed.
4. Tab through sidebar, scope selector, help link. Confirm focus ring
   visible on every stop.
5. Visit `/app/admin/challenges/new`. Confirm help link appears
   top-right (minimum viable content target).
6. Visit `/app/admin/challenges/[some-id]`. Confirm help link does NOT
   appear (published: false).
7. Shrink viewport to <768px. Confirm sidebar collapses into Sheet
   drawer with all content intact.
8. Run `pnpm exec tsc --noEmit` and `pnpm lint`. Both EXIT=0.
9. Run `git diff --stat -- src/app/api src/lib/supabase supabase/migrations`.
   Must return empty (UI-only invariant).

---

**END OF IMPLEMENTATION GUIDE v3**
