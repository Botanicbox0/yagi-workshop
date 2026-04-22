# Phase 2.2 — Backlog

**Seeded:** 2026-04-23 by Phase 2.1 G5 triage.
**Source:** `.yagi-autobuild/phase-2-0/G4_TRIAGE.md` §DEFER_TO_2_1 + Phase 2.1 G5 classifications.
**Contract:** items below need scoping before they enter a Phase 2.2 SPEC. Priority ordering is rough (severity × ease); CEO retains right to reorder at SPEC-time.

---

## Top of list — Phase 2.1 G5 runners-up (dropped to honor ≤5 FIX_NOW cap)

| Phase | ID | Description | Why it's top-of-list |
|-------|----|-------------|----------------------|
| 1.6 | M1 | OG image `force-dynamic` (no cache) — implement 1h `s-maxage` or `unstable_cache` | Perf + Vercel bandwidth cost; bounded scope once strategy chosen |
| 1.7 | M2 | `success_channel_unarchived` toast key missing | Trivial (~5 min); can ship in Phase 2.2 kick-off |

## Security & data integrity

| Phase | ID | Description | Why deferred |
|-------|----|-------------|--------------|
| 1.2 | M2 | Internal thread messages writable via direct API | RLS WRITE tightening + design decision (who can post `visibility='internal'`) |
| 1.2.5 | M2 | Realtime attachments need reload to appear | Client-side refetch hook; complementary to the Phase 2.1 G2 publication fix |
| 1.2.5 | L1 | Attachment signed URLs expire mid-stream | `onError` re-sign state machine |
| 1.2.5 | L2 | pdfjs worker on jsDelivr lacks SRI | Self-host the worker (SRI on jsDelivr breaks silent upgrades) |
| 1.3 | M2 | Stale `pending` meetings unrecoverable | Retry/cleanup cron job (new Edge Function + schedule) |
| 1.3 | M4 | Fallback ICS retries resend duplicate emails | Invite-send-state column + idempotency key; DB migration |
| 1.4 | M2 | Preprod visibility too loose (any ws_member of yagi-internal) | Design decision — who can see preprod boards |
| 1.4 | M3 | Reaction UPSERT identity spoofable (email from body) | Session-token binding architecture change |

## Abuse protection (needs rate-limit primitive decision first)

| Phase | ID | Description |
|-------|----|-------------|
| 1.2 | M5 | `/api/unfurl` no rate limit |
| 1.5 | L2 | No rate limit on `fetchSuggestions` |

All three items above block on a shared decision: **which rate-limit primitive does the project adopt?** (In-memory per-instance, Upstash Redis, Supabase-backed token bucket, Vercel edge-config.) Phase 2.2 or 2.3 should pick one and backfill.

## UX / cosmetic

| Phase | ID | Description |
|-------|----|-------------|
| 1.4 | L1 | Reaction bucket name mismatch (`hand` vs `needs_change`) — rename cascade across DB enum + code + i18n |
| 1.4 | L2 | Click same reaction twice shows false "undo" |
| 1.5 | M2 | Email print URL hardcoded to `/ko/` — buyer locale model needed |
| 1.6 | M2 | Content Collections config deprecated — migrate to `content` property |
| 1.6 | L1–L13 | Dead i18n / feed / MDX links / OG quote split / WCAG (cosmetic batch, 13 sub-items; re-audit first — some may be resolved by Phase 2.0 G6) |
| 1.7 | L1–L14 | Realtime cross-tab, orphan uploads, unused keys, a11y, signed URL TTL (polish batch, 14 sub-items) |

## WONTFIX

| Phase | ID | Description | Why |
|-------|----|-------------|-----|
| 1.5 | L1 | `suggestLineItems` no dedup by `source_type` | Cosmic-risk UUID collision (~2^-122 per batch); existing enum discriminator is sufficient |

---

## Housekeeping when Phase 2.2 kicks off

1. Re-sort by that phase's scope themes (feature work vs. backlog burndown).
2. Items with "design decision" blockers should be resolved via CEO consultation (or deferred further) before entering the SPEC.
3. The **rate-limit primitive decision** (1.2 M5 / 1.5 L2) is a prerequisite — treat as its own ADR before any rate-limit fix lands.
4. Cosmetic batches (1.6 L1–L13, 1.7 L1–L14) should be re-audited against current `src/` — some may already be dead due to Phase 2.0 G6 cleanup.
