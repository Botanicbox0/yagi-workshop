import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { fetchAppContext } from "@/lib/app/context";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AppDashboardPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("dashboard");
  const ctx = await fetchAppContext();

  // Phase 2.7: client persona's primary surface is /app/commission, not
  // /app. Send them there so they don't see the workspace-projects shell
  // they have no use for.
  if (ctx?.profile.role === "client") {
    redirect(`/${locale}/app/commission`);
  }

  const isYagiAdmin = ctx?.workspaceRoles.includes("yagi_admin") ?? false;
  const isCreator = ctx?.workspaceRoles.includes("creator") ?? false;

  if (isYagiAdmin) {
    return (
      <div className="px-10 py-12 max-w-5xl">
        <h1 className="font-display text-3xl tracking-tight mb-2">
          <em>All projects</em>
        </h1>
        <p className="text-sm text-muted-foreground">Across all workspaces</p>
        <div className="mt-10 text-sm text-muted-foreground">
          {/* Phase 1.2+ */}
          (admin project list placeholder)
        </div>
      </div>
    );
  }

  if (isCreator) {
    return (
      <div className="px-10 py-12 max-w-5xl">
        <h1 className="font-display text-3xl tracking-tight mb-2">
          <em>Creator dashboard</em>
        </h1>
        <p className="text-sm text-muted-foreground">Contests &amp; submissions</p>
        <div className="mt-10 text-sm text-muted-foreground">
          {/* Phase 2 */}
          (creator contest list placeholder)
        </div>
      </div>
    );
  }

  // Client (workspace_admin / workspace_member) view
  return (
    <div className="px-10 py-12 max-w-5xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl tracking-tight mb-1">
            <em>Projects</em>
          </h1>
          <p className="text-sm text-muted-foreground">
            {ctx?.workspaces[0]?.name}
          </p>
        </div>
        <Button size="lg" disabled title={t("coming_soon")}>
          {t("new_project")}
        </Button>
      </div>

      <Tabs defaultValue="direct" className="w-full">
        <TabsList>
          <TabsTrigger value="direct" disabled>
            {t("direct_tab")}
          </TabsTrigger>
          <TabsTrigger value="contest" disabled>
            {t("contest_tab")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mt-16 flex flex-col items-center justify-center text-center py-20 border border-dashed border-border rounded-lg">
        <p className="font-display text-xl tracking-tight mb-2">
          <em>{t("empty_title")}</em>
        </p>
        <p className="text-sm text-muted-foreground">{t("empty_sub")}</p>
      </div>
    </div>
  );
}
