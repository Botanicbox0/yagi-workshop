# Phase 6 — Artist Foundation + Talent-Initiated Entry

Status: LOCKED v2, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-05)
Scope tier: PHASE (~2 weeks sprint, 정직 estimate)
Baseline: branch `main` (Phase 5 ff-merge 완료, commit `fc7c754`)
Source-of-truth: PRODUCT-MASTER §K (Artist scope) + §L (schema) + §M
(워딩 룰) + §O (Wave 분해)

## Vision (locked, chat 2026-05-05)

> Phase 6 = §O Wave A + B 만. 사업 가치 = "Artist 가 [새 프로젝트 시작]
> 으로 실제 가치 활동 가능 (Talent-Initiated 흐름 완전 작동)."
>
> Phase 7 = §O Wave C + D (Inbound Track 완성).
> Phase 8 = §O Wave E + F + G (수신 설정 + 시안 + 사용료 + ff-merge gate).

근거: §O Wave C 만 ship 시 admin queue 매칭 결정만 되고 Artist 가 받는
surface (D) 가 없어 Inbound 반쪽 dead-end. Wave C+D 묶음 = Phase 7 로
가야 Inbound 완전 작동.

## Phase 6 deliverables (사업 가치 단위)

1. **Artist 영입 가능** — yagi_admin 이 admin tool 에서 새 Artist 추가
   (auth user 생성 + workspace 생성 + artist_profile row 생성)
2. **Artist 가 자기 workspace 진입 가능** — workspace switcher 로 Brand /
   Artist workspace 전환
3. **Artist onboarding 1-step** — magic-link 클릭 후 Instagram handle 입력,
   완료 시 본인 workspace 진입 (Phase 6 lock decision)
4. **Artist 가 [새 프로젝트 시작] 가능** — Briefing Canvas Artist 시점
   재사용 (Brand 와 동일 surface, intake_mode 만 다름)
5. **외부 광고주 인지** — Step 3 toggle 로 `has_external_brand_party`
   기록 → admin 검토 시 즉시 파악

## Decisions locked at KICKOFF entry (§N from PRODUCT-MASTER v1.3)

| # | 항목 | Phase 6 결정 | Status |
|---|---|---|---|
| 1 | 첫 Roster Artist 1-2명 사용료 분배 비율 | ❌ Phase 8 deferred | — |
| 2 | 시안 확인 단계 (Concept/Storyboard/Final?) | ❌ Phase 8 deferred | — |
| 3 | Match score 알고리즘 | ❌ Phase 7 deferred | — |
| 4 | 분쟁 처리 escalation flow | ❌ Phase 8 deferred | — |
| 5 | 첫 활성 entry | ✅ **LOCKED** [새 프로젝트 시작] 만 (야기 confirm 2026-05-05) | locked |
| 6 | Workspace switcher UI 패턴 | ✅ **LOCKED** Linear 식 — 좌측 sidebar 하단 dropdown (야기 confirm 2026-05-05) | locked |
| 7 | Artist invite flow | ✅ **LOCKED** Magic-link + 1-step onboarding (email read-only + Instagram handle 입력). 야기 의도 정확화: invite 이메일 클릭 → password 설정 → onboarding 1 page → workspace 진입 (야기 confirm 2026-05-05) | locked |
| 8 | Type 3 라이선스 처리 | ❌ Phase 8 deferred. 단 Wave B 의 Step 3 toggle 만 ship (인지 데이터 capture). 정산은 Phase 8 | partial |

## Scope: 2 waves (Wave A + Wave B)

### Wave A — Foundation (5d)

**분해 (야기 lock 2026-05-05)**:
- A.1 = base solo (migration, sequential)
- A.2 + A.3 = parallel x 2 (workspace switcher + Artist invite)

#### A.1 — Schema migration: `artist_profile` (1d, lead solo base)

`supabase/migrations/<timestamp>_phase_6_artist_profile.sql`:

