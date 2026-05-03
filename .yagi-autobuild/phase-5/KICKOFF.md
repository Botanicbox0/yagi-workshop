# Phase 5 KICKOFF — Briefing Canvas (briefing-as-conversation paradigm)

**Branch (NEW):** `g-b-10-phase-5`
**Base:** `main` (after Phase 4.x ff-merge)
**Carry-over:** N/A (Phase 4.x ff-merged before Phase 5 entry — no cherry-pick needed)
**Target:** 3주 sprint (15 working days)
**SOFT_CAP:** 18 days
**HARD_CAP:** 21 days
**K-05:** Codex 5.5 (`gpt-5.5`, **ChatGPT subscription auth** as of 2026-05-04, default reasoning=medium, high override for Tier 1). No per-token cost; **5h message quota** is the only constraint. Mandatory for: schema migration, RLS, data migrate, security-critical
**Mode:** B-O-E (Builder-Orchestrator-Executor)
**Single ff-merge target:** Phase 5 → main

---

## Origin

Phase 4.x Wave C.5b 후 야기 visual review (3 image 분석) → 4 가지 구조적 자각:

1. wizard 가 너무 *플랫* (3-column section grouping 부재)
2. 기획서 vs 레퍼런스 *의도 다른 자료* 가 한 surface 에 뒤섞임
3. 레퍼런스 에 *왜 참고하는지* 메모 surface 부재
4. 제출 후 detail page = *고객사 입장 admin 도구 같음* — "이게 뭐임?" 의 빈 첫 인상

야기 verbatim (chat 2026-05-02):
> "Brief는 form 이 아니라 협업 surface다."
> "고객사 입장에서 뭐지 싶을 것 같음"
> "라우팅이 뭐지? — 사용자는 모름"

→ Phase 5 paradigm shift = wizard form-only → **Briefing Canvas (3-stage briefing-as-conversation)**.

PRODUCT-MASTER v1.1 §C 정의:
> "의뢰자의 needs 가 입구. Twin 은 답 중 하나."

PRODUCT-MASTER v1.1 §D 정의 (Phase 5/6 swap):
> Phase 5 = Briefing Canvas (의뢰자 협업 surface)
> Phase 6 = Artist Roster + Inbound Track (Phase 5 v1.0 → Phase 6 으로 이동)

→ 4 lanes of work mapped:
1. **DB foundation** — `briefing_documents` 신규 테이블 + migrate 기존 `attached_pdfs/urls` jsonb data + `interested_in_twin` boolean column + status display i18n cleanup
2. **Briefing Canvas (의뢰 surface)** — Stage 1 intent form (3-col grid) + Stage 2 asset workspace (기획서/레퍼런스 분리) + Stage 3 review
3. **Detail page redesign (의뢰자 first view)** — "현황" tab default + status timeline + status-별 next action CTA
4. **Whiteboard 통합** — Stage 2 expandable section (optional, 90% 사용 X)

---

## Goal (one sentence)

Replace the form-only wizard paradigm with a 3-stage Briefing Canvas (Stage 1 intent form / Stage 2 asset workspace with brief vs reference separation + URL thumbnail + reference categorization / Stage 3 review-and-submit) backed by a new `briefing_documents` table (with data migration from existing `attached_pdfs/urls` jsonb columns) and a redesigned post-submit detail page where "현황" is the default tab showing a sage-friendly status timeline with status-specific next-action CTAs that turn the project into a living collaboration surface, integrating the existing tldraw whiteboard as an optional Stage 2 expandable section, adding Twin intent as a B+C hybrid (Stage 1 deliverable-type option + Stage 2 single boolean toggle `interested_in_twin`), cleaning up status copy across all surfaces (DB enum unchanged, i18n display labels only), and ff-merging the new branch `g-b-10-phase-5` to main as a single SHIPPED entry.

---

## Confirmed yagi decisions (chat lock 2026-05-02)

| Q | Choice | Implication |
|---|---|---|
| Q-501 | Stage 개수 = **B (3-stage)** intent → assets → review | Review step 으로 의뢰자 안심 + 야기 팀 입장 *완성도 높은 brief* |
| Q-502 | Stage form 분리 = **B** intent only Stage 1, budget/timeline 은 Stage 2 sidebar | budget/timeline 부담 줄임 |
| Q-503 | Schema = **A** 신규 `briefing_documents` 테이블 + migrate 기존 jsonb data | 깨끗, paradigm shift = schema 도 깨끗 |
| Q-504 | Whiteboard = **C** Stage 2 expandable ("더 추가할 게 있나요?") | 90% 안 씀, expand 시 강력 도구 |
| Q-505 | Detail page = **A** "현황" tab 신규 default | 의뢰자 first view = 의뢰자 시점 |
| Q-506 | Status copy = 사용자 친화 워딩 (DB enum 그대로, display 만) | i18n only, schema 변경 0 |
| Q-507 | Timeline = **B (3주 sprint)** | Phase 4.x lesson 반영 정직 estimate |
| Q-508 | Twin = **B+C 하이브리드** (Stage 1 결과물 옵션 + Stage 2 boolean toggle) | 의뢰자 결정 부담 0, 야기 팀 큐레이션이 답 |
| Q-509 | Phase 5/6 swap | Phase 5 = Briefing Canvas, Phase 6 = Artist Roster + Inbound |

---

## Pre-phase prerequisites

Builder ENTRY 시 verify. 실패 시 HALT + yagi 보고.

1. ✅ Phase 4.x g-b-9-phase-4 ff-merged to `main` (single combined SHIPPED entry)
2. ✅ Wave C.5d SHIPPED (PKCE template + active workspace + P1/P2 finding fixes)
3. ✅ `main` latest pull (`git pull origin main --ff-only`)
4. ✅ `g-b-10-phase-5` branch 생성 (main 기준)
5. ✅ Codex CLI 활성 (**ChatGPT subscription auth**) + `~/.codex/config.toml` model=gpt-5.5, default reasoning=medium
6. ✅ PRODUCT-MASTER v1.1 read (`.yagi-autobuild/PRODUCT-MASTER.md` §C/§D)
7. ✅ yagi-design-system v1.0 read (`C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`)
8. ✅ R2 bucket setup 그대로 (Phase 3.1 prerequisite — `CLOUDFLARE_R2_PUBLIC_BASE` in `.env.local`)
9. ✅ `getBoardAssetPutUrlAction` 서버액션 그대로 (Phase 3.1)
10. ✅ Resend email setup 그대로 (Phase 3.0+)

If 1-4 fail: HALT, yagi confirm 후 진행.

---

## Codex 5.5 K-05 protocol (revised after Phase 4.x cost lessons + Codex auth migration)

Phase 4.x 에서 누적 ~$25 spent on K-05 via API key billing (24h). 주된 원인 분석:
- **Token bloat 가 80% 비용** (reasoning effort 보다 훨씬 큼)
- sub_03f_3 LOOP 1 = 628k tokens = $6 (전체 diff 보냄)
- Codex 가 *동일 결함 클래스 의 모든 사용처* 못 찾음 (LOOP 추가 발생)

