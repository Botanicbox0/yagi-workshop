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

const VERSION_DEBOUNCE_MS = 30_000;
const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;

// ============================================================
// updateProjectBoardAction
// ============================================================

const UpdateBoardSchema = z.object({
  projectId: z.string().uuid(),
  document: z.record(z.string(), z.unknown()),
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
  const assetIndex = extractAssetIndex(parsed.data.document);

  // Versioning: snapshot if last version >30s ago (or never).
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

  // UPDATE the board (user-scoped client; RLS update_client policy allows
  // when board.is_locked=false, which we just verified).
  const { error: uErr } = await sb
    .from("project_boards")
    .update({
      document: parsed.data.document,
      asset_index: assetIndex,
      updated_at: new Date().toISOString(),
    })
    .eq("id", board.id);
  if (uErr) {
    console.error("[updateProjectBoardAction] update error:", uErr);
    return { ok: false, error: "db", message: uErr.message };
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
  const assetIndex = extractAssetIndex(restoredDoc);

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
  return { ok: true };
}
