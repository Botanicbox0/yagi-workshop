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
import type { ProfileRole, WorkspaceRole } from "@/lib/app/context";

type Profile = {
  id: string;
  handle: string;
  display_name: string;
  email: string | null;
  avatar_url: string | null;
  role: ProfileRole | null;
};

function resolveVisibleName(profile: Profile): string {
  // Wave C.5a sub_02 — DB handle (c_xxx) is never user-facing. Prefer
  // display_name; fall back to email local-part. Never expose the email
  // address itself or the raw handle in UI.
  const displayName = profile.display_name?.trim();
  if (displayName) return displayName;
  const localPart = profile.email?.split("@")[0]?.trim();
  if (localPart) return localPart;
  return "";
}

function getRoleLabel(
  profile: Profile,
  workspaceRoles: WorkspaceRole[],
  isYagiInternalMember: boolean,
): string {
  // Workspace roles take precedence over profile.role for the badge —
  // an admin/internal user is identified by their staff capacity even if
  // they also carry a creator/studio profile. Phase 2.7.1 visibility pass.
  if (workspaceRoles.includes("yagi_admin")) return "YAGI Admin";
  if (isYagiInternalMember) return "Internal";
  switch (profile.role) {
    case "creator":
      return "Creator";
    case "studio":
      return "Studio";
    case "client":
      return "Client";
    case "observer":
      return "Observer";
    case "artist":
      return "Artist";
    default:
      return "";
  }
}

export function SidebarUserMenu({
  profile,
  workspaceRoles,
  isYagiInternalMember,
}: {
  profile: Profile;
  workspaceRoles: WorkspaceRole[];
  isYagiInternalMember: boolean;
}) {
  const c = useTranslations("common");
  const visibleName = resolveVisibleName(profile);
  const initials =
    visibleName
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "·";
  const roleLabel = getRoleLabel(profile, workspaceRoles, isYagiInternalMember);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-accent transition-colors">
        <Avatar className="w-7 h-7">
          {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
          <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 text-left min-w-0">
          <p className="text-[13px] truncate">{visibleName}</p>
          {roleLabel && (
            <p className="text-[11px] text-muted-foreground truncate">
              {roleLabel}
            </p>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="min-w-[180px]">
        <DropdownMenuItem disabled className="text-xs">
          {visibleName}
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
