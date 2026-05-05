# Phase 7 — Challenge MVP + Brand Request + Light Creator workspace

Status: DRAFT v1, awaiting 야기 review + §V Q1-Q8 lock.
Author: 야기 + Web Claude (chat 2026-05-05)
Scope tier: PHASE (~4-6 주 sprint, Phase 5 lessons 1.5x 보정)
Baseline: branch `main` (Phase 6 ff-merge 완료, Hotfix-3 ship 후)
Source-of-truth: PRODUCT-MASTER §Q (Challenge product) + §R (Creator
workspace) + §S (3-side cases) + §T (Phase 7-10 재정렬) + §M (워딩 룰)

## Vision (locked, chat 2026-05-05)

> Phase 7 = Challenge MVP + Brand Request + Light Creator workspace.
> 사업 가치 = "야기 admin 이 KAICF-style 챌린지 1건 hosting 가능 + Brand
> client 가 챌린지 요청 가능 + 누구나 응모 가능 (자동 가입)."
>
> Phase 8 = Creator Hub 확장 (portfolio + browse + Roster funnel).
> Phase 9 = Inbound Track (Brand RFP → Roster 매칭).
> Phase 10 = 수신 설정 + 시안 + 정산.

근거: Roster Artist 0명 상태에서 Inbound Track ship = 즉 작동 X. Challenge
ship 후 응모자 → Roster funnel 검증 → Phase 8/9 정확한 scope 결정. KAICF
같은 외부 demand 이미 검증됨 = first user 진입 보장.

## Phase 7 deliverables (사업 가치 단위)

1. **야기 자체 KAICF-style 챌린지 1건 hosting 가능** — admin tool 에서
   challenge create/edit/publish, 응모 모집, 심사, 시상 발표
2. **Brand client (Brand workspace) 가 챌린지 요청 가능** — [+ 챌린지 요청]
   폼 → admin queue → admin approval → publish (admin draft 작성)
3. **누구나 응모 가능** — 회원가입 없이 응모 시 light Creator workspace
   자동 생성 (magic-link), R2 작품 upload, 본인 응모작 dashboard
4. **심사 admin tool** — 1차/2차/최종 round 별 score + comment + status
   transition + 입상 결정
5. **시상 발표 page** — 입상자 announce + 응모자 결과 알림 (email)

## Decisions to lock at KICKOFF entry (§V — Phase 7 lock items)

다음 8개 야기 decision 필요:

| # | 항목 | 야기 결정 | Default 권장 |
|---|---|---|---|
| 1 | 첫 챌린지 형태 | TBD | (a) 야기 자체 KAICF-style 1건 (큰 행사) — 외부 client 영입 timing 따라 결정 |
| 2 | 워딩 통일 — "챌린지" vs "공모전" | TBD | (a) **"챌린지"** — 작은 brand 챌린지 + 큰 공모전 모두 포괄. KAICF 같은 큰 행사도 "AI 콘텐츠 챌린지" 명명 가능. UI 단일 워딩 |
| 3 | 응모자 가입 방식 | TBD | (a) 응모 시 자동 magic-link (회원가입 없이 응모 form 제출 시 light workspace 자동 생성, email 의 magic-link 클릭 후 password 설정 → 본인 dashboard 진입) |
| 4 | 심사 round 수 | TBD | (a) 3-round (1차/2차/최종) — KAICF 패턴, 큰 챌린지 default. 작은 챌린지는 2-round (1차/최종) flag 로 단순화 가능 (challenge.judging_rounds_count column) |
| 5 | 응모작 file 처리 | TBD | (a) Hybrid — R2 직접 upload + 외부 URL (YouTube/Vimeo) 둘 다 허용. category.format_spec 에 허용 여부 jsonb 명시 |
| 6 | Brand request 폼 minimum 정보 | TBD | challenge title / 상금 (선택) / 부문 / 일정 / 후원 brand info / 의도 / 대상 응모자 |
| 7 | 시상금 정산 | TBD | (a) Phase 7 = 입상 announce 까지만. 정산 = Phase 10 으로 deferred. 시상금 표시는 challenge_awards.prize_amount 에 capture, 외부 manual 처리 |
| 8 | Creator → Roster 영입 funnel UI | TBD | (b) Phase 8 deferred. Phase 7 admin tool = 응모자 list + 입상 history 까지만. Roster invite UX 는 Phase 8 |

