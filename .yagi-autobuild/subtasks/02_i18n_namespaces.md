# Subtask 02 — i18n: 6 new namespaces (projects/refs/threads/settings/admin/errors)

**status:** pending
**assigned_to:** executor_haiku_45
**created:** 2026-04-21
**parallel_group:** B (parallel with 03 + 04)
**spec source:** `.yagi-autobuild/phase-1-2-spec.md` §"Subtask Breakdown / 02"

---

## Executor preamble (READ FIRST, then execute)

You are an Executor for ONE task. Constraints:

1. Read ONLY this file plus the two files you are modifying (`messages/ko.json`, `messages/en.json`). Do NOT read `task_plan.md`, `phase-1-2-spec.md`, or any other subtask file.
2. Before editing, you MAY also read `/CLAUDE.md` and `.claude/skills/yagi-nextjs-conventions/SKILL.md` for project conventions (subtask 01 created these).
3. Use only Read, Edit, Write tools. No Bash needed.
4. Working directory: `C:\Users\yout4\yagi-studio\yagi-workshop`.
5. If anything blocks you, write `BLOCKED: <reason>` in `results/02_i18n_namespaces.md` and stop.
6. When done, write `.yagi-autobuild/results/02_i18n_namespaces.md` with files modified, key counts per namespace, sample translation pairs (3 ko/en pairs across different namespaces), and acceptance check.

## Task

Add 6 new top-level namespaces to BOTH `messages/ko.json` and `messages/en.json`:
`projects`, `refs`, `threads`, `settings`, `admin`, `errors`.

**CRITICAL:** Both files must have **identical key trees**. Same nesting, same key names, only the values differ (Korean vs English).

**Preserve all existing namespaces** (home, brand, common, auth, onboarding, nav, dashboard) and their keys exactly. Add the new namespaces alongside them — do NOT replace, reorder, or remove anything.

### Namespace 1 — `projects`

Required keys:

```
list_title, direct_tab, contest_tab, new, empty_direct, empty_direct_sub,
empty_contest, brief_step, refs_step, review_step, title_label, title_ph,
description_label, description_ph, brand_label, brand_none, tone_label, tone_ph,
deliverable_types_label, deliverable_film, deliverable_still, deliverable_campaign,
deliverable_editorial, deliverable_social, deliverable_other, budget_label, budget_ph,
delivery_label, save_draft, submit_project, status_draft, status_submitted,
status_in_discovery, status_in_production, status_in_revision, status_delivered,
status_approved, status_archived, transition_submit, transition_start_discovery,
transition_start_production, transition_request_revision, transition_mark_delivered,
transition_approve, transition_archive
```

### Namespace 2 — `refs`

```
title, add_image, add_url, url_ph, url_fetching, url_failed, caption_ph, drop_hint, remove
```

### Namespace 3 — `threads`

```
title, new_message_ph, send, visibility_shared, visibility_internal, internal_badge, empty, attach
```

### Namespace 4 — `settings`

```
title, profile_tab, workspace_tab, team_tab, billing_tab, profile_save, avatar_upload,
workspace_logo_upload, tax_id_label, tax_id_ph, tax_invoice_email_label,
team_invite, team_remove, team_role_admin, team_role_member
```

### Namespace 5 — `admin`

```
title, projects_tab, workspaces_tab, cross_workspace_projects, filter_status,
filter_workspace, filter_all
```

### Namespace 6 — `errors`

```
generic, not_found, unauthorized, validation
```

## Tone guide

**Korean (`messages/ko.json`):**
- 존댓말 throughout (e.g., `입력해 주세요`, `저장해 주세요`).
- Sentence case (no all-caps).
- Use natural Korean — avoid literal English translations.
- For deliverable types use established Korean industry terms (필름, 스틸, 캠페인, 에디토리얼, 소셜, 기타).
- Status values: 초안 / 제출됨 / 디스커버리 / 프로덕션 / 수정 요청 / 납품 완료 / 승인됨 / 보관됨.
- Transition button labels are imperative (예: `제출하기`, `프로덕션 시작`, `납품 처리`).

**English (`messages/en.json`):**
- Editorial tone, sentence case for body text.
- CTAs (button labels like `New project`, `Save draft`, `Submit project`) stay sentence case in the JSON value — the UI applies `uppercase tracking-[0.12em]` via Tailwind. Do NOT pre-uppercase.
- Status values: Draft / Submitted / In discovery / In production / In revision / Delivered / Approved / Archived.

## JSON formatting

- 2-space indent (match existing file style — verify before writing).
- UTF-8, no BOM, LF line endings if the existing files use LF (preserve whatever is already in use).
- Trailing newline at end of file (preserve existing convention).
- Keys are unquoted-name-style standard JSON (`"key": "value"`).

Use the Read tool first to inspect the current shape of both files (indent depth, namespace ordering, trailing comma habits) and conform to it.

## Acceptance criteria

1. `messages/ko.json` and `messages/en.json` are valid JSON (parseable).
2. Both files contain ALL existing namespaces unchanged.
3. Both files contain all 6 new namespaces with the exact key sets listed above.
4. Both files have identical nested key structures (a script comparing key paths would return zero differences).
5. Korean values are 존댓말 sentence case; English values are editorial sentence case (CTAs not pre-uppercased).
6. Total new keys per file: projects (44) + refs (9) + threads (8) + settings (16) + admin (7) + errors (4) = **88 new keys**.

## Result file format (`results/02_i18n_namespaces.md`)

```markdown
# Subtask 02 result
status: complete
files_modified:
  - messages/ko.json (NN bytes, +88 keys)
  - messages/en.json (NN bytes, +88 keys)
new_keys_per_namespace:
  projects: 44
  refs: 9
  threads: 8
  settings: 16
  admin: 7
  errors: 4
sample_translations:
  - projects.new            → ko: "새 프로젝트"           en: "New project"
  - threads.visibility_internal → ko: "내부 (YAGI 전용)"   en: "Internal (YAGI only)"
  - errors.unauthorized     → ko: "권한이 없습니다"        en: "You don't have permission."
acceptance: PASS — JSON valid in both files, key trees identical, all 88 new keys present, tone correct per spec.
```

If blocked: `status: blocked` + `reason: <one line>`.
