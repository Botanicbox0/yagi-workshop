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
    if (role === "observer") {
      redirect({ href: "/challenges", locale });
      return null;
    }
    if (role === "creator" || role === "studio") {
      redirect({ href: `/u/${profile.handle}`, locale });
      return null;
    }
    // Legacy profile without Phase 2.5 role — send to app shell.
    redirect({ href: "/app", locale });
    return null;
  }

  const t = await getTranslations({ locale, namespace: "onboarding" });

  const roles: Array<{ key: ProfileRole; title: string; desc: string }> = [
    {
      key: "creator",
      title: t("role_v2_creator_title"),
      desc: t("role_v2_creator_desc"),
    },
    {
      key: "studio",
      title: t("role_v2_studio_title"),
      desc: t("role_v2_studio_desc"),
    },
    {
      key: "observer",
      title: t("role_v2_observer_title"),
      desc: t("role_v2_observer_desc"),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          <em>{t("role_v2_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground keep-all">
          {t("role_v2_sub")}
        </p>
      </div>
      <div className="grid gap-3">
        {roles.map((role) => (
          <Link
            key={role.key}
            href={`/onboarding/profile/${role.key}` as "/onboarding/profile/creator"}
            className="block rounded-lg border border-border p-5 hover:border-foreground transition-colors"
          >
            <p className="font-display text-xl tracking-tight mb-1">
              <em>{role.title}</em>
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
