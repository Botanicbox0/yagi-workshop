// Phase 7 Wave B.1 — Own past requests list (server component, RSC).
//
// Shows the workspace's prior campaign requests with status + decision
// metadata preview. Visible via the campaigns_select_sponsor RLS policy.

import { getTranslations } from "next-intl/server";

export type OwnRequestRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  request_metadata: unknown;
  decision_metadata: unknown;
};

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function statusKey(status: string): string {
  // Maps the 8-state campaigns lifecycle to i18n keys defined under
  // campaign_request.status.<key>. Anything past 'declined' (draft/published/
  // submission_closed/distributing/archived) renders as 'progressed' since
  // the sponsor request itself is no longer the surface they care about.
  if (status === "requested" || status === "in_review" || status === "declined") {
    return status;
  }
  return "progressed";
}

function statusPillClass(key: string): string {
  switch (key) {
    case "requested":
      return "border-border text-muted-foreground bg-muted/40";
    case "in_review":
      return "border-transparent bg-sage-soft text-sage-ink";
    case "declined":
      return "border-transparent bg-muted text-muted-foreground";
    case "progressed":
      return "border-transparent bg-foreground/5 text-foreground";
    default:
      return "border-border text-muted-foreground";
  }
}

function decisionNote(meta: unknown): string | null {
  if (!meta || typeof meta !== "object") return null;
  const m = meta as Record<string, unknown>;
  const note = m.note ?? m.comment ?? m.message;
  return typeof note === "string" && note.trim().length > 0 ? note.trim() : null;
}

export async function OwnRequestsList({
  rows,
  locale,
}: {
  rows: OwnRequestRow[];
  locale: string;
}) {
  const t = await getTranslations("campaign_request");

  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {t("own_list_title")}
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-[24px] border border-border bg-card p-6">
          <p className="text-xs text-muted-foreground keep-all leading-relaxed">
            {t("own_list_empty")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const key = statusKey(row.status);
            const note = decisionNote(row.decision_metadata);
            return (
              <li
                key={row.id}
                className="rounded-[24px] border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium keep-all truncate">
                      {row.title}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                      {formatDate(row.created_at, locale)}
                    </p>
                    {note && (
                      <p className="mt-2 text-xs text-muted-foreground keep-all leading-relaxed">
                        {t("own_decision_note")}: {note}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusPillClass(key)}`}
                  >
                    {t(`status.${key}` as Parameters<typeof t>[0])}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
