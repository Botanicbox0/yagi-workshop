# YAGI Studio — PRODUCT-MASTER

> 우리가 무엇을, 누구를 위해, 어떻게 만드는지에 대한 단일 source of truth.
> 이 문서가 변경되면 코드 / 디자인 / 마케팅 / 슬라이드 모두 영향받는다.

**Version**: v1.1 (2026-05-02)
**Status**: Active — Phase 4.x ff-merge 직전, Phase 5 KICKOFF 작성 중
**Owner**: 야기 (CEO)
**Source documents**:
- Twin Lab Concept Document (사업 vision)
- yagi-design-system v1.0 (`C:\Users\yout4\.claude\skills\yagi-design-system`)
- Phase 1.0 ~ 4.x 의 누적 결정사항
- Notion mirror: https://www.notion.so/35101c1a17f6801ebcecd0379ae19611

---

> **⚠️ READING ORDER NOTE**:
> v1.1 amendment 가 **Section 0 / Section 4.4 / Section 5 / Section 7** 을 갱신함. v1.0 의 해당 섹션 읽기 전에 *반드시* 문서 끝의 **`v1.1 Amendment`** 섹션부터 read. v1.0 내용은 *역사적 reference + 갱신 안 된 섹션 (1, 2, 3, 4.1-4.3, 4.5-4.7, 6, 8)* 에 한해 유효.

---

## Section 0 — Vision + 정체성

### One-liner

> 우리는 인플루언서와 셀러브리티의 Digital Twin IP를 기반으로, 촬영 이후의 광고와 콘텐츠를 확장 생산하고 이를 반복 수익화하는 AI 기반 IP 운영 회사다.

> ⚠️ **v1.1 SUPERSEDED** — 새 one-liner = Section v1.1 Amendment §A 참조.

### 우리가 아닌 것

- 셀프서비스 마켓플레이스가 아니다.
- 일반 AI 광고 제작사가 아니다.
- 매니지먼트사가 아니다.
- 딥페이크 탐지 SaaS가 아니다 (현시점).

### 우리가 정확히 하는 것

1. 실존 인물의 **Digital Twin** 을 상업적 사용 가능 수준으로 제작.
2. 그 Twin 을 사용한 광고/콘텐츠 제작을 **직접 수행**.
3. Twin 의 사용 권한, 카테고리, 수익 배분을 **운영**.
4. 결과물의 신뢰성과 출처 추적을 **보증**.

> ⚠️ **v1.1 EXTENDED** — 위 4개 외에 *Twin 미관여 작업* 도 정식 product scope. v1.1 Amendment §A 참조.

### Brand: YAGI Studio (rebrand from YAGI Workshop)

- **Product 도메인**: `studio.yagiworkshop.xyz`
- **회사 도메인**: `yagiworkshop.xyz` (corporate landing)
- **Rename 적용**:
  - 즉시: marketing surface, design system, 본 문서, 슬라이드
  - 단계적: 코드 base 의 `YAGI Workshop` → `YAGI Studio` 는 Phase 4.x 끝난 후 별 cleanup phase
- **이유**: "Workshop" 은 제작 톤. "Studio" 는 IP + 제작 + 운영을 모두 포괄하는 Higgsfield 스타일 단일 platform 톤.

### 핵심 framing

> **"대체가 아니라 확장"** — 우리는 셀럽 촬영을 대체하지 않는다. 한 번의 촬영 이후, 광고와 콘텐츠를 확장 생산한다.

> ⚠️ **v1.1 EXTENDED** — "확장" 의 의미가 *Twin asset 의 ROI 확장* 외에 *AI 기반 비주얼 작업의 확장 (의뢰자 needs 부터 시작)* 까지 포함. v1.1 Amendment §A 참조.

### Higgsfield 영감

여러 서비스를 *분리된 brand* 로 운영하는 대신, **단일 product 안의 다양한 capability** 로 통합. 우리 case 는 capability 대신 **role(역할)** 다양성 — Brand / Artist / YAGI Admin 이 같은 surface 안에서 다른 view 를 본다.

---

## Section 1 — 3 Personas

### 1.1 Brand

**누구**: 마케팅 담당자, 광고대행사 PM, 브랜드 인하우스 디자이너.

**들어오는 이유**: 콘텐츠가 필요해서 (광고/콘셉트/SKU 변주/글로벌 현지화).

**핵심 motivation**:
- 빠른 제작 사이클 (2~4주 → 3~7일)
- 비용 절감 (촬영비 없이 변주 생성)
- 법적 리스크 회피 (권리 클리어된 Twin)
- 글로벌 현지화 (단일 촬영 → 다지역 버전)

**Brand 가 시스템에서 하는 핵심 행동**:
1. 의뢰 작성 (RFP — 무엇이 필요한지)
2. 진행 상황 추적
3. 결과물 검수
4. 라이선스 갱신 / 재사용

### 1.2 Artist

**누구**: 셀럽 본인 또는 매니저/엔터사 운영팀.
- K-pop 가수/아이돌
- 배우 (드라마/영화)
- 모델
- (제외) 인플루언서 — 현 단계 미포함

**들어오는 이유**: 본인 IP 자산화 + 추가 수익 + 통제권.

**핵심 motivation**:
- 촬영 외 추가 수익 (라이선스 fee 배분)
- 본인 IP 통제 (권한 dial)
- 외부 무단 사용 우려 해소
- 본인 IP 작업 시 우선순위 (Insider Track)

**Artist 가 시스템에서 하는 핵심 행동**:
1. Roster 합류 (onboarding — 미팅 중심, 자료는 외부 채널)
2. 권한 dial 조정 (Auto-decline / 노출 모드 / Bypass brands)
3. 받은 RFP 검토 + 수락/거절
4. 본인 의뢰 시작 (Talent-Initiated Track)
5. 결과물 승인 (Approval Gate)
6. 수익 확인

**Workspace.kind**: `artist`. 1인 = 본인 워크스페이스. 엔터사 소속 = 엔터사 워크스페이스 안에 여러 Artist member.

### 1.3 YAGI Admin

