"use client";

import { useState, useTransition } from "react";
import { Copy, Link2, Loader2, RefreshCw, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  rotateProjectDeliverablesShare,
  shareProjectDeliverables,
  unshareProjectDeliverables,
} from "@/app/[locale]/app/projects/[id]/_actions/deliverable-share-actions";

type Labels = {
  title: string;
  description: string;
  create: string;
  copy: string;
  rotate: string;
  unshare: string;
  working: string;
  copied: string;
  success: string;
  error: string;
  noReleased: string;
};

export function DeliverableShareControls({
  projectId,
  initialUrl,
  enabled,
  labels,
}: {
  projectId: string;
  initialUrl: string | null;
  enabled: boolean;
  labels: Labels;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [isPending, startTransition] = useTransition();
  const visibleUrl = isEnabled ? url : null;

  function handleResult(result: Awaited<ReturnType<typeof shareProjectDeliverables>>) {
    if (!result.ok) {
      toast.error(
        result.error === "no_released_deliverables"
          ? labels.noReleased
          : labels.error,
      );
      return;
    }
    setUrl(result.url);
    setIsEnabled(true);
    toast.success(labels.success);
  }

  function create() {
    startTransition(async () => {
      handleResult(await shareProjectDeliverables(projectId));
    });
  }

  function rotate() {
    startTransition(async () => {
      handleResult(await rotateProjectDeliverablesShare(projectId));
    });
  }

  function unshare() {
    startTransition(async () => {
      const result = await unshareProjectDeliverables(projectId);
      if (!result.ok) {
        toast.error(labels.error);
        return;
      }
      setIsEnabled(false);
      toast.success(labels.success);
    });
  }

  async function copy() {
    if (!visibleUrl) return;
    await navigator.clipboard.writeText(visibleUrl);
    toast.success(labels.copied);
  }

  return (
    <section className="rounded-lg border border-border/70 bg-surface-card p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{labels.title}</p>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground keep-all">
            {labels.description}
          </p>
          {visibleUrl ? (
            <p className="mt-2 break-all rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
              {visibleUrl}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {visibleUrl ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={copy}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                {labels.copy}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={rotate}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                {isPending ? labels.working : labels.rotate}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={unshare}
              >
                <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                {isPending ? labels.working : labels.unshare}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              onClick={create}
              className="bg-brand text-brand-on hover:bg-brand/90"
            >
              {isPending ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Link2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isPending ? labels.working : labels.create}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
