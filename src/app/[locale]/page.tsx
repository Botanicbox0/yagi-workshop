// Phase 6 HF3.3 — Landing surface deleted; route is redirect-only.
//
// Pre-launch (0-user) state: no need for the marketing landing page that
// Phase 4.x had assembled (HeroBlock + ServicesTriad + etc.). The
// post-Phase-6 product surface is the auth flow + workspace shell.
//
// Behavior:
//   - Unauthenticated → /[locale]/signin
//   - Authenticated   → /[locale]/app/projects
//
// Locale-aware redirect via next-intl @/i18n/routing helper preserves
// the prefix the user landed on.

import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect({ href: "/app/projects", locale });
  } else {
    redirect({ href: "/signin", locale });
  }
}
