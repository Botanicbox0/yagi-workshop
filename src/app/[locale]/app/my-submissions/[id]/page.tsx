// Wave C v2 — /app/my-submissions/[id]
//
// Detail page: renders WorkPreview (HIGH-3 MIME-aware) + decision card +
// DistributionPanel (MED-6 sage CTA + MED-9 Pencil edit affordance).

import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { statusPillClass } from "@/lib/ui/status-pill";
import { DistributionPanel } from "./distribution-panel";
import { WorkPreview } from "./work-preview";

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
  content_mime: string | null;
  external_url: string | null;
  category_id: string;
  campaign: { id: string; title: string; slug: string; status: string } | null;
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
  if (!user) {
    redirect(`/${locale}/signin?next=/${locale}/app/my-submissions/${id}`);
  }

  const t = await getTranslations("my_submissions");

  // RLS auto-scopes via campaign_submissions_select_applicant.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sb = supabase as any;
  const { data: submission } = await sb
    .from("campaign_submissions")
    .select(
      `id, title, description, status, submitted_at, approved_at, declined_at, distributed_at,
       applicant_workspace_id, content_r2_key, content_mime, external_url, category_id,
       campaign:campaigns(id, title, slug, status),
       category:campaign_categories(id, name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (!submission) notFound();
  const sub = submission as SubmissionRow;

  // campaign_review_decisions RLS is yagi_admin only — fetch via service-role
  // so the applicant can see the decision targeted at them. Latest entry only.
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sbAdminAny = sbAdmin as any;
  const { data: decisions } = await sbAdminAny
    .from("campaign_review_decisions")
    .select("id, decision, comment, decided_at")
    .eq("submission_id", sub.id)
    .order("decided_at", { ascending: false })
    .limit(1);
  const latestDecision = (decisions?.[0] ?? null) as DecisionRow | null;

  // Own distributions via session client (RLS scopes via parent submission
  // applicant_workspace_id membership).
  const { data: distributions } = await sb
    .from("campaign_distributions")
    .select(
      "id, channel, url, posted_at, view_count, like_count, comment_count, metric_logged_at",
    )
    .eq("submission_id", sub.id)
    .order("posted_at", { ascending: false });
  const distRows = (distributions ?? []) as DistributionRow[];

  const showDistributionPanel =
    sub.status === "approved_for_distribution" || sub.status === "distributed";

  return (
    <div className="px-6 md:px-10 py-12 max-w-3xl space-y-10">
      <div className="space-y-3">
        <Link
          href="/app/my-submissions"
          className="text-xs text-muted-foreground hover:underline underline-offset-2"
        >
          ← {t("title")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* HIGH-4: Pretendard 600 unified */}
          <h1 className="font-semibold tracking-display-ko text-2xl md:text-3xl keep-all">
            {sub.title}
          </h1>
          {/* MED-7: status pill via centralized helper */}
          <span
            className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass("campaign_submission", sub.status)}`}
          >
            {t(`status.${sub.status}` as Parameters<typeof t>[0])}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {sub.campaign?.title} · {sub.category?.name} ·{" "}
          {fmtDate(sub.submitted_at, locale)}
        </p>
      </div>

      {/* HIGH-3: WorkPreview MIME-aware */}
      <WorkPreview
        contentR2Key={sub.content_r2_key}
        contentMime={sub.content_mime}
        externalUrl={sub.external_url}
        emptyLabel={t("detail.preview_empty")}
        openLabel={t("detail.preview_open")}
      />

      {sub.description && (
        <section className="rounded-card border border-edge-subtle bg-card p-6">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            {t("detail.description_label")}
          </h2>
          <p className="text-sm text-foreground keep-all leading-relaxed whitespace-pre-wrap">
            {sub.description}
          </p>
        </section>
      )}

      {latestDecision && (
        <section className="rounded-card border border-edge-subtle bg-card p-6 space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("detail.decision_label")}
          </h2>
          <p className="text-sm font-semibold keep-all">
            {t(
              `detail.decision.${latestDecision.decision}` as Parameters<typeof t>[0],
            )}
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

      {showDistributionPanel && (
        <DistributionPanel
          submissionId={sub.id}
          status={sub.status}
          distributions={distRows}
        />
      )}
    </div>
  );
}
