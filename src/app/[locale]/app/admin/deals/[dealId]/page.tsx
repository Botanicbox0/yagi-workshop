import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DEAL_USAGE_TYPES } from "@/lib/deals/constants";
import {
  DealStatusBadge,
  UsageChips,
  formatDateTime,
  formatMoney,
} from "@/components/deals/deal-ui";
import { AdminDealActions } from "../admin-deal-actions";
import {
  getDeal,
  listDealHistory,
  listDealPaymentEvents,
  type DealHistoryRow,
  type DealPaymentEventRow,
} from "../../../deals/data";

type Props = {
  params: Promise<{ locale: string; dealId: string }>;
};

export default async function AdminDealDetailPage({ params }: Props) {
  const { locale, dealId } = await params;
  const t = await getTranslations({ locale, namespace: "admin_deals" });
  const tDeals = await getTranslations({ locale, namespace: "deals" });
  const tUsage = await getTranslations({ locale, namespace: "deal_usage" });
  const supabase = await createSupabaseServer();

  const { data: deal, error } = await getDeal(supabase, dealId);
  if (error) console.error("[AdminDealDetailPage] get deal error:", error);
  if (!deal) notFound();

  const [{ data: history }, { data: payments }] = await Promise.all([
    listDealHistory(supabase, deal.id),
    listDealPaymentEvents(supabase, deal.id),
  ]);

  const usageLabels = Object.fromEntries(
    DEAL_USAGE_TYPES.map((type) => [type, tUsage(type)]),
  );

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/app/admin/deals"
        className="inline-flex w-fit items-center gap-2 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("detail.back")}
      </Link>

      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <DealStatusBadge
                status={deal.status}
                label={tDeals(`status.${deal.status}`)}
              />
              <span className="inline-flex h-6 items-center rounded bg-surface-card px-2 text-[11px] font-medium text-muted-foreground">
                {tDeals(`payment.${deal.payment_status}`)}
              </span>
            </div>
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
              {deal.persona_name_snapshot ?? "Digital Twin"}
            </h1>
            <UsageChips
              usageTypes={deal.usage_types ?? []}
              labels={usageLabels}
            />
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-card p-4 lg:min-w-72 lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
              {t("detail.brand_amount")}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {formatMoney(deal.brand_amount, locale, deal.currency) ?? "TBD"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground keep-all">
              {t("detail.brief")}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground keep-all">
              {deal.brief || t("detail.no_brief")}
            </p>
          </section>
          <AdminTimeline
            history={history}
            locale={locale}
            title={t("detail.history")}
          />
          <AdminPayments
            payments={payments}
            locale={locale}
            title={t("detail.payments")}
          />
        </div>

        <aside className="space-y-6">
          <AdminDealActions deal={deal} />
          <section className="rounded-lg border border-border/70 bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-foreground keep-all">
              {t("detail.amounts")}
            </h2>
            <div className="mt-4 space-y-3 text-sm">
              <AmountRow
                label={t("detail.proposed_budget")}
                value={formatMoney(deal.proposed_budget, locale, deal.currency)}
              />
              <AmountRow
                label={t("detail.brand_amount")}
                value={formatMoney(deal.brand_amount, locale, deal.currency)}
              />
              <AmountRow
                label={t("detail.commission")}
                value={formatMoney(
                  deal.yagi_commission_amount,
                  locale,
                  deal.currency,
                )}
              />
              <AmountRow
                label={t("detail.artist_payout")}
                value={formatMoney(deal.artist_payout_amount, locale, deal.currency)}
              />
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function AmountRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value ?? "TBD"}</span>
    </div>
  );
}

function AdminTimeline({
  history,
  locale,
  title,
}: {
  history: DealHistoryRow[];
  locale: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground keep-all">{title}</h2>
      <div className="mt-5 space-y-4">
        {history.map((item) => (
          <div
            key={item.id}
            className="grid gap-3 border-b border-border/60 pb-4 last:border-b-0 last:pb-0 sm:grid-cols-[140px_1fr]"
          >
            <p className="text-xs text-muted-foreground">
              {formatDateTime(item.transitioned_at, locale)}
            </p>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {item.actor_role} · {item.from_status ?? "new"} → {item.to_status}
              </p>
              {item.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground keep-all">
                  {item.comment}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AdminPayments({
  payments,
  locale,
  title,
}: {
  payments: DealPaymentEventRow[];
  locale: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground keep-all">
        {title}
      </h2>
      <div className="mt-5 grid gap-3">
        {payments.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border border-border/70 bg-surface-card p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {event.event_type}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(event.occurred_at, locale)}
                </p>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {formatMoney(event.amount, locale) ?? "TBD"}
              </p>
            </div>
            {(event.invoice_ref || event.note) && (
              <p className="mt-3 text-sm leading-6 text-muted-foreground keep-all">
                {[event.invoice_ref, event.note].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
