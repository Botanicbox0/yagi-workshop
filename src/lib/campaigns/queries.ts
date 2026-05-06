// Wave C v2 — campaign read helpers (public + auth surfaces).
//
// Defensive `any` casts because the campaigns/* tables aren't in
// generated types yet (regen pending after STEP 0 base migration apply).

import { createSupabaseServer } from "@/lib/supabase/server";

export type PublicCampaign = {
  id: string;
  slug: string;
  title: string;
  brief: string | null;
  status: string;
  allow_r2_upload: boolean;
  allow_external_url: boolean;
  submission_open_at: string | null;
  submission_close_at: string | null;
  reference_assets: unknown;
};

export type CampaignCategory = {
  id: string;
  name: string;
  description: string | null;
  display_order: number | null;
  format_spec: unknown;
};

const PUBLIC_STATUSES = ["published", "submission_closed", "distributing", "archived"];

export async function getCampaignBySlug(slug: string): Promise<PublicCampaign | null> {
  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sb = supabase as any;
  const { data, error } = await sb
    .from("campaigns")
    .select(
      "id, slug, title, brief, status, allow_r2_upload, allow_external_url, submission_open_at, submission_close_at, reference_assets",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  if (!PUBLIC_STATUSES.includes(data.status)) return null;
  return data as PublicCampaign;
}

export async function getCampaignCategories(campaignId: string): Promise<CampaignCategory[]> {
  const supabase = await createSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sb = supabase as any;
  const { data } = await sb
    .from("campaign_categories")
    .select("id, name, description, display_order, format_spec")
    .eq("campaign_id", campaignId)
    .order("display_order", { ascending: true });
  return (data ?? []) as CampaignCategory[];
}
