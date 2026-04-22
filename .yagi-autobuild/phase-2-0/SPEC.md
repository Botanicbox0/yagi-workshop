# Phase 2.0 — Technical Debt Cleanup (Manual Mode)

**Mode:** Manual gating between groups. **No autopilot.**
**Codex K-05:** G2 + G7 only (other groups low-risk → skip).
**Estimated total:** 5-7 hours (G0 added 30 min; G2 still dominates).
**Builder:** Claude Opus 4.7 (manual)
**Supabase plan:** Free (NANO). Pro not needed at 100-user scale; Storage 1 GB limit is the only real ceiling and that's addressed by a dedicated R2 offload mini-phase later (not Phase 2.0).
**Status:** v3 — All Yagi decisions baked in (G0 snapshot first, Q1/Q2/Q3 resolved). Ready to kick off G0.

---

## Why this phase exists

Phase 1.x autopilot chain (1.0 → 1.9) shipped working features but accumulated:
- Operational blockers that prevent core flows working in production (Phase 1.8 emails)
- Migration drift between disk and DB (11 missing files — silent landmine for fresh-clone reproducibility)
- Deferred Codex K-05 MEDIUM/LOW items across 6 phases (small individual risk, accumulating noise)
- Cross-phase coupling that's only documented in summaries (hard for future phases to reason about)
- A near-miss secret leak that GitHub push protection caught — no preventive control in place yet

Phase 2.0 ships a clean baseline before Phase 2.x feature work resumes. After 2.0:
- Production email dispatch actually works
- Fresh `git clone + supabase db reset` reproduces the live schema 1-to-1
- No HIGH/CRITICAL Codex findings open
- Pre-commit secret hook prevents repeat of the OAuth secret leak
- Cross-phase contracts table is the single source of truth for "what does Phase X publish/consume"

---

## Groups (G0 → G7)

Each group has explicit entry criteria, deliverables, exit criteria, and a manual gate. **Do not advance to the next group until the current one's exit criteria pass.** Yagi gates each transition verbally (Telegram or chat).

---

### G0 — Phase 1.9 snapshot backup (foundation for all rollback paths)

**Why:** Phase 2.0 touches operationally-critical surfaces (Edge function secrets, cron schedule, migration history, deferred Codex fixes). Each group's exit criteria allow forward motion, but Phase 2.0 itself has no rollback story. G0 ships that rollback story before any other group runs. Specifically: G2 archives + replaces all migration files, and G4 mass-edits source code — both need a known-good restore point.

**Tasks:**

**1. Git tag the shipped state.**
- `git tag -a phase-1.9-shipped -m "Phase 1.9 shipped — all autopilot 1.0→1.9 features live, Codex K-05 clean. Pre-Phase-2.0 baseline."`
- `git push origin phase-1.9-shipped`
- Verify on GitHub: tag visible at `Botanicbox0/yagi-workshop/releases/tag/phase-1.9-shipped`.

**2. DB schema snapshot.**
- `mkdir -p .yagi-autobuild/snapshots/phase-1-9/`
- `supabase db dump --linked --schema public --schema-only > .yagi-autobuild/snapshots/phase-1-9/schema.sql`
- Verify file is non-empty and contains `create table public.showcases` (Phase 1.9 sentinel).

**3. DB seed-data snapshot (small reference tables only — NOT user data).**
- Dump only tables that are configuration / reference (no PII, no user-uploaded content):
  ```bash
  supabase db dump --linked --data-only \
    --table public.team_channels \
    --table public.notification_preferences \
    > .yagi-autobuild/snapshots/phase-1-9/seed-data.sql
  ```
- Skip: workspaces, profiles, projects, references, threads, messages, meetings, preprod_*, invoices, showcases, notification_events, notification_unsubscribe_tokens, team_channel_messages, team_channel_message_attachments. These hold real user data and don't need rollback (live DB stays untouched).

