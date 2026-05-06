"use client";

// =============================================================================
// Phase 5 Wave B task_06 v3 — Step 3 Commit & Confirm
//
// Three responsibilities:
//   1. Read-only summary of Step 1 + Step 2 inputs (with [Step 1 수정] /
//      [Step 2 수정] jumps).
//   2. Commit form (5 fields) with 5s autosave + single-flight queue:
//      budget_band / target_delivery_at / meeting_preferred_at /
//      interested_in_twin / additional_notes.
//   3. [의뢰하기 →] CTA → AlertDialog confirm → submitBriefingAction
//      atomic status flip 'draft' → 'in_review'. On success: clear
//      sessionStorage, toast, redirect to /app/projects.
//
// Autosave/submit race: handleSubmit flushes any pending debounce + waits
// for inFlightRef to drain before calling submitBriefingAction. Even if a
// commit-write somehow lands after the status flip, the row-level
// status='draft' filter on the commit UPDATE catches it (0 rows). The
// submit UPDATE itself is guarded by .eq('status','draft'), so a
// double-click resolves to wrong_status.
// =============================================================================

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Loader2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  updateProjectCommitAction,
  submitBriefingAction,
} from "./briefing-step3-actions";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BUDGET_OPTIONS = [
  "under_1m",
  "1m_to_5m",
  "5m_to_10m",
  "negotiable",
] as const;

const SESSION_STORAGE_KEY = "briefing_canvas_v3_state";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommitFormData = {
  budget_band: "under_1m" | "1m_to_5m" | "5m_to_10m" | "negotiable" | "";
  target_delivery_at: string;
  meeting_preferred_at: string;
  interested_in_twin: boolean;
  additional_notes: string;
  has_external_brand_party: boolean;
};

type AutosaveState = "idle" | "saving" | "saved" | "error" | "stale";

type SummarySnapshot = {
  name: string | null;
  deliverable_types: string[];
  description: string | null;
  briefDocsCount: number;
  refDocsCount: number;
  mood_keywords: string[];
  visual_ratio: string | null;
  channels: string[];
  target_audience: string | null;
};

type ProjectRow = {
  title: string | null;
  deliverable_types: string[] | null;
  brief: string | null;
  mood_keywords: string[] | null;
  visual_ratio: string | null;
  channels: string[] | null;
  target_audience: string | null;
  budget_band: string | null;
  target_delivery_at: string | null;
  meeting_preferred_at: string | null;
  interested_in_twin: boolean | null;
  additional_notes: string | null;
  has_external_brand_party: boolean | null;
};

const EMPTY_COMMIT: CommitFormData = {
  budget_band: "",
  target_delivery_at: "",
  meeting_preferred_at: "",
  interested_in_twin: false,
  additional_notes: "",
  has_external_brand_party: false,
};

