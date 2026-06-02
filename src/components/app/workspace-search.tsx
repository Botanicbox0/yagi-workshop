"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/routing";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setActiveWorkspaceAction } from "@/lib/workspace/actions";
import {
  listAdminWorkspaceSearchItems,
  type AdminWorkspaceSearchItem,
} from "@/lib/workspace/admin-search-actions";
import type { WorkspaceKind } from "@/lib/workspace/active";

type WorkspaceSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function landingForKind(kind: WorkspaceKind) {
  switch (kind) {
    case "brand":
      return "/app/explore";
    case "artist":
      return "/app/explore";
    case "creator":
      return "/app/campaigns";
    case "agency":
      return "/app/admin/agencies";
    case "yagi_admin":
      return "/app/admin";
  }
}

export function WorkspaceSearchDialog({
  open,
  onOpenChange,
}: WorkspaceSearchDialogProps) {
  const t = useTranslations("nav.workspace_search");
  const locale = useLocale();
  const router = useRouter();
  const [items, setItems] = useState<AdminWorkspaceSearchItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, startLoadTransition] = useTransition();
  const [switching, startSwitchTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || loaded || loading) return;

    startLoadTransition(async () => {
      const result = await listAdminWorkspaceSearchItems();
      if (!result.ok) {
        toast.error(t(`errors.${result.error}`));
        return;
      }
      setItems(result.workspaces);
      setLoaded(true);
    });
  }, [loaded, loading, open, t]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (a.isTest !== b.isTest) return a.isTest ? 1 : -1;
        return a.name.localeCompare(b.name, locale);
      }),
    [items, locale],
  );

  function handleSelect(workspace: AdminWorkspaceSearchItem) {
    startSwitchTransition(async () => {
      const result = await setActiveWorkspaceAction(workspace.id);
      if (!result.ok) {
        toast.error(t(`errors.${result.error}`));
        return;
      }
      onOpenChange(false);
      router.push(landingForKind(workspace.kind));
      router.refresh();
    });
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("placeholder")} />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("loading")}
            </span>
          ) : (
            t("empty")
          )}
        </CommandEmpty>
        <CommandGroup heading={t("group")}>
          {sortedItems.map((workspace) => (
            <CommandItem
              key={workspace.id}
              value={`${workspace.name} ${workspace.kind} ${
                workspace.isTest ? "test" : ""
              }`}
              disabled={switching}
              onSelect={() => handleSelect(workspace)}
              className="gap-3 rounded-lg"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-surface-raised text-xs font-semibold uppercase text-muted-foreground">
                {workspace.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground keep-all">
                  {workspace.name}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <WorkspaceKindBadge label={t(`kind.${workspace.kind}`)} />
                  {workspace.isTest ? (
                    <span className="rounded-full border border-brand/45 bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-brand">
                      {t("test_badge")}
                    </span>
                  ) : null}
                </span>
              </span>
              {switching ? (
                <Loader2
                  className="h-4 w-4 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
              ) : (
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

function WorkspaceKindBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/70 bg-surface-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-muted-foreground">
      {label}
    </span>
  );
}

export function WorkspaceSearchTrigger({
  label,
  shortcut,
  onOpen,
}: {
  label: string;
  shortcut: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      className="hidden h-9 min-w-[180px] items-center gap-2 rounded-full border border-border/70 bg-surface-raised px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground md:flex"
      aria-label={label}
      onClick={onOpen}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate keep-all">{label}</span>
      <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        {shortcut}
      </kbd>
    </button>
  );
}

export function MobileWorkspaceSearchTrigger({
  label,
  shortcut,
  onOpen,
}: {
  label: string;
  shortcut: string;
  onOpen: () => void;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-11 w-full justify-start gap-2 rounded-xl border-border/70 bg-surface-raised px-3 text-left text-sm text-muted-foreground",
        "hover:bg-accent/60 hover:text-foreground",
      )}
      aria-label={label}
      onClick={onOpen}
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="flex-1 text-left keep-all">{label}</span>
      <kbd className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px]">
        {shortcut}
      </kbd>
    </Button>
  );
}
