// Onboarding redirect resolver — Phase 4.x Wave C.5b sub_01 simplified.
//
// Phase 2.5 introduced a 3-step flow (role → profile → /u/<handle>) for
// creator/studio/observer/client personae. Phase 4.x locks persona A
// (Brand only) and retires the role step entirely; first-touch
// onboarding is the workspace form.
//
// This module is retained as a thin compat shim for any caller still
// importing `resolveOnboardingRedirect`. All non-completed flows now
// route to /onboarding/workspace.

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

export function resolveOnboardingRedirect(
  profile: OnboardingProfile
): OnboardingRedirect {
  if (profile.role === null) {
    return { href: "/onboarding/workspace", reason: "role_missing" };
  }

  if (profile.handle === null || !profile.hasRoleChildRow) {
    return { href: "/onboarding/workspace", reason: "profile_missing" };
  }

  return { href: "/app", reason: "complete" };
}
