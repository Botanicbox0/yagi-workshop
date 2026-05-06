import { Inter } from "next/font/google";
import localFont from "next/font/local";

// Wave C v2 HIGH-6: Fraunces removed (legacy 1.0.6 serif display, replaced
// by Pretendard 600 per yagi-design-system v1.0 정본). The deferred Cat B
// editorial surfaces still consume the `font-display` Tailwind token, which
// now falls back to Pretendard via tailwind.config.ts.

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Phase 2.9 G_B9_C — SUIT Variable for Korean headlines on projects
// hub + future product surfaces. Self-hosted from public/fonts/.
export const suit = localFont({
  src: "../../public/fonts/SUIT-Variable.woff2",
  variable: "--font-suit",
  display: "swap",
  weight: "100 900",
});
