import { createSupabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

type ChallengeRow = Database["public"]["Tables"]["challenges"]["Row"];
type SubmissionRow = Database["public"]["Tables"]["challenge_submissions"]["Row"];
type WinnerRow = Database["public"]["Tables"]["showcase_challenge_winners"]["Row"];

export async function getChallengesList() {
  const supabase = await createSupabaseServer();

  const [openRes, announcedRes, archivedRes] = await Promise.all([
    supabase
      .from("challenges")
      .select("id, slug, title, description_md, hero_media_url, open_at, close_at, announce_at, submission_requirements")
      .eq("state", "open")
      .order("close_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("challenges")
      .select("id, slug, title, hero_media_url, announce_at")
      .eq("state", "closed_announced")
      .order("announce_at", { ascending: false, nullsFirst: false })
      .limit(8),
    supabase
      .from("challenges")
      .select("id, slug, title, announce_at")
      .eq("state", "archived")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  return {
    open: (openRes.data || []) as ChallengeRow[],
    announced: (announcedRes.data || []) as ChallengeRow[],
    archived: (archivedRes.data || []) as ChallengeRow[],
  };
}

export async function getChallengeBySlug(slug: string) {
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ChallengeRow;
}

export async function getChallengeGallery(challengeId: string) {
  const supabase = await createSupabaseServer();

  const [submissionsRes, winnersRes] = await Promise.all([
    supabase
      .from("challenge_submissions")
      .select("*")
      .eq("challenge_id", challengeId)
      .eq("status", "ready"),
    supabase
      .from("showcase_challenge_winners")
      .select("*")
      .eq("challenge_id", challengeId)
      .order("rank", { ascending: true }),
  ]);

  return {
    submissions: (submissionsRes.data || []) as SubmissionRow[],
    winners: (winnersRes.data || []) as WinnerRow[],
  };
}
