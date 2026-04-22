"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";
import {
  type Message,
  YAGI_INTERNAL_WORKSPACE_ID,
} from "@/lib/team-channels/queries";
import type { Json } from "@/lib/supabase/database.types";

const ATTACHMENT_BUCKET = "team-channel-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// sendMessage (existing)
// ---------------------------------------------------------------------------

const attachmentRecordSchema = z.object({
  storage_path: z.string().min(1).max(1024),
  file_name: z.string().min(1).max(255),
  mime_type: z.string().min(1).max(255),
  size_bytes: z
    .number()
    .int()
    .nonnegative()
    .max(500 * 1024 * 1024),
  kind: z.enum(["image", "video", "pdf", "file"]),
  thumbnail_path: z.string().max(1024).nullable().optional(),
});

const sendMessageSchema = z.object({
  messageId: z.string().uuid(),
  channelId: z.string().uuid(),
  channelSlug: z.string().min(1).max(64),
  locale: z.enum(["ko", "en"]),
  body: z.string().max(5000),
  attachmentRecords: z.array(attachmentRecordSchema).max(5).default([]),
});

export type SendMessageResult =
  | { ok: true; messageId: string }
  | {
      ok: false;
      error:
        | "auth_required"
        | "forbidden"
        | "validation"
        | "empty_message"
        | "text_too_long"
        | "channel_not_found"
        | "channel_archived"
        | "db"
        | "attachment_db";
      messageId?: string;
    };

/**
 * Inserts a new team-channel message (+ attachment metadata rows).
 * Never throws — wraps all failures in `{ ok: false, error }`.
 *
 * The actual file bytes are uploaded DIRECTLY from the browser to Supabase
 * Storage via signed URLs issued by `requestUploadUrls`. This action only
 * records the metadata, so its request body stays tiny.
 */
export async function sendMessage(input: unknown): Promise<SendMessageResult> {
  try {
    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };
    const data = parsed.data;

    const body = data.body.trim();
    if (body.length === 0 && data.attachmentRecords.length === 0) {
      return { ok: false, error: "empty_message" };
    }
    // DB CHECK constraint on team_channel_messages.body requires length 1..5000.
    if (body.length === 0) {
      return { ok: false, error: "empty_message" };
    }
    if (body.length > 5000) return { ok: false, error: "text_too_long" };

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth_required" };

    // Confirm channel is live + not archived before inserting.
    const { data: channel, error: chErr } = await supabase
      .from("team_channels")
      .select("id, workspace_id, is_archived")
      .eq("id", data.channelId)
      .maybeSingle();
    if (chErr || !channel) return { ok: false, error: "channel_not_found" };
    if (channel.is_archived) return { ok: false, error: "channel_archived" };

    // Path-safety guard: every attachment path must live under
    // {workspace_id}/{channel_id}/{messageId}/... (messageId is client-generated
    // and is what storage RLS will see; we verify here too). Reject `..` segments
    // so a startsWith match cannot escape upward — Phase 2.0 G4 #4.
    const prefix = `${channel.workspace_id}/${data.channelId}/${data.messageId}/`;
    const hasTraversal = (p: string) => p.split("/").includes("..");
    for (const att of data.attachmentRecords) {
      if (!att.storage_path.startsWith(prefix) || hasTraversal(att.storage_path)) {
        return { ok: false, error: "validation" };
      }
      if (
        att.thumbnail_path &&
        (!att.thumbnail_path.startsWith(prefix) || hasTraversal(att.thumbnail_path))
      ) {
        return { ok: false, error: "validation" };
      }
    }

    // Insert the message row with the client-generated id so attachments can
    // reference it immediately.
    const { data: inserted, error } = await supabase
      .from("team_channel_messages")
      .insert({
        id: data.messageId,
        channel_id: data.channelId,
        author_id: user.id,
        body,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      return { ok: false, error: "db" };
    }

    if (data.attachmentRecords.length > 0) {
      const rows = data.attachmentRecords.map((att) => ({
        message_id: inserted.id,
        storage_path: att.storage_path,
        file_name: att.file_name,
        mime_type: att.mime_type,
        size_bytes: att.size_bytes,
        kind: att.kind,
        thumbnail_path: att.thumbnail_path ?? null,
      }));
      const { error: attErr } = await supabase
        .from("team_channel_message_attachments")
        .insert(rows);
      if (attErr) {
        // Orphan message remains; caller sees the body without attachments.
        return {
          ok: false,
          error: "attachment_db",
          messageId: inserted.id,
        };
      }
    }

    // Realtime subscribers will pick up the INSERT directly; keep a
    // revalidation for no-JS / back-button scenarios.
    revalidatePath(`/${data.locale}/app/team/${data.channelSlug}`);

    // Phase 1.8 — parse @mentions and emit team_channel_mention. Fire-and-
    // forget; emit failures must never fail the parent action.
    void _emitTeamChannelMentionNotifications({
      actorUserId: user.id,
      channelId: data.channelId,
      channelSlug: data.channelSlug,
      workspaceId: channel.workspace_id,
      body,
    }).catch((err) => {
      console.error("[team/sendMessage] notif emit failed:", err);
    });

    return { ok: true, messageId: inserted.id };
  } catch {
    return { ok: false, error: "db" };
  }
}

