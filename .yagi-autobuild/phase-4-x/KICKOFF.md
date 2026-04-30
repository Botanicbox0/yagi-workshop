# Phase 4.x KICKOFF — Brand persona clarity + workspace.kind foundation + post-submit detail page redesign

**Branch (NEW):** `g-b-9-phase-4`
**Base:** `main` (latest stable, NOT g-b-8-canvas)
**Carry-over:** 5 cherry-picked commits from `g-b-8-canvas` (hotfix-3 working parts)
**Target:** 5 working days
**SOFT_CAP:** 6 days
**HARD_CAP:** 8 days
**K-05:** MANDATORY — Reviewer Fallback (Codex unavailable; Opus 4.7 self-review + manual double-check)
**Mode:** B-O-E (Builder-Orchestrator-Executor)
**Single ff-merge target:** Phase 3.1 + hotfix-3 + Phase 4.x → main (combined SHIPPED entry)

---

## Origin

Phase 3.1 + hotfix-3 PAUSED on `g-b-8-canvas` @ `0322fba`, L-027 STOP gate held (no ff-merge). Yagi flagged the broken/incomplete parts of hotfix-3 as Phase 4.x scope:
- post-submit `/app/projects/[id]` detail page (1:1 카드 비율, status timeline 미구현)
- F1-F6 진단 wiring (submit broken — precise fix needed)
- client redirect `/app/commission` → `/app/projects` (Phase 2.x 잔재)
- workspace switcher (plain text → 박스+dropdown+multi-workspace)

PRODUCT-MASTER v1.0 (2026-04-30) §5 defines Phase 4.x as:
> "Workspace.kind 도입 + Brand 페르소나 명확화. 현재 wizard 흐름을 새 model 에 맞게 정리. Brand 가 명확한 첫 user persona 가 됨."

Yagi verbatim (this chat session, 2026-05-01):
> "g-b-8-canvas branch 는 archive (PAUSED 상태로 살려둠). 새 base = main 의 latest stable."
> "라이선스 model = B (schema + admin 내부 빈 surface, Phase 6 에 채움)"
> "Workspace switcher = C (박스 + dropdown + 다중 workspace 지원까지)"
> "K-05 reviewer fallback = Claude Opus 4.7 self-review (adversarial framing). Critical change (RLS, auth, payment) 는 야기 + 너 manual double-check"

→ 4 lanes of work mapped:
1. **DB foundation** — workspaces.kind + projects.twin_intent + projects.kind enum + project_licenses
2. **Brand persona surfaces** — Brand sidebar/dashboard + /app/commission redirect + workspace switcher (full multi-workspace)
3. **post-submit detail page redesign** — 1:1 hero card + status timeline (5단계) + 4 tabs
4. **wizard cleanups** — Twin intent 필드 + tooltip + submit broken F1-F6 정밀 fix

---

## Goal (one sentence)

Establish Phase 4.x DB foundation (workspaces.kind = 'brand' backfill + projects.twin_intent + projects.kind enum extension + project_licenses schema with RLS), redesign the post-submit /app/projects/[id] detail page to 1:1 cinematic hero card + 5-stage status timeline + 4 tabs (보드/진행/코멘트-placeholder/결과물-placeholder), ship Brand workspace sidebar/dashboard polish + /app/commission → /app/projects redirect + workspace switcher (박스+dropdown+multi-workspace), add Twin intent field to wizard Step 3, fix F1-F6 submit-broken with proper error handling, cherry-pick hotfix-3's 5 working features, and combine Phase 3.1 + hotfix-3 + Phase 4.x into a single ff-merge to main via the new branch g-b-9-phase-4.

---

## Confirmed yagi decisions

| Q | Choice | Implication |
|---|---|---|
| Q-101 | Branch = new `g-b-9-phase-4`, base = main, cherry-pick hotfix-3 working commits | Clean base; broken parts redesigned not migrated; g-b-8-canvas archive |
| Q-102 | Wave 4-stage (A foundation parallel / B detail sequential / C secondaries parallel / D verify sequential) | Detail page is critical, isolated; foundations + secondaries scale parallel |
| Q-103 | License model = B (schema + admin 내부 빈 surface) | project_licenses + RLS + admin sidebar item hidden until Phase 6 (option A within B) |
| Q-104 | Workspace switcher = C (full multi-workspace) | 박스 + dropdown + 다중 workspace SELECT scope; URL or cookie resolution lock down before Wave C |
| Q-105 | K-05 fallback = Opus 4.7 self-review (adversarial) + manual double-check | Codex (gpt-5.5) 토큰 소진. Self-review bias 인정 → critical changes 야기+Claude this-chat 추가 verify |
| Q-106 | Single ff-merge: phase-3-1 + hotfix-3 + phase-4 (combined SHIPPED) | g-b-8-canvas archive (PAUSED 살려둠), single SHIPPED entry on main |
| Q-107 | Carry-over via cherry-pick (5 working commits from hotfix-3) | KICKOFF entry first action: extract SHA list + yagi confirm before cherry-pick |

---

## Carry-over from hotfix-3 (cherry-pick targets)

### 살리는 5 항목 (cherry-pick into g-b-9-phase-4)

| # | 기능 | hotfix-3 task | Verify after cherry-pick |
|---|---|---|---|
| 1 | Step 2 max-w-6xl breakout | task_03 (3a) | Wizard Step 2 container width 1152px |
| 2 | AttachmentsSection (PDF/URL 별도 섹션) | task_03 (3b, 3c) | PDF + URL list rendering, drag-and-drop, validation |
| 3 | Lock UI (admin 잠금 + cascade banner) | task_04 | Lock button + locked banner + cascade to attachments |
| 4 | Drop 중복 fix (registerExternalContentHandler) | (sub-fix in task_03) | Single-shape drop, no duplicate |
| 5 | 미팅 희망 일자 필드 (datetime-local + DB column + i18n) | (sub-fix) | Wizard Step 3 의 datetime-local input 정상 |

추가로 흡수: hotfix-3 task_01 의 DB migration (`20260430010000_phase_3_1_hotfix_3_attachments.sql`) — 이미 prod 적용됐으므로 idempotent. cherry-pick 또는 re-apply check 둘 다 OK.

### 제외 4 항목 (Phase 4.x 에서 재설계)

| # | 기능 | 재설계 위치 |
|---|---|---|
| 1 | post-submit detail page (1:1 카드 비율, status timeline 미구현) | task_04 (Wave B) — 전면 재설계 |
| 2 | F1-F6 진단 wiring (submit broken) | task_02 (Wave A) — 정밀 fix 후 wiring 제거 |
| 3 | client redirect (/app/commission → /app/projects) | task_05 (Wave C) — routes 정리 |
| 4 | workspace switcher placeholder | task_06 (Wave C) — full multi-workspace 구현 |

### Cherry-pick 명령 (entry first action — Wave A 시작 전)

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
git checkout main
git pull origin main --ff-only
git checkout -b g-b-9-phase-4

# Builder 가 g-b-8-canvas 의 commit log 분석 → 5개 cherry-pick 대상 SHA 추출
git log g-b-8-canvas --oneline > .yagi-autobuild\phase-4-x\_carry_over_candidates.log

# Builder 는 _carry_over_candidates.log 를 읽고 5 항목별 SHA 식별 →
# .yagi-autobuild\phase-4-x\_cherry_pick_plan.md 작성:
#   1. <sha> "Step 2 max-w-6xl breakout"
#   2. <sha> "AttachmentsSection PDF/URL 섹션"
#   ...
# Yagi confirm in chat → 그 후 cherry-pick:

git cherry-pick <sha-1> <sha-2> <sha-3> <sha-4> <sha-5>

