import { Fraunces, Inter } from "next/font/google";
import localFont from "next/font/local";

export const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  display: "swap",
});

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Phase 2.9 G_B9_C — SUIT Variable for Korean headlines on projects
// hub + future product surfaces. Self-hosted from public/fonts/. Kept
// separate from Fraunces (--font-fraunces) which still drives the
// landing's English-headline display style — landing is rebuilt later
// (kickoff §13 #1) and yagi wants visual continuity there.
export const suit = localFont({
  src: "../../public/fonts/SUIT-Variable.woff2",
  variable: "--font-suit",
  display: "swap",
  weight: "100 900",
});
