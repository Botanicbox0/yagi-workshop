import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");
  const type = searchParams.get("type");

  if (!code) {
    return NextResponse.redirect(`${origin}/ko/signin?error=missing_code`);
  }

  const supabase = await createSupabaseServer();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
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

  if (!profile) {
    const onboardingUrl = safeNext
      ? `${origin}/${locale}/onboarding?next=${encodeURIComponent(safeNext)}`
      : `${origin}/${locale}/onboarding`;
    return NextResponse.redirect(onboardingUrl);
  }

  if (safeNext) {
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}
