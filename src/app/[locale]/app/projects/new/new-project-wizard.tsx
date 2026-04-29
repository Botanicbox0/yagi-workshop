"use client";

// =============================================================================
// Phase 3.0 task_03 — New Project Wizard (3-step rewrite)
//
// Steps:
//   1. 프로젝트 요약 (Project Summary) — name + description + references
//   2. 조건 (Conditions)               — deliverable_types + budget_band + delivery_date
//   3. 최종 확인 (Final review)         — summary card, re-editable refs, submit
//
// Design rules applied:
//   - font-suit for step titles (L-010, PRINCIPLES §4.1)
//   - Achromatic only (L-011, PRINCIPLES §4.2)
//   - No border-b between header + form (L-012, ANTI_PATTERNS §10.1)
//   - Soft layered shadow on cards (L-013, PRINCIPLES §4.3)
//   - No <em>/<i> (L-014)
//
// oEmbed: paste a YouTube/Vimeo URL → fetchVideoMetadataAction → thumbnail card
// File uploads: R2 presigned PUT via existing uploadAsset pattern (image + PDF)
// Autosave: debounced 500ms, reuses ensureDraftProject find-or-create pattern
// Submit placeholder: TODO(task_04) comment — submitProjectAction not wired here
// =============================================================================

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  ensureDraftProject,
  submitProjectAction,
  type WizardDraftFields,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ReferenceBoard,
  type WizardReference,
} from "@/components/projects/wizard/reference-board";
import { SummaryCard } from "@/components/projects/wizard/summary-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// WizardReference type is defined and exported from reference-board.tsx (Phase 3.0 hotfix-1)

type BudgetBand =
  | "under_1m"
  | "1m_to_5m"
  | "5m_to_10m"
  | "negotiable";

const BUDGET_BANDS: BudgetBand[] = [
  "under_1m",
  "1m_to_5m",
  "5m_to_10m",
  "negotiable",
];

const DELIVERABLE_OPTIONS = [
  "video",
  "image",
  "motion_graphics",
  "illustration",
  "vfx",
  "branding",
  "other",
] as const;

// ---------------------------------------------------------------------------
// Form schema (step 1 + step 2 fields)
// ---------------------------------------------------------------------------

const wizardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  // hotfix-2: description max reduced to 500 (Step 1 is "한 줄"); synced with
  // server SubmitInputSchema (L-026 — client + server schemas must stay in sync)
  description: z.string().trim().min(1).max(500),
  deliverable_types: z.array(z.string().trim().min(1)).min(1),
  budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
  delivery_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
});

type WizardFormData = z.infer<typeof wizardSchema>;

type Step = 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface NewProjectWizardProps {
  brands?: { id: string; name: string }[];
}

// ---------------------------------------------------------------------------
// Eyebrow label component
// ---------------------------------------------------------------------------

