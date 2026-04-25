import { redirect } from "@/i18n/routing";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { listOwnIntakes } from "@/lib/commission/queries";
import { Button } from "@/components/ui/button";
import { CommissionIntakeStatePill } from "@/components/commission/intake-state-pill";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CommissionListPage({ params }: Props) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect({ href: "/signin", locale });
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "client") {
    redirect({ href: "/app", locale });
    return null;
  }

  const intakes = await listOwnIntakes();
  const t = await getTranslations({ locale, namespace: "commission" });

  if (intakes.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 md:px-8 py-16 md:py-24">
        <div className="text-center space-y-6 border border-dashed border-border rounded-xl py-16 px-6">
          <h1 className="font-display text-2xl tracking-tight">
            <em>{t("list_empty_title")}</em>
          </h1>
          <p className="text-sm text-muted-foreground keep-all">
            {t("list_empty_sub")}
          </p>
          <Button asChild size="lg">
            <Link href={`/${locale}/app/commission/new`}>{t("list_empty_cta")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-8 py-12">
      <div className="flex items-baseline justify-between mb-10">
        <h1 className="font-display text-3xl tracking-tight">
          <em>{t("list_title")}</em>
        </h1>
        <Button asChild>
          <Link href={`/${locale}/app/commission/new`}>{t("list_new_cta")}</Link>
        </Button>
      </div>

      <ul className="border-t border-border">
        {intakes.map((intake) => (
          <li
            key={intake.id}
            className="border-b border-border py-5 flex items-center justify-between gap-4"
          >
            <div className="min-w-0">
              <Link
                href={`/${locale}/app/commission/${intake.id}`}
                className="font-display text-lg tracking-tight hover:underline underline-offset-4"
              >
                {intake.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-1">
                {t(
                  `category_${intake.category}` as "category_music_video",
                )}
                {" · "}
                {t(
                  `budget_${intake.budget_range}` as "budget_under_5m",
                )}
                {" · "}
                {new Date(intake.created_at).toLocaleDateString(locale)}
              </p>
            </div>
            <CommissionIntakeStatePill state={intake.state} locale={locale} />
          </li>
        ))}
      </ul>
    </div>
  );
}
