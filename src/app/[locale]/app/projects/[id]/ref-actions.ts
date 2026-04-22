"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { unfurlVideoUrl } from "@/lib/og-video-unfurl";
import { unfurl } from "@/lib/og-unfurl";

const mediaTypeSchema = z.enum(["image", "video", "pdf"]);
const embedProviderSchema = z.enum(["youtube", "vimeo", "tiktok", "instagram"]);

const addSchema = z
  .object({
    projectId: z.string().uuid(),
    storage_path: z.string().optional().nullable(),
    external_url: z.string().url().optional().nullable(),
    og_title: z.string().optional().nullable(),
    og_description: z.string().optional().nullable(),
    og_image_url: z.string().url().optional().nullable(),
    media_type: mediaTypeSchema.optional(),
    duration_seconds: z.number().finite().nonnegative().optional().nullable(),
    thumbnail_path: z.string().optional().nullable(),
    embed_provider: embedProviderSchema.optional().nullable(),
    page_count: z.number().int().nonnegative().optional().nullable(),
  })
  .refine((d) => !!d.storage_path || !!d.external_url, {
    message: "Either storage_path or external_url is required",
  });

/**
 * Ensures a supplied storage path is scoped to the given project.
 * Prevents a client from passing `otherProjectId/file.jpg`.
 */
function pathBelongsToProject(
  path: string | null | undefined,
  projectId: string
): boolean {
  if (!path) return true;
  return path.startsWith(`${projectId}/`);
}

export async function addReference(input: unknown) {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" as const };

  const d = parsed.data;

  // Path-safety guard: uploaded paths must live under {projectId}/...
  if (!pathBelongsToProject(d.storage_path, d.projectId)) {
    return { error: "validation" as const };
  }
  if (!pathBelongsToProject(d.thumbnail_path, d.projectId)) {
    return { error: "validation" as const };
  }

  // Derive a sensible media_type default if caller didn't supply one.
  let mediaType: "image" | "video" | "pdf";
  if (d.media_type) {
    mediaType = d.media_type;
  } else if (d.embed_provider) {
    mediaType = "video";
  } else if (d.storage_path) {
    mediaType = "image";
  } else {
    mediaType = "image";
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  const { error } = await supabase.from("project_references").insert({
    project_id: d.projectId,
    added_by: user.id,
    storage_path: d.storage_path ?? null,
    external_url: d.external_url ?? null,
    og_title: d.og_title ?? null,
    og_description: d.og_description ?? null,
    og_image_url: d.og_image_url ?? null,
    media_type: mediaType,
    duration_seconds: d.duration_seconds ?? null,
    thumbnail_path: d.thumbnail_path ?? null,
    embed_provider: d.embed_provider ?? null,
    page_count: d.page_count ?? null,
  });

  if (error) return { error: "db" as const, message: error.message };

  revalidatePath(`/[locale]/app/projects/${d.projectId}`, "page");
  return { ok: true as const };
}

const fromUrlSchema = z.object({
  projectId: z.string().uuid(),
  url: z.string().url(),
});

/**
 * Adds a reference from a pasted URL.
 * Tries the video-platform oEmbed resolver first; on null, falls back
 * to the generic OG unfurl used by the Phase 1.2 image-URL flow.
 *
 * RLS on project_references enforces membership — no extra check here.
 */
export async function addReferenceFromUrl(input: {
  projectId: string;
  url: string;
}): Promise<{ ok: true } | { error: string }> {
  const parsed = fromUrlSchema.safeParse(input);
  if (!parsed.success) return { error: "validation" };

  const { projectId, url } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const video = await unfurlVideoUrl(url);

  if (video) {
    const { error } = await supabase.from("project_references").insert({
      project_id: projectId,
      added_by: user.id,
      external_url: video.canonical_url,
      og_title: video.title,
      og_image_url: video.thumbnail_url,
      media_type: "video",
      embed_provider: video.provider,
      duration_seconds: video.duration_seconds,
    });

    if (error) return { error: "db" };
    revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
    return { ok: true };
  }

  // Fall back to generic OG unfurl (never throws).
  const og = await unfurl(url);

  const { error } = await supabase.from("project_references").insert({
    project_id: projectId,
    added_by: user.id,
    external_url: url,
    og_title: og.og_title ?? null,
    og_description: og.og_description ?? null,
    og_image_url: og.og_image_url ?? null,
    media_type: "image",
    embed_provider: null,
  });

  if (error) return { error: "db" };
  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  return { ok: true };
}

export async function removeReference(formData: FormData) {
  const referenceId = formData.get("referenceId");
  if (typeof referenceId !== "string") return { error: "validation" as const };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" as const };

  // Fetch the ref to know which project to revalidate + get storage_path
  const { data: ref } = await supabase
    .from("project_references")
    .select("project_id, storage_path, thumbnail_path")
    .eq("id", referenceId)
    .maybeSingle();

  if (!ref) return { error: "not_found" as const };

  // Delete the storage objects if any
  const toRemove: string[] = [];
  if (ref.storage_path) toRemove.push(ref.storage_path);
  if (ref.thumbnail_path) toRemove.push(ref.thumbnail_path);
  if (toRemove.length > 0) {
    await supabase.storage.from("project-references").remove(toRemove);
  }

  const { error } = await supabase
    .from("project_references")
    .delete()
    .eq("id", referenceId);

  if (error) return { error: "db" as const, message: error.message };

  revalidatePath(`/[locale]/app/projects/${ref.project_id}`, "page");
  return { ok: true as const };
}
