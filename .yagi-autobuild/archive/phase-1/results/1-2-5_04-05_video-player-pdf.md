# Phase 1.2.5 / Subtasks 04+05 result
status: complete
files_created:
  - src/components/project/video-player.tsx
  - src/lib/references/pdf.ts
files_modified:
  - src/components/project/reference-uploader.tsx
  - src/components/project/reference-grid.tsx
  - package.json
  - pnpm-lock.yaml
new_dependencies: [pdfjs-dist@5.6.205]
build: clean

## Notes

### Subtask 04 — video-player.tsx
- Single Client Component at `src/components/project/video-player.tsx` with three render paths keyed by a discriminated `kind` union (`upload` | `embed` | `external`).
- `upload`: `<video controls preload="metadata" poster={posterSrc}>`; on `onError`, shows `ref_video_unsupported_format` as a link to download the original signed URL. `Enter` toggles play/pause for keyboard users. Focus ring via `focus-visible:ring-2`.
- `embed` (youtube | vimeo): extracts id via regex (`(?:v=|youtu\.be/|embed/|shorts/)([\w-]{11})` / `vimeo\.com/(?:video/)?(\d+)`), renders an accessible `role="button"` poster tile, and opens a Radix Dialog (max-w 900px, `aspect-video`) with an iframe at `https://www.youtube.com/embed/{id}?autoplay=1` or `https://player.vimeo.com/video/{id}?autoplay=1`. Iframe only mounts while `open` to avoid pre-loading. `DialogTitle` is `sr-only` to satisfy Radix a11y without a visual header.
- `external` (tiktok | instagram): anchor with `target="_blank" rel="noopener noreferrer"`, full-keyboard native.
- If id extraction fails for a youtube/vimeo row, falls back to the external link render path.

### Subtask 05 — pdf.ts
- `validatePdfFile`: MIME `application/pdf`, size ≤ 25 MB. Mirrors `validateVideoFile` shape.
- `readPdfMetadata`: dynamic `await import('pdfjs-dist')`, sets `GlobalWorkerOptions.workerSrc` to the pinned CDN URL. Caps the longest viewport edge at 800px, renders page 1 to a canvas, `toBlob('image/jpeg', 0.7)`. Returns `page_count` from `doc.numPages`. Wrapped in `Promise.race` with a 15s timeout; any error → `{ poster: null, page_count: null }` (never throws).
- `page.render({canvasContext, viewport})` cast via `unknown as Parameters<typeof page.render>[0]` because pdfjs v5 requires `canvas` (not `canvasContext`) in its type signature but both are still accepted at runtime. This keeps compatibility without pinning to legacy types.
- Worker CDN URL: `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`. Version hardcoded as a `const` at the top of the file — update both together when bumping pdfjs.

### reference-uploader.tsx changes
- Imported `validatePdfFile` + `readPdfMetadata`. Replaced inline `file.size > MAX_PDF_BYTES` check with `validatePdfFile`. Dropped the now-unused `MAX_PDF_BYTES` constant.
- PDF branch now: validate → upload PDF → `readPdfMetadata` → if poster blob, upload to `{projectId}/{id}_poster.jpg` → `addReference` with `thumbnail_path` and `page_count`.
- Same `id` is reused for `{id}.pdf` and `{id}_poster.jpg` for tidy storage.

### reference-grid.tsx changes
- Extended the SELECT to include `media_type, duration_seconds, page_count, thumbnail_path, embed_provider`. (`mime_type` isn't in the schema — omitted.)
- Signed-URL pass now runs `Promise.all` for both `storage_path` and `thumbnail_path` in parallel per row.
- Dispatch by `media_type`:
  - `image` → existing `<img>` render.
  - `video` + storage_path → `<VideoPlayer kind="upload">` with signed video and signed poster.
  - `video` + external_url + (youtube|vimeo) → `<VideoPlayer kind="embed">`.
  - `video` + external_url + (tiktok|instagram) → `<VideoPlayer kind="external">`.
  - `pdf` → anchor to signed URL (`target="_blank"`) with thumbnail poster or generic `FileText` icon.
- Duration caption (`mm:ss`) under video cards; page-count caption under PDF cards. Both use existing i18n keys (`ref_duration_label`, `ref_pages_label`). Caption + remove button overlay remain wired for every media type.

### Build
- Clean after clearing `.next/` and rebuilding (one spurious ENOENT on first run was resolved by the subsequent attempt — likely a Windows filesystem race in Next.js). Final build: zero errors, zero warnings.
