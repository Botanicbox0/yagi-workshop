import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { fraunces, inter } from "../fonts";
import "../globals.css";

export default async function ProfileLayout({
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
    <html lang="ko" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider locale="ko" messages={messages}>
          {children}
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
