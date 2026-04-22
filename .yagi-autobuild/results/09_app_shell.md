---
id: 09
name: App shell (sidebar + dashboard)
status: complete
executed_at: 2026-04-21
---

# Subtask 09 — Result

## Files created

- `src/lib/app/context.ts`
- `src/lib/app/signout-action.ts`
- `src/app/[locale]/(app)/layout.tsx`
- `src/app/[locale]/(app)/page.tsx`
- `src/components/app/sidebar.tsx`
- `src/components/app/sidebar-workspace-switcher.tsx`
- `src/components/app/sidebar-nav.tsx`
- `src/components/app/sidebar-user-menu.tsx`

## Commands run

### `npx tsc --noEmit` (first run)

```
src/app/[locale]/(app)/layout.tsx(26,16): error TS2322: Type 'AppContext | null' is not assignable to type 'AppContext'.
  Type 'null' is not assignable to type 'AppContext'.
```

### `npx tsc --noEmit` (after fix)

```
(no output — exit code 0, type check passed)
```

## Acceptance criteria

- [x] All 8 files created at the specified paths
- [x] `npx tsc --noEmit` passes with zero errors
- [x] `(app)/layout.tsx` redirects to `/signin` if no user, `/onboarding` if no profile
- [x] Dashboard page renders different content for yagi_admin vs creator vs client roles
- [x] Sidebar shows workspace name (Fraunces italic) at top
- [x] Sidebar nav filters by role: workspace_admin sees Projects/Storyboards/Brands/Team/Billing/Settings; creator sees none (empty); yagi_admin additionally sees Admin section
- [x] Sign out form submits to `signOutAction` server action which calls `supabase.auth.signOut()` and redirects to `/`
- [x] No other files touched

## Verification notes

- Confirmed all required lucide-react named icon exports (`FolderKanban`,
  `Clapperboard`, `Store`, `Users`, `Receipt`, `Settings`, `ShieldCheck`,
  `ChevronsUpDown`, `LogOut`) exist in the installed
  `node_modules/lucide-react/dist/lucide-react.d.ts`.
- `fetchAppContext` follows the spec verbatim, including the Supabase
  nested-select `workspaces(id, name, slug)` — the filter predicate narrows
  the `workspaces` relation shape to a single object, discarding the
  null-relation rows. This compiles cleanly against the generated
  `Database` types.
- The `redirect` from `@/i18n/routing` (next-intl v4 `createNavigation`)
  is used in `(app)/layout.tsx`; the `redirect` from `next/navigation` is
  used in `signout-action.ts` to return to `/` (the locale-picker landing
  page), matching the spec's explicit guidance.
- Server action import path `@/lib/app/signout-action` correctly includes
  `"use server"` at the top of the module so the client component
  `sidebar-user-menu.tsx` can pass it directly to `<form action={...}>`.

## Deviations

1. **`(app)/layout.tsx` — added `return null;` after the
   `redirect({ href: "/onboarding", locale })` call.** TypeScript could not
   narrow `ctx` from `AppContext | null` to `AppContext` after the
   `if (!ctx) redirect(...)` line because the next-intl `redirect` returned
   by `createNavigation()` is not typed as `never` (unlike
   `next/navigation`'s `redirect`, which is `never`). Without narrowing,
   `<Sidebar context={ctx} />` failed with TS2322 (`null` not assignable
   to `AppContext`). Adding an explicit `return null;` in the guard block
   tells TS the function exits, while at runtime the prior `redirect()`
   call has already thrown the Next.js redirect signal — so `return null`
   is unreachable and semantics are unchanged. Minimal, import-path-style
   fix as permitted by the executor directive.
