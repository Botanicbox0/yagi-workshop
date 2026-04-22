import "server-only";
import { createSupabaseService } from "@/lib/supabase/service";
import type { Tables } from "@/lib/supabase/database.types";

export type BoardRow = Tables<"preprod_boards">;
export type FrameRow = Tables<"preprod_frames">;
export type ReactionRow = Tables<"preprod_frame_reactions">;
export type CommentRow = Tables<"preprod_frame_comments">;
export type ReferenceRow = Tables<"project_references">;

export type ShareData = {
  board: BoardRow;
  projectTitle: string;
  frames: FrameRow[];
  allFrames: FrameRow[];
  reactions: ReactionRow[];
  comments: CommentRow[];
  references: ReferenceRow[];
  mediaUrls: Record<string, string>;
};

/**
 * Load all data needed to render the public share page.
 * Returns null if the token is not found or share_enabled=false or
 * the board is archived.
 */
export async function loadShareData(token: string): Promise<ShareData | null> {
  const svc = createSupabaseService();

  // 1. Load board by token
  const { data: board } = await svc
    .from("preprod_boards")
    .select("*")
    .eq("share_token", token)
    .eq("share_enabled", true)
    .maybeSingle();

  if (!board) return null;
  if (board.status === "archived") return null;

  // 2. Load project title
  const { data: project } = await svc
    .from("projects")
    .select("title")
    .eq("id", board.project_id)
    .maybeSingle();

  const projectTitle = project?.title ?? "";

  // 3. Current-revision frames ordered by frame_order
  const { data: framesData } = await svc
    .from("preprod_frames")
    .select("*")
    .eq("board_id", board.id)
    .eq("is_current_revision", true)
    .order("frame_order", { ascending: true });

  const frames = framesData ?? [];

  // 4. All revisions for the board (for revision compare)
  const { data: allFramesData } = await svc
    .from("preprod_frames")
    .select("*")
    .eq("board_id", board.id)
    .order("revision_group", { ascending: true })
    .order("revision", { ascending: true });

  const allFrames = allFramesData ?? [];

  // 5. All reactions + comments for this board
  const [{ data: reactionsData }, { data: commentsData }] = await Promise.all([
    svc
      .from("preprod_frame_reactions")
      .select("*")
      .eq("board_id", board.id),
    svc
      .from("preprod_frame_comments")
      .select("*")
      .eq("board_id", board.id)
      .order("created_at", { ascending: true }),
  ]);

  const reactions = reactionsData ?? [];
  const comments = commentsData ?? [];

  // 6. References for frames that have reference_ids
  const allRefIds = Array.from(
    new Set(frames.flatMap((f) => f.reference_ids ?? [])),
  );

  let references: ReferenceRow[] = [];
  if (allRefIds.length > 0) {
    // Defense-in-depth: re-check project_id at read time so a frame whose
    // reference_ids were tampered with (or which point to deleted/moved
    // references) cannot leak assets from another project (HIGH K-05 fix).
    const { data: refsData } = await svc
      .from("project_references")
      .select("*")
      .in("id", allRefIds)
      .eq("project_id", board.project_id);
    references = refsData ?? [];
  }

  // 7. Sign storage URLs for all frames (current + historical)
  const mediaUrls: Record<string, string> = {};
  const pathsToSign: { key: string; path: string }[] = [];

  const collectPaths = (f: FrameRow) => {
    if (f.media_storage_path) {
      pathsToSign.push({ key: f.id, path: f.media_storage_path });
    }
    if (f.thumbnail_path) {
      pathsToSign.push({ key: `${f.id}__thumb`, path: f.thumbnail_path });
    }
  };

  for (const f of frames) collectPaths(f);
  for (const f of allFrames) {
    if (!f.is_current_revision) collectPaths(f);
  }

  // Also sign reference thumbnails / storage assets
  for (const ref of references) {
    if (ref.thumbnail_path) {
      pathsToSign.push({ key: `ref_thumb_${ref.id}`, path: ref.thumbnail_path });
    }
    if (ref.storage_path) {
      pathsToSign.push({ key: `ref_${ref.id}`, path: ref.storage_path });
    }
  }

  if (pathsToSign.length > 0) {
    // Batch in chunks of 100 (Supabase limit)
    for (let i = 0; i < pathsToSign.length; i += 100) {
      const chunk = pathsToSign.slice(i, i + 100);
      const { data: signedList } = await svc.storage
        .from("preprod-frames")
        .createSignedUrls(
          chunk.map((c) => c.path),
          3600,
        );
      if (signedList) {
        for (const signed of signedList) {
          if (!signed.signedUrl) continue;
          const entry = chunk.find((c) => c.path === signed.path);
          if (entry) mediaUrls[entry.key] = signed.signedUrl;
        }
      }
    }
  }

  return {
    board,
    projectTitle,
    frames,
    allFrames,
    reactions,
    comments,
    references,
    mediaUrls,
  };
}
