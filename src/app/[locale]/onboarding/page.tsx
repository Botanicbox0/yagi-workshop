import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { getOnboardingState } from "@/lib/onboarding/state";
import { redirect } from "@/i18n/routing";

export default async function OnboardingRolePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const state = await getOnboardingState();

  if (!state) {
    redirect({ href: "/signin", locale });
    return null;
  }

  if (!state.hasProfile) {
    return <RoleChoice />;
  }

  // Profile exists — gate further routing on workspace membership / global role.
  if (state.workspaceMembershipCount >= 1 || state.hasGlobalRole) {
    redirect({ href: "/app", locale });
    return null;
  }

  // Has profile but no workspace and no global role — finish the workspace step.
  redirect({ href: "/onboarding/workspace", locale });
  return null;
}

function RoleChoice() {
  const t = useTranslations("onboarding");

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="font-display text-3xl tracking-tight keep-all">
          <em>{t("role_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground keep-all">{t("role_sub")}</p>
      </div>
      <div className="grid gap-3">
        <Link
          href="/onboarding/profile?role=client"
          className="block rounded-lg border border-border p-5 hover:border-foreground transition-colors"
        >
          <p className="font-display text-xl tracking-tight mb-1"><em>{t("role_client_title")}</em></p>
          <p className="text-sm text-muted-foreground keep-all">{t("role_client_desc")}</p>
        </Link>
        <Link
          href="/onboarding/profile?role=creator"
          className="block rounded-lg border border-border p-5 hover:border-foreground transition-colors"
        >
          <p className="font-display text-xl tracking-tight mb-1"><em>{t("role_creator_title")}</em></p>
          <p className="text-sm text-muted-foreground keep-all">{t("role_creator_desc")}</p>
        </Link>
      </div>
    </div>
  );
}
