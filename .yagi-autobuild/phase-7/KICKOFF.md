# Phase 7 — Distributed Campaign + Light Creator workspace

Status: **LOCKED v4 (IA refactor 흡수, replace v3)**, ready for KICKOFF dispatch.
Author: 야기 + Web Claude (chat 2026-05-05)
Scope tier: PHASE (~6주 sprint, Phase 5 lessons 1.5x 보정)
Baseline: branch `g-b-10-phase-7` (Wave A + HF4 + Wave B SHIPPED, 9 commits ahead of main)
Source-of-truth: PRODUCT-MASTER §W (Distributed Campaign vision) + §X (schema) +
§V v1.6 (Q1-Q8 lock) + §Y (§K Artist three-entry update) + §Z v1.7 (North Star) +
§K v1.7 (Artist three-entry priority) + §M (워딩 룰)

## Vision (locked v1.6 + v1.7, chat 2026-05-05)

Phase 7 = Distributed Campaign MVP. 사업 가치 = "Sponsor (Artist 또는
admin) 의 캠페인 hosting + curated creator pool 의 작품 제작 + admin
검수 + creator 가 본인 채널 유포 + metric tracking. K-pop AI 콘텐츠
마케팅의 B2B SaaS 모델 검증."

North Star = "AI Visuals for Musicians" (PRODUCT-MASTER v1.7 §Z).

## Phase 7 deliverables (사업 가치 단위)

1. **야기 자체 캠페인 hosting** (Wave A SHIPPED) — admin tool (Route A)
2. **Sponsor request entry + admin approval** (Wave B SHIPPED) — Brand + Artist workspace
3. **🆕 IA refactor** (Wave C 안 흡수) — Musicians-first sidebar, "워크스페이스" → "작업"/"소통"/"정산"/"시스템"/"운영" 정렬, [+ 새 프로젝트 시작] 최상단, 챌린지/캠페인 sub-pages 제거 (admin dashboard 안에서 진입)
4. **Curated creator pool 응모** (Wave C) — 자동 magic-link, light Creator workspace
5. **Admin 검수 + Creator 유포 + 본인 dashboard** (Wave C / D) — campaign_distributions
6. **Sponsor distribution dashboard + email** (Wave D) — aggregate metric

## Decisions locked (v1.6 §V + v1.7 + IA refactor)

| # | 항목 | 답 |
|---|---|---|
| Q1 | 첫 캠페인 형태 | Route A primary + Route B (가수 영입 plan via network 1-2주) |
| Q2 | 워딩 | "캠페인" |
| Q3 | 응모자 가입 | 자동 magic-link (Talenthouse 패턴) |
| Q4 | 검수 round | 단일 |
| Q5 | File 처리 | Hybrid (R2 + 외부 URL) |
| Q6 | Sponsor request 폼 | title + brief + reference_assets + 일정 + 후원 + 담당자 phone 필수 |
| Q7 | Compensation | exposure_only default. fixed_fee column 도입 (정산 = Phase 11) |
| Q8 | Roster funnel UI | Phase 8 deferred |
| **IA-1** | **챌린지 sidebar entry** | **완전 제거 (Phase 9 ship 시 다시 추가)** |
| **IA-2** | **캠페인 sub-pages** | **제거. "+ 캠페인 요청" entry 만 (작업 group), admin dashboard sub-tool 만 진입** |
| **IA-3** | **운영 group 신설** | **yagi_admin only visible. "YAGI 관리" 1개 entry, sub-tools = admin dashboard 안에서 진입** |
| **IA-4** | **그룹 label** | **"워크스페이스" → "작업"/"소통"/"정산"/"시스템"/"운영"** |
| **IA-5** | **[+ 새 프로젝트 시작]** | **사이드바 최상단 (북극성 1순위, workspace.kind='brand'/'artist' 만)** |

## Scope: 4 waves + 1 ff-merge gate

- **Wave A**: Schema + admin + public landing — **SHIPPED** (commit 5b932d4 + Hotfix-4)
- **Wave B**: Sponsor request + admin approval — **SHIPPED** (commits c820056 + e3c4276)
- **Wave C** (NEXT): IA refactor + 응모 flow + Light Creator workspace
- **Wave D**: Admin 검수 + Distribution tracking
- **Wave E**: ff-merge gate

