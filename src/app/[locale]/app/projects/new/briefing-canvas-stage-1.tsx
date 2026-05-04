"use client";

// =============================================================================
// Phase 5 Wave B task_04 — Briefing Canvas Stage 1: intent form (3-col grid)
// KICKOFF v1.2 §task_04 lines 596-674. 9 form fields + project name header.
//
// IA:
//   Header (eyebrow / title / description + project name field)
//   3-column grid (lg:grid-cols-3, mobile fallback grid-cols-1):
//     Col 1: deliverable_types / purpose / channels
//     Col 2: description / visual_ratio / target_audience
//     Col 3: has_plan / mood_keywords / additional_notes
//   Sticky bottom CTA: 이전으로 / 임시 저장 / 저장 후 다음 단계 →
//
// Form state lives in the parent BriefingCanvas via FormProvider.
// All fields use react-hook-form's useFormContext + Controller / register.
//
// K-05 SKIP per KICKOFF — UI + i18n only. No RLS / server-action surface.
// =============================================================================

import { useFormContext, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Stage1FormData } from "./briefing-canvas";

// ---------------------------------------------------------------------------
// Field option enums (i18n-keyed)
// ---------------------------------------------------------------------------

const DELIVERABLE_OPTIONS = [
  "ad_video_15",
  "ad_video_30",
  "ad_video_long",
  "image_lookbook",
  "ai_human", // Phase 5 hybrid Twin option (Q-508 §C)
  "motion_graphics",
  "illustration",
  "vfx",
  "branding",
  "other",
] as const;

