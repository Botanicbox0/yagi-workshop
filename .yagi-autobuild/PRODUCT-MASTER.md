

---
---

# v1.6 Amendment (2026-05-05, post-v1.5, Phase 7 PIVOT)

> Historical amendment note. **Phase 7 재정의 — Challenge (contest) → Distributed Campaign (mass content marketing)**.
> 야기 vision pivot (chat 2026-05-05): "야기의 진짜 product = K-pop AI 콘텐츠 마케팅의 Distributed Campaign.
> Challenge = me-too 사례 있음 (KAICF). Phase 7 SPEC v2 deprecated.
> Manual creator pool 영입 + 기존 AI 제작자 네트워크 활용 = creator pool 0명 risk 해결."

## Pivot rationale

| | Challenge (deprecated) | **Distributed Campaign** (new Phase 7) |
|---|---|---|
| Sponsor 비용 | 상금 부담 (high CAC) | Marketing budget (sustained spend) |
| Creator incentive | 입상 (low retention) | 본인 채널 노출 + algorithm 보상 (high retention) |
| 비즈니스 모델 | 1회 contest hosting fee | **B2B SaaS for K-pop content marketing** |
| Recurring revenue | 약함 | 강함 (가수 = paying customer 지속) |
| 차별화 | KAICF me-too risk | 야기 unique (AI + K-pop + creator pool) |

야기 conditions check (Phase 8 first risk 직접 해결):
- ✅ "이미 좋은 AI 제작자 네트워크" — Creator pool manual 영입 가능
- ✅ "Manual 영입 자신 있음" — 첫 batch 5-10명 partner pool 즉시 활성
- ✅ Network 통해 가수 client 영입 plan — platform ship 후 1-2주 안 첫 client

## §W — Distributed Campaign vision (Phase 7 entry lock)

### Distributed Campaign 정의

Sponsor (Artist workspace = 가수, 또는 admin self-host) 가 brief 게시 →
curated creator pool 이 본인 작품 제작 → admin 검수 → approved 작품을
**creator 가 본인 채널 (TikTok/IG/YouTube) 에 유포** → metric tracking.

**핵심 차이 vs Challenge**: 입상 X, 시상 X. *모든 검수 통과 작품* publish.
Creator 의 incentive = **본인 채널 노출** (algorithm 보상). 야기 platform =
matching + curation + tracking 서비스.

### Workflow (Phase 7 ship)

```
1. Sponsor (Artist 또는 admin) 가 campaign 작성
   - title, brief, reference_assets (stems / 참고 영상 / 가이드)
   - submission window (open ~ close)
   - file policy (R2 upload + 외부 URL 허용 여부)
   - compensation model (exposure_only / fixed_fee / royalty_share)

2. admin publish → status='published'

3. Creator (curated partner) 응모 — 응모 form 제출
   - email + 작가명 + 담당자 번호 + 작품 file/URL
   - 자동 light Creator workspace 생성 (workspace.kind='creator')
   - magic-link 자동 발송 (Talenthouse 패턴)

4. submission_close_at 도달 → 'submission_closed'

5. admin 검수 (단일 round) — campaign_submissions.status:
   - approved_for_distribution → creator 유포 진행
   - declined → 탈락 통보 (revision_requested 옵션)

6. Creator 가 approved 작품을 본인 채널 게시 → URL 등록
   - campaign_distributions row 생성
   - channel: tiktok / instagram / youtube / youtube_shorts / x / other
   - status='distributed'

7. metric tracking (manual log) — view / like / comment 수 등록
   - Phase 7 MVP = manual. API 자동 fetch = Phase 8+

8. campaign.status = 'distributing' (creator 들 유포 진행 중) → 일정 후 'archived'
```

### Sponsor 의 가치 proposition

- 가수가 본인 곡 brief + stems 공개 → 다수 creator 가 다양한 AI 영상 제작
- 다수 채널 동시 유포 = mass exposure + algorithm-friendly UGC pattern
- 단일 contest 대비 **지속적 multi-channel 노출**
- Marketing ROI = aggregate view 수 + engagement metric

### Creator 의 incentive

- 본인 채널 algorithm 보상 (조회수, 팔로워 증가)
- Roster 영입 funnel (우수 creator → admin invite to artist workspace)
- Optional: fixed_fee per creator (Phase 11 정산 ship 후)

---

## §X — Schema 재구성 (Phase 7 v3, replace §Q v1.4/v1.5)

5 테이블 (challenges → campaigns rename + workflow 재정의):

```sql
-- campaigns (replace challenges)
CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  brief text,                                -- Sponsor 의 creative direction
  reference_assets jsonb,                    -- stems / 참고 영상 URL list
  -- Sponsor
  sponsor_workspace_id uuid REFERENCES workspaces(id),  -- nullable: admin self-host
  has_external_sponsor boolean NOT NULL DEFAULT false,
  external_sponsor_name text,
  -- Status (Distributed Campaign workflow)
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'requested', 'in_review', 'declined',
    'draft', 'published', 'submission_closed',
    'distributing', 'archived'
  )),
  submission_open_at timestamptz,
  submission_close_at timestamptz,
  distribution_starts_at timestamptz,
  -- File policy (admin publish 시점 결정)
  allow_r2_upload boolean NOT NULL DEFAULT true,
  allow_external_url boolean NOT NULL DEFAULT true,
  -- Compensation
  compensation_model text CHECK (compensation_model IN (
    'exposure_only', 'fixed_fee', 'royalty_share'
  )) DEFAULT 'exposure_only',
  compensation_metadata jsonb,               -- e.g., {"fixed_fee_per_creator": 500_000}
  -- meta
  created_by uuid NOT NULL REFERENCES profiles(id),
  request_metadata jsonb,                    -- contact_phone 필수 (sponsor request 시)
  decision_metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- campaign_categories (참여 부문, e.g., "리믹스 영상", "AI 뮤비 단편")
CREATE TABLE campaign_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  format_spec jsonb,                         -- {"orientation": "vertical", "duration_max": 60}
  display_order int NOT NULL DEFAULT 0
);

-- campaign_submissions (replace challenge_submissions)
CREATE TABLE campaign_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES campaign_categories(id),
  applicant_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  applicant_email text NOT NULL,
  applicant_name text NOT NULL,
  applicant_phone text,                      -- 담당자 번호
  team_name text,
  -- 작품
  title text NOT NULL,
  description text,
  content_r2_key text,
  external_url text,
  thumbnail_r2_key text,
  duration_seconds int,
  -- Status (검수 + 유포 단순화 — round 0, 시상 0)
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'approved_for_distribution',
    'declined',
    'revision_requested',
    'distributed',
    'withdrawn'
  )),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  declined_at timestamptz,
  distributed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- campaign_review_decisions (replace challenge_judgings + challenge_awards)
CREATE TABLE campaign_review_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES campaign_submissions(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES profiles(id),  -- yagi_admin
  decision text NOT NULL CHECK (decision IN (
    'approved', 'declined', 'revision_requested'
  )),
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

-- campaign_distributions (NEW — creator 의 본인 채널 유포 metadata)
CREATE TABLE campaign_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES campaign_submissions(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN (
    'tiktok', 'instagram', 'youtube', 'youtube_shorts', 'x', 'other'
  )),
  url text NOT NULL,                         -- creator 의 본인 채널 게시물 URL
  posted_at timestamptz NOT NULL DEFAULT now(),
  -- Metric (Phase 7 MVP = manual log, Phase 8+ = API auto)
  view_count bigint,
  like_count bigint,
  comment_count bigint,
  metric_logged_at timestamptz,
  metric_log_notes text,
  -- meta
  added_by uuid REFERENCES profiles(id),    -- creator 또는 yagi_admin
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

⚠️ Phase 7 K-05 mandatory:
- campaigns RLS — sponsor (workspace user) + admin + public read for 'published'/'distributing'/'archived'
- campaign_submissions RLS — applicant 본인 + admin + public read for 'distributed' (시상 page 와 비슷한 public showcase)
- campaign_review_decisions RLS — yagi_admin only
- campaign_distributions RLS — applicant 본인 (본인 응모작 의 distribution add) + admin + public read for 'distributed' status submissions

---

## §Y — §K Artist three-entry update (replace v1.5 §K 확장)

PRODUCT-MASTER v1.5 §K 확장의 third entry **`[+ 챌린지 요청]` → `[+ 캠페인 요청]`**:

```
Artist workspace (Phase 7 ship 후):

