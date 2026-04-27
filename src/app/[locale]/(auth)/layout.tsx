import Image from "next/image";
import { Link } from "@/i18n/routing";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