const PURPOSE_OPTIONS = [
  "sns_ad",
  "branding",
  "sns_channel",
  "event",
  "offline",
  "other",
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

// ---------------------------------------------------------------------------
// Multi-select chip component
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
                selected ? value.filter((v) => v !== opt) : [...value, opt],
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

// ---------------------------------------------------------------------------
// Single-select chip component
// ---------------------------------------------------------------------------

function ChipSingle({
  options,
  value,
  onChange,
  labelOf,
}: {
  options: readonly string[];
  value: string | undefined;
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
            onClick={() => onChange(opt)}
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

// ---------------------------------------------------------------------------
// Section card — reusable wrapper for each form group
// ---------------------------------------------------------------------------

function SectionCard({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-4">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {title}
        </h2>
        {helper && (
          <p className="text-xs text-muted-foreground mt-1.5 keep-all leading-relaxed">
            {helper}
          </p>
        )}
      </header>
      <div>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Stage 1 main component
// ---------------------------------------------------------------------------

export function BriefingCanvasStage1({
  onBack,
  onSaveDraft,
  onNext,
}: {
  onBack: () => void;
  onSaveDraft: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("projects");
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Stage1FormData>();

  const labelDeliverable = (k: string) =>
    t(`briefing.stage1.field.deliverable_types.options.${k}` as Parameters<typeof t>[0]);
  const labelPurpose = (k: string) =>
    t(`briefing.stage1.field.purpose.options.${k}` as Parameters<typeof t>[0]);
  const labelChannel = (k: string) =>
    t(`briefing.stage1.field.channels.options.${k}` as Parameters<typeof t>[0]);
  const labelRatio = (k: string) =>
    t(`briefing.stage1.field.visual_ratio.options.${k}` as Parameters<typeof t>[0]);
  const labelMood = (k: string) =>
    t(`briefing.stage1.field.mood_keywords.options.${k}` as Parameters<typeof t>[0]);

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-10">
        <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
          {t("briefing.stage1.header.eyebrow")}
        </p>
        <h1 className="font-display text-3xl tracking-tight mb-3 keep-all">
          {t("briefing.stage1.header.title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-2xl">
          {t("briefing.stage1.header.description")}
        </p>

        {/* Project name field */}
        <div className="mt-10 max-w-2xl">
          <Label
            htmlFor="briefing-name"
            className="text-base font-semibold tracking-tight keep-all"
          >
            {t("briefing.stage1.field.name.label")}
          </Label>
          <Input
            id="briefing-name"
            {...register("name")}
            placeholder={t("briefing.stage1.field.name.placeholder")}
            className="mt-3"
            autoComplete="off"
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-2 keep-all">
              {t("briefing.stage1.error.name_required")}
            </p>
          )}
        </div>
      </div>

      {/* 3-col grid */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 */}
        <div className="flex flex-col gap-6">
          <SectionCard
            title={t("briefing.stage1.field.deliverable_types.label")}
            helper={t("briefing.stage1.field.deliverable_types.helper")}
          >
            <Controller
              control={control}
              name="deliverable_types"
              render={({ field }) => (
                <ChipMulti
                  options={DELIVERABLE_OPTIONS}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  labelOf={labelDeliverable}
                />
              )}
            />
          </SectionCard>

          <SectionCard
            title={t("briefing.stage1.field.purpose.label")}
            helper={t("briefing.stage1.field.purpose.helper")}
          >
            <Controller
              control={control}
              name="purpose"
              render={({ field }) => (
                <ChipMulti
                  options={PURPOSE_OPTIONS}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  labelOf={labelPurpose}
                />
              )}
            />
          </SectionCard>

          <SectionCard
            title={t("briefing.stage1.field.channels.label")}
            helper={t("briefing.stage1.field.channels.helper")}
          >
            <Controller
              control={control}
              name="channels"
              render={({ field }) => (
                <ChipMulti
                  options={CHANNEL_OPTIONS}
                  value={field.value ?? []}
                  onChange={field.onChange}
                  labelOf={labelChannel}
                />
              )}
            />
          </SectionCard>
        </div>

        {/* Col 2 */}
        <div className="flex flex-col gap-6">
          <SectionCard
            title={t("briefing.stage1.field.description.label")}
          >
            <Textarea
              {...register("description")}
              placeholder={t("briefing.stage1.field.description.placeholder")}
              rows={6}
              className="resize-none"
            />
            {errors.description && (
              <p className="text-xs text-destructive mt-2 keep-all">
                {t("briefing.stage1.error.description_required")}
              </p>
            )}
          </SectionCard>

          <SectionCard title={t("briefing.stage1.field.visual_ratio.label")}>
            <Controller
              control={control}
              name="visual_ratio"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  <ChipSingle
                    options={VISUAL_RATIO_OPTIONS}
                    value={field.value}
                    onChange={field.onChange}
                    labelOf={labelRatio}
                  />
                  {field.value === "custom" && (
                    <Input
                      {...register("visual_ratio_custom")}
                      placeholder={t(
                        "briefing.stage1.field.visual_ratio.custom_placeholder",
                      )}
                      className="max-w-xs"
                    />
                  )}
                </div>
              )}
            />
          </SectionCard>

          <SectionCard
            title={t("briefing.stage1.field.target_audience.label")}
          >
            <Textarea
              {...register("target_audience")}
              placeholder={t(
                "briefing.stage1.field.target_audience.placeholder",
              )}
              rows={3}
              className="resize-none"
            />
          </SectionCard>
        </div>

        {/* Col 3 */}
        <div className="flex flex-col gap-6">
          <SectionCard title={t("briefing.stage1.field.has_plan.label")}>
            <Controller
              control={control}
              name="has_plan"
              render={({ field }) => (
                <RadioGroup
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  className="flex flex-col gap-3"
                >
                  {HAS_PLAN_OPTIONS.map((opt) => (
                    <div key={opt} className="flex items-center gap-3">
                      <RadioGroupItem value={opt} id={`has-plan-${opt}`} />
                      <Label
                        htmlFor={`has-plan-${opt}`}
                        className="text-sm font-normal cursor-pointer keep-all"
                      >
                        {t(
                          `briefing.stage1.field.has_plan.options.${opt}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </SectionCard>

          <SectionCard
            title={t("briefing.stage1.field.mood_keywords.label")}
            helper={t("briefing.stage1.field.mood_keywords.helper")}
          >
            <Controller
              control={control}
              name="mood_keywords"
              render={({ field }) => (
                <div className="flex flex-col gap-3">
                  <ChipMulti
                    options={MOOD_OPTIONS}
                    value={field.value ?? []}
                    onChange={field.onChange}
                    labelOf={labelMood}
                  />
                  <Input
                    {...register("mood_keywords_free")}
                    placeholder={t(
                      "briefing.stage1.field.mood_keywords.free_input_placeholder",
                    )}
                    className="text-sm"
                  />
                </div>
              )}
            />
          </SectionCard>

          <SectionCard
            title={t("briefing.stage1.field.additional_notes.label")}
            helper={t("briefing.stage1.field.additional_notes.helper")}
          >
            <Textarea
              {...register("additional_notes")}
              placeholder={t(
                "briefing.stage1.field.additional_notes.placeholder",
              )}
              rows={4}
              className="resize-none"
            />
          </SectionCard>
        </div>
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            className="text-sm"
          >
            {t("briefing.stage1.cta.back")}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onSaveDraft}
              className="text-sm"
            >
              {t("briefing.stage1.cta.save_draft")}
            </Button>
            <Button
              type="button"
              onClick={onNext}
              className="text-sm rounded-full px-6"
            >
              {t("briefing.stage1.cta.next")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
