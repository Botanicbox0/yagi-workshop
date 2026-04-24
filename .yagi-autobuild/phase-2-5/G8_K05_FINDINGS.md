# Phase 2.5 G8 — Codex K-05 consolidated review findings

**Date:** 2026-04-24
**Verdict:** **HIGH_FINDINGS** — 6 ship-blockers
**Duration:** 10m 42s on gpt-5.4 high reasoning
**Codex session ID:** `019dbbcd-37fe-73d0-8611-d28140ae0ccc` (resume after hardening: `codex resume 019dbbcd-37fe-73d0-8611-d28140ae0ccc`)
**Task ID:** `task-mobvetk2-lsrz3r`

## Status

**HALTED.** Per ULTRA-CHAIN E rule, overnight autopilot chain stopped at G8 pre-merge. Branch `worktree-g3-challenges` remains at commit `90a5b8f` (post-G7 ship, pre-G8 docs). NO merge to main.

Telegram halt alert sent to yagi as msg #60 at 2026-04-24 ~04:35 KST.

## Findings (all SHIP_BLOCKER)

### K05-001 — HIGH-A — challenge_submissions public SELECT leaks non-ready content

**File:** `supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql:291`

Policy `challenge_submissions_select` is `FOR SELECT USING (true)`. Anonymous callers can read every submission row (status, submitter_id, raw content) — the app only *treats* status='ready' as public, but the DB doesn't enforce that.

**Reproduction:** Anon PostgREST query on `public.challenge_submissions` returns all rows.

**Fix (requires migration):** Split into 3 policies:
- Public SELECT `USING (status = 'ready' AND challenge.state IN ('open','closed_judging','closed_announced','archived'))`
- Owner SELECT `USING (submitter_id = (select auth.uid()))`
- Admin SELECT `USING (is_yagi_admin(auth.uid()))`

---

### K05-002 — HIGH-A — challenge_votes public SELECT leaks voter identities

**File:** `supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql:329`

Policy `challenge_votes_select` is `FOR SELECT USING (true)`. Anon callers can read `(challenge_id, submission_id, voter_id)` — voter identity leakage.

**Reproduction:** Anon PostgREST query on `public.challenge_votes`.

**Fix (requires migration):**
- Remove public row-level SELECT entirely
- Add aggregate SECURITY DEFINER RPC `get_submission_vote_counts(challenge_id)` returning submission_id + count
- Keep owner SELECT `USING (voter_id = (select auth.uid()))` for "did I vote?" UX
- Keep admin SELECT for moderation

UI patch in `src/app/challenges/[slug]/gallery/page.tsx:44` + `announce/page.tsx:57` (switch to RPC call).

---

### K05-003 — HIGH-C — Submission content validation bypassable via direct table write

**File:** `supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql:294, :307`

Policies `challenge_submissions_insert_self` and `challenge_submissions_update_self` allow creators/studios to write their own rows with ARBITRARY content + status. `submitChallengeAction` Zod `safeParse` only runs in the app path. Direct PostgREST write bypasses validation.

**Reproduction:** Authenticated creator INSERTs directly with `status='ready'` + arbitrary `content` JSON.

**Fix (requires migration):**
- Option A: REMOVE direct INSERT/UPDATE RLS; route all writes through `submit_challenge_entry(challenge_id, content)` SECURITY DEFINER RPC that does Zod-equivalent checks + R2 ownership check.
- Option B: Add DB trigger validating `content` shape + `status` transitions against challenge config.

Option A is cleaner (aligns with K05-004 R2 ownership tighter path). Option B keeps RLS-based but adds trigger complexity.

---

### K05-004 — HIGH-A — R2 move copies+deletes arbitrary existing objects

**File:** `src/app/challenges/[slug]/submit/actions.ts:181-207`

Move step `CopyObject` + `DeleteObject` on ANY key the caller references. No prefix check (`tmp/${challengeId}/${userId}/...`) + no ownership binding. Attacker extracts a victim submission's public URL, submits with that key → server copies to attacker's submission namespace + **deletes the original**.

**Reproduction:**
1. Load `/challenges/<open>/gallery`
2. Extract a visible submission's asset URL → parse objectKey
3. Call `submitChallengeAction` with that key in `images[].objectKey` or `native_video.objectKey`
4. Original asset deleted

