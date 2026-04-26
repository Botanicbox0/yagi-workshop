# Phase 2.8.1 — KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree g-b-1-hardening
SOURCE   = .yagi-autobuild/phase-2-8-1/SPEC.md (vision)
PROTOCOL = .yagi-autobuild/codex-review-protocol.md (review gate)
LOOP_MAX = 2 per fail (AUTOBUILD_MAX_EVAL_LOOPS)
HUMAN    = halt + telegram on HALT trigger only
```

---

## §0 — RUN ON ENTRY

Execute this block first. Do not deviate. Do not ask.

```bash
# 1. Read source of truth
cat .yagi-autobuild/phase-2-8-1/SPEC.md
cat .yagi-autobuild/codex-review-protocol.md
cat .yagi-autobuild/DECISIONS_CACHE.md
cat .yagi-autobuild/phase-2-8/FOLLOWUPS.md

# 2. Verify clean entry state
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -5
test -d .yagi-autobuild/phase-2-8-1 && echo OK_PHASE_DIR
test -f messages/ko.json && echo OK_I18N

# 3. Create worktree (single — no parallel for Phase 2.8.1)
git -C C:/Users/yout4/yagi-studio/yagi-workshop worktree add -b g-b-1-hardening ../yagi-workshop-g-b-1-hardening main
cp .env.local ../yagi-workshop-g-b-1-hardening/.env.local
cd ../yagi-workshop-g-b-1-hardening && pnpm install --frozen-lockfile
```

If any line above outputs a non-zero exit code or an error, transition to `HALT_E0_ENTRY_FAIL`.

---

## §1 — STATE MACHINE

```
STATES = [INIT, G_B1_A, G_B1_B, G_B1_C, G_B1_D, G_B1_E, G_B1_F, G_B1_G, G_B1_H, G_B1_I, G_B1_J, REVIEW, SHIPPED, HALT]
Sequence: A → B → C → D → E → F → G → H → I → J → REVIEW → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 success | G_B1_A | log GATE_ENTER |
| INIT | §0 fail | HALT | escalate E0 |
| G_B1_n | exit_passed | G_B1_(next) | log GATE_EXIT n; commit; log GATE_ENTER next |
| G_B1_n | fail_loop_1 | G_B1_n | re-attempt with corrected diff |
| G_B1_n | fail_loop_2 | G_B1_n | re-attempt with second strategy |
| G_B1_n | fail_loop_3 | HALT | escalate E_n_LOOP_EXHAUSTED |
| G_B1_n | halt_trigger_match | HALT | escalate per §6 trigger code |
| G_B1_J | exit_passed | REVIEW | invoke Codex K-05 (gpt-5.5) |
| REVIEW | codex_PASS | SHIPPED | merge worktree to main, telegram SHIPPED |
| REVIEW | codex_HIGH | G_B1_(matched) | re-enter gate; loop budget 2 |
| REVIEW | codex_loop_3 | HALT | escalate E_REVIEW_LOOP |

Transitions are deterministic. No human approval between transitions except HALT.

---

## §2 — GATES

Each gate has six fields. Run gate body. Verify exit. If exit passes, log + commit + advance.

### G_B1_A — Form action ESLint rule + sweep

```
ENTRY:
  - working dir = worktree g-b-1-hardening
  - SPEC §2 read
EXIT (all required):
  - file exists: eslint custom rule (or config) blocking
    JSXAttribute[name='action'][value=ArrowFunctionExpression(async)]
    in Server Component files
  - pnpm lint surfaces error when an offending pattern is added (test fixture)
  - file exists: scripts/check-rsc-form-action.sh; CI step added to GitHub Actions or pnpm script
  - full src/ sweep finds 0 occurrences (baseline)
  - tsc + lint exit 0
FAIL on:
  - eslint rule false-positive count > 10
  - CI grep step false-flags valid server actions
ON_FAIL_LOOP:
  - loop 1: tighten rule predicate
  - loop 2: switch from custom rule to eslint-plugin-react-server-components
LOG: GATE_EXIT G_B1_A baseline_violations=0 ci_added=true
COMMIT: chore(phase-2-8-1 g-b1-a): rsc form-action lint rule + CI sweep
```

