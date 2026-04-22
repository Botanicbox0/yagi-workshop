import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; project?: string }>;
};

type MeetingRow = {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  calendar_sync_status: string;
  project_id: string;
  project: { title: string } | null;
};

function getStatusBadgeVariant(
  status: string
): "secondary" | "default" | "outline" | "destructive" {
  switch (status) {
    case "scheduled":
      return "secondary";
    case "in_progress":
      return "default";
    case "completed":
      return "outline";
    case "cancelled":
      return "destructive";
    default:
      return "secondary";
  }
}

function getSyncBadgeVariant(
  syncStatus: string
): "outline" | "default" | "secondary" | "destructive" {
  switch (syncStatus) {
    case "pending":
      return "outline";
    case "synced":
      return "default";
    case "fallback_ics":
      return "secondary";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
}

export default async function MeetingsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const t = await getTranslations({ locale, namespace: "meetings" });

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  let query = supabase
    .from("meetings")
    .select(
      `
      id,
      title,
      scheduled_at,
      duration_minutes,
      status,
      calendar_sync_status,
      project_id,
      project:projects(title)
    `
    )
    .order("scheduled_at", { ascending: false })
    .limit(100);

  if (sp.status) query = query.eq("status", sp.status);
  if (sp.project) query = query.eq("project_id", sp.project);

  const { data, error } = await query;

  if (error) {
    console.error("[MeetingsPage] Supabase error:", error.message);
  }

  const meetings = (data ?? []) as unknown as MeetingRow[];

  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

  return (
    <div className="px-10 py-12 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("list_title")}</em>
        </h1>
        <Link
          href="/app/meetings/new"
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {t("new")}
        </Link>
      </div>

      {/* Empty state */}
      {meetings.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 border border-dashed border-border rounded-lg">
          <p className="font-display text-xl tracking-tight mb-2 keep-all">
            <em>{t("list_empty")}</em>
          </p>
          <p className="text-sm text-muted-foreground mb-6 keep-all">
            {t("list_empty_sub")}
          </p>
          <Link
            href="/app/meetings/new"
            className="rounded-full uppercase tracking-[0.12em] px-6 py-3 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
          >
            {t("new")}
          </Link>
        </div>
      )}

      {/* Meetings table */}
      {meetings.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("title_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                  Project
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t("scheduled_at_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  {t("duration_label")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">
                  Sync
                </th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr
                  key={meeting.id}
                  className="border-b border-border last:border-0 hover:bg-accent transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={
                        `/app/meetings/${meeting.id}` as `/app/meetings/${string}`
                      }
                      className="font-medium hover:underline keep-all line-clamp-1"
                    >
                      {meeting.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground truncate max-w-[160px]">
                    {meeting.project?.title ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground whitespace-nowrap">
                    {fmt.format(new Date(meeting.scheduled_at))}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {meeting.duration_minutes}
                    {locale === "ko" ? "분" : " min"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={getStatusBadgeVariant(meeting.status)}
                      className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
                    >
                      {t(
                        `status_${meeting.status}` as
                          | "status_scheduled"
                          | "status_in_progress"
                          | "status_completed"
                          | "status_cancelled"
                      )}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <Badge
                      variant={getSyncBadgeVariant(meeting.calendar_sync_status)}
                      className={cn("rounded-full text-[11px] px-2.5 py-0.5")}
                    >
                      {t(
                        `sync_${meeting.calendar_sync_status}` as
                          | "sync_pending"
                          | "sync_synced"
                          | "sync_fallback_ics"
                          | "sync_failed"
                      )}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
