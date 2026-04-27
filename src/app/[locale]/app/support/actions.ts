"use server";

// =============================================================================
// Phase 2.8.6 Task B.2 — support chat server actions.
// =============================================================================
// Workspace-scoped, yagi-staffed chat. The (workspace, client) UNIQUE
// constraint on support_threads guarantees getOrCreate finds a stable
// thread per FAB session.
//
// RLS (Phase 2.8.6 Task B.1 migration) is the floor:
//   - clients see/insert only their own thread + messages
//   - workspace_admins read but cannot reply
//   - yagi_admin reads + replies anywhere
// Server-side double-checks role on every action for defense-in-depth.
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";

const sendSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

const closeSchema = z.object({
  threadId: z.string().uuid(),
  status: z.enum(["open", "closed"]),
});

export type ThreadResult =
  | { ok: true; threadId: string }
  | { ok: false; error: string };

/** Get-or-create the (workspace, client) support thread for the caller. */
export async function getOrCreateSupportThread(
  workspaceId: string,
): Promise<ThreadResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Look up first; race-safe via UNIQUE (workspace_id, client_id) on
  // INSERT — if two requests collide, the second SELECT after a 23505
  // returns the existing row.
  const { data: existing } = await supabase
    .from("support_threads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("client_id", user.id)
    .maybeSingle();
  if (existing?.id) return { ok: true, threadId: existing.id };

  const { data: created, error: insertErr } = await supabase
    .from("support_threads")
    .insert({
      workspace_id: workspaceId,
      client_id: user.id,
    })
    .select("id")
    .single();

  if (insertErr) {
    // Race: another request created it first. Re-select.
    const { data: now } = await supabase
      .from("support_threads")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("client_id", user.id)
      .maybeSingle();
    if (now?.id) return { ok: true, threadId: now.id };
    return { ok: false, error: insertErr.message };
  }

  return { ok: true, threadId: created.id };
}

export type SendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendSupportMessage(
  input: unknown,
): Promise<SendResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: inserted, error: insertErr } = await supabase
    .from("support_messages")
    .insert({
      thread_id: parsed.data.threadId,
      author_id: user.id,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { ok: false, error: insertErr?.message ?? "db" };
  }

  // Fan-out: notify the counterparty.
  void _emitMessageNotification({
    threadId: parsed.data.threadId,
    actorId: user.id,
    body: parsed.data.body,
    messageId: inserted.id,
  }).catch((e) =>
    console.error("[sendSupportMessage] notif fanout", e),
  );

  // Realtime delivers the row to subscribers; revalidate the admin
  // surface so the queue list re-sorts on last_message_at update.
  revalidatePath("/[locale]/app/admin/support", "page");
  return { ok: true, messageId: inserted.id };
}

export async function setSupportThreadStatus(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = closeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { error } = await supabase
    .from("support_threads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.threadId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/[locale]/app/admin/support", "page");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function _emitMessageNotification(args: {
  threadId: string;
  actorId: string;
  body: string;
  messageId: string;
}): Promise<void> {
  const svc = createSupabaseService();

  // Resolve thread → recipient(s)
  const { data: thread } = await svc
    .from("support_threads")
    .select("workspace_id, client_id")
    .eq("id", args.threadId)
    .maybeSingle();
  if (!thread) return;

  const { data: actorProfile } = await svc
    .from("profiles")
    .select("display_name")
    .eq("id", args.actorId)
    .maybeSingle();
  const actorName = actorProfile?.display_name ?? "Yagi";
  const excerpt =
    args.body.length > 80 ? args.body.slice(0, 80) + "…" : args.body;

  // Counterparty: if the actor is the client, notify yagi_admins; if
  // actor is a yagi_admin, notify the client. (Workspace admins are
  // intentionally NOT pinged — the support chat is a 1:1 client/yagi
  // channel; ws-admin audit access is read-pull, not push.)
  if (args.actorId === thread.client_id) {
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
            kind: "support_message_new",
            workspace_id: thread.workspace_id,
            payload: { actor: actorName, excerpt },
            url_path: `/app/admin/support?thread=${args.threadId}`,
          }),
        ),
      );
    }
  } else {
    await emitNotification({
      user_id: thread.client_id,
      kind: "support_message_new",
      workspace_id: thread.workspace_id,
      payload: { actor: actorName, excerpt },
      url_path: `/app`,
    });
  }
}
