"use client";

// =============================================================================
// Phase 5 Wave C C_3 — Next-action CTA matrix (status-keyed).
//
// Renders 1–2 CTAs per status per SPEC §"Next action CTA":
//   draft         → primary [브리프 완성하기 →] (Link to /projects/new?project=...)
//   submitted     → 0 CTA, helper text only
//   in_review     → [자료 추가하기]  → opens MaterialAppendModal (kind selector)
//   in_progress   → disabled placeholder [코멘트 작성]    (FU-Phase5-10)
//   in_revision   → disabled placeholder [수정 의견 코멘트] (FU-Phase5-10)
//   delivered     → primary [시안 보기 →] → "준비 중" placeholder modal (FU-Phase5-15)
//   approved      → disabled placeholder [프로젝트 평가하기] (FU-Phase5-15)
//   cancelled / archived → no CTA (banner above the page handles those)
//
// Server actions:
//   - approveDeliveredAction / requestRevisionAction live in
//     src/app/[locale]/app/projects/[id]/cta-actions.ts but are wired
//     through the "준비 중" placeholder for delivered today (UI surface
//     ships in Phase 6+ per SPEC). The data layer is verifiable via
//     devtools per SPEC §"Verification" steps 10–11.
//   - in_review append form ships here via MaterialAppendModal.
// =============================================================================

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MaterialAppendModal } from "./material-append-modal";

type Props = {
  projectId: string;
  status: string;
  isOwner: boolean;
  locale: string;
  labels: {
    cta_draft: string;
    cta_in_review: string;
    cta_in_progress: string;
    cta_in_revision: string;
    cta_delivered: string;
    cta_approved: string;
    empty_state_submitted: string;
    delivered_placeholder: string;
    // MaterialAppendModal labels (passed-through)
    modal: MaterialAppendModalLabels;
  };
};

export type MaterialAppendModalLabels = {
  trigger: string;
  title: string;
  description: string;
  kindLabel: string;
  kindBrief: string;
  kindReference: string;
  sourceLabel: string;
  sourceUpload: string;
  sourceUrl: string;
  fileLabel: string;
  urlLabel: string;
  urlPlaceholder: string;
  cancel: string;
  submit: string;
  successToast: string;
  errorForbidden: string;
  errorRlsPending: string;
  errorUnknown: string;
};

export function NextActionCTA({
  projectId,
  status,
  isOwner,
  locale,
  labels,
}: Props) {
  const [showDeliveredPlaceholder, setShowDeliveredPlaceholder] =
    useState(false);

  // Banner-status (cancelled / archived) handled by the page-level banner;
  // render nothing here.
  if (status === "cancelled" || status === "archived") return null;

  // Non-owner viewers (yagi_admin / workspace_admin) see a hint instead of
  // the client-only CTAs. Admin-side actions live in ProjectActionButtons.
  if (!isOwner) return null;

  if (status === "draft") {
    return (
      <Link
        href={`/${locale}/app/projects/new?project=${projectId}`}
        className="inline-flex items-center justify-center rounded-full bg-[#71D083] text-black px-6 py-2.5 text-sm font-medium hover:brightness-105 transition-all duration-[400ms] keep-all"
      >
        {labels.cta_draft}
      </Link>
    );
  }

  if (status === "submitted") {
    return (
      <p className="text-sm text-muted-foreground keep-all leading-relaxed">
        {labels.empty_state_submitted}
      </p>
    );
  }

  if (status === "in_review") {
    return (
      <MaterialAppendModal
        projectId={projectId}
        labels={labels.modal}
      />
    );
  }

  if (status === "in_progress") {
    return (
      <DisabledCta label={labels.cta_in_progress} hint="Phase 5+" />
    );
  }

  if (status === "in_revision") {
    return (
      <DisabledCta label={labels.cta_in_revision} hint="Phase 5+" />
    );
  }

  if (status === "delivered") {
    return (
      <>
        <Button
          type="button"
          onClick={() => setShowDeliveredPlaceholder(true)}
          className="rounded-full bg-[#71D083] text-black px-6 py-2.5 text-sm font-medium hover:brightness-105 transition-all duration-[400ms]"
        >
          {labels.cta_delivered}
        </Button>
        {showDeliveredPlaceholder && (
          // Click-outside the button text to dismiss; minimal modal.
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowDeliveredPlaceholder(false)}
          >
            <div
              className="rounded-3xl border border-border/40 bg-background p-8 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-sm text-muted-foreground keep-all leading-relaxed">
                {labels.delivered_placeholder}
              </p>
              <div className="mt-6 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeliveredPlaceholder(false)}
                >
                  OK
                </Button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (status === "approved") {
    return (
      <DisabledCta label={labels.cta_approved} hint="Phase 6+" />
    );
  }

  return null;
}

function DisabledCta({ label, hint }: { label: string; hint: string }) {
  return (
    <span
      role="button"
      aria-disabled="true"
      className="inline-flex items-center gap-2 rounded-full border border-border/40 px-5 py-2 text-sm text-muted-foreground/70 cursor-not-allowed keep-all"
    >
      {label}
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/50">
        {hint}
      </span>
    </span>
  );
}