// ---------------------------------------------------------------------------
// Phase 1.8 — @mention notification helper
// ---------------------------------------------------------------------------

// Permissive mention pattern: supports latin, digits, underscores, hyphens,
// dots, and Hangul syllable blocks. Matches `@name` anywhere in the body.
const MENTION_REGEX = /@([\w가-힣\-_.]+)/g;

async function _emitTeamChannelMentionNotifications(args: {
  actorUserId: string;
  channelId: string;
  channelSlug: string;
  workspaceId: string;
  body: string;
}): Promise<void> {
  const matches = Array.from(args.body.matchAll(MENTION_REGEX));
  if (matches.length === 0) return;

  const mentionedNames = Array.from(
    new Set(matches.map((m) => m[1]).filter((n): n is string => !!n))
  );
  if (mentionedNames.length === 0) return;

  const svc = createSupabaseService();

  // Mention recipients MUST be YAGI Internal workspace members — team chat is
  // YAGI-internal-only (Phase 1.7), so we intersect the display_name matches
  // with the YAGI Internal workspace_members list. Done as two queries because
  // the PostgREST `!inner` nested filter doesn't always push predicates down
  // predictably for this shape; belt-and-suspenders is cheaper than a leak.
  const [{ data: candidateProfiles }, { data: channel }, { data: actorProfile }] =
    await Promise.all([
      svc
        .from("profiles")
        .select("id, display_name")
        .in("display_name", mentionedNames),
      svc
        .from("team_channels")
        .select("name, slug")
        .eq("id", args.channelId)
        .maybeSingle(),
      svc
        .from("profiles")
        .select("display_name")
        .eq("id", args.actorUserId)
        .maybeSingle(),
    ]);

  if (!candidateProfiles || candidateProfiles.length === 0) return;

  const candidateIds = candidateProfiles
    .map((p) => p.id)
    .filter((id): id is string => !!id);
  if (candidateIds.length === 0) return;

  const { data: memberRows } = await svc
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", YAGI_INTERNAL_WORKSPACE_ID)
    .in("user_id", candidateIds);

  const memberIdSet = new Set(
    (memberRows ?? [])
      .map((r) => r.user_id)
      .filter((id): id is string => !!id)
  );
  const profiles = candidateProfiles.filter(
    (p) => p.id && memberIdSet.has(p.id)
  );
  if (profiles.length === 0) return;

  const actorName = actorProfile?.display_name ?? "YAGI";
  const channelName = channel?.name ?? args.channelSlug;
  const excerpt =
    args.body.length > 80 ? args.body.slice(0, 80) + "…" : args.body;
  const urlPath = `/app/team/${channel?.slug ?? args.channelSlug}`;

  await Promise.all(
    profiles
      .filter((p) => p.id && p.id !== args.actorUserId)
      .map((p) =>
        emitNotification({
          user_id: p.id,
          kind: "team_channel_mention",
          workspace_id: args.workspaceId,
          payload: {
            actor: actorName,
            channel_name: channelName,
            excerpt,
          },
          url_path: urlPath,
        })
      )
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type PermCheck =
  | { ok: true; userId: string }
  | { ok: false; error: "auth_required" | "forbidden" };

async function requireYagiAdminOrWsAdmin(): Promise<PermCheck> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "auth_required" };

  // Two RPCs in parallel; the SQL functions are security-definer and safe.
  const [yagi, ws] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid: user.id }),
    supabase.rpc("is_ws_admin", {
      uid: user.id,
      wsid: YAGI_INTERNAL_WORKSPACE_ID,
    }),
  ]);
  if (yagi.data === true || ws.data === true) {
    return { ok: true, userId: user.id };
  }
  return { ok: false, error: "forbidden" };
}

