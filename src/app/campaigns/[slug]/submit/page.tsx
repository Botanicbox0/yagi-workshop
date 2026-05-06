// Wave C v2 — /campaigns/[slug]/submit (public submission form)
//
// Server component. Three guards (all return ClosedCard or no-categories card
// before rendering the form):
//   1. Campaign not found
//   2. Campaign not published (closed/draft/etc.)
//   3. HIGH-5: !allow_r2_upload && !allow_external_url (no path available)
//   4. No categories authored yet
//
// HIGH-4: heading uses `font-semibold tracking-display-ko text-2xl md:text-3xl`
// (Pretendard 600 unified per yagi-design-system v1.0).

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  getCampaignBySlug,
  getCampaignCategories,
} from "@/lib/campaigns/queries";
import { SubmitApplicationForm } from "./submit-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const campaign = await getCampaignBySlug(slug);
  if (!campaign) return {};
  return {
    title: `${campaign.title} 응모 · YAGI`,
    description: `${campaign.title} 캠페인에 응모하세요.`,
    robots: { index: false },
  };
}

function ClosedCard({
  title,
  body,
  ctaLabel,
  ctaHref,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
      <h1 className="font-semibold tracking-display-ko text-2xl md:text-3xl keep-all">
        {title}
      </h1>
      <div className="rounded-card border border-edge-subtle bg-card p-8">
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {body}
        </p>
      </div>
      <Link
        href={ctaHref}
        className="text-sm text-foreground hover:underline underline-offset-2"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

export default async function CampaignSubmitPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("public_campaigns.submit");

  const campaign = await getCampaignBySlug(slug);
  if (!campaign) notFound();

  // Guard 1: not currently accepting submissions
  if (campaign.status !== "published") {
    return (
      <ClosedCard
        title={t("closed_title")}
        body={t("closed_body")}
        ctaLabel={t("back_to_campaign")}
        ctaHref={`/campaigns/${campaign.slug}`}
      />
    );
  }

  // Guard 2 (HIGH-5): no submission path open. Catch BEFORE the user fills
  // out the entire form only to discover the campaign accepts neither file
  // upload nor external URL. K-06 LOOP-1 #3 fix.
  if (!campaign.allow_r2_upload && !campaign.allow_external_url) {
    return (
      <ClosedCard
        title={t("no_path_available_title")}
        body={t("no_path_available_body")}
        ctaLabel={t("no_path_available_cta")}
        ctaHref={`/campaigns/${campaign.slug}`}
      />
    );
  }

  // Guard 3: no categories yet
  const categories = await getCampaignCategories(campaign.id);
  if (!categories || categories.length === 0) {
    return (
      <ClosedCard
        title={t("no_categories_title")}
        body={t("no_categories_body")}
        ctaLabel={t("back_to_campaign")}
        ctaHref={`/campaigns/${campaign.slug}`}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-8 py-12 space-y-8">
      <div className="space-y-3">
        <Link
          href={`/campaigns/${campaign.slug}`}
          className="text-xs text-muted-foreground hover:underline underline-offset-2"
        >
          ← {campaign.title}
        </Link>
        {/* HIGH-4: Pretendard 600 unified heading */}
        <h1 className="font-semibold tracking-display-ko text-2xl md:text-3xl keep-all">
          {t("page_title")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {t("page_intro")}
        </p>
      </div>

      <SubmitApplicationForm
        campaignSlug={campaign.slug}
        campaignTitle={campaign.title}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        allowR2Upload={campaign.allow_r2_upload}
        allowExternalUrl={campaign.allow_external_url}
      />
    </div>
  );
}