**누구**: 야기 (Byeongsam Yun, CEO) + 남다나 + 향후 합류 팀원.

**들어오는 이유**: Brand-Artist 매개 + 작업 운영 + 큐레이션.

**핵심 motivation**:
- RFP routing 결정의 정확성
- Roster 운영 (Twin 학습 진행 / 권한 관리)
- 전체 매출 흐름 가시성
- Brand 검증 (T0 → T1 → T2)

**Admin 이 시스템에서 하는 핵심 행동**:
1. 새 RFP 검토 + 라우팅 결정
2. Artist 후보 큐레이션 + 큐레이션 노트 작성
3. 진행 중 프로젝트 운영
4. 라이선스 / 정산 처리
5. Roster onboarding (외부 미팅 결과 입력)

---

## Section 2 — 3 Tracks

세 트랙은 같은 ProjectBoard 위에서 돌지만 출발점과 의사결정 권한이 다르다.

### 2.1 Direct Track — Brand 발 의뢰, Twin 미사용

```
Brand RFP (Twin 의향: no_twin)
   ↓
[YAGI 검토]
   ↓
[YAGI Production] (자체 AI VFX / 가상 인물 / 합성)
   ↓
Brand Delivery
```

- 시작점: Brand RFP
- 의사결정자: YAGI (수주/거절)
- 결과물 소유권: Brand
- 매출: 제작비 only

### 2.2 Inbound Track — Brand 발 RFP, Twin 활용

```
Brand RFP (Twin 의향: undecided / specific)
   ↓
[YAGI Curation] — RFP 분석 → Roster 후보 1~2명 선정
   ↓
Artist (Auto-route / Curated proposal)
   ↓
Artist 수락 / 거절
   ↓
[YAGI Production]
   ↓
Brand Delivery + 라이선스 fee 정산
```

- 시작점: Brand RFP
- 의사결정자: **Artist** (수락/거절)
- 결과물 소유권: Brand
- 매출: 제작비 + Twin 라이선스 fee + 브랜드 마진
- Artist 매출: 라이선스 fee 배분

### 2.3 Talent-Initiated Track — Artist 발 의뢰, 본인 IP 작업

```
Artist / Agency 의뢰
   ↓
[YAGI 수주 검토]
   ↓
[YAGI Production]
   ↓
Artist / Agency Delivery
```

- 시작점: Artist 또는 Agency 의뢰
- 의사결정자: **YAGI** (수주/거절)
- 결과물 소유권: Artist / Agency
- 매출: 제작비 (Roster 멤버 할인가)
- 라이선스 fee: 자기 IP 자기 사용 → 면제

#### Talent-Initiated 4 types

| Type | 정의 | 예시 | 라이선스 fee |
|---|---|---|---|
| **Type 1 — Pure Creative** | 본인 기획 창작 프로젝트 | 뮤비 AI VFX, 콘셉트 티저, 솔로 비주얼, 팬 콘텐츠 | 면제 |
| **Type 2 — Self-Sponsored Ad** | 본인 채널/D2C 광고 | 본인 인스타·유튜브용 협찬 광고, 본인 브랜드 광고 | 면제 |
| **Type 3 — Brand Deal Pass-through** | Artist 직접 발굴 브랜드 딜 | Bypass Right 적용. AI 기반으로 우리가 제작 | 협의 (감액 또는 면제) |
| **Type 4 — Footage Upgrade** | 외부 촬영본을 AI 로 확장/업그레이드 | 다국어 버전 확장, 의상/배경 변형, 화질 업스케일링, 추가 컷 | 면제 |

**전략적 중요도**:
- **Type 4 가 신규 Roster 영입 시 진입 장벽 최저** — "이미 촬영된 자료 업그레이드" 이므로 심리적 저항 거의 없음.
- **Type 3 가 셀럽 신뢰 시그널** — Bypass Right 와 결합되어 "당신의 자유를 막지 않는다" 메시지.

### 2.4 두 트랙의 결합 효과

같은 Twin asset 이 양쪽 트랙에서 모두 활용됨. **한 번 만든 Twin 의 ROI 가 자연스럽게 2배**.

---

## Section 3 — Data Model 진화

원칙: **현재 schema 손상 없이 ADD only**. Phase 3.0 의 status 머신, project_boards, asset_index 모두 재사용.

### 3.1 현재 schema (Phase 3.1 hotfix-3 시점)

```
workspaces
├── workspace_members (role: client / yagi_admin / creator)
└── projects (kind: 'direct' only)
    ├── project_boards (tldraw + 첨부)
    ├── project_status_history
    └── project_briefs (legacy)
```

### 3.2 새 schema (Phase 4-6 후)

```
workspaces
├── kind: 'brand' | 'artist' | 'yagi_admin'   ← 신규 column (Phase 4)
├── workspace_members (기존 role 유지)
│
├── (Artist 전용) artist_profile               ← 신규 (Phase 5 → v1.1 SWAPPED to Phase 6)
│       ├── twin_assets (R2 prefix, 학습 metadata, 카테고리)
│       ├── twin_permissions (Auto-decline 카테고리, 지역 dial, 노출 모드)
│       ├── bypass_brands (Artist 직접 따 온 브랜드 목록)
│       └── insider_pricing (Roster 멤버 할인율)
│
├── (Brand 전용) brand_profile                 ← 신규 (Phase 5-6 → v1.1 deferred to Phase 7)
│       ├── tier ('T0' | 'T1' | 'T2')
│       ├── verification (NDA, 사업자등록, 거래이력)
│       └── visible_artists (T2 이상이 볼 Roster — Reveal Layer 2)
│
└── projects
    ├── kind 확장 (Phase 4):
    │   'direct' (현재) +
    │   'inbound_brand_to_artist' +
    │   'talent_initiated_creative' +          (Type 1)
    │   'talent_initiated_self_ad' +           (Type 2)
    │   'talent_initiated_brand_passthrough' + (Type 3)
    │   'talent_initiated_footage_upgrade'     (Type 4)
    │
    ├── twin_intent: 'undecided' | 'specific_in_mind' | 'no_twin'  ← 신규 (Phase 4)
    │   ⚠️ v1.1 SUPERSEDED — Phase 5 에서 interested_in_twin boolean 으로 단순화. Amendment §B 참조.
    │
    ├── project_boards (현재 그대로)
    ├── project_routing (Phase 4): RFP → 후보 Artist → 라우팅 결정 + 큐레이션 노트
    ├── project_approvals (Phase 5 → v1.1 SWAPPED to Phase 6): Concept / Draft / Final 승인 게이트
    └── project_licenses (Phase 6 → v1.1 deferred to Phase 7): 캠페인/기간/지역 단위 + 정산
```

