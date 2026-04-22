# Subtask 05 — Projects list page + sidebar nav enable

**status:** pending
**assigned_to:** executor_sonnet_46
**created:** 2026-04-21
**parallel_group:** C (serial — 05 → 06 → 07)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 05"

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file for task scope. Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. Before coding, load project conventions:
   - `/CLAUDE.md`
   - `.claude/skills/yagi-nextjs-conventions/SKILL.md`
3. To understand existing shape (required), also read:
   - `src/lib/supabase/server.ts` — Supabase server client
   - `src/lib/supabase/database.types.ts` — DB type surface; find `projects`, `brands`, `workspaces`, `workspace_members` row types
   - `src/components/app/sidebar-nav.tsx` — sidebar you must edit
   - `src/app/[locale]/app/layout.tsx` — for `fetchAppContext` shape and role helpers
   - `src/i18n/routing.ts` — for `Link` / `redirect` from `@/i18n/routing`
   - `messages/ko.json` — specifically the `projects` and `nav` namespaces (so you use existing keys, not invent new ones)
   - `src/components/ui/badge.tsx`, `src/components/ui/button.tsx`, `src/components/ui/tabs.tsx` (check whether installed; if not, use `pnpm dlx shadcn@2.1.8 add tabs` — NEVER @latest)
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. If anything blocks you (missing i18n key, missing shadcn component, ambiguous RLS behavior, DB type mismatch), write `BLOCKED: <reason + file:line>` to `results/05_projects_list.md` and stop.
6. When done, write `.yagi-autobuild/results/05_projects_list.md`.

## Task scope — two files + one tweak

### File 1 (new) — `src/app/[locale]/app/projects/page.tsx`

**Server Component** (no `"use client"` at top). Render the projects list for the current user.

#### Required behavior

1. **Auth + context** — reuse the project's existing `fetchAppContext()` helper (same one `app/layout.tsx` uses). The layout has already ensured the user is authenticated and has at least one workspace (or is a global privileged role). Do NOT re-implement auth checks here; trust the layout guard.

2. **Async params** (Next.js 15):
   ```ts
   type Props = {
     params: Promise<{ locale: string }>;
     searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
   };
   export default async function ProjectsPage({ params, searchParams }: Props) {
     const { locale } = await params;
     const sp = await searchParams;
     ...
   }
   ```

3. **Tabs** — Direct / Contest. Use the shadcn `<Tabs>` primitive if present at `src/components/ui/tabs.tsx`; otherwise render as two buttons styled with pill/underline per Phase 1.0.6 tokens. Tab state persists via `?tab=direct|contest` query param (default: `direct`).

4. **Fetch projects** — via the server Supabase client:
   ```ts
   const supabase = await createSupabaseServer();
   let query = supabase
     .from("projects")
     .select(`
       id,
       title,
       status,
       project_type,
       updated_at,
       created_at,
       brand:brands(id, name, logo_url),
       workspace_id
     `)
     .eq("project_type", tab === "contest" ? "contest" : "direct_commission")
     .order("updated_at", { ascending: false });

   if (sp.status) query = query.eq("status", sp.status);
   if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);

   const { data: projects, error } = await query;
   ```
   Trust RLS — do NOT manually filter by `workspace_id`. The RLS policies on `projects` already scope visibility.

   If `error`, log it server-side via `console.error` and render the empty state (do not crash the page).

5. **Empty states** (Phase 1.0.6 aesthetic — white bg, black text, no warm tones):
   - Direct tab, no results: center-aligned card with title `t("projects.empty_direct")` + sub `t("projects.empty_direct_sub")` + a `<Link>` "New project" pill CTA (uses `projects.new` key; styled `rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background`).
   - Contest tab (always): center-aligned `t("projects.empty_contest")` and a muted "Coming soon" line. No CTA.

