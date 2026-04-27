import { permanentRedirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function CommissionNewPage({ params }: Props) {
  const { locale } = await params;
  permanentRedirect(`/${locale}/app/projects/new`);
}
