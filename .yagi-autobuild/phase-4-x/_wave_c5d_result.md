# Wave C.5d — RESULT (SHIPPED)

> Wave D task_D1 K-05 finding closure (HIGH-B PKCE template + MED-C
> active-workspace misroute) plus the full sweep that followed —
> 8 active-workspace surfaces, two P1 generic-review fixes, and a
> three-loop K-05 closure on the SECURITY DEFINER + table-level
> grant tightening.

- **Date**: 2026-05-03 → 2026-05-04
- **Branch**: `g-b-9-phase-4` @ `35d56f3`
- **Status**: SHIPPED in repo + 3 prod migrations applied. Awaits
  yagi Supabase Dashboard paste (Magic Link / Reset Password / Change
  Email Address per `_wave_c5d_dashboard_paste_guide.md`) before Wave
  D ff-merge retry.

## Sub-task summary

| sub | Commit | Scope |
|---|---|---|
| sub_01 | `6748f67` | 3 email templates (confirm / magic_link / recovery) rewired to `/auth/confirm?token_hash={{.TokenHash}}&type=<flow>&next={{.RedirectTo}}`; README rewritten with PKCE rationale + accurate type mapping. K-05 LOOP 1 = approve. |
| sub_02 | `aed940e` | `_wave_c5d_dashboard_paste_guide.md` — paste-ready HTML for Magic Link / Reset Password / Change Email Address (deferred); redirect URL allowlist; smoke test plan. K-05 skip (doc only). |
| sub_03a | `7f94965` | `submitProjectAction` Path A (wizard `workspaceId` + memberSet verify) / Path B (draft project workspace + memberSet verify) / Path C (`resolveActiveWorkspace`). |
| sub_03b | `2ba8bd4` | `new/page.tsx` resolves active workspace, passes `activeWorkspaceId` prop to `<NewProjectWizard>`; wizard includes it in the submit payload. |
| sub_03c | `7236ba7` | 5 additional first-membership-fallback surfaces (`createProject`, `ensureDraftProject`, `dashboard/page.tsx`, `projects/page.tsx`, the duplicate `submitProjectAction` legacy path) all switched to `resolveActiveWorkspace`. Scope doc + lesson capture in `_wave_c5d_sub03_scope.md`. |
| sub_03e_1 | `49c50d8` | Projects hub query gains `.eq("workspace_id", activeWorkspaceId)`; early auth + onboarding redirects added. |
| sub_03e_2 | `56afb29` | `fetchAppContext().currentWorkspaceId` sourced from `resolveActiveWorkspace` instead of `workspaces[0]` — settings + downstream consumers auto-fixed. |
| sub_03e_3 | `1c24da5` | `<SupportWidget workspaceId>` uses already-resolved `activeWorkspace.id` from `app/layout.tsx`; cascade audit + lesson in `_wave_c5d_sub03e_cascade_scope.md`. |
| sub_03f_1 | `931703b` | wizard PDF storageKey strips leading slash (matches R2 key); migration extends `add_project_board_pdf` validation allowlist with `board-assets/` prefix. R2 audit at apply time = 0 broken-prefix entries. |
| sub_03f_2 | `c891da2` | `REVOKE UPDATE ON project_boards FROM authenticated` + `GRANT UPDATE (document, updated_at)`; three actions in `board-actions.ts` switch to service-role for asset_index updates. |
| sub_03f_5 | `d40eb7d` | Codex K-05 LOOP 1 closure: F1 PdfAttachmentSchema regex, F2 RPC caller-bound prefixes, F3 seed RPC validates + server-recomputes, F4 owner check (creator + yagi_admin + workspace_admin), F5 has_*_privilege assertions. |
| sub_03f_5 LOOP 2 closure | `8692c01` | Drop legacy 3-arg seed overload, reject non-array attachment payloads, extend denied-column assertions to id / project_id / schema_version / source. |
| sub_03f_5 LOOP 3 final | `35d56f3` | Add the missing `created_at` denied-column assertion (LOOP 4 protocol-exception cycle, yagi-authorised, returned CLEAN). |

## Codex K-05 history

| Loop | Scope | Verdict | Findings | Tokens |
|---|---|---|---|---|
| sub_01 LOOP 1 | working-tree (4 files) | approve | 0 material | n/a (companion) |
| sub_03 LOOP 1 | branch vs main | needs-attention | 2 MED-C (projects list scope, app context workspaces[0]) | n/a (companion) |
| sub_03e LOOP 1 | branch vs main | (companion app-server quota) | n/a | aborted |
| sub_03e LOOP 1 (codex exec direct) | branch vs main | needs-attention | 4 HIGH-B + 1 MED-B (F1-F5) | 628k |
| sub_03f LOOP 2 | post-d40eb7d | needs-attention | F1/F2/F4 closed; F3 reopened (3a + 3b); F5 partial | 315k |
| sub_03f LOOP 3 | post-8692c01 | needs-attention | F3a/F3b closed; F5 partial (created_at) | 97k |
| sub_03f LOOP 4 | post-35d56f3 (protocol exception) | **CLEAN** | F5 closed | 49k |

