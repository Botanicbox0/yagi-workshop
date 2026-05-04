// Phase 5 Wave C C_5 — Cancelled / Archived banner (full styling).
//
// Per SPEC §"Cancelled / Archived banner":
//   - variant "cancelled": text + inline [새 의뢰 시작] link → /{locale}/app/projects/new
//   - variant "archived": text only, no link
//   - Sage subtle accent: 1px sage left-edge bar (border-l-2 style).
//   - Zero shadow. Does NOT block tab clicks (no fixed positioning).
//   - Renders above L1 breadcrumb, below the page wrapper padding.
//   - All tabs remain navigable for read-only inspection.
//
// Design compliance (yagi-design-system v1.0):
//   - Sage #71D083 at ~30% opacity via border-l-[3px] solid sage
//   - bg-sage-soft (rgba(113,208,131,0.18) light) for subtle tint
//   - No shadow. rounded-xl (softer than card-24 since it's a notice strip)
//   - text-sm, muted foreground, keep-all for Korean

import Link from "next/link";

type Props = {
  variant: "cancelled" | "archived";
  locale: string;
  labels: {
    cancelled: string;
    archived: string;
    cancelledLinkText?: string;
  };
};

export function CancelledArchivedBanner({ variant, locale, labels }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-start gap-0 overflow-hidden rounded-xl border border-border/40"
      style={{ borderLeft: "3px solid rgba(113,208,131,0.35)" }}
    >
      {/* Sage soft tint panel */}
      <div className="w-full px-5 py-3.5 bg-sage-soft">
        {variant === "cancelled" ? (
          <p className="text-sm text-muted-foreground keep-all">
            {labels.cancelled}{" "}
            <Link
              href={`/${locale}/app/projects/new`}
              className="inline font-medium text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity duration-[400ms]"
            >
              {labels.cancelledLinkText ?? "새 의뢰 시작"}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground keep-all">
            {labels.archived}
          </p>
        )}
      </div>
    </div>
  );
}
