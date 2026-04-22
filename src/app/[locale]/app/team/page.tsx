import { notFound, redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getAccessibleChannels } from "@/lib/team-channels/queries";

type Props = { params: Promise<{ locale: string }> };

export default async function TeamPage({ params }: Props) {
  const { locale } = await params;

  const supabase = await createSupabaseServer();
  const channels = await getAccessibleChannels(supabase);

  // RLS scopes channels to YAGI Internal members only — 0 rows = not a member.
  if (channels.length === 0) notFound();

  const active = channels.filter((c) => !c.is_archived);
  const target =
    active.find((c) => c.slug === "general") ?? active[0] ?? channels[0];

  redirect(`/${locale}/app/team/${target.slug}`);
}
