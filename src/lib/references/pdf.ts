/**
 * Client-side helpers for handling PDF file uploads as project references.
 * No React; used from the reference uploader client component.
 *
 * `pdfjs-dist` is dynamically imported so it only loads when we actually need
 * to read metadata (keeps it out of the initial bundle).
 */

const MAX_PDF_BYTES = 25 * 1024 * 1024; // 25 MB
const PDF_MIME = "application/pdf";

// Hardcoded to keep the bundle deterministic — must match `pdfjs-dist` in
// package.json. Update both together.
const PDFJS_VERSION = "5.6.205";
const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

const POSTER_MAX_EDGE_PX = 800;
const METADATA_TIMEOUT_MS = 15_000;

export type PdfValidateResult =
  | { ok: true }
  | { ok: false; reason: "mime" | "size" };

/**
 * Validates a candidate PDF file against the uploader's constraints.
 * Does not read the file — only inspects `File.type` and `File.size`.
 */
export function validatePdfFile(file: File): PdfValidateResult {
  if (file.type !== PDF_MIME) {
    return { ok: false, reason: "mime" };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { ok: false, reason: "size" };
  }
  return { ok: true };
}

export type PdfMetadata = {
  poster: Blob | null;
  page_count: number | null;
};

/**
 * Reads basic metadata (page count + first-page poster JPEG) from a PDF file
 * using `pdfjs-dist`. Never throws; returns `{ poster: null, page_count: null }`
 * on any failure. Hard 15s timeout via `Promise.race`.
 *
 * Intended to run in the browser only (no SSR usage).
 */
export function readPdfMetadata(file: File): Promise<PdfMetadata> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve({ poster: null, page_count: null });
  }

  const empty: PdfMetadata = { poster: null, page_count: null };

  const work = async (): Promise<PdfMetadata> => {
    try {
      // Dynamic import so pdfjs stays out of the initial bundle.
      const pdfjs = await import("pdfjs-dist");
      try {
        pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
      } catch {
        // ignore
      }

      const buffer = await file.arrayBuffer();

      // pdfjs mutates the passed buffer; hand it a copy.
      const data = new Uint8Array(buffer);
      const loadingTask = pdfjs.getDocument({ data });
      const doc = await loadingTask.promise;

      const pageCount =
        typeof doc.numPages === "number" && doc.numPages > 0
          ? doc.numPages
          : null;

      let poster: Blob | null = null;
      try {
        const page = await doc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const longestEdge = Math.max(baseViewport.width, baseViewport.height);
        const scale =
          longestEdge > POSTER_MAX_EDGE_PX
            ? POSTER_MAX_EDGE_PX / longestEdge
            : 1;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(viewport.width));
        canvas.height = Math.max(1, Math.round(viewport.height));
        const ctx = canvas.getContext("2d");
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport,
            // pdfjs types differ across versions; cast defensively.
          } as unknown as Parameters<typeof page.render>[0]).promise;

          poster = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(
              (blob) => resolve(blob),
              "image/jpeg",
              0.7
            );
          });
        }
      } catch {
        poster = null;
      }

      try {
        await doc.cleanup();
      } catch {
        // ignore
      }
      try {
        await doc.destroy();
      } catch {
        // ignore
      }

      return { poster, page_count: pageCount };
    } catch {
      return empty;
    }
  };

  const timeout = new Promise<PdfMetadata>((resolve) => {
    setTimeout(() => resolve(empty), METADATA_TIMEOUT_MS);
  });

  return Promise.race([work(), timeout]).catch(() => empty);
}
