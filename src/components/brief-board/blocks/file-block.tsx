"use client";

// =============================================================================
// Phase 2.8 G_B-3 — TipTap FileBlock (non-image attachments)
// =============================================================================
// JSON shape (SPEC §4.B3): { type: "file", attrs: { asset_id, filename,
// mime_type, byte_size } }. Rendered as a downloadable card with icon +
// filename + size; click opens a presigned GET URL.

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { getAssetUrl } from "@/app/[locale]/app/projects/[id]/brief/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    file: {
      insertFile: (attrs: {
        asset_id: string;
        filename: string;
        mime_type: string;
        byte_size: number;
      }) => ReturnType;
    };
  }
}

export const FileBlock = Node.create({
  name: "file",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      asset_id: { default: null },
      filename: { default: "" },
      mime_type: { default: "" },
      byte_size: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="brief-file"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "brief-file" }),
    ];
  },

  addCommands() {
    return {
      insertFile:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: "file", attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileBlockView);
  },
});

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function FileBlockView({ node }: NodeViewProps) {
  const t = useTranslations("brief_board");
  const assetId = node.attrs.asset_id as string | null;
  const filename = (node.attrs.filename as string) ?? "file";
  const byteSize = (node.attrs.byte_size as number) ?? 0;

  const [pending, setPending] = useState(false);

  async function handleDownload() {
    if (!assetId || pending) return;
    setPending(true);
    try {
      const r = await getAssetUrl({ assetId });
      if ("ok" in r && r.ok) {
        // Open in a new tab; browser handles MIME-aware display vs download.
        if (typeof window !== "undefined") {
          window.open(r.data.url, "_blank", "noopener,noreferrer");
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <NodeViewWrapper
      as="div"
      data-type="brief-file"
      className={cn(
        "my-3 flex items-center gap-3 border border-border rounded-md px-4 py-3 bg-muted/40"
      )}
    >
      <FileText
        className="h-5 w-5 text-muted-foreground flex-shrink-0"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate keep-all">{filename}</p>
        <p className="text-xs text-muted-foreground">
          {formatBytes(byteSize)}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={!assetId || pending}
        className="rounded-full text-xs"
      >
        <Download className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
        {t("block_file_download")}
      </Button>
    </NodeViewWrapper>
  );
}