// ---------------------------------------------------------------------------
// markChannelSeen — update profiles.team_chat_last_seen[channelId] = now()
// ---------------------------------------------------------------------------

const markChannelSeenSchema = z.object({
  channelId: z.string().uuid(),
});

export type MarkChannelSeenResult = { ok: true } | { ok: false };

/**
 * Idempotent best-effort last-seen write. Never throws, never reports
 * failures back to the UI — if the merge fails we simply leave the
 * existing timestamp in place and the unread dot re-appears on next reload.
 */
export async function markChannelSeen(input: unknown): Promise<MarkChannelSeenResult> {
  try {
    const parsed = markChannelSeenSchema.safeParse(input);
    if (!parsed.success) return { ok: true };

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: true };

    // Fetch existing blob then merge. We can't do a true JSONB `||` from the
    // PostgREST client here, so do a read-modify-write. Concurrent updates are
    // acceptable — last write wins, and last-seen is inherently monotonic per
    // client session anyway.
    const { data: prof } = await supabase
      .from("profiles")
      .select("team_chat_last_seen")
      .eq("id", user.id)
      .maybeSingle();

    const existingRaw = prof?.team_chat_last_seen;
    const existing: Record<string, string> =
      existingRaw && typeof existingRaw === "object" && !Array.isArray(existingRaw)
        ? Object.fromEntries(
            Object.entries(existingRaw as Record<string, unknown>).filter(
              (e): e is [string, string] => typeof e[1] === "string"
            )
          )
        : {};
    const next: Record<string, string> = {
      ...existing,
      [parsed.data.channelId]: new Date().toISOString(),
    };

    await supabase
      .from("profiles")
      .update({ team_chat_last_seen: next as Json })
      .eq("id", user.id);

    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// ---------------------------------------------------------------------------
// createChannel — yagi_admin OR ws_admin only
// ---------------------------------------------------------------------------

const slugRegex = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const createChannelSchema = z.object({
  name: z.string().trim().min(1).max(50),
  slug: z.string().trim().min(1).max(50).regex(slugRegex),
  topic: z.string().max(200).optional().nullable(),
});

export type CreateChannelResult =
  | {
      ok: true;
      channel: {
        id: string;
        slug: string;
        name: string;
        topic: string | null;
        is_archived: boolean;
      };
    }
  | {
      ok: false;
      error: "auth_required" | "forbidden" | "validation" | "name_taken" | "db";
    };

export async function createChannel(input: unknown): Promise<CreateChannelResult> {
  try {
    const parsed = createChannelSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const perm = await requireYagiAdminOrWsAdmin();
    if (!perm.ok) return { ok: false, error: perm.error };

    const supabase = await createSupabaseServer();
    const { data: inserted, error } = await supabase
      .from("team_channels")
      .insert({
        workspace_id: YAGI_INTERNAL_WORKSPACE_ID,
        name: parsed.data.name,
        slug: parsed.data.slug,
        topic: parsed.data.topic ?? null,
        created_by: perm.userId,
      })
      .select("id, slug, name, topic, is_archived")
      .single();

    if (error) {
      // Postgres unique_violation = 23505.
      if (error.code === "23505") return { ok: false, error: "name_taken" };
      return { ok: false, error: "db" };
    }
    if (!inserted) return { ok: false, error: "db" };

    revalidatePath(`/ko/app/team/${inserted.slug}`);
    revalidatePath(`/en/app/team/${inserted.slug}`);

    return { ok: true, channel: inserted };
  } catch {
    return { ok: false, error: "db" };
  }
}

// ---------------------------------------------------------------------------
// updateChannel — yagi_admin OR ws_admin only
// ---------------------------------------------------------------------------

const updateChannelSchema = z.object({
  channelId: z.string().uuid(),
  name: z.string().trim().min(1).max(50),
  topic: z.string().max(200).optional().nullable(),
});

export type UpdateChannelResult =
  | { ok: true }
  | { ok: false; error: "auth_required" | "forbidden" | "validation" | "db" };

export async function updateChannel(input: unknown): Promise<UpdateChannelResult> {
  try {
    const parsed = updateChannelSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const perm = await requireYagiAdminOrWsAdmin();
    if (!perm.ok) return { ok: false, error: perm.error };

    const supabase = await createSupabaseServer();
    const { data: updated, error } = await supabase
      .from("team_channels")
      .update({
        name: parsed.data.name,
        topic: parsed.data.topic ?? null,
      })
      .eq("id", parsed.data.channelId)
      .select("slug")
      .maybeSingle();
    if (error || !updated) return { ok: false, error: "db" };

    revalidatePath(`/ko/app/team/${updated.slug}`);
    revalidatePath(`/en/app/team/${updated.slug}`);

    return { ok: true };
  } catch {
    return { ok: false, error: "db" };
  }
}

// ---------------------------------------------------------------------------
// archiveChannel / unarchiveChannel
// ---------------------------------------------------------------------------

const archiveSchema = z.object({ channelId: z.string().uuid() });

export type ArchiveChannelResult =
  | { ok: true }
  | { ok: false; error: "auth_required" | "forbidden" | "validation" | "db" };

async function setChannelArchived(
  input: unknown,
  isArchived: boolean
): Promise<ArchiveChannelResult> {
  try {
    const parsed = archiveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const perm = await requireYagiAdminOrWsAdmin();
    if (!perm.ok) return { ok: false, error: perm.error };

    const supabase = await createSupabaseServer();
    const { data: updated, error } = await supabase
      .from("team_channels")
      .update({ is_archived: isArchived })
      .eq("id", parsed.data.channelId)
      .select("slug")
      .maybeSingle();
    if (error || !updated) return { ok: false, error: "db" };

    revalidatePath(`/ko/app/team/${updated.slug}`);
    revalidatePath(`/en/app/team/${updated.slug}`);

    return { ok: true };
  } catch {
    return { ok: false, error: "db" };
  }
}

export async function archiveChannel(
  input: unknown
): Promise<ArchiveChannelResult> {
  return setChannelArchived(input, true);
}

export async function unarchiveChannel(
  input: unknown
): Promise<ArchiveChannelResult> {
  return setChannelArchived(input, false);
}

// ---------------------------------------------------------------------------
// deleteMessage — author OR yagi_admin only
// ---------------------------------------------------------------------------

const deleteMessageSchema = z.object({ messageId: z.string().uuid() });

export type DeleteMessageResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth_required" | "forbidden" | "validation" | "not_found" | "db";
    };

