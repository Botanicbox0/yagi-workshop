# Phase 5 Wave C — Hotfix-2 KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree(s) per Phase dispatch
SOURCE   = .yagi-autobuild/phase-5-wc-hf2/SPEC.md (vision, locked v1)
PROTOCOL = Phase 5 KICKOFF.md K-05 protocol (Codex 5.5) + K-06 (Opus subagent)
LOOP_MAX = 2 per fail
HUMAN    = halt + telegram on HALT trigger only
DISPATCH = HYBRID — HF2.1 lead solo base / HF2.2 + HF2.3 parallel x 2
BASELINE = main (Wave A+B+B.5+C+hotfix-1 ff-merged), new branch `g-b-10-hf2`
```

---

## §0 — RUN ON ENTRY

Execute this block first. Do not deviate. Do not ask.

```bash
# 1. Read source of truth
cat .yagi-autobuild/phase-5-wc-hf2/SPEC.md
cat .yagi-autobuild/PRODUCT-MASTER.md  # esp. §C.4 v1.2 + §I + §J
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md
cat ~/.claude/skills/yagi-lessons/SKILL.md  # esp. L-045, L-048, L-049, L-050
cat .yagi-autobuild/codex-review-protocol.md  # K-05 + K-06 protocol

# 2. Verify clean entry state (Wave A+B+B.5+C+hotfix-1 already on main)
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current  # expect: main
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -10  # expect: hotfix-1 commits at top

# 3. Branch off main for hotfix-2
git -C C:/Users/yout4/yagi-studio/yagi-workshop checkout -b g-b-10-hf2

# 4. Verify components exist
test -f src/app/[locale]/app/projects/[id]/page.tsx && echo OK_DETAIL_PAGE
test -f src/components/project-detail/status-tab.tsx && echo OK_STATUS_TAB
test -f src/components/project-detail/status-card.tsx && echo OK_STATUS_CARD
test -f src/components/project-detail/status-timeline.tsx && echo OK_TIMELINE
test -f src/components/project-detail/info-rail.tsx && echo OK_INFO_RAIL
test -f src/lib/supabase/service.ts && echo OK_SERVICE_CLIENT
grep -l "AlertDialog\|DropdownMenu" src/components/ui/ -r | head -3  # shadcn primitives
```

If any line above outputs a non-zero exit code or an error, transition to `HALT_E0_ENTRY_FAIL`.

---

## §1 — STATE MACHINE

```
STATES = [INIT, HF2_1, HF2_2, HF2_3, K05, K06, REVIEW, SHIPPED, HALT]
Sequence: INIT → HF2_1 → DISPATCH_PARALLEL{HF2_2, HF2_3} → K05 + K06 (parallel) → REVIEW → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 success | HF2_1 | log GATE_ENTER HF2_1 |
| INIT | §0 fail | HALT | escalate E0_ENTRY_FAIL |
| HF2_1 | exit_passed | DISPATCH_PARALLEL | log + commit + spawn 2 worktrees per §3 |
| DISPATCH_PARALLEL | both HF2_2 + HF2_3 exit_passed | K05+K06 | log + commit each + ff-merge to phase branch |
| DISPATCH_PARALLEL | any 1 fail_loop_3 | HALT | escalate E_PARALLEL_FAIL |
| HF2_n | fail_loop_1/2 | HF2_n | re-attempt (loop budget 2) |
| HF2_n | fail_loop_3 | HALT | escalate E_n_LOOP_EXHAUSTED |
| K05+K06 | both PASS or LOW only | REVIEW | aggregate results |
| K05+K06 | K05 HIGH-A/B | HALT | E_K05_BLOCKER (auth/RLS) |
| K05+K06 | K06 HIGH | HALT | E_K06_BLOCKER (design must-fix) |
| K05+K06 | K05 MED-B/C or K06 MED | REVIEW with FU | scale-aware: <100 user → FU register |
| REVIEW | all_verify_pass | SHIPPED | report 야기 chat for ff-merge GO |
| REVIEW | verify_fail | HF2_(matched) | re-enter (loop budget 2) |

Transitions deterministic.

---

## §2 — GATES

### HF2_1 — Layout consolidation (lead solo, base, 0.75d, Sonnet)

