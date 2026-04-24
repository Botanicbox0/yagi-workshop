import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseServer } from "@/lib/supabase/server";

export type SubmissionRow =
  Database["public"]["Tables"]["challenge_submissions"]["Row"];

/**
 * Returns the current user's prior submission to the given challenge, if any.
 * Used by the submit page to render "already-submitted" branch instead of form.
 * Auth check: if no user, returns null (caller decides how to handle).
 */
export async function getExistingSubmission(
  challengeId: string,
  userId: string
): Promise<SubmissionRow | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("challenge_submissions")
    .select("*")
    .eq("challenge_id", challengeId)
    .eq("submitter_id", userId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Type inferred from buildSubmissionSchema's output — used by server actions
 * to type-guard the post-validation content payload.
 */
export type ValidatedSubmission = {
  text_description: string;
  native_video?: {
    objectKey: string;
    poster_url?: string;
    duration_sec?: number;
  };
  youtube_url?: string;
  images?: { objectKey: string }[];
  pdf?: { objectKey: string };
};
