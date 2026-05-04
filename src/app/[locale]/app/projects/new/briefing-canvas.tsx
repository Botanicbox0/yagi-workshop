"use client";

// =============================================================================
// Phase 5 Wave B task_04 v3 — Briefing Canvas wrapper
//
// 3-step paradigm — "프로젝트 생애주기의 시작 3단계":
//   Step 1 (this commit) — Brief Start. Minimal intent (name + content
//                          type + purpose + optional description).
//                          "다음 →" CTA calls ensureBriefingDraftProject,
//                          gets project_id, transitions to Step 2.
//   Step 2 (task_05 v3)  — Workspace. 3-column (보유 자료 / 레퍼런스 /
//                          디테일 sidebar) + autosave + expandable
//                          whiteboard. Placeholder until task_05.
//   Step 3 (task_06 v3)  — Confirm. Minimal 4-line summary + 의뢰하기.
//                          Placeholder until task_06.
//
// State machine:
//   - sessionStorage key "briefing_canvas_v3_state" holds:
//       { name, deliverable_types, purpose, description, projectId? }
//   - Step 1 → 2: handleNext runs zod validation → ensureBriefingDraftProject
//                 → on success persists projectId + transitions stage state
//   - Step 2 → 3: stage state only (Step 2 autosaves to DB directly)
//   - Step 3 → submit (in task_06 v3)
//
// "임시 저장" button is REMOVED in v3. Step 1 has only "[다음 →]"; Step 2
// uses autosave (5s debounce + visible "자동 저장됨 · {ts}" cue).
// =============================================================================

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { ensureBriefingDraftProject } from "./briefing-actions";
import { BriefingCanvasStep1 } from "./briefing-canvas-step-1";
import { BriefingCanvasStep2 } from "./briefing-canvas-step-2";

// ---------------------------------------------------------------------------
// Step 1 form schema — v3 minimal (4 fields)
// ---------------------------------------------------------------------------

export const step1Schema = z.object({
  name: z.string().trim().min(1).max(200),
  deliverable_types: z.array(z.string()).min(1),
  purpose: z.array(z.string()).min(1),
  description: z.string().trim().max(500).optional(),
});

export type Step1FormData = z.input<typeof step1Schema>;

// ---------------------------------------------------------------------------
// Canvas state
// ---------------------------------------------------------------------------

const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";

type CanvasState = Step1FormData & {
  projectId?: string;
};

const EMPTY_STATE: CanvasState = {
  name: "",
  deliverable_types: [],
  purpose: [],
  description: "",
};

type Stage = 1 | 2 | 3;

type Props = {
  brands?: { id: string; name: string }[];
  activeWorkspaceId?: string | null;
};

