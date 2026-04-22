"use server";

/**
 * Phase 1.9 Wave A Subtask 02 — Showcase Mode Server Actions.
 *
 * All mutations for showcases + showcase_media. Yagi admin (and in a few
 * narrow cases workspace admin) only. Patterns mirror Phase 1.4 actions
 * (Zod + user-scoped client + {ok}|{error}) and Phase 1.7 attachments
 * (service-role signed upload URLs).
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import slugify from "slugify";
import bcrypt from "bcryptjs";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

// ─── shared types ─────────────────────────────────────────────────────────────

type Result = { ok: true } | { ok: false; error: string };

type SbUser = { id: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_RE = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

const EMBED_ALLOWLIST = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
  "tiktok.com",
  "www.tiktok.com",
  "instagram.com",
  "www.instagram.com",
] as const;

function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "https://studio.yagiworkshop.xyz"
  );
}

function revalidateShowcase(showcaseId: string, slug?: string | null) {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/showcases`);
    revalidatePath(`/${locale}/app/showcases/${showcaseId}`);
  }
  if (slug) revalidatePath(`/showcase/${slug}`);
}

async function getCurrentUser(): Promise<SbUser | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

async function isYagiAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
  return Boolean(data);
}

async function isWsAdminOfShowcase(
  supabase: SupabaseClient<Database>,
  userId: string,
  showcaseId: string,
): Promise<boolean> {
  const svc = createSupabaseService();
  const { data: showcase } = await svc
    .from("showcases")
    .select("project_id")
    .eq("id", showcaseId)
    .maybeSingle();
  if (!showcase) return false;

  const { data: project } = await svc
    .from("projects")
    .select("workspace_id")
    .eq("id", showcase.project_id)
    .maybeSingle();
  if (!project) return false;

  const { data } = await supabase.rpc("is_ws_admin", {
    uid: userId,
    wsid: project.workspace_id,
  });
  return Boolean(data);
}

function isAllowedEmbedUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    return EMBED_ALLOWLIST.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

function baseSlugFromTitle(title: string, idFallback: string): string {
  const raw = slugify(title, { lower: true, strict: true, trim: true });
  if (raw && SLUG_RE.test(raw)) return raw;
  // Korean / non-latin titles commonly collapse to empty under `strict`.
  return `showcase-${idFallback.slice(0, 8)}`;
}

async function findAvailableSlug(
  svc: SupabaseClient<Database>,
  base: string,
  excludeShowcaseId?: string,
): Promise<string | null> {
  for (let i = 0; i < 10; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (!SLUG_RE.test(candidate)) continue;
    let q = svc.from("showcases").select("id").eq("slug", candidate);
    if (excludeShowcaseId) q = q.neq("id", excludeShowcaseId);
    const { data } = await q.maybeSingle();
    if (!data) return candidate;
  }
  return null;
}

// ─── 1. createShowcaseFromBoard ───────────────────────────────────────────────

export async function createShowcaseFromBoard(
  boardId: string,
): Promise<
  { ok: true; showcaseId: string } | { ok: false; error: string }
> {
  if (!UUID_RE.test(boardId)) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();

  const { data: board, error: boardErr } = await svc
    .from("preprod_boards")
    .select("id, title, project_id")
    .eq("id", boardId)
    .maybeSingle();
  if (boardErr || !board) return { ok: false, error: "board_not_found" };

  // Load current-revision frames, ordered by frame_order.
  const { data: frames, error: framesErr } = await svc
    .from("preprod_frames")
    .select(
      "id, frame_order, media_type, media_storage_path, media_external_url, media_embed_provider, caption",
    )
    .eq("board_id", boardId)
    .eq("is_current_revision", true)
    .order("frame_order", { ascending: true });
  if (framesErr) return { ok: false, error: "frames_load_failed" };

  // Generate a draft-safe slug (satisfies NOT NULL + CHECK constraint) —
  // Publish will overwrite with a title-derived slug.
  //
  // Phase 2.0 G6 #1 (Phase 1.9 L1) — 8 hex chars ≈ 4 billion values, so
  // collisions are astronomically rare but not impossible. Retry up to 3
  // times on 23505 with a fresh UUID before surfacing insert_failed, so a
  // single unlucky collision doesn't fail a user's create action.
  let showcaseId: string | null = null;
  let lastInsertErr: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < 3 && !showcaseId; attempt++) {
    const draftSlug = `draft-${crypto.randomUUID().slice(0, 8)}`;
    const { data: inserted, error: insertErr } = await svc
      .from("showcases")
      .insert({
        project_id: board.project_id,
        board_id: board.id,
        slug: draftSlug,
        title: board.title,
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();
    if (inserted) {
      showcaseId = inserted.id;
      break;
    }
    lastInsertErr = insertErr;
    // Anything other than a unique-violation is a real failure — don't retry.
    if (insertErr?.code !== "23505") break;
  }
  if (!showcaseId) {
    console.error("[showcase] create insert", lastInsertErr?.message);
    return { ok: false, error: "insert_failed" };
  }

  // Copy frames → showcase_media. Storage paths are copied by reference
  // (same bytes, no re-upload). 1-indexed sort order matches the unique idx.
  if (frames && frames.length > 0) {
    const rows = frames.map((f, i) => ({
      showcase_id: showcaseId,
      sort_order: i + 1,
      media_type: f.media_type,
      storage_path: f.media_storage_path ?? null,
      external_url: f.media_external_url ?? null,
      embed_provider: f.media_embed_provider ?? null,
      caption: f.caption ?? null,
    }));

    const { error: mediaErr } = await svc.from("showcase_media").insert(rows);
    if (mediaErr) {
      console.error("[showcase] create media insert", mediaErr.message);
      // Best-effort rollback: remove the showcase; showcase_media has ON
      // DELETE CASCADE so partial rows clear automatically.
      await svc.from("showcases").delete().eq("id", showcaseId);
      return { ok: false, error: "media_insert_failed" };
    }

    // Set cover from first frame.
    const first = frames[0];
    await svc
      .from("showcases")
      .update({
        cover_media_type: first.media_type,
        cover_media_storage_path: first.media_storage_path ?? null,
        cover_media_external_url: first.media_external_url ?? null,
      })
      .eq("id", showcaseId);
  }

  revalidateShowcase(showcaseId);
  return { ok: true, showcaseId };
}

// ─── 2. publishShowcase ───────────────────────────────────────────────────────

export async function publishShowcase(
  showcaseId: string,
):
  Promise<
    | { ok: true; slug: string; url: string }
    | { ok: false; error: string; missing?: string[] }
  > {
  if (!UUID_RE.test(showcaseId))
    return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();

  const { data: showcase, error: loadErr } = await svc
    .from("showcases")
    .select(
      "id, title, slug, status, narrative_md, cover_media_storage_path, cover_media_external_url, cover_media_type, project_id",
    )
    .eq("id", showcaseId)
    .maybeSingle();
  if (loadErr || !showcase) return { ok: false, error: "not_found" };

  // Validate publish prerequisites.
  const missing: string[] = [];

  const hasCover =
    showcase.cover_media_type &&
    (showcase.cover_media_storage_path || showcase.cover_media_external_url);
  if (!hasCover) missing.push("cover_media");

  const { count: mediaCount } = await svc
    .from("showcase_media")
    .select("id", { count: "exact", head: true })
    .eq("showcase_id", showcaseId);
  if (!mediaCount || mediaCount < 3) missing.push("min_3_media");

  const narrativeLen = (showcase.narrative_md ?? "").length;
  if (narrativeLen < 200) missing.push("narrative_min_200_chars");

  if (missing.length > 0) {
    return { ok: false, error: "validation", missing };
  }

  // Slug: reuse existing if already overridden and not a draft placeholder;
  // otherwise derive from title with collision suffix.
  const currentSlug = showcase.slug;
  const looksLikeDraft = /^draft-[a-z0-9]{8}$/.test(currentSlug);
  let finalSlug = currentSlug;
  if (looksLikeDraft || !SLUG_RE.test(currentSlug)) {
    const base = baseSlugFromTitle(showcase.title, showcaseId);
    const resolved = await findAvailableSlug(svc, base, showcaseId);
    if (!resolved) return { ok: false, error: "slug_collision" };
    finalSlug = resolved;
  }

  // OG image: set to null so the public viewer's first request lazily
  // triggers regeneration via /api/showcases/{id}/og (subtask 05 will
  // implement the lazy handler). This avoids the chicken-and-egg problem
  // of server-fetching our own route before the page exists.
  const { error: updErr } = await svc
    .from("showcases")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      slug: finalSlug,
      og_image_path: null,
      og_image_regenerated_at: null,
    })
    .eq("id", showcaseId);
  if (updErr) {
    // Unique slug violation → collision we didn't detect in the probe.
    if (updErr.code === "23505") {
      return { ok: false, error: "slug_collision" };
    }
    console.error("[showcase] publish update", updErr.message);
    return { ok: false, error: "update_failed" };
  }

  // Notify workspace members of the project, skipping the actor.
  try {
    await _emitShowcasePublishedNotifications({
      actorUserId: user.id,
      showcaseId: showcase.id,
      projectId: showcase.project_id,
      showcaseTitle: showcase.title,
    });
  } catch (err) {
    console.error("[showcase] publish notif emit failed:", err);
  }

  revalidateShowcase(showcaseId, finalSlug);
  return {
    ok: true,
    slug: finalSlug,
    url: `${siteUrl()}/showcase/${finalSlug}`,
  };
}

async function _emitShowcasePublishedNotifications(args: {
  actorUserId: string;
  showcaseId: string;
  projectId: string;
  showcaseTitle: string;
}): Promise<void> {
  const svc = createSupabaseService();

  const { data: project } = await svc
    .from("projects")
    .select("workspace_id, title")
    .eq("id", args.projectId)
    .maybeSingle();
  if (!project) return;

  const [{ data: members }, { data: actorProfile }] = await Promise.all([
    svc
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", project.workspace_id),
    svc
      .from("profiles")
      .select("display_name")
      .eq("id", args.actorUserId)
      .maybeSingle(),
  ]);

  const actorName = actorProfile?.display_name ?? "YAGI";
  const urlPath = `/app/showcases/${args.showcaseId}`;

  await Promise.all(
    (members ?? [])
      .filter((m) => m.user_id && m.user_id !== args.actorUserId)
      .map((m) =>
        emitNotification({
          user_id: m.user_id!,
          kind: "showcase_published",
          project_id: args.projectId,
          workspace_id: project.workspace_id,
          payload: {
            actor: actorName,
            project_title: project.title ?? args.showcaseTitle,
          },
          url_path: urlPath,
        }),
      ),
  );
}

// ─── 3. unpublishShowcase ─────────────────────────────────────────────────────

export async function unpublishShowcase(
  showcaseId: string,
): Promise<Result> {
  if (!UUID_RE.test(showcaseId))
    return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();
  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", showcaseId)
    .maybeSingle();

  const { error } = await svc
    .from("showcases")
    .update({ status: "draft", published_at: null })
    .eq("id", showcaseId);

  if (error) {
    console.error("[showcase] unpublish", error.message);
    return { ok: false, error: "update_failed" };
  }

  revalidateShowcase(showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 4. requestBadgeRemoval ───────────────────────────────────────────────────

export async function requestBadgeRemoval(
  showcaseId: string,
  reason: string,
): Promise<Result> {
  const parsed = z
    .object({
      showcaseId: z.string().uuid(),
      reason: z.string().max(2000),
    })
    .safeParse({ showcaseId, reason });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  const [yagiAdmin, wsAdmin] = await Promise.all([
    isYagiAdmin(supabase, user.id),
    isWsAdminOfShowcase(supabase, user.id, parsed.data.showcaseId),
  ]);
  if (!yagiAdmin && !wsAdmin) return { ok: false, error: "forbidden" };

  const svc = createSupabaseService();
  const { error } = await svc
    .from("showcases")
    .update({ badge_removal_requested: true })
    .eq("id", parsed.data.showcaseId);
  if (error) {
    console.error("[showcase] requestBadgeRemoval", error.message);
    return { ok: false, error: "update_failed" };
  }

  // Phase 2.0 G6 #L2 (Phase 1.9 L2) — intentionally unpersisted.
  // The reason is captured via console.info → Vercel log drain, whose
  // retention is acceptable for this surface (infrequent yagi_admin /
  // ws_admin action; audit value is "who asked and why", not strict
  // compliance). When retention requirements tighten, add a
  // badge_removal_requests audit table and swap this console.info for a
  // row insert. Do NOT silently drop the reason in the meantime — keep
  // the log line so the intent stays re-discoverable from production logs.
  console.info(
    "[showcase] badge removal requested",
    parsed.data.showcaseId,
    "reason:",
    parsed.data.reason,
  );

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", parsed.data.showcaseId)
    .maybeSingle();
  revalidateShowcase(parsed.data.showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 5. approveBadgeRemoval ───────────────────────────────────────────────────

export async function approveBadgeRemoval(
  showcaseId: string,
): Promise<Result> {
  if (!UUID_RE.test(showcaseId))
    return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();
  const { error } = await svc
    .from("showcases")
    .update({
      made_with_yagi: false,
      badge_removal_approved_at: new Date().toISOString(),
      badge_removal_approved_by: user.id,
      badge_removal_requested: false,
    })
    .eq("id", showcaseId);
  if (error) {
    console.error("[showcase] approveBadgeRemoval", error.message);
    return { ok: false, error: "update_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", showcaseId)
    .maybeSingle();
  revalidateShowcase(showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 6. denyBadgeRemoval ──────────────────────────────────────────────────────

export async function denyBadgeRemoval(
  showcaseId: string,
): Promise<Result> {
  if (!UUID_RE.test(showcaseId))
    return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();
  const { error } = await svc
    .from("showcases")
    .update({ badge_removal_requested: false })
    .eq("id", showcaseId);
  if (error) {
    console.error("[showcase] denyBadgeRemoval", error.message);
    return { ok: false, error: "update_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", showcaseId)
    .maybeSingle();
  revalidateShowcase(showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 7. setShowcasePassword ───────────────────────────────────────────────────

export async function setShowcasePassword(
  showcaseId: string,
  password: string | null,
): Promise<Result> {
  const parsed = z
    .object({
      showcaseId: z.string().uuid(),
      password: z.string().max(256).nullable(),
    })
    .safeParse({ showcaseId, password });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const pw = parsed.data.password;
  const svc = createSupabaseService();

  if (!pw || pw.length === 0) {
    const { error } = await svc
      .from("showcases")
      .update({ is_password_protected: false, password_hash: null })
      .eq("id", parsed.data.showcaseId);
    if (error) return { ok: false, error: "update_failed" };
  } else {
    const hash = await bcrypt.hash(pw, 12);
    const { error } = await svc
      .from("showcases")
      .update({ is_password_protected: true, password_hash: hash })
      .eq("id", parsed.data.showcaseId);
    if (error) return { ok: false, error: "update_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", parsed.data.showcaseId)
    .maybeSingle();
  revalidateShowcase(parsed.data.showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 8. updateShowcase ────────────────────────────────────────────────────────

const updateShowcaseSchema = z.object({
  showcaseId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  subtitle: z.string().max(500).nullable().optional(),
  narrative_md: z.string().max(20000).nullable().optional(),
  credits_md: z.string().max(10000).nullable().optional(),
  client_name_public: z.string().max(200).nullable().optional(),
  slug: z.string().min(3).max(100).regex(SLUG_RE).optional(),
  made_with_yagi: z.boolean().optional(),
});

export type ShowcaseUpdateInput = z.infer<typeof updateShowcaseSchema>;

export async function updateShowcase(
  input: ShowcaseUpdateInput,
): Promise<Result> {
  const parsed = updateShowcaseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  const [yagiAdmin, wsAdmin] = await Promise.all([
    isYagiAdmin(supabase, user.id),
    isWsAdminOfShowcase(supabase, user.id, parsed.data.showcaseId),
  ]);
  if (!yagiAdmin && !wsAdmin) return { ok: false, error: "forbidden" };

  const { showcaseId, ...fields } = parsed.data;

  // workspace_admin cannot toggle made_with_yagi; only yagi_admin can.
  if (fields.made_with_yagi !== undefined && !yagiAdmin) {
    return { ok: false, error: "forbidden_badge_toggle" };
  }

  const update: Database["public"]["Tables"]["showcases"]["Update"] = {};
  if (fields.title !== undefined) update.title = fields.title;
  if (fields.subtitle !== undefined) update.subtitle = fields.subtitle;
  if (fields.narrative_md !== undefined)
    update.narrative_md = fields.narrative_md;
  if (fields.credits_md !== undefined) update.credits_md = fields.credits_md;
  if (fields.client_name_public !== undefined)
    update.client_name_public = fields.client_name_public;
  if (fields.slug !== undefined) update.slug = fields.slug;
  if (fields.made_with_yagi !== undefined)
    update.made_with_yagi = fields.made_with_yagi;

  if (Object.keys(update).length === 0) return { ok: true };

  const svc = createSupabaseService();
  const { error } = await svc
    .from("showcases")
    .update(update)
    .eq("id", showcaseId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "slug_taken" };
    }
    console.error("[showcase] updateShowcase", error.message);
    return { ok: false, error: "update_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", showcaseId)
    .maybeSingle();
  revalidateShowcase(showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 9. addShowcaseMedia ──────────────────────────────────────────────────────

const addShowcaseMediaSchema = z
  .object({
    showcaseId: z.string().uuid(),
    mediaType: z.enum(["image", "video_upload", "video_embed"]),
    storagePath: z.string().min(1).optional(),
    externalUrl: z.string().url().optional(),
    embedProvider: z
      .enum(["youtube", "vimeo", "tiktok", "instagram"])
      .optional(),
    caption: z.string().max(500).optional(),
  })
  .refine(
    (v) =>
      (v.mediaType === "video_embed" && !!v.externalUrl) ||
      (v.mediaType !== "video_embed" && !!v.storagePath),
    { message: "media source required" },
  );

export async function addShowcaseMedia(input: {
  showcaseId: string;
  mediaType: "image" | "video_upload" | "video_embed";
  storagePath?: string;
  externalUrl?: string;
  embedProvider?: string;
  caption?: string;
}): Promise<
  { ok: true; mediaId: string } | { ok: false; error: string }
> {
  const parsed = addShowcaseMediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  // For embed URLs, enforce provider allowlist to prevent XSS via arbitrary
  // iframe targets (phase-1-9-spec.md line 316 forbidden).
  if (parsed.data.mediaType === "video_embed") {
    if (
      !parsed.data.externalUrl ||
      !isAllowedEmbedUrl(parsed.data.externalUrl)
    ) {
      return { ok: false, error: "embed_url_not_allowed" };
    }
  }

  // Path prefix check for uploads — must start with {showcaseId}/
  if (
    parsed.data.mediaType !== "video_embed" &&
    parsed.data.storagePath &&
    !parsed.data.storagePath.startsWith(`${parsed.data.showcaseId}/`)
  ) {
    return { ok: false, error: "invalid_storage_path" };
  }

  const svc = createSupabaseService();

  // Compute next sort_order server-side.
  const { data: maxRow } = await svc
    .from("showcase_media")
    .select("sort_order")
    .eq("showcase_id", parsed.data.showcaseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data: row, error } = await svc
    .from("showcase_media")
    .insert({
      showcase_id: parsed.data.showcaseId,
      sort_order: nextOrder,
      media_type: parsed.data.mediaType,
      storage_path: parsed.data.storagePath ?? null,
      external_url: parsed.data.externalUrl ?? null,
      embed_provider: parsed.data.embedProvider ?? null,
      caption: parsed.data.caption ?? null,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[showcase] addShowcaseMedia", error?.message);
    return { ok: false, error: "insert_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", parsed.data.showcaseId)
    .maybeSingle();
  revalidateShowcase(parsed.data.showcaseId, sc?.slug);
  return { ok: true, mediaId: row.id };
}

// ─── 10. removeShowcaseMedia ──────────────────────────────────────────────────

export async function removeShowcaseMedia(
  mediaId: string,
): Promise<Result> {
  if (!UUID_RE.test(mediaId))
    return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();
  const { data: row } = await svc
    .from("showcase_media")
    .select("showcase_id")
    .eq("id", mediaId)
    .maybeSingle();
  if (!row) return { ok: false, error: "not_found" };

  const { error } = await svc
    .from("showcase_media")
    .delete()
    .eq("id", mediaId);
  if (error) {
    console.error("[showcase] removeShowcaseMedia", error.message);
    return { ok: false, error: "delete_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", row.showcase_id)
    .maybeSingle();
  revalidateShowcase(row.showcase_id, sc?.slug);
  return { ok: true };
}

// ─── 11. reorderShowcaseMedia ─────────────────────────────────────────────────

export async function reorderShowcaseMedia(
  showcaseId: string,
  mediaIds: string[],
): Promise<Result> {
  const parsed = z
    .object({
      showcaseId: z.string().uuid(),
      mediaIds: z.array(z.string().uuid()).min(1),
    })
    .safeParse({ showcaseId, mediaIds });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();

  // Verify every id belongs to this showcase.
  const { data: existing } = await svc
    .from("showcase_media")
    .select("id")
    .eq("showcase_id", parsed.data.showcaseId);
  const validIds = new Set((existing ?? []).map((r) => r.id));
  if (
    validIds.size !== parsed.data.mediaIds.length ||
    parsed.data.mediaIds.some((id) => !validIds.has(id))
  ) {
    return { ok: false, error: "invalid_media_set" };
  }

  // Two-phase update to avoid colliding with the unique (showcase_id,
  // sort_order) constraint: first push everything to negative offsets, then
  // set the final 1-indexed positions.
  for (let i = 0; i < parsed.data.mediaIds.length; i++) {
    const { error } = await svc
      .from("showcase_media")
      .update({ sort_order: -(i + 1) })
      .eq("id", parsed.data.mediaIds[i])
      .eq("showcase_id", parsed.data.showcaseId);
    if (error) {
      console.error("[showcase] reorder phase1", error.message);
      return { ok: false, error: "reorder_failed" };
    }
  }
  for (let i = 0; i < parsed.data.mediaIds.length; i++) {
    const { error } = await svc
      .from("showcase_media")
      .update({ sort_order: i + 1 })
      .eq("id", parsed.data.mediaIds[i])
      .eq("showcase_id", parsed.data.showcaseId);
    if (error) {
      console.error("[showcase] reorder phase2", error.message);
      return { ok: false, error: "reorder_failed" };
    }
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", parsed.data.showcaseId)
    .maybeSingle();
  revalidateShowcase(parsed.data.showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 12. setShowcaseCover ─────────────────────────────────────────────────────

export async function setShowcaseCover(
  showcaseId: string,
  mediaId: string,
): Promise<Result> {
  const parsed = z
    .object({
      showcaseId: z.string().uuid(),
      mediaId: z.string().uuid(),
    })
    .safeParse({ showcaseId, mediaId });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();
  const { data: media } = await svc
    .from("showcase_media")
    .select("id, media_type, storage_path, external_url, showcase_id")
    .eq("id", parsed.data.mediaId)
    .maybeSingle();
  if (!media) return { ok: false, error: "media_not_found" };
  if (media.showcase_id !== parsed.data.showcaseId) {
    return { ok: false, error: "media_not_in_showcase" };
  }

  const { error } = await svc
    .from("showcases")
    .update({
      cover_media_type: media.media_type,
      cover_media_storage_path: media.storage_path,
      cover_media_external_url: media.external_url,
    })
    .eq("id", parsed.data.showcaseId);
  if (error) {
    console.error("[showcase] setCover", error.message);
    return { ok: false, error: "update_failed" };
  }

  const { data: sc } = await svc
    .from("showcases")
    .select("slug")
    .eq("id", parsed.data.showcaseId)
    .maybeSingle();
  revalidateShowcase(parsed.data.showcaseId, sc?.slug);
  return { ok: true };
}

// ─── 13. requestShowcaseUploadUrls ────────────────────────────────────────────

const MAX_UPLOAD_FILES = 10;
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB per file
const ALLOWED_UPLOAD_MIMES = /^(image\/(jpeg|png|webp|gif)|video\/(mp4|quicktime|webm))$/;

function safeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120) || "file";
}

export async function requestShowcaseUploadUrls(
  showcaseId: string,
  files: { name: string; size: number; type: string }[],
): Promise<
  | {
      ok: true;
      uploads: { path: string; signedUrl: string; token: string }[];
    }
  | { ok: false; error: string }
> {
  const parsed = z
    .object({
      showcaseId: z.string().uuid(),
      files: z
        .array(
          z.object({
            name: z.string().min(1).max(256),
            size: z.number().int().nonnegative(),
            type: z.string().min(1).max(128),
          }),
        )
        .min(1)
        .max(MAX_UPLOAD_FILES),
    })
    .safeParse({ showcaseId, files });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const supabase = await createSupabaseServer();
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  const svc = createSupabaseService();

  // Verify showcase exists.
  const { data: showcase } = await svc
    .from("showcases")
    .select("id")
    .eq("id", parsed.data.showcaseId)
    .maybeSingle();
  if (!showcase) return { ok: false, error: "showcase_not_found" };

  // Validate each file.
  for (const f of parsed.data.files) {
    if (f.size > MAX_UPLOAD_BYTES) return { ok: false, error: "file_too_large" };
    if (!ALLOWED_UPLOAD_MIMES.test(f.type)) {
      return { ok: false, error: "mime_not_allowed" };
    }
  }

  const uploads: { path: string; signedUrl: string; token: string }[] = [];
  for (const f of parsed.data.files) {
    const uuid = crypto.randomUUID();
    const cleanName = safeFileName(f.name);
    const path = `${parsed.data.showcaseId}/${uuid}__${cleanName}`;
    const { data, error } = await svc.storage
      .from("showcase-media")
      .createSignedUploadUrl(path);
    if (error || !data) {
      console.error("[showcase] createSignedUploadUrl", error?.message);
      return { ok: false, error: "signed_url_failed" };
    }
    uploads.push({
      path,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  }

  return { ok: true, uploads };
}
