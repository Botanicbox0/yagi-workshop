# Phase 2.5 G7 — Entry Decision Package

**Status:** READY FOR ADOPTION (web Claude pre-authored, 2026-04-24 overnight)
**Purpose:** Drop-in decisions for notification kinds + pg_cron reminder + realtime smoke glue.
**Scope ref:** SPEC v2 §3 G7 + G2-G8-PRE-AUDIT/G7-notifications.md

---

## §0 — Scope summary

1. Register 4 new notification kinds in `src/lib/notifications/kinds.ts`
2. Add 4 × 2 locale = 8 new i18n entries (messages/ko.json + en.json)
3. Add inline email templates in `supabase/functions/notify-dispatch/index.ts`
4. New `challenges-closing-reminder` pg_cron job (every 15min)
5. Wire `notify-dispatch` to honor `notification_preferences.challenge_updates_enabled`
6. Two-browser realtime smoke documented in YAGI-MANUAL-QA-QUEUE.md

No schema change beyond the cron job migration.

---

## §A — 4 new notification kinds

### Status: CACHE HIT candidate (severity policy per existing kinds.ts)

### Decision

Add to `NotificationKind` union + `SEVERITY_BY_KIND` registry:

```ts
// src/lib/notifications/kinds.ts
export type NotificationKind =
  | ...existing 11 kinds...
  | "challenge_submission_confirmed"
  | "challenge_closing_soon"
  | "challenge_announced_winner"
  | "challenge_announced_participant";

export const SEVERITY_BY_KIND: Record<NotificationKind, "high" | "medium" | "low"> = {
  // ...existing...
  challenge_submission_confirmed: "medium",
  challenge_closing_soon: "high",
  challenge_announced_winner: "high",
  challenge_announced_participant: "medium",
};
```

Severity mirrors SPEC §3 G7 Task 1. High-severity kinds bypass digest batching (fire immediately per existing Phase 1.8 behavior).

**Auto-adopt** (matches SPEC literal).

---

## §B — i18n entries

### Status: PROPOSED

### Decision

Add to `messages/ko.json`:

```json
"notifications": {
  "events": {
    "challenge_submission_confirmed": {
      "title": "작품이 등록되었어요",
      "body": "{challenge_title} 챌린지에 작품을 올렸어요. 결과 발표일까지 기다려 주세요!"
    },
    "challenge_closing_soon": {
      "title": "곧 마감이에요",
      "body": "{challenge_title} 챌린지가 24시간 뒤 마감됩니다. 참여를 마무리해 주세요."
    },
    "challenge_announced_winner": {
      "title": "주인공으로 선정되었어요",
      "body": "{challenge_title} 챌린지의 이번 주인공으로 선정됐어요! 축하드려요."
    },
    "challenge_announced_participant": {
      "title": "결과가 발표되었어요",
      "body": "{challenge_title} 챌린지의 결과가 발표됐어요. 주인공들의 작품을 확인해 보세요."
    }
  }
}
```

Add to `messages/en.json`:

```json
"notifications": {
  "events": {
    "challenge_submission_confirmed": {
      "title": "Submission confirmed",
      "body": "Your entry for {challenge_title} has been received. Results will be announced soon."
    },
    "challenge_closing_soon": {
      "title": "Closing in 24 hours",
      "body": "{challenge_title} closes in 24 hours. Wrap up your entry before the deadline."
    },
    "challenge_announced_winner": {
      "title": "You're a winner",
      "body": "Your submission for {challenge_title} has been selected. Congratulations!"
    },
    "challenge_announced_participant": {
      "title": "Results announced",
      "body": "Results are in for {challenge_title}. Check out the winning entries."
    }
  }
}
```

Copy rules (per G3 tone §0):
- "제출/submission" → "작품 (등록)" / "entry"
- "수상/winner" → "주인공" / "winner" (en retained literal)
- No "로그인" / "login" imperatives
- Friendly declarative tone

**Recommended: ADOPT.**

---

## §C — Inline email templates in notify-dispatch

### Status: PROPOSED

### Decision

Add 4 template blocks to `supabase/functions/notify-dispatch/index.ts` matching existing inline-string pattern (NOT React Email — Deno runtime constraint, documented as tech debt FU candidate).

Template structure per kind (mirror Phase 1.8 pattern):

```typescript
// notify-dispatch/index.ts
function renderChallengeSubmissionConfirmed(event, locale) {
  const subject = locale === "ko"
    ? `[YAGI] 작품이 등록되었어요 — ${event.payload.challenge_title}`
    : `[YAGI] Submission confirmed — ${event.payload.challenge_title}`;
  const body = locale === "ko"
    ? `${event.payload.challenge_title} 챌린지에 작품을 올렸어요.\n\n결과 발표일까지 기다려 주세요!\n\n작품 보기: ${SITE_URL}${event.url_path}`
    : `Your entry for ${event.payload.challenge_title} has been received.\n\nResults will be announced soon.\n\nView: ${SITE_URL}${event.url_path}`;
  return { subject, text: body };
}

// ... similar for 3 other kinds
```

