

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
