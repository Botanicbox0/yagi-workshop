"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 hotfix-5 — Step 2 detail (4 fields + autosave)
//
// Down from 12 fields to 4 after yagi visual review. Step 2 now hosts
// only the "shape of the work" inputs:
//   - mood_keywords + mood_keywords_free
//   - visual_ratio + visual_ratio_custom
//   - channels
//   - target_audience
//
// The remaining 6 fields (has_plan, additional_notes, budget_band,
// target_delivery_at, meeting_preferred_at, interested_in_twin) move
// to Step 3 (지원 정보 + 마지막 한 마디 + commit) and land there in
// task_06 v3. The DB columns are unchanged; updateProjectMetadataAction
// keeps the full 12-field schema (every field optional / partial-update
// safe) so Step 3 can reuse it.
//
// Layout (lg+):
//   Row 1: mood             | visual_ratio
//   Row 2: channels         | target_audience
// (mobile stacks single column.)
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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

// ---------------------------------------------------------------------------
// Form state shape — 4 fields after hotfix-5. The remaining DB columns
// (has_plan, additional_notes, budget_band, target_delivery_at,
// meeting_preferred_at, interested_in_twin) ship in Step 3.
// ---------------------------------------------------------------------------

export type SidebarFormData = {
  mood_keywords: string[];
  mood_keywords_free: string;
  visual_ratio: string;
  visual_ratio_custom: string;
  channels: string[];
  target_audience: string;
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
      // Step 2 owns 4 fields. Step 3 (task_06 v3) sends the remaining
      // 6 (has_plan, additional_notes, budget_band, target_delivery_at,
      // meeting_preferred_at, interested_in_twin). The action's metadata
      // schema treats every field as optional / partial-update safe, so
      // omitting them here leaves their stored values untouched.
      const res = await updateProjectMetadataAction({
        projectId,
        mood_keywords: snapshot.mood_keywords,
        mood_keywords_free: snapshot.mood_keywords_free || null,
        visual_ratio: snapshot.visual_ratio || null,
        visual_ratio_custom: snapshot.visual_ratio_custom || null,
        channels: snapshot.channels,
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
    <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-8">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.detail.title")}
        </h2>
      </header>

      {/* Internal 2-col form grid (full-width row). Mood / channels /
          textareas span single cells; the divider span the full row. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
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

        <FieldBlock
          title={t("briefing.step2.sections.detail.visual_ratio.label")}
        >
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
      </div>
    </section>
  );
}
