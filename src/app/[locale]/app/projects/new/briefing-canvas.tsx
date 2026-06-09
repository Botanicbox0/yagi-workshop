"use client";

import { useEffect, useMemo, useState } from "react";
import { FormProvider, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ensureBriefingDraftProject } from "./briefing-actions";
import { addBriefingDocumentAction } from "./briefing-step2-actions";
import { submitBriefingAction } from "./briefing-step3-actions";
import { BriefingCanvasStep1 } from "./briefing-canvas-step-1";
import { BriefingCanvasStep2 } from "./briefing-canvas-step-2";
import { BriefingCanvasStep3 } from "./briefing-canvas-step-3";

export const step1Schema = z.object({
  name: z.string().trim().min(1).max(200),
  deliverable_types: z.array(z.string()).min(1),
  description: z.string().trim().min(1).max(1000),
  planning_mode: z
    .enum(["want_proposal", "have"])
    .default("want_proposal"),
  reference_url: z
    .string()
    .trim()
    .max(2000)
    .refine((value) => value.length === 0 || isHttpUrl(value), {
      message: "url must be http:// or https://",
    })
    .optional()
    .default(""),
});

export type Step1FormData = z.infer<typeof step1Schema>;

const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";

type CanvasState = Step1FormData & {
  projectId?: string;
};

const EMPTY_STATE: CanvasState = {
  name: "",
  deliverable_types: [],
  description: "",
  planning_mode: "want_proposal",
  reference_url: "",
};

type Stage = 1 | 2 | 3;
export type PendingAction = "details" | "submit" | null;

export type LatestProjectSeed = {
  id: string;
  title: string;
  brief: string | null;
  deliverable_types: string[];
  status: string;
  updated_at: string;
};

type Props = {
  brands?: { id: string; name: string }[];
  activeWorkspaceId?: string | null;
  priorProjectCount?: number;
  latestProject?: LatestProjectSeed | null;
};

