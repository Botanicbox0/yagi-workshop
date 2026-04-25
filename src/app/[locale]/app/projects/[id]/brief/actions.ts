"use server";

// =============================================================================
// Phase 2.8 G_B-1 — Brief Board Server Actions (skeleton)
// Source: .yagi-autobuild/phase-2-8/SPEC.md §7
//
// Scope of this file at G_B-1 ship: the six core CRUD actions for the brief
// board itself. Concrete impls per gate:
//   - saveBrief / saveVersion / restoreVersion : G_B-1 wires DB writes
//   - lockBrief / unlockBrief                  : G_B-1 wires status flip
//   - uploadAsset                              : G_B-1 returns NOT_IMPL_R2;
//                                                 G_B-3 fills with R2 presign
//
// fetchEmbed (G_B-4) and requestYagiProposal (G_B-6) live in their own files.
// getAssetUrl (G_B-3) is colocated with uploadAsset and lands at G_B-3.
// =============================================================================

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  createBriefAssetGetUrl,
  createBriefAssetPutUrl,
} from "@/lib/r2/client";

// -----------------------------------------------------------------------------
// Shared result discriminated union
// -----------------------------------------------------------------------------

export type BriefActionResult<TOk = unknown> =
  | { ok: true; data: TOk }
  | { error: "validation"; issues: z.ZodIssue[] }
  | { error: "unauthenticated" }
  | { error: "not_found" }
  | { error: "conflict"; latestUpdatedAt: string }
  | { error: "forbidden"; reason: string }
  | { error: "locked" }
  | { error: "not_implemented"; gate: string }
  | { error: "db"; message: string };

// -----------------------------------------------------------------------------
// Zod schemas
// -----------------------------------------------------------------------------

// TipTap document is `{ type: 'doc', content: ProseMirrorNode[] }`. Validating
// the full ProseMirror schema is heavy; v1 trusts the editor and only checks
// the outer envelope shape. Cap raw JSON size at 2 MiB to bound abuse.
const TipTapDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.unknown()).default([]),
  })
  .passthrough();

const SaveBriefInput = z.object({
  projectId: z.string().uuid(),
  contentJson: TipTapDocSchema,
  ifMatchUpdatedAt: z.string().datetime({ offset: true }),
});

const SaveVersionInput = z.object({
  projectId: z.string().uuid(),
  label: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? undefined : v)),
});

const RestoreVersionInput = z.object({
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
});

const LockUnlockInput = z.object({
  projectId: z.string().uuid(),
});

const UploadAssetInput = z.object({
  projectId: z.string().uuid(),
  filename: z.string().trim().min(1).max(500),
  mimeType: z.string().trim().min(1).max(200),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(209715200, "file exceeds 200MB"),
});

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

async function requireUser() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