**2026-05-04 변경 — Codex CLI auth migration to ChatGPT subscription**:
- API key 비활성. `codex login` 으로 ChatGPT 구독 인증 사용.
- **Per-token cost = 0** (subscription 정액).
- 새 제약: **5h message quota** (Plus tier 기준 ~30-150 lightweight / ~5-25 heavy session).
- Token bloat 영향: 비용 X, *quota 소진 속도* + reasoning quality 만 영향.
- Context minimization rules 그대로 유지 — quota 효율 + reasoning quality 두 이유 모두.

→ Phase 5 protocol = **context minimization 우선** + **3-Tier reasoning** + **LOOP 절감** + **scale-aware security**.

### Token 절감 우선순위 (효과 순)

| 순위 | 전략 | quota 효율 | reasoning quality |
|---|---|---|---|
| 1 | **Context 줄이기** — 필요 file 만, diff 만 | **50-90%** ⭐⭐⭐ | ↑ (작은 context 일수록 깊은 분석) |
| 2 | **Prompt 압축** — 명확 spec, fluff X | 15-20% | ↑ |
| 3 | **Wave 작게 나누기** — 4-12 sub_task per wave | 30% | — |
| 4 | **Reasoning effort tier system** — high/medium/low 매핑 | 40-50% | tier 1 만 high, 나머지 절약 |
| 5 | **LOOP 절감** — single-line miss = inline fix only | 20-30% | — |
| 6 | **Builder grep audit pre-step** — Codex miss 보완 | LOOP 감소 | ↑ (cascade audit 보완) |

### 3-Tier reasoning system

config.toml default = `medium`. high override 는 Tier 1 만:

| Tier | Reasoning | Quota cost | Use case |
|---|---|---|---|
| **Tier 1 — Deep** | `--reasoning-effort high` | ~100% baseline | prod RLS / SECURITY DEFINER / auth flow / cross-tenant / new schema migration |
| **Tier 2 — Standard (default)** | (omit, uses config medium) | ~50% | 표준 review, cascade audit, MED-tier fix, 신규 server action |
| **Tier 3 — Verify** | `--reasoning-effort low` | ~25% | single-line verify, syntax check, LOOP 2+ confirm |

### Context minimization rules (CRITICAL)

#### Rule 1: 필요 file 만 review (모든 git diff X)

**Before** (Phase 4.x sub_03f_3, 628k tokens, $6 — sunk cost lesson):
```bash
codex review $(git diff main..HEAD --name-only | tr '\n' ' ')
```

**After** (~30-50k tokens, quota 부담 미미):
```bash
codex review src/lib/workspace/active.ts \
  src/app/[locale]/app/projects/new/actions.ts \
  src/app/[locale]/app/projects/page.tsx
```

→ Builder 가 *진짜 review 영향 file* 만 식별 후 명시. **File count budget < 20 file** 권장 (Phase 4.x Wave D LOOP 1 이 699k tokens 였던 lesson — file count 가 20 초과하면 budget 초과 신호로 abort + 분할).

#### Rule 2: Diff 만 보내기 (file 전체 X)

```bash
# Builder 가 git diff 로 변경 hunk 만 추출
git diff main..HEAD -- <files> > /tmp/diff.txt
codex exec --reasoning-effort medium <<PROMPT
Review the following diff for security issues:
$(cat /tmp/diff.txt)
PROMPT
```

→ file 전체 read 대비 50% quota 절감.

#### Rule 3: Prompt 압축

**Before** (verbose):
```
You are an adversarial security reviewer. Please carefully analyze the following code changes for any security issues, including but not limited to RLS bypass...
```

**After** (compressed):
```
Review for: RLS bypass, cross-tenant leak, auth flow.
Output: [FINDING N] CLASS: file:line — issue
```

→ ~15-20% quota 절감.

#### Rule 4: Wave 크기

- Wave 1개 = 4-12 sub_task. K-05 final review 1번 만.
- 작은 issue 가 발견되면 *동일 Wave 안 sub_task 추가* (별 Wave 신설 X)
- Wave C.5b → c → d 같은 nested wave 는 *예외*. 보통 Wave A/B/C/D 로 끝.

### LOOP cycle 절감

- HIGH-A/B = LOOP 2 진행 (standard, default reasoning)
- MED-B/C = inline fix + LOOP 2 *생략* (Builder verdict trust)
- MED-A 이하 = FU 등록, LOOP 종료
- LOOP 3 후 HIGH-A residual = HALT + 야기 보고
- protocol exception (LOOP 4+) 은 *예외 1회 만* (`_run.log` 에 명시 기록)
- Single-line miss 같은 단순 verify = LOOP 4+ X. inline fix + Builder verify only

### Builder grep audit pre-step (NEW after Phase 4.x lesson)

Phase 4.x 의 lesson — Codex 가 *동일 결함 클래스 의 모든 사용처* 못 찾음:
- Wave C.5d sub_03 LOOP 1 = 1 surface catch, Builder grep 5 surface 추가 발견
- Wave C.5d sub_03e LOOP 1 = 2 surface 추가 발견 (RLS-only scope, 배열 [0] direct access)

→ K-05 protocol 갱신:
1. Codex review 전 Builder 가 *동일 결함 클래스의 grep pattern* 식별
2. 같은 클래스의 *모든 사용처* audit + Codex review file list 에 추가
3. Codex 의 verdict + Builder cascade audit = 함께 ff-merge gate

Builder grep pattern 후보 (Phase 4.x 의 lesson):
- `workspace_members ORDER created_at ASC LIMIT 1` (first-membership fallback)
- `.from("X").select(...)` 체인에 `.eq("workspace_id", ...)` 부재 (RLS-only scope)
- `workspaces[0]` / `memberships[0]` 배열 [0] direct access (resolver 외)
- `REVOKE UPDATE (cols)` 만 사용 (table-level UPDATE block 누락)
- SECURITY DEFINER RPC 가 caller-supplied array 그대로 upsert (column REVOKE 우회)

### Trigger pattern

```bash
# Tier 1 (HIGH-A/B critical, schema/RLS/auth)
codex review src/lib/specific.ts src/auth/route.ts \
  --reasoning-effort high \
  --output _phase_5_<task>_codex_loop1.md

# Tier 2 (standard, default — config medium 사용)
codex review src/lib/specific.ts \
  --output _phase_5_<task>_codex_loop1.md

# Tier 3 (verify only)
codex exec --reasoning-effort low <<PROMPT > _phase_5_<task>_verify.md
Verify: <single line check>
Output: APPROVE or MISSING (with reason).
PROMPT
```

### 권한 (Phase 4.x 결정 그대로)

- ✅ Read unlimited (모든 file, git history, supabase introspection)
- ✅ Test 실행 (`pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`)
- ✅ Migration verify (dry-run 또는 `--debug`)
- ✅ Git read-only (log, diff, branch, blame)

### Boundary 유지

- ❌ Migration apply to prod 실제 실행 → 야기 + Builder confirm 필수
- ❌ ff-merge to main → L-027 BROWSER_REQUIRED gate
- ❌ git push origin main → 야기 직접만
- ❌ `.env.local` / service_role key 노출 → 0
- ❌ DELETE 또는 destructive SQL 자동 실행 X

### K-05 mandatory tasks (Phase 5)

