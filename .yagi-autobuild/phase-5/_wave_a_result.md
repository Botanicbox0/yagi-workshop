# Phase 5 Wave A — RESULT (SHIPPED)

> Wave A = Foundation. 3 task parallel via 3 sonnet-4.6 teammates +
> Builder-coordinated K-05 / sub_4 patch / prod apply. yagi confirmed
> all 3 migrations applied + verified 2026-05-04.

- **Date**: 2026-05-04
- **Branch**: `g-b-10-phase-5` @ `f25c9c9`
- **Status**: SHIPPED in repo + 3 prod migrations applied. Ready for
  Wave B.

## Sub-task summary

| Task | Sub | Commit | Scope |
|---|---|---|---|
| task_01 | — | `cfab47d` | `briefing_documents` schema + 4 RLS + 2 indexes (95-line migration). Sonnet teammate. |
| task_02 | — | `457ec47` (+ `d1e415e` doc) | Data migration `attached_pdfs/urls` jsonb → `briefing_documents`. **SPEC correction**: source = `project_boards`, not `projects` (KICKOFF wrong column location, teammate verified + corrected). DO/EXISTS idempotency sentinel. |
| task_03 | sub_3a | `1e11e6a` | `interested_in_twin boolean DEFAULT false` + `twin_intent` DEPRECATED comment. zod field added; INSERT writes both side-by-side. |
| task_03 | sub_3b | `a2b53ab` | `projects.status.*` 6-key i18n cleanup (ko + en). DB enum unchanged. **Audit gap**: existing consumers use `projects.status_<value>` flat keys, not the new nested form — registered as FU-Phase5-2, Wave B picks reconciliation strategy. |
| task_03 | sub_3c | `2f64b6f` | Onboarding /brand placeholder + Twin helper copy (Option A only). 2 new i18n keys. Layout unchanged. |
| sub_4 patch | — | `e46385d` | Codex K-05 LOOP 1 closure: F1+F2 (HIGH-B RLS scope) inline-fixed via workspace_members JOIN in INSERT/UPDATE/DELETE; F3 (MED-B column-grant lockdown) mirror of sub_03f_2 pattern with REVOKE table UPDATE + GRANT (note, category) only + 12 has_*_privilege assertions. F4 (MED-C) sanity-net assertion in data-migration DO block + FU-Phase5-1 deferred. |
| sub_4 LOOP 2 closure | — | `f25c9c9` | LOOP 2 PARTIAL — assertion deny list extended with 6 missed columns (filename, size_bytes, mime_type, provider, thumbnail_url, oembed_html). KICKOFF "single-line miss = inline fix only" applied. |

## Codex K-05 history

| Loop | Tier | Tokens | Verdict | Findings |
|---|---|---|---|---|
| LOOP 1 | 1 high | 71,740 | needs-attention | F1 HIGH-B + F2 HIGH-B + F3 MED-B + F4 MED-C |
| LOOP 2 | 3 low (single-file) | 14,822 | needs-attention | F1 / F2 CLOSED, F3 PARTIAL (6-col enum miss) |
| LOOP 2 PARTIAL → Builder verify | — | — | CLEAN (after f25c9c9) | per KICKOFF v1.2 §LOOP cycle 절감 |

**Total quota cost**: 86,562 tokens / 2 Codex messages. Under 1% of a Plus tier 5h window. Tier 1 high reasoning was used only on the initial deep pass; the verify loop ran Tier 3 low on a single file.

## Prod migration apply

3 migrations applied to `jvamvbpxnztynsccvcmr` (yagi-workshop) via MCP, 2026-05-04, in order:

1. `20260504052541_phase_5_briefing_documents.sql` — 18 has_*_privilege assertions all PASSED (table-level UPDATE deny + 2 col grants + 14 col denies + 1 created_at deny). 4 RLS policies live.
2. `20260504053000_phase_5_interested_in_twin.sql` — `interested_in_twin boolean NOT NULL DEFAULT false` + DEPRECATED comment on `twin_intent`.
3. `20260504053641_phase_5_migrate_attached_to_briefing_documents.sql` — Idempotency guard fired on empty table (INSERT proceeded). 0 rows inserted (prod source elements 0). F4 safety-net assertion trivially passed.

### Post-apply verify (yagi confirmed 8/8 PASS)

- `briefing_documents` row count: 0
- `has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE')`: false
- `has_column_privilege(... note, UPDATE)`: true
- `has_column_privilege(... category, UPDATE)`: true
- `has_column_privilege(... created_at, UPDATE)`: false
- RLS policy count: 4
- `projects.interested_in_twin`: boolean NOT NULL DEFAULT false
- `projects.twin_intent` comment: DEPRECATED tagged

### Advisor (security) post-apply

- 0 NEW HIGH-A / HIGH-B from sub_4. All baseline.
- Pre-existing baseline WARN inventory (all FU-deferred per scale-aware rule):
  - `function_search_path_mutable`: 6 (FU-C5d-09 + 5 others) — Phase 5 ff-merge 직전 또는 별도 lint-sweep migration 으로 batch fix candidate
  - `extension_in_public` (pg_net, citext): Supabase default
  - `rls_policy_always_true` (ws_create_any_auth INSERT): bootstrap design intentional
  - `public_bucket_allows_listing` (brand-logos, workspace-logos): public bucket intentional
  - anon/authenticated SECURITY DEFINER executable: ~50 (Supabase RPC default)
  - `auth_leaked_password_protection`: dashboard toggle

## Followups registered

- **FU-Phase5-1** — data migration FK forward-risk for stale uploader/added_by UUIDs. Production currently 0-row, so no immediate exposure; safety-net assertion catches future drift. Phase 5.1 cleanup or Wave-D-end batch sweep.
- **FU-Phase5-2** — `projects.status` flat-key vs nested-key consumer migration. Wave B reconciles either by adding flat aliases (status_routing / status_approval_pending) or migrating consumers (StatusBadge, dashboard) to nested.

## tsc / lint / build state

- `pnpm exec tsc --noEmit`: exit 0
- `pnpm lint`: 26563 problems (3155 errors / 23408 warnings) = baseline-3155 (no regression)
- `pnpm build`: exit 0

## Wave A acceptance gate ✅

- 3 prod migrations applied + verified ✅
- Codex K-05 Tier 1 LOOP 0 HIGH-A residual ✅
- Status display i18n applied ✅
- Onboarding /brand polish (Option A) applied ✅
- tsc / lint / build all clean ✅
- yagi visual review explicit confirm 2026-05-04 ✅

## Wave B entry

KICKOFF v1.2 §Wave B = Briefing Canvas (sequential, lead Builder, Day 4-10):

- task_04 — Stage 1 — Intent form (3-col grid, K-05 skip, lead Builder direct)
- task_05 — Stage 2 — Asset workspace (기획서 vs 레퍼런스 분리 + budget/timeline sidebar, K-05 mandatory Tier 1 for server actions)
- task_06 — Stage 3 — Review + submit (K-05 skip)

Each stage = yagi visual review sub-gate.

Cumulative phase progress: ~3 / 15-18 days. Wave B = 7 days budget.
