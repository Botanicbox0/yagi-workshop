import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";
import { AdminSupportThreadView } from "@/components/support/admin-support-thread-view";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ thread?: string }>;
};

type ThreadRow = {
  id: string;
  workspace_id: string;
  client_id: string;
  status: string;
  last_message_at: string;
  client_name: string;
};

export default async function AdminSupportPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
  if (!isAdmin) {
    redirect({ href: "/app", locale });
    return null;
  }

  const t = await getTranslations({ locale, namespace: "support" });

  const { data: rawThreads } = await supabase
    .from("support_threads")
    .select("id, workspace_id, client_id, status, last_message_at")
    .order("last_message_at", { ascending: false });

  const threads: ThreadRow[] = [];
  if (rawThreads && rawThreads.length > 0) {
    const clientIds = [...new Set(rawThreads.map((r) => r.client_id))];
    const svc = createSupabaseService();
    const { data: profiles } = await svc
      .from("profiles")
      .select("id, display_name, handle")
      .in("id", clientIds);
    const nameMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name || p.handle || p.id.slice(0, 8)]),
    );
    for (const r of rawThreads) {
      threads.push({
        id: r.id,
        workspace_id: r.workspace_id,
        client_id: r.client_id,
        status: r.status,
        last_message_at: r.last_message_at,
        client_name: nameMap.get(r.client_id) ?? r.client_id.slice(0, 8),
      });
    }
  }

  const activeThreadId = sp.thread ?? threads[0]?.id ?? null;
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-6xl mx-auto px-2 md:px-0 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("admin_queue_title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin_queue_sub")}</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-4">
        {/* Queue */}
        <aside className="border border-border rounded-lg overflow-hidden">
          {threads.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8 keep-all">
              {t("admin_queue_empty")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {threads.map((thread) => (
                <li key={thread.id}>
                  <Link
                    href={`/app/admin/support?thread=${thread.id}`}
                    className={cn(
                      "block px-4 py-3 hover:bg-accent transition-colors",
                      thread.id === activeThreadId && "bg-accent",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {thread.client_name}
                      </p>
                      {thread.status === "closed" && (
                        <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
                          {t("admin_status_closed")}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {dateFmt.format(new Date(thread.last_message_at))}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Active thread */}
        <main>
          {activeThread ? (
            <AdminSupportThreadView
              threadId={activeThread.id}
              clientName={activeThread.client_name}
              status={activeThread.status as "open" | "closed"}
              currentUserId={user.id}
            />
          ) : (
            <div className="border border-border rounded-lg py-16 text-center text-sm text-muted-foreground">
              {t("admin_queue_empty")}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
