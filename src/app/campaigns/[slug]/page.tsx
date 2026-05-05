import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import {
  getCampaignBySlug,
  getCampaignCategories,
  getCampaignDistributions,
} from "@/lib/campaigns/queries";
import type {
  CampaignCategory,
  DistributionWithSubmission,
} from "@/lib/campaigns/queries";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return {};

  const descRaw = (campaign.brief ?? "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 160);

  return {
    title: `${campaign.title} · YAGI 캠페인`,
    description: descRaw || "YAGI Workshop 캠페인에 참여하세요.",
    robots: { index: true, follow: true },
  };
}

/** Resolve a distribution channel to its label key */
function channelLabel(
  channel: string,
  t: Awaited<ReturnType<typeof getTranslations<"public_campaigns">>>
): string {
  switch (channel) {
    case "tiktok":
      return t("detail.channel_tiktok");
    case "instagram":
      return t("detail.channel_instagram");
    case "youtube":
      return t("detail.channel_youtube");
    case "youtube_shorts":
      return t("detail.channel_youtube_shorts");
    case "x":
      return t("detail.channel_x");
    default:
      return t("detail.channel_other");
  }
}

/** Channel icon — simple text badge; icon set can be wired later */
function ChannelBadge({ channel, label }: { channel: string; label: string }) {
  const colorMap: Record<string, string> = {
    tiktok: "bg-black text-white",
    instagram:
      "bg-gradient-to-r from-purple-500 to-pink-500 text-white",
    youtube: "bg-red-600 text-white",
    youtube_shorts: "bg-red-500 text-white",
    x: "bg-black text-white",
  };
  const cls = colorMap[channel] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
    >
      {label}
    </span>
  );
}

/** Status pill */
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

/** Reference assets (Json | null) — typed defensively */
type RefAsset = { url?: string; label?: string; title?: string };

function parseReferenceAssets(raw: unknown): RefAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is RefAsset =>
      typeof item === "object" && item !== null && typeof (item as RefAsset).url === "string"
  );
}

