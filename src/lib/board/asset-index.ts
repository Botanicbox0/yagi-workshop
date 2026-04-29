/**
 * asset-index.ts
 * Phase 3.1 hotfix-3 — Unified asset index normalizer merging three attachment sources:
 *   1. Canvas shapes (yagi-image, yagi-pdf, yagi-url-card) from tldraw snapshot
 *   2. attached_pdfs jsonb column entries
 *   3. attached_urls jsonb column entries
 *
 * Trust boundary: server actions ALWAYS recompute asset_index server-side.
 * Client NEVER supplies asset_index (K-05 + L-041).
 *
 * Pure function — no I/O, no side effects, easily unit-testable.
 */

// ============================================================
// Attachment types (mirrors DB jsonb shape contracts)
// ============================================================

export type PdfAttachment = {
  id: string;
  storage_key: string;
  filename: string;
  size_bytes: number;
  uploaded_at: string; // ISO string
  uploaded_by: string; // profile_id
};

export type UrlAttachment = {
  id: string;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  provider: "youtube" | "vimeo" | "generic";
  note: string | null;
  added_at: string; // ISO string
  added_by: string; // profile_id
};

// ============================================================
// Unified asset index entry
// ============================================================

export type AssetIndexEntry = {
  id: string;
  source: "canvas" | "attached_pdf" | "attached_url";
  kind: "image" | "pdf" | "url";
  // Common
  url: string; // for canvas: R2 public URL; for url-attachment: the URL itself; for pdf-attachment: storage_key
  title: string | null;
  thumbnail_url: string | null;
  // Canvas-only
  shape_id?: string;
  // PDF-only
  filename?: string;
  size_bytes?: number;
  // URL-only (attached or canvas url-card)
  provider?: "youtube" | "vimeo" | "generic";
  // Memo (URL-attachment) or caption (canvas image-shape)
  note: string | null;
  added_at: string; // ISO string
  // Set when same URL appears in both canvas url-card shapes AND attached_urls
  duplicate?: boolean;
};

// ============================================================
// extractAssetIndex
// Merges canvas shapes + attached_pdfs + attached_urls into a unified
// flat AssetIndexEntry[].
//
// Sort order: attached items first (source !== 'canvas'), then canvas items,
// within each group sorted by added_at ascending.
//
// Deduplication: if the same URL exists in both canvas url-card shapes AND
// attached_urls, keep both entries — mark the canvas entry with duplicate:true
// (the attached_url entry has the explicit note and is preferred for display).
//
// Default params preserve backward compat with Phase 3.1 callers that only
// pass the document argument.
// ============================================================

export function extractAssetIndex(
  document: Record<string, unknown> | null | undefined,
  attached_pdfs: PdfAttachment[] = [],
  attached_urls: UrlAttachment[] = []
): AssetIndexEntry[] {
  const canvasEntries: AssetIndexEntry[] = [];
  const attachedEntries: AssetIndexEntry[] = [];

  // --- Build set of URLs in attached_urls for dedup check ---
  const attachedUrlSet = new Set<string>(
    attached_urls.map((u) => u.url.toLowerCase().trim())
  );

  // --- Extract canvas shapes ---
  if (document && typeof document === "object") {
    const store = document.store as Record<string, unknown> | undefined;
    if (store && typeof store === "object") {
      for (const [key, record] of Object.entries(store)) {
        if (!key.startsWith("shape:")) continue;
        if (typeof record !== "object" || record === null) continue;

        const shape = record as {
          type?: string;
          id?: string;
          props?: Record<string, unknown>;
          meta?: Record<string, unknown>;
        };

        if (!shape.type || !shape.props) continue;

        const addedAt =
          typeof shape.meta?.createdAt === "string"
            ? shape.meta.createdAt
            : typeof shape.meta?.addedAt === "string"
              ? shape.meta.addedAt
              : new Date(0).toISOString();

        switch (shape.type) {
          case "yagi-image": {
            const src = shape.props.src as string | undefined;
            if (src) {
              canvasEntries.push({
                id: shape.id ?? key,
                source: "canvas",
                kind: "image",
                url: src,
                title: (shape.props.alt as string) || null,
                thumbnail_url: null,
                shape_id: shape.id ?? key,
                note: null,
                added_at: addedAt,
              });
            }
            break;
          }
          case "yagi-pdf": {
            const src = shape.props.src as string | undefined;
            const filename = shape.props.filename as string | undefined;
            if (src) {
              canvasEntries.push({
                id: shape.id ?? key,
                source: "canvas",
                kind: "pdf",
                url: src,
                title: filename ?? null,
                thumbnail_url: null,
                shape_id: shape.id ?? key,
                filename,
                note: null,
                added_at: addedAt,
              });
            }
            break;
          }
          case "yagi-url-card": {
            const src = shape.props.url as string | undefined;
            const title = shape.props.title as string | undefined;
            const domain = shape.props.domain as string | undefined;
            if (src) {
              const isDuplicate = attachedUrlSet.has(
                src.toLowerCase().trim()
              );
              canvasEntries.push({
                id: shape.id ?? key,
                source: "canvas",
                kind: "url",
                url: src,
                title: title ?? domain ?? null,
                thumbnail_url: null,
                shape_id: shape.id ?? key,
                note: null,
                added_at: addedAt,
                ...(isDuplicate ? { duplicate: true } : {}),
              });
            }
            break;
          }
        }
      }
    }
  }

  // --- Map attached_pdfs ---
  for (const pdf of attached_pdfs) {
    attachedEntries.push({
      id: pdf.id,
      source: "attached_pdf",
      kind: "pdf",
      url: pdf.storage_key, // storage_key is the canonical reference; public URL built in display layer
      title: pdf.filename,
      thumbnail_url: null,
      filename: pdf.filename,
      size_bytes: pdf.size_bytes,
      note: null,
      added_at: pdf.uploaded_at,
    });
  }

  // --- Map attached_urls ---
  for (const urlEntry of attached_urls) {
    attachedEntries.push({
      id: urlEntry.id,
      source: "attached_url",
      kind: "url",
      url: urlEntry.url,
      title: urlEntry.title,
      thumbnail_url: urlEntry.thumbnail_url,
      provider: urlEntry.provider,
      note: urlEntry.note,
      added_at: urlEntry.added_at,
    });
  }

  // --- Sort each group by added_at ascending ---
  const sortByAddedAt = (a: AssetIndexEntry, b: AssetIndexEntry) =>
    a.added_at.localeCompare(b.added_at);

  attachedEntries.sort(sortByAddedAt);
  canvasEntries.sort(sortByAddedAt);

  // --- Result: attached first, then canvas ---
  return [...attachedEntries, ...canvasEntries];
}
