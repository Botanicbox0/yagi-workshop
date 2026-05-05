import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCampaignsList } from "@/lib/campaigns/queries";
import type { PublicCampaign } from "@/lib/campaigns/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "캠페인 · YAGI Workshop",
  description:
    "야기 워크숍의 크리에이터 캠페인 — AI 크리에이터가 함께 만드는 콘텐츠 캠페인에 참여하세요.",
  robots: { index: true },
};

/** Status pill classes using sage accent per yagi-design-system */
function statusPillClass(status: string): string {
  switch (status) {
    case "published":
      return "bg-sage text-sage-ink";
    case "submission_closed":
      return "bg-muted text-muted-foreground";
    case "distributing":
      return "bg-sage-soft text-sage-ink";
    case "archived":
      return "bg-muted text-muted-foreground opacity-60";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusPillClass(status)}`}
    >
      {label}
    </span>
  );
}

function CampaignCard({
  campaign,
  statusLabel,
}: {
  campaign: PublicCampaign;
  statusLabel: string;
}) {
  const closeDate = campaign.submission_close_at
    ? new Date(campaign.submission_close_at).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const brief = campaign.brief ?? "";
  const briefPreview =
    brief.length > 120 ? brief.slice(0, 120).trimEnd() + "…" : brief;

  return (
    <Link
      href={`/campaigns/${campaign.slug}`}
      className="group block rounded-[24px] border border-border bg-background hover:border-sage transition-colors duration-200 overflow-hidden"
    >
      {/* Placeholder header — minimal sage bar */}
      <div className="h-1.5 bg-sage opacity-30 group-hover:opacity-60 transition-opacity" />

      <div className="p-6 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2
            className="font-semibold text-lg leading-snug word-break-keep-all group-hover:text-sage transition-colors"
            style={{ letterSpacing: "-0.01em" }}
          >
            {campaign.title}
          </h2>
          <StatusBadge status={campaign.status} label={statusLabel} />
        </div>

        {briefPreview && (
          <p className="text-sm text-muted-foreground word-break-keep-all line-clamp-3 leading-relaxed">
            {briefPreview}
          </p>
        )}

        {closeDate && campaign.status !== "archived" && (
          <p className="text-xs text-muted-foreground">
            마감: {closeDate}
          </p>
        )}
      </div>
    </Link>
  );
}

export default async function CampaignsListPage() {
  const t = await getTranslations("public_campaigns");
  const campaigns = await getCampaignsList();

  if (campaigns.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-24 text-center space-y-4">
        {/* Empty state placeholder visual */}
        <div className="mx-auto w-20 h-20 rounded-[24px] bg-sage-soft flex items-center justify-center mb-6">
          <div className="w-8 h-8 rounded-full bg-sage opacity-40" />
        </div>
        <h1 className="font-display italic text-2xl md:text-3xl word-break-keep-all">
          {t("list_title")}
        </h1>
        <p className="text-muted-foreground">{t("list_empty")}</p>
        <p className="text-sm text-muted-foreground">{t("list_empty_subtitle")}</p>
      </div>
    );
  }

  // Separate active (published) from closed/distributing/archived
  const active = campaigns.filter((c) => c.status === "published");
  const closed = campaigns.filter((c) =>
    ["submission_closed", "distributing", "archived"].includes(c.status)
  );

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 space-y-12">
      <h1
        className="font-display italic text-3xl md:text-4xl word-break-keep-all"
        style={{ lineHeight: "1.15", letterSpacing: "-0.01em" }}
      >
        {t("list_title")}
      </h1>

      {/* Active campaigns */}
      {active.length > 0 && (
        <section aria-label={t("status.published")}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            {t("status.published")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                statusLabel={t("status.published")}
              />
            ))}
          </div>
        </section>
      )}

      {/* Distributing + archived */}
      {closed.length > 0 && (
        <section aria-label="종료된 캠페인">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            종료된 캠페인
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {closed.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                statusLabel={
                  t(
                    `status.${campaign.status as "submission_closed" | "distributing" | "archived"}`
                  )
                }
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
