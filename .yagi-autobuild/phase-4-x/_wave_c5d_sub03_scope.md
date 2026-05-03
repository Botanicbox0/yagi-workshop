# Wave C.5d sub_03 — first-membership fallback scope (audit)

> Codex K-05 final review LOOP 1 (Wave D task_D1) flagged ONE surface as
> MED-C: `submitProjectAction` (`src/app/[locale]/app/projects/new/actions.ts:813-821`).
> Builder grep audit found the same `workspace_members ORDER created_at ASC LIMIT 1`
> pattern in **5 additional surfaces**, all of which had identical
> misroute risk. This doc records the exhaustive list so future audits
> have a single artefact + so the lesson is captured for memory.

## 6 surfaces, 4 files (all switched to `resolveActiveWorkspace`)

| # | File | Function / context | Pre-fix line | Sub | Codex caught? |
|---|---|---|---|---|---|
| 1 | `src/app/[locale]/app/projects/new/actions.ts` | `createProject` (legacy direct INSERT) | 84-88 | sub_03c | ❌ |
| 2 | `src/app/[locale]/app/projects/new/actions.ts` | `ensureDraftProject` (wizard draft find-or-create) | 280-284 | sub_03c | ❌ |
| 3 | `src/app/[locale]/app/projects/new/actions.ts` | `submitProjectAction` (wizard submit) | 816-820 | sub_03a | ✅ |
| 4 | `src/app/[locale]/app/projects/new/page.tsx` | New-project page brand list resolution | 27-33 | sub_03b | ❌ |
| 5 | `src/app/[locale]/app/dashboard/page.tsx` | Dashboard active workspace | 73-79 | sub_03c | ❌ |
| 6 | `src/app/[locale]/app/projects/page.tsx` | `primaryWorkspaceId` for `<MeetingRequestCard>` | 75-81 | sub_03c | ❌ |

## Codex hit rate: 1 / 6 (17%)

Codex's review focus was tightly scoped to the workspace-misroute-on-submit
finding the verdict was anchored on. The same fallback pattern appeared
five more times in adjacent code, all introduced through copy-paste during
Phase 2.8 → 4.x. Without an audit grep, the fix would have closed only
the submit path — leaving the dashboard, projects list, brand picker,
legacy `createProject`, and the wizard draft creation all routed to the
oldest membership instead of the user's active selection.

## Helper reuse vs spec rewrite

Spec sub_03 originally asked Builder to author a `getActiveWorkspaceId()`
helper. Audit found `resolveActiveWorkspace(userId)` already existed at
`src/lib/workspace/active.ts` (Phase 4.x task_06) with the exact required
semantics:

- Reads `yagi_active_workspace` cookie
- Validates uuid format
- Re-checks membership against `workspace_members` (cookie-tampering safe)
- Falls back to first membership only on absent / stale / non-member cookie
- Returns `ActiveWorkspaceMembership | null` (null = no memberships at all)

All six surfaces now call `resolveActiveWorkspace(user.id)` directly.
No new helper authored. Spec Step 1 + 2 skipped per yagi confirmation
2026-05-03.

## Surfaces NOT in scope (out-of-pattern false positives)

The audit also surfaced these `workspace_members` queries; none are
first-membership fallbacks for an active workspace:

- `src/lib/app/context.ts` — fetches all memberships (no fallback)
- `src/app/auth/callback/route.ts` — `count: exact, head: true` only
- `src/lib/email/new-message.ts` — workspace member fan-out for email
- `src/lib/workspace/actions.ts` — `(workspaceId, userId)` membership verify
- `src/lib/onboarding/state.ts` — count head only
- `src/lib/team-channels/queries.ts` — RLS membership verify + admin list
- `src/app/[locale]/app/meetings/new/page.tsx` — fetches all memberships, intentional
- `src/app/[locale]/app/team/[slug]/actions.ts` — admin team list
- `src/app/[locale]/app/showcases/page.tsx` + `actions.ts` — admin role checks
- `src/app/[locale]/app/settings/team-panel.tsx` — team list view
- `src/app/[locale]/app/projects/[id]/thread-actions.ts` — thread notification fan-out
- `src/app/[locale]/app/settings/actions.ts` — DELETE membership
- `src/app/[locale]/app/preprod/[id]/actions.ts` + `share-actions.ts` — preprod board notification fan-out
- `src/lib/workspace/active.ts` — the resolver itself (proper fallback)

## Lesson (for memory)

When a Codex review flags an "active workspace misroute" or "first-
membership fallback" finding, run a project-wide grep before treating
the named surface as the only one. The pattern is naturally
copy-pasted across server components and actions whenever a developer
needs "the user's workspace" without thinking about multi-workspace
semantics. A single grep query that combines `workspace_members` +
`created_at` ascending + `limit(1)` catches them all in one pass and
prevents the same misroute from re-emerging from a sibling surface.
