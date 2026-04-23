import type { ReactNode } from "react";

type Props = {
  variant: "no_open" | "no_closed";
  cta?: ReactNode;
};

export function EmptyState({ variant, cta }: Props) {
  if (variant === "no_closed") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
        <p className="text-sm text-muted-foreground">참여한 작품이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
      <div className="space-y-2">
        <p className="text-base font-medium text-foreground">
          첫 번째 작품을 기다리고 있어요
        </p>
        <p className="text-sm text-muted-foreground">
          이 챌린지의 첫 주인공이 되어보세요
        </p>
      </div>
      {cta && <div>{cta}</div>}
    </div>
  );
}
