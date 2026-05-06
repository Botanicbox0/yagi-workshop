import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NewBoardForm } from "@/components/preprod/new-board-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewPreprodBoardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "preprod" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // Visibility: yagi_admin OR member of yagi-internal workspace
  const [{ data: isYagiAdmin }, { data: yagiWs }] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid }),
    supabase
      .from("workspaces")
      .select("id")
      .eq("slug", "yagi-internal")
      .maybeSingle(),
  ]);

  if (!isYagiAdmin) {
    if (!yagiWs) notFound();
    const { data: isMember } = await supabase.rpc("is_ws_member", {
      uid,
      wsid: yagiWs.id,
    });
    if (!isMember) notFound();
  }

  // Projects accessible via RLS — let Supabase enforce row visibility
  const { data: projectsData } = await supabase
    .from("projects")
    .select("id, title, workspace_id, workspaces(name)")
    .order("updated_at", { ascending: false })
    .limit(50);

  const projects = (projectsData ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    workspace: Array.isArray(p.workspaces)
      ? (p.workspaces[0] as { name: string } | undefined) ?? null
      : (p.workspaces as { name: string } | null),
  }));

  return (
    <div className="min-h-dvh bg-background">
      <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
        <h1 className="font-semibold tracking-display-ko text-3xl tracking-tight mb-1">
          {t("board_new_title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-2 mb-8 keep-all">
          {t("description_ph")}
        </p>
      </div>
      <NewBoardForm projects={projects} />
    </div>
  );
}
