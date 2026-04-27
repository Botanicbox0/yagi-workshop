# Phase 2.8.2 — KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree g-b-2-redesign
SOURCE   = .yagi-autobuild/phase-2-8-2/SPEC.md (vision)
RULESET  = .yagi-autobuild/DECISIONS_CACHE.md (Q-001 ~ Q-091, mandatory consult)
PRIOR    = .yagi-autobuild/phase-2-8-1/K-PUX-1_findings.md (consumed where directed)
LANG     = Korean for narrative; English for code/commits
TONE     = deterministic state machine, no preamble, no asking
```

---

## §0 — RUN ON ENTRY (mandatory before anything else)

```bash
cd C:\Users\yout4\yagi-studio\yagi-workshop
git fetch origin
git status --short
git log --oneline -5 main

# Expected: main HEAD includes Phase 2.8.1 SHIPPED + followup-1 (company_type) + Q-090 commits.
# Current expected HEAD pattern: <hash> feat(onboarding): company_type enum to founder framing (5 visible options)
# If main is dirty (other than known untracked .claire/, .clone/, .yagi-autobuild/mvp-polish/,
# .claude/settings.local.json, .migration-list*.txt, scripts/repair-supabase-history.ps1) or
# not synced to origin, HALT E0_ENTRY_FAIL.

# Confirm Phase 2.8.1 migrations applied to prod
npx supabase migration list --linked > .migration-list.txt 2>&1
# 20260427000000, 20260427010000, 20260427020000, 20260427030000 must show in BOTH columns.

# Read the active context
cat .yagi-autobuild/phase-2-8-2/SPEC.md            # full vision
cat .yagi-autobuild/phase-2-8-1/K-PUX-1_findings.md # Codex K-PUX findings (Phase 2.8.1 absorbed HIGH; this phase covers F-PUX-014 deferred)
cat .yagi-autobuild/DECISIONS_CACHE.md | tail -200 # confirm Q-088, Q-089, Q-090, Q-091 present

# Create worktree
git worktree add ../yagi-workshop-g-b-2-redesign -b g-b-2-redesign
cd ../yagi-workshop-g-b-2-redesign
copy ..\yagi-workshop\.env.local .env.local

# Install + verify clean baseline
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit  # must exit 0
```

If §0 fails for any reason → HALT and surface the exact error to yagi.

---

## §1 — STATE MACHINE

```
STATES = [INIT, G_B2_A, G_B2_B, G_B2_C, G_B2_D, G_B2_E, G_B2_F, REVIEW, SHIPPED, HALT]
Sequence: A → B → C → D → E → F → REVIEW → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 ok | G_B2_A | begin projects hub onboarding work |
| G_B2_A | exit_passed | G_B2_B | begin Brief Board discoverability |
| G_B2_B | exit_passed | G_B2_C | begin canvas mode (or skip per §2.5 decision tree) |
| G_B2_C | exit_passed | G_B2_D | begin sidebar realtime chat |
| G_B2_D | exit_passed | G_B2_E | begin comment author hierarchy |
| G_B2_E | exit_passed | G_B2_F | begin commission cleanup |
| G_B2_F | exit_passed | REVIEW | invoke Codex K-05 (gpt-5.5) |
| REVIEW | review_pass | SHIPPED | ff-merge → main, push, log SHIPPED |
| any | error | HALT | log to _run.log, do not auto-retry beyond §6 ON_FAIL_LOOP |

---

## §2 — Sub-gates (refer to SPEC.md for full scope)

The full requirements live in `.yagi-autobuild/phase-2-8-2/SPEC.md`. This section gives the Builder the EXIT contract per gate so it can verify completion deterministically.

### G_B2_A — Projects hub onboarding + admin delete

