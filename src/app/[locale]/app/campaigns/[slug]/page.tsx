import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  Megaphone,
  RadioTower,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type CampaignStatus =
  | "requested"
  | "in_review"
  | "declined"
  | "draft"
  | "published"
  | "submission_closed"
  | "distributing"
  | "archived";

type CampaignDetailRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  brief: string | null;
  reference_assets: unknown;
  request_metadata: unknown;
  decision_metadata: unknown;
  status: CampaignStatus;
  submission_open_at: string | null;
  submission_close_at: string | null;
  distribution_starts_at: string | null;
  allow_r2_upload: boolean;
  allow_external_url: boolean;
  compensation_model: string | null;
  prize_pool_krw: number | null;
  prize_tiers: unknown;
  recruit_target: number | null;
  created_at: string;
  updated_at: string;
};

const STATUS_FLOW: CampaignStatus[] = [
  "requested",
  "in_review",
  "draft",
  "published",
  "submission_closed",
  "distributing",
  "archived",
];

const LIVE_STATUSES: CampaignStatus[] = [
  "published",
  "submission_closed",
  "distributing",
  "archived",
];

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asPrizeTiers(value: unknown): Array<{ rank: number; amount: number }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const rank = asNumber(record.rank);
      const amount = asNumber(record.amount);
      return rank !== null && amount !== null ? { rank, amount } : null;
    })
    .filter((tier): tier is { rank: number; amount: number } => tier !== null);
}

function statusIndex(status: CampaignStatus) {
  if (status === "declined") return 1;
  return Math.max(0, STATUS_FLOW.indexOf(status));
}

