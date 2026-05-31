import { CalendarClock, ShieldCheck } from "lucide-react";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  GuestThreadPanel,
  type GuestThreadMessage,
} from "@/components/project-detail/guest-thread-panel";
import {
  GuestDeliverablesPanel,
  type GuestDeliverable,
} from "@/components/project-detail/guest-deliverables-panel";

export type GuestProjectSummary = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  target_delivery_at: string | null;
};

type GuestMilestone = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_at: string | null;
  position: number;
};

type Labels = {
  eyebrow: string;
  title: string;
  subtitle: string;
  status: string;
  created: string;
  targetDelivery: string;
  unset: string;
  schedule: {
    title: string;
    empty: string;
    due: string;
  };
};

function formatDate(value: string | null, locale: string, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "en" ? "en" : "ko", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export async function GuestProjectRoom({
  project,
  userId,
  locale,
  labels,
}: {
  project: GuestProjectSummary;
  userId: string;
  locale: string;
  labels: Labels;
}) {
  const supabase = await createSupabaseServer();

  const { data: thread } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", project.id)
    .is("annotation_id", null)
    .limit(1)
    .maybeSingle();

  let messages: GuestThreadMessage[] = [];
  if (thread?.id) {
    const { data: rawMessages } = await supabase
      .from("thread_messages")
      .select("id, author_id, body, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });

    const authorIds = [...new Set((rawMessages ?? []).map((m) => m.author_id))];
    const { data: profiles } =
      authorIds.length > 0
        ? await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", authorIds)
        : { data: [] };
    const profileMap = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.display_name])
    );

    messages = (rawMessages ?? []).map((message) => ({
      id: message.id,
      author_id: message.author_id,
      body: message.body,
      created_at: message.created_at,
      author_name: profileMap.get(message.author_id) ?? null,
      is_mine: message.author_id === userId,
    }));
  }

  const { data: deliverablesRaw } = await supabase
    .from("project_deliverables")
    .select("id, status, external_urls, storage_paths, note, version, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const deliverables: GuestDeliverable[] = (deliverablesRaw ?? []).map((row) => ({
    id: row.id,
    status: row.status,
    external_urls: row.external_urls ?? [],
    storage_paths: row.storage_paths ?? [],
    note: row.note,
    version: row.version,
    created_at: row.created_at,
  }));

  const { data: milestonesRaw } = await supabase
    .from("project_milestones")
    .select("id, title, description, status, due_at, position")
    .eq("project_id", project.id)
    .order("position", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false });

  const milestones = (milestonesRaw ?? []) as GuestMilestone[];

  return (
    <main className="mx-auto max-w-[1280px] px-6 py-10 md:px-10">
      <section className="mb-8 rounded-card border border-border bg-card-deep p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-[0.12em] ink-tertiary">
              <ShieldCheck className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
              {labels.eyebrow}
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-display-ko ink-primary md:text-3xl">
                {project.title}
              </h1>
              <p className="max-w-2xl text-sm leading-body ink-secondary keep-all">
                {labels.subtitle}
              </p>
            </div>
          </div>

          <dl className="grid min-w-[260px] grid-cols-2 gap-3 text-sm">
            <div className="rounded-card border border-border bg-background p-3">
              <dt className="text-xs ink-tertiary">{labels.status}</dt>
              <dd className="mt-1 font-medium ink-primary">{project.status}</dd>
            </div>
            <div className="rounded-card border border-border bg-background p-3">
              <dt className="text-xs ink-tertiary">{labels.created}</dt>
              <dd className="mt-1 font-medium ink-primary">
                {formatDate(project.created_at, locale, labels.unset)}
              </dd>
            </div>
            <div className="col-span-2 rounded-card border border-border bg-background p-3">
              <dt className="text-xs ink-tertiary">{labels.targetDelivery}</dt>
              <dd className="mt-1 font-medium ink-primary">
                {formatDate(project.target_delivery_at, locale, labels.unset)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <GuestThreadPanel projectId={project.id} messages={messages} />
        <div className="space-y-5">
          <GuestDeliverablesPanel
            projectId={project.id}
            initialDeliverables={deliverables}
          />
          <section className="rounded-card border border-border bg-card-deep p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand" aria-hidden="true" />
              <h2 className="text-base font-semibold ink-primary">
                {labels.schedule.title}
              </h2>
            </div>
            {milestones.length === 0 ? (
              <p className="rounded-card border border-dashed border-border bg-background/40 px-4 py-8 text-center text-sm ink-tertiary keep-all">
                {labels.schedule.empty}
              </p>
            ) : (
              <ol className="space-y-3">
                {milestones.map((milestone) => (
                  <li
                    key={milestone.id}
                    className="rounded-card border border-border bg-background p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium ink-primary">
                          {milestone.title}
                        </p>
                        {milestone.description && (
                          <p className="mt-1 text-sm ink-secondary keep-all">
                            {milestone.description}
                          </p>
                        )}
                      </div>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] uppercase tracking-[0.08em] ink-tertiary">
                        {milestone.status}
                      </span>
                    </div>
                    <p className="mt-3 text-xs ink-tertiary">
                      {labels.schedule.due}:{" "}
                      {formatDate(milestone.due_at, locale, labels.unset)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
