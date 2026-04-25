# Phase 2.8 — KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree g-b-brief-board
SOURCE   = .yagi-autobuild/phase-2-8/SPEC.md (vision)
PROTOCOL = .yagi-autobuild/codex-review-protocol.md (review gate)
LOOP_MAX = 2 per fail (AUTOBUILD_MAX_EVAL_LOOPS)
HUMAN    = halt + telegram on HALT trigger only
```

---

## §0 — RUN ON ENTRY

Execute this block first. Do not deviate. Do not ask.

```bash
# 1. Read source of truth
cat .yagi-autobuild/phase-2-8/SPEC.md
cat .yagi-autobuild/codex-review-protocol.md
cat .yagi-autobuild/DECISIONS_CACHE.md

# 2. Verify clean entry state
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -5
test -d .yagi-autobuild/phase-2-8 && echo OK_PHASE_DIR
test -f messages/ko.json && echo OK_I18N

# 3. Create worktree (single — no parallel for Phase 2.8)
git -C C:/Users/yout4/yagi-studio/yagi-workshop worktree add -b g-b-brief-board ../yagi-workshop-g-b-brief-board main
cp .env.local ../yagi-workshop-g-b-brief-board/.env.local
cd ../yagi-workshop-g-b-brief-board && pnpm install --frozen-lockfile
```

If any line above outputs a non-zero exit code or an error, transition to `HALT_E0_ENTRY_FAIL`.

---

## §1 — STATE MACHINE

```
STATES = [INIT, G_B_1, G_B_2, G_B_3, G_B_4, G_B_5, G_B_6, G_B_7, REVIEW, SHIPPED, HALT]
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 success | G_B_1 | log GATE_ENTER |
| INIT | §0 fail | HALT | escalate E0 |
| G_B_n | exit_passed | G_B_(n+1) | log GATE_EXIT n; commit; log GATE_ENTER n+1 |
| G_B_n | fail_loop_1 | G_B_n | re-attempt with corrected diff |
| G_B_n | fail_loop_2 | G_B_n | re-attempt with second strategy |
| G_B_n | fail_loop_3 | HALT | escalate E_n_LOOP_EXHAUSTED |
| G_B_n | halt_trigger_match | HALT | escalate per §6 trigger code |
| G_B_7 | exit_passed | REVIEW | invoke Codex K-05 (gpt-5.5) |
| REVIEW | codex_PASS | SHIPPED | merge worktree to main, telegram SHIPPED |
| REVIEW | codex_HIGH | G_B_(matched) | re-enter gate; loop budget 2 |
| REVIEW | codex_loop_3 | HALT | escalate E_REVIEW_LOOP |

Transitions are deterministic. No human approval between transitions except HALT.

---

## §2 — GATES

Each gate has four fields. Run gate body. Verify exit. If exit passes, log + commit + advance. If exit fails, increment fail counter; max 2 retries before HALT.

### G_B_1 — Schema migration + RLS + actions skeleton

```
ENTRY:
  - working dir = worktree g-b-brief-board
  - SPEC §3 read
EXIT (all required):
  - file exists: supabase/migrations/20260426_phase_2_8_brief_board.sql
  - migration applies clean: pnpm supabase db push --include-all (exit 0)
  - RLS test passes: scripts/test-rls-brief-board.ts (exit 0)
  - file exists: src/app/[locale]/app/projects/[id]/brief/actions.ts (skeleton, all 6 actions)
  - tsc --noEmit exit 0
FAIL on:
  - migration sql syntax error
  - RLS policy denies authorized user
  - tsc error in actions.ts
ON_FAIL_LOOP:
  - read sql error → fix syntax → re-run db push
  - read RLS test failure line → adjust policy → re-run test
LOG: GATE_EXIT G_B_1 ok=<n>/<m> elapsed=<sec>
COMMIT: chore(phase-2-8 g-b-1): schema + RLS + actions skeleton
```

### G_B_2 — TipTap install + base blocks + auto-save