```
ENTRY: §0 ok
EXIT:
  - /app/projects empty/first-visit hero card with 3 value props + primary CTA + 4-step flow
  - "직접 의뢰" → "프로젝트 의뢰하기" label sweep across sidebar/breadcrumb/buttons
  - 8 category workflow popovers on wizard Step 1
  - admin "삭제" dropdown action on project detail (yagi_admin only)
  - migration: 20260428000000_phase_2_8_2_projects_soft_delete.sql
    - ALTER TABLE projects ADD COLUMN deleted_at timestamptz
    - RLS update: deleted_at IS NULL filter on client-facing reads
    - admin trash page can read deleted_at IS NOT NULL
  - cron: pg_cron job that hard-deletes (cascade) projects with deleted_at < now() - interval '3 days'
  - tsc + lint + build exit 0
FAIL on:
  - i18n key NAME changes (only values may change)
  - cross-tenant leak on RLS update
  - cron lacks DELETE permission on cascading tables (storage assets)
  - hero card breaks /app/projects when there ARE projects (it must hide)
ON_FAIL_LOOP:
  - loop 1: tighten RLS filter; re-test as client-role and yagi-admin
  - loop 2: split migration (column + RLS + cron) into 3 separate files
LOG: GATE_EXIT G_B2_A hero=ok labels=swept popovers=8 admin_delete=ok migration=20260428000000 tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-2 g-b2-a): projects hub onboarding + soft-delete with 3-day undelete
```

### G_B2_B — Brief Board discoverability (toolbar + slash + drag-drop)

```
ENTRY: G_B2_A SHIPPED
EXIT:
  - extended toolbar: image / file / embed / divider / heading buttons functional
  - slash command via @tiptap/suggestion + tippy.js (Q-083 sibling rule applies — no HALT)
    - exact-pin versions matching @tiptap/* major.minor in package.json
    - keyboard nav (↑↓ + Enter)
    - items: paragraph / heading 1-3 / bullet / ordered list / divider / image / file / embed / quote
  - drag-drop overlay: dashed border + Korean copy "이미지를 끌어다 놓으세요" on drag-over
  - multi-file simultaneous drop supported
  - empty state copy: "텍스트를 입력하거나 / 를 눌러 블록을 삽입하세요" (replaces F-PUX-015 stale hint)
  - Korean IME composition smoke: typing 한글 in editor while slash menu open → no popup flicker, no missing chars
  - tsc + lint + build exit 0
FAIL on:
  - slash menu breaks Korean IME composition (regression vs Phase 2.8.1 G_B1-G)
  - toolbar collapses or wraps badly at 380px viewport (mobile)
  - tiptap version mismatch between core and suggestion plugin
ON_FAIL_LOOP:
  - loop 1: bump tippy/suggestion to nearest matching tiptap minor; re-test IME
  - loop 2: gate slash menu open on !isComposing; document in code comment
LOG: GATE_EXIT G_B2_B toolbar_buttons=5 slash_items=10 drag_drop=multi ime_pass=true tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-2 g-b2-b): brief board toolbar + slash command + drag-drop
```

### G_B2_C — Canvas mode (tldraw integration)

```
ENTRY: G_B2_B SHIPPED
DECISION TREE (per SPEC §9 Q1):
  - elapsed since INIT: if > 3.0 days, evaluate canvas defer
  - if G_B2_A + G_B2_B used > 3.5 days combined → DEFER G_B2_C to Phase 2.10, log DEFER_G_B2_C, transition to G_B2_D
  - else proceed
EXIT (if proceeding):
  - tldraw installed (latest stable, MIT, ~200KB gzip acceptable)
  - lazy-loaded via Next.js dynamic import + Suspense fallback (do NOT eager-load on Brief tab mount)
  - mode toggle UI (top-right): Document ↔ Canvas
  - canvas_state field added to content_json (TipTap doc): { shapes: [...], viewport: {x, y, zoom} }
  - migration: 20260428010000_phase_2_8_2_brief_primary_mode.sql
    - ALTER TABLE project_briefs ADD COLUMN primary_mode text DEFAULT 'document' CHECK (primary_mode IN ('document','canvas'))
  - mode switch preserves both states (toggle 3x → no data loss)
  - confirm dialog on mode switch if unsaved changes: "현재 mode 의 변경사항 보존됩니다"
  - shared assets (image asset_id) visible in both modes
  - mobile (<768px): canvas mode is read-only with banner "모바일에서는 보기만 가능합니다"
  - tsc + lint + build exit 0
  - Codex K-05 partial-pass on canvas data model + RLS (run mid-gate, not at REVIEW)
FAIL on:
  - tldraw CSS variables conflict with our design tokens (test in dark mode)
  - canvas_state pushes content_json over 5MB jsonb limit
  - mode toggle loses data
ON_FAIL_LOOP:
  - loop 1: scope tldraw CSS via wrapper class, isolate from globals
  - loop 2: cap canvas_state size at 4MB application-side; show toast on overflow
LOG: GATE_EXIT G_B2_C tldraw=ok mode_toggle=ok primary_mode_col=ok mobile_readonly=ok bundle_kb_delta=<n> tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-2 g-b2-c): brief board canvas mode (tldraw, document↔canvas toggle)
```

