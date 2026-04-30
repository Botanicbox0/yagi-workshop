// Phase 4.x task_04 — Post-submit detail page redesign.
//
// Layout (1280 max-width):
//   1. Breadcrumb (workspace -> brand -> project)
//   2. Status timeline (5-stage horizontal pipeline, sage active)
//   3. Hero card 1:1 (720x720) + Info rail (360 wide)  [responsive grid]
//   4. Detail tabs (4 tabs: 보드 / 진행 / 코멘트 disabled / 결과물 disabled)
//   5. Tab content panel
//   6. Admin actions row (yagi_admin only)
//
// Authorization (BLOCKER 1 consistency):
//   - viewer must be project.created_by OR yagi_admin
//   - workspace_admin from same workspace also allowed for backwards compat
//   - everyone else -> notFound()
//
// Phase 4.x DOES NOT add new statuses. The 5-stage timeline maps to the
// existing 9-state CHECK; 라우팅 / 시안 are reserved visual slots.
//
// Server-only data fetch; tabs are conditionally rendered based on
// ?tab= query param. Disabled tabs route to PlaceholderTab and never
// trigger any DB read.

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AdminDeleteButton } from "@/components/projects/admin-delete-button";
import { ProjectActionButtons } from "@/components/projects/project-action-buttons";
import { StatusTimeline } from "@/components/project-detail/status-timeline";
import { HeroCard } from "@/components/project-detail/hero-card";
import { InfoRail, type TwinIntent } from "@/components/project-detail/info-rail";
import { DetailTabs, type TabKey } from "@/components/project-detail/tabs";
import { BoardTab } from "@/components/project-detail/board-tab";
import { ProgressTab } from "@/components/project-detail/progress-tab";
import { PlaceholderTab } from "@/components/project-detail/placeholder-tab";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
};

type ProjectDetail = {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  workspace_id: string;
  created_by: string;
  budget_band: string | null;
  target_delivery_at: string | null;
  meeting_preferred_at: string | null;
  twin_intent: string | null;
  created_at: string;
  workspace: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
};

function parseTab(value: string | undefined): TabKey {
  if (value === "progress" || value === "comment" || value === "deliverable") {
    return value;
  }
  return "board";
}

