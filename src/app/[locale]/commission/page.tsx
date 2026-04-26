import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/home/site-footer";
import { createSupabaseServer } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const isKr = locale === "ko";
  return {
    title: isKr
      ? "AI VFX 의뢰 — YAGI Workshop"
      : "AI VFX Commission — YAGI Workshop",
    description: isKr
      ? "엔터 레이블, 광고 에이전시, 아티스트를 위한 AI VFX 플랫폼. 뮤직비디오, 광고, 티저까지 의뢰부터 납품까지."
      : "An AI VFX platform for music labels, agencies, and artists. From music videos to commercials and teasers — commission to delivery.",
  };
}

const CATEGORIES_KO = [
  {
    title: "Music Video",
    desc: "메인 비주얼, 부분 VFX, 풀 컴퓨팅 시퀀스",
  },
  {
    title: "Commercial",
    desc: "광고 캠페인 비주얼, 제품 launch, 캠페인 컷",
  },
  {
    title: "Teaser",
    desc: "신곡 발매 티저, 컴백 영상, 짧은 시그니처 컷",
  },
  {
    title: "Lyric Video",
    desc: "가사 영상, 타이포그래피 모션, 무드 비주얼",
  },
];

const PROCESS_STEPS_KO = [
  {
    n: "01",
    title: "Brief",
    desc: "프로젝트 의도, 예산, 일정을 5분 안에 작성합니다.",
  },
  {
    n: "02",
    title: "Quote",
    desc: "야기가 직접 검토하고 1-2 영업일 내에 견적을 답변드립니다.",
  },
  {
    n: "03",
    title: "Create",
    desc: "협의된 일정에 따라 AI VFX 작업이 진행됩니다.",
  },
  {
    n: "04",
    title: "Deliver",
    desc: "결과물을 납품하고, 1회 무료 수정을 보장합니다.",
  },
];

const BUDGET_REFERENCE_KO = [
  { label: "Lyric Video / Social", range: "500–1,500만원" },
  { label: "Music Video (부분)", range: "1,500–3,000만원" },
  { label: "Commercial / Full MV", range: "3,000만원–1억원" },
  { label: "Enterprise Campaign", range: "1억원+" },
];

