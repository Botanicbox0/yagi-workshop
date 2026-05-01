# Phase 4.x — Wave C.5a Prompt (Client review 7 issues + i18n drift fix)

> 야기가 client 계정으로 시각 review 후 발견한 7 issue + 1 i18n drift verify.
> Wave D 진입 전 처리. lead Builder 직접 작업 (no spawn).
> 끝나면 STOP — 야기가 Artist 계정으로 추가 review 후 Wave C.5b 또는 Wave D 진입 결정.

---

## ⬇⬇⬇ COPY FROM HERE ⬇⬇⬇

**WAVE C.5a — Client review fix (7 issues + 1 verify). lead Builder 직접 작업 (no spawn). 끝나면 STOP.**

야기가 `pnpm dev` 로 client 계정 시각 review 한 결과 7 issue + 1 i18n drift 발견. ff-merge 전 처리. Artist 계정 review 는 야기가 manual 진행 → 추가 issue 있으면 Wave C.5b 로 별도 prompt.

## 우선 read

1. `.yagi-autobuild\phase-4-x\KICKOFF.md`
2. `.yagi-autobuild\phase-4-x\_decisions_locked.md`
3. `.yagi-autobuild\phase-4-x\_autopilot_summary.md` (현 상태)
4. `C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`
5. `C:\Users\yout4\.claude\skills\yagi-design-system\references\tokens.json`

## 작업 sequence (8 sub-task sequential)

각 sub-task 끝마다 commit. tsc 빠른 verify 권장 (build 는 끝에 한 번).

---

### sub_01 — i18n drift verify + fix (⚠️ priority 1)

야기 발견: `projects.wizard.step3.errors.submit` 또는 유사 키가 결정 안 되어 있을 가능성. Wave A task_02 작업의 후속 verify.

#### 작업
1. `messages/ko.json` + `messages/en.json` 에서 `wizard.step3.errors.*` 또는 `projects.wizard.step3.errors.*` 키 존재 확인
2. `src/app/[locale]/app/projects/new/` 안의 코드에서 해당 키 사용 위치 grep:
   ```
   grep -rn "errors\.submit\|errors\.unauthenticated\|errors\.submit_validation\|errors\.submit_failed" src/app/\[locale\]/app/projects/new/
   ```
3. 코드에서 사용 중인데 i18n 미정의면 → 추가
4. 야기 manual reproduction (submit 시도) 시 fallback 키 노출 여부 — 코드 레벨에서 missing key 가 있으면 fix
5. KICKOFF.md task_02 spec + result_02.md 의 i18n key list 와 cross-check

#### 산출물
- 수정 i18n key list `_wave_c5a_sub01_i18n_audit.md` (없으면 생성, "all keys present, no drift" 명시 가능)

#### Commit
`fix(phase-4-x): wave-c5a sub_01 — wizard step3 errors i18n drift verify + fix (if any)`

---

### sub_02 — Sidebar 하단 user block 정리 (HIGH — DB ID 노출 차단)

#### 현상
- Sidebar 하단에 `@c_5c2db541` 형태 노출됨 (`profiles.handle` 자동 생성된 internal ID 추정)
- 사용자에게 의미 없는 raw DB ID. **Privacy / UX HIGH severity.**

#### 작업
1. Sidebar 하단 user block 컴포넌트 식별: `src/components/app/sidebar.tsx` 또는 `src/components/app/sidebar-user.tsx` 부근
2. 현재 표시: `이름` + `@<handle>` + `역할`
3. **변경 후**: `이름` + `역할` (Client / Artist / YAGI Admin) — handle 표시 제거
4. handle 자체는 DB 에서 그대로 유지 (이후 Phase 에서 @username 으로 재설계 가능). UI 노출만 차단.
5. 표시 이름이 비어있는 사용자 fallback: 이메일의 local part (`yagi@yagiworkshop.xyz` → `yagi`) 사용. 단 이메일 자체 노출 X.
6. 디자인 시스템 v1.0 token 그대로 (ink.primary 이름, ink.tertiary 역할)

#### Acceptance
- /ko/app/dashboard 접속 → sidebar 하단에 `c_xxx` 형태 노출 0
- 표시 이름 + 역할만 정확히 표시
- /en parity

#### Commit
`fix(phase-4-x): wave-c5a sub_02 — sidebar user block hides DB handle (privacy)`

---

