/**
 * Client-side helpers for thread message attachments.
 *
 * Upload flow:
 *  - validate file (mime + per-kind size cap)
 *  - (optional) generate a thumbnail blob for images + videos
 *  - upload the primary object + thumbnail to the `thread-attachments` bucket
 *  - return the metadata the Server Action needs to insert the DB row
 *
 * Path convention: `{projectId}/{threadId}/{messageId | 'pending'}/{uuid}__{safeName}`.
 * The storage RLS on `thread-attachments` only checks the FIRST path segment is the
 * project_id and that the requester is a workspace member — so the `pending`
 * segment is safe; we simply don't rename/move objects once the message exists.
 */

import { createSupabaseBrowser } from "@/lib/supabase/client";
import { readVideoMetadata } from "@/lib/references/video";

export const BUCKET = "thread-attachments";

export const MAX_BYTES_BY_KIND = {
  image: 10 * 1024 * 1024, // 10 MB
  video: 500 * 1024 * 1024, // 500 MB
  pdf: 25 * 1024 * 1024, // 25 MB
  file: 50 * 1024 * 1024, // 50 MB
} as const;

export type AttachmentKind = keyof typeof MAX_BYTES_BY_KIND;

/** Maps a MIME type to the attachment kind we store in the DB. */
export function kindForMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export type ValidateResult =
  | { ok: true; kind: AttachmentKind }
  | { ok: false; reason: "size" | "mime" };

/**
 * Validates a candidate attachment.
 * Only inspects `File.type` and `File.size` — never reads file contents.
 */
export function validateAttachment(file: File): ValidateResult {
  const kind = kindForMime(file.type || "");
  const cap = MAX_BYTES_BY_KIND[kind];
  if (file.size > cap) return { ok: false, reason: "size" };
  return { ok: true, kind };
}

/** Sanitize a filename for use in a storage path. */
function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\]+/g, "_").trim();
  if (cleaned.length === 0) return "file";
  if (cleaned.length > 200) return cleaned.slice(0, 200);
  return cleaned;
}

const THUMB_MAX_EDGE_PX = 320;
const THUMB_JPEG_QUALITY = 0.7;

/**
 * Generate a small JPEG thumbnail for an image file using a canvas.
 * Returns null on any failure — never throws.
 */
async function buildImageThumbnail(file: File): Promise<Blob | null> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return null;
  }
  return new Promise<Blob | null>((resolve) => {
    let objectUrl: string | null = null;
    const settle = (blob: Blob | null) => {
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
      }
      resolve(blob);
    };
    try {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => settle(null);
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (w <= 0 || h <= 0) return settle(null);
          const scale =
            Math.max(w, h) > THUMB_MAX_EDGE_PX
              ? THUMB_MAX_EDGE_PX / Math.max(w, h)
              : 1;
          const cw = Math.max(1, Math.round(w * scale));
          const ch = Math.max(1, Math.round(h * scale));
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) return settle(null);
          ctx.drawImage(img, 0, 0, cw, ch);
          canvas.toBlob(
            (blob) => settle(blob ?? null),
            "image/jpeg",
            THUMB_JPEG_QUALITY
          );
        } catch {
          settle(null);
        }
      };
      img.src = objectUrl;
    } catch {
      settle(null);
    }
  });
}

export type UploadResult = {
  storage_path: string;
  thumbnail_path: string | null;
  kind: AttachmentKind;
  mime_type: string;
  size_bytes: number;
  file_name: string;
};

export type UploadArgs = {
  file: File;
  projectId: string;
  threadId: string;
  messageId?: string;
};

/**
 * Uploads an attachment (+ optional thumbnail) to the `thread-attachments` bucket.
 * Returns null on failure (caller shows toast). Never throws.
 */
export async function uploadAttachment(
  args: UploadArgs
): Promise<UploadResult | null> {
  const { file, projectId, threadId, messageId } = args;
  const validation = validateAttachment(file);
  if (!validation.ok) return null;
  const kind = validation.kind;

  const supabase = createSupabaseBrowser();
  const scope = messageId ?? "pending";
  const uuid = crypto.randomUUID();
  const cleanName = safeFileName(file.name);
  const storagePath = `${projectId}/${threadId}/${scope}/${uuid}__${cleanName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) {
    return null;
  }

  let thumbnailPath: string | null = null;

  // Thumbnail generation — best-effort, never blocks the happy path.
  try {
    if (kind === "image") {
      const thumb = await buildImageThumbnail(file);
      if (thumb) {
        const thumbPath = `${projectId}/${threadId}/${scope}/${uuid}__thumb.jpg`;
        const { error: thumbError } = await supabase.storage
          .from(BUCKET)
          .upload(thumbPath, thumb, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (!thumbError) thumbnailPath = thumbPath;
      }
    } else if (kind === "video") {
      const meta = await readVideoMetadata(file);
      if (meta.poster) {
        const thumbPath = `${projectId}/${threadId}/${scope}/${uuid}__poster.jpg`;
        const { error: thumbError } = await supabase.storage
          .from(BUCKET)
          .upload(thumbPath, meta.poster, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (!thumbError) thumbnailPath = thumbPath;
      }
    }
    // PDF: thumbnail deferred — subtask 05 owns pdfjs; we avoid pulling it
    // into the threads bundle. Generic files: no thumbnail.
  } catch {
    // Thumbnailing is best-effort — ignore and proceed.
  }

  return {
    storage_path: storagePath,
    thumbnail_path: thumbnailPath,
    kind,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    file_name: cleanName,
  };
}
