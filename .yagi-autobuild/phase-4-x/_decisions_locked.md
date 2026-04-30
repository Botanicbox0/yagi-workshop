# Phase 4.x — Sub-decisions LOCKED (2026-05-01)

KICKOFF.md "Open sub-decisions" 섹션의 4 항목 야기 confirm 결과. Wave A 시작 전 lock down.

---

## §1. task_03 — Twin intent UI 형태

**LOCKED = A (3-radio)**

- `specific_in_mind` / `undecided` (default) / `no_twin`
- DB enum 6값 중 3값 매핑 (specific_in_mind / undecided / no_twin)
- Tooltip ⓘ 으로 Digital Twin 설명
- KICKOFF §task_03 spec 그대로 유지

## §2. task_06 — Active workspace resolve 방식

**LOCKED = B (cookie-based)**

- Cookie 키 = `yagi_active_workspace` (uuid value)
- Server component 가 매번 cookie + workspace_members 검증
- Cookie tampering 시 즉시 fallback (first member workspace 또는 onboarding redirect)
- URL prefix `/app/w/[workspaceId]/*` 패턴은 Phase 5 또는 6 에서 도입 (현 시점 layout 변경 최소화)
- KICKOFF §task_06 spec 그대로 유지

## §3. task_06 — "+ 새 workspace 추가" 동작

**LOCKED = B (Disabled placeholder "Phase 5 부터 가능")**

- Dropdown 의 "+ 추가" 항목 = disabled state + tooltip "Phase 5 부터 가능"
- i18n 키 `workspace.switcher.add_new.disabled` = "Phase 5 부터 가능"
- Workspace 생성 surface (별도 form 또는 modal) = Phase 5 작업
- KICKOFF §task_06 spec 그대로 유지

## §4. task_05 — /app dashboard 처리 ⚠️ 권장과 다름

**LOCKED = B (/app/dashboard 별도 page)**

KICKOFF §task_05 spec 에 다음 amendment 추가:

### Amendment to task_05 — Dashboard page 추가

#### Surface 추가
- **Route NEW**: `/app/dashboard` (Brand workspace 의 default landing)
- **Default landing 변경**: `/app` → `/app/dashboard` redirect (이전엔 `/app/projects` empty state 가 첫 화면)
- **Sidebar WORK 섹션 첫 항목**: "대시보드" 추가 (프로젝트 위에 위치)

#### Dashboard layout (1280 max-width, no hero 1:1)

```
┌──────────────────────────────────────────────────────┐
│ ← Back  •  대시보드                                   │
├──────────────────────────────────────────────────────┤
│ ┌─────────┐  ┌─────────┐  ┌─────────┐               │
│ │ 총 프로젝트│  │ 진행 중   │  │ 납품 완료 │               │
│ │   12    │  │    3    │  │    5    │               │
│ └─────────┘  └─────────┘  └─────────┘               │
│                                                       │
│ 최근 RFP                          [+ 새 프로젝트] →   │
│ ────────────────────────────────────────────────────  │
│ 1:1 카드 row × 5 (created_at DESC)                  │
│ ┌──────────────────────────────────────────────────┐ │
│ │ 프로젝트명 / 한 줄 설명         status pill   →   │ │
│ │ 의뢰 일자 · 예산 · Twin intent                    │ │
│ └──────────────────────────────────────────────────┘ │
│ ... (4 more)                                          │
│                                                       │
│ [모든 프로젝트 보기 →]                                │
└──────────────────────────────────────────────────────┘
```

#### 구성 요소
- **카운트 카드 3개** (top, equal width):
  - 총 프로젝트 (workspace 의 모든 projects count)
  - 진행 중 (status='in_review' OR 'routing' OR 'in_progress' OR 'approval_pending')
  - 납품 완료 (status='delivered')
- **최근 RFP 5개**:
  - SELECT FROM projects WHERE workspace_id = active ORDER BY created_at DESC LIMIT 5
  - 각 row card: 프로젝트명, 한 줄 설명, status pill (sage), 의뢰 일자, 예산 (KO label), Twin intent (KO label)
  - row 클릭 → `/app/projects/[id]` navigation
- **CTA**: "+ 새 프로젝트" (→ `/app/projects/new`) 우상단
- **Bottom link**: "모든 프로젝트 보기" (→ `/app/projects`)
- **Empty state** (프로젝트 0개): "아직 의뢰가 없어요" + 큰 "+ 새 프로젝트 시작" CTA

#### Files in scope (task_05 추가)

기존 task_05 files 에 추가:
- `src/app/[locale]/app/dashboard/page.tsx` (NEW)
- `src/app/[locale]/app/dashboard/loading.tsx` (NEW — skeleton)
- `src/components/dashboard/count-cards.tsx` (NEW)
- `src/components/dashboard/recent-rfps.tsx` (NEW)
- `src/components/dashboard/rfp-row-card.tsx` (NEW)
- `src/app/[locale]/app/page.tsx` (redirect → /app/dashboard)
- `messages/ko.json` + `messages/en.json` (dashboard 라벨)

#### i18n 키 (추가)

```
dashboard.title: "대시보드"
dashboard.title.en: "Dashboard"
dashboard.count.total: "총 프로젝트"
dashboard.count.total.en: "Total Projects"
dashboard.count.in_progress: "진행 중"
dashboard.count.in_progress.en: "In Progress"
dashboard.count.delivered: "납품 완료"
dashboard.count.delivered.en: "Delivered"
dashboard.recent_rfps.title: "최근 RFP"
dashboard.recent_rfps.title.en: "Recent RFPs"
dashboard.recent_rfps.empty: "아직 의뢰가 없어요"
dashboard.recent_rfps.empty.en: "No RFPs yet"
dashboard.recent_rfps.empty_cta: "+ 새 프로젝트 시작"
dashboard.recent_rfps.empty_cta.en: "+ Start a new project"
dashboard.cta_new: "+ 새 프로젝트"
dashboard.cta_new.en: "+ New Project"
dashboard.view_all: "모든 프로젝트 보기"
dashboard.view_all.en: "View all projects"
```

#### Self-review focus (추가)

- Dashboard 의 카운트 + RFP 데이터 SELECT scope = active workspace 만 (workspace_members RLS verify)
- Empty state 가 정보 leak 안 함 (다른 workspace 의 프로젝트 카운트 노출 X)
- Count 쿼리 cache strategy — Phase 4 에서는 SSR 그대로 (dynamic page); Phase 6+ 에서 ISR/revalidate 검토

#### Acceptance (추가)

- `/app/dashboard` route 정상 (Brand workspace 첫 진입)
- `/app` → `/app/dashboard` redirect 정확
- Count cards 3개 정확 (DB count 쿼리 verify)
- 최근 RFP 5개 정확 (created_at DESC 순서)
- Row 클릭 → detail page navigation
- Empty state (프로젝트 0개 testing) 정상
- "+ 새 프로젝트" CTA → /app/projects/new
- "모든 프로젝트 보기" → /app/projects
- /ko + /en parity
- Sidebar 의 "대시보드" 항목 active highlight (자기 페이지에서)
- Mobile 390px: count cards vertical stack, RFP row card 정상 fit

---

## Changelog

- **2026-05-01** — 야기 confirm 후 4 sub-decisions lock. §1-§3 권장 그대로, §4 만 옵션 B (대시보드 별도 페이지) 채택 → task_05 spec amendment 명시.