> ⚠️ **v1.1 ADDED** — `briefing_documents` 테이블 신규 (Phase 5). v1.1 Amendment §B 참조.

### 3.3 Deferred (현 단계 schema 추가 X)

다음은 **시장 신호 받으면** 추가:
- `talent_initiated_full_production` (Type 5) — 풀 패키지 의뢰
- `brand_full_production` — Brand 측 풀 패키지
- 외주 partner 매개용 workspace.kind = `external_partner`
- 모니터링/탐지 SaaS schema

---

## Section 4 — Surface Architecture (Higgsfield 통합)

### 4.1 핵심 원칙

**단일 product, 다중 user persona, role-based surface.**

- 같은 도메인 (`studio.yagiworkshop.xyz`)
- 같은 로그인 / 인증
- 같은 design system (yagi-design-system v1.0)
- 다른 sidebar / dashboard / 권한 — workspace.kind 에 따라

### 4.2 공통 surface — ProjectBoard

3 워크스페이스 모두 같은 ProjectBoard 컴포넌트 사용. 이게 협업의 만나는 자리.

**구성 요소** (현재 hotfix-3 까지 누적):
- tldraw 캔버스 + custom shapes (image / pdf / url-card)
- AttachmentsSection (PDF / URL 별도)
- Lock UI (admin 잠금 + cascade)
- Status pill (lifecycle status)
- Version history (Phase 5+ 본격)
- Comment / Approval thread (Phase 5+)

**왜 같은 컴포넌트인가**: Brand의 RFP 보드 = Artist 의 검토 보드 = Admin 의 큐레이션 보드. 시각적 컨텍스트가 합의를 만든다. 분리된 surface 면 정보 동기화 비용이 사업 자체의 비용이 된다.

> ⚠️ **v1.1 SUPERSEDED** — Phase 5 에서 ProjectBoard 가 *Briefing Canvas* 의 *하위 surface* 가 됨. 의뢰자 first view 가 ProjectBoard (whiteboard) 가 아니라 Brief 요약 + 현황 timeline 이 됨. Amendment §C 참조.

### 4.3 Workspace 별 sidebar / dashboard

(v1.0 그대로 유효 — Phase 4.x Wave C.5c 에서 brand asset + sidebar logo 도입 중)

#### Brand workspace
```
[YAGI Studio logo]
[Brand workspace switcher ▾]   ← Phase 4.x 마지막 또는 Phase 5 첫 task

WORK
- 프로젝트
- 라이선스 (Phase 6+)
- 추천 Artist (Phase 7+, T2 only)

ACCOUNT
- 청구
- 팀 / 권한
- 설정
```

#### Artist workspace
```
[YAGI Studio logo]
[Artist workspace switcher ▾]

MY TWIN
- 자산 상태
- 권한 / 카테고리 dial
- Bypass brands

WORK
- 받은 RFP (Inbound)
- 내가 시작한 프로젝트 (Talent-Initiated)
- 결과물 검수 (Approval pending)

REVENUE
- 라이선스 수익
- 정산 내역
```

#### YAGI Admin workspace
```
[YAGI Studio logo]
[YAGI Admin]

QUEUE
- 모든 RFP (검토 대기 / 라우팅 진행 / Approval pending)
- 진행 중 프로젝트

ROSTER
- Artist 명단
- Twin 학습 상태

ECOSYSTEM
- Brands (검증 / 승급)
- 라이선스 / 정산 (Phase 6+)
- 분쟁
```

### 4.4 Brand wizard — Twin intent 분기 (옵션 C: Curation-first)

분기 자체가 wizard 안에 없음. Brand 는 단순 RFP 작성, **Admin 이 routing 결정**.

```
Step 1: 프로젝트 이름 + 한 줄 설명
Step 2: 참고 자료 (캔버스 + PDF/URL 첨부 — hotfix-3 그대로)
Step 3: 조건
   - Deliverable type
   - Budget
   - Delivery date (선택)
   - Meeting (선택)
   ──────────────
   - "Digital Twin 활용을 원하시나요?"  ⓘ
       [Tooltip] Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의
                 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을
                 광고/콘텐츠 제작에 활용하는걸 제안드릴 수 있습니다.
                 Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.
       
       (체크박스 없음 — 자유 텍스트 또는 단순 toggle)
   ↓
Submit → status='routing' → Admin queue
```

**철학**: Twin Lab §4 — *"우리는 매칭이 아니라 큐레이션 부티크"*. Brand wizard 는 단순할수록 진입 장벽 낮음 = RFP 유입 ↑ = 큐레이션 가치 ↑.

> ⚠️ **v1.1 SUPERSEDED** — Phase 5 에서 wizard form-only paradigm 폐기. *Briefing Canvas* (3-stage briefing-as-conversation) 로 전면 재설계. Amendment §C 참조.

### 4.5 Artist onboarding (자료 수집 = 플랫폼 외부)

**핵심 결정**: 사진/음성/영상 같은 학습 자료는 **플랫폼에서 받지 않음**. 미팅 + 외부 채널(이메일/드라이브/카톡) 로 직접.

이유:
1. 우리는 부티크 — self-serve 가 본질이 아님
2. 자료 품질 검증은 미팅에서 직접
3. 권리 클리어 + 신뢰 구축은 사람 대 사람