function formatSavedAt(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Step 3 main component
// ---------------------------------------------------------------------------

export function BriefingCanvasStep3({
  projectId,
  onBack,
  onJumpToStep,
}: {
  projectId: string;
  onBack: () => void;
  onJumpToStep: (s: 1 | 2) => void;
}) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [summary, setSummary] = useState<SummarySnapshot | null>(null);
  const [form, setForm] = useState<CommitFormData>(EMPTY_COMMIT);
  const [loading, setLoading] = useState(true);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, startSubmit] = useTransition();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastCommittedRef = useRef<string>(JSON.stringify(EMPTY_COMMIT));
  const inFlightRef = useRef(false);
  const pendingRef = useRef<CommitFormData | null>(null);

  // Initial fetch: projects row + briefing_documents counts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      const sb = supabase as any;
      const [projRes, docsRes] = await Promise.all([
        sb
          .from("projects")
          .select(
            "title, deliverable_types, brief, mood_keywords, visual_ratio, channels, target_audience, budget_band, target_delivery_at, meeting_preferred_at, interested_in_twin, additional_notes, has_external_brand_party",
          )
          .eq("id", projectId)
          .maybeSingle(),
        sb
          .from("briefing_documents")
          .select("id, kind")
          .eq("project_id", projectId),
      ]);
      if (cancelled) return;
      const proj = (projRes.data as ProjectRow | null) ?? null;
      const docs = (docsRes.data ?? []) as Array<{
        id: string;
        kind: "brief" | "reference";
      }>;
      const briefCount = docs.filter((d) => d.kind === "brief").length;
      const refCount = docs.filter((d) => d.kind === "reference").length;

      setSummary({
        name: proj?.title ?? null,
        deliverable_types: proj?.deliverable_types ?? [],
        description: proj?.brief ?? null,
        briefDocsCount: briefCount,
        refDocsCount: refCount,
        mood_keywords: proj?.mood_keywords ?? [],
        visual_ratio: proj?.visual_ratio ?? null,
        channels: proj?.channels ?? [],
        target_audience: proj?.target_audience ?? null,
      });
      const seed: CommitFormData = {
        budget_band:
          (proj?.budget_band as CommitFormData["budget_band"]) ?? "",
        target_delivery_at: proj?.target_delivery_at
          ? proj.target_delivery_at.slice(0, 10)
          : "",
        meeting_preferred_at: proj?.meeting_preferred_at
          ? proj.meeting_preferred_at.slice(0, 16)
          : "",
        interested_in_twin: proj?.interested_in_twin ?? false,
        additional_notes: proj?.additional_notes ?? "",
        has_external_brand_party: proj?.has_external_brand_party ?? false,
      };
      setForm(seed);
      lastCommittedRef.current = JSON.stringify(seed);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // F2 client side: once the action returns wrong_status, the row is no
  // longer mutable from this surface (status flipped to in_review either
  // by this tab or another). Stop autosaving and surface "stale" — the
  // user's path forward is the project list, not the canvas.
  const staleRef = useRef(false);

  // Single-flight save runner — same pattern as Step 2 sidebar.
  const runSave = async (snapshot: CommitFormData): Promise<void> => {
    if (staleRef.current) return;
    if (inFlightRef.current) {
      pendingRef.current = snapshot;
      return;
    }
    inFlightRef.current = true;
    try {
      setAutosave("saving");
      const res = await updateProjectCommitAction({
        projectId,
        budget_band: snapshot.budget_band || null,
        target_delivery_at: snapshot.target_delivery_at || null,
        meeting_preferred_at:
          snapshot.meeting_preferred_at && snapshot.meeting_preferred_at !== ""
            ? new Date(snapshot.meeting_preferred_at).toISOString()
            : null,
        interested_in_twin: snapshot.interested_in_twin,
        additional_notes: snapshot.additional_notes || null,
        has_external_brand_party: snapshot.has_external_brand_party,
      });
      if (res.ok) {
        lastCommittedRef.current = JSON.stringify(snapshot);
        setAutosave("saved");
        setSavedAt(res.savedAt);
      } else if (res.error === "wrong_status") {
        staleRef.current = true;
        pendingRef.current = null;
        setAutosave("stale");
      } else {
        setAutosave("error");
      }
    } finally {
      inFlightRef.current = false;
      const next = pendingRef.current;
      if (next && !staleRef.current) {
        pendingRef.current = null;
        void runSave(next);
      }
    }
  };

  // 5s debounced autosave on form changes.
  useEffect(() => {
    if (loading) return;
    const serialized = JSON.stringify(form);
    if (serialized === lastCommittedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSave(form);
    }, 5_000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runSave is stable via refs
  }, [form, projectId, loading]);

  const set = <K extends keyof CommitFormData>(
    key: K,
    value: CommitFormData[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  // Submit handler — flush any pending autosave first, then atomic status flip.
  const handleSubmit = () => {
    setConfirmOpen(false);
    startSubmit(async () => {
      // Cancel pending debounce + force-save any uncommitted delta. The
      // submit UPDATE's WHERE status='draft' would also catch a stale
      // commit-write that lands after the flip, but flushing first means
      // every keystroke up to "의뢰하기" is persisted before the status
      // transition.
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const serialized = JSON.stringify(form);
      if (serialized !== lastCommittedRef.current) {
        await runSave(form);
      }
      // Drain any queued save.
      while (inFlightRef.current) {
        await new Promise((r) => setTimeout(r, 50));
      }

      const result = await submitBriefingAction({ projectId });
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
        // sessionStorage failure shouldn't block the redirect
      }
      toast.success(t("briefing.step3.toast.submit_success"));
      router.push("/app/projects");
    });
  };

  if (loading || !summary) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const labelDeliverable = (k: string) =>
    t(
      `briefing.step1.field.deliverable_types.options.${k}` as Parameters<
        typeof t
      >[0],
    );
  const labelMood = (k: string) =>
    t(
      `briefing.step2.sections.detail.mood.options.${k}` as Parameters<
        typeof t
      >[0],
    );
  const labelVisualRatio = (k: string) =>
    t(
      `briefing.step2.sections.detail.visual_ratio.options.${k}` as Parameters<
        typeof t
      >[0],
    );
  const labelChannel = (k: string) =>
    t(
      `briefing.step2.sections.detail.channels.options.${k}` as Parameters<
        typeof t
      >[0],
    );

  return (
    <TooltipProvider>
      <div className="pb-32">
        {/* Header */}
        <div className="max-w-3xl mx-auto px-6 lg:px-12 pt-12 pb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
            {t("briefing.step3.header.eyebrow")}
          </p>
          <h1 className="font-semibold tracking-display-ko text-3xl tracking-tight mb-3 keep-all">
            {t("briefing.step3.header.title")}
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-2xl">
            {t("briefing.step3.header.subtitle")}
          </p>
        </div>

        <div className="max-w-3xl mx-auto px-6 lg:px-12 flex flex-col gap-6">
          {/* Summary card */}
          <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-5">
            <h2 className="text-base font-semibold tracking-tight keep-all">
              {t("briefing.step3.summary.title")}
            </h2>

            <SummaryRow
              label={t("briefing.step3.summary.project_name")}
              value={
                summary.name ?? t("briefing.step3.summary.empty_placeholder")
              }
            />
            <SummaryRow
              label={t("briefing.step3.summary.deliverable_types")}
              value={
                summary.deliverable_types.length === 0
                  ? t("briefing.step3.summary.empty_placeholder")
                  : summary.deliverable_types.map(labelDeliverable).join(", ")
              }
            />
            {summary.description && (
              <SummaryRow
                label={t("briefing.step3.summary.description")}
                value={summary.description}
              />
            )}
            <SummaryRow
              label={`${t("briefing.step3.summary.documents_brief", { count: summary.briefDocsCount })} · ${t("briefing.step3.summary.documents_reference", { count: summary.refDocsCount })}`}
              value=""
              labelOnly
            />
            {summary.mood_keywords.length > 0 && (
              <SummaryRow
                label={t("briefing.step3.summary.mood")}
                value={summary.mood_keywords.map(labelMood).join(", ")}
              />
            )}
            {summary.visual_ratio && (
              <SummaryRow
                label={t("briefing.step3.summary.visual_ratio")}
                value={
                  summary.visual_ratio === "custom"
                    ? summary.visual_ratio
                    : labelVisualRatio(summary.visual_ratio)
                }
              />
            )}
            {summary.channels.length > 0 && (
              <SummaryRow
                label={t("briefing.step3.summary.channels")}
                value={summary.channels.map(labelChannel).join(", ")}
              />
            )}
            {summary.target_audience && (
              <SummaryRow
                label={t("briefing.step3.summary.target_audience")}
                value={summary.target_audience}
              />
            )}

            <div className="flex justify-end gap-4 border-t border-border/40 mt-3 pt-3">
              <button
                type="button"
                onClick={() => onJumpToStep(1)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
              >
                {t("briefing.step3.summary.edit_step1")}
              </button>
              <button
                type="button"
                onClick={() => onJumpToStep(2)}
                className="text-xs text-muted-foreground underline-offset-4 hover:underline transition-colors"
              >
                {t("briefing.step3.summary.edit_step2")}
              </button>
            </div>
          </section>

          {/* F3 fix (K-05 LOOP 1 MED): wrap commit form + final notes
              in a single fieldset disabled while submitting/stale, so
              edits made between [의뢰하기 →] and the status flip can't
              queue behind the flush and silently drop after status flips
              to in_review. className="contents" preserves layout. */}
          <fieldset
            disabled={submitting || autosave === "stale"}
            className="contents"
          >
          {/* Commit form (2x2 grid) */}
          <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-8">
            <h2 className="text-base font-semibold tracking-tight keep-all">
              {t("briefing.step3.commit.title")}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-10">
              <FieldBlock title={t("briefing.step3.commit.budget.label")}>
                <div className="flex flex-wrap gap-1.5">
                  {BUDGET_OPTIONS.map((opt) => {
                    const selected = form.budget_band === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() =>
                          set(
                            "budget_band",
                            selected
                              ? ""
                              : (opt as CommitFormData["budget_band"]),
                          )
                        }
                        aria-pressed={selected}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors keep-all",
                          selected
                            ? "bg-foreground text-background"
                            : "border border-border/60 hover:border-border",
                        )}
                      >
                        {t(
                          `briefing.step3.commit.budget.options.${opt}` as Parameters<
                            typeof t
                          >[0],
                        )}
                      </button>
                    );
                  })}
                </div>
              </FieldBlock>

              <FieldBlock title={t("briefing.step3.commit.delivery.label")}>
                <Input
                  type="date"
                  value={form.target_delivery_at}
                  onChange={(e) => set("target_delivery_at", e.target.value)}
                  className="text-sm max-w-xs"
                />
              </FieldBlock>

              <FieldBlock
                title={t("briefing.step3.commit.meeting.label")}
                helper={t("briefing.step3.commit.meeting.helper")}
              >
                <Input
                  type="datetime-local"
                  value={form.meeting_preferred_at}
                  onChange={(e) => set("meeting_preferred_at", e.target.value)}
                  className="text-sm max-w-xs"
                />
              </FieldBlock>

              <div
                className={cn(
                  "rounded-2xl p-4 flex items-start gap-3 self-start",
                  form.interested_in_twin
                    ? "bg-emerald-50 border border-emerald-200"
                    : "border border-border/40",
                )}
              >
                <input
                  type="checkbox"
                  id="twin-toggle"
                  checked={form.interested_in_twin}
                  onChange={(e) => set("interested_in_twin", e.target.checked)}
                  className="mt-1"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Label
                      htmlFor="twin-toggle"
                      className="text-sm font-semibold cursor-pointer keep-all"
                    >
                      {t("briefing.step3.commit.twin.label")}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={t(
                            "briefing.step3.commit.twin.tooltip_aria",
                          )}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs whitespace-pre-line text-xs leading-relaxed"
                      >
                        {t("briefing.step3.commit.twin.tooltip")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-muted-foreground keep-all leading-relaxed">
                    {t("briefing.step3.commit.twin.helper")}
                  </p>
                </div>
              </div>
            </div>
          {/* External brand party toggle — Phase 6 Wave B.2.
              Active state uses sage per yagi-design-system v1.0 Hard Rule #1
              (sage-only accent). K-06 LOOP-2 F1 fix: swapped from amber. */}
          <div className="border-t border-border/30 pt-6">
            <div
              className={cn(
                "rounded-2xl p-4 flex items-start gap-3",
                form.has_external_brand_party
                  ? "bg-[#71D083]/10 border border-[#71D083]/50"
                  : "border border-border/40",
              )}
            >
              <input
                type="checkbox"
                id="external-brand-toggle"
                checked={form.has_external_brand_party}
                onChange={(e) =>
                  set("has_external_brand_party", e.target.checked)
                }
                className="mt-1"
              />
              <div className="flex flex-col gap-1 min-w-0">
                <Label
                  htmlFor="external-brand-toggle"
                  className="text-sm font-semibold cursor-pointer keep-all"
                >
                  {t("briefing.step3.external_brand_toggle")}
                </Label>
                <p className="text-xs text-muted-foreground keep-all leading-relaxed">
                  {t("briefing.step3.external_brand_helper")}
                </p>
              </div>
            </div>
          </div>
          </section>

          {/* Final notes */}
          <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-4">
            <Label className="text-sm font-semibold tracking-tight keep-all">
              {t("briefing.step3.notes.label")}
            </Label>
            <Textarea
              value={form.additional_notes}
              onChange={(e) => set("additional_notes", e.target.value)}
              placeholder={t("briefing.step3.notes.placeholder")}
              rows={4}
              className="resize-none text-sm"
            />
          </section>
          </fieldset>
        </div>

        {/* Sticky bottom CTA */}
        <div className="fixed bottom-0 left-0 right-0 md:left-[240px] border-t border-border/40 bg-background/95 backdrop-blur-md">
          <div className="max-w-3xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-sm"
            >
              {t("briefing.step3.cta.back")}
            </Button>
            <div className="text-xs text-muted-foreground keep-all flex items-center gap-2">
              {autosave === "saving" && (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>{t("briefing.step3.autosave.saving")}</span>
                </>
              )}
              {autosave === "saved" && (
                <span className="text-emerald-600">
                  {t("briefing.step3.autosave.saved_at", {
                    time: formatSavedAt(savedAt),
                  })}
                </span>
              )}
              {autosave === "error" && (
                <span className="text-destructive">
                  {t("briefing.step3.autosave.error")}
                </span>
              )}
              {autosave === "stale" && (
                <span className="text-amber-600">
                  {t("briefing.step3.autosave.stale")}
                </span>
              )}
            </div>
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  className="text-sm rounded-full px-6"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    t("briefing.step3.cta.submit")
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("briefing.step3.confirm.title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription className="keep-all leading-relaxed">
                    {t("briefing.step3.confirm.body")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("briefing.step3.confirm.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit}>
                    {t("briefing.step3.confirm.proceed")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

function SummaryRow({
  label,
  value,
  labelOnly,
}: {
  label: string;
  value: string;
  labelOnly?: boolean;
}) {
  if (labelOnly) {
    return (
      <div className="text-xs text-muted-foreground keep-all">{label}</div>
    );
  }
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs text-muted-foreground keep-all">{label}</div>
      <div className="text-sm font-medium keep-all break-words">{value}</div>
    </div>
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
    <div className="flex flex-col gap-3">
      <div>
        <Label className="text-sm font-semibold tracking-tight keep-all">
          {title}
        </Label>
        {helper && (
          <p className="text-xs text-muted-foreground mt-1 keep-all leading-relaxed">
            {helper}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
