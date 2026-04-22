# Phase 2.5 — Challenge MVP (Expedited)

**Phase ID**: 2.5
**Mode**: Expedited (ADR-005)
**Duration target**: 1 working day (2026-04-24 or as soon as Phase 2.1 closes)
**Owner**: 야기 (CEO) + Builder
**Blocks on**: Phase 2.1 SHIPPED

---

## 0. Why this phase

KAICF context gave YAGI Workshop its first defensible B2B offering: **brand-sponsored AI content challenges**. A brand (Samyang-type CPG, a gaming IP, etc.) hires YAGI to run a public AI-content contest. The brand provides brief + prize; YAGI provides:

1. A public page creators submit to.
2. A distribution push so submissions land on SNS, amplifying the brand.
3. An admin view so YAGI + the brand can review submissions.

Phase 2.5 ships **only the public page + submission capture + admin view**. Everything else — distribution automation, voting, payouts, creator accounts — is Phase 2.6+ territory. This is a hypothesis-test: can we take a brief and have a live challenge page in < 1 day?

## 1. Scope — what ships

### 1.1 One public challenge page — `/challenge/[slug]`

Frame from `UI_FRAMES.md` (Editorial/Marketing frame). Contents top-down:
- Hero — challenge title, brand mark, deadline countdown, submission CTA.
- Brief — markdown rendered from the DB; 1–3 short sections.
- Prize + eligibility — key-value list.
- Submission form (inline, no modal): email + submission URL (image or video) + one-line caption + two consent checkboxes (terms / marketing-use license). **Not pre-checked.**
- Footer — "Powered by YAGI Workshop".

No account required. Submission creates a pending row; a verification email is sent with a one-time link to confirm ownership.

### 1.2 Admin view — `/admin/challenges/[slug]/submissions`

Uses existing `/admin/*` shell (Phase 1.2 output).
- Table: created_at, email, caption, media thumbnail, status (pending/verified/approved/rejected).
- Row actions: approve, reject (both update status only; no email yet — Phase 2.6).
- Filter by status. Export CSV (existing util).

### 1.3 Challenge creation — admin-only, minimal

No UI. A YAGI internal user creates a challenge via a migration or SQL function. This is acceptable for the hypothesis test — we run 1 challenge before building the CMS.

### 1.4 Schema

Two new tables, one new storage bucket (for submission media if direct upload, else URL only for 2.5):

```sql
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title_ko text NOT NULL,
  title_en text,
  brand_name text NOT NULL,
  brand_logo_url text,
  brief_ko text NOT NULL,
  brief_en text,
  prize_ko text NOT NULL,
  prize_en text,
  eligibility_ko text,
  eligibility_en text,
  deadline_at timestamptz NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  email citext NOT NULL,
  caption text NOT NULL CHECK (length(caption) <= 200),
  media_url text NOT NULL,
  terms_accepted_at timestamptz NOT NULL,
  marketing_license_accepted_at timestamptz NOT NULL,
  verification_token uuid NOT NULL DEFAULT gen_random_uuid(),
  verified_at timestamptz,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','approved','rejected','spam')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  ip_hash text,
  UNIQUE (challenge_id, email, media_url)
);

CREATE INDEX ON challenge_submissions (challenge_id, status, created_at DESC);
```

**RLS**:
- `challenges`: public `SELECT` where `published_at IS NOT NULL AND deadline_at > now()` (or past for archival). Write: admin only.
- `challenge_submissions`: public `INSERT` with rate-limit + honeypot (see §1.5). `SELECT` only admin or the submitter-by-token. No public update/delete.

### 1.5 Abuse mitigation (minimum)

- Rate limit: IP-hashed, 5 submissions / hour / IP.
- Honeypot field — any non-empty value → silent drop.
- Verification email required to flip `pending` → `verified`. Unverified rows don't show in public counts.
- Caption length ≤ 200.
- `media_url` validated against whitelist of hosts (Instagram, TikTok, YouTube, X, Vimeo, Imgur — extensible).

No Turnstile / captcha in 2.5. If abuse rate warrants it, Phase 2.6.

### 1.6 i18n

ko / en via `next-intl` (existing). Challenge content is per-locale columns (1.4 above); UI copy goes in the standard locale files.

## 2. Out of scope (hard)

- No creator accounts / authentication for submitters. Email only.
- No voting, no leaderboard, no social feed.
- No admin CMS for creating challenges — SQL / migration.
- No payout / prize disbursement workflow.
- No media upload to YAGI storage — URLs only (creator hosts).
- No reply/notify-creator email on approval/rejection (Phase 2.6).
- No analytics dashboard — existing logs only.
- No Slack / Discord webhook integration.
- No generated OG images per-challenge — static OG using brand logo + title via existing OG util.
- No multi-brand branding system — brand shown via `brand_name` + `brand_logo_url`, no custom theming.

