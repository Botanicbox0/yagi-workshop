import { notFound } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import {
  getAccessibleChannels,
  getChannelBySlug,
  getChannelMessages,
  getLastSeenByChannel,
  getLatestMessageAtByChannel,
  getYagiInternalMembers,
  isYagiInternalAdmin,
} from "@/lib/team-channels/queries";
import { TeamChatLayout } from "@/components/team/team-chat-layout";

type Props = { params: Promise<{ locale: string; slug: string }> };

export default async function TeamChannelPage({ params }: Props) {
  const { locale, slug } = await params;

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [channels, currentChannel] = await Promise.all([
    getAccessibleChannels(supabase),
    getChannelBySlug(supabase, slug),
  ]);

  // If 0 channels are visible, the user isn't a YAGI Internal member (RLS).
  if (channels.length === 0) notFound();
  if (!currentChannel) notFound();

  const channelIds = channels.map((c) => c.id);
  const [
    messages,
    lastSeenByChannel,
    latestMessageAtByChannel,
    isAdmin,
    members,
  ] = await Promise.all([
    getChannelMessages(supabase, currentChannel.id, 50),
    user ? getLastSeenByChannel(supabase, user.id) : Promise.resolve({}),
    getLatestMessageAtByChannel(supabase, channelIds),
    user ? isYagiInternalAdmin(supabase, user.id) : Promise.resolve(false),
    getYagiInternalMembers(supabase),
  ]);

  return (
    <TeamChatLayout
      channels={channels}
      currentSlug={slug}
      currentChannel={currentChannel}
      messages={messages}
      locale={locale}
      currentUserId={user?.id ?? null}
      isAdmin={isAdmin}
      lastSeenByChannel={lastSeenByChannel}
      latestMessageAtByChannel={latestMessageAtByChannel}
      members={members}
    />
  );
}
