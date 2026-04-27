"use server";

// =============================================================================
// Phase 2.8.6 Task A.2 — client-initiated meeting request flow.
// =============================================================================
// Existing src/app/[locale]/app/meetings/actions.ts holds createMeeting()
// (admin-driven, status='scheduled' from the start). This file adds the
// new yagi-direct flow:
//   requestMeetingAction()    — client submits request → status='requested'
//   rescheduleMeetingAction() — client edits options → status='rescheduled'
//   confirmMeetingAction()    — yagi_admin picks a time → status='scheduled'
//                                + sends .ics invite
//   cancelMeetingAction()     — either party cancels → status='cancelled'
//                                + sends cancellation
//
// Side effects:
//   - notification_events for the relevant counterparties
//   - Resend email (request: bare HTML; confirm/cancel: with .ics)
//
// RLS does the floor authorization (Phase 2.8.6 Task A.1 migration).
// Each action ALSO double-checks role at the action-layer for
// defense-in-depth (Phase 2.8.2 G_B2_A pattern).
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";
import { sendIcsInvite, sendCancellation } from "@/lib/email/send-meeting";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const requestSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    agenda: z.string().trim().min(20).max(2000),
    durationMinutes: z.union([z.literal(30), z.literal(60), z.literal(90)]),
    requestedAtOptions: z
      .array(z.string().refine((s) => !isNaN(Date.parse(s))))
      .min(1)
      .max(3),
    workspaceId: z.string().uuid(),
    projectId: z.string().uuid().nullable().optional(),
  })
  .refine(
    (d) =>
      d.requestedAtOptions.every(
        (s) => Date.parse(s) > Date.now() + 24 * 3600 * 1000,
      ),
    { message: "all options must be ≥24h in the future" },
  );

const rescheduleSchema = z
  .object({
    meetingId: z.string().uuid(),
    requestedAtOptions: z
      .array(z.string().refine((s) => !isNaN(Date.parse(s))))
      .min(1)
      .max(3),
    durationMinutes: z
      .union([z.literal(30), z.literal(60), z.literal(90)])
      .optional(),
  })
  .refine(
    (d) =>
      d.requestedAtOptions.every(
        (s) => Date.parse(s) > Date.now() + 24 * 3600 * 1000,
      ),
    { message: "all options must be ≥24h in the future" },
  );

const confirmSchema = z.object({
  meetingId: z.string().uuid(),
  scheduledAt: z.string().refine((s) => !isNaN(Date.parse(s))),
  meetLink: z.string().url().max(500).nullable().optional(),
});

const cancelSchema = z.object({
  meetingId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function authedSupabase() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { supabase, user };
}

async function isYagiAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, uid: string) {
  const { data } = await supabase.rpc("is_yagi_admin", { uid });
  return Boolean(data);
}

async function fetchMeeting(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  id: string,
) {
  return await supabase
    .from("meetings")
    .select(
      "id, workspace_id, project_id, title, description, status, scheduled_at, duration_minutes, meet_link, created_by, assigned_admin_id, ics_uid, requested_at_options",
    )
    .eq("id", id)
    .maybeSingle();
}

async function emailFor(userId: string): Promise<string | null> {
  const svc = createSupabaseService();
  const { data } = await svc.auth.admin.getUserById(userId);
  return data?.user?.email ?? null;
}

