"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 sub_5 — Step 2 right column (디테일 sidebar + autosave)
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
            rows={3}
            className="resize-none text-sm"
          />
        </FieldBlock>

        {/* Full-width divider between content/intent fields and budget/timing. */}
        <div className="lg:col-span-2 h-px bg-border/40" />

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

        <FieldBlock
          title={t("briefing.step2.sections.detail.delivery_date.label")}
        >
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
            "rounded-2xl p-4 flex items-start gap-3 self-start",
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
      </div>
    </section>
  );
}