### G_B1_B — Wizard Step 3 → BriefBoardEditor (draft mode)

```
ENTRY: G_B1_A SHIPPED, BriefBoardEditor component intact
EXIT:
  - server action exists: ensureDraftProject(workspaceId, brandId?)
    — returns draft project_id, INSERT projects with status='draft' if none
  - server action exists: submitDraftProject(projectId, allFields)
    — UPDATE existing project, flip status='draft' → 'submitted'
  - new-project-wizard.tsx Step 3 mounts <BriefBoardEditor mode='wizard' />
    with the draft project_id from ensureDraftProject
  - "건너뛰기" / "Skip" button label changes to "다음" / "Next"
  - wizard submit calls submitDraftProject (not createProject INSERT)
  - e2e (manual smoke for now, Playwright in G_B1-G):
      wizard start → Step 1 + 2 → Step 3 add 1 paragraph + 1 image + 1 youtube embed
      → submit → /app/projects/[id]?tab=brief shows the same content
  - tsc + lint + build exit 0
FAIL on:
  - same user creates multiple drafts (race condition)
  - draft becomes zombie when wizard submit fails
  - Phase 2.7.2 createProject fallback path breaks
ON_FAIL_LOOP:
  - loop 1: add unique constraint on (workspace_id, created_by, status='draft')
  - loop 2: feature-flag WIZARD_DRAFT_MODE; default off if regression
LOG: GATE_EXIT G_B1_B drafts_unique=true zombies=0
COMMIT: feat(phase-2-8-1 g-b1-b): wizard step 3 draft-project integration
```

### G_B1_C — SSRF defense-in-depth (3 FU bundle)

```
ENTRY: G_B1_B SHIPPED
EXIT:
  - fetchOgFallback uses redirect: 'manual', re-runs isHostnameSafe per hop, caps 5 hops
  - isPrivateIpv4Octets uses /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./ regex
  - isPrivateIp adds hex-form IPv4-compat IPv6 detection
  - scripts/test-ssrf-defense.mjs unit tests all three vectors
  - test pass: redirect chain to 169.254.169.254 → blocked
  - test pass: 100.65.0.1 → blocked (CGN)
  - test pass: ::7f00:1 → blocked (IPv4-compat)
  - tsc + lint + build exit 0
FAIL on:
  - manual redirect breaks normal OG fetch (false-positive)
  - CGN regex misses RFC 6598 boundary
  - IPv4-compat regex matches IPv4-mapped (already handled, must not double-block)
ON_FAIL_LOOP:
  - loop 1: tighten regex; add test fixtures
  - loop 2: switch to ip-cidr or ip6 npm package (DECISIONS_CACHE Q-083 sibling rule)
LOG: GATE_EXIT G_B1_C ssrf_vectors_blocked=3 og_fetch_ok=true
COMMIT: fix(phase-2-8-1 g-b1-c): ssrf defense-in-depth — redirect, cgn, ipv6-compat
```

### G_B1_D — Workspace → Workshop terminology sweep

```
ENTRY: G_B1_C SHIPPED
EXIT:
  - grep -ri 'workspace' src/components src/app messages
    → only DB column names and internal vars remain (workspace_id, workspace_admin, workspace_member)
    → 0 user-facing labels with "Workspace" / "워크스페이스"
  - messages/ko.json + messages/en.json: all "Workspace" / "워크스페이스" values replaced with "Workshop" / "워크샵"
    (key names preserved — non-breaking change)
  - sidebar / header / footer / breadcrumb: consistent "YAGI Workshop" / "Workshop" wording
  - .yagi-autobuild/* docs: "Workspace" → "Workshop" except archive/* (historical artifacts preserved)
  - tsc + lint + build exit 0
  - manual visual check: locale toggle KO/EN both consistent
FAIL on:
  - DB column name accidentally renamed (migration breaks)
  - i18n key name changed (incompatible)
ON_FAIL_LOOP:
  - loop 1: revert DB-name changes, retain only value-level edits
  - loop 2: split into two commits — i18n values then doc text
LOG: GATE_EXIT G_B1_D ui_workspace_count=0 db_workspace_id_intact=true
COMMIT: refactor(phase-2-8-1 g-b1-d): workspace → workshop terminology sweep
```

