# task_07 — License model schema verify + admin sidebar hidden

**Status**: completed (verification-only, no code changes required)
**Decision lock**: Q-103 option A within B (sidebar HIDDEN)

---

## Scope

Per KICKOFF section task_07 + Q-103 option A within B (yagi 결정):
- `project_licenses` table + RLS exists (task_01 migration)
- License sidebar item HIDDEN in Phase 4 (Phase 6+ enables)
- `/app/admin/projects/[id]` right-rail "라이선스" 섹션 not shown (Phase 6+)
- `/app/admin/licenses` route does not exist (direct URL → 404)

---

## Verification (no changes needed; current state already compliant)

### 1. License sidebar item HIDDEN

```
$ grep -rn "license\|licenses" src/components/app/sidebar-nav.tsx src/components/sidebar/
(no license refs in sidebar)
```

The `recommended_artist` disabled placeholder added in task_05 (c) is the only Phase 5+ slot in the WORK group. License is intentionally absent — neither a disabled link nor a hidden entry. Phase 6+ will add it as a normal entry.

### 2. /app/admin/projects/[id] license section absent

```
$ grep -n "license\|License" src/app/[locale]/app/admin/projects/[id]/page.tsx
(no matches)
```

The admin project detail right-rail does not render any license-related component or query. Adding the section is Phase 6+ scope.

### 3. /app/admin/licenses route does not exist

```
$ ls src/app/[locale]/app/admin/
challenges  commissions  invoices  layout.tsx  page.tsx  projects  support  trash
```

There's no `licenses/` folder. Direct URL access at `/app/admin/licenses` returns the standard Next.js 404 (handled by App Router's not-found.tsx mechanism). No redirect logic needed because there's no legacy `/licenses` route to deprecate.

### 4. project_licenses table + RLS

The schema lands at Wave D D.1 when task_01 migration applies to prod. The migration file is verified at `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql`:
- `CREATE TABLE project_licenses` (13 columns)
- 2 indexes (project_id, status)
- 3 RLS policies: select_admin, select_owner (BLOCKER 1 fixed: `created_by`), write_admin
- `BEFORE UPDATE` trigger via `public.tg_touch_updated_at()`

Policies enforce yagi_admin-only writes; SELECT is yagi_admin OR project owner via `created_by`. Phase 4 client surface = empty (only the schema is shipped).

---

## Acceptance (KICKOFF section task_07)

- [x] `project_licenses` table + RLS verified at the migration file (task_01)
- [x] Admin sidebar `license` item: not added (HIDDEN per Q-103 option A)
- [x] `/app/admin/projects/[id]` license section: not rendered (Phase 6+)
- [x] `/app/admin/licenses` direct access → 404 (no route exists)

No source changes required. Task closed by verification.
