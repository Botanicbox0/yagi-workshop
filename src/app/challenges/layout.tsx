import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { inter } from "../fonts";
import "../globals.css";
import { PublicChrome } from "@/components/challenges/public-chrome";

/**
 * Locale-free layout for the public challenges surface.
 * Not nested under /[locale] — challenges is a public brand surface.
 * next-intl is seeded with ko (Korean-only per SPEC §0).
 */
export default async function ChallengesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = (
    (await import("../../../messages/ko.json")) as {
      default: Record<string, unknown>;
    }
  ).default;

  return (
    <html lang="ko" className={inter.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider locale="ko" messages={messages}>
          <PublicChrome>{children}</PublicChrome>
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
