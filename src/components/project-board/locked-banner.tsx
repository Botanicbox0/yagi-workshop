"use client";

/**
 * locked-banner.tsx
 * Phase 3.1 hotfix-3 task_04 — Non-admin viewer banner when board is locked.
 *
 * Design system v0.2.0:
 *   - L-011: achromatic only (NO amber/red — calm, not alarmist)
 *   - L-012: no internal seams; banner sits above canvas
 *   - L-014: no italic em
 *
 * Only rendered for non-admin viewers (client + other roles) when isLocked=true.
 * Admin viewers never see this banner (they can still edit).
 */

import { useTranslations } from "next-intl";

type Props = {
  /** true = show banner; false = render nothing */
  isLocked: boolean;
};

export function LockedBanner({ isLocked }: Props) {
  const t = useTranslations("board.lock");

  if (!isLocked) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border border-border/40 bg-background rounded-md p-3 text-sm text-muted-foreground mb-3"
      style={{
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <span aria-hidden="true">🔒</span>
      <span className="font-suit keep-all">{t("banner_for_client")}</span>
    </div>
  );
}
