# YAGI Studio — PRODUCT-MASTER

> 우리가 무엇을, 누구를 위해, 어떻게 만드는지에 대한 단일 source of truth.
> 이 문서가 변경되면 코드 / 디자인 / 마케팅 / 슬라이드 모두 영향받는다.

**Version**: v1.3 (2026-05-05)
**Status**: Active — Phase 5 ship 완료 (commit `c49f0f1`, branch `g-b-10-hf2`, main 머지 대기), Phase 6 KICKOFF drafting
**Owner**: 야기 (CEO)
**Source documents**:
- Twin Lab Concept Document (사업 vision)
- yagi-design-system v1.0 (`C:\Users\yout4\.claude\skills\yagi-design-system`)
- Phase 1.0 ~ 5.x 의 누적 결정사항
- Notion mirror: https://www.notion.so/35101c1a17f6801ebcecd0379ae19611

---

> **⚠️ READING ORDER NOTE**:
> v1.1 amendment 가 **Section 0 / Section 4.4 / Section 5 / Section 7** 을 갱신함. v1.0 의 해당 섹션 읽기 전에 *반드시* 문서 끝의 **`v1.1 Amendment`** 섹션부터 read. v1.0 내용은 *역사적 reference + 갱신 안 된 섹션 (1, 2, 3, 4.1-4.3, 4.5-4.7, 6, 8)* 에 한해 유효.
>
> v1.2 amendment = Phase 5 Wave C entry 직전 status display wording 정정 (§H, §I).
>
> **v1.3 amendment = Phase 6 entry prep (이 문서 끝부분)**. Artist surface scope lock + 제품 워딩 룰 + Phase 5 lessons. Phase 6 작업 전 필독.

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

> ⚠️ **v1.3 NOTE** — 아래 Type 1-4 는 *internal 운영 분류*. 제품 surface (Artist 가 보는 UI) 에 노출 X. Artist 는 [새 프로젝트 시작] 단일 entry 만 봄. Briefing Canvas 가 어떤 needs 든 흡수. v1.3 Amendment §K 참조.

| Type | 정의 | 예시 | 라이선스 fee |
|---|---|---|---|
| **Type 1 — Pure Creative** | 본인 기획 창작 프로젝트 | 뮤비 AI VFX, 콘셉트 티저, 솔로 비주얼, 팬 콘텐츠 | 면제 |
| **Type 2 — Self-Sponsored Ad** | 본인 채널/D2C 광고 | 본인 인스타·유튜브용 협찬 광고, 본인 브랜드 광고 | 면제 |
| **Type 3 — External Brand Boost** | 외부 Brand 와 따온 광고를 야기 통해 보강 | 외부 광고주 brief 기반 AI VFX, 외부 계약 작업의 푸티지 업그레이드 | 면제 (Artist : 외부 Brand 계약 별도) |
| **Type 4 — Footage Upgrade** | 기존 푸티지 AI 업그레이드 | 소장 영상 AI 보강, 과거 작업 리마스터 | 면제 |

> v1.3 추가: Type 3 (External Brand Boost) — 야기가 lock한 use case. Artist 가 외부에서 받은 광고 작업을 야기 팀의 AI 능력으로 보강하는 케이스. 제품 surface 에는 별도 entry 없음 — Briefing Canvas Step 3 의 toggle (`projects.has_external_brand_party`) 로 흡수.

---

## Section 3 — Data Model (v1.0 base)

> Phase 5 Wave A 에서 `briefing_documents` 신규 + `interested_in_twin` 추가됨. v1.1 §B 참조.
>
> Phase 6 에서 추가 예정: `artist_profile`, `project_routing`, `project_approvals`, `project_licenses`, `projects.has_external_brand_party` (boolean). v1.3 §L 참조.

(이전 v1.0 schema 본문 — 생략. Notion 정본 또는 .yagi-autobuild/ phase-3-0/ 의 migration 참조)

---

## Section 4 — Surface Architecture

> ⚠️ **v1.1 SUPERSEDED for §4.4** — Brand wizard 옵션 C 는 Phase 5 Briefing Canvas 로 전면 재설계. v1.1 Amendment §C 참조.
>
> v1.2 §H §I = status display wording 정정 (Phase 5 Wave C 적용).
>
> v1.3 §K = Artist surface scope (Phase 6 entry).

