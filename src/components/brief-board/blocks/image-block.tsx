"use client";

// =============================================================================
// Phase 2.8 G_B-3 — TipTap ImageBlock
// =============================================================================
// JSON shape (SPEC §4.B2): { type: "image", attrs: { asset_id, alt, width? } }
// Rendering: NodeView fetches a presigned GET URL via getAssetUrl on mount.
// Insertion: editor.commands.insertContent({type:"image", attrs:{asset_id}}).

import { Node, mergeAttributes } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getAssetUrl } from "@/app/[locale]/app/projects/[id]/brief/actions";
import { cn } from "@/lib/utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    image: {
      insertImage: (attrs: { asset_id: string; alt?: string; width?: number }) => ReturnType;
    };
  }
}

export const ImageBlock = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      asset_id: { default: null },
      alt: { default: "" },
      width: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="brief-image"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "figure",
      mergeAttributes(HTMLAttributes, { "data-type": "brief-image" }),
    ];
  },

  addCommands() {
    return {
      insertImage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: "image", attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

function ImageBlockView({ node }: NodeViewProps) {
  const t = useTranslations("brief_board");
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; url: string }
    | { kind: "error" }
  >({ kind: "loading" });

  const assetId = node.attrs.asset_id as string | null;
  const alt = (node.attrs.alt as string) ?? "";

  useEffect(() => {
    let cancelled = false;
    if (!assetId) {
      setState({ kind: "error" });
      return;
    }
    setState({ kind: "loading" });
    void (async () => {
      const r = await getAssetUrl({ assetId });
      if (cancelled) return;
      if ("ok" in r && r.ok) {
        setState({ kind: "ok", url: r.data.url });
      } else {
        setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  return (
    <NodeViewWrapper
      as="figure"
      data-type="brief-image"
      className={cn("my-3 inline-block max-w-full")}
    >
      {state.kind === "loading" && (
        <div className="border border-dashed border-border rounded-md px-4 py-8 text-xs text-muted-foreground">
          {t("block_image_uploading")}
        </div>
      )}
      {state.kind === "ok" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={state.url}
          alt={alt}
          className="max-w-full h-auto rounded-md"
          loading="lazy"
        />
      )}
      {state.kind === "error" && (
        <div className="border border-destructive/40 rounded-md px-3 py-2 text-xs text-destructive">
          {t("block_embed_failed")}
        </div>
      )}
    </NodeViewWrapper>
  );
}
