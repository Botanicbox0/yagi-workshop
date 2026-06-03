import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ThreadPanelServer } from "@/components/project/thread-panel-server";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  selectedDeliverableId: string | null;
  locale: "ko" | "en";
};

type DeliverableRow = {
  id: string;
  version: number;
  status: string;
  released_at: string | null;
  created_at: string;
};

type ThreadRow = {
  id: string;
  deliverable_id: string | null;
};

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export async function CommentsTab({
  projectId,
  selectedDeliverableId,
  locale,
}: Props) {
  const t = await getTranslations({
    locale,
    namespace: "project_detail.comments",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag project_threads.deliverable_id
  const supabase = (await createSupabaseServer()) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: isYagiAdmin } = user
    ? await supabase.rpc("is_yagi_admin", { uid: user.id })
    : { data: false };

  let deliverablesQuery = supabase
    .from("project_deliverables")
    .select("id, version, status, released_at, created_at")
    .eq("project_id", projectId);

  if (isYagiAdmin !== true) {
    deliverablesQuery = deliverablesQuery.not("released_at", "is", null);
  }

  const [{ data: deliverablesRaw }, { data: threadsRaw }] = await Promise.all([
    deliverablesQuery.order("version", { ascending: false }),
    supabase
      .from("project_threads")
      .select("id, deliverable_id")
      .eq("project_id", projectId)
      .is("annotation_id", null),
  ]);

  const deliverables = (deliverablesRaw ?? []) as DeliverableRow[];
  const selectedExists =
    selectedDeliverableId === null ||
    deliverables.some((deliverable) => deliverable.id === selectedDeliverableId);
  const activeDeliverableId = selectedExists ? selectedDeliverableId : null;
  const activeDeliverable =
    deliverables.find((deliverable) => deliverable.id === activeDeliverableId) ??
    null;

  const threads = (threadsRaw ?? []) as ThreadRow[];
  const threadToDeliverable = new Map(
    threads.map((thread) => [thread.id, thread.deliverable_id ?? "general"]),
  );
  const countByKey = new Map<string, number>();
  if (threadToDeliverable.size > 0) {
    const { data: messagesRaw } = await supabase
      .from("thread_messages")
      .select("thread_id")
      .in("thread_id", Array.from(threadToDeliverable.keys()));
    for (const message of messagesRaw ?? []) {
      const key = threadToDeliverable.get(message.thread_id);
      if (!key) continue;
      countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
    }
  }

  const activeLabel = activeDeliverable
    ? t("version_title", { version: activeDeliverable.version })
    : t("general_title");

  return (
    <section className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-border/70 bg-surface-raised p-4">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-foreground">
            {t("filter_title")}
          </h2>
        </div>
        <nav className="space-y-2" aria-label={t("filter_title")}>
          <FeedbackFilterLink
            href="?tab=comments"
            selected={activeDeliverableId === null}
            title={t("general_title")}
            meta={t("count", { count: countByKey.get("general") ?? 0 })}
          />
          {deliverables.map((deliverable) => (
            <FeedbackFilterLink
              key={deliverable.id}
              href={`?tab=comments&feedback=${deliverable.id}`}
              selected={activeDeliverableId === deliverable.id}
              title={t("version_title", { version: deliverable.version })}
              meta={`${t("count", {
                count: countByKey.get(deliverable.id) ?? 0,
              })} · ${formatDate(deliverable.created_at, locale)}`}
            />
          ))}
        </nav>
      </aside>

      <div className="min-w-0 space-y-4">
        <div className="rounded-lg border border-border/70 bg-surface-raised p-5">
          <p className="text-xs uppercase tracking-label text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-foreground keep-all">
            {activeLabel}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
            {activeDeliverable
              ? t("version_subtitle")
              : t("general_subtitle")}
          </p>
        </div>
        <ThreadPanelServer
          projectId={projectId}
          deliverableId={activeDeliverableId}
        />
      </div>
    </section>
  );
}

function FeedbackFilterLink({
  href,
  selected,
  title,
  meta,
}: {
  href: string;
  selected: boolean;
  title: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg border px-3 py-2 transition-colors",
        selected
          ? "border-brand bg-brand-soft text-foreground"
          : "border-border bg-background/40 text-muted-foreground hover:border-brand/70 hover:text-foreground",
      )}
    >
      <span className="block text-sm font-medium keep-all">{title}</span>
      <span className="mt-1 block text-xs text-muted-foreground">{meta}</span>
    </Link>
  );
}
