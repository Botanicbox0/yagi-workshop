"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import { fetchVideoMetadata, type OEmbedResult } from "@/lib/oembed";
import { extractAssetIndex } from "@/lib/board/asset-index";

// -----------------------------------------------------------------------------
// Phase 2.8.1 G_B1-B — Wizard draft mode
// -----------------------------------------------------------------------------
// The wizard now creates the projects row early (status='draft') so Step 2
// can mount BriefBoardEditor against a real project_id and the user can
// drop images / paste embeds before "submit". Submit flips the status from
// 'draft' to 'submitted' rather than INSERTing a fresh row.
//
// Server actions exposed:
//   - createProject       : pre-2.8.1 single-shot INSERT path (kept for
//                           backwards compatibility; wizard no longer calls
//                           it but tests / direct callers still do)
//   - ensureDraftProject  : find-or-create the user's wizard draft. Returns
//                           project + brief bootstrap for the editor.
//   - submitDraftProject  : UPDATE the existing draft with the latest
//                           wizard fields and (optionally) flip to 'submitted'.
// -----------------------------------------------------------------------------

const sharedFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  brand_id: z.string().uuid().nullable().optional(),
  tone: z.string().max(500).optional().nullable(),
  // Phase 2.7.2: free-text tag list (was a closed enum). Maps to the
  // existing `deliverable_types text[]` Postgres column — no migration
  // needed; the meaning shifts from "format" to "intended use".
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .default([]),
  estimated_budget_range: z.string().max(100).optional().nullable(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  intent: z.enum(["draft", "submit"]).default("draft"),
};

// Phase 2.8.1 G_B1-E: proposalSchema + discriminatedUnion deleted —
// proposal_request intake mode is no longer authored. The legacy
// `projects.intake_mode` column stays; existing rows still render via
// the read-only banner on /app/projects/[id].
const createProjectSchema = z.object({
  ...sharedFields,
  intake_mode: z.literal("brief"),
});

type ActionResult =
  | { ok: true; id: string; status: string }
  | {
      error: "validation";
      issues: z.ZodFormattedError<z.infer<typeof createProjectSchema>>;
    }
  | { error: "unauthenticated" }
  | { error: "no_workspace" }
  | { error: "db"; message: string };

export async function createProject(input: unknown): Promise<ActionResult> {
  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.format() };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Resolve workspace via workspace_members — no hardcoded IDs
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) return { error: "no_workspace" };

  const status = parsed.data.intent === "submit" ? "submitted" : "draft";

  // Column mapping notes:
  // - spec field `description` → DB column `brief` (no standalone `description` col)
  // - spec field `tone` → NO matching column on `projects`; omitted from insert
  // - `estimated_budget_range` matches exactly
  const data = parsed.data;

  const insertPayload = {
    workspace_id: membership.workspace_id,
    created_by: user.id,
    project_type: "direct_commission" as const,
    status,
    title: data.title,
    brief: data.description ?? null,
    brand_id: data.brand_id ?? null,
    deliverable_types: data.deliverable_types,
    estimated_budget_range: data.estimated_budget_range ?? null,
    target_delivery_at: data.target_delivery_at ?? null,
    intake_mode: data.intake_mode,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error || !project) {
    console.error("[createProject] Supabase error:", error);
    return { error: "db", message: error?.message ?? "insert failed" };
  }

  // Phase 2.8 G_B-7: every new project gets a sibling project_briefs row
  // with empty content, so the Brief tab on /app/projects/[id] can mount
  // the editor immediately. RLS allows this INSERT because the caller
  // is the project's workspace member (just created the project above).
  //
  // K05-PHASE-2-8-04 fix: brief INSERT failure is now FATAL. If the
  // sibling row can't be created we roll back the project to avoid
  // leaving an orphan project that the Brief tab cannot edit (saveBrief
  // returns not_found when the row is missing — there is no lazy-create
  // path). Atomicity-via-RPC lands in Phase 2.8.1 (FU-2.8-saveversion-rollback
  // covers a related two-write atomicity gap).
  const { error: briefErr } = await supabase
    .from("project_briefs")
    .insert({
      project_id: project.id,
      // status / current_version / tiptap_schema_version use column defaults
      // (editing / 0 / 1) — required by validate_project_brief_change for
      // non-yagi_admin INSERT.
      updated_by: user.id,
    });
  if (briefErr) {
    console.error(
      "[createProject] project_briefs sibling insert failed (rolling back project):",
      briefErr
    );
    // K05-PHASE-2-8-LOOP2-03 fix: rollback DELETE must use the
    // service-role client. The user-scoped supabase client honors
    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
    // a non-yagi workspace_admin's rollback would be silently denied
    // and leave an orphan project. Service role bypasses RLS so the
    // rollback succeeds for all caller roles. Atomicity-via-RPC is
    // still the cleaner long-term fix (FU-2.8-saveversion-rollback).
    const service = createSupabaseService();
    const { error: rollbackErr } = await service
      .from("projects")
      .delete()
      .eq("id", project.id);
    if (rollbackErr) {
      console.error("[createProject] rollback DELETE failed:", rollbackErr);
    }
    return {
      error: "db",
      message: `brief insert failed: ${briefErr.message}`,
    };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, id: project.id, status };
}

