// Phase 4.x Wave C.5a sub_06 — /app/projects vertical card.
//
// Distinct grammar from dashboard's RfpRowCard (horizontal row). This
// vertical card sits in the projects list as a *selection surface*
// (one card = one project to open), so the title gets the most
// weight and the metadata reads as a quiet footer.
//
// Layout:
//   row 1 (top)    : title (left, 22px sb, ink primary)   |   status pill (right)
//   spacer 24px
//   row 2 (bottom) : date (right, 12px, ink tertiary)
//
// Design v1.0 tokens:
//   container: bg.card-deep + border.subtle + radius 24 + zero shadow
//   hover    : bg.card (slightly elevated, opacity step)
//   sage     : ONLY when status === "in_review" (pending YAGI response)
//              everything else stays achromatic per the v1.0 sage-discipline
//              rule (the 5-stage timeline at /app/projects/[id] uses the
//              same single-accent grammar).

import Link from "next/link";

type Props = {
  href: string;
  title: string;
  status: string;
  statusLabel: string;
  dateLabel: string;
};

function statusPillClass(status: string): string {
  // Sole sage callout for the active "review pending" state. Everything
  // else collapses to neutral so the page reads as a calm grid where
  // the single highlighted card is the one waiting on YAGI.
  if (status === "in_review") {
    return "bg-[#71D083]/[0.12] text-[#71D083]";
  }
  if (
    status === "in_progress" ||
    status === "in_revision" ||
    status === "delivered" ||
    status === "approved"
  ) {
    return "bg-foreground/[0.06] text-foreground";
  }
  if (
    status === "draft" ||
    status === "archived" ||
    status === "cancelled"
  ) {
    return "bg-foreground/[0.04] text-muted-foreground";
  }
  // submitted / proposal / routing fall here — quiet secondary tone.
  return "bg-foreground/[0.04] text-muted-foreground";
}

export function ProjectListCard({
  href,
  title,
  status,
  statusLabel,
  dateLabel,
}: Props) {
  return (
    <Link
      href={href as `/app/projects/${string}`}
      className="group block rounded-3xl border border-border/40 bg-foreground/[0.02] p-6 transition-colors hover:bg-foreground/[0.05]"
    >
      <div className="flex items-start justify-between gap-4">
        <h3
          className="min-w-0 flex-1 truncate text-[22px] font-semibold text-foreground keep-all"
          style={{ letterSpacing: "-0.02em", lineHeight: 1.2 }}
        >
          {title}
        </h3>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.04em] ${statusPillClass(
            status
          )}`}
        >
          {statusLabel}
        </span>
      </div>
      <div className="mt-6 flex justify-end">
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {dateLabel}
        </span>
      </div>
    </Link>
  );
}
