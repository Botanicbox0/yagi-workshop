Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: low
reasoning summaries: none
session id: 019df211-d4a0-7cc0-85ec-e10050f9e083
--------
user
Phase 5 Wave B task_05 v3 sub_5 patch — K-05 LOOP 2 (Tier 3 low). Narrow verify of the LOOP 1 finding closures only.

LOOP 1 was NEEDS-ATTENTION with 5 findings:
- F1 (HIGH): /api/oembed DNS rebinding window between assertSafeUrl resolve and fetch
- F2 (HIGH): addBriefingDocumentAction status='draft' TOCTOU between SELECT and INSERT (RLS INSERT did not enforce parent status)
- F3 (HIGH): updateBriefingDocumentNoteAction had no parent project status check (RLS UPDATE did not enforce parent status)
- F4 (MED): claimed projects_update RLS denied creator+draft branch — Builder verified false positive (current RLS includes that branch). NO ACTION.
- F5 (MED): sidebar autosave AbortController cancels client UI handling but not the dispatched server action; older slow save can commit after newer one.

Files in scope (3 total — verify only):
- src/app/api/oembed/route.ts (rewritten — generic OG scrape REMOVED; allowlist-only YouTube/Vimeo via lib/oembed + Instagram bare provider tag; non-allowlisted hosts return generic with null thumbnail)
- supabase/migrations/20260504180000_phase_5_briefing_documents_status_lockdown.sql (NEW — DROPs and re-CREATEs briefing_documents_insert WITH CHECK + briefing_documents_update USING/WITH CHECK with `p.status = 'draft'` predicate added to the workspace_members JOIN; yagi_admin bypass branch preserved status-agnostic; DO block asserts ins_check / upd_using / upd_check / del_using all reference p.status, table-level UPDATE still revoked, column-level UPDATE on (note, category) still granted)
- src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx (autosave rewritten — single-flight queue: inFlightRef + pendingRef; 5s debounce calls runSave(snapshot) which queues if in-flight or runs and on completion drains pending; no AbortController; lastCommittedRef pattern preserved)

Out of scope (do NOT review): briefing-step2-actions.ts, briefing-canvas-step-2.tsx, briefing-canvas-step-2-brief.tsx, briefing-canvas-step-2-reference.tsx, all i18n keys, Wave A migrations.

LOOP 2 verify only:

1. F1 closure — confirm: no remaining DNS resolution path; no remaining generic-host fetch; only YouTube/Vimeo paths execute fetchVideoMetadata (which talks to provider-trusted oembed endpoints); Instagram path returns synthetic JSON with no fetch; non-allowlisted hosts return synthetic JSON with no fetch. Verify validateUrlShape blocks .local/.internal/localhost prefixes (no DNS — pure shape check). Confirm no new SSRF vector introduced by the lazy import of @/lib/oembed.

2. F2+F3 closure — confirm: briefing_documents_insert WITH CHECK references p.status='draft'; briefing_documents_update USING references p.status='draft'; briefing_documents_update WITH CHECK references p.status='draft'; yagi_admin bypass branch is status-agnostic on all three (admin support path preserved). Verify the DO-block grep predicate (`pg_get_expr(...) NOT LIKE '%p.status%'`) actually matches these expressions when stored. Verify the migration is idempotent under DROP IF EXISTS / CREATE; verify nothing else got modified.

3. F5 closure — confirm: at most one save in flight at any moment (inFlightRef gate); pendingRef stores latest snapshot if save is in-flight; finally block drains pendingRef and recursively triggers runSave; lastCommittedRef updates only on res.ok and uses the snapshot's serialized form (not the live form state). Verify no path causes interleaved completions to flip lastCommittedRef back to a stale value. Verify cleanup function still clears the debounce timer on unmount/dep-change.

Already-deferred (do NOT flag again — registered as FUs by yagi):
- FU-Phase5-3 (defer): generic OG scrape with undici dispatcher + IP-pinning custom lookup (current allowlist is the safe interim)
- FU-Phase5-4 (defer): projects table column-grant lockdown for the 13 sidebar metadata columns (Phase 5 ff-merge batch sweep)
- F4 LOOP 1 (false positive): projects_update RLS already permits creator+draft+member branch, verified via SQL by Builder

Scale-aware rule context: < 100 internal users, all-trusted Phase 5 onboarding pool. MED-B/C with no direct user-supplied input + no external < 30d delivery + not 3rd-repeat → defer to FU. MED-B/C otherwise → inline fix.

Output format:

## VERDICT: <CLEAN | NEEDS-ATTENTION | PARTIAL>

CLEAN = all 4 LOOP 1 findings (F1 / F2 / F3 / F5) are closed by the patch; no NEW HIGH/MED findings introduced.

NEEDS-ATTENTION = at least one of F1/F2/F3/F5 not closed OR a new HIGH/MED introduced. Per LOOP policy: LOOP 2 PARTIAL → single-line miss rule applies (Builder closes inline + commits without LOOP 3); LOOP 2 NEEDS-ATTENTION on a structural finding → STOP + escalate.

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

End with one-line summary suitable for the run log.

codex
I’ll verify only the three scoped files against the four LOOP 1 closures and avoid the excluded files. I’ll first inspect the exact diffs/content, then check the migration expressions and autosave control flow.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260504180000_phase_5_briefing_documents_status_lockdown.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/api/oembed/route.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 846ms:
-- Phase 5 Wave B task_05 v3 sub_5 ??briefing_documents RLS hardening.
--
-- K-05 LOOP 1 (Tier 1 high) findings F2 + F3 (HIGH-B race + missing parent
-- status check on UPDATE):
--
--   F2: addBriefingDocumentAction in the action layer pre-checks parent
--       project status='draft' and then runs INSERT, but the gap between
--       the SELECT and the INSERT is a TOCTOU window ??if the project
--       transitions to 'in_review' between the two statements, the
--       INSERT still lands because the briefing_documents_insert RLS
--       policy never inspects parent status.
--   F3: updateBriefingDocumentNoteAction never checks parent project
--       status at all. The briefing_documents_update RLS policy from the
--       Wave A baseline only enforces (created_by + workspace_member +
--       24h window), so note/category can mutate after the project has
--       transitioned out of draft.
--
-- This migration tightens the briefing_documents INSERT and UPDATE
-- policies so the parent project's status='draft' invariant is enforced
-- at the database layer, atomically with the row write. The race window
-- closes because RLS evaluates the predicate against the project row at
-- the time of the INSERT/UPDATE itself, in the same transaction.
--
-- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
-- admin support / migration path can still mutate briefing rows on
-- non-draft projects when needed.
--
-- The DELETE policy already includes p.status='draft' (Wave A baseline),
-- so we re-assert it via the verify DO block at the bottom rather than
-- DROP+CREATE.
--
-- The Wave A column-grant lockdown (REVOKE table UPDATE + GRANT
-- (note,category) only) is unaffected and remains active.

BEGIN;

-- ---------------------------------------------------------------------------
-- INSERT ??add parent project status='draft' predicate
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "briefing_documents_insert" ON briefing_documents;
CREATE POLICY "briefing_documents_insert" ON briefing_documents
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
          AND p.status = 'draft'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- UPDATE ??add parent project status='draft' predicate to both USING +
-- WITH CHECK. The 24h authoring window is preserved.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "briefing_documents_update" ON briefing_documents;
CREATE POLICY "briefing_documents_update" ON briefing_documents
  FOR UPDATE TO authenticated
  USING (
    (
      created_by = auth.uid()
      AND created_at > now() - interval '24 hours'
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
          AND p.status = 'draft'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  )
  WITH CHECK (
    (
      created_by = auth.uid()
      AND project_id IN (
        SELECT p.id FROM projects p
        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
        WHERE wm.user_id = auth.uid()
          AND p.status = 'draft'
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'yagi_admin'
    )
  );

-- ---------------------------------------------------------------------------
-- Verify ??assert all three policies (INSERT/UPDATE/DELETE) now reference
-- p.status, the table-level UPDATE revoke is still in force, and the
-- column-level UPDATE re-grant on (note, category) is still in force.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  ins_check text;
  upd_using text;
  upd_check text;
  del_using text;
BEGIN
  SELECT pg_get_expr(polwithcheck, polrelid) INTO ins_check
    FROM pg_policy
    WHERE polrelid = 'public.briefing_documents'::regclass
      AND polname = 'briefing_documents_insert';
  IF ins_check IS NULL OR ins_check NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 F2 assert failed: briefing_documents_insert WITH CHECK does not reference p.status';
  END IF;

  SELECT pg_get_expr(polqual, polrelid),
         pg_get_expr(polwithcheck, polrelid)
    INTO upd_using, upd_check
    FROM pg_policy
    WHERE polrelid = 'public.briefing_documents'::regclass
      AND polname = 'briefing_documents_update';
  IF upd_using IS NULL OR upd_using NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update USING does not reference p.status';
  END IF;
  IF upd_check IS NULL OR upd_check NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update WITH CHECK does not reference p.status';
  END IF;

  SELECT pg_get_expr(polqual, polrelid) INTO del_using
    FROM pg_policy
    WHERE polrelid = 'public.briefing_documents'::regclass
      AND polname = 'briefing_documents_delete';
  IF del_using IS NULL OR del_using NOT LIKE '%p.status%' THEN
    RAISE EXCEPTION 'sub_5 verify failed: briefing_documents_delete USING no longer references p.status (Wave A regression)';
  END IF;

  -- Wave A column-grant lockdown sanity (table UPDATE denied + selective
  -- column re-grant intact). Belt-and-suspenders ??the Wave A migration
  -- already locked these in, but a future PUBLIC inheritance regression
  -- would slip past without re-asserting here.
  IF has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_5 verify failed: authenticated regained table-level UPDATE on briefing_documents';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'note', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_5 verify failed: authenticated lost UPDATE on briefing_documents.note';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'category', 'UPDATE') THEN
    RAISE EXCEPTION 'sub_5 verify failed: authenticated lost UPDATE on briefing_documents.category';
  END IF;
END $$;

COMMIT;

 succeeded in 867ms:
"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 sub_5 ??Step 2 right column (?뷀뀒??sidebar + autosave)
//
// 12 sidebar fields, all optional. Local form state debounces 5 seconds
// then commits via updateProjectMetadataAction. Visible status indicator
// in the sticky CTA bar lives in the parent orchestrator (this component
// reports state via the onAutosaveState callback).
//
// K-05 LOOP 1 finding F5 (MED, autosave race) fix:
//   The previous AbortController approach only suppressed *UI* handling
//   of stale completions; the server action itself was already dispatched
//   and could still commit. With slow-network ordering (save_1 5s start,
//   save_2 10s start, save_1 finishes after save_2), save_1's older
//   payload would overwrite save_2's newer one.
//
//   Fixed by single-flight queue:
//     - At most one save is in flight at any moment.
//     - If the debounce fires while a save is already running, the new
//       snapshot is parked in pendingRef.
//     - When the running save completes, runSave drains pendingRef and
//       starts the next save with the latest snapshot.
//   This guarantees in-order completion and that only the latest queued
//   snapshot ever commits ??intermediate keystrokes that were superseded
//   during a long in-flight save are dropped on the floor (which is the
//   correct semantics: the user's most recent state is what persists).
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateProjectMetadataAction } from "./briefing-step2-actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MOOD_OPTIONS = [
  "emotional",
  "sophisticated",
  "humorous",
  "dynamic",
  "minimal",
  "warm",
  "luxurious",
  "trendy",
  "friendly",
] as const;