### G_B1_E — Phase 2.7.2 + 2.8 dead code cleanup

```
ENTRY: G_B1_D SHIPPED
EXIT:
  - i18n keys deleted: intake_mode_*, proposal_*, nav.commission (ko + en)
  - actions.ts simplified: proposalSchema removed, briefSchema only
  - projects.intake_mode column: kept (legacy data preservation per DECISIONS_CACHE Q-?)
  - page.tsx: intake_mode === 'proposal_request' branch becomes a small read-only banner
    ("이 프로젝트는 이전 proposal mode 로 생성됨 / This project was created in legacy proposal mode")
  - tsc + lint + build exit 0
  - regression smoke: legacy proposal_request project still renders without crash
FAIL on:
  - i18n key deleted but still referenced somewhere (runtime error)
  - legacy proposal_request project page crashes
ON_FAIL_LOOP:
  - loop 1: grep for orphaned references; restore key or remove reference
  - loop 2: add a feature-flag wrapping the deletion
LOG: GATE_EXIT G_B1_E i18n_keys_deleted=N legacy_render_ok=true
COMMIT: chore(phase-2-8-1 g-b1-e): remove dead code from phase 2.7.2 + 2.8
```

### G_B1_F — Tabs i18n + saveVersion RPC + R2 round-trip test

```
ENTRY: G_B1_E SHIPPED
EXIT:
  - BriefTabsNav uses useTranslations('projects') for "Overview" / "Brief board"
  - new keys tab_overview, tab_brief in ko + en
  - migration: pg function save_brief_version(project_id, content_json, label) SECURITY DEFINER
  - saveVersion server action calls the RPC instead of two-step INSERT + UPDATE
  - scripts/test-saveversion-race.mjs: two parallel save attempts → both succeed sequentially, no duplicate version_n
  - scripts/test-r2-brief-asset.mjs: 5MB JPEG upload + signed URL fetch round-trip, exit 0, < 5s
  - tsc + lint + build exit 0
FAIL on:
  - RPC migration breaks production (rollback plan required)
  - race test fails — duplicate version_n
  - R2 round-trip > 5s
ON_FAIL_LOOP:
  - loop 1: add advisory lock to save_brief_version RPC
  - loop 2: split into two migrations (RPC create then server action switch)
LOG: GATE_EXIT G_B1_F race_pass=true r2_ms=<n>
COMMIT: feat(phase-2-8-1 g-b1-f): tabs i18n + saveVersion RPC + r2 round-trip test
```

### G_B1_G — Korean IME e2e + Playwright

```
ENTRY: G_B1_F SHIPPED
EXIT:
  - @playwright/test installed (devDependency, exact-pinned)
  - SPEC §7 self-amended in PR description (recording the dep addition)
  - e2e/brief-board.spec.ts:
      signin as client → wizard create with Korean text "안녕하세요" + image + youtube embed
      → submit → /app/projects/[id]?tab=brief shows content
      → switch to admin user → post comment
      → switch back to client → notification arrives
  - test passes 3 consecutive runs (flake guard)
  - pnpm test:e2e script in package.json
  - CI step (or nightly cron) wired
  - tsc + lint + build exit 0
FAIL on:
  - playwright dev dep accidentally bundled in production build
  - e2e flakes more than 1 in 3 runs
ON_FAIL_LOOP:
  - loop 1: stabilize selectors with data-testid
  - loop 2: increase timeouts; add network idle waits
LOG: GATE_EXIT G_B1_G e2e_pass=3/3 build_size_delta_kb=<n>
COMMIT: test(phase-2-8-1 g-b1-g): playwright e2e + korean ime smoke
```

### G_B1_H — Commission flow integrity ⭐

