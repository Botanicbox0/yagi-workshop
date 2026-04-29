"use client";

/**
 * empty-overlay.tsx
 * Phase 3.1 — Empty canvas overlay (Q-D decision)
 * Shows when no shapes placed; fades out when first shape is added.
 * Styling: text-muted-foreground/40 text-sm font-normal pointer-events-none
 * per KICKOFF.md Q-D spec.
 * L-010: font-suit (NOT font-display)
 * L-011: achromatic colors only
 */

import { useTranslations } from "next-intl";

interface EmptyOverlayProps {
  hasShapes: boolean;
}

export function EmptyOverlay({ hasShapes }: EmptyOverlayProps) {
  const t = useTranslations("projectBoard");

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 1,
        opacity: hasShapes ? 0 : 1,
        transition: "opacity 200ms ease-out",
      }}
    >
      <p
        className="font-suit text-sm font-normal"
        style={{
          color: "rgba(10, 10, 10, 0.35)",
          textAlign: "center",
          lineHeight: 1.6,
          userSelect: "none",
          maxWidth: "280px",
          padding: "0 16px",
        }}
      >
        {t("emptyOverlay")}
      </p>
    </div>
  );
}
