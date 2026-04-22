"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Users,
  Settings,
  FileText,
  File as FileIcon,
  Pencil,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MessageComposer } from "./message-composer";
import { EditChannelDialog } from "./edit-channel-dialog";
import { ChannelMembersDialog } from "./channel-members-dialog";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import {
  deleteMessage,
  editMessage,
  getMessage,
  markChannelSeen,
} from "@/app/[locale]/app/team/[slug]/actions";
import type {
  Channel,
  Message,
  Attachment,
  WorkspaceMemberWithProfile,
} from "@/lib/team-channels/queries";

type Props = {
  currentChannel: Channel;
  messages: Message[];
  locale: string;
  currentUserId: string | null;
  isAdmin: boolean;
  members: WorkspaceMemberWithProfile[];
};

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const BOTTOM_STICK_PX = 100;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function formatTimestamp(
  iso: string,
  locale: string,
  labels: { today: string; yesterday: string }
): string {
  const d = new Date(iso);
  const now = new Date();
  const today = startOfDay(now).getTime();
  const dayStart = startOfDay(d).getTime();
  const diffDays = Math.round((today - dayStart) / (24 * 60 * 60 * 1000));

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);

  if (diffDays === 0) return `${labels.today} ${time}`;
  if (diffDays === 1) return `${labels.yesterday} ${time}`;

  const datePart = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(d);
  return `${datePart} ${time}`;
}

type RealtimeStatus = "idle" | "connected" | "reconnecting" | "disconnected";