Dispatch switch adds 4 new case branches. Function signature + output shape matches existing kinds.

### Alternatives rejected

- **React Email pipeline**: requires Node runtime. Deno incompatible. Full pipeline unification = Phase 3+ refactor.
- **Skip email (in-app only)**: breaks SPEC §2 #9 (email delivery verified via `email_sent_at`).

**Recommended: ADOPT inline strings + log as tech debt in FOLLOWUPS.**

---

## §D — pg_cron `challenges-closing-reminder` job

### Status: PROPOSED

### Decision

New migration: `supabase/migrations/<timestamp>_phase_2_5_challenges_closing_reminder_cron.sql`

```sql
-- Runs every 15 minutes. Finds challenges closing in ~24h that haven't
-- been reminded yet, emits notification_events rows for all submitters,
-- stamps reminder_sent_at for idempotency.

SELECT cron.schedule(
  'challenges-closing-reminder',
  '*/15 * * * *',
  $$
  WITH expiring AS (
    SELECT id, title
      FROM public.challenges
     WHERE state = 'open'
       AND close_at BETWEEN now() + interval '23h 45min'
                        AND now() + interval '24h 15min'
       AND reminder_sent_at IS NULL
     FOR UPDATE SKIP LOCKED
  ),
  events AS (
    INSERT INTO public.notification_events
      (user_id, kind, severity, title, body, url_path, payload)
    SELECT
      cs.submitter_id,
      'challenge_closing_soon',
      'high',
      '곧 마감이에요',
      e.title || ' 챌린지가 24시간 뒤 마감됩니다.',
      '/challenges/' || c.slug,
      jsonb_build_object('challenge_title', e.title)
    FROM expiring e
    JOIN public.challenges c ON c.id = e.id
    JOIN public.challenge_submissions cs ON cs.challenge_id = e.id
    WHERE cs.status = 'ready'
    RETURNING 1
  )
  UPDATE public.challenges
     SET reminder_sent_at = now()
   WHERE id IN (SELECT id FROM expiring);
  $$
);
```

### Verification at G7 entry

Before writing this migration, verify:
1. `pg_cron` extension installed (confirmed per baseline §1 inventory)
2. `cron.schedule()` callable via Supabase CLI migration — **untested path in this codebase**
3. Fallback: if cron.schedule() fails via migration, schedule manually via Supabase dashboard SQL Editor as one-time step (document in CLOSEOUT)

### Idempotency

`reminder_sent_at IS NULL` guard prevents re-fire. `FOR UPDATE SKIP LOCKED` prevents concurrent cron runs from double-stamping.

### Korean-only body

MVP: hardcode Korean body in cron (en users re-localize via notify-dispatch if needed). Or: cron inserts only `kind` + `payload`, defers body rendering to notify-dispatch (which reads locale from `profile.locale`). **Recommendation: defer body rendering to notify-dispatch** — cleaner localization.

Simplified cron:
```sql
INSERT INTO public.notification_events
  (user_id, kind, severity, title, body, url_path, payload)
SELECT
  cs.submitter_id,
  'challenge_closing_soon',
  'high',
  '',  -- blank, notify-dispatch renders localized
  '',  -- blank
  '/challenges/' || c.slug,
  jsonb_build_object('challenge_title', e.title)
FROM ...
```

**Recommended: ADOPT (with locale-aware dispatch rendering).**

---

## §E — challenge_updates_enabled honoring

### Status: PROPOSED

### Decision

Modify `supabase/functions/notify-dispatch/index.ts` dispatch logic:

Before sending email for any of the 4 new kinds:
```typescript
if (isChallengeKind(event.kind)) {
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("challenge_updates_enabled")
    .eq("user_id", event.user_id)
    .maybeSingle();

  if (prefs?.challenge_updates_enabled === false) {
    // Skip email; in-app row remains
    return;
  }
}
```

`isChallengeKind(kind)` helper:
```typescript
function isChallengeKind(kind: string): boolean {
  return kind.startsWith("challenge_");
}
```

In-app notification row stays regardless of prefs (user can still see in notification bell). Only email dispatch is gated.

**Recommended: ADOPT.**

---

## §F — Emit sites (G4/G5/cron)

### Status: REFERENCE (not decisions — documentation for Builder)

