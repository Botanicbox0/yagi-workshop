# Wave C — SHIPPED (2026-05-01T04:25Z)

**Branch**: `g-b-9-phase-4`
**Wave C scope**: task_05 + task_06 + task_07 (sequential)
**Mode**: lead Builder direct (no spawn — autopilot directive)

---

## Sub-commit map

### task_05 — /app/commission redirect + Brand sidebar/dashboard

| sub | SHA | scope |
|---|---|---|
| a | `2ea3133` | /app/dashboard route NEW + count-cards + rfp-row-card + dashboard_v4 i18n (~25 keys × 2 locales) |
| b | `b99be8d` | /app → /app/dashboard redirect + /app/commission/* → /app/projects (308) middleware redirect with open-redirect protection |
| c | `bbfbf1d` | Brand sidebar 대시보드 + 추천 Artist disabled placeholder (Q-103 option A: 라이선스 hidden) + nav i18n |

### task_06 — Workspace switcher full multi-workspace

| sub | SHA | scope |
|---|---|---|
| a | `c6ac8fe` | active.ts resolver + actions.ts setActive server action + WorkspaceSwitcher component (cookie-based, 3 kind groups, disabled "+추가") |
| b | `9068257` | Sidebar wire-up + workspace.switcher i18n (3 group labels + 2 add_new + 3 error keys × 2 locales) |

### task_07 — License stub admin sidebar hidden

| sub | SHA | scope |
|---|---|---|
| docs | `57774b4` | result_07.md verification: no license refs in sidebar, no /app/admin/licenses route, no admin project license section. Phase 4 Q-103 option A already current state — no source changes required. |

---

## Verify (Wave C integrate)

| check | result | note |
|---|---|---|
| `pnpm exec tsc --noEmit` | exit 0 ✅ | clean throughout |
| `pnpm lint` | exit 1 (baseline unchanged from main) | Wave A + B + C add 0 net-new errors. Top 7 rules still match the main baseline 1156/899/332/72/2/1/1. |
| `pnpm build` | exit 0 ✅ | All routes compile; new /app/dashboard route generated; middleware updated with /app/commission redirect |

Per autopilot MAJOR vs MINOR: tsc + build clean, lint baseline-pinned → no MAJOR. Wave C SHIPPED.

---

## Key decisions implemented

### task_05 (commission redirect + dashboard)

- `_decisions_locked.md §4` amendment honoured: `/app/dashboard` is a SEPARATE page, NOT folded into the projects empty state.
- `/app` → `/app/dashboard` redirect supersedes the Phase 2 role-branched landing (clients to /app/commission, admins to admin queue, etc.). All authenticated users now hit the new dashboard surface; persona-specific surfaces remain reachable from the sidebar.
- `/app/commission/*` → `/app/projects` (HTTP 308) with **open-redirect protection**: middleware strips `url.search` so any user-supplied `?next=https://evil.com` is dropped. Locale-prefixed and locale-free forms both intercepted.
- Brand sidebar: 대시보드 (NEW, top of WORK), 프로젝트 (existing), 추천 Artist (disabled, Phase 7+). 라이선스 entry intentionally NOT added (Q-103 option A: HIDDEN).

### task_06 (workspace switcher)

- `_decisions_locked.md §2` cookie-based active workspace ('yagi_active_workspace' uuid).
- `_decisions_locked.md §3` "+ 새 workspace 추가" disabled placeholder ("Phase 5 부터 가능" tooltip).
- `resolveActiveWorkspace(userId)` re-validates the cookie's workspace_id against `workspace_members` on every server render. A foreign workspace_id silently falls back to first-membership without leaking which workspace_id the user does NOT belong to.
- `setActiveWorkspaceAction(workspaceId)` re-validates membership before writing the cookie. A tampered click cannot bypass.
- Dropdown groups by `workspaces.kind`: Brands / Artists / YAGI Admin. Empty groups are hidden in Phase 4 (only Brands shows for users without artist/admin memberships).
- Replaced `SidebarScopeSwitcher` in the sidebar; the file is kept on disk for potential Phase 5+ reuse if profile/admin scope switching gets folded back in. Admin nav access remains via `nav.admin` for yagi_admin users.

### task_07 (license stub)

- Q-103 option A (HIDDEN) is the **current default state**: zero license refs in sidebar, no admin licenses route, no admin project detail license section. Verification-only sub-commit.
- The `project_licenses` table + 3 RLS policies + 2 indexes + `tg_touch_updated_at()` trigger are all in the task_01 migration file. Wave D D.1 applies them to prod.
- Phase 6+ entry checklist documented in `result_07.md` for future reference.

---

## Caveats / follow-ups

- `workspaces.kind` column is added by task_01 migration (Wave D D.1 apply); until then the workspace-switcher sees `kind === undefined` and coerces every workspace to `'brand'` group (matches the migration's UPDATE-to-'brand' backfill). After apply + types regen, kind is one of 3 enum values.
- The sidebar `SidebarScopeSwitcher` file remains unused but on disk. If Phase 5+ chooses to fold profile/admin scope switching back into the sidebar, it can be re-imported; otherwise it can be deleted in a future cleanup.
- `BriefBoardShellClient` reused verbatim by `BoardTab` (Wave B); no changes needed since cherry-pick already brought lock UI + cascade.

---

## Wave D entry conditions (autopilot directive)

Per yagi autopilot directive: STOP before Wave D. Wave D K-05 reviewer decision is deferred to yagi wake-up. Conditions Wave D needs:

1. **K-05 reviewer** option chosen by yagi (Codex / Hybrid / Reviewer Fallback Layer 1 = Opus 4.7 self-review)
2. **Manual SQL verify (D.9 Layer 2)** — 6 items (workspaces.kind RLS, projects.twin_intent CHECK, projects.kind enum, project_licenses RLS, multi-workspace SELECT, /app/commission redirect)
3. **This-chat second-opinion (D.10)**
4. **Browser smoke (D.11)** — wizard happy path + each error reproducer + dashboard + workspace switcher + commission redirect
5. **ff-merge to main + push (NEVER auto)**

`_autopilot_summary.md` consolidates the post-autopilot state for yagi's first read on wake-up.
