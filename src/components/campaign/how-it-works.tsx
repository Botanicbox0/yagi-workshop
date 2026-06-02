import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Coins,
  FileUp,
  Heart,
  ImageIcon,
  Link2,
  MessageCircle,
  Music,
  Search,
  Send,
  Share2,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Wand2,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

type HowItWorksVariant = "brand" | "artist" | "creator";
type MockupComponent = ComponentType;

type StepVisual = {
  eyebrow: string;
  headline: {
    beforeKey: string;
    accentKey: string;
    afterKey: string;
  };
  Mockup: MockupComponent;
};

const STEP_VISUALS = {
  brand: [
    {
      eyebrow: "START",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: BrandUploadMock,
    },
    {
      eyebrow: "VARIATIONS",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: BrandGridMock,
    },
    {
      eyebrow: "REACH",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: BrandFeedMock,
    },
  ],
  artist: [
    {
      eyebrow: "OPEN",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: ArtistMusicMock,
    },
    {
      eyebrow: "REMIX",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: ArtistRemixMock,
    },
    {
      eyebrow: "FANDOM",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: ArtistReachMock,
    },
  ],
  creator: [
    {
      eyebrow: "DISCOVER",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: CreatorCampaignListMock,
    },
    {
      eyebrow: "CREATE",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: CreatorCreateMock,
    },
    {
      eyebrow: "REWARD",
      headline: {
        beforeKey: "before",
        accentKey: "accent",
        afterKey: "after",
      },
      Mockup: CreatorRewardMock,
    },
  ],
} satisfies Record<HowItWorksVariant, StepVisual[]>;

