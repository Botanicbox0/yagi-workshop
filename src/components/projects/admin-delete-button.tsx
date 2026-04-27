"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { softDeleteProject } from "@/app/[locale]/app/projects/[id]/actions";

// Phase 2.8.2 G_B2_A — yagi_admin-only project soft-delete trigger.
// Presented as a small dropdown on the project detail page next to the
// status transition dropdown. Confirmation is mandatory because the
// 3-day undelete window is the only safety net before cron purge.

export function AdminDeleteButton({ projectId }: { projectId: string }) {
  const t = useTranslations("projects");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function onConfirm() {
    setOpen(false);
    const fd = new FormData();
    fd.set("projectId", projectId);
    startTransition(async () => {
      const res = await softDeleteProject(fd);
      if ("error" in res) {
        toast.error(t("delete_error"));
        return;
      }
      toast.success(t("delete_success"));
      router.push("/app/projects");
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full uppercase tracking-[0.12em] text-xs"
            disabled={pending}
          >
            {t("admin_actions_label")} ▾
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[180px]">
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
            >
              {t("delete_action")}
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete_confirm_title")}</AlertDialogTitle>
          <AlertDialogDescription className="keep-all">
            {t("delete_confirm_body")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("delete_cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t("delete_confirm_cta")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