```
Stage 1: 가입 (이메일 + 기본 정보)
   - 활동명, 카테고리, 한 줄 소개
   - 매니저/소속사 정보
   ↓
Stage 2: 미팅 예약
   - "YAGI 팀과의 1:1 미팅을 예약해주세요"
   - 자료는 미팅 + 후속으로 전달 (외부 채널)
   ↓
Stage 3: YAGI 작업 (외부) — Twin 학습, 권한 정리, 계약
   - Artist 는 status timeline 만 봄
   - 진행 단계: 자료 검토 → Twin 학습 → 권한 검토 → 활성화
   ↓
Stage 4: 활성화 (Roster 합류)
   - "Digital Twin 이 준비됐습니다" 알림
   - Welcome → 정상 Artist dashboard 전환
```

플랫폼 안에서 Artist 의 능동적 작업은 **권한 dial 조정 / RFP 검토 / 의뢰 시작 / 승인** 중심. *Twin 만들기 작업* 은 외부.

### 4.6 Admin Routing Surface — 3 Layer 구조

핵심 — admin 의 큐레이션이 사업의 lever. surface 는 단순 list 가 아니라 **의사결정 도구**.

#### Layer 1: Queue Overview (Admin 첫 화면)

목적: "지금 처리해야 할 게 뭐가 있는지" 한눈에.

```
TODAY
- 새 RFP            3
- 라우팅 대기       2
- Artist 응답 대기  4
- Approval pending  1

ALL RFPs
- Filter (status / Brand tier / 정렬)
- Row: [RFP id] [Brand tier] [Brand 이름] [한 줄 설명]
        [예산] [Twin intent] [업데이트 시각] [STATUS]
```

#### Layer 2: RFP Decision Surface (단일 RFP 클릭 시)

목적: 한 RFP 의 모든 결정 정보를 한 화면 → 라우팅 결정.

**3-column layout**:

| Left: Brand + RFP 정보 (사실) | Right: Routing Decision (액션) |
|---|---|
| Brand 이름, Tier (T0/T1/T2), 거래 이력, 담당자 연락처 | Twin intent 표시 |
| RFP 제목, 요청, 예산, 납기, 미팅 희망 | Routing options:<br>○ Direct<br>○ Inbound — Artist 1명<br>○ Inbound — Artist 2-3명<br>○ Brand 에게 추가 질문<br>○ Decline |
| 보드 미리보기 link | 큐레이션 노트 (Artist 에게 전달됨) |
| | [라우팅 확정] |

**Bottom: Artist Candidates** (Phase 5+ 에 활성)
- Filter: 카테고리 fit / 일정 fit / 모두 보기
- 각 candidate card: match score, available, Auto-decline 카테고리 표시
- [☑ 추천] 토글, [상세 →]

#### Layer 3: Post-routing ProjectBoard

라우팅 결정 후 → Brand-Artist-Admin 협업 surface (현재 ProjectBoard 진화). Phase 5+ 에서 본격 활성.

#### Admin 의사결정 사고 흐름 (surface 디자인 base)

야기 직접 confirmed:

1. 알림 받음 → "RFP 새로 들어왔다"
2. 어디서 봄? (목록? 상세? 알림 패널?)
3. 무엇부터 봄?
   - Brand 가 누구인가 (T0/T1/T2, 거래 이력)
   - 무엇을 원하는가 (보드 내용, 예산, 일정)
   - Twin 의향 (3가지 중 어느 것)
4. 어떤 정보가 routing 결정을 도와주는가?
   - Roster 중 누가 fit
   - Artist 의 일정/카테고리/권한 dial
   - 과거 비슷한 case
5. 결정한다
   - Direct / Inbound 1명 / Inbound 2-3명 / Brand 재질문 / Decline
6. Artist 전달 / Brand 통지 / 작업 시작

이 흐름이 Layer 1+2+3 의 디자인 base.

### 4.7 Workspace switcher (좌상단 박스)

현재 Phase 3.1 까지 plain text "테스트 브랜드" 였음. Phase 4.x 마지막 또는 Phase 5 의 첫 task 로 도입.

- 박스 + 클릭 가능 affordance
- DropdownMenu — 다른 workspace 전환 + "+ 추가"
- 1 user 가 여러 workspace 가질 수 있음:
  - Brand 담당자가 여러 브랜드
  - Artist 가 솔로 + 엔터사 동시
  - YAGI 직원이 admin + 본인 브랜드 보유

---

## Section 5 — Phase Roadmap

각 phase 가 그 자체로 ship 가능한 user value 단위.

### Phase 4.x — Workspace.kind 도입 + Brand 페르소나 명확화

(✅ ff-merge 직전, Wave C.5c 진행 중)

**목표**: 현재 wizard 흐름을 새 model 에 맞게 정리. Brand 가 명확한 첫 user persona 가 됨.

핵심 변경:
- `workspaces.kind` column 추가 (현재 모두 `'brand'` 로 backfill — ✅ 적용됨)
- Brand workspace sidebar / dashboard 정리 (현재 hotfix-3 base 살림)
- `/app/commission` → `/app/projects` redirect (Phase 2.x 잔재 정리)
- Submit 후 detail page 재설계 — 1:1 카드 비율 + Discovery / Proposal / Production status 명확화
- ProjectBoard 의 역할 진화 (브리프 + 작업 + 검수 모두 같은 보드)
- 라이선스 model 첫 설계 (단순 — campaign 단위)
- `projects.twin_intent` column 도입 + wizard Step 3 의 Twin 의향 필드
- `projects.kind` enum 확장 (사용 안 해도 미리)

**미포함**: Artist workspace, Admin Routing surface (Layer 2 본격), 라이선스 정산 자동화.

### Phase 5.x — (v1.0) Artist workspace 도입

> ⚠️ **v1.1 SWAPPED** — Phase 5 = **Briefing Canvas** (의뢰자 협업 surface). Artist Roster 는 Phase 6 으로 이동. Amendment §D 참조.

### Phase 6.x — (v1.0) Inbound Track 가동

> ⚠️ **v1.1 SWAPPED** — Phase 6 = **Artist Roster + Inbound Track 통합**. Amendment §D 참조.

### Phase 7.x — Reveal Layers + Brand Tier

(v1.0 그대로 유효)

### Phase 8+ — Trust & Safety

(v1.0 그대로 유효)