**4. Migration list snapshot.**
- `supabase migration list --linked > .yagi-autobuild/snapshots/phase-1-9/migration-list.txt`
- This captures the 23 historical entries before G2 baseline insert. After G2 the list will show 24 (22 historical + Phase 2.0 baseline marker on local + remote). The pre-G2 snapshot is the proof point that G2's cosmetic mismatch is intentional.

**5. .env.local checksum (NOT the file itself — secrets must not enter git).**
- `sha256sum .env.local > .yagi-autobuild/snapshots/phase-1-9/env-local.sha256`
- This detects accidental drift / loss of `.env.local` between Phase 1.9 and Phase 2.0 work. The checksum is safe to commit (it does not reveal the contents).

**6. Rollback runbook.**
- Write `.yagi-autobuild/snapshots/phase-1-9/ROLLBACK.md`:
  - **Code rollback:** `git reset --hard phase-1.9-shipped` (destructive — only Yagi runs this).
  - **Migration history rollback (G2 only):** `delete from supabase_migrations.schema_migrations where version = '20260422120000';` then restore disk migration files from `.yagi-autobuild/archive/migrations-pre-2-0/`.
  - **Schema rollback (worst case):** Apply `.yagi-autobuild/snapshots/phase-1-9/schema.sql` to a fresh project; this is documented but not expected to be needed because Phase 2.0 G2 only changes migration *bookkeeping*, not the actual schema.
  - **Edge function secret rollback:** `supabase secrets unset RESEND_API_KEY --project-ref jvamvbpxnztynsccvcmr`.

**7. Commit + push the snapshot.**
- `git add .yagi-autobuild/snapshots/ && git commit -m "chore(snapshot): Phase 1.9 shipped state baseline (G0 of Phase 2.0)" && git push`
- The snapshot files are small (schema.sql ~50KB, seed-data.sql ~1KB, migration-list ~2KB, ROLLBACK.md ~1KB, sha256 32 bytes). Safe to commit.

**Exit criteria:**
- `phase-1.9-shipped` tag visible on GitHub
- All 4 snapshot files present + non-empty
- `ROLLBACK.md` covers code, migrations, schema, secrets
- Snapshot commit pushed to origin
- `pnpm build` exit 0 (sanity — should be unchanged from Phase 1.9 ship)

**Codex review:** N/A (no source code changes; just bookkeeping).
**Estimated time:** 30 min.
**Telegram on done:** `G0 done — phase-1.9-shipped tagged + DB schema/seed/migration snapshot + rollback runbook committed.`

---

### G1 — Phase 1.8 ops unblocking (operational)

**Why:** notify-dispatch deployed but no email ever sent because (a) `RESEND_API_KEY` not in Edge runtime, (b) cron not scheduled. Until both done, all Phase 1.8 immediate + digest email paths silently no-op.

**Tasks:**
1. Set Edge function secret:
   ```bash
   supabase secrets set RESEND_API_KEY=re_<value> --project-ref jvamvbpxnztynsccvcmr
   ```
2. Wire cron schedule (10min interval). Three options, pick one:
   - **A.** CLI: `supabase functions schedule create notify-dispatch --cron "*/10 * * * *"`
   - **B.** Dashboard: Edge Functions → Cron → New Schedule
   - **C.** Vault-stored service-role key + `cron.schedule(...)` SQL call (rejected earlier as security concern; only viable if A/B fail)
3. Verify end-to-end:
   - Trigger an emit (e.g., open + assign a meeting in /meetings to fire `meeting_scheduled` high-severity event)
   - Watch `notification_events` row appear with `email_batch_id IS NULL`
   - Wait ≤10 min for cron fire
   - Confirm `email_sent_at` populated + actual email arrives (check inbox)
   - On failure: cron logs in Dashboard → Edge Function logs

**Exit criteria:**
- One real email delivered through notify-dispatch
- Cron schedule visible in Dashboard listing
- `notification_events` row shows `email_sent_at` set

