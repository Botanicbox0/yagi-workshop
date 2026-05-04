"use client";

// =============================================================================
// Phase 5 Wave B task_04 v3 — Briefing Canvas wrapper
//
// 3-step paradigm — "프로젝트 생애주기의 시작 3단계":
//   Step 1 — Brief Start. Minimal intent: name + deliverable_types +
//            optional description. (purpose was removed in hotfix-4 —
//            it duplicated Step 2's "활용 채널" sidebar field.)
//   Step 2 — Workspace. 2-row layout: top row = 보유 자료 + 레퍼런스
//            (2-col on lg+); bottom row = full-width 디테일 with its
//            own internal 2-col form grid. Autosave + expandable
//            whiteboard.
//   Step 3 — Confirm. Minimal summary + 의뢰하기. (placeholder; lands
//            in task_06 v3.)
//
// State machine:
//   - sessionStorage key "briefing_canvas_v3_state" holds:
//       { name, deliverable_types, description, projectId? }
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
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ensureBriefingDraftProject } from "./briefing-actions";
import { BriefingCanvasStep1 } from "./briefing-canvas-step-1";
import { BriefingCanvasStep2 } from "./briefing-canvas-step-2";
import { BriefingCanvasStep3 } from "./briefing-canvas-step-3";

// ---------------------------------------------------------------------------
// Step 1 form schema — v3 minimal (3 fields after hotfix-4 purpose removal)
// ---------------------------------------------------------------------------

export const step1Schema = z.object({
  name: z.string().trim().min(1).max(200),
  deliverable_types: z.array(z.string()).min(1),
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
  const searchParams = useSearchParams();

  // Wave B.5 — query-param hydration for the recall round-trip.
  // RecallButton redirects to ?project=<id>&step=commit; the canvas
  // must seed projectId + stage from those params before the first
  // render so:
  //   1. Step 3 mount-fetch hits the recalled draft (not a fresh canvas).
  //   2. The next handleNextFromStep1 call passes a non-empty projectId,
  //      sending the action through its UPDATE branch (data.projectId
  //      truthy) instead of the wipe-then-INSERT fall-through that would
  //      otherwise re-soft-delete the just-recalled draft.
  // Query-param projectId is treated as the source of truth and wins
  // over any stale value still sitting in sessionStorage.
  const queryProjectId = searchParams?.get("project") ?? null;
  const queryStep = searchParams?.get("step") ?? null;
  const initialStage: Stage =
    queryStep === "commit" ? 3 : queryStep === "workspace" ? 2 : 1;

  const [stage, setStage] = useState<Stage>(initialStage);
  const [projectId, setProjectId] = useState<string | undefined>(
    queryProjectId ?? undefined,
  );
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
        description: parsed.description ?? "",
        // Query param wins — see hydration comment above.
        projectId: queryProjectId ?? parsed.projectId,
      };
    } catch {
      return EMPTY_STATE;
    }
    // Initial-mount snapshot only; query param is a one-shot read.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- queryProjectId is captured at mount
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
        {stage === 3 && projectId && (
          <BriefingCanvasStep3
            projectId={projectId}
            onBack={() => handleBackFromStage(2)}
            onJumpToStep={(s) => handleBackFromStage(s)}
          />
        )}
        {stage === 3 && !projectId && (
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
