"use client";

import { useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  ensureDraftProject,
  submitDraftProject,
  type WizardDraftFields,
} from "./actions";
import { BriefBoardEditor } from "@/components/brief-board/editor";
import type { JSONContent } from "@tiptap/react";
import type { Json } from "@/lib/supabase/database.types";
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

// ---------------------------------------------------------------------------
// Schema — Phase 2.7.2 single-flow brief, Phase 2.8.1 wizard draft mode
// ---------------------------------------------------------------------------
// Phase 2.8.1: Step 2 ("refs") now mounts BriefBoardEditor against a real
// project_briefs row — wizard creates the projects row early as status='draft'
// the moment the user clicks Continue from Step 1, so brief content can be
// authored mid-wizard.  Submit flips status='draft' → 'submitted'.
const formSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional(),
  brand_id: z.string().optional(),
  tone: z.string().max(500).optional(),
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .max(10),
  estimated_budget_range: z.string().max(100).optional(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  intake_mode: z.literal("brief"),
});

type FormData = z.infer<typeof formSchema>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Step = "brief" | "refs" | "review";

type Brand = { id: string; name: string };

interface NewProjectWizardProps {
  brands: Brand[];
}

const STEP_ORDER: Step[] = ["brief", "refs", "review"];

type DraftBootstrap = {
  projectId: string;
  brief: {
    contentJson: Json;
    updatedAt: string;
    status: "editing" | "locked";
  };
};

