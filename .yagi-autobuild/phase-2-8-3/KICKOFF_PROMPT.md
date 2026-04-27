# Phase 2.8.3 — KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree g-b-3-brand-polish
SOURCE   = .yagi-autobuild/phase-2-8-3/SPEC.md (vision)
RULESET  = .yagi-autobuild/DECISIONS_CACHE.md (Q-001 ~ Q-091)
LANG     = Korean for narrative; English for code/commits
TONE     = deterministic state machine, no preamble, no asking
```

---

## §0 — RUN ON ENTRY (mandatory)

```bash
cd C:\Users\yout4\yagi-studio\yagi-workshop
git fetch origin
git status --short
git log --oneline -5 main

# Expected: main HEAD is the Phase 2.8.2 hotfix commit (client redirect → /app/projects + tippy.js install).
# Untracked allowed: .claire/, .clone/, .yagi-autobuild/mvp-polish/, .claude/settings.local.json,
#   .migration-list*.txt, scripts/repair-supabase-history.ps1
# If main is dirty beyond that or not synced to origin, HALT E0_ENTRY_FAIL.

# Read context
cat .yagi-autobuild/phase-2-8-3/SPEC.md
cat .yagi-autobuild/DECISIONS_CACHE.md | tail -60   # Q-088 through Q-091
cat .yagi-autobuild/phase-2-8-1/K-PUX-1_findings.md | head -80   # F-PUX-001, F-PUX-005, F-PUX-006 context

# Verify yagi-provided assets exist
ls "C:\Users\yout4\Downloads\이미지 로고.png"
ls "C:\Users\yout4\Downloads\텍스트 로고.png"
# If either missing, HALT E_ASSET_MISSING — yagi must re-provide

# Create worktree
git worktree add ../yagi-workshop-g-b-3-brand-polish -b g-b-3-brand-polish
cd ../yagi-workshop-g-b-3-brand-polish
copy ..\yagi-workshop\.env.local .env.local

pnpm install --frozen-lockfile
pnpm exec tsc --noEmit  # must exit 0
```

If §0 fails, HALT and surface the exact error to yagi.

---

## §1 — STATE MACHINE

```
STATES = [INIT, G_B3_A, G_B3_B, G_B3_C, G_B3_D, G_B3_E, G_B3_F, SHIPPED, HALT]
Sequence: A → B → C → D → E → F → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 ok | G_B3_A | begin brand asset import |
| G_B3_A | exit_passed | G_B3_B | begin sidebar restoration |
| G_B3_B | exit_passed | G_B3_C | begin creator profile copy edits |
| G_B3_C | exit_passed | G_B3_D | begin projects hub hero rewrite |
| G_B3_D | exit_passed | G_B3_E | begin landing brand check |
| G_B3_E | exit_passed | G_B3_F | begin REVIEW + SHIPPED |
| G_B3_F | review_pass + ff_merge_ok | SHIPPED | log SHIPPED |
| any | error | HALT | log to _run.log, surface to yagi |

---

## §2 — Sub-gate EXIT contracts (refer to SPEC.md §2-§7 for full detail)

### G_B3_A — Brand asset import

```
ENTRY: §0 ok
ACTIONS:
  1. Copy yagi's two PNGs from C:\Users\yout4\Downloads\ to public/brand/
     - 이미지 로고.png → public/brand/yagi-mark.png
     - 텍스트 로고.png → public/brand/yagi-wordmark.png
     (ASCII canonical names — Korean originals fine as source, NOT as in-repo path)
  2. Optimize: if mark > 100KB or wordmark > 60KB after copy, run a node script with sharp
     (already in deps via @vercel/og?) or pngquant if available. If neither tool available,
     log finding and proceed with raw — yagi can re-export.
  3. Update favicon: replace app/icon.png OR app/favicon.ico (whichever exists in repo) with mark.
  4. Check OG endpoints (src/app/api/og/route.tsx, src/app/api/showcases/[id]/og/route.tsx) — if
     they currently render text "YAGI WORKSHOP" only, leave for now (asset URL routing in Edge
     runtime is not always reliable; defer to Phase 2.10 landing rewrite).
EXIT:
  - public/brand/yagi-mark.png exists, ≤100KB
  - public/brand/yagi-wordmark.png exists, ≤60KB
  - app/icon.png OR favicon.ico updated to new mark
  - tsc + lint + build exit 0
FAIL on:
  - assets > 200KB after copy + optimization (page weight regression)
  - favicon location ambiguous (more than one icon file in app/)
ON_FAIL_LOOP:
  - loop 1: try alternate compression tool; pin asset version with ?v= in src
  - loop 2: ship raw, log size finding, move on
LOG: GATE_EXIT G_B3_A mark_kb=<n> wordmark_kb=<n> favicon=<path> tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-3 g-b3-a): brand asset import + favicon refresh
```

