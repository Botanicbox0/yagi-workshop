import "server-only";
import { getResend, EMAIL_FROM } from "@/lib/resend";

// =============================================================================
// Phase 2.8.6 Task A.3 — meeting REQUEST emails (no .ics).
// =============================================================================
// The .ics-bearing flows live in send-meeting.ts (sendIcsInvite for the
// post-confirm INVITE step, sendCancellation for cancellations). Request
// stage has no confirmed time, so no calendar invite — just lightweight
// HTML notifications. Bilingual subject (KO / EN).
//
// Both helpers never throw; downstream callers fire-and-forget.
// =============================================================================

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.yagiworkshop.xyz";

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function combinedSubject(s: { ko: string; en: string }): string {
  return `${s.ko} / ${s.en}`;
}

export async function sendRequestAdminEmail(args: {
  to: string[];
  meetingId: string;
  meetingTitle: string;
  actorName: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    if (!resend) return { ok: false, error: "resend_not_configured" };

    const link = `${APP_URL}/app/meetings/${args.meetingId}`;
    const subject = {
      ko: `[새 미팅 요청] ${args.meetingTitle}`,
      en: `[New meeting request] ${args.meetingTitle}`,
    };
    const html = `
      <!DOCTYPE html><html><body style="font-family:-apple-system,Inter,sans-serif;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;color:#080808">
        <h2 style="margin:0 0 12px;font-weight:600">새 미팅 요청 / New meeting request</h2>
        <p style="margin:0 0 8px"><strong>${escape(args.actorName)}</strong> 님이 미팅을 요청했어요.</p>
        <p style="margin:0 0 16px">Title: ${escape(args.meetingTitle)}</p>
        <p style="margin:16px 0">
          <a href="${escape(link)}" style="background:#080808;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block;font-size:14px">
            요청 검토하기 / Review request
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:24px">
          YAGI Workshop · ${escape(link)}
        </p>
      </body></html>`;
    const text = [
      `새 미팅 요청 / New meeting request`,
      `${args.actorName} requested a meeting: ${args.meetingTitle}`,
      ``,
      `Review: ${link}`,
    ].join("\n");

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
    console.error("[sendRequestAdminEmail]", msg);
    return { ok: false, error: msg };
  }
}

export async function sendRequestClientEmail(args: {
  to: string[];
  meetingId: string;
  meetingTitle: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const resend = getResend();
    if (!resend) return { ok: false, error: "resend_not_configured" };

    const link = `${APP_URL}/app/meetings/${args.meetingId}`;
    const subject = {
      ko: `미팅 요청을 받았어요 / Meeting request received`,
      en: `Meeting request received / 미팅 요청을 받았어요`,
    };
    const html = `
      <!DOCTYPE html><html><body style="font-family:-apple-system,Inter,sans-serif;line-height:1.6;max-width:560px;margin:0 auto;padding:24px;color:#080808">
        <h2 style="margin:0 0 12px;font-weight:600">미팅 요청을 받았어요 / Request received</h2>
        <p style="margin:0 0 8px">제안해주신 시간으로 야기 팀이 가능한 일정을 곧 확정해서 알려드릴게요.</p>
        <p style="margin:0 0 16px">YAGI will confirm one of your proposed times shortly.</p>
        <p style="margin:0 0 16px"><strong>${escape(args.meetingTitle)}</strong></p>
        <p style="margin:16px 0">
          <a href="${escape(link)}" style="background:#080808;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;display:inline-block;font-size:14px">
            요청 보기 / View request
          </a>
        </p>
        <p style="font-size:12px;color:#666;margin-top:24px">YAGI Workshop</p>
      </body></html>`;
    const text = [
      `미팅 요청을 받았어요 / Meeting request received`,
      `${args.meetingTitle}`,
      ``,
      `View request: ${link}`,
    ].join("\n");

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
    console.error("[sendRequestClientEmail]", msg);
    return { ok: false, error: msg };
  }
}
