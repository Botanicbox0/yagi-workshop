"use server";

// Phase 7 Wave A.2 — Admin campaign server actions
//
// Auth gate: every action calls getAuthenticatedAdmin() first.
// Uses service-role client for writes so RLS column-level grant on
// campaigns.status (yagi_admin only) doesn't block admin writes.
// The is_yagi_admin RPC is called via the session client (not service)
// so the check runs in the caller's auth context.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitNotification } from "@/lib/notifications/emit";
import type { NotificationKind } from "@/lib/notifications/kinds";
import type { Database, Json } from "@/lib/supabase/database.types";

type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];

// ---------------------------------------------------------------------------
// Zod schemas for JSONB fields (K-05 MED-A inline fix)
// ---------------------------------------------------------------------------

const ReferenceAssetSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1).max(200),
});

const ReferenceAssetsSchema = z
  .array(ReferenceAssetSchema)
  .max(20);

/** Base compensation metadata — flat record, no nested objects */
const CompensationMetadataBaseSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()])
);

/** Shaped validation: fixed_fee model requires fixed_fee_per_creator */
function validateCompensationMetadata(
  model: string | undefined,
  raw: Record<string, unknown> | null | undefined
): { ok: true } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true };

  const baseResult = CompensationMetadataBaseSchema.safeParse(raw);
  if (!baseResult.success) {
    return { ok: false, error: "compensation_metadata_invalid" };
  }

  if (model === "fixed_fee") {
    const feeResult = z
      .object({ fixed_fee_per_creator: z.number().positive() })
      .safeParse(raw);
    if (!feeResult.success) {
      return {
        ok: false,
        error: "compensation_metadata_fixed_fee_per_creator_required",
      };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type ReferenceAsset = {
  url: string;
  label: string;
};

export type CategoryInput = {
  name: string;
  description?: string;
  format_spec?: string;
};

export type CompensationModel = "exposure_only" | "fixed_fee" | "royalty_share";

export type CreateCampaignInput = {
  title: string;
  description?: string;
  brief?: string;
  reference_assets?: ReferenceAsset[];
  categories: CategoryInput[];
  allow_r2_upload: boolean;
  allow_external_url: boolean;
  compensation_model: CompensationModel;
  compensation_metadata?: Record<string, unknown>;
  submission_open_at?: string | null;
  submission_close_at?: string | null;
};

export type UpdateCampaignInput = {
  title?: string;
  description?: string | null;
  brief?: string | null;
  reference_assets?: ReferenceAsset[];
  allow_r2_upload?: boolean;
  allow_external_url?: boolean;
  compensation_model?: CompensationModel;
  compensation_metadata?: Record<string, unknown> | null;
  submission_open_at?: string | null;
  submission_close_at?: string | null;
};

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

async function getAuthenticatedAdmin(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const { data: isAdmin, error: rpcErr } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (rpcErr || !isAdmin) return { ok: false, error: "not_admin" };

  return { ok: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
  const suffix = Date.now().toString(36).slice(-4);
  return `${base || "campaign"}-${suffix}`;
}

// ---------------------------------------------------------------------------
// Revalidation helper
// ---------------------------------------------------------------------------

function revalidateCampaigns(id?: string) {
  for (const locale of ["ko", "en"]) {
    revalidatePath(`/${locale}/app/admin/campaigns`);
    if (id) revalidatePath(`/${locale}/app/admin/campaigns/${id}`);
  }
}

// ---------------------------------------------------------------------------
// createCampaignAction
// ---------------------------------------------------------------------------

export async function createCampaignAction(
  input: CreateCampaignInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const title = input.title.trim();
  if (!title || title.length < 1 || title.length > 200) {
    return { ok: false, error: "title_invalid" };
  }
  if (!input.categories || input.categories.length === 0) {
    return { ok: false, error: "categories_required" };
  }

  // Validate JSONB fields (K-05 MED-A)
  if (input.reference_assets !== undefined) {
    const refResult = ReferenceAssetsSchema.safeParse(input.reference_assets);
    if (!refResult.success) {
      return { ok: false, error: "reference_assets_invalid" };
    }
  }
  const compCheck = validateCompensationMetadata(
    input.compensation_model,
    input.compensation_metadata
  );
  if (!compCheck.ok) return { ok: false, error: compCheck.error };

  const slug = generateSlug(title);
  const sbAdmin = createSupabaseService();

  const { data: campaign, error: insertErr } = await sbAdmin
    .from("campaigns")
    .insert({
      title,
      slug,
      description: input.description ?? null,
      brief: input.brief ?? null,
      reference_assets: (input.reference_assets ?? []) as Json,
      allow_r2_upload: input.allow_r2_upload,
      allow_external_url: input.allow_external_url,
      compensation_model: input.compensation_model,
      compensation_metadata: (input.compensation_metadata ?? null) as Json,
      submission_open_at: input.submission_open_at ?? null,
      submission_close_at: input.submission_close_at ?? null,
      status: "draft",
      sponsor_workspace_id: null,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (insertErr || !campaign) {
    console.error("[createCampaignAction] insert error:", insertErr?.message);
    return { ok: false, error: "insert_failed" };
  }

  // Insert categories
  if (input.categories.length > 0) {
    const catRows = input.categories.map((cat, idx) => ({
      campaign_id: campaign.id,
      name: cat.name.trim(),
      description: cat.description ?? null,
      format_spec: cat.format_spec
        ? ({ spec: cat.format_spec } as Json)
        : null,
      display_order: idx,
    }));

    const { error: catErr } = await sbAdmin.from("campaign_categories").insert(catRows);
    if (catErr) {
      console.error("[createCampaignAction] categories insert error:", catErr.message);
      // Non-fatal — campaign row succeeded; categories can be added later
    }
  }

  revalidateCampaigns(campaign.id);
  return { ok: true, id: campaign.id };
}

// ---------------------------------------------------------------------------
// updateCampaignAction
// ---------------------------------------------------------------------------

export async function updateCampaignAction(
  campaignId: string,
  patch: UpdateCampaignInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t || t.length < 1 || t.length > 200) {
      return { ok: false, error: "title_invalid" };
    }
    patch = { ...patch, title: t };
  }

  // Validate JSONB fields (K-05 MED-A)
  if (patch.reference_assets !== undefined) {
    const refResult = ReferenceAssetsSchema.safeParse(patch.reference_assets);
    if (!refResult.success) {
      return { ok: false, error: "reference_assets_invalid" };
    }
  }
  if (patch.compensation_metadata !== undefined && patch.compensation_metadata !== null) {
    const compCheck = validateCompensationMetadata(
      patch.compensation_model,
      patch.compensation_metadata
    );
    if (!compCheck.ok) return { ok: false, error: compCheck.error };
  }

  const sbAdmin = createSupabaseService();

  // Build update object — typed as CampaignUpdate to satisfy supabase-js strict overload
  const update: CampaignUpdate = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) update.title = patch.title;
  if (patch.description !== undefined) update.description = patch.description;
  if (patch.brief !== undefined) update.brief = patch.brief;
  if (patch.reference_assets !== undefined)
    update.reference_assets = patch.reference_assets as Json;
  if (patch.allow_r2_upload !== undefined) update.allow_r2_upload = patch.allow_r2_upload;
  if (patch.allow_external_url !== undefined)
    update.allow_external_url = patch.allow_external_url;
  if (patch.compensation_model !== undefined)
    update.compensation_model = patch.compensation_model;
  if (patch.compensation_metadata !== undefined)
    update.compensation_metadata = (patch.compensation_metadata ?? null) as Json;
  if (patch.submission_open_at !== undefined)
    update.submission_open_at = patch.submission_open_at;
  if (patch.submission_close_at !== undefined)
    update.submission_close_at = patch.submission_close_at;

  const { error } = await sbAdmin
    .from("campaigns")
    .update(update)
    .eq("id", campaignId);

  if (error) {
    console.error("[updateCampaignAction] update error:", error.message);
    return { ok: false, error: "update_failed" };
  }

  revalidateCampaigns(campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// publishCampaignAction
// ---------------------------------------------------------------------------

export async function publishCampaignAction(
  campaignId: string,
  options?: { submission_open_at?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const sbAdmin = createSupabaseService();

  // Verify current status is draft
  const { data: campaign, error: fetchErr } = await sbAdmin
    .from("campaigns")
    .select("status")
    .eq("id", campaignId)
    .maybeSingle();

  if (fetchErr || !campaign) return { ok: false, error: "not_found" };
  if (campaign.status !== "draft") return { ok: false, error: "not_draft" };

  const openAt = options?.submission_open_at ?? new Date().toISOString();

  const { error } = await sbAdmin
    .from("campaigns")
    .update({
      status: "published",
      submission_open_at: openAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  if (error) {
    console.error("[publishCampaignAction] update error:", error.message);
    return { ok: false, error: "update_failed" };
  }

  revalidateCampaigns(campaignId);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// addCategoryAction
// ---------------------------------------------------------------------------

export async function addCategoryAction(
  campaignId: string,
  category: CategoryInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const name = category.name.trim();
  if (!name) return { ok: false, error: "name_required" };

  const sbAdmin = createSupabaseService();

  // Get current max display_order
  const { data: existing } = await sbAdmin
    .from("campaign_categories")
    .select("display_order")
    .eq("campaign_id", campaignId)
    .order("display_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? (existing[0].display_order ?? 0) + 1 : 0;

  const { data: cat, error } = await sbAdmin
    .from("campaign_categories")
    .insert({
      campaign_id: campaignId,
      name,
      description: category.description ?? null,
      format_spec: category.format_spec
        ? ({ spec: category.format_spec } as Json)
        : null,
      display_order: nextOrder,
    })
    .select("id")
    .single();

  if (error || !cat) {
    console.error("[addCategoryAction] insert error:", error?.message);
    return { ok: false, error: "insert_failed" };
  }

  revalidateCampaigns(campaignId);
  return { ok: true, id: cat.id };
}

// ===========================================================================
// Phase 7 Wave B.2 — Sponsor request review workflow (4 transitions)
//
// Transitions modeled per KICKOFF §B.2:
//   reviewCampaignRequestAction       requested  → in_review
//   approveCampaignRequestAction      in_review  → draft
//   declineCampaignRequestAction      in_review  → declined
//   requestMoreInfoAction             in_review  → requested
//
// All four are admin-only (getAuthenticatedAdmin gate). All writes go through
// service-role because campaigns.status + decision_metadata are admin-only
// per the migration's column-level GRANT lockdown. Each transition appends
// to decision_metadata.history (audit trail) and emits a sponsor-side
// notification.
// ===========================================================================

type DecisionHistoryEntry = {
  at: string;
  by: string;
  action: "review_started" | "approved" | "declined" | "more_info_requested";
  comment: string | null;
};

type DecisionMetadataShape = {
  history?: DecisionHistoryEntry[];
  // last applied note — kept at top level for cheap UI preview
  note?: string | null;
};

const ReviewCommentSchema = z.string().trim().max(2000).optional();

async function fetchCampaignForReview(
  campaignId: string,
): Promise<
  | {
      ok: true;
      row: {
        id: string;
        title: string;
        status: string;
        sponsor_workspace_id: string | null;
        decision_metadata: DecisionMetadataShape | null;
        created_by: string;
      };
    }
  | { ok: false; error: string }
> {
  const sbAdmin = createSupabaseService();
  const { data, error } = await sbAdmin
    .from("campaigns")
    .select(
      "id, title, status, sponsor_workspace_id, decision_metadata, created_by",
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "not_found" };
  return {
    ok: true,
    row: data as {
      id: string;
      title: string;
      status: string;
      sponsor_workspace_id: string | null;
      decision_metadata: DecisionMetadataShape | null;
      created_by: string;
    },
  };
}

function appendHistory(
  prior: DecisionMetadataShape | null,
  entry: DecisionHistoryEntry,
): DecisionMetadataShape {
  const history = prior?.history ?? [];
  return {
    ...(prior ?? {}),
    history: [...history, entry],
    note: entry.comment,
  };
}

async function notifyRequester(
  campaignId: string,
  recipientUserId: string,
  workspaceId: string | null,
  kind: NotificationKind,
  title: string,
): Promise<void> {
  try {
    await emitNotification({
      user_id: recipientUserId,
      kind,
      workspace_id: workspaceId ?? undefined,
      payload: { title },
      url_path: `/app/campaigns/request`,
    });
  } catch (err) {
    // Non-fatal: status transition has already committed.
    console.error(`[campaign-actions] notify ${kind} failed:`, err);
  }
  void campaignId;
}

async function transitionRequestStatus(
  campaignId: string,
  options: {
    requireFromStatus: string[];
    nextStatus: "in_review" | "draft" | "declined" | "requested";
    historyAction: DecisionHistoryEntry["action"];
    notificationKind: NotificationKind;
    rawComment?: unknown;
    requireComment?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAuthenticatedAdmin();
  if (!auth.ok) return { ok: false, error: auth.error };

  const commentParse = ReviewCommentSchema.safeParse(options.rawComment ?? undefined);
  if (!commentParse.success) return { ok: false, error: "comment_invalid" };
  const comment = commentParse.data ?? null;

  if (options.requireComment && (!comment || comment.length === 0)) {
    return { ok: false, error: "comment_required" };
  }

  const fetched = await fetchCampaignForReview(campaignId);
  if (!fetched.ok) return { ok: false, error: fetched.error };
  const row = fetched.row;

  if (!options.requireFromStatus.includes(row.status)) {
    return { ok: false, error: "wrong_status" };
  }

  const sbAdmin = createSupabaseService();
  const nowIso = new Date().toISOString();

  const newMetadata = appendHistory(row.decision_metadata, {
    at: nowIso,
    by: auth.userId,
    action: options.historyAction,
    comment: comment ?? null,
  });

  const { error: updateErr } = await sbAdmin
    .from("campaigns")
    .update({
      status: options.nextStatus,
      decision_metadata: newMetadata as Json,
      updated_at: nowIso,
    })
    .eq("id", campaignId);

  if (updateErr) {
    console.error("[transitionRequestStatus] update error:", updateErr.message);
    return { ok: false, error: "update_failed" };
  }

  // Notify the original requester (created_by) — they always have visibility
  // even after switching workspaces. Workspace context preserved so the
  // notification surfaces in the right bell.
  await notifyRequester(
    campaignId,
    row.created_by,
    row.sponsor_workspace_id,
    options.notificationKind,
    row.title,
  );

  revalidateCampaigns(campaignId);
  return { ok: true };
}

export async function reviewCampaignRequestAction(
  campaignId: string,
  rawComment?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transitionRequestStatus(campaignId, {
    requireFromStatus: ["requested"],
    nextStatus: "in_review",
    historyAction: "review_started",
    notificationKind: "campaign_request_in_review",
    rawComment,
  });
}

export async function approveCampaignRequestAction(
  campaignId: string,
  rawComment?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transitionRequestStatus(campaignId, {
    requireFromStatus: ["in_review"],
    nextStatus: "draft",
    historyAction: "approved",
    notificationKind: "campaign_request_approved",
    rawComment,
  });
}

export async function declineCampaignRequestAction(
  campaignId: string,
  rawComment?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transitionRequestStatus(campaignId, {
    requireFromStatus: ["in_review"],
    nextStatus: "declined",
    historyAction: "declined",
    notificationKind: "campaign_request_declined",
    rawComment,
    requireComment: true,
  });
}

export async function requestMoreInfoAction(
  campaignId: string,
  rawComment?: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return transitionRequestStatus(campaignId, {
    requireFromStatus: ["in_review"],
    nextStatus: "requested",
    historyAction: "more_info_requested",
    notificationKind: "campaign_request_more_info",
    rawComment,
    requireComment: true,
  });
}