export function BriefingCanvas({
  brands: _brands = [],
  activeWorkspaceId: _activeWorkspaceId = null,
  priorProjectCount = 0,
  latestProject = null,
}: Props) {
  void _brands;
  void _activeWorkspaceId;

  const t = useTranslations("projects");
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryProjectId = searchParams?.get("project") ?? null;
  const queryStep = searchParams?.get("step") ?? null;
  const initialStage: Stage =
    queryStep === "commit" ? 3 : queryStep === "workspace" ? 2 : 1;

  const [stage, setStage] = useState<Stage>(initialStage);
  const [projectId, setProjectId] = useState<string | undefined>(
    queryProjectId ?? undefined,
  );
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [savedReferenceKey, setSavedReferenceKey] = useState<string | null>(null);

  const isReturningRequester = priorProjectCount > 0 && Boolean(latestProject);
  const returningDefaults = useMemo<CanvasState>(() => {
    if (!isReturningRequester || !latestProject) return EMPTY_STATE;
    return {
      name: t("briefing.step1.returning.default_name", {
        name: latestProject.title,
      }),
      deliverable_types: latestProject.deliverable_types ?? [],
      description: "",
      planning_mode: "have",
      reference_url: "",
    };
  }, [isReturningRequester, latestProject, t]);

  const initialState = useMemo<CanvasState>(() => {
    if (typeof window === "undefined") return returningDefaults;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return returningDefaults;
      const parsed = JSON.parse(raw) as Partial<CanvasState>;
      return {
        name: parsed.name ?? returningDefaults.name,
        deliverable_types:
          parsed.deliverable_types ?? returningDefaults.deliverable_types,
        description: parsed.description ?? returningDefaults.description,
        planning_mode: parsed.planning_mode ?? returningDefaults.planning_mode,
        reference_url: parsed.reference_url ?? returningDefaults.reference_url,
        projectId: queryProjectId ?? parsed.projectId,
      };
    } catch {
      return returningDefaults;
    }
  }, [queryProjectId, returningDefaults]);

  useEffect(() => {
    if (initialState.projectId) setProjectId(initialState.projectId);
  }, [initialState.projectId]);

  const methods = useForm<z.input<typeof step1Schema>, unknown, Step1FormData>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      name: initialState.name,
      deliverable_types: initialState.deliverable_types,
      description: initialState.description,
      planning_mode: initialState.planning_mode,
      reference_url: initialState.reference_url,
    },
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
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // sessionStorage failure should not block intake.
    }
  };

  const showDraftError = (error: string) => {
    const errorKey =
      error === "unauthenticated"
        ? "briefing.step1.toast.unauthenticated"
        : error === "no_workspace"
          ? "briefing.step1.toast.no_workspace"
          : "briefing.step1.toast.draft_failed";
    toast.error(t(errorKey));
  };

  const persistReferenceUrl = async (
    draftProjectId: string,
    values: Step1FormData,
  ): Promise<boolean> => {
    const url = values.reference_url?.trim();
    if (!url) return true;
    const key = `${draftProjectId}:${url}`;
    if (savedReferenceKey === key) return true;

    const planningMode = values.planning_mode ?? "want_proposal";
    const insert = await addBriefingDocumentAction({
      projectId: draftProjectId,
      kind: "reference",
      source_type: "url",
      url,
      provider: inferProvider(url),
      category: "general",
      note: t(
        `briefing.step1.field.planning.options.${planningMode}` as Parameters<
          typeof t
        >[0],
      ),
    });
    if (!insert.ok) {
      toast.error(t("briefing.step1.toast.reference_failed"));
      return false;
    }
    setSavedReferenceKey(key);
    return true;
  };

  const ensureDraftFromStep1 = async (
    values: Step1FormData,
  ): Promise<string | null> => {
    const result = await ensureBriefingDraftProject({
      projectId,
      name: values.name,
      deliverable_types: values.deliverable_types ?? [],
      description: values.description ?? null,
      planning_mode: values.planning_mode ?? "want_proposal",
    });
    if (!result.ok) {
      showDraftError(result.error);
      return null;
    }

    setProjectId(result.projectId);
    persistSession({ ...values, projectId: result.projectId });
    const referenceSaved = await persistReferenceUrl(result.projectId, values);
    return referenceSaved ? result.projectId : null;
  };

  const handleStep1ValidationError = (formErrors: FieldErrors<Step1FormData>) => {
    console.warn("[BriefingCanvas] step1 validation failed:", formErrors);
    const firstKey = (
      Object.keys(formErrors) as Array<keyof typeof formErrors>
    )[0];
    const errorKey =
      firstKey === "name"
        ? "briefing.step1.error.name_required"
        : firstKey === "deliverable_types"
          ? "briefing.step1.error.deliverable_types_required"
          : firstKey === "description"
            ? "briefing.step1.error.description_required"
            : firstKey === "reference_url"
              ? "briefing.step1.error.reference_url_invalid"
              : "briefing.step1.toast.draft_failed";
    toast.error(t(errorKey));
  };

  const handleDetailsFromStep1 = methods.handleSubmit(async (values) => {
    setPendingAction("details");
    try {
      const draftProjectId = await ensureDraftFromStep1(values);
      if (!draftProjectId) return;
      setStage(2);
    } catch (e) {
      console.error("[BriefingCanvas] ensureBriefingDraftProject threw:", e);
      toast.error(t("briefing.step1.toast.draft_failed"));
    } finally {
      setPendingAction(null);
    }
  }, handleStep1ValidationError);

  const handleLightSubmitFromStep1 = methods.handleSubmit(async (values) => {
    setPendingAction("submit");
    try {
      const draftProjectId = await ensureDraftFromStep1(values);
      if (!draftProjectId) return;
      const result = await submitBriefingAction({ projectId: draftProjectId });
      if (!result.ok) {
        const key =
          result.error === "unauthenticated"
            ? "briefing.step3.toast.submit_unauthorized"
            : result.error === "wrong_status"
              ? "briefing.step3.toast.submit_wrong_status"
              : result.error === "not_owner"
                ? "briefing.step3.toast.submit_not_owner"
                : "briefing.step3.toast.submit_failed";
        toast.error(t(key));
        return;
      }
      try {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // sessionStorage failure should not block redirect.
      }
      toast.success(t("briefing.step1.toast.submit_success"));
      router.push(`/app/projects/${draftProjectId}`);
    } catch (e) {
      console.error("[BriefingCanvas] light submit threw:", e);
      toast.error(t("briefing.step3.toast.submit_failed"));
    } finally {
      setPendingAction(null);
    }
  }, handleStep1ValidationError);

  const handleBackFromStage = (target: Stage) => {
    setStage(target);
  };

  return (
    <FormProvider {...methods}>
      <div className="min-h-dvh bg-background">
        {stage === 1 && (
          <BriefingCanvasStep1
            isReturningRequester={isReturningRequester}
            priorProjectCount={priorProjectCount}
            latestProject={latestProject}
            onDetails={handleDetailsFromStep1}
            onLightSubmit={handleLightSubmitFromStep1}
            onCancel={() => router.push("/app/projects")}
            pendingAction={pendingAction}
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
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="mb-3 text-xs font-semibold tracking-[0.18em] text-foreground/40">
        {stepLabel}
      </p>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight keep-all">
        {title}
      </h1>
      <p className="mb-12 text-sm leading-relaxed text-muted-foreground keep-all">
        {description}
      </p>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:underline"
        >
          {backLabel}
        </button>
        {onForward && forwardLabel && (
          <button
            type="button"
            onClick={onForward}
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:underline"
          >
            {forwardLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function inferProvider(
  value: string,
): "youtube" | "vimeo" | "instagram" | "generic" {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    if (host.includes("vimeo.com")) return "vimeo";
    if (host.includes("instagram.com")) return "instagram";
  } catch {
    return "generic";
  }
  return "generic";
}
