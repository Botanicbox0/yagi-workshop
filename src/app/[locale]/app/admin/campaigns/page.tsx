import Link from "next/link";
import { redirect } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import {
  TestDataToggle,
  TestWorkspaceBadge,
} from "@/components/admin/test-data-toggle";
import { shouldIncludeTestData } from "@/lib/admin/test-data";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ includeTest?: string | string[] }>;
};

type CampaignRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  updated_at: string;
  submission_close_at: string | null;
  sponsor: { is_test?: boolean } | null;
};

type SubmissionCountRow = {
  campaign_id: string;
  status: string;
};

export default async function AdminCampaignsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const includeTest = shouldIncludeTestData(await searchParams);
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
  const campaignsQuery = sb
      .from("campaigns")
      .select(
        "id, slug, title, status, updated_at, submission_close_at, sponsor:workspaces!campaigns_sponsor_workspace_id_fkey(is_test)",
      )
      .order("updated_at", { ascending: false });

  const [{ data: campaignsRaw }, { data: submissionsRaw }] = await Promise.all([
    campaignsQuery,
    sb.from("campaign_submissions").select("campaign_id, status"),
  ]);

  const campaigns = ((campaignsRaw ?? []) as CampaignRow[]).filter(
    (campaign) => includeTest || campaign.sponsor?.is_test !== true,
  ).slice(0, 50);
  const campaignIds = new Set(campaigns.map((campaign) => campaign.id));
  const submissions = ((submissionsRaw ?? []) as SubmissionCountRow[]).filter((row) =>
    campaignIds.has(row.campaign_id),
  );
  const countMap = new Map<
    string,
    { submitted: number; approved: number; distributed: number; total: number }
  >();
  for (const row of submissions) {
    const current =
      countMap.get(row.campaign_id) ?? {
        submitted: 0,
        approved: 0,
        distributed: 0,
        total: 0,
      };
    current.total += 1;
    if (row.status === "submitted") current.submitted += 1;
    if (row.status === "approved_for_distribution") current.approved += 1;
    if (row.status === "distributed") current.distributed += 1;
    countMap.set(row.campaign_id, current);
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-label text-brand">
          {t("admin_eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold text-foreground keep-all sm:text-4xl">
          {t("admin_title")}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
          {t("admin_description")}
        </p>
        <TestDataToggle
          baseHref="/app/admin/campaigns"
          includeTest={includeTest}
          label={t(includeTest ? "test_data_on" : "test_data_off")}
          showLabel={t("test_data_show")}
          hideLabel={t("test_data_hide")}
        />
      </header>

      {campaigns.length === 0 ? (
        <section className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-10 text-center">
          <p className="text-sm text-muted-foreground">{t("empty_campaigns")}</p>
        </section>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((campaign) => {
            const counts = countMap.get(campaign.id) ?? {
              submitted: 0,
              approved: 0,
              distributed: 0,
              total: 0,
            };
            return (
              <li
                key={campaign.id}
                className="rounded-lg border border-border/70 bg-surface-raised p-5 transition-colors hover:border-brand/40"
              >
                <Link href={`/${locale}/app/admin/campaigns/${campaign.slug}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="mb-2 text-xs text-muted-foreground">
                        {dateFmt.format(new Date(campaign.updated_at))}
                      </p>
                      <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate text-lg font-semibold text-foreground">
                          {campaign.title}
                        </h2>
                        {campaign.sponsor?.is_test && (
                          <TestWorkspaceBadge label={t("test_badge")} />
                        )}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        campaign.status === "archived"
                          ? "bg-muted text-muted-foreground"
                          : "bg-brand-soft text-brand",
                      )}
                    >
                      {t(`campaign_status.${campaign.status}` as never)}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-4 gap-2 border-t border-border/70 pt-4">
                    <MiniCount label={t("metric_total")} value={counts.total} />
                    <MiniCount label={t("metric_submitted")} value={counts.submitted} />
                    <MiniCount label={t("metric_approved")} value={counts.approved} />
                    <MiniCount label={t("metric_distributed")} value={counts.distributed} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function MiniCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground truncate">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}