Tier 1 (high reasoning):
1. **Wave A task_01** — `briefing_documents` schema + RLS (cross-tenant leak risk)
2. **Wave A task_02** — Data migration `attached_pdfs/urls` jsonb → `briefing_documents` (data integrity critical)
3. **Wave B task_05** — Stage 2 Asset workspace 의 server actions (R2 prefix, oembed SSRF)
4. **Wave D task_10 final review** — full Phase 5 diff Tier 1

Tier 2 (medium, default):
5. **Wave A task_03** — `interested_in_twin` column + zod sync (defense-in-depth)
6. **Wave C task_09** — Detail page "현황" tab의 server-side data resolver (RLS scope verify)

Tier 3 (low):
- Wave A 끝 verify pass
- Wave B/C 끝 verify pass

### K-05 skip OK

- i18n only (status copy cleanup)
- UI styling 만 (Stage 1 grid layout, design tokens)
- Test 추가 (test file 만)

### Scale-aware security trade-off (NEW v1.2 — yagi locked 2026-05-04)

**원칙**: User pool 규모 + trust state 따라 *MED finding 처리 default* 분기. *HIGH-A/B 는 항상 inline fix*.

| User pool | Trust state | MED-B/C 처리 default |
|---|---|---|
| **< 100, all-trusted** (현재) | yagi internal + invited collaborator only | **FU 등록 + Phase entry batch sweep** |
| **< 100, mixed** (Phase 5 외부 client onboarding 시작) | trusted + 외부 client | inline fix (case by case) |
| **>= 100 OR public-facing surface** (Phase 6+) | unknown attacker model | inline fix default |

**현재 Phase 5 entry 시점 = `< 100, all-trusted`**. 즉 MED-B/C 발견 시:
- **Default = FU 등록**, inline fix 강제 X
- **Inline fix 강제 조건** (3가지 중 1개 이상 해당 시):
  1. user-supplied input 직접 처리 (예: client-controlled query parameter, JSON body)
  2. 외부 client onboarding < 30일 임박 (commission intake 개시 임박)
  3. 동일 결함 패턴이 3번째 반복 (구조적 weak spot)
- **Phase entry batch sweep**: Phase 5 ff-merge 직전 또는 외부 client 확장 milestone 시점에, 누적 FU 의 MED finding 들을 single migration 으로 batch fix. 변경 file 한정 review (Tier 1 high) 1회.

**Rationale (yagi 결정)**:
- 현재 user 4명, all trusted. MED-B/C 의 *현재* exploit risk = 거의 0.
- Wave-level inline build-up 은 작은 cost (110 lines / 30분) 처럼 보이지만 *야기 의사결정 부담* 누적이 문제.
- Phase 5 = 외부 client onboarding 임박. 그 시점에 batch sweep 으로 한 번에 처리하는 게 *cognitive load 분산* + *동일 패턴 catch 효율*.
- HIGH-A/B 는 변함 없이 즉시 fix — actual exploit possible.

**Codex K-05 review 시 Builder 응답 변경**:
- 기존: "Wave D revised triage spec — MED-B/C inline fix only"
- 변경: "MED-B/C → 1차 검토 = scale-aware rule 적용. 3 inline-fix 강제 조건 hit 여부 chat 보고. 모두 miss = FU 등록 default."

### Codex 부재 fallback

| 상황 | Fallback |
|---|---|
| ChatGPT subscription quota 도달 (5h window) | Opus 4.7 self-review (memory: adversarial framing). LOOP 2 까지만. quota reset 대기 후 Codex 재시도. |
| ChatGPT 서비스 downtime | 동일하게 Opus self-review fallback. |
| `codex login` session 만료 | 즉시 재로그인 (`codex login`) 후 진행. |
| gpt-5.5 access 제한 (plan 기반) | Codex 가 fallback 모델로 자동 전환 — verify 후 *Tier 1 high task* 는 Opus self-review 로 backup. |

### Phase 5 K-05 message budget (quota-based, no $ cost)

ChatGPT subscription auth 이후 *per-token cost 0*. 추적은 *5h message quota 소진 속도* 만.

**Phase 5 K-05 호출 추정** (3주 sprint 분산):

| Wave | 호출 수 | Quota 부담 |
|---|---|---|
| Wave A (task_01/02 Tier 1, task_03 Tier 2, verify Tier 3) | 3-5 messages | 1 day window 내 처리 가능 |
| Wave B (task_05 Tier 1, verify Tier 3) | 1-2 messages | 1 window 내 |
| Wave C (task_09 Tier 2, verify Tier 3) | 1-2 messages | 1 window 내 |
| Wave D (task_10 final Tier 1, possible LOOP 2) | 1-3 messages | **heavy session — context minimization 필수** |
| **Total expected** | **6-12 messages** / 15 working days | quota 충분 (Plus 기준) |

**Quota over flow risk**:
- Wave D task_10 의 *full Phase 5 diff* review 가 가장 heavy. file count > 20 초과 시 *분할 review* 강제.
- 단일 5h window 내 Tier 1 high session 3+ 회 연속 시 quota 압박 가능. Wave 간 8h+ 간격 권장.

**Lesson**: Token-cost 시대의 *$ 절감* 은 무의미해졌지만 *context minimization 의 reasoning quality 효과* 가 새 best-practice 동기. 작은 context = 깊은 분석 = LOOP 횟수 감소.

---

## Task list (for task_plan.md)

Wave A (parallel, 3 teammates) → B (sequential 또는 parallel 2) → C (sequential, 1 lead) → D (sequential, ff-merge gate).

ALL teammates run **Sonnet 4.6** unless explicitly Haiku-OK noted.

---

### Wave A — Foundation (parallel, 3 teammates) — Day 1-3 (3 days)

#### task_01: A — `briefing_documents` schema + RLS
**[complexity: complex, model: Sonnet 4.6, parallel_group: A, K-05 mandatory Tier 1]**

Migration: `supabase/migrations/<ts>_phase_5_briefing_documents.sql`

