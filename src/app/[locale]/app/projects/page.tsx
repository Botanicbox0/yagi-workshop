import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; brand_id?: string; tab?: string }>;
};

type ProjectRow = {
  id: string;
  title: string;
  status: string;
  project_type: string;
  updated_at: string;
  created_at: string;
  workspace_id: string;
  brand: { id: string; name: string; logo_url: string | null } | null;
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

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const t = await getTranslations("projects");

  const tab = sp.tab === "contest" ? "contest" : "direct";

  const supabase = await createSupabaseServer();

  let query = supabase
    .from("projects")
    .select(
      `
      id,
      title,
      status,
      project_type,
      updated_at,
      created_at,
      workspace_id,
      brand:brands(id, name, logo_url)
    `
    )
    .eq("project_type", tab === "contest" ? "contest" : "direct_commission")
    .order("updated_at", { ascending: false });

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);

  const { data, error } = await query;
  if (error) {
    console.error("[ProjectsPage] Supabase error:", error);
  }

  const projects = (data ?? []) as ProjectRow[];

  // Resolve brand name for active brand_id filter chip
  const activeBrand =
    sp.brand_id && projects.length > 0
      ? (projects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
      : null;

  // Build URL helper for filter removal
  const removeFilter = (key: "status" | "brand_id") => {
    const params = new URLSearchParams();
    if (tab !== "direct") params.set("tab", tab);
    if (key !== "status" && sp.status) params.set("status", sp.status);
    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
    const qs = params.toString();
    return `/app/projects${qs ? `?${qs}` : ""}`;
  };

  const tabHref = (value: "direct" | "contest") => {
    const params = new URLSearchParams();
    if (value !== "direct") params.set("tab", value);
    const qs = params.toString();
    return `/app/projects${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("list_title")}</em>
        </h1>
        <Link
          href="/app/projects/new"
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {t("new")}
        </Link>
      </div>

      {/* Tab nav — URL-based, Server Component safe */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <Link
          href={tabHref("direct")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "direct"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("direct_tab")}
        </Link>
        <Link
          href={tabHref("contest")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab === "contest"
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {t("contest_tab")}
        </Link>
      </div>

      {/* Active filter chips */}
      {(sp.status || (sp.brand_id && activeBrand)) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {sp.status && (
            <Link
              href={removeFilter("status")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {t(`status_${sp.status}` as Parameters<typeof t>[0])}
              <span aria-hidden>×</span>
            </Link>
          )}
          {sp.brand_id && activeBrand && (
            <Link
              href={removeFilter("brand_id")}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {activeBrand.name}
              <span aria-hidden>×</span>
            </Link>
          )}
        </div>
      )}

      {/* Contest tab — always empty / coming soon */}
      {tab === "contest" && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            <em>{t("empty_contest")}</em>
          </p>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      )}

      {/* Direct tab — empty state */}
      {tab === "direct" && projects.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            <em>{t("empty_direct")}</em>
          </p>
          <p className="text-sm text-muted-foreground mb-6 keep-all">
            {t("empty_direct_sub")}
          </p>
          <Link
            href="/app/projects/new"
            className="rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {t("new")}
          </Link>
        </div>
      )}

      {/* Direct tab — project grid */}
      {tab === "direct" && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/app/projects/${project.id}` as `/app/projects/${string}`}
              className="group block border border-border rounded-lg p-4 hover:bg-accent transition-colors"
            >
              {/* Brand chip */}
              <div className="flex items-center gap-2 mb-3">
                {project.brand ? (
                  <>
                    {project.brand.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.brand.logo_url}
                        alt={project.brand.name}
                        className="w-5 h-5 rounded-sm object-cover flex-shrink-0"
                      />
                    ) : (
                      <span className="w-5 h-5 rounded-sm bg-muted flex-shrink-0" />
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {project.brand.name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Title */}
              <p className="text-sm font-medium leading-snug line-clamp-2 keep-all mb-3 group-hover:text-foreground">
                {project.title}
              </p>

              {/* Status + date row */}
              <div className="flex items-center justify-between gap-2">
                <Badge
                  className={cn(
                    "rounded-full text-[11px] px-2.5 py-0.5",
                    statusBadgeClass(project.status)
                  )}
                >
                  {t(`status_${project.status}` as Parameters<typeof t>[0])}
                </Badge>
                <span className="text-[11px] text-muted-foreground tabular-nums flex-shrink-0">
                  {new Intl.DateTimeFormat(locale, {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(project.updated_at))}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