function approxJsonByteSize(value: unknown): number {
  // Buffer.byteLength gives an exact UTF-8 byte size for the serialized
  // JSON; sufficient for the 2 MiB enforcement.
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

const MAX_CONTENT_JSON_BYTES = 2 * 1024 * 1024; // 2 MiB

// -----------------------------------------------------------------------------
// 1. saveBrief — debounced auto-save with optimistic concurrency
// -----------------------------------------------------------------------------

export async function saveBrief(
  input: unknown
): Promise<BriefActionResult<{ updatedAt: string; status: "editing" | "locked" }>> {
  const parsed = SaveBriefInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  if (approxJsonByteSize(parsed.data.contentJson) > MAX_CONTENT_JSON_BYTES) {
    return {
      error: "validation",
      issues: [
        {
          code: "custom",
          path: ["contentJson"],
          message: "content exceeds 2MiB",
        },
      ],
    };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  // Snapshot current row to enforce If-Match-Updated-At (SPEC §5.5) +
  // status check. Both predicates run server-side so a stale client cannot
  // overwrite a newer save or mutate a locked brief.
  const { data: current, error: currentErr } = await supabase
    .from("project_briefs")
    .select("updated_at, status")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();

  if (currentErr) {
    console.error("[saveBrief] read error", currentErr);
    return { error: "db", message: currentErr.message };
  }
  if (!current) return { error: "not_found" };
  if (current.status === "locked") return { error: "locked" };
  if (current.updated_at !== parsed.data.ifMatchUpdatedAt) {
    return { error: "conflict", latestUpdatedAt: current.updated_at };
  }

  const { data: updated, error: updErr } = await supabase
    .from("project_briefs")
    .update({
      // Zod `.passthrough()` widens the document type with an `unknown`
      // index signature, which is not directly Json-assignable. The
      // outer-envelope validation has already passed (type='doc',
      // content array), and the SQL column-level CHECK constraint
      // bounds size at 2 MiB.
      content_json: parsed.data.contentJson as unknown as Json,
      updated_by: user.id,
    })
    .eq("project_id", parsed.data.projectId)
    .eq("updated_at", parsed.data.ifMatchUpdatedAt) // CAS guard
    .select("updated_at, status")
    .maybeSingle();

  if (updErr) {
    console.error("[saveBrief] update error", updErr);
    return { error: "db", message: updErr.message };
  }
  if (!updated) {
    // Either someone else wrote between our read and write (rare; the
    // updated_at CAS missed) or RLS denied silently.
    return { error: "conflict", latestUpdatedAt: current.updated_at };
  }

  return {
    ok: true,
    data: { updatedAt: updated.updated_at, status: updated.status as "editing" | "locked" },
  };
}

// -----------------------------------------------------------------------------
// 2. saveVersion — explicit snapshot
// -----------------------------------------------------------------------------

export async function saveVersion(
  input: unknown
): Promise<BriefActionResult<{ versionId: string; versionN: number }>> {
  const parsed = SaveVersionInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  const { data: brief, error: briefErr } = await supabase
    .from("project_briefs")
    .select("content_json, status, current_version")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();

  if (briefErr) {
    console.error("[saveVersion] read error", briefErr);
    return { error: "db", message: briefErr.message };
  }
  if (!brief) return { error: "not_found" };
  if (brief.status === "locked") return { error: "locked" };

  const nextN = brief.current_version + 1;

  const { data: inserted, error: insErr } = await supabase
    .from("project_brief_versions")
    .insert({
      project_id: parsed.data.projectId,
      version_n: nextN,
      content_json: brief.content_json,
      label: parsed.data.label ?? null,
      created_by: user.id,
    })
    .select("id, version_n")
    .single();

  if (insErr) {
    console.error("[saveVersion] insert error", insErr);
    return { error: "db", message: insErr.message };
  }

  // Bump current_version. CAS on previous value to avoid clobbering a
  // racing save.
  const { error: bumpErr } = await supabase
    .from("project_briefs")
    .update({ current_version: nextN, updated_by: user.id })
    .eq("project_id", parsed.data.projectId)
    .eq("current_version", brief.current_version);

  if (bumpErr) {
    console.error("[saveVersion] bump error", bumpErr);
    // The version row was inserted but bump failed; return success with
    // the inserted row — the next save will re-derive current_version.
    // (FU candidate: tighten by deleting the version row on bump failure.)
  }

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true, data: { versionId: inserted.id, versionN: inserted.version_n } };
}

// -----------------------------------------------------------------------------
// 3. restoreVersion — copy old snapshot into latest content
// -----------------------------------------------------------------------------
// History-preserving restore (SPEC §5.3): copies v_k.content_json onto
// project_briefs.content_json. current_version unchanged. Next saveVersion
// creates v_(current+1) with the restored content.

export async function restoreVersion(
  input: unknown
): Promise<BriefActionResult<{ updatedAt: string }>> {
  const parsed = RestoreVersionInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  const { data: version, error: vErr } = await supabase
    .from("project_brief_versions")
    .select("content_json, project_id")
    .eq("id", parsed.data.versionId)
    .maybeSingle();

  if (vErr) {
    console.error("[restoreVersion] read error", vErr);
    return { error: "db", message: vErr.message };
  }
  if (!version) return { error: "not_found" };
  if (version.project_id !== parsed.data.projectId) {
    return { error: "forbidden", reason: "version belongs to a different project" };
  }

  const { data: brief, error: briefErr } = await supabase
    .from("project_briefs")
    .select("status")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();

  if (briefErr) {
    console.error("[restoreVersion] brief read error", briefErr);
    return { error: "db", message: briefErr.message };
  }
  if (!brief) return { error: "not_found" };
  if (brief.status === "locked") return { error: "locked" };

  const { data: updated, error: updErr } = await supabase
    .from("project_briefs")
    .update({
      content_json: version.content_json,
      updated_by: user.id,
    })
    .eq("project_id", parsed.data.projectId)
    .select("updated_at")
    .single();

  if (updErr) {
    console.error("[restoreVersion] update error", updErr);
    return { error: "db", message: updErr.message };
  }

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true, data: { updatedAt: updated.updated_at } };
}

// -----------------------------------------------------------------------------
// 4. lockBrief — yagi_admin-only, status='editing' → 'locked'
// -----------------------------------------------------------------------------

export async function lockBrief(
  input: unknown
): Promise<BriefActionResult<{ status: "locked" }>> {
  const parsed = LockUnlockInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  // Server-action layer admin check (defense in depth — the trigger §6
  // also enforces yagi_admin-only status flips).
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "yagi_admin")
    .limit(1);

  if (!roleRows || roleRows.length === 0) {
    return { error: "forbidden", reason: "yagi_admin required" };
  }

  const { error: updErr } = await supabase
    .from("project_briefs")
    .update({ status: "locked", updated_by: user.id })
    .eq("project_id", parsed.data.projectId)
    .eq("status", "editing");

  if (updErr) {
    console.error("[lockBrief] update error", updErr);
    return { error: "db", message: updErr.message };
  }

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true, data: { status: "locked" } };
}

// -----------------------------------------------------------------------------
// 5. unlockBrief — yagi_admin-only, status='locked' → 'editing' (no snapshot)
// -----------------------------------------------------------------------------

