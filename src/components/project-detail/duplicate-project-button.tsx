"use client";

import { useState, useTransition } from "react";
import { CopyPlus, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { toast } from "sonner";
import { duplicateProjectSkeleton } from "@/app/[locale]/app/projects/[id]/_actions/duplicate-project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Labels = {
  trigger: string;
  title: string;
  description: string;
  titleLabel: string;
  titlePlaceholder: string;
  cancel: string;
  submit: string;
  submitting: string;
  success: string;
  errorValidation: string;
  errorForbidden: string;
  errorGeneric: string;
};

export function DuplicateProjectButton({
  projectId,
  defaultTitle,
  labels,
}: {
  projectId: string;
  defaultTitle: string;
  labels: Labels;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [isPending, startTransition] = useTransition();

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(labels.errorValidation);
      return;
    }

    startTransition(async () => {
      const result = await duplicateProjectSkeleton({
        projectId,
        title: trimmed,
      });

      if (!result.ok) {
        if (result.error === "forbidden") toast.error(labels.errorForbidden);
        else toast.error(labels.errorGeneric);
        return;
      }

      toast.success(labels.success);
      setOpen(false);
      router.push(`/app/projects/${result.projectId}?tab=brief`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="gap-2 rounded-full border-border/70 bg-surface-card text-foreground hover:bg-accent/60"
        >
          <CopyPlus className="h-4 w-4" aria-hidden="true" />
          {labels.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-border/70 bg-surface-raised text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="keep-all">{labels.title}</DialogTitle>
          <DialogDescription className="keep-all">
            {labels.description}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="duplicate-project-title">
            {labels.titleLabel}
          </Label>
          <Input
            id="duplicate-project-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={labels.titlePlaceholder}
            maxLength={200}
            disabled={isPending}
            onKeyDown={(event) => {
              if (event.key === "Enter") submit();
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={isPending}
            className="gap-2 bg-brand text-brand-on hover:bg-brand/90"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? labels.submitting : labels.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
