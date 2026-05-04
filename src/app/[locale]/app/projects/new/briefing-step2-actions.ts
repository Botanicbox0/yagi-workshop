"use server";

// =============================================================================
// Phase 5 Wave B task_05 v3 — Step 2 workspace server actions
//
// Split from briefing-actions.ts to keep file sizes managable. The Step 1
// transition action (ensureBriefingDraftProject) stays in briefing-actions.ts;
// every Step 2 read/write surface lives here.
//
// 5 actions:
//   - getBriefingDocumentPutUrlAction(input)    — R2 presigned PUT (upload only)
//   - addBriefingDocumentAction(input)          — INSERT briefing_documents
//   - removeBriefingDocumentAction(input)       — DELETE briefing_documents
//   - updateBriefingDocumentNoteAction(input)   — UPDATE note + category only
//   - updateProjectMetadataAction(input)        — autosave 12 sidebar fields
//
// Authorization model — Phase 4.x sub_03f_5 F4 pattern reused, plus the
// briefing_documents column-grant lockdown landed in Wave A sub_4 F3:
//   1. createSupabaseServer (user-scoped)
//   2. resolveActiveWorkspace for active workspace id
//   3. explicit project ownership + workspace-membership re-verify before
//      any write, even though RLS already gates row scope
//   4. status='draft' guard on every Step 2 write (no metadata changes
//      after the project transitions to in_review)
//   5. storage_key prefix bound to auth.uid() in the presign AND re-validated
//      on INSERT (sub_03f_5 F2 pattern)
//   6. UPDATE only writes (note, category) per Wave A sub_4 F3 column grant —
//      anything else fails at the privilege layer regardless of payload
// =============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import {
  createBriefAssetPutUrl,
  briefObjectPublicUrl,
} from "@/lib/r2/client";

// ---------------------------------------------------------------------------
// Shared constants + helpers
// ---------------------------------------------------------------------------

const ALLOWED_UPLOAD_CONTENT_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "pptx",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const URL_MAX_LEN = 2000;
const KIND_VALUES = ["brief", "reference"] as const;
const CATEGORY_VALUES = ["mood", "composition", "pacing", "general"] as const;

/**
 * Verifies the caller is a current workspace_member of the project's
 * workspace AND that the project is still in 'draft' state. Defense-
 * in-depth — RLS policies on briefing_documents + projects already
 * gate row scope, but every Step 2 write re-runs this check at the
 * action layer so a status transition or workspace removal between
 * SELECT and INSERT/UPDATE doesn't slip through.
 */
async function assertProjectMutationAuth(projectId: string): Promise<
  | {
      ok: true;
      userId: string;
      workspaceId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
      sb: any;
    }
  | {
      ok: false;
      error:
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden";
      message?: string;
    }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) return { ok: false, error: "unauthenticated" };

  const active = await resolveActiveWorkspace(user.id);
  if (!active) return { ok: false, error: "no_workspace" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: project, error: selErr } = await sb
    .from("projects")
    .select("id, workspace_id, status, created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (selErr) {
    console.error("[assertProjectMutationAuth] SELECT error:", selErr);
    return { ok: false, error: "forbidden", message: selErr.message };
  }
  if (!project) return { ok: false, error: "not_found" };
  if (project.workspace_id !== active.id) {
    return { ok: false, error: "forbidden", message: "workspace mismatch" };
  }
  if (project.status !== "draft") {
    return {
      ok: false,
      error: "forbidden",
      message: "project is no longer draft",
    };
  }

  const { data: member } = await sb
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", project.workspace_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return { ok: false, error: "forbidden", message: "not a workspace member" };
  }

  return { ok: true, userId: user.id, workspaceId: project.workspace_id, sb };
}

// ===========================================================================
// 1. getBriefingDocumentPutUrlAction
// ===========================================================================

