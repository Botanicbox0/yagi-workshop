import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ArrowUpRight, ArrowRight, MessageSquare, Users } from "lucide-react";
import { InteractiveVisualStack } from "./interactive-visual-stack";

// Phase 2.9 G_B9_D — editorial hero on /app/projects empty state.
//
// LEFT zone — informational. PROJECT eyebrow → 3-line SUIT headline →
// sub copy → 3 bullets with 32px circle icons (mono, no color) → CTA
// pill + avatar stack social proof.
//
// RIGHT zone — emotional. <InteractiveVisualStack/> client component
// with framer-motion spring transitions between 1:1 and 5:2 ratios.
//
// Design signature (DECISIONS_CACHE Q-092 spec extracted from yagi
// reference): asymmetric weight, hairline borders, 0 accent color,
// editorial labels, photography-as-content, black CTA pills.

type Props = { locale: string };

export async function ProjectsHubHero({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "projects" });

  return (
    // Phase 2.9 hotfix-2 Task 3.1 — sits directly under the page
    // header with shared horizontal rhythm; vertical padding tightened
    // from py-16/24 (64-96px) to py-8/12 (32-48px) so the page-header
    // → hero transition reads as one editorial scroll, not two stacked
    // sections.
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 py-8 lg:py-12">
      {/* LEFT — Decision zone */}
      <div className="flex flex-col gap-8">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
          {t("hero_meta_eyebrow")}
        </p>

        <h1 className="font-suit text-4xl md:text-5xl lg:text-[56px] leading-[1.1] tracking-[-0.02em] font-bold text-foreground whitespace-pre-line keep-all">
          {t("hero_title")}
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed keep-all">
          {t("hero_sub")}
        </p>

        <ul className="flex flex-col gap-4 mt-2">
          {(
            [
              { i: 1, Icon: ArrowRight },
              { i: 2, Icon: MessageSquare },
              { i: 3, Icon: Users },
            ] as const
          ).map(({ i, Icon }) => (
            <li key={i} className="flex items-center gap-3">
              <span
                aria-hidden
                className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center flex-shrink-0"
              >
                <Icon className="w-4 h-4 text-background" />
              </span>
              <span className="text-[15px] font-medium text-foreground keep-all">
                {t(`hero_value_${i}_title` as "hero_value_1_title")}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-5 mt-2">
          <Link
            href="/app/projects/new"
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-full bg-foreground text-background text-[15px] font-semibold w-fit hover:scale-[1.02] transition-transform"
          >
            {t("hero_cta")}
            <ArrowUpRight className="w-4 h-4" />
          </Link>

          <div className="flex items-center gap-4">
            <AvatarStack />
            <p className="text-sm ink-tertiary leading-body keep-all">
              {t("hero_social_proof")}
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT — visual stack */}
      <InteractiveVisualStack
        strings={{
          card1Eyebrow: t("hero_sample_1_eyebrow"),
          card1Title: t("hero_sample_1_title"),
          card1TitleSub: t("hero_sample_1_title_sub"),
          card1Body: t("hero_sample_1_sub"),
          card1Alt: t("hero_sample_1_title"),
          card2Eyebrow: t("hero_sample_2_eyebrow"),
          card2Title: t("hero_sample_2_title"),
          card2TitleSub: t("hero_sample_2_title_sub"),
          card2Body: t("hero_sample_2_sub"),
          card2Alt: t("hero_sample_2_title"),
        }}
      />
    </section>
  );
}

// Phase 4.x Wave C.5b sub_12 — placeholder cluster on v1.0 dark editorial.
// 4 circles at 40px, ~10px overlap, bg-card-deep (rgba(255,255,255,0.05))
// with a near-invisible white border-subtle ring. The ring-2 ring-background
// from the Phase 2.9 placeholder is dropped — on dark, ring=bg and the ring
// just disappears anyway. Followup FU-C5b-03 tracks the Phase 7+ swap to
// real client brand marks once yagi has the public-disclosure consents.
const PLACEHOLDER_COUNT = 4;

function AvatarStack() {
  return (
    <div className="flex">
      {Array.from({ length: PLACEHOLDER_COUNT }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={`h-10 w-10 rounded-full bg-card-deep border border-subtle ${i === 0 ? "" : "-ml-2.5"}`}
          style={{ zIndex: PLACEHOLDER_COUNT - i }}
        />
      ))}
    </div>
  );
}
