# Phase 2.1 G1 — Resend DNS verify closeout

**Date:** 2026-04-23 (final resolution timestamps within 2026-04-22 18:00 UTC window — UTC vs KST offset; see timestamps below)
**Status:** ✅ **RESOLVED** — DNS records fixed by 야기, Resend verified, first delivery confirmed.
**Canonical source of truth:** Resend API, live DB
**Phase 2.0 G1 context:** DNS records were added at 가비아 on 2026-04-22 ~08:36 UTC; Phase 2.0 HANDOFF expected 5min–1hr propagation.

---

## Resend API state (2026-04-23, live check)

Fetched via `GET https://api.resend.com/domains/57bf1fff-31c5-4aa4-9943-9425306af10d` with `RESEND_API_KEY`:

| Field | Value |
|-------|-------|
| Domain | `yagiworkshop.xyz` |
| Domain ID | `57bf1fff-31c5-4aa4-9943-9425306af10d` |
| Region | `ap-northeast-1` (Tokyo — Resend APAC deployment) |
| Created | `2026-04-22 08:36:47 UTC` |
| **Status** | **`failed`** |

Per-record status:

| Type | Host | Status | Value (truncated) |
|------|------|--------|-------------------|
| DKIM (TXT) | `resend._domainkey` | **failed** | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbAkljUZZ9ctOgqXvUwdw2zLGPomT44PoD2NyJud…` |
| SPF (MX)   | `send`              | **failed** | `feedback-smtp.ap-northeast-1.amazonses.com` |
| SPF (TXT)  | `send`              | **failed** | `v=spf1 include:amazonses.com ~all` |

**Diagnosis:** ~9h elapsed since Phase 2.0 Setup (2026-04-22 08:36 → ~17:50 UTC at first check; earlier draft said "28h" — that was a timezone-conversion error confusing KST and UTC, corrected here). Failure was not propagation-delay — Resend actively rejected the records as non-matching. Either (a) records were missing at 가비아, (b) records existed with wrong host / value / conflicting entry, or (c) wildcards at the parent domain were overriding the subdomain-scoped records.

## DB state (live check)

```sql
SELECT id, kind, created_at, email_sent_at, email_batch_id
FROM notification_events
WHERE id = '41251b54-a4ad-47f7-b834-bbdf766375dd';
```

Result:
```
id:             41251b54-a4ad-47f7-b834-bbdf766375dd
kind:           meeting_scheduled
created_at:     2026-04-22 08:12:54 UTC
email_sent_at:  NULL
email_batch_id: NULL
```

Row exists; never dispatched. Cron cannot dispatch because Resend will reject attempts to an unverified sender domain.

## Exit criterion (SPEC §G1)

SPEC says: `notification_events.41251b54-…-bbdf766375dd.email_sent_at IS NOT NULL`.
Current: NULL. **Exit criterion NOT met.**

## Remediation (owner: 야기 — external action, not Builder)

1. Log into Gabia (가비아) domain management for `yagiworkshop.xyz`.
2. Verify three DNS records exist with EXACTLY these host names and values:
   - `resend._domainkey` TXT = `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCbAkljUZZ9ctOgqXvUwdw2zLGPomT44PoD2NyJud…` (full value via Resend dashboard or a follow-up API call)
   - `send` MX priority 10 = `feedback-smtp.ap-northeast-1.amazonses.com`
   - `send` TXT = `v=spf1 include:amazonses.com ~all`
3. Check for conflicts: root-domain SPF TXT or wildcard CNAMEs can break subdomain lookup.
4. After correcting DNS, in Resend dashboard or via API `POST /domains/57bf1fff…/verify`, re-trigger verification.
5. Re-run the Phase 2.1 G1 verify step: query `notification_events.41251b54…` — when `email_sent_at` is non-null, G1 closeout is complete.

## Decision (per SPEC §G1 semantics + ADR-005)

**G1 classified as `BLOCKED_ON_EXTERNAL_DNS`.** Phase 2.1 G2–G8 is NOT blocked by this — Resend verification is independent of the rest of the operational tail. Phase 2.1 closeout (G8) will mark G1 as "verify deferred until DNS remediation" and proceed.

Once 야기 fixes DNS, one SQL check converts this to closed. No code change needed.

## Evidence captured

- Resend API domain detail (logged above)
- DB row snapshot (logged above)
- This file: `.yagi-autobuild/phase-2-1/G1-CLOSEOUT.md`

**G1 status (initial) → BLOCKED_ON_EXTERNAL_DNS. G2–G5 proceeded in parallel.**

---

## Resolution (same-day, post-DNS-fix)

야기 confirmed Resend domain verified. Inline watcher re-queried across the next cron tick and observed:

```sql
SELECT
  (SELECT NOW()) AS server_now_utc,
  (SELECT email_sent_at FROM notification_events WHERE id = '41251b54-a4ad-47f7-b834-bbdf766375dd') AS target_sent,
  (SELECT MAX(start_time) FROM cron.job_run_details jrd JOIN cron.job j ON j.jobid = jrd.jobid WHERE j.jobname = 'notify-dispatch') AS last_tick,
  (SELECT count(*) FROM notification_events WHERE email_sent_at > NOW() - INTERVAL '20 minutes') AS recent_sends_20m;
```

Result:

| Field | Value |
|-------|-------|
| server_now_utc | `2026-04-22 18:08:55.367908+00` |
| target_sent (`email_sent_at`) | `2026-04-22 18:00:01.858+00` ✅ |
| last_tick | `2026-04-22 18:00:00.08102+00` |
| recent_sends_20m | `1` (the target row) |

- **Resend verify moment:** confirmed by 야기 around `18:00 UTC` (verify marker: `email_sent_at` populated on the very first tick after verify). Earlier Resend API call in this session (2026-04-22 ~17:56 UTC) still showed `status=failed`; next minute's tick caught the verify + dispatched successfully.
- **First delivery:** `email_sent_at = 2026-04-22 18:00:01.858 UTC` on `notification_events.41251b54-a4ad-47f7-b834-bbdf766375dd` (`meeting_scheduled`).
  - *(SPEC G1 exit criterion used "status='sent' AND error_message IS NULL" — the live schema doesn't carry those columns; `email_sent_at IS NOT NULL` is the canonical success marker. `notification_events` columns: `id`, `user_id`, `project_id`, `workspace_id`, `kind`, `severity`, `title`, `body`, `url_path`, `payload`, `email_sent_at`, `email_batch_id`, `in_app_seen_at`, `created_at`.)*
- Cron tick fired at `18:00:00 UTC` (on schedule `*/10 * * * *`); one attempt, one success.

### Exit criterion (SPEC §G1) — MET

`notification_events.41251b54-…-bbdf766375dd.email_sent_at IS NOT NULL` ✓.

**G1 fully resolved. `BLOCKED_ON_EXTERNAL_DNS` marker cleared. Notification pipeline operational end-to-end.**

