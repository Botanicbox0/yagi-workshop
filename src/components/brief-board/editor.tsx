"use client";

// =============================================================================
// Phase 2.8 G_B-2 — Brief Board editor (TipTap + auto-save)
// =============================================================================
// Source: .yagi-autobuild/phase-2-8/SPEC.md §4.B1, §5.5, §7
//
// Scope at G_B-2 ship:
//   - Text blocks (paragraph, headings 1–3, bullet/ordered list, blockquote,
//     hard break, horizontal rule) via @tiptap/starter-kit.
//   - 3-second debounced auto-save calling the saveBrief server action.
//   - Optimistic concurrency via If-Match-Updated-At (SPEC §5.5).
//   - Korean IME-compatible input (TipTap v3 / ProseMirror v1.x are known
//     to handle Hangul composition correctly; verify via manual smoke).
//   - Locked-state read-only switch.
//
// Out of scope (later gates):
//   - Image / File / Embed blocks  (G_B-3 / G_B-4)
//   - Slash command picker          (deferred — needs @tiptap/suggestion
//                                    which is not in SPEC §7 stack list)
//   - Version history sidebar       (G_B-5)
//   - Comment panel                 (G_B-6)
//   - Wizard mode wrapper           (G_B-7)
// =============================================================================

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  fetchEmbed,
  saveBrief,
  uploadAsset,
  type BriefActionResult,
} from "@/app/[locale]/app/projects/[id]/brief/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImageBlock } from "./blocks/image-block";
import { FileBlock } from "./blocks/file-block";
import { EmbedBlock } from "./blocks/embed-block";
import { YagiRequestModal } from "./yagi-request-modal";
import { resizeImageIfNeeded } from "@/lib/brief-board/resize-image";

const EMBED_URL_RE = /^\s*(https?:\/\/\S+)\s*$/i;

// Per SPEC §4.B2 / §4.B3: image cap 50MB, file cap 200MB. The SQL CHECK
// constraint enforces 200MB at the byte_size column; the image cap is
// app-layer (browser resize usually keeps files well under 50MB).
const IMAGE_MAX_BYTES = 50 * 1024 * 1024;
const FILE_MAX_BYTES = 200 * 1024 * 1024;

const AUTOSAVE_DEBOUNCE_MS = 3000;

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "conflict"; latestUpdatedAt: string }
  | { kind: "failed"; reason: string };

export interface BriefBoardEditorProps {
  projectId: string;
  /**
   * Latest server-side content_json. Pass `null` to start from an empty
   * document (the auto-save will overwrite).
   */
  initialContent: JSONContent | null;
  /**
   * Server-side updated_at timestamp at load time. Used for the
   * If-Match-Updated-At optimistic-concurrency check on save.
   */
  initialUpdatedAt: string;
  /**
   * Server-side status. When 'locked', the editor mounts read-only.
   */
  initialStatus: "editing" | "locked";
  /**
   * - 'full'   : default, autosave + toolbar visible
   * - 'wizard' : hides toolbar's save indicator (caller in G_B-7 owns the
   *              wizard chrome); autosave still wired
   * - 'viewer' : forces read-only with a viewer banner; auto-save disabled.
   *              Used by the version-history sidebar to view a snapshot.
   */
  mode?: "wizard" | "full" | "viewer";
  /**
   * When mode='viewer', the version_n being viewed (for the banner).
   */
  viewerVersionN?: number;
  /**
   * When mode='viewer', the locale-aware "back to latest" CTA target href.
   */
  viewerBackHref?: string;
  className?: string;
}

const EMPTY_DOC: JSONContent = { type: "doc", content: [] };

