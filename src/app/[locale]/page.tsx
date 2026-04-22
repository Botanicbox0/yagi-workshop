import { HeroBlock } from "@/components/home/hero-block";
import { ServicesTriad } from "@/components/home/services-triad";
import { ApproachBlock } from "@/components/home/approach-block";
import { SelectedWork } from "@/components/home/selected-work";
import { JournalPreview } from "@/components/home/journal-preview";
import { ContactBlock } from "@/components/home/contact-block";
import { SiteFooter } from "@/components/home/site-footer";
import { WorkSection } from "@/components/marketing/work-section";

// Re-validate landing at most every 5min so we don't hammer Supabase Storage
// for signed cover URLs on every request.
export const revalidate = 300;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale: rawLocale } = await params;
  const locale: "ko" | "en" = rawLocale === "en" ? "en" : "ko";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <HeroBlock />
      <ServicesTriad />
      <ApproachBlock />
      <SelectedWork locale={locale} />
      <WorkSection locale={locale} />
      <JournalPreview locale={locale} />
      <ContactBlock />
      <SiteFooter locale={locale} pathname="/" />
    </main>
  );
}
