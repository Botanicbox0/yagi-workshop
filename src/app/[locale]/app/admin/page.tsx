import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { GoogleIntegrationStatus } from "@/components/admin/google-integration-status";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
};

type MeetingRow = {
  id: string;
  title: string;
  scheduled_at: string;
  calendar_sync_status: string;
  updated_at: string;
  project: { id: string; title: string } | null;
};

function syncBadgeClass(status: string): string {
  switch (status) {
    case "synced":
      return "border-transparent bg-green-100 text-green-700";
    case "failed":
      return "border-transparent bg-red-100 text-red-700";
    case "fallback_ics":
      return "border-transparent bg-amber-100 text-amber-700";
    case "pending":
    default:
      return "border-transparent bg-muted text-muted-foreground";
  }
}

export default async function AdminDashboardPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();

  // Auth gate
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (!roles || roles.length === 0) notFound();

  const t = await getTranslations("admin");
  const tMeetings = await getTranslations("meetings");

  // Upcoming meetings: next 7 days, not cancelled or completed
  const now = new Date();
  const plus7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: upcomingRaw, error: upcomingError } = await supabase
    .from("meetings")
    .select(
      `
      id,
      title,
      scheduled_at,
      calendar_sync_status,
      updated_at,
      project:projects(id, title)
    `
    )
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", plus7.toISOString())
    .not("status", "in", '("cancelled","completed")')
    .order("scheduled_at", { ascending: true });

  if (upcomingError) {
    console.error("[AdminDashboardPage] upcoming meetings error:", upcomingError);
  }

  const upcomingMeetings = (upcomingRaw ?? []) as MeetingRow[];

  // Meetings needing attention: failed sync OR fallback_ics older than 1h
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: attentionRaw, error: attentionError } = await supabase
    .from("meetings")
    .select(
      `
      id,
      title,
      scheduled_at,
      calendar_sync_status,
      updated_at,
      project:projects(id, title)
    `
    )
    .or(
      `calendar_sync_status.eq.failed,and(calendar_sync_status.eq.fallback_ics,updated_at.lte.${oneHourAgo.toISOString()})`
    )
    .order("scheduled_at", { ascending: true });

  if (attentionError) {
    console.error("[AdminDashboardPage] attention meetings error:", attentionError);
  }

  const attentionMeetings = (attentionRaw ?? []) as MeetingRow[];

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl tracking-tight mb-1">
          {t("title")}
        </h1>
      </div>

      {/* Integrations */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("google.title")}
        </h2>
        <GoogleIntegrationStatus />
      </section>

      {/* Upcoming meetings */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("upcoming_meetings_title")}
        </h2>

        {upcomingMeetings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("upcoming_meetings_empty")}</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("meetings_col_title")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {t("meetings_col_project")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("meetings_col_scheduled_at")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("meetings_col_sync")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {upcomingMeetings.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium keep-all">{m.title}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {m.project?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(m.scheduled_at))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "rounded-full text-[11px] px-2.5 py-0.5",
                          syncBadgeClass(m.calendar_sync_status)
                        )}
                      >
                        {tMeetings(
                          `sync_${m.calendar_sync_status}` as Parameters<typeof tMeetings>[0]
                        )}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Meetings needing attention */}
      <section className="mb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("meetings_needing_attention_title")}
        </h2>

        {attentionMeetings.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("meetings_needing_attention_empty")}
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("meetings_col_title")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {t("meetings_col_project")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("meetings_col_scheduled_at")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("meetings_col_sync")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("retry_sync")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {attentionMeetings.map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium keep-all">{m.title}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {m.project?.title ?? "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(m.scheduled_at))}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={cn(
                          "rounded-full text-[11px] px-2.5 py-0.5",
                          syncBadgeClass(m.calendar_sync_status)
                        )}
                      >
                        {tMeetings(
                          `sync_${m.calendar_sync_status}` as Parameters<typeof tMeetings>[0]
                        )}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {t("retry_sync")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
