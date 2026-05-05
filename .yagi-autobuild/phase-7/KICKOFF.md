# Phase 7 — Distributed Campaign + Light Creator workspace

Status: **LOCKED v3 (PIVOT from v2)**, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-05)
Scope tier: PHASE (~6주 sprint, Phase 5 lessons 1.5x 보정)
Baseline: branch `main` (Phase 6 + Hotfix-3 ff-merge 완료, v1.5 + v1.6 amendments)
Source-of-truth: PRODUCT-MASTER §W (Distributed Campaign vision) + §X (schema) +
§V v1.6 (Q1-Q8 lock) + §Y (§K Artist three-entry update) + §M (워딩 룰)

## Vision (locked v1.6, chat 2026-05-05)

Phase 7 = Distributed Campaign MVP. 사업 가치 = "Sponsor (Artist 또는
admin) 의 캠페인 hosting + curated creator pool 의 작품 제작 + admin
검수 + creator 가 본인 채널 유포 + metric tracking. K-pop AI 콘텐츠
마케팅의 B2B SaaS 모델 검증."

Pivot reason: Challenge (contest) 모델 = me-too risk + 1회성 수익. Distributed
Campaign = 야기 unique vision + recurring revenue + creator self-distribution.
야기 conditions (creator network 보유 + manual 영입 자신) = Creator pool 0명
risk 직접 해결.

## Phase 7 deliverables (사업 가치 단위)

1. **야기 자체 캠페인 hosting** — admin tool (Route A self-host)
2. **Artist sponsor 의 캠페인 요청 + 야기 승인** — Artist workspace 의
   third entry [+ 캠페인 요청] (Route B)
3. **Curated creator pool 응모** — 누구나 응모 가능 (자동 magic-link), 단
   야기 manual 영입한 partner 가 first batch
4. **Admin 검수 (단일 round)** — approved_for_distribution / declined / revision_requested
5. **Creator 본인 채널 유포 + URL 등록** — TikTok/IG/YouTube 채널 게시 후
   campaign_distributions row 생성
6. **Manual metric log + tracking dashboard** — view / like / comment 수
   admin tool 에서 manual 등록, sponsor / creator 둘 다 dashboard 에서 확인

## Decisions locked (v1.6 §V Q1-Q8 + 추가)

| # | 항목 | 답 |
|---|---|---|
| Q1 | 첫 캠페인 형태 | Route A primary + Route B (가수 영입 plan via network 1-2주) |
| Q2 | 워딩 | **"캠페인"** ("Distributed Campaign" 의 한국어 표면) |
| Q3 | 응모자 가입 | 자동 magic-link (Talenthouse 패턴) |
| Q4 | 검수 round | 단일 (approved / declined / revision_requested) |
| Q5 | File 처리 | Hybrid (R2 + 외부 URL) |
| Q6 | Sponsor request 폼 | title + brief + reference_assets + 일정 + 후원 + 담당자 번호 phone 필수 |
| Q7 | Compensation | exposure_only default. fixed_fee / royalty_share column 도입 (정산 = Phase 11) |
| Q8 | Roster funnel UI | Phase 8 deferred |

## Scope: 4 waves + 1 ff-merge gate

### Wave A — Schema + admin campaign + public landing (6d)

#### A.1 — Schema migration (1.5d, lead solo base)

`supabase/migrations/<timestamp>_phase_7_campaigns.sql` — PRODUCT-MASTER
§X 의 5 테이블:
- campaigns (Sponsor: brand 또는 artist workspace, NULL=admin self-host)
- campaign_categories
- campaign_submissions
- campaign_review_decisions (admin 검수)
- campaign_distributions (creator 의 본인 채널 유포 metadata) ⭐ NEW

**RLS** (K-05 mandatory, L-049 4-perspective + L-052 LOOP_MAX=3):

