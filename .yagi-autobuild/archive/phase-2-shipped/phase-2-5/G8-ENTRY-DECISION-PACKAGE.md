# Phase 2.5 G8 — Entry Decision Package

**Status:** READY FOR ADOPTION (web Claude pre-authored, 2026-04-24 overnight)
**Purpose:** Drop-in decisions for Codex K-05 adversarial review + CLOSEOUT docs + contracts.md update + first-admin bootstrap + Phase 2.6 entry readiness.
**Scope ref:** SPEC v2 §3 G8 + G2-G8-PRE-AUDIT/G8-closeout.md
**Note:** G8 is paper-pushing gate. No new code surfaces (except seed migration). All test/compliance burden was at G1-G7.

---

## §0 — Scope summary

1. Run Codex K-05 on full Phase 2.5 diff
2. Address MEDIUM findings per ADR-005 expedited triage
3. Write `.yagi-autobuild/phase-2-5/CLOSEOUT.md`
4. Update `.yagi-autobuild/HANDOFF.md` — mark Phase 2.5 SHIPPED
5. Update `.yagi-autobuild/contracts.md` — add Phase 2.5 section
6. First-admin seed migration (FU-4) — if deferred here from G5
7. Push to `origin/main`
8. Telegram: Phase 2.5 SHIPPED

---

## §A — Codex K-05 scope

### Status: PROPOSED

### Decision

Run Codex K-05 on entire Phase 2.5 diff (commit `1fb9dd2..HEAD` where HEAD is post-G7 tip):

```bash
codex adversarial-review \
  --base main \
  --head HEAD \
  --focus "Phase 2.5 challenge platform — RLS enforcement, JSONB validation, state-machine bypass, realtime fan-out correctness, cron idempotency, notification rate-limiting, avatar upload security"
```

Focus areas list matches SPEC §2 success criteria + major new infra. Codex decides severity per findings.

### Triage per CODEX_TRIAGE.md

- **CLEAN** → proceed to §B
- **MEDIUM_ONLY** → filter per TRIAGE, fix in place if <20min each, else append to Phase 2.6 BACKLOG
- **HIGH-A** (exploitable today) → HALT, fix inline, re-run K-05
- **HIGH-B/C** (theoretical defense-in-depth) → DEFER to Phase 2.6 security sweep (FU-8/9/11/13)
- **Taxonomy mismatch** → halt, yagi triage

### Expected HIGH-B/C candidates (pre-flagged, ok to defer)

- FORCE ROW LEVEL SECURITY not set on new tables (FU-13, Phase 2.6 sweep)
- `auth.uid()` not wrapped in `(select auth.uid())` InitPlan optimization (FU-8, Phase 2.6)
- Cron job using SECURITY INVOKER vs DEFINER — depends on Supabase context

If Codex flags these as HIGH-B/C, add to CLOSEOUT "known deferrals" section with explicit Phase 2.6 FU reference.

**Recommended: ADOPT.**

---

## §B — CLOSEOUT.md structure

### Status: PROPOSED

### Decision

Mirror Phase 2.1 CLOSEOUT template if present, else fresh structure:

```
# Phase 2.5 — Challenge Platform SHIPPED

**Date:** 2026-04-{date}
**Status:** SHIPPED — pushed to origin/main
**Codex verdict:** {CLEAN | MEDIUM_ONLY filtered | HIGH-B/C deferred}
**Duration:** {total hh:mm from G1 entry to G8 push}

## 1. Scope delivered
(per-gate summary with file count + Codex outcome)

## 2. Acceptance criteria — checkoff
(10 items from SPEC §2, each ✅ or ⚠️)

## 3. Codex K-05 summary
- Findings: {count by severity}
- Fixed inline: {items}
- Deferred to Phase 2.6: {items + FU refs}

## 4. Carryover to Phase 2.6
- FU-SCOPES-1 (G0 pre-work) — status (landed in G6 entry)
- FU-1 (marketing opt-in) — Phase 2.6+
- FU-8/9/11/13 (security sweep) — Phase 2.6 dedicated sweep
- {other FOLLOWUPS entries}

## 5. Phase 2.6 entry readiness
- Schema assumptions inherited: {list}
- Routes reserved: /challenges, /u/[handle] (locale-free)
- Middleware matcher state: post-commit {sha}
- Sidebar IA already partially scaffolded (Phase 2.6 v3 SPEC authored)

## 6. Known gaps (documented tech debt)
- notify-dispatch inline templates vs React Email (tech debt FU)
- State-machine enforcement client-only (no DB trigger) — FU candidate
- {others surfaced during gates}

## 7. Metrics (if available)
- Migration count: {N}
- New files: {N}
- Modified files: {N}
- Dep adds: {list} (e.g., react-image-crop)

## 8. Manual QA carry-forward
(YAGI-MANUAL-QA-QUEUE.md entries)
```

**Recommended: ADOPT structure.**

---

## §C — HANDOFF.md update

### Status: CACHE HIT (Phase 2.1 precedent — standard ops state update)

### Decision

Update top-level HANDOFF.md:
- Phase 2.1 SHIPPED → Phase 2.5 SHIPPED (append)
- Current ops state: "Phase 2.6 entry ready — SPEC v3 authored at `.yagi-autobuild/phase-2-6/SPEC.md`"
- Active worktrees: mark `g3-challenges` as merged, ready for cleanup

Follow existing HANDOFF.md format. Append, don't rewrite.

**Auto-adopt** (mechanical).

---

## §D — contracts.md Phase 2.5 section

### Status: CRITICAL — must land (SPEC policy)

### Decision

Add new section to `.yagi-autobuild/contracts.md`:

```markdown
## Phase 2.5 — Challenge Platform (shipped 2026-04-{date})

### New tables
- `challenges` (id, slug citext UNIQUE, title, description_md, hero_media_url, state CHECK IN ('draft','open','closed_judging','closed_announced','archived'), open_at, close_at, announce_at, submission_requirements jsonb, judging_config jsonb, reminder_sent_at, created_by FK, created_at, updated_at)
- `challenge_submissions` (id, challenge_id FK, submitter_id FK profiles.id, content jsonb, status CHECK IN ('created','processing','ready','rejected'), created_at, updated_at, UNIQUE (challenge_id, submitter_id))
- `challenge_votes` (id, challenge_id FK, submission_id FK, voter_id FK, created_at, UNIQUE (challenge_id, voter_id))
- `challenge_judgments` (id, challenge_id FK, submission_id FK, admin_id FK, score numeric, notes, created_at)
- `showcase_challenge_winners` (junction: submission_id FK UNIQUE, showcase_id FK nullable, rank, announced_at, announced_by FK)
- `creators` (id FK profiles.id, display_name)
- `studios` (id FK profiles.id, studio_name, contact_email citext, member_count CHECK)

### Table modifications
- `profiles` — added: role CHECK ('creator','studio','observer'), handle citext UNIQUE, instagram_handle, bio CHECK char_length<=200, avatar_url, role_switched_at, handle_changed_at, external_links jsonb (if added at G6)
- `notification_preferences` — added: challenge_updates_enabled boolean DEFAULT TRUE

### Realtime publication additions
- challenges, challenge_submissions, challenge_votes, showcase_challenge_winners (all in `supabase_realtime`)

### Notification kinds (Phase 1.8 registry extension)
- `challenge_submission_confirmed` (medium)
- `challenge_closing_soon` (high)
- `challenge_announced_winner` (high)
- `challenge_announced_participant` (medium)

### Storage buckets
- `yagi-challenge-submissions` (Cloudflare R2, ENAM) — video + image + pdf upload target
- `avatars` (Supabase Storage, Phase 1.1 reused) — profile avatars

### Cron jobs
- `challenges-closing-reminder` (*/15 * * * *) — fires `challenge_closing_soon` 24h before close_at

### Public routes (middleware-excluded from locale redirect)
- `/challenges`, `/challenges/[slug]`, `/challenges/[slug]/gallery`, `/u/[handle]`
- (previously excluded: `/showcase`)

### RPCs
- `is_yagi_admin(uid)` — Phase 1.1, reused unchanged
- (no new RPCs in Phase 2.5 beyond pre-existing)

### ADRs
- ADR-009 Role type reconciliation (2026-04-23)
- ADR-010 Sidebar IA grouping (2026-04-24, Phase 2.6 authored but usable now)
```

