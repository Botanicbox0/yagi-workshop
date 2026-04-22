"use client";

import { useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { createProject } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { IntakeModePicker } from "@/components/project/intake-mode-picker";
import { ProposalFields } from "@/components/project/proposal-fields";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const deliverableEnum = z.enum([
  "film",
  "still",
  "campaign",
  "editorial",
  "social",
  "other",
]);

const sharedFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  brand_id: z.string().optional(),
  tone: z.string().max(500).optional(),
  deliverable_types: z.array(deliverableEnum).min(1, "required"),
  estimated_budget_range: z.string().max(100).optional(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
};

const briefSchema = z.object({
  ...sharedFields,
  intake_mode: z.literal("brief"),
});

const proposalSchema = z.object({
  ...sharedFields,
  intake_mode: z.literal("proposal_request"),
  proposal_goal: z.string().trim().min(1, "required").max(800),
  proposal_audience: z.string().max(400).optional().or(z.literal("")),
  proposal_budget_range: z.string().max(100).optional().or(z.literal("")),
  proposal_timeline: z.string().max(200).optional().or(z.literal("")),
});

const formSchema = z.discriminatedUnion("intake_mode", [
  briefSchema,
  proposalSchema,
]);

type FormData = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step = "intake-mode" | "brief" | "refs" | "review";

type Brand = { id: string; name: string };

interface NewProjectWizardProps {
  brands: Brand[];
}

// ---------------------------------------------------------------------------
// Deliverable options
// ---------------------------------------------------------------------------
const DELIVERABLE_VALUES = [
  "film",
  "still",
  "campaign",
  "editorial",
  "social",
  "other",
] as const;

type DeliverableValue = (typeof DELIVERABLE_VALUES)[number];

const STEP_ORDER: Step[] = ["intake-mode", "brief", "refs", "review"];

// ---------------------------------------------------------------------------
// Progress indicator
// ---------------------------------------------------------------------------
function StepIndicator({
  current,
  tProjects,
}: {
  current: Step;
  tProjects: ReturnType<typeof useTranslations<"projects">>;
}) {
  const steps: { key: Step; label: string }[] = [
    { key: "intake-mode", label: tProjects("intake_mode_label") },
    { key: "brief", label: tProjects("brief_step") },
    { key: "refs", label: tProjects("refs_step") },
    { key: "review", label: tProjects("review_step") },
  ];

  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <ol className="flex items-center gap-2 mb-8 text-sm flex-wrap">
      {steps.map(({ key, label }, i) => {
        const isActive = key === current;
        const isCompleted = i < currentIndex;
        return (
          <li key={key} className="flex items-center gap-2">
            {i > 0 && (
              <span className="text-muted-foreground mx-1" aria-hidden>
                &rsaquo;
              </span>
            )}
            <span
              className={cn(
                "keep-all",
                isActive && "font-semibold text-foreground",
                isCompleted && "text-muted-foreground",
                !isActive && !isCompleted && "text-muted-foreground"
              )}
            >
              {isCompleted && (
                <span className="mr-1" aria-hidden>
                  ✓
                </span>
              )}
              {i + 1}. {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------
export function NewProjectWizard({ brands }: NewProjectWizardProps) {
  const t = useTranslations("projects");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [step, setStep] = useState<Step>("intake-mode");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      intake_mode: "brief",
      deliverable_types: [],
    },
  });

  const intakeMode = useWatch({ control, name: "intake_mode" }) ?? "brief";

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function buildPayload(intent: "draft" | "submit") {
    const vals = getValues();
    const base = {
      title: vals.title ?? "",
      description: vals.description || null,
      brand_id: vals.brand_id || null,
      tone: vals.tone || null,
      deliverable_types: vals.deliverable_types ?? [],
      estimated_budget_range: vals.estimated_budget_range || null,
      target_delivery_at:
        vals.target_delivery_at && vals.target_delivery_at !== ""
          ? vals.target_delivery_at
          : null,
      intent,
    };

    if (vals.intake_mode === "proposal_request") {
      return {
        ...base,
        intake_mode: "proposal_request" as const,
        proposal_goal: vals.proposal_goal ?? "",
        proposal_audience: vals.proposal_audience || "",
        proposal_budget_range: vals.proposal_budget_range || "",
        proposal_timeline: vals.proposal_timeline || "",
      };
    }

    return {
      ...base,
      intake_mode: "brief" as const,
    };
  }

  async function handleSaveDraft() {
    const vals = getValues();
    if (!vals.title?.trim()) {
      toast.error(tErrors("validation"));
      return;
    }
    setIsSaving(true);
    try {
      const res = await createProject(buildPayload("draft"));
      if ("error" in res) {
        if (res.error === "unauthenticated") {
          toast.error(tErrors("unauthorized"));
        } else {
          toast.error(tErrors("generic"));
        }
        return;
      }
      // No toast — no fitting i18n key for save draft success
      router.push(`/app/projects/${res.id}` as `/app/projects/${string}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitProject() {
    setIsSubmitting(true);
    try {
      const res = await createProject(buildPayload("submit"));
      if ("error" in res) {
        if (res.error === "unauthenticated") {
          toast.error(tErrors("unauthorized"));
        } else {
          toast.error(tErrors("generic"));
        }
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      router.push(`/app/projects/${res.id}` as `/app/projects/${string}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Advance from Brief step — pure client-side
  const onBriefNext = handleSubmit(() => {
    setStep("refs");
  });

  // ---------------------------------------------------------------------------
  // Step 0 — Intake mode
  // ---------------------------------------------------------------------------
  function IntakeModeStep() {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="font-display text-xl tracking-tight keep-all">
            <em>{t("intake_mode_label")}</em>
          </h2>
        </div>

        <Controller
          control={control}
          name="intake_mode"
          render={({ field }) => (
            <IntakeModePicker
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />

        <div className="flex items-center justify-end pt-2">
          <Button
            type="button"
            className="rounded-full uppercase tracking-[0.12em]"
            onClick={() => setStep("brief")}
          >
            {tCommon("continue")}
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 1 — Brief
  // ---------------------------------------------------------------------------
  function BriefStep() {
    return (
      <form onSubmit={onBriefNext} className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">
            {t("title_label")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            placeholder={t("title_ph")}
            {...register("title")}
          />
          {errors.title && (
            <p className="text-xs text-destructive">{tErrors("validation")}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">{t("description_label")}</Label>
          <Textarea
            id="description"
            placeholder={t("description_ph")}
            rows={4}
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">{tErrors("validation")}</p>
          )}
        </div>

        {/* Proposal fields — shown only when intake_mode === 'proposal_request' */}
        {intakeMode === "proposal_request" && (
          <ProposalFields<FormData> register={register} errors={errors} />
        )}

        {/* Brand */}
        <div className="space-y-1.5">
          <Label htmlFor="brand_id">{t("brand_label")}</Label>
          <Controller
            control={control}
            name="brand_id"
            render={({ field }) => (
              <Select
                onValueChange={field.onChange}
                value={field.value ?? ""}
              >
                <SelectTrigger id="brand_id">
                  <SelectValue placeholder={t("brand_none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t("brand_none")}</SelectItem>
                  {brands.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Tone */}
        <div className="space-y-1.5">
          <Label htmlFor="tone">{t("tone_label")}</Label>
          <Input
            id="tone"
            placeholder={t("tone_ph")}
            {...register("tone")}
          />
          {errors.tone && (
            <p className="text-xs text-destructive">{tErrors("validation")}</p>
          )}
        </div>

        {/* Deliverable types */}
        <div className="space-y-2">
          <Label>
            {t("deliverable_types_label")}{" "}
            <span className="text-destructive">*</span>
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Controller
              control={control}
              name="deliverable_types"
              render={({ field }) => (
                <>
                  {DELIVERABLE_VALUES.map((val) => {
                    const labelKey =
                      `deliverable_${val}` as `deliverable_${DeliverableValue}`;
                    const checked = field.value?.includes(val) ?? false;
                    return (
                      <label
                        key={val}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(c) => {
                            const current = field.value ?? [];
                            field.onChange(
                              c
                                ? [...current, val]
                                : current.filter((v) => v !== val)
                            );
                          }}
                        />
                        <span className="text-sm keep-all">{t(labelKey)}</span>
                      </label>
                    );
                  })}
                </>
              )}
            />
          </div>
          {errors.deliverable_types && (
            <p className="text-xs text-destructive">{tErrors("validation")}</p>
          )}
        </div>

        {/* Budget */}
        <div className="space-y-1.5">
          <Label htmlFor="estimated_budget_range">{t("budget_label")}</Label>
          <Input
            id="estimated_budget_range"
            placeholder={t("budget_ph")}
            {...register("estimated_budget_range")}
          />
          {errors.estimated_budget_range && (
            <p className="text-xs text-destructive">{tErrors("validation")}</p>
          )}
        </div>

        {/* Delivery date */}
        <div className="space-y-1.5">
          <Label htmlFor="target_delivery_at">{t("delivery_label")}</Label>
          <Input
            id="target_delivery_at"
            type="date"
            {...register("target_delivery_at")}
          />
          {errors.target_delivery_at && (
            <p className="text-xs text-destructive">{tErrors("validation")}</p>
          )}
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full uppercase tracking-[0.12em] text-xs"
              onClick={() => setStep("intake-mode")}
            >
              {tCommon("back")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full uppercase tracking-[0.12em] text-xs"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {t("save_draft")}
            </Button>
          </div>
          <Button
            type="submit"
            className="rounded-full uppercase tracking-[0.12em]"
          >
            {tCommon("continue")}
          </Button>
        </div>
      </form>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 2 — References (placeholder)
  // ---------------------------------------------------------------------------
  function RefsStep() {
    return (
      <div className="space-y-6">
        <div className="border border-dashed border-border rounded-lg py-16 flex flex-col items-center justify-center text-center gap-3">
          <p className="font-display text-lg tracking-tight keep-all">
            <em>{t("refs_step")}</em>
          </p>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full uppercase tracking-[0.12em] text-xs"
            onClick={() => setStep("brief")}
          >
            {tCommon("back")}
          </Button>
          <Button
            type="button"
            className="rounded-full uppercase tracking-[0.12em]"
            onClick={() => setStep("review")}
          >
            {tCommon("skip")}
          </Button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Step 3 — Review
  // ---------------------------------------------------------------------------
  function ReviewStep() {
    const vals = getValues();

    const selectedBrand = brands.find((b) => b.id === vals.brand_id);

    function ReviewRow({
      label,
      value,
    }: {
      label: string;
      value: string | null | undefined;
    }) {
      return (
        <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-border last:border-0">
          <dt className="text-sm text-muted-foreground keep-all">{label}</dt>
          <dd className="text-sm keep-all break-words">
            {value || "—"}
          </dd>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <dl className="border border-border rounded-lg px-4">
          <ReviewRow label={t("title_label")} value={vals.title} />
          <ReviewRow
            label={t("description_label")}
            value={vals.description || null}
          />
          <ReviewRow
            label={t("brand_label")}
            value={selectedBrand?.name ?? null}
          />
          <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-border">
            <dt className="text-sm text-muted-foreground keep-all">
              {t("deliverable_types_label")}
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {vals.deliverable_types && vals.deliverable_types.length > 0 ? (
                vals.deliverable_types.map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-border px-2.5 py-0.5 text-xs"
                  >
                    {t(
                      `deliverable_${v}` as `deliverable_${DeliverableValue}`
                    )}
                  </span>
                ))
              ) : (
                <span className="text-sm">&mdash;</span>
              )}
            </dd>
          </div>
          <ReviewRow
            label={t("budget_label")}
            value={vals.estimated_budget_range || null}
          />
          <ReviewRow
            label={t("delivery_label")}
            value={vals.target_delivery_at || null}
          />
        </dl>

        {/* Proposal fields review — only in proposal_request mode */}
        {vals.intake_mode === "proposal_request" && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              {t("intake_mode_proposal_title")}
            </h3>
            <dl className="border border-border rounded-lg px-4">
              <ReviewRow
                label={t("proposal_goal_label")}
                value={vals.proposal_goal || null}
              />
              <ReviewRow
                label={t("proposal_audience_label")}
                value={vals.proposal_audience || null}
              />
              <ReviewRow
                label={t("proposal_budget_range_label")}
                value={vals.proposal_budget_range || null}
              />
              <ReviewRow
                label={t("proposal_timeline_label")}
                value={vals.proposal_timeline || null}
              />
            </dl>
          </div>
        )}

        {/* Action row */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-full uppercase tracking-[0.12em] text-xs"
              onClick={() => setStep("refs")}
            >
              {tCommon("back")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-full uppercase tracking-[0.12em] text-xs"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {t("save_draft")}
            </Button>
          </div>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                className="rounded-full uppercase tracking-[0.12em]"
              >
                {t("submit_project")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("submit_project")}</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSubmitProject}
                  disabled={isSubmitting}
                  className="rounded-full uppercase tracking-[0.12em]"
                >
                  {t("submit_project")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <StepIndicator current={step} tProjects={t} />

      {step === "intake-mode" && <IntakeModeStep />}
      {step === "brief" && <BriefStep />}
      {step === "refs" && <RefsStep />}
      {step === "review" && <ReviewStep />}
    </div>
  );
}
