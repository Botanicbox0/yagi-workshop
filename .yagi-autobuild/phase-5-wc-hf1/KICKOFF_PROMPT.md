# Phase 5 Wave C — Hotfix-1 KICKOFF (Builder execution prompt)

```
ROLE     = Builder (Opus 4.7) in worktree(s) per Phase dispatch
SOURCE   = .yagi-autobuild/phase-5-wc-hf1/SPEC.md (vision, locked v2)
PROTOCOL = Phase 5 KICKOFF.md K-05 protocol (Codex 5.5 ChatGPT subscription auth)
LOOP_MAX = 2 per fail
HUMAN    = halt + telegram on HALT trigger only
DISPATCH = HYBRID — HF1.0 lead solo base / HF1.1~HF1.6 parallel x 6
```

---

## §0 — RUN ON ENTRY

Execute this block first. Do not deviate. Do not ask.

```bash
# 1. Read source of truth (in order)
cat .yagi-autobuild/phase-5-wc-hf1/SPEC.md
cat .yagi-autobuild/phase-5-wc-detail/_wave_c_result.md  # Wave C SHIPPED context
cat ~/.claude/skills/yagi-design-system/SKILL.md
cat ~/.claude/skills/yagi-context/SKILL.md
cat ~/.claude/skills/yagi-lessons/SKILL.md  # incl. L-045, L-048~L-050 (RLS, diagnosis-first)

# 2. Verify clean entry state (Wave C all 7 commits committed + pushed)
git -C C:/Users/yout4/yagi-studio/yagi-workshop status --short
git -C C:/Users/yout4/yagi-studio/yagi-workshop log --oneline -10
git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current
# Expect: g-b-10-phase-5 with 7 Wave C commits + 2 Wave B.5 commits + ensureBriefingDraftProject service-role fix

# 3. Verify previously identified components exist
test -f src/app/[locale]/app/projects/[id]/page.tsx && echo OK_DETAIL_PAGE
grep -l "RecallButton" src/ -r | head -3  # 기존 위치 확인 (HD5 v2 = 모두 제거 대상)
grep -l "tldraw\|brief-board-shell-client" src/ -r | head -3  # HF1.6 진단용
```

If any line above outputs a non-zero exit code or an error, transition to `HALT_E0_ENTRY_FAIL`.

---

## §1 — STATE MACHINE

```
STATES = [INIT, HF1_0, HF1_1, HF1_2, HF1_3, HF1_4, HF1_5, HF1_6, REVIEW, SHIPPED, HALT]
Sequence: INIT → HF1_0 → DISPATCH_PARALLEL{HF1_1..HF1_6} → REVIEW → SHIPPED
```

| From | Event | To | Action |
|---|---|---|---|
| INIT | §0 success | HF1_0 | log GATE_ENTER HF1_0 |
| INIT | §0 fail | HALT | escalate E0_ENTRY_FAIL |
| HF1_0 | exit_passed | DISPATCH_PARALLEL | log GATE_EXIT HF1_0; commit; spawn 6 parallel worktrees per §3 |
| DISPATCH_PARALLEL | all 6 (HF1_1..HF1_6) exit_passed | REVIEW | log GATE_EXIT each; commit each; ff-merge to phase branch |
| DISPATCH_PARALLEL | any 1 fail_loop_3 | HALT | escalate E_PARALLEL_FAIL with sub_id |
| HF1_n | fail_loop_1 | HF1_n | re-attempt with corrected diff |
| HF1_n | fail_loop_2 | HF1_n | re-attempt with second strategy |
| HF1_n | fail_loop_3 | HALT | escalate E_n_LOOP_EXHAUSTED |
| HF1_n | halt_trigger_match | HALT | escalate per §4 trigger code |
| REVIEW | all_verify_pass | SHIPPED | report 야기 chat for ff-merge GO |
| REVIEW | verify_fail | HF1_(matched) | re-enter gate; loop budget 2 |

Transitions deterministic. K-05 skip per SPEC §"Codex K-05" (LOW tier, UI 위주).

---

## §2 — GATES

Each gate has six fields. Run gate body. Verify exit. If exit passes, log + commit + advance.

### HF1_0 — Tab UX foundation (lead solo, base, 0.25d)

