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
        "px-3 pt-4 pb-1 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-medium",
        className,
      )}
    >
      {children}
    </div>
  );
}