export async function CampaignHowItWorks({
  variant,
  workspaceName,
}: {
  variant: HowItWorksVariant;
  workspaceName?: string;
}) {
  const t = await getTranslations("campaigns_app.how_it_works");
  const locale = await getLocale();
  const stepKey =
    variant === "creator"
      ? "creator_steps"
      : variant === "artist"
        ? "artist_steps"
        : "brand_steps";
  const trimmedWorkspaceName = workspaceName?.trim();
  const fallbackBrandLabel =
    locale === "ko"
      ? variant === "artist"
        ? "내 곡·IP"
        : "우리 브랜드"
      : variant === "artist"
        ? "my song or IP"
        : "our brand";
  const brandLabel =
    trimmedWorkspaceName && trimmedWorkspaceName.length > 0
      ? trimmedWorkspaceName
      : fallbackBrandLabel;

  const steps = STEP_VISUALS[variant].map((visual, index) => ({
    ...visual,
    number: String(index + 1).padStart(2, "0"),
    title: t(`${stepKey}.${index + 1}.title`),
    headline: {
      before: t(`${stepKey}.${index + 1}.headline.${visual.headline.beforeKey}`),
      accent: t(`${stepKey}.${index + 1}.headline.${visual.headline.accentKey}`),
      after: t(`${stepKey}.${index + 1}.headline.${visual.headline.afterKey}`),
    },
    description: t(`${stepKey}.${index + 1}.description`, {
      brand: brandLabel,
    }),
  }));

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-foreground keep-all">
          {t("title")}
        </h3>
        <div
          className="hidden h-px flex-1 bg-gradient-to-r from-border/80 to-transparent sm:block"
          aria-hidden="true"
        />
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <article
            key={step.number}
            className="overflow-hidden rounded-xl border border-border/70 bg-surface-raised"
          >
            <div
              className={[
                "grid gap-6 p-5 sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:p-8",
                index === 1 ? "lg:[&>*:first-child]:order-2" : "",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-gold-soft px-2 text-xs font-semibold tabular-nums text-gold">
                    {step.number}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-label text-muted-foreground">
                    {step.eyebrow}
                  </span>
                </div>
                <p className="mt-6 text-xs font-semibold uppercase tracking-label text-gold">
                  {step.title}
                </p>
                <h4 className="mt-3 max-w-xl text-2xl font-medium leading-tight text-muted-foreground keep-all sm:text-3xl">
                  {step.headline.before}
                  <span className="font-semibold text-foreground">
                    {step.headline.accent}
                  </span>
                  {step.headline.after}
                </h4>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground keep-all sm:text-base sm:leading-7">
                  {step.description}
                </p>
              </div>

              <div className="min-w-0">
                <step.Mockup />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MockShell({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/70 bg-surface-card-deep p-3 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(250,210,4,0.13),transparent_38%)]"
        aria-hidden="true"
      />
      <div className="relative rounded-lg border border-border/70 bg-surface-card p-4">
        <div className="mb-4 flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2 w-2 rounded-full bg-gold/70" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
            <span className="h-2 w-2 rounded-full bg-muted-foreground/25" />
          </div>
          <span className="text-[11px] font-medium uppercase tracking-label text-muted-foreground">
            {label}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function BrandUploadMock() {
  return (
    <MockShell label="Campaign setup">
      <div className="rounded-lg border border-dashed border-gold/35 bg-gold/5 p-5 text-center">
        <Upload className="mx-auto h-6 w-6 text-gold" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground">소재 업로드</p>
        <p className="mt-1 text-xs text-muted-foreground">
          파일, 링크, 참고 채널을 한곳에
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["곡", "제품", "IP"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-border/70 bg-surface-raised px-3 py-1 text-xs text-foreground"
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <MockRow icon={FileUp} label="master-track.wav" value="ready" />
        <MockRow icon={Link2} label="reference channel" value="linked" />
      </div>
    </MockShell>
  );
}

function BrandGridMock() {
  const handles = ["@minji.ai", "@rio.visual", "@yuna.cut", "@neo.mov"];

  return (
    <MockShell label="Creative versions">
      <div className="grid grid-cols-2 gap-3">
        {handles.map((handle, index) => (
          <div
            key={handle}
            className="overflow-hidden rounded-lg border border-border/70 bg-surface-raised"
          >
            <div
              className={[
                "aspect-[4/3] bg-gradient-to-br",
                index % 2 === 0
                  ? "from-gold/20 via-surface-card to-muted-foreground/10"
                  : "from-muted-foreground/20 via-surface-card to-gold/10",
              ].join(" ")}
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-xs font-medium text-foreground">
                {handle}
              </span>
              <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
            </div>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function BrandFeedMock() {
  return (
    <MockShell label="Creator channel">
      <div className="mx-auto max-w-[280px] rounded-xl border border-border/70 bg-surface-raised p-3">
        <div className="flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-gradient-to-br from-gold/30 to-muted-foreground/20" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-foreground">@creator.studio</p>
            <p className="text-[11px] text-muted-foreground">new campaign post</p>
          </div>
        </div>
        <div className="mt-3 aspect-square rounded-lg bg-gradient-to-br from-surface-card-deep via-muted-foreground/10 to-gold/20" />
        <div className="mt-3 flex items-center gap-3 text-muted-foreground">
          <Heart className="h-4 w-4" aria-hidden="true" />
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
          <Send className="h-4 w-4" aria-hidden="true" />
        </div>
        <div className="mt-3 space-y-1.5">
          <SkeletonBar className="w-4/5" />
          <SkeletonBar className="w-2/3" />
        </div>
      </div>
    </MockShell>
  );
}

function ArtistMusicMock() {
  return (
    <MockShell label="Artist brief">
      <div className="rounded-lg border border-dashed border-gold/35 bg-gold/5 p-5 text-center">
        <Music className="mx-auto h-6 w-6 text-gold" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-foreground">신곡 / IP</p>
        <p className="mt-1 text-xs text-muted-foreground">
          콘셉트와 상금을 함께 설정
        </p>
      </div>
      <div className="mt-4 space-y-2">
        <MockRow icon={Music} label="new-single.wav" value="ready" />
        <MockRow icon={Wand2} label="visual direction" value="set" />
      </div>
    </MockShell>
  );
}

function ArtistRemixMock() {
  const versions = ["MV cut", "fan edit", "character loop", "shorts"];

  return (
    <MockShell label="Creator reinterpretations">
      <div className="grid grid-cols-2 gap-3">
        {versions.map((version) => (
          <div
            key={version}
            className="rounded-lg border border-border/70 bg-surface-raised p-3"
          >
            <Wand2 className="h-4 w-4 text-gold" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">{version}</p>
            <SkeletonBar className="mt-2 w-3/4" />
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function ArtistReachMock() {
  return (
    <MockShell label="Fan reach">
      <div className="rounded-xl border border-border/70 bg-surface-raised p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-soft text-gold">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              여러 채널로 확산
            </p>
            <p className="text-xs text-muted-foreground">팬 콘텐츠 흐름 생성</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {["TikTok", "Shorts", "IG"].map((channel) => (
            <span
              key={channel}
              className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-center text-[11px] text-gold"
            >
              {channel}
            </span>
          ))}
        </div>
      </div>
    </MockShell>
  );
}

function CreatorCampaignListMock() {
  const campaigns: Array<[string, string, LucideIcon]> = [
    ["New single launch", "모집 중", Search],
    ["Beauty IP remix", "보상 확인", Share2],
    ["Music video cutdown", "마감 임박", TrendingUp],
  ];

  return (
    <MockShell label="Open campaigns">
      <div className="space-y-3">
        {campaigns.map(([title, status, Icon]) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface-raised p-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10 text-gold">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {title}
              </p>
              <p className="text-xs text-muted-foreground">AI content campaign</p>
            </div>
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[11px] text-gold">
              {status}
            </span>
          </div>
        ))}
      </div>
    </MockShell>
  );
}

function CreatorCreateMock() {
  return (
    <MockShell label="Submit content">
      <div className="grid gap-3 sm:grid-cols-[0.9fr_1.1fr]">
        <div className="flex aspect-square items-center justify-center rounded-lg border border-border/70 bg-gradient-to-br from-surface-card-deep to-muted-foreground/10">
          <ImageIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-surface-raised p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-foreground">
              <Wand2 className="h-4 w-4 text-gold" aria-hidden="true" />
              내 스타일 프롬프트
            </div>
            <div className="mt-3 space-y-1.5">
              <SkeletonBar className="w-full" />
              <SkeletonBar className="w-3/4" />
            </div>
          </div>
          <div className="rounded-lg border border-dashed border-gold/35 bg-gold/5 p-3 text-xs text-muted-foreground">
            결과물 업로드 준비 완료
          </div>
        </div>
      </div>
    </MockShell>
  );
}

function CreatorRewardMock() {
  return (
    <MockShell label="Reward update">
      <div className="rounded-xl border border-gold/30 bg-gold/10 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-gold-on">
            <Coins className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              보상 지급 완료
            </p>
            <p className="text-xs text-muted-foreground">선정 콘텐츠 배포 완료</p>
          </div>
        </div>
        <div className="mt-5 rounded-lg border border-border/70 bg-surface-card p-4">
          <p className="text-[11px] uppercase tracking-label text-muted-foreground">
            Reward
          </p>
          <p className="mt-1 text-2xl font-semibold text-foreground">
            ₩450,000
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <MiniMetric label="Views" value="128K" />
        <MiniMetric label="Shares" value="3.2K" />
      </div>
    </MockShell>
  );
}

function MockRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-surface-raised px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">
        {label}
      </span>
      <span className="text-[11px] uppercase tracking-label text-gold">
        {value}
      </span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-surface-raised p-3">
      <p className="text-[11px] uppercase tracking-label text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function SkeletonBar({ className }: { className: string }) {
  return (
    <span
      className={["block h-2 rounded-full bg-muted-foreground/20", className].join(
        " ",
      )}
    />
  );
}
