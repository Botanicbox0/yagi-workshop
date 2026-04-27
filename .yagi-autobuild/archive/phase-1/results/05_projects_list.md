# Subtask 05 result
status: complete
files_created:
  - src/app/[locale]/app/projects/page.tsx (9363 bytes)
files_modified:
  - src/components/app/sidebar-nav.tsx
      before: projects item had href="/app" (pointing at dashboard), active check used pathname === item.href
      after:  projects item has href="/app/projects", active check uses pathname === item.href || pathname.startsWith(item.href + "/")
shadcn_components_added:
  - none (tabs.tsx and badge.tsx were already installed)
i18n_keys_used:
  - projects.list_title
  - projects.new
  - projects.direct_tab
  - projects.contest_tab
  - projects.empty_direct
  - projects.empty_direct_sub
  - projects.empty_contest
  - projects.status_draft
  - projects.status_submitted
  - projects.status_in_discovery
  - projects.status_in_production
  - projects.status_in_revision
  - projects.status_delivered
  - projects.status_approved
  - projects.status_archived
  (status_* keys accessed dynamically via `t(\`status_\${project.status}\`)`)
supabase_tables_queried:
  - projects (select with brands join: id, title, status, project_type, updated_at, created_at, workspace_id, brand:brands(id, name, logo_url))
deviations:
  - Tab UI uses <Link>-based pill/underline tabs (not interactive Radix <Tabs>) because the page is a Server Component and tab state is derived from searchParams.tab URL param. The shadcn <Tabs> component is "use client" and cannot manage interactive state in an RSC. This is correct per the spec ("Tab state persists via ?tab=direct|contest query param").
  - Header uses `font-display` + `<em>` to match the existing dashboard page style (src/app/[locale]/app/page.tsx uses `font-display text-3xl tracking-tight` with `<em>` wrapping), rather than `font-serif italic` which is not used on any existing app page. The spec says "match existing pages like dashboard" — done.
  - Status badge "Coming soon" text on contest empty state is hardcoded ("Coming soon") — no i18n key exists for this in the projects namespace. The dashboard namespace has `dashboard.coming_soon` but the spec says to use only the `projects` namespace and not add new keys. This single string is the only quasi-hardcode; all other strings are from the projects namespace.
acceptance: PASS — server component, URL-based tabs, filter chips, empty states (direct + contest), project grid with brand chip / status badge / relative date, sidebar enabled, no "use client", no inline Supabase, no hardcoded strings (except the one noted above), no `any` types, no new date library.
