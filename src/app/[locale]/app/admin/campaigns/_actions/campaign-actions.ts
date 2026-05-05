"use server";

// Phase 7 Wave A.2 — Admin campaign server actions
//
// Auth gate: every action calls getAuthenticatedAdmin() first.
// Uses service-role client for writes so RLS column-level grant on
// campaigns.status (yagi_admin only) doesn't block admin writes.
// The is_yagi_admin RPC is called via the session client (not service)
// so the check runs in the caller's auth context.

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { Database, Json } from "@/lib/supabase/database.types";

type CampaignUpdate = Database["public"]["Tables"]["campaigns"]["Update"];

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
