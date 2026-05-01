import { redirect } from "@/i18n/routing";
import { getOnboardingState } from "@/lib/onboarding/state";

export default async function OnboardingEntryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const state = await getOnboardingState();

  if (!state) {
    redirect({ href: "/signin", locale });
    return null;
  }

  // Phase 4.x Wave C.5b sub_01 — persona A locked (Brand only). Role
  // selection flow retired; first-touch onboarding is the workspace
  // (= company) form regardless of profile state. Users who already
  // have a workspace go straight to /app.
  if (state.workspaceMembershipCount >= 1 || state.hasGlobalRole) {
    redirect({ href: "/app", locale });
    return null;
  }

  redirect({ href: "/onboarding/workspace", locale });
  return null;
}
