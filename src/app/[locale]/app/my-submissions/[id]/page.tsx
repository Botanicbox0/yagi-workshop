// Phase 7 Wave C.3 — /app/my-submissions/[id]
//
// Detail page: applicant sees their own submission + decision/comment, and
// when status='approved_for_distribution' or 'distributed', the
// AddDistribution / DistributionsList client island handles the
// channel URL registration + manual metric log.

import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { objectPublicUrl } from "@/lib/r2/client";
import { DistributionPanel } from "./distribution-panel";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; id: string }> };

type SubmissionRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  submitted_at: string;
  approved_at: string | null;
  declined_at: string | null;
  distributed_at: string | null;
  applicant_workspace_id: string | null;
  content_r2_key: string | null;
  external_url: string | null;
  category_id: string;
  campaign: {
    id: string;
    title: string;
    slug: string;
    status: string;
  } | null;
  category: { id: string; name: string } | null;
};

type DecisionRow = {
  id: string;
  decision: string;
  comment: string | null;
  decided_at: string;
};

type DistributionRow = {
  id: string;
  channel: string;
  url: string;
  posted_at: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  metric_logged_at: string | null;
};

function statusPillClass(status: string): string {
  switch (status) {
    case "submitted":
      return "border-border text-muted-foreground bg-muted/40";
    case "approved_for_distribution":
      return "border-transparent bg-sage-soft text-sage-ink";
    case "declined":
      return "border-transparent bg-muted text-muted-foreground";
    case "revision_requested":
      return "border-border text-foreground bg-card";
    case "distributed":
      return "border-transparent bg-sage text-sage-ink";
    case "withdrawn":
      return "border-transparent bg-muted text-muted-foreground opacity-60";
    default:
      return "border-border text-muted-foreground";
  }
}

function fmtDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export default async function MySubmissionDetailPage({ params }: Props) {
  const { locale, id } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/signin?next=/${locale}/app/my-submissions/${id}`);

  const t = await getTranslations("my_submissions");

  // Fetch the submission with RLS auto-scoping (applicant policy + admin)
  const { data: submission } = await supabase
    .from("campaign_submissions")
    .select(
      `id, title, description, status, submitted_at, approved_at, declined_at, distributed_at,
       applicant_workspace_id, content_r2_key, external_url, category_id,
       campaign:campaigns(id, title, slug, status),
       category:campaign_categories(id, name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!submission) notFound();
  const sub = submission as SubmissionRow;

  // Pull review decision via service-role: campaign_review_decisions RLS is
  // yagi_admin only. Show the latest entry to the applicant since they own
  // the submission and the review outcome is meant for them.
  const sbAdmin = createSupabaseService();
  const { data: decisions } = await sbAdmin
    .from("campaign_review_decisions")
    .select("id, decision, comment, decided_at")
    .eq("submission_id", sub.id)
    .order("decided_at", { ascending: false })
    .limit(1);
  const latestDecision = (decisions?.[0] ?? null) as DecisionRow | null;

  // Fetch own distributions
  const { data: distributions } = await supabase
    .from("campaign_distributions")
    .select(
      "id, channel, url, posted_at, view_count, like_count, comment_count, metric_logged_at",
    )
    .eq("submission_id", sub.id)
    .order("posted_at", { ascending: false });
  const distRows = (distributions ?? []) as DistributionRow[];

  const showAddDistribution =
    sub.status === "approved_for_distribution" || sub.status === "distributed";
  const previewUrl = sub.content_r2_key
    ? objectPublicUrl(sub.content_r2_key)
    : sub.external_url;

  return (
    <div className="px-6 md:px-10 py-12 max-w-3xl space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/app/my-submissions"
          className="text-xs text-muted-foreground hover:underline underline-offset-2"
        >
          ← {t("title")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1
            className="font-semibold text-2xl md:text-3xl keep-all"
            style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
          >
            {sub.title}
          </h1>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(sub.status)}`}
          >
            {t(`status.${sub.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {sub.campaign?.title} · {sub.category?.name} ·{" "}
          {fmtDate(sub.submitted_at, locale)}
        </p>
      </div>

      {/* Work preview */}
      {previewUrl && (
        <section className="rounded-[24px] border border-border bg-card p-4">
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-foreground hover:underline underline-offset-2 break-all"
          >
            {previewUrl}
          </a>
        </section>
      )}
      {sub.description && (
        <section className="rounded-[24px] border border-border bg-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            {t("detail.description_label")}
          </h2>
          <p className="text-sm text-foreground keep-all leading-relaxed whitespace-pre-wrap">
            {sub.description}
          </p>
        </section>
      )}

      {/* Decision */}
      {latestDecision && (
        <section className="rounded-[24px] border border-border bg-card p-6 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.decision_label")}
          </h2>
          <p className="text-sm font-semibold keep-all">
            {t(`detail.decision.${latestDecision.decision}` as Parameters<typeof t>[0])}
          </p>
          {latestDecision.comment && (
            <p className="text-sm text-muted-foreground keep-all leading-relaxed whitespace-pre-wrap">
              {latestDecision.comment}
            </p>
          )}
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {fmtDate(latestDecision.decided_at, locale)}
          </p>
        </section>
      )}

      {/* Distribution panel — channel registration + metric log */}
      {showAddDistribution && (
        <DistributionPanel
          submissionId={sub.id}
          status={sub.status}
          distributions={distRows}
        />
      )}
    </div>
  );
}