```
ENTRY:
  - working dir = main worktree (g-b-10-phase-5 phase branch)
  - SPEC §"HF1.0" + HD7 + HD10 read
EXIT (all required):
  - tab routing 의 onClick handler (또는 Link 기반 navigation) 가 scroll-to-top 호출
    * 보드 tab 만 예외 (canvas viewport 보존)
  - 4 skeleton 컴포넌트 또는 generic <Skeleton variant="card" /> 1개
    * StatusCardSkeleton / BriefSummarySkeleton / AttachmentSummarySkeleton / CommentThreadSkeleton
    * 또는 단일 generic component 로 props 차별
    * animate-pulse + bg-muted/30 + border-border/30
  - detail page 진입 시 데이터 fetching 동안 skeleton 보임 → 데이터 도착 시 fade in (transition-opacity 200ms)
  - skeleton 100ms 미만 flash 방지 (e.g., minimum display time 200ms)
  - tsc + lint + build clean
FAIL on:
  - Tab 전환 시 scroll lock 또는 page jump glitch
  - skeleton flash (UI 깜빡임)
  - 보드 tab canvas dimension 파괴 (HF1.6 와 cross-impact 가능)
ON_FAIL_LOOP:
  - loop 1: scroll-to-top 을 useEffect 기반 또는 Next.js Link scroll prop 으로 전환
  - loop 2: skeleton 을 server component 로 변경 (hydration 후 client component fade-in)
LOG: GATE_EXIT HF1_0 scroll_to_top=ok skeleton_count=4 board_exception=ok
COMMIT: feat(phase-5/wc.hf1.0): tab UX foundation — scroll-to-top + skeleton
```

### HF1_1 — Status 카드 redesign + dual CTA (parallel, 0.5d, Sonnet)

```
ENTRY:
  - HF1_0 SHIPPED, parallel worktree spawned (g-b-10-hf1-1-status-card)
  - SPEC §"HF1.1" + HD1 + HD8 + HD5 v2 read
EXIT (all required):
  - status 카드 component (또는 props 확장)
  - submitted status 시 정확 콘텐츠 렌더:
    * title: "의뢰가 접수되었습니다"
    * body: "YAGI 팀이 브리프를 검토 중입니다."
    * 3 meta row: 예상 답변 1–2 영업일 내 / 다음 단계 검토 완료 후 코멘트 또는 미팅 일정 안내 / 담당 팀 YAGI Creative Team
    * dual CTA same row: [브리프 전체 보기 →] primary (sage solid bg) + [의뢰 회수 후 수정] secondary (outline)
  - dual CTA hierarchy 정확:
    * primary = bg sage #71D083, text white, hover bg darker (yagi-design-system v1.0 token 안에서)
    * secondary = outline border-border/40, text foreground, hover text sage (subtle hint)
  - 나머지 8 status (draft / in_review / in_progress / in_revision / delivered / approved / cancelled / archived) = 현재 helper text 그대로 (회귀 회피)
  - i18n keys 9개 × 2 locale (project_detail.status.card.*)
  - tsc + lint + build clean
FAIL on:
  - dual CTA visual weight 동등 (hierarchy 안 보임)
  - submitted 외 status 의 카드 콘텐츠 회귀
  - i18n key drift (count 불일치 ko/en)
ON_FAIL_LOOP:
  - loop 1: primary button 의 sage solid 명시 + secondary 의 outline 명시
  - loop 2: 두 CTA 를 명시적 Button variant prop 으로 차별 (primary | secondary)
LOG: GATE_EXIT HF1_1 status_card=submitted_ok dual_cta_hierarchy=ok i18n_keys=9
COMMIT: fix(phase-5/wc.hf1.1): status 카드 콘텐츠 redesign (submitted) + dual CTA hierarchy
```

### HF1_2 — Status timeline visual lift (parallel, 0.25d, Sonnet)

```
ENTRY:
  - HF1_0 SHIPPED, parallel worktree spawned (g-b-10-hf1-2-timeline)
  - SPEC §"HF1.2" + HD9 read
EXIT (all required):
  - timeline component 의 3 variant style:
    * completed: 진한 검정 체크 (현재 OK 유지)
    * current: sage #71D083 dot + ring-2 ring-sage/25 + font-medium 텍스트
    * upcoming: 회색 dot + text-foreground/55 (이전 /40 보다 진하게)
  - connector line 3 variant:
    * completed↔completed: solid border-foreground/60
    * completed↔current: sage gradient half-fill (위쪽 sage, 아래쪽 muted)
    * current↔upcoming: border-border/40 (이전 /30 보다 진하게)
    * upcoming↔upcoming: border-border/30 그대로
  - sage accent 외 새 color 도입 0
  - pulse animation 도입 X (yagi-design-system v1.0 calm tone 보존)
  - accessibility: text-foreground/55 contrast WCAG AA 4.5:1 통과 verify (background bg-background 기준)
  - tsc + lint + build clean
FAIL on:
  - sage gradient half-fill 렌더 깨짐 (linear-gradient 또는 동등 token 사용)
  - upcoming text contrast WCAG AA 미달
  - pulse animation 우발적 도입
ON_FAIL_LOOP:
  - loop 1: gradient 를 Tailwind bg-gradient-to-b utility 로 표현
  - loop 2: gradient 를 SVG line 으로 fallback (구현 단순화)
LOG: GATE_EXIT HF1_2 current_dot_ring=ok connector_half_fill=ok contrast_aa=ok
COMMIT: fix(phase-5/wc.hf1.2): status timeline visual lift — current dot ring + connector half-fill
```