(이전 v1.0 surface 본문 — 생략. 운영 reference 용)

### 4.5 Artist onboarding (v1.0 — 그대로 유효)

플랫폼 외부 미팅 중심. 시스템은 결과 기록 + 권한 관리.

| Stage | 야기 작업 | 시스템 surface |
|---|---|---|
| 1. 가입 | 야기 직접 invite (오픈 가입 X) | Magic-link 초대 |
| 2. 미팅 예약 | 외부 (이메일/전화) | 시스템 X (Phase 5+ 옵션) |
| 3. YAGI 외부 작업 | 야기 팀 직접 자료 수집 (사진/음성/영상) + Twin 학습 | R2 prefix `twins/{artist_id}/` |
| 4. 활성화 | 권한 dial 설정 후 Roster 노출 | `artist_profile` 활성 |

---

## Section 5 — Phase Roadmap

> v1.1 §D = Phase 5/6 swap. 현재 valid.
>
> v1.3 §M = Phase 5 ship 완료 + Phase 6 entry plan.

(이전 v1.0 roadmap — v1.1 §D 로 supersede)

---

## Section 6 — Open Questions / Deferred (v1.0)

(이전 v1.0 본문 — 생략. v1.3 §N 에 Phase 6 entry 시 lock 필요한 항목 명시)

---

## Section 7 — 후속 산출물 (v1.0)

> v1.1 §E = 갱신.
>
> v1.3 §O = Phase 5 ship 후 산출물 update + Phase 6 산출물 추가.

---

## Section 8 — Source Quotes (v1.0)

> v1.1 §F = 추가 quotes.
>
> v1.3 §P = Phase 5 ship + Phase 6 entry quotes 추가.

---

## Changelog

- **v1.0 (2026-04-30)** — 최초 작성. Twin Lab Concept Document + Phase 1.0~3.1 누적 결정 + Higgsfield framing 통합. 야기 직접 review + ✓ 확정.
- **v1.1 (2026-05-02)** — Phase 5 paradigm shift (Briefing Canvas) + Phase 5/6 swap + Vision 양면 명시. Section 0 / 4.4 / 5 / 7 갱신. Amendment 섹션 = append-only.
- **v1.2 (2026-05-04)** — Phase 5 Wave C entry 직전 §C.3 / §C.4 의 status enum mismatch 정정. 9-state 완비. `delivered` = "시안 도착" 재정의.
- **v1.3 (2026-05-05)** — Phase 5 ship 완료 (commit c49f0f1, hf2 main 머지 대기). Phase 6 entry prep — Artist surface scope lock + 제품 워딩 룰 (internal vs UI 분리) + Type 3 (External Brand Boost) 추가 + Phase 5 lessons.

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

(이전 v1.1 본문 그대로 — 생략. Phase 5 Wave A 에서 적용 완료)

---

## §C — Section 4 Surface Architecture 갱신

(이전 v1.1 본문 그대로 — 생략. Phase 5 Wave B/C 에서 적용 완료)

---

## §D — Section 5 Phase Roadmap SWAP

### Phase 5/6 swap 결정

기존 v1.0:
- Phase 5 = Artist workspace 도입
- Phase 6 = Inbound Track 가동

새 v1.1:
- **Phase 5 = Briefing Canvas (의뢰자 협업 surface)**
- **Phase 6 = Artist Roster + Inbound Track 통합**

(이전 v1.1 본문 그대로 — 생략)

---

## §E — Section 7 후속 산출물 갱신

(이전 v1.1 본문 그대로 — 생략)

---

## §F — Section 8 Source Quotes 추가 (v1.1)

(이전 v1.1 본문 그대로 — 생략)

---

## §G — Phase 5 KICKOFF 작성 prerequisite

(이전 v1.1 본문 그대로 — Phase 5 KICKOFF 는 작성 + 실행 + ship 완료. v1.3 §M 에 결과 업데이트)

---

*v1.1 amendment 끝. v1.2 / v1.3 amendment 가 아래에 append-only 로 추가됨.*

---
---

# v1.2 Amendment (2026-05-04)

> append-only. Phase 5 Wave C entry 시점에서 §C.3 / §C.4 의 컨셉 wording vs 실제 DB 9-state mismatch 자각 → 정정.

