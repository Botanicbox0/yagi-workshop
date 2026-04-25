"use client";

// =============================================================================
// Phase 2.8 G_B-3 — Browser-side image resize for brief board uploads
// =============================================================================
// Per SPEC §4.B2: resize to longest-side 2400px before upload. Original 4K
// images (~8MB each) become ~1MB at this dimension; 95% of users won't see
// quality loss. Skip SVG (vector, no rasterization) and GIF (animation
// would be lost on canvas blit).
// =============================================================================

const MAX_LONGEST_PX = 2400;
const JPEG_QUALITY = 0.85;

export async function resizeImageIfNeeded(file: File): Promise<File> {
  // Vector + animated formats: pass through unchanged.
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  // Non-image MIME: nothing to resize.
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Decoder couldn't handle the format (e.g., HEIC on some browsers).
    // Pass through; the server-side cap still bounds size.
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest <= MAX_LONGEST_PX) {
    bitmap.close();
    return file;
  }

  const scale = MAX_LONGEST_PX / longest;
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  // OffscreenCanvas + toBlob keeps the work off the main paint thread on
  // browsers that support it; falls back to a regular canvas otherwise.
  let blob: Blob | null = null;
  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await canvas.convertToBlob({ type: outType, quality: JPEG_QUALITY });
    }
  } else {
    // Fallback for browsers without OffscreenCanvas.
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, outType, JPEG_QUALITY)
      );
    }
  }

  bitmap.close();

  if (!blob) return file;

  // Preserve filename (matters for the original_name column + alt text
  // fallback). Replace extension to match the output mime if it changed.
  const newName = renameExtForType(file.name, outType);
  return new File([blob], newName, { type: outType });
}

function renameExtForType(name: string, mime: string): string {
  const ext = mime === "image/png" ? "png" : "jpg";
  const dot = name.lastIndexOf(".");
  if (dot < 0) return `${name}.${ext}`;
  return `${name.slice(0, dot)}.${ext}`;
}
