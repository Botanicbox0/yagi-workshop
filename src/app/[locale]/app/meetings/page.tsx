import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { Link } from "@/i18n/routing";
import { Calendar } from "lucide-react";
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
          {t("list_title")}
        </h1>
        <Link
          href="/app/meetings/new"
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium transition-colors"
        >
          {t("new")}
        </Link>
      </div>

      {/* Empty state — Wave C.5a sub_07: onboarding-styled 4-stack
          (icon + headline + subtitle + CTA). Calm container, no
          dashed border. CTA copy is intentionally distinct from the
          page-top "새 미팅" — that one is the action button, this
          one is the invitation. */}
      {meetings.length === 0 && (
        <div className="mt-16 flex flex-col items-center justify-center text-center py-24 px-6 rounded-3xl border border-border/40">
          <Calendar
            className="w-8 h-8 text-muted-foreground mb-6"
            aria-hidden="true"
          />
          <h2
            className="text-[22px] md:text-[26px] font-semibold text-foreground keep-all"
            style={{ letterSpacing: "-0.01em", lineHeight: 1.2 }}
          >
            {t("empty.headline")}
          </h2>
          <p className="mt-2 max-w-[480px] text-base text-muted-foreground keep-all" style={{ lineHeight: 1.37 }}>
            {t("empty.subtitle")}
          </p>
          <Link
            href="/app/meetings/new"
            className="mt-6 rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            {t("empty.cta")}
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
                    {meeting.scheduled_at
                      ? fmt.format(new Date(meeting.scheduled_at))
                      : "—"}
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