export function ChannelView({
  currentChannel,
  messages: initialMessages,
  locale,
  currentUserId,
  isAdmin,
  members,
}: Props) {
  const t = useTranslations("team_chat");
  const tsLabels = {
    today: t("message_today"),
    yesterday: t("message_yesterday"),
  };

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [rtStatus, setRtStatus] = useState<RealtimeStatus>("idle");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const wasNearBottomRef = useRef(true);

  const channelId = currentChannel.id;
  const channelSlug = currentChannel.slug;

  // Reset message list when we switch channel (slug change -> new initialMessages).
  useEffect(() => {
    setMessages(initialMessages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // Mark channel as seen on mount/slug change. Best-effort; ignore errors.
  useEffect(() => {
    void markChannelSeen({ channelId });
  }, [channelId]);

  // Realtime subscription to new messages in this channel.
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const ch = supabase
      .channel(`team-msg-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "team_channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: { new: { id?: string } }) => {
          const newId = payload.new?.id;
          if (!newId) return;
          // Dedupe: if we already have this message in state (e.g. our own
          // just-sent echo was revalidated into initialMessages by the router),
          // skip.
          const exists = messagesRef.current.some((m) => m.id === newId);
          if (exists) return;

          const res = await getMessage(newId);
          if (!res.ok) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.message.id)) return prev;
            return [...prev, res.message];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "team_channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: { old: { id?: string } }) => {
          const deletedId = payload.old?.id;
          if (!deletedId) return;
          setMessages((prev) => prev.filter((m) => m.id !== deletedId));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "team_channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload: {
          new: { id?: string; body?: string; edited_at?: string | null };
        }) => {
          const n = payload.new;
          if (!n?.id) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === n.id
                ? {
                    ...m,
                    body: n.body ?? m.body,
                    edited_at: n.edited_at ?? m.edited_at,
                  }
                : m
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRtStatus("connected");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT")
          setRtStatus("reconnecting");
        else if (status === "CLOSED") setRtStatus("disconnected");
      });

    return () => {
      void supabase.removeChannel(ch);
    };
  }, [channelId]);

  // Keep a ref mirror of messages so the realtime callback sees the latest
  // list without forcing the subscription effect to re-run.
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Track "near-bottom" status so we can decide whether to auto-scroll.
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    wasNearBottomRef.current = distance <= BOTTOM_STICK_PX;
  }, []);

  // On mount + new initial messages, stick to bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    wasNearBottomRef.current = true;
  }, [channelId]);

  // Auto-scroll on new message IF user was already near bottom.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (wasNearBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  // Compute "grouped with previous" flag — same author and within 5 min
  const grouped: boolean[] = useMemo(
    () =>
      messages.map((m, i) => {
        if (i === 0) return false;
        const prev = messages[i - 1];
        if (prev.author_id !== m.author_id) return false;
        const dt =
          new Date(m.created_at).getTime() - new Date(prev.created_at).getTime();
        return dt >= 0 && dt <= FIVE_MINUTES_MS;
      }),
    [messages]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="border-b border-border px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0 flex items-baseline gap-2">
          <h1 className="text-lg font-semibold truncate keep-all">
            # {currentChannel.name}
          </h1>
          <span className="text-xs text-muted-foreground font-mono truncate">
            {currentChannel.slug}
          </span>
          {(rtStatus === "reconnecting" || rtStatus === "disconnected") && (
            <span
              className={cn(
                "text-[11px] rounded-full px-2 py-0.5 keep-all",
                rtStatus === "reconnecting"
                  ? "bg-yellow-100 text-yellow-900"
                  : "bg-red-100 text-red-900"
              )}
            >
              {rtStatus === "reconnecting"
                ? t("realtime_reconnecting")
                : t("realtime_disconnected")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {!currentChannel.is_archived && (
            <p className="text-xs text-muted-foreground keep-all truncate max-w-xs hidden md:block">
              {currentChannel.topic ?? t("channel_topic_placeholder")}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={t("view_members")}
            onClick={() => setMembersDialogOpen(true)}
          >
            <Users className="h-4 w-4" />
          </Button>
          {isAdmin && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={t("edit_channel")}
              onClick={() => setEditDialogOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* Archived banner */}
      {currentChannel.is_archived && (
        <div className="border-b border-border bg-red-50 text-red-700 text-sm px-6 py-2 keep-all">
          {t("archived_banner")}
        </div>
      )}

      {/* Message list */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground keep-all">
              {t("message_empty_state")}
            </p>
          </div>
        ) : (
          <ol className="flex flex-col gap-0.5 py-4">
            {messages.map((m, i) => {
              const isGrouped = grouped[i];
              const displayName = m.author?.display_name ?? "Unknown";
              const canEdit = m.author_id === currentUserId;
              const canDelete = canEdit || isAdmin;
              return (
                <MessageRow
                  key={m.id}
                  message={m}
                  isGrouped={isGrouped}
                  prevGap={!isGrouped && i > 0}
                  displayName={displayName}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  locale={locale}
                  tsLabels={tsLabels}
                  t={t}
                />
              );
            })}
          </ol>
        )}
      </div>

      {/* Composer */}
      {!currentChannel.is_archived && (
        <div className="shrink-0 border-t border-border p-4">
          <MessageComposer
            channelId={currentChannel.id}
            channelSlug={channelSlug}
            locale={locale}
            isArchived={currentChannel.is_archived}
          />
        </div>
      )}

      {/* Admin dialogs */}
      {isAdmin && (
        <EditChannelDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          channel={currentChannel}
        />
      )}
      <ChannelMembersDialog
        open={membersDialogOpen}
        onOpenChange={setMembersDialogOpen}
        members={members}
        locale={locale}
      />
    </div>
  );
}

// --- Message row -----------------------------------------------------------

type TeamChatTranslator = ReturnType<typeof useTranslations<"team_chat">>;

function MessageRow({
  message,
  isGrouped,
  prevGap,
  displayName,
  canEdit,
  canDelete,
  locale,
  tsLabels,
  t,
}: {
  message: Message;
  isGrouped: boolean;
  prevGap: boolean;
  displayName: string;
  canEdit: boolean;
  canDelete: boolean;
  locale: string;
  tsLabels: { today: string; yesterday: string };
  t: TeamChatTranslator;
}) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(message.body);
  const [saving, startSaveTransition] = useTransition();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, startDeleteTransition] = useTransition();

  const handleStartEdit = () => {
    setEditBody(message.body);
    setEditing(true);
  };

  const handleSaveEdit = () => {
    const body = editBody.trim();
    if (!body) return;
    startSaveTransition(async () => {
      const res = await editMessage({ messageId: message.id, body });
      if (!res.ok) {
        toast.error(t("message_edit_failed"));
        return;
      }
      setEditing(false);
    });
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const res = await deleteMessage({ messageId: message.id });
      if (!res.ok) {
        toast.error(t("message_delete_failed"));
        return;
      }
      setConfirmDeleteOpen(false);
      toast.success(t("success_message_deleted"));
    });
  };

  return (
    <>
      <li
        className={cn(
          "group relative px-6 py-0.5 hover:bg-muted/40",
          prevGap && "mt-2"
        )}
      >
        <div className="flex gap-3">
          <div className="w-10 shrink-0">
            {!isGrouped && (
              <Avatar className="h-10 w-10">
                {message.author?.avatar_url && (
                  <AvatarImage
                    src={message.author.avatar_url}
                    alt={displayName}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {initialsFor(displayName)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {!isGrouped && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold truncate">
                  {displayName}
                </span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {formatTimestamp(message.created_at, locale, tsLabels)}
                </span>
              </div>
            )}
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  maxLength={5000}
                  rows={Math.min(
                    6,
                    Math.max(1, editBody.split("\n").length)
                  )}
                  className="resize-none"
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      handleSaveEdit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      setEditing(false);
                    }
                  }}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saving || editBody.trim().length === 0}
                  >
                    {saving ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      t("message_edit_save")
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                  >
                    {t("message_edit_cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-sm whitespace-pre-wrap break-words keep-all">
                  {message.body}
                  {message.edited_at && (
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      {t("message_edited_label")}
                    </span>
                  )}
                </div>
                {message.attachments.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {message.attachments.map((a) => (
                      <li key={a.id}>
                        <AttachmentRenderer attachment={a} t={t} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>

        {/* Hover toolbar */}
        {!editing && (canEdit || canDelete) && (
          <div className="absolute top-0.5 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-background border border-border rounded-md shadow-sm p-0.5">
            {canEdit && (
              <button
                type="button"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={handleStartEdit}
                aria-label={t("message_edit")}
                title={t("message_edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmDeleteOpen(true)}
                aria-label={t("message_delete")}
                title={t("message_delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </li>

      {canDelete && (
        <AlertDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="keep-all">
                {t("message_delete_confirm")}
              </AlertDialogTitle>
              <AlertDialogDescription className="sr-only">
                {t("message_delete_confirm")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                {t("message_delete_cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  t("message_delete_action")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

// --- Attachment rendering --------------------------------------------------

function AttachmentRenderer({
  attachment,
  t,
}: {
  attachment: Attachment;
  t: TeamChatTranslator;
}) {
  const { kind, file_name, size_bytes, signedUrl, thumbnailSignedUrl } =
    attachment;

  if (kind === "image") {
    const src = thumbnailSignedUrl ?? signedUrl;
    if (!src) return <MissingAttachment fileName={file_name} />;
    return (
      <a
        href={signedUrl ?? src}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title={file_name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={t("attachment_image_alt", { name: file_name })}
          className="max-w-md max-h-96 object-contain rounded-md border border-black/5"
        />
      </a>
    );
  }

  if (kind === "video") {
    if (!signedUrl) return <MissingAttachment fileName={file_name} />;
    return (
      <video
        controls
        preload="metadata"
        poster={thumbnailSignedUrl ?? undefined}
        aria-label={t("attachment_video_label")}
        className="max-w-md rounded-md border border-black/5 bg-black"
      >
        <source src={signedUrl} />
      </video>
    );
  }

  if (kind === "pdf") {
    return (
      <div className="flex items-center gap-3 border border-border rounded-md px-3 py-2 text-xs max-w-md">
        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-medium text-foreground text-[11px] uppercase tracking-[0.1em]">
            {t("attachment_pdf_label")}
          </span>
          <span className="truncate text-sm text-foreground" title={file_name}>
            {file_name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatBytes(size_bytes)}
          </span>
        </div>
        {signedUrl && (
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-xs underline hover:no-underline text-foreground"
          >
            Open
          </a>
        )}
      </div>
    );
  }

  // generic file
  return (
    <a
      href={signedUrl ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 border border-border rounded-md px-3 py-2 text-xs max-w-md hover:bg-muted/40"
      title={file_name}
    >
      <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="font-medium text-foreground text-[11px] uppercase tracking-[0.1em]">
          {t("attachment_file_label")}
        </span>
        <span className="truncate text-sm text-foreground">{file_name}</span>
        <span className="text-[10px] text-muted-foreground">
          {formatBytes(size_bytes)}
        </span>
      </div>
    </a>
  );
}

function MissingAttachment({ fileName }: { fileName: string }) {
  return (
    <div className="flex items-center gap-2 border border-border rounded-md px-2 py-1 text-xs text-muted-foreground">
      <FileIcon className="h-3.5 w-3.5" />
      <span className="truncate max-w-xs">{fileName}</span>
    </div>
  );
}
