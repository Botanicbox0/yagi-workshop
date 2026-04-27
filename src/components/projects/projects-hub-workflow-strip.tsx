import { getTranslations } from "next-intl/server";
import { Pencil, Users, MessageSquare, CheckCheck } from "lucide-react";

// Phase 2.9 G_B9_E — workflow strip on /app/projects.
// 4 cards: 의뢰 작성 / 디렉터 매칭 / 기획·피드백 / 납품·완료.
// Hairline border, no shadow. SUIT bold for `01..04` and titles.

type Props = { locale: string };

const STEPS = [
  { i: 1, Icon: Pencil },
  { i: 2, Icon: Users },
  { i: 3, Icon: MessageSquare },
  { i: 4, Icon: CheckCheck },
] as const;

export async function ProjectsHubWorkflowStrip({ locale }: Props) {
  const t = await getTranslations({ locale, namespace: "projects" });

  return (
    <section className="border-t border-border/60 py-16 lg:py-20 mt-12">
      <h2 className="font-suit text-2xl lg:text-[28px] font-bold tracking-[-0.01em] mb-10 lg:mb-12">
        {t("hero_workflow_label")}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {STEPS.map(({ i, Icon }) => (
          <div
            key={i}
            className="rounded-2xl border border-border/60 p-6 lg:p-8 bg-card"
          >
            <Icon className="w-5 h-5 text-foreground mb-6" />
            <p className="font-suit text-sm font-bold tabular-nums tracking-tight text-foreground">
              {String(i).padStart(2, "0")}
            </p>
            <h3 className="font-suit text-base lg:text-lg font-bold mt-2 mb-3 tracking-tight keep-all">
              {t(`hero_step_${i}_title` as "hero_step_1_title")}
            </h3>
            <p className="text-[13px] text-muted-foreground leading-relaxed keep-all">
              {t(`hero_step_${i}_body` as "hero_step_1_body")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
