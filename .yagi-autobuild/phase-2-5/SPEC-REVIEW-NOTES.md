# Phase 2.5 — SPEC Review Notes (Block X2)

**Reviewer:** Block X2 launchpad (SPEC scan only; no code edits)
**Date:** 2026-04-22
**SPEC under review:** `.yagi-autobuild/phase-2-5/SPEC.md` (DRAFT, 404 lines)
**Context read:** `CEO_APPROVED.md` (D1–D10), `DECISIONS.md` (ADR-005, ADR-006), `.yagi-autobuild/contracts.md` (Phase 1.1–1.9), `.yagi-autobuild/design-system/*` (inventory).

---

## TL;DR

**4 CRITICAL_BLOCKING, 9 HIGH, 10 MEDIUM, 3 LOW.**
**Top issue:** SPEC collides with Phase 1.1 identity backbone — it introduces a new `user_profiles` table (1:1 with `auth.users`) while Phase 1.1 already owns `profiles` as that surface (`contracts.md` Phase 1.1). Likewise the new "4th internal admin role" redefines role storage even though Phase 1.1 has `user_roles` with `is_yagi_admin`. G1 as written will break every downstream workspace-scoped RLS policy or produce two parallel identity tables. This must be resolved pre-G1, not mid-G1.

Other high-risk clusters:
- Role model silently drops workspace-scoping (Phase 2.5 roles are global, Phase 1.x roles are workspace-scoped) — no reconciliation in SPEC.
- Three separate design-system references in SPEC are unanchored ("per design-system COMPONENT_CONTRACTS", "per Phase 2.5 launchpad audit findings") — launchpad X1 did not run (per `MORNING-BRIEF.md`), so the audit cannot be cited.
- §6 has 6 open questions; ADR-006 mandates every open question be resolved in the kickoff with a default or CEO decision, but Q2 and Q4 have no proposal at all.
- §2 success criteria #6 and #9 are not 30-second-smoke-testable as written.

Severity ≤3 CRITICAL_BLOCKING is the ADR-006 norm. **4 CRITICAL_BLOCKING means the SPEC needs at least one revision pass before G1 can start.**

---

## CRITICAL_BLOCKING (4)

### [CRITICAL_BLOCKING] `user_profiles` collides with existing `profiles` from Phase 1.1
- **SPEC location:** §3 G1 Tasks 1, line ~127
- **Current text:** "Create tables: - `user_profiles` (1:1 with auth.users, stores role + handle + instagram + bio + avatar_url)"
- **Issue:** Phase 1.1 already published `profiles` as the 1:1-with-auth.users identity surface (see `contracts.md` §Phase 1.1). Creating `user_profiles` either (a) fragments user identity into two tables breaking every downstream RLS predicate that joins `profiles`, or (b) shadows Phase 1.1 without explicit migration path. §5 claims "`user_profiles` extends existing `auth.users` — verify Phase 2.0 baseline doesn't already introduce collision" — it does. Collision is not a "verify", it's a given.
- **Suggested edit:** Replace `user_profiles` with columns added to existing `profiles` (role, handle, instagram_handle, bio, avatar_url). Add migration note: "ALTER TABLE profiles ADD COLUMN role text, handle citext UNIQUE, instagram_handle text, bio text, avatar_url text (inherit existing avatars bucket from Phase 1.1)". Delete the `user_profiles` naming throughout SPEC and update §3 G1, §3 G2, §3 G5 role-gate references.

### [CRITICAL_BLOCKING] "Admin role" clashes with Phase 1.1 `user_roles` + `is_yagi_admin` system
- **SPEC location:** §3 G5 Task 6, line ~245
- **Current text:** "Admin role gating: middleware check against user_profiles.role = 'admin' (admin role is a 4th internal role, not user-facing)"
- **Issue:** Phase 1.1 already has `user_roles` with `yagi_admin` (global, `workspace_id IS NULL`) and the `is_yagi_admin(uid)` RPC used by every admin-gated surface in 1.2–1.9 (contracts.md §Phase 1.1 RPCs). Introducing a 4th role stored on `user_profiles.role` creates a parallel authorization system — any new admin surface in 2.5 that uses `is_yagi_admin` will diverge from one that uses `.role='admin'`. This is exactly the class of drift ADR-001 rejects at the design-system level and ARCH §11 rejects at the architecture level.
- **Suggested edit:** Replace the 4th-role concept with: "Admin gating uses existing `is_yagi_admin(auth.uid())` RPC from Phase 1.1. The 3 Phase 2.5 roles (Creator/Studio/Observer) live on `profiles.role` and are orthogonal to `user_roles`. Admin = `user_roles.role='yagi_admin'`, not `profiles.role='admin'`." Update §1 role table and Q1 (admin bootstrap) accordingly — Q1 becomes "assign existing `yagi_admin` role via existing seed pattern", not a new promotion path.