### Phase 9+ — (장기 deferred) 모니터링 / 보호 SaaS

(v1.0 그대로 유효)

### 코드 phase ↔ Twin Lab phase 매핑 (v1.1 갱신)

| Twin Lab phase | 코드 phase |
|---|---|
| Phase 1 (0-12mo) — Roster 1-5명, Inbound + Talent-Initiated | Phase 4 + 5 (Briefing) + 6 (Roster + Inbound) |
| Phase 2 (12-24mo) — Roster 5-20, T2 검증, 라이선스 fee | Phase 6 + 7 |
| Phase 3 (24+mo) — 보호 SaaS | Phase 9+ |

---

## Section 6 — Open Questions / Deferred

### 6.1 Type 5 — Full Production (Talent-Initiated)

**Deferred 이유**: 시장 신호 받고 결정. 야기 본능: "추후 나올 수도" — Twin Lab 의 자연스러운 성장 path 지만 현 단계 over-design 방지.

**예상 신호**: Roster Artist 1-2명이 *우리에게 직접* "촬영도 같이 해줄 수 있나?" 묻기 시작 → 그때 schema + surface 추가.

### 6.2 Brand-side Full Production

**Deferred 이유**: Type 5 와 동일 — 시장 신호 후 결정.

### 6.3 외주 촬영 partner 매개

**Deferred 이유**: Type 5 가 활성화되기 전까지 product scope 에서 완전 제외. 외부 contact list 는 admin 노트로만.

### 6.4 인플루언서 카테고리

**Deferred 이유**: 야기 명시 — 현 제품 단계 제외. 셀럽/배우/모델 focus 가 흐려지지 않게.

### 6.5 모니터링 / 딥페이크 탐지 SaaS

**Deferred 이유**: Twin Lab Phase 3 (24+ 개월). 핵심 사업 안정화 후 분사 vs 자체 vs 화이트라벨 결정.

### 6.6 결정 미뤄둔 내부 question

- Match score 알고리즘 (Phase 5: admin 직접 → Phase 6: rule-based → Phase 7+: ML)
- 라이선스 fee 분배 비율 (Artist : YAGI %) — Roster 첫 1-2명 협상에서 결정
- Approval Gate 의 정확한 단계 (Concept / Storyboard / 1차 시안 / Final?)
- 분쟁 처리 escalation flow

---

## Section 7 — 후속 산출물

이 PRODUCT-MASTER 다음에 작성할 문서:

1. **`IA-routes-and-surfaces.md`**
   - 모든 `/app/*` route 매핑
   - Workspace.kind 별 capability matrix
   - 각 surface 의 entry point + exit + transitions

2. **`USER-JOURNEYS.md`**
   - Brand: 첫 의뢰 / 진행 중 / 라이선스 갱신
   - Artist: onboarding / RFP 수락 / Self-initiated 의뢰
   - YAGI Admin: queue 관리 / curation / production

3. **Slide narrative** (Figma slide 작성 전)
   - 청중 결정 (투자자 / Talent 영입 / Brand pitch / 내부 align)
   - Narrative arc + slide 구조

4. **Figma slides** (yagi-design-system v1.0 적용)

5. **Phase 4.x KICKOFF spec** (✅ 작성 완료, ff-merge 직전)

> ⚠️ **v1.1 갱신** — Section 7 재정의 = Amendment §E 참조.

---

## Section 8 — Source Quotes (야기 본능 인용)

미래의 의사결정자 (야기 본인 + 새 팀원 + AI) 가 이 결정의 *왜* 를 reverse engineer 가능하도록.

> "별도의 서비스로 분리하고 싶지는 않아. HIGGSFIELD는 여러 서비스를 제공하지만 하나의 단일 서비스에서 제공하는 것에서 영감을 내가 좀 받았어."
> — 단일 product 결정의 origin

> "talent보다는 좀 더 적합한 워딩이 있지 않을까... 인플루언서라는 단어는 제외할거야 제품 단계에서"
> — 워딩 + 타겟 결정의 origin (→ Artist + Roster 채택)

> "큰 그림을 잘 짜서 우리의 gsd시스템과 디자인 시스템을 통해 완성도 높은 제품을 만들어나가보자!"
> — 본 PRODUCT-MASTER 작성 trigger

> "YAGI Studio로 변경해야할 것 같다. studio.yagiworkshop.xyz 이렇게 도메인도 가야할 것 같아."
> — Brand rebrand 결정

> "우리는 매칭이 아니라 큐레이션 부티크"
> — Twin Lab §4 인용. Brand wizard 옵션 C 선택의 철학적 base

> "이 보드에서 많은 것들이 이루어질 수 있어야 함"
> — ProjectBoard 가 평생 워크스페이스라는 design 의도의 origin

> ⚠️ **v1.1 추가 quote** — Amendment §F 참조.

---

## Changelog

- **v1.0 (2026-04-30)** — 최초 작성. Twin Lab Concept Document + Phase 1.0~3.1 누적 결정 + Higgsfield framing 통합. 야기 직접 review + ✓ 확정.
- **v1.1 (2026-05-02)** — Phase 5 paradigm shift (Briefing Canvas) + Phase 5/6 swap + Vision 양면 명시. Phase 4.x 의 wizard 시각 review 결과 = 현재 form-only wizard 가 *고객사 입장에서 admin 도구처럼 보임* 자각 → "Brief 는 form 이 아니라 협업 surface" 새 paradigm 정의. Section 0 / 4.4 / 5 / 7 갱신. v1.0 의 해당 섹션은 SUPERSEDED 표시. Amendment 섹션 = append-only.

---

*이 문서가 변경되면 코드 / 디자인 / 마케팅 / 슬라이드 모두 영향받는다. 변경 시 changelog 에 기록 + 관련 산출물 update 트리거.*

---
---

# v1.1 Amendment (2026-05-02)

> 이 amendment 는 **append-only**. v1.0 본문은 *역사적 reference* 로 보존하고, 변경된 결정은 여기에 기록한다. 향후 v1.2, v1.3 도 동일 방식 (append-only) 으로 누적.

## Amendment trigger

