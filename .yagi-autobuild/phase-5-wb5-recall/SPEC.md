# Phase 5 Wave B.5 — Client Recall (submitted/in_review → draft)

Status: APPROVED v3, Builder may resume Step 1 after re-reading.
Author: 야기 + Web Claude (chat 2026-05-04)
Scope tier: MINI-WAVE (~1.5h), separate ship from Wave C.

## Goal

의뢰자가 제출한 프로젝트를 *야기 팀이 작업 착수하기 전* 까지 회수하여
수정할 수 있게 한다. State machine 의 reverse transition
(`submitted → draft`, `in_review → draft`) 을 client actor 에 추가하고,
detail page 에 회수 CTA 단다.

## Why now (Wave B.5 분리 ship 이유)

- Wave C (detail page redesign) 는 5–7d sprint. 그 사이 client 가
  의뢰 후 오타/의도 변경 발견 시 "수정 못 함" 마찰.
- 회수 기능은 RPC patch + 단일 CTA = ~1.5h 로 분리 가능.
- Wave C 의 "현황 tab" CTA 매트릭스 (PRODUCT-MASTER §C.4) 에
  자연 흡수됨 — RecallButton 컴포넌트 그대로 재사용.

## State machine 변경

`is_valid_transition` truth table 의 client `CASE` 블록에 정확히 2 row 추가:

| from | to | role | comment 필수? |
|---|---|---|---|
| `submitted` | `draft` | `client` | NO (NULL OK) |
| `in_review` | `draft` | `client` | NO (NULL OK) |

기타 actor (`yagi_admin` / `workspace_admin` / `system`) 의 `* → draft` 는
**금지** 유지. 회수는 client 권한 only.

Wave B 의 creator-first role resolution patch
(`20260504200001_phase_5_transition_project_status_creator_role.sql`)
와 자연 호환 — own project 에 대한 transition 은 client matrix 통과.

## Recall window 정의

| 현재 status | 회수 가능? | 비고 |
|---|---|---|
| `draft` | N/A | 이미 draft |
| `submitted` | ✅ | matrix 추가 |
| `in_review` | ✅ | matrix 추가 |
| `in_progress` 이상 | ❌ | admin 작업 착수 — 윈도우 종료 |

추가 시간 가드 없음. status 가 윈도우 안이면 회수 가능.

> Note: Phase 3.0 L-015 에 따라 `submitted→in_review` 는 server
> action 직접 (RPC 우회) — 사실상 `submitted` 윈도우는 ms 단위.
> 그래도 matrix 에 포함시키는 이유는 race + 미래 server action 지연
> 시 안전망.

## Race / concurrency

- `transition_project_status` 가 `SELECT ... FOR UPDATE` 로 row lock
  후 status 검사 → atomic.
- Admin 이 먼저 `in_review→in_progress` 누르면 client 의 회수 시도는
  RPC 가 `invalid_transition: in_progress -> draft for role client`
  (23514) 로 거부 → UI toast: "야기 팀이 이미 작업을 시작했어요".

## Out-of-scope (FU 등록)

- **FU-Phase5-7** — `/projects/new` dangling-draft auto-wipe 가 *회수된
  draft* 도 wipe 하는지 audit. real-user 0명이라 risk negligible 하지만
  Wave C 시작 전 재확인 권장.
- **FU-Phase5-8** — Admin telegram notification on recall.
  <100 user scale 에서 over-engineering.
- Versioning / 이전 submission diff 보기. Phase 5 scope 외.

## Codex K-05

- **Tier**: LOW.
- **Justification**: matrix 추가 2 row, 기존 RPC 의 SECURITY DEFINER +
  Wave B creator-first role resolution 그대로 재사용. RLS 변경 0,
  payment/auth 무관.
- **Routing**: Codex 가용 → Codex K-05 LOOP 1.
  Codex unavailable → Layer 1 Opus self-review fallback (adversarial
  framing).
