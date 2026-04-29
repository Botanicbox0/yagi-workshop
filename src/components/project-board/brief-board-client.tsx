"use client";

/**
 * brief-board-client.tsx
 * Phase 3.1 K-05 LOOP 1 fix — client wrapper around <ProjectBoard mode="brief">
 * that debounces autosave calls to updateProjectBoardAction.
 *
 * Lives separately from ProjectBoard because ProjectBoard itself is mode-agnostic
 * and the brief-mode autosave (which calls a project-specific server action) is
 * a wiring concern owned by the detail page.
 */

import { useCallback, useRef } from "react";
import { ProjectBoard } from "./project-board";
import { updateProjectBoardAction } from "@/app/[locale]/app/projects/[id]/board-actions";

const AUTOSAVE_DEBOUNCE_MS = 800;

export interface BriefBoardClientProps {
  projectId: string;
  initialDocument: Record<string, unknown>;
  locked: boolean;
  viewerRole: "client" | "yagi_admin";
  /** Q-AD: Canvas aspect ratio. Default '16/10'. */
  aspectRatio?: "16/10" | "4/5" | "auto";
}

export function BriefBoardClient({
  projectId,
  initialDocument,
  locked,
  viewerRole,
  aspectRatio = "16/10",
}: BriefBoardClientProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);

  const handleDocumentChange = useCallback(
    (snapshot: Record<string, unknown>) => {
      // Skip persisting if the board is locked for non-admin viewers — server
      // would reject anyway (defense-in-depth).
      if (locked && viewerRole !== "yagi_admin") return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        void (async () => {
          try {
            const result = await updateProjectBoardAction({
              projectId,
              document: snapshot,
            });
            if (!result.ok) {
              console.warn(
                "[BriefBoardClient] updateProjectBoardAction failed:",
                result
              );
            }
          } catch (e) {
            console.error("[BriefBoardClient] autosave error:", e);
          } finally {
            inFlightRef.current = false;
          }
        })();
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [projectId, locked, viewerRole]
  );

  return (
    <ProjectBoard
      mode="brief"
      document={initialDocument}
      onDocumentChange={handleDocumentChange}
      locked={locked}
      viewerRole={viewerRole}
      aspectRatio={aspectRatio}
    />
  );
}

export default BriefBoardClient;
