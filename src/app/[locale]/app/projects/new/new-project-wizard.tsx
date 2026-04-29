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
  type ChangeEvent,
} from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
// crypto.randomUUID() is available in Node 19+ and modern browsers
function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
import { Link2, ImageIcon, FileText, X, Pencil, Loader2 } from "lucide-react";
import {
  ensureDraftProject,
  fetchVideoMetadataAction,
  submitProjectAction,
  type WizardDraftFields,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  createBriefAssetPutUrl,
  objectPublicUrl,
} from "@/lib/r2/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WizardReference = {
  id: string;
  kind: "url" | "image" | "pdf" | "video";
  url: string;
  note: string;
  title?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
};

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
  description: z.string().trim().min(1).max(2000),
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

// ---------------------------------------------------------------------------
// Reference card
// ---------------------------------------------------------------------------

function ReferenceCard({
  ref: refItem,
  onDelete,
  onNoteChange,
}: {
  ref: WizardReference;
  onDelete: (id: string) => void;
  onNoteChange: (id: string, note: string) => void;
}) {
  const t = useTranslations("projects");

  return (
    <div
      className="flex gap-3 rounded-lg border-border/40 p-3"
      style={{
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
      }}
    >
      {/* Thumbnail / icon */}
      <div className="flex-shrink-0 w-14 h-14 rounded bg-muted flex items-center justify-center overflow-hidden">
        {refItem.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={refItem.thumbnailUrl}
            alt={refItem.title ?? ""}
            className="w-full h-full object-cover"
          />
        ) : refItem.kind === "image" ? (
          <ImageIcon className="w-5 h-5 text-muted-foreground" />
        ) : refItem.kind === "pdf" ? (
          <FileText className="w-5 h-5 text-muted-foreground" />
        ) : (
          <Link2 className="w-5 h-5 text-muted-foreground" />
        )}
      </div>

      {/* Info + memo */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {refItem.title && (
          <p className="text-xs font-medium truncate keep-all">{refItem.title}</p>
        )}
        {!refItem.title && (
          <p className="text-xs text-muted-foreground truncate">
            {new URL(refItem.url).hostname}
          </p>
        )}
        {refItem.durationSeconds != null && (
          <p className="text-xs text-muted-foreground">
            {Math.floor(refItem.durationSeconds / 60)}:
            {String(refItem.durationSeconds % 60).padStart(2, "0")}
          </p>
        )}
        <Input
          value={refItem.note}
          onChange={(e) => onNoteChange(refItem.id, e.target.value)}
          placeholder={t("wizard.field.references.memo_placeholder")}
          className="h-7 text-xs"
          maxLength={200}
        />
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(refItem.id)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={t("wizard.actions.edit")}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// References quick-add UI (used in Step 1 and inline in Step 3)
// ---------------------------------------------------------------------------

function ReferencesEditor({
  refs,
  onChange,
}: {
  refs: WizardReference[];
  onChange: (next: WizardReference[]) => void;
}) {
  const t = useTranslations("projects");
  const [urlDraft, setUrlDraft] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = useCallback(
    (id: string) => {
      onChange(refs.filter((r) => r.id !== id));
    },
    [refs, onChange]
  );

  const handleNoteChange = useCallback(
    (id: string, note: string) => {
      onChange(refs.map((r) => (r.id === id ? { ...r, note } : r)));
    },
    [refs, onChange]
  );

  async function handleUrlCommit() {
    const raw = urlDraft.trim();
    if (!raw) return;
    // Normalise — add https if no scheme
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

    setFetchingUrl(true);
    try {
      const meta = await fetchVideoMetadataAction(url);
      if (meta) {
        // YouTube or Vimeo — video reference
        const ref: WizardReference = {
          id: uuidv4(),
          kind: "video",
          url,
          note: "",
          title: meta.title,
          thumbnailUrl: meta.thumbnailUrl,
          durationSeconds: meta.durationSeconds,
        };
        onChange([...refs, ref]);
      } else {
        // Generic URL reference
        let hostname = url;
        try {
          hostname = new URL(url).hostname;
        } catch { /* ignore */ }
        const ref: WizardReference = {
          id: uuidv4(),
          kind: "url",
          url,
          note: "",
          title: hostname,
        };
        onChange([...refs, ref]);
      }
    } catch {
      const ref: WizardReference = {
        id: uuidv4(),
        kind: "url",
        url,
        note: "",
      };
      onChange([...refs, ref]);
    } finally {
      setFetchingUrl(false);
      setUrlDraft("");
    }
  }

  async function handleFileUpload(
    e: ChangeEvent<HTMLInputElement>,
    kind: "image" | "pdf"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so re-selecting same file fires again
    e.target.value = "";

    setUploadingFile(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
      const storageKey = `project-wizard/${uuidv4()}.${ext}`;
      const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
      const uploadRes = await fetch(putUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("R2 upload failed");
      const publicUrl = objectPublicUrl(storageKey);
      const ref: WizardReference = {
        id: uuidv4(),
        kind,
        url: publicUrl,
        note: "",
        title: file.name,
        thumbnailUrl: kind === "image" ? publicUrl : undefined,
      };
      onChange([...refs, ref]);
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* URL paste row */}
      <div className="flex gap-2">
        <Input
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          onPaste={(e) => {
            // On paste, commit immediately
            const pasted = e.clipboardData.getData("text").trim();
            if (pasted) {
              e.preventDefault();
              setUrlDraft(pasted);
              // commit after state update
              setTimeout(() => {
                setUrlDraft((prev) => {
                  void (async () => {
                    let url = prev;
                    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                    setFetchingUrl(true);
                    try {
                      const meta = await fetchVideoMetadataAction(url);
                      if (meta) {
                        onChange([
                          ...refs,
                          {
                            id: uuidv4(),
                            kind: "video",
                            url,
                            note: "",
                            title: meta.title,
                            thumbnailUrl: meta.thumbnailUrl,
                            durationSeconds: meta.durationSeconds,
                          },
                        ]);
                      } else {
                        let hostname = url;
                        try { hostname = new URL(url).hostname; } catch { /* ignore */ }
                        onChange([
                          ...refs,
                          { id: uuidv4(), kind: "url", url, note: "", title: hostname },
                        ]);
                      }
                    } catch {
                      onChange([...refs, { id: uuidv4(), kind: "url", url, note: "" }]);
                    } finally {
                      setFetchingUrl(false);
                    }
                  })();
                  return ""; // clear
                });
              }, 0);
            }
          }}
          onBlur={() => {
            if (urlDraft.trim()) void handleUrlCommit();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleUrlCommit();
            }
          }}
          placeholder={t("wizard.field.references.add_url")}
          className="flex-1 text-sm"
          disabled={fetchingUrl || uploadingFile}
        />
        {fetchingUrl && (
          <Loader2 className="w-4 h-4 animate-spin self-center text-muted-foreground" />
        )}
      </div>

      {/* File add buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs uppercase tracking-[0.08em]"
          onClick={() => imageInputRef.current?.click()}
          disabled={uploadingFile}
        >
          <ImageIcon className="w-3.5 h-3.5 mr-1.5" />
          {t("wizard.field.references.add_image")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full text-xs uppercase tracking-[0.08em]"
          onClick={() => pdfInputRef.current?.click()}
          disabled={uploadingFile}
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          {t("wizard.field.references.add_pdf")}
        </Button>
        {uploadingFile && (
          <Loader2 className="w-4 h-4 animate-spin self-center text-muted-foreground" />
        )}
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleFileUpload(e, "image")}
        aria-label={t("wizard.field.references.add_image")}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={(e) => void handleFileUpload(e, "pdf")}
        aria-label={t("wizard.field.references.add_pdf")}
      />

      {/* Reference list */}
      {refs.length === 0 && (
        <p className="text-xs text-muted-foreground py-2 keep-all">
          {t("wizard.field.references.empty")}
        </p>
      )}
      {refs.length > 0 && (
        <div className="space-y-2 mt-1">
          {refs.map((r) => (
            <ReferenceCard
              key={r.id}
              ref={r}
              onDelete={handleDelete}
              onNoteChange={handleNoteChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

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

  // Watch form fields + refs for autosave. Skip the very first render.
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

  async function goToStep3() {
    const valid = await trigger(["deliverable_types", "budget_band"]);
    if (!valid) return;
    setStep(3);
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

      {/* Description */}
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
          rows={5}
          maxLength={2000}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive" role="alert">
            {t("wizard.errors.description_too_short")}
          </p>
        )}
      </div>

      {/* References */}
      <div className="space-y-3">
        <Eyebrow>{t("wizard.field.references.eyebrow")}</Eyebrow>
        <ReferencesEditor refs={refs} onChange={setRefs} />
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
  // Step 2 — Conditions
  // -------------------------------------------------------------------------

  const step2Content = (
    <div className="space-y-6">
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
          onClick={() => void goToStep3()}
        >
          {t("wizard.actions.continue")}
        </Button>
      </div>
    </div>
  );

  // -------------------------------------------------------------------------
  // Step 3 — Final review
  // -------------------------------------------------------------------------

  const vals = getValues();

  const budgetLabel = vals.budget_band
    ? t(`wizard.field.budget.${vals.budget_band}` as Parameters<typeof t>[0])
    : "—";

  const step3Content = (
    <div className="space-y-6">
      {/* Summary card */}
      <div
        className="rounded-lg border-border/40 divide-y divide-border/40 overflow-hidden"
        style={{
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
        }}
      >
        {/* Block 1: name + description */}
        <div className="px-4 py-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <Eyebrow>
              {t("wizard.field.name.label")}
            </Eyebrow>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-[0.08em]"
              aria-label={t("wizard.actions.edit")}
            >
              <Pencil className="w-3 h-3" />
              {t("wizard.actions.edit")}
            </button>
          </div>
          <p className="text-sm font-medium keep-all">{vals.name || "—"}</p>
          {vals.description && (
            <p className="text-sm text-muted-foreground keep-all whitespace-pre-line line-clamp-3">
              {vals.description}
            </p>
          )}
        </div>

        {/* Block 2: references */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Eyebrow>{t("wizard.field.references.eyebrow")}</Eyebrow>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-[0.08em]"
              aria-label={t("wizard.actions.edit")}
            >
              <Pencil className="w-3 h-3" />
              {t("wizard.actions.edit")}
            </button>
          </div>
          {refs.length > 0 ? (
            <p className="text-xs text-muted-foreground mb-2">
              {t("wizard.summary.references_count", { count: refs.length })}
            </p>
          ) : null}
          {/* Re-editable references in Step 3 */}
          <ReferencesEditor refs={refs} onChange={setRefs} />
        </div>

        {/* Block 3: conditions */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <Eyebrow>{t("wizard.field.deliverable_types.label")}</Eyebrow>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-[0.08em]"
              aria-label={t("wizard.actions.edit")}
            >
              <Pencil className="w-3 h-3" />
              {t("wizard.actions.edit")}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(vals.deliverable_types ?? []).map((dt) => (
              <span
                key={dt}
                className="rounded-full border border-border/40 px-2.5 py-0.5 text-xs keep-all"
              >
                {t(
                  `wizard.field.deliverable_types.${dt}` as Parameters<
                    typeof t
                  >[0]
                )}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-4 pt-1 text-sm">
            <span>
              <span className="text-xs text-muted-foreground mr-1 uppercase tracking-[0.08em]">
                {t("wizard.field.budget.label")}
              </span>
              {budgetLabel}
            </span>
            {vals.delivery_date && vals.delivery_date !== "" && (
              <span>
                <span className="text-xs text-muted-foreground mr-1 uppercase tracking-[0.08em]">
                  {t("wizard.field.delivery_date.label")}
                </span>
                {vals.delivery_date}
              </span>
            )}
          </div>
        </div>
      </div>

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
              const vals = getValues();
              const result = await submitProjectAction({
                name: vals.name,
                description: vals.description,
                deliverable_types: vals.deliverable_types,
                budget_band: vals.budget_band,
                delivery_date:
                  vals.delivery_date && vals.delivery_date !== ""
                    ? vals.delivery_date
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
                // workspaceId resolved server-side from user membership
                // (same pattern as ensureDraftProject). Passing the draft
                // project id so the server can look up its workspace.
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
