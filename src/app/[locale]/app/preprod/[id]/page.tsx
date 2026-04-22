import { notFound } from "next/navigation";
import { redirect } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { BoardEditor } from "@/components/preprod/board-editor";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function BoardEditorPage({ params }: Props) {
  const { locale, id } = await params;

  const t = await getTranslations({ locale, namespace: "preprod" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const uid = user.id;

  // Visibility: yagi_admin OR member of yagi-internal workspace
  const [{ data: isYagiAdmin }, { data: yagiWs }] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid }),
    supabase
      .from("workspaces")
      .select("id")
      .eq("slug", "yagi-internal")
      .maybeSingle(),
  ]);

  if (!isYagiAdmin) {
    if (!yagiWs) notFound();
    const { data: isMember } = await supabase.rpc("is_ws_member", {
      uid,
      wsid: yagiWs.id,
    });
    if (!isMember) notFound();
  }

  // Load board
  const { data: boardData } = await supabase
    .from("preprod_boards")
    .select(
      `
      id,
      title,
      description,
      status,
      share_enabled,
      share_token,
      project_id,
      project:projects(title, workspace_id)
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!boardData) notFound();

  // Load current-revision frames ordered by frame_order
  const { data: framesData } = await supabase
    .from("preprod_frames")
    .select(
      `
      id,
      frame_order,
      media_type,
      media_storage_path,
      media_external_url,
      media_embed_provider,
      thumbnail_path,
      caption,
      director_note,
      reference_ids,
      revision,
      revision_group,
      is_current_revision
    `
    )
    .eq("board_id", id)
    .eq("is_current_revision", true)
    .order("frame_order", { ascending: true });

  const frames = framesData ?? [];

  // Load project references for the ref-link picker
  const { data: refsData } = await supabase
    .from("project_references")
    .select("id, caption, media_type, og_title, thumbnail_path, storage_path")
    .eq("project_id", boardData.project_id)
    .order("created_at", { ascending: false })
    .limit(200);

  const refs = refsData ?? [];

  // Load ALL revisions for this board so the editor can show revision history
  const { data: allFramesData } = await supabase
    .from("preprod_frames")
    .select(
      "id, revision_group, revision, is_current_revision, media_type, media_storage_path, media_external_url, media_embed_provider, thumbnail_path, caption, created_at"
    )
    .eq("board_id", id)
    .order("revision_group", { ascending: true })
    .order("revision", { ascending: true });

  const allFrames = allFramesData ?? [];

  // Build map: revision_group → array of revisions sorted by revision (ascending)
  const revisionHistory: Record<string, typeof allFrames> = {};
  for (const f of allFrames) {
    if (!revisionHistory[f.revision_group]) {
      revisionHistory[f.revision_group] = [];
    }
    revisionHistory[f.revision_group].push(f);
  }

  // Compute signed media URLs server-side for storage-backed frames
  // Include both current frames AND historical revisions so compare dialog works
  type MediaUrls = Record<string, string>;
  const mediaUrls: MediaUrls = {};
  const pathsToSign: { frameId: string; path: string }[] = [];

  for (const frame of frames) {
    if (frame.media_storage_path) {
      pathsToSign.push({ frameId: frame.id, path: frame.media_storage_path });
    }
    if (frame.thumbnail_path) {
      pathsToSign.push({
        frameId: `${frame.id}__thumb`,
        path: frame.thumbnail_path,
      });
    }
  }

  // Also sign historical (non-current) revisions
  for (const f of allFrames) {
    if (f.is_current_revision) continue;
    if (f.media_storage_path) {
      pathsToSign.push({ frameId: f.id, path: f.media_storage_path });
    }
    if (f.thumbnail_path) {
      pathsToSign.push({ frameId: `${f.id}__thumb`, path: f.thumbnail_path });
    }
  }

  if (pathsToSign.length > 0) {
    // createSignedUrls in batch (max 100 at a time)
    const paths = pathsToSign.map((p) => p.path);
    const { data: signedList } = await supabase.storage
      .from("preprod-frames")
      .createSignedUrls(paths, 3600);

    if (signedList) {
      for (const signed of signedList) {
        if (!signed.signedUrl) continue;
        const idx = pathsToSign.findIndex((p) => p.path === signed.path);
        if (idx !== -1) {
          mediaUrls[pathsToSign[idx].frameId] = signed.signedUrl;
        }
      }
    }
  }

  // Shape board for the editor
  const board = {
    id: boardData.id,
    title: boardData.title,
    description: boardData.description ?? null,
    status: boardData.status,
    share_enabled: boardData.share_enabled,
    share_token: boardData.share_token ?? null,
    project_id: boardData.project_id,
    project: boardData.project as { title: string; workspace_id: string } | null,
  };

  // Load reactions for this board (for the editor's feedback panels)
  const { data: reactionsData } = await supabase
    .from("preprod_frame_reactions")
    .select(
      "id, board_id, frame_id, reaction, reactor_name, reactor_email, created_at, updated_at"
    )
    .eq("board_id", id)
    .order("created_at", { ascending: true });

  const reactions = reactionsData ?? [];

  // Load comments for this board
  const { data: commentsData } = await supabase
    .from("preprod_frame_comments")
    .select(
      "id, board_id, frame_id, body, author_display_name, author_email, author_user_id, resolved_at, resolved_by, created_at"
    )
    .eq("board_id", id)
    .order("created_at", { ascending: true });

  const comments = commentsData ?? [];

  return (
    <BoardEditor
      board={board}
      frames={frames}
      refs={refs}
      mediaUrls={mediaUrls}
      revisionHistory={revisionHistory}
      initialReactions={reactions}
      initialComments={comments}
      backHref="/app/preprod"
      savedLabel={t("saved_indicator")}
    />
  );
}
