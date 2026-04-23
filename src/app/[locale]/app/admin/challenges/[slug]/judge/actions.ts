"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Result = { ok: true } | { ok: false; error: string };

async function isYagiAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase.rpc("is_yagi_admin", { uid: userId });
  return Boolean(data);
}

export async function submitJudgmentAction(
  challengeId: string,
  submissionId: string,
  slug: string,
  score: number,
  notes: string,
): Promise<Result> {
  if (
    typeof challengeId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(challengeId) ||
    typeof submissionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(submissionId)
  ) {
    return { ok: false, error: "invalid_input" };
  }

  if (typeof score !== "number" || score < 0 || score > 10) {
    return { ok: false, error: "score_out_of_range" };
  }

  const normalizedNotes = typeof notes === "string" ? notes.trim() : "";

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "unauthorized" };
  if (!(await isYagiAdmin(supabase, user.id))) {
    return { ok: false, error: "forbidden" };
  }

  // Verify challenge is in a judgeable state.
  const { data: challenge } = await supabase
    .from("challenges")
    .select("state")
    .eq("id", challengeId)
    .maybeSingle();

  if (!challenge) return { ok: false, error: "challenge_not_found" };
  if (
    challenge.state !== "open" &&
    challenge.state !== "closed_judging"
  ) {
    return { ok: false, error: "challenge_not_judgeable" };
  }

  // UPSERT — unique constraint is (submission_id, admin_id).
  const { error } = await supabase
    .from("challenge_judgments")
    .upsert(
      {
        challenge_id: challengeId,
        submission_id: submissionId,
        admin_id: user.id,
        score,
        notes: normalizedNotes || null,
      },
      { onConflict: "submission_id,admin_id" },
    );

  if (error) {
    console.error("[judge] upsert judgment", error.message);
    return { ok: false, error: "upsert_failed" };
  }

  revalidatePath(`/app/admin/challenges/${slug}/judge`);
  return { ok: true };
}