export async function deleteMessage(input: unknown): Promise<DeleteMessageResult> {
  try {
    const parsed = deleteMessageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth_required" };

    const { data: msg, error: msgErr } = await supabase
      .from("team_channel_messages")
      .select("id, author_id")
      .eq("id", parsed.data.messageId)
      .maybeSingle();
    if (msgErr) return { ok: false, error: "db" };
    if (!msg) return { ok: false, error: "not_found" };

    let allowed = msg.author_id === user.id;
    if (!allowed) {
      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
        uid: user.id,
      });
      allowed = isYagiAdmin === true;
    }
    if (!allowed) return { ok: false, error: "forbidden" };

    const { error } = await supabase
      .from("team_channel_messages")
      .delete()
      .eq("id", parsed.data.messageId);
    if (error) return { ok: false, error: "db" };

    return { ok: true };
  } catch {
    return { ok: false, error: "db" };
  }
}

// ---------------------------------------------------------------------------
// editMessage — author only
// ---------------------------------------------------------------------------

const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().trim().min(1).max(5000),
});

export type EditMessageResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "auth_required"
        | "forbidden"
        | "validation"
        | "not_found"
        | "db";
    };

export async function editMessage(input: unknown): Promise<EditMessageResult> {
  try {
    const parsed = editMessageSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "validation" };

    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "auth_required" };

    const { data: msg, error: msgErr } = await supabase
      .from("team_channel_messages")
      .select("id, author_id")
      .eq("id", parsed.data.messageId)
      .maybeSingle();
    if (msgErr) return { ok: false, error: "db" };
    if (!msg) return { ok: false, error: "not_found" };
    if (msg.author_id !== user.id) return { ok: false, error: "forbidden" };

    const { error } = await supabase
      .from("team_channel_messages")
      .update({ body: parsed.data.body, edited_at: new Date().toISOString() })
      .eq("id", parsed.data.messageId);
    if (error) return { ok: false, error: "db" };

    return { ok: true };
  } catch {
    return { ok: false, error: "db" };
  }
}

