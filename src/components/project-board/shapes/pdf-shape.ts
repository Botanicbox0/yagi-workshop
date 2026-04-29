/**
 * pdf-shape.ts
 * Phase 3.1 — Yagi PDF shape for tldraw v4
 * Renders a file icon + filename — no first-page rasterization (cheap path).
 * Achromatic styling per L-011.
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

export type PdfShapeProps = {
  src: string;
  filename: string;
  pageCount: number;
  w: number;
  h: number;
};

export type PdfShape = TLBaseShape<"yagi-pdf", PdfShapeProps>;

// ============================================================
// PDF icon helper
// ============================================================

function createPdfIcon() {
  return React.createElement(
    "svg",
    {
      width: 40,
      height: 48,
      viewBox: "0 0 40 48",
      fill: "none",
      xmlns: "http://www.w3.org/2000/svg",
      "aria-hidden": true,
    },
    React.createElement("rect", {
      x: 1,
      y: 1,
      width: 38,
      height: 46,
      rx: 4,
      fill: "#ffffff",
      stroke: "#cccccc",
      strokeWidth: 1.5,
    }),
    React.createElement("path", {
      d: "M27 1 L39 13 L27 13 Z",
      fill: "#f0f0f0",
      stroke: "#cccccc",
      strokeWidth: 1.5,
      strokeLinejoin: "round",
    }),
    React.createElement(
      "text",
      {
        x: 20,
        y: 35,
        textAnchor: "middle",
        fontSize: 9,
        fontWeight: 700,
        fontFamily: "var(--font-suit, sans-serif)",
        fill: "#555555",
        letterSpacing: "0.08em",
      },
      "PDF"
    )
  );
}

// ============================================================
// Shape util
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Phase 3.1: tldraw v4 requires TLGlobalShapePropsMap module augmentation for full type safety; using any as workaround
// ============================================================
export class PdfShapeUtil extends ShapeUtil<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  static override type = "yagi-pdf" as const;

  static override props = {
    src: T.string,
    filename: T.string,
    pageCount: T.number,
    w: T.number,
    h: T.number,
  };

  override getDefaultProps(): PdfShapeProps {
    return {
      src: "",
      filename: "document.pdf",
      pageCount: 0,
      w: 200,
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

  override getGeometry(shape: PdfShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override component(shape: PdfShape) {
    const { filename, pageCount, w, h } = shape.props;
    const truncatedFilename =
      filename.length > 28 ? filename.slice(0, 25) + "..." : filename;

    return React.createElement(
      HTMLContainer,
      {
        id: shape.id,
        style: {
          width: w,
          height: h,
          overflow: "hidden",
          borderRadius: "8px",
          background: "#fafafa",
          border: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "16px",
          cursor: "default",
          userSelect: "none",
        },
      },
      createPdfIcon(),
      React.createElement(
        "div",
        {
          style: {
            fontSize: "12px",
            fontWeight: 500,
            color: "#0a0a0a",
            fontFamily: "var(--font-suit, sans-serif)",
            textAlign: "center",
            lineHeight: 1.4,
            overflow: "hidden",
            width: "100%",
          },
        },
        truncatedFilename
      ),
      pageCount > 0
        ? React.createElement(
            "div",
            {
              style: {
                fontSize: "11px",
                color: "#888888",
                fontFamily: "var(--font-suit, sans-serif)",
              },
            },
            `${pageCount} pages`
          )
        : null
    );
  }

  override indicator(shape: PdfShape) {
    return React.createElement("rect", {
      width: shape.props.w,
      height: shape.props.h,
      rx: 8,
      ry: 8,
    });
  }
}
