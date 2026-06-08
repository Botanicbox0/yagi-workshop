import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp } from "@/lib/share/rate-limit";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { emitDebouncedNotification } from "@/lib/notifications/debounce";

const MAX_TIMESTAMP_SEC = 60 * 60 * 24;

const bodySchema = z.object({
  deliverable_id: z.string().uuid(),
  asset_index: z.number().int().min(0).optional(),
  timestamp_sec: z.number().min(0).max(MAX_TIMESTAMP_SEC).optional(),
  body: z.string().trim().min(1).max(4000),
  author_name: z.string().trim().min(1).max(100),
  author_email: z.string().trim().email().max(200),
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

function isVideoStorageKey(key: string): boolean {
  const ext = key.split(".").pop()?.toLowerCase();
  return Boolean(ext && ["mp4", "mov", "webm"].includes(ext));
}

function isExternalVideoUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host === "vimeo.com" ||
      host.endsWith(".vimeo.com")
    );
  } catch {
    return false;
  }
}

async function notifyYagi(args: {
  request: Request;
  ip: string;
  projectId: string;
  workspaceId: string;
  projectTitle: string;
  deliverableVersion: number;
  authorName: string;
  authorEmail: string;
  body: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3003";
  const projectUrl = `${siteUrl}/app/projects/${args.projectId}?tab=deliverables`;
  const userAgent = args.request.headers.get("user-agent") ?? "unknown";
  const resend = getResend();
  if (resend) {
    const subject = `[YAGI] Deliverable comment: ${args.projectTitle} V${args.deliverableVersion}`;
    const html = `
      <p>A public deliverable-share viewer left a comment.</p>
      <p><strong>Project:</strong> ${escapeHtml(args.projectTitle)} · V${args.deliverableVersion}</p>
      <p><strong>From:</strong> ${escapeHtml(args.authorName)} &lt;${escapeHtml(args.authorEmail)}&gt;</p>
      <blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#555;">${escapeHtml(args.body).replace(/\n/g, "<br />")}</blockquote>
      <p style="font-size:12px;color:#666"><strong>Source IP:</strong> ${escapeHtml(args.ip)}<br/><strong>User-Agent:</strong> ${escapeHtml(userAgent)}</p>
      <p><a href="${escapeHtml(projectUrl)}">Open deliverables →</a></p>
    `;
    resend.emails
      .send({
        from: EMAIL_FROM,
        to: EMAIL_FROM,
        subject,
        html,
        text: `Deliverable comment: ${args.projectTitle} V${args.deliverableVersion}\nFrom: ${args.authorName} <${args.authorEmail}>\n\n${args.body}\n\nIP: ${args.ip}\nUA: ${userAgent}\n${projectUrl}`,
      })
      .catch((err: unknown) => console.error("[deliverable-share/comment] resend", err));
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
              reactor_name: args.authorName,
              comment_excerpt: args.body.slice(0, 140),
            },
          }),
        ),
    );
  } catch (err) {
    console.error("[deliverable-share/comment] notification failed:", err);
  }
}

export async function POST(request: Request, { params }: Props) {
  const { token } = await params;
  const ip = getClientIp(request);
  const rl = await checkRateLimit(`${ip}:deliverable-comment`, 10);
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
    .select("id, title, status, workspace_id, created_by")
    .eq("deliverable_share_token", token)
    .eq("deliverable_share_enabled", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (!project || project.status === "cancelled" || project.status === "archived") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: deliverable } = await service
    .from("project_deliverables")
    .select("id, version, released_at, storage_paths, external_urls")
    .eq("id", body.deliverable_id)
    .eq("project_id", project.id)
    .not("released_at", "is", null)
    .maybeSingle();

  if (!deliverable) {
    return NextResponse.json({ error: "deliverable_not_found" }, { status: 400 });
  }

  const assetIndex = body.asset_index ?? 0;
  const storagePaths = ((deliverable.storage_paths as string[] | null) ?? []);
  const externalUrls = ((deliverable.external_urls as string[] | null) ?? []);
  const assetCount =
    storagePaths.length + externalUrls.length;
  if (assetIndex < 0 || assetIndex >= assetCount) {
    return NextResponse.json({ error: "asset_not_found" }, { status: 400 });
  }
  if (body.timestamp_sec != null) {
    const isStorage = assetIndex < storagePaths.length;
    const isVideo = isStorage
      ? isVideoStorageKey(storagePaths[assetIndex] ?? "")
      : isExternalVideoUrl(externalUrls[assetIndex - storagePaths.length] ?? "");
    if (!isVideo) {
      return NextResponse.json({ error: "timestamp_requires_video" }, { status: 400 });
    }
  }

  const { data: existingSeq } = await service
    .from("deliverable_annotations")
    .select("seq")
    .eq("deliverable_id", deliverable.id)
    .eq("asset_index", assetIndex)
    .order("seq", { ascending: false })
    .limit(1)
    .maybeSingle();
  const seq = ((existingSeq?.seq as number | undefined) ?? 0) + 1;

  const { data: thread, error: threadError } = await service
    .from("project_threads")
    .insert({
      project_id: project.id,
      title: `Public deliverable comment #${seq}`,
      created_by: project.created_by,
      annotation_id: null,
    })
    .select("id")
    .single();
  if (threadError || !thread) {
    console.error("[deliverable-share/comment] thread insert", threadError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const { data: annotation, error: annotationError } = await service
    .from("deliverable_annotations")
    .insert({
      project_id: project.id,
      deliverable_id: deliverable.id,
      asset_index: assetIndex,
      seq,
      shape: "pin",
      coords: { x: 0.5, y: 0.5 },
      timestamp_sec: body.timestamp_sec ?? null,
      thread_id: thread.id,
      visibility: "client",
      status: "open",
      created_by: project.created_by,
    })
    .select("id")
    .single();
  if (annotationError || !annotation) {
    console.error("[deliverable-share/comment] annotation insert", annotationError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  await service
    .from("project_threads")
    .update({ annotation_id: annotation.id })
    .eq("id", thread.id);

  const { data: message, error: messageError } = await service
    .from("thread_messages")
    .insert({
      thread_id: thread.id,
      author_id: project.created_by,
      body: body.body,
      visibility: "shared",
      attachments: [
        {
          kind: "deliverable_share_author",
          name: body.author_name,
          email: body.author_email,
        },
      ],
    })
    .select("id, created_at")
    .single();
  if (messageError || !message) {
    console.error("[deliverable-share/comment] message insert", messageError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  await notifyYagi({
    request,
    ip,
    projectId: project.id,
    workspaceId: project.workspace_id,
    projectTitle: project.title,
    deliverableVersion: deliverable.version,
    authorName: body.author_name,
    authorEmail: body.author_email,
    body: body.body,
  });

  return NextResponse.json(
    { id: annotation.id, message_id: message.id, created_at: message.created_at },
    { status: 201 },
  );
}