**Fix (app-layer only, no migration):**
- Issuing signed PUT URL: require path convention `tmp/<challengeId>/<userId>/<uuid>/<filename>`
- Submit action: reject any `objectKey` NOT starting with `tmp/${challengeId}/${user.id}/`
- Never `DeleteObject` on a key outside `tmp/` prefix
- Double-check in `submitChallengeAction` before CopyObject

Files to patch:
- `src/app/challenges/[slug]/submit/actions.ts` (requestUploadUrlsAction objectKey construction + submitChallengeAction ownership validation)

---

### K05-005 — HIGH-C — Challenge state machine bypassable via direct admin UPDATE

**File:** `supabase/migrations/20260423030000_phase_2_5_challenge_platform.sql:280`

`challenges_admin_update` policy only checks `is_yagi_admin`. No DB trigger enforcing allowed transitions (draft→open→closed_judging→closed_announced→archived). Any admin can skip stages via raw PostgREST PATCH.

**Reproduction:** Admin PATCH `state='archived'` directly.

**Fix (requires migration):**
- Add DB trigger `BEFORE UPDATE OF state ON challenges` that runs `IF OLD.state IS DISTINCT FROM NEW.state THEN check allowed_transitions END IF`.
- OR: restrict admin UPDATE to non-state columns, require all state changes go through `transition_challenge_state(slug, to_state)` SECURITY DEFINER RPC.

---

### K05-006 — HIGH-C — Challenge config JSONB unchecked at create/update

**File:** `src/app/[locale]/app/admin/challenges/actions.ts:76, :128`

`createChallengeAction` + `updateChallengeAction` cast `submission_requirements` / `judging_config` to `Json` without server-side Zod. Client form builders are client-only (bypassable).

**Fix (app-layer, no migration):**
- Author server-side Zod schemas for both JSONB blobs
- Validate in createChallengeAction + updateChallengeAction before DB write
- Reject malformed with `{ok: false, error: "invalid_requirements" | "invalid_judging"}`

Files to patch:
- `src/app/[locale]/app/admin/challenges/actions.ts` (add schemas + validation)
- Optionally: `src/lib/challenges/types.ts` for exportable Zod

---

## Remediation strategy (yagi morning)

Options, ordered by scope:

**Option 1 — Hardening migration + app patches (recommended):**
1. Author `supabase/migrations/<ts>_phase_2_5_g8_hardening.sql` addressing K05-001, K05-002, K05-003 (option A), K05-005
2. App-layer patches for K05-004 + K05-006
3. Apply migration via MCP
4. Re-run Codex K-05 `codex resume 019dbbcd-...` or fresh pass
5. Expect CLEAN → ship Phase 2.5

**Option 2 — Defer some to Phase 2.6:**
- K05-002 could defer if anon vote leak is acceptable (NOT recommended — PII-adjacent)
- K05-005 could defer if admin trust is tight (NOT recommended — Supabase admin JWT could be compromised)
- K05-001 NOT deferrable — public content of draft/processing/rejected submissions
- K05-003, K05-004, K05-006 NOT deferrable

Option 1 is the safe path. Estimated effort: ~1-2h for migration + app patches + re-K-05.

## What's committed vs not

**Already on branch `worktree-g3-challenges` (pushed to origin):**
- G1-G7 shipped commits (`1fb9dd2` through `90a5b8f`)
- Cron migration `20260424010000_phase_2_5_challenges_closing_reminder_cron.sql` APPLIED to production DB

**On branch but NOT yet committed (G8 WIP docs):**
- `.yagi-autobuild/phase-2-5/CLOSEOUT.md` — skeleton (status needs update to HALTED)
- `.yagi-autobuild/phase-2-5/G8_K05_FINDINGS.md` — this file
- `.yagi-autobuild/contracts.md` — Phase 2.5 section appended
- `.yagi-autobuild/HANDOFF.md` — needs revert (currently says SHIPPED)

Will commit these as a single "G8 WIP halt" commit so yagi has a starting point.

**NOT merged to main.** `main` last saw `79ce0b5` (pre-worktree branch point from session start).

## Next

**STOP autopilot.** yagi morning review expected to:
1. Review this findings doc
2. Decide remediation strategy (Option 1 recommended)
3. Author hardening migration + app patches (may launch a new autopilot sub-chain)
4. Re-run K-05
5. Ship Phase 2.5

Phase 2.6 kickoff blocked until Phase 2.5 ships.

---

## Hardening sub-chain history (2026-04-24 overnight)

### Pass 2 — hardening v1 (commit bcddd04)