### sub_03 — Sidebar "공개 사이트로 나가기" 버튼 제거 (LOW UX)

#### 현상
- Sidebar 하단에 "공개 사이트로 나가기" 버튼 존재 — 사용자/워크스페이스 영역에서 외부 이동 CTA 는 어색
- 클릭 시 랜딩 페이지로 이동 → 사용자 기대 행동(계정/설정)과 mismatch

#### 작업
1. 해당 버튼 위치 식별 (sidebar 컴포넌트 내부)
2. 완전 제거 (주석 처리 X — 직접 삭제)
3. i18n 키 (`sidebar.public_site_link` 또는 유사) — 다른 곳 사용 안 하면 함께 제거. 사용 중이면 키만 유지하고 sidebar 에서만 제거.
4. 향후 "내 공개 페이지" 기능 복원 시 별도 CTA 로 재도입 가능 — 코멘트 또는 `_followups.md` 에 기록

#### Acceptance
- Sidebar 하단에 "공개 사이트로 나가기" 또는 영문 동등 버튼 없음
- /ko + /en

#### Commit
`fix(phase-4-x): wave-c5a sub_03 — remove "go to public site" CTA from sidebar`

---

### sub_04 — Settings 핸들 필드 제거 + 탭 워딩 정리 (HIGH + MEDIUM)

#### 현상
- Settings 페이지의 "핸들" 필드가 `c_5c2db541` 형태 노출 + 수정 가능한 input 처럼 보임 (사용자 혼란)
- 탭 이름: 프로필 / 워크샵 / 팀 — "워크샵"은 실제 기능과 mismatch
- 일부 워딩이 내부/개발 표현 잔재

#### 작업

**1) 핸들 필드 제거**
- Settings 의 profile tab 에서 핸들 필드 (input / display) 완전 제거
- 표시 이름 / 소개 / 외부 링크 (또는 현 단계의 의미 있는 필드들) 만 남김
- 향후 `@username` 기능 도입 시 별도 surface — 코멘트 또는 `_followups.md` 기록

**2) 탭 이름 변경**
- 프로필 → **내 정보**
- 워크샵 → **워크스페이스**
- 팀 → 팀 (그대로)
- 최종 탭 구조: `내 정보 / 워크스페이스 / 팀`
- 탭 내부 워딩에서 "워크샵" 표현 모두 "워크스페이스" 로 통일 (UI 전체 grep)

**3) 저장 버튼 통일**
- 각 탭의 저장 버튼: "변경사항 저장" 으로 통일
- "프로필 저장", "워크샵 저장" 등 탭별 묶인 표현 모두 폐기
- i18n 키: `settings.actions.save_changes` (공통) 사용 또는 신규

**4) 각 탭 의미 분리**
- **내 정보** = 개인 사용자 항목 (이름, 소개, 링크 등)
- **워크스페이스** = 조직/브랜드/회사 항목 (workspace 이름, kind 같은 것은 readonly 표시)
- **팀** = 멤버 초대/권한

**5) i18n grep**
- `messages/ko.json` + `en.json` 에서 "워크샵" 표현 전부 → "워크스페이스" replace
- 코드 안 string literal 에서 "워크샵" → "워크스페이스" replace
- `settings.tabs.profile` → `settings.tabs.my_info` (key 자체는 유지하되 string value 만 변경 권장 — refactor 비용 ↓)
- 만약 `settings.tabs.workshop` 같은 key 면 → `settings.tabs.workspace` 로 rename + 사용처 모두 update

#### Acceptance
- /ko/app/settings 접속 → 탭: `내 정보 / 워크스페이스 / 팀`
- 핸들 input/display 없음
- 모든 탭의 저장 버튼: "변경사항 저장" (KO) / "Save changes" (EN)
- "워크샵" 표현 UI 어디에도 안 보임
- /en parity (My info / Workspace / Team)

#### Commit (1개 또는 분할)
- 1개 권장: `fix(phase-4-x): wave-c5a sub_04 — settings handle removal + tabs renamed (워크샵→워크스페이스) + save button unified`

---

### sub_05 — Dashboard 톤 통일: "RFP/의뢰/프로젝트" → "프로젝트" (LOW copy)

#### 현상
- /app/dashboard 에서 "최근 RFP" + "아직 의뢰가 없어요" + "+ 새 프로젝트 시작" 혼재
- "RFP" = 기업 용어, "의뢰" = 한국식 서비스, "프로젝트" = 제품 — 톤 3개 → 브랜드 약화
- 야기 결정: **"프로젝트" 중심 통일**

