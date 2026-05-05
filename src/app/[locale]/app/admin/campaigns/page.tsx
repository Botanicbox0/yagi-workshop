// Phase 7 Wave A.2 — /admin/campaigns list
//
// Status filter tabs: all / draft / published / submission_closed /
// distributing / archived.
//
// Page-level auth gate: notFound() for non-yagi_admin.
// Parent admin/layout.tsx already redirects non-admins; this is
// defence-in-depth per spec.

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
};

type CampaignRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  compensation_model: string | null;
  submission_open_at: string | null;
  submission_close_at: string | null;
  created_at: string;
};

const STATUS_VALUES = [
  "all",
  "draft",
  "published",
  "submission_closed",
  "distributing",
  "archived",
] as const;

function fmt(d: string | null, locale: string): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

export default async function AdminCampaignsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const selectedStatus = sp.status as string | undefined;

  // Auth gate
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
  if (!isAdmin) notFound();

  const t = await getTranslations("admin_campaigns");

  // Fetch campaigns via service-role (status col is yagi_admin only via RLS)
  const sbAdmin = createSupabaseService();
  let query = sbAdmin
    .from("campaigns")
    .select(
      "id, title, slug, status, compensation_model, submission_open_at, submission_close_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (selectedStatus && selectedStatus !== "all") {
    query = query.eq("status", selectedStatus);
  }

  const { data, error } = await query;
  const rows = (data ?? []) as CampaignRow[];

  return (
    <div className="px-10 py-12 max-w-5xl space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] keep-all">
          {t("title")}
        </h1>
        <Button size="pill" asChild>
          <Link href="/app/admin/campaigns/new">{t("new_cta")}</Link>
        </Button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_VALUES.map((val) => {
          const isActive = (selectedStatus ?? "all") === val;
          const href =
            val === "all"
              ? "/app/admin/campaigns"
              : `/app/admin/campaigns?status=${val}`;
          const labelKey = val === "all" ? "status_all" : (`status_${val.replace(/-/g, "_")}` as Parameters<typeof t>[0]);
          return (
            <Link key={val} href={href}>
              <Button
                size="sm"
                variant={isActive ? "default" : "outline"}
                className="rounded-full"
              >
                {val === "all" ? t("status_all") : t(labelKey)}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Error state */}
      {error ? (
        <div className="rounded-[24px] border border-border bg-muted p-4 text-sm text-muted-foreground">
          {t("toast_error")}
        </div>
      ) : null}

      {/* Empty state */}
      {!error && rows.length === 0 ? (
        <div className="rounded-[24px] border border-border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground keep-all">{t("list_empty")}</p>
        </div>
      ) : null}

      {/* Campaign table */}
      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-[24px] border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("form.title_label")}
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                  {t("status_filter_label")}
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  {t("form.compensation_model_label")}
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  {t("form.submission_open_at")}
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  {t("form.submission_close_at")}
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  &nbsp;
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-5 py-3 font-medium keep-all">
                    <Link
                      href={`/app/admin/campaigns/${row.id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {row.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 hidden sm:table-cell">
                    <StatusBadge status={row.status} draftLabel={t("draft_label")} publishedLabel={t("published_label")} />
                  </td>
                  <td className="px-5 py-3 text-muted-foreground text-[12px] hidden md:table-cell">
                    {row.compensation_model ?? "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-[12px] text-muted-foreground hidden lg:table-cell">
                    {fmt(row.submission_open_at, locale)}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-[12px] text-muted-foreground hidden lg:table-cell">
                    {fmt(row.submission_close_at, locale)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/app/admin/campaigns/${row.id}`}
                      className="text-sm text-foreground hover:underline underline-offset-2"
                    >
                      편집
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  draftLabel,
  publishedLabel,
}: {
  status: string;
  draftLabel: string;
  publishedLabel: string;
}) {
  if (status === "draft") {
    return <span className="text-[12px] text-muted-foreground">{draftLabel}</span>;
  }
  if (status === "published") {
    return <span className="text-[12px] text-[#71D083]">{publishedLabel}</span>;
  }
  return <span className="text-[12px] text-foreground/60">{status}</span>;
}
