import { getTranslations } from "next-intl/server";
import { Pencil, Users, MessageSquare, CheckCheck } from "lucide-react";

// Phase 2.9 G_B9_E + Phase 2.9 hotfix-2 Task 3 — workflow strip on
// /app/projects. Yagi reference (isomeet.com): no horizontal rule
// between sections, soft layered shadow on cards instead of hard
// border, section header demoted to a small uppercase eyebrow so it
// reads as a magazine label rather than a heavy SaaS section title.

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
    <section className="pt-16 lg:pt-20">
      <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-8">
        {t("hero_workflow_label")}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {STEPS.map(({ i, Icon }) => (
          <div
            key={i}
            className="rounded-2xl bg-card p-6 lg:p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]"
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