### G_B3_B — Sidebar brand + workspace switcher

```
ENTRY: G_B3_A SHIPPED
ACTIONS:
  1. Locate sidebar header component (likely src/components/app/sidebar*.tsx).
  2. Add brand mark + wordmark at top of sidebar.
     - Mobile / collapsed: mark only (32x32)
     - Desktop / expanded: mark + wordmark side-by-side
  3. Click brand → router.push("/app/projects") for logged-in, "/" for guests.
  4. Investigate scope switcher state:
     git log --all --diff-filter=D --name-only --pretty=format: 2>/dev/null | grep scope-switcher
     git log -p --all -- src/components/app/sidebar-scope-switcher.tsx 2>/dev/null | head -50
     If deleted: restore from git history.
     If hidden: locate the conditional and fix.
  5. For client roles with single workspace: render badge form (workspace name, no dropdown).
  6. For yagi-admin: dropdown switcher with workspace + admin scopes.
  7. Use "Workshop" labeling per Q-084 — do NOT regress to "Workspace".
EXIT:
  - Brand mark + wordmark visible in sidebar header (desktop expanded view)
  - Mark-only on mobile / collapsed sidebar
  - Brand click navigates correctly
  - Workspace switcher OR badge visible per role
  - tsc + lint + build exit 0
FAIL on:
  - cross-tenant workspace leak in switcher
  - brand mark uses non-ASCII path
  - regression to "Workspace" label (Q-084 violation)
ON_FAIL_LOOP:
  - loop 1: recheck RLS on workspace fetch query; pin role check at server component level
  - loop 2: restore scope switcher from git history rather than rewriting
LOG: GATE_EXIT G_B3_B brand=ok switcher=<dropdown|badge|hidden> workshop_label=ok tsc=ok lint=ok build=ok
COMMIT: feat(phase-2-8-3 g-b3-b): sidebar brand mark + workspace switcher restoration
```

### G_B3_C — Creator profile 6 copy edits

```
ENTRY: G_B3_B SHIPPED
ACTIONS (apply yagi's 6 edits per SPEC §4 verbatim):
  1. Page header: "크리에이터 프로필 설정" + sub "클라이언트가 이 프로필을 보고 협업을 요청합니다"
  2. Handle live-validation: debounced is_handle_available RPC, ✔/✖ badge, simplify help text
  3. Display name help: "프로필과 작업에 표시될 이름입니다"
  4. Instagram: remove checkbox, add "(선택)" + WHY description "작업 레퍼런스를 연결하면 신뢰도가 올라갑니다"
  5. Top-of-form description: SKIP if duplicates the sub from #1
  6. CTA: "프로필 만들기" — use new key (don't overwrite global `continue`)
EXIT:
  - All 6 edits applied (i18n value updates, no key renames)
  - Handle live-validation calls is_handle_available with 300ms debounce
  - Instagram checkbox removed, schema unchanged (still optional)
  - CTA shows "프로필 만들기"
  - EN translations match KO intent
  - Validation regex documentation matches actual regex (handle help text)
  - tsc + lint + build exit 0
FAIL on:
  - i18n KEY rename (only values may change)
  - live-validation NOT debounced
  - handle help text claims a character class regex rejects
ON_FAIL_LOOP:
  - loop 1: verify validateHandle regex; align help text
  - loop 2: refactor handle input to a controlled component if debouncing is hard to bolt on
LOG: GATE_EXIT G_B3_C edits=6 live_validation=on debounce_ms=300 instagram_checkbox=removed cta=프로필만들기 tsc=ok lint=ok build=ok
COMMIT: refactor(phase-2-8-3 g-b3-c): creator profile copy + handle live-validation
```

### G_B3_D — Projects hub hero rewrite

