# Wave C.5d sub_03e — cascade audit scope

> Codex K-05 sub_03 LOOP 1 surfaced two MED-C findings that the original
> sub_03c grep audit (which only matched `created_at ASC LIMIT 1`) had
> missed. This doc captures the broader audit run for sub_03e and the
> lesson for future reviews.

## Two Codex findings

| # | File | Line | Pattern class | Sub |
|---|---|---|---|---|
| 1 | `src/app/[locale]/app/projects/page.tsx` | 41-56 | RLS-only scope (no `workspace_id` filter on a list query) | sub_03e_1 |
| 2 | `src/lib/app/context.ts` | 95 | `workspaces[0]` array index access (after fetching all memberships) | sub_03e_2 |

## Three additional grep patterns (broader than sub_03c)

| Pattern | Why it matters |
|---|---|
| `.from("projects").select(...)` followed by an `.order(..)` chain with no `.eq("workspace_id", …)` clause anywhere in the same expression | A list query that relies entirely on RLS will return rows from every workspace the caller is a member of, regardless of which one the switcher claims is active. RLS is the safety net, not the scope. |
| `workspaces[0]` / `memberships[0]` / `ctx.workspaces[0]` | Picks the oldest membership; the active-workspace cookie is silently bypassed. |
| `ctx.workspaces.find` / `ctx.workspaces.filter` without an active-workspace anchor | Same risk class as `[0]` — picks an arbitrary workspace from the membership list rather than the one the user has selected. (Not exercised in this codebase today, but logged for the lesson.) |

## Audit results — full project sweep

### `.from("projects")` list queries without `workspace_id` filter

| File | Line | Scope | Action |
|---|---|---|---|
| `src/app/[locale]/app/projects/page.tsx` | 41-56 | regular user (Workshop hub) | **fixed (sub_03e_1)** — added `.eq("workspace_id", activeWorkspaceId)` |
| `src/app/[locale]/app/preprod/page.tsx` | 130-134 | yagi_admin OR yagi-internal member only (gate at line 58-75) | **leave as-is** — intentional cross-workspace admin view |
| `src/app/[locale]/app/preprod/new/page.tsx` | 47-51 | yagi_admin OR yagi-internal member only (gate at line 27-44) | **leave as-is** — intentional cross-workspace admin view |
| `src/app/[locale]/app/invoices/new/page.tsx` | 30-35 | yagi_admin only (gate at line 21-27) | **leave as-is** — intentional cross-workspace admin view |
| `src/lib/share/share-data.ts` | 43 | single-row by id | not a list query |
| `src/lib/invoices/issue-email.ts` | 50 | single-row by id | not a list query |
| every other `.from("projects")` site | — | INSERT / UPDATE / DELETE / single-row SELECT | not a list query |

### `workspaces[0]` / `memberships[0]` accesses

| File | Line | Context | Action |
|---|---|---|---|
| `src/lib/app/context.ts` | 95 (pre-fix) | `currentWorkspaceId` returned from oldest membership | **fixed (sub_03e_2)** — resolved via `resolveActiveWorkspace` |
| `src/app/[locale]/app/layout.tsx` | 101 (pre-fix) | `<SupportWidget workspaceId={ctx.workspaces[0]?.id ?? null}>` | **fixed (sub_03e_3)** — uses `activeWorkspace?.id` already resolved upstream at line 64 |
| `src/lib/workspace/active.ts` | 121 | `return memberships[0]` inside `resolveActiveWorkspace` | **keep** — this is the resolver's intended fallback when the cookie is absent or stale; it is the *only* place the first-membership default should live |
| `src/app/[locale]/app/preprod/new/page.tsx` | 57 | `p.workspaces[0]` against a JOIN result on a project row | not a user-membership access — projects.workspaces is the project's own workspace; leave |
| `src/lib/app/context.ts` | 84 | comment text | not code |

## Indirect cascade (auto-fixed by sub_03e_2)

`fetchAppContext().currentWorkspaceId` consumers automatically pick up
the resolver-driven value once sub_03e_2 lands. Confirmed downstream
sites:

- `src/app/[locale]/app/settings/page.tsx:54` — `const workspaceId = ctx!.currentWorkspaceId` — workspace + team tabs now scope to the active workspace.

## Surfaces still under cookie influence after sub_03e

After all sub_03 commits (a/b/c + e_1/e_2/e_3) the active workspace
authority chain is:

1. **Sidebar switcher** → writes `yagi_active_workspace` cookie.
2. **Layout** (`src/app/[locale]/app/layout.tsx`) → resolves cookie via
   `resolveActiveWorkspace`, passes resolved object to sidebar +
   SupportWidget.
3. **Server context** (`src/lib/app/context.ts`) → resolves cookie via
   `resolveActiveWorkspace`, exposes as `currentWorkspaceId`.
4. **Project surfaces** (`new/page.tsx`, `new-project-wizard.tsx`,
   `submitProjectAction`, `createProject`, `ensureDraftProject`,
   `dashboard/page.tsx`, `projects/page.tsx`) → resolve cookie via
   `resolveActiveWorkspace` directly.

Defense-in-depth: every workspace-scoped INSERT/SELECT goes through RLS
on `workspace_members` membership, so a tampered cookie value can at
worst bounce off the resolver's membership re-check.

## Lesson — Codex K-05 hit rate analysis

| Wave | Findings reported | Builder grep additionally found | Hit rate |
|---|---|---|---|
| sub_03 LOOP 1 (sub_03a/b/c review) | 1 (`submitProjectAction`) | 5 sibling first-membership fallbacks | 1/6 = 17% |
| sub_03e LOOP 1 (after sub_03a/b/c shipped) | 2 (`projects/page.tsx`, `lib/app/context.ts`) | 1 cascade (`layout.tsx`) | 2/3 = 67% |

Codex's hit rate climbs as the obvious patterns close — its first pass
reliably flags the most-traffic surface, but the trailing siblings need
a Builder-driven grep with the patterns enumerated above. Future
audits should run all three pattern classes:

1. `created_at` + `ascending: true` + `limit(1)` against
   `workspace_members`
2. `.from("projects").select(...)` chains with no `workspace_id` filter
3. `workspaces[0]` / `memberships[0]` / `ctx.workspaces[0]` array index
   access outside `src/lib/workspace/active.ts`

before declaring "active workspace authoritative" complete.
