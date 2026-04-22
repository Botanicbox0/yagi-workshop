# Subtask 1-3_10 — Admin Dashboard with Google Health Pill + Meetings Rollup

## status
COMPLETE

## files_created
- `src/app/[locale]/app/admin/page.tsx` — replaced the previous redirect stub with the full dashboard Server Component
- `src/components/admin/google-integration-status.tsx` — new Client Component; fetches `/api/health/google` on mount, renders pill for synced / not_configured / attention_required / loading / error / hidden (403)

## files_modified
- `src/components/app/sidebar-nav.tsx` — changed `adminItems[0].href` from `/app/admin/projects` to `/app/admin`
- `messages/ko.json` — merged new keys into existing `admin` namespace (see below)
- `messages/en.json` — merged new keys into existing `admin` namespace (see below)

## key implementation details

### auth gate in page.tsx
The layout (`src/app/[locale]/app/admin/layout.tsx`) already redirects non-yagi_admin users to `/app`. The page additionally re-checks via direct `user_roles` query and calls `notFound()` for a true 404 response — matching the spec while being double-protected.

### meetings queries
- **Upcoming**: `scheduled_at` BETWEEN now AND now+7d, status NOT IN ('cancelled','completed'), ORDER scheduled_at ASC.
- **Attention**: `calendar_sync_status = 'failed'` OR (`calendar_sync_status = 'fallback_ics'` AND `updated_at <= now-1h`) — implemented via Supabase `.or()` compound filter.
- Both queries JOIN `projects` for title display.

### i18n merge outcome
**`admin` namespace existed before** in both locales with these keys: `title`, `projects_tab`, `workspaces_tab`, `cross_workspace_projects`, `filter_status`, `filter_workspace`, `filter_all`.

**Keys added** (merged, existing keys preserved):
- `google` (nested object): `title`, `synced`, `not_configured`, `attention_required`, `last_checked`
- `upcoming_meetings_title`
- `upcoming_meetings_empty`
- `meetings_needing_attention_title`
- `meetings_needing_attention_empty`
- `retry_sync`
- `meetings_col_title`, `meetings_col_project`, `meetings_col_scheduled_at`, `meetings_col_sync` (table column headers; added to support the table but not in the original spec list — kept for type-safe t() calls)

**Note on `admin.title`**: The spec requires `"관리자 대시보드"` / `"Admin dashboard"`. The prior value was `"YAGI 관리"` / `"YAGI Admin"`. The title was updated per spec. The admin projects page (`/app/admin/projects`) also uses `tAdmin("title")` — it will now show "관리자 대시보드" / "Admin dashboard" instead of the old value. If the Builder prefers separate titles, a `dashboard_title` key can be split out.

### GoogleIntegrationStatus pill states
| API response | Pill |
|---|---|
| `auth_configured: true, token_refresh_ok: true` | Green + `admin.google.synced` |
| `auth_configured: false` | Amber + `admin.google.not_configured` + link to `/docs/google-oauth-setup.md` |
| `auth_configured: true, token_refresh_ok: false` | Red + `admin.google.attention_required` |
| Loading | `<Skeleton>` |
| fetch error | Inline red badge with error message |
| HTTP 401/403 | Hidden (returns null) |

### sidebar-nav active detection
The existing active check uses `pathname.startsWith(item.href + "/")`. With href changed to `/app/admin`, navigating to `/app/admin/projects` will still highlight the admin sidebar link correctly.

## upstream issues discovered
- None. All referenced tables (`meetings`, `projects`, `user_roles`) confirmed present in `database.types.ts`.
- `meetings` table has `calendar_sync_status` as a plain `string` (not enum) — badge rendering uses a switch fallback for unknown values.
- The `retry_sync` column in the attention table is currently a static label (no action wired). Actual retry action would be a separate subtask involving a Server Action.