### [CRITICAL_BLOCKING] Role model silently drops workspace-scoping
- **SPEC location:** §1 User model + §3 G1 Tasks, lines ~36–47, ~127–129
- **Current text:** "Role is mutable post-signup with audit log. One user = one role at a time."
- **Issue:** Phase 1.1 `user_roles.role` is workspace-scoped (`workspace_admin`/`workspace_member` with `workspace_id`, plus global `yagi_admin` with `workspace_id IS NULL`). Phase 2.5 introduces a global-only role (Creator/Studio/Observer) with no workspace relation. Not flagged in §5 dependencies. Open risk: a Creator who is also a workspace_admin in a client workspace — which role wins in RLS predicates on `challenge_submissions`? No answer in SPEC. This is not a hypothetical; the B2B Studio role in D3 explicitly targets "potential B2B clients" who will also have workspaces.
- **Suggested edit:** Add §1 subsection "Role orthogonality": "Phase 2.5 roles (Creator/Studio/Observer) are stored on `profiles.role` (global, single value). They are orthogonal to Phase 1.1 `user_roles` (workspace-scoped). A single user can simultaneously be a Creator (for challenge participation) AND a workspace_admin in workspace X (for client portal access). RLS for `challenge_submissions` reads only `profiles.role`; RLS for `projects` reads only `user_roles`." Add to §5 dependencies: "Requires reading Phase 1.1 `profiles` (not creating a new table) and leaving `user_roles` untouched."

### [CRITICAL_BLOCKING] Launchpad X1 design audit is cited but did not run
- **SPEC location:** §3 G3 acceptance, line ~196; §3 G6 Task 4, line ~272
- **Current text:** "Design-system compliance per Phase 2.5 launchpad audit findings" (G3); "Design-system compliance (per Phase 2.5 launchpad audit)" (G6)
- **Issue:** Per `.yagi-autobuild/MORNING-BRIEF.md` §Design-audit highlights (line 30–32): "NOT RUN — requires Phase 2.1 green first." The SPEC cites audit findings that do not exist. ADR-006 §2 mandates kickoffs cite explicit artifact sections; citing a non-existent audit is exactly the drift ADR-006 guards against. If G3 execution looks for "audit findings" it will find nothing and silently ship whatever COMPONENT_CONTRACTS defaults produce — precisely the risk ADR-005 "expedited-forbidden triggers" (new variant, hardcoded color, uncataloged frame) is supposed to catch mid-build, not design-time.
- **Suggested edit:** Replace both references with explicit anchors: "Design-system compliance per `COMPONENT_CONTRACTS.md` §5.1 (Button), §5.2 (Input), §5.5 (Modal) — no variants introduced; card grid uses UI_FRAMES.md §Frame-2 Browse table-not-cards rule UNLESS launchpad X1 audit explicitly approves a card variant before G3 starts." Add prerequisite: "BLOCKED on launchpad X1 completion; if X1 is skipped, use Frame-2 defaults and flag any new variant per ADR-005 forbidden triggers."

---

## HIGH (9)

### [HIGH] §6 Q2 (R2 CORS) has no proposal — violates ADR-006 §3
- **SPEC location:** §6 Q2, lines ~364–366
- **Current text:** "`yagi-challenge-submissions` needs CORS config for direct-upload-from-browser flow. Policy documentation lives where?"
- **Issue:** ADR-006 §3 mandates every open question resolve with a default or CEO decision at kickoff; "lives where?" is not a proposal, it's a dangling ask. G4 (submission flow) depends on this being answered before the direct-upload flow can be implemented. Reference pattern exists (Phase 1.7 team-channel-attachments signed-URL upload; `contracts.md` §Phase 1.7).
- **Suggested edit:** "Proposal: Reuse Phase 1.7 signed-URL upload pattern (browser never talks to R2 directly via CORS; server issues signed PUT, browser uploads with no Origin check needed). If true direct-upload-to-R2 required, CORS policy doc lives at `.yagi-autobuild/phase-2-5/R2_CORS.md`, scoped to `yagiworkshop.xyz` + `localhost:3001`."

