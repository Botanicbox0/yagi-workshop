import { cn } from "@/lib/utils";

export function SidebarGroupLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        // Phase 2.7.1 P12-3: bumped from text-[10px] / 70 → text-[11px] / 65
        // for better contrast on the off-white sidebar surface.
        "px-3 pt-4 pb-1 text-[11px] uppercase tracking-[0.12em] text-foreground/65 font-medium",
        className,
      )}
    >
      {children}
    </div>
  );
}