async function yagiAdminEmails(): Promise<string[]> {
  const svc = createSupabaseService();
  const { data: rows } = await svc
    .from("user_roles")
    .select("user_id")
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  if (!rows || rows.length === 0) return [];
  const emails: string[] = [];
  for (const r of rows) {
    const { data } = await svc.auth.admin.getUserById(r.user_id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}

// ---------------------------------------------------------------------------
// requestMeetingAction
// ---------------------------------------------------------------------------

export type RequestMeetingResult =
  | { ok: true; meetingId: string }
  | { ok: false; error: string };

export async function requestMeetingAction(
  input: unknown,
): Promise<RequestMeetingResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await authedSupabase();
  if (!auth) return { ok: false, error: "unauthenticated" };
  const { supabase, user } = auth;

  const { data: inserted, error: insertErr } = await supabase
    .from("meetings")
    .insert({
      workspace_id: parsed.data.workspaceId,
      project_id: parsed.data.projectId ?? null,
      title: parsed.data.title,
      description: parsed.data.agenda,
      duration_minutes: parsed.data.durationMinutes,
      status: "requested",
      requested_at_options: parsed.data.requestedAtOptions,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { ok: false, error: insertErr?.message ?? "db" };
  }

  // Fan-out to yagi_admins. Fire-and-forget — caller does not wait.
  void _emitRequestNotifications(
    inserted.id,
    parsed.data.title,
    user.id,
    parsed.data.workspaceId,
  ).catch((e) => console.error("[requestMeetingAction] notif fanout", e));

  revalidatePath("/[locale]/app/projects", "page");
  revalidatePath("/[locale]/app/meetings", "page");
  return { ok: true, meetingId: inserted.id };
}

// ---------------------------------------------------------------------------
// rescheduleMeetingAction (client or admin)
// ---------------------------------------------------------------------------

export type RescheduleResult = { ok: true } | { ok: false; error: string };

export async function rescheduleMeetingAction(
  input: unknown,
): Promise<RescheduleResult> {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await authedSupabase();
  if (!auth) return { ok: false, error: "unauthenticated" };
  const { supabase } = auth;

  // RLS gates this; we rely on USING/CHECK to enforce client-edit window.
  const { error: updateErr } = await supabase
    .from("meetings")
    .update({
      status: "rescheduled",
      requested_at_options: parsed.data.requestedAtOptions,
      ...(parsed.data.durationMinutes !== undefined
        ? { duration_minutes: parsed.data.durationMinutes }
        : {}),
    })
    .eq("id", parsed.data.meetingId);

  if (updateErr) return { ok: false, error: updateErr.message };

  revalidatePath("/[locale]/app/meetings", "page");
  revalidatePath(`/[locale]/app/meetings/${parsed.data.meetingId}`, "page");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// confirmMeetingAction (yagi_admin only)
// ---------------------------------------------------------------------------

export type ConfirmResult = { ok: true } | { ok: false; error: string };

export async function confirmMeetingAction(
  input: unknown,
): Promise<ConfirmResult> {
  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await authedSupabase();
  if (!auth) return { ok: false, error: "unauthenticated" };
  const { supabase, user } = auth;

  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const { data: meeting, error: fetchErr } = await fetchMeeting(
    supabase,
    parsed.data.meetingId,
  );
  if (fetchErr || !meeting) return { ok: false, error: "not_found" };

  const { error: updateErr } = await supabase
    .from("meetings")
    .update({
      status: "scheduled",
      scheduled_at: parsed.data.scheduledAt,
      meet_link: parsed.data.meetLink ?? meeting.meet_link ?? null,
      assigned_admin_id: user.id,
    })
    .eq("id", parsed.data.meetingId);

  if (updateErr) return { ok: false, error: updateErr.message };

  // Fan-out: notification + .ics email (fire-and-forget).
  void _emitConfirmedNotifications({
    meetingId: meeting.id,
    title: meeting.title,
    clientId: meeting.created_by,
    workspaceId: meeting.workspace_id,
    scheduledAt: parsed.data.scheduledAt,
    durationMinutes: meeting.duration_minutes,
    meetLink: parsed.data.meetLink ?? meeting.meet_link ?? null,
    icsUid: meeting.ics_uid,
  }).catch((e) =>
    console.error("[confirmMeetingAction] notif fanout", e),
  );

  revalidatePath("/[locale]/app/meetings", "page");
  revalidatePath(`/[locale]/app/meetings/${meeting.id}`, "page");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// cancelMeetingAction (client or admin)
// ---------------------------------------------------------------------------

export type CancelResult = { ok: true } | { ok: false; error: string };

export async function cancelMeetingAction(
  input: unknown,
): Promise<CancelResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const auth = await authedSupabase();
  if (!auth) return { ok: false, error: "unauthenticated" };
  const { supabase, user } = auth;

  const { data: meeting } = await fetchMeeting(supabase, parsed.data.meetingId);
  if (!meeting) return { ok: false, error: "not_found" };

  const { error: updateErr } = await supabase
    .from("meetings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_reason: parsed.data.reason ?? null,
    })
    .eq("id", parsed.data.meetingId);

  if (updateErr) return { ok: false, error: updateErr.message };

  void _emitCancelledNotifications({
    meetingId: meeting.id,
    title: meeting.title,
    actorId: user.id,
    clientId: meeting.created_by,
    scheduledAt: meeting.scheduled_at,
    durationMinutes: meeting.duration_minutes,
    icsUid: meeting.ics_uid,
    reason: parsed.data.reason,
  }).catch((e) =>
    console.error("[cancelMeetingAction] notif fanout", e),
  );

  revalidatePath("/[locale]/app/meetings", "page");
  revalidatePath(`/[locale]/app/meetings/${meeting.id}`, "page");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notification fan-out helpers (service role; respect membership boundaries)
// ---------------------------------------------------------------------------

async function _emitRequestNotifications(
  meetingId: string,
  title: string,
  actorId: string,
  workspaceId: string,
): Promise<void> {
  const svc = createSupabaseService();

  const [{ data: actorProfile }, adminEmails] = await Promise.all([
    svc.from("profiles").select("display_name").eq("id", actorId).maybeSingle(),
    yagiAdminEmails(),
  ]);

  const actorName = actorProfile?.display_name ?? "Client";

  // notification_events for every yagi_admin user (excluding the actor
  // — Phase 2.8.6 K-05 LOOP 1 LOW finding: the actor may themselves
  // hold yagi_admin globally, in which case they would self-ping).
  const { data: adminRoles } = await svc
    .from("user_roles")
    .select("user_id")
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (adminRoles) {
    await Promise.all(
      adminRoles
        .filter((r) => r.user_id !== actorId)
        .map((r) =>
          emitNotification({
            user_id: r.user_id,
            kind: "meeting_requested",
            workspace_id: workspaceId,
            payload: { actor: actorName, meeting_title: title },
            url_path: `/app/meetings/${meetingId}`,
          }),
        ),
    );
  }

  // Optional Resend admin distro email — best-effort, never fails the action
  if (adminEmails.length > 0) {
    try {
      const { sendRequestAdminEmail } = await import(
        "@/lib/email/send-meeting-request"
      );
      await sendRequestAdminEmail({
        to: adminEmails,
        meetingId,
        meetingTitle: title,
        actorName,
      });
    } catch (e) {
      console.error("[meeting request admin email]", e);
    }
  }

  // Confirmation email to the actor (best-effort)
  const actorEmail = await emailFor(actorId);
  if (actorEmail) {
    try {
      const { sendRequestClientEmail } = await import(
        "@/lib/email/send-meeting-request"
      );
      await sendRequestClientEmail({
        to: [actorEmail],
        meetingId,
        meetingTitle: title,
      });
    } catch (e) {
      console.error("[meeting request client email]", e);
    }
  }
}

async function _emitConfirmedNotifications(args: {
  meetingId: string;
  title: string;
  clientId: string;
  workspaceId: string;
  scheduledAt: string;
  durationMinutes: number;
  meetLink: string | null;
  icsUid: string;
}): Promise<void> {
  // Notify client
  await emitNotification({
    user_id: args.clientId,
    kind: "meeting_confirmed",
    workspace_id: args.workspaceId,
    payload: { meeting_title: args.title, when: args.scheduledAt },
    url_path: `/app/meetings/${args.meetingId}`,
  });

  // .ics email to client + assigned admin
  const clientEmail = await emailFor(args.clientId);
  const adminEmails = await yagiAdminEmails();
  const recipients = [...(clientEmail ? [clientEmail] : []), ...adminEmails];
  if (recipients.length === 0) return;

  const startsAt = new Date(args.scheduledAt);
  const endsAt = new Date(startsAt.getTime() + args.durationMinutes * 60_000);

  await sendIcsInvite({
    to: recipients,
    projectName: "YAGI Workshop",
    meetingTitle: args.title,
    meetingId: args.icsUid, // stable UID across edits — used by buildIcs
    scheduledAt: startsAt,
    endsAt,
    durationMinutes: args.durationMinutes,
    meetLink: args.meetLink ?? undefined,
    organizerEmail: adminEmails[0] ?? "noreply@yagiworkshop.xyz",
    organizerName: "YAGI Workshop",
  });
}

async function _emitCancelledNotifications(args: {
  meetingId: string;
  title: string;
  actorId: string;
  clientId: string;
  scheduledAt: string | null;
  durationMinutes: number;
  icsUid: string;
  reason?: string;
}): Promise<void> {
  // notification_events to the counterparty (client or yagi_admin)
  const counterpartyIsClient = args.actorId !== args.clientId;
  if (counterpartyIsClient) {
    await emitNotification({
      user_id: args.clientId,
      kind: "meeting_cancelled",
      payload: { meeting_title: args.title },
      url_path: `/app/meetings/${args.meetingId}`,
    });
  } else {
    const svc = createSupabaseService();
    const { data: adminRoles } = await svc
      .from("user_roles")
      .select("user_id")
      .is("workspace_id", null)
      .eq("role", "yagi_admin");
    if (adminRoles) {
      await Promise.all(
        adminRoles.map((r) =>
          emitNotification({
            user_id: r.user_id,
            kind: "meeting_cancelled",
            payload: { meeting_title: args.title },
            url_path: `/app/meetings/${args.meetingId}`,
          }),
        ),
      );
    }
  }

  // Cancellation .ics email — only meaningful if a time was previously set
  if (args.scheduledAt) {
    const clientEmail = await emailFor(args.clientId);
    const adminEmails = await yagiAdminEmails();
    const recipients = [...(clientEmail ? [clientEmail] : []), ...adminEmails];
    if (recipients.length === 0) return;
    const startsAt = new Date(args.scheduledAt);
    const endsAt = new Date(
      startsAt.getTime() + args.durationMinutes * 60_000,
    );
    await sendCancellation({
      to: recipients,
      projectName: "YAGI Workshop",
      meetingTitle: args.title,
      meetingId: args.icsUid,
      scheduledAt: startsAt,
      endsAt,
      durationMinutes: args.durationMinutes,
      organizerEmail: adminEmails[0] ?? "noreply@yagiworkshop.xyz",
      organizerName: "YAGI Workshop",
      cancelReason: args.reason,
    });
  }
}

// ---------------------------------------------------------------------------
// Form-action wrappers (Promise<void> for <form action={}>)
// ---------------------------------------------------------------------------

export async function cancelMeetingFormAction(
  formData: FormData,
): Promise<void> {
  await cancelMeetingAction({
    meetingId: formData.get("meetingId"),
    reason: formData.get("reason") || undefined,
  });
}
