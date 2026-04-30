// Phase 4.x task_04 — Progress tab (server component) for the post-submit
// detail page. Renders the project_status_history rows as a vertical
// timeline with status transition + optional admin comment.
//
// Self-review (KICKOFF section task_04):
// - Authorization is page.tsx's job (BLOCKER 1 created_by + yagi_admin).
// - project_status_history has its own RLS scoping by project_id; this
//   tab never displays cross-project rows.
// - Empty state is surfaced calmly (no rows) -- it should be unusual
//   since submitProjectAction inserts an initial submitted->in_review
//   row after every wizard submit.
//
// Design v1.0:
// - vertical timeline with hairline connector (border-border/40 left)
// - achromatic; no sage accent here (the hero card pill + status-timeline
//   ribbon already carry the status accent)
// - Pretendard, lh 1.37 for body lines

import { createSupabaseServer } from "@/lib/supabase/server";

type Props = {
  projectId: string;
  locale: "ko" | "en";
  labels: {
    section: string;
    empty: string;
    fromTo: (from: string, to: string) => string;
    statusMap: Record<string, string>;
    actorRoleMap: Record<string, string>;
  };
};

type HistoryRow = {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_role: string;
  comment: string | null;
  transitioned_at: string;
};

function formatDateTime(iso: string, locale: "ko" | "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
    year: "numeric",
    month: locale === "ko" ? "long" : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function ProgressTab({ projectId, locale, labels }: Props) {
  // project_status_history is a Phase 3.0 table not in generated types.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 table not in generated types
  const supabase = (await createSupabaseServer()) as any;
  const { data: rowsRaw } = (await supabase
    .from("project_status_history")
    .select("id, from_status, to_status, actor_role, comment, transitioned_at")
    .eq("project_id", projectId)
    .order("transitioned_at", { ascending: false })) as {
    data: HistoryRow[] | null;
  };

  const rows = rowsRaw ?? [];

  if (rows.length === 0) {
    return (
      <div
        className="border border-border/40 rounded-3xl p-12 text-center"
        role="region"
        aria-label={labels.section}
      >
        <p className="text-sm text-muted-foreground keep-all">{labels.empty}</p>
      </div>
    );
  }

  return (
    <section
      className="border border-border/40 rounded-3xl p-6 md:p-8"
      aria-label={labels.section}
    >
      <h2 className="text-xs uppercase tracking-[0.10em] text-muted-foreground keep-all mb-5">
        {labels.section}
      </h2>
      <ol className="flex flex-col gap-5">
        {rows.map((r) => {
          const fromLabel =
            r.from_status && labels.statusMap[r.from_status]
              ? labels.statusMap[r.from_status]
              : r.from_status ?? "—";
          const toLabel =
            labels.statusMap[r.to_status] ?? r.to_status;
          const actorLabel =
            labels.actorRoleMap[r.actor_role] ?? r.actor_role;

          return (
            <li
              key={r.id}
              className="flex gap-4 pl-1 relative"
            >
              <span
                className="block h-2 w-2 mt-2 rounded-full bg-foreground shrink-0"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-1 min-w-0">
                <p
                  className="text-sm text-foreground keep-all"
                  style={{ lineHeight: 1.37 }}
                >
                  {labels.fromTo(fromLabel, toLabel)}
                </p>
                <p className="text-xs text-muted-foreground keep-all">
                  {formatDateTime(r.transitioned_at, locale)} · {actorLabel}
                </p>
                {r.comment && (
                  <p
                    className="text-sm text-foreground keep-all mt-1 pl-3 border-l border-border/40"
                    style={{ lineHeight: 1.5 }}
                  >
                    {r.comment}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
