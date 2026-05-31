import Link from "next/link";
import { redirect } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { CuratedProjectCreateForm } from "./curated-project-create-form";

type Props = {
  params: Promise<{ locale: string }>;
};

type WorkspaceOption = {
  id: string;
  name: string;
};

export default async function NewCuratedProjectPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "admin.projects.curated_new",
  });
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isAdmin) {
    redirect({ href: "/app", locale });
    return null;
  }

  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.is_test typegen pending
  const sbAny = sbAdmin as any;
  const { data: workspacesRaw } = await sbAny
    .from("workspaces")
    .select("id, name")
    .eq("is_test", false)
    .order("name", { ascending: true });
  const workspaces = (workspacesRaw ?? []) as WorkspaceOption[];

  return (
    <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href={`/${locale}/app/admin/projects`}
        className="mb-6 inline-flex text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        {t("back")}
      </Link>
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-label text-brand">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold text-foreground keep-all sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
          {t("description")}
        </p>
      </header>

      <CuratedProjectCreateForm workspaces={workspaces} />
    </main>
  );
}
