/**
 * image-shape.ts
 * Phase 3.1 — Yagi custom image shape for tldraw v4
 * Decision Q-C: URL-bound shapes only — no tldraw internal asset store.
 * The image src is an R2 public URL (CLOUDFLARE_R2_PUBLIC_BASE).
 *
 * Note: tldraw v4 requires TLGlobalShapePropsMap augmentation for full type safety.
 * Due to the complexity of module augmentation in Next.js 15 / pnpm environment,
 * we use TLBaseShape directly with appropriate type assertions (L-022 pattern).
 * eslint-disable-next-line comments follow Phase 3.1 convention.
 */

import {
  ShapeUtil,
  HTMLContainer,
  TLBaseShape,
  Rectangle2d,
  T,
  resizeBox,
} from "@tldraw/tldraw";
import React from "react";

// ============================================================
// Shape type definition
// ============================================================

export type ImageShapeProps = {
  src: string; // R2 public URL
  w: number;
  h: number;
  alt: string;
};

export type ImageShape = TLBaseShape<"yagi-image", ImageShapeProps>;

// ============================================================
// Shape util
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 requires TLGlobalShapePropsMap module augmentation for full type safety; using any as workaround
// ============================================================
export class ImageShapeUtil extends ShapeUtil<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  static override type = "yagi-image" as const;

  static override props = {
    src: T.string,
    w: T.number,
    h: T.number,
    alt: T.string,
  };

  override getDefaultProps(): ImageShapeProps {
    return {
      src: "",
      w: 320,
      h: 240,
      alt: "",
    };
  }

  override canEdit() {
    return false;
  }

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: resizeBox requires TLBaseBoxShape; shape is compatible at runtime
  override onResize(shape: any, info: any) {
    return resizeBox(shape, info);
  }

  override getGeometry(shape: ImageShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override component(shape: ImageShape) {
    const { src, w, h, alt } = shape.props;

    return React.createElement(
      HTMLContainer,
      {
        id: shape.id,
        style: {
          width: w,
          height: h,
          overflow: "hidden",
          borderRadius: "4px",
          background: "#f5f5f5",
          position: "relative",
        },
      },
      src
        ? React.createElement("img", {
            src,
            alt: alt || "Reference image",
            draggable: false,
            style: {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              userSelect: "none",
              pointerEvents: "none",
            },
          })
        : React.createElement(
            "div",
            {
              style: {
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#888888",
                fontSize: "13px",
                fontFamily: "var(--font-suit, sans-serif)",
              },
            },
            "Loading..."
          )
    );
  }

  override indicator(shape: ImageShape) {
    return React.createElement("rect", {
      width: shape.props.w,
      height: shape.props.h,
      rx: 4,
      ry: 4,
    });
  }
}
