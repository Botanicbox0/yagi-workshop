

---
---

# v1.4 Amendment (2026-05-05, post-Phase-6 ship)

> append-only. Phase 6 ship 완료 (commit `ac85837`, ff-merged to main).
> Phase 7+ entry prep. **Challenge product surface 신설** + **Creator
> workspace kind 신설** + Phase 7-10 재정렬 + Phase 6 lessons + 3-side
> marketplace cases.

## Amendment trigger

Phase 6 ship 후 Hotfix-3 (logo + logout + 랜딩 삭제) + Phase 7 entry 준비
중, 다음 자각:

1. **Challenge product = 외부 demand 검증됨** — KAICF (Korea AI Content
   Festival, 1억 6천만원 상금) 같은 챌린지가 야기 사업의 자연 entry. Phase
   7 가장 우선 ship 가치.
2. **3-side marketplace 구조** — Brand client + Roster Artist + open
   Creator. 검증된 패턴 (99designs / Talenthouse / Tongal / 카카오게임즈
   IF). 단일 portal + workspace.kind 분기 = 자연 확장.
3. **Inbound Track 후순위** — Roster Artist 0명 상태 = Inbound Track ship
   해도 즉 작동 X. Challenge ship 후 응모자 → Roster funnel 검증 후 진입.
4. **0-user state 활용** — Schema breaking 자유. workspace.kind 'creator'
   추가 + challenges 테이블군 신규 = breaking 0건.

---

## §Q — Challenge product surface (Phase 7 entry lock)

### Challenge 정의

Brand client (외부) 또는 야기 (자체) 가 sponsor 가 되어 hosting 하는 공모
형태 contest. KAICF 패턴 = 응모 부문 다중 (드라마 / 뮤직비디오 / 광고),
1차→2차→최종 심사, 입상 (대상/최우수/우수/입상) + 상금.

### Challenge 의 진입 흐름 (3 routes)

**Route A — 야기 자체 hosting**:
```
yagi_admin 이 admin tool 에서 직접 challenge 작성 → publish.
sponsor = 야기 자체 (또는 야기 group 의 다른 entity).
첫 KAICF-style 챌린지 = 이 route. Phase 7 Wave A 의 first user.
```

**Route B — Brand client request → admin approval**:
```
Brand workspace user 가 [+ 챌린지 요청] 폼 → admin queue → yagi_admin
검토 → 승인 / 거절 / 정보 추가 요청 → 승인 시 admin 이 actual challenge
draft 작성 → publish.
첫 외부 client (예: 후라이드참잘하는집) 진입 시 = 이 route.
Phase 7 Wave B 가 이 flow ship.
```

**Route C — Hybrid sponsor (야기 + 외부 brand)**:
```
KAICF 같은 형태 — 야기 직접 hosting 하지만 외부 brand 가 sponsor 로
참여. challenges.has_external_sponsor = true, external_sponsor_name =
"후라이드참잘하는집" 등.
Phase 7 schema 가 hybrid 지원.
```

### Challenge entity 모델 (Phase 7 KICKOFF schema)