// =============================================================================
// Phase 2.8.1 G_B1-B — wizard draft mode
// =============================================================================

const wizardDraftFields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  brand_id: z.string().uuid().nullable().optional(),
  tone: z.string().max(500).optional().nullable(),
  deliverable_types: z
    .array(z.string().trim().min(1).max(60))
    .max(10)
    .default([]),
  estimated_budget_range: z.string().max(100).optional().nullable(),
  target_delivery_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

const ensureDraftInput = z.object({
  initial: wizardDraftFields,
});

const submitDraftInput = z.object({
  projectId: z.string().uuid(),
  fields: wizardDraftFields,
  intent: z.enum(["draft", "submit"]),
});

export type WizardDraftFields = z.infer<typeof wizardDraftFields>;

type DraftBootstrap = {
  projectId: string;
  status: "draft" | "submitted" | string;
  brief: {
    contentJson: Json;
    updatedAt: string;
    status: "editing" | "locked";
  };
};

export type EnsureDraftResult =
  | { ok: true; data: DraftBootstrap }
  | { error: "validation"; issues: z.ZodIssue[] }
  | { error: "unauthenticated" }
  | { error: "no_workspace" }
  | { error: "db"; message: string };

export type SubmitDraftResult =
  | { ok: true; id: string; status: "draft" | "submitted" }
  | { error: "validation"; issues: z.ZodIssue[] }
  | { error: "unauthenticated" }
  | { error: "not_found" }
  | { error: "forbidden" }
  | { error: "db"; message: string };

const PG_UNIQUE_VIOLATION = "23505";

async function fetchDraftBootstrap(
  supabase: Awaited<ReturnType<typeof createSupabaseServer>>,
  projectId: string,
): Promise<DraftBootstrap | null> {
  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .select("id, status")
    .eq("id", projectId)
    .maybeSingle();
  if (projectErr || !project) return null;

  const { data: brief, error: briefErr } = await supabase
    .from("project_briefs")
    .select("content_json, updated_at, status")
    .eq("project_id", projectId)
    .maybeSingle();
  if (briefErr || !brief) return null;

  return {
    projectId: project.id,
    status: project.status,
    brief: {
      contentJson: brief.content_json,
      updatedAt: brief.updated_at,
      status: brief.status as "editing" | "locked",
    },
  };
}

