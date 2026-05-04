Reading additional input from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: medium
reasoning summaries: none
session id: 019df1e6-01d6-7dc3-a059-c75a88679ec9
--------
user
Phase 5 Wave B task_04 v3 K-05 (Tier 2 medium). Two changes in scope: a new projects-table migration + a new server action.

Files in scope (2):
- supabase/migrations/20260504162550_phase_5_briefing_canvas_metadata_columns.sql (NEW — adds 9 columns + 1 CHECK constraint to projects)
- src/app/[locale]/app/projects/new/briefing-actions.ts (NEW — ensureBriefingDraftProject server action)

Out of scope (don't review): briefing-canvas.tsx wrapper, briefing-canvas-step-1.tsx, i18n keys. UI surfaces only — no RLS / column writes / cross-tenant risk beyond what the server action gates.

Builder context:
- yagi locked Schema Option A (typed columns on projects, not jsonb metadata) for sidebar fields. Rationale: admin queue / filtering / sorting will hit these directly.
- Migration adds: purpose / channels / mood_keywords (all text[] NOT NULL DEFAULT '{}') + mood_keywords_free / visual_ratio / visual_ratio_custom / target_audience / additional_notes / has_plan (text scalars). Plus a CHECK on has_plan accepting only have/want_proposal/undecided/NULL.
- Server action ensureBriefingDraftProject splits two paths: UPDATE existing draft (verify created_by + status='draft' + workspace_id matches active resolver) or INSERT new draft (RLS projects_insert policy gates).
- The action casts `(supabase as any)` for INSERT/UPDATE because the new `purpose` text[] column is not in the auto-generated database.types.ts yet. Same pattern Phase 3.0+ used.

Three focus areas:

1. **Migration safety** — text[] NOT NULL DEFAULT '{}' on existing rows: Postgres back-fills the default in a constant-time metadata operation (no table scan). has_plan CHECK accepts NULL — verify that's intentional (it is — represents "not yet answered" in the UI). Confirm column comments are not lost on future supabase types regen.

2. **ensureBriefingDraftProject UPDATE path authorization** — order of checks: SELECT row → if not found return not_found; if created_by != caller return forbidden; if status != 'draft' return forbidden; if workspace_id != active.id return forbidden. Then UPDATE with explicit `eq('created_by', user.id)` AND `eq('status', 'draft')` clauses as defense-in-depth. Verify no path lets a non-creator UPDATE; verify no path lets a stale (non-draft) project's title get clobbered.

3. **ensureBriefingDraftProject INSERT path** — leans entirely on the projects_insert RLS policy (Phase 3.0 hotfix extended this to is_ws_member). The action passes workspace_id from resolveActiveWorkspace which already verifies membership. Caller can specify nothing about workspace_id directly — the server resolves it. Verify the `purpose` text[] column gets correctly inserted (cast through `any`) and that the CHECK constraint on has_plan doesn't trip the INSERT (we don't write has_plan in INSERT — it stays NULL by default).

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding (no priors to track for this surface):
[FINDING N] CLASS (HIGH-A | HIGH-B | HIGH-C | MED-A | MED-B | MED-C | LOW): file:line — short description — recommended fix

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — task_04 v3 ready for prod migration apply after yagi GO."

End with one-line summary for run log.
codex
I’ll review only the two scoped files with a code-review lens, then verify the migration/action behavior against the three focus areas.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504162550_phase_5_briefing_canvas_metadata_columns.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'Get-ChildItem -Path . -Force | Select-Object -ExpandProperty FullName' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 440ms:
-- Phase 5 Wave B task_04 v3 ??projects briefing-canvas metadata columns
--
-- Schema decision: Option A (typed columns on projects) per yagi 2026-05-04.
-- Rationale (yagi verbatim): admin queue / filtering / sorting / project
-- overview will reach for these fields directly; jsonb adds friction for
-- those use cases relative to typed columns. Trade-off accepted: 9 new
-- columns on projects vs the simpler "single jsonb metadata" alternative.
--
-- Field map (Step 2 sidebar from KICKOFF v1.3 spec, plus Step 1 multi):
--   purpose                text[]   ??Step 1 multi-select
--   channels               text[]   ??Step 2 sidebar multi-select
--   mood_keywords          text[]   ??Step 2 sidebar preset multi-select
--   mood_keywords_free     text     ??Step 2 sidebar free-text complement
--   visual_ratio           text     ??Step 2 sidebar single-select chip
--   visual_ratio_custom    text     ??populated only when visual_ratio = 'custom'
--   target_audience        text     ??Step 2 sidebar free-text
--   additional_notes       text     ??Step 2 sidebar free-text
--   has_plan               text     ??Step 2 sidebar (have/want_proposal/undecided)
--
-- Existing columns kept as-is (NOT touched by this migration):
--   title (Step 1 name), brief (Step 1 description), deliverable_types
--   (Step 1 multi), budget_band (Step 2 sidebar), target_delivery_at
--   (Step 2 sidebar), meeting_preferred_at (Step 2 sidebar),
--   interested_in_twin (Wave A sub_3a), twin_intent (DEPRECATED, kept).
--
-- Defaults: text[] columns default to '{}' (empty array, NOT NULL) so
-- existing rows back-fill cleanly without a separate UPDATE pass. text
-- scalars default to NULL.
--
-- has_plan CHECK constraint mirrors the zod enum on the client side
-- (have / want_proposal / undecided) so DB rejects malformed values
-- regardless of caller (server action, admin SQL, future ingestion).

