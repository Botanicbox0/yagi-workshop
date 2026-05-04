# Phase 5 Wave C — KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree(s) per Phase dispatch
SOURCE   = .yagi-autobuild/phase-5-wc-detail/SPEC.md (vision, locked v2)
PROTOCOL = Phase 5 KICKOFF.md K-05 protocol (Codex 5.5 ChatGPT subscription auth)
LOOP_MAX = 2 per fail
HUMAN    = halt + telegram on HALT trigger only
DISPATCH = HYBRID — Phase 1 lead solo / Phase 2 parallel x 3 / Phase 3 lead solo / Phase 4 lead solo
```

---

## §0 — RUN ON ENTRY

Execute this block first. Do not deviate. Do not ask.

```bash
# 1. Read source of truth (in order)
cat .yagi-autobuild/phase-5-wc-detail/SPEC.md
cat .yagi-autobuild/PRODUCT-MASTER.md | head -350
cat .yagi-autobuild/PRODUCT-MASTER.md | tail -200    # v1.1 + v1.2 amendments
cat .yagi-autobuild/phase-5/KICKOFF.md | head -200   # K-05 protocol reference
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md

# 2. Verify clean entry state
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -5
test -f .yagi-autobuild/phase-5-wc-detail/SPEC.md && echo OK_SPEC
test -f messages/ko.json && echo OK_I18N_KO
test -f messages/en.json && echo OK_I18N_EN

# 3. Verify state machine + RPC are baseline (no surprise migrations needed)
grep -l "is_valid_transition" supabase/migrations/ | head -5
grep -l "transition_project_status" supabase/migrations/ | head -5
# Expect: 20260427164421_phase_3_0_projects_lifecycle.sql (truth table base)
#         20260504200001_phase_5_transition_project_status_creator_role.sql (Wave B creator-first)

# 4. Confirm Wave C entry baseline = main (Wave B closed at 29a4261)
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current
# If on g-b-10-phase-5 (Phase 5 branch) → OK
# If on main → ensure pull --ff-only first
```

If any line above outputs a non-zero exit code or an error, transition to `HALT_E0_ENTRY_FAIL`.

---

## §1 — STATE MACHINE

```
STATES = [INIT, C_1, C_2, C_3, C_4, C_5, C_6, REVIEW, SHIPPED, HALT]
Sequence: C_1 → {C_2, C_4, C_5 parallel} → C_3 → C_6 → REVIEW → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 success | C_1 | log GATE_ENTER C_1 |
| INIT | §0 fail | HALT | escalate E0_ENTRY_FAIL |
| C_1 | exit_passed | DISPATCH_PHASE_2 | log GATE_EXIT C_1; commit; spawn 3 parallel worktrees per §3 |
| DISPATCH_PHASE_2 | all 3 (C_2, C_4, C_5) exit_passed | C_3 | log GATE_EXIT C_2/C_4/C_5; commit each; merge parallel branches to phase branch |
| DISPATCH_PHASE_2 | any 1 fail_loop_3 | HALT | escalate E_PARALLEL_FAIL with sub_id |
| C_3 | exit_passed | C_6 | log GATE_EXIT C_3; commit |
| C_6 | exit_passed | REVIEW | invoke Codex K-05 (Tier 2 medium default) |
| C_n | fail_loop_1 | C_n | re-attempt with corrected diff |
| C_n | fail_loop_2 | C_n | re-attempt with second strategy |
| C_n | fail_loop_3 | HALT | escalate E_n_LOOP_EXHAUSTED |
| C_n | halt_trigger_match | HALT | escalate per §4 trigger code |
| REVIEW | codex_PASS | SHIPPED | report 야기 chat for ff-merge GO |
| REVIEW | codex_HIGH | C_(matched) | re-enter gate; loop budget 2 |
| REVIEW | codex_MED_BC | (continue to SHIPPED) | FU 등록, scale-aware rule |
| REVIEW | codex_loop_3 | HALT | escalate E_REVIEW_LOOP |

Transitions are deterministic. No 야기 approval between transitions
except HALT and final REVIEW → SHIPPED gate.

---

## §2 — GATES

Each gate has six fields. Run gate body. Verify exit. If exit passes,
log + commit + advance.

### C_1 — Tab structure + routing + 현황 tab skeleton (lead solo, 3d)