export default async function CampaignDetailPage({ params }: Props) {
  const { locale, slug } = await params;
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

  // campaigns generated types are intentionally bypassed until the full
  // Supabase type refresh catches up with Phase 7 tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = supabase as any;
  const { data, error } = await sb
    .from("campaigns")
    .select(
      [
        "id",
        "slug",
        "title",
        "description",
        "brief",
        "reference_assets",
        "request_metadata",
        "decision_metadata",
        "status",
        "submission_open_at",
        "submission_close_at",
        "distribution_starts_at",
        "allow_r2_upload",
        "allow_external_url",
        "compensation_model",
        "prize_pool_krw",
        "prize_tiers",
        "recruit_target",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("slug", slug)
    .eq("sponsor_workspace_id", active.id)
    .maybeSingle();

  if (error) {
    console.error("[CampaignDetailPage] Supabase error:", error);
  }
  if (!data) notFound();

  const campaign = data as CampaignDetailRow;
  const request = asRecord(campaign.request_metadata);
  const references = asRecord(campaign.reference_assets);
  const decision = asRecord(campaign.decision_metadata);
  const desiredPrize = asNumber(request.desired_prize_krw);
  const desiredRecruit = asNumber(request.desired_recruit_target);
  const prizeTiers = asPrizeTiers(campaign.prize_tiers);
  const currentIndex = statusIndex(campaign.status);
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const isLive = LIVE_STATUSES.includes(campaign.status);
  // Public campaign routes intentionally live outside the localized app shell.
  const submitUrl = `/campaigns/${campaign.slug}/submit`;

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/app/campaigns"
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("detail.back")}
      </Link>

      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
              <Megaphone className="h-4 w-4" aria-hidden="true" />
              {t("detail.eyebrow")}
            </p>
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
              {campaign.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
              {campaign.description || t("detail.description_empty")}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <StatusPill label={t(`status.${campaign.status}`)} live={isLive} />
            <p className="text-xs text-muted-foreground">
              {t("detail.updated", {
                date: dateFormatter.format(new Date(campaign.updated_at)),
              })}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryTile
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label={t("detail.sponsor_kind")}
            value={t(`detail.workspace_kind.${active.kind}`)}
          />
          <SummaryTile
            icon={<CalendarClock className="h-4 w-4" aria-hidden="true" />}
            label={t("detail.submission_window")}
            value={formatWindow(
              campaign.submission_open_at,
              campaign.submission_close_at,
              dateFormatter,
              t("detail.not_confirmed"),
            )}
          />
          <SummaryTile
            icon={<RadioTower className="h-4 w-4" aria-hidden="true" />}
            label={t("detail.public_entry")}
            value={isLive ? t("detail.public_ready") : t("detail.public_pending")}
          />
          <SummaryTile
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label={t("detail.recruit_target")}
            value={
              campaign.recruit_target !== null
                ? t("detail.recruit_count", { count: campaign.recruit_target })
                : t("detail.not_confirmed")
            }
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
        <section className="space-y-6">
          <Panel title={t("detail.lifecycle_title")}>
            <ol className="space-y-3">
              {STATUS_FLOW.map((status, index) => {
                const done = campaign.status !== "declined" && index < currentIndex;
                const current = status === campaign.status;
                return (
                  <li
                    key={status}
                    className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-border/70 bg-surface-card p-4"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border text-xs",
                        done
                          ? "border-brand bg-brand text-brand-on"
                          : current
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-border bg-surface-raised text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {t(`status.${status}`)}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
                        {t(`detail.status_description.${status}`)}
                      </p>
                    </div>
                  </li>
                );
              })}
              {campaign.status === "declined" ? (
                <li className="grid grid-cols-[auto_1fr] gap-3 rounded-lg border border-border/70 bg-surface-card p-4">
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-brand bg-brand-soft text-brand">
                    <Clock3 className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t("status.declined")}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
                      {t("detail.status_description.declined")}
                    </p>
                  </div>
                </li>
              ) : null}
            </ol>
          </Panel>

          <Panel title={t("detail.brief_title")}>
            <div className="space-y-5">
              <TextBlock
                label={t("detail.brief_label")}
                value={campaign.brief || t("detail.empty_value")}
              />
              <TextBlock
                label={t("detail.references_label")}
                value={asText(references.notes) || t("detail.empty_value")}
              />
              <TextBlock
                label={t("detail.decision_label")}
                value={asText(decision.notes) || t("detail.decision_pending")}
              />
            </div>
          </Panel>
        </section>

        <aside className="space-y-6">
          <Panel title={t("detail.request_title")}>
            <dl className="space-y-4">
              <MetaRow
                label={t("detail.contact_name")}
                value={asText(request.contact_name) || t("detail.empty_value")}
              />
              <MetaRow
                label={t("detail.contact_email")}
                value={asText(request.contact_email) || t("detail.empty_value")}
              />
              <MetaRow
                label={t("detail.contact_phone")}
                value={asText(request.contact_phone) || t("detail.empty_value")}
              />
              <MetaRow
                label={t("detail.created")}
                value={dateFormatter.format(new Date(campaign.created_at))}
              />
              <MetaRow
                label={t("detail.desired_prize")}
                value={
                  desiredPrize !== null
                    ? formatKrwPrize(locale, desiredPrize)
                    : t("detail.empty_value")
                }
              />
              <MetaRow
                label={t("detail.desired_recruit")}
                value={
                  desiredRecruit !== null
                    ? t("detail.recruit_count", {
                        count: desiredRecruit,
                      })
                    : t("detail.empty_value")
                }
              />
            </dl>
          </Panel>

          <Panel title={t("detail.prize_title")}>
            <div className="space-y-4">
              <MetaRow
                label={t("detail.prize_pool")}
                value={
                  campaign.prize_pool_krw !== null
                    ? formatKrwPrize(locale, campaign.prize_pool_krw)
                    : t("detail.not_confirmed")
                }
              />
              <MetaRow
                label={t("detail.recruit_target")}
                value={
                  campaign.recruit_target !== null
                    ? t("detail.recruit_count", { count: campaign.recruit_target })
                    : t("detail.not_confirmed")
                }
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
                  {t("detail.prize_tiers")}
                </p>
                {prizeTiers.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {prizeTiers.map((tier) => (
                      <li
                        key={`${tier.rank}-${tier.amount}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-surface-card px-3 py-2 text-sm"
                      >
                        <span className="font-medium text-foreground">
                          {t("detail.prize_rank", { rank: tier.rank })}
                        </span>
                        <span className="font-semibold text-gold">
                          {formatKrwPrize(locale, tier.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm leading-6 text-foreground keep-all">
                    {t("detail.not_confirmed")}
                  </p>
                )}
              </div>
              <p className="rounded-lg border border-gold/25 bg-gold/10 p-3 text-sm leading-6 text-muted-foreground keep-all">
                {t("detail.prize_notice")}
              </p>
            </div>
          </Panel>

          <Panel title={t("detail.mass_campaign_title")}>
            <div className="space-y-4">
              {["sponsor", "creator", "distribution"].map((key) => (
                <div
                  key={key}
                  className="rounded-lg border border-border/70 bg-surface-card p-4"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {t(`detail.mass_campaign.${key}.title`)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground keep-all">
                    {t(`detail.mass_campaign.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title={t("detail.publish_title")}>
            <div className="space-y-4">
              <MetaRow
                label={t("detail.file_policy")}
                value={[
                  campaign.allow_r2_upload ? t("detail.file_upload") : null,
                  campaign.allow_external_url ? t("detail.external_url") : null,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              />
              <MetaRow
                label={t("detail.distribution_start")}
                value={
                  campaign.distribution_starts_at
                    ? dateFormatter.format(new Date(campaign.distribution_starts_at))
                    : t("detail.not_confirmed")
                }
              />
              {isLive ? (
                <a
                  href={submitUrl}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90"
                >
                  {t("detail.open_public")}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ) : (
                <div className="rounded-lg border border-dashed border-border/70 bg-surface-card p-4">
                  <p className="text-sm leading-6 text-muted-foreground keep-all">
                    {t("detail.public_locked")}
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </main>
  );
}

function StatusPill({ label, live }: { label: string; live: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-3 py-1.5 text-xs font-semibold",
        live ? "bg-gold-soft text-gold" : "bg-brand-soft text-brand",
      )}
    >
      {label}
    </span>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-muted-foreground">
        <span className="text-gold">{icon}</span>
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold leading-6 text-foreground keep-all">
        {value}
      </p>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6">
      <h2 className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileText className="h-4 w-4 text-brand" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function TextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 whitespace-pre-wrap rounded-lg border border-border/70 bg-surface-card p-4 text-sm leading-6 text-foreground keep-all">
        {value}
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm leading-6 text-foreground keep-all">{value}</dd>
    </div>
  );
}

function formatWindow(
  openAt: string | null,
  closeAt: string | null,
  formatter: Intl.DateTimeFormat,
  fallback: string,
) {
  if (!openAt && !closeAt) return fallback;
  if (openAt && closeAt) {
    return `${formatter.format(new Date(openAt))} - ${formatter.format(
      new Date(closeAt),
    )}`;
  }
  if (openAt) return formatter.format(new Date(openAt));
  return formatter.format(new Date(closeAt!));
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
