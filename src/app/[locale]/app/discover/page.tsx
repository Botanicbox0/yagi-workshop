import type { CSSProperties } from "react";
import { Compass, ImageIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { listDiscoverablePersonas } from "./data";
import { PersonaCover } from "./persona-cover";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function DiscoverPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "discover" });
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
    console.error("[DiscoverPage] list_discoverable_personas error:", error);
  }

  const moneyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  });

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <div className="max-w-3xl">
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
            <Compass className="h-4 w-4" aria-hidden="true" />
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

      {personas.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {personas.map((persona, index) => (
            <Link
              key={persona.id}
              href={`/app/discover/${persona.id}`}
              className="stagger-item group overflow-hidden rounded-lg border border-border/70 bg-surface-card transition duration-flora ease-flora hover:-translate-y-0.5 hover:border-border hover:bg-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ "--i": index } as CSSProperties}
            >
              <PersonaCover
                src={persona.cover_asset_path}
                emptyLabel={t("card.no_cover")}
              />
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <span className="inline-flex h-6 items-center rounded px-2 text-[11px] font-medium uppercase tracking-label bg-gold-soft text-gold">
                    {persona.persona_type ?? t("card.default_type")}
                  </span>
                  <h2 className="text-xl font-semibold text-foreground keep-all">
                    {persona.name ?? t("card.untitled")}
                  </h2>
                  <p className="line-clamp-2 min-h-12 text-sm leading-6 text-muted-foreground keep-all">
                    {persona.description ?? t("card.no_description")}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                  <span className="text-sm font-semibold text-foreground">
                    {persona.min_fee !== null
                      ? t("card.from", {
                          amount: moneyFormatter.format(persona.min_fee),
                        })
                      : t("card.negotiable")}
                  </span>
                  <span className="text-xs text-muted-foreground">{t("card.cta")}</span>
                </div>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-border/70 bg-surface-card-deep p-8">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-md bg-gold-soft text-gold">
              <ImageIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-foreground keep-all">
              {t("empty.title")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground keep-all">
              {t("empty.description")}
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
