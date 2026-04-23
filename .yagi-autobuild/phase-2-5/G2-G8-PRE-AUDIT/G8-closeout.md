# G8 Pre-Audit — Codex K-05 + closeout

> Source: survey 2026-04-23.

---

## 1. 현존 인프라 inventory

### Codex review tooling
- `.yagi-autobuild/codex-review-protocol.md` — review protocol reference
- `.yagi-autobuild/phase-2-5/G0_CODEX_REVIEW.md` — phase G0 review log (exists)
- Codex plugin available per session skill (`codex:rescue`, `codex:setup`, etc.)

### HANDOFF.md
`.yagi-autobuild/HANDOFF.md` — top-level ops state. Phase 2.1 SHIPPED, Phase 2.5 entry ready (pre-G1 readiness at time of survey). G8 closeout updates this.

### contracts.md
`.yagi-autobuild/contracts.md` — authoritative cross-phase contracts.
**Critical gap:** NO Phase 2.5 section yet. File scope currently ends at Phase 1.9. SPEC update policy (line 561): "every new table / RPC / notification event / storage bucket / realtime publication member MUST add its entry here in the same PR."

**Must add at G8 (or earlier):**
- 7 new tables (challenges, challenge_submissions, challenge_votes, challenge_judgments, showcase_challenge_winners, creators, studios)
- 2 ALTER contracts (profiles.role/handle/instagram_handle/bio/role_switched_at/handle_changed_at; notification_preferences.challenge_updates_enabled)
- 4 realtime publication adds
- 4 new notification kinds
- 1 new bucket (R2 or Supabase — depends on G4 decision)
- 1 new cron job (challenges-closing-reminder)

### Existing closeout template
Look for `.yagi-autobuild/phase-2-1/CLOSEOUT.md` (past phase precedent) — Phase 2.1 shipped so a closeout doc should exist. Pattern to mirror for Phase 2.5.

### FOLLOWUPS.md
`.yagi-autobuild/phase-2-5/FOLLOWUPS.md` (exists per SPEC). Currently tracks FU-1 through FU-9 (per commit 58dbf6e body):
- FU-1: 정보통신망법 §50 marketing opt-in (G7 dispatch layer)
- FU-2: SPEC §253-254 transactional-only scope clarification (applied inline)
- FU-3: R2 bucket provisioning (G4 entry) ← PRE-AUDIT side-session covers
- FU-4: admin bootstrap SQL (G8 closeout)
- FU-5: reserved handles list (G2 entry)
- FU-6: challenges-closing-reminder pg_cron job (G7 entry)
- FU-7: cron job seed migration (Phase 2.2 or 2.6)
- FU-8: RLS InitPlan rewrite (Phase 2.6)
- FU-9: covering FK indexes (Phase 2.6)

### Build / lint infra
- `pnpm build` — next build (production, type-check inline)
- `pnpm lint` — eslint
- No dedicated test script; vitest optional but not wired
- `.husky/pre-commit` — secret scanner (detailed in CLAUDE.md)

### Migration list state
Current migrations (per survey):
1. `20260422120000_phase_2_0_baseline.sql` (23 Phase 1.x squashed)
2. `20260422130000_phase_1_9_medium_fixes.sql`
3. `20260423020000_h1_preprod_realtime_publication.sql`
4. `20260423020100_seed_yagi_internal_workspace.sql`
5. `20260423020200_create_meeting_with_attendees_rpc.sql`
6. `20260423030000_phase_2_5_challenge_platform.sql` ← G1

G7 cron + G4 bucket migration will add 2-3 more by G8.

---

## 2. 새로 만들어야 할 것 (G8 scope)

### Documents
- `.yagi-autobuild/phase-2-5/CLOSEOUT.md` — mirror Phase 2.1 template if present
  - Per-gate summary (G1-G7)
  - Acceptance criteria checkoff (10 items from SPEC §2)
  - Codex K-05 summary
  - Phase 2.6 entry readiness statement
  - Known carryover items (FOLLOWUPS.md → BACKLOG migration)
- `.yagi-autobuild/phase-2-5/QA_SMOKE.md` — two-browser realtime smoke results + pagination etc.
- Update `.yagi-autobuild/HANDOFF.md` — mark Phase 2.5 SHIPPED, update current ops state
- Update `.yagi-autobuild/contracts.md` — add Phase 2.5 section (see §1 list above)

