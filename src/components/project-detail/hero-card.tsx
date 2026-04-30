// Phase 4.x task_04 — Hero card (1:1 cinematic 720x720) for the post-submit
// detail page. KICKOFF section task_04 spec:
//   - Pretendard 30 / 600 / lh 1.18 / ls -0.01em for the project name
//   - Pretendard 16 / 400 / lh 1.37 for the one-line description
//   - Mona12 12 / 700 status pill on sage-soft bg, radius 999
//   - cover image optional (dark placeholder when absent)
//   - radius 24 + zero shadow + border-border/40
//
// Phase 4.x does NOT introduce a cover_image column on projects; the
// hero stays text-first until that field lands. The design intentionally
// uses a flat dark surface so a future cover_image can drop in without
// re-designing the card.

type Status =
  | "draft"
  | "submitted"
  | "in_review"
  | "in_progress"
  | "in_revision"
  | "delivered"
  | "approved"
  | "cancelled"
  | "archived";

type Props = {
  title: string;
  description: string | null;
  status: string;
  statusLabel: string;
  bannerLine: string | null;
};

function isSubmitJustNow(status: string): boolean {
  // After a successful wizard submit, projects land at status='in_review'
  // (L-015 auto-transition from 'submitted'). The hero card surfaces a
  // calm reassurance line for this state -- KICKOFF section task_04
  // "Submit 직후 진입 시 banner".
  return status === "in_review" || status === "submitted" || status === "draft";
}

function statusPillClasses(status: string): string {
  // Single accent (sage) for the active in-flight states; achromatic
  // for everything else. Design system v1.0 single-accent rule.
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
  // cancelled / archived / draft -- muted
  return "bg-muted text-muted-foreground";
}

export function HeroCard({
  title,
  description,
  status,
  statusLabel,
  bannerLine,
}: Props) {
  const showBanner = bannerLine !== null && isSubmitJustNow(status);

  return (
    <div
      className="relative aspect-square w-full max-w-[720px] rounded-3xl border border-border/40 bg-card overflow-hidden"
      role="region"
      aria-label="Project hero card"
    >
      {/* Cover image placeholder slot -- Phase 4 = flat dark surface */}
      <div className="absolute inset-0 bg-gradient-to-br from-foreground/[0.02] to-foreground/[0.06]" />

      {/* Content overlay */}
      <div className="relative h-full flex flex-col justify-between p-8 md:p-10">
        {/* Top: status pill + (optional) banner */}
        <div className="flex flex-col gap-3">
          <span
            className={`inline-flex items-center self-start rounded-full px-3 py-1 text-xs font-bold tracking-[0.08em] uppercase ${statusPillClasses(status)}`}
            style={{ fontFamily: "Mona12, var(--font-pretendard), sans-serif" }}
          >
            {statusLabel}
          </span>
          {showBanner && (
            <p
              className="text-xs text-muted-foreground keep-all max-w-md leading-relaxed"
              role="status"
            >
              {bannerLine}
            </p>
          )}
        </div>

        {/* Bottom: title + description */}
        <div className="flex flex-col gap-3">
          <h1
            className="text-3xl md:text-[30px] font-semibold text-foreground keep-all"
            style={{ lineHeight: 1.18, letterSpacing: "-0.01em" }}
          >
            {title}
          </h1>
          {description && (
            <p
              className="text-base text-muted-foreground keep-all"
              style={{ lineHeight: 1.37 }}
            >
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export type { Status };
