import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getIsYagiAdmin } from "@/lib/app/admin";
import {
  getAppLandingPath,
  resolveAppActor,
} from "@/lib/app/role-routing";
import { resolveActiveWorkspace } from "@/lib/workspace/active";
import { ArtistRequestWizard } from "./artist-request-wizard";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function ArtistProjectRequestStubPage({ params }: Props) {
  const { locale } = await params;
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

  return <ArtistRequestWizard backHref={backHref} />;
}
