import Link from "next/link";
import { Button } from "@/components/ui/button";

type Props = {
  locale: "ko" | "en";
};

export function CommissionCtaBlock({ locale }: Props) {
  const isKr = locale === "ko";
  return (
    <section className="border-t border-black/5 py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-end">
          <div>
            <span className="label-caps text-muted-foreground/70 tabular-nums">
              {isKr ? "06 — Commission" : "06 — Commission"}
            </span>
            <h2 className="font-display tracking-tight leading-[1.05] text-4xl md:text-5xl lg:text-6xl mt-6 keep-all">
              {isKr ? (
                <>
                  <em>AI VFX 의뢰</em>,
                  <br />
                  의뢰부터 납품까지.
                </>
              ) : (
                <>
                  <em>AI VFX commission</em>,
                  <br />
                  brief to delivery.
                </>
              )}
            </h2>
            <p className="text-base md:text-lg text-foreground/65 mt-8 max-w-md keep-all leading-relaxed">
              {isKr
                ? "엔터 레이블, 광고 에이전시, 아티스트를 위한 AI 비주얼 이펙트 플랫폼. 야기가 직접 검토하고 1-2 영업일 내에 답변드립니다."
                : "An AI VFX platform for music labels, agencies, and artists. YAGI reviews each brief personally and responds within 1-2 business days."}
            </p>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            {/* Phase 2.8.2 G_B2_F — /commission funnel collapsed into
                the public landing (this page). The CTA now points
                directly into the signup → onboarding → /app/projects
                flow, which is the real conversion path. */}
            <Button asChild size="lg" className="text-base">
              <Link href={`/${locale}/signup`}>
                {isKr ? "프로젝트 의뢰하기 →" : "Request a project →"}
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground keep-all md:text-right max-w-xs">
              {isKr
                ? "뮤직비디오 · 광고 · 티저 · 가사영상 · 캠페인 비주얼"
                : "Music video · Commercial · Teaser · Lyric video · Campaign"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