```sql
-- briefing_documents — Phase 5 신규 테이블
-- 분리: 기획서 (의뢰자가 직접 만든 자료) vs 레퍼런스 (외부 참고 자료)
CREATE TABLE briefing_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  -- 분류: 기획서 vs 레퍼런스
  kind text NOT NULL CHECK (kind IN ('brief', 'reference')),
  -- 자료 source
  source_type text NOT NULL CHECK (source_type IN ('upload', 'url')),
  -- upload (PDF, image 등)
  storage_key text,
  filename text,
  size_bytes bigint,
  mime_type text,
  -- url (영상/사이트 레퍼런스)
  url text,
  provider text,  -- 'youtube' / 'vimeo' / 'instagram' / 'generic'
  thumbnail_url text,
  oembed_html text,
  -- 의뢰자 메모 + 분류 (reference 만 의미)
  note text,
  category text CHECK (category IS NULL OR category IN ('mood', 'composition', 'pacing', 'general')),
  -- meta
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES profiles(id),
  -- source_type 별 required field 강제
  CONSTRAINT briefing_documents_source_check CHECK (
    (source_type = 'upload' AND storage_key IS NOT NULL AND filename IS NOT NULL) OR
    (source_type = 'url' AND url IS NOT NULL)
  )
);

CREATE INDEX idx_briefing_documents_project_kind ON briefing_documents(project_id, kind);
CREATE INDEX idx_briefing_documents_created ON briefing_documents(created_at DESC);

-- RLS — project 의 workspace member 만 access
ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;

-- SELECT: workspace member 또는 yagi_admin
CREATE POLICY "briefing_documents_select" ON briefing_documents
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE wm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- INSERT: project 의 created_by 본인 또는 workspace_admin (yagi_admin 도)
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.created_by = auth.uid()
        OR p.workspace_id IN (
          SELECT workspace_id FROM workspace_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- UPDATE: 같은 워크스페이스 admin/owner 또는 본인이 INSERT 한 row + 24h 이내
-- (의뢰자가 무한정 자료 수정 못 하게 — Brief 가 lock 되면 도구도 lock)
CREATE POLICY "briefing_documents_update" ON briefing_documents
  FOR UPDATE TO authenticated
  USING (
    (created_by = auth.uid() AND created_at > now() - interval '24 hours')
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- DELETE: created_by 본인 (project 가 in_review 또는 그 이후면 deny)
CREATE POLICY "briefing_documents_delete" ON briefing_documents
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    AND project_id IN (
      SELECT id FROM projects WHERE status IN ('draft')
    )
  );
```

**Codex K-05 LOOP focus** (Tier 1, high reasoning):
1. Cross-tenant leak via project_id 추측 — RLS scope 정확?
2. INSERT policy 의 workspace_admin 체크 — `workspace_members.role` enum 정확?
3. UPDATE 24h window — race condition? (created_at 가 trigger 로 변경 X 인지)
4. DELETE policy — status='draft' 외 조건 (in_review 이후 삭제 deny) 정확?
5. `kind` + `source_type` 조합 invalid case (kind='brief' + category='mood' 같은) — DB 에서 강제? 또는 server-side?
6. `category` CHECK 가 reference 만 의미한다면 — kind='brief' 일 때 category NULL 강제?

#### task_02: A — Data migration `attached_pdfs/urls` jsonb → `briefing_documents`
**[complexity: complex, model: Sonnet 4.6, parallel_group: A, K-05 mandatory Tier 1]**

Migration: `supabase/migrations/<ts>_phase_5_migrate_attached_to_briefing_documents.sql`

```sql
-- 기존 attached_pdfs jsonb 의 모든 element → briefing_documents row
-- (kind='reference' default — 기존엔 기획서/레퍼런스 분리 안 됐으므로 reference 로 분류)
INSERT INTO briefing_documents (
  project_id, kind, source_type, storage_key, filename, size_bytes, mime_type, created_at, created_by
)
SELECT
  p.id,
  'reference',
  'upload',
  (item->>'storage_key'),
  (item->>'filename'),
  (item->>'size_bytes')::bigint,
  COALESCE(item->>'mime_type', 'application/pdf'),
  COALESCE((item->>'uploaded_at')::timestamptz, p.created_at),
  COALESCE((item->>'uploaded_by')::uuid, p.created_by)
FROM projects p,
  jsonb_array_elements(p.attached_pdfs) AS item
WHERE p.attached_pdfs IS NOT NULL
  AND jsonb_array_length(p.attached_pdfs) > 0;

-- 동일하게 attached_urls jsonb 도 migrate
INSERT INTO briefing_documents (
  project_id, kind, source_type, url, provider, thumbnail_url, note, created_at, created_by
)
SELECT
  p.id,
  'reference',
  'url',
  (item->>'url'),
  COALESCE(item->>'provider', 'generic'),
  (item->>'thumbnail_url'),
  (item->>'note'),
  COALESCE((item->>'added_at')::timestamptz, p.created_at),
  COALESCE((item->>'added_by')::uuid, p.created_by)
FROM projects p,
  jsonb_array_elements(p.attached_urls) AS item
WHERE p.attached_urls IS NOT NULL
  AND jsonb_array_length(p.attached_urls) > 0;

-- VERIFY: count match
-- (Builder 가 migration 후 SELECT 로 직접 확인)
```

**중요**: 기존 `attached_pdfs/urls` jsonb columns 는 **이번 phase 에서 폐기 X** — Wave D 에서 ff-merge 후 confirm 받고 별도 cleanup migration. Phase 5 이내 = *추가만, 삭제 X*.

**Codex K-05 LOOP focus** (Tier 1, high reasoning):
1. JSONB element parsing 의 NULL safety (storage_key NULL 인 row?)
2. `created_by` fallback 의 user_id 가 실제 profiles 에 존재? (FK 위반 risk)
3. Migration 의 idempotency (re-run 시 duplicate INSERT 방지) — *현재 migration 은 idempotent X*. Builder 가 transaction 안에서 1회만 실행 보장.
4. 기존 jsonb data 의 schema variance (예전 Phase 3.0 의 schema vs Phase 3.1 hotfix-3 schema) — 모든 schema 처리?
5. Migration 실행 시점 — prod 적용은 Builder 가 `npx supabase db push --linked` 가 아니라 *야기 confirm* 받아야 (data loss risk)

**적용 sequence**:
1. Migration file 작성
2. Codex K-05 LOOP review
3. Builder 가 야기에게 chat 보고 + GO 받음
4. Supabase MCP `apply_migration` 으로 적용 (또는 `npx supabase db push --linked`)
5. Verify SELECT count 일치 (`SELECT count(*) FROM briefing_documents WHERE kind='reference'` vs 기존 jsonb element 합계)

#### task_03: A — `interested_in_twin` column + zod schema sync + status copy i18n + onboarding/brand polish
**[complexity: medium, model: Sonnet 4.6, parallel_group: A, K-05 Tier 2 for column, skip for i18n + onboarding]**

##### Sub task 3a: `interested_in_twin` column

Migration: `supabase/migrations/<ts>_phase_5_interested_in_twin.sql`

```sql
ALTER TABLE projects
  ADD COLUMN interested_in_twin boolean NOT NULL DEFAULT false;

-- twin_intent enum 그대로 유지 (legacy data 보존, deprecated 표시)
-- 새 의뢰는 interested_in_twin 만 사용
COMMENT ON COLUMN projects.twin_intent IS 'DEPRECATED Phase 5 — use interested_in_twin instead. Kept for legacy data preservation.';
```

zod schema 갱신 (`src/app/[locale]/app/projects/new/actions.ts`):
- 기존 `twin_intent: z.enum([...]).default("undecided")` → 그대로 유지 (legacy data 호환)
- 신규 추가: `interested_in_twin: z.boolean().default(false)`
- INSERT 시 둘 다 set (twin_intent='no_twin' default 강제 + interested_in_twin = client value)

**Codex K-05 LOOP focus** (Tier 2, medium reasoning):
1. `interested_in_twin` boolean default false — 기존 row backfill 자동 (DEFAULT false)
2. zod schema 의 두 field coexistence — server-side 에서 mapping 명확?
3. RLS impact 0 (boolean column 추가 만)

##### Sub task 3b: Status copy i18n cleanup (KO + EN)

ko.json `projects.status.*` 갱신 (DB enum 그대로, display 만):

