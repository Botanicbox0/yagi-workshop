# Phase 1.8 — Notifications (digest + badges) — SUMMARY

**Status:** ✅ Code/build phase GREEN (Codex K-05 3 CRITICAL + 5 HIGH all addressed). 2 operational blockers documented (Resend secret + cron schedule).
**Date:** 2026-04-22
**Build:** `pnpm build` exit 0; `pnpm tsc --noEmit` exit 0; 11/11 pages compiled

## What shipped

A bilingual notifications system with:
- Central event emission (`emitNotification` + `emitDebouncedNotification`) wired into 9 Server Actions across Phases 1.2 / 1.3 / 1.4 / 1.5 / 1.7
- 11 event kinds across 3 severity levels (high / medium / low) with i18n title+body templates
- 10-min debounce window for `feedback_received` and `frame_uploaded_batch` (race-safe via partial unique index + on-conflict retry)
- Supabase Edge Function `notify-dispatch` with severity-based routing, quiet-hours respect, per-user preferences, two-phase idempotent claim
- In-app realtime bell + panel with unread badge (max 9+) + Today/Yesterday/Earlier grouping
- Preferences page with email toggles, digest time, quiet hours, timezone
- Locale-free unsubscribe page with confirmation-required flow + email masking

### Wave inventory

- **Wave A — i18n + email templates + migration + emit + 9 retrofits (parallel)**
  - 58 keys under `notifications.*` namespace (11 event-kind templates with ICU placeholders)
  - `src/emails/notification-immediate.tsx` + `notification-digest.tsx` (bilingual React Email)
  - Migration `20260422080000_phase_1_8_notifications.sql` — 3 tables + RLS + indexes + realtime publication
  - Migration `20260422080500_phase_1_8_notifications_helpers.sql` — `tg_set_notif_prefs_updated_at` trigger + `resolve_user_ids_by_emails(text[])` SECURITY DEFINER RPC
  - `src/lib/notifications/kinds.ts` — kind type + severity map
  - `src/lib/notifications/emit.ts` — service-role insert with locale-aware title/body pre-rendering
  - 9 retrofit sites (meetings, invoices, preprod share+actions, share/[token]/{reactions,comments}, threads, team chat mention)

- **Wave B — debounce**
  - `src/lib/notifications/debounce.ts` — 10-min aggregation window
  - 2 reaction/comment routes migrated to debounced
  - `frame_uploaded_batch` wired in `addFrame` + `addFrameFromUrl`

- **Wave C — Edge Function + UI (parallel)**
  - `supabase/functions/notify-dispatch/index.ts` (~800 lines) — deployed (verify_jwt: true, two-phase claim, quiet-hours wrap-around, locale-aware)
  - `src/components/app/notification-bell.tsx` — Realtime postgres_changes subscription
  - `src/components/app/notification-panel.tsx` — grouped recent events
  - `src/app/[locale]/app/settings/notifications/{page,actions,prefs-form}.tsx` — RHF + Zod preferences page
  - `src/app/unsubscribe/[token]/{page,actions,layout,resolve-locale}.ts(x)` — locale-free, no auth, confirmation required
  - Bell mounted in `src/app/[locale]/app/layout.tsx` top-bar

- **Wave D — Codex K-05 + fixups + final build**

### Codex K-05 findings + resolutions

**3 CRITICAL + 5 HIGH found. All addressed.**

| # | Severity | Issue | Fix |
|---|---|---|---|
| C1 | CRITICAL | `pnpm build` ESLint fail at `unsubscribe/[token]/page.tsx:137` (`<a href="/">` instead of `<Link>`) | Replaced 3 anchors with `<Link>` from `next/link` |
| C2 | CRITICAL | Cron not scheduled + RESEND_API_KEY not in Edge runtime → no emails ever send | pg_cron + pg_net installed; cron schedule + Resend secret remain manual ops steps (no MCP path; documented below) |
| C3 | CRITICAL | `notification_unsubscribe_tokens` RLS disabled → anon-key holder can enumerate every token + unsubscribe every user | Migration `20260422090000_phase_1_8_notifications_unsub_rls.sql` re-enables RLS with default-deny; service-role clients (page + actions) unaffected |
| H1 | HIGH | `email_immediate_enabled=false` toggle is dead — highs always sent regardless of user preference / unsubscribe | Honor toggle: when false, mark row sent without calling Resend (in-app badge still works) |
| H2 | HIGH | mark-sent UPDATE errors silently discarded → stuck rows on transient DB error | All 3 severity paths now error-check the UPDATE and recover by NULLing `email_batch_id` for retry |
| H4 | HIGH | Debounce SELECT/INSERT race → concurrent feedback bursts create duplicate aggregation rows | Migration `20260422090500_phase_1_8_notif_debounce_uniq.sql` adds partial unique index; `debounce.ts` wraps INSERT in try-on-23505 with read-and-update retry |
| H7 | HIGH | `/unsubscribe/[token]` exposes full email to any token holder | C3 fix closes the enumeration channel; `maskEmail()` helper added for defense-in-depth (`y***@yagiworkshop.xyz`) |
| H8 | HIGH | `@mention` resolves non-unique `display_name` → notifies users across workspace boundaries | 2-query intersection: profile match by display_name → workspace_members filter by `YAGI_INTERNAL_WORKSPACE_ID` |

**8 MEDIUM + 11 LOW** noted but do NOT block ship.

### Deferred follow-ups (Phase 1.8 MEDIUM/LOW)

