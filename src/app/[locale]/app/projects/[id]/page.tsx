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
import { PlaceholderTab } from "@/components/project-detail/placeholder-tab";
import { StatusTab } from "@/components/project-detail/status-tab";
import { BriefTab } from "@/components/project-detail/brief-tab";
import { CancelledArchivedBanner } from "@/components/project-detail/cancelled-archived-banner";
import { RecallButton } from "./recall-button";

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
  // Phase 5 Wave C C_1 — 5-tab structure. "status" is the default
  // (현황 tab) per SPEC §"Scope: 5 tab 구조".
  if (
    value === "brief" ||
    value === "board" ||
    value === "comments" ||
    value === "deliverables"
  ) {
    return value;
  }
  return "status";
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

  // Phase 5 Wave C C_1 — Cancelled / Archived banner. Renders above
  // the entire page chrome when status terminates the lifecycle. Full
  // styling + the [새 의뢰 시작] link variant land in C_5; for now this
  // is a text-only placeholder so the gate is observable.
  const isTerminalStatus =
    project.status === "cancelled" || project.status === "archived";

  return (
    <div className="px-6 md:px-10 py-10 max-w-[1280px] mx-auto">
      {isTerminalStatus && (
        <CancelledArchivedBanner
          variant={project.status as "cancelled" | "archived"}
          labels={{
            cancelled: tDetail("banner.cancelled"),
            archived: tDetail("banner.archived"),
          }}
        />
      )}

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

      {/* L2 Status timeline — C_2 vertical stepper.
          Labels from projects.status.label namespace (shared across surfaces).
          eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <div className="mb-8">
        <StatusTimeline
          status={project.status}
          labels={{
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            draft: (tStatus as any)("status.label.draft"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            submitted: (tStatus as any)("status.label.submitted"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            in_review: (tStatus as any)("status.label.in_review"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            in_progress: (tStatus as any)("status.label.in_progress"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            in_revision: (tStatus as any)("status.label.in_revision"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delivered: (tStatus as any)("status.label.delivered"),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            approved: (tStatus as any)("status.label.approved"),
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

      {/* Wave B.5 — Client recall (submitted/in_review -> draft).
          Conditional on creator viewer + recall-window status. The
          RPC re-checks both, this UI gate just hides the button when
          it would be useless. Wave C will absorb this into the
          "현황" tab next-action CTA matrix (PRODUCT-MASTER §C.4). */}
      {(project.status === "submitted" || project.status === "in_review") &&
        isOwner && (
          <div className="mb-6 flex justify-end">
            <RecallButton projectId={project.id} />
          </div>
        )}

      {/* L4 Tabs — Wave C C_1: 5-tab structure (status default). */}
      <div className="mb-6">
        <DetailTabs
          active={activeTab}
          labels={{
            status: tDetail("tab.status"),
            brief: tDetail("tab.brief"),
            board: tDetail("tab.board"),
            comments: tDetail("tab.comments"),
            deliverables: tDetail("tab.deliverables"),
          }}
        />
      </div>

      {/* L5 Tab content panel */}
      <div className="mb-10">
        {activeTab === "status" && (
          <StatusTab
            labels={{
              sectionTimeline: tDetail("wc_scaffold.status_tab.section.timeline"),
              sectionCta: tDetail("wc_scaffold.status_tab.section.cta"),
              sectionBrief: tDetail("wc_scaffold.status_tab.section.brief"),
              sectionAttachments: tDetail(
                "wc_scaffold.status_tab.section.attachments"
              ),
              sectionComments: tDetail(
                "wc_scaffold.status_tab.section.comments"
              ),
              placeholderTimeline: tDetail(
                "wc_scaffold.status_tab.placeholder.timeline"
              ),
              placeholderCta: tDetail(
                "wc_scaffold.status_tab.placeholder.cta"
              ),
              placeholderBrief: tDetail(
                "wc_scaffold.status_tab.placeholder.brief"
              ),
              placeholderAttachments: tDetail(
                "wc_scaffold.status_tab.placeholder.attachments"
              ),
              placeholderComments: tDetail(
                "wc_scaffold.status_tab.placeholder.comments"
              ),
            }}
          />
        )}
        {activeTab === "brief" && (
          <BriefTab
            labels={{
              title: tDetail("wc_scaffold.brief_tab.title"),
              description: tDetail("wc_scaffold.brief_tab.description"),
            }}
          />
        )}
        {activeTab === "board" && (
          <BoardTab
            projectId={project.id}
            isYagiAdmin={isYagiAdmin}
            locale={localeNarrow}
          />
        )}
        {activeTab === "comments" && (
          <PlaceholderTab
            title={tDetail("placeholder.comment_title")}
            description={tDetail("placeholder.comment_description")}
          />
        )}
        {activeTab === "deliverables" && (
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
