import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Plus } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ProjectsQueue, type TabKey } from "@/components/admin/projects-queue";
import { TestDataToggle } from "@/components/admin/test-data-toggle";
import { shouldIncludeTestData } from "@/lib/admin/test-data";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ includeTest?: string | string[]; tab?: string | string[] }>;
};

export default async function AdminProjectsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const includeTest = shouldIncludeTestData(sp);

  // Deep-linkable queue tab (?tab=submitted …) — used by the dashboard
  // KPI cards. Falls back to 'all' on anything unknown.
  const VALID_TABS: readonly TabKey[] = [
    "all", "draft", "submitted", "in_review", "in_progress",
    "in_revision", "delivered", "approved", "cancelled", "archived",
  ];
  const rawTab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const initialTab: TabKey = VALID_TABS.includes(rawTab as TabKey)
    ? (rawTab as TabKey)
    : "all";
  const tAdmin = await getTranslations({ locale, namespace: "admin" });

  const supabase = await createSupabaseServer();

  // Fetch cross-workspace project requests for the internal queue.
  // The admin layout already gates this route to active kind='yagi_admin';
  // this query excludes YAGI's own internal workspace projects.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 project_boards not in generated types
  const sb = supabase as any;
  let query = sb
    .from('projects')
    .select(
      `
      id,
      title,
      status,
      project_type,
      deliverable_types,
      submitted_at,
      created_at,
      created_by,
      client:profiles!projects_created_by_fkey(id, display_name),
      workspace:workspaces!inner(id, name, kind, is_test)
    `
    )
    .in("workspace.kind", ["brand", "artist", "creator"])
    .in("status", [
      "draft",
      "submitted",
      "in_review",
      "in_progress",
      "in_revision",
      "delivered",
      "approved",
      "cancelled",
      "archived",
    ]);

  if (!includeTest) {
    query = query.eq("workspace.is_test", false);
  }

  const { data: projects, error } = await query.order("submitted_at", {
    ascending: false,
    nullsFirst: false,
  });

  if (error) {
    console.error("[AdminProjectsPage] Supabase error:", error);
  }

  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Database query result typing
  const projectRows = (projects ?? []).map((p: any) => {
    const deliverableTypes = Array.isArray(p.deliverable_types)
      ? p.deliverable_types
      : [];
    return {
      id: p.id,
      title: p.title,
      project_type: p.project_type,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dynamic status type from database
      status: p.status as any,
      submitted_at: p.submitted_at,
      created_at: p.created_at,
      dateLabel: dateFormatter.format(new Date(p.submitted_at || p.created_at)),
      client: p.client
        ? { id: p.client.id, name: p.client.display_name ?? "Unknown" }
        : null,
      workspace: p.workspace
        ? {
            id: p.workspace.id,
            name: p.workspace.name,
            kind: p.workspace.kind,
            isTest: p.workspace.is_test === true,
          }
        : null,
      deliverable_count: deliverableTypes.length,
    };
  });

  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-label text-brand">
            {tAdmin("label")}
          </p>
          <h1 className="text-3xl font-semibold text-foreground keep-all sm:text-4xl">
            {tAdmin("projects.queue_title")}
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
            {tAdmin("projects.queue_description")}
          </p>
        </div>
        <Link
          href="/app/admin/projects/curated/new"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          {tAdmin("projects.curated_new_cta")}
        </Link>
      </div>
      <div className="mb-6">
        <TestDataToggle
          baseHref="/app/admin/projects"
          includeTest={includeTest}
          label={tAdmin(includeTest ? "test_data_on" : "test_data_off")}
          showLabel={tAdmin("test_data_show")}
          hideLabel={tAdmin("test_data_hide")}
        />
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-border bg-surface-raised px-4 py-3 text-sm text-muted-foreground">
          {tAdmin("projects.queue.error")}
        </div>
      )}

      <ProjectsQueue projects={projectRows} initialTab={initialTab} />
    </main>
  );
}
