# Phase 4.x — task_plan.md

Branch: `g-b-9-phase-4` (base main @ `5bfca60` + 21 cherry-picks @ HEAD `0b0706c`)
Mode: B-O-E (Builder-Orchestrator-Executor)
Builder: Opus 4.7 (lead)
Teammates: Sonnet 4.6 (no Haiku — yagi quality requirement)

---

## Wave A — DB foundation + wizard fixes (parallel, 3 teammates)

```yaml
- id: task_01
  title: "DB schema migration (workspaces.kind + projects.twin_intent + projects.kind enum + project_licenses)"
  complexity: complex
  model: sonnet-4-6
  parallel_group: A
  spec_ref: "phase-4-x/KICKOFF.md §task_01"
  status: pending
  owner: ""
  files:
    - supabase/migrations/20260501000000_phase_4_x_workspace_kind_and_licenses.sql (NEW)
  acceptance:
    - Migration file authored matching KICKOFF §task_01 SQL exactly
    - psql verify queries documented in result_01.md
    - K-05 (Wave D) 와 prod apply (Wave D D.1) 는 별도 단계 — Wave A 는 schema 작성 + self-check 만
    - workspaces.kind = 'brand' default + CHECK constraint
    - projects.twin_intent = 'undecided' default + CHECK constraint (3 values)
    - projects.kind enum = 6 values (direct + 5 inbound/talent variants)
    - project_licenses table + 2 indexes + 3 RLS policies (select_admin, select_owner, write_admin) + updated_at trigger
  result_file: result_01.md

- id: task_02
  title: "F1-F6 submit-broken precise fix + 진단 wiring 정리"
  complexity: complex
  model: sonnet-4-6
  parallel_group: A
  spec_ref: "phase-4-x/KICKOFF.md §task_02"
  status: pending
  owner: ""
  files:
    - src/app/[locale]/app/projects/new/actions.ts
    - src/app/[locale]/app/projects/new/new-project-wizard.tsx (필요 시)
    - F1-F6 wiring 위치 (grep 후 식별)
  acceptance:
    - F1-F6 진단 wiring 위치 식별 + root cause 분석 (result_02.md 에 기록)
    - Submit 정상 (status 전환 정확: draft → routing 또는 in_review)
    - 진단 wiring 제거 또는 production-grade error handling 으로 refactor
    - Reproduction case 에서 success
    - 에러 케이스 시 명확한 user-friendly toast (/ko + /en)
    - Sensitive field reveal 없음 (user_id/email 등 노출 X)
  result_file: result_02.md

- id: task_03
  title: "Wizard Step 3 Twin intent 3-radio + tooltip + locale (LOCKED §1)"
  complexity: simple
  model: sonnet-4-6
  parallel_group: A
  spec_ref: "phase-4-x/KICKOFF.md §task_03 + _decisions_locked.md §1"
  status: pending
  owner: ""
  files:
    - src/app/[locale]/app/projects/new/new-project-wizard.tsx (Step 3 확장)
    - src/app/[locale]/app/projects/new/actions.ts (zod schema)
    - messages/ko.json
    - messages/en.json
  decision_lock: "옵션 A — 3-radio (specific_in_mind / undecided default / no_twin)"
  acceptance:
    - Step 3 Twin intent UI 3-radio 정상 렌더 + tooltip ⓘ
    - Tooltip hover/click 동작 (KICKOFF copy 그대로)
    - Submit 시 twin_intent DB 저장 (3 enum 값 모두 verify path)
    - /ko + /en parity (8 키 추가)
    - Default selection = 'undecided'
    - zod schema 에 twin_intent z.enum(['undecided','specific_in_mind','no_twin']) 추가
    - submitProjectAction → seed RPC 까지 propagation
  blocked_by:
    - task_01 (DB schema 가 twin_intent column 추가 — 그러나 task_01 도 Wave A parallel 이므로 RPC/DB 적용은 Wave D 까지 미루고, task_03 은 client-side wiring 만 완성. zod + form + i18n 까지. submit path 의 server action 은 column 적용 후 동작.)
  note: "task_01 migration 은 prod 적용 안 하고 schema 파일만 쓰는 단계 (Wave A). task_03 client 만 돌면 OK. submit path 는 Wave D D.1 적용 후 verify."
  result_file: result_03.md
```

---

## Inter-task coupling (Wave A)

- task_01 ↔ task_03: schema (`twin_intent` column) ↔ client form. Wave A 단계에서는 둘 다 *작성*만 하고 prod apply 는 Wave D. 따라서 parallel 가능 (no runtime block).
- task_01 ↔ task_02: 거의 무관. task_02 는 submit path bug 정밀 fix, task_01 schema 도입은 별도. 단, task_02 의 root cause 가 새 `twin_intent` column 부재 때문이면 task_01 schema 와 결합. → 분석 결과를 result_02.md 에 명기.
- task_02 ↔ task_03: 둘 다 wizard submit path 건드림. task_02 = error handling refactor, task_03 = field 추가. **Merge conflict 가능성** — `actions.ts`, `new-project-wizard.tsx` 동시 수정. → orchestrator 가 task_02 commit 먼저, task_03 가 그 위에 rebase 하는 순서 권장. 또는 둘 다 isolated worktree 에서 작업 후 lead Builder 가 통합.

---

## Wave B (next) — sequential

- task_04: post-submit /app/projects/[id] detail page redesign

## Wave C (parallel, 3)

- task_05: /app/commission redirect + Brand sidebar (with _decisions_locked §4 amendment — /app/dashboard 별도 page)
- task_06: workspace switcher 박스화 + dropdown + multi-workspace (with _decisions_locked §2 cookie-based + §3 disabled placeholder)
- task_07: license schema verify + admin sidebar hidden

## Wave D (sequential, 2)

- task_08: Reviewer Fallback (Opus self-review + manual) + tsc/lint/build/types regen
- task_09: ff-merge to main + Telegram + L-027 BROWSER_REQUIRED gate

---

## Constraints (KICKOFF + lessons)

- L-001 PowerShell `&&` 금지 — `;` 또는 `; if ($?) {}`
- L-005 git inline `-m`; multi-line `-F .git\COMMIT_MSG.txt`
- L-007 Supabase project = `jvamvbpxnztynsccvcmr`
- L-009 ASCII repo paths only
- L-010..L-014 design system v0.2.0 (achromatic + no shadow + font-suit + no italic + hairline)
- L-018 design system v1.0 (yagi-design-system) — sage `#71D083` 단일 액센트
- L-027 BROWSER_REQUIRED gate — Wave D 까지 push 절대 X
- Wave A 단계 = no K-05 (Wave D D.6), no manual verify (Wave D D.9), no browser smoke (Wave D D.11)
- Forbidden: Phase 5+ 작업 (Artist workspace, Roster, Approval gate, Inbound routing, License surface, Reveal Layer)

---

## Commit message convention

- `feat(phase-4-x): <task scope> <summary>`
- `chore(phase-4-x): <scope> <summary>` (types regen, etc.)
- `fix(phase-4-x): <scope> <summary>` (Wave D self-review LOOP fixes)
