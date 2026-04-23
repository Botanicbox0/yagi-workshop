import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
  });
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