# Conflict 발생 시:
# - Phase 4.x broken 영역과 겹치는 conflict (post-submit detail page, F1-F6, /app/commission, workspace switcher) 는 새 branch 의 빈 상태가 우선 (즉 hotfix-3 변경 거절)
# - 그 외 conflict 는 task_plan.md 에 기록 + yagi 에 chat 보고 후 case-by-case 결정
```

g-b-8-canvas 는 별도 ff-merge 없이 **archive** (PAUSED 상태 유지, branch 살려둠 — `git branch -D` 하지 않음). _run.log 에 `g-b-8-canvas STATUS=archived superseded_by=g-b-9-phase-4` 기록.

---

## Pre-phase prerequisites

Builder ENTRY 시 verify. 실패 시 HALT + yagi 보고.

1. ✅ `main` 이 latest pull 된 상태 (`git pull origin main --ff-only`)
2. ✅ `g-b-9-phase-4` branch 생성 (main 기준)
3. ✅ `_carry_over_candidates.log` 생성 + 5 cherry-pick SHA 식별
4. ✅ `_cherry_pick_plan.md` 작성 + yagi confirm in chat
5. ✅ Cherry-pick 5 commits applied + conflict 해결 (있다면)
6. ✅ 적용 후 verify: tldraw integration 정상, AttachmentsSection 렌더, Lock UI 동작
7. ✅ R2 Public Development URL 활성, `CLOUDFLARE_R2_PUBLIC_BASE` in `.env.local` (Phase 3.1 prerequisite 그대로)
8. ✅ `getWizardAssetPutUrlAction` 서버액션 존재 (Phase 3.0 hotfix-2)
9. ✅ Codex CLI 사용 불가 confirm — Reviewer Fallback (Layer 1 Opus self-review + Layer 2 manual) 활성

If 1-5 fail: HALT, ask yagi for re-confirm.

---

## Reviewer Fallback (Codex 부재 시 K-05 protocol)

Codex (gpt-5.5) 토큰 소진 → 3 layer fallback:

### Layer 1: Opus 4.7 self-review (adversarial framing)

Builder 또는 Orchestrator 가 **별도 컨텍스트 (clean Claude Code session 또는 새 chat)** 에서 다음 prompt 로 self-review 실행. Self-review 실행 시 본 KICKOFF 또는 PRODUCT-MASTER 같은 friendly framing context 를 *주지 않음* — 진짜 adversarial 톤 유지.

**Self-review prompt template** (이 phase 의 D.6 에서 사용):

```
You are a senior security reviewer for a SaaS application called YAGI Studio.
Phase 4.x has just shipped the following changes:

[INSERT: full diff of g-b-9-phase-4 vs main, including migration SQL, server actions,
RLS policies, and any client-supplied data trust boundary code]

Your task: Identify ALL security, RLS, privilege escalation, data leakage, and
authorization issues. You are an ADVERSARY — assume the developer is competent
but missed important edge cases. Focus on:

1. workspaces.kind = 'brand' backfill: cross-tenant leak via kind manipulation;
   what if a user UPDATEs their workspace.kind to 'yagi_admin'?
2. projects.twin_intent + projects.kind enum: client-supplied trust boundary;
   what if client submits 'inbound_brand_to_artist' as kind?
3. project_licenses schema: cross-tenant leak via license_id guessing; RLS scope
   by workspace ownership; INSERT/UPDATE/DELETE leak; auth.jwt role claim format.
4. workspace switcher multi-workspace: SELECT scope leak when user is member of
   multiple workspaces; active_workspace cookie/URL trust boundary.
5. /app/commission redirect: open redirect vulnerability — must be relative path,
   no user-supplied next= param.
6. F1-F6 submit fix: error path information disclosure; stack trace leakage in
   production; sensitive field reveal in toast.
7. post-submit detail page: project-scope authorization on EVERY tab; route guards
   for disabled tabs (코멘트/결과물 placeholder must NOT load private data).
8. Twin intent field: client-supplied value validation at zod + RPC + DB CHECK
   (defense in depth).
9. Cherry-pick conflicts: any RLS policy from hotfix-3 that was weakened during
   cherry-pick conflict resolution?

For each finding, classify:
- HIGH-A: security-critical (privilege escalation, RLS bypass, data leak)
- HIGH-B: high-impact bug (auth flow break, data corruption)
- MEDIUM: defense-in-depth gap, incorrect error handling, missing validation
- LOW: stylistic, non-security

Output format (one finding per line, machine-parseable):
[FINDING N] CLASS: file:line — issue description — recommended fix

Do not be lenient. Treat this as adversarial. Output 0 findings ONLY if you are
certain there are no issues at the HIGH-A or HIGH-B level.
```

저장 위치: `.yagi-autobuild\phase-4-x\_self_review_loop_1.md` (LOOP 1) → `_self_review_loop_2.md` (LOOP 2 after fixes).

### Layer 2: Manual double-check (야기 + Claude this-chat)

Critical changes 는 self-review 결과 외에 추가로:

**야기 SQL verify** — psql 또는 Supabase Studio 에서 직접:
1. workspaces.kind: user A (member of W1) 가 W2 의 kind 를 UPDATE 시도 → DENY 확인
2. projects.twin_intent: client-supplied 'invalid_value' INSERT 시도 → CHECK constraint 거절 확인
3. projects.kind enum: client 가 'inbound_brand_to_artist' 직접 INSERT 시도 → RPC 외부 경로 deny 확인
4. project_licenses: non-admin user 의 SELECT/INSERT/UPDATE/DELETE 모두 deny
5. Multi-workspace SELECT: user A (W1 member only) 가 W2 의 projects 조회 시도 → 0 rows
6. /app/commission redirect: `/app/commission?next=https://evil.com` → /app/projects 로만 redirect (next param 무시)

**Claude this-chat (이 대화 세션) second-opinion** — 야기가 critical changes 의 diff 또는 file path 를 chat 에 paste → Claude 가 별도 분석 (Opus self-review 가 missed 했을 edge case 찾기).

### Layer 3: Loop rules

- LOOP 1: Self-review → HIGH-A + HIGH-B 모두 fix → commit each
- LOOP 2: Self-review re-run → 0 HIGH-A residual 기대 → PASS 또는 LOOP 2 추가 fix
- (Codex L-003 의 LOOP 3 fallback 없음 — 야기 manual review 가 final gate)
- 0 HIGH-A residual 미달 시 HALT, yagi 에 보고, manual decision

### Critical changes list (manual double-check 필수)

이번 phase 의 manual verify 대상 6 항목:
1. workspaces.kind column + RLS update (workspace_members SELECT scope)
2. projects.twin_intent column (zod + RPC + DB CHECK 3중 validation)
3. projects.kind enum 확장 (5 신규 enum value, 기존 'direct' 호환성)
4. project_licenses table + RLS (cross-tenant leak)
5. workspace switcher multi-workspace SELECT scope
6. /app/commission redirect (open redirect 방지)

self-review LOOP 2 PASS 후에도 위 6 항목 모두 야기 SQL verify + this-chat second-opinion 통과해야 SHIPPED.

---

## Task list (for task_plan.md)

Wave A (parallel, 3 teammates) → B (sequential, 1) → C (parallel, 3) → D (sequential, 2).

ALL teammates run **Sonnet 4.6** (yagi requirement: no Haiku — quality consistency).

---

### Wave A — DB foundation + wizard fixes (parallel, 3 teammates)

#### task_01: A — DB schema migration (workspaces.kind + projects.twin_intent + projects.kind enum + project_licenses)
**[complexity: complex, model: Sonnet 4.6, parallel_group: A]**

Migration: `supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql`