### G_B2_D — Sidebar realtime chat priority

```
ENTRY: G_B2_C SHIPPED (or DEFERRED with log)
EXIT:
  - right collapsible panel with 2 tabs: 메시지 (default) / 버전 기록
  - 메시지 tab = current BriefCommentPanel, promoted to primary
  - sticky-bottom input area
  - Supabase realtime subscription on brief_threads / brief_thread_messages → new INSERT pushes to panel
  - new-message toast + tab badge + unread indicator
  - 버전 기록 tab = current VersionHistorySidebar (kept, demoted to secondary)
  - tsc + lint + build exit 0
FAIL on:
  - realtime subscription bypasses RLS (cross-project message leak — test with two project ids)
  - draft message lost on tab switch
ON_FAIL_LOOP:
  - loop 1: lift draft state to component above tabs
  - loop 2: add channel filter on project_id at subscribe time (defense-in-depth vs RLS)
LOG: GATE_EXIT G_B2_D tabs=2 realtime=on rls_pass=true draft_persists=true tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-2 g-b2-d): sidebar realtime chat priority + version history demoted
```

### G_B2_E — Comment author visual hierarchy

```
ENTRY: G_B2_D SHIPPED
EXIT:
  - 32x32 avatar on every message (was 16x16 or absent)
  - display name semibold foreground color
  - role badge: YAGI / Admin / Client / Member (4 distinct visual treatments, asymmetric per Q-085)
  - avatar fallback: initials + deterministic color from display_name hash
  - self-message right-aligned with accent bg; other messages left-aligned with neutral bg
  - mention support: @yagi / @client tokens parse-and-link, trigger notification_events row
  - mention notifications respect project membership (no leak to non-participants)
  - tsc + lint + build exit 0
FAIL on:
  - avatar_url external URL CORS error breaks render (must fall back to initials)
  - mention notification fires for non-member emails
ON_FAIL_LOOP:
  - loop 1: wrap avatar img onError → initials fallback
  - loop 2: add membership check in mention notification trigger
LOG: GATE_EXIT G_B2_E avatar=32 roles=4 fallback=initials self_align=right mention=ok tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-2 g-b2-e): comment author visual hierarchy (avatar + role badge + mentions)
```

### G_B2_F — Commission cleanup

```
ENTRY: G_B2_E SHIPPED
EXIT:
  - decision: keep /ko/commission as redirect to / (founder confirmed deletable per SPEC §7)
  - approach: replace /commission page with permanent redirect to / (preserve any backlinks)
  - sweep all internal links to /commission → / (search src/ for "/commission" not under /app/)
  - i18n keys for /commission marked deprecated (kept for one phase to avoid build breaks; remove in Phase 3.0)
  - tsc + lint + build exit 0
  - NOTE: Codex K-PUX-1 already executed (Phase 2.8.1 followup, K-PUX-1_findings.md). HIGH-PUX items already absorbed
    into Phase 2.8.1 v2. F-PUX-014 (block-anchored comments) is Phase 2.10. No re-run needed in this gate.
FAIL on:
  - external backlink test (if any historical /commission URLs exist) returns 404 instead of redirect
  - i18n removal breaks unrelated pages
ON_FAIL_LOOP:
  - loop 1: convert page to next.js redirect() with permanent: true instead of deletion
  - loop 2: search-and-replace any missed internal /commission links
LOG: GATE_EXIT G_B2_F commission_redirect=ok internal_links=swept i18n_deprecated=<n> tsc=ok lint=ok build=ok
COMMIT: refactor(phase-2-8-2 g-b2-f): commission page redirect to landing
```

---

## §3 — REVIEW (Codex K-05)

