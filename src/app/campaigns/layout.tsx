import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "sonner";
import { fraunces, inter } from "../fonts";
import "../globals.css";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";

/**
 * Locale-free layout for the public campaigns surface.
 * Not nested under /[locale] — campaigns is a public brand surface.
 * next-intl is seeded with ko (Korean-only default per SPEC).
 */
export default async function CampaignsLayout({
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
          <div className="min-h-dvh flex flex-col bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border bg-background">
              <div className="max-w-7xl mx-auto px-6 md:px-8 h-14 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Link href="/" aria-label="YAGI Workshop 홈">
                    <Image
                      src="/assets/logo/yagi-symbol.png"
                      alt="YAGI 심볼"
                      width={32}
                      height={32}
                      priority
                    />
                  </Link>
                  <span className="font-display italic text-sm">캠페인</span>
                </div>
                <Link
                  href="/auth/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  로그인
                </Link>
              </div>
            </header>

            <main className="flex-1">{children}</main>

            <SiteFooter locale="ko" pathname="/campaigns" />
          </div>
          <Toaster position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