```sql
-- ============================================================
-- 1. workspaces.kind
-- ============================================================
ALTER TABLE workspaces
  ADD COLUMN kind text NOT NULL DEFAULT 'brand'
    CHECK (kind IN ('brand', 'artist', 'yagi_admin'));

-- 기존 모든 workspace = 'brand' (현 상태에서 합리적 default)
-- yagi_admin workspace 가 별도면 yagi 가 MANUAL UPDATE 후 verify
UPDATE workspaces SET kind = 'brand' WHERE kind IS NULL;

CREATE INDEX idx_workspaces_kind ON workspaces(kind);

-- ============================================================
-- 2. projects.twin_intent
-- ============================================================
ALTER TABLE projects
  ADD COLUMN twin_intent text NOT NULL DEFAULT 'undecided'
    CHECK (twin_intent IN ('undecided', 'specific_in_mind', 'no_twin'));

-- ============================================================
-- 3. projects.kind enum 확장
-- ============================================================
ALTER TABLE projects
  DROP CONSTRAINT IF EXISTS projects_kind_check;

ALTER TABLE projects
  ADD CONSTRAINT projects_kind_check CHECK (kind IN (
    'direct',
    'inbound_brand_to_artist',
    'talent_initiated_creative',
    'talent_initiated_self_ad',
    'talent_initiated_brand_passthrough',
    'talent_initiated_footage_upgrade'
  ));

-- 기존 데이터 'direct' 그대로 (NOT NULL 이므로 backfill 불필요)

-- ============================================================
-- 4. project_licenses (Phase 6 채움; Phase 4 = schema + RLS only)
-- ============================================================
CREATE TABLE project_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  campaign_name text NOT NULL,
  region text NOT NULL DEFAULT 'KR'
    CHECK (region IN ('KR', 'JP', 'US', 'EU', 'ASIA', 'GLOBAL')),
  start_date date NOT NULL,
  end_date date,  -- NULL 허용 (perpetual; 명시적 end 가 default)
  fee_amount_krw bigint NOT NULL DEFAULT 0,
  fee_currency text NOT NULL DEFAULT 'KRW',
  artist_share_percent integer NOT NULL DEFAULT 0
    CHECK (artist_share_percent BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'expired', 'terminated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id)
);

CREATE INDEX idx_project_licenses_project ON project_licenses(project_id);
CREATE INDEX idx_project_licenses_status ON project_licenses(status);

-- RLS
ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;

-- SELECT: yagi_admin (all) + project owner client (own)
CREATE POLICY "project_licenses_select_admin" ON project_licenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- Phase 4.x BLOCKER 1 fix (2026-05-01 Wave A): KICKOFF spec referenced
-- projects.owner_id but the actual ownership column is created_by.
-- yagi confirmed option B: amend the policy SQL to match the schema.
CREATE POLICY "project_licenses_select_owner" ON project_licenses
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE: yagi_admin only (Phase 4 단계)
CREATE POLICY "project_licenses_write_admin" ON project_licenses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- updated_at trigger
CREATE TRIGGER project_licenses_updated_at_trigger
  BEFORE UPDATE ON project_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Self-review focus** (적용 시점에 LOOP 1):
- workspaces.kind 'brand' backfill 의 cross-tenant 영향 없음 검증 (kind 는 ux discriminator, RLS namespace 아님)
- projects.kind enum 확장이 기존 RLS 와 호환 (RLS 는 kind 값 사용 안 함; transition_project_status RPC 무영향)
- project_licenses RLS — auth.uid() 와 profiles.role check 정확 (auth.jwt 의 role claim 형식 가정 확인)
- project_licenses INSERT 가 yagi_admin only — Phase 4 에서 client 노출 0
- ON DELETE CASCADE: project 삭제 시 license 삭제 의도? (Phase 6 검토 필요 — 일단 CASCADE 유지하되 Q-108 deferred)

**Acceptance** (verifiable):
- Migration 적용 OK (`npx supabase db push --linked`)
- psql verify: 모든 column + enum 값 + RLS policy + index + trigger 정상
- 기존 row 무손상 (workspaces, projects 모두)
- twin_intent default 'undecided' 적용 (모든 기존 row)
- workspace.kind = 'brand' (모든 기존 row, manual UPDATE 가 yagi_admin 워크스페이스 제외 후 적용됨)

---

#### task_02: A — F1-F6 submit-broken precise fix + 진단 wiring 정리
**[complexity: complex, model: Sonnet 4.6, parallel_group: A]**

hotfix-3 에서 깔린 F1-F6 진단 wiring 분석 → 정확한 root cause → fix → wiring 제거 또는 production-grade error handling 으로 refactor.

**조사 단계**:
1. F1-F6 진단 wiring 의 위치 식별 (`grep -r "F1\|F2\|F3\|F4\|F5\|F6" src/`)
2. 각 step 의 출력 위치 (console, file, network) 식별
3. Yagi 의 마지막 PAUSE 시점 reproduction — 어느 F# 에서 fail 인지 확인
4. Root cause 분석 후 fix:
   - Common candidates:
     - `seed_project_board_from_wizard` 의 새 signature (attached_pdfs, attached_urls, asset_index 추가) 와 `submitProjectAction` 호출 mismatch
     - Wizard state 의 attached_pdfs/urls 가 RPC 에 안 전달
     - Action 의 zod validation 이 새 field 거절
     - RLS policy 가 INSERT 거절 (특히 새 twin_intent column 도입 시)
5. Fix 적용 후 진단 wiring 제거 또는 정상 toast/error boundary 로 refactor

**Files in scope**:
- `src/app/[locale]/app/projects/new/actions.ts` (submitProjectAction, ensureDraftProject)
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` (필요 시)
- 진단 wiring 위치 (F1-F6 식별 후)

**Self-review focus**:
- Error path information disclosure (production 에서 stack trace 또는 SQL 에러 message leak X)
- Sensitive field reveal in toast (예: user_id, email)

**Acceptance**:
- Submit 정상 (status 전환 정확: draft → routing 또는 in_review)
- 진단 wiring 제거 또는 production-grade error handling 으로 refactor
- Reproduction case 에서 success
- 에러 case 시 명확한 user-friendly toast (`/ko` + `/en`)

---

#### task_03: A — Wizard Step 3 Twin intent 필드 + tooltip + locale
**[complexity: simple, model: Sonnet 4.6, parallel_group: A]**

PRODUCT-MASTER §4.4 옵션 C (curation-first) — Brand wizard 단순화. Step 3 에 Twin intent UI 추가.

**Sub-decision lock down before task start** (Open Decisions §1):
- 옵션 A: 3-radio (`specific_in_mind` / `undecided` / `no_twin`) — 권장
- 옵션 B: single toggle (체크 = `no_twin`, 미체크 = `undecided`, 자유텍스트로 `specific_in_mind` 명시)

기본 권장 = **옵션 A** (DB enum 과 1:1 매핑, locale 명확). 야기 confirm 받기.

**Step 3 Twin intent UI (옵션 A 가정)**:

```
┌─────────────────────────────────────────────┐
│ Digital Twin 활용을 원하시나요?  ⓘ          │
│                                              │
│ ⚪ Twin 활용 의향 있음 (default)            │
│ ⚪ 정해진 인물이 있다                       │
│ ⚪ Twin 활용 안 함 (가상 인물 / VFX 만)     │
└─────────────────────────────────────────────┘

Tooltip ⓘ (hover 또는 click 시 popover):
"Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다.
 YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는걸
 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다."
```

**Files in scope**:
- `src/app/[locale]/app/projects/new/new-project-wizard.tsx` (Step 3 확장)
- `src/app/[locale]/app/projects/new/actions.ts` (twin_intent → submitProjectAction zod schema → seed RPC)
- `messages/ko.json` + `messages/en.json` (신규 키)

