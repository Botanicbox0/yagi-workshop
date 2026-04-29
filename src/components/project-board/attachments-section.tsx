"use client";

/**
 * attachments-section.tsx
 * Phase 3.1 hotfix-3 — Shared AttachmentsSection component.
 * Used in wizard Step 2 (boardId=null, mode=wizard) and project detail brief mode.
 *
 * Design system v0.2.0 compliance (L-018 read before coding):
 *   - L-010: font-suit eyebrows (text-xs uppercase tracking-wider)
 *   - L-011: achromatic only (no color accents)
 *   - L-012: no internal page seams — section dividers are hairline borders
 *   - L-013: soft shadow + border-border/40 on cards (no harsh 1px)
 *   - L-014: no italic em
 *
 * URL security (L-042 candidate):
 *   - Rejects javascript:, data:, file:, chrome: schemes at client layer
 *   - Only http:// and https:// allowed
 */

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { PdfCard } from "./attachments/pdf-card";
import { UrlCard } from "./attachments/url-card";
import type { PdfAttachment, UrlAttachment } from "@/lib/board/asset-index";

// ============================================================
// Props
// ============================================================

type Props = {
  mode: "wizard" | "brief";
  boardId: string | null; // null in wizard (board doesn't exist yet)
  pdfs: PdfAttachment[];
  urls: UrlAttachment[];
  onPdfAdd: (file: File) => Promise<void>;
  onPdfRemove: (id: string) => Promise<void>;
  onUrlAdd: (url: string, note: string | null) => Promise<void>;
  onUrlNoteUpdate: (id: string, note: string) => Promise<void>;
  onUrlRemove: (id: string) => Promise<void>;
  isLocked: boolean;
  isReadOnly: boolean; // mobile read-only OR legacy state
};

// ============================================================
// URL validation helpers (client-side, L-042)
// ============================================================

const BLOCKED_SCHEMES = ["javascript:", "data:", "file:", "chrome:", "blob:", "vbscript:"];

function isValidUrl(raw: string): { valid: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, reason: "parse_error" };
  }

  // Only http/https allowed
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "scheme" };
  }

  // Belt-and-suspenders: explicitly reject dangerous schemes even if above passes
  const lower = raw.toLowerCase().trim();
  for (const blocked of BLOCKED_SCHEMES) {
    if (lower.startsWith(blocked)) {
      return { valid: false, reason: "scheme" };
    }
  }

  return { valid: true };
}

function detectProvider(url: string): UrlAttachment["provider"] {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    if (host === "vimeo.com") return "vimeo";
  } catch {
    // ignore
  }
  return "generic";
}

// ============================================================
// Component
// ============================================================