```sql
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- campaigns SELECT
-- yagi_admin: all
-- sponsor (brand/artist workspace user): 본인 sponsor_workspace_id (status='requested'/'in_review'/'declined'/'draft' 까지)
-- public (anon + authenticated): status IN ('published','submission_closed','distributing','archived')

CREATE POLICY campaigns_select_admin ON campaigns FOR SELECT TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaigns_select_sponsor ON campaigns FOR SELECT TO authenticated
  USING (
    sponsor_workspace_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = campaigns.sponsor_workspace_id AND user_id = auth.uid())
  );

CREATE POLICY campaigns_select_public ON campaigns FOR SELECT TO anon, authenticated
  USING (status IN ('published','submission_closed','distributing','archived'));

-- campaigns INSERT
-- yagi_admin: all
-- sponsor (brand/artist workspace user): status='requested' + sponsor_workspace_id=본인 + workspace.kind IN ('brand','artist')

CREATE POLICY campaigns_insert_admin ON campaigns FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaigns_insert_sponsor ON campaigns FOR INSERT TO authenticated
  WITH CHECK (
    status = 'requested'
    AND sponsor_workspace_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM workspace_members wm
      JOIN workspaces w ON w.id = wm.workspace_id
      WHERE wm.workspace_id = campaigns.sponsor_workspace_id
        AND wm.user_id = auth.uid()
        AND w.kind IN ('brand', 'artist')
    )
  );

-- campaigns UPDATE
-- yagi_admin: all (status transition + decision_metadata)
-- sponsor: status='requested' 만 (admin 검토 진입 전)
REVOKE UPDATE ON campaigns FROM authenticated;
GRANT UPDATE (title, description, brief, reference_assets, request_metadata, updated_at) ON campaigns TO authenticated;

CREATE POLICY campaigns_update_admin ON campaigns FOR UPDATE TO authenticated
  USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));

CREATE POLICY campaigns_update_sponsor ON campaigns FOR UPDATE TO authenticated
  USING (
    status = 'requested'
    AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = campaigns.sponsor_workspace_id AND user_id = auth.uid())
  )
  WITH CHECK (
    status = 'requested'
    AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = campaigns.sponsor_workspace_id AND user_id = auth.uid())
  );

-- campaigns DELETE: yagi_admin only
CREATE POLICY campaigns_delete_admin ON campaigns FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- campaign_submissions:
-- SELECT: yagi_admin + 본인 응모자 (workspace_member of applicant_workspace_id) + public for status='distributed'
-- INSERT: server action only (service-role)
-- UPDATE: yagi_admin (검수 decision) + 본인 (status='submitted' field, distribution URL 등록 시 status='approved_for_distribution' → 'distributed' 일 때만)

-- campaign_categories: yagi_admin write, public read for published+
-- campaign_review_decisions: yagi_admin only
-- campaign_distributions:
-- SELECT: yagi_admin + 본인 응모자 + public for parent submission status='distributed'
-- INSERT: 본인 응모자 (submission.status='approved_for_distribution' 일 때만) + yagi_admin
-- UPDATE: 본인 (metric log) + yagi_admin
```

**Column-level grant** (sub_5 패턴):
- campaigns 의 status / decision_metadata = yagi_admin only
- campaign_submissions 의 status = yagi_admin (검수) 또는 본인 (distributed transition)
- campaign_distributions 의 metric (view/like/comment) = applicant 본인 또는 yagi_admin

**EXIT**:
- 5 테이블 + RLS 4-role audit (admin / sponsor / applicant / public)
- types regen
- L-019 pre-flight (workspaces sponsor 후보 0건)
- LOOP_MAX=3 (HIGH tier, L-052)

#### A.2 — Admin campaign create/edit + publish (2d, parallel)

`/admin/campaigns`:
- list (status filter)
- [+ 새 캠페인 작성] (Route A)
- detail/edit — title + brief + reference_assets editor + multi-category + file policy + compensation_model
- `publishCampaignAction` (status='draft' → 'published', submission_open_at set)

Server actions: createCampaignAction / updateCampaignAction / publishCampaignAction / addCategoryAction.

