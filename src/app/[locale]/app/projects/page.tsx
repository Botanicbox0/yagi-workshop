import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import {
  getAppLandingPath,
  resolveAppActor,
} from "@/lib/app/role-routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { ProjectsHubHero } from "@/components/projects/projects-hub-hero";
import { ProjectsHubWorkflowStrip } from "@/components/projects/projects-hub-workflow-strip";
import { ProjectsHubCtaBanner } from "@/components/projects/projects-hub-cta-banner";
import { ProjectListCard } from "@/components/projects/project-list-card";
import { MeetingRequestCard } from "@/components/meetings/meeting-request-card";

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

  // Wave C.5d sub_03e_1 — Codex K-05 LOOP 1 MED-C (Finding 1): the
  // projects hub query previously had no workspace_id filter and relied
  // entirely on RLS, which lets a multi-workspace user see projects from
  // every membership while the switcher claims one workspace is active.
  // Resolve the active workspace up front, then pass it through both the
  // hub list query and the MeetingRequestCard card. The same id replaces
  // the duplicate primaryWorkspaceId fetch sub_03c added.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }
  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    redirect({ href: "/onboarding", locale });
    return null;
  }
  const actor = resolveAppActor(active, await getIsYagiAdmin(supabase, user.id));
  if (actor !== "brand") {
    redirect({ href: actor ? getAppLandingPath(actor) : "/onboarding", locale });
    return null;
  }
  const activeWorkspaceId = active.id;

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
    .eq("workspace_id", activeWorkspaceId)
    .eq("project_type", "direct_commission")
    // HF2_2 defense-in-depth: exclude soft-deleted projects even if RLS
    // USING clause already filters them — explicit filter makes intent
    // observable in code review.
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (sp.brand_id) query = query.eq("brand_id", sp.brand_id);

  const { data, error } = await query;
  if (error) {
    console.error("[ProjectsPage] Supabase error:", error);
  }

  // All direct-commission projects for the active workspace. brand_id is
  // filtered server-side; status is filtered client-side below so (a) the
  // status facet can be derived from the full set, and (b) the empty-state
  // hero only fires on a truly empty list, never on an empty filter result.
  const allProjects = (data ?? []) as ProjectRow[];

  const primaryWorkspaceId: string | null = activeWorkspaceId;

  // Status facet — only statuses actually present, in workflow order.
  const STATUS_ORDER = [
    "in_review",
    "in_progress",
    "in_revision",
    "submitted",
    "delivered",
    "approved",
    "draft",
    "cancelled",
    "archived",
  ];
  const presentStatuses = Array.from(
    new Set(allProjects.map((p) => p.status)),
  ).sort((a, b) => {
    const ia = STATUS_ORDER.indexOf(a);
    const ib = STATUS_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  const filteredProjects = sp.status
    ? allProjects.filter((p) => p.status === sp.status)
    : allProjects;

  // Resolve brand name for active brand_id filter chip
  const activeBrand =
    sp.brand_id && allProjects.length > 0
      ? (allProjects.find((p) => p.brand?.id === sp.brand_id)?.brand ?? null)
      : null;

  // URL helper: set/clear the status facet while preserving brand_id.
  const statusHref = (status: string | null) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (sp.brand_id) params.set("brand_id", sp.brand_id);
    const qs = params.toString();
    return `/app/projects${qs ? `?${qs}` : ""}`;
  };

  // Build URL helper for filter removal
  const removeFilter = (key: "status" | "brand_id") => {
    const params = new URLSearchParams();
    if (key !== "status" && sp.status) params.set("status", sp.status);
    if (key !== "brand_id" && sp.brand_id) params.set("brand_id", sp.brand_id);
    const qs = params.toString();
    return `/app/projects${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      {/* Header — Phase 2.9 hotfix-2 Task 1: Pretendard bold, larger size,
          tighter tracking. Reads as a real section title rather than a
          tab label. CTA pairing with "프로젝트 의뢰하기" preserved. */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
          {t("list_title")}
        </h1>
        <Link
          href="/app/projects/new"
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-brand text-brand-on hover:bg-brand/90 text-sm font-semibold transition-colors"
        >
          {t("new")}
        </Link>
      </div>

      {/* Phase 2.8.1 G_B1-I: tab nav collapsed to a single (default) view —
          Contest is no longer surfaced from the projects hub. The
          contest_tab i18n key is preserved for the Phase 3.0+
          re-introduction (per DECISIONS_CACHE Q-086). */}

      {/* Status facet — quick filter by the statuses present in this
          list. URL-based (shareable); "전체" clears the status filter and
          preserves any brand_id. Only shown when there is something to
          filter (2+ distinct statuses). */}
      {allProjects.length > 0 && presentStatuses.length >= 2 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <Link
            href={statusHref(null)}
            aria-current={!sp.status ? "true" : undefined}
            className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              !sp.status
                ? "border-brand bg-brand text-brand-on"
                : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            {t("filter_all")}
          </Link>
          {presentStatuses.map((s) => (
            <Link
              key={s}
              href={statusHref(s)}
              aria-current={sp.status === s ? "true" : undefined}
              className={`inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                sp.status === s
                  ? "border-brand bg-brand text-brand-on"
                  : "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              {t(`status_${s}` as Parameters<typeof t>[0])}
            </Link>
          ))}
        </div>
      )}

      {/* Active brand filter chip (status now lives in the facet above) */}
      {sp.brand_id && activeBrand && (
        <div className="mb-4 flex flex-wrap gap-2">
          <Link
            href={removeFilter("brand_id")}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {activeBrand.name}
            <span aria-hidden>×</span>
          </Link>
        </div>
      )}

      {/* Phase 2.8.2 G_B2_A — empty-state hero replaces the dashed-border
          placeholder. Hero shows 3 value props + primary CTA + 4-step
          workflow flow. The legacy empty_direct / empty_direct_sub keys
          are preserved for the dashboard's compact empty state and any
          future re-introduction; key names are non-negotiable per the
          phase kickoff §7. */}
      {allProjects.length === 0 && <ProjectsHubHero locale={locale} />}

      {/* Project grid (Wave C.5a sub_06: vertical card v1.0). Title
          top-left + status pill top-right + date bottom-right. Sage
          accent gated to in_review only. Renders the status-filtered set. */}
      {filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {filteredProjects.map((project) => (
            <ProjectListCard
              key={project.id}
              href={`/app/projects/${project.id}`}
              title={project.title}
              status={project.status}
              statusLabel={t(`status_${project.status}` as Parameters<typeof t>[0])}
              dateLabel={new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(new Date(project.updated_at))}
            />
          ))}
        </div>
      )}

      {/* Empty filter result (has projects, but none match the active
          status facet) — distinct from the newcomer hero above. */}
      {allProjects.length > 0 && filteredProjects.length === 0 && (
        <div className="rounded-2xl border border-border/60 bg-foreground/[0.02] py-12 text-center text-sm text-muted-foreground keep-all">
          {t("filter_empty")}
        </div>
      )}

      {/* Phase 2.8.6 — meeting request card is permanent (yagi: "첫
          프로젝트 진행 이후에도 남아있으면 좋을듯"). For users with active
          projects it sits below the grid so the list stays projects-first;
          on the empty state it follows the hero. */}
      <div className="mt-6">
        <MeetingRequestCard workspaceId={primaryWorkspaceId} />
      </div>

      {/* Phase 2.9 G_B9_E + G_B9_F — workflow strip + bottom CTA banner.
          Gated to the empty state only: for returning users with active
          projects these editorial bands were just bottom clutter under a
          long, scrolling list. Newcomers still get the full onboarding. */}
      {allProjects.length === 0 && (
        <>
          <ProjectsHubWorkflowStrip locale={locale} />
          <ProjectsHubCtaBanner locale={locale} />
        </>
      )}
    </div>
  );
}
