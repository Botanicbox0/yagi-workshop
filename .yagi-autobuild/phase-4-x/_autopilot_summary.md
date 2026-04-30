# Phase 4.x — Autopilot summary (yagi-first-read)

**Window**: 2026-04-30T17:16Z (ENTRY) → 2026-05-01T04:25Z (autopilot END before Wave D)
**Branch**: `g-b-9-phase-4` (NOT pushed; NOT ff-merged to main)
**Total commits above main 5bfca60**: 44 (21 cherry-picks + 23 Phase 4.x work)
**Final HEAD**: see `git log --oneline g-b-9-phase-4 -1`
**Verify**: `pnpm exec tsc --noEmit` exit 0 / `pnpm build` exit 0 / `pnpm lint` baseline-pinned (3155 errors, identical to main)

---

## Wave-by-wave status

| Wave | Tasks | Status | Sub-commits | Key SHAs |
|---|---|---|---|---|
| A | task_01 / task_02 / task_03 + BLOCKER 1 | ✅ SHIPPED | 6 commits | 02f0628, 3ae60c6, 93d1fb7, 3315d37, 9f501d1, bbb8b73 |
| B | task_04 (post-submit detail page redesign) | ✅ SHIPPED | 10 sub-commits | d0a0df7 ... ad4075e |
| C | task_05 (commission redirect + dashboard + sidebar) / task_06 (workspace switcher) / task_07 (license stub) | ✅ SHIPPED | 6 commits | 2ea3133 → 57774b4 |
| D | K-05 + manual SQL verify + browser smoke + ff-merge | ⛔ BLOCKED — yagi K-05 reviewer decision needed |

`_wave_a_result.md`, `_wave_b_result.md`, `_wave_c_result.md` carry the per-wave detail. Per-task `result_NN.md` files exist for task_01, task_02, task_03, task_04, task_07. (task_05, task_06 results captured inside `_wave_c_result.md` for compactness.)

---

## What's on g-b-9-phase-4 right now

### DB schema (LOCAL ONLY — not yet applied to prod)

`supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql`:
- `workspaces.kind` text NOT NULL DEFAULT 'brand' CHECK IN ('brand','artist','yagi_admin') + idx
- `projects.twin_intent` text NOT NULL DEFAULT 'undecided' CHECK IN ('undecided','specific_in_mind','no_twin')
- `projects.kind` 6-value CHECK (direct + 5 inbound/talent variants) replacing the previous constraint
- `project_licenses` table (13 columns) + 2 indexes + 3 RLS policies + `tg_touch_updated_at()` trigger
- BLOCKER 1 fix applied: `project_licenses_select_owner` policy uses `created_by` (not `owner_id`) per yagi 4.2 = B

### Application surfaces

- `/app/projects/new` wizard
  - **task_02**: submit error toast i18n + `console.error` + validation/db error UX distinction. Hardcoded Korean strings replaced with `wizard.step3.errors.{unauthenticated,submit_validation,submit_failed}` keys (ko + en).
  - **task_03**: Step 3 Twin intent 3-radio (locked option A) + tooltip + `wizard.step3.twin_intent.*` (6 keys × 2 locales). 3-layer zod defense (client + server + DB CHECK).

- `/app/projects/[id]` detail page (Wave B redesign)
  - 5-stage status timeline (sage `#71D083` accent on current stage)
  - 1:1 hero card 720×720 + info rail (5 fields)
  - 4-tab nav: 보드 / 진행 active, 코멘트 / 결과물 disabled placeholders (no DB calls)
  - `BriefBoardShellClient` reused verbatim in BoardTab; legacy banner + empty state handled
  - Authorization uses `created_by` (BLOCKER 1 consistency)
  - `project_detail.*` i18n namespace (~50 keys × 2 locales)

- `/app/dashboard` NEW (Wave C task_05)
  - 3 count cards (total / in-progress / delivered) scoped to active workspace
  - Recent 5 RFPs with status pill + 의뢰 일자 + 예산 + Twin intent
  - Empty state CTA → /app/projects/new
  - `dashboard_v4.*` i18n (~25 keys × 2 locales)

- `/app` redirect → `/app/dashboard` (replaces Phase 2 role-branched landing)