```
ENTRY:
  - working dir = main worktree (or g-b-10-phase-5 phase branch)
  - SPEC §"Scope: 5 tab 구조" + §"현황 tab 콘텐츠" read
EXIT (all required):
  - file exists: src/app/[locale]/app/projects/[id]/page.tsx (refactored)
  - file exists: src/app/[locale]/app/projects/[id]/_tabs/ directory with 5 tab files OR equivalent server-component split
  - tab routing via ?tab= query param works (deep-linkable URLs)
  - default tab = "현황" (status) when ?tab missing
  - 현황 tab skeleton renders empty placeholders for all 5 sub-sections (timeline / CTA / brief 요약 / 첨부 요약 / 코멘트 thread)
  - 보드 tab wrap of existing brief-board-shell-client renders unchanged
  - 코멘트 / 결과물 tab render placeholder empty state
  - tsc + lint + build exit 0
  - Cancelled / Archived banner placeholder rendered (text only, no logic yet)
FAIL on:
  - tab routing breaks existing detail page entry from /projects/ list
  - brief-board-shell-client tab wrap breaks tldraw mount
  - SSR / hydration mismatch on tab switch
ON_FAIL_LOOP:
  - loop 1: rework tab component as client component if SSR mismatch
  - loop 2: fall back to URL segment (/projects/[id]/[tab]) if ?tab= breaks deep linking
LOG: GATE_EXIT C_1 tab_count=5 routing=ok skeleton=ready
COMMIT: feat(phase-5/wc.1): detail page 5-tab structure + routing + 현황 tab skeleton
```

### C_2 — Status timeline 컴포넌트 + wording i18n (parallel, 1.5d, Sonnet)

```
ENTRY:
  - C_1 SHIPPED, parallel worktree spawned (g-b-10-wc-2-status-timeline)
  - SPEC §"Status wording" + PRODUCT-MASTER §H (v1.2) read
EXIT (all required):
  - file exists: src/components/project-detail/status-timeline.tsx (or equivalent)
  - vertical stepper renders 7 active states (draft → submitted → in_review → in_progress[+in_revision sub] → delivered → approved)
  - current step sage #71D083 accent, completed = checkmark, future = muted
  - cancelled / archived = banner branch (NOT in timeline)
  - i18n keys added to messages/ko.json + messages/en.json (6 namespaces per SPEC §"i18n namespace"):
    * projects.status.label.{enum}        — 9 keys × 2 locales
    * projects.status.helper.{enum}       — keys for non-empty helpers × 2 locales
    * project_detail.status.timeline.{enum} — visual extras × 2 locales (if needed)
    * project_detail.status.cta.{enum}    — CTA labels × 2 locales (full set for C.3 reuse)
    * project_detail.status.banner.{enum} — cancelled/archived × 2 locales
    * project_detail.status.empty_state.* — submitted helper × 2 locales
    * project_detail.tab.{tab_key}        — 5 tab labels × 2 locales
  - storybook-style demo OR test page renders all 9 states
  - tsc + lint + build exit 0
FAIL on:
  - in_revision sub-state placement breaks timeline visual
  - i18n key drift between ko/en (count mismatch)
  - sage accent applied to non-current step
ON_FAIL_LOOP:
  - loop 1: simplify in_revision as inline badge on in_progress step
  - loop 2: refactor to single component with state-driven props
LOG: GATE_EXIT C_2 timeline_states=7 i18n_keys=NN ko=NN en=NN
COMMIT: feat(phase-5/wc.2): status timeline + 9-state wording i18n (6 namespaces)
```

### C_4 — 브리프 tab read-only + [브리프 완성하기 →] CTA (parallel, 1.5d, Sonnet)

```
ENTRY:
  - C_1 SHIPPED, parallel worktree spawned (g-b-10-wc-4-brief-tab)
  - SPEC §"브리프 tab" read
  - existing Briefing Canvas Step 1/2/3 fields known (grep 'briefing_documents' + 'projects' columns)
EXIT (all required):
  - 브리프 tab renders Stage 1 / Stage 2 / Stage 3 sections read-only
  - Stage 1: project name, deliverable_types chips, description, mood keywords, channels, target audience, visual_ratio, additional_notes
  - Stage 2: budget_band, delivery date, meeting preference, interested_in_twin toggle (read-only)
  - Stage 3: 제출 시각 (submitted_at), 제출자 (created_by display name)
  - All fields display read-only (no input controls)
  - status === 'draft' → top banner "아직 작성 중인 브리프예요" + primary CTA [브리프 완성하기 →]
    → CTA href = /[locale]/app/projects/new?project={id} (re-enter Briefing Canvas; Wave B 의 hydration 사용)
  - status !== 'draft' → CTA hidden, read-only only
  - tsc + lint + build exit 0
FAIL on:
  - Stage 2 의 interested_in_twin null vs false 혼동 (legacy data)
  - read-only display 가 input control 처럼 보임 (UX confusion)
  - CTA href 가 wrong workspace 로 redirect
ON_FAIL_LOOP:
  - loop 1: explicit `disabled + readOnly` props on input components
  - loop 2: switch to dt/dd structure for read-only display
LOG: GATE_EXIT C_4 brief_tab=ready cta_visible_on_draft=true
COMMIT: feat(phase-5/wc.4): 브리프 tab read-only view + [브리프 완성하기 →] CTA
```

