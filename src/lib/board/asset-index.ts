/**
 * asset-index.ts
 * Phase 3.1 — Pure function to extract a flat asset index from a tldraw store snapshot.
 * Called server-side by board update action to keep project_boards.asset_index in sync.
 * NEVER trust client-supplied asset_index — always recompute server-side (K-05 trust boundary).
 */

export type AssetIndexEntry = {
  shapeId: string;
  type: "image" | "pdf" | "url";
  src: string; // R2 public URL (image/pdf) or external URL
  filename?: string; // for image/pdf shapes
  title?: string; // for url-card shapes
  domain?: string; // for url-card shapes
  addedAt?: string; // ISO string if available from shape meta
};

/**
 * extractAssetIndex
 * Extracts all yagi-image, yagi-pdf, yagi-url-card shapes from a tldraw snapshot
 * and returns a flat array of AssetIndexEntry for admin display + search.
 *
 * @param document - The tldraw store snapshot (project_boards.document JSONB)
 * @returns AssetIndexEntry[] — empty array if document is empty or invalid
 */
export function extractAssetIndex(
  document: Record<string, unknown> | null | undefined
): AssetIndexEntry[] {
  if (!document || typeof document !== "object") return [];

  // tldraw store snapshot shape: { store: { "shape:xxx": { type: string, props: ... } } }
  const store = document.store as Record<string, unknown> | undefined;
  if (!store || typeof store !== "object") return [];

  const entries: AssetIndexEntry[] = [];

  for (const [key, record] of Object.entries(store)) {
    if (!key.startsWith("shape:")) continue;
    if (typeof record !== "object" || record === null) continue;

    const shape = record as {
      type?: string;
      id?: string;
      props?: Record<string, unknown>;
    };

    if (!shape.type || !shape.props) continue;

    switch (shape.type) {
      case "yagi-image": {
        const src = shape.props.src as string | undefined;
        if (src) {
          entries.push({
            shapeId: shape.id ?? key,
            type: "image",
            src,
            filename: (shape.props.alt as string) || undefined,
          });
        }
        break;
      }
      case "yagi-pdf": {
        const src = shape.props.src as string | undefined;
        const filename = shape.props.filename as string | undefined;
        if (src) {
          entries.push({
            shapeId: shape.id ?? key,
            type: "pdf",
            src,
            filename,
          });
        }
        break;
      }
      case "yagi-url-card": {
        const src = shape.props.url as string | undefined;
        const title = shape.props.title as string | undefined;
        const domain = shape.props.domain as string | undefined;
        if (src) {
          entries.push({
            shapeId: shape.id ?? key,
            type: "url",
            src,
            title,
            domain,
          });
        }
        break;
      }
    }
  }

  return entries;
}
