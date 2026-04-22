"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createCalendarEvent, cancelCalendarEvent } from "@/lib/google/calendar";
import { sendIcsInvite, sendSummary, sendCancellation } from "@/lib/email/send-meeting";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CreateMeetingInput = {
  projectId: string;
  title: string;
  description?: string;
  scheduledAt: string; // ISO
  durationMinutes: 30 | 45 | 60 | 90;
  attendeeEmails: string[];
  attendeeDisplayNames?: (string | null)[];
};

export type CreateMeetingResult =
  | {
      ok: true;
      meetingId: string;
      syncStatus: "synced" | "fallback_ics" | "failed";
      meetLink?: string | null;
    }
  | {
      ok: false;
      error: "unauthorized" | "forbidden" | "not_found" | "validation" | "db";
      detail?: string;
      issues?: unknown[];
    };

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const createMeetingSchema = z
  .object({
    projectId: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2000).optional(),
    scheduledAt: z
      .string()
      .refine((s) => !isNaN(Date.parse(s)), { message: "invalid ISO date" }),
    durationMinutes: z.union([
      z.literal(30),
      z.literal(45),
      z.literal(60),
      z.literal(90),
    ]),
    attendeeEmails: z
      .array(z.string().email())
      .min(1)
      .max(10),
    attendeeDisplayNames: z
      .array(z.union([z.string().max(100), z.null()]))
      .optional(),
  })
  .refine(
    (data) => {
      const parsed = new Date(data.scheduledAt);
      return parsed.getTime() > Date.now();
    },
    { message: "scheduledAt must be in the future", path: ["scheduledAt"] }
  )
  .refine(
    (data) => {
      if (data.attendeeDisplayNames === undefined) return true;
      return data.attendeeDisplayNames.length === data.attendeeEmails.length;
    },
    {
      message: "attendeeDisplayNames length must match attendeeEmails length",
      path: ["attendeeDisplayNames"],
    }
  );

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

