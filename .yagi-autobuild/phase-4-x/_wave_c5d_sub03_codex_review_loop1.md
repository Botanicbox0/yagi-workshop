# Wave C.5d sub_03 — Codex K-05 LOOP 1

- Date: 2026-05-03
- Branch: `g-b-9-phase-4` @ HEAD `7236ba7` (post sub_03a/b/c)
- Base: `main`
- Reviewer: Codex (gpt-5.5, reasoning effort high) via `/codex:adversarial-review`
- Job ID (companion): `bvftw4eks`
- Codex thread: `019dee2b-9c85-7a22-8b37-42c5c2db4746`

## Files reviewed

- `src/lib/workspace/active.ts` (existing helper, unchanged — verify logic)
- `src/app/[locale]/app/projects/new/actions.ts` (sub_03a + sub_03c)
- `src/app/[locale]/app/projects/new/page.tsx` (sub_03b)
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` (sub_03b)
- `src/app/[locale]/app/dashboard/page.tsx` (sub_03c)
- `src/app/[locale]/app/projects/page.tsx` (sub_03c)

## Verdict

**needs-attention** — NO-SHIP. Active workspace is still not authoritative; multi-workspace users can see or operate on the wrong workspace despite the resolver work.

## Findings

### Finding 1 — MED-C: Projects list ignores active workspace

- **Location**: `src/app/[locale]/app/projects/page.tsx:41-66`
- **Detail**: The projects hub builds its query before resolving the active workspace and never adds a `workspace_id` filter. RLS only limits rows to workspaces where the caller is a member, so a user who belongs to multiple workspaces will see projects from all memberships while the sidebar/switcher says one workspace is active. This breaks the core invariant and can silently mix project lists and filters across tenants the user legitimately belongs to.
- **Recommendation**: Move `resolveActiveWorkspace(user.id)` ahead of the projects query and scope every projects/brand lookup on this page with the resolved active workspace id. Redirect/empty-state when absent. Add `.eq("workspace_id", active.id)` to the projects query and related brand/status filter handling.
- **Verified**: Yes — line 41-56 has `.from("projects").select(...).eq("project_type", ...)` with no `workspace_id` filter. `primaryWorkspaceId` (sub_03c fix) only feeds `<MeetingRequestCard>`, not the actual list query.

### Finding 2 — MED-C: App context still exposes first workspace as current

- **Location**: `src/lib/app/context.ts:95`
- **Detail**: `fetchAppContext` returns `currentWorkspaceId` from `workspaces[0]` instead of the active workspace resolver. Downstream `/app/settings` uses `ctx.currentWorkspaceId` for workspace and team tabs, and app layout still passes `ctx.workspaces[0]` to `SupportWidget`. An admin with multiple memberships can edit/view team/support context for the oldest workspace while a different workspace is selected. RLS keeps this within memberships, but the user-visible mutation target is wrong and hard to detect.
- **Recommendation**: Set `currentWorkspaceId` from `resolveActiveWorkspace(user.id)`, and update consumers such as settings and `SupportWidget` to use that resolved id rather than `workspaces[0]`. Also ensure `workspace_admin` gating is evaluated for the active workspace.
- **Verified**: Yes — line 95 has `currentWorkspaceId: workspaces[0]?.id ?? null` with no resolver call.

## Why the audit missed these

The grep audit was scoped specifically to the `workspace_members ORDER created_at ASC LIMIT 1` pattern that Codex flagged in the original Wave D LOOP 1 finding. Both new findings are structurally different:

- Finding 1 has **no workspace filter at all** — not a "first-membership fallback", a "no-scope query that relies entirely on RLS"
- Finding 2 takes the first element of an already-fetched membership list — not a query pattern, an array access pattern

A more conservative future audit should grep for:
1. `from("projects").select(...)` without an `.eq("workspace_id", ...)` clause within the same chain
2. `workspaces[0]` / `memberships[0]` array access in any non-resolver code path

Both are added as future grep patterns in the lesson capture.

## Triage decision

| Finding | Category | Auto-fixable? | Action per CODEX_TRIAGE.md |
|---|---|---|---|
| 1 Projects list no scope | MED-C | No (structural — needs resolver placement + filter wiring + empty-state) | STOP + escalate |
| 2 App context first workspace | MED-C | No (structural — affects settings + SupportWidget + layout) | STOP + escalate |

Per CODEX_TRIAGE.md and CLAUDE.md DB write protocol §3:
> **Any HIGH-B, HIGH-C, MED-C, LOW-C** (non-auto) | STOP + Telegram yagi with finding + proposed fix.

LOOP 2/3 not run — both findings are non-auto-fixable per taxonomy.

## Result

**sub_03 HALT at LOOP 1.** sub_03a/b/c commits stand (they fix 6 surfaces correctly), but two more MED-C surfaces remain that the resolver hasn't been wired into:

- `src/app/[locale]/app/projects/page.tsx` projects list query needs `.eq("workspace_id", active.id)` filter
- `src/lib/app/context.ts` `fetchAppContext` should source `currentWorkspaceId` from `resolveActiveWorkspace(user.id)` instead of `workspaces[0]`
- Cascade audit: `/app/settings`, `<SupportWidget>`, `app/layout.tsx`, anywhere else `ctx.currentWorkspaceId` or `ctx.workspaces[0]` is consumed must be re-checked for misroute

Decision needed (yagi):
- **A**: Extend Wave C.5d with sub_03e (or fold into sub_03c) — fix the 2 surfaces, re-run K-05 LOOP 1, then sub_04 verify + STOP. Cleanest path because all changes ship as one Wave.
- **B**: Promote to Wave C.5e — separate wave, separate review cycle. More overhead.
- **C**: Defer with documented known-issue. Tenant misroute risk persists.
