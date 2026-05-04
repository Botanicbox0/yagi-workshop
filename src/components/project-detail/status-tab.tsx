// Phase 5 Wave C C_3 — 현황 (status) tab full content.
//
// Replaces the C_1 skeleton placeholders with the 5 real sub-sections
// per SPEC §"현황 tab 콘텐츠":
//   1. Status timeline (vertical stepper, left column)
//   2. Next action CTA (right column top, status-keyed)
//   3. Brief 요약 카드 (right column middle)
//   4. 첨부자료 요약 (right column middle)
//   5. 야기 코멘트 thread placeholder (right column bottom — FU-Phase5-10)
//
// All five sub-sections receive their own props from page.tsx so this
// tab is a pure-composition server component (NextActionCTA + the modal
// inside it are the only "use client" descendants).

import { StatusTimeline } from "./status-timeline";
import { type MaterialAppendModalLabels } from "./next-action-cta";
import { StatusCard } from "./status-card";
import { BriefSummaryCard } from "./brief-summary-card";
import {
  AttachmentSummary,
  type AttachmentItem,
} from "./attachment-summary";

type Props = {
  status: string;
  isOwner: boolean;
  projectId: string;
  locale: string;
  // Stage 1 brief summary inputs
  title: string;
  deliverableTypes: string[];
  description: string | null;
  // Attachment summary inputs
  briefCount: number;
  referenceCount: number;
  topThree: AttachmentItem[];
  // i18n labels
  labels: {
    timeline: {
      draft: string;
      submitted: string;
      in_review: string;
      in_progress: string;
      in_revision: string;
      delivered: string;
      approved: string;
    };
    cta: {
      cta_draft: string;
      cta_in_review: string;
      cta_in_progress: string;
      cta_in_revision: string;
      cta_delivered: string;
      cta_approved: string;
      empty_state_submitted: string;
      delivered_placeholder: string;
      modal: MaterialAppendModalLabels;
    };
    brief: {
      deliverable_types: string;
      description: string;
      view_all: string;
      deliverable_options: Record<string, string>;
    };
    attachments: {
      section_heading: string;
      count_brief: (n: number) => string;
      count_reference: (n: number) => string;
      view_all: string;
      empty: string;
    };
    comments_placeholder: string;
    comments_section_heading: string;
  };
};

export function StatusTab({
  status,
  isOwner,
  projectId,
  locale,
  title,
  deliverableTypes,
  description,
  briefCount,
  referenceCount,
  topThree,
  labels,
}: Props) {
  return (
    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
      {/* Left column — vertical status timeline (full height) */}
      <div className="md:row-span-4">
        <StatusTimeline status={status} labels={labels.timeline} />
      </div>

      {/* Right column 1: Status card (submitted = rich content + dual CTA;
          other statuses = NextActionCTA helper-text passthrough via StatusCard) */}
      <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-3">
        <StatusCard
          status={status}
          isOwner={isOwner}
          projectId={projectId}
          locale={locale}
          ctaLabels={labels.cta}
        />
      </section>

      {/* Right column 2: Brief 요약 카드 */}
      <BriefSummaryCard
        projectId={projectId}
        locale={locale}
        title={title}
        deliverableTypes={deliverableTypes}
        description={description}
        labels={labels.brief}
      />

      {/* Right column 3: 첨부자료 요약 */}
      <AttachmentSummary
        briefCount={briefCount}
        referenceCount={referenceCount}
        topThree={topThree}
        labels={labels.attachments}
      />

      {/* Right column 4: 야기 코멘트 thread placeholder (FU-Phase5-10) */}
      <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
          {labels.comments_section_heading}
        </h3>
        <p className="text-sm text-muted-foreground/70 leading-relaxed keep-all">
          {labels.comments_placeholder}
        </p>
      </section>
    </div>
  );
}
