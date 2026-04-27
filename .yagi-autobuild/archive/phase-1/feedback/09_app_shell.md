---
id: 09
name: App shell (sidebar + dashboard)
verdict: PASS
evaluated_at: 2026-04-21
evaluator: sub-agent (fresh context)
---

# Subtask 09 — Evaluation

## Verdict: PASS

## Checks performed

| # | Check | Result |
|---|---|---|
| 1 | All 8 files exist at specified paths | PASS |
| 2 | `context.ts` exports `fetchAppContext` and types `AppContext`, `Role` | PASS |
| 3 | `signout-action.ts` starts with `"use server"`, imports `redirect` from `next/navigation`, calls `supabase.auth.signOut()` then `redirect("/")` | PASS |
| 4 | `(app)/layout.tsx` redirects to `/signin` if no user, to `/onboarding` if no profile (no context) | PASS |
| 5 | `sidebar-nav.tsx` has `disabled: true` on storyboards, brands, team, billing, settings, and admin items | PASS |
| 6 | `sidebar-user-menu.tsx` uses `<form action={signOutAction}>` pattern | PASS |
| 7 | `page.tsx` has three branches: yagi_admin, creator, client | PASS |
| 8 | `npx tsc --noEmit` exits 0 (re-run by evaluator) | PASS |
| 9 | Deviation (`return null;` after redirect in layout) is correctly implemented | PASS |

## Detailed verification

- **File inventory** — All 8 files read successfully at the required paths:
  - `src/lib/app/context.ts`
  - `src/lib/app/signout-action.ts`
  - `src/app/[locale]/(app)/layout.tsx`
  - `src/app/[locale]/(app)/page.tsx`
  - `src/components/app/sidebar.tsx`
  - `src/components/app/sidebar-workspace-switcher.tsx`
  - `src/components/app/sidebar-nav.tsx`
  - `src/components/app/sidebar-user-menu.tsx`
- **`context.ts` exports** — Line 3 `export type Role`, line 5 `export type AppContext`, line 19 `export async function fetchAppContext(): Promise<AppContext | null>`. All three present.
- **`signout-action.ts`** — Line 1 `"use server";`, line 4 `import { redirect } from "next/navigation";`, line 8 `await supabase.auth.signOut();`, line 9 `redirect("/");`. Matches spec exactly.
- **Layout redirects** — Line 19: `if (!user) redirect({ href: "/signin", locale });`. Lines 22–25: `if (!ctx) { redirect({ href: "/onboarding", locale }); return null; }`. Both guards use `@/i18n/routing`'s locale-aware `redirect`.
- **Disabled nav flags** — `src/components/app/sidebar-nav.tsx` lines 28 (storyboards), 29 (brands), 30 (team), 31 (billing), 32 (settings), and 36 (admin) all carry `disabled: true`. Projects (line 27) is correctly left enabled as the only active nav entry in Phase 1.1.
- **Sign-out form pattern** — `src/components/app/sidebar-user-menu.tsx` line 49 `<form action={signOutAction}>` wrapping a submit button, exactly as spec prescribed.
- **Dashboard role branches** — `src/app/[locale]/(app)/page.tsx`: line 13 `if (isYagiAdmin)`, line 28 `if (isCreator)`, line 44 falls through to the client (workspace_admin / workspace_member) view.
- **tsc** — independent `npx tsc --noEmit` run produced no output and exited with code 0.

## Deviation reviewed

1. **Added `return null;` after `redirect({ href: "/onboarding", locale });` in `(app)/layout.tsx`.** The `redirect` helper produced by next-intl's `createNavigation()` in `@/i18n/routing` is not typed as `never`, so TypeScript cannot narrow `ctx` from `AppContext | null` to `AppContext` on the fall-through. Without the explicit `return null;`, `<Sidebar context={ctx} />` fails type-checking (TS2322: `null` is not assignable to `AppContext`). At runtime, `redirect()` has already thrown the Next.js redirect signal, so `return null;` is unreachable and semantics are unchanged. This is a minimal, acceptable fix — fully consistent with the evaluator directive permitting this workaround.

## No regressions

No files outside the 8 listed in the spec were touched. `npx tsc --noEmit` is clean across the whole project.
