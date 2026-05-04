# Phase 5 Wave C — Detail Page Redesign

Status: LOCKED v2, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-04)
Scope tier: WAVE (~8d wall-clock parallel HYBRID)
Baseline: main (Wave B closed at commit 29a4261; Wave B.5 별도 branch
g-b-10-phase-5 진행 중이지만 Wave C entry barrier 아님)

## Goal

PRODUCT-MASTER v1.1 §C.2 verbatim:

> v1.0 ProjectBoard = first view. v1.1 = secondary surface.
>
> 새 Detail page 구조 (Image 3 자각 후):
> - **default tab = "현황"** (의뢰자 first view)
>   - status timeline (5단계, 사용자 친화 워딩)
>   - 야기 팀 코멘트 thread
>   - 의뢰자가 *지금 할 수 있는 것* 명시 (status-별 next action CTA)
> - **secondary tabs**:
>   - 브리프 (Stage 1+2+3 요약, edit 가능)
>   - 보드 (기존 tldraw whiteboard)
>   - 코멘트 (Phase 5+ 본격)
>   - 결과물 (Phase 6+ 납품물)

현재 detail page (`src/app/[locale]/app/projects/[id]/page.tsx`) 는
Phase 4.x wizard 기반 — §C.2 paradigm 과 mismatch. Wave C 에서
전면 재설계. 진행 중 발견된 §C.3 / §C.4 mismatch 는 PRODUCT-MASTER
v1.2 amendment 로 정정 (별도 산출물).

## Decisions locked (야기 confirm 완료, chat 2026-05-04)

| # | 항목 | 결정 |
|---|---|---|
| D1 | Mobile | 제외 — desktop primary. Mobile = "안 망가지면 OK" 수준 responsive. |
| D2 | 첨부자료 thumbnail strip | 현황 tab 에 top 3 thumbnail (작은 사이즈, ~64px height, status timeline 강조 유지) |
| D3 | K-05 tier | **MED (Tier 2 medium)** — Brief 요약 카드 RLS read + transition_project_status RPC 호출 surface. status flip mutation 직접 안 하므로 HIGH 과함 |
| D4 | Codex routing | 자율 (default Tier 2 medium, 복잡도 보고 Tier 1 high upgrade) |
| D5 | Brief edit window | **A** — `status='draft'` 만 edit 가능 (= [브리프 완성하기 →] CTA), 이후 read-only. 수정 = comment thread (Phase 5+) 또는 RecallButton (Wave B.5 별도 layer). |
| D6 | Status wording | PRODUCT-MASTER §C.3 v1.2 표 (아래 §"Status wording" 섹션) |
| D7 | Next action CTA | PRODUCT-MASTER §C.4 v1.2 표 — delivered 의 3-CTA 우려 채택, 1 primary [시안 보기 →] 로 축소 후 그 안에서 분기 (Phase 6+) |
| D8 | i18n namespace | 분리 (아래 §"i18n namespace" 섹션) |
| D9 | Wave 분해 | HYBRID (아래 §"Wave 분해" 섹션) |
| D10 | Wave B.5 | Wave C entry barrier 아님. 진행 무관. |

## Scope: 5 tab 구조

| Tab | Wave C 상태 | 콘텐츠 |
|---|---|---|
| **현황** (default) | ✅ Full ship | status timeline + next action CTA + brief 요약 카드 + 첨부 요약 + 야기 코멘트 thread placeholder |
| **브리프** | ✅ Full ship | Stage 1/2/3 요약 view (read-only). `status='draft'` 시 상단 [브리프 완성하기 →] CTA → /projects/new flow 재진입 |
| **보드** | ✅ Wrap only | 기존 brief-board-shell-client 컴포넌트를 tab 안으로 이동만 |
| **코멘트** | 🚧 Placeholder | empty state. Phase 5+ comment thread 본격 시 채움 |
| **결과물** | 🚧 Placeholder | empty state. Phase 6+ 납품물 surface |