ALTER TABLE projects
  ADD COLUMN purpose text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN channels text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN mood_keywords text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN mood_keywords_free text,
  ADD COLUMN visual_ratio text,
  ADD COLUMN visual_ratio_custom text,
  ADD COLUMN target_audience text,
  ADD COLUMN additional_notes text,
  ADD COLUMN has_plan text;

ALTER TABLE projects
  ADD CONSTRAINT projects_has_plan_check
  CHECK (has_plan IS NULL OR has_plan IN ('have', 'want_proposal', 'undecided'));

COMMENT ON COLUMN projects.purpose IS
  'Phase 5 Wave B task_04 v3 ??Step 1 multi-select content purpose. text[] of preset enum keys (sns_ad/branding/sns_channel/event/offline/other) plus arbitrary user-typed values.';
COMMENT ON COLUMN projects.channels IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar multi-select target channels (instagram/youtube/tiktok/facebook/website/offline/other).';
COMMENT ON COLUMN projects.mood_keywords IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar preset multi-select mood (emotional/sophisticated/humorous/dynamic/minimal/warm/luxurious/trendy/friendly).';
COMMENT ON COLUMN projects.mood_keywords_free IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text mood input that complements mood_keywords[]. Comma-separated user input.';
COMMENT ON COLUMN projects.visual_ratio IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar visual aspect ratio chip (1_1/16_9/9_16/4_5/239_1/custom).';
COMMENT ON COLUMN projects.visual_ratio_custom IS
  'Phase 5 Wave B task_04 v3 ??populated only when visual_ratio = ''custom''.';
COMMENT ON COLUMN projects.target_audience IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text target audience description.';
COMMENT ON COLUMN projects.additional_notes IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text catch-all for anything else the briefing user wants to flag.';
COMMENT ON COLUMN projects.has_plan IS
  'Phase 5 Wave B task_04 v3 ??Step 2 sidebar plan availability (have/want_proposal/undecided). NULL means not yet answered.';

 succeeded in 408ms:
"use server";

// =============================================================================
// Phase 5 Wave B task_04 v3 ??Briefing Canvas server actions
//
// Step 1 ??Step 2 transition runs ensureBriefingDraftProject. The action
// either:
//   - INSERTs a new projects row with status='draft' (new briefing flow)
//   - UPDATEs an existing draft owned by the caller (when sessionStorage
//     carried a project_id forward; user navigated back+forward, or
//     hydrated the canvas after browser restart)
//
// Step 2 + Step 3 actions land in task_05 (autosave + asset upload) and
// task_06 (submitBriefingAction = status flip to 'in_review') per
// task_plan.md Wave B section.
//
// Authorization model (Phase 4.x sub_03f_5 F4 pattern reuse):
//   - createSupabaseServer() (user-scoped)
//   - resolveActiveWorkspace(user.id) for workspace_id
//   - on UPDATE path, re-verify (created_by = user.id, status='draft',
//     workspace_id matches active) before any write
//   - INSERT path goes through projects_insert RLS policy (Phase 3.0
//     hotfix already extended this to is_ws_member, not is_ws_admin)
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

// ---------------------------------------------------------------------------
// Step 1 input schema
//
// Matches stage1Schema in briefing-canvas.tsx but trimmed to the v3 minimal
// 3-field set + name. Optional projectId allows back-and-forward navigation
// to UPDATE an existing draft instead of orphaning it.
// ---------------------------------------------------------------------------

const ensureBriefingDraftInput = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(15),
  purpose: z
    .array(z.string().trim().min(1).max(60))
    .min(1)
    .max(15),
  description: z.string().trim().max(500).optional().nullable(),
});

export type EnsureBriefingDraftInput = z.input<typeof ensureBriefingDraftInput>;

export type EnsureBriefingDraftResult =
  | { ok: true; projectId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "forbidden"
        | "not_found"
        | "db";
      message?: string;
    };

