// Wave C v2 — /app/my-submissions (creator dashboard list)
//
// HIGH-4: Pretendard 600 unified heading (was font-display Fraunces).
// MED-7: status pill via centralized helper (kind: campaign_submission).

import { notFound, redirect } from "next/navigation";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { statusPillClass } from "@/lib/ui/status-pill";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

type SubmissionRow = {
  id: string;
  title: string;
  status: string;
  submitted_at: string;
  campaign: { id: string; title: string; slug: string } | null;
};

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

  // RLS scopes via campaign_submissions_select_applicant — workspace_member
  // of applicant_workspace_id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sb = supabase as any;
  const { data: rows } = await sb
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
      <div className="space-y-3">
        {/* HIGH-4: Pretendard 600 unified heading */}
        <h1 className="font-semibold tracking-display-ko text-2xl md:text-3xl keep-all">
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
        <div className="rounded-card border border-edge-subtle bg-card p-10 text-center">
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
              className="rounded-card border border-edge-subtle bg-card p-5 hover:border-foreground/20 transition-colors"
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
                {/* MED-7: centralized status pill helper, sage swap correct */}
                <span
                  className={`inline-flex items-center rounded-pill px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass("campaign_submission", row.status)}`}
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
