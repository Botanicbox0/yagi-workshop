import { ChannelSidebar } from "./channel-sidebar";
import { ChannelView } from "./channel-view";
import type {
  Channel,
  Message,
  WorkspaceMemberWithProfile,
} from "@/lib/team-channels/queries";

type Props = {
  channels: Channel[];
  currentSlug: string;
  currentChannel: Channel;
  messages: Message[];
  locale: string;
  currentUserId: string | null;
  isAdmin: boolean;
  lastSeenByChannel: Record<string, string>;
  latestMessageAtByChannel: Record<string, string | null>;
  members: WorkspaceMemberWithProfile[];
};

export function TeamChatLayout({
  channels,
  currentSlug,
  currentChannel,
  messages,
  locale,
  currentUserId,
  isAdmin,
  lastSeenByChannel,
  latestMessageAtByChannel,
  members,
}: Props) {
  return (
    <div className="flex h-dvh bg-background">
      <div className="w-64 shrink-0 border-r border-border">
        <ChannelSidebar
          channels={channels}
          currentSlug={currentSlug}
          isAdmin={isAdmin}
          lastSeenByChannel={lastSeenByChannel}
          latestMessageAtByChannel={latestMessageAtByChannel}
        />
      </div>
      <div className="flex-1 min-w-0">
        <ChannelView
          currentChannel={currentChannel}
          messages={messages}
          locale={locale}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          members={members}
        />
      </div>
    </div>
  );
}
