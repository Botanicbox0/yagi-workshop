"use server";

// Wave C v2 — submitCampaignApplicationAction.
// Public action — anon + authenticated callers. Per SPEC §3 HIGH-1 + HIGH-2
// + §4 MED-1 + HIGH-3.
//
// LOOP-1 (Wave C v1) findings, ALL baked in:
//   K-05 #1  HIGH-A   Rate-limit + Turnstile (HIGH-1)
//   K-05 #2  HIGH-B   R2 key binding via upload token + key validation +
//                     HEAD-check + content_mime persistence (HIGH-2 + HIGH-3)
//   K-05 #3  MED-A    Existing user lookup via find_user_by_email RPC (MED-1)
//   K-05 #4  MED-A    Multi-channel RLS handled in migration (MED-2)
//   K-05 #5  MED-A    Presign rate-limit (MED-3, in presign action)
//   K-05 #7  MED-C    magic_link_sent fallback surfaced to client (MED-4)
//
// Lifecycle:
//   1. Zod input validation
//   2. Rate-limit (per-IP + per-email + per-campaign-IP, HIGH-1)
//   3. Turnstile siteverify (HIGH-1)
//   4. Service-role: load campaign by slug, status=published, file policy
//   5. R2 key validation (HIGH-2): if content_r2_key present:
//      - Token verify (signature + exp + ip_hash + campaign_id)
//      - Regex validate object key matches token's nonce
//      - HEAD-check: object exists, ContentLength ≤ 200MB, ContentType
//        matches whitelist; capture mime → content_mime (HIGH-3)
//   6. Category belongs to campaign
//   7. Account resolve (find_user_by_email RPC):
//      - Existing user → magic-link via generateLink + Resend (MED-4)
//      - New user → inviteUserByEmail (auto-sends invite)
//   8. Find/create creator workspace + membership
//   9. INSERT campaign_submissions (service-role)
//  10. Cleanup on partial failure

import { z } from "zod";
import { headers } from "next/headers";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { createSupabaseService } from "@/lib/supabase/service";
import { getResend, EMAIL_FROM } from "@/lib/resend";
import { getR2Client, BUCKET } from "@/lib/r2/client";
import { checkSubmitLimits } from "@/lib/ratelimit";
import { verifyUploadToken, validateObjectKey } from "@/lib/upload-token";

const MAX_BYTES = 200 * 1024 * 1024;
const ALLOWED_MIME_PREFIXES = ["image/", "video/"]; // submit allows image|video; pdf path is admin-only
// Note: presign allows pdf for separate use case; submit narrows to media so the
// WorkPreview component can always render either <img> or <video>.

const SubmitApplicationInputSchema = z
  .object({
    campaign_slug: z.string().trim().min(1).max(120),
    category_id: z.string().uuid(),
    applicant_email: z.string().trim().email().max(254),
    applicant_name: z.string().trim().min(1).max(120),
    applicant_phone: z.string().trim().min(7).max(40),
    team_name: z.string().trim().max(120).optional(),
    work_title: z.string().trim().min(1).max(200),
    work_description: z.string().trim().max(2000).optional(),
    // Either R2 (key + token) OR external URL; both absent fails
    content_r2_key: z.string().trim().min(1).max(400).optional(),
    upload_token: z.string().trim().min(1).max(2000).optional(),
    external_url: z.string().trim().url().max(2048).optional(),
    // Cloudflare Turnstile token from client widget
    turnstile_token: z.string().trim().min(1).max(2000),
  })
  .refine(
    (v) => Boolean(v.content_r2_key) || Boolean(v.external_url),
    { message: "work_required" },
  )
  .refine(
    (v) => !v.content_r2_key || Boolean(v.upload_token),
    { message: "upload_token_required" },
  );

export type SubmitApplicationInput = z.infer<typeof SubmitApplicationInputSchema>;

export type SubmitApplicationResult =
  | {
      ok: true;
      submission_id: string;
      magic_link_sent: boolean;
      account_was_new: boolean;
    }
  | { ok: false; error: string; retry_after_seconds?: number };

type SbAdmin = ReturnType<typeof createSupabaseService>;

// ---------------------------------------------------------------------------
// Network primitives
// ---------------------------------------------------------------------------

