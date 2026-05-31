import { Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { DEAL_STATUSES, DEAL_USAGE_TYPES, sortDealsByStatus } from "@/lib/deals/constants";
import {
  DealStatusBadge,
  UsageChips,
  formatDateTime,
  formatMoney,
} from "@/components/deals/deal-ui";
import { AdminDealActions } from "./admin-deal-actions";
import { listDeals, type DealRow } from "../../deals/data";
import { TestDataToggle, TestWorkspaceBadge } from "@/components/admin/test-data-toggle";
import { shouldIncludeTestData } from "@/lib/admin/test-data";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ includeTest?: string | string[] }>;
};

export default async function AdminDealsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const includeTest = shouldIncludeTestData(await searchParams);
  const t = await getTranslations({ locale, namespace: "admin_deals" });
  const tAdmin = await getTranslations({ locale, namespace: "admin" });
  const tDeals = await getTranslations({ locale, namespace: "deals" });
  const tUsage = await getTranslations({ locale, namespace: "deal_usage" });
  const supabase = await createSupabaseServer();
  const { data, error } = await listDeals(supabase, { includeTest });
  if (error) {
    console.error("[AdminDealsPage] list deals error:", error);
  }

  const deals = sortDealsByStatus(data);
  const usageLabels = Object.fromEntries(
    DEAL_USAGE_TYPES.map((type) => [type, tUsage(type)]),
  );

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
            <Handshake className="h-4 w-4" aria-hidden="true" />
            {t("eyebrow")}
          </p>
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
            {t("description")}
          </p>
          <div className="mt-4">
            <TestDataToggle
              baseHref="/app/admin/deals"
              includeTest={includeTest}
              label={tAdmin(includeTest ? "test_data_on" : "test_data_off")}
              showLabel={tAdmin("test_data_show")}
              hideLabel={tAdmin("test_data_hide")}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5">
        {DEAL_STATUSES.map((status) => {
          const group = deals.filter((deal) => deal.status === status);
          if (group.length === 0) return null;
          return (
            <div key={status} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground keep-all">
                  {tDeals(`status.${status}`)}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {group.length}
                </span>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {group.map((deal) => (
                  <AdminDealCard
                    key={deal.id}
                    deal={deal}
                    locale={locale}
                    usageLabels={usageLabels}
                    statusLabel={tDeals(`status.${deal.status}`)}
                    paymentLabel={tDeals(`payment.${deal.payment_status}`)}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {deals.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-8">
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminDealCard({
  deal,
  locale,
  usageLabels,
  statusLabel,
  paymentLabel,
}: {
  deal: DealRow;
  locale: string;
  usageLabels: Record<string, string>;
  statusLabel: string;
  paymentLabel: string;
}) {
  const amount = formatMoney(deal.brand_amount, locale, deal.currency);
  return (
    <article className="rounded-lg border border-border/70 bg-surface-raised p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DealStatusBadge status={deal.status} label={statusLabel} />
            {deal.is_test && <TestWorkspaceBadge label="TEST" />}
            <span className="inline-flex h-6 items-center rounded bg-surface-card px-2 text-[11px] font-medium text-muted-foreground">
              {paymentLabel}
            </span>
          </div>
          <Link
            href={`/app/admin/deals/${deal.id}`}
            className="block text-xl font-semibold text-foreground hover:text-brand keep-all"
          >
            {deal.persona_name_snapshot ?? "Digital Twin"}
          </Link>
          <UsageChips usageTypes={deal.usage_types ?? []} labels={usageLabels} />
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <p className="text-lg font-semibold text-foreground">
            {amount ?? "TBD"}
          </p>
          <p>{formatDateTime(deal.updated_at, locale)}</p>
        </div>
      </div>
      <div className="mt-5">
        <AdminDealActions deal={deal} compact />
      </div>
    </article>
  );
}
