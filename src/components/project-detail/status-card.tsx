"use client";

// =============================================================================
// Phase 5 Wave C Hotfix-1 HF1_1 — Status card redesign (submitted status).
//
// For submitted status: rich content card with title, body, 3 meta rows,
// and dual CTA ([브리프 전체 보기 →] primary sage + [의뢰 회수 후 수정] secondary).
//
// For all other statuses: delegates to the existing NextActionCTA helper-text
// behavior (passes through unchanged — no regression).
//
// Design system tokens (yagi-design-system v1.0):
//   primary CTA: bg #71D083 / text black / rounded-full / px-6 py-2.5
//   secondary CTA: outline border-border/40 / text foreground / hover:text-[#71D083]
//   zero shadow / near-invisible border / 24px card radius
//
// HF1_3 dependency note:
//   RecallButton is imported here (secondary slot). HF1_3 only needs to
//   remove the duplicate caller in page.tsx (the `mb-6 flex justify-end` div).
// =============================================================================

import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RecallButton } from "@/app/[locale]/app/projects/[id]/recall-button";
import {
  NextActionCTA,
  type MaterialAppendModalLabels,
} from "./next-action-cta";

type MetaRow = {
  label: string;
  value: string;
};

type StatusCardProps = {
  status: string;
  isOwner: boolean;
  projectId: string;
  locale: string;
  // Forwarded to NextActionCTA for non-submitted statuses
  ctaLabels: {
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
};

export function StatusCard({
  status,
  isOwner,
  projectId,
  locale,
  ctaLabels,
}: StatusCardProps) {
  const t = useTranslations("project_detail.status.card");
  const router = useRouter();

  // For non-submitted statuses, fall back to existing NextActionCTA behavior.
  if (status !== "submitted") {
    return (
      <NextActionCTA
        projectId={projectId}
        status={status}
        isOwner={isOwner}
        locale={locale}
        labels={ctaLabels}
      />
    );
  }

  // submitted — non-owner viewers see nothing (NextActionCTA returns null for
  // non-owners too; match that behavior for consistency).
  if (!isOwner) return null;

  const metaRows: MetaRow[] = [
    {
      label: t("meta.expected_response.label"),
      value: t("meta.expected_response.value"),
    },
    {
      label: t("meta.next_step.label"),
      value: t("meta.next_step.submitted"),
    },
    {
      label: t("meta.team.label"),
      value: t("meta.team.value"),
    },
  ];

  const handleViewBrief = () => {
    // @/i18n/routing useRouter auto-prepends the active locale
    router.push(`/app/projects/${projectId}?tab=brief`);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Title + body */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-base font-semibold keep-all leading-snug">
          {t("submitted.title")}
        </h3>
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {t("submitted.body")}
        </p>
      </div>

      {/* Meta rows: label : value */}
      <dl className="flex flex-col gap-2">
        {metaRows.map((row) => (
          <div key={row.label} className="flex gap-3 text-sm">
            <dt className="shrink-0 w-[7.5rem] text-muted-foreground/70 keep-all">
              {row.label}
            </dt>
            <dd className="text-foreground keep-all">{row.value}</dd>
          </div>
        ))}
      </dl>

      {/* Dual CTA row — primary sage + secondary outline */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {/* Primary: sage solid bg, text black */}
        <Button
          type="button"
          onClick={handleViewBrief}
          className="rounded-full bg-[#71D083] text-black hover:bg-[#71D083]/90 hover:brightness-105 transition-all duration-[400ms] px-6 py-2.5 text-sm font-medium border-0 shadow-none"
        >
          {t("cta.view_full_brief")}
        </Button>

        {/* Secondary: outline, hover text sage — RecallButton owns the
            AlertDialog confirm flow. HF1_3 removes the duplicate caller in
            page.tsx once this slot is confirmed active. */}
        <RecallButton projectId={projectId} />
      </div>
    </div>
  );
}
