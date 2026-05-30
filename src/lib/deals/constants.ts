export const DEAL_USAGE_TYPES = [
  "social_sns",
  "tv_commercial",
  "ooh",
  "web_display",
  "print",
  "brand_film",
] as const;

export type DealUsageType = (typeof DEAL_USAGE_TYPES)[number];

export const DEAL_STATUSES = [
  "submitted",
  "offered",
  "negotiating",
  "accepted",
  "delivered",
  "settled",
  "declined",
  "cancelled",
] as const;

export type DealStatus = (typeof DEAL_STATUSES)[number];

export const DEAL_PAYMENT_STATUSES = [
  "pending",
  "brand_paid",
  "paid_out",
] as const;

export type DealPaymentStatus = (typeof DEAL_PAYMENT_STATUSES)[number];

export function getDealStatusTone(status: string) {
  if (status === "settled") return "done";
  if (status === "declined" || status === "cancelled") return "negative";
  if (status === "accepted" || status === "delivered") return "neutral";
  return "pending";
}

export function sortDealsByStatus<T extends { status: string; updated_at: string }>(
  deals: T[],
) {
  const order = new Map<string, number>(
    DEAL_STATUSES.map((status, index) => [status, index]),
  );
  return [...deals].sort((a, b) => {
    const statusDelta =
      (order.get(a.status) ?? DEAL_STATUSES.length) -
      (order.get(b.status) ?? DEAL_STATUSES.length);
    if (statusDelta !== 0) return statusDelta;
    return (
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
}
