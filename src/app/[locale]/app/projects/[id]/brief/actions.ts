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
import * as cheerio from "cheerio";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
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

// K05-PHASE-2-8-02 fix: TipTap content_json passes through Zod's
// `.passthrough()` which does not validate URL-shaped attrs deep in
// the document. A workspace member could persist an embed node with
// `url: "javascript:..."` and trigger script execution when another
// member clicks the rendered <a href>. This walker rejects any embed
// or image node whose URL attribute is not a literal http(s) URL.
const SAFE_HTTP_URL_RE = /^https?:\/\//i;

function validateContentSafety(
  doc: unknown
): { ok: true } | { ok: false; reason: string } {
  function walk(node: unknown): string | null {
    if (!node || typeof node !== "object") return null;
    const n = node as { type?: unknown; attrs?: Record<string, unknown>; content?: unknown };
    if (n.type === "embed") {
      const url = n.attrs?.url;
      if (typeof url !== "string" || !SAFE_HTTP_URL_RE.test(url)) {
        return `embed.url must be http(s) (got ${typeof url === "string" ? url.slice(0, 32) : typeof url})`;
      }
      const thumb = n.attrs?.thumbnail_url;
      if (
        thumb !== null &&
        thumb !== undefined &&
        (typeof thumb !== "string" || !SAFE_HTTP_URL_RE.test(thumb))
      ) {
        return `embed.thumbnail_url must be http(s) when set`;
      }
      const provider = n.attrs?.provider;
      if (
        provider !== undefined &&
        (typeof provider !== "string" ||
          !["youtube", "vimeo", "generic"].includes(provider))
      ) {
        return `embed.provider must be one of {youtube,vimeo,generic}`;
      }
    }
    if (Array.isArray(n.content)) {
      for (const child of n.content) {
        const err = walk(child);
        if (err) return err;
      }
    }
    return null;
  }
  const err = walk(doc);
  if (err) return { ok: false, reason: err };
  return { ok: true };
}

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

  const safety = validateContentSafety(parsed.data.contentJson);
  if (!safety.ok) {
    return {
      error: "validation",
      issues: [
        {
          code: "custom",
          path: ["contentJson"],
          message: safety.reason,
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

// -----------------------------------------------------------------------------
// 8. fetchEmbed — server-side oEmbed proxy with embed_cache lookup
// -----------------------------------------------------------------------------
// Per SPEC §4.B4: YouTube + Vimeo via official oEmbed JSON endpoints,
// generic OG via cheerio HTML parse. No `html` field is stored — the
// client renders a sandboxed iframe itself per provider whitelist (so a
// poisoned cache cannot inject scripts). Cache TTL 7 days; v1 serves
// stale until the Phase 2.8.1 background refresh job exists.
//
// RLS posture: SELECT is open to authenticated; INSERT/UPDATE/DELETE
// have no policy under FORCE RLS, so cache writes use the service-role
// client (createSupabaseService) which bypasses RLS by design.

const FetchEmbedInput = z.object({
  url: z
    .string()
    .url()
    .max(2048)
    .refine((u) => /^https?:\/\//i.test(u), {
      message: "url must be http(s)",
    }),
});

const EMBED_FETCH_TIMEOUT_MS = 5000;
const EMBED_USER_AGENT =
  "yagi-workshop-embed-proxy/1.0 (+https://studio.yagiworkshop.xyz)";

const YOUTUBE_VIDEO_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i;
const VIMEO_VIDEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;

type EmbedProvider = "youtube" | "vimeo" | "generic";

export interface EmbedPayload {
  url: string;
  provider: EmbedProvider;
  title: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  author_name: string | null;
}

function detectProvider(url: string): EmbedProvider {
  if (YOUTUBE_VIDEO_RE.test(url)) return "youtube";
  if (VIMEO_VIDEO_RE.test(url)) return "vimeo";
  return "generic";
}

interface OEmbedJson {
  title?: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
  author_name?: string;
}

async function fetchOEmbedJson(endpoint: string): Promise<EmbedPayload | null> {
  let resp: Response;
  try {
    resp = await fetch(endpoint, {
      method: "GET",
      headers: {
        "User-Agent": EMBED_USER_AGENT,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(EMBED_FETCH_TIMEOUT_MS),
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  let body: OEmbedJson;
  try {
    body = (await resp.json()) as OEmbedJson;
  } catch {
    return null;
  }
  return {
    url: endpoint,
    provider: "youtube", // overridden by caller
    title: body.title ?? null,
    thumbnail_url: body.thumbnail_url ?? null,
    width: typeof body.width === "number" ? body.width : null,
    height: typeof body.height === "number" ? body.height : null,
    author_name: body.author_name ?? null,
  };
}

// K05-PHASE-2-8-03 fix: pre-fetch SSRF guard for the generic OG path.
// The YouTube and Vimeo branches resolve oEmbed endpoints on public
// hosts (www.youtube.com / vimeo.com) so they don't need this check —
// they already know what they're fetching. The generic OG fallback
// fetches a user-supplied URL directly; without an IP filter, signed-in
// users could probe loopback / private networks / cloud metadata.
//
// v1 mitigation: parse hostname, resolve via dns.lookup (both A + AAAA),
// reject if any resolved IP falls in private / loopback / link-local
// ranges. Does NOT re-check after redirects — `redirect: 'follow'` can
// still chase a 302 to a private IP. Redirect-time re-check (manual
// redirect handling) is FU-2.8-ssrf-redirect-rewrite.
function normalizeIp(ipRaw: string): string {
  // Strip RFC 3986 IPv6 brackets if present.
  let ip = ipRaw.trim();
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  return ip.toLowerCase();
}

function isPrivateIpv4Octets(ip: string): boolean {
  if (ip === "0.0.0.0" || ip.startsWith("127.")) return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true; // link-local + AWS/GCP metadata
  // Multicast 224/4 + reserved 240/4
  if (/^(22[4-9]|2[3-4]\d|2[5-9]\d)\./.test(ip)) return true;
  if (ip.startsWith("100.64.")) return true; // CGN
  return false;
}

// K05-PHASE-2-8-LOOP2-02 fix: detect IPv4-mapped IPv6 (::ffff:1.2.3.4
// or hex form ::ffff:7f00:1 = 127.0.0.1). Without this, an attacker
// could request http://[::ffff:127.0.0.1]/ and our IPv4 range checks
// would never run.
function isPrivateIp(ipRaw: string): boolean {
  const ip = normalizeIp(ipRaw);

  // IPv4 dotted-quad
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    return isPrivateIpv4Octets(ip);
  }

  // IPv4-mapped IPv6 in dotted form
  const mappedDotted = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mappedDotted) {
    return isPrivateIpv4Octets(mappedDotted[1]);
  }

  // IPv4-mapped IPv6 in hex form: ::ffff:abcd:efef = a.b.c.d
  const mappedHex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const high = parseInt(mappedHex[1], 16);
    const low = parseInt(mappedHex[2], 16);
    const a = (high >> 8) & 0xff;
    const b = high & 0xff;
    const c = (low >> 8) & 0xff;
    const d = low & 0xff;
    return isPrivateIpv4Octets(`${a}.${b}.${c}.${d}`);
  }

  // IPv4-compatible IPv6 (deprecated but reject for safety): ::a.b.c.d
  const compat = ip.match(/^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (compat) {
    return isPrivateIpv4Octets(compat[1]);
  }

  // Bare IPv6 forms.
  if (ip === "::1" || ip === "::") return true; // loopback / unspecified
  if (ip === "::ffff:0:0" || ip === "::ffff") return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7 ULA
  if (ip.startsWith("fe80") || ip.startsWith("fec0")) return true; // link-local + site-local
  if (ip.startsWith("ff")) return true; // multicast ff00::/8
  if (ip === "100::" || ip.startsWith("100::")) return true; // discard prefix

  return false;
}

async function isHostnameSafe(hostname: string): Promise<boolean> {
  const { lookup } = await import("node:dns/promises");
  const { isIP } = await import("node:net");

  const norm = normalizeIp(hostname);

  if (isIP(norm)) {
    return !isPrivateIp(norm);
  }

  // Reject obvious non-public suffixes; .local / .internal / etc.
  const lower = norm.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return false;
  if (lower.endsWith(".local") || lower.endsWith(".internal")) return false;

  try {
    const addrs = await lookup(hostname, { all: true });
    if (!addrs || addrs.length === 0) return false;
    for (const a of addrs) {
      if (isPrivateIp(a.address)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function fetchOgFallback(url: string): Promise<EmbedPayload | null> {
  let parsedHost: string;
  try {
    parsedHost = new URL(url).hostname;
  } catch {
    return null;
  }
  if (!(await isHostnameSafe(parsedHost))) {
    return null;
  }

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": EMBED_USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(EMBED_FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
  } catch {
    return null;
  }
  if (!resp.ok) return null;
  let html: string;
  try {
    html = await resp.text();
  } catch {
    return null;
  }
  // Defensive cap on how much HTML we parse — pages can be huge.
  if (html.length > 1024 * 1024) html = html.slice(0, 1024 * 1024);

  const $ = cheerio.load(html);
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $('meta[name="twitter:title"]').attr("content") ||
    $("title").first().text() ||
    null;
  const thumbnail_url =
    $('meta[property="og:image"]').attr("content") ||
    $('meta[name="twitter:image"]').attr("content") ||
    null;
  const author_name =
    $('meta[property="article:author"]').attr("content") ||
    $('meta[name="author"]').attr("content") ||
    null;

  if (!title && !thumbnail_url) return null;

  return {
    url,
    provider: "generic",
    title,
    thumbnail_url: thumbnail_url ? absolutize(thumbnail_url, url) : null,
    width: null,
    height: null,
    author_name,
  };
}

function absolutize(maybeRelative: string, baseUrl: string): string {
  try {
    return new URL(maybeRelative, baseUrl).toString();
  } catch {
    return maybeRelative;
  }
}

async function resolveEmbed(url: string): Promise<EmbedPayload | null> {
  const provider = detectProvider(url);
  if (provider === "youtube") {
    const ep = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const r = await fetchOEmbedJson(ep);
    if (r) return { ...r, url, provider: "youtube" };
    // YouTube oEmbed failed (rate limit or removed video). Fall through
    // to OG so the user still sees a card.
  }
  if (provider === "vimeo") {
    const ep = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`;
    const r = await fetchOEmbedJson(ep);
    if (r) return { ...r, url, provider: "vimeo" };
  }
  return fetchOgFallback(url);
}

export async function fetchEmbed(
  input: unknown
): Promise<BriefActionResult<EmbedPayload>> {
  const parsed = FetchEmbedInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  // Auth gate: only authenticated users can hit the embed proxy
  // (otherwise this becomes an SSRF surface for anonymous attackers).
  const { user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  const url = parsed.data.url;

  // Cache lookup via the SSR client (RLS read-open for authenticated).
  const supabase = await createSupabaseServer();
  const { data: cached } = await supabase
    .from("embed_cache")
    .select("provider, response_json, expires_at")
    .eq("url", url)
    .maybeSingle();

  if (cached && new Date(cached.expires_at) > new Date()) {
    const j = cached.response_json as Record<string, unknown> | null;
    return {
      ok: true,
      data: {
        url,
        provider: cached.provider as EmbedProvider,
        title: typeof j?.title === "string" ? j.title : null,
        thumbnail_url:
          typeof j?.thumbnail_url === "string" ? j.thumbnail_url : null,
        width: typeof j?.width === "number" ? j.width : null,
        height: typeof j?.height === "number" ? j.height : null,
        author_name:
          typeof j?.author_name === "string" ? j.author_name : null,
      },
    };
  }

  const fetched = await resolveEmbed(url);
  if (!fetched) {
    // Total miss — return a minimal payload so the editor can still show
    // a hostname-only card instead of erroring out.
    const hostname = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return null;
      }
    })();
    return {
      ok: true,
      data: {
        url,
        provider: "generic",
        title: hostname,
        thumbnail_url: null,
        width: null,
        height: null,
        author_name: null,
      },
    };
  }

  // Persist via service-role (embed_cache has no INSERT policy under FORCE RLS).
  const service = createSupabaseService();
  const responseJson: Json = {
    title: fetched.title,
    thumbnail_url: fetched.thumbnail_url,
    width: fetched.width,
    height: fetched.height,
    author_name: fetched.author_name,
  };
  await service.from("embed_cache").upsert(
    {
      url,
      provider: fetched.provider,
      response_json: responseJson,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    { onConflict: "url" }
  );

  return { ok: true, data: fetched };
}

// -----------------------------------------------------------------------------
// 9. requestYagiProposal — empty-state CTA (SPEC §2 surface B + §6)
// -----------------------------------------------------------------------------
// User clicks "YAGI에게 제안 요청" on an empty brief board, fills 4
// fields (goal / audience / budget / timeline), submit fans out a
// notification to every yagi_admin so they can pick up the request.
// The brief content_json itself is left empty — admin (Y3) seeds it
// after responding.

const RequestYagiProposalInput = z.object({
  projectId: z.string().uuid(),
  goal: z.string().trim().min(1).max(1000),
  audience: z.string().trim().max(500).optional().or(z.literal("")),
  budget: z.string().trim().max(200).optional().or(z.literal("")),
  timeline: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function requestYagiProposal(
  input: unknown
): Promise<BriefActionResult<{ adminCount: number }>> {
  const parsed = RequestYagiProposalInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { error: "unauthenticated" };

  // Verify caller is a project member (via existing RLS: SELECT on
  // project_briefs requires membership).
  const { data: brief, error: briefErr } = await supabase
    .from("project_briefs")
    .select("project_id")
    .eq("project_id", parsed.data.projectId)
    .maybeSingle();
  if (briefErr) {
    console.error("[requestYagiProposal] brief read", briefErr);
    return { error: "db", message: briefErr.message };
  }
  if (!brief) return { error: "not_found" };

  // Resolve project workspace for notification context.
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, title")
    .eq("id", parsed.data.projectId)
    .maybeSingle();

  // Enumerate yagi_admin recipients via service role (user_roles SELECT
  // requires admin; SSR client may not have permission depending on
  // policy. Service role bypasses RLS for fan-out — caller already
  // validated as a project member.)
  const service = createSupabaseService();
  const { data: admins, error: admErr } = await service
    .from("user_roles")
    .select("user_id")
    .eq("role", "yagi_admin");

  if (admErr) {
    console.error("[requestYagiProposal] admin lookup", admErr);
    return { error: "db", message: admErr.message };
  }
  const adminIds = (admins ?? []).map((r) => r.user_id).filter(Boolean);
  if (adminIds.length === 0) {
    // No admins configured — degrade gracefully so the user still gets
    // a confirmation. Phase 1.x has a yagi internal workspace seed; in
    // practice this branch is unreachable in prod.
    return { ok: true, data: { adminCount: 0 } };
  }

  const payload: Json = {
    goal: parsed.data.goal,
    audience: parsed.data.audience ?? null,
    budget: parsed.data.budget ?? null,
    timeline: parsed.data.timeline ?? null,
    requester_user_id: user.id,
    project_title: project?.title ?? null,
  };

  const rows = adminIds.map((adminId) => ({
    user_id: adminId,
    project_id: parsed.data.projectId,
    workspace_id: project?.workspace_id ?? null,
    kind: "project_brief_yagi_request",
    severity: "high",
    title: project?.title
      ? `Brief 제안 요청: ${project.title}`
      : "Brief 제안 요청",
    body: parsed.data.goal,
    url_path: `/app/projects/${parsed.data.projectId}?tab=brief`,
    payload,
  }));

  const { error: nErr } = await service.from("notification_events").insert(rows);
  if (nErr) {
    console.error("[requestYagiProposal] notif insert", nErr);
    return { error: "db", message: nErr.message };
  }

  return { ok: true, data: { adminCount: adminIds.length } };
}
