/**
 * yagi-shape-types.d.ts
 * Phase 3.1 — tldraw v4 module augmentation for custom Yagi shapes.
 * Required by tldraw v4: custom shapes must augment TLGlobalShapePropsMap
 * so that TLShape union includes them, enabling BaseBoxShapeUtil generics.
 */

import type { ImageShapeProps } from "./image-shape";
import type { UrlCardShapeProps } from "./url-card-shape";
import type { PdfShapeProps } from "./pdf-shape";

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    "yagi-image": ImageShapeProps;
    "yagi-url-card": UrlCardShapeProps;
    "yagi-pdf": PdfShapeProps;
  }
}
