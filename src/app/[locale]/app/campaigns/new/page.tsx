import { ArrowLeft, Megaphone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { getIsYagiAdmin } from "@/lib/app/admin";
import { getAppLandingPath, resolveAppActor } from "@/lib/app/role-routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { CampaignRequestForm } from "./campaign-request-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function NewCampaignPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("campaigns_app.new");
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const active = await resolveActiveWorkspace(user.id);
  if (!active) {
    redirect({ href: "/onboarding", locale });
    return null;
  }
  const actor = resolveAppActor(
    active,
    await getIsYagiAdmin(supabase, user.id),
  );
  if (actor !== "brand") {
    redirect({ href: actor ? getAppLandingPath(actor) : "/onboarding", locale });
    return null;
  }

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/app/campaigns"
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <header className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
          <Megaphone className="h-4 w-4" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <h1 className="max-w-3xl font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
          {t("description")}
        </p>
      </header>
      <CampaignRequestForm />
    </main>
  );
}
