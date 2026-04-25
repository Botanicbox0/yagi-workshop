"use client";

// =============================================================================
// Phase 2.8 G_B-5 — Version history sidebar + save-version modal
// =============================================================================
// Source: SPEC §5.2 (save flow), §5.3 (history sidebar + restore).
//
// This component is the version chrome around the brief editor:
//   - "Save v{n}" button (opens SaveVersionModal)
//   - List of past versions, newest first, click for view / restore actions
//   - Restore copies the version content onto latest content_json (server
//     action restoreVersion); the next saveVersion creates v_{current+1}
//     with the restored content (history-preserving — SPEC §5.3).
//
// Loading versions: caller (G_B-7 page) provides the server-fetched list.
// Restore is the only mutation handled inline; saveVersion goes through
// SaveVersionModal.
// =============================================================================

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  restoreVersion,
  saveVersion,
} from "@/app/[locale]/app/projects/[id]/brief/actions";
import { cn } from "@/lib/utils";

export interface BriefVersionRow {
  id: string;
  version_n: number;
  label: string | null;
  created_at: string;
}

export interface VersionHistoryProps {
  projectId: string;
  /** Server-loaded list, newest first. */
  versions: BriefVersionRow[];
  currentVersion: number;
  /** When non-null, the parent page is rendering a viewer mode for this version_n. */
  viewingVersion?: number | null;
  /** Current locale used for date formatting. */
  locale: string;
  /** When true (locked brief), the save button is hidden. */
  briefLocked?: boolean;
  className?: string;
}

export function VersionHistorySidebar({
  projectId,
  versions,
  currentVersion,
  viewingVersion = null,
  locale,
  briefLocked = false,
  className,
}: VersionHistoryProps) {
  const t = useTranslations("brief_board");
  const router = useRouter();
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  async function handleRestore(versionId: string) {
    if (briefLocked) return;
    setPendingRestoreId(versionId);
    const r = await restoreVersion({ projectId, versionId });
    setPendingRestoreId(null);
    if ("ok" in r && r.ok) {
      toast.success(t("history_restore_success"));
      startTransition(() => router.refresh());
    } else {
      toast.error(t("save_db_error"));
    }
  }

  return (
    <aside
      className={cn(
        "flex flex-col gap-3 w-full max-w-xs border-l border-border bg-background pl-4 py-2",
        className
      )}
      aria-label={t("history_title")}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t("history_title")}
        </h3>
        {!briefLocked && (
          <SaveVersionModal
            projectId={projectId}
            nextVersion={currentVersion + 1}
            onSaved={() => startTransition(() => router.refresh())}
          />
        )}
      </div>

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground keep-all">
          {t("history_no_versions")}
        </p>
      ) : (
        <ol className="flex flex-col gap-2" aria-live="polite">
          {versions.map((v) => {
            const isCurrent = v.version_n === currentVersion && viewingVersion === null;
            const isViewing = viewingVersion === v.version_n;
            return (
              <li
                key={v.id}
                className={cn(
                  "text-sm border border-border rounded-md p-2",
                  isCurrent && "bg-muted/40 border-foreground/20",
                  isViewing && "bg-foreground/5 border-foreground/30"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium tabular-nums">
                    v{v.version_n}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] uppercase tracking-[0.12em] text-foreground/60">
                      {t("history_current")}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground keep-all line-clamp-2">
                  {v.label ?? "—"}
                </p>
                <p className="text-[11px] text-muted-foreground/80 tabular-nums mt-0.5">
                  {fmt.format(new Date(v.created_at))}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => router.push(`?version=${v.version_n}`)}
                    disabled={isViewing}
                    aria-pressed={isViewing}
                  >
                    {t("history_view")}
                  </Button>
                  {!briefLocked && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => handleRestore(v.id)}
                      disabled={pendingRestoreId === v.id || isCurrent}
                    >
                      {t("history_restore")}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

// -----------------------------------------------------------------------------
// SaveVersionModal — captures an optional label and calls saveVersion.
// -----------------------------------------------------------------------------

function SaveVersionModal({
  projectId,
  nextVersion,
  onSaved,
}: {
  projectId: string;
  nextVersion: number;
  onSaved: () => void;
}) {
  const t = useTranslations("brief_board");
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSave() {
    setPending(true);
    const r = await saveVersion({ projectId, label: label.trim() || undefined });
    setPending(false);
    if ("ok" in r && r.ok) {
      toast.success(t("save_modal_success", { n: r.data.versionN }));
      setLabel("");
      setOpen(false);
      onSaved();
    } else {
      toast.error(t("save_db_error"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[11px] rounded-full uppercase tracking-[0.08em]"
        >
          {t("toolbar_save_v", { n: nextVersion })}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("save_modal_title")}</DialogTitle>
          <DialogDescription>
            {t("toolbar_save_v", { n: nextVersion })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="brief-version-label">{t("save_modal_label")}</Label>
          <Input
            id="brief-version-label"
            placeholder={t("save_modal_label_ph")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={200}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {t("save_modal_cancel")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={pending}>
            {t("save_modal_save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
