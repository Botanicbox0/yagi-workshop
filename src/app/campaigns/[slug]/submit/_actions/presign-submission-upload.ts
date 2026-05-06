"use server";

// Wave C v2 — Presigned R2 PUT URL for campaign submission uploads.
// Public action (anon callers OK). Per SPEC §4 MED-3 + §3 HIGH-2.
//
// Hardening (vs prior Wave C v1 finding K-05 #5 + #2):
//   - Per-IP rate-limit (10 / hour, MED-3)
//   - Submission window check: campaign.status='published' + within
//     submission_close_at (MED-3)
//   - Issues HMAC-signed upload token bound to (campaign_id, nonce, ip_hash)
//     — token returned to client and re-presented in the submit action so
//     the R2 key cannot be forged across campaigns (HIGH-2)
//   - 200MB ceiling (was 500MB, MED-3)
//   - Bounded contentType (image/* | video/* | application/pdf)
//   - Bounded filename (length + character class)
//   - Server-controlled key prefix `tmp/campaigns/${campaign.id}/${nonce}/`
//
// R2 lifecycle rule (set in Cloudflare Dashboard, manual yagi action — STEP 7):
// `tmp/*` objects expire after 24 hours so abandoned uploads don't accumulate.

import { z } from "zod";
import { headers } from "next/headers";
import { createSupabaseService } from "@/lib/supabase/service";
import { createPresignedPutUrl, BUCKET, objectPublicUrl } from "@/lib/r2/client";
import { checkPresignLimit } from "@/lib/ratelimit";
import { issueUploadToken, objectKeyPrefix } from "@/lib/upload-token";

const MAX_BYTES = 200 * 1024 * 1024; // 200MB

const PresignInputSchema = z.object({
  campaign_slug: z.string().trim().min(1).max(120),
  filename: z
    .string()
    .trim()
    .min(1)
    .max(180)
    .regex(/^[\w.\-]+$/, "filename_invalid"),
  content_type: z.string().trim().min(1).max(120),
  size_bytes: z.number().int().min(1).max(MAX_BYTES),
});

export type PresignSubmissionResult =
  | {
      ok: true;
      put_url: string;
      object_key: string;
      public_url: string;
      bucket: string;
      upload_token: string;
      expires_at: number;
    }
  | { ok: false; error: string; retry_after_seconds?: number };

const ALLOWED_PREFIXES = ["image/", "video/", "application/pdf"];

function clientIp(): string {
  // Best-effort IP extraction; on Vercel the canonical header is
  // x-forwarded-for (first hop). Fallback chain: x-real-ip → "0.0.0.0".
  // We never trust this for authn — only as a rate-limit bucket key + an
  // ip_hash binding inside the upload token.
  // headers() is called lazily so cold-start cost is paid on first use.
  return "" + (process.env.NEXT_RUNTIME ?? ""); // placeholder; replaced below
}

async function resolveIp(): Promise<string> {
  void clientIp();
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "0.0.0.0";
}

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

  // 1. Per-IP rate-limit (MED-3)
  const ip = await resolveIp();
  const rate = await checkPresignLimit({ ip });
  if (!rate.ok) {
    return {
      ok: false,
      error: "rate_limited",
      retry_after_seconds: rate.retryAfterSeconds,
    };
  }

  // 2. Campaign window check (MED-3): must be published + within submission window
  const sbAdmin = createSupabaseService();
  // workspaces.kind extension + campaigns table — both not always in the
  // generated types yet (regen pending after STEP 0/2 apply). Defensive cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- post-migration types regen pending
  const sbAny = sbAdmin as any;
  const { data: campaign, error } = await sbAny
    .from("campaigns")
    .select("id, status, allow_r2_upload, submission_close_at")
    .eq("slug", input.campaign_slug)
    .maybeSingle();

  if (error || !campaign) return { ok: false, error: "campaign_not_found" };
  if (campaign.status !== "published") return { ok: false, error: "campaign_not_open" };
  if (!campaign.allow_r2_upload) return { ok: false, error: "r2_upload_not_allowed" };

  if (campaign.submission_close_at) {
    const closeMs = new Date(campaign.submission_close_at).getTime();
    if (Date.now() > closeMs) {
      return { ok: false, error: "campaign_closed" };
    }
  }

  // 3. Issue upload token (HIGH-2) bound to (campaign_id, nonce, ip_hash)
  const issued = issueUploadToken({ campaignId: campaign.id, ip });

  // 4. Server-controlled key with bound nonce — applicant cannot influence
  //    the prefix. Filename is already regex-validated above (no spaces, no
  //    path traversal).
  const prefix = objectKeyPrefix(campaign.id, issued.nonce);
  const objectKey = `${prefix}${input.filename}`;

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
    upload_token: issued.token,
    expires_at: issued.expiresAt,
  };
}