export async function ensureBriefingDraftProject(
  input: unknown,
): Promise<EnsureBriefingDraftResult> {
  const parsed = ensureBriefingDraftInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    return { ok: false, error: "no_workspace" };
  }

  // The `purpose` text[] column is added by migration 20260504162550 and is
  // not in the auto-generated database.types.ts yet. Cast to any for the
  // INSERT/UPDATE call sites only ??same pattern Phase 3.0+ uses for
  // newly-added columns awaiting the supabase gen types refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new Phase 5 columns not in generated types
  const sb = supabase as any;

  // ---------- UPDATE path ----------
  if (data.projectId) {
    const { data: existing, error: selErr } = await sb
      .from("projects")
      .select("id, status, created_by, workspace_id")
      .eq("id", data.projectId)
      .maybeSingle();
    if (selErr) {
      console.error("[ensureBriefingDraftProject] SELECT error:", selErr);
      return { ok: false, error: "db", message: selErr.message };
    }
    if (!existing) {
      return { ok: false, error: "not_found" };
    }
    if (existing.created_by !== user.id) {
      return { ok: false, error: "forbidden" };
    }
    if (existing.status !== "draft") {
      return {
        ok: false,
        error: "forbidden",
        message: "project is no longer draft",
      };
    }
    if (existing.workspace_id !== active.id) {
      return {
        ok: false,
        error: "forbidden",
        message: "workspace mismatch",
      };
    }

    const { error: updErr } = await sb
      .from("projects")
      .update({
        title: data.name,
        deliverable_types: data.deliverable_types,
        purpose: data.purpose,
        brief: data.description ?? null,
      })
      .eq("id", data.projectId)
      .eq("created_by", user.id)
      .eq("status", "draft");
    if (updErr) {
      console.error("[ensureBriefingDraftProject] UPDATE error:", updErr);
      return { ok: false, error: "db", message: updErr.message };
    }

    revalidatePath("/[locale]/app/projects", "page");
    return { ok: true, projectId: data.projectId };
  }

  // ---------- INSERT path ----------
  const { data: project, error: insErr } = await sb
    .from("projects")
    .insert({
      workspace_id: active.id,
      created_by: user.id,
      project_type: "direct_commission" as const,
      kind: "direct" as const,
      status: "draft" as const,
      intake_mode: "brief" as const,
      title: data.name,
      deliverable_types: data.deliverable_types,
      purpose: data.purpose,
      brief: data.description ?? null,
    })
    .select("id")
    .single();
  if (insErr || !project) {
    console.error(
      "[ensureBriefingDraftProject] INSERT error:",
      insErr,
    );
    return {
      ok: false,
      error: "db",
      message: insErr?.message ?? "insert failed",
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, projectId: project.id };
}

 succeeded in 457ms:
 M messages/en.json
 M messages/ko.json
 D src/app/[locale]/app/projects/new/briefing-canvas-stage-1.tsx
 M src/app/[locale]/app/projects/new/briefing-canvas.tsx
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop1.md
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop2.md
?? .yagi-autobuild/phase-5/_wave_a_task_01_result.md
?? .yagi-autobuild/phase-5/_wave_b_task_04v3_codex_review.md
?? src/app/[locale]/app/projects/new/briefing-actions.ts
?? src/app/[locale]/app/projects/new/briefing-canvas-step-1.tsx
?? supabase/migrations/20260504162550_phase_5_briefing_canvas_metadata_columns.sql

 succeeded in 455ms:
C:\Users\yout4\yagi-studio\yagi-workshop\.claude
C:\Users\yout4\yagi-studio\yagi-workshop\.content-collections
C:\Users\yout4\yagi-studio\yagi-workshop\.git
C:\Users\yout4\yagi-studio\yagi-workshop\.husky
C:\Users\yout4\yagi-studio\yagi-workshop\.next
C:\Users\yout4\yagi-studio\yagi-workshop\.yagi-autobuild
C:\Users\yout4\yagi-studio\yagi-workshop\content
C:\Users\yout4\yagi-studio\yagi-workshop\docs
C:\Users\yout4\yagi-studio\yagi-workshop\e2e
C:\Users\yout4\yagi-studio\yagi-workshop\messages
C:\Users\yout4\yagi-studio\yagi-workshop\node_modules
C:\Users\yout4\yagi-studio\yagi-workshop\public
C:\Users\yout4\yagi-studio\yagi-workshop\scripts
C:\Users\yout4\yagi-studio\yagi-workshop\src
C:\Users\yout4\yagi-studio\yagi-workshop\supabase
C:\Users\yout4\yagi-studio\yagi-workshop\tests
C:\Users\yout4\yagi-studio\yagi-workshop\.env.local
C:\Users\yout4\yagi-studio\yagi-workshop\.env.local.example
C:\Users\yout4\yagi-studio\yagi-workshop\.gitignore
C:\Users\yout4\yagi-studio\yagi-workshop\ARCHITECTURE.md
C:\Users\yout4\yagi-studio\yagi-workshop\CLAUDE.md
C:\Users\yout4\yagi-studio\yagi-workshop\components.json
C:\Users\yout4\yagi-studio\yagi-workshop\content-collections.ts
C:\Users\yout4\yagi-studio\yagi-workshop\eslint.config.mjs
C:\Users\yout4\yagi-studio\yagi-workshop\next-env.d.ts
C:\Users\yout4\yagi-studio\yagi-workshop\next.config.ts
C:\Users\yout4\yagi-studio\yagi-workshop\package.json
C:\Users\yout4\yagi-studio\yagi-workshop\playwright.config.ts
C:\Users\yout4\yagi-studio\yagi-workshop\pnpm-lock.yaml
C:\Users\yout4\yagi-studio\yagi-workshop\postcss.config.mjs
C:\Users\yout4\yagi-studio\yagi-workshop\README.md
C:\Users\yout4\yagi-studio\yagi-workshop\tailwind.config.ts
C:\Users\yout4\yagi-studio\yagi-workshop\tsconfig.json
C:\Users\yout4\yagi-studio\yagi-workshop\tsconfig.tsbuildinfo

