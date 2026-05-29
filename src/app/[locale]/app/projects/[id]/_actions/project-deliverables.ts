"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  briefObjectPublicUrl,
  createBriefAssetPutUrl,
} from "@/lib/r2/client";

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
  const { data: latestRow, error: latestError } = await sb
    .from("project_deliverables")
    .select("version")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    console.error("[createProjectDeliverableVersionAction] max version error:", latestError);
    return { ok: false, error: "db", message: latestError.message };
  }

  const nextVersion = ((latestRow?.version as number | undefined) ?? 0) + 1;
  const { data: inserted, error: insertError } = await sb
    .from("project_deliverables")
    .insert({
      project_id: projectId,
      version: nextVersion,
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
    .select("id, project_id, project:projects!inner(id, workspace_id)")
    .eq("id", deliverableId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (lookupError) {
    console.error("[reviewProjectDeliverableAction] lookup error:", lookupError);
    return { ok: false, error: "db", message: lookupError.message };
  }
  if (!deliverable) return { ok: false, error: "not_found" };

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