### C_5 — 보드 tab wrap + 코멘트/결과물 placeholder + cancelled/archived banner (parallel, 0.5d, Haiku/Sonnet)

```
ENTRY:
  - C_1 SHIPPED, parallel worktree spawned (g-b-10-wc-5-misc-tabs)
  - SPEC §"보드 tab" + §"코멘트 / 결과물 tab" + §"Cancelled / Archived banner" read
EXIT (all required):
  - 보드 tab = brief-board-shell-client wrap (no component modification)
  - 코멘트 tab = empty state component "곧 만나볼 수 있어요" + 부 텍스트 "Phase 5+ comment thread 본격 구현 예정"
  - 결과물 tab = empty state component "곧 만나볼 수 있어요" + 부 텍스트 "Phase 6+ 납품물 surface 예정"
  - Banner logic: detail page 진입 시 status check → cancelled/archived 면 page 전체 위에 banner 렌더
  - cancelled banner: "이 의뢰는 취소되었어요. 새 의뢰를 작성하려면 [새 의뢰 시작]" — link to /projects/new
  - archived banner: "이 의뢰는 보관 처리되었어요" — text only
  - banner 아래 5-tab 구조 그대로 표시 (read-only mode signal)
  - design tone = yagi-design-system v1.0 (sage accent, subtle border, zero shadow)
  - tsc + lint + build exit 0
FAIL on:
  - tldraw mount fails inside tab wrap (canvas dimension issue)
  - banner blocks tab clicks
  - banner hides scrollable content
ON_FAIL_LOOP:
  - loop 1: explicit width/height on tldraw container
  - loop 2: render banner as sticky top, content below scrolls
LOG: GATE_EXIT C_5 board_tab=wrap_ok placeholders=2 banner=cancelled+archived
COMMIT: feat(phase-5/wc.5): 보드 tab wrap + 코멘트/결과물 placeholder + cancelled/archived banner
```

### C_3 — Next action CTA matrix + Brief 요약 카드 + 첨부 요약 + delivered/approved server actions (lead solo, 2d)

```
ENTRY:
  - DISPATCH_PHASE_2 ALL_PASSED (C_2 + C_4 + C_5 merged to phase branch)
  - C_2 의 status timeline + i18n keys available
  - SPEC §"Next action CTA" + §"Brief 요약 카드" + §"첨부자료 요약" read
EXIT (all required):
  - Next action CTA matrix component renders status-별 1–2 CTA per SPEC table
  - draft → [브리프 완성하기 →] (reuses C_4 CTA)
  - submitted → 0 CTA, helper text only (i18n project_detail.status.empty_state.submitted)
  - in_review → [자료 추가하기] CTA → opens briefing_documents append form (kind selector: brief / reference)
  - in_progress → [코멘트 작성] disabled placeholder
  - in_revision → [수정 의견 코멘트] disabled placeholder
  - delivered → primary CTA [시안 보기 →] → click shows "준비 중" placeholder modal/page
  - approved → [프로젝트 평가하기] disabled placeholder
  - Brief 요약 카드: project name (heading) + deliverable_types chips + description first 80 chars (truncate) + "전체 브리프 보기 →" link to 브리프 tab
  - 첨부자료 요약: count header (기획서 N / 레퍼런스 M from briefing_documents.kind) + thumbnail strip top 3 (~64px height, 기획서 우선) + "전체 보기 →" link to 보드 tab
  - 야기 코멘트 thread placeholder: "야기 팀이 코멘트를 남기면 여기에 표시돼요"
  - data-layer server actions (NEW, file colocation: same dir as recallProjectAction in src/app/[locale]/app/projects/[id]/actions.ts):
    * approveDeliveredAction(projectId) — calls supabase.rpc('transition_project_status', { p_project_id, p_to_status: 'approved', p_comment: null })
    * requestRevisionAction(projectId, comment) — calls RPC with p_to_status='in_revision', p_comment (≥10 chars enforced by RPC)
    * appendBriefingDocumentAction(projectId, kind, source_type, ...) — INSERT into briefing_documents per RLS
  - Each server action returns discriminated union { ok: true, ... } | { ok: false, error: 'forbidden' | 'invalid_transition' | 'comment_required' | 'unknown' }
  - revalidatePath('/projects/[id]') + revalidatePath('/projects') after success
  - in_review 의 [자료 추가하기] modal/form ships with file upload (R2 putUrl) + URL input → wired to appendBriefingDocumentAction
  - tsc + lint + build exit 0
FAIL on:
  - delivered/approved server actions 의 client authorization 누수 (creator-first matrix 우회)
  - briefing_documents append RLS 우회 (kind injection, cross-workspace)
  - thumbnail strip 가 기획서 thumbnail 없을 때 깨짐 (PDF 첫 페이지 fallback 필요)
  - Brief 요약 카드 description truncate 가 multibyte 한글 깨짐
ON_FAIL_LOOP:
  - loop 1: explicit RLS verify SQL in test fixture; tighten kind CHECK in server action
  - loop 2: PDF thumbnail = R2 prefix lookup with cache; truncate via Intl.Segmenter
LOG: GATE_EXIT C_3 cta_matrix_states=9 server_actions=3 thumbnails_top3=ok
COMMIT: feat(phase-5/wc.3): next action CTA matrix + brief/attachment summary + data-layer server actions
```