### HF1_3 — RecallButton 위치 정리 (parallel, 0.25d, Haiku/Sonnet)

```
ENTRY:
  - HF1_0 SHIPPED, parallel worktree spawned (g-b-10-hf1-3-recall-position)
  - SPEC §"HF1.3" + HD5 v2 read
EXIT (all required):
  - 기존 RecallButton import 위치 모두 제거 (우측 상단 + 우측 하단)
  - 새 위치 = status 카드 dual CTA 의 secondary 슬롯 (HF1_1 의 결과물에 위치)
  - grep 결과: RecallButton import 가 status-card.tsx 외 0 곳
  - tsc + lint + build clean
FAIL on:
  - RecallButton 이 2개 이상 위치에 동시 렌더
  - HF1_1 의 status 카드 안에 RecallButton 미장착 (cross-task miss)
ON_FAIL_LOOP:
  - loop 1: HF1_1 lead 와 status 카드 component spec 재확인 후 import 위치 수정
  - loop 2: RecallButton 의 alert dialog confirm flow 가 status card secondary CTA 에서 정상 동작 verify
LOG: GATE_EXIT HF1_3 recall_button_locations=1 import_count=1
COMMIT: fix(phase-5/wc.hf1.3): RecallButton 위치 정리 — status 카드 dual CTA 로 통합
```

### HF1_4 — 카드별 CTA 워딩 차별 (parallel, 0.25d, Haiku/Sonnet)

```
ENTRY:
  - HF1_0 SHIPPED, parallel worktree spawned (g-b-10-hf1-4-card-cta)
  - SPEC §"HF1.4" read
EXIT (all required):
  - 브리프 요약 카드 CTA = "브리프 전체 보기 →" / "View full brief →"
  - 첨부 자료 카드 CTA = "첨부 자료 확인하기 →" / "View attachments →"
  - 코멘트 카드 (placeholder) CTA = "코멘트 보기 →" / "View comments →"
  - 클릭 시 해당 tab 으로 navigate (브리프 → 브리프 tab, 첨부 → 보드 tab, 코멘트 → 코멘트 tab)
  - i18n keys 3개 × 2 locale (project_detail.summary_card.cta.*)
  - tsc + lint + build clean
FAIL on:
  - tab navigation routing 깨짐 (예: 첨부 → 보드 tab 못 감)
  - i18n key drift
ON_FAIL_LOOP:
  - loop 1: navigation handler 의 query param ?tab=board 명시
  - loop 2: tab routing 을 Next.js Link 컴포넌트로 단순화
LOG: GATE_EXIT HF1_4 cta_wording_diff=3 navigation=ok
COMMIT: fix(phase-5/wc.hf1.4): 카드별 CTA 워딩 차별 (브리프/첨부/코멘트)
```

### HF1_5 — Date format helper (parallel, 0.25d, Haiku/Sonnet)

```
ENTRY:
  - HF1_0 SHIPPED, parallel worktree spawned (g-b-10-hf1-5-date-format)
  - SPEC §"HF1.5" + HD6 read
EXIT (all required):
  - 새 utility: src/lib/date/formatKoreanDateTime.ts (또는 기존 date utils 위치 — Builder grep 후 결정)
  - signature: formatKoreanDateTime(date: Date | string, locale: 'ko' | 'en'): string
  - KO 출력: "2026년 5월 21일 오전 12:32"
  - EN 출력: "May 21, 2026 12:32 AM"
  - Edge case unit test:
    * 정오 = "오후 12:00" (KO), "12:00 PM" (EN)
    * 자정 = "오전 12:00" (KO), "12:00 AM" (EN)
  - 정보 카드 datetime 3 field 가 새 format 사용 (의뢰 일자 / 납기 / 미팅 희망)
  - 다른 datetime display surface 도 grep 후 통일 (단 commit history / log 같은 dev surface 제외)
  - tsc + lint + build clean
FAIL on:
  - 정오/자정 edge case 잘못 표현 (예: "오전 0:00")
  - timezone 다르게 표현 (Asia/Seoul 가정 깨짐)
  - 영문 locale 에 한국어 잔존
ON_FAIL_LOOP:
  - loop 1: Intl.DateTimeFormat({ hour12: true, hourCycle: 'h12' }) 패턴 사용
  - loop 2: date-fns/locale ko / en-US locale 객체로 fallback
LOG: GATE_EXIT HF1_5 utility_path=<path> tests_pass=N format_replaced_count=N
COMMIT: fix(phase-5/wc.hf1.5): date format helper — formatKoreanDateTime (오전/오후 통일)
```

