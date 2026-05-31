// Role-aware /app landing.
//
// The active workspace kind drives the landing target. yagi_admin falls back to
// /app/admin when the active workspace is the internal admin workspace or there
// is no role-specific workspace selection.

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
