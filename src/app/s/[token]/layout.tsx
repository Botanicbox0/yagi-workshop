import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { headers } from "next/headers";
import { Toaster } from "sonner";
import { inter } from "../../fonts";
import "../../globals.css";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Minimal layout for the public /s/[token] share page.
 *
 * - No auth, no locale prefix in the URL
 * - Locale is detected from Accept-Language header (ko default)
 * - Does NOT link to the authenticated app (walled island)
 * - Provides Sonner toast container for Client Components
 */
export default async function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const accept = headersList.get("accept-language") ?? "";
  const locale = accept.toLowerCase().startsWith("ko") ? "ko" : "en";

  // Load messages for the locale so next-intl Client Components work
  // (FastFeedbackBar, CommentForm, ApproveButton, RevisionCompare all use useTranslations)
  const messages = (
    (await import(`../../../../messages/${locale}.json`)) as {
      default: Record<string, unknown>;
    }
  ).default;

  return (
    <html
      lang={locale}
      className={inter.variable}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
