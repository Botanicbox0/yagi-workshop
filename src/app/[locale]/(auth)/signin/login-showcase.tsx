"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { LOGIN_SHOWCASE_CATEGORIES } from "@/lib/landing/showcase";
import { cn } from "@/lib/utils";

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

  return (
    <aside
      className="relative hidden min-h-[720px] overflow-hidden rounded-2xl border border-border/70 bg-surface lg:block"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      data-active-key={activeCategory.key}
      data-reduced-motion={reduceMotion ? "true" : "false"}
    >
      {LOGIN_SHOWCASE_CATEGORIES.map((category, index) => (
        <Image
          key={category.key}
          src={category.image}
          alt=""
          fill
          sizes="(max-width: 1024px) 0px, 58vw"
          className={cn(
            "object-cover transition-opacity duration-700 ease-flora",
            index === activeIndex ? "opacity-100" : "opacity-0",
          )}
          priority={index === 0}
        />
      ))}

      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/35 to-background/5" />
      <div className="absolute inset-x-0 bottom-0 space-y-6 p-8">
        <p className="max-w-xl text-2xl font-medium leading-tight text-foreground keep-all">
          {t("caption")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
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
                    : "text-foreground/70 hover:bg-surface-card hover:text-foreground",
                )}
                aria-pressed={active}
                data-active={active ? "true" : "false"}
              >
                {t(`categories.${category.labelKey}`)}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
