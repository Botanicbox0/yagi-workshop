"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { NotificationPanel } from "./notification-panel";
import {
  getRecentEvents,
  type NotificationEvent,
} from "@/app/[locale]/app/notifications/actions";

type Props = {
  initialUnreadCount: number;
  locale: "ko" | "en";
};

export function NotificationBell({ initialUnreadCount, locale }: Props) {
  const t = useTranslations("notifications");
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [fetchedOnce, setFetchedOnce] = useState(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());

  // Resolve the authenticated user id so we can scope the Realtime filter.
  useEffect(() => {
    let cancelled = false;
    const supabase = createSupabaseBrowser();
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!cancelled) setUserId(data.user?.id ?? null);
      })
      .catch((err) => {
        console.error("[notif/bell] getUser failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Subscribe to Realtime inserts + updates on this user's notification_events.
  useEffect(() => {
    if (!userId) return;
    const supabase = createSupabaseBrowser();
    const filter = `user_id=eq.${userId}`;
    const channel = supabase
      .channel(`notif-bell-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_events",
          filter,
        },
        (payload: {
          new: Partial<NotificationEvent> & { id?: string };
        }) => {
          const row = payload.new as NotificationEvent | undefined;
          if (!row?.id) return;
          if (seenEventIdsRef.current.has(row.id)) return;
          seenEventIdsRef.current.add(row.id);
          if (!row.in_app_seen_at) {
            setUnreadCount((c) => c + 1);
          }
          setEvents((prev) => {
            if (prev.some((e) => e.id === row.id)) return prev;
            return [row, ...prev].slice(0, 50);
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notification_events",
          filter,
        },
        (payload: {
          new: { id?: string; in_app_seen_at?: string | null };
          old: { in_app_seen_at?: string | null };
        }) => {
          const n = payload.new;
          const o = payload.old;
          if (!n?.id) return;
          const wasUnseen = !o?.in_app_seen_at;
          if (n.in_app_seen_at && wasUnseen) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          setEvents((prevEvents) =>
            prevEvents.map((e) =>
              e.id === n.id
                ? {
                    ...e,
                    in_app_seen_at: n.in_app_seen_at ?? e.in_app_seen_at,
                  }
                : e,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Lazy-load the event list the first time the panel opens.
  useEffect(() => {
    if (!open || fetchedOnce) return;
    let cancelled = false;
    getRecentEvents()
      .then((rows) => {
        if (cancelled) return;
        for (const r of rows) seenEventIdsRef.current.add(r.id);
        setEvents(rows);
        setFetchedOnce(true);
      })
      .catch((err) => {
        console.error("[notif/bell] fetch events failed:", err);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchedOnce]);

  const handleMarkedSeen = useCallback((eventId: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, in_app_seen_at: new Date().toISOString() }
          : e,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const handleAllSeen = useCallback(() => {
    const now = new Date().toISOString();
    setEvents((prev) =>
      prev.map((e) => (e.in_app_seen_at ? e : { ...e, in_app_seen_at: now })),
    );
    setUnreadCount(0);
  }, []);

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);
  const ariaLabel =
    unreadCount > 0
      ? `${t("bell_aria_label")}. ${t("bell_unread_badge_aria", { count: unreadCount })}`
      : t("bell_aria_label");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          className={cn(
            "relative inline-flex items-center justify-center h-9 w-9 rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          )}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute top-1 right-1 min-w-[16px] h-4 px-1",
                "rounded-full bg-foreground text-background",
                "text-[10px] font-medium leading-none",
                "inline-flex items-center justify-center",
              )}
            >
              {displayCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        className="w-[360px] max-w-[calc(100vw-24px)] p-0"
      >
        <NotificationPanel
          locale={locale}
          events={events}
          onClose={() => setOpen(false)}
          onMarkedSeen={handleMarkedSeen}
          onAllSeen={handleAllSeen}
        />
      </PopoverContent>
    </Popover>
  );
}