### C_6 — Visual review + K-05 LOOP 1 + Mobile responsive smoke (lead solo, 1d)

```
ENTRY:
  - C_3 SHIPPED, all gates merged
  - SPEC §"Verification" + §"Codex K-05" + §"Visual review" read
EXIT (all required):
  - Visual review: yagi-design-system v1.0 compliance
    * Sage accent (#71D083) only — 다른 color 도입 0 confirmed via grep
    * Typography: Korean Pretendard Variable lh 1.15–1.22 ls -0.01em
    * Border subtle rgba(255,255,255,0.11), radius 24/999/12, zero shadow
  - Mobile responsive smoke (Chrome devtools 360px / 768px / 1024px / 1920px) — 안 망가지는지만 (정밀화 X, FU-Phase5-12)
  - K-05 LOOP 1 (Codex CLI Tier 2 medium):
    * file: .yagi-autobuild/phase-5-wc-detail/_codex_review_prompt.md (adversarial framing per SPEC §"Risk surface")
    * file: .yagi-autobuild/phase-5-wc-detail/_codex_review_loop1.md (findings)
    * Verdict: 0 / LOW / MED-A = PASS, MED-B/C = FU 등록 (scale-aware rule), HIGH = HALT
  - All 21 verification steps from SPEC ran, results in .yagi-autobuild/phase-5-wc-detail/_verify_log.md
  - Final report: .yagi-autobuild/phase-5-wc-detail/_wave_c_result.md
FAIL on:
  - HIGH severity finding from K-05
  - Visual review fails (non-sage color introduced, shadow used)
  - Mobile responsive 망가짐 (overflow horizontal, tab inaccessible)
  - Verification step failure (any of 1–21)
ON_FAIL_LOOP:
  - loop 1: inline fix per finding class; re-run K-05 narrow LOOP 2 (scope = changed files only)
  - loop 2: HALT to 야기 if HIGH residual after LOOP 2
LOG: GATE_EXIT C_6 visual=ok mobile=ok k05_findings=N verify_pass=21/21
COMMIT: feat(phase-5/wc.6): visual review + K-05 LOOP 1 + mobile smoke + final report
```

---

## §3 — DISPATCH_PHASE_2 (parallel worktree spawn)

After C_1 SHIPPED, spawn 3 parallel worktrees:

```bash
# Phase branch base = current g-b-10-phase-5 (or main if Phase 5 ff-merged before Wave C)
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)

# C_2 worktree (Sonnet)
git -C C:/Users/yout4/yagi-studio/yagi-workshop worktree add -b g-b-10-wc-2-status-timeline ../yagi-workshop-wc-2 $PHASE_BASE
cp .env.local ../yagi-workshop-wc-2/.env.local
cd ../yagi-workshop-wc-2 && pnpm install --frozen-lockfile

# C_4 worktree (Sonnet)
git -C C:/Users/yout4/yagi-studio/yagi-workshop worktree add -b g-b-10-wc-4-brief-tab ../yagi-workshop-wc-4 $PHASE_BASE
cp .env.local ../yagi-workshop-wc-4/.env.local
cd ../yagi-workshop-wc-4 && pnpm install --frozen-lockfile

# C_5 worktree (Haiku or Sonnet)
git -C C:/Users/yout4/yagi-studio/yagi-workshop worktree add -b g-b-10-wc-5-misc-tabs ../yagi-workshop-wc-5 $PHASE_BASE
cp .env.local ../yagi-workshop-wc-5/.env.local
cd ../yagi-workshop-wc-5 && pnpm install --frozen-lockfile
```

