/**
 * Pure constants + validation helpers for team-channel attachments.
 *
 * Lives in its own file (without `"use server"`) so Client Components can
 * import the caps/mime helpers for up-front validation without pulling any
 * server-only modules into their bundle.
 */

export const BUCKET = "team-channel-attachments";

export const attachmentSizeCaps = {
  image: 10 * 1024 * 1024, // 10 MB
  video: 500 * 1024 * 1024, // 500 MB
  pdf: 25 * 1024 * 1024, // 25 MB
  file: 50 * 1024 * 1024, // 50 MB
} as const;

export type AttachmentKind = keyof typeof attachmentSizeCaps;

const ALLOWED_MIME_PREFIXES = ["image/", "video/"] as const;
const ALLOWED_MIME_EXACT = new Set<string>([
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/octet-stream",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
]);

export function kindForMime(mime: string): AttachmentKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "file";
}

export function isAllowedMime(mime: string): boolean {
  if (!mime) return false;
  for (const prefix of ALLOWED_MIME_PREFIXES) {
    if (mime.startsWith(prefix)) return true;
  }
  return ALLOWED_MIME_EXACT.has(mime);
}

export function safeFileName(name: string): string {
  const cleaned = name.replace(/[/\\]+/g, "_").trim();
  if (cleaned.length === 0) return "file";
  if (cleaned.length > 200) return cleaned.slice(0, 200);
  return cleaned;
}

export type AttachmentValidation =
  | { ok: true; kind: AttachmentKind }
  | { ok: false; reason: "mime" | "size" };

/** Validates a File on the client before requesting a signed URL. */
export function validateAttachmentFile(file: File): AttachmentValidation {
  const mime = file.type || "";
  if (!isAllowedMime(mime)) return { ok: false, reason: "mime" };
  const kind = kindForMime(mime);
  if (file.size > attachmentSizeCaps[kind]) return { ok: false, reason: "size" };
  return { ok: true, kind };
}