Phase 4.x Wave C.5b 후 야기 visual review 에서 3 image 분석 (form 시점 wizard / 자료 첨부 화면 / 제출 후 detail page) → 4 가지 구조적 문제 자각:

1. wizard 가 너무 *플랫* (3-column section grouping 부재)
2. 기획서 vs 레퍼런스 *의도 다른 자료* 가 한 surface 에 뒤섞임
3. 레퍼런스 에 *왜 참고하는지* 메모 surface 부재
4. 제출 후 detail page = *고객사 입장 admin 도구 같음* — "이게 뭐임?" 의 빈 첫 인상

이 4 자각이 *Twin 중심 product 정의* 의 한계 노출. 의뢰 = Twin 활용 여부 *전에* 의뢰자 needs 부터 시작. → Vision 확장 + Phase 5 paradigm shift + Phase 5/6 swap 결정.

---

## §A — Section 0 Vision 갱신 (양면 명시)

### 새 One-liner (v1.1)

> **우리는 AI IP 기반 비주얼 스튜디오다. 두 축으로 작동한다 — (1) 의뢰자의 비주얼 작업을 함께 기획·제작하고, (2) 셀러브리티/아티스트의 Digital Twin 같은 IP 자산을 운영해 광고·콘텐츠를 확장 생산한다. 두 축은 같은 surface 위에서 만나며, 시간이 지날수록 새로운 IP 자산 (캐릭터, 스타일, 페르소나 등) 으로 확장 가능하다.**

### v1.0 → v1.1 변경 핵심

| v1.0 | v1.1 |
|---|---|
| "AI 기반 IP 운영 회사" | **"AI IP 기반 비주얼 스튜디오"** (운영 → 스튜디오 = 정체성 더 명확) |
| Twin = primary product | Twin = *첫* IP 자산. 미래 다른 IP (캐릭터, 스타일, 페르소나) 도 가능. AI IP 가 *자원* 이고 비주얼 스튜디오 = *행위* |
| "촬영 이후의 광고와 콘텐츠를 확장 생산하고 이를 반복 수익화" | 제거 — 너무 좁음. *Twin asset 의 ROI 확장* 외에 *AI 기반 비주얼 작업의 확장 (의뢰자 needs 부터 시작)* 까지 포함 |
| (없음) | "두 축은 같은 surface 위에서 만난다" — Briefing Canvas 가 두 축이 만나는 surface |
| (없음) | "시간이 지날수록 새로운 IP 자산으로 확장" — 미래 product evolution path 명시 |

### "우리가 정확히 하는 것" 확장 (v1.0 + v1.1)

v1.0 의 4개 (Twin 제작 / Twin 활용 제작 / Twin 권리 운영 / 신뢰성 보증) +

5. **의뢰자의 비주얼 작업을 함께 기획·제작** (Twin 활용 여부 무관). 의뢰자가 가져온 needs 를 받아, AI 비주얼 작업으로 함께 구현. Twin 활용은 *야기 팀이 brief 검토 후 추천* 하는 옵션.

### "우리가 아닌 것" 유지 (v1.0)

- 셀프서비스 마켓플레이스가 아니다 ✅ 유지
- 일반 AI 광고 제작사가 아니다 ✅ 유지 (Twin + 큐레이션이 차별화)
- 매니지먼트사가 아니다 ✅ 유지
- 딥페이크 탐지 SaaS가 아니다 ✅ 유지

### 핵심 framing 확장

v1.0: "대체가 아니라 확장" (촬영 vs Twin 확장)
v1.1 추가: **"의뢰자의 needs 가 입구. Twin 은 답 중 하나."** — 의뢰자가 *Twin 알아서 결정* 강요 X. 야기 팀 큐레이션이 답 매칭.

---

## §B — Section 3 Data Model 추가 (briefing_documents 신규)

### Phase 5 추가 schema

```sql
-- briefing_documents — Phase 5 신규
CREATE TABLE briefing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- 분류: 기획서 vs 레퍼런스
  kind text NOT NULL CHECK (kind IN ('brief', 'reference')),
  -- 자료 source
  source_type text NOT NULL CHECK (source_type IN ('upload', 'url')),
  -- upload (기획서 또는 image 레퍼런스)
  storage_key text,
  filename text,
  size_bytes bigint,
  mime_type text,
  -- url (영상/사이트 레퍼런스)
  url text,
  provider text,  -- youtube / vimeo / instagram / generic
  thumbnail_url text,
  oembed_html text,
  -- 의뢰자 메모 + 분류 (reference 만)
  note text,  -- "전체 색감 참고", "구도 참고" 등
  category text,  -- 'mood' | 'composition' | 'pacing' | 'general' (reference 만)
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  CONSTRAINT briefing_documents_source_check CHECK (
    (source_type = 'upload' AND storage_key IS NOT NULL) OR
    (source_type = 'url' AND url IS NOT NULL)
  )
);

CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);

-- RLS: project 의 workspace member 만 access
ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;
-- (RLS policy detail = Phase 5 KICKOFF 에서 명세)

-- projects 에 추가 column
ALTER TABLE projects
  ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false;
-- twin_intent enum 은 *legacy data 보존* 으로 그대로 유지
-- (deprecated, 새 의뢰는 interested_in_twin 만 사용)
```

### Migration plan (기존 데이터 처리)

기존 `projects.attached_pdfs` jsonb + `projects.attached_urls` jsonb → `briefing_documents` 로 migrate:

```sql
-- 기존 attached_pdfs 의 모든 element → briefing_documents row (kind='reference', source_type='upload')
INSERT INTO briefing_documents (project_id, kind, source_type, storage_key, filename, size_bytes, created_at, created_by)
SELECT
  p.id,
  'reference',  -- 기존 attached_pdfs 는 *모두* reference 분류 (기획서 분리 안 됐던 시점)
  'upload',
  (item->>'storage_key'),
  (item->>'filename'),
  (item->>'size_bytes')::bigint,
  (item->>'uploaded_at')::timestamptz,
  (item->>'uploaded_by')::uuid
FROM projects p,
  jsonb_array_elements(p.attached_pdfs) AS item
WHERE jsonb_array_length(p.attached_pdfs) > 0;

-- 동일하게 attached_urls 도 migrate
-- ...

-- 검증 후 attached_pdfs / attached_urls jsonb columns 폐기 (Phase 5 Wave D 에서)
```

