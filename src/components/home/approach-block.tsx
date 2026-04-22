import { getTranslations } from "next-intl/server";
import { renderTitleWithEmphasis } from "@/components/home/title-emphasis";

export async function ApproachBlock() {
  const t = await getTranslations("home");

  return (
    <section
      aria-labelledby="approach-title"
      className="border-t border-black/5 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex items-baseline gap-4 mb-12 md:mb-16">
          <span className="label-caps text-muted-foreground/70 tabular-nums">
            03 — Approach
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2
              id="approach-title"
              className="font-display keep-all text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]"
            >
              {renderTitleWithEmphasis(
                t("approach_title"),
                t("approach_title_emphasis"),
              )}
            </h2>
          </div>

          <div className="lg:col-span-7 lg:col-start-6 space-y-8 md:space-y-10">
            <p className="keep-all text-base md:text-lg leading-[1.8] text-foreground/80 max-w-2xl">
              {t("approach_p1")}
            </p>
            <p className="keep-all text-base md:text-lg leading-[1.8] text-foreground/80 max-w-2xl">
              {t("approach_p2")}
            </p>
            <p className="keep-all text-base md:text-lg leading-[1.8] text-foreground/80 max-w-2xl">
              {t("approach_p3")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