**i18n 키**:
```
wizard.step3.twin_intent.label: "Digital Twin 활용을 원하시나요?"
wizard.step3.twin_intent.label.en: "Would you like to use a Digital Twin?"
wizard.step3.twin_intent.tooltip: "Digital Twin 은 실존 인물..." (full copy)
wizard.step3.twin_intent.tooltip.en: "Digital Twin is an AI asset based on real persons..."
wizard.step3.twin_intent.option.undecided: "Twin 활용 의향 있음"
wizard.step3.twin_intent.option.undecided.en: "Open to using a Twin"
wizard.step3.twin_intent.option.specific: "정해진 인물이 있다"
wizard.step3.twin_intent.option.specific.en: "I have a specific person in mind"
wizard.step3.twin_intent.option.no_twin: "Twin 활용 안 함 (가상 인물 / VFX 만)"
wizard.step3.twin_intent.option.no_twin.en: "No Twin (virtual character / VFX only)"
```

**Self-review focus**:
- twin_intent 값 client-supplied — zod (action) + RPC + DB CHECK 3중 validation 확인
- Default 'undecided' 가 user 가 명시적으로 선택 안 했을 때 적용

**Acceptance**:
- Step 3 의 Twin intent UI 정상 렌더 (3-radio + tooltip)
- Tooltip ⓘ hover/click 동작
- Submit 시 twin_intent 정확히 DB 저장 (3 enum 값 모두 verify)
- /ko + /en parity
- Default selection = 'undecided' (radio 기본 체크)

---

### Wave B — post-submit detail page redesign (sequential, 1 teammate)

#### task_04: B — /app/projects/[id] detail page 재설계 (1:1 카드 비율 + status timeline + tabs)
**[complexity: complex, model: Sonnet 4.6, parallel_group: B]**

PRODUCT-MASTER §5: "Submit 후 detail page 재설계 — 1:1 카드 비율 + Discovery / Proposal / Production status 명확화"

**Layout** (1280 max-width, 1:1 hero card + right rail + 4 tabs):

```
┌─────────────────────────────────────────────────┐
│ ← Back to projects                               │
├─────────────────────────────────────────────────┤
│ Status timeline                                  │
│ ● 검토 → ○ 라우팅 → ○ 진행 → ○ 시안 → ○ 납품   │
├─────────────────────────────────────────────────┤
│ ┌──────────────────────┐  ┌──────────────────┐ │
│ │                      │  │ 프로젝트 정보    │ │
│ │  Hero card 1:1       │  │                  │ │
│ │  (cinematic 720x720) │  │ 의뢰 일자        │ │
│ │  - Project name      │  │ 예산             │ │
│ │  - One-line desc     │  │ 납기             │ │
│ │  - Status pill       │  │ Twin intent      │ │
│ │  - Cover image       │  │ 미팅 희망일      │ │
│ │    (optional)        │  │                  │ │
│ │                      │  │                  │ │
│ └──────────────────────┘  └──────────────────┘ │
├─────────────────────────────────────────────────┤
│ Tabs: [보드] [진행] [코멘트●] [결과물●]          │
│       (● = Phase 5+ placeholder, disabled)       │
├─────────────────────────────────────────────────┤
│ Tab content                                      │
└─────────────────────────────────────────────────┘
```

**구성 요소**:

1. **Status timeline** (top, full-width 1280):
   - 5 단계: 검토 → 라우팅 → 진행 → 시안 → 납품
   - 현재 status 하이라이트 (sage `#71D083` accent — design system v1.0)
   - Mapping:
     - 검토 (status='in_review' or 'draft' for new)
     - 라우팅 (status='routing' — Phase 4 신규 status. task_01 의 transition_project_status RPC 와 호환 확인 필요)
     - 진행 (status='in_progress')
     - 시안 (status='approval_pending' — Phase 5+, currently inactive but slot 잡아둠)
     - 납품 (status='delivered')

2. **Hero card 1:1** (왼쪽, 720×720):
   - 정사각 cinematic 비율
   - 프로젝트 이름 (Pretendard 30 600 lh 1.18 ls -0.01em)
   - 한 줄 설명 (Pretendard 16 400 lh 1.37)
   - Status pill (Mona12 12 700 sage, sage-soft bg, radius 999)
   - Cover image (optional — 아직 없으면 dark placeholder)

3. **Right rail (info-rail)** (오른쪽, 360 wide):
   - 의뢰 일자 (created_at)
   - 예산 (budget enum → KO label)
   - 납기 (delivery_date 또는 "협의")
   - Twin intent (twin_intent enum → KO label)
   - 미팅 희망일 (preferred_meeting_at 또는 "—")
   - design system v1.0 의 ink.tertiary 톤

4. **Tabs**:
   - 보드 (Phase 4 active): ProjectBoard brief mode + AttachmentsSection (hotfix-3 carry-over)
   - 진행 (Phase 4 active): project_status_history 활용 — 단계별 timestamp + admin note
   - 코멘트 (Phase 5 placeholder, disabled): "Phase 5+ 부터 사용 가능합니다."
   - 결과물 (Phase 5 placeholder, disabled): "납품 후 표시됩니다."

5. **Submit 직후 진입 시**:
   - Status = 'in_review' or 'draft'
   - Top banner: "YAGI 팀이 1-2 영업일 내 답변드립니다." (calm, achromatic)

**Files in scope**:
- `src/app/[locale]/app/projects/[id]/page.tsx` (대규모 재작성)
- `src/components/project-detail/status-timeline.tsx` (NEW)
- `src/components/project-detail/hero-card.tsx` (NEW — 1:1 cinematic)
- `src/components/project-detail/info-rail.tsx` (NEW — right rail)
- `src/components/project-detail/tabs.tsx` (NEW — 4 tab navigation, disabled state UX)
- `src/components/project-detail/board-tab.tsx` (NEW — wraps ProjectBoard + AttachmentsSection)
- `src/components/project-detail/progress-tab.tsx` (NEW — status history)
- `src/components/project-detail/placeholder-tab.tsx` (NEW — 코멘트/결과물 공통)
- `messages/ko.json` + `messages/en.json` (신규 키)

**Design system v1.0 compliance**:
- Pretendard Variable (KO default), lh 1.18 / 1.37, ls -0.01em / 0
- 무채색만 + sage accent (status pill, current step in timeline)
- Radius 24 (cards), 999 (pills)
- Zero shadow
- Border subtle rgba(255,255,255,0.11) — disabled tab 도 동일

**Self-review focus** (CRITICAL):
- Detail page every tab 에서 project-scope authorization (project.owner_id === auth.uid() OR yagi_admin role)
- 코멘트/결과물 tab disabled — placeholder text 만 렌더, 어떤 server data 도 fetch X
- info-rail 의 정보 노출 — project_licenses 정보가 client 에 절대 노출 안 됨 (Phase 4 admin only)
- Hero card cover_image — 만약 R2 URL 노출이면 RLS 또는 signed URL 검토

**Acceptance**:
- Detail page 1:1 hero card 비율 정확 (720×720 desktop)
- Status timeline 5 단계 + 현재 status 정확 강조
- 4 tabs 렌더 (보드/진행 active, 코멘트/결과물 disabled)
- Submit 직후 진입 → "검토 ●" 강조 + "1-2 영업일 내 답변" 메시지
- 보드 tab: ProjectBoard brief mode + AttachmentsSection 정상 (carry-over verify)
- 진행 tab: status history timestamp + admin note 표시 (없으면 empty state)
- 코멘트/결과물 tab: 클릭 시 placeholder text + 어떤 server fetch 도 안 발생
- info-rail: 의뢰 일자/예산/납기/Twin intent/미팅 희망일 모두 정확
- Mobile 390px: 카드 vertical stack, status timeline horizontal scroll 또는 vertical 변경
- /ko + /en parity
- design system v1.0 token 그대로 적용

