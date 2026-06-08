import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import {
  getAppLandingPath,
  resolveAppActor,
} from "@/lib/app/role-routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { BriefingCanvas } from "./briefing-canvas";

type Props = {
  params: Promise<{ locale: string }>;
};

type LatestProjectSeed = {
  id: string;
  title: string;
  brief: string | null;
  deliverable_types: string[];
  status: string;
  updated_at: string;
};

export default async function NewProjectPage({ params }: Props) {
  const { locale } = await params;

  const t = await getTranslations({ locale, namespace: "projects" });

  const supabase = await createSupabaseServer();

  // Auth guard — layout handles it but be explicit
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  // Wave C.5d sub_03b — replace first-membership fallback with the
  // cookie-based active workspace resolver so brand list + downstream
  // wizard payload reflect the workspace the user actually selected in
  // the switcher (Codex K-05 final review LOOP 1 MED-C).
  const active = await resolveActiveWorkspace(user.id);
  const actor = resolveAppActor(
    active,
    await getIsYagiAdmin(supabase, user.id),
  );
  if (actor !== "brand") {
    redirect({ href: actor ? getAppLandingPath(actor) : "/onboarding", locale });
    return null;
  }
  const workspaceId = active?.id ?? null;

  // Fetch brands for the workspace (empty list is fine — wizard shows "None" option)
  const brands: { id: string; name: string }[] = [];
  let priorProjectCount = 0;
  let latestProject: LatestProjectSeed | null = null;
  if (workspaceId) {
    const { data: brandsData } = await supabase
      .from("brands")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });
    brands.push(...(brandsData ?? []));

    const [{ count }, { data: latest }] = await Promise.all([
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("status", "draft")
        .is("deleted_at", null),
      supabase
        .from("projects")
        .select("id, title, brief, deliverable_types, status, updated_at")
        .eq("workspace_id", workspaceId)
        .neq("status", "draft")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    priorProjectCount = count ?? 0;
    latestProject = latest
      ? {
          id: latest.id,
          title: latest.title,
          brief: latest.brief,
          deliverable_types: latest.deliverable_types ?? [],
          status: latest.status,
          updated_at: latest.updated_at,
        }
      : null;
  }

  // Phase 5 Wave B task_04 — paradigm shift from form-only wizard to
  // 3-stage Briefing Canvas. The canvas owns its own header (the project
  // title input lives at the top of Stage 1), so we no longer render a
  // page-level header here. The legacy NewProjectWizard component stays
  // in src/ for now — it is no longer mounted from any route, and the
  // cleanup commit lands in Phase 5 ff-merge hotfix-1 per KICKOFF §제약.
  // Suppress the unused t() import (the new-page header was the only
  // consumer here).
  void t;
  return (
    <BriefingCanvas
      brands={brands}
      activeWorkspaceId={workspaceId}
      priorProjectCount={priorProjectCount}
      latestProject={latestProject}
    />
  );
}
