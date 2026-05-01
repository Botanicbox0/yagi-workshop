// Phase 4.x task_05 — Brand workspace dashboard (/app/dashboard).
//
// Renders 3 count cards (total / in-progress / delivered) + 5 most
// recent RFPs scoped to the active workspace via workspace_members
// RLS. Server-only data fetch.
//
// Authorization: any workspace member can view their own workspace's
// dashboard. Cross-workspace SELECT is blocked by projects RLS (the
// SELECT policy already enforces workspace_member). The workspace_id
// comes from the user's first workspace membership (Phase 4 has
// single active workspace via cookie in task_06; for now Phase 4
// uses first-membership as the implicit active).
//
// Design v1.0: 1280 max-width, achromatic + sage single accent (only
// on in-flight status pills inside RfpRowCard), Pretendard, radius 24
// cards, zero shadow.
//
// Empty state surfaces a calm "no RFPs yet" + a CTA to start a new
// project. Critical: empty state must not leak counts or names from
// other workspaces.

import Link from "next/link";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CountCards } from "@/components/dashboard/count-cards";
import { RfpRowCard } from "@/components/dashboard/rfp-row-card";

type Props = {
  params: Promise<{ locale: string }>;
};

type RecentProjectRow = {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  budget_band: string | null;
  twin_intent: string | null;
  created_at: string;
};

const IN_PROGRESS_STATUSES = [
  "in_review",
  "submitted",
  "in_progress",
  "in_revision",
];

function narrowTwinIntentLabel(
  value: string | null,
  map: Record<string, string>,
): string | null {
  if (!value) return null;
  return map[value] ?? null;
}

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
  const t = await getTranslations({ locale, namespace: "dashboard_v4" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/signin`);

  // Resolve active workspace: Phase 4 uses the user's first membership
  // as the implicit active workspace. task_06 introduces an explicit
  // cookie-based switcher; until then, use the first row.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership?.workspace_id) {
    redirect(`/${locale}/onboarding`);
  }
  const workspaceId = membership!.workspace_id;

  // Phase 3.0/4.x columns not in generated types -> any-cast (consistent with detail page).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns not in generated types
  const sb = supabase as any;

  // Counts: total, in-progress, delivered
  const [{ count: totalCount }, { count: inProgressCount }, { count: deliveredCount }] =
    await Promise.all([
      sb
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("status", "archived"),
      sb
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .in("status", IN_PROGRESS_STATUSES),
      sb
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("status", "delivered"),
    ]);

  const total = totalCount ?? 0;
  const inProgress = inProgressCount ?? 0;
  const delivered = deliveredCount ?? 0;

  // Recent 5 RFPs (created_at DESC).
  const { data: recentRaw } = (await sb
    .from("projects")
    .select(
      "id, title, brief, status, budget_band, twin_intent, created_at"
    )
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(5)) as { data: RecentProjectRow[] | null };

  const recent: RecentProjectRow[] = recentRaw ?? [];
  if (!recent && totalCount === null) notFound();

  const fmt = new Intl.DateTimeFormat(localeNarrow === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: localeNarrow === "ko" ? "long" : "short",
    day: "numeric",
  });

  const statusMap: Record<string, string> = {
    draft: t("status.draft"),
    submitted: t("status.submitted"),
    in_review: t("status.in_review"),
    in_progress: t("status.in_progress"),
    in_revision: t("status.in_revision"),
    delivered: t("status.delivered"),
    approved: t("status.approved"),
    cancelled: t("status.cancelled"),
    archived: t("status.archived"),
  };
  const budgetMap: Record<string, string> = {
    under_1m: t("budget.under_1m"),
    "1m_to_5m": t("budget.1m_to_5m"),
    "5m_to_10m": t("budget.5m_to_10m"),
    negotiable: t("budget.negotiable"),
  };
  const twinIntentMap: Record<string, string> = {
    undecided: t("twin_intent.undecided"),
    specific_in_mind: t("twin_intent.specific_in_mind"),
    no_twin: t("twin_intent.no_twin"),
  };
  const separator = "·";

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
      {/* L1 Page header */}
      <div className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground keep-all mb-2">
            {t("eyebrow")}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground keep-all" style={{ letterSpacing: "-0.01em" }}>
            {t("title")}
          </h1>
        </div>
        <Link
          href={`/${locale}/app/projects/new`}
          className="inline-flex items-center rounded-full border border-border/40 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.04] transition-colors"
        >
          {t("cta_new")}
        </Link>
      </div>

      {/* L2 Count cards */}
      <div className="mb-12">
        <CountCards
          total={total}
          inProgress={inProgress}
          delivered={delivered}
          labels={{
            total: t("count.total"),
            inProgress: t("count.in_progress"),
            delivered: t("count.delivered"),
          }}
        />
      </div>

      {/* L3 Recent projects */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm uppercase tracking-[0.10em] text-muted-foreground keep-all">
            {t("recent_projects.title")}
          </h2>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-3xl border border-border/40 px-8 py-16 flex flex-col items-center text-center">
            <p
              className="text-[22px] font-semibold text-foreground keep-all"
              style={{ letterSpacing: "-0.01em", lineHeight: 1.2 }}
            >
              {t("recent_projects.empty_headline")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground keep-all">
              {t("recent_projects.empty_subtitle")}
            </p>
            <Link
              href={`/${locale}/app/projects/new`}
              className="mt-6 inline-flex items-center rounded-full border border-border/40 px-5 py-2 text-sm font-medium text-foreground hover:bg-foreground/[0.04] transition-colors"
            >
              {t("recent_projects.empty_cta")}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3" role="list">
            {recent.map((p) => {
              const budgetLabel = p.budget_band
                ? budgetMap[p.budget_band] ?? p.budget_band
                : t("not_set");
              const statusLabel = statusMap[p.status] ?? p.status;
              const twinIntentLabel = narrowTwinIntentLabel(
                p.twin_intent,
                twinIntentMap,
              );
              return (
                <li key={p.id}>
                  <RfpRowCard
                    href={`/${locale}/app/projects/${p.id}`}
                    title={p.title}
                    description={p.brief}
                    status={p.status}
                    statusLabel={statusLabel}
                    createdAtFormatted={fmt.format(new Date(p.created_at))}
                    budgetLabel={budgetLabel}
                    twinIntentLabel={twinIntentLabel}
                    separator={separator}
                  />
                </li>
              );
            })}
          </ul>
        )}
        {recent.length > 0 && (
          <div className="mt-6 text-right">
            <Link
              href={`/${locale}/app/projects`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground keep-all"
            >
              {t("view_all")} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