export async function ensureDraftProject(
  input: unknown,
): Promise<EnsureDraftResult> {
  const parsed = ensureDraftInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!membership?.workspace_id) return { error: "no_workspace" };

  // 1. SELECT existing draft (intake_mode='brief'). Phase 2.8.1 migration
  //    guarantees at most one row matches per (workspace, user) via the
  //    projects_wizard_draft_uniq partial index.
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("workspace_id", membership.workspace_id)
    .eq("created_by", user.id)
    .eq("status", "draft")
    .eq("intake_mode", "brief")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const bootstrap = await fetchDraftBootstrap(supabase, existing.id);
    if (bootstrap) return { ok: true, data: bootstrap };
    // If brief row is missing for an existing draft project we treat it as
    // corrupt — fall through and create a fresh draft. (DELETE the orphan
    // first so the unique index does not block the new INSERT.)
    const service = createSupabaseService();
    await service.from("projects").delete().eq("id", existing.id);
  }

  // 2. INSERT new draft. The unique index makes concurrent INSERTs from a
  //    double-mounted wizard converge — one wins, the other catches 23505
  //    and re-SELECTs.
  const fields = parsed.data.initial;
  const insertPayload = {
    workspace_id: membership.workspace_id,
    created_by: user.id,
    project_type: "direct_commission" as const,
    status: "draft" as const,
    intake_mode: "brief" as const,
    title: fields.title,
    brief: fields.description ?? null,
    brand_id: fields.brand_id ?? null,
    deliverable_types: fields.deliverable_types,
    estimated_budget_range: fields.estimated_budget_range ?? null,
    target_delivery_at: fields.target_delivery_at ?? null,
  };

  const { data: project, error } = await supabase
    .from("projects")
    .insert(insertPayload)
    .select("id, status")
    .single();

  if (error || !project) {
    if (error?.code === PG_UNIQUE_VIOLATION) {
      // A concurrent ensureDraftProject won the race. Re-SELECT and return
      // the surviving row.
      const { data: winner } = await supabase
        .from("projects")
        .select("id")
        .eq("workspace_id", membership.workspace_id)
        .eq("created_by", user.id)
        .eq("status", "draft")
        .eq("intake_mode", "brief")
        .limit(1)
        .maybeSingle();
      if (winner?.id) {
        const bootstrap = await fetchDraftBootstrap(supabase, winner.id);
        if (bootstrap) return { ok: true, data: bootstrap };
      }
    }
    console.error("[ensureDraftProject] insert error:", error);
    return { error: "db", message: error?.message ?? "insert failed" };
  }

  // 3. Sibling project_briefs row. Same atomic-rollback pattern as
  //    createProject — if the sibling INSERT fails we roll back via service
  //    role so the wizard can retry without an orphan blocking the unique
  //    index.
  const { error: briefErr } = await supabase
    .from("project_briefs")
    .insert({
      project_id: project.id,
      updated_by: user.id,
    });
  if (briefErr) {
    console.error(
      "[ensureDraftProject] brief insert failed (rolling back project):",
      briefErr,
    );
    const service = createSupabaseService();
    await service.from("projects").delete().eq("id", project.id);
    return {
      error: "db",
      message: `brief insert failed: ${briefErr.message}`,
    };
  }

  const bootstrap = await fetchDraftBootstrap(supabase, project.id);
  if (!bootstrap) {
    return { error: "db", message: "bootstrap fetch after insert failed" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  return { ok: true, data: bootstrap };
}

export async function submitDraftProject(
  input: unknown,
): Promise<SubmitDraftResult> {
  const parsed = submitDraftInput.safeParse(input);
  if (!parsed.success) {
    return { error: "validation", issues: parsed.error.issues };
  }
  const { projectId, fields, intent } = parsed.data;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "unauthenticated" };

  // Confirm draft exists and is owned by caller. RLS already filters but
  // an explicit check lets us return `forbidden` distinct from `not_found`.
  const { data: target } = await supabase
    .from("projects")
    .select("id, status, created_by")
    .eq("id", projectId)
    .maybeSingle();
  if (!target) return { error: "not_found" };
  if (target.created_by !== user.id) return { error: "forbidden" };

  // Codex K-05 finding 2 (HIGH-B) — restrict to status='draft'. Without
  // this guard the wizard's submit path becomes a backdoor that demotes
  // any project owned by the caller (submitted / in_production /
  // delivered etc.) back to 'draft' or stomps on its fields, bypassing
  // the transition matrix in projects/[id]/actions.ts.
  if (target.status !== "draft") return { error: "forbidden" };

  const status = intent === "submit" ? "submitted" : "draft";

  const { data: updated, error } = await supabase
    .from("projects")
    .update({
      title: fields.title,
      brief: fields.description ?? null,
      brand_id: fields.brand_id ?? null,
      deliverable_types: fields.deliverable_types,
      estimated_budget_range: fields.estimated_budget_range ?? null,
      target_delivery_at: fields.target_delivery_at ?? null,
      status,
    })
    .eq("id", projectId)
    .eq("created_by", user.id)
    .eq("status", "draft")
    .select("id, status")
    .single();

  if (error || !updated) {
    console.error("[submitDraftProject] update error:", error);
    return { error: "db", message: error?.message ?? "update failed" };
  }

  revalidatePath("/[locale]/app/projects", "page");
  revalidatePath(`/[locale]/app/projects/${projectId}`, "page");
  return {
    ok: true,
    id: updated.id,
    status: updated.status as "draft" | "submitted",
  };
}

