"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { TwinCard } from "@/components/twins/twin-card";
import { LOGIN_SHOWCASE_CATEGORIES } from "@/lib/landing/showcase";
import { cn } from "@/lib/utils";

const CARD_TILTS = [-8, -1, 7] as const;

export function LoginShowcase() {
  const t = useTranslations("auth.login_showcase");
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % LOGIN_SHOWCASE_CATEGORIES.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const activeCategory = LOGIN_SHOWCASE_CATEGORIES[activeIndex];
  const activeCards = useMemo(() => activeCategory.cards, [activeCategory]);

  return (
    <aside
      className="hidden min-h-[720px] overflow-hidden rounded-2xl border border-border/70 bg-surface p-8 lg:block"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-reduced-motion={reduceMotion ? "true" : "false"}
    >
      <div className="flex h-full flex-col justify-between gap-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-label text-gold">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 max-w-md text-3xl font-bold leading-tight text-foreground keep-all">
            {t("title")}
          </h2>
        </div>

        <div className="relative mx-auto h-[430px] w-full max-w-[560px]">
          {activeCards.map((card, index) => (
            <div
              key={`${activeCategory.key}-${card.image}-${index}`}
              className={cn(
                "absolute top-8 w-[240px] transition duration-flora ease-flora",
                index === 0 && "left-0 z-10",
                index === 1 && "left-1/2 z-20 -translate-x-1/2 translate-y-10",
                index === 2 && "right-0 z-10 translate-y-2",
              )}
            >
              <TwinCard
                name={card.name}
                personaType={card.personaType}
                coverUrl={card.image}
                label={t(`categories.${card.labelKey}`)}
                tone={activeCategory.tone}
                tilt={CARD_TILTS[index]}
                priority={index === 1}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {LOGIN_SHOWCASE_CATEGORIES.map((category, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={category.key}
                type="button"
                onClick={() => {
                  setPaused(true);
                  setActiveIndex(index);
                }}
                className={cn(
                  "h-10 rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-gold-soft text-gold"
                    : "text-muted-foreground hover:bg-surface-card hover:text-foreground",
                )}
                aria-pressed={active}
              >
                {t(`categories.${category.key}`)}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
