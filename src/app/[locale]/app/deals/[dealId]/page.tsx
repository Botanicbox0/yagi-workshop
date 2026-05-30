import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { DEAL_USAGE_TYPES } from "@/lib/deals/constants";
import {
  DealStatusBadge,
  UsageChips,
  formatDateTime,
  formatMoney,
} from "@/components/deals/deal-ui";
import { DealActionPanel } from "../deal-action-panel";
import {
  getDeal,
  listDealHistory,
  listDealPaymentEvents,
  type DealHistoryRow,
  type DealPaymentEventRow,
} from "../data";

type Props = {
  params: Promise<{ locale: string; dealId: string }>;
};

export default async function DealDetailPage({ params }: Props) {
  const { locale, dealId } = await params;
  const t = await getTranslations({ locale, namespace: "deals" });
  const tUsage = await getTranslations({ locale, namespace: "deal_usage" });
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    redirect({ href: "/onboarding", locale });
    return null;
  }
  if (active.kind !== "brand" && active.kind !== "artist") {
    redirect({ href: "/app", locale });
    return null;
  }

  const { data: deal, error } = await getDeal(supabase, dealId);
  if (error) {
    console.error("[DealDetailPage] get deal error:", error);
  }
  if (!deal) notFound();

  const [{ data: history, error: historyError }, { data: payments, error: paymentError }] =
    await Promise.all([
      listDealHistory(supabase, deal.id),
      listDealPaymentEvents(supabase, deal.id),
    ]);
  if (historyError) console.error("[DealDetailPage] history error:", historyError);
  if (paymentError) console.error("[DealDetailPage] payment error:", paymentError);

  const usageLabels = Object.fromEntries(
    DEAL_USAGE_TYPES.map((type) => [type, tUsage(type)]),
  );
  const primaryAmount =
    active.kind === "artist"
      ? deal.artist_payout_amount
      : deal.brand_amount ?? deal.proposed_budget;
  const primaryAmountLabel = formatMoney(primaryAmount, locale, deal.currency);

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/app/deals"
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
                label={t(`status.${deal.status}`)}
              />
              <span className="inline-flex h-6 items-center rounded bg-surface-card px-2 text-[11px] font-medium text-muted-foreground">
                {t(`payment.${deal.payment_status}`)}
              </span>
            </div>
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
              {deal.persona_name_snapshot ?? t("detail.untitled")}
            </h1>
            <UsageChips
              usageTypes={deal.usage_types ?? []}
              labels={usageLabels}
            />
          </div>
          <div className="rounded-lg border border-border/70 bg-surface-card p-4 lg:min-w-64 lg:text-right">
            <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
              {active.kind === "artist"
                ? t("detail.artist_amount")
                : t("detail.brand_amount")}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">
              {primaryAmountLabel ?? t("detail.amount_pending")}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground keep-all">
              {t("detail.brief")}
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground keep-all">
              {deal.brief || t("detail.no_brief")}
            </p>
          </section>

          {active.kind === "artist" && (
            <DealActionPanel dealId={deal.id} status={deal.status} />
          )}

          <Timeline
            history={history}
            locale={locale}
            labels={{
              title: t("detail.timeline"),
              empty: t("detail.timeline_empty"),
            }}
          />
        </div>

        <aside className="space-y-6">
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
                label={t("detail.artist_amount")}
                value={formatMoney(deal.artist_payout_amount, locale, deal.currency)}
              />
              <AmountRow
                label={t("detail.commission")}
                value={formatMoney(
                  deal.yagi_commission_amount,
                  locale,
                  deal.currency,
                )}
                subdued={active.kind === "artist"}
              />
            </div>
          </section>

          <section className="rounded-lg border border-border/70 bg-surface-raised p-5">
            <h2 className="text-lg font-semibold text-foreground keep-all">
              {t("detail.production")}
            </h2>
            <div className="mt-4 text-sm leading-6 text-muted-foreground keep-all">
              {deal.project_id ? (
                <Link
                  href={`/app/projects/${deal.project_id}`}
                  className="inline-flex items-center gap-2 text-foreground hover:text-brand"
                >
                  {t("detail.project_in_progress")}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : deal.status === "accepted" ? (
                t("detail.project_pending")
              ) : active.kind === "brand" ? (
                t("detail.brand_readonly")
              ) : (
                t("detail.project_none")
              )}
            </div>
          </section>

          <PaymentLedger
            payments={payments}
            locale={locale}
            labels={{
              title: t("detail.payments"),
              empty: t("detail.payments_empty"),
              brand_paid: t("payment_event.brand_paid"),
              paid_out: t("payment_event.paid_out"),
            }}
          />
        </aside>
      </div>
    </main>
  );
}

function AmountRow({
  label,
  value,
  subdued = false,
}: {
  label: string;
  value: string | null;
  subdued?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={subdued ? "text-muted-foreground" : "text-foreground"}>
        {value ?? "TBD"}
      </span>
    </div>
  );
}

function Timeline({
  history,
  locale,
  labels,
}: {
  history: DealHistoryRow[];
  locale: string;
  labels: { title: string; empty: string };
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-foreground keep-all">
        {labels.title}
      </h2>
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
        {history.length === 0 && (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        )}
      </div>
    </section>
  );
}

function PaymentLedger({
  payments,
  locale,
  labels,
}: {
  payments: DealPaymentEventRow[];
  locale: string;
  labels: {
    title: string;
    empty: string;
    brand_paid: string;
    paid_out: string;
  };
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground keep-all">
        <FileText className="h-4 w-4" aria-hidden="true" />
        {labels.title}
      </h2>
      <div className="mt-4 space-y-3">
        {payments.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border border-border/70 bg-surface-card p-3"
          >
            <p className="text-sm font-semibold text-foreground">
              {event.event_type === "brand_paid"
                ? labels.brand_paid
                : labels.paid_out}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(event.occurred_at, locale)}
            </p>
            {event.amount !== null && (
              <p className="mt-2 text-sm text-foreground">
                {formatMoney(event.amount, locale)}
              </p>
            )}
          </div>
        ))}
        {payments.length === 0 && (
          <p className="text-sm text-muted-foreground">{labels.empty}</p>
        )}
      </div>
    </section>
  );
}
