import { createSupabaseServer } from "@/lib/supabase/server";

export type OnboardingState = {
  userId: string;
  hasProfile: boolean;
  locale: "ko" | "en";
  workspaceMembershipCount: number;
  hasGlobalRole: boolean;
};

export async function getOnboardingState(): Promise<OnboardingState | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const { count: workspaceMembershipCount } = await supabase
    .from("workspace_members")
    .select("workspace_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: globalRoles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .is("workspace_id", null)
    .in("role", ["creator", "yagi_admin"]);

  return {
    userId: user.id,
    hasProfile: !!profile,
    locale: (profile?.locale ?? "ko") as "ko" | "en",
    workspaceMembershipCount: workspaceMembershipCount ?? 0,
    hasGlobalRole: (globalRoles?.length ?? 0) > 0,
  };
}
