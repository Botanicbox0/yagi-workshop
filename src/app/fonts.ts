import { Inter } from "next/font/google";

// Wave C v2 HIGH-6: Fraunces removed (legacy 1.0.6 serif display, replaced
// by Pretendard 600 per yagi-design-system v1.0 정본). The deferred Cat B
// editorial surfaces still consume the `font-display` Tailwind token, which
// now falls back to Pretendard via tailwind.config.ts.

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