```sql
-- challenges (메인)
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  -- sponsor 모델 (Route A/B/C 지원)
  sponsor_workspace_id uuid REFERENCES workspaces(id),  -- nullable: 야기 자체 hosting 시 NULL
  has_external_sponsor boolean NOT NULL DEFAULT false,  -- Route C 지원 (외부 brand co-sponsor)
  external_sponsor_name text,                            -- "후라이드참잘하는집" 등
  -- 상태 + 일정
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'requested',     -- Brand 가 요청 폼 제출 (Route B 진입)
    'in_review',     -- admin 검토 중
    'declined',      -- admin 거절
    'draft',         -- admin 이 작성 중 (Route A 의 default 또는 B 의 승인 후)
    'published',     -- 응모 모집 시작
    'submission_closed', -- 응모 마감, 심사 진입
    'judging',       -- 심사 진행 중
    'awarded',       -- 시상 완료
    'archived'       -- 보관
  )),
  submission_open_at timestamptz,
  submission_close_at timestamptz,
  judging_starts_at timestamptz,
  awards_announced_at timestamptz,
  -- 상금 + 입상 구조
  prize_total_amount numeric(12, 2),
  -- meta
  created_by uuid NOT NULL REFERENCES profiles(id),
  request_metadata jsonb,  -- Route B 의 Brand request 시 capture
  decision_metadata jsonb, -- admin approval 시 capture (curation note 등)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- challenge_categories (응모 부문 — KAICF 의 "드라마/뮤비/광고" 처럼)
CREATE TABLE challenge_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  name text NOT NULL,                  -- "드라마 미드폼", "뮤직비디오 가로형" 등
  description text,
  format_spec jsonb,                   -- {"orientation": "horizontal", "duration_max_seconds": 1800, "format": "MP4 1080p+"}
  prize_breakdown jsonb,               -- {"대상": 4000_0000, "최우수상": 600_0000, ...}
  display_order int NOT NULL DEFAULT 0
);

-- challenge_submissions (응모작)
CREATE TABLE challenge_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES challenge_categories(id),
  -- 응모자 (Route: light Creator workspace 자동 생성 시)
  applicant_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  applicant_email text NOT NULL,
  team_name text,                       -- 개인 응모 시 NULL, 팀 응모 시 팀명
  -- 작품 메타
  title text NOT NULL,
  description text,
  content_r2_key text,                  -- R2 storage key (영상 file 직접 upload)
  external_url text,                    -- 또는 외부 URL (YouTube, Vimeo 등)
  thumbnail_r2_key text,
  duration_seconds int,
  -- 심사 status
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted',
    'round_1_pass', 'round_1_fail',
    'round_2_pass', 'round_2_fail',
    'finalist',
    'awarded', 'not_awarded',
    'withdrawn'
  )),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- challenge_judgings (심사 audit trail)
CREATE TABLE challenge_judgings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  judge_user_id uuid NOT NULL REFERENCES profiles(id),
  round text NOT NULL CHECK (round IN ('round_1', 'round_2', 'final')),
  score numeric(4, 2),                  -- e.g., 0-100 or 1-10
  comment text,
  decided_at timestamptz NOT NULL DEFAULT now()
);

-- challenge_awards (시상 결과)
CREATE TABLE challenge_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL UNIQUE REFERENCES challenge_submissions(id) ON DELETE CASCADE,
  prize_tier text NOT NULL,             -- '대상', '최우수상', '우수상', '입상' (Phase 7 KICKOFF lock)
  prize_amount numeric(12, 2),
  awarded_at timestamptz NOT NULL DEFAULT now()
);
```

⚠️ Phase 7 KICKOFF 시 K-05 mandatory:
- challenges RLS — Brand workspace user 가 본인 sponsor challenge 만 read/edit (status='requested'/'in_review' 까지만), yagi_admin 은 전체 bypass
- challenge_submissions RLS — 응모자 본인만 read 본인 응모작 (light Creator workspace 의 user_id), yagi_admin 전체
- challenge_judgings RLS — yagi_admin only (internal audit trail)
- challenge_awards RLS — public read after status='awarded' (announce page), yagi_admin only write

### Challenge 워딩 룰 (§M 확장, v1.4)

| Internal | UI 노출 X | 제품 surface 대안 |
|---|---|---|
| Sponsor (영문) | KO UI 어색 | "주최", "후원" |
| Track / Stage / Round | jargon | "1차 심사 / 2차 심사 / 최종 심사" |
| Submission | 영문 | "응모작" |
| Judging | 영문 | "심사" |
| Curation note (admin internal) | UI X | (외부 노출 없음, admin only) |

UI 노출 surface 워딩 (제품):
- "챌린지" / "공모전" — 야기 결정. KAICF 같은 큰 행사 = "공모전", 작은 brand 챌린지 = "챌린지". Phase 7 KICKOFF 시 1개로 통일 필요
- "응모작" / "응모하기" / "응모자"
- "심사" / "1차 심사 / 2차 심사 / 최종 심사" / "심사 결과"
- "시상" / "대상 / 최우수상 / 우수상 / 입상"
- "주최" / "후원"
- "참가 부문"

---

## §R — Creator workspace kind (NEW, Phase 7 entry lock)

### Creator 정의 vs Roster Artist

| 차원 | Roster Artist (workspace.kind='artist') | Open Creator (workspace.kind='creator') |
|---|---|---|
| 가입 | yagi_admin 이 invite (curated) | 누구나 가입 (open) |
| 진입 | Magic-link invite + 1-step onboarding (Phase 6 ship) | 챌린지 응모 시 자동 가입 (light) 또는 self sign-up |
| 권한 | [새 프로젝트 시작] + [브랜드 협업 제안] (Phase 6 / 8) | 챌린지 응모만 (Phase 7) → portfolio (Phase 8) |
| 상태 | active 소속 작가 | 응모자 풀 |
| Roster 영입 funnel | — | 입상자 / 우수 응모자 → admin invite → kind 'creator' → 'artist' 승격 |

### Creator workspace 자동 생성 흐름 (Phase 7 Wave C)

