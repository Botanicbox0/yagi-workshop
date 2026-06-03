import { AlertTriangle, ArrowRight, CheckCircle2, CreditCard, KeyRound } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { cn } from "@/lib/utils";
import { CompanyLegalFooter } from "@/components/legal/company-legal-footer";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BillingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing_page" });

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const [isYagiAdmin, activeWorkspace] = await Promise.all([
    getIsYagiAdmin(supabase, user.id),
    resolveActiveWorkspace(user.id),
  ]);
  const showOperationsConsole =
    isYagiAdmin && activeWorkspace?.kind === "yagi_admin";
  const popbill = showOperationsConsole
    ? (await import("@/lib/popbill/client")).getPopbillConfigStatus()
    : null;

  return (
    <main className="mx-auto flex w-full max-w-content flex-col gap-8 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
      <section className="rounded-lg border border-border/70 bg-surface-raised p-5 sm:p-6 lg:p-8">
        <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-label text-brand">
          <CreditCard className="h-4 w-4" aria-hidden="true" />
          {t("eyebrow")}
        </p>
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="font-sans text-3xl font-bold leading-tight tracking-normal text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base keep-all">
              {showOperationsConsole ? t("description_admin") : t("description_general")}
            </p>
          </div>
          <Link
            href={showOperationsConsole ? "/app/admin/invoices" : "/app/invoices"}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 bg-surface-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60"
          >
            {showOperationsConsole ? t("admin_invoices") : t("received_invoices")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {showOperationsConsole && popbill ? (
        <>
          <section className="grid gap-4 lg:grid-cols-3">
            <StatusCard
              title={t("mode_title")}
              value={popbill.mode.toUpperCase()}
              description={
                popbill.mode === "production"
                  ? t("mode_production_description")
                  : t("mode_test_description")
              }
              tone={popbill.mode === "production" ? "danger" : "info"}
            />
            <StatusCard
              title={t("config_title")}
              value={popbill.configured ? t("ready") : t("missing")}
              description={
                popbill.configured
                  ? t("config_ready_description")
                  : t("config_missing_description", {
                      names: popbill.missing_variables.join(", "),
                    })
              }
              tone={popbill.configured ? "success" : "warning"}
            />
            <StatusCard
              title={t("live_guard_title")}
              value={popbill.live_issue_enabled ? t("enabled") : t("locked")}
              description={
                popbill.live_issue_enabled
                  ? t("live_guard_enabled_description")
                  : t("live_guard_locked_description")
              }
              tone={popbill.live_issue_enabled ? "warning" : "success"}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-lg border border-border/70 bg-surface-card p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <KeyRound className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {t("popbill_title")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
                    {t("popbill_description")}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                {popbill.env_variable_names.map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-surface-card-deep px-3 py-2"
                  >
                    <code className="text-xs text-foreground">{name}</code>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        popbill.missing_variables.includes(name)
                          ? "text-warning-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {popbill.missing_variables.includes(name)
                        ? t("env_missing")
                        : t("env_policy")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border/70 bg-surface-card p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-foreground">
                {t("checklist_title")}
              </h2>
              <div className="mt-5 grid gap-3">
                <ChecklistItem done={popbill.configured} label={t("check_env")} />
                <ChecklistItem done={false} label={t("check_cert")} />
                <ChecklistItem done={!popbill.ip_restrict_on_off} label={t("check_ip")} />
                <ChecklistItem done={popbill.mode !== "production"} label={t("check_test_mode")} />
                <ChecklistItem done={!popbill.live_issue_enabled} label={t("check_live_guard")} />
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/app/admin/deals"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-brand-on transition-colors hover:bg-brand/90"
                >
                  {t("billing_operations")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  href="/app/admin/invoices"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-border/70 bg-surface-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60"
                >
                  {t("admin_invoices")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="https://developers.popbill.com/guide/taxinvoice/getting-started/environment-set-up"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center rounded-full border border-border/70 bg-surface-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/60"
                >
                  {t("popbill_docs")}
                </a>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-lg border border-border/70 bg-surface-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {t("customer_title")}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
            {t("customer_description")}
          </p>
        </section>
      )}

      <CompanyLegalFooter compact />
    </main>
  );
}

function StatusCard({
  title,
  value,
  description,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  tone: "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-label text-muted-foreground">
          {title}
        </p>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-semibold",
            tone === "success" && "bg-success text-success-foreground",
            tone === "warning" && "bg-warning text-warning-foreground",
            tone === "danger" && "bg-destructive text-destructive-foreground",
            tone === "info" && "bg-info text-info-foreground",
          )}
        >
          {value}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground keep-all">
        {description}
      </p>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  const Icon = done ? CheckCircle2 : AlertTriangle;

  return (
    <div className="flex items-start gap-3 rounded-md border border-border/70 bg-surface-card-deep px-3 py-3">
      <Icon
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0",
          done ? "text-success-foreground" : "text-warning-foreground",
        )}
        aria-hidden="true"
      />
      <p className="text-sm leading-5 text-foreground keep-all">{label}</p>
    </div>
  );
}
