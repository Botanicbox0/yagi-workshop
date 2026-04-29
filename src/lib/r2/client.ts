import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[r2] missing env ${name}`);
  return v;
}

export const BUCKET =
  process.env.CLOUDFLARE_R2_BUCKET_NAME ?? "yagi-challenge-submissions";

// Lazy singleton — instantiated on first real use. Non-upload paths
// (e.g., sitemap.ts) don't need this and shouldn't crash if creds missing.
let _client: S3Client | null = null;
function getClient(): S3Client {
  if (_client) return _client;
  _client = new S3Client({
    region: "auto",
    endpoint: requireEnv("CLOUDFLARE_R2_ENDPOINT"),
    credentials: {
      accessKeyId: requireEnv("CLOUDFLARE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY"),
    },
    // Defensive against AWS SDK v3 (>=3.729.0) auto-injecting
    // x-amz-checksum-crc32 + x-amz-sdk-checksum-algorithm headers/query on
    // PUT operations. When those land in a presigned URL, the browser-side
    // PUT signature mismatches what R2 verifies. Current SDK at 3.1035 + this
    // flag together emit a clean URL (verified: SignedHeaders=host only, no
    // checksum bits). The middleware below is belt-and-suspenders for future
    // SDK bumps.
    // Refs:
    //   https://github.com/aws/aws-sdk-js-v3/issues/6810
    //   https://github.com/aws/aws-sdk-js-v3/issues/6920
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  // Belt-and-suspenders: strip any flexible-checksum artifacts at the build
  // stage BEFORE getSignedUrl signs the request. Currently a no-op at SDK
  // 3.1035 with the config above, but protects against SDK upgrades that
  // re-introduce auto-injection.
  _client.middlewareStack.add(
    (next) => async (args) => {
      const req = args.request as {
        headers?: Record<string, string>;
        query?: Record<string, string | string[]>;
      };
      if (req.headers) {
        for (const k of Object.keys(req.headers)) {
          const lk = k.toLowerCase();
          if (
            lk === "x-amz-sdk-checksum-algorithm" ||
            lk.startsWith("x-amz-checksum-")
          ) {
            delete req.headers[k];
          }
        }
      }
      if (req.query) {
        for (const k of Object.keys(req.query)) {
          const lk = k.toLowerCase();
          if (
            lk === "x-amz-sdk-checksum-algorithm" ||
            lk.startsWith("x-amz-checksum-")
          ) {
            delete req.query[k];
          }
        }
      }
      return next(args);
    },
    { step: "build", name: "stripChecksumHeaders", priority: "high" }
  );

  return _client;
}

/**
 * Generate a presigned PUT URL for uploading an object.
 * Default expiry 3600s (1h) — enough for large video uploads.
 * Path convention (caller's responsibility):
 *   tmp/<challenge_id>/<client_uuid>/<filename>   (pre-confirm)
 *   submissions/<challenge_id>/<submission_id>/<filename>  (post-atomic move)
 */
export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresSeconds = 3600
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
}

/**
 * Public URL for serving an uploaded object.
 * Uses the R2 endpoint directly. If CLOUDFLARE_R2_PUBLIC_BASE is set
 * in the future, prefer that for custom-domain serving.
 */
export function objectPublicUrl(key: string): string {
  const base =
    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BUCKET}`;
  return `${base}/${key}`;
}

/**
 * Re-export the SDK client getter for advanced ops (CopyObject, HeadObject, DeleteObject).
 * Server actions in src/app/challenges/[slug]/submit/actions.ts will use this for the
 * tmp/ → submissions/ atomic move + upload verification.
 */
export { getClient as getR2Client };

// =============================================================================
// Phase 2.8 — Brief Board asset bucket helpers
// =============================================================================
// Per SPEC §3.3 brief assets live in an existing R2 bucket under a new
// `project-briefs/<project_id>/<uuid>.<ext>` prefix. SPEC says zero new
// dependencies and reuse Phase 1.x SDK integration — the BRIEF_BUCKET
// constant defaults to `yagi-commission-files` (the per-Q-059 commission/
// project-files bucket) and is overridable via env for future separation.
//
// Note: presigned URLs are generated server-side; the client uploads the
// blob directly to R2 via the returned URL. Direct browser → R2 PUT keeps
// large files off our server.

export const BRIEF_BUCKET =
  process.env.CLOUDFLARE_R2_BRIEF_BUCKET ?? "yagi-commission-files";

/**
 * Public URL for a BRIEF_BUCKET object. Phase 3.1 K-05 LOOP 1 HIGH-B F7 fix:
 * the legacy `objectPublicUrl` builds a URL based on `BUCKET` (the challenge
 * submissions bucket), but brief assets are written to `BRIEF_BUCKET`. When
 * `CLOUDFLARE_R2_PUBLIC_BASE` is set (the Phase 3.1 prereq), it overrides
 * regardless and is expected to point at the brief bucket's public URL. When
 * unset, this helper at least targets the correct bucket via the R2 endpoint.
 */
export function briefObjectPublicUrl(key: string): string {
  const base =
    process.env.CLOUDFLARE_R2_PUBLIC_BASE ??
    `${requireEnv("CLOUDFLARE_R2_ENDPOINT")}/${BRIEF_BUCKET}`;
  return `${base}/${key}`;
}

/**
 * Generate a presigned PUT URL for a brief asset upload.
 * Default expiry 600s — uploads are debounced one-shot, not long-lived.
 */
export async function createBriefAssetPutUrl(
  storageKey: string,
  contentType: string,
  expiresSeconds = 600
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: BRIEF_BUCKET,
    Key: storageKey,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
}

/**
 * Generate a presigned GET URL for a brief asset download / inline render.
 * 1h expiry covers a typical edit session; the editor refreshes URLs lazily
 * on remount, so users with very long sessions just refetch on next mount.
 */
export async function createBriefAssetGetUrl(
  storageKey: string,
  expiresSeconds = 3600
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: BRIEF_BUCKET,
    Key: storageKey,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn: expiresSeconds });
}