## 3. Success criteria (binary, measurable end of day 1)

- [ ] `/challenge/[slug]` renders in both ko and en with a seeded test challenge.
- [ ] Submission flow end-to-end: form submit → verification email → click link → status flips to `verified`.
- [ ] `/admin/challenges/[slug]/submissions` lists submissions, filter works, approve/reject writes status.
- [ ] Rate-limit trips on 6th request from same IP within an hour.
- [ ] Honeypot drops non-empty payloads silently.
- [ ] RLS: unauthenticated cannot `SELECT` from `challenge_submissions`.
- [ ] CSV export works.
- [ ] Codex K-05 returns CLEAN or MEDIUM-only-fixed.

## 4. Constraints (ADR-005 Expedited conditions check)

| ADR-005 condition                                 | Status |
|---------------------------------------------------|--------|
| 1. Duration ≤ 2 days                              | ✅ 1 day |
| 2. CEO in the loop                                | ✅ |
| 3. No new design tokens / primitives / patterns   | ⚠️  see §6 |
| 4. No cross-phase schema changes beyond plan      | ✅ |
| 5. SPEC ≤ 300 lines                                | ✅ |

## 5. Groups

### G1 — Migration + RLS

**Out**: `supabase/migrations/{ts}_phase_2_5_challenges.sql` applied via Supabase MCP; `phase-2-5/G1_SCHEMA.md`.
**Est**: 1h.

### G2 — Public `/challenge/[slug]`

**Out**: route + page + brief-markdown renderer + submission form (React Hook Form + Zod).
**Constraint**: all primitives from existing `COMPONENT_CONTRACTS.md`. If a new primitive is needed, halt (§6).
**Est**: 2.5h.

### G3 — Verification email + webhook

**Out**: edge-function or route handler that issues a signed link; incoming link handler that flips `verified_at`.
**Reuse**: existing Resend + notify-dispatch (Phase 2.0 G1).
**Est**: 1h.

### G4 — Admin list + actions

**Out**: `/admin/challenges/[slug]/submissions` page + 2 row actions + status filter + CSV.
**Est**: 1.5h.

### G5 — Abuse guards

**Out**: rate-limit middleware + honeypot field + URL host validator.
**Est**: 1h.

### G6 — K-05 Engineering Review

**Out**: `gates/phase-2-5/ENGINEERING_APPROVED.md`. Codex K-05 called once with reasoning=high, model=gpt-5.4. HIGH findings halt.
**Est**: 30m + fixes.

### G7 — QA smoke

**Out**: `gates/phase-2-5/QA_SMOKE.md`. Playwright if cheap; manual browser check otherwise. 8 success-criteria items.
**Est**: 45m.

### G8 — Seed one real challenge + closeout

**Out**: real seeded challenge for internal QA demo (can be private — `published_at IS NULL`). HANDOFF + Telegram + tag.
**Est**: 30m.

## 6. §3 trigger audit (ADR-005 condition 3)

The following components are used:
- Hero / Section / Card / Input / Textarea / Checkbox / Button / Form / Toast — all in `COMPONENT_CONTRACTS.md`.
- Table / Badge / DropdownMenu (admin view) — all in `COMPONENT_CONTRACTS.md`.
- Countdown display — **not** in contracts. **Decision**: compose from existing `Typography.Title + Typography.Mono + a setInterval hook`. No new primitive. If visual design requires a custom countdown component, halt.

Other:
- No new color tokens.
- No new typography roles.
- No new `UI_FRAMES.md` frames — Editorial/Marketing frame already covers the public page; Admin List frame covers the admin view.

Therefore ADR-005 condition 3 holds.

## 7. Gate artifacts (Expedited)

| Gate | Artifact                                          |
|------|---------------------------------------------------|
| 1    | `gates/phase-2-5/CEO_APPROVED.md` (pre-filled)    |
| 4    | `gates/phase-2-5/ENGINEERING_APPROVED.md`         |
| 6    | `gates/phase-2-5/QA_SMOKE.md`                     |

Gates 2, 3, 5 skipped per ADR-005 — no new design.

## 8. Notes for Builder

- Supabase project: `jvamvbpxnztynsccvcmr`.
- New tables named `challenges` and `challenge_submissions` — no `preprod_` prefix. These are production tables from day 1. Realtime: none needed.
- Admin view lives under existing admin shell. If admin auth is already middleware-enforced, no additional checks; else add.
- CSV util path: reuse existing one from Phase 1.5 invoicing if present.
- Email template: new template `challenge-verification` added to Resend template store; same dispatcher path as other events.
- OG image: existing `/og/[type]/[id]` route — add `type=challenge` branch.
