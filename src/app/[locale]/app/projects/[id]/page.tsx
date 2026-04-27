// Phase 3.0 — Project detail page: full rebuild.
// Frame: Detail (UI_FRAMES.md Frame 3). Two-column: left rail = timeline; right = content.
// L-010: font-suit for product headlines. L-011: Achromatic only.
// L-012: No internal seams — section transitions via spacing only.
// L-013: No hard 1px borders on cards — soft layered shadow or border-border/40.
// L-014: No <em> / <i>.
// task_04 coordination: post-submit card fence preserved verbatim.
// FORBIDDEN: Direct UPDATE on projects.status from any path here.
// ALL transitions via transition_project_status RPC (project-actions.ts).

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BriefBoardEditor } from "@/components/brief-board/editor";
import { VersionHistorySidebar } from "@/components/brief-board/version-history";
import { BriefCommentPanel } from "@/components/brief-board/comment-panel";
import { LockBriefButton } from "@/components/brief-board/lock-button";
import type { JSONContent } from "@tiptap/react";
import { AdminDeleteButton } from "@/components/projects/admin-delete-button";
import { BriefSidePanel } from "@/components/brief-board/side-panel";
import { StatusBadge } from "@/components/projects/status-badge";
import { StatusTimeline } from "@/components/projects/status-timeline";
import { ProjectActionButtons } from "@/components/projects/project-action-buttons";
import type { Status } from "@/components/projects/status-badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ tab?: string; version?: string }>;
};

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
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  intake_mode: string;
  brand: { id: string; name: string; logo_url: string | null } | null;
  workspace: { id: string; name: string; logo_url: string | null } | null;
  creator: {
    id: string;
    handle: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};

type HistoryRow = {
  id: string;
  project_id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  actor_role: string;
  comment: string | null;
  transitioned_at: string;
};

type ReferenceRow = {
  id: string;
  kind: string;
  url: string | null;
  title: string | null;
  note: string | null;
  thumbnail_url: string | null;
  sort_order: number;
};

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
    <div
      className="mb-6 flex items-center gap-1 border-b border-border"
      role="tablist"
    >
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
        data-project={id}
      >
        {briefLabel}
      </Link>
    </div>
  );
}