#### 작업

**i18n 변경 (ko + en 모두)**
| 위치 | 기존 | 변경 |
|---|---|---|
| 섹션 제목 | "최근 RFP" | "최근 프로젝트" |
| empty 헤드라인 | "아직 의뢰가 없어요" | "아직 시작된 프로젝트가 없습니다" |
| empty 서브카피 (NEW) | (없음) | "새로운 작업을 시작해보세요" |
| empty CTA | "+ 새 프로젝트 시작" | "+ 새 프로젝트 시작" (그대로) |
| Bottom link | "모든 프로젝트 보기" | "모든 프로젝트 보기" (그대로) |
| "+ 새 프로젝트" CTA (top right) | "+ 새 프로젝트" | "+ 새 프로젝트" (그대로) |

EN 매핑 권장:
- "Recent Projects"
- "No projects yet"
- "Start your first project"
- "+ Start a new project" (그대로)

**namespace**: `dashboard_v4.recent_rfps.*` → `dashboard_v4.recent_projects.*` 로 rename 권장 (key 의미 일치). 사용처 모두 update.

**empty state layout 보강**:
- 헤드라인 + 서브카피 + CTA 3-stack vertical
- spacing 명확 (헤드라인 ↔ 서브카피 8px gap, 서브카피 ↔ CTA 24px gap)
- 헤드라인: 22px semibold ink.primary, 서브카피: 14px regular ink.secondary, CTA: 기존 button style 유지

#### Acceptance
- /ko/app/dashboard 에 "RFP" 표현 0, "의뢰" 표현 0
- empty 상태 — 헤드라인 + 서브카피 + CTA 3-stack
- /en parity

#### Commit
`fix(phase-4-x): wave-c5a sub_05 — dashboard tone unified to "프로젝트" + empty state copy improved`

---

### sub_06 — `/app/projects` 카드 UI 재설계 (MEDIUM UX)

#### 현상 (스크린샷 1번 = /ko/app/projects)
- 카드 정보 위계 불명확 — 이름 / 상태 / 날짜 위치 임의
- 상태(검토 중 / 초안)가 제목과 분리되어 스캔 어려움
- 날짜 위치 애매

#### 야기 spec 그대로
1. **카드 상단 좌측**: 프로젝트 이름 (가장 크게, bold)
2. **카드 상단 우측**: 상태 뱃지 (pill)
3. **카드 하단 우측**: 날짜 (작게, secondary text)
4. **카드 내부 정렬**: 좌측 정렬 통일, vertical spacing 명확 (title → status → meta 흐름)
5. **상태 뱃지**: 배경 있는 pill, 상태별 색상 구분 (초안 = neutral / 검토 중 = 강조)

#### 디자인 시스템 v1.0 token 매핑

**카드 컨테이너**:
- bg: `bg.card-deep` rgba(255,255,255,0.05)
- border: `border.subtle` rgba(255,255,255,0.11) 1px
- radius: 24px
- padding: 24px
- zero shadow
- hover: `bg.card` rgba(255,255,255,0.10) (subtle lift, opacity 변화만)

**Layout (Flexbox)**:
```
┌────────────────────────────────────────┐
│  ┌──────────────┐         ┌──────────┐ │
│  │ 프로젝트 이름  │         │ [상태]    │ │
│  │ 22px sb       │         │ pill     │ │
│  │ ink.primary   │         │          │ │
│  └──────────────┘         └──────────┘ │
│                                        │
│  (vertical spacer 24px)                │
│                                        │
│                            ┌──────────┐ │
│                            │  4월 30일  │ │
│                            │  12px    │ │
│                            │  ink.tertiary
│                            └──────────┘ │
└────────────────────────────────────────┘
```

**Typography**:
- 이름: 22px / weight 600 / lh 1.20 / ls -0.02em / ink.primary
- 상태 pill: 12px / weight 500 / Pretendard Variable (또는 Mona12 if available) / radius 999 / padding 4px 10px
- 날짜: 12px / weight 400 / ink.tertiary / lh 1.0

