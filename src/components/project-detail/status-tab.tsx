// Phase 5 Wave C Hotfix-2 HF2_1 — 현황 (status) tab — 12-col grid layout.
//
// Hotfix-2 reorganized the entire detail page so that page.tsx renders only
// Breadcrumb → Tabs → Tab content → Admin actions. The status tab now
// owns the full information architecture per PRODUCT-MASTER §C.4 v1.2:
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ [status pill] (top, full width)                              │
//   ├──────────┬─────────────────────────────────┬─────────────────┤
//   │ Timeline │ Status card (HF1.1 result)      │ InfoRail        │
//   │ col-2    │ col-7                           │ col-3 sticky    │
//   │ sticky   │                                 │                 │
//   ├──────────┴─────────────────────────────────┴─────────────────┤
//   │ Brief summary  ·  Attachment summary  ·  Comments thread     │
//   │ (3-col bottom row, full width)                               │
//   └──────────────────────────────────────────────────────────────┘
//
// Mobile (< md): single column stack (status pill → status-card → timeline →
// InfoRail → 3 bottom cards). Vertical timeline already mobile-friendly so
// no horizontal variant needed (FU-Phase5-24 if browser smoke flags).
//
// Other tabs (브리프 / 보드 / 코멘트 / 결과물) render full-width content;
// timeline + InfoRail are status-tab-only per H2D3.

import Link from "next/link";
import { StatusTimeline } from "./status-timeline";
import { type MaterialAppendModalLabels } from "./next-action-cta";
import { StatusCard } from "./status-card";
import { BriefSummaryCard } from "./brief-summary-card";
import {
  AttachmentSummary,
  type AttachmentItem,
} from "./attachment-summary";
import { InfoRail, type TwinIntent } from "./info-rail";

function statusPillClasses(status: string): string {
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

type Props = {
  status: string;
  statusLabel: string;
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
  // InfoRail inputs (HF2_1: was in page.tsx L3, now lives inside status tab)
  createdAt: string;
  budgetBand: string | null;
  targetDeliveryAt: string | null;
  twinIntent: TwinIntent | null;
  meetingPreferredAt: string | null;
  // Locale narrowed for InfoRail (which needs "ko" | "en")
  localeNarrow: "ko" | "en";
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
      cta_brief: string;
      deliverable_options: Record<string, string>;
    };
    attachments: {
      section_heading: string;
      count_brief: (n: number) => string;
      count_reference: (n: number) => string;
      view_all: string;
      cta_attachments: string;
      empty: string;
    };
    comments_placeholder: string;
    comments_section_heading: string;
    comments_cta: string;
    infoRail: {
      section: string;
      submittedOn: string;
      budget: string;
      delivery: string;
      deliveryNegotiable: string;
      twinIntent: string;
      meeting: string;
      meetingNone: string;
      notSet: string;
      budgetMap: Record<string, string>;
      twinIntentMap: Record<TwinIntent, string>;
    };
  };
};

export function StatusTab({
  status,
  statusLabel,
  isOwner,
  projectId,
  locale,
  title,
  deliverableTypes,
  description,
  briefCount,
  referenceCount,
  topThree,
  createdAt,
  budgetBand,
  targetDeliveryAt,
  twinIntent,
  meetingPreferredAt,
  localeNarrow,
  labels,
}: Props) {
  return (
    <div className="flex flex-col gap-8">
      {/* Top: status pill (full width) */}
      <div>
        <span
          className={[
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-[0.02em] keep-all",
            statusPillClasses(status),
          ].join(" ")}
        >
          {statusLabel}
        </span>
      </div>

      {/* Top row: 12-col grid — timeline / status card / InfoRail.
          Mobile: stacks status-card → timeline → InfoRail. */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Timeline (md+: col-span-2 sticky left). On mobile, renders below
            the status card so the user sees the primary action first. */}
        <aside className="md:col-span-2 order-2 md:order-1">
          <div className="md:sticky md:top-6">
            <StatusTimeline status={status} labels={labels.timeline} />
          </div>
        </aside>

        {/* Status card (md+: col-span-7 main). On mobile: order-1 (top). */}
        <section className="md:col-span-7 order-1 md:order-2 rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-3">
          <StatusCard
            status={status}
            isOwner={isOwner}
            projectId={projectId}
            locale={locale}
            ctaLabels={labels.cta}
          />
        </section>

        {/* InfoRail (md+: col-span-3 sticky right). On mobile: bottom of top row. */}
        <aside className="md:col-span-3 order-3">
          <div className="md:sticky md:top-6">
            <InfoRail
              createdAt={createdAt}
              budgetBand={budgetBand}
              targetDeliveryAt={targetDeliveryAt}
              twinIntent={twinIntent}
              meetingPreferredAt={meetingPreferredAt}
              locale={localeNarrow}
              labels={labels.infoRail}
            />
          </div>
        </aside>
      </div>

      {/* Bottom row: 3-card grid (brief summary / attachment summary / comments). */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BriefSummaryCard
          projectId={projectId}
          locale={locale}
          title={title}
          deliverableTypes={deliverableTypes}
          description={description}
          labels={labels.brief}
        />

        <AttachmentSummary
          briefCount={briefCount}
          referenceCount={referenceCount}
          topThree={topThree}
          labels={labels.attachments}
        />

        {/* Comments placeholder (FU-Phase5-10) */}
        <section className="rounded-3xl border border-border/40 p-6 lg:p-8 bg-background flex flex-col gap-3">
          <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground keep-all">
            {labels.comments_section_heading}
          </h3>
          <p className="text-sm text-muted-foreground/70 leading-relaxed keep-all">
            {labels.comments_placeholder}
          </p>
          <div className="pt-1">
            <Link
              href="?tab=comments"
              scroll={false}
              className="text-xs font-medium text-foreground/70 underline-offset-4 hover:underline transition-colors keep-all"
            >
              {labels.comments_cta}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
