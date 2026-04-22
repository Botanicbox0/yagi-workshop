# Phase 2.5 — Public Challenge Platform (MVP)

**Status:** DRAFT (awaiting CEO approval)
**Authors:** Web Claude + 야기
**Date:** 2026-04-23
**Duration target:** 1-week sprint (expedited per ADR-005)
**Blocks on:** Phase 2.1 CLOSEOUT (G1-G8 all green)

---

## §0 — Why

YAGI Workshop needs a public surface that converts organic interest into
community membership and creator pipeline. Phase 2.5 delivers a minimum
viable Challenge platform: YAGI runs branded/partner-sponsored AI content
competitions; creators submit work; public browses gallery; winners get
permanent surface on YAGI Showcase.

**Positioning: Challenge as showcase vehicle.** Challenges are the mechanism
to (a) attract AI creators/studios as registered users, (b) generate public
SEO content, (c) feed winners into the existing Showcase surface, (d) build
a client pipeline (Studio role → potential B2B customers).

**Non-goals (explicit):**
- Full portfolio editor for profiles (Phase 2.6+)
- Self-serve challenge creation by external parties (Phase 3+)
- Statistics and analytics dashboards (Phase 3+)
- Multilingual challenges (Korean only)
- Automated prize disbursement (manual process)

---

## §1 — Architecture overview

### User model (3 roles)

| Role | Can submit | Can vote | Can comment | Profile surface |
|---|---|---|---|---|
| AI Creator | ✅ | ✅ | ✅ | `/u/<handle>` |
| AI Studio | ✅ | ✅ | ✅ | `/u/<handle>` |
| Observer | ❌ | ✅ | ✅ | `/u/<handle>` (minimal) |

Role is mutable post-signup with audit log. One user = one role at a time.
Upgrade path: Observer → Creator/Studio (free), Creator ↔ Studio (free, one
direction per 30 days).

### Challenge lifecycle

```
DRAFT (admin-only) 
  → OPEN (public, accepting submissions) 
  → CLOSED_JUDGING (public gallery visible, submissions locked)
  → CLOSED_ANNOUNCED (winners published, showcase-pinned)
  → ARCHIVED (permanent public URL, read-only)
```

Admin controls all transitions. No automatic state changes.

### Submission model (Hybrid, YAGI-first)

Per-challenge configuration (JSONB) declares accepted input types:
- `native_video`: up to 60 seconds, up to 500MB, mp4 only (stored in R2)
- `youtube_url`: optional supplementary link for extended version
- `image`: up to 5 images, jpg/png, up to 10MB each
- `pdf`: up to 1 file, up to 20MB
- `text_description`: required, 50-2000 chars

Each challenge admin specifies which are `required` vs `optional`.

### Judging model

Per-challenge configuration declares mode:
- **`admin_only`** — YAGI Admin picks winners, no public visibility of process
- **`public_vote`** — Registered users vote (1 vote per user per challenge),
  weighted count determines winner
- **`hybrid`** — Admin + public vote, admin declares weight ratio at challenge
  creation (e.g., 70% admin / 30% public)

MVP implements all three modes. UI adapts per challenge config.

---

## §2 — Success criteria (Phase 2.5 closeout requires ALL)

1. Unauthenticated user can browse `/challenges`, view open challenge at
   `/challenges/[slug]`, see gallery at `/challenges/[slug]/gallery` without
   any login prompt.
2. User signup flow asks for role (Creator/Studio/Observer) + mandatory
   Instagram handle + handle (URL-safe username). Role is stored and
   queryable.
3. Creator/Studio can submit to an open challenge. Submission UI dynamically
   renders based on challenge's `submission_requirements` config. Observer
   sees "Upgrade to submit" CTA, not disabled button.
4. Admin can create challenge via a minimal internal form at `/admin/
   challenges/new` (not production-grade UI, sufficient to set fields).
5. Admin can advance challenge state (OPEN → CLOSED_JUDGING → 
   CLOSED_ANNOUNCED). State transition emits notification events.
6. Public gallery renders submissions in real-time as they are accepted
   (realtime subscription confirmed working post-Phase-2.1-G2 fix).
7. Admin can designate winners during CLOSED_JUDGING state. On transition
   to CLOSED_ANNOUNCED, winner submissions auto-pin to Showcase.