**Codex review:** N/A (operational only).
**Estimated time:** 30 min (mostly waiting for cron tick + email arrival).
**Telegram on done:** `G1 done — notify-dispatch live (Resend + cron OK).`

---

### G1.5 — Secret leak prevention (added per Yagi)

**Why:** The Phase 1.9 push surfaced a real Google OAuth Client Secret in `docs/google-oauth-setup.md`. GitHub push protection caught it but only because the user pushed; if local-only or to a non-GitHub remote, it would have leaked silently. Need preventive controls.

**Tasks:**

**1. Spec template rule.**
- Add a `.yagi-autobuild/spec-template.md` (new file) with mandatory header section:
  > **Secret hygiene:** NEVER inline real secrets (API keys, OAuth client secrets, JWT bearer tokens, database passwords) in spec or summary docs. Use placeholders like `<your-secret>` or env-var references like `$RESEND_API_KEY`. Real values live ONLY in `.env.local` (gitignored) or Supabase Vault.
- Update existing template references in `AUTOPILOT.md` and the `b-o-e-orchestrator` skill (if any) to require this header on all future phase specs.

**2. Pre-commit hook.**
- Add `.husky/pre-commit` (project already uses pnpm — husky integrates cleanly):
  ```sh
  #!/usr/bin/env sh
  . "$(dirname -- "$0")/_/husky.sh"

  # Scan staged diff for known secret patterns; reject commit if any match.
  PATTERNS='GOCSPX-|re_[a-zA-Z0-9]{20,}|sk-ant-api03|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9|8649256889:|QhJkgjv4X0T'

  if git diff --cached --diff-filter=ACM | grep -nE "^\+" | grep -E "$PATTERNS"; then
    echo ""
    echo "🚨 Pre-commit: secret pattern detected in staged diff."
    echo "Redact the value (use a placeholder) and re-stage. Do NOT bypass with --no-verify."
    exit 1
  fi
  ```
- Install via `pnpm add -D husky && pnpm husky init` (sets up `.husky/` directory).
- Test: stage a file containing `GOCSPX-fake_test_value` → commit must reject.

**3. Document.**
- Update `CLAUDE.md` "Known gotchas" section: "Secrets are scanned by pre-commit hook on staged diffs. To add a new pattern, edit `.husky/pre-commit`."
- Add the same scan as a CI step (GitHub Actions `.github/workflows/ci.yml` if not already present — defer if no CI exists yet).

**Exit criteria:**
- `pnpm install` runs husky's prepare script automatically
- `git commit` with a fake secret in staged file is rejected
- `.yagi-autobuild/spec-template.md` exists and CLAUDE.md references it

**Codex review:** N/A (small enough to eyeball).
**Estimated time:** 30 min.
**Telegram on done:** `G1.5 done — pre-commit secret hook + spec template live.`

---

### G2 — Migration baseline squash (Option C — cosmetic mismatch accepted)

**Why:** Disk has 12 migration files (Phase 1.0/1.5/1.6/1.7/1.8/1.9 series). DB has 23 applied entries in `supabase_migrations.schema_migrations`. The 11 missing-from-disk migrations (Phase 1.1, 1.2, 1.2.5, 1.3, 1.4) were applied via direct SQL or MCP `apply_migration` without the file landing on disk. Result: a fresh clone + `supabase db reset` does NOT reproduce production schema.

**Yagi's chosen approach: C — Cosmetic mismatch.** Rationale: Branching not viable on Free plan; Option A truncate too risky for solo dev. Option C trade-off (cosmetic mismatch in `supabase migration list`) is acceptable. Concretely: archive existing disk migrations + dump DB to a single canonical baseline + register the baseline as a new entry in remote `schema_migrations` (no truncate of the 23 historical rows). Fresh clones reproduce schema via the new baseline; the 22 historical entries remain as inert historical records that show as "missing locally" in `supabase migration list` (this is the cosmetic mismatch).

**Tasks:**

