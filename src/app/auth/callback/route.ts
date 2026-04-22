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

  if (!profile) {
    return NextResponse.redirect(`${origin}/${locale}/onboarding`);
  }

  // Optional `next` param support (e.g., /app/projects/abc)
  if (next && next.startsWith("/")) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/${locale}/app`);
}
