import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { BriefBoardEditor } from "@/components/brief-board/editor";
import { VersionHistorySidebar } from "@/components/brief-board/version-history";
import { BriefCommentPanel } from "@/components/brief-board/comment-panel";
import { LockBriefButton } from "@/components/brief-board/lock-button";
import type { JSONContent } from "@tiptap/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { transitionStatusFormAction } from "./actions";
import { ThreadPanelServer } from "@/components/project/thread-panel-server";
import { ReferenceUploader } from "@/components/project/reference-uploader";
import { ReferenceGrid } from "@/components/project/reference-grid";
import { CopyShareLinkButton } from "@/components/preprod/copy-share-link-button";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string; version?: string }>;
};

// Local type matching the select shape
type ProjectDetail = {
  id: string;
  title: string;
  brief: string | null;
  status: string;
  project_type: string;
  brand_id: string | null;
  workspace_id: string;
  created_by: string;
  deliverable_types: string[];
  estimated_budget_range: string | null;
  target_delivery_at: string | null;
  created_at: string;
  updated_at: string;
  intake_mode: string;
  proposal_goal: string | null;
  proposal_audience: string | null;
  proposal_budget_range: string | null;
  proposal_timeline: string | null;
  brand: { id: string; name: string; logo_url: string | null } | null;
  workspace: { id: string; name: string; logo_url: string | null } | null;
  creator: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

// Allowed transitions per (role, currentStatus) → newStatus[]
// IMPORTANT: This map is duplicated in actions.ts (for enforcement) and here (for rendering).
// Keep them in sync.
const ALLOWED: Record<
  "workspace_admin" | "yagi_admin",
  Record<string, Array<{ newStatus: string; transitionKey: string }>>
> = {
  workspace_admin: {
    draft: [{ newStatus: "submitted", transitionKey: "transition_submit" }],
    delivered: [
      { newStatus: "approved", transitionKey: "transition_approve" },
      {
        newStatus: "in_revision",
        transitionKey: "transition_request_revision",
      },
    ],
  },
  yagi_admin: {
    submitted: [
      {
        newStatus: "in_discovery",
        transitionKey: "transition_start_discovery",
      },
    ],
    in_discovery: [
      {
        newStatus: "in_production",
        transitionKey: "transition_start_production",
      },
    ],
    in_production: [
      { newStatus: "delivered", transitionKey: "transition_mark_delivered" },
    ],
    in_revision: [
      { newStatus: "delivered", transitionKey: "transition_mark_delivered" },
    ],
    delivered: [
      { newStatus: "archived", transitionKey: "transition_archive" },
    ],
    approved: [
      { newStatus: "archived", transitionKey: "transition_archive" },
    ],
  },
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

function getPreprodStatusBadgeVariant(
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

function BriefBreadcrumb({
  workspaceName,
  brandName,
  title,
}: {
  workspaceName: string;
  brandName: string | null;
  title: string;
}) {
  return (
    <nav aria-label="breadcrumb" className="mb-6 text-sm text-muted-foreground">
      <span>{workspaceName}</span>
      {brandName && (
        <>
          <span className="mx-1.5 text-muted-foreground/60">›</span>
          <span>{brandName}</span>
        </>
      )}
      <span className="mx-1.5 text-muted-foreground/60">›</span>
      <span className="font-semibold text-foreground keep-all">{title}</span>
    </nav>
  );
}

function BriefTabsNav({
  id,
  active,
  overviewLabel,
  briefLabel,
}: {
  id: string;
  active: "overview" | "brief";
  overviewLabel: string;
  briefLabel: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-1 border-b border-border" role="tablist">
      <Link
        href={`?tab=overview`}
        role="tab"
        aria-selected={active === "overview"}
        className={cn(
          "px-3 py-2 text-xs uppercase tracking-[0.12em] border-b-2 -mb-px",
          active === "overview"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
      >
        {overviewLabel}
      </Link>
      <Link
        href={`?tab=brief`}
        role="tab"
        aria-selected={active === "brief"}
        className={cn(
          "px-3 py-2 text-xs uppercase tracking-[0.12em] border-b-2 -mb-px",
          active === "brief"
            ? "border-foreground text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground"
        )}
        // Mark the link unused for prop typing — id is implicit via current route.
        data-project={id}
      >
        {briefLabel}
      </Link>
    </div>
  );
}

function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

type TransitionKey =
  | "transition_submit"
  | "transition_start_discovery"
  | "transition_start_production"
  | "transition_request_revision"
  | "transition_mark_delivered"
  | "transition_approve"
  | "transition_archive";

type StatusI18nKey =
  | "status_draft"
  | "status_submitted"
  | "status_in_discovery"
  | "status_in_production"
  | "status_in_revision"
  | "status_delivered"
  | "status_approved"
  | "status_archived";

// Phase 2.8.1 G_B1-J (F-PUX-010): DeliverableKey is no longer used —
// deliverable_types renders raw since Phase 2.7.2 turned it into a
// free-text tag list. The legacy `deliverable_*` i18n keys remain in
// messages/{ko,en}.json for translation continuity but have no runtime
// callers. Type is kept here as a doc-only reminder for the deprecated
// enum surface; remove once messages also drop the keys.

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  // Phase 2.8.1 G_B1-I: Brief Board is the default landing tab for a
  // project — Overview is now metadata-only and serves as a deep-link
  // alias rather than the canonical entry point. Legacy `?tab=overview`
  // bookmarks still resolve (UI just hides per-section blocks that have
  // moved to the Brief tab); any other / missing value defaults to brief.
  const activeTab = sp.tab === "overview" ? "overview" : "brief";
  const versionParam = sp.version ? Number(sp.version) : null;

  // Load namespaces — projects for most strings; threads/dashboard/settings/preprod
  // for section headers that don't have dedicated keys in the projects namespace
  const [t, tThreads, tDash, tSettings, tPreprod] = await Promise.all([
    getTranslations("projects"),
    getTranslations("threads"),
    getTranslations("dashboard"),
    getTranslations("settings"),
    getTranslations("preprod"),
  ]);

  const supabase = await createSupabaseServer();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch project with related data
  const { data: projectRaw, error: projectErr } = await supabase
    .from("projects")
    .select(
      `
      id, title, brief, status, project_type,
      brand_id, workspace_id, created_by,
      deliverable_types, estimated_budget_range,
      target_delivery_at, created_at, updated_at,
      intake_mode, proposal_goal, proposal_audience,
      proposal_budget_range, proposal_timeline,
      brand:brands(id, name, logo_url),
      workspace:workspaces(id, name, logo_url)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (projectErr || !projectRaw) notFound();

  // Fetch creator profile separately (avoids FK-hint syntax issues with profiles)
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .eq("id", projectRaw.created_by)
    .maybeSingle();

  const project: ProjectDetail = {
    ...projectRaw,
    brand: Array.isArray(projectRaw.brand)
      ? (projectRaw.brand[0] ?? null)
      : projectRaw.brand,
    workspace: Array.isArray(projectRaw.workspace)
      ? (projectRaw.workspace[0] ?? null)
      : projectRaw.workspace,
    creator: creatorProfile ?? null,
  };

  // Resolve user's roles for this project's workspace
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role, workspace_id")
    .eq("user_id", user.id);

  const roles = new Set(
    (roleRows ?? [])
      .filter(
        (r) =>
          r.workspace_id === null ||
          r.workspace_id === project.workspace_id
      )
      .map((r) => r.role as string)
  );

  // Compute available transitions for this user × status
  const availableTransitions: Array<{
    newStatus: string;
    transitionKey: string;
  }> = [];

  if (roles.has("workspace_admin")) {
    const wsAdminOptions = ALLOWED.workspace_admin[project.status] ?? [];
    for (const opt of wsAdminOptions) {
      if (!availableTransitions.some((a) => a.newStatus === opt.newStatus)) {
        availableTransitions.push(opt);
      }
    }
  }
  if (roles.has("yagi_admin")) {
    const yagiOptions = ALLOWED.yagi_admin[project.status] ?? [];
    for (const opt of yagiOptions) {
      if (!availableTransitions.some((a) => a.newStatus === opt.newStatus)) {
        availableTransitions.push(opt);
      }
    }
  }

  // Determine if user is yagi_admin for preprod boards visibility
  const isYagiAdmin = roles.has("yagi_admin");
  const isClientUser = roles.has("workspace_admin") || roles.has("workspace_member");

  // Computed early so the brief-tab branch below can reuse them in the
  // shared breadcrumb / metadata slots.
  const workspaceName = project.workspace?.name ?? "—";
  const brandName = project.brand?.name ?? null;

  // -----------------------------------------------------------------------
  // Phase 2.8 G_B-7: Brief tab branch.
  // When ?tab=brief, render the brief board surface (editor + version
  // history + comments) instead of the overview. ?version=N within
  // brief tab mounts the editor in viewer mode for that snapshot.
  // -----------------------------------------------------------------------
  if (activeTab === "brief") {
    const tBrief = await getTranslations({ locale, namespace: "brief_board" });

    const { data: briefRow } = await supabase
      .from("project_briefs")
      .select(
        "content_json, status, current_version, tiptap_schema_version, updated_at"
      )
      .eq("project_id", project.id)
      .maybeSingle();

    const { data: versionsRaw } = await supabase
      .from("project_brief_versions")
      .select("id, version_n, label, created_at")
      .eq("project_id", project.id)
      .order("version_n", { ascending: false });

    const versions = (versionsRaw ?? []).map((v) => ({
      id: v.id,
      version_n: v.version_n,
      label: v.label,
      created_at: v.created_at,
    }));

    let viewerSnapshot: { content_json: unknown; version_n: number } | null = null;
    if (versionParam !== null && Number.isFinite(versionParam)) {
      const { data: snap } = await supabase
        .from("project_brief_versions")
        .select("content_json, version_n")
        .eq("project_id", project.id)
        .eq("version_n", versionParam)
        .maybeSingle();
      if (snap) viewerSnapshot = { content_json: snap.content_json, version_n: snap.version_n };
    }

    const editorContent =
      (viewerSnapshot
        ? (viewerSnapshot.content_json as JSONContent | null)
        : (briefRow?.content_json as JSONContent | null)) ?? null;
    const editorUpdatedAt = briefRow?.updated_at ?? new Date(0).toISOString();
    const editorStatus =
      (briefRow?.status as "editing" | "locked" | undefined) ?? "editing";
    const editorMode = viewerSnapshot ? "viewer" : "full";

    return (
      <div className="px-6 md:px-10 py-10 max-w-6xl">
        <BriefBreadcrumb workspaceName={workspaceName} brandName={brandName} title={project.title} />
        <BriefTabsNav
          id={project.id}
          active="brief"
          overviewLabel={t("tab_overview")}
          briefLabel={t("tab_brief")}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {tBrief("title")}
              </h2>
              <LockBriefButton
                projectId={project.id}
                status={editorStatus}
                isYagiAdmin={isYagiAdmin}
              />
            </div>
            <BriefBoardEditor
              projectId={project.id}
              initialContent={editorContent}
              initialUpdatedAt={editorUpdatedAt}
              initialStatus={editorStatus}
              mode={editorMode}
              viewerVersionN={viewerSnapshot?.version_n}
              viewerBackHref={`/${locale}/app/projects/${project.id}?tab=brief`}
            />
            <section className="mt-8">
              <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-3">
                {tThreads("title")}
              </h3>
              <BriefCommentPanel projectId={project.id} />
            </section>
          </div>

          <VersionHistorySidebar
            projectId={project.id}
            versions={versions}
            currentVersion={briefRow?.current_version ?? 0}
            viewingVersion={viewerSnapshot?.version_n ?? null}
            locale={locale}
            briefLocked={editorStatus === "locked"}
            className="md:col-span-1"
          />
        </div>
      </div>
    );
  }
  // -----------------------------------------------------------------------
  // (default) Overview tab — existing legacy render below.
  // -----------------------------------------------------------------------


  // Fetch pre-production boards for this project
  type Board = {
    id: string;
    title: string;
    status: string;
    share_enabled: boolean;
    share_token: string | null;
    updated_at: string;
    created_at: string;
  };

  let boardsQuery = supabase
    .from("preprod_boards")
    .select(
      "id, title, status, share_enabled, share_token, updated_at, created_at"
    )
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });

  // Filter by visibility: yagi_admin sees all, clients see only shared/approved
  if (!isYagiAdmin && isClientUser) {
    boardsQuery = boardsQuery.in("status", ["shared", "approved"]);
  }

  const { data: rawBoards } = await boardsQuery;
  const boards = (rawBoards ?? []) as Board[];

  // For each board, get current-revision frame count (simple N+1 OK for small projects)
  let boardsWithCounts: (Board & { frame_count: number })[] = [];
  if (boards.length > 0) {
    const boardIds = boards.map((b) => b.id);
    const { data: frameRows } = await supabase
      .from("preprod_frames")
      .select("board_id")
      .in("board_id", boardIds)
      .eq("is_current_revision", true);

    const frameCounts: Record<string, number> = {};
    for (const row of frameRows ?? []) {
      frameCounts[row.board_id] = (frameCounts[row.board_id] ?? 0) + 1;
    }

    boardsWithCounts = boards.map((b) => ({
      ...b,
      frame_count: frameCounts[b.id] ?? 0,
    }));
  }

  // Fetch latest feedback (reaction or comment) for this project's boards
  type FeedbackItem = {
    type: "reaction" | "comment";
    emoji?: string;
    created_at: string;
    frame_order: number;
    board_title: string;
  };
  let latestFeedback: FeedbackItem | null = null;

  if (boardsWithCounts.length > 0) {
    const boardIds = boardsWithCounts.map((b) => b.id);

    type ReactionRow = {
      reaction: string;
      created_at: string;
      frame: {
        frame_order: number;
        board: {
          id: string;
          title: string;
        };
      };
    };

    type CommentRow = {
      body: string;
      created_at: string;
      frame: {
        frame_order: number;
        board: {
          id: string;
          title: string;
        };
      };
    };

    const [{ data: latestReactionRaw }, { data: latestCommentRaw }] =
      await Promise.all([
        supabase
          .from("preprod_frame_reactions")
          .select(
            "reaction, created_at, frame:preprod_frames!inner(frame_order, board:preprod_boards!inner(id, title))"
          )
          .in("board_id", boardIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("preprod_frame_comments")
          .select(
            "body, created_at, frame:preprod_frames!inner(frame_order, board:preprod_boards!inner(id, title))"
          )
          .in("board_id", boardIds)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const latestReaction = latestReactionRaw as ReactionRow | null;
    const latestComment = latestCommentRaw as CommentRow | null;

    // Pick the more recent of the two
    if (latestReaction && latestComment) {
      const reactionTime = new Date(latestReaction.created_at).getTime();
      const commentTime = new Date(latestComment.created_at).getTime();
      if (reactionTime > commentTime) {
        latestFeedback = {
          type: "reaction",
          emoji: latestReaction.reaction,
          created_at: latestReaction.created_at,
          frame_order: latestReaction.frame.frame_order,
          board_title: latestReaction.frame.board.title,
        };
      } else {
        latestFeedback = {
          type: "comment",
          created_at: latestComment.created_at,
          frame_order: latestComment.frame.frame_order,
          board_title: latestComment.frame.board.title,
        };
      }
    } else if (latestReaction) {
      latestFeedback = {
        type: "reaction",
        emoji: latestReaction.reaction,
        created_at: latestReaction.created_at,
        frame_order: latestReaction.frame.frame_order,
        board_title: latestReaction.frame.board.title,
      };
    } else if (latestComment) {
      latestFeedback = {
        type: "comment",
        created_at: latestComment.created_at,
        frame_order: latestComment.frame.frame_order,
        board_title: latestComment.frame.board.title,
      };
    }
  }

  // Format dates
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const createdAtFormatted = fmt.format(new Date(project.created_at));
  const targetDeliveryFormatted = project.target_delivery_at
    ? fmt.format(new Date(project.target_delivery_at))
    : "—";

  const statusI18nKey = `status_${project.status}` as StatusI18nKey;

  return (
    <div className="px-6 md:px-10 py-10 max-w-6xl">
      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <span>{workspaceName}</span>
        {brandName && (
          <>
            <span className="mx-1.5 text-muted-foreground/60">›</span>
            <span>{brandName}</span>
          </>
        )}
        <span className="mx-1.5 text-muted-foreground/60">›</span>
        <span className="font-semibold text-foreground keep-all">
          {project.title}
        </span>
      </nav>

      <BriefTabsNav
        id={project.id}
        active="overview"
        overviewLabel={t("tab_overview")}
        briefLabel={t("tab_brief")}
      />

      {/* Title row: status badge + action dropdown */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-2xl md:text-3xl tracking-tight keep-all">
            <em>{project.title}</em>
          </h1>
          {/* Status badge — inlined, no shared component */}
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
              statusBadgeClass(project.status)
            )}
          >
            {t(statusI18nKey)}
          </span>
          {/* Phase 2.8.1 G_B1-E: legacy proposal_request projects keep a
              read-only marker. New projects are always brief-mode after
              Phase 2.7.2 wizard cleanup, so the badge collapses to a
              muted notice rather than an active state. */}
          {project.intake_mode === "proposal_request" && (
            <span className="inline-flex items-center rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs font-medium text-muted-foreground keep-all">
              {t("legacy_proposal_banner")}
            </span>
          )}
        </div>

        {/* Action dropdown — only rendered when transitions are available */}
        {availableTransitions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full uppercase tracking-[0.12em] text-xs"
              >
                {t(statusI18nKey)} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              {availableTransitions.map((item) => (
                <DropdownMenuItem key={item.newStatus} asChild>
                  <form action={transitionStatusFormAction}>
                    <input type="hidden" name="projectId" value={project.id} />
                    <input
                      type="hidden"
                      name="newStatus"
                      value={item.newStatus}
                    />
                    <button
                      type="submit"
                      className="w-full text-left cursor-pointer text-sm"
                    >
                      {t(item.transitionKey as TransitionKey)}
                    </button>
                  </form>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left: main content — col-span-2 */}
        <div className="md:col-span-2 space-y-8">
          {/* Phase 2.8.1 G_B1-E: legacy proposal_request projects retain
              their stored client-context fields in a read-only banner.
              New writes go through the brief-mode wizard only — there is
              no editor for these fields anymore. */}
          {project.intake_mode === "proposal_request" && (
            <section className="border border-dashed border-border rounded-lg p-4 space-y-2 bg-muted/30">
              <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {t("legacy_proposal_banner")}
              </p>
              {(project.proposal_goal ||
                project.proposal_audience ||
                project.proposal_budget_range ||
                project.proposal_timeline) && (
                <dl className="text-sm space-y-1.5">
                  {project.proposal_goal && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-xs text-muted-foreground">goal</dt>
                      <dd className="whitespace-pre-wrap keep-all">{project.proposal_goal}</dd>
                    </div>
                  )}
                  {project.proposal_audience && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-xs text-muted-foreground">audience</dt>
                      <dd className="whitespace-pre-wrap keep-all">{project.proposal_audience}</dd>
                    </div>
                  )}
                  {project.proposal_budget_range && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-xs text-muted-foreground">budget</dt>
                      <dd className="whitespace-pre-wrap keep-all">{project.proposal_budget_range}</dd>
                    </div>
                  )}
                  {project.proposal_timeline && (
                    <div className="grid grid-cols-[120px_1fr] gap-2">
                      <dt className="text-xs text-muted-foreground">timeline</dt>
                      <dd className="whitespace-pre-wrap keep-all">{project.proposal_timeline}</dd>
                    </div>
                  )}
                </dl>
              )}
            </section>
          )}

          {/* Phase 2.8.1 G_B1-I: redundant Brief text section removed from
              Overview — the Brief Board on ?tab=brief is the canonical
              surface for brief content (Phase 2.8 G_B). References /
              pre-production / thread sections below remain on Overview
              until Phase 2.10 relocates them under the Brief Board surface
              (FU-2.10-overview-consolidation). */}

          {/* References section — subtask 08 */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              {t("refs_step")}
            </h2>
            <ReferenceUploader projectId={project.id} />
            <ReferenceGrid projectId={project.id} />
          </section>

          {/* Pre-production Boards section — subtask 09 */}
          {boardsWithCounts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
                {tPreprod("board_list_title")}
              </h2>

              {/* Latest feedback card */}
              {latestFeedback && (
                <div className="border border-border rounded-lg p-4 mb-4 bg-accent/30">
                  <p className="text-sm text-foreground">
                    <span className="font-medium keep-all">
                      Frame {latestFeedback.frame_order}
                    </span>
                    {" on "}
                    <span className="font-medium keep-all">
                      {latestFeedback.board_title}
                    </span>
                    {latestFeedback.type === "reaction" && (
                      <>
                        {" got "}
                        <span className="text-lg">{latestFeedback.emoji}</span>
                      </>
                    )}
                    {latestFeedback.type === "comment" && " got a comment"}
                    {" · "}
                    <span className="text-muted-foreground">
                      {getRelativeTime(latestFeedback.created_at)}
                    </span>
                  </p>
                </div>
              )}

              {/* Boards table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {tPreprod("title_label")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {tPreprod("filter_status")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                        {tPreprod("frame_count_n", { count: 0 }).replace("0", "")}
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                        {tPreprod("last_edited_at", { at: "" })}
                      </th>
                      {isYagiAdmin && (
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                          {tPreprod("copy_share_link")}
                        </th>
                      )}
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        {tPreprod("view_board")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {boardsWithCounts.map((board) => {
                      const siteUrl =
                        process.env.NEXT_PUBLIC_SITE_URL ||
                        "http://localhost:3001";
                      const shareUrl =
                        board.share_enabled && board.share_token
                          ? `${siteUrl}/s/${board.share_token}`
                          : null;

                      return (
                        <tr
                          key={board.id}
                          className="border-b border-border last:border-0 hover:bg-accent transition-colors"
                        >
                          <td className="px-4 py-3 font-medium keep-all line-clamp-1">
                            {isYagiAdmin ? (
                              <a
                                href={`/app/preprod/${board.id}`}
                                className="hover:underline"
                              >
                                {board.title}
                              </a>
                            ) : (
                              board.title
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={getPreprodStatusBadgeVariant(
                                board.status
                              )}
                              className={cn(
                                "rounded-full text-[11px] px-2.5 py-0.5"
                              )}
                            >
                              {tPreprod(
                                `status_${board.status}` as
                                  | "status_draft"
                                  | "status_shared"
                                  | "status_approved"
                                  | "status_archived"
                              )}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground tabular-nums">
                            {tPreprod("frame_count_n", {
                              count: board.frame_count,
                            })}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground whitespace-nowrap tabular-nums">
                            {new Intl.DateTimeFormat(locale, {
                              dateStyle: "medium",
                              timeZone: "Asia/Seoul",
                            }).format(new Date(board.updated_at))}
                          </td>
                          {isYagiAdmin && (
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {shareUrl ? (
                                <CopyShareLinkButton
                                  url={shareUrl}
                                  label={tPreprod("share_link_copy")}
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            {shareUrl ? (
                              <a
                                href={shareUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs rounded-full uppercase tracking-[0.12em] px-3 py-1.5 bg-foreground text-background hover:bg-foreground/90 transition-colors inline-block"
                              >
                                {tPreprod("view_board")}
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Thread section — subtask 09 */}
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              {tThreads("title")}
            </h2>
            <ThreadPanelServer projectId={project.id} />
          </section>
        </div>

        {/* Right: metadata sidebar */}
        <aside className="md:col-span-1 space-y-6">
          {/* Metadata key/value card */}
          <div className="border border-border rounded-lg p-4 space-y-4">
            {/* Created by */}
            <div>
              {project.creator ? (
                <div className="flex items-center gap-2">
                  {project.creator.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={project.creator.avatar_url}
                      alt={project.creator.display_name}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-muted-foreground uppercase">
                      {(
                        project.creator.display_name || project.creator.handle
                      ).charAt(0)}
                    </span>
                  )}
                  <span className="text-sm text-foreground truncate">
                    {project.creator.display_name || project.creator.handle}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>

            {/* Created at */}
            <div>
              <p className="text-sm text-foreground">{createdAtFormatted}</p>
            </div>

            {/* Target delivery */}
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1">
                {t("delivery_label")}
              </p>
              <p className="text-sm text-foreground">
                {targetDeliveryFormatted}
              </p>
            </div>

            {/* Budget range */}
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1">
                {t("budget_label")}
              </p>
              <p className="text-sm text-foreground">
                {project.estimated_budget_range ?? "—"}
              </p>
            </div>

            {/* Deliverable types */}
            {project.deliverable_types.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground mb-1.5">
                  {t("deliverable_types_label")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {/* Phase 2.8.1 G_B1-J (F-PUX-010): deliverable_types is a
                      free-text tag list since Phase 2.7.2 — render the
                      user's input verbatim instead of mapping to a closed
                      enum. The legacy `deliverable_*` i18n keys are kept
                      for translation continuity but no longer referenced
                      from runtime code. */}
                  {project.deliverable_types.map((dt) => (
                    <span
                      key={dt}
                      className="inline-flex rounded-full border border-border px-2.5 py-0.5 text-xs text-foreground keep-all"
                    >
                      {dt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Participants — creator only; subtask 12 will add workspace members */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground mb-3">
              {/* No "participants" key in projects namespace — nav.team ("팀") is closest */}
              {tSettings("team_tab")}
            </h3>
            {project.creator ? (
              <div className="flex items-center gap-2">
                {project.creator.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.creator.avatar_url}
                    alt={project.creator.display_name}
                    className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs font-medium text-muted-foreground uppercase">
                    {(
                      project.creator.display_name || project.creator.handle
                    ).charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {project.creator.display_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{project.creator.handle}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>

          {/* Milestones — coming soon */}
          <div className="border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground/60">
              {tDash("coming_soon")}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
