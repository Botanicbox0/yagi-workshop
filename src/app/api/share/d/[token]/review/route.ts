import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp } from "@/lib/share/rate-limit";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { emitDebouncedNotification } from "@/lib/notifications/debounce";

const bodySchema = z.object({
  deliverable_id: z.string().uuid(),
  decision: z.enum(["approved", "changes_requested"]),
  note: z.string().trim().min(1).max(4000),
  reviewer_name: z.string().trim().min(1).max(100),
  reviewer_email: z.string().trim().email().max(200),
});

type Props = { params: Promise<{ token: string }> };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function notifyYagi(args: {
  request: Request;
  ip: string;
  projectId: string;
  workspaceId: string;
  projectTitle: string;
  deliverableVersion: number;
  decision: "approved" | "changes_requested";
  reviewerName: string;
  reviewerEmail: string;
  note: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";
  const projectUrl = `${siteUrl}/app/projects/${args.projectId}?tab=deliverables`;
  const userAgent = args.request.headers.get("user-agent") ?? "unknown";
  const label =
    args.decision === "approved" ? "approved" : "requested changes";
  const resend = getResend();
  if (resend) {
    const subject = `[YAGI] Deliverable ${label}: ${args.projectTitle} V${args.deliverableVersion}`;
    const html = `
      <p>A public deliverable-share viewer ${escapeHtml(label)}.</p>
      <p><strong>Project:</strong> ${escapeHtml(args.projectTitle)} · V${args.deliverableVersion}</p>
      <p><strong>Claimed reviewer:</strong> ${escapeHtml(args.reviewerName)} &lt;${escapeHtml(args.reviewerEmail)}&gt;</p>
      <p style="font-size:12px;color:#666"><em>Identity is unverified — anyone with the share link can submit this review. Revert from the project deliverables tab if this looks wrong.</em></p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${escapeHtml(args.note).replace(/\n/g, "<br />")}</blockquote>
      <p style="font-size:12px;color:#666"><strong>Source IP:</strong> ${escapeHtml(args.ip)}<br/><strong>User-Agent:</strong> ${escapeHtml(userAgent)}</p>
      <p><a href="${escapeHtml(projectUrl)}">Open deliverables →</a></p>
    `;
    resend.emails
      .send({
        from: EMAIL_FROM,
        to: EMAIL_FROM,
        subject,
        html,
        text: `Deliverable ${label}: ${args.projectTitle} V${args.deliverableVersion}\nClaimed reviewer: ${args.reviewerName} <${args.reviewerEmail}>\nIdentity is unverified.\n\n${args.note}\n\nIP: ${args.ip}\nUA: ${userAgent}\n${projectUrl}`,
      })
      .catch((err: unknown) => console.error("[deliverable-share/review] resend", err));
  }

  try {
    const svc = createSupabaseService();
    const { data: yagiAdmins } = await svc
      .from("user_roles")
      .select("user_id")
      .eq("role", "yagi_admin")
      .is("workspace_id", null);
    await Promise.all(
      (yagiAdmins ?? [])
        .filter((row) => row.user_id)
        .map((row) =>
          emitDebouncedNotification({
            user_id: row.user_id!,
            kind: "feedback_received",
            project_id: args.projectId,
            workspace_id: args.workspaceId,
            url_path: `/app/projects/${args.projectId}?tab=deliverables`,
            item: {
              board_title: args.projectTitle,
              reactor_name: args.reviewerName,
              comment_excerpt:
                args.decision === "approved"
                  ? `Approved V${args.deliverableVersion}`
                  : args.note.slice(0, 140),
            },
          }),
        ),
    );
  } catch (err) {
    console.error("[deliverable-share/review] notification failed:", err);
  }
}

export async function POST(request: Request, { params }: Props) {
  const { token } = await params;
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:deliverable-review`, 5);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limit_exceeded" }, { status: 429 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const svc = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag deliverable share columns
  const service = svc as any;
  const { data: project } = await service
    .from("projects")
    .select("id, title, status, workspace_id")
    .eq("deliverable_share_token", token)
    .eq("deliverable_share_enabled", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project || project.status === "cancelled" || project.status === "archived") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: deliverable } = await service
    .from("project_deliverables")
    .select("id, version, released_at")
    .eq("id", body.deliverable_id)
    .eq("project_id", project.id)
    .not("released_at", "is", null)
    .maybeSingle();
  if (!deliverable) {
    return NextResponse.json({ error: "deliverable_not_found" }, { status: 400 });
  }

  const reviewNote = [
    `${body.reviewer_name} <${body.reviewer_email}>`,
    "",
    body.note,
  ].join("\n");

  const { error: updateError } = await service
    .from("project_deliverables")
    .update({
      status: body.decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: null,
      review_note: reviewNote,
    })
    .eq("id", deliverable.id)
    .eq("project_id", project.id)
    .not("released_at", "is", null);

  if (updateError) {
    console.error("[deliverable-share/review] update", updateError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  await notifyYagi({
    request,
    ip,
    projectId: project.id,
    workspaceId: project.workspace_id,
    projectTitle: project.title,
    deliverableVersion: deliverable.version,
    decision: body.decision,
    reviewerName: body.reviewer_name,
    reviewerEmail: body.reviewer_email,
    note: body.note,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