[새 프로젝트 시작]      [브랜드 협업 요청]      [+ 캠페인 요청]
(Talent-Initiated)     (Inbound Track)         (Distributed Campaign)
Phase 6 ship            Phase 10 ship           Phase 7 ship (NEW)
                        (deferred / hidden)     (sponsor: 가수 가 fan 대상 캠페인)
```

Third entry = Artist (Roster) 가 sponsor 가 되어 캠페인 hosting:
- 예: 가수 A 가 "내 곡 vibe creators 에게" → curated AI creator pool 이 다양한 AI 영상 제작 → 본인 채널 유포
- 가수 IP / fanbase engagement / 마케팅 budget 활용

---

## §V update (replace v1.5 §V — Q1-Q8 lock 일부 update)

| Q | 답 lock (v1.6) |
|---|---|
| Q1 첫 캠페인 형태 | Route A (admin self-host) primary + Route B (Artist sponsor) — Phase 7 ship 후 1-2주 안 가수 영입 (network 활용) |
| Q2 워딩 | **"캠페인"** (Distributed Campaign 의 한국어 표면). "챌린지" 워딩은 Phase 9 (Challenge optional) 진입 시 결정 |
| Q3 응모자 가입 | 자동 magic-link (Talenthouse 패턴) — 변경 없음 |
| Q4 검수 round | 단일 검수 (admin approved / declined / revision_requested) |
| Q5 file 처리 | Hybrid (R2 + 외부 URL) — admin publish 시점 결정 |
| Q6 sponsor request 폼 | title + brief + reference_assets + 일정 의도 + 후원 의도 + **담당자 번호 (phone) 필수** |
| Q7 Compensation | Phase 7 MVP = exposure_only default. fixed_fee / royalty_share = column 만 도입, 정산 처리 = Phase 11 |
| Q8 Roster funnel UI | Phase 8 deferred (Creator Hub 와 함께) |

---

## §T update (Phase 정렬, replace v1.4 §T)

| Phase | Scope | 시간 |
|---|---|---|
| **Phase 7 (NEW)** | Distributed Campaign + Light Creator workspace | 6주 |
| **Phase 8** | Creator Hub 확장 (portfolio + browse + Roster funnel admin tool + distribution metric API auto-fetch 일부) | 4-5주 |
| **Phase 9 (optional, deferred)** | Challenge MVP — KAICF style contest hosting (was Phase 7 SPEC v2 vision) | 3-4주 |
| Phase 10 | Inbound Track (Brand RFP → Roster 매칭, Artist [브랜드 협업 요청] 큐) | 2-3주 |
| Phase 11 | 수신 설정 + 시안 confirm + 사용료/Compensation 정산 + ff-merge gate | 2-3주 |

**Total roadmap = 17-21주 (4-5개월)**.

Phase 9 (Challenge) = optional. Phase 7 (Distributed Campaign) ship 후 *시장 demand 있으면* 진입. 없으면 skip.

---

## Quote (v1.6)

> "챌린지에서 아티스트가 우리 partner creator한테 뮤직비디오 리믹스나
> 아니면 ai기반으로 새로운 뮤직비디오들을 제작해서 유포해달라고 요청도 할
> 수 있을 것 같다는 생각이 드는데... 이게 완전 new wave kick인것같은데"
> — Distributed Campaign vision 의 origin (chat 2026-05-05). v1.6 §W.

> "Manual 영입 자신 있음. 이미 좋은 AI 제작자 네트워크 있음."
> — Phase 8 first risk (Creator pool 0명) 의 직접 해결 근거 (chat 2026-05-05).
> Phase 7 = Challenge → Distributed Campaign pivot 정당화. v1.6 §W rationale.

> "phase 8부터 설계하면 안될까?"
> — Phase 7 pivot trigger (chat 2026-05-05). v1.6.

---

*v1.6 amendment 끝. Phase 7 SPEC v3 source-of-truth 확정. v2 (Challenge MVP) deprecated.*

---
---

# v1.8 Amendment (2026-05-09, post-Wave-C-v2-ship, NORTH STAR re-lock)

> Historical amendment note. v1.7 손실 (PRODUCT-MASTER 복구 사고) 으로 NORTH STAR 표현이
> 메모리/handoff 에 분산. 본 amendment 로 정본에 lock.
> 추가로 v1.6 §W 의 "B2B SaaS for K-pop content marketing" 표현이
> 회사/Product 정체성과 정합 안 됨을 인지 — 정정.
> 야기 chat 2026-05-09: "mass distribution 인가 우리 지향점이?" + "우리 SaaS 는 아니잖아"
> → 두 challenge 모두 root 에서 정확. 본 amendment 로 정본 정렬.

## §Z — NORTH STAR + 회사/Product 정체성 lock

### 회사 (㈜야기워크숍)

**"We extend who you are. Your identity, beyond limits."**

**AI Native Entertainment Studio.**

3 axes 모두 **Studio business** (SaaS 아님):

| Axis | 정체 | Identity Extension 대상 |
|---|---|---|
| YAGI Workshop (이 product) | AI Music Visual Studio | 뮤지션의 음악 IP |
| Digital Human IP Studio | AI Twin / 보이스클로닝 / 브랜딩 Studio | 개인의 identity |
| Original IP | Animation / IP Studio (KART ZERO, AI 아이돌) | 야기 자체 identity 창조 |

공통 root = **identity extension**. 3 axes 모두 같은 root 에서 분기.

### Product (YAGI Workshop)

**"AI Visuals for Musicians."**

**Tech-enabled AI Music Visual Studio + Distributed Campaign Platform.**

- **Core business**: AI Visual production studio (curation + production + relationship management)
- **Tech layer**: 자체 platform (sponsor 캠페인 발주, creator 응모, 검수, distribution tracking)
- **본질**: studio business with proprietary ops platform
- **결과 effect (NOT NORTH STAR)**: B2B recurring revenue, multi-channel exposure, mass distribution

핵심 패턴:

```
한 곡 → N명 creator 의 N가지 다양한 해석 → N개 채널 자연 amplify
        (curated diversity)              (creator-driven)
