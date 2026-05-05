// Phase 6 Wave A.3 — Artist onboarding gate helper
//
// Called from src/app/[locale]/app/layout.tsx after the active workspace
// is resolved. If the active workspace is kind='artist' and the artist_profile
// row has instagram_handle IS NULL, the user has not completed onboarding
// and MUST be redirected to /[locale]/onboarding/artist.
//
// Returns the redirect path string if a redirect is required, null otherwise.
// The layout is responsible for calling redirect() — this helper is pure.
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
    // On error, don't block the user — let them through
    return null;
  }

  // instagram_handle IS NULL → onboarding not completed
  if (profile && profile.instagram_handle === null) {
    return `/${locale}/onboarding/artist`;
  }

  return null;
}
