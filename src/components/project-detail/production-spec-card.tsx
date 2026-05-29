"use client";

import { useMemo, useState, useTransition } from "react";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { updateProductionSpec } from "@/app/[locale]/app/projects/[id]/brief/actions";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type ProductionSpecForm = {
  mood_keywords: string[];
  mood_keywords_free: string;
  visual_ratio: string;
  visual_ratio_custom: string;
  channels: string[];
};

export type ProductionSpecLabels = {
  eyebrow: string;
  title: string;
  description: string;
  summary_label: string;
  not_set: string;
  mood_label: string;
  mood_helper: string;
  mood_free_placeholder: string;
  ratio_label: string;
  ratio_custom_placeholder: string;
  channels_label: string;
  channels_helper: string;
  save: string;
  saving: string;
  saved: string;
  save_error: string;
  read_only: string;
  mood_options: Record<string, string>;
  channel_options: Record<string, string>;
  visual_ratio_options: Record<string, string>;
};

export function ProductionSpecCard({
  projectId,
  initial,
  canEdit,
  labels,
}: {
  projectId: string;
  initial: ProductionSpecForm;
  canEdit: boolean;
  labels: ProductionSpecLabels;
}) {
  const [form, setForm] = useState<ProductionSpecForm>(initial);
  const [lastSaved, setLastSaved] = useState<ProductionSpecForm>(initial);
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(lastSaved),
    [form, lastSaved],
  );

  const moodSummary = form.mood_keywords
    .map((key) => labels.mood_options[key] ?? key)
    .filter(Boolean);
  if (form.mood_keywords_free.trim()) {
    moodSummary.push(form.mood_keywords_free.trim());
  }

  const ratioSummary = form.visual_ratio
    ? form.visual_ratio === "custom"
      ? `${labels.visual_ratio_options.custom ?? "Custom"}${
          form.visual_ratio_custom.trim()
            ? ` (${form.visual_ratio_custom.trim()})`
            : ""
        }`
      : (labels.visual_ratio_options[form.visual_ratio] ?? form.visual_ratio)
    : null;

  const channelSummary = form.channels
    .map((key) => labels.channel_options[key] ?? key)
    .filter(Boolean);

  const hasSummary =
    moodSummary.length > 0 || Boolean(ratioSummary) || channelSummary.length > 0;

  const set = <K extends keyof ProductionSpecForm>(
    key: K,
    value: ProductionSpecForm[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const toggleMulti = (
    key: "mood_keywords" | "channels",
    value: string,
  ) => {
    setForm((current) => {
      const selected = current[key].includes(value);
      return {
        ...current,
        [key]: selected
          ? current[key].filter((item) => item !== value)
          : [...current[key], value],
      };
    });
  };

  const save = () => {
    startTransition(async () => {
      const result = await updateProductionSpec({
        projectId,
        mood_keywords: form.mood_keywords,
        mood_keywords_free: form.mood_keywords_free,
        visual_ratio: form.visual_ratio || null,
        visual_ratio_custom: form.visual_ratio_custom,
        channels: form.channels,
      });

      if (!("ok" in result) || !result.ok) {
        toast.error(labels.save_error);
        return;
      }

      setLastSaved(form);
      toast.success(labels.saved);
    });
  };

  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
              <Settings2 className="h-4 w-4" aria-hidden="true" />
              {labels.eyebrow}
            </p>
            <h3 className="text-lg font-semibold text-foreground keep-all">
              {labels.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
              {labels.description}
            </p>
          </div>
          {!canEdit && (
            <span className="inline-flex w-fit items-center rounded-full border border-border/70 bg-surface-card px-3 py-1 text-xs font-medium text-muted-foreground keep-all">
              {labels.read_only}
            </span>
          )}
        </header>

        <div className="rounded-lg border border-border/70 bg-surface-card p-4">
          <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
            {labels.summary_label}
          </p>
          {hasSummary ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {moodSummary.map((item) => (
                <SummaryChip key={`mood-${item}`} label={item} />
              ))}
              {ratioSummary && (
                <SummaryChip key="ratio" label={ratioSummary} />
              )}
              {channelSummary.map((item) => (
                <SummaryChip key={`channel-${item}`} label={item} />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground keep-all">
              {labels.not_set}
            </p>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <FieldBlock title={labels.mood_label} helper={labels.mood_helper}>
            <ChipMulti
              options={MOOD_OPTIONS}
              value={form.mood_keywords}
              disabled={!canEdit || isPending}
              labelOf={(key) => labels.mood_options[key] ?? key}
              onToggle={(key) => toggleMulti("mood_keywords", key)}
            />
            <Input
              value={form.mood_keywords_free}
              onChange={(event) =>
                set("mood_keywords_free", event.target.value)
              }
              disabled={!canEdit || isPending}
              placeholder={labels.mood_free_placeholder}
              className="text-sm"
            />
          </FieldBlock>

          <FieldBlock title={labels.ratio_label}>
            <ChipSingle
              options={VISUAL_RATIO_OPTIONS}
              value={form.visual_ratio}
              disabled={!canEdit || isPending}
              labelOf={(key) => labels.visual_ratio_options[key] ?? key}
              onChange={(key) =>
                set("visual_ratio", form.visual_ratio === key ? "" : key)
              }
            />
            {form.visual_ratio === "custom" && (
              <Input
                value={form.visual_ratio_custom}
                onChange={(event) =>
                  set("visual_ratio_custom", event.target.value)
                }
                disabled={!canEdit || isPending}
                placeholder={labels.ratio_custom_placeholder}
                className="max-w-xs text-sm"
              />
            )}
          </FieldBlock>

          <FieldBlock
            title={labels.channels_label}
            helper={labels.channels_helper}
          >
            <ChipMulti
              options={CHANNEL_OPTIONS}
              value={form.channels}
              disabled={!canEdit || isPending}
              labelOf={(key) => labels.channel_options[key] ?? key}
              onToggle={(key) => toggleMulti("channels", key)}
            />
          </FieldBlock>
        </div>

        {canEdit && (
          <div className="flex justify-end border-t border-border/50 pt-5">
            <button
              type="button"
              onClick={save}
              disabled={!dirty || isPending}
              className={cn(
                "inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors keep-all",
                dirty
                  ? "bg-brand text-brand-on hover:bg-brand/90"
                  : "border border-border/70 bg-surface-card text-muted-foreground",
                isPending && "cursor-wait opacity-70",
              )}
            >
              {isPending ? labels.saving : labels.save}
            </button>
          </div>
        )}
      </div>
    </section>
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
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <Label className="text-sm font-semibold text-foreground keep-all">
        {title}
      </Label>
      {helper && (
        <p className="mt-1 text-xs leading-5 text-muted-foreground keep-all">
          {helper}
        </p>
      )}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function ChipMulti({
  options,
  value,
  disabled,
  labelOf,
  onToggle,
}: {
  options: readonly string[];
  value: string[];
  disabled: boolean;
  labelOf: (key: string) => string;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value.includes(option);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onToggle(option)}
            className={chipClassName(selected)}
          >
            {labelOf(option)}
          </button>
        );
      })}
    </div>
  );
}

function ChipSingle({
  options,
  value,
  disabled,
  labelOf,
  onChange,
}: {
  options: readonly string[];
  value: string;
  disabled: boolean;
  labelOf: (key: string) => string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option)}
            className={chipClassName(selected)}
          >
            {labelOf(option)}
          </button>
        );
      })}
    </div>
  );
}

function chipClassName(selected: boolean) {
  return cn(
    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors keep-all disabled:cursor-not-allowed disabled:opacity-60",
    selected
      ? "border-brand bg-brand-soft text-brand"
      : "border-border/70 bg-surface-card-deep text-foreground hover:border-border hover:bg-accent/50",
  );
}

function SummaryChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/70 bg-surface-card-deep px-2.5 py-1 text-xs font-medium text-foreground/85 keep-all">
      {label}
    </span>
  );
}