### Policy note

contracts.md should have been updated incrementally at each gate (SPEC policy "same PR"). Bulk G8 update is drift remediation. Document the drift in CLOSEOUT §6 "Known gaps" + add FU-PROCESS-1: enforce same-PR contracts.md update via pre-commit hook in Phase 2.6+.

**Recommended: ADOPT.**

---

## §E — First-admin seed migration (FU-4)

### Status: PROPOSED

### Decision

If yagi_admin was manually INSERTed during G5/G6 development (most likely path), G8 adds the formal seed migration as backfill:

```sql
-- supabase/migrations/<ts>_phase_2_5_first_admin_seed.sql
DO $$
DECLARE
  first_admin_id uuid;
BEGIN
  BEGIN
    first_admin_id := current_setting('app.first_admin_user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    first_admin_id := NULL;
  END;

  IF first_admin_id IS NULL THEN
    RAISE NOTICE 'FIRST_ADMIN_USER_ID not set — skipping seed (manual INSERT assumed)';
    RETURN;
  END IF;

  INSERT INTO public.user_roles (user_id, role, workspace_id)
  VALUES (first_admin_id, 'yagi_admin', NULL)
  ON CONFLICT DO NOTHING;
END $$;
```

Idempotent. If 야기 already has yagi_admin row (from manual G5 seed), `ON CONFLICT DO NOTHING` no-ops.

Activation: `psql ... -c "SET app.first_admin_user_id = '<야기 uuid>'; \i migration.sql"` — or let it no-op during `db push`, 야기 already manually seeded.

**Recommended: ADOPT (backfill migration).**

---

## §F — Push strategy

### Status: PROPOSED

### Decision

**Per-gate commits to `worktree-g3-challenges` branch throughout Phase 2.5** (current pattern). At G8:

1. Final commit on branch: CLOSEOUT + contracts.md + first-admin-seed (if §E adopted)
2. Merge worktree branch into main via fast-forward if history is linear, else merge commit:
   ```bash
   git checkout main
   git merge worktree-g3-challenges  # ff if linear
   git push origin main
   ```
3. Delete worktree branch locally + optionally remote
4. Delete `.claude/worktrees/g3-challenges/` (per PARALLEL_WORKTREES.md cleanup)

Phase 2.1 used per-gate push to main directly (no worktree). Phase 2.5 used worktree → merge is equivalent outcome.

### Fallback if merge conflict with main

Should not happen (worktree created from known main sha, no parallel main writes during Phase 2.5). If conflict → halt, investigate. Likely cause: hotfix landed directly on main during Phase 2.5 execution.

**Recommended: ADOPT.**

---

## §G — Telegram completion alert

### Status: CACHE HIT (standard pattern)

### Decision

```
🚀 Phase 2.5 SHIPPED

- 8 gates complete (G1-G8)
- Codex: {CLEAN | MEDIUM filtered | HIGH-B/C deferred to 2.6}
- 7 new tables, 4 notification kinds, 1 cron job
- Public routes: /challenges, /u/[handle]
- Commit: {sha}
- Carryover: {FU count} items → Phase 2.6
- Duration: {total hh:mm}

Phase 2.6 (IA revision) entry ready — SPEC v3 at .yagi-autobuild/phase-2-6/SPEC.md
```

**Auto-adopt** (standard pattern).

---

## §H — Phase 2.6 entry readiness check

### Status: REFERENCE (not a decision — verification)

