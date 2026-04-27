import Image from "next/image";
import { redirect } from "@/i18n/routing";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Link } from "@/i18n/routing";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect({ href: "/signin", locale });

  return (
    <div className="min-h-dvh flex flex-col px-6 md:px-12">
      <header className="py-6">
        <Link href="/" className="inline-flex items-center" aria-label="YAGI Workshop">
          <Image
            src="/brand/yagi-wordmark.png"
            alt="YAGI Workshop"
            width={140}
            height={26}
            priority
            className="h-[26px] w-auto"
          />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