### [HIGH] §6 Q4 (handle reserved list) has no proposal — violates ADR-006 §3
- **SPEC location:** §6 Q4, lines ~373–376
- **Current text:** "Prevent `admin`, `yagi`, `challenges`, ... from being claimed as user handles. Source of truth for reserved list?"
- **Issue:** Same pattern as Q2; ADR-006 §3 violation. G2 (auth + role selection) needs this before handle validation can be written. Without a source-of-truth path, G2 either hardcodes (ADR-005 forbidden trigger: hardcoded values) or delays.
- **Suggested edit:** "Proposal: Reserved list lives in `src/lib/handles/reserved.ts` (exported const array), seeded with: `admin, yagi, challenges, submit, gallery, settings, api, www, support, help, about, privacy, terms, login, signup, u, s, onboarding, dashboard`. Added to when route conflicts surface."

### [HIGH] Success criterion #6 (realtime gallery) is not 30s-smoke-testable
- **SPEC location:** §2 item 6, lines ~98–99
- **Current text:** "Public gallery renders submissions in real-time as they are accepted (realtime subscription confirmed working post-Phase-2.1-G2 fix)."
- **Issue:** "Realtime" has no measurable window. Phase 1.4 had the same ambiguity and landed in H1 investigation. Without a "new submission visible in gallery tab within N seconds of insert" criterion, G3 acceptance can't be smoke-tested.
- **Suggested edit:** "Public gallery: a new submission inserted via admin/seeded test fixture appears in an already-open `/challenges/[slug]/gallery` browser tab within 5 seconds of the INSERT (no page reload). Verified with 2-browser smoke documented in CLOSEOUT."

### [HIGH] Success criterion #9 (email notifications) is not 30s-smoke-testable
- **SPEC location:** §2 item 9, lines ~105–107
- **Current text:** "Email notifications fire via existing Resend pipeline: (a) submission confirmation, (b) challenge closing reminder 24h before deadline, (c) winner announcement."
- **Issue:** "24h before deadline" cannot be smoke-tested in a 1-week sprint closeout without a time-override hook. Not smoke-testable means G7 acceptance is inherently deferred, which makes §10 closeout unachievable as stated.
- **Suggested edit:** "(a) submission confirmation email fires within 60s of submission (verified via `notification_events.email_sent_at`). (b) 24h-before cron trigger verified by temporarily setting a challenge close_at to `now() + 24h + 1min` and observing dispatch within 11 min (cron is `*/10 * * * *`, see Phase 1.8). (c) winner announcement fires within 60s of CLOSED_ANNOUNCED state transition."

