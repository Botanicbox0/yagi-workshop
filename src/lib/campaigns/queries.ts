import { createSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
type CampaignCategoryRow =
  Database["public"]["Tables"]["campaign_categories"]["Row"];
type CampaignSubmissionRow =
  Database["public"]["Tables"]["campaign_submissions"]["Row"];
type CampaignDistributionRow =
  Database["public"]["Tables"]["campaign_distributions"]["Row"];

export type PublicCampaign = Pick<
  CampaignRow,
  | "id"
  | "slug"
  | "title"
  | "brief"
  | "status"
  | "submission_open_at"
  | "submission_close_at"
  | "external_sponsor_name"
  | "has_external_sponsor"
  | "reference_assets"
>;

export type CampaignCategory = Pick<
  CampaignCategoryRow,
  "id" | "name" | "description" | "display_order" | "format_spec"
>;

export type DistributionWithSubmission = CampaignDistributionRow & {
  submission: Pick<
    CampaignSubmissionRow,
    "id" | "title" | "applicant_name" | "team_name" | "thumbnail_r2_key"
  >;
};

/** Public statuses readable by anon+authenticated per RLS */
const PUBLIC_STATUSES = [
  "published",
  "submission_closed",
  "distributing",
  "archived",
] as const;

/** Statuses that show the distributed showcase gallery */
const SHOWCASE_STATUSES: string[] = ["distributing", "archived"];

export async function getCampaignsList(): Promise<PublicCampaign[]> {
  const supabase = await createSupabaseServer();

  const { data } = await supabase
    .from("campaigns")
    .select(
      "id, slug, title, brief, status, submission_open_at, submission_close_at, external_sponsor_name, has_external_sponsor, reference_assets"
    )
    .in("status", [...PUBLIC_STATUSES])
    .order("submission_open_at", { ascending: false, nullsFirst: false });

  return (data ?? []) as PublicCampaign[];
}

export async function getCampaignBySlug(
  slug: string
): Promise<CampaignRow | null> {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;

  // Only return if status is public-readable (RLS enforces too, but be explicit)
  if (!PUBLIC_STATUSES.includes(data.status as (typeof PUBLIC_STATUSES)[number]))
    return null;

  return data as CampaignRow;
}

export async function getCampaignCategories(
  campaignId: string
): Promise<CampaignCategory[]> {
  const supabase = await createSupabaseServer();

  const { data } = await supabase
    .from("campaign_categories")
    .select("id, name, description, display_order, format_spec")
    .eq("campaign_id", campaignId)
    .order("display_order", { ascending: true });

  return (data ?? []) as CampaignCategory[];
}

export async function getCampaignDistributions(
  campaignId: string,
  status: string
): Promise<DistributionWithSubmission[]> {
  if (!SHOWCASE_STATUSES.includes(status)) return [];

  const supabase = await createSupabaseServer();

  // Fetch distributed submissions for this campaign
  const { data: submissions } = await supabase
    .from("campaign_submissions")
    .select("id, title, applicant_name, team_name, thumbnail_r2_key")
    .eq("campaign_id", campaignId)
    .eq("status", "distributed");

  if (!submissions || submissions.length === 0) return [];

  const submissionIds = submissions.map((s) => s.id);

  const { data: distributions } = await supabase
    .from("campaign_distributions")
    .select("*")
    .in("submission_id", submissionIds)
    .order("created_at", { ascending: false });

  if (!distributions) return [];

  const submissionMap = new Map(submissions.map((s) => [s.id, s]));

  return distributions
    .map((d) => {
      const submission = submissionMap.get(d.submission_id);
      if (!submission) return null;
      return { ...d, submission } as DistributionWithSubmission;
    })
    .filter((d): d is DistributionWithSubmission => d !== null);
}
