"use client";

/**
 * asset-action-menu.tsx
 * Phase 3.1 — Contextual asset action menu for yagi-image, yagi-pdf, yagi-url-card shapes.
 * Shown on hover (300ms delay) or right-click over a matching shape.
 * Achromatic styling (L-011), soft shadow (L-013), font-suit (L-010).
 */

import { useCallback } from "react";
import { useTranslations } from "next-intl";

// ============================================================
// Props
// ============================================================

interface AssetActionMenuProps {
  shapeType: "yagi-image" | "yagi-pdf" | "yagi-url-card";
  src: string; // URL to copy/download
  position: { x: number; y: number }; // absolute position in viewport
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export function AssetActionMenu({
  shapeType,
  src,
  position,
  onClose,
}: AssetActionMenuProps) {
  const t = useTranslations("projectBoard");

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(src);
    } catch {
      // Fallback: create a temporary input element for browsers that block clipboard API
      const input = document.createElement("input");
      input.value = src;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    onClose();
  }, [src, onClose]);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = src;
    a.download = src.split("/").pop() ?? "download";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onClose();
  }, [src, onClose]);

  const canDownload = shapeType === "yagi-image" || shapeType === "yagi-pdf";

  return (
    <>
      {/* Invisible backdrop to close menu on outside click */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
        }}
        onClick={onClose}
      />

      {/* Menu panel */}
      <div
        role="menu"
        aria-label="Asset actions"
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
          background: "#ffffff",
          // L-013: soft shadow, no hard border
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
          borderRadius: "8px",
          // border-border/40 equivalent (not hard)
          border: "1px solid rgba(0,0,0,0.08)",
          overflow: "hidden",
          minWidth: "148px",
          padding: "4px",
        }}
      >
        <button
          role="menuitem"
          onClick={handleCopyUrl}
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "7px 12px",
            background: "transparent",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontFamily: "var(--font-suit, sans-serif)",
            fontSize: "13px",
            fontWeight: 400,
            color: "#0a0a0a",
            textAlign: "left",
            gap: "8px",
            transition: "background 80ms",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
        >
          <CopyIcon />
          {t("assetMenu.copyUrl")}
        </button>

        {canDownload && (
          <button
            role="menuitem"
            onClick={handleDownload}
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              padding: "7px 12px",
              background: "transparent",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontFamily: "var(--font-suit, sans-serif)",
              fontSize: "13px",
              fontWeight: 400,
              color: "#0a0a0a",
              textAlign: "left",
              gap: "8px",
              transition: "background 80ms",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "#f5f5f5";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "transparent";
            }}
          >
            <DownloadIcon />
            {t("assetMenu.download")}
          </button>
        )}
      </div>
    </>
  );
}

// ============================================================
// Inline SVG icons (achromatic, L-011)
// ============================================================

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect
        x="4"
        y="4"
        width="8"
        height="9"
        rx="1.5"
        stroke="#555555"
        strokeWidth="1.2"
      />
      <path
        d="M2 10V2.5A1.5 1.5 0 0 1 3.5 1H9"
        stroke="#555555"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        d="M7 1v8M4 6l3 3 3-3"
        stroke="#555555"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 11h10"
        stroke="#555555"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default AssetActionMenu;
