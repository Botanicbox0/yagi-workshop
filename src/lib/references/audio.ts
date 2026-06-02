/**
 * Client-side helpers for handling audio file uploads as project references.
 * No React; intended for the artist request wizard once that UI lands.
 */

export const MAX_AUDIO_BYTES = 100 * 1024 * 1024; // 100 MB

export const ACCEPTED_AUDIO_MIME = new Set<string>([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/flac",
]);

export type AudioValidateResult =
  | { ok: true }
  | { ok: false; reason: "mime" | "size" };

/**
 * Validates a candidate audio file against the uploader's constraints.
 * Does not read the file — only inspects `File.type` and `File.size`.
 */
export function validateAudioFile(file: File): AudioValidateResult {
  if (!ACCEPTED_AUDIO_MIME.has(file.type)) {
    return { ok: false, reason: "mime" };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, reason: "size" };
  }
  return { ok: true };
}
