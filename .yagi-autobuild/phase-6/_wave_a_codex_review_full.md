Reading prompt from stdin...
OpenAI Codex v0.128.0 (research preview)
--------
workdir: C:\Users\yout4\yagi-studio\yagi-workshop
model: gpt-5.5
provider: openai
approval: never
sandbox: danger-full-access
reasoning effort: high
reasoning summaries: none
session id: 019df74e-1cc6-7340-889d-bb1d888b6ce1
--------
user
Phase 6 Wave A — K-05 LOOP 1 (Tier 1 HIGH).

Adversarial review of Wave A: artist_profile schema + RLS + column grants (A.1), workspace switcher UI (A.2), Artist invite + 1-step onboarding + admin tool (A.3).

## Files in scope (~13 files)

NEW (server-side / DB):
- `supabase/migrations/20260505000000_phase_6_artist_profile.sql` — table + 4 RLS policies + REVOKE/GRANT column lockdown + DO-block self-asserts
- `src/app/[locale]/app/admin/artists/_actions/invite-artist.ts` — yagi_admin-only server action; service-role for auth.admin.inviteUserByEmail + workspaces/workspace_members/artist_profile INSERTs
- `src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts` — workspace_member-only; UPDATE artist_profile.instagram_handle (column-grant-permitted)
- `src/lib/auth/artist-onboarding-gate.ts` — helper used in `/[locale]/app/layout.tsx` to redirect Artist users with NULL instagram_handle to /onboarding/artist

NEW (UI):
- `src/app/[locale]/app/admin/artists/page.tsx` + `_components/invite-artist-form.tsx` + `_components/invite-artist-section.tsx`
- `src/app/[locale]/onboarding/artist/page.tsx` + `_components/onboarding-form.tsx`
- `src/components/sidebar/workspace-switcher.tsx` (modified — added isYagiAdmin gate)

MODIFIED:
- `src/components/app/sidebar.tsx` — passes isYagiAdmin prop to switcher
- `src/lib/workspace/active.ts` — Artist workspace default-on-sign-in logic
- `src/app/[locale]/app/layout.tsx` — wired onboarding gate
- `messages/{ko,en}.json` — `workspace_switcher` + `admin_artists` + `onboarding_artist` namespaces

## L-049 Mandatory RLS multi-role audit

For artist_profile, walk USING + WITH CHECK from each role separately:

  1. As `client` (auth.uid() = workspace_member, no admin role):
     - SELECT: USING `EXISTS (workspace_members WHERE user_id = auth.uid())` → permitted for own row only
     - INSERT: WITH CHECK `is_yagi_admin(auth.uid())` → DENIED. Self-invite blocked.
     - UPDATE: USING + WITH CHECK both pass for own row. Column GRANT restricts to (display_name, short_bio, instagram_handle, updated_at).
     - DELETE: USING `is_yagi_admin(auth.uid())` → DENIED.
  2. As `ws_admin` (workspace_admin role for the project's workspace):
     - Same as client (no special policy branch). The ws_admin role has no special INSERT/DELETE on artist_profile — only yagi_admin does.
  3. As `yagi_admin`: full SELECT/INSERT/UPDATE/DELETE permitted. Service-role tooling preferred for column-grant-restricted writes.
  4. As `different-user same-workspace`:
     - workspace_members JOIN fails (not a member of THIS workspace's row)
     - SELECT/UPDATE denied; INSERT blocked by yagi_admin gate; DELETE denied.

Confirm:
- Every column write the action layer performs is permitted by the WITH CHECK + column GRANT for the role making the call.
- No column write depends on `is_yagi_admin` bypass that isn't routed through `createSupabaseService()`.
- Specifically check: completeArtistOnboardingAction's `instagram_handle UPDATE` uses `createSupabaseServer()` (user-scoped) and depends on the column GRANT permitting it. Confirm `instagram_handle` is in the granted column set.

## Adversarial focus areas

1. **inviteArtistAction yagi_admin guard.** Service-role bypasses RLS. The ONLY barrier is the action's own `is_yagi_admin` check. Confirm:
   (a) `auth.getUser()` is called first; null user → unauthenticated.
   (b) The yagi_admin check uses `user_roles` table query (or is_yagi_admin SQL function); the check actually validates the caller is yagi_admin (e.g., not just `role !== 'client'`).
   (c) The check happens BEFORE any service-role write.
   (d) zod input validation is comprehensive (email format, displayName required, shortBio max length).
   (e) If the inviteUserByEmail succeeds but workspaces/workspace_members/artist_profile INSERTs fail, partial state cleanup logic (best-effort).

2. **inviteArtistAction service-role write authorization.** Service-role bypasses RLS but:
   (a) The workspace INSERT must use a deterministic kind='artist' value (not user-controlled).
   (b) The workspace_members INSERT must use the invited user's ID (from inviteUserByEmail return), not the caller's. Confirm the return value is captured correctly.
   (c) The artist_profile INSERT writes the new workspace_id (from the workspaces INSERT return), not a user-supplied ID.

3. **completeArtistOnboardingAction multi-role audit.**
   (a) `auth.getUser()` first; null → unauthenticated.
   (b) Workspace_members JOIN to find the user's Artist workspace. Confirm: what if the user is a member of MULTIPLE Artist workspaces? Does the action handle it (pick first, error, or other)? Phase 6 lock = single Artist workspace per user, but defense-in-depth.
   (c) artist_profile fetch with `instagram_handle IS NULL` check is the idempotency guard. If the row is missing entirely (no artist_profile created — pre-A.3 invite race) → action returns clean error, not crash.
   (d) The UPDATE uses `createSupabaseServer()` (user-scoped). Confirm column GRANT permits the write (instagram_handle is in the granted column set per A.1 migration).
   (e) Trim/normalize Instagram handle (e.g., strip leading @). zod refine? Length check?

4. **Onboarding gate placement.** `src/lib/auth/artist-onboarding-gate.ts` is called from `/[locale]/app/layout.tsx`. Confirm:
   (a) Runs AFTER `resolveActiveWorkspace` so workspace.kind is known.
   (b) Redirects to `/[locale]/onboarding/artist` only when `workspace.kind === 'artist'` AND `artist_profile.instagram_handle IS NULL`.
   (c) The redirect URL uses the user's locale, not a hardcoded one.
   (d) `/onboarding/artist` is OUTSIDE `/app/*` so the redirect doesn't loop.
   (e) Direct URL access to `/[locale]/app/projects` etc. is correctly intercepted by the layout — confirm no other intermediate routes bypass the gate.

5. **/admin/artists page authorization.** Page renders only for yagi_admin viewers. Confirm:
   (a) Defense-in-depth notFound() at the page top (before any DB read or render).
   (b) The status query for the table doesn't leak email_confirmed_at or other sensitive fields beyond what yagi_admin needs.
   (c) The form's shortBio is properly escaped on render (no HTML injection).

6. **Workspace switcher gate.** `+ 새 워크스페이스 만들기` is yagi_admin-only. Confirm:
   (a) The visibility check is server-rendered (passed as prop from a server component) so it can't be bypassed by the client toggling state.
   (b) Even if the client manages to render the item, clicking it calls a server action with its own yagi_admin check (defense-in-depth).
   (c) The Brand/Artist groups list ONLY workspaces the caller is a workspace_member of (RLS scopes the query).

7. **Active workspace resolver Artist preference.** `src/lib/workspace/active.ts` extended to prefer Artist workspace on sign-in. Confirm:
   (a) The resolver returns an Artist workspace ID only if the caller is a workspace_member of that workspace.
   (b) When the cookie points to a workspace the caller is no longer a member of (e.g., removed by admin), the fallback picks a valid membership, not garbage.
   (c) When user has 0 memberships, the resolver returns null cleanly (existing behavior preserved).

8. **Wording cross-check (yagi-wording-rules).** The skill's binding rule: NO internal-only term ("Roster", "Routing", "Inbound", "Talent-Initiated", "RFP", "D2C", "Approval Gate", "Bypass brands", "Auto-decline", "License fee", "Type N", "Curation note") in any KO i18n value or component label. EN "Roster" is allowed per skill.

   Spot-check ko.json + en.json for the new namespaces; flag any KO leakage.

## Already-deferred (do NOT flag again)

- Twin asset upload pipeline (Phase 7+)
- Permission dial UI (Phase 8 Wave E)
- Admin Queue Layer 2 (Phase 7)
- Match score algorithm (Phase 7+)
- License fee settlement (Phase 8)

## Output format

## VERDICT: <CLEAN | NEEDS-ATTENTION>

For each NEW finding:
[FINDING N] CLASS: file:line — short description — recommended fix

Severity guide:
- HIGH-A = clear path to anyone-invites-anyone or anyone-deletes-anyone. Inline fix mandatory.
- HIGH-B = subtle gap that gives unauthorized access under specific scenarios. Inline fix mandatory.
- MED-A = auto-fixable issue that doesn't expand attack surface. Builder inline fix.
- MED-B/C = scale-aware (<100 user). FU register acceptable.
- LOW = polish; FU only.

If 0 NEW HIGH/MED findings: "VERDICT: CLEAN — Wave A ready for ff-merge to phase branch."

End with one-line summary.

codex
I’ll review this as a code review, with the RLS role walkthrough tied back to the actual migration and server actions. I’m going to read the migration, action code, gate/layout, workspace resolver, switcher, and i18n strings before making any findings.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/admin/artists/_actions/invite-artist.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'supabase/migrations/20260505000000_phase_6_artist_profile.sql' | Select-Object -First 260" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/auth/artist-onboarding-gate.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 403ms:
// Phase 6 Wave A.3 ??Artist onboarding gate helper
//
// Called from src/app/[locale]/app/layout.tsx after the active workspace
// is resolved. If the active workspace is kind='artist' and the artist_profile
// row has instagram_handle IS NULL, the user has not completed onboarding
// and MUST be redirected to /[locale]/onboarding/artist.
//
// Returns the redirect path string if a redirect is required, null otherwise.
// The layout is responsible for calling redirect() ??this helper is pure.
//
// Layer: placed in /app/layout.tsx (the authenticated app shell), which
// is the correct layer because:
//   1. It runs on every page load under /[locale]/app/*, including /app/projects.
//   2. It has access to the resolved active workspace (kind) already fetched
//      for the sidebar switcher.
//   3. The /[locale]/onboarding/artist route is OUTSIDE /app/* so the
//      redirect breaks the gate loop.

import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActiveWorkspaceMembership } from "@/lib/workspace/active";

/**
 * Returns the onboarding redirect path if the user must complete Artist
 * onboarding, or null if no redirect is needed.
 *
 * @param activeWorkspace - The user's currently-active workspace (may be null)
 * @param locale          - Current locale string (e.g. 'ko' or 'en')
 */
export async function checkArtistOnboardingGate(
  activeWorkspace: ActiveWorkspaceMembership | null,
  locale: string
): Promise<string | null> {
  // Only relevant for Artist workspaces
  if (!activeWorkspace || activeWorkspace.kind !== "artist") {
    return null;
  }

  // Fetch the artist_profile row to check instagram_handle
  const supabase = await createSupabaseServer();
  const { data: profile, error } = await supabase
    .from("artist_profile")
    .select("instagram_handle")
    .eq("workspace_id", activeWorkspace.id)
    .maybeSingle();

  if (error) {
    console.error("[artistOnboardingGate] artist_profile fetch error:", error);
    // On error, don't block the user ??let them through
    return null;
  }

  // instagram_handle IS NULL ??onboarding not completed
  if (profile && profile.instagram_handle === null) {
    return `/${locale}/onboarding/artist`;
  }

  return null;
}

 succeeded in 395ms:
"use server";

// =============================================================================
// Phase 6 Wave A.3 ??completeArtistOnboardingAction
//
// The Artist completes the 1-step onboarding form by supplying their
// Instagram handle. This is the only field required before they can access
// the main app surface.
//
// Uses the regular user-scoped createSupabaseServer() client ??the
// column GRANT from the A.1 migration allows authenticated users to
// UPDATE (display_name, short_bio, instagram_handle, updated_at), and
// the artist_profile_update RLS policy gates by workspace_members
// membership, so no service-role bypass is needed here.
//
// Security posture (L-049 4-perspective audit):
//   1. client (workspace_member of the Artist workspace) ??permitted
//   2. ws_admin (different workspace)                   ??blocked by RLS USING
//   3. yagi_admin                                        ??permitted via is_yagi_admin
//   4. different-user same-workspace                    ??blocked by RLS USING
//
// Idempotency: if instagram_handle IS NOT NULL the caller has already
// completed onboarding. We return 'forbidden' so a double-submit or
// link re-visit does not silently overwrite the handle.
// =============================================================================

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";

const completeOnboardingInput = z.object({
  instagramHandle: z
    .string()
    .trim()
    .min(1)
    .max(30)
    // Strip leading @ if present ??store without @
    .transform((v) => v.replace(/^@/, "")),
});

export type CompleteArtistOnboardingResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "no_artist_workspace"
        | "forbidden"
        | "db";
      message?: string;
    };

export async function completeArtistOnboardingAction(
  input: unknown
): Promise<CompleteArtistOnboardingResult> {
  // 1. Validate input
  const parsed = completeOnboardingInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { instagramHandle } = parsed.data;

  // 2. Authenticate caller
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // 3. Resolve user's active artist workspace via workspace_members.
  //    Per Phase 6 lock: a user has exactly one Artist workspace. We pick
  //    the first member row whose workspace.kind = 'artist'.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
  const sbAny = supabase as any;
  const { data: memberRows, error: memberErr } = await sbAny
    .from("workspace_members")
    .select("workspace_id, workspace:workspaces(id, kind)")
    .eq("user_id", user.id);

  if (memberErr) {
    console.error("[completeArtistOnboardingAction] workspace query error:", memberErr);
    return { ok: false, error: "db", message: memberErr.message };
  }

  type MemberRow = {
    workspace_id: string;
    workspace: { id: string; kind: string } | null;
  };

  const artistMember = (memberRows as MemberRow[] | null)?.find(
    (r) => r.workspace?.kind === "artist"
  );

  if (!artistMember) {
    return { ok: false, error: "no_artist_workspace" };
  }

  const workspaceId = artistMember.workspace_id;

  // 4. Fetch the artist_profile row; verify instagram_handle IS NULL (idempotency guard)
  const { data: profile, error: profileFetchErr } = await supabase
    .from("artist_profile")
    .select("workspace_id, instagram_handle")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (profileFetchErr) {
    console.error(
      "[completeArtistOnboardingAction] artist_profile fetch error:",
      profileFetchErr
    );
    return { ok: false, error: "db", message: profileFetchErr.message };
  }

  if (!profile) {
    // artist_profile row missing (shouldn't happen post-invite, but be explicit)
    return { ok: false, error: "no_artist_workspace" };
  }

  // Idempotency: if already set, onboarding is done
  if (profile.instagram_handle !== null) {
    return { ok: false, error: "forbidden" };
  }

  // 5. UPDATE artist_profile SET instagram_handle = ... via user-scoped client.
  //    Column GRANT + RLS UPDATE policy permit this for workspace_members.
  const { error: updateErr } = await supabase
    .from("artist_profile")
    .update({
      instagram_handle: instagramHandle,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);

  if (updateErr) {
    console.error(
      "[completeArtistOnboardingAction] artist_profile update error:",
      updateErr
    );
    return { ok: false, error: "db", message: updateErr.message };
  }

  return { ok: true };
}

 succeeded in 424ms:
"use server";

// =============================================================================
// Phase 6 Wave A.3 ??inviteArtistAction
//
// yagi_admin sends a magic-link invite to a prospective Artist, then
// atomically creates the workspace, workspace_member, and artist_profile rows
// so the Artist lands in a fully-provisioned state the moment they click
// the link.
//
// Security posture (L-048 service-role + L-049 4-perspective audit):
//   1. client role          ??forbidden (not yagi_admin)
//   2. ws_admin role        ??forbidden (only yagi_admin gate passes)
//   3. yagi_admin           ??permitted; service-role client bypasses RLS
//   4. unauthenticated user ??unauthenticated (auth.getUser() returns null)
//
// The action's auth gate is the ONLY barrier between callers and the
// service-role client. Authorization bugs here = anyone-invites-anyone.
// =============================================================================

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";

const inviteArtistInput = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  shortBio: z.string().max(500).optional(),
});

export type InviteArtistResult =
  | { ok: true; workspaceId: string }
  | {
      ok: false;
      error:
        | "validation"
        | "unauthenticated"
        | "forbidden"
        | "invite_failed"
        | "db";
      message?: string;
    };

export async function inviteArtistAction(
  input: unknown
): Promise<InviteArtistResult> {
  // 1. Validate input
  const parsed = inviteArtistInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const { email, displayName, shortBio } = parsed.data;

  // 2. Authenticate caller via user-scoped client
  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { ok: false, error: "unauthenticated" };
  }

  // 3. yagi_admin gate ??query user_roles for global yagi_admin role
  //    (workspace_id IS NULL = global role, not workspace-scoped)
  const { data: adminRoles, error: roleErr } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (roleErr) {
    console.error("[inviteArtistAction] role check error:", roleErr);
    return { ok: false, error: "db", message: roleErr.message };
  }
  if (!adminRoles || adminRoles.length === 0) {
    return { ok: false, error: "forbidden" };
  }

  // 4. Service-role client for RLS-bypass operations
  //    (Supabase auth admin API + workspace/member/profile inserts)
  const sbAdmin = createSupabaseService();

  // 5. Send magic-link invite via Supabase auth admin API
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  const redirectTo = `${siteUrl}/auth/confirm?next=/app/projects`;

  const { data: inviteData, error: inviteErr } =
    await sbAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (inviteErr || !inviteData.user) {
    console.error("[inviteArtistAction] invite error:", inviteErr);
    return {
      ok: false,
      error: "invite_failed",
      message: inviteErr?.message ?? "invite returned no user",
    };
  }

  const invitedUserId = inviteData.user.id;

  // 6. Derive a URL-safe slug from displayName. Korean names collapse to a
  //    uuid-based fallback so the INSERT never fails on slug uniqueness.
  const slugBase = displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const slug = slugBase.length >= 3
    ? slugBase
    : `artist-${invitedUserId.slice(0, 8)}`;

  // 7. INSERT workspaces (kind='artist')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kind not always in generated types
  const sbAny = sbAdmin as any;
  const { data: wsData, error: wsErr } = await sbAny
    .from("workspaces")
    .insert({
      kind: "artist",
      name: displayName,
      slug,
      plan: "free",
      brand_guide: {},
    })
    .select("id")
    .single();

  if (wsErr || !wsData) {
    console.error("[inviteArtistAction] workspace insert error:", wsErr);
    // Best-effort: user was already invited; log orphan for manual cleanup
    console.error(
      "[inviteArtistAction] ORPHAN: auth user created but workspace insert failed",
      { invitedUserId, email }
    );
    return {
      ok: false,
      error: "db",
      message: wsErr?.message ?? "workspace insert returned no row",
    };
  }

  const workspaceId: string = wsData.id;

  // 8. INSERT workspace_members (role='admin' = primary owner role used by bootstrap_workspace)
  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
    workspace_id: workspaceId,
    user_id: invitedUserId,
    role: "admin",
    invited_by: user.id,
    invited_at: new Date().toISOString(),
  });

  if (memberErr) {
    console.error("[inviteArtistAction] workspace_members insert error:", memberErr);
    console.error(
      "[inviteArtistAction] ORPHAN: workspace created but member insert failed",
      { workspaceId, invitedUserId, email }
    );
    return { ok: false, error: "db", message: memberErr.message };
  }

  // 9. INSERT artist_profile (instagram_handle = NULL per A.1 schema design)
  const { error: profileErr } = await sbAdmin.from("artist_profile").insert({
    workspace_id: workspaceId,
    display_name: displayName,
    short_bio: shortBio ?? null,
    instagram_handle: null,
    twin_status: "not_started",
    visibility_mode: "paused",
    auto_decline_categories: [],
    bypass_brand_ids: [],
  });

  if (profileErr) {
    console.error("[inviteArtistAction] artist_profile insert error:", profileErr);
    console.error(
      "[inviteArtistAction] ORPHAN: workspace+member created but artist_profile insert failed",
      { workspaceId, invitedUserId, email }
    );
    return { ok: false, error: "db", message: profileErr.message };
  }

  return { ok: true, workspaceId };
}

 succeeded in 459ms:
-- Phase 6 Wave A.1 ??artist_profile table.
--
-- Per KICKOFF.md 짠"A.1 Schema migration: artist_profile" + L-019 pre-flight
-- (verified 2026-05-05 via mcp execute_sql: 0 existing artist-kind workspaces,
-- artist_profile table absent).
--
-- Design intent (from PRODUCT-MASTER 짠K + 짠L):
--   - Phase 6 captures the columns; UI for the?껈솏 dial (visibility_mode /
--     auto_decline_categories / bypass_brand_ids) lands in Phase 8 Wave E.
--   - twin_status starts at 'not_started' for every Artist; the R2 upload
--     pipeline that flips it to 'training' / 'active' is Phase 7+.
--   - instagram_handle is nullable at INSERT (yagi_admin invite) but the
--     Phase 6 onboarding gate (Wave A.3) blocks /[locale]/app/* until the
--     Artist completes the 1-step onboarding form. Application-layer
--     enforcement, not DB NOT NULL, so admin tooling can re-import legacy
--     accounts without backfill.
--
-- RLS posture:
--   - SELECT: Artist (workspace_member) + yagi_admin
--   - INSERT: yagi_admin only (Artist self-invite blocked)
--   - UPDATE: Artist + yagi_admin (RLS), but column-level GRANT lockdown
--     restricts Artist to (display_name, short_bio, instagram_handle,
--     updated_at) only ??twin_status / visibility_mode / bypass_brand_ids /
--     auto_decline_categories are admin-write through service-role tooling.
--   - DELETE: yagi_admin only
--
-- L-049 4-perspective audit (binding from codex-review-protocol.md):
--   1. As `client` (auth.uid() = workspace_member, no admin role) ??--      SELECT/UPDATE allowed for own row; INSERT denied (yagi_admin gate);
--      DELETE denied; column GRANT restricts UPDATE to display fields only.
--   2. As `ws_admin` ??same as client (no special policy branch); cannot
--      INSERT or DELETE; UPDATE restricted by column GRANT.
--   3. As `yagi_admin` ??full SELECT/INSERT/UPDATE/DELETE through RLS
--      bypass functions. Service-role client used in admin tooling.
--   4. As different-user same-workspace ??RLS USING (workspace_member
--      JOIN) denies row read/write since membership predicate fails.

CREATE TABLE artist_profile (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  -- Twin asset metadata (Phase 6 = column only; pipeline = Phase 7+)
  twin_status text NOT NULL DEFAULT 'not_started'
    CHECK (twin_status IN ('not_started', 'training', 'active', 'paused')),
  twin_r2_prefix text,
  -- Permission dials (Phase 6 = column only; UI = Phase 8 Wave E)
  auto_decline_categories text[] NOT NULL DEFAULT '{}',
  visibility_mode text NOT NULL DEFAULT 'paused'
    CHECK (visibility_mode IN ('open', 'paused')),
  bypass_brand_ids uuid[] NOT NULL DEFAULT '{}',
  -- Display
  display_name text,
  short_bio text,
  -- Instagram handle ??nullable at INSERT (admin invite); onboarding gate
  -- enforces NOT NULL before /[locale]/app/* access (application layer)
  instagram_handle text,
  -- Meta
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE artist_profile IS
  'Phase 6 Wave A.1 ??Artist workspace profile (1:1 with workspaces.kind = artist). '
  'Twin asset metadata + permission dials + display fields. Admin-write columns '
  '(twin_status / visibility_mode / bypass_brand_ids / auto_decline_categories) '
  'are protected via column-level GRANT lockdown.';

CREATE INDEX idx_artist_profile_visibility ON artist_profile(visibility_mode)
  WHERE visibility_mode = 'open';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;

-- SELECT: Artist (workspace_member) + yagi_admin
CREATE POLICY artist_profile_select ON artist_profile
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- INSERT: yagi_admin only. Artist self-invite is blocked at the policy
-- layer; admin tooling uses service-role client to bypass RLS while
-- still subject to application-layer guard (inviteArtistAction in A.3).
CREATE POLICY artist_profile_insert ON artist_profile
  FOR INSERT TO authenticated
  WITH CHECK (public.is_yagi_admin(auth.uid()));

-- UPDATE: Artist (workspace_member) for the display columns granted
-- below + yagi_admin for everything. Column GRANT lockdown enforces
-- the restriction for non-admin callers.
CREATE POLICY artist_profile_update ON artist_profile
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = artist_profile.workspace_id
        AND user_id = auth.uid()
    )
    OR public.is_yagi_admin(auth.uid())
  );

-- DELETE: yagi_admin only
CREATE POLICY artist_profile_delete ON artist_profile
  FOR DELETE TO authenticated
  USING (public.is_yagi_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Column-level GRANT lockdown (sub_03f_2 / sub_5 pattern, L-048)
--
-- REVOKE all UPDATE from authenticated, then re-GRANT only the columns
-- the Artist is allowed to mutate (display_name / short_bio /
-- instagram_handle / updated_at). Admin-write columns (twin_status /
-- visibility_mode / bypass_brand_ids / auto_decline_categories /
-- twin_r2_prefix / activated_at) require service-role client.
-- ---------------------------------------------------------------------------

REVOKE UPDATE ON artist_profile FROM authenticated;
GRANT UPDATE (display_name, short_bio, instagram_handle, updated_at)
  ON artist_profile TO authenticated;

-- Verification block ??fail apply if the column grant matrix drifts.
DO $$
BEGIN
  -- Authenticated must NOT have table-level UPDATE (column-level only)
  IF has_table_privilege('authenticated', 'public.artist_profile', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated has table-level UPDATE on artist_profile';
  END IF;

  -- Authenticated MUST have UPDATE on the 4 display columns
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'display_name', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on display_name';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'short_bio', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on short_bio';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'instagram_handle', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on instagram_handle';
  END IF;
  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'updated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on updated_at';
  END IF;

  -- Authenticated must NOT have UPDATE on admin-write columns
  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_status', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on twin_status';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'visibility_mode', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on visibility_mode';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'bypass_brand_ids', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on bypass_brand_ids';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'auto_decline_categories', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on auto_decline_categories';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_r2_prefix', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on twin_r2_prefix';
  END IF;
  IF has_column_privilege('authenticated', 'public.artist_profile', 'activated_at', 'UPDATE') THEN
    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on activated_at';
  END IF;
END $$;

codex
The server actions and migration have the expected broad shape: `inviteArtistAction` does authenticate before service-role creation, and onboarding uses the user-scoped client for the `instagram_handle` update. I’m checking the surrounding pages and resolver now, because the review hinges on whether those guards are actually reached in all app paths.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/layout.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/workspace/active.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/app/sidebar.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/components/sidebar/workspace-switcher.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 399ms:
import { redirect } from "@/i18n/routing";
import { fetchAppContext } from "@/lib/app/context";
import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
import {
  resolveActiveWorkspace,
  listOwnWorkspaces,
} from "@/lib/workspace/active";
import { NotificationBell } from "@/components/app/notification-bell";
import { PageHelpLink } from "@/components/app/page-help-link";
import { LanguageSwitcher } from "@/components/app/language-switcher";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getUserScopes } from "@/lib/app/scopes";
import { UserScopesProvider } from "@/lib/app/use-user-scopes";
import { SupportWidget } from "@/components/support/support-widget";
import { checkArtistOnboardingGate } from "@/lib/auth/artist-onboarding-gate";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  const ctx = await fetchAppContext();
  if (!ctx) {
    redirect({ href: "/onboarding", locale });
    return null;
  }

  const hasPrivilegedGlobalRole =
    ctx.workspaceRoles.includes("yagi_admin") ||
    ctx.workspaceRoles.includes("creator");
  // Phase 2.7: client persona doesn't need a workspace; their primary
  // surface is /app/commission.
  const isClient = ctx.profile.role === "client";
  if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
    redirect({ href: "/onboarding/workspace", locale });
    return null;
  }

  // Seed the bell with the current unread count. Realtime takes over from here.
  const { count: initialUnreadCount } = await supabase
    .from("notification_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", ctx.userId)
    .is("in_app_seen_at", null);

  const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";

  const scopes = getUserScopes(ctx);

  // Phase 4.x task_06 ??resolve active workspace + full membership list
  // for the sidebar workspace switcher. resolveActiveWorkspace reads the
  // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
  // returns every workspace the user belongs to (with workspaces.kind, which
  // null-safe-defaults to 'brand' until task_01 migration applies at Wave D).
  const [activeWorkspace, allWorkspaces] = await Promise.all([
    resolveActiveWorkspace(ctx.userId),
    listOwnWorkspaces(ctx.userId),
  ]);

  // Phase 6 Wave A.3 ??Artist onboarding gate.
  // If the active workspace is kind='artist' and instagram_handle IS NULL,
  // redirect to the 1-step onboarding page before the Artist reaches /app/*.
  const onboardingRedirect = await checkArtistOnboardingGate(
    activeWorkspace,
    locale
  );
  if (onboardingRedirect) {
    redirect({ href: "/onboarding/artist", locale });
    return null;
  }

  return (
    <UserScopesProvider value={scopes}>
      <div className="min-h-dvh flex">
        <Sidebar
          context={ctx}
          activeWorkspace={activeWorkspace}
          workspaces={allWorkspaces}
        />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
            <MobileSidebarSheet
              context={ctx}
              activeWorkspace={activeWorkspace}
              workspaces={allWorkspaces}
            />
            <div className="flex-1" />
            <PageHelpLink />
            <LanguageSwitcher />
            <NotificationBell
              initialUnreadCount={initialUnreadCount ?? 0}
              locale={bellLocale}
            />
          </header>
          <main className="flex-1 min-w-0">
            <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
              {children}
            </div>
          </main>
        </div>
        {/* Phase 2.8.6 ??workspace-scoped support chat. Hidden when
            the user has no workspace (mid-onboarding edge case).
            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
            backed active workspace (resolved above for the sidebar)
            instead of ctx.workspaces[0], so admins with multiple
            memberships chat against the workspace they actually selected. */}
        <SupportWidget
          workspaceId={activeWorkspace?.id ?? null}
          currentUserId={ctx.userId}
          currentUserName={ctx.profile.display_name ?? ""}
        />
      </div>
    </UserScopesProvider>
  );
}

 succeeded in 399ms:
// Phase 4.x task_06 ??Active workspace resolver.
//
// Decision lock-in (_decisions_locked.md section 2): cookie-based.
// The cookie 'yagi_active_workspace' carries a uuid. Every server-side
// page render that needs the active workspace must validate the
// cookie's uuid against workspace_members for the current user, then
// fall back to the first membership if invalid or absent.
//
// Cookie tampering is fully defended:
//   1. The cookie value is not trusted -- we always re-check
//      workspace_members membership on the server.
//   2. If the cookie's uuid is not a valid membership for this user,
//      we ignore it and use first-member fallback. (We do NOT trust
//      the cookie even for read-only display.)
//
// Phase 4 caveat: workspaces.kind column is added by task_01 migration
// (Wave D D.1 apply). Until apply, the SELECT returns undefined for
// kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
// existing row to 'brand'). Post-apply, kind is one of 3 enum values.

import { cookies } from "next/headers";
import { createSupabaseServer } from "@/lib/supabase/server";

export type WorkspaceKind = "brand" | "artist" | "yagi_admin";

export type ActiveWorkspaceMembership = {
  id: string;
  name: string;
  kind: WorkspaceKind;
};

export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function narrowKind(value: unknown): WorkspaceKind {
  if (value === "brand" || value === "artist" || value === "yagi_admin") {
    return value;
  }
  return "brand";
}

/**
 * Returns the user's workspace memberships, joined with workspace name + kind.
 * Used by the workspace switcher dropdown to render full lists. The active
 * one is found by `id === activeWorkspaceId`.
 *
 * Cross-tenant guard: the SELECT joins through workspace_members for the
 * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
 * SELECT to members.
 */
export async function listOwnWorkspaces(
  userId: string,
): Promise<ActiveWorkspaceMembership[]> {
  const supabase = await createSupabaseServer();
  // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
  const sb = supabase as any;
  const { data: rows } = (await sb
    .from("workspace_members")
    .select(
      `
      workspace_id,
      created_at,
      workspace:workspaces ( id, name, kind )
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true })) as {
    data:
      | {
          workspace_id: string;
          workspace: { id: string; name: string; kind?: string } | null;
        }[]
      | null;
  };

  const list: ActiveWorkspaceMembership[] = [];
  for (const r of rows ?? []) {
    if (!r.workspace) continue;
    list.push({
      id: r.workspace.id,
      name: r.workspace.name,
      kind: narrowKind(r.workspace.kind),
    });
  }
  return list;
}

/**
 * Resolve the user's currently-active workspace. Reads the
 * 'yagi_active_workspace' cookie, validates membership against
 * workspace_members, and falls back when the cookie is absent,
 * malformed, or doesn't correspond to a valid membership.
 *
 * Phase 6/A.2 ??Artist sign-in default:
 * When no valid cookie exists, prefer the user's most-recently-joined
 * Artist workspace over the simple first-membership fallback. This
 * ensures Artist users land in their own Artist workspace by default
 * rather than a Brand workspace they may also belong to.
 * listOwnWorkspaces returns memberships ordered by created_at ASC, so
 * we scan in reverse to pick the most recently joined artist workspace.
 *
 * Returns null when the user has no workspace memberships at all
 * (caller should redirect to /onboarding).
 */
export async function resolveActiveWorkspace(
  userId: string,
): Promise<ActiveWorkspaceMembership | null> {
  const memberships = await listOwnWorkspaces(userId);
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;

  if (cookieValue && UUID_RE.test(cookieValue)) {
    const match = memberships.find((m) => m.id === cookieValue);
    if (match) return match;
    // Fall through to default selection. We deliberately do NOT attempt
    // to clear the cookie here -- this resolver is read-only (cookies()
    // in next/headers is read in server components). The
    // setActiveWorkspace server action is the only writer; if a stale
    // cookie keeps arriving here, the resolver silently falls back
    // without leaking which workspace_id the user does NOT belong to.
  }

  // Phase 6/A.2 ??Artist sign-in default: prefer the most-recently-joined
  // Artist workspace so Artist users enter their own workspace by default.
  // listOwnWorkspaces orders by created_at ASC; we want most-recent,
  // so iterate in reverse.
  for (let i = memberships.length - 1; i >= 0; i--) {
    if (memberships[i].kind === "artist") return memberships[i];
  }

  return memberships[0];
}

 succeeded in 432ms:
"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarBrand } from "./sidebar-brand";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import {
  WorkspaceSwitcher,
  type WorkspaceItem,
} from "@/components/sidebar/workspace-switcher";
import type { AppContext } from "@/lib/app/context";

function isYagiInternal(context: AppContext): boolean {
  return context.workspaces.some((w) => w.slug === "yagi-internal");
}

type SidebarProps = {
  context: AppContext;
  /** Phase 4.x task_06 ??server-resolved active workspace + full membership list.
   *  When null (zero memberships), the workspace switcher is hidden. The
   *  /app layout redirects to /onboarding/workspace before reaching here in
   *  that case for non-privileged users. */
  activeWorkspace: WorkspaceItem | null;
  workspaces: WorkspaceItem[];
};

function SidebarBody({
  context,
  activeWorkspace,
  workspaces,
  onNavigate,
}: SidebarProps & { onNavigate?: () => void }) {
  const internalMember = isYagiInternal(context);
  // Phase 6/A.2 ??gate "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? to yagi_admin role only.
  const isYagiAdmin = context.workspaceRoles.includes("yagi_admin");
  return (
    <div
      className="flex flex-col h-full min-h-0"
      onClickCapture={(e) => {
        if (!onNavigate) return;
        const target = e.target as HTMLElement;
        if (target.closest("a")) onNavigate();
      }}
    >
      {/* Phase 4.x task_06 ??workspace switcher replaces the older
          SidebarScopeSwitcher at the sidebar top. yagi_admin / profile
          scope switching has been folded into the user menu + nav admin
          entry; the explicit scope switcher file remains for potential
          Phase 5+ reuse. */}
      <div className="px-5 pt-5 pb-3">
        <SidebarBrand />
        {activeWorkspace && (
          <div className="mt-3">
            <WorkspaceSwitcher
              current={activeWorkspace}
              workspaces={workspaces}
              isYagiAdmin={isYagiAdmin}
            />
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pt-1 pb-3">
        <SidebarNav
          roles={context.workspaceRoles}
          profileRole={context.profile.role}
          isYagiInternalMember={internalMember}
        />
      </div>
      <div className="p-3 border-t border-border">
        <SidebarUserMenu
          profile={context.profile}
          workspaceRoles={context.workspaceRoles}
          isYagiInternalMember={internalMember}
        />
      </div>
    </div>
  );
}

export function Sidebar({
  context,
  activeWorkspace,
  workspaces,
}: SidebarProps) {
  return (
    <aside
      aria-label="Main navigation"
      className="hidden md:flex w-[240px] shrink-0 border-r border-border bg-background flex-col min-h-dvh"
    >
      <SidebarBody
        context={context}
        activeWorkspace={activeWorkspace}
        workspaces={workspaces}
      />
    </aside>
  );
}

export function MobileSidebarSheet({
  context,
  activeWorkspace,
  workspaces,
}: SidebarProps) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open navigation"
      >
        <Menu className="w-4 h-4" />
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[260px] max-w-[80vw] flex flex-col"
      >
        <SheetTitle className="sr-only">Main navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Switch scope, navigate sections, and manage your account.
        </SheetDescription>
        <SidebarBody
          context={context}
          activeWorkspace={activeWorkspace}
          workspaces={workspaces}
          onNavigate={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

 succeeded in 439ms:
"use client";

// Phase 4.x task_06 ??Workspace switcher (sidebar top-left, dropdown).
// Phase 6/A.2 ??artist kind support + yagi_admin-gated "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲?.
//
// Shape (KICKOFF section task_06):
//   - Box: padding 8px 12px, radius 12, border subtle, bg surface
//   - Click -> DropdownMenu opens
//   - Groups: 釉뚮옖??/ ?꾪떚?ㅽ듃 / YAGI Admin
//   - '+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? visible to yagi_admin only (isYagiAdmin prop)
//   - Selecting a workspace calls setActiveWorkspaceAction (cookie set
//     + revalidate) and triggers a soft refresh.
//
// Cross-tenant defense:
//   - The list of workspaces is supplied by the server (props), already
//     RLS-scoped by membership. The client cannot fetch foreign
//     workspaces here.
//   - On click, the server action re-validates membership before setting
//     the cookie -- a tampered button click does not bypass.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { setActiveWorkspaceAction } from "@/lib/workspace/actions";

type WorkspaceKind = "brand" | "artist" | "yagi_admin";

export type WorkspaceItem = {
  id: string;
  name: string;
  kind: WorkspaceKind;
};

type Props = {
  current: WorkspaceItem;
  workspaces: WorkspaceItem[];
  /** Phase 6/A.2 ??show "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? only for yagi_admin */
  isYagiAdmin?: boolean;
};

export function WorkspaceSwitcher({ current, workspaces, isYagiAdmin = false }: Props) {
  const t = useTranslations("workspace.switcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Group by kind. Empty groups still render their label-less (we hide
  // the section if it has 0 entries to keep Phase 4 dropdown clean -- only
  // Brands shows up for users without artist/admin memberships).
  const brands = workspaces.filter((w) => w.kind === "brand");
  const artists = workspaces.filter((w) => w.kind === "artist");
  const admins = workspaces.filter((w) => w.kind === "yagi_admin");

  function handleSelect(workspaceId: string) {
    if (workspaceId === current.id) return;
    startTransition(async () => {
      const result = await setActiveWorkspaceAction(workspaceId);
      if (result.ok) {
        // The server action revalidates /app layout. router.refresh()
        // ensures the current view re-renders with the new active
        // workspace immediately.
        router.refresh();
      } else {
        const errorKey =
          result.error === "unauthenticated"
            ? "errors.unauthenticated"
            : result.error === "not_a_member"
              ? "errors.not_a_member"
              : "errors.invalid";
        toast.error(t(errorKey));
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 w-full rounded-xl border border-border/40 bg-card px-3 py-2 text-left text-sm",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors",
          isPending && "opacity-60",
        )}
      >
        <span className="flex-1 truncate font-medium text-foreground keep-all">
          {current.name}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]"
      >
        {brands.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
              {t("brands_group")}
            </DropdownMenuLabel>
            {brands.map((w) => (
              <Row
                key={w.id}
                workspace={w}
                isCurrent={w.id === current.id}
                onSelect={() => handleSelect(w.id)}
              />
            ))}
          </DropdownMenuGroup>
        )}
        {artists.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
                {t("artists_group")}
              </DropdownMenuLabel>
              {artists.map((w) => (
                <Row
                  key={w.id}
                  workspace={w}
                  isCurrent={w.id === current.id}
                  onSelect={() => handleSelect(w.id)}
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}
        {admins.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
                {t("admin_group")}
              </DropdownMenuLabel>
              {admins.map((w) => (
                <Row
                  key={w.id}
                  workspace={w}
                  isCurrent={w.id === current.id}
                  onSelect={() => handleSelect(w.id)}
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}
        {/* Phase 6/A.2 ??"+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? is yagi_admin only.
            Non-admin users (Artist / Brand) must not see this item. */}
        {isYagiAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="opacity-60">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-sm">{t("add_new")}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Row({
  workspace,
  isCurrent,
  onSelect,
}: {
  workspace: WorkspaceItem;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
      className="flex items-center gap-2"
    >
      <span className="flex-1 truncate text-sm keep-all">{workspace.name}</span>
      {isCurrent && (
        <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
      )}
    </DropdownMenuItem>
  );
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/workspace/actions.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/admin/artists/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/admin/artists/_components/invite-artist-form.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/admin/artists/_components/invite-artist-section.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 373ms:
"use server";

// Phase 4.x task_06 ??server actions for the workspace switcher.
//
// Cookie write (the read path is in active.ts via next/headers cookies()).
// We deliberately keep this in a separate server-action file so the
// resolver in active.ts can stay sync-free of any "use server" pragma.
//
// Tampering protection: setActiveWorkspaceAction validates that the
// caller actually belongs to the workspace they ask for. If they don't,
// the cookie is NOT set and the action returns an error. This means
// even if a bad client crafts a POST manually, only their own
// memberships make it into the cookie.

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { ACTIVE_WORKSPACE_COOKIE } from "./active";

export type SetActiveWorkspaceResult =
  | { ok: true }
  | { ok: false; error: "unauthenticated" | "not_a_member" | "invalid" };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setActiveWorkspaceAction(
  workspaceId: string,
): Promise<SetActiveWorkspaceResult> {
  if (!UUID_RE.test(workspaceId)) {
    return { ok: false, error: "invalid" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthenticated" };

  // Membership check: the workspaces RLS already scopes by member, but
  // we're explicit so the failure mode is a clean error rather than an
  // RLS-empty-result silent miss.
  const { data: row } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!row) return { ok: false, error: "not_a_member" };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    // 90 days ??long enough to survive typical client sessions; short
    // enough that an abandoned device eventually reverts to first-member
    // fallback after rotation. Re-write on every successful switch
    // refreshes the expiry.
    maxAge: 60 * 60 * 24 * 90,
  });

  // Re-render the app shell so the new active workspace propagates
  // through the sidebar + dashboards. The /app layout holds the
  // workspace-aware UI.
  revalidatePath("/[locale]/app", "layout");
  return { ok: true };
}

 succeeded in 395ms:
// Phase 6 Wave A.3 ??/admin/artists
//
// Shows the full ?뚯냽 ?꾪떚?ㅽ듃 list with status column:
//   ??invite ?꾨즺  ??magic-link sent but email_confirmed_at IS NULL
//   ??onboarding   ??email confirmed but instagram_handle IS NULL
//   ???쒖꽦          ??email confirmed + instagram_handle set
//
// Page-level auth gate: notFound() for any non-yagi_admin caller.
// The parent admin/layout.tsx already redirects non-admins, but we
// add an explicit notFound() here as a defence-in-depth layer (per spec).

import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { InviteArtistSection } from "./_components/invite-artist-section";

type Props = {
  params: Promise<{ locale: string }>;
};

type ArtistRow = {
  workspaceId: string;
  workspaceName: string;
  displayName: string | null;
  email: string;
  instagramHandle: string | null;
  createdAt: string;
  emailConfirmedAt: string | null;
};

function statusKey(row: ArtistRow): "invite_pending" | "onboarding" | "active" {
  if (!row.emailConfirmedAt) return "invite_pending";
  if (!row.instagramHandle) return "onboarding";
  return "active";
}

export default async function AdminArtistsPage({ params }: Props) {
  const { locale } = await params;

  // Auth gate ??notFound for non-yagi_admin
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .eq("role", "yagi_admin");

  if (!roles || roles.length === 0) notFound();

  const t = await getTranslations("admin_artists");

  // Fetch all artist workspaces + profiles via service-role client
  // (artist_profile has RLS SELECT gated to workspace_members + yagi_admin;
  //  yagi_admin check uses is_yagi_admin RLS function. Using service-role
  //  here avoids the RPC function call overhead in a list query.)
  const sbAdmin = createSupabaseService();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
  const sbAny = sbAdmin as any;

  const { data: profileRows, error: profileErr } = await sbAny
    .from("artist_profile")
    .select(
      `
      workspace_id,
      display_name,
      instagram_handle,
      created_at,
      workspace:workspaces(id, name),
      member:workspace_members(user_id)
    `
    )
    .order("created_at", { ascending: false });

  if (profileErr) {
    console.error("[AdminArtistsPage] artist_profile fetch error:", profileErr);
  }

  type RawProfile = {
    workspace_id: string;
    display_name: string | null;
    instagram_handle: string | null;
    created_at: string;
    workspace: { id: string; name: string } | null;
    member: { user_id: string }[] | null;
  };

  const profiles: RawProfile[] = profileRows ?? [];

  // Collect user_ids for auth lookup
  const userIds = profiles
    .map((p) => p.member?.[0]?.user_id)
    .filter((id): id is string => typeof id === "string");

  // Fetch auth users in bulk to get email + email_confirmed_at
  const authUserMap = new Map<
    string,
    { email: string; email_confirmed_at: string | null }
  >();

  if (userIds.length > 0) {
    const { data: usersPage, error: usersErr } =
      await sbAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (usersErr) {
      console.error("[AdminArtistsPage] auth.admin.listUsers error:", usersErr);
    } else {
      for (const u of usersPage.users) {
        if (userIds.includes(u.id)) {
          authUserMap.set(u.id, {
            email: u.email ?? "",
            email_confirmed_at: u.email_confirmed_at ?? null,
          });
        }
      }
    }
  }

  // Build display rows
  const artists: ArtistRow[] = profiles.map((p) => {
    const userId = p.member?.[0]?.user_id ?? "";
    const authInfo = authUserMap.get(userId);
    return {
      workspaceId: p.workspace_id,
      workspaceName: p.workspace?.name ?? p.display_name ?? "??,
      displayName: p.display_name,
      email: authInfo?.email ?? "??,
      instagramHandle: p.instagram_handle,
      createdAt: p.created_at,
      emailConfirmedAt: authInfo?.email_confirmed_at ?? null,
    };
  });

  return (
    <div className="px-10 py-12 max-w-5xl space-y-10">
      {/* Header */}
      <div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] mb-1 keep-all">
          {t("title")}
        </h1>
      </div>

      {/* Invite section */}
      <InviteArtistSection t_invite_cta={t("invite_cta")} />

      {/* Artist table */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {t("table_heading")}
        </h2>

        {artists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("table_empty")}</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("column_name")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {t("column_email")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    {t("column_instagram")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {t("column_joined_at")}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t("column_status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {artists.map((artist) => {
                  const sk = statusKey(artist);
                  return (
                    <tr
                      key={artist.workspaceId}
                      className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium keep-all">
                        {artist.displayName ?? "??}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-[12px]">
                        {artist.email}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-[12px]">
                        {artist.instagramHandle ? `@${artist.instagramHandle}` : "??}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground hidden md:table-cell">
                        {new Intl.DateTimeFormat(locale, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        }).format(new Date(artist.createdAt))}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        {sk === "invite_pending" && (
                          <span className="text-muted-foreground">
                            {t("status_invite_pending")}
                          </span>
                        )}
                        {sk === "onboarding" && (
                          <span className="text-amber-600 dark:text-amber-400">
                            {t("status_onboarding")}
                          </span>
                        )}
                        {sk === "active" && (
                          <span className="text-[#71D083]">
                            {t("status_active")}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

 succeeded in 400ms:
"use client";

// Phase 6 Wave A.3 ??Invite Artist inline form
// Calls inviteArtistAction on submit; shows Sonner toast on result.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { inviteArtistAction } from "../_actions/invite-artist";

const schema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(80),
  shortBio: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface InviteArtistFormProps {
  onSuccess?: () => void;
}

export function InviteArtistForm({ onSuccess }: InviteArtistFormProps) {
  const t = useTranslations("admin_artists");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", displayName: "", shortBio: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await inviteArtistAction(values);
    setSubmitting(false);

    if (result.ok) {
      toast.success(t("invite_success"));
      reset();
      onSuccess?.();
    } else {
      const msgMap: Record<string, string> = {
        validation: t("invite_error_validation"),
        unauthenticated: t("invite_error_unauthenticated"),
        forbidden: t("invite_error_forbidden"),
        invite_failed: t("invite_error_invite_failed"),
        db: t("invite_error_db"),
      };
      toast.error(msgMap[result.error] ?? result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">{t("form_email")}</Label>
        <Input
          id="invite-email"
          type="email"
          placeholder="artist@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-name">{t("form_display_name")}</Label>
        <Input
          id="invite-name"
          placeholder={t("form_display_name_ph")}
          {...register("displayName")}
        />
        {errors.displayName && (
          <p className="text-xs text-destructive">{errors.displayName.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="invite-bio">
          {t("form_short_bio")}{" "}
          <span className="text-muted-foreground text-xs">({t("optional")})</span>
        </Label>
        <Textarea
          id="invite-bio"
          placeholder={t("form_short_bio_ph")}
          rows={3}
          {...register("shortBio")}
        />
        {errors.shortBio && (
          <p className="text-xs text-destructive">{errors.shortBio.message}</p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="rounded-full px-6">
        {submitting ? "..." : t("form_submit")}
      </Button>
    </form>
  );
}

 succeeded in 375ms:
"use client";

// Phase 6 Wave A.3 ??Invite Artist section (toggle + form)
// Renders the [+ ??Artist ?곸엯] button and the inline form below it.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { InviteArtistForm } from "./invite-artist-form";

interface InviteArtistSectionProps {
  t_invite_cta: string;
}

export function InviteArtistSection({
  t_invite_cta,
}: InviteArtistSectionProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSuccess() {
    setOpen(false);
    // Revalidate the page to refresh the artist list
    router.refresh();
  }

  return (
    <section className="space-y-4">
      <Button
        variant="outline"
        className="rounded-full px-6 border-border"
        onClick={() => setOpen((v) => !v)}
      >
        {t_invite_cta}
      </Button>

      {open && (
        <div className="border border-border rounded-lg p-6 bg-background">
          <InviteArtistForm onSuccess={handleSuccess} />
        </div>
      )}
    </section>
  );
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/onboarding/artist/page.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/onboarding/artist/_components/onboarding-form.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'workspace|admin_artists|onboarding_artist|Roster|Routing|Inbound|Talent-Initiated|RFP|D2C|Approval Gate|Bypass brands|Auto-decline|License fee|Type N|Curation note|로스터|라우팅|인바운드|탤런트|RFP|D2C|승인 게이트|바이패스|자동 거절|라이선스|Type N|큐레이션' messages/ko.json messages/en.json" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'create workspace|workspace|setActiveWorkspaceAction|is_yagi_admin|yagi_admin' src -g '*.ts' -g '*.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 406ms:
"use client";

// Phase 6 Wave A.3 ??Artist 1-step onboarding form
// Instagram handle input + "?쒖옉?섍린 ?? submit button.
// On success, router.push to /[locale]/app/projects.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeArtistOnboardingAction } from "../_actions/complete-onboarding";

const schema = z.object({
  instagramHandle: z.string().min(1).max(31),
});

type FormValues = z.infer<typeof schema>;

interface OnboardingFormProps {
  locale: string;
  email: string;
  displayName: string;
}

export function OnboardingForm({ locale, email, displayName }: OnboardingFormProps) {
  const t = useTranslations("onboarding_artist");
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { instagramHandle: "" },
  });

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    const result = await completeArtistOnboardingAction({
      instagramHandle: values.instagramHandle,
    });
    setSubmitting(false);

    if (result.ok) {
      router.push(`/${locale}/app/projects`);
    } else {
      if (result.error === "forbidden") {
        // Already completed ??push to app directly
        router.push(`/${locale}/app/projects`);
        return;
      }
      toast.error(result.message ?? result.error);
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("greeting", { name: displayName })}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">{t("subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Read-only email */}
        <div className="space-y-1.5">
          <Label>{t("email_label")}</Label>
          <Input
            value={email}
            readOnly
            disabled
            className="bg-muted/50 cursor-not-allowed"
          />
        </div>

        {/* Instagram handle */}
        <div className="space-y-1.5">
          <Label htmlFor="instagram-handle">{t("instagram_label")}</Label>
          <Input
            id="instagram-handle"
            placeholder="@your_handle"
            {...register("instagramHandle")}
          />
          {errors.instagramHandle && (
            <p className="text-xs text-destructive">
              {errors.instagramHandle.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          className="w-full rounded-full"
          disabled={submitting}
        >
          {submitting ? "..." : t("submit_cta")}
        </Button>
      </form>
    </div>
  );
}

 succeeded in 407ms:
// Phase 6 Wave A.3 ??/[locale]/onboarding/artist
//
// 1-step Artist onboarding page. Rendered inside the existing
// /[locale]/onboarding/layout.tsx (auth-gated, YAGI wordmark header).
//
// Server component: fetches email + display_name, then renders the
// client-side OnboardingForm with those values as props.

import { redirect } from "@/i18n/routing";
import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { OnboardingForm } from "./_components/onboarding-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ArtistOnboardingPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  // Resolve user's artist workspace and profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
  const sbAny = supabase as any;
  const { data: memberRows } = await sbAny
    .from("workspace_members")
    .select("workspace_id, workspace:workspaces(id, kind)")
    .eq("user_id", user.id);

  type MemberRow = {
    workspace_id: string;
    workspace: { id: string; kind: string } | null;
  };

  const artistMember = (memberRows as MemberRow[] | null)?.find(
    (r) => r.workspace?.kind === "artist"
  );

  if (!artistMember) {
    // No artist workspace ??shouldn't happen post-invite; fall back to notFound
    notFound();
  }

  // Fetch artist_profile for display_name
  const { data: profile } = await supabase
    .from("artist_profile")
    .select("display_name, instagram_handle")
    .eq("workspace_id", artistMember.workspace_id)
    .maybeSingle();

  // If instagram_handle is already set ??onboarding already done, redirect to app
  if (profile?.instagram_handle !== null && profile?.instagram_handle !== undefined) {
    redirect({ href: "/app/projects", locale });
  }

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Artist";
  const email = user.email ?? "";

  return (
    <OnboardingForm
      locale={locale}
      email={email}
      displayName={displayName}
    />
  );
}

 succeeded in 408ms:
messages/en.json:149:    "workspace_title": "Create your workspace",
messages/en.json:150:    "workspace_sub": "Set up a shared space to manage projects with your team.",
messages/en.json:151:    "workspace_name": "Workspace name",
messages/en.json:152:    "workspace_name_ph": "e.g., Concrete Works",
messages/en.json:153:    "workspace_slug": "Workspace address",
messages/en.json:154:    "workspace_slug_ph": "your-workspace",
messages/en.json:155:    "workspace_slug_help": "studio.yagiworkshop.xyz/w/",
messages/en.json:156:    "workspace_slug_korean_warning": "The address can only contain letters, digits, and hyphens — please type one manually.",
messages/en.json:280:    "convert_button": "Create workspace",
messages/en.json:294:  "workspace": {
messages/en.json:297:    "no_workspace": "No workshop",
messages/en.json:302:      "add_new": "+ New workspace",
messages/en.json:305:        "not_a_member": "You are not a member of this workspace.",
messages/en.json:306:        "invalid": "Couldn't switch workspaces. Please try again in a moment."
messages/en.json:393:    "request_modal_no_workspace_title": "Workspace required",
messages/en.json:394:    "request_modal_no_workspace_body": "Finish onboarding first to request a meeting.",
messages/en.json:695:          "no_workspace": "Workspace not found.",
messages/en.json:703:          "description": "A workspace we'll fill in together. Add only what you have; leave the rest blank — we'll catch up in the kickoff meeting."
messages/en.json:966:    "workspace_tab": "Workspace",
messages/en.json:972:    "workspace_name_label": "Workspace name",
messages/en.json:974:    "workspace_logo_upload": "Upload logo",
messages/en.json:1004:    "workspaces_tab": "Workspaces",
messages/en.json:1005:    "cross_workspace_projects": "All projects",
messages/en.json:1007:    "filter_workspace": "Filter by workshop",
messages/en.json:1040:      "col_workspace": "Workspace",
messages/en.json:1675:      "routing": "Routing",
messages/en.json:1874:      "workspace_admin": "Workspace admin",
messages/en.json:2098:  "workspace_switcher": {
messages/en.json:2099:    "current_label": "Current workspace",
messages/en.json:2102:    "add_new": "+ New workspace"
messages/en.json:2104:  "admin_artists": {
messages/en.json:2105:    "title": "Roster",
messages/en.json:2131:  "onboarding_artist": {
messages/ko.json:149:    "workspace_title": "워크스페이스 만들기",
messages/ko.json:150:    "workspace_sub": "프로젝트를 함께 관리할 팀 공간을 설정합니다.",
messages/ko.json:151:    "workspace_name": "워크스페이스 이름",
messages/ko.json:152:    "workspace_name_ph": "예: 콘크리트웍스",
messages/ko.json:153:    "workspace_slug": "워크스페이스 주소",
messages/ko.json:154:    "workspace_slug_ph": "your-workspace",
messages/ko.json:155:    "workspace_slug_help": "studio.yagiworkshop.xyz/w/",
messages/ko.json:156:    "workspace_slug_korean_warning": "주소는 영문, 숫자, 하이픈만 사용할 수 있어요. 직접 입력해 주세요.",
messages/ko.json:294:  "workspace": {
messages/ko.json:297:    "no_workspace": "워크스페이스 없음",
messages/ko.json:393:    "request_modal_no_workspace_title": "워크스페이스가 필요해요",
messages/ko.json:394:    "request_modal_no_workspace_body": "온보딩을 마치면 미팅을 요청할 수 있어요.",
messages/ko.json:537:          "tooltip": "Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는 걸 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.",
messages/ko.json:593:          "tooltip": "Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는 걸 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.",
messages/ko.json:695:          "no_workspace": "워크스페이스를 찾을 수 없어요.",
messages/ko.json:848:            "tooltip": "Digital Twin은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI가 라이선스를 보유한 인물의 Twin을 광고/콘텐츠 제작에 사용할 수 있습니다.\n\nDigital Twin 없이 가상 인물 / VFX만으로도 진행 가능합니다."
messages/ko.json:966:    "workspace_tab": "워크스페이스",
messages/ko.json:972:    "workspace_name_label": "워크스페이스 이름",
messages/ko.json:974:    "workspace_logo_upload": "로고 업로드",
messages/ko.json:1004:    "workspaces_tab": "워크스페이스",
messages/ko.json:1005:    "cross_workspace_projects": "전체 프로젝트",
messages/ko.json:1007:    "filter_workspace": "워크스페이스 필터",
messages/ko.json:1040:      "col_workspace": "워크스페이스",
messages/ko.json:1740:      "routing": "라우팅",
messages/ko.json:1939:      "workspace_admin": "워크스페이스 관리자",
messages/ko.json:2163:  "workspace_switcher": {
messages/ko.json:2169:  "admin_artists": {
messages/ko.json:2196:  "onboarding_artist": {

 succeeded in 572ms:
src\lib\auth\artist-onboarding-gate.ts:3:// Called from src/app/[locale]/app/layout.tsx after the active workspace
src\lib\auth\artist-onboarding-gate.ts:4:// is resolved. If the active workspace is kind='artist' and the artist_profile
src\lib\auth\artist-onboarding-gate.ts:14://   2. It has access to the resolved active workspace (kind) already fetched
src\lib\auth\artist-onboarding-gate.ts:20:import type { ActiveWorkspaceMembership } from "@/lib/workspace/active";
src\lib\auth\artist-onboarding-gate.ts:26: * @param activeWorkspace - The user's currently-active workspace (may be null)
src\lib\auth\artist-onboarding-gate.ts:33:  // Only relevant for Artist workspaces
src\lib\auth\artist-onboarding-gate.ts:43:    .eq("workspace_id", activeWorkspace.id)
src\components\admin\projects-queue.tsx:34:  workspace: { id: string; name: string } | null;
src\components\admin\projects-queue.tsx:194:                  <p className="text-xs text-zinc-500">{project.workspace?.name}</p>
src\app\auth\confirm\route.ts:28:  "/onboarding/workspace",
src\app\auth\confirm\route.ts:34:const DEFAULT_NEXT = "/onboarding/workspace";
src\emails\projects\project_submitted_admin.tsx:23:  workspaceName: string;
src\emails\projects\project_submitted_admin.tsx:111:  workspaceName,
src\emails\projects\project_submitted_admin.tsx:144:              {workspaceName}
src\emails\projects\project_submitted_admin.tsx:181:  workspaceName: "Acme Studios",
src\app\auth\callback\route.ts:46:  // the user arrives at /onboarding/workspace already authenticated.
src\app\auth\callback\route.ts:70:  // longer the right onboarding gate. Use workspace membership + global
src\app\auth\callback\route.ts:93:  const { count: workspaceMembershipCount } = await supabase
src\app\auth\callback\route.ts:94:    .from("workspace_members")
src\app\auth\callback\route.ts:95:    .select("workspace_id", { count: "exact", head: true })
src\app\auth\callback\route.ts:102:    .is("workspace_id", null)
src\app\auth\callback\route.ts:103:    .in("role", ["creator", "yagi_admin"]);
src\app\auth\callback\route.ts:105:  const hasWorkspace = (workspaceMembershipCount ?? 0) > 0;
src\app\auth\callback\route.ts:110:      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
src\app\auth\callback\route.ts:111:      : `${origin}/${locale}/onboarding/workspace`;
src\lib\app\context.ts:2:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\lib\app\context.ts:4:// Phase 1.1 workspace permission system — unchanged literals, renamed type.
src\lib\app\context.ts:8:  | "workspace_admin"
src\lib\app\context.ts:9:  | "workspace_member"
src\lib\app\context.ts:10:  | "yagi_admin";
src\lib\app\context.ts:44:  workspaceRoles: WorkspaceRole[];
src\lib\app\context.ts:45:  workspaces: { id: string; name: string; slug: string }[];
src\lib\app\context.ts:69:  const workspaceRoles = (rolesRows ?? []).map(
src\lib\app\context.ts:74:    .from("workspace_members")
src\lib\app\context.ts:75:    .select("workspace_id, workspaces(id, name, slug)")
src\lib\app\context.ts:78:  const workspaces =
src\lib\app\context.ts:80:      .map((row) => row.workspaces)
src\lib\app\context.ts:84:  // currentWorkspaceId previously took workspaces[0] (oldest membership),
src\lib\app\context.ts:85:  // which silently bypassed the workspace switcher cookie for every
src\lib\app\context.ts:103:    workspaceRoles,
src\lib\app\context.ts:104:    workspaces,
src\components\brief-board\yagi-request-modal.tsx:8:// `project_brief_yagi_request` notification to every yagi_admin via the
src\lib\workspace\active.ts:1:// Phase 4.x task_06 — Active workspace resolver.
src\lib\workspace\active.ts:4:// The cookie 'yagi_active_workspace' carries a uuid. Every server-side
src\lib\workspace\active.ts:5:// page render that needs the active workspace must validate the
src\lib\workspace\active.ts:6:// cookie's uuid against workspace_members for the current user, then
src\lib\workspace\active.ts:11://      workspace_members membership on the server.
src\lib\workspace\active.ts:16:// Phase 4 caveat: workspaces.kind column is added by task_01 migration
src\lib\workspace\active.ts:24:export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\lib\workspace\active.ts:32:export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";
src\lib\workspace\active.ts:38:  if (value === "brand" || value === "artist" || value === "yagi_admin") {
src\lib\workspace\active.ts:45: * Returns the user's workspace memberships, joined with workspace name + kind.
src\lib\workspace\active.ts:46: * Used by the workspace switcher dropdown to render full lists. The active
src\lib\workspace\active.ts:49: * Cross-tenant guard: the SELECT joins through workspace_members for the
src\lib\workspace\active.ts:50: * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
src\lib\workspace\active.ts:57:  // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
src\lib\workspace\active.ts:58:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
src\lib\workspace\active.ts:61:    .from("workspace_members")
src\lib\workspace\active.ts:64:      workspace_id,
src\lib\workspace\active.ts:66:      workspace:workspaces ( id, name, kind )
src\lib\workspace\active.ts:73:          workspace_id: string;
src\lib\workspace\active.ts:74:          workspace: { id: string; name: string; kind?: string } | null;
src\lib\workspace\active.ts:81:    if (!r.workspace) continue;
src\lib\workspace\active.ts:83:      id: r.workspace.id,
src\lib\workspace\active.ts:84:      name: r.workspace.name,
src\lib\workspace\active.ts:85:      kind: narrowKind(r.workspace.kind),
src\lib\workspace\active.ts:92: * Resolve the user's currently-active workspace. Reads the
src\lib\workspace\active.ts:93: * 'yagi_active_workspace' cookie, validates membership against
src\lib\workspace\active.ts:94: * workspace_members, and falls back when the cookie is absent,
src\lib\workspace\active.ts:99: * Artist workspace over the simple first-membership fallback. This
src\lib\workspace\active.ts:100: * ensures Artist users land in their own Artist workspace by default
src\lib\workspace\active.ts:101: * rather than a Brand workspace they may also belong to.
src\lib\workspace\active.ts:103: * we scan in reverse to pick the most recently joined artist workspace.
src\lib\workspace\active.ts:105: * Returns null when the user has no workspace memberships at all
src\lib\workspace\active.ts:125:    // without leaking which workspace_id the user does NOT belong to.
src\lib\workspace\active.ts:129:  // Artist workspace so Artist users enter their own workspace by default.
src\lib\workspace\actions.ts:3:// Phase 4.x task_06 — server actions for the workspace switcher.
src\lib\workspace\actions.ts:9:// Tampering protection: setActiveWorkspaceAction validates that the
src\lib\workspace\actions.ts:10:// caller actually belongs to the workspace they ask for. If they don't,
src\lib\workspace\actions.ts:27:export async function setActiveWorkspaceAction(
src\lib\workspace\actions.ts:28:  workspaceId: string,
src\lib\workspace\actions.ts:30:  if (!UUID_RE.test(workspaceId)) {
src\lib\workspace\actions.ts:40:  // Membership check: the workspaces RLS already scopes by member, but
src\lib\workspace\actions.ts:44:    .from("workspace_members")
src\lib\workspace\actions.ts:45:    .select("workspace_id")
src\lib\workspace\actions.ts:47:    .eq("workspace_id", workspaceId)
src\lib\workspace\actions.ts:53:  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
src\lib\workspace\actions.ts:64:  // Re-render the app shell so the new active workspace propagates
src\lib\workspace\actions.ts:66:  // workspace-aware UI.
src\lib\app\scopes.ts:8: * dropped along with persona A locking. Only workspace + admin remain.
src\lib\app\scopes.ts:11:  | { kind: "workspace"; id: string; name: string; href: string; active: boolean }
src\lib\app\scopes.ts:17:  for (const ws of ctx.workspaces) {
src\lib\app\scopes.ts:19:      kind: "workspace",
src\lib\app\scopes.ts:30:  if (ctx.workspaceRoles.includes("yagi_admin")) {
src\app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
src\app\api\health\google\route.ts:19:    .is('workspace_id', null)
src\app\api\health\google\route.ts:20:    .eq('role', 'yagi_admin')
src\components\brief-board\lock-button.tsx:4:// Phase 2.8 G_B-6 — Lock / Unlock button (yagi_admin-only)
src\components\brief-board\lock-button.tsx:8:// trigger. Server actions lockBrief / unlockBrief enforce yagi_admin via
src\app\api\share\[token]\reactions\route.ts:42:    .select("id, title, project_id, workspace_id")
src\app\api\share\[token]\reactions\route.ts:103:      .eq("role", "yagi_admin")
src\app\api\share\[token]\reactions\route.ts:104:      .is("workspace_id", null);
src\app\api\share\[token]\reactions\route.ts:115:            workspace_id: board.workspace_id,
src\app\api\share\[token]\comments\route.ts:53:    .select("id, title, project_id, workspace_id")
src\app\api\share\[token]\comments\route.ts:96:  // than querying workspace_members+auth.users. This keeps the API route
src\app\api\share\[token]\comments\route.ts:99:  // enhancement can fan out to all yagi_admin emails via a DB query.
src\app\api\share\[token]\comments\route.ts:136:      .eq("role", "yagi_admin")
src\app\api\share\[token]\comments\route.ts:137:      .is("workspace_id", null);
src\app\api\share\[token]\comments\route.ts:149:            workspace_id: board.workspace_id,
src\app\[locale]\onboarding\workspace\page.tsx:16:// workspace name. Pure Roman names produce a kebab-case slug; non-ASCII
src\app\[locale]\onboarding\workspace\page.tsx:18:// `workspace_slug_korean_warning` nudge below.
src\app\[locale]\onboarding\workspace\page.tsx:72:    if (res.error || !res.workspaceId) {
src\app\[locale]\onboarding\workspace\page.tsx:73:      toast.error(res.error ?? "workspace_failed");
src\app\[locale]\onboarding\workspace\page.tsx:76:    router.push(`/${locale}/onboarding/brand?ws=${res.workspaceId}`);
src\app\[locale]\onboarding\workspace\page.tsx:82:        <h1 className="font-display text-3xl tracking-tight keep-all">{t("workspace_title")}</h1>
src\app\[locale]\onboarding\workspace\page.tsx:83:        <p className="text-sm text-muted-foreground keep-all">{t("workspace_sub")}</p>
src\app\[locale]\onboarding\workspace\page.tsx:87:          <Label htmlFor="name">{t("workspace_name")}</Label>
src\app\[locale]\onboarding\workspace\page.tsx:88:          <Input id="name" {...register("name")} placeholder={t("workspace_name_ph")} />
src\app\[locale]\onboarding\workspace\page.tsx:92:          <Label htmlFor="slug">{t("workspace_slug")}</Label>
src\app\[locale]\onboarding\workspace\page.tsx:96:            placeholder={t("workspace_slug_ph")}
src\app\[locale]\onboarding\workspace\page.tsx:103:            {t("workspace_slug_help")}
src\app\[locale]\onboarding\workspace\page.tsx:108:              {t("workspace_slug_korean_warning")}
src\components\invoices\new-invoice-form.tsx:33:  workspace_id: string;
src\components\invoices\new-invoice-form.tsx:34:  workspace: {
src\components\invoices\new-invoice-form.tsx:121:              {p.workspace?.name ? ` · ${p.workspace.name}` : ""}
src\components\invoices\new-invoice-form.tsx:130:        {selectedProject?.workspace && (
src\components\invoices\new-invoice-form.tsx:133:            {selectedProject.workspace.name}
src\components\invoices\new-invoice-form.tsx:134:            {selectedProject.workspace.business_registration_number ? (
src\components\invoices\new-invoice-form.tsx:137:                {selectedProject.workspace.business_registration_number}
src\components\invoices\invoice-editor.tsx:76:  workspace_id: string;
src\components\invoices\invoice-editor.tsx:899:              href="/app/settings/workspace"
src\components\invoices\invoice-editor.tsx:902:              /app/settings/workspace
src\lib\thread-attachments.ts:12: * project_id and that the requester is a workspace member — so the `pending`
src\components\team\message-composer.tsx:36:/** YAGI Internal workspace id (constant — from migration). */
src\components\team\message-composer.tsx:220:        workspaceId: YAGI_INTERNAL_WORKSPACE_ID,
src\components\project-detail\progress-tab.tsx:6:// - Authorization is page.tsx's job (BLOCKER 1 created_by + yagi_admin).
src\app\[locale]\onboarding\profile\page.tsx:4:// entry now bounces to workspace creation (Brand persona's only step).
src\app\[locale]\onboarding\profile\page.tsx:11:  redirect({ href: "/onboarding/workspace", locale });
src\components\project-detail\next-action-cta.tsx:84:  // Non-owner viewers (yagi_admin / workspace_admin) see a hint instead of
src\app\[locale]\onboarding\page.tsx:18:  // selection flow retired; first-touch onboarding is the workspace
src\app\[locale]\onboarding\page.tsx:20:  // have a workspace go straight to /app.
src\app\[locale]\onboarding\page.tsx:21:  if (state.workspaceMembershipCount >= 1 || state.hasGlobalRole) {
src\app\[locale]\onboarding\page.tsx:26:  redirect({ href: "/onboarding/workspace", locale });
src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
src\components\challenges\header-cta-resolver.tsx:34:    .eq("role", "yagi_admin")
src\lib\team-channels\queries.ts:4:/** YAGI Internal workspace id (constant — from migration). */
src\lib\team-channels\queries.ts:167: * True iff the user is a member of the YAGI Internal workspace.
src\lib\team-channels\queries.ts:175:    .from("workspaces")
src\lib\team-channels\queries.ts:182:    .from("workspace_members")
src\lib\team-channels\queries.ts:184:    .eq("workspace_id", ws.id)
src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src\lib\team-channels\queries.ts:270: * Lists all YAGI Internal workspace members (with profile info) for the
src\lib\team-channels\queries.ts:277:    .from("workspace_members")
src\lib\team-channels\queries.ts:279:    .eq("workspace_id", YAGI_INTERNAL_WORKSPACE_ID)
src\lib\team-channels\attachments.ts:16: *   {workspace_id}/{channel_id}/{message_id}/{uuid}__{filename}
src\lib\team-channels\attachments.ts:75:  workspaceId: string;
src\lib\team-channels\attachments.ts:83:    typeof input.workspaceId !== "string" ||
src\lib\team-channels\attachments.ts:91:    !UUID_RE.test(input.workspaceId) ||
src\lib\team-channels\attachments.ts:100:  // auth: must be a YAGI Internal workspace member
src\lib\team-channels\attachments.ts:109:  // channel must exist + belong to workspace
src\lib\team-channels\attachments.ts:112:    .select("id, workspace_id")
src\lib\team-channels\attachments.ts:116:  if (channel.workspace_id !== input.workspaceId) {
src\lib\team-channels\attachments.ts:143:    const storagePath = `${input.workspaceId}/${input.channelId}/${input.messageId}/${uuid}__${cleanName}`;
src\app\[locale]\onboarding\invite\page.tsx:20:  const workspaceId = search.get("ws");
src\app\[locale]\onboarding\invite\page.tsx:42:    if (!workspaceId) {
src\app\[locale]\onboarding\invite\page.tsx:43:      toast.error("missing_workspace");
src\app\[locale]\onboarding\invite\page.tsx:47:    const res = await sendInvitationsAction({ workspaceId, emails, role: "member" });
src\components\project-detail\board-tab.tsx:9://   (BLOCKER 1: project.created_by === auth.uid() OR yagi_admin).
src\components\project-detail\board-tab.tsx:107:        viewerRole={isYagiAdmin ? "yagi_admin" : "client"}
src\app\[locale]\onboarding\brand\page.tsx:34:  const workspaceId = search.get("ws");
src\app\[locale]\onboarding\brand\page.tsx:50:    if (!workspaceId) {
src\app\[locale]\onboarding\brand\page.tsx:51:      toast.error("missing_workspace");
src\app\[locale]\onboarding\brand\page.tsx:55:    const res = await createBrandAction({ workspaceId, name: values.name, slug: values.slug });
src\app\[locale]\onboarding\brand\page.tsx:61:    router.push(`/${locale}/onboarding/invite?ws=${workspaceId}`);
src\app\[locale]\onboarding\brand\page.tsx:82:            onClick={() => router.push(`/${locale}/onboarding/invite?ws=${workspaceId ?? ""}`)}
src\app\[locale]\onboarding\brand\page.tsx:102:            <Label htmlFor="slug">{t("workspace_slug")}</Label>
src\components\preprod\new-board-form.tsx:26:  projects: { id: string; title: string; workspace?: { name: string } | null }[];
src\components\preprod\new-board-form.tsx:84:              {p.workspace?.name ? ` · ${p.workspace.name}` : ""}
src\components\preprod\board-editor.tsx:131:  project: { title: string; workspace_id: string } | null;
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:13:// the artist_profile_update RLS policy gates by workspace_members
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:17://   1. client (workspace_member of the Artist workspace) → permitted
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:18://   2. ws_admin (different workspace)                   → blocked by RLS USING
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:19://   3. yagi_admin                                        → permitted via is_yagi_admin
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:20://   4. different-user same-workspace                    → blocked by RLS USING
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:47:        | "no_artist_workspace"
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:73:  // 3. Resolve user's active artist workspace via workspace_members.
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:74:  //    Per Phase 6 lock: a user has exactly one Artist workspace. We pick
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:75:  //    the first member row whose workspace.kind = 'artist'.
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:76:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:79:    .from("workspace_members")
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:80:    .select("workspace_id, workspace:workspaces(id, kind)")
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:84:    console.error("[completeArtistOnboardingAction] workspace query error:", memberErr);
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:89:    workspace_id: string;
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:90:    workspace: { id: string; kind: string } | null;
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:94:    (r) => r.workspace?.kind === "artist"
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:98:    return { ok: false, error: "no_artist_workspace" };
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:101:  const workspaceId = artistMember.workspace_id;
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:106:    .select("workspace_id, instagram_handle")
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:107:    .eq("workspace_id", workspaceId)
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:120:    return { ok: false, error: "no_artist_workspace" };
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:129:  //    Column GRANT + RLS UPDATE policy permit this for workspace_members.
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:136:    .eq("workspace_id", workspaceId);
src\app\[locale]\onboarding\artist\page.tsx:30:  // Resolve user's artist workspace and profile
src\app\[locale]\onboarding\artist\page.tsx:31:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
src\app\[locale]\onboarding\artist\page.tsx:34:    .from("workspace_members")
src\app\[locale]\onboarding\artist\page.tsx:35:    .select("workspace_id, workspace:workspaces(id, kind)")
src\app\[locale]\onboarding\artist\page.tsx:39:    workspace_id: string;
src\app\[locale]\onboarding\artist\page.tsx:40:    workspace: { id: string; kind: string } | null;
src\app\[locale]\onboarding\artist\page.tsx:44:    (r) => r.workspace?.kind === "artist"
src\app\[locale]\onboarding\artist\page.tsx:48:    // No artist workspace — shouldn't happen post-invite; fall back to notFound
src\app\[locale]\onboarding\artist\page.tsx:56:    .eq("workspace_id", artistMember.workspace_id)
src\components\meetings\new-meeting-form.tsx:106:  // Derive workspace for selected project
src\components\meetings\new-meeting-form.tsx:108:  const workspaceMembers = selectedProject
src\components\meetings\new-meeting-form.tsx:109:    ? (membersByWorkspace[selectedProject.workspace_id] ?? [])
src\components\meetings\new-meeting-form.tsx:120:  // Sync checked workspace members into attendees field array
src\components\meetings\new-meeting-form.tsx:335:        {workspaceMembers.length > 0 && (
src\components\meetings\new-meeting-form.tsx:337:            {workspaceMembers
src\components\meetings\meeting-request-card.tsx:43:  workspaceId: string | null;
src\components\meetings\meeting-request-card.tsx:46:export function MeetingRequestCard({ workspaceId }: Props) {
src\components\meetings\meeting-request-card.tsx:64:            disabled={!workspaceId}
src\components\meetings\meeting-request-card.tsx:73:        {workspaceId ? (
src\components\meetings\meeting-request-card.tsx:74:          <RequestForm workspaceId={workspaceId} onClose={() => setOpen(false)} />
src\components\meetings\meeting-request-card.tsx:77:            <DialogTitle>{t("request_modal_no_workspace_title")}</DialogTitle>
src\components\meetings\meeting-request-card.tsx:79:              {t("request_modal_no_workspace_body")}
src\components\meetings\meeting-request-card.tsx:89:  workspaceId,
src\components\meetings\meeting-request-card.tsx:92:  workspaceId: string;
src\components\meetings\meeting-request-card.tsx:143:        workspaceId,
src\components\project\thread-panel-server.tsx:55:      // We need the project's workspace_id to scope workspace_admin /
src\components\project\thread-panel-server.tsx:56:      // workspace_member roles correctly; yagi_admin is global so its
src\components\project\thread-panel-server.tsx:57:      // workspace_id is NULL. One bulk query covers all authors.
src\components\project\thread-panel-server.tsx:60:        .select("workspace_id")
src\components\project\thread-panel-server.tsx:63:      const projectWorkspaceId = projectRow?.workspace_id ?? null;
src\components\project\thread-panel-server.tsx:67:        .select("user_id, role, workspace_id")
src\components\project\thread-panel-server.tsx:75:          r.workspace_id === null || r.workspace_id === projectWorkspaceId;
src\components\project\thread-panel-server.tsx:80:          r.role === "yagi_admin"
src\components\project\thread-panel-server.tsx:82:            : r.role === "workspace_admin"
src\components\project\thread-panel-server.tsx:84:              : r.role === "workspace_member"
src\components\project\thread-panel-server.tsx:170:  // Determine if the current user is yagi_admin.
src\components\project\thread-panel-server.tsx:175:    .is("workspace_id", null)
src\components\project\thread-panel-server.tsx:176:    .eq("role", "yagi_admin");
src\components\projects\admin-delete-button.tsx:27:// Phase 2.8.2 G_B2_A — yagi_admin-only project soft-delete trigger.
src\components\projects\status-timeline.tsx:168:                      : row.actor_role === 'yagi_admin'
src\components\projects\status-timeline.tsx:170:                      : row.actor_role === 'workspace_admin'
src\components\app\sidebar-nav.tsx:36:  /** Visible if user has any of these workspace roles. Combined with `profileRoles`
src\components\app\sidebar-nav.tsx:41:   *  profile-role and workspace-role are split. */
src\components\app\sidebar-nav.tsx:56:        // Phase 4.x task_05: Brand workspace dashboard. First WORK item
src\components\app\sidebar-nav.tsx:84:        // Phase 2.5 admin challenge console — yagi_admin only.
src\components\app\sidebar-nav.tsx:87:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:106:        roles: ["workspace_admin", "workspace_member"],
src\components\app\sidebar-nav.tsx:127:            roles: ["yagi_admin", "workspace_admin"],
src\components\app\sidebar-nav.tsx:129:          { key: "admin_invoices", href: "/app/admin/invoices", roles: ["yagi_admin"] },
src\components\app\sidebar-nav.tsx:138:      { key: "admin", href: "/app/admin", icon: ShieldCheck, roles: ["yagi_admin"] },
src\components\app\sidebar-nav.tsx:144:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:147:        // Phase 2.8.2 G_B2_A — yagi_admin trash console for soft-deleted
src\components\app\sidebar-nav.tsx:151:        roles: ["yagi_admin"],
src\components\app\sidebar-nav.tsx:154:        // Phase 2.8.6 — yagi_admin support chat reply surface.
src\components\app\sidebar-nav.tsx:157:        roles: ["yagi_admin"],
src\components\sidebar\workspace-switcher.tsx:4:// Phase 6/A.2 — artist kind support + yagi_admin-gated "+ 새 워크스페이스 만들기".
src\components\sidebar\workspace-switcher.tsx:10://   - '+ 새 워크스페이스 만들기' visible to yagi_admin only (isYagiAdmin prop)
src\components\sidebar\workspace-switcher.tsx:11://   - Selecting a workspace calls setActiveWorkspaceAction (cookie set
src\components\sidebar\workspace-switcher.tsx:15://   - The list of workspaces is supplied by the server (props), already
src\components\sidebar\workspace-switcher.tsx:17://     workspaces here.
src\components\sidebar\workspace-switcher.tsx:36:import { setActiveWorkspaceAction } from "@/lib/workspace/actions";
src\components\sidebar\workspace-switcher.tsx:38:type WorkspaceKind = "brand" | "artist" | "yagi_admin";
src\components\sidebar\workspace-switcher.tsx:48:  workspaces: WorkspaceItem[];
src\components\sidebar\workspace-switcher.tsx:49:  /** Phase 6/A.2 — show "+ 새 워크스페이스 만들기" only for yagi_admin */
src\components\sidebar\workspace-switcher.tsx:53:export function WorkspaceSwitcher({ current, workspaces, isYagiAdmin = false }: Props) {
src\components\sidebar\workspace-switcher.tsx:54:  const t = useTranslations("workspace.switcher");
src\components\sidebar\workspace-switcher.tsx:61:  const brands = workspaces.filter((w) => w.kind === "brand");
src\components\sidebar\workspace-switcher.tsx:62:  const artists = workspaces.filter((w) => w.kind === "artist");
src\components\sidebar\workspace-switcher.tsx:63:  const admins = workspaces.filter((w) => w.kind === "yagi_admin");
src\components\sidebar\workspace-switcher.tsx:65:  function handleSelect(workspaceId: string) {
src\components\sidebar\workspace-switcher.tsx:66:    if (workspaceId === current.id) return;
src\components\sidebar\workspace-switcher.tsx:68:      const result = await setActiveWorkspaceAction(workspaceId);
src\components\sidebar\workspace-switcher.tsx:72:        // workspace immediately.
src\components\sidebar\workspace-switcher.tsx:116:                workspace={w}
src\components\sidebar\workspace-switcher.tsx:133:                  workspace={w}
src\components\sidebar\workspace-switcher.tsx:151:                  workspace={w}
src\components\sidebar\workspace-switcher.tsx:159:        {/* Phase 6/A.2 — "+ 새 워크스페이스 만들기" is yagi_admin only.
src\components\sidebar\workspace-switcher.tsx:176:  workspace,
src\components\sidebar\workspace-switcher.tsx:180:  workspace: WorkspaceItem;
src\components\sidebar\workspace-switcher.tsx:192:      <span className="flex-1 truncate text-sm keep-all">{workspace.name}</span>
src\components\support\support-widget.tsx:6:// Mounts on the (app) shell. Hidden when no workspace_id (mid-onboarding
src\components\support\support-widget.tsx:7:// edge case). Single-thread-per-(workspace,client) per the support_threads
src\components\support\support-widget.tsx:44:  workspaceId: string | null;
src\components\support\support-widget.tsx:50:  workspaceId,
src\components\support\support-widget.tsx:66:    if (!open || threadId || !workspaceId) return;
src\components\support\support-widget.tsx:68:      const res = await getOrCreateSupportThread(workspaceId);
src\components\support\support-widget.tsx:71:  }, [open, threadId, workspaceId]);
src\components\support\support-widget.tsx:100:          // ensures cross-thread inserts visible to a yagi_admin do
src\components\support\support-widget.tsx:165:  if (!workspaceId) return null;
src\app\[locale]\auth\verify\page.tsx:40:      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\components\dashboard\count-cards.tsx:4:// queries scoped to active workspace via workspace_members RLS).
src\lib\onboarding\actions.ts:33:      .insert({ user_id: user.id, role: "creator", workspace_id: null });
src\lib\onboarding\actions.ts:43:}): Promise<Result & { workspaceId?: string }> {
src\lib\onboarding\actions.ts:50:  // Use bootstrap_workspace RPC to atomically create workspace + admin member + role.
src\lib\onboarding\actions.ts:52:  // would reject reading the just-inserted workspace row (user is not yet a member).
src\lib\onboarding\actions.ts:57:    "bootstrap_workspace",
src\lib\onboarding\actions.ts:66:  if (!data) return { error: "workspace_insert_failed" };
src\lib\onboarding\actions.ts:68:  return { workspaceId: data };
src\lib\onboarding\actions.ts:72:  workspaceId: string;
src\lib\onboarding\actions.ts:78:    workspace_id: formData.workspaceId,
src\lib\onboarding\actions.ts:87:  workspaceId: string;
src\lib\onboarding\actions.ts:99:    workspace_id: formData.workspaceId,
src\lib\onboarding\actions.ts:106:  const { error } = await supabase.from("workspace_invitations").insert(rows);
src\lib\notifications\kinds.ts:26:  // Phase 2.8.6 — client-initiated meeting flow + workspace-scoped support chat
src\lib\notifications\emit.ts:18:  workspace_id?: string;
src\lib\notifications\emit.ts:99:    workspace_id: args.workspace_id ?? null,
src\lib\notifications\debounce.ts:35:  workspace_id?: string;
src\lib\notifications\debounce.ts:160:        workspace_id: args.workspace_id ?? null,
src\components\app\sidebar-scope-switcher.tsx:33:  const Icon = kind === "workspace" ? Briefcase : ShieldCheck;
src\components\app\sidebar-scope-switcher.tsx:64:    // Phase 2.8.5 — single-workspace clients see a plain workspace
src\components\app\sidebar-scope-switcher.tsx:68:    // not "Workspace" but the workspace name itself shows verbatim.
src\components\app\sidebar-scope-switcher.tsx:126:  const workspaceScopes = scopes.filter((s) => s.kind === "workspace");
src\components\app\sidebar-scope-switcher.tsx:130:    return scope.kind === "workspace" ? `workspace:${scope.id}` : "admin";
src\components\app\sidebar-scope-switcher.tsx:167:          {workspaceScopes.length > 0 && (
src\components\app\sidebar-scope-switcher.tsx:172:              {workspaceScopes.map(renderItem)}
src\components\app\sidebar-scope-switcher.tsx:177:              {workspaceScopes.length > 0 && <DropdownMenuSeparator />}
src\components\project\thread-panel.tsx:48:   *  yagi  = yagi_admin (service-provider side)
src\components\project\thread-panel.tsx:49:   *  admin = workspace_admin (client company admin)
src\components\project\thread-panel.tsx:50:   *  client = workspace_member (client company member)
src\components\project\thread-panel.tsx:217:          // THIS project before accepting. RLS gates the workspace, but
src\components\project\thread-panel.tsx:218:          // a workspace can hold multiple projects, so blindly trusting
src\components\project\thread-panel.tsx:678:        {/* Visibility toggle — only for yagi_admin */}
src\lib\supabase\database.types.ts:30:          workspace_id: string
src\lib\supabase\database.types.ts:44:          workspace_id: string
src\lib\supabase\database.types.ts:58:          workspace_id?: string
src\lib\supabase\database.types.ts:62:            foreignKeyName: "artist_profile_workspace_id_fkey"
src\lib\supabase\database.types.ts:63:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:65:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:81:          workspace_id: string
src\lib\supabase\database.types.ts:93:          workspace_id: string
src\lib\supabase\database.types.ts:105:          workspace_id?: string
src\lib\supabase\database.types.ts:109:            foreignKeyName: "brands_workspace_id_fkey"
src\lib\supabase\database.types.ts:110:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:112:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:702:          workspace_id: string
src\lib\supabase\database.types.ts:728:          workspace_id: string
src\lib\supabase\database.types.ts:754:          workspace_id?: string
src\lib\supabase\database.types.ts:772:            foreignKeyName: "invoices_workspace_id_fkey"
src\lib\supabase\database.types.ts:773:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:775:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:844:          workspace_id: string
src\lib\supabase\database.types.ts:868:          workspace_id: string
src\lib\supabase\database.types.ts:892:          workspace_id?: string
src\lib\supabase\database.types.ts:910:            foreignKeyName: "meetings_workspace_id_fkey"
src\lib\supabase\database.types.ts:911:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:913:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:933:          workspace_id: string | null
src\lib\supabase\database.types.ts:949:          workspace_id?: string | null
src\lib\supabase\database.types.ts:965:          workspace_id?: string | null
src\lib\supabase\database.types.ts:976:            foreignKeyName: "notification_events_workspace_id_fkey"
src\lib\supabase\database.types.ts:977:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:979:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:1057:          workspace_id: string
src\lib\supabase\database.types.ts:1074:          workspace_id: string
src\lib\supabase\database.types.ts:1091:          workspace_id?: string
src\lib\supabase\database.types.ts:1109:            foreignKeyName: "preprod_boards_workspace_id_fkey"
src\lib\supabase\database.types.ts:1110:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:1112:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:1933:          workspace_id: string
src\lib\supabase\database.types.ts:1969:          workspace_id: string
src\lib\supabase\database.types.ts:2005:          workspace_id?: string
src\lib\supabase\database.types.ts:2023:            foreignKeyName: "projects_workspace_id_fkey"
src\lib\supabase\database.types.ts:2024:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:2026:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:2363:          workspace_id: string
src\lib\supabase\database.types.ts:2372:          workspace_id: string
src\lib\supabase\database.types.ts:2381:          workspace_id?: string
src\lib\supabase\database.types.ts:2392:            foreignKeyName: "support_threads_workspace_id_fkey"
src\lib\supabase\database.types.ts:2393:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:2395:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:2489:          workspace_id: string
src\lib\supabase\database.types.ts:2500:          workspace_id: string
src\lib\supabase\database.types.ts:2511:          workspace_id?: string
src\lib\supabase\database.types.ts:2515:            foreignKeyName: "team_channels_workspace_id_fkey"
src\lib\supabase\database.types.ts:2516:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:2518:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:2631:          workspace_id: string | null
src\lib\supabase\database.types.ts:2638:          workspace_id?: string | null
src\lib\supabase\database.types.ts:2645:          workspace_id?: string | null
src\lib\supabase\database.types.ts:2656:            foreignKeyName: "user_roles_workspace_id_fkey"
src\lib\supabase\database.types.ts:2657:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:2659:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:2664:      workspace_invitations: {
src\lib\supabase\database.types.ts:2674:          workspace_id: string
src\lib\supabase\database.types.ts:2685:          workspace_id: string
src\lib\supabase\database.types.ts:2696:          workspace_id?: string
src\lib\supabase\database.types.ts:2700:            foreignKeyName: "workspace_invitations_invited_by_fkey"
src\lib\supabase\database.types.ts:2707:            foreignKeyName: "workspace_invitations_workspace_id_fkey"
src\lib\supabase\database.types.ts:2708:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:2710:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:2715:      workspace_members: {
src\lib\supabase\database.types.ts:2724:          workspace_id: string
src\lib\supabase\database.types.ts:2734:          workspace_id: string
src\lib\supabase\database.types.ts:2744:          workspace_id?: string
src\lib\supabase\database.types.ts:2748:            foreignKeyName: "workspace_members_invited_by_fkey"
src\lib\supabase\database.types.ts:2755:            foreignKeyName: "workspace_members_user_id_fkey"
src\lib\supabase\database.types.ts:2762:            foreignKeyName: "workspace_members_workspace_id_fkey"
src\lib\supabase\database.types.ts:2763:            columns: ["workspace_id"]
src\lib\supabase\database.types.ts:2765:            referencedRelation: "workspaces"
src\lib\supabase\database.types.ts:2770:      workspaces: {
src\lib\supabase\database.types.ts:2856:      bootstrap_workspace: {
src\lib\supabase\database.types.ts:2874:          p_workspace_id: string
src\lib\supabase\database.types.ts:2894:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
src\lib\invoices\issue-email.ts:27:      "id, status, invoice_number, nts_approval_number, supply_date, due_date, subtotal_krw, vat_krw, total_krw, is_mock, project_id, workspace_id, supplier_id",
src\lib\invoices\issue-email.ts:55:      .from("workspaces")
src\lib\invoices\issue-email.ts:57:      .eq("id", invoice.workspace_id)
src\lib\invoices\issue-email.ts:73:      workspaceId: invoice.workspace_id,
src\lib\popbill\build-taxinvoice.ts:6:export type WorkspaceRow = Tables<"workspaces">;
src\lib\onboarding\state.ts:7:  workspaceMembershipCount: number;
src\lib\onboarding\state.ts:24:  const { count: workspaceMembershipCount } = await supabase
src\lib\onboarding\state.ts:25:    .from("workspace_members")
src\lib\onboarding\state.ts:26:    .select("workspace_id", { count: "exact", head: true })
src\lib\onboarding\state.ts:33:    .is("workspace_id", null)
src\lib\onboarding\state.ts:34:    .in("role", ["creator", "yagi_admin"]);
src\lib\onboarding\state.ts:40:    workspaceMembershipCount: workspaceMembershipCount ?? 0,
src\lib\onboarding\role-redirects.ts:6:// onboarding is the workspace form.
src\lib\onboarding\role-redirects.ts:10:// route to /onboarding/workspace.
src\lib\onboarding\role-redirects.ts:29:    return { href: "/onboarding/workspace", reason: "role_missing" };
src\lib\onboarding\role-redirects.ts:33:    return { href: "/onboarding/workspace", reason: "profile_missing" };
src\lib\email\new-message.ts:60:           project:projects!project_id(id, title, workspace_id))`
src\lib\email\new-message.ts:85:    // 3. Recipient set: workspace members + yagi admins, minus author
src\lib\email\new-message.ts:88:        .from("workspace_members")
src\lib\email\new-message.ts:90:        .eq("workspace_id", project.workspace_id),
src\lib\email\new-message.ts:94:        .is("workspace_id", null)
src\lib\email\new-message.ts:95:        .eq("role", "yagi_admin"),
src\app\[locale]\app\dashboard\page.tsx:1:// Phase 4.x task_05 — Brand workspace dashboard (/app/dashboard).
src\app\[locale]\app\dashboard\page.tsx:4:// recent RFPs scoped to the active workspace via workspace_members
src\app\[locale]\app\dashboard\page.tsx:7:// Authorization: any workspace member can view their own workspace's
src\app\[locale]\app\dashboard\page.tsx:8:// dashboard. Cross-workspace SELECT is blocked by projects RLS (the
src\app\[locale]\app\dashboard\page.tsx:9:// SELECT policy already enforces workspace_member). The workspace_id
src\app\[locale]\app\dashboard\page.tsx:10:// comes from the user's first workspace membership (Phase 4 has
src\app\[locale]\app\dashboard\page.tsx:11:// single active workspace via cookie in task_06; for now Phase 4
src\app\[locale]\app\dashboard\page.tsx:20:// other workspaces.
src\app\[locale]\app\dashboard\page.tsx:27:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\dashboard\page.tsx:72:  // dashboard reflects the workspace the user actually selected in the
src\app\[locale]\app\dashboard\page.tsx:74:  // validates the cookie's uuid against workspace_members and falls back
src\app\[locale]\app\dashboard\page.tsx:80:  const workspaceId = active!.id;
src\app\[locale]\app\dashboard\page.tsx:92:        .eq("workspace_id", workspaceId)
src\app\[locale]\app\dashboard\page.tsx:97:        .eq("workspace_id", workspaceId)
src\app\[locale]\app\dashboard\page.tsx:102:        .eq("workspace_id", workspaceId)
src\app\[locale]\app\dashboard\page.tsx:116:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\invoices\page.tsx:23:  workspace: { name: string } | null;
src\app\[locale]\app\invoices\page.tsx:70:  // Detect yagi_admin (controls "+ New invoice" button)
src\app\[locale]\app\invoices\page.tsx:75:    .is("workspace_id", null)
src\app\[locale]\app\invoices\page.tsx:76:    .eq("role", "yagi_admin");
src\app\[locale]\app\invoices\page.tsx:93:      workspace:workspaces(name)
src\app\[locale]\app\invoices\page.tsx:119:    const ws = row.workspace as
src\app\[locale]\app\invoices\page.tsx:134:      workspace: Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null),
src\app\[locale]\app\invoices\page.tsx:291:                    {inv.workspace?.name ?? "—"}
src\app\[locale]\app\invoices\[id]\print\page.tsx:85:      .from("workspaces")
src\app\[locale]\app\invoices\[id]\print\page.tsx:89:      .eq("id", invoice.workspace_id)
src\app\[locale]\app\invoices\[id]\page.tsx:60:  // yagi_admin detection (matches list page pattern)
src\app\[locale]\app\invoices\[id]\page.tsx:65:    .is("workspace_id", null)
src\app\[locale]\app\invoices\[id]\page.tsx:66:    .eq("role", "yagi_admin");
src\app\[locale]\app\invoices\[id]\page.tsx:69:  // Load invoice with nested project + workspace.
src\app\[locale]\app\invoices\[id]\page.tsx:78:        workspace_id,
src\app\[locale]\app\invoices\[id]\page.tsx:79:        workspace:workspaces!inner(
src\app\[locale]\app\invoices\[id]\page.tsx:97:  // Unwrap project/workspace arrays (postgrest may return array or object).
src\app\[locale]\app\invoices\[id]\page.tsx:102:        workspace_id: string;
src\app\[locale]\app\invoices\[id]\page.tsx:103:        workspace:
src\app\[locale]\app\invoices\[id]\page.tsx:125:        workspace_id: string;
src\app\[locale]\app\invoices\[id]\page.tsx:126:        workspace:
src\app\[locale]\app\invoices\[id]\page.tsx:150:  const workspaceRaw = project.workspace;
src\app\[locale]\app\invoices\[id]\page.tsx:151:  const workspace = Array.isArray(workspaceRaw) ? workspaceRaw[0] : workspaceRaw;
src\app\[locale]\app\invoices\[id]\page.tsx:152:  if (!workspace) {
src\app\[locale]\app\invoices\[id]\page.tsx:198:    id: workspace.id,
src\app\[locale]\app\invoices\[id]\page.tsx:199:    name: workspace.name,
src\app\[locale]\app\invoices\[id]\page.tsx:200:    business_registration_number: workspace.business_registration_number,
src\app\[locale]\app\invoices\[id]\page.tsx:201:    representative_name: workspace.representative_name,
src\app\[locale]\app\invoices\[id]\page.tsx:202:    business_address: workspace.business_address,
src\app\[locale]\app\invoices\[id]\page.tsx:203:    tax_invoice_email: workspace.tax_invoice_email,
src\app\[locale]\app\invoices\[id]\page.tsx:209:    workspace_id: invoiceRow.workspace_id,
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:64:  // Load buyer (workspace)
src\app\[locale]\app\invoices\[id]\actions.ts:66:    .from("workspaces")
src\app\[locale]\app\invoices\[id]\actions.ts:68:    .eq("id", invoice.workspace_id)
src\app\[locale]\app\invoices\[id]\actions.ts:163:  // Phase 1.8 — notify all workspace admins of the issuing workspace. Emit
src\app\[locale]\app\invoices\[id]\actions.ts:170:      .eq("workspace_id", invoice.workspace_id)
src\app\[locale]\app\invoices\[id]\actions.ts:171:      .eq("role", "workspace_admin");
src\app\[locale]\app\invoices\[id]\actions.ts:183:            workspace_id: invoice.workspace_id,
src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\new\page.tsx:20:  // yagi_admin only
src\app\[locale]\app\invoices\new\page.tsx:25:    .is("workspace_id", null)
src\app\[locale]\app\invoices\new\page.tsx:26:    .eq("role", "yagi_admin");
src\app\[locale]\app\invoices\new\page.tsx:29:  // Projects accessible via RLS + their workspace info
src\app\[locale]\app\invoices\new\page.tsx:33:      "id, title, workspace_id, workspace:workspaces(id, name, business_registration_number)"
src\app\[locale]\app\invoices\new\page.tsx:38:    const ws = p.workspace as
src\app\[locale]\app\invoices\new\page.tsx:43:    const workspace = Array.isArray(ws) ? (ws[0] ?? null) : (ws ?? null);
src\app\[locale]\app\invoices\new\page.tsx:47:      workspace_id: p.workspace_id,
src\app\[locale]\app\invoices\new\page.tsx:48:      workspace,
src\app\[locale]\app\invoices\actions.ts:30:  // yagi_admin gate
src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\actions.ts:36:  // Load project + its workspace_id
src\app\[locale]\app\invoices\actions.ts:39:    .select("id, workspace_id")
src\app\[locale]\app\invoices\actions.ts:56:      workspace_id: project.workspace_id,
src\app\[locale]\app\team\[slug]\actions.ts:93:      .select("id, workspace_id, is_archived")
src\app\[locale]\app\team\[slug]\actions.ts:100:    // {workspace_id}/{channel_id}/{messageId}/... (messageId is client-generated
src\app\[locale]\app\team\[slug]\actions.ts:103:    const prefix = `${channel.workspace_id}/${data.channelId}/${data.messageId}/`;
src\app\[locale]\app\team\[slug]\actions.ts:166:      workspaceId: channel.workspace_id,
src\app\[locale]\app\team\[slug]\actions.ts:190:  workspaceId: string;
src\app\[locale]\app\team\[slug]\actions.ts:203:  // Mention recipients MUST be YAGI Internal workspace members — team chat is
src\app\[locale]\app\team\[slug]\actions.ts:205:  // with the YAGI Internal workspace_members list. Done as two queries because
src\app\[locale]\app\team\[slug]\actions.ts:234:    .from("workspace_members")
src\app\[locale]\app\team\[slug]\actions.ts:236:    .eq("workspace_id", YAGI_INTERNAL_WORKSPACE_ID)
src\app\[locale]\app\team\[slug]\actions.ts:262:          workspace_id: args.workspaceId,
src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src\app\[locale]\app\team\[slug]\actions.ts:369:// createChannel — yagi_admin OR ws_admin only
src\app\[locale]\app\team\[slug]\actions.ts:408:        workspace_id: YAGI_INTERNAL_WORKSPACE_ID,
src\app\[locale]\app\team\[slug]\actions.ts:434:// updateChannel — yagi_admin OR ws_admin only
src\app\[locale]\app\team\[slug]\actions.ts:528:// deleteMessage — author OR yagi_admin only
src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\notifications\actions.ts:20:  workspace_id: string | null;
src\app\[locale]\app\notifications\actions.ts:37:      "id, kind, severity, title, body, url_path, created_at, in_app_seen_at, project_id, workspace_id",
src\app\[locale]\app\support\actions.ts:6:// Workspace-scoped, yagi-staffed chat. The (workspace, client) UNIQUE
src\app\[locale]\app\support\actions.ts:12://   - workspace_admins read but cannot reply
src\app\[locale]\app\support\actions.ts:13://   - yagi_admin reads + replies anywhere
src\app\[locale]\app\support\actions.ts:37:/** Get-or-create the (workspace, client) support thread for the caller. */
src\app\[locale]\app\support\actions.ts:39:  workspaceId: string,
src\app\[locale]\app\support\actions.ts:47:  // Look up first; race-safe via UNIQUE (workspace_id, client_id) on
src\app\[locale]\app\support\actions.ts:53:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\support\actions.ts:61:      workspace_id: workspaceId,
src\app\[locale]\app\support\actions.ts:72:      .eq("workspace_id", workspaceId)
src\app\[locale]\app\support\actions.ts:140:  // Phase 2.8.6 K-05 LOOP 1 — yagi_admin gate. The DB trigger
src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\support\actions.ts:175:    .select("workspace_id, client_id")
src\app\[locale]\app\support\actions.ts:189:  // Counterparty: if the actor is the client, notify yagi_admins; if
src\app\[locale]\app\support\actions.ts:190:  // actor is a yagi_admin, notify the client. (Workspace admins are
src\app\[locale]\app\support\actions.ts:197:      .is("workspace_id", null)
src\app\[locale]\app\support\actions.ts:198:      .eq("role", "yagi_admin");
src\app\[locale]\app\support\actions.ts:201:      // are also a global yagi_admin (would self-ping otherwise).
src\app\[locale]\app\support\actions.ts:209:              workspace_id: thread.workspace_id,
src\app\[locale]\app\support\actions.ts:220:      workspace_id: thread.workspace_id,
src\app\[locale]\app\admin\invoices\page.tsx:21:  workspace: { name: string } | null;
src\app\[locale]\app\admin\invoices\page.tsx:82:  workspace: { name: string } | { name: string }[] | null;
src\app\[locale]\app\admin\invoices\page.tsx:93:    workspace: normalizeJoin(row.workspace),
src\app\[locale]\app\admin\invoices\page.tsx:111:    .is("workspace_id", null)
src\app\[locale]\app\admin\invoices\page.tsx:112:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\invoices\page.tsx:175:        workspace:workspaces(name)
src\app\[locale]\app\admin\invoices\page.tsx:196:        workspace:workspaces(name)
src\app\[locale]\app\admin\invoices\page.tsx:436:                      {t("col_workspace")}
src\app\[locale]\app\admin\invoices\page.tsx:470:                        {inv.workspace?.name ?? "—"}
src\app\[locale]\app\admin\invoices\page.tsx:549:                      {t("col_workspace")}
src\app\[locale]\app\admin\invoices\page.tsx:580:                        {inv.workspace?.name ?? "—"}
src\app\[locale]\app\showcases\[id]\page.tsx:29:      "id, title, subtitle, slug, status, client_name_public, narrative_md, credits_md, cover_media_type, cover_media_storage_path, cover_media_external_url, made_with_yagi, badge_removal_requested, badge_removal_approved_at, is_password_protected, published_at, view_count, project_id, project:projects(id, title, workspace_id)",
src\app\[locale]\app\showcases\[id]\page.tsx:42:    workspace_id: string;
src\app\[locale]\app\showcases\[id]\page.tsx:45:  // Access: yagi_admin OR workspace_admin of the showcase's workspace.
src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\[id]\page.tsx:53:      wsid: projectRel.workspace_id,
src\app\[locale]\app\showcases\page.tsx:64:  // Access control: yagi_admin OR any workspace admin.
src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\page.tsx:72:      .from("workspace_members")
src\app\[locale]\app\showcases\page.tsx:85:  // Scope showcases: yagi_admin sees all; workspace admin sees only their
src\app\[locale]\app\showcases\page.tsx:90:      "id, title, slug, status, published_at, view_count, created_at, cover_media_type, cover_media_storage_path, cover_media_external_url, project:projects(id, title, workspace_id)",
src\app\[locale]\app\showcases\page.tsx:97:      .from("workspace_members")
src\app\[locale]\app\showcases\page.tsx:98:      .select("workspace_id")
src\app\[locale]\app\showcases\page.tsx:102:      .map((r) => r.workspace_id)
src\app\[locale]\app\showcases\page.tsx:105:      // Admin of zero workspaces — empty list.
src\app\[locale]\app\showcases\page.tsx:115:      .in("workspace_id", wsIds);
src\app\[locale]\app\showcases\page.tsx:135:        project: { id: string; title: string | null; workspace_id: string } | null;
src\app\[locale]\app\showcases\page.tsx:170:  // Candidate boards for "Create from Board" dialog (yagi_admin only).
src\app\[locale]\app\showcases\actions.ts:7: * narrow cases workspace admin) only. Patterns mirror Phase 1.4 actions
src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\showcases\actions.ts:91:    .select("workspace_id")
src\app\[locale]\app\showcases\actions.ts:98:    wsid: project.workspace_id,
src\app\[locale]\app\showcases\actions.ts:337:  // Notify workspace members of the project, skipping the actor.
src\app\[locale]\app\showcases\actions.ts:367:    .select("workspace_id, title")
src\app\[locale]\app\showcases\actions.ts:374:      .from("workspace_members")
src\app\[locale]\app\showcases\actions.ts:376:      .eq("workspace_id", project.workspace_id),
src\app\[locale]\app\showcases\actions.ts:395:          workspace_id: project.workspace_id,
src\app\[locale]\app\showcases\actions.ts:479:  // retention is acceptable for this surface (infrequent yagi_admin /
src\app\[locale]\app\showcases\actions.ts:658:  // workspace_admin cannot toggle made_with_yagi; only yagi_admin can.
src\app\[locale]\app\admin\trash\page.tsx:18:  workspace_id: string;
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\trash\page.tsx:48:    .select("id, title, status, workspace_id, deleted_at, brand:brands(id, name)")
src\app\[locale]\app\meetings\[id]\page.tsx:83:      workspace_id,
src\app\[locale]\app\meetings\request-actions.ts:11://   confirmMeetingAction()    — yagi_admin picks a time → status='scheduled'
src\app\[locale]\app\meetings\request-actions.ts:45:    workspaceId: z.string().uuid(),
src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src\app\[locale]\app\meetings\request-actions.ts:111:      "id, workspace_id, project_id, title, description, status, scheduled_at, duration_minutes, meet_link, created_by, assigned_admin_id, ics_uid, requested_at_options",
src\app\[locale]\app\meetings\request-actions.ts:128:    .is("workspace_id", null)
src\app\[locale]\app\meetings\request-actions.ts:129:    .eq("role", "yagi_admin");
src\app\[locale]\app\meetings\request-actions.ts:160:      workspace_id: parsed.data.workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:176:  // Fan-out to yagi_admins. Fire-and-forget — caller does not wait.
src\app\[locale]\app\meetings\request-actions.ts:181:    parsed.data.workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:225:// confirmMeetingAction (yagi_admin only)
src\app\[locale]\app\meetings\request-actions.ts:267:    workspaceId: meeting.workspace_id,
src\app\[locale]\app\meetings\request-actions.ts:337:  workspaceId: string,
src\app\[locale]\app\meetings\request-actions.ts:348:  // notification_events for every yagi_admin user (excluding the actor
src\app\[locale]\app\meetings\request-actions.ts:350:  // hold yagi_admin globally, in which case they would self-ping).
src\app\[locale]\app\meetings\request-actions.ts:354:    .is("workspace_id", null)
src\app\[locale]\app\meetings\request-actions.ts:355:    .eq("role", "yagi_admin");
src\app\[locale]\app\meetings\request-actions.ts:365:            workspace_id: workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:412:  workspaceId: string;
src\app\[locale]\app\meetings\request-actions.ts:422:    workspace_id: args.workspaceId,
src\app\[locale]\app\meetings\request-actions.ts:460:  // notification_events to the counterparty (client or yagi_admin)
src\app\[locale]\app\meetings\request-actions.ts:474:      .is("workspace_id", null)
src\app\[locale]\app\meetings\request-actions.ts:475:      .eq("role", "yagi_admin");
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\auth\expired\page.tsx:104:      options: { emailRedirectTo: `${siteUrl}/onboarding/workspace` },
src\app\[locale]\app\admin\support\page.tsx:16:  workspace_id: string;
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\admin\support\page.tsx:45:    .select("id, workspace_id, client_id, status, last_message_at")
src\app\[locale]\app\admin\support\page.tsx:62:        workspace_id: r.workspace_id,
src\app\[locale]\app\admin\page.tsx:50:    .is("workspace_id", null)
src\app\[locale]\app\admin\page.tsx:51:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\commissions\[id]\actions.ts:14:// RLS: RPC is yagi_admin only. Authorization is double-checked at the
src\app\[locale]\app\admin\commissions\[id]\actions.ts:37:  | { error: "client_no_workspace" }
src\app\[locale]\app\admin\commissions\[id]\actions.ts:54:  // Double-check yagi_admin so the action path doesn't leak the RPC
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\[id]\actions.ts:77:    if (msg.includes("client_no_workspace"))
src\app\[locale]\app\admin\commissions\[id]\actions.ts:78:      return { error: "client_no_workspace" };
src\app\[locale]\app\admin\layout.tsx:13:  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
src\app\[locale]\app\layout.tsx:7:} from "@/lib/workspace/active";
src\app\[locale]\app\layout.tsx:39:    ctx.workspaceRoles.includes("yagi_admin") ||
src\app\[locale]\app\layout.tsx:40:    ctx.workspaceRoles.includes("creator");
src\app\[locale]\app\layout.tsx:41:  // Phase 2.7: client persona doesn't need a workspace; their primary
src\app\[locale]\app\layout.tsx:44:  if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
src\app\[locale]\app\layout.tsx:45:    redirect({ href: "/onboarding/workspace", locale });
src\app\[locale]\app\layout.tsx:60:  // Phase 4.x task_06 — resolve active workspace + full membership list
src\app\[locale]\app\layout.tsx:61:  // for the sidebar workspace switcher. resolveActiveWorkspace reads the
src\app\[locale]\app\layout.tsx:62:  // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
src\app\[locale]\app\layout.tsx:63:  // returns every workspace the user belongs to (with workspaces.kind, which
src\app\[locale]\app\layout.tsx:71:  // If the active workspace is kind='artist' and instagram_handle IS NULL,
src\app\[locale]\app\layout.tsx:88:          workspaces={allWorkspaces}
src\app\[locale]\app\layout.tsx:95:              workspaces={allWorkspaces}
src\app\[locale]\app\layout.tsx:111:        {/* Phase 2.8.6 — workspace-scoped support chat. Hidden when
src\app\[locale]\app\layout.tsx:112:            the user has no workspace (mid-onboarding edge case).
src\app\[locale]\app\layout.tsx:113:            Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
src\app\[locale]\app\layout.tsx:114:            backed active workspace (resolved above for the sidebar)
src\app\[locale]\app\layout.tsx:115:            instead of ctx.workspaces[0], so admins with multiple
src\app\[locale]\app\layout.tsx:116:            memberships chat against the workspace they actually selected. */}
src\app\[locale]\app\layout.tsx:118:          workspaceId={activeWorkspace?.id ?? null}
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\settings\workspace-form.tsx:15:const workspaceSchema = z.object({
src\app\[locale]\app\settings\workspace-form.tsx:21:type WorkspaceFormData = z.infer<typeof workspaceSchema>;
src\app\[locale]\app\settings\workspace-form.tsx:24:  workspace: {
src\app\[locale]\app\settings\workspace-form.tsx:33:export function WorkspaceForm({ workspace }: WorkspaceFormProps) {
src\app\[locale]\app\settings\workspace-form.tsx:43:    resolver: zodResolver(workspaceSchema),
src\app\[locale]\app\settings\workspace-form.tsx:45:      name: workspace.name,
src\app\[locale]\app\settings\workspace-form.tsx:46:      tax_id: workspace.tax_id ?? "",
src\app\[locale]\app\settings\workspace-form.tsx:47:      tax_invoice_email: workspace.tax_invoice_email ?? "",
src\app\[locale]\app\settings\workspace-form.tsx:53:      workspaceId: workspace.id,
src\app\[locale]\app\settings\workspace-form.tsx:70:        <p className="text-sm text-muted-foreground">{t("workspace_logo_upload")} — {tDashboard("coming_soon")}</p>
src\app\[locale]\app\settings\workspace-form.tsx:75:          <Label htmlFor="ws_name">{t("workspace_name_label")}</Label>
src\components\app\sidebar.tsx:18:} from "@/components/sidebar/workspace-switcher";
src\components\app\sidebar.tsx:22:  return context.workspaces.some((w) => w.slug === "yagi-internal");
src\components\app\sidebar.tsx:27:  /** Phase 4.x task_06 — server-resolved active workspace + full membership list.
src\components\app\sidebar.tsx:28:   *  When null (zero memberships), the workspace switcher is hidden. The
src\components\app\sidebar.tsx:29:   *  /app layout redirects to /onboarding/workspace before reaching here in
src\components\app\sidebar.tsx:32:  workspaces: WorkspaceItem[];
src\components\app\sidebar.tsx:38:  workspaces,
src\components\app\sidebar.tsx:42:  // Phase 6/A.2 — gate "+ 새 워크스페이스 만들기" to yagi_admin role only.
src\components\app\sidebar.tsx:43:  const isYagiAdmin = context.workspaceRoles.includes("yagi_admin");
src\components\app\sidebar.tsx:53:      {/* Phase 4.x task_06 — workspace switcher replaces the older
src\components\app\sidebar.tsx:54:          SidebarScopeSwitcher at the sidebar top. yagi_admin / profile
src\components\app\sidebar.tsx:64:              workspaces={workspaces}
src\components\app\sidebar.tsx:72:          roles={context.workspaceRoles}
src\components\app\sidebar.tsx:80:          workspaceRoles={context.workspaceRoles}
src\components\app\sidebar.tsx:91:  workspaces,
src\components\app\sidebar.tsx:101:        workspaces={workspaces}
src\components\app\sidebar.tsx:110:  workspaces,
src\components\app\sidebar.tsx:132:          workspaces={workspaces}
src\app\[locale]\app\meetings\actions.ts:124:    .select("id, workspace_id, title")
src\app\[locale]\app\meetings\actions.ts:134:  const workspaceId = project.workspace_id;
src\app\[locale]\app\meetings\actions.ts:139:    supabase.rpc("is_ws_admin", { uid, wsid: workspaceId }),
src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:165:      p_workspace_id: workspaceId,
src\app\[locale]\app\meetings\actions.ts:200:      workspaceId,
src\app\[locale]\app\meetings\actions.ts:336:  // Fetch meeting + workspace_id
src\app\[locale]\app\meetings\actions.ts:339:    .select("id, project_id, workspace_id")
src\app\[locale]\app\meetings\actions.ts:350:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:395:      id, project_id, workspace_id, title, scheduled_at, duration_minutes,
src\app\[locale]\app\meetings\actions.ts:411:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:471:      workspaceId: meeting.workspace_id ?? undefined,
src\app\[locale]\app\meetings\actions.ts:523:  workspaceId: string;
src\app\[locale]\app\meetings\actions.ts:541:          workspace_id: args.workspaceId,
src\app\[locale]\app\meetings\actions.ts:559:  workspaceId?: string;
src\app\[locale]\app\meetings\actions.ts:575:          workspace_id: args.workspaceId,
src\app\[locale]\app\meetings\actions.ts:615:      id, project_id, workspace_id, title, scheduled_at, duration_minutes,
src\app\[locale]\app\meetings\actions.ts:631:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:721:    .select("id, project_id, workspace_id, status")
src\app\[locale]\app\meetings\actions.ts:735:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:780:      id, project_id, workspace_id, title, description, scheduled_at,
src\app\[locale]\app\meetings\actions.ts:807:    supabase.rpc("is_ws_admin", { uid, wsid: meeting.workspace_id }),
src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\settings\team-panel.tsx:11:type TeamPanelProps = { workspaceId: string };
src\app\[locale]\app\settings\team-panel.tsx:13:export async function TeamPanel({ workspaceId }: TeamPanelProps) {
src\app\[locale]\app\settings\team-panel.tsx:18:    .from("workspace_members")
src\app\[locale]\app\settings\team-panel.tsx:22:      profile:profiles!workspace_members_user_id_fkey(id, display_name, handle, avatar_url)
src\app\[locale]\app\settings\team-panel.tsx:25:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\settings\team-panel.tsx:30:      <InviteForm workspaceId={workspaceId} />
src\app\[locale]\app\settings\team-panel.tsx:43:                  {m.role === "workspace_admin"
src\app\[locale]\app\settings\team-panel.tsx:48:                  <input type="hidden" name="workspaceId" value={workspaceId} />
src\components\app\sidebar-user-menu.tsx:38:  workspaceRoles: WorkspaceRole[],
src\components\app\sidebar-user-menu.tsx:44:  if (workspaceRoles.includes("yagi_admin")) return "YAGI Admin";
src\components\app\sidebar-user-menu.tsx:64:  workspaceRoles,
src\components\app\sidebar-user-menu.tsx:68:  workspaceRoles: WorkspaceRole[];
src\components\app\sidebar-user-menu.tsx:81:  const roleLabel = getRoleLabel(profile, workspaceRoles, isYagiInternalMember);
src\app\[locale]\app\meetings\new\page.tsx:13:  workspace_id: string;
src\app\[locale]\app\meetings\new\page.tsx:40:  // Fetch all workspace memberships for this user to determine admin workspaces
src\app\[locale]\app\meetings\new\page.tsx:42:    .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:43:    .select("workspace_id")
src\app\[locale]\app\meetings\new\page.tsx:46:  const workspaceIds = (memberRows ?? []).map((r) => r.workspace_id);
src\app\[locale]\app\meetings\new\page.tsx:48:  // Check which workspaces the user is an admin of (or is yagi_admin)
src\app\[locale]\app\meetings\new\page.tsx:52:      .select("workspace_id")
src\app\[locale]\app\meetings\new\page.tsx:54:      .eq("role", "workspace_admin"),
src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\new\page.tsx:59:    (adminRoles ?? []).map((r) => r.workspace_id).filter(Boolean) as string[]
src\app\[locale]\app\meetings\new\page.tsx:62:  // If yagi_admin, all workspaces are accessible
src\app\[locale]\app\meetings\new\page.tsx:65:      ? workspaceIds
src\app\[locale]\app\meetings\new\page.tsx:66:      : workspaceIds.filter((id) => adminWorkspaceIds.has(id));
src\app\[locale]\app\meetings\new\page.tsx:68:  // Fetch projects in those workspaces
src\app\[locale]\app\meetings\new\page.tsx:73:      .select("id, title, workspace_id")
src\app\[locale]\app\meetings\new\page.tsx:74:      .in("workspace_id", accessibleWorkspaceIds)
src\app\[locale]\app\meetings\new\page.tsx:79:  // Fetch workspace members for each accessible workspace, joining profiles for email
src\app\[locale]\app\meetings\new\page.tsx:84:      .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:88:        workspace_id,
src\app\[locale]\app\meetings\new\page.tsx:89:        profile:profiles!workspace_members_user_id_fkey(display_name, id)
src\app\[locale]\app\meetings\new\page.tsx:92:      .in("workspace_id", accessibleWorkspaceIds);
src\app\[locale]\app\meetings\new\page.tsx:96:    // We'll use a sub-query via workspace_invitations to get email fallback.
src\app\[locale]\app\meetings\new\page.tsx:97:    // The safest approach: fetch from workspace_invitations for accepted members.
src\app\[locale]\app\meetings\new\page.tsx:99:      .from("workspace_invitations")
src\app\[locale]\app\meetings\new\page.tsx:100:      .select("email, workspace_id")
src\app\[locale]\app\meetings\new\page.tsx:101:      .in("workspace_id", accessibleWorkspaceIds)
src\app\[locale]\app\meetings\new\page.tsx:108:      // Map workspace_id + rough email lookup
src\app\[locale]\app\meetings\new\page.tsx:110:      inviteEmailMap[inv.email] = inv.workspace_id;
src\app\[locale]\app\meetings\new\page.tsx:116:        (m) => m.workspace_id === wsId
src\app\[locale]\app\meetings\new\page.tsx:121:        .filter((inv) => inv.workspace_id === wsId)
src\app\[locale]\app\meetings\new\page.tsx:134:        // Try to find email from workspace_invitations (best effort)
src\app\[locale]\app\meetings\new\page.tsx:146:      // Also add any workspace invitation emails as standalone entries
src\app\[locale]\app\projects\[id]\cta-actions.ts:12:// (20260504200001) means the workspace creator is resolved as 'client'
src\app\[locale]\app\projects\[id]\cta-actions.ts:13:// even when they hold workspace_admin, so own-project recall + approve +
src\app\[locale]\app\projects\[id]\cta-actions.ts:34:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\[id]\cta-actions.ts:64:      error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
src\app\[locale]\app\projects\[id]\cta-actions.ts:84:  if (!active) return { ok: false, error: "no_workspace" };
src\app\[locale]\app\projects\[id]\cta-actions.ts:123:      error: "validation" | "unauthenticated" | "no_workspace" | RpcErrorCode;
src\app\[locale]\app\projects\[id]\cta-actions.ts:152:  if (!active) return { ok: false, error: "no_workspace" };
src\app\[locale]\app\settings\layout.tsx:18:  const isWsAdmin = ctx!.workspaceRoles.includes("workspace_admin");
src\app\[locale]\app\settings\layout.tsx:25:            key: "workspace",
src\app\[locale]\app\settings\layout.tsx:26:            label: t("workspace_tab"),
src\app\[locale]\app\settings\layout.tsx:27:            href: "/app/settings?tab=workspace" as "/app/settings",
src\app\[locale]\app\settings\page.tsx:6:import { WorkspaceForm } from "./workspace-form";
src\app\[locale]\app\settings\page.tsx:19:  const tab = sp.tab === "workspace" || sp.tab === "team" ? sp.tab : "profile";
src\app\[locale]\app\settings\page.tsx:49:  // workspace + team tabs require workspace_admin
src\app\[locale]\app\settings\page.tsx:50:  if (!ctx!.workspaceRoles.includes("workspace_admin")) {
src\app\[locale]\app\settings\page.tsx:54:  const workspaceId = ctx!.currentWorkspaceId;
src\app\[locale]\app\settings\page.tsx:55:  if (!workspaceId) redirect({ href: "/app", locale });
src\app\[locale]\app\settings\page.tsx:57:  if (tab === "workspace") {
src\app\[locale]\app\settings\page.tsx:60:      .from("workspaces")
src\app\[locale]\app\settings\page.tsx:62:      .eq("id", workspaceId!)
src\app\[locale]\app\settings\page.tsx:65:    return <WorkspaceForm workspace={ws!} />;
src\app\[locale]\app\settings\page.tsx:69:  return <TeamPanel workspaceId={workspaceId!} />;
src\app\[locale]\app\projects\[id]\delete-actions.ts:31://   - yagi_admin: bypasses RLS but action layer enforces creator + status ✓
src\app\[locale]\app\projects\[id]\delete-actions.ts:32://   - different-user same-workspace: .eq("created_by", user.id) blocks ✓
src\app\[locale]\app\projects\[id]\delete-actions.ts:109:  //    that denies deleted_at writes from non-yagi_admin client sessions).
src\app\[locale]\app\settings\invite-form.tsx:13:  workspaceId: string;
src\app\[locale]\app\settings\invite-form.tsx:16:export function InviteForm({ workspaceId }: InviteFormProps) {
src\app\[locale]\app\settings\invite-form.tsx:41:      <input type="hidden" name="workspaceId" value={workspaceId} />
src\app\[locale]\app\settings\invite-form.tsx:63:          defaultValue="workspace_member"
src\app\[locale]\app\settings\invite-form.tsx:66:          <option value="workspace_member">{t("team_role_member")}</option>
src\app\[locale]\app\settings\invite-form.tsx:67:          <option value="workspace_admin">{t("team_role_admin")}</option>
src\app\[locale]\app\projects\[id]\page.tsx:4://   1. Breadcrumb (workspace -> brand -> project)
src\app\[locale]\app\projects\[id]\page.tsx:9://   6. Admin actions row (yagi_admin only)
src\app\[locale]\app\projects\[id]\page.tsx:12://   - viewer must be project.created_by OR yagi_admin
src\app\[locale]\app\projects\[id]\page.tsx:13://   - workspace_admin from same workspace also allowed for backwards compat
src\app\[locale]\app\projects\[id]\page.tsx:48:  workspace_id: string;
src\app\[locale]\app\projects\[id]\page.tsx:55:  workspace: { id: string; name: string } | null;
src\app\[locale]\app\projects\[id]\page.tsx:125:      workspace_id, created_by,
src\app\[locale]\app\projects\[id]\page.tsx:133:      workspace:workspaces(id, name)
src\app\[locale]\app\projects\[id]\page.tsx:145:  const workspaceRaw = projectRaw.workspace;
src\app\[locale]\app\projects\[id]\page.tsx:152:    workspace_id: projectRaw.workspace_id as string,
src\app\[locale]\app\projects\[id]\page.tsx:168:    workspace: Array.isArray(workspaceRaw)
src\app\[locale]\app\projects\[id]\page.tsx:169:      ? ((workspaceRaw[0] as ProjectDetail["workspace"]) ?? null)
src\app\[locale]\app\projects\[id]\page.tsx:170:      : (workspaceRaw as ProjectDetail["workspace"]),
src\app\[locale]\app\projects\[id]\page.tsx:213:  // the project's workspace get rows. We slice top-3 here and keep the
src\app\[locale]\app\projects\[id]\page.tsx:256:    .select("role, workspace_id")
src\app\[locale]\app\projects\[id]\page.tsx:263:          r.workspace_id === null || r.workspace_id === project.workspace_id
src\app\[locale]\app\projects\[id]\page.tsx:268:  const isYagiAdmin = roles.has("yagi_admin");
src\app\[locale]\app\projects\[id]\page.tsx:269:  const isWsAdmin = roles.has("workspace_admin");
src\app\[locale]\app\projects\[id]\page.tsx:279:  const workspaceName = project.workspace?.name ?? "—";
src\app\[locale]\app\projects\[id]\page.tsx:324:        <span>{workspaceName}</span>
src\app\[locale]\app\settings\actions.ts:120:const workspaceSchema = z.object({
src\app\[locale]\app\settings\actions.ts:121:  workspaceId: z.string().uuid(),
src\app\[locale]\app\settings\actions.ts:128:  const parsed = workspaceSchema.safeParse(input);
src\app\[locale]\app\settings\actions.ts:137:  // RLS enforces workspace_admin — no explicit role check here.
src\app\[locale]\app\settings\actions.ts:139:    .from("workspaces")
src\app\[locale]\app\settings\actions.ts:145:    .eq("id", parsed.data.workspaceId);
src\app\[locale]\app\settings\actions.ts:153:  workspaceId: z.string().uuid(),
src\app\[locale]\app\settings\actions.ts:155:  role: z.enum(["workspace_admin", "workspace_member"]),
src\app\[locale]\app\settings\actions.ts:160:    workspaceId: formData.get("workspaceId"),
src\app\[locale]\app\settings\actions.ts:165:  // workspace_invites table absent in database.types — Phase 1.3 will wire email invites.
src\app\[locale]\app\settings\actions.ts:170:  const workspaceId = formData.get("workspaceId");
src\app\[locale]\app\settings\actions.ts:172:  if (typeof workspaceId !== "string" || typeof userId !== "string") {
src\app\[locale]\app\settings\actions.ts:184:    .from("workspace_members")
src\app\[locale]\app\settings\actions.ts:186:    .eq("workspace_id", workspaceId)
src\app\[locale]\app\projects\[id]\actions.ts:25:  "workspace_admin" | "yagi_admin",
src\app\[locale]\app\projects\[id]\actions.ts:28:  workspace_admin: {
src\app\[locale]\app\projects\[id]\actions.ts:32:  yagi_admin: {
src\app\[locale]\app\projects\[id]\actions.ts:55:  // Fetch project to know its workspace + current status
src\app\[locale]\app\projects\[id]\actions.ts:58:    .select("id, status, workspace_id")
src\app\[locale]\app\projects\[id]\actions.ts:63:  // Resolve user's roles (global + workspace-scoped)
src\app\[locale]\app\projects\[id]\actions.ts:66:    .select("role, workspace_id")
src\app\[locale]\app\projects\[id]\actions.ts:73:          r.workspace_id === null || r.workspace_id === project.workspace_id
src\app\[locale]\app\projects\[id]\actions.ts:80:    roles.has("workspace_admin") &&
src\app\[locale]\app\projects\[id]\actions.ts:81:    (ALLOWED.workspace_admin[project.status] ?? []).includes(
src\app\[locale]\app\projects\[id]\actions.ts:85:    roles.has("yagi_admin") &&
src\app\[locale]\app\projects\[id]\actions.ts:86:    (ALLOWED.yagi_admin[project.status] ?? []).includes(parsed.data.newStatus);
src\app\[locale]\app\projects\[id]\actions.ts:114:// row from ws_member reads automatically (yagi_admin still sees it for the
src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\page.tsx:4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\page.tsx:23:  workspace_id: string;
src\app\[locale]\app\projects\page.tsx:42:  // projects hub query previously had no workspace_id filter and relied
src\app\[locale]\app\projects\page.tsx:43:  // entirely on RLS, which lets a multi-workspace user see projects from
src\app\[locale]\app\projects\page.tsx:44:  // every membership while the switcher claims one workspace is active.
src\app\[locale]\app\projects\page.tsx:45:  // Resolve the active workspace up front, then pass it through both the
src\app\[locale]\app\projects\page.tsx:72:      workspace_id,
src\app\[locale]\app\projects\page.tsx:76:    .eq("workspace_id", activeWorkspaceId)
src\app\[locale]\app\projects\page.tsx:168:          state. The card disables itself if the user has no workspace
src\app\[locale]\app\projects\page.tsx:170:      <MeetingRequestCard workspaceId={primaryWorkspaceId} />
src\app\[locale]\app\page.tsx:4:// and other workspace members to a Projects empty-state. Phase 4
src\app\[locale]\app\page.tsx:6:// (Brand workspace dashboard with count cards + recent RFPs).
src\app\[locale]\app\page.tsx:8:// yagi_admin / creator / etc. can navigate to their persona-specific
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\projects\[id]\brief\actions.ts:121:// the document. A workspace member could persist an embed node with
src\app\[locale]\app\projects\[id]\brief\actions.ts:386:// 4. lockBrief — yagi_admin-only, status='editing' → 'locked'
src\app\[locale]\app\projects\[id]\brief\actions.ts:401:  // also enforces yagi_admin-only status flips).
src\app\[locale]\app\projects\[id]\brief\actions.ts:406:    .eq("role", "yagi_admin")
src\app\[locale]\app\projects\[id]\brief\actions.ts:410:    return { error: "forbidden", reason: "yagi_admin required" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:429:// 5. unlockBrief — yagi_admin-only, status='locked' → 'editing' (no snapshot)
src\app\[locale]\app\projects\[id]\brief\actions.ts:447:    .eq("role", "yagi_admin")
src\app\[locale]\app\projects\[id]\brief\actions.ts:451:    return { error: "forbidden", reason: "yagi_admin required" };
src\app\[locale]\app\projects\[id]\brief\actions.ts:558:// RLS (caller must be a project member or yagi_admin). On success the
src\app\[locale]\app\projects\[id]\brief\actions.ts:935:// notification to every yagi_admin so they can pick up the request.
src\app\[locale]\app\projects\[id]\brief\actions.ts:971:  // Resolve project workspace for notification context.
src\app\[locale]\app\projects\[id]\brief\actions.ts:974:    .select("workspace_id, title")
src\app\[locale]\app\projects\[id]\brief\actions.ts:978:  // Enumerate yagi_admin recipients via service role (user_roles SELECT
src\app\[locale]\app\projects\[id]\brief\actions.ts:986:    .eq("role", "yagi_admin");
src\app\[locale]\app\projects\[id]\brief\actions.ts:995:    // a confirmation. Phase 1.x has a yagi internal workspace seed; in
src\app\[locale]\app\projects\[id]\brief\actions.ts:1012:    workspace_id: project?.workspace_id ?? null,
src\app\[locale]\app\projects\[id]\board-actions.ts:15: *       Wraps toggle_project_board_lock RPC (SECURITY DEFINER, yagi_admin only).
src\app\[locale]\app\projects\[id]\board-actions.ts:104:  // workspace membership, but a workspace member who is NOT the project
src\app\[locale]\app\projects\[id]\board-actions.ts:105:  // creator (and not yagi/workspace admin) must not be able to autosave
src\app\[locale]\app\projects\[id]\board-actions.ts:110:    .select("created_by, workspace_id")
src\app\[locale]\app\projects\[id]\board-actions.ts:118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\board-actions.ts:125:        .from("workspace_members")
src\app\[locale]\app\projects\[id]\board-actions.ts:127:        .eq("workspace_id", project.workspace_id)
src\app\[locale]\app\projects\[id]\board-actions.ts:172:  // the same atomic statement; authorization (workspace + lock) was
src\app\[locale]\app\projects\[id]\board-actions.ts:260:  // RPC enforces yagi_admin internally (RAISE EXCEPTION if not admin).
src\app\[locale]\app\projects\[id]\board-actions.ts:275:// Defense-in-depth: action verifies yagi_admin role + RPC verifies.
src\app\[locale]\app\projects\[id]\board-actions.ts:309:    (r) => (r as { role: string }).role === "yagi_admin"
src\app\[locale]\app\projects\[id]\board-actions.ts:383:    (r) => (r as { role: string }).role === "yagi_admin"
src\app\[locale]\app\projects\[id]\board-actions.ts:425:  // asset_index via service role. Admin-only action (yagi_admin gate
src\app\[locale]\app\admin\artists\page.tsx:8:// Page-level auth gate: notFound() for any non-yagi_admin caller.
src\app\[locale]\app\admin\artists\page.tsx:23:  workspaceId: string;
src\app\[locale]\app\admin\artists\page.tsx:24:  workspaceName: string;
src\app\[locale]\app\admin\artists\page.tsx:41:  // Auth gate — notFound for non-yagi_admin
src\app\[locale]\app\admin\artists\page.tsx:52:    .is("workspace_id", null)
src\app\[locale]\app\admin\artists\page.tsx:53:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\artists\page.tsx:59:  // Fetch all artist workspaces + profiles via service-role client
src\app\[locale]\app\admin\artists\page.tsx:60:  // (artist_profile has RLS SELECT gated to workspace_members + yagi_admin;
src\app\[locale]\app\admin\artists\page.tsx:61:  //  yagi_admin check uses is_yagi_admin RLS function. Using service-role
src\app\[locale]\app\admin\artists\page.tsx:64:  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
src\app\[locale]\app\admin\artists\page.tsx:71:      workspace_id,
src\app\[locale]\app\admin\artists\page.tsx:75:      workspace:workspaces(id, name),
src\app\[locale]\app\admin\artists\page.tsx:76:      member:workspace_members(user_id)
src\app\[locale]\app\admin\artists\page.tsx:86:    workspace_id: string;
src\app\[locale]\app\admin\artists\page.tsx:90:    workspace: { id: string; name: string } | null;
src\app\[locale]\app\admin\artists\page.tsx:130:      workspaceId: p.workspace_id,
src\app\[locale]\app\admin\artists\page.tsx:131:      workspaceName: p.workspace?.name ?? p.display_name ?? "—",
src\app\[locale]\app\admin\artists\page.tsx:187:                      key={artist.workspaceId}
src\app\[locale]\app\projects\new\actions.ts:10:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\actions.ts:67:  | { error: "no_workspace" }
src\app\[locale]\app\projects\new\actions.ts:83:  // cookie-based active workspace resolver (Codex K-05 final review LOOP 1
src\app\[locale]\app\projects\new\actions.ts:88:  if (!active) return { error: "no_workspace" };
src\app\[locale]\app\projects\new\actions.ts:89:  const membership = { workspace_id: active.id };
src\app\[locale]\app\projects\new\actions.ts:100:  // belongs to the resolved workspace. RLS on `brands` already scopes
src\app\[locale]\app\projects\new\actions.ts:102:  // cross-workspace brand_id from another workspace the caller is also
src\app\[locale]\app\projects\new\actions.ts:103:  // a member of. Explicit check rejects the cross-workspace path
src\app\[locale]\app\projects\new\actions.ts:110:      .eq("workspace_id", membership.workspace_id)
src\app\[locale]\app\projects\new\actions.ts:115:        message: "brand_id does not belong to the resolved workspace",
src\app\[locale]\app\projects\new\actions.ts:121:    workspace_id: membership.workspace_id,
src\app\[locale]\app\projects\new\actions.ts:148:  // is the project's workspace member (just created the project above).
src\app\[locale]\app\projects\new\actions.ts:162:      // non-yagi_admin INSERT.
src\app\[locale]\app\projects\new\actions.ts:172:    // projects_delete_yagi RLS which only permits yagi_admin DELETEs;
src\app\[locale]\app\projects\new\actions.ts:173:    // a non-yagi workspace_admin's rollback would be silently denied
src\app\[locale]\app\projects\new\actions.ts:242:  | { error: "no_workspace" }
src\app\[locale]\app\projects\new\actions.ts:299:  // the workspace the user has selected in the switcher, not their
src\app\[locale]\app\projects\new\actions.ts:302:  if (!active) return { error: "no_workspace" };
src\app\[locale]\app\projects\new\actions.ts:303:  const membership = { workspace_id: active.id };
src\app\[locale]\app\projects\new\actions.ts:306:  //    guarantees at most one row matches per (workspace, user) via the
src\app\[locale]\app\projects\new\actions.ts:311:    .eq("workspace_id", membership.workspace_id)
src\app\[locale]\app\projects\new\actions.ts:334:  // Wave D sub_03g F4: same brand_id cross-workspace guard as
src\app\[locale]\app\projects\new\actions.ts:336:  // never carries a brand_id from a different workspace forward into
src\app\[locale]\app\projects\new\actions.ts:343:      .eq("workspace_id", membership.workspace_id)
src\app\[locale]\app\projects\new\actions.ts:348:        message: "brand_id does not belong to the resolved workspace",
src\app\[locale]\app\projects\new\actions.ts:354:    workspace_id: membership.workspace_id,
src\app\[locale]\app\projects\new\actions.ts:380:        .eq("workspace_id", membership.workspace_id)
src\app\[locale]\app\projects\new\actions.ts:459:  // Wave D sub_03g F4: brand_id cross-workspace guard. Resolve the
src\app\[locale]\app\projects\new\actions.ts:460:  // draft's workspace_id (the row the caller is allowed to mutate)
src\app\[locale]\app\projects\new\actions.ts:465:      .select("workspace_id")
src\app\[locale]\app\projects\new\actions.ts:468:    if (!draftRow?.workspace_id) {
src\app\[locale]\app\projects\new\actions.ts:475:      .eq("workspace_id", draftRow.workspace_id)
src\app\[locale]\app\projects\new\actions.ts:480:        message: "brand_id does not belong to the project's workspace",
src\app\[locale]\app\projects\new\actions.ts:715://      INSERT policy allows it since we own the workspace)
src\app\[locale]\app\projects\new\actions.ts:841:  // workspaceId is optional when draftProjectId is provided — the action
src\app\[locale]\app\projects\new\actions.ts:843:  // must be present for workspace resolution to succeed.
src\app\[locale]\app\projects\new\actions.ts:844:  workspaceId: z.string().uuid().optional(),
src\app\[locale]\app\projects\new\actions.ts:846:  // present, workspace is resolved from it. The draft row is deleted after
src\app\[locale]\app\projects\new\actions.ts:875:  // Resolve workspaceId. Wave C.5d sub_03a (Codex K-05 final review LOOP 1
src\app\[locale]\app\projects\new\actions.ts:877:  // fallback could misroute a project to the user's oldest workspace
src\app\[locale]\app\projects\new\actions.ts:878:  // instead of the workspace they had selected in the switcher. Replace
src\app\[locale]\app\projects\new\actions.ts:880:  // every accepted workspace_id is one the caller actually belongs to:
src\app\[locale]\app\projects\new\actions.ts:881:  //   A. wizard-supplied workspaceId  (preferred; sub_03b plumbs it)
src\app\[locale]\app\projects\new\actions.ts:882:  //   B. draft project row's workspace_id  (autosave path)
src\app\[locale]\app\projects\new\actions.ts:884:  // RLS already gates projects.INSERT to workspace members; this is
src\app\[locale]\app\projects\new\actions.ts:888:    .from("workspace_members")
src\app\[locale]\app\projects\new\actions.ts:889:    .select("workspace_id")
src\app\[locale]\app\projects\new\actions.ts:891:  const memberSet = new Set((memRows ?? []).map((r) => r.workspace_id));
src\app\[locale]\app\projects\new\actions.ts:895:  if (data.workspaceId && memberSet.has(data.workspaceId)) {
src\app\[locale]\app\projects\new\actions.ts:896:    resolvedWorkspaceId = data.workspaceId;
src\app\[locale]\app\projects\new\actions.ts:902:      .select("workspace_id")
src\app\[locale]\app\projects\new\actions.ts:905:    if (draftRow?.workspace_id && memberSet.has(draftRow.workspace_id)) {
src\app\[locale]\app\projects\new\actions.ts:906:      resolvedWorkspaceId = draftRow.workspace_id;
src\app\[locale]\app\projects\new\actions.ts:916:    return { ok: false, error: "db", message: "workspace not found for user" };
src\app\[locale]\app\projects\new\actions.ts:927:  //    are workspace members. Direct UPDATE to status is forbidden by trigger
src\app\[locale]\app\projects\new\actions.ts:949:      workspace_id: resolvedWorkspaceId,
src\app\[locale]\app\projects\new\actions.ts:1045:  // user in this workspace, since the real project is now submitted.
src\app\[locale]\app\projects\new\actions.ts:1049:    .eq("workspace_id", resolvedWorkspaceId)
src\app\[locale]\app\projects\new\actions.ts:1065:  let workspaceName = "Workspace";
src\app\[locale]\app\projects\new\actions.ts:1067:    const [emailRes, profileRes, workspaceRes] = await Promise.all([
src\app\[locale]\app\projects\new\actions.ts:1073:      service.from("workspaces").select("name").eq("id", resolvedWorkspaceId).maybeSingle(),
src\app\[locale]\app\projects\new\actions.ts:1079:    workspaceName = workspaceRes.data?.name ?? "Workspace";
src\app\[locale]\app\projects\new\actions.ts:1094:      workspaceName,
src\app\[locale]\app\projects\new\actions.ts:1123:      workspace_id: resolvedWorkspaceId,
src\app\[locale]\app\projects\new\briefing-actions.ts:11:// task_05 v3 (Step 2 — workspace 3-column + autosave):
src\app\[locale]\app\projects\new\briefing-actions.ts:20://   - resolveActiveWorkspace for active workspace id
src\app\[locale]\app\projects\new\briefing-actions.ts:21://   - explicit project ownership / workspace-membership re-verify before
src\app\[locale]\app\projects\new\briefing-actions.ts:33:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\briefing-actions.ts:62:        | "no_workspace"
src\app\[locale]\app\projects\new\briefing-actions.ts:89:    return { ok: false, error: "no_workspace" };
src\app\[locale]\app\projects\new\briefing-actions.ts:110:      .select("id, status, created_by, workspace_id, deleted_at")
src\app\[locale]\app\projects\new\briefing-actions.ts:130:      if (existing.workspace_id !== active.id) {
src\app\[locale]\app\projects\new\briefing-actions.ts:134:          message: "workspace mismatch",
src\app\[locale]\app\projects\new\briefing-actions.ts:165:  // soft-delete any dangling alive draft for (workspace, user, brief)
src\app\[locale]\app\projects\new\briefing-actions.ts:168:  // the same (workspace, user) pair. Without it, the second INSERT
src\app\[locale]\app\projects\new\briefing-actions.ts:180:  // yagi_admin clients ("no writing deleted_at" — see
src\app\[locale]\app\projects\new\briefing-actions.ts:185:  // via the explicit created_by = user.id + workspace_id = active.id
src\app\[locale]\app\projects\new\briefing-actions.ts:187:  // drafts in the caller's active workspace.
src\app\[locale]\app\projects\new\briefing-actions.ts:192:    .eq("workspace_id", active.id)
src\app\[locale]\app\projects\new\briefing-actions.ts:209:      workspace_id: active.id,
src\app\[locale]\app\preprod\actions.ts:27:  // so a hidden / nonexistent / cross-workspace project returns null.
src\app\[locale]\app\preprod\actions.ts:35:  // Look up yagi-internal workspace id
src\app\[locale]\app\preprod\actions.ts:37:    .from("workspaces")
src\app\[locale]\app\preprod\actions.ts:41:  if (!yagiWs) return { ok: false, error: "yagi_internal_workspace_missing" };
src\app\[locale]\app\preprod\actions.ts:43:  // Insert board (DB trigger will set workspace_id authoritatively)
src\app\[locale]\app\preprod\actions.ts:48:      workspace_id: yagiWs.id, // trigger overwrites; pass for type-safety
src\app\[locale]\(auth)\signup\page.tsx:22:  "/onboarding/workspace",
src\app\[locale]\(auth)\signup\page.tsx:76:    const base = `${siteUrl}/onboarding/workspace`;
src\app\[locale]\(auth)\signup\page.tsx:98:      // Phase 4.x Wave C.5b sub_01: persona A — direct to workspace creation.
src\app\[locale]\(auth)\signup\page.tsx:99:      router.push((next ?? "/onboarding/workspace") as "/onboarding/workspace");
src\app\[locale]\app\preprod\page.tsx:58:  // Visibility: yagi_admin OR member of yagi-internal workspace
src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\page.tsx:62:      .from("workspaces")
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:6:// yagi_admin sends a magic-link invite to a prospective Artist, then
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:7:// atomically creates the workspace, workspace_member, and artist_profile rows
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:12://   1. client role          → forbidden (not yagi_admin)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:13://   2. ws_admin role        → forbidden (only yagi_admin gate passes)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:14://   3. yagi_admin           → permitted; service-role client bypasses RLS
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:32:  | { ok: true; workspaceId: string }
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:64:  // 3. yagi_admin gate — query user_roles for global yagi_admin role
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:65:  //    (workspace_id IS NULL = global role, not workspace-scoped)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:70:    .is("workspace_id", null)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:71:    .eq("role", "yagi_admin");
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:82:  //    (Supabase auth admin API + workspace/member/profile inserts)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:116:  // 7. INSERT workspaces (kind='artist')
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:120:    .from("workspaces")
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:132:    console.error("[inviteArtistAction] workspace insert error:", wsErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:135:      "[inviteArtistAction] ORPHAN: auth user created but workspace insert failed",
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:141:      message: wsErr?.message ?? "workspace insert returned no row",
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:145:  const workspaceId: string = wsData.id;
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:147:  // 8. INSERT workspace_members (role='admin' = primary owner role used by bootstrap_workspace)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:148:  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:149:    workspace_id: workspaceId,
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:157:    console.error("[inviteArtistAction] workspace_members insert error:", memberErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:159:      "[inviteArtistAction] ORPHAN: workspace created but member insert failed",
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:160:      { workspaceId, invitedUserId, email }
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:167:    workspace_id: workspaceId,
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:180:      "[inviteArtistAction] ORPHAN: workspace+member created but artist_profile insert failed",
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:181:      { workspaceId, invitedUserId, email }
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:186:  return { ok: true, workspaceId };
src\app\[locale]\app\projects\new\briefing-canvas-step-2.tsx:23://     (RLS-scoped to the project's workspace members).
src\app\[locale]\app\preprod\new\page.tsx:27:  // Visibility: yagi_admin OR member of yagi-internal workspace
src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\new\page.tsx:31:      .from("workspaces")
src\app\[locale]\app\preprod\new\page.tsx:49:    .select("id, title, workspace_id, workspaces(name)")
src\app\[locale]\app\preprod\new\page.tsx:56:    workspace: Array.isArray(p.workspaces)
src\app\[locale]\app\preprod\new\page.tsx:57:      ? (p.workspaces[0] as { name: string } | undefined) ?? null
src\app\[locale]\app\preprod\new\page.tsx:58:      : (p.workspaces as { name: string } | null),
src\app\[locale]\app\projects\new\briefing-canvas.tsx:102:    queryStep === "commit" ? 3 : queryStep === "workspace" ? 2 : 1;
src\app\[locale]\app\projects\new\briefing-canvas.tsx:182:              : result.error === "no_workspace"
src\app\[locale]\app\projects\new\briefing-canvas.tsx:183:                ? "briefing.step1.toast.no_workspace"
src\app\[locale]\app\admin\projects\page.tsx:31:      workspace:workspaces(id, name),
src\app\[locale]\app\admin\projects\page.tsx:62:      workspace: p.workspace ? { id: p.workspace.id, name: p.workspace.name } : null,
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:4:// Phase 5 Wave B task_05 v3 — Step 2 workspace server actions
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:25://   2. resolveActiveWorkspace for active workspace id
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:26://   3. explicit project ownership + workspace-membership re-verify before
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:39:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:76: * Verifies the caller is a current workspace_member of the project's
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:77: * workspace AND that the project is still in 'draft' state. Defense-
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:80: * action layer so a status transition or workspace removal between
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:87:      workspaceId: string;
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:95:        | "no_workspace"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:109:  if (!active) return { ok: false, error: "no_workspace" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:116:    .select("id, workspace_id, status, created_by")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:124:  if (project.workspace_id !== active.id) {
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:125:    return { ok: false, error: "forbidden", message: "workspace mismatch" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:136:    .from("workspace_members")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:138:    .eq("workspace_id", project.workspace_id)
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:142:    return { ok: false, error: "forbidden", message: "not a workspace member" };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:145:  return { ok: true, userId: user.id, workspaceId: project.workspace_id, sb };
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:166:        | "no_workspace"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:282:        | "no_workspace"
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:426:  // RLS DELETE policy gates created_by + workspace member + status='draft'.
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:549:        | "no_workspace"
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\preprod\[id]\actions.ts:105:  // Phase 1.8 — notify workspace members (except the actor) that a new frame
src\app\[locale]\app\preprod\[id]\actions.ts:499:  // Phase 1.8 — notify workspace members (except the actor) that a revision
src\app\[locale]\app\preprod\[id]\actions.ts:524:    .select("id, title, project_id, workspace_id")
src\app\[locale]\app\preprod\[id]\actions.ts:531:      .from("workspace_members")
src\app\[locale]\app\preprod\[id]\actions.ts:533:      .eq("workspace_id", board.workspace_id),
src\app\[locale]\app\preprod\[id]\actions.ts:552:          workspace_id: board.workspace_id,
src\app\[locale]\app\preprod\[id]\actions.ts:572:    .select("id, title, project_id, workspace_id")
src\app\[locale]\app\preprod\[id]\actions.ts:578:    .from("workspace_members")
src\app\[locale]\app\preprod\[id]\actions.ts:580:    .eq("workspace_id", board.workspace_id);
src\app\[locale]\app\preprod\[id]\actions.ts:592:          workspace_id: board.workspace_id,
src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\[id]\actions.ts:739:  // Fall back to ws_admin of yagi-internal workspace
src\app\[locale]\app\preprod\[id]\actions.ts:741:    .from("workspaces")
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:19://     3. SELECT project + verify workspace + status='draft' + creator
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:25:// (created_by AND status='draft') OR ws_admin OR yagi_admin for the
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:34:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:46:      workspaceId: string;
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:52:      error: "unauthenticated" | "no_workspace" | "not_found" | "forbidden";
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:64:  if (!active) return { ok: false, error: "no_workspace" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:71:    .select("id, workspace_id, status, created_by")
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:79:  if (project.workspace_id !== active.id) {
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:80:    return { ok: false, error: "forbidden", message: "workspace mismatch" };
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:95:    workspaceId: active.id,
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:124:        | "no_workspace"
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:200:        | "no_workspace"
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:223:  //     in_review is reserved for system / yagi_admin)
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:240:  // though the RPC does not consult workspace context — it surfaces a
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:241:  // clean no_workspace error to the client (mid-onboarding edge) before
src\app\[locale]\app\projects\new\briefing-step3-actions.ts:244:  if (!active) return { ok: false, error: "no_workspace" };
src\app\[locale]\app\projects\new\new-project-wizard.tsx:134:  // Wave C.5d sub_03b — active workspace resolved server-side in
src\app\[locale]\app\projects\new\new-project-wizard.tsx:865:                // Wave C.5d sub_03b: explicit active workspace from server-
src\app\[locale]\app\projects\new\new-project-wizard.tsx:868:                workspaceId: activeWorkspaceId ?? undefined,
src\app\[locale]\app\preprod\[id]\page.tsx:28:  // Visibility: yagi_admin OR member of yagi-internal workspace
src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\[id]\page.tsx:32:      .from("workspaces")
src\app\[locale]\app\preprod\[id]\page.tsx:59:      project:projects(title, workspace_id)
src\app\[locale]\app\preprod\[id]\page.tsx:180:    project: boardData.project as { title: string; workspace_id: string } | null,
src\app\[locale]\app\preprod\[id]\share-actions.ts:52:    .select("id, status, share_token, project_id, workspace_id, title")
src\app\[locale]\app\preprod\[id]\share-actions.ts:90:  // Phase 1.8 — notify all workspace members that a board was shared. Never
src\app\[locale]\app\preprod\[id]\share-actions.ts:98:      workspaceId: board.workspace_id,
src\app\[locale]\app\preprod\[id]\share-actions.ts:178:    .select("id, title, project_id, workspace_id")
src\app\[locale]\app\preprod\[id]\share-actions.ts:191:      workspaceId: updated[0].workspace_id,
src\app\[locale]\app\preprod\[id]\share-actions.ts:245:  workspaceId: string
src\app\[locale]\app\preprod\[id]\share-actions.ts:249:  const [{ data: members }, { data: workspace }, actorName] = await Promise.all([
src\app\[locale]\app\preprod\[id]\share-actions.ts:251:      .from("workspace_members")
src\app\[locale]\app\preprod\[id]\share-actions.ts:253:      .eq("workspace_id", args.workspaceId),
src\app\[locale]\app\preprod\[id]\share-actions.ts:255:      .from("workspaces")
src\app\[locale]\app\preprod\[id]\share-actions.ts:257:      .eq("id", args.workspaceId)
src\app\[locale]\app\preprod\[id]\share-actions.ts:262:  const clientName = workspace?.name ?? ""
src\app\[locale]\app\preprod\[id]\share-actions.ts:273:          workspace_id: args.workspaceId,
src\app\[locale]\app\preprod\[id]\share-actions.ts:290:  workspaceId: string
src\app\[locale]\app\preprod\[id]\share-actions.ts:298:      .eq("role", "yagi_admin")
src\app\[locale]\app\preprod\[id]\share-actions.ts:299:      .is("workspace_id", null),
src\app\[locale]\app\preprod\[id]\share-actions.ts:313:          workspace_id: args.workspaceId,
src\app\[locale]\app\projects\new\page.tsx:4:import { resolveActiveWorkspace } from "@/lib/workspace/active";
src\app\[locale]\app\projects\new\page.tsx:28:  // cookie-based active workspace resolver so brand list + downstream
src\app\[locale]\app\projects\new\page.tsx:29:  // wizard payload reflect the workspace the user actually selected in
src\app\[locale]\app\projects\new\page.tsx:32:  const workspaceId = active?.id ?? null;
src\app\[locale]\app\projects\new\page.tsx:34:  // Fetch brands for the workspace (empty list is fine — wizard shows "None" option)
src\app\[locale]\app\projects\new\page.tsx:36:  if (workspaceId) {
src\app\[locale]\app\projects\new\page.tsx:40:      .eq("workspace_id", workspaceId)
src\app\[locale]\app\projects\new\page.tsx:55:    <BriefingCanvas brands={brands} activeWorkspaceId={workspaceId} />
src\app\[locale]\app\projects\[id]\thread-actions.ts:26:  // If visibility=internal, enforce server-side that the user has yagi_admin role.
src\app\[locale]\app\projects\[id]\thread-actions.ts:33:      .is("workspace_id", null)
src\app\[locale]\app\projects\[id]\thread-actions.ts:34:      .eq("role", "yagi_admin");
src\app\[locale]\app\projects\[id]\thread-actions.ts:186:      .is("workspace_id", null)
src\app\[locale]\app\projects\[id]\thread-actions.ts:187:      .eq("role", "yagi_admin");
src\app\[locale]\app\projects\[id]\thread-actions.ts:301:  // Look up project → workspace_id, then workspace members + YAGI admins.
src\app\[locale]\app\projects\[id]\thread-actions.ts:304:    .select("workspace_id")
src\app\[locale]\app\projects\[id]\thread-actions.ts:309:  // Phase 2.0 G4 #2 — drop the global yagi_admin fan-out. Previously every
src\app\[locale]\app\projects\[id]\thread-actions.ts:310:  // yagi_admin received notifications for every workspace's thread messages,
src\app\[locale]\app\projects\[id]\thread-actions.ts:311:  // which leaked client metadata across workspace boundaries. Yagi staff who
src\app\[locale]\app\projects\[id]\thread-actions.ts:312:  // need notifications for a given workspace must be added as workspace_members
src\app\[locale]\app\projects\[id]\thread-actions.ts:316:      .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:318:      .eq("workspace_id", project.workspace_id),
src\app\[locale]\app\projects\[id]\thread-actions.ts:342:        workspace_id: project.workspace_id,
src\app\[locale]\app\projects\[id]\thread-actions.ts:357:// workspace. RLS layering is the same as thread_message_new — we only
src\app\[locale]\app\projects\[id]\thread-actions.ts:358:// query workspace_members (project participants) so non-members never
src\app\[locale]\app\projects\[id]\thread-actions.ts:379:    .select("workspace_id")
src\app\[locale]\app\projects\[id]\thread-actions.ts:384:  // Members of this workspace (project participants set).
src\app\[locale]\app\projects\[id]\thread-actions.ts:386:    .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:388:    .eq("workspace_id", project.workspace_id);
src\app\[locale]\app\projects\[id]\thread-actions.ts:394:  // Fetch role rows scoped to this workspace (or null = global yagi_admin)
src\app\[locale]\app\projects\[id]\thread-actions.ts:398:    .select("user_id, role, workspace_id")
src\app\[locale]\app\projects\[id]\thread-actions.ts:405:      r.workspace_id === null || r.workspace_id === project.workspace_id;
src\app\[locale]\app\projects\[id]\thread-actions.ts:407:    if (r.role === "yagi_admin") isYagi.add(r.user_id);
src\app\[locale]\app\projects\[id]\thread-actions.ts:408:    if (r.role === "workspace_admin") isAdmin.add(r.user_id);
src\app\[locale]\app\projects\[id]\thread-actions.ts:449:        workspace_id: project.workspace_id,
src\components\project-board\brief-board-client.tsx:23:  viewerRole: "client" | "yagi_admin";
src\components\project-board\brief-board-client.tsx:42:      if (locked && viewerRole !== "yagi_admin") return;
src\app\[locale]\app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin → notFound).
src\app\[locale]\app\admin\projects\[id]\page.tsx:30:  // yagi_admin role check
src\app\[locale]\app\admin\projects\[id]\page.tsx:35:  const isYagiAdmin = (roleRows ?? []).some((r) => r.role === "yagi_admin");
src\app\[locale]\app\admin\projects\[id]\page.tsx:50:      workspace:workspaces(id, name)
src\app\[locale]\app\admin\projects\[id]\page.tsx:97:  const workspace = Array.isArray(projectRaw.workspace)
src\app\[locale]\app\admin\projects\[id]\page.tsx:98:    ? projectRaw.workspace[0]
src\app\[locale]\app\admin\projects\[id]\page.tsx:99:    : projectRaw.workspace;
src\app\[locale]\app\admin\projects\[id]\page.tsx:100:  const workspaceName = workspace?.name ?? "—";
src\app\[locale]\app\admin\projects\[id]\page.tsx:127:          {workspaceName}
src\components\project-board\brief-board-shell-client.tsx:8: *   - LockButton (yagi_admin only)
src\components\project-board\brief-board-shell-client.tsx:41:  viewerRole: "client" | "yagi_admin";
src\components\project-board\brief-board-shell-client.tsx:70:  const isClientView = viewerRole !== "yagi_admin";
src\components\project-board\brief-board-shell-client.tsx:101:        {/* Lock button — yagi_admin only, brief mode only */}
src\components\project-board\brief-board-shell-client.tsx:102:        {viewerRole === "yagi_admin" && (
src\components\project-board\lock-button.tsx:5: * Phase 3.1 hotfix-3 task_04 — yagi_admin-only lock/unlock button for brief mode.
src\components\project-board\project-board.tsx:141:  viewerRole?: "client" | "yagi_admin";
src\components\project-board\project-board.tsx:181:    (locked && viewerRole !== "yagi_admin");
src\components\project-board\project-board.tsx:447:      // === TASK_05_STUB: lock/unlock action (brief mode, yagi_admin only) ===
src\components\project-board\project-board.tsx:543:      {locked && viewerRole !== "yagi_admin" && (
src\components\project-board\version-history-panel.tsx:25:  viewerRole: "client" | "yagi_admin";
src\components\project-board\version-history-panel.tsx:38:  const isAdmin = viewerRole === "yagi_admin";

codex
One concrete mismatch is emerging around the switcher: the UI gates the new-workspace row with a server-derived prop, but the row is currently disabled and does not call any creation action. I’m separating that from access-control findings, since a disabled placeholder does not create an invite/delete path by itself.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$c = Get-Content -LiteralPath '"'messages/ko.json'; "'$c[2155..2225]' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$c = Get-Content -LiteralPath '"'messages/en.json'; "'$c[2088..2160]' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'workspace\\.switcher|workspace_switcher|admin_artists|onboarding_artist' src messages/ko.json messages/en.json" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'short_bio|shortBio|dangerouslySetInnerHTML|innerHTML' src/app/[locale]/app/admin/artists src/app/[locale]/onboarding/artist" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 424ms:
      "confirm": {
        "title": "Lock this board?",
        "body": "While locked, the client cannot edit. (Admin can still edit.)",
        "cancel": "Cancel",
        "confirm": "Lock"
      },
      "banner_for_client": "Admin has locked this board. Editing disabled."
    }
  },
  "workspace_switcher": {
    "current_label": "Current workspace",
    "group_brand": "Brand",
    "group_artist": "Artist",
    "add_new": "+ New workspace"
  },
  "admin_artists": {
    "title": "Roster",
    "invite_cta": "+ Invite new Artist",
    "table_heading": "Artist list",
    "table_empty": "No artists invited yet.",
    "column_name": "Name",
    "column_email": "Email",
    "column_instagram": "Instagram",
    "column_joined_at": "Joined",
    "column_status": "Status",
    "status_invite_pending": "??Invited",
    "status_onboarding": "??Onboarding",
    "status_active": "??Active",
    "form_email": "Email",
    "form_display_name": "Artist name",
    "form_display_name_ph": "e.g. Jane Kim",
    "form_short_bio": "Short bio",
    "form_short_bio_ph": "A short introduction (optional)",
    "form_submit": "Send invite",
    "optional": "optional",
    "invite_success": "Invite email sent.",
    "invite_error_validation": "Please check your input.",
    "invite_error_unauthenticated": "Please sign in.",
    "invite_error_forbidden": "You don't have permission.",
    "invite_error_invite_failed": "Failed to send invite email.",
    "invite_error_db": "A database error occurred."
  },
  "onboarding_artist": {
    "greeting": "Welcome, {name}",
    "subtitle": "Final step to set up your account.",
    "email_label": "Email",
    "instagram_label": "Instagram handle",
    "submit_cta": "Get started ??
  }
}

 succeeded in 426ms:
        "body": "?좉툑 ???대씪?댁뼵?몃뒗 蹂대뱶瑜??몄쭛?????놁뒿?덈떎. (愿由ъ옄??怨꾩냽 ?몄쭛 媛??",
        "cancel": "痍⑥냼",
        "confirm": "?좉렇湲?
      },
      "banner_for_client": "愿由ъ옄媛 蹂대뱶瑜??좉컮?듬땲?? ?몄쭛?????놁뒿?덈떎."
    }
  },
  "workspace_switcher": {
    "current_label": "?꾩옱 ?뚰겕?ㅽ럹?댁뒪",
    "group_brand": "釉뚮옖??,
    "group_artist": "?꾪떚?ㅽ듃",
    "add_new": "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲?
  },
  "admin_artists": {
    "title": "?뚯냽 ?꾪떚?ㅽ듃",
    "invite_cta": "+ ??Artist ?곸엯",
    "table_heading": "?꾪떚?ㅽ듃 紐낅떒",
    "table_empty": "?꾩쭅 ?곸엯???꾪떚?ㅽ듃媛 ?놁뒿?덈떎.",
    "column_name": "?대쫫",
    "column_email": "email",
    "column_instagram": "Instagram",
    "column_joined_at": "媛?낆씪",
    "column_status": "?곹깭",
    "status_invite_pending": "??invite ?꾨즺",
    "status_onboarding": "??onboarding",
    "status_active": "???쒖꽦",
    "form_email": "?대찓??,
    "form_display_name": "?꾪떚?ㅽ듃 ?대쫫",
    "form_display_name_ph": "?? 源?덉쭊",
    "form_short_bio": "?뚭컻",
    "form_short_bio_ph": "吏㏃? ?먭린?뚭컻 (?좏깮)",
    "form_submit": "珥덈? 蹂대궡湲?,
    "optional": "?좏깮",
    "invite_success": "珥덈? ?대찓?쇱쓣 諛쒖넚?덉뒿?덈떎.",
    "invite_error_validation": "?낅젰媛믪쓣 ?뺤씤??二쇱꽭??",
    "invite_error_unauthenticated": "濡쒓렇?몄씠 ?꾩슂?⑸땲??",
    "invite_error_forbidden": "沅뚰븳???놁뒿?덈떎.",
    "invite_error_invite_failed": "珥덈? ?대찓??諛쒖넚???ㅽ뙣?덉뒿?덈떎.",
    "invite_error_db": "?곗씠??泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎."
  },
  "onboarding_artist": {
    "greeting": "留뚮굹??諛섍??뚯슂, {name}??,
    "subtitle": "怨꾩젙 ?ㅼ젙 留덉?留??④퀎?낅땲??",
    "email_label": "?대찓??,
    "instagram_label": "Instagram 怨꾩젙",
    "submit_cta": "?쒖옉?섍린 ??
  }
}

 succeeded in 432ms:
src/app/[locale]/onboarding/artist\_actions\complete-onboarding.ts:12:// UPDATE (display_name, short_bio, instagram_handle, updated_at), and
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:21:  shortBio: z.string().max(500).optional(),
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:41:    defaultValues: { email: "", displayName: "", shortBio: "" },
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:94:          {t("form_short_bio")}{" "}
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:99:          placeholder={t("form_short_bio_ph")}
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:101:          {...register("shortBio")}
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:103:        {errors.shortBio && (
src/app/[locale]/app/admin/artists\_components\invite-artist-form.tsx:104:          <p className="text-xs text-destructive">{errors.shortBio.message}</p>
src/app/[locale]/app/admin/artists\_actions\invite-artist.ts:28:  shortBio: z.string().max(500).optional(),
src/app/[locale]/app/admin/artists\_actions\invite-artist.ts:52:  const { email, displayName, shortBio } = parsed.data;
src/app/[locale]/app/admin/artists\_actions\invite-artist.ts:169:    short_bio: shortBio ?? null,

 succeeded in 436ms:
messages/en.json:2098:  "workspace_switcher": {
messages/en.json:2104:  "admin_artists": {
messages/en.json:2131:  "onboarding_artist": {
messages/ko.json:2163:  "workspace_switcher": {
messages/ko.json:2169:  "admin_artists": {
messages/ko.json:2196:  "onboarding_artist": {
src\components\sidebar\workspace-switcher.tsx:54:  const t = useTranslations("workspace.switcher");
src\app\[locale]\onboarding\artist\_components\onboarding-form.tsx:32:  const t = useTranslations("onboarding_artist");
src\app\[locale]\app\admin\artists\_components\invite-artist-form.tsx:31:  const t = useTranslations("admin_artists");
src\app\[locale]\app\admin\artists\page.tsx:57:  const t = await getTranslations("admin_artists");

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$c = Get-Content -LiteralPath '"'messages/en.json'; "'$c[290..310]' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$c = Get-Content -LiteralPath '"'messages/ko.json'; "'$c[290..310]' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'workspace_switcher|admin_artists|onboarding_artist|Roster|Routing|Inbound|Talent-Initiated|RFP|D2C|Approval Gate|Bypass brands|Auto-decline|License fee|Type N|Curation note|로스터|라우팅|인바운드|탤런트|승인 게이트|바이패스|자동 거절|라이선스|큐레이션' messages/ko.json messages/en.json" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'brands_group|artists_group|admin_group|add_new|workspace\\.switcher|workspace_switcher' messages/en.json messages/ko.json src/components/sidebar/workspace-switcher.tsx" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 459ms:
    "contest_tab": "Contest brief",
    "coming_soon": "Coming in next phase"
  },
  "workspace": {
    "current": "Current workshop",
    "switch": "Switch workshop",
    "no_workspace": "No workshop",
    "switcher": {
      "brands_group": "Brand",
      "artists_group": "Artist",
      "admin_group": "YAGI",
      "add_new": "+ New workspace",
      "errors": {
        "unauthenticated": "Please sign in.",
        "not_a_member": "You are not a member of this workspace.",
        "invalid": "Couldn't switch workspaces. Please try again in a moment."
      }
    }
  },
  "invite": {
    "pending": "Pending",

 succeeded in 453ms:
messages/en.json:1675:      "routing": "Routing",
messages/en.json:2098:  "workspace_switcher": {
messages/en.json:2104:  "admin_artists": {
messages/en.json:2105:    "title": "Roster",
messages/en.json:2131:  "onboarding_artist": {
messages/ko.json:537:          "tooltip": "Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는 걸 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.",
messages/ko.json:593:          "tooltip": "Digital Twin 은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI 가 라이선스를 보유한 인물의 Twin 을 광고/콘텐츠 제작에 활용하는 걸 제안드릴 수 있습니다. Digital Twin 없이 가상 인물 / VFX 만으로도 진행 가능합니다.",
messages/ko.json:848:            "tooltip": "Digital Twin은 실존 인물(아티스트, 배우, 가수 등) 기반의 AI 자산입니다. YAGI가 라이선스를 보유한 인물의 Twin을 광고/콘텐츠 제작에 사용할 수 있습니다.\n\nDigital Twin 없이 가상 인물 / VFX만으로도 진행 가능합니다."
messages/ko.json:1740:      "routing": "라우팅",
messages/ko.json:2163:  "workspace_switcher": {
messages/ko.json:2169:  "admin_artists": {
messages/ko.json:2196:  "onboarding_artist": {

 succeeded in 473ms:
    "contest_tab": "梨뚮┛吏 媛쒖꽕",
    "coming_soon": "?ㅼ쓬 ?④퀎?먯꽌 ?쒓났?⑸땲??
  },
  "workspace": {
    "current": "?꾩옱 ?뚰겕?ㅽ럹?댁뒪",
    "switch": "?뚰겕?ㅽ럹?댁뒪 ?꾪솚",
    "no_workspace": "?뚰겕?ㅽ럹?댁뒪 ?놁쓬",
    "switcher": {
      "brands_group": "釉뚮옖??,
      "artists_group": "?꾪떚?ㅽ듃",
      "admin_group": "YAGI",
      "add_new": "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲?,
      "errors": {
        "unauthenticated": "濡쒓렇?몄씠 ?꾩슂?댁슂.",
        "not_a_member": "???뚰겕?ㅽ럹?댁뒪???랁빐 ?덉? ?딆븘??",
        "invalid": "?뚰겕?ㅽ럹?댁뒪瑜??꾪솚?????놁뼱?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??"
      }
    }
  },
  "invite": {
    "pending": "?湲곗쨷??珥덈?",

 succeeded in 463ms:
src/components/sidebar/workspace-switcher.tsx:54:  const t = useTranslations("workspace.switcher");
src/components/sidebar/workspace-switcher.tsx:111:              {t("brands_group")}
src/components/sidebar/workspace-switcher.tsx:128:                {t("artists_group")}
src/components/sidebar/workspace-switcher.tsx:146:                {t("admin_group")}
src/components/sidebar/workspace-switcher.tsx:166:              <span className="text-sm">{t("add_new")}</span>
messages/en.json:299:      "brands_group": "Brand",
messages/en.json:300:      "artists_group": "Artist",
messages/en.json:301:      "admin_group": "YAGI",
messages/en.json:302:      "add_new": "+ New workspace",
messages/en.json:2098:  "workspace_switcher": {
messages/en.json:2102:    "add_new": "+ New workspace"
messages/ko.json:299:      "brands_group": "브랜드",
messages/ko.json:300:      "artists_group": "아티스트",
messages/ko.json:301:      "admin_group": "YAGI",
messages/ko.json:302:      "add_new": "+ 새 워크스페이스 만들기",
messages/ko.json:2163:  "workspace_switcher": {
messages/ko.json:2167:    "add_new": "+ 새 워크스페이스 만들기"

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"GRANT .* ON .* TO authenticated|REVOKE UPDATE|ENABLE ROW LEVEL SECURITY|CREATE TABLE .*\\(\" supabase/migrations -g '*.sql' | Select-Object -First 200" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE (OR REPLACE )?FUNCTION public.is_yagi_admin|is_yagi_admin\" supabase/migrations -g '*.sql'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"CREATE POLICY .*workspace_members|ALTER TABLE workspace_members ENABLE|workspace_members.*FOR SELECT|workspace_members\" supabase/migrations -g '*.sql' | Select-Object -First 200" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 465ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:115:  insert into public.workspace_members (workspace_id, user_id, role, joined_at)
supabase/migrations\20260422120000_phase_2_0_baseline.sql:159:    select 1 from workspace_members
supabase/migrations\20260422120000_phase_2_0_baseline.sql:173:  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1813:-- Name: workspace_members; Type: TABLE; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1816:CREATE TABLE public.workspace_members (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1825:    CONSTRAINT workspace_members_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'member'::text])))
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2168:-- Data for Name: workspace_members; Type: TABLE DATA; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2564:-- Name: workspace_members workspace_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2567:ALTER TABLE ONLY public.workspace_members
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2568:    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2572:-- Name: workspace_members workspace_members_workspace_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2575:ALTER TABLE ONLY public.workspace_members
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2576:    ADD CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2972:CREATE INDEX ws_members_user_idx ON public.workspace_members USING btree (user_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:2979:CREATE INDEX ws_members_ws_idx ON public.workspace_members USING btree (workspace_id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3642:-- Name: workspace_members workspace_members_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3645:ALTER TABLE ONLY public.workspace_members
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3646:    ADD CONSTRAINT workspace_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id);
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3650:-- Name: workspace_members workspace_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3653:ALTER TABLE ONLY public.workspace_members
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3654:    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3658:-- Name: workspace_members workspace_members_workspace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3661:ALTER TABLE ONLY public.workspace_members
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3662:    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4464:-- Name: workspace_members; Type: ROW SECURITY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4467:ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4504:-- Name: workspace_members ws_members_delete_admin; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4511:-- Name: workspace_members ws_members_read; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4518:-- Name: workspace_members ws_members_self_bootstrap; Type: POLICY; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4521:CREATE POLICY ws_members_self_bootstrap ON public.workspace_members FOR INSERT TO authenticated WITH CHECK ((((user_id = auth.uid()) AND (role = 'admin'::text) AND (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4522:   FROM public.workspace_members m
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260423020100_seed_yagi_internal_workspace.sql:21:-- row exactly so downstream joins (workspace_members.workspace_id,
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:148:    FROM public.workspace_members wm
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:6:-- workspace_members.role != 'admin') cannot INSERT projects via the user-scoped
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:15:-- In prod today (2026-04-28) workspace_members only has role='admin' rows
supabase/migrations\20260429113853_phase_3_1_project_board.sql:51:        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase/migrations\20260429113853_phase_3_1_project_board.sql:69:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase/migrations\20260429113853_phase_3_1_project_board.sql:81:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase/migrations\20260429113853_phase_3_1_project_board.sql:101:          SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:377:          SELECT workspace_members.workspace_id
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:378:          FROM workspace_members
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:379:          WHERE workspace_members.user_id = auth.uid()
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:391:          SELECT workspace_members.workspace_id
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:392:          FROM workspace_members
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:393:          WHERE workspace_members.user_id = auth.uid()
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:22:-- (workspace_members.role enum is `'admin' | 'member'` — see Phase 2.0
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:71:      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:92:        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:105:-- (sub_4 F2 fix — without the workspace_members predicate an ex-member
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:118:        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:132:        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:153:      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:47:        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:72:        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260504180000_phase_5_briefing_documents_status_lockdown.sql:87:        JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
supabase/migrations\20260505000000_phase_6_artist_profile.sql:81:      SELECT 1 FROM workspace_members
supabase/migrations\20260505000000_phase_6_artist_profile.sql:102:      SELECT 1 FROM workspace_members
supabase/migrations\20260505000000_phase_6_artist_profile.sql:110:      SELECT 1 FROM workspace_members

 succeeded in 491ms:
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:84:CREATE TABLE public.creators (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:94:CREATE TABLE public.studios (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:113:CREATE TABLE public.challenges (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:147:CREATE TABLE public.challenge_submissions (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:163:CREATE TABLE public.challenge_votes (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:177:CREATE TABLE public.challenge_judgments (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:192:CREATE TABLE public.showcase_challenge_winners (
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:223:ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:247:ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:272:ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:289:ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:327:ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:342:ALTER TABLE public.challenge_judgments ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:349:ALTER TABLE public.showcase_challenge_winners ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1223:CREATE TABLE public.brands (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1242:CREATE TABLE public.invoice_line_items (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1264:CREATE TABLE public.invoices (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1297:CREATE TABLE public.meeting_attendees (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1314:CREATE TABLE public.meetings (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1343:CREATE TABLE public.notification_events (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1366:CREATE TABLE public.notification_preferences (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1382:CREATE TABLE public.notification_unsubscribe_tokens (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1394:CREATE TABLE public.preprod_boards (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1418:CREATE TABLE public.preprod_frame_comments (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1438:CREATE TABLE public.preprod_frame_reactions (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1455:CREATE TABLE public.preprod_frames (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1482:CREATE TABLE public.profiles (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1508:CREATE TABLE public.project_deliverables (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1529:CREATE TABLE public.project_milestones (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1546:CREATE TABLE public.project_references (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1575:CREATE TABLE public.project_threads (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1588:CREATE TABLE public.projects (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1617:CREATE TABLE public.showcase_media (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1636:CREATE TABLE public.showcases (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1673:CREATE TABLE public.supplier_profile (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1693:CREATE TABLE public.team_channel_message_attachments (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1711:CREATE TABLE public.team_channel_messages (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1726:CREATE TABLE public.team_channels (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1746:CREATE TABLE public.thread_message_attachments (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1765:CREATE TABLE public.thread_messages (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1783:CREATE TABLE public.user_roles (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1798:CREATE TABLE public.workspace_invitations (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1816:CREATE TABLE public.workspace_members (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1833:CREATE TABLE public.workspaces (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1858:CREATE TABLE storage.buckets (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1884:CREATE TABLE storage.buckets_analytics (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1899:CREATE TABLE storage.buckets_vectors (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1911:CREATE TABLE storage.migrations (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1923:CREATE TABLE storage.objects (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1950:CREATE TABLE storage.s3_multipart_uploads (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1968:CREATE TABLE storage.s3_multipart_uploads_parts (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:1986:CREATE TABLE storage.vector_indexes (
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3709:ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3756:ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3762:ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3803:ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3827:ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3879:ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3885:ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3891:ALTER TABLE public.notification_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3918:ALTER TABLE public.preprod_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3972:ALTER TABLE public.preprod_frame_comments ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3978:ALTER TABLE public.preprod_frame_reactions ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3984:ALTER TABLE public.preprod_frames ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4037:ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4086:ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4092:ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4098:ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4104:ALTER TABLE public.project_threads ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4110:ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4144:ALTER TABLE public.showcase_media ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4188:ALTER TABLE public.showcases ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4228:ALTER TABLE public.supplier_profile ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4267:ALTER TABLE public.team_channel_message_attachments ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4273:ALTER TABLE public.team_channel_messages ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4311:ALTER TABLE public.team_channels ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4347:ALTER TABLE public.thread_message_attachments ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4384:ALTER TABLE public.thread_messages ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4427:ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4461:ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4467:ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4473:ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4579:ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4585:ALTER TABLE storage.buckets_analytics ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4591:ALTER TABLE storage.buckets_vectors ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4614:ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4620:ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4672:ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4678:ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4787:ALTER TABLE storage.vector_indexes ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:24:CREATE TABLE IF NOT EXISTS public.handle_history (
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:41:ALTER TABLE public.handle_history ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:78:GRANT EXECUTE ON FUNCTION public.is_handle_available(citext) TO authenticated, anon;
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:156:GRANT EXECUTE ON FUNCTION public.change_handle(citext) TO authenticated;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:37:CREATE TABLE IF NOT EXISTS public.clients (
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:57:ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:71:CREATE TABLE IF NOT EXISTS public.commission_intakes (
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:101:ALTER TABLE public.commission_intakes ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:40:CREATE TABLE IF NOT EXISTS public.project_briefs (
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:61:ALTER TABLE public.project_briefs ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:79:CREATE TABLE IF NOT EXISTS public.project_brief_versions (
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:96:ALTER TABLE public.project_brief_versions ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:113:CREATE TABLE IF NOT EXISTS public.project_brief_assets (
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:128:ALTER TABLE public.project_brief_assets ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:148:CREATE TABLE IF NOT EXISTS public.embed_cache (
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:160:ALTER TABLE public.embed_cache ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:135:CREATE TABLE IF NOT EXISTS public.project_status_history (
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:161:GRANT SELECT ON public.project_status_history TO authenticated, anon;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:566:ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:614:ALTER TABLE public.project_references ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:37:CREATE TABLE IF NOT EXISTS public.support_threads (
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:54:ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:59:CREATE TABLE IF NOT EXISTS public.support_messages (
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:78:ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260429113853_phase_3_1_project_board.sql:8:CREATE TABLE IF NOT EXISTS project_boards (
supabase/migrations\20260429113853_phase_3_1_project_board.sql:25:CREATE TABLE IF NOT EXISTS project_board_versions (
supabase/migrations\20260429113853_phase_3_1_project_board.sql:42:ALTER TABLE project_boards ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260429113853_phase_3_1_project_board.sql:90:ALTER TABLE project_board_versions ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260429124343_phase_3_1_k05_loop_1_fixes.sql:64:GRANT EXECUTE ON FUNCTION seed_project_board_from_wizard(uuid, jsonb, jsonb) TO authenticated;
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:399:REVOKE UPDATE (attached_pdfs, attached_urls, asset_index) ON project_boards FROM authenticated;
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:44:CREATE TABLE project_licenses (
supabase/migrations\20260501000000_phase_4_x_workspace_kind_and_licenses.sql:67:ALTER TABLE project_licenses ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:5:-- asset_index) with column-level REVOKE UPDATE. That is a no-op while the
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:19:--   1. REVOKE UPDATE ON project_boards FROM authenticated  (table-level)
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:38:REVOKE UPDATE ON project_boards FROM authenticated;
supabase/migrations\20260504004536_phase_4_x_wave_c5d_sub03f_2_revoke_table_update.sql:39:GRANT UPDATE (document, updated_at) ON project_boards TO authenticated;
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:16:--   1. REVOKE UPDATE ON workspaces FROM authenticated  (table-level)
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:32:REVOKE UPDATE ON public.workspaces FROM authenticated;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:29:CREATE TABLE briefing_documents (
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:63:ALTER TABLE briefing_documents ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:108:-- (REVOKE UPDATE + selective GRANT excludes created_at) so the 24h
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:179:REVOKE UPDATE ON public.briefing_documents FROM authenticated;
supabase/migrations\20260504052541_phase_5_briefing_documents.sql:180:GRANT UPDATE (note, category) ON public.briefing_documents TO authenticated;
supabase/migrations\20260505000000_phase_6_artist_profile.sql:38:CREATE TABLE artist_profile (
supabase/migrations\20260505000000_phase_6_artist_profile.sql:74:ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;
supabase/migrations\20260505000000_phase_6_artist_profile.sql:132:REVOKE UPDATE ON artist_profile FROM authenticated;

 succeeded in 490ms:
supabase/migrations\20260422120000_phase_2_0_baseline.sql:178:-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
supabase/migrations\20260422120000_phase_2_0_baseline.sql:181:CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3715:CREATE POLICY brands_read ON public.brands FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3722:CREATE POLICY brands_write_admin ON public.brands TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3731:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3733:  WHERE ((p.id = project_deliverables.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3740:CREATE POLICY invoice_items_modify ON public.invoice_line_items USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3749:  WHERE ((i.id = invoice_line_items.invoice_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), i.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3768:CREATE POLICY invoices_hide_drafts_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (status <> 'draft'::text)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3775:CREATE POLICY invoices_hide_mocks_from_clients ON public.invoices AS RESTRICTIVE FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (is_mock = false)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3782:CREATE POLICY invoices_insert ON public.invoices FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3789:CREATE POLICY invoices_select ON public.invoices FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3796:CREATE POLICY invoices_update ON public.invoices FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3811:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_admin(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3820:  WHERE ((m.id = meeting_attendees.meeting_id) AND (public.is_ws_member(auth.uid(), m.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3833:CREATE POLICY meetings_insert ON public.meetings FOR INSERT WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3840:CREATE POLICY meetings_select ON public.meetings FOR SELECT USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3847:CREATE POLICY meetings_update ON public.meetings FOR UPDATE USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3856:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3858:  WHERE ((p.id = project_milestones.project_id) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3924:CREATE POLICY preprod_boards_delete ON public.preprod_boards FOR DELETE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3931:CREATE POLICY preprod_boards_insert ON public.preprod_boards FOR INSERT WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3938:CREATE POLICY preprod_boards_select ON public.preprod_boards FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3945:CREATE POLICY preprod_boards_update ON public.preprod_boards FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), workspace_id)));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3954:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3963:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3965:  WHERE ((b.id = preprod_frame_comments.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:3992:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4001:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4010:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4019:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id)))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4021:  WHERE ((b.id = preprod_frames.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_admin(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4030:  WHERE ((b.id = preprod_frame_reactions.board_id) AND (public.is_yagi_admin(auth.uid()) OR public.is_ws_member(auth.uid(), b.workspace_id))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4066:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4068:  WHERE ((p.id = project_references.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4077:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4079:  WHERE ((p.id = project_threads.project_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4116:CREATE POLICY projects_delete_yagi ON public.projects FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4123:CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4130:CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4137:CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4152:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4161:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4170:  WHERE ((s.id = showcase_media.showcase_id) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4181:  WHERE ((s.id = showcase_media.showcase_id) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4194:CREATE POLICY showcases_delete_internal ON public.showcases FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4201:CREATE POLICY showcases_insert_internal ON public.showcases FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4208:CREATE POLICY showcases_select_internal ON public.showcases FOR SELECT USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4217:CREATE POLICY showcases_update_internal ON public.showcases FOR UPDATE USING ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4219:  WHERE ((p.id = showcases.project_id) AND public.is_ws_admin(auth.uid(), p.workspace_id)))))) WITH CHECK ((public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4234:CREATE POLICY supplier_profile_select ON public.supplier_profile FOR SELECT USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4241:CREATE POLICY supplier_profile_update ON public.supplier_profile FOR UPDATE USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4260:  WHERE ((m.id = team_channel_message_attachments.message_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4279:CREATE POLICY team_channel_messages_delete ON public.team_channel_messages FOR DELETE USING (((author_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4297:  WHERE ((c.id = team_channel_messages.channel_id) AND public.is_yagi_internal_ws(c.workspace_id) AND (public.is_ws_member(auth.uid(), c.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4317:CREATE POLICY team_channels_insert ON public.team_channels FOR INSERT WITH CHECK ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4324:CREATE POLICY team_channels_select ON public.team_channels FOR SELECT USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4331:CREATE POLICY team_channels_update ON public.team_channels FOR UPDATE USING ((public.is_yagi_internal_ws(workspace_id) AND (public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4338:CREATE POLICY thread_attachments_hide_internal_from_clients ON public.thread_message_attachments AS RESTRICTIVE FOR SELECT TO authenticated USING ((public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4355:  WHERE ((tm.id = thread_message_attachments.message_id) AND ((tm.author_id = auth.uid()) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4377:  WHERE ((tm.id = thread_message_attachments.message_id) AND public.is_ws_member(auth.uid(), p.workspace_id) AND ((tm.visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4393:  WHERE ((t.id = thread_messages.thread_id) AND public.is_ws_member(auth.uid(), p.workspace_id)))) AND ((visibility = 'shared'::text) OR ((visibility = 'internal'::text) AND public.is_yagi_admin(auth.uid())))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4400:CREATE POLICY thread_msgs_hide_internal_from_clients ON public.thread_messages AS RESTRICTIVE FOR SELECT TO authenticated USING (((visibility = 'shared'::text) OR public.is_yagi_admin(auth.uid()) OR (author_id = auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4410:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4413:  WHERE ((t.id = thread_messages.thread_id) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid()))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4433:CREATE POLICY user_roles_read_self ON public.user_roles FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4454:CREATE POLICY user_roles_yagi_admin ON public.user_roles TO authenticated USING (public.is_yagi_admin(auth.uid())) WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4486:CREATE POLICY ws_delete_yagi ON public.workspaces FOR DELETE TO authenticated USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4493:CREATE POLICY ws_inv_read_admin ON public.workspace_invitations FOR SELECT TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4500:CREATE POLICY ws_inv_write_admin ON public.workspace_invitations TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4507:CREATE POLICY ws_members_delete_admin ON public.workspace_members FOR DELETE TO authenticated USING ((public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4514:CREATE POLICY ws_members_read ON public.workspace_members FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4523:  WHERE (m.workspace_id = workspace_members.workspace_id))))) OR public.is_ws_admin(auth.uid(), workspace_id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4530:CREATE POLICY ws_read_members ON public.workspaces FOR SELECT TO authenticated USING ((public.is_ws_member(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4537:CREATE POLICY ws_update_admin ON public.workspaces FOR UPDATE TO authenticated USING ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid()))) WITH CHECK ((public.is_ws_admin(auth.uid(), id) OR public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4607:  WHERE ((objects.name = ANY (d.storage_paths)) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4626:CREATE POLICY "preprod-frames delete internal" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4635:CREATE POLICY "preprod-frames read internal" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4644:CREATE POLICY "preprod-frames write internal" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'preprod-frames'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4655:  WHERE (((p.id)::text = (storage.foldername(objects.name))[1]) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4665:  WHERE ((pr.storage_path = objects.name) AND (public.is_ws_member(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4684:CREATE POLICY "showcase-media delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4691:CREATE POLICY "showcase-media read" ON storage.objects FOR SELECT TO authenticated USING (((bucket_id = 'showcase-media'::text) AND (public.is_yagi_admin(auth.uid()) OR (EXISTS ( SELECT 1
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4701:CREATE POLICY "showcase-media update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4708:CREATE POLICY "showcase-media write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-media'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4715:CREATE POLICY "showcase-og delete" ON storage.objects FOR DELETE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4722:CREATE POLICY "showcase-og update" ON storage.objects FOR UPDATE TO authenticated USING (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4729:CREATE POLICY "showcase-og write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (((bucket_id = 'showcase-og'::text) AND public.is_yagi_admin(auth.uid())));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4752:  WHERE (((p.id)::text = split_part(objects.name, '/'::text, 1)) AND (public.is_ws_admin(auth.uid(), p.workspace_id) OR public.is_yagi_admin(auth.uid())))))));
supabase/migrations\20260422120000_phase_2_0_baseline.sql:4768:CREATE POLICY thread_attachments_objects_hide_internal ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (((bucket_id <> 'thread-attachments'::text) OR public.is_yagi_admin(auth.uid()) OR (NOT (EXISTS ( SELECT 1
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:34:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:48:        AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:63:      OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:85:    AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260422130000_phase_1_9_medium_fixes.sql:96:    AND public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:275:  FOR SELECT USING (state <> 'draft' OR public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:278:  FOR INSERT WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:281:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:282:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:285:  FOR DELETE USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:288:-- owner UPDATE until closed; admin read/update via is_yagi_admin.
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:323:  FOR UPDATE USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:324:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:345:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:346:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:355:  FOR ALL USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030000_phase_2_5_challenge_platform.sql:356:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:11:--        trigger; admin bypasses via is_yagi_admin.
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:58:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:263:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:270:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:272:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:279:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030001_phase_2_5_g1_hardening.sql:281:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:37:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:42:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:48:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:49:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:61:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:67:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:68:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:72:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260423030002_phase_2_5_g1_hardening_v2.sql:94:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260424000000_phase_2_5_g2_handle_history.sql:53:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:37:  USING (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:53:  USING (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260424020000_phase_2_5_g8_hardening.sql:123:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260424030000_phase_2_5_g8_hardening_v2.sql:44:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260424040000_phase_2_5_g8_hardening_v3.sql:41:    IF NOT public.is_yagi_admin((select auth.uid())) THEN
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:145:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:168:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:172:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:188:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:235:  USING (public.is_yagi_admin((select auth.uid())))
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:236:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:263:  v_is_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260425000000_phase_2_7_commission_soft_launch.sql:337:  IF public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:195:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:211:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:248:  USING (public.is_yagi_admin((select auth.uid())))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:249:  WITH CHECK (public.is_yagi_admin((select auth.uid())));
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:265:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:286:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:307:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:324:          OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:337:    OR public.is_yagi_admin((select auth.uid()))
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:390:  v_is_yagi_admin boolean := false;
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:397:  v_is_yagi_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260426000000_phase_2_8_brief_board.sql:399:  IF v_is_yagi_admin THEN
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:18:-- default in supabase). Explicit auth check via is_ws_member / is_yagi_admin
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:72:    public.is_yagi_admin(v_caller)
supabase/migrations\20260427010000_phase_2_8_1_save_brief_version_rpc.sql:110:  'DEFINER with explicit is_ws_member / is_yagi_admin authorization mirroring '
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:67:  v_is_admin := public.is_yagi_admin(v_caller);
supabase/migrations\20260427020000_phase_2_8_1_commission_convert.sql:120:  IF NOT public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:382:  v_is_yagi_admin      boolean;
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:394:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:416:  IF v_is_yagi_admin THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:503:--   AND NOT is_yagi_admin(auth.uid())  -- yagi_admin admin console escape hatch
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:514:--   - yagi_admin: bypassed via is_yagi_admin() check for emergency fixes.
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:539:  IF public.is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:584:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:628:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:706:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427164421_phase_3_0_projects_lifecycle.sql:720:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:4:-- Finding: projects_insert policy WITH CHECK was (is_ws_admin OR is_yagi_admin)
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:32:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260427182456_phase_3_0_k05_fix_projects_insert_rls.sql:38:  'project submissions. is_yagi_admin path preserved for admin console creates.';
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:58:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:72:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428000000_phase_2_8_2_projects_soft_delete.sql:76:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:10:--     (is_ws_admin(...) OR is_yagi_admin(...))
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:21:--   is_ws_member / is_yagi_admin without checking projects.deleted_at.
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:43:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:50:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:97:    public.is_yagi_admin(v_caller)
supabase/migrations\20260428030000_phase_2_8_2_hardening_loop_1.sql:103:  IF v_deleted_at IS NOT NULL AND NOT public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:81:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:97:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428040000_phase_2_8_6_meetings_extend.sql:105:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:87:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:96:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:108:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:112:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:126:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428050000_phase_2_8_6_support_chat.sql:143:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:41:--   gains an is_yagi_admin guard in the same review loop.)
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:89:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:98:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:113:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:135:          public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:151:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:155:    public.is_yagi_admin(auth.uid())
supabase/migrations\20260428060000_phase_2_8_6_review_loop_1.sql:178:     AND NOT public.is_yagi_admin(auth.uid())
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:33:  USING (public.is_yagi_admin(auth.uid()))
supabase/migrations\20260428070000_phase_2_8_6_review_loop_2.sql:34:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260429113853_phase_3_1_project_board.sql:47:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:63:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:75:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:95:    is_yagi_admin(auth.uid())
supabase/migrations\20260429113853_phase_3_1_project_board.sql:166:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260429113853_phase_3_1_project_board.sql:193:  IF NOT is_yagi_admin(auth.uid()) THEN
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:49:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:144:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:232:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429144523_phase_3_1_hotfix_3_attachments.sql:309:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:41:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:124:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:202:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:269:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:322:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:371:    is_yagi_admin(auth.uid())
supabase/migrations\20260429151821_phase_3_1_hotfix_3_k05_loop_1_fixes.sql:385:    is_yagi_admin(auth.uid())
supabase/migrations\20260429151910_phase_3_1_hotfix_3_k05_loop_1_fix_url_jsonb.sql:37:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260504004349_phase_4_x_wave_c5d_sub03f_1_allow_board_assets_prefix.sql:61:  v_is_admin := is_yagi_admin(v_caller_id);
supabase/migrations\20260504010151_phase_4_x_wave_c5d_sub03f_5_seed_caller_bound_asset_index.sql:101:  IF NOT is_yagi_admin(v_caller_id) AND NOT EXISTS (
supabase/migrations\20260504031308_phase_4_x_wave_d_sub03g_F2_profile_role_transition_strict.sql:56:  IF public.is_yagi_admin(v_caller) THEN
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:6:-- permits is_ws_admin OR is_yagi_admin to UPDATE the workspaces row,
supabase/migrations\20260504031343_phase_4_x_wave_d_sub03g_F3_workspaces_kind_lockdown.sql:26:-- OR is_yagi_admin), so workspace admins can edit their own row's
supabase/migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:18:--   ELSIF v_is_yagi_admin THEN
supabase/migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:62:  v_is_yagi_admin      boolean;
supabase/migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:71:  v_is_yagi_admin := public.is_yagi_admin(v_actor_id);
supabase/migrations\20260504200001_phase_5_transition_project_status_creator_role.sql:95:  ELSIF v_is_yagi_admin THEN
supabase/migrations\20260505000000_phase_6_artist_profile.sql:85:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260505000000_phase_6_artist_profile.sql:93:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations\20260505000000_phase_6_artist_profile.sql:106:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260505000000_phase_6_artist_profile.sql:114:    OR public.is_yagi_admin(auth.uid())
supabase/migrations\20260505000000_phase_6_artist_profile.sql:120:  USING (public.is_yagi_admin(auth.uid()));

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"GRANT (ALL|SELECT|INSERT|UPDATE|DELETE).*public\\.|ALTER DEFAULT PRIVILEGES|GRANT USAGE ON SCHEMA public\" supabase/migrations/20260422120000_phase_2_0_baseline.sql | Select-Object -First 200" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$c = Get-Content -LiteralPath '"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$c[5200..5350]' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$c = Get-Content -LiteralPath '"'supabase/migrations/20260422120000_phase_2_0_baseline.sql'; "'$c[170..190]' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-05T08:44:22.772744Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.7 seconds
Output:

 exited 1 in 691ms:
 succeeded in 817ms:
    SET search_path TO 'public'
    AS $$
  select exists(select 1 from workspace_members where user_id = uid and workspace_id = wsid);
$$;


--
-- Name: is_yagi_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_yagi_admin(uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists(select 1 from user_roles where user_id = uid and role = 'yagi_admin');
$$;


--
-- Name: is_yagi_internal_ws(uuid); Type: FUNCTION; Schema: public; Owner: -
--

 succeeded in 845ms:
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/admin/artists/_actions/invite-artist.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/lib/auth/artist-onboarding-gate.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/layout.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 458ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 6 Wave A.3 ??completeArtistOnboardingAction
   5: //
   6: // The Artist completes the 1-step onboarding form by supplying their
   7: // Instagram handle. This is the only field required before they can access
   8: // the main app surface.
   9: //
  10: // Uses the regular user-scoped createSupabaseServer() client ??the
  11: // column GRANT from the A.1 migration allows authenticated users to
  12: // UPDATE (display_name, short_bio, instagram_handle, updated_at), and
  13: // the artist_profile_update RLS policy gates by workspace_members
  14: // membership, so no service-role bypass is needed here.
  15: //
  16: // Security posture (L-049 4-perspective audit):
  17: //   1. client (workspace_member of the Artist workspace) ??permitted
  18: //   2. ws_admin (different workspace)                   ??blocked by RLS USING
  19: //   3. yagi_admin                                        ??permitted via is_yagi_admin
  20: //   4. different-user same-workspace                    ??blocked by RLS USING
  21: //
  22: // Idempotency: if instagram_handle IS NOT NULL the caller has already
  23: // completed onboarding. We return 'forbidden' so a double-submit or
  24: // link re-visit does not silently overwrite the handle.
  25: // =============================================================================
  26: 
  27: import { z } from "zod";
  28: import { createSupabaseServer } from "@/lib/supabase/server";
  29: 
  30: const completeOnboardingInput = z.object({
  31:   instagramHandle: z
  32:     .string()
  33:     .trim()
  34:     .min(1)
  35:     .max(30)
  36:     // Strip leading @ if present ??store without @
  37:     .transform((v) => v.replace(/^@/, "")),
  38: });
  39: 
  40: export type CompleteArtistOnboardingResult =
  41:   | { ok: true }
  42:   | {
  43:       ok: false;
  44:       error:
  45:         | "validation"
  46:         | "unauthenticated"
  47:         | "no_artist_workspace"
  48:         | "forbidden"
  49:         | "db";
  50:       message?: string;
  51:     };
  52: 
  53: export async function completeArtistOnboardingAction(
  54:   input: unknown
  55: ): Promise<CompleteArtistOnboardingResult> {
  56:   // 1. Validate input
  57:   const parsed = completeOnboardingInput.safeParse(input);
  58:   if (!parsed.success) {
  59:     return { ok: false, error: "validation", message: parsed.error.message };
  60:   }
  61:   const { instagramHandle } = parsed.data;
  62: 
  63:   // 2. Authenticate caller
  64:   const supabase = await createSupabaseServer();
  65:   const {
  66:     data: { user },
  67:     error: authErr,
  68:   } = await supabase.auth.getUser();
  69:   if (authErr || !user) {
  70:     return { ok: false, error: "unauthenticated" };
  71:   }
  72: 
  73:   // 3. Resolve user's active artist workspace via workspace_members.
  74:   //    Per Phase 6 lock: a user has exactly one Artist workspace. We pick
  75:   //    the first member row whose workspace.kind = 'artist'.
  76:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
  77:   const sbAny = supabase as any;
  78:   const { data: memberRows, error: memberErr } = await sbAny
  79:     .from("workspace_members")
  80:     .select("workspace_id, workspace:workspaces(id, kind)")
  81:     .eq("user_id", user.id);
  82: 
  83:   if (memberErr) {
  84:     console.error("[completeArtistOnboardingAction] workspace query error:", memberErr);
  85:     return { ok: false, error: "db", message: memberErr.message };
  86:   }
  87: 
  88:   type MemberRow = {
  89:     workspace_id: string;
  90:     workspace: { id: string; kind: string } | null;
  91:   };
  92: 
  93:   const artistMember = (memberRows as MemberRow[] | null)?.find(
  94:     (r) => r.workspace?.kind === "artist"
  95:   );
  96: 
  97:   if (!artistMember) {
  98:     return { ok: false, error: "no_artist_workspace" };
  99:   }
 100: 
 101:   const workspaceId = artistMember.workspace_id;
 102: 
 103:   // 4. Fetch the artist_profile row; verify instagram_handle IS NULL (idempotency guard)
 104:   const { data: profile, error: profileFetchErr } = await supabase
 105:     .from("artist_profile")
 106:     .select("workspace_id, instagram_handle")
 107:     .eq("workspace_id", workspaceId)
 108:     .maybeSingle();
 109: 
 110:   if (profileFetchErr) {
 111:     console.error(
 112:       "[completeArtistOnboardingAction] artist_profile fetch error:",
 113:       profileFetchErr
 114:     );
 115:     return { ok: false, error: "db", message: profileFetchErr.message };
 116:   }
 117: 
 118:   if (!profile) {
 119:     // artist_profile row missing (shouldn't happen post-invite, but be explicit)
 120:     return { ok: false, error: "no_artist_workspace" };
 121:   }
 122: 
 123:   // Idempotency: if already set, onboarding is done
 124:   if (profile.instagram_handle !== null) {
 125:     return { ok: false, error: "forbidden" };
 126:   }
 127: 
 128:   // 5. UPDATE artist_profile SET instagram_handle = ... via user-scoped client.
 129:   //    Column GRANT + RLS UPDATE policy permit this for workspace_members.
 130:   const { error: updateErr } = await supabase
 131:     .from("artist_profile")
 132:     .update({
 133:       instagram_handle: instagramHandle,
 134:       updated_at: new Date().toISOString(),
 135:     })
 136:     .eq("workspace_id", workspaceId);
 137: 
 138:   if (updateErr) {
 139:     console.error(
 140:       "[completeArtistOnboardingAction] artist_profile update error:",
 141:       updateErr
 142:     );
 143:     return { ok: false, error: "db", message: updateErr.message };
 144:   }
 145: 
 146:   return { ok: true };
 147: }

 succeeded in 461ms:
   1: "use server";
   2: 
   3: // =============================================================================
   4: // Phase 6 Wave A.3 ??inviteArtistAction
   5: //
   6: // yagi_admin sends a magic-link invite to a prospective Artist, then
   7: // atomically creates the workspace, workspace_member, and artist_profile rows
   8: // so the Artist lands in a fully-provisioned state the moment they click
   9: // the link.
  10: //
  11: // Security posture (L-048 service-role + L-049 4-perspective audit):
  12: //   1. client role          ??forbidden (not yagi_admin)
  13: //   2. ws_admin role        ??forbidden (only yagi_admin gate passes)
  14: //   3. yagi_admin           ??permitted; service-role client bypasses RLS
  15: //   4. unauthenticated user ??unauthenticated (auth.getUser() returns null)
  16: //
  17: // The action's auth gate is the ONLY barrier between callers and the
  18: // service-role client. Authorization bugs here = anyone-invites-anyone.
  19: // =============================================================================
  20: 
  21: import { z } from "zod";
  22: import { createSupabaseServer } from "@/lib/supabase/server";
  23: import { createSupabaseService } from "@/lib/supabase/service";
  24: 
  25: const inviteArtistInput = z.object({
  26:   email: z.string().email(),
  27:   displayName: z.string().min(1).max(80),
  28:   shortBio: z.string().max(500).optional(),
  29: });
  30: 
  31: export type InviteArtistResult =
  32:   | { ok: true; workspaceId: string }
  33:   | {
  34:       ok: false;
  35:       error:
  36:         | "validation"
  37:         | "unauthenticated"
  38:         | "forbidden"
  39:         | "invite_failed"
  40:         | "db";
  41:       message?: string;
  42:     };
  43: 
  44: export async function inviteArtistAction(
  45:   input: unknown
  46: ): Promise<InviteArtistResult> {
  47:   // 1. Validate input
  48:   const parsed = inviteArtistInput.safeParse(input);
  49:   if (!parsed.success) {
  50:     return { ok: false, error: "validation", message: parsed.error.message };
  51:   }
  52:   const { email, displayName, shortBio } = parsed.data;
  53: 
  54:   // 2. Authenticate caller via user-scoped client
  55:   const supabase = await createSupabaseServer();
  56:   const {
  57:     data: { user },
  58:     error: authErr,
  59:   } = await supabase.auth.getUser();
  60:   if (authErr || !user) {
  61:     return { ok: false, error: "unauthenticated" };
  62:   }
  63: 
  64:   // 3. yagi_admin gate ??query user_roles for global yagi_admin role
  65:   //    (workspace_id IS NULL = global role, not workspace-scoped)
  66:   const { data: adminRoles, error: roleErr } = await supabase
  67:     .from("user_roles")
  68:     .select("role")
  69:     .eq("user_id", user.id)
  70:     .is("workspace_id", null)
  71:     .eq("role", "yagi_admin");
  72: 
  73:   if (roleErr) {
  74:     console.error("[inviteArtistAction] role check error:", roleErr);
  75:     return { ok: false, error: "db", message: roleErr.message };
  76:   }
  77:   if (!adminRoles || adminRoles.length === 0) {
  78:     return { ok: false, error: "forbidden" };
  79:   }
  80: 
  81:   // 4. Service-role client for RLS-bypass operations
  82:   //    (Supabase auth admin API + workspace/member/profile inserts)
  83:   const sbAdmin = createSupabaseService();
  84: 
  85:   // 5. Send magic-link invite via Supabase auth admin API
  86:   const siteUrl =
  87:     process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz";
  88:   const redirectTo = `${siteUrl}/auth/confirm?next=/app/projects`;
  89: 
  90:   const { data: inviteData, error: inviteErr } =
  91:     await sbAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });
  92: 
  93:   if (inviteErr || !inviteData.user) {
  94:     console.error("[inviteArtistAction] invite error:", inviteErr);
  95:     return {
  96:       ok: false,
  97:       error: "invite_failed",
  98:       message: inviteErr?.message ?? "invite returned no user",
  99:     };
 100:   }
 101: 
 102:   const invitedUserId = inviteData.user.id;
 103: 
 104:   // 6. Derive a URL-safe slug from displayName. Korean names collapse to a
 105:   //    uuid-based fallback so the INSERT never fails on slug uniqueness.
 106:   const slugBase = displayName
 107:     .toLowerCase()
 108:     .trim()
 109:     .replace(/[^a-z0-9]+/g, "-")
 110:     .replace(/^-+|-+$/g, "")
 111:     .slice(0, 40);
 112:   const slug = slugBase.length >= 3
 113:     ? slugBase
 114:     : `artist-${invitedUserId.slice(0, 8)}`;
 115: 
 116:   // 7. INSERT workspaces (kind='artist')
 117:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kind not always in generated types
 118:   const sbAny = sbAdmin as any;
 119:   const { data: wsData, error: wsErr } = await sbAny
 120:     .from("workspaces")
 121:     .insert({
 122:       kind: "artist",
 123:       name: displayName,
 124:       slug,
 125:       plan: "free",
 126:       brand_guide: {},
 127:     })
 128:     .select("id")
 129:     .single();
 130: 
 131:   if (wsErr || !wsData) {
 132:     console.error("[inviteArtistAction] workspace insert error:", wsErr);
 133:     // Best-effort: user was already invited; log orphan for manual cleanup
 134:     console.error(
 135:       "[inviteArtistAction] ORPHAN: auth user created but workspace insert failed",
 136:       { invitedUserId, email }
 137:     );
 138:     return {
 139:       ok: false,
 140:       error: "db",
 141:       message: wsErr?.message ?? "workspace insert returned no row",
 142:     };
 143:   }
 144: 
 145:   const workspaceId: string = wsData.id;
 146: 
 147:   // 8. INSERT workspace_members (role='admin' = primary owner role used by bootstrap_workspace)
 148:   const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
 149:     workspace_id: workspaceId,
 150:     user_id: invitedUserId,
 151:     role: "admin",
 152:     invited_by: user.id,
 153:     invited_at: new Date().toISOString(),
 154:   });
 155: 
 156:   if (memberErr) {
 157:     console.error("[inviteArtistAction] workspace_members insert error:", memberErr);
 158:     console.error(
 159:       "[inviteArtistAction] ORPHAN: workspace created but member insert failed",
 160:       { workspaceId, invitedUserId, email }
 161:     );
 162:     return { ok: false, error: "db", message: memberErr.message };
 163:   }
 164: 
 165:   // 9. INSERT artist_profile (instagram_handle = NULL per A.1 schema design)
 166:   const { error: profileErr } = await sbAdmin.from("artist_profile").insert({
 167:     workspace_id: workspaceId,
 168:     display_name: displayName,
 169:     short_bio: shortBio ?? null,
 170:     instagram_handle: null,
 171:     twin_status: "not_started",
 172:     visibility_mode: "paused",
 173:     auto_decline_categories: [],
 174:     bypass_brand_ids: [],
 175:   });
 176: 
 177:   if (profileErr) {
 178:     console.error("[inviteArtistAction] artist_profile insert error:", profileErr);
 179:     console.error(
 180:       "[inviteArtistAction] ORPHAN: workspace+member created but artist_profile insert failed",
 181:       { workspaceId, invitedUserId, email }
 182:     );
 183:     return { ok: false, error: "db", message: profileErr.message };
 184:   }
 185: 
 186:   return { ok: true, workspaceId };
 187: }

 succeeded in 433ms:
   1: // Phase 6 Wave A.3 ??Artist onboarding gate helper
   2: //
   3: // Called from src/app/[locale]/app/layout.tsx after the active workspace
   4: // is resolved. If the active workspace is kind='artist' and the artist_profile
   5: // row has instagram_handle IS NULL, the user has not completed onboarding
   6: // and MUST be redirected to /[locale]/onboarding/artist.
   7: //
   8: // Returns the redirect path string if a redirect is required, null otherwise.
   9: // The layout is responsible for calling redirect() ??this helper is pure.
  10: //
  11: // Layer: placed in /app/layout.tsx (the authenticated app shell), which
  12: // is the correct layer because:
  13: //   1. It runs on every page load under /[locale]/app/*, including /app/projects.
  14: //   2. It has access to the resolved active workspace (kind) already fetched
  15: //      for the sidebar switcher.
  16: //   3. The /[locale]/onboarding/artist route is OUTSIDE /app/* so the
  17: //      redirect breaks the gate loop.
  18: 
  19: import { createSupabaseServer } from "@/lib/supabase/server";
  20: import type { ActiveWorkspaceMembership } from "@/lib/workspace/active";
  21: 
  22: /**
  23:  * Returns the onboarding redirect path if the user must complete Artist
  24:  * onboarding, or null if no redirect is needed.
  25:  *
  26:  * @param activeWorkspace - The user's currently-active workspace (may be null)
  27:  * @param locale          - Current locale string (e.g. 'ko' or 'en')
  28:  */
  29: export async function checkArtistOnboardingGate(
  30:   activeWorkspace: ActiveWorkspaceMembership | null,
  31:   locale: string
  32: ): Promise<string | null> {
  33:   // Only relevant for Artist workspaces
  34:   if (!activeWorkspace || activeWorkspace.kind !== "artist") {
  35:     return null;
  36:   }
  37: 
  38:   // Fetch the artist_profile row to check instagram_handle
  39:   const supabase = await createSupabaseServer();
  40:   const { data: profile, error } = await supabase
  41:     .from("artist_profile")
  42:     .select("instagram_handle")
  43:     .eq("workspace_id", activeWorkspace.id)
  44:     .maybeSingle();
  45: 
  46:   if (error) {
  47:     console.error("[artistOnboardingGate] artist_profile fetch error:", error);
  48:     // On error, don't block the user ??let them through
  49:     return null;
  50:   }
  51: 
  52:   // instagram_handle IS NULL ??onboarding not completed
  53:   if (profile && profile.instagram_handle === null) {
  54:     return `/${locale}/onboarding/artist`;
  55:   }
  56: 
  57:   return null;
  58: }

 succeeded in 442ms:
   1: import { redirect } from "@/i18n/routing";
   2: import { fetchAppContext } from "@/lib/app/context";
   3: import { Sidebar, MobileSidebarSheet } from "@/components/app/sidebar";
   4: import {
   5:   resolveActiveWorkspace,
   6:   listOwnWorkspaces,
   7: } from "@/lib/workspace/active";
   8: import { NotificationBell } from "@/components/app/notification-bell";
   9: import { PageHelpLink } from "@/components/app/page-help-link";
  10: import { LanguageSwitcher } from "@/components/app/language-switcher";
  11: import { createSupabaseServer } from "@/lib/supabase/server";
  12: import { getUserScopes } from "@/lib/app/scopes";
  13: import { UserScopesProvider } from "@/lib/app/use-user-scopes";
  14: import { SupportWidget } from "@/components/support/support-widget";
  15: import { checkArtistOnboardingGate } from "@/lib/auth/artist-onboarding-gate";
  16: 
  17: export default async function AppLayout({
  18:   children,
  19:   params,
  20: }: {
  21:   children: React.ReactNode;
  22:   params: Promise<{ locale: string }>;
  23: }) {
  24:   const { locale } = await params;
  25: 
  26:   const supabase = await createSupabaseServer();
  27:   const {
  28:     data: { user },
  29:   } = await supabase.auth.getUser();
  30:   if (!user) redirect({ href: "/signin", locale });
  31: 
  32:   const ctx = await fetchAppContext();
  33:   if (!ctx) {
  34:     redirect({ href: "/onboarding", locale });
  35:     return null;
  36:   }
  37: 
  38:   const hasPrivilegedGlobalRole =
  39:     ctx.workspaceRoles.includes("yagi_admin") ||
  40:     ctx.workspaceRoles.includes("creator");
  41:   // Phase 2.7: client persona doesn't need a workspace; their primary
  42:   // surface is /app/commission.
  43:   const isClient = ctx.profile.role === "client";
  44:   if (ctx.workspaces.length === 0 && !hasPrivilegedGlobalRole && !isClient) {
  45:     redirect({ href: "/onboarding/workspace", locale });
  46:     return null;
  47:   }
  48: 
  49:   // Seed the bell with the current unread count. Realtime takes over from here.
  50:   const { count: initialUnreadCount } = await supabase
  51:     .from("notification_events")
  52:     .select("id", { count: "exact", head: true })
  53:     .eq("user_id", ctx.userId)
  54:     .is("in_app_seen_at", null);
  55: 
  56:   const bellLocale: "ko" | "en" = locale === "en" ? "en" : "ko";
  57: 
  58:   const scopes = getUserScopes(ctx);
  59: 
  60:   // Phase 4.x task_06 ??resolve active workspace + full membership list
  61:   // for the sidebar workspace switcher. resolveActiveWorkspace reads the
  62:   // 'yagi_active_workspace' cookie + validates membership; listOwnWorkspaces
  63:   // returns every workspace the user belongs to (with workspaces.kind, which
  64:   // null-safe-defaults to 'brand' until task_01 migration applies at Wave D).
  65:   const [activeWorkspace, allWorkspaces] = await Promise.all([
  66:     resolveActiveWorkspace(ctx.userId),
  67:     listOwnWorkspaces(ctx.userId),
  68:   ]);
  69: 
  70:   // Phase 6 Wave A.3 ??Artist onboarding gate.
  71:   // If the active workspace is kind='artist' and instagram_handle IS NULL,
  72:   // redirect to the 1-step onboarding page before the Artist reaches /app/*.
  73:   const onboardingRedirect = await checkArtistOnboardingGate(
  74:     activeWorkspace,
  75:     locale
  76:   );
  77:   if (onboardingRedirect) {
  78:     redirect({ href: "/onboarding/artist", locale });
  79:     return null;
  80:   }
  81: 
  82:   return (
  83:     <UserScopesProvider value={scopes}>
  84:       <div className="min-h-dvh flex">
  85:         <Sidebar
  86:           context={ctx}
  87:           activeWorkspace={activeWorkspace}
  88:           workspaces={allWorkspaces}
  89:         />
  90:         <div className="flex-1 min-w-0 flex flex-col">
  91:           <header className="flex items-center justify-between gap-2 h-12 px-4 border-b border-border">
  92:             <MobileSidebarSheet
  93:               context={ctx}
  94:               activeWorkspace={activeWorkspace}
  95:               workspaces={allWorkspaces}
  96:             />
  97:             <div className="flex-1" />
  98:             <PageHelpLink />
  99:             <LanguageSwitcher />
 100:             <NotificationBell
 101:               initialUnreadCount={initialUnreadCount ?? 0}
 102:               locale={bellLocale}
 103:             />
 104:           </header>
 105:           <main className="flex-1 min-w-0">
 106:             <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 w-full">
 107:               {children}
 108:             </div>
 109:           </main>
 110:         </div>
 111:         {/* Phase 2.8.6 ??workspace-scoped support chat. Hidden when
 112:             the user has no workspace (mid-onboarding edge case).
 113:             Wave C.5d sub_03e_3: workspaceId now reflects the cookie-
 114:             backed active workspace (resolved above for the sidebar)
 115:             instead of ctx.workspaces[0], so admins with multiple
 116:             memberships chat against the workspace they actually selected. */}
 117:         <SupportWidget
 118:           workspaceId={activeWorkspace?.id ?? null}
 119:           currentUserId={ctx.userId}
 120:           currentUserName={ctx.profile.display_name ?? ""}
 121:         />
 122:       </div>
 123:     </UserScopesProvider>
 124:   );
 125: }

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/app/[locale]/app/admin/artists/page.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/components/sidebar/workspace-switcher.tsx' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'src/lib/workspace/active.ts' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command '$i=1; Get-Content -LiteralPath '"'supabase/migrations/20260505000000_phase_6_artist_profile.sql' | ForEach-Object { '{0,4}: {1}' -f "'$i, $_; $i++ }' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 436ms:
   1: "use client";
   2: 
   3: // Phase 4.x task_06 ??Workspace switcher (sidebar top-left, dropdown).
   4: // Phase 6/A.2 ??artist kind support + yagi_admin-gated "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲?.
   5: //
   6: // Shape (KICKOFF section task_06):
   7: //   - Box: padding 8px 12px, radius 12, border subtle, bg surface
   8: //   - Click -> DropdownMenu opens
   9: //   - Groups: 釉뚮옖??/ ?꾪떚?ㅽ듃 / YAGI Admin
  10: //   - '+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? visible to yagi_admin only (isYagiAdmin prop)
  11: //   - Selecting a workspace calls setActiveWorkspaceAction (cookie set
  12: //     + revalidate) and triggers a soft refresh.
  13: //
  14: // Cross-tenant defense:
  15: //   - The list of workspaces is supplied by the server (props), already
  16: //     RLS-scoped by membership. The client cannot fetch foreign
  17: //     workspaces here.
  18: //   - On click, the server action re-validates membership before setting
  19: //     the cookie -- a tampered button click does not bypass.
  20: 
  21: import { useTransition } from "react";
  22: import { useRouter } from "next/navigation";
  23: import { useTranslations } from "next-intl";
  24: import { toast } from "sonner";
  25: import {
  26:   DropdownMenu,
  27:   DropdownMenuContent,
  28:   DropdownMenuGroup,
  29:   DropdownMenuItem,
  30:   DropdownMenuLabel,
  31:   DropdownMenuSeparator,
  32:   DropdownMenuTrigger,
  33: } from "@/components/ui/dropdown-menu";
  34: import { ChevronsUpDown, Check, Plus } from "lucide-react";
  35: import { cn } from "@/lib/utils";
  36: import { setActiveWorkspaceAction } from "@/lib/workspace/actions";
  37: 
  38: type WorkspaceKind = "brand" | "artist" | "yagi_admin";
  39: 
  40: export type WorkspaceItem = {
  41:   id: string;
  42:   name: string;
  43:   kind: WorkspaceKind;
  44: };
  45: 
  46: type Props = {
  47:   current: WorkspaceItem;
  48:   workspaces: WorkspaceItem[];
  49:   /** Phase 6/A.2 ??show "+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? only for yagi_admin */
  50:   isYagiAdmin?: boolean;
  51: };
  52: 
  53: export function WorkspaceSwitcher({ current, workspaces, isYagiAdmin = false }: Props) {
  54:   const t = useTranslations("workspace.switcher");
  55:   const router = useRouter();
  56:   const [isPending, startTransition] = useTransition();
  57: 
  58:   // Group by kind. Empty groups still render their label-less (we hide
  59:   // the section if it has 0 entries to keep Phase 4 dropdown clean -- only
  60:   // Brands shows up for users without artist/admin memberships).
  61:   const brands = workspaces.filter((w) => w.kind === "brand");
  62:   const artists = workspaces.filter((w) => w.kind === "artist");
  63:   const admins = workspaces.filter((w) => w.kind === "yagi_admin");
  64: 
  65:   function handleSelect(workspaceId: string) {
  66:     if (workspaceId === current.id) return;
  67:     startTransition(async () => {
  68:       const result = await setActiveWorkspaceAction(workspaceId);
  69:       if (result.ok) {
  70:         // The server action revalidates /app layout. router.refresh()
  71:         // ensures the current view re-renders with the new active
  72:         // workspace immediately.
  73:         router.refresh();
  74:       } else {
  75:         const errorKey =
  76:           result.error === "unauthenticated"
  77:             ? "errors.unauthenticated"
  78:             : result.error === "not_a_member"
  79:               ? "errors.not_a_member"
  80:               : "errors.invalid";
  81:         toast.error(t(errorKey));
  82:       }
  83:     });
  84:   }
  85: 
  86:   return (
  87:     <DropdownMenu>
  88:       <DropdownMenuTrigger
  89:         disabled={isPending}
  90:         className={cn(
  91:           "flex items-center gap-2 w-full rounded-xl border border-border/40 bg-card px-3 py-2 text-left text-sm",
  92:           "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  93:           "transition-colors",
  94:           isPending && "opacity-60",
  95:         )}
  96:       >
  97:         <span className="flex-1 truncate font-medium text-foreground keep-all">
  98:           {current.name}
  99:         </span>
 100:         <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
 101:       </DropdownMenuTrigger>
 102:       <DropdownMenuContent
 103:         align="start"
 104:         side="bottom"
 105:         sideOffset={6}
 106:         className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]"
 107:       >
 108:         {brands.length > 0 && (
 109:           <DropdownMenuGroup>
 110:             <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
 111:               {t("brands_group")}
 112:             </DropdownMenuLabel>
 113:             {brands.map((w) => (
 114:               <Row
 115:                 key={w.id}
 116:                 workspace={w}
 117:                 isCurrent={w.id === current.id}
 118:                 onSelect={() => handleSelect(w.id)}
 119:               />
 120:             ))}
 121:           </DropdownMenuGroup>
 122:         )}
 123:         {artists.length > 0 && (
 124:           <>
 125:             <DropdownMenuSeparator />
 126:             <DropdownMenuGroup>
 127:               <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
 128:                 {t("artists_group")}
 129:               </DropdownMenuLabel>
 130:               {artists.map((w) => (
 131:                 <Row
 132:                   key={w.id}
 133:                   workspace={w}
 134:                   isCurrent={w.id === current.id}
 135:                   onSelect={() => handleSelect(w.id)}
 136:                 />
 137:               ))}
 138:             </DropdownMenuGroup>
 139:           </>
 140:         )}
 141:         {admins.length > 0 && (
 142:           <>
 143:             <DropdownMenuSeparator />
 144:             <DropdownMenuGroup>
 145:               <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
 146:                 {t("admin_group")}
 147:               </DropdownMenuLabel>
 148:               {admins.map((w) => (
 149:                 <Row
 150:                   key={w.id}
 151:                   workspace={w}
 152:                   isCurrent={w.id === current.id}
 153:                   onSelect={() => handleSelect(w.id)}
 154:                 />
 155:               ))}
 156:             </DropdownMenuGroup>
 157:           </>
 158:         )}
 159:         {/* Phase 6/A.2 ??"+ ???뚰겕?ㅽ럹?댁뒪 留뚮뱾湲? is yagi_admin only.
 160:             Non-admin users (Artist / Brand) must not see this item. */}
 161:         {isYagiAdmin && (
 162:           <>
 163:             <DropdownMenuSeparator />
 164:             <DropdownMenuItem disabled className="opacity-60">
 165:               <Plus className="h-3.5 w-3.5" />
 166:               <span className="text-sm">{t("add_new")}</span>
 167:             </DropdownMenuItem>
 168:           </>
 169:         )}
 170:       </DropdownMenuContent>
 171:     </DropdownMenu>
 172:   );
 173: }
 174: 
 175: function Row({
 176:   workspace,
 177:   isCurrent,
 178:   onSelect,
 179: }: {
 180:   workspace: WorkspaceItem;
 181:   isCurrent: boolean;
 182:   onSelect: () => void;
 183: }) {
 184:   return (
 185:     <DropdownMenuItem
 186:       onSelect={(event) => {
 187:         event.preventDefault();
 188:         onSelect();
 189:       }}
 190:       className="flex items-center gap-2"
 191:     >
 192:       <span className="flex-1 truncate text-sm keep-all">{workspace.name}</span>
 193:       {isCurrent && (
 194:         <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
 195:       )}
 196:     </DropdownMenuItem>
 197:   );
 198: }

 succeeded in 442ms:
   1: // Phase 6 Wave A.3 ??/admin/artists
   2: //
   3: // Shows the full ?뚯냽 ?꾪떚?ㅽ듃 list with status column:
   4: //   ??invite ?꾨즺  ??magic-link sent but email_confirmed_at IS NULL
   5: //   ??onboarding   ??email confirmed but instagram_handle IS NULL
   6: //   ???쒖꽦          ??email confirmed + instagram_handle set
   7: //
   8: // Page-level auth gate: notFound() for any non-yagi_admin caller.
   9: // The parent admin/layout.tsx already redirects non-admins, but we
  10: // add an explicit notFound() here as a defence-in-depth layer (per spec).
  11: 
  12: import { notFound } from "next/navigation";
  13: import { getTranslations } from "next-intl/server";
  14: import { createSupabaseServer } from "@/lib/supabase/server";
  15: import { createSupabaseService } from "@/lib/supabase/service";
  16: import { InviteArtistSection } from "./_components/invite-artist-section";
  17: 
  18: type Props = {
  19:   params: Promise<{ locale: string }>;
  20: };
  21: 
  22: type ArtistRow = {
  23:   workspaceId: string;
  24:   workspaceName: string;
  25:   displayName: string | null;
  26:   email: string;
  27:   instagramHandle: string | null;
  28:   createdAt: string;
  29:   emailConfirmedAt: string | null;
  30: };
  31: 
  32: function statusKey(row: ArtistRow): "invite_pending" | "onboarding" | "active" {
  33:   if (!row.emailConfirmedAt) return "invite_pending";
  34:   if (!row.instagramHandle) return "onboarding";
  35:   return "active";
  36: }
  37: 
  38: export default async function AdminArtistsPage({ params }: Props) {
  39:   const { locale } = await params;
  40: 
  41:   // Auth gate ??notFound for non-yagi_admin
  42:   const supabase = await createSupabaseServer();
  43:   const {
  44:     data: { user },
  45:   } = await supabase.auth.getUser();
  46:   if (!user) notFound();
  47: 
  48:   const { data: roles } = await supabase
  49:     .from("user_roles")
  50:     .select("role")
  51:     .eq("user_id", user.id)
  52:     .is("workspace_id", null)
  53:     .eq("role", "yagi_admin");
  54: 
  55:   if (!roles || roles.length === 0) notFound();
  56: 
  57:   const t = await getTranslations("admin_artists");
  58: 
  59:   // Fetch all artist workspaces + profiles via service-role client
  60:   // (artist_profile has RLS SELECT gated to workspace_members + yagi_admin;
  61:   //  yagi_admin check uses is_yagi_admin RLS function. Using service-role
  62:   //  here avoids the RPC function call overhead in a list query.)
  63:   const sbAdmin = createSupabaseService();
  64:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types
  65:   const sbAny = sbAdmin as any;
  66: 
  67:   const { data: profileRows, error: profileErr } = await sbAny
  68:     .from("artist_profile")
  69:     .select(
  70:       `
  71:       workspace_id,
  72:       display_name,
  73:       instagram_handle,
  74:       created_at,
  75:       workspace:workspaces(id, name),
  76:       member:workspace_members(user_id)
  77:     `
  78:     )
  79:     .order("created_at", { ascending: false });
  80: 
  81:   if (profileErr) {
  82:     console.error("[AdminArtistsPage] artist_profile fetch error:", profileErr);
  83:   }
  84: 
  85:   type RawProfile = {
  86:     workspace_id: string;
  87:     display_name: string | null;
  88:     instagram_handle: string | null;
  89:     created_at: string;
  90:     workspace: { id: string; name: string } | null;
  91:     member: { user_id: string }[] | null;
  92:   };
  93: 
  94:   const profiles: RawProfile[] = profileRows ?? [];
  95: 
  96:   // Collect user_ids for auth lookup
  97:   const userIds = profiles
  98:     .map((p) => p.member?.[0]?.user_id)
  99:     .filter((id): id is string => typeof id === "string");
 100: 
 101:   // Fetch auth users in bulk to get email + email_confirmed_at
 102:   const authUserMap = new Map<
 103:     string,
 104:     { email: string; email_confirmed_at: string | null }
 105:   >();
 106: 
 107:   if (userIds.length > 0) {
 108:     const { data: usersPage, error: usersErr } =
 109:       await sbAdmin.auth.admin.listUsers({ perPage: 1000 });
 110: 
 111:     if (usersErr) {
 112:       console.error("[AdminArtistsPage] auth.admin.listUsers error:", usersErr);
 113:     } else {
 114:       for (const u of usersPage.users) {
 115:         if (userIds.includes(u.id)) {
 116:           authUserMap.set(u.id, {
 117:             email: u.email ?? "",
 118:             email_confirmed_at: u.email_confirmed_at ?? null,
 119:           });
 120:         }
 121:       }
 122:     }
 123:   }
 124: 
 125:   // Build display rows
 126:   const artists: ArtistRow[] = profiles.map((p) => {
 127:     const userId = p.member?.[0]?.user_id ?? "";
 128:     const authInfo = authUserMap.get(userId);
 129:     return {
 130:       workspaceId: p.workspace_id,
 131:       workspaceName: p.workspace?.name ?? p.display_name ?? "??,
 132:       displayName: p.display_name,
 133:       email: authInfo?.email ?? "??,
 134:       instagramHandle: p.instagram_handle,
 135:       createdAt: p.created_at,
 136:       emailConfirmedAt: authInfo?.email_confirmed_at ?? null,
 137:     };
 138:   });
 139: 
 140:   return (
 141:     <div className="px-10 py-12 max-w-5xl space-y-10">
 142:       {/* Header */}
 143:       <div>
 144:         <h1 className="font-display text-4xl md:text-5xl tracking-tight leading-[1.05] mb-1 keep-all">
 145:           {t("title")}
 146:         </h1>
 147:       </div>
 148: 
 149:       {/* Invite section */}
 150:       <InviteArtistSection t_invite_cta={t("invite_cta")} />
 151: 
 152:       {/* Artist table */}
 153:       <section>
 154:         <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
 155:           {t("table_heading")}
 156:         </h2>
 157: 
 158:         {artists.length === 0 ? (
 159:           <p className="text-sm text-muted-foreground py-4">{t("table_empty")}</p>
 160:         ) : (
 161:           <div className="border border-border rounded-lg overflow-hidden">
 162:             <table className="w-full text-sm">
 163:               <thead>
 164:                 <tr className="border-b border-border bg-muted/30">
 165:                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
 166:                     {t("column_name")}
 167:                   </th>
 168:                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
 169:                     {t("column_email")}
 170:                   </th>
 171:                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
 172:                     {t("column_instagram")}
 173:                   </th>
 174:                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
 175:                     {t("column_joined_at")}
 176:                   </th>
 177:                   <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
 178:                     {t("column_status")}
 179:                   </th>
 180:                 </tr>
 181:               </thead>
 182:               <tbody>
 183:                 {artists.map((artist) => {
 184:                   const sk = statusKey(artist);
 185:                   return (
 186:                     <tr
 187:                       key={artist.workspaceId}
 188:                       className="border-b border-border last:border-0 hover:bg-accent/50 transition-colors"
 189:                     >
 190:                       <td className="px-4 py-3 font-medium keep-all">
 191:                         {artist.displayName ?? "??}
 192:                       </td>
 193:                       <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-[12px]">
 194:                         {artist.email}
 195:                       </td>
 196:                       <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-[12px]">
 197:                         {artist.instagramHandle ? `@${artist.instagramHandle}` : "??}
 198:                       </td>
 199:                       <td className="px-4 py-3 tabular-nums text-[12px] text-muted-foreground hidden md:table-cell">
 200:                         {new Intl.DateTimeFormat(locale, {
 201:                           year: "numeric",
 202:                           month: "short",
 203:                           day: "numeric",
 204:                         }).format(new Date(artist.createdAt))}
 205:                       </td>
 206:                       <td className="px-4 py-3 text-[12px]">
 207:                         {sk === "invite_pending" && (
 208:                           <span className="text-muted-foreground">
 209:                             {t("status_invite_pending")}
 210:                           </span>
 211:                         )}
 212:                         {sk === "onboarding" && (
 213:                           <span className="text-amber-600 dark:text-amber-400">
 214:                             {t("status_onboarding")}
 215:                           </span>
 216:                         )}
 217:                         {sk === "active" && (
 218:                           <span className="text-[#71D083]">
 219:                             {t("status_active")}
 220:                           </span>
 221:                         )}
 222:                       </td>
 223:                     </tr>
 224:                   );
 225:                 })}
 226:               </tbody>
 227:             </table>
 228:           </div>
 229:         )}
 230:       </section>
 231:     </div>
 232:   );
 233: }

 succeeded in 446ms:
   1: // Phase 4.x task_06 ??Active workspace resolver.
   2: //
   3: // Decision lock-in (_decisions_locked.md section 2): cookie-based.
   4: // The cookie 'yagi_active_workspace' carries a uuid. Every server-side
   5: // page render that needs the active workspace must validate the
   6: // cookie's uuid against workspace_members for the current user, then
   7: // fall back to the first membership if invalid or absent.
   8: //
   9: // Cookie tampering is fully defended:
  10: //   1. The cookie value is not trusted -- we always re-check
  11: //      workspace_members membership on the server.
  12: //   2. If the cookie's uuid is not a valid membership for this user,
  13: //      we ignore it and use first-member fallback. (We do NOT trust
  14: //      the cookie even for read-only display.)
  15: //
  16: // Phase 4 caveat: workspaces.kind column is added by task_01 migration
  17: // (Wave D D.1 apply). Until apply, the SELECT returns undefined for
  18: // kind; we coerce to 'brand' (matches task_01 UPDATE that sets every
  19: // existing row to 'brand'). Post-apply, kind is one of 3 enum values.
  20: 
  21: import { cookies } from "next/headers";
  22: import { createSupabaseServer } from "@/lib/supabase/server";
  23: 
  24: export type WorkspaceKind = "brand" | "artist" | "yagi_admin";
  25: 
  26: export type ActiveWorkspaceMembership = {
  27:   id: string;
  28:   name: string;
  29:   kind: WorkspaceKind;
  30: };
  31: 
  32: export const ACTIVE_WORKSPACE_COOKIE = "yagi_active_workspace";
  33: 
  34: const UUID_RE =
  35:   /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  36: 
  37: function narrowKind(value: unknown): WorkspaceKind {
  38:   if (value === "brand" || value === "artist" || value === "yagi_admin") {
  39:     return value;
  40:   }
  41:   return "brand";
  42: }
  43: 
  44: /**
  45:  * Returns the user's workspace memberships, joined with workspace name + kind.
  46:  * Used by the workspace switcher dropdown to render full lists. The active
  47:  * one is found by `id === activeWorkspaceId`.
  48:  *
  49:  * Cross-tenant guard: the SELECT joins through workspace_members for the
  50:  * caller's user_id, so RLS scopes naturally. workspaces RLS already gates
  51:  * SELECT to members.
  52:  */
  53: export async function listOwnWorkspaces(
  54:   userId: string,
  55: ): Promise<ActiveWorkspaceMembership[]> {
  56:   const supabase = await createSupabaseServer();
  57:   // workspaces.kind not in generated types yet (Wave D D.1 apply -> regen).
  58:   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- workspaces.kind not in generated types yet
  59:   const sb = supabase as any;
  60:   const { data: rows } = (await sb
  61:     .from("workspace_members")
  62:     .select(
  63:       `
  64:       workspace_id,
  65:       created_at,
  66:       workspace:workspaces ( id, name, kind )
  67:     `,
  68:     )
  69:     .eq("user_id", userId)
  70:     .order("created_at", { ascending: true })) as {
  71:     data:
  72:       | {
  73:           workspace_id: string;
  74:           workspace: { id: string; name: string; kind?: string } | null;
  75:         }[]
  76:       | null;
  77:   };
  78: 
  79:   const list: ActiveWorkspaceMembership[] = [];
  80:   for (const r of rows ?? []) {
  81:     if (!r.workspace) continue;
  82:     list.push({
  83:       id: r.workspace.id,
  84:       name: r.workspace.name,
  85:       kind: narrowKind(r.workspace.kind),
  86:     });
  87:   }
  88:   return list;
  89: }
  90: 
  91: /**
  92:  * Resolve the user's currently-active workspace. Reads the
  93:  * 'yagi_active_workspace' cookie, validates membership against
  94:  * workspace_members, and falls back when the cookie is absent,
  95:  * malformed, or doesn't correspond to a valid membership.
  96:  *
  97:  * Phase 6/A.2 ??Artist sign-in default:
  98:  * When no valid cookie exists, prefer the user's most-recently-joined
  99:  * Artist workspace over the simple first-membership fallback. This
 100:  * ensures Artist users land in their own Artist workspace by default
 101:  * rather than a Brand workspace they may also belong to.
 102:  * listOwnWorkspaces returns memberships ordered by created_at ASC, so
 103:  * we scan in reverse to pick the most recently joined artist workspace.
 104:  *
 105:  * Returns null when the user has no workspace memberships at all
 106:  * (caller should redirect to /onboarding).
 107:  */
 108: export async function resolveActiveWorkspace(
 109:   userId: string,
 110: ): Promise<ActiveWorkspaceMembership | null> {
 111:   const memberships = await listOwnWorkspaces(userId);
 112:   if (memberships.length === 0) return null;
 113: 
 114:   const cookieStore = await cookies();
 115:   const cookieValue = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
 116: 
 117:   if (cookieValue && UUID_RE.test(cookieValue)) {
 118:     const match = memberships.find((m) => m.id === cookieValue);
 119:     if (match) return match;
 120:     // Fall through to default selection. We deliberately do NOT attempt
 121:     // to clear the cookie here -- this resolver is read-only (cookies()
 122:     // in next/headers is read in server components). The
 123:     // setActiveWorkspace server action is the only writer; if a stale
 124:     // cookie keeps arriving here, the resolver silently falls back
 125:     // without leaking which workspace_id the user does NOT belong to.
 126:   }
 127: 
 128:   // Phase 6/A.2 ??Artist sign-in default: prefer the most-recently-joined
 129:   // Artist workspace so Artist users enter their own workspace by default.
 130:   // listOwnWorkspaces orders by created_at ASC; we want most-recent,
 131:   // so iterate in reverse.
 132:   for (let i = memberships.length - 1; i >= 0; i--) {
 133:     if (memberships[i].kind === "artist") return memberships[i];
 134:   }
 135: 
 136:   return memberships[0];
 137: }

 succeeded in 459ms:
   1: -- Phase 6 Wave A.1 ??artist_profile table.
   2: --
   3: -- Per KICKOFF.md 짠"A.1 Schema migration: artist_profile" + L-019 pre-flight
   4: -- (verified 2026-05-05 via mcp execute_sql: 0 existing artist-kind workspaces,
   5: -- artist_profile table absent).
   6: --
   7: -- Design intent (from PRODUCT-MASTER 짠K + 짠L):
   8: --   - Phase 6 captures the columns; UI for the?껈솏 dial (visibility_mode /
   9: --     auto_decline_categories / bypass_brand_ids) lands in Phase 8 Wave E.
  10: --   - twin_status starts at 'not_started' for every Artist; the R2 upload
  11: --     pipeline that flips it to 'training' / 'active' is Phase 7+.
  12: --   - instagram_handle is nullable at INSERT (yagi_admin invite) but the
  13: --     Phase 6 onboarding gate (Wave A.3) blocks /[locale]/app/* until the
  14: --     Artist completes the 1-step onboarding form. Application-layer
  15: --     enforcement, not DB NOT NULL, so admin tooling can re-import legacy
  16: --     accounts without backfill.
  17: --
  18: -- RLS posture:
  19: --   - SELECT: Artist (workspace_member) + yagi_admin
  20: --   - INSERT: yagi_admin only (Artist self-invite blocked)
  21: --   - UPDATE: Artist + yagi_admin (RLS), but column-level GRANT lockdown
  22: --     restricts Artist to (display_name, short_bio, instagram_handle,
  23: --     updated_at) only ??twin_status / visibility_mode / bypass_brand_ids /
  24: --     auto_decline_categories are admin-write through service-role tooling.
  25: --   - DELETE: yagi_admin only
  26: --
  27: -- L-049 4-perspective audit (binding from codex-review-protocol.md):
  28: --   1. As `client` (auth.uid() = workspace_member, no admin role) ??--      SELECT/UPDATE allowed for own row; INSERT denied (yagi_admin gate);
  29: --      DELETE denied; column GRANT restricts UPDATE to display fields only.
  30: --   2. As `ws_admin` ??same as client (no special policy branch); cannot
  31: --      INSERT or DELETE; UPDATE restricted by column GRANT.
  32: --   3. As `yagi_admin` ??full SELECT/INSERT/UPDATE/DELETE through RLS
  33: --      bypass functions. Service-role client used in admin tooling.
  34: --   4. As different-user same-workspace ??RLS USING (workspace_member
  35: --      JOIN) denies row read/write since membership predicate fails.
  36: 
  37: CREATE TABLE artist_profile (
  38:   workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  39:   -- Twin asset metadata (Phase 6 = column only; pipeline = Phase 7+)
  40:   twin_status text NOT NULL DEFAULT 'not_started'
  41:     CHECK (twin_status IN ('not_started', 'training', 'active', 'paused')),
  42:   twin_r2_prefix text,
  43:   -- Permission dials (Phase 6 = column only; UI = Phase 8 Wave E)
  44:   auto_decline_categories text[] NOT NULL DEFAULT '{}',
  45:   visibility_mode text NOT NULL DEFAULT 'paused'
  46:     CHECK (visibility_mode IN ('open', 'paused')),
  47:   bypass_brand_ids uuid[] NOT NULL DEFAULT '{}',
  48:   -- Display
  49:   display_name text,
  50:   short_bio text,
  51:   -- Instagram handle ??nullable at INSERT (admin invite); onboarding gate
  52:   -- enforces NOT NULL before /[locale]/app/* access (application layer)
  53:   instagram_handle text,
  54:   -- Meta
  55:   activated_at timestamptz,
  56:   created_at timestamptz NOT NULL DEFAULT now(),
  57:   updated_at timestamptz NOT NULL DEFAULT now()
  58: );
  59: 
  60: COMMENT ON TABLE artist_profile IS
  61:   'Phase 6 Wave A.1 ??Artist workspace profile (1:1 with workspaces.kind = artist). '
  62:   'Twin asset metadata + permission dials + display fields. Admin-write columns '
  63:   '(twin_status / visibility_mode / bypass_brand_ids / auto_decline_categories) '
  64:   'are protected via column-level GRANT lockdown.';
  65: 
  66: CREATE INDEX idx_artist_profile_visibility ON artist_profile(visibility_mode)
  67:   WHERE visibility_mode = 'open';
  68: 
  69: -- ---------------------------------------------------------------------------
  70: -- RLS
  71: -- ---------------------------------------------------------------------------
  72: 
  73: ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;
  74: 
  75: -- SELECT: Artist (workspace_member) + yagi_admin
  76: CREATE POLICY artist_profile_select ON artist_profile
  77:   FOR SELECT TO authenticated
  78:   USING (
  79:     EXISTS (
  80:       SELECT 1 FROM workspace_members
  81:       WHERE workspace_id = artist_profile.workspace_id
  82:         AND user_id = auth.uid()
  83:     )
  84:     OR public.is_yagi_admin(auth.uid())
  85:   );
  86: 
  87: -- INSERT: yagi_admin only. Artist self-invite is blocked at the policy
  88: -- layer; admin tooling uses service-role client to bypass RLS while
  89: -- still subject to application-layer guard (inviteArtistAction in A.3).
  90: CREATE POLICY artist_profile_insert ON artist_profile
  91:   FOR INSERT TO authenticated
  92:   WITH CHECK (public.is_yagi_admin(auth.uid()));
  93: 
  94: -- UPDATE: Artist (workspace_member) for the display columns granted
  95: -- below + yagi_admin for everything. Column GRANT lockdown enforces
  96: -- the restriction for non-admin callers.
  97: CREATE POLICY artist_profile_update ON artist_profile
  98:   FOR UPDATE TO authenticated
  99:   USING (
 100:     EXISTS (
 101:       SELECT 1 FROM workspace_members
 102:       WHERE workspace_id = artist_profile.workspace_id
 103:         AND user_id = auth.uid()
 104:     )
 105:     OR public.is_yagi_admin(auth.uid())
 106:   )
 107:   WITH CHECK (
 108:     EXISTS (
 109:       SELECT 1 FROM workspace_members
 110:       WHERE workspace_id = artist_profile.workspace_id
 111:         AND user_id = auth.uid()
 112:     )
 113:     OR public.is_yagi_admin(auth.uid())
 114:   );
 115: 
 116: -- DELETE: yagi_admin only
 117: CREATE POLICY artist_profile_delete ON artist_profile
 118:   FOR DELETE TO authenticated
 119:   USING (public.is_yagi_admin(auth.uid()));
 120: 
 121: -- ---------------------------------------------------------------------------
 122: -- Column-level GRANT lockdown (sub_03f_2 / sub_5 pattern, L-048)
 123: --
 124: -- REVOKE all UPDATE from authenticated, then re-GRANT only the columns
 125: -- the Artist is allowed to mutate (display_name / short_bio /
 126: -- instagram_handle / updated_at). Admin-write columns (twin_status /
 127: -- visibility_mode / bypass_brand_ids / auto_decline_categories /
 128: -- twin_r2_prefix / activated_at) require service-role client.
 129: -- ---------------------------------------------------------------------------
 130: 
 131: REVOKE UPDATE ON artist_profile FROM authenticated;
 132: GRANT UPDATE (display_name, short_bio, instagram_handle, updated_at)
 133:   ON artist_profile TO authenticated;
 134: 
 135: -- Verification block ??fail apply if the column grant matrix drifts.
 136: DO $$
 137: BEGIN
 138:   -- Authenticated must NOT have table-level UPDATE (column-level only)
 139:   IF has_table_privilege('authenticated', 'public.artist_profile', 'UPDATE') THEN
 140:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated has table-level UPDATE on artist_profile';
 141:   END IF;
 142: 
 143:   -- Authenticated MUST have UPDATE on the 4 display columns
 144:   IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'display_name', 'UPDATE') THEN
 145:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on display_name';
 146:   END IF;
 147:   IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'short_bio', 'UPDATE') THEN
 148:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on short_bio';
 149:   END IF;
 150:   IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'instagram_handle', 'UPDATE') THEN
 151:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on instagram_handle';
 152:   END IF;
 153:   IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'updated_at', 'UPDATE') THEN
 154:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated lost UPDATE on updated_at';
 155:   END IF;
 156: 
 157:   -- Authenticated must NOT have UPDATE on admin-write columns
 158:   IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_status', 'UPDATE') THEN
 159:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on twin_status';
 160:   END IF;
 161:   IF has_column_privilege('authenticated', 'public.artist_profile', 'visibility_mode', 'UPDATE') THEN
 162:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on visibility_mode';
 163:   END IF;
 164:   IF has_column_privilege('authenticated', 'public.artist_profile', 'bypass_brand_ids', 'UPDATE') THEN
 165:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on bypass_brand_ids';
 166:   END IF;
 167:   IF has_column_privilege('authenticated', 'public.artist_profile', 'auto_decline_categories', 'UPDATE') THEN
 168:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on auto_decline_categories';
 169:   END IF;
 170:   IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_r2_prefix', 'UPDATE') THEN
 171:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on twin_r2_prefix';
 172:   END IF;
 173:   IF has_column_privilege('authenticated', 'public.artist_profile', 'activated_at', 'UPDATE') THEN
 174:     RAISE EXCEPTION 'A.1 column grant assert failed: authenticated still has UPDATE on activated_at';
 175:   END IF;
 176: END $$;

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/auth/confirm/route.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/auth/callback/route.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/middleware.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 352ms:
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const intlMiddleware = createMiddleware(routing);

// Phase 4.x task_05 ??/app/commission/* -> /app/projects redirect.
// Phase 2.x leftover surface; Phase 4 funnels all client intake through
// /app/projects. Open-redirect protection: we drop ALL query params
// (specifically `?next=https://evil.com` is ignored) and target a
// fixed in-app path.
//
// Matches both locale-prefixed and locale-free forms; the locale-free
// case targets the routing default locale.
const COMMISSION_WITH_LOCALE = /^\/(ko|en)\/app\/commission(?:\/.*)?$/;
const COMMISSION_NO_LOCALE = /^\/app\/commission(?:\/.*)?$/;

function maybeRedirectCommission(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  const localedMatch = path.match(COMMISSION_WITH_LOCALE);
  if (localedMatch) {
    const locale = localedMatch[1];
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/app/projects`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  if (COMMISSION_NO_LOCALE.test(path)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${routing.defaultLocale}/app/projects`;
    url.search = "";
    return NextResponse.redirect(url, 308);
  }
  return null;
}

export default async function middleware(request: NextRequest) {
  const commissionRedirect = maybeRedirectCommission(request);
  if (commissionRedirect) return commissionRedirect;

  const response = intlMiddleware(request);
  return updateSupabaseSession(request, response);
}

export const config = {
  matcher: [
    // Skip: Next.js internals, Vercel internals, API, auth callback, locale-free
    // public surfaces (showcase, challenges), static files.
    //
    // Phase 2.1 G6 #5/#6 ??added `showcase` and `challenges` to the negative
    // lookahead so the locale-free public routes at src/app/showcase/[slug]/
    // and src/app/challenges/ (Phase 2.5) are NOT prefixed with a locale by
    // next-intl. Previously `/showcase/<slug>` was being redirected to
    // `/{defaultLocale}/showcase/<slug>` which matched no route, falling
    // back to Next's default 404 and making the custom not-found.tsx
    // unreachable (and the Phase 2.0 G6 L5 html/body shell fix inert).
    // Phase 4.x Wave C.5b sub_02 ??`u` removed (creator handle profile
    // tree at /u/<handle> is gone). Keeping it in the exclude was a
    // forward-leak from the deleted Phase 2.5 surface.
    // Phase 4.x Wave C.5c sub_01 ??`auth/confirm` added (PKCE
    // intermediate verify endpoint; same locale-free shape as
    // auth/callback).
    "/((?!api|_next|_vercel|auth/callback|auth/confirm|showcase|challenges|.*\\..*).*)",
  ],
};

 succeeded in 375ms:
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5b sub_04 ??expired-OTP detection. Supabase reports
// expiry via either the `error_description` query param on the redirect
// (PKCE error path) or as `exchangeCodeForSession` failure with a
// message containing one of these markers.
const EXPIRY_MARKERS = ["otp_expired", "otp expired", "code expired", "expired", "invalid_grant"];
function isExpiryError(message: string): boolean {
  const lower = message.toLowerCase();
  return EXPIRY_MARKERS.some((marker) => lower.includes(marker));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCodeParam = searchParams.get("error_code");
  const errorDescParam = searchParams.get("error_description");

  // Supabase Auth redirects expired/invalid links here with the failure
  // surfaced as query params instead of a `code`. Bounce to /auth/expired
  // before doing any other work.
  if (errorParam || errorCodeParam) {
    const blob = `${errorParam ?? ""} ${errorCodeParam ?? ""} ${errorDescParam ?? ""}`;
    if (isExpiryError(blob)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(errorDescParam ?? errorCodeParam ?? errorParam ?? "auth_failed")}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  // Phase 4.x Wave C.5b sub_05 ??exchangeCodeForSession persists the
  // authenticated session via the @supabase/ssr cookie adapter wired in
  // createSupabaseServer (server.ts setAll ??cookieStore.set). Inside a
  // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
  // entries land on the eventual NextResponse.redirect below ??meaning
  // the user arrives at /onboarding/workspace already authenticated.
  // No follow-up signIn() / refresh() call is required.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    if (isExpiryError(exchangeError.message)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  }

  // Phase 4.x Wave C.5b amend_01 LOOP 1 fix (Codex F12): the
  // handle_new_user DB trigger now guarantees a profiles row materialises
  // in the same transaction as auth.users INSERT, so `!profile` is no
  // longer the right onboarding gate. Use workspace membership + global
  // role instead ??the actual constraint that decides whether the user
  // can land on /app surfaces.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const locale = profile?.locale ?? "ko";

  // Password recovery flow: send to reset-password regardless of state.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  }

  // Phase 2.8.1 G_B1-H (F-PUX-003): preserve the commission intent across
  // the entire signup ??confirm ??onboarding chain.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : null;

  const { count: workspaceMembershipCount } = await supabase
    .from("workspace_members")
    .select("workspace_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: globalRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .in("role", ["creator", "yagi_admin"]);

  const hasWorkspace = (workspaceMembershipCount ?? 0) > 0;
  const hasGlobalRole = (globalRoles?.length ?? 0) > 0;

  if (!hasWorkspace && !hasGlobalRole) {
    const onboardingUrl = safeNext
      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
      : `${origin}/${locale}/onboarding/workspace`;
    return NextResponse.redirect(onboardingUrl);
  }

  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}

 succeeded in 385ms:
import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5c sub_01 ??PKCE intermediate confirm endpoint
// (Codex K-05 LOOP 1 fix for F1 + F7).
//
// Why an intermediate route ??and why GET renders HTML instead of
// verifying immediately:
// - Gmail / Outlook / corporate-mail link-preview crawlers GET email
//   links before users can click. If GET verified directly,
//   `verifyOtp({ token_hash, type })` would single-use-consume the
//   OTP and the user's real click would land on /auth/expired.
// - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
//   cookie (only `exchangeCodeForSession` does). The only reliable
//   way to keep crawlers from draining the token is to require a
//   user-initiated POST: GET renders an HTML "Continue" button, the
//   button POSTs the same payload, and only then do we call
//   `verifyOtp`. Crawler GETs see HTML, no token consumption.
//
// Email-template change is a yagi MANUAL action (FU-C5c-01):
//   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
// Same change for Magic Link + Reset Password templates.

// ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------

const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  "/onboarding/workspace",
  "/onboarding/brand",
  "/onboarding/invite",
  "/app",
];
const RECOVERY_NEXT = "/reset-password";
const DEFAULT_NEXT = "/onboarding/workspace";

function sanitizeNext(raw: string | null, origin: string, type: EmailOtpType): string {
  if (!raw) return type === "recovery" ? RECOVERY_NEXT : DEFAULT_NEXT;
  if (raw.length > 500) return DEFAULT_NEXT;

  // Accept either a relative path or a same-origin absolute URL ??Supabase
  // emits `{{ .RedirectTo }}` as an absolute URL when `emailRedirectTo` is
  // absolute (Codex F2: the prior version dropped these silently).
  let candidate: string;
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      candidate = raw;
    } else {
      const parsed = new URL(raw, origin);
      if (parsed.origin !== origin) return DEFAULT_NEXT;
      candidate = parsed.pathname + parsed.search;
    }
  } catch {
    return DEFAULT_NEXT;
  }

  // Strip leading locale so the post-confirm redirect re-prefixes with the
  // verified user's profile.locale.
  const stripped = candidate.replace(/^\/(ko|en)(?=\/|$)/, "");
  const path = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  const pathOnly = path.split("?")[0];

  // Recovery flow has its own allowlist (Codex F9: don't let a forged
  // signup link land an authenticated user on the password-reset form).
  if (type === "recovery") {
    return pathOnly === RECOVERY_NEXT || pathOnly.startsWith(`${RECOVERY_NEXT}/`)
      ? path
      : RECOVERY_NEXT;
  }

  for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return path;
    }
  }
  return DEFAULT_NEXT;
}

const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
];
function asOtpType(value: string | null): EmailOtpType | null {
  if (value === null) return null;
  return (SUPPORTED_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

// ---------- GET ??render intermediate HTML (no OTP consume) ----------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Wave D sub_03i ??intermediate page copy must match the OTP type.
// The original GET handler hardcoded signup copy for every flow, so a
// recovery / magic-link / invite / email-change user saw "?대찓???몄쬆??// ?꾨즺??二쇱꽭??+ 媛???꾨즺" before clicking through, breaking trust on
// the password-reset flow in particular. The verifyOtp branch in POST
// is already type-aware; only the rendered HTML lagged.
//
// Description strings contain a literal `<br>` and originate from this
// closed enum, so they are inserted into the HTML as-is. Title and
// heading still flow through escapeHtml at the call site.
function getIntermediateCopy(type: EmailOtpType): {
  title: string;
  heading: string;
  description: string;
} {
  switch (type) {
    case "recovery":
      return {
        title: "YAGI 쨌 鍮꾨?踰덊샇 ?ъ꽕??,
        heading: "鍮꾨?踰덊샇 ?ъ꽕??留곹겕 ?뺤씤",
        description:
          "?꾨옒 踰꾪듉???꾨Ⅴ硫???鍮꾨?踰덊샇 ?ㅼ젙 ?섏씠吏濡??대룞?⑸땲??<br>" +
          "Press the button below to set a new password.",
      };
    case "magiclink":
      return {
        title: "YAGI 쨌 濡쒓렇??,
        heading: "濡쒓렇??留곹겕 ?뺤씤",
        description:
          "?꾨옒 踰꾪듉???꾨Ⅴ硫?濡쒓렇?몃릺怨???쒕낫?쒕줈 ?대룞?⑸땲??<br>" +
          "Press the button below to sign in and continue.",
      };
    case "invite":
      return {
        title: "YAGI 쨌 珥덈? ?섎씫",
        heading: "珥덈? ?섎씫",
        description:
          "?꾨옒 踰꾪듉???꾨Ⅴ硫?珥덈?瑜??섎씫?섍퀬 ?뚰겕?ㅽ럹?댁뒪濡??대룞?⑸땲??<br>" +
          "Press the button below to accept the invite and continue.",
      };
    case "email_change":
      return {
        title: "YAGI 쨌 ?대찓??蹂寃?,
        heading: "?대찓??蹂寃??뺤씤",
        description:
          "?꾨옒 踰꾪듉???꾨Ⅴ硫??대찓??蹂寃쎌씠 ?꾨즺?⑸땲??<br>" +
          "Press the button below to confirm the email change.",
      };
    case "signup":
    case "email":
    default:
      return {
        title: "YAGI 쨌 ?대찓???몄쬆",
        heading: "?대찓???몄쬆???꾨즺??二쇱꽭??,
        description:
          "?꾨옒 踰꾪듉???꾨Ⅴ硫?媛?낆씠 ?꾨즺?섍퀬 ?뚰겕?ㅽ럹?댁뒪 留뚮뱾湲곕줈 ?대룞?⑸땲??<br>" +
          "Press the button below to confirm your email and continue.",
      };
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = asOtpType(searchParams.get("type"));
  const rawNext = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  }

  // Pre-sanitise so the form can carry a clean value forward.
  const next = sanitizeNext(rawNext, origin, type);

  // Wave D sub_03i ??type-aware page copy. See getIntermediateCopy.
  const copy = getIntermediateCopy(type);

  // Codex F2 LOOP 2 N2 fix ??no external stylesheet. The token_hash sits
  // in the URL; loading a third-party CDN would risk a Referer leak even
  // with strict-origin-when-cross-origin defaulted (older browsers can
  // diverge). Inline-only styling + system-ui fallback.
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="same-origin" />
<title>${escapeHtml(copy.title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Pretendard, sans-serif; }
  main { width: 100%; max-width: 420px; padding: 32px 24px; text-align: center; }
  h1 { margin: 0 0 12px; font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
  p { margin: 0 0 28px; font-size: 14px; line-height: 1.5; color: #5C5C5C; }
  button { width: 100%; padding: 14px 24px; border: 0; border-radius: 12px; background: #71D083; color: #0A0A0A; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
  button:hover { filter: brightness(1.05); }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(copy.heading)}</h1>
  <p>${copy.description}</p>
  <form method="POST" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
    <input type="hidden" name="type" value="${escapeHtml(type)}" />
    <input type="hidden" name="next" value="${escapeHtml(next)}" />
    <button type="submit">怨꾩냽?섍린 / Continue</button>
  </form>
</main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Defense vs accidental cache by intermediate proxies.
      "Cache-Control": "no-store",
      // Email-link surface; deny indexing.
      "X-Robots-Tag": "noindex,nofollow",
      // Codex LOOP 2 N1 fix ??clickjacking + form-action lockdown.
      "Content-Security-Policy":
        "default-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
      // Codex LOOP 2 N2 fix ??keep the token_hash out of cross-origin
      // Referer leaks. Wave D sub_03h: switched from "no-referrer" to
      // "same-origin" because the original policy stripped Origin +
      // Referer on the same-origin form POST too, so the route's
      // CSRF guard saw cross-origin headers and redirected before
      // verifyOtp could run. With "same-origin" the form submit keeps
      // Origin + Referer (sameOriginByOrigin / sameOriginByReferer
      // pass), but cross-origin navigations and resource loads still
      // get an empty Referer. Since the intermediate page is fully
      // inline (no external CSS / scripts / images), there is no
      // cross-origin resource that could leak token_hash via Referer.
      "Referrer-Policy": "same-origin",
    },
  });
}

// ---------- POST ??actual verifyOtp consume ----------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);

  // Codex LOOP 2 N1 fix ??login-CSRF defense. The token_hash itself is
  // already a bearer credential, but rejecting cross-origin POSTs blocks
  // session-fixation attacks where an attacker submits their own token to
  // the victim's browser. Same-origin form submits set Origin (modern
  // browsers); when Origin is absent we fall back to Referer.
  const reqOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const sameOriginByOrigin = reqOrigin === origin;
  const sameOriginByReferer = referer ? referer.startsWith(`${origin}/`) : false;
  // Codex LOOP 3 N4 fix ??explicit 303 on every POST-side redirect.
  // The default NextResponse.redirect status (307) preserves the request
  // method, so the browser would re-POST the form body to /onboarding/...
  // which has no POST handler. 303 forces the follow-up to GET.
  if (!sameOriginByOrigin && !sameOriginByReferer) {
    return NextResponse.redirect(`${origin}/ko/signin?error=cross_origin_confirm`, 303);
  }

  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const typeRaw = form.get("type");
  const nextRaw = form.get("next");

  if (typeof tokenHash !== "string" || typeof typeRaw !== "string") {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`, 303);
  }
  const type = asOtpType(typeRaw);
  if (!type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=invalid_otp_type`, 303);
  }
  const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // verifyOtp failure modes: expired / invalid / consumed. All map to
    // the user-facing "link expired, request a new one" surface.
    return NextResponse.redirect(`${origin}/ko/auth/expired`, 303);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`, 303);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = profile?.locale === "en" ? "en" : "ko";

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`, 303);
  }

  return NextResponse.redirect(`${origin}/${locale}${next}`, 303);
}

codex
The gate currently only redirects when a profile row exists and `instagram_handle` is null. That means the “profile insert failed after workspace/member insert” state is not just an orphaning problem; the artist can reach `/app/*` because the gate treats a missing profile as pass-through.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'package.json'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'git status --short' in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'rg -n "artist_profile|workspace_members|user_roles|is_yagi_admin|inviteArtistAction|completeArtistOnboardingAction|checkArtistOnboardingGate" src supabase/migrations/20260505000000_phase_6_artist_profile.sql' in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 365ms:
{
  "name": "yagi-workshop",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "lint:rsc-form-action": "node scripts/test-rsc-form-action-rule.mjs",
    "check:rsc-form-action": "bash scripts/check-rsc-form-action.sh",
    "verify:rsc-form-action": "pnpm check:rsc-form-action && pnpm lint:rsc-form-action",
    "test:ssrf-defense": "node scripts/test-ssrf-defense.mjs",
    "test:saveversion-race": "node scripts/test-saveversion-race.mjs",
    "test:r2-brief-asset": "node scripts/test-r2-brief-asset.mjs",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "prepare": "husky"
  },
  "dependencies": {
    "@aws-sdk/client-s3": "^3.1035.0",
    "@aws-sdk/s3-request-presigner": "^3.1035.0",
    "@base-ui/react": "^1.4.1",
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.15",
    "@radix-ui/react-avatar": "^1.1.11",
    "@radix-ui/react-checkbox": "^1.3.3",
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "@radix-ui/react-label": "^2.1.8",
    "@radix-ui/react-popover": "^1.1.15",
    "@radix-ui/react-radio-group": "^1.3.8",
    "@radix-ui/react-scroll-area": "^1.2.10",
    "@radix-ui/react-select": "^2.2.6",
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-slot": "^1.2.4",
    "@radix-ui/react-switch": "^1.2.6",
    "@radix-ui/react-tabs": "^1.1.13",
    "@radix-ui/react-tooltip": "^1.2.8",
    "@react-email/components": "^1.0.12",
    "@react-email/render": "^2.0.7",
    "@supabase/ssr": "^0.10.2",
    "@supabase/supabase-js": "^2.104.0",
    "@tanstack/react-query": "^5.99.2",
    "@tanstack/react-query-devtools": "^5.99.2",
    "@tiptap/core": "3.22.4",
    "@tiptap/pm": "3.22.4",
    "@tiptap/react": "3.22.4",
    "@tiptap/starter-kit": "3.22.4",
    "@tiptap/suggestion": "3.22.4",
    "@tldraw/tldraw": "^4.5.10",
    "@vercel/og": "^0.11.1",
    "bcryptjs": "^3.0.3",
    "cheerio": "1.2.0",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "date-fns": "^4.1.0",
    "framer-motion": "^12.38.0",
    "google-auth-library": "^10.6.2",
    "lucide-react": "^1.8.0",
    "next": "15.5.0",
    "next-intl": "^4.9.1",
    "next-themes": "^0.4.6",
    "pdfjs-dist": "^5.6.205",
    "react": "19.1.0",
    "react-day-picker": "^9.14.0",
    "react-dom": "19.1.0",
    "react-dropzone": "^15.0.0",
    "react-hook-form": "^7.73.1",
    "react-image-crop": "^11.0.10",
    "react-markdown": "^10.1.0",
    "rehype-sanitize": "^6.0.0",
    "resend": "^6.12.2",
    "shadcn": "^4.3.1",
    "slugify": "^1.6.9",
    "sonner": "^2.0.7",
    "tailwind-merge": "^3.5.0",
    "tailwindcss-animate": "^1.0.7",
    "tippy.js": "6.3.7",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@content-collections/core": "^0.15.0",
    "@content-collections/mdx": "^0.2.2",
    "@content-collections/next": "^0.2.11",
    "@eslint/eslintrc": "^3",
    "@playwright/test": "1.55.0",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/react-dropzone": "^5.1.0",
    "autoprefixer": "^10.5.0",
    "eslint": "^9",
    "eslint-config-next": "15.5.0",
    "husky": "^9.1.7",
    "postcss": "^8.4.31",
    "sharp": "^0.34.5",
    "tailwindcss": "^3.4.19",
    "typescript": "^5"
  }
}

 succeeded in 387ms:
 M .yagi-autobuild/phase-6/KICKOFF.md
?? .yagi-autobuild/phase-6/KICKOFF_PROMPT.md
?? .yagi-autobuild/phase-6/_wave_a_codex_review_full.md
?? .yagi-autobuild/phase-6/_wave_a_codex_review_prompt.md

 succeeded in 479ms:
supabase/migrations/20260505000000_phase_6_artist_profile.sql:1:-- Phase 6 Wave A.1 — artist_profile table.
supabase/migrations/20260505000000_phase_6_artist_profile.sql:3:-- Per KICKOFF.md §"A.1 Schema migration: artist_profile" + L-019 pre-flight
supabase/migrations/20260505000000_phase_6_artist_profile.sql:5:-- artist_profile table absent).
supabase/migrations/20260505000000_phase_6_artist_profile.sql:38:CREATE TABLE artist_profile (
supabase/migrations/20260505000000_phase_6_artist_profile.sql:61:COMMENT ON TABLE artist_profile IS
supabase/migrations/20260505000000_phase_6_artist_profile.sql:67:CREATE INDEX idx_artist_profile_visibility ON artist_profile(visibility_mode)
supabase/migrations/20260505000000_phase_6_artist_profile.sql:74:ALTER TABLE artist_profile ENABLE ROW LEVEL SECURITY;
supabase/migrations/20260505000000_phase_6_artist_profile.sql:77:CREATE POLICY artist_profile_select ON artist_profile
supabase/migrations/20260505000000_phase_6_artist_profile.sql:81:      SELECT 1 FROM workspace_members
supabase/migrations/20260505000000_phase_6_artist_profile.sql:82:      WHERE workspace_id = artist_profile.workspace_id
supabase/migrations/20260505000000_phase_6_artist_profile.sql:85:    OR public.is_yagi_admin(auth.uid())
supabase/migrations/20260505000000_phase_6_artist_profile.sql:90:-- still subject to application-layer guard (inviteArtistAction in A.3).
supabase/migrations/20260505000000_phase_6_artist_profile.sql:91:CREATE POLICY artist_profile_insert ON artist_profile
supabase/migrations/20260505000000_phase_6_artist_profile.sql:93:  WITH CHECK (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260505000000_phase_6_artist_profile.sql:98:CREATE POLICY artist_profile_update ON artist_profile
supabase/migrations/20260505000000_phase_6_artist_profile.sql:102:      SELECT 1 FROM workspace_members
supabase/migrations/20260505000000_phase_6_artist_profile.sql:103:      WHERE workspace_id = artist_profile.workspace_id
supabase/migrations/20260505000000_phase_6_artist_profile.sql:106:    OR public.is_yagi_admin(auth.uid())
supabase/migrations/20260505000000_phase_6_artist_profile.sql:110:      SELECT 1 FROM workspace_members
supabase/migrations/20260505000000_phase_6_artist_profile.sql:111:      WHERE workspace_id = artist_profile.workspace_id
supabase/migrations/20260505000000_phase_6_artist_profile.sql:114:    OR public.is_yagi_admin(auth.uid())
supabase/migrations/20260505000000_phase_6_artist_profile.sql:118:CREATE POLICY artist_profile_delete ON artist_profile
supabase/migrations/20260505000000_phase_6_artist_profile.sql:120:  USING (public.is_yagi_admin(auth.uid()));
supabase/migrations/20260505000000_phase_6_artist_profile.sql:132:REVOKE UPDATE ON artist_profile FROM authenticated;
supabase/migrations/20260505000000_phase_6_artist_profile.sql:134:  ON artist_profile TO authenticated;
supabase/migrations/20260505000000_phase_6_artist_profile.sql:140:  IF has_table_privilege('authenticated', 'public.artist_profile', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:141:    RAISE EXCEPTION 'A.1 column grant assert failed: authenticated has table-level UPDATE on artist_profile';
supabase/migrations/20260505000000_phase_6_artist_profile.sql:145:  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'display_name', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:148:  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'short_bio', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:151:  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'instagram_handle', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:154:  IF NOT has_column_privilege('authenticated', 'public.artist_profile', 'updated_at', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:159:  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_status', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:162:  IF has_column_privilege('authenticated', 'public.artist_profile', 'visibility_mode', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:165:  IF has_column_privilege('authenticated', 'public.artist_profile', 'bypass_brand_ids', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:168:  IF has_column_privilege('authenticated', 'public.artist_profile', 'auto_decline_categories', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:171:  IF has_column_privilege('authenticated', 'public.artist_profile', 'twin_r2_prefix', 'UPDATE') THEN
supabase/migrations/20260505000000_phase_6_artist_profile.sql:174:  IF has_column_privilege('authenticated', 'public.artist_profile', 'activated_at', 'UPDATE') THEN
src\lib\auth\artist-onboarding-gate.ts:4:// is resolved. If the active workspace is kind='artist' and the artist_profile
src\lib\auth\artist-onboarding-gate.ts:29:export async function checkArtistOnboardingGate(
src\lib\auth\artist-onboarding-gate.ts:38:  // Fetch the artist_profile row to check instagram_handle
src\lib\auth\artist-onboarding-gate.ts:41:    .from("artist_profile")
src\lib\auth\artist-onboarding-gate.ts:47:    console.error("[artistOnboardingGate] artist_profile fetch error:", error);
src\app\auth\callback\route.ts:94:    .from("workspace_members")
src\app\auth\callback\route.ts:99:    .from("user_roles")
src\lib\app\context.ts:65:    .from("user_roles")
src\lib\app\context.ts:74:    .from("workspace_members")
src\components\brief-board\lock-button.tsx:9:// (a) explicit user_roles check at the top of the action and (b) the
src\lib\commission\actions.ts:96:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\lib\email\new-message.ts:88:        .from("workspace_members")
src\lib\email\new-message.ts:92:        .from("user_roles")
src\components\project\thread-panel-server.tsx:66:        .from("user_roles")
src\components\project\thread-panel-server.tsx:172:    .from("user_roles")
src\lib\workspace\active.ts:6:// cookie's uuid against workspace_members for the current user, then
src\lib\workspace\active.ts:11://      workspace_members membership on the server.
src\lib\workspace\active.ts:49: * Cross-tenant guard: the SELECT joins through workspace_members for the
src\lib\workspace\active.ts:61:    .from("workspace_members")
src\lib\workspace\active.ts:94: * workspace_members, and falls back when the cookie is absent,
src\lib\workspace\actions.ts:44:    .from("workspace_members")
src\lib\team-channels\queries.ts:182:    .from("workspace_members")
src\lib\team-channels\queries.ts:201:    supabase.rpc("is_yagi_admin", { uid: userId }),
src\lib\team-channels\queries.ts:277:    .from("workspace_members")
src\app\api\share\[token]\reactions\route.ts:101:      .from("user_roles")
src\components\dashboard\count-cards.tsx:4:// queries scoped to active workspace via workspace_members RLS).
src\lib\onboarding\state.ts:25:    .from("workspace_members")
src\lib\onboarding\state.ts:30:    .from("user_roles")
src\lib\supabase\database.types.ts:17:      artist_profile: {
src\lib\supabase\database.types.ts:62:            foreignKeyName: "artist_profile_workspace_id_fkey"
src\lib\supabase\database.types.ts:2625:      user_roles: {
src\lib\supabase\database.types.ts:2649:            foreignKeyName: "user_roles_user_id_fkey"
src\lib\supabase\database.types.ts:2656:            foreignKeyName: "user_roles_workspace_id_fkey"
src\lib\supabase\database.types.ts:2715:      workspace_members: {
src\lib\supabase\database.types.ts:2748:            foreignKeyName: "workspace_members_invited_by_fkey"
src\lib\supabase\database.types.ts:2755:            foreignKeyName: "workspace_members_user_id_fkey"
src\lib\supabase\database.types.ts:2762:            foreignKeyName: "workspace_members_workspace_id_fkey"
src\lib\supabase\database.types.ts:2894:      is_yagi_admin: { Args: { uid: string }; Returns: boolean }
src\lib\onboarding\actions.ts:32:      .from("user_roles")
src\app\api\share\[token]\comments\route.ts:96:  // than querying workspace_members+auth.users. This keeps the API route
src\app\api\share\[token]\comments\route.ts:134:      .from("user_roles")
src\app\[locale]\onboarding\artist\page.tsx:34:    .from("workspace_members")
src\app\[locale]\onboarding\artist\page.tsx:52:  // Fetch artist_profile for display_name
src\app\[locale]\onboarding\artist\page.tsx:54:    .from("artist_profile")
src\components\challenges\header-cta-resolver.tsx:29:  // Check is_yagi_admin via user_roles table
src\components\challenges\header-cta-resolver.tsx:31:    .from("user_roles")
src\app\[locale]\onboarding\artist\_components\onboarding-form.tsx:17:import { completeArtistOnboardingAction } from "../_actions/complete-onboarding";
src\app\[locale]\onboarding\artist\_components\onboarding-form.tsx:47:    const result = await completeArtistOnboardingAction({
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:4:// Phase 6 Wave A.3 — completeArtistOnboardingAction
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:13:// the artist_profile_update RLS policy gates by workspace_members
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:19://   3. yagi_admin                                        → permitted via is_yagi_admin
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:53:export async function completeArtistOnboardingAction(
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:73:  // 3. Resolve user's active artist workspace via workspace_members.
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:79:    .from("workspace_members")
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:84:    console.error("[completeArtistOnboardingAction] workspace query error:", memberErr);
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:103:  // 4. Fetch the artist_profile row; verify instagram_handle IS NULL (idempotency guard)
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:105:    .from("artist_profile")
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:112:      "[completeArtistOnboardingAction] artist_profile fetch error:",
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:119:    // artist_profile row missing (shouldn't happen post-invite, but be explicit)
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:128:  // 5. UPDATE artist_profile SET instagram_handle = ... via user-scoped client.
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:129:  //    Column GRANT + RLS UPDATE policy permit this for workspace_members.
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:131:    .from("artist_profile")
src\app\[locale]\onboarding\artist\_actions\complete-onboarding.ts:140:      "[completeArtistOnboardingAction] artist_profile update error:",
src\app\api\health\google\route.ts:14:  // yagi_admin gate: check user_roles for role='yagi_admin' with workspace_id IS NULL
src\app\api\health\google\route.ts:16:    .from('user_roles')
src\app\[locale]\app\dashboard\page.tsx:4:// recent RFPs scoped to the active workspace via workspace_members
src\app\[locale]\app\dashboard\page.tsx:74:  // validates the cookie's uuid against workspace_members and falls back
src\app\[locale]\app\admin\artists\page.tsx:49:    .from("user_roles")
src\app\[locale]\app\admin\artists\page.tsx:60:  // (artist_profile has RLS SELECT gated to workspace_members + yagi_admin;
src\app\[locale]\app\admin\artists\page.tsx:61:  //  yagi_admin check uses is_yagi_admin RLS function. Using service-role
src\app\[locale]\app\admin\artists\page.tsx:68:    .from("artist_profile")
src\app\[locale]\app\admin\artists\page.tsx:76:      member:workspace_members(user_id)
src\app\[locale]\app\admin\artists\page.tsx:82:    console.error("[AdminArtistsPage] artist_profile fetch error:", profileErr);
src\app\[locale]\app\admin\artists\_components\invite-artist-form.tsx:4:// Calls inviteArtistAction on submit; shows Sonner toast on result.
src\app\[locale]\app\admin\artists\_components\invite-artist-form.tsx:16:import { inviteArtistAction } from "../_actions/invite-artist";
src\app\[locale]\app\admin\artists\_components\invite-artist-form.tsx:46:    const result = await inviteArtistAction(values);
src\app\[locale]\app\admin\trash\page.tsx:36:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:4:// Phase 6 Wave A.3 — inviteArtistAction
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:7:// atomically creates the workspace, workspace_member, and artist_profile rows
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:44:export async function inviteArtistAction(
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:64:  // 3. yagi_admin gate — query user_roles for global yagi_admin role
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:67:    .from("user_roles")
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:74:    console.error("[inviteArtistAction] role check error:", roleErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:94:    console.error("[inviteArtistAction] invite error:", inviteErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:132:    console.error("[inviteArtistAction] workspace insert error:", wsErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:135:      "[inviteArtistAction] ORPHAN: auth user created but workspace insert failed",
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:147:  // 8. INSERT workspace_members (role='admin' = primary owner role used by bootstrap_workspace)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:148:  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:157:    console.error("[inviteArtistAction] workspace_members insert error:", memberErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:159:      "[inviteArtistAction] ORPHAN: workspace created but member insert failed",
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:165:  // 9. INSERT artist_profile (instagram_handle = NULL per A.1 schema design)
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:166:  const { error: profileErr } = await sbAdmin.from("artist_profile").insert({
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:178:    console.error("[inviteArtistAction] artist_profile insert error:", profileErr);
src\app\[locale]\app\admin\artists\_actions\invite-artist.ts:180:      "[inviteArtistAction] ORPHAN: workspace+member created but artist_profile insert failed",
src\app\[locale]\app\admin\page.tsx:47:    .from("user_roles")
src\app\[locale]\app\layout.tsx:15:import { checkArtistOnboardingGate } from "@/lib/auth/artist-onboarding-gate";
src\app\[locale]\app\layout.tsx:73:  const onboardingRedirect = await checkArtistOnboardingGate(
src\app\[locale]\app\admin\invoices\page.tsx:108:    .from("user_roles")
src\app\[locale]\app\admin\support\page.tsx:35:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\team\[slug]\actions.ts:205:  // with the YAGI Internal workspace_members list. Done as two queries because
src\app\[locale]\app\team\[slug]\actions.ts:234:    .from("workspace_members")
src\app\[locale]\app\team\[slug]\actions.ts:291:    supabase.rpc("is_yagi_admin", { uid: user.id }),
src\app\[locale]\app\team\[slug]\actions.ts:561:      const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\commissions\page.tsx:39:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\settings\actions.ts:184:    .from("workspace_members")
src\app\[locale]\app\settings\team-panel.tsx:18:    .from("workspace_members")
src\app\[locale]\app\settings\team-panel.tsx:22:      profile:profiles!workspace_members_user_id_fkey(id, display_name, handle, avatar_url)
src\app\[locale]\app\admin\commissions\[id]\actions.ts:56:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\projects\[id]\page.tsx:2:// Auth: yagi_admin only (user_roles check; non-admin → notFound).
src\app\[locale]\app\admin\projects\[id]\page.tsx:32:    .from("user_roles")
src\app\[locale]\app\admin\commissions\[id]\page.tsx:29:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\page.tsx:60:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\invoices\actions.ts:31:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\support\actions.ts:144:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\support\actions.ts:195:      .from("user_roles")
src\app\[locale]\app\invoices\page.tsx:72:    .from("user_roles")
src\app\[locale]\app\projects\new\actions.ts:888:    .from("workspace_members")
src\app\[locale]\app\invoices\[id]\actions.ts:42:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:168:      .from("user_roles")
src\app\[locale]\app\invoices\[id]\actions.ts:213:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\actions.ts:254:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\line-item-actions.ts:46:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\preprod\new\page.tsx:29:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\invoices\new\page.tsx:22:    .from("user_roles")
src\app\[locale]\app\preprod\[id]\actions.ts:531:      .from("workspace_members")
src\app\[locale]\app\preprod\[id]\actions.ts:578:    .from("workspace_members")
src\app\[locale]\app\preprod\[id]\actions.ts:733:  const { data: isYagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\invoices\[id]\page.tsx:62:    .from("user_roles")
src\app\[locale]\app\meetings\request-actions.ts:100:  const { data } = await supabase.rpc("is_yagi_admin", { uid });
src\app\[locale]\app\meetings\request-actions.ts:126:    .from("user_roles")
src\app\[locale]\app\meetings\request-actions.ts:352:    .from("user_roles")
src\app\[locale]\app\meetings\request-actions.ts:472:      .from("user_roles")
src\app\[locale]\app\preprod\[id]\page.tsx:30:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\preprod\[id]\share-actions.ts:251:      .from("workspace_members")
src\app\[locale]\app\preprod\[id]\share-actions.ts:296:      .from("user_roles")
src\app\[locale]\app\projects\[id]\actions.ts:65:    .from("user_roles")
src\app\[locale]\app\projects\[id]\actions.ts:127:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\board-actions.ts:118:    const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\projects\[id]\board-actions.ts:125:        .from("workspace_members")
src\app\[locale]\app\projects\[id]\board-actions.ts:305:    .from("user_roles")
src\app\[locale]\app\projects\[id]\board-actions.ts:379:    .from("user_roles")
src\app\[locale]\app\showcases\page.tsx:65:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\showcases\page.tsx:72:      .from("workspace_members")
src\app\[locale]\app\showcases\page.tsx:97:      .from("workspace_members")
src\app\[locale]\app\showcases\actions.ts:72:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\showcases\actions.ts:374:      .from("workspace_members")
src\app\[locale]\app\projects\[id]\page.tsx:255:    .from("user_roles")
src\app\[locale]\app\projects\new\briefing-step2-actions.ts:136:    .from("workspace_members")
src\app\[locale]\app\meetings\actions.ts:140:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:351:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:412:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:632:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:736:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\actions.ts:808:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\admin\challenges\actions.ts:68:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", { uid: user.id });
src\app\[locale]\app\projects\[id]\brief\actions.ts:403:    .from("user_roles")
src\app\[locale]\app\projects\[id]\brief\actions.ts:444:    .from("user_roles")
src\app\[locale]\app\projects\[id]\brief\actions.ts:978:  // Enumerate yagi_admin recipients via service role (user_roles SELECT
src\app\[locale]\app\projects\[id]\brief\actions.ts:984:    .from("user_roles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:30:      .from("user_roles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:183:      .from("user_roles")
src\app\[locale]\app\projects\[id]\thread-actions.ts:312:  // need notifications for a given workspace must be added as workspace_members
src\app\[locale]\app\projects\[id]\thread-actions.ts:316:      .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:358:// query workspace_members (project participants) so non-members never
src\app\[locale]\app\projects\[id]\thread-actions.ts:386:    .from("workspace_members")
src\app\[locale]\app\projects\[id]\thread-actions.ts:397:    .from("user_roles")
src\app\[locale]\app\meetings\new\page.tsx:42:    .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:51:      .from("user_roles")
src\app\[locale]\app\meetings\new\page.tsx:55:    supabase.rpc("is_yagi_admin", { uid }),
src\app\[locale]\app\meetings\new\page.tsx:84:      .from("workspace_members")
src\app\[locale]\app\meetings\new\page.tsx:89:        profile:profiles!workspace_members_user_id_fkey(display_name, id)
src\app\[locale]\app\showcases\[id]\page.tsx:46:  const { data: yagiAdmin } = await supabase.rpc("is_yagi_admin", {
src\app\[locale]\app\admin\challenges\[slug]\judge\actions.ts:14:  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
src\app\[locale]\app\admin\challenges\[slug]\announce\actions.ts:30:  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "node -e \"JSON.parse(require('fs').readFileSync('messages/ko.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('messages JSON ok')\"" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'workspace_switcher|admin_artists|onboarding_artist|\"title\": \"Roster\"|\"routing\": \"라우팅\"|\"routing\": \"Routing\"' messages/ko.json messages/en.json" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n '\"workspace\": \\{|\"switcher\": \\{|\"add_new\"|\"brands_group\"|\"artists_group\"|\"admin_group\"' messages/ko.json messages/en.json" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 446ms:
messages/ko.json:2163:  "workspace_switcher": {
messages/ko.json:2169:  "admin_artists": {
messages/ko.json:2196:  "onboarding_artist": {
messages/en.json:2098:  "workspace_switcher": {
messages/en.json:2104:  "admin_artists": {
messages/en.json:2131:  "onboarding_artist": {

 succeeded in 418ms:
messages/ko.json:299:      "brands_group": "브랜드",
messages/ko.json:300:      "artists_group": "아티스트",
messages/ko.json:301:      "admin_group": "YAGI",
messages/ko.json:302:      "add_new": "+ 새 워크스페이스 만들기",
messages/ko.json:2167:    "add_new": "+ 새 워크스페이스 만들기"
messages/en.json:299:      "brands_group": "Brand",
messages/en.json:300:      "artists_group": "Artist",
messages/en.json:301:      "admin_group": "YAGI",
messages/en.json:302:      "add_new": "+ New workspace",
messages/en.json:2102:    "add_new": "+ New workspace"

 succeeded in 481ms:
messages JSON ok

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "node - <<'NODE'
const fs=require('fs');
for (const lang of ['ko','en']) {
  const data=JSON.parse(fs.readFileSync("'`messages/${lang}.json`,'"'utf8'));
  for (const key of ['workspace_switcher','admin_artists','onboarding_artist']) {
    console.log("'`--- ${lang}.${key} ---`);
    console.log(JSON.stringify(data[key], null, 2));
  }
}
NODE' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-05T08:45:45.186248Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
At line:2 char:9
+ node - <<'NODE'
+         ~
Missing file specification after redirection operator.
At line:2 char:8
+ node - <<'NODE'
+        ~
The '<' operator is reserved for future use.
At line:2 char:9
+ node - <<'NODE'
+         ~
The '<' operator is reserved for future use.
At line:7 char:42
+     console.log(`--- ${lang}.${key} ---`);
+                                          ~
Missing closing ')' in expression.
At line:8 char:41
+     console.log(JSON.stringify(data[key], null, 2));
+                                         ~
Missing argument in parameter list.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : MissingFileSpecification
 

 exited 1 in 463ms:
At line:2 char:9
+ node - <<'NODE'
+         ~
Missing file specification after redirection operator.
At line:2 char:8
+ node - <<'NODE'
+        ~
The '<' operator is reserved for future use.
At line:2 char:9
+ node - <<'NODE'
+         ~
The '<' operator is reserved for future use.
At line:7 char:42
+     console.log(`--- ${lang}.${key} ---`);
+                                          ~
Missing closing ')' in expression.
At line:8 char:41
+     console.log(JSON.stringify(data[key], null, 2));
+                                         ~
Missing argument in parameter list.
    + CategoryInfo          : ParserError: (:) [], ParentContainsErrorRecordException
    + FullyQualifiedErrorId : MissingFileSpecification
 

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "@'
const fs=require('fs');
for (const lang of ['ko','en']) {
  const data=JSON.parse(fs.readFileSync("'`messages/${lang}.json`,'"'utf8'));
  for (const key of ['workspace_switcher','admin_artists','onboarding_artist']) {
    console.log("'`--- ${lang}.${key} ---`);
    console.log(JSON.stringify(data[key], null, 2));
  }
}
'"'@ | node -" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 402ms:
--- ko.workspace_switcher ---
{
  "current_label": "현재 워크스페이스",
  "group_brand": "브랜드",
  "group_artist": "아티스트",
  "add_new": "+ 새 워크스페이스 만들기"
}
--- ko.admin_artists ---
{
  "title": "소속 아티스트",
  "invite_cta": "+ 새 Artist 영입",
  "table_heading": "아티스트 명단",
  "table_empty": "아직 영입된 아티스트가 없습니다.",
  "column_name": "이름",
  "column_email": "email",
  "column_instagram": "Instagram",
  "column_joined_at": "가입일",
  "column_status": "상태",
  "status_invite_pending": "⏳ invite 완료",
  "status_onboarding": "⏳ onboarding",
  "status_active": "✅ 활성",
  "form_email": "이메일",
  "form_display_name": "아티스트 이름",
  "form_display_name_ph": "예: 김예진",
  "form_short_bio": "소개",
  "form_short_bio_ph": "짧은 자기소개 (선택)",
  "form_submit": "초대 보내기",
  "optional": "선택",
  "invite_success": "초대 이메일을 발송했습니다.",
  "invite_error_validation": "입력값을 확인해 주세요.",
  "invite_error_unauthenticated": "로그인이 필요합니다.",
  "invite_error_forbidden": "권한이 없습니다.",
  "invite_error_invite_failed": "초대 이메일 발송에 실패했습니다.",
  "invite_error_db": "데이터 처리 중 오류가 발생했습니다."
}
--- ko.onboarding_artist ---
{
  "greeting": "만나서 반가워요, {name}님",
  "subtitle": "계정 설정 마지막 단계입니다.",
  "email_label": "이메일",
  "instagram_label": "Instagram 계정",
  "submit_cta": "시작하기 →"
}
--- en.workspace_switcher ---
{
  "current_label": "Current workspace",
  "group_brand": "Brand",
  "group_artist": "Artist",
  "add_new": "+ New workspace"
}
--- en.admin_artists ---
{
  "title": "Roster",
  "invite_cta": "+ Invite new Artist",
  "table_heading": "Artist list",
  "table_empty": "No artists invited yet.",
  "column_name": "Name",
  "column_email": "Email",
  "column_instagram": "Instagram",
  "column_joined_at": "Joined",
  "column_status": "Status",
  "status_invite_pending": "⏳ Invited",
  "status_onboarding": "⏳ Onboarding",
  "status_active": "✅ Active",
  "form_email": "Email",
  "form_display_name": "Artist name",
  "form_display_name_ph": "e.g. Jane Kim",
  "form_short_bio": "Short bio",
  "form_short_bio_ph": "A short introduction (optional)",
  "form_submit": "Send invite",
  "optional": "optional",
  "invite_success": "Invite email sent.",
  "invite_error_validation": "Please check your input.",
  "invite_error_unauthenticated": "Please sign in.",
  "invite_error_forbidden": "You don't have permission.",
  "invite_error_invite_failed": "Failed to send invite email.",
  "invite_error_db": "A database error occurred."
}
--- en.onboarding_artist ---
{
  "greeting": "Welcome, {name}",
  "subtitle": "Final step to set up your account.",
  "email_label": "Email",
  "instagram_label": "Instagram handle",
  "submit_cta": "Get started →"
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/supabase/service.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/supabase/server.ts'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/app/admin/layout.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 469ms:
import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

let admin: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabaseService() {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase service client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  admin = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

 succeeded in 455ms:
import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";
import { fetchAppContext } from "@/lib/app/context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const ctx = await fetchAppContext();
  if (!ctx) redirect({ href: "/", locale });
  if (!ctx!.workspaceRoles.includes("yagi_admin")) redirect({ href: "/app", locale });
  return <>{children}</>;
}

 succeeded in 485ms:
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Phase 4.x Wave C.5c sub_01 ??PKCE flow. Mirrors client.ts so
      // /auth/confirm's verifyOtp call finds the matching code_verifier
      // cookie set by signUp() at signup time. See client.ts for the
      // Gmail-crawler rationale.
      auth: { flowType: "pkce" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component (read-only cookies) ??ignore.
          }
        },
      },
    }
  );
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"sendInvitationsAction|workspace_members.*insert|workspace_invitations|role: \\\"member\\\"|role: 'member'|invited_by\" src/app src/lib src/components -g '*.ts' -g '*.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/app/[locale]/onboarding/invite/page.tsx' | Select-Object -First 140" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "Get-Content -LiteralPath 'src/lib/onboarding/actions.ts' | Select-Object -First 200" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-05T08:46:05.212183Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.4 seconds
Output:
rg: 'member'|invited_by src/app src/lib src/components -g *.ts -g *.tsx: IO error for operation on 'member'|invited_by src/app src/lib src/components -g *.ts -g *.tsx: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 exited 1 in 350ms:
rg: 'member'|invited_by src/app src/lib src/components -g *.ts -g *.tsx: IO error for operation on 'member'|invited_by src/app src/lib src/components -g *.ts -g *.tsx: 파일 이름, 디렉터리 이름 또는 볼륨 레이블 구문이 잘못되었습니다. (os error 123)

 succeeded in 441ms:
"use server";

import { createSupabaseServer } from "@/lib/supabase/server";
import crypto from "node:crypto";

type Result = { error?: string };

export async function createProfileAction(formData: {
  handle: string;
  displayName: string;
  bio: string;
  locale: "ko" | "en";
  role: "client" | "creator";
}): Promise<Result> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    handle: formData.handle,
    display_name: formData.displayName,
    bio: formData.bio || null,
    locale: formData.locale,
  });
  if (profileError) return { error: profileError.message };

  if (formData.role === "creator") {
    const { error: roleError } = await supabase
      .from("user_roles")
      .insert({ user_id: user.id, role: "creator", workspace_id: null });
    if (roleError) return { error: roleError.message };
  }

  return {};
}

export async function createWorkspaceAction(formData: {
  name: string;
  slug: string;
}): Promise<Result & { workspaceId?: string }> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  // Use bootstrap_workspace RPC to atomically create workspace + admin member + role.
  // This avoids the RLS SELECT-after-INSERT issue where the ws_read_members policy
  // would reject reading the just-inserted workspace row (user is not yet a member).
  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: string | null; error: { message: string } | null }>)(
    "bootstrap_workspace",
    {
      p_name: formData.name,
      p_slug: formData.slug,
      p_logo_url: null,
    }
  );

  if (error) return { error: error.message };
  if (!data) return { error: "workspace_insert_failed" };

  return { workspaceId: data };
}

export async function createBrandAction(formData: {
  workspaceId: string;
  name: string;
  slug: string;
}): Promise<Result> {
  const supabase = await createSupabaseServer();
  const { error } = await supabase.from("brands").insert({
    workspace_id: formData.workspaceId,
    name: formData.name,
    slug: formData.slug,
  });
  if (error) return { error: error.message };
  return {};
}

export async function sendInvitationsAction(formData: {
  workspaceId: string;
  emails: string[];
  role: "admin" | "member";
}): Promise<Result> {
  if (formData.emails.length === 0) return {};
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "not_authenticated" };

  const rows = formData.emails.map((email) => ({
    workspace_id: formData.workspaceId,
    email,
    role: formData.role,
    token: crypto.randomBytes(24).toString("hex"),
    invited_by: user.id,
  }));

  const { error } = await supabase.from("workspace_invitations").insert(rows);
  if (error) return { error: error.message };

  // TODO Phase 1.2: send actual email via Resend. For now, log to server console.
  console.log("[invitations] staged", rows.map((r) => r.email).join(", "));
  return {};
}

 succeeded in 444ms:
"use client";

import { useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendInvitationsAction } from "@/lib/onboarding/actions";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function OnboardingInvitePage() {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const search = useSearchParams();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const workspaceId = search.get("ws");

  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function addEmail() {
    const v = draft.trim();
    if (!v) return;
    if (!emailRe.test(v)) {
      toast.error("invalid_email");
      return;
    }
    if (!emails.includes(v)) setEmails([...emails, v]);
    setDraft("");
  }

  function removeEmail(e: string) {
    setEmails(emails.filter((x) => x !== e));
  }

  async function onSend() {
    if (!workspaceId) {
      toast.error("missing_workspace");
      return;
    }
    setSubmitting(true);
    const res = await sendInvitationsAction({ workspaceId, emails, role: "member" });
    setSubmitting(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.push(`/${locale}/app`);
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">{t("invite_title")}</h1>
        <p className="text-sm text-muted-foreground keep-all">{t("invite_sub")}</p>
      </div>
      <div className="space-y-3">
        <Label htmlFor="emailInput">{t("invite_email")}</Label>
        <div className="flex gap-2">
          <Input
            id="emailInput"
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="name@company.com"
          />
          <Button type="button" size="lg" variant="outline" onClick={addEmail}>
            {t("invite_add")}
          </Button>
        </div>
        {emails.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-2">
            {emails.map((e) => (
              <li
                key={e}
                className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs"
              >
                {e}
                <button
                  type="button"
                  onClick={() => removeEmail(e)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="remove"
                >
                  횞
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Button size="lg" onClick={onSend} disabled={submitting || emails.length === 0}>
          {submitting ? "..." : t("invite_send")}
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => router.push(`/${locale}/app`)}
        >
          {t("done")}
        </Button>
      </div>
    </div>
  );
}

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n \"workspace_invitations|token|accept|workspace_members.*insert|from\\(\\\"workspace_members\\\"\\).*insert\" src/app src/lib src/components -g '*.ts' -g '*.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-05T08:46:11.955941Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 0.5 seconds
Output:
rg: regex parse error:
    (?:workspace_invitations|token|accept|workspace_members.*insert|from\(\)
    ^
error: unclosed group

 exited 1 in 476ms:
rg: regex parse error:
    (?:workspace_invitations|token|accept|workspace_members.*insert|from\(\)
    ^
error: unclosed group

exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'workspace_invitations' src/app src/lib src/components -g '*.ts' -g '*.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "rg -n 'workspace_members.*insert|from\\(\"workspace_members\"\\)' src/app src/lib src/components -g '*.ts' -g '*.tsx'" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 923ms:
src/app\[locale]\app\admin\artists\_actions\invite-artist.ts:148:  const { error: memberErr } = await sbAdmin.from("workspace_members").insert({
src/app\[locale]\app\admin\artists\_actions\invite-artist.ts:157:    console.error("[inviteArtistAction] workspace_members insert error:", memberErr);

 succeeded in 923ms:
src/lib\supabase\database.types.ts:2664:      workspace_invitations: {
src/lib\supabase\database.types.ts:2700:            foreignKeyName: "workspace_invitations_invited_by_fkey"
src/lib\supabase\database.types.ts:2707:            foreignKeyName: "workspace_invitations_workspace_id_fkey"
src/lib\onboarding\actions.ts:106:  const { error } = await supabase.from("workspace_invitations").insert(rows);
src/app\[locale]\app\meetings\new\page.tsx:96:    // We'll use a sub-query via workspace_invitations to get email fallback.
src/app\[locale]\app\meetings\new\page.tsx:97:    // The safest approach: fetch from workspace_invitations for accepted members.
src/app\[locale]\app\meetings\new\page.tsx:99:      .from("workspace_invitations")
src/app\[locale]\app\meetings\new\page.tsx:134:        // Try to find email from workspace_invitations (best effort)

codex
I’ve finished the access-control pass and am doing one targeted validation pass now: JSON parses cleanly, and I’m checking for lint/type issues in the touched TypeScript where the review surfaced edge cases.
exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command 'pnpm exec eslint "src/app/[locale]/app/admin/artists/**/*.{ts,tsx}" "src/app/[locale]/onboarding/artist/**/*.{ts,tsx}" "src/lib/auth/artist-onboarding-gate.ts" "src/lib/workspace/active.ts" "src/components/sidebar/workspace-switcher.tsx" "src/components/app/sidebar.tsx"' in C:\Users\yout4\yagi-studio\yagi-workshop
2026-05-05T08:46:35.532159Z ERROR codex_core::tools::router: error=Exit code: 1
Wall time: 3.5 seconds
Output:

Oops! Something went wrong! :(

ESLint: 9.39.4

No files matching the pattern "src/app/[locale]/app/admin/artists/**/*.{ts,tsx}" were found.
Please check for typing mistakes in the pattern.


 exited 1 in 3478ms:

Oops! Something went wrong! :(

ESLint: 9.39.4

No files matching the pattern "src/app/[locale]/app/admin/artists/**/*.{ts,tsx}" were found.
Please check for typing mistakes in the pattern.


exec
"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" -Command "pnpm exec eslint --no-error-on-unmatched-pattern \"src/app/\\[locale\\]/app/admin/artists/**/*.ts\" \"src/app/\\[locale\\]/app/admin/artists/**/*.tsx\" \"src/app/\\[locale\\]/onboarding/artist/**/*.ts\" \"src/app/\\[locale\\]/onboarding/artist/**/*.tsx\" \"src/lib/auth/artist-onboarding-gate.ts\" \"src/lib/workspace/active.ts\" \"src/components/sidebar/workspace-switcher.tsx\" \"src/components/app/sidebar.tsx\"" in C:\Users\yout4\yagi-studio\yagi-workshop
 succeeded in 3674ms:
codex
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH-B: `supabase/migrations/20260505000000_phase_6_artist_profile.sql:77` — `artist_profile` SELECT/UPDATE is scoped to “any workspace member,” not the invited artist owner. If an Artist workspace ever has a second member, that user can read/update the profile display fields and complete onboarding. Recommended fix: add an owner identity to `artist_profile` such as `owner_user_id`, populate it from `invitedUserId`, and make SELECT/UPDATE/onboarding resolution require `owner_user_id = auth.uid()` unless `is_yagi_admin`.

[FINDING 2] HIGH-B: `src/lib/auth/artist-onboarding-gate.ts:53` — missing `artist_profile` rows pass the `/app/*` onboarding gate because only `profile && instagram_handle === null` redirects. If invite provisioning fails after workspace/member creation, the Artist can enter app surfaces without completing onboarding. Recommended fix: treat `!profile || profile.instagram_handle === null` as blocked, or redirect to onboarding where the missing profile is repaired or shown as a clean blocking error.

[FINDING 3] MED-A: `src/app/[locale]/app/admin/artists/_actions/invite-artist.ts:131` — partial-state cleanup is logging-only. After invite success, workspace/member/profile insert failures leave orphan auth users or workspaces despite the spec asking for best-effort cleanup. Recommended fix: on failure, best-effort delete the auth user and/or created workspace; deleting workspace should cascade `workspace_members`/`artist_profile`.

[FINDING 4] MED-A: `src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts:30` — `"@"` passes `.min(1)` before transform and stores an empty string, which makes the gate consider onboarding complete. Recommended fix: normalize first, then validate non-empty with an Instagram-safe regex and length check.

RLS audit: `instagram_handle` and `updated_at` are granted at migration lines 132-133, so `completeArtistOnboardingAction`’s user-scoped update is column-grant permitted. Invite provisioning uses `createSupabaseService()` after the yagi_admin check, writes deterministic `kind: "artist"`, uses `inviteData.user.id`, and writes the returned workspace id. KO new namespaces had no listed internal-term leakage; EN “Roster” is allowed. Targeted ESLint on scoped TS/TSX files passed.

Summary: core yagi_admin invite gating is sound, but owner-vs-member RLS and missing-profile gate handling need fixes before ff-merge.
tokens used
115,107
## VERDICT: NEEDS-ATTENTION

[FINDING 1] HIGH-B: `supabase/migrations/20260505000000_phase_6_artist_profile.sql:77` — `artist_profile` SELECT/UPDATE is scoped to “any workspace member,” not the invited artist owner. If an Artist workspace ever has a second member, that user can read/update the profile display fields and complete onboarding. Recommended fix: add an owner identity to `artist_profile` such as `owner_user_id`, populate it from `invitedUserId`, and make SELECT/UPDATE/onboarding resolution require `owner_user_id = auth.uid()` unless `is_yagi_admin`.

[FINDING 2] HIGH-B: `src/lib/auth/artist-onboarding-gate.ts:53` — missing `artist_profile` rows pass the `/app/*` onboarding gate because only `profile && instagram_handle === null` redirects. If invite provisioning fails after workspace/member creation, the Artist can enter app surfaces without completing onboarding. Recommended fix: treat `!profile || profile.instagram_handle === null` as blocked, or redirect to onboarding where the missing profile is repaired or shown as a clean blocking error.

[FINDING 3] MED-A: `src/app/[locale]/app/admin/artists/_actions/invite-artist.ts:131` — partial-state cleanup is logging-only. After invite success, workspace/member/profile insert failures leave orphan auth users or workspaces despite the spec asking for best-effort cleanup. Recommended fix: on failure, best-effort delete the auth user and/or created workspace; deleting workspace should cascade `workspace_members`/`artist_profile`.

[FINDING 4] MED-A: `src/app/[locale]/onboarding/artist/_actions/complete-onboarding.ts:30` — `"@"` passes `.min(1)` before transform and stores an empty string, which makes the gate consider onboarding complete. Recommended fix: normalize first, then validate non-empty with an Instagram-safe regex and length check.

RLS audit: `instagram_handle` and `updated_at` are granted at migration lines 132-133, so `completeArtistOnboardingAction`’s user-scoped update is column-grant permitted. Invite provisioning uses `createSupabaseService()` after the yagi_admin check, writes deterministic `kind: "artist"`, uses `inviteData.user.id`, and writes the returned workspace id. KO new namespaces had no listed internal-term leakage; EN “Roster” is allowed. Targeted ESLint on scoped TS/TSX files passed.

Summary: core yagi_admin invite gating is sound, but owner-vs-member RLS and missing-profile gate handling need fixes before ff-merge.
