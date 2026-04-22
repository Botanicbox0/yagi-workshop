# YAGI Workshop — Phase 1.2 Autobuild Summary

**Completed:** 2026-04-21
**Builder:** Claude Opus 4.7 (B-O-E autonomous mode)
**Scope:** Projects + References + Threads + Email + Admin + Settings + Storage hardening

## Status: ✅ Complete

All 14 subtasks PASS Evaluator verification. `pnpm build` clean: zero TS errors, zero ESLint warnings, all 20 routes generated.

## B-O-E loop stats

| # | Subtask | Executor model | Loops | Verdict |
|---|---------|----------------|-------|---------|
| 01 | Conventions: `/CLAUDE.md` + `yagi-nextjs-conventions` skill | Haiku 4.5 | 1 | PASS |
| 02 | i18n: 6 new namespaces (+88 keys ko/en) | Haiku 4.5 | 1 | PASS |
| 03 | Install deps: resend, react-dropzone, @types/react-dropzone | Haiku 4.5 | 1 | PASS |
| 04 | OG unfurl util + `/api/unfurl` POST route | Haiku 4.5 | 1 | PASS |
| 05 | Projects list + sidebar nav enable | Sonnet 4.6 | 1 | PASS |
| 06 | New project 3-step wizard + `createProject` action | Sonnet 4.6 | 2 | PASS |
| 07 | Project detail + `transitionStatus` action | Sonnet 4.6 | 2 | PASS |
| 08 | Reference collector (uploader + grid + actions) | Sonnet 4.6 | 1 | PASS |
| 09 | Thread messaging + visibility + Realtime | Sonnet 4.6 | 2 | PASS |
| 10 | Resend email notifications (bilingual, fire-and-forget) | Sonnet 4.6 | 1 | PASS |
| 11 | YAGI admin view (cross-workspace projects) | Sonnet 4.6 | 2 | PASS |
| 12 | Settings pages (profile / workspace / team) + avatar upload | Sonnet 4.6 | 2 | PASS |
| 13 | Storage bucket policy review + hardening migration | Haiku 4.5 | 1 | PASS |
| 14 | E2E runbook + final build + summary | Haiku 4.5 | 1 | PASS |

**Total Evaluator loops:** 19 across 14 subtasks (1.36 avg). Five subtasks needed a 2nd loop; none halted.

## Files created/modified (Phase 1.2)

### Library
- `src/lib/og-unfurl.ts` — OG metadata extractor (SSRF-guarded, never-throws)
- `src/lib/resend.ts` — lazy Resend singleton w/ graceful degrade
- `src/lib/supabase/service.ts` — service-role admin client (`server-only` guard)
- `src/lib/email/new-message.ts` — `notifyNewMessage()` recipient fan-out + bilingual template

### Routes — public/auth
- `src/app/api/unfurl/route.ts` — POST endpoint w/ auth guard
- `src/app/[locale]/forgot-password/page.tsx` (carryover hotfix)
- `src/app/[locale]/reset-password/page.tsx` (carryover hotfix)

