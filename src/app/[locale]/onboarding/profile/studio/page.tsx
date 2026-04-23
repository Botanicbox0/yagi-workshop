import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import { StudioForm } from "./studio-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingStudioPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  return <StudioForm defaultContactEmail={user.email ?? ""} />;
}
