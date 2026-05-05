"use server";

// Phase 7 Wave C.1 — submitCampaignApplicationAction
//
// Public server action — anon + authenticated callers (no auth gate). Lifts
// a creator-pool submission into the database without requiring prior signup
// (Talenthouse pattern):
//
//   1. Validate input (Zod) — campaign slug, category id, applicant identity,
//      work content (R2 key OR external URL).
//   2. Service-role: load campaign by slug; reject if status != 'published'
//      or category does not belong to campaign or file policy violated.
//   3. Account resolution by email:
//      - existing user → use their existing creator workspace, or create
//        one if they don't have one yet, then send a fresh magic-link
//        (auth.admin.generateLink + Resend).
//      - new user → auth.admin.inviteUserByEmail (auto-sends invite email
//        with magic-link), then create creator workspace + membership.
//   4. INSERT campaign_submissions (service-role bypasses the RLS no-INSERT
//      policy; the action layer is the trust boundary).
//   5. Best-effort cleanup on partial failure (auth user + workspace) so a
//      retry doesn't leave orphan rows.
//
// Security posture (L-049 4-perspective audit):
//   - All writes via service-role; no RLS WITH CHECK enforcement at row
//     level for submissions INSERT (per A.1 schema design — service-role only
//     INSERT). Trust boundary = the validation layer + slug-bound campaign
//     fetch (cannot forge campaign or category id).
//   - applicant_workspace_id is server-derived from the resolved/created
//     workspace, never accepted from the client payload.
//   - applicant_email is the single source-of-truth for account binding.
//   - No yagi_admin gate (intentional — public submit). Defense relies on:
//     (a) Zod schema bounded inputs, (b) campaign published-status check,
//     (c) category belongs to campaign check, (d) file policy honored.

import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { getResend, EMAIL_FROM } from "@/lib/resend";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

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
    // Either R2 key OR external URL; both being absent fails validation
    content_r2_key: z.string().trim().min(1).max(400).optional(),
    external_url: z.string().trim().url().max(2048).optional(),
  })
  .refine(
    (v) => Boolean(v.content_r2_key) || Boolean(v.external_url),
    { message: "work_required" },
  );

export type SubmitApplicationInput = z.infer<typeof SubmitApplicationInputSchema>;

export type SubmitApplicationResult =
  | {
      ok: true;
      submission_id: string;
      magic_link_sent: boolean;
      account_was_new: boolean;
    }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Slug helpers (mirrors invite-artist.ts pattern)
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
  if (trimmed.length > 0) return trimmed;
  return emailLocalPart(email);
}

// ---------------------------------------------------------------------------
// Account + workspace resolution
// ---------------------------------------------------------------------------

type SbAdmin = ReturnType<typeof createSupabaseService>;

async function findExistingUserId(
  sbAdmin: SbAdmin,
  email: string,
): Promise<string | null> {
  // supabase-js v2 admin API has no `getUserByEmail`. We page through users
  // with a server-side filter via the schema('auth') side-channel exposed
  // through the service-role client; the auth schema exposes `users` with
  // an `email` column.
  // The schema('auth') escape hatch returns a postgrest builder typed against
  // the public types; we narrow with explicit casts.
  const { data, error } = await (sbAdmin as unknown as {
    schema: (s: string) => {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (col: string, val: string) => {
            maybeSingle: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
          };
        };
      };
    };
  })
    .schema("auth")
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    console.error("[submit-application] auth.users lookup error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

async function findExistingCreatorWorkspaceId(
  sbAdmin: SbAdmin,
  userId: string,
): Promise<string | null> {
  // Find a workspace_member row whose workspace.kind = 'creator'.
  // workspaces.kind is text post-migration but not in generated types —
  // use a defensive cast.
  const { data } = await (sbAdmin as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          limit: (n: number) => Promise<{
            data:
              | { workspace_id: string; workspaces: { id: string; kind: string } | null }[]
              | null;
          }>;
        };
      };
    };
  })
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(id, kind)")
    .eq("user_id", userId)
    .limit(50);

  if (!data) return null;
  for (const row of data) {
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

  // workspaces.kind 'creator' added by 20260506200000 migration; generated
  // types may not include it yet — defensive cast.
  const { data: ws, error: wsErr } = await (sbAdmin as unknown as {
    from: (t: string) => {
      insert: (row: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }>;
        };
      };
    };
  })
    .from("workspaces")
    .insert({
      kind: "creator",
      name,
      slug,
      plan: "free",
      brand_guide: {},
    })
    .select("id")
    .single();

  if (wsErr || !ws) {
    console.error("[submit-application] workspaces insert error:", wsErr?.message);
    return { ok: false, error: "workspace_create_failed" };
  }

  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
    workspace_id: ws.id,
    user_id: userId,
    role: "admin",
    invited_at: new Date().toISOString(),
  });

  if (memberErr) {
    console.error("[submit-application] workspace_members insert error:", memberErr.message);
    // Best-effort cleanup
    await sbAdmin.from("workspaces").delete().eq("id", ws.id);
    return { ok: false, error: "workspace_member_failed" };
  }

  return { ok: true, workspaceId: ws.id };
}