```
ENTRY: G_B_1 SHIPPED, package.json clean
EXIT:
  - dependencies pinned (no caret): @tiptap/react, @tiptap/starter-kit, @tiptap/pm — exact versions
  - file exists: src/components/brief-board/editor.tsx
  - storybook check: render BriefEditor with empty doc → no console error
  - debounce auto-save fires after 3s idle (manual smoke: edit → wait 3s → check network)
  - Korean IME smoke: type "안녕" via xdotool/clipboard paste → no character drop
  - tsc + lint exit 0
FAIL on:
  - any dep installed with ^ or ~
  - editor render throws
  - IME drops character (RECORD: HIGH severity)
ON_FAIL_LOOP:
  - loop 1: pin versions, re-install
  - loop 2: switch transaction strategy in TipTap config
  - loop 3 → HALT E_G_B_2_TIPTAP_IME (human required)
LOG: GATE_EXIT G_B_2 ok=<n>/<m>
COMMIT: feat(phase-2-8 g-b-2): tiptap editor + auto-save
```

### G_B_3 — Image / File blocks + R2 wiring

```
ENTRY: G_B_2 SHIPPED, R2 bucket project-briefs reachable
EXIT:
  - R2 bucket project-briefs exists (api check via wrangler r2 bucket info project-briefs)
  - presigned PUT round-trip: scripts/test-r2-brief-asset.ts (5MB jpeg, exit 0)
  - file: src/components/brief-board/blocks/image-block.tsx
  - file: src/components/brief-board/blocks/file-block.tsx
  - drag-drop smoke: drag 2MB png onto editor → block inserted with asset_id → DB row in project_brief_assets
  - tsc + lint exit 0
FAIL on:
  - R2 bucket missing → HALT E_G_B_3_R2_NOT_PROVISIONED
  - presigned URL returns 4xx → loop
  - asset_id not persisted in content_json
ON_FAIL_LOOP:
  - loop 1: read R2 SDK error, fix headers
  - loop 2: switch to direct fetch with manual signature
LOG: GATE_EXIT G_B_3 r2_ok=<bool> upload_ms=<n>
COMMIT: feat(phase-2-8 g-b-3): image+file blocks + R2 upload
```

### G_B_4 — Embed block + oEmbed proxy + cache table

```
ENTRY: G_B_3 SHIPPED
EXIT:
  - migration: supabase/migrations/20260427_embed_cache.sql applies clean
  - server action: src/app/api/embed/route.ts (POST { url } → { provider, html, title, thumbnail_url })
  - 4 provider tests pass: scripts/test-embed-providers.ts (youtube, vimeo, figma, generic OG)
  - whitelist enforced: non-allowed iframe url returns thumbnail-only fallback (no raw iframe)
  - cache hit on second call (DB inspect: embed_cache row count == 1 after 2 calls same url)
  - tsc + lint exit 0
FAIL on:
  - any test_embed provider returns null
  - iframe sanitizer allows untrusted host
ON_FAIL_LOOP:
  - loop 1: provider parse rule fix
  - loop 2: fallback to OG-only for failing provider
LOG: GATE_EXIT G_B_4 providers=<csv-of-passing>
COMMIT: feat(phase-2-8 g-b-4): embed block + oembed proxy
```

### G_B_5 — Version snapshot UX

```
ENTRY: G_B_4 SHIPPED
EXIT:
  - file: src/components/brief-board/version-history.tsx
  - server action: saveVersion(projectId, label?) inserts row + updates current_version
  - sequence test: scripts/test-version-flow.ts
      - save v1 with label "초안"
      - edit content
      - save v2 with label "v2"
      - restore v1 → assert content == v1 snapshot
      - assert v3 row created (history-preserving restore)
  - read-only viewer route renders v_n with banner "v{n} 보기 — 편집 불가"
  - tsc + lint exit 0
FAIL on:
  - version_n duplicate (unique constraint violation)
  - restore mutates v_n in place instead of creating v_(n+1)
ON_FAIL_LOOP:
  - loop 1: fix server action insert order
  - loop 2: add db-level advisory lock
LOG: GATE_EXIT G_B_5 versions_tested=3
COMMIT: feat(phase-2-8 g-b-5): version snapshot + history sidebar
```