- `/app/commission/*` → `/app/projects` (308) middleware redirect with open-redirect protection (`?next=` stripped)

- Sidebar
  - WorkspaceSwitcher at top: cookie-based active workspace, dropdown grouped by kind, disabled "+ 새 workspace 추가"
  - Brand sidebar nav: 대시보드 (NEW first item) + 프로젝트 + 추천 Artist (disabled, Phase 7+) + (existing yagi_admin/role-gated entries)
  - License entry intentionally HIDDEN (Q-103 option A; Phase 6+ adds it)

### Files added (NEW)

```
supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql
src/components/project-detail/{placeholder-tab,status-timeline,hero-card,info-rail,tabs,board-tab,progress-tab}.tsx
src/components/dashboard/{count-cards,rfp-row-card}.tsx
src/components/sidebar/workspace-switcher.tsx
src/lib/workspace/{active,actions}.ts
src/app/[locale]/app/dashboard/page.tsx
.yagi-autobuild/phase-4-x/{KICKOFF,_decisions_locked,_cherry_pick_*,task_plan,result_0{1,2,3,4,7},_wave_a_*,_wave_b_*,_wave_c_*,_autopilot_*}.md
```

### Files modified

```
supabase/migrations/.../20260501000000_phase_4_x_*.sql (BLOCKER 1 fix)
src/app/[locale]/app/page.tsx (-85, +21 redirect)
src/app/[locale]/app/projects/[id]/page.tsx (-587, +230 redesign)
src/app/[locale]/app/projects/new/{actions.ts, new-project-wizard.tsx}
src/app/[locale]/app/layout.tsx (workspace switcher resolve + props pass)
src/components/app/sidebar.tsx (SidebarScopeSwitcher → WorkspaceSwitcher)
src/components/app/sidebar-nav.tsx (대시보드 + 추천 Artist)
src/middleware.ts (commission redirect)
messages/{ko,en}.json (5 new namespaces × 2 locales: wizard.step3.errors, wizard.step3.twin_intent, project_detail, dashboard_v4, workspace.switcher; plus nav additions)
```

---

## Critical incidents during autopilot

### Incident 1 — Agent isolation:worktree fork point bug (caught + recovered)

Initial Wave A spawn (3 Sonnet 4.6 teammates parallel) used `Agent({ isolation: "worktree" })` for task_02 + task_03. Both worktrees were created from **main `5bfca60`** instead of `g-b-9-phase-4` HEAD `0b0706c`. Cherry-picking either commit would have reverted 17,608 lines (the entire 21 cherry-pick set + Phase 3.1 / hotfix-3 work).

Lead Builder (Opus 4.7) caught this on the first cherry-pick attempt (conflict in `new-project-wizard.tsx` showing Phase 3.0 references[] vs Phase 3.1 boardDocument). Both worktree commits REJECTED. Cleanup + manual rework path (yagi 4.1 = X) executed: lead Builder re-implemented task_02 + task_03 against the actual Phase 3.1 wizard structure, sequentially in the main worktree. No spawn used for the rest of autopilot (Wave B + C all lead-Builder direct).

L-NNN candidate for `~/.claude/skills/yagi-lessons`:
> `Agent({ isolation: "worktree" })` creates the worktree from the repo's default branch, NOT from the current branch. For non-default-branch work, either skip isolation or pass an explicit base. Worktree commits cherry-picked onto the originating non-default branch will revert any commits between default and HEAD.

### Incident 2 — BLOCKER 1: KICKOFF spec drift on `project_licenses_select_owner` policy

KICKOFF §task_01 RLS policy referenced `projects.owner_id` but the actual column is `created_by`. yagi confirmed option B (amend the policy SQL + KICKOFF amendment, not add a new column). Fix applied at `93d1fb7`. Wave B detail page authorization + Wave D manual verify both updated to use `created_by` for consistency.

---

## What yagi must decide before Wave D

### 1. K-05 reviewer choice (Q-105)

KICKOFF Reviewer Fallback protocol describes 3 layers. Codex CLI is installed but token availability needs re-verification at Wave D entry:

- **Option α**: Codex K-05 (preferred per `.yagi-autobuild/CODEX_TRIAGE.md` if tokens available)
- **Option β**: Hybrid (Codex on critical paths, Opus self-review on rest)
- **Option γ**: Reviewer Fallback Layer 1 (Opus 4.7 self-review + Layer 2 manual double-check + Layer 3 this-chat second-opinion). KICKOFF describes the prompt template; results land at `_self_review_loop_1.md` / `_self_review_loop_2.md`.

Recommendation: γ if Codex token unavailable; α if available (cheapest + most rigorous).

### 2. Browser smoke checklist (D.11)

- [ ] Wizard Step 1/2/3 happy path → submit → /app/projects/[id] detail loads
- [ ] Each task_03 Twin intent radio option submits + persists (after D.1 migration apply)
- [ ] Wizard error reproducers: unauthenticated path / validation path / db path
- [ ] Detail page tabs: 보드 (board renders + lock works for admin) / 진행 (status_history renders or empty state) / 코멘트 disabled (no fetch) / 결과물 disabled (no fetch)
- [ ] /app/dashboard count cards + recent RFPs match DB
- [ ] /app → /app/dashboard redirect
- [ ] /app/commission → /app/projects 308; `?next=https://evil.com` dropped
- [ ] Workspace switcher: single-workspace user clean dropdown / multi-workspace user (yagi adds via SQL) sees groups + Check on active / cookie tampering reverts to first-membership
- [ ] /ko + /en parity for all new screens
- [ ] Mobile 390px: detail page hero stacks below info rail / status timeline collapses to vertical / tabs scroll-x / dashboard count cards 1-col / workspace switcher dropdown legible
- [ ] L-027 BROWSER_REQUIRED gate: yagi MUST visually verify before pushing

### 3. Manual SQL verify (D.9 Layer 2 — 6 items)

- [ ] `workspaces.kind`: user A (member of W1) attempts UPDATE on W2 kind → DENY confirmed
- [ ] `projects.twin_intent`: client-supplied `'foo'` INSERT attempt → CHECK constraint rejects
- [ ] `projects.kind` 6-value enum: non-RPC INSERT of `'inbound_brand_to_artist'` → DENY confirmed
- [ ] `project_licenses` RLS: non-admin SELECT/INSERT/UPDATE/DELETE all DENY
- [ ] Multi-workspace SELECT: user A (W1 only) attempts to SELECT W2 projects → 0 rows
- [ ] `/app/commission?next=https://evil.com` → /app/projects (no next param honored)

### 4. Wave D execution order (per KICKOFF §Wave D)

1. D.1 — `npx supabase db push --linked` (apply task_01 migration; types regen at D.4)
2. D.2 — psql verify queries (workspaces.kind / projects.twin_intent default / projects.kind enum / project_licenses RLS / trigger)
3. D.3 — `pnpm exec tsc --noEmit && pnpm lint && pnpm build` (already clean on g-b-9-phase-4)
4. D.4 — `npx supabase gen types typescript --project-id jvamvbpxnztynsccvcmr --schema public > src/lib/supabase/database.types.ts` + `chore(phase-4-x): regen database.types.ts post task_01 schema`
5. D.5 — bundle size delta vs cherry-pick baseline (target: each route +30 KB gz cap)
6. D.6 — K-05 reviewer (per yagi decision in §1 above)
7. D.7 — fix HIGH-A + HIGH-B findings (LOOP 1 commits)
8. D.8 — K-05 LOOP 2 (re-run; expect 0 HIGH-A residual)
9. D.9 — manual SQL verify (yagi direct)
10. D.10 — this-chat second-opinion (yagi paste critical diffs to Claude this-chat for missed edge cases)
11. D.11 — browser smoke (above checklist)
12. ff-merge to main (`git checkout main && git merge --ff-only g-b-9-phase-4 && git push origin main`) ← **NEVER auto; yagi initiates**
13. Telegram SHIPPED report

---

## Hand-off

yagi: when you wake up, read this file first. The branch is at the
state described above; `pnpm dev` should start cleanly on port 3001.
Inspect the new surfaces in browser before starting Wave D. If
anything looks off, the per-wave result files have full incident
detail.

When ready to enter Wave D, decide §1 (K-05 reviewer) and signal in
chat. The next Claude Code session can pick up from D.1 with full
context from this summary + the per-wave files.

**push 절대 X. ff-merge 절대 X.** (L-027 BROWSER_REQUIRED gate)
