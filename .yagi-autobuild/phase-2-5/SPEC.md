# Phase 2.5 — Public Challenge Platform (MVP)

**Status:** REVISED v2 (2026-04-23, post-launchpad X1+X2)
**Authors:** Web Claude + 야기; v2 revision by Builder per X2 review (4 CRITICAL_BLOCKING + 9 HIGH) and X1 design audit (13 CRITICAL)
**Date:** 2026-04-23
**Duration target:** 1-week sprint (expedited per ADR-005)
**Blocks on:** Phase 2.1 CLOSEOUT ✅ (shipped) + pre-G1 share-surface retoken (X1 `[BLOCKS 2.5]` fixes)

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
direction per 30 days — tracked in `profiles.role_switched_at`).

### §1.2 Role orthogonality with Phase 1.1 `user_roles` (v2 — X2 CRITICAL #3)

Phase 2.5 roles (`Creator`/`Studio`/`Observer`) are **orthogonal** to Phase 1.1
`user_roles` (`yagi_admin` global, `workspace_admin`/`workspace_member`
workspace-scoped).

- Phase 2.5 role lives on `profiles.role` (global, single value per user).
- Phase 1.1 `user_roles` is untouched; workspace access still reads from
  `is_ws_admin(uid, wsid)` / `is_ws_member(uid, wsid)`.
- A single user can simultaneously be a Creator (for challenge participation)
  AND a `workspace_admin` in workspace X (for client portal access).
- RLS boundary:
  - `challenge_submissions`/`challenge_votes`/`challenges` RLS reads only
    `profiles.role` (Creator/Studio/Observer semantics).
  - `projects`/`meetings`/other workspace-scoped tables RLS reads only
    `user_roles` (unchanged from Phase 1.x).