```
ENTRY: G_B1_J SHIPPED
EXIT:
  F-PUX-002:
    - src/app/[locale]/commission/page.tsx no longer renders the challenge CTA
    - grep -ri 'challenge' src/app/\[locale\]/commission/page.tsx → 0 results
  F-PUX-003:
    - Anonymous click on "의뢰하기" → redirects to /{locale}/signup?next=/app/commission/new
    - signup page preserves the `next` query through email confirm callback
    - check-email panel preserves next URL in the resend resubmit
    - onboarding role page auto-skips for client role when intent is commission
  F-PUX-004 (the L gate):
    - new server action convertCommissionToProject(commissionId)
    - migration: ALTER TABLE commissions ADD COLUMN converted_to_project_id uuid REFERENCES projects(id) ON DELETE SET NULL
    - migration: ALTER TABLE commissions ADD CHECK (status IN ('pending','responded','converted','closed'))
    - INSERT into projects + project_briefs + project_references in a single PG transaction
    - notifications row created for client (kind='commission_converted')
    - admin UI: "Workshop 생성" primary button visible; clicking redirects to /app/projects/[id]?tab=brief
    - RLS verified: only yagi_admin can call convertCommissionToProject (run as workspace_admin and as anonymous → must fail)
    - reference upload bucket: same R2 bucket used by Brief Board, no new bucket
  F-PUX-019:
    - challenge link removed from /commission (covered by F-PUX-002)
    - middleware locale-free /challenges exclude untouched
  e2e (extends existing brief-board.spec.ts):
    - submit commission as anonymous → signup → confirm → lands on /app/commission/new with prefill
    - admin convert → client receives notification → brief board has commission text + references
  tsc + lint + build exit 0
FAIL on:
  - reference loss on conversion (count(project_references) != count(commissions.references[]))
  - non-admin role can call convertCommissionToProject
  - migration breaks existing commissions data (test on staging copy first)
  - notification not delivered
ON_FAIL_LOOP:
  - loop 1: wrap conversion in BEGIN/SAVEPOINT; add reference count assertion
  - loop 2: split migration into two (column add, then constraint) to isolate failure
LOG: GATE_EXIT G_B1_H converted=<n> rls_pass=true ref_loss=0 notif_delivered=true
COMMIT: feat(phase-2-8-1 g-b1-h): commission flow integrity (CTA + intent + admin convert)
```

### G_B1_I — Projects hub IA

```
ENTRY: G_B1_H SHIPPED
EXIT:
  - src/app/[locale]/app/projects/page.tsx: "Contest brief" tab removed (i18n key kept for Phase 3.0+)
  - src/app/[locale]/app/projects/[id]/page.tsx: default tab = brief (searchParams.tab ?? 'brief')
  - Overview tab simplified to metadata only; brief text / references / preprod / thread blocks removed from Overview (now exclusive to Brief tab)
  - legacy ?tab=overview URL still works (not 404)
  - tsc + lint + build exit 0
FAIL on:
  - bookmark URL break
  - content lost from Overview without being available on Brief tab
ON_FAIL_LOOP:
  - loop 1: keep deprecated Overview blocks behind ?legacy=1 query for one phase
  - loop 2: re-audit content placement in Brief tab
LOG: GATE_EXIT G_B1_I default_tab=brief overview_kb_delta=<n>
COMMIT: refactor(phase-2-8-1 g-b1-i): projects hub IA (Brief default + contest tab off)
```

### G_B1_J — Wizard polish bundle

```
ENTRY: G_B1_I SHIPPED
EXIT:
  F-PUX-010:
    - src/app/[locale]/app/projects/[id]/page.tsx: deliverable_types render as raw user input
    - i18n keys deliverable_* marked deprecated (comment in messages/*.json), no usages remain
  F-PUX-015:
    - src/components/brief-board/editor.tsx: empty hint replaced; no "Type / to insert" copy
  F-PUX-016:
    - new i18n key yagi_request_explainer (ko + en) — modal description uses this
    - yagi_request_sent reserved for post-submit toast only
    - YagiRequestModal description uses explainer; submit success uses sent
  tsc + lint + build exit 0
FAIL on:
  - missing translation (en) for new key
  - deliverable_* removed but still referenced somewhere
ON_FAIL_LOOP:
  - loop 1: grep for residual usages, fix
  - loop 2: keep keys for one phase, mark @deprecated in code comment only
LOG: GATE_EXIT G_B1_J keys_added=1 keys_deprecated=<n>
COMMIT: fix(phase-2-8-1 g-b1-j): wizard polish bundle (tags + slash hint + modal copy)
```