⚠️ Migration 은 *Codex K-05 mandatory* (data integrity critical).

---

## §C — Section 4 Surface Architecture 갱신

### §C.1 — Section 4.4 Brand wizard SUPERSEDED → Phase 5 Briefing Canvas

v1.0 의 Section 4.4 (Brand wizard 옵션 C: Curation-first, Step 1/2/3 form) 는 **Phase 5 에서 전면 재설계**. 새 paradigm:

#### Briefing Canvas — 3-stage briefing-as-conversation

**Stage 1 — Intent (form, 빠르게)**
- 의뢰자가 *"내가 무엇을 원하는지"* 명확화
- 3-column grid layout (Image 1 영감, 가로 넓게)
- 결과물 유형 / 목적 / 활용 채널 / 컨셉 설명 / 영상 기획 유무 / 분위기 키워드 / 시각화 비율 / 타겟 오디언스 / 추가 요청
- **Twin 통합 (B+C 하이브리드)**:
  - 결과물 유형 옵션 중 **"AI 인물 활용 콘텐츠"** 포함 (다른 결과물 옵션과 동등)
  - Stage 2 expandable 안에 **"🪞 AI 디지털 휴먼 (Twin) 활용에 관심 있어요"** toggle (선택)
  - Helper text: *"브리프 검토 후 야기 팀이 추천 Twin 또는 활용 방식을 제안드려요."*
  - DB: `interested_in_twin: boolean` 단일 column

**Stage 2 — Assets (workspace, 천천히)**
- 의뢰자가 *"내가 줄 수 있는 자료"* 첨부
- **기획서 첨부** vs **레퍼런스** *명확 분리* (Image 2 영감)
  - 기획서 = 의뢰자가 직접 만든 자료 (PDF, PPT) → "이대로 만들어 주세요"
  - 레퍼런스 = 외부에서 본 자료 (URL, image) → "이런 느낌으로"
- 레퍼런스 URL 입력 시 자동 thumbnail + provider 식별 + 의뢰자 메모 칸 + 분류 (mood / composition / pacing / general)
- Sidebar (오른쪽): budget / timeline (선택) — Stage 1 의 부담 줄임
- 하단 expandable: **"더 추가할 게 있나요?"** (whiteboard, optional)
  - 90% 의뢰자는 안 쓰지만, 고급 의뢰자가 expand 시 강력 도구
  - tldraw 캔버스 그대로 재사용

**Stage 3 — Review (확인 + 제출)**
- 의뢰자가 *"내가 보낸 정보"* 한 번 확인
- 모든 입력값 요약 + edit affordance
- "프로젝트 의뢰하기" 최종 제출

### §C.2 — Section 4.2 ProjectBoard 의 새 위치

v1.0 ProjectBoard = *first view*. v1.1 = *secondary surface*.

새 Detail page 구조 (Image 3 자각 후):
- **default tab = "현황"** (의뢰자 first view)
  - status timeline (5단계, 사용자 친화 워딩)
  - 야기 팀 코멘트 thread
  - 의뢰자가 *지금 할 수 있는 것* 명시 (status-별 next action CTA)
- **secondary tabs**:
  - 브리프 (Stage 1+2+3 요약, edit 가능)
  - 보드 (기존 tldraw whiteboard)
  - 코멘트 (Phase 5+ 본격)
  - 결과물 (Phase 6+ 납품물)

### §C.3 — Status workflow display 사용자 친화 워딩

DB enum value 그대로, *display label* 만 변경 (i18n key 갱신, schema 변경 0):

| DB enum | KO display | EN display |
|---|---|---|
| draft | 작성 중 | Drafting |
| in_review | 검토 중 | In review |
| routing | 디렉터 매칭 | Matching director |
| in_progress | 작업 진행 | In production |
| approval_pending | 시안 확인 | Reviewing draft |
| delivered | 최종 납품 | Delivered |

### §C.4 — Status-별 next action CTA (의뢰자 시점)

| Status | 의뢰자 next action |
|---|---|
| draft | "[브리프 완성하기]" → Stage 1/2/3 으로 |
| in_review | passive comment 가능. "추가 자료 첨부 가능" |
| routing | "[미팅 일정 확인하기]" (있다면) + comment |
| in_progress | "[보드 보기] [코멘트 작성]" — board tab 에서 작업 진행 |
| approval_pending | primary CTA "[시안 보기] [피드백 작성]" |
| delivered | "[최종 결과물 다운로드] [프로젝트 평가]" |

---

## §D — Section 5 Phase Roadmap SWAP

### Phase 5/6 swap 결정

기존 v1.0:
- Phase 5 = Artist workspace 도입
- Phase 6 = Inbound Track 가동

새 v1.1:
- **Phase 5 = Briefing Canvas (의뢰자 협업 surface)**
- **Phase 6 = Artist Roster + Inbound Track 통합**

### Swap 이유

| 이유 | 설명 |
|---|---|
| **Persona 우선순위** | 현재 활성 persona = Brand. Artist 영입은 야기 직접 (현 단계 surface 없어도 운영 가능) |
| **Briefing Canvas = 핵심 UX** | 의뢰자의 *first* + *primary* product surface. 고객 acquisition 의 lever |
| **Detail page 재설계 = blocker** | "고객사 입장에서 뭐지 싶음" 자각 = 의뢰자 retention 의 blocker. 빨리 fix |
| **Artist surface 가 *순서상 늦어도 OK*** | Roster 합류는 미팅 + 외부 채널이 메인 (Section 4.5). Artist self-serve surface 는 Roster 가 어느 정도 차고 나면 활성화 |

### Phase 5 (Briefing Canvas) 핵심 변경

