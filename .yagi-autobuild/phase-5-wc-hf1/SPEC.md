# Phase 5 Wave C — Hotfix-1 (Detail page UI polish)

Status: DRAFT v1, awaiting 야기 review.
Author: 야기 + Web Claude (chat 2026-05-04)
Scope tier: HOTFIX (~1.5d wall-clock parallel)
Baseline: branch `g-b-10-phase-5` (Wave C SHIPPED, browser smoke discovery)
Trigger: 2026-05-04 browser smoke screenshots (야기 본 detail page UI quality
review) — Wave C 의 5-tab 구조 + status timeline + 카드 layout 자체는
PASS 지만 *정보 위계 / visual hierarchy / wording* 에 9 issue 발견.

⚠️ 본 hotfix-1 은 Wave C ff-merge **전** 처리. 의도: main 에 회귀 동반 ship 안 함.

## Trigger summary (야기 visual review)

| # | 이슈 카테고리 | 야기 피드백 |
|---|---|---|
| 1 | 큰 status 카드 = "제출됨 배지 + 한 줄 helper" 만 → 정보량 빈약. "내가 뭘 기다리면 되지?" 가 안 보임 | HIGH |
| 2 | 카드들 visual hierarchy 동일 weight → "흩어진 폼" 인상. status 카드만 강조 필요 | HIGH |
| 3 | [의뢰 회수 후 수정] CTA 위치 외곽 (우측 상단/하단). 정보 카드 하단 또는 status 보조로 통합 | MED |
| 4 | Status timeline 미래 단계 너무 muted → 진행바 자체 존재감 약함 | MED |
| 5 | "야기 팀" wording 그대로 OK (오타 우려는 없음 confirmed) | — |
| 6 | "보드" tab 클릭 시 "보드가 곧 준비됩니다" placeholder. Wave C SPEC 의도 = brief-board-shell-client wrap (placeholder 아님) → **회귀** | HIGH |
| 7 | "전체 보기 →" 모든 카드 동일 워딩 → 카드별 차별 (브리프 전체 보기 / 첨부 자료 확인하기 / 코멘트 보기) | LOW |
| 8 | "AM 12:32" date format 어색 → "오전 12:32" 또는 24h "00:32" 통일 | LOW |
| 9 | "브리프" wording 유지 (D11 confirmed). 다만 *공간 어휘* 와 *meta info 어휘* 분리 — 내부 surface = "브리프", meta info = "프로젝트" | NOTE |

## Decisions locked (야기 confirm 완료, chat 2026-05-04)

| # | 항목 | 결정 |
|---|---|---|
| HD1 | Status 카드 콘텐츠 spec | 야기 verbatim: title + 본문 2 문장 + 예상 답변 + 다음 단계 + 담당 팀 + dual CTA ([브리프 전체 보기], [의뢰 회수 후 수정]) |
| HD2 | Step 1 미저장 = 의도된 동작 | OK 유지 (Step 2 진입 시점에만 draft 생성, 현재 동작 그대로) |
| HD3 | "브리프" wording 유지 | "프로젝트 요약" 으로 변경 X. PRODUCT-MASTER §C.2 "Briefing Canvas" paradigm core 어휘 |
| HD4 | "야기 팀" wording 정상 | 오타 우려 없음. 그대로 |
| HD5 | RecallButton 위치 | 정보 카드 하단 secondary CTA 또는 status 카드 dual CTA 중 1택. Builder 가 layout 보고 선택 (단 1 위치만 — 우측 상단/하단 동시 노출 X) |
| HD6 | Date format | 한국 locale = "오전/오후 HH:mm" 일관. AM/PM 영문 포기 |

## Scope: 6 sub-tasks (HF1.1 ~ HF1.6)

### HF1.1 — Status 카드 콘텐츠 redesign (lead solo, 0.5d)

**현재 (회귀 surface)**:
```
[제출됨 배지]
YAGI 팀이 1-2 영업일 내 답변드립니다.

(큰 빈 공간)

ewfwef
efwefw
```