## 현황 tab 콘텐츠 (top → bottom)

### 1. Status timeline (vertical stepper)

- 9-state DB enum 중 active 7 state 만 표시 (cancelled/archived = dead-end banner 별도)
- Timeline 위치 (PRODUCT-MASTER §C.3 v1.2):
  - 1: draft (작성 중)
  - 2: submitted (의뢰 접수)
  - 3: in_review (검토 중)
  - 4: in_progress (작업 진행) — in_revision 은 4 sub-state
  - 5: delivered (시안 도착) ⭐
  - 6: approved (승인 완료, terminal)
- 현재 단계 sage `#71D083` accent + 완료 step checkmark + 미래 step muted
- Desktop: vertical stepper, 좌측 fixed-width column

### 2. Next action CTA (PRODUCT-MASTER §C.4 v1.2)

| Status | 의뢰자 next action | CTA 개수 | Wave C 구현 |
|---|---|---|---|
| `draft` | **[브리프 완성하기 →]** → /projects/new flow 재진입 | 1 primary | ✅ Full |
| `submitted` | passive helper "야기 팀 검토 시작 대기 중" | 0 | ✅ helper text only |
| `in_review` | passive + **[자료 추가하기]** (briefing_documents 만, kind='brief'/'reference') | 1 optional | ✅ Full (briefing_documents append) |
| `in_progress` | passive + [코멘트 작성] | 1 | 🚧 Wave C = placeholder/disabled (comment thread Phase 5+) |
| `in_revision` | passive + [수정 의견 코멘트] | 1 | 🚧 Wave C = placeholder/disabled (Phase 5+) |
| `delivered` ⭐ | **primary CTA [시안 보기 →]** — 그 안에서 [승인]/[수정 요청] 분기 | 1 primary | 🚧 Wave C = CTA 표시 + click → "준비 중" placeholder. 단 RPC 호출 컴포넌트 (recallProjectAction shape 의 approveDeliveredAction / requestRevisionAction) 는 data layer 만 준비 |
| `approved` | [프로젝트 평가하기] | 0 | 🚧 Wave C = disabled placeholder ("Phase 6+ 평가 surface 예정") |
| `cancelled` | banner only "이 의뢰는 취소되었어요" | 0 | ✅ banner |
| `archived` | banner only "이 의뢰는 보관 처리되었어요" | 0 | ✅ banner |

⚠️ `delivered → approved` / `delivered → in_revision` transition 은
Phase 3.0 truth table 에 client actor 로 이미 있음 — 본 SPEC 의 신규
matrix 변경 0. 단 RPC 호출 server action 2개 신규 작성 (data layer
only, UI 는 Phase 6+).

### 3. Brief 요약 카드

- Stage 1 (intent) 핵심 3-line preview:
  - Project name (heading)
  - Deliverable types (chips)
  - Description first 80 chars (truncate)
- "전체 브리프 보기 →" link → 브리프 tab

### 4. 첨부자료 요약

- 카운트 헤더: "기획서 N개 / 레퍼런스 M개" (briefing_documents.kind 별)
- Thumbnail strip top 3 (~64px height, 기획서 우선 → 레퍼런스 thumbnail 순)
- "전체 보기 →" link → 보드 tab

### 5. 야기 코멘트 thread (placeholder)

- Empty state: "야기 팀이 코멘트를 남기면 여기에 표시돼요"
- Phase 5+ comment thread 본격 시 채움

## 브리프 tab (read-only view)

### Layout
- Stage 1 (Intent) section: project name (heading), deliverable types (chips), description, mood keywords, channels, target audience, visual ratio, additional notes
- Stage 2 (Creative direction) section: budget band, delivery date, meeting preference, twin interest toggle (`interested_in_twin`)
- Stage 3 (Commit) section: 제출 시각, 제출자
- 모든 field read-only display (no input controls)