// =============================================================================
// Phase 3.0 hotfix-2 — getWizardAssetPutUrlAction
// =============================================================================
// Server action that generates a presigned R2 PUT URL + the public URL for a
// wizard reference asset. Moved server-side because createBriefAssetPutUrl
// uses S3Client with process.env credentials — it cannot run in the browser.
// Previously reference-board.tsx (a "use client" component) called these
// r2/client functions directly, causing silent failures on every upload attempt.
// Root cause: H2 — r2/client imports are server-only; client components must
// call server actions instead.
// =============================================================================

import {
  createBriefAssetPutUrl,
  briefObjectPublicUrl,
} from "@/lib/r2/client";

// Phase 3.1 K-05 LOOP 1 HIGH-A F7 fix:
// The legacy getWizardAssetPutUrlAction accepted arbitrary storageKey from the
// client, which let any authenticated caller overwrite known/guessable R2
// objects in the brief bucket. The new getBoardAssetPutUrlAction generates the
// storage key server-side using a UUID and validates content type against a
// strict allow-list. The legacy action is kept for backward-compat but now
// applies the same allow-list and a more restrictive prefix policy.

const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "application/pdf",
]);

const EXT_FOR_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

// Phase 3.0/legacy schema — accepts a client-supplied key but now restricts
// the prefix to a known-safe namespace. Existing callers should migrate to
// getBoardAssetPutUrlAction below.
const wizardAssetPutUrlSchema = z.object({
  storageKey: z
    .string()
    .min(1)
    .max(500)
    // Restrict to known prefixes to prevent overwriting unrelated R2 objects.
    // Must start with a recognized board/wizard asset prefix.
    .refine(
      (k) =>
        k.startsWith("board-assets/") ||
        k.startsWith("wizard-references/") ||
        k.startsWith("project-briefs/"),
      { message: "storageKey prefix not allowed" }
    )
    // No traversal / parent-dir / null bytes
    .refine(
      (k) => !k.includes("..") && !k.includes("\0") && !k.includes("//"),
      { message: "storageKey contains forbidden characters" }
    ),
  contentType: z.string().min(1).max(200),
});

export type WizardAssetPutUrlResult =
  | { ok: true; putUrl: string; publicUrl: string }
  | { ok: false; error: string };

export async function getWizardAssetPutUrlAction(
  storageKey: unknown,
  contentType: unknown
): Promise<WizardAssetPutUrlResult> {
  const parsed = wizardAssetPutUrlSchema.safeParse({ storageKey, contentType });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" };
  }

  // Strict content-type allow-list (HIGH-A F7)
  if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
    return { ok: false, error: "content_type_not_allowed" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // K-05 LOOP 2 HIGH-B fix: bind storageKey to the caller's UUID prefix.
  // The legacy action's prefix-allow-list (board-assets/, wizard-references/,
  // project-briefs/) was insufficient because keys within those namespaces
  // could overwrite OTHER users' assets. Now require keys to start with
  // <prefix>/<user.id>/ so a caller can only write under their own subspace.
  const allowedPrefixes = [
    `board-assets/${user.id}/`,
    `wizard-references/${user.id}/`,
    `project-briefs/${user.id}/`,
  ];
  if (!allowedPrefixes.some((p) => parsed.data.storageKey.startsWith(p))) {
    return { ok: false, error: "storage_key_not_owned" };
  }

  try {
    const putUrl = await createBriefAssetPutUrl(
      parsed.data.storageKey,
      parsed.data.contentType,
      600
    );
    // Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix: use briefObjectPublicUrl which
    // targets BRIEF_BUCKET (where the PUT lands), not BUCKET (the challenges
    // submissions bucket).
    const pubUrl = briefObjectPublicUrl(parsed.data.storageKey);
    return { ok: true, putUrl, publicUrl: pubUrl };
  } catch (err) {
    console.error("[getWizardAssetPutUrlAction] presign failed:", err);
    return { ok: false, error: "presign_failed" };
  }
}