// ---------------------------------------------------------------------------
// getMessage — hydrate a single realtime-received row with author + signed URLs
// ---------------------------------------------------------------------------

export type GetMessageResult =
  | { ok: true; message: Message }
  | { ok: false; error: "not_found" | "db" };

/**
 * Server-side helper used by Realtime subscribers on the client: when a
 * new INSERT payload arrives, the client calls this to pick up the row's
 * author profile and fresh signed URLs for any attachments.
 */
export async function getMessage(messageId: string): Promise<GetMessageResult> {
  try {
    if (!messageId) return { ok: false, error: "not_found" };

    const supabase = await createSupabaseServer();

    const { data: m, error } = await supabase
      .from("team_channel_messages")
      .select("*")
      .eq("id", messageId)
      .maybeSingle();
    if (error) return { ok: false, error: "db" };
    if (!m) return { ok: false, error: "not_found" };

    const [attRes, profRes] = await Promise.all([
      supabase
        .from("team_channel_message_attachments")
        .select("*")
        .eq("message_id", m.id),
      supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", m.author_id)
        .maybeSingle(),
    ]);

    const attachmentRows = attRes.data ?? [];
    const paths = attachmentRows.map((a) => a.storage_path);
    const thumbPaths = attachmentRows
      .map((a) => a.thumbnail_path)
      .filter((p): p is string => !!p);
    const signedByPath = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }
    }
    if (thumbPaths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrls(thumbPaths, SIGNED_URL_TTL_SECONDS);
      for (const s of signed ?? []) {
        if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
      }
    }

    const attachments = attachmentRows.map((a) => ({
      ...a,
      signedUrl: signedByPath.get(a.storage_path) ?? null,
      thumbnailSignedUrl: a.thumbnail_path
        ? signedByPath.get(a.thumbnail_path) ?? null
        : null,
    }));

    const message: Message = {
      ...m,
      attachments,
      author: profRes.data ?? null,
    };

    return { ok: true, message };
  } catch {
    return { ok: false, error: "db" };
  }
}
