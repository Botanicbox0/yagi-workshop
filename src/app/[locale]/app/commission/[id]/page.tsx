import { redirect } from "@/i18n/routing";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getOwnIntakeById } from "@/lib/commission/queries";
import { CommissionIntakeStatePill } from "@/components/commission/intake-state-pill";
import { Button } from "@/components/ui/button";
import { createSupabaseServer } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function CommissionIntakeDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const intake = await getOwnIntakeById(id);
  if (!intake) notFound();

  const t = await getTranslations({ locale, namespace: "commission" });
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-12 space-y-10">
      <header className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/${locale}/app/commission`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t("back_to_list")}
          </Link>
          <CommissionIntakeStatePill state={intake.state} locale={locale} />
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight keep-all">
          {intake.title}
        </h1>
        <p className="text-xs text-muted-foreground">
          {t(`category_${intake.category}` as "category_music_video")}
          {" · "}
          {t(`budget_${intake.budget_range}` as "budget_under_5m")}
          {" · "}
          {dateFmt.format(new Date(intake.created_at))}
        </p>
      </header>

      {intake.state === "submitted" && (
        <section className="rounded-lg border border-border bg-muted/30 p-5 space-y-2">
          <p className="font-medium text-sm">{t("status_submitted_title")}</p>
          <p className="text-sm text-muted-foreground keep-all">
            {t("status_submitted_sub")}
          </p>
        </section>
      )}

      {intake.state === "admin_responded" && intake.admin_response_md && (
        <section className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">{t("status_responded_title")}</p>
            {intake.admin_responded_at && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {dateFmt.format(new Date(intake.admin_responded_at))}
              </span>
            )}
          </div>
          <article className="prose prose-sm max-w-none whitespace-pre-wrap">
            {intake.admin_response_md}
          </article>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
          {t("field_brief")}
        </h2>
        <article className="prose prose-sm max-w-none whitespace-pre-wrap">
          {intake.brief_md}
        </article>
      </section>

      {intake.timestamp_notes && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
            {t("field_timestamps")}
          </h2>
          <article className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-mono whitespace-pre-wrap">
            {intake.timestamp_notes}
          </article>
        </section>
      )}

      {intake.reference_urls.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
            {t("field_references")}
          </h2>
          <ul className="space-y-1.5">
            {intake.reference_urls.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground transition-colors break-all"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {intake.deadline_preference && (
        <section className="space-y-1">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
            {t("field_deadline")}
          </h2>
          <p className="text-sm">
            {new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }).format(new Date(intake.deadline_preference))}
          </p>
        </section>
      )}

      <div className="pt-6 border-t border-border flex gap-3">
        <Button asChild variant="outline">
          <Link href={`/${locale}/app/commission`}>{t("back_to_list")}</Link>
        </Button>
      </div>
    </div>
  );
}
