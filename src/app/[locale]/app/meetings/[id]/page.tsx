import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { redirect, Link } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AttendeesList } from "@/components/meetings/attendees-list";
import { SummaryEditor } from "@/components/meetings/summary-editor";
import { MeetingActionsMenu } from "@/components/meetings/meeting-actions-menu";

type Props = {
  params: Promise<{ locale: string; id: string }>;
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

export default async function MeetingDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "meetings" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  // Fetch meeting with joined project
  const { data: meeting, error: meetingError } = await supabase
    .from("meetings")
    .select(
      `
      id,
      title,
      description,
      scheduled_at,
      duration_minutes,
      status,
      meet_link,
      calendar_sync_status,
      calendar_sync_error,
      google_event_id,
      summary_md,
      summary_sent_at,
      cancelled_at,
      cancelled_reason,
      project_id,
      workspace_id,
      project:projects(id, title)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (meetingError) {
    console.error("[MeetingDetailPage] fetch error:", meetingError.message);
  }

  if (!meeting) {
    notFound();
  }

  // Fetch attendees
  const { data: attendeesRaw } = await supabase
    .from("meeting_attendees")
    .select("id, email, display_name, is_organizer, response_status")
    .eq("meeting_id", id)
    .order("is_organizer", { ascending: false });

  const attendees = attendeesRaw ?? [];

  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

  const fmtShort = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  });

  const project = meeting.project as { id: string; title: string } | null;

  const menuMeeting = {
    id: meeting.id,
    status: meeting.status,
    meet_link: meeting.meet_link,
    calendar_sync_status: meeting.calendar_sync_status,
    summary_md: meeting.summary_md,
    summary_sent_at: meeting.summary_sent_at,
  };

  return (
    <div className="px-6 md:px-10 py-10 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6 flex-wrap">
        <Link href="/app/meetings" className="hover:text-foreground transition-colors">
          {t("list_title")}
        </Link>
        <span>/</span>
        {project && (
          <>
            <Link
              href={`/app/projects/${project.id}` as `/app/projects/${string}`}
              className="hover:text-foreground transition-colors"
            >
              {project.title}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground font-medium line-clamp-1">{meeting.title}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-2 flex-wrap">
            <Badge
              variant={getStatusBadgeVariant(meeting.status)}
              className="rounded-full text-[11px] px-2.5 py-0.5 shrink-0"
            >
              {t(
                `status_${meeting.status}` as
                  | "status_scheduled"
                  | "status_in_progress"
                  | "status_completed"
                  | "status_cancelled"
              )}
            </Badge>
            <Badge
              variant={getSyncBadgeVariant(meeting.calendar_sync_status)}
              className="rounded-full text-[11px] px-2.5 py-0.5 shrink-0"
            >
              {t(
                `sync_${meeting.calendar_sync_status}` as
                  | "sync_pending"
                  | "sync_synced"
                  | "sync_fallback_ics"
                  | "sync_failed"
              )}
            </Badge>
          </div>
          <h1 className="font-display text-3xl tracking-tight keep-all">
            {meeting.title}
          </h1>
        </div>

        <div className="shrink-0">
          <MeetingActionsMenu meeting={menuMeeting} />
        </div>
      </div>

      {/* Cancelled banner */}
      {meeting.status === "cancelled" && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-medium text-destructive">
            {t("status_cancelled")}
            {meeting.cancelled_at && (
              <span className="font-normal ml-2">
                — {fmtShort.format(new Date(meeting.cancelled_at))}
              </span>
            )}
          </p>
          {meeting.cancelled_reason && (
            <p className="text-sm text-muted-foreground mt-1">
              {meeting.cancelled_reason}
            </p>
          )}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* Left: meeting details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Time & duration */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t("scheduled_at_label")}
              </p>
              <p className="text-sm font-medium">
                {meeting.scheduled_at
                  ? fmt.format(new Date(meeting.scheduled_at))
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                {t("duration_label")}
              </p>
              <p className="text-sm">
                {meeting.duration_minutes}
                {locale === "ko" ? "분" : " min"}
              </p>
            </div>

            {meeting.description && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  {t("description_label")}
                </p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap keep-all">
                  {meeting.description}
                </p>
              </div>
            )}
          </div>

          {/* Meet link */}
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("meet_link_label")}
            </p>
            {meeting.meet_link ? (
              <a
                href={meeting.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline underline-offset-2 hover:opacity-70 transition-opacity break-all"
              >
                {meeting.meet_link}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("meet_link_missing")}
              </p>
            )}
          </div>

          {/* Sync status detail */}
          {meeting.calendar_sync_status === "failed" && meeting.calendar_sync_error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
              <p className="text-xs font-medium text-destructive uppercase tracking-wide mb-1">
                {t("sync_failed")}
              </p>
              <p className="text-xs text-muted-foreground font-mono break-all">
                {meeting.calendar_sync_error}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t("sync_retry_hint")}
              </p>
            </div>
          )}
        </div>

        {/* Right: attendees */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("attendees_label")}
          </h2>
          <AttendeesList
            attendees={attendees}
            locale={locale}
          />
        </div>
      </div>

      {/* Summary editor */}
      <div
        className={cn(
          "rounded-lg border border-border p-6",
          meeting.status === "cancelled" && "opacity-60 pointer-events-none"
        )}
      >
        <SummaryEditor
          meetingId={meeting.id}
          initialSummary={meeting.summary_md}
          summarySentAt={meeting.summary_sent_at}
          locale={locale}
        />
      </div>
    </div>
  );
}