export function BriefingCanvas({
  brands: _brands = [],
  activeWorkspaceId: _activeWorkspaceId = null,
}: Props) {
  void _brands;
  void _activeWorkspaceId;

  const t = useTranslations("projects");
  const router = useRouter();
  const [stage, setStage] = useState<Stage>(1);
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  // Hydrate Step 1 form + projectId from sessionStorage if present.
  const initialState = useMemo<CanvasState>(() => {
    if (typeof window === "undefined") return EMPTY_STATE;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return EMPTY_STATE;
      const parsed = JSON.parse(raw) as Partial<CanvasState>;
      return {
        name: parsed.name ?? "",
        deliverable_types: parsed.deliverable_types ?? [],
        purpose: parsed.purpose ?? [],
        description: parsed.description ?? "",
        projectId: parsed.projectId,
      };
    } catch {
      return EMPTY_STATE;
    }
  }, []);

  // Restore projectId on mount (canvas state persists across reloads).
  useMemo(() => {
    if (initialState.projectId) {
      setProjectId(initialState.projectId);
    }
  }, [initialState.projectId]);

  const methods = useForm<Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: initialState.name,
      deliverable_types: initialState.deliverable_types,
      purpose: initialState.purpose,
      description: initialState.description,
    },
    // Hotfix: was 'onBlur'. Korean IME composition fired blur mid-compose
    // and let zod's resolver silently reject the form, so [다음 →] looked
    // like a no-op. 'onSubmit' triggers a single full validation on click.
    mode: "onSubmit",
    shouldFocusError: true,
  });

  const persistSession = (next: Partial<CanvasState>) => {
    try {
      const merged: CanvasState = {
        ...initialState,
        ...methods.getValues(),
        ...next,
      };
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(merged),
      );
    } catch {
      // Swallow — sessionStorage failure shouldn't block flow.
    }
  };

  const handleNextFromStep1 = methods.handleSubmit(
    async (values) => {
      setSubmitting(true);
      try {
        const result = await ensureBriefingDraftProject({
          projectId,
          name: values.name,
          deliverable_types: values.deliverable_types ?? [],
          purpose: values.purpose ?? [],
          description: values.description ?? null,
        });
        if (!result.ok) {
          const errorKey =
            result.error === "unauthenticated"
              ? "briefing.step1.toast.unauthenticated"
              : result.error === "no_workspace"
                ? "briefing.step1.toast.no_workspace"
                : "briefing.step1.toast.draft_failed";
          toast.error(t(errorKey));
          return;
        }
        setProjectId(result.projectId);
        persistSession({ ...values, projectId: result.projectId });
        setStage(2);
      } catch (e) {
        console.error("[BriefingCanvas] ensureBriefingDraftProject threw:", e);
        toast.error(t("briefing.step1.toast.draft_failed"));
      } finally {
        setSubmitting(false);
      }
    },
    // Hotfix: validation-fail path was previously a silent drop, so a
    // user with an unfilled required field saw no feedback when pressing
    // [다음 →]. Surface a toast pointing at the first missing field.
    (formErrors) => {
      console.warn("[BriefingCanvas] step1 validation failed:", formErrors);
      const firstKey = (
        Object.keys(formErrors) as Array<keyof typeof formErrors>
      )[0];
      const errorKey =
        firstKey === "name"
          ? "briefing.step1.error.name_required"
          : firstKey === "deliverable_types"
            ? "briefing.step1.error.deliverable_types_required"
            : firstKey === "purpose"
              ? "briefing.step1.error.purpose_required"
              : "briefing.step1.toast.draft_failed";
      toast.error(t(errorKey));
    },
  );

  const handleBackFromStage = (target: Stage) => {
    setStage(target);
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-dvh bg-background">
        {stage === 1 && (
          <BriefingCanvasStep1
            onNext={handleNextFromStep1}
            onCancel={() => router.push("/app/projects")}
            submitting={submitting}
          />
        )}
        {stage === 2 && projectId && (
          <BriefingCanvasStep2
            projectId={projectId}
            onBack={() => handleBackFromStage(1)}
            onNext={() => handleBackFromStage(3)}
          />
        )}
        {stage === 2 && !projectId && (
          <StagePlaceholder
            stepLabel={t("briefing.step2.placeholder.eyebrow")}
            title={t("briefing.step2.placeholder.title_no_project")}
            description={t("briefing.step2.placeholder.description_no_project")}
            onBack={() => handleBackFromStage(1)}
            backLabel={t("briefing.step2.placeholder.back")}
          />
        )}
        {stage === 3 && (
          <StagePlaceholder
            stepLabel={t("briefing.step3.placeholder.eyebrow")}
            title={t("briefing.step3.placeholder.title")}
            description={t("briefing.step3.placeholder.description")}
            onBack={() => handleBackFromStage(2)}
            backLabel={t("briefing.step3.placeholder.back")}
          />
        )}
      </div>
    </FormProvider>
  );
}

// ---------------------------------------------------------------------------
// Step 2 / 3 placeholder — replaced by task_05 v3 / task_06 v3 in subsequent commits.
// ---------------------------------------------------------------------------

function StagePlaceholder({
  stepLabel,
  title,
  description,
  onBack,
  backLabel,
  onForward,
  forwardLabel,
}: {
  stepLabel: string;
  title: string;
  description: string;
  onBack: () => void;
  backLabel: string;
  onForward?: () => void;
  forwardLabel?: string;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-24 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
        {stepLabel}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-3 keep-all">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground leading-relaxed mb-12 keep-all">
        {description}
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline transition-colors"
        >
          {backLabel}
        </button>
        {onForward && forwardLabel && (
          <button
            type="button"
            onClick={onForward}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline transition-colors"
          >
            {forwardLabel}
          </button>
        )}
      </div>
    </div>
  );
}
