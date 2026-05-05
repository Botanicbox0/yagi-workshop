// Phase 7 Wave C.1 — /campaigns/[slug]/submit (public submission form)
//
// Anon + authenticated callers. Server component fetches the campaign
// (RLS auto-filters non-published) + categories, then renders the
// SubmitApplicationForm client component.

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
    robots: { index: false }, // submission flow not indexable
  };
}

export default async function CampaignSubmitPage({ params }: Props) {
  const { slug } = await params;
  const t = await getTranslations("public_campaigns.submit");

  const campaign = await getCampaignBySlug(slug);
  if (!campaign) notFound();

  // Submission must be open
  if (campaign.status !== "published") {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
        <h1 className="font-semibold text-2xl keep-all">{t("closed_title")}</h1>
        <div className="rounded-[24px] border border-border bg-card p-8">
          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
            {t("closed_body")}
          </p>
        </div>
        <Link
          href={`/campaigns/${campaign.slug}`}
          className="text-sm text-foreground hover:underline underline-offset-2"
        >
          {t("back_to_campaign")}
        </Link>
      </div>
    );
  }

  const categories = await getCampaignCategories(campaign.id);
  if (!categories || categories.length === 0) {
    // No categories yet — admin hasn't authored them. Shouldn't happen for a
    // published campaign in practice; surface a friendly notice.
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-8 py-16 space-y-6">
        <h1 className="font-semibold text-2xl keep-all">{t("no_categories_title")}</h1>
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {t("no_categories_body")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 md:px-8 py-12 space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href={`/campaigns/${campaign.slug}`}
          className="text-xs text-muted-foreground hover:underline underline-offset-2"
        >
          ← {campaign.title}
        </Link>
        <h1
          className="font-semibold text-2xl md:text-3xl keep-all"
          style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
        >
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
