import { cn } from "@/lib/utils";
import type { CommissionIntakeState } from "@/lib/commission/types";

const KO_LABELS: Record<CommissionIntakeState, string> = {
  submitted: "검토 중",
  admin_responded: "답변 완료",
  closed: "완료됨",
  archived: "보관됨",
  converted: "워크스페이스 전환됨",
};

const EN_LABELS: Record<CommissionIntakeState, string> = {
  submitted: "In review",
  admin_responded: "Responded",
  closed: "Closed",
  archived: "Archived",
  converted: "Converted",
};

const STATE_TONES: Record<CommissionIntakeState, string> = {
  submitted: "bg-yellow-50 text-yellow-900 border-yellow-200",
  admin_responded: "bg-emerald-50 text-emerald-900 border-emerald-200",
  closed: "bg-slate-50 text-slate-700 border-slate-200",
  archived: "bg-slate-100 text-slate-500 border-slate-200",
  converted: "bg-violet-50 text-violet-900 border-violet-200",
};

export function CommissionIntakeStatePill({
  state,
  locale,
}: {
  state: CommissionIntakeState;
  locale: string;
}) {
  const labels = locale === "en" ? EN_LABELS : KO_LABELS;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border tabular-nums",
        STATE_TONES[state],
      )}
    >
      {labels[state]}
    </span>
  );
}
