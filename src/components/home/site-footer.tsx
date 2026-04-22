import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

type Props = {
  locale: "ko" | "en";
  pathname: string;
};

export async function SiteFooter({ locale, pathname }: Props) {
  const t = await getTranslations("home");

  const otherLocale = locale === "ko" ? "en" : "ko";
  const otherLocaleLabel = locale === "ko" ? "EN" : "KO";

  // Normalize pathname (routing Link expects the locale-free path).
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

  // Phase 2.0 G4 #7 (Phase 1.6 M4) — journal articles have locale-specific
  // slugs and no guaranteed cross-locale twin, so point the locale toggle at
  // the journal index instead of the current slug to avoid a 404.
  const isJournalArticle = /^\/journal\/./.test(normalizedPath);
  const toggleHref = isJournalArticle ? "/journal" : normalizedPath;

  return (
    <footer
      aria-labelledby="site-footer-title"
      className="border-t border-black/10"
    >
      <h2 id="site-footer-title" className="sr-only">
        {t("footer_aria_label")}
      </h2>

      <div className="max-w-7xl mx-auto px-6 md:px-8 py-16 md:py-20">
        {/* Row A — wordmark + tagline */}
        <div className="flex flex-col md:flex-row md:items-baseline md:justify-between gap-4 pb-12 md:pb-16 border-b border-black/5">
          <div className="label-caps tabular-nums tracking-[0.2em] text-foreground text-sm">
            YAGI WORKSHOP
          </div>
          <div className="font-display italic keep-all text-muted-foreground text-sm md:text-base">
            <em>{t("footer_tagline")}</em>
          </div>
        </div>

        {/* Row B — two-column link / info grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 py-12 md:py-16">
          <div className="flex flex-col gap-4">
            <span className="label-caps text-muted-foreground/60 tabular-nums">
              {t("footer_sitemap_label")}
            </span>
            <ul className="flex flex-col gap-2 text-base">
              <li>
                <Link
                  href="/"
                  className="keep-all underline-offset-4 hover:underline"
                >
                  {t("footer_link_home")}
                </Link>
              </li>
              <li>
                <Link
                  href="/journal"
                  className="keep-all underline-offset-4 hover:underline"
                >
                  {t("footer_link_journal")}
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@yagiworkshop.xyz"
                  className="keep-all underline-offset-4 hover:underline"
                >
                  {t("footer_link_contact")}
                </a>
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-4">
            <span className="label-caps text-muted-foreground/60 tabular-nums">
              {t("footer_studio_label")}
            </span>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="mailto:hello@yagiworkshop.xyz"
                  className="tabular-nums underline-offset-4 hover:underline hover:text-foreground"
                >
                  hello@yagiworkshop.xyz
                </a>
              </li>
              <li className="keep-all tabular-nums">
                {t("contact_value_studio")}
              </li>
              <li className="keep-all tabular-nums">
                {t("contact_value_hours")}
              </li>
            </ul>
          </div>
        </div>

        {/* Row C — copyright + locale toggle */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-8 border-t border-black/5">
          <p className="label-caps text-muted-foreground/70 tabular-nums">
            {t("footer_rights")}
          </p>
          <Link
            href={toggleHref}
            locale={otherLocale}
            className="label-caps tabular-nums underline-offset-4 hover:underline"
          >
            {otherLocaleLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
}