```
ENTRY:
  - working dir = main worktree on new branch g-b-10-hf2
  - SPEC §"HF2.1" + H2D1 + H2D2 + H2D3 read
EXIT (all required):
  - page.tsx 의 L2 (StatusTimeline + 감싸는 div) 완전 제거
  - page.tsx 의 L3 (HeroCard + InfoRail flex container) 완전 제거
  - page.tsx 의 새 layout: Breadcrumb → DetailTabs → Tab content → Admin actions (4 layer)
  - StatusTab 의 props 확장 (info rail data: createdAt, budgetBand,
    targetDeliveryAt, twinIntent, meetingPreferredAt + i18n labels)
    또는 새 props bundle infoRail={...}
  - StatusTab 내부 grid-cols-12 layout:
    * 좌 col-span-2 sticky vertical timeline
    * 메인 col-span-7 status 카드 (HF1.1 결과 그대로)
    * 우 col-span-3 sticky InfoRail
  - 하단 row: 브리프 요약 + 첨부 자료 + 코멘트 cards (grid-cols-1 md:grid-cols-3)
  - 다른 tab (브리프/보드/코멘트/결과물) = full width 메인 콘텐츠 (timeline + InfoRail X)
  - cancelled/archived banner 위치 정리 (page.tsx L1 직후 또는 status tab 안)
  - 모든 9 status (draft, submitted, in_review, in_progress, in_revision, delivered, approved, cancelled, archived) layout 정상
  - tsc + lint + build clean
FAIL on:
  - L2/L3 잔존
  - timeline 또는 InfoRail 이 다른 tab 에 노출
  - StatusTab grid 가 모바일 (< md) 에서 망가짐 (overflow / inaccessible)
  - terminal status (cancelled/archived) banner 누락
ON_FAIL_LOOP:
  - loop 1: page.tsx 의 L2/L3 jsx 직접 grep + 제거
  - loop 2: StatusTab props 확장을 props bundle (infoRail object) 로 단순화
LOG: GATE_EXIT HF2_1 page_tsx_lines_removed=N status_tab_layout=12-col
COMMIT: refactor(phase-5/wc.hf2.1): layout consolidation — remove L2/L3 redundancy
```

### HF2_2 — 의뢰 삭제 (parallel, 0.5d, Sonnet)

```
ENTRY:
  - HF2_1 SHIPPED, parallel worktree spawned (g-b-10-hf2-2-delete)
  - SPEC §"HF2.2" + H2D4 + H2D5 + H2D6 + H2D7 + H2D8 + H2D9 read
  - L-048 + L-049 multi-role audit 적용 의무
EXIT (all required):
  - deleteProjectAction server action 작성 (`src/app/[locale]/app/projects/[id]/_actions/delete-project.ts` 또는 기존 actions.ts 통합)
  - server action 내부 verify:
    * unauthenticated (auth.uid 없음) → "unauthenticated"
    * 본인 project 아님 (created_by !== user.id) → "forbidden_owner"
    * status NOT IN ('submitted', 'in_review') → "forbidden_status"
    * deleted_at IS NOT NULL → "not_found"
    * 정상 → service-role client 로 soft-delete + .eq("created_by", user.id) + .in("status", [submitted, in_review]) + .is("deleted_at", null)
  - status 카드 dropdown menu 추가 (DropdownMenu + DropdownMenuTrigger ⋯ icon)
    * status IN ('submitted', 'in_review') + isOwner 일 때만 visible
    * items: [의뢰 회수 후 수정] (existing recall flow trigger) + [의뢰 삭제] (new delete flow trigger)
  - confirm dialog: AlertDialog "이 의뢰를 삭제할까요?" + cancel + 삭제
  - 삭제 성공 → toast + router.push('/[locale]/app/projects')
  - 삭제 실패 → toast (에러별 i18n key — HF2.3 에서 작성)
  - project list (`/projects/page.tsx`) SELECT 에 `.is("deleted_at", null)` 추가 (또는 verify 이미 존재)
  - 기존 status 카드 footer 의 secondary [의뢰 회수 후 수정] CTA 위치 = dropdown 안으로 이동 (HD5 v2 변경 — dual CTA 가 사실상 single primary CTA + dropdown)
  - tsc + lint + build clean
FAIL on:
  - status='in_progress' (또는 그 이후) 일 때 삭제 가능 (status guard 누락)
  - 다른 user 의 project 삭제 가능 (owner guard 누락)
  - service-role client 안 쓰고 user-scoped → 42501 회귀
  - project list 에 deleted projects 표시
  - 기존 RecallButton secondary CTA 위치가 dropdown 외에도 잔존 (중복)
ON_FAIL_LOOP:
  - loop 1: server action 의 status / owner / deleted_at guard 추가
  - loop 2: dropdown 의 status 조건 명시 + RecallButton 기존 위치 grep + 제거
LOG: GATE_EXIT HF2_2 server_action=ok dropdown_visible_statuses=2 service_role=ok
COMMIT: feat(phase-5/wc.hf2.2): 의뢰 삭제 (submitted/in_review only) + dropdown UI
```

### HF2_3 — i18n + accessibility (parallel, 0.25d, Haiku/Sonnet)

