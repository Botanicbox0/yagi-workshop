"use client";

// =============================================================================
// Phase 5 Wave B task_04 v3 — Briefing Canvas Step 1 (minimal intent)
//
// Paradigm shift from db0295f's 9-field 3-col grid: Step 1 is now a tight
// "프로젝트 시작 (~30s)" surface that only captures what's needed to spin
// up a draft project on the server. Everything else (mood, channels,
// budget, audience, …) lives in Step 2's workspace surface.
//
// Form fields (4):
//   - 프로젝트 이름 (text, required)
//   - 어떤 콘텐츠인가요? (multi-chip, required, 1+)
//   - 이 콘텐츠를 어디에 쓰시나요? (multi-chip, required, 1+)
//   - 간단히 설명해주세요 (textarea, optional)
//
// Single CTA: [다음 →]. No back button — Step 1 is the entry point. No
// "임시 저장" button — Step 1 stays in sessionStorage between renders;
// pressing 다음 commits to the server (ensureBriefingDraftProject).
// =============================================================================

import { useFormContext, Controller } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Step1FormData } from "./briefing-canvas";

// ---------------------------------------------------------------------------
// Field option enums (i18n-keyed labels, identical preset to Wave A spec)
// ---------------------------------------------------------------------------

const DELIVERABLE_OPTIONS = [
  "ad_video",
  "image",
  "ai_human", // Phase 5 Q-508 hybrid Twin option (the "C" half)
  "motion_graphics",
  "vfx",
  "branding",
  "illustration",
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
// Section block — single-column, generous spacing
// ---------------------------------------------------------------------------

function SectionBlock({
  title,
  helper,
  optional,
  children,
}: {
  title: string;
  helper?: string;
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
// Step 1 main component
// ---------------------------------------------------------------------------

export function BriefingCanvasStep1({
  onNext,
  submitting,
}: {
  onNext: () => void;
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
          helper={t("briefing.step1.field.deliverable_types.helper")}
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
          {errors.deliverable_types && (
            <p className="text-xs text-destructive mt-2 keep-all">
              {t("briefing.step1.error.deliverable_types_required")}
            </p>
          )}
        </SectionBlock>

        {/* Purpose */}
        <SectionBlock
          title={t("briefing.step1.field.purpose.label")}
          helper={t("briefing.step1.field.purpose.helper")}
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
          {errors.purpose && (
            <p className="text-xs text-destructive mt-2 keep-all">
              {t("briefing.step1.error.purpose_required")}
            </p>
          )}
        </SectionBlock>

        {/* Description (optional) */}
        <SectionBlock
          title={t("briefing.step1.field.description.label")}
          helper={t("briefing.step1.field.description.helper")}
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

      {/* Sticky bottom CTA — single button, right-aligned */}
      <div className="fixed bottom-0 inset-x-0 border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-end">
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
