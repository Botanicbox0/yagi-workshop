"use client";

// =============================================================================
// Phase 5 Wave B task_04 — Briefing Canvas wrapper (3-stage paradigm)
//
// Stage 1 (this commit): intent form (3-col grid, 9 fields) — KICKOFF
//                        v1.2 §task_04 spec.
// Stage 2 (task_05):     asset workspace (기획서 / 레퍼런스 분리 +
//                        budget/timeline sidebar). Placeholder mounts
//                        until task_05 lands.
// Stage 3 (task_06):     review + submit. Placeholder until task_06.
//
// State strategy (Wave B kickoff): the seven new Stage-1-only fields
// (purpose / channels / visual_ratio / target_audience / has_plan /
// mood_keywords / additional_notes) are held in client state — the
// projects table doesn't have columns for them yet, and the schema
// decision (extend projects vs JSON column vs add columns) is locked
// in task_06 spec per task_plan.md. "임시 저장" persists state to
// sessionStorage; the next visit hydrates from there. "다음 단계"
// transitions stage state inside this wrapper. Stage 3 submit will
// flush the full payload to a new server action.
//
// "← 이전으로" on Stage 1 navigates to /app/projects — there is no
// separate Stage 0 page in the current codebase; the project name is
// captured at the top of Stage 1.
// =============================================================================

import { useState, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { BriefingCanvasStage1 } from "./briefing-canvas-stage-1";

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

export const stage1Schema = z.object({
  // Project name (no separate Stage 0 page yet — captured at top of Stage 1).
  name: z.string().trim().min(1).max(200),

  // Existing column-mappable
  deliverable_types: z.array(z.string()).default([]),
  description: z.string().trim().min(1).max(500),

  // Phase 5 new fields (client-state-only for Wave B; persisted in Stage 3)
  purpose: z.array(z.string()).default([]),
  channels: z.array(z.string()).default([]),
  visual_ratio: z.string().optional(),
  visual_ratio_custom: z.string().trim().max(60).optional(),
  target_audience: z.string().trim().max(500).optional(),
  has_plan: z.enum(["have", "want_proposal", "undecided"]).optional(),
  mood_keywords: z.array(z.string()).default([]),
  mood_keywords_free: z.string().trim().max(200).optional(),
  additional_notes: z.string().trim().max(2000).optional(),
});

// Use z.input so the form data type allows the same optionality the
// schema accepts at parse time. z.output applies the .default([]) +
// trim transforms which would otherwise mismatch the resolver's input
// shape and trip a TS2322 on useForm's defaultValues.
export type Stage1FormData = z.input<typeof stage1Schema>;

const SESSION_STORAGE_KEY = "briefing_canvas_stage1_draft";

const EMPTY_DEFAULT: Stage1FormData = {
  name: "",
  deliverable_types: [],
  description: "",
  purpose: [],
  channels: [],
  mood_keywords: [],
};

// ---------------------------------------------------------------------------
// Wrapper component
// ---------------------------------------------------------------------------

type Props = {
  // Reserved for future stages — Stage 2 reads brand list, Stage 3 reads
  // active workspace id. Stage 1 doesn't need either.
  brands?: { id: string; name: string }[];
  activeWorkspaceId?: string | null;
};

export function BriefingCanvas({
  brands: _brands = [],
  activeWorkspaceId: _activeWorkspaceId = null,
}: Props) {
  // Reserved for future stages.
  void _brands;
  void _activeWorkspaceId;

  const t = useTranslations("projects");
  const router = useRouter();
  const [stage, setStage] = useState<1 | 2 | 3>(1);

  // Hydrate Stage 1 form state from sessionStorage if a previous "임시 저장"
  // wrote a draft.
  const initialValues = useMemo<Stage1FormData>(() => {
    if (typeof window === "undefined") return EMPTY_DEFAULT;
    try {
      const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return EMPTY_DEFAULT;
      const parsed = JSON.parse(raw) as Partial<Stage1FormData>;
      return {
        ...EMPTY_DEFAULT,
        ...parsed,
        deliverable_types: parsed.deliverable_types ?? [],
        purpose: parsed.purpose ?? [],
        channels: parsed.channels ?? [],
        mood_keywords: parsed.mood_keywords ?? [],
      };
    } catch {
      // Corrupted sessionStorage — fall back to empty.
      return EMPTY_DEFAULT;
    }
  }, []);

  const methods = useForm<Stage1FormData>({
    resolver: zodResolver(stage1Schema),
    defaultValues: initialValues,
    mode: "onBlur",
  });

  const handleSaveDraft = () => {
    const values = methods.getValues();
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(values),
      );
      toast.success(t("briefing.stage1.toast.draft_saved"));
    } catch {
      toast.error(t("briefing.stage1.toast.draft_failed"));
    }
  };

  const handleBack = () => {
    if (stage === 1) {
      router.push("/app/projects");
      return;
    }
    setStage((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1));
  };

  const handleNext = methods.handleSubmit((values) => {
    try {
      window.sessionStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(values),
      );
    } catch {
      // Swallow — sessionStorage failure shouldn't block stage transition.
    }
    setStage((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : 3));
  });

  return (
    <FormProvider {...methods}>
      <div className="min-h-dvh bg-background">
        {stage === 1 && (
          <BriefingCanvasStage1
            onBack={handleBack}
            onSaveDraft={handleSaveDraft}
            onNext={handleNext}
          />
        )}
        {stage === 2 && (
          <StagePlaceholder
            stepLabel="STEP 2 / 3"
            title={t("briefing.stage1.stage2_placeholder.title")}
            description={t("briefing.stage1.stage2_placeholder.description")}
            onBack={handleBack}
            backLabel={t("briefing.stage1.stage2_placeholder.back_to_stage1")}
          />
        )}
        {stage === 3 && (
          <StagePlaceholder
            stepLabel="STEP 3 / 3"
            title={t("briefing.stage1.stage3_placeholder.title")}
            description={t("briefing.stage1.stage3_placeholder.description")}
            onBack={handleBack}
            backLabel={t("briefing.stage1.stage3_placeholder.back_to_stage2")}
          />
        )}
      </div>
    </FormProvider>
  );
}

// ---------------------------------------------------------------------------
// Stage 2 / 3 placeholder — replaced by task_05 / task_06 in subsequent commits.
// ---------------------------------------------------------------------------

function StagePlaceholder({
  stepLabel,
  title,
  description,
  onBack,
  backLabel,
}: {
  stepLabel: string;
  title: string;
  description: string;
  onBack: () => void;
  backLabel: string;
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
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline transition-colors"
      >
        {backLabel}
      </button>
    </div>
  );
}
