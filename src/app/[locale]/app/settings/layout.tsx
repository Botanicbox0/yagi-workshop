import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Link } from "@/i18n/routing";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function SettingsLayout({ children, params }: Props) {
  const { locale } = await params;
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });

  const t = await getTranslations("settings");

  const isWsAdmin = ctx!.workspaceRoles.includes("workspace_admin");

  const tabs = [
    { key: "profile", label: t("profile_tab"), href: "/app/settings" as const },
    ...(isWsAdmin
      ? [
          {
            key: "workspace",
            label: t("workspace_tab"),
            href: "/app/settings?tab=workspace" as "/app/settings",
          },
          {
            key: "team",
            label: t("team_tab"),
            href: "/app/settings?tab=team" as "/app/settings",
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-serif italic keep-all mb-6">{t("title")}</h1>
      <div className="border-b border-border mb-8 flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            className="pb-3 text-sm text-muted-foreground hover:text-foreground"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
