import { ArrowLeft, FileText, Music, UploadCloud } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import {
  getAppLandingPath,
  resolveAppActor,
} from "@/lib/app/role-routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ArtistProjectRequestStubPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations("studio_request");
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

  const actor = resolveAppActor(active, await getIsYagiAdmin(supabase, user.id));
  if (actor !== "artist" && actor !== "yagi_admin") {
    redirect({ href: actor ? getAppLandingPath(actor) : "/onboarding", locale });
    return null;
  }
  const backHref = actor === "yagi_admin" ? "/app/admin" : "/app/explore";

  const steps = [
    { key: "audio", Icon: Music },
    { key: "brief", Icon: FileText },
    { key: "upload", Icon: UploadCloud },
  ] as const;

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>

      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
          <Music className="h-4 w-4" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <div className="max-w-3xl">
          <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl lg:text-5xl keep-all">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
            {t("description")}
          </p>
        </div>
        <div className="mt-6 inline-flex rounded-full border border-gold/25 bg-gold-soft px-3 py-1 text-xs font-semibold uppercase tracking-label text-gold">
          {t("status")}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {steps.map(({ key, Icon }) => (
          <article
            key={key}
            className="rounded-lg border border-border/70 bg-surface-card p-5"
          >
            <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-md bg-surface-raised text-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="text-base font-semibold text-foreground keep-all">
              {t(`steps.${key}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
              {t(`steps.${key}.description`)}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