codex
The two files are present as new files. I’m checking the action against the existing workspace resolver and project policies just enough to validate the scoped auth assumptions, without reviewing unrelated UI files.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "function resolveActiveWorkspace|export async function resolveActiveWorkspace|resolveActiveWorkspace" src/lib supabase -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "projects_insert|CREATE POLICY.*projects|ON projects|ALTER TABLE projects ENABLE ROW LEVEL SECURITY|is_ws_member|is_ws_admin" supabase/migrations -S' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260504162550_phase_5_briefing_canvas_metadata_columns.sql' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-actions.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 359ms:
   1: -- Phase 5 Wave B task_04 v3 ??projects briefing-canvas metadata columns
   2: --
   3: -- Schema decision: Option A (typed columns on projects) per yagi 2026-05-04.
   4: -- Rationale (yagi verbatim): admin queue / filtering / sorting / project
   5: -- overview will reach for these fields directly; jsonb adds friction for
   6: -- those use cases relative to typed columns. Trade-off accepted: 9 new
   7: -- columns on projects vs the simpler "single jsonb metadata" alternative.
   8: --
   9: -- Field map (Step 2 sidebar from KICKOFF v1.3 spec, plus Step 1 multi):
  10: --   purpose                text[]   ??Step 1 multi-select
  11: --   channels               text[]   ??Step 2 sidebar multi-select
  12: --   mood_keywords          text[]   ??Step 2 sidebar preset multi-select
  13: --   mood_keywords_free     text     ??Step 2 sidebar free-text complement
  14: --   visual_ratio           text     ??Step 2 sidebar single-select chip
  15: --   visual_ratio_custom    text     ??populated only when visual_ratio = 'custom'
  16: --   target_audience        text     ??Step 2 sidebar free-text
  17: --   additional_notes       text     ??Step 2 sidebar free-text
  18: --   has_plan               text     ??Step 2 sidebar (have/want_proposal/undecided)
  19: --
  20: -- Existing columns kept as-is (NOT touched by this migration):
  21: --   title (Step 1 name), brief (Step 1 description), deliverable_types
  22: --   (Step 1 multi), budget_band (Step 2 sidebar), target_delivery_at
  23: --   (Step 2 sidebar), meeting_preferred_at (Step 2 sidebar),
  24: --   interested_in_twin (Wave A sub_3a), twin_intent (DEPRECATED, kept).
  25: --
  26: -- Defaults: text[] columns default to '{}' (empty array, NOT NULL) so
  27: -- existing rows back-fill cleanly without a separate UPDATE pass. text
  28: -- scalars default to NULL.
  29: --
  30: -- has_plan CHECK constraint mirrors the zod enum on the client side
  31: -- (have / want_proposal / undecided) so DB rejects malformed values
  32: -- regardless of caller (server action, admin SQL, future ingestion).
  33: 
  34: ALTER TABLE projects
  35:   ADD COLUMN purpose text[] NOT NULL DEFAULT '{}'::text[],
  36:   ADD COLUMN channels text[] NOT NULL DEFAULT '{}'::text[],
  37:   ADD COLUMN mood_keywords text[] NOT NULL DEFAULT '{}'::text[],
  38:   ADD COLUMN mood_keywords_free text,
  39:   ADD COLUMN visual_ratio text,
  40:   ADD COLUMN visual_ratio_custom text,
  41:   ADD COLUMN target_audience text,
  42:   ADD COLUMN additional_notes text,
  43:   ADD COLUMN has_plan text;
  44: 
  45: ALTER TABLE projects
  46:   ADD CONSTRAINT projects_has_plan_check
  47:   CHECK (has_plan IS NULL OR has_plan IN ('have', 'want_proposal', 'undecided'));
  48: 
  49: COMMENT ON COLUMN projects.purpose IS
  50:   'Phase 5 Wave B task_04 v3 ??Step 1 multi-select content purpose. text[] of preset enum keys (sns_ad/branding/sns_channel/event/offline/other) plus arbitrary user-typed values.';
  51: COMMENT ON COLUMN projects.channels IS
  52:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar multi-select target channels (instagram/youtube/tiktok/facebook/website/offline/other).';
  53: COMMENT ON COLUMN projects.mood_keywords IS
  54:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar preset multi-select mood (emotional/sophisticated/humorous/dynamic/minimal/warm/luxurious/trendy/friendly).';
  55: COMMENT ON COLUMN projects.mood_keywords_free IS
  56:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text mood input that complements mood_keywords[]. Comma-separated user input.';
  57: COMMENT ON COLUMN projects.visual_ratio IS
  58:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar visual aspect ratio chip (1_1/16_9/9_16/4_5/239_1/custom).';
  59: COMMENT ON COLUMN projects.visual_ratio_custom IS
  60:   'Phase 5 Wave B task_04 v3 ??populated only when visual_ratio = ''custom''.';
  61: COMMENT ON COLUMN projects.target_audience IS
  62:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text target audience description.';
  63: COMMENT ON COLUMN projects.additional_notes IS
  64:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar free-text catch-all for anything else the briefing user wants to flag.';
  65: COMMENT ON COLUMN projects.has_plan IS
  66:   'Phase 5 Wave B task_04 v3 ??Step 2 sidebar plan availability (have/want_proposal/undecided). NULL means not yet answered.';

 succeeded in 367ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_04 v3 ??Briefing Canvas server actions
   5: //
   6: // Step 1 ??Step 2 transition runs ensureBriefingDraftProject. The action
   7: // either:
   8: //   - INSERTs a new projects row with status='draft' (new briefing flow)
   9: //   - UPDATEs an existing draft owned by the caller (when sessionStorage
  10: //     carried a project_id forward; user navigated back+forward, or
  11: //     hydrated the canvas after browser restart)
  12: //
  13: // Step 2 + Step 3 actions land in task_05 (autosave + asset upload) and
  14: // task_06 (submitBriefingAction = status flip to 'in_review') per
  15: // task_plan.md Wave B section.
  16: //
  17: // Authorization model (Phase 4.x sub_03f_5 F4 pattern reuse):
  18: //   - createSupabaseServer() (user-scoped)
  19: //   - resolveActiveWorkspace(user.id) for workspace_id
  20: //   - on UPDATE path, re-verify (created_by = user.id, status='draft',
  21: //     workspace_id matches active) before any write
  22: //   - INSERT path goes through projects_insert RLS policy (Phase 3.0
  23: //     hotfix already extended this to is_ws_member, not is_ws_admin)
  24: // =============================================================================
  25: 
  26: import { z } from "zod";
  27: import { revalidatePath } from "next/cache";
  28: import { createSupabaseServer } from "@/lib/supabase/server";
  29: import { resolveActiveWorkspace } from "@/lib/workspace/active";
  30: 
  31: // ---------------------------------------------------------------------------
  32: // Step 1 input schema
  33: //
  34: // Matches stage1Schema in briefing-canvas.tsx but trimmed to the v3 minimal
  35: // 3-field set + name. Optional projectId allows back-and-forward navigation
  36: // to UPDATE an existing draft instead of orphaning it.
  37: // ---------------------------------------------------------------------------
  38: 
  39: const ensureBriefingDraftInput = z.object({
  40:   projectId: z.string().uuid().optional(),
  41:   name: z.string().trim().min(1).max(200),
  42:   deliverable_types: z
  43:     .array(z.string().trim().min(1).max(60))
  44:     .min(1)
  45:     .max(15),
  46:   purpose: z
  47:     .array(z.string().trim().min(1).max(60))
  48:     .min(1)
  49:     .max(15),
  50:   description: z.string().trim().max(500).optional().nullable(),
  51: });
  52: 
  53: export type EnsureBriefingDraftInput = z.input<typeof ensureBriefingDraftInput>;
  54: 
  55: export type EnsureBriefingDraftResult =
  56:   | { ok: true; projectId: string }
  57:   | {
  58:       ok: false;
  59:       error:
  60:         | "validation"
  61:         | "unauthenticated"
  62:         | "no_workspace"
  63:         | "forbidden"
  64:         | "not_found"
  65:         | "db";
  66:       message?: string;
  67:     };
  68: 
  69: export async function ensureBriefingDraftProject(
  70:   input: unknown,
  71: ): Promise<EnsureBriefingDraftResult> {
  72:   const parsed = ensureBriefingDraftInput.safeParse(input);
  73:   if (!parsed.success) {
  74:     return { ok: false, error: "validation", message: parsed.error.message };
  75:   }
  76:   const data = parsed.data;
  77: 
  78:   const supabase = await createSupabaseServer();
  79:   const {
  80:     data: { user },
  81:     error: authErr,
  82:   } = await supabase.auth.getUser();
  83:   if (authErr || !user) {
  84:     return { ok: false, error: "unauthenticated" };
  85:   }
  86: 
  87:   const active = await resolveActiveWorkspace(user.id);
  88:   if (!active) {
  89:     return { ok: false, error: "no_workspace" };
  90:   }
  91: 
  92:   // The `purpose` text[] column is added by migration 20260504162550 and is
  93:   // not in the auto-generated database.types.ts yet. Cast to any for the
  94:   // INSERT/UPDATE call sites only ??same pattern Phase 3.0+ uses for
  95:   // newly-added columns awaiting the supabase gen types refresh.
  96:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new Phase 5 columns not in generated types
  97:   const sb = supabase as any;
  98: 
  99:   // ---------- UPDATE path ----------
 100:   if (data.projectId) {
 101:     const { data: existing, error: selErr } = await sb
 102:       .from("projects")
 103:       .select("id, status, created_by, workspace_id")
 104:       .eq("id", data.projectId)
 105:       .maybeSingle();
 106:     if (selErr) {
 107:       console.error("[ensureBriefingDraftProject] SELECT error:", selErr);
 108:       return { ok: false, error: "db", message: selErr.message };
 109:     }
 110:     if (!existing) {
 111:       return { ok: false, error: "not_found" };
 112:     }
 113:     if (existing.created_by !== user.id) {
 114:       return { ok: false, error: "forbidden" };
 115:     }
 116:     if (existing.status !== "draft") {
 117:       return {
 118:         ok: false,
 119:         error: "forbidden",
 120:         message: "project is no longer draft",
 121:       };
 122:     }
 123:     if (existing.workspace_id !== active.id) {
 124:       return {
 125:         ok: false,
 126:         error: "forbidden",
 127:         message: "workspace mismatch",
 128:       };
 129:     }
 130: 
 131:     const { error: updErr } = await sb
 132:       .from("projects")
 133:       .update({
 134:         title: data.name,
 135:         deliverable_types: data.deliverable_types,
 136:         purpose: data.purpose,
 137:         brief: data.description ?? null,
 138:       })
 139:       .eq("id", data.projectId)
 140:       .eq("created_by", user.id)
 141:       .eq("status", "draft");
 142:     if (updErr) {
 143:       console.error("[ensureBriefingDraftProject] UPDATE error:", updErr);
 144:       return { ok: false, error: "db", message: updErr.message };
 145:     }
 146: 
 147:     revalidatePath("/[locale]/app/projects", "page");
 148:     return { ok: true, projectId: data.projectId };
 149:   }
 150: 
 151:   // ---------- INSERT path ----------
 152:   const { data: project, error: insErr } = await sb
 153:     .from("projects")
 154:     .insert({
 155:       workspace_id: active.id,
 156:       created_by: user.id,
 157:       project_type: "direct_commission" as const,
 158:       kind: "direct" as const,
 159:       status: "draft" as const,
 160:       intake_mode: "brief" as const,
 161:       title: data.name,
 162:       deliverable_types: data.deliverable_types,
 163:       purpose: data.purpose,
 164:       brief: data.description ?? null,
 165:     })
 166:     .select("id")
 167:     .single();
 168:   if (insErr || !project) {
 169:     console.error(
 170:       "[ensureBriefingDraftProject] INSERT error:",
 171:       insErr,
 172:     );
 173:     return {
 174:       ok: false,
 175:       error: "db",
 176:       message: insErr?.message ?? "insert failed",
 177:     };
 178:   }
 179: 
 180:   revalidatePath("/[locale]/app/projects", "page");
 181:   return { ok: true, projectId: project.id };
 182: }

 succeeded in 2131ms:
