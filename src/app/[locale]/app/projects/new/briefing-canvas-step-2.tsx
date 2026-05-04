"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 hotfix-1 — Step 2 orchestrator (2-row layout)
//
// Layout:
//   Row 1 (lg:grid-cols-2 / mobile stack):
//     • Step2BriefColumn      — 보유 자료 (briefing_documents kind='brief')
//     • Step2ReferenceColumn  — 레퍼런스 (kind='reference', oembed)
//   Row 2 (full-width):
//     • Step2Sidebar          — 디테일 (12 fields, internal 2-col form
//                               grid; was vertical sidebar in original
//                               3-col layout).
//
// Sticky bottom CTA bar (sidebar-offset on md+):
//   [← 이전]  ·  자동 저장 status indicator  ·  [확인 →]
//
// Whiteboard expandable mounts under the detail row; collapsed by default
// per KICKOFF v1.2 §task_05 (90% 안 씀).
//
// Initial data:
//   - briefing_documents fetched on mount via supabase browser client
//     (RLS-scoped to the project's workspace members).
//   - projects metadata fetched on mount and seeded into Step2Sidebar.
// =============================================================================

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Step2BriefColumn, type BriefDoc } from "./briefing-canvas-step-2-brief";
import {
  Step2ReferenceColumn,
  type ReferenceDoc,
} from "./briefing-canvas-step-2-reference";
import {
  Step2Sidebar,
  type SidebarFormData,
  type AutosaveState,
} from "./briefing-canvas-step-2-sidebar";

type ProjectMetadata = {
  mood_keywords: string[] | null;
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  channels: string[] | null;
  target_audience: string | null;
};

const EMPTY_SIDEBAR: SidebarFormData = {
  mood_keywords: [],
  mood_keywords_free: "",
  visual_ratio: "",
  visual_ratio_custom: "",
  channels: [],
  target_audience: "",
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

export function BriefingCanvasStep2({
  projectId,
  onBack,
  onNext,
}: {
  projectId: string;
  onBack: () => void;
  onNext: () => void;
}) {
  const t = useTranslations("projects");
  const [briefDocs, setBriefDocs] = useState<BriefDoc[]>([]);
  const [refDocs, setRefDocs] = useState<ReferenceDoc[]>([]);
  const [sidebarInitial, setSidebarInitial] = useState<SidebarFormData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [autosave, setAutosave] = useState<AutosaveState>("idle");
  const [savedAt, setSavedAt] = useState<string | undefined>(undefined);

  // Initial fetch of briefing_documents + projects metadata.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowser();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      const sb = supabase as any;
      const [docsRes, projRes] = await Promise.all([
        sb
          .from("briefing_documents")
          .select(
            "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at",
          )
          .eq("project_id", projectId)
          .order("created_at", { ascending: true }),
        sb
          .from("projects")
          .select(
            "mood_keywords, mood_keywords_free, visual_ratio, visual_ratio_custom, channels, target_audience",
          )
          .eq("id", projectId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const docs = (docsRes.data ?? []) as Array<{
        id: string;
        kind: "brief" | "reference";
        source_type: "upload" | "url";
        storage_key: string | null;
        filename: string | null;
        size_bytes: number | null;
        url: string | null;
        provider: string | null;
        thumbnail_url: string | null;
        note: string | null;
        category: string | null;
      }>;
      setBriefDocs(
        docs
          .filter((d) => d.kind === "brief")
          .map((d) => ({
            id: d.id,
            source_type: d.source_type,
            storage_key: d.storage_key,
            filename: d.filename,
            url: d.url,
            size_bytes: d.size_bytes,
          })),
      );
      setRefDocs(
        docs
          .filter((d) => d.kind === "reference")
          .map((d) => ({
            id: d.id,
            url: d.url,
            provider: d.provider,
            thumbnail_url: d.thumbnail_url,
            note: d.note,
            category: d.category,
          })),
      );
      const meta = (projRes.data as ProjectMetadata | null) ?? null;
      setSidebarInitial({
        ...EMPTY_SIDEBAR,
        mood_keywords: meta?.mood_keywords ?? [],
        mood_keywords_free: meta?.mood_keywords_free ?? "",
        visual_ratio: meta?.visual_ratio ?? "",
        visual_ratio_custom: meta?.visual_ratio_custom ?? "",
        channels: meta?.channels ?? [],
        target_audience: meta?.target_audience ?? "",
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading || !sidebarInitial) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 pt-12 pb-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-foreground/40 mb-3">
          {t("briefing.step2.header.eyebrow")}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed keep-all max-w-2xl">
          {t("briefing.step2.header.description")}
        </p>
      </div>

      {/* 2-row layout: top = brief + reference (2-col on lg), bottom = full-width detail */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Step2BriefColumn
            projectId={projectId}
            documents={briefDocs}
            onAdded={(d) => setBriefDocs((prev) => [...prev, d])}
            onRemoved={(id) =>
              setBriefDocs((prev) => prev.filter((d) => d.id !== id))
            }
          />
          <Step2ReferenceColumn
            projectId={projectId}
            documents={refDocs}
            onAdded={(d) => setRefDocs((prev) => [...prev, d])}
            onRemoved={(id) =>
              setRefDocs((prev) => prev.filter((d) => d.id !== id))
            }
            onUpdated={(id, patch) =>
              setRefDocs((prev) =>
                prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
              )
            }
          />
        </div>
        <Step2Sidebar
          projectId={projectId}
          initial={sidebarInitial}
          onAutosaveState={(state, ts) => {
            setAutosave(state);
            if (ts) setSavedAt(ts);
          }}
        />
      </div>

      {/* Whiteboard expandable — task_05 v3 ships the disclosure pattern;
          full tldraw mount is FU-Phase5-3. */}
      <div className="max-w-7xl mx-auto px-6 lg:px-12 mt-8">
        <details className="group rounded-3xl border border-border/40 p-4">
          <summary className="cursor-pointer text-sm font-medium select-none list-none flex items-center justify-between">
            <span>{t("briefing.step2.whiteboard.expand_cta")}</span>
            <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">
              ▾
            </span>
          </summary>
          <div className="mt-4 p-12 rounded-2xl bg-muted/40 text-center">
            <p className="text-xs text-muted-foreground keep-all leading-relaxed">
              {t("briefing.step2.whiteboard.placeholder")}
            </p>
          </div>
        </details>
      </div>

      {/* Sticky bottom CTA — sidebar-offset on md+ (sidebar is 240px wide) */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[240px] border-t border-border/40 bg-background/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-4 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-sm"
          >
            {t("briefing.step2.cta.back")}
          </Button>
          <div className="text-xs text-muted-foreground keep-all flex items-center gap-2">
            {autosave === "saving" && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>{t("briefing.step2.autosave.saving")}</span>
              </>
            )}
            {autosave === "saved" && (
              <span className="text-emerald-600">
                {t("briefing.step2.autosave.saved_at", {
                  time: formatSavedAt(savedAt),
                })}
              </span>
            )}
            {autosave === "error" && (
              <span className="text-destructive">
                {t("briefing.step2.autosave.error")}
              </span>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onNext}
            className="text-sm rounded-full px-6"
          >
            {t("briefing.step2.cta.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