```json
"status": {
  "draft": "작성 중",
  "in_review": "검토 중",
  "routing": "디렉터 매칭",
  "in_progress": "작업 진행",
  "approval_pending": "시안 확인",
  "delivered": "최종 납품"
}
```

en.json `projects.status.*` 동일 구조:

```json
"status": {
  "draft": "Drafting",
  "in_review": "In review",
  "routing": "Matching director",
  "in_progress": "In production",
  "approval_pending": "Reviewing draft",
  "delivered": "Delivered"
}
```

**Audit**: 기존 status display 사용처 모두 grep — `t("projects.status.routing")` 같은 호출 위치 식별. 영향 page:
- `/app/projects` (list)
- `/app/projects/[id]` (detail header)
- `/app/admin/projects` (admin queue)
- email templates (Resend templates 의 status 표시 — 별도 file)
- notification emit (in-app notification text)

K-05 SKIP (i18n only).

##### Sub task 3c: Onboarding /brand polish + Twin-only carve-out (FU-C5d-11)

Trigger: yagi visual review 2026-05-04 (`/ko/onboarding/brand` smoke). 두 이슈:
1. brand logo 자리에 placeholder 부재 → graceful empty state 추가 ("브랜드 로고는 나중에 추가할 수 있어요" sage subtle)
2. Twin-only user 시나리오 mismatch — "건너뛰기" CTA 가 *required-feeling*

**선택지** (둘 중 하나, yagi 결정):
- **Option A** (small): 기존 step 유지 + helper copy 추가 ("Twin 활용이 주 목적이라면 이 단계를 건너뛰고 바로 시작할 수 있어요") + brand logo placeholder
- **Option B** (preferred, paired with FU-C5b-08): 새 `/onboarding/intent` step 추가 (의뢰 / Twin / 둘 다 3-card) → 그에 맞는 onboarding 분기. Workspace bootstrap 에 default brand 자동 생성

**Recommended**: Option A 즉시 적용 (Wave A scope creep 최소). Option B 는 FU-C5b-08 와 함께 별도 hotfix 또는 Phase 5 ff-merge 후.

Files (Option A 기준):
- `src/app/[locale]/onboarding/brand/page.tsx` (placeholder + helper copy)
- `messages/ko.json` + `en.json` — `onboarding.brand.helper.twin` 키 추가

K-05 SKIP (UI + i18n only, 기존 RLS 무영향).

#### Wave A acceptance

- 3 migration 모두 prod 적용 + verify
- Codex K-05 mandatory tasks 모두 LOOP 0 HIGH-A residual
- Status display i18n 적용 후 모든 surface 에서 새 워딩 표시
- Onboarding /brand 의 placeholder + Twin helper copy 적용
- tsc=0 / lint=baseline / build=0

---

### Wave B — Briefing Canvas (sequential, 1 lead Builder) — Day 4-10 (7 days)

Wave B 는 *sequential* — Stage 1 → Stage 2 → Stage 3 순서로 진행. lead Builder 가 직접 작업 (no spawn). Stage 별 yagi visual review 가 sub-gate.

#### task_04: B — Stage 1 — Intent form (3-col grid, 인물 옵션 통합)
**[complexity: complex, model: Sonnet 4.6, sequential, K-05 skip]**

##### IA

Wizard step 자체가 *3-stage* 로 변경됨. 기존 Step 1/2/3 폐기 → Briefing Canvas 의 Stage 1/2/3 으로 재구성.

Stage 1 = *intent form*. 의뢰자가 *"내가 무엇을 원하는지"* 명확화. Image 1 영감 = 3-column grid layout (desktop), 1-column (mobile).

##### Section 분리 (3-col grid)

**Column 1 (좌)**:
- 어떤 콘텐츠를 만들고 싶은가요? (deliverable_types — multi-select)
  - 광고 영상 (~15초)
  - 광고 영상 (~30초)
  - 광고 영상 (30초 이상)
  - 이미지 (룩북, 제품샷)
  - **AI 인물 활용 콘텐츠** ⬅ NEW (Twin 통합 B+C 하이브리드 의 C)
  - 모션 그래픽
  - 일러스트
  - VFX
  - 브랜딩
  - 기타: (free text)
- 콘텐츠의 목적은? (purpose — multi-select)
  - SNS 광고
  - 브랜딩 / 이미지 구축
  - SNS 채널 운영용
  - 이벤트 홍보
  - 오프라인 활용 (매장, 옥외 등)
  - 기타: (free text)
- 콘텐츠 활용 예정 채널 (channels — multi-select)
  - 인스타그램 / 유튜브 / 틱톡 / 페이스북 / 자사 웹사이트 / 오프라인 / 기타

**Column 2 (중앙)**:
- 콘텐츠를 간단히 설명해주세요 (description — textarea, 200~500자 권장)
  - placeholder: "예: 봄 시즌 캠페인 영상, 제품 소개용 SNS 콘텐츠..."
- 시각화 비율 (visual_ratio — single-select chip)
  - 1:1 / 16:9 / 9:16 / 4:5 / 2.39:1 / 직접 입력
- 주요 타겟 오디언스 (target_audience — textarea, 1-2 lines)
  - placeholder: "예: 20-30대 여성, 뷰티에 관심 있는 인스타그램 유저"

**Column 3 (우)**:
- 영상 기획이 있으신가요? (has_plan — single-select)
  - 기획 있음 (기획안 보유)
  - 기획 제안을 희망 (기획부터 함께)
  - 미정 / 미팅 후 결정
- 원하는 분위기 / 레퍼런스 키워드 (mood_keywords — multi-select chip + 자유 입력)
  - 감성적 / 세련된 / 유머러스 / 역동적 / 미니멀 / 따뜻한 / 고급스러운 / 트렌디한 / 친근한
  - + 직접 입력 (예: 무채색 톤, 자연광 느낌...)
- 추가 요청사항 (additional_notes — textarea, optional)
  - helper text: "레퍼런스 이미지, 링크 및 pdf 업로드는 다음 단계에서 가능합니다"

##### Bottom CTA

- "← 이전으로" (Stage 0 = 프로젝트 이름 + 한 줄 설명, *기존 Step 0 그대로* 유지)
- "임시 저장" (draft 상태 유지)
- "저장 후 다음 단계 →" (Stage 2 진입)

##### 디자인

yagi-design-system v1.0 기반:
- 3-col grid: `grid-cols-1 md:grid-cols-3 gap-6` (desktop 1024+ 부터 3-col)
- Section card: 흰 배경, border `border-subtle`, radius 24, padding 24
- Section header: `text-base font-semibold` (Pretendard) + helper text `text-sm text-ink-secondary`
- Multi-select chip: rounded-full, sage 선택 시 fill, ink-primary text
- Sticky bottom CTA bar: `fixed bottom-0` 또는 `sticky bottom-0`

##### Files

- `src/app/[locale]/app/projects/new/briefing-canvas-stage-1.tsx` (NEW)
- `src/app/[locale]/app/projects/new/page.tsx` (Stage routing 갱신)
- `messages/ko.json` + `en.json` — `projects.briefing.stage1.*` 신규 keys

##### Acceptance

