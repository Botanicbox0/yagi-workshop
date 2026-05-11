

---
---

# v1.6 Amendment (2026-05-05, post-v1.5, Phase 7 PIVOT)

> append-only. **Phase 7 재정의 — Challenge (contest) → Distributed Campaign (mass content marketing)**.
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

[새 프로젝트 시작]      [브랜드 협업 제안]      [+ 캠페인 요청]
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
| Phase 10 | Inbound Track (Brand RFP → Roster 매칭, Artist [브랜드 협업 제안] 큐) | 2-3주 |
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

> append-only. v1.7 손실 (PRODUCT-MASTER 복구 사고) 으로 NORTH STAR 표현이
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

> append-only. Wave C v2 ship 진행 중 3개 hotfix (HIGH-7/8/9) 가 모두
> **"신규 locale-free public route 도입 패턴"** 의 일부로 드러남을
> 인지. v1.8 footer 의 §AD pricing model lock 안내는 넓은 의미의 next-amendment
> 제안이었으나, 해당 후보는 별도 amendment (v1.10+) 로 소괄. 이번 §AD는
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
