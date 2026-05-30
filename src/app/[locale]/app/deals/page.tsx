import { Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { sortDealsByStatus } from "@/lib/deals/constants";
import { DEAL_USAGE_TYPES } from "@/lib/deals/constants";
import {
  DealStatusBadge,
  UsageChips,
  formatDateTime,
  formatMoney,
} from "@/components/deals/deal-ui";
import { listDeals, type DealRow } from "./data";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DealsPage({ params }: Props) {
  const { locale } = await params;
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
  const actorKind: "brand" | "artist" = active.kind;

  const { data, error } = await listDeals(supabase);
  if (error) {
    console.error("[DealsPage] list deals error:", error);
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
            {actorKind === "artist" ? t("title_artist") : t("title_brand")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
            {actorKind === "artist"
              ? t("description_artist")
              : t("description_brand")}
          </p>
        </div>
      </section>

      {deals.length > 0 ? (
        <section className="grid gap-4">
          {deals.map((deal) => (
            <DealListCard
              key={deal.id}
              deal={deal}
              locale={locale}
              usageLabels={usageLabels}
              statusLabel={t(`status.${deal.status}`)}
              paymentLabel={t(`payment.${deal.payment_status}`)}
              actorKind={actorKind}
              updatedLabel={t("updated", {
                date: formatDateTime(deal.updated_at, locale),
              })}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-8">
          <h2 className="text-xl font-semibold text-foreground keep-all">
            {t("empty.title")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground keep-all">
            {actorKind === "artist"
              ? t("empty.description_artist")
              : t("empty.description_brand")}
          </p>
        </section>
      )}
    </main>
  );
}

function DealListCard({
  deal,
  locale,
  usageLabels,
  statusLabel,
  paymentLabel,
  actorKind,
  updatedLabel,
}: {
  deal: DealRow;
  locale: string;
  usageLabels: Record<string, string>;
  statusLabel: string;
  paymentLabel: string;
  actorKind: "brand" | "artist";
  updatedLabel: string;
}) {
  const primaryAmount =
    actorKind === "artist"
      ? deal.artist_payout_amount
      : deal.brand_amount ?? deal.proposed_budget;
  const amount = formatMoney(primaryAmount, locale, deal.currency);

  return (
    <Link
      href={`/app/deals/${deal.id}`}
      className="group rounded-lg border border-border/70 bg-surface-raised p-5 transition duration-flora ease-flora hover:-translate-y-0.5 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <DealStatusBadge status={deal.status} label={statusLabel} />
            <span className="inline-flex h-6 items-center rounded bg-surface-card px-2 text-[11px] font-medium text-muted-foreground">
              {paymentLabel}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-foreground keep-all">
            {deal.persona_name_snapshot ?? "Digital Twin"}
          </h2>
          <UsageChips usageTypes={deal.usage_types ?? []} labels={usageLabels} />
        </div>
        <div className="text-left lg:text-right">
          <p className="text-lg font-semibold text-foreground">
            {amount ?? "TBD"}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{updatedLabel}</p>
        </div>
      </div>
    </Link>
  );
}
