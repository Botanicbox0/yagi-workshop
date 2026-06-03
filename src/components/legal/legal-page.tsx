import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { CompanyLegalFooter } from "@/components/legal/company-legal-footer";

export type LegalPageKind = "terms" | "privacy" | "refund";

type LegalSection = {
  title: string;
  body?: string[];
  list?: string[];
};

type Props = {
  locale: string;
  page: LegalPageKind;
};

export async function buildLegalMetadata({
  locale,
  page,
}: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: `legal.pages.${page}` });
  return {
    title: `${t("title")} — YAGI Workshop`,
    description: t("description"),
    alternates: {
      canonical: `/${locale}/legal/${page}`,
      languages: {
        ko: `/ko/legal/${page}`,
        en: `/en/legal/${page}`,
        "x-default": `/ko/legal/${page}`,
      },
    },
  };
}

export async function LegalPage({ locale, page }: Props) {
  const t = await getTranslations({ locale, namespace: `legal.pages.${page}` });
  const common = await getTranslations({ locale, namespace: "legal.pages.common" });
  const sections = t.raw("sections") as LegalSection[];

  return (
    <main className="min-h-dvh">
      <article className="mx-auto w-full max-w-4xl px-6 py-24 md:px-8 md:py-32">
        <header className="border-b border-border/70 pb-10">
          <p className="label-caps mb-4 text-brand">{common("eyebrow")}</p>
          <h1 className="font-display text-4xl leading-tight tracking-normal text-foreground md:text-6xl keep-all">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base keep-all">
            {t("description")}
          </p>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {common("effective_label")} {t("effective_date")}
            </span>
            <span className="tabular-nums">
              {common("updated_label")} {t("updated_at")}
            </span>
          </div>
          <p className="mt-6 rounded-lg border border-border/70 bg-surface-card p-4 text-sm leading-6 text-muted-foreground keep-all">
            {common("review_note")}
          </p>
        </header>

        <div className="space-y-10 py-12">
          {sections.map((section, index) => (
            <section key={`${section.title}-${index}`} className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground keep-all">
                {section.title}
              </h2>
              {section.body?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-7 text-muted-foreground md:text-base keep-all"
                >
                  {paragraph}
                </p>
              ))}
              {section.list ? (
                <ul className="space-y-2 text-sm leading-7 text-muted-foreground md:text-base">
                  {section.list.map((item) => (
                    <li key={item} className="flex gap-3 keep-all">
                      <span className="mt-3 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <nav
          aria-label={common("related_aria_label")}
          className="flex flex-wrap gap-3 border-t border-border/70 py-8"
        >
          <LegalLink href="/legal/terms" active={page === "terms"}>
            {common("terms")}
          </LegalLink>
          <LegalLink href="/legal/privacy" active={page === "privacy"}>
            {common("privacy")}
          </LegalLink>
          <LegalLink href="/legal/refund" active={page === "refund"}>
            {common("refund")}
          </LegalLink>
        </nav>

        <CompanyLegalFooter />
      </article>
    </main>
  );
}

function LegalLink({
  href,
  active,
  children,
}: {
  href: "/legal/terms" | "/legal/privacy" | "/legal/refund";
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className="rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-card hover:text-foreground aria-[current=page]:bg-surface-card aria-[current=page]:text-foreground"
    >
      {children}
    </Link>
  );
}