### G_B_6 — Comment thread + empty-state CTA + lock

```
ENTRY: G_B_5 SHIPPED
EXIT:
  - threads.kind enum extended with 'project_brief' (migration applied)
  - file: src/components/brief-board/comment-panel.tsx (reuses existing thread infra — no new table)
  - empty-state CTA renders when content_json.content.length == 0
  - "YAGI 제안 요청" modal submits → admin notification kind 'project_brief_yagi_request' fires
  - lock action: admin-only, status flips to 'locked', editor becomes read-only
  - non-admin user attempts lock → 403
  - tsc + lint exit 0
FAIL on:
  - non-admin can call lockBrief
  - notification not delivered to admin queue
ON_FAIL_LOOP:
  - loop 1: re-check RLS predicate
  - loop 2: add explicit role check in server action
LOG: GATE_EXIT G_B_6 admin_check_pass=<bool> notif_delivered=<bool>
COMMIT: feat(phase-2-8 g-b-6): comments + yagi-request CTA + lock
```

### G_B_7 — Wizard + Brief tab integration + smoke

```
ENTRY: G_B_6 SHIPPED
EXIT:
  - wizard Step 3 placeholder replaced by <BriefBoardEditor mode="draft" />
  - on wizard submit: transactional INSERT projects + project_briefs (single tx)
  - /app/projects/[id] page has Brief tab; URL ?tab=brief routes to it
  - e2e smoke (playwright):
      - signin as client
      - create project via wizard, add 1 paragraph + 1 image + 1 youtube embed in Step 3
      - submit → land on /app/projects/<id>?tab=brief
      - assert all 3 blocks visible
      - admin user opens same URL → assert visible
      - admin posts comment → client receives notif
  - pnpm build exit 0
  - pnpm exec tsc --noEmit exit 0
  - lint: 0 NEW errors vs main baseline (compare via scripts/lint-diff.sh)
FAIL on:
  - any e2e step fails
  - build fail
  - lint introduces new errors in changed files
ON_FAIL_LOOP:
  - loop 1: read playwright trace, fix specific assertion
  - loop 2: isolate step, retry minimal repro
LOG: GATE_EXIT G_B_7 e2e_pass=<bool> build_ms=<n>
COMMIT: feat(phase-2-8 g-b-7): wizard + brief tab integration + e2e
```

---

## §3 — REVIEW (Codex K-05)

```
ENTRY: G_B_7 SHIPPED
PROTOCOL: .yagi-autobuild/codex-review-protocol.md
MODEL: gpt-5.5 (high reasoning effort) per .codex/config.toml
SCOPE:
  - all files changed since main
  - migration sql files
  - RLS policies
INVOKE:
  cd ../yagi-workshop-g-b-brief-board
  codex --model gpt-5.5 --reasoning-effort high \
    --prompt "$(cat .yagi-autobuild/phase-2-8/CODEX_PROMPT.md)" \
    > .yagi-autobuild/phase-2-8/_codex_review_output.txt
SEVERITY HANDLING:
  HIGH-A (cross-tenant data leak | privilege escalation | auth bypass): HALT regardless of loop count
  HIGH-B (auth ok but logic flaw): re-enter gate matched in finding, loop budget 2
  HIGH-C (input validation w/ app-layer guard): downgrade to MED, log, ship
  MED / LOW: log to FOLLOWUPS.md, ship
PASS condition: 0 HIGH-A AND 0 unhandled HIGH-B
LOG: REVIEW_RESULT codex_findings=<count> high_a=<n> high_b=<n> downgraded=<n>
```

---

## §4 — SHIPPED

Run on REVIEW pass.

```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop
git checkout main
git merge --ff-only g-b-brief-board || git merge --no-ff g-b-brief-board
pnpm exec tsc --noEmit
pnpm build
git push origin main

# emit telegram (single line, no thread spam)
# format: "Phase 2.8 SHIPPED · 7 gates · <total_elapsed>h · brief board live"
```

Then transition to STOP. Do not start Phase 2.9.

---

## §5 — LOG FORMAT (mandatory)

