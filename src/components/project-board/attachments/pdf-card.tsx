"use client";

/**
 * pdf-card.tsx
 * Phase 3.1 hotfix-3 — PDF attachment card for AttachmentsSection.
 * Design system v0.2.0 compliance:
 *   - L-013: soft shadow OR border-border/40 (no harsh 1px)
 *   - L-011: achromatic only (no color accents)
 *   - L-014: no italic em
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PdfAttachment } from "@/lib/board/asset-index";

type Props = {
  pdf: PdfAttachment;
  onRemove: (id: string) => void;
  disabled: boolean;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

export function PdfCard({ pdf, onRemove, disabled }: Props) {
  const t = useTranslations("attachments.pdf");
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-start gap-3 rounded-md p-3 border border-border/40"
      style={{
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        background: "#ffffff",
      }}
    >
      {/* PDF icon */}
      <span
        className="text-lg shrink-0 mt-0.5"
        aria-hidden="true"
        style={{ lineHeight: 1 }}
      >
        📄
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-suit text-sm font-medium text-foreground truncate">
          {pdf.filename}
        </p>
        <p className="font-suit text-xs text-muted-foreground mt-0.5">
          {formatBytes(pdf.size_bytes)} &middot;{" "}
          {t("uploaded_at", { date: formatDate(pdf.uploaded_at) })}
        </p>
      </div>

      {/* Remove button — hover-only, disabled when locked/readonly */}
      {!disabled && hovered && (
        <button
          type="button"
          onClick={() => onRemove(pdf.id)}
          aria-label="Remove PDF attachment"
          className="shrink-0 rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  );
}
