import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; workspace?: string }>;
};

type AdminProjectRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  workspace: { id: string; name: string; slug: string } | null;
  brand: { id: string; name: string } | null;
};

type StatusKey =
  | "draft"
  | "submitted"
  | "in_discovery"
  | "in_production"
  | "in_revision"
  | "delivered"
  | "approved"
  | "archived";

const ALL_STATUSES: StatusKey[] = [
  "draft",
  "submitted",
  "in_discovery",
  "in_production",
  "in_revision",
  "delivered",
  "approved",
  "archived",
];

function statusBadgeClass(status: string): string {
  switch (status as StatusKey) {
    case "draft":
      return "border-transparent bg-muted text-muted-foreground";
    case "submitted":
      return "border-transparent bg-blue-100 text-blue-700";
    case "in_discovery":
    case "in_production":
    case "in_revision":
      return "border-transparent bg-foreground text-background";
    case "delivered":
    case "approved":
      return "border-transparent bg-green-100 text-green-700";
    case "archived":
      return "border-transparent bg-muted text-muted-foreground opacity-60";
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

export default async function AdminProjectsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const tAdmin = await getTranslations("admin");
  const tProjects = await getTranslations("projects");

  const supabase = await createSupabaseServer();

  let query = supabase
    .from("projects")
    .select(
      `
      id,
      title,
      status,
      created_at,
      workspace:workspaces(id, name, slug),
      brand:brands(id, name)
    `
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.workspace) query = query.eq("workspace_id", sp.workspace);

  const { data, error } = await query;
  if (error) {
    console.error("[AdminProjectsPage] Supabase error:", error);
  }

  const projects = (data ?? []) as AdminProjectRow[];

  // Derive distinct workspaces from result set
  const workspaceMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const p of projects) {
    if (p.workspace && !workspaceMap.has(p.workspace.id)) {
      workspaceMap.set(p.workspace.id, p.workspace);
    }
  }
  // If status filter is active we may have fewer workspaces; also fetch without workspace filter
  // for the dropdown — but to avoid extra queries we use what we have.
  const workspaces = Array.from(workspaceMap.values());

  const filterHref = (key: "status" | "workspace", value: string | null) => {
    const p = new URLSearchParams();
    if (key !== "status" && sp.status) p.set("status", sp.status);
    if (key !== "workspace" && sp.workspace) p.set("workspace", sp.workspace);
    if (value) p.set(key, value);
    const qs = p.toString();
    return `/app/admin/projects${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-10 py-12 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          {tAdmin("title")}
        </h1>
        <p className="text-sm text-muted-foreground">{tAdmin("cross_workspace_projects")}</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href="/app/admin/projects"
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            "border-foreground text-foreground"
          )}
        >
          {tAdmin("projects_tab")}
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{tAdmin("filter_status")}:</span>
          <div className="flex flex-wrap gap-1">
            <Link
              href={filterHref("status", null)}
              className={cn(
                "rounded-full border px-3 py-0.5 text-xs transition-colors",
                !sp.status
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {tAdmin("filter_all")}
            </Link>
            {ALL_STATUSES.map((s) => (
              <Link
                key={s}
                href={filterHref("status", s)}
                className={cn(
                  "rounded-full border px-3 py-0.5 text-xs transition-colors",
                  sp.status === s
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                )}
              >
                {tProjects(`status_${s}` as Parameters<typeof tProjects>[0])}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Workspace filter chips (derived from current result set) */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          <span className="text-xs text-muted-foreground">{tAdmin("filter_workspace")}:</span>
          <Link
            href={filterHref("workspace", null)}
            className={cn(
              "rounded-full border px-3 py-0.5 text-xs transition-colors",
              !sp.workspace
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {tAdmin("filter_all")}
          </Link>
          {workspaces.map((ws) => (
            <Link
              key={ws.id}
              href={filterHref("workspace", ws.id)}
              className={cn(
                "rounded-full border px-3 py-0.5 text-xs transition-colors",
                sp.workspace === ws.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {ws.name}
            </Link>
          ))}
        </div>
      )}

      {/* Empty state */}
      {projects.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            <em>—</em>
          </p>
        </div>
      )}

      {/* Projects table */}
      {projects.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {tProjects("list_title")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  {tAdmin("workspaces_tab")}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {/* status column */}
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                  {/* created column */}
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr
                  key={project.id}
                  className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/projects/${project.id}` as `/app/projects/${string}`}
                      className="font-medium hover:underline underline-offset-2 keep-all line-clamp-2"
                    >
                      {project.title}
                    </Link>
                    {project.brand && (
                      <p className="text-xs text-muted-foreground mt-0.5">{project.brand.name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {project.workspace?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={cn(
                        "rounded-full text-[11px] px-2.5 py-0.5",
                        statusBadgeClass(project.status)
                      )}
                    >
                      {tProjects(`status_${project.status}` as Parameters<typeof tProjects>[0])}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground tabular-nums text-[11px] hidden lg:table-cell">
                    {new Intl.DateTimeFormat(locale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(project.created_at))}
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
