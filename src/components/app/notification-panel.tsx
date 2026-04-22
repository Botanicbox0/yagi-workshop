"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Calendar,
  FileText,
  MessageSquare,
  Image as ImageIcon,
  CheckCircle2,
  Share2,
  Bell,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/routing";
import {
  markAllSeen,
  markEventSeen,
  type NotificationEvent,
} from "@/app/[locale]/app/notifications/actions";

type Props = {
  locale: "ko" | "en";
  events: NotificationEvent[];
  onClose: () => void;
  onMarkedSeen: (eventId: string) => void;
  onAllSeen: () => void;
};

// Icon per notification kind. Unknown kinds fall back to Bell.
function iconForKind(kind: string) {
  switch (kind) {
    case "meeting_scheduled":
    case "meeting_summary_sent":
      return Calendar;
    case "invoice_issued":
      return FileText;
    case "board_shared":
      return Share2;
    case "board_approved":
      return CheckCircle2;
    case "showcase_published":
      return Sparkles;
    case "frame_uploaded_batch":
    case "revision_uploaded":
      return ImageIcon;
    case "feedback_received":
    case "thread_message_new":
    case "team_channel_mention":
      return MessageSquare;
    default:
      return Bell;
  }
}

function dayBucket(createdAt: string): "today" | "yesterday" | "earlier" {
  const now = new Date();
  const created = new Date(createdAt);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  if (created >= startOfToday) return "today";
  if (created >= startOfYesterday) return "yesterday";
  return "earlier";
}

function relativeTime(iso: string, locale: "ko" | "en"): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (diffSec < 60) return rtf.format(-diffSec, "second");
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return rtf.format(-diffMin, "minute");
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return rtf.format(-diffHr, "hour");
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return rtf.format(-diffDay, "day");
  const diffMonth = Math.floor(diffDay / 30);
  return rtf.format(-diffMonth, "month");
}

export function NotificationPanel({
  locale,
  events,
  onClose,
  onMarkedSeen,
  onAllSeen,
}: Props) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const hasUnread = events.some((e) => !e.in_app_seen_at);

  const grouped = useMemo(() => {
    const today: NotificationEvent[] = [];
    const yesterday: NotificationEvent[] = [];
    const earlier: NotificationEvent[] = [];
    for (const ev of events) {
      const b = dayBucket(ev.created_at);
      if (b === "today") today.push(ev);
      else if (b === "yesterday") yesterday.push(ev);
      else earlier.push(ev);
    }
    return { today, yesterday, earlier };
  }, [events]);

  const handleItemClick = (ev: NotificationEvent) => {
    startTransition(async () => {
      if (!ev.in_app_seen_at) {
        const res = await markEventSeen(ev.id);
        if ("ok" in res) onMarkedSeen(ev.id);
      }
      onClose();
      if (ev.url_path) {
        router.push(ev.url_path);
      }
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      const res = await markAllSeen();
      if ("ok" in res) onAllSeen();
    });
  };

  return (
    <div className="flex flex-col max-h-[560px]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium">{t("panel_title")}</h2>
        {hasUnread && (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isPending}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {t("panel_mark_all_read")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-10 gap-1.5">
            <p className="text-sm font-medium keep-all">
              {t("panel_empty_title")}
            </p>
            <p className="text-xs text-muted-foreground keep-all">
              {t("panel_empty_body")}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {grouped.today.length > 0 && (
              <Section
                label={t("panel_today")}
                events={grouped.today}
                onClick={handleItemClick}
                locale={locale}
              />
            )}
            {grouped.yesterday.length > 0 && (
              <Section
                label={t("panel_yesterday")}
                events={grouped.yesterday}
                onClick={handleItemClick}
                locale={locale}
              />
            )}
            {grouped.earlier.length > 0 && (
              <Section
                label={t("panel_earlier")}
                events={grouped.earlier}
                onClick={handleItemClick}
                locale={locale}
              />
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-border">
        <Link
          href="/app/settings/notifications"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("panel_settings_link")}
        </Link>
      </div>
    </div>
  );
}

function Section({
  label,
  events,
  onClick,
  locale,
}: {
  label: string;
  events: NotificationEvent[];
  onClick: (ev: NotificationEvent) => void;
  locale: "ko" | "en";
}) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <ul>
        {events.map((ev) => {
          const Icon = iconForKind(ev.kind);
          const seen = !!ev.in_app_seen_at;
          return (
            <li key={ev.id}>
              <button
                type="button"
                onClick={() => onClick(ev)}
                className={cn(
                  "w-full text-left px-4 py-2.5 flex items-start gap-2.5 hover:bg-accent transition-colors",
                  seen && "opacity-60",
                )}
              >
                <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-[13px] font-medium truncate keep-all">
                      {ev.title}
                    </p>
                    <span className="text-[11px] text-muted-foreground shrink-0">
                      {relativeTime(ev.created_at, locale)}
                    </span>
                  </div>
                  {ev.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 keep-all">
                      {ev.body}
                    </p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
