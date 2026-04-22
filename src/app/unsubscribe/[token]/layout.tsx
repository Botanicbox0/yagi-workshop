import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { fraunces, inter } from "../../fonts";
import "../../globals.css";
import { resolveUnsubscribeLocale } from "./resolve-locale";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Phase 1.8 subtask 05 — locale-free layout for the email unsubscribe page.
 *
 * The page must work for users who aren't signed in, so locale is derived
 * from the token → profiles.locale lookup (falling back to Accept-Language
 * then ko) inside the helper.
 */
export default async function UnsubscribeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const locale = await resolveUnsubscribeLocale(token);

  const messages = (
    (await import(`../../../../messages/${locale}.json`)) as {
      default: Record<string, unknown>;
    }
  ).default;

  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable}`}
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