function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: Step }) {
  return (
    <ol className="flex items-center gap-3 mb-10" aria-label="wizard progress">
      {([1, 2, 3] as Step[]).map((s, i) => {
        const isCompleted = s < current;
        const isActive = s === current;
        return (
          <li key={s} className="flex items-center gap-3">
            {i > 0 && (
              <span className="w-8 h-px bg-border" aria-hidden />
            )}
            <span
              className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold transition-colors",
                isCompleted &&
                  "bg-foreground text-background",
                isActive &&
                  "bg-foreground text-background",
                !isCompleted &&
                  !isActive &&
                  "bg-muted text-muted-foreground"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {isCompleted ? "✓" : s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ReferenceCard and ReferencesEditor replaced by ReferenceBoard (Phase 3.0 hotfix-1 task_05)
// See src/components/projects/wizard/reference-board.tsx

// ---------------------------------------------------------------------------
// Budget radio
// ---------------------------------------------------------------------------

function BudgetRadio({
  value,
  onChange,
}: {
  value: BudgetBand | "";
  onChange: (v: BudgetBand) => void;
}) {
  const t = useTranslations("projects");
  return (
    <div className="grid grid-cols-2 gap-2" role="radiogroup">
      {BUDGET_BANDS.map((band) => {
        const selected = value === band;
        return (
          <button
            key={band}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(band)}
            className={cn(
              "rounded-lg px-3 py-2.5 text-sm text-left transition-colors keep-all",
              selected
                ? "bg-foreground text-background"
                : "border border-border/40 hover:border-border"
            )}
            style={
              !selected
                ? {
                    boxShadow:
                      "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
                  }
                : undefined
            }
          >
            {t(`wizard.field.budget.${band}` as Parameters<typeof t>[0])}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deliverable chips
// ---------------------------------------------------------------------------

function DeliverableChips({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const t = useTranslations("projects");
  return (
    <div className="flex flex-wrap gap-1.5">
      {DELIVERABLE_OPTIONS.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(
                selected
                  ? value.filter((v) => v !== opt)
                  : [...value, opt]
              )
            }
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors keep-all",
              selected
                ? "bg-foreground text-background"
                : "border border-border/40 hover:border-border"
            )}
            aria-pressed={selected}
          >
            {t(`wizard.field.deliverable_types.${opt}` as Parameters<typeof t>[0])}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard component
// ---------------------------------------------------------------------------

export function NewProjectWizard({ brands: _brands = [] }: NewProjectWizardProps) {
  const t = useTranslations("projects");
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [refs, setRefs] = useState<WizardReference[]>([]);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  const {
    register,
    control,
    getValues,
    watch,
    trigger,
    formState: { errors },
  } = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      name: "",
      description: "",
      deliverable_types: [],
      budget_band: undefined,
      delivery_date: "",
    },
  });

  // -------------------------------------------------------------------------
  // Autosave helpers
  // -------------------------------------------------------------------------

  function buildDraftFields(): WizardDraftFields {
    const v = getValues();
    return {
      title: v.name.trim(),
      description: v.description || null,
      brand_id: null,
      tone: null,
      deliverable_types: v.deliverable_types ?? [],
      estimated_budget_range: v.budget_band || null,
      target_delivery_at:
        v.delivery_date && v.delivery_date !== "" ? v.delivery_date : null,
    };
  }

  const triggerAutosave = useCallback(() => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void (async () => {
        const fields = buildDraftFields();
        if (!fields.title) return;
        try {
          const res = await ensureDraftProject({ initial: fields });
          if ("ok" in res && res.ok) {
            setDraftProjectId(res.data.projectId);
          }
        } catch {
          // autosave failures are silent
        }
      })();
    }, 500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Watch form fields for autosave + live summary card re-render
  const watchedValues = watch();
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    triggerAutosave();
  }, [watchedValues, refs, triggerAutosave]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Step navigation
  // -------------------------------------------------------------------------

  async function goToStep2() {
    const valid = await trigger(["name", "description"]);
    if (!valid) return;
    setStep(2);
  }

  // hotfix-2: Step 2 is references-only (optional); no validation gate.
  // deliverable_types + budget_band validation moved to goToStep4 (submit gate in Step 3).
  function goToStep3() {
    setStep(3);
  }

  // Validate admin fields before submitting from Step 3
  async function validateStep3Fields(): Promise<boolean> {
    return trigger(["deliverable_types", "budget_band"]);
  }

  // -------------------------------------------------------------------------
  // Step 1 — Project summary
  // -------------------------------------------------------------------------

  const step1Content = (
    <div className="space-y-6">
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="name">
          {t("wizard.field.name.label")}{" "}
          <span className="text-destructive" aria-hidden>
            *
          </span>
        </Label>
        <Input
          id="name"
          placeholder={t("wizard.field.name.placeholder")}
          maxLength={80}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive" role="alert">
            {t("wizard.errors.name_required")}
          </p>
        )}
      </div>

      {/* Description — hotfix-2: label + placeholder updated; References moved to Step 2 */}
      <div className="space-y-1.5">
        <Label htmlFor="description">
          {t("wizard.field.description.label")}{" "}
          <span className="text-destructive" aria-hidden>
            *
          </span>
        </Label>
        <Textarea
          id="description"
          placeholder={t("wizard.field.description.placeholder")}
          rows={4}
          maxLength={500}
          {...register("description")}
        />
        {errors.description ? (
          <p className="text-xs text-destructive" role="alert">
            {t("wizard.errors.description_required")}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground keep-all">
            {t("wizard.field.description.helper")}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end pt-2">
        <Button
          type="button"
          className="rounded-full uppercase tracking-[0.10em] text-sm"
          onClick={() => void goToStep2()}
        >
          {t("wizard.actions.continue")}
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Step 2 — Reference materials (hotfix-2: refs-only, optional)
  // -------------------------------------------------------------------------

  const step2Content = (
    <div className="space-y-6">
      {/* "선택" tone sub text */}
      <p className="text-sm text-muted-foreground keep-all">
        {t("wizard.step2.sub")}
      </p>

      {/* ReferenceBoard — after Wave A upload fix */}
      <ReferenceBoard refs={refs} onChange={setRefs} />

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full uppercase tracking-[0.10em] text-xs"
          onClick={() => setStep(1)}
        >
          {t("wizard.actions.back")}
        </Button>
        <Button
          type="button"
          className="rounded-full uppercase tracking-[0.10em] text-sm"
          onClick={() => goToStep3()}
        >
          {t("wizard.actions.continue")}
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Step 3 — Admin info + live summary card (hotfix-2 restructure)
  // -------------------------------------------------------------------------

  // watchedValues is used both for autosave (above) and for live summary card
  const step3Content = (
    <div className="space-y-8">
      {/* Admin info fields — deliverable types + budget + delivery date */}
      {/* (relocated from old Step 2) */}
      <div className="space-y-6">
        {/* Step 3 sub */}
        <p className="text-sm text-muted-foreground keep-all">
          {t("wizard.step3.sub")}
        </p>

        {/* Deliverable types */}
        <div className="space-y-2">
          <Label>{t("wizard.field.deliverable_types.label")}</Label>
          <Controller
            control={control}
            name="deliverable_types"
            render={({ field }) => (
              <DeliverableChips
                value={field.value ?? []}
                onChange={field.onChange}
              />
            )}
          />
          {errors.deliverable_types && (
            <p className="text-xs text-destructive" role="alert">
              {t("wizard.errors.deliverable_required")}
            </p>
          )}
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <Label>{t("wizard.field.budget.label")}</Label>
          <Controller
            control={control}
            name="budget_band"
            render={({ field }) => (
              <BudgetRadio
                value={(field.value as BudgetBand) ?? ""}
                onChange={field.onChange}
              />
            )}
          />
          {errors.budget_band && (
            <p className="text-xs text-destructive" role="alert">
              {t("wizard.errors.budget_required")}
            </p>
          )}
        </div>

        {/* Delivery date */}
        <div className="space-y-1.5">
          <Label htmlFor="delivery_date">
            {t("wizard.field.delivery_date.label")}
          </Label>
          <Input
            id="delivery_date"
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            {...register("delivery_date")}
          />
        </div>
      </div>

      {/* Live summary card — updates as fields fill (L-012 no seam between form + card) */}
      <SummaryCard
        name={watchedValues.name}
        description={watchedValues.description}
        refs={refs}
        deliverableTypes={watchedValues.deliverable_types ?? []}
        budgetBand={watchedValues.budget_band ?? ""}
        deliveryDate={watchedValues.delivery_date ?? ""}
        onEditStep={(s) => setStep(s)}
      />

      {/* Edit hint */}
      <p className="text-xs text-muted-foreground keep-all">
        {t("wizard.summary.edit_hint")}
      </p>

      {/* Action row */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-full uppercase tracking-[0.10em] text-xs"
          onClick={() => setStep(2)}
        >
          {t("wizard.actions.back")}
        </Button>

        <Button
          type="button"
          className="rounded-full uppercase tracking-[0.10em] text-sm"
          disabled={isSubmitting}
          onClick={() => {
            startSubmit(async () => {
              // Validate admin fields before submitting
              const isValid = await validateStep3Fields();
              if (!isValid) return;

              const formVals = getValues();
              const result = await submitProjectAction({
                name: formVals.name,
                description: formVals.description,
                deliverable_types: formVals.deliverable_types,
                budget_band: formVals.budget_band,
                delivery_date:
                  formVals.delivery_date && formVals.delivery_date !== ""
                    ? formVals.delivery_date
                    : null,
                references: refs.map((r) => ({
                  id: r.id,
                  kind: r.kind,
                  url: r.url,
                  note: r.note,
                  title: r.title,
                  thumbnailUrl: r.thumbnailUrl,
                  durationSeconds: r.durationSeconds,
                })),
                draftProjectId,
              });
              if (result.ok) {
                router.push(result.redirect);
              } else {
                toast.error(
                  result.error === "unauthenticated"
                    ? "로그인이 필요합니다"
                    : "제출에 실패했습니다. 다시 시도해 주세요."
                );
              }
            });
          }}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            t("wizard.actions.submit")
          )}
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const stepTitleKey = (
    {
      1: "wizard.step1.title",
      2: "wizard.step2.title",
      3: "wizard.step3.title",
    } as const
  )[step];

  const stepEyebrowKey = (
    {
      1: "wizard.step1.eyebrow",
      2: "wizard.step2.eyebrow",
      3: "wizard.step3.eyebrow",
    } as const
  )[step];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <StepIndicator current={step} />

      {/* Step header — no border-b below (L-012) */}
      <div className="mb-8">
        <Eyebrow>{t(stepEyebrowKey)}</Eyebrow>
        <h2 className="font-suit text-3xl font-bold tracking-tight mt-1 keep-all">
          {t(stepTitleKey)}
        </h2>
      </div>

      {step === 1 && step1Content}
      {step === 2 && step2Content}
      {step === 3 && step3Content}
    </div>
  );
}
