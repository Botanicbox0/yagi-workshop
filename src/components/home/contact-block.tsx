import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function ContactBlock() {
  const t = await getTranslations("home");

  return (
    <section
      id="contact"
      aria-labelledby="contact-title"
      className="border-t border-black/5 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="flex items-baseline gap-4 mb-12 md:mb-16">
          <span className="label-caps text-muted-foreground/70 tabular-nums">
            06 — Contact
          </span>
        </div>

        <div className="mb-16 md:mb-20">
          <Button
            asChild
            size="lg"
            className="rounded-full px-8 h-12 text-sm tracking-tight"
          >
            <a href="mailto:hello@yagiworkshop.xyz">{t("contact_cta")} →</a>
          </Button>
        </div>

        <h2
          id="contact-title"
          className="font-display keep-all text-[clamp(2.25rem,6.5vw,5rem)] tracking-tight leading-[1.05] max-w-5xl"
        >
          <span className="block text-foreground/90">
            {t("contact_headline_1")}
          </span>
          <span className="block">
            <em>{t("contact_headline_2_emphasis")}</em>
          </span>
        </h2>

        <div className="mt-20 md:mt-24 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-black/10">
          <div className="flex flex-col gap-3 py-8 md:py-10 md:pr-8 border-b md:border-b-0 md:border-r border-black/10">
            <span className="label-caps text-muted-foreground/60 tabular-nums">
              {t("contact_label_email")}
            </span>
            <a
              href="mailto:hello@yagiworkshop.xyz"
              className="text-base md:text-lg tabular-nums underline-offset-4 hover:underline"
            >
              hello@yagiworkshop.xyz
            </a>
          </div>
          <div className="flex flex-col gap-3 py-8 md:py-10 md:px-8 border-b md:border-b-0 md:border-r border-black/10">
            <span className="label-caps text-muted-foreground/60 tabular-nums">
              {t("contact_label_studio")}
            </span>
            <span className="keep-all text-base md:text-lg tabular-nums">
              {t("contact_value_studio")}
            </span>
          </div>
          <div className="flex flex-col gap-3 py-8 md:py-10 md:pl-8">
            <span className="label-caps text-muted-foreground/60 tabular-nums">
              {t("contact_label_hours")}
            </span>
            <span className="keep-all text-base md:text-lg tabular-nums">
              {t("contact_value_hours")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