```
ENTRY:
  - HF2_1 SHIPPED, parallel worktree spawned (g-b-10-hf2-3-i18n-a11y)
  - SPEC §"HF2.3" read
EXIT (all required):
  - 9 i18n keys × 2 locale 추가 (project_detail.status.card.dropdown.*):
    trigger_label / recall / delete / delete_confirm.title / delete_confirm.description /
    delete_confirm.cancel / delete_confirm.submit / delete_success_toast / delete_error_toast
  - 모든 key 의 KO + EN value 정확
  - dropdown trigger button: aria-label="더 보기" (i18n)
  - dropdown menu: keyboard navigation 정상 (↑↓ Esc Enter — Radix UI 기본)
  - confirm dialog: focus trap 정상 (AlertDialog 기본)
  - destructive submit button: tab order 마지막 + Enter 시 destructive action
  - tsc + lint + build clean
FAIL on:
  - i18n key drift (count 불일치 ko/en)
  - aria-label 누락 (dropdown trigger 가 icon-only 라 screen reader 인식 X)
  - keyboard nav 깨짐 (Tab 갇힘 / Esc 안 닫힘)
ON_FAIL_LOOP:
  - loop 1: i18n key 정합성 grep + 누락 추가
  - loop 2: shadcn DropdownMenu / AlertDialog 컴포넌트 직접 import 확인 + Radix 기본 a11y 동작
LOG: GATE_EXIT HF2_3 i18n_keys=9 ko_en=ok aria_labels=ok keyboard_nav=ok
COMMIT: feat(phase-5/wc.hf2.3): i18n + accessibility for delete dropdown
```

### K05 — Codex review (HF2.2 server action only, MED tier)

```
ENTRY:
  - HF2.1 + HF2.2 + HF2.3 all SHIPPED, ff-merged to g-b-10-hf2
EXIT (all required):
  - Codex 5.5 review on deleteProjectAction file diff only (HF2.1 + HF2.3 은 K-05 skip)
  - Focus prompt: 
    "Adversarial review of new server action deleteProjectAction. Focus on:
     (1) status guard bypass — can a status='in_progress' project be deleted via crafted input?
     (2) owner guard bypass — can user A delete user B's project (workspace overlap)?
     (3) service-role client misuse — does the .eq() filter chain fully scope the UPDATE
         to the caller's row, or is there a wildcard / missing filter?
     (4) RLS multi-role audit (L-049) — walk client / ws_admin / yagi_admin / different-user
         perspectives on projects_update WITH CHECK for the deleted_at write.
     (5) revalidatePath path — is `/[locale]/app/projects` correct for client + admin viewers?
     (6) TOCTOU window — could the project status change between SELECT and UPDATE?"
  - Mandatory RLS multi-role audit block (codex-review-protocol.md §"K-05 Mandatory RLS multi-role audit") 첨부
  - Result file: .yagi-autobuild/phase-5-wc-hf2/_codex_review_loop1.md
  - Findings 파싱 → severity 분류
  - HIGH-A/B → HALT for inline fix; MED-B/C → FU registration; LOW → ignore
EXIT criteria:
  - Result file 작성 + verdict (CLEAN / findings count by severity)
LOG: GATE_EXIT K05 verdict=<CLEAN|HIGH-A:N|HIGH-B:N|MED-B:N|MED-C:N|LOW:N>
```

### K06 — Design review (UI-wide, MANDATORY)

```
ENTRY:
  - HF2.1 + HF2.2 + HF2.3 all SHIPPED, ff-merged to g-b-10-hf2
  - Run in parallel with K05 (no dependency)
EXIT (all required):
  - Spawn fresh Opus subagent (Task tool, general-purpose, no builder context)
  - Subagent prompt = K-06 prompt template (codex-review-protocol.md §"K-06 prompt template") + paste of:
    * git diff main..HEAD (g-b-10-hf2 vs main)
    * PRODUCT-MASTER.md §C.4 v1.2 + §I (status × CTA matrix)
    * yagi-design-system v1.0 SKILL.md
    * Optional: Builder captures screenshots of pnpm dev for status='submitted' detail page (before + after redesign 비교)
  - 4-dimension review:
    1. Information hierarchy — 의뢰자가 5초 안에 primary action 인식?
    2. Visual weight — primary CTA dominates? sage 사용 절제?
    3. Layout rhythm — 새 grid layout 의 spacing 자연? sticky behavior 자연?
    4. UX flow continuity — dropdown menu discovery 가능? confirm dialog 의 destructive 시각 충분?
  - Result file: .yagi-autobuild/phase-5-wc-hf2/_k06_design_review.md
  - Findings 파싱 → severity 분류
  - HIGH → HALT for inline fix; MED → FU registration (or hotfix-3 if budget); LOW → ignore
EXIT criteria:
  - Result file 작성 + verdict (PASS / NEEDS_FIXES / BLOCK)
LOG: GATE_EXIT K06 verdict=<PASS|NEEDS_FIXES:N|BLOCK:N>
```

