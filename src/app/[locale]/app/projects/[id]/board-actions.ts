"use server";

/**
 * board-actions.ts
 * Phase 3.1 task_05 — server actions for ProjectBoard brief mode.
 *
 * Three actions:
 *   - updateProjectBoardAction(projectId, document)
 *       Validates auth + lock state; recomputes asset_index server-side
 *       (K-05 trust boundary — never trust client-supplied asset_index);
 *       inserts a project_board_versions snapshot if >30s since last;
 *       updates project_boards.{document, asset_index, updated_at}.
 *
 *   - toggleLockAction(boardId, locked)
 *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
 *
 *   - restoreVersionAction(boardId, version)
 *       Admin-only; copies project_board_versions.document back into
 *       project_boards.document and recomputes asset_index.
 *
 * All anti-DoS: 5MB serialized cap on document.
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { extractAssetIndex } from "@/lib/board/asset-index";
import {
  createBriefAssetPutUrl,
  briefObjectPublicUrl,
} from "@/lib/r2/client";
import { fetchVideoMetadata } from "@/lib/oembed";

const VERSION_DEBOUNCE_MS = 30_000;
const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

// K-05 LOOP 1 MEDIUM F6 fix: same validator as wizard's submitProjectAction
// to reject malformed tldraw store snapshots. Empty {} is permitted (a brief
// in initial state). Otherwise document MUST contain a `store` object key.
function validateTldrawStore(doc: Record<string, unknown>): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (Object.keys(doc).length === 0) return true;
  if (!("store" in doc)) return false;
  const store = (doc as { store: unknown }).store;
  if (typeof store !== "object" || store === null) return false;
  return true;
}

// ============================================================
// updateProjectBoardAction
// ============================================================

const UpdateBoardSchema = z.object({
  projectId: z.string().uuid(),
  document: z
    .record(z.string(), z.unknown())
    .refine(validateTldrawStore, {
      message: "document is not a valid tldraw store snapshot",
    }),
});

export type UpdateBoardResult =
  | { ok: true; boardId: string }
  | {
      ok: false;
      error: "unauthenticated" | "validation" | "locked" | "not_found" | "db";
      message?: string;
    };

export async function updateProjectBoardAction(
  input: unknown
): Promise<UpdateBoardResult> {
  const parsed = UpdateBoardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  // Anti-DoS
  let serialized: string;
  try {
    serialized = JSON.stringify(parsed.data.document);
  } catch {
    return { ok: false, error: "validation" };
  }
  if (serialized.length > DOCUMENT_MAX_BYTES) {
    return { ok: false, error: "validation", message: "document_too_large" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  const sb = supabase as any;

  // Fetch the board (RLS gates SELECT — non-owner non-admin gets nothing)
  const { data: board, error: bErr } = await sb
    .from("project_boards")
    .select("id, is_locked")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();
  if (bErr || !board) return { ok: false, error: "not_found" };
  if (board.is_locked) return { ok: false, error: "locked" };

  // K-05 trust boundary: server-recompute asset_index. Never trust client.
  // Phase 3.1 hotfix-3: also merge attached_pdfs + attached_urls (read from DB).
  // For canvas-only update, fetch current attachment state from DB to merge.
  const { data: currentBoard } = await sb
    .from("project_boards")
    .select("attached_pdfs, attached_urls")
    .eq("id", board.id)
    .maybeSingle();
  const assetIndex = extractAssetIndex(
    parsed.data.document,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
    ((currentBoard as any)?.attached_pdfs ?? []) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
    ((currentBoard as any)?.attached_urls ?? []) as any,
  );

  // K-05 LOOP 1 HIGH-B F3 fix: atomic update guarded by is_locked=false to
  // close the lock race window. If admin locks between our SELECT and UPDATE,
  // the WHERE clause filters it out and `updated` returns empty rows; we then
  // return error:locked WITHOUT having inserted a version snapshot.
  const { data: updated, error: uErr } = await sb
    .from("project_boards")
    .update({
      document: parsed.data.document,
      asset_index: assetIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("id", board.id)
    .eq("is_locked", false)
    .select("id");
  if (uErr) {
    console.error("[updateProjectBoardAction] update error:", uErr);
    return { ok: false, error: "db", message: uErr.message };
  }
  if (!Array.isArray(updated) || updated.length === 0) {
    // Lock was acquired between SELECT and UPDATE → no rows updated, no snapshot.
    return { ok: false, error: "locked" };
  }

  // Versioning: snapshot AFTER successful update (K-05 LOOP 1 HIGH-B F3 fix —
  // never insert a version row for a write that did not land).
  const { data: lastVersion } = await sb
    .from("project_board_versions")
    .select("created_at, version")
    .eq("board_id", board.id)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const shouldSnapshot =
    !lastVersion ||
    Date.now() - new Date(lastVersion.created_at as string).getTime() >
      VERSION_DEBOUNCE_MS;

  if (shouldSnapshot) {
    const nextVersion = ((lastVersion?.version as number | undefined) ?? 0) + 1;
    // INSERT bypasses RLS via service role (project_board_versions_insert_trigger
    // has WITH CHECK false, so user-scoped client cannot INSERT directly).
    const svc = createSupabaseService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
    await (svc as any).from("project_board_versions").insert({
      board_id: board.id,
      version: nextVersion,
      document: parsed.data.document,
      created_by: user.id,
      label: null,
    });
  }

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true, boardId: board.id };
}

// ============================================================
// toggleLockAction
// ============================================================

const ToggleLockSchema = z.object({
  boardId: z.string().uuid(),
  locked: z.boolean(),
});

export type ToggleLockResult =
  | { ok: true }
  | {
      ok: false;
      error: "unauthenticated" | "validation" | "db" | "forbidden";
      message?: string;
    };

export async function toggleLockAction(
  input: unknown
): Promise<ToggleLockResult> {
  const parsed = ToggleLockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // RPC enforces yagi_admin internally (RAISE EXCEPTION if not admin).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
    p_board_id: parsed.data.boardId,
    p_locked: parsed.data.locked,
  });
  if (error) {
    console.error("[toggleLockAction] rpc error:", error);
    return { ok: false, error: "db", message: error.message };
  }
  return { ok: true };
}

// ============================================================
// toggleBoardLockAction (Phase 3.1 hotfix-3 task_04)
// Defense-in-depth: action verifies yagi_admin role + RPC verifies.
// ============================================================

export type ToggleBoardLockResult =
  | { ok: true; isLocked: boolean }
  | {
      ok: false;
      error: "unauthenticated" | "forbidden" | "validation" | "db";
      message?: string;
    };

export async function toggleBoardLockAction(
  boardId: string,
  locked: boolean
): Promise<ToggleBoardLockResult> {
  if (!boardId || typeof boardId !== "string") {
    return { ok: false, error: "validation" };
  }
  if (typeof locked !== "boolean") {
    return { ok: false, error: "validation" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Action-layer role check (defense-in-depth over RPC-only check)
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isYagiAdmin = (roles ?? []).some(
    (r) => (r as { role: string }).role === "yagi_admin"
  );
  if (!isYagiAdmin) return { ok: false, error: "forbidden" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { error } = await (supabase as any).rpc("toggle_project_board_lock", {
    p_board_id: boardId,
    p_locked: locked,
  });
  if (error) {
    console.error("[toggleBoardLockAction] rpc error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  // Resolve project_id for revalidation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  const { data: boardLookup } = await (supabase as any)
    .from("project_boards")
    .select("project_id")
    .eq("id", boardId)
    .maybeSingle();

  if (boardLookup?.project_id) {
    revalidatePath(
      `/[locale]/app/projects/${boardLookup.project_id}`,
      "page"
    );
  }

  return { ok: true, isLocked: locked };
}

// ============================================================
// restoreVersionAction
// ============================================================

const RestoreVersionSchema = z.object({
  boardId: z.string().uuid(),
  version: z.number().int().positive(),
});

export type RestoreVersionResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "validation"
        | "forbidden"
        | "not_found"
        | "db";
      message?: string;
    };



export async function restoreVersionAction(
  input: unknown
): Promise<RestoreVersionResult> {
  const parsed = RestoreVersionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Admin-only check — restore is destructive and bypasses lock state.
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  const isAdmin = (roles ?? []).some(
    (r) => (r as { role: string }).role === "yagi_admin"
  );
  if (!isAdmin) return { ok: false, error: "forbidden" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  const sb = supabase as any;
  const { data: snap, error: sErr } = await sb
    .from("project_board_versions")
    .select("document")
    .eq("board_id", parsed.data.boardId)
    .eq("version", parsed.data.version)
    .maybeSingle();
  if (sErr || !snap) return { ok: false, error: "not_found" };

  const restoredDoc = snap.document as Record<string, unknown>;
  // K-05 LOOP 1 MEDIUM F6: validate snapshot is structurally a tldraw store
  // before restoring (defense against historical bad data).
  if (!validateTldrawStore(restoredDoc)) {
    return { ok: false, error: "validation", message: "snapshot_malformed" };
  }
  // Phase 3.1 hotfix-3: fetch current attached_pdfs + attached_urls for merge
  const { data: boardForRestore } = await sb
    .from("project_boards")
    .select("attached_pdfs, attached_urls")
    .eq("id", parsed.data.boardId)
    .maybeSingle();
  const assetIndex = extractAssetIndex(
    restoredDoc,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
    ((boardForRestore as any)?.attached_pdfs ?? []) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
    ((boardForRestore as any)?.attached_urls ?? []) as any,
  );

  // Resolve project_id for revalidation — board → project_id lookup
  const { data: boardLookup } = await sb
    .from("project_boards")
    .select("project_id")
    .eq("id", parsed.data.boardId)
    .maybeSingle();

  const { error: uErr } = await sb
    .from("project_boards")
    .update({
      document: restoredDoc,
      asset_index: assetIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.boardId);
  if (uErr) {
    console.error("[restoreVersionAction] update error:", uErr);
    return { ok: false, error: "db", message: uErr.message };
  }

  // K-05 LOOP 1 MEDIUM fix: revalidate the project page after restore so the
  // canvas re-renders with the restored snapshot.
  if (boardLookup?.project_id) {
    revalidatePath(
      `/[locale]/app/projects/${boardLookup.project_id}`,
      "page"
    );
  }
  return { ok: true };
}

// ============================================================
// Phase 3.1 hotfix-3 — Attachment server actions
// ============================================================
// All actions: validate input, call RPC, recompute asset_index server-side,
// revalidate page. Trust boundary: client never supplies asset_index (L-041).

// Helper: recompute asset_index from current board state and UPDATE
async function recomputeAndUpdateAssetIndex(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: any,
  boardId: string
): Promise<void> {
  const { data: board } = await sb
    .from("project_boards")
    .select("document, attached_pdfs, attached_urls, project_id")
    .eq("id", boardId)
    .maybeSingle();
  if (!board) return;

  const newIndex = extractAssetIndex(
    board.document as Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
    (board.attached_pdfs ?? []) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 columns not in generated types
    (board.attached_urls ?? []) as any,
  );

  await sb
    .from("project_boards")
    .update({ asset_index: newIndex, updated_at: new Date().toISOString() })
    .eq("id", boardId);

  if (board.project_id) {
    revalidatePath(`/[locale]/app/projects/${board.project_id}`, "page");
  }
}

// URL validation — only http/https allowed (L-042 server layer)
const SAFE_URL_SCHEMES = ["http:", "https:"];
function validateUrlScheme(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SAFE_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ============================================================
// addPdfAttachmentAction
// ============================================================

export type AddPdfResult =
  | { ok: true; attachmentId: string }
  | { ok: false; error: string };

export async function addPdfAttachmentAction(
  boardId: string,
  file: File
): Promise<AddPdfResult> {
  if (!boardId || typeof boardId !== "string") {
    return { ok: false, error: "invalid_board_id" };
  }

  // Validate file
  if (file.type !== "application/pdf") {
    return { ok: false, error: "not_pdf" };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { ok: false, error: "file_too_large" };
  }
  if (file.name.length > 200) {
    return { ok: false, error: "filename_too_long" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Upload to R2 first (server-generated key for this board)
  const ext = "pdf";
  const uuid = crypto.randomUUID();
  const storageKey = `project-board/${boardId}/${uuid}.${ext}`;

  try {
    const putUrl = await createBriefAssetPutUrl(storageKey, file.type, 600);
    const arrayBuffer = await file.arrayBuffer();
    const putResp = await fetch(putUrl, {
      method: "PUT",
      body: arrayBuffer,
      headers: { "Content-Type": file.type },
    });
    if (!putResp.ok) {
      return { ok: false, error: "r2_put_failed" };
    }
  } catch (err) {
    console.error("[addPdfAttachmentAction] R2 upload error:", err);
    return { ok: false, error: "r2_upload_error" };
  }

  // Call add_project_board_pdf RPC
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
    "add_project_board_pdf",
    {
      p_board_id: boardId,
      p_storage_key: storageKey,
      p_filename: file.name,
      p_size_bytes: file.size,
    }
  );
  if (rpcErr) {
    console.error("[addPdfAttachmentAction] RPC error:", rpcErr);
    return { ok: false, error: rpcErr.message };
  }

  // Recompute asset_index server-side (trust boundary L-041)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  await recomputeAndUpdateAssetIndex(supabase as any, boardId);

  return { ok: true, attachmentId: attachmentId as string };
}

// ============================================================
// removePdfAttachmentAction
// ============================================================

export type RemovePdfResult = { ok: true } | { ok: false; error: string };

export async function removePdfAttachmentAction(
  boardId: string,
  attachmentId: string
): Promise<RemovePdfResult> {
  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { error: rpcErr } = await (supabase as any).rpc(
    "remove_project_board_attachment",
    {
      p_board_id: boardId,
      p_kind: "pdf",
      p_attachment_id: attachmentId,
    }
  );
  if (rpcErr) {
    console.error("[removePdfAttachmentAction] RPC error:", rpcErr);
    return { ok: false, error: rpcErr.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
  return { ok: true };
}

// ============================================================
// addUrlAttachmentAction
// ============================================================

export type AddUrlResult =
  | { ok: true; attachmentId: string }
  | { ok: false; error: string };

export async function addUrlAttachmentAction(
  boardId: string,
  url: string,
  note: string | null
): Promise<AddUrlResult> {
  if (!boardId) return { ok: false, error: "invalid_board_id" };

  // Server-side URL validation (L-042 — only http/https)
  if (!validateUrlScheme(url)) {
    return { ok: false, error: "invalid_url_scheme" };
  }
  if (url.length > 2000) return { ok: false, error: "url_too_long" };
  if (note && note.length > 500) return { ok: false, error: "note_too_long" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Detect provider and fetch metadata
  let provider: "youtube" | "vimeo" | "generic" = "generic";
  let title: string | null = null;
  let thumbnail_url: string | null = null;

  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be") provider = "youtube";
    else if (host === "vimeo.com") provider = "vimeo";
    else title = host;
  } catch {
    // ignore parse error — URL already validated above
  }

  if (provider !== "generic") {
    try {
      const meta = await fetchVideoMetadata(url);
      if (meta) {
        title = meta.title ?? null;
        thumbnail_url = meta.thumbnailUrl ?? null;
      }
    } catch {
      // best-effort — fall back to no metadata
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { data: attachmentId, error: rpcErr } = await (supabase as any).rpc(
    "add_project_board_url",
    {
      p_board_id: boardId,
      p_url: url,
      p_title: title,
      p_thumbnail_url: thumbnail_url,
      p_provider: provider,
      p_note: note,
    }
  );
  if (rpcErr) {
    console.error("[addUrlAttachmentAction] RPC error:", rpcErr);
    return { ok: false, error: rpcErr.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
  return { ok: true, attachmentId: attachmentId as string };
}

// ============================================================
// updateUrlNoteAction
// ============================================================

export type UpdateUrlNoteResult = { ok: true } | { ok: false; error: string };

export async function updateUrlNoteAction(
  boardId: string,
  attachmentId: string,
  note: string
): Promise<UpdateUrlNoteResult> {
  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };
  if (note && note.length > 500) return { ok: false, error: "note_too_long" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { error: rpcErr } = await (supabase as any).rpc(
    "update_project_board_url_note",
    {
      p_board_id: boardId,
      p_attachment_id: attachmentId,
      p_note: note,
    }
  );
  if (rpcErr) {
    console.error("[updateUrlNoteAction] RPC error:", rpcErr);
    return { ok: false, error: rpcErr.message };
  }

  // Note is in asset_index entries — must recompute (L-041)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
  return { ok: true };
}

// ============================================================
// removeUrlAttachmentAction
// ============================================================

export type RemoveUrlResult = { ok: true } | { ok: false; error: string };

export async function removeUrlAttachmentAction(
  boardId: string,
  attachmentId: string
): Promise<RemoveUrlResult> {
  if (!boardId || !attachmentId) return { ok: false, error: "invalid_input" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { error: rpcErr } = await (supabase as any).rpc(
    "remove_project_board_attachment",
    {
      p_board_id: boardId,
      p_kind: "url",
      p_attachment_id: attachmentId,
    }
  );
  if (rpcErr) {
    console.error("[removeUrlAttachmentAction] RPC error:", rpcErr);
    return { ok: false, error: rpcErr.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1 tables not in generated types
  await recomputeAndUpdateAssetIndex(supabase as any, boardId);
  return { ok: true };
}