### HF1_6 — 보드 tab 회귀 fix (parallel, 0.25–0.5d, **diagnosis-first**, Sonnet)

```
ENTRY:
  - HF1_0 SHIPPED, parallel worktree spawned (g-b-10-hf1-6-board-regression)
  - SPEC §"HF1.6" + yagi-lessons L-045 (diagnosis-first) read
DIAGNOSIS step (mandatory before fix):
  1. grep brief-board-shell-client import 위치 → src/app/[locale]/app/projects/[id]/_tabs/board.tsx 또는 동등 위치 확인
  2. 그 파일의 렌더 로직 read → placeholder vs 실제 컴포넌트 호출 어느 것
  3. 결과 → _run.log 에 가설 (A/B/C/D) 확정 + fix plan 1줄
EXIT (all required):
  - 보드 tab 클릭 → 기존 brief-board-shell-client 정상 mount (tldraw canvas 보임, drag/draw 동작)
  - AttachmentsSection (PDF / URL) 도 정상 렌더 (Wave A baseline 동작 그대로)
  - HD7 의 "보드 tab = scroll-to-top 예외" 정상 동작 (canvas viewport 보존)
  - Lock UI / status pill 등 brief-board-shell-client 내부 동작 영향 X
  - 회귀 원인 (A/B/C/D 중 어느 것) _run.log 에 명시
  - tsc + lint + build clean
FAIL on:
  - tldraw canvas 여전히 mount 안 됨
  - canvas dimension 0 (invisible)
  - HF1.0 의 scroll-to-top 이 보드 tab 까지 적용 (HD7 위반)
ON_FAIL_LOOP:
  - loop 1: 가설 (A) 라면 import 추가, (B) 라면 conditional 제거, (C) 라면 dimension explicit, (D) 라면 tab routing fix
  - loop 2: brief-board-shell-client 자체 read + 그 컴포넌트의 외부 의존성 (project_id prop, status prop 등) 검증
LOG: GATE_EXIT HF1_6 hypothesis=<A|B|C|D> fix_summary=<one-line>
COMMIT: fix(phase-5/wc.hf1.6): 보드 tab 회귀 fix — <hypothesis 결과 한줄>
```

---

## §3 — DISPATCH_PARALLEL (worktree spawn after HF1_0)

After HF1_0 SHIPPED, spawn 6 parallel worktrees:

```bash
# Phase branch base = current g-b-10-phase-5
PHASE_BASE=$(git -C C:/Users/yout4/yagi-studio/yagi-workshop branch --show-current)

# HF1_1 worktree (Sonnet, 0.5d, 가장 큼 — lead 권장)
git worktree add -b g-b-10-hf1-1-status-card ../yagi-workshop-hf1-1 $PHASE_BASE
cp .env.local ../yagi-workshop-hf1-1/.env.local
cd ../yagi-workshop-hf1-1 && pnpm install --frozen-lockfile

# HF1_2 (Sonnet, 0.25d)
git worktree add -b g-b-10-hf1-2-timeline ../yagi-workshop-hf1-2 $PHASE_BASE
cp .env.local ../yagi-workshop-hf1-2/.env.local
cd ../yagi-workshop-hf1-2 && pnpm install --frozen-lockfile

# HF1_3 (Haiku/Sonnet, 0.25d) — HF1_1 결과 의존, 늦게 시작 OK
git worktree add -b g-b-10-hf1-3-recall-position ../yagi-workshop-hf1-3 $PHASE_BASE
cp .env.local ../yagi-workshop-hf1-3/.env.local
cd ../yagi-workshop-hf1-3 && pnpm install --frozen-lockfile

# HF1_4 (Haiku/Sonnet, 0.25d)
git worktree add -b g-b-10-hf1-4-card-cta ../yagi-workshop-hf1-4 $PHASE_BASE
cp .env.local ../yagi-workshop-hf1-4/.env.local
cd ../yagi-workshop-hf1-4 && pnpm install --frozen-lockfile

# HF1_5 (Haiku/Sonnet, 0.25d)
git worktree add -b g-b-10-hf1-5-date-format ../yagi-workshop-hf1-5 $PHASE_BASE
cp .env.local ../yagi-workshop-hf1-5/.env.local
cd ../yagi-workshop-hf1-5 && pnpm install --frozen-lockfile

# HF1_6 (Sonnet, 0.25–0.5d, diagnosis-first)
git worktree add -b g-b-10-hf1-6-board-regression ../yagi-workshop-hf1-6 $PHASE_BASE
cp .env.local ../yagi-workshop-hf1-6/.env.local
cd ../yagi-workshop-hf1-6 && pnpm install --frozen-lockfile
```