function narrowTwinIntent(value: string | null): TwinIntent | null {
  if (
    value === "undecided" ||
    value === "specific_in_mind" ||
    value === "no_twin"
  ) {
    return value;
  }
  return null;
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const activeTab = parseTab(sp.tab);

  const t = await getTranslations({ locale, namespace: "projects" });
  const tDetail = await getTranslations({
    locale,
    namespace: "project_detail",
  });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch project. budget_band / submitted_at / twin_intent / kind columns
  // are not in generated database.types.ts (Phase 3.0 + Phase 4.x); use
  // the same any-cast pattern the existing detail page used.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/4.x columns not in generated types
  const sb = supabase as any;
  const { data: projectRaw, error: projectErr } = (await sb
    .from("projects")
    .select(
      `
      id, title, brief, status,
      workspace_id, created_by,
      budget_band, target_delivery_at,
      meeting_preferred_at, twin_intent, created_at,
      brand:brands(id, name),
      workspace:workspaces(id, name)
    `
    )
    .eq("id", id)
    .maybeSingle()) as {
    data: Record<string, unknown> | null;
    error: unknown;
  };

  if (projectErr || !projectRaw) notFound();

  const brandRaw = projectRaw.brand;
  const workspaceRaw = projectRaw.workspace;

  const project: ProjectDetail = {
    id: projectRaw.id as string,
    title: projectRaw.title as string,
    brief: projectRaw.brief as string | null,
    status: projectRaw.status as string,
    workspace_id: projectRaw.workspace_id as string,
    created_by: projectRaw.created_by as string,
    budget_band: (projectRaw.budget_band as string | null) ?? null,
    target_delivery_at:
      (projectRaw.target_delivery_at as string | null) ?? null,
    meeting_preferred_at:
      (projectRaw.meeting_preferred_at as string | null) ?? null,
    // twin_intent column added by task_01 migration (Wave D D.1 apply).
    // Until apply, the SELECT returns undefined -> coerce to null. After
    // apply, the value is one of the 3 enum members.
    twin_intent:
      (projectRaw.twin_intent as string | undefined | null) ?? null,
    created_at: projectRaw.created_at as string,
    brand: Array.isArray(brandRaw)
      ? ((brandRaw[0] as ProjectDetail["brand"]) ?? null)
      : (brandRaw as ProjectDetail["brand"]),
    workspace: Array.isArray(workspaceRaw)
      ? ((workspaceRaw[0] as ProjectDetail["workspace"]) ?? null)
      : (workspaceRaw as ProjectDetail["workspace"]),
  };

  // Authorization (BLOCKER 1 consistency: use created_by, NOT owner_id).
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, workspace_id")
    .eq("user_id", user.id);

  const roles = new Set(
    (roleRows ?? [])
      .filter(
        (r) =>
          r.workspace_id === null || r.workspace_id === project.workspace_id
      )
      .map((r) => r.role as string)
  );

  const isYagiAdmin = roles.has("yagi_admin");
  const isWsAdmin = roles.has("workspace_admin");
  const isOwner = project.created_by === user.id;

  if (!isYagiAdmin && !isWsAdmin && !isOwner) notFound();

  const viewerRole: "admin" | "client" = isYagiAdmin || isWsAdmin
    ? "admin"
    : "client";

  const localeNarrow: "ko" | "en" = locale === "en" ? "en" : "ko";
  const workspaceName = project.workspace?.name ?? "—";
  const brandName = project.brand?.name ?? null;

  // Status pill label (uses existing translations namespace -- same map
  // already powers StatusBadge elsewhere).
  const tStatus = await getTranslations({ locale, namespace: "projects" });
  const statusLabel =
    tStatus.has(`status_${project.status}` as never)
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (tStatus as any)(`status_${project.status}`)
      : project.status;

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
      {/* L1 Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <Link
          href={`/${locale}/app/projects`}
          className="hover:text-foreground transition-colors"
        >
          {t("list_title")}
        </Link>
        <span className="mx-1.5 text-muted-foreground/60">›</span>
        <span>{workspaceName}</span>
        {brandName && (
          <>
            <span className="mx-1.5 text-muted-foreground/60">›</span>
            <span>{brandName}</span>
          </>
        )}
        <span className="mx-1.5 text-muted-foreground/60">›</span>
        <span className="font-medium text-foreground keep-all">
          {project.title}
        </span>
      </nav>

      {/* L2 Status timeline */}
      <div className="mb-8">
        <StatusTimeline
          status={project.status}
          labels={{
            review: tDetail("timeline.review"),
            routing: tDetail("timeline.routing"),
            progress: tDetail("timeline.progress"),
            proposal: tDetail("timeline.proposal"),
            delivered: tDetail("timeline.delivered"),
          }}
        />
      </div>

      {/* L3 Hero card + Info rail */}
      <div className="mb-10 flex flex-col md:flex-row gap-6">
        <div className="flex-1 min-w-0">
          <HeroCard
            title={project.title}
            description={project.brief}
            status={project.status}
            statusLabel={statusLabel}
            bannerLine={
              project.status === "in_review" ||
              project.status === "submitted" ||
              project.status === "draft"
                ? tDetail("hero.banner_in_review")
                : null
            }
          />
        </div>
        <InfoRail
          createdAt={project.created_at}
          budgetBand={project.budget_band}
          targetDeliveryAt={project.target_delivery_at}
          twinIntent={narrowTwinIntent(project.twin_intent)}
          meetingPreferredAt={project.meeting_preferred_at}
          locale={localeNarrow}
          labels={{
            section: tDetail("info_rail.section"),
            submittedOn: tDetail("info_rail.submitted_on"),
            budget: tDetail("info_rail.budget"),
            delivery: tDetail("info_rail.delivery"),
            deliveryNegotiable: tDetail("info_rail.delivery_negotiable"),
            twinIntent: tDetail("info_rail.twin_intent"),
            meeting: tDetail("info_rail.meeting"),
            meetingNone: tDetail("info_rail.meeting_none"),
            notSet: tDetail("info_rail.not_set"),
            budgetMap: {
              under_1m: tDetail("budget.under_1m"),
              "1m_to_5m": tDetail("budget.1m_to_5m"),
              "5m_to_10m": tDetail("budget.5m_to_10m"),
              negotiable: tDetail("budget.negotiable"),
            },
            twinIntentMap: {
              undecided: tDetail("twin_intent.undecided"),
              specific_in_mind: tDetail("twin_intent.specific_in_mind"),
              no_twin: tDetail("twin_intent.no_twin"),
            },
          }}
        />
      </div>

      {/* L4 Tabs */}
      <div className="mb-6">
        <DetailTabs
          active={activeTab}
          labels={{
            board: tDetail("tabs.board"),
            progress: tDetail("tabs.progress"),
            comment: tDetail("tabs.comment"),
            deliverable: tDetail("tabs.deliverable"),
          }}
        />
      </div>

      {/* L5 Tab content panel */}
      <div className="mb-10">
        {activeTab === "board" && (
          <BoardTab
            projectId={project.id}
            isYagiAdmin={isYagiAdmin}
            locale={localeNarrow}
          />
        )}
        {activeTab === "progress" && (
          <ProgressTab
            projectId={project.id}
            locale={localeNarrow}
            labels={{
              section: tDetail("progress_tab.section"),
              empty: tDetail("progress_tab.empty"),
              fromTo: (from, to) =>
                tDetail("progress_tab.from_to", { from, to }),
              statusMap: {
                draft: tDetail("status.draft"),
                submitted: tDetail("status.submitted"),
                in_review: tDetail("status.in_review"),
                in_progress: tDetail("status.in_progress"),
                in_revision: tDetail("status.in_revision"),
                delivered: tDetail("status.delivered"),
                approved: tDetail("status.approved"),
                cancelled: tDetail("status.cancelled"),
                archived: tDetail("status.archived"),
              },
              actorRoleMap: {
                client: tDetail("actor.client"),
                yagi_admin: tDetail("actor.yagi_admin"),
                workspace_admin: tDetail("actor.workspace_admin"),
                system: tDetail("actor.system"),
              },
            }}
          />
        )}
        {activeTab === "comment" && (
          <PlaceholderTab
            title={tDetail("placeholder.comment_title")}
            description={tDetail("placeholder.comment_description")}
          />
        )}
        {activeTab === "deliverable" && (
          <PlaceholderTab
            title={tDetail("placeholder.deliverable_title")}
            description={tDetail("placeholder.deliverable_description")}
          />
        )}
      </div>

      {/* L6 Admin actions row */}
      {viewerRole === "admin" && (
        <div className="border-t border-border/40 pt-8 flex flex-wrap items-center gap-4">
          <ProjectActionButtons
            projectId={project.id}
            status={project.status}
            viewerRole="admin"
            locale={localeNarrow}
          />
          {isYagiAdmin && <AdminDeleteButton projectId={project.id} />}
        </div>
      )}
    </div>
  );
}
