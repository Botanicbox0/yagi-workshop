"use client";

/**
 * url-card.tsx
 * Phase 3.1 hotfix-3 — URL attachment card for AttachmentsSection.
 * Design system v0.2.0 compliance:
 *   - L-013: soft shadow + border-border/40 (no harsh 1px)
 *   - L-011: achromatic only (no color accents)
 *   - L-014: no italic em
 */

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { UrlAttachment } from "@/lib/board/asset-index";

type Props = {
  url_entry: UrlAttachment;
  onRemove: (id: string) => void;
  onNoteUpdate: (id: string, note: string) => void;
  disabled: boolean;
};

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

const PROVIDER_LABELS: Record<UrlAttachment["provider"], string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  generic: "",
};

export function UrlCard({ url_entry, onRemove, onNoteUpdate, disabled }: Props) {
  const t = useTranslations("attachments.url");
  const [hovered, setHovered] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const noteRef = useRef<HTMLSpanElement>(null);

  const handleNoteClick = () => {
    if (disabled) return;
    setEditingNote(true);
    // Focus the span on next tick
    setTimeout(() => {
      noteRef.current?.focus();
      // Move caret to end
      const el = noteRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const handleNoteBlur = () => {
    setEditingNote(false);
    const newNote = noteRef.current?.textContent?.trim() ?? "";
    if (newNote !== (url_entry.note ?? "")) {
      onNoteUpdate(url_entry.id, newNote);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      noteRef.current?.blur();
    }
    if (e.key === "Escape") {
      // Reset content + blur
      if (noteRef.current) {
        noteRef.current.textContent = url_entry.note ?? "";
      }
      noteRef.current?.blur();
    }
  };

  const providerLabel = PROVIDER_LABELS[url_entry.provider];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex gap-3 rounded-md p-3 border border-border/40"
      style={{
        boxShadow:
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        background: "#ffffff",
      }}
    >
      {/* Thumbnail or icon placeholder */}
      <div
        className="shrink-0 rounded overflow-hidden bg-muted"
        style={{ width: 80, height: 60, minWidth: 80 }}
      >
        {url_entry.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url_entry.thumbnail_url}
            alt={url_entry.title ?? "Link thumbnail"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-muted-foreground"
            aria-hidden="true"
          >
            🔗
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + URL */}
        <a
          href={url_entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-suit text-sm font-medium text-foreground hover:underline block truncate"
          title={url_entry.url}
        >
          {url_entry.title ?? url_entry.url}
        </a>

        {/* Provider + date */}
        <p className="font-suit text-xs text-muted-foreground mt-0.5">
          {providerLabel && <span>{providerLabel} · </span>}
          {t("added_at", { date: formatDate(url_entry.added_at) })}
        </p>

        {/* Inline editable note */}
        <div className="mt-1.5">
          {editingNote || url_entry.note ? (
            <span
              ref={noteRef}
              contentEditable={!disabled}
              suppressContentEditableWarning
              onBlur={handleNoteBlur}
              onKeyDown={handleNoteKeyDown}
              onClick={handleNoteClick}
              className={[
                "font-suit text-xs text-muted-foreground block",
                !disabled ? "cursor-text hover:text-foreground" : "",
                editingNote
                  ? "outline outline-1 outline-border/60 rounded px-1 -mx-1"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              role="textbox"
              aria-label="Note"
              aria-multiline="false"
              data-placeholder={t("note_placeholder")}
            >
              {url_entry.note ?? ""}
            </span>
          ) : (
            !disabled && (
              <button
                type="button"
                onClick={handleNoteClick}
                className="font-suit text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
              >
                {t("note_edit")}
              </button>
            )
          )}
        </div>
      </div>

      {/* Remove button — hover-only */}
      {!disabled && hovered && (
        <button
          type="button"
          onClick={() => onRemove(url_entry.id)}
          aria-label="Remove URL attachment"
          className="shrink-0 self-start rounded-sm p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
      )}
    </div>
  );
}