```sql
CREATE TABLE artist_profile (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Twin asset metadata (Phase 6 = 단순 record. R2 upload pipeline 은 Phase 7+)
  twin_status text NOT NULL DEFAULT 'not_started'
    CHECK (twin_status IN ('not_started', 'training', 'active', 'paused')),
  twin_r2_prefix text,
  -- 권한 dial (Phase 6 = column 만 도입, UI 는 Phase 8 Wave E)
  auto_decline_categories text[] NOT NULL DEFAULT '{}',
  visibility_mode text NOT NULL DEFAULT 'paused'
    CHECK (visibility_mode IN ('open', 'paused')),
  bypass_brand_ids uuid[] NOT NULL DEFAULT '{}',
  -- Display
  display_name text,
  short_bio text,
  -- Instagram handle (야기 lock 2026-05-05) — onboarding 시 Artist 입력,
  -- 추후 update 가능. nullable + onboarding gate 로 application 레이어
  -- enforcement (admin INSERT 시 NULL OK, onboarding 완료 전까지
  -- /onboarding/artist 로 redirect).
  instagram_handle text,
  -- meta
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;

-- SELECT: Artist 본인 (workspace_member) + yagi_admin
CREATE POLICY artist_profile_select ON artist_profile
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- INSERT: yagi_admin only (Artist 본인 self-invite 차단)
CREATE POLICY artist_profile_insert ON artist_profile
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- UPDATE: Artist 본인 (display_name / short_bio / instagram_handle 만)
-- + yagi_admin (전체). Column-level grant 로 Artist 가 twin_status /
-- visibility_mode / bypass_* 직접 update 못 함 (Phase 4.x sub_03f_2 패턴, L-048).
REVOKE UPDATE ON artist_profile FROM authenticated;
GRANT UPDATE (display_name, short_bio, instagram_handle, updated_at) ON artist_profile TO authenticated;

CREATE POLICY artist_profile_update ON artist_profile
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- DELETE: yagi_admin only
CREATE POLICY artist_profile_delete ON artist_profile
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));
```

⚠️ K-05 mandatory:
- L-049 multi-role audit (client / ws_admin / yagi_admin / different-user)
- Column grant lockdown verify (twin_status / visibility_mode / bypass_*
  가 Artist 본인 직접 update 불가)
- L-019 pre-flight prod data 확인 (workspaces 중 artist kind 0건)

**EXIT**: migration apply + `database.types.ts` regen (L-022) + RLS
multi-role smoke (4 perspective) PASS. Sequential — A.2/A.3 가 이 단계
완료 후 spawn.

#### A.2 — workspaces.kind 'artist' 추가 + workspace switcher UI (2d, parallel)

기존 `workspaces.kind` 가 ('brand', 'agency', ...) — 'artist' 추가.

**DB**:
```sql
ALTER TABLE workspaces DROP CONSTRAINT IF EXISTS workspaces_kind_check;
ALTER TABLE workspaces ADD CONSTRAINT workspaces_kind_check
  CHECK (kind IN ('brand', 'agency', 'artist'));
COMMENT ON COLUMN workspaces.kind IS 'brand | agency | artist (Phase 6+)';
```

**UI** — Linear 식 좌측 sidebar 하단 dropdown:

```
┌─────────────────────┐
│  [logo]             │
│                     │
│  대시보드            │
│  프로젝트            │
│  (...)              │
│                     │
│ ─────────────────── │
│  [▾ 브랜드명]        │  ← workspace switcher (sidebar bottom)
└─────────────────────┘
```

Dropdown content:
```
┌─────────────────────────┐
│ ☑ 브랜드명 (현재)        │
│ ─────────────────────── │
│  브랜드 (Brand)          │
│   - Brand workspace 1   │
│   - Brand workspace 2   │
│  Artist (아티스트)        │
│   - Artist workspace 1  │
│ ─────────────────────── │
│  + 새 워크스페이스 만들기  │  (yagi_admin only)
└─────────────────────────┘
```

⚠️ 워딩 cross-check (yagi-wording-rules skill):
- "Artist" / "아티스트" = 제품 워딩 OK
- Internal 워딩 ("Roster", "Talent-Initiated") 절대 노출 X

**EXIT**:
- workspaces.kind 'artist' 추가 (migration + types regen)
- workspace switcher UI 컴포넌트 (Linear 식 좌측 sidebar 하단)
- 야기 admin 이 새 Artist workspace 만들면 dropdown 에 즉시 노출
- Artist 본인 sign in 시 본인 Artist workspace 자동 default 진입
- tsc + lint + build clean

