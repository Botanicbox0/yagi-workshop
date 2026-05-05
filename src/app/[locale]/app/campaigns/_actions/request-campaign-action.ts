"use server";

// Phase 7 Wave B.1 — Sponsor (brand/artist workspace) campaign request action.
//
// Differs from createCampaignAction (admin Route A): uses the SESSION client,
// not service-role. The migration's `campaigns_insert_sponsor` RLS WITH CHECK
// + column-level INSERT GRANT lock the row to:
//   - status = 'requested'
//   - created_by = auth.uid()
//   - sponsor_workspace_id = workspace member with kind IN ('brand','artist')
//   - admin/audit fields untouched (defaults / NULL)
// The action layer adds:
//   - input shape validation (title, brief, contact_phone required)
//   - request_metadata jsonb shape (Q6 lock: contact_phone required)
//   - membership pre-check so failures surface as friendly errors (not 42501)

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { emitNotification } from "@/lib/notifications/emit";
import type { Json } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

const ReferenceAssetSchema = z.object({
  url: z.string().url(),
  label: z.string().min(1).max(200),
});

const RequestCampaignInputSchema = z.object({
  workspace_id: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  brief: z.string().trim().min(1).max(5000),
  reference_assets: z.array(ReferenceAssetSchema).max(20).optional(),
  contact_phone: z
    .string()
    .trim()
    .min(7, "phone_too_short")
    .max(40, "phone_too_long"),
  schedule_intent: z.string().trim().max(2000).optional(),
  sponsorship_intent: z
    .enum(["self", "co_sponsor", "yagi_assist"])
    .optional(),
  compensation_intent: z
    .enum(["exposure_only", "fixed_fee"])
    .optional(),
  compensation_fixed_fee_per_creator: z.number().int().nonnegative().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export type RequestCampaignInput = z.infer<typeof RequestCampaignInputSchema>;

export type RequestCampaignResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Slug — same pattern as createCampaignAction
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
// requestCampaignAction
// ---------------------------------------------------------------------------

export async function requestCampaignAction(
  raw: unknown,
): Promise<RequestCampaignResult> {
  const parsed = RequestCampaignInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "input_invalid" };
  }
  const input = parsed.data;

  // Cross-field: fixed_fee compensation requires a positive fee amount
  if (
    input.compensation_intent === "fixed_fee" &&
    !(input.compensation_fixed_fee_per_creator && input.compensation_fixed_fee_per_creator > 0)
  ) {
    return { ok: false, error: "fixed_fee_amount_required" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };

  // Defense-in-depth: confirm membership + sponsor-eligible workspace.kind
  // before triggering the RLS WITH CHECK (which would return a less friendly
  // 42501). RLS still enforces the same check; this surfaces the right error
  // to the form.
  const { data: membership, error: memErr } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(id, kind)")
    .eq("user_id", user.id)
    .eq("workspace_id", input.workspace_id)
    .maybeSingle();

  if (memErr || !membership) return { ok: false, error: "not_a_member" };

  const wsKind = (membership as { workspaces?: { kind?: string } }).workspaces?.kind;
  if (wsKind !== "brand" && wsKind !== "artist") {
    return { ok: false, error: "workspace_not_sponsor_eligible" };
  }

  // Build request_metadata JSONB
  const requestMetadata: Record<string, Json> = {
    contact_phone: input.contact_phone,
  };
  if (input.schedule_intent) requestMetadata.schedule_intent = input.schedule_intent;
  if (input.sponsorship_intent) requestMetadata.sponsorship_intent = input.sponsorship_intent;
  if (input.compensation_intent) {
    requestMetadata.compensation_intent = input.compensation_intent;
    if (input.compensation_intent === "fixed_fee") {
      requestMetadata.compensation_fixed_fee_per_creator =
        input.compensation_fixed_fee_per_creator!;
    }
  }
  if (input.notes) requestMetadata.notes = input.notes;

  const slug = generateSlug(input.title);
  const nowIso = new Date().toISOString();

  // INSERT via session client — RLS + column-level INSERT GRANT enforce:
  //   - status='requested', created_by=auth.uid(), sponsor membership + kind
  //   - admin/audit columns are NOT GRANTed and excluded here.
  const { data: row, error: insertErr } = await supabase
    .from("campaigns")
    .insert({
      slug,
      title: input.title,
      brief: input.brief,
      reference_assets: (input.reference_assets ?? []) as Json,
      sponsor_workspace_id: input.workspace_id,
      status: "requested",
      request_metadata: requestMetadata as Json,
      created_by: user.id,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("[requestCampaignAction] insert error:", insertErr?.message);
    return { ok: false, error: "insert_failed" };
  }

  // Notify the requester (in-app + digest email per notification preferences).
  // Wave B.2 admin transitions emit the other 3 events (in_review/approved/declined).
  try {
    await emitNotification({
      user_id: user.id,
      kind: "campaign_request_received",
      workspace_id: input.workspace_id,
      payload: { title: input.title },
      url_path: `/app/campaigns/request`,
    });
  } catch (err) {
    // Non-fatal: row is committed.
    console.error("[requestCampaignAction] notify error:", err);
  }

  revalidatePath(`/ko/app/campaigns/request`);
  revalidatePath(`/en/app/campaigns/request`);

  return { ok: true, id: row.id };
}
