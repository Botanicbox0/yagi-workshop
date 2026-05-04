// Phase 5 Wave C C_1 — 현황 (status) tab skeleton.
//
// 5 sub-section placeholders per SPEC §"현황 tab 콘텐츠":
//   1. Status timeline (vertical stepper) — ships in C_2
//   2. Next action CTA — ships in C_3
//   3. Brief 요약 카드 — ships in C_3
//   4. 첨부자료 요약 (top-3 thumbnail strip) — ships in C_3
//   5. 야기 코멘트 thread placeholder — kept as placeholder; FU-Phase5-10
//
// C_1 ships only the layout skeleton with empty boxes. The boxes carry
// the future section heading text so the eventual implementations slot
// in without a reflow. Each box uses the design-system subtle border
// (rgba(255,255,255,0.11) via border/40) + 24px radius. Zero shadow.
//
// Server component (no client-side interaction in C_1).

type Props = {
  labels: {
    sectionTimeline: string;
    sectionCta: string;
    sectionBrief: string;
    sectionAttachments: string;
    sectionComments: string;
    placeholderTimeline: string;
    placeholderCta: string;
    placeholderBrief: string;
    placeholderAttachments: string;
    placeholderComments: string;
  };
};

export function StatusTab({ labels }: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Left column — timeline (C_2 fills) */}
      <SkeletonBlock
        title={labels.sectionTimeline}
        helper={labels.placeholderTimeline}
        className="md:row-span-3 md:min-h-[420px]"
      />

      {/* Right column — top: CTA (C_3) */}
      <SkeletonBlock
        title={labels.sectionCta}
        helper={labels.placeholderCta}
      />

      {/* Right column — middle: Brief summary card (C_3) */}
      <SkeletonBlock
        title={labels.sectionBrief}
        helper={labels.placeholderBrief}
      />

      {/* Right column — middle: Attachment summary (C_3) */}
      <SkeletonBlock
        title={labels.sectionAttachments}
        helper={labels.placeholderAttachments}
      />

      {/* Right column — bottom: Comments placeholder (FU-Phase5-10) */}
      <SkeletonBlock
        title={labels.sectionComments}
        helper={labels.placeholderComments}
      />
    </div>
  );
}

function SkeletonBlock({
  title,
  helper,
  className,
}: {
  title: string;
  helper: string;
  className?: string;
}) {
  return (
    <section
      className={[
        "rounded-3xl border border-border/40 p-6 bg-background",
        "flex flex-col gap-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground/70 leading-relaxed keep-all">
        {helper}
      </p>
    </section>
  );
}
