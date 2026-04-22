"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Paperclip,
  X,
  Loader2,
  FileText,
  File as FileIcon,
  AlertCircle,
} from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  sendMessage,
  sendMessageWithAttachments,
} from "@/app/[locale]/app/projects/[id]/thread-actions";
import {
  uploadAttachment,
  validateAttachment,
  type UploadResult,
  type AttachmentKind,
} from "@/lib/thread-attachments";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const ATTACHMENT_BUCKET = "thread-attachments";
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type ThreadMessageAuthor = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export type ThreadAttachment = {
  id: string;
  message_id: string;
  kind: AttachmentKind;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  thumbnail_path: string | null;
  signed_url: string | null;
  thumbnail_signed_url: string | null;
};

export type ThreadMessage = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string | null;
  visibility: string;
  created_at: string;
  author: ThreadMessageAuthor | null;
  attachments?: ThreadAttachment[];
};

type ComposerChipStatus = "uploading" | "done" | "error";

type ComposerChip = {
  tempId: string;
  file: File;
  status: ComposerChipStatus;
  previewUrl: string | null; // object URL for images; null otherwise
  uploadResult: UploadResult | null;
};

type Props = {
  projectId: string;
  threadId: string | null;
  currentUserId: string;
  isYagiAdmin: boolean;
  initialMessages: ThreadMessage[];
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function ThreadPanel({
  projectId,
  threadId: initialThreadId,
  currentUserId,
  isYagiAdmin,
  initialMessages,
}: Props) {
  const t = useTranslations("threads");
  const tErrors = useTranslations("errors");
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [chips, setChips] = useState<ComposerChip[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  // Clean up chip object URLs on unmount.
  useEffect(() => {
    return () => {
      for (const c of chips) {
        if (c.previewUrl) {
          try {
            URL.revokeObjectURL(c.previewUrl);
          } catch {
            // ignore
          }
        }
      }
    };
    // Intentionally empty dep list — only runs on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription — subscribe to thread_messages INSERTs
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const channel = supabase
      .channel(`project:${projectId}:thread`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_messages" },
        (payload) => {
          const row = payload.new as ThreadMessage;
          // Filter client-side: only rows whose thread belongs to this project.
          if (threadId && row.thread_id === threadId) {
            setMessages((prev) =>
              prev.some((m) => m.id === row.id) ? prev : [...prev, row]
            );
            // Update threadId if it was null (first message created the thread)
          } else if (!threadId) {
            // If we don't know the thread yet, update and show the message
            setThreadId(row.thread_id);
            setMessages((prev) =>
              prev.some((m) => m.id === row.id) ? prev : [...prev, row]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, threadId]);

  /** Add file(s) from picker or drop. Validates, starts upload immediately. */
  async function handleFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    // We need the latest chips to enforce the 5-chip cap; use functional
    // setState via a snapshot read.
    let currentCount = 0;
    setChips((prev) => {
      currentCount = prev.length;
      return prev;
    });
    // Schedule the rest as a microtask so currentCount reflects the set state.
    await Promise.resolve();

    let remainingSlots = MAX_ATTACHMENTS_PER_MESSAGE - currentCount;
    if (remainingSlots <= 0) {
      toast.error(t("attachment_size_limit"));
      return;
    }

    const toProcess: Array<{
      chip: ComposerChip;
      file: File;
    }> = [];

    for (const file of files) {
      if (remainingSlots <= 0) break;
      const validation = validateAttachment(file);
      if (!validation.ok) {
        if (validation.reason === "size") {
          toast.error(t("attachment_size_limit"));
        } else {
          toast.error(t("attachment_failed"));
        }
        continue;
      }
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random()}`;
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      const chip: ComposerChip = {
        tempId,
        file,
        status: "uploading",
        previewUrl,
        uploadResult: null,
      };
      toProcess.push({ chip, file });
      remainingSlots -= 1;
    }

    if (toProcess.length === 0) return;

    // Append chips synchronously so the UI reflects them.
    setChips((prev) => [...prev, ...toProcess.map((p) => p.chip)]);

    // We need an effective threadId for the upload path. If this is the
    // first message in the project, we don't have one yet — use 'pending'
    // as the thread segment. Storage RLS only checks the project_id segment,
    // so this is safe.
    const effectiveThreadId = threadId ?? "pending";

    // Kick off uploads in parallel.
    await Promise.all(
      toProcess.map(async ({ chip, file }) => {
        const result = await uploadAttachment({
          file,
          projectId,
          threadId: effectiveThreadId,
        });
        setChips((prev) =>
          prev.map((c) =>
            c.tempId === chip.tempId
              ? {
                  ...c,
                  status: result ? ("done" as const) : ("error" as const),
                  uploadResult: result,
                }
              : c
          )
        );
        if (!result) {
          toast.error(t("attachment_failed"));
        }
      })
    );
  }

  function removeChip(tempId: string) {
    setChips((prev) => {
      const target = prev.find((c) => c.tempId === tempId);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // ignore
        }
      }
      return prev.filter((c) => c.tempId !== tempId);
    });
  }

  const anyUploading = useMemo(
    () => chips.some((c) => c.status === "uploading"),
    [chips]
  );

  const hasDoneAttachments = useMemo(
    () => chips.some((c) => c.status === "done"),
    [chips]
  );

  async function fetchAttachmentsForMessage(
    messageId: string
  ): Promise<ThreadAttachment[]> {
    const supabase = createSupabaseBrowser();
    const { data: rows } = await supabase
      .from("thread_message_attachments")
      .select(
        "id, message_id, kind, storage_path, file_name, mime_type, size_bytes, thumbnail_path, created_at"
      )
      .eq("message_id", messageId);
    if (!rows || rows.length === 0) return [];
    const resolved = await Promise.all(
      rows.map(async (att) => {
        const [primary, thumb] = await Promise.all([
          supabase.storage
            .from(ATTACHMENT_BUCKET)
            .createSignedUrl(att.storage_path, SIGNED_URL_TTL_SECONDS),
          att.thumbnail_path
            ? supabase.storage
                .from(ATTACHMENT_BUCKET)
                .createSignedUrl(
                  att.thumbnail_path,
                  SIGNED_URL_TTL_SECONDS
                )
            : Promise.resolve({ data: null }),
        ]);
        const attachment: ThreadAttachment = {
          id: att.id,
          message_id: att.message_id,
          kind: att.kind as AttachmentKind,
          storage_path: att.storage_path,
          file_name: att.file_name,
          mime_type: att.mime_type,
          size_bytes: att.size_bytes,
          thumbnail_path: att.thumbnail_path,
          signed_url: primary.data?.signedUrl ?? null,
          thumbnail_signed_url:
            (thumb as { data: { signedUrl?: string } | null }).data
              ?.signedUrl ?? null,
        };
        return attachment;
      })
    );
    return resolved;
  }

  async function handleSend() {
    if (sending || anyUploading) return;
    const trimmed = body.trim();
    const doneChips = chips.filter((c) => c.status === "done");
    if (trimmed.length === 0 && doneChips.length === 0) return;

    setSending(true);

    const visibility = isYagiAdmin && isInternal ? "internal" : "shared";

    try {
      if (doneChips.length === 0) {
        // Text-only path — preserve legacy sendMessage.
        const result = await sendMessage({
          projectId,
          body: trimmed,
          visibility,
        });
        if (result && "error" in result) {
          if (result.error === "forbidden") {
            toast.error(tErrors("unauthorized"));
          } else {
            toast.error(tErrors("generic"));
          }
          return;
        }
        // Clear textarea; realtime subscription will append the message.
        setBody("");
        return;
      }

      const attachments = doneChips
        .map((c) => c.uploadResult)
        .filter((r): r is UploadResult => r !== null)
        .map((r) => ({
          storage_path: r.storage_path,
          file_name: r.file_name,
          mime_type: r.mime_type,
          size_bytes: r.size_bytes,
          kind: r.kind,
          thumbnail_path: r.thumbnail_path,
        }));

      const result = await sendMessageWithAttachments({
        projectId,
        body: trimmed.length > 0 ? trimmed : null,
        visibility,
        attachments,
      });

      if (result && "error" in result) {
        if (result.error === "forbidden") {
          toast.error(tErrors("unauthorized"));
        } else {
          toast.error(tErrors("generic"));
        }
        return;
      }

      // Success: realtime brings the message row but NOT attachments — do a
      // one-shot fetch and merge into local state.
      const messageId = result.messageId;
      if (messageId) {
        const fetched = await fetchAttachmentsForMessage(messageId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId ? { ...m, attachments: fetched } : m
          )
        );
      }

      // Clear composer: textarea + all chips (also revoke object URLs).
      setBody("");
      setChips((prev) => {
        for (const c of prev) {
          if (c.previewUrl) {
            try {
              URL.revokeObjectURL(c.previewUrl);
            } catch {
              // ignore
            }
          }
        }
        return [];
      });
    } finally {
      setSending(false);
    }
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }
  function onDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  }

  function formatTime(ts: string) {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(ts));
  }

  const sendDisabled =
    sending ||
    anyUploading ||
    (!body.trim() && !hasDoneAttachments);
  const sendTooltip = anyUploading ? t("attachment_uploading") : undefined;

  return (
    <div className="flex flex-col border border-border rounded-lg overflow-hidden">
      {/* Message list */}
      <div
        ref={listRef}
        className="flex-1 max-h-[60vh] overflow-y-auto p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            {t("empty")}
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.author_id === currentUserId;
            const authorName =
              msg.author?.display_name ||
              msg.author?.handle ||
              msg.author_id.slice(0, 8);
            const initial = authorName.charAt(0).toUpperCase();
            const attachments = msg.attachments ?? [];

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2",
                  isMine ? "flex-row-reverse" : "flex-row"
                )}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {msg.author?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.author.avatar_url}
                      alt={authorName}
                      className="w-7 h-7 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground uppercase">
                      {initial}
                    </span>
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    "max-w-[75%] space-y-0.5",
                    isMine ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-baseline gap-2",
                      isMine ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <span className="text-xs font-medium text-foreground">
                      {authorName}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatTime(msg.created_at)}
                    </span>
                    {msg.visibility === "internal" && isYagiAdmin && (
                      <span className="text-[10px] font-medium text-muted-foreground border border-border rounded px-1 py-0.5">
                        {t("internal_badge")}
                      </span>
                    )}
                  </div>
                  {msg.body && msg.body.length > 0 && (
                    <div
                      className={cn(
                        "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap keep-all",
                        isMine
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {msg.body}
                    </div>
                  )}
                  {attachments.length > 0 && (
                    <div
                      className={cn(
                        "flex flex-col gap-1.5 mt-1",
                        isMine ? "items-end" : "items-start"
                      )}
                    >
                      {attachments.map((att) => (
                        <AttachmentRenderer
                          key={att.id}
                          attachment={att}
                          onOpenLightbox={setLightboxUrl}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <div
        className={cn(
          "border-t border-border p-3 space-y-2 transition-colors",
          isDragging && "bg-muted/40"
        )}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Visibility toggle — only for yagi_admin */}
        {isYagiAdmin && (
          <div className="flex items-center gap-2">
            <Switch
              id="visibility-toggle"
              checked={isInternal}
              onCheckedChange={setIsInternal}
            />
            <Label
              htmlFor="visibility-toggle"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              {isInternal ? t("visibility_internal") : t("visibility_shared")}
            </Label>
          </div>
        )}

        {/* Attachment chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <AttachmentChip
                key={chip.tempId}
                chip={chip}
                onRemove={() => removeChip(chip.tempId)}
                removeLabel={t("attachment_remove")}
                uploadingLabel={t("attachment_uploading")}
                failedLabel={t("attachment_failed")}
              />
            ))}
          </div>
        )}

        <div className="flex gap-2 items-end">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/mp4,video/quicktime,video/webm,application/pdf,*/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                void handleFiles(e.target.files);
              }
              // reset so the same file can be selected again later
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="self-end shrink-0 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("attachment_add")}
            title={t("attachment_add")}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("new_message_ph")}
            className="min-h-[60px] resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={sendDisabled}
            className="self-end rounded-full uppercase tracking-[0.12em] text-xs"
            size="sm"
            title={sendTooltip}
            aria-label={sendTooltip ?? t("send")}
          >
            {t("send")}
          </Button>
        </div>
      </div>

      {/* Image lightbox */}
      <Dialog
        open={lightboxUrl !== null}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent className="max-w-5xl p-2 bg-background">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt=""
              className="w-full h-auto max-h-[85vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Sub-components ---------------------------------------------------------

function AttachmentChip({
  chip,
  onRemove,
  removeLabel,
  uploadingLabel,
  failedLabel,
}: {
  chip: ComposerChip;
  onRemove: () => void;
  removeLabel: string;
  uploadingLabel: string;
  failedLabel: string;
}) {
  const { file, status, previewUrl } = chip;
  return (
    <div className="flex items-center gap-2 border border-border rounded-lg bg-background px-2 py-1.5 text-xs max-w-[260px]">
      <div className="flex-shrink-0 w-8 h-8 rounded bg-muted overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : file.type === "application/pdf" ? (
          <FileText className="h-4 w-4 text-muted-foreground" />
        ) : (
          <FileIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate font-medium text-foreground" title={file.name}>
          {file.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {status === "uploading" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {uploadingLabel}
            </span>
          ) : status === "error" ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {failedLabel}
            </span>
          ) : (
            formatBytes(file.size)
          )}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        title={removeLabel}
        className="flex-shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function AttachmentRenderer({
  attachment,
  onOpenLightbox,
}: {
  attachment: ThreadAttachment;
  onOpenLightbox: (url: string) => void;
}) {
  const { kind, file_name, size_bytes, signed_url, thumbnail_signed_url } =
    attachment;

  if (kind === "image") {
    const thumbSrc = thumbnail_signed_url ?? signed_url;
    if (!thumbSrc) {
      return (
        <div className="flex items-center gap-2 border border-border rounded-lg bg-background px-2 py-1.5 text-xs">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[180px]">{file_name}</span>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => {
          if (signed_url) onOpenLightbox(signed_url);
        }}
        className="block overflow-hidden rounded-lg border border-border bg-muted hover:opacity-95"
        title={file_name}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbSrc}
          alt={file_name}
          className="max-w-[240px] max-h-[240px] object-cover"
        />
      </button>
    );
  }

  if (kind === "video") {
    if (!signed_url) {
      return (
        <div className="flex items-center gap-2 border border-border rounded-lg bg-background px-2 py-1.5 text-xs">
          <FileIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate max-w-[180px]">{file_name}</span>
        </div>
      );
    }
    return (
      <video
        controls
        preload="metadata"
        poster={thumbnail_signed_url ?? undefined}
        className="max-w-[320px] rounded-lg border border-border bg-black"
      >
        <source src={signed_url} />
      </video>
    );
  }

  // pdf + file: the same row layout with a different icon.
  const Icon = kind === "pdf" ? FileText : FileIcon;
  return (
    <a
      href={signed_url ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 border border-border rounded-lg bg-background px-3 py-2 text-xs hover:bg-muted/40 max-w-[320px]"
      title={file_name}
    >
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="truncate font-medium text-foreground">
          {file_name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatBytes(size_bytes)}
        </span>
      </div>
    </a>
  );
}
