import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5c sub_01 — PKCE intermediate confirm endpoint
// (Codex K-05 LOOP 1 fix for F1 + F7).
//
// Why an intermediate route — and why GET renders HTML instead of
// verifying immediately:
// - Gmail / Outlook / corporate-mail link-preview crawlers GET email
//   links before users can click. If GET verified directly,
//   `verifyOtp({ token_hash, type })` would single-use-consume the
//   OTP and the user's real click would land on /auth/expired.
// - Supabase's `verifyOtp` does NOT enforce the PKCE code_verifier
//   cookie (only `exchangeCodeForSession` does). The only reliable
//   way to keep crawlers from draining the token is to require a
//   user-initiated POST: GET renders an HTML "Continue" button, the
//   button POSTs the same payload, and only then do we call
//   `verifyOtp`. Crawler GETs see HTML, no token consumption.
//
// Email-template change is a yagi MANUAL action (FU-C5c-01):
//   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}">
// Same change for Magic Link + Reset Password templates.

// ---------- next param sanitisation (Codex F2 + F3 + F8 + F9 fix) ----------

const NEXT_ALLOWLIST_PREFIXES: readonly string[] = [
  "/onboarding/workspace",
  "/onboarding/brand",
  "/onboarding/invite",
  "/app",
];
const RECOVERY_NEXT = "/reset-password";
const DEFAULT_NEXT = "/onboarding/workspace";

function sanitizeNext(raw: string | null, origin: string, type: EmailOtpType): string {
  if (!raw) return type === "recovery" ? RECOVERY_NEXT : DEFAULT_NEXT;
  if (raw.length > 500) return DEFAULT_NEXT;

  // Accept either a relative path or a same-origin absolute URL — Supabase
  // emits `{{ .RedirectTo }}` as an absolute URL when `emailRedirectTo` is
  // absolute (Codex F2: the prior version dropped these silently).
  let candidate: string;
  try {
    if (raw.startsWith("/") && !raw.startsWith("//")) {
      candidate = raw;
    } else {
      const parsed = new URL(raw, origin);
      if (parsed.origin !== origin) return DEFAULT_NEXT;
      candidate = parsed.pathname + parsed.search;
    }
  } catch {
    return DEFAULT_NEXT;
  }

  // Strip leading locale so the post-confirm redirect re-prefixes with the
  // verified user's profile.locale.
  const stripped = candidate.replace(/^\/(ko|en)(?=\/|$)/, "");
  const path = stripped.length === 0 ? DEFAULT_NEXT : stripped;
  const pathOnly = path.split("?")[0];

  // Recovery flow has its own allowlist (Codex F9: don't let a forged
  // signup link land an authenticated user on the password-reset form).
  if (type === "recovery") {
    return pathOnly === RECOVERY_NEXT || pathOnly.startsWith(`${RECOVERY_NEXT}/`)
      ? path
      : RECOVERY_NEXT;
  }

  for (const prefix of NEXT_ALLOWLIST_PREFIXES) {
    if (pathOnly === prefix || pathOnly.startsWith(`${prefix}/`)) {
      return path;
    }
  }
  return DEFAULT_NEXT;
}

const SUPPORTED_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "magiclink",
  "invite",
  "email_change",
];
function asOtpType(value: string | null): EmailOtpType | null {
  if (value === null) return null;
  return (SUPPORTED_OTP_TYPES as readonly string[]).includes(value)
    ? (value as EmailOtpType)
    : null;
}