응모 시 (회원가입 없이 진입):
```
응모 form 제출 (email + 작가명/팀명 + 작품 upload)
  ↓
Server action: createCreatorWorkspaceFromSubmission()
  - auth.users 에 새 user 생성 (magic-link 자동 발송)
  - workspaces row INSERT (kind='creator', name=작가명/팀명)
  - workspace_members row (role='owner')
  - challenge_submissions row (applicant_workspace_id 연결)
  ↓
응모자 email 의 magic-link 클릭 → password 설정 → 본인 응모작 dashboard 진입
```

### Creator workspace UI (Phase 7 ship 분량)

- **본인 응모작 dashboard** (`/app/my-submissions`) — 응모 history + status (submitted / round_1_pass / 등) + 결과 알림
- **사이드바** = 단순. "내 응모작" 만. (Roster Artist 의 "새 프로젝트 시작" / "브랜드 협업 제안" entry 노출 X)
- **Workspace switcher** — 1개 workspace 만 보유 일반적. 단 Roster 승격 시 자동으로 kind='artist' workspace 추가 = switcher 에 둘 다 노출

### Creator → Roster 영입 funnel (Phase 7 admin tool)

```
admin /admin/creators (NEW Phase 7)
  → 응모자 list + 입상 history + 작품 quality
  → [Roster 영입 제안] button
  → 해당 user 에게 invite email + onboarding (artist_profile 생성)
  → 기존 'creator' workspace 유지 + 새 'artist' workspace 생성
  → user 가 둘 다 access (workspace switcher 로 전환)
```

### Phase 8 확장 vision (deferred)

- Creator workspace 의 portfolio page (작품 gallery + R2 storage)
- Browse / search (다른 creator 발견)
- Notification (challenge 알림, follow)
- Social (좋아요 / DM) — 검증 후 진입 결정

---

## §S — 3-side marketplace 사례 research (v1.4)

야기 vision 의 검증된 패턴 4개 (chat 2026-05-05 research):

| 플랫폼 | Brand side | Curated artist (Roster) | Open creator | 시사점 |
|---|---|---|---|---|
| **99designs** | Contest 또는 1:1 의뢰 | Top tier (Platinum, invite-only) | 누구나 가입 + portfolio | 야기 Roster vs Creator 모델 정확히 동일 |
| **Talenthouse** | Brand challenge / 캠페인 hosting | Featured creators | 누구나 가입, 응모, portfolio | KAICF 패턴과 가장 유사. Single portal |
| **Tongal** | Brand brief + 상금 hosting | — (open 만) | 가입 후 portfolio + 응모 | 3-stage 심사 (concept → draft → final). 야기 시안 confirm workflow 와 동일 |
| **카카오게임즈 IF** | 퍼블리셔 contest | — | 인디 개발자 가입 + 출품 | 한국 시장 검증. light 가입 (이메일 + 닉네임) |

**핵심 패턴**:
- Single user account + multi-workspace.kind = 99designs / Talenthouse 그대로
- Brand 가 contest 또는 1:1 둘 다 가능 = 야기 Phase 7 (Challenge) + Phase 9 (Inbound Track) 둘 다
- Curated tier 와 open tier 분리 = Roster Artist (invite-only) + Creator (open) 정확
- 응모 시 light 가입 (회원가입 강제 X, email + 닉네임만) = Phase 7 Wave C

야기 시스템은 **이미 검증된 패턴 위에 빌드 중**. Phase 6 의 workspace.kind 모델이 그 토대.

---

## §T — Phase 7-10 재정렬 (v1.4 lock)

| Phase | Scope | 시간 |
|---|---|---|
| **Phase 7** | Challenge MVP + Brand request + Light Creator account (workspace.kind='creator' 추가, 자동 가입 응모) | 4주 |
| **Phase 8** | Creator Hub 확장 — portfolio gallery + browse + Roster 영입 funnel admin tool + (검증 후) social | 4-5주 |
| **Phase 9** | Inbound Track — Brand RFP → Roster Artist 매칭 + Artist [브랜드 협업 제안] 큐 (수락/거절). 기존 v1.3 §O Wave C+D | 2-3주 |
| **Phase 10** | 수신 설정 + 시안 confirm workflow + 사용료 정산 + ff-merge gate. 기존 v1.3 §O Wave E+F+G | 2-3주 |

**Total roadmap = 12-15주 (3-4 개월)**.

### Phase 7 wave 분해 (KICKOFF 시 lock — 이번 amendment 에서 최종)