**1. Archive existing migrations.**
- Create `.yagi-autobuild/archive/migrations-pre-2-0/`
- Move all 12 disk migrations there (preserve filenames + timestamps)
- For the 11 missing-from-disk migrations, document their existence in `.yagi-autobuild/archive/migrations-pre-2-0/MISSING.md` listing each `version` from `supabase_migrations.schema_migrations` and a one-line note about what the migration likely contained (cross-reference Phase summaries)

**2. Generate baseline.**
- Run `supabase db dump --schema public --data-only=false --schema-only > supabase/migrations/20260422120000_phase_2_0_baseline.sql`
- Manually verify the dump includes:
  - All tables (workspaces, projects, references, threads, messages, settings, meetings, preprod_boards, preprod_frames, preprod_frame_revisions, invoices, invoice_line_items, journal_entries (or content collections), team_channels, team_channel_messages, team_channel_message_attachments, notification_events, notification_preferences, notification_unsubscribe_tokens, showcases, showcase_media, …)
  - All RLS policies (use `is_yagi_admin(uid)` / `is_ws_member(uid, wsid)` / `is_ws_admin(uid, wsid)` explicit form per Phase 1.7 lessons)
  - All RPCs (resolve_user_ids_by_emails, increment_showcase_view, is_yagi_admin, is_ws_member, is_ws_admin, etc.)
  - All triggers (tg_set_updated_at, tg_set_notif_prefs_updated_at, etc.)
  - All indexes (including partial unique on debounce)
  - Realtime publication membership (notification_events, team_channel_messages, team_channel_message_attachments, etc.)
  - Storage bucket creation + storage RLS policies (for *-attachments, showcase-media, showcase-og)
  - Extensions (pg_cron, pg_net, pgcrypto, plpgsql)

