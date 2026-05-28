import { getTranslations } from "next-intl/server";
import { Images, LayoutTemplate, Shirt, Sparkles } from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const CARDS = [
  { key: "model", Icon: Shirt },
  { key: "lookbook", Icon: Images },
  { key: "layout", Icon: LayoutTemplate },
  { key: "campaign", Icon: Sparkles },
] as const;

export default async function AmericanoPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app_placeholders.americano" });

  return (
    <section className="py-10">
      <div className="max-w-3xl">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-brand">
          {t("eyebrow")}
        </p>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl keep-all">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
          {t("description")}
        </p>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        {CARDS.map(({ key, Icon }) => (
          <article
            key={key}
            className="rounded-lg border border-border bg-surface-raised p-5"
          >
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t("status")}
            </p>
            <h2 className="mt-3 text-lg font-semibold text-foreground keep-all">
              {t(`cards.${key}.title`)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
              {t(`cards.${key}.description`)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