```
ENTRY: G_B3_C SHIPPED
ACTIONS (apply yagi's framing per SPEC §5 verbatim):
  1. Headline 2-line: "AI 비주얼 작업을 한 곳에서 의뢰하고 / 결과까지 완성하세요"
  2. 3 bullets — note "보드" must appear in bullet 2:
     - 의뢰부터 결과물까지 한 흐름으로 진행
     - 기획, 피드백, 수정까지 보드에서 관리
     - 프로젝트에 맞게 YAGI 스튜디오 제작 / 크리에이터 매칭
  3. Section header above sample cards: "이런 프로젝트가 가능해요"
  4. Sample card 1: 브랜드 AI 비주얼 캠페인 (per yagi)
  5. Sample card 2: 뮤직비디오 / 영상 제작 (per yagi)
  6. NO change to 4-step workflow strip — yagi didn't ask
  7. NO "AI VFX" anywhere in the hero — Q-090 enforcement
EXIT:
  - Headline 2-line update applied
  - 3 bullets verbatim, "보드" in bullet 2
  - 2 sample cards rewritten (no VFX-only framing)
  - Section header updated
  - EN translations match KO intent
  - grep for "AI VFX" in src/components/projects/projects-hub-hero.tsx returns 0 hits
  - tsc + lint + build exit 0
FAIL on:
  - "AI VFX" in any hero copy (Q-090)
  - "보드" missing from bullet 2
ON_FAIL_LOOP:
  - loop 1: full grep across messages/*.json + components for residual "AI VFX"
  - loop 2: rewrite from scratch using yagi-provided text strings as keys
LOG: GATE_EXIT G_B3_D headline=2line bullets=3 board_in_bullet2=true samples=2 vfx_count=0 tsc=ok lint=ok build=ok
COMMIT: refactor(phase-2-8-3 g-b3-d): projects hub hero rewrite per yagi framing
```

### G_B3_E — Landing brand check

```
ENTRY: G_B3_D SHIPPED
ACTIONS:
  1. Open /app/[locale]/page.tsx (or wherever the public landing lives).
  2. Grep for any hardcoded image references — replace with new asset paths if found.
  3. Run pnpm dev (background), curl http://localhost:3003/ko, check for 404 in network/HTML.
  4. NO copy change. Phase 2.10 owns landing copy rewrite.
EXIT:
  - Landing page loads without 404 on assets
  - Favicon visible
  - Diff against main on landing copy files = 0 (only asset path swap allowed)
  - tsc + lint + build exit 0
FAIL on:
  - landing copy diff > 0 lines
  - asset 404 anywhere on /
ON_FAIL_LOOP:
  - loop 1: revert any accidental copy changes; keep asset path swaps only
LOG: GATE_EXIT G_B3_E landing_status=ok asset_404=0 copy_diff=0 tsc=ok lint=ok build=ok
COMMIT: chore(phase-2-8-3 g-b3-e): landing brand asset path verification
```

### G_B3_F — REVIEW + SHIPPED

```
ENTRY: G_B3_E SHIPPED
DECISION (per SPEC §7):
  - If G_B3_B touched RLS / scope resolution → run K-05 (Codex gpt-5.5)
  - Else (pure UI/copy/asset) → skip K-05, document in commit message
  - Log decision to _run.log

K-05 prompt (if running) at .yagi-autobuild/phase-2-8-3/_codex_review_prompt.md per
.yagi-autobuild/codex-review-protocol.md. Focus areas:
  - asset path correctness (no Korean filenames in repo)
  - i18n key consistency (no orphans, no key renames)
  - workspace switcher RLS (if G_B3_B touched it)

Run via PowerShell with UTF-8 (Q-081 pattern):
  [Console]::InputEncoding = [System.Text.Encoding]::UTF8
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  Get-Content .yagi-autobuild\phase-2-8-3\_codex_review_prompt.md -Encoding UTF8 -Raw `
    | codex exec --model gpt-5.5 -c model_reasoning_effort=high `
    > .yagi-autobuild\phase-2-8-3\_codex_review_output.txt

LOOP_RULES (if running):
  - LOOP 1: auto-fix HIGH-A, HIGH-B with surgical patches
  - LOOP 2: re-run K-05; expect 0 HIGH-A, ≤1 HIGH-B residual
  - MED / LOW → log to FOLLOWUPS, do not block SHIPPED

SHIPPED actions:
  1. cd to main worktree (C:\Users\yout4\yagi-studio\yagi-workshop)
  2. git checkout main
  3. git pull origin main --ff-only
  4. git merge g-b-3-brand-polish --ff-only
  5. cd back into worktree, verify pnpm exec tsc --noEmit + pnpm build exit 0
  6. git push origin main
  7. log SHIPPED line:
     <ISO> SHIPPED PHASE_DONE phase=2-8-3 elapsed_clock=<...> target=4d gates=6 review=<skipped|run>
  8. announcement: "Phase 2.8.3 SHIPPED · 6 gates · <total_elapsed>h · brand restored"
EXIT:
  - tsc + lint + build clean across full diff
  - K-05 PASS or skipped-with-justification
  - main pushed
LOG: GATE_EXIT G_B3_F review=<run|skip> verdict=<...> ff_merge=ok push=ok tsc=ok lint=ok build=ok
COMMIT: chore(phase-2-8-3 shipped): merge ff + push origin main
```

