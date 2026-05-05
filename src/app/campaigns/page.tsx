import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCampaignsList } from "@/lib/campaigns/queries";
import type { PublicCampaign } from "@/lib/campaigns/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "캠페인 · YAGI Workshop",
  description:
    "음악인을 위한 AI 비주얼 스튜디오 — 신곡 뮤직비디오, 콘셉트 영상, 컴백 콘텐츠를 AI와 창작자 네트워크가 함께 만듭니다.",
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
            className="font-semibold text-lg leading-snug keep-all group-hover:text-sage transition-colors"
            style={{ letterSpacing: "-0.01em" }}
          >
            {campaign.title}
          </h2>
          <StatusBadge status={campaign.status} label={statusLabel} />
        </div>

        {briefPreview && (
          <p className="text-sm text-muted-foreground keep-all line-clamp-3 leading-relaxed">
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

function HeroSection({ t }: { t: Awaited<ReturnType<typeof getTranslations>> }) {
  return (
    <section className="px-6 md:px-8 py-16 md:py-24 max-w-5xl">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
        {t("hero_eyebrow")}
      </p>
      <h1
        className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight leading-[1.05] mb-3 keep-all"
        style={{ letterSpacing: "-0.02em" }}
      >
        {t("hero_title_line1")}
        <br />
        {t("hero_title_line2")}
      </h1>
      <p className="text-2xl md:text-3xl font-display text-muted-foreground mb-6 keep-all">
        {t("hero_subtitle_kr")}
      </p>
      <p className="text-base md:text-lg text-muted-foreground max-w-2xl keep-all leading-relaxed">
        {t("hero_tagline_line1")}
        <br />
        {t("hero_tagline_line2")}
      </p>
    </section>
  );
}

export default async function CampaignsListPage() {
  const t = await getTranslations("public_campaigns");
  const campaigns = await getCampaignsList();

  if (campaigns.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <HeroSection t={t} />

        <section className="px-6 md:px-8 pb-24">
          <div className="rounded-[24px] border border-border bg-card p-12 md:p-16 text-center">
            <p className="text-base text-muted-foreground keep-all leading-relaxed">
              {t("list_empty")}
              <br />
              {t("list_empty_subtitle")}
            </p>
          </div>
        </section>
      </div>
    );
  }

  // Separate active (published) from closed/distributing/archived
  const active = campaigns.filter((c) => c.status === "published");
  const closed = campaigns.filter((c) =>
    ["submission_closed", "distributing", "archived"].includes(c.status)
  );

  return (
    <div className="max-w-7xl mx-auto">
      <HeroSection t={t} />

      <div className="px-6 md:px-8 pb-24 space-y-12">
        {/* Section divider */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1">
            {t("section_title_eyebrow")}
          </h2>
          <p className="text-sm text-muted-foreground keep-all">
            {t("section_title_kr")}
          </p>
        </div>

        {/* Active campaigns */}
        {active.length > 0 && (
          <section aria-label={t("status.published")}>
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
          <section aria-label={t("section_closed_kr")}>
            <h3 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground mb-4">
              {t("section_closed_kr")}
            </h3>
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
    </div>
  );
}