- /ko/app/projects/new (또는 /briefing/[id]) 진입 시 Stage 1 = 3-col grid layout
- 모든 입력 가능 + zod validation + 임시저장 + 다음 단계 진입
- Mobile (375px) 1-col 정상 fallback
- /en parity

#### task_05: B — Stage 2 — Asset workspace (기획서 vs 레퍼런스 분리 + budget/timeline sidebar)
**[complexity: complex, model: Sonnet 4.6, sequential, K-05 mandatory Tier 1 for server actions]**

##### IA

Image 2 영감. 좌측 = 기획서 첨부, 우측 = 레퍼런스 추가 (URL + 자동 thumbnail + 분류 + 메모). 우측 sidebar = budget + timeline.

##### Section 분리 (2-col + sidebar)

**좌측 column — 기획서 첨부 (briefing_documents.kind='brief')**:
- "기획서 첨부" header
- helper: "요청이나 아이디어가 정리된 PDF, PPTX, 이미지 파일이 있다면 업로드해주세요"
- Upload box: drag-and-drop + click to upload
  - PDF / PPT / image (jpg, png, webp) — multi-file
  - file row: filename + size + delete
- "링크로 추가" (subsection)
  - URL input + "추가하기" CTA (kind='brief', source_type='url')
  - 기획서 URL 도 가능 (Notion, Google Drive 링크 등)

**중앙 column — 레퍼런스 추가 (briefing_documents.kind='reference')**:
- "레퍼런스 추가" header
- helper: "참고할 사이트·영상 URL을 붙여넣어 주세요"
- 분류 chip selector (multi-select on enter):
  - 무드/분위기 (mood)
  - 구성 참고 (composition)
  - 페이싱 (pacing)
  - 일반 참고 (general)
- URL input + "추가하기" CTA
- 추가된 레퍼런스 list:
  - row: thumbnail (auto-fetch via oembed) + title + URL + 분류 chip + delete
  - 각 row 의 메모 칸: textarea (1-2 lines) "전체 색감·다이나믹한 구도 참고" 같은
- 이미지 업로드 도 가능 (kind='reference', source_type='upload')

**우측 sidebar — budget + timeline (Q-502 결정)**:
- "예산" header
- 4 chip select (single):
  - 100만원 미만
  - 100-500만원
  - 500-1000만원
  - 협의 (negotiable)
- "기대 납기일 (선택)" — date input
- "미팅 희망 일자 (선택)" — datetime-local input + helper: "미팅을 희망하시는 경우 일자와 시간을 선택해주세요"
- **🪞 AI 디지털 휴먼 (Twin) 활용에 관심 있어요** (interested_in_twin checkbox)
  - helper: "브리프 검토 후 야기 팀이 추천 Twin 또는 활용 방식을 제안드려요."

**하단 expandable section — Whiteboard (Q-504 결정)**:
- "더 추가할 게 있나요?" expandable trigger
- expand 시 → 기존 tldraw 캔버스 mount (Phase 3.1 그대로)
- 90% 사용자 안 씀, 고급 사용자만 expand

##### URL 자동 thumbnail (oembed)

기존 `fetchVideoMetadataAction` (Phase 3.0 task_03) 재사용 + 확장:
- youtube / vimeo / instagram / generic 모두 처리
- generic 의 경우 og:image meta 시도

##### Server actions (NEW + 확장)

- `addBriefingDocumentAction(input)` — INSERT briefing_documents row (upload 또는 url)
- `removeBriefingDocumentAction(id)` — DELETE briefing_documents row (RLS scope)
- `updateBriefingDocumentNoteAction(id, note, category)` — UPDATE note + category (reference 만)
- `getBriefingDocumentPutUrlAction(contentType, kind)` — kind='brief' 또는 'reference' 별 R2 prefix 분리

R2 prefix:
- 기획서: `briefing-docs/${user.id}/brief/<uuid>.<ext>`
- 레퍼런스: `briefing-docs/${user.id}/reference/<uuid>.<ext>`
- 기존 `wizard-references/` prefix 와 충돌 X

##### Files

- `src/app/[locale]/app/projects/new/briefing-canvas-stage-2.tsx` (NEW)
- `src/app/[locale]/app/projects/new/briefing-stage-2-actions.ts` (NEW — server actions)
- `src/app/[locale]/app/projects/new/components/brief-upload-section.tsx` (NEW)
- `src/app/[locale]/app/projects/new/components/reference-section.tsx` (NEW)
- `src/app/[locale]/app/projects/new/components/sidebar-budget-timeline.tsx` (NEW)
- `messages/ko.json` + `en.json` — `projects.briefing.stage2.*` 신규 keys

##### Codex K-05 LOOP focus (Tier 1, high reasoning — server actions)

1. `addBriefingDocumentAction` — kind + source_type 조합 validation (server-side trust)
2. `getBriefingDocumentPutUrlAction` — R2 prefix 가 user.id 안에 bound? (cross-user overwrite 방지, Phase 4.x sub_03f_5 F2 패턴 그대로)
3. `removeBriefingDocumentAction` — RLS scope (created_by 본인 + status='draft' 만)
4. `updateBriefingDocumentNoteAction` — kind='reference' 강제 (kind='brief' 인 row 의 category 변경 deny)
5. oembed fetch 의 timeout / SSRF (server-side fetch 시 internal IP block)

##### Acceptance

- Stage 2 진입 시 좌(기획서) + 중앙(레퍼런스) + 우(sidebar) 3-area layout
- 기획서 / 레퍼런스 각각 upload 또는 URL 추가 가능
- URL 입력 시 thumbnail 자동 fetch (youtube/vimeo/instagram/generic)
- 레퍼런스 분류 chip + 메모 칸 정상
- "더 추가할 게 있나요?" expand 시 tldraw 마운트
- /en parity
- mobile responsive (sidebar → bottom)

#### task_06: B — Stage 3 — Review + submit
**[complexity: medium, model: Sonnet 4.6, sequential, K-05 skip]**

##### IA

Stage 1+2 의 모든 입력을 *읽기 모드* + edit affordance 로 표시. 의뢰자가 *"내가 보낸 정보"* 한 번 확인.

Layout (single column, max-w-3xl 정도):

- "최종 확인" header
- helper: "프로젝트 의뢰 전 마지막 확인이에요. 수정이 필요하면 각 섹션의 [수정] 버튼을 눌러주세요."

**Section 1 — 콘텐츠 의도 (Stage 1 요약)**:
- 결과물 유형 / 목적 / 활용 채널
- 설명
- 시각화 비율
- 타겟 오디언스
- 영상 기획 유무
- 분위기 키워드
- 추가 요청사항
- [Stage 1 수정 →] CTA

**Section 2 — 자료 (Stage 2 요약)**:
- 기획서 list (filename + size)
- 레퍼런스 list (thumbnail + title + 분류 + 메모)
- 예산 / 납기 / 미팅 / Twin 관심
- [Stage 2 수정 →] CTA

**Bottom CTA**:
- "← 이전으로" (Stage 2 로)
- **"프로젝트 의뢰하기"** (primary CTA, sage-ink fill)
  - 클릭 → submitBriefingAction → status='in_review' set → redirect to `/app/projects/[id]`

##### Server action