async function resolveIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xri = h.get("x-real-ip");
  if (xri) return xri.trim();
  return "0.0.0.0";
}

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // In dev w/o env, fail closed for safety (test envs should set a known
    // dev-mode secret per Cloudflare docs).
    console.error("[submit] TURNSTILE_SECRET_KEY missing — failing closed.");
    return false;
  }
  try {
    const body = new URLSearchParams({ secret, response: token, remoteip: ip });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[submit] turnstile siteverify HTTP error:", res.status);
      return false;
    }
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch (err) {
    console.error("[submit] turnstile siteverify exception:", err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// R2 HEAD-check (HIGH-2 + HIGH-3)
// ---------------------------------------------------------------------------

async function headCheckR2(key: string): Promise<
  | { ok: true; mime: string; size: number }
  | { ok: false; reason: "not_found" | "too_large" | "bad_mime" | "head_failed" }
> {
  try {
    const r2 = getR2Client();
    const out = await r2.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    const size = Number(out.ContentLength ?? 0);
    const mime = (out.ContentType ?? "").toLowerCase();
    if (size <= 0) return { ok: false, reason: "not_found" };
    if (size > MAX_BYTES) return { ok: false, reason: "too_large" };
    if (!ALLOWED_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
      return { ok: false, reason: "bad_mime" };
    }
    return { ok: true, mime, size };
  } catch (err) {
    const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } } | null)?.name;
    if (code === "NotFound" || code === "NoSuchKey") return { ok: false, reason: "not_found" };
    console.error("[submit] HEAD-check exception:", err);
    return { ok: false, reason: "head_failed" };
  }
}

// ---------------------------------------------------------------------------
// Account + workspace resolution
// ---------------------------------------------------------------------------

function emailLocalPart(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}

function creatorWorkspaceSlug(email: string, userId: string): string {
  const base = emailLocalPart(email)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return base.length >= 3 ? `${base}-${userId.slice(0, 6)}` : `creator-${userId.slice(0, 8)}`;
}

function creatorWorkspaceName(applicantName: string, email: string): string {
  const trimmed = applicantName.trim();
  return trimmed.length > 0 ? trimmed : emailLocalPart(email);
}

async function findExistingUserId(
  sbAdmin: SbAdmin,
  email: string,
): Promise<string | null> {
  // MED-1: portable security-definer RPC instead of .schema('auth') side-channel.
  const { data, error } = await sbAdmin.rpc(
    "find_user_by_email" as never,
    { p_email: email } as never,
  );
  if (error) {
    console.error("[submit] find_user_by_email RPC error:", error.message);
    return null;
  }
  if (!data) return null;
  return typeof data === "string" ? data : null;
}

async function findExistingCreatorWorkspaceId(
  sbAdmin: SbAdmin,
  userId: string,
): Promise<string | null> {
  // workspaces.kind not always in generated types — defensive cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sbAny = sbAdmin as any;
  const { data } = await sbAny
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(id, kind)")
    .eq("user_id", userId)
    .limit(50);
  if (!data) return null;
  for (const row of data as { workspace_id: string; workspaces?: { id: string; kind: string } | null }[]) {
    if (row.workspaces?.kind === "creator") return row.workspace_id;
  }
  return null;
}

async function createCreatorWorkspace(
  sbAdmin: SbAdmin,
  userId: string,
  applicantName: string,
  email: string,
): Promise<{ ok: true; workspaceId: string } | { ok: false; error: string }> {
  const slug = creatorWorkspaceSlug(email, userId);
  const name = creatorWorkspaceName(applicantName, email);

  // workspaces.kind 'creator' added by base migration 20260506200000.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sbAny = sbAdmin as any;
  const { data: ws, error: wsErr } = await sbAny
    .from("workspaces")
    .insert({ kind: "creator", name, slug, plan: "free", brand_guide: {} })
    .select("id")
    .single();

  if (wsErr || !ws) {
    console.error("[submit] workspaces insert error:", wsErr?.message);
    return { ok: false, error: "workspace_create_failed" };
  }

  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "admin",
    invited_at: new Date().toISOString(),
  });

  if (memberErr) {
    console.error("[submit] workspace_members insert error:", memberErr.message);
    await sbAdmin.from("workspaces").delete().eq("id", ws.id);
    return { ok: false, error: "workspace_member_failed" };
  }

  return { ok: true, workspaceId: ws.id };
}