### Wave C — IA refactor + 응모 flow + Light Creator workspace (5.5d)

#### C.0 — IA refactor (0.5d, lead solo before C.1) ⭐ NEW

**File**: `src/components/app/sidebar-nav.tsx` + `messages/ko.json` + `messages/en.json`

**Target IA structure**:

```
─ {workspace_name} ▾ [switcher]
─ + 새 프로젝트 시작 [최상단, brand/artist 만 visible]

[작업]
  ├ 대시보드
  ├ 프로젝트
  └ + 캠페인 요청 [brand/artist 만]

[소통]
  ├ 미팅
  └ 팀 (yagi-internal 만)

[정산]
  └ 인보이스 [admin role 만]

[시스템] (모든 user)
  └ 설정

[운영] (yagi_admin 만 visible)
  └ YAGI 관리 (admin dashboard 진입, sub-tools = 7-card grid 안 navigate)
```

**Workspace.kind 별 visible matrix**:

| Entry | brand | artist | creator | yagi_admin |
|---|---|---|---|---|
| + 새 프로젝트 시작 | ✅ | ✅ | ❌ | ✅ |
| 대시보드 | ✅ | ✅ | ❌ | ✅ |
| 프로젝트 | ✅ | ✅ | ❌ | ✅ |
| + 캠페인 요청 | ✅ | ✅ | ❌ | ✅ |
| 추천 Artist (disabled, Phase 9) | (기존 disabled placeholder 유지) | ❌ | ❌ | (유지) |
| 내 응모작 (Wave C C.3 추가) | ❌ | ❌ | ✅ | ❌ |
| 미팅 | ✅ | ✅ | ❌ | ✅ |
| 팀 | yagi-internal | yagi-internal | ❌ | ✅ |
| 인보이스 | admin role | admin role | ❌ | ✅ |
| 설정 | ✅ | ✅ | ✅ | ✅ |
| YAGI 관리 (운영 그룹) | ❌ | ❌ | ❌ | ✅ |

**5 sub-items**:

**C.0.1** — sidebar-nav.tsx 의 "캠페인" parent + 3 children 제거 → "+ 캠페인 요청" entry 만 (현 위치 = 최상단 외에 "work" group 안). workspace.kind='brand'/'artist' 만 visible.

**C.0.2** — "챌린지" parent + 3 children **완전 제거** (Phase 9 ship 시 다시 추가). yagi_admin 도 sidebar 에서 hidden. (Hotfix-4 의 admin dashboard 7-card grid 의 challenges 카드는 유지 — admin 이 진입은 가능하되 sidebar 에서는 hidden.)

**C.0.3** — "의뢰 관리" (admin_commissions) / "휴지통" (admin_trash) / "지원 채팅" (admin_support) sidebar entry **완전 제거**. admin dashboard 의 sub-tool grid (Hotfix-4 ship) 안에서만 진입.

**C.0.4** — 그룹 label 정리:
- 기존 GROUPS = `[work, communication, billing, system]`
- 새 GROUPS = `[work, communication, billing, system, operations]`
- i18n key 변경:
  - `nav.groups.work` = "작업" (was "워크스페이스" — Korean copy 정정)
  - `nav.groups.communication` = "소통"
  - `nav.groups.billing` = "정산"
  - `nav.groups.system` = "시스템"
  - `nav.groups.operations` = "운영" (NEW)
- "운영" group = yagi_admin 만 visible. items = `[admin]` (YAGI 관리 1개)

**C.0.5** — [+ 새 프로젝트 시작] = 사이드바 최상단 entry (workspace switcher 직후). 별 group 밖, standalone primary CTA. workspace.kind='brand'/'artist' 만 visible. icon = `Sparkles` 또는 `Plus` (yagi-design-system token 검토).