export default async function ProjectDetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params;
  const sp = await searchParams;
  const activeTab = sp.tab === "brief" ? "brief" : "overview";
  const versionParam = sp.version ? Number(sp.version) : null;

  const t = await getTranslations("projects");

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // Fetch project without submitted_at first (submitted_at not in generated types yet —
  // Phase 3.0 migration adds it; we fetch it via a separate cast query).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
  const sb = supabase as any;
  const { data: projectRaw, error: projectErr } = await sb
    .from("projects")
    .select(
      `
      id, title, brief, status, project_type,
      brand_id, workspace_id, created_by,
      deliverable_types, estimated_budget_range,
      target_delivery_at, submitted_at, created_at, updated_at,
      intake_mode,
      brand:brands(id, name, logo_url),
      workspace:workspaces(id, name, logo_url)
    `
    )
    .eq("id", id)
    .maybeSingle() as { data: Record<string, unknown> | null; error: unknown };

  if (projectErr || !projectRaw) notFound();

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_url")
    .eq("id", projectRaw.created_by as string)
    .maybeSingle();

  const brandRaw = projectRaw.brand;
  const workspaceRaw = projectRaw.workspace;

  const project: ProjectDetail = {
    id: projectRaw.id as string,
    title: projectRaw.title as string,
    brief: projectRaw.brief as string | null,
    status: projectRaw.status as string,
    project_type: projectRaw.project_type as string,
    brand_id: projectRaw.brand_id as string | null,
    workspace_id: projectRaw.workspace_id as string,
    created_by: projectRaw.created_by as string,
    deliverable_types: projectRaw.deliverable_types as string[],
    estimated_budget_range: projectRaw.estimated_budget_range as string | null,
    target_delivery_at: projectRaw.target_delivery_at as string | null,
    submitted_at: projectRaw.submitted_at as string | null,
    created_at: projectRaw.created_at as string,
    updated_at: projectRaw.updated_at as string,
    intake_mode: projectRaw.intake_mode as string,
    brand: Array.isArray(brandRaw)
      ? ((brandRaw[0] as ProjectDetail["brand"]) ?? null)
      : (brandRaw as ProjectDetail["brand"]),
    workspace: Array.isArray(workspaceRaw)
      ? ((workspaceRaw[0] as ProjectDetail["workspace"]) ?? null)
      : (workspaceRaw as ProjectDetail["workspace"]),
    creator: creatorProfile ?? null,
  };

  // Resolve user roles — NOT via ProfileRole type narrowing (FORBIDDEN)
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
  const isAdmin = isYagiAdmin || isWsAdmin;
  const isOwner = project.created_by === user.id;

  // viewerRole determination — admin takes priority over client
  const viewerRole: "admin" | "client" | "other" = isAdmin
    ? "admin"
    : isOwner
    ? "client"
    : "other";

  const workspaceName = project.workspace?.name ?? "—";
  const brandName = project.brand?.name ?? null;
  const locale_ = (locale === "en" ? "en" : "ko") as "ko" | "en";

  // ─── Brief tab branch (existing, unchanged) ────────────────────────────────
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

    let viewerSnapshot: { content_json: unknown; version_n: number } | null =
      null;
    if (versionParam !== null && Number.isFinite(versionParam)) {
      const { data: snap } = await supabase
        .from("project_brief_versions")
        .select("content_json, version_n")
        .eq("project_id", project.id)
        .eq("version_n", versionParam)
        .maybeSingle();
      if (snap)
        viewerSnapshot = {
          content_json: snap.content_json,
          version_n: snap.version_n,
        };
    }

    const editorContent =
      (viewerSnapshot
        ? (viewerSnapshot.content_json as JSONContent | null)
        : (briefRow?.content_json as JSONContent | null)) ?? null;
    const editorUpdatedAt =
      briefRow?.updated_at ?? new Date(0).toISOString();
    const editorStatus =
      (briefRow?.status as "editing" | "locked" | undefined) ?? "editing";
    const editorMode = viewerSnapshot ? "viewer" : "full";

    const { data: threadRow } = await supabase
      .from("project_threads")
      .select("id")
      .eq("project_id", project.id)
      .limit(1)
      .maybeSingle();
    const sidePanelThreadId = threadRow?.id ?? null;

    return (
      <div className="px-6 md:px-10 py-10 max-w-6xl">
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
          </div>

          <BriefSidePanel
            projectId={project.id}
            threadId={sidePanelThreadId}
            messagesTab={<BriefCommentPanel projectId={project.id} />}
            versionsTab={
              <VersionHistorySidebar
                projectId={project.id}
                versions={versions}
                currentVersion={briefRow?.current_version ?? 0}
                viewingVersion={viewerSnapshot?.version_n ?? null}
                locale={locale}
                briefLocked={editorStatus === "locked"}
              />
            }
            className="md:col-span-1"
          />
        </div>
      </div>
    );
  }

  // ─── Overview tab — Phase 3.0 redesigned ─────────────────────────────────
  // Fetch status history — project_status_history not in generated types yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 table not in generated types
  const sbAny = supabase as any;
  const { data: historyRaw } = await sbAny
    .from("project_status_history")
    .select(
      "id, project_id, from_status, to_status, actor_id, actor_role, comment, transitioned_at"
    )
    .eq("project_id", project.id)
    .order("transitioned_at", { ascending: true })
    .limit(100);

  const historyRows: HistoryRow[] = (historyRaw ?? []) as unknown as HistoryRow[];

  // Fetch project references — kind/url/title/thumbnail_url/note/sort_order are Phase 3.0 columns
  const { data: refsRaw } = await sbAny
    .from("project_references")
    .select("id, kind, url, title, note, thumbnail_url, sort_order")
    .eq("project_id", project.id)
    .order("sort_order", { ascending: true })
    .limit(50);

  const references: ReferenceRow[] = (refsRaw ?? []) as unknown as ReferenceRow[];

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const submittedAtFormatted = project.submitted_at
    ? fmt.format(new Date(project.submitted_at))
    : null;
  const targetDeliveryFormatted = project.target_delivery_at
    ? fmt.format(new Date(project.target_delivery_at))
    : null;

  return (
    <div className="py-8 max-w-6xl">
      {/* ── L1: Breadcrumb ── */}
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

      {/* ── L2: Page header — SUIT headline, no border below (L-012) ── */}
      <div className="mb-8">
        {/* Eyebrow — editorial label (PRINCIPLES.md §4.4) */}
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">
          {workspaceName}
        </p>

        {/* L2 headline: font-suit (L-010), never font-display (Fraunces) */}
        <h1 className="font-suit text-4xl font-bold tracking-tight text-foreground keep-all mb-3">
          {project.title}
        </h1>

        {/* Status row: badge + submitted_at + delivery_date */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <StatusBadge status={project.status as Status} />
          {submittedAtFormatted && (
            <span>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(t as any)("detail_submitted_at")}: {submittedAtFormatted}
            </span>
          )}
          {targetDeliveryFormatted && (
            <span>
              {t("delivery_label")}: {targetDeliveryFormatted}
            </span>
          )}
        </div>
      </div>

      {/* Brief board tab nav */}
      <BriefTabsNav
        id={project.id}
        active="overview"
        overviewLabel={t("tab_overview")}
        briefLabel={t("tab_brief")}
      />

      {/* ── L3: Action button row — state × role matrix ── */}
      {viewerRole !== "other" && (
        <div className="mb-8">
          <ProjectActionButtons
            projectId={project.id}
            status={project.status}
            viewerRole={viewerRole}
            locale={locale_}
          />
        </div>
      )}

      {/* task_04: post-submit card start */}
      {project.status === "in_review" && user.id === project.created_by && (
        <div
          className="mb-8 rounded-lg p-6"
          id="project-received-card"
          style={{
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
          }}
        >
          <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3">
            {locale_ === "ko" ? "접수 완료" : "RECEIVED"}
          </p>
          <h2 className="font-suit text-2xl font-bold tracking-tight keep-all mb-2">
            {locale_ === "ko"
              ? "의뢰가 접수되었습니다"
              : "Your project has been received"}
          </h2>
          <p className="text-sm text-muted-foreground keep-all mb-4">
            {locale_ === "ko"
              ? "1 영업일 이내에 검토 후 회신드립니다."
              : "We will review and respond within 1 business day."}
          </p>
          {/* Status + relative time row */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <StatusBadge status={project.status as Status} />
            {project.submitted_at && (
              <span className="text-xs text-muted-foreground">
                {(() => {
                  const seconds = Math.floor(
                    (Date.now() - new Date(project.submitted_at!).getTime()) / 1000
                  );
                  if (seconds < 60) return locale_ === "ko" ? "방금 전" : "just now";
                  const minutes = Math.floor(seconds / 60);
                  if (minutes < 60) return locale_ === "ko" ? `${minutes}분 전` : `${minutes}m ago`;
                  const hours = Math.floor(minutes / 60);
                  if (hours < 24) return locale_ === "ko" ? `${hours}시간 전` : `${hours}h ago`;
                  const days = Math.floor(hours / 24);
                  return locale_ === "ko" ? `${days}일 전` : `${days}d ago`;
                })()}
              </span>
            )}
          </div>
          {/* CTA — anchor scroll to detail body */}
          <a
            href="#project-detail-body"
            className="inline-block rounded-full border border-border/40 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.10em] hover:bg-muted transition-colors"
          >
            {locale_ === "ko" ? "프로젝트 상세 보기" : "View project details"}
          </a>
        </div>
      )}
      {/* task_04: post-submit card end */}

      {/* ── Two-column layout: no horizontal seam between sections (L-012) ── */}
      {/* anchor target for post-submit card CTA */}
      <div id="project-detail-body" className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">

        {/* Left rail: status timeline (1/3 on desktop) */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <StatusTimeline
            projectId={project.id}
            initialRows={historyRows}
          />
        </aside>

        {/* Right column: description + references + metadata (2/3 on desktop) */}
        <div className="lg:col-span-2 order-1 lg:order-2 space-y-8">

          {/* Project description */}
          {project.brief && (
            <section aria-labelledby="desc-eyebrow">
              <p
                id="desc-eyebrow"
                className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3"
              >
                {t("description_label")}
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap keep-all">
                {project.brief}
              </p>
            </section>
          )}

          {/* References */}
          {references.length > 0 && (
            <section aria-labelledby="refs-eyebrow">
              <p
                id="refs-eyebrow"
                className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3"
              >
                {t("refs_step")}
              </p>
              <ul className="space-y-2">
                {references.map((ref) => (
                  <li key={ref.id}>
                    {/* Reference card: soft layered shadow (L-013) */}
                    <div
                      className="rounded-lg px-4 py-3 flex items-start gap-3 bg-background"
                      style={{
                        boxShadow:
                          "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
                      }}
                    >
                      {ref.thumbnail_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ref.thumbnail_url}
                          alt={ref.title ?? "reference"}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {ref.url ? (
                          <a
                            href={ref.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-foreground hover:underline truncate block keep-all"
                          >
                            {ref.title ?? ref.url}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-foreground truncate keep-all">
                            {ref.title ?? "—"}
                          </p>
                        )}
                        {ref.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground keep-all">
                            {ref.note}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground flex-shrink-0">
                        {ref.kind}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Delivery + budget metadata */}
          {(project.estimated_budget_range || project.target_delivery_at) && (
            <section aria-labelledby="meta-eyebrow">
              <p
                id="meta-eyebrow"
                className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3"
              >
                {t("review_step")}
              </p>
              <dl className="space-y-2 text-sm">
                {project.estimated_budget_range && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-32 flex-shrink-0">
                      {t("budget_label")}
                    </dt>
                    <dd className="text-foreground">
                      {project.estimated_budget_range}
                    </dd>
                  </div>
                )}
                {targetDeliveryFormatted && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-32 flex-shrink-0">
                      {t("delivery_label")}
                    </dt>
                    <dd className="text-foreground">{targetDeliveryFormatted}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* Admin-only: soft delete */}
          {isYagiAdmin && (
            <section className="pt-4">
              <AdminDeleteButton projectId={project.id} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
