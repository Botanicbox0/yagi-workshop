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
import { MessageSquare, Package } from "lucide-react";
import { AdminDeleteButton } from "@/components/projects/admin-delete-button";
import { ProjectActionButtons } from "@/components/projects/project-action-buttons";
import { StatusTimeline } from "@/components/project-detail/status-timeline";
import { HeroCard } from "@/components/project-detail/hero-card";
import { InfoRail, type TwinIntent } from "@/components/project-detail/info-rail";
import { DetailTabs, type TabKey } from "@/components/project-detail/tabs";
import { BoardTab } from "@/components/project-detail/board-tab";
import { EmptyStateTab } from "@/components/project-detail/empty-state-tab";
import { StatusTab } from "@/components/project-detail/status-tab";
import { BriefTab } from "@/components/project-detail/brief-tab";
import { CancelledArchivedBanner } from "@/components/project-detail/cancelled-archived-banner";

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
  // Phase 5 Wave C C_4 — additional brief fields
  deliverable_types: string[];
  mood_keywords: string[];
  mood_keywords_free: string | null;
  visual_ratio: string | null;
  visual_ratio_custom: string | null;
  channels: string[];
  target_audience: string | null;
  additional_notes: string | null;
  interested_in_twin: boolean | null;
  submitted_at: string | null;
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
      deliverable_types, mood_keywords, mood_keywords_free,
      visual_ratio, visual_ratio_custom,
      channels, target_audience, additional_notes,
      interested_in_twin, submitted_at,
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
    // Phase 5 Wave C C_4 — additional brief fields
    deliverable_types:
      (projectRaw.deliverable_types as string[] | null) ?? [],
    mood_keywords: (projectRaw.mood_keywords as string[] | null) ?? [],
    mood_keywords_free:
      (projectRaw.mood_keywords_free as string | undefined | null) ?? null,
    visual_ratio:
      (projectRaw.visual_ratio as string | undefined | null) ?? null,
    visual_ratio_custom:
      (projectRaw.visual_ratio_custom as string | undefined | null) ?? null,
    channels: (projectRaw.channels as string[] | null) ?? [],
    target_audience:
      (projectRaw.target_audience as string | undefined | null) ?? null,
    additional_notes:
      (projectRaw.additional_notes as string | undefined | null) ?? null,
    // interested_in_twin — 3-way: true / false / null (null = not answered)
    interested_in_twin:
      projectRaw.interested_in_twin == null
        ? null
        : (projectRaw.interested_in_twin as boolean),
    submitted_at:
      (projectRaw.submitted_at as string | undefined | null) ?? null,
  };

  // Fetch creator display name for the brief tab Stage 3 metadata.
  // Use the same service-role bypass pattern (profiles may be RLS-restricted
  // to own row for non-admin viewers). Falls back to null on any error.
  let creatorDisplayName: string | null = null;
  try {
    const { data: creatorProfile } = await sb
      .from("profiles")
      .select("display_name")
      .eq("id", project.created_by)
      .maybeSingle();
    creatorDisplayName =
      (creatorProfile?.display_name as string | null) ?? null;
  } catch {
    // Non-fatal — brief tab shows dash for creator name
  }

  // Phase 5 Wave C C_3 — Fetch briefing_documents for the 첨부자료 요약
  // (현황 tab right column). RLS scopes via project_id; only members of
  // the project's workspace get rows. We slice top-3 here and keep the
  // count-by-kind for the section header.
  let briefDocsCount = 0;
  let referenceDocsCount = 0;
  let topThreeDocs: Array<{
    id: string;
    kind: "brief" | "reference";
    source_type: "upload" | "url";
    thumbnail_url: string | null;
    filename: string | null;
    url: string | null;
  }> = [];
  try {
    const { data: docsRaw } = await sb
      .from("briefing_documents")
      .select(
        "id, kind, source_type, thumbnail_url, filename, url, created_at"
      )
      .eq("project_id", project.id)
      .order("created_at", { ascending: true });
    const docs = (docsRaw ?? []) as Array<{
      id: string;
      kind: "brief" | "reference";
      source_type: "upload" | "url";
      thumbnail_url: string | null;
      filename: string | null;
      url: string | null;
    }>;
    briefDocsCount = docs.filter((d) => d.kind === "brief").length;
    referenceDocsCount = docs.filter((d) => d.kind === "reference").length;
    // SPEC §"첨부자료 요약" — 기획서 우선 → 레퍼런스. Stable sort by kind
    // then keep insertion order within each kind. slice(0, 3).
    topThreeDocs = [
      ...docs.filter((d) => d.kind === "brief"),
      ...docs.filter((d) => d.kind === "reference"),
    ].slice(0, 3);
  } catch {
    // Non-fatal — render empty attachments section
  }

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
          locale={locale}
          labels={{
            cancelled: tDetail("banner.cancelled"),
            cancelledLinkText: tDetail("banner.cancelled_link_text"),
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

      {/* HF1_3 (2026-05-05) — RecallButton moved into StatusCard
          secondary CTA slot (HF1_1). The previous standalone block
          here was the original Wave B.5 placement; both RecallButton
          renderings co-existing was the regression yagi flagged. The
          StatusCard now owns the single visible RecallButton for
          submitted / in_review states; non-owner viewers see no
          recall surface (StatusCard internal gate). */}

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
            status={project.status}
            isOwner={isOwner}
            projectId={project.id}
            locale={locale}
            title={project.title}
            deliverableTypes={project.deliverable_types}
            description={project.brief}
            briefCount={briefDocsCount}
            referenceCount={referenceDocsCount}
            topThree={topThreeDocs}
            labels={{
              timeline: {
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
              },
              cta: {
                cta_draft: tDetail("status.cta.draft"),
                cta_in_review: tDetail("status.cta.in_review"),
                cta_in_progress: tDetail("status.cta.in_progress"),
                cta_in_revision: tDetail("status.cta.in_revision"),
                cta_delivered: tDetail("status.cta.delivered"),
                cta_approved: tDetail("status.cta.approved"),
                empty_state_submitted: tDetail("status.empty_state.submitted"),
                delivered_placeholder: tDetail("delivered_placeholder"),
                modal: {
                  trigger: tDetail("material_append.trigger"),
                  title: tDetail("material_append.title"),
                  description: tDetail("material_append.description"),
                  kindLabel: tDetail("material_append.kind_label"),
                  kindBrief: tDetail("material_append.kind_brief"),
                  kindReference: tDetail("material_append.kind_reference"),
                  sourceLabel: tDetail("material_append.source_label"),
                  sourceUpload: tDetail("material_append.source_upload"),
                  sourceUrl: tDetail("material_append.source_url"),
                  fileLabel: tDetail("material_append.file_label"),
                  urlLabel: tDetail("material_append.url_label"),
                  urlPlaceholder: tDetail("material_append.url_placeholder"),
                  cancel: tDetail("material_append.cancel"),
                  submit: tDetail("material_append.submit"),
                  successToast: tDetail("material_append.success_toast"),
                  errorForbidden: tDetail("material_append.error_forbidden"),
                  errorRlsPending: tDetail("material_append.error_rls_pending"),
                  errorUnknown: tDetail("material_append.error_unknown"),
                },
              },
              brief: {
                deliverable_types: tDetail("summary_card.deliverable_types"),
                description: tDetail("summary_card.description"),
                view_all: tDetail("summary_card.view_all"),
                cta_brief: tDetail("summary_card.cta.brief"),
                deliverable_options: {
                  image: tDetail("brief_tab.deliverable_type.image"),
                  ad_video_short: tDetail(
                    "brief_tab.deliverable_type.ad_video_short"
                  ),
                  ad_video_long: tDetail(
                    "brief_tab.deliverable_type.ad_video_long"
                  ),
                  ai_vfx_mv: tDetail("brief_tab.deliverable_type.ai_vfx_mv"),
                  branding_video: tDetail(
                    "brief_tab.deliverable_type.branding_video"
                  ),
                  ad_video: tDetail("brief_tab.deliverable_type.ad_video"),
                  ai_human: tDetail("brief_tab.deliverable_type.ai_human"),
                  motion_graphics: tDetail(
                    "brief_tab.deliverable_type.motion_graphics"
                  ),
                  vfx: tDetail("brief_tab.deliverable_type.vfx"),
                  branding: tDetail("brief_tab.deliverable_type.branding"),
                  illustration: tDetail(
                    "brief_tab.deliverable_type.illustration"
                  ),
                  other: tDetail("brief_tab.deliverable_type.other"),
                },
              },
              attachments: {
                section_heading: tDetail("attachments.section_heading"),
                count_brief: (n: number) =>
                  tDetail("attachments.count_brief", { count: n }),
                count_reference: (n: number) =>
                  tDetail("attachments.count_reference", { count: n }),
                view_all: tDetail("attachments.view_all"),
                cta_attachments: tDetail("summary_card.cta.attachments"),
                empty: tDetail("attachments.empty"),
              },
              comments_section_heading: tDetail(
                "comments_thread.section_heading"
              ),
              comments_placeholder: tDetail("comments_thread.placeholder"),
              comments_cta: tDetail("summary_card.cta.comments"),
            }}
          />
        )}
        {activeTab === "brief" && (
          <BriefTab
            locale={localeNarrow}
            projectId={project.id}
            status={project.status}
            title={project.title}
            deliverable_types={project.deliverable_types}
            description={project.brief}
            mood_keywords={project.mood_keywords}
            mood_keywords_free={project.mood_keywords_free}
            visual_ratio={project.visual_ratio}
            visual_ratio_custom={project.visual_ratio_custom}
            channels={project.channels}
            target_audience={project.target_audience}
            additional_notes={project.additional_notes}
            budget_band={project.budget_band}
            target_delivery_at={project.target_delivery_at}
            meeting_preferred_at={project.meeting_preferred_at}
            interested_in_twin={project.interested_in_twin}
            submitted_at={project.submitted_at}
            creator_display_name={creatorDisplayName}
            labels={{
              banner_draft: tDetail("brief_tab.banner_draft"),
              cta_complete: tDetail("brief_tab.cta_complete"),
              section_stage1: tDetail("brief_tab.section_stage1"),
              section_stage2: tDetail("brief_tab.section_stage2"),
              section_stage3: tDetail("brief_tab.section_stage3"),
              field_project_name: tDetail("brief_tab.field_project_name"),
              field_deliverable_types: tDetail("brief_tab.field_deliverable_types"),
              field_description: tDetail("brief_tab.field_description"),
              field_mood_keywords: tDetail("brief_tab.field_mood_keywords"),
              field_channels: tDetail("brief_tab.field_channels"),
              field_target_audience: tDetail("brief_tab.field_target_audience"),
              field_visual_ratio: tDetail("brief_tab.field_visual_ratio"),
              field_additional_notes: tDetail("brief_tab.field_additional_notes"),
              field_budget_band: tDetail("brief_tab.field_budget_band"),
              field_target_delivery_at: tDetail("brief_tab.field_target_delivery_at"),
              field_meeting_preferred_at: tDetail("brief_tab.field_meeting_preferred_at"),
              field_interested_in_twin: tDetail("brief_tab.field_interested_in_twin"),
              field_submitted_at: tDetail("brief_tab.field_submitted_at"),
              field_creator: tDetail("brief_tab.field_creator"),
              empty_dash: tDetail("brief_tab.empty_dash"),
              twin_interested: tDetail("brief_tab.twin_interested"),
              twin_not_interested: tDetail("brief_tab.twin_not_interested"),
              twin_not_answered: tDetail("brief_tab.twin_not_answered"),
              budget_under_1m: tDetail("budget.under_1m"),
              budget_1m_to_5m: tDetail("budget.1m_to_5m"),
              budget_5m_to_10m: tDetail("budget.5m_to_10m"),
              budget_negotiable: tDetail("budget.negotiable"),
              mood_options: {
                emotional: tDetail("brief_tab.mood.emotional"),
                sophisticated: tDetail("brief_tab.mood.sophisticated"),
                humorous: tDetail("brief_tab.mood.humorous"),
                dynamic: tDetail("brief_tab.mood.dynamic"),
                minimal: tDetail("brief_tab.mood.minimal"),
                warm: tDetail("brief_tab.mood.warm"),
                luxurious: tDetail("brief_tab.mood.luxurious"),
                trendy: tDetail("brief_tab.mood.trendy"),
                friendly: tDetail("brief_tab.mood.friendly"),
              },
              channel_options: {
                instagram: tDetail("brief_tab.channel.instagram"),
                youtube: tDetail("brief_tab.channel.youtube"),
                tiktok: tDetail("brief_tab.channel.tiktok"),
                facebook: tDetail("brief_tab.channel.facebook"),
                website: tDetail("brief_tab.channel.website"),
                offline: tDetail("brief_tab.channel.offline"),
                other: tDetail("brief_tab.channel.other"),
              },
              visual_ratio_options: {
                "1_1": tDetail("brief_tab.visual_ratio.1_1"),
                "16_9": tDetail("brief_tab.visual_ratio.16_9"),
                "9_16": tDetail("brief_tab.visual_ratio.9_16"),
                "4_5": tDetail("brief_tab.visual_ratio.4_5"),
                "239_1": tDetail("brief_tab.visual_ratio.239_1"),
                custom: tDetail("brief_tab.visual_ratio.custom"),
              },
              deliverable_type_options: {
                image: tDetail("brief_tab.deliverable_type.image"),
                ad_video_short: tDetail("brief_tab.deliverable_type.ad_video_short"),
                ad_video_long: tDetail("brief_tab.deliverable_type.ad_video_long"),
                ai_vfx_mv: tDetail("brief_tab.deliverable_type.ai_vfx_mv"),
                branding_video: tDetail("brief_tab.deliverable_type.branding_video"),
                ad_video: tDetail("brief_tab.deliverable_type.ad_video"),
                ai_human: tDetail("brief_tab.deliverable_type.ai_human"),
                motion_graphics: tDetail("brief_tab.deliverable_type.motion_graphics"),
                vfx: tDetail("brief_tab.deliverable_type.vfx"),
                branding: tDetail("brief_tab.deliverable_type.branding"),
                illustration: tDetail("brief_tab.deliverable_type.illustration"),
                other: tDetail("brief_tab.deliverable_type.other"),
              },
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
          <EmptyStateTab
            heading={tDetail("empty_state.comments.heading")}
            subtext={tDetail("empty_state.comments.subtext")}
            Icon={MessageSquare}
          />
        )}
        {activeTab === "deliverables" && (
          <EmptyStateTab
            heading={tDetail("empty_state.deliverables.heading")}
            subtext={tDetail("empty_state.deliverables.subtext")}
            Icon={Package}
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