### Edit affordance (D5)
- `status === 'draft'` → 상단 banner: "아직 작성 중인 브리프예요" + primary CTA **[브리프 완성하기 →]** → /projects/new flow 재진입
- `status !== 'draft'` → CTA 없음. read-only

## 보드 tab

기존 brief-board-shell-client + AttachmentsSection 컴포넌트를 tab 안으로
wrap. 컴포넌트 자체 수정 X.

## 코멘트 / 결과물 tab (placeholder)

- 빈 state 컴포넌트: 아이콘 + "곧 만나볼 수 있어요" + 부 텍스트
- 디자인 tone = yagi-design-system v1.0 (sage accent, subtle border, zero shadow)

## Cancelled / Archived banner

Detail page 진입 시 status check → `cancelled` 또는 `archived` 면
페이지 전체 위에 banner 표시:
- `cancelled`: "이 의뢰는 취소되었어요. 새 의뢰를 작성하려면 [새 의뢰 시작]"
- `archived`: "이 의뢰는 보관 처리되었어요"

Banner 아래 5-tab 구조 그대로 표시 (read-only mode)

## Status wording (PRODUCT-MASTER §C.3 v1.2)

| DB enum | KO display | EN display | Timeline 위치 | 활성? |
|---|---|---|---|---|
| `draft` | 작성 중 | Drafting | 1 | ✓ |
| `submitted` | 의뢰 접수 | Submitted | 2 | ✓ |
| `in_review` | 검토 중 | In review | 3 | ✓ |
| `in_progress` | 작업 진행 | In production | 4 | ✓ |
| `in_revision` | 수정 진행 | In revision | 4 (sub-state) | ✓ |
| `delivered` ⭐ | 시안 도착 | Draft delivered | 5 | ✓ (재정의) |
| `approved` | 승인 완료 | Approved | 6 (terminal) | ✓ |
| `cancelled` | 취소됨 | Cancelled | banner | dead |
| `archived` | 보관됨 | Archived | banner | dead |

핵심 정의 (§C.3 v1.2):
- `delivered` = "시안 도착" (재정의) — 의뢰자가 시안 받고 검토 → 승인 또는 수정 요청 분기 단계. is_valid_transition matrix 의 `delivered → in_revision` / `delivered → approved` 둘 다 client transition 인 점이 paradigm 의 근거.
- `approved` = 진짜 의뢰자 최종 승인. 그 후 야기 팀 archived + 정산.

## i18n namespace (D8 — 분리)

```
projects.status.label.{enum}              ← 공통 (Step 1/2/3, /projects 목록, detail, 보드 모두 공유)
projects.status.helper.{enum}             ← timeline / detail 보조 텍스트
project_detail.status.timeline.{enum}     ← Wave C detail page 전용 (timeline visual)
project_detail.status.cta.{enum}          ← Wave C status별 next action button label
project_detail.status.banner.{enum}       ← cancelled / archived banner copy
project_detail.status.empty_state.{...}   ← 0 CTA 상태 (submitted) 의 helper
project_detail.tab.{tab_key}              ← tab label (status, brief, board, comments, deliverables)
```

이유: status label 은 어디서나 동일해야 하지만 CTA wording / banner
copy 는 surface 별로 달라질 수 있음. namespace 분리가 future-proof.

대표 keys (~30+ 총):
- `projects.status.label.draft` = 작성 중 / Drafting
- `projects.status.label.submitted` = 의뢰 접수 / Submitted
- ... (9 state)
- `project_detail.status.cta.draft` = 브리프 완성하기 → / Complete brief →
- `project_detail.status.cta.in_review` = 자료 추가하기 / Add materials
- `project_detail.status.cta.delivered` = 시안 보기 → / View draft →
- `project_detail.status.empty_state.submitted` = 야기 팀 검토 시작 대기 중 / Waiting for YAGI to start review
- `project_detail.status.banner.cancelled` = 이 의뢰는 취소되었어요 / This brief was cancelled
- `project_detail.tab.status` = 현황 / Status
- `project_detail.tab.brief` = 브리프 / Brief
- `project_detail.tab.board` = 보드 / Board
- `project_detail.tab.comments` = 코멘트 / Comments
- `project_detail.tab.deliverables` = 결과물 / Deliverables

