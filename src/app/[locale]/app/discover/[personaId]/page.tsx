import { ArrowLeft, Handshake } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { DealProposalForm } from "../deal-proposal-form";
import { listDiscoverablePersonas } from "../data";
import { PersonaCover } from "../persona-cover";

type Props = {
  params: Promise<{ locale: string; personaId: string }>;
};

export default async function DiscoverDetailPage({ params }: Props) {
  const { locale, personaId } = await params;
  const t = await getTranslations({ locale, namespace: "discover.detail" });
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
  if (active.kind !== "brand") {
    redirect({ href: "/app", locale });
    return null;
  }

  const { data: personas, error } = await listDiscoverablePersonas(supabase);
  if (error) {
    console.error("[DiscoverDetailPage] list_discoverable_personas error:", error);
  }
  const persona = personas.find((item) => item.id === personaId);
  if (!persona) notFound();

  const moneyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  });

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href="/app/discover"
        className="inline-flex w-fit items-center gap-2 rounded-full text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>

      <section className="overflow-hidden rounded-lg border border-border/70 bg-surface-raised">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <div className="border-b border-border/70 lg:border-b-0 lg:border-r">
            <PersonaCover
              src={persona.cover_asset_path}
              emptyLabel={t("no_cover")}
            />
            <div className="space-y-5 p-5 sm:p-6 lg:p-8">
              <div className="space-y-3">
                <span className="inline-flex h-6 items-center rounded px-2 text-[11px] font-medium uppercase tracking-label bg-gold-soft text-gold">
                  {persona.persona_type ?? t("default_type")}
                </span>
                <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
                  {persona.name ?? t("untitled")}
                </h1>
              </div>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base keep-all">
                {persona.description ?? t("no_description")}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric
                  label={t("fee_label")}
                  value={
                    persona.min_fee !== null
                      ? t("fee_from", {
                          amount: moneyFormatter.format(persona.min_fee),
                        })
                      : t("fee_negotiable")
                  }
                />
                <Metric label={t("status_label")} value={t("status_active")} />
              </div>
            </div>
          </div>

          <aside className="bg-surface p-5 sm:p-6 lg:p-8">
            <div className="mb-6">
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
                <Handshake className="h-4 w-4" aria-hidden="true" />
                {t("proposal_eyebrow")}
              </p>
              <h2 className="text-2xl font-bold text-foreground keep-all">
                {t("proposal_title")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground keep-all">
                {t("proposal_description")}
              </p>
            </div>
            <DealProposalForm personaId={persona.id} />
          </aside>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-4">
      <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold text-foreground keep-all">
        {value}
      </p>
    </div>
  );
}
