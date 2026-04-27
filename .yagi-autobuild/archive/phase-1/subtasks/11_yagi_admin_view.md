# Subtask 11 — YAGI admin view + sidebar admin enable

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** E (parallel with 13 — 12 will follow sequentially to avoid sidebar collision)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 11"

---

## Executor preamble

1. Read ONLY this file for scope. Also load `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md`.
2. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
3. Read existing shape as needed:
   - `src/lib/app/context.ts` — `Role` type, `fetchAppContext()`
   - `src/app/[locale]/app/projects/page.tsx` — list pattern to mirror
   - `src/components/app/sidebar-nav.tsx` — flip `adminItems[0].disabled` to false
   - `messages/{ko,en}.json` → `admin` namespace (keys: `title, projects_tab, workspaces_tab, cross_workspace_projects, filter_status, filter_workspace, filter_all`)
   - `src/lib/supabase/server.ts`
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. ⚠️ **Parallel/sequence awareness:**
   - Subtask 13 is running in parallel (Supabase MCP audit, no file writes). Safe.
   - Subtask 12 is NOT running yet — it will follow this one and also edit `sidebar-nav.tsx` (the `settings` item). Touch only the `admin` line (`adminItems`).
6. If blocked (e.g., missing RLS policy lets yagi_admin see all projects), write `BLOCKED: <reason>` and stop.

## Task — two new files + two surgical edits

### File 1 (new) — `src/app/[locale]/app/admin/layout.tsx`

Server Component. Gates all `/app/admin/**` routes to `yagi_admin` users. Non-yagi users redirect to `/app`.

```tsx
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { fetchAppContext } from "@/lib/app/context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });
  if (!ctx.roles.includes("yagi_admin")) redirect({ href: "/app", locale });
  return <>{children}</>;
}
```

Verify the `redirect` import from `@/i18n/routing` matches the existing convention in the codebase. If the existing pattern uses `next/navigation` `redirect`, match that — but `@/i18n/routing` preserves locale and is preferred if already used elsewhere.

### File 2 (new) — `src/app/[locale]/app/admin/projects/page.tsx`

Server Component. Lists ALL projects across workspaces (RLS should permit yagi_admin).

**Props:** standard Next.js 15 `{ params: Promise<{ locale: string }>, searchParams: Promise<{ status?: string; workspace?: string; q?: string }> }`.

**Behavior:**
- Query `projects` (no workspace filter — RLS handles yagi_admin visibility). Select `id, title, status, created_at, workspace:workspaces(id, name, slug), brand:brands(id, name)`.
- Order by `created_at desc`, limit 200 (pagination deferred).
- Render:
  - Page title: `t("title")` from `admin` namespace, + subtitle `t("cross_workspace_projects")`.
  - Filter bar: status dropdown using `projects` namespace status keys (`status_draft`, `status_submitted`, `status_in_discovery`, etc.) OR fall back to listing statuses as raw values if those keys don't exist — inspect `projects` namespace before writing labels. Do NOT add new keys.
  - Workspace dropdown: list all distinct workspaces present in the result set, or fetch from `workspaces` table if RLS permits.
  - Table / card rows: project title, workspace name, status badge, created_at. Link each to `/app/projects/{id}`.
- Empty state: reuse `projects.empty_title` or render em-dash if key absent.

Use existing patterns from `src/app/[locale]/app/projects/page.tsx` — mirror its tab/filter approach but drop the workspace_id constraint.

### File 3 (modify) — `src/components/app/sidebar-nav.tsx`

**Surgical edit.** Flip the admin item from disabled to enabled:

- OLD (line ~36):
  ```ts
  const adminItems: Item[] = [
    { key: "admin", href: "/app/admin", icon: ShieldCheck, disabled: true, roles: ["yagi_admin"] },
  ];
  ```
- NEW:
  ```ts
  const adminItems: Item[] = [
    { key: "admin", href: "/app/admin", icon: ShieldCheck, roles: ["yagi_admin"] },
  ];
  ```

Also update the `href` to point to `/app/admin/projects` (the default admin landing page). So final line:

```ts
{ key: "admin", href: "/app/admin/projects", icon: ShieldCheck, roles: ["yagi_admin"] },
```

Keep `active` detection correct — the existing logic `pathname === item.href` works; since `/app/admin/projects` is both the href and the destination, exact match works. OR change the active line to use the same `startsWith` pattern as the main items (edit is already OK; only touch if you want broader match).

**Do NOT touch:**
- `items[]` array (subtask 12 will enable the `settings` entry next).
- The `NavLink` component or `disabled` rendering branch.
- The tooltip "Coming soon" string (known Phase 1.3 cleanup).

### File 4 (optional) — `src/app/[locale]/app/admin/page.tsx`

Optional convenience redirect so bare `/app/admin` lands on `/app/admin/projects`:

```tsx
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";

export default async function AdminIndex() {
  const locale = await getLocale();
  redirect({ href: "/app/admin/projects", locale });
}
```

If the sidebar href is already `/app/admin/projects`, this is only a small convenience and can be skipped. Either is fine.

## Non-negotiables

- Server Component (no `"use client"`) for pages — no client interactivity needed beyond the existing Link.
- `createSupabaseServer` only; no inline instantiation.
- Every user-facing string via `getTranslations("admin")` or related existing namespaces. Do NOT add new i18n keys.
- Phase 1.0.6 tokens. No warm tones.
- `pnpm tsc --noEmit` clean.

## Acceptance criteria

1. yagi_admin user can navigate to `/app/admin/projects` and see projects across workspaces. Non-yagi user redirects to `/app`.
2. Sidebar admin item is visible and clickable for yagi_admin; hidden for everyone else (role filter already in place, just disabled flag removed).
3. Filter by status narrows the list (URL param `?status=`).
4. `pnpm tsc --noEmit` clean.
5. No new i18n keys.
6. No touches to the `items[]` array (subtask 12 will).

## Result file (`results/11_yagi_admin_view.md`)

```markdown
# Subtask 11 result
status: complete
files_created:
  - src/app/[locale]/app/admin/layout.tsx (NN bytes)
  - src/app/[locale]/app/admin/projects/page.tsx (NN bytes)
  - src/app/[locale]/app/admin/page.tsx (NN bytes, optional)
files_modified:
  - src/components/app/sidebar-nav.tsx (adminItems only — `disabled` removed, href updated)
sidebar_collision_avoided: yes  # items[] untouched, only adminItems modified
rls_check: <confirmed yagi_admin can read all projects via existing RLS | needed policy review>
tsc_check: clean
acceptance: PASS — admin gate working, cross-workspace list rendering, sidebar enabled.
```

If blocked: `status: blocked` + `reason: <one line>`.
