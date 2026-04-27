import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; project?: string }>;
};

type BoardRow = {
  id: string;
  title: string;
  status: string;
  updated_at: string;
  project: { title: string } | null;
  frame_count: number;
};

function getStatusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "draft":
      return "secondary";
    case "shared":
      return "default";
    case "approved":
      return "outline";
    case "archived":
      return "destructive";
    default:
      return "secondary";
  }
}

export default async function PreprodBoardsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const t = await getTranslations({ locale, namespace: "preprod" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // Visibility: yagi_admin OR member of yagi-internal workspace
  const [{ data: isYagiAdmin }, { data: yagiWs }] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid }),
    supabase
      .from("workspaces")
      .select("id")
      .eq("slug", "yagi-internal")
      .maybeSingle(),
  ]);

  if (!isYagiAdmin) {
    if (!yagiWs) notFound();
    const { data: isMember } = await supabase.rpc("is_ws_member", {
      uid,
      wsid: yagiWs.id,
    });
    if (!isMember) notFound();
  }

  // Fetch boards with project info
  let query = supabase
    .from("preprod_boards")
    .select(
      `
      id,
      title,
      status,
      updated_at,
      project:projects(title)
    `
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.project) query = query.eq("project_id", sp.project);

  const { data: boardsData, error } = await query;

  if (error) {
    console.error("[PreprodBoardsPage] Supabase error:", error.message);
  }

  const rawBoards = (boardsData ?? []) as unknown as Array<{
    id: string;
    title: string;
    status: string;
    updated_at: string;
    project: { title: string } | null;
  }>;

  // Fetch current-revision frame counts per board in a single query
  const frameCounts: Record<string, number> = {};
  if (rawBoards.length > 0) {
    const boardIds = rawBoards.map((b) => b.id);
    const { data: frameRows } = await supabase
      .from("preprod_frames")
      .select("board_id")
      .in("board_id", boardIds)
      .eq("is_current_revision", true);

    for (const row of frameRows ?? []) {
      frameCounts[row.board_id] = (frameCounts[row.board_id] ?? 0) + 1;
    }
  }

  const boards: BoardRow[] = rawBoards.map((b) => ({
    ...b,
    frame_count: frameCounts[b.id] ?? 0,
  }));

  // Projects for filter dropdown (same RLS visibility)
  const { data: filterProjects } = await supabase
    .from("projects")
    .select("id, title")
    .order("title", { ascending: true })
    .limit(100);

  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  });

  const statuses = ["draft", "shared", "approved", "archived"] as const;

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          {t("board_list_title")}
        </h1>
        <Link
          href="/app/preprod/new"
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {t("board_new")}
        </Link>
      </div>

      {/* Filters */}
      <form method="GET" className="flex gap-3 mb-6">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("filter_all")}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {t(`status_${s}`)}
            </option>
          ))}
        </select>
        <select
          name="project"
          defaultValue={sp.project ?? ""}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">{t("filter_all")}</option>
          {(filterProjects ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
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
      {boards.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            {t("board_list_empty")}
          </p>
          <Link
            href="/app/preprod/new"
            className="mt-4 rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {t("board_new")}
          </Link>
        </div>
      )}

      {/* Boards table */}
      {boards.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("title_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  {t("project_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("filter_status")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("frame_count_n", { count: 0 }).replace("0", "#")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("last_edited_at", { at: "" })}
                </th>
              </tr>
            </thead>
            <tbody>
              {boards.map((board) => (
                <tr
                  key={board.id}
                  className="border-b border-border last:border-0 hover:bg-accent transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/app/preprod/${board.id}` as `/app/preprod/${string}`
                      }
                      className="font-medium hover:underline keep-all line-clamp-1"
                    >
                      {board.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">
                    {board.project?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={getStatusBadgeVariant(board.status)}
                      className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
                    >
                      {t(
                        `status_${board.status}` as
                          | "status_draft"
                          | "status_shared"
                          | "status_approved"
                          | "status_archived"
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums">
                    {board.frame_count}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap tabular-nums">
                    {fmt.format(new Date(board.updated_at))}
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
