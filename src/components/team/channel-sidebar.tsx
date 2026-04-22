"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NewChannelDialog } from "./new-channel-dialog";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { Channel } from "@/lib/team-channels/queries";

type Props = {
  channels: Channel[];
  currentSlug: string;
  isAdmin: boolean;
  lastSeenByChannel: Record<string, string>;
  latestMessageAtByChannel: Record<string, string | null>;
};

export function ChannelSidebar({
  channels,
  currentSlug,
  isAdmin,
  lastSeenByChannel,
  latestMessageAtByChannel,
}: Props) {
  const t = useTranslations("team_chat");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Seed realtime-tracked state from the server-rendered timestamps. The
  // browser subscription below bumps these on every INSERT for channels
  // OTHER than the one currently open.
  const [latestByChannel, setLatestByChannel] = useState<
    Record<string, string | null>
  >(latestMessageAtByChannel);

  // If the server-passed latest/lastSeen maps change (router.refresh after
  // creating a channel, navigating between slugs), resync.
  useEffect(() => {
    setLatestByChannel(latestMessageAtByChannel);
  }, [latestMessageAtByChannel]);

  // Build a stable list of channel ids to subscribe to. We only need to
  // re-subscribe when this list changes (not on every render).
  const channelIdsKey = useMemo(
    () =>
      channels
        .map((c) => c.id)
        .sort()
        .join(","),
    [channels]
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const channelIds = useMemo(() => channels.map((c) => c.id), [channelIdsKey]);

  // Determine the current channel id (if any) from the slug so we can suppress
  // unread bumps for the channel the user is already viewing.
  const currentChannelId = useMemo(() => {
    const match = channels.find((c) => c.slug === currentSlug);
    return match?.id ?? null;
  }, [channels, currentSlug]);

  useEffect(() => {
    if (channelIds.length === 0) return;
    const supabase = createSupabaseBrowser();
    const filter = `channel_id=in.(${channelIds.join(",")})`;
    const ch = supabase
      .channel(`team-sidebar-${channelIds[0]}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_channel_messages",
          filter,
        },
        (payload: { new: { channel_id?: string; created_at?: string } }) => {
          const row = payload.new;
          if (!row?.channel_id) return;
          setLatestByChannel((prev) => ({
            ...prev,
            [row.channel_id as string]: row.created_at ?? new Date().toISOString(),
          }));
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channelIds]);

  const sorted = [...channels].sort((a, b) => a.name.localeCompare(b.name));
  const active = sorted.filter((c) => !c.is_archived);
  const archived = sorted.filter((c) => c.is_archived);

  const isUnread = (channelId: string): boolean => {
    // The channel the user is actively viewing is considered read.
    if (channelId === currentChannelId) return false;
    const latest = latestByChannel[channelId];
    if (!latest) return false;
    const seen = lastSeenByChannel[channelId];
    if (!seen) return true;
    return new Date(latest).getTime() > new Date(seen).getTime();
  };

  return (
    <aside className="flex flex-col h-full p-3">
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        <h2 className="text-xs uppercase tracking-[0.12em] text-muted-foreground font-medium">
          {t("channels_heading")}
        </h2>
        {isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label={t("new_channel")}
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto flex flex-col gap-0.5">
        {active.map((c) => (
          <ChannelRow
            key={c.id}
            channel={c}
            currentSlug={currentSlug}
            unread={isUnread(c.id)}
            unreadAria={t("unread_indicator_aria")}
          />
        ))}

        {archived.length > 0 && (
          <>
            <div className="px-2 mt-3 mb-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {t("archived_label")}
            </div>
            {archived.map((c) => (
              <ChannelRow
                key={c.id}
                channel={c}
                currentSlug={currentSlug}
                unread={false}
                unreadAria={t("unread_indicator_aria")}
                muted
              />
            ))}
          </>
        )}
      </nav>

      {isAdmin && (
        <NewChannelDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      )}
    </aside>
  );
}

function ChannelRow({
  channel,
  currentSlug,
  muted,
  unread,
  unreadAria,
}: {
  channel: Channel;
  currentSlug: string;
  muted?: boolean;
  unread: boolean;
  unreadAria: string;
}) {
  const isActive = channel.slug === currentSlug;
  return (
    <Link
      href={`/app/team/${channel.slug}` as `/app/team/${string}`}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors keep-all",
        isActive
          ? "bg-accent text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        muted && !isActive && "opacity-70",
        unread && !isActive && "text-foreground font-medium"
      )}
    >
      <span className="font-mono text-xs uppercase tracking-tight shrink-0">
        #{channel.slug}
      </span>
      <span className="truncate flex-1">{channel.name}</span>
      {unread && (
        <span
          aria-label={unreadAria}
          className="shrink-0 h-1.5 w-1.5 rounded-full bg-foreground"
        />
      )}
    </Link>
  );
}