**EXIT**: yagi_admin 자체 캠페인 작성 + publish 가능. yagi-wording-rules cross-check.

#### A.3 — Public campaign landing (2d, parallel)

`/campaigns` (locale-free, list) + `/campaigns/[slug]` (detail):
- public access (anon + authenticated)
- list = status IN ('published','submission_closed','distributing','archived')
- detail = campaign info + brief + reference_assets + categories + 응모 form CTA + (status='distributing' / 'archived' 시) **distributed submissions showcase** (creator 들의 distribution URL gallery — 본 product 의 핵심 가치)
- middleware matcher 에 `campaigns` 추가 (locale-free)

**EXIT**: public landing + distributed showcase gallery 정상.

#### A.4 — Middleware update (0.5d, parallel)

`src/middleware.ts` 의 matcher 에 `campaigns` 추가 (locale-free, public access). `challenges` 가 이미 있으면 옆에 추가:

```
"/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|campaigns|.*\\..*).*)",
```

**EXIT**: /campaigns 진입 시 locale prefix X (locale-free 인식).

### Wave B — Sponsor request entry + admin approval (5d)

#### B.1 — [+ 캠페인 요청] entry (Brand + Artist, 2.5d, lead solo)

**Brand workspace** sidebar 또는 /app/projects 상단:
- [+ 캠페인 요청] button

**🆕 Artist workspace** (Phase 6 ship 의 two-entry → three-entry, PRODUCT-MASTER v1.6 §Y):
- [새 프로젝트 시작] (Phase 6)
- [브랜드 협업 제안] — Phase 10 까지 hidden 또는 Coming Soon
- **[+ 캠페인 요청]** (NEW Phase 7) — 가수가 fan 대상 AI 콘텐츠 캠페인 hosting

**Form** (`/app/campaigns/request`):
- title (required)
- brief (required, creative direction)
- reference_assets (URL list, 선택, but 가수의 경우 stems / 곡 demo URL 권장)
- 일정 의도 (응모 모집 시작 / 마감)
- 후원 의도 (자체 / co-sponsor / 야기 일임)
- compensation 의도 (exposure_only / fixed_fee — fixed_fee 시 amount per creator)
- 추가 메모
- **담당자 번호 (phone, required)** ← Q6 lock
- → `requestCampaignAction` (campaigns INSERT, status='requested', sponsor_workspace_id, request_metadata)

**EXIT**:
- workspace.kind IN ('brand', 'artist') 둘 다 entry 노출
- workspace.kind='creator' 노출 X (creator 는 sponsor 불가)
- request_metadata.contact_phone 필수
- 본인 요청 list 확인 가능

#### B.2 — Admin queue + approval workflow (2.5d, parallel)

`/admin/campaigns` list 의 status='requested' 자동 진입.

Admin actions:
- `reviewCampaignRequestAction` (requested → in_review)
- `approveCampaignRequestAction` (in_review → draft, decision_metadata)
- `declineCampaignRequestAction` (in_review → declined, decision_metadata=거절 사유)
- `requestMoreInfoAction` (in_review → requested, decision_metadata=추가 요청)

Sponsor email notification (4 status transition):
- 접수 / 승인 / 거절 / 추가 정보 요청

**EXIT**:
- 4-action 정상, decision_metadata audit trail
- email notification 발송

### Wave C — 응모 flow + Light Creator workspace (5d)

#### C.1 — workspaces.kind 'creator' + 응모 form (2d, lead solo)

**DB**:
```sql
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_kind_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_kind_check
  CHECK (kind IN ('brand', 'agency', 'artist', 'creator'));
```

**응모 form** (`/campaigns/[slug]/submit`):
- 부문 선택 (campaign_categories 중)
- 응모자 정보 (email + 작가명 + 담당자 phone + 팀명 선택)
- 작품 (R2 또는 외부 URL, campaign.allow_* 결정)
- → `submitCampaignApplicationAction`:
  - 기존 user (email match) 시 본인 workspace 사용
  - 없으면 auth.users + workspaces (kind='creator') + workspace_members + campaign_submissions
  - magic-link 자동 발송

