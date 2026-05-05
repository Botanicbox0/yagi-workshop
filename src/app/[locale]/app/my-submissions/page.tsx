// Phase 7 Wave C.3 — /app/my-submissions
//
// Creator dashboard surface. Lists the active workspace's own submissions
// (RLS campaign_submissions_select_applicant scopes to applicant_workspace_id
// memberships). Empty state for both "no creator workspace yet" and "creator
// workspace but no submissions" cases.

import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

type SubmissionRow = {
  id: string;
  title: string;
  status: string;
  submitted_at: string;
  campaign: {
    id: string;
    title: string;
    slug: string;
  } | null;
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

export default async function MySubmissionsPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/signin?next=/${locale}/app/my-submissions`);

  const active = await resolveActiveWorkspace(user.id);
  if (!active) notFound();

  const t = await getTranslations("my_submissions");

  // Fetch the user's own submissions (any workspace they're a member of —
  // scoped via the RLS applicant policy).
  const { data: rows } = await supabase
    .from("campaign_submissions")
    .select(
      `id, title, status, submitted_at,
       campaign:campaigns(id, title, slug)`,
    )
    .order("submitted_at", { ascending: false })
    .limit(50);

  const submissions = (rows ?? []) as SubmissionRow[];

  return (
    <div className="px-6 md:px-10 py-12 max-w-3xl space-y-10">
      {/* Header */}
      <div className="space-y-3">
        <h1
          className="font-display text-3xl md:text-4xl tracking-tight keep-all"
          style={{ lineHeight: "1.18", letterSpacing: "-0.01em" }}
        >
          {t("title")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all leading-relaxed">
          {t("intro")}
        </p>
        {active.kind === "creator" && (
          <p className="text-xs text-muted-foreground">
            {t("workspace_label")}:{" "}
            <span className="font-medium text-foreground">{active.name}</span>
          </p>
        )}
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-[24px] border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground keep-all leading-relaxed">
            {t("empty_body")}
          </p>
          <Link
            href="/campaigns"
            className="inline-block mt-4 text-sm text-foreground hover:underline underline-offset-2"
          >
            {t("empty_browse_cta")} →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {submissions.map((row) => (
            <li
              key={row.id}
              className="rounded-[24px] border border-border bg-card p-5 hover:border-foreground/20 transition-colors"
            >
              <Link
                href={`/app/my-submissions/${row.id}`}
                className="flex items-start justify-between gap-4"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-sm font-semibold keep-all truncate">
                    {row.title}
                  </p>
                  <p className="text-xs text-muted-foreground keep-all truncate">
                    {row.campaign?.title ?? t("campaign_unknown")}
                  </p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {fmtDate(row.submitted_at, locale)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(row.status)}`}
                >
                  {t(`status.${row.status}` as Parameters<typeof t>[0])}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
