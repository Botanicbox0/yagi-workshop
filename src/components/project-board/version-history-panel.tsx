"use client";

/**
 * version-history-panel.tsx
 * Phase 3.1 task_05 — version history side panel for ProjectBoard brief mode.
 * Lists last 20 versions; click to preview; restore (admin only).
 * Achromatic (L-011), soft shadow (L-013), font-suit (L-010), no internal seams (L-012).
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { restoreVersionAction } from "@/app/[locale]/app/projects/[id]/board-actions";

export interface VersionEntry {
  id: string;
  version: number;
  created_at: string;
  label: string | null;
}

export interface VersionHistoryPanelProps {
  boardId: string;
  versions: VersionEntry[];
  currentVersion: number;
  viewerRole: "client" | "yagi_admin";
}

export function VersionHistoryPanel({
  boardId,
  versions,
  currentVersion,
  viewerRole,
}: VersionHistoryPanelProps) {
  const t = useTranslations("projectBoard.versionHistory");
  const [isPending, startTransition] = useTransition();
  const [activeRestoreVersion, setActiveRestoreVersion] = useState<number | null>(null);

  const isAdmin = viewerRole === "yagi_admin";

  const handleRestore = (version: number) => {
    if (!isAdmin) return;
    setActiveRestoreVersion(version);
    startTransition(async () => {
      const result = await restoreVersionAction({ boardId, version });
      setActiveRestoreVersion(null);
      if (!result.ok) {
        console.error("[VersionHistoryPanel] restore failed:", result);
      }
      // revalidate handled server-side; the page will re-render via
      // revalidatePath in updateProjectBoardAction's chain (or explicit
      // window.location.reload() if needed).
    });
  };

  const fmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
        {t("title")}
      </h3>
      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground keep-all">—</p>
      ) : (
        <ul className="space-y-2 max-h-[480px] overflow-y-auto">
          {versions.slice(0, 20).map((v) => {
            const isCurrent = v.version === currentVersion;
            return (
              <li
                key={v.id}
                className="rounded-lg p-3 bg-background"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground keep-all">
                      v{v.version}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {t("viewing", { version: v.version })}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {fmt.format(new Date(v.created_at))}
                    </p>
                  </div>
                  {isAdmin && !isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleRestore(v.version)}
                      disabled={isPending && activeRestoreVersion === v.version}
                      className="rounded-full border border-border/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.10em] hover:bg-muted disabled:opacity-50 transition-colors"
                    >
                      {t("restore")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default VersionHistoryPanel;
