"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import {
  briefObjectPublicUrl,
  createBriefAssetPutUrl,
} from "@/lib/r2/client";
import {
  copyFromUrl,
  getVideo,
  streamConfigured,
} from "@/lib/stream/client";

const ALLOWED_DELIVERABLE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
]);

const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
  "application/pdf": "pdf",
};

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function detectStorageKind(key: string): "image" | "video" | "file" {
  const ext = key.split(".").pop()?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext)) {
    return "image";
  }
  if (ext && ["mp4", "mov", "webm"].includes(ext)) {
    return "video";
  }
  return "file";
}

async function canUploadProjectDeliverable(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  projectId: string,
  userId: string,
) {
  const [{ data: isAdmin }, { data: isGuest }] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid: userId }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
    (supabase as any).rpc("is_project_guest", {
      p_project_id: projectId,
      p_user_id: userId,
    }),
  ]);

  return isAdmin === true || isGuest === true;
}

const uploadPutUrlSchema = z.object({
  projectId: z.string().uuid(),
  fileName: z.string().min(1).max(240),
  contentType: z.string().min(1).max(200),
});

export type DeliverableUploadPutUrlResult =
  | {
      ok: true;
      putUrl: string;
      storageKey: string;
      publicUrl: string;
    }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "content_type_not_allowed"
        | "presign_failed";
      message?: string;
    };

