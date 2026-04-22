"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createShowcaseFromBoard } from "@/app/[locale]/app/showcases/actions";

type BoardCandidate = {
  id: string;
  title: string;
  project_id: string;
  project_title: string | null;
};

export function CreateFromBoardDialog({
  boards,
}: {
  boards: BoardCandidate[];
}) {
  const t = useTranslations("showcase");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleCreate(boardId: string) {
    setPendingId(boardId);
    startTransition(async () => {
      const result = await createShowcaseFromBoard(boardId);
      setPendingId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(t("editor_save_success"));
      router.push(
        `/app/showcases/${result.showcaseId}` as `/app/showcases/${string}`,
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          className="rounded-full uppercase tracking-[0.12em] px-5 py-2 text-sm"
          disabled={boards.length === 0}
        >
          {t("list_create_button")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("list_create_button")}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 max-h-[60vh] overflow-y-auto border border-border rounded-md divide-y divide-border">
          {boards.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center keep-all">
              {t("list_empty_body")}
            </div>
          ) : (
            boards.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium keep-all truncate">
                    {b.title}
                  </p>
                  {b.project_title && (
                    <p className="text-xs text-muted-foreground truncate">
                      {b.project_title}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full text-xs"
                  disabled={pendingId !== null}
                  onClick={() => handleCreate(b.id)}
                >
                  {pendingId === b.id && (
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  )}
                  {t("list_create_button")}
                </Button>
              </div>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {tCommon("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
