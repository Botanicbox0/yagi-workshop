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
        {/* Phase 4.x Wave C.5b sub_00 — defaultTheme="dark" so next-themes
            adds .dark on hydration. enableSystem dropped: editorial dark is
            the universal canvas; .light is opt-in for special contexts. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
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
