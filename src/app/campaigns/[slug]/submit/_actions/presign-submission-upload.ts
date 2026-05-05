"use server";

// Phase 7 Wave C.2 — Presigned R2 PUT URL for campaign submission uploads.
//
// Public action — anon callers OK (consistent with the submit form being
// reachable to anonymous applicants). Defense-in-depth:
//   - Only fires when campaign.allow_r2_upload = true on a published campaign.
//   - Bound key prefix: tmp/campaigns/<campaign_id>/<uuid>/<filename>.
//     Atomic move to submissions/campaigns/<campaign_id>/<submission_id>/...
//     deferred to the submission action's post-INSERT step (next iteration —
//     for MVP, the submission row stores the tmp path verbatim and the
//     content stays under tmp/* until C.4 cleanup. Acceptable since R2 doesn't
//     bill for object listing under our quota and tmp/* is auth-gated by
//     the bucket's R2 access rules.).
//   - Bounded contentType (must start with image/* or video/*).
//   - Bounded filename (length + character class) to prevent path traversal.

import { z } from "zod";
import { randomUUID } from "node:crypto";
import { createSupabaseService } from "@/lib/supabase/service";
import { createPresignedPutUrl, BUCKET, objectPublicUrl } from "@/lib/r2/client";

const PresignInputSchema = z.object({
  campaign_slug: z.string().trim().min(1).max(120),
  filename: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[\w.\- ()[\]가-힣]+$/, "filename_invalid"),
  content_type: z.string().trim().min(1).max(120),
  size_bytes: z.number().int().min(1).max(500 * 1024 * 1024), // 500MB ceiling
});

export type PresignSubmissionResult =
  | {
      ok: true;
      put_url: string;
      object_key: string;
      public_url: string;
      bucket: string;
    }
  | { ok: false; error: string };

const ALLOWED_PREFIXES = ["image/", "video/", "application/pdf"];

export async function presignSubmissionUpload(
  raw: unknown,
): Promise<PresignSubmissionResult> {
  const parsed = PresignInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "input_invalid" };
  }
  const input = parsed.data;

  const ct = input.content_type.toLowerCase();
  if (!ALLOWED_PREFIXES.some((p) => ct.startsWith(p))) {
    return { ok: false, error: "content_type_not_allowed" };
  }

  const sbAdmin = createSupabaseService();
  const { data: campaign, error } = await sbAdmin
    .from("campaigns")
    .select("id, status, allow_r2_upload")
    .eq("slug", input.campaign_slug)
    .maybeSingle();

  if (error || !campaign) return { ok: false, error: "campaign_not_found" };
  if (campaign.status !== "published") return { ok: false, error: "campaign_not_open" };
  if (!campaign.allow_r2_upload) return { ok: false, error: "r2_upload_not_allowed" };

  // Server-controlled key — applicant cannot influence the prefix or the
  // per-upload UUID slot.
  const safeFilename = input.filename.replace(/\s+/g, "-");
  const objectKey = `tmp/campaigns/${campaign.id}/${randomUUID()}/${safeFilename}`;

  let putUrl: string;
  try {
    putUrl = await createPresignedPutUrl(objectKey, input.content_type, 3600);
  } catch (err) {
    console.error("[presign-submission] r2 sign error:", err);
    return { ok: false, error: "presign_failed" };
  }

  return {
    ok: true,
    put_url: putUrl,
    object_key: objectKey,
    public_url: objectPublicUrl(objectKey),
    bucket: BUCKET,
  };
}