const CHANNEL_OPTIONS = [
  "instagram",
  "youtube",
  "tiktok",
  "facebook",
  "website",
  "offline",
  "other",
] as const;

const VISUAL_RATIO_OPTIONS = [
  "1_1",
  "16_9",
  "9_16",
  "4_5",
  "239_1",
  "custom",
] as const;

const HAS_PLAN_OPTIONS = ["have", "want_proposal", "undecided"] as const;
const BUDGET_OPTIONS = [
  "under_1m",
  "1m_to_5m",
  "5m_to_10m",
  "negotiable",
] as const;

// ---------------------------------------------------------------------------
// Form state shape
// ---------------------------------------------------------------------------

export type SidebarFormData = {
  mood_keywords: string[];
  mood_keywords_free: string;
  visual_ratio: string;
  visual_ratio_custom: string;
  channels: string[];
  has_plan: "have" | "want_proposal" | "undecided" | "";
  target_audience: string;
  additional_notes: string;
  budget_band: "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable" | "";
  target_delivery_at: string;
  meeting_preferred_at: string;
  interested_in_twin: boolean;
};

export type AutosaveState = "idle" | "saving" | "saved" | "error";

// ---------------------------------------------------------------------------
// Multi-select chip
// ---------------------------------------------------------------------------

function ChipMulti({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  labelOf: (opt: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(
                selected
                  ? value.filter((v) => v !== opt)
                  : [...value, opt],
              )
            }
            aria-pressed={selected}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
              selected
                ? "bg-foreground text-background"
                : "border border-border/60 hover:border-border",
            )}
          >
            {labelOf(opt)}
          </button>
        );
      })}
    </div>
  );
}

function ChipSingle({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  labelOf: (opt: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(selected ? "" : opt)}
            aria-pressed={selected}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
              selected
                ? "bg-foreground text-background"
                : "border border-border/60 hover:border-border",
            )}
          >
            {labelOf(opt)}
          </button>
        );
      })}
    </div>
  );
}

