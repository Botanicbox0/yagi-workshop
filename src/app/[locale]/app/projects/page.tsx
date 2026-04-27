import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { statusPillClass } from "@/lib/ui/status-pill";
import { ProjectsHubHero } from "@/components/projects/projects-hub-hero";

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

// Phase 2.5 launchpad X1 CRITICAL #3 — replaced the file-local
// statusBadgeClass with src/lib/ui/status-pill.ts. Kept the `archived`
// opacity modifier via a small wrapper so callers keep the faded look.
function statusBadgeClass(status: string): string {
  const base = statusPillClass("project", status);
  return status === "archived" ? `${base} opacity-60` : base;
}

export default async function ProjectsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const t = await getTranslations("projects");

  // Phase 2.8.1 G_B1-I (F-PUX-007): Contest tab removed from the projects
  // hub. Workshop and Contest are separate products (DECISIONS_CACHE
  // Q-085); contest management lives in admin/challenges until Phase 3.0+.
  // Legacy ?tab=contest bookmarks now resolve to the direct-commission
  // list rather than 404.

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
    .eq("project_type", "direct_commission")
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
    if (key !== "status" && sp.status) params.set("status", sp.status);
    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
    const qs = params.toString();
    return `/app/projects${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          {t("list_title")}
        </h1>
        <Link
          href="/app/projects/new"
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {t("new")}
        </Link>
      </div>

      {/* Phase 2.8.1 G_B1-I: tab nav collapsed to a single (default) view —
          Contest is no longer surfaced from the projects hub. The
          contest_tab i18n key is preserved for the Phase 3.0+
          re-introduction (per DECISIONS_CACHE Q-086). */}

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

      {/* Phase 2.8.2 G_B2_A — empty-state hero replaces the dashed-border
          placeholder. Hero shows 3 value props + primary CTA + 4-step
          workflow flow. The legacy empty_direct / empty_direct_sub keys
          are preserved for the dashboard's compact empty state and any
          future re-introduction; key names are non-negotiable per the
          phase kickoff §7. */}
      {projects.length === 0 && <ProjectsHubHero locale={locale} />}

      {/* Direct tab — project grid */}
      {projects.length > 0 && (
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
