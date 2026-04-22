"use client";

import { useTranslations } from "next-intl";
import type {
  FieldErrors,
  UseFormRegister,
  FieldValues,
  Path,
} from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ProposalFieldsValues extends FieldValues {
  proposal_goal?: string;
  proposal_audience?: string;
  proposal_budget_range?: string;
  proposal_timeline?: string;
}

interface ProposalFieldsProps<TFieldValues extends ProposalFieldsValues> {
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
}

export function ProposalFields<TFieldValues extends ProposalFieldsValues>({
  register,
  errors,
}: ProposalFieldsProps<TFieldValues>) {
  const t = useTranslations("projects");
  const tErrors = useTranslations("errors");

  return (
    <div className="space-y-6 border-l-2 border-border pl-4">
      {/* Goal — required */}
      <div className="space-y-1.5">
        <Label htmlFor="proposal_goal">
          {t("proposal_goal_label")}{" "}
          <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="proposal_goal"
          placeholder={t("proposal_goal_ph")}
          rows={3}
          maxLength={800}
          {...register("proposal_goal" as Path<TFieldValues>)}
        />
        {errors.proposal_goal && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Audience — optional */}
      <div className="space-y-1.5">
        <Label htmlFor="proposal_audience">
          {t("proposal_audience_label")}
        </Label>
        <Textarea
          id="proposal_audience"
          placeholder={t("proposal_audience_ph")}
          rows={2}
          maxLength={400}
          {...register("proposal_audience" as Path<TFieldValues>)}
        />
        {errors.proposal_audience && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Budget range — optional */}
      <div className="space-y-1.5">
        <Label htmlFor="proposal_budget_range">
          {t("proposal_budget_range_label")}
        </Label>
        <Input
          id="proposal_budget_range"
          placeholder={t("proposal_budget_range_ph")}
          maxLength={100}
          {...register("proposal_budget_range" as Path<TFieldValues>)}
        />
        {errors.proposal_budget_range && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>

      {/* Timeline — optional */}
      <div className="space-y-1.5">
        <Label htmlFor="proposal_timeline">
          {t("proposal_timeline_label")}
        </Label>
        <Input
          id="proposal_timeline"
          placeholder={t("proposal_timeline_ph")}
          maxLength={200}
          {...register("proposal_timeline" as Path<TFieldValues>)}
        />
        {errors.proposal_timeline && (
          <p className="text-xs text-destructive">{tErrors("validation")}</p>
        )}
      </div>
    </div>
  );
}