- **새 wizard IA** — Stage 1 (intent form) → Stage 2 (asset workspace) → Stage 3 (review)
- **Schema 변경** — `briefing_documents` 신규 테이블 + migrate 기존 jsonb data + `interested_in_twin` boolean column
- **Reference URL 자동 thumbnail + note + 분류**
- **Detail page 재설계** — "현황" tab default, status timeline + next action CTA
- **Whiteboard = optional 보조** (Stage 2 expandable)
- **Twin 통합 = B+C 하이브리드** (Stage 1 결과물 옵션 + Stage 2 toggle)
- **Status copy i18n cleanup** (DB enum 그대로, display 만)

### Phase 6 (Artist Roster + Inbound Track) 핵심 변경

기존 Phase 5+6 의 모든 작업 통합:
- Artist onboarding flow (Stage 1-4)
- `artist_profile` 테이블 + Twin asset metadata
- 권한 dial UI (Auto-decline / 노출 모드 / Bypass brands)
- Talent-Initiated Track Type 4 (Footage Upgrade) entry
- Routing logic (Auto-decline / Auto-route / Curated proposal)
- Brand → Artist 매칭 surface (Admin queue Layer 2 의 Artist candidates)
- Approval Gate workflow (Concept / Draft / Final)
- 라이선스 fee 정산 (campaign 단위)

### 코드 phase ↔ Twin Lab phase 매핑 (v1.1)

| Twin Lab phase | 코드 phase |
|---|---|
| Phase 1 (0-12mo) — Roster 1-5명, Inbound + Talent-Initiated | Phase 4 + **5 (Briefing)** + **6 (Roster + Inbound)** |
| Phase 2 (12-24mo) — Roster 5-20, T2 검증, 라이선스 fee | Phase 6 + 7 |
| Phase 3 (24+mo) — 보호 SaaS | Phase 9+ |

### Phase 5 timeline

**3주 sprint** (야기 결정). Phase 4.x lesson 반영 — original 5 day estimate 가 실제 5주 이상 → Phase 5 는 정직 estimate.

---

## §E — Section 7 후속 산출물 갱신

v1.0 의 Section 7 그대로 유효. 추가 산출물:

6. **Phase 5 KICKOFF spec** — Briefing Canvas 작업 분해. 작성 중 (chat 협업).
7. **briefing_documents migration plan** — Phase 5 Wave A 안에서.
8. **Status copy i18n keys** (KO + EN) — Phase 5 Wave A 안에서.
9. **Detail page "현황" tab redesign spec** — Phase 5 Wave C.

### v1.0 항목들의 status update

| 항목 | v1.0 status | v1.1 status |
|---|---|---|
| IA-routes-and-surfaces.md | 작성 예정 | Notion 에 존재 (35201c1a-17f6-8124-a3a2-fb7841c3cace), local mirror 미동기화 |
| USER-JOURNEYS.md | 작성 예정 | Notion 에 존재 (35201c1a-17f6-812f-9cd4-c6c8f125d49a), local mirror 미동기화 |
| Slide narrative | 작성 예정 | Phase 5 ship 후 |
| Figma slides | 작성 예정 | Phase 5 ship 후 |
| Phase 4.x KICKOFF | 작성 예정 | ✅ 완료 (`.yagi-autobuild/phase-4-x/KICKOFF.md`) |

### Local mirror policy (v1.1 신규)

**핵심 결정**: Notion 만 source-of-truth = brittle. Builder/Codex K-05 가 reference 못 함. 따라서:

- PRODUCT-MASTER + IA-routes + USER-JOURNEYS = **Notion 정본 + local mirror 둘 다** 유지
- Local 위치: `.yagi-autobuild/PRODUCT-MASTER.md`, `.yagi-autobuild/IA-routes-and-surfaces.md`, `.yagi-autobuild/USER-JOURNEYS.md`
- 갱신 sequence: chat 에서 결정 → local file update → Notion 동기화 (배치)
- Builder 는 *local file* reference (Notion API 의존 X)

---

## §F — Section 8 Source Quotes 추가 (v1.1)

> "Brief는 form 이 아니라 협업 surface다."
> — Phase 5 Briefing Canvas paradigm 의 origin (chat 2026-05-02)

> "고객사 입장에서 뭐지 싶을 것 같음"
> — 현재 detail page 자각. "현황" tab default + 의뢰자 first view 재설계의 trigger

> "라우팅이 뭐지? — 사용자는 모름"
> — Status workflow 사용자 친화 워딩 결정의 origin

> "디지털 트윈만 고려한 product-master이긴 함"
> — Vision v1.0 의 한계 자각. v1.1 양면 명시 (AI IP 비주얼 스튜디오 + 두 축) 의 trigger

> "두 축은 같은 surface 위에서 만나며, 시간이 지날수록 새로운 IP 자산으로 확장 가능하다"
> — v1.1 one-liner 의 핵심. 미래 product evolution path 명시 (Twin → 캐릭터 / 스타일 / 페르소나)

---

## §G — Phase 5 KICKOFF 작성 prerequisite

v1.1 amendment lock 후 Phase 5 KICKOFF spec 작성 가능. KICKOFF 는 별도 문서 (`.yagi-autobuild/phase-5/KICKOFF.md`):

**Wave 분해 (proposal)**:
- **Wave A** — Foundation (briefing_documents schema + migrate 기존 data + interested_in_twin column + status i18n cleanup)
- **Wave B** — Briefing Canvas (Stage 1/2/3 IA + URL thumbnail + reference 분류 + budget/timeline sidebar + whiteboard expandable)
- **Wave C** — Detail page redesign ("현황" tab + status timeline + next action CTA per status)
- **Wave D** — ff-merge gate (visual review + Codex K-05 + smoke + main merge)

**Codex K-05 mandatory points**:
- briefing_documents schema migration (data integrity)
- 기존 jsonb → 신규 table migrate (data loss risk)
- `interested_in_twin` 추가 + RLS verify
- Detail page status timeline (의뢰자 시점 surface, 보안 영향 X 라 LOW)

**Timeline**: 3주 sprint, ~Wave A 5일 + Wave B 7-10일 + Wave C 5-7일 + Wave D 2-3일.

---

*v1.1 amendment 끝. Phase 5 ship 후 v1.2 amendment 추가 예정 (실제 ship 결과 + lessons).*
