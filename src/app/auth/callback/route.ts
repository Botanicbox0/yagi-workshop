import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// Phase 4.x Wave C.5b sub_04 — expired-OTP detection. Supabase reports
// expiry via either the `error_description` query param on the redirect
// (PKCE error path) or as `exchangeCodeForSession` failure with a
// message containing one of these markers.
const EXPIRY_MARKERS = ["otp_expired", "otp expired", "code expired", "expired", "invalid_grant"];
function isExpiryError(message: string): boolean {
  const lower = message.toLowerCase();
  return EXPIRY_MARKERS.some((marker) => lower.includes(marker));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");
  const errorParam = searchParams.get("error");
  const errorCodeParam = searchParams.get("error_code");
  const errorDescParam = searchParams.get("error_description");

  // Supabase Auth redirects expired/invalid links here with the failure
  // surfaced as query params instead of a `code`. Bounce to /auth/expired
  // before doing any other work.
  if (errorParam || errorCodeParam) {
    const blob = `${errorParam ?? ""} ${errorCodeParam ?? ""} ${errorDescParam ?? ""}`;
    if (isExpiryError(blob)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(errorDescParam ?? errorCodeParam ?? errorParam ?? "auth_failed")}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  // Phase 4.x Wave C.5b sub_05 — exchangeCodeForSession persists the
  // authenticated session via the @supabase/ssr cookie adapter wired in
  // createSupabaseServer (server.ts setAll → cookieStore.set). Inside a
  // Route Handler, next/headers cookies() is mutable, so those Set-Cookie
  // entries land on the eventual NextResponse.redirect below — meaning
  // the user arrives at /onboarding/workspace already authenticated.
  // No follow-up signIn() / refresh() call is required.
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    if (isExpiryError(exchangeError.message)) {
      return NextResponse.redirect(`${origin}/ko/auth/expired`);
    }
    return NextResponse.redirect(
      `${origin}/ko/signin?error=${encodeURIComponent(exchangeError.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/ko/signin?error=no_user`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, locale")
    .eq("id", user.id)
    .maybeSingle();

  const locale = profile?.locale ?? "ko";

  // Password recovery flow: send to reset-password regardless of profile state.
  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/${locale}/reset-password`);
  }

  // Phase 2.8.1 G_B1-H (F-PUX-003): preserve the commission intent across
  // the entire signup → confirm → onboarding chain. If the user just
  // confirmed their email and still needs to onboard, hand the next URL
  // off so onboarding can either auto-skip (commission intent) or finish
  // and resume.
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//")
      ? next
      : null;

  // Phase 4.x Wave C.5b sub_01 — Brand-only persona; freshly-confirmed users
  // land directly on the workspace form (skips legacy /onboarding entry +
  // /role intermediate step).
  if (!profile) {
    const onboardingUrl = safeNext
      ? `${origin}/${locale}/onboarding/workspace?next=${encodeURIComponent(safeNext)}`
      : `${origin}/${locale}/onboarding/workspace`;
    return NextResponse.redirect(onboardingUrl);
  }

  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}
