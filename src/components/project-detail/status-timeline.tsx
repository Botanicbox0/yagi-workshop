// Phase 4.x task_04 — Status timeline (5 visual stages, horizontal).
//
// NOTE: There is an older src/components/projects/status-timeline.tsx that
// renders the per-row project_status_history vertical view. This component
// is different: it's the post-submit "pipeline ribbon" that sits at the
// top of /app/projects/[id], summarising the 5 conceptual stages of a
// commission. The two coexist on purpose.
//
// Stage mapping to the existing 9-state projects.status CHECK constraint
// (Phase 3.0 baseline; Phase 4.x does NOT add new statuses):
//
//   1. 검토   ← status in {draft, submitted, in_review}
//   2. 라우팅 ← (no current status maps here -- inactive slot)
//   3. 진행   ← status in {in_progress, in_revision}
//   4. 시안   ← (Phase 5+ approval_pending slot -- inactive)
//   5. 납품   ← status in {delivered, approved}
//
// The 라우팅 / 시안 slots are visible but never marked active in Phase 4
// because their states do not exist on projects.status yet. That's
// intentional per KICKOFF section task_04 spec ("시안 slot 잡아둠" + Phase 5+
// follow-up). The cancelled / archived statuses do not advance the bar
// visually -- the last reached active stage stays highlighted and the
// pill on the hero card surfaces the actual cancelled/archived state.
//
// Design v1.0:
// - Pretendard, lh 1.18 / 1.37, ls -0.01em / 0
// - achromatic + sage #71D083 accent (current stage only)
// - radius 999 on dots, hairline connectors via border-border/40
// - zero shadow
// - Mobile (<= sm): connectors collapse to a vertical layout

type Props = {
  status: string;
  labels: {
    review: string;
    routing: string;
    progress: string;
    proposal: string;
    delivered: string;
  };
};

type StageKey = "review" | "routing" | "progress" | "proposal" | "delivered";

const STAGE_ORDER: StageKey[] = [
  "review",
  "routing",
  "progress",
  "proposal",
  "delivered",
];

function deriveActiveIndex(status: string): number {
  if (status === "draft" || status === "submitted" || status === "in_review") {
    return 0; // 검토
  }
  if (status === "in_progress" || status === "in_revision") {
    return 2; // 진행
  }
  if (status === "delivered" || status === "approved") {
    return 4; // 납품
  }
  // cancelled / archived: do not advance the timeline. Anchor at 검토
  // (the hero card status pill already surfaces the actual state).
  return 0;
}

export function StatusTimeline({ status, labels }: Props) {
  const activeIndex = deriveActiveIndex(status);

  return (
    <ol
      className="flex flex-col sm:flex-row gap-3 sm:gap-0 sm:items-center w-full"
      role="list"
      aria-label="Status timeline"
    >
      {STAGE_ORDER.map((key, i) => {
        const isActive = i === activeIndex;
        const isPassed = i < activeIndex;
        const label = labels[key];
        const isLast = i === STAGE_ORDER.length - 1;
        // Slots without a real status mapping (라우팅 i=1, 시안 i=3)
        // are always rendered but never "passed" or "active" until their
        // states exist. They stay neutral.
        const isSlotOnly = key === "routing" || key === "proposal";
        const dotClassName = isActive && !isSlotOnly
          ? "bg-[#71D083]"
          : isPassed && !isSlotOnly
          ? "bg-foreground"
          : "bg-border";
        const labelClassName = isActive && !isSlotOnly
          ? "text-foreground font-medium"
          : isPassed && !isSlotOnly
          ? "text-foreground"
          : "text-muted-foreground";

        return (
          <li
            key={key}
            className="flex sm:flex-1 items-center gap-3 sm:gap-2 min-w-0"
          >
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`block h-2 w-2 rounded-full ${dotClassName}`}
                aria-hidden="true"
              />
              <span
                className={`text-xs uppercase tracking-[0.10em] ${labelClassName} keep-all`}
              >
                {label}
              </span>
            </div>
            {!isLast && (
              <span
                className="hidden sm:block flex-1 border-t border-border/40 mx-2"
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