8. Creator/Studio profile at `/u/<handle>` displays: display name, role
   badge, Instagram link, 1-3 external links, bio (max 200 chars), avatar
   (optional), grid of their challenge submissions across all challenges.
9. Email notifications fire via existing Resend pipeline: (a) submission
   confirmation, (b) challenge closing reminder 24h before deadline, 
   (c) winner announcement.
10. All new tables have RLS policies; public-read policies for
    submissions/challenges/profiles are SELECT-only; writes restricted by
    role and ownership.

---

## §3 — Gate structure (G1-G8)

Per ADR-005 expedited protocol: each gate self-contained, autonomous
execution within gate, human touchpoint only at specified stop points.

### G1 — Database + auth extension
**Duration target:** 2-3 hours  
**Files:** new migration file  
**Stop point:** pre-apply review of migration by Yagi

Tasks:
1. Create tables:
   - `user_profiles` (1:1 with auth.users, stores role + handle + instagram + bio + avatar_url)
   - `creators` (FK to user_profiles, display_name)
   - `studios` (FK to user_profiles, studio_name, contact_email, member_count)
   - `challenges` (core entity, all lifecycle fields, JSONB submission_requirements, JSONB judging_config)
   - `challenge_submissions` (FK to challenge + submitter, JSONB content fields, status)
   - `challenge_votes` (FK to submission + voter, unique constraint on (challenge_id, voter_id))
   - `challenge_judgments` (FK to challenge + submission + admin, score, notes)
   - `challenge_winners` (FK to challenge + submission, rank, announced_at)
2. RLS policies per success criterion #10
3. Add `challenges` + `challenge_submissions` + `challenge_votes` +
   `challenge_winners` to `supabase_realtime` publication
4. REPLICA IDENTITY DEFAULT for all new tables (PK sufficient)
5. External-prereq: new R2 bucket `yagi-challenge-submissions` provisioned
   (handled outside migration; document in CLOSEOUT)

Acceptance:
- `supabase db reset` reproduces full schema from migrations
- All tables queryable with correct RLS
- Realtime publication membership verified (learned from Phase 2.1 G2)

### G2 — Auth flow + role selection
**Duration target:** 3-4 hours  
**Stop point:** none (internal)

Tasks:
1. Extend existing signup (email + password OR magic link) with post-signup
   role selection step
2. Conditional field rendering:
   - Creator: display_name (required), bio (optional)
   - Studio: studio_name (required), contact_email (required, default to
     signup email), member_count (select 1-5, 6-10, 11+)
   - Observer: handle is the display
3. Handle validation: URL-safe, 3-30 chars, lowercase letters + numbers +
   underscore, globally unique, not in a reserved list
4. Instagram handle validation: regex + uniqueness not required (multiple
   users can claim; just stored)
5. Post-signup redirect to `/u/<handle>` or `/onboarding/complete`
6. Handle change: allowed once per 90 days, old handles reserved (no
   squatting)

Acceptance:
- Full signup → role → profile creation round-trip
- Tsc clean
- E2E smoke via curl-based auth API calls

### G3 — Public challenge surfaces
**Duration target:** 4-5 hours  
**Stop point:** Yagi visual review of challenge list + detail page

Tasks:
1. Route `/challenges` — server component, lists OPEN + CLOSED_ANNOUNCED
   + ARCHIVED challenges. Card layout per design-system COMPONENT_CONTRACTS.
2. Route `/challenges/[slug]` — challenge detail page with:
   - Hero section (title, sponsor info if any, hero media)
   - Description (markdown-rendered)
   - Submission requirements display
   - Timeline (open date, close date, announcement date)
   - CTA: "Submit" (if Creator/Studio) / "Sign up to submit" (if Observer
     or unauthenticated) / "Submissions closed" (if past OPEN)
3. Route `/challenges/[slug]/gallery` — grid of submissions, realtime
   subscription, lazy-loaded media, shows submitter handle linking to
   profile
4. Middleware matcher update: `/challenges` excluded from intl redirect
   (learned from Phase 2.1 G6 showcase fix — same pattern)
5. SEO: MetadataRoute generation per challenge (title, description, OG
   image — can default to challenge hero media)

Acceptance:
- Public browsing works without any auth session
- Gallery receives realtime updates when new submissions land
- Design-system compliance per Phase 2.5 launchpad audit findings
- No broken middleware routing (confirm with curl on /challenges + 
  /challenges/test-slug)