## Amendment trigger

Phase 5 Wave C SPEC drafting 중 §C.3 / §C.4 의 status enum (`routing`, `approval_pending`) 이 실제 DB 9-state CHECK constraint 에 없음을 발견 (Phase 3.0 migration `20260427164421_phase_3_0_projects_lifecycle.sql` 의 `projects_status_check`). v1.1 amendment 의 컨셉적 wording 이 실제 schema 와 어긋남.

→ Wave C entry 직전 §C.3 / §C.4 표 정정 + 누락된 status (submitted / in_revision / approved / cancelled / archived) 추가 + `delivered` 의미 재정의.

---

## §H — §C.3 v1.2 (status display wording, 9-state 완비)

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

핵심 — `delivered` = "시안 도착" 재정의:

is_valid_transition matrix 에서 `delivered → in_revision` / `delivered → approved` 둘 다 client transition. 의미: 의뢰자가 *시안 받고 검토 → 승인 또는 수정 요청* 분기. v1.1 의 "최종 납품" 워딩은 "일이 끝났다" 잘못된 인상. "시안 도착" 이 paradigm-clean.

`approved` = 진짜 의뢰자 최종 승인. 그 후 야기 팀 archived + 정산.

> v1.1 §C.3 의 `routing` (디렉터 매칭) / `approval_pending` (시안 확인) 두 enum 은 *실제 DB 에 없음*. `routing` 은 Phase 6 inbound track 도입 시 추가 예정. `approval_pending` 은 본 v1.2 에서 `delivered` 의 의미 재정의로 흡수.

---

## §I — §C.4 v1.2 (status-별 next action CTA, 9-state 완비, delivered 1-CTA 축소)

(이전 v1.2 본문 그대로 — Phase 5 Wave C 에서 적용 완료)

---

## §J — Wave C 외 영향

(이전 v1.2 본문 그대로)

---

*v1.2 amendment 끝.*

---
---

# v1.3 Amendment (2026-05-05)

> append-only. Phase 5 ship 완료 (commit `c49f0f1`, branch `g-b-10-hf2`, main 머지 대기) + Phase 6 entry prep. Artist surface scope lock + 제품 워딩 룰 (internal vs UI 분리) + Type 3 (External Brand Boost) 추가 + Phase 5 lessons.

## Amendment trigger

Phase 6 Artist surface 빌딩 직전, 새 chat 에 spec drafting 시 다음 자각:

1. **워딩 risk** — Internal 운영 용어 (Routing / RFP / Track / D2C / Footage Upgrade / Approval Gate / License fee 등) 가 제품 UI 에 노출되면 고객이 어색함. Lock 필요.
2. **Talent-Initiated Type 1-4 분류는 internal-only** — Artist UI 에는 [새 프로젝트 시작] 단일 entry 만. Briefing Canvas 가 모든 needs 흡수.
3. **외부 광고주 use case 누락** — Artist 가 외부에서 따온 광고를 야기 통해 보강하는 케이스 = 흔한 use case 인데 v1.0/v1.1 에 미명시. Type 3 로 명시 + Briefing Canvas Step 3 toggle (`projects.has_external_brand_party`) 로 흡수.
4. **Phase 5 lessons** — 3주 estimate → 실제 약 5주 (hf2 까지). Wave 분해 정직 estimate + ff-merge gate 별도 wave 분리 의 효과 확인. Phase 6 도 동일 패턴.

---

## §K — Artist Surface Scope (Phase 6 entry lock)

### Artist workspace 진입 시 메인 화면 (제품 워딩 확정)

```
┌─────────────────────┐  ┌─────────────────────┐
│  새 프로젝트 시작     │  │  브랜드 협업 제안    │
│                      │  │                      │
│  AI VFX, 광고 보강,  │  │  3건 대기 중 ⓘ      │
│  콘텐츠 제작 등       │  │                      │
└─────────────────────┘  └─────────────────────┘
```

### Entry 1: [새 프로젝트 시작] — Talent-Initiated 단일 surface

Briefing Canvas 그대로 재사용 (Brand 와 동일 surface, 시점만 Artist).