G8 closeout statement must explicitly verify:

- [ ] FU-SCOPES-1 (G0 pre-work) landed during Phase 2.5 G6 — `src/lib/app/use-user-scopes.ts` exists
- [ ] Phase 2.6 SPEC v3 files present: `SPEC.md`, `IMPLEMENTATION.md`, `REFERENCES.md` at `.yagi-autobuild/phase-2-6/`
- [ ] ADR-010 documented in `docs/design/DECISIONS.md` (if not, file at G8)
- [ ] Phase 2.6 FOLLOWUPS.md exists with at least FU-MTG-1, FU-GUIDES-1 (if not, file at G8)
- [ ] No blocking issues discovered during Phase 2.5 that require Phase 2.6 SPEC revision

If any ❌ → add to CLOSEOUT as Phase 2.6 blocker, surface to 야기.

---

## §I — Post-ship monitoring

### Status: DEFERRED to Phase 2.6/2.7

Dashboard/alert provisioning for:
- Resend bounce rate
- Cron job health (`cron.job_run_details`)
- Realtime connection counts
- R2 egress bandwidth

**Decision:** Log as FU in Phase 2.5 FOLLOWUPS. Not G8 scope. 야기 pre-revenue stage doesn't need dashboards yet.

**Recommended: ADOPT deferral.**

---

## §J — ADR-010 formal landing (cross-ref)

### Status: PROPOSED

### Decision

Add ADR-010 (Sidebar IA grouping + billing retirement + invoice consolidation) to `docs/design/DECISIONS.md`.

Content: already written in Phase 2.6 SPEC v2 draft archive (pre-v3 split). Web Claude can regenerate at G8 time, OR 야기 copies from v2 archive if still accessible.

This is technically Phase 2.6 territory, but since Phase 2.6 SPEC references ADR-010 and Phase 2.5 G8 is the "last cross-phase tidy" moment, landing here makes sense.

**Recommended: ADOPT (file ADR-010 at G8).**

---

## §K — Decisions needed from 야기 (cache MISS batch)

Most G8 work is mechanical. Few genuine decisions:

1. **Q-G8-1 (§A):** Run Codex K-05 with the focus-area prompt in §A? (Default: yes)
2. **Q-G8-2 (§A triage):** HIGH-B/C findings auto-defer to Phase 2.6 (not inline fix)? (Default: yes — per CODEX_TRIAGE + FU-8/9/11/13 existing plan)
3. **Q-G8-3 (§D):** Bulk contracts.md update at G8 acceptable (vs historical per-PR drift)? (Default: yes + file FU-PROCESS-1)
4. **Q-G8-4 (§E):** File backfill first-admin seed migration? (Default: yes)
5. **Q-G8-5 (§F):** Merge worktree → main via fast-forward if possible? (Default: yes)
6. **Q-G8-6 (§J):** File ADR-010 during G8 (cross-phase tidy)? (Default: yes)

Batch answer:
```
G8: Q1=yes, Q2=yes, Q3=yes, Q4=yes, Q5=yes, Q6=yes
```

All defaults → proceed. Cache append: Q-040 through Q-045.

---

## §L — Success criteria (G8 closeout = Phase 2.5 SHIPPED)

- [ ] Codex K-05 executed + verdict documented
- [ ] CLOSEOUT.md written with all 8 sections
- [ ] HANDOFF.md updated (Phase 2.5 SHIPPED)
- [ ] contracts.md Phase 2.5 section added
- [ ] First-admin seed migration committed (even if no-op)
- [ ] ADR-010 landed in docs/design/DECISIONS.md
- [ ] Phase 2.6 entry readiness verified (§H checklist)
- [ ] `pnpm build` + `pnpm exec tsc --noEmit` + `pnpm lint` all EXIT=0
- [ ] Merged to origin/main
- [ ] Telegram sent
- [ ] Worktree cleaned up (branch deletable)

---

**END OF G8 ENTRY DECISION PACKAGE**
