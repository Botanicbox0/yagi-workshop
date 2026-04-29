"use client";

// =============================================================================
// SummaryCard — Phase 3.0 hotfix-2 task_04
//
// Live summary card displayed in Step 3 of the new-project wizard.
// Sections: project name / description / references (N count + first 3 thumbs)
//           / deliverable types / budget / delivery date
// Each row has a "수정" link that navigates back to the appropriate step.
//
// Design rules:
//   - font-suit for section header (L-010)
//   - Achromatic only (L-011)
//   - Soft layered shadow — shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] (L-013)
//   - No internal page seams between sections (L-012): use divide-y divide-border/40
//   - No <em>/<i> (L-014)
// =============================================================================

import { useTranslations } from "next-intl";
import { Pencil, ImageIcon, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WizardReference } from "@/components/projects/wizard/reference-board";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SummaryCardProps {
  name: string;
  description: string;
  refs: WizardReference[];
  deliverableTypes: string[];
  budgetBand: string;
  deliveryDate: string;
  onEditStep: (step: 1 | 2 | 3) => void;
}

// ---------------------------------------------------------------------------
// Row header with optional edit link
// ---------------------------------------------------------------------------

function RowHeader({
  label,
  onEdit,
  editLabel,
}: {
  label: string;
  onEdit: () => void;
  editLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
        {label}
      </p>
      <button
        type="button"
        onClick={onEdit}
        className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 uppercase tracking-[0.08em] transition-colors"
        aria-label={editLabel}
      >
        <Pencil className="w-3 h-3" aria-hidden />
        {editLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini thumbnail for references preview
// ---------------------------------------------------------------------------

function RefThumb({ item }: { item: WizardReference }) {
  return (
    <div
      className="w-10 h-10 rounded overflow-hidden bg-muted flex items-center justify-center flex-shrink-0"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
    >
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt={item.title ?? ""}
          className="w-full h-full object-cover"
        />
      ) : item.kind === "image" ? (
        <ImageIcon className="w-4 h-4 text-muted-foreground" />
      ) : item.kind === "pdf" ? (
        <FileText className="w-4 h-4 text-muted-foreground" />
      ) : (
        <Link2 className="w-4 h-4 text-muted-foreground" />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SummaryCard
// ---------------------------------------------------------------------------

export function SummaryCard({
  name,
  description,
  refs,
  deliverableTypes,
  budgetBand,
  deliveryDate,
  onEditStep,
}: SummaryCardProps) {
  const t = useTranslations("projects");

  const budgetLabel = budgetBand
    ? t(`wizard.field.budget.${budgetBand}` as Parameters<typeof t>[0])
    : t("wizard.summary.not_entered");

  const previewRefs = refs.slice(0, 3);
  const hasMoreRefs = refs.length > 3;

  const descTruncated =
    description.length > 200 ? description.slice(0, 200) : description;
  const descTruncatedDisplay =
    description.length > 200 ? `${descTruncated}…` : description;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
      }}
      aria-label={t("wizard.summary.card_label")}
    >
      {/* Section header */}
      <div className="px-4 pt-3 pb-2 border-b border-border/40">
        <h3 className="font-suit text-sm font-semibold tracking-tight">
          {t("wizard.summary.title")}
        </h3>
      </div>

      <div className="divide-y divide-border/40">
        {/* Row 1: Project name */}
        <div className="px-4 py-3 space-y-1">
          <RowHeader
            label={t("wizard.field.name.label")}
            onEdit={() => onEditStep(1)}
            editLabel={t("wizard.actions.edit")}
          />
          <p className={cn("text-sm keep-all", !name && "text-muted-foreground")}>
            {name || t("wizard.summary.not_entered")}
          </p>
        </div>

        {/* Row 2: Description */}
        <div className="px-4 py-3 space-y-1">
          <RowHeader
            label={t("wizard.field.description.label")}
            onEdit={() => onEditStep(1)}
            editLabel={t("wizard.actions.edit")}
          />
          {description ? (
            <p className="text-sm text-muted-foreground keep-all whitespace-pre-line">
              {descTruncatedDisplay}
              {description.length > 200 && (
                <button
                  type="button"
                  className="ml-1.5 text-xs text-foreground underline underline-offset-2"
                  onClick={() => onEditStep(1)}
                >
                  {t("wizard.summary.view_all")}
                </button>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("wizard.summary.not_entered")}
            </p>
          )}
        </div>

        {/* Row 3: References */}
        <div className="px-4 py-3 space-y-2">
          <RowHeader
            label={t("wizard.summary.references_label")}
            onEdit={() => onEditStep(2)}
            editLabel={t("wizard.actions.edit")}
          />
          {refs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("wizard.summary.refs_none")}
            </p>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {previewRefs.map((r) => (
                  <RefThumb key={r.id} item={r} />
                ))}
                {hasMoreRefs && (
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                    +{refs.length - 3}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {t("wizard.summary.references_count", { count: refs.length })}
              </p>
            </div>
          )}
        </div>

        {/* Row 4: Deliverable types */}
        <div className="px-4 py-3 space-y-2">
          <RowHeader
            label={t("wizard.field.deliverable_types.label")}
            onEdit={() => onEditStep(3)}
            editLabel={t("wizard.actions.edit")}
          />
          {deliverableTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("wizard.summary.not_entered")}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {deliverableTypes.map((dt) => (
                <span
                  key={dt}
                  className="rounded-full border border-border/40 px-2.5 py-0.5 text-xs keep-all"
                >
                  {t(
                    `wizard.field.deliverable_types.${dt}` as Parameters<
                      typeof t
                    >[0]
                  )}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Row 5: Budget + delivery date */}
        <div className="px-4 py-3 space-y-2">
          <RowHeader
            label={t("wizard.summary.conditions_label")}
            onEdit={() => onEditStep(3)}
            editLabel={t("wizard.actions.edit")}
          />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-xs text-muted-foreground uppercase tracking-[0.08em] mr-1.5">
                {t("wizard.field.budget.label")}
              </span>
              {budgetLabel}
            </span>
            <span>
              <span className="text-xs text-muted-foreground uppercase tracking-[0.08em] mr-1.5">
                {t("wizard.field.delivery_date.label")}
              </span>
              {deliveryDate && deliveryDate !== ""
                ? deliveryDate
                : t("wizard.summary.delivery_negotiable")}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