**EXIT**: creator workspace 자동 가입 + 응모 정상.

#### C.2 — R2 응모작 upload (1.5d, parallel)

Phase 5 R2 Hybrid 패턴 재사용. campaign.allow_r2_upload=false 시 path 차단.

**EXIT**: R2 또는 외부 URL hybrid 정상.

#### C.3 — 본인 응모작 + distribution dashboard (1.5d, parallel)

`/app/my-submissions` (Creator workspace default):
- 본인 응모작 list + status badge (submitted / approved_for_distribution / declined / distributed / withdrawn)
- detail page:
  - 작품 preview
  - 검수 결과 (approved / declined / revision_requested + comment)
  - **status='approved_for_distribution' 시 → [+ 유포 채널 추가] CTA**
    - channel select (tiktok/instagram/youtube/youtube_shorts/x/other)
    - URL input
    - posted_at (default now)
    - → campaign_distributions INSERT, status='distributed' transition
  - **status='distributed' 시 → 본인 distribution list + metric log option**
    - view / like / comment 수 manual 입력 (Phase 7 MVP)

Creator workspace sidebar = "내 응모작" 만.

**EXIT**: distribution URL 등록 + metric log 정상. multi-distribution per submission OK (creator 가 여러 채널 동시 유포 가능).

### Wave D — Admin 검수 + Distribution tracking (4d)

#### D.1 — 검수 admin tool (1.5d, lead solo)

`/admin/campaigns/[id]/review`:
- 응모작 list per category
- 작품 preview + 검수 form (decision: approved / declined / revision_requested + comment)
- bulk action: status transition
- campaign_review_decisions audit trail per submission

Server actions: submitReviewDecisionAction (yagi_admin) / bulkUpdateSubmissionStatusAction.

**EXIT**: 단일 round 검수 정상, audit trail.

#### D.2 — Distribution tracking admin (1.5d, parallel)

`/admin/campaigns/[id]/distributions`:
- distributed submissions list
- channel 별 distribution URL + posted_at + metric (view/like/comment)
- admin metric log (creator 가 안 한 경우 admin 도 manual 입력 가능)
- aggregate dashboard: 캠페인 전체 view 합계, channel 별 distribution 수, top performing creator

**EXIT**: admin distribution dashboard 정상.

#### D.3 — Sponsor distribution dashboard + 결과 알림 email (1d, parallel)

**Sponsor (brand/artist workspace) 의 캠페인 detail dashboard**:
- 본인 sponsor 캠페인의 distribution status
- aggregate metrics (view 합계, channel 별 분포)
- creator distribution list (link 클릭 가능)

**Email notification**:
- creator: status='approved_for_distribution' 시 → "유포 진행해주세요" + 가이드
- creator: status='declined' / 'revision_requested' 시 → 통지
- sponsor: 첫 distribution 시 → "[캠페인명] 유포 시작!"
- sponsor: campaign 'distributing' → 'archived' 시 → final 결과 정리

**EXIT**: sponsor dashboard + email 자동 발송 (4+ status transition).

### Wave E — ff-merge gate (1d)

야기 browser smoke (35 step) + ff-merge to main.

## Verification (Builder responsibility — 35 step)

### Pre-apply (3)
1. tsc clean
2. lint clean
3. build clean

### Wave A — Schema + admin + public (10)
4. campaigns migration apply + RLS 4-role smoke
5. types regen
6. /admin/campaigns list + create/edit + publish 정상
7. yagi_admin 자체 캠페인 작성 + publish 가능
8. /campaigns (public list) status filter 정상
9. /campaigns/[slug] (public detail) brief + reference_assets + 응모 CTA
10. /campaigns/[slug] status='distributing'/'archived' 시 distributed showcase gallery (creator distribution URL 노출)
11. yagi-design-system 적용 (sage / radius 24 / shadow X)
12. yagi_admin only access for /admin/campaigns
13. middleware /campaigns locale-free 정상