⚠️ **추가 변경**:
- 현재 sidebar 의 [+ 캠페인 요청] (Wave B 의 entry) = 최상단 위치. C.0.5 진행 시 [+ 새 프로젝트 시작] 가 최상단 자리 차지. [+ 캠페인 요청] 은 "작업" group 안으로 이동 (대시보드 / 프로젝트 / + 캠페인 요청 순서, workspace.kind='brand'/'artist' 만 visible).
- "추천 Artist" (disabled placeholder, Phase 9 - Inbound Track) 는 유지. "작업" group 안. Phase 10 ship 시 활성화.

**Server-side workspace.kind check**:
- sidebar-nav.tsx 가 client component 라 workspace.kind 를 props 또는 context 통해 받아야 함
- 현재 `useWorkspace()` context 또는 비슷한 hook 가 있는지 확인 필요
- 없으면 `WorkspaceLayoutProvider` 확인 → workspace.kind 추가 expose

**EXIT**:
- 위 IA structure 정확히 노출
- workspace.kind 별 visible matrix 정확
- yagi_admin sidebar 에 "운영" group + "YAGI 관리" 1 entry
- "챌린지" / "캠페인" sub-pages / "의뢰 관리" / "휴지통" / "지원 채팅" 모두 sidebar 에서 hidden
- admin dashboard (/app/admin) 의 7-card grid 는 그대로 (모든 sub-tool 진입점)
- Hotfix-4 의 [+ 캠페인 요청] 위치 변경 (최상단 → "작업" group 안)
- [+ 새 프로젝트 시작] 최상단 추가 (Phase 6 [새 프로젝트 시작] route 사용)
- i18n keys 모두 KO + EN
- tsc + lint clean
- **K-06 MANDATORY** (sidebar = main IA, 변경 영향 큼)

#### C.1 — workspaces.kind 'creator' + 응모 form (2d, lead solo)

(이전 v3 와 동일)

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
    - posted_at default now
    - → campaign_distributions INSERT + status='distributed' transition
  - **status='distributed' 시 → 본인 distribution list + metric log option**
    - view / like / comment 수 manual 입력

**Creator workspace sidebar** = "내 응모작" entry 만 (C.0 IA matrix 의 creator 컬럼 참조). 다른 entries (대시보드 / 프로젝트 / + 새 프로젝트 시작 등) 모두 hidden.

→ C.0 의 sidebar-nav.tsx 변경 시 workspace.kind='creator' 의 "내 응모작" entry 추가 위치 결정 필요. "작업" group 안에 1개 entry 만 노출 권장.

**EXIT**:
- multi-distribution per submission OK
- 다른 user 의 응모작 read X (RLS verify)
- creator workspace sidebar = 매우 simple ("내 응모작" + 설정만)

### Wave D — Admin 검수 + Distribution tracking (4d)

(이전 v3 와 동일)

#### D.1 — 검수 admin tool (1.5d, lead solo)
#### D.2 — Distribution tracking admin (1.5d, parallel)
#### D.3 — Sponsor distribution dashboard + 결과 알림 email (1d, parallel)

### Wave E — ff-merge gate (1d)

야기 browser smoke (40 step) + ff-merge to main.

## Verification (Builder responsibility — 40 step)

### Pre-apply (3) — 동일 v3
1. tsc clean
2. lint clean
3. build clean

### Wave A — Schema + admin + public (10) — SHIPPED
4-13. (이전 v3 동일, Wave A + HF4 ship 완료)

### Wave B — Sponsor request (6) — SHIPPED
14-19. (이전 v3 동일, Wave B ship 완료)

### Wave C — IA refactor + 응모 + Light Creator (13)

**C.0 IA refactor verify (5)**:
20. 모든 user 의 sidebar 최상단 = workspace switcher 다음 = "[+ 새 프로젝트 시작]" entry (workspace.kind='brand'/'artist' 만 visible). creator 또는 sponsor 가 'admin' kind 시점 (Hotfix-4 의 dashboard 진입 가능 여부) 검증.
21. yagi_admin sidebar 에 "운영" group + "YAGI 관리" 1 entry. "챌린지" parent / "캠페인" parent / "의뢰 관리" / "휴지통" / "지원 채팅" entry 모두 sidebar 에서 hidden.
22. workspace.kind='brand' 또는 'artist' user 의 "작업" group 안 = 대시보드 / 프로젝트 / + 캠페인 요청 / 추천 Artist (disabled). 4-entry.
23. workspace.kind='creator' user 의 sidebar = "내 응모작" 1 entry + 설정 (시스템 group). 즉 매우 simple.
24. group label = "작업" / "소통" / "정산" / "시스템" / "운영" 정확. 기존 "워크스페이스" 잔존 0건.