## Wave 분해 (D9 — HYBRID)

| Phase | Sub | 작업 | Lead | Time |
|---|---|---|---|---|
| **1 (lead solo)** | **C.1** | Tab structure + routing (`?tab=` query param) + 현황 tab skeleton | Opus | 3d |
| **2 (parallel x 3)** | **C.2** | Status timeline 컴포넌트 + wording i18n (KO+EN, 9 state, 6 namespaces) | Sonnet | 1.5d |
| | **C.4** | 브리프 tab read-only view + [브리프 완성하기 →] CTA (status='draft' → /projects/new redirect) | Sonnet | 1.5d |
| | **C.5** | 보드 tab wrap (brief-board-shell-client 이동) + 코멘트/결과물 placeholder + cancelled/archived banner | Haiku or Sonnet | 0.5d |
| **3 (lead solo)** | **C.3** | Next action CTA 매트릭스 + Brief 요약 카드 + 첨부 요약 (top 3 thumbnail strip) + delivered/approved data-layer server actions (UI placeholder) | Opus | 2d |
| **4 (lead solo)** | **C.6** | Visual review (yagi-design-system v1.0) + K-05 LOOP 1 (MED Tier 2 medium) + Mobile responsive smoke (안 망가지는지만) | Opus | 1d |
| **Wall-clock 총합** | | | | **~8d** |

Phase 2 (parallel group) Agent Teams dispatch 패턴:
- Phase 4.x G3 패턴 그대로 — `task_plan.md` 의 `parallel_group` field 명시
- 각 worktree 별 `.env.local` 수동 copy (gitignored)
- C.5 가 가장 작아 (~0.5d) Haiku 도 OK
- 의존성: Phase 2 → Phase 3 (C.2 의 status timeline 컴포넌트가 C.3 의 status-별 CTA 매트릭스 lookup 으로 의존)

## Codex K-05 (D3 + D4)

- **Tier**: 2 medium (default).
- **Justification**:
  - Brief 요약 카드 = RLS read (workspace_member + creator-first ownership) — 권한 surface 존재
  - delivered/approved 의 transition_project_status RPC 호출 server action 2개 신규 — auth/RLS surface
  - status flip mutation 자체는 기존 RPC 가 처리 (Phase 5 Wave B.5 의 client recall matrix 와 동일 layer) → HIGH 부담 없음
  - UI redesign 위주
- **Routing**: Codex 가용 → Codex K-05 LOOP 1 (Tier 2 medium). 복잡도 보고 Tier 1 high upgrade 가능.
- **Scale-aware rule**: <100 user + all-trusted → MED-B/C 발견 = FU 등록. HIGH-A/B = inline fix.
- **Risk surface**:
  - Brief 요약 카드 RLS read 가 cross-workspace leak 없는지
  - delivered/approved 신규 server action 2개의 client authorization 이 creator-first matrix 에 정확히 hit 하는지
  - Tab routing (`?tab=` query param) 시 cross-workspace project ID 주입 attack 방어
  - cancelled/archived banner 우회 (URL 직접 접근 시 read-only 강제)
  - briefing_documents append (in_review 시 [자료 추가하기]) 의 RLS — `kind` filter 우회 못 하는지

## Verification

### Pre-apply (types + lint + build)
1. `pnpm exec tsc --noEmit` clean
2. `pnpm lint` clean
3. `pnpm build` clean