src/lib\app\context.ts:2:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src/lib\app\context.ts:87:  // from resolveActiveWorkspace so the cookie's selection is honoured;
src/lib\app\context.ts:90:  const active = await resolveActiveWorkspace(user.id);
src/lib\workspace\active.ts:101:export async function resolveActiveWorkspace(

 succeeded in 2132ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:151:-- Name: is_ws_admin(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:154:CREATE FUNCTION public.is_ws_admin(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations\20260422120000_phase_2_0_baseline.sql:166:-- Name: is_ws_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:169:CREATE FUNCTION public.is_ws_member(uid uuid, wsid uuid) RETURNS boolean
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4120:-- Name: projects projects_insert; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4172:          WHERE ((p.id = s.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4210:  WHERE ((p.id = showcases.project_id) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4221:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4288:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND public.is_ws_member(auth.uid(), c.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4366:  WHERE ((tm.id = thread_message_attachments.message_id) AND (tm.author_id = auth.uid()) AND public.is_ws_member(auth.uid(), p.workspace_id)))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4447:CREATE POLICY user_roles_self_insert_ws_admin ON public.user_roles FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (role = 'workspace_admin'::text) AND (workspace_id IS NOT NULL) AND public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4628:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4637:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_member(auth.uid(), b.workspace_id)))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4646:  WHERE (((b.id)::text = (storage.foldername(objects.name))[1]) AND public.is_ws_admin(auth.uid(), b.workspace_id)))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4694:  WHERE ((s.id = ((storage.foldername(objects.name))[1])::uuid) AND public.is_ws_member(auth.uid(), p.workspace_id)))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4736:CREATE POLICY "tc-attachments read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4743:CREATE POLICY "tc-attachments write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'team-channel-attachments'::text) AND public.is_yagi_internal_ws(((storage.foldername(name))[1])::uuid) AND public.is_ws_member(auth.uid(), ((storage.foldername(name))[1])::uuid)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4761:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4780:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND public.is_ws_member(auth.uid(), p.workspace_id))))));
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:33:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:62:      public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:10:--   5. RLS policies (per §3.6 — using is_ws_member/is_ws_admin via projects join)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:171:--   - SELECT/UPDATE on brief content: any workspace member (is_ws_member)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:194:          public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:210:          public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:232:        AND public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:239:        AND public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:264:          public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:285:          public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:306:          public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:323:          public.is_ws_member((select auth.uid()), p.workspace_id)
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:73:    OR public.is_ws_member(v_caller, v_workspace_id)
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:383:  v_is_ws_admin        boolean;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:408:  v_is_ws_admin := EXISTS (
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:418:  ELSIF v_is_ws_admin THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:691:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:702:      public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:716:      public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:2:-- Phase 3.0 K-05 LOOP 1 fix — HIGH-A: projects_insert RLS too restrictive
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:20:-- Fix: extend WITH CHECK to is_ws_member (any workspace member), matching
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:21:-- the read policy (projects_read uses is_ws_member). The trigger guard
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:26:DROP POLICY IF EXISTS projects_insert ON public.projects;
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:28:CREATE POLICY projects_insert ON public.projects
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:31:    public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:35:COMMENT ON POLICY projects_insert ON public.projects IS
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:51:CREATE POLICY projects_read ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:55:      public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:65:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:69:      public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:75:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:36:CREATE POLICY projects_update ON public.projects
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:40:      public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:47:      public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:98:    OR public.is_ws_member(v_caller, v_workspace_id)
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:80:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:83:      public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:96:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:104:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:89:    OR public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:98:      public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:128:          OR public.is_ws_admin(auth.uid(), t.workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:13:--   Fix: add `public.is_ws_member(auth.uid(), workspace_id)` to both
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:88:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:92:      AND public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:97:    public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:101:      AND public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:115:      public.is_ws_member(auth.uid(), workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:116:      AND NOT public.is_ws_admin(auth.uid(), workspace_id)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:138:            AND NOT public.is_ws_admin(auth.uid(), t.workspace_id)
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:25:-- The ws_update_admin policy continues to gate row-scope (is_ws_admin

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427164421_phase_3_0_projects_lifecycle.sql' | Select-Object -Skip 660 -First 75" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260428000000_phase_2_8_2_projects_soft_delete.sql' | Select-Object -Skip 35 -First 50" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260428030000_phase_2_8_2_hardening_loop_1.sql' | Select-Object -Skip 30 -First 28" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/workspace/active.ts' | Select-Object -Skip 80 -First 90" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 418ms:
-- =============================================================================
-- Phase 3.0 K-05 LOOP 1 fix ??HIGH-A: projects_insert RLS too restrictive
-- =============================================================================
-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
-- since Phase 2.0 baseline. A regular workspace member (client with
-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
-- authenticated client. This blocks all project submissions from non-admin
-- workspace members ??the primary user class for project submission.
--
-- Root cause: Phase 2.0 baseline wrote the policy for the admin-only project
-- creation path (commission intake). Phase 3.0 submitProjectAction added a
-- client-facing path using the user-scoped client without catching that the
-- INSERT policy would reject non-admin clients.
--
-- In prod today (2026-04-28) workspace_members only has role='admin' rows
-- (2 rows, both Yagi internal), so the bug was masked during all Phase 2.x
-- development. A real client (role='member' or 'viewer') would hit RLS
-- rejection on every project submit.
--
-- Fix: extend WITH CHECK to is_ws_member (any workspace member), matching
-- the read policy (projects_read uses is_ws_member). The trigger guard
-- (trg_guard_projects_status) and is_valid_transition() continue to gate
-- all status transitions independently.
-- =============================================================================

DROP POLICY IF EXISTS projects_insert ON public.projects;

CREATE POLICY projects_insert ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_ws_member(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

COMMENT ON POLICY projects_insert ON public.projects IS
  'K-05 LOOP 1 fix (20260427182456): any workspace member may INSERT projects. '
  'Previously restricted to ws_admin + yagi_admin, blocking all client-role '
  'project submissions. is_yagi_admin path preserved for admin console creates.';

 succeeded in 450ms:
-- itself is updated to also allow the project creator (client) to update
-- their own draft-status project (for wizard autosave), while keeping the
-- ws_admin path for admin-level field edits.
--
-- Note: the trigger guard is the enforcement layer for status column changes.
-- The RLS policy controls which rows are reachable for UPDATE at all.
-- We tighten: client (created_by) may UPDATE own rows where status='draft'
-- and deleted_at IS NULL. Admins retain their existing path.

DROP POLICY IF EXISTS projects_update ON public.projects;

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    -- Client: own project, draft only, not deleted
    (
      auth.uid() = created_by
      AND status = 'draft'
      AND deleted_at IS NULL
    )
    -- ws_admin: any non-deleted project in workspace
    OR (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    -- yagi_admin: unrestricted (including trashed project restore)
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    -- Client: own project, non-deleted only (no writing deleted_at)
    (
      auth.uid() = created_by
      AND deleted_at IS NULL
    )
    -- ws_admin: non-deleted only (cannot self-trash via update)
    OR (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    -- yagi_admin: unrestricted
    OR public.is_yagi_admin(auth.uid())
  );

COMMENT ON POLICY projects_update ON public.projects IS
  'Phase 3.0 ??client may UPDATE own draft rows (wizard autosave). '
  'ws_admin may UPDATE any non-deleted project in workspace. '
  'yagi_admin unrestricted. Status column changes are additionally gated by '
  'trg_guard_projects_status trigger ??only transition_project_status() RPC '
  'or yagi_admin may change projects.status.';

COMMIT;

 succeeded in 464ms:
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

COMMENT ON COLUMN public.projects.deleted_at IS
  'Phase 2.8.2 ??soft-delete timestamp. NULL = active. Non-NULL = trash; '
  'cleared automatically by cron job ''projects-hard-delete-trash'' '
  '3 days after stamping unless the project has invoice rows.';

CREATE INDEX IF NOT EXISTS projects_deleted_at_idx
  ON public.projects (deleted_at)
  WHERE deleted_at IS NOT NULL;

-- 2. RLS ??replace projects_read --------------------------------------

DROP POLICY IF EXISTS projects_read ON public.projects;

CREATE POLICY projects_read ON public.projects
  FOR SELECT TO authenticated
  USING (
    (
      public.is_ws_member(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- 3. RLS ??replace projects_update ------------------------------------

DROP POLICY IF EXISTS projects_update ON public.projects;

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    public.is_ws_admin(auth.uid(), workspace_id)
    OR public.is_yagi_admin(auth.uid())
  );

-- 4. cron ??hard-delete trash older than 3 days ----------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'projects-hard-delete-trash'
  ) THEN

 succeeded in 450ms:

-- 1. projects_update ??tighten WITH CHECK ----------------------------

DROP POLICY IF EXISTS projects_update ON public.projects;

CREATE POLICY projects_update ON public.projects
  FOR UPDATE TO authenticated
  USING (
    (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    (
      public.is_ws_admin(auth.uid(), workspace_id)
      AND deleted_at IS NULL
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- 2. save_brief_version ??refuse trashed projects -------------------

CREATE OR REPLACE FUNCTION public.save_brief_version(
  p_project_id uuid,
  p_label text DEFAULT NULL
)

 succeeded in 457ms:
    if (!r.workspace) continue;
    list.push({
      id: r.workspace.id,
      name: r.workspace.name,
      kind: narrowKind(r.workspace.kind),
    });
  }
  return list;
}

/**
 * Resolve the user's currently-active workspace. Reads the
 * 'yagi_active_workspace' cookie, validates membership against
 * workspace_members, and falls back to the first membership when
 * the cookie is absent, malformed, or doesn't correspond to a
 * valid membership for this user.
 *
 * Returns null when the user has no workspace memberships at all
 * (caller should redirect to /onboarding).
 */
export async function resolveActiveWorkspace(
  userId: string,
): Promise<ActiveWorkspaceMembership | null> {
  const memberships = await listOwnWorkspaces(userId);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieValue && UUID_RE.test(cookieValue)) {
    const match = memberships.find((m) => m.id === cookieValue);
    if (match) return match;
    // Fall through to first-membership fallback. We deliberately do NOT
    // attempt to clear the cookie here -- this resolver is read-only
    // (cookies() in next/headers is read in server components). The
    // setActiveWorkspace server action is the only writer; if a stale
    // cookie keeps arriving here, the resolver silently falls back
    // without leaking which workspace_id the user does NOT belong to.
  }

  return memberships[0];
}

codex
## VERDICT: CLEAN — task_04 v3 ready for prod migration apply after yagi GO.

No NEW HIGH/MED findings.

Validated scoped points: migration adds the 9 columns plus nullable `has_plan` CHECK as intended; column comments are DB comments and are not affected by Supabase type regeneration. UPDATE path blocks non-creators and non-draft rows before write, then repeats `created_by` and `status='draft'` filters. INSERT path resolves `workspace_id` server-side, writes `purpose` through the temporary `any` cast, and leaves `has_plan` NULL so the CHECK does not trip.

Run log summary: task_04 v3 review clean; migration/action are ready after yagi GO.
tokens used
27,484
## VERDICT: CLEAN — task_04 v3 ready for prod migration apply after yagi GO.

No NEW HIGH/MED findings.

Validated scoped points: migration adds the 9 columns plus nullable `has_plan` CHECK as intended; column comments are DB comments and are not affected by Supabase type regeneration. UPDATE path blocks non-creators and non-draft rows before write, then repeats `created_by` and `status='draft'` filters. INSERT path resolves `workspace_id` server-side, writes `purpose` through the temporary `any` cast, and leaves `has_plan` NULL so the CHECK does not trip.

Run log summary: task_04 v3 review clean; migration/action are ready after yagi GO.