```
ENTRY: G_B2_F SHIPPED
INVOKE PATTERN (Q-081):
  cd C:\Users\yout4\yagi-studio\yagi-workshop\.claude\worktrees\... (no — use g-b-2-redesign worktree)
  cd C:\Users\yout4\yagi-studio\yagi-workshop-g-b-2-redesign

  Build the K-05 prompt at .yagi-autobuild/phase-2-8-2/_codex_review_prompt.md per
  .yagi-autobuild/codex-review-protocol.md. Focus areas:
    - canvas data model (content_json + canvas_state coexistence)
    - RLS on soft-delete (deleted_at filter on client reads, yagi_admin trash access)
    - realtime subscription RLS (channel filter + RLS layered)
    - mention notification RLS (no leak)
    - tldraw bundle isolation (CSS + globals)
    - i18n key deprecation (no orphan key references)

  Run via PowerShell with UTF-8 enforcement:
    [Console]::InputEncoding = [System.Text.Encoding]::UTF8
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
    Get-Content .yagi-autobuild\phase-2-8-2\_codex_review_prompt.md -Encoding UTF8 -Raw `
      | codex exec --model gpt-5.5 -c model_reasoning_effort=high `
      > .yagi-autobuild\phase-2-8-2\_codex_review_output.txt

SCOPE:
  - all files changed since main (g-b-2-redesign branch diff)
  - migrations: 20260428000000_*, 20260428010000_*
  - new server actions / RPC for soft-delete + realtime
  - canvas state validation
  - mention notification trigger (if SQL)

LOOP_RULES:
  - LOOP 1 max 4 findings: auto-fix HIGH-A and HIGH-A-SCHEMA-ONLY (Q-082) and HIGH-B with surgical patches
  - LOOP 2: re-run K-05 with same prompt; expect 0 HIGH-A, ≤1 HIGH-B (residual)
  - LOOP 3 only if LOOP 2 still HIGH-A: HALT E_K05_LOOP3_HIGH_A
  - MED / LOW findings → log to FOLLOWUPS, do not block SHIPPED
EXIT: review_pass=true verdict=PASS or LOOP_2_PASS
```

---

## §4 — SHIPPED

```
ENTRY: REVIEW pass
ACTIONS (in order):
  1. cd to main worktree (C:\Users\yout4\yagi-studio\yagi-workshop)
  2. git checkout main
  3. git pull origin main --ff-only
  4. git merge g-b-2-redesign --ff-only
  5. cd back into the worktree to verify nothing broke main:
     pnpm install --frozen-lockfile
     pnpm exec tsc --noEmit
     pnpm build
     all must exit 0
  6. git push origin main
  7. log SHIPPED line in _run.log:
     <ISO> SHIPPED PHASE_DONE phase=2-8-2 elapsed_clock=<...> target=6d gates=6 review_loops=<n>
  8. format SHIPPED announcement: "Phase 2.8.2 SHIPPED · 6 gates · <total_elapsed>h · brief board redesigned"
```

---

## §5 — Logging

Append to `.yagi-autobuild/phase-2-8-2/_run.log` at every state transition. Format:

```
<ISO8601> <STATE> <EVENT> key1=val1 key2=val2 ...
```

Required events: GATE_ENTER, GATE_EXIT, GATE_FAIL, LOOP_n_START, LOOP_n_FIX, LOOP_n_PASS, REVIEW_*, SHIPPED, HALT_<code>.

---

## §6 — HALT triggers

| Code | When | Surface |
|---|---|---|
| E0_ENTRY_FAIL | §0 git/worktree/install fails | exact stderr |
| E_G_B2_A_RLS_LEAK | client role can read deleted_at IS NOT NULL row | RLS test repro |
| E_G_B2_B_IME_REGRESSION | Korean IME composition broken by slash menu | input event log |
| E_G_B2_C_BUNDLE_OVERFLOW | tldraw push bundle >300KB gzip on Brief route | webpack stats diff |
| E_G_B2_D_REALTIME_LEAK | realtime subscription receives other-project messages | channel + RLS log |
| E_G_B2_E_NOTIF_LEAK | mention notification fires for non-member | event row dump |
| E_K05_LOOP3_HIGH_A | LOOP 2 still HIGH-A after auto-fix | last 3 K-05 outputs |
| E_G_B2_n_LOOP_EXHAUSTED | gate fails 3x | last 3 attempt diffs |
| E_TIMELINE_OVERRUN | total elapsed > HARD_CAP 9d | _run.log timeline |
| DEFER_G_B2_C | canvas defer per SPEC §9 Q1 | elapsed time on entry |

