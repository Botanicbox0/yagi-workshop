"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";

type WS = { id: string; name: string; slug: string };

export function SidebarWorkspaceSwitcher({
  workspaces,
  currentWorkspaceId,
}: {
  workspaces: WS[];
  currentWorkspaceId: string | null;
}) {
  const current = workspaces.find((w) => w.id === currentWorkspaceId) ?? workspaces[0];

  if (!current) {
    return (
      <p className="font-display text-base tracking-tight text-muted-foreground">
        No workspace
      </p>
    );
  }

  if (workspaces.length === 1) {
    return (
      <p className="font-display text-base tracking-tight">
        <em>{current.name}</em>
      </p>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full flex items-center justify-between group">
        <span className="font-display text-base tracking-tight">
          <em>{current.name}</em>
        </span>
        <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[220px]">
        {workspaces.map((ws) => (
          <DropdownMenuItem key={ws.id}>{ws.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
