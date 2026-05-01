import Link from "next/link";
import { headers } from "next/headers";
import { Button } from "@/components/ui/button";
import { createSupabaseServer } from "@/lib/supabase/server";

// TODO: Replace literal strings with useTranslations once A2 i18n keys land.
// Awaiting challenges namespace: header_cta_new_challenge, header_cta_submit,
// header_cta_observer, header_cta_signin

export async function HeaderCtaResolver() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headersList = await headers();
  const currentPath = headersList.get("x-pathname") ?? "/challenges";

  if (!user) {
    return (
      <Button size="pill" asChild>
        <Link href={`/signin?next=${encodeURIComponent(currentPath)}`}>
          참여 시작하기
        </Link>
      </Button>
    );
  }

  // Check is_yagi_admin via user_roles table
  const { data: adminRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "yagi_admin")
    .maybeSingle();

  if (adminRow) {
    return (
      <Button size="pill" asChild>
        <Link href="/admin/challenges/new">새 챌린지</Link>
      </Button>
    );
  }

  // Fetch profile role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role ?? null;

  if (role === "creator" || role === "studio") {
    // Find the first open challenge for the submit href
    const { data: openChallenge } = await supabase
      .from("challenges")
      .select("slug")
      .eq("state", "open")
      .order("close_at", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const submitHref = openChallenge
      ? `/challenges/${openChallenge.slug}/submit`
      : "/challenges";

    return (
      <Button size="pill" asChild>
        <Link href={submitHref}>작품 올리기</Link>
      </Button>
    );
  }

  // Phase 4.x Wave C.5b sub_01: role selection retired. Legacy observer
  // profiles bounce to sign-in (challenges surface is Phase 3+ deferred).
  return (
    <Button size="pill" asChild>
      <Link href={`/signin?next=${encodeURIComponent(currentPath)}`}>
        창작자로 참여하기
      </Link>
    </Button>
  );
}
