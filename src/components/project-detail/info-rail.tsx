// Phase 4.x task_04 — Info rail (right column, 360 wide on desktop) for
// the post-submit detail page. KICKOFF section task_04 spec:
//   - 의뢰 일자 (created_at)
//   - 예산 (budget enum -> KO/EN label)
//   - 납기 (target_delivery_at, falls back to "협의" / "To be discussed")
//   - Twin intent (twin_intent enum -> KO/EN label)
//   - 미팅 희망일 (meeting_preferred_at, "—" when null)
//
// CRITICAL self-review focus (KICKOFF):
//   - project_licenses 데이터는 절대 노출하지 않음 (Phase 4 admin-only)
//   - 모든 field 는 server-resolved props, client-side fetch 없음
//
// Phase 5 HF1.5: date/time formatting delegated to formatKoreanDateTime /
// formatKoreanDate from src/lib/date/format-korean-date-time.ts

import {
  formatKoreanDate,
  formatKoreanDateTime,
} from "@/lib/date/format-korean-date-time";

type TwinIntent = "undecided" | "specific_in_mind" | "no_twin";

type Props = {
  createdAt: string;
  budgetBand: string | null;
  targetDeliveryAt: string | null;
  twinIntent: TwinIntent | null;
  meetingPreferredAt: string | null;
  labels: {
    section: string;
    submittedOn: string;
    budget: string;
    delivery: string;
    deliveryNegotiable: string;
    twinIntent: string;
    meeting: string;
    meetingNone: string;
    notSet: string;
    budgetMap: Record<string, string>; // under_1m / 1m_to_5m / 5m_to_10m / negotiable
    twinIntentMap: Record<TwinIntent, string>;
  };
  locale: "ko" | "en";
};

export function InfoRail({
  createdAt,
  budgetBand,
  targetDeliveryAt,
  twinIntent,
  meetingPreferredAt,
  labels,
  locale,
}: Props) {
  const budgetLabel =
    budgetBand && labels.budgetMap[budgetBand]
      ? labels.budgetMap[budgetBand]
      : labels.notSet;

  const deliveryLabel = targetDeliveryAt
    ? formatKoreanDate(targetDeliveryAt, locale)
    : labels.deliveryNegotiable;

  const twinIntentLabel = twinIntent
    ? labels.twinIntentMap[twinIntent]
    : labels.notSet;

  const meetingLabel = meetingPreferredAt
    ? formatKoreanDateTime(meetingPreferredAt, locale)
    : labels.meetingNone;

  return (
    <aside
      className="w-full md:w-[360px] md:shrink-0 rounded-3xl border border-border/40 p-6 md:p-7 self-start"
      aria-label={labels.section}
    >
      <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground keep-all mb-5">
        {labels.section}
      </h2>
      <dl className="flex flex-col gap-4">
        <Row label={labels.submittedOn} value={formatKoreanDate(createdAt, locale)} />
        <Row label={labels.budget} value={budgetLabel} />
        <Row label={labels.delivery} value={deliveryLabel} />
        <Row label={labels.twinIntent} value={twinIntentLabel} />
        <Row label={labels.meeting} value={meetingLabel} />
      </dl>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground keep-all">{label}</dt>
      <dd className="text-sm text-foreground keep-all">{value}</dd>
    </div>
  );
}

export type { TwinIntent };
