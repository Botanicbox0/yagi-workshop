import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/** YAGI Internal workspace id (constant — from migration). */
export const YAGI_INTERNAL_WORKSPACE_ID =
  "320c1564-b0e7-481a-871c-be8d9bb605a8";

export type Channel = Database["public"]["Tables"]["team_channels"]["Row"];

export type AttachmentRow =
  Database["public"]["Tables"]["team_channel_message_attachments"]["Row"];

/** Attachment row decorated with server-generated signed URLs for rendering. */
export type Attachment = AttachmentRow & {
  signedUrl: string | null;
  thumbnailSignedUrl: string | null;
};

export type AuthorProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

export type Message =
  Database["public"]["Tables"]["team_channel_messages"]["Row"] & {
    attachments: Attachment[];
    author: AuthorProfile | null;
  };

type DB = SupabaseClient<Database>;

const ATTACHMENT_BUCKET = "team-channel-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const YAGI_INTERNAL_SLUG = "yagi-internal";

/**
 * Returns all channels visible to the current user.
 * RLS scopes this automatically — non-members of YAGI Internal get 0 rows.
 */
export async function getAccessibleChannels(supabase: DB): Promise<Channel[]> {
  const { data, error } = await supabase
    .from("team_channels")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[team-channels] getAccessibleChannels:", error);
    return [];
  }
  return data ?? [];
}

export async function getChannelBySlug(
  supabase: DB,
  slug: string
): Promise<Channel | null> {
  // Archived channels are returned too — the channel page shows a read-only
  // banner + hides the composer, and the sidebar still links to them.
  const { data, error } = await supabase
    .from("team_channels")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[team-channels] getChannelBySlug:", error);
    return null;
  }
  return data;
}

export async function getChannelMessages(
  supabase: DB,
  channelId: string,
  limit = 50
): Promise<Message[]> {
  // Fetch latest N messages desc, then reverse for chronological order.
  const { data: rows, error } = await supabase
    .from("team_channel_messages")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[team-channels] getChannelMessages:", error);
    return [];
  }
  const messages = (rows ?? []).slice().reverse();
  if (messages.length === 0) return [];

  const messageIds = messages.map((m) => m.id);
  const authorIds = Array.from(new Set(messages.map((m) => m.author_id)));

  const [attRes, profRes] = await Promise.all([
    supabase
      .from("team_channel_message_attachments")
      .select("*")
      .in("message_id", messageIds),
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", authorIds),
  ]);

  if (attRes.error) console.error("[team-channels] attachments:", attRes.error);
  if (profRes.error) console.error("[team-channels] profiles:", profRes.error);

  // Generate signed URLs for each attachment (+ thumbnail where present). We
  // batch per-bucket to minimise round-trips; `createSignedUrls` accepts an
  // array of paths and returns them in the same order.
  const attachmentRows = attRes.data ?? [];
  const paths: string[] = [];
  const thumbPaths: string[] = [];
  for (const a of attachmentRows) {
    paths.push(a.storage_path);
    if (a.thumbnail_path) thumbPaths.push(a.thumbnail_path);
  }
  const signedByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signedList, error: signErr } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
    if (signErr) console.error("[team-channels] signed urls:", signErr);
    for (const s of signedList ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }
  if (thumbPaths.length > 0) {
    const { data: signedList, error: signErr } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrls(thumbPaths, SIGNED_URL_TTL_SECONDS);
    if (signErr) console.error("[team-channels] thumb signed urls:", signErr);
    for (const s of signedList ?? []) {
      if (s.path && s.signedUrl) signedByPath.set(s.path, s.signedUrl);
    }
  }

  const attachmentsByMsg = new Map<string, Attachment[]>();
  for (const a of attachmentRows) {
    const decorated: Attachment = {
      ...a,
      signedUrl: signedByPath.get(a.storage_path) ?? null,
      thumbnailSignedUrl: a.thumbnail_path
        ? signedByPath.get(a.thumbnail_path) ?? null
        : null,
    };
    const list = attachmentsByMsg.get(a.message_id) ?? [];
    list.push(decorated);
    attachmentsByMsg.set(a.message_id, list);
  }
  const profileById = new Map<string, AuthorProfile>();
  for (const p of profRes.data ?? []) {
    profileById.set(p.id, p as AuthorProfile);
  }

  return messages.map((m) => ({
    ...m,
    attachments: attachmentsByMsg.get(m.id) ?? [],
    author: profileById.get(m.author_id) ?? null,
  }));
}

