import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { AdminCampaignConsole } from "@/components/campaign/admin-campaign-console";
import type {
  AdminCampaignConsoleCampaign,
  AdminCampaignConsoleSubmission,
} from "@/components/campaign/admin-campaign-console";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

type CampaignRow = AdminCampaignConsoleCampaign;

type CategoryRow = {
  id: string;
  name: string;
};

type SubmissionRow = Omit<
  AdminCampaignConsoleSubmission,
  "category" | "decisions" | "distributions"
> & {
  category_id: string;
};

type DecisionRow = {
  id: string;
  submission_id: string;
  decision: "approved" | "declined" | "revision_requested";
  comment: string | null;
  decided_at: string;
};

type DistributionRow = AdminCampaignConsoleSubmission["distributions"][number] & {
  submission_id: string;
};

export default async function AdminCampaignDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "admin_campaigns" });
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isAdmin) {
    redirect({ href: "/app", locale });
    return null;
  }

  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- campaign tables type regen pending
  const sb = sbAdmin as any;
  const { data: campaignRaw } = await sb
    .from("campaigns")
    .select(
      "id, slug, title, status, submission_open_at, submission_close_at, distribution_starts_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (!campaignRaw) notFound();
  const campaign = campaignRaw as CampaignRow;

  const [{ data: categoriesRaw }, { data: submissionsRaw }] = await Promise.all([
    sb
      .from("campaign_categories")
      .select("id, name")
      .eq("campaign_id", campaign.id),
    sb
      .from("campaign_submissions")
      .select(
        [
          "id",
          "campaign_id",
          "category_id",
          "title",
          "description",
          "applicant_name",
          "applicant_email",
          "applicant_phone",
          "team_name",
          "external_url",
          "content_r2_key",
          "content_mime",
          "status",
          "submitted_at",
          "approved_at",
          "declined_at",
          "distributed_at",
        ].join(", "),
      )
      .eq("campaign_id", campaign.id)
      .order("submitted_at", { ascending: true }),
  ]);

  const categories = (categoriesRaw ?? []) as CategoryRow[];
  const submissions = (submissionsRaw ?? []) as SubmissionRow[];
  const submissionIds = submissions.map((submission) => submission.id);

  let decisions: DecisionRow[] = [];
  let distributions: DistributionRow[] = [];
  if (submissionIds.length > 0) {
    const [{ data: decisionsRaw }, { data: distributionsRaw }] =
      await Promise.all([
        sb
          .from("campaign_review_decisions")
          .select("id, submission_id, decision, comment, decided_at")
          .in("submission_id", submissionIds)
          .order("decided_at", { ascending: false }),
        sb
          .from("campaign_distributions")
          .select(
            "id, submission_id, channel, url, posted_at, view_count, like_count, comment_count, metric_logged_at, metric_log_notes",
          )
          .in("submission_id", submissionIds)
          .order("posted_at", { ascending: false }),
      ]);
    decisions = (decisionsRaw ?? []) as DecisionRow[];
    distributions = (distributionsRaw ?? []) as DistributionRow[];
  }

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const decisionsBySubmission = new Map<string, DecisionRow[]>();
  for (const decision of decisions) {
    const rows = decisionsBySubmission.get(decision.submission_id) ?? [];
    rows.push(decision);
    decisionsBySubmission.set(decision.submission_id, rows);
  }
  const distributionsBySubmission = new Map<string, DistributionRow[]>();
  for (const distribution of distributions) {
    const rows = distributionsBySubmission.get(distribution.submission_id) ?? [];
    rows.push(distribution);
    distributionsBySubmission.set(distribution.submission_id, rows);
  }

  const consoleSubmissions: AdminCampaignConsoleSubmission[] = submissions.map(
    (submission) => ({
      ...submission,
      category: categoryMap.get(submission.category_id) ?? null,
      decisions: (decisionsBySubmission.get(submission.id) ?? []).map((decision) => ({
        id: decision.id,
        decision: decision.decision,
        comment: decision.comment,
        decided_at: decision.decided_at,
      })),
      distributions: (distributionsBySubmission.get(submission.id) ?? []).map(
        (distribution) => ({
          id: distribution.id,
          channel: distribution.channel,
          url: distribution.url,
          posted_at: distribution.posted_at,
          view_count: distribution.view_count,
          like_count: distribution.like_count,
          comment_count: distribution.comment_count,
          metric_logged_at: distribution.metric_logged_at,
          metric_log_notes: distribution.metric_log_notes,
        }),
      ),
    }),
  );

  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href={`/${locale}/app/admin/campaigns`}
        className="mb-6 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("back_to_admin")}
      </Link>
      <AdminCampaignConsole campaign={campaign} submissions={consoleSubmissions} />
    </main>
  );
}
