# Wave C.5a sub_01 — wizard step3 errors i18n drift audit

**Date**: 2026-05-01
**Scope**: `src/app/[locale]/app/projects/new/` + `messages/{ko,en}.json` `projects.wizard.*`

## Drift detected (1 site)

`new-project-wizard.tsx` submit-failure toast referenced 3 keys under
`wizard.step3.errors.*`, but the actual JSON entries (added in Wave A
task_02) live at `wizard.errors.*` — sibling of `wizard.step3` /
`wizard.field` / `wizard.summary`, NOT nested under step3.

| Code reference (before) | JSON path (actual) | Status |
|---|---|---|
| `wizard.step3.errors.unauthenticated` | `projects.wizard.errors.unauthenticated` | DRIFT — fixed |
| `wizard.step3.errors.submit_validation` | `projects.wizard.errors.submit_validation` | DRIFT — fixed |
| `wizard.step3.errors.submit_failed` | `projects.wizard.errors.submit_failed` | DRIFT — fixed |

The other 4 wizard validation toasts (`name_required`,
`description_required`, `deliverable_required`, `budget_required` at
lines 526/548/656/676) already use the correct `wizard.errors.*` path.

## Fix

`src/app/[locale]/app/projects/new/new-project-wizard.tsx` lines 857-862:
removed `.step3` segment from the 3 errorKey branches. JSON files
unchanged (keys already present).

## Why the drift wasn't caught earlier

Wave A task_02 placed the keys at `wizard.errors.*` (per the existing
sibling validation errors), but the new toast logic was authored from
the spec wording "step3 submit errors" — leading the dot-path to mirror
the spec language rather than the actual JSON structure. tsc does not
catch missing i18n keys because `t(string)` accepts any string. Manual
submit reproducer would have shown the raw key in the toast.

## i18n keys verified present (no add needed)

`projects.wizard.errors.{unauthenticated,submit_validation,submit_failed}`
present in both `messages/ko.json` (lines 692-694) and `messages/en.json`
(lines 692-694). KO + EN parity confirmed.

## Acceptance

- [x] Code references match JSON paths
- [x] No new i18n keys added
- [x] /ko + /en parity preserved
- [x] No tsc-relevant change (string literal swap only)