Every transition emits one line to `.yagi-autobuild/phase-2-8/_run.log`:

```
<ISO_TIMESTAMP> <STATE> <EVENT> key=value key=value
```

Examples:

```
2026-04-26T08:12:33Z G_B_1 GATE_ENTER
2026-04-26T08:47:10Z G_B_1 GATE_EXIT ok=4/4 elapsed=2077s
2026-04-26T08:47:11Z G_B_2 GATE_ENTER
2026-04-26T11:03:55Z G_B_2 FAIL loop=1 reason=ime_drop_char
2026-04-26T11:24:02Z G_B_2 GATE_EXIT ok=5/5 elapsed=8211s
```

No prose. No "I think". No "Let me know". Key=value only.

---

## §6 — HALT TRIGGERS (auto-escalate to human)

Match exactly. On match: write `HALT.md` with trigger code + last 50 log lines + diagnostic, telegram-ping 야기, freeze worktree.

| Code | Trigger | Diagnostic to capture |
|---|---|---|
| E0_ENTRY_FAIL | §0 verification block fails | output of failed line |
| E_G_B_2_TIPTAP_IME | Korean IME drops character after loop 3 | TipTap version, browser, repro steps |
| E_G_B_3_R2_NOT_PROVISIONED | R2 bucket project-briefs missing | wrangler output |
| E_G_B_n_LOOP_EXHAUSTED | any gate fails 3 times | last 3 attempt diffs |
| E_REVIEW_LOOP | Codex review fails 3 times | findings JSON |
| E_HIGH_A_FOUND | any HIGH-A severity finding | finding location, content |
| E_SCHEMA_DRIFT | migration affects table outside SPEC §3 list | sql diff |
| E_DEP_UNLISTED | new package not in SPEC §7 stack list | package name |
| E_PROD_TABLE_MUTATION | migration ALTER/DROP touches Phase 1.x tables (projects, threads except enum extension) | sql snippet |

No HALT trigger requires interpretation. If ambiguous, treat as non-trigger and continue. Telegram-ping 야기 only on confirmed match.

---

## §7 — FORBIDDEN

- "Should I proceed?" / "Do you want me to" / "Let me know" → never emitted
- New table not in SPEC §3 → HALT E_SCHEMA_DRIFT
- New dep not in SPEC §7 → HALT E_DEP_UNLISTED
- Modifying Phase 1.x tables (other than threads.kind enum extension) → HALT E_PROD_TABLE_MUTATION
- Auto-buying paid font / paid SDK → HALT E_PAID_ASSET
- Skipping gate exit checks → HALT (no code; this is constitutive)
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
  - MISS: adopt SPEC default per §10 Q1-Q4, log CACHE_MISS_DEFAULT q=<topic>
  - Truly novel decision (not in SPEC, not in cache): HALT E_NOVEL_DECISION
```

No "let me think about this" branches. Either cached, defaulted, or halted.

---

## §9 — PARALLELISM

```
WORKTREES = 1 (single)
TEAMMATES = 0
RATIONALE: Phase 2.8 has linear dep chain (G_B_1 schema → G_B_2 editor → G_B_3 R2 → ...).
           Parallel work creates merge conflict on TipTap config + content_json shape.
```

If a future revision wants parallel: split into G_B_a (schema + actions, 1 teammate) and G_B_b (UI + integration, 1 teammate) at G_B_4 boundary. Not in v1.

---

## §10 — TIMELINE BUDGET

```
TARGET   = 6.5 working days (SPEC §8)
SOFT_CAP = 8 days
HARD_CAP = 10 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B_1 = 8
  G_B_2 = 12
  G_B_3 = 8
  G_B_4 = 8
  G_B_5 = 8
  G_B_6 = 4
  G_B_7 = 4
  REVIEW = 2 (+ 4 per loop)

LOG ELAPSED PER GATE. If gate elapsed > 2× target, emit WARN line.
```

---

## §11 — END

```
ON SHIPPED: transition STOP. Do not chain to Phase 2.9.
            Phase 2.9 requires fresh kickoff with new SPEC.
```

Execute §0 now.