// ---------------------------------------------------------------------------
// Tag input — free-text chip input for `deliverable_types`
// ---------------------------------------------------------------------------
function TagInput({
  value,
  onChange,
  placeholder,
  helperText,
  addLabel,
  removeLabel,
  maxItems = 10,
  maxLength = 60,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  helperText?: string;
  addLabel: string;
  removeLabel: string;
  maxItems?: number;
  maxLength?: number;
}) {
  const [draft, setDraft] = useState("");
  const trimmed = draft.trim();
  const canAdd =
    trimmed.length > 0 &&
    value.length < maxItems &&
    !value.includes(trimmed);

  const addTag = () => {
    const v = trimmed;
    if (!v) return;
    if (value.includes(v)) {
      setDraft("");
      return;
    }
    if (value.length >= maxItems) return;
    onChange([...value, v.slice(0, maxLength)]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          maxLength={maxLength}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          disabled={!canAdd}
          className="rounded-full"
        >
          {addLabel}
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs keep-all"
            >
              {tag}
              <button
                type="button"
                onClick={() =>
                  onChange(value.filter((t) => t !== tag))
                }
                className="text-muted-foreground hover:text-foreground leading-none"
                aria-label={removeLabel}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {helperText && (
        <p className="text-xs text-muted-foreground keep-all">{helperText}</p>
      )}
    </div>
  );
}

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

  const [step, setStep] = useState<Step>("brief");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAdvancing, startAdvance] = useTransition();
  const [draft, setDraft] = useState<DraftBootstrap | null>(null);

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

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function buildFields(): WizardDraftFields {
    const vals = getValues();
    return {
      title: (vals.title ?? "").trim(),
      description: vals.description || null,
      brand_id: vals.brand_id || null,
      tone: vals.tone || null,
      deliverable_types: vals.deliverable_types ?? [],
      estimated_budget_range: vals.estimated_budget_range || null,
      target_delivery_at:
        vals.target_delivery_at && vals.target_delivery_at !== ""
          ? vals.target_delivery_at
          : null,
    };
  }

  // ensureDraftProject is the find-or-create entry. We call it the moment
  // the user clicks Continue out of Step 1 so Step 2 has a real project_id
  // for BriefBoardEditor to autosave against. Subsequent calls are
  // idempotent thanks to the projects_wizard_draft_uniq partial index.
  async function ensureDraft(): Promise<DraftBootstrap | null> {
    if (draft) return draft;
    const fields = buildFields();
    if (!fields.title) {
      toast.error(tErrors("validation"));
      return null;
    }
    const res = await ensureDraftProject({ initial: fields });
    if ("error" in res) {
      if (res.error === "unauthenticated") {
        toast.error(tErrors("unauthorized"));
      } else if (res.error === "no_workspace") {
        toast.error(tErrors("generic"));
      } else {
        toast.error(tErrors("generic"));
      }
      return null;
    }
    const next: DraftBootstrap = {
      projectId: res.data.projectId,
      brief: res.data.brief,
    };
    setDraft(next);
    return next;
  }

  async function handleSaveDraft() {
    const vals = getValues();
    if (!vals.title?.trim()) {
      toast.error(tErrors("validation"));
      return;
    }
    setIsSaving(true);
    try {
      const bootstrap = await ensureDraft();
      if (!bootstrap) return;
      const res = await submitDraftProject({
        projectId: bootstrap.projectId,
        fields: buildFields(),
        intent: "draft",
      });
      if ("error" in res) {
        if (res.error === "unauthenticated") {
          toast.error(tErrors("unauthorized"));
        } else {
          toast.error(tErrors("generic"));
        }
        return;
      }
      router.push(`/app/projects/${res.id}` as `/app/projects/${string}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitProject() {
    setIsSubmitting(true);
    try {
      const bootstrap = await ensureDraft();
      if (!bootstrap) {
        setConfirmOpen(false);
        return;
      }
      const res = await submitDraftProject({
        projectId: bootstrap.projectId,
        fields: buildFields(),
        intent: "submit",
      });
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
      router.push(
        `/app/projects/${res.id}?tab=brief` as `/app/projects/${string}`,
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Step 1 → Step 2 transition: validate Step 1 fields, then ensure the
  // wizard draft exists before moving on. The transition lets us keep the
  // Continue button semantics ("submit" the form to validate) while still
  // running a server action before we change step.
  const onBriefNext = handleSubmit(() => {
    startAdvance(() => {
      void (async () => {
        const bootstrap = await ensureDraft();
        if (!bootstrap) return;
        setStep("refs");
      })();
    });
  });

  // -------------------------------------------------------------------------
  // Step 1 — Brief
  // -------------------------------------------------------------------------
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

        {/* Brand */}
        <div className="space-y-1.5">
          <Label htmlFor="brand_id">{t("brand_label")}</Label>
          <Controller
            control={control}
            name="brand_id"
            render={({ field }) => (
              <Select
                onValueChange={(v) =>
                  field.onChange(v === "__none" ? "" : v)
                }
                value={field.value ? field.value : "__none"}
              >
                <SelectTrigger id="brand_id">
                  <SelectValue placeholder={t("brand_none")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">{t("brand_none")}</SelectItem>
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

        {/* Deliverable types — free input tags */}
        <div className="space-y-2">
          <Label>{t("deliverable_types_label")}</Label>
          <Controller
            control={control}
            name="deliverable_types"
            render={({ field }) => (
              <TagInput
                value={field.value ?? []}
                onChange={field.onChange}
                placeholder={t("deliverable_types_ph")}
                helperText={t("deliverable_types_helper")}
                addLabel={t("deliverable_types_add")}
                removeLabel={t("deliverable_types_remove")}
              />
            )}
          />
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

        {/* Action row — first step has no back, save_draft + continue */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full uppercase tracking-[0.12em] text-xs"
            onClick={handleSaveDraft}
            disabled={isSaving || isAdvancing}
          >
            {t("save_draft")}
          </Button>
          <Button
            type="submit"
            className="rounded-full uppercase tracking-[0.12em]"
            disabled={isAdvancing}
          >
            {tCommon("continue")}
          </Button>
        </div>
      </form>
    );
  }

  // -------------------------------------------------------------------------
  // Step 2 — Brief Board (Phase 2.8.1: real editor on draft project)
  // -------------------------------------------------------------------------
  function RefsStep() {
    if (!draft) {
      // Defensive: onBriefNext awaits ensureDraft before navigating so this
      // branch should not render in practice. If it does, the user can hop
      // back to Step 1 to retry.
      return (
        <div className="space-y-6">
          <div className="border border-dashed border-border rounded-lg py-16 px-6 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-muted-foreground keep-all max-w-md">
              {tErrors("generic")}
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
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="border border-border rounded-lg p-4">
          <BriefBoardEditor
            projectId={draft.projectId}
            initialContent={draft.brief.contentJson as JSONContent | null}
            initialUpdatedAt={draft.brief.updatedAt}
            initialStatus={draft.brief.status}
            mode="wizard"
          />
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
            {tCommon("next")}
          </Button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Step 3 — Review
  // -------------------------------------------------------------------------
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
          <dd className="text-sm keep-all break-words">{value || "—"}</dd>
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
          <ReviewRow label={t("tone_label")} value={vals.tone || null} />
          <div className="grid grid-cols-[140px_1fr] gap-4 py-3 border-b border-border">
            <dt className="text-sm text-muted-foreground keep-all">
              {t("deliverable_types_label")}
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {vals.deliverable_types && vals.deliverable_types.length > 0 ? (
                vals.deliverable_types.map((v) => (
                  <span
                    key={v}
                    className="rounded-full border border-border px-2.5 py-0.5 text-xs keep-all"
                  >
                    {v}
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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="px-6 py-10 max-w-2xl mx-auto">
      <StepIndicator current={step} tProjects={t} />

      {step === "brief" && <BriefStep />}
      {step === "refs" && <RefsStep />}
      {step === "review" && <ReviewStep />}
    </div>
  );
}