## Eight active-workspace surfaces (sub_03 cascade)

After all sub_03 + sub_03f commits the active-workspace authority chain
flows like this:

1. **Sidebar switcher** writes `yagi_active_workspace` cookie.
2. **App layout** resolves cookie via `resolveActiveWorkspace`, passes
   the resolved object to sidebar + SupportWidget.
3. **Server context** (`fetchAppContext`) resolves cookie via
   `resolveActiveWorkspace`, exposes as `currentWorkspaceId`.
4. **Project surfaces** (`new/page.tsx`, `new-project-wizard.tsx`,
   `submitProjectAction`, `createProject`, `ensureDraftProject`,
   `dashboard/page.tsx`, `projects/page.tsx`) call
   `resolveActiveWorkspace` directly.

Defense-in-depth: every workspace-scoped INSERT/SELECT goes through
`workspace_members` RLS, so a tampered cookie can at worst bounce off
the resolver's membership re-check.

## Five P1/P2 closures (sub_03f)

| Finding | File | Severity | Status |
|---|---|---|---|
| Wizard PDF storage_key prefix mismatch | `new-project-wizard.tsx:438-440` + `migrations/20260504004349` | P1 (data loss) | CLOSED |
| `REVOKE UPDATE (cols)` no-op while table-level UPDATE granted | `migrations/20260429151821` + `migrations/20260504004536` | P1 (RLS bypass) | CLOSED |
| Brief-mode PDF upload via Server Action body limit | `board-actions.ts:451-454` | P2 (UX / DoS edge) | DEFERRED → FU-C5d-05 |
| `attached_pdf` admin download URL not converted | `asset-list-panel.tsx:172-175` | P2 (admin UX) | DEFERRED → FU-C5d-06 |
| `project_licenses` RLS uses `profiles.role = 'yagi_admin'` | `migrations/20260501000000:73-76` | P2 (admin lockout) | DEFERRED → FU-C5d-07 |
| `save_project_board_document` RPC consolidation | `board-actions.ts` (sub_03f_2 service-role split) | (Builder note) | DEFERRED → FU-C5d-08 |
| `assert_caller_bound_pdf_storage_key` mutable search_path | `migrations/20260504010151` | advisor WARN | DEFERRED → FU-C5d-09 |

## Prod migration apply

3 migrations applied to `jvamvbpxnztynsccvcmr` (yagi-workshop) via MCP
`apply_migration` immediately after LOOP 4 CLEAN, 2026-05-04:

1. `20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql`
2. `20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql`
3. `20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql`

Post-apply assertions (yagi):

- `table_update=false`, `doc_update=true`, `updated_at=true`,
  `asset_index/attached_pdfs/created_at = blocked (false)`
- 5-arg `seed_project_board_from_wizard` only; 3-arg overload
  DROPPED
- 11 column assertions all PASS

Advisor (security):

- 1 NEW WARN: `assert_caller_bound_pdf_storage_key` mutable
  search_path (text-only, exploit surface nil) → FU-C5d-09
- All other entries pre-existing baseline; 0 NEW HIGH-A / HIGH-B

## sub_04 verify

- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → 26,563 problems (3,155 errors, 23,408 warnings) =
  baseline 3155, no regression
- `pnpm build` → exit 0, all routes generated

## Open work before Wave D ff-merge retry

**yagi manual** (per `_wave_c5d_dashboard_paste_guide.md`):

1. Supabase Studio → Authentication → Email Templates →
   - Confirm signup: VERIFY href is in PKCE form (already pasted)
   - Magic Link: PASTE the new HTML
   - Reset Password: PASTE the new HTML
   - Change Email Address: DEFER (no `/account/settings` route yet)
2. URL Configuration → Redirect URLs allowlist verify
3. 4-step smoke test (signup, magic link, recovery, crawler probe)

After smoke PASS, Wave D retry kickoff prompt re-runs Codex K-05 final
LOOP 1 against the full Phase 4.x diff and proceeds to ff-merge.

## STOP

Wave C.5d shipped. Wave D ff-merge entry deferred until yagi
dashboard paste + smoke. No further Builder action until that signal.