DEFER_G_B2_C is NOT a HALT — it's a soft signal. On DEFER, log it, transition straight to G_B2_D, and at SHIPPED note that canvas mode is bumped to Phase 2.10. Update SPEC §8 deferred section in same commit.

---

## §7 — FORBIDDEN

The Builder must not:

1. Change i18n KEY NAMES (values are fine; renames break callers)
2. Modify Phase 2.8.1 migrations or any file in .yagi-autobuild/phase-2-8-1/ (frozen history)
3. Touch ProfileRole type narrowing (Q-088 — deferred to Phase 3.0; legacy data preserved)
4. Add new sidebar/email/challenges branches for studio/observer roles (Q-088)
5. Build Contest UI surfaces beyond admin queue (Q-085, Q-086)
6. Build Creator Profile / `/c/{handle}` (Q-087)
7. Implement contest_voters table or anonymous OTP (Q-089 — Phase 3.0)
8. Introduce a third canvas library beyond tldraw (SPEC decision, locked)
9. Skip the §2.5 decision tree on G_B2_C (must evaluate elapsed time before starting canvas)
10. Re-run Codex K-PUX-1 (already executed in Phase 2.8.1 followup, results consumed)
11. Use bare `codex` instead of `codex exec` (Q-081)
12. Push migrations to prod from inside the worktree without verifying main is the linked branch (`npx supabase migration list --linked` first)

---

## §8 — DECISIONS_CACHE active entries

Mandatory consult at the gate where each applies:

- **Q-081** Codex CLI invocation pattern (REVIEW)
- **Q-082** HIGH-A-SCHEMA-ONLY severity (REVIEW)
- **Q-083** Library-monorepo sibling dep rule (G_B2_B — @tiptap/suggestion + tippy.js)
- **Q-084** Workshop terminology (G_B2_A label sweep)
- **Q-085** Workshop ↔ Contest separation (informational — no Contest work in this phase)
- **Q-086** Contest MVP surface admin only (informational)
- **Q-087** Creator Profile MVP=NO (informational)
- **Q-088** ProfileRole 4→2 — do NOT add new studio/observer branches (G_B2_E role badges use creator/client visible + studio/observer legacy fallback)
- **Q-089** Anonymous OTP voting deferred (informational)
- **Q-090** Onboarding copy framing — "AI 비주얼" on user-selection surfaces (G_B2_A category popovers, hero card copy must use "AI 비주얼 작업" framing, NOT "AI VFX")
- **Q-091** Company type enum 5-option (informational; G_B2_A onboarding hero may reference company types but must use the 5 visible values only)

---

## §9 — Timeline budget

```
TARGET   = 6 working days
SOFT_CAP = 7 days
HARD_CAP = 9 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B2_A =  8
  G_B2_B = 12
  G_B2_C = 16   (defer-eligible per §2.5 decision tree)
  G_B2_D =  4
  G_B2_E =  4
  G_B2_F =  4
  REVIEW =  2 (+ 4 per loop)
```

If G_B2_C defers: total ≈ 34h work + 2h review = 4.5d. Phase 2.10 absorbs the canvas work.
If G_B2_C proceeds: total ≈ 50h + 2h = 6.5d. Buffer 0.5d.

RATIONALE: Phase 2.8.2 has linear dep chain (no parallel). G_B2_A first because it's the first-impression problem; G_B2_B second because it unlocks G_B2_C's authoring needs; G_B2_D depends on the comment infrastructure being stable (G_B2_E adjacent but later for layout dependencies); G_B2_F is pure cleanup.

---

## §10 — Builder execution instruction

You are the Builder for Phase 2.8.2. Execute this kickoff exactly as written. Start with §0 RUN ON ENTRY. Follow the state machine deterministically through all 6 gates (A→B→C→D→E→F), then REVIEW (Codex K-05 gpt-5.5), then SHIPPED. Apply the §2.5 DEFER decision tree honestly when entering G_B2_C. Halt only on §6 triggers. Log to .yagi-autobuild/phase-2-8-2/_run.log per §5. Do not ask yagi for confirmation between gates. Begin now.
