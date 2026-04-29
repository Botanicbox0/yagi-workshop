"use client";

/**
 * project-board.tsx
 * Phase 3.1 — Unified ProjectBoard component (tldraw infinite canvas)
 *
 * Decision Q4: Wizard board + Brief Board = same component, mode prop differentiates.
 * Decision Q-C: URL-bound shapes only — NO tldraw internal asset store.
 * Decision Q-D: Empty canvas overlay fades when first shape placed.
 * Decision Q2: Infinite canvas + pan/zoom. Mobile = read-only.
 *
 * REGION OWNERSHIP:
 *   task_02 (this file): shell + shape registration + theme + mobile detection + empty overlay
 *   task_03: fills TASK_03_STUB regions — drop handlers + asset menu wiring (DONE)
 *   task_05: fills TASK_05_STUB regions — brief mode features (version history, lock)
 */

import "./tldraw-theme.css";
// Note: ./shapes/yagi-shape-types.d.ts contains module augmentation declarations
// for TLGlobalShapePropsMap. It is type-only (.d.ts) so cannot be imported as a
// runtime module (webpack rejects). TS auto-includes .d.ts files in the project,
// so the augmentation is in scope without explicit import.

import React from "react";
import {
  Tldraw,
  Editor,
  TLAnyShapeUtilConstructor,
  createShapeId,
} from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { AssetActionMenu } from "./asset-action-menu";
import {
  getBoardAssetPutUrlAction,
  fetchVideoMetadataAction,
} from "@/app/[locale]/app/projects/new/actions";

import { ImageShapeUtil } from "./shapes/image-shape";
import { UrlCardShapeUtil } from "./shapes/url-card-shape";
import { PdfShapeUtil } from "./shapes/pdf-shape";
import { EmptyOverlay } from "./empty-overlay";

// ============================================================
// Custom shape utils — registered with tldraw
// ============================================================

const CUSTOM_SHAPE_UTILS: TLAnyShapeUtilConstructor[] = [
  ImageShapeUtil,
  UrlCardShapeUtil,
  PdfShapeUtil,
];

// ============================================================
// Image/PDF size limits (client-side validation — server validates again)
// ============================================================

const IMAGE_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const PDF_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// ============================================================
// Asset action menu state type
// ============================================================

type AssetMenuState = {
  shapeType: "yagi-image" | "yagi-pdf" | "yagi-url-card";
  src: string;
  position: { x: number; y: number };
} | null;

// ============================================================
// Upload helper — calls server action for presigned PUT, then fetches R2.
// K-05 LOOP 1 HIGH-A F7 fix: server generates the storage key (UUID-based),
// the client only forwards the file's content type. Filename is NOT trusted.
// ============================================================

async function uploadFileToR2(file: File): Promise<string | null> {
  const result = await getBoardAssetPutUrlAction(file.type);
  if (!result.ok) {
    console.error("[ProjectBoard] presign failed:", result.error);
    return null;
  }

  const putResponse = await fetch(result.putUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });

  if (!putResponse.ok) {
    console.error("[ProjectBoard] R2 PUT failed:", putResponse.status);
    return null;
  }

  return result.publicUrl;
}

// ============================================================
// Mobile detection hook
// ============================================================

function useIsMobileReadOnly(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(hover: none) and (max-width: 768px)");

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    setIsMobile(mql.matches);
    mql.addEventListener("change", handleChange);

    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}

// ============================================================
// Props
// ============================================================

export interface ProjectBoardProps {
  /** Mode differentiates wizard step 2 vs project detail brief board */
  mode: "wizard" | "brief";
  /** Persisted tldraw store snapshot (JSON). Loaded on mount. */
  document?: Record<string, unknown>;
  /** Called (debounced) on any store change for autosave */
  onDocumentChange?: (snapshot: Record<string, unknown>) => void;
  /** Force read-only (regardless of mobile detection) */
  readOnly?: boolean;
  /** Admin lock state — locked board blocks client edits */
  locked?: boolean;
  /** Viewer role — controls lock button + version panel visibility */
  viewerRole?: "client" | "yagi_admin";
  /** Additional className for outer container */
  className?: string;
  /**
   * Canvas aspect ratio. Q-AD: 16/10 desktop, 4/5 mobile (mobile overrides via CSS).
   * 'auto' keeps the existing height:100% behavior for special containers.
   * Default: '16/10'
   */
  aspectRatio?: "16/10" | "4/5" | "auto";
}

// ============================================================
// Component
// ============================================================

