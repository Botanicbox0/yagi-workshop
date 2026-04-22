"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";
import { notifyNewMessage } from "@/lib/email/new-message";

const sendSchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(1).max(10_000),
  visibility: z.enum(["shared", "internal"]).default("shared"),
});

export async function sendMessage(input: unknown) {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // If visibility=internal, enforce server-side that the user has yagi_admin role.
  // (Client hides the toggle for non-yagi users; the server must still enforce.)
  if (parsed.data.visibility === "internal") {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .is("workspace_id", null)
      .eq("role", "yagi_admin");
    if (!roles || roles.length === 0) {
      return { error: "forbidden" as const };
    }
  }

  // Find or create the default thread for this project.
  // Note: project_threads has no 'kind' column — omit it.
  // project_threads requires 'created_by' on insert.
  let threadId: string;
  const { data: existing } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", parsed.data.projectId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    threadId = existing.id;
  } else {
    const { data: created, error: threadErr } = await supabase
      .from("project_threads")
      .insert({
        project_id: parsed.data.projectId,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (threadErr || !created)
      return { error: "db" as const, message: threadErr?.message };
    threadId = created.id;
  }

  const { data: inserted, error } = await supabase
    .from("thread_messages")
    .insert({
      thread_id: threadId,
      author_id: user.id,
      body: parsed.data.body,
      visibility: parsed.data.visibility,
    })
    .select("id")
    .single();
  if (error || !inserted) return { error: "db" as const, message: error?.message };

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");

  // Fire-and-forget email notification. Never await — user-perceived send latency
  // must stay low, and notifyNewMessage handles all errors internally.
  if (parsed.data.visibility === "shared") {
    void notifyNewMessage(inserted.id);
  }

  // Phase 1.8 — emit thread_message_new to all thread participants except the
  // author. Fire-and-forget; emit failures never fail the parent action.
  if (parsed.data.visibility === "shared") {
    void _emitThreadMessageNotifications({
      actorUserId: user.id,
      projectId: parsed.data.projectId,
      body: parsed.data.body,
    }).catch((err) => {
      console.error("[sendMessage] notif emit failed:", err);
    });
  }

  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// sendMessageWithAttachments — Phase 1.2.5 subtask 06.
// Text-only callers continue to use `sendMessage` above (unchanged).
// ---------------------------------------------------------------------------

const attachmentSchema = z.object({
  storage_path: z.string().min(1).max(1024),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(255),
  size_bytes: z
    .number()
    .int()
    .nonnegative()
    .max(500 * 1024 * 1024),
  kind: z.enum(["image", "video", "pdf", "file"]),
  thumbnail_path: z.string().max(1024).optional().nullable(),
});

const sendWithAttachmentsSchema = z
  .object({
    projectId: z.string().uuid(),
    body: z.string().max(10_000).nullable().optional(),
    visibility: z.enum(["shared", "internal"]).default("shared"),
    attachments: z.array(attachmentSchema).max(5).default([]),
  })
  .refine(
    (d) => {
      const bodyTrim = (d.body ?? "").trim();
      return bodyTrim.length > 0 || d.attachments.length > 0;
    },
    { message: "Either body or attachments required" }
  );

/**
 * Ensures a supplied storage path is scoped to the given project.
 * Mirrors ref-actions.ts:pathBelongsToProject. Matches the storage RLS
 * on `thread-attachments` which keys on `split_part(name, '/', 1)::project_id`.
 */
function pathBelongsToProject(
  path: string | null | undefined,
  projectId: string
): boolean {
  if (!path) return true;
  return path.startsWith(`${projectId}/`);
}

export async function sendMessageWithAttachments(input: unknown) {
  const parsed = sendWithAttachmentsSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const d = parsed.data;

  // Path-safety guard: every attachment path must live under {projectId}/...
  for (const att of d.attachments) {
    if (!pathBelongsToProject(att.storage_path, d.projectId)) {
      return { error: "validation" as const };
    }
    if (
      att.thumbnail_path &&
      !pathBelongsToProject(att.thumbnail_path, d.projectId)
    ) {
      return { error: "validation" as const };
    }
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Internal-visibility yagi-admin gate (verbatim from sendMessage).
  if (d.visibility === "internal") {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .is("workspace_id", null)
      .eq("role", "yagi_admin");
    if (!roles || roles.length === 0) {
      return { error: "forbidden" as const };
    }
  }

  // Find or create the default thread for this project.
  let threadId: string;
  const { data: existing } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", d.projectId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    threadId = existing.id;
  } else {
    const { data: created, error: threadErr } = await supabase
      .from("project_threads")
      .insert({
        project_id: d.projectId,
        created_by: user.id,
      })
      .select("id")
      .single();
    if (threadErr || !created)
      return { error: "db" as const, message: threadErr?.message };
    threadId = created.id;
  }

  // Normalize body — null when empty (attachments-only case).
  const bodyTrim = (d.body ?? "").trim();
  const bodyValue = bodyTrim.length > 0 ? bodyTrim : null;

  // Insert the message row first. We need its id to link attachments.
  const { data: inserted, error } = await supabase
    .from("thread_messages")
    .insert({
      thread_id: threadId,
      author_id: user.id,
      body: bodyValue,
      visibility: d.visibility,
    })
    .select("id")
    .single();
  if (error || !inserted)
    return { error: "db" as const, message: error?.message };

  // Insert attachment rows in a single batch. If this fails AFTER the message
  // insert, we intentionally leave the orphan message — per spec, cleanup is a
  // future cron job, and blocking the user on rollback would be worse UX.
  if (d.attachments.length > 0) {
    const rows = d.attachments.map((att) => ({
      message_id: inserted.id,
      storage_path: att.storage_path,
      file_name: att.file_name,
      mime_type: att.mime_type,
      size_bytes: att.size_bytes,
      kind: att.kind,
      thumbnail_path: att.thumbnail_path ?? null,
    }));
    const { error: attErr } = await supabase
      .from("thread_message_attachments")
      .insert(rows);
    if (attErr) {
      // Orphan message: caller-visible message appears without attachments.
      // User can retry; cron will sweep orphan storage objects later.
      return {
        error: "db" as const,
        message: attErr.message,
        messageId: inserted.id,
      };
    }
  }

  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");

  if (d.visibility === "shared") {
    void notifyNewMessage(inserted.id);
  }

  // Phase 1.8 — emit thread_message_new (shared-visibility only).
  if (d.visibility === "shared") {
    void _emitThreadMessageNotifications({
      actorUserId: user.id,
      projectId: d.projectId,
      body: bodyValue ?? "",
    }).catch((err) => {
      console.error("[sendMessageWithAttachments] notif emit failed:", err);
    });
  }

  return { ok: true as const, messageId: inserted.id };
}

// ---------------------------------------------------------------------------
// Phase 1.8 — notification emit helpers
// ---------------------------------------------------------------------------

async function _emitThreadMessageNotifications(args: {
  actorUserId: string;
  projectId: string;
  body: string;
}): Promise<void> {
  const svc = createSupabaseService();

  // Look up project → workspace_id, then workspace members + YAGI admins.
  const { data: project } = await svc
    .from("projects")
    .select("workspace_id")
    .eq("id", args.projectId)
    .maybeSingle();
  if (!project) return;

  const [{ data: members }, { data: yagiAdmins }, { data: actorProfile }] =
    await Promise.all([
      svc
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", project.workspace_id),
      svc
        .from("user_roles")
        .select("user_id")
        .eq("role", "yagi_admin")
        .is("workspace_id", null),
      svc
        .from("profiles")
        .select("display_name")
        .eq("id", args.actorUserId)
        .maybeSingle(),
    ]);

  const recipients = new Set<string>();
  for (const m of members ?? []) {
    if (m.user_id && m.user_id !== args.actorUserId) recipients.add(m.user_id);
  }
  for (const r of yagiAdmins ?? []) {
    if (r.user_id && r.user_id !== args.actorUserId) recipients.add(r.user_id);
  }

  const actorName = actorProfile?.display_name ?? "YAGI";
  const excerpt =
    args.body.length > 80 ? args.body.slice(0, 80) + "…" : args.body;
  const urlPath = `/app/projects/${args.projectId}/threads`;

  await Promise.all(
    Array.from(recipients).map((userId) =>
      emitNotification({
        user_id: userId,
        kind: "thread_message_new",
        project_id: args.projectId,
        workspace_id: project.workspace_id,
        payload: {
          actor: actorName,
          excerpt,
        },
        url_path: urlPath,
      })
    )
  );
}
