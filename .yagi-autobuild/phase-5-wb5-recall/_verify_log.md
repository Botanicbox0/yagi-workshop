# Wave B.5 — Verification log

## Pre-apply (SPEC steps 1-3)

| # | Check | Result |
|---|---|---|
| 1 | `pnpm exec tsc --noEmit` | PASS — no errors |
| 2 | `pnpm exec next lint` (touched files) | PASS — 0 findings on `recall-actions.ts`, `recall-button.tsx`, `projects/[id]/page.tsx` |
| 3 | `pnpm build` | PASS — production build clean |

## Migration apply (Builder autonomous, no gate per SPEC v3 §"Migration apply policy")

- Target: `jvamvbpxnztynsccvcmr` (prod = sandbox state)
- Tool: `mcp__supabase__apply_migration`
- Migration name: `phase_5_wb5_client_recall_to_draft`
- File: `supabase/migrations/20260504220000_phase_5_wb5_client_recall_to_draft.sql`
- Result: `{"success": true}`

## Post-apply SQL verify (SPEC steps 4-8)

Executed via `mcp__supabase__execute_sql`:

```sql
SELECT
  is_valid_transition('submitted','draft','client')           AS s4,
  is_valid_transition('in_review','draft','client')           AS s5,
  is_valid_transition('submitted','draft','yagi_admin')       AS s6,
  is_valid_transition('submitted','draft','workspace_admin')  AS s7,
  is_valid_transition('in_progress','draft','client')         AS s8;
```

| # | from | to | role | Expected | Actual | Result |
|---|---|---|---|---|---|---|
| 4 | submitted | draft | client | true | **true** | PASS |
| 5 | in_review | draft | client | true | **true** | PASS |
| 6 | submitted | draft | yagi_admin | false | **false** | PASS |
| 7 | submitted | draft | workspace_admin | false | **false** | PASS |
| 8 | in_progress | draft | client | false | **false** | PASS |

Matrix posture: client recall window opened for `{submitted, in_review}`
only; admin/system roles cannot recall; client cannot recall after work
has started.

## Manual smoke (SPEC steps 9-13)

These steps require browser interaction. Builder cannot drive a real
auth session, so the steps are reproduced as a checklist for 야기 to
run in browser; results to be appended below after that pass.

### 9. Submit → detail page → Recall button visible

- Pre: 의뢰자 계정 (creator with no admin role; e.g. `dana.clara0830@gmail.com`)
- Action: 새 프로젝트 작성 → Step 3 [의뢰하기 →] → AlertDialog confirm → success toast
- Expected redirect: `/[locale]/app/projects` list
- Then: open the new project's detail page → status pill = `submitted` → **RecallButton 보임** (status pill 영역 위쪽 우측)
- Result: ⏳ pending 야기 smoke

### 10. Click Recall → confirm → redirect to commit step

- Action: RecallButton 클릭 → AlertDialog title "의뢰를 회수할까요?" + body 출력 → "회수하기"
- Expected redirect: `/[locale]/app/projects/new?project={projectId}&step=commit` (Briefing Canvas Step 3 / commit step)
- Result: ⏳ pending 야기 smoke

### 11. Edit description → resubmit → status='submitted'

- Action: Step 3 final notes 또는 description field 1글자 수정 → [의뢰하기 →] confirm → success toast
- Expected: status=`submitted`, `submitted_at` 새 timestamp
- Result: ⏳ pending 야기 smoke

### 12. project_status_history audit trail

- Expected SQL after step 11:
  ```sql
  SELECT to_status, actor_role, created_at
    FROM project_status_history
    WHERE project_id = '<projectId>'
    ORDER BY created_at;
  ```
- Expected 3 rows: `submitted` (initial) / `draft` (recall) / `submitted` (resubmit)
- Builder will run this query post-smoke to confirm history fidelity.
- Result: ⏳ pending 야기 smoke

### 13. Admin transitions in_progress → client recall blocked

- Pre: same project at `in_review` (Phase 3.0 L-015 auto-transition from `submitted`)
- Action 1: yagi_admin manually transitions `in_review → in_progress` (via existing admin tool)
- Action 2: 의뢰자 계정으로 detail page open → RecallButton **여전히 보임** (UI 가드는 status check 만 함, in_progress 시 button hide) — wait, gate is `submitted | in_review`. After admin moves to `in_progress`, RecallButton hides. Need a refresh.
- Refined: instead, simulate a **race**: admin moves to `in_progress` between client open and click. Click RecallButton → recallProjectAction → RPC returns `23514 invalid_transition` → `toast.error("야기 팀이 이미 작업을 시작했어요...")`, no redirect.
- Result: ⏳ pending 야기 smoke

## K-05 LOOP 1 (SPEC steps 14-16)

- Tool: `codex exec` with `gpt-5.5`, `model_reasoning_effort=low` (LOW tier per SPEC)
- Tokens: 34,705
- Verdict: **CLEAN — no new HIGH/MED findings**
- Output: `_codex_review_loop1.md` (last-message capture) + `_codex_review_loop1_full.md` (full transcript)

Codex covered: client-only matrix posture, RPC-only path (no direct UPDATE / no trg_guard bypass), creator-first composition, UI gate alignment, FOR UPDATE race serialization, redirect target.

**One low-priority UX note (not a security finding):** The redirect
target `/[locale]/app/projects/new?project={projectId}&step=commit`
is a Builder best-effort substitute for SPEC's nominal
`/projects/{projectId}/edit?step=commit` (a route that does not exist
in this repo). The current Briefing Canvas hydrates `projectId` from
`sessionStorage`, not query params, so the user lands on a fresh
canvas after recall and the defensive soft-delete in Wave B's
hotfix-6 will then re-soft-delete the just-recalled draft. Filed as
**FU-Phase5-9** below; not a Wave B.5 security blocker per Codex.