// ---------------------------------------------------------------------------
// Magic-link delivery (existing-user path; new-user path uses inviteUserByEmail)
// ---------------------------------------------------------------------------

async function sendMagicLinkEmail(
  email: string,
  actionLink: string,
  campaignTitle: string,
): Promise<boolean> {
  const resend = getResend();
  if (!resend) return false;
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: `[YAGI 캠페인] ${campaignTitle} 응모 확인 + 로그인 링크`,
      text:
        `${campaignTitle} 캠페인에 응모해주셔서 감사합니다.\n\n` +
        `아래 링크를 눌러 로그인하면 응모 상태와 검수 결과를 확인하실 수 있습니다.\n\n` +
        `${actionLink}\n\n` +
        `링크는 1시간 동안 유효합니다.\n\n` +
        `— YAGI Workshop`,
    });
    return true;
  } catch (err) {
    console.error("[submit] resend send error:", err);
    return false;
  }
}

async function ensureCreatorAccount(
  sbAdmin: SbAdmin,
  email: string,
  applicantName: string,
  campaignTitle: string,
): Promise<
  | {
      ok: true;
      userId: string;
      workspaceId: string;
      magicLinkSent: boolean;
      accountWasNew: boolean;
    }
  | { ok: false; error: string }
> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const redirectTo = `${siteUrl}/auth/confirm?next=/app/my-submissions`;

  const existingUserId = await findExistingUserId(sbAdmin, email);

  let userId: string;
  let accountWasNew: boolean;
  let magicLinkSent = false;

  if (existingUserId) {
    userId = existingUserId;
    accountWasNew = false;
    const { data: linkData, error: linkErr } = await sbAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      magicLinkSent = await sendMagicLinkEmail(
        email,
        linkData.properties.action_link,
        campaignTitle,
      );
    } else {
      console.error("[submit] generateLink magiclink error:", linkErr?.message);
    }
  } else {
    const { data: invited, error: inviteErr } =
      await sbAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
    if (inviteErr || !invited?.user) {
      console.error("[submit] inviteUserByEmail error:", inviteErr?.message);
      return { ok: false, error: "invite_failed" };
    }
    userId = invited.user.id;
    accountWasNew = true;
    magicLinkSent = true;
  }

  const existingWorkspaceId = await findExistingCreatorWorkspaceId(sbAdmin, userId);
  let workspaceId: string;

  if (existingWorkspaceId) {
    workspaceId = existingWorkspaceId;
  } else {
    const ws = await createCreatorWorkspace(sbAdmin, userId, applicantName, email);
    if (!ws.ok) {
      if (accountWasNew) {
        const { error: delErr } = await sbAdmin.auth.admin.deleteUser(userId);
        if (delErr) {
          console.error(
            "[submit] cleanup deleteUser failed (manual reconcile needed):",
            { userId, email, delErr: delErr.message },
          );
        }
      }
      return { ok: false, error: ws.error };
    }
    workspaceId = ws.workspaceId;
  }

  return { ok: true, userId, workspaceId, magicLinkSent, accountWasNew };
}

// ---------------------------------------------------------------------------
// Main action
// ---------------------------------------------------------------------------

