import { getTranslations } from "next-intl/server";
import { AppSectionPlaceholder } from "@/components/app/app-section-placeholder";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AssetsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "app_placeholders.assets" });

  return (
    <AppSectionPlaceholder
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
    />
  );
}