function FieldBlock({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-sm font-semibold tracking-tight keep-all">
          {title}
        </Label>
        {helper && (
          <p className="text-xs text-muted-foreground mt-1 keep-all leading-relaxed">
            {helper}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export function Step2Sidebar({
  projectId,
  initial,
  onAutosaveState,
}: {
  projectId: string;
  initial: SidebarFormData;
  onAutosaveState: (state: AutosaveState, savedAt?: string) => void;
}) {
  const t = useTranslations("projects");
  const [form, setForm] = useState<SidebarFormData>(initial);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>(JSON.stringify(initial));
  const inFlightRef = useRef<boolean>(false);
  const pendingRef = useRef<SidebarFormData | null>(null);
  const onAutosaveStateRef = useRef(onAutosaveState);
  onAutosaveStateRef.current = onAutosaveState;

  // Single-flight save runner. Drains pendingRef on completion so the
  // most recent snapshot always wins, and saves never overlap.
  const runSave = async (snapshot: SidebarFormData): Promise<void> => {
    if (inFlightRef.current) {
      pendingRef.current = snapshot;
      return;
    }
    inFlightRef.current = true;
    try {
      onAutosaveStateRef.current("saving");
      const res = await updateProjectMetadataAction({
        projectId,
        mood_keywords: snapshot.mood_keywords,
        mood_keywords_free: snapshot.mood_keywords_free || null,
        visual_ratio: snapshot.visual_ratio || null,
        visual_ratio_custom: snapshot.visual_ratio_custom || null,
        channels: snapshot.channels,
        has_plan: snapshot.has_plan || null,
        target_audience: snapshot.target_audience || null,
        additional_notes: snapshot.additional_notes || null,
        budget_band: snapshot.budget_band || null,
        target_delivery_at: snapshot.target_delivery_at || null,
        meeting_preferred_at:
          snapshot.meeting_preferred_at && snapshot.meeting_preferred_at !== ""
            ? new Date(snapshot.meeting_preferred_at).toISOString()
            : null,
        interested_in_twin: snapshot.interested_in_twin,
      });
      if (res.ok) {
        lastCommittedRef.current = JSON.stringify(snapshot);
        onAutosaveStateRef.current("saved", res.savedAt);
      } else {
        onAutosaveStateRef.current("error");
      }
    } finally {
      inFlightRef.current = false;
      const next = pendingRef.current;
      if (next) {
        pendingRef.current = null;
        void runSave(next);
      }
    }
  };

  // Autosave: 5s debounce after each form change. Skip if value matches
  // the last successful commit (prevents idle re-saves).
  useEffect(() => {
    const serialized = JSON.stringify(form);
    if (serialized === lastCommittedRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSave(form);
    }, 5_000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runSave/onAutosaveState are stable via refs
  }, [form, projectId]);

  // Convenience setters
  const set = <K extends keyof SidebarFormData>(
    key: K,
    value: SidebarFormData[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <aside className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-6">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.detail.title")}
        </h2>
      </header>

      <FieldBlock
        title={t("briefing.step2.sections.detail.mood.label")}
        helper={t("briefing.step2.sections.detail.mood.helper")}
      >
        <ChipMulti
          options={MOOD_OPTIONS}
          value={form.mood_keywords}
          onChange={(v) => set("mood_keywords", v)}
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
        <Input
          value={form.mood_keywords_free}
          onChange={(e) => set("mood_keywords_free", e.target.value)}
          placeholder={t(
            "briefing.step2.sections.detail.mood.free_input_placeholder",
          )}
          className="text-sm"
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.visual_ratio.label")}>
        <ChipSingle
          options={VISUAL_RATIO_OPTIONS}
          value={form.visual_ratio}
          onChange={(v) => set("visual_ratio", v)}
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
        {form.visual_ratio === "custom" && (
          <Input
            value={form.visual_ratio_custom}
            onChange={(e) => set("visual_ratio_custom", e.target.value)}
            placeholder={t(
              "briefing.step2.sections.detail.visual_ratio.custom_placeholder",
            )}
            className="text-sm max-w-xs"
          />
        )}
      </FieldBlock>

      <FieldBlock
        title={t("briefing.step2.sections.detail.channels.label")}
        helper={t("briefing.step2.sections.detail.channels.helper")}
      >
        <ChipMulti
          options={CHANNEL_OPTIONS}
          value={form.channels}
          onChange={(v) => set("channels", v)}
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.has_plan.label")}>
        <RadioGroup
          value={form.has_plan}
          onValueChange={(v) =>
            set("has_plan", v as SidebarFormData["has_plan"])
          }
          className="flex flex-col gap-2"
        >
          {HAS_PLAN_OPTIONS.map((opt) => (
            <div key={opt} className="flex items-center gap-2">
              <RadioGroupItem value={opt} id={`has-plan-${opt}`} />
              <Label
                htmlFor={`has-plan-${opt}`}
                className="text-sm font-normal cursor-pointer keep-all"
              >
                {t(
                  `briefing.step2.sections.detail.has_plan.options.${opt}` as Parameters<
                    typeof t
                  >[0],
                )}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.target.label")}>
        <Textarea
          value={form.target_audience}
          onChange={(e) => set("target_audience", e.target.value)}
          placeholder={t(
            "briefing.step2.sections.detail.target.placeholder",
          )}
          rows={3}
          className="resize-none text-sm"
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.more.label")}>
        <Textarea
          value={form.additional_notes}
          onChange={(e) => set("additional_notes", e.target.value)}
          placeholder={t(
            "briefing.step2.sections.detail.more.placeholder",
          )}
          rows={4}
          className="resize-none text-sm"
        />
      </FieldBlock>

      <div className="h-px bg-border/40" />

      <FieldBlock title={t("briefing.step2.sections.detail.budget.label")}>
        <ChipSingle
          options={BUDGET_OPTIONS}
          value={form.budget_band}
          onChange={(v) =>
            set("budget_band", v as SidebarFormData["budget_band"])
          }
          labelOf={(k) =>
            t(
              `briefing.step2.sections.detail.budget.options.${k}` as Parameters<
                typeof t
              >[0],
            )
          }
        />
      </FieldBlock>

      <FieldBlock title={t("briefing.step2.sections.detail.delivery_date.label")}>
        <Input
          type="date"
          value={form.target_delivery_at}
          onChange={(e) => set("target_delivery_at", e.target.value)}
          className="text-sm max-w-xs"
        />
      </FieldBlock>

      <FieldBlock
        title={t("briefing.step2.sections.detail.meeting_at.label")}
        helper={t("briefing.step2.sections.detail.meeting_at.helper")}
      >
        <Input
          type="datetime-local"
          value={form.meeting_preferred_at}
          onChange={(e) => set("meeting_preferred_at", e.target.value)}
          className="text-sm max-w-xs"
        />
      </FieldBlock>

      <div
        className={cn(
          "rounded-2xl p-4 flex items-start gap-3",
          form.interested_in_twin
            ? "bg-emerald-50 border border-emerald-200"
            : "border border-border/40",
        )}
      >
        <input
          type="checkbox"
          id="twin-toggle"
          checked={form.interested_in_twin}
          onChange={(e) => set("interested_in_twin", e.target.checked)}
          className="mt-1"
        />
        <div className="flex flex-col gap-1">
          <Label
            htmlFor="twin-toggle"
            className="text-sm font-semibold cursor-pointer keep-all"
          >
            {t("briefing.step2.sections.detail.twin_toggle.label")}
          </Label>
          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
            {t("briefing.step2.sections.detail.twin_toggle.helper")}
          </p>
        </div>
      </div>
    </aside>
  );
}

 succeeded in 872ms:
// =============================================================================
// Phase 5 Wave B task_05 v3 sub_5 ??oembed proxy (allowlist-only)
//
// Briefing Canvas Step 2 reference column posts a URL ??this endpoint
// returns { provider, thumbnail_url?, oembed_html?, title? } for client
// rendering.
//
// SSRF posture (post-K-05 LOOP 1, F1 fix):
//   The route now uses a strict provider ALLOWLIST. The previous generic
//   OG-meta scrape path (safeFetchHtml + parseMeta) was removed because
//   `assertSafeUrl()` resolved DNS up-front but the subsequent `fetch()`
//   performed its own DNS lookup again ??leaving a DNS-rebinding window
//   between the resolve and the actual socket. Pinning the validated IP
//   into the request requires an undici dispatcher with a custom lookup
//   per hop (FU-Phase5-3). Until that lands, only YouTube/Vimeo (which
//   call the provider's official oembed endpoint via lib/oembed) and
//   Instagram (bare provider tag, no fetch) are supported.
//
//   Non-allowlisted hosts return { provider: "generic", thumbnail_url:
//   null, ... }. The client persists the URL with no thumbnail; the row
//   still renders cleanly via the link icon fallback.
//
// Input validation:
//   - http(s) scheme only
//   - Reject .local / .internal / localhost
//   - URL length <= 2000
// =============================================================================

import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const YOUTUBE_RE = /(?:^|\.)(?:youtube\.com|youtu\.be)$/i;
const VIMEO_RE = /(?:^|\.)vimeo\.com$/i;
const INSTAGRAM_RE = /(?:^|\.)(?:instagram\.com|cdninstagram\.com)$/i;

// ---------------------------------------------------------------------------
// Input validator (no DNS ??allowlist makes resolution unnecessary)
// ---------------------------------------------------------------------------

function validateUrlShape(rawUrl: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname) return null;
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return null;
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

type OembedResult = {
  provider: "youtube" | "vimeo" | "instagram" | "generic";
  thumbnail_url: string | null;
  oembed_html: string | null;
  title: string | null;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");
  if (!rawUrl || rawUrl.length === 0 || rawUrl.length > 2000) {
    return NextResponse.json(
      { error: "missing or invalid url" },
      { status: 400 },
    );
  }

  const parsed = validateUrlShape(rawUrl);
  if (!parsed) {
    return NextResponse.json({ error: "url rejected" }, { status: 400 });
  }
  const host = parsed.hostname.toLowerCase();

  // YouTube + Vimeo ??call the provider's trusted oembed endpoint via
  // lib/oembed (fetchVideoMetadata). Lazy-imported so the route file
  // surface stays minimal.
  if (YOUTUBE_RE.test(host) || VIMEO_RE.test(host)) {
    try {
      const { fetchVideoMetadata } = await import("@/lib/oembed");
      const meta = await fetchVideoMetadata(parsed.toString());
      if (meta) {
        const result: OembedResult = {
          provider: meta.provider,
          thumbnail_url: meta.thumbnailUrl,
          oembed_html: null,
          title: meta.title,
        };
        return NextResponse.json(result);
      }
    } catch {
      // fall through to bare provider tag
    }
    return NextResponse.json(
      {
        provider: YOUTUBE_RE.test(host) ? "youtube" : "vimeo",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }

  // Instagram ??Meta requires API key for oEmbed; bare provider tag.
  if (INSTAGRAM_RE.test(host)) {
    return NextResponse.json(
      {
        provider: "instagram",
        thumbnail_url: null,
        oembed_html: null,
        title: null,
      } satisfies OembedResult,
    );
  }

  // Non-allowlisted host ??return generic with no thumbnail. Client
  // persists URL only. Generic OG scraping is FU-Phase5-3 (requires
  // undici dispatcher with IP-pinning lookup to be SSRF-safe).
  return NextResponse.json(
    {
      provider: "generic",
      thumbnail_url: null,
      oembed_html: null,
      title: null,
    } satisfies OembedResult,
  );
}

 succeeded in 916ms:
 M messages/en.json
 M messages/ko.json
 M src/app/[locale]/app/projects/new/briefing-actions.ts
 M src/app/[locale]/app/projects/new/briefing-canvas.tsx
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop1.md
?? .yagi-autobuild/phase-5/_wave_a_codex_review_loop2.md
?? .yagi-autobuild/phase-5/_wave_a_task_01_result.md
?? .yagi-autobuild/phase-5/_wave_b_sub_5_codex_loop2_full.md
?? .yagi-autobuild/phase-5/_wave_b_sub_5_codex_loop2_prompt.md
?? .yagi-autobuild/phase-5/_wave_b_task_04v3_codex_review.md
?? .yagi-autobuild/phase-5/_wave_b_task_05v3_codex_review_loop1.md
?? src/app/[locale]/app/projects/new/briefing-canvas-step-2-brief.tsx
?? src/app/[locale]/app/projects/new/briefing-canvas-step-2-reference.tsx
?? src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx
?? src/app/[locale]/app/projects/new/briefing-canvas-step-2.tsx
?? src/app/[locale]/app/projects/new/briefing-step2-actions.ts
?? src/app/api/oembed/
?? supabase/migrations/20260504180000_phase_5_briefing_documents_status_lockdown.sql

codex
The scoped files match the described patch shape. I’m checking the imported oEmbed helper because F1 closure depends on the route only reaching provider-owned endpoints through that helper, not on any generic fetch path.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"function fetchVideoMetadata|export async function fetchVideoMetadata|fetch\\(|oembed|assertSafeUrl|safeFetchHtml|parseMeta|dns|lookup\" src/lib src/app/api/oembed" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/api/oembed/route.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260504180000_phase_5_briefing_documents_status_lockdown.sql' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/projects/new/briefing-canvas-step-2-sidebar.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 670ms:
   1: -- Phase 5 Wave B task_05 v3 sub_5 ??briefing_documents RLS hardening.
   2: --
   3: -- K-05 LOOP 1 (Tier 1 high) findings F2 + F3 (HIGH-B race + missing parent
   4: -- status check on UPDATE):
   5: --
   6: --   F2: addBriefingDocumentAction in the action layer pre-checks parent
   7: --       project status='draft' and then runs INSERT, but the gap between
   8: --       the SELECT and the INSERT is a TOCTOU window ??if the project
   9: --       transitions to 'in_review' between the two statements, the
  10: --       INSERT still lands because the briefing_documents_insert RLS
  11: --       policy never inspects parent status.
  12: --   F3: updateBriefingDocumentNoteAction never checks parent project
  13: --       status at all. The briefing_documents_update RLS policy from the
  14: --       Wave A baseline only enforces (created_by + workspace_member +
  15: --       24h window), so note/category can mutate after the project has
  16: --       transitioned out of draft.
  17: --
  18: -- This migration tightens the briefing_documents INSERT and UPDATE
  19: -- policies so the parent project's status='draft' invariant is enforced
  20: -- at the database layer, atomically with the row write. The race window
  21: -- closes because RLS evaluates the predicate against the project row at
  22: -- the time of the INSERT/UPDATE itself, in the same transaction.
  23: --
  24: -- yagi_admin bypass branch is preserved AS-IS (status-agnostic) so the
  25: -- admin support / migration path can still mutate briefing rows on
  26: -- non-draft projects when needed.
  27: --
  28: -- The DELETE policy already includes p.status='draft' (Wave A baseline),
  29: -- so we re-assert it via the verify DO block at the bottom rather than
  30: -- DROP+CREATE.
  31: --
  32: -- The Wave A column-grant lockdown (REVOKE table UPDATE + GRANT
  33: -- (note,category) only) is unaffected and remains active.
  34: 
  35: BEGIN;
  36: 
  37: -- ---------------------------------------------------------------------------
  38: -- INSERT ??add parent project status='draft' predicate
  39: -- ---------------------------------------------------------------------------
  40: 
  41: DROP POLICY IF EXISTS "briefing_documents_insert" ON briefing_documents;
  42: CREATE POLICY "briefing_documents_insert" ON briefing_documents
  43:   FOR INSERT TO authenticated
  44:   WITH CHECK (
  45:     (
  46:       created_by = auth.uid()
  47:       AND project_id IN (
  48:         SELECT p.id FROM projects p
  49:         JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
  50:         WHERE wm.user_id = auth.uid()
  51:           AND p.status = 'draft'
  52:       )
  53:     )
  54:     OR EXISTS (
  55:       SELECT 1 FROM profiles
  56:       WHERE id = auth.uid() AND role = 'yagi_admin'
  57:     )
  58:   );
  59: 
  60: -- ---------------------------------------------------------------------------
  61: -- UPDATE ??add parent project status='draft' predicate to both USING +
  62: -- WITH CHECK. The 24h authoring window is preserved.
  63: -- ---------------------------------------------------------------------------
  64: 
  65: DROP POLICY IF EXISTS "briefing_documents_update" ON briefing_documents;
  66: CREATE POLICY "briefing_documents_update" ON briefing_documents
  67:   FOR UPDATE TO authenticated
  68:   USING (
  69:     (
  70:       created_by = auth.uid()
  71:       AND created_at > now() - interval '24 hours'
  72:       AND project_id IN (
  73:         SELECT p.id FROM projects p
  74:         JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
  75:         WHERE wm.user_id = auth.uid()
  76:           AND p.status = 'draft'
  77:       )
  78:     )
  79:     OR EXISTS (
  80:       SELECT 1 FROM profiles
  81:       WHERE id = auth.uid() AND role = 'yagi_admin'
  82:     )
  83:   )
  84:   WITH CHECK (
  85:     (
  86:       created_by = auth.uid()
  87:       AND project_id IN (
  88:         SELECT p.id FROM projects p
  89:         JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
  90:         WHERE wm.user_id = auth.uid()
  91:           AND p.status = 'draft'
  92:       )
  93:     )
  94:     OR EXISTS (
  95:       SELECT 1 FROM profiles
  96:       WHERE id = auth.uid() AND role = 'yagi_admin'
  97:     )
  98:   );
  99: 
 100: -- ---------------------------------------------------------------------------
 101: -- Verify ??assert all three policies (INSERT/UPDATE/DELETE) now reference
 102: -- p.status, the table-level UPDATE revoke is still in force, and the
 103: -- column-level UPDATE re-grant on (note, category) is still in force.
 104: -- ---------------------------------------------------------------------------
 105: 
 106: DO $$
 107: DECLARE
 108:   ins_check text;
 109:   upd_using text;
 110:   upd_check text;
 111:   del_using text;
 112: BEGIN
 113:   SELECT pg_get_expr(polwithcheck, polrelid) INTO ins_check
 114:     FROM pg_policy
 115:     WHERE polrelid = 'public.briefing_documents'::regclass
 116:       AND polname = 'briefing_documents_insert';
 117:   IF ins_check IS NULL OR ins_check NOT LIKE '%p.status%' THEN
 118:     RAISE EXCEPTION 'sub_5 F2 assert failed: briefing_documents_insert WITH CHECK does not reference p.status';
 119:   END IF;
 120: 
 121:   SELECT pg_get_expr(polqual, polrelid),
 122:          pg_get_expr(polwithcheck, polrelid)
 123:     INTO upd_using, upd_check
 124:     FROM pg_policy
 125:     WHERE polrelid = 'public.briefing_documents'::regclass
 126:       AND polname = 'briefing_documents_update';
 127:   IF upd_using IS NULL OR upd_using NOT LIKE '%p.status%' THEN
 128:     RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update USING does not reference p.status';
 129:   END IF;
 130:   IF upd_check IS NULL OR upd_check NOT LIKE '%p.status%' THEN
 131:     RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update WITH CHECK does not reference p.status';
 132:   END IF;
 133: 
 134:   SELECT pg_get_expr(polqual, polrelid) INTO del_using
 135:     FROM pg_policy
 136:     WHERE polrelid = 'public.briefing_documents'::regclass
 137:       AND polname = 'briefing_documents_delete';
 138:   IF del_using IS NULL OR del_using NOT LIKE '%p.status%' THEN
 139:     RAISE EXCEPTION 'sub_5 verify failed: briefing_documents_delete USING no longer references p.status (Wave A regression)';
 140:   END IF;
 141: 
 142:   -- Wave A column-grant lockdown sanity (table UPDATE denied + selective
 143:   -- column re-grant intact). Belt-and-suspenders ??the Wave A migration
 144:   -- already locked these in, but a future PUBLIC inheritance regression
 145:   -- would slip past without re-asserting here.
 146:   IF has_table_privilege('authenticated', 'public.briefing_documents', 'UPDATE') THEN
 147:     RAISE EXCEPTION 'sub_5 verify failed: authenticated regained table-level UPDATE on briefing_documents';
 148:   END IF;
 149:   IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'note', 'UPDATE') THEN
 150:     RAISE EXCEPTION 'sub_5 verify failed: authenticated lost UPDATE on briefing_documents.note';
 151:   END IF;
 152:   IF NOT has_column_privilege('authenticated', 'public.briefing_documents', 'category', 'UPDATE') THEN
 153:     RAISE EXCEPTION 'sub_5 verify failed: authenticated lost UPDATE on briefing_documents.category';
 154:   END IF;
 155: END $$;
 156: 
 157: COMMIT;

 succeeded in 689ms:
   1: // =============================================================================
   2: // Phase 5 Wave B task_05 v3 sub_5 ??oembed proxy (allowlist-only)
   3: //
   4: // Briefing Canvas Step 2 reference column posts a URL ??this endpoint
   5: // returns { provider, thumbnail_url?, oembed_html?, title? } for client
   6: // rendering.
   7: //
   8: // SSRF posture (post-K-05 LOOP 1, F1 fix):
   9: //   The route now uses a strict provider ALLOWLIST. The previous generic
  10: //   OG-meta scrape path (safeFetchHtml + parseMeta) was removed because
  11: //   `assertSafeUrl()` resolved DNS up-front but the subsequent `fetch()`
  12: //   performed its own DNS lookup again ??leaving a DNS-rebinding window
  13: //   between the resolve and the actual socket. Pinning the validated IP
  14: //   into the request requires an undici dispatcher with a custom lookup
  15: //   per hop (FU-Phase5-3). Until that lands, only YouTube/Vimeo (which
  16: //   call the provider's official oembed endpoint via lib/oembed) and
  17: //   Instagram (bare provider tag, no fetch) are supported.
  18: //
  19: //   Non-allowlisted hosts return { provider: "generic", thumbnail_url:
  20: //   null, ... }. The client persists the URL with no thumbnail; the row
  21: //   still renders cleanly via the link icon fallback.
  22: //
  23: // Input validation:
  24: //   - http(s) scheme only
  25: //   - Reject .local / .internal / localhost
  26: //   - URL length <= 2000
  27: // =============================================================================
  28: 
  29: import { NextRequest, NextResponse } from "next/server";
  30: 
  31: // ---------------------------------------------------------------------------
  32: // Constants
  33: // ---------------------------------------------------------------------------
  34: 
  35: const YOUTUBE_RE = /(?:^|\.)(?:youtube\.com|youtu\.be)$/i;
  36: const VIMEO_RE = /(?:^|\.)vimeo\.com$/i;
  37: const INSTAGRAM_RE = /(?:^|\.)(?:instagram\.com|cdninstagram\.com)$/i;
  38: 
  39: // ---------------------------------------------------------------------------
  40: // Input validator (no DNS ??allowlist makes resolution unnecessary)
  41: // ---------------------------------------------------------------------------
  42: 
  43: function validateUrlShape(rawUrl: string): URL | null {
  44:   let parsed: URL;
  45:   try {
  46:     parsed = new URL(rawUrl);
  47:   } catch {
  48:     return null;
  49:   }
  50:   if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  51:   if (!parsed.hostname) return null;
  52:   const host = parsed.hostname.toLowerCase();
  53:   if (
  54:     host === "localhost" ||
  55:     host.endsWith(".localhost") ||
  56:     host.endsWith(".local") ||
  57:     host.endsWith(".internal")
  58:   ) {
  59:     return null;
  60:   }
  61:   return parsed;
  62: }
  63: 
  64: // ---------------------------------------------------------------------------
  65: // GET handler
  66: // ---------------------------------------------------------------------------
  67: 
  68: type OembedResult = {
  69:   provider: "youtube" | "vimeo" | "instagram" | "generic";
  70:   thumbnail_url: string | null;
  71:   oembed_html: string | null;
  72:   title: string | null;
  73: };
  74: 
  75: export async function GET(request: NextRequest) {
  76:   const { searchParams } = new URL(request.url);
  77:   const rawUrl = searchParams.get("url");
  78:   if (!rawUrl || rawUrl.length === 0 || rawUrl.length > 2000) {
  79:     return NextResponse.json(
  80:       { error: "missing or invalid url" },
  81:       { status: 400 },
  82:     );
  83:   }
  84: 
  85:   const parsed = validateUrlShape(rawUrl);
  86:   if (!parsed) {
  87:     return NextResponse.json({ error: "url rejected" }, { status: 400 });
  88:   }
  89:   const host = parsed.hostname.toLowerCase();
  90: 
  91:   // YouTube + Vimeo ??call the provider's trusted oembed endpoint via
  92:   // lib/oembed (fetchVideoMetadata). Lazy-imported so the route file
  93:   // surface stays minimal.
  94:   if (YOUTUBE_RE.test(host) || VIMEO_RE.test(host)) {
  95:     try {
  96:       const { fetchVideoMetadata } = await import("@/lib/oembed");
  97:       const meta = await fetchVideoMetadata(parsed.toString());
  98:       if (meta) {
  99:         const result: OembedResult = {
 100:           provider: meta.provider,
 101:           thumbnail_url: meta.thumbnailUrl,
 102:           oembed_html: null,
 103:           title: meta.title,
 104:         };
 105:         return NextResponse.json(result);
 106:       }
 107:     } catch {
 108:       // fall through to bare provider tag
 109:     }
 110:     return NextResponse.json(
 111:       {
 112:         provider: YOUTUBE_RE.test(host) ? "youtube" : "vimeo",
 113:         thumbnail_url: null,
 114:         oembed_html: null,
 115:         title: null,
 116:       } satisfies OembedResult,
 117:     );
 118:   }
 119: 
 120:   // Instagram ??Meta requires API key for oEmbed; bare provider tag.
 121:   if (INSTAGRAM_RE.test(host)) {
 122:     return NextResponse.json(
 123:       {
 124:         provider: "instagram",
 125:         thumbnail_url: null,
 126:         oembed_html: null,
 127:         title: null,
 128:       } satisfies OembedResult,
 129:     );
 130:   }
 131: 
 132:   // Non-allowlisted host ??return generic with no thumbnail. Client
 133:   // persists URL only. Generic OG scraping is FU-Phase5-3 (requires
 134:   // undici dispatcher with IP-pinning lookup to be SSRF-safe).
 135:   return NextResponse.json(
 136:     {
 137:       provider: "generic",
 138:       thumbnail_url: null,
 139:       oembed_html: null,
 140:       title: null,
 141:     } satisfies OembedResult,
 142:   );
 143: }

 succeeded in 744ms:
   1: "use client";
   2: 
   3: // =============================================================================
   4: // Phase 5 Wave B task_05 v3 sub_5 ??Step 2 right column (?뷀뀒??sidebar + autosave)
   5: //
   6: // 12 sidebar fields, all optional. Local form state debounces 5 seconds
   7: // then commits via updateProjectMetadataAction. Visible status indicator
   8: // in the sticky CTA bar lives in the parent orchestrator (this component
   9: // reports state via the onAutosaveState callback).
  10: //
  11: // K-05 LOOP 1 finding F5 (MED, autosave race) fix:
  12: //   The previous AbortController approach only suppressed *UI* handling
  13: //   of stale completions; the server action itself was already dispatched
  14: //   and could still commit. With slow-network ordering (save_1 5s start,
  15: //   save_2 10s start, save_1 finishes after save_2), save_1's older
  16: //   payload would overwrite save_2's newer one.
  17: //
  18: //   Fixed by single-flight queue:
  19: //     - At most one save is in flight at any moment.
  20: //     - If the debounce fires while a save is already running, the new
  21: //       snapshot is parked in pendingRef.
  22: //     - When the running save completes, runSave drains pendingRef and
  23: //       starts the next save with the latest snapshot.
  24: //   This guarantees in-order completion and that only the latest queued
  25: //   snapshot ever commits ??intermediate keystrokes that were superseded
  26: //   during a long in-flight save are dropped on the floor (which is the
  27: //   correct semantics: the user's most recent state is what persists).
  28: // =============================================================================
  29: 
  30: import { useState, useEffect, useRef } from "react";
  31: import { useTranslations } from "next-intl";
  32: import { cn } from "@/lib/utils";
  33: import { Input } from "@/components/ui/input";
  34: import { Label } from "@/components/ui/label";
  35: import { Textarea } from "@/components/ui/textarea";
  36: import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
  37: import { updateProjectMetadataAction } from "./briefing-step2-actions";
  38: 
  39: // ---------------------------------------------------------------------------
  40: // Constants
  41: // ---------------------------------------------------------------------------
  42: 
  43: const MOOD_OPTIONS = [
  44:   "emotional",
  45:   "sophisticated",
  46:   "humorous",
  47:   "dynamic",
  48:   "minimal",
  49:   "warm",
  50:   "luxurious",
  51:   "trendy",
  52:   "friendly",
  53: ] as const;
  54: 
  55: const CHANNEL_OPTIONS = [
  56:   "instagram",
  57:   "youtube",
  58:   "tiktok",
  59:   "facebook",
  60:   "website",
  61:   "offline",
  62:   "other",
  63: ] as const;
  64: 
  65: const VISUAL_RATIO_OPTIONS = [
  66:   "1_1",
  67:   "16_9",
  68:   "9_16",
  69:   "4_5",
  70:   "239_1",
  71:   "custom",
  72: ] as const;
  73: 
  74: const HAS_PLAN_OPTIONS = ["have", "want_proposal", "undecided"] as const;
  75: const BUDGET_OPTIONS = [
  76:   "under_1m",
  77:   "1m_to_5m",
  78:   "5m_to_10m",
  79:   "negotiable",
  80: ] as const;
  81: 
  82: // ---------------------------------------------------------------------------
  83: // Form state shape
  84: // ---------------------------------------------------------------------------
  85: 
  86: export type SidebarFormData = {
  87:   mood_keywords: string[];
  88:   mood_keywords_free: string;
  89:   visual_ratio: string;
  90:   visual_ratio_custom: string;
  91:   channels: string[];
  92:   has_plan: "have" | "want_proposal" | "undecided" | "";
  93:   target_audience: string;
  94:   additional_notes: string;
  95:   budget_band: "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable" | "";
  96:   target_delivery_at: string;
  97:   meeting_preferred_at: string;
  98:   interested_in_twin: boolean;
  99: };
 100: 
 101: export type AutosaveState = "idle" | "saving" | "saved" | "error";
 102: 
 103: // ---------------------------------------------------------------------------
 104: // Multi-select chip
 105: // ---------------------------------------------------------------------------
 106: 
 107: function ChipMulti({
 108:   options,
 109:   value,
 110:   onChange,
 111:   labelOf,
 112: }: {
 113:   options: readonly string[];
 114:   value: string[];
 115:   onChange: (next: string[]) => void;
 116:   labelOf: (opt: string) => string;
 117: }) {
 118:   return (
 119:     <div className="flex flex-wrap gap-1.5">
 120:       {options.map((opt) => {
 121:         const selected = value.includes(opt);
 122:         return (
 123:           <button
 124:             key={opt}
 125:             type="button"
 126:             onClick={() =>
 127:               onChange(
 128:                 selected
 129:                   ? value.filter((v) => v !== opt)
 130:                   : [...value, opt],
 131:               )
 132:             }
 133:             aria-pressed={selected}
 134:             className={cn(
 135:               "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
 136:               selected
 137:                 ? "bg-foreground text-background"
 138:                 : "border border-border/60 hover:border-border",
 139:             )}
 140:           >
 141:             {labelOf(opt)}
 142:           </button>
 143:         );
 144:       })}
 145:     </div>
 146:   );
 147: }
 148: 
 149: function ChipSingle({
 150:   options,
 151:   value,
 152:   onChange,
 153:   labelOf,
 154: }: {
 155:   options: readonly string[];
 156:   value: string;
 157:   onChange: (next: string) => void;
 158:   labelOf: (opt: string) => string;
 159: }) {
 160:   return (
 161:     <div className="flex flex-wrap gap-1.5">
 162:       {options.map((opt) => {
 163:         const selected = value === opt;
 164:         return (
 165:           <button
 166:             key={opt}
 167:             type="button"
 168:             onClick={() => onChange(selected ? "" : opt)}
 169:             aria-pressed={selected}
 170:             className={cn(
 171:               "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
 172:               selected
 173:                 ? "bg-foreground text-background"
 174:                 : "border border-border/60 hover:border-border",
 175:             )}
 176:           >
 177:             {labelOf(opt)}
 178:           </button>
 179:         );
 180:       })}
 181:     </div>
 182:   );
 183: }
 184: 
 185: function FieldBlock({
 186:   title,
 187:   helper,
 188:   children,
 189: }: {
 190:   title: string;
 191:   helper?: string;
 192:   children: React.ReactNode;
 193: }) {
 194:   return (
 195:     <div className="flex flex-col gap-3">
 196:       <div>
 197:         <Label className="text-sm font-semibold tracking-tight keep-all">
 198:           {title}
 199:         </Label>
 200:         {helper && (
 201:           <p className="text-xs text-muted-foreground mt-1 keep-all leading-relaxed">
 202:             {helper}
 203:           </p>
 204:         )}
 205:       </div>
 206:       {children}
 207:     </div>
 208:   );
 209: }
 210: 
 211: // ---------------------------------------------------------------------------
 212: // Sidebar component
 213: // ---------------------------------------------------------------------------
 214: 
 215: export function Step2Sidebar({
 216:   projectId,
 217:   initial,
 218:   onAutosaveState,
 219: }: {
 220:   projectId: string;
 221:   initial: SidebarFormData;
 222:   onAutosaveState: (state: AutosaveState, savedAt?: string) => void;
 223: }) {
 224:   const t = useTranslations("projects");
 225:   const [form, setForm] = useState<SidebarFormData>(initial);
 226:   const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 227:   const lastCommittedRef = useRef<string>(JSON.stringify(initial));
 228:   const inFlightRef = useRef<boolean>(false);
 229:   const pendingRef = useRef<SidebarFormData | null>(null);
 230:   const onAutosaveStateRef = useRef(onAutosaveState);
 231:   onAutosaveStateRef.current = onAutosaveState;
 232: 
 233:   // Single-flight save runner. Drains pendingRef on completion so the
 234:   // most recent snapshot always wins, and saves never overlap.
 235:   const runSave = async (snapshot: SidebarFormData): Promise<void> => {
 236:     if (inFlightRef.current) {
 237:       pendingRef.current = snapshot;
 238:       return;
 239:     }
 240:     inFlightRef.current = true;
 241:     try {
 242:       onAutosaveStateRef.current("saving");
 243:       const res = await updateProjectMetadataAction({
 244:         projectId,
 245:         mood_keywords: snapshot.mood_keywords,
 246:         mood_keywords_free: snapshot.mood_keywords_free || null,
 247:         visual_ratio: snapshot.visual_ratio || null,
 248:         visual_ratio_custom: snapshot.visual_ratio_custom || null,
 249:         channels: snapshot.channels,
 250:         has_plan: snapshot.has_plan || null,
 251:         target_audience: snapshot.target_audience || null,
 252:         additional_notes: snapshot.additional_notes || null,
 253:         budget_band: snapshot.budget_band || null,
 254:         target_delivery_at: snapshot.target_delivery_at || null,
 255:         meeting_preferred_at:
 256:           snapshot.meeting_preferred_at && snapshot.meeting_preferred_at !== ""
 257:             ? new Date(snapshot.meeting_preferred_at).toISOString()
 258:             : null,
 259:         interested_in_twin: snapshot.interested_in_twin,
 260:       });
 261:       if (res.ok) {
 262:         lastCommittedRef.current = JSON.stringify(snapshot);
 263:         onAutosaveStateRef.current("saved", res.savedAt);
 264:       } else {
 265:         onAutosaveStateRef.current("error");
 266:       }
 267:     } finally {
 268:       inFlightRef.current = false;
 269:       const next = pendingRef.current;
 270:       if (next) {
 271:         pendingRef.current = null;
 272:         void runSave(next);
 273:       }
 274:     }
 275:   };
 276: 
 277:   // Autosave: 5s debounce after each form change. Skip if value matches
 278:   // the last successful commit (prevents idle re-saves).
 279:   useEffect(() => {
 280:     const serialized = JSON.stringify(form);
 281:     if (serialized === lastCommittedRef.current) return;
 282: 
 283:     if (debounceRef.current) clearTimeout(debounceRef.current);
 284:     debounceRef.current = setTimeout(() => {
 285:       void runSave(form);
 286:     }, 5_000);
 287: 
 288:     return () => {
 289:       if (debounceRef.current) clearTimeout(debounceRef.current);
 290:     };
 291:     // eslint-disable-next-line react-hooks/exhaustive-deps -- runSave/onAutosaveState are stable via refs
 292:   }, [form, projectId]);
 293: 
 294:   // Convenience setters
 295:   const set = <K extends keyof SidebarFormData>(
 296:     key: K,
 297:     value: SidebarFormData[K],
 298:   ) => setForm((f) => ({ ...f, [key]: value }));
 299: 
 300:   return (
 301:     <aside className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-6">
 302:       <header>
 303:         <h2 className="text-base font-semibold tracking-tight keep-all">
 304:           {t("briefing.step2.sections.detail.title")}
 305:         </h2>
 306:       </header>
 307: 
 308:       <FieldBlock
 309:         title={t("briefing.step2.sections.detail.mood.label")}
 310:         helper={t("briefing.step2.sections.detail.mood.helper")}
 311:       >
 312:         <ChipMulti
 313:           options={MOOD_OPTIONS}
 314:           value={form.mood_keywords}
 315:           onChange={(v) => set("mood_keywords", v)}
 316:           labelOf={(k) =>
 317:             t(
 318:               `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
 319:                 typeof t
 320:               >[0],
 321:             )
 322:           }
 323:         />
 324:         <Input
 325:           value={form.mood_keywords_free}
 326:           onChange={(e) => set("mood_keywords_free", e.target.value)}
 327:           placeholder={t(
 328:             "briefing.step2.sections.detail.mood.free_input_placeholder",
 329:           )}
 330:           className="text-sm"
 331:         />
 332:       </FieldBlock>
 333: 
 334:       <FieldBlock title={t("briefing.step2.sections.detail.visual_ratio.label")}>
 335:         <ChipSingle
 336:           options={VISUAL_RATIO_OPTIONS}
 337:           value={form.visual_ratio}
 338:           onChange={(v) => set("visual_ratio", v)}
 339:           labelOf={(k) =>
 340:             t(
 341:               `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
 342:                 typeof t
 343:               >[0],
 344:             )
 345:           }
 346:         />
 347:         {form.visual_ratio === "custom" && (
 348:           <Input
 349:             value={form.visual_ratio_custom}
 350:             onChange={(e) => set("visual_ratio_custom", e.target.value)}
 351:             placeholder={t(
 352:               "briefing.step2.sections.detail.visual_ratio.custom_placeholder",
 353:             )}
 354:             className="text-sm max-w-xs"
 355:           />
 356:         )}
 357:       </FieldBlock>
 358: 
 359:       <FieldBlock
 360:         title={t("briefing.step2.sections.detail.channels.label")}
 361:         helper={t("briefing.step2.sections.detail.channels.helper")}
 362:       >
 363:         <ChipMulti
 364:           options={CHANNEL_OPTIONS}
 365:           value={form.channels}
 366:           onChange={(v) => set("channels", v)}
 367:           labelOf={(k) =>
 368:             t(
 369:               `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
 370:                 typeof t
 371:               >[0],
 372:             )
 373:           }
 374:         />
 375:       </FieldBlock>
 376: 
 377:       <FieldBlock title={t("briefing.step2.sections.detail.has_plan.label")}>
 378:         <RadioGroup
 379:           value={form.has_plan}
 380:           onValueChange={(v) =>
 381:             set("has_plan", v as SidebarFormData["has_plan"])
 382:           }
 383:           className="flex flex-col gap-2"
 384:         >
 385:           {HAS_PLAN_OPTIONS.map((opt) => (
 386:             <div key={opt} className="flex items-center gap-2">
 387:               <RadioGroupItem value={opt} id={`has-plan-${opt}`} />
 388:               <Label
 389:                 htmlFor={`has-plan-${opt}`}
 390:                 className="text-sm font-normal cursor-pointer keep-all"
 391:               >
 392:                 {t(
 393:                   `briefing.step2.sections.detail.has_plan.options.${opt}` as Parameters<
 394:                     typeof t
 395:                   >[0],
 396:                 )}
 397:               </Label>
 398:             </div>
 399:           ))}
 400:         </RadioGroup>
 401:       </FieldBlock>
 402: 
 403:       <FieldBlock title={t("briefing.step2.sections.detail.target.label")}>
 404:         <Textarea
 405:           value={form.target_audience}
 406:           onChange={(e) => set("target_audience", e.target.value)}
 407:           placeholder={t(
 408:             "briefing.step2.sections.detail.target.placeholder",
 409:           )}
 410:           rows={3}
 411:           className="resize-none text-sm"
 412:         />
 413:       </FieldBlock>
 414: 
 415:       <FieldBlock title={t("briefing.step2.sections.detail.more.label")}>
 416:         <Textarea
 417:           value={form.additional_notes}
 418:           onChange={(e) => set("additional_notes", e.target.value)}
 419:           placeholder={t(
 420:             "briefing.step2.sections.detail.more.placeholder",
 421:           )}
 422:           rows={4}
 423:           className="resize-none text-sm"
 424:         />
 425:       </FieldBlock>
 426: 
 427:       <div className="h-px bg-border/40" />
 428: 
 429:       <FieldBlock title={t("briefing.step2.sections.detail.budget.label")}>
 430:         <ChipSingle
 431:           options={BUDGET_OPTIONS}
 432:           value={form.budget_band}
 433:           onChange={(v) =>
 434:             set("budget_band", v as SidebarFormData["budget_band"])
 435:           }
 436:           labelOf={(k) =>
 437:             t(
 438:               `briefing.step2.sections.detail.budget.options.${k}` as Parameters<
 439:                 typeof t
 440:               >[0],
 441:             )
 442:           }
 443:         />
 444:       </FieldBlock>
 445: 
 446:       <FieldBlock title={t("briefing.step2.sections.detail.delivery_date.label")}>
 447:         <Input
 448:           type="date"
 449:           value={form.target_delivery_at}
 450:           onChange={(e) => set("target_delivery_at", e.target.value)}
 451:           className="text-sm max-w-xs"
 452:         />
 453:       </FieldBlock>
 454: 
 455:       <FieldBlock
 456:         title={t("briefing.step2.sections.detail.meeting_at.label")}
 457:         helper={t("briefing.step2.sections.detail.meeting_at.helper")}
 458:       >
 459:         <Input
 460:           type="datetime-local"
 461:           value={form.meeting_preferred_at}
 462:           onChange={(e) => set("meeting_preferred_at", e.target.value)}
 463:           className="text-sm max-w-xs"
 464:         />
 465:       </FieldBlock>
 466: 
 467:       <div
 468:         className={cn(
 469:           "rounded-2xl p-4 flex items-start gap-3",
 470:           form.interested_in_twin
 471:             ? "bg-emerald-50 border border-emerald-200"
 472:             : "border border-border/40",
 473:         )}
 474:       >
 475:         <input
 476:           type="checkbox"
 477:           id="twin-toggle"
 478:           checked={form.interested_in_twin}
 479:           onChange={(e) => set("interested_in_twin", e.target.checked)}
 480:           className="mt-1"
 481:         />
 482:         <div className="flex flex-col gap-1">
 483:           <Label
 484:             htmlFor="twin-toggle"
 485:             className="text-sm font-semibold cursor-pointer keep-all"
 486:           >
 487:             {t("briefing.step2.sections.detail.twin_toggle.label")}
 488:           </Label>
 489:           <p className="text-xs text-muted-foreground keep-all leading-relaxed">
 490:             {t("briefing.step2.sections.detail.twin_toggle.helper")}
 491:           </p>
 492:         </div>
 493:       </div>
 494:     </aside>
 495:   );
 496: }

 succeeded in 869ms:
src/app/api/oembed\route.ts:2:// Phase 5 Wave B task_05 v3 sub_5 — oembed proxy (allowlist-only)
src/app/api/oembed\route.ts:5:// returns { provider, thumbnail_url?, oembed_html?, title? } for client
src/app/api/oembed\route.ts:10://   OG-meta scrape path (safeFetchHtml + parseMeta) was removed because
src/app/api/oembed\route.ts:11://   `assertSafeUrl()` resolved DNS up-front but the subsequent `fetch()`
src/app/api/oembed\route.ts:12://   performed its own DNS lookup again — leaving a DNS-rebinding window
src/app/api/oembed\route.ts:14://   into the request requires an undici dispatcher with a custom lookup
src/app/api/oembed\route.ts:16://   call the provider's official oembed endpoint via lib/oembed) and
src/app/api/oembed\route.ts:71:  oembed_html: string | null;
src/app/api/oembed\route.ts:91:  // YouTube + Vimeo — call the provider's trusted oembed endpoint via
src/app/api/oembed\route.ts:92:  // lib/oembed (fetchVideoMetadata). Lazy-imported so the route file
src/app/api/oembed\route.ts:96:      const { fetchVideoMetadata } = await import("@/lib/oembed");
src/app/api/oembed\route.ts:102:          oembed_html: null,
src/app/api/oembed\route.ts:114:        oembed_html: null,
src/app/api/oembed\route.ts:126:        oembed_html: null,
src/app/api/oembed\route.ts:134:  // undici dispatcher with IP-pinning lookup to be SSRF-safe).
src/app/api/oembed\route.ts:139:      oembed_html: null,
src/lib\ip-classify.ts:15:import { promises as dns } from "node:dns";
src/lib\ip-classify.ts:177:    const records = await dns.lookup(host, { all: true, verbatim: true });
src/lib\commission\queries.ts:44: * Public sponsor-name lookup for challenge pages. RLS makes the `clients`
src/lib\commission\queries.ts:46: * use the service-role client for a narrowly-scoped single-column lookup.
src/lib\invoices\suggest-line-items.ts:36: * (any non-void invoice). Uses one batched lookup keyed on (source_type, source_id).
src/lib\notifications\debounce.ts:43:  // Locale fallback if profile lookup fails (default 'ko').
src/lib\og-unfurl.ts:48:  const res = await fetch(url, {
src/lib\google\calendar.ts:118:    const res = await fetch(url, {
src/lib\google\calendar.ts:170:    const res = await fetch(url, {
src/lib\oembed\index.ts:6:// Cache key: oembed:v1:<sha256(url)> — hashed to avoid PII leak from query params.
src/lib\oembed\index.ts:39:  return `oembed:v1:${createHash("sha256").update(url).digest("hex")}`;
src/lib\oembed\index.ts:130:  const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
src/lib\oembed\index.ts:131:  const res = await fetch(endpoint, {
src/lib\oembed\index.ts:147:  const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
src/lib\oembed\index.ts:148:  const res = await fetch(endpoint, {
src/lib\oembed\index.ts:175:export async function fetchVideoMetadata(
src/lib\og-video-unfurl.ts:8: * Runs on the Node runtime (ip-classify uses node:dns / node:net).
src/lib\og-video-unfurl.ts:72:  const res = await fetch(url, {
src/lib\og-video-unfurl.ts:192:  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(
src/lib\og-video-unfurl.ts:195:  const json = asRecord(await fetchJson(oembed, signal));
src/lib\og-video-unfurl.ts:214:  const oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(
src/lib\og-video-unfurl.ts:217:  const json = asRecord(await fetchJson(oembed, signal));
src/lib\og-video-unfurl.ts:236:  const oembed = `https://www.tiktok.com/oembed?url=${encodeURIComponent(
src/lib\og-video-unfurl.ts:239:  const json = asRecord(await fetchJson(oembed, signal));
src/lib\og-video-unfurl.ts:259:  const oembed = `https://graph.facebook.com/v19.0/instagram_oembed?url=${encodeURIComponent(
src/lib\og-video-unfurl.ts:262:  const json = asRecord(await fetchJson(oembed, signal));

codex
The lazy import resolves to `src/lib/oembed/index.ts`; the route only imports it after matching YouTube/Vimeo host regexes. I’m reading that helper now to make sure it does not reintroduce arbitrary target fetches.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/lib/oembed/index.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"briefing_documents_insert|briefing_documents_update|briefing_documents_delete|GRANT UPDATE|REVOKE UPDATE|p\\.status\" supabase/migrations" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 605ms:
   1: // =============================================================================
   2: // Phase 3.0 ??oEmbed client with caching
   3: //
   4: // Supports YouTube + Vimeo only. Never throws ??returns null on any error.
   5: // Cache: @vercel/kv if env vars present, else module-scoped Map fallback.
   6: // Cache key: oembed:v1:<sha256(url)> ??hashed to avoid PII leak from query params.
   7: // TTL: 30 days.
   8: // =============================================================================
   9: 
  10: import { createHash } from "node:crypto";
  11: 
  12: // ---------------------------------------------------------------------------
  13: // Types
  14: // ---------------------------------------------------------------------------
  15: 
  16: export type OEmbedResult = {
  17:   provider: "youtube" | "vimeo";
  18:   title: string;
  19:   thumbnailUrl: string;
  20:   durationSeconds?: number;
  21: };
  22: 
  23: // ---------------------------------------------------------------------------
  24: // Cache helpers
  25: // ---------------------------------------------------------------------------
  26: 
  27: type CacheEntry = {
  28:   value: OEmbedResult | null;
  29:   expiresAt: number;
  30: };
  31: 
  32: // Module-scoped fallback cache (in-memory Map). Shared across requests within
  33: // the same server process lifetime. On access we evict expired entries lazily.
  34: const _mapCache = new Map<string, CacheEntry>();
  35: 
  36: const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
  37: 
  38: function cacheKey(url: string): string {
  39:   return `oembed:v1:${createHash("sha256").update(url).digest("hex")}`;
  40: }
  41: 
  42: // @vercel/kv type shim ??used only if the package is present at runtime.
  43: // We avoid a hard import so the module doesn't fail when kv isn't installed.
  44: type KvClient = {
  45:   get<T>(key: string): Promise<T | null>;
  46:   set(key: string, value: unknown, opts?: { ex?: number }): Promise<unknown>;
  47: };
  48: 
  49: async function tryGetKvClient(): Promise<KvClient | null> {
  50:   if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
  51:     return null;
  52:   }
  53:   try {
  54:     // eslint-disable-next-line @typescript-eslint/no-explicit-any -- optional dep not in package.json
  55:     const mod = await (Function('return import("@vercel/kv")')() as Promise<any>);
  56:     return (mod.kv as KvClient) ?? null;
  57:   } catch {
  58:     return null;
  59:   }
  60: }
  61: 
  62: async function cacheGet(key: string): Promise<OEmbedResult | null | undefined> {
  63:   const kv = await tryGetKvClient();
  64:   if (kv) {
  65:     try {
  66:       const stored = await kv.get<OEmbedResult | null>(key);
  67:       if (stored !== undefined) return stored;
  68:     } catch {
  69:       // kv read failure ??fall through to map cache
  70:     }
  71:   }
  72: 
  73:   // Map fallback
  74:   const entry = _mapCache.get(key);
  75:   if (!entry) return undefined;
  76:   if (Date.now() > entry.expiresAt) {
  77:     _mapCache.delete(key);
  78:     return undefined;
  79:   }
  80:   return entry.value;
  81: }
  82: 
  83: async function cacheSet(key: string, value: OEmbedResult | null): Promise<void> {
  84:   const kv = await tryGetKvClient();
  85:   if (kv) {
  86:     try {
  87:       const ttlSeconds = Math.floor(TTL_MS / 1000);
  88:       await kv.set(key, value, { ex: ttlSeconds });
  89:       return;
  90:     } catch {
  91:       // fall through to map cache
  92:     }
  93:   }
  94: 
  95:   // Map fallback ??also prune stale entries on write (keep memory bounded)
  96:   if (_mapCache.size > 5000) {
  97:     const now = Date.now();
  98:     for (const [k, v] of _mapCache) {
  99:       if (now > v.expiresAt) _mapCache.delete(k);
 100:     }
 101:   }
 102:   _mapCache.set(key, { value, expiresAt: Date.now() + TTL_MS });
 103: }
 104: 
 105: // ---------------------------------------------------------------------------
 106: // Provider detection
 107: // ---------------------------------------------------------------------------
 108: 
 109: const YOUTUBE_RE =
 110:   /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
 111: const VIMEO_RE = /^(https?:\/\/)?(www\.)?vimeo\.com\//;
 112: 
 113: // ---------------------------------------------------------------------------
 114: // oEmbed fetch helpers
 115: // ---------------------------------------------------------------------------
 116: 
 117: type RawYouTubeOEmbed = {
 118:   title?: string;
 119:   thumbnail_url?: string;
 120:   // YouTube does not include duration in the oEmbed response
 121: };
 122: 
 123: type RawVimeoOEmbed = {
 124:   title?: string;
 125:   thumbnail_url?: string;
 126:   duration?: number; // seconds
 127: };
 128: 
 129: async function fetchYouTube(url: string): Promise<OEmbedResult | null> {
 130:   const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
 131:   const res = await fetch(endpoint, {
 132:     signal: AbortSignal.timeout(3000),
 133:     headers: { "User-Agent": "YagiWorkshop/1.0" },
 134:   });
 135:   if (!res.ok) return null;
 136:   const json = (await res.json()) as RawYouTubeOEmbed;
 137:   if (!json.title || !json.thumbnail_url) return null;
 138:   return {
 139:     provider: "youtube",
 140:     title: json.title,
 141:     thumbnailUrl: json.thumbnail_url,
 142:     // durationSeconds not available from YouTube oEmbed
 143:   };
 144: }
 145: 
 146: async function fetchVimeo(url: string): Promise<OEmbedResult | null> {
 147:   const endpoint = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
 148:   const res = await fetch(endpoint, {
 149:     signal: AbortSignal.timeout(3000),
 150:     headers: { "User-Agent": "YagiWorkshop/1.0" },
 151:   });
 152:   if (!res.ok) return null;
 153:   const json = (await res.json()) as RawVimeoOEmbed;
 154:   if (!json.title || !json.thumbnail_url) return null;
 155:   return {
 156:     provider: "vimeo",
 157:     title: json.title,
 158:     thumbnailUrl: json.thumbnail_url,
 159:     durationSeconds: typeof json.duration === "number" ? json.duration : undefined,
 160:   };
 161: }
 162: 
 163: // ---------------------------------------------------------------------------
 164: // Public API
 165: // ---------------------------------------------------------------------------
 166: 
 167: /**
 168:  * Fetch video metadata via oEmbed for a YouTube or Vimeo URL.
 169:  *
 170:  * - Returns null for unsupported providers, network errors, timeouts, or
 171:  *   malformed responses. Never throws.
 172:  * - Results are cached for 30 days using @vercel/kv (if env vars are set)
 173:  *   or a module-scoped Map.
 174:  */
 175: export async function fetchVideoMetadata(
 176:   url: string,
 177: ): Promise<OEmbedResult | null> {
 178:   // Validate it looks like a URL before doing anything
 179:   let normalised: string;
 180:   try {
 181:     normalised = new URL(url).href;
 182:   } catch {
 183:     return null;
 184:   }
 185: 
 186:   const isYouTube = YOUTUBE_RE.test(normalised);
 187:   const isVimeo = VIMEO_RE.test(normalised);
 188:   if (!isYouTube && !isVimeo) return null;
 189: 
 190:   const key = cacheKey(normalised);
 191: 
 192:   try {
 193:     const cached = await cacheGet(key);
 194:     if (cached !== undefined) return cached;
 195:   } catch {
 196:     // cache read failure ??continue to live fetch
 197:   }
 198: 
 199:   try {
 200:     const result = isYouTube
 201:       ? await fetchYouTube(normalised)
 202:       : await fetchVimeo(normalised);
 203: 
 204:     try {
 205:       await cacheSet(key, result);
 206:     } catch {
 207:       // cache write failure ??non-fatal
 208:     }
 209: 
 210:     return result;
 211:   } catch {
 212:     // network error, timeout, JSON parse error ??all return null per spec
 213:     return null;
 214:   }
 215: }

 succeeded in 1258ms:
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:16:--   1. REVOKE UPDATE ON workspaces FROM authenticated  (table-level)
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:32:REVOKE UPDATE ON public.workspaces FROM authenticated;
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:34:GRANT UPDATE (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:85:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:108:-- (REVOKE UPDATE + selective GRANT excludes created_at) so the 24h
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:110:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:147:CREATE POLICY "briefing_documents_delete" ON briefing_documents
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:155:        AND p.status = 'draft'
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:179:REVOKE UPDATE ON public.briefing_documents FROM authenticated;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:180:GRANT UPDATE (note, category) ON public.briefing_documents TO authenticated;
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:10:--       INSERT still lands because the briefing_documents_insert RLS
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:13:--       status at all. The briefing_documents_update RLS policy from the
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:28:-- The DELETE policy already includes p.status='draft' (Wave A baseline),
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:41:DROP POLICY IF EXISTS "briefing_documents_insert" ON briefing_documents;
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:42:CREATE POLICY "briefing_documents_insert" ON briefing_documents
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:51:          AND p.status = 'draft'
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:65:DROP POLICY IF EXISTS "briefing_documents_update" ON briefing_documents;
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:66:CREATE POLICY "briefing_documents_update" ON briefing_documents
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:76:          AND p.status = 'draft'
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:91:          AND p.status = 'draft'
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:102:-- p.status, the table-level UPDATE revoke is still in force, and the
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:116:      AND polname = 'briefing_documents_insert';
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:117:  IF ins_check IS NULL OR ins_check NOT LIKE '%p.status%' THEN
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:118:    RAISE EXCEPTION 'sub_5 F2 assert failed: briefing_documents_insert WITH CHECK does not reference p.status';
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:126:      AND polname = 'briefing_documents_update';
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:127:  IF upd_using IS NULL OR upd_using NOT LIKE '%p.status%' THEN
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:128:    RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update USING does not reference p.status';
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:130:  IF upd_check IS NULL OR upd_check NOT LIKE '%p.status%' THEN
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:131:    RAISE EXCEPTION 'sub_5 F3 assert failed: briefing_documents_update WITH CHECK does not reference p.status';
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:137:      AND polname = 'briefing_documents_delete';
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:138:  IF del_using IS NULL OR del_using NOT LIKE '%p.status%' THEN
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:139:    RAISE EXCEPTION 'sub_5 verify failed: briefing_documents_delete USING no longer references p.status (Wave A regression)';

codex
## VERDICT: CLEAN

No NEW HIGH/MED findings.

F1 closed: `route.ts` has no DNS resolution path and no generic-host fetch. Only YouTube/Vimeo enter `fetchVideoMetadata`; Instagram and generic responses are synthetic. `validateUrlShape` is pure URL/hostname shape validation and blocks `localhost`, `*.localhost`, `*.local`, and `*.internal`. The lazy import of `@/lib/oembed` does not introduce arbitrary fetch: `src/lib/oembed/index.ts` fetches only YouTube/Vimeo provider oEmbed endpoints.

F2/F3 closed: the new migration adds `p.status = 'draft'` to `briefing_documents_insert` `WITH CHECK`, and to `briefing_documents_update` `USING` plus `WITH CHECK`. The `yagi_admin` bypass remains outside those draft-gated branches. `DROP POLICY IF EXISTS` plus `CREATE POLICY` makes the policy replacement idempotent, and the grant assertions are verification-only.

F5 closed: autosave is single-flight via `inFlightRef`; `pendingRef` stores only the latest queued snapshot; completion drains pending after clearing `inFlightRef`; `lastCommittedRef` updates only on `res.ok` using `JSON.stringify(snapshot)`. The debounce cleanup still clears the timer.

Run log summary: LOOP 2 narrow verify CLEAN: F1/F2/F3/F5 closures confirmed; no new HIGH/MED findings introduced.
tokens used
51,920
## VERDICT: CLEAN

No NEW HIGH/MED findings.

F1 closed: `route.ts` has no DNS resolution path and no generic-host fetch. Only YouTube/Vimeo enter `fetchVideoMetadata`; Instagram and generic responses are synthetic. `validateUrlShape` is pure URL/hostname shape validation and blocks `localhost`, `*.localhost`, `*.local`, and `*.internal`. The lazy import of `@/lib/oembed` does not introduce arbitrary fetch: `src/lib/oembed/index.ts` fetches only YouTube/Vimeo provider oEmbed endpoints.

F2/F3 closed: the new migration adds `p.status = 'draft'` to `briefing_documents_insert` `WITH CHECK`, and to `briefing_documents_update` `USING` plus `WITH CHECK`. The `yagi_admin` bypass remains outside those draft-gated branches. `DROP POLICY IF EXISTS` plus `CREATE POLICY` makes the policy replacement idempotent, and the grant assertions are verification-only.

F5 closed: autosave is single-flight via `inFlightRef`; `pendingRef` stores only the latest queued snapshot; completion drains pending after clearing `inFlightRef`; `lastCommittedRef` updates only on `res.ok` using `JSON.stringify(snapshot)`. The debounce cleanup still clears the timer.

Run log summary: LOOP 2 narrow verify CLEAN: F1/F2/F3/F5 closures confirmed; no new HIGH/MED findings introduced.
