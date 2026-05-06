import { notFound } from "next/navigation";
import { getChallengeBySlug } from "@/lib/challenges/queries";
import { createSupabaseServer } from "@/lib/supabase/server";
import { SubmissionJudgeCard } from "./submission-judge-card";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function JudgePage({ params }: Props) {
  const { slug } = await params;

  const challenge = await getChallengeBySlug(slug);
  if (!challenge) notFound();

  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [submissionsRes, judgmentsRes] = await Promise.all([
    supabase
      .from("challenge_submissions")
      .select("id, submitter_id, content, created_at")
      .eq("challenge_id", challenge.id)
      .eq("status", "ready")
      .order("created_at", { ascending: true }),
    user
      ? supabase
          .from("challenge_judgments")
          .select("submission_id, score, notes")
          .eq("challenge_id", challenge.id)
          .eq("admin_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const submissions = submissionsRes.data ?? [];

  type JudgmentRow = { submission_id: string; score: number | null; notes: string | null };
  const judgmentMap = new Map<string, JudgmentRow>(
    ((judgmentsRes as { data: JudgmentRow[] | null }).data ?? []).map(
      (j) => [j.submission_id, j],
    ),
  );

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <h1 className="font-semibold tracking-display-ko text-2xl font-semibold text-foreground">
          심사 — {challenge.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          작품 {submissions.length}개 · 점수 0–10 (0.5 단위)
        </p>
      </div>

      {submissions.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          심사할 작품이 없어요.
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((s) => {
            const existing = judgmentMap.get(s.id);
            return (
              <SubmissionJudgeCard
                key={s.id}
                challengeId={challenge.id}
                submissionId={s.id}
                slug={slug}
                submitterId={s.submitter_id}
                content={s.content as Record<string, unknown>}
                initialScore={existing?.score ?? null}
                initialNotes={existing?.notes ?? ""}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
