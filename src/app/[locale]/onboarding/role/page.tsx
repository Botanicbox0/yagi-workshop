import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ProfileRole } from "@/lib/app/context";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function OnboardingRolePage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, role")
    .eq("id", user.id)
    .maybeSingle();

  // If profile already set up, route to final destination.
  if (profile && profile.handle) {
    const role = profile.role as ProfileRole | null;
    // Phase 2.8.1 G_B1-X: viewer/voter (observer) is deferred to Phase 3.0+
    // Contest surface where it becomes anonymous-OTP, not a profile role.
    // Legacy observer profiles are routed to the same destination as a
    // generic logged-in user — challenges public surface — but new signups
    // can no longer pick observer. See DECISIONS_CACHE Q-088.
    if (role === "observer") {
      redirect({ href: "/challenges", locale });
      return null;
    }
    // Phase 2.8.1 G_B1-X: "studio" merged into "creator" at the UI level
    // (single card labeled "AI 크리에이터/스튜디오"). Legacy studio profiles
    // continue to land on their handle page exactly like creators do.
    if (role === "creator" || role === "studio") {
      redirect({ href: `/u/${profile.handle}`, locale });
      return null;
    }
    if (role === "client") {
      // Phase 2.8.2 hotfix: client landing → projects hub (was /app/commission/new).
      // Yagi feedback 2026-04-27: commission flow lives inside the hub, the hub
      // is the right first impression.
      redirect({ href: "/app/projects", locale });
      return null;
    }
    // Legacy profile without Phase 2.5 role — send to app shell.
    redirect({ href: "/app", locale });
    return null;
  }

  const t = await getTranslations({ locale, namespace: "onboarding" });

  // Phase 2.8.1 G_B1-X: simplified to two roles per founder decision
  // 2026-04-26 (DECISIONS_CACHE Q-088). Studio merged into creator under
  // the label "AI 크리에이터/스튜디오". Observer (viewer/voter) is moved to
  // Phase 3.0+ Contest as anonymous-OTP and removed from profile signup.
  const roles: Array<{ key: ProfileRole; title: string; desc: string }> = [
    {
      key: "creator",
      title: t("role_v2_creator_title"),
      desc: t("role_v2_creator_desc"),
    },
    {
      key: "client",
      title: t("role_v2_client_title"),
      desc: t("role_v2_client_desc"),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          {t("role_v2_title")}
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("role_v2_sub")}
        </p>
      </div>
      <div className="grid gap-3">
        {roles.map((role) => (
          <Link
            key={role.key}
            // Cast to one of the known onboarding paths; next-intl is strict
            // on Link href shape but all these paths share the same prefix.
            href={
              `/onboarding/profile/${role.key}` as
                | "/onboarding/profile/creator"
                | "/onboarding/profile/client"
            }
            className="block rounded-lg border border-border p-5 hover:border-foreground transition-colors"
          >
            <p className="font-display text-xl tracking-tight mb-1">
              {role.title}
            </p>
            <p className="text-sm text-muted-foreground keep-all">
              {role.desc}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