export async function submitCampaignApplicationAction(
  raw: unknown,
): Promise<SubmitApplicationResult> {
  const parsed = SubmitApplicationInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message || "input_invalid" };
  }
  const input = parsed.data;

  const ip = await resolveIp();

  // 1. Rate-limit (HIGH-1) — per-IP + per-email + per-(campaign,IP)
  // We need the campaign id for the third bucket, so a quick slug → id lookup
  // first via service-role. Skip rate-limit only if campaign not found (which
  // returns campaign_not_found below anyway).
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sbAny = sbAdmin as any;
  const { data: campaignLookup, error: lookupErr } = await sbAny
    .from("campaigns")
    .select(
      "id, title, status, allow_r2_upload, allow_external_url, submission_close_at",
    )
    .eq("slug", input.campaign_slug)
    .maybeSingle();

  if (lookupErr || !campaignLookup) {
    return { ok: false, error: "campaign_not_found" };
  }
  const campaign = campaignLookup as {
    id: string;
    title: string;
    status: string;
    allow_r2_upload: boolean;
    allow_external_url: boolean;
    submission_close_at: string | null;
  };

  const rate = await checkSubmitLimits({
    ip,
    email: input.applicant_email,
    campaignId: campaign.id,
  });
  if (!rate.ok) {
    return {
      ok: false,
      error: "rate_limited",
      retry_after_seconds: rate.retryAfterSeconds,
    };
  }

  // 2. Turnstile siteverify (HIGH-1)
  const turnstileOk = await verifyTurnstile(input.turnstile_token, ip);
  if (!turnstileOk) {
    return { ok: false, error: "captcha_failed" };
  }

  // 3. Campaign published-status + window
  if (campaign.status !== "published") {
    return { ok: false, error: "campaign_not_open" };
  }
  if (campaign.submission_close_at) {
    const closeMs = new Date(campaign.submission_close_at).getTime();
    if (Date.now() > closeMs) {
      return { ok: false, error: "campaign_closed" };
    }
  }
  if (input.content_r2_key && !campaign.allow_r2_upload) {
    return { ok: false, error: "r2_upload_not_allowed" };
  }
  if (input.external_url && !campaign.allow_external_url) {
    return { ok: false, error: "external_url_not_allowed" };
  }

  // 4. R2 key validation (HIGH-2): token verify + key shape + HEAD-check
  let contentMime: string | null = null;
  if (input.content_r2_key && input.upload_token) {
    const tokenResult = verifyUploadToken({
      token: input.upload_token,
      expectedCampaignId: campaign.id,
      ip,
    });
    if (!tokenResult.ok) {
      return { ok: false, error: `token_${tokenResult.reason}` };
    }
    const keyOk = validateObjectKey({
      key: input.content_r2_key,
      campaignId: campaign.id,
      nonce: tokenResult.payload.nonce,
    });
    if (!keyOk) {
      return { ok: false, error: "key_mismatch" };
    }
    const head = await headCheckR2(input.content_r2_key);
    if (!head.ok) {
      const errMap: Record<typeof head.reason, string> = {
        not_found: "object_not_found",
        too_large: "file_too_large",
        bad_mime: "content_type_not_allowed",
        head_failed: "head_check_failed",
      };
      return { ok: false, error: errMap[head.reason] };
    }
    contentMime = head.mime;
  }

  // 5. Category belongs to this campaign
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sbAny2 = sbAdmin as any;
  const { data: category, error: catErr } = await sbAny2
    .from("campaign_categories")
    .select("id, campaign_id")
    .eq("id", input.category_id)
    .eq("campaign_id", campaign.id)
    .maybeSingle();
  if (catErr || !category) {
    return { ok: false, error: "category_invalid" };
  }

  // 6. Resolve / create creator account + workspace, send magic-link
  const account = await ensureCreatorAccount(
    sbAdmin,
    input.applicant_email,
    input.applicant_name,
    campaign.title,
  );
  if (!account.ok) return { ok: false, error: account.error };

  // 7. INSERT submission (service-role bypasses RLS no-INSERT policy)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- types regen pending
  const sbAny3 = sbAdmin as any;
  const { data: submission, error: subErr } = await sbAny3
    .from("campaign_submissions")
    .insert({
      campaign_id: campaign.id,
      category_id: category.id,
      applicant_workspace_id: account.workspaceId,
      applicant_email: input.applicant_email,
      applicant_name: input.applicant_name,
      applicant_phone: input.applicant_phone,
      team_name: input.team_name ?? null,
      title: input.work_title,
      description: input.work_description ?? null,
      content_r2_key: input.content_r2_key ?? null,
      content_mime: contentMime, // HIGH-3: persisted for WorkPreview
      external_url: input.external_url ?? null,
      status: "submitted",
    })
    .select("id")
    .single();

  if (subErr || !submission) {
    console.error("[submit] submission insert error:", subErr?.message);
    return { ok: false, error: "submission_insert_failed" };
  }

  return {
    ok: true,
    submission_id: submission.id,
    magic_link_sent: account.magicLinkSent,
    account_was_new: account.accountWasNew,
  };
}
