# Phase 5 KICKOFF — Briefing Canvas (briefing-as-conversation paradigm)

**Branch (NEW):** `g-b-10-phase-5`
**Base:** `main` (after Phase 4.x ff-merge)
**Carry-over:** N/A (Phase 4.x ff-merged before Phase 5 entry — no cherry-pick needed)
**Target:** 3주 sprint (15 working days)
**SOFT_CAP:** 18 days
**HARD_CAP:** 21 days
**K-05:** Codex 5.5 active (`gpt-5.5`, default reasoning=medium, high override for Tier 1). Mandatory for: schema migration, RLS, data migrate, security-critical
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
5. ✅ Codex CLI 활성 + `~/.codex/config.toml` model=gpt-5.5, default reasoning=medium
6. ✅ PRODUCT-MASTER v1.1 read (`.yagi-autobuild/PRODUCT-MASTER.md` §C/§D)
7. ✅ yagi-design-system v1.0 read (`C:\Users\yout4\.claude\skills\yagi-design-system\SKILL.md`)
8. ✅ R2 bucket setup 그대로 (Phase 3.1 prerequisite — `CLOUDFLARE_R2_PUBLIC_BASE` in `.env.local`)
9. ✅ `getBoardAssetPutUrlAction` 서버액션 그대로 (Phase 3.1)
10. ✅ Resend email setup 그대로 (Phase 3.0+)

If 1-4 fail: HALT, yagi confirm 후 진행.

---

## Codex 5.5 K-05 protocol (revised after Phase 4.x cost lessons)

Phase 4.x 에서 누적 ~$25 spent on K-05 (24h). 주된 원인 분석:
- **Token bloat 가 80% 비용** (reasoning effort 보다 훨씬 큼)
- sub_03f_3 LOOP 1 = 628k tokens = $6 (전체 diff 보냄)
- Codex 가 *동일 결함 클래스 의 모든 사용처* 못 찾음 (LOOP 추가 발생)

→ Phase 5 protocol = **context minimization 우선** + **3-Tier reasoning** + **LOOP 절감**.

### Token 절감 우선순위 (효과 순)

| 순위 | 전략 | 절감 |
|---|---|---|
| 1 | **Context 줄이기** — 필요 file 만, diff 만 | **50-90%** ⭐⭐⭐ |
| 2 | **Prompt 압축** — 명확 spec, fluff X | 15-20% |
| 3 | **Wave 작게 나누기** — 4-12 sub_task per wave | 30% |
| 4 | **Reasoning effort tier system** — high/medium/low 매핑 | 40-50% |
| 5 | **LOOP 절감** — single-line miss = inline fix only | 20-30% |
| 6 | **Builder grep audit pre-step** — Codex miss 보완 | LOOP 감소 |

### 3-Tier reasoning system

config.toml default = `medium`. high override 는 Tier 1 만:

| Tier | Reasoning | Token cost | Use case |
|---|---|---|---|
| **Tier 1 — Deep** | `--reasoning-effort high` | ~100% baseline | prod RLS / SECURITY DEFINER / auth flow / cross-tenant / new schema migration |
| **Tier 2 — Standard (default)** | (omit, uses config medium) | ~50% | 표준 review, cascade audit, MED-tier fix, 신규 server action |
| **Tier 3 — Verify** | `--reasoning-effort low` | ~25% | single-line verify, syntax check, LOOP 2+ confirm |

### Context minimization rules (CRITICAL)

#### Rule 1: 필요 file 만 review (모든 git diff X)

**Before** (Phase 4.x sub_03f_3, 628k tokens, $6):
```bash
codex review $(git diff main..HEAD --name-only | tr '\n' ' ')
```

**After** (~30-50k tokens, $0.30-0.50):
```bash
codex review src/lib/workspace/active.ts \
  src/app/[locale]/app/projects/new/actions.ts \
  src/app/[locale]/app/projects/page.tsx
```

→ Builder 가 *진짜 review 영향 file* 만 식별 후 명시.

#### Rule 2: Diff 만 보내기 (file 전체 X)

```bash
# Builder 가 git diff 로 변경 hunk 만 추출
git diff main..HEAD -- <files> > /tmp/diff.txt
codex exec --reasoning-effort medium <<PROMPT
Review the following diff for security issues:
$(cat /tmp/diff.txt)
PROMPT
```

→ file 전체 read 대비 50% 절감.

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

→ ~15-20% 절감.

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

# Tier 2 (standard, default)
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
4. **Wave D final review** — full Phase 5 diff Tier 1

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

### Codex 부재 fallback

Codex API 불가 (quota 도달, network 등) → Opus 4.7 self-review (memory #18). LOOP 2 까지만.

### Phase 5 K-05 cost estimate

Phase 4.x token bloat lesson 반영:
- Tier 1: 4 task × ~$1.50 (with context minimization) = $6
- Tier 2: 2 task × ~$0.80 = $1.6
- Tier 3: ~5 verify × ~$0.20 = $1
- LOOP 평균 1.5 cycle (LOOP 4 기피) × 2x = $5-8
- **Total estimate: ~$10-15** (Phase 4.x ~$25 vs Phase 5 ~$10-15)

---