### [HIGH] `challenge_updates` notification preference toggle not in existing preferences schema
- **SPEC location:** §3 G7 Task 4, line ~295
- **Current text:** "Notification preferences: existing user preferences extended with 'challenge_updates' toggle (default ON)"
- **Issue:** Phase 1.8 `notification_preferences` table has fixed columns (email_immediate_enabled, email_digest_enabled, digest_time_local, quiet_hours_*, timezone — see `contracts.md` §Phase 1.8). No generic per-kind toggle exists. "Extended" would require a schema change not flagged in §5 or G1. Migration should be called out in G1 or a new G1.5.
- **Suggested edit:** "G1 migration: ALTER TABLE notification_preferences ADD COLUMN challenge_updates_enabled boolean DEFAULT TRUE. Update RLS + types. Document in contracts.md under Phase 2.5." Move this task from G7 to G1 (it's a schema change, not a glue change).

### [HIGH] New notification `kind` values missing from `SEVERITY_BY_KIND` registry
- **SPEC location:** §3 G7 Task 1, lines ~283–288
- **Current text:** "Notification events for: submission confirmed, challenge closing in 24h, challenge announced"
- **Issue:** `src/lib/notifications/kinds.ts` is authoritative registry (`contracts.md` §Phase 1.8). Three new kinds (`challenge_submission_confirmed`, `challenge_closing_soon`, `challenge_announced_winner` / `_participant`) must be added with severity values. SPEC doesn't name the kinds or severities. Without this, email templates can't be wired.
- **Suggested edit:** Add to G7 Task 1: "Register new kinds in `src/lib/notifications/kinds.ts`: `challenge_submission_confirmed` (medium), `challenge_closing_soon` (high, debounced per user × challenge), `challenge_announced_winner` (high), `challenge_announced_participant` (medium). Update `contracts.md` §Phase 2.5 notification matrix."

### [HIGH] 24h-before reminder requires a scheduler not accounted for
- **SPEC location:** §3 G7 Task 1b, lines ~284–286
- **Current text:** "Challenge closing in 24h (email to all submitters + subscribed observers)"
- **Issue:** Phase 1.8 dispatch is pg_cron `*/10 * * * *` via `notify-dispatch` Edge Function. That reads *already-emitted* events. Nothing currently scans for "challenge_close_at − 24h ≈ now" to *emit* the event. G7 needs either (a) a new pg_cron job that scans `challenges` and emits events, or (b) a scheduled emit at challenge OPEN state pointing to close_at−24h. Neither is specified.
- **Suggested edit:** G7 Task: "Add pg_cron `*/15 * * * *` job `challenges-closing-reminder` that selects challenges where `state='OPEN' AND close_at BETWEEN now() + interval '23h 45min' AND now() + interval '24h 15min' AND reminder_sent_at IS NULL`, emits `challenge_closing_soon` per submitter + subscribed observer, stamps `reminder_sent_at`. Idempotent."

### [HIGH] Winner auto-pin to Showcase has no defined integration point
- **SPEC location:** §3 G5 Task 5, lines ~243–245; §2 item 7
- **Current text:** "auto-pins winner submissions to showcase"
- **Issue:** Phase 1.9 `showcases` table expects project_id (NOT NULL per the contract; see contracts.md §Phase 1.9). Challenge submissions have no project. "Pinning" is ambiguous — does it create a `showcases` row? A `showcase_media` row on an existing showcase? A new "challenge_showcase_pins" junction table (not in G1)? Three possible implementations, all load-bearing on G5 acceptance.
- **Suggested edit:** "Winner pinning creates a `showcases` row with `project_id=NULL` (requires ALTER of `showcases.project_id` to nullable in G1 migration + updating `contracts.md`) OR a new `showcase_challenge_winners` junction table. Decision: use junction table — `showcase_challenge_winners (challenge_submission_id, pinned_at, pinned_by)` + modify `/showcase/[slug]` listing query to UNION winners. Add table to G1 Task 1."

### [HIGH] `challenges.slug` uniqueness + public route collision with reserved list not called out
- **SPEC location:** §3 G1 Task 1 + §3 G3 routes, lines ~130, ~176–188
- **Current text:** "`challenges` (core entity, all lifecycle fields, JSONB submission_requirements, JSONB judging_config)"
- **Issue:** `/challenges/[slug]` and `/u/[handle]` share the `/challenges/*` + `/u/*` namespaces. A user handle of `challenges` or a challenge slug of `new`/`submit`/`gallery` would break routing. G1 creates `challenges.slug` with no reserved-slug validation; G2 has handle reserved list discussion (Q4) but challenge slug reserved list is silent. Admin could create challenge with slug `new` and break `/admin/challenges/new`.
- **Suggested edit:** "G1: challenges.slug CITEXT UNIQUE + CHECK (slug !~ '^(new|gallery|submit|edit|judge|announce|admin)$'). G5 admin form validates slug against same list before submit. Cross-reference with Q4 handle reserved list — they share a root namespace at `/[locale]/challenges/*` vs `/[locale]/u/*`, so collision only matters within each."

---

## MEDIUM (10)

### [MEDIUM] "minimal internal form" (G5) not measurable
- **SPEC location:** §2 item 4, line ~94
- **Current text:** "Admin can create challenge via a minimal internal form at `/admin/challenges/new` (not production-grade UI, sufficient to set fields)."
- **Issue:** "Sufficient to set fields" is vague. What fields are required at creation vs later? Without an enumeration, G5 reviewer can't sign off.
- **Suggested edit:** "Admin creation form accepts: title (required), slug (required, validated), description_md (required), hero_media_url (optional), open_at, close_at, announce_at (all required), submission_requirements JSONB (via form builder, at least text_description required), judging_config JSONB (mode + weight). Can save as DRAFT with open_at null."

### [MEDIUM] "Card layout per design-system COMPONENT_CONTRACTS" — no section anchor
- **SPEC location:** §3 G3 Task 1, line ~177
- **Current text:** "Card layout per design-system COMPONENT_CONTRACTS."
- **Issue:** COMPONENT_CONTRACTS.md does not have a "Card" section (verified by Grep on the file — 0 occurrences of `gallery|card|grid|badge|profile`; sections are Button/Input/Select/Tabs/Modal). UI_FRAMES.md Frame 2 explicitly says "Default: table, not cards" (line 133). Picking a card layout is itself a design decision not yet made.
- **Suggested edit:** "Challenge listing uses UI_FRAMES.md Frame-2 (Browse) default (table layout) UNLESS launchpad X1 approves a card variant for editorial challenge browsing. If card variant approved, must be specified in COMPONENT_CONTRACTS.md §5.N before G3 starts (ADR-005 forbidden trigger: no new variant mid-build)."

### [MEDIUM] Submission UI "dynamically renders based on challenge config" — no design reference
- **SPEC location:** §2 item 3, line ~91
- **Current text:** "Submission UI dynamically renders based on challenge's `submission_requirements` config."
- **Issue:** Dynamic form rendering isn't in COMPONENT_CONTRACTS (no existing pattern). This is new territory. "Dynamic" will become a long edge-case list mid-G4.
- **Suggested edit:** "Submission form: composition of existing COMPONENT_CONTRACTS §5.1 (Button), §5.2 (Input for URL + text), §5.3 (Select for supplementary format), §5.5 (Modal for upload progress), plus a new File Upload primitive. File Upload MUST be cataloged in COMPONENT_CONTRACTS before G4 starts or triggers ADR-005 halt."

### [MEDIUM] Handle "90-day lock" vs CEO_APPROVED has no equivalent
- **SPEC location:** §3 G2 Task 6, lines ~163–164
- **Current text:** "Handle change: allowed once per 90 days, old handles reserved (no squatting)"
- **Issue:** §6 does not raise this as an open question; CEO_APPROVED D1–D10 do not cover it. 90 days is a business policy invented in SPEC without CEO sign-off. Per ADR-006 kickoffs cannot assume defaults.
- **Suggested edit:** Move to §6 as Q7 with proposal 90 days + squatting lock. Let CEO accept/edit before G2.

### [MEDIUM] Role switch "one direction per 30 days" invented in SPEC, not in CEO_APPROVED
- **SPEC location:** §1 User model, lines ~44–46
- **Current text:** "Creator ↔ Studio (free, one direction per 30 days)."
- **Issue:** D3 says "mutable with audit log" but is silent on rate limit. 30 days is an SPEC-side policy decision without CEO sign-off. Same ADR-006 issue as above.
- **Suggested edit:** Add to §6 as Q8 or update CEO_APPROVED D3 to include rate limit.

### [MEDIUM] Avatar square crop "client-side" has no size/format contract
- **SPEC location:** §3 G6 Task 2, line ~270
- **Current text:** "Avatar upload (R2, max 2MB, square crop client-side)"
- **Issue:** Phase 1.1 avatars live in the `avatars` Supabase Storage bucket (contracts.md §Phase 1.1), not R2. Using R2 for avatars fragments storage. Also: client-side crop implementation not specified (lib choice, output dimensions, format).
- **Suggested edit:** "Avatar upload reuses Phase 1.1 `avatars` bucket (Supabase Storage, private, signed URL read). Max 2MB input, client-side crop to 512×512 JPEG via existing pattern if present, else new primitive — flag to launchpad X1 for canonical implementation."

### [MEDIUM] G3 "realtime subscription" repeats Phase 1.4 pattern without publication membership check
- **SPEC location:** §3 G3 Task 3, lines ~187–189
- **Current text:** "Route `/challenges/[slug]/gallery` — grid of submissions, realtime subscription ..."
- **Issue:** Phase 1.4 had exactly this pattern and landed H1 (publication membership gap) in Phase 2.1. G1 Task 3 does add `challenge_submissions` to `supabase_realtime`, which is good — but acceptance doesn't verify. This is a learned-gotcha that should be an explicit acceptance check not an afterthought.
- **Suggested edit:** G1 Acceptance: "Verify publication membership via `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime'` returns all 4 new tables. Phase 2.1 H1 playbook." (Already partially there; make it a ticked item with the SQL.)

### [MEDIUM] Submission state enum CREATED → PROCESSING → READY not in G1 schema
- **SPEC location:** §3 G4 Task 3, line ~213
- **Current text:** "Submission state: CREATED → PROCESSING (media validation) → READY"
- **Issue:** G1 table definitions list `challenge_submissions.status` but don't specify the enum values or transitions. G4 invents 3 states; G1 has no constraint. Mismatch risk.
- **Suggested edit:** G1 Task 1: "`challenge_submissions.status` text CHECK (status IN ('created', 'processing', 'ready', 'rejected')) DEFAULT 'created'."

### [MEDIUM] "XSS sanitization" for text_description unspecified
- **SPEC location:** §3 G4 Task 2e, line ~218
- **Current text:** "Text description: server-side validation + XSS sanitization"
- **Issue:** No library named, no policy. Phase 1.6 MDX uses a specific sanitizer; picking something ad-hoc in G4 risks introducing a new dep or rolling own.
- **Suggested edit:** "Server-side: strip HTML via existing markdown pipeline in Phase 1.6 (`src/lib/md/*` if present) or `rehype-sanitize` with `defaultSchema`. Stored as plain text (not markdown) for MVP."

### [MEDIUM] §5 dependency on "Phase 2.0 baseline" is not a dependency on Phase 2.1 outputs (section title mismatch)
- **SPEC location:** §5 heading + first bullet, lines ~343–345
- **Current text:** "## §5 — Dependencies on Phase 2.1 outputs" ... "`user_profiles` extends existing `auth.users` — verify Phase 2.0 baseline doesn't already introduce collision"
- **Issue:** Section title says 2.1; first bullet is about 2.0 baseline. Cosmetic but confusing for G1 executor.
- **Suggested edit:** Rename §5 to "Dependencies on Phase 2.0 baseline + Phase 2.1 outputs" and group bullets: (a) 2.0 baseline prereqs, (b) 2.1 output inheritance.

---

## LOW (3)

### [LOW] "Tsc clean" capitalization
- **SPEC location:** §3 G2 Acceptance, line ~167
- **Current text:** "Tsc clean"
- **Suggested edit:** "TSC clean (pnpm build produces no type errors)."

### [LOW] "subscribed observers" not defined
- **SPEC location:** §3 G7 Task 1b, line ~285
- **Current text:** "email to all submitters + subscribed observers"
- **Issue:** No mechanism for observer subscription is defined anywhere. Minor because MVP could ship without it.
- **Suggested edit:** "email to all submitters. Observer subscription to challenges is Phase 2.6 — remove 'subscribed observers' from MVP scope."

### [LOW] §3 G8 commit message will fail lint if repo uses conventional commits strictly
- **SPEC location:** §3 G8 Task 5, line ~312
- **Current text:** `chore(phase-2-5): G8 closeout — Challenge platform SHIPPED`
- **Issue:** Em-dash in commit subject is fine but SHIPPED caps may conflict if repo lints subject case. Cosmetic.
- **Suggested edit:** `chore(phase-2-5): g8 closeout — challenge platform shipped` or keep as-is if no commitlint rule enforces subject case.

---

## Summary counts

| Severity | Count |
|----------|-------|
| CRITICAL_BLOCKING | 4 |
| HIGH | 9 |
| MEDIUM | 10 |
| LOW | 3 |
| **Total** | **26** |

**Recommendation:** SPEC needs a revision pass before G1 kickoff. The 4 CRITICAL_BLOCKING findings all cluster around one theme — Phase 2.5 identity/role model collides with Phase 1.1 — and can be resolved in a single SPEC diff that:
1. Replaces `user_profiles` with ALTER on `profiles`.
2. Uses `is_yagi_admin` instead of a new "admin role".
3. Adds an explicit orthogonality clause for 2.5 roles vs 1.1 `user_roles`.
4. Removes references to launchpad X1 audit OR blocks G3/G6 on X1 completion.

The 9 HIGH findings are individually small but collectively signal the SPEC was written against CEO decisions without a second pass against `contracts.md` — recommend one fast reconciliation pass before kickoff rather than discovering these mid-build.