```

**Multiplication by diversity**, NOT mass quantity.

### 부정확한 표현 (사용 금지)

| ❌ 잘못된 표현 | 이유 | ✅ 정확한 표현 |
|---|---|---|
| "B2B SaaS" | multi-tenant self-serve software 정의와 안 맞음 (creator pool manual 영입, yagi 인력 적극 개입) | Tech-enabled production studio |
| "Mass distribution platform" | push 광고 느낌, creator-driven 본질 누락 | Distributed Campaign (creator-driven multi-perspective) |
| "AI 영상 마켓플레이스" | curation 이 본질이지 marketplace 아님 (수요-공급 자동매칭 X) | Curated AI creator network + production studio |
| "K-pop 캠페인 SaaS" | SaaS 분류 자체 부정확 | AI Native 음악 영상 스튜디오 |

### Means (실행 모델, NORTH STAR 아님)

- **Distributed Campaign 모델** = 한 곡 → N가지 해석 → N개 채널
- **Curated creator pool** = manual 영입 + 점진적 funnel
- **Multi-channel amplification** = creator algorithm 노출 (UGC pattern)
- **Self-serve interfaces** = sponsor 발주 / creator 응모 (yagi ops 효율화 layer)

### 정확한 표현 권장 (외부 communication 시)

**영문 (한 줄)**:
- "AI Native Music Visual Studio."
- "AI Visuals for Musicians, made by curated creators."
- "A workshop for AI-native music visuals." (회사 명칭 'Workshop' root 일치)

**한국어 (한 줄)**:
- "AI Native 음악 영상 스튜디오"
- "K-pop 뮤지션을 위한 AI Visual 스튜디오"

**사업 분류**:
- Tech-enabled production studio
- AI Native creative agency + proprietary platform
- Studio + Platform hybrid

**Marketing hooks**:
- *"한 곡, N가지 해석, N개 채널."*
- *"AI 시대 뮤지션의 visual extension."*
- *"From one song, many perspectives, many channels."*

## §AA — ICP + GTM (v1.7 손실 분 복원)

### 1차 ICP (Phase 7-8 ship 시점)

- **가수**: 인디 ~ 미들 K-pop 아티스트
  - SM/HYBE/JYP 외 mid-tier 레이블 소속 또는 인디
  - 본인 IP/곡 활용한 marketing budget 보유
- **레이블/매니지먼트**: 위 size 의 마케팅 담당자
- **진입 sequence**:
  1. 야기 acquaintance network 우선 (Phase 7 ship 후 1-2주 안 첫 client)
  2. Cold outreach (Phase 8+)
  3. Inbound (Phase 10 Inbound Track ship 후)

### 2차 ICP (Phase 10+ Inbound Track)

- **Brand 마케팅** — 뮤지션 IP 활용 캠페인 발주
- 음반사/엔터테인먼트 소속 마케팅 팀

### 3차 ICP (Phase 8+ Roster funnel)

- 우수 creator → Roster 영입 → 본인 곡 sponsor (Artist workspace)
- Bidirectional: Creator 가 sponsor 로 graduation

### Pricing model (잠정 — 별도 chat / amendment 에서 deep dive 필요)

Phase 7 ship 시점:
- 첫 client = 야기 network 기반, custom pricing 협의 단계
- 가격 모델 미정 (캠페인당 fee 가능성 높음)

Phase 8+ (확장 시점):
- 캠페인당 fee + creator pool access fee subscription 가능성
- 또는 monthly retainer (production studio 일반 모델)
- Compensation flow (sponsor → yagi → creator) 의 yagi share 포함

명시적 pricing 결정 = 별도 amendment 또는 별도 GTM 문서에서 lock.

### Creator pool curation criteria (Phase 8 Creator Hub 에서 deep dive)

Phase 7 ship 시점:
- Manual 영입 (야기 acquaintance network)
- Application form 없음 (invite-only)

Phase 8+ (확장 시점):
- Application form (포트폴리오, 채널 follower, AI tool 활용도)
- Tier system (verified / standard / new)
- Trial campaign 단계
- 명시적 criteria = 별도 amendment.

## §AB — PRODUCT-MASTER 복구 사고 정정

본 amendment 가 NORTH STAR + 회사/Product 정체성 정본. 다른 source (메모리, handoff, yagi-context skill, 외부 보고서) 와 충돌 시 **본 amendment 가 우선**.

복구 사고 실태 정정:

- **v1.0~v1.5 본문 전체** = 영구 손실
- **v1.7 amendment** = 영구 손실
- **v1.6 amendment** = 보존됨 (현재 PRODUCT-MASTER.md 의 유일한 남은 source)

이전 메모리 표현 ("v1.5 본문만 손실") 부정확. 메모리 정정 필요.

## §AC — 외부 communication 표현 정정 (즉시 적용)

### 청창사 보고서 / 투자자 deck / 첫 client pitch 표현

**이전 (수정 대상)**:
> "K-pop·뮤지션 대상 AI 영상 콘텐츠 분산 캠페인 SaaS 플랫폼 'YAGI Workshop'"

**정확한 표현 — 3가지 길이 옵션**:

**Option 1 (1줄, 30자)**:
> AI Native 음악 영상 스튜디오 'YAGI Workshop'

**Option 2 (2-3줄, 80자)** — 청창사 보고서 권장:
> 뮤지션을 위한 AI 영상 production studio + 분산 캠페인 platform 'YAGI Workshop'.
> 큐레이션된 AI 크리에이터 네트워크가 한 곡을 다양한 해석으로 제작 후 각자의 채널에 amplify.

**Option 3 (자세히, 4-5줄)** — 투자자 deck 권장:
> K-pop 뮤지션이 본인 음악과 정체성을 다양한 AI 크리에이터의 다양한 해석으로 확장하고
> 각 채널에서 자연스럽게 amplify 되는 AI Native 음악 영상 스튜디오 'YAGI Workshop'.
> 자체 platform 으로 sponsor 캠페인 발주, creator 응모/검수, distribution tracking 까지
> end-to-end 관리. Phase 7 (Distributed Campaign) Production 배포 완료
> (https://studio.yagiworkshop.xyz). Phase 8+ Creator Hub + Inbound Track 으로 확장 예정.

### 회사 소개 표현

**이전 (수정 대상)**:
> "AI Native Entertainment Studio. Digital Human IP Studio + AI 아이돌 + KART ZERO 어린이 애니메이션 IP."

**정확한 표현 (NORTH STAR + 3 axes 정렬)**:
> ㈜야기워크숍 — AI Native Entertainment Studio.
> "We extend who you are. Your identity, beyond limits."
> Identity extension 을 root 로 3 axes 운영:
> ① YAGI Workshop (AI Music Visual Studio, 뮤지션 IP)
> ② Digital Human IP Studio (AI Twin, 개인 identity)
> ③ Original IP (KART ZERO, AI 아이돌, 자체 IP 창조).

## Quote (v1.8)

> "mass distribution 인가 우리 지향점이? 다시 한 번 대화를 보면서 생각해봐."
> — chat 2026-05-09. v1.6 §W 의 "mass content marketing" + 후속 표현이
> means/effect 와 ends 혼동시킴 인지. v1.8 §Z 정정 trigger.

> "우리 saas 는 아니잖아."
> — chat 2026-05-09. v1.6 §W "B2B SaaS for K-pop content marketing" 표현이
> Studio 정체성과 정합 안 됨 인지. v1.8 §Z 정정 trigger.

---

*v1.8 amendment 끝. NORTH STAR + 회사/Product 정체성 + ICP/GTM source-of-truth lock.*
*다음 amendment 후보: §AD pricing model lock, §AE creator curation criteria, §AF 회사 vision deck (3 axes 정렬 narrative).*

---
---

# v1.9 Amendment (2026-05-11, Wave C v2 ship retrospective — Locale-Free Route Checklist lock)

> Historical amendment note. Wave C v2 ship 진행 중 3개 hotfix (HIGH-7/8/9) 가 모두
> **"신규 locale-free public route 도입 패턴"** 의 일부로 드러남을
> 인지. v1.8 footer 의 §AD pricing model lock 안내는 넓은 의미의 next-amendment
> 후보였으나, 해당 후보는 별도 amendment (v1.10+) 로 소괄. 이번 §AD는
> 실제 retrospective의 긴급도가 더 높은 구조 lock 용도.
>
> Trigger: Wave C v2 production smoke (chat 2026-05-11) 에서 세 번 연속 404 / 500 / 500
> 발생. 매번 다른 증상 표출, 하나의 근원적 원인.

## §AD — Locale-Free Public Route Checklist (PRE-SHIP)

### Trigger — Wave C v2 3 hotfix 패턴

| Hotfix | 증상 | 누락된 것 |
|---|---|---|
| **HIGH-7** | `/campaigns/[slug]/submit` → 404 | middleware matcher 의 negative lookahead 에 `campaigns` 누락 |
| **HIGH-8** | `/campaigns/[slug]/submit` → 500 (server) | `getTranslations("namespace")` 호출 이 next-intl provider context 밖 |
| **HIGH-9** | `/campaigns/[slug]/submit` → 500 (render) | `src/app/campaigns/layout.tsx` 자체가 없음 |

세 hotfix 모두 **"신규 locale-free public route 도입 시 필요한 3가지 구성요소"** 의
일부. 신규 route 만들 때 다음 4가지를 **반드시 동시에** 처리.

### Checklist (4 items)

#### 1️⃣ Middleware matcher 업데이트 (HIGH-7 예방)

`src/middleware.ts` 의 matcher 의 negative lookahead 에 신규 route segment 추가:

```typescript
// Before 예시:
"/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|.*\\..*).*)"

