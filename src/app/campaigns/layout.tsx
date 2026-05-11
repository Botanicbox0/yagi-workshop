import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { headers } from "next/headers";
import { inter } from "../fonts";
import "../globals.css";

// Wave C v2 HIGH-9: locale-free layout for /campaigns/* public surface.
// Root layout is a pass-through (returns children only), so each locale-free
// public route must wrap <html>/<body> + NextIntlClientProvider itself.
// Mirrors src/app/showcase/[slug]/layout.tsx (dynamic locale) and
// src/app/challenges/layout.tsx (provider wrap + Toaster).
function detectLocale(acceptLanguage: string): "ko" | "en" {
  return acceptLanguage.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export default async function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerList = await headers();
  const locale = detectLocale(headerList.get("accept-language") ?? "");

  const messages = (
    (await import(`../../../messages/${locale}.json`)) as {
      default: Record<string, unknown>;
    }
  ).default;

  return (
    <html lang={locale} className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
