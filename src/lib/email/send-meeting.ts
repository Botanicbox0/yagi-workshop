import "server-only";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { buildIcs } from "@/lib/calendar/ics";
import { renderMeetingEmail } from "@/lib/email/meeting-template";

type SendResult = { ok: boolean; error?: string };

function combinedSubject(s: { ko: string; en: string }): string {
  return `${s.ko} / ${s.en}`;
}

/**
 * Send a meeting invite email with an RFC 5545 .ics attachment
 * (METHOD:REQUEST). Bilingual subject + body. Never throws.
 */
export async function sendIcsInvite(args: {
  to: string[];
  projectName: string;
  meetingTitle: string;
  meetingId: string;
  scheduledAt: Date;
  endsAt: Date;
  durationMinutes: number;
  meetLink?: string;
  organizerEmail: string;
  organizerName?: string;
}): Promise<SendResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { ok: false, error: "resend_not_configured" };
    }

    const { subject, html, text } = renderMeetingEmail({
      kind: "invite",
      projectName: args.projectName,
      meetingTitle: args.meetingTitle,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes,
      meetLink: args.meetLink,
      organizerName: args.organizerName,
    });

    const ics = buildIcs({
      uid: `meeting-${args.meetingId}@yagiworkshop.xyz`,
      method: "REQUEST",
      title: args.meetingTitle,
      description: `${args.projectName} — ${args.meetingTitle}`,
      startsAt: args.scheduledAt,
      endsAt: args.endsAt,
      organizerEmail: args.organizerEmail,
      organizerName: args.organizerName ?? "YAGI Workshop",
      attendeeEmails: args.to,
      location: args.meetLink,
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: combinedSubject(subject),
      html,
      text,
      attachments: [
        {
          filename: "meeting.ics",
          content: Buffer.from(ics, "utf-8"),
          contentType: "text/calendar; method=REQUEST; charset=UTF-8",
        },
      ],
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sendIcsInvite] failure", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Send a meeting cancellation email with an .ics attachment
 * (METHOD:CANCEL, matching UID). Bilingual subject + body. Never throws.
 */
export async function sendCancellation(args: {
  to: string[];
  projectName: string;
  meetingTitle: string;
  meetingId: string;
  scheduledAt: Date;
  endsAt: Date;
  durationMinutes: number;
  organizerEmail: string;
  organizerName?: string;
  cancelReason?: string;
}): Promise<SendResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { ok: false, error: "resend_not_configured" };
    }

    const { subject, html, text } = renderMeetingEmail({
      kind: "cancel",
      projectName: args.projectName,
      meetingTitle: args.meetingTitle,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes,
      organizerName: args.organizerName,
      cancelReason: args.cancelReason,
    });

    const ics = buildIcs({
      uid: `meeting-${args.meetingId}@yagiworkshop.xyz`,
      method: "CANCEL",
      title: args.meetingTitle,
      description: `${args.projectName} — ${args.meetingTitle}`,
      startsAt: args.scheduledAt,
      endsAt: args.endsAt,
      organizerEmail: args.organizerEmail,
      organizerName: args.organizerName ?? "YAGI Workshop",
      attendeeEmails: args.to,
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: combinedSubject(subject),
      html,
      text,
      attachments: [
        {
          filename: "meeting.ics",
          content: Buffer.from(ics, "utf-8"),
          contentType: "text/calendar; method=CANCEL; charset=UTF-8",
        },
      ],
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sendCancellation] failure", msg);
    return { ok: false, error: msg };
  }
}

/**
 * Send a post-meeting summary email. No .ics attachment.
 * Bilingual subject + body. Never throws.
 */
export async function sendSummary(args: {
  to: string[];
  projectName: string;
  meetingTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  summaryMd: string;
}): Promise<SendResult> {
  try {
    const resend = getResend();
    if (!resend) {
      return { ok: false, error: "resend_not_configured" };
    }

    const { subject, html, text } = renderMeetingEmail({
      kind: "summary",
      projectName: args.projectName,
      meetingTitle: args.meetingTitle,
      scheduledAt: args.scheduledAt,
      durationMinutes: args.durationMinutes,
      summaryMd: args.summaryMd,
    });

    await resend.emails.send({
      from: EMAIL_FROM,
      to: args.to,
      subject: combinedSubject(subject),
      html,
      text,
    });

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sendSummary] failure", msg);
    return { ok: false, error: msg };
  }
}
