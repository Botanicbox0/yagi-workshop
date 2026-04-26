#!/usr/bin/env node
// =============================================================================
// Phase 2.8.1 G_B1-F — R2 brief-asset round-trip test
// =============================================================================
// PUTs a 5MB synthetic JPEG to R2 via the same presign helpers used by
// the Brief Board uploadAsset path, then GETs it back and asserts:
//   - PUT 200 / 204
//   - GET 200, byte length matches
//   - total round-trip < 5000 ms
//
// Required env (else SKIP, exit 0):
//   - R2_ACCOUNT_ID, R2_BUCKET_BRIEF_ASSETS
//   - R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY
//   - R2_PUBLIC_HOST (optional — for direct GET; otherwise uses presigned)
//
// Run: node scripts/test-r2-brief-asset.mjs
// =============================================================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;
const bucket = process.env.R2_BUCKET_BRIEF_ASSETS;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
  console.log(
    "SKIP: test-r2-brief-asset — set R2_ACCOUNT_ID / R2_BUCKET_BRIEF_ASSETS / " +
      "R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY to run live.",
  );
  process.exit(0);
}

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
const s3 = new S3Client({
  region: "auto",
  endpoint,
  credentials: { accessKeyId, secretAccessKey },
});

const key = `project-briefs/_phase-2-8-1-test/${Date.now()}.bin`;
const SIZE = 5 * 1024 * 1024;
const body = Buffer.alloc(SIZE, 0xab);

console.log(`R2 round-trip test — bucket=${bucket} key=${key} size=${SIZE}`);

const start = Date.now();

const putUrl = await getSignedUrl(
  s3,
  new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: "image/jpeg",
    ContentLength: SIZE,
  }),
  { expiresIn: 60 },
);

const putResp = await fetch(putUrl, {
  method: "PUT",
  headers: { "Content-Type": "image/jpeg", "Content-Length": String(SIZE) },
  body,
});
const putElapsed = Date.now() - start;
if (!putResp.ok) {
  console.error(`  ✗ PUT failed status=${putResp.status} elapsed=${putElapsed}ms`);
  process.exit(1);
}
console.log(`  ✓ PUT ${putResp.status} in ${putElapsed}ms`);

const getUrl = await getSignedUrl(
  s3,
  new GetObjectCommand({ Bucket: bucket, Key: key }),
  { expiresIn: 60 },
);

const getResp = await fetch(getUrl);
if (!getResp.ok) {
  console.error(`  ✗ GET failed status=${getResp.status}`);
  process.exit(1);
}
const buf = Buffer.from(await getResp.arrayBuffer());
const totalElapsed = Date.now() - start;

if (buf.byteLength !== SIZE) {
  console.error(
    `  ✗ size mismatch: expected=${SIZE} got=${buf.byteLength}`,
  );
  process.exit(1);
}
console.log(`  ✓ GET ${getResp.status} ${buf.byteLength} bytes`);

// Cleanup so the test bucket doesn't accumulate fixtures.
try {
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  console.log("  ✓ cleanup DELETE ok");
} catch (e) {
  console.warn(`  ! cleanup DELETE failed (non-fatal): ${e.message}`);
}

console.log(`Total round-trip ${totalElapsed}ms`);
if (totalElapsed >= 5000) {
  console.error("FAIL — round-trip exceeded 5000ms budget");
  process.exit(1);
}
console.log("PASS");
process.exit(0);