#### A.3 — Artist invite flow + 1-step onboarding (2d, parallel)

야기 lock decision (Q7 v2): **Magic-link + 1-step onboarding** (email
read-only 표시 + Instagram handle 입력).

**Flow**:
1. yagi_admin 이 admin tool (`/admin/artists`) 에서 [+ 새 Artist 영입]
2. 폼 입력: email + display_name + (optional) short_bio
3. Server action `inviteArtistAction`:
   - Supabase auth admin API 로 magic-link invite 생성
   - workspaces row 생성 (kind='artist', name=display_name)
   - workspace_members row 생성 (user_id = invited user, role = 'owner')
   - artist_profile row 생성 (twin_status='not_started', display_name,
     short_bio, **instagram_handle = NULL**)
   - email 자동 발송 (Supabase auth invite 기본 동작)
4. Artist 가 email 의 magic-link 클릭 → password 설정 완료
5. **자동 redirect → `/[locale]/onboarding/artist`** — 1-step onboarding page:
   ```
   만나서 반가워요, [display_name]님

   계정 설정 마지막 단계입니다.

   이메일               [read-only 표시]
   Instagram 계정      [@your_handle]

   [시작하기 →]
   ```
6. 제출 → `completeArtistOnboardingAction`:
   - artist_profile.instagram_handle UPDATE
   - redirect to `/[locale]/app/projects` (본인 Artist workspace)
7. **Onboarding 완료 전까지 workspace 진입 차단** — layout 또는 middleware
   에서 `workspace.kind = 'artist'` AND `artist_profile.instagram_handle IS
   NULL` 이면 `/onboarding/artist` 로 redirect
8. Onboarding 완료 후 = artist 가 바로 본인 workspace 진입, 추가 wizard
   없음 (Twin asset / 권한 dial set 은 Phase 8 Wave E + 야기 admin)

⚠️ 보안:
- inviteArtistAction = yagi_admin only (server action 안에서 verify)
- service-role client 사용 (Supabase auth admin API + workspace_members
  insert 가 RLS bypass 필요)
- completeArtistOnboardingAction = workspace_member 본인만 (auth.uid()
  = workspace_member.user_id) + artist_profile.instagram_handle IS NULL
  일 때만 작동
- L-048 + L-049 (RLS multi-role audit) 적용

**Onboarding gate 구현** (추천):
```typescript
// src/lib/auth/artist-onboarding-gate.ts
// /[locale]/app/* layout 에서 적용. 현재 active workspace 의 kind 가
// 'artist' 이고 artist_profile.instagram_handle IS NULL 이면
// /onboarding/artist 로 redirect.
```

**Admin tool surface** (`/admin/artists`):
```
[+ 새 Artist 영입]

Artist 명단 (소속 아티스트)
┌─────────────────────────────────────────────────────────────┐
│ 이름     | email          | Instagram | 가입일    | 상태       │
├─────────────────────────────────────────────────────────────┤
│ Artist A | a@example.com  | @artist_a | 2026-...  | ✅ 활성    │
│ Artist B | b@example.com  | (대기)    | (대기)    | ⏳ onboarding │
│ Artist C | c@example.com  | (대기)    | (대기)    | ⏳ invite 완료 │
└─────────────────────────────────────────────────────────────┘
```

상태 분류:
- ⏳ invite 완료 = magic-link 발송, password 설정 안 함
- ⏳ onboarding = password 설정 완료, instagram_handle IS NULL
- ✅ 활성 = onboarding 완료, instagram_handle IS NOT NULL

⚠️ "Roster" 한국어 UI = "소속 아티스트" / "아티스트 명단" (yagi-wording-rules skill).

**EXIT**:
- inviteArtistAction server action + multi-role audit PASS
- completeArtistOnboardingAction + onboarding gate (layout/middleware) 구현
- /admin/artists 페이지 + invite 폼 + 명단 list (Instagram + 상태 컬럼 포함)
- /[locale]/onboarding/artist 1-step page + Instagram handle 입력 form
- Magic-link invite email 정상 발송 (Supabase auth admin API)
- Artist sign in 시 onboarding gate 작동 (instagram_handle IS NULL 면 redirect)
- Onboarding 완료 후 본인 workspace 진입
- yagi_admin only access for /admin/artists (다른 role notFound)
- tsc + lint + build clean

