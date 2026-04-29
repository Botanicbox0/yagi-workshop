"use client";

// =============================================================================
// ReferenceBoard — Phase 3.0 hotfix-1 task_05 (Wave C)
//
// Replaces the old ReferencesEditor (URL input + image/PDF buttons + chip list)
// with a Pinterest/Figma-board pattern:
//   - Single drag-and-drop zone: images/PDFs/URL paste, no kind tabs
//   - Masonry-like grid: 3 col desktop / 2 tablet / 1 mobile
//   - Each card: thumbnail on top + free-text caption textarea below
//   - HTML5 native drag-and-drop only (no react-dnd / dnd-kit)
//   - Design system v0.2.0: achromatic, soft shadow, no internal seams (L-011/013/012)
//
// TODO(Phase 3.1): HTML5 drag-to-reorder cards
// =============================================================================

import { useState, useRef, useCallback, type ChangeEvent, type DragEvent } from "react";
import { useTranslations } from "next-intl";
import { ImageIcon, FileText, Link2, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  fetchVideoMetadataAction,
  getWizardAssetPutUrlAction,
} from "@/app/[locale]/app/projects/new/actions";

// ---------------------------------------------------------------------------
// Re-export the shared type (consumed by wizard + actions)
// ---------------------------------------------------------------------------

export type WizardReference = {
  id: string;
  kind: "url" | "image" | "pdf" | "video";
  url: string;
  note: string;
  title?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
};

function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Reference card
// ---------------------------------------------------------------------------

function ReferenceBoardCard({
  item,
  uploading,
  onDelete,
  onCaptionChange,
}: {
  item: WizardReference;
  uploading: boolean;
  onDelete: (id: string) => void;
  onCaptionChange: (id: string, note: string) => void;
}) {
  const t = useTranslations("projects");

  return (
    <div
      className="group relative rounded-lg overflow-hidden break-inside-avoid"
      style={{
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.04)",
      }}
    >
      {/* Thumbnail / preview area */}
      <div className="relative w-full bg-muted flex items-center justify-center min-h-[120px]">
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/80">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : null}

        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.title ?? ""}
            className="w-full object-cover"
            style={{ display: "block" }}
          />
        ) : item.kind === "image" ? (
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        ) : item.kind === "pdf" ? (
          <div className="flex flex-col items-center gap-1 py-6">
            <FileText className="w-8 h-8 text-muted-foreground" />
            {item.title && (
              <p className="text-xs text-muted-foreground max-w-[80%] truncate text-center">
                {item.title}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 py-6">
            <Link2 className="w-8 h-8 text-muted-foreground" />
            {item.title && (
              <p className="text-xs text-muted-foreground max-w-[80%] truncate text-center">
                {item.title}
              </p>
            )}
          </div>
        )}

        {/* Delete button — hover-revealed */}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          aria-label="삭제"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Caption area */}
      <div className="p-2.5">
        <textarea
          value={item.note}
          onChange={(e) => onCaptionChange(item.id, e.target.value)}
          placeholder={t("wizard.field.references.caption_placeholder")}
          rows={2}
          maxLength={500}
          className={cn(
            "w-full resize-none bg-transparent text-sm text-foreground",
            "placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-0 border-0 p-0",
            "leading-relaxed"
          )}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ReferenceBoard
// ---------------------------------------------------------------------------

interface ReferenceBoardProps {
  refs: WizardReference[];
  onChange: (next: WizardReference[]) => void;
}