- `submitBriefingAction(projectId)` — 기존 `submitProjectAction` 폐기 또는 wrap. 새 action 은:
  - project status='in_review' UPDATE
  - briefing_documents 모두 lock (RLS: status>='in_review' 면 INSERT/UPDATE/DELETE deny)
  - email 발송 (admin + client) — 기존 그대로
  - in-app notification — 기존 그대로
  - revalidatePath

##### Files

- `src/app/[locale]/app/projects/new/briefing-canvas-stage-3.tsx` (NEW)
- `src/app/[locale]/app/projects/new/briefing-stage-3-actions.ts` (NEW 또는 stage-2-actions 와 통합)
- `messages/ko.json` + `en.json` — `projects.briefing.stage3.*` 신규 keys

##### Acceptance

- Stage 3 진입 시 Stage 1+2 모든 입력 요약 표시
- [수정] CTA 로 해당 stage 로 jump (state 보존)
- "프로젝트 의뢰하기" 클릭 → 정상 제출 + redirect to `/app/projects/[id]`
- 제출 후 briefing_documents 모두 lock 상태

#### Wave B acceptance

- 3 stage 모두 정상 작동 + sequential navigation
- Stage 1+2+3 의 모든 입력이 정확히 DB 에 persisted
- briefing_documents 의 kind/source_type/note/category 정확
- Image 1 + 2 영감 IA 가 의뢰자 시점에서 자연스러움
- yagi visual review PASS (각 stage 별)

---

### Wave C — Detail page redesign (sequential, 1 lead Builder) — Day 11-15 (5 days)

#### task_07: C — Detail page IA — "현황" tab default + 4 secondary tabs
**[complexity: medium, model: Sonnet 4.6, sequential, K-05 skip]**

##### IA

기존 `/app/projects/[id]` 의 default view 변경:

- Header (그대로): project title + status pill + workspace 정보
- **Tab navigation** (default = "현황" — Q-505 결정):
  - 현황 (NEW, default)
  - 브리프 (Stage 1+2+3 요약, edit 가능 — task_08 에서 본격)
  - 보드 (기존 tldraw whiteboard 그대로)
  - 코멘트 (Phase 5 placeholder, Phase 6+ 본격)
  - 결과물 (Phase 5 placeholder, Phase 6+ 본격)

URL 구조: `/app/projects/[id]` → default = 현황 tab. `/app/projects/[id]?tab=brief` 같은 query param 으로 tab switch.

##### "현황" tab 의 layout

- **상단**: status timeline (5단계 visual progress bar)
  - 작성 중 → 검토 중 → 디렉터 매칭 → 작업 진행 → 시안 확인 → 최종 납품
  - 현재 status 에 highlight (sage filled circle)
  - 각 단계 hover 시 tooltip ("이 단계에서는...")
- **중간**: 야기 팀 코멘트 thread (placeholder — Phase 5 = 빈 상태 + "야기 팀이 검토 후 코멘트를 남겨드려요" 안내)
- **하단**: status-별 next action CTA (task_08 에서 본격)

##### Files

- `src/app/[locale]/app/projects/[id]/page.tsx` (default tab 변경)
- `src/app/[locale]/app/projects/[id]/_components/tabs.tsx` (NEW 또는 기존 갱신)
- `src/app/[locale]/app/projects/[id]/_components/status-timeline.tsx` (NEW)

#### task_08: C — Status-별 next action CTA + 의뢰자 시점 카드
**[complexity: complex, model: Sonnet 4.6, sequential, K-05 skip]**

##### Status-별 next action mapping (PRODUCT-MASTER v1.1 §C.4)

| Status | 의뢰자 next action 카드 |
|---|---|
| `draft` | "[브리프 완성하기]" → /app/projects/new (또는 /briefing) 의 해당 stage 로 |
| `in_review` | passive 상태. "야기 팀이 검토 중입니다. 보통 24-48시간 내 응답드려요. 추가 자료 첨부도 가능해요." + [코멘트 작성] secondary |
| `routing` | "디렉터를 매칭하고 있어요." + [미팅 일정 확인하기] (있다면) + [코멘트 작성] |
| `in_progress` | "디렉터/팀이 작업 중이에요." + [보드 보기] (보드 tab 으로) + [코멘트 작성] |
| `approval_pending` | primary CTA "[시안 보기]" + [피드백 작성] (highlighted card) |
| `delivered` | "납품이 완료되었어요!" + [최종 결과물 다운로드] + [프로젝트 평가] |

##### 디자인

- 카드: 흰 배경, border-subtle, radius 24, padding 32
- Primary CTA: sage fill, ink-primary text, rounded-full
- Secondary CTA: outline, ink-primary text
- approval_pending 의 highlighted card: sage subtle background tint

##### Files

- `src/app/[locale]/app/projects/[id]/_components/next-action-card.tsx` (NEW)
- `src/app/[locale]/app/projects/[id]/_components/status-timeline.tsx` (확장)

##### Acceptance

- 모든 status 별 next action 카드 정상 표시
- CTA 클릭 시 정확한 navigation (보드 tab / 코멘트 tab / external link)
- /en parity

#### task_09: C — 브리프 tab — Stage 1+2+3 요약 + edit
**[complexity: medium, model: Sonnet 4.6, sequential, K-05 mandatory Tier 2 for resolver]**

##### IA

브리프 tab = 의뢰자가 보낸 모든 정보 *읽기 모드* + edit affordance.

Layout = Stage 3 (Review) 의 layout 재사용. 단:
- status='in_review' 이상인 경우 → 모든 edit affordance 제거 (lock)
- status='draft' 인 경우 → [수정] CTA 활성

##### Server-side data resolver

`src/app/[locale]/app/projects/[id]/_data/brief-resolver.ts` (NEW):
- project 정보 + briefing_documents (kind='brief' / 'reference' 분리) fetch
- RLS scope verify (workspace member 또는 yagi_admin 만)
- 클라이언트 컴포넌트로 props pass

**Codex K-05 LOOP focus** (Tier 2, medium reasoning):
1. RLS scope 정확 (cross-tenant leak 방지)
2. yagi_admin 의 cross-workspace 접근 — 정확?
3. project status 별 edit affordance 분기 — server-side 강제 (클라이언트 trust 금지)

##### Files

- `src/app/[locale]/app/projects/[id]/_components/brief-tab.tsx` (NEW)
- `src/app/[locale]/app/projects/[id]/_data/brief-resolver.ts` (NEW)

##### Acceptance

- 브리프 tab 진입 시 Stage 1+2+3 모든 정보 표시
- status='draft' 시 edit 가능, status='in_review' 이상 시 read-only
- /en parity

#### Wave C acceptance

- /app/projects/[id] default tab = "현황"
- 5 tab 모두 정상 mount + URL query param 동기화
- 현황 tab 의 status timeline + next action CTA 모두 정확
- 브리프 tab read/edit 정상
- 보드 tab 기존 그대로 작동

---

### Wave D — ff-merge gate (sequential, lead Builder + yagi) — Day 16-18 (3 days)

#### task_10: D — Codex 5.5 K-05 final check (Tier 1)
**[complexity: medium, model: Sonnet 4.6, sequential, K-05 mandatory Tier 1]**

