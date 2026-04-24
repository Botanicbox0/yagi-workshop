import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServer } from "@/lib/supabase/server";

// TODO FU-16: migrate these literals to useTranslations once next-intl
// Server Component pattern is confirmed stable in this route tree.
const LABELS = {
  submit: "작품 올리기",
  upgrade: "창작자로 참여하기",
  signin: "참여 시작하기",
  view_gallery: "작품 보기",
  view_winners: "주인공 보기",
} as const;

type Challenge = {
  slug: string;
  state: string;
};

type Props = { challenge: Challenge };

export async function PrimaryCtaButton({ challenge }: Props) {
  const { slug, state } = challenge;

  let label: string;
  let href: string;

  if (state === "closed_judging") {
    label = LABELS.view_gallery;
    href = `/challenges/${slug}/gallery`;
  } else if (state === "closed_announced") {
    label = LABELS.view_winners;
    href = `/challenges/${slug}/gallery#winners`;
  } else if (state === "archived") {
    label = LABELS.view_gallery;
    href = `/challenges/${slug}/gallery`;
  } else if (state === "open") {
    const supabase = await createSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      label = LABELS.signin;
      href = `/signin?next=${encodeURIComponent(`/challenges/${slug}`)}`;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const role = profile?.role ?? null;

      if (role === "creator" || role === "studio") {
        label = LABELS.submit;
        href = `/challenges/${slug}/submit`;
      } else if (role === "observer") {
        label = LABELS.upgrade;
        href = `/onboarding/role?next=${encodeURIComponent(`/challenges/${slug}`)}`;
      } else {
        // role is null (profile incomplete) — treat same as no-auth
        label = LABELS.signin;
        href = `/signin?next=${encodeURIComponent(`/challenges/${slug}`)}`;
      }
    }
  } else {
    // draft or unknown — no CTA
    return null;
  }

  return (
    <Button size="pill" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  );
}