export async function createMeeting(
  input: CreateMeetingInput
): Promise<CreateMeetingResult> {
  // 1. Zod validation
  const parsed = createMeetingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      issues: parsed.error.issues,
    };
  }

  const {
    projectId,
    title,
    description,
    scheduledAt,
    durationMinutes,
    attendeeEmails,
    attendeeDisplayNames,
  } = parsed.data;

  const parsedDate = new Date(scheduledAt);

  // 2. Auth check
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const uid = user.id;

  // 3. Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, workspace_id, title")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError) {
    console.error("[createMeeting] project fetch error:", projectError.message);
    return { ok: false, error: "db", detail: projectError.message };
  }
  if (!project) return { ok: false, error: "not_found" };

  const workspaceId = project.workspace_id;
  const projectName = project.title;

  // 4. Authorization
  const [{ data: isAdmin }, { data: isYagiAdmin }] = await Promise.all([
    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);

  if (!isAdmin && !isYagiAdmin) {
    return { ok: false, error: "forbidden" };
  }

  // 5. Atomic meeting + attendees insert via RPC
  //
  // Phase 2.1 G5 FIX_NOW #2 (Phase 1.3 M1) — previously the meeting row
  // was inserted, then attendees were bulk-inserted; an attendee-insert
  // failure left an orphan meeting with zero invitees. The RPC
  // create_meeting_with_attendees wraps both inserts in a single plpgsql
  // function body (implicit transaction), so either both succeed or
  // neither persists. SECURITY INVOKER — RLS on both tables still applies
  // to the caller.
  const attendeesPayload = attendeeEmails.map((email, idx) => ({
    email,
    display_name: attendeeDisplayNames?.[idx] ?? null,
  }));

  const { data: rpcMeetingId, error: rpcError } = await supabase.rpc(
    "create_meeting_with_attendees",
    {
      p_project_id: projectId,
      p_workspace_id: workspaceId,
      p_title: title,
      p_scheduled_at: parsedDate.toISOString(),
      p_duration_minutes: durationMinutes,
      p_created_by: uid,
      p_attendees: attendeesPayload,
      // Omit when caller didn't supply description — PG DEFAULT NULL fires.
      p_description: description ?? undefined,
    }
  );

  if (rpcError || !rpcMeetingId) {
    console.error(
      "[createMeeting] atomic insert failed:",
      rpcError?.message
    );
    return {
      ok: false,
      error: "db",
      detail: rpcError?.message ?? "insert failed",
    };
  }

  const meetingId = rpcMeetingId;

  // Phase 1.8 — notify each attendee who has a YAGI account. Wrapped in
  // try/catch so notification failures NEVER fail the parent meeting action.
  try {
    await _emitMeetingScheduledNotifications({
      actorUserId: uid,
      attendeeEmails,
      meetingId,
      meetingTitle: title,
      scheduledAt: parsedDate,
      projectId,
      workspaceId,
    });
  } catch (err) {
    console.error("[createMeeting] notif emit failed:", err);
  }

  // 7. Try Google Calendar
  const organizerEmail =
    process.env.GOOGLE_ORGANIZER_EMAIL ?? "yagi@yagiworkshop.xyz";

  const calResult = await createCalendarEvent({
    title,
    description,
    scheduledAt: parsedDate,
    durationMinutes,
    attendeeEmails,
    organizerEmail,
    timezone: "Asia/Seoul",
    // Stable requestId across retries (G4 #8 / 1.3 M3) — reuse meeting UUID.
    requestId: meetingId,
  });

  if (calResult.ok) {
    // Update meeting with Google event ID and meet link
    await supabase
      .from("meetings")
      .update({
        google_event_id: calResult.event_id,
        meet_link: calResult.meet_link,
        calendar_sync_status: "synced",
      })
      .eq("id", meetingId);

    _revalidateMeetingPaths(projectId);

    return {
      ok: true,
      meetingId,
      syncStatus: "synced",
      meetLink: calResult.meet_link,
    };
  }

  // 8. Google failure — fallback to ICS email
  const googleFailureReason = `${calResult.reason}${calResult.detail ? `: ${calResult.detail}` : ""}`;

  const endsAt = new Date(parsedDate.getTime() + durationMinutes * 60_000);

  const emailResult = await sendIcsInvite({
    to: attendeeEmails,
    projectName,
    meetingTitle: title,
    meetingId,
    scheduledAt: parsedDate,
    endsAt,
    durationMinutes,
    meetLink: undefined,
    organizerEmail,
    organizerName: "YAGI Workshop",
  });

  if (emailResult.ok) {
    await supabase
      .from("meetings")
      .update({
        calendar_sync_status: "fallback_ics",
        calendar_sync_error: googleFailureReason,
      })
      .eq("id", meetingId);

    _revalidateMeetingPaths(projectId);

    return { ok: true, meetingId, syncStatus: "fallback_ics" };
  }

  // Both Google and email failed
  const emailFailureReason = emailResult.error ?? "email_error";
  await supabase
    .from("meetings")
    .update({
      calendar_sync_status: "failed",
      calendar_sync_error: `google: ${googleFailureReason}; email: ${emailFailureReason}`,
    })
    .eq("id", meetingId);

  _revalidateMeetingPaths(projectId);

  return { ok: true, meetingId, syncStatus: "failed" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _revalidateMeetingPaths(projectId: string): void {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/meetings`);
    revalidatePath(`/${locale}/app/projects/${projectId}`);
  }
}

function _revalidateMeetingDetail(meetingId: string): void {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/meetings/${meetingId}`);
    revalidatePath(`/${locale}/app/meetings`);
  }
}

// ---------------------------------------------------------------------------
// saveMeetingSummary
// ---------------------------------------------------------------------------

export type SaveMeetingSummaryResult =
  | { ok: true }
  | { ok: false; error: string };