const getPutUrlInput = z.object({
  projectId: z.string().uuid(),
  kind: z.enum(KIND_VALUES),
  contentType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

export type GetPutUrlResult =
  | { ok: true; putUrl: string; storageKey: string; publicUrl: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "content_type_not_allowed"
        | "presign_failed";
      message?: string;
    };

export async function getBriefingDocumentPutUrlAction(
  input: unknown,
): Promise<GetPutUrlResult> {
  const parsed = getPutUrlInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  if (!ALLOWED_UPLOAD_CONTENT_TYPES.has(parsed.data.contentType)) {
    return { ok: false, error: "content_type_not_allowed" };
  }
  const auth = await assertProjectMutationAuth(parsed.data.projectId);
  if (!auth.ok) return auth;

  const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
  const uuid = crypto.randomUUID();
  // sub_03f_5 F2 pattern reused — caller-bound prefix + kind segment.
  const storageKey = `briefing-docs/${auth.userId}/${parsed.data.kind}/${uuid}.${ext}`;

  try {
    const putUrl = await createBriefAssetPutUrl(
      storageKey,
      parsed.data.contentType,
      600,
    );
    return {
      ok: true,
      putUrl,
      storageKey,
      publicUrl: briefObjectPublicUrl(storageKey),
    };
  } catch (err) {
    console.error("[getBriefingDocumentPutUrlAction] presign failed:", err);
    return { ok: false, error: "presign_failed" };
  }
}

// ===========================================================================
// 2. addBriefingDocumentAction
// ===========================================================================

const addInput = z.discriminatedUnion("source_type", [
  z.object({
    projectId: z.string().uuid(),
    kind: z.enum(KIND_VALUES),
    source_type: z.literal("upload"),
    storage_key: z.string().min(1).max(500),
    filename: z.string().trim().min(1).max(200),
    size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
    mime_type: z.string().min(1).max(200),
    note: z.string().trim().max(500).optional().nullable(),
    category: z.enum(CATEGORY_VALUES).optional().nullable(),
  }),
  z.object({
    projectId: z.string().uuid(),
    kind: z.enum(KIND_VALUES),
    source_type: z.literal("url"),
    url: z
      .string()
      .min(1)
      .max(URL_MAX_LEN)
      .refine(
        (u) => {
          try {
            const p = new URL(u);
            return p.protocol === "http:" || p.protocol === "https:";
          } catch {
            return false;
          }
        },
        { message: "url must be http:// or https://" },
      ),
    provider: z
      .enum(["youtube", "vimeo", "instagram", "generic"])
      .optional()
      .nullable(),
    thumbnail_url: z.string().max(URL_MAX_LEN).optional().nullable(),
    oembed_html: z.string().max(20_000).optional().nullable(),
    note: z.string().trim().max(500).optional().nullable(),
    category: z.enum(CATEGORY_VALUES).optional().nullable(),
  }),
]);

export type AddBriefingDocumentResult =
  | {
      ok: true;
      document: {
        id: string;
        kind: "brief" | "reference";
        source_type: "upload" | "url";
        storage_key: string | null;
        filename: string | null;
        size_bytes: number | null;
        mime_type: string | null;
        url: string | null;
        provider: string | null;
        thumbnail_url: string | null;
        oembed_html: string | null;
        note: string | null;
        category: string | null;
        created_at: string;
        created_by: string;
      };
    }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function addBriefingDocumentAction(
  input: unknown,
): Promise<AddBriefingDocumentResult> {
  const parsed = addInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;
  const auth = await assertProjectMutationAuth(data.projectId);
  if (!auth.ok) return auth;

  // sub_03f_5 F2 — re-validate caller-bound prefix on the storage_key.
  if (data.source_type === "upload") {
    const requiredPrefix = `briefing-docs/${auth.userId}/${data.kind}/`;
    if (!data.storage_key.startsWith(requiredPrefix)) {
      return {
        ok: false,
        error: "forbidden",
        message: `storage_key prefix must be ${requiredPrefix}`,
      };
    }
    if (data.storage_key.includes("..") || data.storage_key.startsWith("/")) {
      return {
        ok: false,
        error: "forbidden",
        message: "storage_key contains forbidden characters",
      };
    }
  }

  // Reference-only category. KICKOFF v1.3 §task_05 says category is
  // meaningful only for kind='reference'; reject mismatched payloads
  // explicitly so the UI doesn't silently swallow.
  if (data.kind === "brief" && data.category) {
    return {
      ok: false,
      error: "validation",
      message: "category is meaningful only for kind='reference'",
    };
  }

  const insertPayload =
    data.source_type === "upload"
      ? {
          project_id: data.projectId,
          kind: data.kind,
          source_type: "upload",
          storage_key: data.storage_key,
          filename: data.filename,
          size_bytes: data.size_bytes,
          mime_type: data.mime_type,
          note: data.note ?? null,
          category: data.category ?? null,
          created_by: auth.userId,
        }
      : {
          project_id: data.projectId,
          kind: data.kind,
          source_type: "url",
          url: data.url,
          provider: data.provider ?? "generic",
          thumbnail_url: data.thumbnail_url ?? null,
          oembed_html: data.oembed_html ?? null,
          note: data.note ?? null,
          category:
            data.kind === "reference"
              ? (data.category ?? "general")
              : null,
          created_by: auth.userId,
        };

  const { data: inserted, error: insErr } = await auth.sb
    .from("briefing_documents")
    .insert(insertPayload)
    .select(
      "id, kind, source_type, storage_key, filename, size_bytes, mime_type, url, provider, thumbnail_url, oembed_html, note, category, created_at, created_by",
    )
    .single();
  if (insErr || !inserted) {
    console.error("[addBriefingDocumentAction] INSERT error:", insErr);
    return {
      ok: false,
      error: "db",
      message: insErr?.message ?? "insert failed",
    };
  }

  revalidatePath("/[locale]/app/projects/new", "page");
  return { ok: true, document: inserted };
}

// ===========================================================================
// 3. removeBriefingDocumentAction
// ===========================================================================

const removeInput = z.object({
  documentId: z.string().uuid(),
});

export type RemoveBriefingDocumentResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function removeBriefingDocumentAction(
  input: unknown,
): Promise<RemoveBriefingDocumentResult> {
  const parsed = removeInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: doc } = await sb
    .from("briefing_documents")
    .select("id, project_id, created_by")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "not_found" };
  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };

  // RLS DELETE policy gates created_by + workspace member + status='draft'.
  // The redundant eq filter on created_by is defense-in-depth.
  const { error: delErr } = await sb
    .from("briefing_documents")
    .delete()
    .eq("id", parsed.data.documentId)
    .eq("created_by", user.id);
  if (delErr) {
    return { ok: false, error: "db", message: delErr.message };
  }

  revalidatePath("/[locale]/app/projects/new", "page");
  return { ok: true };
}