/**
 * True iff the user is a member of the YAGI Internal workspace.
 * Used to gate the sidebar nav item. The route itself relies on RLS.
 */
export async function isYagiInternalMember(
  supabase: DB,
  userId: string
): Promise<boolean> {
  const { data: ws, error: wsErr } = await supabase
    .from("workspaces")
    .select("id")
    .eq("slug", YAGI_INTERNAL_SLUG)
    .maybeSingle();
  if (wsErr || !ws) return false;

  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ws.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

/**
 * True iff the user can administer YAGI Internal channels.
 * Checked at the page boundary so client `isAdmin` props stay purely cosmetic;
 * the real gate is in each Server Action + RLS.
 */
export async function isYagiInternalAdmin(
  supabase: DB,
  userId: string
): Promise<boolean> {
  const [yagi, ws] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid: userId }),
    supabase.rpc("is_ws_admin", {
      uid: userId,
      wsid: YAGI_INTERNAL_WORKSPACE_ID,
    }),
  ]);
  return yagi.data === true || ws.data === true;
}

/**
 * Per-channel latest `created_at` — used to diff against `profiles.team_chat_last_seen`
 * for unread indicators. Returns a `Record<channelId, iso | null>`.
 *
 * Implementation note: Postgres/PostgREST doesn't expose `group by` directly, so
 * we issue one query per channel id in parallel. Expected channel count is
 * small (<= 10 for the foreseeable future) so this is fine.
 */
export async function getLatestMessageAtByChannel(
  supabase: DB,
  channelIds: string[]
): Promise<Record<string, string | null>> {
  if (channelIds.length === 0) return {};
  const results = await Promise.all(
    channelIds.map(async (id) => {
      const { data } = await supabase
        .from("team_channel_messages")
        .select("created_at")
        .eq("channel_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return [id, data?.created_at ?? null] as const;
    })
  );
  return Object.fromEntries(results);
}

/**
 * Reads the current user's `profiles.team_chat_last_seen` blob.
 * Shape: `{ [channelId]: iso8601 }`. Missing channels simply aren't keyed.
 */
export async function getLastSeenByChannel(
  supabase: DB,
  userId: string
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("team_chat_last_seen")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return {};
  const raw = data.team_chat_last_seen;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export type WorkspaceMemberWithProfile = {
  user_id: string;
  role: string;
  joined_at: string | null;
  created_at: string;
  profile: AuthorProfile | null;
};

/**
 * Lists all YAGI Internal workspace members (with profile info) for the
 * members dialog. RLS ensures only YAGI Internal members can SELECT this.
 */
export async function getYagiInternalMembers(
  supabase: DB
): Promise<WorkspaceMemberWithProfile[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role, joined_at, created_at")
    .eq("workspace_id", YAGI_INTERNAL_WORKSPACE_ID)
    .order("joined_at", { ascending: true, nullsFirst: true });
  if (error || !data) return [];
  const userIds = data.map((r) => r.user_id);
  if (userIds.length === 0) return [];
  const { data: profs } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", userIds);
  const byId = new Map<string, AuthorProfile>();
  for (const p of profs ?? []) byId.set(p.id, p as AuthorProfile);
  return data.map((r) => ({
    user_id: r.user_id,
    role: r.role,
    joined_at: r.joined_at,
    created_at: r.created_at,
    profile: byId.get(r.user_id) ?? null,
  }));
}
