import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { BriefingCanvas } from "./briefing-canvas";

type Props = {
  params: Promise<{ locale: string }>;
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
  const workspaceId = active?.id ?? null;

  // Fetch brands for the workspace (empty list is fine — wizard shows "None" option)
  const brands: { id: string; name: string }[] = [];
  if (workspaceId) {
    const { data: brandsData } = await supabase
      .from("brands")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .order("name", { ascending: true });
    brands.push(...(brandsData ?? []));
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
    <BriefingCanvas brands={brands} activeWorkspaceId={workspaceId} />
  );
}