export function ProjectBoard({
  mode: _mode, // used by task_05 to distinguish wizard vs brief features
  document,
  onDocumentChange,
  readOnly = false,
  locked = false,
  viewerRole = "client",
  className,
  aspectRatio = "16/10",
}: ProjectBoardProps) {
  const t = useTranslations("projectBoard");
  const isMobileDetected = useIsMobileReadOnly();
  const editorRef = useRef<Editor | null>(null);
  const [hasShapes, setHasShapes] = useState(false);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  // === TASK_03_STUB filled: asset action menu state ===
  const [assetMenu, setAssetMenu] = useState<AssetMenuState>(null);
  // hoverTimeout ref — cleared on mouseLeave before 300ms
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Effective read-only: mobile, explicit prop, or locked (non-admin)
  const isReadOnly =
    readOnly ||
    isMobileDetected ||
    (locked && viewerRole !== "yagi_admin");

  // ============================================================
  // Editor mount callback
  // ============================================================

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      setIsEditorMounted(true);

      // Apply read-only state if needed (mobile, locked, or explicit prop)
      if (isReadOnly) {
        try {
          // tldraw v4: updateInstanceState with isReadonly flag
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 instanceState types
          (editor as any).updateInstanceState({ isReadonly: true });
        } catch {
          // Fallback: switch to select tool only
          editor.setCurrentTool("select");
        }
      }

      // Load persisted document if provided
      if (document && Object.keys(document).length > 0) {
        try {
          editor.loadSnapshot(
            document as Parameters<typeof editor.loadSnapshot>[0]
          );
        } catch (e) {
          console.warn("[ProjectBoard] Failed to load snapshot:", e);
        }
      }

      // Track whether canvas has any shapes (for empty overlay)
      const updateShapeCount = () => {
        const count = editor.getCurrentPageShapes().length;
        setHasShapes(count > 0);
      };

      updateShapeCount();

      // Subscribe to store changes for empty overlay + autosave
      const unsubscribeStore = editor.store.listen(
        () => {
          updateShapeCount();

          if (onDocumentChange) {
            // Note: autosave debouncing is handled by the parent component
            // (task_04 wizard autosave / task_05 brief board autosave).
            // Here we just emit the raw snapshot.
            try {
              const snapshot = editor.getSnapshot();
              onDocumentChange(
                snapshot as unknown as Record<string, unknown>
              );
            } catch (e) {
              console.warn("[ProjectBoard] Failed to get snapshot:", e);
            }
          }
        },
        { source: "user", scope: "document" }
      );

      // === TASK_03_STUB filled: drop handler ===
      // tldraw v4 exposes native DOM drop events via the canvas element.
      // We intercept at the tldraw container's DOM node via the 'drop' event on the
      // canvas wrapper since tldraw v4 does not have a public editor.on('drop') API.

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 container access
      const container = (editor as any).getContainer?.() as HTMLElement | null;

      const handleDrop = async (e: DragEvent) => {
        if (isReadOnly) return;
        e.preventDefault();
        e.stopPropagation();

        const files = Array.from(e.dataTransfer?.files ?? []);
        const textData = e.dataTransfer?.getData("text/plain") ?? "";

        // Calculate drop position in canvas coordinates
        const canvasPos = editor.screenToPage({
          x: e.clientX,
          y: e.clientY,
        });

        // --- Handle file drops ---
        for (const file of files) {
          const mime = file.type;

          if (mime.startsWith("image/")) {
            // Client-side size validation — server validates again
            if (file.size > IMAGE_MAX_BYTES) {
              console.warn(`[ProjectBoard] Image too large (max 20MB): ${file.name}`);
              continue;
            }

            const publicUrl = await uploadFileToR2(file);
            if (!publicUrl) continue;

            editor.createShape({
              id: createShapeId(),
              type: "yagi-image" as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1: custom shape type not in TLGlobalShapePropsMap
              x: canvasPos.x,
              y: canvasPos.y,
              props: {
                src: publicUrl,
                w: 320,
                h: 240,
                alt: file.name,
              },
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1
          } else if (mime === "application/pdf") {
            // Client-side size validation — server validates again
            if (file.size > PDF_MAX_BYTES) {
              console.warn(`[ProjectBoard] PDF too large (max 10MB): ${file.name}`);
              continue;
            }

            const publicUrl = await uploadFileToR2(file);
            if (!publicUrl) continue;

            editor.createShape({
              id: createShapeId(),
              type: "yagi-pdf" as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1: custom shape type not in TLGlobalShapePropsMap
              x: canvasPos.x,
              y: canvasPos.y,
              props: {
                src: publicUrl,
                filename: file.name,
                pageCount: 0,
                w: 200,
                h: 160,
              },
            } as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1
          }
        }

        // --- Handle URL drops (text/plain with a URL) ---
        if (files.length === 0 && textData) {
          await insertUrlCard(editor, textData, canvasPos);
        }
      };

      // --- URL paste handler ---
      const handlePaste = async (e: ClipboardEvent) => {
        if (isReadOnly) return;
        // Only intercept plain-text paste that looks like a URL
        const text = e.clipboardData?.getData("text/plain") ?? "";
        if (!text) return;

        let url: URL;
        try {
          url = new URL(text);
        } catch {
          return; // not a URL — let tldraw handle normally
        }
        if (url.protocol !== "http:" && url.protocol !== "https:") return;

        e.preventDefault();
        e.stopPropagation();

        // Place url-card near the canvas center
        const viewportCenter = editor.getViewportScreenCenter();
        const pageCenter = editor.screenToPage(viewportCenter);
        await insertUrlCard(editor, text, { x: pageCenter.x, y: pageCenter.y });
      };

      if (container) {
        container.addEventListener("drop", handleDrop as unknown as EventListener);
        container.addEventListener("dragover", (e: Event) => {
          e.preventDefault();
          const dragEvent = e as DragEvent;
          if (dragEvent.dataTransfer) {
            dragEvent.dataTransfer.dropEffect = "copy";
          }
        });
      }

      // Paste listener on the window (tldraw captures canvas-level paste; we hook window)
      window.addEventListener("paste", handlePaste as unknown as EventListener);

      // === TASK_03_STUB filled: asset action menu — pointer move hover wiring ===
      // tldraw v4: editor.on('pointerMove') fires with the hovered shape ID.
      // We track hover with a 300ms delay to avoid flicker.

      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 event types
      const unsubscribePointerMove = (editor as any).on?.("pointerMove", () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 hoveredShapeId
        const hoveredId = (editor as any).getHoveredShapeId?.() as string | null;
        if (!hoveredId) {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          setAssetMenu(null);
          return;
        }

        const shape = editor.getShape(hoveredId as Parameters<typeof editor.getShape>[0]);
        if (!shape) return;

        const YAGI_TYPES = ["yagi-image", "yagi-pdf", "yagi-url-card"] as const;
        type YagiShapeType = (typeof YAGI_TYPES)[number];
        if (!YAGI_TYPES.includes(shape.type as YagiShapeType)) {
          setAssetMenu(null);
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: shape props access
        const props = (shape as any).props as Record<string, unknown>;
        const src =
          (props.src as string | undefined) ??
          (props.url as string | undefined) ??
          "";
        if (!src) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 pointer position
        const pointer = (editor as any).inputs?.currentPagePoint ?? { x: 0, y: 0 };
        const screenPoint = editor.pageToScreen(pointer);

        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
          setAssetMenu({
            shapeType: shape.type as YagiShapeType,
            src,
            position: { x: screenPoint.x + 12, y: screenPoint.y + 12 },
          });
        }, 300);
      }) ?? (() => {});

      // Right-click context menu for asset shapes
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 rightClick event info type
      const unsubscribeRightClick = (editor as any).on?.("rightClick", (info: any) => {
        const shapeId = info?.shape?.id ?? info?.target?.id;
        if (!shapeId) return;

        const shape = editor.getShape(shapeId as Parameters<typeof editor.getShape>[0]);
        if (!shape) return;

        const YAGI_TYPES = ["yagi-image", "yagi-pdf", "yagi-url-card"] as const;
        type YagiShapeType2 = (typeof YAGI_TYPES)[number];
        if (!YAGI_TYPES.includes(shape.type as YagiShapeType2)) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: shape props access
        const props = (shape as any).props as Record<string, unknown>;
        const src =
          (props.src as string | undefined) ??
          (props.url as string | undefined) ??
          "";
        if (!src) return;

        // Position near the click (passed in info.point or use inputs)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 inputs
        const inputs = (editor as any).inputs;
        const pagePoint = info?.point ?? inputs?.currentPagePoint ?? { x: 0, y: 0 };
        const screenPoint = editor.pageToScreen(pagePoint);

        setAssetMenu({
          shapeType: shape.type as YagiShapeType2,
          src,
          position: { x: screenPoint.x + 4, y: screenPoint.y + 4 },
        });
      }) ?? (() => {});

      // === TASK_05_STUB: version history panel (brief mode only) ===
      // task_05 will wire the version history side panel for mode='brief'.
      // import VersionHistoryPanel from './version-history-panel' is absent here.

      // === TASK_05_STUB: lock/unlock action (brief mode, yagi_admin only) ===
      // task_05 will add the lock button + toast on locked-edit attempt.

      return () => {
        unsubscribeStore();
        if (typeof unsubscribePointerMove === "function") unsubscribePointerMove();
        if (typeof unsubscribeRightClick === "function") unsubscribeRightClick();
        if (container) {
          container.removeEventListener("drop", handleDrop as unknown as EventListener);
        }
        window.removeEventListener("paste", handlePaste as unknown as EventListener);
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      };
    },
    [document, onDocumentChange, isReadOnly]
  );

  // ============================================================
  // Tldraw component options (unused variable — kept for documentation)
  // ============================================================

  // const tldrawOptions — removed (was unused; props spread inline on <Tldraw>)

  // ============================================================
  // Render
  // ============================================================

  // Compute aspect-ratio style for the container.
  // Q-AD: 16/10 desktop, 4/5 mobile.
  // We use CSS aspect-ratio with a min/max height guard.
  // On mobile (max-width: 768px via CSS media), we override to 4/5 via a
  // sibling class `.pb-mobile-ratio` injected alongside the container.
  const aspectRatioStyle: React.CSSProperties =
    aspectRatio === "auto"
      ? { height: "100%" }
      : {
          // Default: use the provided ratio. Mobile override via CSS class below.
          aspectRatio: aspectRatio === "16/10" ? "16 / 10" : "4 / 5",
          minHeight: "480px",
          maxHeight: "80vh",
          height: "auto",
        };

  return (
    <div
      className={[
        className,
        // pb-mobile-ratio is a CSS helper class (defined in tldraw-theme.css or global.css)
        // that overrides aspect-ratio to 4/5 on mobile. We include it always.
        "pb-mobile-ratio",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        position: "relative",
        width: "100%",
        background: "#ffffff",
        borderRadius: "8px",
        // L-013: soft shadow for canvas container
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
        ...aspectRatioStyle,
      }}
    >
      {/* Mobile read-only banner */}
      {isMobileDetected && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: "#f5f5f5",
            // L-013: hairline border
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="font-suit text-sm"
            style={{ color: "#555555", textAlign: "center" }}
          >
            {t("mobileBanner")}
          </span>
        </div>
      )}

      {/* Locked board banner for non-admin clients */}
      {locked && viewerRole !== "yagi_admin" && (
        <div
          role="status"
          style={{
            position: "absolute",
            top: isMobileDetected ? 40 : 0,
            left: 0,
            right: 0,
            zIndex: 10,
            background: "#fafafa",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            padding: "8px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            className="font-suit text-sm"
            style={{ color: "#555555", textAlign: "center" }}
          >
            {/* TASK_05_STUB filled: boardLocked i18n key from task_05 */}
            {t("boardLocked")}
          </span>
        </div>
      )}

      {/* Empty canvas overlay (Q-D) */}
      {isEditorMounted && <EmptyOverlay hasShapes={hasShapes} />}

      {/* Asset action menu — shown on hover (300ms) or right-click on yagi-* shapes */}
      {assetMenu && (
        <AssetActionMenu
          shapeType={assetMenu.shapeType}
          src={assetMenu.src}
          position={assetMenu.position}
          onClose={() => setAssetMenu(null)}
        />
      )}

      {/* tldraw canvas */}
      {/* Read-only state is set via editor.updateInstanceState in handleMount */}
      <Tldraw
        shapeUtils={CUSTOM_SHAPE_UTILS}
        onMount={handleMount}
        inferDarkMode={false}
        hideUi={false}
      />
    </div>
  );
}

// ============================================================
// insertUrlCard — shared helper for drop + paste URL handling
// ============================================================

async function insertUrlCard(
  editor: Editor,
  rawUrl: string,
  pos: { x: number; y: number }
) {
  let domain = "";
  try {
    domain = new URL(rawUrl).hostname.replace(/^www\./, "");
  } catch {
    return; // not a valid URL
  }

  // Try oEmbed for YouTube / Vimeo
  let title = "";
  let thumbnail = "";
  const description = "";

  try {
    const meta = await fetchVideoMetadataAction(rawUrl);
    if (meta) {
      title = meta.title ?? "";
      thumbnail = meta.thumbnailUrl ?? "";
      // oEmbed doesn't provide description; leave empty
    }
  } catch {
    // oEmbed unavailable — fall back to generic card
  }

  editor.createShape({
    id: createShapeId(),
    type: "yagi-url-card" as any, // eslint-disable-line @typescript-eslint/no-explicit-any -- Phase 3.1: custom shape type not in TLGlobalShapePropsMap
    x: pos.x,
    y: pos.y,
    props: {
      url: rawUrl,
      title,
      description,
      thumbnail,
      domain,
      w: 280,
      h: thumbnail ? 200 : 100,
    },
  } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
}

export default ProjectBoard;
