import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { fraunces, inter } from "../fonts";
import { PublicChromeHeader } from "@/components/app/public-chrome-header";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio.yagiworkshop.xyz",
  ),
  title: "YAGI Workshop",
  description: "AI creative production studio for fashion & beauty brands.",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound();

  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body>
        {/* Phase 4.x Wave C.5b sub_00 ROLLBACK (2026-05-01) — yagi visual
            review verdict: dark editorial reads as too heavy. Restored
            to defaultTheme="light" + enableSystem (Phase 2.7.1 P12).
            v1.0 design tokens (sage accent, ink hierarchy, radius,
            Pretendard) live on at light-bg-adapted values in
            globals.css; only the dark canvas itself is reversed. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <PublicChromeHeader />
            {children}
            <Toaster position="top-center" />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
