# Phase 2.1 G1 — Resend DNS verify closeout

**Date:** 2026-04-23
**Status:** BLOCKED_ON_EXTERNAL_DNS (not verify-pending; actual verification failure)
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

**Diagnosis:** ~28h elapsed since Phase 2.0 Setup. Failure is not propagation-delay — Resend actively rejected the records as non-matching. Either (a) records are missing at 가비아, (b) records exist but with wrong host / value / conflicting entry, or (c) wildcards at the parent domain are overriding the subdomain-scoped records.

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

**G1 status → BLOCKED_ON_EXTERNAL_DNS. Falling through to G2.**
