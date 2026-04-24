import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getChallengesList } from "@/lib/challenges/queries";
import { ChallengeListSection } from "@/components/challenges/challenge-list-section";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "지금 가장 주목받는 AI 챌린지 · YAGI",
  description: "AI 창작자가 작품을 올리고 인정받는 퍼블릭 무대 — YAGI 챌린지에서 지금 진행 중인 챌린지에 참여하세요.",
  robots: { index: true },
};

export default async function ChallengesListPage() {
  const t = await getTranslations("challenges.list");
  const { open, announced, archived } = await getChallengesList();

  const allEmpty = open.length === 0 && announced.length === 0 && archived.length === 0;

  if (allEmpty) {
    return (
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16">
        <h1 className="font-display italic text-3xl md:text-4xl mb-12 word-break-keep-all">
          {t("headline")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("empty_all")}</p>
      </div>
    );
  }

  const archivedSliced = archived.slice(0, 12);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 space-y-12">
      {/* Headline */}
      <h1 className="font-display italic text-3xl md:text-4xl word-break-keep-all">
        {t("headline")}
      </h1>

      {/* 진행 중 */}
      {open.length > 0 && (
        <section aria-label={t("sections.open")}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            {t("sections.open")}
          </h2>
          <ChallengeListSection section="open" challenges={open} />
        </section>
      )}

      {/* 결과 발표 */}
      {announced.length > 0 && (
        <section aria-label={t("sections.announced")}>
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
            {t("sections.announced")}
          </h2>
          <ChallengeListSection section="announced" challenges={announced} />
        </section>
      )}

      {/* 지난 챌린지 — collapsed by default */}
      {archivedSliced.length > 0 && (
        <section aria-label={t("sections.archived")}>
          <details>
            <summary className="cursor-pointer list-none">
              <h2 className="inline text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                {t("sections.archived")} ({archived.length})
              </h2>
            </summary>
            <div className="mt-4">
              <ChallengeListSection section="archived" challenges={archivedSliced} />
              {archived.length > 12 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  최근 12개를 표시합니다.
                </p>
              )}
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