// Phase 3.1 — server-generated key + strict content-type validation.
// Use this for board asset uploads going forward. Legacy
// getWizardAssetPutUrlAction is preserved for back-compat with already-
// shipped client code paths.
const boardAssetPutUrlSchema = z.object({
  contentType: z.string().min(1).max(200),
});

export async function getBoardAssetPutUrlAction(
  contentType: unknown
): Promise<WizardAssetPutUrlResult> {
  const parsed = boardAssetPutUrlSchema.safeParse({ contentType });
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  if (!ALLOWED_CONTENT_TYPES.has(parsed.data.contentType)) {
    return { ok: false, error: "content_type_not_allowed" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Server-generated key: UUID + safe extension. NO client filename trust.
  const ext = EXT_FOR_CONTENT_TYPE[parsed.data.contentType] ?? "bin";
  const uuid = crypto.randomUUID();
  const storageKey = `board-assets/${user.id}/${uuid}.${ext}`;

  try {
    const putUrl = await createBriefAssetPutUrl(
      storageKey,
      parsed.data.contentType,
      600
    );
    // K-05 LOOP 1 HIGH-B F7: BRIEF_BUCKET-targeted public URL.
    const pubUrl = briefObjectPublicUrl(storageKey);
    return { ok: true, putUrl, publicUrl: pubUrl };
  } catch (err) {
    console.error("[getBoardAssetPutUrlAction] presign failed:", err);
    return { ok: false, error: "presign_failed" };
  }
}

// =============================================================================
// Phase 3.0 task_03 — fetchVideoMetadataAction
// =============================================================================
// Server action wrapper around the oEmbed lib. Validates the URL with Zod,
// calls fetchVideoMetadata, and returns the result (or null on any error).
// The "use server" directive at the top of this file covers this action.
// =============================================================================

const videoUrlSchema = z.string().url().max(2000);

export type VideoMetadataResult = OEmbedResult | null;

export async function fetchVideoMetadataAction(
  url: unknown,
): Promise<VideoMetadataResult> {
  const parsed = videoUrlSchema.safeParse(url);
  if (!parsed.success) return null;
  return fetchVideoMetadata(parsed.data);
}

// =============================================================================
// Phase 3.0 task_04 — submitProjectAction (Phase 3.1 task_04 update)
// =============================================================================
// Atomically submits the wizard's draft as a new project with status='in_review'
// (the L-015 auto-transition shortcut — never writes 'submitted' to projects).
//
// Sequence (Phase 3.1):
//   1. INSERT projects with status='in_review' (user-scoped client; RLS
//      INSERT policy allows it since we own the workspace)
//   2. INSERT project_status_history with actor_role='system' — MUST bypass
//      RLS which denies INSERT on this table for all authenticated callers.
//      Resolution: Option A — service-role client scoped to this single INSERT.
//      Service-role usage is strictly scoped; other reads/writes stay on user
//      client.
//   3. RPC seed_project_board_from_wizard(project_id, board_document) —
//      Phase 3.1 replaces the project_references INSERT path.
//      The RPC is SECURITY DEFINER + asserts project.status='in_review'.
//   4. DELETE wizard_drafts row (user-scoped client)
//   5. Send Resend admin + client emails (best-effort, not blocking)
//   6. Emit in-app notification to the submitting user (best-effort, not
//      blocking)
//
// Returns { ok: true, projectId, redirect } on success.
// =============================================================================

import { sendProjectSubmittedAdmin, sendProjectSubmittedClient } from "@/lib/email/project";
import { emitNotification } from "@/lib/notifications/emit";

// =============================================================================
// Phase 3.1 — server-side tldraw store validator (anti-DoS + structural sanity)
// =============================================================================
// K-05 trust boundary: the wizard's boardDocument is client-controlled JSON.
// Server enforces a max serialized size (5MB) AND a minimum structural shape
// (must be either {} or contain a "store" object). Detailed validation of
// every shape's props is impractical for tldraw store snapshots; we trust the
// schema migration version + tldraw's runtime to reject malformed shapes on
// load. Server prevents oversized/wrong-shape payloads only.
function validateTldrawStore(doc: Record<string, unknown>): boolean {
  if (!doc || typeof doc !== "object") return false;
  if (Object.keys(doc).length === 0) return true; // empty board OK
  if (!("store" in doc)) return false;
  const store = (doc as { store: unknown }).store;
  if (typeof store !== "object" || store === null) return false;
  return true;
}

// Phase 3.1 hotfix-3: attachment sub-schemas (L-026 — must stay in sync with
// client-side wizard state types and task_02 PdfAttachment/UrlAttachment types).
const PdfAttachmentSchema = z.object({
  id: z.string().uuid(),
  storage_key: z.string().regex(/^project-(wizard|board)\//),
  filename: z.string().min(1).max(200),
  size_bytes: z.number().int().positive().max(20 * 1024 * 1024),
  uploaded_at: z.string(),
  uploaded_by: z.string(),
});

const UrlAttachmentSchema = z.object({
  id: z.string().uuid(),
  url: z.string()
    .min(1)
    .max(2000)
    .refine(
      (u) => {
        try {
          const p = new URL(u);
          return p.protocol === "http:" || p.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "URL must be http:// or https://" }
    ),
  title: z.string().max(200).nullable(),
  thumbnail_url: z.string().max(2000).nullable(),
  provider: z.enum(["youtube", "vimeo", "generic"]),
  note: z.string().max(500).nullable(),
  added_at: z.string(),
  added_by: z.string(),
});

const SubmitInputSchema = z.object({
  name: z.string().min(1).max(80),
  // hotfix-2: max reduced to 500 to match client wizardSchema (L-026 — keep in sync)
  description: z.string().min(1).max(500),
  deliverable_types: z.array(z.string()).min(1),
  budget_band: z.enum(["under_1m", "1m_to_5m", "5m_to_10m", "negotiable"]),
  delivery_date: z.string().nullable().optional(),
  // Phase 3.1: replaces references[] with a tldraw store snapshot.
  // Server-side validation: 5MB serialized cap (anti-DoS) + structural sanity.
  boardDocument: z
    .record(z.string(), z.unknown())
    .refine(
      (doc) => {
        try {
          const serialized = JSON.stringify(doc);
          return serialized.length <= 5 * 1024 * 1024;
        } catch {
          return false;
        }
      },
      { message: "boardDocument exceeds 5MB or is not serializable" }
    )
    .refine(validateTldrawStore, {
      message: "boardDocument is not a valid tldraw store snapshot",
    })
    .default({}),
  // Phase 3.1 hotfix-3: structured attachment columns (Q-AA)
  // Server validates shape/size/scheme (L-026 — synced with client wizard state)
  attachedPdfs: z.array(PdfAttachmentSchema).max(30).optional().default([]),
  attachedUrls: z.array(UrlAttachmentSchema).max(50).optional().default([]),
  // workspaceId is optional when draftProjectId is provided — the action
  // resolves it from the draft project row in that case. One of the two
  // must be present for workspace resolution to succeed.
  workspaceId: z.string().uuid().optional(),
  // draftProjectId: the wizard's autosave-created draft project. When
  // present, workspace is resolved from it. The draft row is deleted after
  // the real project INSERT succeeds.
  draftProjectId: z.string().uuid().nullable().optional(),
});

export type SubmitProjectInput = z.infer<typeof SubmitInputSchema>;

export type SubmitProjectResult =
  | { ok: true; projectId: string; redirect: string }
  | { ok: false; error: "unauthenticated" | "validation" | "db"; message?: string };

export async function submitProjectAction(
  input: unknown
): Promise<SubmitProjectResult> {
  // Parse + validate input
  const parsed = SubmitInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const data = parsed.data;

  // Auth check
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { ok: false, error: "unauthenticated" };

  // Resolve workspaceId: prefer explicit workspaceId from input; fall back to
  // looking it up from the draft project row; then fall back to user membership.
  let resolvedWorkspaceId: string | null = data.workspaceId ?? null;
  if (!resolvedWorkspaceId && data.draftProjectId) {
    const { data: draftRow } = await supabase
      .from("projects")
      .select("workspace_id")
      .eq("id", data.draftProjectId)
      .maybeSingle();
    resolvedWorkspaceId = draftRow?.workspace_id ?? null;
  }
  if (!resolvedWorkspaceId) {
    const { data: mem } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    resolvedWorkspaceId = mem?.workspace_id ?? null;
  }
  if (!resolvedWorkspaceId) {
    return { ok: false, error: "db", message: "workspace not found for user" };
  }

  // Phase 3.0 columns (budget_band, submitted_at, kind) are not in the
  // generated database.types.ts yet — use any cast for this INSERT only.
  // Same pattern as task_05 used in page.tsx.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.0 columns not in generated types
  const supabaseAny = supabase as any;

  // 1. INSERT projects with status='in_review' (L-015 auto-transition; INSERT
  //    is allowed by projects_insert RLS policy for authenticated callers who
  //    are workspace members. Direct UPDATE to status is forbidden by trigger
  //    guard but INSERT with the target status is the allowed L-015 path.)
  const { data: project, error: projErr } = await supabaseAny
    .from("projects")
    .insert({
      // 'name' column does not exist on projects — map to 'title' (existing column)
      title: data.name,
      // 'description' maps to 'brief' on the projects table
      brief: data.description,
      deliverable_types: data.deliverable_types,
      budget_band: data.budget_band,
      // delivery_date maps to target_delivery_at
      target_delivery_at: data.delivery_date ?? null,
      workspace_id: resolvedWorkspaceId,
      created_by: user.id,
      status: "in_review",
      submitted_at: new Date().toISOString(),
      kind: "direct",
      // project_type stays as 'direct_commission' for backward compat
      project_type: "direct_commission",
      intake_mode: "brief",
    })
    .select("id")
    .single() as { data: { id: string } | null; error: { message: string } | null };

  if (projErr || !project) {
    console.error("[submitProjectAction] projects INSERT error:", projErr);
    return {
      ok: false,
      error: "db",
      message: projErr?.message ?? "project insert failed",
    };
  }

  // 2. INSERT project_status_history with actor_role='system'.
  //    Option A: service-role client for this single statement only (bypasses
  //    the psh_insert_deny RLS policy which blocks all authenticated users).
  //    The service-role client is NOT used for any other read/write in this action.
  //    project_status_history is a Phase 3.0 table — not in generated types yet.
  const service = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceAny = service as any;
  const { error: histErr } = await serviceAny
    .from("project_status_history")
    .insert({
      project_id: project.id,
      from_status: "submitted",   // logical from-state (L-015: submitted→in_review)
      to_status: "in_review",
      actor_id: user.id,
      actor_role: "system",
      comment: null,
    }) as { error: { message: string } | null };

  if (histErr) {
    console.error("[submitProjectAction] history INSERT error:", histErr);
    // History failure is non-fatal in prod but should alert — do not roll back
    // the project, log and continue. K-05 review can decide if we want to roll
    // back on history failure.
    console.error("[submitProjectAction] WARN: history row missing for project", project.id);
  }

  // 3. Phase 3.1 — Seed the project_boards row via RPC.
  //    Replaces the old project_references[] INSERT path. The RPC is
  //    SECURITY DEFINER + asserts caller owns the project (K-05 LOOP 1 F1 fix)
  //    AND project.status='in_review'. ON CONFLICT (project_id) DO UPDATE so
  //    re-submits are idempotent.
  //    K-05 HIGH-B F5 fix: server-recompute asset_index from the board document
  //    so admin queue/detail counts are accurate immediately after submit
  //    (K-05 trust boundary — never trust client-supplied asset_index).
  const seedDocument = data.boardDocument ?? {};
  const seedAttachedPdfs = data.attachedPdfs ?? [];
  const seedAttachedUrls = data.attachedUrls ?? [];
  // Phase 3.1 hotfix-3: compute unified asset_index from all three sources
  // (canvas shapes + attached PDFs + attached URLs). Trust boundary: server
  // always recomputes — never accepts client-supplied asset_index (L-041).
  const seedAssetIndex = extractAssetIndex(
    seedDocument as Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
    seedAttachedPdfs as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: attachment types not in generated types yet
    seedAttachedUrls as any,
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: RPC not in generated types
  const { error: seedErr } = await (supabase as any).rpc(
    "seed_project_board_from_wizard",
    {
      p_project_id: project.id,
      p_initial_document: seedDocument,
      p_initial_attached_pdfs: seedAttachedPdfs,
      p_initial_attached_urls: seedAttachedUrls,
      p_initial_asset_index: seedAssetIndex,
    }
  );
  if (seedErr) {
    console.error("[submitProjectAction] seed_project_board_from_wizard error:", seedErr);
    // Non-fatal — the project exists; admin can manually init via init_project_board.
    // K-05 reviewer can decide if hard rollback is needed; default = continue.
  }

  // 4. Delete wizard_drafts row. wizard_drafts may not be a real table — silently
  //    ignore errors (it's only a cleanup step). If the table doesn't exist the
  //    error is swallowed. Use any cast since it may not be in generated types.
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("wizard_drafts").delete().eq("user_id", user.id);
  } catch {
    // best-effort — ignore
  }
  // Also clean up any lingering draft project rows in status='draft' for this
  // user in this workspace, since the real project is now submitted.
  await supabase
    .from("projects")
    .delete()
    .eq("workspace_id", resolvedWorkspaceId)
    .eq("created_by", user.id)
    .eq("status", "draft")
    .eq("intake_mode", "brief")
    .neq("id", project.id);

  // 5. Resend emails (best-effort — must not block or throw)
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const adminQueueUrl = `${baseUrl}/app/admin/projects`;
  const projectUrl = `${baseUrl}/app/projects/${project.id}`;

  // Resolve caller's locale and email for the client confirmation
  let clientEmail: string | null = null;
  let clientLocale: "ko" | "en" = "ko";
  let clientName = "Client";
  let workspaceName = "Workspace";
  try {
    const [emailRes, profileRes, workspaceRes] = await Promise.all([
      service.auth.admin.getUserById(user.id),
      service.from("profiles").select("display_name, handle, locale").eq("id", user.id).maybeSingle(),
      service.from("workspaces").select("name").eq("id", resolvedWorkspaceId).maybeSingle(),
    ]);
    clientEmail = emailRes.data?.user?.email ?? null;
    const profile = profileRes.data;
    if (profile?.locale === "en") clientLocale = "en";
    clientName = profile?.display_name ?? profile?.handle ?? "Client";
    workspaceName = workspaceRes.data?.name ?? "Workspace";
  } catch (e) {
    console.error("[submitProjectAction] profile/email lookup failed", e);
  }

  // Admin notification
  const adminEmail = process.env.YAGI_ADMIN_EMAIL ?? "yagi@yagiworkshop.xyz";
  try {
    await sendProjectSubmittedAdmin({
      to: adminEmail,
      projectName: data.name,
      projectId: project.id,
      locale: clientLocale,
      dashboardUrl: adminQueueUrl,
      clientName,
      workspaceName,
      budgetBand: data.budget_band,
      deliveryDate: data.delivery_date ?? undefined,
    });
  } catch (e) {
    console.error("[submitProjectAction] admin email send failed", e);
  }

  // Client confirmation
  if (clientEmail) {
    try {
      await sendProjectSubmittedClient({
        to: clientEmail,
        projectName: data.name,
        projectId: project.id,
        locale: clientLocale,
        dashboardUrl: projectUrl,
      });
    } catch (e) {
      console.error("[submitProjectAction] client email send failed", e);
    }
  }

  // 6. In-app notification (best-effort)
  try {
    await emitNotification({
      user_id: user.id,
      kind: "project_submitted",
      project_id: project.id,
      workspace_id: resolvedWorkspaceId,
      payload: { project_name: data.name },
      url_path: `/app/projects/${project.id}`,
    });
  } catch (e) {
    console.error("[submitProjectAction] in-app notification failed", e);
  }

  revalidatePath("/[locale]/app/projects", "page");
  revalidatePath(`/[locale]/app/projects/${project.id}`, "page");

  return {
    ok: true,
    projectId: project.id,
    redirect: `/app/projects/${project.id}`,
  };
}
