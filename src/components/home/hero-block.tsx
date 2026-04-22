import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function HeroBlock() {
  const t = await getTranslations("home");

  return (
    <section
      aria-labelledby="hero-headline"
      className="relative min-h-screen flex flex-col justify-center px-6 md:px-12 lg:px-16 py-40"
    >
      {/* Editorial vertical hairline — 1/3 from left, desktop only */}
      <div
        aria-hidden
        className="hidden lg:block pointer-events-none absolute inset-y-0 left-1/3 w-px bg-black/10"
      />

      <div className="relative mx-auto w-full max-w-6xl">
        {/* Eyebrow: a small tabular marker in the corner, editorial flavor */}
        <div className="flex items-baseline justify-between mb-16 md:mb-24">
          <span className="label-caps text-muted-foreground/70 tabular-nums">
            01 — Studio
          </span>
          <span className="label-caps text-muted-foreground/70 tabular-nums hidden md:inline">
            Seoul / 2026
          </span>
        </div>

        <h1
          id="hero-headline"
          className="font-display keep-all text-[clamp(2.5rem,8vw,6rem)] leading-[1.02] tracking-tight max-w-5xl"
        >
          <span className="block text-foreground/90">{t("hero_line_1")}</span>
          <span className="block">
            <em className="italic">{t("hero_line_2_emphasis")}</em>{" "}
            <span className="text-foreground/90">{t("hero_line_3")}</span>
          </span>
        </h1>

        <div className="mt-16 md:mt-24 flex items-center gap-6">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 h-12 text-sm tracking-tight"
          >
            <a href="#contact">{t("hero_cta")} →</a>
          </Button>
          <span
            aria-hidden
            className="hidden md:block h-px w-24 bg-black/20"
          />
          <span className="hidden md:inline label-caps text-muted-foreground/70 tabular-nums">
            hello@yagiworkshop.xyz
          </span>
        </div>
      </div>
    </section>
  );
}
