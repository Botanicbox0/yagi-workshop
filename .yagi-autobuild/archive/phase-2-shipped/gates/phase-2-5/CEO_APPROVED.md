# Phase 2.5 — CEO_APPROVED (Gate 1+2 combined per ADR-005)

**Status:** PENDING YAGI APPROVAL
**Date drafted:** 2026-04-23
**Approval method:** Inline decisions D1-D10 pre-filled; Yagi signs off by
posting "APPROVED" or requests edits.

---

## Decisions accepted

**D1 — Challenge host model**
YAGI Admin only creates challenges. Client companies request challenges
via external channel (email/Slack/meeting) and YAGI Admin co-designs via
ping-pong before internal creation. Self-serve deferred to Phase 3.

**D2 — Submission authentication**
Full signup required. No anonymous submission. Instagram handle mandatory
at signup.

**D3 — User roles (3)**
AI Creator / AI Studio / Observer. Role selection at signup, mutable with
audit log. Observer cannot submit but can vote/comment. One role per user
at a time.

**D4 — Submission format**
Hybrid YAGI-first. Native upload: video (mp4, 60s, 500MB), images (up to
5, jpg/png, 10MB each), PDF (1 file, 20MB). YouTube URL accepted as
supplementary (not replacement for native media). Text description
required, 50-2000 chars. Per-challenge JSONB configuration declares which
of native_video / image / pdf / youtube_url are required vs optional.

**D5 — Judging mode per challenge**
Admin selects at challenge creation: admin_only / public_vote / hybrid.
MVP implements all three. UI adapts per challenge config.

**D6 — Visibility**
Full public. Challenge list, detail, gallery, winner surfaces all
accessible without authentication.

**D7 — Scope out**
Statistics/analytics, self-serve challenge creation, multilingual
support, automated prize disbursement, comment threads, follow systems —
all deferred.

**D8 — Creator profile included (minimal)**
`/u/<handle>` with role badge, bio (200 chars), Instagram + 3 links,
avatar, submissions grid. Full portfolio editor is Phase 2.6.

**D9 — Positioning**
Challenge as showcase vehicle. Winner submissions auto-pin to existing
YAGI Showcase surface (preserved in Phase 2.1 G6 middleware fix).

**D10 — First challenge seeding**
Platform launch only. No seed challenge in SPEC. First challenge created
manually by Yagi post-launch with full control over timing and content.

---

## Business context verified

- Target users: AI creators/studios attracted via existing YAGI Instagram
  (AI idol channel, ~10K followers) and B2B client network (11 client
  companies)
- Strategic value: (a) creator pool formation, (b) Studio role = potential
  B2B client pipeline, (c) SEO content via challenge pages, (d) Showcase
  surface gets a continuous content supply
- Revenue connection: indirect (pipeline building); direct revenue model
  deferred to Phase 3

## Cost estimate

- Build: 20-25 engineering hours (per gate estimates)
- Operational: +$10/month R2 storage (trivial)
- Ongoing admin work: ~2-4 hours per challenge lifecycle (create, judge,
  announce)

## Risk assessment

- LOW: DB schema (extends existing patterns; Phase 2.1 G2 learnings applied)
- MEDIUM: R2 direct-upload flow (new surface, CORS + signed-URL patterns
  not previously used in repo)
- LOW: RLS policy correctness (pattern-matched against preprod_frame_*)
- MEDIUM: Submission edit race conditions (two submissions from same user
  within 1s → rate limit enforcement)
- LOW-MEDIUM: Handle claim squatting (mitigate with 90-day lock + reserved
  list)

Mitigations integrated into SPEC §G1-G8 via stop points and acceptance
criteria.

## Phase 2.6 readiness

After Phase 2.5 CLOSEOUT, Phase 2.6 scope (Creator profile full editor,
brand polish, analytics foundation) can start with clean foundation.

---

## Approval signature

_Awaiting Yagi approval._

Sign with: **"APPROVED"** in chat or via commit message on this file.

Any requested modifications: list section + proposed change, Web Claude
revises draft, re-submits.