### Seed migrations (if deferred to G8)
- `<timestamp>_phase_2_5_first_admin_seed.sql` — if SPEC §6 Q1 env-var pattern chosen for first yagi_admin bootstrap
- `<timestamp>_phase_2_5_notify_dispatch_schedule.sql` — if SPEC §3 G7 Task 3 cron is deferred

### Commit
`chore(phase-2-5): G8 closeout — Challenge platform SHIPPED` (per SPEC §3 G8 Task 5)

---

## 3. SPEC vs 현실 drift (의심점)

### Codex HIGH halt rule
- SPEC §3 G8 + §7: Codex HIGH findings halt autopilot
- G2-G7 must produce clean enough output that G8 K-05 is CLEAN or MEDIUM-only
- **Pre-G8 mitigation:** agent-run design-system re-audit after G3/G4/G6 visual reviews (per SPEC §3 G3/G4/G6 acceptance) catches most MEDIUM findings early
- If PRE-1 is not addressed in G2 (i.e., ADR-009 deferred), expect Codex flag at G8 → HIGH likely → halt

### contracts.md update at G8 is late
- SPEC policy says update "in the same PR" as the new-entity landing
- G1 migration was committed (58dbf6e) without contracts.md update → **already out of compliance**
- **Recommendation:** update contracts.md Phase 2.5 section at G2 entry (side task), not G8. Avoids silent drift accumulation.

### Git push timing
- SPEC §3 G8 Task 6: push to `origin/main`
- No Phase 2.5 push has happened yet (per git log, local commits through 58dbf6e)
- Confirm at G8: one consolidated push vs gate-by-gate pushes

### Telegram alerts
- SPEC §7: "Telegram on: G8 complete, any stop point, any HIGH finding"
- Phase 2.1 established this pattern (Telegram bot in Vault)
- G8 must emit completion Telegram — verify bot operational

### Phase 2.6 entry unblock check
- SPEC §3 G8 acceptance #3: "Phase 2.6 entry not blocked"
- Phase 2.6 partial scaffolding exists already (web Claude in-progress SPEC, sidebar 3-tier partial). G8 must list:
  - Any schema assumptions Phase 2.6 inherits from 2.5
  - Any blocked routes / middleware paths
  - Any FOLLOWUPS items that Phase 2.6 consumes (FU-7/8/9)

---

## 4. 외부 의존 / ENV prereq

- Telegram bot (existing, Phase 1.8+) — verify operational for G8 completion alert
- Resend / Supabase / Cloudflare (depending on G4 choice) creds operational
- Vercel deploy pipeline — first Phase 2.5 production deploy happens at/after G8 push

---

## 5. 테스트 전략 권고

G8 itself is paper-pushing (CLOSEOUT writing, contracts.md updates). The test burden was at G1-G7.

| Layer | Scope | Pattern |
|---|---|---|
| Sanity | `pnpm build` succeeds | Exit 0 |
| Sanity | `pnpm lint` clean | Exit 0 |
| Sanity | `supabase db reset` reproduces full schema (SPEC §3 G1 acceptance) | Local test |
| Sanity | All 10 SPEC §2 success criteria checkoff | Manual audit + YAGI-MANUAL-QA-QUEUE |
| Codex | K-05 review on full Phase 2.5 diff | Codex plugin |

---

## 6. 잠재 야기 결정 항목

1. **contracts.md timing** — update at G2 entry (recommended) or bulk at G8 (SPEC's path)
2. **First admin bootstrap** — seed migration at G8 (FU-4) or manual SQL Editor session with env-var pattern from §6 Q1
3. **Rebase/push model** — single merge commit at G8 push vs per-gate commits to main? Phase 2.1 did per-gate; Phase 2.5 should mirror.
4. **Codex HIGH fallback** — if G8 K-05 finds HIGH, autopilot halts. Fix inline (ADR-005 expedited triage allows <20min fixes) or carry to Phase 2.6 BACKLOG?
5. **Post-ship monitoring** — Resend bounce rate, cron job health, realtime connection counts. Dashboard/alert provisioning for Phase 2.5 surfaces — in G8 scope or Phase 2.7?

---

**Cross-ref:** All gates feed into G8. Critical late-finding categories: (a) PRE-1 type collision (must resolve at G2 for clean G8), (b) contracts.md drift (must close before G8), (c) FOLLOWUPS FU-4 admin bootstrap.