### UI render verify
4. 각 9-state status 별 detail page 진입 → status pill + timeline 정확
5. Tab 5개 모두 클릭 → 정상 렌더 (placeholder 2개 포함)
6. 현황 tab → status별 CTA 정확 표시 (placeholder 4개 + active 5개)
7. 브리프 tab → status='draft' 시 [브리프 완성하기 →] 표시, 나머지 read-only
8. 보드 tab → 기존 tldraw whiteboard 정상 렌더
9. cancelled/archived → banner 표시 + 모든 tab read-only mode

### RPC + server action verify
10. `delivered` 상태 → [시안 보기 →] click → "준비 중" placeholder. 단 brower devtools 에서 approveDeliveredAction RPC 직접 호출 → status='approved' 정상 transition
11. `delivered` 상태 → requestRevisionAction (devtools 호출) → comment 10자 미만 reject, 충족 시 status='in_revision' 정상
12. `in_review` → [자료 추가하기] click → briefing_documents append form → RLS 통과, kind='brief' or 'reference' insert 정상

### Authorization verify
13. 다른 workspace 의 의뢰자 계정 → URL 직접 진입 → 403 또는 not_found
14. yagi_admin 계정 → detail page 진입 → 모든 정보 read 가능

### K-05 LOOP 1
15. Builder 가 `_codex_review_prompt.md` 작성 — adversarial framing
16. Codex CLI 실행 (Tier 2 medium 시작, Tier 1 high upgrade 가능)
17. Findings → `_codex_review_loop1.md`
    0 / LOW / MED-A finding = PASS
    MED-B/C = FU 등록 + 진행
    HIGH = HALT

### Visual review (yagi-design-system v1.0)
18. Sage accent (#71D083) only — 다른 color 도입 금지
19. Typography: Korean Pretendard Variable lh 1.15–1.22 ls -0.01em
20. Border subtle rgba(255,255,255,0.11), radius 24/999/12, zero shadow
21. Mobile responsive smoke (Chrome devtools 360px ~ 1920px) — 안 망가지는지만 확인 (정밀화는 FU)

## Out-of-scope (FU 등록 후보)

- **FU-Phase5-10** — 코멘트 thread 본격 구현 (현황 tab + 코멘트 tab). Phase 5+ 별도 wave
- **FU-Phase5-11** — 결과물 download surface 본격 구현. Phase 6+
- **FU-Phase5-12** — Mobile responsive 정밀화 (Wave C 는 망가지지만 않으면 OK)
- **FU-Phase5-13** — Brief edit affordance 확장 (D5 옵션 B/C 변경 시)
- **FU-Phase5-14** — `routing` status 도입 시 timeline + CTA 매트릭스 추가 (Phase 6 inbound track)
- **FU-Phase5-15** — delivered/approved CTA 의 실제 UI surface (시안 보기 페이지, 평가 surface). Phase 6+

## Migration apply policy

DB schema 변경 0 (전부 UI/뷰 layer). Migration 파일 없음.
RPC 호출은 기존 `transition_project_status` 재사용 (delivered →
approved / delivered → in_revision matrix 이미 Phase 3.0 에 있음).

## Commit plan (PowerShell, one command at a time)

Sub-task 별 commit:

```powershell
# C.1
git add src/app/[locale]/app/projects/[id]/
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wc.1): detail page 5-tab structure + 현황 tab skeleton

# C.2 (parallel group)
git add src/components/project-detail/status-timeline.tsx messages/
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wc.2): status timeline + 9-state wording i18n (6 namespaces)

# ... C.3 ~ C.6 동일 패턴
```

## Sign-off

야기 SPEC v2 lock → KICKOFF dispatch → Phase 1 (C.1 lead solo) →
Phase 2 (C.2/C.4/C.5 parallel x 3) → Phase 3 (C.3 lead solo) →
Phase 4 (C.6 lead solo) → Verify 1–21 + K-05 LOOP 1 → 결과 chat 보고 →
야기 ff-merge GO.
