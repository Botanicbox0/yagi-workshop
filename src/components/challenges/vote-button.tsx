"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { castVote } from "@/app/challenges/[slug]/gallery/actions";

type Props = {
  submissionId: string;
  challengeId: string;
  slug: string;
  initialCount: number;
  hasVoted: boolean;
  isAuthed: boolean;
  disabled: boolean;
};

export function VoteButton({
  submissionId,
  challengeId,
  slug,
  initialCount,
  hasVoted,
  isAuthed,
  disabled,
}: Props) {
  const t = useTranslations("challenges.gallery");
  const router = useRouter();
  const pathname = usePathname();

  const [voted, setVoted] = useState(hasVoted);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const handleClick = async () => {
    if (disabled) return;

    if (!isAuthed) {
      toast(t("toast.auth_required"), {
        action: {
          label: t("toast.auth_action"),
          onClick: () => {
            router.push(`/signin?next=${encodeURIComponent(pathname)}`);
          },
        },
      });
      return;
    }

    if (voted) return;

    setPending(true);
    try {
      const result = await castVote(submissionId, challengeId, slug);

      if (result.ok) {
        setVoted(true);
        setCount((c) => c + 1);
      } else if (result.error === "already_voted") {
        setVoted(true);
        toast.info(t("toast.already_voted"));
      } else if (result.error === "vote_closed") {
        toast.error(t("toast.vote_closed"));
      } else {
        // TODO: add i18n key for generic error
        toast.error("응원에 실패했어요. 다시 시도해주세요.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={() => void handleClick()}
      disabled={disabled || pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border",
        "transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        voted
          ? "bg-foreground text-background border-foreground"
          : "bg-background text-foreground border-input hover:border-foreground",
        (disabled || pending) && "opacity-50 cursor-not-allowed",
      )}
    >
      <Heart className={cn("h-4 w-4", voted && "fill-current")} />
      <span>{voted ? t("vote.voted") : t("vote.default")}</span>
      <span className="text-xs opacity-60 tabular-nums">{count.toLocaleString()}</span>
    </button>
  );
}
