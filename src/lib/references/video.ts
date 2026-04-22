/**
 * Client-side helpers for handling video file uploads as project references.
 * No React; used from the reference uploader client component.
 */

const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
const ACCEPTED_VIDEO_MIME = new Set<string>([
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const POSTER_CAPTURE_TIME_SECONDS = 1.0;
const POSTER_MAX_WIDTH_PX = 640;
const METADATA_TIMEOUT_MS = 15_000;

export type VideoValidateResult =
  | { ok: true }
  | { ok: false; reason: "mime" | "size" };

/**
 * Validates a candidate video file against the uploader's constraints.
 * Does not read the file — only inspects `File.type` and `File.size`.
 */
export function validateVideoFile(file: File): VideoValidateResult {
  if (!ACCEPTED_VIDEO_MIME.has(file.type)) {
    return { ok: false, reason: "mime" };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, reason: "size" };
  }
  return { ok: true };
}

export type VideoMetadata = {
  duration_seconds: number | null;
  poster: Blob | null;
};

/**
 * Reads basic metadata (duration + first-frame poster) from a video file
 * using a hidden <video> element and a <canvas>. Never throws; returns
 * `{ duration_seconds: null, poster: null }` on any failure.
 *
 * Intended to run in the browser only (no SSR usage).
 */
export function readVideoMetadata(file: File): Promise<VideoMetadata> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.resolve({ duration_seconds: null, poster: null });
  }

  return new Promise<VideoMetadata>((resolve) => {
    let settled = false;
    let objectUrl: string | null = null;
    let video: HTMLVideoElement | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      if (video) {
        try {
          video.removeAttribute("src");
          video.load();
        } catch {
          // ignore
        }
        video = null;
      }
      if (objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore
        }
        objectUrl = null;
      }
    };

    const settle = (result: VideoMetadata) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const fail = () => settle({ duration_seconds: null, poster: null });

    try {
      video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      // Keep it offscreen; never attach to DOM.
      video.style.position = "fixed";
      video.style.left = "-9999px";
      video.style.top = "-9999px";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.opacity = "0";

      objectUrl = URL.createObjectURL(file);

      video.onerror = () => fail();

      video.onloadedmetadata = () => {
        if (!video) return fail();
        const rawDuration = video.duration;
        const duration =
          Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null;

        // If we can't seek, just return duration with no poster.
        try {
          const targetTime = Math.min(
            POSTER_CAPTURE_TIME_SECONDS,
            duration !== null ? Math.max(duration - 0.1, 0) : POSTER_CAPTURE_TIME_SECONDS
          );
          video.currentTime = targetTime;
        } catch {
          settle({ duration_seconds: duration, poster: null });
        }
      };

      video.onseeked = () => {
        if (!video) return fail();
        const rawDuration = video.duration;
        const duration =
          Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : null;

        try {
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (vw <= 0 || vh <= 0) {
            settle({ duration_seconds: duration, poster: null });
            return;
          }
          const scale = vw > POSTER_MAX_WIDTH_PX ? POSTER_MAX_WIDTH_PX / vw : 1;
          const cw = Math.max(1, Math.round(vw * scale));
          const ch = Math.max(1, Math.round(vh * scale));
          const canvas = document.createElement("canvas");
          canvas.width = cw;
          canvas.height = ch;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            settle({ duration_seconds: duration, poster: null });
            return;
          }
          ctx.drawImage(video, 0, 0, cw, ch);
          canvas.toBlob(
            (blob) => {
              settle({ duration_seconds: duration, poster: blob ?? null });
            },
            "image/jpeg",
            0.82
          );
        } catch {
          settle({ duration_seconds: duration, poster: null });
        }
      };

      video.src = objectUrl;
      // Kick off loading.
      try {
        video.load();
      } catch {
        // ignore
      }

      timeoutId = setTimeout(() => fail(), METADATA_TIMEOUT_MS);
    } catch {
      fail();
    }
  });
}
