import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Sidebar } from "@/components/app/sidebar";
import { NotificationBell } from "@/components/app/notification-bell";
import { createSupabaseServer } from "@/lib/supabase/server";

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
    ctx.roles.includes("yagi_admin") || ctx.roles.includes("creator");
  if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole) {
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

  return (
    <div className="min-h-dvh flex">
      <Sidebar context={ctx} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center justify-end h-12 px-4 border-b border-border">
          <NotificationBell
            initialUnreadCount={initialUnreadCount ?? 0}
            locale={bellLocale}
          />
        </header>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