// ===========================================================================
// 4. updateBriefingDocumentNoteAction (note + category only)
// ===========================================================================

const updateNoteInput = z.object({
  documentId: z.string().uuid(),
  note: z.string().trim().max(500).optional().nullable(),
  category: z.enum(CATEGORY_VALUES).optional().nullable(),
});

export type UpdateBriefingNoteResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function updateBriefingDocumentNoteAction(
  input: unknown,
): Promise<UpdateBriefingNoteResult> {
  const parsed = updateNoteInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 5 columns not in generated types
  const sb = supabase as any;

  const { data: doc } = await sb
    .from("briefing_documents")
    .select("id, kind, created_by")
    .eq("id", parsed.data.documentId)
    .maybeSingle();
  if (!doc) return { ok: false, error: "not_found" };
  if (doc.created_by !== user.id) return { ok: false, error: "forbidden" };

  if (doc.kind === "brief" && parsed.data.category != null) {
    return {
      ok: false,
      error: "validation",
      message: "category is meaningful only for kind='reference'",
    };
  }

  // sub_4 F3 column-grant lockdown means PostgREST UPDATE here can only
  // touch (note, category). We construct a minimal payload to stay
  // defensive in the action layer too.
  const payload: { note?: string | null; category?: string | null } = {};
  if (parsed.data.note !== undefined) payload.note = parsed.data.note;
  if (parsed.data.category !== undefined)
    payload.category = parsed.data.category;
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "validation", message: "no field to update" };
  }

  const { error: updErr } = await sb
    .from("briefing_documents")
    .update(payload)
    .eq("id", parsed.data.documentId)
    .eq("created_by", user.id);
  if (updErr) {
    return { ok: false, error: "db", message: updErr.message };
  }

  revalidatePath("/[locale]/app/projects/new", "page");
  return { ok: true };
}

// ===========================================================================
// 5. updateProjectMetadataAction — Step 2 sidebar autosave
// ===========================================================================

const metadataInput = z.object({
  projectId: z.string().uuid(),
  // 12 sidebar fields per yagi-locked Schema Option A. All optional —
  // every field can stay blank through submit. undefined = "don't
  // change", null = "clear to NULL".
  mood_keywords: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  mood_keywords_free: z.string().trim().max(200).optional().nullable(),
  visual_ratio: z.string().trim().max(60).optional().nullable(),
  visual_ratio_custom: z.string().trim().max(60).optional().nullable(),
  channels: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  has_plan: z
    .enum(["have", "want_proposal", "undecided"])
    .optional()
    .nullable(),
  target_audience: z.string().trim().max(500).optional().nullable(),
  additional_notes: z.string().trim().max(2000).optional().nullable(),
  budget_band: z
    .enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"])
    .optional()
    .nullable(),
  target_delivery_at: z.string().nullable().optional(),
  meeting_preferred_at: z.string().datetime().nullable().optional(),
  interested_in_twin: z.boolean().optional(),
});

export type UpdateProjectMetadataResult =
  | { ok: true; savedAt: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_workspace"
        | "not_found"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function updateProjectMetadataAction(
  input: unknown,
): Promise<UpdateProjectMetadataResult> {
  const parsed = metadataInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const auth = await assertProjectMutationAuth(parsed.data.projectId);
  if (!auth.ok) return auth;

  const payload: Record<string, unknown> = {};
  const fields = [
    "mood_keywords",
    "mood_keywords_free",
    "visual_ratio",
    "visual_ratio_custom",
    "channels",
    "has_plan",
    "target_audience",
    "additional_notes",
    "budget_band",
    "target_delivery_at",
    "meeting_preferred_at",
    "interested_in_twin",
  ] as const;
  for (const f of fields) {
    const v = parsed.data[f];
    if (v !== undefined) payload[f] = v;
  }
  if (Object.keys(payload).length === 0) {
    return { ok: false, error: "validation", message: "no field to update" };
  }

  const { error: updErr } = await auth.sb
    .from("projects")
    .update(payload)
    .eq("id", parsed.data.projectId)
    .eq("status", "draft");
  if (updErr) {
    console.error("[updateProjectMetadataAction] UPDATE error:", updErr);
    return { ok: false, error: "db", message: updErr.message };
  }

  // No revalidatePath on autosave — the user is mid-edit and a
  // server-component refresh would visually thrash. Revalidation runs
  // on Step 2 → Step 3 transition.
  return { ok: true, savedAt: new Date().toISOString() };
}
