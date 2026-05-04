// Phase 5 Wave C C_2 + HF1_2 — Status timeline (vertical stepper, visual lift).
//
// Replaces the Phase 4.x horizontal pipeline component with a vertical
// stepper per SPEC §"Status wording (PRODUCT-MASTER §C.3 v1.2)".
// HF1_2 (2026-05-05) visual lift applied inline at lead-merge time
// because the parallel agent's worktree branched from a stale Phase 4.x
// base; their full-file rewrite was incompatible with C_2's prop
// contract. The visual-lift intent is preserved here.
//
// HF1_2 visual lift (per .yagi-autobuild/phase-5-wc-hf1/SPEC.md §HF1.2):
// - current dot adds ring-2 ring-[#71D083]/25 (subtle sage halo)
// - current label weight = font-medium (was font-semibold — slightly
//   lighter per spec "살짝 두껍게")
// - upcoming label = text-foreground/55 (was muted-foreground/50 —
//   slightly stronger per spec)
// - 4-variant connector:
//     completed↔completed → bg-foreground/60 (was foreground/20 — clearer)
//     completed↔current   → sage gradient half-fill (top sage, bottom muted)
//     current↔upcoming    → bg-border/40 (was /30 — slightly stronger)
//     upcoming↔upcoming   → bg-border/30 (unchanged)
// - in_revision still inline badge on in_progress step
// - cancelled/archived → CancelledArchivedBanner (out of timeline)
// - sage accent ONLY (no new colors)
// - zero pulse, zero shadow (calm tone)
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
// - sage #71D083 current step accent + ring + gradient connector
// - border-border/40 + foreground/60 for subtle borders
// - radius 999 (rounded-full) on dots
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
                    // Current: sage bg + halo ring (HF1_2 visual lift)
                    isCurrent
                      ? "w-5 h-5 bg-[#71D083] text-black ring-2 ring-[#71D083]/25"
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

                {/* Connector line (not on last item) — HF1_2 4-variant.
                    The connector links step i and step i+1; pick the
                    variant from the relative position to activeIndex. */}
                {!isLast && (() => {
                  const nextIsCurrent = i + 1 === activeIndex;
                  const bothCompleted = i + 1 < activeIndex;
                  const fromCurrent = i === activeIndex;
                  if (bothCompleted) {
                    return (
                      <div
                        className="flex-1 w-px my-1 bg-foreground/60"
                        aria-hidden="true"
                      />
                    );
                  }
                  if (nextIsCurrent) {
                    // sage half-fill: top half sage, bottom half muted
                    return (
                      <div
                        className="flex-1 w-px my-1 bg-gradient-to-b from-[#71D083] to-border/40"
                        aria-hidden="true"
                      />
                    );
                  }
                  if (fromCurrent) {
                    return (
                      <div
                        className="flex-1 w-px my-1 bg-border/40"
                        aria-hidden="true"
                      />
                    );
                  }
                  // upcoming↔upcoming
                  return (
                    <div
                      className="flex-1 w-px my-1 bg-border/30"
                      aria-hidden="true"
                    />
                  );
                })()}
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
                        ? "font-medium text-[#71D083]"
                        : isCompleted
                        ? "font-medium text-foreground/70"
                        : "font-normal text-foreground/55",
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
