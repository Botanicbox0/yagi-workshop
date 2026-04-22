"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Plus,
  X,
  Loader2,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  Film,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  validateAttachmentFile,
  type AttachmentKind,
} from "@/lib/team-channels/attachment-caps";
import { requestUploadUrls } from "@/lib/team-channels/attachments";
import { sendMessage } from "@/app/[locale]/app/team/[slug]/actions";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 5;
const MAX_BODY_CHARS = 5000;

/** YAGI Internal workspace id (constant — from migration). */
const YAGI_INTERNAL_WORKSPACE_ID = "320c1564-b0e7-481a-871c-be8d9bb605a8";

type StagedStatus = "pending" | "uploading" | "done" | "error";

type StagedAttachment = {
  id: string;
  file: File;
  status: StagedStatus;
  storagePath?: string;
  kind: AttachmentKind;
  previewUrl: string | null;
};

type Props = {
  channelId: string;
  channelSlug: string;
  locale: string;
  isArchived: boolean;
};

export function MessageComposer({
  channelId,
  channelSlug,
  locale,
  isArchived,
}: Props) {
  const t = useTranslations("team_chat");

  // Pre-compute the message id so storage paths + the eventual DB row align.
  // Re-generated after each successful send inside `resetComposer`.
  const [messageId, setMessageId] = useState<string>(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  );

  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [, startSendTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea on input (capped at ~160px so it doesn't swallow
  // the channel view).
  const autoGrow = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, 160);
    el.style.height = `${next}px`;
  }, []);

  useEffect(() => {
    autoGrow();
  }, [body, autoGrow]);

  // Revoke object URLs on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      for (const a of attachments) {
        if (a.previewUrl) {
          try {
            URL.revokeObjectURL(a.previewUrl);
          } catch {
            // ignore
          }
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anyUploading = useMemo(
    () => attachments.some((a) => a.status === "uploading" || a.status === "pending"),
    [attachments]
  );

  const hasDone = useMemo(
    () => attachments.some((a) => a.status === "done"),
    [attachments]
  );

  const resetComposer = useCallback(() => {
    setAttachments((prev) => {
      for (const a of prev) {
        if (a.previewUrl) {
          try {
            URL.revokeObjectURL(a.previewUrl);
          } catch {
            // ignore
          }
        }
      }
      return [];
    });
    setBody("");
    setMessageId(
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`
    );
    // Next tick — shrink textarea back to single line.
    requestAnimationFrame(() => autoGrow());
  }, [autoGrow]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {
          // ignore
        }
      }
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  /** Validate, stage, and kick off uploads for dropped/selected files. */
  const handleFiles = useCallback(
    async (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (files.length === 0) return;

      let currentCount = 0;
      setAttachments((prev) => {
        currentCount = prev.length;
        return prev;
      });
      await Promise.resolve();

      const remainingSlots = MAX_ATTACHMENTS - currentCount;
      if (remainingSlots <= 0) {
        toast.error(t("composer_max_attachments"));
        return;
      }

      const toProcess: StagedAttachment[] = [];
      let rejectedCount = 0;
      let overflow = false;
      for (const file of files) {
        if (toProcess.length >= remainingSlots) {
          overflow = true;
          break;
        }
        const v = validateAttachmentFile(file);
        if (!v.ok) {
          rejectedCount += 1;
          if (v.reason === "size") {
            toast.error(t("attachment_size_too_large"));
          } else {
            toast.error(t("attachment_unsupported_type"));
          }
          continue;
        }
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        const isImage = file.type.startsWith("image/");
        toProcess.push({
          id,
          file,
          status: "pending",
          kind: v.kind,
          previewUrl: isImage ? URL.createObjectURL(file) : null,
        });
      }

      if (overflow || files.length > remainingSlots + rejectedCount) {
        toast.error(t("composer_max_attachments"));
      }

      if (toProcess.length === 0) return;

      setAttachments((prev) => [...prev, ...toProcess]);

      // Request signed upload URLs for the batch, then PUT each file.
      const res = await requestUploadUrls({
        workspaceId: YAGI_INTERNAL_WORKSPACE_ID,
        channelId,
        messageId,
        files: toProcess.map((p) => ({
          fileName: p.file.name,
          mimeType: p.file.type || "application/octet-stream",
          size: p.file.size,
        })),
      });

      if (!res.ok) {
        // Mark staged items as errored — keep them in the list so the user
        // can retry by removing + re-adding.
        setAttachments((prev) =>
          prev.map((a) =>
            toProcess.some((p) => p.id === a.id)
              ? { ...a, status: "error" as const }
              : a
          )
        );
        toast.error(t("error_send_failed"));
        return;
      }

      // Mark uploading + upload in parallel.
      setAttachments((prev) =>
        prev.map((a) =>
          toProcess.some((p) => p.id === a.id)
            ? { ...a, status: "uploading" as const }
            : a
        )
      );

      await Promise.all(
        toProcess.map(async (staged, idx) => {
          const urlInfo = res.urls[idx];
          if (!urlInfo) {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === staged.id ? { ...a, status: "error" as const } : a
              )
            );
            return;
          }
          try {
            const uploadResp = await fetch(urlInfo.uploadUrl, {
              method: "PUT",
              headers: {
                "Content-Type":
                  staged.file.type || "application/octet-stream",
              },
              body: staged.file,
            });
            if (!uploadResp.ok) throw new Error(`upload ${uploadResp.status}`);
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === staged.id
                  ? {
                      ...a,
                      status: "done" as const,
                      storagePath: urlInfo.storagePath,
                      kind: urlInfo.kind,
                    }
                  : a
              )
            );
          } catch {
            setAttachments((prev) =>
              prev.map((a) =>
                a.id === staged.id ? { ...a, status: "error" as const } : a
              )
            );
            toast.error(t("error_send_failed"));
          }
        })
      );
    },
    [channelId, messageId, t]
  );

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFiles(e.target.files);
    }
    // Allow re-selecting the same file later.
    e.target.value = "";
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_BODY_CHARS;
  const sendDisabled =
    isSending ||
    anyUploading ||
    tooLong ||
    (trimmed.length === 0 && !hasDone) ||
    trimmed.length === 0; /* DB requires body 1..5000 */

  const sendTooltip = anyUploading
    ? t("composer_send_blocked_uploading")
    : tooLong
      ? t("composer_text_too_long")
      : undefined;

  const handleSend = useCallback(() => {
    if (sendDisabled) return;

    const doneRecords = attachments
      .filter((a): a is StagedAttachment & { storagePath: string } =>
        a.status === "done" && typeof a.storagePath === "string"
      )
      .map((a) => ({
        storage_path: a.storagePath,
        file_name: a.file.name,
        mime_type: a.file.type || "application/octet-stream",
        size_bytes: a.file.size,
        kind: a.kind,
        thumbnail_path: null as string | null,
      }));

    setIsSending(true);
    startSendTransition(async () => {
      try {
        const result = await sendMessage({
          messageId,
          channelId,
          channelSlug,
          locale,
          body: trimmed,
          attachmentRecords: doneRecords,
        });
        if (!result.ok) {
          toast.error(t("error_send_failed"));
          return;
        }
        resetComposer();
      } catch {
        toast.error(t("error_send_failed"));
      } finally {
        setIsSending(false);
      }
    });
  }, [
    sendDisabled,
    attachments,
    messageId,
    channelId,
    channelSlug,
    locale,
    trimmed,
    resetComposer,
    t,
  ]);

  if (isArchived) return null;

  return (
    <div
      className={cn(
        "relative border border-border rounded-lg bg-background",
        isDragging && "ring-2 ring-foreground/20"
      )}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Drag-drop overlay */}
      {isDragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/90 border-2 border-dashed border-foreground/40">
          <p className="text-sm font-medium text-foreground keep-all">
            {t("composer_drop_hint")}
          </p>
        </div>
      )}

      {/* Staged attachments */}
      {attachments.length > 0 && (
        <ul className="flex flex-wrap gap-2 px-3 pt-3">
          {attachments.map((a) => (
            <li key={a.id}>
              <StagedChip
                attachment={a}
                onRemove={() => removeAttachment(a.id)}
                removeLabel={t("composer_attach")}
                uploadingLabel={t("composer_uploading")}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="px-3 pt-2">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={t("composer_placeholder", { slug: channelSlug })}
          className="min-h-[40px] max-h-[160px] resize-none border-0 shadow-none p-0 focus-visible:ring-0 text-sm"
          rows={1}
        />
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={onFileInputChange}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("composer_attach")}
            title={t("composer_attach")}
            disabled={attachments.length >= MAX_ATTACHMENTS}
          >
            <Plus className="h-4 w-4" />
          </Button>
          {attachments.length > 0 && (
            <span className="text-[11px] text-muted-foreground tabular-nums keep-all">
              {t("composer_attachment_count", { count: attachments.length })}
            </span>
          )}
          {tooLong && (
            <span className="text-[11px] text-destructive keep-all">
              {t("composer_text_too_long")}
            </span>
          )}
        </div>
        <Button
          type="button"
          onClick={handleSend}
          disabled={sendDisabled}
          size="sm"
          className="rounded-full uppercase tracking-[0.12em] text-xs"
          title={sendTooltip}
          aria-label={sendTooltip ?? t("composer_send")}
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            t("composer_send")
          )}
        </Button>
      </div>
    </div>
  );
}

// --- Sub-components --------------------------------------------------------

function StagedChip({
  attachment,
  onRemove,
  removeLabel,
  uploadingLabel,
}: {
  attachment: StagedAttachment;
  onRemove: () => void;
  removeLabel: string;
  uploadingLabel: string;
}) {
  const { file, status, previewUrl, kind } = attachment;
  return (
    <div className="flex items-center gap-2 border border-border rounded-md bg-background px-2 py-1 text-xs max-w-[240px]">
      <div className="shrink-0 w-7 h-7 rounded bg-muted overflow-hidden flex items-center justify-center">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : kind === "video" ? (
          <Film className="h-3.5 w-3.5 text-muted-foreground" />
        ) : kind === "pdf" ? (
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
        ) : kind === "image" ? (
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="truncate font-medium text-foreground max-w-[130px]" title={file.name}>
          {file.name}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {status === "pending" || status === "uploading" ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              {uploadingLabel}
            </span>
          ) : status === "error" ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {formatBytes(file.size)}
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
        className="shrink-0 p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