---

### Wave C — Brand workspace surfaces + workspace switcher + license stub (parallel, 3 teammates)

#### task_05: C — /app/commission redirect + Brand workspace sidebar/dashboard 정리
**[complexity: simple, model: Sonnet 4.6, parallel_group: C]**

PRODUCT-MASTER §4.3 Brand workspace sidebar:
```
[YAGI Studio logo]
[Brand workspace switcher ▾]   ← task_06

WORK
- 프로젝트         (active)
- 라이선스         (Phase 6+ placeholder, disabled link)  ← Q-103 옵션 A: HIDDEN
- 추천 Artist     (Phase 7+ placeholder, disabled link)

ACCOUNT
- 청구             (Phase 6+ placeholder, disabled link)
- 팀 / 권한        (Phase 4: 단순 list)
- 설정            (Phase 4: 기본 form)
```

**작업**:
1. `/app/commission/*` → `/app/projects/*` redirect (`next.config.ts` 또는 `middleware.ts`)
2. Brand sidebar 컴포넌트 갱신 (Phase 5 에서 Artist sidebar 별도 추가됨)
3. /app dashboard (가능하면 /app/projects empty state) 갱신

**Q-103 옵션 A within B**: 라이선스 sidebar 항목 = **HIDDEN** (Phase 4 에서 노출 X). Phase 6 부터 enable.

**Files in scope**:
- `src/app/[locale]/app/layout.tsx` (sidebar 변경)
- `src/components/sidebar/brand-sidebar.tsx` (NEW or extend)
- `next.config.ts` 또는 `src/middleware.ts` (commission → projects redirect rule)
- `messages/ko.json` + `messages/en.json` (sidebar 항목 라벨)

**Self-review focus**:
- Redirect 가 open redirect 가 아님 (relative path only, `/app/commission` → `/app/projects` 정확히만; `next=` 같은 user-supplied param 무시)
- Sidebar disabled link 가 권한 leak 아님 (단순 disabled UI, 실제 routes 는 still gated by middleware)

**Acceptance**:
- `/ko/app/commission` → `/ko/app/projects` 정확히 redirect (301 또는 308)
- `/en/app/commission` → `/en/app/projects`
- Open redirect 시도 (`/app/commission?next=https://evil.com`) → next param 무시, /app/projects 만 redirect
- Brand sidebar: 프로젝트 active, 추천 Artist + 청구 disabled, 라이선스 hidden, 팀/권한 + 설정 active
- /ko + /en parity

---

#### task_06: C — Workspace switcher 박스화 + dropdown + multi-workspace 지원
**[complexity: complex, model: Sonnet 4.6, parallel_group: C]**

PRODUCT-MASTER §4.7. 야기 결정 = C (full multi-workspace).

**Sub-decision lock down before task start** (Open Decisions §2-3):
- §2 Active workspace resolve 방식:
  - 옵션 A: URL prefix `/app/w/[workspaceId]/*` — bookmarkable, share-able, 큰 layout 변경
  - 옵션 B: cookie-based (`yagi_active_workspace = uuid`) — 기존 routes 그대로, less bookmarkable
  - **권장 = B** (Phase 4 에서 layout 변경 최소화; URL prefix 는 Phase 5 또는 6 에서 도입)
- §3 "+ 새 workspace 추가" 동작:
  - 옵션 A: Phase 4 active (Brand workspace 추가 가능)
  - 옵션 B: Placeholder (disabled, "Phase 5 부터 가능")
  - **권장 = B** (Artist onboarding 과 함께 Phase 5 에서 enable)

**Component (NEW)**: `src/components/sidebar/workspace-switcher.tsx`

```tsx
type Props = {
  currentWorkspace: { id: string; name: string; kind: 'brand'|'artist'|'yagi_admin' };
  workspaces: { id: string; name: string; kind: 'brand'|'artist'|'yagi_admin' }[];
};

// 동작:
// - 박스 형태 (sidebar 좌상단, padding 8px 12px, radius 12, border subtle, bg.card-deep)
// - 클릭 → DropdownMenu 펼침
// - Dropdown 내부:
//   - "Brands" group: kind='brand' workspaces
//   - "Artists" group: kind='artist' workspaces (Phase 5+ 렌더 — Phase 4 에는 빈 group)
//   - "YAGI Admin" group: kind='yagi_admin' (있으면)
//   - 구분선
//   - "+ 새 workspace 추가" (Phase 4 = disabled, 권장 §3 옵션 B)
// - 선택 → cookie 'yagi_active_workspace' set + page reload (또는 server-side redirect)
```

**Multi-workspace DB 측면**:
- `workspace_members` (user_id, workspace_id) composite key — already supports multi-membership
- Active workspace 결정:
  - Cookie `yagi_active_workspace = uuid` (옵션 B)
  - Server component 가 cookie 읽고 workspace_members verify → page render scope 결정
  - Cookie 없거나 invalid 면 first member workspace 자동 선택

**Active workspace resolver** (NEW): `src/lib/workspace/active.ts`

```ts
export async function resolveActiveWorkspace(
  userId: string
): Promise<{ id: string; name: string; kind: 'brand'|'artist'|'yagi_admin' } | null> {
  // 1. Cookie 'yagi_active_workspace' 읽기
  // 2. Cookie 가 있으면: workspace_members 에서 (user_id=userId AND workspace_id=cookie_value) 검증
  //    - 검증 PASS: 그 workspace 반환
  //    - 검증 FAIL: cookie 무효화 + step 3 fallback
  // 3. Fallback: workspace_members 에서 user_id=userId 의 first workspace 반환 (created_at ASC)
  // 4. 아무 workspace 없으면 null (onboarding redirect trigger)
}
```

**Files in scope**:
- `src/components/sidebar/workspace-switcher.tsx` (NEW)
- `src/app/[locale]/app/layout.tsx` (workspace-switcher 통합)
- `src/lib/workspace/active.ts` (NEW)
- `src/middleware.ts` (cookie validation, optional)
- `messages/ko.json` + `messages/en.json` (dropdown label, group label)

**i18n 키**:
```
workspace.switcher.brands_group: "Brands"
workspace.switcher.artists_group: "Artists"
workspace.switcher.admin_group: "YAGI"
workspace.switcher.add_new: "+ 새 workspace 추가"
workspace.switcher.add_new.disabled: "Phase 5 부터 가능"
workspace.switcher.add_new.en: "+ Add new workspace"
workspace.switcher.add_new.disabled.en: "Available in Phase 5"
```

**Self-review focus** (CRITICAL — manual double-check 대상):
- 다중 workspace SELECT scope leak — user A (W1 member only) 가 W2 의 project 조회 시도 시 RLS deny
- workspace_members RLS — user 가 본인 member 아닌 workspace 의 list 조회 가능?
- Active workspace resolve — cookie 의 workspace_id 무조건 신뢰 X, 매번 server-side workspace_members 검증
- Cookie tampering — 다른 user 의 workspace_id 를 cookie 에 넣으면? → workspace_members 검증에서 deny 되어야 함
- Workspace switcher 의 group rendering — Phase 4 에 artist workspace 없는데 group 빈 상태 노출은 OK? (선택: 빈 group 숨김)

**Acceptance**:
- 박스 형태 sidebar 좌상단 (padding 8px 12px, radius 12, border subtle, bg.card-deep)
- 클릭 → dropdown 펼침 + group 정확
- Single workspace user: dropdown 깔끔 (자기 workspace + "+ 추가" disabled)
- Multi-workspace user (yagi 가 DB 에 manual 추가 후 testing): dropdown 정확 list
- Workspace 선택 → cookie set + reload → page scope 변경
- Cookie tampering 시도 → 즉시 fallback (first member workspace 또는 onboarding redirect)
- /ko + /en parity
- **Manual SQL verify**: cross-workspace RLS leak 없음 (D.9 Layer 2)