---

## §3 — Logging

Append to `.yagi-autobuild/phase-2-8-3/_run.log` at every state transition. Format:

```
<ISO8601> <STATE> <EVENT> key1=val1 key2=val2 ...
```

Required: GATE_ENTER, GATE_EXIT, GATE_FAIL, LOOP_n_START/PASS, REVIEW_*, SHIPPED, HALT_<code>.

---

## §4 — HALT triggers

| Code | When | Surface |
|---|---|---|
| E0_ENTRY_FAIL | §0 git/worktree/install fails | exact stderr |
| E_ASSET_MISSING | yagi-provided PNG not at expected path | path + ls output |
| E_G_B3_A_OVERSIZE | asset > 200KB after copy + optimize | size + tool list |
| E_G_B3_B_RLS_LEAK | switcher exposes other tenants' workspaces | RLS test repro |
| E_G_B3_C_VALIDATION_DRIFT | handle help text disagrees with regex | help string + regex |
| E_G_B3_D_VFX_LEAK | "AI VFX" still in hero after edits | grep results |
| E_K05_LOOP3_HIGH_A | LOOP 2 still HIGH-A | last 3 outputs |
| E_TIMELINE_OVERRUN | total elapsed > 6d HARD_CAP | _run.log timeline |

---

## §5 — FORBIDDEN

The Builder must not:

1. Rename i18n KEY names (values are fine; renames break callers)
2. Touch the 4-step workflow strip in ProjectsHubHero (yagi didn't ask, leave alone)
3. Rewrite landing page copy (Phase 2.10 owns this)
4. Add VFX-specific imagery to sample case cards
5. Replace global `continue` i18n key value (use new keys per Phase 2.8.1 hotfix precedent)
6. Add new tables / migrations (this phase is UI/copy/asset only)
7. Touch ProfileRole type narrowing (Q-088 deferred to Phase 3.0)
8. Build Contest UI surfaces (Q-085, Q-086)
9. Add Korean characters in repo asset paths or import statements
10. Push migrations to prod (no migrations in this phase)

---

## §6 — DECISIONS_CACHE active entries

- **Q-081** Codex CLI invocation pattern (REVIEW, if running)
- **Q-082** HIGH-A-SCHEMA-ONLY severity (informational — no schema work)
- **Q-084** Workshop terminology — enforce in G_B3_B sidebar labels
- **Q-085** Workshop ↔ Contest separation (informational)
- **Q-088** ProfileRole legacy preservation — do NOT remove studio/observer code paths
- **Q-090** Onboarding copy framing — enforce "AI 비주얼" not "AI VFX" in G_B3_D
- **Q-091** Company type enum 5-option (informational)

---

## §7 — Timeline budget

```
TARGET   = 4 working days
SOFT_CAP = 5 days
HARD_CAP = 6 days → HALT E_TIMELINE_OVERRUN

PER GATE (target h):
  G_B3_A =  8
  G_B3_B =  4
  G_B3_C =  4
  G_B3_D =  8
  G_B3_E =  4
  G_B3_F =  4
```

Total ≈ 32h work + 0-2h review = 4d. Buffer 0d.

If §2.5 type elapsed-time check (G_B2_C precedent) trips on any gate, log and continue — none of these gates are skip-eligible.

---

## §8 — Builder execution instruction

You are the Builder for Phase 2.8.3. Execute this kickoff exactly as written. Start with §0 RUN ON ENTRY. Follow the state machine deterministically through 6 gates (A→B→C→D→E→F), then SHIPPED. K-05 review is conditional per §2 G_B3_F decision rule. Halt only on §4 triggers. Log to .yagi-autobuild/phase-2-8-3/_run.log per §3. Do not ask yagi for confirmation between gates. Begin now.
