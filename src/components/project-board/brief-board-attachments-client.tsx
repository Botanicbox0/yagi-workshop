"use client";

/**
 * brief-board-attachments-client.tsx
 * Phase 3.1 hotfix-3 — Client wrapper that wires server-action callbacks
 * to <AttachmentsSection> in brief mode (project detail page).
 *
 * Why a wrapper?
 *   - page.tsx is a Server Component and cannot pass server actions directly
 *     as props to "use client" children. Instead, the server component renders
 *     this wrapper with boardId + initial data, and this wrapper calls the
 *     server actions via their imported references (which Next.js serialises
 *     as RPC stubs on the client).
 *   - AttachmentsSection performs optimistic state updates internally, but
 *     actual persistence is delegated to the server actions here.
 *
 * L-033: Canvas-internal PDF/URL drop is separate (handled in project-board.tsx).
 *         This section is for explicit attachment management below the canvas.
 * L-041: Trust boundary enforced server-side in each action — client never
 *         supplies asset_index.
 */

import { useState, useCallback } from "react";
import { AttachmentsSection } from "./attachments-section";
import {
  addPdfAttachmentAction,
  removePdfAttachmentAction,
  addUrlAttachmentAction,
  updateUrlNoteAction,
  removeUrlAttachmentAction,
} from "@/app/[locale]/app/projects/[id]/board-actions";
import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";

// ============================================================
// Props
// ============================================================

interface BriefBoardAttachmentsClientProps {
  boardId: string;
  initialPdfs: PdfAttachment[];
  initialUrls: UrlAttachment[];
  isLocked: boolean;
  isReadOnly: boolean;
}

// ============================================================
// Component
// ============================================================

export function BriefBoardAttachmentsClient({
  boardId,
  initialPdfs,
  initialUrls,
  isLocked,
  isReadOnly,
}: BriefBoardAttachmentsClientProps) {
  // Local optimistic state — server is source of truth but we update locally
  // so the UI feels responsive without waiting for server round-trip.
  const [pdfs, setPdfs] = useState<PdfAttachment[]>(initialPdfs);
  const [urls, setUrls] = useState<UrlAttachment[]>(initialUrls);

  // ============================================================
  // PDF handlers
  // ============================================================

  const handlePdfAdd = useCallback(
    async (file: File): Promise<void> => {
      // Optimistic: add a placeholder entry while uploading
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: PdfAttachment = {
        id: tempId,
        storage_key: "",
        filename: file.name,
        size_bytes: file.size,
        uploaded_at: new Date().toISOString(),
        uploaded_by: "",
      };
      setPdfs((prev) => [...prev, optimistic]);

      const result = await addPdfAttachmentAction(boardId, file);
      if (result.ok) {
        // Replace temp entry with real entry (real id from RPC)
        setPdfs((prev) =>
          prev.map((p) =>
            p.id === tempId ? { ...optimistic, id: result.attachmentId } : p
          )
        );
      } else {
        // Roll back optimistic update
        setPdfs((prev) => prev.filter((p) => p.id !== tempId));
        throw new Error(result.error);
      }
    },
    [boardId]
  );

  const handlePdfRemove = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic: remove immediately
      setPdfs((prev) => prev.filter((p) => p.id !== id));

      const result = await removePdfAttachmentAction(boardId, id);
      if (!result.ok) {
        // Server failed — we cannot easily restore the item without re-fetching.
        // Log and surface via console; full refresh will correct state.
        console.error("[BriefBoardAttachmentsClient] PDF remove failed:", result.error);
      }
    },
    [boardId]
  );

  // ============================================================
  // URL handlers
  // ============================================================

  const handleUrlAdd = useCallback(
    async (url: string, note: string | null): Promise<void> => {
      const tempId = `temp-${crypto.randomUUID()}`;
      const optimistic: UrlAttachment = {
        id: tempId,
        url,
        title: null,
        thumbnail_url: null,
        provider: "generic",
        note: note,
        added_at: new Date().toISOString(),
        added_by: "",
      };
      setUrls((prev) => [...prev, optimistic]);

      const result = await addUrlAttachmentAction(boardId, url, note);
      if (result.ok) {
        setUrls((prev) =>
          prev.map((u) =>
            u.id === tempId ? { ...optimistic, id: result.attachmentId } : u
          )
        );
      } else {
        setUrls((prev) => prev.filter((u) => u.id !== tempId));
        throw new Error(result.error);
      }
    },
    [boardId]
  );

  const handleUrlNoteUpdate = useCallback(
    async (id: string, note: string): Promise<void> => {
      // Optimistic update
      setUrls((prev) =>
        prev.map((u) => (u.id === id ? { ...u, note } : u))
      );

      const result = await updateUrlNoteAction(boardId, id, note);
      if (!result.ok) {
        console.error("[BriefBoardAttachmentsClient] URL note update failed:", result.error);
      }
    },
    [boardId]
  );

  const handleUrlRemove = useCallback(
    async (id: string): Promise<void> => {
      setUrls((prev) => prev.filter((u) => u.id !== id));

      const result = await removeUrlAttachmentAction(boardId, id);
      if (!result.ok) {
        console.error("[BriefBoardAttachmentsClient] URL remove failed:", result.error);
      }
    },
    [boardId]
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <AttachmentsSection
      mode="brief"
      boardId={boardId}
      pdfs={pdfs}
      urls={urls}
      onPdfAdd={handlePdfAdd}
      onPdfRemove={handlePdfRemove}
      onUrlAdd={handleUrlAdd}
      onUrlNoteUpdate={handleUrlNoteUpdate}
      onUrlRemove={handleUrlRemove}
      isLocked={isLocked}
      isReadOnly={isReadOnly}
    />
  );
}
