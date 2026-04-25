"use client";

// =============================================================================
// Phase 2.8 G_B-4 — TipTap EmbedBlock
// =============================================================================
// JSON shape (SPEC §4.B4): { type: "embed", attrs: { url, provider, title,
// thumbnail_url, fetched_at } }. Note that `html` is NOT stored — the
// client renders a sandboxed iframe per provider whitelist so a poisoned
// embed_cache row cannot inject scripts.

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    embed: {
      insertEmbed: (attrs: {
        url: string;
        provider: "youtube" | "vimeo" | "generic";
        title?: string | null;
        thumbnail_url?: string | null;
        fetched_at?: string;
      }) => ReturnType;
    };
  }
}

export const EmbedBlock = Node.create({
  name: "embed",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: { default: null },
      provider: { default: "generic" },
      title: { default: null },
      thumbnail_url: { default: null },
      fetched_at: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="brief-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "brief-embed" }),
    ];
  },

  addCommands() {
    return {
      insertEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: "embed", attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(EmbedBlockView);
  },
});

// videoId extractors (mirror server actions.ts regexes — kept inline so
// the block stays self-contained and renders deterministically without
// re-fetching). Server is the source of truth for the `provider` attr.
const YOUTUBE_RE =
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/i;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/i;

function extractYouTubeId(url: string): string | null {
  const m = url.match(YOUTUBE_RE);
  return m ? m[1] : null;
}
function extractVimeoId(url: string): string | null {
  const m = url.match(VIMEO_RE);
  return m ? m[1] : null;
}

function EmbedBlockView({ node }: NodeViewProps) {
  const t = useTranslations("brief_board");
  const url = node.attrs.url as string | null;
  const provider = node.attrs.provider as "youtube" | "vimeo" | "generic";
  const title = node.attrs.title as string | null;
  const thumbnailUrl = node.attrs.thumbnail_url as string | null;

  if (!url) {
    return (
      <NodeViewWrapper as="div" data-type="brief-embed">
        <div className="border border-destructive/40 rounded-md px-3 py-2 text-xs text-destructive">
          {t("block_embed_failed")}
        </div>
      </NodeViewWrapper>
    );
  }

  if (provider === "youtube") {
    const id = extractYouTubeId(url);
    if (!id) return <EmbedFallback url={url} title={title} thumbnail={thumbnailUrl} />;
    return (
      <NodeViewWrapper as="div" data-type="brief-embed" className="my-3">
        <div className="relative aspect-video w-full max-w-3xl mx-auto rounded-md overflow-hidden border border-border bg-muted">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title={title ?? "YouTube embed"}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            allow="accelerometer; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            loading="lazy"
          />
        </div>
        {title && (
          <p className="mt-1 text-xs text-muted-foreground keep-all">{title}</p>
        )}
      </NodeViewWrapper>
    );
  }

  if (provider === "vimeo") {
    const id = extractVimeoId(url);
    if (!id) return <EmbedFallback url={url} title={title} thumbnail={thumbnailUrl} />;
    return (
      <NodeViewWrapper as="div" data-type="brief-embed" className="my-3">
        <div className="relative aspect-video w-full max-w-3xl mx-auto rounded-md overflow-hidden border border-border bg-muted">
          <iframe
            src={`https://player.vimeo.com/video/${id}`}
            title={title ?? "Vimeo embed"}
            sandbox="allow-scripts allow-same-origin"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
            loading="lazy"
          />
        </div>
        {title && (
          <p className="mt-1 text-xs text-muted-foreground keep-all">{title}</p>
        )}
      </NodeViewWrapper>
    );
  }

  // Generic OG: thumbnail card with external link, no iframe.
  return <EmbedFallback url={url} title={title} thumbnail={thumbnailUrl} />;
}

function EmbedFallback({
  url,
  title,
  thumbnail,
}: {
  url: string;
  title: string | null;
  thumbnail: string | null;
}) {
  // K05-PHASE-2-8-02 client-side defense: even though server-side
  // validateContentSafety in saveBrief rejects non-http(s) URLs, treat
  // an unsafe scheme defensively here in case content was persisted by
  // an older path or via direct DB write. Only render the link when
  // the URL is a literal http(s); otherwise show a plain card.
  const safeHttp = /^https?:\/\//i.test(url);
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    /* ignore */
  }
  if (!safeHttp) {
    return (
      <NodeViewWrapper
        as="div"
        data-type="brief-embed"
        className={cn(
          "my-3 border border-destructive/40 rounded-md px-3 py-2 bg-muted/30 max-w-md"
        )}
      >
        <p className="text-xs text-destructive">unsafe URL hidden</p>
      </NodeViewWrapper>
    );
  }
  return (
    <NodeViewWrapper
      as="div"
      data-type="brief-embed"
      className={cn(
        "my-3 border border-border rounded-md overflow-hidden bg-muted/30 max-w-md"
      )}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:bg-muted/60 transition-colors"
      >
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        )}
        <div className="px-3 py-2">
          <p className="text-sm font-medium line-clamp-2 keep-all">
            {title ?? hostname}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {hostname}
          </p>
        </div>
      </a>
    </NodeViewWrapper>
  );
}
