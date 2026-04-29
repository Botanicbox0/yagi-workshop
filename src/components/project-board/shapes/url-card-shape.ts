/**
 * url-card-shape.ts
 * Phase 3.1 — Yagi URL card shape for tldraw v4
 * Renders oEmbed-enriched or generic URL previews.
 * Achromatic styling per L-011. Soft shadow per L-013.
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

export type UrlCardShapeProps = {
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  domain: string;
  w: number;
  h: number;
};

export type UrlCardShape = TLBaseShape<"yagi-url-card", UrlCardShapeProps>;

// ============================================================
// Shape util
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 requires TLGlobalShapePropsMap module augmentation for full type safety; using any as workaround
// ============================================================
export class UrlCardShapeUtil extends ShapeUtil<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  static override type = "yagi-url-card" as const;

  static override props = {
    url: T.string,
    title: T.string,
    description: T.string,
    thumbnail: T.string,
    domain: T.string,
    w: T.number,
    h: T.number,
  };

  override getDefaultProps(): UrlCardShapeProps {
    return {
      url: "",
      title: "",
      description: "",
      thumbnail: "",
      domain: "",
      w: 280,
      h: 160,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: resizeBox requires TLBaseBoxShape
  override onResize(shape: any, info: any) {
    return resizeBox(shape, info);
  }

  override getGeometry(shape: UrlCardShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override component(shape: UrlCardShape) {
    const { title, description, thumbnail, domain, w, h } = shape.props;

    return React.createElement(
      HTMLContainer,
      {
        id: shape.id,
        style: {
          width: w,
          height: h,
          overflow: "hidden",
          borderRadius: "8px",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          cursor: "default",
          userSelect: "none",
        },
      },
      thumbnail
        ? React.createElement("img", {
            src: thumbnail,
            alt: title || "Link preview",
            draggable: false,
            style: {
              width: "100%",
              height: "80px",
              objectFit: "cover",
              flexShrink: 0,
              pointerEvents: "none",
            },
          })
        : null,
      React.createElement(
        "div",
        {
          style: {
            padding: "10px 12px",
            flex: 1,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          },
        },
        title
          ? React.createElement(
              "div",
              {
                style: {
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#0a0a0a",
                  fontFamily: "var(--font-suit, sans-serif)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              title
            )
          : null,
        description
          ? React.createElement(
              "div",
              {
                style: {
                  fontSize: "12px",
                  color: "#555555",
                  fontFamily: "var(--font-suit, sans-serif)",
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  lineHeight: "1.4",
                },
              },
              description
            )
          : null,
        domain
          ? React.createElement(
              "div",
              {
                style: {
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#888888",
                  fontFamily: "var(--font-suit, sans-serif)",
                  marginTop: "auto",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
              },
              domain
            )
          : null
      )
    );
  }

  override indicator(shape: UrlCardShape) {
    return React.createElement("rect", {
      width: shape.props.w,
      height: shape.props.h,
      rx: 8,
      ry: 8,
    });
  }
}
