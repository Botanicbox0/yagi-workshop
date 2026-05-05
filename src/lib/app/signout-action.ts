"use server";

// Phase 6 HF3.2: redirect to /signin (locale-aware) instead of "/" (which
// previously landed on the marketing home page; that surface is being
// removed in HF3.3 and the user-facing post-logout destination is the
// auth surface).

import { getLocale } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";

export async function signOutAction() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  const locale = await getLocale();
  redirect({ href: "/signin", locale });
}
