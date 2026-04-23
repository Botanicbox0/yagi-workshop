// Onboarding redirect resolver — Phase 2.5 G2 §F Step 5.
//
// Centralizes the post-signup redirect path computation:
// - role/handle/profile fields not all set → redirect to next missing step
// - all set → redirect to /u/<handle> (creator/studio) or /challenges (observer)
//
// Used by: /api/onboarding/role/route.ts, /api/onboarding/profile/route.ts,
// auth callback (src/app/auth/callback/route.ts).

import type { ProfileRole } from "@/lib/app/context";

export type OnboardingProfile = {
  role: ProfileRole | null;
  handle: string | null;
  hasRoleChildRow: boolean;
};

export type OnboardingRedirect = {
  href: string;
  reason: "role_missing" | "profile_missing" | "complete";
};

/**
 * Compute the next onboarding step or final destination for a profile.
 *
 * Resumption-friendly: if user refreshes mid-onboarding, this returns
 * the appropriate next step based on current profile state.
 *
 * Conventions:
 *   role missing → /onboarding/role
 *   role set + (handle missing OR child row missing) → /onboarding/profile/<role>
 *   all set + role IN (creator,studio) → /u/<handle>
 *   all set + role = observer → /challenges
 */
export function resolveOnboardingRedirect(
  profile: OnboardingProfile
): OnboardingRedirect {
  if (profile.role === null) {
    return { href: "/onboarding/role", reason: "role_missing" };
  }

  if (profile.handle === null || !profile.hasRoleChildRow) {
    return {
      href: `/onboarding/profile/${profile.role}`,
      reason: "profile_missing",
    };
  }

  if (profile.role === "observer") {
    return { href: "/challenges", reason: "complete" };
  }

  return { href: `/u/${profile.handle}`, reason: "complete" };
}
