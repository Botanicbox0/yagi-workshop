import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NewProjectWizard } from "./new-project-wizard";

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

  // Resolve first workspace
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const workspaceId = membership?.workspace_id ?? null;

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

  return (
    <div className="min-h-dvh bg-background">
      {/* Page header */}
      <div className="px-6 pt-10 pb-0 max-w-2xl mx-auto">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          {t("new")}
        </h1>
      </div>

      <NewProjectWizard brands={brands} />
    </div>
  );
}
