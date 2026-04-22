"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type IntakeMode = "brief" | "proposal_request";

interface IntakeModePickerProps {
  value: IntakeMode;
  onChange: (value: IntakeMode) => void;
}

export function IntakeModePicker({ value, onChange }: IntakeModePickerProps) {
  const t = useTranslations("projects");

  const options: {
    key: IntakeMode;
    title: string;
    description: string;
  }[] = [
    {
      key: "brief",
      title: t("intake_mode_brief_title"),
      description: t("intake_mode_brief_desc"),
    },
    {
      key: "proposal_request",
      title: t("intake_mode_proposal_title"),
      description: t("intake_mode_proposal_desc"),
    },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("intake_mode_label")}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {options.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.key)}
            className={cn(
              "text-left border rounded-lg p-4 cursor-pointer transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "border-foreground bg-muted/40"
                : "border-border hover:border-foreground/40"
            )}
          >
            <p className="font-medium text-sm keep-all">{opt.title}</p>
            <p className="mt-1 text-xs text-muted-foreground keep-all">
              {opt.description}
            </p>
          </button>
        );
      })}
    </div>
  );
}
