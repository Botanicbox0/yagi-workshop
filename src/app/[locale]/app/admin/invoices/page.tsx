import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

type InvoiceListRow = {
  id: string;
  invoice_number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_krw: number;
  is_mock: boolean;
  project: { title: string } | null;
  workspace: { name: string } | null;
};

type StatusCountRow = {
  id: string;
  status: string;
};

type AggregateRow = {
  total_krw: number;
};

type InvoiceStatus = "draft" | "issued" | "paid" | "void";

function todayKstDateStr(): string {
  const now = new Date();
  const kst = new Date(
    now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60_000
  );
  return kst.toISOString().slice(0, 10);
}

function firstOfMonthKstStr(): string {
  const today = todayKstDateStr();
  return `${today.slice(0, 7)}-01`;
}

function firstOfYearKstStr(): string {
  const today = todayKstDateStr();
  return `${today.slice(0, 4)}-01-01`;
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "draft":
      return "border-transparent bg-muted text-muted-foreground";
    case "issued":
      return "border-transparent bg-blue-100 text-blue-700";
    case "paid":
      return "border-transparent bg-green-100 text-green-700";
    case "void":
      return "border-transparent bg-red-100 text-red-700";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

function normalizeJoin<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toInvoiceRow(row: {
  id: string;
  invoice_number: string | null;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  total_krw: number;
  is_mock: boolean;
  project: { title: string } | { title: string }[] | null;
  workspace: { name: string } | { name: string }[] | null;
}): InvoiceListRow {
  return {
    id: row.id,
    invoice_number: row.invoice_number,
    status: row.status,
    issue_date: row.issue_date,
    due_date: row.due_date,
    total_krw: row.total_krw,
    is_mock: row.is_mock,
    project: normalizeJoin(row.project),
    workspace: normalizeJoin(row.workspace),
  };
}

export default async function AdminInvoicesPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (!roles || roles.length === 0) notFound();

  const t = await getTranslations({ locale, namespace: "admin.invoices" });
  const tInvoices = await getTranslations({ locale, namespace: "invoices" });

  const today = todayKstDateStr();
  const firstOfMonth = firstOfMonthKstStr();
  const firstOfYear = firstOfYearKstStr();

  // Parallel queries
  const [
    mockAggRes,
    mtdAggRes,
    ytdAggRes,
    overdueAggRes,
    mockListRes,
    overdueListRes,
    statusBreakdownRes,
  ] = await Promise.all([
    // 1a. mock_count + sum
    supabase
      .from("invoices")
      .select("total_krw", { count: "exact" })
      .eq("is_mock", true)
      .in("status", ["issued", "paid"]),

    // 1b. MTD issued total
    supabase
      .from("invoices")
      .select("total_krw")
      .in("status", ["issued", "paid"])
      .gte("issue_date", firstOfMonth),

    // 1c. YTD issued total
    supabase
      .from("invoices")
      .select("total_krw")
      .in("status", ["issued", "paid"])
      .gte("issue_date", firstOfYear),

    // 1d. Overdue count + sum
    supabase
      .from("invoices")
      .select("total_krw", { count: "exact" })
      .eq("status", "issued")
      .not("due_date", "is", null)
      .lt("due_date", today),

    // 2. Mock invoices list
    supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        total_krw,
        is_mock,
        project:projects(title),
        workspace:workspaces(name)
      `
      )
      .eq("is_mock", true)
      .in("status", ["issued", "paid"])
      .order("issue_date", { ascending: true, nullsFirst: false })
      .limit(50),

    // 3. Overdue list
    supabase
      .from("invoices")
      .select(
        `
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        total_krw,
        is_mock,
        project:projects(title),
        workspace:workspaces(name)
      `
      )
      .eq("status", "issued")
      .not("due_date", "is", null)
      .lt("due_date", today)
      .order("due_date", { ascending: true })
      .limit(50),

    // 4. Status breakdown (YTD)
    supabase
      .from("invoices")
      .select("id, status")
      .gte("created_at", `${firstOfYear}T00:00:00+09:00`),
  ]);

  if (mockAggRes.error)
    console.error("[AdminInvoicesPage] mock agg:", mockAggRes.error);
  if (mtdAggRes.error)
    console.error("[AdminInvoicesPage] mtd agg:", mtdAggRes.error);
  if (ytdAggRes.error)
    console.error("[AdminInvoicesPage] ytd agg:", ytdAggRes.error);
  if (overdueAggRes.error)
    console.error("[AdminInvoicesPage] overdue agg:", overdueAggRes.error);
  if (mockListRes.error)
    console.error("[AdminInvoicesPage] mock list:", mockListRes.error);
  if (overdueListRes.error)
    console.error("[AdminInvoicesPage] overdue list:", overdueListRes.error);
  if (statusBreakdownRes.error)
    console.error(
      "[AdminInvoicesPage] status breakdown:",
      statusBreakdownRes.error
    );

  const mockAggRows = (mockAggRes.data ?? []) as AggregateRow[];
  const mockCount = mockAggRes.count ?? mockAggRows.length;
  const mockTotal = mockAggRows.reduce((acc, r) => acc + (r.total_krw ?? 0), 0);

  const mtdTotal = ((mtdAggRes.data ?? []) as AggregateRow[]).reduce(
    (acc, r) => acc + (r.total_krw ?? 0),
    0
  );
  const ytdTotal = ((ytdAggRes.data ?? []) as AggregateRow[]).reduce(
    (acc, r) => acc + (r.total_krw ?? 0),
    0
  );

  const overdueAggRows = (overdueAggRes.data ?? []) as AggregateRow[];
  const overdueCount = overdueAggRes.count ?? overdueAggRows.length;
  const overdueTotal = overdueAggRows.reduce(
    (acc, r) => acc + (r.total_krw ?? 0),
    0
  );

  const mockList: InvoiceListRow[] = (mockListRes.data ?? []).map(toInvoiceRow);
  const overdueList: InvoiceListRow[] = (overdueListRes.data ?? []).map(
    toInvoiceRow
  );

  const statusBreakdownRows = (statusBreakdownRes.data ??
    []) as StatusCountRow[];
  const statusCounts: Record<InvoiceStatus, number> = {
    draft: 0,
    issued: 0,
    paid: 0,
    void: 0,
  };
  for (const row of statusBreakdownRows) {
    if (
      row.status === "draft" ||
      row.status === "issued" ||
      row.status === "paid" ||
      row.status === "void"
    ) {
      statusCounts[row.status] += 1;
    }
  }

  // Formatters
  const currencyFmt = new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  });
  const shortDateFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  });

  function formatDate(value: string | null): string {
    if (!value) return "—";
    // If value is already YYYY-MM-DD (date column), parse as KST midnight.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number);
      return shortDateFmt.format(new Date(Date.UTC(y, m - 1, d)));
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return shortDateFmt.format(d);
  }

  const statusKeys: InvoiceStatus[] = ["draft", "issued", "paid", "void"];

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          <em>{t("title")}</em>
        </h1>
      </div>

      {/* KPI cards */}
      <section className="mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Mock */}
          <div
            className={cn(
              "border rounded-lg p-5",
              mockCount > 0
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-border"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-medium uppercase tracking-wide mb-2",
                mockCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {t("kpi_mock_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {mockCount}
            </p>
            <p
              className={cn(
                "text-[11px] mt-2 tabular-nums",
                mockCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {currencyFmt.format(mockTotal)}
            </p>
            <p
              className={cn(
                "text-[10px] mt-1 keep-all",
                mockCount > 0 ? "text-red-700/80" : "text-muted-foreground"
              )}
            >
              {t("kpi_mock_sub")}
            </p>
          </div>

          {/* MTD */}
          <div className="border border-border rounded-lg p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {t("kpi_mtd_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {currencyFmt.format(mtdTotal)}
            </p>
          </div>

          {/* YTD */}
          <div className="border border-border rounded-lg p-5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">
              {t("kpi_ytd_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {currencyFmt.format(ytdTotal)}
            </p>
          </div>

          {/* Overdue */}
          <div
            className={cn(
              "border rounded-lg p-5",
              overdueCount > 0
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-border"
            )}
          >
            <p
              className={cn(
                "text-[11px] font-medium uppercase tracking-wide mb-2",
                overdueCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {t("kpi_overdue_label")}
            </p>
            <p className="font-display text-3xl tracking-tight tabular-nums">
              {overdueCount}
            </p>
            <p
              className={cn(
                "text-[11px] mt-2 tabular-nums",
                overdueCount > 0 ? "text-red-700" : "text-muted-foreground"
              )}
            >
              {currencyFmt.format(overdueTotal)}
            </p>
            <p
              className={cn(
                "text-[10px] mt-1 keep-all",
                overdueCount > 0 ? "text-red-700/80" : "text-muted-foreground"
              )}
            >
              {t("kpi_overdue_sub")}
            </p>
          </div>
        </div>
      </section>

      {/* Mock list */}
      {mockCount > 0 && (
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {t("mock_section_title")}
            <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted-foreground tabular-nums">
              {t("count_label", { count: mockCount })}
            </span>
          </h2>

          {mockList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {t("mock_section_empty")}
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_invoice_number")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_project")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_workspace")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_total")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_status")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                      {t("col_issue_date")}
                    </th>
                    <th className="px-4 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {mockList.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="font-medium hover:underline keep-all tabular-nums"
                        >
                          {inv.invoice_number ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">
                        {inv.project?.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">
                        {inv.workspace?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {currencyFmt.format(inv.total_krw)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            className={cn(
                              "rounded-full text-[11px] px-2.5 py-0.5",
                              statusBadgeClass(inv.status)
                            )}
                          >
                            {tInvoices(
                              `status_${inv.status}` as
                                | "status_draft"
                                | "status_issued"
                                | "status_paid"
                                | "status_void"
                            )}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-full text-[10px] px-2 py-0.5 border-amber-300 text-amber-700 bg-amber-50"
                          >
                            {tInvoices("mock_badge")}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground hidden lg:table-cell whitespace-nowrap">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="text-muted-foreground hover:text-foreground text-sm"
                          aria-label="Open"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Overdue list */}
      {overdueCount > 0 && (
        <section className="mb-12">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            {t("overdue_section_title")}
            <span className="ml-1 text-[11px] font-normal normal-case tracking-normal text-muted-foreground tabular-nums">
              {t("count_label", { count: overdueCount })}
            </span>
          </h2>

          {overdueList.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {t("overdue_section_empty")}
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_invoice_number")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_project")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                      {t("col_workspace")}
                    </th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_total")}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t("col_due_date")}
                    </th>
                    <th className="px-4 py-3" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {overdueList.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="font-medium hover:underline keep-all tabular-nums"
                        >
                          {inv.invoice_number ?? "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[180px]">
                        {inv.project?.title ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell truncate max-w-[160px]">
                        {inv.workspace?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {currencyFmt.format(inv.total_krw)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-red-700 whitespace-nowrap">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={
                            `/app/invoices/${inv.id}` as `/app/invoices/${string}`
                          }
                          className="text-muted-foreground hover:text-foreground text-sm"
                          aria-label="Open"
                        >
                          →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Status breakdown */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("status_breakdown_title")}
        </h2>
        <div className="flex flex-wrap gap-2">
          {statusKeys.map((s) => (
            <Badge
              key={s}
              className={cn(
                "rounded-full text-[12px] px-3 py-1 tabular-nums",
                statusBadgeClass(s)
              )}
            >
              {tInvoices(
                `status_${s}` as
                  | "status_draft"
                  | "status_issued"
                  | "status_paid"
                  | "status_void"
              )}{" "}
              · {statusCounts[s]}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
