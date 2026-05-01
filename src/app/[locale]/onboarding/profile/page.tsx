import { redirect } from "@/i18n/routing";

// Phase 4.x Wave C.5b sub_01 — persona A locked. Legacy /onboarding/profile
// entry now bounces to workspace creation (Brand persona's only step).
export default async function LegacyOnboardingProfileRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/onboarding/workspace", locale });
  return null;
}
