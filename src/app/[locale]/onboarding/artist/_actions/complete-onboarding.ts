"use server";

// =============================================================================
// Phase 6 Wave A.3 — completeArtistOnboardingAction
//
// The Artist completes the 1-step onboarding form by supplying their
// Instagram handle. This is the only field required before they can access
// the main app surface.
//
// Uses the regular user-scoped createSupabaseServer() client — the
// column GRANT from the A.1 migration allows authenticated users to
// UPDATE (display_name, short_bio, instagram_handle, updated_at), and
// the artist_profile_update RLS policy gates by workspace_members
// membership, so no service-role bypass is needed here.
//
// Security posture (L-049 4-perspective audit):
//   1. client (workspace_member of the Artist workspace) → permitted
//   2. ws_admin (different workspace)                   → blocked by RLS USING
//   3. yagi_admin                                        → permitted via is_yagi_admin
//   4. different-user same-workspace                    → blocked by RLS USING
//
// Idempotency: if instagram_handle IS NOT NULL the caller has already
// completed onboarding. We return 'forbidden' so a double-submit or
// link re-visit does not silently overwrite the handle.
// =============================================================================

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { validateInstagramHandle } from "@/lib/handles/instagram";

// K-05 LOOP-2 hardening: validate via the shared validateInstagramHandle()
// rather than a local regex. The shared validator enforces the full Instagram
// rule set (1-30, letters/digits/period/underscore, no consecutive dots, no
// leading/trailing dot) AND returns a canonical (lowercased) form, matching
// the rest of the codebase (Phase 2.5 G2). LOOP-1 fixed the empty-after-strip
// case; LOOP-2 closes the gap on dot-edge handles like ".yagi" or "ya..gi".
const completeOnboardingInput = z.object({
  instagramHandle: z.string().min(1).max(64),
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
  // 1. Validate input — first the surface shape via zod, then the
  //    Instagram-handle rule set via the shared validator (Phase 2.5 G2).
  //    The validator strips leading @, rejects empty/too-long/invalid-chars/
  //    consecutive-dots/leading-or-trailing-dot, and returns a canonical
  //    (lowercased) form for storage.
  const parsed = completeOnboardingInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", message: parsed.error.message };
  }
  const handleResult = validateInstagramHandle(parsed.data.instagramHandle);
  if (!handleResult.valid) {
    return { ok: false, error: "validation", message: handleResult.error ?? "invalid" };
  }
  const instagramHandle = handleResult.canonical;

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
