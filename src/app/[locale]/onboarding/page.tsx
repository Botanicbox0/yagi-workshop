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

  if (!state.hasProfile) {
    // Phase 2.5 default: new users land on role selection.
    redirect({ href: "/onboarding/role", locale });
    return null;
  }

  // Profile exists — route legacy Phase 1.1 users based on workspace state.
  if (state.workspaceMembershipCount >= 1 || state.hasGlobalRole) {
    redirect({ href: "/app", locale });
    return null;
  }

  // Profile but no workspace and no global role — complete legacy workspace step.
  redirect({ href: "/onboarding/workspace", locale });
  return null;
}
