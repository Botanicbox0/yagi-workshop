import { createSupabaseServer } from "@/lib/supabase/server";
import { ThreadPanel } from "./thread-panel";
import type { ThreadMessage, ThreadAttachment } from "./thread-panel";

const ATTACHMENT_BUCKET = "thread-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export async function ThreadPanelServer({
  projectId,
}: {
  projectId: string;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Find the thread (may be null if no messages yet — the client panel handles that).
  const { data: thread } = await supabase
    .from("project_threads")
    .select("id")
    .eq("project_id", projectId)
    .limit(1)
    .maybeSingle();

  // Fetch initial messages (empty array if no thread yet).
  // Profiles are fetched separately to avoid FK-hint syntax issues.
  let initialMessages: ThreadMessage[] = [];

  if (thread) {
    const { data: rawMessages } = await supabase
      .from("thread_messages")
      .select("id, thread_id, author_id, body, visibility, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });

    if (rawMessages && rawMessages.length > 0) {
      // Fetch author profiles in bulk
      const authorIds = [...new Set(rawMessages.map((m) => m.author_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, handle, display_name, avatar_url")
        .in("id", authorIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, p])
      );

      // Fetch attachments for all messages in a single query. The RESTRICTIVE
      // RLS `thread_attachments_hide_internal_from_clients` already hides
      // attachments on internal messages from non-yagi-admin users — we do
      // NOT need any client-side filter.
      const messageIds = rawMessages.map((m) => m.id);
      const { data: rawAttachments } = await supabase
        .from("thread_message_attachments")
        .select(
          "id, message_id, kind, storage_path, file_name, mime_type, size_bytes, thumbnail_path, created_at"
        )
        .in("message_id", messageIds);

      // Generate signed URLs (1 hour) for every attachment's storage_path
      // and thumbnail_path. Failures degrade to null URLs — the client
      // renders a fallback.
      const attachmentMap = new Map<string, ThreadAttachment[]>();
      if (rawAttachments && rawAttachments.length > 0) {
        const resolved = await Promise.all(
          rawAttachments.map(async (att) => {
            const [primary, thumb] = await Promise.all([
              supabase.storage
                .from(ATTACHMENT_BUCKET)
                .createSignedUrl(att.storage_path, SIGNED_URL_TTL_SECONDS),
              att.thumbnail_path
                ? supabase.storage
                    .from(ATTACHMENT_BUCKET)
                    .createSignedUrl(
                      att.thumbnail_path,
                      SIGNED_URL_TTL_SECONDS
                    )
                : Promise.resolve({ data: null }),
            ]);
            const attachment: ThreadAttachment = {
              id: att.id,
              message_id: att.message_id,
              kind: att.kind as ThreadAttachment["kind"],
              storage_path: att.storage_path,
              file_name: att.file_name,
              mime_type: att.mime_type,
              size_bytes: att.size_bytes,
              thumbnail_path: att.thumbnail_path,
              signed_url: primary.data?.signedUrl ?? null,
              thumbnail_signed_url:
                (thumb as { data: { signedUrl?: string } | null }).data
                  ?.signedUrl ?? null,
            };
            return attachment;
          })
        );
        for (const att of resolved) {
          const arr = attachmentMap.get(att.message_id) ?? [];
          arr.push(att);
          attachmentMap.set(att.message_id, arr);
        }
      }

      initialMessages = rawMessages.map((msg) => ({
        ...msg,
        body: msg.body ?? null,
        author: profileMap.get(msg.author_id) ?? null,
        attachments: attachmentMap.get(msg.id) ?? [],
      }));
    }
  }

  // Determine if the current user is yagi_admin.
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");
  const isYagiAdmin = !!(roleRows && roleRows.length > 0);

  return (
    <ThreadPanel
      projectId={projectId}
      threadId={thread?.id ?? null}
      currentUserId={user.id}
      isYagiAdmin={isYagiAdmin}
      initialMessages={initialMessages}
    />
  );
}
