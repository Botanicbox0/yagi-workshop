// Phase 6 Wave A.3 — /[locale]/onboarding/artist
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
    // No artist workspace — shouldn't happen post-invite; fall back to notFound
    notFound();
  }

  // Fetch artist_profile for display_name
  const { data: profile } = await supabase
    .from("artist_profile")
    .select("display_name, instagram_handle")
    .eq("workspace_id", artistMember.workspace_id)
    .maybeSingle();

  // If instagram_handle is already set → onboarding already done, redirect to app
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
