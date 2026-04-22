import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { resolveShowcaseLocale } from "./resolve-locale";

/**
 * Phase 1.9 Wave C subtask 04 — 404 for unknown or unpublished slugs.
 *
 * Rendered when `notFound()` is called from `page.tsx`. Uses the same
 * locale-free layout (supplied by the sibling layout.tsx).
 */
export default async function ShowcaseNotFound() {
  const locale = await resolveShowcaseLocale();
  const t = await getTranslations({ locale, namespace: "showcase" });

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-12 bg-white text-black">
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
  );
}