- **Admin gating for Phase 2.5 admin routes (`/admin/challenges/*`) uses the
  existing `is_yagi_admin(auth.uid())` RPC from Phase 1.1, NOT a new
  `profiles.role='admin'` value.** There is no 4th role. See §3 G5 for the
  middleware gate.

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
6. (v2 per X2 HIGH #3) Public gallery: a new submission inserted via admin
   test or production submit flow appears in an already-open
   `/challenges/[slug]/gallery` browser tab within 5 seconds of the row
   INSERT, no page reload required. Verified with 2-browser smoke
   documented in CLOSEOUT. Requires publication membership from G1 Task 7.
7. Admin can designate winners during `closed_judging` state. On transition
   to `closed_announced`, winner rows are inserted into
   `showcase_challenge_winners` (junction table per G1 Task 3), making
   them appear in `/showcase` listings via UNION query.
8. Creator/Studio profile at `/u/<handle>` displays: display name, role
   badge, Instagram link, 1-3 external links, bio (max 200 chars), avatar
   (optional), grid of their challenge submissions across all challenges.
9. (v2 per X2 HIGH #4) Email notifications fire via existing Resend
   pipeline:
   - (a) submission confirmation email fires within 60s of submission,
     verified via `notification_events.email_sent_at` non-null on the
     emitted row;
   - (b) 24h-before reminder: verified by setting a test challenge's
     `close_at = now() + interval '24h 1min'` and observing dispatch
     within 15min (cron `*/15 * * * *`, see G7);
   - (c) winner announcement fires within 60s of
     `challenges.state='closed_announced'` transition.
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

Tasks (v2 — X2 CRITICAL #1 + HIGH #5/#8/#9 applied):

1. **Extend existing `profiles` table** (Phase 1.1) via `ALTER TABLE`, do NOT
   create a new `user_profiles`:
   ```sql
   ALTER TABLE public.profiles
     ADD COLUMN role text CHECK (role IN ('creator','studio','observer')),
     ADD COLUMN handle citext UNIQUE,
     ADD COLUMN instagram_handle text,
     ADD COLUMN bio text CHECK (bio IS NULL OR char_length(bio) <= 200),
     ADD COLUMN avatar_url text,
     ADD COLUMN role_switched_at timestamptz,
     ADD COLUMN handle_changed_at timestamptz;
   ```
   Existing `profiles.avatar_url` lives in the `avatars` bucket from
   Phase 1.1; reuse. No separate `user_profiles`. See `contracts.md` Phase 1.1.
   `handle_changed_at` is the source of truth for the 90-day change lock
   referenced in §3 G2 Task 6 + §6 Q7 (v2 Codex MED-2 resolution —
   previously §624 referenced the column without G1 adding it).

2. Create role-specific tables referencing `profiles.id` (1:1 for Creator/Studio):
   - `creators` (id uuid PK FK → profiles.id, display_name text NOT NULL)
   - `studios` (id uuid PK FK → profiles.id, studio_name text NOT NULL,
     contact_email citext, member_count text CHECK IN ('1-5','6-10','11+'))
   - No separate table for Observer — an Observer is simply a `profiles` row
     with `role='observer'` and no `creators`/`studios` child row.

3. Create challenge-domain tables:
   - `challenges` (id uuid PK, slug citext UNIQUE **NOT NULL CHECK
     (slug !~ '^(new|gallery|submit|edit|judge|announce|admin)$')**,
     title, description_md, hero_media_url, state text CHECK IN
     ('draft','open','closed_judging','closed_announced','archived'),
     open_at, close_at, announce_at timestamptz,
     submission_requirements jsonb, judging_config jsonb,
     reminder_sent_at timestamptz NULL, created_by uuid FK → auth.users,
     created_at, updated_at)
   - `challenge_submissions` (id uuid PK, challenge_id FK, submitter_id FK
     → profiles.id, content jsonb, status text CHECK IN
     ('created','processing','ready','rejected') DEFAULT 'created',
     created_at, updated_at, UNIQUE (challenge_id, submitter_id))
   - `challenge_votes` (id, challenge_id FK, submission_id FK, voter_id FK,
     created_at, UNIQUE (challenge_id, voter_id))
   - `challenge_judgments` (id, challenge_id FK, submission_id FK, admin_id
     FK, score numeric, notes text, created_at)
   - `showcase_challenge_winners` **junction table** (submission_id FK →
     challenge_submissions, showcase_id FK → showcases, rank int,
     announced_at timestamptz, announced_by FK, UNIQUE (submission_id)).
     Per X2 HIGH #8: avoids altering `showcases.project_id` nullable, keeps
     the Phase 1.9 showcases contract intact, lets winners pin via
     `UNION ALL` in the `/showcase` list query.

4. **Extend existing `notification_preferences`** (Phase 1.8) via
   `ALTER TABLE`, not a new column block — per X2 HIGH #5:
   ```sql
   ALTER TABLE public.notification_preferences
     ADD COLUMN challenge_updates_enabled boolean DEFAULT TRUE;
   ```

5. **Reserved handles** (resolving Q4): seed `src/lib/handles/reserved.ts`
   (exported const array), NOT a DB table. Source of truth is the TS file;
   G2 validation reads from it. List at §6 Q4.

6. RLS policies (per success criterion #10):
   - `profiles`: existing SELECT RLS retained. UPDATE scoped to owner for
     `role`/`handle`/`instagram_handle`/`bio`/`avatar_url`.
   - `challenges`: SELECT policy allows anyone (no auth required) for states
     in (`open`,`closed_judging`,`closed_announced`,`archived`); admin INSERT/
     UPDATE gated by `is_yagi_admin(auth.uid())` (NOT a new admin role).
   - `challenge_submissions`: SELECT public; INSERT scoped to own + role IN
     ('creator','studio') + matching challenge is `open`; UPDATE own +
     challenge not yet `closed_judging`.
   - `challenge_votes`: SELECT public (counts); INSERT scoped to own voter +
     challenge is `open`; no UPDATE/DELETE.
   - `challenge_judgments`, `showcase_challenge_winners`: SELECT public;
     write gated by `is_yagi_admin`.

7. Add `challenges` + `challenge_submissions` + `challenge_votes` +
   `showcase_challenge_winners` to `supabase_realtime` publication. Use the
   `DO $$ IF NOT EXISTS ... END $$` idempotency pattern from Phase 2.1 G2
   migration (not bare `ALTER PUBLICATION`).

8. REPLICA IDENTITY DEFAULT for all new tables (PK sufficient).

9. External-prereq: R2 bucket `yagi-challenge-submissions` CORS + credentials
   — documented in CLOSEOUT. Fallback per X3 pre-flight: use Supabase Storage
   temporarily (new bucket `challenge-submissions` with signed-URL upload
   pattern copied from Phase 1.7 `team-channel-attachments`). Decision at G4
   time based on bucket provisioning status.

Acceptance:
- `supabase db reset` reproduces full schema from migrations (all new tables
  + ALTERs on `profiles` and `notification_preferences`).
- All tables queryable with correct RLS.
- Realtime publication membership verified via
  `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime'`
  returning the 4 new tables (Phase 2.1 H1 playbook).
- `profiles` + `notification_preferences` ALTERs backward-compatible: new
  `profiles` columns default to NULL (existing rows survive with NULL role,
  NULL handle, etc.); new `notification_preferences.challenge_updates_enabled`
  defaults to TRUE so existing users are opted-in to challenge notifications
  by default (matches Task 4 ALTER body). Existing rows survive.

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

Tasks (v2 — X2 CRITICAL #4 resolved; cites X1 audit completed):

**Precondition:** Share-surface retoken (X1 `[BLOCKS 2.5]` items 1-2-9) must be
committed before G3 starts. Phase 2.5 G3/G4/G6 UI inherits from share-surface
patterns; landing new UI on the current unretoken'd surface would propagate
token drift across Phase 2.5. See `.yagi-autobuild/design-audit/CRITICAL.md`
for the 3 `[BLOCKS 2.5]` items.

1. Route `/challenges` — server component, lists `open` + `closed_announced`
   + `archived` challenges. Layout uses UI_FRAMES Frame-2 (Browse) default
   (**table**, not cards) per `COMPONENT_CONTRACTS.md §5.6` status column
   alignment. Card variant is NOT introduced unless X1 audit ADRs a Card
   section first (ADR-005 forbidden trigger: no new variant mid-build).
2. Route `/challenges/[slug]` — challenge detail page using
   `COMPONENT_CONTRACTS.md §5.1` Button + `§5.2` Input + `§5.5` Modal
   primitives. No new primitives introduced. Hero, markdown description,
   requirements display, timeline, CTA.
3. Route `/challenges/[slug]/gallery` — grid of submissions, realtime
   subscription, lazy-loaded media, submitter handle links to `/u/<handle>`.
   Gallery uses the same table/card contract as `/challenges` list.
4. Middleware matcher update: `/challenges` already excluded from intl
   redirect (Phase 2.1 G6 preemptive — commit `5855dd0`). No change needed
   in G3. Add `u` to the matcher here for G6 (see G6 Task 1b below).
5. SEO: MetadataRoute generation per challenge.

Acceptance:
- Public browsing works without any auth session.
- Gallery receives realtime updates (5s SLA per §2 #6).
- **Design-system compliance against X1 audit** (`.yagi-autobuild/design-audit/CRITICAL.md`):
  zero new `text-gray-*` / `bg-gray-*` / `text-[NNpx]` / `bg-black` / `bg-white`
  hardcodes; zero new `rounded-xl`/`rounded-2xl`; all form fields use `<Input>`/
  `<Textarea>`/`<Label>`; all primary actions use `<Button>` (or the new `pill`
  variant if X1 #12 is applied).
- No broken middleware routing (curl `/challenges` + `/challenges/<slug>` + a
  fake slug to confirm 404 via our custom `not-found.tsx`).

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
   state to `closed_announced`, inserts winner rows into the
   `showcase_challenge_winners` junction table (per G1 Task 3). Showcase
   listing query `UNION ALL`s winner entries alongside normal `showcases`
   rows so existing Phase 1.9 showcase contract stays intact.
6. **(v2 per X2 CRITICAL #2)** Admin role gating uses the existing Phase 1.1
   `is_yagi_admin(auth.uid())` RPC. Middleware/layout for `/admin/challenges/*`
   routes checks this RPC and 403s otherwise. There is NO new
   `profiles.role='admin'` value — Phase 2.5 introduces 3 roles only
   (`creator`/`studio`/`observer`). Admin promotion uses the existing Phase 1.1
   pattern (INSERT INTO `user_roles` (`role='yagi_admin'`, `workspace_id=NULL`)).

Acceptance:
- Full challenge creation → edit → judge → announce workflow possible
- State transitions logged with timestamp + admin_id
- Winners correctly pinned to showcase

### G6 — Profile surface (minimal)
**Duration target:** 2-3 hours  
**Stop point:** none (Yagi review on wake OK)

Tasks (v2):

1. **Middleware matcher** (per X3 pre-flight): add `u` to the exclusion list
   in `src/middleware.ts`:
   ```ts
   "/((?!api|_next|_vercel|auth/callback|showcase|challenges|u|.*\\..*).*)"
   ```
   Mirrors the Phase 2.1 G6 fix (`5855dd0`). One-line change, verify via
   `curl http://localhost:3003/u/test-handle → HTTP 200` (not 307 redirect).

2. Route `/u/<handle>` — profile page:
   - Avatar, display name, role badge (Creator / Studio / Observer)
   - Bio (max 200 chars, markdown: bold/italic/link only)
   - External links (Instagram required-display, up to 3 additional)
   - Submissions grid (all submissions across all challenges, public only)
   - "Edit profile" button (visible to owner only)
3. Route `/settings/profile` — edit form:
   - Display name / studio name (role-dependent)
   - Handle (with 90-day lock check — see §6 Q7 below for CEO decision on rate)
   - Instagram handle
   - Up to 3 external links (validated URLs)
   - Bio (200 char max)
   - Avatar upload: **Supabase Storage `avatars` bucket** (Phase 1.1 existing),
     max 2MB, client-side crop to 512×512 JPEG. Do NOT use R2 for avatars —
     keeps Phase 1.1 contract intact.
3. Profile visibility: always public (anyone with handle can view)
4. **(v2 per X2 CRITICAL #4)** Design-system compliance referenced to X1
   audit outputs at `.yagi-autobuild/design-audit/CRITICAL.md` (completed
   2026-04-23). All profile form fields use `<Input>`/`<Textarea>`/`<Label>`
   primitives (`COMPONENT_CONTRACTS.md §5.2`); submissions grid uses the same
   Frame-2 (Browse) contract as `/challenges` gallery (§3 G3). Avatar upload
   uses the **existing Phase 1.1 `avatars` Supabase Storage bucket**
   (not R2 — see X1 CRITICAL #10 recommendation).

Acceptance:
- Public profile page renders for any valid handle
- Owner can edit; non-owners see no edit affordance
- Grid correctly aggregates submissions across challenges

### G7 — Notifications + realtime glue
**Duration target:** 2-3 hours  
**Stop point:** none

Tasks (v2 — X2 HIGH #6, #7, LOW #2 applied):

1. **(v2 per X2 HIGH #6)** Register new kinds in `src/lib/notifications/kinds.ts`:
   - `challenge_submission_confirmed` (severity: `medium`)
   - `challenge_closing_soon` (severity: `high`, debounced per user × challenge)
   - `challenge_announced_winner` (severity: `high`)
   - `challenge_announced_participant` (severity: `medium`)
   Update `SEVERITY_BY_KIND` registry. Add bilingual i18n templates in
   `messages/{ko,en}.json` under `notifications.events.<kind>.{title,body}`.
   Update `.yagi-autobuild/contracts.md` §Phase 2.5 notification matrix.

2. Emit sites:
   - `challenge_submission_confirmed` — emitted by submit Server Action
     after successful INSERT (email to submitter).
   - `challenge_closing_soon` — emitted by **new pg_cron job** (see Task 3
     below).
   - `challenge_announced_winner` / `_participant` — emitted by announce
     Server Action (G5 Task 5) when state transitions to `closed_announced`.
     Winners get `_winner`; all other submitters get `_participant`.
   - **No "subscribed observers" emit** in MVP (per X2 LOW #2). Observer
     subscription is a Phase 2.6 feature; MVP scope is submitters only.

3. **(v2 per X2 HIGH #7)** Add new pg_cron job `challenges-closing-reminder`
   on schedule `*/15 * * * *`:
   ```sql
   SELECT cron.schedule(
     'challenges-closing-reminder', '*/15 * * * *',
     $$ -- scan for challenges whose close_at ≈ now()+24h and emit reminder
        WITH expiring AS (
          SELECT id FROM challenges
          WHERE state='open'
            AND close_at BETWEEN now() + interval '23h 45min'
                             AND now() + interval '24h 15min'
            AND reminder_sent_at IS NULL
          FOR UPDATE SKIP LOCKED
        )
        -- emit notification_events rows + stamp reminder_sent_at
        ...
     $$
   );
   ```
   Idempotent via `reminder_sent_at` guard. Migration file creates the cron
   job via `SELECT cron.schedule(...)` — also seed the existing
   `notify-dispatch` cron pattern from Phase 1.8 (see Phase 2.2 BACKLOG
   §Infra seed migrations; tie those together in the same migration).

4. Email templates: plain functional design per design-system (no heavy
   styling, Korean only). Reuse `src/emails/notification-immediate.tsx`
   template pattern from Phase 1.8.

5. Realtime verification: `challenge_votes` and `challenge_submissions`
   confirmed in `supabase_realtime` publication from G1 Task 7.
   Two-browser smoke documented for Yagi manual QA queue (added to
   `.yagi-autobuild/YAGI-MANUAL-QA-QUEUE.md`).

6. Notification preferences: `challenge_updates_enabled` column already
   landed in G1 Task 4 ALTER (per X2 HIGH #5 reclassification). G7 only
   needs to wire the Edge Function `notify-dispatch` to honor this flag
   for the 4 new kinds.

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

## §5 — Dependencies on Phase 2.0 baseline + Phase 2.1 outputs

**Phase 2.0 baseline (shipped, contracts.md authoritative):**
- `profiles` (Phase 1.1) — ALTER'd in G1 Task 1, NOT replaced with a new
  `user_profiles`. No collision.
- `user_roles` + `is_yagi_admin(uid)` RPC (Phase 1.1) — admin gate for all
  `/admin/challenges/*` routes (G5 Task 6). Untouched by Phase 2.5.
- `notification_events` + `notify-dispatch` Edge Function + cron
  (Phase 1.8) — Phase 2.5 emits 4 new kinds, cron already wired.
- `notification_preferences` (Phase 1.8) — ALTER'd in G1 Task 4 for
  `challenge_updates_enabled`.
- `showcases` (Phase 1.9) — contract preserved; winners linked via new
  `showcase_challenge_winners` junction rather than ALTER (G1 Task 3).
- `avatars` Supabase Storage bucket (Phase 1.1) — reused for profile avatar
  uploads (G6 Task 3), not a new R2 bucket.

**Phase 2.1 outputs (shipped, `4bf7591..484ed09`):**
- `supabase_realtime` publication membership pattern (Phase 2.1 G2) — G1
  Task 7 reuses the `DO $$ IF NOT EXISTS` idempotency wrapper.
- Middleware `/showcase` + `/challenges` exclusion (Phase 2.1 G6) —
  preserved. G6 Task 1 extends the matcher to include `u` for profile.
- POPBILL guard (Phase 2.1 G4) — unrelated, no coupling.
- `src/lib/ip-classify.ts` (Phase 2.1 G7 H1) — no direct coupling, but the
  pattern (shared module, mirror-tests via `.mjs`) is precedent for any
  security-critical utility Phase 2.5 adds.

**Phase 2.5 launchpad outputs (same-session prerequisites):**
- X1 design audit `.yagi-autobuild/design-audit/CRITICAL.md` — `[BLOCKS 2.5]`
  findings (share surface Tailwind grays + action buttons + primitives)
  must be retoken'd BEFORE G3 starts. See §3 G3 Precondition.
- X2 SPEC review `.yagi-autobuild/phase-2-5/SPEC-REVIEW-NOTES.md` — applied
  in this v2 rewrite.
- X3 pre-flight `.yagi-autobuild/phase-2-5/PRE-FLIGHT-FINDINGS.md` — `/u/`
  middleware exclusion (G6 Task 1), R2 fallback (G4 decision), 500MB vs
  50MB size consideration (G4 decision).
- X4 ADR-006 `docs/design/DECISIONS.md` — governs kickoff alignment (this
  v2 SPEC itself is written to ADR-006 rules).

---

## §6 — Open questions (to be resolved before or during execution)

**Q1 — Admin role bootstrap (v2 resolution per X2 CRITICAL #2)**
Admin is the existing Phase 1.1 `yagi_admin` value on `user_roles` (workspace
global, `workspace_id IS NULL`). Bootstrap pattern: add a seed migration
that INSERTs `user_roles (user_id, role='yagi_admin', workspace_id=NULL)`
for a predetermined `auth.users.id` read from env var `FIRST_ADMIN_USER_ID`
(UUID). If env var absent, migration no-ops — 야기 creates the yagi_admin
user manually via SQL Editor as he does today. This avoids inventing a new
"4th role" or bypass path.

**Q2 — R2 bucket CORS (v2 resolution per X2 HIGH #1)**
**Proposal:** reuse the Phase 1.7 `team-channel-attachments` signed-URL
upload pattern. Server issues a signed PUT URL; browser uploads with no
direct CORS preflight on R2 (the signed URL already carries auth). If
`yagi-challenge-submissions` R2 bucket is provisioned by 야기 before G4
starts, use it. Otherwise, per X3 pre-flight §3, create a `challenge-
submissions` Supabase Storage bucket in G1 as fallback and wire the same
signed-URL flow. CORS policy doc (if true direct-upload-to-R2 is ever
needed) lives at `.yagi-autobuild/phase-2-5/R2_CORS.md`, scoped to
`yagiworkshop.xyz` + `localhost:3001`.

**Q3 — Video transcoding**
MVP accepts mp4 only, up to 60s. Is server-side transcoding (ffmpeg) in
scope? **Proposal: NO.** Client-side validation rejects non-mp4. If users
submit 1080p 60fps mp4, accept as-is. Transcoding → Phase 3. **Size cap
v2 decision (per X3 pre-flight §5.3):** if Supabase Storage fallback is
used (Q2), cap at 50MB (Free-plan limit). If R2 is provisioned, keep 500MB
cap. SPEC §1 video bullet updated at G4 time based on bucket choice.

**Q4 — Handle reserved list (v2 resolution per X2 HIGH #2)**
**Proposal:** Source of truth is `src/lib/handles/reserved.ts` (exported
`const RESERVED_HANDLES: readonly string[]`), seeded with:
```
admin, yagi, yagiworkshop, challenges, challenge, submit, gallery,
settings, profile, u, auth, login, signup, logout, showcase, about,
contact, privacy, terms, help, support, team, blog, app, www, api,
onboarding, dashboard, s, ko, en, ko-kr, en-us
```
G2 handle validation imports this list and checks `!RESERVED_HANDLES.includes(lower)`.
Added-to when route conflicts surface.

**Q5 — Submission edit window**
Can user edit submission after challenge closes (`closed_judging` state)?
**Proposal: NO.** `closed_judging` freezes submissions completely. Enforced
by RLS UPDATE policy (G1 Task 6) requiring `challenges.state = 'open'`.

**Q6 — Vote reveal timing**
Is vote count visible during `open` state, or hidden until
`closed_announced`? **Proposal: visible during `open` (builds hype), frozen
at `closed_judging`, revealed at `closed_announced`.**

**Q7 — Handle change rate limit (new in v2 per X2 MEDIUM #4)**
SPEC §3 G2 mentions "once per 90 days" for handle changes. **Proposal:** 90
days between handle changes for MVP; old handles are held for 30 days then
released (no squatting buffer). Tracked via `profiles.handle_changed_at`.
CEO approves or edits.

**Q8 — Role switch rate limit (new in v2 per X2 MEDIUM #5)**
SPEC §1 mentions "Creator ↔ Studio (one direction per 30 days)". **Proposal:**
30-day minimum between role switches; tracked via `profiles.role_switched_at`
(column added in G1 Task 1). CEO approves or edits.

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
