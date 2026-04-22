import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; year?: string; month?: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  supply_date: string;
  issue_date: string | null;
  paid_at: string | null;
  total_krw: number;
  is_mock: boolean;
  project: { title: string } | null;
  workspace: { name: string } | null;
};

function getStatusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "issued":
      return "default";
    case "paid":
      return "outline";
    case "void":
      return "destructive";
    default:
      return "secondary";
  }
}

function lastDayOfMonth(year: string, month: string): string {
  const y = Number(year);
  const m = Number(month);
  // last day = first day of next month - 1 day
  const d = new Date(Date.UTC(y, m, 0));
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${dd}`;
}

export default async function InvoicesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const t = await getTranslations({ locale, namespace: "invoices" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // Detect yagi_admin (controls "+ New invoice" button)
  const { data: yagiAdminRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = !!(yagiAdminRows && yagiAdminRows.length > 0);

  // RLS handles visibility (non-yagi sees only non-draft/non-mock rows)
  let query = supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      status,
      supply_date,
      issue_date,
      paid_at,
      total_krw,
      is_mock,
      project:projects(title),
      workspace:workspaces(name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.year && sp.month) {
    const start = `${sp.year}-${sp.month}-01`;
    const end = lastDayOfMonth(sp.year, sp.month);
    query = query.gte("issue_date", start).lte("issue_date", end);
  }

  const { data: invoicesData, error } = await query;

  if (error) {
    console.error("[InvoicesPage] Supabase error:", error.message);
  }

  // postgrest may return nested joins as an array OR a single object
  const invoices: InvoiceRow[] = (invoicesData ?? []).map((row) => {
    const proj = row.project as
      | { title: string }
      | { title: string }[]
      | null
      | undefined;
    const ws = row.workspace as
      | { name: string }
      | { name: string }[]
      | null
      | undefined;
    return {
      id: row.id,
      invoice_number: row.invoice_number,
      status: row.status,
      supply_date: row.supply_date,
      issue_date: row.issue_date,
      paid_at: row.paid_at,
      total_krw: row.total_krw,
      is_mock: row.is_mock,
      project: Array.isArray(proj) ? (proj[0] ?? null) : (proj ?? null),
      workspace: Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null),
    };
  });

  const dateFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const currencyFmt = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  });

  const statuses = ["draft", "issued", "paid", "void"] as const;

  // Year/month filter options: current year and previous year
  const now = new Date();
  const currentYear = now.getFullYear();
  const yearOptions = [currentYear, currentYear - 1].map(String);
  const monthOptions = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("list_title")}</em>
        </h1>
        {isYagiAdmin && (
          <Link
            href="/app/invoices/new"
            className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {t("new")}
          </Link>
        )}
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-6 flex-wrap">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("filter_status")}
        >
          <option value="">{t("filter_all")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
        <select
          name="year"
          defaultValue={sp.year ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("filter_year")}
        >
          <option value="">{t("filter_year")}</option>
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          name="month"
          defaultValue={sp.month ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          aria-label={t("filter_month")}
        >
          <option value="">{t("filter_month")}</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-full uppercase tracking-[0.12em] px-4 py-1.5 border border-input bg-background text-foreground hover:bg-accent text-sm font-medium transition-colors"
        >
          {t("filter_status")}
        </button>
      </form>

      {/* Empty state */}
      {invoices.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            <em>{t("list_empty")}</em>
          </p>
          {isYagiAdmin && (
            <Link
              href="/app/invoices/new"
              className="mt-4 rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
            >
              {t("new")}
            </Link>
          )}
        </div>
      )}

      {/* Invoices table */}
      {invoices.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("invoice_number_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  {t("project_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  {t("buyer_label")}
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  {t("total_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("filter_status")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("issue_date_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("paid_at_label")}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b border-border last:border-0 hover:bg-accent transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                      }
                      className="font-medium hover:underline keep-all line-clamp-1 tabular-nums"
                    >
                      {inv.invoice_number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[180px]">
                    {inv.project?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">
                    {inv.workspace?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {currencyFmt.format(inv.total_krw)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={getStatusBadgeVariant(inv.status)}
                        className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
                      >
                        {t(
                          `status_${inv.status}` as
                            | "status_draft"
                            | "status_issued"
                            | "status_paid"
                            | "status_void"
                        )}
                      </Badge>
                      {inv.is_mock && (
                        <Badge
                          variant="outline"
                          className="rounded-full text-[10px] px-2 py-0.5 border-amber-300 text-amber-700 bg-amber-50"
                        >
                          {t("mock_badge")}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap tabular-nums">
                    {inv.issue_date
                      ? dateFmt.format(new Date(inv.issue_date))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap tabular-nums">
                    {inv.paid_at ? dateFmt.format(new Date(inv.paid_at)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