6. **List rendering (Direct tab with data)** — a responsive grid or table. Recommended: 1-column `<div>` list on mobile, 2-column on `md:`, 3-column on `xl:`. Each card displays:
   - Title (truncate 2 lines)
   - Brand logo chip + brand name (or em-dash if null)
   - Status badge — colored per status. Use the same semantic tokens as design system:
     - `draft`: muted grey
     - `submitted`: blue
     - `in_discovery` / `in_production` / `in_revision`: black bg white text (active)
     - `delivered` / `approved`: green accent
     - `archived`: faded
     Render with the `<Badge>` component if it accepts a `variant`, otherwise a `<span>` with `rounded-full px-2.5 py-0.5 text-xs` styled inline. Label uses `projects.status_{status}` i18n key.
   - Last activity: relative time from `updated_at` (e.g., `날짜 짧은` formatter — if `next-intl`'s `format.relativeTime` is already used elsewhere, use that; otherwise `new Intl.DateTimeFormat(locale).format(new Date(updated_at))`). Do not pull in a new date library.
   - Whole card is a `<Link>` from `@/i18n/routing` to `/app/projects/{id}`.

7. **Filter pills** (simple, above the grid) — if `status` query param set, show a removable chip `Status: {t("projects.status_" + status)}  ×` that links back to the page without that param. Same for `brand_id` (resolve brand name by fetching brand row, or by joining — simplest: reuse the brand data from within the project rows; if no projects match, hide the chip).

8. **Header** — `<h1>` with `t("projects.list_title")` (font-serif italic if the design token calls for it — match existing pages like dashboard). Right side: a pill CTA `<Link>` button labeled `t("projects.new")` → `/app/projects/new`. Use the pill style: `rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90`.

9. **i18n** — use `getTranslations("projects")` from `next-intl/server`. Every user-facing string must come from the `projects` namespace (keys already exist — do NOT add new ones).

### File 2 (modify) — `src/components/app/sidebar-nav.tsx`

Find the existing `Projects` nav item. It is currently disabled (likely `disabled: true` or a `coming_soon` flag). Enable it:

- Set `href: "/app/projects"` (or just remove the disabled flag so the existing entry becomes clickable).
- Ensure the active state highlights when the current pathname starts with `/app/projects`.
- Do NOT change the order, icon, label key, role-filter, or any other sibling nav items.
- Do NOT enable Meetings / Storyboards / Invoicing — those remain disabled (Phase 1.3+).

If the current sidebar-nav structure does not expose a straightforward `disabled` flag, read the file carefully and apply the minimum change to make Projects clickable while preserving the existing role filter.

### File 3 (tweak) — NONE

Do not add any other files. Do not create a `projects` route group. Do not edit `app/layout.tsx`.

## Non-negotiables (from CLAUDE.md + yagi-nextjs-conventions)

- Server Component by default. No `"use client"` needed anywhere in this subtask.
- Supabase access ONLY through `@/lib/supabase/server`. No inline `createClient`.
- Every user-facing string via `getTranslations("projects")` — no hardcoded English/Korean.
- Route path: `/[locale]/app/projects/*` (literal `app/` folder, NOT `(app)` group).
- Tailwind tokens only: `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`. NO warm tones (no cognac, no bone, no amber). White/black only.
- Pill CTAs: `rounded-full uppercase tracking-[0.12em]`.
- Fraunces italic reserved for header emphasis via `font-serif italic` — match the dashboard/home header style rather than inventing.
- Korean wrapping: add `keep-all` utility (or equivalent word-break class present in the project's Tailwind config) to titles and long descriptions that render in Korean.
- If you need a new shadcn component (e.g., `tabs`), install with `pnpm dlx shadcn@2.1.8 add tabs` — **NEVER @latest**. If you install, note it in the result.

## Anti-patterns to reject

- `"use client"` on this page — it's a list page, no state.
- Fetching DB from a Client Component.
- Inline `createClient(...)`.
- Hardcoded strings like `"New project"` or `"초안"`.
- `any` types — if the Supabase query type isn't inferring cleanly (common for joined selects), declare a local `type Row = {...}` that matches the `.select()` fields.
- Adding a new date-fns/dayjs dependency — use `Intl.DateTimeFormat` or next-intl's `format` helper.
- Adding warm-tone colors for status badges (no cognac, no bone). Only monochrome + muted + a single accent if the design system defines one.

## Acceptance criteria

1. `src/app/[locale]/app/projects/page.tsx` exists, is a Server Component, uses async params + searchParams, uses `createSupabaseServer`, renders tabs, empty states, and a grid/list of projects.
2. `src/components/app/sidebar-nav.tsx` now has the Projects nav item enabled and linking to `/app/projects`.
3. All user-facing strings come from the `projects` namespace (or `nav` for sidebar label — whichever exists).
4. No other files created. No new dependencies added (beyond a conditional `shadcn@2.1.8 add tabs` if needed). No inline Supabase clients. No hardcoded strings. No `any` types.
5. Empty state renders correctly for a fresh user with zero projects (this is the dominant case right now — the yagi user has no projects yet).

## Result file format (`results/05_projects_list.md`)

```markdown
# Subtask 05 result
status: complete
files_created:
  - src/app/[locale]/app/projects/page.tsx (NN bytes)
files_modified:
  - src/components/app/sidebar-nav.tsx (before: <summary>, after: <summary>)
shadcn_components_added:
  - tabs (via `pnpm dlx shadcn@2.1.8 add tabs`)   # or "none" if already present
i18n_keys_used:
  - projects.list_title, projects.new, projects.direct_tab, projects.contest_tab,
    projects.empty_direct, projects.empty_direct_sub, projects.empty_contest,
    projects.status_*   (list the ones referenced)
supabase_tables_queried:
  - projects (select with brands join)
acceptance: PASS — server component, tabs, filters, empty state, sidebar enabled. No forbidden patterns.
```

If blocked: `status: blocked` + `reason: <one line>`.