G7 does NOT write emit code — that's inside G4 (submission confirmed) and G5 (announce). G7 ensures:
- Kinds registered (§A) before G4 emits
- Templates ready (§C) before first email fires
- Cron job (§D) running for reminder fan-out

**Pre-flight at G7 entry:** verify G4 submission action emits `challenge_submission_confirmed` after successful submission INSERT. If missing → halt, file G4 amendment.

**Pre-flight at G7 entry:** verify G5 announce action emits `challenge_announced_winner` + `_participant` per submission. If missing → halt, file G5 amendment.

---

## §G — Realtime smoke verification

### Status: PROPOSED — document in YAGI-MANUAL-QA-QUEUE

### Decision

Two-browser smoke procedure (야기 runs manually post-G7):

```
Browser A (authenticated as yagi_admin):
  1. Navigate to /app/admin/challenges/[slug]/judge for an open challenge
  2. Leave tab open

Browser B (incognito or different session):
  1. Navigate to /challenges/[slug]/submit for same challenge
  2. Submit a test entry

Expected in Browser A within 5 seconds:
  - New submission appears in judge list WITHOUT page refresh
```

If fails: inspect `supabase_realtime` publication membership (verified in G1 to include `challenge_submissions`) + browser realtime subscription connection (check console).

Add entry to `.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md` with this procedure. Do not block G7 ship on manual QA — it's async.

**Recommended: ADOPT.**

---

## §H — FU-1 marketing flag

### Status: CONFIRMED DEFERRED

Per SPEC §3 G1 Task 4 + FU-1, 정보통신망법 §50 marketing opt-in (new challenge announcements, not participant-only) is **out of G7 scope**. G7 emits only transactional (submitter-centric) events:
- `challenge_submission_confirmed` → to submitter
- `challenge_closing_soon` → to submitters
- `challenge_announced_winner/_participant` → to submitters

NO marketing email fan-out to "users who haven't participated yet" in G7. That's FU-1 territory + separate opt-in flag addition.

**No decision needed — confirmed deferral.**

---

## §I — Notification volume ceiling

### Status: PROPOSED

### Decision

For a challenge with N submissions:
- Announce → N notification_events + N emails (batched by notify-dispatch into ≤10-email Resend calls per existing batching)
- Closing reminder → N events per challenge, every 15min scan window

Resend Free tier: 100 emails/day. Team tier: 50k/month.

At current scale (야기 pre-revenue): expect <10 challenges active, <50 submissions each = <500 emails/day peak. Safe under Team tier.

If volume grows past ~1000/day: add FOLLOWUP to migrate to queue-based dispatcher.

**Recommended: ADOPT current sync pattern. Monitor volume in Phase 2.6+.**

---

## §J — Decisions needed from 야기 (cache MISS batch)

1. **Q-G7-1 (§A):** Auto-adopt 4 new kinds + severity per SPEC? (Default: yes)
2. **Q-G7-2 (§B):** Adopt Korean+English copy for 4 kinds? (Default: yes)
3. **Q-G7-3 (§C):** Inline email templates in notify-dispatch (+ log as debt)? (Default: yes)
4. **Q-G7-4 (§D):** pg_cron via migration (fallback: manual SQL Editor)? (Default: yes — try migration first)
5. **Q-G7-5 (§D):** Defer email body rendering to notify-dispatch (cron inserts blank)? (Default: yes — cleaner localization)
6. **Q-G7-6 (§E):** challenge_updates_enabled gates email only (not in-app)? (Default: yes — preserves notification bell visibility)
7. **Q-G7-7 (§G):** Document 2-browser smoke in YAGI-MANUAL-QA-QUEUE (don't block ship)? (Default: yes)

Batch answer:
```
G7: Q1=yes, Q2=yes, Q3=yes, Q4=yes, Q5=yes, Q6=yes, Q7=yes
```

All defaults → proceed. Cache append: Q-033 through Q-039.

---

## §K — Success criteria (G7 closeout)

- [ ] 4 new NotificationKind entries registered + severity mapped
- [ ] 4 × 2 locale i18n entries added
- [ ] 4 inline email templates in notify-dispatch
- [ ] Edge Function `notify-dispatch` re-deployed (`supabase functions deploy notify-dispatch`)
- [ ] Cron migration applied (`supabase db push`) OR manually scheduled + documented
- [ ] `notification_preferences.challenge_updates_enabled = FALSE` test case → in-app only, no email
- [ ] G4 emit site verified (submission confirmed fires within 60s)
- [ ] G5 emit site verified (announce fans out winner/participant)
- [ ] 2-browser realtime smoke documented in YAGI-MANUAL-QA-QUEUE
- [ ] `pnpm exec tsc --noEmit` + `pnpm lint` EXIT=0

---

**END OF G7 ENTRY DECISION PACKAGE**