// ---------- GET — render intermediate HTML (no OTP consume) ----------

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = asOtpType(searchParams.get("type"));
  const rawNext = searchParams.get("next");

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`);
  }

  // Pre-sanitise so the form can carry a clean value forward.
  const next = sanitizeNext(rawNext, origin, type);

  // Codex F2 LOOP 2 N2 fix — no external stylesheet. The token_hash sits
  // in the URL; loading a third-party CDN would risk a Referer leak even
  // with strict-origin-when-cross-origin defaulted (older browsers can
  // diverge). Inline-only styling + system-ui fallback.
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex,nofollow" />
<meta name="referrer" content="no-referrer" />
<title>YAGI · 이메일 인증</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100dvh; display: flex; align-items: center; justify-content: center; background: #FAFAFA; color: #0A0A0A; font-family: -apple-system, BlinkMacSystemFont, system-ui, "Segoe UI", Pretendard, sans-serif; }
  main { width: 100%; max-width: 420px; padding: 32px 24px; text-align: center; }
  h1 { margin: 0 0 12px; font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
  p { margin: 0 0 28px; font-size: 14px; line-height: 1.5; color: #5C5C5C; }
  button { width: 100%; padding: 14px 24px; border: 0; border-radius: 12px; background: #71D083; color: #0A0A0A; font-size: 15px; font-weight: 600; cursor: pointer; font-family: inherit; }
  button:hover { filter: brightness(1.05); }
</style>
</head>
<body>
<main>
  <h1>이메일 인증을 완료해 주세요</h1>
  <p>아래 버튼을 누르면 가입이 완료되고 워크스페이스 만들기로 이동합니다.<br>
  Press the button below to confirm your email and continue.</p>
  <form method="POST" action="/auth/confirm">
    <input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}" />
    <input type="hidden" name="type" value="${escapeHtml(type)}" />
    <input type="hidden" name="next" value="${escapeHtml(next)}" />
    <button type="submit">계속하기 / Continue</button>
  </form>
</main>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Defense vs accidental cache by intermediate proxies.
      "Cache-Control": "no-store",
      // Email-link surface; deny indexing.
      "X-Robots-Tag": "noindex,nofollow",
      // Codex LOOP 2 N1 fix — clickjacking + form-action lockdown.
      "Content-Security-Policy":
        "default-src 'self'; style-src 'unsafe-inline'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'",
      // Codex LOOP 2 N2 fix — keep the token_hash out of any Referer.
      "Referrer-Policy": "no-referrer",
    },
  });
}

// ---------- POST — actual verifyOtp consume ----------

export async function POST(request: NextRequest) {
  const { origin } = new URL(request.url);

  // Codex LOOP 2 N1 fix — login-CSRF defense. The token_hash itself is
  // already a bearer credential, but rejecting cross-origin POSTs blocks
  // session-fixation attacks where an attacker submits their own token to
  // the victim's browser. Same-origin form submits set Origin (modern
  // browsers); when Origin is absent we fall back to Referer.
  const reqOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const sameOriginByOrigin = reqOrigin === origin;
  const sameOriginByReferer = referer ? referer.startsWith(`${origin}/`) : false;
  // Codex LOOP 3 N4 fix — explicit 303 on every POST-side redirect.
  // The default NextResponse.redirect status (307) preserves the request
  // method, so the browser would re-POST the form body to /onboarding/...
  // which has no POST handler. 303 forces the follow-up to GET.
  if (!sameOriginByOrigin && !sameOriginByReferer) {
    return NextResponse.redirect(`${origin}/ko/signin?error=cross_origin_confirm`, 303);
  }

  const form = await request.formData();
  const tokenHash = form.get("token_hash");
  const typeRaw = form.get("type");
  const nextRaw = form.get("next");

  if (typeof tokenHash !== "string" || typeof typeRaw !== "string") {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_token_hash`, 303);
  }
  const type = asOtpType(typeRaw);
  if (!type) {
    return NextResponse.redirect(`${origin}/ko/signin?error=invalid_otp_type`, 303);
  }
  const next = sanitizeNext(typeof nextRaw === "string" ? nextRaw : null, origin, type);

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });

  if (error) {
    // verifyOtp failure modes: expired / invalid / consumed. All map to
    // the user-facing "link expired, request a new one" surface.
    return NextResponse.redirect(`${origin}/ko/auth/expired`, 303);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`, 303);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale")
    .eq("id", user.id)
    .maybeSingle();
  const locale = profile?.locale === "en" ? "en" : "ko";

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}${RECOVERY_NEXT}`, 303);
  }

  return NextResponse.redirect(`${origin}/${locale}${next}`, 303);
}
