import Link from "next/link";
import { fraunces, inter } from "../../fonts";
import "../../globals.css";

/**
 * Next 15.5 bug workaround: a dynamic segment's not-found.tsx is NOT wrapped
 * by its sibling layout.tsx — it renders directly under the root layout which
 * is a passthrough. Self-contained html/body shell required.
 * Remove html/body here when upgrading to Next ≥ 15.6.
 */
export default function ProfileNotFound() {
  return (
    <html lang="ko" className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.css"
        />
      </head>
      <body className="bg-background text-foreground antialiased">
        <main className="min-h-dvh flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-6 text-center">
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl italic font-semibold keep-all">
              @handle을 찾을 수 없어요
            </h1>
            <p className="text-sm text-muted-foreground keep-all">
              존재하지 않거나 삭제된 프로필입니다.
            </p>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-foreground px-6 py-2 text-xs uppercase tracking-[0.14em] hover:bg-foreground hover:text-background transition-colors"
            >
              YAGI 홈
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
