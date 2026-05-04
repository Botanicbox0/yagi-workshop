"use client";

// =============================================================================
// Phase 5 Wave C Hotfix-2 HF2_2 — Status card + ••• dropdown menu
//
// For submitted status: rich content card with title, body, 3 meta rows,
// and a CTA row:
//   [브리프 전체 보기 →] (primary sage)  ...  [⋯] (ghost icon dropdown)
//
// For in_review status: wraps NextActionCTA's material-append CTA with an
// additional [⋯] dropdown trigger at the end of the CTA row.
//
// For all other statuses: delegates to the existing NextActionCTA behavior
// unchanged (no regression).
//
// Dropdown items (submitted + in_review, isOwner only):
//   - [의뢰 회수 후 수정]  → opens RecallButton's AlertDialog (approach b:
//       open state is lifted into StatusCard and passed to RecallButton as
//       optional controlled props; RecallButton renders no visible trigger
//       when controlled externally).
//   - [의뢰 삭제]         → opens a delete AlertDialog → calls
//       deleteProjectAction → toast + router.push to /app/projects on
//       success, toast.error on failure.
//
// ⚠️ i18n keys in this component are HARDCODED KO strings for HF2_2.
// HF2_3 will replace them with t("project_detail.status.card.dropdown.X")
// lookups — see task spec §"HF2_2 i18n note".
//
// Design tokens (yagi-design-system v1.0):
//   dropdown trigger: Button variant="ghost" size="icon" (ghost pattern)
//   delete confirm action: bg-destructive/90 + border-0 shadow-none
//   cancel: outline
//   sage CTAs preserved from HF1_1
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RecallButton } from "@/app/[locale]/app/projects/[id]/recall-button";
import { deleteProjectAction } from "@/app/[locale]/app/projects/[id]/delete-actions";
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

// ---------------------------------------------------------------------------
// Sub-component: MoreActionsDropdown
//
// Renders the (•••) ghost icon button + dropdown + recall AlertDialog +
// delete AlertDialog. Used by both the submitted and in_review card layouts.
// ---------------------------------------------------------------------------

function MoreActionsDropdown({
  projectId,
}: {
  projectId: string;
}) {
  const router = useRouter();
  const [recallOpen, setRecallOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  const handleDeleteConfirm = () => {
    setDeleteOpen(false);
    startDeleteTransition(async () => {
      const result = await deleteProjectAction({ projectId });
      if (!result.ok) {
        // Map error enum to toast message (hardcoded KO — HF2_3 replaces)
        const msg =
          result.error === "forbidden_owner"
            ? "본인의 의뢰만 삭제할 수 있어요."
            : result.error === "forbidden_status"
              ? "이 단계의 의뢰는 삭제할 수 없어요."
              : result.error === "not_found"
                ? "의뢰를 찾을 수 없어요."
                : result.error === "unauthenticated"
                  ? "로그인이 필요해요."
                  : "삭제 중 오류가 발생했어요. 다시 시도해 주세요.";
        toast.error(msg);
        return;
      }
      toast.success("의뢰가 삭제되었어요.");
      router.push("/app/projects");
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="더 보기"
            className="h-9 w-9 shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* Recall item — opens RecallButton's controlled AlertDialog */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setRecallOpen(true);
            }}
          >
            의뢰 회수 후 수정
          </DropdownMenuItem>
          {/* Delete item — opens delete confirmation AlertDialog */}
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setDeleteOpen(true);
            }}
            className="text-destructive focus:text-destructive"
          >
            의뢰 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Recall AlertDialog — controlled by RecallButton via open/onOpenChange */}
      <RecallButton
        projectId={projectId}
        open={recallOpen}
        onOpenChange={setRecallOpen}
      />

      {/* Delete confirmation AlertDialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="keep-all">
              이 의뢰를 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription className="keep-all leading-relaxed">
              삭제된 의뢰는 복구할 수 없어요. 의뢰 내용과 첨부 파일이 모두
              사라져요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deletePending}
              className="bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-400/40 border-0 shadow-none"
            >
              {deletePending ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// StatusCard — main export
// ---------------------------------------------------------------------------

export function StatusCard({
  status,
  isOwner,
  projectId,
  locale,
  ctaLabels,
}: StatusCardProps) {
  const t = useTranslations("project_detail.status.card");
  const router = useRouter();

  // Dropdown is gated on owner + recall-window status
  const showDropdown =
    isOwner && (status === "submitted" || status === "in_review");

  // ── submitted ──────────────────────────────────────────────────────────────
  if (status === "submitted") {
    // Non-owner: no card content
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

        {/* CTA row: primary [브리프 전체 보기 →] + (•••) dropdown */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <Button
            type="button"
            onClick={handleViewBrief}
            className="rounded-full bg-[#71D083] text-black hover:bg-[#71D083]/90 hover:brightness-105 transition-all duration-[400ms] px-6 py-2.5 text-sm font-medium border-0 shadow-none"
          >
            {t("cta.view_full_brief")}
          </Button>

          {/* ••• dropdown trigger (submitted + owner only) */}
          {showDropdown && (
            <MoreActionsDropdown projectId={projectId} />
          )}
        </div>
      </div>
    );
  }

  // ── in_review (dropdown alongside NextActionCTA's material-append CTA) ────
  if (status === "in_review" && isOwner) {
    return (
      <div className="flex items-center justify-between gap-3">
        <NextActionCTA
          projectId={projectId}
          status={status}
          isOwner={isOwner}
          locale={locale}
          labels={ctaLabels}
        />
        <MoreActionsDropdown projectId={projectId} />
      </div>
    );
  }

  // ── all other statuses ─────────────────────────────────────────────────────
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