/** Distributed showcase gallery — asymmetric mixed-size grid */
function ShowcaseGallery({
  distributions,
  t,
}: {
  distributions: DistributionWithSubmission[];
  t: Awaited<ReturnType<typeof getTranslations<"public_campaigns">>>;
}) {
  if (distributions.length === 0) return null;

  // Group distributions by submission_id
  const bySubmission = new Map<string, DistributionWithSubmission[]>();
  for (const d of distributions) {
    const existing = bySubmission.get(d.submission_id) ?? [];
    existing.push(d);
    bySubmission.set(d.submission_id, existing);
  }

  const entries = [...bySubmission.entries()];

  return (
    <section className="space-y-6">
      <h2
        className="font-semibold text-xl word-break-keep-all"
        style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
      >
        {t("detail.showcase_title")}
      </h2>

      {/* Asymmetric grid per design-system §"No uniform grids for media" */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
        {entries.map(([submissionId, dists], idx) => {
          const sub = dists[0].submission;
          const creatorName = sub.team_name ?? sub.applicant_name;

          // Vary width: 50 / 33 / 25 % pattern via column-span hints
          const colSpanHint =
            idx % 6 === 0
              ? "break-inside-avoid mb-4 w-full"
              : idx % 6 === 3
                ? "break-inside-avoid mb-4 w-full"
                : "break-inside-avoid mb-4 w-full";

          return (
            <div
              key={submissionId}
              className={`${colSpanHint} rounded-[24px] border border-border bg-background p-5 space-y-3`}
            >
              {/* Creator header */}
              <div className="space-y-0.5">
                <p className="font-semibold text-sm word-break-keep-all">
                  {creatorName}
                </p>
                <p className="text-xs text-muted-foreground word-break-keep-all line-clamp-2">
                  {sub.title}
                </p>
              </div>

              {/* Channel distribution links */}
              <div className="flex flex-wrap gap-2">
                {dists.map((d) => (
                  <a
                    key={d.id}
                    href={d.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 no-underline hover:opacity-80 transition-opacity"
                  >
                    <ChannelBadge
                      channel={d.channel}
                      label={channelLabel(d.channel, t)}
                    />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Category list */
function CategoriesSection({
  categories,
  t,
}: {
  categories: CampaignCategory[];
  t: Awaited<ReturnType<typeof getTranslations<"public_campaigns">>>;
}) {
  if (categories.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2
        className="font-semibold text-xl word-break-keep-all"
        style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
      >
        {t("detail.categories_label")}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="rounded-[24px] border border-border bg-background p-5 space-y-2"
          >
            <h3 className="font-semibold text-base word-break-keep-all">
              {cat.name}
            </h3>
            {cat.description && (
              <p className="text-sm text-muted-foreground word-break-keep-all leading-relaxed">
                {cat.description}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function CampaignDetailPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("public_campaigns");

  const campaign = await getCampaignBySlug(slug);
  if (!campaign) notFound();

  const [categoriesRaw, distributionsRaw] = await Promise.all([
    getCampaignCategories(campaign.id),
    getCampaignDistributions(campaign.id, campaign.status),
  ]);

  const categories = categoriesRaw ?? [];
  const distributions = distributionsRaw ?? [];

  const statusLabel = t(
    `status.${campaign.status as "published" | "submission_closed" | "distributing" | "archived"}`
  );
  const pillClass = statusPillClass(campaign.status);

  const isSubmissionOpen = campaign.status === "published";
  const showShowcase = ["distributing", "archived"].includes(campaign.status);

  // Deadline display
  let deadlineText: string | null = null;
  if (campaign.submission_close_at) {
    const closeDate = new Date(campaign.submission_close_at);
    const now = Date.now();
    const diffMs = closeDate.getTime() - now;
    if (diffMs > 0 && campaign.status === "published") {
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      deadlineText = t("detail.submission_closes_in", {
        time: `${diffDays}일 후`,
      });
    } else if (campaign.status !== "published") {
      deadlineText = t("detail.submission_closed");
    }
  }

  const refAssets = parseReferenceAssets(campaign.reference_assets);

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-12 space-y-10">
      {/* [1] Hero */}
      <section className="space-y-4">
        {/* Sage accent bar */}
        <div className="h-1 w-16 rounded-full bg-sage" />

        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${pillClass}`}
          >
            {statusLabel}
          </span>
          {deadlineText && (
            <span className="text-sm text-muted-foreground">{deadlineText}</span>
          )}
        </div>

        <h1
          className="font-semibold text-3xl md:text-4xl word-break-keep-all"
          style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
        >
          {campaign.title}
        </h1>

        {campaign.description && (
          <p className="text-muted-foreground leading-relaxed word-break-keep-all">
            {campaign.description}
          </p>
        )}
      </section>

      {/* [2] Brief */}
      {campaign.brief && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.brief_label")}
          </h2>
          <div className="rounded-[24px] border border-border bg-background p-6">
            <p className="text-sm leading-relaxed word-break-keep-all whitespace-pre-wrap">
              {campaign.brief}
            </p>
          </div>
        </section>
      )}

      {/* [3] Reference assets */}
      {refAssets.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.references_label")}
          </h2>
          <ul className="space-y-2">
            {refAssets.map((asset, i) => (
              <li key={i}>
                <a
                  href={asset.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sage hover:underline break-all"
                >
                  {asset.label ?? asset.title ?? asset.url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* [4] Categories */}
      <CategoriesSection categories={categories} t={t} />

      {/* [5] CTA —응모하기 (stub link; form built in C.1) */}
      {isSubmissionOpen && (
        <section>
          <Link
            href={`/campaigns/${campaign.slug}/submit`}
            className="inline-flex items-center justify-center rounded-full bg-sage text-sage-ink font-semibold px-8 py-3 text-sm hover:opacity-90 transition-opacity"
          >
            {t("detail.submit_cta")}
          </Link>
        </section>
      )}

      {/* [6] Distributed showcase gallery */}
      {showShowcase && distributions.length > 0 && (
        <ShowcaseGallery distributions={distributions} t={t} />
      )}

      {/* Show placeholder when in distributing/archived but no distributions yet */}
      {showShowcase && distributions.length === 0 && (
        <section className="space-y-3">
          <h2
            className="font-semibold text-xl word-break-keep-all"
            style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
          >
            {t("detail.showcase_title")}
          </h2>
          <div className="rounded-[24px] border border-border bg-background p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {t("detail.showcase_empty_for_status")}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