**새 콘텐츠 spec (HD1)**:
```
[제출됨 배지]
의뢰가 접수되었습니다
YAGI 팀이 브리프를 검토 중입니다.

예상 답변      1–2 영업일 내
다음 단계      검토 완료 후 코멘트 또는 미팅 일정 안내
담당 팀        YAGI Creative Team

[브리프 전체 보기 →] [의뢰 회수 후 수정]
```

**i18n keys (`project_detail.status.card.*` 신규 namespace)**:

| key | KO | EN |
|---|---|---|
| `submitted.title` | 의뢰가 접수되었습니다 | Brief submitted |
| `submitted.body` | YAGI 팀이 브리프를 검토 중입니다. | YAGI is reviewing your brief. |
| `meta.expected_response` | 예상 답변 | Expected response |
| `meta.expected_response.value` | 1–2 영업일 내 | Within 1–2 business days |
| `meta.next_step` | 다음 단계 | Next step |
| `meta.next_step.submitted` | 검토 완료 후 코멘트 또는 미팅 일정 안내 | Review → comment or meeting schedule |
| `meta.team` | 담당 팀 | Assigned team |
| `meta.team.value` | YAGI Creative Team | YAGI Creative Team |
| `cta.view_full_brief` | 브리프 전체 보기 → | View full brief → |

⚠️ Status-별 status 카드 콘텐츠 differentiation 은 **submitted 만 본 hotfix scope**. 나머지 status (in_review / in_progress / in_revision / delivered / approved / cancelled / archived) 의 status 카드 콘텐츠 는 FU-Phase5-18 으로 deferred.

**EXIT**:
- file: 새 component (또는 기존 status 카드 component 의 props 확장)
- submitted status 시 위 콘텐츠 정확 렌더 (title / body / 3 meta row / dual CTA)
- 나머지 8 status 는 **현재 helper text** 그대로 (변경 X, breaking 회피)
- i18n keys 9개 KO + EN 추가
- tsc + lint + build clean

### HF1.2 — Status timeline 색상 weight 조정 (parallel, 0.25d)

**현재**:
- 완료 단계 (작성 중): 검정 체크 ✅
- 현재 단계 (의뢰 접수): sage `#71D083` accent ✅
- 예정 단계 (검토 중 / 작업 진행 / 시안 도착 / 승인 완료): 너무 옅은 회색 → 진행바 존재감 약함

**Spec (야기 추천)**:
- 완료: 진한 검정 체크 (현재 OK)
- 현재: sage `#71D083` + 텍스트 weight `font-medium` (살짝 두껍게)
- 예정: 회색 dot, 텍스트 색상 단계 살짝 진하게 (`text-foreground/40` → `text-foreground/55` 정도)
- Step 사이 라인: 살짝 명확하게 (`border-border/30` → `border-border/50`)

⚠️ 정확한 token 값은 yagi-design-system v1.0 의 token 한계 안에서. 야기 비주얼 review 후 미세조정 가능.

**EXIT**:
- timeline component 의 active/current/upcoming variant style 정확
- visual diff = 현재보다 *예정 단계의 정보 가독성* 향상
- yagi-design-system v1.0 token 안 — sage accent 외 새 color 도입 0
- tsc + lint + build clean

### HF1.3 — RecallButton 위치 정리 (parallel, 0.25d)

**현재 회귀**:
- Image 1 surface: 우측 *하단* (외곽, 잘 안 보임)
- Image 2 surface: 우측 *상단* (overlap with tab bar 가능)

**Spec (HD5)**:
- *1 위치만* — 둘 중 하나 선택, 다른 하나는 제거
- 권장: **우측 정보 카드 (프로젝트 정보) 하단** secondary button
  - 이유: status 카드 dual CTA 는 이미 [브리프 전체 보기 →] 로 채워짐. 정보 카드 하단이 visual hierarchy 자연
- Builder 가 layout 시도 후 visual review 시점에 야기 confirm

**EXIT**:
- RecallButton 위치 *1곳만* (visible at any given time)
- secondary button style (outline, sage on confirm action — 현 style 유지)
- 정보 카드 하단 또는 status 카드 dual CTA 중 1 위치 — 선택 사유 commit msg 에 명시
- tsc + lint + build clean

