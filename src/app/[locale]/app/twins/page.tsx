import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "@/i18n/routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { TwinPersonaManager } from "@/components/twins/twin-persona-manager";
import { listMyPersonas } from "./actions";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function TwinsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "twins" });

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

  if (active.kind !== "artist") {
    notFound();
  }

  const { data: profile } = await supabase
    .from("artist_profile")
    .select("display_name")
    .eq("workspace_id", active.id)
    .maybeSingle();

  const personaResult = await listMyPersonas({
    artistWorkspaceId: active.id,
  });
  if (!personaResult.ok) {
    console.error("[TwinsPage] listMyPersonas error:", personaResult);
  }

  const fallbackName = profile?.display_name ?? active.name;
  const personas = personaResult.ok ? (personaResult.personas ?? []) : [];

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-label text-brand">
            {t("eyebrow")}
          </p>
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
            {t("description")}
          </p>
        </div>
      </section>

      <TwinPersonaManager
        artistWorkspaceId={active.id}
        fallbackName={fallbackName}
        personas={personas}
        locale={locale}
        labels={{
          emptyTitle: t("empty.title"),
          emptyDescription: t("empty.description"),
          createTitle: t("create.title"),
          nameLabel: t("fields.name"),
          namePlaceholder: t("fields.name_placeholder"),
          typeLabel: t("fields.type"),
          typePlaceholder: t("fields.type_placeholder"),
          descriptionLabel: t("fields.description"),
          descriptionPlaceholder: t("fields.description_placeholder"),
          create: t("actions.create"),
          creating: t("actions.creating"),
          save: t("actions.save"),
          saving: t("actions.saving"),
          selfTwin: t("self_twin"),
          statusActive: t("status.active"),
          statusPaused: t("status.paused"),
          toggleToActive: t("actions.activate"),
          toggleToPaused: t("actions.pause"),
          pausedHelp: t("paused_help"),
          feeTitle: t("fee.title"),
          feeLabel: t("fee.label"),
          feePlaceholder: t("fee.placeholder"),
          feePublic: t("fee.public"),
          feePrivate: t("fee.private"),
          feeUnset: t("fee.unset"),
          visualEmpty: t("visual_empty"),
          successCreate: t("toast.create_success"),
          successUpdate: t("toast.update_success"),
          successStatus: t("toast.status_success"),
          successFee: t("toast.fee_success"),
          errorValidation: t("toast.validation_error"),
          errorGeneric: t("toast.generic_error"),
        }}
      />
    </main>
  );
}
