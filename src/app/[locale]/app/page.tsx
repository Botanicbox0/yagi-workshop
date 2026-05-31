// Role-aware /app landing.
//
// yagi_admin is resolved from the global role first. Non-admin users land by
// active workspace kind: brand -> Explore, artist -> Deals, creator -> open
// Campaigns. Users without a resolved workspace return to onboarding.

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import {
  getAppLandingHref,
  resolveAppActor,
} from "@/lib/app/role-routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AppLandingPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/signin`);

  const [active, isYagiAdmin] = await Promise.all([
    resolveActiveWorkspace(user.id),
    getIsYagiAdmin(supabase, user.id),
  ]);
  const actor = resolveAppActor(active, isYagiAdmin);
  redirect(getAppLandingHref(locale, actor));
}
