# Phase 2.7 — Follow-ups

**Scope:** Items deferred from Phase 2.7 or discovered during Phase 2.7 execution.

---

## FU-2.7-1 — Escrow payment integration (TossPayments)

**Priority:** HIGH (Phase 2.8)
**Size:** phase-scale (~1 week)
**Rationale:** MVP는 brokerage-only. Escrow 도입 시 매칭 신뢰도 급상승.
**Dependencies:** Phase 2.7 SHIPPED + 초기 거래 10-30건 경험

---

## FU-2.7-2 — Creator earnings dashboard

**Priority:** MEDIUM
**Size:** 2-3 days
**Rationale:** Creator가 자기 누적 수익/수수료/다음 정산 시점 확인.
**Dependencies:** Phase 2.8 escrow 우선

---

## FU-2.7-3 — Client team seats (multi-user per company)

**Priority:** MEDIUM-HIGH (엔터프라이즈 확장 필수)
**Size:** phase-scale
**Rationale:** 대기업은 한 명이 모든 의뢰를 관리하지 않음. 팀 단위 client 필요.
**Dependencies:** Phase 3+

---

## FU-2.7-4 — Challenge-to-commission conversion

**Priority:** MEDIUM
**Size:** 2-3 days
**Rationale:** Challenge 우승자에게 client가 직접 commission 의뢰 워크플로우.
**Current workaround:** Admin manual matching, client가 explicit하게 creator 지정.
**Dependencies:** Phase 2.8

---

## FU-2.7-5 — Subscription billing (Premium client plan)

**Priority:** MEDIUM
**Size:** phase-scale
**Rationale:** `clients.plan = 'premium'` 과금 실현.
**Dependencies:** Phase 2.9+

---

## FU-2.7-6 — Multi-currency + international client

**Priority:** LOW-MED
**Size:** phase-scale
**Rationale:** 해외 client (글로벌 레이블) 대비.
**Dependencies:** Phase 2.9+

---

## FU-2.7-7 — AI-assisted proposal matching

**Priority:** LOW
**Size:** research + phase-scale
**Rationale:** Creator 포트폴리오와 project brief 유사도 스코어링 → 자동 shortlist 추천.
**Dependencies:** 데이터 축적 6개월+

---

## FU-2.7-8 — Public review/rating system

**Priority:** MEDIUM
**Size:** 1 week
**Rationale:** Creator/Client 상호 피드백 → 장기 신뢰 형성.
**Dependencies:** 초기 거래 50건+

---

## FU-2.7-9 — Dispute resolution structured workflow

**Priority:** MEDIUM
**Size:** 1 week
**Rationale:** 현재는 `disputed` state + admin manual 중재. 구조화된 흐름 필요.
**Dependencies:** 첫 분쟁 사례 발생 시

---

## FU-2.7-10 — Migra font license + self-host

**Priority:** LOW (cosmetic)
**Size:** 2-4 hours
**Rationale:** MVP는 Playfair Display 무료. Migra로 교체 시 편집 톤 격상.
**Cost:** $149-199
**Dependencies:** post-launch revenue 안정화

---

## FU-2.7-11 — Contract PDF 고급화 (직인, 공인전자문서)

**Priority:** LOW-MED
**Size:** 1-2 weeks (법무 검토 포함)
**Rationale:** 계약 법적 효력 강화. 현재는 전자서명 + 기록 보관으로 MVP 적법.
**Dependencies:** 매출 규모 확대 + 법무 상담

---

## FU-2.7-12 — 정보통신망법 marketing opt-in (FU-1 from Phase 2.5 carryover)

**Priority:** MED (legal)
**Size:** 2-3 days
**Rationale:** Phase 2.7 신규 notification kinds가 legal 범주 재평가 필요. Transactional vs marketing 구분.
**Dependencies:** 첫 사용자 100명 전에 해결 필요

---

## FU-2.7-13 — Challenge winner → Client inbound

**Priority:** MEDIUM
**Size:** 1 week
**Rationale:** 챌린지 우승작을 본 client가 "이 creator와 directly 작업하고 싶다" 버튼 → 자동 invite_only project 생성.
**Dependencies:** Phase 2.7 안정화 + 챌린지 볼륨 10+건

---

## FU-2.7-14 — Creator 팀 구성 (Studio + individual creators collaboration)

**Priority:** LOW
**Size:** phase-scale
**Rationale:** 복합 프로젝트에서 Studio가 개인 creator를 sub-hire.
**Dependencies:** Phase 3+

---

## FU-2.7-15 — Advanced analytics (client conversion funnel, creator earning trends)

**Priority:** LOW
**Size:** 2 weeks
**Rationale:** 비즈니스 의사결정용 대시보드.
**Dependencies:** 6개월+ 데이터 축적

---

**Registered:** 2026-04-24 Phase 2.7 SPEC v1 authoring