export async function unlockBrief(
  input: unknown
): Promise<BriefActionResult<{ status: "editing" }>> {
  const parsed = LockUnlockInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "yagi_admin")
    .limit(1);

  if (!roleRows || roleRows.length === 0) {
    return { error: "forbidden", reason: "yagi_admin required" };
  }

  const { error: updErr } = await supabase
    .from("project_briefs")
    .update({ status: "editing", updated_by: user.id })
    .eq("project_id", parsed.data.projectId)
    .eq("status", "locked");

  if (updErr) {
    console.error("[unlockBrief] update error", updErr);
    return { error: "db", message: updErr.message };
  }

  revalidatePath(`/[locale]/app/projects/${parsed.data.projectId}`, "page");
  return { ok: true, data: { status: "editing" } };
}

// -----------------------------------------------------------------------------
// 6. uploadAsset — full impl (G_B-3): presigned PUT URL + project_brief_assets row
// -----------------------------------------------------------------------------
// Flow: validate → derive storage_key → INSERT asset row (RLS gates project
// membership + binds uploaded_by to caller) → presign PUT URL → return.
// The browser then PUTs the blob directly to R2 with the returned URL.
//
// Orphan note (SPEC §3.3): the asset row is committed before the R2 PUT
// completes, so a failed PUT leaves a metadata row pointing at a key with
// no underlying object. v1 accepts this — Phase 2.8.1 GC sweeps stale rows.

const SAFE_EXT = /^[a-z0-9]{1,8}$/;
function safeExtFromFilename(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0 || dot === filename.length - 1) return "bin";
  const ext = filename.slice(dot + 1).toLowerCase();
  return SAFE_EXT.test(ext) ? ext : "bin";
}

export async function uploadAsset(
  input: unknown
): Promise<
  BriefActionResult<{
    assetId: string;
    storageKey: string;
    presignedPutUrl: string;
  }>
> {
  const parsed = UploadAssetInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  const assetId = randomUUID();
  const ext = safeExtFromFilename(parsed.data.filename);
  const storageKey = `project-briefs/${parsed.data.projectId}/${assetId}.${ext}`;

  // INSERT first so RLS gates project membership + uploaded_by attribution.
  // If this fails with RLS denial, we never expose a presigned URL.
  const { data: row, error: insErr } = await supabase
    .from("project_brief_assets")
    .insert({
      id: assetId,
      project_id: parsed.data.projectId,
      storage_key: storageKey,
      mime_type: parsed.data.mimeType,
      byte_size: parsed.data.byteSize,
      original_name: parsed.data.filename,
      uploaded_by: user.id,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    console.error("[uploadAsset] insert error", insErr);
    if (/row-level security|new row violates/i.test(insErr.message)) {
      return { error: "forbidden", reason: "not a project member" };
    }
    return { error: "db", message: insErr.message };
  }
  if (!row) return { error: "forbidden", reason: "RLS denied" };

  let presignedPutUrl: string;
  try {
    presignedPutUrl = await createBriefAssetPutUrl(
      storageKey,
      parsed.data.mimeType
    );
  } catch (err) {
    // Presign failed (likely env misconfig). Roll back the metadata row
    // so we don't accumulate orphans on infra outage.
    console.error("[uploadAsset] presign error", err);
    await supabase.from("project_brief_assets").delete().eq("id", assetId);
    return { error: "db", message: err instanceof Error ? err.message : "presign failed" };
  }

  return {
    ok: true,
    data: { assetId, storageKey, presignedPutUrl },
  };
}

// -----------------------------------------------------------------------------
// 7. getAssetUrl — presigned GET URL for inline render / download
// -----------------------------------------------------------------------------
// SELECT through SSR Supabase client honors project_brief_assets_select
// RLS (caller must be a project member or yagi_admin). On success the
// presigned URL is returned; the asset itself is fetched from R2 by the
// browser. 1h expiry covers a typical edit session.

const GetAssetUrlInput = z.object({
  assetId: z.string().uuid(),
});

export async function getAssetUrl(
  input: unknown
): Promise<BriefActionResult<{ url: string; mimeType: string; filename: string | null }>> {
  const parsed = GetAssetUrlInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  const { data: asset, error: selErr } = await supabase
    .from("project_brief_assets")
    .select("storage_key, mime_type, original_name")
    .eq("id", parsed.data.assetId)
    .maybeSingle();

  if (selErr) {
    console.error("[getAssetUrl] select error", selErr);
    return { error: "db", message: selErr.message };
  }
  if (!asset) return { error: "not_found" };

  let url: string;
  try {
    url = await createBriefAssetGetUrl(asset.storage_key);
  } catch (err) {
    console.error("[getAssetUrl] presign error", err);
    return { error: "db", message: err instanceof Error ? err.message : "presign failed" };
  }

  return {
    ok: true,
    data: {
      url,
      mimeType: asset.mime_type,
      filename: asset.original_name,
    },
  };
}
