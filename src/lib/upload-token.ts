import "server-only";

// Wave C v2 — HMAC-signed upload token primitives. Per SPEC §3 HIGH-2.
//
// Token binds the presigned R2 URL to a specific (campaign_id, nonce, ip)
// triple so the submit action can verify that the presented `content_r2_key`
// was actually issued by THIS server for THIS campaign + this caller's IP.
// Without this binding the prior shape allowed cross-campaign key forgery.
//
// Format: `${b64url(JSON payload)}.${b64url(HMAC-SHA-256 over the payload)}`
// Payload: { campaign_id, nonce, ip_hash, iat, exp }
// TTL: 15 minutes (matches presigned PUT URL ~1 hour ceiling but tighter).
//
// Secret: WAVE_C_UPLOAD_TOKEN_SECRET env (separate from Supabase service-role
// so a leak of one does not compromise the other).

import { createHmac, randomUUID, createHash, timingSafeEqual } from "node:crypto";

const TOKEN_TTL_SECONDS = 15 * 60;

type TokenPayload = {
  campaign_id: string;
  nonce: string;
  ip_hash: string;
  iat: number;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.WAVE_C_UPLOAD_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "[upload-token] WAVE_C_UPLOAD_TOKEN_SECRET missing or too short (need ≥32 chars).",
    );
  }
  return secret;
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

export type IssuedUploadToken = {
  token: string;
  nonce: string;
  expiresAt: number;
};

export function issueUploadToken(args: {
  campaignId: string;
  ip: string;
}): IssuedUploadToken {
  const secret = getSecret();
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    campaign_id: args.campaignId,
    nonce: randomUUID(),
    ip_hash: hashIp(args.ip),
    iat: nowSec,
    exp: nowSec + TOKEN_TTL_SECONDS,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadEnc = b64urlEncode(payloadStr);
  const sig = createHmac("sha256", secret).update(payloadEnc).digest();
  const sigEnc = b64urlEncode(sig);
  return {
    token: `${payloadEnc}.${sigEnc}`,
    nonce: payload.nonce,
    expiresAt: payload.exp * 1000,
  };
}

export type VerifyResult =
  | { ok: true; payload: TokenPayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "ip_mismatch" | "campaign_mismatch" };

export function verifyUploadToken(args: {
  token: string;
  expectedCampaignId: string;
  ip: string;
}): VerifyResult {
  const parts = args.token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "malformed" };

  const [payloadEnc, sigEnc] = parts;
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return { ok: false, reason: "malformed" };
  }

  // Constant-time signature compare
  const expectedSig = createHmac("sha256", secret).update(payloadEnc).digest();
  let presentedSig: Buffer;
  try {
    presentedSig = b64urlDecode(sigEnc);
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (presentedSig.length !== expectedSig.length) {
    return { ok: false, reason: "bad_signature" };
  }
  if (!timingSafeEqual(presentedSig, expectedSig)) {
    return { ok: false, reason: "bad_signature" };
  }

  // Parse payload after signature passes (avoids leaking parse errors as oracle)
  let payload: TokenPayload;
  try {
    payload = JSON.parse(b64urlDecode(payloadEnc).toString("utf8")) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < nowSec) {
    return { ok: false, reason: "expired" };
  }
  if (payload.campaign_id !== args.expectedCampaignId) {
    return { ok: false, reason: "campaign_mismatch" };
  }
  if (payload.ip_hash !== hashIp(args.ip)) {
    return { ok: false, reason: "ip_mismatch" };
  }

  return { ok: true, payload };
}

/**
 * Build the canonical R2 key prefix bound to a token's nonce. Matches the
 * regex that submit-application-action enforces:
 *   ^tmp/campaigns/${campaign_id}/${nonce}/[\w.\-]+$
 */
export function objectKeyPrefix(campaignId: string, nonce: string): string {
  return `tmp/campaigns/${campaignId}/${nonce}/`;
}

/** Validate that an R2 key matches the expected campaign + nonce shape. */
export function validateObjectKey(args: {
  key: string;
  campaignId: string;
  nonce: string;
}): boolean {
  // Anchored regex: filename = word chars, dot, dash only (no path traversal,
  // no spaces — sanitized at presign time).
  const re = new RegExp(
    `^tmp/campaigns/${escapeRegex(args.campaignId)}/${escapeRegex(args.nonce)}/[\\w.\\-]+$`,
  );
  return re.test(args.key);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
