# Gate 1 — CEO Approval (Phase 2.5)

**Protocol**: ADR-005 Expedited
**Phase**: 2.5 — Challenge MVP
**Date**: 2026-04-23 (activates when Phase 2.1 SHIPPED)

---

## Decisions requiring CEO confirmation

### D1. Phase framing — hypothesis test, not full product
We ship **one public challenge page + submission capture + admin view** in 1 day. Everything else (voting, payouts, creator accounts, distribution automation) is Phase 2.6+. If this phase ships and a brand runs a real challenge, that's the validation signal to expand.

### D2. Submitter identity — email-only, no account
Submitters give email + URL + caption. Verification email confirms ownership. No password, no signup, no OAuth. Rationale: lowest friction for a 1-day test. Account system is a Phase 2.6 debate.

### D3. Media — URL only, no upload
Creators host their media on Instagram / TikTok / YouTube / X / Vimeo / Imgur and paste the URL. We whitelist hosts. No direct upload to YAGI storage — that's a Phase 2.6 decision (storage quota, moderation pipeline, thumbnail extraction).

### D4. Challenge creation — SQL, not CMS
First challenge is seeded via migration or admin SQL. No create-challenge UI in 2.5. Rationale: we will create 1–2 challenges manually before paying the cost of a CMS.

### D5. Abuse mitigation — minimum three layers
Rate limit (IP-hashed, 5/h) + honeypot + verification email. No Turnstile/captcha in 2.5. If abuse materializes on first real challenge, add in 2.6.

### D6. Branding — brand name + logo URL fields, no custom theme
Each challenge shows brand name + logo but uses YAGI's design system unchanged. No per-brand theming or custom colors. Rationale: §3 ADR-005 condition would otherwise fail; custom theming belongs in Phase 3.0+.

### D7. Gates skipped per ADR-005
Gate 2 (Design Consultation), Gate 3 (Plan Design Review), Gate 5 (Design Review). §6 trigger audit in SPEC shows zero new primitives required. If an audit fails mid-build (new primitive surfaces), halt.

### D8. Admin view — reuse existing admin shell, minimum actions
Status filter + approve/reject + CSV export. No email-on-approval, no bulk actions, no comments. All are Phase 2.6.

### D9. i18n — ko and en at launch
Challenge content has per-locale columns. UI copy in existing locale files. Brand-provided content may be ko-only initially — SPEC allows `title_en`, `brief_en`, etc. to be null; renderer falls back to ko.

### D10. Not shipping in 2.5
- Creator accounts or login
- Voting, leaderboard, likes, comments
- Payout workflow
- Slack/Discord/Telegram webhooks for submissions
- Per-challenge OG image generation (static OG from brand logo + title)
- Analytics dashboard
- Multi-admin review workflow with sign-off

---

## CEO Response

```
APPROVED — 야기 — 2026-04-23
```

All 10 decisions (D1–D10) accepted as pre-filled. No edits requested.
Approval recorded per ADR-005 pre-filled pattern.
Activation conditional on Phase 2.1 SHIPPED.

---

## Pre-conditions

- Phase 2.1 SHIPPED (yagi-internal seeded, H1 resolved, POPBILL guard hardened).
- ADR-005 Accepted.
- Supabase MCP reachable against `jvamvbpxnztynsccvcmr`.
- Resend templates accessible.
- Design system (PRINCIPLES / UI_FRAMES / TYPOGRAPHY_SPEC / COMPONENT_CONTRACTS v1.1 / INTERACTION_SPEC / ANTI_PATTERNS) committed.

---

## On approval, Builder will

1. Commit this file as `gates/phase-2-5/CEO_APPROVED.md`.
2. Apply G1 migration via Supabase MCP.
3. Telegram: "Phase 2.5 Gate 1 approved, build starting."
4. Open an atomic commit stream G1 → G8.