흡수하는 사용 시나리오 (모두 *한 entry* 로 — Type 분류 UI 노출 X):
- **Type 1 (Pure Creative)**: 본인 IP 로 AI VFX 신규 작업
- **Type 2 (Self-Sponsored Ad)**: 본인 채널 광고 (자기 인스타/유튜브 등)
- **Type 3 (External Brand Boost)** ⭐ NEW: 외부 Brand 와 따온 광고를 야기 통해 보강 → Step 3 toggle 로 인지
- **Type 4 (Footage Upgrade)**: 기존 영상 푸티지 AI 업그레이드

Step 3 에 toggle 1개 (제품 워딩):
```
☐ 외부 광고주가 있는 작업입니다
   (계약서 / brief 자료가 있다면 첨부 부탁드려요)
```

→ internal flag: `projects.has_external_brand_party` (boolean, default false)
→ 야기 admin 검토 시 외부 계약 인지 즉시 파악 (라이선스 / 정산 / 결과물 권리 다르게 처리)

본인 IP 작업 = 라이선스 사용료 면제 (자기 IP 자기 사용).

### Entry 2: [브랜드 협업 제안] — Inbound Track Artist 시점

야기 팀이 Brand RFP 검토 후 선별해서 보낸 제안 큐.

Artist 시점 흐름:
- 받은 제안 목록 (배지: "3건 대기 중" 같은 카운트)
- 각 카드 = Brand info 일부 + 작업 개요 + 야기 팀 추천 메시지
- [수락 / 거절] 버튼

야기 admin 시점 (internal, 제품에 노출 X):
```
Brand RFP 들어옴 → admin queue → 검토 → 5가지 결정 옵션:
  a. Direct (Twin 없이 야기 팀 작업 — Direct Track 으로 전환)
  b. Inbound — Artist 1명 추천
  c. Inbound — Artist 2-3명 후보 제시
  d. Brand 에게 정보 추가 요청
  e. 거절

(b/c) 결정 시 → Artist 권한 dial 자동 필터 통과 → Artist 의 [브랜드 협업 제안] 큐
```

핵심 design 원칙 (4/30 lock, 유효):
1. Match score 는 보조. 자동 결정 절대 X. 야기 큐레이션 노트가 main
2. 모든 결정 정보 한 화면 — scroll/탭 최소화
3. Twin intent 가 첫 분기점 (undecided / specific / no_twin 별 surface)
4. History 기록 — 모든 admin 결정 audit trail

### 권한 dial → 제품 워딩 = "수신 설정"

Internal 명: Auto-decline / 노출 모드 / Bypass brands
제품 surface UI: **"수신 설정"** 화면 안에서:
- 자동 거절 카테고리 (술 / 도박 / 정치 등 체크박스)
- 휴식 모드 토글 (켜면 새 제안 안 받음)
- 거절 브랜드 (특정 Brand 차단)

---

## §L — Phase 6 Schema 추가 (proposal — KICKOFF 에서 lock)