### Wave B — Sponsor request (6)
14. Brand workspace + Artist workspace 둘 다 [+ 캠페인 요청] entry 노출
15. workspace.kind='creator' 노출 X
16. /app/campaigns/request 폼 (담당자 phone 필수)
17. requestCampaignAction → status='requested' + sponsor_workspace_id 정확
18. yagi_admin 4-action (review/approve/decline/request_more_info) 정상
19. sponsor email notification 발송 (4 status transition)

### Wave C — 응모 + Light Creator (8)
20. workspaces.kind='creator' 추가 verify
21. /campaigns/[slug]/submit anon + authenticated 둘 다 가능
22. 자동 magic-link + creator workspace 생성
23. 기존 user (email match) 시 workspace 중복 X
24. R2 upload 정상 (campaign.allow_r2_upload=true 시)
25. 외부 URL 응모 정상 (campaign.allow_external_url=true 시)
26. /app/my-submissions creator dashboard — 본인 응모작 + status
27. 다른 user 응모작 read X (RLS verify)

### Wave D — 검수 + Distribution (7)
28. /admin/campaigns/[id]/review 정상 (decision + comment)
29. campaign_review_decisions audit trail
30. status='approved_for_distribution' creator → /app/my-submissions 에서 [+ 유포 채널 추가] CTA 정상
31. campaign_distributions INSERT + status='distributed' transition
32. multi-distribution per submission (한 응모작 → 여러 채널 유포)
33. /admin/campaigns/[id]/distributions admin dashboard 정상 (aggregate metric)
34. sponsor 본인 캠페인 distribution dashboard 정상 (creator distribution list + view 합계)

### Static / Wording (1)
35. yagi-wording-rules cross-check — internal 워딩 ("Sponsor"/"Submission"/"Track"/"Roster"/"Distribution" 영문 노출 0)

## K-05 Codex review (LOOP_MAX per L-052)

| Wave | Tier | LOOP_MAX |
|---|---|---|
| A.1 schema + RLS | HIGH | 3 |
| A.2/A.3/A.4 admin + landing + middleware | MED | 2 |
| B.1/B.2 sponsor request + approval | HIGH | 3 |
| C.1 응모 + Creator workspace + auth admin API | HIGH | 3 |
| C.2/C.3 R2 + dashboard | MED | 2 |
| D.1/D.2/D.3 검수 + distribution + email | MED | 2 |

## K-06 Design Review

- MANDATORY all waves
- Reviewer: fresh Opus subagent
- Focus: 4-dimension + yagi-wording-rules cross-check + empty state (캠페인 0 / 응모작 0 / distribution 0 시 placeholder)
- LOOP_MAX=2

## Out-of-scope (Phase 8+ deferred)

- Phase 8 = Creator Hub (portfolio + browse + Roster funnel + distribution metric API auto-fetch)
- Phase 9 (optional) = Challenge MVP (KAICF-style contest, was Phase 7 SPEC v2)
- Phase 10 = Inbound Track
- Phase 11 = Compensation 정산 (fixed_fee / royalty_share 처리) + 시안 confirm + 권한 dial

## Migration apply policy

- Wave A.1: campaigns + categories + submissions + review_decisions + distributions (single migration)
- Wave C.1: workspaces.kind='creator' 추가
- 각 apply 후 types regen

## Sign-off

야기 SPEC v3 LOCKED (chat 2026-05-05) → Builder dispatch (Wave A.1 lead solo →
A.2/A.3/A.4 parallel x 3 → A K-05+K-06 → B.1 lead → B.2 parallel → B K-05+K-06
→ C.1 lead → C.2/C.3 parallel x 2 → C K-05+K-06 → D.1 lead → D.2/D.3 parallel
x 2 → D K-05+K-06) → 야기 browser smoke (35 step) → ff-merge GO.

Total estimate: 21d (Wave A 6 + B 5 + C 5 + D 4 + E 1) ≈ **6주 정직 estimate**.