// ---------------------------------------------------------------------------
// Magic-link delivery — for existing users (new users get one auto via
// inviteUserByEmail).
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
    console.error("[submit-application] resend send error:", err);
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

  // 1. Check if auth user exists by email
  const existingUserId = await findExistingUserId(sbAdmin, email);

  let userId: string;
  let accountWasNew: boolean;
  let magicLinkSent = false;

  if (existingUserId) {
    userId = existingUserId;
    accountWasNew = false;

    // Send a magic-link via generateLink + Resend so the existing user lands
    // back at /my-submissions to track the new submission.
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
      console.error("[submit-application] generateLink magiclink error:", linkErr?.message);
    }
  } else {
    // New user — invite (creates auth user + sends invite email with link).
    const { data: invited, error: inviteErr } =
      await sbAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (inviteErr || !invited?.user) {
      console.error("[submit-application] inviteUserByEmail error:", inviteErr?.message);
      return { ok: false, error: "invite_failed" };
    }
    userId = invited.user.id;
    accountWasNew = true;
    magicLinkSent = true; // invite email contains the magic-link
  }

  // 2. Find or create creator workspace
  const existingWorkspaceId = await findExistingCreatorWorkspaceId(sbAdmin, userId);
  let workspaceId: string;

  if (existingWorkspaceId) {
    workspaceId = existingWorkspaceId;
  } else {
    const ws = await createCreatorWorkspace(sbAdmin, userId, applicantName, email);
    if (!ws.ok) {
      // Cleanup: only delete the just-invited auth user when WE created it.
      if (accountWasNew) {
        const { error: delErr } = await sbAdmin.auth.admin.deleteUser(userId);
        if (delErr) {
          console.error(
            "[submit-application] cleanup deleteUser failed (manual reconcile needed):",
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

  const sbAdmin = createSupabaseService();

  // 1. Load campaign by slug — must be 'published' for submissions to be open
  const { data: campaign, error: campaignErr } = await sbAdmin
    .from("campaigns")
    .select(
      "id, title, status, allow_r2_upload, allow_external_url, submission_close_at",
    )
    .eq("slug", input.campaign_slug)
    .maybeSingle();

  if (campaignErr || !campaign) {
    return { ok: false, error: "campaign_not_found" };
  }
  if (campaign.status !== "published") {
    return { ok: false, error: "campaign_not_open" };
  }

  // Time-window guard: reject if submissions closed
  if (campaign.submission_close_at) {
    const closeMs = new Date(campaign.submission_close_at).getTime();
    if (Date.now() > closeMs) {
      return { ok: false, error: "campaign_closed" };
    }
  }

  // 2. File policy enforcement (defense-in-depth on top of UI gating)
  if (input.content_r2_key && !campaign.allow_r2_upload) {
    return { ok: false, error: "r2_upload_not_allowed" };
  }
  if (input.external_url && !campaign.allow_external_url) {
    return { ok: false, error: "external_url_not_allowed" };
  }

  // 3. Category must belong to this campaign
  const { data: category, error: catErr } = await sbAdmin
    .from("campaign_categories")
    .select("id, campaign_id")
    .eq("id", input.category_id)
    .eq("campaign_id", campaign.id)
    .maybeSingle();

  if (catErr || !category) {
    return { ok: false, error: "category_invalid" };
  }

  // 4. Resolve / create creator account + workspace, send magic-link
  const account = await ensureCreatorAccount(
    sbAdmin,
    input.applicant_email,
    input.applicant_name,
    campaign.title,
  );
  if (!account.ok) return { ok: false, error: account.error };

  // 5. INSERT submission (service-role bypasses RLS no-INSERT policy)
  const { data: submission, error: subErr } = await sbAdmin
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
      external_url: input.external_url ?? null,
      status: "submitted",
    })
    .select("id")
    .single();

  if (subErr || !submission) {
    console.error("[submit-application] submission insert error:", subErr?.message);
    // Don't roll back the account — the user can re-attempt without re-signup.
    return { ok: false, error: "submission_insert_failed" };
  }

  return {
    ok: true,
    submission_id: submission.id,
    magic_link_sent: account.magicLinkSent,
    account_was_new: account.accountWasNew,
  };
}
