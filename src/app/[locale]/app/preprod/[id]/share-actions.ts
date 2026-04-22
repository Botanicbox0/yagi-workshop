"use server"

import { z } from "zod"
import { randomBytes } from "node:crypto"
import { createSupabaseServer } from "@/lib/supabase/server"
import { createSupabaseService } from "@/lib/supabase/service"
import { emitNotification } from "@/lib/notifications/emit"
import { revalidatePath } from "next/cache"

// ─── Types ────────────────────────────────────────────────────────────────────

type ShareResult =
  | { ok: true; url: string; token: string }
  | { ok: false; error: string }

type SimpleResult = { ok: true } | { ok: false; error: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uuidSchema = z.string().uuid()

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
}

function buildShareUrl(token: string): string {
  return `${siteUrl()}/s/${token}`
}

function generateToken(): string {
  return randomBytes(32).toString("base64url")
}

function revalidateBoard(boardId: string) {
  revalidatePath("/app/preprod")
  revalidatePath(`/app/preprod/${boardId}`)
}

// ─── shareBoard ───────────────────────────────────────────────────────────────

export async function shareBoard(boardId: string): Promise<ShareResult> {
  const parsed = uuidSchema.safeParse(boardId)
  if (!parsed.success) return { ok: false, error: "invalid_board_id" }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" }

  // Fetch current board state
  const { data: board, error: fetchErr } = await supabase
    .from("preprod_boards")
    .select("id, status, share_token, project_id, workspace_id, title")
    .eq("id", boardId)
    .single()

  if (fetchErr || !board) return { ok: false, error: "not_found" }
  if (board.status === "archived") return { ok: false, error: "archived" }

  // Require at least one current-revision frame
  const { count } = await supabase
    .from("preprod_frames")
    .select("id", { count: "exact", head: true })
    .eq("board_id", boardId)
    .eq("is_current_revision", true)

  if (!count || count < 1) return { ok: false, error: "no_frames" }

  // Idempotent: if already shared with an existing token, return it
  if (board.status === "shared" && board.share_token) {
    revalidateBoard(boardId)
    return {
      ok: true,
      url: buildShareUrl(board.share_token),
      token: board.share_token,
    }
  }

  const token = generateToken()

  const { data: updated, error: updateErr } = await supabase
    .from("preprod_boards")
    .update({ status: "shared", share_enabled: true, share_token: token })
    .eq("id", boardId)
    .in("status", ["draft", "shared", "approved"])
    .select("id")

  if (updateErr) return { ok: false, error: updateErr.message }
  if (!updated || updated.length === 0) return { ok: false, error: "race_archive" }

  // Phase 1.8 — notify all workspace members that a board was shared. Never
  // fail the parent action on emit error.
  try {
    await _emitBoardSharedNotifications({
      actorUserId: user.id,
      boardId: board.id,
      boardTitle: board.title,
      projectId: board.project_id,
      workspaceId: board.workspace_id,
    })
  } catch (err) {
    console.error("[shareBoard] notif emit failed:", err)
  }

  revalidateBoard(boardId)
  return { ok: true, url: buildShareUrl(token), token }
}

// ─── unshareBoard ─────────────────────────────────────────────────────────────

export async function unshareBoard(boardId: string): Promise<SimpleResult> {
  const parsed = uuidSchema.safeParse(boardId)
  if (!parsed.success) return { ok: false, error: "invalid_board_id" }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: updated, error: updateErr } = await supabase
    .from("preprod_boards")
    .update({ status: "draft", share_enabled: false, share_token: null })
    .eq("id", boardId)
    .eq("status", "shared")
    .select("id")

  if (updateErr) return { ok: false, error: updateErr.message }
  if (!updated || updated.length === 0) return { ok: false, error: "not_shared" }

  revalidateBoard(boardId)
  return { ok: true }
}

// ─── rotateShareToken ─────────────────────────────────────────────────────────

export async function rotateShareToken(boardId: string): Promise<ShareResult> {
  const parsed = uuidSchema.safeParse(boardId)
  if (!parsed.success) return { ok: false, error: "invalid_board_id" }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const token = generateToken()

  const { data: updated, error: updateErr } = await supabase
    .from("preprod_boards")
    .update({ share_token: token })
    .eq("id", boardId)
    .eq("status", "shared")
    .select("id")

  if (updateErr) return { ok: false, error: updateErr.message }
  if (!updated || updated.length === 0) return { ok: false, error: "not_shared" }

  revalidateBoard(boardId)
  return { ok: true, url: buildShareUrl(token), token }
}

// ─── approveBoard ─────────────────────────────────────────────────────────────

