"use client";

import Image from "next/image";
import { Link, usePathname } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function AuthFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isSignin = pathname.endsWith("/signin");

  return (
    <div
      className={cn(
        "min-h-dvh flex flex-col px-6 md:px-12",
        isSignin && "bg-background",
      )}
    >
      {!isSignin && (
        <header className="py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5"
            aria-label="YAGI Workshop"
          >
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
      )}
      <main
        className={cn(
          "flex-1 flex items-center justify-center",
          isSignin ? "py-6 lg:py-10" : undefined,
        )}
      >
        <div className={isSignin ? "w-full" : "w-full max-w-sm"}>{children}</div>
      </main>
    </div>
  );
}