- **Reasoning effort**: Builder 자율 판단. default `medium`,
  diff 복잡도/risk 보고 `high` upgrade 가능. (야기 운영 룰 = 상황에
  따라 medium/high 번갈아.)
- **Layer 2** manual SQL verify 면제 (LOW tier).
- **Risk surface**: matrix 에 새 row 추가 시 다른 actor 권한 누출
  여부만 verify (yagi_admin / workspace_admin / system 이
  `submitted→draft` 또는 `in_review→draft` 호출 시 명시적 거부 SQL).

## Migration apply policy (Q2 답)

Phase 5 = **test-only state** (real user 0). 별도 sandbox 없음 —
prod (`jvamvbpxnztynsccvcmr`) 가 사실상 sandbox.

- Target: prod (`jvamvbpxnztynsccvcmr`).
- Builder 자율 apply — gate 없음. tsc/lint/build clean 후 바로
  `mcp__supabase__apply_migration` 실행.
- ff-merge to main 만 야기 chat GO gate.

## Deliverables

### 1. DB migration

`supabase/migrations/<utc_timestamp>_phase_5_wb5_client_recall_to_draft.sql`

`is_valid_transition` 의 client `CASE` 블록에 2 line 추가:

```sql
WHEN from_status = 'submitted'  AND to_status = 'draft' THEN true
WHEN from_status = 'in_review'  AND to_status = 'draft' THEN true
```

CREATE OR REPLACE 로 함수 갱신. signature/grants 변경 없음.
다른 row 는 Phase 3.0 migration 에서 verbatim 복사.

⚠️ All comments in English. No Korean characters in SQL (Phase 3.0 convention).

### 2. Server action

`src/app/(authenticated)/projects/[id]/_actions/recallProjectAction.ts` (new)

```ts
'use server';
// thin wrapper — supabase.rpc('transition_project_status', {
//   p_project_id, p_to_status: 'draft', p_comment: null
// })
// returns { ok: true } | { ok: false, error: 'forbidden' | 'invalid_transition' | 'unknown' }
// revalidatePath('/projects/[id]') + revalidatePath('/projects')
```

기존 `submitProjectAction.ts` shape 복사. PostgrestError code mapping:
- `42501` → `forbidden`
- `23514` → `invalid_transition`
- 기타 → `unknown`

### 3. UI 컴포넌트

`src/app/(authenticated)/projects/[id]/_components/RecallButton.tsx` (new)

- Props: `projectId: string`, `status: 'submitted' | 'in_review'`,
  `locale: 'ko' | 'en'`
- Render: outline button `{t('recall.cta')}` + AlertDialog confirm
- On confirm → call recallProjectAction
  → success: `router.push('/projects/${projectId}/edit?step=commit')`
    (Briefing Canvas Step 3 — Wave B 의 commit step)
  → error: `toast.error(t('recall.error.${code}'))`

### 4. Detail page integration

`src/app/(authenticated)/projects/[id]/page.tsx`

기존 detail page (Phase 4.x wizard 기반) 의 status pill 옆 또는
헤더 우측에 conditional render (Q3 답):

```tsx
{(project.status === 'submitted' || project.status === 'in_review') &&
 viewer.id === project.created_by && (
  <RecallButton
    projectId={project.id}
    status={project.status}
    locale={locale}
  />
)}
```

조건 분해:
- `status` window check (submitted OR in_review) — RPC 가 같은 체크 함, UI 는 미리 hide.
- `viewer.id === project.created_by` — RPC 의 creator-first role resolution
  에 따라 non-creator 는 어차피 forbidden. UI 에서 button 자체를 숨김
  (admin/non-owner 가 회수 시도조차 못 하게).
- 시간 window 가드 없음.

⚠️ Wave C 에서 detail page 전면 redesign 시 RecallButton 그대로
재사용 → 새 "현황" tab 의 next action CTA 슬롯으로 이동.

### 5. i18n keys

`messages/ko.json` + `messages/en.json` — 새 namespace
`projectDetail.recall`:

