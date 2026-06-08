"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 hotfix-6 — Step 2 essential audience only
//
// Production spec fields moved out of the intake form. Step 2 keeps only
// target_audience because audience/objective is essential upfront.
//
// has_plan is now owned by the Step 1 light intake path. The remaining
// commit fields (additional_notes, budget_band, target_delivery_at,
// meeting_preferred_at, interested_in_twin) live in Step 3.
//
// Local form state debounces 5 seconds then commits via
// updateProjectMetadataAction. Visible status indicator in the sticky
// CTA bar lives in the parent orchestrator (this component reports
// state via the onAutosaveState callback).
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
//   snapshot ever commits — intermediate keystrokes that were superseded
//   during a long in-flight save are dropped on the floor (which is the
//   correct semantics: the user's most recent state is what persists).
// =============================================================================

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProjectMetadataAction } from "./briefing-step2-actions";

// ---------------------------------------------------------------------------
// Form state shape — target_audience only.
// ---------------------------------------------------------------------------

export type SidebarFormData = {
  target_audience: string;
};

export type AutosaveState = "idle" | "saving" | "saved" | "error";

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
        target_audience: snapshot.target_audience || null,
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
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 lg:p-6 flex flex-col gap-5">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.detail.title")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
          {t("briefing.step2.sections.detail.helper")}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Label className="text-sm font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.detail.target.label")}
        </Label>
        <Textarea
          value={form.target_audience}
          onChange={(e) => set("target_audience", e.target.value)}
          placeholder={t("briefing.step2.sections.detail.target.placeholder")}
          rows={4}
          className="resize-none text-sm"
        />
      </div>
    </section>
  );
}
