"use client";

import { Controller, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Check,
  History,
  Link as LinkIcon,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  LatestProjectSeed,
  PendingAction,
  Step1FormData,
} from "./briefing-canvas";

const DELIVERABLE_OPTIONS = [
  "image",
  "ad_video_short",
  "ad_video_long",
  "ai_vfx_mv",
  "branding_video",
] as const;

const PLANNING_OPTIONS = ["want_proposal", "have"] as const;

const RETURNING_STATUS_KEYS = new Set([
  "submitted",
  "in_review",
  "in_progress",
  "delivered",
  "approved",
  "changes_requested",
]);

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
    <div className="grid gap-2 sm:grid-cols-2">
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
              "group flex min-h-[92px] items-start gap-3 rounded-lg border px-4 py-3 text-left transition-colors",
              selected
                ? "border-brand/70 bg-brand-soft text-foreground"
                : "border-border/70 bg-surface-card text-foreground hover:border-brand/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                selected ? "border-brand bg-brand" : "border-border",
              )}
            >
              {selected && <Check className="h-3 w-3 text-brand-on" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium keep-all">
                {labelOf(opt)}
              </span>
              {desc && (
                <span className="mt-1 block text-xs leading-5 text-muted-foreground keep-all">
                  {desc}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SectionBlock({
  title,
  helper,
  children,
}: {
  title: string;
  helper?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border/70 py-6 first:border-t-0 first:pt-0">
      <header className="mb-4">
        <h2 className="text-sm font-semibold tracking-tight keep-all">{title}</h2>
        {helper && (
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground keep-all">
            {helper}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BriefingCanvasStep1({
  isReturningRequester,
  priorProjectCount,
  latestProject,
  onDetails,
  onLightSubmit,
  onCancel,
  pendingAction,
}: {
  isReturningRequester: boolean;
  priorProjectCount: number;
  latestProject: LatestProjectSeed | null;
  onDetails: () => void;
  onLightSubmit: () => void;
  onCancel: () => void;
  pendingAction: PendingAction;
}) {
  const t = useTranslations("projects");
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<Step1FormData>();

  const labelDeliverable = (key: string) =>
    t(
      `briefing.step1.field.deliverable_types.options.${key}` as Parameters<
        typeof t
      >[0],
    );
  const descriptionDeliverable = (key: string) =>
    t(
      `briefing.step1.field.deliverable_types.descriptions.${key}` as Parameters<
        typeof t
      >[0],
    );
  const returningStatusLabel = (status: string) =>
    RETURNING_STATUS_KEYS.has(status)
      ? t(
          `briefing.step1.returning.status.${status}` as Parameters<typeof t>[0],
        )
      : status;

  const disabled = pendingAction !== null;
  const descriptionLabel = isReturningRequester
    ? t("briefing.step1.field.description.returning_label")
    : t("briefing.step1.field.description.label");
  const descriptionHelper = isReturningRequester
    ? t("briefing.step1.field.description.returning_helper")
    : t("briefing.step1.field.description.helper");
  const descriptionPlaceholder = isReturningRequester
    ? t("briefing.step1.field.description.returning_placeholder")
    : t("briefing.step1.field.description.placeholder");

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background pb-32 text-foreground">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-brand/10 via-background to-background" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-12 lg:pt-16">
        <section className="flex min-h-[620px] flex-col justify-between gap-10">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {isReturningRequester
                ? t("briefing.step1.header.returning_eyebrow", {
                    count: priorProjectCount,
                  })
                : t("briefing.step1.header.eyebrow")}
            </p>
            <h1 className="max-w-[680px] whitespace-pre-line text-4xl font-semibold leading-[1.02] tracking-tight keep-all sm:text-5xl lg:text-6xl">
              {isReturningRequester
                ? t("briefing.step1.header.returning_title")
                : t("briefing.step1.header.title")}
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground keep-all sm:text-base">
              {isReturningRequester
                ? t("briefing.step1.header.returning_description")
                : t("briefing.step1.header.description")}
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-lg border border-border/70 bg-surface-raised p-5">
              <p className="text-xs font-semibold uppercase tracking-label text-brand-ink">
                {t("briefing.step1.light_rule.title")}
              </p>
              <p className="mt-3 text-sm leading-6 text-foreground keep-all">
                {t("briefing.step1.light_rule.body")}
              </p>
            </div>

            {isReturningRequester && latestProject ? (
              <LatestProjectCard
                latestProject={latestProject}
                labelDeliverable={labelDeliverable}
                statusLabel={returningStatusLabel(latestProject.status)}
              />
            ) : (
              <div className="relative overflow-hidden rounded-lg border border-border/70 bg-surface-card-deep p-5">
                {/* GPT image slot: public/brief/intake-hero.png. Prompt: Cinematic abstract studio atmosphere, near-black charcoal background, single diagonal sweep of deep crimson volumetric light, fine film grain, soft bokeh, premium editorial, large empty negative space on the left for text, 16:9, photoreal light study, no text. */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-soft via-surface-card-deep to-brand-deep" />
                <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-brand/20 blur-3xl" />
                <div className="relative flex items-end justify-between gap-6">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
                      {t("briefing.step1.visual_slot.eyebrow")}
                    </p>
                    <p className="mt-10 max-w-sm text-sm leading-6 text-foreground keep-all">
                      {t("briefing.step1.visual_slot.body")}
                    </p>
                  </div>
                  <span className="hidden h-20 w-px bg-gradient-to-b from-transparent via-brand to-transparent sm:block" />
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border/70 bg-surface-raised p-5 shadow-2xl sm:p-7">
          <SectionBlock title={t("briefing.step1.field.name.label")}>
            <Label htmlFor="briefing-name" className="sr-only">
              {t("briefing.step1.field.name.label")}
            </Label>
            <Input
              id="briefing-name"
              {...register("name")}
              placeholder={
                isReturningRequester
                  ? t("briefing.step1.field.name.returning_placeholder")
                  : t("briefing.step1.field.name.placeholder")
              }
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              className="h-12 bg-surface-card text-base"
            />
            {errors.name && (
              <p className="mt-2 text-xs text-destructive keep-all">
                {t("briefing.step1.error.name_required")}
              </p>
            )}
          </SectionBlock>

          <SectionBlock
            title={t("briefing.step1.field.planning.label")}
            helper={t("briefing.step1.field.planning.helper")}
          >
            <Controller
              control={control}
              name="planning_mode"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLANNING_OPTIONS.map((option) => {
                    const selected = (field.value ?? "want_proposal") === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => field.onChange(option)}
                        className={cn(
                          "rounded-lg border px-4 py-3 text-left transition-colors",
                          selected
                            ? "border-brand/70 bg-brand-soft"
                            : "border-border/70 bg-surface-card hover:border-brand/50",
                        )}
                      >
                        <span className="block text-sm font-semibold keep-all">
                          {t(
                            `briefing.step1.field.planning.options.${option}` as Parameters<
                              typeof t
                            >[0],
                          )}
                        </span>
                        <span className="mt-1.5 block text-xs leading-5 text-muted-foreground keep-all">
                          {t(
                            `briefing.step1.field.planning.descriptions.${option}` as Parameters<
                              typeof t
                            >[0],
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </SectionBlock>

          <SectionBlock
            title={t("briefing.step1.field.deliverable_types.label")}
            helper={t("briefing.step1.field.deliverable_types.helper")}
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
              <p className="mt-2 text-xs text-destructive keep-all">
                {t("briefing.step1.error.deliverable_types_required")}
              </p>
            )}
          </SectionBlock>

          <SectionBlock title={descriptionLabel} helper={descriptionHelper}>
            <Textarea
              {...register("description")}
              placeholder={descriptionPlaceholder}
              rows={5}
              className="resize-none bg-surface-card"
              aria-invalid={Boolean(errors.description)}
            />
            {errors.description && (
              <p className="mt-2 text-xs text-destructive keep-all">
                {t("briefing.step1.error.description_required")}
              </p>
            )}
          </SectionBlock>

          <SectionBlock
            title={t("briefing.step1.field.reference.label")}
            helper={t("briefing.step1.field.reference.helper")}
          >
            <div className="relative">
              <LinkIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                {...register("reference_url")}
                placeholder={t("briefing.step1.field.reference.placeholder")}
                aria-invalid={Boolean(errors.reference_url)}
                className="h-12 bg-surface-card pl-9"
              />
            </div>
            {errors.reference_url && (
              <p className="mt-2 text-xs text-destructive keep-all">
                {t("briefing.step1.error.reference_url_invalid")}
              </p>
            )}
          </SectionBlock>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border/40 bg-background/95 backdrop-blur-md md:left-[240px]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-6 py-4 lg:px-12">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline keep-all"
          >
            {t("briefing.step1.cancel_to_list")}
          </button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onDetails}
              disabled={disabled}
              className="rounded-full border-border/70 bg-surface-card px-4 text-sm sm:px-5"
            >
              {pendingAction === "details" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("briefing.step1.cta.details")
              )}
            </Button>
            <Button
              type="button"
              onClick={onLightSubmit}
              disabled={disabled}
              className="gap-2 rounded-full bg-brand px-5 text-sm text-brand-on hover:bg-brand/90"
            >
              {pendingAction === "submit" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("briefing.step1.cta.submit")}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function LatestProjectCard({
  latestProject,
  labelDeliverable,
  statusLabel,
}: {
  latestProject: LatestProjectSeed;
  labelDeliverable: (key: string) => string;
  statusLabel: string;
}) {
  const t = useTranslations("projects");
  return (
    <div className="rounded-lg border border-border/70 bg-surface-card-deep p-5">
      {/* GPT image slot: public/brief/returning-welcome.png. Prompt: Minimal dark scene, matte black, small warm red glow like a distant signal light, subtle haze, calm confident mood, lots of empty space, vertical 4:5, no text. */}
      <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
        <History className="h-3.5 w-3.5" aria-hidden />
        {t("briefing.step1.returning.previous_label")}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold tracking-tight keep-all">
            {latestProject.title}
          </h2>
          <span className="rounded-full border border-border/70 bg-surface-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {t("briefing.step1.returning.updated_at", {
            date: formatDate(latestProject.updated_at),
          })}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {latestProject.deliverable_types.length > 0 ? (
            latestProject.deliverable_types.map((type) => (
              <span
                key={type}
                className="rounded-full border border-border/70 bg-surface-card px-2.5 py-1 text-[11px] text-foreground"
              >
                {labelDeliverable(type)}
              </span>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">
              {t("briefing.step1.returning.no_deliverables")}
            </span>
          )}
        </div>
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground keep-all">
          {latestProject.brief || t("briefing.step1.returning.no_brief")}
        </p>
      </div>
    </div>
  );
}
