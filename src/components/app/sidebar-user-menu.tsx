"use client";

import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/app/signout-action";

type Profile = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export function SidebarUserMenu({ profile }: { profile: Profile }) {
  const c = useTranslations("common");
  const initials = profile.display_name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || profile.handle.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors">
        <Avatar className="w-7 h-7">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] truncate">{profile.display_name}</p>
          <p className="text-[11px] text-muted-foreground truncate">@{profile.handle}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
        <DropdownMenuItem disabled className="text-xs">
          @{profile.handle}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action={signOutAction}>
          <button type="submit" className="w-full">
            <DropdownMenuItem asChild>
              <span className="flex items-center gap-2 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
                {c("signout")}
              </span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