```sql
-- artist_profile (신규)
CREATE TABLE artist_profile (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Twin asset metadata
  twin_status text CHECK (twin_status IN ('not_started', 'training', 'active', 'paused')),
  twin_r2_prefix text,  -- twins/{artist_id}/
  -- 권한 dial (수신 설정 UI 와 매핑)
  auto_decline_categories text[] DEFAULT '{}',
  visibility_mode text CHECK (visibility_mode IN ('open', 'paused')) DEFAULT 'paused',
  bypass_brand_ids uuid[] DEFAULT '{}',
  -- meta
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- projects.has_external_brand_party (신규 컬럼) ⭐
ALTER TABLE projects
  ADD COLUMN has_external_brand_party boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN projects.has_external_brand_party IS
  'Type 3 External Brand Boost flag — Artist 가 외부 Brand 와 따온 광고 작업';

-- project_routing (신규) — Inbound Track admin 결정 audit trail
CREATE TABLE project_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  decision_type text NOT NULL CHECK (decision_type IN (
    'direct', 'inbound_single', 'inbound_multiple',
    'request_more_info', 'declined'
  )),
  artist_workspace_ids uuid[] DEFAULT '{}',  -- inbound_* 시 후보 list
  curation_note text,
  decided_by uuid NOT NULL REFERENCES profiles(id),
  decided_at timestamptz NOT NULL DEFAULT now()
);

-- project_approvals (신규) — 시안 확인 workflow audit
CREATE TABLE project_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  stage text NOT NULL,  -- 'concept' | 'draft' | 'final' (Phase 6 KICKOFF 시 lock)
  decision text NOT NULL CHECK (decision IN ('approved', 'revision_requested')),
  comment text,
  decided_by uuid NOT NULL REFERENCES profiles(id),
  decided_at timestamptz NOT NULL DEFAULT now()
);

-- project_licenses (신규) — 라이선스 / 정산
CREATE TABLE project_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  artist_workspace_id uuid REFERENCES workspaces(id),
  -- 정산 internal 워딩, UI 노출 시 "사용료" / "활용 수익"
  license_fee_amount numeric(12, 2),
  yagi_share_amount numeric(12, 2),
  artist_share_amount numeric(12, 2),
  campaign_id text,  -- 외부 campaign 식별자 (선택)
  status text CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

⚠️ Phase 6 KICKOFF 시 K-05 mandatory:
- artist_profile RLS (Artist 본인만 read/update, yagi_admin bypass)
- project_routing RLS (yagi_admin only — internal audit)
- project_approvals RLS (project workspace member + yagi_admin)
- project_licenses RLS (Artist 본인 share 만 read, yagi_admin 전체)
- has_external_brand_party 컬럼 RLS (status='draft' 만 update — sub_5 패턴 재사용)

---

## §M — 제품 워딩 룰 (Phase 6 entry lock, CRITICAL)

### Internal-only 용어 (운영 문서 / 코드 / DB 필드명 / admin tool 에서만 사용)

UI 에 절대 노출 X:

| Internal | 절대 UI 노출 X 이유 |
|---|---|
| Routing / Inbound Track / Direct Track / Talent-Initiated | 의뢰자 / Artist 가 모르는 운영 카테고리 |
| RFP | 마케팅 jargon. Brand UI 에서도 "의뢰" 로 통일 |
| D2C / Self-Sponsored Ad | jargon. Artist UI 에서 "본인 채널 광고" |
| Footage Upgrade | 업계어. Artist UI 에서 "기존 영상 보강" 또는 자연스러운 description |
| Approval Gate | internal workflow 명. UI 에서 "검토 단계" / "시안 확인" |
| Bypass brands | UI 에서 "거절 브랜드" |
| Auto-decline | UI 에서 "자동 거절 카테고리" |
| License fee | UI 에서 "사용료" 또는 "활용 수익" |
| Curation note | 외부 노출 없음. Artist 에게는 "야기 팀의 추천 메시지" |
| Type 1 / Type 2 / Type 3 / Type 4 | Artist UI 에 절대 노출 X. Briefing Canvas 가 알아서 흡수 |
| Roster | 한국어 UI 어색. "소속 아티스트" / "아티스트 명단". 영문 UI 는 Roster 유지 |

### 제품 surface 워딩 (UI 에 그대로 노출)

| 워딩 | 사용처 |
|---|---|
| Artist / 아티스트 | K-pop 산업 표준, 한국어 그대로 OK |
| Digital Twin / Twin | 4/30 결정, brand 워딩과 동일 |
| 의뢰 / 새 프로젝트 / 시안 / 승인 / 수정 요청 | 모든 surface 공통 |
| 새 프로젝트 시작 | Artist Entry 1 |
| 브랜드 협업 제안 | Artist Entry 2 |
| 수신 설정 | Artist 권한 dial UI 화면명 |
| 자료 추가하기 / 브리프 완성하기 / 시안 보기 | Status 별 next action CTA (v1.2 §I) |

### Builder / 새 chat / Codex 가 spec / 코드 generate 시 cross-check 룰

1. UI generate 시 위 internal 용어 사용 → 즉시 stop, chat 으로 야기 확인 요청
2. 새 워딩 도입 시 PRODUCT-MASTER §M 표에 추가 반영 (chat → local file → Notion sync 룰)
3. Skill (`yagi-design-system`) 에 워딩 룰 cross-reference 추가 (Phase 6 KICKOFF 시 task 로 lock)

---

## §N — Phase 6 KICKOFF 시 lock 필요한 결정사항

PRODUCT-MASTER §6 deferred 항목 중 Phase 6 entry 시 확정 필요:

1. **첫 Roster Artist 1-2명 협상** — 사용료 분배 비율 (Artist : YAGI %)
2. **시안 확인 단계** — Concept / Storyboard / 1차 시안 / Final 중 어디까지?
3. **Match score 알고리즘** — Phase 6 시작 = admin 직접 큐레이션. Rule-based 전환 시점 = 언제?
4. **분쟁 처리 escalation flow**
5. **첫 활성 entry** — [새 프로젝트 시작] 만 vs [브랜드 협업 제안] 도 동시? (야기 권장: [새 프로젝트 시작] 먼저, Roster 1-2명 영입 후 [브랜드 협업 제안] 활성)
6. **Workspace switcher UI 패턴** — Linear 식 (좌측 sidebar 하단) vs GitHub 식 (top bar dropdown) vs Slack 식 (좌측 column)?
7. **Artist invite flow** — Magic-link 직접 invite. 가입 시 onboarding wizard 있나 vs 야기가 외부 미팅 후 권한 dial 직접 set 만?
8. **Type 3 (External Brand Boost) 라이선스 처리** — Artist 가 외부 Brand 와 따로 계약. 야기는 제작비만? 아니면 외부 Brand 가 야기에게 직접 결제?

---

## §O — Phase 6 Wave 분해 (proposal, KICKOFF 시 lock)

- **Wave A** — Foundation (`artist_profile` schema + workspace switcher UI + Artist invite flow + 워딩 룰 skill cross-reference)
- **Wave B** — [새 프로젝트 시작] entry (Briefing Canvas Artist 시점 재사용 + 외부 광고주 toggle + `projects.has_external_brand_party` 컬럼)
- **Wave C** — Admin Queue Layer 2 (Brand RFP 검토 → Artist 매칭 surface, internal admin tool, project_routing 테이블)
- **Wave D** — Artist [브랜드 협업 제안] 큐 (받은 제안 + 수락/거절)
- **Wave E** — 권한 dial UI ("수신 설정")
- **Wave F** — 시안 확인 workflow + 사용료 정산 (project_approvals + project_licenses)
- **Wave G** — ff-merge gate

**Timeline 예상**: 4-5주 sprint (Phase 5 lesson 반영 — 정직 estimate).

---

## §P — Phase 5 Lessons + Source Quotes 추가 (v1.3)

### Phase 5 lessons.md (TBD — Phase 5 hf2 main 머지 후 작성)

핵심 lesson 후보 (chat 협업으로 정리):
- 3주 estimate → 실제 ~5주. 4-5주가 정직 estimate
- Wave 분해 + ff-merge gate 분리 의 효과 확인
- K-05 LOOP 1/2 패턴 안정화. Tier 분류 (HIGH/MED/LOW) + scale-aware rule 효과적
- Wave hotfix 1/2 의 자연스러운 진입 — visual review 가 매번 발견하는 mismatch
- 새 chat 의 80% 정확 + 20% 환각 패턴 — verify-before-cite 룰 (메모리 #23) 가 효과적

### Quote (v1.3 추가)

> "라우팅 같은 단어가 product 에 반영되면 안 되니까. D2C 이런 것도 고객사가 느끼기에 너무 product 적 워딩같다고 느낄 수도 있음."
> — Phase 6 entry 직전 워딩 룰 lock 의 origin (chat 2026-05-05). v1.3 §M.

> "메인으로 아티스트가 우리를 통해 진행할 거는 AI VFX, 브랜드 우리 통해서 들어온 딜 수락 및 협업이야."
> — Artist surface scope lock (Entry 1 + Entry 2 의 origin). v1.3 §K.

> "외부에서 광고 받았는데 우리 팀을 통해서 더 멋지게 구성하고 싶은 욕구도 있을 수 있는데 이건 어떻게 처리하면 좋지?"
> — Type 3 External Brand Boost 의 origin. Briefing Canvas Step 3 toggle 흡수 결정. v1.3 §K + §L.

---

*v1.3 amendment 끝. Phase 6 entry barrier = (1) Phase 5 hf2 → main ff-merge, (2) Phase 5 lessons.md 작성, (3) 본 v1.3 amendment Notion sync. 모두 완료 후 Phase 6 KICKOFF 작성 진입.*
