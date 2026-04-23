# G7 Pre-Audit — Notifications + realtime glue

> Source: src/ + supabase/ survey (2026-04-23, post-commit 58dbf6e).

---

## 1. 현존 인프라 inventory

### Notification kinds (Phase 1.8)
`src/lib/notifications/kinds.ts:7-34` exports:

**NotificationKind union (11 existing):**
`meeting_scheduled | meeting_summary_sent | invoice_issued | board_shared | board_approved | showcase_published | frame_uploaded_batch | revision_uploaded | feedback_received | thread_message_new | team_channel_mention`

**SEVERITY_BY_KIND registry:**
- high: meeting_scheduled, meeting_summary_sent, invoice_issued, board_shared, board_approved, showcase_published
- medium: frame_uploaded_batch, revision_uploaded, feedback_received
- low: thread_message_new, team_channel_mention

G7 adds **4 new kinds** (SPEC §3 G7 Task 1):
- `challenge_submission_confirmed` — severity: medium
- `challenge_closing_soon` — severity: high (debounced per user×challenge)
- `challenge_announced_winner` — severity: high
- `challenge_announced_participant` — severity: medium

### notify-dispatch Edge Function (Phase 1.8)
`supabase/functions/notify-dispatch/index.ts` (898 lines) — Deno runtime
- Auth: service_role JWT required
- ENV: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, SITE_URL, RESEND_FROM_EMAIL
- **Email only** (Resend). No Telegram/SMTP.
- Reads `notification_events` rows, renders per-kind email templates inline (lines 147-310), dispatches via Resend
- Batching: hourly/daily digest modes (per `notification_preferences.email_digest_enabled`)

### notification_events schema
`supabase/migrations/20260422120000_phase_2_0_baseline.sql:1343-1359`:

```sql
CREATE TABLE public.notification_events (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  project_id uuid,
  workspace_id uuid,
  kind text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('high','medium','low')),
  title text NOT NULL,
  body text,
  url_path text,
  payload jsonb,
  email_sent_at timestamp with time zone,
  email_batch_id uuid,
  in_app_seen_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);
```

### notification_preferences (post-G1)
Post-commit 58dbf6e:
- `user_id` (PK), `email_immediate_enabled`, `email_digest_enabled`, `digest_time_local`, `quiet_hours_start`, `quiet_hours_end`, `timezone`, `updated_at`
- **NEW:** `challenge_updates_enabled BOOL DEFAULT TRUE` (SPEC §3 G1 Task 4) — governs **transactional notifications** only
- Marketing opt-in (Korean 정보통신망법 §50) deferred to FU-1

### Email templates
- `src/emails/notification-immediate.tsx` — single high-severity event
- `src/emails/notification-digest.tsx` — batched
- **Note:** these files exist in src/emails but notify-dispatch inlines string templates directly (Deno runtime avoids Node deps). G7 new kinds need inline template additions inside `notify-dispatch/index.ts`.

### pg_cron extension
- `pg_cron` extension installed in baseline (line 50 of 20260422120000_phase_2_0_baseline.sql)
- **No existing cron jobs in migrations** — jobs are typically provisioned via Supabase dashboard or Edge Function cron triggers
- SPEC §3 G7 Task 3 requires new `challenges-closing-reminder` job via `SELECT cron.schedule(...)` in a migration

### Realtime publication (post-G1)
Publication `supabase_realtime` now includes (per commit 58dbf6e verification):
- Existing: journal, notification_events, preprod_boards, frames, revisions, approvals, team_channel_messages (and ~5 more)
- **NEW:** challenges, challenge_submissions, challenge_votes, showcase_challenge_winners

### i18n — notification event strings
- `messages/ko.json` + `messages/en.json` — `notifications.events.<kind>.{title,body}` structure (inferred from namespace list)
- G7 must add 4 new kinds × 2 locales = 8 new entries

---

## 2. 새로 만들어야 할 것

### Code changes
1. `src/lib/notifications/kinds.ts` — extend NotificationKind union + SEVERITY_BY_KIND registry with 4 new kinds
2. `messages/ko.json` + `messages/en.json` — add `notifications.events.challenge_submission_confirmed.*`, `challenge_closing_soon.*`, `challenge_announced_winner.*`, `challenge_announced_participant.*`
3. `supabase/functions/notify-dispatch/index.ts` — add inline email templates for 4 new kinds (or cleanup to centralize)
4. Edge function environment — redeploy after kind additions

### Emit sites (implementation touchpoints per G)
- G4 submit action → emit `challenge_submission_confirmed` after INSERT
- G5 announce action → emit `challenge_announced_winner` / `_participant`
- New pg_cron → emit `challenge_closing_soon`

### New migration
`supabase/migrations/<timestamp>_phase_2_5_challenges_closing_reminder_cron.sql`:

```sql
SELECT cron.schedule(
  'challenges-closing-reminder',
  '*/15 * * * *',
  $$
  WITH expiring AS (
    SELECT id, title FROM challenges
    WHERE state = 'open'
      AND close_at BETWEEN now() + interval '23h 45min'
                       AND now() + interval '24h 15min'
      AND reminder_sent_at IS NULL
    FOR UPDATE SKIP LOCKED
  )
  -- emit notification_events per submitter of each expiring challenge
  -- stamp reminder_sent_at to prevent re-fire
  ...
  $$
);
```

Idempotent via `reminder_sent_at` guard.

