import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/home/site-footer";
import { HeaderCtaResolver } from "./header-cta-resolver";

export async function PublicChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="YAGI Workshop 홈">
              <Image
                src="/assets/logo/yagi-symbol.png"
                alt="YAGI 심볼"
                width={32}
                height={32}
                priority
              />
            </Link>
            <span className="font-semibold tracking-display-ko italic text-sm">챌린지</span>
          </div>
          <HeaderCtaResolver />
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <SiteFooter locale="ko" pathname="/challenges" />
    </div>
  );
}