---

#### task_07: C — License model schema verify + admin sidebar hidden
**[complexity: simple, model: Sonnet 4.6, parallel_group: C]**

야기 결정 = B (schema + admin 빈 surface) within 옵션 A (sidebar hidden).

**작업**:
1. task_01 의 project_licenses table + RLS 정상 적용 verify (psql)
2. /app/admin/* sidebar 에서 라이선스 항목 **HIDDEN** (Phase 4 에서 노출 X)
3. /app/admin/projects/[id] 의 우측 rail 에 "라이선스" 섹션 미표시 (Phase 6 부터 표시)

**Surface (admin only)**:
- License 메뉴 = invisible (yagi 직접 결정 — Phase 4 에서 의미 없는 항목 노출은 noise)
- Phase 6 entry 시 enable

**Files in scope**:
- `src/components/sidebar/admin-sidebar.tsx` (license 항목 hidden)
- (필요 시) `messages/ko.json` + `messages/en.json` — Phase 4 에서 키 추가 X (Phase 6 에서 추가)

**Self-review focus**:
- /app/admin/* routes 의 yagi_admin role gating (auth.uid() + profiles.role check)
- License surface 가 client 에게 leak 안 됨 (Phase 4 에서 surface 자체 없음)

**Acceptance**:
- project_licenses table + RLS 정상 (task_01 verify)
- Admin sidebar 의 license 항목 hidden
- /app/admin/licenses route 직접 접근 시 → 404 또는 redirect (Phase 6 에서 page 추가)

---

### Wave D — Verification + ff-merge (sequential, 2 teammates)

#### task_08: D — Reviewer Fallback + manual verifies + tsc/lint/build/types regen
**[complexity: complex, model: Sonnet 4.6 + Opus 4.7 self-review, parallel_group: D]**

D.1. Migration 적용:
```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
npx supabase db push --linked
```

D.2. Migration psql verify:
- workspaces.kind column + index + 'brand' backfill
- projects.twin_intent + default 'undecided'
- projects.kind enum 6값 정확
- project_licenses table + 2 indexes + 3 RLS policies + updated_at trigger

D.3. tsc + lint + build:
```powershell
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```
모두 exit 0.

D.4. database.types.ts regen (L-022):
```powershell
npx supabase gen types typescript --project-id jvamvbpxnztynsccvcmr --schema public > src/lib/supabase/database.types.ts
```
Commit message: `chore: regen database.types.ts for phase-4-x schema`

D.5. Bundle size delta vs `g-b-9-phase-4` cherry-pick baseline:
- /app/projects/[id]: detail page 재설계 — 변화 log
- /app/projects/new: Twin intent 필드 — 미세 변화
- Sidebar: workspace switcher — DropdownMenu + multi-group 추가
- 한도: 각 route +30KB gzipped 이내

D.6. **Reviewer Fallback Layer 1** — Opus 4.7 self-review:
1. Builder 가 별도 컨텍스트 시작 (clean Claude Code session 또는 새 chat)
2. 위 "Reviewer Fallback" 섹션의 self-review prompt 에 g-b-9-phase-4 의 diff 삽입
3. Self-review 실행 → `.yagi-autobuild\phase-4-x\_self_review_loop_1.md` 저장

D.7. LOOP 1 fixes:
- HIGH-A finding 모두 fix
- HIGH-B finding 모두 fix
- 각 fix commit message: `fix(phase-4-x): self-review HIGH-A finding #N — <issue summary>`

D.8. **Reviewer Fallback Layer 1 LOOP 2**:
- 다시 별도 컨텍스트에서 self-review re-run (LOOP 1 fix 적용된 diff 로)
- 결과 `_self_review_loop_2.md` 저장
- 0 HIGH-A residual 기대 → PASS
- 미달 시 HALT, yagi 보고

D.9. **Reviewer Fallback Layer 2** — Manual double-check (yagi 직접):
1. workspaces.kind RLS — user A (W1 member) 가 W2 kind UPDATE 시도 → DENY 확인 (psql)
2. projects.twin_intent — invalid_value INSERT 시도 → CHECK constraint 거절 확인
3. projects.kind enum — non-RPC 경로로 'inbound_brand_to_artist' INSERT 시도 → deny 확인
4. project_licenses RLS — non-admin user SELECT/INSERT/UPDATE/DELETE 모두 deny
5. Multi-workspace SELECT — user A (W1 only) 의 W2 projects 조회 → 0 rows
6. /app/commission redirect — `?next=https://evil.com` 시도 → next 무시, /app/projects 로만 redirect

야기 chat confirm: `manual verify PASS` (6 항목 명시).

D.10. **Reviewer Fallback Layer 2 second-opinion** — Claude this-chat:
1. 야기가 critical changes 의 diff (또는 file path) chat paste
2. Claude this-chat 별도 분석 — Opus self-review missed edge case 찾기
3. 추가 finding 있으면 fix 추가 commit

**Acceptance**:
- Migration 적용 + verify PASS
- tsc/lint/build exit 0
- database.types.ts regen + commit
- Bundle delta within budget (+30KB gzipped 이내)
- `_self_review_loop_2.md` 의 0 HIGH-A residual
- 야기 manual verify PASS (6 critical changes 모두)
- Claude this-chat second-opinion 결과 적용 (있다면)

---

#### task_09: D — Browser smoke + ff-merge + memory updates + backlog cleanup
**[complexity: complex, model: Sonnet 4.6, parallel_group: D]**

⚠️ task_08 모든 acceptance 통과 후에만 시작.

**D.11. `_smoke_checklist.md` 작성** — 14 sections (Phase 4.x 신규 + carry-over 검증).

야기 직접 smoke 후 PASS 확인. 14 sections (전체 PASS 필수, S9 legacy + S11 email 은 SKIP 가능):

##### Section 1 — Schema migration verify (DB)
- workspaces.kind 모든 row 'brand'
- projects.twin_intent 기본 'undecided'
- projects.kind enum 6값 정확
- project_licenses table 존재 + RLS 활성

##### Section 2 — Wizard Step 3 Twin intent 필드
- /ko/app/projects/new → Step 3 → Twin intent 3-radio 동작
- Tooltip ⓘ hover/click 정상
- Submit → DB twin_intent 정확히 저장 (3 enum 값 verify)
- /en parity

##### Section 3 — Submit-broken fix
- Submit 정상 (status 전환: draft → routing 또는 in_review)
- F1-F6 진단 wiring 제거 또는 production-grade error handling
- 에러 case → 명확한 user-friendly toast
- /ko + /en

##### Section 4 — Wizard Step 2 carry-over (cherry-pick verify)
- max-w-6xl breakout 정상 (1152px)
- AttachmentsSection PDF/URL 동작
- Drop 중복 fix 동작 (single shape per drop)
- 미팅 희망일 datetime-local 필드 정상
- 캔버스 16:10 / 모바일 4:5

##### Section 5 — post-submit detail page (NEW)
- 1:1 hero card 비율 정확 (720×720 desktop)
- Status timeline 5 단계 + 현재 status 강조 (sage)
- 4 tabs (보드/진행 active, 코멘트/결과물 disabled)
- 보드 tab: ProjectBoard brief mode + AttachmentsSection 정상 (carry-over)
- 진행 tab: status history timestamp + admin note 표시
- 코멘트/결과물 tab: 클릭 → placeholder text + 어떤 server fetch 도 없음 (Network 탭 verify)
- info-rail: 5 항목 (의뢰일/예산/납기/Twin intent/미팅 희망일) 정확
- "1-2 영업일 내 답변" banner (submit 직후)
- /ko + /en parity

##### Section 6 — Lock UI carry-over
- yagi_admin lock button 동작 + 확인 dialog
- Client view → cascade (banner + readonly tldraw + AttachmentsSection mutations 비활성)
- Unlock → 즉시 client view 복구 (refresh 필요 X — 가능 시)

##### Section 7 — Brand workspace sidebar
- 5 항목 (프로젝트 active / 추천 Artist + 청구 disabled / 라이선스 hidden / 팀-권한 + 설정 active)
- /en parity

##### Section 8 — /app/commission redirect
- /ko/app/commission → /ko/app/projects (301/308)
- /en/app/commission → /en/app/projects
- Open redirect 시도 (`?next=https://evil.com`) → next 무시

##### Section 9 — Workspace switcher
- 박스 형태 sidebar 좌상단 (radius 12, border subtle, bg.card-deep)
- 클릭 → dropdown
- Single workspace user: 깔끔 (자기 workspace + "+ 추가" disabled)
- Multi-workspace 시뮬레이션 (yagi 가 DB 에 manual workspace 추가 후 testing): dropdown 정확
- Workspace 선택 → cookie set + reload → page scope 변경
- "+ 새 workspace 추가" disabled tooltip "Phase 5 부터 가능"
- /en parity

##### Section 10 — License (Q-103 옵션 A within B)
- Admin sidebar 라이선스 항목 hidden 확인
- /app/admin/licenses 직접 접근 → 404 또는 redirect

##### Section 11 — Mobile (DevTools 390px) ⚠️ NON-CRITICAL — partial OK
- Wizard Step 2/3, detail page, sidebar 모두 mobile breakpoint 정상
- Workspace switcher mobile burger menu 또는 적절한 fallback
- info-rail vertical stack
- Status timeline horizontal scroll 또는 vertical 변경

##### Section 12 — RLS sanity (재확인)
- 야기 D.9 manual verify 6 항목 PASS 확인 — Section 12 는 그 결과 재확인

##### Section 13 — Status machine intact
- transition_project_status RPC 무손상
- Phase 3.0 status 전환 (in_review → in_progress 등) 정상

##### Section 14 — /en parity 전체
- 모든 신규 surface 의 /en 정확
- 신규 i18n 키 모두 EN 정의됨

야기 chat confirm: `yagi smoke PASS` (모든 section, S11 SKIP 표시 OK).

**D.12. ff-merge sequence**:
```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
git checkout main
git pull origin main --ff-only
git merge g-b-9-phase-4 --ff-only
pnpm install --frozen-lockfile     # L-008 — 6th hit, DO NOT SKIP
pnpm exec tsc --noEmit
pnpm build
git push origin main
```

**D.13. _run.log 추가**:
```
<ISO> phase-3-1+hotfix-3+phase-4-x SHIPPED tasks=9(+5 carry-over) migrations=3 review_loops=<n> tsc=ok lint=ok build=ok yagi_smoke=passed manual_verify=passed sha=<final>
<ISO> g-b-8-canvas STATUS=archived superseded_by=g-b-9-phase-4
```

**D.14. memory/HANDOFF.md 갱신** (Phase 5 entry):
- Phase 3.1 + hotfix-3 + Phase 4.x 통합 SHIPPED
- Final main SHA
- Phase 5 candidate scope (PRODUCT-MASTER §5):
  - Artist workspace 도입 (workspaces.kind = 'artist')
  - Roster 1-2 영입 + onboarding flow (Stage 1-4)
  - artist_profile 테이블 + Twin asset 메타데이터 (R2 prefix + 학습 status)
  - 권한 dial UI (Auto-decline 카테고리, 노출 모드, Bypass brands)
  - Talent-Initiated Track Type 4 (Footage Upgrade) 부터 — 진입 장벽 최저
  - Workspace switcher "+ 새 workspace 추가" enable
  - 같은 ProjectBoard 재사용 (Artist 가 의뢰자 입장)
- Carry-over 결정사항: g-b-8-canvas archive

**D.15. memory/LESSONS.md 추가** (L-044 ~ L-048):
- L-044: Codex 토큰 소진 시 Reviewer Fallback (Opus 4.7 self-review + manual double-check + this-chat second-opinion) 표준 protocol
- L-045: Single ff-merge 는 누적된 branch (g-b-9-phase-4) 에서 가능 — phase-3-1 + hotfix-3 + phase-4 의 통합 SHIPPED
- L-046: workspace.kind = 'brand' backfill 의 안전성 — kind 는 ux discriminator, RLS namespace 가 아님
- L-047: Multi-workspace SELECT scope — workspace_members RLS 가 first-line; cookie active_workspace 는 매번 server-side 재검증 필수
- L-048: post-submit detail page 의 1:1 hero card cinematic — workspace 는 lifecycle 작업 surface 의 정체성 표현. 단순 list X.

**D.16. .yagi-autobuild/DECISIONS_CACHE.md 추가** (Q-101 ~ Q-107):
- Q-101: Branch g-b-9-phase-4, base main, cherry-pick hotfix-3 working commits
- Q-102: Wave 4-stage (A foundation / B detail / C secondaries / D verify)
- Q-103: License model = B + sidebar hidden (Phase 6 enable)
- Q-104: Workspace switcher = C (full multi-workspace, cookie resolution, "+ 추가" Phase 5)
- Q-105: K-05 fallback = Opus 4.7 self-review (adversarial) + manual + this-chat second-opinion
- Q-106: Single ff-merge: phase-3-1 + hotfix-3 + phase-4 → main (combined SHIPPED)
- Q-107: Carry-over via cherry-pick (5 commits)
- (carryover from hotfix-3) Q-095..Q-100

**D.17. .yagi-autobuild/design-system/COMPONENT_CONTRACTS.md 갱신**:
- StatusTimeline contract (5 stages, sage current, achromatic others)
- HeroCard 1:1 cinematic contract (720x720, status pill, optional cover)
- ProjectInfoRail contract (5 fields, ink.tertiary tone)
- ProjectDetailTabs contract (4 tabs, disabled UX, no fetch on disabled)
- WorkspaceSwitcher contract (multi-workspace, cookie resolution, group rendering, "+ 추가" disabled state)

**D.18. summary.md** (`C:\Users\yout4\yagi-agent\summary.md`):
- Phase 3.1 + hotfix-3 + Phase 4.x 통합 SHIPPED 요약
- PRODUCT-MASTER v1.0 §5 Phase 4.x 정의 fully ship
- Phase 5 entry-ready 표시

**D.19. ROADMAP.md 갱신**:
- Phase 4.x SHIPPED entry (combined with 3.1 + hotfix-3)
- Phase 5.x scope (PRODUCT-MASTER §5 그대로)
- 기존 Phase 1.X 시리즈는 archived (PRODUCT-MASTER 의 새 phase 정의가 source of truth)

**D.20. ARCHITECTURE.md (append-only)**:
- Phase 4.x 의 7 결정사항 (Q-101..Q-107) append
- Reviewer Fallback protocol (L-044) append

**D.21. Worktree cleanup**:
- g-b-8-canvas archive (PAUSED 상태 유지) — `git branch -D` 하지 않음
- 기타 stale worktree (g-b-1-* ... g-b-7-*) cleanup
- `git worktree list` 후 ≤ 3 worktree 유지

**Acceptance**:
- Browser smoke 14 section 모두 PASS (S11 SKIP 가능)
- ff-merge clean (combined phase-3-1 + hotfix-3 + phase-4)
- main pushed
- 모든 memory artifact 갱신 (HANDOFF, LESSONS, DECISIONS_CACHE, COMPONENT_CONTRACTS, summary, _run.log)
- ROADMAP + ARCHITECTURE 갱신
- Worktree cleanup ≤ 3
- 야기 chat 보고: "Phase 5 entry-ready"

---

## Constraints (do not cross)

LESSONS L-001 ~ L-043 모두 적용. 신규 L-044 ~ L-048 land here.

**핵심 제약**:
- L-001 PowerShell `&&` invalid (`;` 또는 `; if ($?) {}`)
- L-005 git inline `-m`; multi-line commit message 시 `-F .git\COMMIT_MSG.txt` (PowerShell paste 안전)
- L-006 Decision Gate; B-O-E pattern (NOT single-Builder)
- L-007 Supabase project = `jvamvbpxnztynsccvcmr`
- L-008 pnpm install in main worktree after ff-merge — **6th hit**, DO NOT SKIP
- L-009 ASCII repo paths only
- L-010~L-014 design system v0.2.0 (achromatic, no shadow, font-suit, no italic, hairline borders)
- L-018 design-system v0.2.0 + **v1.0 (yagi-design-system)** 둘 다 read at boot — flora.ai editorial dark, sage #71D083 단일 액센트
- L-022 database.types.ts regen this phase
- L-027 BROWSER_REQUIRED gate — NEVER push without yagi smoke PASS
- L-029~L-038 (tldraw, R2, R2 dual creds, AWS SDK middleware, Public Development URL)
- L-039~L-043 (hotfix-3 추가 — wizard step container width, canvas vs structured-attachment dual surface, AttachmentsSection trust boundary, URL scheme validation, lock state cascade)

**Forbidden in Phase 4.x**:
- Phase 5 작업 (Artist workspace, Roster onboarding, artist_profile 테이블, 권한 dial UI, Approval gate)
- Phase 6 작업 (Inbound routing surface, Approval workflow, license fee 정산, 라이선스 active surface)
- Phase 7+ 작업 (Reveal Layers, Brand Tier, T0/T1/T2 검증)
- Phase 8+ 작업 (C2PA, signature, 출처 보증)
- Phase 9+ 작업 (모니터링/탐지 SaaS)
- 기존 status machine 수정 (Q-093 canonical 상태)
- ProfileRole 타입 narrowing (Q-088)
- Korean characters in repo paths
- Phase 3.1 + hotfix-3 의 carry-over commits 재구현 (cherry-pick 으로 그대로 가져옴)
- Workspace switcher 의 "+ 새 workspace 추가" enable (Phase 5)
- License surface 노출 (Phase 6)

---

## Cache references

- Q-088 ~ Q-094 (Phase 1.x 카드 — 그대로 적용)
- Q-095 ~ Q-100 (Phase 3.1 + hotfix-3 — carryover at SHIPPED)
- Q-101 ~ Q-107 (이 phase — append at SHIPPED)
- Q-108 (deferred): project_licenses ON DELETE CASCADE 정책 — Phase 6 검토

---

## Timeline

```
Wave A   parallel    ~15h work + 4h review        Day 1-2
Wave B   sequential  ~10h work + 2h review        Day 2-3
Wave C   parallel    ~14h work + 3h review        Day 3-4
Wave D   sequential  ~8h work + 6h self-review    Day 4-5
                     + manual verify (yagi)
                     + this-chat second-opinion
                     + browser smoke

Total ~ 47h work + 15h review = 62h ~ 5d
SOFT_CAP 6d, HARD_CAP 8d → HALT E_TIMELINE_OVERRUN
```

Yagi smoke + manual verify + this-chat second-opinion 시간은 human-in-loop. Builder timeline 에 포함 안 됨.

---

## Partial-SHIPPED rule

If Builder/Orchestrator runs out of token budget mid-phase:
1. 모든 완료 task 가 `g-b-9-phase-4` 에 commit clean
2. Branch 살려둠
3. `_run.log`: `<ISO> phase-4-x PAUSE last_committed=<sha> next_wave=<letter>`
4. HANDOFF.md 업데이트
5. ALL tasks 완료 + LOOP 2 PASS + 야기 manual verify PASS + 야기 smoke PASS 전엔 ff-merge 절대 X

---

## SHIPPED criteria

ALL of:
- 모든 9 task 완료 + g-b-9-phase-4 commit (carry-over 5 + new 9 = 14 commits 누적, plus phase-3-1 + hotfix-3 의 prior commits)
- Migration `20260501000000` 적용 to prod via `npx supabase db push --linked`
- tsc + lint + build exit 0
- Bundle delta within budget (+30KB gzipped per route)
- database.types.ts regen + commit
- `_self_review_loop_2.md` 의 0 HIGH-A residual
- 야기 manual verify PASS (6 critical changes — D.9 Layer 2)
- Claude this-chat second-opinion 결과 적용 (있다면 — D.10)
- BROWSER_REQUIRED gate (L-027): 야기 smoke 14 section PASS (S11 SKIP 가능)
- ff-merge to main, push to origin
- Q-101..Q-107 appended to DECISIONS_CACHE
- L-044..L-048 appended to LESSONS
- HANDOFF.md ready for Phase 5 entry
- COMPONENT_CONTRACTS.md updated
- summary.md written
- ROADMAP + ARCHITECTURE 갱신
- Worktree cleanup (g-b-8-canvas archive 유지, 기타 stale 제거 ≤ 3)

ff-merge + push (ONLY after 야기 smoke confirms in chat with literal `yagi smoke PASS`):
```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
git checkout main
git pull origin main --ff-only
git merge g-b-9-phase-4 --ff-only
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm build
git push origin main
```

---

## Open sub-decisions (lock down before Wave starts)

KICKOFF write 후 야기 review 시 한 번에 confirm:

### §1. task_03 — Twin intent UI 형태
- 옵션 A: 3-radio (`specific_in_mind` / `undecided` / `no_twin`) — **권장**
- 옵션 B: single toggle (체크 = `no_twin`, 미체크 = `undecided`, 자유텍스트로 specific 명시)

### §2. task_06 — Active workspace resolve 방식
- 옵션 A: URL prefix `/app/w/[workspaceId]/*` — bookmarkable, 큰 layout 변경
- 옵션 B: cookie-based — 기존 routes 그대로, less bookmarkable — **권장 (Phase 4 layout 변경 최소화)**

### §3. task_06 — "+ 새 workspace 추가" 동작
- 옵션 A: Phase 4 active (Brand workspace 추가 가능)
- 옵션 B: Disabled placeholder ("Phase 5 부터 가능") — **권장 (Artist onboarding 과 함께 Phase 5)**

### §4. task_05 — /app dashboard 처리
- 옵션 A: /app/projects empty state 가 기본 (대시보드 별도 X)
- 옵션 B: /app/dashboard 별도 페이지 (Phase 4 에서 단순 — 프로젝트 카운트 + 최근 RFP)
- **권장 = A** (Phase 4 단순 유지; dashboard 는 Phase 7+ Reveal Layer 와 함께)

야기가 §1-§4 답하면 KICKOFF 의 task spec 이 최종 고정. Wave A start.

---

## Changelog

- **v1.0 (2026-05-01)** — 최초 작성. PRODUCT-MASTER v1.0 §5 Phase 4.x + hotfix-3 잔재 분석 + 야기 결정 7개 (Q-101~Q-107) 통합. Codex 부재 시 Reviewer Fallback protocol 명시. Single ff-merge 전략 확정.
- **2026-05-01 Wave A BLOCKER 1 fix** — `project_licenses_select_owner` 정책 SQL 의 `projects.owner_id` → `projects.created_by` 정정. 실제 ownership 컬럼 이름 일치. 야기 chat lock 결정 4.2 = B (옵션 A: 컬럼 추가 — 거절). Wave B detail page authorization 도 created_by 기준 일관 유지.

---

*이 KICKOFF 가 변경되면 task_plan.md / Wave prompts / browser smoke checklist 모두 영향받는다. 변경 시 changelog 에 기록.*