→ **Phase 7 entry 시 8개 모두 lock 필요**.

## Scope: 4 waves + 1 ff-merge gate (Wave A + B + C + D + E)

### Wave A — Challenge core (5d)

#### A.1 — Challenge schema (1.5d, lead solo base)

`supabase/migrations/<timestamp>_phase_7_challenges.sql` — PRODUCT-MASTER
§Q 의 5개 테이블:
- challenges
- challenge_categories
- challenge_submissions
- challenge_judgings
- challenge_awards

**RLS** (K-05 mandatory, L-049 4-perspective walk):

```sql
-- challenges SELECT
-- yagi_admin: all
-- Brand workspace user: 본인 sponsor_workspace_id 의 challenge (status='requested'/'in_review'/'declined' 까지). published 후는 public.
-- 누구나 (anon + authenticated): status='published'/'judging'/'awarded' challenge 의 public field
-- (제외: request_metadata, decision_metadata = admin only)

-- challenges INSERT
-- yagi_admin: all (Route A 야기 자체 hosting + Route B admin draft 작성)
-- Brand workspace user: status='requested' + sponsor_workspace_id = 본인 workspace 만 (Route B 진입)

-- challenges UPDATE
-- yagi_admin: all
-- Brand workspace user: 본인 sponsor 의 status='requested' 만 (admin 검토 진입 전 수정 가능)

-- challenge_submissions SELECT
-- yagi_admin: all
-- 본인 응모자 (workspace_member of applicant_workspace_id): 본인 응모작만
-- public: status='awarded' 응모작 (시상 page) 의 일부 field

-- challenge_submissions INSERT
-- 응모 form server action 만 (service-role bypass) — RLS USING/CHECK 가
-- direct INSERT 차단

-- challenge_submissions UPDATE
-- yagi_admin: all (status transition + 심사 결정)
-- 응모자 본인: status='draft' 일 때만 (응모 마감 전 수정)

-- challenge_judgings: yagi_admin only

-- challenge_awards
-- SELECT: public read (시상 page)
-- INSERT/UPDATE/DELETE: yagi_admin only
```

**Column-level grant** (sub_5 패턴):
- challenges 의 status / decision_metadata = yagi_admin only update
- challenge_submissions 의 status = yagi_admin only update (응모자 본인은
  status='draft' 의 다른 column 만)

**EXIT**:
- 5 테이블 + RLS (4-perspective audit) + column grants
- types regen
- L-019 pre-flight (workspaces 중 sponsor 후보 확인)
- tsc + lint + build clean

#### A.2 — Admin challenge create/edit (2d, parallel)

`/admin/challenges` admin tool:
- list (status filter: 모든 status, 또는 'requested' / 'draft' / 'published' 등)
- [+ 새 챌린지 작성] — Route A 의 야기 자체 hosting entry
- detail/edit page — challenge 의 모든 field, multi-category add/edit, prize_breakdown jsonb editor

**Server actions**:
- `createChallengeAction` (yagi_admin, Route A)
- `updateChallengeAction` (yagi_admin)
- `addChallengeCategoryAction` / `updateChallengeCategoryAction`
- `publishChallengeAction` (status='draft' → 'published')

**EXIT**:
- /admin/challenges 페이지 + create/edit form 정상
- 야기 자체 KAICF-style 챌린지 1건 작성 + publish 가능
- yagi_admin only access (다른 role notFound)
- 워딩 cross-check (yagi-wording-rules)
- tsc + lint + build clean

#### A.3 — Public challenge landing (1.5d, parallel)

`/challenges` (list) + `/challenges/[slug]` (detail):
- Public (anon + authenticated 둘 다 access)
- list = 'published' / 'judging' / 'awarded' challenge 만 노출
- detail = 챌린지 정보 + 부문 list + 응모 form CTA + 시상 결과 (status='awarded' 시)
- middleware matcher 에 `challenges` 추가 (locale-free 가능, 이미 ship: middleware.ts)

