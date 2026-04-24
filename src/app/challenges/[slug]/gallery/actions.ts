"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function castVote(
  submissionId: string,
  challengeId: string,
  slug: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  // Fresh read to confirm challenge is still open
  const { data: challenge } = await supabase
    .from("challenges")
    .select("state")
    .eq("id", challengeId)
    .single();

  if (!challenge || challenge.state !== "open") {
    return { ok: false, error: "vote_closed" };
  }

  const { error } = await supabase.from("challenge_votes").insert({
    challenge_id: challengeId,
    submission_id: submissionId,
    voter_id: user.id,
  });

  if (error) {
    // 23505 = unique_violation (already voted)
    if (error.code === "23505") {
      return { ok: false, error: "already_voted" };
    }
    return { ok: false, error: "unknown" };
  }

  revalidatePath(`/challenges/${slug}/gallery`);
  return { ok: true };
}
