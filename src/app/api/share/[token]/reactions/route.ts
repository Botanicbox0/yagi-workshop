import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { checkRateLimit, getClientIp } from "@/lib/share/rate-limit";
import { emitDebouncedNotification } from "@/lib/notifications/debounce";

const bodySchema = z.object({
  frame_id: z.string().uuid(),
  reaction: z.enum(["like", "dislike", "needs_change"]),
  reactor_email: z.string().email(),
  reactor_name: z.string().min(1).max(100).optional(),
});

type Props = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Props) {
  const { token } = await params;

  // Rate limit: 20 reactions / hr / IP
  const ip = getClientIp(request);
  const rl = checkRateLimit(`${ip}:reactions`, 20);
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

  // Upsert reaction on (frame_id, reactor_email)
  const { error: upsertError } = await svc
    .from("preprod_frame_reactions")
    .upsert(
      {
        frame_id: body.frame_id,
        board_id: board.id,
        reactor_email: body.reactor_email,
        reactor_name: body.reactor_name ?? null,
        reaction: body.reaction,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "frame_id,reactor_email" },
    );

  if (upsertError) {
    console.error("[reactions] upsert error", upsertError);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  // Return updated counts for this frame
  const { data: allReactions } = await svc
    .from("preprod_frame_reactions")
    .select("reaction")
    .eq("frame_id", body.frame_id);

  const counts = { like: 0, dislike: 0, needs_change: 0 };
  for (const r of allReactions ?? []) {
    if (r.reaction === "like") counts.like++;
    else if (r.reaction === "dislike") counts.dislike++;
    else if (r.reaction === "needs_change") counts.needs_change++;
  }

  // Phase 1.8 — emit feedback_received to all YAGI admins, debounced over a
  // 10-minute window so a reviewer reacting to many frames only produces one
  // aggregated bell/email. Never fail the caller on emit error.
  try {
    const { data: yagiAdmins } = await svc
      .from("user_roles")
      .select("user_id")
      .eq("role", "yagi_admin")
      .is("workspace_id", null);

    const urlPath = `/app/projects/${board.project_id}/board/${board.id}`;
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
              reactor_name: body.reactor_name ?? body.reactor_email,
              reaction: body.reaction,
            },
          })
        )
    );
  } catch (err) {
    console.error("[reactions] notif emit failed:", err);
  }

  return NextResponse.json(counts, { status: 200 });
}
