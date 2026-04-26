import { redirect } from "@/i18n/routing";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CommissionIntakeStatePill } from "@/components/commission/intake-state-pill";
import { CommissionAdminResponseForm } from "@/components/commission/admin-response-form";
import { CommissionConvertButton } from "./convert-button";
import type { CommissionIntake } from "@/lib/commission/types";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

type AdminIntakeRow = CommissionIntake & {
  clients: { company_name: string; contact_name: string; contact_email: string; contact_phone: string | null; website_url: string | null } | null;
};

export default async function AdminCommissionDetailPage({ params }: Props) {
  const { locale, id } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }
  const { data: isAdmin } = await supabase.rpc("is_yagi_admin", {
    uid: user.id,
  });
  if (!isAdmin) {
    redirect({ href: "/app", locale });
    return null;
  }

  const { data } = await supabase
    .from("commission_intakes")
    .select(
      "id, client_id, title, category, budget_range, deadline_preference, reference_urls, reference_uploads, brief_md, timestamp_notes, state, admin_response_md, admin_responded_at, admin_responded_by, created_at, updated_at, converted_to_project_id, clients!inner(company_name, contact_name, contact_email, contact_phone, website_url)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const intake = data as unknown as AdminIntakeRow;

  const t = await getTranslations({ locale, namespace: "admin_commission" });
  const tC = await getTranslations({ locale, namespace: "commission" });
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
            href={`/${locale}/app/admin/commissions`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {t("back_to_queue")}
          </Link>
          <CommissionIntakeStatePill state={intake.state} locale={locale} />
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight keep-all">
          {intake.title}
        </h1>
        {/* Phase 2.8.1 G_B1-H — Workshop 생성 (admin convert) primary CTA.
            Visible while the intake is in {submitted, admin_responded}. Once
            converted, the same row shows a deep link to the resulting Brief
            Board so admin can return to it easily. */}
        {(intake.state === "submitted" || intake.state === "admin_responded") && (
          <div className="pt-3">
            <CommissionConvertButton
              commissionId={intake.id}
              label={t("convert_button")}
              successText={t("convert_success")}
              errorText={t("convert_error")}
            />
            <p className="text-xs text-muted-foreground mt-2 keep-all">
              {t("convert_hint")}
            </p>
          </div>
        )}
        {intake.state === "converted" && intake.converted_to_project_id && (
          <div className="pt-3">
            <Link
              href={`/${locale}/app/projects/${intake.converted_to_project_id}?tab=brief`}
              className="inline-block text-sm underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
            >
              → {t("converted_link")}
            </Link>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {tC(`category_${intake.category}` as "category_music_video")}
          {" · "}
          {tC(`budget_${intake.budget_range}` as "budget_under_5m")}
          {" · "}
          {dateFmt.format(new Date(intake.created_at))}
        </p>
      </header>

      <section className="rounded-lg border border-border bg-muted/20 p-5 space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
          {t("client_info")}
        </h2>
        {intake.clients && (
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("company_name")}
              </dt>
              <dd>{intake.clients.company_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("contact_name")}
              </dt>
              <dd>{intake.clients.contact_name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("contact_email")}
              </dt>
              <dd>
                <a
                  href={`mailto:${intake.clients.contact_email}`}
                  className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                >
                  {intake.clients.contact_email}
                </a>
              </dd>
            </div>
            {intake.clients.contact_phone && (
              <div>
                <dt className="text-xs text-muted-foreground">
                  {t("contact_phone")}
                </dt>
                <dd>{intake.clients.contact_phone}</dd>
              </div>
            )}
            {intake.clients.website_url && (
              <div className="md:col-span-2">
                <dt className="text-xs text-muted-foreground">
                  {t("website")}
                </dt>
                <dd>
                  <a
                    href={intake.clients.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground break-all"
                  >
                    {intake.clients.website_url}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
          {tC("field_brief")}
        </h2>
        <article className="prose prose-sm max-w-none whitespace-pre-wrap">
          {intake.brief_md}
        </article>
      </section>

      {intake.timestamp_notes && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
            {tC("field_timestamps")}
          </h2>
          <article className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm font-mono whitespace-pre-wrap">
            {intake.timestamp_notes}
          </article>
        </section>
      )}

      {intake.reference_urls.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs uppercase tracking-wide text-muted-foreground/70 font-medium">
            {tC("field_references")}
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
            {tC("field_deadline")}
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

      <section className="space-y-3 pt-4 border-t border-border">
        <h2 className="font-display text-xl tracking-tight">
          {t("response_section_title")}
        </h2>
        {intake.state === "submitted" ? (
          <CommissionAdminResponseForm intakeId={intake.id} />
        ) : (
          <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">
                {t("response_already_sent")}
              </p>
              {intake.admin_responded_at && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {dateFmt.format(new Date(intake.admin_responded_at))}
                </span>
              )}
            </div>
            <article className="prose prose-sm max-w-none whitespace-pre-wrap">
              {intake.admin_response_md}
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