**Cross-task dependency**:
- HF1_3 (RecallButton 위치) 는 HF1_1 (status 카드 dual CTA secondary 슬롯) 결과 의존 → HF1_1 commit 후 HF1_3 시작 권장
- 나머지 4개 (HF1_2, 4, 5, 6) 는 완전 독립

**Agent Teams 활성화 확인**:
```
.claude/settings.json → {"env":{"CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS":"1"}}
task_plan.md → parallel_group: hf1-parallel mandatory
```

**barrier 책임 = lead Builder**: 6개 worktree 모두 EXIT pass 후 ff-merge to phase branch:

```bash
cd C:/Users/yout4/yagi-studio/yagi-workshop
git fetch . g-b-10-hf1-1-status-card g-b-10-hf1-2-timeline g-b-10-hf1-3-recall-position \
            g-b-10-hf1-4-card-cta g-b-10-hf1-5-date-format g-b-10-hf1-6-board-regression
git merge --ff-only g-b-10-hf1-1-status-card
git merge --ff-only g-b-10-hf1-2-timeline
git merge --ff-only g-b-10-hf1-3-recall-position
git merge --ff-only g-b-10-hf1-4-card-cta
git merge --ff-only g-b-10-hf1-5-date-format
git merge --ff-only g-b-10-hf1-6-board-regression
git worktree remove ../yagi-workshop-hf1-{1,2,3,4,5,6}

# barrier verify
pnpm exec tsc --noEmit && pnpm lint && pnpm build
```

ff 가 아니어 conflict 발생 시 (HF1_1 ↔ HF1_3 status 카드 같은 file 동시 수정 가능): merge --no-ff with explicit message + manual resolve.

---

## §4 — HALT codes

| Code | Trigger | Recovery |
|---|---|---|
| `E0_ENTRY_FAIL` | §0 step non-zero exit | 야기 chat: missing file/branch/MCP |
| `E0_LOOP_EXHAUSTED` | HF1_0 fail loop 3 | 야기 review tab UX strategy |
| `E1_LOOP_EXHAUSTED` | HF1_1 fail loop 3 | 야기 review status 카드 콘텐츠 |
| `E2_LOOP_EXHAUSTED` | HF1_2 fail loop 3 | 야기 review timeline visual constraint |
| `E3_LOOP_EXHAUSTED` | HF1_3 fail loop 3 | 야기 review RecallButton placement |
| `E4_LOOP_EXHAUSTED` | HF1_4 fail loop 3 | 야기 review CTA wording |
| `E5_LOOP_EXHAUSTED` | HF1_5 fail loop 3 | 야기 review date format edge case |
| `E6_LOOP_EXHAUSTED` | HF1_6 fail loop 3 | 야기 review 보드 회귀 hypothesis (A/B/C/D 외 새 가설 필요) |
| `E_PARALLEL_FAIL` | DISPATCH_PARALLEL any teammate fail loop 3 | 야기 chat with sub_id |
| `E_BARRIER_FAIL` | ff-merge tsc/lint/build fail | 야기 chat with diff summary |

---

## §5 — Reporting

After SHIPPED gate (or HALT):

Final report file:
`.yagi-autobuild/phase-5-wc-hf1/_hf1_result.md`

Sections:
- Diffs summary (commits per gate + file count)
- Verify log summary (16 steps PASS/FAIL)
- HF1_6 진단 결과 (가설 A/B/C/D 중 어느 것)
- Open questions (있다면)
- Ready-to-merge: YES / NO

Then chat 야기 with:
- (a) commits made (hashes per gate)
- (b) verify summary (16 steps)
- (c) HF1_6 보드 회귀 진단 결과 1줄
- (d) GO / HALT recommendation for ff-merge to main (Wave C 전체 + hotfix-1 합쳐서 single ff-merge)

---

GO.
