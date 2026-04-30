"use client";

// Phase 4.x task_06 — Workspace switcher (sidebar top-left, dropdown).
//
// Shape (KICKOFF section task_06):
//   - Box: padding 8px 12px, radius 12, border subtle, bg surface
//   - Click -> DropdownMenu opens
//   - Groups: Brands / Artists / YAGI Admin
//   - Disabled '+ 새 workspace 추가' (locked option B; Phase 5+)
//   - Selecting a workspace calls setActiveWorkspaceAction (cookie set
//     + revalidate) and triggers a soft refresh.
//
// Cross-tenant defense:
//   - The list of workspaces is supplied by the server (props), already
//     RLS-scoped by membership. The client cannot fetch foreign
//     workspaces here.
//   - On click, the server action re-validates membership before setting
//     the cookie -- a tampered button click does not bypass.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { setActiveWorkspaceAction } from "@/lib/workspace/actions";

type WorkspaceKind = "brand" | "artist" | "yagi_admin";

export type WorkspaceItem = {
  id: string;
  name: string;
  kind: WorkspaceKind;
};

type Props = {
  current: WorkspaceItem;
  workspaces: WorkspaceItem[];
};

export function WorkspaceSwitcher({ current, workspaces }: Props) {
  const t = useTranslations("workspace.switcher");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Group by kind. Empty groups still render their label-less (we hide
  // the section if it has 0 entries to keep Phase 4 dropdown clean -- only
  // Brands shows up for users without artist/admin memberships).
  const brands = workspaces.filter((w) => w.kind === "brand");
  const artists = workspaces.filter((w) => w.kind === "artist");
  const admins = workspaces.filter((w) => w.kind === "yagi_admin");

  function handleSelect(workspaceId: string) {
    if (workspaceId === current.id) return;
    startTransition(async () => {
      const result = await setActiveWorkspaceAction(workspaceId);
      if (result.ok) {
        // The server action revalidates /app layout. router.refresh()
        // ensures the current view re-renders with the new active
        // workspace immediately.
        router.refresh();
      } else {
        const errorKey =
          result.error === "unauthenticated"
            ? "errors.unauthenticated"
            : result.error === "not_a_member"
              ? "errors.not_a_member"
              : "errors.invalid";
        toast.error(t(errorKey));
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        className={cn(
          "flex items-center gap-2 w-full rounded-xl border border-border/40 bg-card px-3 py-2 text-left text-sm",
          "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors",
          isPending && "opacity-60",
        )}
      >
        <span className="flex-1 truncate font-medium text-foreground keep-all">
          {current.name}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="bottom"
        sideOffset={6}
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]"
      >
        {brands.length > 0 && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
              {t("brands_group")}
            </DropdownMenuLabel>
            {brands.map((w) => (
              <Row
                key={w.id}
                workspace={w}
                isCurrent={w.id === current.id}
                onSelect={() => handleSelect(w.id)}
              />
            ))}
          </DropdownMenuGroup>
        )}
        {artists.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
                {t("artists_group")}
              </DropdownMenuLabel>
              {artists.map((w) => (
                <Row
                  key={w.id}
                  workspace={w}
                  isCurrent={w.id === current.id}
                  onSelect={() => handleSelect(w.id)}
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}
        {admins.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
                {t("admin_group")}
              </DropdownMenuLabel>
              {admins.map((w) => (
                <Row
                  key={w.id}
                  workspace={w}
                  isCurrent={w.id === current.id}
                  onSelect={() => handleSelect(w.id)}
                />
              ))}
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled
          className="opacity-60"
          title={t("add_new_disabled")}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-sm">{t("add_new")}</span>
          <span className="ml-auto text-[10px] uppercase tracking-[0.10em] text-muted-foreground">
            {t("add_new_disabled")}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Row({
  workspace,
  isCurrent,
  onSelect,
}: {
  workspace: WorkspaceItem;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault();
        onSelect();
      }}
      className="flex items-center gap-2"
    >
      <span className="flex-1 truncate text-sm keep-all">{workspace.name}</span>
      {isCurrent && (
        <Check className="h-3.5 w-3.5 text-foreground shrink-0" />
      )}
    </DropdownMenuItem>
  );
}
