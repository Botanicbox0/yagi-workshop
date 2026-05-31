import {
  ChevronRight,
  Coins,
  Search,
  Share2,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

type HowItWorksVariant = "brand" | "creator";

const STEP_ICONS = {
  brand: [Upload, Sparkles, Share2],
  creator: [Search, Wand2, Coins],
} satisfies Record<HowItWorksVariant, typeof Upload[]>;

export async function CampaignHowItWorks({
  variant,
}: {
  variant: HowItWorksVariant;
}) {
  const t = await getTranslations("campaigns_app.how_it_works");
  const stepKey = variant === "creator" ? "creator_steps" : "brand_steps";

  const steps = [0, 1, 2].map((index) => ({
    number: String(index + 1),
    title: t(`${stepKey}.${index + 1}.title`),
    description: t(`${stepKey}.${index + 1}.description`),
    Icon: STEP_ICONS[variant][index],
  }));

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-foreground keep-all">
        {t("title")}
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map(({ number, title, description, Icon }, index) => (
          <div key={number} className="relative">
            <article className="h-full rounded-lg border border-border/70 bg-surface-card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gold-soft px-2 text-xs font-semibold tabular-nums text-gold">
                  {number}
                </span>
                <Icon className="h-4 w-4 text-gold" aria-hidden="true" />
              </div>
              <h4 className="mt-4 text-sm font-medium text-foreground keep-all">
                {title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-muted-foreground keep-all">
                {description}
              </p>
            </article>
            {index < steps.length - 1 && (
              <ChevronRight
                className="pointer-events-none absolute right-[-18px] top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground/60 sm:block"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
