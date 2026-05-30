"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LOGIN_SHOWCASE_CATEGORIES } from "@/lib/landing/showcase";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 5000;

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
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [paused, reduceMotion]);

  const activeCategory = LOGIN_SHOWCASE_CATEGORIES[activeIndex];

  return (
    <aside
      className="relative hidden min-h-[720px] overflow-hidden rounded-2xl border border-border/70 bg-surface lg:block"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-active-key={activeCategory.key}
      data-reduced-motion={reduceMotion ? "true" : "false"}
      data-paused={paused ? "true" : "false"}
    >
      {LOGIN_SHOWCASE_CATEGORIES.map((category, index) => (
        <Image
          key={category.key}
          src={category.image}
          alt=""
          fill
          sizes="(max-width: 1024px) 0px, 58vw"
          className={cn(
            "object-cover transition-opacity duration-700 ease-flora will-change-transform",
            index === activeIndex
              ? "opacity-100"
              : "scale-100 opacity-0",
            index === activeIndex && !reduceMotion && "signin-showcase-kenburns",
          )}
          style={{ animationPlayState: paused ? "paused" : "running" }}
          priority={index === 0}
        />
      ))}

      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background/60 via-background/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background/85 via-background/35 to-transparent" />

      <div className="absolute left-8 top-8 h-20 w-[min(420px,calc(100%-4rem))]">
        {LOGIN_SHOWCASE_CATEGORIES.map((category, index) => (
          <div
            key={`label-${category.key}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-flora",
              index === activeIndex ? "opacity-100" : "opacity-0",
            )}
          >
            <p className="text-lg font-medium leading-none text-foreground keep-all">
              {t(`categories.${category.labelKey}`)}
            </p>
            <p className="mt-3 text-sm leading-5 text-foreground/70 keep-all">
              {t(`descriptions.${category.labelKey}`)}
            </p>
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-5 p-8 text-center">
        <p className="max-w-xl text-2xl font-medium leading-tight text-foreground keep-all">
          {t("caption")}
        </p>
        <div className="flex items-center justify-center gap-2">
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
                  "relative h-2 w-8 overflow-hidden rounded-full transition-colors",
                  active ? "bg-gold/35" : "bg-foreground/30",
                )}
                aria-label={t(`categories.${category.labelKey}`)}
                aria-pressed={active}
                data-active={active ? "true" : "false"}
              >
                <span
                  key={`${category.key}-${activeIndex}-${paused}-${reduceMotion}`}
                  className={cn(
                    "absolute inset-y-0 left-0 w-full origin-left rounded-full bg-gold",
                    active
                      ? "scale-x-100 opacity-100"
                      : "scale-x-0 opacity-0",
                    active && !paused && !reduceMotion && "signin-showcase-progress",
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