export async function saveMeetingSummary(
  meetingId: string,
  summaryMd: string
): Promise<SaveMeetingSummaryResult> {
  // Validate inputs
  const idParsed = z.string().uuid().safeParse(meetingId);
  if (!idParsed.success) return { ok: false, error: "invalid_meeting_id" };
  if (typeof summaryMd !== "string" || summaryMd.length > 20000) {
    return { ok: false, error: "summary_too_long" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const uid = user.id;

  // Fetch meeting + workspace_id
  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select("id, project_id, workspace_id")
    .eq("id", meetingId)
    .maybeSingle();

  if (fetchError) {
    console.error("[saveMeetingSummary] fetch error:", fetchError.message);
    return { ok: false, error: "db" };
  }
  if (!meeting) return { ok: false, error: "not_found" };

  const [{ data: isAdmin }, { data: isYagiAdmin }] = await Promise.all([
    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);
  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };

  const { error: updateError } = await supabase
    .from("meetings")
    .update({ summary_md: summaryMd })
    .eq("id", meetingId);

  if (updateError) {
    console.error("[saveMeetingSummary] update error:", updateError.message);
    return { ok: false, error: "db" };
  }

  _revalidateMeetingDetail(meetingId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// sendMeetingSummary
// ---------------------------------------------------------------------------

export type SendMeetingSummaryResult =
  | { ok: true }
  | { ok: false; error: string };

export async function sendMeetingSummary(
  meetingId: string
): Promise<SendMeetingSummaryResult> {
  const idParsed = z.string().uuid().safeParse(meetingId);
  if (!idParsed.success) return { ok: false, error: "invalid_meeting_id" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const uid = user.id;

  // Fetch meeting + attendees
  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select(
      `
      id, project_id, workspace_id, title, scheduled_at, duration_minutes,
      summary_md,
      project:projects(title)
    `
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (fetchError) {
    console.error("[sendMeetingSummary] fetch error:", fetchError.message);
    return { ok: false, error: "db" };
  }
  if (!meeting) return { ok: false, error: "not_found" };
  if (!meeting.summary_md) return { ok: false, error: "no_summary" };

  const [{ data: isAdmin }, { data: isYagiAdmin }] = await Promise.all([
    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);
  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };

  const { data: attendees, error: attendeesError } = await supabase
    .from("meeting_attendees")
    .select("email")
    .eq("meeting_id", meetingId);

  if (attendeesError) {
    console.error("[sendMeetingSummary] attendees error:", attendeesError.message);
    return { ok: false, error: "db" };
  }

  const attendeeEmails = (attendees ?? []).map((a) => a.email);
  if (attendeeEmails.length === 0) return { ok: false, error: "no_attendees" };

  const projectName =
    (meeting.project as { title: string } | null)?.title ?? "";

  const emailResult = await sendSummary({
    to: attendeeEmails,
    projectName,
    meetingTitle: meeting.title,
    scheduledAt: new Date(meeting.scheduled_at),
    durationMinutes: meeting.duration_minutes,
    summaryMd: meeting.summary_md,
  });

  if (!emailResult.ok) {
    console.error("[sendMeetingSummary] email error:", emailResult.error);
    return { ok: false, error: emailResult.error ?? "email_error" };
  }

  const { error: updateError } = await supabase
    .from("meetings")
    .update({ summary_sent_at: new Date().toISOString() })
    .eq("id", meetingId);

  if (updateError) {
    console.error("[sendMeetingSummary] update error:", updateError.message);
    // Email was sent successfully; don't fail the action
  }

  // Phase 1.8 — notify attendees that the summary was sent. Never fail the
  // parent action on emit error.
  try {
    await _emitMeetingSummarySentNotifications({
      actorUserId: uid,
      attendeeEmails,
      meetingId,
      meetingTitle: meeting.title,
      projectId: meeting.project_id ?? undefined,
      workspaceId: meeting.workspace_id ?? undefined,
    });
  } catch (err) {
    console.error("[sendMeetingSummary] notif emit failed:", err);
  }

  _revalidateMeetingDetail(meetingId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Phase 1.8 — notification emit helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a list of attendee emails to YAGI user_ids via the service-role
 * RPC `resolve_user_ids_by_emails`. Unknown emails are silently dropped.
 */
async function _resolveAttendeeUserIds(
  attendeeEmails: string[]
): Promise<{ userId: string; email: string }[]> {
  if (attendeeEmails.length === 0) return [];
  const svc = createSupabaseService();
  const { data, error } = await svc.rpc("resolve_user_ids_by_emails", {
    p_emails: attendeeEmails,
  });
  if (error || !data) {
    if (error) console.error("[meetings/notif] rpc error:", error.message);
    return [];
  }
  return (data as { email: string; user_id: string }[])
    .filter((r) => r.user_id)
    .map((r) => ({ userId: r.user_id, email: r.email }));
}

async function _resolveActorDisplayName(actorUserId: string): Promise<string> {
  const svc = createSupabaseService();
  const { data } = await svc
    .from("profiles")
    .select("display_name")
    .eq("id", actorUserId)
    .maybeSingle();
  return data?.display_name ?? "YAGI";
}

async function _emitMeetingScheduledNotifications(args: {
  actorUserId: string;
  attendeeEmails: string[];
  meetingId: string;
  meetingTitle: string;
  scheduledAt: Date;
  projectId: string;
  workspaceId: string;
}): Promise<void> {
  const [recipients, actorName] = await Promise.all([
    _resolveAttendeeUserIds(args.attendeeEmails),
    _resolveActorDisplayName(args.actorUserId),
  ]);

  const when = args.scheduledAt.toISOString();
  const urlPath = `/app/meetings/${args.meetingId}`;

  await Promise.all(
    recipients
      .filter((r) => r.userId !== args.actorUserId)
      .map((r) =>
        emitNotification({
          user_id: r.userId,
          kind: "meeting_scheduled",
          project_id: args.projectId,
          workspace_id: args.workspaceId,
          payload: {
            actor: actorName,
            meeting_title: args.meetingTitle,
            when,
          },
          url_path: urlPath,
        })
      )
  );
}

async function _emitMeetingSummarySentNotifications(args: {
  actorUserId: string;
  attendeeEmails: string[];
  meetingId: string;
  meetingTitle: string;
  projectId?: string;
  workspaceId?: string;
}): Promise<void> {
  const [recipients, actorName] = await Promise.all([
    _resolveAttendeeUserIds(args.attendeeEmails),
    _resolveActorDisplayName(args.actorUserId),
  ]);
  const urlPath = `/app/meetings/${args.meetingId}`;

  await Promise.all(
    recipients
      .filter((r) => r.userId !== args.actorUserId)
      .map((r) =>
        emitNotification({
          user_id: r.userId,
          kind: "meeting_summary_sent",
          project_id: args.projectId,
          workspace_id: args.workspaceId,
          payload: {
            actor: actorName,
            meeting_title: args.meetingTitle,
          },
          url_path: urlPath,
        })
      )
  );
}

// ---------------------------------------------------------------------------
// cancelMeeting
// ---------------------------------------------------------------------------

export type CancelMeetingResult =
  | { ok: true }
  | { ok: false; error: string };

export async function cancelMeeting(
  meetingId: string,
  reason: string
): Promise<CancelMeetingResult> {
  const idParsed = z.string().uuid().safeParse(meetingId);
  if (!idParsed.success) return { ok: false, error: "invalid_meeting_id" };

  const reasonParsed = z.string().trim().min(3).max(500).safeParse(reason);
  if (!reasonParsed.success) return { ok: false, error: "invalid_reason" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const uid = user.id;

  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select(
      `
      id, project_id, workspace_id, title, scheduled_at, duration_minutes,
      google_event_id, status,
      project:projects(title)
    `
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (fetchError) {
    console.error("[cancelMeeting] fetch error:", fetchError.message);
    return { ok: false, error: "db" };
  }
  if (!meeting) return { ok: false, error: "not_found" };
  if (meeting.status === "cancelled") return { ok: false, error: "already_cancelled" };

  const [{ data: isAdmin }, { data: isYagiAdmin }] = await Promise.all([
    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);
  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };

  // Update meeting status
  const { error: updateError } = await supabase
    .from("meetings")
    .update({
      status: "cancelled",
      cancelled_reason: reasonParsed.data,
      cancelled_at: new Date().toISOString(),
    })
    .eq("id", meetingId);

  if (updateError) {
    console.error("[cancelMeeting] update error:", updateError.message);
    return { ok: false, error: "db" };
  }

  // Fire-and-forget: cancel Google Calendar event
  if (meeting.google_event_id) {
    cancelCalendarEvent(meeting.google_event_id).catch((e) => {
      console.error("[cancelMeeting] google cancel error:", e);
    });
  }

  // Fire-and-forget: send cancellation emails
  const { data: attendees } = await supabase
    .from("meeting_attendees")
    .select("email")
    .eq("meeting_id", meetingId);

  const attendeeEmails = (attendees ?? []).map((a) => a.email);
  if (attendeeEmails.length > 0) {
    const projectName =
      (meeting.project as { title: string } | null)?.title ?? "";
    const scheduledAt = new Date(meeting.scheduled_at);
    const endsAt = new Date(
      scheduledAt.getTime() + meeting.duration_minutes * 60_000
    );
    const organizerEmail =
      process.env.GOOGLE_ORGANIZER_EMAIL ?? "yagi@yagiworkshop.xyz";

    sendCancellation({
      to: attendeeEmails,
      projectName,
      meetingTitle: meeting.title,
      meetingId,
      scheduledAt,
      endsAt,
      durationMinutes: meeting.duration_minutes,
      organizerEmail,
      organizerName: "YAGI Workshop",
      cancelReason: reasonParsed.data,
    }).catch((e) => {
      console.error("[cancelMeeting] send cancellation error:", e);
    });
  }

  _revalidateMeetingDetail(meetingId);
  if (meeting.project_id) {
    _revalidateMeetingPaths(meeting.project_id);
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// markMeetingCompleted
// ---------------------------------------------------------------------------

export type MarkMeetingCompletedResult =
  | { ok: true }
  | { ok: false; error: string };

export async function markMeetingCompleted(
  meetingId: string
): Promise<MarkMeetingCompletedResult> {
  const idParsed = z.string().uuid().safeParse(meetingId);
  if (!idParsed.success) return { ok: false, error: "invalid_meeting_id" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const uid = user.id;

  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select("id, project_id, workspace_id, status")
    .eq("id", meetingId)
    .maybeSingle();

  if (fetchError) {
    console.error("[markMeetingCompleted] fetch error:", fetchError.message);
    return { ok: false, error: "db" };
  }
  if (!meeting) return { ok: false, error: "not_found" };
  if (meeting.status !== "scheduled" && meeting.status !== "in_progress") {
    return { ok: false, error: "invalid_status" };
  }

  const [{ data: isAdmin }, { data: isYagiAdmin }] = await Promise.all([
    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);
  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };

  const { error: updateError } = await supabase
    .from("meetings")
    .update({ status: "completed" })
    .eq("id", meetingId);

  if (updateError) {
    console.error("[markMeetingCompleted] update error:", updateError.message);
    return { ok: false, error: "db" };
  }

  _revalidateMeetingDetail(meetingId);
  _revalidateMeetingPaths(meeting.project_id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// retryCalendarSync
// ---------------------------------------------------------------------------

export type RetryCalendarSyncResult =
  | { ok: true; syncStatus: string }
  | { ok: false; error: string };

export async function retryCalendarSync(
  meetingId: string
): Promise<RetryCalendarSyncResult> {
  const idParsed = z.string().uuid().safeParse(meetingId);
  if (!idParsed.success) return { ok: false, error: "invalid_meeting_id" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  const uid = user.id;

  const { data: meeting, error: fetchError } = await supabase
    .from("meetings")
    .select(
      `
      id, project_id, workspace_id, title, description, scheduled_at,
      duration_minutes, status, calendar_sync_status,
      project:projects(title)
    `
    )
    .eq("id", meetingId)
    .maybeSingle();

  if (fetchError) {
    console.error("[retryCalendarSync] fetch error:", fetchError.message);
    return { ok: false, error: "db" };
  }
  if (!meeting) return { ok: false, error: "not_found" };
  if (meeting.status === "cancelled" || meeting.status === "completed") {
    return { ok: false, error: "not_retryable" };
  }
  if (meeting.calendar_sync_status === "synced") {
    return { ok: false, error: "already_synced" };
  }
  if (
    meeting.calendar_sync_status !== "failed" &&
    meeting.calendar_sync_status !== "fallback_ics"
  ) {
    return { ok: false, error: "not_retryable" };
  }

  const [{ data: isAdmin }, { data: isYagiAdmin }] = await Promise.all([
    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
    supabase.rpc("is_yagi_admin", { uid }),
  ]);
  if (!isAdmin && !isYagiAdmin) return { ok: false, error: "forbidden" };

  // Fetch attendees
  const { data: attendees, error: attendeesError } = await supabase
    .from("meeting_attendees")
    .select("email")
    .eq("meeting_id", meetingId);

  if (attendeesError) {
    console.error("[retryCalendarSync] attendees error:", attendeesError.message);
    return { ok: false, error: "db" };
  }

  const attendeeEmails = (attendees ?? []).map((a) => a.email);
  const organizerEmail =
    process.env.GOOGLE_ORGANIZER_EMAIL ?? "yagi@yagiworkshop.xyz";
  const parsedDate = new Date(meeting.scheduled_at);
  const projectName =
    (meeting.project as { title: string } | null)?.title ?? "";

  // Step 7: Try Google Calendar
  const calResult = await createCalendarEvent({
    title: meeting.title,
    description: meeting.description ?? undefined,
    scheduledAt: parsedDate,
    durationMinutes: meeting.duration_minutes,
    attendeeEmails,
    organizerEmail,
    timezone: "Asia/Seoul",
    // Stable requestId across retries (G4 #8 / 1.3 M3) — reuse meeting UUID
    // so a retry that races a previous successful call dedups on Google's
    // side instead of creating a duplicate Meet link.
    requestId: meetingId,
  });

  if (calResult.ok) {
    const { data: raceGuard } = await supabase
      .from("meetings")
      .update({
        google_event_id: calResult.event_id,
        meet_link: calResult.meet_link,
        calendar_sync_status: "synced",
        calendar_sync_error: null,
      })
      .eq("id", meetingId)
      .in("status", ["scheduled", "in_progress"])
      .select("id")
      .maybeSingle();

    if (!raceGuard && calResult.event_id) {
      // Meeting was cancelled/completed mid-retry — roll back the Google event
      await cancelCalendarEvent(calResult.event_id);
      return { ok: false, error: "not_retryable" };
    }

    _revalidateMeetingDetail(meetingId);
    _revalidateMeetingPaths(meeting.project_id);
    return { ok: true, syncStatus: "synced" };
  }

  // Step 8: Fallback to ICS email
  const googleFailureReason = `${calResult.reason}${calResult.detail ? `: ${calResult.detail}` : ""}`;
  const endsAt = new Date(
    parsedDate.getTime() + meeting.duration_minutes * 60_000
  );

  const emailResult = await sendIcsInvite({
    to: attendeeEmails,
    projectName,
    meetingTitle: meeting.title,
    meetingId,
    scheduledAt: parsedDate,
    endsAt,
    durationMinutes: meeting.duration_minutes,
    meetLink: undefined,
    organizerEmail,
    organizerName: "YAGI Workshop",
  });

  if (emailResult.ok) {
    await supabase
      .from("meetings")
      .update({
        calendar_sync_status: "fallback_ics",
        calendar_sync_error: googleFailureReason,
      })
      .eq("id", meetingId)
      .in("status", ["scheduled", "in_progress"]);

    _revalidateMeetingDetail(meetingId);
    _revalidateMeetingPaths(meeting.project_id);
    return { ok: true, syncStatus: "fallback_ics" };
  }

  // Both failed
  const emailFailureReason = emailResult.error ?? "email_error";
  await supabase
    .from("meetings")
    .update({
      calendar_sync_status: "failed",
      calendar_sync_error: `google: ${googleFailureReason}; email: ${emailFailureReason}`,
    })
    .eq("id", meetingId)
    .in("status", ["scheduled", "in_progress"]);

  _revalidateMeetingDetail(meetingId);
  return { ok: true, syncStatus: "failed" };
}