1. M1 — `confirmUnsubscribe` UPDATE lacks `WHERE used_at IS NULL` race guard (defense-in-depth; current re-check at line 41 mostly suffices)
2. M2 — Edge Function `EVENT_FETCH_LIMIT = 500` with no pagination
3. M3 — `auth.admin.getUserById` serial loop in dispatch (use `listUsers` or a profiles view)
4. M4 — `medium recentCount` query intent undocumented
5. M5 — fixed during Wave D (debounce SELECT-error fallback now drops instead of inserting duplicate)
6. M6 — `thread_message_new` emits to all YAGI admins regardless of workspace
7. M7 — Settings timezone field is unrestricted (any string saved)
8. M8 — Debounce semantics undefined when `project_id` is undefined
9. L1–L11 — code smells, minor inconsistencies, etc. See review output

## Routes registered (Phase 1.8 contribution)

- `ƒ /[locale]/app/settings/notifications` — preferences page (6.15 kB)
- `ƒ /unsubscribe/[token]` — locale-free unsubscribe (181 B; service-role lookup)

## File-level deltas

**Created (source):**
- `src/lib/notifications/kinds.ts`
- `src/lib/notifications/emit.ts`
- `src/lib/notifications/debounce.ts`
- `src/emails/notification-immediate.tsx`
- `src/emails/notification-digest.tsx`
- `src/components/app/notification-bell.tsx`
- `src/components/app/notification-panel.tsx`
- `src/app/[locale]/app/notifications/actions.ts`
- `src/app/[locale]/app/settings/notifications/page.tsx`
- `src/app/[locale]/app/settings/notifications/actions.ts`
- `src/app/[locale]/app/settings/notifications/prefs-form.tsx`
- `src/app/unsubscribe/[token]/page.tsx`
- `src/app/unsubscribe/[token]/actions.ts`
- `src/app/unsubscribe/[token]/layout.tsx`
- `src/app/unsubscribe/[token]/resolve-locale.ts`

**Created (Edge Function):**
- `supabase/functions/notify-dispatch/index.ts`

**Created (migrations):**
- `supabase/migrations/20260422080000_phase_1_8_notifications.sql`
- `supabase/migrations/20260422080500_phase_1_8_notifications_helpers.sql`
- `supabase/migrations/20260422090000_phase_1_8_notifications_unsub_rls.sql`
- `supabase/migrations/20260422090500_phase_1_8_notif_debounce_uniq.sql`

**Modified (retrofit emit calls):**
- `src/app/[locale]/app/meetings/actions.ts` — `meeting_scheduled`, `meeting_summary_sent`
- `src/app/[locale]/app/invoices/[id]/actions.ts` — `invoice_issued`
- `src/app/[locale]/app/preprod/[id]/share-actions.ts` — `board_shared`, `board_approved`
- `src/app/[locale]/app/preprod/[id]/actions.ts` — `revision_uploaded`, `frame_uploaded_batch` (debounced)
- `src/app/api/share/[token]/reactions/route.ts` — `feedback_received` (debounced)
- `src/app/api/share/[token]/comments/route.ts` — `feedback_received` (debounced)
- `src/app/[locale]/app/projects/[id]/thread-actions.ts` — `thread_message_new`
- `src/app/[locale]/app/team/[slug]/actions.ts` — `team_channel_mention` (workspace-scoped after H8 fix)

**Modified (UI shell + i18n + types + tsconfig):**
- `src/app/[locale]/app/layout.tsx` — bell mounted in top-bar
- `messages/{ko,en}.json` — +58 keys under `notifications.*`
- `src/lib/supabase/database.types.ts` — regenerated
- `tsconfig.json` — added `supabase/functions` to `exclude` (Deno imports unbuildable under Node)
- `package.json` + `pnpm-lock.yaml` — added `@react-email/components` + `@react-email/render`

## Operational blockers (manual ops required)

1. **RESEND_API_KEY** — not set in Edge Function runtime. Operator must run:
   ```
   supabase secrets set RESEND_API_KEY=re_<your-key> --project-ref jvamvbpxnztynsccvcmr
   ```
   Until set: function deploys cleanly but Resend call returns non-2xx; the two-phase claim correctly NULLs `email_batch_id` on failure so rows retry.

2. **notify-dispatch cron schedule** — pg_cron + pg_net installed but no schedule registered. Operator must either:
   - Run via CLI: `supabase functions schedule create notify-dispatch --cron "*/10 * * * *"`, OR
   - Configure via Supabase Dashboard (Edge Functions → Cron), OR
   - Store the service-role key in Supabase Vault and reference it from a `cron.schedule(...)` call.

   Hardcoding the service-role key in pg_cron's job table was rejected as a security concern.

Both are recorded as Phase 1.8 ops follow-ups; they do NOT block code/build phase per autopilot rules.

## Mock-mode / production flip

N/A. Notifications are not mock-gated (the Edge Function gracefully no-ops if Resend secret is missing).

## What's next

- **Phase 1.9** — Deliverable Showcase Mode — starting now

## Cross-phase deferred items NOT addressed in 1.8

Tracked in task #24:
- Phase 1.2.5 + 1.3 + 1.4 deferred Codex K-05 items
- Phase 1.5 deferred items
- Phase 1.6 deferred items
- Phase 1.7 deferred items
- **CRITICAL:** missing migrations for Phases 1.1 / 1.2 / 1.2.5 / 1.3 / 1.4 in `supabase/migrations/` (only Phase 1.0 + 1.5 + 1.6 + 1.7 + 1.8 exist on disk)
- **NEW:** Phase 1.8 ops blockers (Resend secret + cron schedule) require manual operator action before live email dispatch works
