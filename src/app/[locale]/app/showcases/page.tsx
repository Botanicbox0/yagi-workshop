import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CreateFromBoardDialog } from "@/components/showcases/create-from-board-dialog";

type Props = {
  params: Promise<{ locale: string }>;
};

type ShowcaseRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  view_count: number;
  created_at: string;
  cover_media_type: string | null;
  cover_media_storage_path: string | null;
  cover_media_external_url: string | null;
  project: { id: string; title: string | null } | null;
};

type BoardCandidate = {
  id: string;
  title: string;
  project_id: string;
  project_title: string | null;
};

function statusVariant(
  status: string,
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "published":
      return "default";
    case "draft":
      return "secondary";
    case "archived":
      return "outline";
    default:
      return "secondary";
  }
}

export default async function ShowcasesListPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "showcase" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  // Access control: yagi_admin OR any workspace admin.
  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });

  let canAccess = Boolean(yagiAdmin);
  if (!canAccess) {
    const { data: adminRoles } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1);
    canAccess = Boolean(adminRoles && adminRoles.length > 0);
  }
  if (!canAccess) notFound();

  const isYagiAdmin = Boolean(yagiAdmin);

  const svc = createSupabaseService();

  // Scope showcases: yagi_admin sees all; workspace admin sees only their
  // projects' showcases.
  let showcaseQuery = svc
    .from("showcases")
    .select(
      "id, title, slug, status, published_at, view_count, created_at, cover_media_type, cover_media_storage_path, cover_media_external_url, project:projects(id, title, workspace_id)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isYagiAdmin) {
    const { data: adminWorkspaces } = await svc
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .eq("role", "admin");
    const wsIds = (adminWorkspaces ?? [])
      .map((r) => r.workspace_id)
      .filter((x): x is string => Boolean(x));
    if (wsIds.length === 0) {
      // Admin of zero workspaces — empty list.
      return renderEmpty({
        t,
        boards: [],
        isYagiAdmin: false,
      });
    }
    const { data: projectRows } = await svc
      .from("projects")
      .select("id")
      .in("workspace_id", wsIds);
    const projectIds = (projectRows ?? []).map((p) => p.id);
    if (projectIds.length === 0) {
      return renderEmpty({
        t,
        boards: [],
        isYagiAdmin: false,
      });
    }
    showcaseQuery = showcaseQuery.in("project_id", projectIds);
  }

  const { data: rawShowcases, error } = await showcaseQuery;
  if (error) {
    console.error("[showcases] list error:", error.message);
  }

  const showcases: ShowcaseRow[] = (
    (rawShowcases ?? []) as unknown as Array<
      Omit<ShowcaseRow, "project"> & {
        project: { id: string; title: string | null; workspace_id: string } | null;
      }
    >
  ).map((s) => ({
    id: s.id,
    title: s.title,
    slug: s.slug,
    status: s.status,
    published_at: s.published_at,
    view_count: s.view_count,
    created_at: s.created_at,
    cover_media_type: s.cover_media_type,
    cover_media_storage_path: s.cover_media_storage_path,
    cover_media_external_url: s.cover_media_external_url,
    project: s.project
      ? { id: s.project.id, title: s.project.title }
      : null,
  }));

  // Sign cover storage paths (if any) for thumbnails.
  const coverPaths = showcases
    .map((s) => s.cover_media_storage_path)
    .filter((p): p is string => Boolean(p));
  const coverUrlMap: Record<string, string> = {};
  if (coverPaths.length > 0) {
    const { data: signed } = await svc.storage
      .from("showcase-media")
      .createSignedUrls(coverPaths, 3600);
    for (const row of signed ?? []) {
      if (row.path && row.signedUrl) {
        coverUrlMap[row.path] = row.signedUrl;
      }
    }
  }

  // Candidate boards for "Create from Board" dialog (yagi_admin only).
  let boards: BoardCandidate[] = [];
  if (isYagiAdmin) {
    const { data: boardRows } = await svc
      .from("preprod_boards")
      .select("id, title, status, project_id, project:projects(title)")
      .eq("status", "approved")
      .order("updated_at", { ascending: false })
      .limit(100);
    boards = ((boardRows ?? []) as unknown as Array<{
      id: string;
      title: string;
      status: string;
      project_id: string;
      project: { title: string | null } | null;
    }>).map((b) => ({
      id: b.id,
      title: b.title,
      project_id: b.project_id,
      project_title: b.project?.title ?? null,
    }));
  }

  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  });

  if (showcases.length === 0) {
    return renderEmpty({ t, boards, isYagiAdmin });
  }

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {t("list_title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground keep-all max-w-lg">
            {t("list_intro")}
          </p>
        </div>
        {isYagiAdmin && <CreateFromBoardDialog boards={boards} />}
      </div>

      {/* Showcases table */}
      <div className="mt-8 border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[56px]">
                {/* thumbnail column, no header label */}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t("editor_field_title")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                {t("editor_field_slug")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                {t("list_status_draft")}
                {" / "}
                {t("list_status_published")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                {t("list_views_label", { count: 0 }).replace("0", "#")}
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                {/* actions column */}
              </th>
            </tr>
          </thead>
          <tbody>
            {showcases.map((s) => {
              const coverUrl =
                s.cover_media_storage_path &&
                coverUrlMap[s.cover_media_storage_path]
                  ? coverUrlMap[s.cover_media_storage_path]
                  : s.cover_media_external_url ?? null;
              const publishedDate = s.published_at
                ? fmt.format(new Date(s.published_at))
                : null;
              return (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-accent transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="w-10 h-10 rounded bg-muted overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground">
                      {coverUrl && s.cover_media_type !== "video_embed" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={coverUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        "—"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/app/showcases/${s.id}` as `/app/showcases/${string}`
                      }
                      className="font-medium hover:underline keep-all line-clamp-1"
                    >
                      {s.title}
                    </Link>
                    {s.project?.title && (
                      <p className="text-xs text-muted-foreground truncate max-w-[280px] mt-0.5">
                        {s.project.title}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-xs text-muted-foreground truncate max-w-[220px]">
                    {s.slug}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={statusVariant(s.status)}
                      className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
                    >
                      {s.status === "published"
                        ? t("list_status_published")
                        : s.status === "archived"
                          ? t("list_status_archived")
                          : t("list_status_draft")}
                    </Badge>
                    {publishedDate && (
                      <div className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {publishedDate}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground tabular-nums">
                    {t("list_views_label", { count: s.view_count })}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap">
                    <Link
                      href={
                        `/app/showcases/${s.id}` as `/app/showcases/${string}`
                      }
                      className="text-xs underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
                    >
                      {t("list_edit_link")}
                    </Link>
                    {s.status === "published" && (
                      <a
                        href={`/showcase/${s.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 text-xs underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
                      >
                        {t("list_share_link")}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderEmpty({
  t,
  boards,
  isYagiAdmin,
}: {
  t: Awaited<ReturnType<typeof getTranslations>>;
  boards: BoardCandidate[];
  isYagiAdmin: boolean;
}) {
  return (
    <div className="px-10 py-12 max-w-5xl">
      <div className="flex items-start justify-between mb-3 gap-6">
        <div>
          <h1 className="font-display text-3xl tracking-tight">
            {t("list_title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground keep-all max-w-lg">
            {t("list_intro")}
          </p>
        </div>
        {isYagiAdmin && <CreateFromBoardDialog boards={boards} />}
      </div>

      <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
        <p className="font-display text-xl tracking-tight mb-2 keep-all">
          {t("list_empty_title")}
        </p>
        <p className="text-sm text-muted-foreground keep-all max-w-sm">
          {t("list_empty_body")}
        </p>
      </div>
    </div>
  );
}