**EXIT**:
- /challenges 와 /challenges/[slug] 정상 (anon + authenticated 둘 다)
- yagi-design-system 적용 (sage / radius 24 / shadow X)
- tsc + lint + build clean

### Wave B — Brand client challenge request (4d)

#### B.1 — Brand workspace 의 [+ 챌린지 요청] entry (2d, lead solo)

Brand workspace 사이드바 또는 /app/projects 페이지 상단에 [+ 챌린지 요청]
button 추가.

**Form** (`/app/challenges/request`):
- challenge title (required)
- 부문 (multi, e.g., "광고 영상 / 뮤직비디오")
- 상금 규모 의도 (선택, 협의 가능 표시)
- 일정 의도 (응모 모집 시작 / 마감 / 발표)
- 후원 의도 (자체 sponsor / co-sponsor / 야기에게 일임)
- 대상 응모자 (AI artist / 일반 / 등)
- 추가 메모 (자유)
- → submit 시 `requestChallengeAction` 호출, challenges INSERT (status='requested', sponsor_workspace_id=본인 workspace, request_metadata=폼 답)

**EXIT**:
- Brand workspace user 가 challenge 요청 폼 제출 가능
- challenges row INSERT 정상 (status='requested', sponsor_workspace_id 정확)
- 본인이 본인 요청 list 확인 가능 (status='requested'/'in_review'/'declined' 까지 read)
- workspace.kind != 'brand' 일 때 entry 노출 X
- tsc + lint + build clean

#### B.2 — Admin challenge queue + approval (2d, parallel)

`/admin/challenges` 의 list 가 status='requested' 인 challenge 자동 진입
(이미 A.2 의 list 가 모든 status 노출하니 = 별도 페이지 불필요).

**Admin action**:
- `reviewChallengeRequestAction` (status='requested' → 'in_review')
- `approveChallengeRequestAction` (status='in_review' → 'draft', admin 이
  이후 actual challenge 작성 진입. decision_metadata = "approved by yagi_admin at <date>" 등)
- `declineChallengeRequestAction` (status='in_review' → 'declined', decision_metadata = 거절 사유)
- `requestMoreInfoAction` (status='in_review' → 'requested', decision_metadata = 추가 요청 메시지) — Brand 가 form 다시 update

**Brand notification** (email):
- request 제출 시: "요청 접수되었습니다. 검토 후 알려드릴게요." → Brand
- approve 시: "챌린지 승인되었습니다. 곧 publish 됩니다." → Brand
- decline 시: "검토 결과 ..." → Brand
- request_more_info 시: "추가 정보 요청드립니다. ..." → Brand

**EXIT**:
- yagi_admin 이 list 에서 status='requested' challenge 검토 + 4-action 가능
- decision_metadata audit trail 정확
- email notification 발송 (Supabase auth admin API 또는 별도 SMTP)
- tsc + lint + build clean

### Wave C — 응모 flow + Light Creator workspace (5d)

#### C.1 — workspaces.kind 'creator' 추가 + 응모 form (2d, lead solo)

**DB**:
```sql
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_kind_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_kind_check
  CHECK (kind IN ('brand', 'agency', 'artist', 'creator'));
```

**응모 form** (`/challenges/[slug]/submit`):
- 부문 선택 (challenge_categories 중)
- 응모자 정보:
  - email (required, magic-link 발송 대상)
  - 작가명 또는 팀명 (required, workspace.name)
  - 팀원 list (선택, jsonb)
- 작품 정보:
  - title, description
  - file upload (R2 — Phase 5 의 R2 Hybrid 패턴 재사용) OR 외부 URL
  - thumbnail (R2 자동 생성 또는 직접 upload)
- → submit 시 `submitChallengeApplicationAction`:
  - 기존 user 존재 (email match) 시: 본인 workspace 사용
  - 없으면: auth.users + workspaces (kind='creator') + workspace_members + challenge_submissions row 생성, magic-link 자동 발송
  - 응모자가 email 의 magic-link 클릭 → password 설정 → 본인 dashboard

