import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { fraunces, inter } from "../../fonts";
import "../../globals.css";
import { resolveShowcaseLocale } from "./resolve-locale";

/**
 * Phase 1.9 Wave C subtask 04 — 404 for unknown or unpublished slugs.
 *
 * Phase 2.0 G6 #L5 — Next 15.5 has a bug where a dynamic segment's
 * not-found.tsx is NOT wrapped by the sibling layout.tsx; instead it
 * renders directly under the root `src/app/layout.tsx`, which is a pure
 * passthrough (`return children`). Without intermediate html/body, Next
 * throws "Missing `<html>` and `<body>` tags in root layout" at runtime
 * on every miss (/showcase/does-not-exist).
 *
 * Workaround: provide a self-contained html/body shell here, mirroring
 * the sibling layout.tsx. When we upgrade to Next ≥ 15.6 (which restores
 * proper layout nesting for not-found), delete the html/body here and
 * this component goes back to being just a <main> block.
 */
export default async function ShowcaseNotFound() {
  const locale = await resolveShowcaseLocale();
  const t = await getTranslations({ locale, namespace: "showcase" });

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
        <main className="min-h-dvh flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-6 text-center">
            <h1 className="font-[family-name:var(--font-fraunces)] text-3xl italic font-semibold keep-all">
              {t("viewer_not_found_title")}
            </h1>
            <p className="text-sm text-neutral-600 keep-all">
              {t("viewer_not_found_body")}
            </p>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-black px-6 py-2 text-xs uppercase tracking-[0.14em] hover:bg-black hover:text-white transition-colors"
            >
              {t("viewer_not_found_link")}
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