- **Wave A**: Challenge 핵심 schema (challenges + categories + submissions + judgings + awards) + admin challenge create/edit + public challenge landing (`/challenges/[slug]`) + 첫 KAICF-style 야기 자체 hosting 가능 (5d)
- **Wave B**: Brand client challenge request 폼 (Brand workspace 의 [+ 챌린지 요청] entry) + admin queue + admin approval workflow (4d)
- **Wave C**: 응모 flow — 누구나 가입 (workspace.kind='creator' 자동 생성, light onboarding) + R2 작품 upload + 본인 응모작 dashboard (5d)
- **Wave D**: 심사 stage admin tool (1차/2차/최종) + 시상 발표 page + 결과 알림 (5d)
- **Wave E (gate)**: ff-merge to main (1d)

총 ~20d ≈ **4주**. Phase 5 lessons 1.5x 보정 = **5-6주 정직 estimate**.

### Phase 7 KICKOFF 시 lock 필요한 결정 (§N 확장)

1. **첫 챌린지 형태** — 야기 자체 KAICF-style (큰 1건) vs 작은 brand 챌린지 (외부 client 영입)
2. **공모전 vs 챌린지 워딩 통일** — 둘 다 사용 가능. Phase 7 = "챌린지" 또는 "공모전" 하나 결정
3. **응모자 가입 방식** — 응모 시 자동 가입 (magic-link 발송) vs 자발 sign-up first
4. **심사 round 수** — 1차/2차/최종 (3-round, KAICF 패턴) vs 1차/최종 (2-round, 작은 챌린지)
5. **R2 vs 외부 URL** — 응모작이 R2 직접 upload vs YouTube/Vimeo URL 입력 vs 둘 다 허용
6. **Brand request 의 minimum 정보** — 폼에 무엇을 받을지 (challenge title / 상금 / 부문 / 일정 / 후원 의도)
7. **시상금 정산 방식** — Phase 7 안에서 ship vs Phase 10 으로 deferred (Phase 7 시점 = 입상 announce 까지만, 정산은 외부 manual)
8. **Creator → Roster 영입 funnel UI** — Phase 7 admin tool 에 포함 vs Phase 8 deferred

→ Phase 7 KICKOFF SPEC 작성 시 위 8개 lock 답 필요. v1.4 amendment 시점 = 1-7 미정.

---

## §U — Phase 6 lessons + Phase 7 entry prep

### Phase 6 lessons (요약, 본문 = `.yagi-autobuild/phase-6/_phase_6_result.md`)

- **Estimate vs actual**: 2주 estimated → 1 session executed (Builder 자율 야기 자는 동안). Phase 5 (5주 vs 3주 = 1.67x) 와 비교 큰 차이. 단순 phase 의 자율 실행 검증
- **K-05 LOOP-3 정상 cascade** — HIGH-B fix 가 새 finding 도입한 정상 패턴. SPEC LOOP_MAX=2 가 너무 tight. Phase 7 부터 LOOP_MAX=3 권장
- **K-06 효과 명확** — amber 색 위반 (sage-only Hard Rule) 2회 catch + EN 워딩 leak 1회 catch. yagi-design-system + yagi-wording-rules skill cross-check 검증
- **0-user state 활용** — Schema breaking 자유. Phase 7 도 0-user state 가정 (외부 client 영입 timing 따라 결정)

### Phase 7 entry prerequisite (이 amendment 후)

1. ✅ Phase 6 hf2 → main ff-merge (commit `ac85837`)
2. ✅ Phase 6 lessons (= `_phase_6_result.md`)
3. ⏳ Phase 6 Hotfix-3 ship (chat dispatch 됨, 진행 중)
4. ⏳ 본 v1.4 amendment 작성 (이 chat)
5. ⏳ Phase 7 KICKOFF SPEC 작성 (next)
6. (선택) Notion sync — 야기 manual at end of project

### Quote (v1.4 추가)

> "챌린지는 고객사가 우리에게 요청할 수도 있는거라서. 예를들어 특정 브랜드나
> 여러 브랜드가 요청하면 이미지 1처럼 우리가 챌린지 만들어주는거지."
> — Challenge 의 Route B (Brand request) 의 origin (chat 2026-05-05). v1.4 §Q.

> "https://aikive.com/ 이것처럼 ai artist들이 가입하고 로그인해서 업로드할
> 수 있는 그런 구조로 가고싶긴한데.. 좀 많이 복잡해지긴하네... 어떻게 하는게
> 좋을까"
> — Creator workspace kind 의 origin (chat 2026-05-05). v1.4 §R.
> 답: workspace.kind 'creator' 추가 + Phase 7/8 단계별 분해. 99designs /
> Talenthouse 검증 패턴.

---

*v1.4 amendment 끝. Phase 7 entry barrier = (1) Hotfix-3 ship, (2) 본
v1.4 amendment 작성 (이 commit), (3) Phase 7 KICKOFF SPEC 작성. 이후
Builder dispatch.*
