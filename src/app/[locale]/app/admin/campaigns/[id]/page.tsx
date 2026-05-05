// Phase 7 Wave A.2 — /admin/campaigns/[id] — detail + edit + publish
//
// Server Component wrapper: fetches campaign + categories, then renders
// the CampaignEditClient for interactive editing.
//
// Page-level auth gate: notFound() for non-yagi_admin.

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { CampaignEditClient } from "./_components/campaign-edit-client";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminCampaignDetailPage({ params }: Props) {
  const { id } = await params;

  // Auth gate
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
  if (!isAdmin) notFound();

  const t = await getTranslations("admin_campaigns");

  // Fetch campaign
  const sbAdmin = createSupabaseService();
  const { data: campaign, error: campaignErr } = await sbAdmin
    .from("campaigns")
    .select(
      "id, title, slug, status, description, brief, reference_assets, allow_r2_upload, allow_external_url, compensation_model, compensation_metadata, submission_open_at, submission_close_at, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (campaignErr || !campaign) notFound();

  // Fetch categories
  const { data: categoriesData } = await sbAdmin
    .from("campaign_categories")
    .select("id, name, description, format_spec, display_order")
    .eq("campaign_id", id)
    .order("display_order", { ascending: true });

  const categories = categoriesData ?? [];

  return (
    <CampaignEditClient
      campaign={campaign as Parameters<typeof CampaignEditClient>[0]["campaign"]}
      categories={categories as Parameters<typeof CampaignEditClient>[0]["categories"]}
      t={{
        title: t("title"),
        draftLabel: t("draft_label"),
        publishedLabel: t("published_label"),
        publishCta: t("publish_cta"),
        formTitleLabel: t("form.title_label"),
        formDescriptionLabel: t("form.description_label"),
        formBriefLabel: t("form.brief_label"),
        formReferenceAssetsLabel: t("form.reference_assets_label"),
        formCategoriesLabel: t("form.categories_label"),
        formFilePolicyLabel: t("form.file_policy_label"),
        formAllowR2Upload: t("form.allow_r2_upload"),
        formAllowExternalUrl: t("form.allow_external_url"),
        formCompensationModelLabel: t("form.compensation_model_label"),
        formExposureOnly: t("form.exposure_only"),
        formFixedFee: t("form.fixed_fee"),
        formRoyaltyShare: t("form.royalty_share"),
        formSubmissionOpenAt: t("form.submission_open_at"),
        formSubmissionCloseAt: t("form.submission_close_at"),
        formSubmitSave: t("form.submit_save"),
        formAddAsset: t("form.add_asset"),
        formRemoveAsset: t("form.remove_asset"),
        formAddCategory: t("form.add_category"),
        formRemoveCategory: t("form.remove_category"),
        formCategoryNameLabel: t("form.category_name_label"),
        formCategoryDescLabel: t("form.category_description_label"),
        formCategoryFormatLabel: t("form.category_format_label"),
        formFixedFeePerCreator: t("form.fixed_fee_per_creator_label"),
        toastSaved: t("toast_saved"),
        toastPublished: t("toast_published"),
        toastError: t("toast_error"),
      }}
    />
  );
}
