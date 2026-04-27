# Phase 1.2 Checkpoint — after Wave E

**Timestamp:** 2026-04-21
**Subtasks completed:** 13 of 14 (01–13)
**Builder context status:** post-summary resume (fresh-window continuation). Wave F (subtask 14) is the final wave.

## Completed summary

| # | Name | Loops | Verdict | Key outputs |
|---|------|-------|---------|-------------|
| 01 | Conventions | 1 | PASS | `/CLAUDE.md`, skill |
| 02 | i18n 6 namespaces | 1 | PASS | +88 keys ko+en |
| 03 | Install deps | 1 | PASS | resend, react-dropzone |
| 04 | OG unfurl + /api/unfurl | 1 | PASS | never-throw, SSRF-guarded |
| 05 | Projects list + sidebar | 1 | PASS | (1 hardcoded "Coming soon" accepted) |
| 06 | New project 3-step | 2 | PASS | brief col rename, tone ghost |
| 07 | Project detail + transitionStatus | 2 | PASS | ALLOWED map duplicated |
| 08 | Reference collector | 1 | PASS | added_by col, no kind col |
| 09 | Thread messaging + Realtime | 2 | PASS | tErrors patch for 2 toast strings |
| 10 | Resend email notifications | 1 | PASS | bilingual template, fire-and-forget |
| 11 | YAGI admin view | 2 | PASS | hardcoded `<th>` strings → JSX comments |
| 12 | Settings pages | 2 | PASS | dedicated `updateAvatarUrl` action |
| 13 | Storage policy review (+ migration) | 1 | PASS (kill-switch consumed) | avatars→private, refs_insert authorized |

## Wave E outputs (new)

### Subtask 11 — admin view
- `src/app/[locale]/app/admin/layout.tsx` (Server Component, redirects non-yagi to `/app`)
- `src/app/[locale]/app/admin/projects/page.tsx` (cross-workspace list, trusts RLS)
- `src/app/[locale]/app/admin/page.tsx` (redirect to `/app/admin/projects`)
- `src/components/app/sidebar-nav.tsx` — `adminItems[0]` enabled

### Subtask 12 — settings pages
- `src/app/[locale]/app/settings/layout.tsx` (tab nav, role-gated)
- `src/app/[locale]/app/settings/page.tsx` (dispatcher, generates signed avatar URL)
- `src/app/[locale]/app/settings/profile-form.tsx`
- `src/app/[locale]/app/settings/workspace-form.tsx`
- `src/app/[locale]/app/settings/team-panel.tsx`
- `src/app/[locale]/app/settings/invite-form.tsx`
- `src/app/[locale]/app/settings/actions.ts` (4 actions + `updateAvatarUrl`)
- `src/components/app/sidebar-nav.tsx` — settings entry enabled

### Subtask 13 — storage policy migration
- `storage_policy_hardening_20260421` applied via Supabase MCP `apply_migration`
- avatars bucket: public=false (was public=true → CRITICAL)
- `refs_insert` policy dropped → `refs_insert_authorized` created (path-prefix + `is_ws_member` / `is_yagi_admin`)

## Schema + pattern notes accumulated (cumulative)

- `projects.brief` (not description); `projects.title` non-null text
- `project_references`: `added_by` (not created_by), NO `kind` column (inferred at runtime)
- `project_threads`: NO `kind` column, `created_by` required
- `thread_messages.author_id` (not sender_id), `body` nullable
- `profiles.locale` used to route bilingual emails
- Storage: `project-references/{projectId}/{uuid}.{ext}` (no bucket prefix)
- Storage: `avatars/{userId}/{uuid}.{ext}`, NOW PRIVATE → must use `createSignedUrl(path, 3600)`
- Channel name: `project:{projectId}:thread`
- Helper signatures: `is_ws_member(uid uuid, wsid uuid)`, `is_yagi_admin(uid uuid)`, `is_ws_admin(uid uuid, wsid uuid)`

## Evaluator loop usage
- Subtasks 06, 07, 09, 11, 12: 2/5 loops
- Others: 1/5
- No halts

## Kill-switches
- ✅ 03 (pnpm add) consumed — msg_id 14
- ✅ 13 (storage migration) consumed — msg_id 17 → "continue" → msg_id 18 ack
- 🛑 Remaining: 14 pre-`pnpm build`, 14 pre-"complete"

## Wave F plan (final)

**14** Haiku 4.5 — E2E runbook + final build + summary
- Write `.yagi-autobuild/phase-1-2-e2e.md` (6-step manual smoke runbook from spec §14)
- 🛑 Telegram kill-switch BEFORE `pnpm build`
- Run `pnpm build` (clean: zero TS errors, zero ESLint warnings)
- Write `.yagi-autobuild/summary.md` (overwrite Phase 1.1 doc — covers all 14 subtasks, loop counts, files touched, deviations)
- 🛑 Telegram kill-switch BEFORE final completion message
- Telegram "✅ YAGI Builder | Phase 1.2 complete."

## Known gaps / deferred (cumulative)

- Caption editing on reference cards (Phase 1.3)
- `"Coming soon"` hardcodes in list page + milestones panel (Phase 1.3+)
- `tone` form field still ghost (no DB column)
- Email digest / retry queue / `/api/notifications/new-message` route — direct call only in Phase 1.2
- Workspace logo upload (bucket `workspace-logos` exists but UI uses `dashboard.coming_soon`)
- Invitation send (table exists; action returns `{ error: "not_implemented" }`)

## Protocol

Kill-switch protocol: Telegram via PowerShell → wait for chat reply → proceed. CC permission prompt is NOT the kill-switch.
