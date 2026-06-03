// 표준 템플릿 기반 초안 — 시행 전 법무 검토 권장
import {
  buildLegalMetadata,
  LegalPage,
} from "@/components/legal/legal-page";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return buildLegalMetadata({ locale, page: "privacy" });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  return <LegalPage locale={locale} page="privacy" />;
}
