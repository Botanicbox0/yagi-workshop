import {
  ArrowRight,
  CalendarClock,
  Megaphone,
  Plus,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CampaignHowItWorks } from "@/components/campaign/how-it-works";
import { getIsYagiAdmin } from "@/lib/app/admin";
import {
  getAppLandingPath,
  resolveAppActor,
} from "@/lib/app/role-routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: string;
  submission_open_at: string | null;
  submission_close_at: string | null;
  prize_pool_krw: number | null;
  updated_at: string;
  created_at: string;
};

export default async function CampaignsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("campaigns_app");
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
  const actor = resolveAppActor(active, await getIsYagiAdmin(supabase, user.id));
  if (actor !== "brand" && actor !== "creator") {
    redirect({ href: actor ? getAppLandingPath(actor) : "/onboarding", locale });
    return null;
  }

  // campaigns generated types are intentionally bypassed until the full
  // Supabase type refresh catches up with Phase 7 tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = supabase as any;
  const nowIso = new Date().toISOString();
  let query = sb
    .from("campaigns")
    .select(
      "id, slug, title, description, status, submission_open_at, submission_close_at, prize_pool_krw, updated_at, created_at",
    )
    .order("updated_at", { ascending: false });
  if (actor === "brand") {
    query = query.eq("sponsor_workspace_id", active.id);
  } else {
    query = query
      .eq("status", "published")
      .or(`submission_open_at.is.null,submission_open_at.lte.${nowIso}`)
      .or(`submission_close_at.is.null,submission_close_at.gt.${nowIso}`)
      .order("submission_close_at", { ascending: true, nullsFirst: false });
  }
  const { data, error } = await query;

  if (error) {
    console.error("[CampaignsPage] Supabase error:", error);
  }

  const campaigns = (data ?? []) as CampaignRow[];
  const requestedCount = campaigns.filter((c) => c.status === "requested").length;
  const liveCount = campaigns.filter((c) =>
    ["published", "submission_closed", "distributing"].includes(c.status),
  ).length;
  const isCreatorView = actor === "creator";
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              {t("eyebrow")}
            </p>
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
              {isCreatorView ? t("creator_title") : t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
              {isCreatorView ? t("creator_description") : t("description")}
            </p>
          </div>
          {!isCreatorView && campaigns.length > 0 && (
            <Link
              href="/app/campaigns/new"
              className="inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90 sm:w-fit"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("new_cta")}
            </Link>
          )}
        </div>

        {campaigns.length > 0 && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Metric label={t("metrics.total")} value={String(campaigns.length)} />
            {isCreatorView ? (
              <Metric label={t("metrics.open")} value={String(campaigns.length)} />
            ) : (
              <Metric
                label={t("metrics.requested")}
                value={String(requestedCount)}
              />
            )}
            <Metric label={t("metrics.live")} value={String(liveCount)} />
          </div>
        )}
        <CampaignHowItWorks
          variant={isCreatorView ? "creator" : "brand"}
          workspaceName={active.name}
        />
        {campaigns.length === 0 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground keep-all">
              {isCreatorView ? t("creator_empty.title") : t("empty.title")}
            </p>
            {!isCreatorView && (
              <Link
                href="/app/campaigns/new"
                className="inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90 sm:w-fit"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("empty.cta")}
              </Link>
            )}
          </div>
        )}
      </section>

      {campaigns.length > 0 ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              dateLabel={dateFormatter.format(new Date(campaign.updated_at))}
              statusLabel={t(`status.${campaign.status}`)}
              closeLabel={
                campaign.submission_close_at
                  ? t("card.closes", {
                      date: dateFormatter.format(
                        new Date(campaign.submission_close_at),
                      ),
                    })
                  : t("card.no_window")
              }
              prizeLabel={
                campaign.prize_pool_krw !== null
                  ? t("card.prize", {
                      amount: formatKrwPrize(locale, campaign.prize_pool_krw),
                    })
                  : null
              }
              submitLabel={t("card.submit_page")}
              detailLabel={t("card.detail_page")}
              variant={isCreatorView ? "creator" : "sponsor"}
            />
          ))}
        </section>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function CampaignCard({
  campaign,
  dateLabel,
  statusLabel,
  closeLabel,
  prizeLabel,
  submitLabel,
  detailLabel,
  variant,
}: {
  campaign: CampaignRow;
  dateLabel: string;
  statusLabel: string;
  closeLabel: string;
  prizeLabel: string | null;
  submitLabel: string;
  detailLabel: string;
  variant: "sponsor" | "creator";
}) {
  const isLive = ["published", "submission_closed", "distributing"].includes(
    campaign.status,
  );

  return (
    <article className="rounded-lg border border-border/70 bg-surface-raised p-5 transition-colors hover:bg-accent/40">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-label text-muted-foreground">
            {dateLabel}
          </p>
          <h2 className="truncate text-lg font-semibold text-foreground">
            {campaign.title}
          </h2>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
            isLive ? "bg-gold-soft text-gold" : "bg-brand-soft text-brand",
          )}
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground keep-all">
        {campaign.description}
      </p>
      <div className="mt-5 flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          {prizeLabel ? (
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-gold">
              {prizeLabel}
            </p>
          ) : null}
          <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarClock className="h-4 w-4 text-gold" aria-hidden="true" />
            {closeLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {variant === "sponsor" && (
            <Link
              href={`/app/campaigns/${campaign.slug}` as `/app/campaigns/${string}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-foreground transition-colors hover:text-brand"
            >
              {detailLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
          {isLive ? (
            <a
              // Public campaign routes intentionally live outside the localized app shell.
              href={`/campaigns/${campaign.slug}/submit`}
              className={cn(
                "inline-flex items-center gap-1 text-xs font-semibold transition-colors hover:text-brand",
                variant === "creator" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {submitLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function formatKrwPrize(locale: string, amount: number) {
  if (locale === "ko" && amount % 10_000 === 0) {
    return `${new Intl.NumberFormat("ko-KR").format(amount / 10_000)}만원`;
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}
