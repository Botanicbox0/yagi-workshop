import { redirect } from "@/i18n/routing";

// Phase 1.1 legacy route — redirected to Phase 2.5 role selection.
// Kept for backward compatibility of in-flight onboarding sessions.
// Scheduled for deletion per G2 DP §G "Modified files (existing)".
export default async function LegacyOnboardingProfileRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/onboarding/role", locale });
  return null;
}
