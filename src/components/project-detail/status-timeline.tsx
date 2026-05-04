// Phase 5 Wave C C_2 — Status timeline (vertical stepper, 7 active states).
//
// Replaces the Phase 4.x horizontal pipeline component with a vertical
// stepper per SPEC §"Status wording (PRODUCT-MASTER §C.3 v1.2)".
//
// Design decisions:
// - in_revision is rendered as an inline badge on the in_progress step
//   (KICKOFF §C_2 ON_FAIL_LOOP loop 1 preferred pattern; avoids nested
//    sub-step which breaks timeline visual rhythm)
// - cancelled / archived are NOT in the timeline (those route to the
//   CancelledArchivedBanner already shipped in C_1)
// - Sage #71D083 only on the CURRENT step (dot + label bold)
// - Completed steps render with a check icon + muted foreground
// - Future steps render muted with no accent
// - Server component — no client interaction needed for C_2
//
// 7 timeline steps:
//   1. draft        — 작성 중 / Drafting
//   2. submitted    — 의뢰 접수 / Submitted
//   3. in_review    — 검토 중 / In review
//   4. in_progress  — 작업 진행 / In production  [in_revision badge if sub-state]
//   5. delivered    — 시안 도착 / Draft delivered
//   6. approved     — 승인 완료 / Approved (terminal)
//
// Design tokens (yagi-design-system v1.0):
// - sage #71D083 current step accent
// - border-border/40 for subtle borders
// - radius 24 (rounded-3xl) on container; 999 (rounded-full) on dots
// - zero shadow; Pretendard lh ~1.18 ls -0.01em

type StatusTimelineLabels = {
  draft: string;
  submitted: string;
  in_review: string;
  in_progress: string;
  in_revision: string;
  delivered: string;
  approved: string;
};

type Props = {
  status: string;
  labels: StatusTimelineLabels;
};

// Ordered list of the 7 timeline steps. in_revision maps to the same
// step index as in_progress (step 3, zero-based).
const TIMELINE_STEPS: Array<{ key: string; statusKeys: string[] }> = [
  { key: "draft", statusKeys: ["draft"] },
  { key: "submitted", statusKeys: ["submitted"] },
  { key: "in_review", statusKeys: ["in_review"] },
  { key: "in_progress", statusKeys: ["in_progress", "in_revision"] },
  { key: "delivered", statusKeys: ["delivered"] },
  { key: "approved", statusKeys: ["approved"] },
];

function deriveStepIndex(status: string): number {
  for (let i = 0; i < TIMELINE_STEPS.length; i++) {
    if (TIMELINE_STEPS[i].statusKeys.includes(status)) return i;
  }
  // cancelled / archived do not appear in timeline — return -1 sentinel.
  // Callers should not render this component for those statuses.
  return -1;
}

function CheckIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M1.5 5L4 7.5L8.5 2.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StatusTimeline({ status, labels }: Props) {
  const activeIndex = deriveStepIndex(status);
  const isInRevision = status === "in_revision";

  // For cancelled / archived: render nothing — the CancelledArchivedBanner
  // handles those. The parent page should not render StatusTimeline for
  // those statuses, but guard defensively.
  if (activeIndex === -1) return null;

  return (
    <nav aria-label="Project status timeline">
      <ol className="flex flex-col gap-0" role="list">
        {TIMELINE_STEPS.map((step, i) => {
          const isCurrent = i === activeIndex;
          const isCompleted = i < activeIndex;
          const isLast = i === TIMELINE_STEPS.length - 1;
          const label = labels[step.key as keyof StatusTimelineLabels];
          const showRevisionBadge = isCurrent && isInRevision;

          return (
            <li key={step.key} className="flex gap-3 min-w-0">
              {/* Left track — dot + connector line */}
              <div className="flex flex-col items-center shrink-0 w-5">
                {/* Dot */}
                <div
                  className={[
                    "flex items-center justify-center rounded-full shrink-0 mt-[2px]",
                    // Current: sage bg, white icon
                    isCurrent
                      ? "w-5 h-5 bg-[#71D083] text-black"
                      : // Completed: foreground bg, white checkmark
                      isCompleted
                      ? "w-5 h-5 bg-foreground/80 text-background"
                      : // Future: muted border, no fill
                        "w-3 h-3 mt-[5px] border border-border/40 bg-background",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-hidden="true"
                >
                  {isCurrent && (
                    <span className="block w-2 h-2 rounded-full bg-black/20" />
                  )}
                  {isCompleted && <CheckIcon />}
                </div>

                {/* Connector line (not on last item) */}
                {!isLast && (
                  <div
                    className={[
                      "flex-1 w-px my-1",
                      isCompleted
                        ? "bg-foreground/20"
                        : "bg-border/30",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-hidden="true"
                  />
                )}
              </div>

              {/* Right side — label + optional in_revision badge */}
              <div
                className={[
                  "flex-1 flex flex-col gap-1 pb-5",
                  isLast ? "pb-0" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={[
                      "text-sm leading-[1.18] tracking-[-0.01em] keep-all",
                      isCurrent
                        ? "font-semibold text-[#71D083]"
                        : isCompleted
                        ? "font-medium text-foreground/70"
                        : "font-normal text-muted-foreground/50",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {label}
                  </span>

                  {/* in_revision inline badge — only on in_progress step when
                      actual status is in_revision (current step) */}
                  {showRevisionBadge && (
                    <span
                      className="inline-flex items-center rounded-full border border-[#71D083]/30 bg-[#71D083]/8 px-2 py-0.5 text-[11px] font-medium text-[#71D083] tracking-[0.02em] keep-all"
                      aria-label={`(${labels.in_revision})`}
                    >
                      {labels.in_revision}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
