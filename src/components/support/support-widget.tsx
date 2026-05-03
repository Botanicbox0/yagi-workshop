"use client";

// =============================================================================
// Phase 2.8.6 Task B.4/B.5 — support chat widget (FAB + slide-in panel).
// =============================================================================
// Mounts on the (app) shell. Hidden when no workspace_id (mid-onboarding
// edge case). Single-thread-per-(workspace,client) per the support_threads
// UNIQUE — getOrCreate runs lazily on first panel open.
//
// IME guard for Korean composition follows Phase 2.8.2 G_B2_B pattern:
// don't fire send on Enter while editor is composing.
// =============================================================================

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  getOrCreateSupportThread,
  sendSupportMessage,
} from "@/app/[locale]/app/support/actions";

type SupportMessageRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

type Props = {
  workspaceId: string | null;
  currentUserId: string;
  currentUserName: string;
};

export function SupportWidget({
  workspaceId,
  currentUserId,
  currentUserName,
}: Props) {
  const t = useTranslations("support");
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const composingRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Lazy thread bootstrap — first time the panel opens.
  useEffect(() => {
    if (!open || threadId || !workspaceId) return;
    void (async () => {
      const res = await getOrCreateSupportThread(workspaceId);
      if (res.ok) setThreadId(res.threadId);
    })();
  }, [open, threadId, workspaceId]);

  // Initial message load + realtime subscribe.
  useEffect(() => {
    if (!threadId) return;
    const supabase = createSupabaseBrowser();

    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, thread_id, author_id, body, image_url, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      setMessages(data ?? []);
    })();

    const channel = supabase
      .channel(`support:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          // Server-side filter — RLS already gates by thread_id, but
          // this layered filter (Phase 2.8.2 LOOP_1 finding pattern)
          // ensures cross-thread inserts visible to a yagi_admin do
          // not appear in this client's panel.
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as SupportMessageRow;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
          if (row.author_id !== currentUserId) {
            // Reset unread when panel is open.
            if (!open) {
              setUnreadCount((n) => n + 1);
              try {
                toast.message(t("toast_new_message"));
              } catch {
                // toast may be unavailable in some test paths
              }
            }
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [threadId, currentUserId, open, t]);

  // Reset unread when panel opens; scroll to bottom on new message.
  useEffect(() => {
    if (open) setUnreadCount(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = useCallback(async () => {
    if (!threadId || sending) return;
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    setSending(true);
    const res = await sendSupportMessage({ threadId, body: trimmed });
    setSending(false);
    if (!res.ok) {
      toast.error(t("send_error"));
      return;
    }
    setBody("");
  }, [body, sending, t, threadId]);

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // IME guard: don't send while composing (Phase 2.8.2 G_B2_B).
    if (composingRef.current) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  if (!workspaceId) return null;

  return (
    <>
      {/* FAB — Phase 4.x Wave C.5c sub_05: 56×56 ink-primary bg with the
          new yagi-talk-icon swapped in. Mobile inset (bottom-4 right-4)
          tightens the FAB against the safe-area; desktop keeps 6/6.
          Inner icon = 40×40 with 8px breathing room inside the 56 ring,
          which is the Material / Intercom / ChannelTalk standard. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("fab_label")}
        className={cn(
          "fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full",
          "bg-foreground text-background shadow-lg shadow-black/20",
          "hover:scale-105 hover:shadow-black/30 hover:-translate-y-0.5 transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <Image
            src="/brand/yagi-talk-icon.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 opacity-95"
            priority={false}
          />
        )}
        {!open && unreadCount > 0 && (
          <span
            aria-label={t("unread_aria", { n: unreadCount })}
            className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive ring-2 ring-background"
          />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label={t("panel_label")}
          className={cn(
            "fixed bottom-24 right-6 z-40 flex h-[560px] w-[360px] max-w-[calc(100vw-2rem)] flex-col",
            "rounded-xl border border-border bg-background shadow-2xl shadow-black/30",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Image
              src="/brand/yagi-mark.png"
              alt=""
              width={24}
              height={24}
              className="h-6 w-auto"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {t("panel_title")}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {t("panel_response_hint")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("panel_close")}
              className="rounded-full p-1 hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 py-3 space-y-3"
          >
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-8 keep-all">
                {t("panel_empty")}
              </p>
            )}
            {messages.map((m) => (
              <SupportMessageBubble
                key={m.id}
                message={m}
                isMine={m.author_id === currentUserId}
                currentUserName={currentUserName}
              />
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={onKeyDown}
                onCompositionStart={() => {
                  composingRef.current = true;
                }}
                onCompositionEnd={() => {
                  composingRef.current = false;
                }}
                placeholder={t("composer_placeholder")}
                rows={1}
                maxLength={4000}
                className={cn(
                  "flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm",
                  "min-h-[36px] max-h-32 leading-snug keep-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
              <Button
                size="sm"
                onClick={() => void send()}
                disabled={sending || body.trim().length === 0}
                className="rounded-full"
              >
                {t("send")}
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t("composer_hint")}
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function SupportMessageBubble({
  message,
  isMine,
  currentUserName,
}: {
  message: SupportMessageRow;
  isMine: boolean;
  currentUserName: string;
}) {
  // Defer heavy author-resolution to a future enhancement; for v1 we
  // know "mine" is the current user, "theirs" is yagi (the only other
  // party to this thread). Initial display name fallback: yagi.
  const senderName = useMemo(
    () => (isMine ? currentUserName : "YAGI"),
    [isMine, currentUserName],
  );
  return (
    <div className={cn("flex flex-col gap-0.5", isMine ? "items-end" : "items-start")}>
      <span className="text-[10px] text-muted-foreground">{senderName}</span>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap keep-all",
          isMine
            ? "bg-foreground text-background"
            : "bg-muted text-foreground",
        )}
      >
        {message.body}
      </div>
    </div>
  );
}