### Wave B — [새 프로젝트 시작] entry (5d)

**분해 (야기 lock 2026-05-05)**: B.1 + B.2 = parallel x 2.

#### B.1 — Briefing Canvas Artist 시점 재사용 (regression smoke, parallel)

기존 `/projects/new` Briefing Canvas (Brand 시점) 를 *workspace.kind 에
관계없이* 재사용. 단:

- Artist workspace 진입 시 default kind/intake_mode = `direct_commission`
  / `brief` 동일 (DB 레벨 변경 0)
- Step 1/2/3 의 모든 i18n key value = 워딩 룰 cross-check 통과
- *변경 사항 0* — 단 동작 verify (Artist sign in → /projects/new → Step
  1~3 → 의뢰 정상 생성)

**EXIT**:
- Artist workspace 에서 의뢰 생성 시 `projects.workspace_id` =
  Artist workspace, `created_by` = Artist user, `intake_mode='brief'`,
  `kind='direct'` 정상 기록
- Brand workspace 동작 영향 0 (regression smoke)
- tsc + lint + build clean

#### B.2 — `has_external_brand_party` toggle (Step 3, parallel)

**DB**:
```sql
ALTER TABLE projects
  ADD COLUMN has_external_brand_party boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN projects.has_external_brand_party IS
  'Artist 의 외부 Brand 와 따온 광고 작업 인지 (Type 3 internal flag).
   UI 노출 = "외부 광고주가 있는 작업입니다" (워딩 룰).';
```

⚠️ RLS — `has_external_brand_party` 도 status='draft' 만 update (sub_5
패턴 재사용). column-level grant 추가:

```sql
GRANT UPDATE (has_external_brand_party) ON projects TO authenticated;
-- (기존 column grants 와 합쳐서 업데이트)
```

**UI** — Briefing Canvas Step 3, 위치 = **Builder 자율** (야기 lock Q5,
PRODUCT-MASTER §K verbatim "Step 3 toggle" 만 명시):

```
┌──────────────────────────────────────────┐
│ ☐ 외부 광고주가 있는 작업입니다             │
│   (계약서 / brief 자료가 있다면 첨부 부탁   │
│    드려요)                                │
└──────────────────────────────────────────┘
```