### G4 — Submission flow
**Duration target:** 4-5 hours  
**Stop point:** Yagi reviews submission form UX

Tasks:
1. Route `/challenges/[slug]/submit` (requires auth + Creator/Studio role)
2. Upload flow:
   - Video: direct-to-R2 via signed upload URL (server issues URL,
     client uploads, server confirms)
   - Image: same pattern
   - PDF: same pattern
   - YouTube URL: validation (URL format + channel ownership check deferred
     to Phase 2.6; MVP accepts any valid YouTube URL)
   - Text description: server-side validation + XSS sanitization
3. Submission state: CREATED → PROCESSING (media validation) → READY
4. Post-submit: redirect to `/challenges/[slug]/gallery` with
   newly-submitted item highlighted (anchor link)
5. Validation errors surface inline; no all-at-end blob errors
6. Rate limit: 1 submission per user per challenge (DB constraint); edit
   allowed until challenge closes (full replacement, not incremental)

Acceptance:
- Creator and Studio both can submit
- Observer cannot (CTA redirects to role upgrade page)
- Media files land in R2 correctly with proper content-type
- DB row reflects JSONB content structure per challenge requirements
- Rate limit enforced

### G5 — Admin challenge management
**Duration target:** 3-4 hours  
**Stop point:** none (admin surface, internal)

Tasks:
1. Route `/admin/challenges` — list all challenges, filter by state
2. Route `/admin/challenges/new` — creation form:
   - Basic fields: title, slug (auto-generated + editable), description,
     hero media, timeline dates
   - `submission_requirements` — form that builds JSONB (checkbox for each
     accepted type + configuration sub-fields)
   - `judging_config` — radio for mode + if hybrid, weight slider
3. Route `/admin/challenges/[slug]/edit` — same form, edits
4. Route `/admin/challenges/[slug]/judge` — submissions list with judging
   UI (score + notes per submission, or pick winner if admin_only mode)
5. Route `/admin/challenges/[slug]/announce` — winner selection, transitions
   state to CLOSED_ANNOUNCED, auto-pins winner submissions to showcase
6. Admin role gating: middleware check against user_profiles.role =
   'admin' (admin role is a 4th internal role, not user-facing)

Acceptance:
- Full challenge creation → edit → judge → announce workflow possible
- State transitions logged with timestamp + admin_id
- Winners correctly pinned to showcase

### G6 — Profile surface (minimal)
**Duration target:** 2-3 hours  
**Stop point:** none (Yagi review on wake OK)

Tasks:
1. Route `/u/<handle>` — profile page:
   - Avatar, display name, role badge (Creator / Studio / Observer)
   - Bio (max 200 chars, markdown: bold/italic/link only)
   - External links (Instagram required-display, up to 3 additional)
   - Submissions grid (all submissions across all challenges, public only)
   - "Edit profile" button (visible to owner only)
2. Route `/settings/profile` — edit form:
   - Display name / studio name (role-dependent)
   - Handle (with 90-day lock check)
   - Instagram handle
   - Up to 3 external links (validated URLs)
   - Bio (200 char max)
   - Avatar upload (R2, max 2MB, square crop client-side)
3. Profile visibility: always public (anyone with handle can view)
4. Design-system compliance (per Phase 2.5 launchpad audit)

Acceptance:
- Public profile page renders for any valid handle
- Owner can edit; non-owners see no edit affordance
- Grid correctly aggregates submissions across challenges

### G7 — Notifications + realtime glue
**Duration target:** 2-3 hours  
**Stop point:** none

Tasks:
1. Notification events for:
   - Submission confirmed (email to submitter)
   - Challenge closing in 24h (email to all submitters + subscribed
     observers)
   - Challenge announced (email to all submitters, personalized: winner
     vs participant)
2. Email templates: plain functional design per design-system (no heavy
   styling, Korean only)
3. Realtime verification: `challenge_votes` and `challenge_submissions` in
   publication, tested with two-browser smoke (doc for Yagi morning QA)
4. Notification preferences: existing user preferences extended with
   "challenge_updates" toggle (default ON)

Acceptance:
- All 3 notification types fire correctly
- Email delivery confirmed via notification_events.email_sent_at
- Realtime smoke documented