**EXIT**:
- 응모 form 정상 (anon + authenticated 둘 다 가능)
- workspace.kind='creator' 자동 생성 + magic-link 발송
- 기존 user 의 응모 시 workspace 중복 생성 안 함 (email match check)
- challenge_submissions row 정확 (applicant_workspace_id 연결)
- tsc + lint + build clean

#### C.2 — R2 작품 upload pipeline (1.5d, parallel)

Phase 5 의 R2 Hybrid 패턴 재사용:
- presigned URL request server action
- client direct upload to R2
- callback server action (file metadata DB persist)

**EXIT**:
- 영상 file (MP4 1080p+) upload 정상
- challenge_submissions.content_r2_key 정확
- thumbnail 자동 생성 (Phase 5 패턴)
- 외부 URL 응모 시 R2 skip + external_url field 사용
- tsc + lint + build clean

#### C.3 — 본인 응모작 dashboard (1.5d, parallel)

`/app/my-submissions` (Creator workspace 진입 시 default):
- 본인 응모작 list + status badge (submitted / round_1_pass / 등)
- 각 응모작 detail page 진입 가능 (작품 preview + 심사 progress)
- status='draft' 응모작 = 수정/삭제 가능

**Creator workspace sidebar**:
- 단순. "내 응모작" 만. (Roster Artist 의 entry 없음)

**EXIT**:
- Creator user 가 본인 응모작 list + status 확인 가능
- 다른 user 의 응모작 read X (RLS USING)
- workspace switcher 가 'creator' kind 도 정상 처리
- tsc + lint + build clean

### Wave D — 심사 + 시상 (5d)

#### D.1 — 심사 admin tool (2.5d, lead solo)

`/admin/challenges/[id]/judging`:
- 응모작 list per category
- round 별 (1차/2차/최종) 심사 view — score input + comment
- bulk action: status transition (round_1_pass / round_1_fail 등)
- challenge_judgings audit trail per submission

**Server actions**:
- `submitJudgingScoreAction` (yagi_admin)
- `bulkUpdateSubmissionStatusAction` (yagi_admin)

**EXIT**:
- 심사 admin tool 정상 (round 별 view + score + status transition)
- challenge_judgings audit trail 정확
- tsc + lint + build clean

#### D.2 — 시상 결정 + 발표 page (1.5d, parallel)

`/admin/challenges/[id]/awards`:
- finalist list (status='finalist') 중 prize_tier 별 입상자 결정
- challenge_awards row 생성 + status='awarded' transition
- challenge.status = 'awarded' 시 public 시상 page 자동 활성

`/challenges/[slug]/awards` (public):
- prize_tier 별 입상자 list (작품 thumbnail + title + 작가명)
- 결과 발표 timestamp

**EXIT**:
- 입상 결정 + challenge_awards row 정확
- public 시상 page 정상 (anon access)
- tsc + lint + build clean

#### D.3 — 결과 알림 email (1d, parallel)

응모자 email 알림:
- round_1_pass → "1차 심사 통과되셨습니다. 2차 심사 일정 ..."
- round_1_fail → "이번에는 ..." (격려 + 다음 챌린지 안내)
- finalist → "최종 후보 ..."
- awarded → "🏆 ... 수상하셨습니다!"

email template (Supabase auth admin 또는 별도 SMTP — Wave B.2 의 패턴 재사용)

**EXIT**:
- 응모자 status transition 시 email 자동 발송
- email template 의 워딩 cross-check 통과
- tsc + lint + build clean

### Wave E — ff-merge gate (1d)

야기 browser smoke + ff-merge to main.

## Verification (Builder responsibility — 30 step)

### Pre-apply (3)
1. tsc clean
2. lint clean
3. build clean

### Wave A — Challenge core (8)
4. challenges migration apply + RLS multi-role smoke (4-perspective)
5. types regen
6. /admin/challenges (yagi_admin) — list + create/edit + multi-category 정상
7. yagi 자체 KAICF-style 챌린지 1건 작성 + publish 정상
8. /challenges (public list) — 'published'/'judging'/'awarded' 만 노출
9. /challenges/[slug] (public detail) — 정보 + 응모 form CTA 정상
10. yagi-design-system 적용 (sage / radius 24 / shadow X)
11. yagi_admin only access for /admin/challenges (다른 role notFound)

