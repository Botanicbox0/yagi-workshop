import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { COMPANY } from "@/lib/config/company";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  compact?: boolean;
};

export async function CompanyLegalFooter({
  className,
  compact = false,
}: Props) {
  const t = await getTranslations("legal.footer");
  const phone = COMPANY.phone ?? t("placeholder_phone");
  const mailOrderNo = COMPANY.mailOrderNo ?? t("placeholder_mail_order");

  const businessRows = [
    [
      {
        label: t("label_company"),
        value: `${COMPANY.legalNameKo} / ${COMPANY.legalNameEn}`,
      },
      { label: t("label_representative"), value: COMPANY.representative },
      { label: t("label_biz_reg_no"), value: COMPANY.bizRegNo, numeric: true },
    ],
    [
      { label: t("label_address"), value: COMPANY.addressKo },
      { label: t("label_phone"), value: phone, numeric: true },
    ],
    [
      { label: t("label_mail_order"), value: mailOrderNo, numeric: true },
      { label: t("label_email"), value: COMPANY.email, numeric: true },
      { label: t("label_hosting"), value: COMPANY.hostingProvider, numeric: true },
    ],
    [
      { label: t("label_biz_type"), value: COMPANY.bizType },
      { label: t("label_biz_item"), value: COMPANY.bizItem },
    ],
  ];

  return (
    <section
      aria-labelledby="company-legal-footer-title"
      className={cn(
        "border-t border-border/70 text-muted-foreground",
        compact ? "py-8" : "py-10 md:py-12",
        className,
      )}
    >
      <h2 id="company-legal-footer-title" className="sr-only">
        {t("aria_label")}
      </h2>
      <div className="space-y-6">
        <nav
          aria-label={t("links_aria_label")}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm"
        >
          <Link
            href="/legal/terms"
            className="keep-all underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("link_terms")}
          </Link>
          <Link
            href="/legal/privacy"
            className="keep-all underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("link_privacy")}
          </Link>
          <Link
            href="/legal/refund"
            className="keep-all underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {t("link_refund")}
          </Link>
        </nav>

        <div className="space-y-2 text-xs leading-6">
          {businessRows.map((row, index) => (
            <p
              key={index}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 keep-all"
            >
              {row.map((item) => (
                <span key={`${item.label}-${item.value}`} className="inline-flex gap-1.5">
                  <span className="label-caps text-muted-foreground/70">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "text-muted-foreground",
                      item.numeric && "tabular-nums",
                    )}
                  >
                    {item.value}
                  </span>
                </span>
              ))}
            </p>
          ))}
        </div>

        <p className="label-caps tabular-nums text-muted-foreground/70">
          {t("copyright", { year: new Date().getFullYear() })}
        </p>
      </div>
    </section>
  );
}