### notify-dispatch prefs honoring
Add check: before emitting any of the 4 new kinds, read `notification_preferences.challenge_updates_enabled`. If FALSE, skip email dispatch (in-app row still inserted).

---

## 3. SPEC vs 현실 drift (의심점)

### Inline templates in Edge Function vs src/emails React components
- `src/emails/notification-immediate.tsx` and `notification-digest.tsx` exist but are NOT imported by `notify-dispatch` (Deno can't run Node-based JSX compilation easily)
- G7 must inline 4 new template strings directly inside `notify-dispatch/index.ts`
- Template divergence risk: same email "look" may drift between React Email (for local preview) and Deno inline strings (production)
- Accept for MVP; document as tech debt (phase-2-5 FOLLOWUPS FU-?)

### pg_cron ownership / privileges
- `cron.schedule()` requires `supabase_admin` role or explicit grant
- First cron migration in this codebase — untested path
- SPEC §3 G7 Task 3 mentions: "tie together in the same migration [as notify-dispatch cron]" from Phase 2.2 BACKLOG
- **Risk:** SPEC assumes `notify-dispatch` already has a scheduled cron trigger, but survey found no `cron.schedule` in migrations. Edge Function cron must be verified separately (deploy-time cron trigger vs SQL `cron.schedule`). Clarify at G7 entry.

### notification_events fan-out on announce
- SPEC §3 G7 Task 2: winners get `_winner`, others get `_participant`
- For a challenge with 100 submissions, announce action INSERTs 100 notification_events rows
- Single-transaction INSERT is fine; email dispatch cadence matters
- notify-dispatch batches by email_batch_id (existing logic) — 100 emails go out in one batch run (every 5-15min via existing cron?)
- **Verify:** existing notify-dispatch dispatch cadence. If immediate (triggered per INSERT), 100 Resend calls at announce time — Resend has rate limits.

### Realtime smoke two-browser test
- SPEC §3 G7 Task 5: two-browser smoke for realtime INSERTs
- No existing realtime subscription in codebase (G3 is first)
- G7 test depends on G3 being done → sequential dependency

### Korean 정보통신망법 §50 marketing compliance (FU-1)
- SPEC §3 G1 acceptance documents `challenge_updates_enabled` governs transactional only
- Marketing "new challenge announcements" are deferred + require separate opt-in flag
- Pre-G7: document in FOLLOWUPS.md FU-1, do NOT auto-opt-in existing users to marketing blasts
- **Decision:** does G7 add ANY marketing email fan-out, or strictly participant/winner? MVP: strict; no marketing emit in G7.

### Debouncing `challenge_closing_soon` per user × challenge
- SPEC §3 G7 Task 1 lists this as "debounced per user × challenge"
- Debounce mechanism: `reminder_sent_at` on `challenges` row (global per challenge), NOT per user
- So if a user submits to two expiring challenges, they get 2 reminders (one per challenge) — that's correct
- If a user submits once to one challenge, they get 1 reminder at 24h mark — correct
- Edge case: user submits multiple times? DB UNIQUE (challenge_id, submitter_id) prevents. ✅

---

## 4. 외부 의존 / ENV prereq

- No new ENV vars
- Resend API key already operational (Phase 2.1 confirmed)
- `SITE_URL` ENV used for email CTA links — confirm set correctly for production vs dev

### Edge Function deploy
- After `kinds.ts` + templates land, re-deploy `notify-dispatch` via `supabase functions deploy notify-dispatch`
- Cron migration applied via `supabase db push`

---

## 5. 테스트 전략 권고

| Layer | Scope | Pattern |
|---|---|---|
| Unit | Kind severity registry completeness | vitest (exhaustive assertion) |
| Unit | i18n: every kind has ko + en entries | `.mjs` mirror-test |
| Integration | Submit action → INSERT notification_events + email fires within 60s | Manual timed smoke |
| Integration | Announce fan-out: 10-submission challenge → 10 rows + 10 sent emails (batch) | Supabase dashboard + Resend dashboard |
| Integration | Cron: set challenge `close_at = now() + interval '24h 1min'`, wait 15min, observe reminder emit | Manual + cron log |
| Integration | `challenge_updates_enabled=FALSE` → no email dispatch (in-app row still inserted) | Direct toggle + observe |
| E2E | Two-browser realtime smoke (G3 gallery receives INSERT event) | YAGI-MANUAL-QA-QUEUE |

---

## 6. 잠재 야기 결정 항목

1. **Inline template vs React Email** — accept divergence for MVP (document as debt), or unify pipeline (large refactor)?
2. **Cron migration path** — verify `cron.schedule()` works via Supabase CLI migration (untested in this codebase). If blocked, fallback: Edge Function-scheduled cron (in Supabase dashboard).
3. **Notification volume limits** — at 100-submission announce, 100 emails batch. Acceptable for Resend tier? Check Resend plan.
4. **FU-1 marketing flag** — confirm defer (do not build marketing opt-in in G7). SPEC says so but confirm.
5. **Dispatch cadence** — existing `notify-dispatch` trigger timing (immediate via trigger? cron-pulled? event webhook?). G7 design hinges on this. **Verify at G7 entry.**
6. **Quiet hours** — existing prefs has `quiet_hours_start/end`. Applies to 4 new kinds? Or challenge-emergency bypasses quiet hours? MVP: honor existing quiet hours (no bypass).

---

**Cross-ref:** G3 realtime pattern → G7 verification. G5 announce action → G7 fan-out. FU-1 (정보통신망법 §50) tracked separately.