---

## §3 — REVIEW (Codex K-05)

```
ENTRY: G_B1_G SHIPPED
PROTOCOL: .yagi-autobuild/codex-review-protocol.md
MODEL: gpt-5.5 (high reasoning effort) per .codex/config.toml
SCOPE:
  - all files changed since main
  - migration sql files (commissions.converted_to_project_id, save_brief_version RPC)
  - RLS policies (especially convertCommissionToProject)
  - new server actions (ensureDraftProject, submitDraftProject, convertCommissionToProject)
INVOKE (Windows PowerShell — verified pattern from DECISIONS_CACHE Q-081):
  cd ../yagi-workshop-g-b-1-hardening
  [Console]::InputEncoding = [System.Text.Encoding]::UTF8
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Get-Content .yagi-autobuild/phase-2-8-1/_codex_review_prompt.md -Encoding UTF8 -Raw `
    | codex exec --model gpt-5.5 -c model_reasoning_effort=high `
    > .yagi-autobuild/phase-2-8-1/_codex_review_output.txt
SEVERITY HANDLING:
  HIGH-A (cross-tenant leak | privilege escalation | auth bypass): HALT regardless of loop
  HIGH-A-SCHEMA-ONLY (DECISIONS_CACHE Q-082): loop 1 auto-fix, loop 2 mandatory verify
  HIGH-B (auth ok but logic flaw): re-enter gate, loop budget 2
  HIGH-C (input validation w/ app-layer guard): downgrade to MED, log, ship
  MED / LOW: log to FOLLOWUPS.md, ship
PASS condition: 0 HIGH-A AND 0 unhandled HIGH-B AND HIGH-A-SCHEMA-ONLY loop 2 PASS
LOG: REVIEW_RESULT codex_findings=<count> high_a=<n> high_a_schema_only=<n> high_b=<n>
```

---

## §4 — SHIPPED

Run on REVIEW pass.

```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop
git checkout main
git merge --ff-only g-b-1-hardening || git merge --no-ff g-b-1-hardening
pnpm exec tsc --noEmit
pnpm build
git push origin main

# emit telegram (single line)
# format: "Phase 2.8.1 SHIPPED · 10 gates · <total_elapsed>h · workshop hardened"
```

Then transition to STOP. Do not start Phase 2.8.2.

---

## §5 — LOG FORMAT (mandatory)

Every transition emits one line to `.yagi-autobuild/phase-2-8-1/_run.log`:

```
<ISO_TIMESTAMP> <STATE> <EVENT> key=value key=value
```

No prose. No "I think". No "Let me know". Key=value only.

---

## §6 — HALT TRIGGERS

| Code | Trigger | Diagnostic |
|---|---|---|
| E0_ENTRY_FAIL | §0 verification fails | output of failed line |
| E_G_B1_A_LINT_FALSE_POSITIVE | rule false-flags 10+ legit servers | rule definition + samples |
| E_G_B1_B_DRAFT_RACE | multiple drafts created same user | DB rows + repro |
| E_G_B1_F_RPC_MIGRATION | RPC migration touches non-spec table | sql diff |
| E_G_B1_H_RLS_LEAK | non-admin role can call convertCommissionToProject | RLS test repro |
| E_G_B1_H_REF_LOSS | reference count mismatch on conversion | sql diff + counts |
| E_G_B1_n_LOOP_EXHAUSTED | gate fails 3x | last 3 attempt diffs |
| E_REVIEW_LOOP | Codex review fails 3x | findings JSON |
| E_HIGH_A_FOUND | non-schema-only HIGH-A | finding location |
| E_SCHEMA_DRIFT | migration affects table outside SPEC §2 | sql diff |
| E_DEP_UNLISTED | new package not in SPEC §7 + not Q-083 sibling | package name |
| E_PROD_TABLE_MUTATION | ALTER/DROP on Phase 1.x tables | sql snippet |
| E_TIMELINE_OVERRUN | total elapsed > HARD_CAP 11d | _run.log timeline |