### G8 — Codex K-05 + closeout
**Duration target:** 2-3 hours  
**Stop point:** Codex HIGH findings → autopilot halts per ADR-005

Tasks:
1. Run Codex K-05 engineering review on full Phase 2.5 diff
2. Address MEDIUM findings per ADR-005 expedited triage (fix in place if
   <20 min, else append to Phase 2.6 BACKLOG)
3. Update HANDOFF.md: Phase 2.5 DONE
4. Write CLOSEOUT.md summarizing all 8 gates + Phase 2.6 entry readiness
5. Commit: "chore(phase-2-5): G8 closeout — Challenge platform SHIPPED"
6. Push to origin/main

Acceptance:
- Codex CLEAN or MEDIUM-only (HIGH → halt)
- All 10 success criteria verified
- Phase 2.6 entry not blocked (document any blockers clearly)

---

## §4 — Out-of-scope clarifications

### Phase 2.6 candidates (scoped separately)
- Rich profile editor (multiple media, editorial layout, curation)
- Challenge creation UI for external partners (still Admin-gated but
  sophisticated)
- Analytics (view counts, submission velocity, regional distribution)
- Brand polish sprint (robots.txt from 2.1 backlog, sitemap.xml, OG image
  defaults, meta standardization)
- Comment threads on submissions
- Follow/follower system

### Phase 3 candidates
- Self-serve challenge creation (third-party partners without YAGI pinging)
- Monetization (paid sponsored challenges, entry fees, prize disbursement)
- Mobile app surface
- Social graph features

---

## §5 — Dependencies on Phase 2.1 outputs

Phase 2.5 G1 migration **requires** Phase 2.1 baseline to be clean. Specifically:
- `user_profiles` extends existing `auth.users` — verify Phase 2.0 baseline
  doesn't already introduce collision
- `supabase_realtime` publication membership fix (Phase 2.1 G2) must be
  applied before new tables are added to it
- POPBILL guard (Phase 2.1 G4) — unrelated to Phase 2.5, no coupling
- Showcase middleware fix (Phase 2.1 G6) — **pattern inherited** for 
  `/challenges` exclusion
- Design-system audit findings (Phase 2.5 launchpad X1) — inform
  component-level decisions during G3/G6

---

## §6 — Open questions (to be resolved before or during execution)

**Q1 — Admin role bootstrap**
How is the first admin user promoted? DB-level update? Magic CLI? Seed
migration? Proposal: one-time seed migration + environment variable
(`FIRST_ADMIN_EMAIL`) that promotes that user on first signup.

**Q2 — R2 bucket CORS**
`yagi-challenge-submissions` needs CORS config for direct-upload-from-
browser flow. Policy documentation lives where?

**Q3 — Video transcoding**
MVP accepts mp4 only, up to 60s. Is server-side transcoding (ffmpeg) in
scope? Proposal: NO. Client-side validation rejects non-mp4. If users
submit 1080p 60fps mp4, accept as-is. Transcoding → Phase 3.

**Q4 — Handle reserved list**
Prevent `admin`, `yagi`, `challenges`, `submit`, `gallery`, `settings`,
etc. from being claimed as user handles. Source of truth for reserved
list?

**Q5 — Submission edit window**
Can user edit submission after challenge closes (CLOSED_JUDGING state)?
Proposal: NO. CLOSED_JUDGING freezes submissions completely.

**Q6 — Vote reveal timing**
Is vote count visible during OPEN state, or hidden until CLOSED_ANNOUNCED?
Proposal: visible during OPEN (builds hype), frozen at CLOSED_JUDGING,
revealed at CLOSED_ANNOUNCED.

---

## §7 — Execution protocol

Phase 2.5 is ADR-005 expedited. Execution rules:
- No Gate 2 (CEO Review) — this SPEC acts as Gate 1+2 combined (CEO 
  pre-approves via inline decisions D1-D10)
- No Gate 3 (Engineering Plan) — gate structure above acts as plan
- Gates 1-8 execute autonomously with specified stop points
- Codex K-05 runs once at G8 (per ADR-005)
- Any scope addition during execution requires stop + Yagi approval
- HIGH Codex findings halt autopilot
- Git push after G8 closeout
- Telegram on: G8 complete, any stop point, any HIGH finding

---

**END OF SPEC DRAFT**
