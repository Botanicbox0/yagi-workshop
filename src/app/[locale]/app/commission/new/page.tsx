import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { CommissionIntakeForm } from "@/components/commission/intake-form";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CommissionNewPage({ params }: Props) {
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

  return (
    <div className="max-w-3xl mx-auto px-6 md:px-8 py-12">
      <CommissionIntakeForm locale={locale === "en" ? "en" : "ko"} />
    </div>
  );
}