**상태 pill 색상 매핑** (5단계 status timeline 과 일치):
| Status | KO label | bg | ink |
|---|---|---|---|
| draft / 초안 | 초안 | `bg.card-deep` | `ink.tertiary` |
| in_review / 검토 중 | 검토 중 | `accent.sage-soft` rgba(113,208,131,0.12) | `accent.sage` #71D083 |
| routing / 라우팅 | 라우팅 | `bg.card-deep` | `ink.secondary` |
| in_progress / 진행 | 진행 | `bg.card-deep` | `ink.primary` |
| approval_pending / 시안 | 시안 | `bg.card-deep` | `ink.secondary` |
| delivered / 납품 | 납품 | `bg.card-deep` | `ink.primary` |

핵심 규칙: **검토 중만 sage 강조 (사용자 액션 대기 / 야기 팀 응답 진행 중 indicator)**, 나머지는 무채색. 디자인 시스템 v1.0 의 sage 사용 규칙 (현재 진행 중인 핵심 상태만 강조) 준수.

**Grid**:
- 카드 width: 1280 max-width container 안에서 grid (responsive)
- desktop (≥1024px): 2 column, gap 24px
- tablet (768-1023): 2 column, gap 16px
- mobile (<768px): 1 column, gap 16px

**Click**: 카드 전체 click → `/app/projects/[id]` navigation

#### Dashboard 와 grammar 차별
야기 우려: dashboard 의 "최근 프로젝트" 와 projects list 카드가 거의 동일하게 보이면 정보 위계 안 드러남.

**차별 규칙**:
- **Dashboard 의 "최근 프로젝트"** (RfpRowCard) = **horizontal row card** (이름·상태·날짜 한 줄로 좌→우 흐름) — 빠른 scan, 최근 5개
- **`/app/projects` 카드** = **vertical card** (이름 위 / 날짜 아래 split) — 선택용 surface, 정보 비중 ↑

이 차별이 자연스럽게 *역할 차이* (요약 vs 선택) 를 표현. dashboard 의 RfpRowCard 는 이번 sub_06 에서 *수정 X* — 그 차이가 의도된 거. 만약 dashboard 도 vertical 이면 변경 (lead Builder 가 현 상태 확인 후 결정).

#### Files in scope
- `/app/[locale]/app/projects/page.tsx` 또는 카드 렌더 위치
- 새 컴포넌트: `src/components/projects/project-list-card.tsx` (NEW)
- 또는 기존 카드 컴포넌트 재설계

#### Acceptance
- /ko/app/projects 카드 — 이름(상단좌) + 상태 pill(상단우) + 날짜(하단우) 정확
- 좌측 정렬 통일, vertical spacing (24px) 명확
- 상태 pill 색상 — 검토 중만 sage, 나머지 무채색
- Grid responsive (desktop 2col / tablet 2col / mobile 1col)
- /app/dashboard 의 "최근 프로젝트" 카드 grammar 와 *명백히 다름* (horizontal vs vertical)
- /en parity

#### Commit
`fix(phase-4-x): wave-c5a sub_06 — projects list card UI redesign (vertical, status pill priority)`

---

### sub_07 — `/app/meetings` empty state 개선 (LOW UX)

#### 현상
- 단순 정보 전달: "예정된 미팅이 없습니다"
- CTA "새 미팅" → 기능 버튼처럼 보여 행동 유도 약함

#### 야기 spec 그대로
1. **헤드라인**: "아직 예정된 미팅이 없습니다"
2. **서브카피**: "YAGI 팀과 30분 미팅으로 프로젝트 방향을 정리할 수 있어요."
3. **CTA**: "새 미팅" → **"미팅 예약하기"** 변경
4. **Layout**: 중앙 empty state — 아이콘 (선택) + 헤드라인 + 설명 + CTA 4-stack

#### 디자인 시스템 v1.0 매핑
- 컨테이너: 1280 max-width 안 중앙 정렬, vertical
- 아이콘 (선택): `lucide-react` 의 `Calendar` 또는 `Video` (32px, ink.tertiary)
- 헤드라인: 22-30px / weight 600 / ink.primary / lh 1.20 / ls -0.01em
- 서브카피: 16px / weight 400 / ink.secondary / lh 1.37 / max-width 480px (가독성)
- CTA: primary button (bg ink.primary, ink inverse.ink, radius 12, padding 12px 24px)
- Stack vertical, 각 요소 사이 24px gap (헤드라인↔서브카피는 8px)