### HF1.4 — "전체 보기 →" 카드별 워딩 차별 (parallel, 0.25d)

**현재**: 모든 카드 = "전체 보기 →" 동일.

**Spec**:

| 카드 | 새 워딩 KO | 새 워딩 EN |
|---|---|---|
| 브리프 요약 카드 | 브리프 전체 보기 → | View full brief → |
| 첨부 자료 카드 | 첨부 자료 확인하기 → | View attachments → |
| 야기 코멘트 카드 (placeholder) | 코멘트 보기 → | View comments → |

i18n key 추가 (`project_detail.summary_card.cta.*` namespace):

| key | KO | EN |
|---|---|---|
| `brief` | 브리프 전체 보기 → | View full brief → |
| `attachments` | 첨부 자료 확인하기 → | View attachments → |
| `comments` | 코멘트 보기 → | View comments → |

**EXIT**:
- 각 카드의 CTA 워딩 정확 렌더
- 클릭 시 해당 tab 으로 navigate (브리프 → 브리프 tab, 첨부 → 보드 tab, 코멘트 → 코멘트 tab)
- i18n keys 3개 × 2 locale 추가
- tsc + lint + build clean

### HF1.5 — Date format helper (parallel, 0.25d)

**현재 회귀**: `2026년 5월 21일 AM 12:32` (영문 AM/PM 한국어 surface 에 어색)

**Spec (HD6)**:
- 새 utility: `src/lib/date/formatKoreanDateTime.ts` (or co-locate with existing date utils — Builder 가 grep 해서 위치 결정)
- Function: `formatKoreanDateTime(date: Date | string, locale: 'ko' | 'en'): string`
- KO 출력: `2026년 5월 21일 오전 12:32`
- EN 출력: `May 21, 2026 12:32 AM` (영문 locale 은 AM/PM 유지 OK)
- Edge case:
  - 정오 = `오후 12:00` (KO), `12:00 PM` (EN)
  - 자정 = `오전 12:00` (KO), `12:00 AM` (EN)
  - Timezone = browser local (Asia/Seoul 가정)
- 적용 범위: 정보 카드 의 의뢰 일자 / 납기 / 미팅 희망. 다른 모든 datetime display 도 grep 해서 적용 (단 commit history / log 같은 dev surface 는 제외)

**EXIT**:
- utility 파일 + unit test (정오/자정 edge case 포함)
- 정보 카드 datetime 3 field 가 새 format 사용
- Other detail page surface (status timeline tooltip 등) datetime 도 통일
- tsc + lint + build clean

### HF1.6 — 보드 tab 회귀 fix (parallel, 0.25–0.5d)

**현재 회귀**:
야기 보고: "보드 tab 클릭 → '보드가 곧 준비됩니다' placeholder 표시".
SPEC §"보드 tab" verbatim:
> 기존 brief-board-shell-client + AttachmentsSection 컴포넌트를 tab 안으로
> wrap. 컴포넌트 자체 수정 X. 단순 surface 이동.

즉 *placeholder 가 아니라 실제 tldraw whiteboard 가 mount 되어야 함*. C_5 gate 의 `보드 tab = brief-board-shell-client wrap` EXIT criteria 가 회귀.

**진단 가설** (Builder 가 grep + run 해서 확정):
- A) Wave C C_5 가 brief-board-shell-client 를 import 하지 않고 placeholder 컴포넌트로 잘못 wrap
- B) brief-board-shell-client import 됐지만 conditional render 가 잘못 (status check, lock state 등)
- C) tldraw mount fail (Wave C 5-tab 구조 안에서 canvas dimension 0 → invisible). yagi-lessons L-031 (R2 SDK middleware 회귀) 무관
- D) "보드가 곧 준비됩니다" 가 *결과물 tab* placeholder 가 잘못 렌더링되는 것 (tab routing bug)

