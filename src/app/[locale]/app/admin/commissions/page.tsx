import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { listAdminIntakeQueue } from "@/lib/commission/queries";
import { CommissionIntakeStatePill } from "@/components/commission/intake-state-pill";
import { cn } from "@/lib/utils";
import type { CommissionIntakeState } from "@/lib/commission/types";

const STATE_FILTERS: { key: "all" | CommissionIntakeState; labelKey: string }[] =
  [
    { key: "all", labelKey: "filter_all" },
    { key: "submitted", labelKey: "filter_submitted" },
    { key: "admin_responded", labelKey: "filter_responded" },
    { key: "closed", labelKey: "filter_closed" },
    { key: "archived", labelKey: "filter_archived" },
  ];

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ state?: string }>;
};

export default async function AdminCommissionsPage({
  params,
  searchParams,
}: Props) {
  const { locale } = await params;
  const { state: stateParam } = await searchParams;

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

  const validStates: CommissionIntakeState[] = [
    "submitted",
    "admin_responded",
    "closed",
    "archived",
  ];
  const activeFilter =
    stateParam && validStates.includes(stateParam as CommissionIntakeState)
      ? (stateParam as CommissionIntakeState)
      : undefined;

  const intakes = await listAdminIntakeQueue({ state: activeFilter });
  const t = await getTranslations({ locale, namespace: "admin_commission" });
  const tCommon = await getTranslations({ locale, namespace: "commission" });
  const dateFmt = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-8 py-12">
      <header className="space-y-2 mb-8">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("queue_title")}</em>
        </h1>
        <p className="text-sm text-muted-foreground">{t("queue_sub")}</p>
      </header>

      <nav className="flex flex-wrap gap-1 mb-6 -mx-1" aria-label="state filter">
        {STATE_FILTERS.map((f) => {
          const isActive = (f.key === "all" && !activeFilter) || f.key === activeFilter;
          const href =
            f.key === "all"
              ? `/${locale}/app/admin/commissions`
              : `/${locale}/app/admin/commissions?state=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs transition-colors",
                isActive
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {t(f.labelKey as "filter_all")}
            </Link>
          );
        })}
      </nav>

      {intakes.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-16 text-center text-sm text-muted-foreground">
          {t("queue_empty")}
        </div>
      ) : (
        <ul className="border-t border-border">
          {intakes.map((intake) => (
            <li
              key={intake.id}
              className="border-b border-border py-4 grid grid-cols-12 items-center gap-4"
            >
              <div className="col-span-12 md:col-span-6 min-w-0">
                <Link
                  href={`/${locale}/app/admin/commissions/${intake.id}`}
                  className="font-display text-base tracking-tight hover:underline underline-offset-4"
                >
                  {intake.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {intake.client?.company_name ?? "—"}
                  {" · "}
                  {intake.client?.contact_name ?? ""}
                </p>
              </div>
              <div className="col-span-6 md:col-span-3 text-xs text-muted-foreground">
                {tCommon(`category_${intake.category}` as "category_music_video")}
                <span className="mx-2 opacity-40">·</span>
                {tCommon(`budget_${intake.budget_range}` as "budget_under_5m")}
              </div>
              <div className="col-span-3 md:col-span-2 text-xs text-muted-foreground tabular-nums">
                {dateFmt.format(new Date(intake.created_at))}
              </div>
              <div className="col-span-3 md:col-span-1 flex justify-end">
                <CommissionIntakeStatePill state={intake.state} locale={locale} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