#### i18n 변경 (ko + en)
| 키 | KO | EN |
|---|---|---|
| `meetings.empty.headline` | "아직 예정된 미팅이 없습니다" | "No upcoming meetings yet" |
| `meetings.empty.subtitle` | "YAGI 팀과 30분 미팅으로 프로젝트 방향을 정리할 수 있어요." | "Schedule a 30-min meeting with the YAGI team to align on direction." |
| `meetings.empty.cta` | "미팅 예약하기" | "Book a meeting" |

기존 "새 미팅" 버튼은 페이지 상단 우측 (액션 버튼) 에는 그대로 유지 — empty state 의 CTA 만 "미팅 예약하기" 로 다른 키 사용 (의도가 다름).

#### Acceptance
- /ko/app/meetings 에 미팅 0개 상태 진입 → 아이콘 + 헤드라인 + 서브카피 + CTA 4-stack 정확
- 중앙 정렬, 명확한 spacing
- /en parity

#### Commit
`fix(phase-4-x): wave-c5a sub_07 — meetings empty state onboarding-styled (icon + headline + subtitle + CTA)`

---

### sub_08 — Wave C.5a 통합 verify

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

3개 모두 exit 0 (lint 는 baseline 유지) 확인.

`_wave_c5a_result.md` 작성:
- 8 sub-task 결과 요약 (commit SHA, files changed, acceptance pass/fail)
- i18n drift sub_01 결과 (drift 있었나, 없었나)
- 디자인 시스템 v1.0 token 적용 검증
- /ko + /en parity 확인
- Visual review 권장 사항 (야기에게):
  - /ko/app/dashboard 의 톤 통일 + empty state
  - /ko/app/projects 의 카드 UI 재설계
  - /ko/app/meetings 의 empty state
  - /ko/app/settings 의 탭 (내 정보/워크스페이스/팀) + 핸들 제거
  - sidebar 의 user block (DB ID 0) + 공개 사이트 버튼 (제거)

`_run.log` 기록:
```
<ISO> phase-4-x WAVE_C5A SHIPPED sub_tasks=8 sha=<latest> tsc=ok lint=baseline build=ok
```

---

### STOP — Wave C.5b 또는 Wave D 결정 대기

Wave C.5a SHIPPED 후 즉시 STOP. Wave D 진입 X. Wave C.5b spec 기다림.

야기는:
1. `pnpm dev` 로 client 계정 재진입 → 7 issue fix 시각 확인
2. **Artist 계정으로 로그인** → 시각 review (페이지별, 정보 위계, DB ID 노출, 톤, 워딩)
3. 추가 issue 발견 시 chat 보고 → Wave C.5b prompt 받음
4. 추가 issue 없으면 → Wave D prompt 받음

`_run.log`:
```
<ISO> phase-4-x WAVE_C5A_END_BEFORE_ARTIST_REVIEW sha=<latest> awaiting_yagi_artist_review=true
```

---

## 사고 처리

각 sub-task 안에서 발견된 issue:
- **MINOR** (string literal 누락, type cast 추가) → 진행 + `_hold/issues_c5a.md` 기록
- **MAJOR** (tsc fail, build fail, design system token 위반, 추가 DB ID 노출 발견) → STOP, 그 sub-task `_wave_c5a_halt.md` 작성, 야기 chat 보고

판단 기준:
- tsc 또는 build exit ≠ 0 → MAJOR
- DB ID 새로 발견 (다른 surface 에 또 노출) → MAJOR + 즉시 보고 (이번 fix 와 같이 처리할지 결정)
- 디자인 spec drift (ink.tertiary 가 ink.primary 로 잘못 매핑 등) → MAJOR

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X
- main 에 ff-merge 절대 X. g-b-9-phase-4 에만 commit
- spawn 사용 X — lead Builder 직접
- 디자인 시스템 v1.0 token 그대로 (sage #71D083 단일 액센트, 무채색, no shadow, radius 24/999/12)
- BLOCKER 1 룰 (created_by — owner_id 아님) 일관 유지
- L-001 PowerShell `&&` 금지

## Output expectations

`.yagi-autobuild\phase-4-x\` 안에:
- `_wave_c5a_sub01_i18n_audit.md`
- `_wave_c5a_result.md` (8 sub-task 통합)
- `_run.log` 추가 라인
- `_hold/issues_c5a.md` (MINOR 발생 시)

## 시작

sub_01 부터 즉시. STOP point = sub_08 이후. 의문점 발생 시 즉시 chat 보고.

## ⬆⬆⬆ COPY UP TO HERE ⬆⬆⬆
