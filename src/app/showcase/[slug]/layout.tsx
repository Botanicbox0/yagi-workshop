import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { fraunces, inter } from "../../fonts";
import "../../globals.css";
import { resolveShowcaseLocale } from "./resolve-locale";

/**
 * Phase 1.9 Wave C subtask 04 — locale-free layout for the public showcase
 * viewer. This route is not nested under `/[locale]` because the URL is a
 * public brand surface; locale is derived from Accept-Language.
 *
 * Sonner Toaster is provided so the password prompt client component can
 * surface invalid-password feedback.
 *
 * `metadata.robots` is intentionally omitted here — the page itself declares
 * indexability via `generateMetadata` so published showcases are indexable
 * while unpublished slugs 404 (no noindex fallthrough).
 */
export default async function ShowcaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await resolveShowcaseLocale();

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
      <body className="bg-white text-black antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
