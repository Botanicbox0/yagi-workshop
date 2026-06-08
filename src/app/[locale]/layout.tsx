import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import { inter } from "../fonts";
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
    <html lang={locale} suppressHydrationWarning className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body>
        {/* Design System v1.2 (2026-05-28, PRODUCT-MASTER §AO) — Dark Brand
            UI is now the main canvas. defaultTheme="dark", system preference
            disabled so the brand dark palette is the consistent default.
            `.light` remains an opt-in secondary palette in globals.css. */}
        <ThemeProvider attribute="class" defaultTheme="dark">
          <NextIntlClientProvider messages={messages}>
            <PublicChromeHeader />
            {children}
            <Analytics />
            <Toaster position="top-center" />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
