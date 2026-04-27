import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
import { NotificationBell } from "@/components/app/notification-bell";
import { PageHelpLink } from "@/components/app/page-help-link";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserScopes } from "@/lib/app/scopes";
import { UserScopesProvider } from "@/lib/app/use-user-scopes";
import { SupportWidget } from "@/components/support/support-widget";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  const ctx = await fetchAppContext();
  if (!ctx) {
    redirect({ href: "/onboarding", locale });
    return null;
  }

  const hasPrivilegedGlobalRole =
    ctx.workspaceRoles.includes("yagi_admin") ||
    ctx.workspaceRoles.includes("creator");
  // Phase 2.7: client persona doesn't need a workspace; their primary
  // surface is /app/commission.
  const isClient = ctx.profile.role === "client";
  if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
    redirect({ href: "/onboarding/workspace", locale });
    return null;
  }

  // Seed the bell with the current unread count. Realtime takes over from here.
  const { count: initialUnreadCount } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("in_app_seen_at", null);

  const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";

  const scopes = getUserScopes(ctx);

  return (
    <UserScopesProvider value={scopes}>
      <div className="min-h-dvh flex">
        <Sidebar context={ctx} />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
            <MobileSidebarSheet context={ctx} />
            <div className="flex-1" />
            <PageHelpLink />
            <LanguageSwitcher />
            <NotificationBell
              initialUnreadCount={initialUnreadCount ?? 0}
              locale={bellLocale}
            />
          </header>
          <main className="flex-1 min-w-0">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
              {children}
            </div>
          </main>
        </div>
        {/* Phase 2.8.6 — workspace-scoped support chat. Hidden when
            the user has no workspace (mid-onboarding edge case). */}
        <SupportWidget
          workspaceId={ctx.workspaces[0]?.id ?? null}
          currentUserId={ctx.userId}
          currentUserName={ctx.profile.display_name ?? ""}
        />
      </div>
    </UserScopesProvider>
  );
}
