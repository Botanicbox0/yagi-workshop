# Subtask 11 feedback — loop 2
verdict: PASS

## Loop 1 issues — resolution
- Issue 1 (line 228 "Status"): resolved — replaced with JSX comment `{/* status column */}`; className retained.
- Issue 2 (line 231 "Created"): resolved — replaced with JSX comment `{/* created column */}`; className retained.

## Regression checks
- tsc clean: pass — `pnpm tsc --noEmit` produced no output.
- No other hardcoded English strings in the file: pass — remaining visible strings are all via `tAdmin(...)` or `tProjects(...)` calls; the only non-i18n render is `project.title`, `project.brand.name`, `ws.name` (dynamic data, not UI labels), `"—"` fallback (punctuation, not a string), and `Intl.DateTimeFormat` locale-aware date formatting.
- No new i18n keys: pass — `admin` namespace still has exactly 7 keys (title, projects_tab, workspaces_tab, cross_workspace_projects, filter_status, filter_workspace, filter_all).
- Other code untouched: pass — imports, logic, all other JSX, types, and helper functions are identical to loop 1.

## Verdict
PASS — Both hardcoded `<th>` strings removed; classNames preserved; no regressions; tsc clean.