Lead Builder 는 Agent Teams `.claude/settings.json` 에서
`{"env":{"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS":"1"}}` 활성 확인 후
3 teammate dispatch. `task_plan.md` 의 `parallel_group: phase-2` field
mandatory.

각 teammate teammates don't inherit lead/sibling context — task spec
는 각 KICKOFF gate 의 ENTRY/EXIT/FAIL/LOG/COMMIT 6 field self-contained.

Sonnet cold start ~30s 감안. Phase 2 wall-clock = max(C_2, C_4, C_5)
+ merge cost = ~2d.

3 teammate 모두 EXIT pass → lead Builder 가 phase branch 로 ff-merge:

```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop
git fetch . g-b-10-wc-2-status-timeline g-b-10-wc-4-brief-tab g-b-10-wc-5-misc-tabs
git merge --ff-only g-b-10-wc-2-status-timeline
git merge --ff-only g-b-10-wc-4-brief-tab
git merge --ff-only g-b-10-wc-5-misc-tabs
# If non-ff (rare, all 3 worktrees independent files), use --no-ff with explicit message
git worktree remove ../yagi-workshop-wc-2 ../yagi-workshop-wc-4 ../yagi-workshop-wc-5
```

barrier 책임 = lead Builder. tsc + lint + build clean on merged phase
branch before C_3 진입.

---

## §4 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step non-zero exit | 야기 chat: missing file/branch/MCP |
| `E1_LOOP_EXHAUSTED` | C_1 fail loop 3 | 야기 review tab routing strategy |
| `E2_LOOP_EXHAUSTED` | C_2 fail loop 3 | 야기 review timeline visual constraint |
| `E3_LOOP_EXHAUSTED` | C_3 fail loop 3 | 야기 review CTA matrix or RLS |
| `E4_LOOP_EXHAUSTED` | C_4 fail loop 3 | 야기 review brief tab field mapping |
| `E5_LOOP_EXHAUSTED` | C_5 fail loop 3 | 야기 review board wrap or banner |
| `E6_VISUAL_FAIL` | C_6 visual review fail (non-sage color, shadow used) | inline fix, re-run |
| `E_PARALLEL_FAIL` | DISPATCH_PHASE_2 any teammate fail loop 3 | 야기 chat with sub_id (C_2/C_4/C_5) |
| `E_REVIEW_LOOP` | K-05 LOOP 3 HIGH residual | 야기 chat with finding details |

---

## §5 — K-05 protocol (Wave C specific)

Inherits Phase 5 KICKOFF.md K-05 protocol (Codex 5.5 ChatGPT
subscription auth, 5h message quota, context minimization rules).

Wave C specific:
- **Tier**: 2 medium (default per SPEC D3).
- **Upgrade trigger to Tier 1 high**: delivered/approved server actions (C_3) — RLS surface 가 새 RPC 호출 + 새 server action — high reasoning이 적합 if Builder 판단.
- **Context budget**:
  - C_3 review file list = ~10 file (CTA matrix, brief 요약, 첨부 요약, 3 server actions, briefing_documents append modal)
  - C_6 review = full Wave C diff but file count < 20 (per Phase 5 KICKOFF context minimization rule)
- **Builder grep audit pre-step** (per Phase 5 KICKOFF rule):
  - grep `transition_project_status` calls — verify all use creator-first matrix correctly
  - grep `briefing_documents` selects — verify all have implicit RLS via project_id
  - grep `?tab=` parsing — verify cross-workspace project ID rejection upstream
  - cascade audit findings 추가 to K-05 file list

---

## §6 — Reporting

After SHIPPED gate (or HALT):

Final report file:
`.yagi-autobuild/phase-5-wc-detail/_wave_c_result.md`

Sections:
- Diffs summary (commits per gate + file count)
- Verify log summary (21 steps PASS/FAIL)
- K-05 result (findings count by severity)
- FU 등록 list (Phase5-10 ~ -15 from SPEC)
- Open questions
- Ready-to-merge: YES / NO

Then chat 야기 with:
- (a) commits made (hashes per gate)
- (b) verify summary
- (c) K-05 verdict
- (d) GO / HALT recommendation for ff-merge to main

---

GO.
