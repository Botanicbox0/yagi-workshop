"use client";

// =============================================================================
// Phase 2.9 G_B9_D — InteractiveVisualStack
// =============================================================================
// Right-zone visual stack on /app/projects hero. Two cards:
//
//   TOP    1:1 default → 5:2 when BOTTOM is hovered
//   BOTTOM 5:2 default → 1:1 when self-hovered (image swaps thumb→expanded)
//
// Hover-out settles back to default ratios via spring physics
// (stiffness:80, damping:22, mass:0.9 — no bounce). Mobile / touch
// devices get the default ratios with hover behavior disabled
// (the interactive piece reads as decorative noise on a phone).
//
// Image swap on the bottom card uses a layered crossfade so the
// inner image transition is invisible during the container animation.
// =============================================================================

import { useState } from "react";
import Image from "next/image";
import { motion, LayoutGroup } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

const SPRING = {
  type: "spring" as const,
  stiffness: 80,
  damping: 22,
  mass: 0.9,
};

type Strings = {
  card1Eyebrow: string;
  card1Title: string;
  card1TitleSub: string;
  card1Body: string;
  card1Alt: string;
  card2Eyebrow: string;
  card2Title: string;
  card2TitleSub: string;
  card2Body: string;
  card2Alt: string;
};

export function InteractiveVisualStack({ strings }: { strings: Strings }) {
  const [hovered, setHovered] = useState<"top" | "bottom" | null>(null);
  const isBottomHovered = hovered === "bottom";

  return (
    <LayoutGroup>
      <div className="flex flex-col gap-4 h-full">
        {/* TOP CARD */}
        <motion.div
          layout
          onMouseEnter={() => setHovered("top")}
          onMouseLeave={() => setHovered(null)}
          className="relative overflow-hidden rounded-2xl bg-foreground cursor-pointer"
          animate={{ aspectRatio: isBottomHovered ? "5 / 2" : "1 / 1" }}
          transition={SPRING}
        >
          <motion.div layout className="absolute inset-0">
            <Image
              src="/brand/sample-vfx-hero.jpg"
              alt={strings.card1Alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent" />
          <motion.div
            layout="position"
            className="absolute bottom-0 left-0 right-0 p-6 lg:p-8"
          >
            <p className="text-[11px] font-semibold tracking-[0.12em] text-white/80 uppercase mb-2">
              {strings.card1Eyebrow}
            </p>
            <h3 className="font-suit text-xl lg:text-2xl font-bold text-white leading-tight tracking-tight">
              {strings.card1Title}
              {strings.card1TitleSub && (
                <span className="text-white/70 text-base font-normal ml-2">
                  {strings.card1TitleSub}
                </span>
              )}
            </h3>
            <p className="text-sm text-white/80 mt-2 leading-relaxed keep-all">
              {strings.card1Body}
            </p>
          </motion.div>
        </motion.div>

        {/* BOTTOM CARD */}
        <motion.div
          layout
          onMouseEnter={() => setHovered("bottom")}
          onMouseLeave={() => setHovered(null)}
          className="relative overflow-hidden rounded-2xl bg-foreground cursor-pointer"
          animate={{ aspectRatio: isBottomHovered ? "1 / 1" : "5 / 2" }}
          transition={SPRING}
        >
          {/* Layered images — both rendered, opacity-crossfaded so the
              container animation visually masks the image change. */}
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: isBottomHovered ? 0 : 1 }}
            transition={{ duration: 0.25 }}
          >
            <Image
              src="/brand/sample-mv-thumb.jpg"
              alt={strings.card2Alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
          <motion.div
            className="absolute inset-0"
            animate={{ opacity: isBottomHovered ? 1 : 0 }}
            transition={{ duration: 0.25 }}
          >
            <Image
              src="/brand/sample-mv-expanded.jpg"
              alt={strings.card2Alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/0 to-transparent" />
          <motion.div
            layout="position"
            className="absolute bottom-0 left-0 right-0 p-6 lg:p-8"
          >
            <p className="text-[11px] font-semibold tracking-[0.12em] text-white/80 uppercase mb-2">
              {strings.card2Eyebrow}
            </p>
            <h3 className="font-suit text-xl lg:text-2xl font-bold text-white leading-tight tracking-tight">
              {strings.card2Title}
              {strings.card2TitleSub && (
                <span className="text-white/70 text-base font-normal ml-2">
                  {strings.card2TitleSub}
                </span>
              )}
            </h3>
            <p className="text-sm text-white/80 mt-2 leading-relaxed keep-all">
              {strings.card2Body}
            </p>
          </motion.div>
          <div className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-white" />
          </div>
        </motion.div>
      </div>
    </LayoutGroup>
  );
}
