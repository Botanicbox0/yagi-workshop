"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  sendSupportMessage,
  setSupportThreadStatus,
} from "@/app/[locale]/app/support/actions";

type SupportMessageRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

export function AdminSupportThreadView({
  threadId,
  clientName,
  status: initialStatus,
  currentUserId,
}: {
  threadId: string;
  clientName: string;
  status: "open" | "closed";
  currentUserId: string;
}) {
  const t = useTranslations("support");
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<"open" | "closed">(initialStatus);
  const composingRef = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Initial load + realtime
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("id, thread_id, author_id, body, image_url, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      setMessages(data ?? []);
    })();
    const channel = supabase
      .channel(`admin-support:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as SupportMessageRow;
          setMessages((prev) =>
            prev.some((m) => m.id === row.id) ? prev : [...prev, row],
          );
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = useCallback(async () => {
    if (sending) return;
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
    if (composingRef.current) return;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  async function toggleStatus() {
    const next = status === "open" ? "closed" : "open";
    const res = await setSupportThreadStatus({ threadId, status: next });
    if (!res.ok) {
      toast.error(t("send_error"));
      return;
    }
    setStatus(next);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] min-h-[400px] border border-border rounded-lg overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{clientName}</p>
          <p className="text-[11px] text-muted-foreground">
            {status === "open" ? t("admin_status_open") : t("admin_status_closed")}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleStatus}>
          {status === "open" ? t("admin_close_thread") : t("admin_reopen_thread")}
        </Button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.map((m) => {
          const isAdmin = m.author_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn(
                "flex flex-col gap-0.5",
                isAdmin ? "items-end" : "items-start",
              )}
            >
              <span className="text-[10px] text-muted-foreground">
                {isAdmin ? "YAGI" : clientName}
              </span>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap keep-all",
                  isAdmin
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      {status === "open" ? (
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
              rows={2}
              maxLength={4000}
              className={cn(
                "flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm",
                "leading-snug keep-all min-h-[64px]",
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
      ) : (
        <div className="border-t border-border p-3 text-center text-xs text-muted-foreground">
          {t("admin_status_closed")}
        </div>
      )}
    </div>
  );
}
