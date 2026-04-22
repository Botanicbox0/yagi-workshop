"use client";

import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { WorkspaceMemberWithProfile } from "@/lib/team-channels/queries";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: WorkspaceMemberWithProfile[];
  locale: string;
};

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ChannelMembersDialog({
  open,
  onOpenChange,
  members,
  locale,
}: Props) {
  const t = useTranslations("team_chat");

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("members_dialog_title")}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground keep-all">
          {t("members_dialog_intro")}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {t("members_count", { count: members.length })}
        </p>
        <ul className="flex flex-col gap-0.5 max-h-[50vh] overflow-y-auto -mx-2">
          {members.map((m) => {
            const displayName = m.profile?.display_name ?? "Unknown";
            const joined = m.joined_at ?? m.created_at;
            return (
              <li
                key={m.user_id}
                className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-muted/40"
              >
                <Avatar className="h-9 w-9">
                  {m.profile?.avatar_url && (
                    <AvatarImage
                      src={m.profile.avatar_url}
                      alt={displayName}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {initialsFor(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium truncate">
                      {displayName}
                    </span>
                    <span className="text-[11px] text-muted-foreground uppercase tracking-[0.1em]">
                      {m.role}
                    </span>
                  </div>
                  {joined && (
                    <span className="text-[11px] text-muted-foreground keep-all">
                      {t("members_dialog_joined_at", {
                        date: dateFormatter.format(new Date(joined)),
                      })}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
