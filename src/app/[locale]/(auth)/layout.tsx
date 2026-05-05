import Image from "next/image";
import { Link } from "@/i18n/routing";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex flex-col px-6 md:px-12">
      <header className="py-6">
        <Link href="/" className="inline-flex items-center gap-2.5" aria-label="YAGI Workshop">
          <Image
            src="/brand/yagi-icon-logo-black.png"
            alt=""
            width={28}
            height={28}
            priority
            className="h-7 w-7 flex-shrink-0"
          />
          <Image
            src="/brand/yagi-text-logo-black.png"
            alt="YAGI WORKSHOP"
            width={56}
            height={18}
            priority
            className="h-[18px] w-auto"
          />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
