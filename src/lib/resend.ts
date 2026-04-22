import "server-only";
import { Resend } from "resend";

let client: Resend | null | undefined;

export function getResend(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[resend] RESEND_API_KEY not set — email disabled");
    client = null;
    return null;
  }
  client = new Resend(key);
  return client;
}

// The "from" address used for all outbound mail in Phase 1.2.
// Adjust via env later when a verified sending domain is wired up.
export const EMAIL_FROM =
  process.env.RESEND_FROM_EMAIL ?? "YAGI Workshop <noreply@yagiworkshop.xyz>";