| key | KO | EN |
|---|---|---|
| `cta` | 의뢰 회수 후 수정 | Recall and edit |
| `confirm.title` | 의뢰를 회수할까요? | Recall this submission? |
| `confirm.body` | 회수하면 야기 팀의 검토 큐에서 빠지고, 수정 후 다시 제출하셔야 해요. | Recalling removes this from YAGI's review queue. You'll need to resubmit after editing. |
| `confirm.action` | 회수하기 | Recall |
| `confirm.cancel` | 취소 | Cancel |
| `error.invalid_transition` | 야기 팀이 이미 작업을 시작했어요. 새로고침 후 다시 시도해 주세요. | YAGI has already started reviewing. Refresh and try again. |
| `error.forbidden` | 이 프로젝트를 회수할 권한이 없어요. | You don't have permission to recall this project. |
| `error.unknown` | 회수 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요. | Failed to recall. Please try again. |

## Verification (Builder responsibility — 13 steps total)

### Pre-apply (types + lint + build)

1. `pnpm exec tsc --noEmit` clean
2. `pnpm lint` clean
3. `pnpm build` clean

### Apply migration to prod (Builder 자율, no gate)

→ `mcp__supabase__apply_migration` after Step 1–3 PASS.

### Post-apply SQL verify

4. `SELECT public.is_valid_transition('submitted','draft','client')` → `true`
5. `SELECT public.is_valid_transition('in_review','draft','client')` → `true`
6. `SELECT public.is_valid_transition('submitted','draft','yagi_admin')` → `false`
7. `SELECT public.is_valid_transition('submitted','draft','workspace_admin')` → `false`
8. `SELECT public.is_valid_transition('in_progress','draft','client')` → `false`

### Manual smoke (UI, 야기 직접 또는 Builder 안내)

9. 의뢰자 계정 → 새 프로젝트 의뢰 → submitted detail page → 회수 버튼 보임
10. 클릭 → confirm dialog → 회수하기 → /projects/[id]/edit?step=commit redirect
11. Briefing Canvas Step 3 에서 description 1글자 수정 → 재제출 → status='submitted' 정상 이동
12. project_status_history 에 3 row: submitted (initial) / draft (recall) / submitted (resubmit)
13. Admin 계정으로 in_progress 강제 transition 후 client 회수 시도 → toast.error 표시 + redirect 안 됨

### K-05 LOOP 1 (Codex default, Opus self-review fallback)

14. Builder 가 `_codex_review_prompt.md` 작성 — adversarial framing:
    "If I were attacking this matrix change, what role escalation
    could I exploit? Specifically check: (a) yagi_admin/workspace_admin
    paths to draft, (b) RLS bypass via direct UPDATE,
    (c) trg_guard_projects_status interaction, (d) creator-first
    resolution edge cases (workspace owner who is also yagi_admin)."
15. Codex 가용 → `codex` CLI (reasoning effort = Builder 자율).
    Unavailable → Opus self-review.
16. Findings → `_codex_review_loop1.md`.
    0 findings = PASS, halt for 야기 ff-merge GO.

## Estimated effort

| Task | Time |
|---|---|
| Migration SQL | 5min |
| recallProjectAction | 10min |
| RecallButton + i18n | 25min |
| Detail page integration | 10min |
| Verification (1–13) | 30min |
| K-05 LOOP 1 | 20min |
| **Total** | **~1.5h** |

## Commit plan (PowerShell, one command at a time)

```powershell
# Migration commit (after verify step 1-3 PASS)
git add supabase/migrations/<timestamp>_phase_5_wb5_client_recall_to_draft.sql
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wb5): allow client to recall submitted/in_review projects to draft

# Code commit (after K-05 LOOP 1 PASS)
git add src/ messages/
git status
git commit -F .git\COMMIT_MSG.txt
# msg: feat(phase-5/wb5): RecallButton + i18n + detail page integration
```

## Sign-off

Builder execute → Verify 1–13 + K-05 LOOP 1 → 결과 chat 보고 →
야기 ff-merge GO.