export default async function CommissionLandingPage({ params }: Props) {
  const { locale } = await params;
  const isKr = locale === "ko";

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Phase 2.8.1 G_B1-H (F-PUX-003): preserve commission intent across the
  // signup → email-confirm hop. Anonymous visitors land on signup with a
  // `next` param pointing back at /app/commission/new; the auth callback
  // honors it after the email link round-trip.
  const ctaHref = user
    ? `/${locale}/app/commission/new`
    : `/${locale}/signup?next=${encodeURIComponent(`/${locale}/app/commission/new`)}`;

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-32 md:py-44">
          <p className="label-caps text-muted-foreground/70 mb-8">
            {isKr ? "01 — Commission" : "01 — Commission"}
          </p>
          <h1 className="font-display tracking-tight leading-[1.0] text-[clamp(3rem,8vw,7rem)] keep-all">
            {isKr ? (
              <>
                <em>음악비디오</em>,<br />
                AI로 다시 태어나다.
              </>
            ) : (
              <>
                Your music video,
                <br />
                <em>re-imagined</em>.
              </>
            )}
          </h1>
          <p className="text-lg md:text-xl text-foreground/65 max-w-2xl mt-10 keep-all">
            {isKr
              ? "엔터 레이블, 광고 에이전시, 아티스트를 위한 AI 비주얼 이펙트 플랫폼. 의뢰 작성에서 납품까지 야기가 직접 책임집니다."
              : "AI visual effects, made for music labels, agencies, and artists. From brief to delivery — handled personally."}
          </p>
          {/* Phase 2.8.1 G_B1-H (F-PUX-002): challenge "Browse challenges"
              CTA removed — Workshop and Contest are separate products
              (DECISIONS_CACHE Q-085). The hero now keeps a single primary
              CTA so the commission intake intent stays focused. */}
          <div className="mt-12 flex flex-col sm:flex-row gap-3">
            <Button asChild size="lg" className="text-base">
              <Link href={ctaHref}>
                {isKr ? "지금 의뢰 작성하기 →" : "Submit a commission →"}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="mb-16 max-w-3xl">
            <p className="label-caps text-muted-foreground/70 mb-6">
              {isKr ? "02 — Process" : "02 — Process"}
            </p>
            <h2 className="font-display tracking-tight leading-[1.05] text-4xl md:text-6xl keep-all">
              {isKr ? (
                <>
                  4단계로 끝나는,
                  <br />
                  <em>투명한</em> 프로세스.
                </>
              ) : (
                <>
                  Four steps. <em>Transparent</em> end-to-end.
                </>
              )}
            </h2>
          </div>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-x-8 gap-y-12">
            {PROCESS_STEPS_KO.map((step) => (
              <li key={step.n} className="space-y-3">
                <p className="label-caps text-muted-foreground/60 tabular-nums">
                  {step.n}
                </p>
                <h3 className="font-display text-2xl tracking-tight">
                  <em>{step.title}</em>
                </h3>
                <p className="text-sm text-foreground/65 keep-all leading-relaxed">
                  {step.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="mb-16 max-w-3xl">
            <p className="label-caps text-muted-foreground/70 mb-6">
              {isKr ? "03 — Categories" : "03 — Categories"}
            </p>
            <h2 className="font-display tracking-tight leading-[1.05] text-4xl md:text-6xl keep-all">
              {isKr ? (
                <>
                  무엇을 만들까요?
                </>
              ) : (
                <>What can we make?</>
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {CATEGORIES_KO.map((cat, i) => (
              <article
                key={cat.title}
                className="border border-black/10 rounded-lg p-8 md:p-10 hover:border-foreground transition-colors group"
              >
                <p className="label-caps text-muted-foreground/60 tabular-nums mb-3">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="font-display text-3xl md:text-4xl tracking-tight mb-3 group-hover:italic transition-all">
                  {cat.title}
                </h3>
                <p className="text-sm text-foreground/65 keep-all">
                  {cat.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing transparency */}
      <section className="border-b border-black/10">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-24 md:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-start">
            <div>
              <p className="label-caps text-muted-foreground/70 mb-6">
                {isKr ? "04 — Budget" : "04 — Budget"}
              </p>
              <h2 className="font-display tracking-tight leading-[1.05] text-4xl md:text-6xl keep-all">
                {isKr ? (
                  <>
                    <em>예산</em>은
                    <br />
                    협의 가능합니다.
                  </>
                ) : (
                  <>
                    <em>Budget</em>
                    <br />
                    is negotiable.
                  </>
                )}
              </h2>
              <p className="mt-8 text-base text-foreground/65 keep-all leading-relaxed max-w-md">
                {isKr
                  ? "프로젝트 규모와 복잡도에 맞춰 견적을 산정합니다. 아래는 카테고리별 참고 범위이며, 실제 견적은 브리프 검토 후 제시됩니다."
                  : "We size every quote to project scope and complexity. The ranges below are reference points; the real quote follows a brief review."}
              </p>
            </div>
            <div className="border-t border-black/10">
              {BUDGET_REFERENCE_KO.map((row) => (
                <div
                  key={row.label}
                  className="border-b border-black/10 py-5 flex items-baseline justify-between gap-4"
                >
                  <span className="text-sm md:text-base">{row.label}</span>
                  <span className="font-display tracking-tight text-lg md:text-xl tabular-nums text-foreground/80">
                    {row.range}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-b border-black/10 bg-foreground text-background">
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-32 md:py-44 text-center">
          <h2 className="font-display tracking-tight leading-[1.0] text-[clamp(2.5rem,7vw,6rem)] max-w-4xl mx-auto keep-all">
            {isKr ? (
              <>
                지금
                <br />
                <em className="opacity-70">의뢰 작성하기</em>.
              </>
            ) : (
              <>
                Submit
                <br />
                <em className="opacity-70">your commission</em>.
              </>
            )}
          </h2>
          <p className="text-base md:text-lg text-background/60 max-w-xl mx-auto mt-10 keep-all">
            {isKr
              ? "5분이면 충분합니다. 야기가 1-2 영업일 내에 직접 답변드립니다."
              : "Five minutes is enough. YAGI responds within 1–2 business days."}
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 text-base"
            >
              <Link href={ctaHref}>
                {isKr ? "의뢰 작성하기 →" : "Submit a commission →"}
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-base text-background/70 hover:text-background hover:bg-background/10"
            >
              <a href="mailto:hello@yagiworkshop.xyz">
                {isKr ? "또는 이메일 문의" : "Or email us"}
              </a>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter locale={locale === "en" ? "en" : "ko"} pathname="/commission" />
    </main>
  );
}