전체 phase 5 diff 에 대한 Codex 5.5 final review (high reasoning, full Phase 5 diff):

```bash
# Builder 가 진짜 review 영향 file 만 식별 (cascade audit)
git diff main..HEAD --name-only | grep -E '\.(ts|tsx|sql)$' > _phase_5_review_targets.log

# File count budget check (< 20 권장, > 30 = 분할 review)
wc -l _phase_5_review_targets.log

codex review $(cat _phase_5_review_targets.log) \
  --reasoning-effort high \
  --output _phase_5_codex_final_review.md
```

Focus areas (compressed prompt):
1. briefing_documents RLS — SELECT/INSERT/UPDATE/DELETE 정확
2. Data migration 의 row count 일치 + idempotency
3. interested_in_twin client-supplied trust 경계
4. Stage 2 server actions R2 prefix user.id-bound (Phase 4.x sub_03f_5 F2 패턴 reuse)
5. Stage 3 submit 후 briefing_documents lock — RLS 강제
6. Detail page resolver RLS scope
7. *Builder grep audit*: `workspaces[0]` / `memberships[0]` / RLS-only scope 잔존?

LOOP 1 → 2 → 3 까지. LOOP 3 후 HIGH-A residual = HALT + 야기 보고. **Scale-aware rule 적용** — MED-B/C 발견 시 inline-fix 강제 조건 (3가지) hit 여부 chat 보고 후 결정.

#### task_11: D — Smoke tests (yagi manual)
**[sequential, yagi 직접]**

dev 환경에서:
1. 신규 user 가입 → /briefing/new → Stage 1 → Stage 2 → Stage 3 → 제출 → /app/projects/[id] 의 현황 tab default 진입
2. /app/projects/[id]?tab=brief — 브리프 tab 정상
3. /app/projects/[id]?tab=board — 보드 tab 정상
4. status 변경 (admin 으로 in_review → routing) — next action CTA 갱신 확인
5. 기존 user (Phase 4.x 시점 가입) 의 기존 projects 정상 표시 + 기존 attached_pdfs/urls 가 briefing_documents 로 migrate 됨 verify
6. /en locale parity

#### task_12: D — ff-merge to main
**[sequential, yagi 직접]**

```powershell
cd C:\Users\yout4\yagi-studio\yagi-workshop
git checkout main
git pull origin main --ff-only
git merge --ff-only g-b-10-phase-5
git push origin main
```

Verify:
- main 의 latest commit = phase 5 의 final SHA
- Vercel auto-deploy 정상 (production)
- 기존 user 영향 0 verify

#### Wave D acceptance

- Codex K-05 LOOP 3 의 0 HIGH-A residual
- yagi smoke 6 항목 모두 PASS
- ff-merge 완료 + main push
- production deploy 정상
- 기존 user data 무영향

---

## 사고 처리

- **MAJOR** (Codex K-05 LOOP 3 후 HIGH-A residual) → 그 task STOP, 다음 task 진입 X, 야기 chat 보고
- **MINOR** → 진행 + `_hold/issues_phase_5.md`
- **Data migration row count mismatch** (task_02 verify 실패) → 즉시 chat 보고, rollback 계획 + 야기 confirm 후 재실행
- **Stage 2 의 oembed fetch 가 SSRF block 으로 internal URL fetch 시도** → Codex K-05 가 catch 해야. 만약 production 에서 발견 시 hotfix-1
- yagi visual review FAIL (Stage 1/2/3 또는 detail page) → 즉시 chat 보고 + Wave 안에서 fix
- **ChatGPT subscription quota 도달** → Wave 진행 STOP, 야기 chat 보고. 5h reset 대기 또는 Opus self-review fallback (Tier 1 task 만, LOOP 2 까지).

---

## 제약 (CRITICAL)

- **L-027 BROWSER_REQUIRED gate** — main push 절대 X (Wave D task_12 까지)
- main 에 ff-merge 절대 X (Wave D task_12 까지)
- spawn 사용 X (lead Builder 직접만)
- prod migration apply 전 Codex K-05 LOOP 0 HIGH-A 필수
- L-001 PowerShell `&&` 금지
- 기존 attached_pdfs/urls jsonb columns 는 Phase 5 안에서 폐기 X (data 보존, ff-merge 후 hotfix-1 또는 Phase 5.1 에서 cleanup)
- briefing_documents 의 RLS 는 strict — workspace member 외 접근 0
- **Codex auth = ChatGPT subscription** (API key 비활성). 5h quota 모니터링.

---

## Output expectations

`.yagi-autobuild\phase-5\` 안에:
- `KICKOFF.md` (이 file)
- `_phase_5_review_targets.log` (Codex review 영향 file list)
- `_run.log` (각 task 별 SHIPPED/STOP entry — quota 추적도 포함)
- `_followups.md` (Phase 5 followup — 예: jsonb cleanup, MED-tier batch sweep)
- `_phase_5_codex_review_*.md` (Codex K-05 출력)
- `_hold/issues_phase_5.md` (MINOR 사고 누적)
- `task_plan.md` (Builder/Orchestrator 가 작성)

---

## 시작

Builder ENTRY:
1. Pre-phase prerequisite 1-10 verify (Codex CLI 로그인 ChatGPT subscription auth 확인)
2. `g-b-10-phase-5` branch 생성
3. Wave A 의 task_01/02/03 동시 시작 (3 teammates parallel, Sonnet 4.6 only)
4. Wave A 끝나면 yagi chat 보고 + acceptance verify → Wave B 진입
5. Wave B 의 Stage 1/2/3 sequential, 각 stage 별 yagi visual review
6. Wave C sequential
7. Wave D 진입 시 yagi 직접 smoke + ff-merge

K-05 결과 chat 보고 (token cost 0, message count 만 추적). 의문점 즉시 chat.

---

## Changelog

- **v1.0 (2026-05-02 작성)** — Phase 5 = Briefing Canvas paradigm shift. PRODUCT-MASTER v1.1 §C/§D base. 야기 결정 9개 (Q-501~Q-509) chat-confirmed.
- **v1.1 (2026-05-02 갱신)** — K-05 protocol revised after Phase 4.x cost lessons (~$25 → ~$10-15 estimate). 3-Tier reasoning system (high/medium/low). Context minimization rules (필요 file 만, diff 만, prompt 압축). Builder grep audit pre-step (Codex miss 보완). Wave 크기 정규화. config.toml default = medium.
- **v1.2 (2026-05-04 갱신)** — Codex CLI auth migration to **ChatGPT subscription** (API key 비활성). Per-token cost = 0; 5h message quota 가 새 제약. K-05 cost section 을 quota-based message budget 으로 변경 (6-12 messages / 3주 sprint estimate). **Scale-aware security trade-off** rule 추가 (yagi locked 2026-05-04) — User pool < 100 + all-trusted = MED-B/C default = FU 등록 + Phase entry batch sweep. 3 inline-fix 강제 조건 명시. task_03 에 *onboarding/brand polish* sub_task 3c 추가 (FU-C5d-11 polish). Codex 부재 fallback table 확장 (quota / downtime / login expiry / model access). File count budget < 20 명시 (Wave D task_10).
