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
 *   task_03: fills TASK_03_STUB regions — drop handlers + asset menu wiring
 *   task_05: fills TASK_05_STUB regions — brief mode features (version history, lock)
 */

import "./tldraw-theme.css";
// Side-effect import: ensures TLGlobalShapePropsMap augmentation is in scope
import "./shapes/yagi-shape-types";

import { Tldraw, Editor, TLAnyShapeUtilConstructor } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

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
}: ProjectBoardProps) {
  const t = useTranslations("projectBoard");
  const isMobileDetected = useIsMobileReadOnly();
  const editorRef = useRef<Editor | null>(null);
  const [hasShapes, setHasShapes] = useState(false);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

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
      const unsubscribe = editor.store.listen(
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

      // === TASK_03_STUB: drop handler ===
      // task_03 will implement onDrop handling here via:
      //   editor.on('drop', ...) or tldraw's built-in drop integration
      // - onDrop image file → getWizardAssetPutUrlAction → R2 PUT → insert image shape
      //   with src = CLOUDFLARE_R2_PUBLIC_BASE + key
      // - onDrop PDF file → upload via same path → insert pdf shape
      // - URL paste → fetchVideoMetadataAction for YouTube/Vimeo oEmbed,
      //   else parse title/description → insert url-card shape
      // - Client-side size validation: image ≤20MB, PDF ≤10MB
      // const handleDrop = undefined; // task_03 fills this

      // === TASK_03_STUB: asset action menu ===
      // task_03 will wire <AssetActionMenu> component that appears on:
      //   - hover over image/pdf/url-card shape (300ms delay)
      //   - right-click on image/pdf/url-card shape
      // import AssetActionMenu from './asset-action-menu' is intentionally absent here.
      // task_03 creates asset-action-menu.tsx and adds the import + wiring.

      // === TASK_05_STUB: version history panel (brief mode only) ===
      // task_05 will wire the version history side panel for mode='brief'.
      // import VersionHistoryPanel from './version-history-panel' is absent here.

      // === TASK_05_STUB: lock/unlock action (brief mode, yagi_admin only) ===
      // task_05 will add the lock button + toast on locked-edit attempt.

      return unsubscribe;
    },
    [document, onDocumentChange]
  );

  // ============================================================
  // Tldraw component options
  // ============================================================

  const tldrawOptions = {
    shapeUtils: CUSTOM_SHAPE_UTILS,
    onMount: handleMount,
    inferDarkMode: false,
    // Disable tldraw's default toolbar in wizard mode (we control via drop+paste)
    // In brief mode, allow full toolbar for admin editing
    hideUi: false,
  } as const;

  // ============================================================
  // Render
  // ============================================================

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "400px",
        background: "#ffffff",
        borderRadius: "8px",
        // L-013: soft shadow for canvas container
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        overflow: "hidden",
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
            {/* task_05 will add i18n key "boardLocked" */}
            관리자가 보드를 잠갔습니다 / Admin has locked this board
          </span>
        </div>
      )}

      {/* Empty canvas overlay (Q-D) */}
      {isEditorMounted && <EmptyOverlay hasShapes={hasShapes} />}

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

export default ProjectBoard;
