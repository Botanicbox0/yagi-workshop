import { redirect } from "next/navigation";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { GuestAcceptMagicLinkForm } from "@/components/auth/guest-accept-magic-link-form";
import { createSupabaseServer } from "@/lib/supabase/server";
import { acceptGuestInvitation } from "@/app/[locale]/auth/accept-guest/_actions/accept-guest-invitation";

type Props = {
  params: Promise<{ locale: string; token: string }>;
};

export default async function AcceptGuestPage({ params }: Props) {
  const { locale, token } = await params;
  const t = await getTranslations({ locale, namespace: "auth.guest_accept" });
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await acceptGuestInvitation({ token });
    if (result.ok) {
      redirect(`/${locale}/app/projects/${result.projectId}`);
    }

    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-deep">
          <TriangleAlert className="h-5 w-5 text-brand" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-display-ko ink-primary">
            {t("error_title")}
          </h1>
          <p className="text-sm leading-body ink-secondary keep-all">
            {t(`error.${result.error}` as "error.validation")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border bg-card-deep">
          <CheckCircle2 className="h-5 w-5 text-brand" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-display-ko ink-primary">
          {t("title")}
        </h1>
        <p className="text-sm leading-body ink-secondary keep-all">{t("sub")}</p>
      </div>
      <GuestAcceptMagicLinkForm token={token} />
    </div>
  );
}