export function AttachmentsSection({
  pdfs,
  urls,
  onPdfAdd,
  onPdfRemove,
  onUrlAdd,
  onUrlNoteUpdate,
  onUrlRemove,
  isLocked,
  isReadOnly,
}: Props) {
  const t = useTranslations("attachments");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL form state
  const [urlInput, setUrlInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const [urlSubmitting, setUrlSubmitting] = useState(false);

  // PDF drag state
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const [pdfError, setPdfError] = useState("");
  const [pdfUploading, setPdfUploading] = useState(false);

  const mutationsDisabled = isLocked || isReadOnly;

  // ============================================================
  // PDF handlers
  // ============================================================

  const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20MB (L-042: per task_01 RPC)
  const PDF_MAX_COUNT = 30;

  async function handlePdfFile(file: File) {
    setPdfError("");

    if (file.type !== "application/pdf") {
      setPdfError("PDF 파일만 업로드 가능합니다.");
      return;
    }

    if (file.size > PDF_MAX_BYTES) {
      setPdfError(t("pdf.size_too_large"));
      return;
    }

    if (pdfs.length >= PDF_MAX_COUNT) {
      setPdfError(t("pdf.count_exceeded"));
      return;
    }

    setPdfUploading(true);
    try {
      await onPdfAdd(file);
    } catch (err) {
      console.error("[AttachmentsSection] PDF add failed:", err);
      setPdfError("업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setPdfUploading(false);
    }
  }

  function handleFilePickerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handlePdfFile(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }

  function handlePdfDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!mutationsDisabled) setPdfDragActive(true);
  }

  function handlePdfDragLeave() {
    setPdfDragActive(false);
  }

  async function handlePdfDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setPdfDragActive(false);
    if (mutationsDisabled) return;

    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.type === "application/pdf"
    );
    if (file) await handlePdfFile(file);
  }

  // ============================================================
  // URL handlers
  // ============================================================

  const URL_MAX_COUNT = 50;

  async function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    setUrlError("");

    const trimmed = urlInput.trim();
    const { valid } = isValidUrl(trimmed);

    if (!valid) {
      setUrlError(t("url.invalid"));
      return;
    }

    if (urls.length >= URL_MAX_COUNT) {
      setUrlError(t("url.count_exceeded"));
      return;
    }

    setUrlSubmitting(true);
    try {
      await onUrlAdd(trimmed, noteInput.trim() || null);
      setUrlInput("");
      setNoteInput("");
    } catch (err) {
      console.error("[AttachmentsSection] URL add failed:", err);
      setUrlError("링크 추가 중 오류가 발생했습니다.");
    } finally {
      setUrlSubmitting(false);
    }
  }

  function handleUrlNoteUpdate(id: string, note: string) {
    onUrlNoteUpdate(id, note).catch((err) => {
      console.error("[AttachmentsSection] URL note update failed:", err);
    });
  }

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-0">
      {/* ─────────────────── PDF SECTION ─────────────────── */}
      <section
        onDragOver={handlePdfDragOver}
        onDragLeave={handlePdfDragLeave}
        onDrop={handlePdfDrop}
        className={[
          "py-6 rounded-md transition-colors",
          pdfDragActive ? "bg-muted/40" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="PDF attachments"
      >
        {/* Eyebrow — L-010: font-suit text-xs uppercase tracking-wider */}
        <p className="font-suit text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/70 mb-1">
          {t("pdf.eyebrow")}
        </p>
        <p className="font-suit text-sm text-muted-foreground mb-4">
          {t("pdf.sub")}
        </p>

        {/* Add button */}
        {!mutationsDisabled && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pdfUploading}
              className="font-suit text-sm rounded-md px-4 py-2 border border-border/40 text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              {pdfUploading ? "업로드 중..." : t("pdf.add")}
            </button>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={handleFilePickerChange}
              aria-label="PDF file picker"
            />
          </div>
        )}

        {/* Error message */}
        {pdfError && (
          <p className="font-suit text-xs text-foreground mb-3 px-1">
            {pdfError}
          </p>
        )}

        {/* PDF card list */}
        {pdfs.length > 0 ? (
          <div className="space-y-2">
            {pdfs.map((pdf) => (
              <PdfCard
                key={pdf.id}
                pdf={pdf}
                onRemove={onPdfRemove}
                disabled={mutationsDisabled}
              />
            ))}
          </div>
        ) : (
          <p className="font-suit text-sm text-muted-foreground/60">
            {t("pdf.empty")}
          </p>
        )}
      </section>

      {/* Hairline divider between sections — L-012: no section backgrounds */}
      <hr className="border-t border-border/30" />

      {/* ─────────────────── URL SECTION ─────────────────── */}
      <section className="py-6" aria-label="URL attachments">
        {/* Eyebrow — L-010 */}
        <p className="font-suit text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground/70 mb-1">
          {t("url.eyebrow")}
        </p>
        <p className="font-suit text-sm text-muted-foreground mb-4">
          {t("url.sub")}
        </p>

        {/* Inline URL form */}
        {!mutationsDisabled && (
          <form onSubmit={handleUrlSubmit} className="mb-4 space-y-2">
            <div className="flex gap-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  if (urlError) setUrlError("");
                }}
                placeholder={t("url.placeholder")}
                className="flex-1 font-suit text-sm rounded-md px-3 py-2 border border-border/40 bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                aria-label="URL input"
              />
              <button
                type="submit"
                disabled={urlSubmitting || !urlInput.trim()}
                className="font-suit text-sm rounded-md px-4 py-2 border border-border/40 text-foreground hover:bg-muted transition-colors disabled:opacity-50 shrink-0"
                style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
              >
                {urlSubmitting ? "추가 중..." : t("url.add")}
              </button>
            </div>

            {/* Optional note input — appears when URL is entered */}
            {urlInput.trim() && (
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder={t("url.note_placeholder")}
                maxLength={500}
                className="w-full font-suit text-sm rounded-md px-3 py-2 border border-border/40 bg-background placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground/20"
                aria-label="URL note input"
              />
            )}

            {urlError && (
              <p className="font-suit text-xs text-foreground">{urlError}</p>
            )}
          </form>
        )}

        {/* URL card list */}
        {urls.length > 0 ? (
          <div className="space-y-2">
            {urls.map((urlEntry) => (
              <UrlCard
                key={urlEntry.id}
                url_entry={urlEntry}
                onRemove={onUrlRemove}
                onNoteUpdate={handleUrlNoteUpdate}
                disabled={mutationsDisabled}
              />
            ))}
          </div>
        ) : (
          <p className="font-suit text-sm text-muted-foreground/60">
            {t("url.empty")}
          </p>
        )}
      </section>
    </div>
  );
}
