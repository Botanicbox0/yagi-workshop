import { getTranslations } from "next-intl/server";

type Service = {
  ordinal: string;
  titleKey:
    | "service_aitwin_title"
    | "service_branding_title"
    | "service_content_title";
  descKey:
    | "service_aitwin_desc"
    | "service_branding_desc"
    | "service_content_desc";
};

const SERVICES: Service[] = [
  { ordinal: "01", titleKey: "service_aitwin_title", descKey: "service_aitwin_desc" },
  { ordinal: "02", titleKey: "service_branding_title", descKey: "service_branding_desc" },
  { ordinal: "03", titleKey: "service_content_title", descKey: "service_content_desc" },
];

export async function ServicesTriad() {
  const t = await getTranslations("home");

  return (
    <section
      aria-labelledby="what-title"
      className="border-t border-black/10 py-24 md:py-32"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="mb-16 md:mb-24 max-w-3xl">
          <div className="flex items-baseline gap-4 mb-6">
            <span className="label-caps text-muted-foreground/70 tabular-nums">
              02 — Practice
            </span>
          </div>
          <h2
            id="what-title"
            className="font-display keep-all text-4xl md:text-5xl lg:text-6xl tracking-tight leading-[1.05]"
          >
            <em>{t("what_title")}</em>
          </h2>
          <p className="keep-all mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            {t("what_intro")}
          </p>
        </div>

        {/* TODO subtask 04: example deliverable thumbnails (2 per column)
            — depends on journal cover imagery */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-black/10">
          {SERVICES.map((s, i) => (
            <article
              key={s.ordinal}
              className={[
                "flex flex-col gap-6 py-12 md:py-16 px-0 md:px-8 first:md:pl-0 last:md:pr-0",
                i < SERVICES.length - 1
                  ? "border-b md:border-b-0 md:border-r border-black/10"
                  : "",
              ].join(" ")}
            >
              <div className="flex items-baseline gap-3">
                <span className="label-caps text-muted-foreground/60 tabular-nums">
                  {s.ordinal}
                </span>
                <span
                  aria-hidden
                  className="text-muted-foreground/40 tabular-nums"
                >
                  ·
                </span>
                <h3 className="font-display text-2xl md:text-[1.75rem] tracking-tight leading-snug">
                  {t(s.titleKey)}
                </h3>
              </div>
              <p className="keep-all text-base text-muted-foreground leading-relaxed max-w-sm">
                {t(s.descKey)}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
