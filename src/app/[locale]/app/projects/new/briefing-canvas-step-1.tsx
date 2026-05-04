"use client";

// =============================================================================
// Phase 5 Wave B task_04 v3 — Briefing Canvas Step 1 (minimal intent)
//
// Hotfix (yagi visual review):
//   - DELIVERABLE_OPTIONS reduced from 8 → 5 with sharper enum names that
//     map directly to the request type (image / ad_video_short /
//     ad_video_long / ai_vfx_mv / branding_video).
//   - Layout switched from horizontal chip flex-wrap to vertical
//     radio-list rows with checkbox affordance + sub-description per
//     option, fixing the wrap-visibility bleed yagi saw on Step 1.
//   - Per-section "복수 선택 가능" helper removed — checkbox affordance
//     carries the multi-select signal without prose redundancy.
//   - Form-mode + fail-handler fix lives in briefing-canvas.tsx
//     (mode='onSubmit' + handleSubmit fail callback) so silent
//     validation drops can no longer block the [다음 →] transition.
// =============================================================================

import { useFormContext, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Step1FormData } from "./briefing-canvas";

// ---------------------------------------------------------------------------
// Field option enums (i18n-keyed labels)
// ---------------------------------------------------------------------------

const DELIVERABLE_OPTIONS = [
  "image",
  "ad_video_short",
  "ad_video_long",
  "ai_vfx_mv",
  "branding_video",
] as const;

const PURPOSE_OPTIONS = [
  "sns_channel",
  "sns_ad",
  "branding",
  "event_campaign",
  "offline_tvcf",
  "other",
] as const;

// ---------------------------------------------------------------------------
// Multi-select vertical list. Each row = checkbox + label (+ optional
// description). aria-pressed retained so screen readers still announce
// state; role attribute kept implicit (button), letting Enter/Space toggle.
// ---------------------------------------------------------------------------

function MultiList({
  options,
  value,
  onChange,
  labelOf,
  descriptionOf,
}: {
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  labelOf: (opt: string) => string;
  descriptionOf?: (opt: string) => string | null;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value.includes(opt);
        const desc = descriptionOf ? descriptionOf(opt) : null;
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
              "flex items-center gap-3 px-4 py-3 rounded-xl text-left",
              "border transition-colors",
              selected
                ? "border-foreground bg-foreground/5"
                : "border-border/40 hover:border-border",
            )}
          >
            <span
              className={cn(
                "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                selected
                  ? "border-foreground bg-foreground"
                  : "border-border/60",
              )}
            >
              {selected && <Check className="w-3 h-3 text-background" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium keep-all">
                {labelOf(opt)}
              </div>
              {desc && (
                <div className="text-xs text-muted-foreground mt-0.5 keep-all">
                  {desc}
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section block — single-column, generous spacing
// ---------------------------------------------------------------------------

function SectionBlock({
  title,
  optional,
  children,
}: {
  title: string;
  optional?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-semibold tracking-tight keep-all">
            {title}
          </h2>
          {optional && (
            <span className="text-xs text-muted-foreground">{optional}</span>
          )}
        </div>
      </header>
      <div>{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step 1 main component
// ---------------------------------------------------------------------------

export function BriefingCanvasStep1({
  onNext,
  onCancel,
  submitting,
}: {
  onNext: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const t = useTranslations("projects");
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Step1FormData>();

  const labelDeliverable = (k: string) =>
    t(
      `briefing.step1.field.deliverable_types.options.${k}` as Parameters<
        typeof t
      >[0],
    );
  const descriptionDeliverable = (k: string) =>
    t(
      `briefing.step1.field.deliverable_types.descriptions.${k}` as Parameters<
        typeof t
      >[0],
    );
  const labelPurpose = (k: string) =>
    t(
      `briefing.step1.field.purpose.options.${k}` as Parameters<typeof t>[0],
    );

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-6 lg:px-12 pt-16 pb-12">
        <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
          {t("briefing.step1.header.eyebrow")}
        </p>
        <h1 className="font-display text-3xl tracking-tight mb-3 keep-all">
          {t("briefing.step1.header.title")}
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed keep-all">
          {t("briefing.step1.header.description")}
        </p>
      </div>

      {/* Form (single column) */}
      <div className="max-w-2xl mx-auto px-6 lg:px-12 flex flex-col gap-10">
        {/* Project name */}
        <SectionBlock title={t("briefing.step1.field.name.label")}>
          <Input
            {...register("name")}
            placeholder={t("briefing.step1.field.name.placeholder")}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className="text-xs text-destructive mt-2 keep-all">
              {t("briefing.step1.error.name_required")}
            </p>
          )}
          <Label htmlFor="briefing-name" className="sr-only">
            {t("briefing.step1.field.name.label")}
          </Label>
        </SectionBlock>

        {/* Deliverable types */}
        <SectionBlock
          title={t("briefing.step1.field.deliverable_types.label")}
        >
          <Controller
            control={control}
            name="deliverable_types"
            render={({ field }) => (
              <MultiList
                options={DELIVERABLE_OPTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
                labelOf={labelDeliverable}
                descriptionOf={descriptionDeliverable}
              />
            )}
          />
          {errors.deliverable_types && (
            <p className="text-xs text-destructive mt-2 keep-all">
              {t("briefing.step1.error.deliverable_types_required")}
            </p>
          )}
        </SectionBlock>

        {/* Purpose */}
        <SectionBlock title={t("briefing.step1.field.purpose.label")}>
          <Controller
            control={control}
            name="purpose"
            render={({ field }) => (
              <MultiList
                options={PURPOSE_OPTIONS}
                value={field.value ?? []}
                onChange={field.onChange}
                labelOf={labelPurpose}
              />
            )}
          />
          {errors.purpose && (
            <p className="text-xs text-destructive mt-2 keep-all">
              {t("briefing.step1.error.purpose_required")}
            </p>
          )}
        </SectionBlock>

        {/* Description (optional) */}
        <SectionBlock
          title={t("briefing.step1.field.description.label")}
          optional={t("briefing.step1.field.description.optional")}
        >
          <Textarea
            {...register("description")}
            placeholder={t("briefing.step1.field.description.placeholder")}
            rows={4}
            className="resize-none"
          />
        </SectionBlock>
      </div>

      {/* Sticky bottom CTA — left: cancel-to-list, right: primary [다음 →]. */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors keep-all"
          >
            {t("briefing.step1.cancel_to_list")}
          </button>
          <Button
            type="button"
            onClick={onNext}
            disabled={submitting}
            className="text-sm rounded-full px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("briefing.step1.cta.next")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