**Applied:** 5 policies + 1 RPC + 2 triggers via MCP (`20260424020000_phase_2_5_g8_hardening.sql`). App patches: R2 key prefix ownership + admin JSONB Zod.

**Codex verdict (task-moca84u0):** HIGH_FINDINGS — 5/6 closed, K05-003 partially open.

Closed: K05-001, K05-002, K05-004, K05-005, K05-006. K05-003 remains because v1 trigger only checked text_description + status + content type, not full submission_requirements schema.

### Pass 3 — hardening v2 (commit 5ceff0f)

**Applied:** Extended `validate_challenge_submission_content()` to cover native_video/image/pdf/youtube_url required-ness + object/array shape + image count bounds + YouTube regex (`20260424030000_phase_2_5_g8_hardening_v2.sql`).

**Codex verdict (task-mocb3c3j):** HIGH — 2 K05-003 variants remain.

### Remaining open findings (after hardening v2)

**K05-003A — HIGH-C — Optional field wrong-type bypass**
- Scenario: `content = {"pdf": ""}` (string instead of object)
- Root cause: trigger guards `IF jsonb_typeof(content->'pdf') = 'object'` — wrong-type values skip validation silently
- Fix: explicit reject when field is present but jsonb_typeof mismatches expected type, regardless of required-ness

**K05-003B — HIGH-C — Undeclared key bypass**
- Scenario: challenge `submission_requirements` doesn't declare `native_video`, but creator writes `content.native_video = <anything>`
- Root cause: no whitelist check — undeclared keys pass through
- Fix: "if requirement absent AND key present → reject", or whitelist allowed keys from v_reqs

### Impact analysis (Builder judgment, pending yagi decision)

K05-003A/B require authenticated creator/studio credentials. Attacker can only corrupt their OWN submission row; no cross-user data leak, no privilege escalation. Practical attack surface: corrupt own `content` shape → own gallery card or admin judging view may render incomplete data. Codex maintained HIGH-C; Builder suggests possible downgrade to MED given the self-corruption-only impact, but defers to yagi.

### Proposed v3 spec (NOT written/applied — loop budget exhausted)

Add to `validate_challenge_submission_content()`:

```sql
-- Reject wrong-type when key present (regardless of required flag)
IF NEW.content ? 'native_video' AND jsonb_typeof(NEW.content->'native_video') <> 'object' THEN
  RAISE EXCEPTION 'native_video_wrong_type' USING ERRCODE = '22023';
END IF;
IF NEW.content ? 'images' AND jsonb_typeof(NEW.content->'images') <> 'array' THEN
  RAISE EXCEPTION 'images_wrong_type' USING ERRCODE = '22023';
END IF;
IF NEW.content ? 'pdf' AND jsonb_typeof(NEW.content->'pdf') <> 'object' THEN
  RAISE EXCEPTION 'pdf_wrong_type' USING ERRCODE = '22023';
END IF;

-- Whitelist: reject undeclared content keys
IF NEW.content ? 'native_video' AND v_reqs->'native_video' IS NULL THEN
  RAISE EXCEPTION 'native_video_not_declared' USING ERRCODE = '23514';
END IF;
IF NEW.content ? 'images' AND v_reqs->'image' IS NULL THEN
  RAISE EXCEPTION 'image_not_declared' USING ERRCODE = '23514';
END IF;
IF NEW.content ? 'pdf' AND v_reqs->'pdf' IS NULL THEN
  RAISE EXCEPTION 'pdf_not_declared' USING ERRCODE = '23514';
END IF;
IF NEW.content ? 'youtube_url' AND v_reqs->'youtube_url' IS NULL THEN
  RAISE EXCEPTION 'youtube_url_not_declared' USING ERRCODE = '23514';
END IF;
```

~20 LOC total. Can be v3 migration if yagi authorizes another loop.

### yagi morning decision matrix

| Path | Action | Effort | Result |
|---|---|---|---|
| A3 | Authorize v3 loop: apply above spec | ~10 min | Should CLEAN the final HIGH |
| B | Remove owner direct writes, route through submit_challenge_entry SECURITY DEFINER RPC | ~1-2h refactor + new migration + G4 action update | Cleaner long-term; bigger diff |
| Downgrade | Accept K05-003A/B as MED, register FU-23, ship | ~5 min | Fast ship, tracked debt |
| Escalate | Full manual review | Variable | Preserves 야기 judgment |

Builder recommendation (pending yagi): **Path A3** — v3 migration is trivially small + keeps chain momentum + no G4 refactor risk.