export async function getDeliverableUploadPutUrlAction(
  input: unknown,
): Promise<DeliverableUploadPutUrlResult> {
  const parsed = uploadPutUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { projectId, contentType } = parsed.data;
  if (!ALLOWED_DELIVERABLE_CONTENT_TYPES.has(contentType)) {
    return { ok: false, error: "content_type_not_allowed" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  if (!(await canUploadProjectDeliverable(supabase, projectId, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const ext = EXT_FOR_CONTENT_TYPE[contentType] ?? "bin";
  const storageKey = `project-deliverables/${projectId}/${user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const putUrl = await createBriefAssetPutUrl(storageKey, contentType, 3600);
    return {
      ok: true,
      putUrl,
      storageKey,
      publicUrl: briefObjectPublicUrl(storageKey),
    };
  } catch (err) {
    console.error("[getDeliverableUploadPutUrlAction] presign failed:", err);
    return { ok: false, error: "presign_failed" };
  }
}

const createVersionSchema = z
  .object({
    projectId: z.string().uuid(),
    storagePaths: z.array(z.string().min(1).max(500)).max(8).default([]),
    externalUrls: z
      .array(z.string().min(1).max(2000).refine(isHttpUrl))
      .max(8)
      .default([]),
    note: z.string().max(2000).optional(),
  })
  .refine(
    (value) => value.storagePaths.length > 0 || value.externalUrls.length > 0,
    { message: "deliverable asset required" },
  );

export type CreateProjectDeliverableVersionResult =
  | { ok: true; deliverableId: string; version: number }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "storage_key_not_owned"
        | "version_failed"
        | "db";
      message?: string;
    };

export async function createProjectDeliverableVersionAction(
  input: unknown,
): Promise<CreateProjectDeliverableVersionResult> {
  const parsed = createVersionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { projectId, storagePaths, externalUrls, note } = parsed.data;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  if (!(await canUploadProjectDeliverable(supabase, projectId, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const ownedStoragePrefix = `project-deliverables/${projectId}/${user.id}/`;
  if (storagePaths.some((path) => !path.startsWith(ownedStoragePrefix))) {
    return { ok: false, error: "storage_key_not_owned" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag schema
  const sb = supabase as any;
  const { data: nextVersionRaw, error: versionError } = await sb.rpc(
    "next_deliverable_version",
    { p_project_id: projectId },
  );

  if (versionError || typeof nextVersionRaw !== "number") {
    console.error(
      "[createProjectDeliverableVersionAction] next version RPC error:",
      versionError,
    );
    return {
      ok: false,
      error: "version_failed",
      message: versionError?.message,
    };
  }

  const { data: inserted, error: insertError } = await sb
    .from("project_deliverables")
    .insert({
      project_id: projectId,
      version: nextVersionRaw,
      submitted_by: user.id,
      storage_paths: storagePaths,
      external_urls: externalUrls,
      note: note?.trim() || null,
      status: "submitted",
    })
    .select("id, version")
    .single();

  if (insertError || !inserted) {
    console.error("[createProjectDeliverableVersionAction] insert error:", insertError);
    return { ok: false, error: "db", message: insertError?.message };
  }

  // R4/R5 deliverables store one Stream UID per version, so the first uploaded
  // video is the canonical Stream source and the R2 original remains the fallback.
  const firstVideoPath = storagePaths.find((path) => detectStorageKind(path) === "video");
  if (firstVideoPath && streamConfigured()) {
    // Cloudflare Stream /copy fetches this URL server-side; the deliverable R2
    // public URL is the agreed ingest contract for this integration.
    const streamCopy = await copyFromUrl(
      briefObjectPublicUrl(firstVideoPath),
      firstVideoPath.split("/").at(-1),
    );
    if (streamCopy) {
      const { error: streamUpdateError } = await sb
        .from("project_deliverables")
        .update({
          stream_uid: streamCopy.uid,
          stream_status: "pending",
          stream_ready_at: null,
        })
        .eq("id", inserted.id)
        .eq("project_id", projectId);

      if (streamUpdateError) {
        console.error(
          "[createProjectDeliverableVersionAction] stream metadata update error:",
          streamUpdateError,
        );
      }
    }
  }

  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  return {
    ok: true,
    deliverableId: inserted.id as string,
    version: inserted.version as number,
  };
}

const reviewDeliverableSchema = z.object({
  projectId: z.string().uuid(),
  deliverableId: z.string().uuid(),
  status: z.enum(["approved", "changes_requested"]),
  reviewNote: z.string().trim().min(1).max(2000),
});

export type ReviewProjectDeliverableResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "not_found" | "db";
      message?: string;
    };

export async function reviewProjectDeliverableAction(
  input: unknown,
): Promise<ReviewProjectDeliverableResult> {
  const parsed = reviewDeliverableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { projectId, deliverableId, status, reviewNote } = parsed.data;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag project_deliverables review columns in action updates
  const sb = supabase as any;
  const { data: deliverable, error: lookupError } = await sb
    .from("project_deliverables")
    .select("id, project_id, released_at, project:projects!inner(id, workspace_id)")
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) {
    console.error("[reviewProjectDeliverableAction] lookup error:", lookupError);
    return { ok: false, error: "db", message: lookupError.message };
  }
  if (!deliverable) return { ok: false, error: "not_found" };
  if (!deliverable.released_at) return { ok: false, error: "forbidden" };

  const project = Array.isArray(deliverable.project)
    ? deliverable.project[0]
    : deliverable.project;
  const workspaceId = project?.workspace_id as string | undefined;
  if (!workspaceId) return { ok: false, error: "not_found" };

  const [{ data: isAdmin }, { data: isMember }] = await Promise.all([
    supabase.rpc("is_yagi_admin", { uid: user.id }),
    supabase.rpc("is_ws_member", { uid: user.id, wsid: workspaceId }),
  ]);

  if (isAdmin !== true && isMember !== true) {
    return { ok: false, error: "forbidden" };
  }

  const { error: updateError } = await sb
    .from("project_deliverables")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", deliverableId)
    .eq("project_id", projectId);

  if (updateError) {
    console.error("[reviewProjectDeliverableAction] update error:", updateError);
    return { ok: false, error: "db", message: updateError.message };
  }

  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  return { ok: true };
}

const releaseDeliverableSchema = z.object({
  projectId: z.string().uuid(),
  deliverableId: z.string().uuid(),
  extendScope: z.boolean().optional().default(false),
});

const markDeliverableSeenSchema = z.object({
  deliverableId: z.string().uuid(),
});

const refreshDeliverableStreamStatusSchema = z.object({
  deliverableId: z.string().uuid(),
});

const STREAM_STATUS_REFRESH_CACHE_MS = 5_000;
const streamStatusRefreshCache = new Map<
  string,
  {
    checkedAt: number;
    streamStatus: "pending" | "ready" | "error" | null;
    streamReadyAt: string | null;
  }
>();

export type RefreshDeliverableStreamStatusResult =
  | {
      ok: true;
      streamStatus: "pending" | "ready" | "error" | null;
      streamReadyAt?: string | null;
    }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "not_found" | "db";
      message?: string;
    };

export async function refreshDeliverableStreamStatus(
  input: unknown,
): Promise<RefreshDeliverableStreamStatusResult> {
  const parsed = refreshDeliverableStreamStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream columns are applied; generated types lag
  const sb = supabase as any;
  const { data: deliverable, error: lookupError } = await sb
    .from("project_deliverables")
    .select("id, project_id, stream_uid, stream_status, stream_ready_at")
    .eq("id", parsed.data.deliverableId)
    .maybeSingle();

  if (lookupError) {
    console.error("[refreshDeliverableStreamStatus] lookup error:", lookupError);
    return { ok: false, error: "db", message: lookupError.message };
  }
  if (!deliverable) return { ok: false, error: "not_found" };

  const currentStatus =
    deliverable.stream_status === "pending" ||
    deliverable.stream_status === "ready" ||
    deliverable.stream_status === "error"
      ? deliverable.stream_status
      : null;
  const streamUid = typeof deliverable.stream_uid === "string"
    ? deliverable.stream_uid
    : null;
  if (!streamUid || !streamConfigured()) {
    return {
      ok: true,
      streamStatus: currentStatus,
      streamReadyAt: deliverable.stream_ready_at ?? null,
    };
  }

  const cached = streamStatusRefreshCache.get(streamUid);
  if (cached && Date.now() - cached.checkedAt < STREAM_STATUS_REFRESH_CACHE_MS) {
    return {
      ok: true,
      streamStatus: cached.streamStatus,
      streamReadyAt: cached.streamReadyAt,
    };
  }

  const video = await getVideo(streamUid);
  if (video == null) {
    return {
      ok: true,
      streamStatus: currentStatus,
      streamReadyAt: deliverable.stream_ready_at ?? null,
    };
  }

  const nextStatus = video.readyToStream
    ? "ready"
    : video.status === "error"
      ? "error"
      : "pending";
  const streamReadyAt = nextStatus === "ready"
    ? (deliverable.stream_ready_at ?? new Date().toISOString())
    : (deliverable.stream_ready_at ?? null);

  // Visibility is checked through the user's RLS-bound select above. The
  // status write is system-owned metadata so non-admin viewers can refresh it
  // without requiring broad project_deliverables UPDATE grants.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Stream columns are applied; generated types lag
  const service = createSupabaseService() as any;
  const { error: updateError } = await service
    .from("project_deliverables")
    .update({
      stream_status: nextStatus,
      stream_ready_at: streamReadyAt,
    })
    .eq("id", deliverable.id)
    .eq("project_id", deliverable.project_id);

  if (updateError) {
    console.error("[refreshDeliverableStreamStatus] update error:", updateError);
    return { ok: false, error: "db", message: updateError.message };
  }

  revalidatePath(`/[locale]/app/projects/${deliverable.project_id}`, "page");
  revalidatePath(`/[locale]/app/admin/projects/${deliverable.project_id}`, "page");
  streamStatusRefreshCache.set(streamUid, {
    checkedAt: Date.now(),
    streamStatus: nextStatus,
    streamReadyAt,
  });
  return {
    ok: true,
    streamStatus: nextStatus,
    streamReadyAt,
  };
}

export type MarkDeliverableSeenResult =
  | { ok: true }
  | { ok: false; error: "validation" | "unauthenticated" | "db" };

export async function markDeliverableSeenAction(
  input: unknown,
): Promise<MarkDeliverableSeenResult> {
  const parsed = markDeliverableSeenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  try {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "unauthenticated" };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- R5 table is applied in prod; generated types lag
    const sb = supabase as any;
    const { error } = await sb.from("deliverable_views").upsert(
      {
        deliverable_id: parsed.data.deliverableId,
        viewer_id: user.id,
      },
      {
        onConflict: "deliverable_id,viewer_id",
        ignoreDuplicates: true,
      },
    );

    if (error) {
      console.error("[markDeliverableSeenAction] upsert error:", error);
      return { ok: false, error: "db" };
    }

    return { ok: true };
  } catch (error) {
    console.error("[markDeliverableSeenAction] unexpected error:", error);
    return { ok: false, error: "db" };
  }
}

export type ReleaseDeliverableToClientResult =
  | { ok: true; releasedAt: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "not_found"
        | "round_limit"
        | "db";
      revisionsUsed?: number;
      revisionsLimit?: number;
      message?: string;
    };

export async function releaseDeliverableToClientAction(
  input: unknown,
): Promise<ReleaseDeliverableToClientResult> {
  const parsed = releaseDeliverableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { projectId, deliverableId, extendScope } = parsed.data;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (isYagiAdmin !== true) return { ok: false, error: "forbidden" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag released_at
  const sb = supabase as any;
  const { data: existing, error: lookupError } = await sb
    .from("project_deliverables")
    .select("id, project_id, released_at")
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) {
    console.error("[releaseDeliverableToClientAction] lookup error:", lookupError);
    return { ok: false, error: "db", message: lookupError.message };
  }
  if (!existing) return { ok: false, error: "not_found" };
  if (existing.released_at) {
    return { ok: true, releasedAt: existing.released_at as string };
  }

  const { count: releasedCountRaw, error: countError } = await sb
    .from("project_deliverables")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .not("released_at", "is", null);

  if (countError) {
    console.error("[releaseDeliverableToClientAction] count error:", countError);
    return { ok: false, error: "db", message: countError.message };
  }

  const { data: projectScope, error: scopeError } = await sb
    .from("projects")
    .select("revision_rounds_limit")
    .eq("id", projectId)
    .maybeSingle();

  if (scopeError) {
    console.error("[releaseDeliverableToClientAction] scope lookup error:", scopeError);
    return { ok: false, error: "db", message: scopeError.message };
  }
  if (!projectScope) return { ok: false, error: "not_found" };

  const releasedCount = releasedCountRaw ?? 0;
  const revisionRoundsLimit =
    typeof projectScope.revision_rounds_limit === "number"
      ? projectScope.revision_rounds_limit
      : 2;
  const allowedReleaseCount = 1 + revisionRoundsLimit;

  if (releasedCount >= allowedReleaseCount) {
    if (!extendScope) {
      return {
        ok: false,
        error: "round_limit",
        revisionsUsed: Math.max(0, releasedCount - 1),
        revisionsLimit: revisionRoundsLimit,
      };
    }

    const { error: extendError } = await sb.rpc(
      "set_project_revision_rounds_limit",
      {
        p_project_id: projectId,
        // Model B override: add exactly one included revision so this release
        // is admitted and any later over-scope release prompts again.
        p_limit: releasedCount,
      },
    );

    if (extendError) {
      console.error("[releaseDeliverableToClientAction] extend scope error:", extendError);
      return {
        ok: false,
        error: extendError.code === "42501" ? "forbidden" : "db",
        message: extendError.message,
      };
    }
  }

  // R4 intentionally leaves the count -> guarded update window unlocked under
  // the current trusted single-admin release model. If release moves to
  // concurrent admins or external automation, migrate count+scope+release into
  // one transactional RPC with row locking.
  const releasedAt = new Date().toISOString();
  const { data: updated, error: updateError } = await sb
    .from("project_deliverables")
    .update({ released_at: releasedAt })
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .is("released_at", null)
    .select("released_at")
    .maybeSingle();

  if (updateError) {
    console.error("[releaseDeliverableToClientAction] update error:", updateError);
    return { ok: false, error: "db", message: updateError.message };
  }

  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  revalidatePath(`/[locale]/app/admin/projects/${projectId}`, "page");
  return {
    ok: true,
    releasedAt: (updated?.released_at as string | undefined) ?? releasedAt,
  };
}

const setRevisionRoundsLimitSchema = z.object({
  projectId: z.string().uuid(),
  limit: z.number().int().min(0).max(50),
});

export type SetProjectRevisionRoundsLimitResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "unauthenticated" | "forbidden" | "db";
      message?: string;
    };

export async function setProjectRevisionRoundsLimitAction(
  input: unknown,
): Promise<SetProjectRevisionRoundsLimitResult> {
  const parsed = setRevisionRoundsLimitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { projectId, limit } = parsed.data;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (isYagiAdmin !== true) return { ok: false, error: "forbidden" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC added in R4, generated types lag
  const sb = supabase as any;
  const { error } = await sb.rpc("set_project_revision_rounds_limit", {
    p_project_id: projectId,
    p_limit: limit,
  });

  if (error) {
    console.error("[setProjectRevisionRoundsLimitAction] rpc error:", error);
    return {
      ok: false,
      error: error.code === "42501" ? "forbidden" : "db",
      message: error.message,
    };
  }

  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  revalidatePath(`/[locale]/app/admin/projects/${projectId}`, "page");
  return { ok: true };
}

export async function revertDeliverablePublicReviewAction(
  input: unknown,
): Promise<ReviewProjectDeliverableResult> {
  const parsed = releaseDeliverableSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }

  const { projectId, deliverableId } = parsed.data;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (isYagiAdmin !== true) return { ok: false, error: "forbidden" };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types lag released_at/review columns
  const sb = supabase as any;
  const { error } = await sb
    .from("project_deliverables")
    .update({
      status: "submitted",
      reviewed_by: null,
      reviewed_at: null,
      review_note: null,
    })
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .not("released_at", "is", null);

  if (error) {
    console.error("[revertDeliverablePublicReviewAction] update error:", error);
    return { ok: false, error: "db", message: error.message };
  }

  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  return { ok: true };
}