**C.1 응모 + Creator workspace (3)**:
25. workspaces.kind='creator' constraint update verify
26. /campaigns/[slug]/submit anon + authenticated 둘 다 가능
27. 자동 magic-link + creator workspace 생성 (email duplicate 시 workspace 중복 X)

**C.2 R2 (2)**:
28. R2 upload 정상 (campaign.allow_r2_upload=true 시)
29. 외부 URL 응모 정상 (campaign.allow_external_url=true 시)

**C.3 dashboard (3)**:
30. /app/my-submissions creator dashboard — 본인 응모작 + status
31. status='approved_for_distribution' 시 [+ 유포 채널 추가] CTA + campaign_distributions INSERT
32. 다른 user 응모작 read X (RLS verify)

### Wave D — 검수 + Distribution (7)
33-39. (이전 v3 동일)

### Static / Wording (1)
40. yagi-wording-rules cross-check — internal 워딩 ("Sponsor"/"Submission"/"Track"/"Roster"/"Distribution" 영문 노출 0)

## K-05 Codex review (LOOP_MAX per L-052)

| Wave | Tier | LOOP_MAX |
|---|---|---|
| A.1 schema + RLS — SHIPPED | HIGH | 3 |
| A.2/A.3/A.4 — SHIPPED | MED | 2 |
| B.1/B.2 — SHIPPED | HIGH | 3 |
| **C.0 IA refactor** | **MED (UI + workspace.kind 권한)** | **2** |
| C.1 응모 + Creator workspace + auth admin API | HIGH | 3 |
| C.2/C.3 R2 + dashboard | MED | 2 |
| D.1/D.2/D.3 검수 + distribution + email | MED | 2 |

C.0 K-05 focus = workspace.kind 별 visible 의 server-side 일관성 (sidebar 가 client 라 어디까지 server-side check 인지 — server-rendered vs client-rendered 의 권한 leak 가능성).

## K-06 Design Review

- MANDATORY all waves
- **C.0 K-06 = critical** (sidebar = main IA, 변경 영향 모든 page)
- Reviewer: fresh Opus subagent
- Focus: 4-dimension + yagi-wording-rules cross-check + workspace.kind 별 sidebar empty/full state + 그룹 label 워딩
- LOOP_MAX=2

## Out-of-scope (Phase 8+ deferred, IA refactor 후 update)

- Phase 8 = Creator Hub (portfolio + browse + Roster funnel + distribution metric API auto-fetch)
- Phase 9 (optional) = Challenge MVP — sidebar 에 "챌린지" entry 다시 추가 (제거된 entry 복원), KAICF-style contest
- Phase 10 = Inbound Track ("추천 Artist" disabled placeholder 활성화)
- Phase 11 = Compensation 정산 + 시안 confirm + 권한 dial

## Migration apply policy

- Wave A.1 — SHIPPED
- Wave C.1: workspaces.kind='creator' 추가 (single migration)
- 각 apply 후 types regen

## Sign-off

야기 SPEC v4 LOCKED (chat 2026-05-05) → Builder dispatch (Wave C entry):
**C.0 lead solo IA refactor (K-06 mandatory)** → C.1 lead solo (K-05 HIGH) → C.2/C.3 parallel x 2 (MED) → C K-05+K-06 →
Wave D dispatch (D.1 lead → D.2/D.3 parallel x 2 → D K-05+K-06) → 야기 browser smoke (40 step) → ff-merge GO.

Total estimate Wave C+D = 9.5d (C 5.5 + D 4) + Wave E 1d ≈ **2주 정직 estimate**.

Phase 7 total (Wave A 6 + B 5 + C 5.5 + D 4 + E 1) = 21.5d ≈ **6주 정직 estimate**.