export async function approveBoard(boardId: string): Promise<SimpleResult> {
  const parsed = uuidSchema.safeParse(boardId)
  if (!parsed.success) return { ok: false, error: "invalid_board_id" }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" }
  if (!user.email) return { ok: false, error: "no_email" }

  const { data: updated, error: updateErr } = await supabase
    .from("preprod_boards")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by_email: user.email,
    })
    .eq("id", boardId)
    .eq("status", "shared")
    .select("id, title, project_id, workspace_id")

  if (updateErr) return { ok: false, error: updateErr.message }
  if (!updated || updated.length === 0) return { ok: false, error: "not_shared" }

  // Phase 1.8 — notify YAGI admins of the approval. Emit failures never
  // fail the parent action.
  try {
    await _emitBoardApprovedNotifications({
      actorUserId: user.id,
      boardId: updated[0].id,
      boardTitle: updated[0].title,
      projectId: updated[0].project_id,
      workspaceId: updated[0].workspace_id,
    })
  } catch (err) {
    console.error("[approveBoard] notif emit failed:", err)
  }

  revalidateBoard(boardId)
  return { ok: true }
}

// ─── revertApproval ───────────────────────────────────────────────────────────
// Reverses a public /s/[token] approval back to 'shared'. The public approve
// endpoint cannot verify approver identity, so this gives YAGI a way to undo
// a spoofed/erroneous approval (HIGH K-05 mitigation, paired with audit email).

export async function revertApproval(boardId: string): Promise<SimpleResult> {
  const parsed = uuidSchema.safeParse(boardId)
  if (!parsed.success) return { ok: false, error: "invalid_board_id" }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: updated, error: updateErr } = await supabase
    .from("preprod_boards")
    .update({ status: "shared", approved_at: null, approved_by_email: null })
    .eq("id", boardId)
    .eq("status", "approved")
    .select("id")

  if (updateErr) return { ok: false, error: updateErr.message }
  if (!updated || updated.length === 0) return { ok: false, error: "not_approved" }

  revalidateBoard(boardId)
  return { ok: true }
}

// ─── Phase 1.8 notification helpers ───────────────────────────────────────────

async function _getActorDisplayName(actorUserId: string): Promise<string> {
  const svc = createSupabaseService()
  const { data } = await svc
    .from("profiles")
    .select("display_name")
    .eq("id", actorUserId)
    .maybeSingle()
  return data?.display_name ?? "YAGI"
}

async function _emitBoardSharedNotifications(args: {
  actorUserId: string
  boardId: string
  boardTitle: string
  projectId: string
  workspaceId: string
}): Promise<void> {
  const svc = createSupabaseService()

  const [{ data: members }, { data: workspace }, actorName] = await Promise.all([
    svc
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", args.workspaceId),
    svc
      .from("workspaces")
      .select("name")
      .eq("id", args.workspaceId)
      .maybeSingle(),
    _getActorDisplayName(args.actorUserId),
  ])

  const clientName = workspace?.name ?? ""
  const urlPath = `/app/projects/${args.projectId}/board/${args.boardId}`

  await Promise.all(
    (members ?? [])
      .filter((m) => m.user_id && m.user_id !== args.actorUserId)
      .map((m) =>
        emitNotification({
          user_id: m.user_id!,
          kind: "board_shared",
          project_id: args.projectId,
          workspace_id: args.workspaceId,
          payload: {
            actor: actorName,
            board_title: args.boardTitle,
            client: clientName,
          },
          url_path: urlPath,
        })
      )
  )
}

async function _emitBoardApprovedNotifications(args: {
  actorUserId: string
  boardId: string
  boardTitle: string
  projectId: string
  workspaceId: string
}): Promise<void> {
  const svc = createSupabaseService()

  const [{ data: yagiAdmins }, actorName] = await Promise.all([
    svc
      .from("user_roles")
      .select("user_id")
      .eq("role", "yagi_admin")
      .is("workspace_id", null),
    _getActorDisplayName(args.actorUserId),
  ])

  const urlPath = `/app/projects/${args.projectId}/board/${args.boardId}`

  await Promise.all(
    (yagiAdmins ?? [])
      .filter((r) => r.user_id && r.user_id !== args.actorUserId)
      .map((r) =>
        emitNotification({
          user_id: r.user_id!,
          kind: "board_approved",
          project_id: args.projectId,
          workspace_id: args.workspaceId,
          payload: {
            actor: actorName,
            board_title: args.boardTitle,
          },
          url_path: urlPath,
        })
      )
  )
}

// ─── archiveBoard ─────────────────────────────────────────────────────────────

export async function archiveBoard(boardId: string): Promise<SimpleResult> {
  const parsed = uuidSchema.safeParse(boardId)
  if (!parsed.success) return { ok: false, error: "invalid_board_id" }

  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "unauthorized" }

  const { data: updated, error: updateErr } = await supabase
    .from("preprod_boards")
    .update({ status: "archived", share_enabled: false, share_token: null })
    .eq("id", boardId)
    .select("id")

  if (updateErr) return { ok: false, error: updateErr.message }
  if (!updated || updated.length === 0) return { ok: false, error: "not_found" }

  revalidateBoard(boardId)
  return { ok: true }
}
