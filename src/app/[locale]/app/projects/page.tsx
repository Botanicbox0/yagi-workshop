import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
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

  // Wave C.5d sub_03c — primary workspace for the meeting request card
  // now follows the active-workspace cookie (Codex K-05 final review
  // LOOP 1 MED-C). resolveActiveWorkspace returns null when the user has
  // no memberships, in which case MeetingRequestCard disables itself.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let primaryWorkspaceId: string | null = null;
  if (user) {
    const active = await resolveActiveWorkspace(user.id);
    primaryWorkspaceId = active?.id ?? null;
  }

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
    <div className="px-10 py-10 max-w-5xl">
      {/* Header — Phase 2.9 hotfix-2 Task 1: SUIT bold, larger size,
          tighter tracking. Reads as a real section title rather than a
          tab label. CTA pairing with "프로젝트 의뢰하기" preserved. */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-suit text-3xl md:text-4xl font-bold tracking-tight text-foreground">
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

      {/* Phase 2.8.6 — meeting request card is permanent (yagi: "첫
          프로젝트 진행 이후에도 남아있으면 좋을듯"). Renders below the
          hero on empty state and below the grid header on populated
          state. The card disables itself if the user has no workspace
          yet (edge case during onboarding). */}
      <MeetingRequestCard workspaceId={primaryWorkspaceId} />

      {/* Direct tab — project grid (Wave C.5a sub_06: vertical card v1.0).
          Title top-left + status pill top-right + date bottom-right.
          Sage accent gated to in_review only. Brand chip moved out of
          this surface — Phase 4 has no real brand-mixed list view yet,
          and the v1.0 grammar wants the title to carry the card. */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
          {projects.map((project) => (
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

      {/* Phase 2.9 G_B9_E + G_B9_F — workflow strip + bottom CTA banner.
          Both render unconditionally so the hub feels editorial even
          for users with active projects. The hero block above is still
          empty-state-only (kickoff §6). */}
      <ProjectsHubWorkflowStrip locale={locale} />
      <ProjectsHubCtaBanner locale={locale} />
    </div>
  );
}
