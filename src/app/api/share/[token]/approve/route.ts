import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp } from "@/lib/share/rate-limit";
import { getResend, EMAIL_FROM } from "@/lib/resend";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const bodySchema = z.object({
  client_email: z.string().email(),
});

type Props = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Props) {
  const { token } = await params;

  // Generous rate limit: 5 approvals / hr / IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:approve`, 5);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limit_exceeded" },
      { status: 429 },
    );
  }

  // Parse body
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const svc = createSupabaseService();

  // Load board — must be share_enabled AND status='shared'
  const { data: board } = await svc
    .from("preprod_boards")
    .select("id, title, status")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .maybeSingle();

  if (!board) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (board.status !== "shared") {
    return NextResponse.json(
      { error: "not_approvable", status: board.status },
      { status: 409 },
    );
  }

  // Race-guarded update: only update if still 'shared'
  const { data: updated, error: updateError } = await svc
    .from("preprod_boards")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by_email: body.client_email,
    })
    .eq("id", board.id)
    .eq("status", "shared") // guard against race
    .select("id")
    .maybeSingle();

  if (updateError) {
    console.error("[approve] update error", updateError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  if (!updated) {
    // Another request already changed the status
    return NextResponse.json(
      { error: "not_approvable", reason: "already_processed" },
      { status: 409 },
    );
  }

  // Notify YAGI via Resend — include IP + UA so YAGI can spot spoofed
  // approver identity (the public endpoint cannot verify the email claim,
  // so the audit trail in this email is the forensics surface — HIGH K-05).
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const editorUrl = `${siteUrl}/app/preprod/${board.id}`;
  const userAgent = request.headers.get("user-agent") ?? "unknown";

  const resend = getResend();
  if (resend) {
    const subject = `[YAGI] Board "${board.title}" approved by ${body.client_email}`;
    const htmlBody = `
      <p>The pre-production board <strong>${escapeHtml(board.title)}</strong> has been approved.</p>
      <p><strong>Claimed approver:</strong> ${escapeHtml(body.client_email)}</p>
      <p style="font-size:12px;color:#666"><em>Identity is unverified — anyone with the share link can submit an approval. Audit fields below; revert from the editor if this looks wrong.</em></p>
      <p style="font-size:12px;color:#666"><strong>Source IP:</strong> ${escapeHtml(ip)}<br/><strong>User-Agent:</strong> ${escapeHtml(userAgent)}</p>
      <p><a href="${escapeHtml(editorUrl)}">View board in editor →</a></p>
    `;

    resend.emails
      .send({
        from: EMAIL_FROM,
        to: EMAIL_FROM,
        subject,
        html: htmlBody,
        text: `Board "${board.title}" approved by ${body.client_email}\nIdentity is unverified.\nSource IP: ${ip}\nUser-Agent: ${userAgent}\n\n${editorUrl}`,
      })
      .catch((err: unknown) => {
        console.error("[approve] resend error", err);
      });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