export function BriefBoardEditor({
  projectId,
  initialContent,
  initialUpdatedAt,
  initialStatus,
  mode = "full",
  viewerVersionN,
  viewerBackHref,
  className,
}: BriefBoardEditorProps) {
  const t = useTranslations("brief_board");
  const editable = mode !== "viewer" && initialStatus === "editing";

  // Mutable refs that don't trigger re-renders. updatedAtRef is the
  // CAS token: the most recent server-stamped timestamp we know about.
  const updatedAtRef = useRef<string>(initialUpdatedAt);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<boolean>(false);
  // K05-PHASE-2-8-01 fix: when an edit lands while a save is in flight,
  // we mark dirty + remember the latest doc, then re-flush after the
  // in-flight save completes. Without this, the latest keystrokes can
  // be silently dropped when the user stops typing during the save.
  const dirtyDuringInFlightRef = useRef<boolean>(false);
  const pendingDocRef = useRef<JSONContent | null>(null);

  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable extensions we don't ship in v1.
        // (Code/CodeBlock/Strike are kept — small surface, useful for briefs.)
      }),
      ImageBlock,
      FileBlock,
      EmbedBlock,
    ],
    content: initialContent ?? EMPTY_DOC,
    editable,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "tiptap-prose min-h-[12rem] outline-none keep-all",
          "prose prose-neutral max-w-none",
          "focus:outline-none",
          editable ? "" : "opacity-80 cursor-default"
        ),
        "aria-label": t("title"),
      },
      // Drag-drop: intercept files on the editor area, run them through
      // the upload pipeline, then insert image/file nodes when the R2 PUT
      // completes. ProseMirror requires a synchronous return — we kick
      // the async work and return true (handled).
      handleDrop(_view, event) {
        if (!editable) return false;
        const dt = (event as DragEvent).dataTransfer;
        if (!dt || !dt.files || dt.files.length === 0) return false;
        event.preventDefault();
        const files = Array.from(dt.files);
        void handleFilesUpload(files);
        return true;
      },
      // Paste: when the clipboard payload is a single URL on its own
      // line, intercept and turn it into an embed block (placeholder
      // first, then swap once fetchEmbed resolves). Multi-line and rich
      // clipboard pastes fall through to TipTap's default handling.
      handlePaste(_view, event) {
        if (!editable) return false;
        const text = event.clipboardData?.getData("text/plain") ?? "";
        const m = text.match(EMBED_URL_RE);
        if (!m) return false;
        event.preventDefault();
        void handleEmbedPaste(m[1]);
        return true;
      },
    },
    // onUpdate fires on every keystroke (and IME composition end). We
    // debounce here rather than in editorProps to keep the latest doc
    // snapshot accessible without re-reading the editor's DOM.
    onUpdate: ({ editor: e }) => {
      if (!editable) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setSaveState({ kind: "idle" }); // dirty
      debounceRef.current = setTimeout(() => {
        void flushSave(e.getJSON());
      }, AUTOSAVE_DEBOUNCE_MS);
    },
  });

  // Send the current document to the server with the most recent CAS
  // token. K05-PHASE-2-8-01 fix (loop 2 hardened): try/finally guarantees
  // pending-doc drain on EVERY terminal path — success, exception, and
  // every error branch (conflict, locked, validation, etc.). Without
  // the centralized finally, branches that returned early would orphan
  // dirtyDuringInFlightRef and leak content.
  const flushSave = useCallback(
    async (doc: JSONContent) => {
      if (inFlightRef.current) {
        dirtyDuringInFlightRef.current = true;
        pendingDocRef.current = doc;
        return;
      }
      inFlightRef.current = true;
      setSaveState({ kind: "saving" });

      try {
        let result: BriefActionResult<{
          updatedAt: string;
          status: "editing" | "locked";
        }>;
        try {
          result = await saveBrief({
            projectId,
            contentJson: doc,
            ifMatchUpdatedAt: updatedAtRef.current,
          });
        } catch (err) {
          const reason = err instanceof Error ? err.message : "unknown";
          setSaveState({ kind: "failed", reason });
          toast.error(t("save_db_error"));
          return;
        }

        if ("ok" in result && result.ok) {
          updatedAtRef.current = result.data.updatedAt;
          setSaveState({ kind: "saved" });
          return;
        }

        if ("error" in result) {
          switch (result.error) {
            case "conflict":
              setSaveState({
                kind: "conflict",
                latestUpdatedAt: result.latestUpdatedAt,
              });
              toast.error(t("save_conflict"), {
                action: {
                  label: t("save_conflict_btn"),
                  onClick: () => {
                    if (typeof window !== "undefined") window.location.reload();
                  },
                },
              });
              return;
            case "locked":
              setSaveState({ kind: "failed", reason: "locked" });
              toast.error(t("locked_banner"));
              return;
            case "unauthenticated":
              setSaveState({ kind: "failed", reason: "unauthenticated" });
              toast.error(t("save_unauthenticated"));
              return;
            case "validation":
              setSaveState({ kind: "failed", reason: "validation" });
              {
                const isSize = result.issues.some(
                  (i) => i.path?.[0] === "contentJson" && /2MiB|exceed/i.test(i.message)
                );
                toast.error(isSize ? t("save_too_large") : t("save_validation"));
              }
              return;
            case "not_found":
            case "forbidden":
            case "not_implemented":
            case "db":
            default:
              setSaveState({ kind: "failed", reason: String(result.error) });
              toast.error(t("save_db_error"));
              return;
          }
        }
      } finally {
        inFlightRef.current = false;
        // Drain any pending doc captured while we were in flight. Runs
        // regardless of which terminal branch we took above. The pending
        // doc is the latest content the user typed during the save, so
        // re-flushing guarantees no edits are silently dropped.
        // Conflict/locked/validation branches still drain, even though
        // re-flushing in those cases will likely surface the same error
        // — that's intentional: the user sees consistent feedback rather
        // than silent staleness.
        if (dirtyDuringInFlightRef.current) {
          const next = pendingDocRef.current;
          dirtyDuringInFlightRef.current = false;
          pendingDocRef.current = null;
          if (next) void flushSave(next);
        }
      }
    },
    [projectId, t]
  );

  // Cleanup pending debounce on unmount; also flush a final save if
  // there is dirty content that hasn't been sent yet. Note: we cannot
  // await an in-flight promise during unmount cleanup (React doesn't
  // allow async cleanup), so the flush is best-effort.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  // Paste handler — single-URL clipboard payload becomes an embed.
  // We insert a generic placeholder immediately so the user sees
  // feedback, then resolve via fetchEmbed and replace its attrs.
  const handleEmbedPaste = useCallback(
    async (url: string) => {
      if (!editor) return;
      // Insert a placeholder generic embed first.
      editor
        .chain()
        .focus()
        .insertContent({
          type: "embed",
          attrs: {
            url,
            provider: "generic",
            title: null,
            thumbnail_url: null,
            fetched_at: new Date().toISOString(),
          },
        })
        .run();

      const result = await fetchEmbed({ url });
      if (!("ok" in result) || !result.ok) {
        toast.error(t("block_embed_failed"));
        return;
      }

      // Replace the placeholder by walking the doc for the most recent
      // embed node with this URL and `provider='generic'` AND no title.
      // Walking the doc is O(n) but n is small (single brief).
      const doc = editor.state.doc;
      let pos: number | null = null;
      doc.descendants((node, p) => {
        if (
          node.type.name === "embed" &&
          node.attrs.url === url &&
          node.attrs.provider === "generic" &&
          !node.attrs.title
        ) {
          pos = p;
          // Don't break early — last match wins (most recent insertion).
        }
        return true;
      });
      if (pos === null) return;
      const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
        url: result.data.url,
        provider: result.data.provider,
        title: result.data.title,
        thumbnail_url: result.data.thumbnail_url,
        fetched_at: new Date().toISOString(),
      });
      editor.view.dispatch(tr);
    },
    [editor, t]
  );

  // Drop handler pipeline: validate → resize (images) → uploadAsset →
  // PUT to R2 → insert node. Each file is processed serially to avoid
  // racing against the auto-save concurrency window — typical drops
  // are 1–3 files.
  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      for (const original of files) {
        const isImage = original.type.startsWith("image/");

        // Size guard before any upload work. Images get 50MB, others 200MB.
        if (isImage && original.size > IMAGE_MAX_BYTES) {
          toast.error(t("asset_too_large_image"));
          continue;
        }
        if (!isImage && original.size > FILE_MAX_BYTES) {
          toast.error(t("asset_too_large_file"));
          continue;
        }

        const file = isImage ? await resizeImageIfNeeded(original) : original;

        // Re-check size post-resize for the rare case that resize made
        // a file LARGER (shouldn't happen but defensive).
        if (file.size > FILE_MAX_BYTES) {
          toast.error(t("asset_too_large_file"));
          continue;
        }

        const upload = await uploadAsset({
          projectId,
          filename: file.name,
          mimeType: file.type || "application/octet-stream",
          byteSize: file.size,
        });

        if (!("ok" in upload) || !upload.ok) {
          toast.error(t("asset_upload_failed"));
          continue;
        }

        try {
          const putResp = await fetch(upload.data.presignedPutUrl, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type || "application/octet-stream" },
          });
          if (!putResp.ok) {
            toast.error(t("asset_upload_failed"));
            continue;
          }
        } catch {
          toast.error(t("asset_upload_failed"));
          continue;
        }

        // Insert node. The NodeView fetches a presigned GET URL on mount.
        if (!editor) continue;
        if (isImage) {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "image",
              attrs: {
                asset_id: upload.data.assetId,
                alt: file.name,
              },
            })
            .run();
        } else {
          editor
            .chain()
            .focus()
            .insertContent({
              type: "file",
              attrs: {
                asset_id: upload.data.assetId,
                filename: file.name,
                mime_type: file.type || "application/octet-stream",
                byte_size: file.size,
              },
            })
            .run();
        }
        // Inserting via the chain triggers onUpdate → debounced auto-save,
        // so the new asset_id ends up in content_json on the next idle.
      }
    },
    [editor, projectId, t]
  );

  // If the parent re-mounts with a fresh updated_at (e.g., post-restore
  // or after a conflict reload), refresh our CAS token.
  useEffect(() => {
    updatedAtRef.current = initialUpdatedAt;
  }, [initialUpdatedAt]);

  const indicator = useMemo(() => {
    switch (saveState.kind) {
      case "idle":
        return { label: t("toolbar_idle"), tone: "muted" as const };
      case "saving":
        return { label: t("toolbar_saving"), tone: "muted" as const };
      case "saved":
        return { label: t("toolbar_saved"), tone: "ok" as const };
      case "conflict":
        return { label: t("save_conflict"), tone: "warn" as const };
      case "failed":
        return { label: t("toolbar_save_failed"), tone: "warn" as const };
    }
  }, [saveState, t]);

  if (!editor) {
    // SSR-friendly skeleton while TipTap initializes (immediatelyRender=false).
    return (
      <div
        className={cn(
          "border border-border rounded-lg p-4 min-h-[14rem] bg-background",
          className
        )}
        aria-busy="true"
      >
        <p className="text-sm text-muted-foreground">{t("title")}</p>
      </div>
    );
  }

  const isEmpty = editor.isEmpty;

  return (
    <div
      className={cn(
        "relative border border-border rounded-lg bg-background",
        className
      )}
    >
      {mode === "viewer" && (
        <div className="px-4 py-2 flex items-center justify-between text-xs font-medium uppercase tracking-[0.12em] bg-foreground/5 text-foreground border-b border-border">
          <span>
            {viewerVersionN
              ? t("viewer_banner", { n: viewerVersionN })
              : t("viewer_banner", { n: "?" })}
          </span>
          {viewerBackHref && (
            <a
              href={viewerBackHref}
              className="rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-background"
            >
              {t("viewer_back")}
            </a>
          )}
        </div>
      )}
      {mode !== "viewer" && !editable && (
        <div className="px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] bg-muted text-muted-foreground border-b border-border">
          {t("locked_banner")}
        </div>
      )}

      {mode === "full" && editable && (
        <div className="px-4 py-2 flex items-center justify-between border-b border-border">
          <Toolbar editor={editor} />
          <span
            className={cn(
              "text-xs tabular-nums",
              indicator.tone === "ok" && "text-foreground/70",
              indicator.tone === "warn" && "text-destructive",
              indicator.tone === "muted" && "text-muted-foreground"
            )}
            aria-live="polite"
          >
            {indicator.label}
          </span>
        </div>
      )}

      <div className="px-4 py-4">
        {isEmpty && editable && (
          <p
            className="text-sm text-muted-foreground keep-all pointer-events-none absolute"
            aria-hidden="true"
          >
            {t("empty_title")}
          </p>
        )}
        <EditorContent editor={editor} />
        {isEmpty && editable && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-xs text-muted-foreground/70 keep-all">
              {t("empty_hint")}
            </p>
            {mode === "full" && (
              <YagiRequestModal
                projectId={projectId}
                trigger={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs uppercase tracking-[0.08em]"
                  >
                    {t("empty_yagi_cta")}
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Minimal toolbar — only formatting available in starter-kit. Image/file/
// embed buttons land in their respective gates (G_B-3 / G_B-4).
// -----------------------------------------------------------------------------

function Toolbar({
  editor,
}: {
  editor: ReturnType<typeof useEditor> & object;
}) {
  // The editor is non-null at the call site — Toolbar is only rendered
  // when `editor` is truthy in the parent.
  const e = editor as NonNullable<typeof editor>;
  return (
    <div className="flex flex-wrap items-center gap-1">
      <ToolbarButton
        active={e.isActive("heading", { level: 1 })}
        onClick={() => e.chain().focus().toggleHeading({ level: 1 }).run()}
        label="H1"
      />
      <ToolbarButton
        active={e.isActive("heading", { level: 2 })}
        onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
        label="H2"
      />
      <ToolbarButton
        active={e.isActive("heading", { level: 3 })}
        onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
        label="H3"
      />
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        active={e.isActive("bold")}
        onClick={() => e.chain().focus().toggleBold().run()}
        label="B"
        bold
      />
      <ToolbarButton
        active={e.isActive("italic")}
        onClick={() => e.chain().focus().toggleItalic().run()}
        label="I"
        italic
      />
      <ToolbarButton
        active={e.isActive("strike")}
        onClick={() => e.chain().focus().toggleStrike().run()}
        label="S"
        strike
      />
      <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
      <ToolbarButton
        active={e.isActive("bulletList")}
        onClick={() => e.chain().focus().toggleBulletList().run()}
        label="•"
      />
      <ToolbarButton
        active={e.isActive("orderedList")}
        onClick={() => e.chain().focus().toggleOrderedList().run()}
        label="1."
      />
      <ToolbarButton
        active={e.isActive("blockquote")}
        onClick={() => e.chain().focus().toggleBlockquote().run()}
        label="❝"
      />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  bold,
  italic,
  strike,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  bold?: boolean;
  italic?: boolean;
  strike?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 px-2 text-xs rounded-md",
        active && "bg-foreground text-background hover:bg-foreground/90",
        bold && "font-bold",
        italic && "italic",
        strike && "line-through"
      )}
    >
      {label}
    </Button>
  );
}