**3. Register baseline entry in remote schema_migrations (no truncate).**
- Remote `schema_migrations` keeps all 22 historical entries as inert records (preserved for forensics).
- Add the new baseline as a single new entry:
  ```bash
  supabase migration insert 20260422120000 phase_2_0_baseline --linked
  ```
  This records the baseline version in remote without re-running it (statements column gets a dummy `ARRAY['-- baseline squash']` placeholder; it's only inspected, not re-executed).
- Verify: `supabase db diff --linked` returns empty (or only trivial whitespace).
- Expected: `supabase migration list --linked` will show 22 entries marked "missing locally" + the new baseline marked applied locally + remote. This cosmetic mismatch is intentional per Option C and is documented in CLAUDE.md (next task).

**4. Verify reproducibility.**
- On a clean checkout (or after `supabase db reset --local`), run `supabase migration up`
- Run `pnpm tsc --noEmit` against regenerated `database.types.ts` (regenerate first via `supabase gen types typescript --linked`)
- All 11 routes must still build (`pnpm build`)

**5. Codex review (REQUIRED for G2).**
- Spawn Codex K-05 fresh-context review of the baseline SQL
- Focus: RLS completeness (no table missing a policy), explicit `auth.uid()` form, WITH CHECK on UPDATE policies, realtime publication membership, RPC SECURITY DEFINER + search_path lockdown
- Any HIGH/CRITICAL → fix before moving on

**6. Document the cosmetic mismatch in CLAUDE.md.**
- Add to CLAUDE.md "Known gotchas" (or new "Migrations" section):
  > **Migration list cosmetic mismatch:** `supabase migration list` output shows 22 historical entries marked "missing locally". This is intentional per Phase 2.0 Option C (Free plan, no branching, truncate too risky). The single `20260422120000_phase_2_0_baseline.sql` is the canonical fresh-clone reproducer; the 22 historical entries are inert forensic records. Do NOT attempt to "fix" the mismatch by truncating remote `schema_migrations` — that's the path Phase 2.0 explicitly rejected.

**Exit criteria:**
- Disk has exactly one migration: `20260422120000_phase_2_0_baseline.sql`
- `supabase db diff --linked` returns empty
- Remote `schema_migrations` has 23 rows (22 historical + 1 new baseline)
- `pnpm build` exit 0
- Codex K-05 0 HIGH/CRITICAL on baseline
- CLAUDE.md updated with cosmetic-mismatch note

**Codex review:** YES (mandatory).
**Estimated time:** 2-3 hours.
**Telegram on done:** `G2 done — single baseline migration, DB ↔ disk reconciled, Codex clean.`

---

### G3 — Phase 1.5 POPBILL mock → live readiness (documentation only)

**Why:** Phase 1.5 shipped in MOCK_MODE because 팝빌 (Popbill) approval was pending. When approval lands, flipping to live should be a one-line env change, not a code rewrite. Document the procedure now while context is fresh.

**Tasks:**
1. Write `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md`:
   - Env vars to set: `POPBILL_MODE=live`, `POPBILL_LINK_ID=<value>`, `POPBILL_SECRET_KEY=<value>` (use placeholders — real values via Supabase Vault or `.env.local`)
   - Where the env gate lives in code (point to specific file:line)
   - The `is_mock` UI banner that should disappear after flip (already exists per Phase 1.5 implementation)
   - E2E checklist: issue ONE real Taxinvoice in 팝빌 test environment after flip; confirm 국세청 호출 lands; check the bond is a "test" bond not "real" until production credentials acquired separately
2. Ensure `.env.local.example` has the three POPBILL env vars listed (with placeholders **AND inline comments**):
   ```env
   # POPBILL (Korean tax invoice issuer). Currently MOCK_MODE — these are placeholders
   # for the post-2.0 live flip. See .yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md.
   POPBILL_MODE=mock
   POPBILL_LINK_ID=<your-popbill-link-id>
   POPBILL_SECRET_KEY=<your-popbill-secret-key>
   ```
   Rationale: signals intent to future contributors and avoids "undocumented config" surprise after live flip.
3. Add a CLAUDE.md note: "Phase 1.5 POPBILL is in MOCK_MODE; see `.yagi-autobuild/phase-2-0/POPBILL_LIVE_FLIP.md` to enable live."

**Exit criteria:**
- Doc exists, references real file:line locations
- `.env.local.example` has POPBILL_* placeholders
- CLAUDE.md updated

**Codex review:** N/A (docs only).
**Estimated time:** 15 min.
**Telegram on done:** `G3 done — POPBILL flip doc ready, blocked on Yagi receiving 승인.`

---

### G4 — Cross-phase Codex deferred items (triage + batch fix)

**Why:** Task #24 tracks deferred MEDIUM/LOW items from Phases 1.2.5, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8 Codex K-05 reviews. These accumulate as low-grade noise. Triage and pick high-impact fixes; defer or close the rest.

**Tasks:**

**1. Triage.**
- Read each phase summary's "Deferred follow-ups" section (`.yagi-autobuild/summary-phase-{1.2.5..1.8}.md`)
- For each item:
  - **Still relevant after Phase 1.9 changes?** (Many may have been incidentally fixed by later phase migrations or refactors.)
  - **Impact level:** does it affect production correctness, security, or just code smell?
- Categorize each as: `FIX_NOW` / `DEFER_TO_2_1` / `WONT_FIX` (with reason)

**2. Fix the FIX_NOW set.**
- **Hard cap: 10 items.** No exceptions. Even if triage finds 15 items that are all "high impact", pick the top 10 by impact × ease.
- Overflow rule: any FIX_NOW items beyond #10 → moved to `.yagi-autobuild/phase-2-1-backlog.md` (created by this task if absent), ordered by triage priority. Phase 2.1 (or later) will pull from there.
- Group by file/area to minimize churn.
- Each fix: small commit with clear message referencing the original phase + Codex finding ID.

**3. Update task #24 + create Phase 2.1 backlog file.**
- Mark fixed items as completed.
- Move DEFER_TO_2_1 items + overflow items into `.yagi-autobuild/phase-2-1-backlog.md` (one heading per phase, bullet per item with original Codex finding text + triage rationale).
- Document WONT_FIX items inline in the relevant code (one-line comment with rationale).

**Likely high-priority items (preview):**
- Phase 1.7 deferred: M3 (`markChannelSeen` returns `{ ok: true }` on auth failure — silent foot-gun)
- Phase 1.7 deferred: M2 (`success_channel_unarchived` toast key missing → reuses wrong key)
- Phase 1.6 deferred: locale toggle 404 on missing twin (real UX issue)
- Phase 1.5 deferred: any HIGH that survived initial sweep (re-check)
- Phase 1.8 deferred: M1 (`confirmUnsubscribe` UPDATE lacks `WHERE used_at IS NULL` race guard)
- Phase 1.8 deferred: M6 (`thread_message_new` emits to all YAGI admins regardless of workspace)
- Phase 1.8 deferred: M7 (Settings timezone field is unrestricted)

**Exit criteria:**
- 5-10 items fixed
- Triage doc at `.yagi-autobuild/phase-2-0/G4_TRIAGE.md` records every deferred item + decision
- `pnpm build` exit 0 after all fixes

**Codex review:** N/A (low-risk small fixes; build-only verify).
**Estimated time:** 1-2 hours (depends on triage outcomes).
**Telegram on done:** `G4 done — N items fixed, M deferred to 2.1, K won't-fix.`

---

### G5 — Phase 1.9 MEDIUM (M1–M5)

**Why:** Phase 1.9 Codex K-05 found 5 MEDIUM items, deferred per autopilot rules. All are bounded fixes worth doing now while showcase code is fresh.

**Tasks:**

- **M1 — caption persistence.** Add `updateShowcaseMediaCaption(mediaId: string, caption: string)` Server Action; wire `handleCaptionBlur` in `showcase-editor.tsx:417` to call it instead of mutating local state only.
- **M2 — embed_provider Zod refinement.** In `addShowcaseMedia` Zod schema, add `.refine((v) => v.mediaType === "video_embed" || !v.embedProvider)`. Add DB CHECK constraint `embed_provider IS NULL OR media_type = 'video_embed'` (in a new migration applied in G2's baseline OR a small follow-up migration if G2 already done).
- **M3 — embed host allowlist.** In `actions.ts:103-114` `isAllowedEmbedUrl`, drop the `host.endsWith("." + allowed)` subdomain fallback. Use exact host list: `www.youtube.com`, `youtube.com`, `youtu.be`, `player.vimeo.com`, `www.vimeo.com`, `vimeo.com`, `www.tiktok.com`, `tiktok.com`, `www.instagram.com`, `instagram.com`. Update `buildEmbedUrl` in viewer to match.
- **M4 — UUID regex tightening.** In `src/app/api/showcases/[id]/og/route.tsx:198`, replace loose `/^[0-9a-f-]{32,36}$/i` with strict `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i` (already used in actions.ts as `UUID_RE` — extract to `src/lib/utils.ts`).
- **M5 — /work pagination clamp.** In `src/app/[locale]/work/page.tsx:69-91`, after fetching `count`, clamp `page` to `Math.min(page, totalPages)` (or redirect to last valid page if `page > totalPages`).

**Exit criteria:**
- All 5 MEDIUM items fixed in code
- `pnpm build` exit 0
- Manual smoke test: add a caption + reload → caption persists; OG endpoint with malformed UUID → 404 not 500; /work?page=9999 → renders last page

**Codex review:** N/A (verify against original Codex report instead).
**Estimated time:** 1 hour.
**Telegram on done:** `G5 done — Phase 1.9 MEDIUM (M1-M5) all fixed.`

---

### G6 — Phase 1.9 LOW + cross-phase dead i18n keys

**Why:** Bottom of the deferred backlog. Mostly cosmetic but accumulates.

**Tasks:**

**Phase 1.9 LOW:**
- **L1 — draft slug collision retry.** In `createShowcaseFromBoard`, wrap the draft slug insert in retry-on-23505 (similar to debounce pattern from Phase 1.8).
- **L2 — requestBadgeRemoval audit.** Decision: leave as-is for now (Vercel log drain is acceptable retention); add a code comment with rationale + future task pointer.
- **L3 — unused `locale` param.** Remove `locale` from `renderEmpty` helper signature in `showcases/page.tsx:343-376` if truly unused.
- **L4 — YouTube Shorts URL handling.** In `buildEmbedUrl` (viewer), detect `/shorts/{id}` URLs and rewrite to `/embed/{id}`.

**Cross-phase i18n cleanup:**
- Phase 1.7 dead keys: `team_chat.message_load_more`, `error_load_failed`, `nav_label`
- Phase 1.6 dead keys (per task #24): list them, decide remove vs keep
- Phase 1.8 forfeited keys (post-H1 fix): identify any
- Use grep to verify each "dead" key really has no consumer; remove from both `messages/ko.json` + `messages/en.json`

**Exit criteria:**
- Each L1-L4 either fixed or has inline rationale comment
- i18n key count drops by N (record N in commit message)
- `pnpm build` + `pnpm tsc --noEmit` exit 0

**Codex review:** N/A.
**Estimated time:** 30-60 min.
**Telegram on done:** `G6 done — LOW items + dead i18n keys cleaned.`

---

### G7 — Cross-phase contracts documentation (added per Yagi)

**Why:** Phase coupling is currently only documented in summaries. Future phases need to know: "if I emit a `feedback_received` event, who consumes it?" and "if I add a column to `showcases`, what reads it?" A single contracts table is the source of truth.

**Tasks:**

**1. Write `.yagi-autobuild/contracts.md`.**

**Format (confirmed):** one section per Phase, each with sub-tables (NOT a single mega-table). Per-phase grouping makes it easy for future phases to skim "what does Phase 1.8 publish?" without horizontal scrolling. Mega-table was rejected — too wide for terminal viewing + buries phase boundaries.

```markdown
## Phase 1.8 — Notifications

### Tables created
| Table | Purpose | Owners (read/write) |
|---|---|---|
| notification_events | Inbox for all notifications | Service-role write (emit); user read (panel/bell); Edge function update (mark sent) |
| notification_preferences | Per-user delivery prefs | User read+write |
| notification_unsubscribe_tokens | One-time unsubscribe tokens | Service-role only |

### RPCs
| RPC | Purpose | Caller | Security |
|---|---|---|---|
| resolve_user_ids_by_emails(text[]) | Email → user_id batch lookup | Edge function | SECURITY DEFINER |

### Notification events emitted
| Event kind | Severity | Triggered by | Subscribers |
|---|---|---|---|
| meeting_scheduled | high | Phase 1.3 meetings/actions.ts | All workspace_members |
| feedback_received | medium (debounced) | Phase 1.4 share/[token]/{reactions,comments} | Workspace admins |
| ... | ... | ... | ... |

### Realtime publication
- notification_events (INSERT, UPDATE)

### Storage buckets
- (none — emails sent via Resend, no attachments)
```

Repeat for each shipped phase (1.1 through 1.9). Be exhaustive: every table, every RPC, every notification event, every storage bucket, every realtime channel.

**2. Cross-reference check.**
- For every notification event in the table, grep the codebase to confirm the listed subscriber actually subscribes.
- For every table, confirm the listed read/write owners actually access it.
- Discrepancies → either the table is stale (update doc) or the code is wrong (file as a finding).

**3. Codex review (REQUIRED for G7).**
- Spawn Codex K-05: read the contracts table, then independently audit the codebase, then report any contracts that are wrong or missing.
- Focus: completeness (every cross-phase coupling captured) + correctness (claimed subscribers actually subscribe).
- Any HIGH/CRITICAL → fix before sign-off.

**Exit criteria:**
- `.yagi-autobuild/contracts.md` exists and covers all 9 shipped phases
- Codex K-05 verification clean
- CLAUDE.md updated with pointer: "Cross-phase contracts: see `.yagi-autobuild/contracts.md`. Update on every new table / RPC / notification event."

**Codex review:** YES (mandatory).
**Estimated time:** 30-60 min (write) + 30 min (Codex pass) = ~1 hour.
**Telegram on done:** `G7 done — contracts.md complete + Codex clean. Phase 2.0 SHIPPED.`

---

## Manual gate protocol (between groups)

After each group's exit criteria pass:
1. Run `pnpm tsc --noEmit` + `pnpm build` (must exit 0)
2. For G2 + G7: spawn Codex K-05 review, address any HIGH/CRITICAL
3. Send Telegram one-liner per group's "Telegram on done" template
4. **Wait for Yagi's verbal go-ahead in chat before starting next group**
5. No autopilot. No auto-advance. No self-paced wakeups.

---

## What Phase 2.0 explicitly does NOT do

- No new feature work
- No POPBILL live switch (G3 only documents — actual flip is post-2.0 manual op when 승인 lands)
- No mobile/responsive polish (defer to dedicated Phase 2.1+)
- No performance audit (defer)
- No new dependencies (security hook uses husky which is dev-only)
- No CI setup (G1.5 mentions GitHub Actions as "defer if no CI exists yet" — not in scope)
- **No R2 / external storage offload.** Supabase Free Storage is 1 GB. When showcase media + team-chat attachments push past ~700 MB, a dedicated Phase 2.x mini-phase will introduce Cloudflare R2 (or equivalent) for media offload. Out of scope here — addressed when usage actually approaches the limit.

---

## Success criteria (whole phase)

1. ✅ G0: `phase-1.9-shipped` tag on origin + DB schema/seed/migration snapshots committed + ROLLBACK.md
2. ✅ G1: One real email delivered through notify-dispatch end-to-end
3. ✅ G1.5: Pre-commit hook rejects a fake-secret commit; spec template in place
4. ✅ G2: `supabase db diff --linked` empty; one baseline migration on disk; remote `schema_migrations` has 22 historical + 1 baseline; Codex clean; CLAUDE.md cosmetic-mismatch note added
5. ✅ G3: POPBILL flip doc + env example with inline comments + CLAUDE.md note
6. ✅ G4: Triage doc + ≤10 deferred items fixed; overflow in `phase-2-1-backlog.md`
7. ✅ G5: All 5 Phase 1.9 MEDIUM items fixed
8. ✅ G6: All 4 Phase 1.9 LOW items addressed; dead i18n keys removed
9. ✅ G7: contracts.md complete (per-phase sections); Codex clean
10. ✅ `pnpm build` + `pnpm tsc --noEmit` exit 0 throughout
11. ✅ No new HIGH/CRITICAL Codex findings open at end

---

## Resolved decisions (v3)

All open questions from v2 have been answered by Yagi and baked into the relevant group sections:

| # | Question | Resolution | Where it lives |
|---|---|---|---|
| Q1 | G4 fix budget if triage finds >10 items | Hard cap at 10. Overflow → `.yagi-autobuild/phase-2-1-backlog.md` | G4 Tasks 2 + 3 |
| Q2 | G7 contracts.md format (per-phase vs mega-table) | Per-phase sections (mega-table rejected for terminal-width + buried boundaries) | G7 Task 1 |
| Q3 | `.env.local.example` POPBILL_* inclusion | YES + inline comments explaining MOCK_MODE + flip-doc pointer | G3 Task 2 |

Plus from v2:
| Q (orig v1) | Resolution | Where |
|---|---|---|
| G2 truncate risk | Option C (cosmetic mismatch — no truncate) | G2 intro + Task 3 |

---

**End of SPEC v2. Ready for G1 kickoff on Yagi's verbal go.**
