"use client";

// =============================================================================
// Phase 5 Wave B task_05 v3 — Step 2 left column (보유 자료 / brief docs)
//
// Two add paths:
//   - File upload: getBriefingDocumentPutUrlAction → R2 PUT → addBriefingDocumentAction
//   - Link: addBriefingDocumentAction (kind='brief', source_type='url')
//
// The list shows briefing_documents WHERE kind='brief' for this project,
// with a delete X per row.
// =============================================================================

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Loader2, FileText, Link as LinkIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getBriefingDocumentPutUrlAction,
  addBriefingDocumentAction,
  removeBriefingDocumentAction,
} from "./briefing-step2-actions";

export type BriefDoc = {
  id: string;
  source_type: "upload" | "url";
  storage_key: string | null;
  filename: string | null;
  url: string | null;
  size_bytes: number | null;
};

const ACCEPT_MIME =
  "application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/jpeg,image/png,image/webp,image/gif";

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export function Step2BriefColumn({
  projectId,
  documents,
  onAdded,
  onRemoved,
}: {
  projectId: string;
  documents: BriefDoc[];
  onAdded: (doc: BriefDoc) => void;
  onRemoved: (id: string) => void;
}) {
  const t = useTranslations("projects");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    try {
      const presign = await getBriefingDocumentPutUrlAction({
        projectId,
        kind: "brief",
        contentType: file.type,
        sizeBytes: file.size,
      });
      if (!presign.ok) {
        toast.error(t("briefing.step2.toast.upload_failed"));
        return;
      }
      const putRes = await fetch(presign.putUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        toast.error(t("briefing.step2.toast.upload_failed"));
        return;
      }
      const insert = await addBriefingDocumentAction({
        projectId,
        kind: "brief",
        source_type: "upload",
        storage_key: presign.storageKey,
        filename: file.name,
        size_bytes: file.size,
        mime_type: file.type,
      });
      if (!insert.ok) {
        toast.error(t("briefing.step2.toast.add_failed"));
        return;
      }
      onAdded({
        id: insert.document.id,
        source_type: "upload",
        storage_key: insert.document.storage_key,
        filename: insert.document.filename,
        url: null,
        size_bytes: insert.document.size_bytes,
      });
    } catch (e) {
      console.error("[Step2BriefColumn] upload threw:", e);
      toast.error(t("briefing.step2.toast.upload_failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleLinkAdd() {
    if (!linkValue.trim()) return;
    setLinkBusy(true);
    try {
      const insert = await addBriefingDocumentAction({
        projectId,
        kind: "brief",
        source_type: "url",
        url: linkValue.trim(),
      });
      if (!insert.ok) {
        toast.error(t("briefing.step2.toast.add_failed"));
        return;
      }
      onAdded({
        id: insert.document.id,
        source_type: "url",
        storage_key: null,
        filename: null,
        url: insert.document.url,
        size_bytes: null,
      });
      setLinkValue("");
      setLinkOpen(false);
    } finally {
      setLinkBusy(false);
    }
  }

  async function handleRemove(id: string) {
    const res = await removeBriefingDocumentAction({ documentId: id });
    if (!res.ok) {
      toast.error(t("briefing.step2.toast.remove_failed"));
      return;
    }
    onRemoved(id);
  }

  return (
    <section className="rounded-3xl border border-border/40 p-6 bg-background flex flex-col gap-5">
      <header>
        <h2 className="text-base font-semibold tracking-tight keep-all">
          {t("briefing.step2.sections.brief.title")}
        </h2>
        <p className="text-xs text-muted-foreground mt-1.5 keep-all leading-relaxed">
          {t("briefing.step2.sections.brief.helper")}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="justify-start text-sm"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <FileText className="w-4 h-4 mr-2" />
          )}
          {t("briefing.step2.sections.brief.upload_cta")}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_MIME}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border/40" />
          <span>{t("briefing.step2.sections.brief.divider")}</span>
          <div className="flex-1 h-px bg-border/40" />
        </div>

        {linkOpen ? (
          <div className="flex flex-col gap-2">
            <Input
              type="url"
              autoFocus
              placeholder={t(
                "briefing.step2.sections.brief.link_input_placeholder",
              )}
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleLinkAdd();
                if (e.key === "Escape") {
                  setLinkOpen(false);
                  setLinkValue("");
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLinkOpen(false);
                  setLinkValue("");
                }}
              >
                {t("briefing.step2.sections.brief.link_cancel")}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleLinkAdd}
                disabled={linkBusy || !linkValue.trim()}
              >
                {linkBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  t("briefing.step2.sections.brief.link_add")
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLinkOpen(true)}
            className="justify-start text-sm"
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            {t("briefing.step2.sections.brief.link_cta")}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 mt-2">
        {documents.length === 0 ? (
          <p className="text-xs text-muted-foreground keep-all">
            {t("briefing.step2.sections.brief.list_empty")}
          </p>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl",
                "border border-border/40 text-sm",
              )}
            >
              {doc.source_type === "upload" ? (
                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
              ) : (
                <LinkIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              <span className="truncate flex-1">
                {doc.filename ?? doc.url ?? "—"}
              </span>
              {doc.size_bytes && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatSize(doc.size_bytes)}
                </span>
              )}
              <button
                type="button"
                onClick={() => void handleRemove(doc.id)}
                className="p-1 rounded hover:bg-muted transition-colors"
                aria-label="Remove"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