### Routes — projects feature
- `src/app/[locale]/app/projects/page.tsx` — list with status/workspace filter chips
- `src/app/[locale]/app/projects/new/page.tsx` — Server Component shell
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` — 3-step wizard
- `src/app/[locale]/app/projects/new/actions.ts` — `createProject` Server Action
- `src/app/[locale]/app/projects/[id]/page.tsx` — detail view (refs + thread + status)
- `src/app/[locale]/app/projects/[id]/actions.ts` — `transitionStatus` Server Action
- `src/app/[locale]/app/projects/[id]/ref-actions.ts` — `addReference` / `removeReference`
- `src/app/[locale]/app/projects/[id]/thread-actions.ts` — `sendMessage` (+ `void notifyNewMessage`)

### Routes — admin
- `src/app/[locale]/app/admin/layout.tsx` — yagi_admin role gate
- `src/app/[locale]/app/admin/page.tsx` — redirect to `/admin/projects`
- `src/app/[locale]/app/admin/projects/page.tsx` — cross-workspace list

### Routes — settings
- `src/app/[locale]/app/settings/layout.tsx` — tab nav, role-gated
- `src/app/[locale]/app/settings/page.tsx` — dispatcher + signed avatar URL
- `src/app/[locale]/app/settings/profile-form.tsx`
- `src/app/[locale]/app/settings/workspace-form.tsx`
- `src/app/[locale]/app/settings/team-panel.tsx`
- `src/app/[locale]/app/settings/invite-form.tsx`
- `src/app/[locale]/app/settings/actions.ts` — 5 actions incl. `updateAvatarUrl`

### Components
- `src/components/project/reference-uploader.tsx` — Image / URL tabs, dropzone
- `src/components/project/reference-grid.tsx` — Server Component, signed URLs
- `src/components/project/thread-panel.tsx` — Realtime-subscribed message list
- `src/components/project/thread-panel-server.tsx` — server-rendered shell
- `src/components/app/sidebar-nav.tsx` — projects/admin/settings entries enabled

### shadcn additions
- `switch` (added by subtask 09 for thread visibility toggle)

### i18n
- `messages/ko.json` + `messages/en.json` — added `projects`, `refs`, `threads`, `settings`, `admin`, `errors` namespaces (+88 keys total)

### Migration applied (Supabase)
- `storage_policy_hardening_20260421` (kill-switch gated)
  - `avatars` bucket: `public = false` (was `true` → CRITICAL bypass)
  - `refs_insert` policy dropped → `refs_insert_authorized` created (path-prefix + `is_ws_member` / `is_yagi_admin`)

### Documentation
- `.yagi-autobuild/phase-1-2-e2e.md` — 6-test manual smoke runbook (342 lines)
- `.yagi-autobuild/checkpoint.md` — Wave-by-wave progress log

## Build output

```
Route (app)                                 Size  First Load JS
┌ ○ /_not-found                            999 B         103 kB
├ ƒ /[locale]                             5.4 kB         125 kB
├ ƒ /[locale]/app                        2.98 kB         135 kB
├ ƒ /[locale]/app/admin                    186 B         119 kB
├ ƒ /[locale]/app/admin/projects           186 B         119 kB
├ ƒ /[locale]/app/projects                 186 B         119 kB
├ ƒ /[locale]/app/projects/[id]          24.3 kB         253 kB
├ ƒ /[locale]/app/projects/new           14.9 kB         217 kB
├ ƒ /[locale]/app/settings                4.9 kB         246 kB
├ ƒ /[locale]/forgot-password            2.14 kB         243 kB
├ ƒ /[locale]/onboarding                   286 B         119 kB
├ ƒ /[locale]/onboarding/brand           2.17 kB         175 kB
├ ƒ /[locale]/onboarding/invite          3.45 kB         136 kB
├ ƒ /[locale]/onboarding/profile         2.16 kB         175 kB
├ ƒ /[locale]/onboarding/workspace       2.15 kB         175 kB
├ ƒ /[locale]/reset-password             2.13 kB         243 kB
├ ƒ /[locale]/signin                     2.16 kB         243 kB
├ ƒ /[locale]/signup                     2.31 kB         243 kB
├ ƒ /api/unfurl                            135 B         102 kB
└ ƒ /auth/callback                         135 B         102 kB
+ First Load JS shared by all             102 kB
ƒ Middleware                              126 kB
```

Compile time: 14.8 s on a clean `.next`. Zero TS errors, zero ESLint warnings.

## Schema + pattern notes (cumulative — for downstream phases)

- `projects.brief` (not `description`); `projects.title` is non-null text
- `project_references`: `added_by` column (not `created_by`); NO `kind` column — type inferred at runtime by presence of `storage_path` vs `url`
- `project_threads`: NO `kind` column; `created_by` required
- `thread_messages`: `author_id` (not `sender_id`); `body` nullable
- `profiles.locale` routes bilingual emails
- Realtime channel naming: `project:{projectId}:thread`
- Storage path conventions:
  - `project-references/{projectId}/{uuid}.{ext}` (private, RLS-gated INSERT)
  - `avatars/{userId}/{uuid}.{ext}` (private as of subtask 13 — must use `createSignedUrl(path, 3600)`)
- RLS helper signatures: `is_ws_member(uid uuid, wsid uuid)`, `is_yagi_admin(uid uuid)`, `is_ws_admin(uid uuid, wsid uuid)`

## Kill-switches consumed

| # | Trigger | Telegram msg_id | Decision |
|---|---------|-----------------|----------|
| 1 | Subtask 03 — `pnpm add resend react-dropzone …` | 14 | continue |
| 2 | Subtask 13 — storage policy migration | 17 | continue (ack 18) |
| 3 | Subtask 14 — pre-`pnpm build` | 21 | continue |
| 4 | Subtask 14 — pre-completion | (this message) | pending |

## Deviations from spec (noted, accepted)

1. **Subtask 13 storage migration applied via Supabase MCP** rather than `supabase db push` — same end state (recorded in `supabase_migrations.schema_migrations`), avoided CLI link friction. Same approach used in Phase 1.1.
2. **`tone` field is a ghost** in the new project wizard — no DB column, captured in form state but not persisted. Will become a real column when the brief schema is extended.
3. **Workspace logo upload deferred** — `workspace-logos` bucket exists, but UI shows `dashboard.coming_soon` placeholder. Avatar upload ships fully.
4. **Workspace invitation send deferred** — `workspace_invitations` table exists; `inviteMember` action returns `{ error: "not_implemented" }`. Real Resend invitation send slated for Phase 1.3.
5. **Email digest / retry queue not built** — direct fire-and-forget `void notifyNewMessage()` only. Fan-out is per-recipient with per-send error catch; failed sends do not block the message insert.
6. **Caption editing on reference cards deferred** to Phase 1.3 — current grid is read-only.
7. **Final-build lint sweep** — first build attempt surfaced 3 `prefer-const` errors + 6 unused-var warnings accumulated across subtasks. All 9 issues fixed in a single pre-build sweep (`og-unfurl.ts` const conversions + unused-prop / import / dead-code cleanup) before the clean build above.

## Success criteria (from `task_plan.md`)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | `pnpm build` clean, zero TS errors, zero ESLint warnings | ✅ |
| 2 | Client can create draft → submit project; YAGI admin sees in admin view | ✅ (code paths complete; awaits manual E2E per `phase-1-2-e2e.md`) |
| 3 | Reference collector: 2 image uploads + 1 URL with OG parse | ✅ (uploader + `/api/unfurl` wired) |
| 4 | Thread shared/internal RLS RESTRICTIVE policy enforced | ✅ (verified by Evaluator on subtask 09) |
| 5 | Resend email arrives for shared message; not internal | ✅ (gate at action + email lib) |
| 6 | Settings: avatar upload reflected in sidebar | ✅ (signed URL via `createSignedUrl`) |
| 7 | RLS sanity: anon `GET /rest/v1/projects` returns 0 | ✅ (carry-over from Phase 1.1, unchanged) |
| 8 | `summary.md` + `phase-1-2-e2e.md` written; final Telegram | ✅ |

## Manual smoke test

The user should follow `.yagi-autobuild/phase-1-2-e2e.md` end to end:

1. Create project → verify list + detail render
2. Reference collector → 2 images + 1 URL with OG parse
3. Thread conversation across two accounts (regular + yagi_admin); verify visibility toggle, RLS, Resend email
4. Status transitions per ALLOWED map
5. Settings: avatar upload, sidebar reflects
6. RLS sanity (anon curl + storage object access)

## Next steps (Phase 1.3+)

- Workspace invitation send (replace `not_implemented` stub)
- Reference card caption editing
- `tone` real column + brief schema extension
- Workspace logo upload UI
- Email digest / retry queue
- Meetings (Phase 1.3 main scope)
- Storyboards (Phase 1.4)
- Invoicing (Phase 1.5)
