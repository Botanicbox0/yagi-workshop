import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp } from "@/lib/share/rate-limit";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { emitDebouncedNotification } from "@/lib/notifications/debounce";

// Reuse escapeHtml pattern from meeting-template
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const bodySchema = z.object({
  frame_id: z.string().uuid(),
  body: z.string().min(1).max(2000),
  author_name: z.string().min(1).max(100),
  author_email: z.string().email(),
});

type Props = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Props) {
  const { token } = await params;

  // Rate limit: 10 comments / hr / IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:comments`, 10);
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

  // Load board by token
  const { data: board } = await svc
    .from("preprod_boards")
    .select("id, title, project_id, workspace_id")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .maybeSingle();

  if (!board) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Verify frame belongs to this board
  const { data: frame } = await svc
    .from("preprod_frames")
    .select("id")
    .eq("id", body.frame_id)
    .eq("board_id", board.id)
    .maybeSingle();

  if (!frame) {
    return NextResponse.json({ error: "frame_not_found" }, { status: 400 });
  }

  // Insert comment
  const { data: comment, error: insertError } = await svc
    .from("preprod_frame_comments")
    .insert({
      frame_id: body.frame_id,
      board_id: board.id,
      author_email: body.author_email,
      author_display_name: body.author_name,
      body: body.body,
      // author_user_id is null for anonymous share-page comments
    })
    .select("id, created_at")
    .single();

  if (insertError || !comment) {
    console.error("[comments] insert error", insertError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Send notification email to YAGI.
  //
  // Design decision: we send to EMAIL_FROM (the internal YAGI address) rather
  // than querying workspace_members+auth.users. This keeps the API route
  // simple, avoids an extra DB join, and EMAIL_FROM already points to the
  // verified YAGI mailbox (noreply@yagiworkshop.xyz or env override). A future
  // enhancement can fan out to all yagi_admin emails via a DB query.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  const editorUrl = `${siteUrl}/app/preprod/${board.id}`;

  const resend = getResend();
  if (resend) {
    const subject = `[YAGI] New comment on board ${board.title}`;
    const htmlBody = `
      <p>A new comment was left on the pre-production board <strong>${escapeHtml(board.title)}</strong>.</p>
      <p><strong>From:</strong> ${escapeHtml(body.author_name)} &lt;${escapeHtml(body.author_email)}&gt;</p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">
        ${escapeHtml(body.body).replace(/\n/g, "<br />")}
      </blockquote>
      <p><a href="${escapeHtml(editorUrl)}">Open in editor →</a></p>
    `;

    resend.emails
      .send({
        from: EMAIL_FROM,
        to: EMAIL_FROM,
        subject,
        html: htmlBody,
        text: `New comment on "${board.title}"\nFrom: ${body.author_name} <${body.author_email}>\n\n${body.body}\n\n${editorUrl}`,
      })
      .catch((err: unknown) => {
        console.error("[comments] resend error", err);
      });
  }

  // Phase 1.8 — emit feedback_received to all YAGI admins, debounced over a
  // 10-minute window so a commenter leaving many comments only produces one
  // aggregated bell/email. Never fail the caller on emit error.
  try {
    const { data: yagiAdmins } = await svc
      .from("user_roles")
      .select("user_id")
      .eq("role", "yagi_admin")
      .is("workspace_id", null);

    const urlPath = `/app/projects/${board.project_id}/board/${board.id}`;
    const excerpt = body.body.slice(0, 140);
    await Promise.all(
      (yagiAdmins ?? [])
        .filter((r) => r.user_id)
        .map((r) =>
          emitDebouncedNotification({
            user_id: r.user_id!,
            kind: "feedback_received",
            project_id: board.project_id,
            workspace_id: board.workspace_id,
            url_path: urlPath,
            item: {
              board_title: board.title,
              frame_id: body.frame_id,
              comment_id: comment.id,
              reactor_name: body.author_name,
              comment_excerpt: excerpt,
            },
          })
        )
    );
  } catch (err) {
    console.error("[comments] notif emit failed:", err);
  }

  return NextResponse.json(
    { id: comment.id, created_at: comment.created_at },
    { status: 201 },
  );
}