No HALT trigger requires interpretation. If ambiguous, treat as non-trigger and continue. Telegram-ping on confirmed match only.

---

## §7 — FORBIDDEN

- "Should I proceed?" / "Do you want me to" / "Let me know" → never emitted
- New table not in SPEC §2 → HALT E_SCHEMA_DRIFT
- New dep not in SPEC §7 AND not Q-083 sibling rule match → HALT E_DEP_UNLISTED
- DB column rename in G_B1-D sweep (workspace_id MUST stay) → HALT E_SCHEMA_DRIFT
- i18n key NAME change (only values change in G_B1-D) → HALT E_SCHEMA_DRIFT
- Auto-buying paid font / paid SDK → HALT E_PAID_ASSET
- Skipping gate exit checks → HALT (constitutive)
- Removing existing tests
- `git push --force` on any branch
- Editing files outside worktree from inside worktree
- PowerShell multi-command paste (per CLAUDE.md git rule) — single command, single git status verify

---

## §8 — CACHE & DECISIONS

```
DECISIONS_CACHE = .yagi-autobuild/DECISIONS_CACHE.md
ON_DECISION_NEEDED:
  - search cache for matching Q-id
  - HIT: adopt cached answer, log CACHE_HIT q=<id>
  - MISS: adopt SPEC default per §10, log CACHE_MISS_DEFAULT q=<topic>
  - Truly novel decision: HALT E_NOVEL_DECISION
```

Active cache entries this phase will reference:
- Q-081 Codex CLI invocation (mandatory for §3 REVIEW)
- Q-082 HIGH-A-SCHEMA-ONLY (mandatory for §3 SEVERITY)
- Q-083 Library-monorepo sibling dep rule (mandatory for §7 FORBIDDEN)
- Q-084 Workshop terminology (mandatory for G_B1-D)
- Q-085 Workshop ↔ Contest separation (mandatory for G_B1-H + G_B1-I)
- Q-086 Contest MVP surface (informational)
- Q-087 Creator Profile MVP=NO (informational)
- Q-088 ProfileRole 4→2 simplification (informational — do NOT touch sidebar/email/challenges studio/observer branches in this phase; deferred to Phase 3.0)
- Q-089 Anonymous OTP voting (informational — do NOT add contest_voters in this phase)

---

## §9 — PARALLELISM

```
WORKTREES = 1 (single)
TEAMMATES = 0
RATIONALE: Phase 2.8.1 has linear dep chain. G_B1-A (lint rule) before G_B1-B (wizard).
           G_B1-D terminology sweep must happen after G_B1-B/E to avoid double-edit.
           G_B1-H (admin convert) needs DB migration which must land before G_B1-I/J read DB.
```

---

## §10 — TIMELINE BUDGET

```
TARGET   = 8 working days
SOFT_CAP = 9 days
HARD_CAP = 11 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B1_A =  4
  G_B1_B = 12
  G_B1_C =  4
  G_B1_D =  8
  G_B1_E =  4
  G_B1_F =  4
  G_B1_G =  8
  G_B1_H = 12
  G_B1_I =  4
  G_B1_J =  4
  REVIEW =  2 (+ 4 per loop)
```

Total ≈ 64h work + 2h review = 8d. SOFT_CAP buffer 1d.

---

## §11 — END

```
ON SHIPPED: STOP. Do not chain to Phase 2.8.2.
            Phase 2.8.2 = Brief Board redesign (canvas + discoverability + sidebar chat)
                         requires fresh kickoff with Phase 2.8.2 SPEC.
```

Execute §0 now.