---

## §3 — DISPATCH_PARALLEL (worktree spawn after HF2_1)

After HF2_1 SHIPPED + committed + pushed to g-b-10-hf2, spawn 2 parallel worktrees:

```bash
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)  # = g-b-10-hf2

# CRITICAL (lesson from HF1 stale-base incident): verify $PHASE_BASE = g-b-10-hf2 BEFORE worktree add
if [ "$PHASE_BASE" != "g-b-10-hf2" ]; then
  echo "ERROR: PHASE_BASE not g-b-10-hf2 (got $PHASE_BASE). Aborting."
  exit 1
fi

# HF2_2 worktree (Sonnet, 0.5d, server action + UI)
git worktree add -b g-b-10-hf2-2-delete ../yagi-workshop-hf2-2 $PHASE_BASE
cp .env.local ../yagi-workshop-hf2-2/.env.local
cd ../yagi-workshop-hf2-2 && pnpm install --frozen-lockfile

# HF2_3 worktree (Haiku/Sonnet, 0.25d, i18n + a11y)
git worktree add -b g-b-10-hf2-3-i18n-a11y ../yagi-workshop-hf2-3 $PHASE_BASE
cp .env.local ../yagi-workshop-hf2-3/.env.local
cd ../yagi-workshop-hf2-3 && pnpm install --frozen-lockfile
```

**Cross-task dependency**:
- HF2_2 의 dropdown UI 가 HF2_3 의 i18n key 사용 → HF2_3 commit 후 HF2_2 가 import. 순서 명확화: HF2_3 먼저 → HF2_2. 또는 HF2_2 가 i18n key placeholder 로 작성 → HF2_3 이 fill in.
- 권장: 둘 다 parallel. HF2_2 가 i18n key 를 *명시 string 으로* 작성 (e.g., `t("project_detail.status.card.dropdown.delete")`) → HF2_3 이 messages/{ko,en}.json 에 key 추가. 둘 다 commit 후 barrier 검증 시 빌드 통과 확인.

**barrier 책임 = lead Builder**: 2 worktree 모두 EXIT pass 후 ff-merge to phase branch:

```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop
git fetch . g-b-10-hf2-2-delete g-b-10-hf2-3-i18n-a11y
git merge --ff-only g-b-10-hf2-2-delete
git merge --ff-only g-b-10-hf2-3-i18n-a11y
git worktree remove ../yagi-workshop-hf2-{2,3}

# barrier verify
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

ff 가 아니어 conflict 발생 시 (HF2_2 ↔ HF2_3 status-card.tsx 같은 file 가능성): merge --no-ff with explicit message + manual resolve.

---

## §4 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step non-zero exit | 야기 chat: missing file/branch/MCP |
| `E1_LOOP_EXHAUSTED` | HF2_1 fail loop 3 | 야기 review layout strategy |
| `E2_LOOP_EXHAUSTED` | HF2_2 fail loop 3 | 야기 review delete server action / RLS |
| `E3_LOOP_EXHAUSTED` | HF2_3 fail loop 3 | 야기 review i18n/a11y blocker |
| `E_PARALLEL_FAIL` | DISPATCH_PARALLEL teammate fail | 야기 chat with sub_id |
| `E_BARRIER_FAIL` | ff-merge tsc/lint/build fail | 야기 chat with diff summary |
| `E_K05_BLOCKER` | Codex finding HIGH-A/B | 야기 chat: paste finding + fix plan |
| `E_K06_BLOCKER` | Opus design review BLOCK | 야기 chat: paste finding + screenshot |

---

## §5 — Reporting

After SHIPPED gate (or HALT):

Final report file: `.yagi-autobuild/phase-5-wc-hf2/_hf2_result.md`

Sections:
- Diffs summary (commits per gate + file count)
- Verify log summary (14 steps PASS/FAIL)
- K-05 verdict + findings (CLEAN / HIGH-* / MED-* / LOW)
- K-06 verdict + findings (PASS / NEEDS_FIXES / BLOCK)
- Combined recommendation: GO / GO with FU / HOLD
- Open questions (있다면)
- Ready-to-merge: YES / NO

Then chat 야기 with:
- (a) commits made (hashes per gate)
- (b) verify summary (14 steps)
- (c) K-05 verdict 1줄
- (d) K-06 verdict 1줄
- (e) combined recommendation + ff-merge GO 여부

---

GO.
