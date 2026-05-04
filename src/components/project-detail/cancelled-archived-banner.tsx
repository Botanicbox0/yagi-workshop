// Phase 5 Wave C C_1 — Cancelled / Archived banner (placeholder).
//
// Per SPEC §"Cancelled / Archived banner": detail page entry checks
// status; if cancelled or archived, render this banner above the page
// content. The 5-tab structure below is still shown but treated as
// read-only.
//
// C_1 ships text-only placeholder copy. C_5 (parallel) wires the full
// styling (sage subtle border + design-system tokens) and the
// "[새 의뢰 시작]" link for the cancelled variant.

type Props = {
  variant: "cancelled" | "archived";
  labels: {
    cancelled: string;
    archived: string;
  };
};

export function CancelledArchivedBanner({ variant, labels }: Props) {
  const text = variant === "cancelled" ? labels.cancelled : labels.archived;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-border/40 px-4 py-3 mb-6 text-sm text-muted-foreground keep-all"
    >
      {text}
    </div>
  );
}
