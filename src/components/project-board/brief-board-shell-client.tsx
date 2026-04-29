"use client";

/**
 * brief-board-shell-client.tsx
 * Phase 3.1 hotfix-3 task_04 — Client shell for brief mode (project detail page).
 *
 * Owns the lock state locally (optimistic) and coordinates cascade to:
 *   - LockButton (yagi_admin only)
 *   - LockedBanner (non-admin + locked)
 *   - BriefBoardClient (canvas readonly when locked + non-admin)
 *   - BriefBoardAttachmentsClient (mutations disabled when locked + non-admin)
 *   - VersionHistoryPanel (unaffected by lock)
 *
 * Why a unified shell?
 *   - Lock state must propagate in real-time across all three sub-surfaces
 *     without a full server re-render.
 *   - The server component (page.tsx) passes initial state; client manages
 *     optimistic updates after toggleBoardLockAction.
 *
 * L-043: lock state cascades to attachments too — one source of truth here.
 */

import { useState, useCallback } from "react";
import { BriefBoardClient } from "./brief-board-client";
import { BriefBoardAttachmentsClient } from "./brief-board-attachments-client";
import { LockButton } from "./lock-button";
import { LockedBanner } from "./locked-banner";
import { VersionHistoryPanel, type VersionEntry } from "./version-history-panel";
import { toggleBoardLockAction } from "@/app/[locale]/app/projects/[id]/board-actions";
import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";

// ============================================================
// Props
// ============================================================

interface BriefBoardShellClientProps {
  projectId: string;
  boardId: string;
  initialDocument: Record<string, unknown>;
  initialLocked: boolean;
  viewerRole: "client" | "yagi_admin";
  initialPdfs: PdfAttachment[];
  initialUrls: UrlAttachment[];
  versions: VersionEntry[];
  currentVersion: number;
  /** i18n key for the brief board title header */
  boardTitle: string;
}

// ============================================================
// Component
// ============================================================

export function BriefBoardShellClient({
  projectId,
  boardId,
  initialDocument,
  initialLocked,
  viewerRole,
  initialPdfs,
  initialUrls,
  versions,
  currentVersion,
  boardTitle,
}: BriefBoardShellClientProps) {
  const [isLocked, setIsLocked] = useState(initialLocked);

  // Non-admin client viewers: canvas readonly when board is locked.
  // Admin always retains edit access (cascade L-043 only affects non-admin).
  const isClientView = viewerRole !== "yagi_admin";
  const canvasReadOnly = isLocked && isClientView;
  const attachmentsReadOnly = isLocked && isClientView;

  // ============================================================
  // Lock toggle handler
  // ============================================================

  const handleLockToggle = useCallback(
    async (newState: boolean): Promise<{ ok: boolean }> => {
      const result = await toggleBoardLockAction(boardId, newState);
      if (result.ok) {
        setIsLocked(newState);
      }
      return result;
    },
    [boardId]
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-4">
      {/* Header row: title + lock button (admin only) */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          {boardTitle}
        </h2>

        {/* Lock button — yagi_admin only, brief mode only */}
        {viewerRole === "yagi_admin" && (
          <LockButton
            boardId={boardId}
            isLocked={isLocked}
            onToggle={handleLockToggle}
          />
        )}
      </div>

      {/* Locked banner — non-admin viewers only when locked (L-043) */}
      {isClientView && (
        <LockedBanner isLocked={isLocked} />
      )}

      {/* Full-width canvas with Q-AD aspect ratio */}
      <BriefBoardClient
        projectId={projectId}
        initialDocument={initialDocument}
        locked={isLocked}
        viewerRole={viewerRole}
        aspectRatio="16/10"
      />

      {/* Attachments section — L-043 cascade: locked blocks client mutations */}
      {/* L-033: canvas-internal PDF/URL drop preserved separately in project-board.tsx */}
      <BriefBoardAttachmentsClient
        boardId={boardId}
        initialPdfs={initialPdfs}
        initialUrls={initialUrls}
        isLocked={attachmentsReadOnly}
        isReadOnly={false}
      />

      {/* Version history — below attachments, unaffected by lock */}
      <VersionHistoryPanel
        boardId={boardId}
        versions={versions}
        currentVersion={currentVersion}
        viewerRole={viewerRole}
      />
    </div>
  );
}
