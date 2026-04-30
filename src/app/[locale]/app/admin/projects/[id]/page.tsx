// Phase 3.1 task_07 — Admin project detail page with right-rail asset panel.
// Auth: yagi_admin only (user_roles check; non-admin → notFound).
// Reads project_boards.asset_index server-side and renders AssetListPanel.
// Design: achromatic (L-011), soft shadow (L-013), font-suit (L-010), no seams (L-012).

import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { AssetListPanel } from "@/components/admin/asset-list-panel";
import { StatusBadge } from "@/components/projects/status-badge";
import type { Status } from "@/components/projects/status-badge";
import type { AssetIndexEntry } from "@/lib/board/asset-index";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function AdminProjectDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const tAdmin = await getTranslations("admin");
  const tDetail = await getTranslations("admin.projects.detail");

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  // yagi_admin role check
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");
  if (!isYagiAdmin) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0/3.1 columns not in generated types
  const sb = supabase as any;

  const { data: projectRaw, error: projectErr } = await sb
    .from("projects")
    .select(
      `
      id, title, brief, status,
      deliverable_types, estimated_budget_range,
      target_delivery_at, meeting_preferred_at, submitted_at, created_at,
      created_by,
      brand:brands(id, name),
      workspace:workspaces(id, name)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (projectErr || !projectRaw) notFound();

  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", projectRaw.created_by as string)
    .maybeSingle();

  // Fetch project_boards.asset_index (Phase 3.1)
  const { data: boardRow } = await sb
    .from("project_boards")
    .select("id, asset_index, is_locked")
    .eq("project_id", id)
    .maybeSingle();

  const assetIndex: AssetIndexEntry[] = Array.isArray(boardRow?.asset_index)
    ? (boardRow.asset_index as AssetIndexEntry[])
    : [];

  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const fmtDateTime = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const submittedAt = projectRaw.submitted_at
    ? fmt.format(new Date(projectRaw.submitted_at as string))
    : null;
  const targetDelivery = projectRaw.target_delivery_at
    ? fmt.format(new Date(projectRaw.target_delivery_at as string))
    : null;
  // Phase 3.1 hotfix-3 addendum: optional preferred meeting datetime
  // (cast: meeting_preferred_at column added in 20260430075826 — types regen in task_10)
  const meetingPreferredAtRaw = (projectRaw as { meeting_preferred_at?: string | null })
    .meeting_preferred_at;
  const meetingPreferredAt = meetingPreferredAtRaw
    ? fmtDateTime.format(new Date(meetingPreferredAtRaw))
    : null;

  const brand = Array.isArray(projectRaw.brand)
    ? projectRaw.brand[0]
    : projectRaw.brand;
  const workspace = Array.isArray(projectRaw.workspace)
    ? projectRaw.workspace[0]
    : projectRaw.workspace;
  const workspaceName = workspace?.name ?? "—";
  const brandName = brand?.name ?? null;
  const clientName =
    creatorProfile?.display_name ?? creatorProfile?.handle ?? "—";

  return (
    <div className="px-6 md:px-10 py-10 max-w-6xl">
      {/* Breadcrumb */}
      <nav
        aria-label="breadcrumb"
        className="mb-6 text-sm text-muted-foreground"
      >
        <Link
          href={`/${locale}/app/admin/projects`}
          className="hover:text-foreground transition-colors"
        >
          {tAdmin("projects_tab")}
        </Link>
        <span className="mx-1.5 text-muted-foreground/60">›</span>
        <span className="font-semibold text-foreground keep-all">
          {projectRaw.title as string}
        </span>
      </nav>

      {/* L2 headline (L-010 font-suit, L-012 no seam below) */}
      <div className="mb-8">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2">
          {workspaceName}
          {brandName && (
            <>
              <span className="mx-1.5">·</span>
              {brandName}
            </>
          )}
        </p>
        <h1 className="font-suit text-3xl font-bold tracking-tight text-foreground keep-all mb-3">
          {projectRaw.title as string}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <StatusBadge status={projectRaw.status as Status} />
          {submittedAt && (
            <span>
              {tDetail("submittedAt")}: {submittedAt}
            </span>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        {/* Left: project metadata */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          {projectRaw.brief && (
            <section aria-labelledby="desc-eyebrow">
              <p
                id="desc-eyebrow"
                className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3"
              >
                {tDetail("description")}
              </p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap keep-all">
                {projectRaw.brief as string}
              </p>
            </section>
          )}

          {/* Metadata */}
          <section aria-labelledby="meta-eyebrow">
            <p
              id="meta-eyebrow"
              className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-3"
            >
              {tDetail("status")}
            </p>
            <dl className="space-y-2 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted-foreground w-32 flex-shrink-0">
                  {tDetail("client")}
                </dt>
                <dd className="text-foreground">{clientName}</dd>
              </div>
              {Array.isArray(projectRaw.deliverable_types) &&
                projectRaw.deliverable_types.length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground w-32 flex-shrink-0">
                      {tDetail("deliverables")}
                    </dt>
                    <dd className="text-foreground">
                      {(projectRaw.deliverable_types as string[]).join(", ")}
                    </dd>
                  </div>
                )}
              {projectRaw.estimated_budget_range && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-32 flex-shrink-0">
                    {tDetail("budget")}
                  </dt>
                  <dd className="text-foreground">
                    {projectRaw.estimated_budget_range as string}
                  </dd>
                </div>
              )}
              {targetDelivery && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-32 flex-shrink-0">
                    {tDetail("deliveryDate")}
                  </dt>
                  <dd className="text-foreground">{targetDelivery}</dd>
                </div>
              )}
              {meetingPreferredAt && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground w-32 flex-shrink-0">
                    {tDetail("meetingPreferredAt")}
                  </dt>
                  <dd className="text-foreground">{meetingPreferredAt}</dd>
                </div>
              )}
            </dl>
          </section>
        </div>

        {/* Right rail: asset list panel */}
        <aside className="lg:col-span-1">
          <AssetListPanel assets={assetIndex} />
        </aside>
      </div>
    </div>
  );
}