// After (신규 <NEW_ROUTE> 추가 후):
"/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|<NEW_ROUTE>|.*\\..*).*)"
```

이유: next-intl middleware 가 기본적으로 모든 `/path/*` 를 `/<locale>/path/*` 로
redirect. locale-free 의도의 route 는 명시적 exclude 필요.

Reference 패턴: `showcase`, `challenges` 는 이미 exclude 되어 있음.

#### 2️⃣ 자체 `layout.tsx` 생성 (HIGH-9 예방)

`src/app/<NEW_ROUTE>/layout.tsx` 생성. **Root layout 은 `return children;` 만** 하므로
`<html>`, `<body>`, font, `NextIntlClientProvider`, `Toaster` 모두 자체 layout 에서 처리.

```typescript
// src/app/<NEW_ROUTE>/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import { inter } from "../fonts";
import "../globals.css";

function detectLocale(acceptLanguage: string): "ko" | "en" {
  return acceptLanguage.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export default async function <Route>Layout({ children }: { children: React.ReactNode }) {
  const headerList = await headers();
  const locale = detectLocale(headerList.get("accept-language") ?? "");
  const messages = (
    (await import(`../../../messages/${locale}.json`)) as {
      default: Record<string, unknown>;
    }
  ).default;

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Reference 패턴:
- `src/app/challenges/layout.tsx` (ko 고정 예시)
- `src/app/showcase/[slug]/layout.tsx` (단일 page 용 layout)
- `src/app/campaigns/layout.tsx` (HIGH-9 이후 추가됨, KO/EN dynamic resolve)

#### 3️⃣ `getTranslations({ locale, namespace })` 명시 호출 (HIGH-8 예방)

Layout 이 NextIntlClientProvider 로 wrap 하더라도, server component 에서
`getTranslations` 을 호출할 때 다음 패턴 사용:

```typescript
// page.tsx (server component)
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

function detectLocale(acceptLanguage: string): "ko" | "en" {
  return acceptLanguage.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export default async function Page() {
  const headerList = await headers();
  const locale = detectLocale(headerList.get("accept-language") ?? "");
  
  // ⚠️ locale-free route 에서는 이 형태 필수
  const t = await getTranslations({
    locale,
    namespace: "my_namespace",
  });
  
  // ...
}
```

Without layout (시나리오 A): layout 이 아직 없어도 page 자체에서
`getTranslations({locale, namespace})` 명시 호출 시 작동 (provider 없어도 OK)
But still throws if client component 가 `useTranslations` 호출.

With layout (시나리오 B, **권장**): layout 이 NextIntlClientProvider wrap 시
일반 `getTranslations("namespace")` 도 작동. 단 `getTranslations({locale, namespace})` 도
valid 이고 더 명시적.

권장: **시나리오 B + page 도 `{locale, namespace}` 명시**. layout 추가 깜빡을
하더라도 page 자체는 안전.

#### 4️⃣ PRE-SHIP smoke verify

Production deploy 직전 (ff-merge 후, smoke matrix 시작 전):

```bash
# Production fresh build READY 이후:
curl -I https://studio.yagiworkshop.xyz/<NEW_ROUTE>/<test-id>
# Expected: HTTP/2 200 (or 302 for redirect to specific path)
# Bad: 404 (middleware 문제), 500 (layout / i18n / render 문제)

# 또는 incognito browser 에서 직접 access 후 DevTools Network tab 확인:
# - Status code 200
# - Response body 가 valid HTML (`<html>`, `<body>`, `<head>` 존재)
# - Console error 0
```

실패 시 Vercel runtime log:
```
# Vercel:get_runtime_logs deploymentId=<dpl_id> level=error
```
→ server side throw stack trace 에서 root cause 파악.

### Review scope gap 목출 (Wave C v2 retrospective)

K-05 Codex (data/server action 검증) + K-06 Opus subagent (design 검증) 두 review
모두 세 hotfix 를 **catch 못함**. 이유:

| Review | Scope | Locale-free route gap |
|---|---|---|
| K-05 (Codex) | Data/server action/security | 코드 자체는 valid (import/call 정적 OK) — runtime 에서만 발현 |
| K-06 (Opus) | Design/typography/visual | UI render 자체 못 도달해서 visual review 잠함 |
| **누락** | **Routing/middleware/layout 회귀** | 다음 SPEC 부터 K-04 (routing review) 추가 결정 |

신규 public route 도입 포함하는 wave 에서는 **K-04 (routing review)** 신규 추가:
- middleware.ts matcher 변경 영향 verify
- 신규 page.tsx 의 layout 계층 verify
- locale group 안/밖 결정 verify
- `curl -I` PRE-SHIP smoke 1줄 추가

또는 K-04 도입이 과하다면 최소한 **kickoff SPEC 에 "Locale-Free Public Route Checklist"
명시 + PRE-SHIP smoke 에 `curl -I` 1줄 추가** 가 필수.

### Reference

- 자세한 retrospective: `.yagi-autobuild/phase-7/lessons.md` (Wave C v2 ship 완료 후 commit)
- HIGH-7 commit: `8cf4814`
- HIGH-8 commit: `e8e85f4`
- HIGH-9 commit: (Wave C v2 ship 시점 추가)

## Quote (v1.9)

> "https://studio.yagiworkshop.xyz/campaigns/test-smoke-001/submit 이 또한 404"
> — chat 2026-05-11. HIGH-7 trigger.

> "Application error: a client-side exception has occurred while loading studio.yagiworkshop.xyz"
> — chat 2026-05-11. HIGH-8 trigger.

> "https://studio.yagiworkshop.xyz/campaigns/test-smoke-001/submit 로드 X
> dev tool error : 1185-f1c453c0901621f9.js:1 Uncaught Error"
> — chat 2026-05-11. HIGH-9 trigger.

---

*v1.9 amendment 끝. Locale-Free Public Route Checklist source-of-truth lock.*
*다음 amendment 후보: pricing model, creator curation criteria, 회사 vision deck (3 axes narrative), K-04 routing review 프로토콜.*

---
---

# v1.10 Amendment (2026-05-12, Full Product Vision lock — 4 actor + 3 mechanism)

> Historical amendment note. 이전 amendment 들은 NORTH STAR (v1.8 §Z) + technical retrospective (v1.9 §AD)
> 에 국한. 그러나 **product 전체 vision (4 actor + 3 mechanism + identity
> extension matrix)** 은 PM 정본에 명시 lock 안 됨.
>
> 야기 chat 2026-05-12 (Web Claude 와 함께): big picture 텍스트 정리 결과
> 완벽하게 정합 verify. v1.10 으로 PM 정본 정렬.
>
> Trigger: 야기 "현재 PM 이 나의 비전과 완벽하게 일치하지 않은 것 같은데 수정이 필요하지 않을까".

## §AE — 4 Actor + Workspace Kind 정렬

### Actor 4종

본 platform은 4가지 actor의 만남입니다. 각자 고유한 identity 확장 목적과 surface를
가집니다.

| Actor | Workspace kind (schema) | 정체성 | 핵심 capability |
|---|---|---|---|
| **BRAND** (소비재 브랜드) | `brand` | 광고주, 제품/서비스 판매자 | 광고 의뢰 + 기획안 수신 + project room + (옵션) Digital Twin 의 brand-side adoption |
| **CELEBRITY** (셀러브리티) | `artist` (v1.10 기준) | 개인 IP, identity owner | Identity 등록 + Twin 활용 commission + 외부 brand 요청 수락/거절 |
| **CREATOR** (AI 크리에이터) | `creator` | AI 영상 제작 skill 보유자 | 매스 AI 캠페인 응모 + 선별 프로젝트 참여 |
| **YAGI INTERNAL** (야기워크숍 내부) | `yagi_admin` | Studio operator + production team | 큐레이션 + 제작 + 모든 ops orchestrate + 외부 협업자 invite |

### Workspace kind schema 정합 verify

- 현재 schema: `workspaces.kind` constraint = `('brand', 'agency', 'artist', 'creator', 'yagi_admin')`
- v1.10 기준에서 "Celebrity" actor = schema의 `artist` kind와 **동일**
  - Rationale: `artist` kind는 초기에 K-pop 아티스트 프레임으로 만들어졌으나, identity
    owner 개념으로 넓혀서 celebrity (배우/모델/인플루언서/KOL 등) 포석
  - Phase 8+ Digital Twin ship 시 UI naming은 "Celebrity" 또는 "연예인"으로 재정렬 고려
- `agency` kind = Phase 11+ deferred (광고대행사/매니지먼트 소속 용 placeholder, 아직 UI 없음)
- `yagi_admin` kind = 단일 YAGI Internal workspace (`320c1564-b0e7-481a-871c-be8d9bb605a8`)

### 외부 협업자 처리 (open question 답안)

야기 vision에서 "우리가 프로젝트에 초대한 인원"은 **YAGI Internal workspace의 member** 또는
**project-scoped guest** 으로 처리 예정. 별도 workspace kind 아님.

- Project 단위 invite 권한: `workspace_members` table에 'guest' role 추가 고려 (Phase 8+)
- Project room 내 활동 scope는 해당 project로 제한
- 외부 PM/PD/디자이너/VFX 외주자 등 다양한 role 수용 가능

## §AF — 3 Mechanism (Identity Extension)

본 platform은 identity extension을 **3가지 mechanism**으로 구현합니다. 각 mechanism은
다른 cardinality + 다른 actor 조합.

### ① Digital Twin (1:1 identity replication)

**Cardinality**: 1 celebrity → 1 twin asset → N brand 가 license/adopt

**Actor flow**:
```
[CELEBRITY] 본인 identity 등록 (face, voice, motion, style)
  ↓
[YAGI INTERNAL] twin asset 제작 + model artifact storage
  ↓
[BRAND] 특정 캠페인에서 twin 사용 요청 (opt-in)
  ↓
[CELEBRITY] 사용 승인/거절 (per-use approval, default opt-out)
  ↓
[YAGI INTERNAL + (옵션) 외부 협업자] twin 활용 제작
  ↓
[BRAND] 결과물 수령
```

**Status**: ❌ 미 ship (Phase 8+, 현재 가장 큰 gap)

**해소 필요 결정 (open questions)**:
- Twin asset 소유권 모델 (celebrity 고정 소유 vs license 구조)
- Per-use approval vs blanket license
- Twin asset storage (R2 + model artifact) + access control
- Twin training (야기 internal이 처리 vs creator outsource 가능성)
- Revenue share (brand → yagi → celebrity)

### ② Distributed Campaign (1:N creator interpretation)

**Cardinality**: 1 sponsor (brand or celebrity) → 1 brief → N creator 응모 → N 작품 → N 채널

**Actor flow**: (Phase 7 Wave C v2에서 shipped)
```
[BRAND 또는 CELEBRITY 또는 YAGI INTERNAL] 캠페인 발주
  ↓
[YAGI INTERNAL] 캠페인 큐레이션 (brief + 보상 + 기간)
  ↓
[CREATOR 다수] 응모 (익명 + auto-onboard, Wave C v2 spec)
  ↓
[YAGI INTERNAL] 검수 (approved_for_distribution)
  ↓
[CREATOR 다수] 각자 채널에 distribute + 보상 수령
  ↓
[SPONSOR] 다양한 해석 + multi-channel exposure 수령
```

**Status**: ✅ Wave C v2 ship 완료 (2026-05-11)

**핵심 value**: *"한 곡, N가지 해석, N개 채널"* — multiplication by diversity, NOT mass quantity.

### ③ Curated Project (1:few invite-only)

**Cardinality**: 1 brand/celebrity → 1 brief → yagi internal 이 1-3 creator 선별 invite → 단일 갈래 production

**Actor flow**:
```
[BRAND 또는 CELEBRITY] 고가치 commission 의뢰
  ↓
[YAGI INTERNAL] 기획안 작성 + 적합 creator 1-3명 선별
  ↓
[CREATOR (선별됨)] invite 수락/거절
  ↓
[YAGI INTERNAL + 선별 CREATOR + (옵션) 외부 협업자] Project room 제작
  ↓
[BRAND/CELEBRITY] 결과물 수령
```

**Status**: ❌ 미 ship (Phase 8+)

**Distributed Campaign과 차이**:
- Distributed = anonymous mass funnel, low-mid budget, creator algorithm 노출이 incentive
- Curated = invite-only, high budget, deliverable 자체가 보상

### Mechanism 간 관계

**3 mechanism 은 동일 actor가 다른 surface에서 만나는 구조**:

- Brand 의 3-path: Twin opt-in OR Campaign 발주 OR Curated 의뢰
- Celebrity 의 3-path: Twin 등록 OR Campaign 발주 OR 자체 콘텐츠 commission
- Creator 의 2-path: Campaign 응모 OR Curated invite 수락

## §AG — Identity Extension Matrix

누구의 identity를 누가 확장하는가:

| Identity 주체 | 확장 방식 | 활용 actor | Mechanism |
|---|---|---|---|
| **Celebrity** | Digital Twin → 광고 콘텐츠 | Brand commission | ① Twin |
| **Celebrity** | Twin 으로 본인 새 콘텐츠 | Self commission | ① Twin + ③ Curated |
| **Brand** | Celebrity twin 빌려서 브랜드 강화 | Brand-driven | ① Twin |
| **Brand/Celebrity 음악/IP** | Creator 다수의 해석 → 다채널 노출 | Sponsor-driven | ② Campaign |
| **Brand/Celebrity** | 고가치 제작 (우수 creator 선별) | Sponsor-driven | ③ Curated |
| **Creator 본인** | 본인 채널에서 작품 노출 + 보상 | Creator-driven | ② Campaign 부수 |
| **Yagi Internal** | Studio 창조 IP (KART ZERO, AI 아이돌) | Internal-driven | 별도 axis (본 platform 외) |

**모두 identity extension의 다른 measure**. SaaS가 아닌 **studio + curation + identity
infrastructure** 본질.

## §AH — Product Surface Map (7 영역)

Workspace kind 별 surface mapping:

| 영역 | Brand | Celebrity | Creator | Yagi Internal | 현재 상태 |
|---|---|---|---|---|---|
| 1. Workspace 생성/온보딩 | ✅ | ✅ | ✅ (Wave C v2 자동) | ✅ | shipped (Phase 1-2) |
| 2. Project 관리 (의뢰 + 기획안 + Brief) | ✅ | ✅ | ❌ | ✅ | shipped (Phase 2.7-2.8) |
| 3. Commission (광고 발주) | ✅ | ✅ | ❌ | ✅ | shipped (Phase 2.7) |
| 4. **Digital Twin** (identity 등록 + adoption) | △ 사용만 | ✅ 등록+승인 | ❌ | ✅ | ❌ **미 ship** (Phase 8+) |
| 5. **Distributed Campaign** | ✅ | ✅ | ✅ 응모 | ✅ 검수 | ✅ shipped (Phase 7 Wave C v2) |
| 6. **Curated Project** (선별 invite-only) | ❌ | ❌ | ✅ 참여 | ✅ invite | ❌ **미 ship** (Phase 8+) |
| 7. Creator Hub (Roster + tier) | ❌ | ❌ | ✅ | ✅ | ❌ **미 ship** (Phase 8+) |

## §AI — Phase 8+ Gap Analysis + Priority (잠정)

### Wave C v2 (Phase 7 Distributed Campaign) ship 후 남은 gap

**Critical gap (vision 과 현 구현 사이의 가장 큰 차이)**:
1. ❌ Digital Twin mechanism 전체 (Celebrity workspace의 핵심)
2. ❌ Celebrity workspace UI (identity registry)
3. ❌ Brand workspace의 twin opt-in UI
4. ❌ Twin asset storage + access control + permission flow
5. ❌ Curated Project (selected invite path)
6. ❌ Brand ↔ Celebrity twin adoption matching
7. ❌ 외부 협업자 invite system (project-scoped guest role)

### Phase 8+ 잠정 priority (야기 결정 필요)

검토안:

```
Option A — Twin-first (high impact, high complexity):
  Phase 8 = Digital Twin core (registry + adoption + per-use approval)
  Phase 9 = Curated Project + Project room 확장
  Phase 10 = Creator Hub

Option B — Surface-first (low risk, incremental):
  Phase 8 = Curated Project + Creator Hub
  Phase 9 = Digital Twin core
  Phase 10 = Twin + Curated 통합

Option C — Demand-driven:
  첫 celebrity client 영입 → 그 필요 따라 twin or curated 우선
  첫 brand client 영입 → commission flow refinement 우선
```

phase priority 결정 = 별도 amendment (야기 + Web Claude phase planning chat) 에서 lock.

## §AJ — Vision Cohesion Check (야기 verify 2026-05-12)

야기 chat 2026-05-12: "완벽하게 정합해". §AE–AI 모두 야기 vision 과 정합 verify 완료.

### 끝난 텍스트 (외부 소개)

**Short (1줄)**:
> AI Native Identity Extension Studio.

**Medium (3줄)**:
> Brand, Celebrity, Creator 의 identity 를 AI 로 확장하는 studio + platform.
> Digital Twin (1:1), Distributed Campaign (1:N), Curated Project (1:few) 3가지 mechanism.
> Yagi Internal 이 orchestrate.

**Long (full)**:
> ㈜야기워크숍 은 AI Native Entertainment Studio — "We extend who you are. Your identity, beyond limits."
> 본 platform 은 회사의 첫 번째 axis YAGI Workshop 으로, identity extension 의 marketplace + production layer 를 제공.
>
> 4 actor 가 만남:
> - Brand (소비재 브랜드) — 광고 의뢰 + 기획안 + project room + celebrity twin opt-in
> - Celebrity (셀러브리티) — 본인 identity 등록 + twin 활용 commission + 외부 brand 요청 수락
> - Creator (AI 크리에이터) — 매스 AI 캠페인 응모 + 선별 프로젝트 참여
> - Yagi Internal — 큐레이션 + 제작 + 모든 ops orchestrate
>
> 3가지 identity extension mechanism:
> - Digital Twin (1:1 replication) — Celebrity ↔ Brand
> - Distributed Campaign (1:N interpretation) — Brand/Celebrity → Creator 다수
> - Curated Project (1:few invite) — Yagi 가 선별
>
> Phase 7 Wave C v2 = Distributed Campaign mechanism ship 완료.
> Phase 8+ = Digital Twin + Curated Project + Creator Hub 확장.

### Open questions (다음 amendment 용, 야기 결정 대기)

1. Phase 8+ priority (Option A/B/C 중 선택)
2. Digital Twin 소유권 모델 (celebrity 고정 vs license 구조)
3. Twin per-use approval vs blanket license
4. Twin training operator (yagi internal vs creator outsource)
5. Revenue share 구조 (brand → yagi → celebrity, brand → yagi → creator)
6. UI naming — "Celebrity" vs "Artist" vs "연예인"
7. 외부 협업자 role schema (`workspace_members.role = 'guest'`)

## Quote (v1.10)

> "내가 구현하고자 하는 건 (워딩은 좀 다를 수 있음):
> * 소비재 브랜드 > 원활하게 광고 의뢰를 할 수 있고, 기획안을 받아볼 수 있으며 우리 인원 및 우리가 프로젝트에 초대한 인원과 소통할 수 있다. 더불어 digital twin을 활용해서 진행할지도 선택할 수 있다.
> * 셀러브리티 > 자신의 아이덱티티를 등록하고 digital twin을 활용한 광고 제작 요청, 광고 제작 수락할 수 있다.
> * 크리에이터 - 매스 ai 캠페인에 참여할 수 있고 선별된 프로젝트에 참여할 수 있다.
> * 야기워크숍 내부 어드민 및 멤버"
> — 야기 chat 2026-05-12. 이것이 v1.10 의 trigger.

---

*v1.10 amendment 끝. Full product vision (4 actor + 3 mechanism + identity extension matrix) source-of-truth lock.*
*다음 amendment 후보: Phase 8 lock (Twin vs Curated priority), Digital Twin spec, pricing model, K-04 routing review 프로토콜.*


---

## v1.11 amendment (2026-05-22)

**Lock**: Phase 8+ priority Option B (compressed) + §AJ partial resolutions
**Trigger**: §AJ Q#1 lock + Phase 8 spec entry prerequisite (Q#7 schema migration)
**Rule**: living document. 본문은 항상 현재 진실로 직접 수정한다. git이 버전 관리/백업하며 큰 변경은 commit message와 Decision Log에 사유를 남긴다.

### §AJ Q#1~Q#7 status update

- **Q#1** (Phase 8+ priority): **RESOLVED** → §AK 참조
- **Q#2** (Twin asset 소유권 — celebrity 고정 vs license 구조): **DEFERRED** → Phase 8 mid Twin discovery 시 lock
- **Q#3** (Twin per-use approval vs blanket license): **DEFERRED** → Q#2와 동시 Phase 8 mid lock
- **Q#4** (Twin training operator): **DEFAULT LOCKED** → yagi internal default. Creator outsource는 Phase 10+ scale-up 시 재검토.
- **Q#5** (Revenue share 구조): **DEFERRED** → Phase 9 첫 Celebrity client 계약 시 lock
- **Q#6** (UI naming — Artist vs Celebrity vs 연예인): **RESOLVED (Builder, 2026-05-22)** → Wave D 시점 "Artist / 아티스트" 유지. Phase 9 Twin ship 시 "Celebrity / 연예인" rename 재검토 (v1.12+ amendment 후보).
- **Q#7** (External collaborator role schema): **LOCKED** → `workspace_members.role = 'guest'` 도입, project-scoped permission (workspace-wide 권한 없음). Phase 8 Wave A spec entry 전 schema migration 필수.

### §AK Phase 8+ Roadmap (Option B compressed) — LOCKED

**원칙**: v1.8 §Z NORTH STAR "AI Visuals for Musicians" + v1.10 §AE Identity Extension Studio 정합. v1.10 §AI Option B verbatim + compression amendment.

**Phase 8 — Surface Ship**
- Curated Project (musician 작품 큐레이션 surface)
- Creator Hub (artist-facing entry point)
- Wave C v2 Campaign 인프라 **재사용** (re-use, not rebuild)
- Prerequisite: §AJ Q#7 `guest` role schema migration 선행
- Phase 8 mid부터 Phase 9 Twin discovery 병행 시작 (영업 cycle 활성화)

**Phase 9 — Twin Core (compressed timeline)**
- Digital Human IP Studio axis activation point
- 첫 Celebrity twin enterprise 영업 cycle (Q4 영업 capacity 활용)
- IG idol channel = Twin first living reference (Q2 leverage)

**Phase 10 — Integration**
- Twin × Campaign × Curated 통합 navigation
- IG channel을 Twin showcase로 공식 reframe
- "Identity Extension Studio" 외부 표현 본격 deploy

**Decision basis (Q1~Q5 답변 vector, 2026-05-22)**:

| Q | 답변 | Direction |
|---|---|---|
| Q1 paying lead (4-8주) | B 강함 | Surface cash |
| Q2 IG channel role | A 강함 | Twin proof |
| Q3 Twin 도입 시점 | sequential but 빠르게 | B + compression |
| Q4 영업 capacity | 완전 가능 | A enabler |
| Q5 6개월 regret-min | Twin moat 못 깔면 후회 | A thesis compass |

Strict A 불가 (Q1 cash lead 죽임 + Phase 7 Wave C v2 momentum 손실). Strict B 위험 (Q5 regret-min 충족 못 함, Twin 6개월 too late). **Compression = 유일 정합 path.**

**3 axes / 3 mechanism 정렬**:
- Axis 1 YAGI Workshop = Phase 8 + Phase 10 cover
- Axis 2 Digital Human IP Studio = Phase 9 activation point
- Axis 3 Original IP = 본 platform 외, 영향 없음
- ② Distributed Campaign (Wave C v2 ship됨) = Phase 8 진입 leverage
- ③ Curated Project = Phase 8 Surface 핵심
- ① Digital Twin = Phase 9 compressed

### §AL Phase 8/9 KPI (잠정 lock)

**Phase 8 잠정**:
- Wave C v2 인프라 활용 신규 Campaign 수 (sponsor-driven)
- 첫 paying Brand/Creator lead 전환 1건 (4-8주 내)
- Curated Project 첫 invite-only 계약 1건

**Phase 8 mid Twin discovery 잠정**:
- 첫 Celebrity outreach 5건
- 첫 Celebrity twin asset registration 1건 (paid 또는 무료 시범)

**Phase 9 잠정**:
- 첫 Celebrity twin enterprise 계약 close
- IG idol channel을 Twin first living reference로 공식 reframe
- Brand workspace twin opt-in UI ship + 첫 brand-celebrity twin adoption 매칭

**정밀화 trigger**: paying lead 구체 정보 + 영업 활동 실측치 확보 후 v1.12 amendment에서 finalize.

---

*v1.11 amendment 끝. Phase 8+ Option B (compressed) lock + §AJ partial resolutions.*
*다음 amendment 후보 (v1.12+): Q#6 Phase 9 rename, Q#2/Q#3 Phase 8 mid Twin discovery 반영, §AL KPI 정밀화, Q#5 Phase 9 첫 Celebrity 계약.*

---

## §AM — Design System v1.1 Color System (2026-05-27)

*(Recorded as §AM — the next free letter: §AA–§AL are all taken, incl. `###` subsections (§AG = "Identity Extension Matrix", §AK = "Phase 8+ Roadmap"). This is the design-system color decision; it supersedes the v1.0 sage sole-accent rule in ARCHITECTURE §18.3, not any product section.)*

- **3-tier color system**, governed by the **60-30-10 rule**:
  - **Neutral (60%, dominant)** — warm-ivory bg `#FAF7F2`, pure-white elevated surfaces `#FFFFFF`, warm near-black ink `#1F1A15`, warm muted ink `#5C544A`, warm border `#E8E0D4`. Pure-white page bg and pure-black body text forbidden.
  - **Brand primary — Vermillion `#9A361F` (~10%, strategic)** — CTAs, primary actions, active nav, brand marker. On-fill text warm off-white `#FBEAE6`; hover `#B8412A`.
  - **Brand secondary — Gold `#F3D174` (~5-15%, support)** — highlights, tags, ratings, small icons, section accents. On-fill text espresso `#3D2E0E`; text-on-neutral `#6B5618`; hover `#E8C158`. Small areas only, never a large fill.
- **Retired**: amber `#C8A96E` (prose-only remnant), sage `#71D083` (live v1.0 token + ~18 hex-literal usages across app).
- **Scope**: `src/app/globals.css` (light + dark tokens), `tailwind.config.ts` (neutral / vermillion / gold families), design-system `PRINCIPLES.md` (§3, §4.2, §8) + `ARCHITECTURE.md §18.3` (superseded) + skill `SKILL.md`, `CLAUDE.md` rule #10, auth magic-link email template, ~14 app component files (sage hex -> Vermillion; on-fill text -> cream).
- **WCAG AA verified** (all >= 4.5:1): cream `#FBEAE6` on Vermillion 6.17:1; Vermillion `#9A361F` on white 7.19:1; espresso `#3D2E0E` on Gold 8.89:1; Gold-ink `#6B5618` on white 7.07:1.
- **Dark mode** (opt-in): warm-dark neutrals (`#1A1612` bg / `#2A2520` surface / `#FAF7F2` ink); Vermillion text -> `#E8A99B`; Gold -> `#F3D174`.
- **Preserved**: Tailwind semantic state colors (`amber-500` / `red-500` / `green-500` / success / warning / info) — these are state utilities, not brand colors.
- Aesthetic intent: K-pop 엔터테인먼트 + 한국 단청 (진사 + 황토) + editorial luxury (Sunrise Terracotta / Cherry Noir reference).

---


---

## §AN BRAND-Only Vertical Pivot (2026-05-28)

### Actor model 재정의 (§AE supersede)
- **BRAND** = 유일 self-signup customer persona (vertical, 모든 surface가 BRAND 관점)
- **CELEBRITY** = 야기 internal asset (manual 등록, self-signup X, public 노출 X)
  - `workspaces.kind='artist'` DB 보존 (asset record)
  - BRAND ↔ celebrity 협업 = yagi-internal admin이 `project_guests` 연결
- **CREATOR** = Distributed Campaign 채널 (Phase 7 유지, 별 funnel)
- **YAGI INTERNAL** = admin

### BRAND User Journey (실측 KAIPER + SLOGK 사례 기반)

1. **Onboarding**
   - Brand 계정 + workspace 생성만 진행 (최소 마찰)
   - 세무 정보(사업자등록증 + 통장사본 + 세금계산서 수신 정보)는 결제·세금계산서 발행 시점에 수집 (KAIPER 실사례 정합, lazy collection)
   - Brand Asset Library는 선택 사항. 프로젝트 진행 중 언제든 logo + product 사진 + brand guideline 업로드 가능

2. **Project Brief 작성** (notion 대체)
   - Type A: 일반 외주 (Curated Project, Wave A.2.a backend, digital twin 활용 가능)
   - Type B: Mass AI Campaign (Phase 7 distributed campaign infra 재활용)
   - Type C: Lookbook (§AQ Americano integration 후, 패션 vertical)
   - 형식: 1순위/2순위/3순위 분류 + 분량 (썸네일 N장, 비율 9:16/1:1/16:9/21:9, 픽셀 크기) + 레퍼런스 + 1차/2차/3차 일정

3. **단가 + 견적** (자동 + 수동)
   - 분량 + 작업 종류 기반 자동 견적
   - 누적 거래량 기반 장기 협업 할인 자동 적용 (-20% 등)
   - 야기 internal admin 최종 confirm
   - 큰 건 (영상 제작 등) 선결제 옵션

4. **세금계산서 + 인보이스** (자동 발행)
   - 국세청 e-tax API 또는 popbill/bgmgr 연동
   - 견적 confirm 즉시 발행
   - Billing section 통합 관리 + 다운로드

5. **Pre-production (Character Sheet 단계)**
   - 모델/의상/배경 후보 시안 (야기/다나가 제시, 4가지 다른 감도 동시)
   - Brand 선택 → character sheet 확정 (3-view diagram + close-up)
   - 이후 production cycle은 confirmed character sheet 기반 (일관성 유지)

6. **Production cycles** (V1 → V2 → V3 → ... 버전 관리)
   - 각 버전 in-app asset gallery
   - 피드백 thread (slack 대체, slack/email mirror 알림 발송)
   - 일정 변경 시 자동 알림

7. **Deliverables**
   - 다중 비율 자동 export (16:9 + 9:16 + 1:1 + 21:9)
   - 4K 업스케일 옵션
   - 음원 풀버전 + 라이센스 정보
   - 이미지/영상/에셋 zip 일괄 다운로드
   - 마케팅 자유 활용 권리 명시

8. **Customer Lifetime View** (yagi internal admin)
   - Brand별 누적 거래량 + LTV
   - 단가 정책 + 적용 할인율
   - 미수금 + 정산 status
   - 다음 contact 예정일

---

## §AO Design System v1.2 — Dark Brand UI (supersedes §AM)

### 색 시스템
- Theme: **Dark**
- Primary: **#ED1E1E** (vermilion red, brand mark + CTA)
- Secondary: **#FAD204** (warm gold, highlights + tags + accent, 5-10%)
- Background: **#0A0A0A** (확정)
- Ink primary: **#F0F0F0** (확정)
- Surface: **#161616** (확정 lock)
- Ink muted: **#888888** (확정 lock)
- Border: **#2A2A2A** (확정 lock)

### Typography
- Display: **Editorial New** (확정)
- Body Korean: Pretendard Variable
- Body English/Tech: Geist (sans + mono)
- 극단적 대비 (Display 3-4x scale jump from body)

### 60-30-10
- 60% Dark neutral (bg + surface + ink)
- 30% Surfaces + subtle gradient/glow
- 10% #ED1E1E + #FAD204 (합쳐서, CTA + brand mark + key callout)

### Tone
- High-end AI tool (Higgsfield/Runway/ElevenLabs 톤)
- Editorial premium (Editorial New italic + dark moody)
- 한국 단청 + 럭셔리 영화 포스터

### v1.1 (§AM) 폐기
- warm ivory neutral, Vermillion #9A361F, Gold #F3D174 모두 supersede
- 커밋 75cdd05 (v1.1 적용 코드)는 §AO 적용 시 마이그레이션 대상

---

## §AP IA Refactor — Horizontal Nav (supersedes §AH)

### Sidebar dashboard → Top-bar horizontal nav (Higgsfield 패턴 참고)

카테고리 (잠정):
- **Explore** — 디지털 트윈 roster + 야기 자산 탐색
- **Projects** — 외주 의뢰 + 진행 관리 (Wave A.2.a backend 활용)
- **Campaigns** — Mass AI Campaign (Phase 7 재활용)
- **Lookbook Studio** — §AQ Americano integration 후
- **Marketing Studio** — 영상 ad pipeline
- **Assets** — 받은 deliverable 관리 + 다운로드
- **Billing** — 견적 + 인보이스 + 세금계산서 + 누적 거래

우측: Credit balance + Search (Ctrl+K) + Workspace switcher + Profile

---

## §AQ Americano Integration — Fashion Brand SaaS (다나, 2026-05-28)

### Americano
- 다나 작업 — 모델 지정 + 룩북 자동화 SaaS
- 곧 GitHub release
- 패션 vertical에 직접 fit

### 통합 plan
1. GitHub release 후 yagi-workshop platform에 module로 흡수
2. BRAND surface의 "Lookbook Studio" section 등재
3. 공유 auth + billing + workspace + asset library
4. 다나 main maintainer, 야기 PM
5. Phase 9 또는 별 Wave (Americano release 시점 후 결정)

---

## §AR Marketing Visual Pipeline — 야기 Internal Tool (2026-05-28)

### Scope 명시
- **목적**: yagi-workshop platform의 marketing / landing / feature illustration 생성 (Higgsfield Supercomputer / AI Canvas / Marketing Studio 페이지 톤)
- **야기/다나 internal tool only** — Brand가 platform에서 직접 generate 기능 X (Phase 10+ defer)
- Brand deliverable 제작 시에도 동일 도구/룰 활용

### 이미지 콘텐츠 룰 (필수)
- **이미지 자체에 텍스트 X** — generate된 visual은 pure imagery only
- 텍스트/라벨/CTA/제목/설명 = platform UI overlay (HTML/CSS) 담당
- 이유: 다국어 + 리브랜딩 + 유지보수 모두 안전, 깔끔한 분리
- **특정 brand 노출 X** — KAIPER/SLOGK 등 specific brand 이름/로고 platform marketing illustration에 X. Generic, brand-agnostic visual만

### 도구 선택 — Higgsfield 플랫폼의 Nano Banana Pro only
- Resolution: 2K (cost/quality 최적, 4K 업스케일은 별 단계)
- 14 reference image 지원
- Thinking mode 활성 (복잡 추론, 다중 오브제 정확도 ↑)
- Up to 5-person consistency (캐릭터 시트 활용)
- Korean text rendering 정확 (다만 platform marketing illustration은 텍스트 X 룰)

### Reference image source 4 tier 전략

Tier 1 — Brand Asset Library (Brand 자체 자산 logo/product/brand guideline) — 비중 50-70% — 라이센스 Brand 자체 — Brand deliverable 작업 시
Tier 2 — 야기 Internal Library (다나 이전 작업 일반화 reference, character sheet, mood board) — 비중 15-25% — 라이센스 야기 보유
Tier 3 — AI-Generated Mood Board (Nano Banana로 brief 받아서 mood option 생성 → 선택 후 reference로) — 비중 10-20% — 라이센스 AI 생성 (SynthID)
Tier 4 — Pinterest 등 외부 reference (야기/다나 internal 큐레이션, 영감용으로만 활용, semantic label 부여 후 Higgsfield에 reference image로 attach) — 비중 10-15% — 라이센스 영감 활용 (직접 publish X), Brand 외부 업로드 시 자기 책임

### Nano Banana Pro 프롬프트 룰 (Google 공식 기반)

**5-pillar 구조**
1. Subject — 누가/무엇이 있는가? 구체적으로
2. Composition — 카메라 앵글/거리/프레이밍 (예: 35mm 미디엄 샷, 매크로 클로즈업, 부감)
3. Action — 피사체가 무엇을 하는가
4. Location — 배경/분위기/시간대
5. Style — 사진 종류/컬러 그레이딩/무드 (예: editorial fashion, cinematic teal-orange, "no text in image" 명시)

**Reference image 사용 — semantic naming 필수**
- 잘못된 방식: "image 1", "image 2" — 모델이 그 이미지를 그대로 출력하는 버그 유발
- 올바른 방식: 각 reference에 명사 라벨 부여 후 prompt에서 그 label로 referencing

예시 prompt 구조 (Brand deliverable, KAIPER 사례 기반):
"Generate a hero image for the product hero shot, held by the model reference A, in a setting that captures the mood of the lifestyle mood board. Place the brand logo bottom-right with 12% width. Adopt the photography style of the previous campaign style. 35mm medium shot, eye-level, golden hour natural lighting. 2K resolution, thinking mode enabled. No text in image."

예시 prompt 구조 (platform marketing illustration, Higgsfield Supercomputer 톤):
"Generate a pure visual showing a creator workspace concept: a young person of ambiguous ethnicity holding a tablet, soft cinematic lighting, dark moody background with subtle red and gold highlights. Pure imagery only, no text or logos in the image. Adopt the editorial mood of the inspiration reference (Pinterest mood board). 35mm shot, depth of field, 2K resolution, thinking mode enabled."

**Iteration 전략**
- 첫 결과 OK면 follow-up edit ("배경 더 밝게", "그림자 부드럽게") — 재생성 X
- 새 reference 추가 시 그 추가 image도 semantic label 부여
- 최종본 confirm 시 그 이미지를 Brand Asset Library 또는 야기 Internal Library에 저장 → 향후 reference로 재활용

### Workflow (현재 = 외부 Higgsfield UI 활용)
- 야기/다나가 https://higgsfield.ai 외부 UI에서 generate
- Pinterest에서 reference 복붙 가능 (영감 + semantic label 부여 후 Higgsfield에 attach)
- 결과물 platform 정적 asset으로 업로드 (public/marketing/...)
- platform 안에서 generate UI 빌트인 = over-engineering, Phase 10+ defer

### MCP 통합 status (자동화 워크플로우용, optional)
- Hermes: 이미 연결됨
- Claude Code: claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
- 사용처: 자동화된 mood board batch 생성, character sheet 일괄 등

---

## §AS Operations Automation — Notion + Slack 통합 대체 (2026-05-28)

### Brief
- in-app form (notion 주문서 대체)
- 1순위/2순위/3순위 분류, 분량, 비율, 픽셀 크기, 레퍼런스 첨부, 일정 spec

### Communication
- in-app thread (slack 대체)
- @ mention 시 Slack/email mirror 알림 (Brand가 외부에서 즉시 응답 가능)
- 첨부 파일 인라인 표시

### Asset Versioning
- V1 / V2 / V3 / ... 자동 버저닝 (다나 사례: V1→V5까지 일반적)
- 피드백 round 추적
- 최종본 confirm 시 lock

### Schedule
- 1차/2차/3차 납품 일정 visible (Gantt 또는 list)
- 일정 변경 시 자동 알림 (Brand + 야기 internal)
- "ASAP" 표시 또는 specific 날짜 지정

### Billing
- 견적서 자동 발행
- 세금계산서 자동 발행 (e-tax 연동)
- 누적 거래량 + LTV view
- 장기 협업 할인 자동 적용
- 미수금 status 추적

---

## Decision Log

- 2026-05-28: append-only 폐기 → 살아있는 문서로 전환 (git 버전관리/백업, 본문 = 현재 진실).
- 2026-05-28: §AN onboarding 세무정보/asset 강제 → lazy collection (결제·세금계산서 발행 시점/선택 업로드).
- 2026-05-28: §AN BRAND-only vertical pivot 확정 — BRAND = 유일 self-signup, CELEBRITY = internal asset, CREATOR = campaign channel.
- 2026-05-28: §AO design system v1.2 dark lock — bg/surface/ink/border + Red `#ED1E1E` + Gold `#FAD204`, 이전 v1.1 폐기.
- 2026-05-28: §AP IA refactor 확정 — sidebar 폐기, Higgsfield-style horizontal nav.
- 2026-05-28: §AQ Americano integration 방향 기록 — GitHub release 후 Lookbook Studio module로 흡수.
- 2026-05-28: §AR marketing visual pipeline 확정 — 야기/다나 internal tool, Nano Banana Pro 2K, 이미지 내 텍스트/특정 brand 노출 금지.
- 2026-05-28: §AS operations automation 방향 확정 — in-app brief/thread/versioning/schedule/billing으로 Notion+Slack+세금계산서 통합 대체.