### Wave B — Brand request (5)
12. Brand workspace user 가 [+ 챌린지 요청] entry 노출 (workspace.kind='brand' 만)
13. /app/challenges/request 폼 제출 → challenges row INSERT (status='requested')
14. yagi_admin 이 admin queue 에서 review/approve/decline/request_more_info 가능
15. Brand 에게 email notification 발송 (4 status transition 모두)
16. Brand 가 본인 요청 list 확인 가능, decision_metadata 노출

### Wave C — 응모 flow (8)
17. workspaces.kind='creator' 추가 verify
18. /challenges/[slug]/submit 폼 정상 (anon + authenticated 둘 다)
19. 응모 시 자동 workspace 생성 + magic-link 발송
20. 기존 user (email match) 의 응모 시 workspace 중복 생성 X
21. R2 작품 upload 정상 (presigned URL + direct upload + callback)
22. 외부 URL 응모 (YouTube/Vimeo) 정상
23. /app/my-submissions — Creator user 가 본인 응모작 list + status 확인
24. 다른 user 의 응모작 read X (RLS verify)

### Wave D — 심사 + 시상 (5)
25. /admin/challenges/[id]/judging — round 별 score + status transition 정상
26. challenge_judgings audit trail 정확
27. /admin/challenges/[id]/awards — 입상자 결정 + challenge_awards 생성
28. /challenges/[slug]/awards (public) — 입상자 list 정상
29. 응모자 email 알림 발송 (status transition 시)

### Static / Wording (1)
30. yagi-wording-rules cross-check — internal 워딩 ("Sponsor"/"Submission"/"Judging"/"Track" 등) i18n key value / component label 노출 0건

## K-05 Codex review

- **Tier**:
  - Wave A.1 (schema + RLS) = **HIGH** (LOOP_MAX=3, L-052 적용)
  - Wave A.2/A.3 (admin tool + public landing) = MED (LOOP_MAX=2)
  - Wave B (Brand request + admin queue) = HIGH (LOOP_MAX=3) — 새 server
    actions + status transition guards
  - Wave C (응모 flow + Creator workspace) = HIGH (LOOP_MAX=3) — auth admin
    API + workspace 자동 생성 + RLS 복합
  - Wave D (심사 + 시상) = MED (LOOP_MAX=2) — admin only writes

## K-06 Design Review

- **MANDATORY all waves** — UI surface 다양 (admin tool + public landing +
  Brand request 폼 + 응모 form + Creator dashboard + 시상 page)
- Reviewer: fresh Opus subagent
- Focus: 4-dimension + yagi-wording-rules cross-check + 0-user state 의
  empty UX (응모작 0건 / 챌린지 0건 시 placeholder)

## Out-of-scope (Phase 8+ deferred)

- **Phase 8** = Creator Hub 확장 (portfolio + browse + Roster funnel)
- **Phase 9** = Inbound Track (PRODUCT-MASTER §O Wave C+D)
- **Phase 10** = 수신 설정 + 시안 + 정산 (PRODUCT-MASTER §O Wave E+F+G)

## Migration apply policy

5+ migrations:
1. Wave A.1: challenges + categories + submissions + judgings + awards (single migration)
2. Wave C.1: workspaces.kind 'creator' 추가
3. (선택) Wave 별 column adjustments

각 apply 후 types regen.

## Sign-off

야기 SPEC v1 review → §V Q1-Q8 lock 답변 → Builder dispatch (Wave A.1 lead
solo → A.2/A.3 parallel x 2 → Wave A K-05/K-06 → Wave B.1 lead solo →
B.2 parallel → Wave B K-05/K-06 → Wave C.1 lead solo → C.2/C.3 parallel
x 2 → Wave C K-05/K-06 → Wave D.1 lead solo → D.2/D.3 parallel x 2 →
Wave D K-05/K-06) → 야기 browser smoke (30 step) → ff-merge GO.

---

## 야기 review 항목 (SPEC v1 → v2 결정 필요)

§V Q1-Q8 위 표 참조. 답 받으면 SPEC v2 lock + KICKOFF_PROMPT 작성.