Toggle on → `has_external_brand_party = true`. Step 2 의 reference URL /
attachment 첨부 안내 helper 추가 ("외부 계약서가 있다면 여기 첨부하셔도
좋아요").

⚠️ Toggle 은 *모든 workspace.kind* 에 노출. Artist 가 가장 자주 사용하
지만 Brand 도 사용 가능 (외주 받은 광고 의뢰 시).

⚠️ i18n key (워딩 룰):
```json
"briefing.step3.external_brand_toggle": "외부 광고주가 있는 작업입니다",
"briefing.step3.external_brand_helper": "(계약서 / brief 자료가 있다면 첨부 부탁드려요)"
```

**EXIT**:
- migration apply + types regen
- toggle UI 정상 (체크 → DB 기록 → submit 후 detail page 의 브리프 tab
  에서 read-only 표시)
- Brand workspace + Artist workspace 둘 다 toggle 노출
- 의뢰 detail 의 브리프 tab 에 "외부 광고주 여부" field 추가 (read-only)
- yagi_admin 이 admin queue (Phase 7) 에서 즉시 파악 가능 = 데이터
  capture 까지만 본 wave scope (admin queue 자체는 Phase 7)
- tsc + lint + build clean

## Verification (Builder responsibility — 20 steps total)

### Pre-apply
1. `pnpm exec tsc --noEmit` clean
2. `pnpm lint` clean
3. `pnpm build` clean

### Wave A — Foundation
4. artist_profile migration apply 성공 + RLS multi-role smoke PASS (4 perspective)
5. workspaces.kind 'artist' CHECK constraint OK
6. Workspace switcher UI 정상 (Brand / Artist / + 새 워크스페이스 만들기 dropdown)
7. yagi_admin 이 /admin/artists 에서 새 Artist invite → magic-link email 정상 발송
8. Artist magic-link 클릭 → password 설정 → **/onboarding/artist 로 자동 redirect**
9. Onboarding 1-step page — email read-only + Instagram handle 입력 폼 정상
10. Instagram handle 제출 → artist_profile.instagram_handle UPDATE → 본인 workspace 진입
11. **Onboarding 완료 전** Artist 가 /app/projects 직접 접근 시 /onboarding/artist 로 redirect (gate 작동)
12. Artist 가 다른 Artist 의 artist_profile read X (RLS USING 차단)
13. Artist 가 본인 artist_profile.twin_status 직접 update X (column grant lockdown)
14. yagi_admin only access for /admin/artists (다른 role notFound)
15. /admin/artists 명단에 Instagram + 상태 (⏳ invite / ⏳ onboarding / ✅ 활성) 정확 표시

### Wave B — [새 프로젝트 시작]
16. Artist workspace 에서 의뢰 생성 정상 (workspace_id, created_by, intake_mode, kind 정확)
17. Brand workspace 의뢰 생성 regression 0 (smoke)
18. Step 3 외부 광고주 toggle UI 노출 (Brand + Artist 둘 다)
19. Toggle on → has_external_brand_party = true 기록. 의뢰 detail 브리프 tab 에서 read-only 표시. status='draft' 이외에서 update 차단

### Static / Wording
20. yagi-wording-rules skill cross-check — internal 워딩 (Routing / RFP / Roster / Type 등) 의 i18n key value 또는 component label 노출 0건

## K-05 Codex review

- **Tier**: 1 HIGH (Wave A) + 2 MED (Wave B).
- **Routing**: MANDATORY for Wave A (RLS 신규 + auth admin API 사용).
- **Justification**:
  - artist_profile RLS = 새 보안 surface (L-049 4-perspective walk 강제)
  - inviteArtistAction = service-role + auth admin API. 잘못된 yagi_admin
    guard 시 anyone-invites-anyone 위험. HIGH-A risk
  - completeArtistOnboardingAction = workspace_member 본인 + instagram_handle
    IS NULL guard 강제
  - has_external_brand_party column grant = sub_5 패턴 재사용. MED

## K-06 Design Review

- **MANDATORY for Wave A** (workspace switcher UI + admin tool UI + onboarding page)
- **MANDATORY for Wave B** (toggle UI + 브리프 tab read-only 표시)
- Reviewer: fresh Opus subagent (codex-review-protocol.md K-06 protocol)
- Focus: 4-dimension review + **워딩 룰 cross-check** (yagi-wording-rules
  skill 첨부)

## Out-of-scope (Phase 7+ deferred)

- **Wave C+D (Phase 7)**: Admin Queue Layer 2 (Brand RFP 검토 → Artist
  매칭) + Artist [브랜드 협업 제안] 큐 (수락/거절). Inbound Track 완성
- **Wave E (Phase 8)**: 권한 dial UI ("수신 설정") — visibility_mode toggle,
  auto_decline_categories 체크박스, bypass_brand_ids 관리
- **Wave F (Phase 8)**: 시안 확인 workflow (project_approvals 테이블) +
  사용료 정산 (project_licenses 테이블)
- **Wave G (Phase 8)**: ff-merge gate

## Migration apply policy

3 migrations. Apply 순서:
1. Wave A.1: artist_profile (RLS 포함)
2. Wave A.2: workspaces.kind 'artist' 추가
3. Wave B.2: projects.has_external_brand_party

각 apply 후 `database.types.ts` regen (L-022). Single commit per migration.

## Sign-off

야기 SPEC v2 LOCKED (chat 2026-05-05) → Builder dispatch (Wave A.1 lead
solo base → A.2 + A.3 parallel x 2 → Wave B.1 + B.2 parallel x 2) →
K-05 Wave A end + K-06 Wave A end (parallel) → K-05 Wave B end + K-06
Wave B end (parallel) → 야기 browser smoke (steps 4-20) → ff-merge GO.
