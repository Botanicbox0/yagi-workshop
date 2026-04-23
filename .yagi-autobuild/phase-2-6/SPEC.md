# Phase 2.6 — IA Revision (Sidebar refactor + Context Selector + Contextual Help)

**Status:** SPEC v1 (supersedes 2026-04-23 skeleton)
**Authors:** Web Claude + 야기
**Date:** 2026-04-23
**Duration target:** 1-1.5 day sprint (UI-only, no schema change)
**Blocks on:**
  - Phase 2.5 G3 minimum (public surfaces shipped) OR run in parallel with G3 if disjoint surfaces verified
  - Phase 2.4 G1 closeout (Webflow design tokens + Pretendard/WF Visual Sans)

---

## §0 — Why

Phase 2.5 ships 3 public surfaces (`/challenges`, `/challenges/[slug]`,
`/u/[handle]`) and 1 admin surface (`/admin/challenges/*`). Pre-audit of
existing `src/components/app/*` reveals:

- The current sidebar is **already structurally 3-tier** (workspace switcher
  / nav / user menu). Visual delimiters exist (`border-b`, `border-t`,
  divider line).
- However, the middle (operations) tier is a **flat list**. Phase 2.5 adds
  3 new routes to this list, bringing the total visible items to ~10. Past
  the perceptual limit for "scanable list at a glance" (Miller's 7±2).
- The workspace switcher dropdown only switches workspaces; it does not
  expose the user's `/u/<handle>` profile scope, which Phase 2.5 introduces.
- No contextual help link slot is wired anywhere. Top-right header has only
  notification bell.

A reference D2C campaign-management SaaS surface (analyzed 2026-04-23,
screenshot in `phase-2-6/REFERENCES/`) demonstrates 3 patterns we explicitly
want to absorb to address these gaps:

1. **Sidebar 2-depth indent** — parent-child grouping inside the operations
   tier (e.g. "challenges → new / list" indented under one parent).
2. **Multi-scope context selector** — top-of-sidebar dropdown that switches
   between fundamentally different scopes (workspace, profile, admin),
   not just between workspaces.
3. **Contextual help link** (top-right) — page-scoped guidance link, not
   generic help center.

**Non-goals (explicit):**
- New routes (Phase 2.5 covers all new routes)
- Schema change (Phase 2.5 G1 covers all schema)
- Mobile sidebar redesign (deferred to Phase 2.7)
- Multi-workspace switching for non-admin users (out of scope — single
  workspace per user remains invariant; selector adds *scope* switching)
- Reorganizing existing app routes (only grouping changes, not paths)
- Breadcrumbs (sidebar active state + page H1 sufficient — see §5 ADR-008)

---

## §1 — Architecture overview

### Sidebar tier model — final structure (P1)

The existing tier structure is preserved; the operations tier gains
2-depth indent capability. Visual treatment per tier:

| Tier | Container | Content | Visual treatment |
|---|---|---|---|
| **Context (top)** | `border-b border-border p-5` | Multi-scope selector | `font-display`, larger text, dropdown |
| **Operations (middle)** | `flex-1 overflow-y-auto py-3 px-2` | Grouped nav items, optional 2-depth indent | Standard `text-[13px]`, icon + label |
| **System (bottom)** | `border-t border-border p-3` | User menu + signout | `text-[11px]`/avatar, dropdown |

The Operations tier supports **2-depth indent** for parent-child relationships.
A parent without an `href` is a section header (non-clickable). A child is
indented `pl-6` instead of `pl-3`. Parent shows `ChevronRight` rotated to
`ChevronDown` when expanded; collapsed by default unless current pathname
matches a child route.

### Operations tier mapping (post Phase 2.5 + Phase 2.6)

```
프로젝트              /[locale]/app/projects        (workspace_admin/member)
미팅                  /[locale]/app/meetings        (workspace_admin/member)
인보이스              /[locale]/app/invoices        (yagi_admin/workspace_admin)
쇼케이스              /[locale]/app/showcases       (workspace_admin/member)
챌린지 ▾              [parent, no href]            (Phase 2.5 — admin only)
  ├─ 전체             /[locale]/app/admin/challenges
  ├─ 새 챌린지         /[locale]/app/admin/challenges/new
  └─ 진행 중           /[locale]/app/admin/challenges?state=open
스토리보드 (Soon)      /[locale]/app/storyboards    (disabled, tooltip)
브랜드 (Soon)         /[locale]/app/brands         (disabled)
빌링 (Soon)          /[locale]/app/billing         (disabled)
설정                  /[locale]/app/settings        (workspace_admin/member)
─── divider ───
관리자                /[locale]/app/admin           (yagi_admin)
관리자 인보이스        /[locale]/app/admin/invoices  (yagi_admin)
```

Public routes (`/challenges`, `/u/[handle]`, `/showcase/[slug]`) are
**explicitly absent from the sidebar** — they are public surfaces accessed
via different navigation patterns (footer links, profile dropdown links,
showcase pin from challenge winners).

### Multi-scope context selector (P2) — supersedes workspace switcher

Existing `SidebarWorkspaceSwitcher` becomes `SidebarScopeSwitcher`. The
dropdown items are computed by scope resolver `getUserScopes(ctx)`:

```ts
type Scope =
  | { kind: "workspace"; id: string; name: string; href: string; active: boolean }
  | { kind: "profile";   handle: string; display_name: string; href: string; active: boolean }
  | { kind: "admin";     name: string; href: string; active: boolean };

// Example output for a user who is creator + workspace_admin + yagi_admin:
[
  { kind: "workspace", id: "ws_1", name: "Acme Corp",  href: "/app", active: true  },
  { kind: "profile",   handle: "yagi", display_name: "야기", href: "/u/yagi", active: false },
  { kind: "admin",     name: "Yagi Admin", href: "/app/admin", active: false },
]
```

Display rules:
- Selector hidden if `scopes.length === 0` (no app access — should not happen
  given app layout already enforces auth + onboarding)
- If `scopes.length === 1`, render as static label (non-interactive), per
  existing pattern (`SidebarWorkspaceSwitcher` already does this for
  `workspaces.length === 1`)
- If `scopes.length >= 2`, render as dropdown with `ChevronsUpDown` chevron
- Active scope shows in trigger; selecting a scope navigates to that scope's
  href via `router.push`
- Each scope kind has a distinct leading icon: `Briefcase` (workspace),
  `User` (profile), `ShieldCheck` (admin)

**Profile scope visibility:** A profile scope only appears for users with
`profiles.role IN ('creator','studio')` — Observers have a profile page
but it's minimal and doesn't warrant a top-of-sidebar slot. Observer users
see only their workspace scopes (if any).

### Contextual help link (P4)

Each page inside `/[locale]/app/*` may export a `helpSlug` constant via
the existing Next.js page metadata pattern:

```tsx
// src/app/[locale]/app/admin/challenges/new/page.tsx
export const helpSlug = "challenge-creation";
```

A new `<PageHelpLink>` server component reads route metadata at render time
and outputs a top-right link in the existing app layout `<header>` slot:

```tsx
// src/app/[locale]/app/layout.tsx (modified)
<header className="flex items-center justify-between h-12 px-4 border-b border-border">
  <PageHelpLink locale={bellLocale} />   {/* NEW — left-aligned */}
  <NotificationBell ... />               {/* existing — right-aligned */}
</header>
```

Link target convention: `/[locale]/journal/guide/[slug]`. Reuses existing
journal infrastructure — guide content is a journal post with `category=guide`.

Initial guides in scope (G3 task — link mechanism only; guide content
deferred to Phase 2.6.5 if needed):

| Page | helpSlug | Korean label |
|---|---|---|
| `/app/admin/challenges/new` | `challenge-creation` | 챌린지 만들기 가이드 |
| `/app/admin/challenges/[id]` | `challenge-management` | 챌린지 관리 가이드 |
| `/app/projects/new` | `project-setup` | 프로젝트 설정 가이드 |
| `/app/showcases/new` | `showcase-publishing` | 쇼케이스 발행 가이드 |

Pages without `helpSlug` render no link (graceful absence, no fallback to
generic help center).

---

## §2 — Pre-conditions discovered in audit

### PRE-1 (CRITICAL) — `Role` type system collision (must resolve before G2)

**Discovered**: `src/lib/app/context.ts` exports
`Role = "creator" | "workspace_admin" | "workspace_member" | "yagi_admin"`,
where `creator` is sourced from the Phase 1.1 `user_roles` table.

Phase 2.5 G1 introduces `profiles.role IN ('creator','studio','observer')`,
where `creator` is sourced from the new `profiles.role` column. These are
**orthogonal systems** per Phase 2.5 SPEC v2 §1.2 — but they share the
literal string `"creator"`, which guarantees confusion.

**Resolution required before Phase 2.6 G2**:
- Rename Phase 1.1 `creator` role to a clearer name (e.g. `client_creator`
  or `legacy_creator`) — OR
- Add explicit type discrimination: `WorkspaceRole` vs `ProfileRole` types
  that never share the literal `"creator"` — OR
- Document the convention strictly and provide a `useUserScopes()` hook
  that surfaces both as separate fields (`workspaceRoles`, `profileRole`).

**Recommendation**: Option C (type discrimination + hook) — least disruptive
to existing code, most explicit at point of use. Decision logged here as
**ADR-009 candidate** (to be authored at G2 entry).

This is a Phase 2.6 pre-condition because the scope resolver (`getUserScopes`)
must consume both role systems coherently. If the type collision is unresolved,
the resolver code will be ambiguous.

### PRE-2 (HIGH) — Phase 2.4 G1 dependency

The new sidebar tier visual treatment uses Webflow blue accent tokens
(`--accent`, `--accent-soft`) that are introduced in Phase 2.4 G1. If
Phase 2.4 G1 is not yet applied at Phase 2.6 G1 entry, the active state
will fall back to whatever current accent is (currently `bg-accent` from
shadcn baseline — works but not on-brand).

**Recommendation**: Phase 2.6 G1 starts only after Phase 2.4 G1 closeout.
If parallel execution attempted, document temporary token fallback in
G1 commit message.

### PRE-3 (MED) — Reserved Phase 2.5 routes already in `items` array

Phase 1.x sidebar `items` array already contains `disabled: true` entries
for `storyboards`, `brands`, `billing`. Phase 2.5 adds `challenges` parent.
Verify no naming conflict at G1 audit. (No conflict expected — `challenges`
is a distinct lucide-react icon `Trophy` or `Flag`.)

### PRE-4 (MED) — `font-display` already in use

Sidebar workspace switcher uses `className="font-display"`. Phase 2.4 G1
re-binds `--font-display` from current Fraunces to new WF Visual Sans.
Visual diff expected on this single element. Pre-Phase 2.4 G1 visual
baseline screenshot recommended for diff comparison.

---

## §3 — Success criteria (Phase 2.6 closeout requires ALL)

1. Sidebar renders in 3 visually-distinct tiers (Context / Operations /
   System) on all `/[locale]/app/*` routes.
2. Operations tier supports 2-depth indent. The `challenges ▾` parent
   group correctly expands when the current pathname matches any child
   route, and collapses otherwise. Manual toggle via click also works.
3. Scope selector renders at top of Context tier. For users with multiple
   scopes, dropdown lists workspaces, profile (if creator/studio role),
   and admin (if yagi_admin role). Selecting an item navigates correctly.
4. For single-scope users, selector renders as static label (existing
   pattern preserved).
5. Active scope and active operations item are visually marked with
   Webflow blue accent (`--accent` token from Phase 2.4 G1).
6. Contextual help link renders on at least 4 operations-tier pages with
   configured `helpSlug`. Link opens in same tab to journal guide page
   (or 404 gracefully if guide content not yet created).
7. Pages without `helpSlug` render no link (no broken link, no fallback).
8. All sidebar interactions accessible via keyboard:
   - Tab through entire sidebar reaches every interactive element
   - `Enter` activates link / opens dropdown
   - `Arrow Up/Down` navigates within dropdown
   - `Escape` closes dropdown
   - `focus-visible:ring-ring` ring on every interactive element (per
     Phase 2.5 X1 retrofit pattern)
9. No regression in existing app routes — all current navigation paths
   still work (manual smoke test: visit each `items` array entry, confirm
   active state correct).
10. Responsive behavior preserved: at viewport `< 768px`, sidebar collapses
    to drawer (existing pattern via `Sheet` component if present, or new
    pattern). 3-tier structure visible inside drawer.
11. No schema change applied. No new API routes added. UI-only diff
    confirmed by `git diff --stat -- src/app/api src/lib/db
    supabase/migrations` returning empty.
12. No new design tokens introduced. All colors / spacing / typography
    use existing tokens from Phase 2.4 G1 system.

---

## §4 — Gate structure (G1-G4)

### G1 — Type system reconciliation (PRE-1) + sidebar 3-tier refactor
**Duration target:** 4-6h
**Files:** `src/lib/app/context.ts`, `src/lib/app/scopes.ts` (new),
`src/components/app/sidebar.tsx`, `src/components/app/sidebar-nav.tsx`
**Stop point:** post-implementation visual review by 야기 at localhost:3003
(scope selector + 2-depth indent rendered correctly)

Tasks:

1. **Resolve PRE-1**: Author ADR-009 documenting type discrimination
   approach. Implement `getUserScopes(ctx)` resolver in
   `src/lib/app/scopes.ts`. Add explicit `WorkspaceRole` / `ProfileRole`
   types if Option C selected.
2. **Sidebar nav 2-depth refactor**: Modify `items` array structure to
   support nested children. Render parent-as-non-clickable when no `href`.
   Indent children with `pl-6` vs parent `pl-3`. Expand/collapse logic.
3. **Phase 2.5 routes added**: Insert `challenges` parent + 3 children at
   appropriate position in `items` array. Gate by `yagi_admin` role.
4. **Active state token swap**: Confirm `bg-accent` resolves to Phase 2.4
   Webflow blue. If not (Phase 2.4 G1 not applied yet), document
   temporary fallback.
5. **Visual sanity at localhost:3003**: Each app route, confirm sidebar
   renders correctly + active state on correct item.

### G2 — Scope selector
**Duration target:** 3-4h
**Files:** `src/components/app/sidebar-scope-switcher.tsx` (renamed from
workspace-switcher), `src/lib/app/scopes.ts` (extended)
**Stop point:** none (pure UI, no schema, no auth)

Tasks:

1. Rename `SidebarWorkspaceSwitcher` → `SidebarScopeSwitcher`. Update
   import in `Sidebar`.
2. Extend `getUserScopes` to compute all 3 kinds (workspace / profile /
   admin). Profile scope only for `profiles.role IN ('creator','studio')`.
3. Render dropdown items with leading icon per scope kind. Active scope
   in trigger. Single-scope fallback to static label.
4. Wire `router.push(scope.href)` on item click.
5. Keyboard nav: Enter to open, ArrowUp/Down to navigate, Esc to close,
   Enter to select.

### G3 — Contextual help link
**Duration target:** 2-3h
**Files:** `src/components/app/page-help-link.tsx` (new),
4 page.tsx files for `helpSlug` export, `src/app/[locale]/app/layout.tsx`
**Stop point:** none

Tasks:

1. Define metadata convention: `export const helpSlug = '...'` from page.tsx.
2. Build `<PageHelpLink>` server component. Reads pathname → looks up
   helpSlug from a static map (since Next.js doesn't expose page metadata
   to layouts directly — alternative: pass via param or context).
3. **Note**: Server-side metadata access from layout is a Next.js limitation.
   Implementation pattern: maintain a static map
   `pageHelpSlugs.ts` keyed by route pattern, looked up via
   `pathname` matching. Pages don't export `helpSlug` directly — they're
   registered in the static map. Less elegant but works around Next.js
   limitation.
4. Add 4 initial entries to static map per §1 mapping table.
5. Wire `<PageHelpLink>` into `app/layout.tsx` header slot.

### G4 — A11y + responsive sweep + Codex review
**Duration target:** 2-3h
**Files:** sidebar components, layout, test files (if any)
**Stop point:** Codex K-05 review

Tasks:

1. Keyboard nav full pass per §3 #8.
2. Focus-visible ring on every sidebar + scope selector + help link
   interactive element.
3. Screen reader pass: NVDA/VoiceOver reads tier structure correctly
   (use `aria-label="Workspace context"`, `aria-label="Operations"`,
   `aria-label="User account"` per tier).
4. Mobile drawer behavior. If existing `Sheet` pattern exists, reuse.
   Otherwise, defer drawer redesign to Phase 2.7 with explicit note
   in CLOSEOUT.
5. Codex K-05 adversarial review on full Phase 2.6 diff. Target verdict:
   CLEAN or MEDIUM_ONLY.

---

## §5 — Architectural decisions

### ADR-008: No breadcrumbs
**Status:** Accepted (this SPEC)
**Decision**: Phase 2.6 does not introduce breadcrumb navigation.
**Rationale**:
- Sidebar active state already communicates location at top level
- Page H1 communicates current page name
- Deep routes (e.g. `/app/admin/challenges/[slug]/judge`) have only 1-2
  hops from top-level — breadcrumbs add visual noise without information
- Webflow reference shows no breadcrumbs at this depth either
**Future**: If `/app/admin/challenges/[slug]/judge/[submission_id]/comment`
or similar 5-hop routes emerge in Phase 3+, reconsider.

### ADR-009 candidate: Role type system reconciliation
**Status:** Pending (to be finalized at G1 entry)
**Decision pending**: How to disambiguate `creator` between Phase 1.1
`user_roles` and Phase 2.5 `profiles.role`. See PRE-1 above for options.

---

## §6 — Out of scope (explicit deferral)

These items have come up in IA discussions but are **explicitly deferred**:

- Workspace-level admin features (Phase 3+)
- Sidebar customization per user (Phase 3+)
- Search-in-sidebar (Phase 3+)
- Recent items / pinned items in sidebar (Phase 3+)
- Notification badge on sidebar items (Phase 2.7 — depends on Phase 2.5
  notification preferences)
- Mobile-first sidebar redesign with bottom-tab pattern (Phase 2.7)
- Multi-workspace switching for non-admin users (deferred indefinitely)
- Public surface navigation overhaul (`/challenges` listing IA, footer
  links) — this SPEC scope is `/[locale]/app/*` only
- Help center / generic guide search (Phase 3+)

---

## §7 — Reference

- Reference screenshot: `phase-2-6/REFERENCES/d2c-campaign-saas-2026-04-23.png`
  (D2C 협찬 캠페인 SaaS sidebar IA, captured by yagi 2026-04-23)
- Web Claude analysis writeup: chat session 2026-04-23 evening
  ("레퍼런스 IA 분석" section).
- ARCHITECTURE.md §2 directory structure (this phase follows convention).
- Phase 2.5 SPEC v2 §3 G3-G6 (creates new routes that this phase organizes).
- Phase 2.4 ADR-007 (provides Webflow blue accent token for active state).
- Existing `src/components/app/sidebar.tsx` (already 3-tier structurally).
- Existing `src/components/app/sidebar-nav.tsx` (flat list to refactor).
- Existing `src/components/app/sidebar-workspace-switcher.tsx` (basis
  for SidebarScopeSwitcher).
- Existing `src/lib/app/context.ts` (Role type — PRE-1 source of conflict).

---

## §8 — Spec status changelog

- 2026-04-23 — SPEC v1 authored (web Claude). Supersedes 2026-04-23
  skeleton. Key changes from skeleton: PRE-1 type collision discovered,
  scope selector design refined to multi-kind (was workspace-only),
  G1 expanded to include type reconciliation, ADR-008 (no breadcrumbs)
  + ADR-009 candidate added.
- (Future revisions logged here as they happen.)
