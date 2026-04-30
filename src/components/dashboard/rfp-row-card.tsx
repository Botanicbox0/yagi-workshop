// Phase 4.x task_05 — RFP row card (one entry in the recent-RFPs list).
//
// Each row displays:
//   - project name + one-line description (or fallback)
//   - status pill (sage 71D083 single accent on in-flight states)
//   - 의뢰 일자 (created_at) + 예산 + Twin intent
//
// The row is a Link to /app/projects/[id] (full detail page).
//
// Design v1.0: radius 24 + border-border/40 + zero shadow + hover
// state via subtle background tint.

import Link from "next/link";

type TwinIntent = "undecided" | "specific_in_mind" | "no_twin";

type Props = {
  href: string;
  title: string;
  description: string | null;
  status: string;
  statusLabel: string;
  createdAtFormatted: string;
  budgetLabel: string;
  twinIntentLabel: string | null;
  separator: string;
};

function statusPillClass(status: string): string {
  if (
    status === "in_review" ||
    status === "submitted" ||
    status === "in_progress" ||
    status === "in_revision"
  ) {
    return "bg-[#71D083]/15 text-[#71D083]";
  }
  if (status === "delivered" || status === "approved") {
    return "bg-foreground/10 text-foreground";
  }
  return "bg-muted text-muted-foreground";
}

export function RfpRowCard({
  href,
  title,
  description,
  status,
  statusLabel,
  createdAtFormatted,
  budgetLabel,
  twinIntentLabel,
  separator,
}: Props) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-border/40 px-6 py-5 hover:bg-foreground/[0.02] transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-medium text-foreground keep-all truncate">
            {title}
          </h3>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground keep-all line-clamp-1">
              {description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground keep-all">
            <span>{createdAtFormatted}</span>
            <span className="mx-1.5 text-muted-foreground/60">{separator}</span>
            <span>{budgetLabel}</span>
            {twinIntentLabel && (
              <>
                <span className="mx-1.5 text-muted-foreground/60">{separator}</span>
                <span>{twinIntentLabel}</span>
              </>
            )}
          </p>
        </div>
        <span
          className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold tracking-[0.08em] uppercase ${statusPillClass(status)}`}
          style={{ fontFamily: "Mona12, var(--font-pretendard), sans-serif" }}
        >
          {statusLabel}
        </span>
      </div>
    </Link>
  );
}

export type { TwinIntent };
