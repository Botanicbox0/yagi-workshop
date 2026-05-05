import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
import {
  resolveActiveWorkspace,
  listOwnWorkspaces,
} from "@/lib/workspace/active";
import { NotificationBell } from "@/components/app/notification-bell";
import { PageHelpLink } from "@/components/app/page-help-link";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserScopes } from "@/lib/app/scopes";
import { UserScopesProvider } from "@/lib/app/use-user-scopes";
import { SupportWidget } from "@/components/support/support-widget";
import { checkArtistOnboardingGate } from "@/lib/auth/artist-onboarding-gate";

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

  // Phase 4.x task_06 — resolve active workspace + full membership list
  // for the sidebar workspace switcher. resolveActiveWorkspace reads the
  // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
  // returns every workspace the user belongs to (with workspaces.kind, which
  // null-safe-defaults to 'brand' until task_01 migration applies at Wave D).
  const [activeWorkspace, allWorkspaces] = await Promise.all([
    resolveActiveWorkspace(ctx.userId),
    listOwnWorkspaces(ctx.userId),
  ]);

  // Phase 6 Wave A.3 — Artist onboarding gate.
  // If the active workspace is kind='artist' and instagram_handle IS NULL,
  // redirect to the 1-step onboarding page before the Artist reaches /app/*.
  const onboardingRedirect = await checkArtistOnboardingGate(
    activeWorkspace,
    locale
  );
  if (onboardingRedirect) {
    redirect({ href: "/onboarding/artist", locale });
    return null;
  }

  return (
    <UserScopesProvider value={scopes}>
      <div className="min-h-dvh flex">
        <Sidebar
          context={ctx}
          activeWorkspace={activeWorkspace}
          workspaces={allWorkspaces}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
            <MobileSidebarSheet
              context={ctx}
              activeWorkspace={activeWorkspace}
              workspaces={allWorkspaces}
            />
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
            the user has no workspace (mid-onboarding edge case).
            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
            backed active workspace (resolved above for the sidebar)
            instead of ctx.workspaces[0], so admins with multiple
            memberships chat against the workspace they actually selected. */}
        <SupportWidget
          workspaceId={activeWorkspace?.id ?? null}
          currentUserId={ctx.userId}
          currentUserName={ctx.profile.display_name ?? ""}
        />
      </div>
    </UserScopesProvider>
  );
}