export function ReferenceBoard({ refs, onChange }: ReferenceBoardProps) {
  const t = useTranslations("projects");
  const [dragOver, setDragOver] = useState(false);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  function addUploadingId(id: string) {
    setUploadingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function removeUploadingId(id: string) {
    setUploadingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // -----------------------------------------------------------------------
  // URL processing
  // -----------------------------------------------------------------------

  // We use a ref to track the current refs without stale closure issues
  const refsRef = useRef(refs);
  refsRef.current = refs;

  const processUrl = useCallback(
    async (rawUrl: string) => {
      let url = rawUrl.trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) url = `https://${url}`;

      const pendingId = uuidv4();
      // Add a placeholder card immediately while we fetch metadata
      const placeholder: WizardReference = {
        id: pendingId,
        kind: "url",
        url,
        note: "",
      };
      onChange([...refsRef.current, placeholder]);
      addUploadingId(pendingId);

      try {
        const meta = await fetchVideoMetadataAction(url);
        if (meta) {
          // Update the placeholder in-place with video metadata
          onChange(
            refsRef.current.map((r) =>
              r.id === pendingId
                ? {
                    id: pendingId,
                    kind: "video" as const,
                    url,
                    note: r.note,
                    title: meta.title,
                    thumbnailUrl: meta.thumbnailUrl,
                    durationSeconds: meta.durationSeconds,
                  }
                : r
            )
          );
        } else {
          let hostname = url;
          try { hostname = new URL(url).hostname; } catch { /* ignore */ }
          // Update the placeholder with resolved hostname title
          onChange(
            refsRef.current.map((r) =>
              r.id === pendingId ? { ...r, title: hostname } : r
            )
          );
        }
      } catch {
        // Keep placeholder as-is with no title
      } finally {
        removeUploadingId(pendingId);
      }
    },
    [onChange]
  );

  // -----------------------------------------------------------------------
  // File processing (images + PDFs via R2)
  // -----------------------------------------------------------------------

  const processFile = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith("image/");
      const isPdf = file.type === "application/pdf";

      if (!isImage && !isPdf) {
        toast.error("이미지 또는 PDF 파일만 지원합니다.");
        return;
      }

      // File size validation
      if (isImage && file.size > 5 * 1024 * 1024) {
        toast.error(t("wizard.field.references.file_too_large_image"));
        return;
      }
      if (isPdf && file.size > 10 * 1024 * 1024) {
        toast.error(t("wizard.field.references.file_too_large_pdf"));
        return;
      }

      const kind: "image" | "pdf" = isImage ? "image" : "pdf";
      const id = uuidv4();

      // Add placeholder card immediately with uploading state
      const placeholder: WizardReference = {
        id,
        kind,
        url: "",
        note: "",
        title: file.name,
      };
      onChange([...refsRef.current, placeholder]);
      addUploadingId(id);

      try {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
        const storageKey = `project-wizard/${id}.${ext}`;

        // Phase 3.0 hotfix-2 fix: createBriefAssetPutUrl + objectPublicUrl are
        // server-only (use S3Client + process.env credentials). This component
        // is "use client" — calling them directly caused silent failures. Use
        // server action getWizardAssetPutUrlAction to generate both URLs server-side.
        const urlResult = await getWizardAssetPutUrlAction(storageKey, file.type);
        if (!urlResult.ok) throw new Error(`presign failed: ${urlResult.error}`);

        const uploadRes = await fetch(urlResult.putUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!uploadRes.ok) throw new Error("R2 upload failed");

        const publicUrl = urlResult.publicUrl;
        // Update the placeholder in-place with the uploaded URL
        onChange(
          refsRef.current.map((r) =>
            r.id === id
              ? {
                  ...r,
                  url: publicUrl,
                  thumbnailUrl: isImage ? publicUrl : undefined,
                }
              : r
          )
        );
      } catch {
        toast.error(t("wizard.field.references.upload_failed"));
        // Remove the failed placeholder
        onChange(refsRef.current.filter((r) => r.id !== id));
      } finally {
        removeUploadingId(id);
      }
    },
    [onChange, t]
  );

  // -----------------------------------------------------------------------
  // Drag-and-drop handlers (HTML5 native — no react-dnd / dnd-kit)
  // -----------------------------------------------------------------------

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const text = e.dataTransfer.getData("text/plain");

    if (files.length > 0) {
      files.forEach((f) => void processFile(f));
    } else if (text) {
      void processUrl(text.trim());
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const text = e.clipboardData.getData("text/plain").trim();
    if (text && /^https?:\/\//i.test(text)) {
      e.preventDefault();
      void processUrl(text);
    }
    // If pasted files: handle via dragDrop. If text without URL, ignore.
  }

  // -----------------------------------------------------------------------
  // File input (fallback button)
  // -----------------------------------------------------------------------

  function handleFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset so re-selecting same file fires
    files.forEach((f) => void processFile(f));
  }

  // -----------------------------------------------------------------------
  // Card operations
  // -----------------------------------------------------------------------

  const handleDelete = useCallback(
    (id: string) => {
      onChange(refs.filter((r) => r.id !== id));
    },
    [refs, onChange]
  );

  const handleCaptionChange = useCallback(
    (id: string, note: string) => {
      onChange(refs.map((r) => (r.id === id ? { ...r, note } : r)));
    },
    [refs, onChange]
  );

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        role="region"
        aria-label="참고 자료 추가"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg",
          "border-dashed transition-colors cursor-default",
          "min-h-[100px] px-6 py-5",
          dragOver
            ? "border-2 border-foreground/40 bg-muted/50"
            : "border border-border/40 bg-muted/20"
        )}
      >
        {dragOver ? (
          <p className="text-sm font-medium text-foreground">
            {t("wizard.field.references.dropzone_overlay")}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground text-center keep-all">
              {t("wizard.field.references.dropzone_hint")}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs uppercase tracking-[0.08em] mt-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t("wizard.field.references.add_button")}
            </Button>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="sr-only"
        onChange={handleFileInputChange}
        aria-label={t("wizard.field.references.add_button")}
      />

      {/* Empty state */}
      {refs.length === 0 && (
        <p className="text-xs text-muted-foreground py-1 keep-all">
          {t("wizard.field.references.empty")}
        </p>
      )}

      {/* Masonry-like grid: CSS columns */}
      {refs.length > 0 && (
        <div
          className={cn(
            "gap-4",
            // CSS columns for masonry feel
            "columns-1 sm:columns-2 lg:columns-3"
          )}
          style={{ columnGap: "1rem" }}
        >
          {refs.map((r) => (
            <div key={r.id} className="mb-4">
              <ReferenceBoardCard
                item={r}
                uploading={uploadingIds.has(r.id)}
                onDelete={handleDelete}
                onCaptionChange={handleCaptionChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