**EXIT**:
- 보드 tab 클릭 → 기존 brief-board-shell-client 정상 mount (tldraw canvas 보임, drag/draw 동작)
- AttachmentsSection (PDF / URL) 도 정상 렌더 (Wave A baseline 동작 그대로)
- 회귀 원인 (A/B/C/D 중 어느 것) `_run.log` 에 명시
- Lock UI / status pill 등 brief-board-shell-client 내부 동작 영향 X
- tsc + lint + build clean

⚠️ 만약 진단 결과 보드 tab 회귀가 *Wave C 외 다른 commit* (e.g., Wave B.5 머지 시 conflict) 에서 유발됐으면 — Builder 는 fix 하되 origin commit 도 `_run.log` 에 명시 (다음 wave 에서 root cause review).

## Verification (Builder responsibility — 12 steps total)

### Pre-apply
1. `pnpm exec tsc --noEmit` clean
2. `pnpm lint` clean
3. `pnpm build` clean

### UI render verify (야기 browser smoke)
4. submitted status detail page 진입 → 새 status 카드 콘텐츠 정확 렌더 (title / body / 3 meta / dual CTA)
5. Status timeline → 완료/현재/예정 색상 weight hierarchy visible
6. RecallButton → 1 위치만 visible (선택된 위치 commit msg 와 일치)
7. 브리프 요약 카드 CTA → "브리프 전체 보기 →" 워딩
8. 첨부 자료 카드 CTA → "첨부 자료 확인하기 →" 워딩
9. 코멘트 카드 CTA → "코멘트 보기 →" 워딩
10. 정보 카드 datetime 3 field → "오전/오후 HH:mm" format
11. 보드 tab → tldraw whiteboard 정상 mount + AttachmentsSection 렌더

### Static verify
12. yagi-design-system v1.0 compliance (sage `#71D083` only, zero shadow, border subtle, radius 24/999/12)

### K-05 LOOP 1 (Tier 3 LOW, optional)

UI 위주 hotfix — 보안 surface 영향 0. RLS 변경 0. 새 server action 0.
**K-05 skip 권장** — 단 Codex 가용 시 quick scan (Tier 3 LOW reasoning,
file count <10) 으로 cost 0. Builder 자율 결정.

## Out-of-scope (FU 등록)

- **FU-Phase5-18** — Status-별 status 카드 콘텐츠 differentiation
  (submitted 외 8 status). 본 hotfix 는 submitted 만 ship. 의뢰자가
  in_review / in_progress / in_revision / delivered / approved 단계에
  진입할 때 각 status 별 status 카드 콘텐츠 spec 추가 필요.
- **FU-Phase5-19** — Cancelled / archived banner 의 spec 검토 (본
  hotfix scope 외, 야기 visual review 미포함)
- **FU-Phase5-20** — Status timeline 의 미래 단계 helper text
  (각 단계 호버 시 짧은 설명 tooltip — UX polish, Phase 6+)

## Codex K-05

- **Tier**: 3 LOW (skip 권장).
- **Routing**: optional.
- **Justification**: UI 위주, RLS 0, server action 0, schema 0.
  보안 surface 영향 없음. K-05 quota 절약.

## Migration apply policy

DB schema 변경 0. Migration 파일 없음.

## Commit plan (PowerShell, one command at a time)

Sub-task 별 commit (권장 — history 가독성).

```powershell
# HF1.0 (lead solo, base)
git add src/components/project-detail/_skeleton/ src/app/[locale]/app/projects/[id]/
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wc.hf1.0): tab UX foundation — scroll-to-top + skeleton

# HF1.1 (parallel after HF1.0)
git add src/components/project-detail/status-card.tsx messages/
git status
git commit -F .git\COMMIT_MSG.txt
# msg: fix(phase-5/wc.hf1.1): status 카드 콘텐츠 redesign (submitted) + dual CTA hierarchy

# HF1.2 ~ HF1.6 동일 패턴
```

## Sign-off

야기 SPEC v2 LOCKED (chat 2026-05-04) → Builder execute (HF1.0 lead solo
base → HF1.1/2/3/4/5/6 parallel x 6) → Verify 1–16 → 결과 chat 보고 →
야기 ff-merge GO (Wave C 전체 + hotfix-1 합쳐서 single ff-merge to main).
